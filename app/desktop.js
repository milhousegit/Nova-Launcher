'use strict';
let desktopSearch='',desktopPlatform='all',desktopStarted=false,desktopFavorites=false,desktopPlayable=false;
const renderConsole=render;
render=function(keep=false){
 const desktop=state.settings.fullscreen===false&&state.settings.novaAccount?.connected;
 document.body.classList.toggle('desktop-mode',!!desktop);
 if(desktop&&!desktopStarted){desktopStarted=true;if(page==='home')page='library';lower=-1;}
 if(!desktop)desktopStarted=false;
 if(desktop&&page==='home'){page='library';lower=-1;if(detailGame)returnPage='library';}
 for(const b of document.querySelectorAll('nav [data-page="home"], [data-system="wifi"], [data-system="bluetooth"]'))b.hidden=!!desktop;
 const brand=document.querySelector('.brand');if(brand)brand.setAttribute('aria-label',desktop?'Nova Libreria':'Nova Home');
 renderConsole(keep);
 document.getElementById('desktop-toggle')?.remove();
 let side=document.getElementById('desktop-library');
 const libraryVisible=desktop&&(page==='library'||detailGame&&returnPage==='library');
 if(!libraryVisible){side?.remove();document.body.classList.remove('desktop-library-open');return;}
 document.body.classList.add('desktop-library-open');
 if(!side){side=document.createElement('aside');side.id='desktop-library';side.setAttribute('aria-label','Elenco giochi');document.body.append(side);}
 const top=side.scrollTop;
 const platforms=[...new Set(state.games.flatMap(g=>g.sources||g.copies?.map(c=>c.source)||[]))].sort();
 const games=sortLibraryGames(state.games.filter(g=>desktopGameMatches(g,{store:desktopPlatform,query:desktopSearch,favorites:desktopFavorites,playable:desktopPlayable})));
 side.innerHTML='<div class="desktop-library-tools"><h2>Libreria <small>'+state.games.length+'</small></h2><input id="desktop-search" type="search" placeholder="Cerca un gioco" aria-label="Cerca un gioco" value="'+esc(desktopSearch)+'"><div class="desktop-filter-row"><select id="desktop-platform" aria-label="Filtra per store"><option value="all">Tutti gli store</option>'+platforms.map(p=>'<option '+(desktopPlatform===p?'selected':'')+'>'+esc(p)+'</option>').join('')+'</select><button class="desktop-filter '+(desktopFavorites?'active':'')+'" data-desktop-filter="favorites" aria-label="Solo preferiti" title="Preferiti" aria-pressed="'+desktopFavorites+'">'+icon('heart')+'</button><button class="desktop-filter '+(desktopPlayable?'active':'')+'" data-desktop-filter="playable" aria-label="Solo installati e giocabili" title="Installati e giocabili" aria-pressed="'+desktopPlayable+'">'+icon('play')+'</button></div></div><div class="desktop-game-list">'+games.map(g=>'<button data-desktop-game="'+esc(g.id)+'" class="'+(selected?.id===g.id?'active':'')+'" title="'+esc(g.title)+'">'+(g.cover?'<img src="'+esc(g.cover)+'" alt="" loading="lazy">':'<img src="assets/default-cover.svg" alt="">')+'<span>'+esc(g.title)+'</span>'+(g.installed?'<i title="Installato">●</i>':'')+'</button>').join('')+'</div>';
 side.scrollTop=top;
};
document.addEventListener('click',async e=>{
 const filter=e.target.closest('[data-desktop-filter]');if(filter){const type=filter.dataset.desktopFilter;if(type==='favorites')desktopFavorites=!desktopFavorites;else desktopPlayable=!desktopPlayable;render(true);document.querySelector('[data-desktop-filter="'+type+'"]')?.focus({preventScroll:true});return;}
 const item=e.target.closest('[data-desktop-game]');if(item){await openDetails(game(item.dataset.desktopGame));return;}
 if(e.target.closest('[data-action="desktop-mode-toggle"]')){allPanelsClosed();if(state.settings.fullscreen===false){state.settings.fullscreen=await call('fullscreen');}else{state.settings.fullscreen=await call('desktopMode');page='library';detailGame=null;}render();}
});
document.addEventListener('input',e=>{if(e.target.id!=='desktop-search')return;desktopSearch=e.target.value;const position=e.target.selectionStart;render(true);const input=document.getElementById('desktop-search');input?.focus();try{input.setSelectionRange(position,position)}catch{}});
document.addEventListener('change',e=>{if(e.target.id==='desktop-platform'){desktopPlatform=e.target.value;render(true);document.getElementById('desktop-platform')?.focus();}});

function desktopGameMatches(g,{store='all',query='',favorites=false,playable=false}={}){const copies=(g.copies||[]).filter(c=>store==='all'||c.source===store);return !!copies.length&&(!favorites||!!g.favorite)&&(!playable||copies.some(c=>c.installed&&(c.executable||c.source?.startsWith('Steam')&&(c.steamId||g.steamId)||c.source==='Epic'&&c.appName)))&&String(g.title||'').toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it'));}
