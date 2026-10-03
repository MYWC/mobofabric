// ═══════════════════════════════════════════════════════════
//  تنظیمات متمرکز — تنها فایلی که بین فازها تغییر می‌کند
//  وضعیت: تا فاز ۸ (favorites + comparison)
// ═══════════════════════════════════════════════════════════

export const CONFIG = {
  supabase: {
    // ⚠️ این دو مقدار را از Settings → API پروژه Supabase بردار
    url:     'https://vfryimqanhragilrmtxf.supabase.co',
    anonKey: 'sb_publishable_xTVrIVTrvnJKYgSojNuT0Q_EX9gGnxq',
  },

  defaultLang: 'fa',
  supportedLangs: ['fa', 'en'],

  currency: { fa: 'تومان', en: 'IRR' },

  pagination: { productsPerPage: 12 },

  storageKeys: {
    lang:  'ps_lang',
    theme: 'ps_theme',
    cart:  'ps_cart',
  },

  // ═══════════════════════════════════════════════════════════
  //  فلگ فیچرها — هر فاز فقط یک فلگ را true می‌کند
  // ═══════════════════════════════════════════════════════════
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

    // ── فازهای بعد (هنوز غیرفعال) ──
    reviews:       false,   // فاز 9
    discounts:     false,   // فاز 10
    admin:         false,   // فاز 11
    analytics:     false,   // فاز 12
  },
};