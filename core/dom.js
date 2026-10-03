// ═══════════════════════════════════════════════════════════
//  ابزارهای DOM — نسخه اصلاح‌شده (رفع باگ innerHTML)
// ═══════════════════════════════════════════════════════════

export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export function on(el, evt, handler, opts) {
  el.addEventListener(evt, handler, opts);
  return () => el.removeEventListener(evt, handler, opts);
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;

    // ── Property های خاص (نه attribute) ──
    if (k === 'class' || k === 'className') {
      el.className = v;
    } else if (k === 'innerHTML') {
      el.innerHTML = v;                          // ← کلید حل مشکل
    } else if (k === 'textContent') {
      el.textContent = v;
    } else if (k === 'value') {
      el.value = v;
    } else if (k === 'checked') {
      el.checked = Boolean(v);
    } else if (k === 'disabled') {
      el.disabled = Boolean(v);
    } else if (k === 'selected') {
      el.selected = Boolean(v);
    } else if (k === 'dataset') {
      Object.assign(el.dataset, v);
    } else if (k === 'style') {
      if (typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute('style', v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
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

export function render(container, content) {
  if (content instanceof Node) container.replaceChildren(content);
  else container.innerHTML = content;
}

export function clear(container) { container.replaceChildren(); }