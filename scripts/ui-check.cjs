/* Drives the real renderer (index.html and every script) in Chromium with a stand-in for the main process. */
const {chromium}=require('playwright'),path=require('path'),assert=require('assert/strict');
/* Usage: node scripts/ui-check.cjs [app folder] [screenshot folder]. Needs Playwright with Chromium; it is not part of npm test. */
const app=path.resolve(process.argv[2]||path.join(__dirname,'../app')),out=path.resolve(process.argv[3]||path.join(require('os').tmpdir(),'nova-ui-check'));require('fs').mkdirSync(out,{recursive:true});
const init=()=>{
 const svg=(a,b)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/></svg>`);
 const palette=[['#7c3aed','#0f172a'],['#0ea5e9','#082f49'],['#f97316','#431407'],['#10b981','#022c22'],['#e11d48','#1c0a12'],['#eab308','#1c1917'],['#6366f1','#111827'],['#14b8a6','#0b1013']];
 const titles=['Hollow Vale','Starbound Drift','Iron Meridian','Paper Lanterns','Echoes of Tide','Night Circuit','Ember Crown','Quiet Harbor','Glass Frontier','Wild Atlas','Signal Lost','Moss & Stone','Ninth Orbit','Copper Sky','Lumen','Deep Archive','Saltwind','Red Canyon','Kite Season','Low Tide','Arclight','Northbound','Pale Garden','Halcyon','Driftwood','Outer Ring','Sundial','Marrow','Tessellate','Vantage'];
 const games=titles.map((title,i)=>({id:'g'+i,title,steamId:String(1000+i),cover:svg(...palette[i%8]),hero:svg(palette[(i+3)%8][0],'#0b1013'),description:'A short description of '+title+' for the home screen.',genres:['Adventure'],screenshots:[],achievements:[],achievementTotal:20,achievementUnlocked:i%7,playtime:i<12?(30-i)*3600:0,lastPlayed:i<12?new Date(Date.now()-i*86400000).toISOString():'',installed:i%4!==3,sources:[i%3?'Steam':'GOG'],copies:[{id:'c'+i,source:i%3?'Steam':'GOG',installed:i%4!==3}],selectedSource:{id:'c'+i,source:i%3?'Steam':'GOG',installed:i%4!==3,executableExists:true,folderExists:true}}));
 const settings={platform:'win32',fullscreen:true,startupMode:'bigscreen',accent:'#c4a4ff',novaAccount:{connected:false,required:false},console:{autostart:false,autostartSupported:true,returnToNova:true,quickPlay:true,quietNotifications:false,quietSupported:true,summon:'Control+Alt+Home',settingsPages:['home','network','display','sound','update']},shortcuts:{},launchMethods:{},storeDiscovery:{},friendGroups:[],uiSounds:false,steamQR:{},platformAccounts:{epic:{},ubisoft:{}},hydraAccount:{},gog:{}};
 const calls=[],listeners=[];
 window.__calls=calls;window.__push=v=>listeners.forEach(l=>l(v));
 window.nova={onUpdate:cb=>{listeners.push(cb);},call:async(action,p={})=>{calls.push([action,p]);switch(action){
  case 'library':return {games,apps:[],news:[],discord:{status:'not_connected',friends:[]},settings,sessions:{},initializing:false};
  case 'launch':window.__sessions={[p.id]:{id:p.id,state:'launching'}};return {message:'Avvio da Steam',state:'launching',method:'uri'};
  case 'sessions':return {running:window.__running||[],sessions:window.__sessions||{}};
  case 'shortcutsSave':settings.shortcuts=p;return p;
  case 'consoleSet':Object.assign(settings.console,p);return settings.console;
  case 'diagnostics':return {boot:{start:0,window:310,interface:640,profile:900,library:2400},memoryMB:284,cpu:0.6,processes:4,pollMs:10000};
  case 'friends':return {status:'not_connected',friends:[]};
  case 'collectionsSave':settings.collections=p.collections;return p.collections;
  case 'storage':return {drives:[{id:'C:',name:'System',total:1e12,free:3.2e11},{id:'D:',name:'Games',total:2e12,free:1.4e12}],measuring:false,games:games.filter(g=>g.installed).slice(0,9).map((g,i)=>({id:g.id,title:g.title,cover:g.cover,source:g.sources[0],drive:i%2?'D:':'C:',size:(90-i*9)*1e9}))};
  case 'systemUpdates':return {supported:true,rebootRequired:false,system:[{title:'2026-11 Cumulative Update for Windows 11 (KB5070000)',size:6.2e8,downloaded:true}],drivers:[{title:'AMD - Display - 32.0.21025.1',size:8.4e8},{title:'Realtek - Net - 10.72.524.2024',size:1.2e7}]};
  case 'downloads':return {items:[{id:'steam:1004',gameId:'g4',title:'Echoes of Tide',source:'Steam',cover:games[4].cover,progress:.62,status:'active'},{id:'hydra:9',gameId:'g9',title:'Wild Atlas',source:'Hydra',cover:games[9].cover,progress:.18,status:'paused'}],active:1,progress:.62};
  case 'discordOpen':case 'discordVoice':case 'discordVoiceCommand':{const person=(id,name,mute)=>({id,name,mute,avatar:svg('#64748b','#1e293b')});return {linked:true,capable:true,ready:true,fresh:true,guildsLoaded:true,selfMute:false,selfDeaf:false,call:{id:'c1',guildId:'s1',name:'Lobby',type:0,members:[person('1','Marta'),person('2','Luca',true),person('3','Giulia')]},guilds:[{id:'s1',name:'Serata giochi',channels:[{id:'c1',name:'Lobby',members:[person('1','Marta'),person('2','Luca',true),person('3','Giulia')]},{id:'c2',name:'Coop',members:[]}]},{id:'s2',name:'Amici di sempre',channels:[{id:'c3',name:'Generale',members:[person('4','Paolo')]}]}]};}
  case 'explore':case 'exploreCached':return null;
  case 'activity':return {id:p.id};case 'details':return games.find(g=>g.id===p.id);
  default:return [];}}};
 /* A controller whose buttons the test can press. */
 const pad={id:'Xbox 360 Controller (XInput STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
 window.__pad=pad;navigator.getGamepads=()=>[pad];
};
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!/Content Security Policy|ERR_FILE_NOT_FOUND|net::/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(init);
 await page.goto('file://'+path.join(app,'index.html'));
 await page.waitForSelector('#recent-rail .game-card');await page.waitForTimeout(900);
 const text=s=>page.evaluate(q=>document.querySelector(q)?.textContent.trim()||'',s);
 const calls=name=>page.evaluate(n=>window.__calls.filter(c=>c[0]===n),name);
 const press=async(index,ms=60)=>{await page.evaluate(i=>{window.__pad.buttons[i]={pressed:true,value:1};},index);await page.waitForTimeout(ms);await page.evaluate(i=>{window.__pad.buttons[i]={pressed:false,value:0};},index);await page.waitForTimeout(ms);};

 if(errors.length)console.log('ERRORS',errors);
 /* 1. Home */
 assert.equal(await page.locator('#recent-rail .game-card').count(),24,'Home shows a bounded rail, not the whole library');
 assert.equal(await page.locator('#recent-rail .rail-more').count(),1);
 assert.equal(await page.locator('.hero-chip,.hero-continue,.card-continue').count(),0,'no status chips on Home');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.footer-status .nova-wordmark')).display),'none');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.game),'g0','focus starts on the most recent game');
 assert.equal(await text('.hero [data-action=play]'),'Play');
 const cardWidth=await page.evaluate(()=>document.querySelector('#recent-rail .game-card').getBoundingClientRect().width);
 assert(cardWidth>=200,'covers are large at 1080p: '+cardWidth);
 const hints=await text('#footer .hints');assert(/Play/.test(hints)&&/Search/.test(hints),'contextual hints: '+hints);
 assert.equal(await page.locator('.home .home-tabs').count(),0,'News and Apps are pages of the top menu, not tabs on Home');
 assert.equal(await page.locator('.home .down').count(),0);
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('header nav button')].map(b=>b.dataset.page)),['home','library','explore','news','apps','profile','settings'],'one menu at the top for every page');
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('header nav [data-prompt]')].map(e=>e.dataset.prompt)),['lt','rt'],'the triggers sit on the two sides of the menu');
 await page.screenshot({path:path.join(out,'01-home.png')});

 /* 2. One press starts the game; states follow the session */
 await page.keyboard.press('Enter');await page.waitForTimeout(150);
 assert.equal((await calls('launch')).length,1,'Enter on the selected game launches it');
 assert.equal(await page.evaluate(()=>document.getElementById('launch-veil').hidden),false);
 assert.equal(await text('.veil-state'),'Starting…');
 await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'02-launching.png')});
 await page.keyboard.press('Enter');await page.keyboard.press('x');await page.waitForTimeout(100);
 assert.equal((await calls('launch')).length,1,'input is held while the game starts: no double launch');
 await page.keyboard.press('Escape');await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>document.getElementById('launch-veil').hidden),true,'Back hides the veil');
 assert.equal(await text('.hero [data-action=play]'),'Starting…');
 await page.keyboard.press('Enter');await page.waitForTimeout(80);
 assert.equal((await calls('launch')).length,1,'pressing again while starting only shows the veil');
 await page.evaluate(()=>{window.__sessions={g0:{id:'g0',state:'running'}};window.__running=['g0'];window.__push({running:['g0'],sessions:window.__sessions,sessionEvent:{event:'running',id:'g0'}});});
 await page.waitForTimeout(120);
 assert.equal(await text('.veil-state'),'Running');
 await page.keyboard.press('Escape');await page.waitForTimeout(80);
 assert.equal(await text('.hero [data-action=play]'),'Running');
 assert.equal(await text('#recent-rail .card-state'),'Running');
 await page.keyboard.press('Enter');await page.waitForTimeout(120);
 assert.equal(await text('#panel-title'),'Hollow Vale','a running game opens its session menu instead of launching again');
 assert.equal(await page.locator('#panel [data-action=resume-game]').count(),1);
 await page.screenshot({path:path.join(out,'03-session-menu.png')});
 await page.evaluate(()=>{window.__sessions={};window.__running=[];window.__push({running:[],sessions:{},sessionEvent:{event:'ended',id:'g0'}});});
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.getElementById('overlay').hidden),true,'the session menu closes when the game ends');
 assert.equal(await text('.hero [data-action=play]'),'Play');

 /* 3. The top menu with Q/E and the controller bumpers */
 const active=()=>text('header nav button.active');
 await press(7);await page.waitForTimeout(350);assert.equal(await active(),'Library','RT moves to the next page of the menu');
 assert.equal(await page.evaluate(()=>document.body.dataset.input),'xbox');
 assert(/LT/.test(await text('header nav'))&&/RT/.test(await text('header nav')),'trigger glyphs follow the device');
 await press(7);await page.waitForTimeout(350);await press(7);await page.waitForTimeout(350);assert.equal(await active(),'News');
 assert.equal(await page.locator('.section-page[data-section=news]').count(),1,'News is its own page');
 await press(7);await page.waitForTimeout(350);assert.equal(await active(),'Apps');assert.equal(await page.locator('.section-page[data-section=apps] .client').count(),8);
 for(let i=0;i<4;i++){await press(6);await page.waitForTimeout(350);}
 assert.equal(await active(),'Home','LT walks back to Home');assert.equal(await page.locator('#recent-rail').count(),1);
 await page.locator('#recent-rail .game-card[data-game=g0]').focus();await page.waitForTimeout(100);

 /* 4. Controller: A launches from Home, Y searches, X plays from the library, Menu opens options */
 await press(15,80);await page.waitForTimeout(120);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.game),'g1');
 await press(0);await page.waitForTimeout(150);
 assert.deepEqual((await calls('launch')).at(-1)[1],{id:'g1'},'A starts the focused game');
 await press(1);await page.waitForTimeout(80);
 await page.evaluate(()=>{window.__sessions={};window.__push({sessions:{},running:[],sessionEvent:{event:'cleared',id:'g1'}});});await page.waitForTimeout(100);
 await press(2);await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.body.dataset.page),'details','X opens details from Home');
 await press(1);await page.waitForTimeout(300);
 await press(3);await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'library-search','Y jumps to search');
 await page.keyboard.type('glass');await page.waitForTimeout(400);
 assert.equal(await page.locator('.game-grid .game-card').count(),1,'search filters as you type');
 await page.keyboard.press('ArrowDown');await page.waitForTimeout(80);await page.keyboard.press('ArrowDown');await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.game),'g8');
 await page.screenshot({path:path.join(out,'04-library-search.png')});
 await press(2);await page.waitForTimeout(150);
 assert.deepEqual((await calls('launch')).at(-1)[1],{id:'g8'},'X plays from the library');
 await press(1);await page.evaluate(()=>{window.__sessions={};window.__push({sessions:{},running:[],sessionEvent:{event:'cleared',id:'g8'}});});await page.waitForTimeout(100);
 await press(9);await page.waitForTimeout(200);
 assert.equal(await text('#panel-title'),'Game settings');
 assert.equal(await page.locator('#panel [data-action=launch-method]').count(),1,'launch method is offered for installed games');
 await press(1);await page.waitForTimeout(150);

 /* 5. Help and settings */
 await page.mouse.move(400,400);await page.mouse.move(420,420);
 await page.keyboard.press('F1');await page.waitForTimeout(200);
 assert.equal(await text('#panel-title'),'Controls guide');
 await page.screenshot({path:path.join(out,'05-help.png')});
 await page.keyboard.press('Escape');await page.waitForTimeout(150);
 await page.keyboard.press('Control+,');await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.body.dataset.page),'settings');
 await page.click('[data-settings-tab=console]');await page.waitForTimeout(250);
 assert.equal(await page.locator('[data-action=console-autostart]').count(),1);
 await page.screenshot({path:path.join(out,'06-settings-console.png')});
 await page.click('[data-action=console-autostart]');await page.waitForTimeout(150);
 assert.deepEqual((await calls('consoleSet')).at(-1)[1],{autostart:true});
 assert.equal(await page.getAttribute('[data-action=console-autostart]','aria-checked'),'true');
 await page.click('[data-action=console-quiet]');await page.waitForTimeout(150);
 assert.equal((await calls('consoleSet')).length,1,'silencing notifications asks first');
 assert.equal(await text('#panel-title'),'Silence Windows notifications?');
 await page.click('#panel [data-action=console-quiet-confirm]');await page.waitForTimeout(150);
 assert.deepEqual((await calls('consoleSet')).at(-1)[1],{quietNotifications:true,confirm:true});

 /* 6. Rebinding: keyboard and controller, with a swap */
 await page.click('[data-action=shortcuts-open]');await page.waitForTimeout(200);
 await page.screenshot({path:path.join(out,'07-shortcuts.png')});
 await page.click('[data-shortcut=search]');await page.waitForTimeout(150);
 await page.keyboard.press('Enter');await page.waitForTimeout(100);
 assert.equal((await calls('shortcutsSave')).length,0,'reserved keys are refused');
 await page.keyboard.press('s');await page.waitForTimeout(200);
 assert.deepEqual((await calls('shortcutsSave')).at(-1)[1],{keys:{search:'s'},pad:{}});
 assert.equal(await text('#panel-title'),'Shortcuts and controls','back on the list after assigning');
 await page.click('[data-shortcut=favorite]');await page.waitForTimeout(150);
 await press(3);await page.waitForTimeout(200);
 assert.deepEqual((await calls('shortcutsSave')).at(-1)[1],{keys:{search:'s'},pad:{search:11,favorite:3}},'a controller button in use swaps');
 await page.mouse.move(500,500);await page.mouse.move(530,530);
 await page.keyboard.press('Escape');await page.waitForTimeout(200);
 await page.keyboard.press('/');await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>document.body.dataset.page),'settings','the old key no longer searches');
 await page.keyboard.press('s');await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'library-search','the new key does');
 await page.keyboard.press('Escape');

 /* 6b. Downloads ring and list, Discord sidebar: same width as every other panel */
 await page.evaluate(()=>allPanelsClosed());await page.waitForTimeout(200);
 await page.evaluate(()=>window.novaShell&&document.getElementById('downloads-toggle').click());await page.waitForTimeout(500);
 assert.equal(await text('#panel-title'),'Downloads');assert.equal(await page.locator('.download-row').count(),2);
 assert.equal(await page.getAttribute('#downloads-toggle .ring-value','stroke-dasharray'),'62 100','the header ring follows the download');
 const downloadsWidth=await page.evaluate(()=>document.getElementById('panel').getBoundingClientRect().width);
 await page.screenshot({path:path.join(out,'11-downloads.png')});
 await page.keyboard.press('Escape');await page.waitForTimeout(200);
 await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'13-header.png'),clip:{x:1120,y:10,width:800,height:90}});
 await page.click('#discord-toggle');await page.waitForTimeout(700);
 await page.click('[data-discord-guild=s1]');await page.waitForTimeout(400);
 assert.equal(await page.locator('.call-actions .action').count(),3);
 assert.equal(await page.evaluate(()=>document.getElementById('panel').getBoundingClientRect().width),downloadsWidth,'Discord uses the same sidebar width');
 await page.screenshot({path:path.join(out,'12-discord.png')});
 await page.keyboard.press('Escape');await page.waitForTimeout(200);
 await page.evaluate(()=>act('shortcuts-open'));await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.getElementById('panel').getBoundingClientRect().width),downloadsWidth,'formerly wide panels use it too');
 await page.keyboard.press('Escape');await page.waitForTimeout(200);

 /* 6c. Collections, storage, system updates */
 await page.evaluate(()=>{allPanelsClosed();go('library');});await page.waitForTimeout(300);await page.click('[data-library-view=collections]');await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.collection h2')].map(h=>h.textContent).join('|')),'Recently played|Installed|Never played');
 assert(await page.evaluate(()=>document.activeElement.matches('.collection-rail .game-card')),'focus lands on the first collection');
 await page.click('[data-action=collection-new]');await page.waitForTimeout(200);await page.fill('#collection-name','Couch co-op');await page.click('[data-action=collection-name-save]');await page.waitForTimeout(300);
 assert.equal(await page.locator('[data-collection-edit]').count(),1);
 await page.evaluate(()=>{document.querySelector('.collection-rail .game-card').focus();});await press(9);await page.waitForTimeout(250);
 await page.click('#panel [data-action=game-collections]');await page.waitForTimeout(200);await page.click('#panel [data-collection-toggle]');await page.waitForTimeout(300);
 await page.evaluate(()=>allPanelsClosed());await page.waitForTimeout(200);
 assert.equal(await page.locator('.collection[data-collection^=c] .game-card').count(),1,'a game added from its options shows in the collection');
 await page.screenshot({path:path.join(out,'14-collections.png')});
 await page.evaluate(()=>act('storage'));await page.waitForTimeout(500);
 assert.equal(await page.locator('.drive').count(),2);assert.equal(await page.locator('.storage-row').count(),9);
 await page.screenshot({path:path.join(out,'15-storage.png')});
 await page.evaluate(()=>{allPanelsClosed();act('system-updates');});await page.waitForTimeout(500);
 assert.equal(await page.locator('.update-row').count(),3);
 await page.screenshot({path:path.join(out,'16-updates.png')});
 await page.evaluate(()=>allPanelsClosed());await page.waitForTimeout(200);

 /* 7. Diagnostics */
 await page.keyboard.press('Control+,');await page.waitForTimeout(250);await page.click('[data-settings-tab=console]');await page.waitForTimeout(200);
 await page.click('[data-action=diagnostics]');await page.waitForTimeout(250);
 assert.equal(await page.locator('.stat-tile').count(),8);
 await page.screenshot({path:path.join(out,'08-diagnostics.png')});

 /* 8. Italian still reads correctly */
 await page.evaluate(()=>{localStorage.setItem('nova.language','it');});await page.reload();await page.waitForSelector('#recent-rail .game-card');await page.waitForTimeout(700);
 assert.equal(await text('.hero [data-action=play]'),'Gioca');
 await page.screenshot({path:path.join(out,'09-home-it.png')});

 /* 9. A smaller TV-safe window keeps the layout usable */
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(300);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
 await page.screenshot({path:path.join(out,'10-home-720p.png')});
 assert.deepEqual(errors,[],'no script errors');
 console.log('UI CHECK PASS');await browser.close();
})().catch(e=>{console.error('UI CHECK FAIL\n',e);process.exit(1);});
