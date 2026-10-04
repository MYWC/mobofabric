// ═══════════════════════════════════════════════════════════
//  Footer — Velvet Luxury
//  Phase 26 — Obsidian Vault
// ═══════════════════════════════════════════════════════════

import { h, qs, on } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { icons } from '../../icons/icons.js';
import { footerLang } from './footer.lang.js';

// ═══════════════════════════════════════════════════════════
//  Footer
// ═══════════════════════════════════════════════════════════
export function Footer() {
  i18n.register('footer', footerLang);

  const el = h('footer', { class: 'vault-footer' },
    // ── Top accent line ──
    h('div', { class: 'vault-footer__accent' }),

    // ── Trust Bar ──
    TrustBar(),

    // ── Main content ──
    h('div', { class: 'vault-footer__main' },
      h('div', { class: 'container vault-footer__inner' },
        BrandColumn(),
        ColumnsGrid(),
      ),
    ),

    // ── Bottom bar ──
    BottomBar(),
  );

  // ── Language change ──
  events.on('lang:changed', () => {
    const fresh = Footer();
    el.replaceWith(fresh);
  });

  // ── Newsletter form ──
  requestAnimationFrame(() => wireNewsletter(el));

  return el;
}

// ═══════════════════════════════════════════════════════════
//  Trust Bar
// ═══════════════════════════════════════════════════════════
function TrustBar() {
  const items = [
    { icon: icons.shield, key: 'footer.securePayment' },
    { icon: icons.box,    key: 'footer.fastShipping' },
    { icon: icons.check,  key: 'footer.authentic' },
    { icon: icons.user,   key: 'footer.support24' },
  ];

  return h('div', { class: 'vault-footer__trust' },
    h('div', { class: 'container vault-footer__trust-inner' },
      ...items.map(item => h('div', { class: 'vault-footer__trust-item' },
        h('span', { class: 'vault-footer__trust-icon', innerHTML: item.icon }),
        h('span', { class: 'vault-footer__trust-text' }, i18n.t(item.key)),
      )),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Brand Column
// ═══════════════════════════════════════════════════════════
function BrandColumn() {
  return h('div', { class: 'vault-footer__brand-col' },
    // Logo
    h('a', { class: 'vault-footer__brand', href: '#/' },
      h('span', { class: 'vault-footer__logo', innerHTML: icons.logo }),
      h('span', { class: 'vault-footer__brand-text' }, 'Phone Store'),
    ),

    // Tagline
    h('p', { class: 'vault-footer__tagline' }, i18n.t('footer.tagline')),

    // Newsletter
    h('div', { class: 'vault-footer__newsletter' },
      h('div', { class: 'vault-footer__newsletter-head' },
        h('h4', { class: 'vault-footer__newsletter-title' }, i18n.t('footer.newsletterTitle')),
        h('p',  { class: 'vault-footer__newsletter-hint' },  i18n.t('footer.newsletterHint')),
      ),
      h('form', { class: 'vault-footer__form', onsubmit: null },
        h('input', {
          class: 'vault-footer__input',
          type: 'email',
          placeholder: i18n.t('footer.emailPlaceholder'),
          'aria-label': i18n.t('footer.emailPlaceholder'),
          required: true,
          dataset: { role: 'email' },
        }),
        h('button', {
          class: 'vault-footer__submit',
          type: 'submit',
          dataset: { role: 'submit' },
        },
          h('span', { class: 'vault-footer__submit-label' }, i18n.t('footer.subscribe')),
          h('span', { class: 'vault-footer__submit-arrow', innerHTML: icons.arrowL }),
        ),
      ),
    ),

    // Social
    SocialRow(),
  );
}

// ═══════════════════════════════════════════════════════════
//  Social Row
// ═══════════════════════════════════════════════════════════
function SocialRow() {
  const SVG = (inner, size = 18) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  const socials = [
    {
      id: 'instagram',
      label: 'footer.instagram',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
    },
    {
      id: 'telegram',
      label: 'footer.telegram',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5 2.5 10.5l5.5 2 1.5 6 3-4 5 4 4-15z"/></svg>`,
    },
    {
      id: 'twitter',
      label: 'footer.twitter',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    },
  ];

  return h('div', { class: 'vault-footer__social' },
    ...socials.map(s => h('a', {
      class: 'vault-footer__social-btn',
      href: '#',
      'aria-label': i18n.t(s.label),
      dataset: { social: s.id },
      innerHTML: s.svg,
    })),
  );
}

// ═══════════════════════════════════════════════════════════
//  Columns Grid
// ═══════════════════════════════════════════════════════════
function ColumnsGrid() {
  return h('div', { class: 'vault-footer__cols' },
    Column('shop', [
      { href: '#/products',           key: 'footer.shopProducts' },
      { href: '#/brands',             key: 'footer.shopBrands' },
      { href: '#/products?featured=1',key: 'footer.shopFeatured' },
      { href: '#/products?sort=newest',key: 'footer.shopNew' },
    ]),

    Column('account', [
      { href: '#/login',     key: 'footer.accountLogin' },
      { href: '#/login?mode=signup', key: 'footer.accountSignup' },
      { href: '#/',          key: 'footer.accountOrders' },
      { href: '#/favorites', key: 'footer.accountFav' },
    ]),

    Column('support', [
      { href: '#/about',   key: 'footer.supportAbout' },
      { href: '#/contact', key: 'footer.supportContact' },
      { href: '#/contact', key: 'footer.supportFaq' },
      { href: '#/contact', key: 'footer.supportReturns' },
    ]),
  );
}

function Column(titleKey, links) {
  return h('div', { class: 'vault-footer__col' },
    h('h4', { class: 'vault-footer__col-title' }, i18n.t(titleKey)),
    h('ul', { class: 'vault-footer__col-list' },
      ...links.map(link => h('li', {},
        h('a', {
          class: 'vault-footer__link',
          href: link.href,
        },
          h('span', { class: 'vault-footer__link-dot' }),
          h('span', { class: 'vault-footer__link-text' }, i18n.t(link.key)),
        ),
      )),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Bottom Bar
// ═══════════════════════════════════════════════════════════
function BottomBar() {
  return h('div', { class: 'vault-footer__bottom' },
    h('div', { class: 'container vault-footer__bottom-inner' },
      h('p', { class: 'vault-footer__copyright' }, i18n.t('footer.copyright')),
      h('div', { class: 'vault-footer__legal' },
        h('a', { class: 'vault-footer__legal-link', href: '#' }, i18n.t('footer.terms')),
        h('span', { class: 'vault-footer__legal-dot' }),
        h('a', { class: 'vault-footer__legal-link', href: '#' }, i18n.t('footer.privacy')),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
//  Newsletter wiring
// ═══════════════════════════════════════════════════════════
function wireNewsletter(root) {
  const form = qs('.vault-footer__form', root);
  if (!form) return;

  on(form, 'submit', async (e) => {
    e.preventDefault();
    const input = qs('[data-role="email"]', form);
    const btn   = qs('[data-role="submit"]', form);
    const email = input?.value?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input?.focus();
      input?.classList.add('is-error');
      setTimeout(() => input?.classList.remove('is-error'), 600);
      return;
    }

    btn?.classList.add('is-loading');
    const label = qs('.vault-footer__submit-label', btn);
    if (label) label.textContent = i18n.t('footer.subscribing');

    await new Promise(r => setTimeout(r, 800));

    btn?.classList.remove('is-loading');
    btn?.classList.add('is-success');
    if (label) label.textContent = i18n.t('footer.subscribed');
    input.value = '';

    // ذخیره در localStorage (نمایشی)
    try {
      const list = JSON.parse(localStorage.getItem('ps_newsletter') || '[]');
      if (!list.includes(email)) list.push(email);
      localStorage.setItem('ps_newsletter', JSON.stringify(list));
    } catch {}

    events.emit('toast:show', {
      type: 'success',
      message: i18n.t('footer.subscribed'),
    });

    setTimeout(() => {
      btn?.classList.remove('is-success');
      if (label) label.textContent = i18n.t('footer.subscribe');
    }, 3000);
  });
}