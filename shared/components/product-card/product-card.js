import { h, html } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { productCardLang } from './product-card.lang.js';

i18n.register('productCard', productCardLang);

/**
 * کارت محصول — همه‌جا استفاده می‌شود
 * (صفحه اصلی، برندها، جستجو، محصولات مشابه)
 */
export function ProductCard(product) {
  const name  = i18n.localizeField(product, 'name');
  const brand = i18n.localizeField(product.brands ?? {}, 'name');
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.discount_price / product.price) * 100)
    : 0;
  const inStock = product.stock > 0;
  const price = hasDiscount ? product.discount_price : product.price;

  const el = document.createElement('article');
  el.className = 'product-card';
  el.dataset.slug = product.slug;

  el.innerHTML = html`
    <a class="product-card__link" href="#/product/${product.slug}" aria-label="${name}">
      <div class="product-card__media">
        <img src="${product.cover_url}" alt="${name}" loading="lazy" decoding="async">
        ${hasDiscount ? html`<span class="product-card__badge">${i18n.t('productCard.discount', { percent: i18n.formatNumber(discountPercent) })}</span>` : ''}
      </div>

      <div class="product-card__body">
        ${brand ? html`<span class="product-card__brand">${brand}</span>` : ''}
        <h3 class="product-card__title">${name}</h3>

        <div class="product-card__price">
          <span class="product-card__price-current">${i18n.formatPrice(price)}</span>
          ${hasDiscount ? html`<span class="product-card__price-old">${i18n.formatPrice(product.price)}</span>` : ''}
        </div>
      </div>
    </a>

    <button class="product-card__cta" type="button" ${inStock ? '' : 'disabled'}>
      ${inStock ? i18n.t('productCard.add_to_cart') : i18n.t('productCard.out_of_stock')}
    </button>
  `;

  // ── افزودن به سبد — emit می‌کند، cart گوش می‌دهد ──
  const cta = el.querySelector('.product-card__cta');
  cta.addEventListener('click', (e) => {
    e.preventDefault();
    events.emit('cart:add', { product, qty: 1 });
  });
  
    // ← ارتقاء فاز ۸: سیگنال برای افزونه‌ها (heart، compare، rating و ...)
  // فیچرها به این event گوش می‌دن و خودشون رو به کارت اضافه می‌کنن
  queueMicrotask(() => {
    events.emit('product-card:created', { el, product });
  });

  return el;

}