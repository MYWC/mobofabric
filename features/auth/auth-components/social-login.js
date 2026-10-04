// ═══════════════════════════════════════════════════════════
//  Social Login — Phase 19
//  مدیریت ورود با Google / GitHub
// ═══════════════════════════════════════════════════════════

import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { api } from '../../../core/api.js';
import { CONFIG } from '../../../core/config.js';

let busy = false;

export const socialLogin = {
  async start(provider) {
    if (busy) return;

    if (!isProviderEnabled(provider)) {
      events.emit('toast:show', {
        type: 'warning',
        message: i18n.getLang() === 'fa'
          ? `ورود با ${provider} هنوز فعال نشده است`
          : `${provider} login is not enabled yet`,
        duration: 4000,
      });
      return;
    }

    busy = true;

    try {
      const redirectTo = `${location.origin}${location.pathname}#/`;
      await api.auth.signInWithOAuth(provider, redirectTo);
    } catch (err) {
      console.error('[social-login]', err);

      const msg = String(err?.message || '').toLowerCase();

      let userMsg;
      if (msg.includes('not enabled') || msg.includes('provider is not enabled')) {
        userMsg = i18n.getLang() === 'fa'
          ? 'این روش ورود هنوز توسط مدیر فعال نشده است'
          : 'This login method has not been enabled yet';
      } else if (msg.includes('network') || msg.includes('fetch')) {
        userMsg = i18n.getLang() === 'fa'
          ? 'خطای شبکه. لطفاً اتصال خود را بررسی کنید'
          : 'Network error. Please check your connection';
      } else {
        userMsg = i18n.getLang() === 'fa'
          ? 'خطا در ورود. لطفاً دوباره تلاش کنید'
          : 'Login failed. Please try again';
      }

      events.emit('toast:show', {
        type: 'error',
        message: userMsg,
        duration: 5000,
      });

      busy = false;
    }
  },

  isBusy() { return busy; },
};

function isProviderEnabled(provider) {
  const enabled = CONFIG.authUI.socialProviders || ['google', 'github'];
  return enabled.includes(provider);
}