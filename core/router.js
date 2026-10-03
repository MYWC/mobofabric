// ═══════════════════════════════════════════════════════════
//  Hash Router — سازگار با GitHub Pages subpath
//  نسخه ۳: آخرین route ثبت‌شده برنده است + unregister
//
//  ── منطق کلی ──
//  از انتها به ابتدا match می‌کند، پس آخرین register برنده است.
//  این به فیچرها اجازه می‌دهد routeهای قبلی را override کنند
//  بدون نیاز به تغییر این فایل یا فیچرهای دیگر.
//
//  ── مثال (فاز ۱۳) ──
//  products.js: router.register('/', ProductsPage)
//  home.js:     router.register('/', HomePage)   ← این برنده است
//  نتیجه:       #/  →  HomePage
//               #/products  →  ProductsPage
// ═══════════════════════════════════════════════════════════

import { events } from './events.js';

const routes = [];

function compile(pattern) {
  const keys = [];
  const regexStr = pattern
    .replace(/\/:([^/]+)/g, (_, key) => { keys.push(key); return '/([^/]+)'; })
    .replace(/\//g, '\\/');
  return { regex: new RegExp(`^${regexStr}$`), keys };
}

function parseQuery(search) {
  const params = {};
  new URLSearchParams(search).forEach((v, k) => { params[k] = v; });
  return params;
}

function match() {
  const hash = location.hash.slice(1) || '/';
  const [path, search = ''] = hash.split('?');
  const query = parseQuery(search);

  // آخرین route ثبت‌شده برنده است — از انتها به ابتدا
  for (let i = routes.length - 1; i >= 0; i--) {
    const route = routes[i];
    const m = path.match(route.regex);
    if (m) {
      const params = {};
      route.keys.forEach((k, idx) => {
        params[k] = decodeURIComponent(m[idx + 1]);
      });
      return { pattern: route.pattern, params, query, path, handler: route.handler };
    }
  }
  return { pattern: null, params: {}, query, path, handler: null };
}

function dispatch() {
  const ctx = match();

  if (ctx.handler) {
    try { ctx.handler(ctx.params, ctx.query); }
    catch (err) { console.error('[router] handler error:', err); }
  } else {
    events.emit('route:notfound', ctx);
  }

  events.emit('route:changed', ctx);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export const router = {
  /**
   * ثبت مسیر
   * @param {string} pattern — مثل "/product/:slug"
   * @param {Function} handler — (params, query) => void
   */
  register(pattern, handler) {
    const { regex, keys } = compile(pattern);
    routes.push({ pattern, regex, keys, handler });
  },

  /**
   * حذف یک مسیر ثبت‌شده (اختیاری — مفید برای تست یا override صریح)
   * @param {string} pattern
   */
  unregister(pattern) {
    const idx = routes.findIndex(r => r.pattern === pattern);
    if (idx > -1) routes.splice(idx, 1);
  },

  /**
   * لیست مسیرهای ثبت‌شده (دیباگ)
   */
  list() {
    return routes.map(r => r.pattern);
  },

  navigate(path) {
    if (location.hash.slice(1) === path) dispatch();
    else location.hash = path;
  },

  current() {
    return match();
  },

  start() {
    window.addEventListener('hashchange', dispatch);
    if (!location.hash) location.replace('#/');
    else dispatch();
  },
};