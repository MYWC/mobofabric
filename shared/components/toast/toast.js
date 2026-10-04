// ═══════════════════════════════════════════════════════════
//  Toast — Velvet Luxury
//  Phase 26 — Obsidian Vault
// ═══════════════════════════════════════════════════════════

import { h, qs } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { icons } from '../../icons/icons.js';

let container = null;

// ═══════════════════════════════════════════════════════════
//  Container
// ═══════════════════════════════════════════════════════════
function ensureContainer() {
  if (container) return container;
  container = h('div', {
    class: 'toast-container',
    role: 'status',
    'aria-live': 'polite',
  });
  document.body.append(container);
  return container;
}

// ═══════════════════════════════════════════════════════════
//  Toast
// ═══════════════════════════════════════════════════════════
export const toast = {
  show({ type = 'info', message = '', duration = 3200 }) {
    if (!message) return;

    const root = ensureContainer();

    // آیکون بر اساس type
    const iconMap = {
      success: icons.check,
      error:   icons.alert,
      warning: icons.alert,
      info:    icons.info,
    };
    const icon = iconMap[type] || icons.info;

    // ساخت toast
    const el = h('div', { class: `toast toast--${type}` });

    el.append(
      h('span', { class: 'toast__icon', innerHTML: icon }),
      h('span', { class: 'toast__message' }, message),
      h('span', {
        class: 'toast__progress',
        style: { animationDuration: `${duration}ms` },
      }),
    );

    root.append(el);

    // ورود نرم
    requestAnimationFrame(() => el.classList.add('toast--in'));

    // خروج
    const close = () => {
      if (el.dataset.closing === '1') return;
      el.dataset.closing = '1';
      el.classList.remove('toast--in');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
      // Fail-safe
      setTimeout(() => el.remove(), 500);
    };

    const timer = setTimeout(close, duration);
    el.addEventListener('click', () => {
      clearTimeout(timer);
      close();
    });

    return el;
  },

  success(message, duration) {
    return toast.show({ type: 'success', message, duration });
  },

  error(message, duration) {
    return toast.show({ type: 'error', message, duration });
  },

  warning(message, duration) {
    return toast.show({ type: 'warning', message, duration });
  },

  info(message, duration) {
    return toast.show({ type: 'info', message, duration });
  },
};

// ═══════════════════════════════════════════════════════════
//  Global listener
// ═══════════════════════════════════════════════════════════
events.on('toast:show', (detail) => toast.show(detail));