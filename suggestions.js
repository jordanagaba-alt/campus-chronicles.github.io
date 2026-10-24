/* Campus Chronicles — "Make a suggestion" sticky-note board */
(() => {
  'use strict';
  const API = (window.CC_API_BASE || '').replace(/\/$/, '');
  const MAX = 6, COLORS = ['#f7e08a', '#f7c4a0', '#cfdcae', '#b9d6e3', '#f2b8c0', '#d4c5ea'];
  const LS = { id: 'cc-sugg-author', map: 'cc-sugg-colors', local: 'cc-sugg-local', name: 'cc-sugg-name' };
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let me = get(LS.id, null); if (!me) { me = (crypto.randomUUID?.() || String(Math.random()).slice(2)); set(LS.id, me); }

  // Colours are chosen per viewer: the same person looks different on every screen.
  const colorMap = get(LS.map, null) || { _start: Math.floor(Math.random() * COLORS.length) };
  const baseFor = id => {
    if (colorMap[id] == null) { colorMap[id] = (colorMap._start + Object.keys(colorMap).length - 1) % COLORS.length; set(LS.map, colorMap); }
    return colorMap[id];
  };
  const tilt = i => [-1.4, .9, -.6, 1.3, -1, .5][i % 6];

  let overlay, ta = [], opener, board;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'sg-overlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'sg-title');
    overlay.innerHTML = `<div class="sg-board"><button class="sg-close" type="button" aria-label="Close">×</button>
      <header class="sg-head"><p class="eyebrow">Leave a little something</p><h2 id="sg-title">Make a suggestion</h2></header>
      <div class="sg-scroll" data-lenis-prevent>
        <section class="sg-compose"><div class="sg-chain" id="sg-chain"></div>
          <div class="sg-controls"><input id="sg-name" maxlength="30" placeholder="Sign it (optional)" aria-label="Your name, optional"><span class="sg-count" id="sg-count"></span><button class="button button-primary" id="sg-send" type="button">Stick it on the board</button></div>
          <p class="sg-msg" id="sg-msg" role="status"></p></section>
        <section class="sg-wall" id="sg-wall" aria-live="polite"></section></div></div>`;
    document.body.appendChild(overlay);
    board = overlay.querySelector('#sg-wall');
    overlay.querySelector('#sg-name').value = get(LS.name, '');
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.sg-close').onclick = close;
    overlay.querySelector('#sg-send').onclick = send;
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  const over = t => t.scrollHeight > t.clientHeight + 1;
  function addNote(i) {
    const wrap = document.createElement('div'); wrap.className = 'sg-note sg-new';
    wrap.style.setProperty('--c', COLORS[(baseFor(me) + i) % COLORS.length]); wrap.style.setProperty('--r', tilt(i) + 'deg');
    const t = document.createElement('textarea'); t.setAttribute('aria-label', `Sticky note ${i + 1}`); t.placeholder = i ? '' : 'Write your suggestion…';
    wrap.appendChild(t); overlay.querySelector('#sg-chain').appendChild(wrap);
    t.addEventListener('input', () => onInput(ta.indexOf(t))); t.addEventListener('keydown', e => onKey(e, ta.indexOf(t)));
    ta[i] = t; return t;
  }
  const ensure = i => ta[i] || addNote(i);
  function focusAt(i, pos) { const t = ta[i]; if (!t) return; t.focus(); const p = pos < 0 ? t.value.length : pos; t.setSelectionRange(p, p); }

  function reflow(i, caret) {
    const t = ta[i], text = t.value;
    if (!over(t)) return { note: i, caret };
    let lo = 0, hi = text.length;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; t.value = text.slice(0, mid); if (over(t)) hi = mid - 1; else lo = mid; }
    let cut = lo;
    if (cut < text.length && !/\s/.test(text[cut])) { const sp = text.slice(0, cut).search(/\s\S*$/); if (sp > 0) cut = sp + 1; }
    const rest0 = text.slice(cut), rest = rest0.replace(/^\s+/, ''), trimmed = rest0.length - rest.length;
    t.value = text.slice(0, cut);
    if (i + 1 >= MAX) return { note: i, caret: Math.min(caret, cut) };
    const nx = ensure(i + 1), tail = nx.value;
    nx.value = rest + (tail ? (/\s$/.test(rest) ? '' : ' ') + tail : '');
    if (caret > cut) { const d = reflow(i + 1, Math.max(0, caret - cut - trimmed)); return d; }
    reflow(i + 1, 0); return { note: i, caret };
  }
  function onInput(i) {
    const t = ta[i], r = reflow(i, t.selectionStart);
    if (r.note !== i || r.caret !== t.selectionStart) focusAt(r.note, r.caret);
    for (let k = ta.length - 1; k > 0 && !ta[k].value && ta[k] !== document.activeElement; k--) { ta[k].parentNode.remove(); ta.pop(); }
    count();
  }
  function onKey(e, i) {
    const t = ta[i], a = t.selectionStart, b = t.selectionEnd, end = t.value.length;
    if (e.key === 'Backspace' && i > 0 && a === 0 && b === 0) { e.preventDefault(); const len = ta[i - 1].value.length; if (!t.value) { t.parentNode.remove(); ta.splice(i, 1); } focusAt(i - 1, len); count(); }
    else if (e.key === 'ArrowLeft' && i > 0 && a === 0 && b === 0) { e.preventDefault(); focusAt(i - 1, -1); }
    else if ((e.key === 'ArrowRight' || e.key === 'Delete') && ta[i + 1] && a === end && b === end && e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1, 0); }
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
  }
  function count() { const n = ta.filter(t => t.value.trim()).length; overlay.querySelector('#sg-count').textContent = ta.length >= MAX && over(ta[MAX - 1]) ? 'Board full — trim a little' : `${n || 1} of ${MAX} notes`; }

  function say(m, bad) { const el = overlay.querySelector('#sg-msg'); el.textContent = m; el.classList.toggle('bad', !!bad); }
  async function send() {
    const segments = ta.map(t => t.value.trim()).filter(Boolean);
    if (!segments.length) { say('Write something on the note first.', true); ta[0].focus(); return; }
    const name = overlay.querySelector('#sg-name').value.trim(); set(LS.name, name);
    const item = { id: 'l' + Date.now(), authorId: me, name, segments, createdAt: new Date().toISOString() };
    const btn = overlay.querySelector('#sg-send'); btn.disabled = true;
    try {
      if (API) { const r = await fetch(API + '/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authorId: me, name, segments }) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Could not send that.'); }
      else set(LS.local, [...get(LS.local, []), item].slice(-100));
      overlay.querySelector('#sg-chain').innerHTML = ''; ta = []; addNote(0); count(); say('Stuck on the board. Thank you!'); await load(true);
    } catch (err) { say(err.message, true); } finally { btn.disabled = false; }
  }

  async function load(scrollTop) {
    let list = [];
    try { list = API ? (await (await fetch(API + '/api/suggestions', { cache: 'no-store' })).json()).suggestions || [] : get(LS.local, []); } catch { list = get(LS.local, []); }
    list = list.slice().reverse();
    board.innerHTML = list.length ? list.map(s => {
      const base = baseFor(s.authorId);
      return `<article class="sg-item"><div class="sg-chain sg-chain-static">${s.segments.map((t, i) => `<div class="sg-note" style="--c:${COLORS[(base + i) % COLORS.length]};--r:${tilt(i)}deg"><p>${esc(t)}</p></div>`).join('')}</div><p class="sg-by">${s.authorId === me ? 'You' : esc(s.name || 'Someone')}</p></article>`;
    }).join('') : '<p class="sg-empty">Nothing here yet — be the first to leave a little something.</p>';
    if (scrollTop) overlay.querySelector('.sg-scroll').scrollTo({ top: 0, behavior: 'smooth' });
  }

  function open() {
    if (!overlay) build();
    opener = document.activeElement; document.documentElement.classList.add('sg-open'); window.campusChroniclesLenis?.stop();
    if (!ta.length) addNote(0); count(); say(''); overlay.classList.add('on'); load();
    setTimeout(() => ta[0]?.focus(), 60);
  }
  function close() { overlay.classList.remove('on'); document.documentElement.classList.remove('sg-open'); window.campusChroniclesLenis?.start(); opener?.focus?.(); }
  document.addEventListener('click', e => { const b = e.target.closest('[data-suggest]'); if (b) { e.preventDefault(); open(); } });
})();
