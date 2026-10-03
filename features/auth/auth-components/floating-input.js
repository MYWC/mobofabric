// ═══════════════════════════════════════════════════════════
//  Floating Input — Phase 19
//  فیلد ورودی مدرن با label شناور
// ═══════════════════════════════════════════════════════════

import { h, on } from '../../../core/dom.js';
import { i18n } from '../../../core/i18n.js';

// ═══════════════════════════════════════════════════════════
//  Icons — inline (بدون وابستگی به icons.js)
// ═══════════════════════════════════════════════════════════
const SVG = (inner, size = 20) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const ICONS = {
  mail:     SVG(`<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 8 10 6 10-6"/>`),
  lock:     SVG(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`),
  user:     SVG(`<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>`),
  eye:      SVG(`<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`),
  eyeOff:   SVG(`<path d="M9.88 9.88a3 3 0 0 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>`),
  check:    SVG(`<path d="M20 6 9 17l-5-5"/>`, 16),
  alert:    SVG(`<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>`, 16),
};

// ═══════════════════════════════════════════════════════════
//  FloatingInput — کامپوننت
// ═══════════════════════════════════════════════════════════
export function FloatingInput({
  name,
  type        = 'text',
  label       = '',
  icon,
  value       = '',
  autocomplete = 'off',
  required    = false,
  disabled    = false,
  maxlength,
  minlength,
  validate,
  onInput,
  onBlur,
  onFocus,
  onEnter,
} = {}) {
  const id = `fi-${name}-${Math.random().toString(36).slice(2, 8)}`;

  // ── Wrapper ──
  const wrap = h('div', { class: 'fi', dataset: { name } });

  // ── Box ──
  const box = h('div', { class: 'fi__box' });

  // ── Icon (اختیاری) ──
  if (icon && ICONS[icon]) {
    box.append(h('span', { class: 'fi__icon', innerHTML: ICONS[icon] }));
  }

  // ── Input ──
  const input = h('input', {
    class: 'fi__input',
    id,
    name,
    type,
    value,
    autocomplete,
    maxlength,
    minlength,
    placeholder: ' ',   // ← trick for :placeholder-shown
    required: required || undefined,
    disabled: disabled || undefined,
  });
  box.append(input);

  // ── Label شناور ──
  box.append(h('label', { class: 'fi__label', for: id }, label));

  // ── Toggle رمز (فقط password) ──
  let toggleBtn = null;
  if (type === 'password') {
    toggleBtn = h('button', {
      class: 'fi__toggle',
      type: 'button',
      'aria-label': i18n.t('auth.showPassword'),
      tabindex: '-1',
      innerHTML: ICONS.eye,
    });
    box.append(toggleBtn);
  }

  // ── Status icon (check / alert) ──
  const status = h('span', { class: 'fi__status', 'aria-hidden': 'true' });
  box.append(status);

  wrap.append(box);

  // ── Error message ──
  const errorEl = h('p', { class: 'fi__error', role: 'alert' });
  wrap.append(errorEl);

  // ═══════════════════════════════════════════════════════════
  //  State helpers
  // ═══════════════════════════════════════════════════════════
  function clearState() {
    wrap.classList.remove('fi--error', 'fi--success');
    errorEl.textContent = '';
    status.innerHTML = '';
    status.removeAttribute('data-type');
  }

  function showError(msg) {
    wrap.classList.remove('fi--success');
    wrap.classList.add('fi--error');
    errorEl.textContent = msg;
    status.innerHTML = ICONS.alert;
    status.dataset.type = 'error';
    // Shake (فقط در blur یا ارسال)
    wrap.classList.add('fi--shake');
    setTimeout(() => wrap.classList.remove('fi--shake'), 500);
  }

  function showSuccess() {
    wrap.classList.remove('fi--error');
    wrap.classList.add('fi--success');
    errorEl.textContent = '';
    status.innerHTML = ICONS.check;
    status.dataset.type = 'success';
  }

  function validateAndRender({ silent = false } = {}) {
    if (!validate) return true;

    const v = input.value;
    const err = validate(v);

    if (!v) {
      if (required && !silent) showError(i18n.t('auth.fieldRequired'));
      else clearState();
      return !required;
    }

    if (err) {
      if (!silent) showError(err);
      else clearState();
      return false;
    }

    showSuccess();
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  //  Events
  // ═══════════════════════════════════════════════════════════
  on(input, 'input', () => {
    const v = input.value;
    // اعتبارسنجی زنده — ولی بدون shake
    if (validate && v.length > 0) {
      const err = validate(v);
      if (err) {
        // فقط وضعیت رو نشون بده، ولی پیام رو کامل ننویس
        wrap.classList.remove('fi--success');
        errorEl.textContent = '';
        status.innerHTML = '';
        status.removeAttribute('data-type');
      } else {
        showSuccess();
      }
    } else if (v.length === 0) {
      clearState();
    }
    if (onInput) onInput(v);
  });

  on(input, 'focus', () => {
    wrap.classList.add('fi--focused');
    if (onFocus) onFocus();
  });

  on(input, 'blur', () => {
    wrap.classList.remove('fi--focused');
    validateAndRender({ silent: false });
    if (onBlur) onBlur(input.value);
  });

  on(input, 'keydown', (e) => {
    if (e.key === 'Enter' && onEnter) onEnter(e, input.value);
  });

  // Toggle password
  if (toggleBtn) {
    on(toggleBtn, 'click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword ? ICONS.eyeOff : ICONS.eye;
      toggleBtn.setAttribute('aria-label',
        isPassword ? i18n.t('auth.hidePassword') : i18n.t('auth.showPassword'));
      input.focus();
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════════════════════
  wrap.input       = input;
  wrap.getValue    = () => input.value;
  wrap.setValue    = (v) => { input.value = v; clearState(); };
  wrap.focus       = () => input.focus();
  wrap.clear       = () => { input.value = ''; clearState(); };
  wrap.setError    = (msg) => showError(msg);
  wrap.setSuccess  = () => showSuccess();
  wrap.clearState  = clearState;
  wrap.validate    = () => validateAndRender({ silent: false });
  wrap.validateSilent = () => validateAndRender({ silent: true });

  return wrap;
}