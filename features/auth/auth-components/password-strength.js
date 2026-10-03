// ═══════════════════════════════════════════════════════════
//  Password Strength — Phase 19
//  نشانگر قدرت رمز عبور
// ═══════════════════════════════════════════════════════════

import { h, on } from '../../../core/dom.js';
import { i18n } from '../../../core/i18n.js';

// ═══════════════════════════════════════════════════════════
//  Strength Calculator — الگوریتم امتیازدهی
// ═══════════════════════════════════════════════════════════
function calculateStrength(password) {
  if (!password) {
    return { score: 0, level: 'empty', checks: {} };
  }

  const checks = {
    length:     password.length >= 8,
    length12:   password.length >= 12,
    lowercase:  /[a-z]/.test(password),
    uppercase:  /[A-Z]/.test(password),
    digit:      /[0-9]/.test(password),
    special:    /[^A-Za-z0-9]/.test(password),
    noRepeat:   !/(.)\1{2,}/.test(password),   // 3 حرف تکراری
    noSequence: !/(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|asd)/i.test(password),
  };

  // امتیاز پایه
  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (checks.lowercase)      score++;
  if (checks.uppercase)      score++;
  if (checks.digit)          score++;
  if (checks.special)        score++;
  if (checks.noRepeat)       score++;
  if (checks.noSequence)     score++;

  // کم کردن برای رمزهای کوتاه
  if (password.length < 6)   score = Math.min(score, 1);

  // نرمال‌سازی به ۰-۴
  let level;
  if (score <= 2)      level = 'weak';
  else if (score <= 4) level = 'medium';
  else if (score <= 7) level = 'strong';
  else                 level = 'very-strong';

  // شاخص ۰-۴ برای نوار
  const barIndex =
    level === 'weak'        ? 1 :
    level === 'medium'      ? 2 :
    level === 'strong'      ? 3 : 4;

  return { score: barIndex, level, checks };
}

// ═══════════════════════════════════════════════════════════
//  Labels
// ═══════════════════════════════════════════════════════════
const LEVEL_LABELS = {
  weak:          'auth.passwordWeak',
  medium:        'auth.passwordMedium',
  strong:        'auth.passwordStrong',
  'very-strong': 'auth.passwordVeryStrong',
};

// ═══════════════════════════════════════════════════════════
//  createPasswordStrength — سازنده
//  @returns { el, update, reset }
// ═══════════════════════════════════════════════════════════
export function createPasswordStrength() {
  // ── نوار ۴ بخشی ──
  const bar = h('div', { class: 'pws__bar', 'aria-hidden': 'true' },
    h('span', { class: 'pws__seg', dataset: { idx: '0' } }),
    h('span', { class: 'pws__seg', dataset: { idx: '1' } }),
    h('span', { class: 'pws__seg', dataset: { idx: '2' } }),
    h('span', { class: 'pws__seg', dataset: { idx: '3' } }),
  );

  // ── Label (ضعیف/متوسط/...) ──
  const label = h('span', { class: 'pws__label' });

  // ── Header (عنوان + درصد) ──
  const header = h('div', { class: 'pws__header' },
    h('span', { class: 'pws__title' }, i18n.t('auth.passwordStrength')),
    label,
  );

  // ── Checklist (چک‌لیست) ──
  const checklist = h('ul', { class: 'pws__checks' },
    CheckItem('length',   'auth.pwsCheckLength'),
    CheckItem('uppercase','auth.pwsCheckUppercase'),
    CheckItem('lowercase','auth.pwsCheckLowercase'),
    CheckItem('digit',    'auth.pwsCheckDigit'),
    CheckItem('special',  'auth.pwsCheckSpecial'),
  );

  // ── Wrapper ──
  const el = h('div', { class: 'pws' },
    header,
    bar,
    checklist,
  );

  // ═══════════════════════════════════════════════════════════
  //  update — آپدیت بر اساس رمز
  // ═══════════════════════════════════════════════════════════
  function update(password) {
    const { score, level, checks } = calculateStrength(password);

    // ── Bar ──
    el.classList.remove('pws--weak', 'pws--medium', 'pws--strong', 'pws--very-strong');
    if (level !== 'empty') el.classList.add(`pws--${level}`);

    // ── Segments ──
    const segs = el.querySelectorAll('.pws__seg');
    segs.forEach((seg, i) => {
      seg.classList.toggle('is-filled', i < score);
    });

    // ── Label ──
    if (level === 'empty') {
      label.textContent = '';
    } else {
      label.textContent = i18n.t(LEVEL_LABELS[level]);
    }

    // ── Checklist ──
    const items = {
      length:    password.length >= 8,
      uppercase: checks.uppercase,
      lowercase: checks.lowercase,
      digit:     checks.digit,
      special:   checks.special,
    };

    Object.entries(items).forEach(([key, ok]) => {
      const item = el.querySelector(`[data-check="${key}"]`);
      if (item) {
        item.classList.toggle('is-checked', Boolean(ok));
      }
    });
  }

  function reset() {
    update('');
  }

  // بار اول، خالی
  update('');

  return { el, update, reset };
}

// ═══════════════════════════════════════════════════════════
//  CheckItem — یک آیتم چک‌لیست
// ═══════════════════════════════════════════════════════════
function CheckItem(key, labelKey) {
  const SVG_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
  const SVG_DOT   = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>`;

  return h('li', {
    class: 'pws__check',
    dataset: { check: key },
  },
    h('span', {
      class: 'pws__check-icon',
      innerHTML: `<span class="pws__icon-dot">${SVG_DOT}</span><span class="pws__icon-check">${SVG_CHECK}</span>`,
    }),
    h('span', { class: 'pws__check-label' }, i18n.t(labelKey)),
  );
}