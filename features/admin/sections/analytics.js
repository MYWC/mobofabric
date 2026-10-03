import { h, qs, on, render } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { api } from '../../../core/api.js';
import { icons } from '../../../shared/icons/icons.js';

const state = {
  container: null,
  days:      30,
  loading:   true,
  summary:   null,
  daily:     [],
  topProducts: [],
  topSearches: [],
  funnel:    null,
};

let offLang = null;

export const analytics = {
  async mount(container) {
    state.container = container;
    offLang?.();
    offLang = events.on('lang:changed', () => {
      if (state.container && !state.loading) renderView();
    });
    await load();
  },
};

async function load() {
  state.loading = true;
  renderView();

  try {
    const [summary, daily, topProducts, topSearches, funnel] = await Promise.all([
      api.analytics.summary(state.days),
      api.analytics.daily(state.days),
      api.analytics.topProducts(state.days, 10),
      api.analytics.topSearches(state.days, 10),
      api.analytics.funnel(state.days),
    ]);
    state.summary = summary;
    state.daily = daily;
    state.topProducts = topProducts;
    state.topSearches = topSearches;
    state.funnel = funnel;
  } catch (err) {
    console.error('[admin/analytics]', err);
  }

  state.loading = false;
  renderView();
}

function renderView() {
  if (!state.container) return;

  render(state.container, h('div', { class: 'analytics-page' },
    Header(),
    state.loading
      ? h('div', { class: 'admin-loading' }, h('span', { class: 'admin-spinner' }), h('span', {}, i18n.t('admin.loading')))
      : Body(),
  ));
  requestAnimationFrame(wire);
}

function Header() {
  const ranges = [
    { d: 7,  label: 'analytics.range7' },
    { d: 30, label: 'analytics.range30' },
    { d: 90, label: 'analytics.range90' },
  ];

  return h('div', { class: 'an-header' },
    h('div', {},
      h('h2', { style: { fontSize: '20px', letterSpacing: '-0.02em' } }, i18n.t('analytics.title')),
      h('p', { style: { fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px' } },
        i18n.t('analytics.subtitle')),
    ),
    h('div', { class: 'an-range' },
      ...ranges.map(r => h('button', {
        class: `an-range__btn ${state.days === r.d ? 'is-active' : ''}`,
        type: 'button',
        dataset: { range: String(r.d) },
      }, i18n.t(r.label))),
    ),
  );
}

function Body() {
  const s = state.summary || {};

  return h('div', {},
    StatCards(s),
    DailyChart(),
    h('div', { class: 'an-cols' },
      TopProductsCard(),
      TopSearchesCard(),
    ),
    FunnelCard(),
    EventsByTypeCard(s),
  );
}

function StatCards(s) {
  const cards = [
    { key: 'total_events',   label: 'analytics.totalEvents',   icon: 'activity', value: s.total_events ?? 0 },
    { key: 'total_sessions', label: 'analytics.totalSessions', icon: 'user',     value: s.total_sessions ?? 0 },
    { key: 'total_users',    label: 'analytics.totalUsers',    icon: 'shield',   value: s.total_users ?? 0 },
    { key: 'events_today',   label: 'analytics.eventsToday',   icon: 'clock',    value: todayCount() },
  ];

  return h('div', { class: 'an-stats' },
    ...cards.map(c => h('article', { class: 'an-stat' },
      h('div', { class: 'an-stat__icon', innerHTML: icons[c.icon] }),
      h('div', { class: 'an-stat__value' }, i18n.formatNumber(c.value)),
      h('div', { class: 'an-stat__label' }, i18n.t(c.label)),
    )),
  );
}

function todayCount() {
  if (!state.daily || state.daily.length === 0) return 0;
  const today = state.daily[state.daily.length - 1];
  return (today.views ?? 0) + (today.cart_adds ?? 0) + (today.searches ?? 0);
}

// ═══════════════════════════════════════════════════════════
//  Daily chart — SVG sparkline multi-line
// ═══════════════════════════════════════════════════════════
function DailyChart() {
  if (!state.daily || state.daily.length === 0) {
    return h('div', { class: 'an-chart' },
      h('h3', { class: 'an-chart__title' }, i18n.t('analytics.dailyActivity')),
      h('div', { class: 'an-chart__empty' }, i18n.t('analytics.noData')),
    );
  }

  const data = state.daily;
  const W = 800, H = 200, PAD = 20;

  const series = [
    { key: 'views',    color: 'var(--color-accent)', label: 'analytics.productViews' },
    { key: 'cart_adds',color: 'var(--color-success)', label: 'analytics.cartAdds' },
    { key: 'searches', color: 'var(--color-warning)', label: 'analytics.searches' },
  ];

  const allValues = data.flatMap(d => series.map(s => Number(d[s.key]) || 0));
  const max = Math.max(1, ...allValues);

  const xStep = (W - PAD * 2) / Math.max(1, data.length - 1);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'an-chart__svg');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.height = '200px';

  // gridlines
  [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
    const y = H - PAD - frac * (H - PAD * 2);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(PAD));
    line.setAttribute('x2', String(W - PAD));
    line.setAttribute('y1', String(y));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', 'var(--color-border)');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '3 3');
    svg.append(line);
  });

  // series lines
  series.forEach(s => {
    const path = document.createElementNS(svgNS, 'path');
    const pts = data.map((d, i) => {
      const x = PAD + i * xStep;
      const v = Number(d[s.key]) || 0;
      const y = H - PAD - (v / max) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    path.setAttribute('d', pts);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', s.color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);

    // area fill
    const area = document.createElementNS(svgNS, 'path');
    const areaPts = pts + ` L${PAD + (data.length - 1) * xStep},${H - PAD} L${PAD},${H - PAD} Z`;
    area.setAttribute('d', areaPts);
    area.setAttribute('fill', s.color);
    area.setAttribute('opacity', '0.08');
    svg.insertBefore(area, path);
  });

  // x labels (every N)
  const step = Math.max(1, Math.ceil(data.length / 6));
  for (let i = 0; i < data.length; i += step) {
    const x = PAD + i * xStep;
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(H - 4));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '10');
    text.setAttribute('fill', 'var(--color-text-tertiary)');
    text.textContent = formatDay(data[i].day);
    svg.append(text);
  }

  return h('div', { class: 'an-chart' },
    h('h3', { class: 'an-chart__title' }, i18n.t('analytics.dailyActivity')),
    h('div', { class: 'an-chart__legend' },
      ...series.map(s => h('span', { class: 'an-chart__legend-item' },
        h('span', { class: 'an-chart__legend-dot', style: { background: s.color } }),
        i18n.t(s.label),
      )),
    ),
    svg,
  );
}

function formatDay(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const lang = i18n.getLang() === 'fa' ? 'fa-IR' : 'en-US';
    return new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric' }).format(d);
  } catch { return ''; }
}

// ═══════════════════════════════════════════════════════════
//  Top products
// ═══════════════════════════════════════════════════════════
function TopProductsCard() {
  const items = state.topProducts || [];

  return h('div', { class: 'an-list' },
    h('h3', { class: 'an-chart__title' }, i18n.t('analytics.topProducts')),
    items.length === 0
      ? h('div', { class: 'an-chart__empty' }, i18n.t('analytics.noData'))
      : h('div', {}, ...items.map((p, i) => h('div', { class: 'an-list__item' },
          h('span', { class: 'an-list__rank' }, i18n.formatNumber(i + 1)),
          h('a', { class: 'an-list__media', href: `#/product/${p.slug}` },
            p.cover_url ? h('img', { src: p.cover_url, alt: '', loading: 'lazy' }) : null,
          ),
          h('div', { class: 'an-list__body' },
            h('a', {
              class: 'an-list__title',
              href: `#/product/${p.slug}`,
            }, i18n.localizeField(p, 'name')),
            h('div', { class: 'an-list__meta' },
              `${i18n.formatNumber(p.views)} ${i18n.t('analytics.views')} · ${i18n.formatNumber(p.cart_adds)} ${i18n.t('analytics.cartAddsShort')}`,
            ),
          ),
          h('span', { class: 'an-list__value' }, i18n.formatNumber(p.views)),
        )),
      ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Top searches
// ═══════════════════════════════════════════════════════════
function TopSearchesCard() {
  const items = state.topSearches || [];
  const max = Math.max(1, ...items.map(s => s.hits));

  return h('div', { class: 'an-list' },
    h('h3', { class: 'an-chart__title' }, i18n.t('analytics.topSearches')),
    items.length === 0
      ? h('div', { class: 'an-chart__empty' }, i18n.t('analytics.noData'))
      : h('div', {}, ...items.map(s => h('div', { class: 'an-query' },
          h('span', { class: 'an-query__text' }, s.query),
          h('div', { class: 'an-query__bar' },
            h('div', { class: 'an-query__fill', style: { width: `${(s.hits / max) * 100}%` } }),
          ),
          h('span', { class: 'an-query__count' }, i18n.formatNumber(s.hits)),
        )),
      ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Funnel
// ═══════════════════════════════════════════════════════════
function FunnelCard() {
  const f = state.funnel || {};
  const views     = Number(f.views)     || 0;
  const cartAdds  = Number(f.cart_adds) || 0;
  const checkouts = Number(f.checkouts) || 0;
  const purchases = Number(f.purchases) || 0;

  const maxVal = Math.max(1, views, cartAdds, checkouts, purchases);

  const steps = [
    { label: 'analytics.funnelViews',    icon: 'eyeIcon',  value: views,     color: 'var(--color-accent)' },
    { label: 'analytics.funnelCart',     icon: 'cart',     value: cartAdds,  color: 'var(--color-success)' },
    { label: 'analytics.funnelCheckout', icon: 'tag',      value: checkouts, color: 'var(--color-warning)' },
    { label: 'analytics.funnelPurchase', icon: 'check',    value: purchases, color: 'var(--color-danger)' },
  ];

  return h('div', { class: 'an-funnel' },
    h('h3', { class: 'an-chart__title' }, i18n.t('analytics.funnelTitle')),
    ...steps.map((s, i) => {
      const pct = (s.value / maxVal) * 100;
      const prev = i > 0 ? steps[i - 1].value : null;
      const convRate = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;

      return h('div', { class: 'an-funnel__step' },
        h('div', { class: 'an-funnel__label' },
          h('span', {
            class: 'an-funnel__icon',
            style: { background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color },
            innerHTML: icons[s.icon],
          }),
          i18n.t(s.label),
        ),
        h('div', { class: 'an-funnel__bar' },
          h('div', {
            class: 'an-funnel__fill',
            style: {
              width: `${Math.max(pct, 8)}%`,
              background: `linear-gradient(90deg, color-mix(in srgb, ${s.color} 60%, transparent), ${s.color})`,
            },
          }, i18n.formatNumber(s.value)),
        ),
        h('div', { class: 'an-funnel__rate' },
          i === 0
            ? `${i18n.formatNumber(100)}%`
            : convRate != null
              ? i18n.t('analytics.funnelRateFrom', { percent: i18n.formatNumber(convRate), from: i18n.t(steps[i - 1].label) })
              : '—',
        ),
      );
    }),
  );
}

// ═══════════════════════════════════════════════════════════
//  Events by type
// ═══════════════════════════════════════════════════════════
function EventsByTypeCard(s) {
  const byType = s.by_type && typeof s.by_type === 'object' ? s.by_type : {};
  const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  const labelMap = {
    page_view:        'analytics.evtPageView',
    product_view:     'analytics.evtProductView',
    search:           'analytics.evtSearch',
    add_to_cart:      'analytics.evtAddToCart',
    remove_from_cart: 'analytics.evtRemoveFromCart',
    checkout_start:   'analytics.evtCheckoutStart',
    purchase:         'analytics.evtPurchase',
    favorite_add:     'analytics.evtFavoriteAdd',
    favorite_remove:  'analytics.evtFavoriteRemove',
    compare_add:      'analytics.evtCompareAdd',
    discount_applied: 'analytics.evtDiscountApplied',
    review_submit:    'analytics.evtReviewSubmit',
  };

  return h('div', { class: 'an-chart' },
    h('h3', { class: 'an-chart__title' }, i18n.t('analytics.eventsByType')),
    entries.length === 0
      ? h('div', { class: 'an-chart__empty' }, i18n.t('analytics.noData'))
      : h('div', { class: 'an-types' },
          ...entries.map(([type, count]) => h('div', { class: 'an-type' },
            h('span', { class: 'an-type__label' },
              i18n.t(labelMap[type] || 'analytics.evtOther')),
            h('span', { class: 'an-type__value' }, i18n.formatNumber(count)),
          )),
        ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Wiring
// ═══════════════════════════════════════════════════════════
function wire() {
  if (!state.container) return;

  on(state.container, 'click', (e) => {
    const btn = e.target.closest('[data-range]');
    if (!btn) return;
    const d = Number(btn.dataset.range);
    if (d === state.days) return;
    state.days = d;
    load();
  });
}