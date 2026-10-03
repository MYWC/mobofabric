// ═══════════════════════════════════════════════════════════
//  نقطه ورود — نسخه ۵: تا فاز ۱۱
// ═══════════════════════════════════════════════════════════

import { CONFIG } from './core/config.js';
import { events } from './core/events.js';
import { i18n } from './core/i18n.js';
import { router } from './core/router.js';

import { Header } from './shared/components/header/header.js';
import { Footer } from './shared/components/footer/footer.js';
import { toast } from './shared/components/toast/toast.js';

const featureLoaders = {
  products:      () => import('./features/products/products.js').then(m => m.products),
  productDetail: () => import('./features/product-detail/product-detail.js').then(m => m.productDetail),
  cart:          () => import('./features/cart/cart.js').then(m => m.cart),
  brands:        () => import('./features/brands/brands.js').then(m => m.brands),
  search:        () => import('./features/search/search.js').then(m => m.search),
  about:         () => import('./features/about/about.js').then(m => m.about),
  contact:       () => import('./features/contact/contact.js').then(m => m.contact),
  theme:         () => import('./features/theme/theme.js').then(m => m.theme),
  favorites:     () => import('./features/favorites/favorites.js').then(m => m.favorites),
  comparison:    () => import('./features/comparison/comparison.js').then(m => m.comparison),
  reviews:       () => import('./features/reviews/reviews.js').then(m => m.reviews),
  discounts:     () => import('./features/discounts/discounts.js').then(m => m.discounts),
  auth:          () => import('./features/auth/auth.js').then(m => m.auth),
  admin:         () => import('./features/admin/admin.js').then(m => m.admin),
};

async function bootstrap() {
  i18n.init();
  mountChrome();
  wireGlobalEvents();
  await loadFeatures();
  router.start();
}

function mountChrome() {
  const headerHost = document.querySelector('[data-component="header"]');
  const footerHost = document.querySelector('[data-component="footer"]');
  if (headerHost) headerHost.replaceWith(Header());
  if (footerHost) footerHost.replaceWith(Footer());
}

function wireGlobalEvents() {
  events.on('error', ({ message }) => {
    toast.show({ type: 'error', message: message || i18n.t('common.error') });
  });

  events.on('route:notfound', () => {
    const app = document.querySelector('#app');
    if (!app) return;
    app.innerHTML = `
      <div class="container" style="padding:120px 24px;text-align:center">
        <h1 style="font-size:96px;color:var(--color-text-tertiary);line-height:1;letter-spacing:-0.05em">۴۰۴</h1>
        <p style="margin-top:16px;color:var(--color-text-secondary)">${i18n.t('common.not_found')}</p>
        <a class="btn btn--accent" href="#/" style="margin-top:24px">${i18n.t('common.back_home')}</a>
      </div>
    `;
  });

  events.on('cart:add', () => {
    if (!CONFIG.features.cart) {
      toast.show({ type: 'info', message: i18n.t('common.coming_soon') });
    }
  });
}

async function loadFeatures() {
  const enabled = Object.entries(CONFIG.features)
    .filter(([, on]) => on)
    .map(([name]) => name);

  for (const name of enabled) {
    const loader = featureLoaders[name];
    if (!loader) { console.warn(`[bootstrap] feature "${name}" has no loader`); continue; }
    loadFeatureCSS(name);
    try {
      const feature = await loader();
      feature.register?.();
    } catch (err) {
      console.error(`[bootstrap] failed to load "${name}":`, err);
    }
  }
}

function loadFeatureCSS(name) {
  const kebab = name.replace(/[A-Z]/g, ch => '-' + ch.toLowerCase());
  const href = `./features/${kebab}/${kebab}.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

bootstrap().catch(err => {
  console.error('[bootstrap] fatal:', err);
  document.body.innerHTML = `
    <div style="padding:80px 24px;text-align:center;font-family:system-ui">
      <h1>خطای راه‌اندازی</h1>
      <p style="margin-top:12px;color:#666">${err.message}</p>
      <p style="margin-top:8px;font-size:14px;color:#999">لطفاً کنسول مرورگر را بررسی کنید.</p>
    </div>
  `;
});

i18n.register('common', {
  fa: {
    error:       'خطایی رخ داد',
    not_found:   'صفحه یافت نشد',
    back_home:   'بازگشت به خانه',
    coming_soon: 'این قابلیت به‌زودی فعال می‌شود',
  },
  en: {
    error:       'Something went wrong',
    not_found:   'Page not found',
    back_home:   'Back to home',
    coming_soon: 'This feature is coming soon',
  },
});