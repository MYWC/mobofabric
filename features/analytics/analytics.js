import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { CONFIG } from '../../core/config.js';
import { analyticsLang } from './analytics.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  sessionId: null,
  queue:     [],
  timer:     null,
  flushing:  false,
  userId:    null,
  lastPath:  null,
};

let offAuth = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const analytics = {
  register() {
    i18n.register('analytics', analyticsLang);

    state.sessionId = getOrCreateSessionId();

    // کاربر فعلی (اختیاری)
    api.auth.getUser().then(u => { state.userId = u?.id || null; }).catch(() => {});
    offAuth = api.auth.onChange((event, session) => {
      state.userId = session?.user?.id || null;
    });

    // ═══ Tracking خودکار — گوش دادن به eventهای موجود ═══

    // بازدید صفحه
    events.on('route:changed', ({ path, query }) => {
      if (!CONFIG.analytics.trackPageViews) return;
      if (path === state.lastPath) return;
      state.lastPath = path;
      track('page_view', { path, query: query || {} });
    });

    // بازدید محصول
    events.on('product-detail:rendered', ({ product }) => {
      if (!CONFIG.analytics.trackProducts) return;
      if (!product) return;
      track('product_view', {
        entityId: product.id,
        data: { slug: product.slug, brand: product.brands?.slug || null, price: product.discount_price ?? product.price },
      });
    });

    // جستجو — از route تغییر می‌گیریم
    events.on('route:changed', ({ path, query }) => {
      if (!CONFIG.analytics.trackSearches) return;
      if (path !== '/search') return;
      const q = (query?.q || '').trim();
      if (!q || q.length < 2) return;
      track('search', { data: { query: q } });
    });

    // افزودن به سبد
    events.on('cart:add', ({ product, qty }) => {
      if (!product) return;
      track('add_to_cart', {
        entityId: product.id,
        data: { slug: product.slug, qty: qty || 1, price: product.discount_price ?? product.price },
      });
    });

    // حذف از سبد
    events.on('cart:remove', ({ productId }) => {
      if (!productId) return;
      track('remove_from_cart', { entityId: productId });
    });

    // علاقه‌مندی‌ها
    events.on('favorites:changed', ({ count }) => {
      const prev = state._favCount ?? 0;
      state._favCount = count;
      if (count > prev) track('favorite_add');
      else if (count < prev) track('favorite_remove');
    });

    // مقایسه
    events.on('comparison:changed', ({ count }) => {
      const prev = state._cmpCount ?? 0;
      state._cmpCount = count;
      if (count > prev) track('compare_add');
    });

    // کد تخفیف
    events.on('discount:changed', ({ discount }) => {
      const prev = state._discCode ?? null;
      state._discCode = discount?.code || null;
      if (state._discCode && state._discCode !== prev) {
        track('discount_applied', { data: { code: state._discCode } });
      }
    });

    // شروع فلاش خودکار
    state.timer = setInterval(() => flush(), CONFIG.analytics.flushIntervalMs);

    // فلاش قبل از بستن صفحه
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true);
    });
    window.addEventListener('pagehide', () => flush(true));
  },
};

// ═══════════════════════════════════════════════════════════
//  Session
// ═══════════════════════════════════════════════════════════
function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem(CONFIG.storageKeys.session);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : randId();
      sessionStorage.setItem(CONFIG.storageKeys.session, id);
    }
    return id;
  } catch {
    return randId();
  }
}

function randId() {
  return 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ═══════════════════════════════════════════════════════════
//  Tracking
// ═══════════════════════════════════════════════════════════
function track(type, { entityId = null, data = {} } = {}) {
  if (!type) return;

  // لاگ محلی اختیاری (در dev)
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.debug('[analytics]', type, data);
  }

  state.queue.push({
    session_id:  state.sessionId,
    user_id:     state.userId,
    event_type:  type,
    entity_id:   entityId,
    entity_data: data || {},
    path:        location.hash.slice(1) || '/',
    lang:        i18n.getLang(),
  });

  if (state.queue.length >= CONFIG.analytics.maxQueueSize) {
    flush();
  }
}

// ═══════════════════════════════════════════════════════════
//  Flush
// ═══════════════════════════════════════════════════════════
async function flush(sync = false) {
  if (state.flushing) return;
  if (state.queue.length === 0) return;

  const batch = state.queue.splice(0, state.queue.length);
  state.flushing = true;

  try {
    if (sync && navigator.sendBeacon) {
      // fire-and-forget — برای unload
      try {
        await api.analytics.track(batch);
      } catch { /* silent */ }
    } else {
      await api.analytics.track(batch);
    }
  } catch (err) {
    // silent — در صورت خطا، به صف برنمی‌گردانیم تا از لوپ جلوگیری شود
    console.debug('[analytics] flush failed', err);
  } finally {
    state.flushing = false;
  }
}