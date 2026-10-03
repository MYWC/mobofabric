import { h, qs, on } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { CONFIG } from '../../../core/config.js';
import { icons } from '../../icons/icons.js';
import { headerLang } from './header.lang.js';

let els = {};

export function Header() {
  i18n.register('header', headerLang);

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

        // جستجو — منتظر فیچر search
        h('button', {
          class: 'icon-btn',
          'aria-label': i18n.t('header.search'),
          dataset: { action: 'search' },
          innerHTML: icons.search,
        }),

        // علاقه‌مندی‌ها — منتظر فیچر favorites
        h('a', {
          class: 'icon-btn header__fav',
          href: '#/favorites',
          'aria-label': i18n.t('header.favorites'),
          dataset: { action: 'favorites' },
        },
          h('span', { innerHTML: icons.heart }),
          h('span', { class: 'header__badge', dataset: { count: 'fav' } }, '0'),
        ),

        // سبد — منتظر فیچر cart
        h('a', {
          class: 'icon-btn header__cart',
          href: '#/cart',
          'aria-label': i18n.t('header.cart'),
          dataset: { action: 'cart' },
        },
          h('span', { innerHTML: icons.cart }),
          h('span', { class: 'header__badge', dataset: { count: 'cart' } }, '0'),
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
    root:      el,
    cartBadge: qs('[data-count="cart"]', el),
    favBadge:  qs('[data-count="fav"]',  el),
    theme:     qs('[data-action="theme"]', el),
    lang:      qs('[data-action="lang"]', el),
    search:    qs('[data-action="search"]', el),
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

  // ── باز کردن جستجو ──
  on(els.search, 'click', () => events.emit('search:open'));

  // ── وقتی زبان عوض شد، متن‌های ثابت هدر را دوباره بنویس ──
  events.on('lang:changed', () => {
    qs('a[href="#/"]', els.root).textContent = i18n.t('header.home');
    qs('a[href="#/products"]', els.root).textContent = i18n.t('header.products');
  });

  // ── سبد — از روز اول گوش می‌دهد، حتی وقتی cart نیست ──
  events.on('cart:changed', ({ count = 0 }) => {
    if (!els.cartBadge) return;
    els.cartBadge.textContent = i18n.formatNumber(count);
    els.cartBadge.classList.toggle('header__badge--visible', count > 0);
  });

  // ── علاقه‌مندی‌ها — از فاز ۸ ──
  events.on('favorites:changed', ({ count = 0 }) => {
    if (!els.favBadge) return;
    els.favBadge.textContent = i18n.formatNumber(count);
    els.favBadge.classList.toggle('header__badge--visible', count > 0);
  });

  // ── تم — آیکون را با وضعیت هم‌گام کن ──
  events.on('theme:changed', ({ theme }) => {
    els.theme.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
  });
}