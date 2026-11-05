'use strict';
/* Game location and launch options. Nova finds the game by itself; every choice can still be changed by hand. */
(()=>{
 const previousAct=act,previousShowOptions=showOptions;
 const needsLocation=copy=>!!copy&&copy.installed&&!copy.source?.startsWith('Steam')&&copy.source!=='Epic'&&!(copy.executableExists&&copy.folderExists);
 function remember(g,copy){if(!copy)return;g.selectedSource=copy;const stored=game(g.id);if(stored)stored.selectedSource=copy;if(detailGame?.id===g.id)detailGame.selectedSource=copy;}
 const optionsOpen=()=>panels.at(-1)?.title==='Opzioni del gioco';
 /* SteamGridDB: the game is matched automatically (Steam id first, then title) and remembered; "Cambia gioco" overrides it. */
 function artPicker(message=''){return `<div id="art-picker" ${message?'':'hidden'}>${message?`<p class="note">${message}</p>`:''}<label for="art-query">Titolo su SteamGridDB</label><div class="search"><input id="art-query" value="${esc(artQuery)}"><button class="action square" data-action="art-keyboard" aria-label="Tastiera">${icon('keyboard')}</button></div><div class="actions" style="margin-top:18px">${button('Cerca','art-search','search','primary')}</div></div>`;}
 function revealPicker(message){const holder=$('#art-picker');if(!holder)return;holder.outerHTML=artPicker(message);$('#art-query')?.focus();}
 async function matchArtwork(g,refresh=false){
  try{const found=await call('artMatch',{id:g.id,refresh});if(!$('#art-match'))return;
   if(!found){$('#art-match').innerHTML='';revealPicker('Non ho trovato il gioco su SteamGridDB: cerca il titolo a mano.');$('#art-results').innerHTML='';return;}
   artSg=found.id;$('#art-match').innerHTML=`<div class="art-match-card"><span><small>SteamGridDB</small><strong>${esc(found.name)}</strong></span><button class="action" data-action="art-change">Cambia gioco</button></div>`;
   await artImages(found.id);
  }catch{if($('#art-match')){$('#art-match').innerHTML='';revealPicker('Non riesco a trovare il gioco in automatico: cerca il titolo a mano.');$('#art-results').innerHTML='';}}
 }
 artwork=function(kind){
  const g=detailGame||selected;artKind=kind;artQuery=g.title;artSg=0;
  openPanel('Scegli artwork',()=>`<div id="art-match">${skeletonMarkup('rows',1)}</div>${artPicker()}<div id="art-results"></div>`,true);
  matchArtwork(g);
 };
 act=async function(action,el){
  const g=detailGame||selected;
  if(action==='art-change'){revealPicker('Puoi cambiare il nome cercato: prova il titolo originale o senza il nome dell’edizione.');return;}
  if(action==='art-game'&&el?.dataset.sgid)call('artRemember',{id:g.id,sgId:Number(el.dataset.sgid),name:(el.querySelector('.row-title')?.textContent||'').trim()}).catch(()=>{});
  if(action==='locate-game'){const copy=await call('locateGame',{id:g.id});remember(g,copy);toast(copy?.found?'Gioco trovato automaticamente':'Non ho trovato il gioco: scegli la cartella.');if(optionsOpen())drawPanel();return;}
  if(action==='change-folder'){const copy=await call('selectFolder',{id:g.id});if(copy){remember(g,copy);if(optionsOpen())drawPanel();}return;}
  if(action==='choose-executable'){const copy=await call('selectExecutable',{id:g.id});if(copy){remember(g,copy);if(optionsOpen())drawPanel();}return;}
  if(action==='save-launch-options'){const copy=await call('launchOptions',{id:g.id,value:$('#launch-options')?.value||''});remember(g,copy);toast('Opzioni di avvio salvate');if(optionsOpen())drawPanel();return;}
  return previousAct(action,el);
 };
 /* Opening the options of an installed game with no known executable starts the search by itself. */
 showOptions=function(...args){
  previousShowOptions(...args);
  const g=detailGame||selected,copy=g&&activeCopy(g);
  if(!optionsOpen()||!needsLocation(copy)||g.locating)return;
  g.locating=true;
  call('locateGame',{id:g.id}).then(found=>{remember(g,found);if(optionsOpen()&&(detailGame||selected)?.id===g.id&&document.activeElement?.id!=='launch-options')drawPanel();}).catch(()=>{}).finally(()=>{g.locating=false;});
 };
})();
