import { h, qs, on } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { CONFIG } from '../../../core/config.js';
import { icons } from '../../icons/icons.js';
import { headerLang } from './header.lang.js';

let els = {};

export function Header() {
  i18n.register('header', headerLang);

  const lang = i18n.getLang();

  const el = h('header', { class: 'header' },
    h('div', { class: 'container header__inner' },

      // ── لوگو ──
      h('a', { class: 'header__brand', href: '#/', 'aria-label': 'Phone Store' },
        h('span', { class: 'header__logo', innerHTML: icons.logo }),
        h('span', { class: 'header__brand-text' }, 'Phone Store'),
      ),

      // ── ناوبری ──
      h('nav', { class: 'header__nav' },
        h('a', { class: 'header__link', href: '#/' }, i18n.t('header.home')),
        h('a', { class: 'header__link', href: '#/products' }, i18n.t('header.products')),
      ),

      // ── اکشن‌ها ──
      h('div', { class: 'header__actions' },

        // جستجو — از روز اول وجود دارد، منتظر فیچر search است
        h('button', {
          class: 'icon-btn',
          'aria-label': i18n.t('header.search'),
          dataset: { action: 'search' },
          innerHTML: icons.search,
        }),

        // سبد — از روز اول وجود دارد، منتظر فیچر cart است
        h('a', {
          class: 'icon-btn header__cart',
          href: '#/cart',
          'aria-label': i18n.t('header.cart'),
          dataset: { action: 'cart' },
        },
          h('span', { innerHTML: icons.cart }),
          h('span', { class: 'header__badge', dataset: { count: '' } }, '0'),
        ),

        // زبان
        h('button', {
          class: 'icon-btn',
          'aria-label': i18n.t('header.toggleLang'),
          dataset: { action: 'lang' },
          innerHTML: icons.globe,
        }),

        // تم
        h('button', {
          class: 'icon-btn',
          'aria-label': i18n.t('header.toggleTheme'),
          dataset: { action: 'theme' },
          innerHTML: icons.moon,
        }),
      ),
    ),
  );

  els = {
    root:  el,
    badge: qs('[data-count]', el),
    theme: qs('[data-action="theme"]', el),
    lang:  qs('[data-action="lang"]', el),
  };

  wire();
  return el;
}

function wire() {
  // ── تغییر زبان ──
  on(els.lang, 'click', () => {
    const next = i18n.getLang() === 'fa' ? 'en' : 'fa';
    i18n.setLang(next);
  });

  // ── تغییر تم ──
  on(els.theme, 'click', () => events.emit('theme:toggle'));

  // ── وقتی زبان عوض شد، متن‌های ثابت هدر را دوباره بنویس ──
  events.on('lang:changed', () => {
    qs('a[href="#/"]', els.root).textContent = i18n.t('header.home');
    qs('a[href="#/products"]', els.root).textContent = i18n.t('header.products');
  });

  // ── سبد — از روز اول گوش می‌دهد، حتی وقتی cart نیست ──
  // این خط هرگز تغییر نمی‌کند. فقط منتظر event می‌ماند
  events.on('cart:changed', ({ count = 0 }) => {
    els.badge.textContent = i18n.formatNumber(count);
    els.badge.classList.toggle('header__badge--visible', count > 0);
  });

  // ── جستجو — از روز اول گوش می‌دهد ──
  on(qs('[data-action="search"]', els.root), 'click', () => {
    events.emit('search:open');
  });

  // ── تم — آیکون را با وضعیت هم‌گام کن ──
  events.on('theme:changed', ({ theme }) => {
    els.theme.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
  });
}