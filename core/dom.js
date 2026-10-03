// ═══════════════════════════════════════════════════════════
//  ابزارهای DOM
// ═══════════════════════════════════════════════════════════

export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export function on(el, evt, handler, opts) {
  el.addEventListener(evt, handler, opts);
  return () => el.removeEventListener(evt, handler, opts);
}

/**
 * ساخت المان
 * @example h('div', { class: 'x' }, 'متن', h('span', {}, 'کودک'))
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else {
      el.setAttribute(k, v);
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/**
 * Template literal امن در برابر XSS
 * مقادیر string به‌صورت خودکار escape می‌شوند
 */
export function html(strings, ...values) {
  return strings.reduce((acc, str, i) => {
    if (i === 0) return str;
    const v = values[i - 1];
    return acc + escapeValue(v) + str;
  }, '');
}

function escapeValue(v) {
  if (v == null || v === false) return '';
  if (v instanceof Node) return v.outerHTML;
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * رندر محتوا در container
 * content می‌تواند string یا Node باشد
 */
export function render(container, content) {
  if (content instanceof Node) container.replaceChildren(content);
  else container.innerHTML = content;
}

export function clear(container) { container.replaceChildren(); }