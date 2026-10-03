import { h, qs, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { icons } from '../../shared/icons/icons.js';
import { brandsLang } from './brands.lang.js';

// ═══════════════════════════════════════════════════════════
//  State محلی فیچر
// ═══════════════════════════════════════════════════════════
const state = {
  brands:    [],
  counts:    {},   // { brandSlug: count }
  loading:   false,
  error:     false,
  container: null,
};

let offLang = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const brands = {
  register() {
    i18n.register('brands', brandsLang);

    // این مسیر، مسیر موقت products.js را override می‌کند
    router.register('/brands', () => showPage());

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Load
// ═══════════════════════════════════════════════════════════
async function showPage() {
  state.container = qs('#app');
  state.loading = true;
  state.error = false;
  renderPage();

  try {
    const [brandsList, productsRes] = await Promise.all([
      api.brands.list(),
      api.products.list({ limit: 500 }),
    ]);

    state.brands = brandsList || [];

    // شمارش محصولات هر برند
    state.counts = {};
    (productsRes.data || []).forEach(p => {
      const slug = p.brands?.slug;
      if (slug) state.counts[slug] = (state.counts[slug] || 0) + 1;
    });
  } catch (err) {
    console.error('[brands]', err);
    state.error = true;
  }

  state.loading = false;
  renderPage();
}

// ═══════════════════════════════════════════════════════════
//  Render
// ═══════════════════════════════════════════════════════════
function renderPage() {
  if (!state.container) return;

  const page = h('div', { class: 'brands-page' },
    h('div', { class: 'container' },
      PageHeader(),
      state.loading ? LoadingGrid()
        : state.error ? ErrorState()
        : state.brands.length === 0 ? EmptyState()
        : BrandsGrid(),
    ),
  );

  render(state.container, page);
}

function PageHeader() {
  return h('header', { class: 'brands-header' },
    h('h1', { class: 'brands-header__title' }, i18n.t('brands.pageTitle')),
    h('p',  { class: 'brands-header__subtitle' }, i18n.t('brands.pageSubtitle')),
  );
}

function BrandsGrid() {
  return h('div', { class: 'brands-grid' },
    ...state.brands.map(BrandCard),
  );
}

function BrandCard(brand) {
  const name  = i18n.localizeField(brand, 'name');
  const count = state.counts[brand.slug] || 0;

  const countLabel = count === 0
    ? i18n.t('brands.productCountZero')
    : count === 1
      ? i18n.t('brands.productCountOne')
      : i18n.t('brands.productCount', { n: i18n.formatNumber(count) });

  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return h('a', {
    class: `brand-card ${count === 0 ? 'brand-card--empty' : ''}`,
    href: `#/products?brand=${brand.slug}`,
    'aria-label': name,
  },
    h('div', { class: 'brand-card__logo' },
      brand.logo_url
        ? h('img', { src: brand.logo_url, alt: name, loading: 'lazy' })
        : h('span', { class: 'brand-card__initial' }, initial),
    ),
    h('div', { class: 'brand-card__body' },
      h('h3', { class: 'brand-card__name' }, name),
      h('span', { class: 'brand-card__count' }, countLabel),
    ),
    h('span', { class: 'brand-card__arrow', innerHTML: icons.arrowL }),
  );
}

function LoadingGrid() {
  return h('div', { class: 'brands-grid' },
    ...Array.from({ length: 4 }, () =>
      h('div', { class: 'brand-card brand-card--skeleton' },
        h('div', { class: 'skeleton brand-card__skeleton-logo' }),
        h('div', { class: 'brand-card__body' },
          h('div', { class: 'skeleton skeleton--line', style: { width: '60%' } }),
          h('div', { class: 'skeleton skeleton--line', style: { width: '40%', marginTop: '6px' } }),
        ),
      )
    ),
  );
}

function ErrorState() {
  return h('div', { class: 'brands-empty brands-empty--error' },
    h('h3', {}, i18n.t('brands.errorLoad')),
    h('button', {
      class: 'btn btn--accent',
      type: 'button',
      onclick: () => showPage(),
    }, i18n.t('brands.retry')),
  );
}

function EmptyState() {
  return h('div', { class: 'brands-empty' },
    h('h3', {}, i18n.t('brands.empty')),
    h('p',  {}, i18n.t('brands.emptyHint')),
  );
}