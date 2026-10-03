import { h, qs, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { icons } from '../../shared/icons/icons.js';
import { authLang } from './auth.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  mode:        'login',   // 'login' | 'signup'
  loading:     false,
  error:       '',
  showPass:    false,
  container:   null,
  // Header dropdown
  menuOpen:    false,
  profile:     null,
  headerEl:    null,
};

let offLang = null;
let offAuth = null;
let offOutside = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const auth = {
  register() {
    i18n.register('auth', authLang);

    router.register('/login', () => showLogin());

    // گوش دادن به تغییرات auth
    offAuth = api.auth.onChange(() => refreshProfile());

    // دکمه‌ی auth در هدر — بدون تغییر فایل هدر
    injectHeaderButton();

    // بارگذاری اولیه
    refreshProfile();

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
      renderHeaderMenu();
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Login/Signup Page
// ═══════════════════════════════════════════════════════════
function showLogin(query = {}) {
  state.container = qs('#app');
  state.mode = 'login';
  state.loading = false;
  state.error = '';
  state.showPass = false;
  renderPage();
}

function renderPage() {
  if (!state.container) return;

  const redirect = new URLSearchParams(location.hash.split('?')[1] || '').get('redirect');

  const page = h('div', { class: 'auth-page' },
    h('div', { class: 'auth-card' },
      h('div', { class: 'auth-brand' },
        h('span', { class: 'auth-brand__logo', innerHTML: icons.logo }),
        h('span', { class: 'auth-brand__text' }, 'Phone Store'),
      ),
      state.mode === 'login' ? LoginForm(redirect) : SignupForm(redirect),
      SwitchTab(),
    ),
  );

  render(state.container, page);
  requestAnimationFrame(() => wireForm());
}

function LoginForm(redirect) {
  return h('form', { class: 'auth-form', novalidate: true, onsubmit: onSubmit },
    h('h1', { class: 'auth-form__title' }, i18n.t('auth.loginTitle')),
    h('p',  { class: 'auth-form__subtitle' }, i18n.t('auth.loginSubtitle')),

    state.error ? h('div', { class: 'auth-error' }, state.error) : null,

    FormField({
      name: 'email', type: 'email', label: 'auth.email',
      placeholder: 'auth.emailPlaceholder', autocomplete: 'email', required: true,
    }),

    PasswordField('login'),

    h('button', {
      class: 'btn btn--accent auth-form__submit',
      type: 'submit',
      disabled: state.loading,
    }, state.loading ? i18n.t('auth.loggingIn') : i18n.t('auth.login')),

    h('input', { type: 'hidden', name: 'redirect', value: redirect || '' }),
  );
}

function SignupForm(redirect) {
  return h('form', { class: 'auth-form', novalidate: true, onsubmit: onSubmit },
    h('h1', { class: 'auth-form__title' }, i18n.t('auth.signupTitle')),
    h('p',  { class: 'auth-form__subtitle' }, i18n.t('auth.signupSubtitle')),

    state.error ? h('div', { class: 'auth-error' }, state.error) : null,

    FormField({
      name: 'full_name', type: 'text', label: 'auth.fullName',
      placeholder: 'auth.fullNamePlaceholder', autocomplete: 'name', required: true,
    }),

    FormField({
      name: 'email', type: 'email', label: 'auth.email',
      placeholder: 'auth.emailPlaceholder', autocomplete: 'email', required: true,
    }),

    PasswordField('signup'),

    h('button', {
      class: 'btn btn--accent auth-form__submit',
      type: 'submit',
      disabled: state.loading,
    }, state.loading ? i18n.t('auth.signingUp') : i18n.t('auth.signup')),

    h('input', { type: 'hidden', name: 'redirect', value: redirect || '' }),
  );
}

function FormField({ name, type = 'text', label, placeholder, autocomplete, required }) {
  return h('div', { class: 'auth-field' },
    h('label', { class: 'auth-field__label', for: `auth-${name}` },
      i18n.t(label),
      required ? h('span', { class: 'auth-field__req' }, '*') : null,
    ),
    h('input', {
      class: 'auth-field__input',
      id: `auth-${name}`,
      name,
      type,
      placeholder: i18n.t(placeholder),
      autocomplete: autocomplete || 'off',
      'data-required': required ? '1' : '0',
    }),
  );
}

function PasswordField(kind) {
  const name = 'password';
  const input = h('input', {
    class: 'auth-field__input',
    id: `auth-${name}`,
    name,
    type: state.showPass ? 'text' : 'password',
    placeholder: i18n.t('auth.passwordPlaceholder'),
    autocomplete: kind === 'signup' ? 'new-password' : 'current-password',
    'data-required': '1',
    minlength: '6',
  });

  return h('div', { class: 'auth-field' },
    h('label', { class: 'auth-field__label', for: `auth-${name}` },
      i18n.t('auth.password'),
      h('span', { class: 'auth-field__req' }, '*'),
    ),
    h('div', { class: 'auth-field__pass' },
      input,
      h('button', {
        class: 'auth-field__eye',
        type: 'button',
        'aria-label': state.showPass ? i18n.t('auth.hidePassword') : i18n.t('auth.showPassword'),
        dataset: { role: 'toggle-pass' },
        innerHTML: state.showPass ? icons.eyeOff : icons.eye,
      }),
    ),
  );
}

function SwitchTab() {
  return h('div', { class: 'auth-switch' },
    h('span', {},
      state.mode === 'login' ? i18n.t('auth.noAccount') : i18n.t('auth.haveAccount'),
    ),
    h('button', {
      class: 'auth-switch__btn',
      type: 'button',
      onclick: () => {
        state.mode = state.mode === 'login' ? 'signup' : 'login';
        state.error = '';
        renderPage();
      },
    }, state.mode === 'login' ? i18n.t('auth.switchToSignup') : i18n.t('auth.switchToLogin')),
  );
}

// ═══════════════════════════════════════════════════════════
//  Form submission
// ═══════════════════════════════════════════════════════════
function wireForm() {
  if (!state.container) return;

  const toggle = qs('[data-role="toggle-pass"]', state.container);
  if (toggle) {
    on(toggle, 'click', () => {
      state.showPass = !state.showPass;
      const input = qs('#auth-password', state.container);
      if (input) input.type = state.showPass ? 'text' : 'password';
      toggle.innerHTML = state.showPass ? icons.eyeOff : icons.eye;
      toggle.setAttribute('aria-label',
        state.showPass ? i18n.t('auth.hidePassword') : i18n.t('auth.showPassword'));
    });
  }
}

async function onSubmit(e) {
  e.preventDefault();
  if (state.loading) return;

  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form));

  // اعتبارسنجی سریع
  const err = validate(data);
  if (err) {
    state.error = err;
    renderPage();
    return;
  }

  state.loading = true;
  state.error = '';
  renderPage();

  try {
    if (state.mode === 'login') {
      await api.auth.signIn(data.email.trim(), data.password);
      events.emit('toast:show', { type: 'success', message: i18n.t('auth.loginSuccess') });
    } else {
      await api.auth.signUp(data.email.trim(), data.password, data.full_name.trim());
      events.emit('toast:show', { type: 'success', message: i18n.t('auth.signupSuccess') });
    }

    // ریدایرکت
    const redirect = data.redirect || '/';
    router.navigate(redirect);
  } catch (err) {
    state.loading = false;
    state.error = mapError(err);
    renderPage();
  }
}

function validate(data) {
  const email = (data.email || '').trim();
  const pass = data.password || '';

  if (!email) return i18n.t('auth.errEmail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return i18n.t('auth.errEmailInvalid');
  if (!pass) return i18n.t('auth.errPassword');
  if (pass.length < 6) return i18n.t('auth.errPasswordShort');

  if (state.mode === 'signup') {
    const name = (data.full_name || '').trim();
    if (!name) return i18n.t('auth.errName');
    if (name.length < 2) return i18n.t('auth.errNameShort');
  }
  return '';
}

function mapError(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) return i18n.t('auth.errInvalidCreds');
  if (msg.includes('already registered') || msg.includes('user already')) return i18n.t('auth.errEmailTaken');
  if (msg.includes('password') && msg.includes('short')) return i18n.t('auth.errWeakPassword');
  if (msg.includes('password') && msg.includes('weak')) return i18n.t('auth.errWeakPassword');
  return i18n.t('auth.errGeneric');
}

// ═══════════════════════════════════════════════════════════
//  Header Auth Button (injection — no header.js change)
// ═══════════════════════════════════════════════════════════
function injectHeaderButton() {
  const actions = qs('.header__actions');
  if (!actions) return;
  if (qs('.header-auth')) return;   // قبلاً تزریق شده

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

  const name = profile?.full_name?.trim()
    || profile?.email?.split('@')[0]
    || '';

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
      ? h('div', { class: 'header-auth__menu', dataset: { role: 'auth-menu' } },
          h('div', { class: 'header-auth__menu-head' },
            h('div', { class: 'header-auth__menu-avatar' }, initial),
            h('div', { class: 'header-auth__menu-meta' },
              h('strong', {}, name),
              h('span', {}, profile.email),
              isAdmin ? h('span', { class: 'header-auth__badge' }, 'Admin') : null,
            ),
          ),
          h('div', { class: 'header-auth__menu-actions' },
            isAdmin
              ? h('a', {
                  class: 'header-auth__menu-link',
                  href: '#/admin',
                  onclick: () => { state.menuOpen = false; },
                },
                  h('span', { innerHTML: icons.shield }),
                  h('span', {}, i18n.t('auth.adminPanel')),
                )
              : null,
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

  // حذف لیسنر قبلی
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

  // بستن با کلیک بیرون
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

    // اگر در صفحه admin هستیم، برو به خانه
    if (location.hash.startsWith('#/admin')) {
      router.navigate('/');
    } else {
      renderHeaderMenu();
    }
  } catch (err) {
    console.error('[auth] logout failed', err);
  }
}