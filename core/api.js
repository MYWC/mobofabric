// ═══════════════════════════════════════════════════════════
//  لایه داده — تنها راه دسترسی به Supabase
//  نسخه: تا فاز ۱۰ (discounts)
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
        case 'newest':
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
  //  نظرات — فاز ۹
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
  //  کدهای تخفیف — فاز ۱۰
  // ═══════════════════════════════════════════════════════════
  discounts: {
    /**
     * اعتبارسنجی کد تخفیف از طریق RPC
     * @returns {Promise<{ valid: boolean, reason?: string, ... }>}
     */
    async validate(code) {
      const clean = String(code || '').trim();
      if (!clean) return { valid: false, reason: 'empty' };

      const { data, error } = await client()
        .rpc('validate_discount_code', { p_code: clean });
      if (error) handleError(error);
      return data || { valid: false, reason: 'not_found' };
    },
  },
};

// ═══════════════════════════════════════════════════════════
//  Helper — محاسبه آمار نظرات
// ═══════════════════════════════════════════════════════════
function aggregateStats(rows) {
  const count = rows.length;
  const sum   = rows.reduce((s, r) => s + (r.rating || 0), 0);
  const dist  = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });

  return {
    count,
    avg: count ? sum / count : 0,
    dist,
  };
}