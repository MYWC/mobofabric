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
    lang:  'ps_lang',
    theme: 'ps_theme',
    cart:  'ps_cart',
  },

  features: {
    products:      true,
    theme:         true,
    productDetail: true,
    cart:          true,
    brands:        true,
    search:        false,
    about:         false,
    contact:       false,
  },
};