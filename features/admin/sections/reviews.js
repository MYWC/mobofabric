import { h, qs, on, render } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { api } from '../../../core/api.js';
import { icons } from '../../../shared/icons/icons.js';

const state = {
  container: null,
  list:      [],
  filter:    'all',
  loading:   false,
};

let offEvents = null;

export const reviews = {
  async mount(container) {
    state.container = container;
    offEvents?.();
    offEvents = events.on('route:changed', ({ path }) => {
      if (!state.container) return;
      if (path === '/admin/reviews') openList();
    });
    openList();
  },
};

async function openList() {
  state.loading = true;
  renderList();
  try {
    state.list = await api.admin.reviews.list({ filter: state.filter });
  } catch (err) { console.error(err); }
  state.loading = false;
  renderList();
}

function renderList() {
  if (!state.container) return;

  render(state.container, h('div', {},
    h('div', { class: 'admin-section-header' },
      h('div', {},
        h('h2', {}, i18n.t('admin.reviewsTitle')),
        h('p', { style: { fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px' } },
          `${i18n.formatNumber(state.list.length)} ${i18n.t('admin.reviews')}`),
      ),
      h('div', { class: 'admin-filters' },
        FilterBtn('all',      'admin.all'),
        FilterBtn('pending',  'admin.pending'),
        FilterBtn('approved', 'admin.approved'),
      ),
    ),
    state.loading
      ? h('div', { class: 'admin-loading' }, h('span', { class: 'admin-spinner' }))
      : state.list.length === 0
        ? h('div', { class: 'admin-empty' }, i18n.t('admin.empty'))
        : Table(),
  ));
  wire();
}

function FilterBtn(value, labelKey) {
  return h('button', {
    class: `admin-filter-btn ${state.filter === value ? 'is-active' : ''}`,
    type: 'button',
    onclick: () => { state.filter = value; openList(); },
  }, i18n.t(labelKey));
}

function Table() {
  return h('div', { class: 'admin-table-wrap' },
    h('table', { class: 'admin-table' },
      h('thead', {},
        h('tr', {},
          h('th', {}, i18n.t('admin.reviewBy')),
          h('th', {}, i18n.t('admin.reviewOnProduct')),
          h('th', {}, i18n.t('admin.reviewRating')),
          h('th', {}, i18n.t('admin.reviewComment')),
          h('th', {}, i18n.t('admin.reviewDate')),
          h('th', {}, ''),
          h('th', { style: { textAlign: 'end' } }, i18n.t('admin.actions')),
        ),
      ),
      h('tbody', {},
        ...state.list.map(r => h('tr', { dataset: { id: r.id } },
          h('td', { style: { fontWeight: '600' } }, r.name),
          h('td', {}, r.products?.name_fa || '—'),
          h('td', {}, starsMini(r.rating)),
          h('td', { style: { maxWidth: '400px' } }, truncate(r.comment, 100)),
          h('td', { style: { whiteSpace: 'nowrap' } }, formatDate(r.created_at)),
          h('td', {},
            r.is_approved
              ? h('span', { class: 'admin-badge admin-badge--success' }, i18n.t('admin.approved'))
              : h('span', { class: 'admin-badge admin-badge--warning' }, i18n.t('admin.pending')),
          ),
          h('td', {},
            h('div', { class: 'admin-table__actions' },
              !r.is_approved
                ? h('button', {
                    class: 'admin-icon-btn',
                    type: 'button',
                    title: i18n.t('admin.reviewApprove'),
                    style: { color: 'var(--color-success)' },
                    dataset: { action: 'approve', id: r.id },
                    innerHTML: icons.check,
                  })
                : h('button', {
                    class: 'admin-icon-btn',
                    type: 'button',
                    title: i18n.t('admin.reviewReject'),
                    dataset: { action: 'reject', id: r.id },
                    innerHTML: icons.close,
                  }),
              h('button', {
                class: 'admin-icon-btn admin-icon-btn--danger',
                type: 'button',
                title: i18n.t('admin.delete'),
                dataset: { action: 'delete', id: r.id },
                innerHTML: icons.trash,
              }),
            ),
          ),
        )),
      ),
    ),
  );
}

function wire() {
  if (!state.container) return;

  on(state.container, 'click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;
    e.preventDefault();

    try {
      if (action === 'approve') {
        await api.admin.reviews.setApproval(id, true);
        events.emit('toast:show', { type: 'success', message: i18n.t('admin.reviewApproved') });
        openList();
      } else if (action === 'reject') {
        await api.admin.reviews.setApproval(id, false);
        events.emit('toast:show', { type: 'info', message: i18n.t('admin.reviewRejected') });
        openList();
      } else if (action === 'delete') {
        confirmDelete(id);
      }
    } catch (err) {
      console.error(err);
      events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
    }
  });
}

function confirmDelete(id) {
  const item = state.list.find(r => r.id === id);
  if (!item) return;

  const overlay = h('div', { class: 'admin-modal-overlay', onclick: (e) => { if (e.target === e.currentTarget) overlay.remove(); } });
  overlay.append(h('div', { class: 'admin-modal' },
    h('h3', {}, i18n.t('admin.confirmDelete')),
    h('p', {}, `${item.name} — ${i18n.t('admin.confirmDeleteText')}`),
    h('div', { class: 'admin-modal__actions' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => overlay.remove() }, i18n.t('admin.cancel')),
      h('button', {
        class: 'btn btn--accent',
        type: 'button',
        style: { background: 'var(--color-danger)' },
        onclick: async () => {
          try {
            await api.admin.reviews.remove(id);
            events.emit('toast:show', { type: 'success', message: i18n.t('admin.deleted') });
            overlay.remove();
            openList();
          } catch (err) {
            events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
          }
        },
      }, i18n.t('admin.delete')),
    ),
  ));
  document.body.append(overlay);
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
  try {
    return new Intl.DateTimeFormat(i18n.getLang() === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    }).format(new Date(iso));
  } catch { return ''; }
}