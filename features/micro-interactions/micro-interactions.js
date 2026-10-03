// ═══════════════════════════════════════════════════════════
//  Micro-Interactions — Phase 17
//  ۶ افکت حرفه‌ای با Event Bus
//
//  ⚠️ همه‌چیز با events کار می‌کنه — هیچ فایل قبلی دست نمی‌خوره
// ═══════════════════════════════════════════════════════════

import { qs, qsa, on } from '../../core/dom.js';
import { events } from '../../core/events.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  isTouch:       false,
  reducedMotion: false,
  observer:      null,
  initialized:   false,
};

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const microInteractions = {
  register() {
    if (state.initialized) return;
    state.initialized = true;

    // تشخیص محیط
    state.isTouch = matchMedia('(hover: none)').matches;
    state.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ۱. 3D Tilt — روی کارت‌های محصول
    if (!state.isTouch && !state.reducedMotion) {
      events.on('product-card:created', ({ el }) => attachTilt(el));
    }

    // ۲. Magnetic Buttons — سراسری
    if (!state.isTouch && !state.reducedMotion) {
      setupMagneticButtons();
    }

    // ۳. Heart Explode — روی قلب کارت‌ها
    if (!state.reducedMotion) {
      events.on('product-card:created', ({ el, product }) => attachHeartExplode(el, product));
    }

    // ۴. Confetti + Fly to Cart — روی cart:add
    if (!state.reducedMotion) {
      events.on('cart:add', ({ product }) => {
        flyToCart(product);
        showConfetti();
      });
    }

    // ۵. Ripple Effect — روی همه دکمه‌ها
    if (!state.reducedMotion) {
      setupRipple();
    }

    // ۶. Scroll Reveal — سراسری
    setupGlobalReveal();
    events.on('route:changed', () => {
      // بعد از هر navigation، reveal رو دوباره فعال کن
      setTimeout(setupGlobalReveal, 100);
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  ۱. 3D Tilt روی Product Card
// ═══════════════════════════════════════════════════════════
function attachTilt(card) {
  if (!card || card.dataset.tiltAttached === '1') return;
  card.dataset.tiltAttached = '1';

  const MAX_TILT = 6;      // درجه
  const SCALE = 1.02;

  let rafId = null;
  let targetRX = 0, targetRY = 0;
  let currentRX = 0, currentRY = 0;

  const onMove = (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // محاسبه‌ی rotate
    targetRY = (x - 0.5) * 2 * MAX_TILT;   // چپ/راست
    targetRX = (0.5 - y) * 2 * MAX_TILT;   // بالا/پایین

    if (!rafId) tick();
  };

  const onLeave = () => {
    targetRX = 0;
    targetRY = 0;
    if (!rafId) tick();
  };

  const tick = () => {
    currentRX += (targetRX - currentRX) * 0.15;
    currentRY += (targetRY - currentRY) * 0.15;

    card.style.transform = `
      perspective(900px)
      rotateX(${currentRX.toFixed(2)}deg)
      rotateY(${currentRY.toFixed(2)}deg)
      scale(${SCALE})
    `;

    const nearTarget =
      Math.abs(targetRX - currentRX) < 0.05 &&
      Math.abs(targetRY - currentRY) < 0.05;

    if (nearTarget) {
      currentRX = targetRX;
      currentRY = targetRY;

      if (targetRX === 0 && targetRY === 0) {
        card.style.transform = '';
        card.style.transition = 'transform 400ms cubic-bezier(.4, 0, .2, 1)';
        setTimeout(() => {
          if (card) card.style.transition = '';
        }, 400);
      }
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  on(card, 'mouseenter', () => {
    card.style.transition = '';
    card.style.willChange = 'transform';
  });
  on(card, 'mousemove', onMove);
  on(card, 'mouseleave', onLeave);
}

// ═══════════════════════════════════════════════════════════
//  ۲. Magnetic Buttons
// ═══════════════════════════════════════════════════════════
function setupMagneticButtons() {
  const SELECTOR = '.btn--accent, .btn--ghost, .home-hero__cta, .home-section__view-all';

  // استفاده از event delegation — روی هر صفحه کار می‌کنه
  document.body.addEventListener('mousemove', (e) => {
    const btn = e.target.closest(SELECTOR);
    if (!btn) return;
    if (btn.dataset.magnetic) return;

    // جذب موس
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const MAX_SHIFT = 4;
    const shiftX = (x / rect.width) * MAX_SHIFT * 2;
    const shiftY = (y / rect.height) * MAX_SHIFT * 2;

    btn.style.transform = `translate(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px)`;
    btn.style.transition = 'transform 200ms cubic-bezier(.4, 0, .2, 1)';
    btn.dataset.magnetic = '1';
  });

  document.body.addEventListener('mouseout', (e) => {
    const btn = e.target.closest(SELECTOR);
    if (!btn) return;
    if (!btn.dataset.magnetic) return;

    btn.style.transform = '';
    btn.style.transition = 'transform 400ms cubic-bezier(.34, 1.56, .64, 1)';

    setTimeout(() => {
      delete btn.dataset.magnetic;
      btn.style.transition = '';
      btn.style.transform = '';
    }, 400);
  });
}

// ═══════════════════════════════════════════════════════════
//  ۳. Heart Explode
// ═══════════════════════════════════════════════════════════
function attachHeartExplode(card, product) {
  if (!card) return;
  const heart = card.querySelector('.product-card__heart');
  if (!heart) return;
  if (heart.dataset.explodeAttached === '1') return;
  heart.dataset.explodeAttached = '1';

  on(heart, 'click', () => {
    // فقط اگه فعال شد (نه حذف)
    const isActive = !heart.classList.contains('is-active');
    if (!isActive) return;

    explodeHeart(heart);
  });
}

function explodeHeart(heart) {
  const rect = heart.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const PARTICLE_COUNT = 8;
  const COLOR = getComputedStyle(heart).color || '#ff3b30';

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = document.createElement('span');
    p.className = 'mi-heart-particle';
    p.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${COLOR};
      pointer-events: none;
      z-index: 99998;
      transform: translate(-50%, -50%);
      will-change: transform, opacity;
    `;
    document.body.appendChild(p);

    const angle = (360 / PARTICLE_COUNT) * i + Math.random() * 30;
    const distance = 30 + Math.random() * 20;
    const rad = (angle * Math.PI) / 180;

    const tx = Math.cos(rad) * distance;
    const ty = Math.sin(rad) * distance;

    p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)',   opacity: 1 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 },
      ],
      {
        duration: 600,
        easing: 'cubic-bezier(.4, 0, .2, 1)',
        fill: 'forwards',
      }
    ).addEventListener('finish', () => p.remove());
  }
}

// ═══════════════════════════════════════════════════════════
//  ۴. Fly to Cart + Confetti
// ═══════════════════════════════════════════════════════════
function flyToCart(product) {
  const cartBtn = qs('.header__cart') || qs('[data-action="cart"]');
  if (!cartBtn) return;

  const cartRect = cartBtn.getBoundingClientRect();
  const endX = cartRect.left + cartRect.width / 2;
  const endY = cartRect.top + cartRect.height / 2;

  // تلاش برای پیدا کردن تصویر محصول از کارت‌های صفحه
  const productCards = qsa('[data-slug]');
  const sourceCard = productCards.find(c => c.dataset.slug === product?.slug);
  const sourceImg = sourceCard?.querySelector('.product-card__media img');

  let startX, startY, imgSrc;

  if (sourceImg) {
    const r = sourceImg.getBoundingClientRect();
    startX = r.left + r.width / 2;
    startY = r.top + r.height / 2;
    imgSrc = sourceImg.src;
  } else {
    // fallback: وسط صفحه
    startX = window.innerWidth / 2;
    startY = window.innerHeight / 2;
    imgSrc = product?.cover_url;
  }

  // اگه تصویر نداریم، فقط یه دایره بفرست
  const fly = document.createElement('div');
  fly.className = 'mi-fly-to-cart';

  if (imgSrc) {
    fly.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      width: 60px;
      height: 60px;
      border-radius: 16px;
      background: url('${imgSrc}') center/cover;
      background-color: var(--color-bg-secondary);
      box-shadow: 0 12px 32px rgba(0,0,0,0.2);
      pointer-events: none;
      z-index: 99998;
      transform: translate(-50%, -50%) scale(1);
      will-change: transform, opacity, left, top;
    `;
  } else {
    fly.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-accent);
      pointer-events: none;
      z-index: 99998;
      transform: translate(-50%, -50%) scale(1);
    `;
  }

  document.body.appendChild(fly);

  // انیمیشن با keyframes پویا
  const anim = fly.animate(
    [
      {
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1,
        left: `${startX}px`,
        top: `${startY}px`,
      },
      {
        transform: 'translate(-50%, -50%) scale(0.6)',
        opacity: 0.9,
        left: `${(startX + endX) / 2}px`,
        top: `${(startY + endY) / 2 - 80}px`,
        offset: 0.5,
      },
      {
        transform: 'translate(-50%, -50%) scale(0.2)',
        opacity: 0,
        left: `${endX}px`,
        top: `${endY}px`,
      },
    ],
    {
      duration: 850,
      easing: 'cubic-bezier(.4, 0, .2, 1)',
    }
  );

  anim.addEventListener('finish', () => {
    fly.remove();

    // Bounce روی آیکون سبد
    if (cartBtn) {
      cartBtn.classList.add('mi-cart-bounce');
      setTimeout(() => cartBtn.classList.remove('mi-cart-bounce'), 500);
    }
  });
}

function showConfetti() {
  const cartBtn = qs('.header__cart') || qs('[data-action="cart"]');
  if (!cartBtn) return;

  const rect = cartBtn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const COLORS = ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de'];
  const COUNT = 14;

  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('span');
    const size = 4 + Math.random() * 4;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    p.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      background: ${color};
      pointer-events: none;
      z-index: 99998;
      transform: translate(-50%, -50%);
      will-change: transform, opacity;
    `;
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 40;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 10;

    p.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${Math.random() * 360}deg) scale(0.2)`, opacity: 0 },
      ],
      {
        duration: 700 + Math.random() * 300,
        easing: 'cubic-bezier(.4, 0, .2, 1)',
        fill: 'forwards',
      }
    ).addEventListener('finish', () => p.remove());
  }
}

// ═══════════════════════════════════════════════════════════
//  ۵. Ripple Effect
// ═══════════════════════════════════════════════════════════
function setupRipple() {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn, .icon-btn, .chip, .qty__btn');
    if (!btn) return;
    if (btn.classList.contains('no-ripple')) return;

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.className = 'mi-ripple';

    const size = Math.max(rect.width, rect.height) * 1.6;
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      margin-left: -${size / 2}px;
      margin-top: -${size / 2}px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.15;
      pointer-events: none;
      transform: scale(0);
      will-change: transform, opacity;
    `;

    // اطمینان از relative بودن button
    const pos = getComputedStyle(btn).position;
    if (pos === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';

    btn.appendChild(ripple);

    ripple.animate(
      [
        { transform: 'scale(0)', opacity: 0.25 },
        { transform: 'scale(1)', opacity: 0 },
      ],
      {
        duration: 600,
        easing: 'cubic-bezier(.4, 0, .2, 1)',
      }
    ).addEventListener('finish', () => ripple.remove());
  });
}

// ═══════════════════════════════════════════════════════════
//  ۶. Global Scroll Reveal
// ═══════════════════════════════════════════════════════════
function setupGlobalReveal() {
  if (state.reducedMotion) return;
  if (!('IntersectionObserver' in window)) return;

  // صفحه‌هایی که خودشون reveal دارن رو skip کن (home)
  const isHomePage = document.querySelector('.home-page');
  if (isHomePage) return;

  // عناصری که باید fade-in بشن
  const targets = qsa(
    '.products-header, .toolbar, .product-card, .cart-header, .cart-item, ' +
    '.cart-summary, .brands-header, .brand-card, .pd-breadcrumb, .pd-gallery, ' +
    '.pd-info, .pd-tabs, .pd-related, .admin-section-header, .admin-table-wrap, ' +
    '.about-hero__inner, .contact-hero__inner, .auth-card, .empty-state'
  );

  targets.forEach((el) => {
    if (el.dataset.revealed === '1') return;
    if (el.dataset.revealing === '1') return;
    el.dataset.revealing = '1';
    el.classList.add('mi-reveal');
  });

  // observer قبلی رو پاک کن
  state.observer?.disconnect();

  state.observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('mi-reveal--visible');
          entry.target.dataset.revealed = '1';
          state.observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.05,
    }
  );

  qsa('.mi-reveal').forEach((el) => state.observer.observe(el));
}