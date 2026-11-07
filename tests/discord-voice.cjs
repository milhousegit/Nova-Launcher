var assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('../node_modules/jsdom');
var app=name=>fs.readFileSync(path.join(__dirname,'../app',name),'utf8');

// The UI: header button, server list with icons, channels with members, call card, friend menu.
var dom=new JSDOM('<html><body><button id="discord-toggle"></button><main id="main"></main></body></html>',{runScripts:'outside-only',url:'https://fixture.invalid'}),w=dom.window;
var ev=code=>JSON.parse(JSON.stringify(w.eval(code)));
w.eval(`var calls=[],toasts=[],drawn=0,panels=[];
var state={discord:{status:'ready',friends:[{id:'111',store:'Discord',name:'Anna',avatar:'',status:0},{id:'765',store:'Steam',name:'Bruno',status:0}]},settings:{friendGroups:[]}};
var esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
var icon=n=>'<svg data-icon="'+n+'"></svg>';var row=(text,action,ic,sub,extra)=>'<button class="row-action" data-action="'+action+'" '+(extra||'')+'>'+text+'</button>';
var skeletonMarkup=()=>'<i></i>';var toast=v=>toasts.push(v);var drawPanel=()=>{drawn++};var friendStatus=()=>'Online';
var socialPeople=()=>state.discord.friends;
var openPanel=(title,build,wide)=>{panels.push({title,build,wide});};
var call=async(a,p)=>{calls.push([a,p]);return true;};
var deviceMarkup=(kind)=>'<div id="devices"></div>';var confirm=()=>'base';var act=async()=>'base';
window.nova={call:async(a,p)=>{calls.push([a,p]);if(a==='discordVoice'||a==='discordOpen')return window.fixtureVoice;if(a==='discordVoiceCommand'){window.fixtureVoice=Object.assign({},window.fixtureVoice,window.fixtureAfter);return window.fixtureVoice;}return true;}};
var anna={id:'111',name:'Anna',avatar:'https://cdn.example/anna.png',mute:true},bruno={id:'112',name:'Bru',avatar:'https://cdn.example/bru.png',mute:false};
window.fixtureVoice={linked:true,capable:true,ready:true,fresh:true,guildsLoaded:true,guilds:[{id:'1',name:'Squad',icon:'https://cdn.example/icon.png',channels:[{id:'10',name:'General',stage:false,members:[anna,bruno]},{id:'11',name:'Chill',stage:false,members:[]}]},{id:'2',name:'Retro',icon:'',channels:[{id:'20',name:'Arcade',stage:false,members:[]}]}],call:null,selfMute:false,selfDeaf:false};`);
w.eval(app('discord-voice-ui.js'));
assert(w.document.getElementById('discord-toggle').innerHTML.includes('store:Discord'),'the header button carries the Discord mark');
assert(app('index.html').indexOf('id="discord-toggle"')>app('index.html').indexOf('id="friends-toggle"'),'the Discord button comes right after the friends button');
(async()=>{
 await w.eval("act('open-discord-voice')");
 var panel=w.eval('panels.at(-1)');assert(ev('calls').some(c=>c[0]==='discordOpen'),'Opening the panel starts or reuses the desktop client');assert.equal(panel.title,'Discord');assert.equal(panel.wide,true);
 var html=w.eval('panels.at(-1).build()');
 assert(html.includes('src="https://cdn.example/icon.png"')&&html.includes('Retro')&&html.includes('discord-guild-initial'),'servers show their icon, or an initial without one');
 assert(!html.includes('General'),'channels stay folded until a server is opened');
 // Opening a server shows its channels with the people inside, and asks for fresh members.
 w.document.body.innerHTML='<button data-discord-guild="1">x</button>';w.document.querySelector('[data-discord-guild]').click();await new Promise(r=>setTimeout(r,20));
 assert(ev("calls.filter(c=>c[0]==='discordVoiceCommand').map(c=>c[1])").some(c=>c.action==='members'&&c.guild==='1'));
 html=w.eval('panels.at(-1).build()');
 assert(html.includes('data-action="discord-join" data-channel="10"')&&html.includes('src="https://cdn.example/anna.png"')&&html.includes('src="https://cdn.example/bru.png"')&&html.includes('voice-avatar is-muted'),'channel rows show avatars of who is inside, muted ones dimmed');
 // Joining a voice channel: one command, then the call card lists everyone in it.
 w.eval('window.fixtureAfter={call:{id:"10",name:"General",type:2,guildId:"1",members:[{id:"111",name:"Anna",avatar:"https://cdn.example/anna.png",mute:false}]}}');
 await w.eval("act('discord-join',{dataset:{channel:'10'}})");
 assert.deepEqual(ev("calls.filter(c=>c[0]==='discordVoiceCommand').at(-1)[1]"),{action:'join',channel:'10'});
 html=w.eval('panels.at(-1).build()');assert(html.includes('data-action="discord-mute"')&&html.includes('data-action="discord-leave"')&&html.includes('Squad · In chiamata')&&html.includes('Anna'));
 // A private call is shown the same way, labelled as private.
 w.eval('window.fixtureAfter={call:{id:"9001",name:"Anna",type:1,guildId:"",members:[{id:"111",name:"Anna",avatar:"https://cdn.example/anna.png",mute:false}]}}');
 await w.eval("act('discord-join',{dataset:{channel:'9001'}})");
 html=w.eval('panels.at(-1).build()');assert(html.includes('Chiamata privata · In chiamata')&&html.includes('data-action="discord-leave"'),'any call is listed, private ones included');
 // Muting toggles from the current state; the audio settings carry the same controls.
 w.eval('window.fixtureAfter={selfMute:true}');await w.eval("act('discord-mute')");
 assert.deepEqual(ev("calls.filter(c=>c[0]==='discordVoiceCommand').at(-1)[1]"),{action:'mute',value:true});
 assert(w.eval("deviceMarkup('audio')").includes('data-action="discord-leave"')&&!w.eval("deviceMarkup('wifi')").includes('discord-leave'));
 w.eval('window.fixtureAfter={call:null}');await w.eval("act('discord-leave')");
 assert.equal(ev("calls.filter(c=>c[0]==='discordVoiceCommand').at(-1)[1].action"),'leave');
 assert(!w.eval("deviceMarkup('audio')").includes('discord-leave'));
 // Without the voice permission the panel asks to reconnect.
 w.eval('window.fixtureVoice=Object.assign({},window.fixtureVoice,{capable:false})');await w.eval('novaDiscordVoice.refresh()');
 assert(w.eval('panels.at(-1).build()').includes('data-action="discord-reauth"'));
 await w.eval("act('discord-reauth')");assert.deepEqual(ev('calls.at(-1)'),['discordLogin',{voice:true}]);
 // Friend menu.
 await w.eval("act('discord-call-friend',{dataset:{discordId:'111'}})");assert.deepEqual(ev('calls.at(-1)'),['discordCallFriend',{id:'111'}]);
 await w.eval("act('steam-friend-profile',{dataset:{steamId:'765'}})");assert.deepEqual(ev('calls.at(-1)'),['external',{url:'steam://url/SteamIDPage/765'}]);
 w.eval("panels.push({kind:'friends',title:'Amici'})");
 w.document.body.innerHTML='<div class="friend-row" data-friend="Discord:111"></div><div class="friend-row" data-friend="Steam:765"></div>';
 w.document.querySelector('[data-friend="Discord:111"]').click();
 assert.equal(w.eval('panels.at(-1).title'),'Anna');var anna=w.eval('panels.at(-1).build()');assert(anna.includes('data-action="discord-call-friend"')&&anna.includes('data-discord-id="111"')&&!anna.includes('steam-friend-profile'));
 w.eval("panels.push({kind:'friends',title:'Amici'})");w.document.querySelector('[data-friend="Steam:765"]').click();
 var bruno=w.eval('panels.at(-1).build()');assert.equal(w.eval('panels.at(-1).title'),'Bruno');assert(bruno.includes('steam-friend-profile')&&bruno.includes('data-steam-id="765"')&&!bruno.includes('discord-call-friend')&&bruno.includes('non ha un profilo Discord'));

 // Main process: commands are validated before they reach the adapter.
 var main=app('main.cjs');
 assert(main.includes("case 'discordVoiceCommand'")&&main.includes("const actions=['guilds','members','join','leave','mute','deafen']"));
 assert(main.includes("/^\\d{5,25}$/.test(String(p.channel||''))")&&main.includes("/^\\d{5,25}$/.test(String(p.guild||''))"),'channel and server ids must be numeric');
 assert(main.includes("'discord://-/users/'+p.id"));
 // The adapter talks to the local Discord client; it only runs after the voice permission is granted.
 var cs=fs.readFileSync(path.join(__dirname,'../tools/discord/DiscordVoice.cs'),'utf8'),adapter=fs.readFileSync(path.join(__dirname,'../tools/discord/DiscordAdapter.cs'),'utf8');
 assert(cs.includes('SELECT_VOICE_CHANNEL')&&cs.includes('GET_SELECTED_VOICE_CHANNEL')&&cs.includes('"rpc.voice.read"'));
 assert(adapter.includes('if(voice)StartVoice()')&&adapter.includes('rpc rpc.voice.read rpc.voice.write'));
 dom.window.close();
 console.log('PASS: header Discord button, server icons, channel members with avatars, any call including private ones, joining, microphone control, friend menu and command validation.');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});

{const transport=app('main.cjs'),source=fs.readFileSync(path.join(__dirname,'../tools/discord/DiscordVoice.cs'),'utf8');assert(source.includes('pipe.Write(frame,0,frame.Length)'));assert(!source.includes('pipe.Write(head,0,8)'));assert(source.includes('catch{c.Dispose();throw;}'));assert(transport.includes('i<150'));}
