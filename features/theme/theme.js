import { CONFIG } from '../../core/config.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';

const KEY = CONFIG.storageKeys.theme;

function detectInitial() {
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
  events.emit('theme:changed', { theme });
}

export const theme = {
  register() {
    apply(detectInitial());

    events.on('theme:toggle', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
    });
  },
};