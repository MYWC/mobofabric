// ═══════════════════════════════════════════════════════════
//  موتور دوزبانه — با namespace registry
//  هر فیچر ترجمه‌های خودش را کنار خودش ثبت می‌کند
// ═══════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { events } from './events.js';

const namespaces = {};   // { cart: { fa: {...}, en: {...} } }
let current = CONFIG.defaultLang;

function detectInitialLang() {
  const stored = localStorage.getItem(CONFIG.storageKeys.lang);
  if (stored && CONFIG.supportedLangs.includes(stored)) return stored;
  const nav = navigator.language?.slice(0, 2);
  return CONFIG.supportedLangs.includes(nav) ? nav : CONFIG.defaultLang;
}

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function interpolate(text, params) {
  return text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}

export const i18n = {
  /** ثبت ترجمه‌های یک فیچر */
  register(name, translations) {
    namespaces[name] = translations;
  },

  /** ترجمه — key = "namespace.path.to.key" */
  t(key, params = {}) {
    const [ns, ...rest] = key.split('.');
    const path = rest.join('.');
    const text = getNested(namespaces[ns]?.[current], path);
    if (text == null) return key;
    return interpolate(text, params);
  },

  setLang(lang) {
    if (!CONFIG.supportedLangs.includes(lang)) return;
    current = lang;
    localStorage.setItem(CONFIG.storageKeys.lang, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    i18n.applyToDOM();
    events.emit('lang:changed', { lang });
  },

  getLang() { return current; },
  getDir()  { return current === 'fa' ? 'rtl' : 'ltr'; },

  /** پردازش [data-i18n] و [data-i18n-attr] در کل درخت */
  applyToDOM(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = i18n.t(key);
      if (text !== key) el.textContent = text;
    });

    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      // فرمت: "placeholder:key,title:key2"
      el.getAttribute('data-i18n-attr').split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) {
          const text = i18n.t(key);
          if (text !== key) el.setAttribute(attr, text);
        }
      });
    });
  },

  /** نمایش عدد با ارقام مناسب */
  formatNumber(n) {
    if (n == null) return '';
    const s = Number(n).toLocaleString('en-US');
    if (current === 'fa') {
      return s.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    }
    return s;
  },

  /** نمایش قیمت با واحد پول */
  formatPrice(n) {
    if (n == null) return '';
    return `${i18n.formatNumber(n)} ${CONFIG.currency[current]}`;
  },

  /** انتخاب فیلد بومی‌شده — obj.name_fa یا obj.name_en */
  localizeField(obj, field) {
    if (!obj) return '';
    return obj[`${field}_${current}`] ?? obj[field] ?? '';
  },

  /** مقدار اولیه */
  init() {
    current = detectInitialLang();
    document.documentElement.lang = current;
    document.documentElement.dir = current === 'fa' ? 'rtl' : 'ltr';
  },
};