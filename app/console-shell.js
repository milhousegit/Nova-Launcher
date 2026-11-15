'use strict';
/* Console shell, shared by the Windows and Linux builds.
   Makes Nova behave like the system of a console: one press starts a game, the launch has a visible state
   from "starting" to "running" to "back home", every command can be changed, and the hints at the bottom
   always describe what the focused element does on the device in use. */
(()=>{
 const S=window.novaShortcuts;
 const gate=()=>!!(state.settings.novaAccount?.required&&!state.settings.novaAccount.connected);
 const consoleState=()=>state.settings.console||{};
 const bindings=()=>S.resolve(state.settings.shortcuts||{});
 const upperHome=()=>!panels.length&&!detailGame&&page==='home'&&lower<0;
 const focusedGame=()=>{const card=document.activeElement?.closest?.('.game-card[data-game]');return card?game(card.dataset.game):null;};

 /* ── Button glyphs follow the user's own bindings ──────────────────────── */
 const glyphAction={lb:'sectionPrev',rb:'sectionNext',lt:'pagePrev',rt:'pageNext',x:'quick',y:'search',menu:'options',view:'help'};
 const baseKey=key;
 key=function(name){
  const id=glyphAction[name];if(!id)return baseKey(name);
  const b=bindings();
  if(mode==='Keyboard')return `<span class="key" data-k="${name}">${esc(S.keyName(b.keys[id]))}</span>`;
  const index=b.pad[id],preset=S.actions.find(a=>a.id===id).pad;
  if(index===preset&&name!=='view')return baseKey(name);
  return `<span class="key shoulder" data-k="">${esc(S.padName(index,mode))}</span>`;
 };

 /* ── Launching: one state from the press to the game window ────────────── */
 const pending=new Set();let veilGame='',veilTimer=0;
 const veil=document.createElement('div');veil.id='launch-veil';veil.hidden=true;veil.setAttribute('role','status');veil.setAttribute('aria-live','polite');document.body.append(veil);
 const veilVisible=()=>!veil.hidden;
 function showVeil(g){
  veilGame=g.id;clearTimeout(veilTimer);
  const copy=activeCopy(g);
  veil.innerHTML=`<div class="veil-art"${g.hero?` style="background-image:url(${esc(JSON.stringify(g.hero))})"`:''}></div><div class="veil-card">${g.cover?`<img src="${esc(g.cover)}" alt="" draggable="false">`:''}<div class="veil-copy"><small class="veil-state">Avvio in corso…</small><h2>${esc(g.title)}</h2><p class="veil-source"><span>Fonte</span><b>${esc(copy?.source||'')}</b></p><i class="veil-bar" aria-hidden="true"></i>${hint('b','Nascondi')}</div></div>`;
  veil.hidden=false;veil.dataset.state='launching';
  /* The game normally covers Nova long before this; the timer only keeps the veil from staying forever. */
  veilTimer=setTimeout(hideVeil,45000);
 }
 function hideVeil(){clearTimeout(veilTimer);veil.hidden=true;veilGame='';}
 function setSession(id,value){const next={...(window.novaSessions||{})};if(value)next[id]=value;else delete next[id];window.novaSessions=next;refreshPlayButtons();}
 async function playGame(g){
  if(!g||gate())return;
  const current=playState(g).state;
  if(current==='launching'){showVeil(g);return;}
  if(current==='running'){sessionMenu(g);return;}
  if(pending.has(g.id))return;
  pending.add(g.id);selected=g;
  const installed=!!activeCopy(g)?.installed;
  if(installed){setSession(g.id,{id:g.id,state:'launching',since:Date.now()});showVeil(g);}
  try{
   const result=await call('launch',{id:g.id});
   if(result.state!=='launching'){if(veilGame===g.id)hideVeil();if(!result.state)setSession(g.id,null);toast(result.message);}
  }catch{if(veilGame===g.id)hideVeil();setSession(g.id,{id:g.id,state:'error',since:Date.now()});}
  finally{pending.delete(g.id);window.nova.call('sessions').then(adoptSessions).catch(()=>{});}
 }
 /* What a running game offers when Nova is brought back in front of it. */
 function sessionMenu(g){
  selected=g;
  openPanel(g.title,()=>`<div class="session-card">${g.cover?`<img src="${esc(g.cover)}" alt="" draggable="false">`:''}<span><small>In esecuzione</small><strong>${esc(g.title)}</strong></span></div><div class="panel-section">${row('Riprendi il gioco','resume-game','play','Nova si fa da parte e torna il gioco')}${row('Amici','friends','users')}${state.settings.platform==='win32'?row('Audio','session-audio','audio','Uscita e volume delle applicazioni'):''}</div><div class="panel-section"><h3>Chiusura</h3>${row('Chiudi il gioco','close-game','power','Salva prima i progressi.')}${row('Forza chiusura','force-game','power','Usa solo se il gioco non risponde.','data-tone="danger"')}</div>`);
  panels.at(-1).kind='session';
 }
 function sessionsChanged(v){
  const event=v.sessionEvent;
  if(event){
   if(event.event==='running'&&veilGame===event.id){veil.dataset.state='running';const label=veil.querySelector('.veil-state');if(label)label.textContent='In esecuzione';clearTimeout(veilTimer);veilTimer=setTimeout(hideVeil,2500);}
   if(event.event==='error'){if(veilGame===event.id)hideVeil();toast(event.reason==='timeout'?'Il gioco non si è avviato in tempo. Controlla il client dello store e riprova.':'Avvio non riuscito. Controlla le opzioni del gioco.');}
   if(event.event==='cleared'&&veilGame===event.id)hideVeil();
   if(event.event==='ended'){if(veilGame===event.id)hideVeil();if(panels.at(-1)?.kind==='session')allPanelsClosed();}
  }
  /* Cards carry the state too: redraw them only where they are on screen. */
  if(!panels.length&&!detailGame&&(page==='home'&&lower<0||page==='library')&&!document.hidden)render(true);
 }
 function summoned(){
  hideVeil();
  const id=Object.values(window.novaSessions||{}).find(s=>s.state==='running')?.id||[...runningGames][0],g=id&&game(id);
  if(g&&panels.at(-1)?.kind!=='session'){allPanelsClosed();sessionMenu(g);}
 }

 /* ── Cards and Home ────────────────────────────────────────────────────── */
 const baseCover=cover;
 cover=function(g,sel=false){
  const html=baseCover(g,sel),current=playState(g).state;
  if(current!=='running'&&current!=='launching')return html;
  return html.replace(/<\/button>$/,`<span class="card-state" data-state="${current}">${current==='running'?'In esecuzione':'Avvio in corso…'}</span></button>`);
 };
 const homeLimit=24;
 function homeGames(){
  const live=g=>Number(playState(g).state==='running'||playState(g).state==='launching');
  const list=[...state.games].sort((a,b)=>live(b)-live(a)||(Date.parse(b.lastPlayed)||0)-(Date.parse(a.lastPlayed)||0)||Number(!!b.installed)-Number(!!a.installed)).slice(0,homeLimit);
  if(selected&&!list.some(g=>g.id===selected.id)){const kept=game(selected.id);if(kept)list.push(kept);}
  return list;
 }
 const sectionNames=['Giochi','Novità','App'];
 /* On Home the tabs are a signpost for LB/RB and the mouse; the controller focus stays on the games. */
 function sectionTabs(focusable){return `<div class="section-tabs home-tabs" role="tablist" aria-label="Sezioni della Home"><span data-prompt="lb">${key('lb')}</span>${sectionNames.map((name,i)=>focusable?`<button class="${i-1===lower?'active':''}" data-lower="${i-1}">${name}</button>`:`<span class="home-tab ${i-1===lower?'active':''}" role="tab" aria-selected="${i-1===lower}" data-home-tab="${i-1}">${name}</span>`).join('')}<span data-prompt="rb">${key('rb')}</span></div>`;}
 const baseHero=heroMarkup;
 heroMarkup=function(g){
  if(!g)return baseHero(g);
  return `<div class="hero"><div class="hero-copy"><div class="game-brand">${g.logo?`<img class="game-logo" src="${esc(g.logo)}" alt="${esc(g.title)}">`:`<h1 class="hero-title">${esc(g.title)}</h1>`}</div><div class="hero-meta">${meta(g)}</div><p class="hero-sub">${esc((g.description||'').slice(0,145))}${g.description?.length>145?'…':''}</p><div class="actions">${playButtonMarkup(g)}${button(`${icon('info')}Dettagli`,'details')}<button class="action square" aria-label="Opzioni del gioco" data-action="options">${icon('settings')}</button></div></div></div>`;
 };
 renderHome=function(){
  const list=homeGames();
  /* The first games are the ones most likely to be started: only they are worth decoding right away. */
  const cards=list.map((g,i)=>{let html=cover(g,g.id===selected?.id);if(i<8)html=html.replace(' loading="lazy"',' loading="eager"');return html;}).join('');
  return `<section class="home"><div id="hero-slot">${heroMarkup(selected)}</div><div class="recent"><div class="rail-head"><h2>I tuoi giochi</h2><small><b>${state.games.length}</b> <span>giochi in libreria</span></small></div><div class="rail" id="recent-rail">${cards}${state.games.length?`<button class="rail-more" data-page="library" aria-label="Tutta la libreria">${icon('library')}<strong>Tutta la libreria</strong><small><b>${state.games.length}</b> <span>giochi</span></small></button>`:''}</div></div><button class="down" data-action="lower">${icon('down')} Novità e app</button></section>`;
 };
 lowerMarkup=function(){return `<section class="lower-page"><div class="lower-heading">${sectionTabs(true)}</div><div id="lower-content">${lower===0?newsMarkup():appsMarkup()}</div></section>`;};
 document.addEventListener('click',e=>{const tab=e.target.closest?.('[data-home-tab]');if(tab&&!panels.length)changeLower(Number(tab.dataset.homeTab));});
 /* Entering Novità or App lands on the content, not on the tab that was just chosen. */
 const baseFocusFirst=focusFirst;
 focusFirst=function(){
  if(!gate()&&!panels.length&&!detailGame&&page==='home'&&lower>=0){const target=$('#lower-content button');if(target){target.focus({preventScroll:true});paintFocus();return;}}
  baseFocusFirst();
 };

 /* ── Navigation: LB/RB move between sections everywhere ────────────────── */
 const baseSection=changeSection;
 changeSection=function(delta){
  if(gate()||veilVisible())return;
  if(panels.length||detailGame||page==='explore')return baseSection(delta);
  if(page==='home'){const order=[-1,0,1];window.novaSounds?.play('navigate');changeLower(order[(order.indexOf(lower)+delta+order.length)%order.length]);return;}
  changeMain(delta);
 };
 const quickPlayTarget=el=>consoleState().quickPlay!==false&&upperHome()&&!!el?.matches?.('#recent-rail .game-card[data-game]')&&!!activeCopy(game(el.dataset.game)||{})?.installed;
 const baseConfirm=confirm;
 confirm=function(){
  if(veilVisible())return;
  const el=document.activeElement;
  if(quickPlayTarget(el)){window.novaSounds?.play('confirm');playGame(game(el.dataset.game));return;}
  baseConfirm();
 };
 const baseBack=back;back=function(){if(veilVisible()){hideVeil();return;}if(capturing()){cancelCapture();return;}baseBack();};
 const baseMove=move;move=function(direction){if(veilVisible()||capturing())return;baseMove(direction);};

 /* ── Actions behind the shortcuts ──────────────────────────────────────── */
 function openSearch(){
  if(panels.length)return;
  if(detailGame||page!=='library')go('library');
  const field=$('#library-search');if(!field)return;
  field.focus({preventScroll:true});field.select?.();paintFocus();
  if(state.settings.internalKeyboard&&mode!=='Keyboard')act('search-keyboard',field);
 }
 function quickAction(){
  if(panels.length)return;
  if(detailGame){playGame(game(detailGame.id)||detailGame);return;}
  const g=focusedGame();
  if(g){if(page==='home')openDetails(g);else playGame(g);return;}
  if(upperHome()&&selected)openDetails(selected);
 }
 function perform(action){
  if(gate()||veilVisible())return;
  switch(action){
   case 'search':openSearch();break;
   case 'quick':quickAction();break;
   case 'options':{if(panels.length)break;const before=panels.length;showOptions();if(panels.length===before)menu();break;}
   case 'favorite':{if(panels.length)break;const g=detailGame||focusedGame();if(g){if(!detailGame)selected=g;act('favorite');}break;}
   case 'help':if(panels.at(-1)?.kind==='help')closePanel();else if(!panels.length)openHelp();break;
   case 'settings':allPanelsClosed();go('settings');break;
   case 'home':if(!panels.length)go('home');break;
   case 'library':if(!panels.length)go('library');break;
   case 'sectionPrev':changeSection(-1);break;
   case 'sectionNext':changeSection(1);break;
   case 'pagePrev':changeMain(-1);break;
   case 'pageNext':changeMain(1);break;
  }
 }
 /* Keyboard: returns true when the key was used here, so the base handler leaves it alone. */
 const legacyKeys=['q','e','PageUp','PageDown','ContextMenu'];
 function onKey(e){
  if(capturing()){e.preventDefault();captureKey(e);return true;}
  if(veilVisible()){e.preventDefault();if(e.key==='Escape')hideVeil();return true;}
  const pressed=S.combo(e);if(!pressed)return false;
  const typing=!!e.target.matches?.('input:not([type=range]),select,textarea');
  if(pressed==='Enter'&&!typing&&quickPlayTarget(e.target)){e.preventDefault();if(!e.repeat)playGame(game(e.target.dataset.game));return true;}
  const action=S.actionForKey(bindings(),pressed);
  /* A default key that was given to another action must not keep its old meaning. */
  if(!action)return legacyKeys.includes(pressed)&&!typing;
  if(typing&&!/^(Ctrl\+|Alt\+|F\d|PageUp$|PageDown$)/.test(pressed))return false;
  e.preventDefault();if(!e.repeat)perform(action);return true;
 }
 function onPad(edge){const b=bindings();for(const id of S.ids)if(b.pad[id]!==null&&edge(b.pad[id]))perform(id);}

 /* ── Changing a command ────────────────────────────────────────────────── */
 let capture=null;
 /* Closing the panel by any other route ends the capture too. */
 const capturing=()=>{if(capture&&panels.at(-1)?.kind!=='capture')capture=null;return !!capture;};
 function startCapture(kind,action){
  capture={kind,action};
  openPanel(kind==='summon'?'Richiama Nova':'Nuovo comando',kind==='summon'?'<p>Premi la combinazione da usare durante il gioco: Ctrl o Alt insieme a un tasto.</p><p class="note">Esc per annullare.</p>':'<p>Premi un tasto della tastiera oppure un pulsante del controller.</p><p class="note">Esc o il pulsante Indietro per annullare. Conferma, Indietro e le direzioni non si possono riassegnare.</p>');
  panels.at(-1).kind='capture';
 }
 function cancelCapture(){capture=null;if(panels.at(-1)?.kind==='capture')closePanel();}
 async function saveShortcut(kind,action,value){
  const next=S.assign(state.settings.shortcuts||{},kind,action,value);cancelCapture();
  try{state.settings.shortcuts=await call('shortcutsSave',next);toast('Comando aggiornato');}catch{}
  if(panels.length)drawPanel();prompts();
 }
 function accelerator(e){
  const k=e.key,name=/^[a-z0-9]$/i.test(k)?k.toUpperCase():/^F\d{1,2}$/.test(k)||['Home','End','PageUp','PageDown','Insert'].includes(k)?k:k===' '?'Space':'';
  if(!name||!e.ctrlKey&&!e.altKey)return '';
  return [e.ctrlKey?'Control':'',e.altKey?'Alt':'',e.shiftKey?'Shift':'',name].filter(Boolean).join('+');
 }
 async function captureKey(e){
  if(e.key==='Escape'){cancelCapture();return;}
  if(['Control','Shift','Alt','Meta','AltGraph'].includes(e.key))return;
  if(capture.kind==='summon'){const value=accelerator(e);if(!value){toast('Usa Ctrl o Alt insieme a una lettera, un numero o un tasto funzione.');return;}cancelCapture();await setConsole({summon:value});return;}
  const pressed=S.combo(e);
  if(S.reservedKey(pressed)){toast('Questo tasto è riservato alla navigazione o a Windows.');return;}
  await saveShortcut('keys',capture.action,pressed);
 }
 function padCapture(edge){
  if(veilVisible()){if(edge(1))hideVeil();return true;}
  if(!capturing())return false;
  if(edge(1)){cancelCapture();return true;}
  if(capture.kind==='pad'||capture.kind==='shortcut')for(let i=2;i<=16;i++)if(edge(i)&&S.assignablePad(i)){saveShortcut('pad',capture.action,i);break;}
  return true;
 }
 function shortcutsMarkup(){
  const b=bindings(),device=mode==='PlayStation'?'PlayStation':'Xbox';
  return '<p>Scegli un comando, poi premi il tasto o il pulsante che preferisci. Se è già in uso, i due comandi si scambiano.</p><div class="shortcut-legend"><span>Tastiera</span><span>Controller</span></div>'+S.actions.map(a=>`<button class="row-action shortcut-row" data-shortcut="${a.id}">${icon('keyboard')}<span class="row-copy"><strong class="row-title">${a.label}</strong></span><span class="shortcut-keys"><span class="key">${esc(S.keyName(b.keys[a.id]))}</span><span class="key shoulder">${esc(S.padName(b.pad[a.id],device))}</span></span></button>`).join('')+row('Ripristina i comandi predefiniti','shortcuts-reset','refresh');
 }
 function openHelp(){
  const b=bindings(),pad=mode!=='Keyboard',glyph=id=>pad?S.padName(b.pad[id],mode):S.keyName(b.keys[id]);
  const line=(keys,text)=>`<div class="help-row"><span class="shortcut-keys">${keys.map(k=>`<span class="key ${pad?'shoulder':''}">${esc(k)}</span>`).join('')}</span><span>${text}</span></div>`;
  const fixed=pad?[[[S.padName(0,mode)],'Conferma o avvia'],[[S.padName(1,mode)],'Indietro'],[['D-pad','L'],'Spostati tra gli elementi']]:[[['Invio'],'Conferma o avvia'],[['Esc'],'Indietro'],[['↑','↓','←','→'],'Spostati tra gli elementi'],[['F11'],'Schermo intero']];
  openPanel('Guida ai comandi',`<p class="note">${pad?'Comandi del controller in uso.':'Comandi di tastiera e mouse.'}</p><div class="help-list">${fixed.map(([k,t])=>line(k,t)).join('')}${S.actions.filter(a=>!pad||b.pad[a.id]!==null).map(a=>line([glyph(a.id)],a.label)).join('')}${consoleState().summon?line(consoleState().summon.split('+').map(p=>p==='Control'?'Ctrl':p),'Richiama Nova durante il gioco'):''}</div>${row('Personalizza i comandi','shortcuts-open','keyboard')}`,true);
  panels.at(-1).kind='help';
 }
 document.addEventListener('click',e=>{
  const shortcut=e.target.closest?.('[data-shortcut]');if(shortcut){startCapture('shortcut',shortcut.dataset.shortcut);return;}
  const pageRow=e.target.closest?.('[data-win-page]');if(pageRow){call('windowsSettings',{page:pageRow.dataset.winPage}).catch(()=>{});return;}
  const method=e.target.closest?.('[data-launch-method]');
  if(method){const g=detailGame||selected;call('launchMethod',{id:g.id,value:method.dataset.launchMethod}).then(value=>{const copy=activeCopy(g);state.settings.launchMethods={...(state.settings.launchMethods||{})};if(value==='auto')delete state.settings.launchMethods[copy.id];else state.settings.launchMethods[copy.id]=value;closePanel();toast('Metodo di avvio salvato');}).catch(()=>{});}
 });

 /* ── Console settings ──────────────────────────────────────────────────── */
 async function setConsole(change){try{state.settings.console=await call('consoleSet',change);}catch{}if(panels.length)drawPanel();else if(page==='settings')render(true);prompts();}
 const windowsPages={home:'Tutte le impostazioni',network:'Rete e Internet',bluetooth:'Bluetooth e dispositivi',display:'Schermo',sound:'Audio',controllers:'Controller e periferiche',update:'Windows Update',notifications:'Notifiche',power:'Alimentazione e sospensione'};
 window.consoleSettingsMarkup=function(){
  const c=consoleState(),windows=state.settings.platform==='win32';
  return settingGroup('Modalità console','Nova come schermata principale del PC. Ogni opzione si può disattivare in qualsiasi momento.',
    switchRow('Avvia Nova all’accensione','console-autostart',!!c.autostart,'power',c.autostartSupported?'Apre Nova a schermo intero quando accedi al sistema':'Disponibile nella versione installata di Nova',!c.autostartSupported)
   +switchRow('Torna a Nova alla chiusura del gioco','console-return',c.returnToNova!==false,'home','Nova torna in primo piano appena il gioco si chiude')
   +switchRow('Nova sempre in primo piano','console-priority',c.priority!==false,'fullscreen','Launcher e app restano dietro a Nova; solo i giochi la coprono')
   +switchRow('Avvio rapido dalla Home','console-quickplay',c.quickPlay!==false,'play','Il pulsante di conferma avvia subito il gioco selezionato')
   +switchRow('Silenzia le notifiche di Windows','console-quiet',!!c.quietNotifications,'audio',windows?'Sperimentale · ripristinate quando chiudi Nova':'Disponibile solo su Windows',!c.quietSupported)
   +row('Richiama Nova durante il gioco','console-summon','keyboard',c.summon?esc(c.summon.replace('Control','Ctrl').split('+').join(' + ')):'Disattivata'))
  +settingGroup('Comandi','Tastiera e controller, come preferisci.',row('Scorciatoie e comandi','shortcuts-open','keyboard','Personalizza tastiera e controller')+row('Guida ai comandi','help-open','info','Tutti i comandi del dispositivo in uso'))
  +settingGroup('Giochi e sistema','Quello che serve senza passare dal desktop.',row('Aggiungi un gioco installato','add-local-game','folder','Scegli l’eseguibile di un gioco non rilevato')+(windows?row('Impostazioni di Windows','windows-settings','settings','Rete, schermo, audio e aggiornamenti'):'')+row('Diagnostica prestazioni','diagnostics','clock','Tempi di avvio e risorse usate da Nova'));
 };
 const seconds=ms=>ms>0?(ms/1000).toLocaleString('en-GB',{maximumFractionDigits:1})+' s':'—';
 async function diagnostics(){
  openPanel('Diagnostica prestazioni',skeletonMarkup('rows',3));const panel=panels.at(-1);
  try{
   const d=await call('diagnostics'),b=d.boot||{},tile=(label,value)=>`<div class="stat-tile"><strong>${esc(value)}</strong><span>${label}</span></div>`;
   if(panels.at(-1)!==panel)return;
   panel.build=`<div class="stat-grid">${tile('Finestra aperta',seconds(b.window-b.start))}${tile('Interfaccia visibile',seconds(b.interface-b.start))}${tile('Profilo pronto',seconds(b.profile-b.start))}${tile('Libreria sincronizzata',seconds(b.library-b.start))}${tile('Memoria in uso',d.memoryMB+' MB')}${tile('Uso della CPU',d.cpu+' %')}${tile('Processi di Nova',String(d.processes))}${tile('Controllo dei giochi',seconds(d.pollMs))}</div><p class="note">I tempi partono dall’avvio di Nova. Il controllo dei giochi rallenta da solo quando nessun gioco è aperto.</p>`;
   drawPanel();
  }catch{if(panels.at(-1)===panel)closePanel();}
 }
 const handlers={
  'console-autostart':()=>setConsole({autostart:!consoleState().autostart}),
  'console-return':()=>setConsole({returnToNova:consoleState().returnToNova===false}),
  'console-quickplay':()=>setConsole({quickPlay:consoleState().quickPlay===false}),
  'console-priority':()=>setConsole({priority:consoleState().priority===false}),
  'console-quiet':()=>{if(consoleState().quietNotifications)return setConsole({quietNotifications:false});openPanel('Silenziare le notifiche di Windows?',`<p>Nova disattiva i banner delle notifiche di Windows per il tuo utente mentre è aperta, così non compaiono sopra i giochi.</p><p class="note">L’impostazione precedente viene salvata e ripristinata quando chiudi Nova o disattivi questa opzione. Aggiornamenti di sicurezza, Defender e controllo account non vengono toccati.</p>${row('Conferma e silenzia le notifiche','console-quiet-confirm','check')}${row('Annulla','back-panel','close')}`);},
  'console-quiet-confirm':async()=>{closePanel();await setConsole({quietNotifications:true,confirm:true});},
  'console-summon':()=>openPanel('Richiama Nova durante il gioco',()=>`<p>Una combinazione di tasti che riporta Nova in primo piano mentre giochi, con le opzioni per riprendere o chiudere il gioco.</p><div class="session-card"><span><small>Combinazione attuale</small><strong>${consoleState().summon?esc(consoleState().summon.replace('Control','Ctrl').split('+').join(' + ')):'Disattivata'}</strong></span></div>${row('Cambia combinazione','summon-capture','keyboard')}${row('Ripristina la predefinita','summon-default','refresh')}${row('Disattiva','summon-off','close')}<p class="note">Il richiamo dal controller non è disponibile: a gioco aperto il sistema consegna i pulsanti solo al gioco.</p>`),
  'summon-capture':()=>startCapture('summon'),
  'summon-default':()=>setConsole({summon:'Control+Alt+Home'}),
  'summon-off':()=>setConsole({summon:''}),
  'shortcuts-open':()=>openPanel('Scorciatoie e comandi',shortcutsMarkup,true),
  'shortcuts-reset':async()=>{try{state.settings.shortcuts=await call('shortcutsSave',{keys:{},pad:{}});toast('Comandi predefiniti ripristinati');}catch{}drawPanel();prompts();},
  'help-open':()=>openHelp(),
  'windows-settings':()=>openPanel('Impostazioni di Windows','<p>Si aprono sopra Nova. Chiudi la finestra di Windows per tornare qui.</p>'+(consoleState().settingsPages||[]).filter(p=>windowsPages[p]).map(p=>row(windowsPages[p],'','settings','',`data-win-page="${p}"`)).join('')),
  'add-local-game':async()=>{const added=await call('addLocalGame');if(!added)return;adopt(added.library);const g=game(added.id);toast('Gioco aggiunto alla libreria');if(g){allPanelsClosed();openDetails(g);}},
  'remove-local-game':async()=>{const g=detailGame||selected;adopt(await call('removeLocalGame',{id:g.id}));allPanelsClosed();if(detailGame&&!game(detailGame.id))back();else render(true);toast('Gioco rimosso dalla libreria');},
  'launch-method':()=>{const g=detailGame||selected,current=state.settings.launchMethods?.[activeCopy(g)?.id]||'auto';openPanel('Metodo di avvio',`<p>Nova sceglie da sola la strada più diretta. Cambia solo se un gioco non parte come ti aspetti.</p>${[['auto','Automatico','Eseguibile quando basta, store in background quando serve'],['direct','Diretto','Avvia sempre l’eseguibile del gioco'],['store','Tramite lo store','Lascia avviare il gioco al suo client']].map(([id,title,sub])=>row(title,'',current===id?'check':'play',sub,`data-launch-method="${id}"`)).join('')}<p class="note">Licenze, accesso online e anti-cheat restano gestiti dallo store: se un gioco li richiede, il suo client si apre comunque.</p>`);},
  'resume-game':async()=>{allPanelsClosed();await call('resumeGame');},
  'session-audio':()=>devicePanel('audio'),
  'diagnostics':diagnostics,
  'downloads':openDownloads,
  'open-download':el=>{const g=game(el.dataset.game);if(g){allPanelsClosed();openDetails(g);}}
 };
 /* ── Downloads: a ring in the header that fills up, and a list behind it ── */
 let downloadState={items:[],active:0,progress:0},downloadTimer=0;
 const percent=v=>Math.round(v*100)+'%';
 function paintDownloads(){
  const button=$('#downloads-toggle');if(!button)return;
  const value=downloadState.active?Math.max(2,Math.round(downloadState.progress*100)):0;
  button.querySelector('.ring-value')?.setAttribute('stroke-dasharray',value+' 100');
  button.classList.toggle('is-active',downloadState.active>0);
  const label=downloadState.active?'Download · '+percent(downloadState.progress):'Download';
  button.setAttribute('aria-label',label);button.title=label;
 }
 function downloadsMarkup(){
  const items=downloadState.items;
  if(!items.length)return '<div class="empty"><h3>Nessun download in corso</h3><p>I download di Steam e Hydra compaiono qui mentre sono attivi.</p></div>';
  return '<div class="download-list">'+items.map(d=>`<button class="download-row" data-action="${d.gameId?'open-download':''}" data-game="${esc(d.gameId||'')}" ${d.gameId?'':'disabled'}>${d.cover?`<img src="${esc(d.cover)}" alt="" loading="lazy" draggable="false">`:`<span class="download-fallback">${icon('download')}</span>`}<span class="download-copy"><strong>${esc(d.title)}</strong><small><span>${esc(d.source)}</span><span>${d.status==='paused'?'In pausa':'In download'}</span></small><i class="download-bar"><i style="width:${Math.round(d.progress*100)}%"></i></i></span><b class="download-percent">${percent(d.progress)}</b></button>`).join('')+'</div>';
 }
 async function refreshDownloads(){
  clearTimeout(downloadTimer);
  const open=panels.at(-1)?.kind==='downloads';
  if(!gate()&&(!document.hidden||open)){
   try{
    const next=await window.nova.call('downloads'),changed=JSON.stringify(next)!==JSON.stringify(downloadState);
    downloadState=next;paintDownloads();
    if(changed&&panels.at(-1)?.kind==='downloads'){const body=$('#panel .panel-body'),focus=captureFocus(),top=body?.scrollTop||0;if(body){body.innerHTML=downloadsMarkup();body.scrollTop=top;if(!restoreFocus(focus))focusFirst();}}
   }catch{}
  }
  /* Quick while something is downloading or the list is open, relaxed otherwise. */
  downloadTimer=setTimeout(refreshDownloads,downloadState.active||panels.at(-1)?.kind==='downloads'?4000:20000);
 }
 function openDownloads(){openPanel('Download',downloadsMarkup);panels.at(-1).kind='downloads';refreshDownloads();}
 downloadTimer=setTimeout(refreshDownloads,3000);
 const baseAct=act;
 act=async function(name,el){
  if(name==='play'){if(!canActivateGameAction(el))return;const g=detailGame||selected;if(g)await playGame(game(g.id)||g);return;}
  if(Object.prototype.hasOwnProperty.call(handlers,name))return handlers[name](el);
  return baseAct(name,el);
 };
 const baseOptions=gameOptionsMarkup;
 gameOptionsMarkup=function(g){
  const copy=activeCopy(g);let html=baseOptions(g);
  if(copy?.installed){const method=state.settings.launchMethods?.[copy.id]||'auto';html+=`<div class="panel-section"><h3>Avvio</h3>${row('Metodo di avvio','launch-method','play',{auto:'Automatico · la strada più diretta',direct:'Diretto · eseguibile del gioco',store:'Tramite lo store'}[method])}${g.copies?.some(c=>c.source==='Locale')?row('Rimuovi il gioco aggiunto a mano','remove-local-game','close','Il gioco resta installato sul disco'):''}</div>`;}
  return html;
 };

 /* ── Hints: what the focused element does, on the device in use ────────── */
 function contextHints(){
  const g=focusedGame(),sections=hint('lb','')+hint('rb','Sezioni'),pages=hint('lt','')+hint('rt','Pagine');
  if(detailGame)return hint('a','Seleziona')+hint('b','Indietro')+hint('x',playState(game(detailGame.id)||detailGame).text)+hint('menu','Opzioni')+hint('lb','')+hint('rb','Cambia scheda');
  if(g&&page==='home'&&lower<0){const quick=quickPlayTarget(document.activeElement);return hint('a',quick?playState(g).text:'Dettagli')+(quick?hint('x','Dettagli'):'')+hint('y','Cerca')+hint('menu','Opzioni')+sections;}
  if(g&&page==='library')return hint('a','Dettagli')+hint('x',playState(g).text)+hint('y','Cerca')+hint('menu','Opzioni')+pages;
  return hint('a','Seleziona')+hint('b','Indietro')+hint('y','Cerca')+hint('view','Comandi')+(page==='home'?sections:page==='explore'?hint('lb','')+hint('rb','Cambia scheda'):pages);
 }
 const basePrompts=prompts;
 prompts=function(){basePrompts();if(panels.length||gate())return;const hints=$('#footer .hints');if(hints)hints.innerHTML=contextHints();};
 let hintFrame=0;
 document.addEventListener('focusin',()=>{if(hintFrame||panels.length)return;hintFrame=requestAnimationFrame(()=>{hintFrame=0;if(panels.length||gate())return;const hints=$('#footer .hints'),next=contextHints();if(hints&&hints.innerHTML!==next)hints.innerHTML=next;});});
 /* Coming back from a game: whatever was covering the interface is cleared. */
 window.addEventListener('focus',()=>{if(veilVisible()&&veil.dataset.state==='running')hideVeil();});

 window.novaShell={key:onKey,pad:onPad,padCapture,sessionsChanged,summoned,playGame,openSearch,openHelp,bindings};
 /* The library can arrive before this file is read: redraw once so Home uses the layout above. */
 if(state.games.length&&!panels.length&&!detailGame)render(true);
})();
