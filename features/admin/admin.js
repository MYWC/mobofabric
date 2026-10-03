import { h, qs, qsa, on, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { api } from '../../core/api.js';
import { router } from '../../core/router.js';
import { icons } from '../../shared/icons/icons.js';
import { adminLang } from './admin.lang.js';

const sectionLoaders = {
  dashboard: () => import('./sections/dashboard.js').then(m => m.dashboard),
  products:  () => import('./sections/products.js').then(m => m.products),
  brands:    () => import('./sections/brands.js').then(m => m.brands),
  discounts: () => import('./sections/discounts.js').then(m => m.discounts),
  reviews:   () => import('./sections/reviews.js').then(m => m.reviews),
  analytics: () => import('./sections/analytics.js').then(m => m.analytics),
};

const sectionCache = {};

const state = {
  profile:     null,
  isAdmin:     false,
  loading:     true,
  forbidden:   false,
  needLogin:   false,
  needClaim:   false,
  sidebarOpen: false,
  activeSection: 'dashboard',
  contentEl:   null,
};

let offLang = null;

export const admin = {
  register() {
    i18n.register('admin', adminLang);

    router.register('/admin',            () => enter('dashboard'));
    router.register('/admin/products',   () => enter('products'));
    router.register('/admin/brands',     () => enter('brands'));
    router.register('/admin/discounts',  () => enter('discounts'));
    router.register('/admin/reviews',    () => enter('reviews'));
    router.register('/admin/analytics',  () => enter('analytics'));

    offLang = events.on('lang:changed', () => {
      if (state.profile) renderShell();
    });

    events.on('auth:changed', () => {
      if (location.hash.startsWith('#/admin')) enter(currentSection());
    });
  },
};

async function enter(section) {
  state.activeSection = section || 'dashboard';

  const container = qs('#app');
  if (!container) return;

  const existingShell = qs('.admin-shell', container);
  if (existingShell && state.isAdmin) {
    mountSection(state.activeSection);
    updateActiveLink();
    return;
  }

  state.loading = true;
  state.forbidden = false;
  state.needLogin = false;
  state.needClaim = false;
  render(container, LoadingView());

  try {
    const profile = await api.auth.getProfile();

    if (!profile) {
      state.needLogin = true;
      state.loading = false;
      render(container, NeedLoginView());
      return;
    }

    state.profile = profile;

    if (profile.role !== 'admin') {
      const admins = await api.admin.profiles.list();
      const hasAdmin = admins.some(p => p.role === 'admin');

      if (!hasAdmin) {
        state.needClaim = true;
        state.loading = false;
        render(container, ClaimView());
        return;
      }

      state.forbidden = true;
      state.loading = false;
      render(container, ForbiddenView());
      return;
    }

    state.isAdmin = true;
    state.loading = false;
    renderShell();
  } catch (err) {
    console.error('[admin] guard failed', err);
    state.forbidden = true;
    state.loading = false;
    render(container, ForbiddenView());
  }
}

function currentSection() {
  const hash = location.hash.slice(1);
  const m = hash.match(/^\/admin(?:\/([a-z]+))?/);
  return m?.[1] || 'dashboard';
}

function renderShell() {
  const container = qs('#app');
  if (!container) return;

  const shell = h('div', { class: `admin-shell ${state.sidebarOpen ? 'is-sidebar-open' : ''}` },
    Sidebar(),
    h('div', { class: 'admin-main' },
      Topbar(),
      h('main', { class: 'admin-content', dataset: { role: 'content' } }),
    ),
    h('div', { class: 'admin-overlay', onclick: () => toggleSidebar(false) }),
  );

  render(container, shell);
  state.contentEl = qs('[data-role="content"]', shell);

  mountSection(state.activeSection);
  wireShell();
}

function Sidebar() {
  const nav = [
    { id: 'dashboard', label: 'admin.dashboard', icon: 'dashboard' },
    { id: 'products',  label: 'admin.products',  icon: 'box' },
    { id: 'brands',    label: 'admin.brands',    icon: 'tag' },
    { id: 'discounts', label: 'admin.discounts', icon: 'tag' },
    { id: 'reviews',   label: 'admin.reviews',   icon: 'star' },
    { id: 'analytics', label: 'admin.analytics', icon: 'chart' },
  ];

  return h('aside', { class: 'admin-sidebar' },
    h('div', { class: 'admin-sidebar__brand' },
      h('span', { class: 'admin-sidebar__logo', innerHTML: icons.logo }),
      h('span', { class: 'admin-sidebar__name' }, i18n.t('admin.panel')),
    ),
    h('nav', { class: 'admin-sidebar__nav' },
      ...nav.map(item => h('a', {
        class: `admin-nav-link ${state.activeSection === item.id ? 'is-active' : ''}`,
        href: `#/admin${item.id === 'dashboard' ? '' : '/' + item.id}`,
        dataset: { section: item.id },
        onclick: () => {
          state.activeSection = item.id;
          toggleSidebar(false);
        },
      },
        h('span', { class: 'admin-nav-link__icon', innerHTML: icons[item.icon] }),
        h('span', { class: 'admin-nav-link__label' }, i18n.t(item.label)),
      )),
    ),
    h('div', { class: 'admin-sidebar__footer' },
      h('a', { class: 'admin-nav-link', href: '#/' },
        h('span', { class: 'admin-nav-link__icon', innerHTML: icons.external }),
        h('span', { class: 'admin-nav-link__label' }, i18n.t('admin.backToSite')),
      ),
    ),
  );
}

function Topbar() {
  const sectionTitle = {
    dashboard: 'admin.dashboard',
    products:  'admin.productsTitle',
    brands:    'admin.brandsTitle',
    discounts: 'admin.discountsTitle',
    reviews:   'admin.reviewsTitle',
    analytics: 'admin.analyticsTitle',
  }[state.activeSection] || 'admin.panel';

  const name = state.profile?.full_name?.trim()
    || state.profile?.email?.split('@')[0] || '';
  const initial = name ? name.charAt(0).toUpperCase() : 'A';

  return h('header', { class: 'admin-topbar' },
    h('button', {
      class: 'admin-topbar__menu',
      type: 'button',
      'aria-label': 'menu',
      onclick: () => toggleSidebar(!state.sidebarOpen),
      innerHTML: icons.menu,
    }),
    h('h1', { class: 'admin-topbar__title' }, i18n.t(sectionTitle)),
    h('div', { class: 'admin-topbar__actions' },
      h('div', { class: 'admin-topbar__user' },
        h('span', { class: 'admin-topbar__avatar' }, initial),
        h('div', { class: 'admin-topbar__user-meta' },
          h('strong', {}, name),
          h('span', {}, state.profile?.email || ''),
        ),
      ),
    ),
  );
}

function wireShell() {
  updateActiveLink();
}

function updateActiveLink() {
  qsa('.admin-nav-link[data-section]').forEach(link => {
    link.classList.toggle('is-active', link.dataset.section === state.activeSection);
  });
}

function toggleSidebar(open) {
  state.sidebarOpen = open;
  const shell = qs('.admin-shell');
  if (shell) shell.classList.toggle('is-sidebar-open', open);
}

async function mountSection(id) {
  if (!state.contentEl) return;

  render(state.contentEl, h('div', { class: 'admin-loading' },
    h('span', { class: 'admin-spinner' }),
    h('span', {}, i18n.t('admin.loading')),
  ));

  try {
    const loader = sectionLoaders[id];
    if (!loader) {
      render(state.contentEl, h('div', { class: 'admin-empty' }, i18n.t('admin.empty')));
      return;
    }

    let mod = sectionCache[id];
    if (!mod) {
      mod = await loader();
      sectionCache[id] = mod;
    }

    mod.mount?.(state.contentEl, { onNav: onSectionNav, profile: state.profile });
  } catch (err) {
    console.error(`[admin] section "${id}" failed`, err);
    render(state.contentEl, h('div', { class: 'admin-empty' }, i18n.t('admin.errorLoad')));
  }
}

function onSectionNav(path) {
  router.navigate(path);
}

function LoadingView() {
  return h('div', { class: 'admin-state' },
    h('div', { class: 'admin-state__card' },
      h('div', { class: 'admin-spinner' }),
      h('p', {}, i18n.t('admin.checkingAuth')),
    ),
  );
}

function NeedLoginView() {
  return h('div', { class: 'admin-state' },
    h('div', { class: 'admin-state__card' },
      h('div', { class: 'admin-state__icon', innerHTML: icons.user }),
      h('h2', {}, i18n.t('admin.notLoggedIn')),
      h('a', { class: 'btn btn--accent', href: '#/login?redirect=/admin' },
        i18n.t('admin.goToLogin')),
    ),
  );
}

function ForbiddenView() {
  return h('div', { class: 'admin-state' },
    h('div', { class: 'admin-state__card' },
      h('div', { class: 'admin-state__icon admin-state__icon--danger', innerHTML: icons.shield }),
      h('h2', {}, i18n.t('admin.forbidden')),
      h('p', {}, i18n.t('admin.forbiddenHint')),
      h('a', { class: 'btn btn--accent', href: '#/' }, i18n.t('admin.goHome')),
    ),
  );
}

function ClaimView() {
  return h('div', { class: 'admin-state' },
    h('div', { class: 'admin-state__card' },
      h('div', { class: 'admin-state__icon admin-state__icon--accent', innerHTML: icons.shield }),
      h('h2', {}, i18n.t('admin.claimTitle')),
      h('p', {}, i18n.t('admin.claimText')),
      h('button', {
        class: 'btn btn--accent',
        type: 'button',
        onclick: doClaim,
        dataset: { role: 'claim-btn' },
      }, i18n.t('admin.claimButton')),
    ),
  );
}

async function doClaim() {
  const btn = qs('[data-role="claim-btn"]');
  if (btn) { btn.disabled = true; btn.textContent = i18n.t('admin.claiming'); }

  try {
    const res = await api.auth.claimAdmin();
    if (res?.ok) {
      events.emit('toast:show', { type: 'success', message: i18n.t('admin.claimSuccess') });
      location.reload();
    } else {
      events.emit('toast:show', { type: 'warning', message: i18n.t('admin.claimTaken') });
      enter('dashboard');
    }
  } catch (err) {
    console.error(err);
    events.emit('toast:show', { type: 'error', message: i18n.t('admin.errorGeneric') });
    if (btn) { btn.disabled = false; btn.textContent = i18n.t('admin.claimButton'); }
  }
}