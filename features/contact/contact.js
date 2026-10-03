import { h, qs, qsa, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { router } from '../../core/router.js';
import { icons } from '../../shared/icons/icons.js';
import { contactLang } from './contact.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  container:   null,
  form:        { name: '', email: '', phone: '', subject: '', message: '' },
  errors:      {},
  touched:     {},
  submitting:  false,
  submitted:   false,
  openFaq:     -1,
};

let offLang = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const contact = {
  register() {
    i18n.register('contact', contactLang);
    router.register('/contact', () => showPage());

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════
function showPage() {
  state.container = qs('#app');
  state.form = { name: '', email: '', phone: '', subject: '', message: '' };
  state.errors = {};
  state.touched = {};
  state.submitting = false;
  state.submitted = false;
  state.openFaq = -1;
  renderPage();
}

function renderPage() {
  if (!state.container) return;

  const page = h('div', { class: 'contact-page' },
    Hero(),
    h('div', { class: 'container contact-content' },
      state.submitted ? SuccessState() : Form(),
      InfoCards(),
    ),
    Faq(),
  );

  render(state.container, page);
  if (!state.submitted) requestAnimationFrame(wireForm);
}

// ═══════════════════════════════════════════════════════════
//  Sections
// ═══════════════════════════════════════════════════════════
function Hero() {
  return h('section', { class: 'contact-hero' },
    h('div', { class: 'container contact-hero__inner' },
      h('h1', { class: 'contact-hero__title' }, i18n.t('contact.heroTitle')),
      h('p',  { class: 'contact-hero__subtitle' }, i18n.t('contact.heroSubtitle')),
    ),
  );
}

function Form() {
  return h('section', { class: 'contact-form-section' },
    h('header', { class: 'contact-form__header' },
      h('h2', { class: 'contact-form__title' }, i18n.t('contact.formTitle')),
      h('p',  { class: 'contact-form__subtitle' }, i18n.t('contact.formSubtitle')),
    ),
    h('form', { class: 'contact-form', novalidate: true, onsubmit: onSubmit },
      Row2(
        Field({
          name: 'name', label: 'contact.name',
          placeholder: 'contact.namePlaceholder',
          autocomplete: 'name', required: true,
        }),
        Field({
          name: 'email', label: 'contact.email',
          placeholder: 'contact.emailPlaceholder',
          type: 'email', autocomplete: 'email', required: true,
        }),
      ),
      Row2(
        Field({
          name: 'phone', label: 'contact.phone',
          placeholder: 'contact.phonePlaceholder',
          type: 'tel', autocomplete: 'tel',
        }),
        SubjectField(),
      ),
      Field({
        name: 'message', label: 'contact.message',
        placeholder: 'contact.messagePlaceholder',
        textarea: true, required: true,
      }),
      FormActions(),
    ),
  );
}

function Field({ name, label, placeholder, type = 'text', textarea = false, required = false, autocomplete }) {
  const value = state.form[name] ?? '';
  const err   = state.touched[name] ? state.errors[name] : '';

  const inputEl = textarea
    ? h('textarea', {
        class: 'form-control form-control--textarea',
        id: `cf-${name}`,
        name,
        placeholder: i18n.t(placeholder),
        rows: 5,
        required: required || undefined,
      })
    : h('input', {
        class: 'form-control',
        id: `cf-${name}`,
        name,
        type,
        placeholder: i18n.t(placeholder),
        autocomplete: autocomplete || 'off',
        required: required || undefined,
      });

  inputEl.value = value;

  return h('div', { class: `form-field ${err ? 'form-field--error' : ''}` },
    h('label', { class: 'form-label', for: `cf-${name}` },
      i18n.t(label),
      required ? h('span', { class: 'form-label__required' }, '*') : null,
    ),
    inputEl,
    err ? h('p', { class: 'form-error' }, err) : null,
  );
}

function SubjectField() {
  const err = state.touched.subject ? state.errors.subject : '';

  const selectEl = h('select', { class: 'form-control', id: 'cf-subject', name: 'subject', required: true });

  const options = [
    { value: '',               label: 'contact.subjectPlaceholder', disabled: true },
    { value: 'general',        label: 'contact.subjectGeneral' },
    { value: 'order',          label: 'contact.subjectOrder' },
    { value: 'product',        label: 'contact.subjectProduct' },
    { value: 'return',         label: 'contact.subjectReturn' },
    { value: 'other',          label: 'contact.subjectOther' },
  ];

  for (const o of options) {
    const opt = h('option', { value: o.value, disabled: o.disabled || undefined }, i18n.t(o.label));
    if (o.disabled) opt.selected = !state.form.subject;
    else if (o.value === state.form.subject) opt.selected = true;
    selectEl.append(opt);
  }

  return h('div', { class: `form-field ${err ? 'form-field--error' : ''}` },
    h('label', { class: 'form-label', for: 'cf-subject' },
      i18n.t('contact.subject'),
      h('span', { class: 'form-label__required' }, '*'),
    ),
    selectEl,
    err ? h('p', { class: 'form-error' }, err) : null,
  );
}

function Row2(a, b) {
  return h('div', { class: 'form-row' }, a, b);
}

function FormActions() {
  return h('div', { class: 'form-actions' },
    h('button', {
      class: 'btn btn--accent contact-form__submit',
      type: 'submit',
      disabled: state.submitting,
    }, state.submitting ? i18n.t('contact.sending') : i18n.t('contact.send')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Info Cards
// ═══════════════════════════════════════════════════════════
function InfoCards() {
  const cards = [
    { icon: icons.globe, label: 'contact.phoneLabel',   value: 'contact.phoneValue',   hint: 'contact.phoneHint',   href: 'tel:+982191000000' },
    { icon: icons.info,  label: 'contact.emailLabel',   value: 'contact.emailValue',   hint: 'contact.emailHint',   href: 'mailto:hello@phonestore.ir' },
    { icon: icons.logo,  label: 'contact.addressLabel', value: 'contact.addressValue', hint: 'contact.addressHint' },
    { icon: icons.check, label: 'contact.socialLabel',  value: 'contact.socialValue',  hint: 'contact.socialHint' },
  ];

  return h('aside', { class: 'contact-info' },
    ...cards.map(c => {
      const inner = h('div', { class: 'contact-info__inner' },
        h('div', { class: 'contact-info__icon', innerHTML: c.icon }),
        h('div', { class: 'contact-info__body' },
          h('div', { class: 'contact-info__label' }, i18n.t(c.label)),
          h('div', { class: 'contact-info__value' }, i18n.t(c.value)),
          h('div', { class: 'contact-info__hint' },  i18n.t(c.hint)),
        ),
      );

      return c.href
        ? h('a', { class: 'contact-info__card', href: c.href }, inner)
        : h('div', { class: 'contact-info__card' }, inner);
    }),
  );
}

// ═══════════════════════════════════════════════════════════
//  FAQ
// ═══════════════════════════════════════════════════════════
function Faq() {
  const items = [
    { q: 'contact.faq1Q', a: 'contact.faq1A' },
    { q: 'contact.faq2Q', a: 'contact.faq2A' },
    { q: 'contact.faq3Q', a: 'contact.faq3A' },
    { q: 'contact.faq4Q', a: 'contact.faq4A' },
    { q: 'contact.faq5Q', a: 'contact.faq5A' },
  ];

  return h('section', { class: 'contact-faq' },
    h('div', { class: 'container' },
      h('header', { class: 'contact-faq__header' },
        h('h2', { class: 'contact-faq__title' }, i18n.t('contact.faqTitle')),
        h('p',  { class: 'contact-faq__subtitle' }, i18n.t('contact.faqSubtitle')),
      ),
      h('div', { class: 'contact-faq__list' },
        ...items.map((item, i) => FaqItem(item, i)),
      ),
    ),
  );
}

function FaqItem(item, index) {
  const isOpen = state.openFaq === index;

  return h('details', {
    class: `contact-faq__item ${isOpen ? 'is-open' : ''}`,
    dataset: { idx: String(index) },
    open: isOpen || undefined,
  },
    h('summary', { class: 'contact-faq__question', onclick: (e) => { e.preventDefault(); toggleFaq(index); } },
      h('span', {}, i18n.t(item.q)),
      h('span', { class: 'contact-faq__chevron', innerHTML: icons.chevron }),
    ),
    h('div', { class: 'contact-faq__answer' },
      h('p', {}, i18n.t(item.a)),
    ),
  );
}

function toggleFaq(index) {
  state.openFaq = state.openFaq === index ? -1 : index;
  const list = qs('.contact-faq__list');
  if (!list) return;
  qsa('.contact-faq__item', list).forEach((el, i) => {
    const open = i === state.openFaq;
    el.classList.toggle('is-open', open);
    if (open) el.setAttribute('open', '');
    else el.removeAttribute('open');
  });
}

// ═══════════════════════════════════════════════════════════
//  Success
// ═══════════════════════════════════════════════════════════
function SuccessState() {
  return h('section', { class: 'contact-success' },
    h('div', { class: 'contact-success__icon', innerHTML: icons.check }),
    h('h2', { class: 'contact-success__title' }, i18n.t('contact.successTitle')),
    h('p',  { class: 'contact-success__text' },  i18n.t('contact.successText')),
    h('button', {
      class: 'btn btn--accent',
      type: 'button',
      onclick: resetForm,
    }, i18n.t('contact.sendAnother')),
  );
}

function resetForm() {
  state.submitted = false;
  state.form = { name: '', email: '', phone: '', subject: '', message: '' };
  state.errors = {};
  state.touched = {};
  renderPage();
}

// ═══════════════════════════════════════════════════════════
//  Form handling
// ═══════════════════════════════════════════════════════════
function wireForm() {
  if (!state.container) return;
  const form = qs('.contact-form', state.container);
  if (!form) return;

  qsa('input, select, textarea', form).forEach(el => {
    on(el, 'input',  onFieldChange);
    on(el, 'change', onFieldChange);
    on(el, 'blur',   onFieldBlur);
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
    if (!v) return i18n.t('contact.errName');
    if (v.length < 3) return i18n.t('contact.errNameShort');
  }
  if (name === 'email') {
    if (!v) return i18n.t('contact.errEmail');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return i18n.t('contact.errEmailInvalid');
  }
  if (name === 'phone' && v) {
    if (!/^[0-9+\-\s()]{7,20}$/.test(v)) return i18n.t('contact.errPhone');
  }
  if (name === 'subject' && !v) return i18n.t('contact.errSubject');
  if (name === 'message') {
    if (!v) return i18n.t('contact.errMessage');
    if (v.length < 10) return i18n.t('contact.errMessageShort');
  }
  return '';
}

function updateFieldError(name) {
  if (!state.container) return;
  const field = qs(`[name="${name}"]`, state.container)?.closest('.form-field');
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

  const names = ['name', 'email', 'phone', 'subject', 'message'];
  let hasError = false;

  for (const n of names) {
    state.touched[n] = true;
    state.errors[n] = validateField(n, state.form[n]);
    if (state.errors[n]) hasError = true;
  }

  if (hasError) {
    // فوکوس روی اولین فیلد با خطا
    const first = names.find(n => state.errors[n]);
    qs(`[name="${first}"]`, state.container)?.focus();
    // رندر مجدد برای نمایش خطاها
    renderPage();
    return;
  }

  state.submitting = true;
  renderPage();

  // ── شبیه‌سازی ارسال (به Supabase در فاز 7 اضافه می‌شود) ──
  await new Promise(r => setTimeout(r, 900));

  // ذخیره‌ی محلی برای اینکه کاربر ببیند کار می‌کند
  try {
    const key = 'ps_contact_messages';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push({ ...state.form, at: Date.now() });
    localStorage.setItem(key, JSON.stringify(list.slice(-20)));
  } catch {}

  state.submitting = false;
  state.submitted  = true;
  renderPage();

  events.emit('toast:show', {
    type: 'success',
    message: i18n.t('contact.successTitle'),
  });
}