// ═══════════════════════════════════════════════════════════
//  Quick View — Phase 17
//  Modal نمای سریع روی کارت محصول
// ═══════════════════════════════════════════════════════════

import { h, qs, qsa, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { router } from '../../core/router.js';
import { icons } from '../../shared/icons/icons.js';
import { quickViewLang } from './quick-view.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  open:        false,
  overlayEl:   null,
  product:     null,
  activeImage: 0,
  offKey:      null,
};

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const quickView = {
  register() {
    i18n.register('quickView', quickViewLang);

    // تزریق دکمه روی هر کارت محصول
    events.on('product-card:created', ({ el, product }) => {
      injectButton(el, product);
    });

    // تغییر زبان → modal اگه بازه، refresh
    events.on('lang:changed', () => {
      if (state.open && state.product) refreshModal();
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Button injection
// ═══════════════════════════════════════════════════════════
function injectButton(card, product) {
  if (!card || !product || !product.id) return;
  if (card.querySelector('.product-card__quickview')) return;

  const btn = h('button', {
    class: 'product-card__quickview',
    type: 'button',
    'aria-label': i18n.t('quickView.btn'),
    title: i18n.t('quickView.btn'),
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal(product);
    },
  },
    h('span', { class: 'product-card__quickview-icon', innerHTML: icons.eye }),
  );

  // داخل media، بالای تصویر
  const media = card.querySelector('.product-card__media');
  if (media) media.append(btn);
}

// ═══════════════════════════════════════════════════════════
//  Modal — Open / Close
// ═══════════════════════════════════════════════════════════
function openModal(product) {
  if (state.open) return;

  state.open = true;
  state.product = product;
  state.activeImage = 0;

  // Overlay
  state.overlayEl = h('div', {
    class: 'qv-overlay',
    onclick: (e) => {
      if (e.target === state.overlayEl) closeModal();
    },
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': i18n.t('quickView.btn'),
  });

  document.body.append(state.overlayEl);
  document.body.style.overflow = 'hidden';

  renderModal();

  requestAnimationFrame(() => {
    state.overlayEl.classList.add('is-visible');
  });

  // Esc
  state.offKey = on(document, 'keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function closeModal() {
  if (!state.open) return;
  state.open = false;

  state.overlayEl?.classList.remove('is-visible');
  const el = state.overlayEl;
  setTimeout(() => el?.remove(), 220);

  state.overlayEl = null;
  state.product = null;
  document.body.style.overflow = '';

  state.offKey?.();
  state.offKey = null;
}

function refreshModal() {
  if (!state.overlayEl) return;
  state.overlayEl.replaceChildren(ModalContent());
}

// ═══════════════════════════════════════════════════════════
//  Modal content
// ═══════════════════════════════════════════════════════════
function renderModal() {
  if (!state.overlayEl) return;
  state.overlayEl.replaceChildren(ModalContent());
}

function ModalContent() {
  const p = state.product;
  const modal = h('div', { class: 'qv-modal', onclick: (e) => e.stopPropagation() });

  // Close button
  modal.append(
    h('button', {
      class: 'qv-modal__close',
      type: 'button',
      'aria-label': i18n.t('quickView.close'),
      onclick: closeModal,
      innerHTML: icons.close,
    })
  );

  // Layout
  modal.append(
    h('div', { class: 'qv-modal__layout' },
      Gallery(p),
      Info(p),
    )
  );

  return modal;
}

function Gallery(p) {
  const images = getGallery(p);
  const current = images[state.activeImage] || p.cover_url;
  const hasDiscount = p.discount_price && p.discount_price < p.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - p.discount_price / p.price) * 100)
    : 0;

  const main = h('div', { class: 'qv-gallery__main' },
    h('img', { src: current, alt: p.name_fa || p.name_en, loading: 'eager' }),
    hasDiscount
      ? h('span', { class: 'qv-gallery__badge' },
          i18n.t('quickView.discount', { n: i18n.formatNumber(discountPercent) }))
      : null,
  );

  // Arrow keys
  const arrows = images.length > 1
    ? [
        h('button', {
          class: 'qv-gallery__arrow qv-gallery__arrow--prev',
          type: 'button',
          'aria-label': i18n.t('quickView.galleryPrev'),
          onclick: () => navigateImage(-1),
          innerHTML: icons.arrowL,
        }),
        h('button', {
          class: 'qv-gallery__arrow qv-gallery__arrow--next',
          type: 'button',
          'aria-label': i18n.t('quickView.galleryNext'),
          onclick: () => navigateImage(1),
          innerHTML: icons.arrowR,
        }),
      ]
    : [];

  const thumbs = images.length > 1
    ? h('div', { class: 'qv-gallery__thumbs' },
        ...images.map((url, i) =>
          h('button', {
            class: `qv-gallery__thumb ${i === state.activeImage ? 'is-active' : ''}`,
            type: 'button',
            dataset: { idx: String(i) },
            onclick: () => setImage(i),
          }, h('img', { src: url, alt: '', loading: 'lazy' })),
        ),
      )
    : null;

  return h('div', { class: 'qv-gallery' },
    h('div', { class: 'qv-gallery__main-wrap' }, main, ...arrows),
    thumbs,
  );
}

function Info(p) {
  const brandName = p.brands
    ? (i18n.getLang() === 'fa' ? p.brands.name_fa : p.brands.name_en)
    : '';
  const name = i18n.getLang() === 'fa' ? p.name_fa : p.name_en;

  const hasDiscount = p.discount_price && p.discount_price < p.price;
  const currentPrice = hasDiscount ? p.discount_price : p.price;
  const inStock = (p.stock ?? 0) > 0;
  const lowStock = inStock && p.stock <= 5;

  // Specs خلاصه — ۴ تا
  const specKeys = ['ram', 'storage', 'screen', 'battery'];
  const specs = p.specs && typeof p.specs === 'object' ? p.specs : {};
  const specRows = specKeys
    .filter(k => specs[k])
    .slice(0, 4)
    .map(k => h('div', { class: 'qv-spec' },
      h('span', { class: 'qv-spec__key' }, i18n.t(`productDetail.specKeys.${k}`) || k),
      h('span', { class: 'qv-spec__val' }, String(specs[k])),
    ));

  return h('div', { class: 'qv-info' },
    brandName
      ? h('span', { class: 'qv-info__brand' }, brandName)
      : null,

    h('h2', { class: 'qv-info__title' }, name),

    h('div', { class: 'qv-info__price' },
      h('span', {
        class: `qv-info__price-current ${hasDiscount ? 'is-discount' : ''}`,
      }, i18n.formatPrice(currentPrice)),
      hasDiscount
        ? h('span', { class: 'qv-info__price-old' }, i18n.formatPrice(p.price))
        : null,
    ),

    h('div', { class: `qv-info__stock ${inStock ? (lowStock ? 'is-low' : 'is-ok') : 'is-out'}` },
      h('span', { class: 'qv-info__stock-dot' }),
      h('span', {}, !inStock
        ? i18n.t('quickView.outOfStock')
        : lowStock
          ? i18n.t('quickView.lowStock', { n: i18n.formatNumber(p.stock) })
          : i18n.t('quickView.inStock')
      ),
    ),

    specRows.length > 0
      ? h('div', { class: 'qv-info__specs' },
          h('h3', { class: 'qv-info__specs-title' }, i18n.t('quickView.specs')),
          ...specRows,
        )
      : null,

    h('div', { class: 'qv-info__actions' },
      h('button', {
        class: 'btn btn--accent qv-info__cta',
        type: 'button',
        disabled: !inStock,
        onclick: (e) => {
          e.preventDefault();
          events.emit('cart:add', { product: p, qty: 1 });
          closeModal();
        },
      },
        h('span', { class: 'icon-btn__icon', innerHTML: icons.cart }),
        h('span', {}, inStock ? i18n.t('quickView.addToCart') : i18n.t('quickView.outOfStock')),
      ),

      h('a', {
        class: 'btn btn--ghost qv-info__view-full',
        href: `#/product/${p.slug}`,
        onclick: () => closeModal(),
      }, i18n.t('quickView.viewFull')),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Gallery helpers
// ═══════════════════════════════════════════════════════════
function getGallery(p) {
  if (!p) return [];
  const g = Array.isArray(p.gallery) ? p.gallery.filter(Boolean) : [];
  if (g.length > 0) return g;
  return p.cover_url ? [p.cover_url] : [];
}

function navigateImage(delta) {
  const images = getGallery(state.product);
  if (images.length <= 1) return;
  setImage((state.activeImage + delta + images.length) % images.length);
}

function setImage(i) {
  state.activeImage = i;

  const el = state.overlayEl;
  if (!el) return;

  const images = getGallery(state.product);
  const mainImg = el.querySelector('.qv-gallery__main img');
  if (mainImg) {
    mainImg.style.opacity = '0';
    const next = new Image();
    next.onload = () => {
      mainImg.src = images[i];
      mainImg.style.opacity = '1';
    };
    next.src = images[i];
  }

  qsa('.qv-gallery__thumb', el).forEach((t, idx) => {
    t.classList.toggle('is-active', idx === i);
  });
}