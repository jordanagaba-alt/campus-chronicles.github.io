/* Campus Chronicles — local-first editorial prototype. No sample articles are bundled. */
(async()=>{
'use strict';
const STORE='campus-chronicles-stories-v2';
const API_BASE=(window.CC_API_BASE||'').replace(/\/$/,'');
const remoteEnabled=!!API_BASE;
const relativeTime=value=>{if(!value)return '';const seconds=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));if(!Number.isFinite(seconds))return '';if(seconds<60)return `${seconds}s ago`;if(seconds<3600)return `${Math.floor(seconds/60)}m ago`;if(seconds<86400)return `${Math.floor(seconds/3600)}h ago`;if(seconds<604800)return `${Math.floor(seconds/86400)}d ago`;return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});};
const adminToken=()=>sessionStorage.getItem('cc-admin-token')||'';
const apiRequest=async(path,options={})=>{const response=await fetch(`${API_BASE}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers||{}),...(adminToken()?{'x-admin-token':adminToken()}:{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;};
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toLocaleDateString('en-CA');
const dateLabel=value=>{if(!value)return '';const d=new Date(value+'T12:00:00');return Number.isNaN(+d)?value:d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});};
const readStories=()=>{try{const data=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(data)?data:[]}catch{return []}};
const writeStories=items=>localStorage.setItem(STORE,JSON.stringify(items));
const allStories=()=>readStories().sort((a,b)=>(b.updatedAt||b.date||'').localeCompare(a.updatedAt||a.date||''));
const published=()=>allStories().filter(s=>s.status==='published');
const readingTime=s=>Math.max(1,Math.ceil((s.body||'').replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length/220));
const slug=()=>`story-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const storyLink=s=>'article.html?id='+encodeURIComponent(s.id);
const arrow='<i data-lucide="arrow-up-right" aria-hidden="true"></i>';
const refreshIcons=()=>{if(window.lucide&&typeof window.lucide.createIcons==='function')window.lucide.createIcons({attrs:{'stroke-width':1.8}});};
const storyRow=s=>`<article class="story-row"><div class="story-row-main"><div class="story-meta"><span class="topic-tag">${esc(s.category||'Story')}</span><span>${esc(s.author||'Campus Chronicles')}</span><time datetime="${esc(s.publishedAt||s.date||'')}" data-published-at="${esc(s.publishedAt||'')}" title="${esc(s.publishedAt?new Date(s.publishedAt).toLocaleString():dateLabel(s.date))}">${s.publishedAt?relativeTime(s.publishedAt):dateLabel(s.date)}</time></div><h3><a href="${storyLink(s)}">${esc(s.title)}</a></h3>${s.excerpt?`<p>${esc(s.excerpt)}</p>`:''}</div><a class="row-arrow" href="${storyLink(s)}" aria-label="Read ${esc(s.title)}">${arrow}</a></article>`;
const emptyState=(title,copy,link='editor.html',cta='Add the first story')=>`<div class="empty-state"><span class="empty-mark" aria-hidden="true"><i data-lucide="book-open"></i></span><h3>${title}</h3><p>${copy}</p><a class="button button-primary" href="${link}"><i data-lucide="plus"></i> ${cta}</a></div>`;
if(remoteEnabled){
 try{
  const remote=await apiRequest('/api/stories');
  const local=readStories().filter(s=>s.status!=='published');
  writeStories([...local,...(Array.isArray(remote.stories)?remote.stories:[])]);
  let remoteSignature=JSON.stringify(remote.stories||[]);
  window.setInterval(async()=>{try{const fresh=await apiRequest('/api/stories');const signature=JSON.stringify(fresh.stories||[]);if(signature!==remoteSignature){remoteSignature=signature;const drafts=readStories().filter(s=>s.status!=='published');writeStories([...drafts,...fresh.stories]);if(['home','archive'].includes(document.body.dataset.page))location.reload();}}catch{}},60000);
  window.setInterval(()=>document.querySelectorAll('time[data-published-at]').forEach(node=>{node.textContent=relativeTime(node.dataset.publishedAt);}),1000);
 }catch(error){console.warn("Campus Chronicles API unavailable; showing this browser cached stories.",error);}
}
const page=document.body.dataset.page;
const header=$('site-header');
if(header)header.outerHTML=`<header class="site-header"><div class="header-inner"><a class="brand" href="index.html" aria-label="Campus Chronicles home"><span class="brand-name">Campus Chronicles<small>Rusinga School · Student publication</small></span></a><nav class="main-nav" aria-label="Main navigation"><a href="index.html" ${page==='home'?'aria-current="page"':''}>Home</a><a href="archive.html" ${page==='archive'?'aria-current="page"':''}>The stories</a><a class="nav-create" href="editor.html"><span><i data-lucide="plus"></i></span> Write a story</a></nav></div></header>`;
const footer=$('site-footer');if(footer)footer.outerHTML=`<footer class="site-footer"><div class="footer-inner"><div class="footer-note"><a class="footer-brand" href="index.html">Campus Chronicles<span>Our generation, according to us.</span></a></div><p>A little corner of campus, kept in words.<br>Made by students, for the people who were there.</p><button type="button" class="footer-link" data-suggest>Leave a little something ${arrow}</button></div></footer>`;
refreshIcons();

if(page==='home'){
 const list=$('home-stories');const stories=published();
 list.innerHTML=stories.length?stories.slice(0,5).map(storyRow).join(''):emptyState('The first page is yours.','There are no published stories yet. Add a piece and start building the collection.');refreshIcons();
}
if(page==='archive'){
 const q=$('q'),cat=$('cat'),ed=$('ed'),results=$('results'),count=$('count');
 const refreshOptions=()=>{const items=published();const categories=[...new Set(items.map(s=>s.category).filter(Boolean))].sort();const editions=[...new Set(items.map(s=>s.edition).filter(Boolean))].sort().reverse();const c=cat.value,e=ed.value;cat.innerHTML='<option value="">All topics</option>'+categories.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');ed.innerHTML='<option value="">All editions</option>'+editions.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');cat.value=c;ed.value=e;};
 const run=()=>{const items=published(),term=q.value.trim().toLowerCase(),c=cat.value,e=ed.value;const matched=items.filter(s=>(!c||s.category===c)&&(!e||s.edition===e)&&(!term||[s.title,s.author,s.excerpt,s.category,s.body].join(' ').replace(/<[^>]*>/g,' ').toLowerCase().includes(term)));count.textContent=`${matched.length} ${matched.length===1?'story':'stories'}`;results.innerHTML=matched.length?matched.map(storyRow).join(''):emptyState(items.length?'No stories match those filters.':'Your archive is ready for its first story.',items.length?'Try another search or clear a filter.':'Published stories will appear here once you add them.','editor.html','Add a story');refreshIcons();};
 refreshOptions();run();[q,cat,ed].forEach(el=>el.addEventListener('input',run));
}
if(page==='article'){
 const id=new URLSearchParams(location.search).get('id'),s=published().find(x=>x.id===id),box=$('article');
 if(!s){box.innerHTML=`<a class="back-link" href="archive.html">← Back to archive</a>${emptyState('This story isn’t available.','It may be a draft or the link may be out of date.','archive.html','Browse the archive')}`;}
 else{document.title=s.title+' | Campus Chronicles';box.innerHTML=`<a class="back-link" href="archive.html">← Back to archive</a><header class="article-header"><div class="story-meta"><span class="topic-tag">${esc(s.category||'Story')}</span><span>${esc(s.edition||'Campus Chronicles')}</span></div><h1>${esc(s.title)}</h1>${s.excerpt?`<p class="article-dek">${esc(s.excerpt)}</p>`:''}<div class="article-byline"><span>Words by <strong>${esc(s.author)}</strong></span><time datetime="${esc(s.publishedAt||s.date||'')}" data-published-at="${esc(s.publishedAt||'')}" title="${esc(s.publishedAt?new Date(s.publishedAt).toLocaleString():dateLabel(s.date))}">${s.publishedAt?relativeTime(s.publishedAt):dateLabel(s.date)}</time><span>${readingTime(s)} min read</span></div></header><div class="article-body">${s.body||''}</div><div class="article-endmark" aria-hidden="true">✳</div>`;
 const more=published().filter(x=>x.id!==s.id).slice(0,3);$('more').innerHTML=more.length?more.map(storyRow).join(''):'';if(!more.length)document.querySelector('.more-stories').hidden=true;refreshIcons();
 }
}
if(page==='editor') initEditor();

function initEditor(){
 const form=$('story-form'),empty=$('empty-editor'),body=$('story-body'),title=$('story-title'),excerpt=$('story-excerpt'),author=$('story-author'),category=$('story-category'),edition=$('story-edition'),date=$('story-date'),statusLabel=$('status-label'),saveState=$('save-state'),setup=$('story-setup');let currentId=null,currentStatus='draft',saveTimer=null,savedRange=null;
 const updateCounts=()=>{const words=(body.innerText||'').trim().split(/\s+/).filter(Boolean).length;const label=`${words} ${words===1?'word':'words'}`;$('word-count').textContent=label;const secondary=$('word-count-secondary');if(secondary)secondary.textContent=label;};
 const state=(text,kind='saved')=>{saveState.className='save-state '+kind;saveState.innerHTML=`<span></span>${esc(text)}`;};
 const renderLibrary=()=>{const items=allStories();$('desk-total').textContent=items.length;const library=$('draft-library');if(!items.length){library.innerHTML='';return;}library.innerHTML=`<div class="library-heading">YOUR STORIES <span>${items.length}</span></div>`+items.map(s=>`<button class="library-story" type="button" data-open-story="${esc(s.id)}"><span class="library-status ${s.status==='published'?'is-published':''}"></span><span class="library-story-copy"><strong>${esc(s.title||'Untitled story')}</strong><small>${s.status==='published'?'Published':'Draft'} · ${esc(s.category||'Uncategorised')}</small></span><span class="library-arrow"><i data-lucide="arrow-up-right"></i></span></button>`).join('');library.querySelectorAll('[data-open-story]').forEach(b=>b.addEventListener('click',()=>openStory(b.dataset.openStory)));refreshIcons();};
 const enterWriting=()=>{document.body.classList.remove('editor-setup-active');setup.hidden=true;empty.hidden=true;form.hidden=false;form.classList.remove('document-enter');void form.offsetWidth;form.classList.add('document-enter');body.focus({preventScroll:true});};
 const blank=()=>{document.body.classList.add('editor-setup-active');currentId=null;currentStatus='draft';form.reset();body.innerHTML='<p></p>';date.value=today();$('font-family').value='Fraunces';$('font-size').value='3';$('delete-story').hidden=true;statusLabel.textContent='NEW DRAFT';$('editor-kicker').textContent='YOUR DOCUMENT';$('editor-heading').textContent='Untitled document';empty.hidden=true;form.hidden=true;setup.hidden=false;$('setup-story-title').value='';$('setup-story-author').value='';$('setup-story-category').value='Reflection';$('setup-story-edition').value='';state('Unsaved draft','unsaved');updateCounts();$('setup-story-title').focus();};
 const continueSetup=(skip=false)=>{if(!skip){title.value=$('setup-story-title').value.trim();author.value=$('setup-story-author').value.trim();category.value=$('setup-story-category').value;edition.value=$('setup-story-edition').value.trim();}window.scrollTo({top:0,left:0,behavior:'instant'});enterWriting();if(title.value.trim())$('editor-heading').textContent=title.value.trim();requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));autosave();};
 $('setup-next').addEventListener('click',()=>continueSetup(false));$('setup-skip').addEventListener('click',()=>continueSetup(true));
 const fill=s=>{document.body.classList.remove('editor-setup-active');currentId=s.id;currentStatus=s.status||'draft';title.value=s.title||'';excerpt.value=s.excerpt||'';author.value=s.author||'';category.value=s.category||'Reflection';if(![...category.options].some(o=>o.value===s.category)){const op=document.createElement('option');op.value=s.category;op.textContent=s.category;category.append(op);category.value=s.category;}edition.value=s.edition||'';date.value=s.date||today();body.innerHTML=s.body||'<p></p>';statusLabel.textContent=s.status==='published'?'PUBLISHED STORY':'SAVED DRAFT';$('editor-kicker').textContent=s.status==='published'?'EDITING A PUBLISHED STORY':'PICK UP WHERE YOU LEFT OFF';$('editor-heading').textContent=s.title||'Untitled story';$('delete-story').hidden=false;empty.hidden=true;form.hidden=false;setup.hidden=true;state('All changes saved');updateCounts();};
 const openStory=id=>{const s=allStories().find(x=>x.id===id);if(s)fill(s);};
 const collect=status=>({id:currentId||slug(),title:title.value.trim(),excerpt:excerpt.value.trim(),author:author.value.trim(),category:category.value,edition:edition.value.trim(),date:date.value||today(),body:body.innerHTML.trim()||'<p></p>',status,updatedAt:new Date().toISOString()});
 const save=async(status,announce=true)=>{if(!title.value.trim()){title.focus();state('Add a title to save','unsaved');return false;}if(!author.value.trim()){author.focus();state('Add a byline to continue','unsaved');return false;}let item=collect(status);currentId=item.id;currentStatus=status;
  if(remoteEnabled&&status==='published'){
   try{let token=adminToken();if(!token){token=window.prompt('Enter the Campus Chronicles publishing key:');if(!token){state('Publishing cancelled','unsaved');return false;}sessionStorage.setItem('cc-admin-token',token);}
    item=await apiRequest('/api/stories',{method:'POST',body:JSON.stringify(item)});
   }catch(error){sessionStorage.removeItem('cc-admin-token');state(error.message||'Could not publish. Check the publishing key and API.','unsaved');return false;}
  }
  const items=allStories();const index=items.findIndex(s=>s.id===item.id);if(index>=0)items[index]=item;else items.push(item);writeStories(items);statusLabel.textContent=status==='published'?'PUBLISHED STORY':'SAVED DRAFT';$('editor-heading').textContent=item.title;state(announce?(status==='published'?(remoteEnabled?'Published for everyone':'Published on this device'):'Draft saved'):'All changes saved');renderLibrary();return true;};
 const autosave=()=>{clearTimeout(saveTimer);state('Changes not saved yet','unsaved');saveTimer=setTimeout(()=>{if(title.value.trim()&&author.value.trim())save(currentStatus,false);},650);};
 $('new-story').addEventListener('click',blank);$('welcome-new').addEventListener('click',blank);$('save-draft').addEventListener('click',()=>save('draft'));
 const publish=async()=>{if(!title.value.trim()||!author.value.trim()||!date.value){state('Add a title, byline and publication date before publishing','unsaved');(!title.value.trim()?title:!author.value.trim()?author:date).focus();return;}if(await save('published')){statusLabel.textContent='PUBLISHED STORY';state(remoteEnabled?'Published for everyone':'Published on this device');}};
 $('publish-story').addEventListener('click',publish);$('publish-bottom').addEventListener('click',publish);
 $('delete-story').addEventListener('click',async()=>{if(!currentId)return;const s=allStories().find(x=>x.id===currentId);if(!s)return;if(!confirm(`Delete “${s.title||'Untitled story'}”${s.status==='published'?' for everyone':' from this browser'}? This cannot be undone.`))return;try{if(remoteEnabled&&s.status==='published'){let token=adminToken();if(!token){token=prompt('Enter the Campus Chronicles publishing key:');if(!token)return;sessionStorage.setItem('cc-admin-token',token);}await apiRequest('/api/stories/'+encodeURIComponent(currentId),{method:'DELETE'});}writeStories(allStories().filter(x=>x.id!==currentId));renderLibrary();form.hidden=true;empty.hidden=false;document.body.classList.add('editor-setup-active');blank();state('Story deleted');}catch(error){sessionStorage.removeItem('cc-admin-token');state(error.message||'Could not delete story','unsaved');}});
 [title,excerpt,author,category,edition,date].forEach(el=>el.addEventListener('input',autosave));body.addEventListener('input',()=>{updateCounts();autosave();});
 document.querySelectorAll('[data-command]').forEach(btn=>btn.addEventListener('mousedown',e=>e.preventDefault()));
 document.querySelectorAll('[data-command]').forEach(btn=>btn.addEventListener('click',()=>{body.focus();const command=btn.dataset.command;document.execCommand(command,false,btn.dataset.value||null);autosave();updateCounts();}));
 $('font-family').addEventListener('change',e=>{body.focus();document.execCommand('fontName',false,e.target.value);autosave();});$('font-size').addEventListener('change',e=>{body.focus();document.execCommand('fontSize',false,e.target.value);autosave();});
 const wrapSelection=(tag,attrs={})=>{const sel=window.getSelection();if(!sel||!sel.rangeCount||sel.isCollapsed)return;const range=sel.getRangeAt(0);if(!body.contains(range.commonAncestorContainer))return;const el=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));try{el.append(range.extractContents());range.insertNode(el);sel.removeAllRanges();const r=document.createRange();r.selectNodeContents(el);sel.addRange(r);}catch{};};
 $('highlight-color').addEventListener('pointerdown',()=>{const sel=window.getSelection();if(sel&&sel.rangeCount&&body.contains(sel.anchorNode))savedRange=sel.getRangeAt(0).cloneRange();});$('highlight-color').addEventListener('input',e=>{const color=e.target.value;if(savedRange){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(savedRange);wrapSelection('mark',{'data-ink-highlight':'true','style':`--mark-color:${color};`});savedRange=null;}autosave();});
 $('remove-highlight').addEventListener('click',()=>{body.querySelectorAll('mark[data-ink-highlight]').forEach(mark=>{const parent=mark.parentNode;while(mark.firstChild)parent.insertBefore(mark.firstChild,mark);parent.removeChild(mark);});body.focus();autosave();});
 body.addEventListener('paste',e=>{e.preventDefault();const text=(e.clipboardData||window.clipboardData).getData('text/plain');document.execCommand('insertText',false,text);});
 renderLibrary();refreshIcons();const params=new URLSearchParams(location.search),editId=params.get('id');if(editId)openStory(editId);else blank();
}
})();
