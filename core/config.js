// ═══════════════════════════════════════════════════════════
//  تنظیمات متمرکز
//  وضعیت: تا فاز ۱۱ (auth + admin)
// ═══════════════════════════════════════════════════════════

export const CONFIG = {
  supabase: {
    url:     'https://vfryimqanhragilrmtxf.supabase.co',
    anonKey: 'sb_publishable_xTVrIVTrvnJKYgSojNuT0Q_EX9gGnxq',
  },

  defaultLang: 'fa',
  supportedLangs: ['fa', 'en'],

  currency: { fa: 'تومان', en: 'IRR' },

  pagination: { productsPerPage: 12 },

  storageKeys: {
    lang:      'ps_lang',
    theme:     'ps_theme',
    cart:      'ps_cart',
    favorites: 'ps_favorites',
    compare:   'ps_comparison',
    reviews:   'ps_my_reviews',
    discount:  'ps_discount',
  },

  features: {
    // ── فاز 1 ──
    products:      true,
    theme:         true,
    // ── فاز 2 ──
    productDetail: true,
    // ── فاز 3 ──
    cart:          true,
    // ── فاز 4 ──
    brands:        true,
    // ── فاز 5 ──
    search:        true,
    // ── فاز 6 ──
    about:         true,
    contact:       true,
    // ── فاز 8 ──
    favorites:     true,
    comparison:    true,
    // ── فاز 9 ──
    reviews:       true,
    // ── فاز 10 ──
    discounts:     true,
    // ── فاز 11 ──
    auth:          true,
    admin:         true,
    // ── فاز 12 ──
    analytics:     false,
  },
};