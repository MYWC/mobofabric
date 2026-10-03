import { h, qs, qsa, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { store } from '../../core/store.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { icons } from '../../shared/icons/icons.js';
import { comparisonLang } from './comparison.lang.js';

// ═══════════════════════════════════════════════════════════
//  ثابت‌ها
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = 'ps_comparison';
const MAX_ITEMS   = 4;

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  items:      [],       // [slim Product]
  container:  null,
  barVisible: false,
  loading:    false,
};

let offLang = null;
let barEl = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const comparison = {
  register() {
    i18n.register('comparison', comparisonLang);
    router.register('/compare', () => showPage());

    loadFromStorage();

    // تزریق دکمه‌ی مقایسه در کارت محصول
    events.on('product-card:created', ({ el, product }) => injectButton(el, product));

    on(window, 'storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      loadFromStorage();
      if (state.container) renderPage();
    });

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
      refreshAllButtons();
      if (barEl) refreshBar();
    });

    // اگه از قبل آیتم داره، نوار رو نشون بده
    if (state.items.length > 0) mountBar();
  },

  has(id) { return state.items.some(p => p.id === id); },
  count() { return state.items.length; },
  items() { return [...state.items]; },
};

// ═══════════════════════════════════════════════════════════
//  Storage
// ═══════════════════════════════════════════════════════════
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    state.items = Array.isArray(arr) ? arr.filter(p => p && p.id).slice(0, MAX_ITEMS) : [];
  } catch {
    state.items = [];
  }
  broadcast();
}

function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); }
  catch {}
  broadcast();
}

function broadcast() {
  const summary = { items: state.items, count: state.items.length };
  store.set('comparison', summary);
  events.emit('comparison:changed', summary);
}

// ═══════════════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════════════
function toggle(product) {
  if (!product || !product.id) return false;

  const idx = state.items.findIndex(p => p.id === product.id);
  if (idx > -1) {
    state.items.splice(idx, 1);
    saveToStorage();
    toast(i18n.t('comparison.removed'), 'info');
    updateBar();
    if (state.container) renderPage();
    return false;
  }

  if (state.items.length >= MAX_ITEMS) {
    toast(i18n.t('comparison.full'), 'warning');
    return false;
  }

  state.items.push(slim(product));
  saveToStorage();
  toast(i18n.t('comparison.added'), 'success');
  updateBar();
  if (state.container) renderPage();
  return true;
}

function removeById(id) {
  const idx = state.items.findIndex(p => p.id === id);
  if (idx === -1) return;
  state.items.splice(idx, 1);
  saveToStorage();
  updateBar();
  if (state.container) renderPage();
}

function clearAll() {
  state.items = [];
  saveToStorage();
  updateBar();
  if (state.container) renderPage();
}

function slim(p) {
  return {
    id: p.id, slug: p.slug,
    name_fa: p.name_fa, name_en: p.name_en,
    description_fa: p.description_fa,
    description_en: p.description_en,
    cover_url: p.cover_url,
    price: p.price,
    discount_price: p.discount_price ?? null,
    stock: p.stock ?? 0,
    specs: p.specs ?? {},
    brands: p.brands ? {
      slug: p.brands.slug,
      name_fa: p.brands.name_fa,
      name_en: p.brands.name_en,
    } : null,
  };
}

// ═══════════════════════════════════════════════════════════
//  Button injection
// ═══════════════════════════════════════════════════════════
function injectButton(cardEl, product) {
  if (!cardEl || !product || !product.id) return;
  if (qs('.product-card__compare', cardEl)) return;

  const btn = h('button', {
    class: 'product-card__compare',
    type: 'button',
    'aria-label': i18n.t('comparison.add'),
    dataset: { cmpId: product.id },
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const added = toggle(product);
      updateButtonState(btn, added);
    },
  });

  updateButtonState(btn, comparison.has(product.id));

  const media = qs('.product-card__media', cardEl);
  if (media) media.append(btn);
}

function updateButtonState(btn, isActive) {
  btn.innerHTML = icons.compare;
  btn.classList.toggle('is-active', isActive);
  btn.setAttribute('aria-label',
    isActive ? i18n.t('comparison.remove') : i18n.t('comparison.add'));
}

function refreshAllButtons() {
  qsa('[data-cmp-id]').forEach(btn => {
    updateButtonState(btn, comparison.has(btn.dataset.cmpId));
  });
}

// ═══════════════════════════════════════════════════════════
//  Floating Bar
// ═══════════════════════════════════════════════════════════
function mountBar() {
  if (barEl) return;
  barEl = h('div', { class: 'compare-bar', role: 'region', 'aria-label': i18n.t('comparison.barTitle') });
  document.body.append(barEl);
  refreshBar();
}

function unmountBar() {
  if (!barEl) return;
  barEl.remove();
  barEl = null;
}

function updateBar() {
  if (state.items.length === 0) {
    unmountBar();
    return;
  }
  mountBar();
  refreshBar();
}

function refreshBar() {
  if (!barEl) return;

  const thumbs = state.items.map(p => {
    const name = i18n.localizeField(p, 'name');
    return h('div', { class: 'compare-bar__thumb', dataset: { id: p.id } },
      h('img', { src: p.cover_url, alt: name, loading: 'lazy' }),
      h('button', {
        class: 'compare-bar__thumb-remove',
        type: 'button',
        'aria-label': i18n.t('comparison.remove'),
        onclick: (e) => { e.stopPropagation(); removeById(p.id); },
      }, '×'),
    );
  });

  const canCompare = state.items.length >= 2;

  const content = h('div', { class: 'compare-bar__inner' },
    h('div', { class: 'compare-bar__label' },
      h('span', { class: 'compare-bar__count' },
        i18n.t('comparison.barCount', { n: i18n.formatNumber(state.items.length) })),
    ),
    h('div', { class: 'compare-bar__thumbs' }, ...thumbs),
    h('div', { class: 'compare-bar__actions' },
      h('button', {
        class: 'btn btn--ghost btn--sm',
        type: 'button',
        onclick: clearAll,
      }, i18n.t('comparison.clear')),
      h('a', {
        class: `btn btn--accent ${!canCompare ? 'is-disabled' : ''}`,
        href: canCompare ? '#/compare' : 'javascript:void(0)',
        onclick: (e) => {
          if (!canCompare) {
            e.preventDefault();
            toast(i18n.t('comparison.minReached'), 'warning');
          }
        },
      }, i18n.t('comparison.compareNow')),
    ),
  );

  render(barEl, content);
  requestAnimationFrame(() => barEl.classList.add('is-visible'));
}

// ═══════════════════════════════════════════════════════════
//  Compare Page
// ═══════════════════════════════════════════════════════════
function showPage() {
  state.container = qs('#app');
  renderPage();
}

function renderPage() {
  if (!state.container) return;
  const isEmpty = state.items.length === 0;

  const page = h('div', { class: 'cmp-page' },
    h('div', { class: 'container' },
      Header(isEmpty),
      isEmpty ? EmptyState() : CompareTable(),
    ),
  );

  render(state.container, page);
}

function Header(isEmpty) {
  const n = state.items.length;
  return h('header', { class: 'cmp-header' },
    h('div', {},
      h('h1', { class: 'cmp-header__title' }, i18n.t('comparison.title')),
      !isEmpty ? h('p', { class: 'cmp-header__subtitle' },
        i18n.t('comparison.subtitle', { n: i18n.formatNumber(n) })) : null,
    ),
    !isEmpty
      ? h('button', {
          class: 'btn btn--ghost',
          type: 'button',
          onclick: clearAll,
        }, i18n.t('comparison.clearAll'))
      : null,
  );
}

function EmptyState() {
  return h('div', { class: 'cmp-empty' },
    h('div', { class: 'cmp-empty__icon', innerHTML: icons.compare }),
    h('h2', {}, i18n.t('comparison.empty')),
    h('p',  {}, i18n.t('comparison.emptyHint')),
    h('a', { class: 'btn btn--accent', href: '#/products' }, i18n.t('comparison.emptyCta')),
  );
}

function CompareTable() {
  const items = state.items;
  const allSpecKeys = collectSpecKeys(items);
  const rows = [];

  // ── ردیف تصویر ──
  rows.push(RowLabel(i18n.t('comparison.image')));
  rows.push(h('tr', { class: 'cmp-row cmp-row--media' },
    h('th', { class: 'cmp-cell cmp-cell--label' }, i18n.t('comparison.image')),
    ...items.map(p => h('td', { class: 'cmp-cell', dataset: { id: p.id } },
      h('a', { href: `#/product/${p.slug}`, class: 'cmp-media' },
        h('img', { src: p.cover_url, alt: '', loading: 'lazy' }),
      ),
    )),
  ));

  // ── نام ──
  rows.push(h('tr', { class: 'cmp-row' },
    h('th', { class: 'cmp-cell cmp-cell--label' }, i18n.t('comparison.name')),
    ...items.map(p => h('td', { class: 'cmp-cell' },
      h('a', { href: `#/product/${p.slug}`, class: 'cmp-name' },
        i18n.localizeField(p, 'name')),
    )),
  ));

  // ── برند ──
  rows.push(h('tr', { class: 'cmp-row' },
    h('th', { class: 'cmp-cell cmp-cell--label' }, i18n.t('comparison.brand')),
    ...items.map(p => h('td', { class: 'cmp-cell' },
      p.brands
        ? h('a', { href: `#/products?brand=${p.brands.slug}`, class: 'cmp-brand' },
            i18n.localizeField(p.brands, 'name'))
        : '—',
    )),
  ));

  // ── قیمت ──
  rows.push(h('tr', { class: 'cmp-row' },
    h('th', { class: 'cmp-cell cmp-cell--label' }, i18n.t('comparison.price')),
    ...items.map(p => {
      const hasDiscount = p.discount_price && p.discount_price < p.price;
      const current = hasDiscount ? p.discount_price : p.price;
      const percent = hasDiscount
        ? Math.round((1 - p.discount_price / p.price) * 100) : 0;
      return h('td', { class: 'cmp-cell' },
        h('div', { class: 'cmp-price' },
          h('span', { class: `cmp-price__current ${hasDiscount ? 'is-discount' : ''}` },
            i18n.formatPrice(current)),
          hasDiscount ? h('span', { class: 'cmp-price__old' }, i18n.formatPrice(p.price)) : null,
          hasDiscount ? h('span', { class: 'cmp-price__badge' },
            i18n.t('comparison.discount', { percent: i18n.formatNumber(percent) })) : null,
        ),
      );
    }),
  ));

  // ── موجودی ──
  rows.push(h('tr', { class: 'cmp-row' },
    h('th', { class: 'cmp-cell cmp-cell--label' }, i18n.t('comparison.stock')),
    ...items.map(p => {
      const inStock = (p.stock ?? 0) > 0;
      return h('td', { class: 'cmp-cell' },
        h('span', { class: `cmp-stock ${inStock ? 'is-ok' : 'is-out'}` },
          inStock ? i18n.t('comparison.inStock') : i18n.t('comparison.outOfStock')),
      );
    }),
  ));

  // ── مشخصات فنی ──
  for (const key of allSpecKeys) {
    const labelKey = `productDetail.specKeys.${key}`;
    const label = i18n.t(labelKey);
    rows.push(h('tr', { class: 'cmp-row' },
      h('th', { class: 'cmp-cell cmp-cell--label' },
        label === labelKey ? key : label),
      ...items.map(p => {
        const v = p.specs?.[key];
        return h('td', { class: 'cmp-cell' },
          v != null && v !== '' ? String(v) : h('span', { class: 'cmp-muted' }, i18n.t('comparison.empty_spec')));
      }),
    ));
  }

  // ── اکشن‌ها ──
  rows.push(h('tr', { class: 'cmp-row cmp-row--actions' },
    h('th', { class: 'cmp-cell cmp-cell--label' }, ''),
    ...items.map(p => h('td', { class: 'cmp-cell' },
      h('div', { class: 'cmp-actions' },
        h('a', {
          class: 'btn btn--accent btn--sm',
          href: `#/product/${p.slug}`,
        }, i18n.t('comparison.viewProduct')),
        h('button', {
          class: 'btn btn--ghost btn--sm',
          type: 'button',
          onclick: () => removeById(p.id),
        }, i18n.t('comparison.removeItem')),
      ),
    )),
  ));

  return h('div', { class: 'cmp-table-wrap' },
    h('table', { class: 'cmp-table' },
      h('tbody', {}, ...rows),
    ),
  );
}

function RowLabel(text) {
  return h('tr', { class: 'cmp-row cmp-row--label-only' },
    h('td', { class: 'cmp-cell cmp-cell--label', colspan: '99' }, text),
  );
}

function collectSpecKeys(items) {
  const set = new Set();
  items.forEach(p => {
    if (p.specs && typeof p.specs === 'object') {
      Object.keys(p.specs).forEach(k => set.add(k));
    }
  });
  return [...set];
}

// ═══════════════════════════════════════════════════════════
//  Toast
// ═══════════════════════════════════════════════════════════
function toast(message, type = 'info') {
  events.emit('toast:show', { type, message });
}