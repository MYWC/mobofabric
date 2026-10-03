import { h, qs, qsa, on, render, html } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { ProductCard } from '../../shared/components/product-card/product-card.js';
import { Skeleton } from '../../shared/components/skeleton/skeleton.js';
import { icons } from '../../shared/icons/icons.js';
import { searchLang } from './search.lang.js';

// ═══════════════════════════════════════════════════════════
//  ثابت‌ها
// ═══════════════════════════════════════════════════════════
const RECENT_KEY  = 'ps_recent_searches';
const MAX_RECENT  = 6;
const DEBOUNCE_MS = 280;
const MODAL_LIMIT = 8;
const PAGE_LIMIT  = 24;

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  // Modal
  open:        false,
  modalEl:     null,
  query:       '',
  results:     [],
  loading:     false,
  activeIndex: -1,
  mode:        'recent',   // 'recent' | 'search' | 'empty'
  recent:      [],
  debounceId:  null,
  reqId:       0,          // برای جلوگیری از race condition

  // Full page
  page: {
    query:  '',
    items:  [],
    total:  0,
    offset: 0,
    loading: false,
    error:   false,
  },
};

let offLang = null;
let offGlobalKey = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const search = {
  register() {
    i18n.register('search', searchLang);
    state.recent = loadRecent();

    // باز شدن مودال (از هدر — فاز 0)
    events.on('search:open', () => openModal());

    // صفحه کامل نتایج
    router.register('/search', (params, query) => showFullPage(query));

    // شورتکات سراسری Ctrl/Cmd+K
    offGlobalKey = on(document, 'keydown', onGlobalKey);

    // تغییر زبان
    offLang = events.on('lang:changed', () => {
      if (state.open) refreshModal();
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Recent searches
// ═══════════════════════════════════════════════════════════
function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch { return []; }
}

function saveRecent(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return;
  const list = loadRecent().filter(r => r.toLowerCase() !== q.toLowerCase());
  list.unshift(q);
  const trimmed = list.slice(0, MAX_RECENT);
  state.recent = trimmed;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed)); } catch {}
}

function removeRecent(query) {
  state.recent = state.recent.filter(r => r !== query);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(state.recent)); } catch {}
  if (state.open) updateResultsSection();
}

function clearRecent() {
  state.recent = [];
  try { localStorage.removeItem(RECENT_KEY); } catch {}
  if (state.open) updateResultsSection();
}

// ═══════════════════════════════════════════════════════════
//  Modal — Open / Close
// ═══════════════════════════════════════════════════════════
function openModal(initialQuery = '') {
  if (state.open) return;
  state.open        = true;
  state.query       = initialQuery;
  state.results     = [];
  state.activeIndex = -1;
  state.loading     = false;
  state.mode        = initialQuery ? 'search' : 'recent';

  const el = Modal();
  document.body.appendChild(el);
  state.modalEl = el;

  document.body.style.overflow = 'hidden';
  document.body.dataset.searchOpen = 'true';

  requestAnimationFrame(() => {
    const input = qs('.search-modal__input', el);
    if (input) {
      input.value = initialQuery;
      input.focus();
      if (initialQuery) input.select();
    }
    if (initialQuery) runSearch();
  });
}

function closeModal() {
  if (!state.open) return;
  state.open = false;
  clearTimeout(state.debounceId);
  state.debounceId = null;

  state.modalEl?.remove();
  state.modalEl = null;
  document.body.style.overflow = '';
  delete document.body.dataset.searchOpen;
}

function refreshModal() {
  if (!state.modalEl) return;
  const fresh = Modal();
  state.modalEl.replaceWith(fresh);
  state.modalEl = fresh;
  const input = qs('.search-modal__input', fresh);
  if (input) {
    input.value = state.query;
    input.focus();
  }
  updateResultsSection();
}

// ═══════════════════════════════════════════════════════════
//  Modal — Structure
// ═══════════════════════════════════════════════════════════
function Modal() {
  const overlay = h('div', {
    class: 'search-modal-overlay',
    onclick: onOverlayClick,
    role: 'presentation',
  });

  const modal = h('div', {
    class: 'search-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': i18n.t('search.title'),
    onclick: e => e.stopPropagation(),
  },
    ModalHeader(),
    h('div', { class: 'search-modal__results' }, ResultsSection()),
    ModalFooter(),
  );

  overlay.append(modal);
  return overlay;
}

function ModalHeader() {
  const input = h('input', {
    class: 'search-modal__input',
    type: 'search',
    placeholder: i18n.t('search.placeholder'),
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    'aria-label': i18n.t('search.placeholder'),
    value: state.query,
  });

  on(input, 'input', onInputChange);
  on(input, 'keydown', onInputKeyDown);

  return h('div', { class: 'search-modal__header' },
    h('span', { class: 'search-modal__icon', innerHTML: icons.search }),
    input,
    h('button', {
      class: 'search-modal__clear',
      type: 'button',
      'aria-label': i18n.t('search.remove'),
      onclick: clearInput,
    }, '×'),
    h('kbd', { class: 'search-modal__kbd' }, 'Esc'),
  );
}

function ModalFooter() {
  return h('div', { class: 'search-modal__footer' },
    h('span', { class: 'search-modal__hint' },
      h('kbd', {}, '↑'),
      h('kbd', {}, '↓'),
      h('span', {}, i18n.t('search.hintNav')),
    ),
    h('span', { class: 'search-modal__hint search-modal__hint--right' },
      h('kbd', {}, 'Enter'),
      h('span', {}, i18n.t('search.hint')),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Modal — Results Section (dynamic)
// ═══════════════════════════════════════════════════════════
function updateResultsSection() {
  if (!state.modalEl) return;
  const host = qs('.search-modal__results', state.modalEl);
  if (!host) return;
  render(host, ResultsSection());
}

function ResultsSection() {
  // حالت ۱: در حال جستجو
  if (state.loading) return LoadingState();

  // حالت ۲: کوئری خالی → جستجوهای اخیر
  if (!state.query) return RecentState();

  // حالت ۳: نتایج
  if (state.results.length > 0) return ResultsList();

  // حالت ۴: بدون نتیجه
  return NoResultsState();
}

function LoadingState() {
  return h('div', { class: 'search-modal__loading' },
    h('span', { class: 'search-modal__spinner' }),
    h('span', {}, i18n.t('search.loading')),
  );
}

function RecentState() {
  if (state.recent.length === 0) {
    return h('div', { class: 'search-modal__empty' },
      h('p', { class: 'search-modal__empty-title' }, i18n.t('search.noRecent')),
    );
  }

  return h('div', { class: 'search-modal__section' },
    h('header', { class: 'search-modal__section-header' },
      h('span', {}, i18n.t('search.recent')),
      h('button', {
        class: 'search-modal__section-action',
        type: 'button',
        onclick: (e) => { e.stopPropagation(); clearRecent(); },
      }, i18n.t('search.recentClear')),
    ),
    h('ul', { class: 'search-modal__list' },
      ...state.recent.map((q, i) =>
        h('li', { class: 'search-modal__recent-item', dataset: { idx: String(i) } },
          h('button', {
            class: 'search-modal__recent-btn',
            type: 'button',
            onclick: () => applyRecent(q),
          },
            h('span', { class: 'search-modal__recent-icon', innerHTML: icons.search }),
            h('span', { class: 'search-modal__recent-text' }, q),
          ),
          h('button', {
            class: 'search-modal__recent-remove',
            type: 'button',
            'aria-label': i18n.t('search.remove'),
            onclick: (e) => { e.stopPropagation(); removeRecent(q); },
            innerHTML: icons.close,
          }),
        )
      ),
    ),
  );
}

function ResultsList() {
  return h('div', { class: 'search-modal__section' },
    h('header', { class: 'search-modal__section-header' },
      h('span', {}, i18n.t('search.results')),
      h('span', { class: 'search-modal__count' },
        state.results.length === 1
          ? i18n.t('search.resultCountOne')
          : i18n.t('search.resultCount', { n: i18n.formatNumber(state.results.length) })),
    ),
    h('ul', { class: 'search-modal__list' },
      ...state.results.map((p, i) => ResultRow(p, i)),
    ),
    h('button', {
      class: 'search-modal__view-all',
      type: 'button',
      onclick: goToFullPage,
    },
      h('span', {}, i18n.t('search.viewAll')),
      h('span', { class: 'search-modal__view-all-arrow', innerHTML: icons.arrowL }),
    ),
  );
}

function ResultRow(product, index) {
  const name  = i18n.localizeField(product, 'name');
  const brand = i18n.localizeField(product.brands ?? {}, 'name');
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const price = hasDiscount ? product.discount_price : product.price;

  const active = index === state.activeIndex;

  const row = h('li', {
    class: `search-modal__result ${active ? 'is-active' : ''}`,
    dataset: { idx: String(index), slug: product.slug },
    onmouseenter: () => setActiveIndex(index),
  },
    h('a', { class: 'search-modal__result-link', href: `#/product/${product.slug}`, onclick: onResultClick },
      h('div', { class: 'search-modal__result-media' },
        h('img', { src: product.cover_url, alt: '', loading: 'lazy' }),
      ),
      h('div', { class: 'search-modal__result-body' },
        brand ? h('span', { class: 'search-modal__result-brand' }, brand) : null,
        h('div', { class: 'search-modal__result-title' },
          highlightText(name, state.query),
        ),
      ),
      h('div', { class: 'search-modal__result-price' },
        i18n.formatPrice(price),
      ),
    ),
  );

  return row;
}

function NoResultsState() {
  return h('div', { class: 'search-modal__empty' },
    h('p', { class: 'search-modal__empty-title' },
      i18n.t('search.noResults', { query: state.query })),
    h('p', { class: 'search-modal__empty-hint' },
      i18n.t('search.noResultsHint')),
    h('button', {
      class: 'search-modal__view-all',
      type: 'button',
      onclick: goToFullPage,
    }, i18n.t('search.viewAll')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Modal — Events
// ═══════════════════════════════════════════════════════════
function onOverlayClick(e) {
  if (e.target === e.currentTarget) closeModal();
}

function onInputChange(e) {
  state.query       = e.target.value.trim();
  state.activeIndex = -1;

  clearTimeout(state.debounceId);

  if (!state.query) {
    state.results = [];
    state.loading = false;
    state.mode    = 'recent';
    updateResultsSection();
    return;
  }

  state.mode    = 'search';
  state.loading = true;
  updateResultsSection();

  state.debounceId = setTimeout(runSearch, DEBOUNCE_MS);
}

function onInputKeyDown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    moveActive(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    moveActive(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (state.activeIndex >= 0 && state.results[state.activeIndex]) {
      navigateToProduct(state.results[state.activeIndex].slug);
    } else if (state.query) {
      goToFullPage();
    }
  }
}

function onResultClick(e) {
  e.preventDefault();
  const slug = e.currentTarget.closest('[data-slug]')?.dataset.slug;
  if (slug) navigateToProduct(slug);
}

function onGlobalKey(e) {
  // Ctrl/Cmd + K
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    if (state.open) closeModal();
    else openModal();
    return;
  }

  // Esc
  if (e.key === 'Escape' && state.open) {
    e.preventDefault();
    closeModal();
  }
}

// ═══════════════════════════════════════════════════════════
//  Modal — Actions
// ═══════════════════════════════════════════════════════════
async function runSearch() {
  const q = state.query;
  if (!q) return;

  const myId = ++state.reqId;

  try {
    const { data } = await api.products.list({ search: q, limit: MODAL_LIMIT });
    if (myId !== state.reqId) return;  // جستجوی جدیدتری هست
    if (state.query !== q) return;     // کاربر تایپ کرده
    state.results = data || [];
  } catch (err) {
    if (myId !== state.reqId) return;
    console.error('[search]', err);
    state.results = [];
  }

  state.loading = false;
  updateResultsSection();
}

function clearInput() {
  const input = qs('.search-modal__input', state.modalEl);
  if (input) {
    input.value = '';
    input.focus();
  }
  state.query       = '';
  state.results     = [];
  state.loading     = false;
  state.activeIndex = -1;
  state.mode        = 'recent';
  updateResultsSection();
}

function moveActive(delta) {
  const len = state.results.length;
  if (len === 0) return;

  if (state.activeIndex === -1) {
    state.activeIndex = delta > 0 ? 0 : len - 1;
  } else {
    state.activeIndex = (state.activeIndex + delta + len) % len;
  }
  updateResultsSection();

  // اطمینان از دیده شدن آیتم فعال
  const activeEl = qs('.search-modal__result.is-active', state.modalEl);
  activeEl?.scrollIntoView({ block: 'nearest' });
}

function setActiveIndex(idx) {
  if (state.activeIndex === idx) return;
  state.activeIndex = idx;
  qsa('.search-modal__result', state.modalEl).forEach(el => {
    el.classList.toggle('is-active', Number(el.dataset.idx) === idx);
  });
}

function applyRecent(q) {
  const input = qs('.search-modal__input', state.modalEl);
  if (input) {
    input.value = q;
    input.focus();
  }
  state.query = q;
  state.activeIndex = -1;
  state.loading = true;
  state.mode = 'search';
  updateResultsSection();
  runSearch();
}

function navigateToProduct(slug) {
  saveRecent(state.query);
  closeModal();
  router.navigate(`/product/${slug}`);
}

function goToFullPage() {
  const q = state.query.trim();
  if (!q) return;
  saveRecent(q);
  closeModal();
  router.navigate(`/search?q=${encodeURIComponent(q)}`);
}

// ═══════════════════════════════════════════════════════════
//  Full Page — /search?q=...
// ═══════════════════════════════════════════════════════════
async function showFullPage(query = {}) {
  const q = String(query.q || '').trim();
  const container = qs('#app');
  if (!container) return;

  state.page = {
    query: q,
    items: [],
    total: 0,
    offset: 0,
    loading: !!q,
    error: false,
  };

  render(container, FullPage());

  if (!q) return;

  try {
    const { data, count } = await api.products.list({ search: q, limit: PAGE_LIMIT });
    state.page.items = data || [];
    state.page.total = count || (data?.length || 0);
    state.page.offset = state.page.items.length;
  } catch (err) {
    console.error('[search-page]', err);
    state.page.error = true;
  }

  state.page.loading = false;
  render(container, FullPage());
}

function FullPage() {
  const { query: q, loading, error, items, total } = state.page;

  let body;
  if (loading)              body = LoadingGrid();
  else if (error)           body = PageError();
  else if (!q)              body = PageNoQuery();
  else if (items.length===0) body = PageNoResults(q);
  else                       body = PageResults();

  return h('div', { class: 'search-page' },
    h('div', { class: 'container' },
      h('header', { class: 'search-page__header' },
        h('h1', { class: 'search-page__title' }, i18n.t('search.pageTitle')),
        q
          ? h('p', { class: 'search-page__subtitle' },
              i18n.t('search.resultsFor', { query: q }))
          : h('p', { class: 'search-page__subtitle' }, i18n.t('search.noQuery')),
        q
          ? h('button', {
              class: 'btn btn--ghost search-page__new',
              type: 'button',
              onclick: () => openModal(q),
            }, i18n.t('search.backToSearch'))
          : null,
      ),
      body,
    ),
  );
}

function LoadingGrid() {
  return h('div', { class: 'products-grid' }, ...Skeleton.grid(8));
}

function PageResults() {
  const { items, total, offset } = state.page;
  const hasMore = offset < total;

  return h('div', { class: 'search-page__results' },
    h('p', { class: 'search-page__count' },
      total === 1
        ? i18n.t('search.resultCountOne')
        : i18n.t('search.resultCount', { n: i18n.formatNumber(total) }),
    ),
    h('div', { class: 'products-grid' },
      ...items.map(p => ProductCard(p)),
    ),
    hasMore
      ? h('div', { class: 'products-more' },
          h('button', {
            class: 'btn btn--ghost',
            type: 'button',
            onclick: loadMore,
          }, i18n.t('search.loadMore')),
        )
      : null,
  );
}

async function loadMore() {
  const { query: q, offset } = state.page;
  if (!q || state.page.loading) return;

  state.page.loading = true;

  try {
    const { data } = await api.products.list({ search: q, offset, limit: PAGE_LIMIT });
    state.page.items = [...state.page.items, ...(data || [])];
    state.page.offset = state.page.items.length;
  } catch (err) {
    console.error('[search-page] loadMore:', err);
  }

  state.page.loading = false;
  const container = qs('#app');
  if (container) render(container, FullPage());
}

function PageNoQuery() {
  return h('div', { class: 'search-page__empty' },
    h('p', {}, i18n.t('search.noQuery')),
    h('a', { class: 'btn btn--accent', href: '#/products' }, i18n.t('search.emptyCta')),
  );
}

function PageNoResults(q) {
  return h('div', { class: 'search-page__empty' },
    h('p', {}, i18n.t('search.noResults', { query: q })),
    h('p', { class: 'search-page__empty-hint' }, i18n.t('search.noResultsHint')),
    h('a', { class: 'btn btn--accent', href: '#/products' }, i18n.t('search.emptyCta')),
  );
}

function PageError() {
  return h('div', { class: 'search-page__empty search-page__empty--error' },
    h('p', {}, i18n.t('search.errorLoad')),
    h('button', {
      class: 'btn btn--accent',
      type: 'button',
      onclick: () => showFullPage({ q: state.page.query }),
    }, i18n.t('common.back_home')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Highlight (XSS-safe, DOM-based)
// ═══════════════════════════════════════════════════════════
function highlightText(text, query) {
  const wrap = document.createElement('span');
  const str = String(text ?? '');
  const q   = String(query ?? '').trim();

  if (!q || !str) {
    wrap.textContent = str;
    return wrap;
  }

  const lower    = str.toLowerCase();
  const lowerQ   = q.toLowerCase();
  const qLen     = q.length;
  let i = 0;

  while (i < str.length) {
    const idx = lower.indexOf(lowerQ, i);
    if (idx === -1) {
      wrap.append(document.createTextNode(str.slice(i)));
      break;
    }
    if (idx > i) wrap.append(document.createTextNode(str.slice(i, idx)));
    const mark = document.createElement('mark');
    mark.className = 'search-highlight';
    mark.textContent = str.slice(idx, idx + qLen);
    wrap.append(mark);
    i = idx + qLen;
  }

  return wrap;
}