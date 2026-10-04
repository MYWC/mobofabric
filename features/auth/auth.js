// ═══════════════════════════════════════════════════════════
//  Auth — Phase 22 (Pro Edition)
//  Single-page premium authentication
// ═══════════════════════════════════════════════════════════

import { h, qs, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { CONFIG } from '../../core/config.js';
import { icons } from '../../shared/icons/icons.js';
import { authLang } from './auth.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  mode:      'login',
  container: null,
  profile:   null,
  menuOpen:  false,
  headerEl:  null,
  loading:   false,
  error:     '',
  socialLoading: null,
  inputs:    { email: '', password: '', full_name: '', phone: '' },
  showPass:  false,
  pwsVisible: false,
  pwsEl:     null,
  loginMethod: 'email',   // 'email' | 'phone'
};

let offAuth = null;
let offLang = null;
let offOutside = null;

// ═══════════════════════════════════════════════════════════
//  Icons
// ═══════════════════════════════════════════════════════════
const SVG = (inner, size = 20) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const I = {
  logo: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>`,
  mail: SVG(`<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 8 10 6 10-6"/>`),
  lock: SVG(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`),
  user: SVG(`<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>`),
  phone: SVG(`<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>`),
  eye: SVG(`<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`),
  eyeOff: SVG(`<path d="M9.88 9.88a3 3 0 0 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>`),
  arrow: SVG(`<path d="m15 18-6-6 6-6"/>`, 18),
  check: SVG(`<path d="M20 6 9 17l-5-5"/>`, 14),
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.95 6.36 6.95.63-5.25 4.6 1.55 6.83L12 16.9l-6.2 3.52 1.55-6.83-5.25-4.6 6.95-.63L12 2z"/></svg>`,
  shield: SVG(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`, 16),
  bolt: SVG(`<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>`, 16),
  spinner: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>`,
  google: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
  github: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>`,
};

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const auth = {
  register() {
    i18n.register('auth', authLang);
    router.register('/login', () => showAuth());

    offAuth = api.auth.onChange(() => refreshProfile());
    injectHeaderButton();
    refreshProfile();

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
      renderHeaderMenu();
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Show Auth
// ═══════════════════════════════════════════════════════════
function showAuth() {
  state.container = qs('#app');
  state.mode = 'login';
  state.error = '';
  state.inputs = { email: '', password: '', full_name: '', phone: '' };
  state.showPass = false;
  state.pwsVisible = false;
  state.pwsEl = null;
  state.loginMethod = 'email';

  if (state.profile) {
    router.navigate('/');
    return;
  }

  renderPage();
}

// ═══════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════
function renderPage() {
  if (!state.container) return;

  const page = h('div', { class: 'au-page' },
    Background(),
    FloatingCards(),
    Content(),
  );

  render(state.container, page);

  requestAnimationFrame(() => page.classList.add('is-ready'));
}

// ═══════════════════════════════════════════════════════════
//  Background
// ═══════════════════════════════════════════════════════════
function Background() {
  const bg = h('div', { class: 'au-bg' });

  bg.append(
    h('div', { class: 'au-bg__mesh' }),
    h('div', { class: 'au-bg__grid' }),
    h('div', { class: 'au-bg__orb au-bg__orb--1' }),
    h('div', { class: 'au-bg__orb au-bg__orb--2' }),
    h('div', { class: 'au-bg__orb au-bg__orb--3' }),
  );

  // Particles
  const particles = h('div', { class: 'au-bg__particles' });
  for (let i = 0; i < 24; i++) {
    const p = h('span', { class: 'au-particle' });
    p.style.setProperty('--x', `${Math.random() * 100}%`);
    p.style.setProperty('--y', `${Math.random() * 100}%`);
    p.style.setProperty('--delay', `${Math.random() * 6}s`);
    p.style.setProperty('--duration', `${6 + Math.random() * 6}s`);
    p.style.setProperty('--size', `${2 + Math.random() * 4}px`);
    particles.append(p);
  }
  bg.append(particles);

  // Floating brand logos
  const brands = h('div', { class: 'au-bg__brands' });
  const brandNames = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OPPO'];
  brandNames.forEach((name, i) => {
    const b = h('span', { class: 'au-brand-chip' }, name);
    b.style.setProperty('--i', i);
    brands.append(b);
  });
  bg.append(brands);

  return bg;
}

// ═══════════════════════════════════════════════════════════
//  Floating Cards (اطراف کارت اصلی)
// ═══════════════════════════════════════════════════════════
function FloatingCards() {
  const wrap = h('div', { class: 'au-floating' });

  // Rating card
  wrap.append(
    h('div', { class: 'au-float au-float--rating' },
      h('div', { class: 'au-float__stars' },
        I.star, I.star, I.star, I.star, I.star,
      ),
      h('div', { class: 'au-float__text' },
        h('strong', {}, '۴.۹'),
        h('span', {}, 'از ۵۰,۰۰۰+ کاربر'),
      ),
    ),
  );

  // Testimonial
  wrap.append(
    h('div', { class: 'au-float au-float--testimonial' },
      h('div', { class: 'au-float__quote' }, '💬'),
      h('p', { class: 'au-float__msg' },
        'بهترین فروشگاه موبایل که تجربه کردم!'),
      h('div', { class: 'au-float__author' },
        h('span', { class: 'au-float__avatar' }, 'ع'),
        h('div', {},
          h('strong', {}, 'علی محمدی'),
          h('span', {}, 'مشتری دائمی'),
        ),
      ),
    ),
  );

  // Secure badge
  wrap.append(
    h('div', { class: 'au-float au-float--secure' },
      h('span', { class: 'au-float__icon', innerHTML: I.shield }),
      h('span', {}, 'SSL امن'),
    ),
  );

  // Fast badge
  wrap.append(
    h('div', { class: 'au-float au-float--fast' },
      h('span', { class: 'au-float__icon au-float__icon--bolt', innerHTML: I.bolt }),
      h('span', {}, 'ارسال سریع'),
    ),
  );

  return wrap;
}

// ═══════════════════════════════════════════════════════════
//  Content
// ═══════════════════════════════════════════════════════════
function Content() {
  return h('div', { class: 'au-content' },
    Card(),
  );
}

function Card() {
  return h('div', { class: 'au-card' },
    Brand(),
    Tabs(),
    Header(),
    ErrorBanner(),
    Form(),
    Divider(),
    SocialRow(),
    TrustFooter(),
  );
}

function Brand() {
  return h('div', { class: 'au-brand' },
    h('span', { class: 'au-brand__logo', innerHTML: I.logo }),
    h('div', { class: 'au-brand__text' },
      h('strong', {}, 'Phone Store'),
      h('span', {}, 'فروشگاه گوشی موبایل'),
    ),
  );
}

function Tabs() {
  return h('div', { class: 'au-tabs', role: 'tablist' },
    TabBtn('login',  i18n.t('auth.login')),
    TabBtn('signup', i18n.t('auth.signup')),
  );
}

function TabBtn(mode, label) {
  const active = state.mode === mode;
  return h('button', {
    class: `au-tab ${active ? 'is-active' : ''}`,
    type: 'button',
    role: 'tab',
    'aria-selected': active ? 'true' : 'false',
    onclick: () => {
      if (state.mode === mode) return;
      state.mode = mode;
      state.error = '';
      state.inputs = { email: '', password: '', full_name: '', phone: '' };
      state.showPass = false;
      state.pwsVisible = false;
      state.pwsEl = null;
      state.socialLoading = null;
      renderPage();
    },
  }, label);
}

function Header() {
  const isLogin = state.mode === 'login';
  return h('div', { class: 'au-header' },
    h('h1', {}, isLogin ? i18n.t('auth.welcomeBack') : i18n.t('auth.signupTitle')),
    h('p', {}, isLogin ? i18n.t('auth.welcomeBackSub') : i18n.t('auth.createAccountSub')),
  );
}

function ErrorBanner() {
  if (!state.error) return null;
  return h('div', { class: 'au-error', role: 'alert' }, state.error);
}

// ═══════════════════════════════════════════════════════════
//  Form
// ═══════════════════════════════════════════════════════════
function Form() {
  const isLogin = state.mode === 'login';

  const form = h('form', { class: 'au-form', novalidate: true, onsubmit: handleSubmit });

  if (!isLogin) {
    form.append(Input({
      name: 'full_name', type: 'text',
      label: i18n.t('auth.fullName'), icon: I.user,
      autocomplete: 'name', next: 'email',
    }));
  }

  form.append(
    Input({
      name: 'email', type: 'email',
      label: i18n.t('auth.email'), icon: I.mail,
      autocomplete: 'email', next: 'password',
    }),
    PasswordInput(),
  );

  if (!isLogin && CONFIG.authUI.passwordStrength) {
    form.append(PasswordStrength());
  }

  if (isLogin) {
    form.append(RememberRow());
  } else {
    form.append(TermsRow());
  }

  form.append(SubmitButton(isLogin));

  return form;
}

function Input({ name, type, label, icon, autocomplete, next, required = true }) {
  const id = `au-${name}`;
  const value = state.inputs[name] || '';

  const wrapper = h('div', { class: 'au-input-wrap', dataset: { name } });

  const inputEl = h('input', {
    class: 'au-input',
    id, name, type, value,
    autocomplete: autocomplete || 'off',
    placeholder: ' ',
    required: required || undefined,
    oninput: (e) => {
      state.inputs[name] = e.target.value;
      clearInputError(wrapper);
    },
    onblur: (e) => validateField(name, e.target.value, wrapper),
    onkeydown: (e) => {
      if (e.key === 'Enter' && next) {
        e.preventDefault();
        qs(`#au-${next}`)?.focus();
      }
    },
  });

  wrapper.append(
    h('span', { class: 'au-input-icon', innerHTML: icon }),
    inputEl,
    h('label', { class: 'au-input-label', for: id }, label),
    h('span', { class: 'au-input-status' }),
  );

  return wrapper;
}

function PasswordInput() {
  const id = 'au-password';
  const value = state.inputs.password || '';
  const wrapper = h('div', { class: 'au-input-wrap', dataset: { name: 'password' } });

  const inputEl = h('input', {
    class: 'au-input',
    id,
    name: 'password',
    type: state.showPass ? 'text' : 'password',
    value,
    autocomplete: state.mode === 'login' ? 'current-password' : 'new-password',
    placeholder: ' ',
    required: true,
    oninput: (e) => {
      state.inputs.password = e.target.value;
      clearInputError(wrapper);
      if (state.mode === 'signup') updatePasswordStrength(e.target.value);
    },
    onblur: (e) => validateField('password', e.target.value, wrapper),
    onkeydown: (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.container?.querySelector('.au-form')?.requestSubmit();
      }
    },
  });

  const toggle = h('button', {
    class: 'au-input-toggle',
    type: 'button',
    tabindex: '-1',
    'aria-label': i18n.t('auth.showPassword'),
    innerHTML: state.showPass ? I.eyeOff : I.eye,
    onclick: () => {
      state.showPass = !state.showPass;
      inputEl.type = state.showPass ? 'text' : 'password';
      toggle.innerHTML = state.showPass ? I.eyeOff : I.eye;
      toggle.setAttribute('aria-label',
        state.showPass ? i18n.t('auth.hidePassword') : i18n.t('auth.showPassword'));
      inputEl.focus();
    },
  });

  wrapper.append(
    h('span', { class: 'au-input-icon', innerHTML: I.lock }),
    inputEl,
    h('label', { class: 'au-input-label', for: id }, i18n.t('auth.password')),
    toggle,
    h('span', { class: 'au-input-status' }),
  );

  return wrapper;
}

// ═══════════════════════════════════════════════════════════
//  Validation
// ═══════════════════════════════════════════════════════════
function validateField(name, value, wrapper) {
  const v = String(value || '').trim();
  let err = '';

  if (name === 'full_name') {
    if (!v) err = i18n.t('auth.errName');
    else if (v.length < 2) err = i18n.t('auth.errNameShort');
  } else if (name === 'email') {
    if (!v) err = i18n.t('auth.errEmail');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err = i18n.t('auth.errEmailInvalid');
  } else if (name === 'password') {
    if (!v) err = i18n.t('auth.errPassword');
    else if (state.mode === 'signup' && v.length < 6) err = i18n.t('auth.errPasswordShort');
  }

  if (err) {
    wrapper.classList.remove('au-input-wrap--success');
    wrapper.classList.add('au-input-wrap--error');
    wrapper.dataset.error = err;
  } else if (v) {
    wrapper.classList.remove('au-input-wrap--error');
    wrapper.classList.add('au-input-wrap--success');
    delete wrapper.dataset.error;
  } else {
    clearInputError(wrapper);
  }
}

function clearInputError(wrapper) {
  wrapper.classList.remove('au-input-wrap--error');
  delete wrapper.dataset.error;
}

// ═══════════════════════════════════════════════════════════
//  Password Strength
// ═══════════════════════════════════════════════════════════
function PasswordStrength() {
  const wrap = h('div', { class: 'au-pws' });
  const bar = h('div', { class: 'au-pws__bar' },
    h('span', {}), h('span', {}), h('span', {}), h('span', {}),
  );
  const label = h('div', { class: 'au-pws__label' });

  wrap.append(
    h('div', { class: 'au-pws__header' },
      h('span', { class: 'au-pws__title' }, i18n.t('auth.passwordStrength')),
      label,
    ),
    bar,
  );

  wrap.dataset.state = 'empty';
  wrap.labelEl = label;
  wrap.slots = bar.querySelectorAll('span');

  state.pwsEl = wrap;
  return wrap;
}

function updatePasswordStrength(password) {
  const wrap = state.pwsEl;
  if (!wrap) return;

  if (!password) {
    wrap.dataset.state = 'empty';
    wrap.labelEl.textContent = '';
    wrap.slots.forEach(s => s.classList.remove('is-filled'));
    return;
  }

  const checks = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit:     /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 8)  score++;
  if (checks.lowercase)      score++;
  if (checks.uppercase)      score++;
  if (checks.digit)          score++;
  if (checks.special)        score++;

  let level, filled;
  if (score <= 2)      { level = 'weak';        filled = 1; }
  else if (score <= 3) { level = 'medium';      filled = 2; }
  else if (score <= 4) { level = 'strong';      filled = 3; }
  else                 { level = 'very-strong'; filled = 4; }

  const labels = {
    weak:          i18n.t('auth.passwordWeak'),
    medium:        i18n.t('auth.passwordMedium'),
    strong:        i18n.t('auth.passwordStrong'),
    'very-strong': i18n.t('auth.passwordVeryStrong'),
  };

  wrap.dataset.state = level;
  wrap.labelEl.textContent = labels[level];
  wrap.slots.forEach((s, i) => s.classList.toggle('is-filled', i < filled));

  if (password.length > 0 && !state.pwsVisible) {
    state.pwsVisible = true;
    wrap.classList.add('is-visible');
  }
}

// ═══════════════════════════════════════════════════════════
//  Remember / Terms
// ═══════════════════════════════════════════════════════════
function RememberRow() {
  return h('div', { class: 'au-meta' },
    h('label', { class: 'au-checkbox' },
      h('input', { type: 'checkbox', name: 'remember', id: 'au-remember' }),
      h('span', { class: 'au-checkbox__box' }),
      h('span', { class: 'au-checkbox__label' }, i18n.t('auth.rememberMe')),
    ),
    h('button', {
      class: 'au-link',
      type: 'button',
      onclick: () => events.emit('toast:show', {
        type: 'info',
        message: i18n.getLang() === 'fa'
          ? 'بازیابی رمز به‌زودی فعال می‌شود'
          : 'Password reset coming soon',
      }),
    }, i18n.t('auth.forgotPassword')),
  );
}

function TermsRow() {
  return h('label', { class: 'au-checkbox au-checkbox--terms' },
    h('input', { type: 'checkbox', name: 'terms', id: 'au-terms' }),
    h('span', { class: 'au-checkbox__box' }),
    h('span', { class: 'au-checkbox__label' }, i18n.t('auth.termsAgree')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Submit
// ═══════════════════════════════════════════════════════════
function SubmitButton(isLogin) {
  const btn = h('button', {
    class: 'au-submit',
    type: 'submit',
    disabled: state.loading || undefined,
  });

  btn.append(
    h('span', { class: 'au-submit__label' },
      state.loading
        ? (isLogin ? i18n.t('auth.loggingIn') : i18n.t('auth.signingUp'))
        : (isLogin ? i18n.t('auth.login') : i18n.t('auth.signup'))
    ),
    h('span', { class: 'au-submit__arrow', innerHTML: I.arrow }),
    state.loading
      ? h('span', { class: 'au-submit__spinner', innerHTML: I.spinner })
      : null,
  );

  return btn;
}

// ═══════════════════════════════════════════════════════════
//  Divider / Social
// ═══════════════════════════════════════════════════════════
function Divider() {
  if (!CONFIG.authUI.socialLogin) return null;
  return h('div', { class: 'au-divider' },
    h('span', { class: 'au-divider__line' }),
    h('span', { class: 'au-divider__text' }, i18n.t('auth.orContinueWith')),
    h('span', { class: 'au-divider__line' }),
  );
}

function SocialRow() {
  if (!CONFIG.authUI.socialLogin) return null;
  return h('div', { class: 'au-social' },
    SocialButton('google', I.google, 'Google'),
    SocialButton('github', I.github, 'GitHub'),
  );
}

function SocialButton(provider, icon, label) {
  const isLoading = state.socialLoading === provider;

  return h('button', {
    class: `au-social__btn ${isLoading ? 'is-loading' : ''}`,
    type: 'button',
    'aria-label': label,
    disabled: Boolean(state.socialLoading) || undefined,
    onclick: () => handleSocialClick(provider),
  },
    isLoading
      ? h('span', { class: 'au-social__spinner', innerHTML: I.spinner })
      : h('span', { class: 'au-social__icon', innerHTML: icon }),
    h('span', { class: 'au-social__label' }, label),
  );
}

// ═══════════════════════════════════════════════════════════
//  Trust Footer
// ═══════════════════════════════════════════════════════════
function TrustFooter() {
  return h('div', { class: 'au-trust' },
    TrustItem(I.shield, i18n.t('auth.benefit1')),
    TrustItem(I.bolt,   i18n.t('auth.benefit2')),
    TrustItem(I.check,  i18n.t('auth.benefit3')),
  );
}

function TrustItem(icon, text) {
  return h('div', { class: 'au-trust__item' },
    h('span', { class: 'au-trust__icon', innerHTML: icon }),
    h('span', {}, text),
  );
}

// ═══════════════════════════════════════════════════════════
//  Handlers
// ═══════════════════════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault();
  if (state.loading) return;

  const form = e.currentTarget;
  const isLogin = state.mode === 'login';
  let hasError = false;

  if (!isLogin) {
    const nameWrap = form.querySelector('[data-name="full_name"]');
    validateField('full_name', state.inputs.full_name, nameWrap);
    if (nameWrap?.classList.contains('au-input-wrap--error')) hasError = true;
  }

  const emailWrap = form.querySelector('[data-name="email"]');
  validateField('email', state.inputs.email, emailWrap);
  if (emailWrap?.classList.contains('au-input-wrap--error')) hasError = true;

  const passWrap = form.querySelector('[data-name="password"]');
  validateField('password', state.inputs.password, passWrap);
  if (passWrap?.classList.contains('au-input-wrap--error')) hasError = true;

  if (!isLogin) {
    const terms = form.querySelector('input[name="terms"]');
    if (terms && !terms.checked) {
      state.error = i18n.t('auth.errTerms');
      renderPage();
      return;
    }
  }

  if (hasError) {
    form.classList.add('is-shaking');
    setTimeout(() => form.classList.remove('is-shaking'), 500);
    return;
  }

  state.loading = true;
  state.error = '';
  renderPage();

  try {
    if (isLogin) {
      await api.auth.signIn(state.inputs.email.trim(), state.inputs.password);
      events.emit('toast:show', { type: 'success', message: i18n.t('auth.loginSuccess') });
      if (CONFIG.authUI.confetti) fireConfetti();
      setTimeout(() => router.navigate('/'), 800);
    } else {
      await api.auth.signUp(state.inputs.email.trim(), state.inputs.password, state.inputs.full_name);
      events.emit('toast:show', { type: 'success', message: i18n.t('auth.signupSuccess') });
      if (CONFIG.authUI.confetti) fireConfetti();
      setTimeout(() => router.navigate('/'), 800);
    }
  } catch (err) {
    state.loading = false;
    state.error = mapError(err);
    renderPage();

    requestAnimationFrame(() => {
      const form = state.container?.querySelector('.au-form');
      if (form) {
        form.classList.add('is-shaking');
        setTimeout(() => form.classList.remove('is-shaking'), 500);
      }
    });
  }
}

async function handleSocialClick(provider) {
  if (state.socialLoading) return;

  state.socialLoading = provider;
  state.error = '';
  renderPage();

  try {
    const redirectTo = `${location.origin}${location.pathname}#/`;
    await api.auth.signInWithOAuth(provider, redirectTo);
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();

    let userMsg = i18n.getLang() === 'fa' ? 'ورود ناموفق بود' : 'Login failed';

    if (msg.includes('not enabled') || msg.includes('not supported')) {
      userMsg = i18n.getLang() === 'fa'
        ? 'این روش ورود فعال نیست'
        : 'This login method is not enabled';
    }

    events.emit('toast:show', { type: 'error', message: userMsg, duration: 4500 });

    state.socialLoading = null;
    renderPage();
  }
}

function mapError(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid credentials'))
    return i18n.t('auth.errInvalidCreds');
  if (msg.includes('already registered') || msg.includes('user already'))
    return i18n.t('auth.errEmailTaken');
  if (msg.includes('password') && (msg.includes('short') || msg.includes('weak')))
    return i18n.t('auth.errWeakPassword');
  return i18n.t('auth.errGeneric');
}

// ═══════════════════════════════════════════════════════════
//  Confetti
// ═══════════════════════════════════════════════════════════
function fireConfetti() {
  const COLORS = ['#0071e3', '#5856d6', '#af52de', '#34c759', '#ffcc00'];

  for (let i = 0; i < 40; i++) {
    const p = document.createElement('span');
    const size = 6 + Math.random() * 6;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    p.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
    `;
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 240;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 60;

    p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0.2)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' }
    ).addEventListener('finish', () => p.remove());
  }
}

// ═══════════════════════════════════════════════════════════
//  Header Auth Button
// ═══════════════════════════════════════════════════════════
function injectHeaderButton() {
  const actions = qs('.header__actions');
  if (!actions) return;
  if (qs('.header-auth')) return;

  const el = h('div', { class: 'header-auth', dataset: { role: 'header-auth' } });
  actions.append(el);
  state.headerEl = el;

  renderHeaderMenu();
  wireHeaderMenu();
}

function renderHeaderMenu() {
  if (!state.headerEl) return;

  const profile = state.profile;
  const isLoggedIn = Boolean(profile);
  const isAdmin = profile?.role === 'admin';
  const name = profile?.full_name?.trim() || profile?.email?.split('@')[0] || '';
  const initial = name ? name.charAt(0).toUpperCase() : '';

  render(state.headerEl, h('div', { class: 'header-auth__inner' },
    h('button', {
      class: `header-auth__btn ${isLoggedIn ? 'is-logged' : ''}`,
      type: 'button',
      'aria-label': isLoggedIn ? i18n.t('auth.menu') : i18n.t('auth.loginLink'),
      dataset: { role: 'auth-trigger' },
    },
      isLoggedIn
        ? h('span', { class: 'header-auth__avatar' }, initial)
        : h('span', { class: 'header-auth__icon', innerHTML: icons.user }),
    ),
    state.menuOpen && isLoggedIn
      ? h('div', { class: 'header-auth__menu' },
          h('div', { class: 'header-auth__menu-head' },
            h('div', { class: 'header-auth__menu-avatar' }, initial),
            h('div', { class: 'header-auth__menu-meta' },
              h('strong', {}, name),
              h('span', {}, profile.email),
              isAdmin ? h('span', { class: 'header-auth__badge' }, 'Admin') : null,
            ),
          ),
          h('div', { class: 'header-auth__menu-actions' },
            isAdmin ? h('a', {
              class: 'header-auth__menu-link',
              href: '#/admin',
              onclick: () => { state.menuOpen = false; },
            },
              h('span', { innerHTML: icons.shield }),
              h('span', {}, i18n.t('auth.adminPanel')),
            ) : null,
            h('button', {
              class: 'header-auth__menu-link header-auth__menu-link--danger',
              type: 'button',
              onclick: doLogout,
            },
              h('span', { innerHTML: icons.logout }),
              h('span', {}, i18n.t('auth.logout')),
            ),
          ),
        )
      : null,
  ));
}

function wireHeaderMenu() {
  if (!state.headerEl) return;
  if (offOutside) offOutside();

  on(state.headerEl, 'click', (e) => {
    const trigger = e.target.closest('[data-role="auth-trigger"]');
    if (!trigger) return;
    e.stopPropagation();

    if (!state.profile) {
      router.navigate('/login');
      return;
    }
    state.menuOpen = !state.menuOpen;
    renderHeaderMenu();
  });

  offOutside = on(document, 'click', (e) => {
    if (!state.menuOpen) return;
    if (state.headerEl && state.headerEl.contains(e.target)) return;
    state.menuOpen = false;
    renderHeaderMenu();
  });
}

async function refreshProfile() {
  try {
    state.profile = await api.auth.getProfile();
  } catch {
    state.profile = null;
  }
  renderHeaderMenu();
}

async function doLogout() {
  state.menuOpen = false;
  try {
    await api.auth.signOut();
    events.emit('toast:show', { type: 'info', message: i18n.t('auth.logoutSuccess') });
    if (location.hash.startsWith('#/admin')) router.navigate('/');
    else renderHeaderMenu();
  } catch (err) {
    console.error('[auth] logout failed', err);
  }
}