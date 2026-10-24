/* Campus Chronicles — soft selection and Lenis scrolling */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lenis supplies the eased, frame-synchronised wheel feel on the page.
  if (!reduce && typeof window.Lenis === 'function') {
    const lenis = new Lenis({
      duration: 1.12,
      easing: t => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.92,
      anchors: true
    });
    window.campusChroniclesLenis = lenis;
    let rafId;
    const raf = time => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);
    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    }, { once: true });
  }

  // Soft, rounded selection pills for page text and text selected inside inputs.
  if (reduce || !window.matchMedia('(pointer: fine)').matches || !document.body) return;
  document.documentElement.classList.add('custom-sel');
  const host = document.createElement('div');
  host.id = 'selfx';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = '<div class="sel-layer"></div>';
  document.body.appendChild(host);
  const layer = host.firstElementChild;
  const SKIP = 'script,style,noscript,textarea,select,pre,code,#selfx,.sbx';
  const TEXTIN = 'input:not([type=checkbox]):not([type=radio]):not([type=password]):not([type=range]):not([type=file]):not([type=button]):not([type=submit]):not([type=color])';
  const twin = document.createElement('div');
  twin.setAttribute('aria-hidden', 'true');
  twin.style.cssText = 'position:fixed;left:0;top:-9999px;visibility:hidden;pointer-events:none;white-space:pre;margin:0;padding:0;border:0;contain:layout style';
  document.body.appendChild(twin);
  const inputLines = () => {
    const input = document.activeElement;
    if (!input?.matches?.(TEXTIN)) return null;
    let start, end;
    try { start = input.selectionStart; end = input.selectionEnd; } catch { return null; }
    if (start == null || end == null || start === end) return [];
    const cs = getComputedStyle(input), rect = input.getBoundingClientRect(), num = key => parseFloat(cs[key]) || 0;
    twin.style.font = cs.font;
    ['letterSpacing','wordSpacing','textTransform','fontVariationSettings','textIndent'].forEach(k => twin.style[k] = cs[k]);
    twin.textContent = input.value || ' ';
    const textNode = twin.firstChild;
    if (!textNode) return [];
    const range = document.createRange();
    range.setStart(textNode, Math.min(start, end));
    range.setEnd(textNode, Math.max(start, end));
    const twinRect = twin.getBoundingClientRect(), selected = range.getBoundingClientRect();
    const leftEdge = rect.left + num('borderLeftWidth') + num('paddingLeft');
    const rightEdge = rect.right - num('borderRightWidth') - num('paddingRight');
    const left = Math.max(leftEdge + selected.left - twinRect.left - input.scrollLeft, leftEdge);
    const right = Math.min(leftEdge + selected.right - twinRect.left - input.scrollLeft, rightEdge);
    if (right - left < 1) return [];
    const topEdge = rect.top + num('borderTopWidth') + num('paddingTop');
    const contentHeight = rect.height - num('borderTopWidth') - num('borderBottomWidth') - num('paddingTop') - num('paddingBottom');
    const height = Math.min(contentHeight, num('fontSize') * 1.3);
    const top = topEdge + (contentHeight - height) / 2;
    return [{ left, right, top, bottom: top + height, input: true }];
  };
  let pills = [], frame = 0, scrollTimer = 0, lastLines = [];
  const mergeLines = rects => {
    rects.sort((a,b) => a.top - b.top || a.left - b.left);
    const merged = [];
    for (const q of rects) {
      const prev = merged[merged.length - 1];
      if (prev && Math.abs(q.top-prev.top)<5 && Math.abs(q.bottom-prev.bottom)<7 && q.left<=prev.right+10) {
        prev.left=Math.min(prev.left,q.left); prev.right=Math.max(prev.right,q.right);
        prev.top=Math.min(prev.top,q.top); prev.bottom=Math.max(prev.bottom,q.bottom);
        prev.card=prev.card&&q.card;
      } else merged.push({left:q.left,right:q.right,top:q.top,bottom:q.bottom,card:q.card});
    }
    return merged;
  };
  const collect = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return [];
    const rects = [], allowed = new Map();
    for (let i=0;i<selection.rangeCount;i++) {
      const range=selection.getRangeAt(i), ancestor=range.commonAncestorContainer;
      const root=ancestor.nodeType===1?ancestor:ancestor.parentNode;
      if (!root) continue;
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      for (let node; (node=walker.nextNode());) {
        if (!node.nodeValue.trim() || !range.intersectsNode(node)) continue;
        const el=node.parentElement; if(!el) continue;
        let ok=allowed.get(el);
        if(ok===undefined){const style=getComputedStyle(el);ok=!el.closest(SKIP)&&style.userSelect!=='none'&&style.visibility!=='hidden'&&style.display!=='none';allowed.set(el,ok);}
        if(!ok) continue;
        const sub=document.createRange();sub.selectNodeContents(node);
        if(node===range.startContainer)sub.setStart(node,range.startOffset);
        if(node===range.endContainer)sub.setEnd(node,range.endOffset);
        const inCard=!!el.closest('.story-row,.story-card,.feature-story,.news-card,.article-reading');
        for(const r of sub.getClientRects()) if(r.width>.5&&r.height>2&&r.bottom>-60&&r.top<innerHeight+60) rects.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom,card:inCard});
      }
    }
    return mergeLines(rects);
  };
  const place=(el,g)=>{el.style.transform=`translate3d(${g.x}px,${g.y}px,0)`;el.style.width=`${g.w}px`;el.style.height=`${g.h}px`;};
  const render=()=>{
    frame=0;
    const lines=inputLines()||collect();lastLines=lines;
    lines.forEach((q,i)=>{
      const g=q.input?{x:q.left-.5,y:q.top,w:Math.max(q.right-q.left+1,4),h:q.bottom-q.top}:{x:q.left-3,y:q.top-1.5,w:q.right-q.left+6,h:q.bottom-q.top+3};
      let p=pills[i];
      if(!p){const el=document.createElement('i'),prev=pills[i-1];layer.appendChild(el);place(el,q.input?g:prev?{x:prev.g.x,y:prev.g.y+prev.g.h*.5,w:Math.min(prev.g.w,38),h:prev.g.h}:{x:g.x,y:g.y,w:Math.min(g.w,22),h:g.h});void el.offsetWidth;p=pills[i]={el,g};}
      p.g=g;p.el.classList.toggle('u',!!q.input);p.el.classList.toggle('c',!!q.card&&!q.input);place(p.el,g);p.el.classList.add('on');
    });
    while(pills.length>lines.length){const p=pills.pop(),prev=pills[pills.length-1];p.el.classList.remove('on');if(prev)place(p.el,{x:prev.g.x,y:prev.g.y+prev.g.h*.5,w:Math.min(prev.g.w,38),h:p.g.h});window.setTimeout(()=>p.el.remove(),280);}
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
  document.addEventListener('selectionchange',schedule);
  ['select','input','keyup','focusin','focusout','scroll','mouseup'].forEach(type=>document.addEventListener(type,e=>{if(e.target?.matches?.(TEXTIN))schedule();},true));
  document.addEventListener('keydown',e=>{if(e.target?.matches?.(TEXTIN))requestAnimationFrame(schedule);},true);
  document.addEventListener('pointermove',e=>{if(e.buttons&&document.activeElement?.matches?.(TEXTIN))schedule();},{passive:true});
  window.addEventListener('scroll',()=>{if(!lastLines.length)return;layer.classList.add('still');clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>layer.classList.remove('still'),120);schedule();},{capture:true,passive:true});
  window.addEventListener('resize',schedule,{passive:true});
})();
