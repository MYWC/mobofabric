// ═══════════════════════════════════════════════════════════
//  Recently Viewed — Phase 17
//  کاروسل محصولات بازدید شده
// ═══════════════════════════════════════════════════════════

import { h, qs, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { ProductCard } from '../../shared/components/product-card/product-card.js';
import { icons } from '../../shared/icons/icons.js';
import { recentlyViewedLang } from './recently-viewed.lang.js';

// ═══════════════════════════════════════════════════════════
//  Config
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = 'ps_recently_viewed';
const MAX_ITEMS = 10;
const DISPLAY_LIMIT = 6;

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  items: [],
};

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const recentlyViewed = {
  register() {
    i18n.register('recentlyViewed', recentlyViewedLang);

    loadFromStorage();

    // روی هر بازدید محصول
    events.on('product-detail:rendered', ({ product, container }) => {
      if (!product) return;
      addProduct(product);
      injectSection(container);
    });

    // تغییر زبان → رندر مجدد
    events.on('lang:changed', () => {
      const section = qs('.rv-section');
      if (section) {
        section.replaceWith(buildSection());
      }
    });
  },
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
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  } catch {}
}

function addProduct(product) {
  if (!product || !product.id) return;

  // حذف مورد قبلی اگه هست
  state.items = state.items.filter(p => p.id !== product.id);

  // اضافه به ابتدای لیست
  state.items.unshift({
    id:            product.id,
    slug:          product.slug,
    name_fa:       product.name_fa,
    name_en:       product.name_en,
    cover_url:     product.cover_url,
    price:         product.price,
    discount_price: product.discount_price ?? null,
    stock:         product.stock ?? 0,
    brands:        product.brands ? {
      slug:    product.brands.slug,
      name_fa: product.brands.name_fa,
      name_en: product.brands.name_en,
    } : null,
  });

  // محدود به MAX_ITEMS
  state.items = state.items.slice(0, MAX_ITEMS);

  saveToStorage();
}

function clearAll() {
  state.items = [];
  saveToStorage();

  events.emit('toast:show', {
    type: 'info',
    message: i18n.t('recentlyViewed.cleared'),
  });

  // حذف section از DOM
  const section = qs('.rv-section');
  if (section) section.remove();
}

// ═══════════════════════════════════════════════════════════
//  Section injection
// ═══════════════════════════════════════════════════════════
function injectSection(container) {
  if (!container) return;

  // حذف قبلی
  const prev = container.querySelector('.rv-section');
  if (prev) prev.remove();

  // محصولات نمایشی — بدون محصول فعلی
  const currentSlug = location.hash.split('/product/')[1]?.split('?')[0];
  const displayItems = state.items
    .filter(p => p.slug !== currentSlug)
    .slice(0, DISPLAY_LIMIT);

  // اگه کمتر از ۲ محصول داریم، نمایش نده
  if (displayItems.length < 2) return;

  const section = buildSection(displayItems);

  // درج بعد از pd-related
  const related = container.querySelector('.pd-related');
  if (related) {
    related.after(section);
  } else {
    const inner = container.querySelector('.pd-page > .container') || container;
    inner.append(section);
  }
}

function buildSection(items) {
  const displayItems = items || state.items.slice(0, DISPLAY_LIMIT);

  return h('section', { class: 'rv-section' },
    h('div', { class: 'container' },
      h('header', { class: 'rv-section__header' },
        h('div', {},
          h('h2', { class: 'rv-section__title' }, i18n.t('recentlyViewed.title')),
          h('p', { class: 'rv-section__subtitle' }, i18n.t('recentlyViewed.subtitle')),
        ),
        h('button', {
          class: 'rv-section__clear',
          type: 'button',
          onclick: clearAll,
        },
          h('span', { class: 'rv-section__clear-icon', innerHTML: icons.trash }),
          h('span', {}, i18n.t('recentlyViewed.clear')),
        ),
      ),
      h('div', { class: 'rv-section__carousel' },
        ...displayItems.map(p => h('div', { class: 'rv-section__item' }, ProductCard(p))),
      ),
    ),
  );
}