import { h, qs, qsa, on, render, html } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { store } from '../../core/store.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { CONFIG } from '../../core/config.js';
import { icons } from '../../shared/icons/icons.js';
import { cartLang } from './cart.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  items:        [],
  container:    null,
  confirmOpen:  false,
  checkoutOpen: false,
};

let offLang = null;

const STORAGE_KEY = CONFIG.storageKeys.cart;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const cart = {
  register() {
    i18n.register('cart', cartLang);
    router.register('/cart', () => showCart());

    loadFromStorage();

    events.on('cart:add',    onAdd);
    events.on('cart:remove', onRemoveEvent);
    events.on('cart:update', onUpdateEvent);
    events.on('cart:clear',  () => clearCart(true));

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
    });

    on(window, 'storage', (e) => {
      if (e.key === STORAGE_KEY) {
        loadFromStorage();
        if (state.container) renderPage();
      }
    });

    // ← فاز ۱۰: وقتی کد تخفیف اعمال/حذف شد، خلاصه سفارش را دوباره رندر کن
    events.on('discount:changed', () => {
      if (state.container) updateSummary();
    });
  },

  count() { return state.items.reduce((s, i) => s + i.qty, 0); },
  total() { return state.items.reduce((s, i) => s + effectivePrice(i) * i.qty, 0); },
  items() { return [...state.items]; },
};

// ═══════════════════════════════════════════════════════════
//  Storage
// ═══════════════════════════════════════════════════════════
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    state.items = Array.isArray(parsed) ? parsed.filter(isValidItem) : [];
  } catch (err) {
    console.warn('[cart] corrupted storage, resetting', err);
    state.items = [];
  }
  broadcast();
}

function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); }
  catch (err) { console.warn('[cart] failed to save', err); }
  broadcast();
}

function broadcast() {
  const summary = { items: state.items, count: cart.count(), total: cart.total() };
  store.set('cart', summary);
  events.emit('cart:changed', summary);
}

function isValidItem(item) {
  return item && item.id && typeof item.qty === 'number' && item.qty > 0;
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════
function effectivePrice(item) {
  return item.discount_price && item.discount_price < item.price
    ? item.discount_price
    : item.price;
}

function unitDiscount(item) {
  return item.discount_price && item.discount_price < item.price
    ? item.price - item.discount_price
    : 0;
}

function toCartItem(product) {
  return {
    id:               product.id,
    slug:             product.slug,
    name_fa:          product.name_fa,
    name_en:          product.name_en,
    cover_url:        product.cover_url,
    price:            product.price,
    discount_price:   product.discount_price ?? null,
    stock:            product.stock ?? 0,
    brandSlug:        product.brands?.slug ?? '',
    brandName_fa:     product.brands?.name_fa ?? '',
    brandName_en:     product.brands?.name_en ?? '',
    qty:              1,
  };
}

function findIndex(id) {
  return state.items.findIndex(i => i.id === id);
}

// ← فاز ۱۰: محاسبه تخفیف کد بر اساس مبنا (بعد از تخفیف محصولات)
function computeCodeDiscount(base) {
  const d = store.get('discount');
  if (!d || !d.active) return 0;
  if (base < (d.min_order_amount ?? 0)) return 0;

  let amount;
  if (d.type === 'percent') {
    amount = Math.floor(base * d.value / 100);
    if (d.max_discount) amount = Math.min(amount, d.max_discount);
  } else {
    amount = d.value;
  }
  return Math.min(amount, base);
}

// ═══════════════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════════════
function onAdd({ product, qty = 1 } = {}) {
  if (!product || !product.id) return;
  const idx = findIndex(product.id);
  const stock = product.stock ?? 0;

  if (stock <= 0) {
    toast(i18n.t('cart.qtyLimit'), 'warning');
    return;
  }

  if (idx > -1) {
    const nextQty = state.items[idx].qty + qty;
    if (nextQty > stock) {
      state.items[idx].qty = stock;
      toast(i18n.t('cart.qtyLimit'), 'warning');
    } else {
      state.items[idx].qty = nextQty;
    }
  } else {
    const item = toCartItem(product);
    item.qty = Math.min(qty, stock);
    state.items.push(item);
  }

  saveToStorage();

  const name = i18n.localizeField(product, 'name');
  toast(i18n.t('cart.addedQty', { name, n: i18n.formatNumber(qty) }), 'success');

  if (state.container) renderPage();
}

function onRemoveEvent({ productId } = {}) { removeItem(productId); }
function onUpdateEvent({ productId, qty } = {}) { setQty(productId, qty); }

function removeItem(id) {
  const idx = findIndex(id);
  if (idx === -1) return;
  state.items.splice(idx, 1);
  saveToStorage();
  toast(i18n.t('cart.removed'), 'info');
  if (state.container) renderPage();
}

function setQty(id, qty) {
  const idx = findIndex(id);
  if (idx === -1) return;
  const item = state.items[idx];
  const stock = item.stock ?? 0;

  if (qty < 1) { removeItem(id); return; }
  if (qty > stock) {
    state.items[idx].qty = stock;
    toast(i18n.t('cart.qtyLimit'), 'warning');
  } else {
    state.items[idx].qty = qty;
  }

  saveToStorage();
  if (state.container) renderPage();
}

function increment(id) {
  const idx = findIndex(id);
  if (idx === -1) return;
  const item = state.items[idx];
  if (item.qty >= (item.stock ?? 0)) {
    toast(i18n.t('cart.qtyLimit'), 'warning');
    return;
  }
  item.qty += 1;
  saveToStorage();
  updateItemRow(id);
  updateSummary();
}

function decrement(id) {
  const idx = findIndex(id);
  if (idx === -1) return;
  const item = state.items[idx];
  if (item.qty <= 1) return;
  item.qty -= 1;
  saveToStorage();
  updateItemRow(id);
  updateSummary();
}

function clearCart(showToast = false) {
  if (state.items.length === 0) return;
  state.items = [];
  saveToStorage();
  if (showToast) toast(i18n.t('cart.cleared'), 'info');
  if (state.container) renderPage();
}

// ═══════════════════════════════════════════════════════════
//  Page Rendering
// ═══════════════════════════════════════════════════════════
function showCart() {
  state.container = qs('#app');
  renderPage();
}

function renderPage() {
  if (!state.container) return;

  const isEmpty = state.items.length === 0;

  const page = h('div', { class: 'cart-page' },
    h('div', { class: 'container' },
      Header(isEmpty),
      isEmpty ? EmptyState() : Layout(),
    ),
    state.confirmOpen  ? ConfirmModal()  : null,
    state.checkoutOpen ? CheckoutModal() : null,
  );

  render(state.container, page);

  requestAnimationFrame(() => {
    wirePage();
    // ← فاز ۱۰: اطلاع به discounts.js که خلاصه رندر شد
    if (!isEmpty) {
      const aside = qs('.cart-aside', state.container);
      if (aside) events.emit('cart:summary:rendered', { aside });
    }
  });
}

function Header(isEmpty) {
  const count = cart.count();
  const countLabel = count === 1
    ? i18n.t('cart.itemsCountOne')
    : i18n.t('cart.itemsCount', { n: i18n.formatNumber(count) });

  return h('header', { class: 'cart-header' },
    h('h1', { class: 'cart-header__title' }, i18n.t('cart.pageTitle')),
    !isEmpty
      ? h('div', { class: 'cart-header__meta' },
          h('span', { class: 'cart-header__count' }, countLabel),
          h('button', {
            class: 'cart-header__clear',
            type: 'button',
            onclick: openConfirm,
          }, i18n.t('cart.clearCart')),
        )
      : null,
  );
}

function Layout() {
  return h('div', { class: 'cart-layout' },
    h('section', { class: 'cart-list', 'aria-label': 'cart items' },
      ...state.items.map(ItemRow),
    ),
    Aside(),
  );
}

function ItemRow(item) {
  const name  = i18n.localizeField(item, 'name');
  const brand = i18n.localizeField({ name_fa: item.brandName_fa, name_en: item.brandName_en }, 'name');
  const unit  = effectivePrice(item);
  const lineTotal = unit * item.qty;
  const stock = item.stock ?? 0;
  const lowStock = stock > 0 && stock <= 5;

  return h('article', { class: 'cart-item', dataset: { id: item.id } },
    h('a', { class: 'cart-item__media', href: `#/product/${item.slug}` },
      h('img', { src: item.cover_url, alt: name, loading: 'lazy' })),

    h('div', { class: 'cart-item__info' },
      brand
        ? h('a', { class: 'cart-item__brand', href: `#/products?brand=${item.brandSlug}` }, brand)
        : null,
      h('a', { class: 'cart-item__title', href: `#/product/${item.slug}` }, name),
      h('div', { class: 'cart-item__unit' },
        h('span', { class: 'cart-item__unit-label' }, i18n.t('cart.unitPrice')),
        h('span', { class: 'cart-item__unit-value' }, i18n.formatPrice(unit)),
      ),
      h('div', { class: 'cart-item__stock' },
        h('span', {
          class: `cart-item__stock-badge ${stock <= 0 ? 'is-out' : lowStock ? 'is-low' : 'is-ok'}`,
        }, stock <= 0
          ? i18n.t('cart.outOfStock')
          : lowStock
            ? i18n.t('cart.lowStock', { n: i18n.formatNumber(stock) })
            : i18n.t('cart.inStock')
        ),
      ),
    ),

    h('div', { class: 'cart-item__controls' },
      QtyStepper(item),
      h('div', { class: 'cart-item__price' }, i18n.formatPrice(lineTotal)),
      h('button', {
        class: 'cart-item__remove',
        type: 'button',
        'aria-label': i18n.t('cart.remove'),
        dataset: { action: 'remove', id: item.id },
        innerHTML: icons.close,
      }),
    ),
  );
}

function QtyStepper(item) {
  const canInc = item.qty < (item.stock ?? 0);
  const canDec = item.qty > 1;

  return h('div', { class: 'qty', role: 'group', 'aria-label': i18n.t('cart.qty') },
    h('button', {
      class: 'qty__btn', type: 'button',
      'aria-label': i18n.t('cart.decrease'),
      disabled: !canDec,
      dataset: { action: 'dec', id: item.id },
    }, '−'),
    h('span', { class: 'qty__value', 'aria-live': 'polite' },
      i18n.formatNumber(item.qty)),
    h('button', {
      class: 'qty__btn', type: 'button',
      'aria-label': i18n.t('cart.increase'),
      disabled: !canInc,
      dataset: { action: 'inc', id: item.id },
    }, '+'),
  );
}

function Aside() {
  const subtotal = state.items.reduce((s, i) => s + i.price * i.qty, 0);
  const productDiscount = state.items.reduce((s, i) => s + unitDiscount(i) * i.qty, 0);
  const afterProductDiscount = subtotal - productDiscount;

  // ← فاز ۱۰: تخفیف کد
  const codeDiscount = computeCodeDiscount(afterProductDiscount);

  const shipping = 0;
  const payable  = afterProductDiscount - codeDiscount + shipping;
  const hasProductDiscount = productDiscount > 0;
  const hasCodeDiscount    = codeDiscount > 0;
  const isEmpty = state.items.length === 0;

  return h('aside', { class: 'cart-aside' },
    h('div', { class: 'cart-summary' },
      h('h2', { class: 'cart-summary__title' }, i18n.t('cart.summary')),

      // ← فاز ۱۰: اسلاتی که discounts.js محتوایش را پر می‌کند
      h('div', { class: 'cart-summary__discount-slot' }),

      h('dl', { class: 'cart-summary__rows' },
        Row(i18n.t('cart.subtotal'), i18n.formatPrice(subtotal)),
        hasProductDiscount
          ? Row(i18n.t('cart.discount'), `− ${i18n.formatPrice(productDiscount)}`, 'is-discount')
          : null,
        hasCodeDiscount
          ? Row(i18n.t('discounts.codeDiscountLabel'), `− ${i18n.formatPrice(codeDiscount)}`, 'is-discount')
          : null,
        Row(i18n.t('cart.shipping'), i18n.t('cart.shippingFree'), 'is-success'),
      ),

      h('div', { class: 'cart-summary__total' },
        h('span', {}, i18n.t('cart.total')),
        h('strong', {}, i18n.formatPrice(payable)),
      ),

      (hasProductDiscount || hasCodeDiscount)
        ? h('p', { class: 'cart-summary__savings' },
            i18n.t('cart.savings', {
              amount: i18n.formatPrice(productDiscount + codeDiscount),
            }))
        : null,

      h('div', { class: 'cart-summary__actions' },
        h('button', {
          class: 'btn btn--accent btn--block cart-summary__checkout',
          type: 'button',
          disabled: isEmpty,
          onclick: openCheckout,
        }, i18n.t('cart.checkout')),

        h('a', {
          class: 'btn btn--ghost btn--block cart-summary__continue',
          href: '#/products',
        }, i18n.t('cart.continueShopping')),
      ),
    ),
  );
}

function Row(label, value, mod = '') {
  return h('div', { class: `cart-summary__row ${mod ? `cart-summary__row--${mod}` : ''}` },
    h('dt', {}, label),
    h('dd', {}, value),
  );
}

function EmptyState() {
  return h('div', { class: 'cart-empty' },
    h('div', { class: 'cart-empty__icon', innerHTML: icons.cart }),
    h('h2', {}, i18n.t('cart.empty')),
    h('p',  {}, i18n.t('cart.emptyHint')),
    h('a', { class: 'btn btn--accent', href: '#/products' }, i18n.t('cart.emptyCta')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Partial Updates
// ═══════════════════════════════════════════════════════════
function updateItemRow(id) {
  const item = state.items.find(i => i.id === id);
  const row  = qs(`.cart-item[data-id="${id}"]`);
  if (!item || !row) return;

  const qtyEl   = qs('.qty__value', row);
  const priceEl = qs('.cart-item__price', row);
  const decBtn  = qs('[data-action="dec"]', row);
  const incBtn  = qs('[data-action="inc"]', row);

  if (qtyEl)   qtyEl.textContent = i18n.formatNumber(item.qty);
  if (priceEl) priceEl.textContent = i18n.formatPrice(effectivePrice(item) * item.qty);
  if (decBtn)  decBtn.disabled = item.qty <= 1;
  if (incBtn)  incBtn.disabled = item.qty >= (item.stock ?? 0);
}

function updateSummary() {
  const aside = qs('.cart-aside');
  if (!aside) return;
  const fresh = Aside();
  aside.replaceWith(fresh);
  // ← فاز ۱۰: اطلاع به discounts.js برای تزریق مجدد
  events.emit('cart:summary:rendered', { aside: fresh });
}

// ═══════════════════════════════════════════════════════════
//  Modals
// ═══════════════════════════════════════════════════════════
function ConfirmModal() {
  const overlay = h('div', { class: 'modal-overlay', onclick: closeConfirm });
  const modal = h('div', { class: 'modal', onclick: e => e.stopPropagation(), role: 'dialog', 'aria-modal': 'true' },
    h('h3', { class: 'modal__title' }, i18n.t('cart.confirmClear')),
    h('div', { class: 'modal__actions' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: closeConfirm },
        i18n.t('cart.confirmClearNo')),
      h('button', {
        class: 'btn btn--accent', type: 'button',
        onclick: () => { closeConfirm(); clearCart(true); },
      }, i18n.t('cart.confirmClearYes')),
    ),
  );
  overlay.append(modal);
  return overlay;
}

function CheckoutModal() {
  const subtotal = state.items.reduce((s, i) => s + i.price * i.qty, 0);
  const productDiscount = state.items.reduce((s, i) => s + unitDiscount(i) * i.qty, 0);
  const afterProductDiscount = subtotal - productDiscount;
  const codeDiscount = computeCodeDiscount(afterProductDiscount);
  const total = afterProductDiscount - codeDiscount;

  const overlay = h('div', { class: 'modal-overlay', onclick: closeCheckout });
  const modal = h('div', { class: 'modal modal--checkout', onclick: e => e.stopPropagation(), role: 'dialog', 'aria-modal': 'true' },
    h('h3', { class: 'modal__title' }, i18n.t('cart.checkoutTitle')),
    h('p', { class: 'modal__hint' }, i18n.t('cart.checkoutHint')),
    h('div', { class: 'modal__total' },
      h('span', {}, i18n.t('cart.total')),
      h('strong', {}, i18n.formatPrice(total)),
    ),
    h('div', { class: 'modal__actions' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: closeCheckout },
        i18n.t('cart.checkoutClose')),
    ),
  );
  overlay.append(modal);
  return overlay;
}

function openConfirm()  { state.confirmOpen = true;  renderPage(); }
function closeConfirm() { state.confirmOpen = false; renderPage(); }
function openCheckout() {
  if (state.items.length === 0) return;
  state.checkoutOpen = true;
  renderPage();
}
function closeCheckout() {
  state.checkoutOpen = false;
  renderPage();
}

// ═══════════════════════════════════════════════════════════
//  Wiring
// ═══════════════════════════════════════════════════════════
function wirePage() {
  if (!state.container) return;

  on(state.container, 'click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;

    if (action === 'inc')    increment(id);
    if (action === 'dec')    decrement(id);
    if (action === 'remove') removeItem(id);
  });

  on(document, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.confirmOpen)  closeConfirm();
    if (state.checkoutOpen) closeCheckout();
  });
}

// ═══════════════════════════════════════════════════════════
//  Toast helper
// ═══════════════════════════════════════════════════════════
function toast(message, type = 'info') {
  events.emit('toast:show', { type, message });
}