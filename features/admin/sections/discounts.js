import { h, qs, on, render } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { api } from '../../../core/api.js';
import { router } from '../../../core/router.js';
import { icons } from '../../../shared/icons/icons.js';

const state = {
  container: null,
  list:      [],
  loading:   false,
  editing:   null,
  form:      {},
  busy:      false,
};

let offEvents = null;

export const discounts = {
  async mount(container) {
    state.container = container;
    offEvents?.();
    offEvents = events.on('route:changed', onRouteChange);
    handleRoute();
  },
};

function handleRoute() {
  const hash = location.hash.slice(1);
  const m = hash.match(/^\/admin\/discounts(?:\/([^/]+))?/);
  const idOrNew = m?.[1];
  if (idOrNew === 'new') return openForm(null);
  if (idOrNew) return openForm(idOrNew);
  return openList();
}

function onRouteChange({ path }) {
  if (!state.container) return;
  if (!path.startsWith('/admin/discounts')) return;
  handleRoute();
}

async function openList() {
  state.loading = true;
  renderList();
  try {
    state.list = await api.admin.discounts.list();
  } catch (err) { console.error(err); }
  state.loading = false;
  renderList();
}

function renderList() {
  if (!state.container) return;

  render(state.container, h('div', {},
    h('div', { class: 'admin-section-header' },
      h('div', {},
        h('h2', {}, i18n.t('admin.discountsTitle')),
        h('p', { style: { fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px' } },
          `${i18n.formatNumber(state.list.length)} ${i18n.t('admin.discounts')}`),
      ),
      h('a', { class: 'btn btn--accent', href: '#/admin/discounts/new' },
        h('span', { style: { display: 'inline-flex' }, innerHTML: icons.plus }),
        h('span', { style: { marginInlineStart: '6px' } }, i18n.t('admin.discountNew')),
      ),
    ),
    state.loading
      ? h('div', { class: 'admin-loading' }, h('span', { class: 'admin-spinner' }))
      : state.list.length === 0
        ? h('div', { class: 'admin-empty' }, i18n.t('admin.empty'))
        : Table(),
  ));
  wireList();
}

function Table() {
  const now = Date.now();
  return h('div', { class: 'admin-table-wrap' },
    h('table', { class: 'admin-table' },
      h('thead', {},
        h('tr', {},
          h('th', {}, i18n.t('admin.discountFields.code')),
          h('th', {}, i18n.t('admin.discountFields.type')),
          h('th', {}, i18n.t('admin.discountFields.value')),
          h('th', {}, i18n.t('admin.discountFields.minOrderAmount')),
          h('th', {}, i18n.t('admin.discountFields.expiresAt')),
          h('th', {}, i18n.t('admin.discountFields.usageCount')),
          h('th', {}, ''),
          h('th', { style: { textAlign: 'end' } }, i18n.t('admin.actions')),
        ),
      ),
      h('tbody', {},
        ...state.list.map(d => {
          const expired = d.expires_at && new Date(d.expires_at).getTime() < now;
          const notStarted = d.starts_at && new Date(d.starts_at).getTime() > now;
          return h('tr', {},
            h('td', {}, h('code', { style: { fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em' } }, d.code)),
            h('td', {},
              h('span', { class: 'admin-badge' },
                i18n.t(d.type === 'percent' ? 'admin.discountFields.typePercent' : 'admin.discountFields.typeFixed')),
            ),
            h('td', {},
              d.type === 'percent'
                ? i18n.t('admin.discountValuePercent', { n: i18n.formatNumber(d.value) })
                : i18n.t('admin.discountValueFixed', { n: i18n.formatNumber(d.value) }),
            ),
            h('td', {}, i18n.formatPrice(d.min_order_amount)),
            h('td', {}, d.expires_at ? formatDate(d.expires_at) : i18n.t('admin.noExpiry')),
            h('td', {}, `${i18n.formatNumber(d.usage_count)}${d.usage_limit ? ' / ' + i18n.formatNumber(d.usage_limit) : ''}`),
            h('td', {},
              !d.is_active ? h('span', { class: 'admin-badge admin-badge--danger' }, '×')
                : expired ? h('span', { class: 'admin-badge admin-badge--danger' }, 'Exp')
                : notStarted ? h('span', { class: 'admin-badge admin-badge--warning' }, 'Soon')
                : h('span', { class: 'admin-badge admin-badge--success' }, '✓'),
            ),
            h('td', {},
              h('div', { class: 'admin-table__actions' },
                h('a', { class: 'admin-icon-btn', href: `#/admin/discounts/${d.id}`, innerHTML: icons.edit }),
                h('button', {
                  class: 'admin-icon-btn admin-icon-btn--danger',
                  type: 'button',
                  dataset: { action: 'delete', id: d.id },
                  innerHTML: icons.trash,
                }),
              ),
            ),
          );
        }),
      ),
    ),
  );
}

function wireList() {
  on(state.container, 'click', (e) => {
    const btn = e.target.closest('[data-action="delete"]');
    if (!btn) return;
    e.preventDefault();
    confirmDelete(btn.dataset.id);
  });
}

function confirmDelete(id) {
  const item = state.list.find(d => d.id === id);
  if (!item) return;

  const overlay = h('div', { class: 'admin-modal-overlay', onclick: (e) => { if (e.target === e.currentTarget) overlay.remove(); } });
  overlay.append(h('div', { class: 'admin-modal' },
    h('h3', {}, i18n.t('admin.confirmDelete')),
    h('p', {}, `${item.code} — ${i18n.t('admin.confirmDeleteText')}`),
    h('div', { class: 'admin-modal__actions' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => overlay.remove() }, i18n.t('admin.cancel')),
      h('button', {
        class: 'btn btn--accent',
        type: 'button',
        style: { background: 'var(--color-danger)' },
        onclick: async () => {
          try {
            await api.admin.discounts.remove(id);
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

async function openForm(id) {
  state.editing = id ? 'edit' : 'new';
  state.busy = true;
  renderForm();

  try {
    if (id) {
      const d = await api.admin.discounts.getById(id);
      if (!d) { router.navigate('/admin/discounts'); return; }
      state.form = {
        code:             d.code || '',
        type:             d.type || 'percent',
        value:            d.value || 0,
        min_order_amount: d.min_order_amount || 0,
        max_discount:     d.max_discount ?? '',
        starts_at:        toLocalInput(d.starts_at),
        expires_at:       toLocalInput(d.expires_at),
        usage_limit:      d.usage_limit ?? '',
        is_active:        d.is_active !== false,
        description_fa:   d.description_fa || '',
        description_en:   d.description_en || '',
      };
    } else {
      state.form = {
        code: '', type: 'percent', value: 10,
        min_order_amount: 0, max_discount: '',
        starts_at: toLocalInput(new Date().toISOString()),
        expires_at: '', usage_limit: '',
        is_active: true, description_fa: '', description_en: '',
      };
    }
  } catch (err) { router.navigate('/admin/discounts'); return; }
  state.busy = false;
  renderForm();
}

function toLocalInput(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

function renderForm() {
  if (!state.container) return;
  const isEdit = state.editing === 'edit';

  render(state.container, h('div', {},
    h('div', { class: 'admin-section-header' },
      h('h2', {}, isEdit ? i18n.t('admin.discountEdit') : i18n.t('admin.discountNew')),
      h('a', { class: 'btn btn--ghost', href: '#/admin/discounts' }, i18n.t('admin.backToList')),
    ),
    state.busy
      ? h('div', { class: 'admin-loading' }, h('span', { class: 'admin-spinner' }))
      : FormBody(),
  ));
}

function FormBody() {
  const f = state.form;
  return h('form', { class: 'admin-form', onsubmit: onSubmit, novalidate: true },
    h('div', { class: 'admin-form__row' },
      TextField('code', 'admin.discountFields.code', true, 'text', { style: 'text-transform: uppercase; letter-spacing: 0.05em; font-family: ui-monospace, monospace; font-weight: 700;' }),
      TypeSelect(),
    ),
    h('div', { class: 'admin-form__row' },
      NumberField('value', 'admin.discountFields.value', true),
      NumberField('min_order_amount', 'admin.discountFields.minOrderAmount'),
    ),
    h('div', { class: 'admin-form__row' },
      NumberField('max_discount', 'admin.discountFields.maxDiscount'),
      NumberField('usage_limit', 'admin.discountFields.usageLimit'),
    ),
    h('div', { class: 'admin-form__row' },
      DateTimeField('starts_at', 'admin.discountFields.startsAt'),
      DateTimeField('expires_at', 'admin.discountFields.expiresAt'),
    ),
    h('div', { class: 'admin-form__row' },
      TextField('description_fa', 'admin.discountFields.descriptionFa'),
      TextField('description_en', 'admin.discountFields.descriptionEn'),
    ),
    h('label', { class: 'admin-field__checkbox' },
      h('input', {
        type: 'checkbox',
        checked: Boolean(f.is_active),
        onchange: (e) => { state.form.is_active = e.target.checked; },
      }),
      i18n.t('admin.discountFields.isActive'),
    ),
    h('div', { class: 'admin-form__actions' },
      h('button', { class: 'btn btn--accent', type: 'submit', disabled: state.busy },
        state.busy ? i18n.t('admin.saving') : i18n.t('admin.save')),
      h('a', { class: 'btn btn--ghost', href: '#/admin/discounts' }, i18n.t('admin.cancel')),
    ),
  );
}

function TextField(name, labelKey, required = false, type = 'text', style = {}) {
  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' },
      i18n.t(labelKey),
      required ? h('span', { style: { color: 'var(--color-danger)' } }, ' *') : null,
    ),
    h('input', {
      class: 'admin-field__input',
      type,
      name,
      value: state.form[name] ?? '',
      required: required || undefined,
      style,
      oninput: (e) => { state.form[name] = e.target.value; },
    }),
  );
}

function NumberField(name, labelKey, required = false) {
  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' },
      i18n.t(labelKey),
      required ? h('span', { style: { color: 'var(--color-danger)' } }, ' *') : null,
    ),
    h('input', {
      class: 'admin-field__input',
      type: 'number',
      min: '0',
      name,
      value: state.form[name] ?? '',
      required: required || undefined,
      oninput: (e) => { state.form[name] = e.target.value === '' ? '' : Number(e.target.value); },
    }),
  );
}

function DateTimeField(name, labelKey) {
  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' }, i18n.t(labelKey)),
    h('input', {
      class: 'admin-field__input',
      type: 'datetime-local',
      name,
      value: state.form[name] ?? '',
      oninput: (e) => { state.form[name] = e.target.value; },
    }),
  );
}

function TypeSelect() {
  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' },
      i18n.t('admin.discountFields.type'),
      h('span', { style: { color: 'var(--color-danger)' } }, ' *'),
    ),
    h('select', {
      class: 'admin-field__select',
      onchange: (e) => { state.form.type = e.target.value; },
    },
      h('option', { value: 'percent', selected: state.form.type === 'percent' },
        i18n.t('admin.discountFields.typePercent')),
      h('option', { value: 'fixed', selected: state.form.type === 'fixed' },
        i18n.t('admin.discountFields.typeFixed')),
    ),
  );
}

async function onSubmit(e) {
  e.preventDefault();
  if (state.busy) return;
  const f = state.form;
  if (!f.code || !f.value) {
    events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
    return;
  }

  state.busy = true;
  renderForm();

  const payload = {
    code:             f.code.trim().toUpperCase(),
    type:             f.type,
    value:            Number(f.value),
    min_order_amount: Number(f.min_order_amount) || 0,
    max_discount:     f.max_discount === '' ? null : Number(f.max_discount),
    starts_at:        f.starts_at ? new Date(f.starts_at).toISOString() : new Date().toISOString(),
    expires_at:       f.expires_at ? new Date(f.expires_at).toISOString() : null,
    usage_limit:      f.usage_limit === '' ? null : Number(f.usage_limit),
    is_active:        Boolean(f.is_active),
    description_fa:   f.description_fa?.trim() || null,
    description_en:   f.description_en?.trim() || null,
  };

  try {
    if (state.editing === 'edit') {
      const id = location.hash.split('/').pop();
      await api.admin.discounts.update(id, payload);
      events.emit('toast:show', { type: 'success', message: i18n.t('admin.updated') });
    } else {
      await api.admin.discounts.create(payload);
      events.emit('toast:show', { type: 'success', message: i18n.t('admin.created') });
    }
    router.navigate('/admin/discounts');
  } catch (err) {
    console.error(err);
    state.busy = false;
    events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
    renderForm();
  }
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat(i18n.getLang() === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    }).format(new Date(iso));
  } catch { return ''; }
}