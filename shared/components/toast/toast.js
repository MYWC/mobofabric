import { h, qs } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { icons } from '../../icons/icons.js';

let container = null;

function ensureContainer() {
  if (container) return container;
  container = h('div', { class: 'toast-container', role: 'status', 'aria-live': 'polite' });
  document.body.append(container);
  return container;
}

export const toast = {
  show({ type = 'info', message = '', duration = 2800 }) {
    if (!message) return;
    const root = ensureContainer();
    const icon = icons[type] || icons.info;

    const el = h('div', { class: `toast toast--${type}` },
      h('span', { class: 'toast__icon', innerHTML: icon }),
      h('span', { class: 'toast__message' }, message),
    );

    root.append(el);
    requestAnimationFrame(() => el.classList.add('toast--in'));

    const close = () => {
      el.classList.remove('toast--in');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    };

    const timer = setTimeout(close, duration);
    el.addEventListener('click', () => { clearTimeout(timer); close(); });
  },
};

// گوش دادن به رویداد سراسری
events.on('toast:show', (detail) => toast.show(detail));