// ═══════════════════════════════════════════════════════════
//  Home — Obsidian Vault
//  Phase 26
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
//  Page render
// ═══════════════════════════════════════════════════════════
function renderPage() {
  if (!state.container) return;

  const page = h('div', { class: 'home-page' },
    Hero(),
    FeaturedSection(),
    NewArrivalsSection(),
    BrandsSection(),
    PromoSection(),
  );

  render(state.container, page);
  requestAnimationFrame(() => {
    setupHeroInteractions();
  });
}

// ═══════════════════════════════════════════════════════════
//  01. HERO — Obsidian Stage
// ═══════════════════════════════════════════════════════════
function Hero() {
  return h('section', { class: 'vault-hero' },
    // ── Background layers ──
    h('div', { class: 'vault-hero__bg' },
      h('div', { class: 'vault-hero__spotlight' }),
      h('div', { class: 'vault-hero__noise' }),
    ),

    // ── Content ──
    h('div', { class: 'vault-hero__inner' },

      // ── Left: Text ──
      h('div', { class: 'vault-hero__content' },

        h('div', { class: 'vault-hero__eyebrow' },
          h('span', { class: 'vault-hero__eyebrow-line' }),
          h('span', { class: 'vault-hero__eyebrow-text' },
            i18n.t('home.heroEyebrow')),
          h('span', { class: 'vault-hero__eyebrow-line' }),
        ),

        h('h1', { class: 'vault-hero__title', 'data-weight-shift': '' },
          Line(i18n.t('home.heroTitleLine1')),
          Line(i18n.t('home.heroTitleLine2'), 'is-gold'),
        ),

        h('p', { class: 'vault-hero__subtitle' },
          i18n.t('home.heroSubtitle'),
        ),

        h('div', { class: 'vault-hero__actions' },
          h('a', {
            class: 'vault-btn vault-btn--primary',
            href: '#/products',
          },
            h('span', {}, i18n.t('home.heroCtaPrimary')),
            h('span', { class: 'vault-btn__arrow', innerHTML: icons.arrowL }),
          ),
          h('a', {
            class: 'vault-btn vault-btn--ghost',
            href: '#/brands',
          }, i18n.t('home.heroCtaSecondary')),
        ),

        h('div', { class: 'vault-hero__trust' },
          Trust('✓', i18n.t('home.heroTrust1')),
          Trust('✓', i18n.t('home.heroTrust2')),
          Trust('✓', i18n.t('home.heroTrust3')),
        ),
      ),

      // ── Right: 3D Phone ──
      PhoneStage(),
    ),
  );
}

function Line(text, className = '') {
  return h('span', { class: `vault-hero__title-line ${className}` },
    h('span', { class: 'vault-hero__title-inner', 'data-weight-inner': '' }, text),
  );
}

function Trust(icon, text) {
  return h('div', { class: 'vault-hero__trust-item' },
    h('span', { class: 'vault-hero__trust-icon' }, icon),
    h('span', {}, text),
  );
}

// ═══════════════════════════════════════════════════════════
//  Phone Stage — 3D Phone with Gold Pedestal
// ═══════════════════════════════════════════════════════════
function PhoneStage() {
  return h('div', { class: 'vault-stage' },
    // ── Glow behind phone ──
    h('div', { class: 'vault-stage__glow' }),

    // ── Pedestal shadow ──
    h('div', { class: 'vault-stage__pedestal' }),

    // ── Particles ──
    ParticlesLayer(),

    // ── The phone ──
    h('div', { class: 'vault-stage__phone', 'data-phone': '' },
      h('div', { class: 'vault-stage__phone-body' },
        h('div', { class: 'vault-stage__phone-notch' }),
        h('div', { class: 'vault-stage__phone-screen' },
          h('div', { class: 'vault-stage__screen-line vault-stage__screen-line--1' }),
          h('div', { class: 'vault-stage__screen-line vault-stage__screen-line--2' }),
          h('div', { class: 'vault-stage__screen-block' }),
          h('div', { class: 'vault-stage__screen-line vault-stage__screen-line--3' }),
          h('div', { class: 'vault-stage__screen-line vault-stage__screen-line--4' }),
        ),
      ),
      h('div', { class: 'vault-stage__phone-glow' }),
    ),

    // ── Floating badges ──
    h('div', { class: 'vault-stage__badge vault-stage__badge--1' },
      h('span', { class: 'vault-stage__badge-dot' }),
      h('span', {}, '4.9'),
      h('span', { class: 'vault-stage__badge-label' }, 'rating'),
    ),

    h('div', { class: 'vault-stage__badge vault-stage__badge--2' },
      h('span', { class: 'vault-stage__badge-icon' }, '⚡'),
      h('span', {}, '2h'),
      h('span', { class: 'vault-stage__badge-label' }, 'delivery'),
    ),
  );
}

function ParticlesLayer() {
  const wrap = h('div', { class: 'vault-stage__particles' });
  for (let i = 0; i < 12; i++) {
    const p = h('span', { class: 'vault-particle' });
    p.style.setProperty('--x', `${20 + Math.random() * 60}%`);
    p.style.setProperty('--y', `${20 + Math.random() * 60}%`);
    p.style.setProperty('--delay', `${Math.random() * 6}s`);
    p.style.setProperty('--duration', `${6 + Math.random() * 6}s`);
    p.style.setProperty('--size', `${1 + Math.random() * 2}px`);
    wrap.append(p);
  }
  return wrap;
}

// ═══════════════════════════════════════════════════════════
//  Featured Section
// ═══════════════════════════════════════════════════════════
function FeaturedSection() {
  return h('section', { class: 'vault-section vault-section--featured reveal' },
    h('div', { class: 'container' },
      SectionHeader({
        eyebrow:  'CURATED',
        titleKey: 'home.featuredTitle',
        subtitleKey: 'home.featuredSubtitle',
        viewAllHref: '#/products',
        viewAllKey:  'home.featuredViewAll',
      }),

      state.loading
        ? h('div', { class: 'vault-grid' }, ...Skeleton.grid(4))
        : state.featured.length === 0
          ? h('div', { class: 'vault-empty' }, i18n.t('home.featuredEmpty'))
          : h('div', { class: 'vault-grid' },
              ...state.featured.slice(0, 4).map(p => ProductCard(p)),
            ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  New Arrivals
// ═══════════════════════════════════════════════════════════
function NewArrivalsSection() {
  return h('section', { class: 'vault-section reveal' },
    h('div', { class: 'container' },
      SectionHeader({
        eyebrow:  'FRESH',
        titleKey: 'home.newTitle',
        subtitleKey: 'home.newSubtitle',
        viewAllHref: '#/products?sort=newest',
        viewAllKey:  'home.newViewAll',
      }),

      state.loading
        ? h('div', { class: 'vault-grid' }, ...Skeleton.grid(4))
        : state.newArrivals.length === 0
          ? h('div', { class: 'vault-empty' }, i18n.t('home.newEmpty'))
          : h('div', { class: 'vault-grid' },
              ...state.newArrivals.slice(0, 4).map(p => ProductCard(p)),
            ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Brands — Gold Marquee
// ═══════════════════════════════════════════════════════════
function BrandsSection() {
  return h('section', { class: 'vault-section vault-brands reveal' },
    h('div', { class: 'container' },
      SectionHeader({
        eyebrow:  'PARTNERS',
        titleKey: 'home.brandsTitle',
        subtitleKey: 'home.brandsSubtitle',
        viewAllHref: '#/brands',
        viewAllKey:  'home.brandsViewAll',
      }),

      state.loading
        ? h('div', { class: 'vault-brands__grid' },
            ...Array.from({ length: 6 }, () =>
              h('div', { class: 'vault-brand vault-brand--skeleton' })
            ),
          )
        : h('div', { class: 'vault-brands__grid' },
            ...state.brands.slice(0, 10).map(b => BrandCard(b)),
          ),
    ),
  );
}

function BrandCard(brand) {
  const name = i18n.localizeField(brand, 'name');
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const count = state.brandCounts[brand.slug] || 0;

  return h('a', {
    class: 'vault-brand',
    href: `#/products?brand=${brand.slug}`,
    'aria-label': name,
  },
    h('div', { class: 'vault-brand__logo' },
      brand.logo_url
        ? h('img', { src: brand.logo_url, alt: name, loading: 'lazy' })
        : h('span', { class: 'vault-brand__initial' }, initial),
    ),
    h('div', { class: 'vault-brand__body' },
      h('div', { class: 'vault-brand__name' }, name),
      count > 0
        ? h('div', { class: 'vault-brand__count' },
            count === 1
              ? i18n.t('home.brandsCountOne')
              : i18n.t('home.brandsCount', { n: i18n.formatNumber(count) }))
        : null,
    ),
    h('span', { class: 'vault-brand__arrow', innerHTML: icons.arrowL }),
  );
}

// ═══════════════════════════════════════════════════════════
//  Promo — Full Width Gold
// ═══════════════════════════════════════════════════════════
function PromoSection() {
  return h('section', { class: 'vault-section vault-promo reveal' },
    h('div', { class: 'container' },
      h('div', { class: 'vault-promo__card' },
        h('div', { class: 'vault-promo__left' },
          h('div', { class: 'vault-promo__eyebrow' },
            h('span', { class: 'vault-promo__pulse' }),
            i18n.t('home.promoBadge'),
          ),
          h('h2', { class: 'vault-promo__title' }, i18n.t('home.promoTitle')),
          h('p',  { class: 'vault-promo__text' },  i18n.t('home.promoText')),

          h('div', { class: 'vault-promo__footer' },
            h('div', { class: 'vault-promo__code' },
              h('span', { class: 'vault-promo__code-label' }, i18n.t('home.promoCode')),
              h('code', { class: 'vault-promo__code-value' }, 'SUMMER20'),
            ),
            h('a', {
              class: 'vault-btn vault-btn--primary',
              href: '#/products',
            },
              h('span', {}, i18n.t('home.promoCta')),
              h('span', { class: 'vault-btn__arrow', innerHTML: icons.arrowL }),
            ),
          ),
        ),

        h('div', { class: 'vault-promo__right', 'aria-hidden': 'true' },
          h('div', { class: 'vault-promo__discount' },
            h('span', { class: 'vault-promo__discount-num' }, i18n.t('home.promoDiscount')),
            h('span', { class: 'vault-promo__discount-label' }, i18n.t('home.promoLabel')),
          ),
        ),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Section Header
// ═══════════════════════════════════════════════════════════
function SectionHeader({ eyebrow, titleKey, subtitleKey, viewAllHref, viewAllKey }) {
  return h('header', { class: 'vault-section__header' },
    h('div', { class: 'vault-section__left' },
      eyebrow
        ? h('span', { class: 'vault-section__eyebrow' }, eyebrow)
        : null,
      h('h2', { class: 'vault-section__title' }, i18n.t(titleKey)),
      subtitleKey
        ? h('p', { class: 'vault-section__subtitle' }, i18n.t(subtitleKey))
        : null,
    ),
    viewAllHref
      ? h('a', { class: 'vault-section__view-all', href: viewAllHref },
          h('span', {}, i18n.t(viewAllKey)),
          h('span', { class: 'vault-section__view-all-arrow', innerHTML: icons.arrowL }),
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
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.05,
  });

  document.querySelectorAll('.reveal').forEach(el => state.observer.observe(el));
}

// ═══════════════════════════════════════════════════════════
//  Hero Interactions — Weight Shift + Phone Tilt
// ═══════════════════════════════════════════════════════════
function setupHeroInteractions() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── Weight Shift: تیتر با ورود از ۳۰۰ به ۹۰۰ ──
  const titleInners = document.querySelectorAll('[data-weight-inner]');
  titleInners.forEach((el, i) => {
    el.animate(
      [
        { fontVariationSettings: "'wght' 300", letterSpacing: '0.02em', opacity: 0 },
        { fontVariationSettings: "'wght' 900", letterSpacing: '-0.04em', opacity: 1 },
      ],
      {
        duration: 1400,
        delay: 300 + i * 200,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      }
    );
  });

  // ── Phone Tilt با حرکت موس ──
  const phone = document.querySelector('[data-phone]');
  const hero  = document.querySelector('.vault-hero');
  if (!phone || !hero) return;

  let rafId = null;
  let targetRX = 0, targetRY = 0;
  let curRX = 0, curRY = 0;

  const onMove = (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    targetRY = x * 16;
    targetRX = -y * 10;

    if (!rafId) tick();
  };

  const onLeave = () => {
    targetRX = 0;
    targetRY = 0;
    if (!rafId) tick();
  };

  const tick = () => {
    curRX += (targetRX - curRX) * 0.08;
    curRY += (targetRY - curRY) * 0.08;

    phone.style.transform = `
      rotateX(${curRX.toFixed(2)}deg)
      rotateY(${curRY.toFixed(2)}deg)
    `;

    const done =
      Math.abs(targetRX - curRX) < 0.05 &&
      Math.abs(targetRY - curRY) < 0.05;

    if (done) {
      curRX = targetRX;
      curRY = targetRY;
      rafId = null;
      if (targetRX === 0 && targetRY === 0) {
        phone.style.transform = '';
      }
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  hero.addEventListener('mousemove', onMove);
  hero.addEventListener('mouseleave', onLeave);
}