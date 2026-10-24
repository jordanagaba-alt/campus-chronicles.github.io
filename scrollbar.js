/* Campus Chronicles custom corner-hugging scrollbar. Native wheel, keyboard and touch scrolling remain intact. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  document.documentElement.classList.add('cc-custom-scroll');
  const host = document.createElement('div');
  host.className = 'cc-scrollbar'; host.setAttribute('aria-hidden', 'true');
  host.innerHTML = '<svg><path class="rail"></path><path class="outline"></path><path class="thumb"></path><path class="hit"></path></svg>';
  document.body.appendChild(host);
  const rail = host.querySelector('.rail'), outline = host.querySelector('.outline'), thumb = host.querySelector('.thumb'), hit = host.querySelector('.hit');
  // Keep the biscuit cursor while holding common draggable elements/handles too.
  const dragTargets = '[draggable="true"], [data-drag-handle], .drag-handle, .sortable-handle';
  document.addEventListener('pointerdown', e => {
    if (e.target instanceof Element && e.target.closest(dragTargets) && !e.target.closest('.cc-scrollbar')) {
      document.documentElement.classList.add('cc-cookie-grabbing');
    }
  }, true);
  const releaseCookieCursor = () => document.documentElement.classList.remove('cc-cookie-grabbing');
  document.addEventListener('pointerup', releaseCookieCursor, true);
  document.addEventListener('pointercancel', releaseCookieCursor, true);
  window.addEventListener('blur', releaseCookieCursor);
  let geom = {}, hideTimer = 0, dragging = false;
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  function layout() {
    const w = innerWidth, h = innerHeight;
    // Keep the rail almost entirely on the right edge. Only the top and bottom
    // corners bend inward by about a centimetre; no long loop around the nav.
    const x = w - 12, y = 12, bottom = h - 12, bend = 12;
    const d = `M ${x-bend} ${y} Q ${x} ${y} ${x} ${y+bend} L ${x} ${bottom-bend} Q ${x} ${bottom} ${x-bend} ${bottom}`;
    [rail,outline,thumb,hit].forEach(p=>p.setAttribute('d',d));
    const len = rail.getTotalLength(), view = Math.max(34, len * innerHeight / document.documentElement.scrollHeight);
    geom = {len, view, max: maxScroll()};
    thumb.style.strokeDasharray = `${view} ${len}`;
    draw();
  }
  function draw(){ if(!geom.len)return; const progress = Math.min(1, Math.max(0, scrollY / maxScroll())); const offset = -(geom.len-geom.view)*progress; thumb.style.strokeDashoffset = offset; outline.style.strokeDasharray = `${geom.view} ${geom.len}`; outline.style.strokeDashoffset = offset; }
  function show(){host.classList.add('active');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!dragging&&!host.matches(':hover'))host.classList.remove('active')},850)}
  const seek = e => { const y=Math.min(innerHeight-12,Math.max(12,e.clientY)); const ratio=(y-12)/Math.max(1,innerHeight-24); window.scrollTo(0,ratio*maxScroll()); };
  hit.addEventListener('pointerdown',e=>{dragging=true;host.classList.add('dragging','active');document.documentElement.classList.add('cc-cookie-grabbing');hit.setPointerCapture(e.pointerId);seek(e);e.preventDefault()});
  hit.addEventListener('pointermove',e=>{if(dragging)seek(e)});
  const end=()=>{dragging=false;host.classList.remove('dragging');document.documentElement.classList.remove('cc-cookie-grabbing');show()};hit.addEventListener('pointerup',end);hit.addEventListener('pointercancel',end);
  host.addEventListener('pointerenter',()=>{host.classList.add('hover','active');clearTimeout(hideTimer)});host.addEventListener('pointerleave',()=>{host.classList.remove('hover');show()});
  addEventListener('scroll',()=>{draw();show()},{passive:true});addEventListener('resize',layout,{passive:true});
  if('ResizeObserver'in window)new ResizeObserver(layout).observe(document.documentElement);
  layout();
})();
