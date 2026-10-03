// ═══════════════════════════════════════════════════════════
//  Sound Feedback — Phase 18
//  با Web Audio API — بدون فایل صوتی خارجی
// ═══════════════════════════════════════════════════════════

import { h, qs, on } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { icons } from '../../shared/icons/icons.js';
import { soundLang } from './sound.lang.js';

// ═══════════════════════════════════════════════════════════
//  Config
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = 'ps_sound_enabled';
const VOLUME = 0.08;   // صدای نرم

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
let audioCtx = null;
let enabled = false;
let headerBtn = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const sound = {
  register() {
    i18n.register('sound', soundLang);

    // بارگذاری ترجیح کاربر
    try {
      enabled = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {}

    // تزریق دکمه در هدر
    injectHeaderButton();

    // ═══ گوش دادن به رویدادها ═══
    events.on('cart:add',           () => play('add'));
    events.on('cart:remove',        () => play('remove'));
    events.on('cart:cleared',       () => play('remove'));
    events.on('favorites:changed',  ({ count }) => {
      // فقط اگه اضافه شده (نه حذف)
      if (count > (sound._prevFavCount ?? 0)) play('success');
      sound._prevFavCount = count;
    });
    events.on('comparison:changed', ({ count }) => {
      if (count > (sound._prevCmpCount ?? 0)) play('tick');
      sound._prevCmpCount = count;
    });
    events.on('discount:changed',   ({ discount }) => {
      if (discount && discount.code !== sound._prevCode) play('success');
      sound._prevCode = discount?.code;
    });
    events.on('toast:show', ({ type }) => {
      if (type === 'success') play('success');
      else if (type === 'error') play('error');
      else if (type === 'warning') play('warn');
    });

    // تغییر زبان → دکمه refresh
    events.on('lang:changed', refreshButton);
  },

  isEnabled() { return enabled; },
  toggle()    { setEnabled(!enabled); },
  enable()    { setEnabled(true); },
  disable()   { setEnabled(false); },
};

// ═══════════════════════════════════════════════════════════
//  Audio — سازنده‌ی صدا
// ═══════════════════════════════════════════════════════════
function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume اگه suspend شده (خواص مرورگرهای جدید)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function play(type) {
  if (!enabled) return;

  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  const patterns = {
    // تیک نرم برای کلیک
    tick: [
      { f: 1200, t: 0,     d: 0.05, type: 'sine', v: 0.6 },
    ],
    // افزودن به سبد — دو نت صعودی
    add: [
      { f: 660,  t: 0,     d: 0.10, type: 'sine', v: 1.0 },
      { f: 880,  t: 0.08,  d: 0.15, type: 'sine', v: 0.9 },
    ],
    // حذف — یک نت پایین
    remove: [
      { f: 330,  t: 0,     d: 0.12, type: 'sine', v: 0.8 },
      { f: 220,  t: 0.06,  d: 0.15, type: 'sine', v: 0.6 },
    ],
    // موفقیت — آکورد سه‌نتی
    success: [
      { f: 523,  t: 0,     d: 0.12, type: 'sine', v: 0.8 },
      { f: 659,  t: 0.06,  d: 0.12, type: 'sine', v: 0.8 },
      { f: 784,  t: 0.12,  d: 0.20, type: 'sine', v: 0.8 },
    ],
    // خطا — buzz کوتاه
    error: [
      { f: 180,  t: 0,     d: 0.18, type: 'square', v: 0.4 },
      { f: 140,  t: 0.10,  d: 0.20, type: 'square', v: 0.4 },
    ],
    // هشدار
    warn: [
      { f: 440,  t: 0,     d: 0.15, type: 'triangle', v: 0.6 },
      { f: 440,  t: 0.18,  d: 0.15, type: 'triangle', v: 0.6 },
    ],
  };

  const pattern = patterns[type] || patterns.tick;

  pattern.forEach(({ f, t, d, type: waveType, v }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(f, now + t);

    // Envelope: fade in + fade out
    gain.gain.setValueAtTime(0, now + t);
    gain.gain.linearRampToValueAtTime(VOLUME * v, now + t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + t);
    osc.stop(now + t + d + 0.02);
  });
}

// ═══════════════════════════════════════════════════════════
//  Enable / Disable
// ═══════════════════════════════════════════════════════════
function setEnabled(value) {
  enabled = Boolean(value);

  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {}

  refreshButton();

  // اعلام به کاربر
  events.emit('toast:show', {
    type: 'info',
    message: enabled
      ? i18n.t('sound.enabled')
      : i18n.t('sound.disabled'),
  });

  // اگه فعال شد، یه صدای کوچیک بزن
  if (enabled) play('tick');
}

// ═══════════════════════════════════════════════════════════
//  Header Button
// ═══════════════════════════════════════════════════════════
function injectHeaderButton() {
  const actions = qs('.header__actions');
  if (!actions) return;
  if (qs('[data-action="sound"]')) return;

  headerBtn = h('button', {
    class: 'icon-btn',
    type: 'button',
    dataset: { action: 'sound' },
    onclick: () => sound.toggle(),
  });

  // قرارگیری قبل از دکمه زبان
  const langBtn = qs('[data-action="lang"]', actions);
  if (langBtn) actions.insertBefore(headerBtn, langBtn);
  else actions.append(headerBtn);

  refreshButton();
}

function refreshButton() {
  if (!headerBtn) return;
  headerBtn.innerHTML = '';
  headerBtn.append(
    h('span', { class: 'icon-btn__icon', innerHTML: enabled ? icons.volume : icons.volumeOff })
  );
  headerBtn.setAttribute('aria-label',
    enabled ? i18n.t('sound.disable') : i18n.t('sound.enable'));
  headerBtn.classList.toggle('is-active', enabled);
}