import { h, qs, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { store } from '../../core/store.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { CONFIG } from '../../core/config.js';
import { icons } from '../../shared/icons/icons.js';
import { discountsLang } from './discounts.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = CONFIG.storageKeys.discount;

const state = {
  applied:     null,   // { id, code, type, value, min_order_amount, max_discount, description_fa, description_en, active: true }
  inputValue:  '',
  busy:        false,
  error:       '',
};

let offLang = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const discounts = {
  register() {
    i18n.register('discounts', discountsLang);

    loadFromStorage();

    // وقتی خلاصه‌ی سبد رندر شد، UI تخفیف را تزریق کن
    events.on('cart:summary:rendered', ({ aside }) => injectUI(aside));

    // وقتی سبد تغییر کرد، اعتبار کد را بررسی کن
    events.on('cart:changed', () => revalidate());

    // هم‌گام‌سازی بین تب‌ها
    on(window, 'storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      loadFromStorage();
      events.emit('discount:changed', { discount: state.applied });
    });

    // تغییر زبان → رندر مجدد UI
    offLang = events.on('lang:changed', () => {
      const slot = qs('.cart-summary__discount-slot');
      if (slot) {
        render(slot, DiscountUI());
        wireUI(slot);
      }
    });
  },

  current() { return state.applied; },
};

// ═══════════════════════════════════════════════════════════
//  Storage
// ═══════════════════════════════════════════════════════════
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.code && parsed.type && parsed.value) {
      state.applied = { ...parsed, active: true };
    } else {
      state.applied = null;
    }
  } catch {
    state.applied = null;
  }
  broadcast();
}

function saveToStorage() {
  try {
    if (state.applied) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.applied));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  broadcast();
}

function broadcast() {
  store.set('discount', state.applied);
  events.emit('discount:changed', { discount: state.applied });
}

// ═══════════════════════════════════════════════════════════
//  UI injection
// ═══════════════════════════════════════════════════════════
function injectUI(aside) {
  if (!aside) return;
  const slot = qs('.cart-summary__discount-slot', aside);
  if (!slot) return;

  render(slot, DiscountUI());
  wireUI(slot);
}

function refreshSlot() {
  const slot = qs('.cart-summary__discount-slot');
  if (!slot) return;
  render(slot, DiscountUI());
  wireUI(slot);
}

// ═══════════════════════════════════════════════════════════
//  Views
// ═══════════════════════════════════════════════════════════
function DiscountUI() {
  return state.applied ? AppliedView() : InputView();
}

function InputView() {
  return h('div', { class: 'discount-box' },
    h('label', { class: 'discount-box__label', for: 'discount-input' },
      h('span', { class: 'discount-box__label-icon', innerHTML: icons.tag }),
      i18n.t('discounts.inputLabel'),
    ),
    h('div', { class: 'discount-box__row' },
      h('input', {
        class: 'input discount-box__input',
        id: 'discount-input',
        type: 'text',
        placeholder: i18n.t('discounts.inputPlaceholder'),
        value: state.inputValue,
        autocomplete: 'off',
        spellcheck: 'false',
        maxlength: '32',
        dataset: { role: 'input' },
      }),
      h('button', {
        class: 'btn btn--accent discount-box__apply',
        type: 'button',
        disabled: state.busy || !state.inputValue.trim(),
        dataset: { role: 'apply' },
      }, state.busy ? i18n.t('discounts.applying') : i18n.t('discounts.apply')),
    ),
    state.error
      ? h('p', { class: 'discount-box__error' }, state.error)
      : null,
  );
}

function AppliedView() {
  const d = state.applied;
  const desc = i18n.localizeField(d, 'description');

  return h('div', { class: 'discount-box discount-box--applied' },
    h('div', { class: 'discount-box__applied-head' },
      h('div', { class: 'discount-box__applied-info' },
        h('div', { class: 'discount-box__applied-code' },
          h('span', { class: 'discount-box__applied-check', innerHTML: icons.check }),
          h('strong', {}, d.code),
        ),
        desc
          ? h('p', { class: 'discount-box__applied-desc' }, desc)
          : null,
      ),
      h('button', {
        class: 'discount-box__remove',
        type: 'button',
        'aria-label': i18n.t('discounts.remove'),
        dataset: { role: 'remove' },
        innerHTML: icons.close,
      }),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Wiring
// ═══════════════════════════════════════════════════════════
function wireUI(slot) {
  const input    = qs('[data-role="input"]', slot);
  const applyBtn = qs('[data-role="apply"]', slot);
  const removeBtn = qs('[data-role="remove"]', slot);

  if (input) {
    on(input, 'input', (e) => {
      state.inputValue = e.target.value;
      state.error = '';
      if (applyBtn) applyBtn.disabled = state.busy || !state.inputValue.trim();
      const errEl = qs('.discount-box__error', slot);
      if (errEl) errEl.remove();
    });

    on(input, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCode();
      }
    });
  }

  if (applyBtn)  on(applyBtn, 'click', applyCode);
  if (removeBtn) on(removeBtn, 'click', removeCode);
}

// ═══════════════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════════════
async function applyCode() {
  const code = state.inputValue.trim();
  if (!code || state.busy) return;

  state.busy = true;
  state.error = '';
  refreshSlot();

  try {
    const res = await api.discounts.validate(code);

    if (!res || !res.valid) {
      state.error = reasonMessage(res?.reason);
      state.busy = false;
      refreshSlot();
      return;
    }

    // چک حداقل مبلغ سفارش
    const base = currentCartBase();
    if (base < (res.min_order_amount ?? 0)) {
      state.error = i18n.t('discounts.errMinAmount', {
        amount: i18n.formatPrice(res.min_order_amount),
      });
      state.busy = false;
      refreshSlot();
      return;
    }

    // اعمال
    state.applied = {
      id: res.id,
      code: res.code,
      type: res.type,
      value: Number(res.value),
      min_order_amount: Number(res.min_order_amount ?? 0),
      max_discount: res.max_discount != null ? Number(res.max_discount) : null,
      description_fa: res.description_fa,
      description_en: res.description_en,
      active: true,
    };
    state.inputValue = '';
    state.busy = false;
    state.error = '';

    saveToStorage();
    refreshSlot();

    events.emit('toast:show', {
      type: 'success',
      message: i18n.t('discounts.applied'),
    });
  } catch (err) {
    console.error('[discounts]', err);
    state.error = i18n.t('discounts.errGeneric');
    state.busy = false;
    refreshSlot();
  }
}

function removeCode() {
  state.applied = null;
  state.inputValue = '';
  state.error = '';
  saveToStorage();
  refreshSlot();
  events.emit('toast:show', {
    type: 'info',
    message: i18n.t('discounts.removed'),
  });
}

function revalidate() {
  if (!state.applied) return;

  const base = currentCartBase();
  if (base < (state.applied.min_order_amount ?? 0)) {
    const code = state.applied.code;
    state.applied = null;
    saveToStorage();
    refreshSlot();
    events.emit('toast:show', {
      type: 'warning',
      message: i18n.t('discounts.autoRemoved', { code }),
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════
function currentCartBase() {
  const cart = store.get('cart');
  if (!cart || !Array.isArray(cart.items)) return 0;
  return cart.items.reduce((s, i) => {
    const price = (i.discount_price && i.discount_price < i.price)
      ? i.discount_price
      : i.price;
    return s + price * i.qty;
  }, 0);
}

function reasonMessage(reason) {
  const map = {
    empty:         'errEmpty',
    not_found:     'errNotFound',
    inactive:      'errInactive',
    not_started:   'errNotStarted',
    expired:       'errExpired',
    limit_reached: 'errLimit',
  };
  return i18n.t(`discounts.${map[reason] || 'errGeneric'}`);
}