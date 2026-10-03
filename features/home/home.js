// ═══════════════════════════════════════════════════════════
//  Home — Phase 13
//  صفحه اصلی مستقل از Products
//
//  ⚠️ نکته معماری:
//  این فیچر route "/" را ثبت می‌کند و چون در bootstrap
//  بعد از products لود می‌شود، route را override می‌کند.
// ═══════════════════════════════════════════════════════════

import { h, qs, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { ProductCard } from '../../shared/components/product-card/product-card.js';
import { Skeleton } from '../../shared/components/skeleton/skeleton.js';
import { icons } from '../../shared/icons/icons.js';
import { homeLang } from './home.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  container:   null,
  loading:     true,
  error:       false,
  featured:    [],
  newArrivals: [],
  brands:      [],
  brandCounts: {},
  observer:    null,
};

let offLang = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const home = {
  register() {
    i18n.register('home', homeLang);

    // ✅ این ثبت، route "/" را override می‌کند (last-registered wins)
    router.register('/', () => showHome());

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Data
// ═══════════════════════════════════════════════════════════
async function showHome() {
  state.container = qs('#app');
  state.loading   = true;
  state.error     = false;
  renderPage();

  try {
    const [featured, newestRes, brands] = await Promise.all([
      api.products.featured(8),
      api.products.list({ sort: 'newest', limit: 16 }),
      api.brands.list(),
    ]);

    state.featured = featured || [];

    // حذف محصولات تکراری از New Arrivals
    const featuredIds = new Set(state.featured.map(p => p.id));
    state.newArrivals = (newestRes.data || [])
      .filter(p => !featuredIds.has(p.id))
      .slice(0, 8);

    state.brands = brands || [];

    // شمارش محصولات هر برند از داده‌های موجود
    state.brandCounts = {};
    (newestRes.data || []).forEach(p => {
      const slug = p.brands?.slug;
      if (slug) state.brandCounts[slug] = (state.brandCounts[slug] || 0) + 1;
    });
  } catch (err) {
    console.error('[home]', err);
    state.error = true;
  }

  state.loading = false;
  renderPage();
  setupReveal();
}

// ═══════════════════════════════════════════════════════════
//  Page render
// ═══════════════════════════════════════════════════════════
function renderPage() {
  if (!state.container) return;

  const page = h('div', { class: 'home-page' },
    Hero(),
    TrustStrip(),
    BrandsSection(),
    FeaturedSection(),
    NewArrivalsSection(),
    PromoSection(),
    WhySection(),
  );

  render(state.container, page);
}

// ═══════════════════════════════════════════════════════════
//  01. HERO
// ═══════════════════════════════════════════════════════════
function Hero() {
  return h('section', { class: 'home-hero' },
    h('div', { class: 'container home-hero__inner' },
      h('div', { class: 'home-hero__content' },
        h('span', { class: 'home-hero__eyebrow' },
          h('span', { class: 'home-hero__eyebrow-dot', 'aria-hidden': 'true' }),
          i18n.t('home.heroEyebrow'),
        ),
        h('h1', { class: 'home-hero__title' },
          i18n.t('home.heroTitle'),
        ),
        h('p', { class: 'home-hero__subtitle' },
          i18n.t('home.heroSubtitle'),
        ),
        h('div', { class: 'home-hero__actions' },
          h('a', {
            class: 'btn btn--accent home-hero__cta',
            href: '#/products',
          }, i18n.t('home.heroCtaPrimary')),
          h('a', {
            class: 'btn btn--ghost home-hero__cta',
            href: '#/brands',
          }, i18n.t('home.heroCtaSecondary')),
        ),
        h('div', { class: 'home-hero__badge' },
          h('span', { class: 'home-hero__badge-icon', innerHTML: icons.check }),
          i18n.t('home.heroBadge'),
        ),
      ),
      HeroVisual(),
    ),
  );
}

function HeroVisual() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 500');
  svg.setAttribute('class', 'home-hero__phone-svg');
  svg.setAttribute('aria-hidden', 'true');

  svg.innerHTML = `
    <defs>
      <linearGradient id="heroPhoneBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--color-text)" stop-opacity="0.94"/>
        <stop offset="1" stop-color="var(--color-text)" stop-opacity="0.82"/>
      </linearGradient>
      <linearGradient id="heroScreen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--color-accent)"/>
        <stop offset="1" stop-color="color-mix(in srgb, var(--color-accent) 60%, #7a3dff)"/>
      </linearGradient>
      <radialGradient id="heroGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="var(--color-accent)" stop-opacity="0.35"/>
        <stop offset="1" stop-color="var(--color-accent)" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Glow پشت گوشی -->
    <circle cx="200" cy="240" r="200" fill="url(#heroGlow)"/>

    <!-- بدنه گوشی -->
    <rect x="110" y="60" width="180" height="360" rx="32"
          fill="url(#heroPhoneBody)"
          stroke="var(--color-accent)" stroke-width="1.2" stroke-opacity="0.35"/>

    <!-- ناچ -->
    <rect x="175" y="70" width="50" height="12" rx="6"
          fill="var(--color-bg)" opacity="0.5"/>

    <!-- صفحه -->
    <rect x="122" y="90" width="156" height="300" rx="20"
          fill="url(#heroScreen)" opacity="0.85"/>

    <!-- جزئیات داخل صفحه -->
    <rect x="140" y="120" width="120" height="8" rx="4" fill="#fff" opacity="0.35"/>
    <rect x="140" y="140" width="90" height="8" rx="4" fill="#fff" opacity="0.2"/>
    <rect x="140" y="180" width="120" height="80" rx="12" fill="#fff" opacity="0.15"/>
    <rect x="140" y="280" width="120" height="8" rx="4" fill="#fff" opacity="0.3"/>
    <rect x="140" y="300" width="70" height="8" rx="4" fill="#fff" opacity="0.2"/>

    <!-- دکمه پایین -->
    <circle cx="200" cy="405" r="4" fill="var(--color-accent)" opacity="0.6"/>

    <!-- ذرات شناور -->
    <circle cx="80" cy="150" r="6" fill="var(--color-accent)" opacity="0.35"/>
    <circle cx="330" cy="180" r="4" fill="var(--color-accent)" opacity="0.45"/>
    <circle cx="60" cy="360" r="5" fill="var(--color-accent)" opacity="0.3"/>
    <circle cx="340" cy="380" r="7" fill="var(--color-accent)" opacity="0.25"/>
    <circle cx="320" cy="80"  r="3" fill="var(--color-accent)" opacity="0.5"/>
  `;

  return h('div', { class: 'home-hero__visual' },
    h('div', { class: 'home-hero__visual-glow', 'aria-hidden': 'true' }),
    svg,
  );
}

// ═══════════════════════════════════════════════════════════
//  02. TRUST STRIP
// ═══════════════════════════════════════════════════════════
function TrustStrip() {
  const items = [
    { icon: 'shield', titleKey: 'home.trust1Title', textKey: 'home.trust1Text' },
    { icon: 'tag',    titleKey: 'home.trust2Title', textKey: 'home.trust2Text' },
    { icon: 'box',    titleKey: 'home.trust3Title', textKey: 'home.trust3Text' },
    { icon: 'user',   titleKey: 'home.trust4Title', textKey: 'home.trust4Text' },
  ];

  return h('section', { class: 'home-trust' },
    h('div', { class: 'container home-trust__inner' },
      ...items.map(item => h('div', { class: 'home-trust__item' },
        h('div', { class: 'home-trust__icon', innerHTML: icons[item.icon] }),
        h('div', { class: 'home-trust__text' },
          h('strong', {}, i18n.t(item.titleKey)),
          h('span', {}, i18n.t(item.textKey)),
        ),
      )),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  03. POPULAR BRANDS
// ═══════════════════════════════════════════════════════════
function BrandsSection() {
  return h('section', { class: 'home-section home-brands reveal' },
    h('div', { class: 'container' },
      SectionHeader({
        titleKey: 'home.brandsTitle',
        subtitleKey: 'home.brandsSubtitle',
        viewAllHref: '#/brands',
        viewAllKey:  'home.brandsViewAll',
      }),

      state.loading
        ? h('div', { class: 'home-brands__grid' },
            ...Array.from({ length: 4 }, () => h('div', { class: 'brand-pill brand-pill--skeleton' },
              h('div', { class: 'skeleton skeleton--line', style: { width: '60%' } }),
            )),
          )
        : h('div', { class: 'home-brands__grid' },
            ...state.brands.slice(0, 8).map(b => BrandPill(b)),
          ),
    ),
  );
}

function BrandPill(brand) {
  const name = i18n.localizeField(brand, 'name');
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const count = state.brandCounts[brand.slug] || 0;

  return h('a', {
    class: 'brand-pill',
    href: `#/products?brand=${brand.slug}`,
    'aria-label': name,
  },
    h('span', { class: 'brand-pill__logo' },
      brand.logo_url
        ? h('img', { src: brand.logo_url, alt: name, loading: 'lazy' })
        : h('span', { class: 'brand-pill__initial' }, initial),
    ),
    h('span', { class: 'brand-pill__name' }, name),
    count > 0
      ? h('span', { class: 'brand-pill__count' },
          count === 1
            ? i18n.t('home.brandsCountOne')
            : i18n.t('home.brandsCount', { n: i18n.formatNumber(count) }))
      : null,
  );
}

// ═══════════════════════════════════════════════════════════
//  04. FEATURED PRODUCTS
// ═══════════════════════════════════════════════════════════
function FeaturedSection() {
  return h('section', { class: 'home-section home-products reveal' },
    h('div', { class: 'container' },
      SectionHeader({
        titleKey:    'home.featuredTitle',
        subtitleKey: 'home.featuredSubtitle',
        viewAllHref: '#/products',
        viewAllKey:  'home.featuredViewAll',
      }),

      state.loading
        ? h('div', { class: 'products-grid' }, ...Skeleton.grid(4))
        : state.featured.length === 0
          ? h('div', { class: 'home-empty' }, i18n.t('home.featuredEmpty'))
          : h('div', { class: 'products-grid' },
              ...state.featured.slice(0, 4).map(p => ProductCard(p)),
            ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  05. NEW ARRIVALS
// ═══════════════════════════════════════════════════════════
function NewArrivalsSection() {
  return h('section', { class: 'home-section home-products reveal' },
    h('div', { class: 'container' },
      SectionHeader({
        titleKey:    'home.newTitle',
        subtitleKey: 'home.newSubtitle',
        viewAllHref: '#/products?sort=newest',
        viewAllKey:  'home.newViewAll',
      }),

      state.loading
        ? h('div', { class: 'products-grid' }, ...Skeleton.grid(4))
        : state.newArrivals.length === 0
          ? h('div', { class: 'home-empty' }, i18n.t('home.newEmpty'))
          : h('div', { class: 'products-grid' },
              ...state.newArrivals.slice(0, 4).map(p => ProductCard(p)),
            ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  06. PROMO BANNER
// ═══════════════════════════════════════════════════════════
function PromoSection() {
  return h('section', { class: 'home-section home-promo reveal' },
    h('div', { class: 'container' },
      h('div', { class: 'home-promo__inner' },
        h('div', { class: 'home-promo__content' },
          h('span', { class: 'home-promo__badge' },
            h('span', { class: 'home-promo__badge-dot', 'aria-hidden': 'true' }),
            i18n.t('home.promoBadge'),
          ),
          h('h2', { class: 'home-promo__title' }, i18n.t('home.promoTitle')),
          h('p',  { class: 'home-promo__text' },  i18n.t('home.promoText')),

          h('div', { class: 'home-promo__footer' },
            h('div', { class: 'home-promo__code' },
              h('span', { class: 'home-promo__code-label' }, i18n.t('home.promoCode')),
              h('code', { class: 'home-promo__code-value' }, 'SUMMER20'),
            ),
            h('a', {
              class: 'btn btn--accent home-promo__cta',
              href: '#/products',
            }, i18n.t('home.promoCta')),
          ),
        ),
        h('div', { class: 'home-promo__visual', 'aria-hidden': 'true' },
          h('div', { class: 'home-promo__discount' },
            h('span', { class: 'home-promo__discount-num' }, i18n.t('home.promoDiscount')),
            h('span', { class: 'home-promo__discount-label' }, i18n.t('home.promoLabel')),
          ),
        ),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  07. WHY PHONE STORE
// ═══════════════════════════════════════════════════════════
function WhySection() {
  const items = [
    { icon: 'shield', titleKey: 'home.why1Title', textKey: 'home.why1Text' },
    { icon: 'tag',    titleKey: 'home.why2Title', textKey: 'home.why2Text' },
    { icon: 'box',    titleKey: 'home.why3Title', textKey: 'home.why3Text' },
    { icon: 'user',   titleKey: 'home.why4Title', textKey: 'home.why4Text' },
  ];

  return h('section', { class: 'home-section home-why reveal' },
    h('div', { class: 'container' },
      h('header', { class: 'home-section__header home-section__header--center' },
        h('h2', { class: 'home-section__title' }, i18n.t('home.whyTitle')),
        h('p',  { class: 'home-section__subtitle' }, i18n.t('home.whySubtitle')),
      ),

      h('div', { class: 'home-why__grid' },
        ...items.map(item => h('article', { class: 'home-why__card' },
          h('div', { class: 'home-why__icon', innerHTML: icons[item.icon] }),
          h('h3', { class: 'home-why__title' }, i18n.t(item.titleKey)),
          h('p',  { class: 'home-why__text' },  i18n.t(item.textKey)),
        )),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Section Header helper
// ═══════════════════════════════════════════════════════════
function SectionHeader({ titleKey, subtitleKey, viewAllHref, viewAllKey }) {
  return h('header', { class: 'home-section__header' },
    h('div', {},
      h('h2', { class: 'home-section__title' }, i18n.t(titleKey)),
      subtitleKey
        ? h('p', { class: 'home-section__subtitle' }, i18n.t(subtitleKey))
        : null,
    ),
    viewAllHref
      ? h('a', { class: 'home-section__view-all', href: viewAllHref },
          h('span', {}, i18n.t(viewAllKey)),
          h('span', { class: 'home-section__view-all-arrow', innerHTML: icons.arrowL }),
        )
      : null,
  );
}

// ═══════════════════════════════════════════════════════════
//  Reveal on scroll
// ═══════════════════════════════════════════════════════════
function setupReveal() {
  // پاک‌سازی observer قبلی
  if (state.observer) state.observer.disconnect();

  if (!('IntersectionObserver' in window)) {
    // اگر پشتیبانی نبود، همه رو نشون بده
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-revealed'));
    return;
  }

  state.observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        state.observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.05,
  });

  document.querySelectorAll('.reveal').forEach(el => state.observer.observe(el));
}