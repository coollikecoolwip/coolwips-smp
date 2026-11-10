/* Lightweight decorative motion; honors users' reduced-motion preferences. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const items = [...document.querySelectorAll('.section-head, .feature, .staff-card, .join-card, .rule-group, .faq details, .closing .wrap')];
    const observer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending');
          entry.target.classList.add('reveal-in');
          obs.unobserve(entry.target);
        }
      }
    }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
    for (const item of items) {
      const bounds = item.getBoundingClientRect();
      if (bounds.top > window.innerHeight - 25) {
        item.classList.add('reveal-pending');
        observer.observe(item);
      }
    }
  }
  const progress = document.querySelector('.scroll-progress');
  if (progress) {
    let scheduled = false;
    const update = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
      progress.style.width = (100 * scrollY / maxScroll).toFixed(2) + '%';
      scheduled = false;
    };
    addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    }, { passive:true });
    addEventListener('resize', update, { passive:true });
    update();
  }
})();
