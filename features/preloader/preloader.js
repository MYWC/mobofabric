// ═══════════════════════════════════════════════════════════
//  Preloader — Phase 17
//  مدیریت Loading Screen
//
//  ⚠️ این فیچر در bootstrap به‌صورت دستی لود می‌شه (نه از featureLoaders)
//  چون باید قبل از هر چیز register بشه.
// ═══════════════════════════════════════════════════════════

import { events } from '../../core/events.js';

const state = {
  el:          null,
  fill:        null,
  targetProgress: 0,
  currentProgress: 0,
  startTime:   0,
  rafId:       null,
  hideTimeout: null,
  isHiding:    false,

  // زمان‌بندی
  minimumDisplayTime: 900,    // حداقل ۰.۹ ثانیه (تا کاربر فقط یه فلاش نبینه)
  maximumDisplayTime: 5500,   // حداکثر ۵.۵ ثانیه (fail-safe)
  fadeOutDuration:    700,    // هماهنگ با transition در CSS
};

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const preloader = {
  register() {
    // اگه قبلاً توی این session دیده شده، فوری حذف کن
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem('ps_preloader_shown') === '1';
    } catch {}

    if (alreadyShown) {
      removeImmediately();
      return;
    }

    state.el   = document.getElementById('preloader');
    state.fill = document.getElementById('preloader-fill');

    if (!state.el) {
      console.warn('[preloader] element not found');
      return;
    }

    // قفل اسکرول
    document.body.classList.add('preloader-active');

    state.startTime = performance.now();

    // شروع progress
    setProgress(30);
    startProgressAnimation();

    // ═══ گوش دادن به رویداد آماده‌شدن app ═══
    events.once('app:ready', onAppReady);

    // ═══ Fail-safe: اگه app:ready نیومد ═══
    state.hideTimeout = setTimeout(() => {
      console.warn('[preloader] app:ready not received — forcing hide');
      onAppReady();
    }, state.maximumDisplayTime);
  },
};

// ═══════════════════════════════════════════════════════════
//  Handlers
// ═══════════════════════════════════════════════════════════
function onAppReady() {
  if (state.isHiding) return;

  // progress رو ببر به ۹۰% (کمی صبر کن، بعد ۱۰۰%)
  setProgress(90);

  const elapsed   = performance.now() - state.startTime;
  const remaining = Math.max(0, state.minimumDisplayTime - elapsed);

  setTimeout(() => {
    setProgress(100);
    setTimeout(() => hide(), 280);
  }, remaining);
}

// ═══════════════════════════════════════════════════════════
//  Progress Animation (rAF)
// ═══════════════════════════════════════════════════════════
function startProgressAnimation() {
  const tick = () => {
    const diff = state.targetProgress - state.currentProgress;

    // اگه تفاوت قابل توجهه، حرکت نرم
    if (Math.abs(diff) > 0.15) {
      state.currentProgress += diff * 0.08;
      updateBarWidth(state.currentProgress);
    } else if (state.currentProgress !== state.targetProgress) {
      state.currentProgress = state.targetProgress;
      updateBarWidth(state.currentProgress);
    }

    if (!state.isHiding) {
      state.rafId = requestAnimationFrame(tick);
    }
  };
  tick();
}

function setProgress(value) {
  state.targetProgress = Math.min(100, Math.max(0, value));
}

function updateBarWidth(value) {
  if (state.fill) {
    state.fill.style.width = `${value}%`;
  }
}

// ═══════════════════════════════════════════════════════════
//  Hide / Remove
// ═══════════════════════════════════════════════════════════
function hide() {
  if (!state.el || state.isHiding) return;
  state.isHiding = true;

  // پاک کردن timeout
  if (state.hideTimeout) {
    clearTimeout(state.hideTimeout);
    state.hideTimeout = null;
  }

  // ذخیره در session
  try {
    sessionStorage.setItem('ps_preloader_shown', '1');
  } catch {}

  // Fade out
  state.el.classList.add('is-hidden');
  document.body.classList.remove('preloader-active');

  // حذف کامل
  setTimeout(() => {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.el?.remove();
    state.el = null;
    state.fill = null;
  }, state.fadeOutDuration);
}

function removeImmediately() {
  const el = document.getElementById('preloader');
  if (el) el.remove();
  document.body.classList.remove('preloader-active');
}