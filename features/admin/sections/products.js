import { h, qs, on, render } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { api } from '../../../core/api.js';
import { router } from '../../../core/router.js';
import { icons } from '../../../shared/icons/icons.js';

const state = {
  container: null,
  mode:      'list',   // 'list' | 'form'
  list:      [],
  brands:    [],
  search:    '',
  loading:   false,
  // form
  editing:   null,
  form:      {},
  busy:      false,
  confirm:   null,
};

let offEvents = null;

export const products = {
  async mount(container) {
    state.container = container;

    // گوش دادن به تغییر مسیر
    offEvents?.();
    offEvents = events.on('route:changed', onRouteChange);

    handleRoute();
  },
};

function handleRoute() {
  const hash = location.hash.slice(1);
  const m = hash.match(/^\/admin\/products(?:\/([^/]+))?/);
  const idOrNew = m?.[1];

  if (idOrNew === 'new') return openForm(null);
  if (idOrNew) return openForm(idOrNew);
  return openList();
}

function onRouteChange({ path }) {
  if (!state.container) return;
  if (!path.startsWith('/admin/products')) return;
  handleRoute();
}

// ═══════════════════════════════════════════════════════════
//  List
// ═══════════════════════════════════════════════════════════
async function openList() {
  state.mode = 'list';
  state.loading = true;
  renderList();

  try {
    const [list, brands] = await Promise.all([
      api.admin.products.list({ search: state.search }),
      api.admin.brands.list(),
    ]);
    state.list = list;
    state.brands = brands;
  } catch (err) {
    console.error('[admin/products]', err);
  }
  state.loading = false;
  renderList();
}

function renderList() {
  if (!state.container) return;

  const content = h('div', {},
    h('div', { class: 'admin-section-header' },
      h('div', {},
        h('h2', {}, i18n.t('admin.productsTitle')),
        h('p', { style: { fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px' } },
          `${i18n.formatNumber(state.list.length)} ${i18n.t('admin.products')}`),
      ),
      h('div', { class: 'admin-toolbar' },
        h('div', { class: 'admin-search' },
          h('span', { innerHTML: icons.search }),
          h('input', {
            type: 'text',
            placeholder: i18n.t('admin.search'),
            value: state.search,
            oninput: (e) => {
              state.search = e.target.value;
              clearTimeout(state._t);
              state._t = setTimeout(() => openList(), 300);
            },
          }),
        ),
        h('a', { class: 'btn btn--accent', href: '#/admin/products/new' },
          h('span', { style: { display: 'inline-flex' }, innerHTML: icons.plus }),
          h('span', { style: { marginInlineStart: '6px' } }, i18n.t('admin.productNew')),
        ),
      ),
    ),

    state.loading
      ? h('div', { class: 'admin-loading' }, h('span', { class: 'admin-spinner' }), h('span', {}, i18n.t('admin.loading')))
      : state.list.length === 0
        ? h('div', { class: 'admin-empty' }, i18n.t('admin.empty'))
        : ListTable(),
  );

  render(state.container, content);
  wireList();
}

function ListTable() {
  return h('div', { class: 'admin-table-wrap' },
    h('table', { class: 'admin-table' },
      h('thead', {},
        h('tr', {},
          h('th', { style: { width: '60px' } }, ''),
          h('th', {}, i18n.t('admin.productFields.nameFa')),
          h('th', {}, i18n.t('admin.productFields.brand')),
          h('th', {}, i18n.t('admin.productFields.price')),
          h('th', {}, i18n.t('admin.productFields.stock')),
          h('th', {}, ''),
          h('th', { style: { width: '100px', textAlign: 'end' } }, i18n.t('admin.actions')),
        ),
      ),
      h('tbody', {},
        ...state.list.map(p => h('tr', { dataset: { id: p.id } },
          h('td', {},
            h('div', { class: 'admin-table__media' },
              p.cover_url ? h('img', { src: p.cover_url, alt: '', loading: 'lazy' }) : null,
            ),
          ),
          h('td', {},
            h('div', { style: { fontWeight: '600' } }, p.name_fa),
            h('div', { style: { fontSize: '12px', color: 'var(--color-text-tertiary)' } }, p.name_en),
          ),
          h('td', {}, p.brands?.name_fa || '—'),
          h('td', {}, i18n.formatPrice(p.discount_price ?? p.price)),
          h('td', {},
            h('span', { class: `admin-badge ${p.stock > 0 ? 'admin-badge--success' : 'admin-badge--danger'}` },
              i18n.formatNumber(p.stock)),
          ),
          h('td', {},
            p.is_active
              ? h('span', { class: 'admin-badge admin-badge--success' }, i18n.t('admin.productFields.isActive'))
              : h('span', { class: 'admin-badge admin-badge--danger' }, '×'),
            p.is_featured ? h('span', { class: 'admin-badge admin-badge--accent', style: { marginInlineStart: '4px' } }, '★') : null,
          ),
          h('td', {},
            h('div', { class: 'admin-table__actions' },
              h('a', {
                class: 'admin-icon-btn',
                href: `#/admin/products/${p.id}`,
                title: i18n.t('admin.edit'),
                innerHTML: icons.edit,
              }),
              h('button', {
                class: 'admin-icon-btn admin-icon-btn--danger',
                type: 'button',
                title: i18n.t('admin.delete'),
                dataset: { action: 'delete', id: p.id },
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
  if (!state.container) return;

  on(state.container, 'click', (e) => {
    const btn = e.target.closest('[data-action="delete"]');
    if (!btn) return;
    e.preventDefault();
    confirmDelete(btn.dataset.id);
  });
}

function confirmDelete(id) {
  const item = state.list.find(p => p.id === id);
  if (!item) return;

  const overlay = h('div', { class: 'admin-modal-overlay', onclick: (e) => { if (e.target === e.currentTarget) closeConfirm(); } });
  const modal = h('div', { class: 'admin-modal' },
    h('h3', {}, i18n.t('admin.confirmDelete')),
    h('p', {}, `${item.name_fa} — ${i18n.t('admin.confirmDeleteText')}`),
    h('div', { class: 'admin-modal__actions' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: closeConfirm }, i18n.t('admin.cancel')),
      h('button', {
        class: 'btn btn--accent',
        type: 'button',
        style: { background: 'var(--color-danger)' },
        onclick: async () => {
          try {
            await api.admin.products.remove(id);
            events.emit('toast:show', { type: 'success', message: i18n.t('admin.deleted') });
            closeConfirm();
            openList();
          } catch (err) {
            events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
          }
        },
      }, i18n.t('admin.delete')),
    ),
  );
  overlay.append(modal);
  document.body.append(overlay);
  state.confirm = overlay;
}

function closeConfirm() {
  state.confirm?.remove();
  state.confirm = null;
}

// ═══════════════════════════════════════════════════════════
//  Form (create/edit)
// ═══════════════════════════════════════════════════════════
async function openForm(id) {
  state.mode = 'form';
  state.busy = true;
  state.editing = id ? 'edit' : 'new';
  renderForm();

  try {
    const brands = await api.admin.brands.list();
    state.brands = brands;

    if (id) {
      const product = await api.admin.products.getById(id);
      if (!product) { router.navigate('/admin/products'); return; }
      state.form = {
        slug:           product.slug || '',
        name_fa:        product.name_fa || '',
        name_en:        product.name_en || '',
        brand_id:       product.brand_id || '',
        description_fa: product.description_fa || '',
        description_en: product.description_en || '',
        price:          product.price || 0,
        discount_price: product.discount_price ?? '',
        stock:          product.stock || 0,
        cover_url:      product.cover_url || '',
        gallery:        Array.isArray(product.gallery) ? product.gallery : [],
        specs:          product.specs && typeof product.specs === 'object'
                          ? Object.entries(product.specs).map(([k, v]) => ({ key: k, value: v }))
                          : [],
        is_featured:    Boolean(product.is_featured),
        is_active:      product.is_active !== false,
      };
    } else {
      state.form = {
        slug: '', name_fa: '', name_en: '', brand_id: '',
        description_fa: '', description_en: '',
        price: 0, discount_price: '', stock: 0, cover_url: '',
        gallery: [], specs: [],
        is_featured: false, is_active: true,
      };
    }
  } catch (err) {
    console.error('[admin/products] form load failed', err);
    router.navigate('/admin/products');
    return;
  }
  state.busy = false;
  renderForm();
}

function renderForm() {
  if (!state.container) return;

  const isEdit = state.editing === 'edit';

  const content = h('div', {},
    h('div', { class: 'admin-section-header' },
      h('div', {},
        h('h2', {}, isEdit ? i18n.t('admin.productEdit') : i18n.t('admin.productNew')),
      ),
      h('a', { class: 'btn btn--ghost', href: '#/admin/products' },
        i18n.t('admin.backToList')),
    ),
    state.busy
      ? h('div', { class: 'admin-loading' }, h('span', { class: 'admin-spinner' }))
      : FormBody(),
  );

  render(state.container, content);
  requestAnimationFrame(wireForm);
}

function FormBody() {
  const f = state.form;

  return h('form', { class: 'admin-form', onsubmit: onSubmit, novalidate: true },
    // Row 1: name fa / name en
    h('div', { class: 'admin-form__row' },
      TextField('name_fa', 'admin.productFields.nameFa', true),
      TextField('name_en', 'admin.productFields.nameEn', true),
    ),

    // Row 2: slug / brand
    h('div', { class: 'admin-form__row' },
      TextField('slug', 'admin.productFields.slug', true),
      BrandSelect(),
    ),

    // Descriptions
    TextareaField('description_fa', 'admin.productFields.descriptionFa'),
    TextareaField('description_en', 'admin.productFields.descriptionEn'),

    // Row 3: price / discount / stock
    h('div', { class: 'admin-form__row' },
      NumberField('price', 'admin.productFields.price', true, 0),
      NumberField('discount_price', 'admin.productFields.discountPrice', false, 0),
    ),
    h('div', { class: 'admin-form__row' },
      NumberField('stock', 'admin.productFields.stock', true, 0),
      TextField('cover_url', 'admin.productFields.coverUrl'),
    ),

    // Gallery
    GalleryRepeater(),
    // Specs
    SpecsRepeater(),

    // Checkboxes
    h('div', { style: { display: 'flex', gap: '24px', flexWrap: 'wrap' } },
      CheckboxField('is_featured', 'admin.productFields.isFeatured'),
      CheckboxField('is_active',   'admin.productFields.isActive'),
    ),

    // Actions
    h('div', { class: 'admin-form__actions' },
      h('button', {
        class: 'btn btn--accent',
        type: 'submit',
        disabled: state.busy,
      }, state.busy ? i18n.t('admin.saving') : i18n.t('admin.save')),
      h('a', { class: 'btn btn--ghost', href: '#/admin/products' }, i18n.t('admin.cancel')),
    ),
  );
}

function TextField(name, labelKey, required = false, type = 'text') {
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
      oninput: (e) => { state.form[name] = e.target.value; },
    }),
  );
}

function NumberField(name, labelKey, required = false, min = null) {
  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' },
      i18n.t(labelKey),
      required ? h('span', { style: { color: 'var(--color-danger)' } }, ' *') : null,
    ),
    h('input', {
      class: 'admin-field__input',
      type: 'number',
      name,
      value: state.form[name] ?? '',
      min: min ?? undefined,
      required: required || undefined,
      oninput: (e) => { state.form[name] = e.target.value === '' ? '' : Number(e.target.value); },
    }),
  );
}

function TextareaField(name, labelKey) {
  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' }, i18n.t(labelKey)),
    h('textarea', {
      class: 'admin-field__textarea',
      name,
      oninput: (e) => { state.form[name] = e.target.value; },
    }, state.form[name] ?? ''),
  );
}

function CheckboxField(name, labelKey) {
  return h('label', { class: 'admin-field__checkbox' },
    h('input', {
      type: 'checkbox',
      name,
      checked: Boolean(state.form[name]),
      onchange: (e) => { state.form[name] = e.target.checked; },
    }),
    i18n.t(labelKey),
  );
}

function BrandSelect() {
  const sel = h('select', {
    class: 'admin-field__select',
    name: 'brand_id',
    required: true,
    onchange: (e) => { state.form.brand_id = e.target.value; },
  },
    h('option', { value: '', disabled: true, selected: !state.form.brand_id },
      i18n.t('admin.productFields.selectBrand')),
    ...state.brands.map(b => h('option', {
      value: b.id,
      selected: state.form.brand_id === b.id,
    }, `${b.name_fa} (${b.name_en})`)),
  );

  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' },
      i18n.t('admin.productFields.brand'),
      h('span', { style: { color: 'var(--color-danger)' } }, ' *'),
    ),
    sel,
  );
}

function GalleryRepeater() {
  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' }, i18n.t('admin.productFields.gallery')),
    h('div', { class: 'admin-repeater', dataset: { role: 'gallery-repeater' } },
      ...state.form.gallery.map((url, idx) => GalleryRow(url, idx)),
      h('button', {
        class: 'admin-repeater__add',
        type: 'button',
        dataset: { role: 'gallery-add' },
        onclick: () => {
          state.form.gallery.push('');
          refreshRepeater('gallery');
        },
      },
        h('span', { innerHTML: icons.plus }),
        h('span', {}, i18n.t('admin.productFields.addGallery')),
      ),
    ),
  );
}

function GalleryRow(url, idx) {
  return h('div', { class: 'admin-repeater__row', dataset: { idx: String(idx) } },
    h('input', {
      class: 'admin-field__input',
      type: 'url',
      value: url,
      placeholder: 'https://…',
      oninput: (e) => { state.form.gallery[idx] = e.target.value; },
    }),
    h('button', {
      class: 'admin-icon-btn admin-icon-btn--danger',
      type: 'button',
      onclick: () => {
        state.form.gallery.splice(idx, 1);
        refreshRepeater('gallery');
      },
      innerHTML: icons.trash,
    }),
  );
}

function SpecsRepeater() {
  return h('div', { class: 'admin-field' },
    h('label', { class: 'admin-field__label' }, i18n.t('admin.productFields.specs')),
    h('div', { class: 'admin-repeater', dataset: { role: 'specs-repeater' } },
      ...state.form.specs.map((pair, idx) => SpecRow(pair, idx)),
      h('button', {
        class: 'admin-repeater__add',
        type: 'button',
        onclick: () => {
          state.form.specs.push({ key: '', value: '' });
          refreshRepeater('specs');
        },
      },
        h('span', { innerHTML: icons.plus }),
        h('span', {}, i18n.t('admin.productFields.addSpec')),
      ),
    ),
  );
}

function SpecRow(pair, idx) {
  return h('div', { class: 'admin-repeater__row admin-repeater__row--2', dataset: { idx: String(idx) } },
    h('input', {
      class: 'admin-field__input',
      type: 'text',
      value: pair.key,
      placeholder: i18n.t('admin.productFields.specKey'),
      oninput: (e) => { state.form.specs[idx].key = e.target.value; },
    }),
    h('input', {
      class: 'admin-field__input',
      type: 'text',
      value: pair.value,
      placeholder: i18n.t('admin.productFields.specValue'),
      oninput: (e) => { state.form.specs[idx].value = e.target.value; },
    }),
    h('button', {
      class: 'admin-icon-btn admin-icon-btn--danger',
      type: 'button',
      onclick: () => {
        state.form.specs.splice(idx, 1);
        refreshRepeater('specs');
      },
      innerHTML: icons.trash,
    }),
  );
}

function refreshRepeater(kind) {
  if (!state.container) return;
  const old = qs(`[data-role="${kind}-repeater"]`, state.container);
  if (!old) return;
  const fresh = kind === 'gallery' ? GalleryRepeater().querySelector('.admin-repeater') : SpecsRepeater().querySelector('.admin-repeater');
  old.replaceWith(fresh);
}

function wireForm() {
  // خودکارسازی slug از name_en
  if (state.editing !== 'new') return;
  const nameEn = qs('[name="name_en"]', state.container);
  const slug   = qs('[name="slug"]', state.container);
  if (!nameEn || !slug) return;

  on(nameEn, 'input', () => {
    if (state.form.slug) return;
    state.form.slug = slugify(nameEn.value);
    slug.value = state.form.slug;
  });
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function onSubmit(e) {
  e.preventDefault();
  if (state.busy) return;

  // اعتبارسنجی
  const f = state.form;
  if (!f.name_fa || !f.name_en || !f.slug || !f.brand_id) {
    events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
    return;
  }

  state.busy = true;
  renderForm();

  // ساخت payload
  const specs = {};
  f.specs.forEach(s => {
    const k = (s.key || '').trim();
    const v = (s.value || '').trim();
    if (k && v) specs[k] = v;
  });

  const payload = {
    slug:           f.slug.trim(),
    name_fa:        f.name_fa.trim(),
    name_en:        f.name_en.trim(),
    brand_id:       f.brand_id,
    description_fa: f.description_fa?.trim() || null,
    description_en: f.description_en?.trim() || null,
    price:          Number(f.price) || 0,
    discount_price: f.discount_price === '' || f.discount_price == null
                      ? null : Number(f.discount_price),
    stock:          Number(f.stock) || 0,
    cover_url:      f.cover_url?.trim() || null,
    gallery:        f.gallery.map(u => u.trim()).filter(Boolean),
    specs,
    is_featured:    Boolean(f.is_featured),
    is_active:      Boolean(f.is_active),
  };

  try {
    if (state.editing === 'edit') {
      const id = location.hash.split('/').pop();
      await api.admin.products.update(id, payload);
      events.emit('toast:show', { type: 'success', message: i18n.t('admin.updated') });
    } else {
      await api.admin.products.create(payload);
      events.emit('toast:show', { type: 'success', message: i18n.t('admin.created') });
    }
    router.navigate('/admin/products');
  } catch (err) {
    console.error('[admin/products] save failed', err);
    state.busy = false;
    events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
    renderForm();
  }
}