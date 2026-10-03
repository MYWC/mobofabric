// ═══════════════════════════════════════════════════════════
//  Glass Form — Phase 19
//  کارت شیشه‌ای با فرم ورود/ثبت‌نام
// ═══════════════════════════════════════════════════════════

import { h, qs, on } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { CONFIG } from '../../../core/config.js';
import { FloatingInput } from './floating-input.js';
import { createPasswordStrength } from './password-strength.js';

// ═══════════════════════════════════════════════════════════
//  Icons
// ═══════════════════════════════════════════════════════════
const SVG = (inner, size = 18) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const ICONS = {
  logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>`,
  arrowL: SVG(`<path d="m15 18-6-6 6-6"/>`),
  arrowR: SVG(`<path d="m9 18 6-6-6-6"/>`),
  spinner: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>`,
  google: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
  github: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>`,
  apple: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`,
};

// ═══════════════════════════════════════════════════════════
//  createGlassForm — سازنده‌ی اصلی
// ═══════════════════════════════════════════════════════════
export function createGlassForm({
  mode      = 'login',  // 'login' | 'signup'
  onSubmit  = () => {}, // (data) => Promise
  onSwitch  = () => {}, // (newMode) => void
} = {}) {

  // ── Wrapper ──
  const wrap = h('div', { class: 'glass-form-wrap' });

  // ── Card ──
  const card = h('div', { class: 'glass-card' });
  wrap.append(card);

  // ═══════════════════════════════════════════════════════════
  //  State
  // ═══════════════════════════════════════════════════════════
  const state = {
    mode,
    loading: false,
    submitError: '',
    showPasswordStrength: false,
    inputs: {},
    pws: null,
  };

  // ═══════════════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════════════
  function render() {
    card.replaceChildren(
      Brand(),
      Header(),
      ErrorBanner(),
      Form(),
      Divider(),
      SocialRow(),
      SwitchRow(),
    );

    // ── Wire up ──
    requestAnimationFrame(() => {
      wire();
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  Brand
  // ═══════════════════════════════════════════════════════════
  function Brand() {
    return h('div', { class: 'glass-card__brand' },
      h('span', { class: 'glass-card__logo', innerHTML: ICONS.logo }),
      h('span', { class: 'glass-card__brand-text' }, 'Phone Store'),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Header
  // ═══════════════════════════════════════════════════════════
  function Header() {
    const isLogin = state.mode === 'login';

    return h('div', { class: 'glass-card__header' },
      h('h1', { class: 'glass-card__title' },
        isLogin ? i18n.t('auth.welcomeBack') : i18n.t('auth.signupTitle')),
      h('p',  { class: 'glass-card__subtitle' },
        isLogin ? i18n.t('auth.welcomeBackSub') : i18n.t('auth.createAccountSub')),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Error Banner
  // ═══════════════════════════════════════════════════════════
  function ErrorBanner() {
    if (!state.submitError) return null;
    return h('div', {
      class: 'glass-card__error',
      role: 'alert',
    }, state.submitError);
  }

  // ═══════════════════════════════════════════════════════════
  //  Form
  // ═══════════════════════════════════════════════════════════
  function Form() {
    const isLogin = state.mode === 'login';

    const form = h('form', {
      class: 'glass-form',
      novalidate: true,
      onsubmit: handleSubmit,
    });

    // ── Full Name (signup) ──
    if (!isLogin) {
      const nameInput = FloatingInput({
        name:         'full_name',
        type:         'text',
        label:        i18n.t('auth.fullName'),
        icon:         'user',
        autocomplete: 'name',
        required:     true,
        validate:     (v) => {
          if (!v || v.trim().length < 2) return i18n.t('auth.errNameShort');
          return '';
        },
      });
      state.inputs.full_name = nameInput;
      form.append(nameInput);
    }

    // ── Email ──
    const emailInput = FloatingInput({
      name:         'email',
      type:         'email',
      label:        i18n.t('auth.email'),
      icon:         'mail',
      autocomplete: 'email',
      required:     true,
      validate:     (v) => {
        if (!v) return i18n.t('auth.errEmail');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return i18n.t('auth.errEmailInvalid');
        return '';
      },
      onEnter: () => {
        // Enter روی ایمیل → برو به رمز
        state.inputs.password?.focus();
      },
    });
    state.inputs.email = emailInput;
    form.append(emailInput);

    // ── Password ──
    const passwordInput = FloatingInput({
      name:         'password',
      type:         'password',
      label:        i18n.t('auth.password'),
      icon:         'lock',
      autocomplete: isLogin ? 'current-password' : 'new-password',
      required:     true,
      validate:     (v) => {
        if (!v) return i18n.t('auth.errPassword');
        if (!isLogin && v.length < 6) return i18n.t('auth.errPasswordShort');
        return '';
      },
      onEnter: () => {
        // Enter روی رمز → submit
        form.requestSubmit();
      },
      onInput: (v) => {
        // Password strength فقط در signup
        if (!isLogin && state.pws) {
          if (v.length > 0 && !state.showPasswordStrength) {
            state.showPasswordStrength = true;
            const pwsWrap = card.querySelector('.pws-wrap');
            if (pwsWrap) pwsWrap.classList.add('is-visible');
          }
          state.pws.update(v);
        }
      },
    });
    state.inputs.password = passwordInput;
    form.append(passwordInput);

    // ── Password Strength (signup) ──
    if (!isLogin && CONFIG.authUI.passwordStrength) {
      state.pws = createPasswordStrength();

      const pwsWrap = h('div', { class: 'pws-wrap' }, state.pws.el);
      form.append(pwsWrap);
    }

    // ── Remember + Forgot (login) ──
    if (isLogin) {
      form.append(
        h('div', { class: 'glass-form__meta' },
          h('label', { class: 'glass-checkbox' },
            h('input', { type: 'checkbox', name: 'remember', id: 'fi-remember' }),
            h('span', { class: 'glass-checkbox__box' }),
            h('span', { class: 'glass-checkbox__label' }, i18n.t('auth.rememberMe')),
          ),
          h('a', { class: 'glass-link', href: '#/forgot-password', onclick: (e) => {
            e.preventDefault();
            events.emit('toast:show', {
              type: 'info',
              message: i18n.getLang() === 'fa'
                ? 'بازیابی رمز به‌زودی فعال می‌شود'
                : 'Password reset coming soon',
            });
          } }, i18n.t('auth.forgotPassword')),
        )
      );
    }

    // ── Terms (signup) ──
    if (!isLogin) {
      form.append(
        h('label', { class: 'glass-checkbox glass-checkbox--terms' },
          h('input', { type: 'checkbox', name: 'terms', id: 'fi-terms' }),
          h('span', { class: 'glass-checkbox__box' }),
          h('span', { class: 'glass-checkbox__label' }, i18n.t('auth.termsAgree')),
        )
      );
    }

    // ── Submit Button ──
    form.append(SubmitButton(isLogin));

    return form;
  }

  // ═══════════════════════════════════════════════════════════
  //  Submit Button
  // ═══════════════════════════════════════════════════════════
  function SubmitButton(isLogin) {
    const btn = h('button', {
      class: 'glass-submit',
      type: 'submit',
      disabled: state.loading || undefined,
    });

    btn.append(
      h('span', { class: 'glass-submit__label' },
        state.loading
          ? (isLogin ? i18n.t('auth.loggingIn') : i18n.t('auth.signingUp'))
          : (isLogin ? i18n.t('auth.login') : i18n.t('auth.signup'))
      ),
      h('span', { class: 'glass-submit__arrow', innerHTML: ICONS.arrowL }),
      state.loading
        ? h('span', { class: 'glass-submit__spinner', innerHTML: ICONS.spinner })
        : null,
    );

    return btn;
  }

  // ═══════════════════════════════════════════════════════════
  //  Divider
  // ═══════════════════════════════════════════════════════════
  function Divider() {
    if (!CONFIG.authUI.socialLogin) return null;

    return h('div', { class: 'glass-divider' },
      h('span', { class: 'glass-divider__line' }),
      h('span', { class: 'glass-divider__text' }, i18n.t('auth.orContinueWith')),
      h('span', { class: 'glass-divider__line' }),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Social Row
  // ═══════════════════════════════════════════════════════════
  function SocialRow() {
    if (!CONFIG.authUI.socialLogin) return null;

    const socials = [
      { id: 'google', icon: ICONS.google, label: i18n.t('auth.socialGoogle') },
      { id: 'github', icon: ICONS.github, label: i18n.t('auth.socialGitHub') },
      { id: 'apple',  icon: ICONS.apple,  label: i18n.t('auth.socialApple') },
    ];

    return h('div', { class: 'glass-social' },
      ...socials.map(s => h('button', {
        class: 'glass-social__btn',
        type: 'button',
        'aria-label': s.label,
        title: s.label,
        onclick: () => events.emit('toast:show', {
          type: 'info',
          message: i18n.getLang() === 'fa'
            ? `ورود با ${s.id} به‌زودی فعال می‌شود`
            : `${s.id} login coming soon`,
        }),
      },
        h('span', { class: 'glass-social__icon', innerHTML: s.icon }),
      )),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Switch Row
  // ═══════════════════════════════════════════════════════════
  function SwitchRow() {
    const isLogin = state.mode === 'login';

    return h('div', { class: 'glass-switch' },
      h('span', { class: 'glass-switch__text' },
        isLogin ? i18n.t('auth.noAccount') : i18n.t('auth.haveAccount')),
      h('button', {
        class: 'glass-switch__btn',
        type: 'button',
        onclick: () => {
          const newMode = isLogin ? 'signup' : 'login';
          state.mode = newMode;
          state.submitError = '';
          state.showPasswordStrength = false;
          state.inputs = {};
          state.pws = null;
          onSwitch(newMode);
          render();
        },
      },
        h('span', {}, isLogin ? i18n.t('auth.switchToSignup') : i18n.t('auth.switchToLogin')),
        h('span', { class: 'glass-switch__arrow', innerHTML: ICONS.arrowL }),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Wire — اتصال event ها
  // ═══════════════════════════════════════════════════════════
  function wire() {
    // Enter روی فیلد آخر (auto submit)
    // این کار تو FloatingInput هندل شده

    // Magnetic button
    if (CONFIG.authUI.magneticButton) {
      const btn = card.querySelector('.glass-submit');
      if (btn) attachMagnetic(btn);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Magnetic Button
  // ═══════════════════════════════════════════════════════════
  function attachMagnetic(btn) {
    const MAX = 6;
    let raf = null;
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;

    const onMove = (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      targetX = (x / r.width) * MAX * 2;
      targetY = (y / r.height) * MAX * 2;
      if (!raf) tick();
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!raf) tick();
    };

    const tick = () => {
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;
      btn.style.transform = `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px)`;

      const done = Math.abs(targetX - curX) < 0.1 && Math.abs(targetY - curY) < 0.1;
      if (done) {
        curX = targetX;
        curY = targetY;
        btn.style.transform = targetX === 0 && targetY === 0
          ? ''
          : `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px)`;
        raf = null;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    on(btn, 'mousemove', onMove);
    on(btn, 'mouseleave', onLeave);
  }

  // ═══════════════════════════════════════════════════════════
  //  Submit handler
  // ═══════════════════════════════════════════════════════════
  async function handleSubmit(e) {
    e.preventDefault();
    if (state.loading) return;

    // ── اعتبارسنجی همه فیلدها ──
    const inputs = Object.values(state.inputs).filter(Boolean);
    let hasError = false;

    inputs.forEach(inp => {
      const ok = inp.validate();
      if (!ok) hasError = true;
    });

    // ── Terms (signup) ──
    if (state.mode === 'signup') {
      const terms = card.querySelector('input[name="terms"]');
      if (terms && !terms.checked) {
        state.submitError = i18n.t('auth.errTerms');
        shakeCard();
        render();
        return;
      }
    }

    if (hasError) {
      shakeCard();
      // فوکوس روی اولین فیلد با خطا
      const firstError = card.querySelector('.fi--error .fi__input');
      firstError?.focus();
      return;
    }

    // ── داده‌ها ──
    const data = {
      email:     state.inputs.email?.getValue().trim() || '',
      password:  state.inputs.password?.getValue() || '',
      full_name: state.inputs.full_name?.getValue().trim() || '',
      remember:  card.querySelector('input[name="remember"]')?.checked || false,
    };

    // ── شروع بارگذاری ──
    state.loading = true;
    state.submitError = '';
    render();

    try {
      await onSubmit(data);
      // اگه موفق بود، auth.js مدیریت می‌کنه
    } catch (err) {
      state.loading = false;
      state.submitError = mapError(err);
      render();
      shakeCard();
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════
  function shakeCard() {
    if (!CONFIG.authUI.shakeOnError) return;
    card.classList.add('is-shaking');
    setTimeout(() => card.classList.remove('is-shaking'), 500);
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
  //  Public API
  // ═══════════════════════════════════════════════════════════
  wrap.setError = (msg) => {
    state.loading = false;
    state.submitError = msg;
    render();
    shakeCard();
  };

  wrap.setLoading = (loading) => {
    state.loading = Boolean(loading);
    render();
  };

  wrap.getCard = () => card;

  // ── Render اولیه ──
  render();

  return wrap;
}