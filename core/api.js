// ═══════════════════════════════════════════════════════════
//  لایه داده — تنها راه دسترسی به Supabase
//  هیچ فیچری مستقیم به Supabase وصل نمی‌شود
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
  products: {
    /**
     * لیست محصولات با فیلتر، مرتب‌سازی و صفحه‌بندی
     * @returns {Promise<{ data: Product[], count: number }>}
     */
    async list({ brand, search, sort = 'newest', page = 1, limit } = {}) {
      limit = limit ?? CONFIG.pagination.productsPerPage;
      const from = (page - 1) * limit;
      const to   = from + limit - 1;

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
};