// ═══════════════════════════════════════════════════════════
//  Store سبک — state مرکزی با subscription
// ═══════════════════════════════════════════════════════════

const state = {};
const subs = new Map();

export const store = {
  get(key) { return state[key]; },

  set(key, value) {
    state[key] = value;
    subs.get(key)?.forEach(fn => {
      try { fn(value); } catch (err) { console.error('[store]', err); }
    });
  },

  update(key, fn) { store.set(key, fn(state[key])); },

  subscribe(key, handler) {
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key).add(handler);
    return () => subs.get(key)?.delete(handler);
  },

  getAll() { return { ...state }; },
};