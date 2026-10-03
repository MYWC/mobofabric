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
  confirm:   null,
};

let offEvents = null;

export const brands = {
  async mount(container) {
    state.container = container;
    offEvents?.();
    offEvents = events.on('route:changed', onRouteChange);
    handleRoute();
  },
};

function handleRoute() {
  const hash = location.hash.slice(1);
  const m = hash.match(/^\/admin\/brands(?:\/([^/]+))?/);
  const idOrNew = m?.[1];

  if (idOrNew === 'new') return openForm(null);
  if (idOrNew) return openForm(idOrNew);
  return openList();
}

function onRouteChange({ path }) {
  if (!state.container) return;
  if (!path.startsWith('/admin/brands')) return;
  handleRoute();
}

async function openList() {
  state.loading = true;
  renderList();
  try {
    state.list = await api.admin.brands.list();
  } catch (err) { console.error(err); }
  state.loading = false;
  renderList();
}

function renderList() {
  if (!state.container) return;

  render(state.container, h('div', {},
    h('div', { class: 'admin-section-header' },
      h('div', {},
        h('h2', {}, i18n.t('admin.brandsTitle')),
        h('p', { style: { fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px' } },
          `${i18n.formatNumber(state.list.length)} ${i18n.t('admin.brands')}`),
      ),
      h('a', { class: 'btn btn--accent', href: '#/admin/brands/new' },
        h('span', { style: { display: 'inline-flex' }, innerHTML: icons.plus }),
        h('span', { style: { marginInlineStart: '6px' } }, i18n.t('admin.brandNew')),
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
  return h('div', { class: 'admin-table-wrap' },
    h('table', { class: 'admin-table' },
      h('thead', {},
        h('tr', {},
          h('th', {}, i18n.t('admin.brandFields.slug')),
          h('th', {}, i18n.t('admin.brandFields.nameFa')),
          h('th', {}, i18n.t('admin.brandFields.nameEn')),
          h('th', {}, i18n.t('admin.brandFields.sortOrder')),
          h('th', { style: { textAlign: 'end' } }, i18n.t('admin.actions')),
        ),
      ),
      h('tbody', {},
        ...state.list.map(b => h('tr', {},
          h('td', {}, h('code', { style: { fontSize: '12px' } }, b.slug)),
          h('td', { style: { fontWeight: '600' } }, b.name_fa),
          h('td', {}, b.name_en),
          h('td', {}, i18n.formatNumber(b.sort_order)),
          h('td', {},
            h('div', { class: 'admin-table__actions' },
              h('a', { class: 'admin-icon-btn', href: `#/admin/brands/${b.id}`, innerHTML: icons.edit }),
              h('button', {
                class: 'admin-icon-btn admin-icon-btn--danger',
                type: 'button',
                dataset: { action: 'delete', id: b.id },
                innerHTML: icons.trash,
              }),
            ),
          ),
        )),
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
  const item = state.list.find(b => b.id === id);
  if (!item) return;

  const overlay = h('div', { class: 'admin-modal-overlay', onclick: (e) => { if (e.target === e.currentTarget) overlay.remove(); } });
  overlay.append(h('div', { class: 'admin-modal' },
    h('h3', {}, i18n.t('admin.confirmDelete')),
    h('p', {}, `${item.name_fa} — ${i18n.t('admin.confirmDeleteText')}`),
    h('div', { class: 'admin-modal__actions' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => overlay.remove() }, i18n.t('admin.cancel')),
      h('button', {
        class: 'btn btn--accent',
        type: 'button',
        style: { background: 'var(--color-danger)' },
        onclick: async () => {
          try {
            await api.admin.brands.remove(id);
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
      const b = await api.admin.brands.getById(id);
      if (!b) { router.navigate('/admin/brands'); return; }
      state.form = {
        slug:       b.slug || '',
        name_fa:    b.name_fa || '',
        name_en:    b.name_en || '',
        logo_url:   b.logo_url || '',
        sort_order: b.sort_order || 0,
      };
    } else {
      state.form = { slug: '', name_fa: '', name_en: '', logo_url: '', sort_order: 0 };
    }
  } catch (err) { router.navigate('/admin/brands'); return; }
  state.busy = false;
  renderForm();
}

function renderForm() {
  if (!state.container) return;
  const isEdit = state.editing === 'edit';

  render(state.container, h('div', {},
    h('div', { class: 'admin-section-header' },
      h('h2', {}, isEdit ? i18n.t('admin.brandEdit') : i18n.t('admin.brandNew')),
      h('a', { class: 'btn btn--ghost', href: '#/admin/brands' }, i18n.t('admin.backToList')),
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
      Field('name_fa', 'admin.brandFields.nameFa', true),
      Field('name_en', 'admin.brandFields.nameEn', true),
    ),
    h('div', { class: 'admin-form__row' },
      Field('slug', 'admin.brandFields.slug', true),
      Field('sort_order', 'admin.brandFields.sortOrder', false, 'number'),
    ),
    Field('logo_url', 'admin.brandFields.logoUrl'),
    h('div', { class: 'admin-form__actions' },
      h('button', { class: 'btn btn--accent', type: 'submit', disabled: state.busy },
        state.busy ? i18n.t('admin.saving') : i18n.t('admin.save')),
      h('a', { class: 'btn btn--ghost', href: '#/admin/brands' }, i18n.t('admin.cancel')),
    ),
  );
}

function Field(name, labelKey, required = false, type = 'text') {
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
      oninput: (e) => { state.form[name] = type === 'number' ? Number(e.target.value) : e.target.value; },
    }),
  );
}

async function onSubmit(e) {
  e.preventDefault();
  if (state.busy) return;
  const f = state.form;
  if (!f.name_fa || !f.name_en || !f.slug) {
    events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
    return;
  }

  state.busy = true;
  renderForm();

  const payload = {
    slug:       f.slug.trim(),
    name_fa:    f.name_fa.trim(),
    name_en:    f.name_en.trim(),
    logo_url:   f.logo_url?.trim() || null,
    sort_order: Number(f.sort_order) || 0,
  };

  try {
    if (state.editing === 'edit') {
      const id = location.hash.split('/').pop();
      await api.admin.brands.update(id, payload);
      events.emit('toast:show', { type: 'success', message: i18n.t('admin.updated') });
    } else {
      await api.admin.brands.create(payload);
      events.emit('toast:show', { type: 'success', message: i18n.t('admin.created') });
    }
    router.navigate('/admin/brands');
  } catch (err) {
    console.error(err);
    state.busy = false;
    events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
    renderForm();
  }
}