'use strict';
/* Trailers come first, then the screenshots. */
function openGameGallery(images,index=0,title='Immagini del gioco',movies=[]){
 const videos=(movies||[]).filter(m=>/^https:\/\/video\.[a-z]+\.steamstatic\.com\//.test(m?.dash||'')).map(m=>({video:m.dash,name:m.name||'Trailer',full:m.thumb||'',thumb:m.thumb||''}));
 const items=videos.concat((images||[]).map(i=>({full:i.path_full||i.url||i.path_thumbnail,thumb:i.path_thumbnail||i.path_full||i.url})).filter(i=>/^https?:|^file:|^data:image\//.test(i.full||'')));
 if(!items.length)return;
 const gallery={items,index:Math.max(0,Math.min(items.length-1,Number(index)||0)),title};
 openPanel(title,()=>galleryMarkup(gallery),true);
 const p=panels.at(-1);p.kind='gallery';p.gallery=gallery;p.init=hydrateGallery;drawPanel();focusGallery();
}
function galleryMarkup(g){const image=g.items[g.index];return `<div class="gallery-scene" style="background-image:url(&quot;${esc(image.full)}&quot;)"></div><div class="gallery-stage"><button class="gallery-arrow" data-gallery-step="-1" aria-label="Immagine precedente">${icon('back')}</button>${image.video?`<video class="gallery-image gallery-video" data-dash="${esc(image.video)}" ${image.thumb?`poster="${esc(image.thumb)}"`:''} controls autoplay playsinline aria-label="${esc(image.name)}"></video>`:`<img class="gallery-image" src="${esc(image.thumb)}" data-gallery-full="${esc(image.full)}" alt="${esc(g.title)} · immagine ${g.index+1} di ${g.items.length}">`}<button class="gallery-arrow next" data-gallery-step="1" aria-label="Immagine successiva">${icon('back')}</button></div><div class="gallery-bottom"><p aria-live="polite">${g.index+1} / ${g.items.length}</p><div class="gallery-thumbs" aria-label="Miniature">${g.items.map((item,i)=>`<button data-gallery-index="${i}" class="${i===g.index?'active':''}" aria-label="Immagine ${i+1}" aria-current="${i===g.index}">${item.thumb?`<img src="${esc(item.thumb)}" alt="" loading="lazy">`:''}${item.video?`<span class="play-badge">${icon('play')}</span>`:''}</button>`).join('')}</div></div>`;}
function focusGallery(){const p=panels.at(-1);if(p?.kind!=='gallery')return;const el=$(`[data-gallery-index="${p.gallery.index}"]`);el?.focus({preventScroll:true});el?.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'});paintFocus();}
function galleryStep(delta,index){const p=panels.at(-1);if(p?.kind!=='gallery')return false;const g=p.gallery;g.index=index===undefined?(g.index+delta+g.items.length)%g.items.length:Math.max(0,Math.min(g.items.length-1,index));drawPanel();focusGallery();for(const i of [-1,1]){const next=g.items[(g.index+i+g.items.length)%g.items.length];if(next.full&&!next.video){const preload=new Image();preload.src=next.full;}}return true;}
function navigateGallery(direction){if(panels.at(-1)?.kind!=='gallery')return false;if(direction==='left'||direction==='right')galleryStep(direction==='right'?1:-1);else if(direction==='up')$('#panel .panel-head button')?.focus();else focusGallery();return true;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-gallery-step],[data-gallery-index]');if(!b)return;if(b.dataset.galleryIndex!==undefined)galleryStep(0,Number(b.dataset.galleryIndex));else galleryStep(Number(b.dataset.galleryStep));});

/* Steam streams its trailers as MPEG-DASH (fMP4 segments, H.264 and AAC). Nova plays them with Media Source
   Extensions: one video track up to 720p and one audio track, fetched in order and kept about 30 seconds ahead. */
async function playDash(video){
 if(!video||video.dataset.started)return;video.dataset.started='1';
 const fail=()=>{if(!video.isConnected)return;const note=document.createElement('p');note.className='gallery-video-error';note.textContent='Il trailer non si può riprodurre adesso.';video.after(note);};
 try{
  if(!window.MediaSource)throw Error('no MSE');
  const url=new URL(video.dataset.dash),xml=new DOMParser().parseFromString(await (await fetch(url)).text(),'application/xml');
  const seconds=(v=>{const m=String(v||'').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);return m?(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0):0;})(xml.documentElement.getAttribute('mediaPresentationDuration'));
  const sets=[...xml.getElementsByTagName('AdaptationSet')];
  const track=type=>{const set=sets.find(s=>s.getAttribute('contentType')===type);if(!set)return null;const reps=[...set.getElementsByTagName('Representation')].sort((a,b)=>+b.getAttribute('bandwidth')-+a.getAttribute('bandwidth'));const rep=type==='video'?reps.find(r=>+r.getAttribute('height')<=720)||reps.at(-1):reps[0];if(!rep)return null;const t=rep.getElementsByTagName('SegmentTemplate')[0]||set.getElementsByTagName('SegmentTemplate')[0];const id=rep.getAttribute('id'),step=+t.getAttribute('duration')/(+t.getAttribute('timescale')||1),first=+t.getAttribute('startNumber')||1,fill=s=>s.replace(/\$RepresentationID\$/g,id);const mime=`${rep.getAttribute('mimeType')||set.getAttribute('mimeType')}; codecs="${rep.getAttribute('codecs')}"`;if(!MediaSource.isTypeSupported(mime))return null;const media=fill(t.getAttribute('media'));return {mime,step,init:new URL(fill(t.getAttribute('initialization')),url),segment:n=>new URL(media.replace(/\$Number(?:%0(\d+)d)?\$/,(_,w)=>String(n).padStart(+w||0,'0')),url),first,count:Math.ceil(seconds/step)};};
  const tracks=[track('video'),track('audio')].filter(Boolean);if(!tracks.length||!seconds)throw Error('no tracks');
  const source=new MediaSource();video.src=URL.createObjectURL(source);
  await new Promise(r=>source.addEventListener('sourceopen',r,{once:true}));
  const get=async u=>{const r=await fetch(u);if(!r.ok)throw Error('segment '+r.status);return r.arrayBuffer();};
  const append=(sb,buf)=>new Promise((ok,ko)=>{sb.addEventListener('updateend',ok,{once:true});sb.addEventListener('error',ko,{once:true});sb.appendBuffer(buf);});
  source.duration=seconds;
  await Promise.all(tracks.map(async t=>{const sb=source.addSourceBuffer(t.mime);await append(sb,await get(t.init));for(let i=0;i<t.count;i++){while(video.isConnected&&i*t.step-video.currentTime>30)await new Promise(r=>setTimeout(r,500));if(!video.isConnected)return;await append(sb,await get(t.segment(t.first+i)));}}));
  if(video.isConnected&&source.readyState==='open')source.endOfStream();
 }catch(e){fail();}
}
function hydrateGallery(){playDash($('.gallery-video[data-dash]'));const el=$('img.gallery-image');if(!el)return;const full=el.dataset.galleryFull;if(!full||full===el.src)return;const image=new Image();image.onload=()=>{if(el.isConnected)el.src=full;};image.src=full;}
