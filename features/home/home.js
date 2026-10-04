// ═══════════════════════════════════════════════════════════
//  Home — Monochrome Glass
//  Phase 28 — Banner Carousel + Category Bar
// ═══════════════════════════════════════════════════════════

import { h, qs, qsa, on, render } from '../../core/dom.js';
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

const carousel = {
  index:    0,
  count:    3,
  timer:    null,
  trackEl:  null,
  dotsEl:   null,
  paused:   false,
  interval: 6000,
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

  cleanupCarousel();
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

  cleanupCarousel();

  const page = h('div', { class: 'home' },
    Hero(),
    BannerCarousel(),          // ← NEW
    QuickActions(),
    CategoryBar(),             // ← NEW
    BrandsStrip(),
    FeaturedSection(),
    Promo1(),
    NewArrivals(),
    Promo2(),
    TrustSection(),
  );

  render(state.container, page);

  requestAnimationFrame(() => {
    wireCarousel();
  });
}

// ═══════════════════════════════════════════════════════════
//  01. HERO
// ═══════════════════════════════════════════════════════════
function Hero() {
  return h('section', { class: 'hero' },
    h('div', { class: 'hero__banner' },
      h('div', { class: 'img-placeholder hero__banner-img' },
        h('span', {}, i18n.t('home.heroBannerLabel')),
      ),
    ),
    h('div', { class: 'hero__overlay' }),
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
//  02. BANNER CAROUSEL
// ═══════════════════════════════════════════════════════════
function BannerCarousel() {
  const slides = [
    {
      titleKey: 'banner1Title',
      subKey:   'banner1Subtitle',
      ctaKey:   'banner1Cta',
      labelKey: 'banner1Label',
      href:     '#/products',
    },
    {
      titleKey: 'banner2Title',
      subKey:   'banner2Subtitle',
      ctaKey:   'banner2Cta',
      labelKey: 'banner2Label',
      href:     '#/products',
    },
    {
      titleKey: 'banner3Title',
      subKey:   'banner3Subtitle',
      ctaKey:   'banner3Cta',
      labelKey: 'banner3Label',
      href:     '#/products',
    },
  ];

  const track = h('div', { class: 'carousel__track' });
  const dots  = h('div', { class: 'carousel__dots' });

  slides.forEach((s, i) => {
    track.append(CarouselSlide(s, i));
    dots.append(h('button', {
      class: `carousel__dot ${i === 0 ? 'is-active' : ''}`,
      type: 'button',
      'aria-label': `Slide ${i + 1}`,
      dataset: { idx: String(i) },
    }));
  });

  const el = h('section', { class: 'carousel', 'aria-label': 'Banners' },
    h('div', { class: 'container' },
      h('div', { class: 'carousel__viewport' },
        track,
        // Arrows
        h('button', {
          class: 'carousel__arrow carousel__arrow--prev',
          type: 'button',
          'aria-label': i18n.t('home.bannerPrev'),
          innerHTML: icons.arrowL,
        }),
        h('button', {
          class: 'carousel__arrow carousel__arrow--next',
          type: 'button',
          'aria-label': i18n.t('home.bannerNext'),
          innerHTML: icons.arrowR,
        }),
        // Dots
        dots,
      ),
    ),
  );

  return el;
}

function CarouselSlide(slide, index) {
  return h('article', { class: 'carousel__slide', dataset: { idx: String(index) } },
    // Image placeholder
    h('div', { class: 'carousel__media' },
      h('div', { class: 'img-placeholder carousel__media-img' },
        h('span', {}, i18n.t(`home.${slide.labelKey}`)),
      ),
    ),
    // Overlay
    h('div', { class: 'carousel__overlay' }),
    // Content
    h('div', { class: 'carousel__content' },
      h('h3', { class: 'carousel__title' }, i18n.t(`home.${slide.titleKey}`)),
      h('p',  { class: 'carousel__subtitle' }, i18n.t(`home.${slide.subKey}`)),
      h('a',  { class: 'btn btn--accent carousel__cta', href: slide.href },
        h('span', {}, i18n.t(`home.${slide.ctaKey}`)),
        h('span', { class: 'btn__arrow', innerHTML: icons.arrowL }),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Carousel — wiring
// ═══════════════════════════════════════════════════════════
function wireCarousel() {
  const el = qs('.carousel', state.container);
  if (!el) return;

  carousel.trackEl = qs('.carousel__track', el);
  carousel.dotsEl  = qs('.carousel__dots', el);
  carousel.index   = 0;
  carousel.paused  = false;

  if (!carousel.trackEl) return;

  // ── Arrows ──
  const prev = qs('.carousel__arrow--prev', el);
  const next = qs('.carousel__arrow--next', el);
  if (prev) on(prev, 'click', () => goSlide(carousel.index - 1));
  if (next) on(next, 'click', () => goSlide(carousel.index + 1));

  // ── Dots ──
  qsa('.carousel__dot', el).forEach(dot => {
    on(dot, 'click', () => {
      const i = Number(dot.dataset.idx);
      if (i === carousel.index) return;
      goSlide(i);
    });
  });

  // ── Pause on hover ──
  on(el, 'mouseenter', () => { carousel.paused = true; });
  on(el, 'mouseleave', () => { carousel.paused = false; });

  // ── Touch swipe ──
  let touchStartX = 0;
  on(el, 'touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  on(el, 'touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      goSlide(carousel.index + (dx < 0 ? 1 : -1));
    }
  });

  // ── Keyboard ──
  on(el, 'keydown', (e) => {
    if (e.key === 'ArrowLeft')  goSlide(carousel.index - 1);
    if (e.key === 'ArrowRight') goSlide(carousel.index + 1);
  });
  el.tabIndex = 0;

  // ── Auto-rotate ──
  startAutoRotate();

  // ── Apply initial state ──
  applySlide(0, false);
}

function startAutoRotate() {
  stopAutoRotate();
  carousel.timer = setInterval(() => {
    if (carousel.paused) return;
    goSlide(carousel.index + 1);
  }, carousel.interval);
}

function stopAutoRotate() {
  if (carousel.timer) {
    clearInterval(carousel.timer);
    carousel.timer = null;
  }
}

function cleanupCarousel() {
  stopAutoRotate();
  carousel.trackEl = null;
  carousel.dotsEl = null;
  carousel.index = 0;
  carousel.paused = false;
}

function goSlide(i) {
  const n = carousel.count;
  const next = ((i % n) + n) % n;
  if (next === carousel.index) return;
  applySlide(next, true);
}

function applySlide(i, animate = true) {
  if (!carousel.trackEl) return;
  carousel.index = i;

  const offset = -i * 100;
  if (animate) {
    carousel.trackEl.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)';
  } else {
    carousel.trackEl.style.transition = 'none';
  }
  carousel.trackEl.style.transform = `translate3d(${offset}%, 0, 0)`;

  // Dots
  if (carousel.dotsEl) {
    qsa('.carousel__dot', carousel.dotsEl).forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx === i);
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  03. QUICK ACTIONS
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
//  04. CATEGORY BAR
// ═══════════════════════════════════════════════════════════
function CategoryBar() {
  const cats = [
    { icon: 'star',    key: 'catFlagship', search: 'Pro' },
    { icon: 'box',     key: 'catMidrange', search: 'Note' },
    { icon: 'tag',     key: 'catBudget',   search: 'Redmi' },
    { icon: 'compare', key: 'catFoldable', search: 'Fold' },
    { icon: 'bolt',    key: 'catGaming',   search: 'GT' },
    { icon: 'eye',     key: 'catCamera',   search: 'Ultra' },
    { icon: 'check',   key: 'catBattery',  search: 'Power' },
    { icon: 'globe',   key: 'cat5G',       search: '5G' },
  ];

  return h('section', { class: 'catbar reveal' },
    h('div', { class: 'container' },
      h('header', { class: 'catbar__head' },
        h('h2', { class: 'catbar__title' }, i18n.t('home.categoriesTitle')),
        h('p',  { class: 'catbar__sub' },   i18n.t('home.categoriesSubtitle')),
      ),

      h('div', { class: 'catbar__scroll' },
        ...cats.map(cat => h('a', {
          class: 'catbar__item',
          href: `#/search?q=${encodeURIComponent(cat.search)}`,
        },
          h('span', { class: 'catbar__icon', innerHTML: icons[cat.icon] }),
          h('span', { class: 'catbar__label' }, i18n.t(`home.${cat.key}`)),
        )),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  05. BRANDS STRIP
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
//  06. FEATURED
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
//  07. PROMO 1
// ═══════════════════════════════════════════════════════════
function Promo1() {
  return h('section', { class: 'promo reveal' },
    h('div', { class: 'container' },
      h('div', { class: 'promo__card' },
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
//  08. NEW ARRIVALS
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
//  09. PROMO 2
// ═══════════════════════════════════════════════════════════
function Promo2() {
  return h('section', { class: 'promo promo--reverse reveal' },
    h('div', { class: 'container' },
      h('div', { class: 'promo__card' },
        h('div', { class: 'promo__image' },
          h('div', { class: 'img-placeholder' },
            h('span', {}, i18n.t('home.promo2ImageLabel')),
          ),
        ),
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
//  10. TRUST
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

// ═══════════════════════════════════════════════════════════
//  Cleanup on route change
// ═══════════════════════════════════════════════════════════
events.on('route:changed', () => {
  if (carousel.timer) cleanupCarousel();
});