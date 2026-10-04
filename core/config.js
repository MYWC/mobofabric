// ═══════════════════════════════════════════════════════════
//  تنظیمات متمرکز — نسخه نهایی
//  وضعیت: پروژه کامل + OAuth
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
    session:   'ps_session',
    sound:     'ps_sound_enabled',
  },

  analytics: {
    flushIntervalMs:  5000,
    maxQueueSize:     25,
    trackPageViews:   true,
    trackProducts:    true,
    trackSearches:    true,
  },

  // ═══════════════════════════════════════════════════════════
  //  Auth UI
  // ═══════════════════════════════════════════════════════════
  authUI: {
    splitLayout:      true,
    particles:        true,
    animatedGradient: true,
    passwordStrength: true,
    socialLogin:      true,
    socialProviders:  ['google', 'github'],
    confetti:         true,
    shakeOnError:     true,
    magneticButton:   true,
  },

  // ═══════════════════════════════════════════════════════════
  //  فلگ فیچرها
  // ═══════════════════════════════════════════════════════════
  features: {
    products:          true,
    theme:             true,
    productDetail:     true,
    cart:              true,
    brands:            true,
    search:            true,
    about:             true,
    contact:           true,
    favorites:         true,
    comparison:        true,
    reviews:           true,
    discounts:         true,
    auth:              true,
    admin:             true,
    analytics:         true,
    home:              true,
    preloader:         true,
    microInteractions: true,
    quickView:         true,
    recentlyViewed:    true,
    sound:             true,
  },
};