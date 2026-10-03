import { h } from '../../../core/dom.js';

export const Skeleton = {
  card() {
    return h('div', { class: 'skeleton-card', 'aria-hidden': 'true' },
      h('div', { class: 'skeleton skeleton--img' }),
      h('div', { class: 'skeleton skeleton--line', style: { width: '30%' } }),
      h('div', { class: 'skeleton skeleton--line', style: { width: '80%' } }),
      h('div', { class: 'skeleton skeleton--line', style: { width: '50%' } }),
    );
  },

  grid(count = 8) {
    return Array.from({ length: count }, () => Skeleton.card());
  },
};