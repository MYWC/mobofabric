// ═══════════════════════════════════════════════════════════
//  Split Hero — Phase 19
//  نیمه‌ی برندینگ صفحه Auth
// ═══════════════════════════════════════════════════════════

import { h } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { createParticles } from './particles.js';

// ═══════════════════════════════════════════════════════════
//  Icon helpers
// ═══════════════════════════════════════════════════════════
const SVG = (inner, size = 16) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const ICONS = {
  check:    SVG(`<path d="M20 6 9 17l-5-5"/>`),
  logo:     `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>`,
  star:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.95 6.36 6.95.63-5.25 4.6 1.55 6.83L12 16.9l-6.2 3.52 1.55-6.83-5.25-4.6 6.95-.63L12 2z"/></svg>`,
};

// ═══════════════════════════════════════════════════════════
//  Hero SVG — گوشی شناور
// ═══════════════════════════════════════════════════════════
function HeroPhoneSVG() {
  const el = document.createElement('div');
  el.className = 'split-hero__phone-wrap';
  el.setAttribute('aria-hidden', 'true');

  el.innerHTML = `
    <svg class="split-hero__phone-svg" viewBox="0 0 340 480" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="phoneBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(255,255,255,0.95)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0.75)"/>
        </linearGradient>
        <linearGradient id="phoneScreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0071e3"/>
          <stop offset="0.5" stop-color="#5856d6"/>
          <stop offset="1" stop-color="#af52de"/>
        </linearGradient>
        <radialGradient id="phoneGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.4"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Glow پشت -->
      <ellipse cx="170" cy="240" rx="160" ry="200" fill="url(#phoneGlow)"/>

      <!-- بدنه -->
      <rect x="70" y="40" width="200" height="400" rx="36"
            fill="url(#phoneBody)" opacity="0.95"/>
      <rect x="70" y="40" width="200" height="400" rx="36"
            fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>

      <!-- ناچ -->
      <rect x="145" y="52" width="50" height="14" rx="7"
            fill="rgba(0,0,0,0.15)"/>

      <!-- صفحه -->
      <rect x="84" y="76" width="172" height="336" rx="24"
            fill="url(#phoneScreen)" opacity="0.9"/>

      <!-- محتوای صفحه -->
      <rect x="100" y="110" width="140" height="10" rx="5" fill="#fff" opacity="0.35"/>
      <rect x="100" y="132" width="90" height="10" rx="5" fill="#fff" opacity="0.22"/>

      <rect x="100" y="170" width="140" height="90" rx="14" fill="#fff" opacity="0.18"/>
      <circle cx="130" cy="215" r="14" fill="#fff" opacity="0.4"/>

      <rect x="100" y="280" width="140" height="10" rx="5" fill="#fff" opacity="0.35"/>
      <rect x="100" y="302" width="100" height="10" rx="5" fill="#fff" opacity="0.22"/>

      <rect x="100" y="340" width="140" height="44" rx="22" fill="#fff" opacity="0.35"/>

      <!-- دکمه پایین -->
      <circle cx="170" cy="428" r="4" fill="#fff" opacity="0.7"/>

      <!-- ذرات دور گوشی -->
      <circle cx="45" cy="120" r="5" fill="#fff" opacity="0.7"/>
      <circle cx="300" cy="180" r="4" fill="#fff" opacity="0.55"/>
      <circle cx="35" cy="320" r="6" fill="#fff" opacity="0.5"/>
      <circle cx="305" cy="380" r="5" fill="#fff" opacity="0.6"/>
      <circle cx="280" cy="80" r="3" fill="#fff" opacity="0.75"/>
      <circle cx="60" cy="430" r="4" fill="#fff" opacity="0.5"/>
    </svg>
  `;

  return el;
}

// ═══════════════════════════════════════════════════════════
//  Trust Benefit Item
// ═══════════════════════════════════════════════════════════
function Benefit(key) {
  return h('li', { class: 'split-hero__benefit' },
    h('span', { class: 'split-hero__benefit-icon', innerHTML: ICONS.check }),
    h('span', { class: 'split-hero__benefit-text' }, i18n.t(key)),
  );
}

// ═══════════════════════════════════════════════════════════
//  Main — createSplitHero
// ═══════════════════════════════════════════════════════════
export function createSplitHero() {
  // ── Section ──
  const section = h('section', { class: 'split-hero', 'aria-hidden': 'true' });

  // ── Background Layers ──
  const bgGradient = h('div', { class: 'split-hero__bg-gradient' });
  const bgGrid     = h('div', { class: 'split-hero__bg-grid' });
  const particlesHost = h('div', { class: 'split-hero__particles' });
  const glow       = h('div', { class: 'split-hero__bg-glow' });

  section.append(bgGradient, bgGrid, glow, particlesHost);

  // ── Content ──
  const content = h('div', { class: 'split-hero__content' },
    // Brand
    h('div', { class: 'split-hero__brand' },
      h('span', { class: 'split-hero__logo', innerHTML: ICONS.logo }),
      h('span', { class: 'split-hero__brand-text' }, 'Phone Store'),
    ),

    // Center — Phone + Text
    h('div', { class: 'split-hero__center' },
      HeroPhoneSVG(),
      h('h2', { class: 'split-hero__title' }, i18n.t('auth.splitTitle')),
      h('p',  { class: 'split-hero__subtitle' }, i18n.t('auth.splitSubtitle')),
    ),

    // Footer — Stats + Benefits
    h('div', { class: 'split-hero__footer' },
      // Stats
      h('div', { class: 'split-hero__stats' },
        h('div', { class: 'split-hero__stat' },
          h('div', { class: 'split-hero__stat-value' }, i18n.t('auth.statCustomers')),
          h('div', { class: 'split-hero__stat-label' }, i18n.t('auth.statCustomersLabel')),
        ),
        h('div', { class: 'split-hero__stat-divider', 'aria-hidden': 'true' }),
        h('div', { class: 'split-hero__stat' },
          h('div', { class: 'split-hero__stat-value split-hero__stat-value--stars' },
            h('span', { class: 'split-hero__stat-stars' },
              ICONS.star, ICONS.star, ICONS.star, ICONS.star, ICONS.star,
            ),
          ),
          h('div', { class: 'split-hero__stat-label' }, i18n.t('auth.statRatingLabel')),
        ),
      ),

      // Benefits
      h('ul', { class: 'split-hero__benefits' },
        Benefit('auth.benefit1'),
        Benefit('auth.benefit2'),
        Benefit('auth.benefit3'),
        Benefit('auth.benefit4'),
      ),
    ),
  );

  section.append(content);

  // ── ذرات (بعد از mount) ──
  let destroyParticles = () => {};

  requestAnimationFrame(() => {
    destroyParticles = createParticles(particlesHost, {
      count: 18,
      color: 'rgba(255, 255, 255, 0.5)',
      minSize: 2,
      maxSize: 5,
      speed: 0.8,
      orbit: false,
    });
  });

  // ── تغییر زبان → متن‌ها آپدیت ──
  const offLang = events.on('lang:changed', () => {
    const title = section.querySelector('.split-hero__title');
    if (title) title.textContent = i18n.t('auth.splitTitle');

    const sub = section.querySelector('.split-hero__subtitle');
    if (sub) sub.textContent = i18n.t('auth.splitSubtitle');

    const statLabels = section.querySelectorAll('.split-hero__stat-label');
    if (statLabels[0]) statLabels[0].textContent = i18n.t('auth.statCustomersLabel');
    if (statLabels[1]) statLabels[1].textContent = i18n.t('auth.statRatingLabel');

    const benefitTexts = section.querySelectorAll('.split-hero__benefit-text');
    const keys = ['auth.benefit1','auth.benefit2','auth.benefit3','auth.benefit4'];
    benefitTexts.forEach((el, i) => {
      if (keys[i]) el.textContent = i18n.t(keys[i]);
    });
  });

  // ── Public API ──
  section.destroy = () => {
    destroyParticles();
    offLang?.();
  };

  return section;
}