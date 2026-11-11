/* Navigation progressive enhancement for the CoolWips SMP Player Hub. */
(() => {
  'use strict';
  const select = document.getElementById('hub-section-select');
  const validSections = new Set(['status','join','leaderboards','market','players','reports','staff','updates']);
  const titles = {
    status:'Server status',
    join:'How to join',
    leaderboards:'Leaderboards',
    market:'Economy market',
    players:'Player profiles',
    reports:'Reports and appeals',
    staff:'Staff dashboard',
    updates:'News and events'
  };
  const activeSection = () => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    return validSections.has(id) ? id : 'status';
  };
  const sync = () => {
    const tab = activeSection();
    if (select) select.value = tab;
    document.body.classList.toggle('hub-detail-view', tab !== 'status');
    document.title = titles[tab] + ' | CoolWips SMP Player Hub';
  };
  if (select) select.addEventListener('change', () => {
    const tab = select.value;
    if (validSections.has(tab)) location.hash = tab;
  });
  window.addEventListener('hashchange', () => {
    sync();
    // Every tool starts from its own title instead of retaining the scroll
    // position of a previously selected view.
    requestAnimationFrame(() => window.scrollTo({top:0,behavior:'instant'}));
  });
  sync();
})();