import { h, qs, on, render } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { api } from '../../../core/api.js';
import { icons } from '../../../shared/icons/icons.js';

export const dashboard = {
  async mount(container) {
    render(container, LoadingView());

    try {
      const [stats, recentReviews] = await Promise.all([
        api.admin.stats.dashboard(),
        api.admin.reviews.list({ filter: 'all', limit: 5 }),
      ]);

      render(container, View(stats, recentReviews));
    } catch (err) {
      console.error('[admin/dashboard]', err);
      render(container, h('div', { class: 'admin-empty' }, i18n.t('admin.errorLoad')));
    }
  },
};

function LoadingView() {
  return h('div', { class: 'admin-loading' },
    h('span', { class: 'admin-spinner' }),
    h('span', {}, i18n.t('admin.loading')),
  );
}

function View(stats, recentReviews) {
  const cards = [
    { key: 'products',       label: 'admin.totalProducts',  icon: 'box',       value: stats.products },
    { key: 'brands',         label: 'admin.totalBrands',    icon: 'tag',       value: stats.brands },
    { key: 'reviews',        label: 'admin.totalReviews',   icon: 'star',      value: stats.reviews, extra: stats.reviewsPending > 0 ? { text: `${i18n.formatNumber(stats.reviewsPending)} ${i18n.t('admin.pending')}`, type: 'warning' } : null },
    { key: 'discounts',      label: 'admin.totalDiscounts', icon: 'tag',       value: stats.discounts },
    { key: 'discountsActive',label: 'admin.activeDiscounts',icon: 'check',     value: stats.discountsActive },
  ];

  return h('div', {},
    // Stats
    h('div', { class: 'admin-stats' },
      ...cards.map(c => StatCard(c)),
    ),

    // Quick actions
    h('section', { style: { marginBottom: '32px' } },
      h('h2', { style: { fontSize: '18px', marginBottom: '16px' } }, i18n.t('admin.quickActions')),
      h('div', { class: 'admin-quick' },
        QuickItem('admin.productNew',  'box',  '#/admin/products',   icons.plus),
        QuickItem('admin.brandNew',    'tag',  '#/admin/brands',     icons.plus),
        QuickItem('admin.discountNew', 'tag',  '#/admin/discounts',  icons.plus),
        QuickItem('admin.reviewsTitle','star', '#/admin/reviews',    icons.external),
      ),
    ),

    // Recent reviews
    recentReviews.length > 0
      ? h('section', {},
          h('h2', { style: { fontSize: '18px', marginBottom: '16px' } }, i18n.t('admin.recentReviews')),
          h('div', { class: 'admin-table-wrap' },
            h('table', { class: 'admin-table' },
              h('thead', {},
                h('tr', {},
                  h('th', {}, i18n.t('admin.reviewBy')),
                  h('th', {}, i18n.t('admin.reviewOnProduct')),
                  h('th', {}, i18n.t('admin.reviewRating')),
                  h('th', {}, i18n.t('admin.reviewComment')),
                  h('th', {}, i18n.t('admin.reviewDate')),
                ),
              ),
              h('tbody', {},
                ...recentReviews.map(r => h('tr', {},
                  h('td', {}, r.name),
                  h('td', {}, productName(r.products)),
                  h('td', {}, starsMini(r.rating)),
                  h('td', { style: { maxWidth: '360px' } }, truncate(r.comment, 80)),
                  h('td', {}, formatDate(r.created_at)),
                )),
              ),
            ),
          ),
        )
      : null,
  );
}

function StatCard({ label, icon, value, extra }) {
  return h('article', { class: 'admin-stat' },
    h('div', { class: 'admin-stat__icon', innerHTML: icons[icon] }),
    h('div', { class: 'admin-stat__value' }, i18n.formatNumber(value)),
    h('div', { class: 'admin-stat__label' }, i18n.t(label)),
    extra ? h('span', { class: `admin-badge admin-badge--${extra.type}`, style: { width: 'fit-content', marginTop: '4px' } }, extra.text) : null,
  );
}

function QuickItem(labelKey, iconKey, href, iconRight) {
  return h('a', { class: 'admin-quick__item', href },
    h('span', { innerHTML: icons[iconKey] }),
    h('span', { style: { flex: '1' } }, i18n.t(labelKey)),
    h('span', { style: { opacity: '0.5' }, innerHTML: iconRight }),
  );
}

function productName(p) {
  if (!p) return '—';
  return i18n.localizeField(p, 'name');
}

function starsMini(n) {
  const full = Math.round(n);
  return h('span', { style: { color: 'var(--color-warning)', fontSize: '13px', letterSpacing: '1px' } },
    '★'.repeat(full) + '☆'.repeat(5 - full));
}

function truncate(str, n) {
  const s = String(str || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat(i18n.getLang() === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}