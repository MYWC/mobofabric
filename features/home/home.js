// ═══════════════════════════════════════════════════════════
//  Home — Monochrome Glass
//  Phase 27
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

    const featuredIds = new Set(state.featured.map(p => p.id));
    state.newArrivals = (newestRes.data || [])
      .filter(p => !featuredIds.has(p.id))
      .slice(0, 8);

    state.brands = brands || [];

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
//  Page
// ═══════════════════════════════════════════════════════════
function renderPage() {
  if (!state.container) return;

  const page = h('div', { class: 'home' },
    Hero(),
    QuickActions(),
    BrandsStrip(),
    FeaturedSection(),
    Promo1(),
    NewArrivals(),
    Promo2(),
    TrustSection(),
  );

  render(state.container, page);
}

// ═══════════════════════════════════════════════════════════
//  01. HERO
// ═══════════════════════════════════════════════════════════
function Hero() {
  return h('section', { class: 'hero' },
    // ── Banner placeholder ──
    h('div', { class: 'hero__banner' },
      h('div', { class: 'img-placeholder hero__banner-img' },
        h('span', {}, i18n.t('home.heroBannerLabel')),
      ),
    ),

    // ── Overlay gradient ──
    h('div', { class: 'hero__overlay' }),

    // ── Content ──
    h('div', { class: 'container hero__content' },
      h('span', { class: 'hero__eyebrow' }, i18n.t('home.heroEyebrow')),
      h('h1', { class: 'hero__title' }, i18n.t('home.heroTitle')),
      h('p',  { class: 'hero__subtitle' }, i18n.t('home.heroSubtitle')),
      h('div', { class: 'hero__actions' },
        h('a', { class: 'btn btn--accent', href: '#/products' },
          h('span', {}, i18n.t('home.heroCtaPrimary')),
          h('span', { class: 'btn__arrow', innerHTML: icons.arrowL }),
        ),
        h('a', { class: 'btn btn--ghost', href: '#/brands' },
          i18n.t('home.heroCtaSecondary'),
        ),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  02. QUICK ACTIONS
// ═══════════════════════════════════════════════════════════
function QuickActions() {
  const items = [
    { icon: 'box',   key: 'quickPhones',  href: '#/products' },
    { icon: 'tag',   key: 'quickBrands',  href: '#/brands' },
    { icon: 'star',  key: 'quickDeals',   href: '#/products?sort=price_asc' },
    { icon: 'user',  key: 'quickSupport', href: '#/contact' },
  ];

  return h('section', { class: 'quick' },
    h('div', { class: 'container' },
      h('h2', { class: 'quick__title' }, i18n.t('home.quickTitle')),
      h('div', { class: 'quick__grid' },
        ...items.map(item => h('a', {
          class: 'quick__item',
          href: item.href,
        },
          h('span', { class: 'quick__icon', innerHTML: icons[item.icon] }),
          h('span', { class: 'quick__label' }, i18n.t(`home.${item.key}`)),
          h('span', { class: 'quick__arrow', innerHTML: icons.arrowL }),
        )),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  03. BRANDS STRIP
// ═══════════════════════════════════════════════════════════
function BrandsStrip() {
  return h('section', { class: 'brands reveal' },
    h('div', { class: 'container' },
      SectionHead({
        titleKey: 'home.brandsTitle',
        subKey:   'home.brandsSubtitle',
        viewHref: '#/brands',
        viewKey:  'home.brandsViewAll',
      }),
      state.loading
        ? h('div', { class: 'brands__grid' },
            ...Array.from({ length: 6 }, () => h('div', { class: 'brand brand--skeleton' })),
          )
        : h('div', { class: 'brands__grid' },
            ...state.brands.slice(0, 10).map(b => BrandChip(b)),
          ),
    ),
  );
}

function BrandChip(brand) {
  const name = i18n.localizeField(brand, 'name');
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const count = state.brandCounts[brand.slug] || 0;

  return h('a', {
    class: 'brand',
    href: `#/products?brand=${brand.slug}`,
  },
    h('span', { class: 'brand__logo' },
      brand.logo_url
        ? h('img', { src: brand.logo_url, alt: name, loading: 'lazy' })
        : h('span', { class: 'brand__initial' }, initial),
    ),
    h('span', { class: 'brand__name' }, name),
    count > 0
      ? h('span', { class: 'brand__count' },
          i18n.t('home.brandsCount', { n: i18n.formatNumber(count) }))
      : null,
  );
}

// ═══════════════════════════════════════════════════════════
//  04. FEATURED
// ═══════════════════════════════════════════════════════════
function FeaturedSection() {
  return h('section', { class: 'section reveal' },
    h('div', { class: 'container' },
      SectionHead({
        titleKey: 'home.featuredTitle',
        subKey:   'home.featuredSubtitle',
        viewHref: '#/products',
        viewKey:  'home.featuredViewAll',
      }),
      state.loading
        ? h('div', { class: 'grid' }, ...Skeleton.grid(4))
        : state.featured.length === 0
          ? h('div', { class: 'empty' }, i18n.t('home.featuredEmpty'))
          : h('div', { class: 'grid' },
              ...state.featured.slice(0, 4).map(p => ProductCard(p)),
            ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  05. PROMO 1
// ═══════════════════════════════════════════════════════════
function Promo1() {
  return h('section', { class: 'promo reveal' },
    h('div', { class: 'container' },
      h('div', { class: 'promo__card' },
        // ── Text side ──
        h('div', { class: 'promo__text' },
          h('span', { class: 'promo__badge' }, i18n.t('home.promo1Badge')),
          h('h2', { class: 'promo__title' }, i18n.t('home.promo1Title')),
          h('p',  { class: 'promo__desc' },  i18n.t('home.promo1Text')),

          h('div', { class: 'promo__row' },
            h('div', { class: 'promo__code' },
              h('span', { class: 'promo__code-label' }, i18n.t('home.promo1Code')),
              h('code', { class: 'promo__code-value' }, i18n.t('home.promo1CodeValue')),
            ),
            h('a', { class: 'btn btn--accent', href: '#/products' },
              h('span', {}, i18n.t('home.promo1Cta')),
              h('span', { class: 'btn__arrow', innerHTML: icons.arrowL }),
            ),
          ),
        ),

        // ── Image side ──
        h('div', { class: 'promo__image' },
          h('div', { class: 'img-placeholder' },
            h('span', {}, i18n.t('home.promo1ImageLabel')),
          ),
        ),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  06. NEW ARRIVALS
// ═══════════════════════════════════════════════════════════
function NewArrivals() {
  return h('section', { class: 'section reveal' },
    h('div', { class: 'container' },
      SectionHead({
        titleKey: 'home.newTitle',
        subKey:   'home.newSubtitle',
        viewHref: '#/products?sort=newest',
        viewKey:  'home.newViewAll',
      }),
      state.loading
        ? h('div', { class: 'grid' }, ...Skeleton.grid(4))
        : state.newArrivals.length === 0
          ? h('div', { class: 'empty' }, i18n.t('home.newEmpty'))
          : h('div', { class: 'grid' },
              ...state.newArrivals.slice(0, 4).map(p => ProductCard(p)),
            ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  07. PROMO 2
// ═══════════════════════════════════════════════════════════
function Promo2() {
  return h('section', { class: 'promo promo--reverse reveal' },
    h('div', { class: 'container' },
      h('div', { class: 'promo__card' },
        // ── Image side (چپ در این نسخه) ──
        h('div', { class: 'promo__image' },
          h('div', { class: 'img-placeholder' },
            h('span', {}, i18n.t('home.promo2ImageLabel')),
          ),
        ),

        // ── Text side ──
        h('div', { class: 'promo__text' },
          h('span', { class: 'promo__badge' }, i18n.t('home.promo2Badge')),
          h('h2', { class: 'promo__title' }, i18n.t('home.promo2Title')),
          h('p',  { class: 'promo__desc' },  i18n.t('home.promo2Text')),

          h('div', { class: 'promo__row' },
            h('a', { class: 'btn btn--accent', href: '#/products' },
              h('span', {}, i18n.t('home.promo2Cta')),
              h('span', { class: 'btn__arrow', innerHTML: icons.arrowL }),
            ),
          ),
        ),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  08. TRUST
// ═══════════════════════════════════════════════════════════
function TrustSection() {
  const items = [
    { icon: 'shield', titleKey: 'trust1Title', textKey: 'trust1Text' },
    { icon: 'tag',    titleKey: 'trust2Title', textKey: 'trust2Text' },
    { icon: 'box',    titleKey: 'trust3Title', textKey: 'trust3Text' },
    { icon: 'user',   titleKey: 'trust4Title', textKey: 'trust4Text' },
  ];

  return h('section', { class: 'trust reveal' },
    h('div', { class: 'container' },
      h('header', { class: 'trust__head' },
        h('h2', { class: 'trust__title' }, i18n.t('home.trustTitle')),
        h('p',  { class: 'trust__sub' },   i18n.t('home.trustSubtitle')),
      ),
      h('div', { class: 'trust__grid' },
        ...items.map(item => h('article', { class: 'trust__card' },
          h('span', { class: 'trust__icon', innerHTML: icons[item.icon] }),
          h('h3', { class: 'trust__card-title' }, i18n.t(`home.${item.titleKey}`)),
          h('p',  { class: 'trust__card-text' },  i18n.t(`home.${item.textKey}`)),
        )),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════
function SectionHead({ titleKey, subKey, viewHref, viewKey }) {
  return h('header', { class: 'section__head' },
    h('div', { class: 'section__head-left' },
      h('h2', { class: 'section__title' }, i18n.t(titleKey)),
      subKey ? h('p', { class: 'section__sub' }, i18n.t(subKey)) : null,
    ),
    viewHref
      ? h('a', { class: 'section__view', href: viewHref },
          h('span', {}, i18n.t(viewKey)),
          h('span', { class: 'section__view-arrow', innerHTML: icons.arrowL }),
        )
      : null,
  );
}

// ═══════════════════════════════════════════════════════════
//  Reveal on scroll
// ═══════════════════════════════════════════════════════════
function setupReveal() {
  if (state.observer) state.observer.disconnect();

  if (!('IntersectionObserver' in window)) {
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
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.05,
  });

  document.querySelectorAll('.reveal').forEach(el => state.observer.observe(el));
}