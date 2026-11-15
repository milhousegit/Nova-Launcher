'use strict';
/* Library collections, storage and system updates, shared by the Windows and Linux builds. */
(()=>{
 const console_=()=>state.settings.console||{};
 const bytes=n=>n>=1e12?(n/1e12).toLocaleString('en-GB',{maximumFractionDigits:1})+' TB':n>=1e9?(n/1e9).toLocaleString('en-GB',{maximumFractionDigits:n>=1e10?0:1})+' GB':n>0?Math.max(1,Math.round(n/1e6))+' MB':'—';
 const panelKind=()=>panels.at(-1)?.kind;

 /* ── Library: collections as rows, the full grid one press away ────────── */
 let libraryView='collections';
 try{libraryView=localStorage.getItem('nova.libraryView')==='all'?'all':'collections';}catch{}
 const collections=()=>Array.isArray(state.settings.collections)?state.settings.collections:[];
 const rowLimit=30;
 function builtIn(){
  const played=g=>Date.parse(g.lastPlayed)||0;
  return [
   {id:'recent',name:'Giocati di recente',games:[...state.games].filter(g=>played(g)>0).sort((a,b)=>played(b)-played(a))},
   {id:'favorites',name:'Preferiti',games:state.games.filter(g=>g.favorite)},
   {id:'installed',name:'Installati',games:state.games.filter(g=>g.installed)},
   {id:'never',name:'Mai giocati',games:state.games.filter(g=>!(g.playtime>0)&&!played(g))}
  ];
 }
 const viewToggle=()=>`<div class="view-toggle" role="group" aria-label="Vista della libreria"><button data-library-view="collections" aria-pressed="${libraryView==='collections'}">Raccolte</button><button data-library-view="all" aria-pressed="${libraryView==='all'}">Tutti i giochi</button></div>`;
 function railMarkup(c,custom){
  const shown=c.games.slice(0,rowLimit);
  return `<section class="collection" data-collection="${esc(c.id)}"><div class="rail-head"><h2>${esc(c.name)}</h2><small><b>${c.games.length}</b> <span>${c.games.length===1?'gioco':'giochi'}</span>${custom?`<button class="action square" data-collection-edit="${esc(c.id)}" aria-label="Modifica raccolta">${icon('settings')}</button>`:''}</small></div>${shown.length?`<div class="rail collection-rail">${shown.map(g=>cover(g)).join('')}${c.games.length>rowLimit?`<button class="rail-more" data-library-view="all" aria-label="Tutti i giochi">${icon('library')}<strong>Tutti i giochi</strong></button>`:''}</div>`:'<p class="note">Aggiungi un gioco dalle sue opzioni: Opzioni del gioco → Raccolte.</p>'}</section>`;
 }
 function collectionsMarkup(){
  const mine=collections().map(c=>({id:c.id,name:c.name,games:c.games.map(game).filter(Boolean)}));
  const rows=builtIn().filter(c=>c.games.length).map(c=>railMarkup(c,false)).join('')+mine.map(c=>railMarkup(c,true)).join('');
  return `<section class="page library-page library-collections"><div class="page-heading"><div><h1>La tua libreria</h1><p>${state.games.length} ${state.games.length===1?'gioco':'giochi'}</p></div><div class="library-heading-actions">${viewToggle()}<button class="action" data-action="collection-new">${icon('folder')}Nuova raccolta</button></div></div>${rows||'<div class="empty"><h2>La tua libreria, qui.</h2><p>Collega uno store o aggiungi un gioco installato dalle impostazioni.</p></div>'}</section>`;
 }
 const baseLibrary=libraryMarkup;
 libraryMarkup=function(){
  if(state.settings.fullscreen===false)return baseLibrary();
  if(libraryView==='collections'&&!query)return collectionsMarkup();
  return baseLibrary().replace('<div class="library-heading-actions">','<div class="library-heading-actions">'+viewToggle());
 };
 function setView(view){libraryView=view;try{localStorage.setItem('nova.libraryView',view);}catch{}if(view==='collections')query='';if(page==='library'&&!detailGame){render();focusFirst();}}
 /* Search always works on the whole library. */
 const baseSearch=window.novaShell.openSearch;
 window.novaShell.openSearch=function(){if(libraryView!=='all'){libraryView='all';if(page==='library'&&!detailGame&&!panels.length)render();}baseSearch();};
 const baseFocusFirst=focusFirst;
 focusFirst=function(){
  if(!panels.length&&!detailGame&&page==='library'){const card=$('.collection-rail .game-card');if(card){card.focus({preventScroll:true});paintFocus();return;}}
  baseFocusFirst();
 };
 async function saveCollections(next){state.settings.collections=await call('collectionsSave',{collections:next});if(page==='library'&&!detailGame)render(true);return state.settings.collections;}
 function nameCollection(initial,done){
  openPanel(initial?'Rinomina raccolta':'Nuova raccolta',`<label for="collection-name">Nome della raccolta</label><input id="collection-name" type="text" maxlength="40" value="${esc(initial)}" aria-label="Nome della raccolta">${row('Salva','collection-name-save','check')}`);
  panels.at(-1).submit=done;
 }
 const gameCollectionsMarkup=g=>`<p>Scegli in quali raccolte compare questo gioco.</p>${collections().map(c=>row(esc(c.name),'',c.games.includes(g.id)?'check':'folder',c.games.includes(g.id)?'In questa raccolta':'',`data-collection-toggle="${esc(c.id)}"`)).join('')}${row('Nuova raccolta','collection-new','folder')}`;

 /* ── Storage: space per disk, size per game ────────────────────────────── */
 let storageData=null;
 function storageMarkup(){
  if(!storageData)return skeletonMarkup('rows',4);
  const d=storageData;
  return `<div class="panel-section"><h3>Dischi</h3>${d.drives.length?d.drives.map(v=>{const used=v.total-v.free;return `<div class="drive"><div class="drive-head"><strong>${esc(v.id)}${v.name?' · '+esc(v.name):''}</strong><span><b>${bytes(v.free)}</b> <span>liberi di</span> <b>${bytes(v.total)}</b></span></div><i class="download-bar"><i style="width:${Math.min(100,Math.round(used/v.total*100))}%"></i></i></div>`;}).join(''):'<p class="note">Spazio sui dischi non disponibile.</p>'}</div><div class="panel-section"><h3>Giochi installati</h3>${d.measuring?'<p class="note">Sto misurando alcuni giochi: le dimensioni compaiono man mano.</p>':''}<div class="download-list">${d.games.map(g=>`<button class="download-row storage-row" data-storage-game="${esc(g.id)}">${g.cover?`<img src="${esc(g.cover)}" alt="" loading="lazy" draggable="false">`:`<span class="download-fallback">${icon('library')}</span>`}<span class="download-copy"><strong>${esc(g.title)}</strong><small><span>${esc(window.novaContent.platformName(g.source))}</span>${g.drive?`<span>${esc(g.drive)}</span>`:''}</small></span><b class="download-percent">${g.size===null?'…':bytes(g.size)}</b></button>`).join('')}</div>${!d.games.length?'<p class="note">Nessun gioco installato rilevato.</p>':''}</div>`;
 }
 async function loadStorage(){try{storageData=await call('storage');}catch{}if(panelKind()==='storage'){const body=$('#panel .panel-body'),focus=captureFocus(),top=body.scrollTop;body.innerHTML=storageMarkup();body.scrollTop=top;if(!restoreFocus(focus))focusFirst();}}
 function openStorage(){openPanel('Archiviazione',storageMarkup);panels.at(-1).kind='storage';loadStorage();}
 function storageGame(id){
  const item=storageData?.games.find(g=>g.id===id),g=game(id);if(!item||!g)return;
  selected=g;
  openPanel(g.title,`<div class="session-card">${g.cover?`<img src="${esc(g.cover)}" alt="" draggable="false">`:''}<span><small>${esc(window.novaContent.platformName(item.source))} · ${item.size===null?'…':bytes(item.size)}</small><strong>${esc(g.title)}</strong></span></div>${row('Apri la pagina del gioco','storage-details','info')}${row('Disinstalla','storage-uninstall','close',item.source==='Locale'?'Lo toglie dalla libreria; i file restano sul disco':'La rimozione è gestita da '+esc(window.novaContent.platformName(item.source)))}`);
 }

 /* ── System updates: Windows and drivers ───────────────────────────────── */
 let updateData=null,updateBusy=false;
 function updatesMarkup(){
  if(updateBusy&&!updateData)return '<p class="note">Cerco gli aggiornamenti: può richiedere fino a un minuto.</p>'+skeletonMarkup('rows',3);
  const d=updateData;if(!d)return '';
  if(!d.supported)return '<div class="empty"><h3>Disponibile su Windows</h3><p>Su Linux gli aggiornamenti restano al gestore dei pacchetti del sistema.</p></div>';
  const list=(title,items)=>`<div class="panel-section"><h3>${title} <small class="count">${items.length}</small></h3>${items.length?items.map(u=>`<div class="update-row"><strong>${esc(u.title)}</strong><small>${u.size?bytes(u.size):''}${u.downloaded?' · Scaricato':''}</small></div>`).join(''):'<p class="note">Nessun aggiornamento in attesa.</p>'}</div>`;
  return (d.error?'<p class="note">Non riesco a leggere Windows Update in questo momento.</p>':'')+(d.rebootRequired?'<div class="session-card"><span><small>Riavvio richiesto</small><strong>Riavvia il PC per completare gli aggiornamenti</strong></span></div>':'')+list('Windows',d.system)+list('Driver',d.drivers)+row('Apri Windows Update','','download','Scarica e installa',`data-win-page="update"`)+row('Driver e aggiornamenti facoltativi','','settings','',`data-win-page="optionalUpdates"`)+row('Cerca di nuovo','system-updates-refresh','refresh');
 }
 async function loadUpdates(force){
  if(updateBusy)return;updateBusy=true;if(force)updateData=null;if(panelKind()==='updates')drawPanel();
  try{updateData=await call('systemUpdates',{force:!!force});}catch{}
  updateBusy=false;if(panelKind()==='updates')drawPanel();
 }
 function openUpdates(){openPanel('Aggiornamenti di sistema',updatesMarkup);panels.at(-1).kind='updates';loadUpdates(false);}

 /* ── Wiring ────────────────────────────────────────────────────────────── */
 const baseAct=act;
 act=async function(name,el){
  const g=detailGame||selected;
  switch(name){
   case 'collection-new':nameCollection('',async value=>{const made={id:'c'+Date.now().toString(36),name:value,games:panelKind()==='game-collections'&&g?[g.id]:[]};await saveCollections([...collections(),made]);toast('Raccolta creata');});return;
   case 'collection-name-save':{const value=($('#collection-name')?.value||'').trim().slice(0,40),done=panels.at(-1).submit;if(!value){toast('Scrivi un nome per la raccolta.');return;}closePanel();await done(value);if(panels.length)drawPanel();return;}
   case 'game-collections':openPanel('Raccolte',()=>gameCollectionsMarkup(g));panels.at(-1).kind='game-collections';return;
   case 'collection-rename':{const id=el.dataset.id,c=collections().find(x=>x.id===id);closePanel();nameCollection(c.name,async value=>{await saveCollections(collections().map(x=>x.id===id?{...x,name:value}:x));});return;}
   case 'collection-delete':{const id=el.dataset.id;await saveCollections(collections().filter(x=>x.id!==id));allPanelsClosed();focusFirst();toast('Raccolta eliminata');return;}
   case 'storage':openStorage();return;
   case 'storage-details':{allPanelsClosed();if(g)openDetails(g);return;}
   case 'storage-uninstall':{const result=await call('uninstallGame',{id:g.id});toast(result.message);if(result.library)adopt(result.library);closePanel();loadStorage();return;}
   case 'system-updates':openUpdates();return;
   case 'system-updates-refresh':loadUpdates(true);return;
  }
  return baseAct(name,el);
 };
 document.addEventListener('click',async e=>{
  const view=e.target.closest?.('[data-library-view]');if(view){setView(view.dataset.libraryView);return;}
  const edit=e.target.closest?.('[data-collection-edit]');
  if(edit){const c=collections().find(x=>x.id===edit.dataset.collectionEdit);if(c)openPanel(c.name,row('Rinomina','collection-rename','settings','',`data-id="${esc(c.id)}"`)+row('Elimina la raccolta','collection-delete','close','I giochi restano nella libreria',`data-id="${esc(c.id)}"`));return;}
  const toggle=e.target.closest?.('[data-collection-toggle]');
  if(toggle){const g=detailGame||selected,id=toggle.dataset.collectionToggle;await saveCollections(collections().map(c=>c.id!==id?c:{...c,games:c.games.includes(g.id)?c.games.filter(x=>x!==g.id):[...c.games,g.id]})).catch(()=>{});if(panelKind()==='game-collections')drawPanel();return;}
  const stored=e.target.closest?.('[data-storage-game]');if(stored)storageGame(stored.dataset.storageGame);
 });
 /* Game options also open from a card inside a collection row. */
 const baseShowOptions=showOptions;
 showOptions=function(...args){
  const card=!args.length&&!panels.length&&!detailGame&&page==='library'&&document.activeElement?.closest?.('.collection-rail .game-card[data-game]'),g=card&&game(card.dataset.game);
  if(g){selected=g;openPanel('Opzioni del gioco',()=>gameOptionsMarkup(g));return;}
  return baseShowOptions(...args);
 };
 const baseOptions=gameOptionsMarkup;
 gameOptionsMarkup=function(g){const n=collections().filter(c=>c.games.includes(g.id)).length;return baseOptions(g).replace('<div class="panel-section"><h3>Artwork</h3>',`<div class="panel-section"><h3>Libreria</h3>${row('Raccolte','game-collections','folder',n?n+(n===1?' raccolta':' raccolte'):'Aggiungi a una raccolta')}</div><div class="panel-section"><h3>Artwork</h3>`);};
 const baseSettings=window.consoleSettingsMarkup;
 window.consoleSettingsMarkup=function(){return baseSettings().replace(/(<button class="row-action" data-action="diagnostics")/,row('Archiviazione','storage','save','Spazio sui dischi e dimensione dei giochi')+row('Aggiornamenti di sistema','system-updates','download',state.settings.platform==='win32'?'Windows Update e driver':'Disponibile su Windows')+'$1');};
 window.nova.onUpdate(v=>{if(v.storage&&panelKind()==='storage')loadStorage();});
 if(state.games.length&&page==='library'&&!panels.length&&!detailGame)render(true);
})();
