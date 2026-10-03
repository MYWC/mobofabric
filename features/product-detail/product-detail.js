import { h, qs, qsa, on, render, html } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { ProductCard } from '../../shared/components/product-card/product-card.js';
import { Skeleton } from '../../shared/components/skeleton/skeleton.js';
import { icons } from '../../shared/icons/icons.js';
import { productDetailLang } from './product-detail.lang.js';

// ═══════════════════════════════════════════════════════════
//  State محلی فیچر
// ═══════════════════════════════════════════════════════════
const state = {
  slug:        '',
  product:     null,
  related:     [],
  activeImage: 0,
  activeTab:   'description',
  loading:     false,
  error:       false,
  notFound:    false,
  container:   null,
  galleryEl:   null,
};

let offLang   = null;
let offKey    = null;
let offGlobal = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const productDetail = {
  register() {
    // ترجمه‌ها
    i18n.register('productDetail', productDetailLang);

    // مسیر
    router.register('/product/:slug', (params) => showDetail(params.slug));

    // تغییر زبان → رندر مجدد
    offLang = events.on('lang:changed', () => {
      if (state.product) renderDetail();
    });

    // کلیدهای چپ/راست برای گالری
    offKey = on(document, 'keydown', onKeyNav);
  },

  destroy() {
    offLang?.();
    offKey?.();
    offGlobal?.();
    offLang = offKey = offGlobal = null;
  },
};

// ═══════════════════════════════════════════════════════════
//  بارگذاری داده
// ═══════════════════════════════════════════════════════════
async function showDetail(slug) {
  state.slug        = slug;
  state.product     = null;
  state.related     = [];
  state.activeImage = 0;
  state.activeTab   = 'description';
  state.loading     = true;
  state.error       = false;
  state.notFound    = false;
  state.container   = qs('#app');

  renderDetail();

  try {
    const product = await api.products.bySlug(slug);

    if (!product) {
      state.notFound = true;
    } else {
      state.product = product;
      // محصولات مشابه را در پس‌زمینه بگیر (خطا نباید صفحه را خراب کند)
      loadRelated(product.brands?.slug, product.id);
    }
  } catch (err) {
    console.error('[product-detail]', err);
    state.error = true;
  }

  state.loading = false;
  renderDetail();
}

async function loadRelated(brandSlug, currentId) {
  if (!brandSlug) return;
  try {
    const { data } = await api.products.list({ brand: brandSlug, limit: 8 });
    state.related = (data || []).filter(p => p.id !== currentId).slice(0, 4);
    // رندر جزئی مجدد — فقط بخش مشابه
    const relatedHost = qs('.pd-related');
    if (relatedHost) relatedHost.replaceWith(RelatedSection());
  } catch (err) {
    // silent — محصولات مشابه حیاتی نیستند
    console.warn('[product-detail] related failed:', err);
  }
}

// ═══════════════════════════════════════════════════════════
//  رندر اصلی
// ═══════════════════════════════════════════════════════════
function renderDetail() {
  if (!state.container) return;

  let content;
  if (state.loading)         content = SkeletonPage();
  else if (state.error)      content = ErrorState();
  else if (state.notFound)   content = NotFoundState();
  else if (state.product)    content = ProductPage();
  else                       content = ErrorState();

  render(state.container, content);

  // بعد از رندر، گالری را سیم‌کشی کن
  if (state.product && !state.loading) {
    requestAnimationFrame(wireGallery);
  }
}

// ═══════════════════════════════════════════════════════════
//  Views — Page
// ═══════════════════════════════════════════════════════════
function ProductPage() {
  return h('article', { class: 'pd-page' },
    h('div', { class: 'container' },
      Breadcrumb(),
      h('div', { class: 'pd-layout' },
        Gallery(),
        InfoPanel(),
      ),
      Tabs(),
      RelatedSection(),
    ),
  );
}

function Breadcrumb() {
  const p = state.product;
  const brandName = i18n.localizeField(p.brands ?? {}, 'name');
  const brandSlug = p.brands?.slug;

  return h('nav', { class: 'pd-breadcrumb', 'aria-label': 'breadcrumb' },
    h('a', { href: '#/' }, i18n.t('productDetail.home')),
    h('span', { class: 'pd-breadcrumb__sep', 'aria-hidden': 'true' }, '›'),
    h('a', { href: '#/products' }, i18n.t('productDetail.products')),
    brandName ? h('span', { class: 'pd-breadcrumb__sep', 'aria-hidden': 'true' }, '›') : null,
    brandName ? h('a', { href: `#/products?brand=${brandSlug}` }, brandName) : null,
    h('span', { class: 'pd-breadcrumb__sep', 'aria-hidden': 'true' }, '›'),
    h('span', { class: 'pd-breadcrumb__current' }, i18n.localizeField(p, 'name')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Views — Gallery
// ═══════════════════════════════════════════════════════════
function Gallery() {
  const images = getGallery();
  const p = state.product;
  const hasDiscount = p.discount_price && p.discount_price < p.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - p.discount_price / p.price) * 100)
    : 0;

  const main = h('div', { class: 'pd-gallery__main' },
    h('img', {
      class: 'pd-gallery__main-img',
      src: images[state.activeImage] ?? '',
      alt: i18n.localizeField(p, 'name'),
      loading: 'eager',
      decoding: 'async',
    }),
    hasDiscount
      ? h('span', { class: 'pd-gallery__badge' },
          i18n.t('productDetail.discount', { percent: i18n.formatNumber(discountPercent) }))
      : null,
  );

  const thumbs = images.length > 1
    ? h('div', { class: 'pd-gallery__thumbs', role: 'tablist' },
        ...images.map((url, idx) => Thumb(url, idx)),
      )
    : null;

  return h('section', { class: 'pd-gallery', 'aria-label': 'gallery' },
    main,
    thumbs,
  );
}

function Thumb(url, idx) {
  return h('button', {
    class: `pd-gallery__thumb ${idx === state.activeImage ? 'is-active' : ''}`,
    type: 'button',
    role: 'tab',
    'aria-selected': idx === state.activeImage ? 'true' : 'false',
    dataset: { idx: String(idx) },
  }, h('img', { src: url, alt: '', loading: 'lazy' }));
}

function getGallery() {
  const p = state.product;
  if (!p) return [];
  const g = Array.isArray(p.gallery) ? p.gallery.filter(Boolean) : [];
  if (g.length > 0) return g;
  return p.cover_url ? [p.cover_url] : [];
}

function wireGallery() {
  const root = qs('.pd-gallery');
  if (!root) { state.galleryEl = null; return; }
  state.galleryEl = root;

  qsa('.pd-gallery__thumb', root).forEach(btn => {
    on(btn, 'click', () => {
      const idx = Number(btn.dataset.idx);
      selectImage(idx);
    });
  });
}

function selectImage(idx) {
  const images = getGallery();
  if (!images.length) return;
  state.activeImage = ((idx % images.length) + images.length) % images.length;

  const root = state.galleryEl;
  if (!root) return;

  const mainImg = qs('.pd-gallery__main-img', root);
  if (mainImg) {
    mainImg.style.opacity = '0';
    const next = images[state.activeImage];
    const img  = new Image();
    img.onload = () => {
      mainImg.src = next;
      mainImg.style.opacity = '1';
    };
    img.onerror = () => {
      mainImg.src = next;
      mainImg.style.opacity = '1';
    };
    img.src = next;
  }

  qsa('.pd-gallery__thumb', root).forEach((t, i) => {
    const active = i === state.activeImage;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function onKeyNav(e) {
  if (!state.galleryEl || !state.product) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

  if (e.key === 'ArrowRight') selectImage(state.activeImage + 1);
  else if (e.key === 'ArrowLeft') selectImage(state.activeImage - 1);
}

// ═══════════════════════════════════════════════════════════
//  Views — Info Panel
// ═══════════════════════════════════════════════════════════
function InfoPanel() {
  const p = state.product;
  const name       = i18n.localizeField(p, 'name');
  const brandName  = i18n.localizeField(p.brands ?? {}, 'name');
  const hasDiscount = p.discount_price && p.discount_price < p.price;
  const currentPrice = hasDiscount ? p.discount_price : p.price;
  const inStock    = p.stock > 0;
  const lowStock   = inStock && p.stock <= 5;

  return h('section', { class: 'pd-info' },

    // برند
    brandName
      ? h('a', {
          class: 'pd-info__brand',
          href: `#/products?brand=${p.brands?.slug}`,
        }, brandName)
      : null,

    // عنوان
    h('h1', { class: 'pd-info__title' }, name),

    // قیمت
    h('div', { class: 'pd-info__price' },
      h('span', {
        class: `pd-info__price-current ${hasDiscount ? 'is-discount' : ''}`,
      }, i18n.formatPrice(currentPrice)),
      hasDiscount
        ? h('span', { class: 'pd-info__price-old' }, i18n.formatPrice(p.price))
        : null,
    ),

    // وضعیت موجودی
    h('div', { class: `pd-info__stock ${inStock ? (lowStock ? 'is-low' : 'is-ok') : 'is-out'}` },
      h('span', { class: 'pd-info__stock-dot', 'aria-hidden': 'true' }),
      h('span', {}, !inStock
        ? i18n.t('productDetail.outOfStock')
        : lowStock
          ? i18n.t('productDetail.lowStock', { n: i18n.formatNumber(p.stock) })
          : i18n.t('productDetail.inStock')
      ),
    ),

    // اکشن‌ها
    h('div', { class: 'pd-info__actions' },
      h('button', {
        class: 'btn btn--accent pd-info__cta',
        type: 'button',
        disabled: !inStock,
        onclick: () => addToCart(p),
      },
        h('span', { class: 'pd-info__cta-icon', innerHTML: icons.cart }),
        h('span', {}, inStock
          ? i18n.t('productDetail.addToCart')
          : i18n.t('productDetail.outOfStock')
        ),
      ),
      h('button', {
        class: 'btn btn--ghost pd-info__share',
        type: 'button',
        'aria-label': i18n.t('productDetail.share'),
        onclick: () => shareProduct(p),
        innerHTML: icons.globe,
      }),
    ),

    // اعتماد
    TrustBadges(),
  );
}

function TrustBadges() {
  return h('ul', { class: 'pd-trust' },
    TrustItem(icons.check,      i18n.t('productDetail.freeShipping'), i18n.t('productDetail.freeShippingHint')),
    TrustItem(icons.check,      i18n.t('productDetail.warranty'),     i18n.t('productDetail.warrantyHint')),
    TrustItem(icons.check,      i18n.t('productDetail.returnPolicy'), i18n.t('productDetail.returnPolicyHint')),
  );
}

function TrustItem(icon, title, hint) {
  return h('li', { class: 'pd-trust__item' },
    h('span', { class: 'pd-trust__icon', innerHTML: icon }),
    h('div', { class: 'pd-trust__text' },
      h('strong', {}, title),
      h('span', {}, hint),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Views — Tabs
// ═══════════════════════════════════════════════════════════
function Tabs() {
  const p = state.product;
  const tabs = [
    { id: 'description', label: i18n.t('productDetail.tabDescription') },
    { id: 'specs',       label: i18n.t('productDetail.tabSpecs') },
  ];

  return h('section', { class: 'pd-tabs' },
    h('div', { class: 'pd-tabs__nav', role: 'tablist' },
      ...tabs.map(t => h('button', {
        class: `pd-tabs__btn ${state.activeTab === t.id ? 'is-active' : ''}`,
        type: 'button',
        role: 'tab',
        'aria-selected': state.activeTab === t.id ? 'true' : 'false',
        onclick: () => setTab(t.id),
      }, t.label)),
    ),
    h('div', { class: 'pd-tabs__panel' }, TabPanel(p)),
  );
}

function TabPanel(p) {
  if (state.activeTab === 'specs') return SpecsPanel(p);
  return DescriptionPanel(p);
}

function DescriptionPanel(p) {
  const desc = i18n.localizeField(p, 'description');
  if (!desc) {
    return h('p', { class: 'pd-muted' }, i18n.t('productDetail.noDescription'));
  }
  return h('div', { class: 'pd-description' },
    ...desc.split('\n').filter(Boolean).map(line => h('p', {}, line)),
  );
}

function SpecsPanel(p) {
  const specs = p.specs && typeof p.specs === 'object' ? p.specs : {};
  const entries = Object.entries(specs);
  if (entries.length === 0) {
    return h('p', { class: 'pd-muted' }, i18n.t('productDetail.noSpecs'));
  }

  return h('dl', { class: 'pd-specs' },
    ...entries.map(([key, value]) => {
      const labelKey = `productDetail.specKeys.${key}`;
      const label = i18n.t(labelKey);
      return h('div', { class: 'pd-specs__row' },
        h('dt', { class: 'pd-specs__key' }, label === labelKey ? key : label),
        h('dd', { class: 'pd-specs__val' }, String(value)),
      );
    }),
  );
}

function setTab(id) {
  state.activeTab = id;
  const tabsEl = qs('.pd-tabs');
  if (!tabsEl) return;

  // فقط کلاس دکمه‌ها + محتوای panel را عوض کن — بدون رندر کامل
  qsa('.pd-tabs__btn', tabsEl).forEach(btn => {
    const active = btn.textContent === i18n.t(
      id === 'description' ? 'productDetail.tabDescription' : 'productDetail.tabSpecs'
    );
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  const panel = qs('.pd-tabs__panel', tabsEl);
  if (panel) render(panel, TabPanel(state.product));
}

// ═══════════════════════════════════════════════════════════
//  Views — Related
// ═══════════════════════════════════════════════════════════
function RelatedSection() {
  return h('section', { class: 'pd-related' },
    h('header', { class: 'pd-related__header' },
      h('h2', {}, i18n.t('productDetail.related')),
      h('p',  {}, i18n.t('productDetail.relatedSub')),
    ),
    state.related.length > 0
      ? h('div', { class: 'products-grid' }, ...state.related.map(p => ProductCard(p)))
      : h('p', { class: 'pd-muted' }, i18n.t('productDetail.noRelated')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Views — States
// ═══════════════════════════════════════════════════════════
function SkeletonPage() {
  return h('div', { class: 'pd-page' },
    h('div', { class: 'container' },
      h('div', { class: 'pd-breadcrumb pd-breadcrumb--skeleton' },
        h('div', { class: 'skeleton skeleton--line', style: { width: '180px' } }),
      ),
      h('div', { class: 'pd-layout' },
        h('div', { class: 'pd-gallery' },
          h('div', { class: 'skeleton skeleton--img' }),
          h('div', { class: 'pd-gallery__thumbs' },
            ...Array.from({ length: 3 }, () =>
              h('div', { class: 'skeleton skeleton--thumb' })
            ),
          ),
        ),
        h('div', { class: 'pd-info' },
          h('div', { class: 'skeleton skeleton--line', style: { width: '80px' } }),
          h('div', { class: 'skeleton skeleton--line', style: { width: '70%', height: '36px', marginTop: '16px' } }),
          h('div', { class: 'skeleton skeleton--line', style: { width: '50%', height: '28px', marginTop: '24px' } }),
          h('div', { class: 'skeleton skeleton--line', style: { width: '100%', height: '48px', marginTop: '32px' } }),
          h('div', { class: 'skeleton skeleton--line', style: { width: '100%', height: '100px', marginTop: '24px' } }),
        ),
      ),
    ),
  );
}

function NotFoundState() {
  return h('div', { class: 'container pd-state' },
    h('h1', { class: 'pd-state__code' }, '۴۰۴'),
    h('h2', {}, i18n.t('productDetail.notFound')),
    h('p',  {}, i18n.t('productDetail.notFoundHint')),
    h('a', { class: 'btn btn--accent', href: '#/products' }, i18n.t('productDetail.backToShop')),
  );
}

function ErrorState() {
  return h('div', { class: 'container pd-state pd-state--error' },
    h('h2', {}, i18n.t('productDetail.errorLoad')),
    h('a', { class: 'btn btn--accent', href: '#/products' }, i18n.t('productDetail.backToShop')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════════════
function addToCart(product) {
  events.emit('cart:add', { product, qty: 1 });
}

async function shareProduct(product) {
  const url = `${location.origin}${location.pathname}#/product/${product.slug}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: i18n.localizeField(product, 'name'), url });
      return;
    }
    await navigator.clipboard.writeText(url);
    events.emit('toast:show', {
      type: 'success',
      message: i18n.t('productDetail.shareCopied'),
    });
  } catch (err) {
    // کاربر لغو کرد یا clipboard در دسترس نیست — بی‌صدا
  }
}