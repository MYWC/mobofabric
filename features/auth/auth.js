// ═══════════════════════════════════════════════════════════
//  Auth — Phase 23 (Ultra Pro Edition)
//  Canvas Particles + Custom Cursor + Multi-Step + Success
// ═══════════════════════════════════════════════════════════

import { h, qs, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { CONFIG } from '../../core/config.js';
import { icons } from '../../shared/icons/icons.js';
import { authLang } from './auth.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  mode:      'login',
  step:      1,        // 1: email, 2: password (فقط در حالت ورود)
  container: null,
  profile:   null,
  menuOpen:  false,
  headerEl:  null,
  loading:   false,
  error:     '',
  socialLoading: null,
  inputs:    { email: '', password: '', full_name: '' },
  showPass:  false,
  pwsVisible: false,
  pwsEl:     null,
  canvasCtx: null,
  particles: [],
  mouse:     { x: 0, y: 0 },
  cursor:    null,
  rafId:     null,
  pwsChecks: { length: false, case: false, digit: false, special: false },
  testimonialIndex: 0,
  testimonialTimer: null,
};

let offAuth = null;
let offLang = null;
let offOutside = null;
let offMouse = null;
let offResize = null;

// ═══════════════════════════════════════════════════════════
//  Icons
// ═══════════════════════════════════════════════════════════
const SVG = (inner, size = 20) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const I = {
  logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>`,
  mail: SVG(`<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 8 10 6 10-6"/>`),
  lock: SVG(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`),
  user: SVG(`<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>`),
  eye: SVG(`<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`),
  eyeOff: SVG(`<path d="M9.88 9.88a3 3 0 0 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>`),
  arrow: SVG(`<path d="m15 18-6-6 6-6"/>`, 18),
  arrowR: SVG(`<path d="m9 18 6-6-6-6"/>`, 18),
  check: SVG(`<path d="M20 6 9 17l-5-5"/>`, 14),
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.95 6.36 6.95.63-5.25 4.6 1.55 6.83L12 16.9l-6.2 3.52 1.55-6.83-5.25-4.6 6.95-.63L12 2z"/></svg>`,
  shield: SVG(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`, 16),
  bolt: SVG(`<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>`, 16),
  spinner: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>`,
  google: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
  github: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>`,
  close: SVG(`<path d="M18 6 6 18M6 6l12 12"/>`, 22),
};

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
//  Show Auth
// ═══════════════════════════════════════════════════════════
function showAuth() {
  state.container = qs('#app');
  state.mode = 'login';
  state.step = 1;
  state.error = '';
  state.inputs = { email: '', password: '', full_name: '' };
  state.showPass = false;
  state.pwsVisible = false;
  state.pwsEl = null;
  state.testimonialIndex = 0;

  if (state.profile) {
    router.navigate('/');
    return;
  }

  renderPage();
}

// ═══════════════════════════════════════════════════════════
//  Render Page
// ═══════════════════════════════════════════════════════════
function renderPage() {
  if (!state.container) return;

  // پاکسازی
  destroyEffects();

  const page = h('div', { class: 'au-page' },
    CanvasLayer(),
    Background(),
    FloatingCards(),
    Content(),
    CustomCursor(),
  );

  render(state.container, page);

  requestAnimationFrame(() => {
    page.classList.add('is-ready');
    initCanvas();
    initCursor();
    initTestimonials();
    initCounters();
  });
}

// ═══════════════════════════════════════════════════════════
//  Canvas Layer
// ═══════════════════════════════════════════════════════════
function CanvasLayer() {
  return h('canvas', { class: 'au-canvas', id: 'au-canvas' });
}

function initCanvas() {
  const canvas = qs('#au-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  state.canvasCtx = ctx;

  resizeCanvas();

  // ذرات
  const PARTICLE_COUNT = 70;
  state.particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    state.particles.push(createParticle(canvas));
  }

  // موس
  offMouse = on(document, 'mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
  });

  offResize = on(window, 'resize', () => {
    resizeCanvas();
    state.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      state.particles.push(createParticle(canvas));
    }
  });

  // انیمیشن
  const animate = () => {
    const c = qs('#au-canvas');
    if (!c) return;
    drawParticles();
    state.rafId = requestAnimationFrame(animate);
  };
  animate();
}

function resizeCanvas() {
  const canvas = qs('#au-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  canvas.getContext('2d').scale(dpr, dpr);
}

function createParticle(canvas) {
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    radius: 1 + Math.random() * 2,
    baseRadius: 1 + Math.random() * 2,
    color: Math.random() > 0.5 ? '#0071e3' : '#af52de',
    alpha: 0.2 + Math.random() * 0.5,
    pulse: Math.random() * Math.PI * 2,
  };
}

function drawParticles() {
  const canvas = qs('#au-canvas');
  if (!canvas || !state.canvasCtx) return;

  const ctx = state.canvasCtx;
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  const mx = state.mouse.x;
  const my = state.mouse.y;

  state.particles.forEach(p => {
    // حرکت
    p.x += p.vx;
    p.y += p.vy;
    p.pulse += 0.02;

    // جذب به موس
    const dx = mx - p.x;
    const dy = my - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 200) {
      const force = (200 - dist) / 200;
      p.x += (dx / dist) * force * 0.8;
      p.y += (dy / dist) * force * 0.8;
      p.radius = p.baseRadius * (1 + force * 2);
    } else {
      p.radius += (p.baseRadius - p.radius) * 0.1;
    }

    // برخورد با لبه‌ها
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;

    p.x = Math.max(0, Math.min(w, p.x));
    p.y = Math.max(0, Math.min(h, p.y));

    // رسم
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha * (0.7 + Math.sin(p.pulse) * 0.3);
    ctx.fill();
  });

  // خطوط بین ذرات نزدیک
  ctx.globalAlpha = 1;
  for (let i = 0; i < state.particles.length; i++) {
    for (let j = i + 1; j < state.particles.length; j++) {
      const p1 = state.particles[i];
      const p2 = state.particles[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#0071e3';
        ctx.globalAlpha = (1 - dist / 120) * 0.15;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════
//  Custom Cursor
// ═══════════════════════════════════════════════════════════
function CustomCursor() {
  const cursor = h('div', { class: 'au-cursor' },
    h('div', { class: 'au-cursor__dot' }),
    h('div', { class: 'au-cursor__ring' }),
  );
  state.cursor = cursor;
  return cursor;
}

function initCursor() {
  const cursor = qs('.au-cursor');
  if (!cursor) return;

  let cx = 0, cy = 0;
  let tx = 0, ty = 0;

  on(document, 'mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });

  const animate = () => {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;

    const dot = cursor.querySelector('.au-cursor__dot');
    const ring = cursor.querySelector('.au-cursor__ring');

    if (dot) {
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
    }
    if (ring) {
      ring.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
    }

    state.rafId = requestAnimationFrame(animate);
  };

  // Hover states
  const hoverTargets = '.au-submit, .au-social__btn, .au-tab, .au-switch__btn, .au-input-toggle, .au-link';

  on(document, 'mouseover', (e) => {
    if (e.target.closest(hoverTargets)) cursor.classList.add('is-hover');
  });
  on(document, 'mouseout', (e) => {
    if (e.target.closest(hoverTargets)) cursor.classList.remove('is-hover');
  });

  // مخفی کردن روی موبایل
  if (matchMedia('(hover: none)').matches) {
    cursor.style.display = 'none';
  } else {
    document.body.style.cursor = 'none';
  }

  animate();
}

// ═══════════════════════════════════════════════════════════
//  Background
// ═══════════════════════════════════════════════════════════
function Background() {
  const bg = h('div', { class: 'au-bg' });

  bg.append(
    h('div', { class: 'au-bg__mesh' }),
    h('div', { class: 'au-bg__grid' }),
    h('div', { class: 'au-bg__orb au-bg__orb--1' }),
    h('div', { class: 'au-bg__orb au-bg__orb--2' }),
    h('div', { class: 'au-bg__orb au-bg__orb--3' }),
  );

  // Brands Marquee
  bg.append(BrandsMarquee());

  return bg;
}

function BrandsMarquee() {
  const brands = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OPPO', 'vivo', 'HONOR', 'Motorola', 'realme'];
  const track = h('div', { class: 'au-marquee__track' });

  // دوبار برای حرکت بی‌پایان
  for (let i = 0; i < 2; i++) {
    brands.forEach(name => {
      track.append(h('span', { class: 'au-marquee__item' },
        h('span', { class: 'au-marquee__dot' }),
        name,
      ));
    });
  }

  return h('div', { class: 'au-marquee' },
    h('div', { class: 'au-marquee__fade au-marquee__fade--left' }),
    track,
    h('div', { class: 'au-marquee__fade au-marquee__fade--right' }),
  );
}

// ═══════════════════════════════════════════════════════════
//  Floating Cards
// ═══════════════════════════════════════════════════════════
function FloatingCards() {
  const wrap = h('div', { class: 'au-floating' });

  // Rating
  wrap.append(
    h('div', { class: 'au-float au-float--rating' },
      h('div', { class: 'au-float__stars' },
        I.star, I.star, I.star, I.star, I.star,
      ),
      h('div', { class: 'au-float__text' },
        h('strong', {}, '۴.۹ از ۵'),
        h('span', {}, 'از ۵۰,۰۰۰+ کاربر'),
      ),
    ),
  );

  // Testimonial (auto rotating)
  wrap.append(
    h('div', { class: 'au-float au-float--testimonial', id: 'au-testimonial' },
      h('div', { class: 'au-float__quote' }, '💬'),
      h('p', { class: 'au-float__msg', id: 'au-testimonial-msg' },
        'بهترین فروشگاه موبایل که تجربه کردم!'),
      h('div', { class: 'au-float__author' },
        h('span', { class: 'au-float__avatar', id: 'au-testimonial-avatar' }, 'ع'),
        h('div', {},
          h('strong', { id: 'au-testimonial-name' }, 'علی محمدی'),
          h('span', { id: 'au-testimonial-role' }, 'مشتری دائمی'),
        ),
      ),
      h('div', { class: 'au-float__dots', id: 'au-testimonial-dots' }),
    ),
  );

  // Secure
  wrap.append(
    h('div', { class: 'au-float au-float--secure' },
      h('span', { class: 'au-float__icon', innerHTML: I.shield }),
      h('span', {}, 'SSL امن'),
    ),
  );

  // Fast
  wrap.append(
    h('div', { class: 'au-float au-float--fast' },
      h('span', { class: 'au-float__icon au-float__icon--bolt', innerHTML: I.bolt }),
      h('span', {}, 'ارسال ۲۴ ساعته'),
    ),
  );

  // Live counter
  wrap.append(
    h('div', { class: 'au-float au-float--counter' },
      h('span', { class: 'au-float__counter-dot' }),
      h('div', {},
        h('strong', { id: 'au-counter-value' }, '۰'),
        h('span', {}, 'کاربر آنلاین'),
      ),
    ),
  );

  return wrap;
}

// ═══════════════════════════════════════════════════════════
//  Testimonials Data + Rotation
// ═══════════════════════════════════════════════════════════
const TESTIMONIALS = [
  { msg: 'بهترین فروشگاه موبایل که تجربه کردم!',      name: 'علی محمدی',    role: 'مشتری دائمی',   initial: 'ع' },
  { msg: 'قیمت‌ها واقعاً منصفانه و رقابتیه.',           name: 'سارا احمدی',   role: 'خریدار آیفون',  initial: 'س' },
  { msg: 'ارسال فوق‌العاده سریع، بسته‌بندی حرفه‌ای.', name: 'رضا کریمی',   role: 'مشتری VIP',     initial: 'ر' },
  { msg: 'پشتیبانی واقعی، همیشه جواب می‌دن.',           name: 'مریم رضایی',   role: 'مشتری وفادار', initial: 'م' },
];

function initTestimonials() {
  const dots = qs('#au-testimonial-dots');
  if (!dots) return;

  // ساخت dots
  TESTIMONIALS.forEach((_, i) => {
    const d = h('span', { class: `au-float__dot ${i === 0 ? 'is-active' : ''}` });
    dots.append(d);
  });

  const rotate = () => {
    state.testimonialIndex = (state.testimonialIndex + 1) % TESTIMONIALS.length;
    const t = TESTIMONIALS[state.testimonialIndex];

    const msg = qs('#au-testimonial-msg');
    const name = qs('#au-testimonial-name');
    const role = qs('#au-testimonial-role');
    const avatar = qs('#au-testimonial-avatar');
    const container = qs('#au-testimonial');

    if (!msg || !container) return;

    container.classList.add('is-changing');

    setTimeout(() => {
      msg.textContent = t.msg;
      name.textContent = t.name;
      role.textContent = t.role;
      avatar.textContent = t.initial;

      const dotEls = dots.querySelectorAll('.au-float__dot');
      dotEls.forEach((d, i) => {
        d.classList.toggle('is-active', i === state.testimonialIndex);
      });

      container.classList.remove('is-changing');
    }, 300);
  };

  state.testimonialTimer = setInterval(rotate, 4000);
}

// ═══════════════════════════════════════════════════════════
//  Live Counters
// ═══════════════════════════════════════════════════════════
function initCounters() {
  const el = qs('#au-counter-value');
  if (!el) return;

  let current = 1200 + Math.floor(Math.random() * 200);

  const update = () => {
    const delta = Math.floor(Math.random() * 15) - 5;
    current = Math.max(1000, current + delta);

    // تبدیل به فارسی
    const faDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    const str = current.toLocaleString('en-US');
    const fa = str.replace(/\d/g, d => faDigits[parseInt(d, 10)]);

    el.textContent = fa;
  };

  update();
  setInterval(update, 2500);
}

// ═══════════════════════════════════════════════════════════
//  Content
// ═══════════════════════════════════════════════════════════
function Content() {
  return h('div', { class: 'au-content' }, Card());
}

function Card() {
  return h('div', { class: 'au-card' },
    Brand(),
    Greeting(),
    ErrorBanner(),
    Form(),
    Divider(),
    SocialRow(),
    TrustFooter(),
  );
}

function Brand() {
  return h('div', { class: 'au-brand' },
    h('span', { class: 'au-brand__logo', innerHTML: I.logo }),
    h('div', { class: 'au-brand__text' },
      h('strong', {}, 'Phone Store'),
      h('span', {}, 'فروشگاه گوشی موبایل'),
    ),
    h('div', { class: 'au-brand__dots' },
      h('span', {}), h('span', {}), h('span', {}),
    ),
  );
}

function Greeting() {
  const hour = new Date().getHours();
  let greeting;

  if (hour < 5)       greeting = 'شب بخیر 🌙';
  else if (hour < 12) greeting = 'صبح بخیر ☀️';
  else if (hour < 17) greeting = 'ظهر بخیر 🌤️';
  else if (hour < 20) greeting = 'عصر بخیر 🌅';
  else                greeting = 'شب بخیر 🌙';

  const isLogin = state.mode === 'login';

  return h('div', { class: 'au-greeting' },
    h('div', { class: 'au-greeting__time' }, greeting),
    h('h1', { class: 'au-greeting__title' },
      isLogin ? 'خوش آمدی!' : 'به ما بپیوند!'),
    h('p', { class: 'au-greeting__sub' },
      isLogin ? 'وارد شو و خریدت رو شروع کن' : 'چند ثانیه‌ای حساب بساز'),
    ProgressSteps(),
  );
}

function ProgressSteps() {
  // در حالت signup دو مرحله‌ست، در login یه مرحله
  const isSignup = state.mode === 'signup';
  const totalSteps = isSignup ? 2 : 1;

  return h('div', { class: 'au-steps' },
    ...Array.from({ length: totalSteps }, (_, i) =>
      h('span', {
        class: `au-step ${i + 1 <= state.step ? 'is-active' : ''} ${i + 1 === state.step ? 'is-current' : ''}`,
      })
    ),
  );
}

function ErrorBanner() {
  if (!state.error) return null;
  return h('div', { class: 'au-error', role: 'alert' }, state.error);
}

// ═══════════════════════════════════════════════════════════
//  Tabs
// ═══════════════════════════════════════════════════════════
function Tabs() {
  return h('div', { class: 'au-tabs', role: 'tablist' },
    TabBtn('login',  'ورود'),
    TabBtn('signup', 'ثبت‌نام'),
  );
}

function TabBtn(mode, label) {
  const active = state.mode === mode;
  return h('button', {
    class: `au-tab ${active ? 'is-active' : ''}`,
    type: 'button',
    role: 'tab',
    onclick: () => switchMode(mode),
  }, label);
}

function switchMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  state.step = 1;
  state.error = '';
  state.inputs = { email: '', password: '', full_name: '' };
  state.showPass = false;
  state.pwsVisible = false;
  state.pwsEl = null;
  state.socialLoading = null;
  renderPage();
}

// ═══════════════════════════════════════════════════════════
//  Form
// ═══════════════════════════════════════════════════════════
function Form() {
  const isLogin = state.mode === 'login';

  const form = h('form', { class: 'au-form', novalidate: true, onsubmit: handleSubmit });

  // نام کامل (signup)
  if (!isLogin) {
    form.append(Input({
      name: 'full_name', type: 'text',
      label: 'نام و نام خانوادگی', icon: I.user,
      autocomplete: 'name', next: 'email',
    }));
  }

  // ایمیل
  form.append(Input({
    name: 'email', type: 'email',
    label: 'ایمیل', icon: I.mail,
    autocomplete: 'email', next: 'password',
  }));

  // رمز
  form.append(PasswordInput());

  // نشانگر قدرت رمز
  if (!isLogin) {
    form.append(PasswordStrength());
  }

  // Remember / Terms
  form.append(isLogin ? RememberRow() : TermsRow());

  // دکمه ارسال
  form.append(SubmitButton(isLogin));

  // Tabs پایین فرم
  form.append(Tabs());

  return form;
}

// ═══════════════════════════════════════════════════════════
//  Input
// ═══════════════════════════════════════════════════════════
function Input({ name, type, label, icon, autocomplete, next, required = true }) {
  const id = `au-${name}`;
  const value = state.inputs[name] || '';

  const wrapper = h('div', { class: 'au-input-wrap', dataset: { name } });

  const inputEl = h('input', {
    class: 'au-input',
    id, name, type, value,
    autocomplete: autocomplete || 'off',
    placeholder: ' ',
    required: required || undefined,
    oninput: (e) => {
      state.inputs[name] = e.target.value;
      clearInputError(wrapper);
    },
    onblur: (e) => validateField(name, e.target.value, wrapper),
    onkeydown: (e) => {
      if (e.key === 'Enter' && next) {
        e.preventDefault();
        qs(`#au-${next}`)?.focus();
      }
    },
  });

  wrapper.append(
    h('span', { class: 'au-input-icon', innerHTML: icon }),
    inputEl,
    h('label', { class: 'au-input-label', for: id }, label),
    h('span', { class: 'au-input-status' }),
  );

  return wrapper;
}

function PasswordInput() {
  const id = 'au-password';
  const value = state.inputs.password || '';
  const wrapper = h('div', { class: 'au-input-wrap', dataset: { name: 'password' } });

  const inputEl = h('input', {
    class: 'au-input',
    id,
    name: 'password',
    type: state.showPass ? 'text' : 'password',
    value,
    autocomplete: state.mode === 'login' ? 'current-password' : 'new-password',
    placeholder: ' ',
    required: true,
    oninput: (e) => {
      state.inputs.password = e.target.value;
      clearInputError(wrapper);
      if (state.mode === 'signup') updatePasswordStrength(e.target.value);
    },
    onblur: (e) => validateField('password', e.target.value, wrapper),
    onkeydown: (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.container?.querySelector('.au-form')?.requestSubmit();
      }
    },
  });

  const toggle = h('button', {
    class: 'au-input-toggle',
    type: 'button',
    tabindex: '-1',
    'aria-label': 'نمایش رمز',
    innerHTML: state.showPass ? I.eyeOff : I.eye,
    onclick: () => {
      state.showPass = !state.showPass;
      inputEl.type = state.showPass ? 'text' : 'password';
      toggle.innerHTML = state.showPass ? I.eyeOff : I.eye;
      inputEl.focus();
    },
  });

  wrapper.append(
    h('span', { class: 'au-input-icon', innerHTML: I.lock }),
    inputEl,
    h('label', { class: 'au-input-label', for: id }, 'رمز عبور'),
    toggle,
    h('span', { class: 'au-input-status' }),
  );

  return wrapper;
}

// ═══════════════════════════════════════════════════════════
//  Validation
// ═══════════════════════════════════════════════════════════
function validateField(name, value, wrapper) {
  const v = String(value || '').trim();
  let err = '';

  if (name === 'full_name') {
    if (!v) err = 'لطفاً نام خود را وارد کنید.';
    else if (v.length < 2) err = 'نام باید حداقل ۲ حرف باشد.';
  } else if (name === 'email') {
    if (!v) err = 'لطفاً ایمیل خود را وارد کنید.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err = 'ایمیل معتبر نیست.';
  } else if (name === 'password') {
    if (!v) err = 'لطفاً رمز عبور را وارد کنید.';
    else if (state.mode === 'signup' && v.length < 6) err = 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
  }

  if (err) {
    wrapper.classList.remove('au-input-wrap--success');
    wrapper.classList.add('au-input-wrap--error');
    wrapper.dataset.error = err;
  } else if (v) {
    wrapper.classList.remove('au-input-wrap--error');
    wrapper.classList.add('au-input-wrap--success');
    delete wrapper.dataset.error;
  } else {
    clearInputError(wrapper);
  }
}

function clearInputError(wrapper) {
  wrapper.classList.remove('au-input-wrap--error');
  delete wrapper.dataset.error;
}

// ═══════════════════════════════════════════════════════════
//  Password Strength
// ═══════════════════════════════════════════════════════════
function PasswordStrength() {
  const wrap = h('div', { class: 'au-pws' });

  const checks = [
    { key: 'length',  label: 'حداقل ۸ حرف' },
    { key: 'case',    label: 'حرف بزرگ و کوچک' },
    { key: 'digit',   label: 'حداقل یک عدد' },
    { key: 'special', label: 'کاراکتر خاص' },
  ];

  const list = h('ul', { class: 'au-pws__list' },
    ...checks.map(c => h('li', {
      class: 'au-pws__item',
      dataset: { check: c.key },
    },
      h('span', { class: 'au-pws__check-icon', innerHTML: I.check }),
      h('span', {}, c.label),
    )),
  );

  const bar = h('div', { class: 'au-pws__bar' },
    h('span', {}), h('span', {}), h('span', {}), h('span', {}),
  );

  const label = h('div', { class: 'au-pws__label' }, 'قدرت رمز');

  wrap.append(
    h('div', { class: 'au-pws__header' }, label),
    bar,
    list,
  );

  wrap.dataset.state = 'empty';
  wrap.labelEl = label;
  wrap.slots = bar.querySelectorAll('span');
  wrap.listEl = list;

  state.pwsEl = wrap;
  return wrap;
}

function updatePasswordStrength(password) {
  const wrap = state.pwsEl;
  if (!wrap) return;

  if (!password) {
    wrap.dataset.state = 'empty';
    wrap.labelEl.textContent = 'قدرت رمز';
    wrap.slots.forEach(s => s.classList.remove('is-filled'));
    wrap.listEl.querySelectorAll('.au-pws__item').forEach(item => {
      item.classList.remove('is-checked');
    });
    return;
  }

  const checks = {
    length:  password.length >= 8,
    case:    /[a-z]/.test(password) && /[A-Z]/.test(password),
    digit:   /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (checks.case)    score++;
  if (checks.digit)   score++;
  if (checks.special) score++;

  let level, filled, labelText;
  if (score <= 2)      { level = 'weak';        filled = 1; labelText = 'ضعیف'; }
  else if (score <= 3) { level = 'medium';      filled = 2; labelText = 'متوسط'; }
  else if (score <= 4) { level = 'strong';      filled = 3; labelText = 'قوی'; }
  else                 { level = 'very-strong'; filled = 4; labelText = 'بسیار قوی'; }

  wrap.dataset.state = level;
  wrap.labelEl.textContent = labelText;
  wrap.slots.forEach((s, i) => s.classList.toggle('is-filled', i < filled));

  wrap.listEl.querySelectorAll('.au-pws__item').forEach(item => {
    const k = item.dataset.check;
    item.classList.toggle('is-checked', Boolean(checks[k]));
  });

  if (password.length > 0 && !state.pwsVisible) {
    state.pwsVisible = true;
    wrap.classList.add('is-visible');
  }
}

// ═══════════════════════════════════════════════════════════
//  Remember / Terms
// ═══════════════════════════════════════════════════════════
function RememberRow() {
  return h('div', { class: 'au-meta' },
    h('label', { class: 'au-checkbox' },
      h('input', { type: 'checkbox', name: 'remember', id: 'au-remember' }),
      h('span', { class: 'au-checkbox__box' }),
      h('span', { class: 'au-checkbox__label' }, 'یادت باشه'),
    ),
    h('button', {
      class: 'au-link',
      type: 'button',
      onclick: () => events.emit('toast:show', {
        type: 'info',
        message: 'بازیابی رمز به‌زودی فعال می‌شود',
      }),
    }, 'فراموشی رمز؟'),
  );
}

function TermsRow() {
  return h('label', { class: 'au-checkbox au-checkbox--terms' },
    h('input', { type: 'checkbox', name: 'terms', id: 'au-terms' }),
    h('span', { class: 'au-checkbox__box' }),
    h('span', { class: 'au-checkbox__label' }, 'قوانین و حریم خصوصی را می‌پذیرم'),
  );
}

// ═══════════════════════════════════════════════════════════
//  Submit
// ═══════════════════════════════════════════════════════════
function SubmitButton(isLogin) {
  const btn = h('button', {
    class: 'au-submit',
    type: 'submit',
    disabled: state.loading || undefined,
  });

  btn.append(
    h('span', { class: 'au-submit__label' },
      state.loading ? 'در حال پردازش...' : (isLogin ? 'ورود به حساب' : 'ساخت حساب')
    ),
    h('span', { class: 'au-submit__arrow', innerHTML: I.arrow }),
    state.loading ? h('span', { class: 'au-submit__spinner', innerHTML: I.spinner }) : null,
  );

  return btn;
}

// ═══════════════════════════════════════════════════════════
//  Divider / Social
// ═══════════════════════════════════════════════════════════
function Divider() {
  return h('div', { class: 'au-divider' },
    h('span', { class: 'au-divider__line' }),
    h('span', { class: 'au-divider__text' }, 'یا ادامه بده با'),
    h('span', { class: 'au-divider__line' }),
  );
}

function SocialRow() {
  return h('div', { class: 'au-social' },
    SocialButton('google', I.google, 'Google'),
    SocialButton('github', I.github, 'GitHub'),
  );
}

function SocialButton(provider, icon, label) {
  const isLoading = state.socialLoading === provider;

  return h('button', {
    class: `au-social__btn ${isLoading ? 'is-loading' : ''}`,
    type: 'button',
    'aria-label': label,
    disabled: Boolean(state.socialLoading) || undefined,
    onclick: () => handleSocialClick(provider),
  },
    isLoading
      ? h('span', { class: 'au-social__spinner', innerHTML: I.spinner })
      : h('span', { class: 'au-social__icon', innerHTML: icon }),
    h('span', { class: 'au-social__label' }, label),
  );
}

// ═══════════════════════════════════════════════════════════
//  Trust Footer
// ═══════════════════════════════════════════════════════════
function TrustFooter() {
  return h('div', { class: 'au-trust' },
    TrustItem(I.shield, 'ضمانت اصالت'),
    TrustItem(I.bolt,   'ارسال سریع'),
    TrustItem(I.check,  'پشتیبانی ۲۴/۷'),
  );
}

function TrustItem(icon, text) {
  return h('div', { class: 'au-trust__item' },
    h('span', { class: 'au-trust__icon', innerHTML: icon }),
    h('span', {}, text),
  );
}

// ═══════════════════════════════════════════════════════════
//  Handlers
// ═══════════════════════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault();
  if (state.loading) return;

  const form = e.currentTarget;
  const isLogin = state.mode === 'login';
  let hasError = false;

  if (!isLogin) {
    const nameWrap = form.querySelector('[data-name="full_name"]');
    validateField('full_name', state.inputs.full_name, nameWrap);
    if (nameWrap?.classList.contains('au-input-wrap--error')) hasError = true;
  }

  const emailWrap = form.querySelector('[data-name="email"]');
  validateField('email', state.inputs.email, emailWrap);
  if (emailWrap?.classList.contains('au-input-wrap--error')) hasError = true;

  const passWrap = form.querySelector('[data-name="password"]');
  validateField('password', state.inputs.password, passWrap);
  if (passWrap?.classList.contains('au-input-wrap--error')) hasError = true;

  if (!isLogin) {
    const terms = form.querySelector('input[name="terms"]');
    if (terms && !terms.checked) {
      state.error = 'لطفاً قوانین را بپذیرید.';
      renderPage();
      return;
    }
  }

  if (hasError) {
    form.classList.add('is-shaking');
    setTimeout(() => form.classList.remove('is-shaking'), 500);
    return;
  }

  state.loading = true;
  state.error = '';
  renderPage();

  try {
    if (isLogin) {
      await api.auth.signIn(state.inputs.email.trim(), state.inputs.password);
      showSuccessOverlay('ورود موفق!', 'خوش آمدی به Phone Store');
      if (CONFIG.authUI.confetti) fireConfetti();
      setTimeout(() => router.navigate('/'), 1800);
    } else {
      await api.auth.signUp(state.inputs.email.trim(), state.inputs.password, state.inputs.full_name);
      showSuccessOverlay('حساب ساخته شد!', 'به Phone Store خوش آمدی');
      if (CONFIG.authUI.confetti) fireConfetti();
      setTimeout(() => router.navigate('/'), 1800);
    }
  } catch (err) {
    state.loading = false;
    state.error = mapError(err);
    renderPage();

    requestAnimationFrame(() => {
      const form = state.container?.querySelector('.au-form');
      if (form) {
        form.classList.add('is-shaking');
        setTimeout(() => form.classList.remove('is-shaking'), 500);
      }
    });
  }
}

async function handleSocialClick(provider) {
  if (state.socialLoading) return;

  state.socialLoading = provider;
  state.error = '';
  renderPage();

  try {
    const redirectTo = `${location.origin}${location.pathname}#/`;
    await api.auth.signInWithOAuth(provider, redirectTo);
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();

    let userMsg = 'ورود ناموفق بود';
    if (msg.includes('not enabled') || msg.includes('not supported')) {
      userMsg = 'این روش ورود فعال نیست';
    }

    events.emit('toast:show', { type: 'error', message: userMsg, duration: 4500 });

    state.socialLoading = null;
    renderPage();
  }
}

function mapError(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid credentials'))
    return 'ایمیل یا رمز عبور اشتباه است.';
  if (msg.includes('already registered') || msg.includes('user already'))
    return 'این ایمیل قبلاً ثبت شده است.';
  if (msg.includes('password') && (msg.includes('short') || msg.includes('weak')))
    return 'رمز عبور ضعیف است.';
  return 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}

// ═══════════════════════════════════════════════════════════
//  Success Overlay
// ═══════════════════════════════════════════════════════════
function showSuccessOverlay(title, subtitle) {
  const overlay = h('div', { class: 'au-success' },
    h('div', { class: 'au-success__bg' }),
    h('div', { class: 'au-success__rings' },
      h('span', {}), h('span', {}), h('span', {}),
    ),
    h('div', { class: 'au-success__content' },
      h('div', { class: 'au-success__check' },
        `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
      ),
      h('h2', { class: 'au-success__title' }, title),
      h('p', { class: 'au-success__subtitle' }, subtitle),
    ),
  );

  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-visible'));

  setTimeout(() => {
    overlay.classList.remove('is-visible');
    setTimeout(() => overlay.remove(), 500);
  }, 1600);
}

// ═══════════════════════════════════════════════════════════
//  Confetti
// ═══════════════════════════════════════════════════════════
function fireConfetti() {
  const COLORS = ['#0071e3', '#5856d6', '#af52de', '#34c759', '#ffcc00', '#ff375f'];

  for (let i = 0; i < 60; i++) {
    const p = document.createElement('span');
    const size = 6 + Math.random() * 8;
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
    `;
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 350;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 80;
    const rotate = Math.random() * 1080;

    p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rotate}deg) scale(0.2)`, opacity: 0 },
      ],
      { duration: 1800 + Math.random() * 800, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' }
    ).addEventListener('finish', () => p.remove());
  }
}

// ═══════════════════════════════════════════════════════════
//  Cleanup
// ═══════════════════════════════════════════════════════════
function destroyEffects() {
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  if (state.testimonialTimer) {
    clearInterval(state.testimonialTimer);
    state.testimonialTimer = null;
  }
  offMouse?.();
  offResize?.();
  offMouse = null;
  offResize = null;

  document.body.style.cursor = '';
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
  const name = profile?.full_name?.trim() || profile?.email?.split('@')[0] || '';
  const initial = name ? name.charAt(0).toUpperCase() : '';

  render(state.headerEl, h('div', { class: 'header-auth__inner' },
    h('button', {
      class: `header-auth__btn ${isLoggedIn ? 'is-logged' : ''}`,
      type: 'button',
      'aria-label': isLoggedIn ? 'حساب کاربری' : 'ورود',
      dataset: { role: 'auth-trigger' },
    },
      isLoggedIn
        ? h('span', { class: 'header-auth__avatar' }, initial)
        : h('span', { class: 'header-auth__icon', innerHTML: icons.user }),
    ),
    state.menuOpen && isLoggedIn
      ? h('div', { class: 'header-auth__menu' },
          h('div', { class: 'header-auth__menu-head' },
            h('div', { class: 'header-auth__menu-avatar' }, initial),
            h('div', { class: 'header-auth__menu-meta' },
              h('strong', {}, name),
              h('span', {}, profile.email),
              isAdmin ? h('span', { class: 'header-auth__badge' }, 'Admin') : null,
            ),
          ),
          h('div', { class: 'header-auth__menu-actions' },
            isAdmin ? h('a', {
              class: 'header-auth__menu-link',
              href: '#/admin',
              onclick: () => { state.menuOpen = false; },
            },
              h('span', { innerHTML: icons.shield }),
              h('span', {}, 'پنل مدیریت'),
            ) : null,
            h('button', {
              class: 'header-auth__menu-link header-auth__menu-link--danger',
              type: 'button',
              onclick: doLogout,
            },
              h('span', { innerHTML: icons.logout }),
              h('span', {}, 'خروج'),
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
    events.emit('toast:show', { type: 'info', message: 'از حساب خود خارج شدید.' });
    if (location.hash.startsWith('#/admin')) router.navigate('/');
    else renderHeaderMenu();
  } catch (err) {
    console.error('[auth] logout failed', err);
  }
}