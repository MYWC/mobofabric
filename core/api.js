// ═══════════════════════════════════════════════════════════
//  لایه داده — نسخه نهایی
//  وضعیت: پروژه کامل + OAuth
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';
import { events } from './events.js';

let supabase = null;

function client() {
  if (!supabase) {
    if (!CONFIG.supabase.url || CONFIG.supabase.url.startsWith('YOUR_')) {
      throw new Error('Supabase URL/Key در core/config.js تنظیم نشده است');
    }
    supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
  }
  return supabase;
}

function handleError(error) {
  console.error('[api]', error);
  events.emit('error', { code: error.code, message: error.message });
  throw error;
}

export const api = {
  // ═══════════════════════════════════════════════════════════
  //  Auth
  // ═══════════════════════════════════════════════════════════
  auth: {
    async signIn(email, password) {
      const { data, error } = await client().auth.signInWithPassword({ email, password });
      if (error) handleError(error);
      return data;
    },

    async signUp(email, password, fullName) {
      const { data, error } = await client().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || '' },
          emailRedirectTo: `${location.origin}${location.pathname}`,
        },
      });
      if (error) handleError(error);
      return data;
    },

    /**
     * ورود با OAuth (Google, GitHub)
     * @param {'google'|'github'} provider
     * @param {string} redirectTo
     */
    async signInWithOAuth(provider, redirectTo) {
      const { data, error } = await client().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo || `${location.origin}${location.pathname}`,
        },
      });
      if (error) handleError(error);
      return data;
    },

    async signOut() {
      const { error } = await client().auth.signOut();
      if (error) handleError(error);
    },

    async getSession() {
      const { data: { session } } = await client().auth.getSession();
      return session;
    },

    async getUser() {
      const { data: { user } } = await client().auth.getUser();
      return user;
    },

    async getProfile() {
      const user = await api.auth.getUser();
      if (!user) return null;
      const { data, error } = await client()
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .eq('id', user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },

    async isAdmin() {
      const { data, error } = await client().rpc('is_admin');
      if (error) return false;
      return Boolean(data);
    },

    async claimAdmin() {
      const { data, error } = await client().rpc('claim_admin');
      if (error) handleError(error);
      return data;
    },

    onChange(callback) {
      const { data: { subscription } } = client().auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
      return () => subscription.unsubscribe();
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  محصولات
  // ═══════════════════════════════════════════════════════════
  products: {
    async list({ brand, search, sort = 'newest', page = 1, offset, limit } = {}) {
      const useOffset = typeof offset === 'number';
      const lim = limit ?? CONFIG.pagination.productsPerPage;
      const from = useOffset ? offset : (page - 1) * lim;
      const to   = from + lim - 1;

      let q = client()
        .from('products')
        .select('*, brands!inner(slug, name_fa, name_en, logo_url)', { count: 'exact' })
        .eq('is_active', true)
        .range(from, to);

      if (brand)  q = q.eq('brands.slug', brand);
      if (search) q = q.or(`name_fa.ilike.%${search}%,name_en.ilike.%${search}%`);

      switch (sort) {
        case 'price_asc':  q = q.order('price', { ascending: true });  break;
        case 'price_desc': q = q.order('price', { ascending: false }); break;
        default:           q = q.order('created_at', { ascending: false });
      }

      const { data, error, count } = await q;
      if (error) handleError(error);
      return { data: data ?? [], count: count ?? 0 };
    },

    async featured(limit = 8) {
      const { data, error } = await client()
        .from('products')
        .select('*, brands!inner(slug, name_fa, name_en, logo_url)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) handleError(error);
      return data ?? [];
    },

    async bySlug(slug) {
      const { data, error } = await client()
        .from('products')
        .select('*, brands!inner(slug, name_fa, name_en, logo_url)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (error) handleError(error);
      return data;
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  برندها
  // ═══════════════════════════════════════════════════════════
  brands: {
    async list() {
      const { data, error } = await client()
        .from('brands')
        .select('*')
        .order('sort_order');
      if (error) handleError(error);
      return data ?? [];
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  نظرات
  // ═══════════════════════════════════════════════════════════
  reviews: {
    async list(productId, { limit = 100 } = {}) {
      const { data, error } = await client()
        .from('reviews')
        .select('id, name, rating, comment, created_at')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) handleError(error);
      return data ?? [];
    },

    async stats(productId) {
      const { data, error } = await client()
        .from('reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('is_approved', true);
      if (error) handleError(error);
      return aggregateStats(data ?? []);
    },

    async statsBatch(productIds) {
      if (!Array.isArray(productIds) || productIds.length === 0) return {};

      const { data, error } = await client()
        .from('reviews')
        .select('product_id, rating')
        .in('product_id', productIds)
        .eq('is_approved', true);
      if (error) handleError(error);

      const grouped = {};
      (data ?? []).forEach(r => {
        (grouped[r.product_id] ??= []).push({ rating: r.rating });
      });

      const result = {};
      for (const id of productIds) {
        result[id] = aggregateStats(grouped[id] ?? []);
      }
      return result;
    },

    async create({ productId, name, email, rating, comment }) {
      const payload = {
        product_id: productId,
        name:       String(name).trim().slice(0, 60),
        email:      email ? String(email).trim().slice(0, 120) : null,
        rating:     Number(rating),
        comment:    String(comment).trim().slice(0, 2000),
        is_approved: true,
      };

      const { data, error } = await client()
        .from('reviews')
        .insert(payload)
        .select('id, name, rating, comment, created_at')
        .single();
      if (error) handleError(error);
      return data;
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  کدهای تخفیف
  // ═══════════════════════════════════════════════════════════
  discounts: {
    async validate(code) {
      const clean = String(code || '').trim();
      if (!clean) return { valid: false, reason: 'empty' };

      const { data, error } = await client()
        .rpc('validate_discount_code', { p_code: clean });
      if (error) handleError(error);
      return data || { valid: false, reason: 'not_found' };
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  Admin CRUD
  // ═══════════════════════════════════════════════════════════
  admin: {
    products: {
      async list({ search = '', limit = 500 } = {}) {
        let q = client()
          .from('products')
          .select('*, brands(id, slug, name_fa, name_en)')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (search) q = q.or(`name_fa.ilike.%${search}%,name_en.ilike.%${search}%,slug.ilike.%${search}%`);
        const { data, error } = await q;
        if (error) handleError(error);
        return data ?? [];
      },
      async getById(id) {
        const { data, error } = await client()
          .from('products').select('*').eq('id', id).maybeSingle();
        if (error) handleError(error);
        return data;
      },
      async create(payload) {
        const { data, error } = await client()
          .from('products').insert(payload).select().single();
        if (error) handleError(error);
        return data;
      },
      async update(id, payload) {
        const { data, error } = await client()
          .from('products').update(payload).eq('id', id).select().single();
        if (error) handleError(error);
        return data;
      },
      async remove(id) {
        const { error } = await client().from('products').delete().eq('id', id);
        if (error) handleError(error);
      },
    },

    brands: {
      async list() {
        const { data, error } = await client()
          .from('brands').select('*').order('sort_order');
        if (error) handleError(error);
        return data ?? [];
      },
      async getById(id) {
        const { data, error } = await client()
          .from('brands').select('*').eq('id', id).maybeSingle();
        if (error) handleError(error);
        return data;
      },
      async create(payload) {
        const { data, error } = await client()
          .from('brands').insert(payload).select().single();
        if (error) handleError(error);
        return data;
      },
      async update(id, payload) {
        const { data, error } = await client()
          .from('brands').update(payload).eq('id', id).select().single();
        if (error) handleError(error);
        return data;
      },
      async remove(id) {
        const { error } = await client().from('brands').delete().eq('id', id);
        if (error) handleError(error);
      },
    },

    discounts: {
      async list() {
        const { data, error } = await client()
          .from('discount_codes').select('*').order('created_at', { ascending: false });
        if (error) handleError(error);
        return data ?? [];
      },
      async getById(id) {
        const { data, error } = await client()
          .from('discount_codes').select('*').eq('id', id).maybeSingle();
        if (error) handleError(error);
        return data;
      },
      async create(payload) {
        const { data, error } = await client()
          .from('discount_codes').insert(payload).select().single();
        if (error) handleError(error);
        return data;
      },
      async update(id, payload) {
        const { data, error } = await client()
          .from('discount_codes').update(payload).eq('id', id).select().single();
        if (error) handleError(error);
        return data;
      },
      async remove(id) {
        const { error } = await client().from('discount_codes').delete().eq('id', id);
        if (error) handleError(error);
      },
    },

    reviews: {
      async list({ filter = 'all', limit = 500 } = {}) {
        let q = client()
          .from('reviews')
          .select('*, products(id, slug, name_fa, name_en)')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (filter === 'pending')  q = q.eq('is_approved', false);
        if (filter === 'approved') q = q.eq('is_approved', true);
        const { data, error } = await q;
        if (error) handleError(error);
        return data ?? [];
      },
      async setApproval(id, isApproved) {
        const { data, error } = await client()
          .from('reviews').update({ is_approved: isApproved }).eq('id', id).select().single();
        if (error) handleError(error);
        return data;
      },
      async remove(id) {
        const { error } = await client().from('reviews').delete().eq('id', id);
        if (error) handleError(error);
      },
    },

    profiles: {
      async list() {
        const { data, error } = await client()
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) handleError(error);
        return data ?? [];
      },
    },

    stats: {
      async dashboard() {
        const [products, brands, reviews, reviewsPending, discounts, discountsActive] = await Promise.all([
          client().from('products').select('id', { count: 'exact', head: true }),
          client().from('brands').select('id', { count: 'exact', head: true }),
          client().from('reviews').select('id', { count: 'exact', head: true }),
          client().from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
          client().from('discount_codes').select('id', { count: 'exact', head: true }),
          client().from('discount_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
        ]);

        return {
          products:         products.count ?? 0,
          brands:           brands.count ?? 0,
          reviews:          reviews.count ?? 0,
          reviewsPending:   reviewsPending.count ?? 0,
          discounts:        discounts.count ?? 0,
          discountsActive:  discountsActive.count ?? 0,
        };
      },
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  Analytics
  // ═══════════════════════════════════════════════════════════
  analytics: {
    async track(eventsList) {
      if (!Array.isArray(eventsList) || eventsList.length === 0) return;
      const { error } = await client().from('analytics_events').insert(eventsList);
      if (error) {
        console.warn('[analytics] insert failed:', error.message);
      }
    },

    async summary(days = 30) {
      const { data, error } = await client().rpc('analytics_summary', { p_days: days });
      if (error) handleError(error);
      return data || {};
    },

    async daily(days = 30) {
      const { data, error } = await client().rpc('analytics_daily', { p_days: days });
      if (error) handleError(error);
      return data || [];
    },

    async topProducts(days = 30, limit = 10) {
      const { data, error } = await client().rpc('analytics_top_products', { p_days: days, p_limit: limit });
      if (error) handleError(error);
      return data || [];
    },

    async topSearches(days = 30, limit = 10) {
      const { data, error } = await client().rpc('analytics_top_searches', { p_days: days, p_limit: limit });
      if (error) handleError(error);
      return data || [];
    },

    async funnel(days = 30) {
      const { data, error } = await client().rpc('analytics_funnel', { p_days: days });
      if (error) handleError(error);
      return data || {};
    },
  },
};

function aggregateStats(rows) {
  const count = rows.length;
  const sum   = rows.reduce((s, r) => s + (r.rating || 0), 0);
  const dist  = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
  return { count, avg: count ? sum / count : 0, dist };
}