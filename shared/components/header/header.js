// ═══════════════════════════════════════════════════════════
//  Header — Phase 13
//
//  تغییرات:
//  ✅ دکمه منوی موبایل (Hamburger)
//  ✅ Drawer کشویی با ناوبری + اکشن‌ها
//  ✅ Overlay + Esc برای بستن
//  ✅ هماهنگ با RTL/LTR و Dark Mode
//  ✅ بدون دست زدن به منطق auth (auth.js خودش تزریق می‌کند)
// ═══════════════════════════════════════════════════════════

import { h, qs, on } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { icons } from '../../icons/icons.js';
import { headerLang } from './header.lang.js';

let els = {};
let drawerEl = null;
let overlayEl = null;
let offEsc = null;

// ═══════════════════════════════════════════════════════════
//  Header — چیدمان اصلی
// ═══════════════════════════════════════════════════════════
export function Header() {
  i18n.register('header', headerLang);

  const el = h('header', { class: 'header' },
    h('div', { class: 'container header__inner' },

      // ── دکمه منوی موبایل (فقط در موبایل دیده می‌شود) ──
      h('button', {
        class: 'header__menu-btn',
        type: 'button',
        'aria-label': i18n.t('header.menu'),
        dataset: { action: 'menu-toggle' },
        innerHTML: icons.menu,
      }),

      // ── لوگو ──
      h('a', {
        class: 'header__brand',
        href: '#/',
        'aria-label': 'Phone Store',
      },
        h('span', { class: 'header__logo', innerHTML: icons.logo }),
        h('span', { class: 'header__brand-text' }, 'Phone Store'),
      ),

      // ── ناوبری دسکتاپ ──
      h('nav', { class: 'header__nav', 'aria-label': i18n.t('header.menuTitle') },
        h('a', { class: 'header__link', href: '#/' },         i18n.t('header.home')),
        h('a', { class: 'header__link', href: '#/products' }, i18n.t('header.products')),
        h('a', { class: 'header__link', href: '#/brands' },   i18n.t('header.brands')),
      ),

      // ── Action ها ──
      h('div', { class: 'header__actions' },

        // جستجو
        h('button', {
  class: 'icon-btn',
  'aria-label': i18n.t('header.search'),
  dataset: { action: 'search' },
},
  h('span', { class: 'icon-btn__icon', innerHTML: icons.search }),
),

        // علاقه‌مندی‌ها
        h('a', {
          class: 'icon-btn header__fav',
          href: '#/favorites',
          'aria-label': i18n.t('header.favorites'),
          dataset: { action: 'favorites' },
        },
          h('span', { class: 'icon-btn__icon', innerHTML: icons.heart }),
          h('span', { class: 'header__badge', dataset: { count: 'fav' } }, '0'),
        ),

        // سبد
        h('a', {
          class: 'icon-btn header__cart',
          href: '#/cart',
          'aria-label': i18n.t('header.cart'),
          dataset: { action: 'cart' },
        },
          h('span', { class: 'icon-btn__icon', innerHTML: icons.cart }),
          h('span', { class: 'header__badge', dataset: { count: 'cart' } }, '0'),
        ),

        // ⚠️ auth.js دکمه‌ی خودش را اینجا تزریق می‌کند

        // زبان
        h('button', {
          class: 'icon-btn',
          type: 'button',
          'aria-label': i18n.t('header.toggleLang'),
          dataset: { action: 'lang' },
          innerHTML: icons.globe,
        }),

        // تم
        h('button', {
          class: 'icon-btn',
          type: 'button',
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
    menuBtn:   qs('[data-action="menu-toggle"]', el),
  };

  wire();
  return el;
}

// ═══════════════════════════════════════════════════════════
//  Wire — اتصال رویدادها
// ═══════════════════════════════════════════════════════════
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

  // ── باز/بسته کردن Drawer موبایل ──
  on(els.menuBtn, 'click', () => toggleDrawer(true));

  // ── وقتی زبان عوض شد، متن‌های ثابت دسکتاپ + Drawer را دوباره بنویس ──
  events.on('lang:changed', () => {
    // ناوبری دسکتاپ
    const navLinks = els.root.querySelectorAll('.header__link');
    if (navLinks[0]) navLinks[0].textContent = i18n.t('header.home');
    if (navLinks[1]) navLinks[1].textContent = i18n.t('header.products');
    if (navLinks[2]) navLinks[2].textContent = i18n.t('header.brands');

    // aria-labels
    els.search?.setAttribute('aria-label', i18n.t('header.search'));
    els.lang?.setAttribute('aria-label', i18n.t('header.toggleLang'));
    els.theme?.setAttribute('aria-label', i18n.t('header.toggleTheme'));
    els.menuBtn?.setAttribute('aria-label', i18n.t('header.menu'));

    // Drawer اگه بازه، رندر مجدد
    if (drawerEl) {
      renderDrawer();
    }
  });

  // ── سبد ──
  events.on('cart:changed', ({ count = 0 }) => {
    if (!els.cartBadge) return;
    els.cartBadge.textContent = i18n.formatNumber(count);
    els.cartBadge.classList.toggle('header__badge--visible', count > 0);
  });

  // ── علاقه‌مندی‌ها ──
  events.on('favorites:changed', ({ count = 0 }) => {
    if (!els.favBadge) return;
    els.favBadge.textContent = i18n.formatNumber(count);
    els.favBadge.classList.toggle('header__badge--visible', count > 0);
  });

  // ── تم ──
  events.on('theme:changed', ({ theme }) => {
    if (!els.theme) return;
    els.theme.innerHTML = theme === 'dark' ? icons.sun : icons.moon;

    // Drawer اگه بازه، آیکون تم رو هم آپدیت کن
    if (drawerEl) {
      const drawerThemeBtn = drawerEl.querySelector('[data-drawer-action="theme"]');
      if (drawerThemeBtn) {
        drawerThemeBtn.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  Drawer — ساخته‌شده در لحظه، حذف هنگام بستن
// ═══════════════════════════════════════════════════════════
function toggleDrawer(open) {
  if (open) mountDrawer();
  else unmountDrawer();
}

function mountDrawer() {
  if (drawerEl) return;

  // ── Overlay ──
  overlayEl = h('div', {
    class: 'header-drawer-overlay',
    onclick: () => unmountDrawer(),
    'aria-hidden': 'true',
  });
  document.body.append(overlayEl);
  requestAnimationFrame(() => overlayEl.classList.add('is-visible'));

  // ── Drawer ──
  drawerEl = h('aside', {
    class: 'header-drawer',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': i18n.t('header.menuTitle'),
  });
  document.body.append(drawerEl);
  renderDrawer();

  requestAnimationFrame(() => {
    overlayEl.classList.add('is-visible');
    drawerEl.classList.add('is-visible');
  });

  // قفل اسکرول
  document.body.style.overflow = 'hidden';

  // بستن با Esc
  offEsc = on(document, 'keydown', (e) => {
    if (e.key === 'Escape') unmountDrawer();
  });
}

function unmountDrawer() {
  if (!drawerEl) return;

  overlayEl?.classList.remove('is-visible');
  drawerEl.classList.remove('is-visible');

  const d = drawerEl;
  const o = overlayEl;

  setTimeout(() => {
    d?.remove();
    o?.remove();
  }, 250);

  drawerEl = null;
  overlayEl = null;

  // بازگرداندن اسکرول
  document.body.style.overflow = '';

  // حذف listener
  offEsc?.();
  offEsc = null;
}

function renderDrawer() {
  if (!drawerEl) return;

  const currentTheme = document.documentElement.dataset.theme || 'light';
  const currentLang  = i18n.getLang();

  drawerEl.replaceChildren(
    // ── Head ──
    h('div', { class: 'header-drawer__head' },
      h('a', {
        class: 'header-drawer__brand',
        href: '#/',
        onclick: () => unmountDrawer(),
      },
        h('span', { class: 'header-drawer__logo', innerHTML: icons.logo }),
        h('span', { class: 'header-drawer__brand-text' }, 'Phone Store'),
      ),
      h('button', {
        class: 'header-drawer__close',
        type: 'button',
        'aria-label': i18n.t('header.closeMenu'),
        onclick: () => unmountDrawer(),
        innerHTML: icons.close,
      }),
    ),

    // ── ناوبری اصلی ──
    h('nav', { class: 'header-drawer__nav' },
      DrawerLink('#/',          'home',     icons.logo),
      DrawerLink('#/products',  'products', icons.box),
      DrawerLink('#/brands',    'brands',   icons.tag),
      DrawerLink('#/favorites', 'favorites',icons.heart),
      DrawerLink('#/about',     'about',    icons.info),
      DrawerLink('#/contact',   'contact',  icons.user),
    ),

    // ── Footer: تنظیمات سریع ──
    h('div', { class: 'header-drawer__footer' },
      h('button', {
        class: 'header-drawer__setting',
        type: 'button',
        dataset: { drawerAction: 'lang' },
        onclick: () => {
          const next = i18n.getLang() === 'fa' ? 'en' : 'fa';
          i18n.setLang(next);
          // بعد از تغییر زبان، Drawer را رندر مجدد کن
          setTimeout(renderDrawer, 50);
        },
      },
        h('span', { class: 'header-drawer__setting-icon', innerHTML: icons.globe }),
        h('span', { class: 'header-drawer__setting-label' },
          currentLang === 'fa' ? 'English' : 'فارسی'),
      ),

      h('button', {
        class: 'header-drawer__setting',
        type: 'button',
        dataset: { drawerAction: 'theme' },
        onclick: () => {
          events.emit('theme:toggle');
          setTimeout(renderDrawer, 50);
        },
      },
        h('span', {
          class: 'header-drawer__setting-icon',
          innerHTML: currentTheme === 'dark' ? icons.sun : icons.moon,
        }),
        h('span', { class: 'header-drawer__setting-label' },
          i18n.t('header.toggleTheme')),
      ),
    ),
  );
}

function DrawerLink(href, labelKey, icon) {
  const isActive = href === '#' + (location.hash.slice(1).split('?')[0] || '/');
  return h('a', {
    class: `header-drawer__link ${isActive ? 'is-active' : ''}`,
    href,
    onclick: () => unmountDrawer(),
  },
    h('span', { class: 'header-drawer__link-icon', innerHTML: icon }),
    h('span', { class: 'header-drawer__link-label' }, i18n.t(`header.${labelKey}`)),
  );
}