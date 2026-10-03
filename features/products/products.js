import { h, qs, on, render, html } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { CONFIG } from '../../core/config.js';
import { ProductCard } from '../../shared/components/product-card/product-card.js';
import { Skeleton } from '../../shared/components/skeleton/skeleton.js';
import { productsLang } from './products.lang.js';

// ═══════════════════════════════════════════════════════════
//  State محلی فیچر
// ═══════════════════════════════════════════════════════════
const state = {
  products: [],
  brands:   [],
  total:    0,
  page:     1,
  brand:    '',
  sort:     'newest',
  search:   '',
  loading:  false,
  error:    false,
  container: null,
};

let offLang = null;

// ═══════════════════════════════════════════════════════════
//  Public — تنها API فیچر
// ═══════════════════════════════════════════════════════════
export const products = {
  register() {
    i18n.register('products', productsLang);

    // ── روتر ──
    router.register('/', (params, query) => showHome(query));
    router.register('/products', (params, query) => showHome(query));
    router.register('/brands', () => showHome({}));   // تا فاز 4، موقت

    // ── گوش دادن به تغییر زبان ──
    offLang = events.on('lang:changed', () => {
      if (state.container) renderInto(state.container);
    });
  },

  async load() {
    state.loading = true;
    state.error = false;
    renderInto(state.container);

    try {
      const [brandsRes, productsRes] = await Promise.all([
        api.brands.list(),
        api.products.list({
          brand:  state.brand,
          search: state.search,
          sort:   state.sort,
          page:   state.page,
        }),
      ]);
      state.brands   = brandsRes;
      state.products = state.page === 1
        ? productsRes.data
        : [...state.products, ...productsRes.data];
      state.total = productsRes.count;
    } catch (err) {
      state.error = true;
    } finally {
      state.loading = false;
      renderInto(state.container);
    }
  },
};

// ═══════════════════════════════════════════════════════════
//  Handlers
// ═══════════════════════════════════════════════════════════
function showHome(query = {}) {
  state.brand  = query.brand ?? '';
  state.sort   = query.sort ?? 'newest';
  state.search = query.q ?? '';
  state.page   = 1;
  state.products = [];

  // اجازه بده روتر کار خودش را بکند، بعد رندر کنیم
  requestAnimationFrame(() => {
    const main = qs('#app');
    render(main, ProductsPage());
    state.container = main;
    products.load();
  });
}

function renderInto(main) {
  // جایگزینی بخش محصولات، بدون دست زدن به هدر/فوتر
  const old = qs('.products-root', main);
  if (!old) return;

  const fresh = ProductsRoot();
  old.replaceWith(fresh);

  // دوباره ترجمه‌ها را اعمال کن
  i18n.applyToDOM(main);
}

// ═══════════════════════════════════════════════════════════
//  Views
// ═══════════════════════════════════════════════════════════
function ProductsPage() {
  return h('div', { class: 'products-page' },
    Hero(),
    h('div', { class: 'container' }, ProductsRoot()),
  );
}

function Hero() {
  return h('section', { class: 'hero' },
    h('div', { class: 'container hero__inner' },
      h('h1', { class: 'hero__title', 'data-i18n': 'products.heroTitle' }, i18n.t('products.heroTitle')),
      h('p',  { class: 'hero__subtitle', 'data-i18n': 'products.heroSubtitle' }, i18n.t('products.heroSubtitle')),
      h('a',  { class: 'btn btn--accent hero__cta', href: '#products' },
        h('span', { 'data-i18n': 'products.heroCta' }, i18n.t('products.heroCta')),
      ),
    ),
  );
}

function ProductsRoot() {
  const root = h('section', { class: 'products-root' });

  // ── نوار فیلتر و مرتب‌سازی ──
  root.append(Toolbar());

  // ── بدنه: loading / error / empty / grid ──
  if (state.loading && state.products.length === 0) {
    const grid = h('div', { class: 'products-grid' }, ...Skeleton.grid(8));
    root.append(grid);
  } else if (state.error && state.products.length === 0) {
    root.append(ErrorState());
  } else if (!state.loading && state.products.length === 0) {
    root.append(EmptyState());
  } else {
    const grid = h('div', { class: 'products-grid' },
      ...state.products.map(p => ProductCard(p)),
    );
    root.append(grid);

    // ── Load more ──
    if (state.products.length < state.total) {
      root.append(
        h('div', { class: 'products-more' },
          h('button', { class: 'btn btn--ghost', onclick: loadMore },
            h('span', { 'data-i18n': 'products.loadMore' }, i18n.t('products.loadMore')),
          ),
        ),
      );
    }
  }

  return root;
}

function Toolbar() {
  return h('div', { class: 'toolbar' },
    // ── فیلتر برند ──
    h('div', { class: 'toolbar__group' },
      h('span', { class: 'toolbar__label', 'data-i18n': 'products.filterBrand' }, i18n.t('products.filterBrand')),
      h('div', { class: 'chips' },
        chip(i18n.t('products.filterAll'), '', state.brand === ''),
        ...state.brands.map(b => {
          const name = i18n.localizeField(b, 'name');
          return chip(name, b.slug, state.brand === b.slug);
        }),
      ),
    ),

    // ── مرتب‌سازی ──
    h('div', { class: 'toolbar__group' },
      h('span', { class: 'toolbar__label', 'data-i18n': 'products.sortLabel' }, i18n.t('products.sortLabel')),
      sortSelect(),
    ),
  );
}

function chip(label, value, active) {
  return h('button', {
    class: `chip ${active ? 'chip--active' : ''}`,
    type: 'button',
    onclick: () => setBrand(value),
  }, label);
}

function sortSelect() {
  const sel = h('select', { class: 'input toolbar__select', onchange: (e) => setSort(e.target.value) });
  const options = [
    ['newest',     'products.sortNewest'],
    ['price_asc',  'products.sortPriceAsc'],
    ['price_desc', 'products.sortPriceDesc'],
  ];
  for (const [val, key] of options) {
    const opt = h('option', { value: val }, i18n.t(key));
    if (state.sort === val) opt.selected = true;
    sel.append(opt);
  }
  return sel;
}

function EmptyState() {
  return h('div', { class: 'empty-state' },
    h('h3', { 'data-i18n': 'products.noResults' }, i18n.t('products.noResults')),
    h('p',  { 'data-i18n': 'products.noResultsHint' }, i18n.t('products.noResultsHint')),
  );
}

function ErrorState() {
  return h('div', { class: 'empty-state empty-state--error' },
    h('h3', { 'data-i18n': 'products.errorLoading' }, i18n.t('products.errorLoading')),
    h('button', {
      class: 'btn btn--accent',
      onclick: () => products.load(),
    }, i18n.t('products.retry')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════════════
function setBrand(slug) {
  state.brand = slug;
  state.page = 1;
  state.products = [];
  const q = new URLSearchParams();
  if (slug) q.set('brand', slug);
  if (state.sort !== 'newest') q.set('sort', state.sort);
  const search = q.toString() ? `?${q}` : '';
  history.replaceState(null, '', `#/products${search}`);
  products.load();
}

function setSort(value) {
  state.sort = value;
  state.page = 1;
  state.products = [];
  const q = new URLSearchParams();
  if (state.brand) q.set('brand', state.brand);
  if (value !== 'newest') q.set('sort', value);
  const search = q.toString() ? `?${q}` : '';
  history.replaceState(null, '', `#/products${search}`);
  products.load();
}

function loadMore() {
  state.page += 1;
  products.load();
}