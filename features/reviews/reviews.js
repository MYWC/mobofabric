import { h, qs, qsa, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { CONFIG } from '../../core/config.js';
import { icons } from '../../shared/icons/icons.js';
import { reviewsLang } from './reviews.lang.js';

// ═══════════════════════════════════════════════════════════
//  ثابت‌ها
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY   = CONFIG.storageKeys.reviews;
const INITIAL_SHOW  = 4;
const STATS_BATCH   = 200;  // debounce ms برای batch کردن درخواست‌ها

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  productId:   '',
  productSlug: '',
  reviews:     [],
  stats:       { avg: 0, count: 0, dist: { 1:0, 2:0, 3:0, 4:0, 5:0 } },
  loading:     true,
  error:       false,
  expanded:    false,

  // Form
  showForm:    false,
  submitting:  false,
  form:        { name: '', email: '', rating: 0, comment: '' },
  errors:      {},
  touched:     {},
  hoverRating: 0,

  // Rate limit
  alreadyReviewed: false,
};

// ── Card ratings cache ──
const cardStatsCache = new Map();       // productId → stats
const pendingCardIds = new Set();
let   batchTimer     = null;
let   sectionEl      = null;

let offLang = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const reviews = {
  register() {
    i18n.register('reviews', reviewsLang);

    // وقتی صفحه محصول رندر شد، بخش نظرات را تزریق کن
    events.on('product-detail:rendered', ({ product, container }) => {
      injectSection(product, container);
    });

    // برای نمایش میانگین روی کارت‌های محصول
    events.on('product-card:created', ({ el, product }) => {
      queueCardRating(el, product);
    });

    // هم‌گام‌سازی بین تب‌ها برای rate limit
    on(window, 'storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      if (state.productId) refreshRateLimit();
    });

    offLang = events.on('lang:changed', () => {
      if (state.productId && sectionEl) {
        render(sectionEl, SectionContent());
        wireSection();
      }
      // آپدیت بج‌های امتیاز روی کارت‌ها (چون متن‌ها عوض شده)
      qsa('[data-rating-badge]').forEach(el => {
        const pid = el.dataset.ratingBadge;
        const stats = cardStatsCache.get(pid);
        if (stats) renderRatingBadge(el, stats);
      });
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Rate limit — localStorage
// ═══════════════════════════════════════════════════════════
function loadMyReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === 'object') ? obj : {};
  } catch { return {}; }
}

function saveMyReview(productId) {
  try {
    const obj = loadMyReviews();
    obj[productId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

function refreshRateLimit() {
  const map = loadMyReviews();
  state.alreadyReviewed = Boolean(map[state.productId]);
}

// ═══════════════════════════════════════════════════════════
//  Section injection (product detail page)
// ═══════════════════════════════════════════════════════════
function injectSection(product, container) {
  if (!product || !product.id) return;

  // پاک‌سازی بخش قبلی
  if (sectionEl) { sectionEl.remove(); sectionEl = null; }

  state.productId   = product.id;
  state.productSlug = product.slug;
  state.reviews     = [];
  state.stats       = { avg: 0, count: 0, dist: { 1:0, 2:0, 3:0, 4:0, 5:0 } };
  state.loading     = true;
  state.error       = false;
  state.expanded    = false;
  state.showForm    = false;
  state.submitting  = false;
  state.form        = { name: '', email: '', rating: 0, comment: '' };
  state.errors      = {};
  state.touched     = {};
  state.hoverRating = 0;
  refreshRateLimit();

  // ساخت بخش
  sectionEl = h('section', { class: 'reviews-section' });
  render(sectionEl, SectionContent());
  wireSection();

  // درج بین tabs و related
  const inner = qs('.pd-page > .container', container) || container;
  const tabs  = qs('.pd-tabs', inner);
  const related = qs('.pd-related', inner);

  if (tabs) tabs.after(sectionEl);
  else if (related) related.before(sectionEl);
  else inner.append(sectionEl);

  // بارگذاری داده
  loadReviews();
}

async function loadReviews() {
  try {
    const [list, stats] = await Promise.all([
      api.reviews.list(state.productId),
      api.reviews.stats(state.productId),
    ]);
    state.reviews = list;
    state.stats   = stats;
  } catch (err) {
    console.error('[reviews]', err);
    state.error = true;
  }
  state.loading = false;

  if (sectionEl) {
    render(sectionEl, SectionContent());
    wireSection();
  }

  // کش برای کارت‌ها
  cardStatsCache.set(state.productId, state.stats);
}

// ═══════════════════════════════════════════════════════════
//  Section Content
// ═══════════════════════════════════════════════════════════
function SectionContent() {
  return h('div', { class: 'reviews-inner' },
    SectionHeader(),
    state.loading ? LoadingBlock()
      : state.error ? ErrorBlock()
      : BodyBlock(),
  );
}

function SectionHeader() {
  const n = state.stats.count;
  const sub = n === 0
    ? i18n.t('reviews.subtitleZero')
    : n === 1
      ? i18n.t('reviews.subtitleOne')
      : i18n.t('reviews.subtitle', { n: i18n.formatNumber(n) });

  return h('header', { class: 'reviews-header' },
    h('div', { class: 'reviews-header__text' },
      h('h2', { class: 'reviews-header__title' }, i18n.t('reviews.title')),
      h('p',  { class: 'reviews-header__subtitle' }, sub),
    ),
    state.alreadyReviewed
      ? null
      : h('button', {
          class: 'btn btn--accent reviews-header__cta',
          type: 'button',
          onclick: () => {
            state.showForm = !state.showForm;
            if (!state.showForm) {
              state.form = { name: '', email: '', rating: 0, comment: '' };
              state.errors = {};
              state.touched = {};
            }
            refresh();
          },
        }, state.showForm
            ? i18n.t('reviews.cancelForm')
            : i18n.t('reviews.writeReview')),
  );
}

function LoadingBlock() {
  return h('div', { class: 'reviews-loading' },
    h('span', { class: 'reviews-spinner' }),
    h('span', {}, i18n.t('reviews.loading') || '...'),
  );
}

function ErrorBlock() {
  return h('div', { class: 'reviews-empty' },
    h('p', {}, i18n.t('reviews.errorLoad') || 'Error'),
    h('button', {
      class: 'btn btn--ghost',
      type: 'button',
      onclick: () => { state.loading = true; refresh(); loadReviews(); },
    }, i18n.t('reviews.retry') || 'Retry'),
  );
}

function BodyBlock() {
  return h('div', { class: 'reviews-body' },
    SummaryBlock(),
    state.showForm ? FormBlock() : null,
    state.alreadyReviewed && !state.showForm ? AlreadyReviewedNote() : null,
    ListBlock(),
  );
}

// ── Summary ──
function SummaryBlock() {
  const { avg, count, dist } = state.stats;

  return h('div', { class: 'reviews-summary' },
    h('div', { class: 'reviews-summary__avg' },
      h('div', { class: 'reviews-summary__avg-num' },
        i18n.formatNumber(avg.toFixed(1))),
      h('div', { class: 'reviews-summary__avg-stars', innerHTML: starsSvg(avg) }),
      h('div', { class: 'reviews-summary__avg-label' },
        count === 0
          ? i18n.t('reviews.subtitleZero')
          : i18n.t('reviews.basedOn', { n: i18n.formatNumber(count) })),
    ),
    h('div', { class: 'reviews-summary__dist' },
      ...[5, 4, 3, 2, 1].map(star =>
        DistRow(star, dist[star] || 0, count)
      ),
    ),
  );
}

function DistRow(star, n, total) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  return h('div', { class: 'reviews-dist' },
    h('span', { class: 'reviews-dist__label' },
      i18n.formatNumber(star),
      h('span', { class: 'reviews-dist__star', innerHTML: starSvg(12) }),
    ),
    h('div', { class: 'reviews-dist__bar' },
      h('div', { class: 'reviews-dist__fill', style: { width: pct + '%' } }),
    ),
    h('span', { class: 'reviews-dist__count' }, i18n.formatNumber(n)),
  );
}

// ── List ──
function ListBlock() {
  if (state.reviews.length === 0) return EmptyBlock();

  const visible = state.expanded
    ? state.reviews
    : state.reviews.slice(0, INITIAL_SHOW);
  const remaining = state.reviews.length - visible.length;

  return h('div', { class: 'reviews-list-block' },
    h('ul', { class: 'reviews-list' },
      ...visible.map(ReviewCard),
    ),
    remaining > 0
      ? h('div', { class: 'reviews-list-more' },
          h('button', {
            class: 'btn btn--ghost',
            type: 'button',
            onclick: () => { state.expanded = true; refresh(); },
          },
            i18n.t('reviews.showMore'),
            ' ',
            h('span', { class: 'reviews-list-more__count' },
              i18n.t('reviews.remaining', { n: i18n.formatNumber(remaining) })),
          ),
        )
      : null,
  );
}

function EmptyBlock() {
  return h('div', { class: 'reviews-empty' },
    h('p', {}, i18n.t('reviews.noReviews')),
    h('p', { class: 'reviews-empty__hint' }, i18n.t('reviews.noReviewsHint')),
  );
}

function ReviewCard(review) {
  return h('li', { class: 'review' },
    h('header', { class: 'review__head' },
      h('div', { class: 'review__avatar', 'aria-hidden': 'true' },
        (review.name || '?').trim().charAt(0).toUpperCase()),
      h('div', { class: 'review__meta' },
        h('div', { class: 'review__name' }, review.name),
        h('div', { class: 'review__date' }, formatRelative(review.created_at)),
      ),
      h('div', { class: 'review__stars', innerHTML: starsSvg(review.rating, true) }),
    ),
    h('p', { class: 'review__comment' }, review.comment),
  );
}

// ── Form ──
function FormBlock() {
  return h('form', {
    class: 'review-form',
    novalidate: true,
    onsubmit: onSubmit,
  },
    h('h3', { class: 'review-form__title' }, i18n.t('reviews.formTitle')),
    h('p',  { class: 'review-form__hint' },  i18n.t('reviews.formHint')),

    h('div', { class: 'form-row' },
      FormField({
        name: 'name',
        label: 'reviews.name',
        placeholder: 'reviews.namePlaceholder',
        autocomplete: 'name',
        required: true,
      }),
      FormField({
        name: 'email',
        label: 'reviews.email',
        placeholder: 'reviews.emailPlaceholder',
        type: 'email',
        autocomplete: 'email',
      }),
    ),

    h('div', { class: `form-field ${state.touched.rating && state.errors.rating ? 'form-field--error' : ''}` },
      h('label', { class: 'form-label' },
        i18n.t('reviews.rating'),
        h('span', { class: 'form-label__required' }, '*'),
      ),
      StarPicker(),
      state.touched.rating && state.errors.rating
        ? h('p', { class: 'form-error' }, state.errors.rating)
        : null,
    ),

    FormField({
      name: 'comment',
      label: 'reviews.comment',
      placeholder: 'reviews.commentPlaceholder',
      textarea: true,
      required: true,
    }),

    h('div', { class: 'review-form__actions' },
      h('button', {
        class: 'btn btn--accent review-form__submit',
        type: 'submit',
        disabled: state.submitting,
      }, state.submitting ? i18n.t('reviews.submitting') : i18n.t('reviews.submit')),
      h('button', {
        class: 'btn btn--ghost',
        type: 'button',
        onclick: () => {
          state.showForm = false;
          state.form = { name: '', email: '', rating: 0, comment: '' };
          state.errors = {};
          state.touched = {};
          refresh();
        },
      }, i18n.t('reviews.cancelForm')),
    ),
  );
}

function FormField({ name, label, placeholder, type = 'text', textarea = false, required = false, autocomplete }) {
  const value = state.form[name] ?? '';
  const err   = state.touched[name] ? state.errors[name] : '';

  const inputEl = textarea
    ? h('textarea', {
        class: 'form-control form-control--textarea',
        id: `rv-${name}`,
        name,
        placeholder: i18n.t(placeholder),
        rows: 5,
        maxlength: '2000',
      })
    : h('input', {
        class: 'form-control',
        id: `rv-${name}`,
        name,
        type,
        placeholder: i18n.t(placeholder),
        autocomplete: autocomplete || 'off',
        maxlength: name === 'name' ? '60' : name === 'email' ? '120' : undefined,
      });

  inputEl.value = value;

  return h('div', { class: `form-field ${err ? 'form-field--error' : ''}` },
    h('label', { class: 'form-label', for: `rv-${name}` },
      i18n.t(label),
      required ? h('span', { class: 'form-label__required' }, '*') : null,
    ),
    inputEl,
    name === 'email' ? h('p', { class: 'form-hint' }, i18n.t('reviews.emailHint')) : null,
    err ? h('p', { class: 'form-error' }, err) : null,
  );
}

function StarPicker() {
  const current = state.hoverRating || state.form.rating;

  return h('div', {
    class: 'star-picker',
    role: 'radiogroup',
    'aria-label': i18n.t('reviews.rating'),
    onmouseleave: () => { state.hoverRating = 0; refreshStars(); },
  },
    ...[1, 2, 3, 4, 5].map(n => {
      const filled = n <= current;
      return h('button', {
        type: 'button',
        class: `star-picker__btn ${filled ? 'is-filled' : ''}`,
        'aria-label': String(n),
        'aria-checked': state.form.rating === n ? 'true' : 'false',
        role: 'radio',
        dataset: { star: String(n) },
        onmouseenter: () => { state.hoverRating = n; refreshStars(); },
        onclick: () => {
          state.form.rating = n;
          state.touched.rating = true;
          state.errors.rating = validateField('rating', n);
          refreshStars();
          updateFieldError('rating');
        },
      }, h('span', { innerHTML: starSvg(28) }));
    }),
  );
}

function refreshStars() {
  if (!sectionEl) return;
  const current = state.hoverRating || state.form.rating;
  qsa('.star-picker__btn', sectionEl).forEach(btn => {
    const n = Number(btn.dataset.star);
    btn.classList.toggle('is-filled', n <= current);
    btn.setAttribute('aria-checked', state.form.rating === n ? 'true' : 'false');
  });
}

// ── Already reviewed note ──
function AlreadyReviewedNote() {
  return h('div', { class: 'reviews-note' },
    h('span', { class: 'reviews-note__icon', innerHTML: icons.check }),
    h('div', {},
      h('strong', {}, i18n.t('reviews.rateLimited')),
      h('p', {}, i18n.t('reviews.rateLimitedHint')),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  SVG helpers
// ═══════════════════════════════════════════════════════════
function starSvg(size = 16) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.95 6.36 6.95.63-5.25 4.6 1.55 6.83L12 16.9l-6.2 3.52 1.55-6.83-5.25-4.6 6.95-.63L12 2z"/></svg>`;
}

function starsSvg(rating, small = false) {
  const size = small ? 14 : 18;
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.35 && rating - full < 0.85;
  const rounded = Math.round(rating);

  let out = '<span class="rating-stars">';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= (hasHalf ? full : rounded);
    out += `<span class="rating-stars__item ${filled ? 'is-filled' : ''}" style="width:${size}px;height:${size}px">${starSvg(size)}</span>`;
  }
  out += '</span>';
  return out;
}

// ═══════════════════════════════════════════════════════════
//  Form wiring
// ═══════════════════════════════════════════════════════════
function wireSection() {
  if (!sectionEl) return;
  qsa('input, textarea', sectionEl).forEach(el => {
    if (el.dataset.wired === '1') return;
    el.dataset.wired = '1';
    on(el, 'input', onFieldChange);
    on(el, 'blur', onFieldBlur);
  });
}

function onFieldChange(e) {
  const name = e.target.name;
  if (!name) return;
  state.form[name] = e.target.value;
  if (state.touched[name]) {
    state.errors[name] = validateField(name, e.target.value);
    updateFieldError(name);
  }
}

function onFieldBlur(e) {
  const name = e.target.name;
  if (!name) return;
  state.touched[name] = true;
  state.errors[name] = validateField(name, e.target.value);
  updateFieldError(name);
}

function validateField(name, value) {
  const v = String(value || '').trim();

  if (name === 'name') {
    if (!v) return i18n.t('reviews.errName');
    if (v.length < 2) return i18n.t('reviews.errNameShort');
    if (v.length > 60) return i18n.t('reviews.errNameLong');
  }
  if (name === 'email' && v) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return i18n.t('reviews.errEmail');
  }
  if (name === 'rating') {
    const n = Number(value);
    if (!n || n < 1 || n > 5) return i18n.t('reviews.errRating');
  }
  if (name === 'comment') {
    if (!v) return i18n.t('reviews.errComment');
    if (v.length < 10) return i18n.t('reviews.errCommentShort');
    if (v.length > 2000) return i18n.t('reviews.errCommentLong');
  }
  return '';
}

function updateFieldError(name) {
  if (!sectionEl) return;
  const field = qs(`[name="${name}"]`, sectionEl)?.closest('.form-field');
  if (!field) return;

  const err = state.errors[name];
  field.classList.toggle('form-field--error', !!err);

  let msg = qs('.form-error', field);
  if (err && !msg) {
    msg = h('p', { class: 'form-error' }, err);
    field.append(msg);
  } else if (err && msg) {
    msg.textContent = err;
  } else if (!err && msg) {
    msg.remove();
  }
}

async function onSubmit(e) {
  e.preventDefault();
  if (state.submitting) return;

  const names = ['name', 'email', 'rating', 'comment'];
  let hasError = false;

  for (const n of names) {
    state.touched[n] = true;
    state.errors[n] = validateField(n, state.form[n]);
    if (state.errors[n]) hasError = true;
  }

  if (hasError) {
    refresh();
    return;
  }

  state.submitting = true;
  refresh();

  try {
    const created = await api.reviews.create({
      productId: state.productId,
      name:      state.form.name,
      email:     state.form.email || null,
      rating:    Number(state.form.rating),
      comment:   state.form.comment,
    });

    // به لیست اضافه کن
    state.reviews = [created, ...state.reviews];
    state.stats   = recomputeStats(state.reviews);

    // ثبت rate limit
    saveMyReview(state.productId);
    state.alreadyReviewed = true;

    // ریست فرم
    state.form        = { name: '', email: '', rating: 0, comment: '' };
    state.errors      = {};
    state.touched     = {};
    state.showForm    = false;
    state.submitting  = false;

    refresh();
    refreshRateLimit();

    events.emit('toast:show', {
      type: 'success',
      message: i18n.t('reviews.successTitle'),
    });

    // آپدیت کش کارت
    cardStatsCache.set(state.productId, state.stats);
    refreshCardBadge(state.productId);
  } catch (err) {
    console.error('[reviews] submit failed', err);
    state.submitting = false;
    refresh();
  }
}

function recomputeStats(list) {
  const count = list.length;
  const sum   = list.reduce((s, r) => s + (r.rating || 0), 0);
  const dist  = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  list.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
  return {
    count,
    avg: count ? sum / count : 0,
    dist,
  };
}

function refresh() {
  if (!sectionEl) return;
  render(sectionEl, SectionContent());
  wireSection();
}

// ═══════════════════════════════════════════════════════════
//  Date formatting
// ═══════════════════════════════════════════════════════════
function formatRelative(iso) {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return i18n.t('reviews.justNow');

  const min = Math.floor(sec / 60);
  if (min < 60) return i18n.t('reviews.minutesAgo', { n: i18n.formatNumber(min) });

  const hr = Math.floor(min / 60);
  if (hr < 24) return i18n.t('reviews.hoursAgo', { n: i18n.formatNumber(hr) });

  const day = Math.floor(hr / 24);
  if (day < 30) return i18n.t('reviews.daysAgo', { n: i18n.formatNumber(day) });

  const mon = Math.floor(day / 30);
  if (mon < 12) return i18n.t('reviews.monthsAgo', { n: i18n.formatNumber(mon) });

  const yr = Math.floor(mon / 12);
  return i18n.t('reviews.yearsAgo', { n: i18n.formatNumber(yr) });
}

// ═══════════════════════════════════════════════════════════
//  Card Rating Badge
// ═══════════════════════════════════════════════════════════
function queueCardRating(cardEl, product) {
  if (!cardEl || !product || !product.id) return;

  const pid = product.id;

  // اگه کش داریم، فوری نشون بده
  if (cardStatsCache.has(pid)) {
    injectRatingBadge(cardEl, pid, cardStatsCache.get(pid));
    return;
  }

  pendingCardIds.add(pid);
  scheduleBatch();
}

function scheduleBatch() {
  if (batchTimer) return;
  batchTimer = setTimeout(flushBatch, STATS_BATCH);
}

async function flushBatch() {
  batchTimer = null;
  const ids = [...pendingCardIds];
  pendingCardIds.clear();

  if (ids.length === 0) return;

  try {
    const statsMap = await api.reviews.statsBatch(ids);
    for (const [id, stats] of Object.entries(statsMap)) {
      cardStatsCache.set(id, stats);
      refreshCardBadge(id);
    }
  } catch (err) {
    console.warn('[reviews] batch stats failed', err);
  }
}

function injectRatingBadge(cardEl, productId, stats) {
  if (!cardEl) return;
  if (stats.count === 0) return;

  const media = qs('.product-card__media', cardEl);
  if (!media) return;

  let badge = qs('[data-rating-badge]', media);
  if (!badge) {
    badge = h('div', {
      class: 'product-card__rating',
      dataset: { ratingBadge: productId },
    });
    media.append(badge);
  }
  renderRatingBadge(badge, stats);
}

function renderRatingBadge(badge, stats) {
  const avg = stats.avg || 0;
  badge.innerHTML = `
    <span class="product-card__rating-star" aria-hidden="true">
      ${starSvg(12)}
    </span>
    <span class="product-card__rating-value">${i18n.formatNumber(avg.toFixed(1))}</span>
    <span class="product-card__rating-count">(${i18n.formatNumber(stats.count)})</span>
  `;
  badge.setAttribute('aria-label',
    i18n.t('reviews.basedOn', { n: i18n.formatNumber(stats.count) }));
}

function refreshCardBadge(productId) {
  const el = qs(`[data-rating-badge="${productId}"]`);
  if (!el) return;
  const stats = cardStatsCache.get(productId);
  if (stats) renderRatingBadge(el, stats);
}