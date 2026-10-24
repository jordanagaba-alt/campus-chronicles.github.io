from pathlib import Path
p=Path('/tmp/cc/app.js')
s=p.read_text()
s=s.replace("(()=>{\n'use strict';", "(async()=>{\n'use strict';")
s=s.replace("const STORE='campus-chronicles-stories-v2';", "const STORE='campus-chronicles-stories-v2';\nconst API_BASE=(window.CC_API_BASE||'').replace(/\\/$/,'');\nconst remoteEnabled=!!API_BASE;\nconst relativeTime=value=>{if(!value)return '';const seconds=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));if(!Number.isFinite(seconds))return '';if(seconds<60)return `${seconds}s ago`;if(seconds<3600)return `${Math.floor(seconds/60)}m ago`;if(seconds<86400)return `${Math.floor(seconds/3600)}h ago`;if(seconds<604800)return `${Math.floor(seconds/86400)}d ago`;return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});};\nconst adminToken=()=>sessionStorage.getItem('cc-admin-token')||'';\nconst apiRequest=async(path,options={})=>{const response=await fetch(`${API_BASE}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers||{}),...(adminToken()?{'x-admin-token':adminToken()}:{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;};")
s=s.replace("const storyRow=s=>`<article class=\"story-row\"><div class=\"story-row-main\"><div class=\"story-meta\"><span class=\"topic-tag\">${esc(s.category||'Story')}</span><span>${esc(s.author||'Campus Chronicles')}</span><span>${dateLabel(s.date)}</span></div>", "const storyRow=s=>`<article class=\"story-row\"><div class=\"story-row-main\"><div class=\"story-meta\"><span class=\"topic-tag\">${esc(s.category||'Story')}</span><span>${esc(s.author||'Campus Chronicles')}</span><time datetime=\"${esc(s.publishedAt||s.date||'')}\" title=\"${esc(s.publishedAt?new Date(s.publishedAt).toLocaleString():dateLabel(s.date))}\">${s.publishedAt?relativeTime(s.publishedAt):dateLabel(s.date)}</time></div>")
# bootstrap remote stories before page rendering
needle="const page=document.body.dataset.page;"
insert="""if(remoteEnabled){
 try{
  const remote=await apiRequest('/api/stories');
  const local=readStories().filter(s=>s.status!=='published');
  writeStories([...local,...(Array.isArray(remote.stories)?remote.stories:[])]);
  window.setInterval(async()=>{try{const fresh=await apiRequest('/api/stories');const drafts=readStories().filter(s=>s.status!=='published');writeStories([...drafts,...fresh.stories]);if(['home','archive'].includes(document.body.dataset.page))location.reload();}catch{}},60000);
 }catch(error){console.warn('Campus Chronicles API unavailable; showing this browser\'s cached stories.',error);}
}
const page=document.body.dataset.page;"""
s=s.replace(needle,insert)
# article relative timestamp
s=s.replace("<span>${dateLabel(s.date)}</span><span>${readingTime(s)} min read", "<time datetime=\"${esc(s.publishedAt||s.date||'')}\" title=\"${esc(s.publishedAt?new Date(s.publishedAt).toLocaleString():dateLabel(s.date))}\">${s.publishedAt?relativeTime(s.publishedAt):dateLabel(s.date)}</time><span>${readingTime(s)} min read")
# replace save function with async and remote publishing
old="""const save=(status,announce=true)=>{if(!title.value.trim()){title.focus();state('Add a title to save','unsaved');return false;}if(!author.value.trim()){author.focus();state('Add a byline to continue','unsaved');return false;}const item=collect(status);currentId=item.id;currentStatus=status;const items=allStories();const index=items.findIndex(s=>s.id===item.id);if(index>=0)items[index]=item;else items.push(item);writeStories(items);statusLabel.textContent=status==='published'?'PUBLISHED STORY':'SAVED DRAFT';$('editor-heading').textContent=item.title;state(announce?(status==='published'?'Published on this device':'Draft saved'):'All changes saved');renderLibrary();return true;};"""
new="""const save=async(status,announce=true)=>{if(!title.value.trim()){title.focus();state('Add a title to save','unsaved');return false;}if(!author.value.trim()){author.focus();state('Add a byline to continue','unsaved');return false;}let item=collect(status);currentId=item.id;currentStatus=status;
  if(remoteEnabled&&status==='published'){
   try{let token=adminToken();if(!token){token=window.prompt('Enter the Campus Chronicles publishing key:');if(!token){state('Publishing cancelled','unsaved');return false;}sessionStorage.setItem('cc-admin-token',token);}
    item=await apiRequest('/api/stories',{method:'POST',body:JSON.stringify(item)});
   }catch(error){sessionStorage.removeItem('cc-admin-token');state(error.message||'Could not publish. Check the publishing key and API.','unsaved');return false;}
  }
  const items=allStories();const index=items.findIndex(s=>s.id===item.id);if(index>=0)items[index]=item;else items.push(item);writeStories(items);statusLabel.textContent=status==='published'?'PUBLISHED STORY':'SAVED DRAFT';$('editor-heading').textContent=item.title;state(announce?(status==='published'?(remoteEnabled?'Published for everyone':'Published on this device'):'Draft saved'):'All changes saved');renderLibrary();return true;};"""
if old not in s: print('save pattern missing')
s=s.replace(old,new)
s=s.replace("const publish=()=>{if(!title.value.trim()||!author.value.trim()){state('Add a title and byline first','unsaved');(!title.value.trim()?title:author).focus();return;}if(save('published')){statusLabel.textContent='PUBLISHED STORY';state('Published on this device');}};", "const publish=async()=>{if(!title.value.trim()||!author.value.trim()){state('Add a title and byline first','unsaved');(!title.value.trim()?title:author).focus();return;}if(await save('published')){statusLabel.textContent='PUBLISHED STORY';state(remoteEnabled?'Published for everyone':'Published on this device');}};")
# prevent autosave accidentally replacing remote published story as draft; async calls fine
# update delete event async for remote
old="""$('delete-story').addEventListener('click',()=>{if(!currentId)return;const s=allStories().find(x=>x.id===currentId);if(!s)return;if(!confirm(`Delete “${s.title||'Untitled story'}” from this browser? This cannot be undone.`))return;writeStories(allStories().filter(x=>x.id!==currentId));renderLibrary();form.hidden=true;empty.hidden=false;state('Story deleted');});"""
new="""$('delete-story').addEventListener('click',async()=>{if(!currentId)return;const s=allStories().find(x=>x.id===currentId);if(!s)return;if(!confirm(`Delete “${s.title||'Untitled story'}”${s.status==='published'?' for everyone':' from this browser'}? This cannot be undone.`))return;try{if(remoteEnabled&&s.status==='published'){let token=adminToken();if(!token){token=prompt('Enter the Campus Chronicles publishing key:');if(!token)return;sessionStorage.setItem('cc-admin-token',token);}await apiRequest('/api/stories/'+encodeURIComponent(currentId),{method:'DELETE'});}writeStories(allStories().filter(x=>x.id!==currentId));renderLibrary();form.hidden=true;empty.hidden=false;state('Story deleted');}catch(error){sessionStorage.removeItem('cc-admin-token');state(error.message||'Could not delete story','unsaved');}});"""
if old not in s: print('delete pattern missing')
s=s.replace(old,new)
p.write_text(s)
