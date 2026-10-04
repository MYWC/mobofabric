// ═══════════════════════════════════════════════════════════
//  Product Card — Velvet Luxury
//  Phase 26 — Obsidian Vault
// ═══════════════════════════════════════════════════════════

import { h, html } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { icons } from '../../icons/icons.js';
import { productCardLang } from './product-card.lang.js';

i18n.register('productCard', productCardLang);

// ═══════════════════════════════════════════════════════════
//  ProductCard — کارت محصول لوکس
// ═══════════════════════════════════════════════════════════
export function ProductCard(product) {
  const name  = i18n.localizeField(product, 'name');
  const brand = i18n.localizeField(product.brands ?? {}, 'name');

  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.discount_price / product.price) * 100)
    : 0;

  const inStock = (product.stock ?? 0) > 0;
  const isLowStock = inStock && product.stock <= 5;
  const price = hasDiscount ? product.discount_price : product.price;

  // ── Badge: تخفیف / جدید ──
  const badge = hasDiscount
    ? { type: 'discount', text: i18n.t('productCard.discount', { percent: i18n.formatNumber(discountPercent) }) }
    : product.is_featured
      ? { type: 'hot', text: i18n.t('productCard.hot') }
      : null;

  const el = document.createElement('article');
  el.className = 'vault-card';
  el.dataset.slug = product.slug;

  el.innerHTML = html`
    <div class="vault-card__inner">

      <!-- ── Media ── -->
      <a class="vault-card__media" href="#/product/${product.slug}" aria-label="${name}">
        <div class="vault-card__media-bg"></div>
        <img
          class="vault-card__img"
          src="${product.cover_url}"
          alt="${name}"
          loading="lazy"
          decoding="async"
        >
        <div class="vault-card__shine"></div>

        ${badge ? `
          <span class="vault-card__badge vault-card__badge--${badge.type}">
            ${badge.text}
          </span>
        ` : ''}

        ${isLowStock ? `
          <span class="vault-card__stock vault-card__stock--low">
            ${i18n.t('productCard.in_stock')}
          </span>
        ` : ''}
      </a>

      <!-- ── Actions (hover) ── -->
      <div class="vault-card__actions">
        <button
          class="vault-card__action vault-card__action--fav"
          type="button"
          aria-label="${i18n.t('header.favorites')}"
          data-action="favorite"
          data-fav-id="${product.id}"
        >
          ${icons.heart}
        </button>
        <button
          class="vault-card__action vault-card__action--quick"
          type="button"
          aria-label="${i18n.t('productCard.quick_view')}"
          data-action="quickview"
        >
          ${icons.eye}
        </button>
      </div>

      <!-- ── Body ── -->
      <div class="vault-card__body">

        ${brand ? `
          <div class="vault-card__brand">${brand}</div>
        ` : ''}

        <a class="vault-card__title" href="#/product/${product.slug}">
          ${name}
        </a>

        <div class="vault-card__specs">
          ${product.specs?.storage ? `
            <span class="vault-card__spec">${product.specs.storage}</span>
          ` : ''}
          ${product.specs?.ram ? `
            <span class="vault-card__spec-dot"></span>
            <span class="vault-card__spec">${product.specs.ram}</span>
          ` : ''}
        </div>

        <!-- ── Price Row ── -->
        <div class="vault-card__price-row">
          <div class="vault-card__price-group">
            <div class="vault-card__price">${i18n.formatPrice(price)}</div>
            ${hasDiscount ? `
              <div class="vault-card__price-old">${i18n.formatPrice(product.price)}</div>
            ` : ''}
          </div>

          <button
            class="vault-card__cta"
            type="button"
            ${inStock ? '' : 'disabled'}
            data-action="add-to-cart"
            aria-label="${inStock ? i18n.t('productCard.add_to_cart') : i18n.t('productCard.out_of_stock')}"
          >
            ${inStock ? icons.plus || icons.cart : icons.close}
          </button>
        </div>
      </div>
    </div>
  `;

  // ═══════════════════════════════════════════════════════════
  //  Wiring
  // ═══════════════════════════════════════════════════════════

  // ── Add to cart ──
  const cta = el.querySelector('[data-action="add-to-cart"]');
  if (cta) {
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!inStock) return;
      events.emit('cart:add', { product, qty: 1 });
      // Ripple effect
      cta.classList.add('is-clicked');
      setTimeout(() => cta.classList.remove('is-clicked'), 300);
    });
  }

  // ── Quick view (فقط emit) ──
  const quickBtn = el.querySelector('[data-action="quickview"]');
  if (quickBtn) {
    quickBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      events.emit('quickview:open', { product });
      // همچنین برای quick-view.js که به product-card:created گوش می‌ده
      events.emit('product:quickview', { product });
    });
  }

  // ── Favorite ──
  const favBtn = el.querySelector('[data-action="favorite"]');
  if (favBtn) {
    favBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      events.emit('favorites:toggle', { product });
    });
  }

  // ── سیگنال به فیچرهای دیگر ──
  queueMicrotask(() => {
    events.emit('product-card:created', { el, product });
  });

  return el;
}