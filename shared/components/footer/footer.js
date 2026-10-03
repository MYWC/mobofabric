import { h, qs } from '../../../core/dom.js';
import { events } from '../../../core/events.js';
import { i18n } from '../../../core/i18n.js';
import { footerLang } from './footer.lang.js';

export function Footer() {
  i18n.register('footer', footerLang);

  const el = h('footer', { class: 'footer' },
    h('div', { class: 'container footer__inner' },

      h('div', { class: 'footer__brand' },
        h('h4', {}, 'Phone Store'),
        h('p', { 'data-i18n': 'footer.tagline' }, i18n.t('footer.tagline')),
      ),

      h('div', { class: 'footer__cols' },
        h('div', { class: 'footer__col' },
          h('h5', { 'data-i18n': 'footer.shop' }, i18n.t('footer.shop')),
          h('a', { href: '#/products', 'data-i18n': 'footer.products' }, i18n.t('footer.products')),
          h('a', { href: '#/brands',   'data-i18n': 'footer.brands'   }, i18n.t('footer.brands')),
          h('a', { href: '#/cart',     'data-i18n': 'footer.cart'     }, i18n.t('footer.cart')),
        ),
        h('div', { class: 'footer__col' },
          h('h5', {}, '—'),
          h('a', { href: '#/about',   'data-i18n': 'footer.about'   }, i18n.t('footer.about')),
          h('a', { href: '#/contact', 'data-i18n': 'footer.contact' }, i18n.t('footer.contact')),
        ),
      ),

      h('div', { class: 'footer__bottom' },
        h('p', { 'data-i18n': 'footer.rights' }, i18n.t('footer.rights')),
      ),
    ),
  );

  // زبان که عوض شد، متن‌ها را دوباره بنویس
  events.on('lang:changed', () => i18n.applyToDOM(el));

  return el;
}