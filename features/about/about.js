import { h, qs, render } from '../../core/dom.js';
import { events } from '../../core/events.js';
import { i18n } from '../../core/i18n.js';
import { router } from '../../core/router.js';
import { icons } from '../../shared/icons/icons.js';
import { aboutLang } from './about.lang.js';

// ═══════════════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════════════
const state = {
  container: null,
};

let offLang = null;

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════
export const about = {
  register() {
    i18n.register('about', aboutLang);

    router.register('/about', () => showPage());

    offLang = events.on('lang:changed', () => {
      if (state.container) renderPage();
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════
function showPage() {
  state.container = qs('#app');
  renderPage();
}

function renderPage() {
  if (!state.container) return;

  const page = h('div', { class: 'about-page' },
    Hero(),
    Mission(),
    Stats(),
    Values(),
    Story(),
    Team(),
    Cta(),
  );

  render(state.container, page);
}

// ═══════════════════════════════════════════════════════════
//  Sections
// ═══════════════════════════════════════════════════════════
function Hero() {
  return h('section', { class: 'about-hero' },
    h('div', { class: 'container about-hero__inner' },
      h('span', { class: 'about-hero__eyebrow' }, 'PHONE STORE'),
      h('h1', { class: 'about-hero__title' }, i18n.t('about.heroTitle')),
      h('p',  { class: 'about-hero__subtitle' }, i18n.t('about.heroSubtitle')),
    ),
  );
}

function Mission() {
  return h('section', { class: 'about-section about-section--mission' },
    h('div', { class: 'container about-mission' },
      h('div', { class: 'about-mission__content' },
        h('h2', { class: 'about-section__title' }, i18n.t('about.missionTitle')),
        h('p',  { class: 'about-mission__text' }, i18n.t('about.missionText')),
      ),
      h('div', { class: 'about-mission__visual', 'aria-hidden': 'true' },
        h('div', { class: 'about-mission__phone', innerHTML: icons.logo }),
      ),
    ),
  );
}

function Stats() {
  const stats = [
    { num: 'about.stat1Num', label: 'about.stat1Label' },
    { num: 'about.stat2Num', label: 'about.stat2Label' },
    { num: 'about.stat3Num', label: 'about.stat3Label' },
    { num: 'about.stat4Num', label: 'about.stat4Label' },
  ];

  return h('section', { class: 'about-section about-section--stats' },
    h('div', { class: 'container' },
      h('h2', { class: 'about-section__title about-section__title--center' },
        i18n.t('about.statsTitle')),
      h('div', { class: 'about-stats' },
        ...stats.map(s => h('div', { class: 'about-stats__item' },
          h('div', { class: 'about-stats__num' },   i18n.t(s.num)),
          h('div', { class: 'about-stats__label' }, i18n.t(s.label)),
        )),
      ),
    ),
  );
}

function Values() {
  const values = [
    { icon: icons.check, title: 'about.value1Title', text: 'about.value1Text' },
    { icon: icons.check, title: 'about.value2Title', text: 'about.value2Text' },
    { icon: icons.check, title: 'about.value3Title', text: 'about.value3Text' },
    { icon: icons.check, title: 'about.value4Title', text: 'about.value4Text' },
  ];

  return h('section', { class: 'about-section about-section--values' },
    h('div', { class: 'container' },
      h('header', { class: 'about-section__header' },
        h('h2', { class: 'about-section__title' },  i18n.t('about.valuesTitle')),
        h('p',  { class: 'about-section__subtitle' }, i18n.t('about.valuesSub')),
      ),
      h('div', { class: 'about-values' },
        ...values.map(v => h('article', { class: 'about-value' },
          h('div', { class: 'about-value__icon', innerHTML: v.icon }),
          h('h3', { class: 'about-value__title' }, i18n.t(v.title)),
          h('p',  { class: 'about-value__text' },  i18n.t(v.text)),
        )),
      ),
    ),
  );
}

function Story() {
  return h('section', { class: 'about-section about-section--story' },
    h('div', { class: 'container about-story' },
      h('div', { class: 'about-story__content' },
        h('h2', { class: 'about-section__title' }, i18n.t('about.storyTitle')),
        h('p', { class: 'about-story__p' }, i18n.t('about.storyP1')),
        h('p', { class: 'about-story__p' }, i18n.t('about.storyP2')),
        h('p', { class: 'about-story__p' }, i18n.t('about.storyP3')),
      ),
      h('div', { class: 'about-story__visual', 'aria-hidden': 'true' },
        h('div', { class: 'about-story__badge' }, '2019'),
      ),
    ),
  );
}

function Team() {
  const members = [
    { name: 'about.team1Name', role: 'about.team1Role', initial: 'A' },
    { name: 'about.team2Name', role: 'about.team2Role', initial: 'S' },
    { name: 'about.team3Name', role: 'about.team3Role', initial: 'R' },
    { name: 'about.team4Name', role: 'about.team4Role', initial: 'M' },
  ];

  return h('section', { class: 'about-section about-section--team' },
    h('div', { class: 'container' },
      h('header', { class: 'about-section__header' },
        h('h2', { class: 'about-section__title' },    i18n.t('about.teamTitle')),
        h('p',  { class: 'about-section__subtitle' }, i18n.t('about.teamSub')),
      ),
      h('div', { class: 'about-team' },
        ...members.map(m => h('article', { class: 'about-team__member' },
          h('div', { class: 'about-team__avatar', 'aria-hidden': 'true' }, m.initial),
          h('h3', { class: 'about-team__name' }, i18n.t(m.name)),
          h('p',  { class: 'about-team__role' }, i18n.t(m.role)),
        )),
      ),
    ),
  );
}

function Cta() {
  return h('section', { class: 'about-section about-section--cta' },
    h('div', { class: 'container' },
      h('div', { class: 'about-cta' },
        h('h2', { class: 'about-cta__title' }, i18n.t('about.ctaTitle')),
        h('p',  { class: 'about-cta__text' },  i18n.t('about.ctaText')),
        h('div', { class: 'about-cta__actions' },
          h('a', { class: 'btn btn--accent about-cta__btn', href: '#/products' },
            i18n.t('about.ctaButton')),
          h('a', { class: 'btn btn--ghost about-cta__btn', href: '#/contact' },
            i18n.t('about.ctaSecondary')),
        ),
      ),
    ),
  );
}