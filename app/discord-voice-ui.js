'use strict';
/* Discord inside Nova: servers with their icons, voice channels with who is inside, the current call
   (server, group or private), joining and leaving, microphone control, and a menu for every friend.
   Voice runs in the Discord adapter through the local Discord client; this file only shows and commands it. */
(()=>{
 let voice={linked:false,capable:false,ready:false,guilds:[],call:null},opened=new Set(),busy=false,starting=false,lastSignature='';
 const raw=(action,payload)=>window.nova.call(action,payload);
 const inCall=()=>!!voice.call;
 const panelKind=()=>panels.at(-1)?.kind;
 const clean=e=>String(e?.message||e).replace(/^Error invoking remote method '[^']+': Error: /,'');
 const guildById=id=>(voice.guilds||[]).find(g=>g.id===id);
 const initial=name=>esc(String(name||'?').trim().charAt(0).toUpperCase());
 const signature=()=>JSON.stringify([voice.linked,voice.capable,voice.ready,voice.guildsLoaded,voice.error,voice.selfMute,voice.selfDeaf,voice.call,(voice.guilds||[]).map(g=>[g.id,g.name,g.icon,(g.channels||[]).map(c=>[c.id,c.name,(c.members||[]).map(m=>m.id+m.mute)])])]);
 const memberAvatar=m=>`<img class="voice-avatar${m.mute?' is-muted':''}" src="${esc(m.avatar)}" alt="${esc(m.name)}" title="${esc(m.name)}" draggable="false" loading="lazy">`;
 function callKind(call){
  if(call.type===1)return 'Chiamata privata';
  if(call.type===3)return 'Chiamata di gruppo';
  return guildById(call.guildId)?.name||'Discord';
 }
 async function refresh(){
  try{voice=await raw('discordVoice');}catch{voice={...voice,fresh:false,call:null};}
  document.body.dataset.call=inCall()?'on':'';
  const sig=signature();
  if(sig!==lastSignature){lastSignature=sig;if(['discord','friend-menu'].includes(panelKind())||panels.at(-1)?.title==='Audio')drawPanel();}
 }
 async function command(payload,message,quiet=false){
  if(busy&&!quiet)return;busy=true;
  try{voice=await raw('discordVoiceCommand',payload);document.body.dataset.call=inCall()?'on':'';lastSignature=signature();if(message)toast(message);if(panels.length)drawPanel();}
  catch(e){if(!quiet)toast(clean(e));}
  finally{busy=false;}
 }

 /* Current call: server channel, group call or private call, with everyone who is in it. */
 function callCard(compact=false){
  if(!inCall())return '';
  const call=voice.call,people=call.members||[];
  return `<div class="call-card${compact?' compact':''}" role="group" aria-label="Chiamata Discord"><div class="call-card-head"><span class="call-card-icon">${icon('store:Discord')}</span><span class="call-card-copy"><strong>${esc(call.name||'Chiamata Discord')}</strong><small>${esc(callKind(call))} · In chiamata${people.length?` · ${people.length}`:''}</small></span></div>${people.length?`<div class="voice-people">${people.slice(0,compact?6:16).map(m=>`<span class="voice-person">${memberAvatar(m)}<span>${esc(m.name)}</span></span>`).join('')}</div>`:''}<div class="call-actions"><button class="action ${voice.selfMute?'is-off':''}" data-action="discord-mute" aria-pressed="${!!voice.selfMute}">${icon('audio')}${voice.selfMute?'Attiva microfono':'Disattiva microfono'}</button><button class="action ${voice.selfDeaf?'is-off':''}" data-action="discord-deafen" aria-pressed="${!!voice.selfDeaf}">${voice.selfDeaf?'Riattiva audio':'Audio spento'}</button><button class="action danger" data-action="discord-leave">${icon('close')}Esci dalla chiamata</button></div></div>`;
 }
 function channelMarkup(channel,active){
  const members=channel.members||[],shown=members.slice(0,5),extra=members.length-shown.length;
  return `<button class="discord-channel${active?' is-active':''}" data-action="discord-join" data-channel="${esc(channel.id)}" ${active?'aria-current="true"':''}>${icon('audio')}<span class="discord-channel-name"><strong>${esc(channel.name)}</strong><small>${channel.stage?'Palco':'Canale vocale'}${active?' · Connesso':''}</small></span><span class="voice-stack">${shown.map(memberAvatar).join('')}${extra>0?`<span class="voice-more">+${extra}</span>`:''}</span></button>`;
 }
 function guildMarkup(guild){
  const open=opened.has(guild.id),channels=guild.channels||[],activeId=voice.call?.id,inside=channels.reduce((n,c)=>n+(c.members||[]).length,0);
  return `<div class="discord-guild"><button class="discord-guild-head" data-discord-guild="${esc(guild.id)}" aria-expanded="${open}">${guild.icon?`<img class="discord-guild-icon" src="${esc(guild.icon)}" alt="" draggable="false" loading="lazy">`:`<span class="discord-guild-initial" aria-hidden="true">${initial(guild.name)}</span>`}<span class="discord-guild-name">${esc(guild.name)}</span>${inside?`<span class="call-chip">${inside}</span>`:''}<small>${channels.length}</small><span class="discord-chevron" aria-hidden="true"></span></button>${open?`<div class="discord-channels">${channels.length?channels.map(c=>channelMarkup(c,activeId===c.id)).join(''):'<p class="note">Nessun canale vocale.</p>'}</div>`:''}</div>`;
 }
 function discordMarkup(){
  if(starting)return skeletonMarkup('rows',3);
  if(!voice.linked)return `<div class="empty"><h3>Discord non collegato</h3><p>Collega Discord per vedere server e canali vocali.</p></div>${row('Discord','connect-discord','store:Discord','Collega il tuo account direttamente a Nova')}`;
  if(!voice.capable)return `<div class="empty"><h3>Chiamate non abilitate</h3><p>Per entrare nei canali vocali Nova ha bisogno dell’accesso vocale di Discord. Ricollega il tuo account per concedere il permesso.</p></div>${row('Abilita le chiamate','discord-reauth','store:Discord','Si apre la finestra di Discord')}`;
  const guilds=voice.guilds||[],listed=guilds.filter(g=>(g.channels||[]).length);
  return callCard()
   +`<div class="identity-heading"><h3>Server e canali vocali</h3><button class="action" data-action="discord-refresh">${icon('refresh')}Aggiorna elenco</button></div>`
   +(voice.error?`<p class="note">${esc(voice.error)}</p>`:'')
   +(!voice.guildsLoaded&&!guilds.length?skeletonMarkup('rows',3):listed.length?listed.map(guildMarkup).join(''):voice.guildsLoaded?'<p class="note">Nessun server con canali vocali.</p>':'');
 }
 let watchTimer=null;
 function watchOpenGuilds(){
  clearInterval(watchTimer);
  watchTimer=setInterval(()=>{if(panelKind()!=='discord'){clearInterval(watchTimer);watchTimer=null;return;}for(const id of opened)command({action:'members',guild:id},'',true);refresh();},6000);
 }
 async function showDiscord(){
  starting=true;openPanel('Discord',discordMarkup,true);panels.at(-1).kind='discord';watchOpenGuilds();
  try{voice=await raw('discordOpen');}catch(e){toast(clean(e));await refresh();}
  finally{starting=false;if(panelKind()==='discord')drawPanel();}
  if(voice.capable&&voice.ready&&!(voice.guilds||[]).length)await command({action:'guilds'},'',true);
 }

 /* Friend menu */
 function personFor(key){return socialPeople().find(p=>(p.store||'Discord')+':'+p.id===key);}
 function friendMenuMarkup(person){
  const accounts=person.accounts||[person],discord=accounts.find(a=>(a.store||'Discord')==='Discord'),steam=accounts.find(a=>a.store==='Steam');
  return `<div class="profile-card"><span class="profile-card-avatar" aria-hidden="true">${person.avatar?`<img src="${esc(person.avatar)}" alt="">`:esc(String(person.name||'?').charAt(0).toUpperCase())}</span><span class="profile-card-copy"><strong>${esc(person.name)}</strong><small>${esc(friendStatus(person))}${person.game?' · '+esc(person.game):''}</small></span><span class="profile-card-chip">${esc(person.store||'Discord')}</span></div>`
   +`<div class="panel-section"><h3>Discord</h3>${discord?row('Chiama su Discord','discord-call-friend','audio','Apre la conversazione in Discord',`data-discord-id="${esc(discord.id)}"`):'<p class="note">Questo amico non ha un profilo Discord collegato.</p>'}${inCall()?callCard(true):''}</div>`
   +(steam?`<div class="panel-section"><h3>Steam</h3>${row('Apri profilo Steam','steam-friend-profile','store:Steam','',`data-steam-id="${esc(steam.id)}"`)}</div>`:'');
 }
 function openFriendMenu(element){
  const person=personFor(element.dataset.friend);if(!person)return;
  openPanel(person.name,()=>friendMenuMarkup(person));panels.at(-1).kind='friend-menu';
  refresh();
 }

 const previousAct=act;
 act=async function(action,el){
  if(action==='open-discord-voice'){await showDiscord();return;}
  if(action==='discord-join'&&el?.dataset.channel){await command({action:'join',channel:el.dataset.channel},'Entrato nel canale vocale');return;}
  if(action==='discord-leave'){await command({action:'leave'},'Chiamata terminata');return;}
  if(action==='discord-mute'){await command({action:'mute',value:!voice.selfMute},voice.selfMute?'Microfono attivo':'Microfono disattivato');return;}
  if(action==='discord-deafen'){await command({action:'deafen',value:!voice.selfDeaf});return;}
  if(action==='discord-refresh'){await command({action:'guilds'});return;}
  if(action==='discord-reauth'){await call('discordLogin',{voice:true});toast('Completa il collegamento nella finestra Discord');return;}
  if(action==='discord-call-friend'&&el?.dataset.discordId){await call('discordCallFriend',{id:el.dataset.discordId});toast('Apro la conversazione in Discord');return;}
  if(action==='steam-friend-profile'&&el?.dataset.steamId){await call('external',{url:'steam://url/SteamIDPage/'+encodeURIComponent(el.dataset.steamId)});return;}
  return previousAct(action,el);
 };

 /* Entry points: the Discord button in the header, friend rows, and the audio settings. */
 const toggle=document.getElementById('discord-toggle');
 if(toggle)toggle.innerHTML=icon('store:Discord');
 const previousDeviceMarkup=deviceMarkup;
 deviceMarkup=function(kind,data){const html=previousDeviceMarkup(kind,data);return kind==='audio'&&inCall()?callCard(true)+html:html;};
 const previousConfirm=confirm;
 confirm=function(){const current=document.activeElement;if(current?.matches?.('[data-friend]')&&panelKind()==='friends'){window.novaSounds?.play('confirm');openFriendMenu(current);return;}return previousConfirm();};
 document.addEventListener('click',e=>{
  const guild=e.target.closest?.('[data-discord-guild]');
  if(guild){const id=guild.dataset.discordGuild;if(opened.has(id))opened.delete(id);else{opened.add(id);command({action:'members',guild:id},'',true);}drawPanel();return;}
  const friend=e.target.closest?.('.friend-row[data-friend]');
  if(friend&&panelKind()==='friends')openFriendMenu(friend);
 });
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[data-friend]')&&panelKind()==='friends'){e.preventDefault();openFriendMenu(e.target);}});
 setInterval(()=>{if(voice.linked||state.discord?.status==='ready')refresh();},5000);
 window.novaDiscordVoice={refresh,get state(){return voice;}};
})();
