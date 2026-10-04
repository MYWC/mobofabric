// ═══════════════════════════════════════════════════════════
//  Header — Velvet Luxury
//  Phase 26
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
let offScroll = null;

// ═══════════════════════════════════════════════════════════
//  Header
// ═══════════════════════════════════════════════════════════
export function Header() {
  i18n.register('header', headerLang);

  const el = h('header', { class: 'header' },
    h('div', { class: 'header__inner' },

      // ── دکمه منو (موبایل) ──
      h('button', {
        class: 'header__menu-btn',
        type: 'button',
        'aria-label': i18n.t('header.menu'),
        dataset: { action: 'menu-toggle' },
        innerHTML: icons.menu,
      }),

      // ── برند ──
      h('a', {
        class: 'header__brand',
        href: '#/',
        'aria-label': 'Phone Store',
      },
        h('span', { class: 'header__logo', innerHTML: icons.logo }),
        h('span', { class: 'header__brand-text' }, 'Phone Store'),
      ),

      // ── ناوبری ──
      h('nav', { class: 'header__nav', 'aria-label': i18n.t('header.menuTitle') },
        NavLink('#/',         'home',     'header.home'),
        NavLink('#/products', 'products', 'header.products'),
        NavLink('#/brands',   'brands',   'header.brands'),
      ),

      // ── اکشن‌ها ──
      h('div', { class: 'header__actions' },

        // جستجو
        h('button', {
          class: 'icon-btn',
          type: 'button',
          'aria-label': i18n.t('header.search'),
          dataset: { action: 'search' },
          innerHTML: icons.search,
        }),

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

        // auth.js خودش دکمه‌اش رو اینجا تزریق می‌کنه

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
//  Nav Link (با is-active)
// ═══════════════════════════════════════════════════════════
function NavLink(href, id, labelKey) {
  const isActive = isActiveRoute(href);
  return h('a', {
    class: `header__link ${isActive ? 'is-active' : ''}`,
    href,
    dataset: { nav: id },
  }, i18n.t(labelKey));
}

function isActiveRoute(href) {
  const current = '#' + (location.hash.slice(1).split('?')[0] || '/');
  if (href === '#/' && current === '#/') return true;
  if (href !== '#/' && current.startsWith(href)) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════
//  Wire
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

  // ── باز کردن Drawer ──
  on(els.menuBtn, 'click', () => toggleDrawer(true));

  // ── اسکرول: خط طلایی ──
  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY > 8;
        els.root.classList.toggle('is-scrolled', scrolled);
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── تغییر زبان → آپدیت متن‌ها ──
  events.on('lang:changed', () => {
    qsa('.header__link', els.root).forEach(link => {
      const id = link.dataset.nav;
      if (id) link.textContent = i18n.t(`header.${id}`);
    });

    els.search?.setAttribute('aria-label', i18n.t('header.search'));
    els.lang?.setAttribute('aria-label', i18n.t('header.toggleLang'));
    els.theme?.setAttribute('aria-label', i18n.t('header.toggleTheme'));
    els.menuBtn?.setAttribute('aria-label', i18n.t('header.menu'));

    if (drawerEl) renderDrawer();
  });

  // ── تغییر روتر → آپدیت active link ──
  events.on('route:changed', () => {
    qsa('.header__link', els.root).forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('is-active', isActiveRoute(href));
    });
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

    if (drawerEl) {
      const drawerThemeBtn = drawerEl.querySelector('[data-drawer-action="theme"]');
      if (drawerThemeBtn) {
        drawerThemeBtn.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  Drawer
// ═══════════════════════════════════════════════════════════
function toggleDrawer(open) {
  if (open) mountDrawer();
  else unmountDrawer();
}

function mountDrawer() {
  if (drawerEl) return;

  overlayEl = h('div', {
    class: 'header-drawer-overlay',
    onclick: () => unmountDrawer(),
    'aria-hidden': 'true',
  });
  document.body.append(overlayEl);
  requestAnimationFrame(() => overlayEl.classList.add('is-visible'));

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

  document.body.style.overflow = 'hidden';

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

  document.body.style.overflow = '';

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
        h('span', {}, 'Phone Store'),
      ),
      h('button', {
        class: 'header-drawer__close',
        type: 'button',
        'aria-label': i18n.t('header.closeMenu'),
        onclick: () => unmountDrawer(),
        innerHTML: icons.close,
      }),
    ),

    // ── Nav ──
    h('nav', { class: 'header-drawer__nav' },
      DrawerLink('#/',          'home',     icons.logo),
      DrawerLink('#/products',  'products', icons.box),
      DrawerLink('#/brands',    'brands',   icons.tag),
      DrawerLink('#/favorites', 'favorites',icons.heart),
      DrawerLink('#/about',     'about',    icons.info),
      DrawerLink('#/contact',   'contact',  icons.user),
    ),

    // ── Footer ──
    h('div', { class: 'header-drawer__footer' },
      h('button', {
        class: 'header-drawer__setting',
        type: 'button',
        dataset: { drawerAction: 'lang' },
        onclick: () => {
          const next = i18n.getLang() === 'fa' ? 'en' : 'fa';
          i18n.setLang(next);
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
  const isActive = isActiveRoute(href);
  return h('a', {
    class: `header-drawer__link ${isActive ? 'is-active' : ''}`,
    href,
    onclick: () => unmountDrawer(),
  },
    h('span', { class: 'header-drawer__link-icon', innerHTML: icon }),
    h('span', {}, i18n.t(`header.${labelKey}`)),
  );
}

// ═══════════════════════════════════════════════════════════
//  Helper
// ═══════════════════════════════════════════════════════════
function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}