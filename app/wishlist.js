'use strict';
let wishlistQuery='',wishlistFilter='all';
function wishlistState(g,now=Date.now()){if(g.comingSoon===true||Number(g.releaseTimestamp)*1000>now)return 'upcoming';if(g.comingSoon===false||Number(g.releaseTimestamp)>0&&Number(g.releaseTimestamp)*1000<=now)return 'released';return 'unknown';}
function wishlistItems(){const items=[...new Map([...(exploreData?.wishlist?.items||[]),...(shopWishlist||[])].map(g=>[g.steamId||g.id,g])).values()];const query=wishlistQuery.trim().toLocaleLowerCase('it');return items.filter(g=>(!query||g.title.toLocaleLowerCase('it').includes(query))&&(wishlistFilter==='all'||wishlistState(g)===wishlistFilter));}
function wishlistMarkup(){const items=wishlistItems();return `<section class="shop-section"><div class="wishlist-heading"><h2>Lista dei desideri</h2><span>${items.length} giochi</span></div><div class="library-tools wishlist-tools"><div class="search">${icon('search')}<input id="wishlist-search" type="search" placeholder="Cerca un gioco…" aria-label="Cerca nella lista dei desideri" value="${esc(wishlistQuery)}"><button class="action square" data-wishlist-keyboard aria-label="Apri tastiera">${icon('keyboard')}</button></div>${libraryFilterButton('wishlist','Mostra',({all:'Tutti i giochi',released:'Già usciti',upcoming:'In arrivo'})[wishlistFilter])}</div><div class="shop-wishlist-grid">${items.map(g=>shopCard(g,{wishlistCountdown:true})).join('')}</div>${!items.length?'<p class="note">Nessun gioco corrisponde alla ricerca.</p>':''}${exploreData?.wishlist?.error?`<p class="note">${esc(exploreData.wishlist.error)}</p>`:''}<p class="note">Steam e Nova · le stelle aggiunte qui sono salvate nel tuo profilo Nova.</p></section>`;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-wishlist-filter]');if(!b)return;wishlistFilter=b.dataset.wishlistFilter;render(true);$(`[data-wishlist-filter="${wishlistFilter}"]`)?.focus({preventScroll:true});});
document.addEventListener('input',e=>{if(e.target.id!=='wishlist-search')return;wishlistQuery=e.target.value;const start=e.target.selectionStart;render(true);const input=$('#wishlist-search');input?.focus({preventScroll:true});try{input?.setSelectionRange(start,start)}catch{}});


// One timer per visible card/detail, updated without rerendering buttons.
function releaseTimerData(g,now=Date.now()){
 const target=Number(g.releaseTimestamp)*1000;
 if(wishlistState(g,now)!=='upcoming'||!Number.isFinite(target)||target<=0||g.releasePrecision&&g.releasePrecision!=='date_full')return null;
 const total=Math.max(0,Math.ceil((target-now)/1000));
 return {target,days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60,complete:total===0};
}
function releaseTimerMarkup(g,variant='card',now=Date.now()){
 const data=releaseTimerData(g,now),label=wishlistCardLabel(g,now);
 const clock='<svg class="release-stopwatch" viewBox="0 0 32 32" aria-hidden="true"><path d="M13 2h6M16 2v4M25 7l2 2"/><circle cx="16" cy="18" r="11"/><path class="stopwatch-hand" d="M16 18V10"/><circle class="stopwatch-pivot" cx="16" cy="18" r="1.2"/></svg>';
 if(!data)return '<span class="release-timer release-timer-pending '+variant+'">'+clock+'<span>'+esc(label)+'</span></span>';
 return '<span class="release-timer '+variant+' '+(data.complete?'complete':'')+'" data-release-timer="'+data.target+'" role="timer" aria-live="off" aria-label="'+esc(releaseTimerAccessible(data))+'">'+clock+'<span class="release-digits">'+[['days','G'],['hours','H'],['minutes','MIN'],['seconds','SEC']].map(([key,unit])=>'<span class="release-unit"><b data-time-unit="'+key+'">'+String(data[key]).padStart(2,'0')+'</b><small>'+unit+'</small></span>').join('<span class="release-colon" aria-hidden="true">:</span>')+'</span></span>';
}
function releaseTimerAccessible(d){return d.complete?'Data prevista raggiunta, disponibilità da confermare':d.days+' giorni, '+d.hours+' ore, '+d.minutes+' minuti e '+d.seconds+' secondi alla data prevista';}
function wishlistCardLabel(g,now=Date.now()){
 if(wishlistState(g,now)==='upcoming'){if(g.releasePrecision&&!['date_full','date_month','date_quarter','date_year'].includes(g.releasePrecision))return g.release||'Data da annunciare';return shopReleaseLabel(g);}return g.price||g.release||'Prezzo da annunciare';
}
function updateReleaseTimers(){
 const now=Date.now(),reduce=document.body?.classList.contains('reduce-motion')||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 for(const el of document.querySelectorAll('[data-release-timer]')){
 const d=releaseTimerData({comingSoon:true,releaseTimestamp:Number(el.dataset.releaseTimer)/1000,releasePrecision:'date_full'},now);if(!d)continue;
 el.classList.toggle('complete',d.complete);el.setAttribute('aria-label',releaseTimerAccessible(d));
 for(const part of el.querySelectorAll('[data-time-unit]')){const value=String(d[part.dataset.timeUnit]).padStart(2,'0');if(part.textContent===value)continue;part.textContent=value;if(!reduce&&part.animate)part.animate([{transform:'translateY(-3px)',opacity:.35},{transform:'translateY(0)',opacity:1}],{duration:220,easing:'ease-out'});}
 }}
setInterval(updateReleaseTimers,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateReleaseTimers();});

document.addEventListener('click',e=>{if(!e.target.closest('[data-wishlist-keyboard]'))return;const field=$('#wishlist-search');if(!state.settings.internalKeyboard){field?.focus();return;}keyboard(wishlistQuery,value=>{wishlistQuery=value;render(true);$('#wishlist-search')?.focus();});});
