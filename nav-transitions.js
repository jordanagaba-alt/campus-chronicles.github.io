/* A restrained editorial page transition: the next page unfolds from a narrow paper edge. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) || url.pathname === location.pathname && url.search === location.search) return;
    if (document.startViewTransition && CSS.supports('view-transition-name: root')) return; // Native cross-document transition handles navigation.
    event.preventDefault();
    document.documentElement.classList.add('page-leaving');
    window.setTimeout(() => { location.href = url.href; }, 300);
  });
})();
