// ═══════════════════════════════════════════════════════════
//  آیکون‌های SVG درون‌خطی
// ═══════════════════════════════════════════════════════════

const wrap = (svg) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`;

export const icons = {
  logo:     `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>`,
  search:   wrap(`<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`),
  cart:     wrap(`<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>`),
  sun:      wrap(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`),
  moon:     wrap(`<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`),
  globe:    wrap(`<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>`),
  menu:     wrap(`<path d="M4 6h16M4 12h16M4 18h16"/>`),
  close:    wrap(`<path d="M18 6 6 18M6 6l12 12"/>`),
  arrowL:   wrap(`<path d="m15 18-6-6 6-6"/>`),
  arrowR:   wrap(`<path d="m9 18 6-6-6-6"/>`),
  filter:   wrap(`<path d="M3 6h18M6 12h12M10 18h4"/>`),
  chevron:  wrap(`<path d="m6 9 6 6 6-6"/>`),
  check:    wrap(`<path d="M20 6 9 17l-5-5"/>`),
  info:     wrap(`<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>`),
  alert:    wrap(`<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>`),
};