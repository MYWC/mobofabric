// ═══════════════════════════════════════════════════════════
//  Auth Animations — Phase 19
//  لایه‌ی انیمیشن برای صفحه Auth
// ═══════════════════════════════════════════════════════════

import { qs, qsa, on } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { CONFIG } from '../../core/config.js';

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const authAnimations = {
  /**
   * اجرای entrance animation
   * @param {HTMLElement} page — عنصر صفحه Auth
   */
  playEntrance(page) {
    if (!page) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ═══════════════════════════════════════════════════════
    //  1. Split Entrance — دو طرف از هم
    // ═══════════════════════════════════════════════════════
    const isRTL = document.documentElement.dir === 'rtl';
    const hero = qs('.split-hero', page);
    const formSide = qs('.auth-page__form-side', page);

    if (hero) {
      hero.style.opacity = '0';
      hero.style.transform = `translateX(${isRTL ? '60px' : '-60px'})`;
      hero.style.transition = 'opacity 800ms cubic-bezier(.16, 1, .3, 1), transform 800ms cubic-bezier(.16, 1, .3, 1)';

      requestAnimationFrame(() => {
        hero.style.opacity = '1';
        hero.style.transform = 'translateX(0)';
      });
    }

    if (formSide) {
      formSide.style.opacity = '0';
      formSide.style.transform = `translateX(${isRTL ? '-60px' : '60px'})`;
      formSide.style.transition = 'opacity 800ms 100ms cubic-bezier(.16, 1, .3, 1), transform 800ms 100ms cubic-bezier(.16, 1, .3, 1)';

      requestAnimationFrame(() => {
        setTimeout(() => {
          formSide.style.opacity = '1';
          formSide.style.transform = 'translateX(0)';
        }, 80);
      });
    }

    // ═══════════════════════════════════════════════════════
    //  2. Glass Card stagger
    // ═══════════════════════════════════════════════════════
    const card = qs('.glass-card', page);
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(24px) scale(0.96)';
      card.style.transition = 'opacity 600ms 300ms cubic-bezier(.34, 1.56, .64, 1), transform 600ms 300ms cubic-bezier(.34, 1.56, .64, 1)';

      requestAnimationFrame(() => {
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0) scale(1)';
        }, 200);
      });
    }

    // ═══════════════════════════════════════════════════════
    //  3. Stagger form elements
    // ═══════════════════════════════════════════════════════
    staggerChildren(page, [
      '.glass-card__brand',
      '.glass-card__header',
      '.glass-form > .fi',
      '.pws-wrap',
      '.glass-form__meta',
      '.glass-form > .glass-checkbox--terms',
      '.glass-submit',
      '.glass-divider',
      '.glass-social',
      '.glass-switch',
    ]);
  },

  /**
   * اجرای انیمیشن تعویض Mode (login ↔ signup)
   * @param {HTMLElement} card — کارت شیشه‌ای
   */
  playModeSwitch(card) {
    if (!card) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Card flip (subtle)
    card.animate(
      [
        { transform: 'scale(1)',       opacity: 1 },
        { transform: 'scale(0.98)',    opacity: 0.7, offset: 0.4 },
        { transform: 'scale(1.01)',    opacity: 1,   offset: 0.7 },
        { transform: 'scale(1)',       opacity: 1 },
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(.34, 1.56, .64, 1)',
      }
    );

    // فرم جدید: stagger
    requestAnimationFrame(() => {
      const formEls = qsa('.glass-form > .fi, .glass-form > .glass-checkbox, .glass-form > .glass-submit', card);
      formEls.forEach((el, i) => {
        el.animate(
          [
            { opacity: 0, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 400,
            delay: i * 50,
            easing: 'cubic-bezier(.4, 0, .2, 1)',
            fill: 'both',
          }
        );
      });
    });
  },

  /**
   * انیمیشن Shake (تو خطا)
   * @param {HTMLElement} card
   */
  playShake(card) {
    if (!card) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    card.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-2px)' },
        { transform: 'translateX(2px)' },
        { transform: 'translateX(0)' },
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(.36, .07, .19, .97)',
      }
    );
  },

  /**
   * انیمیشن Success (بعد از ورود موفق)
   * @param {HTMLElement} card
   */
  playSuccess(card) {
    if (!card) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    card.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.02)' },
        { transform: 'scale(1)' },
      ],
      {
        duration: 400,
        easing: 'cubic-bezier(.34, 1.56, .64, 1)',
      }
    );
  },
};

// ═══════════════════════════════════════════════════════════
//  Stagger Children helper
// ═══════════════════════════════════════════════════════════
function staggerChildren(root, selectors, baseDelay = 400, stepDelay = 60) {
  let index = 0;

  selectors.forEach(sel => {
    const els = qsa(sel, root);
    els.forEach(el => {
      // فقط عناصری که داخل کارت هستن
      if (!el.closest('.glass-card') && !el.classList.contains('glass-card')) return;

      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';

      setTimeout(() => {
        el.style.transition = 'opacity 500ms cubic-bezier(.4, 0, .2, 1), transform 500ms cubic-bezier(.4, 0, .2, 1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, baseDelay + index * stepDelay);

      index++;
    });
  });
}