import { h, qs, qsa, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { store } from '../../core/store.js';
import { i18n } from '../../core/i18n.js';
import { router } from '../../core/router.js';
import { CONFIG } from '../../core/config.js';
import { icons } from '../../shared/icons/icons.js';
import { ProductCard } from '../../shared/components/product-card/product-card.js';
import { favoritesLang } from './favorites.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = 'ps_favorites';

const state = {
  items:     [],     // [Product, ...]
  container: null,
  confirmOpen: false,
};

let offLang = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const favorites = {
  register() {
    i18n.register('favorites', favoritesLang);
    router.register('/favorites', () => showPage());

    loadFromStorage();

    // به کارت‌های محصول گوش می‌ده و قلب تزریق می‌کنه
    events.on('product-card:created', ({ el, product }) => injectHeart(el, product));

    // هم‌گام‌سازی بین تب‌ها
    on(window, 'storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      loadFromStorage();
      if (state.container) renderPage();
    });

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
      refreshAllHearts();
    });
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
    state.items = Array.isArray(arr) ? arr.filter(p => p && p.id) : [];
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
  store.set('favorites', summary);
  events.emit('favorites:changed', summary);
}

// ═══════════════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════════════
function toggle(product) {
  const idx = state.items.findIndex(p => p.id === product.id);
  if (idx > -1) {
    state.items.splice(idx, 1);
    saveToStorage();
    toast(i18n.t('favorites.removed'), 'info');
    if (state.container) renderPage();
    return false;
  }
  // فقط فیلدهای لازم برای نمایش رو ذخیره کن
  state.items.unshift(slim(product));
  saveToStorage();
  toast(i18n.t('favorites.added'), 'success');
  if (state.container) renderPage();
  return true;
}

function slim(p) {
  return {
    id: p.id, slug: p.slug,
    name_fa: p.name_fa, name_en: p.name_en,
    cover_url: p.cover_url,
    price: p.price, discount_price: p.discount_price ?? null,
    stock: p.stock ?? 0,
    brands: p.brands ? {
      slug: p.brands.slug,
      name_fa: p.brands.name_fa,
      name_en: p.brands.name_en,
    } : null,
  };
}

function clearAll() {
  state.items = [];
  saveToStorage();
  toast(i18n.t('favorites.cleared'), 'info');
  if (state.container) renderPage();
}

function addAllToCart() {
  if (state.items.length === 0) return;
  state.items.forEach(p => {
    if ((p.stock ?? 0) > 0) {
      events.emit('cart:add', { product: p, qty: 1 });
    }
  });
  toast(i18n.t('favorites.allAdded'), 'success');
}

// ═══════════════════════════════════════════════════════════
//  Heart injection on ProductCard
// ═══════════════════════════════════════════════════════════
function injectHeart(cardEl, product) {
  if (!cardEl || !product || !product.id) return;
  if (qs('.product-card__heart', cardEl)) return;

  const btn = h('button', {
    class: 'product-card__heart',
    type: 'button',
    'aria-label': i18n.t('favorites.add'),
    dataset: { favId: product.id },
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const added = toggle(product);
      updateHeartState(btn, added);
    },
  });

  updateHeartState(btn, favorites.has(product.id));

  // داخل media قرار بگیره
  const media = qs('.product-card__media', cardEl);
  if (media) media.append(btn);
}

function updateHeartState(btn, isActive) {
  btn.innerHTML = isActive ? icons.heartFilled : icons.heart;
  btn.classList.toggle('is-active', isActive);
  btn.setAttribute('aria-label',
    isActive ? i18n.t('favorites.remove') : i18n.t('favorites.add'));
}

function refreshAllHearts() {
  qsa('[data-fav-id]').forEach(btn => {
    updateHeartState(btn, favorites.has(btn.dataset.favId));
  });
}

// ═══════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════
function showPage() {
  state.container = qs('#app');
  renderPage();
}

function renderPage() {
  if (!state.container) return;
  const isEmpty = state.items.length === 0;

  const page = h('div', { class: 'fav-page' },
    h('div', { class: 'container' },
      Header(isEmpty),
      isEmpty ? EmptyState() : Grid(),
    ),
    state.confirmOpen ? ConfirmModal() : null,
  );

  render(state.container, page);
}

function Header(isEmpty) {
  const n = state.items.length;
  const sub = n === 1
    ? i18n.t('favorites.subtitleOne')
    : i18n.t('favorites.subtitle', { n: i18n.formatNumber(n) });

  return h('header', { class: 'fav-header' },
    h('div', {},
      h('h1', { class: 'fav-header__title' }, i18n.t('favorites.title')),
      !isEmpty ? h('p', { class: 'fav-header__subtitle' }, sub) : null,
    ),
    !isEmpty
      ? h('div', { class: 'fav-header__actions' },
          h('button', {
            class: 'btn btn--accent',
            type: 'button',
            onclick: addAllToCart,
          }, i18n.t('favorites.addAllToCart')),
          h('button', {
            class: 'btn btn--ghost',
            type: 'button',
            onclick: () => { state.confirmOpen = true; renderPage(); },
          }, i18n.t('favorites.clearAll')),
        )
      : null,
  );
}

function Grid() {
  return h('div', { class: 'products-grid fav-grid' },
    ...state.items.map(p => ProductCard(p)),
  );
}

function EmptyState() {
  return h('div', { class: 'fav-empty' },
    h('div', { class: 'fav-empty__icon', innerHTML: icons.heartFilled }),
    h('h2', {}, i18n.t('favorites.empty')),
    h('p',  {}, i18n.t('favorites.emptyHint')),
    h('a', { class: 'btn btn--accent', href: '#/products' }, i18n.t('favorites.emptyCta')),
  );
}

function ConfirmModal() {
  const overlay = h('div', { class: 'modal-overlay', onclick: closeConfirm });
  const modal = h('div', {
    class: 'modal',
    onclick: e => e.stopPropagation(),
    role: 'dialog', 'aria-modal': 'true',
  },
    h('h3', { class: 'modal__title' }, i18n.t('favorites.confirmClear')),
    h('div', { class: 'modal__actions' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: closeConfirm },
        i18n.t('favorites.confirmNo')),
      h('button', {
        class: 'btn btn--accent', type: 'button',
        onclick: () => { closeConfirm(); clearAll(); },
      }, i18n.t('favorites.confirmYes')),
    ),
  );
  overlay.append(modal);
  return overlay;
}

function closeConfirm() { state.confirmOpen = false; renderPage(); }

// ═══════════════════════════════════════════════════════════
//  Toast
// ═══════════════════════════════════════════════════════════
function toast(message, type = 'info') {
  events.emit('toast:show', { type, message });
}