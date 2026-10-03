// ═══════════════════════════════════════════════════════════
//  Hash Router — سازگار با GitHub Pages subpath
// ═══════════════════════════════════════════════════════════

import { events } from './events.js';

const routes = [];

/**
 * تبدیل pattern به regex
 * "/product/:slug" → /^\/product\/([^/]+)$/
 */
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

  for (const { pattern, regex, keys, handler } of routes) {
    const m = path.match(regex);
    if (m) {
      const params = {};
      keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { pattern, params, query, path };
    }
  }
  return { path, params: {}, query, pattern: null };
}

function dispatch() {
  const ctx = match();
  const handler = routes.find(r => r.pattern === ctx.pattern)?.handler;

  if (handler) {
    try { handler(ctx.params, ctx.query); }
    catch (err) { console.error('[router] handler error:', err); }
  } else {
    events.emit('route:notfound', ctx);
  }

  events.emit('route:changed', ctx);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export const router = {
  /** ثبت مسیر — pattern: "/product/:slug" */
  register(pattern, handler) {
    const { regex, keys } = compile(pattern);
    routes.push({ pattern, regex, keys, handler });
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