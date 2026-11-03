'use strict';
function openGameGallery(images,index=0,title='Immagini del gioco'){
 const items=(images||[]).map(i=>({full:i.path_full||i.url||i.path_thumbnail,thumb:i.path_thumbnail||i.path_full||i.url})).filter(i=>/^https?:|^file:|^data:image\//.test(i.full||''));
 if(!items.length)return;
 const gallery={items,index:Math.max(0,Math.min(items.length-1,Number(index)||0)),title};
 openPanel(title,()=>galleryMarkup(gallery),true);
 const p=panels.at(-1);p.kind='gallery';p.gallery=gallery;p.init=hydrateGallery;drawPanel();focusGallery();
}
function galleryMarkup(g){const image=g.items[g.index];return `<div class="gallery-scene" style="background-image:url(&quot;${esc(image.full)}&quot;)"></div><div class="gallery-stage"><button class="gallery-arrow" data-gallery-step="-1" aria-label="Immagine precedente">${icon('back')}</button><img class="gallery-image" src="${esc(image.thumb)}" data-gallery-full="${esc(image.full)}" alt="${esc(g.title)} · immagine ${g.index+1} di ${g.items.length}"><button class="gallery-arrow next" data-gallery-step="1" aria-label="Immagine successiva">${icon('back')}</button></div><div class="gallery-bottom"><p aria-live="polite">${g.index+1} / ${g.items.length}</p><div class="gallery-thumbs" aria-label="Miniature">${g.items.map((item,i)=>`<button data-gallery-index="${i}" class="${i===g.index?'active':''}" aria-label="Immagine ${i+1}" aria-current="${i===g.index}"><img src="${esc(item.thumb)}" alt="" loading="lazy"></button>`).join('')}</div></div>`;}
function focusGallery(){const p=panels.at(-1);if(p?.kind!=='gallery')return;const el=$(`[data-gallery-index="${p.gallery.index}"]`);el?.focus({preventScroll:true});el?.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'});paintFocus();}
function galleryStep(delta,index){const p=panels.at(-1);if(p?.kind!=='gallery')return false;const g=p.gallery;g.index=index===undefined?(g.index+delta+g.items.length)%g.items.length:Math.max(0,Math.min(g.items.length-1,index));drawPanel();focusGallery();for(const i of [-1,1]){const preload=new Image();preload.src=g.items[(g.index+i+g.items.length)%g.items.length].full;}return true;}
function navigateGallery(direction){if(panels.at(-1)?.kind!=='gallery')return false;if(direction==='left'||direction==='right')galleryStep(direction==='right'?1:-1);else if(direction==='up')$('#panel .panel-head button')?.focus();else focusGallery();return true;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-gallery-step],[data-gallery-index]');if(!b)return;if(b.dataset.galleryIndex!==undefined)galleryStep(0,Number(b.dataset.galleryIndex));else galleryStep(Number(b.dataset.galleryStep));});

function hydrateGallery(){const el=$('.gallery-image');if(!el)return;const full=el.dataset.galleryFull;if(!full||full===el.src)return;const image=new Image();image.onload=()=>{if(el.isConnected)el.src=full;};image.src=full;}
