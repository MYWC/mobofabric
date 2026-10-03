// ═══════════════════════════════════════════════════════════
//  Auth — Phase 19 (Redesign + Animations)
// ═══════════════════════════════════════════════════════════

import { h, qs, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { CONFIG } from '../../core/config.js';
import { icons } from '../../shared/icons/icons.js';
import { authLang } from './auth.lang.js';
import { createSplitHero } from './auth-components/split-hero.js';
import { createGlassForm } from './auth-components/glass-form.js';
import { authAnimations } from './auth-animations.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  mode:      'login',
  container: null,
  heroEl:    null,
  formEl:    null,
  profile:   null,
  menuOpen:  false,
  headerEl:  null,
};

let offAuth = null;
let offLang = null;
let offOutside = null;

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
//  Auth Page
// ═══════════════════════════════════════════════════════════
function showAuth(query = {}) {
  state.container = qs('#app');
  state.mode = 'login';
  state.heroEl = null;
  state.formEl = null;

  if (state.profile) {
    router.navigate('/');
    return;
  }

  renderPage();
}

function renderPage() {
  if (!state.container) return;

  if (state.heroEl?.destroy) state.heroEl.destroy();

  state.heroEl = CONFIG.authUI.splitLayout ? createSplitHero() : null;

  state.formEl = createGlassForm({
    mode: state.mode,
    onSubmit: handleAuthSubmit,
    onSwitch: (newMode) => {
      state.mode = newMode;
      // 🎬 انیمیشن تعویض mode
      requestAnimationFrame(() => {
        const card = qs('.glass-card', state.container);
        if (card) authAnimations.playModeSwitch(card);
      });
    },
  });

  const page = h('div', { class: `auth-page is-entering ${CONFIG.authUI.splitLayout ? 'auth-page--split' : ''}` },
    state.heroEl,
    h('div', { class: 'auth-page__form-side' }, state.formEl),
  );

  render(state.container, page);

  // 🎬 اجرای entrance animation
  requestAnimationFrame(() => {
    authAnimations.playEntrance(page);
  });
}

// ═══════════════════════════════════════════════════════════
//  Submit Handler
// ═══════════════════════════════════════════════════════════
async function handleAuthSubmit(data) {
  try {
    if (state.mode === 'login') {
      await api.auth.signIn(data.email, data.password);
      events.emit('toast:show', { type: 'success', message: i18n.t('auth.loginSuccess') });
      playSuccessAnimation();
      if (CONFIG.authUI.confetti) fireConfetti();
      setTimeout(() => router.navigate('/'), 800);
    } else {
      await api.auth.signUp(data.email, data.password, data.full_name);
      events.emit('toast:show', { type: 'success', message: i18n.t('auth.signupSuccess') });
      playSuccessAnimation();
      if (CONFIG.authUI.confetti) fireConfetti();
      setTimeout(() => router.navigate('/'), 800);
    }
  } catch (err) {
    state.formEl.setError(mapError(err));
    requestAnimationFrame(() => {
      const card = qs('.glass-card', state.container);
      if (card) authAnimations.playShake(card);
    });
    throw err;
  }
}

function playSuccessAnimation() {
  requestAnimationFrame(() => {
    const card = qs('.glass-card', state.container);
    if (card) authAnimations.playSuccess(card);
  });
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
  const COUNT = 40;

  for (let i = 0; i < COUNT; i++) {
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
      will-change: transform, opacity;
    `;
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 240;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 60;

    p.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0deg) scale(0.3)', opacity: 0 },
        { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)',   opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${Math.random() * 720}deg) scale(0.2)`, opacity: 0 },
      ],
      {
        duration: 1400 + Math.random() * 600,
        easing: 'cubic-bezier(.4, 0, .2, 1)',
        fill: 'forwards',
      }
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

    if (location.hash.startsWith('#/admin')) {
      router.navigate('/');
    } else {
      renderHeaderMenu();
    }
  } catch (err) {
    console.error('[auth] logout failed', err);
  }
}