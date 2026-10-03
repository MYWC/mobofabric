// ═══════════════════════════════════════════════════════════
//  Event Bus — ارتباط بین فیچرها بدون import مستقیم
// ═══════════════════════════════════════════════════════════

const listeners = new Map();

export const events = {
  /**
   * ارسال رویداد
   * @param {string} name — مثل "cart:add"
   * @param {any} detail
   */
  emit(name, detail) {
    const handlers = listeners.get(name);
    if (!handlers) return;
    handlers.forEach(fn => {
      try { fn(detail); }
      catch (err) { console.error(`[events] handler error for "${name}":`, err); }
    });
  },

  /**
   * گوش دادن به رویداد
   * @returns {Function} unsubscribe
   */
  on(name, handler) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(handler);
    return () => events.off(name, handler);
  },

  off(name, handler) {
    listeners.get(name)?.delete(handler);
  },

  once(name, handler) {
    const off = events.on(name, (detail) => {
      off();
      handler(detail);
    });
  },
};