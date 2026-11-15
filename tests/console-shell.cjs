const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const app=path.join(__dirname,'../app');
const launchPlan=require(path.join(app,'launch-plan.cjs')),launchSession=require(path.join(app,'launch-session.cjs')),consoleMode=require(path.join(app,'console-mode.cjs')),storeScan=require(path.join(app,'store-scan.cjs')),shortcuts=require(path.join(app,'shortcut-model.js'));

/* ── Launch plan: the least intrusive route wins ── */
{
 const exists=p=>['C:\\Games\\Tunic\\Tunic.exe','C:\\Games\\Tunic','C:\\Steam\\steam.exe'].includes(p);
 const steamGame={steamId:'553420'},steamCopy={source:'Steam',arguments:'-windowed "-profile test"'};
 const cold=launchPlan.plan({game:steamGame,copy:steamCopy,platform:'win32',steamExe:'C:\\Steam\\steam.exe',steamRunning:false,exists});
 assert.equal(cold.method,'spawn');assert.deepEqual(cold.args,['-silent','-applaunch','553420','-windowed','-profile test'],'a cold Steam start stays in the tray and keeps the launch options');
 const warm=launchPlan.plan({game:steamGame,copy:{source:'Steam'},platform:'win32',steamExe:'C:\\Steam\\steam.exe',steamRunning:true,exists});
 assert.deepEqual([warm.method,warm.url],['uri','steam://rungameid/553420'],'a running Steam is asked through its protocol');
 assert.equal(launchPlan.plan({game:steamGame,copy:{source:'Steam Family Sharing'},platform:'linux',exists}).method,'uri','Linux always uses the Steam protocol');
 const epic=launchPlan.plan({game:{},copy:{source:'Epic',appName:'Fortnite Test',executable:'C:\\Games\\Tunic\\Tunic.exe'},exists});
 assert.equal(epic.url,'com.epicgames.launcher://apps/Fortnite%20Test?action=launch&silent=true','Epic is asked to launch silently');
 const direct=launchPlan.plan({game:{},copy:{source:'GOG',executable:'C:\\Games\\Tunic\\Tunic.exe',folder:'C:\\Games\\Tunic',arguments:'--skip-intro'},exists});
 assert.deepEqual([direct.method,direct.file,direct.cwd,direct.launcher],['exe','C:\\Games\\Tunic\\Tunic.exe','C:\\Games\\Tunic',false],'a game with its own executable starts without any client');
 assert.deepEqual(direct.args,['--skip-intro']);
 assert.equal(launchPlan.plan({game:steamGame,copy:{...steamCopy,executable:'C:\\Games\\Tunic\\Tunic.exe'},method:'direct',exists}).method,'exe','the user can force the executable');
 assert.equal(launchPlan.plan({game:steamGame,copy:steamCopy,method:'direct',exists}).reason,'missing-executable');
 assert.equal(launchPlan.plan({game:{},copy:{source:'Ubisoft',ubisoftId:'635',executable:'C:\\Games\\Tunic\\Tunic.exe'},exists}).method,'exe');
 assert.equal(launchPlan.plan({game:{},copy:{source:'Ubisoft',ubisoftId:'635',executable:'C:\\Games\\Tunic\\Tunic.exe'},method:'store',exists}).url,'uplay://launch/635/0');
 assert.equal(launchPlan.plan({game:{},copy:{source:'Ubisoft Connect',ubisoftId:'635'},exists}).url,'uplay://launch/635/0');
 assert.equal(launchPlan.plan({game:{},copy:{source:'Hydra'},exists}).method,'client');
 assert.equal(launchPlan.plan({game:{},copy:{source:'GOG'},exists}).method,'error');
 assert(launchPlan.validMethod('auto')&&!launchPlan.validMethod('admin'));
 console.log('PASS: launch plan prefers the executable, silent store protocols next, the client last.');
}

/* ── Launch session: launching → running → ended, no double launch, timeouts ── */
{
 let clock=0;const events=[],alive=new Set();
 const sessions=launchSession.create({matches:g=>alive.has(g.id)?[{}]:[],now:()=>clock,onChange:(event,s)=>events.push(event+':'+s.id+':'+s.state),timeoutMs:1000,errorTtlMs:500,untrackedMs:300});
 const game={id:'g1',copies:[]};
 assert.equal(sessions.begin(game,{source:'Steam',id:'steam:1'},{via:'Steam'}).accepted,true);
 assert.equal(sessions.begin(game,{},{}).accepted,false,'a second press while starting is refused');
 sessions.tick([]);assert.equal(sessions.snapshot().g1.state,'launching','the store client opening is not the game running');
 alive.add('g1');clock=400;sessions.tick([]);assert.equal(sessions.snapshot().g1.state,'running');
 assert.equal(sessions.begin(game,{},{}).accepted,false,'a running game cannot be started again');
 alive.delete('g1');sessions.tick([]);assert.equal(sessions.snapshot().g1.state,'running','one empty reading is not an exit');assert.equal(sessions.closing(),true);
 assert.equal(launchSession.pollInterval(sessions.pace()),1000,'a game that may be closing is checked again quickly');
 alive.add('g1');sessions.tick([]);alive.delete('g1');sessions.tick([]);assert.equal(sessions.snapshot().g1.state,'running','a restart resets the count');
 const ended=sessions.tick([]);assert.equal(ended.length,1);assert.equal(sessions.has('g1'),false);
 assert.deepEqual(events,['launching:g1:launching','running:g1:running','ended:g1:ended']);
 /* timeout → error → cleared, and a retry is allowed while the error is shown */
 clock=5000;sessions.begin({id:'g2',copies:[]},{},{});clock=6100;sessions.tick([]);
 assert.deepEqual([sessions.snapshot().g2.state,sessions.snapshot().g2.reason],['error','timeout']);
 assert.equal(sessions.begin({id:'g2',copies:[]},{},{}).accepted,true,'retry after an error');
 sessions.fail('g2','start');assert.equal(sessions.snapshot().g2.state,'error');clock=7000;sessions.tick([]);assert.equal(sessions.has('g2'),false,'errors clear by themselves');
 /* a game that cannot be recognised on disk never turns into a false error */
 clock=8000;sessions.begin({id:'g3',copies:[]},{},{}, {trackable:false});clock=8400;sessions.tick([]);assert.equal(sessions.has('g3'),false);assert(!events.includes('error:g3:error'));
 /* adopted games (started outside Nova) are flagged */
 sessions.adopt({id:'g4',copies:[]});assert.equal(sessions.snapshot().g4.adopted,true);assert.equal(sessions.active(),true);
 assert.deepEqual([launchSession.pollInterval({}),launchSession.pollInterval({active:true}),launchSession.pollInterval({launching:true,active:true})],[10000,4000,1500],'idle polling is the slowest');
 console.log('PASS: game sessions track real start and exit, refuse double launches and expire cleanly.');
}

/* ── Console mode: reversible, opt-in system integration ── */
(async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'nova-console-'));
 /* Windows: login item with console arguments, only when installed */
 let login={openAtLogin:false};
 const winApp={isPackaged:true,getLoginItemSettings:()=>login,setLoginItemSettings:v=>{login=v;}};
 const regCalls=[];let stored=null;
 const execFile=(file,args,options,cb)=>{regCalls.push(args.join(' '));if(args[0]==='query')return stored===null?cb(Error('missing')):cb(null,'    ToastEnabled    REG_DWORD    0x'+stored.toString(16));if(args[0]==='add')stored=Number(args[args.indexOf('/d')+1]);if(args[0]==='delete')stored=null;cb(null,'');};
 const opened=[];
 const win=consoleMode.create({app:winApp,platform:'win32',data,execFile,env:{SystemRoot:'C:\\Windows'},args:[],openExternal:async url=>{opened.push(url);}});
 assert.equal(win.autostart.get(),false);assert.equal(win.autostart.set(true),true);
 assert.deepEqual(login.args,['--bigscreen','--autostart'],'Nova starts straight into the console layout');
 assert.equal(win.autostart.set(false),false);
 const preview=consoleMode.create({app:{...winApp,isPackaged:false},platform:'win32',data,args:[]});
 assert.equal(preview.autostart.supported(),false);assert.throws(()=>preview.autostart.set(true),'a development build never registers itself');
 /* notifications: previous value saved first, restored exactly, crash-safe */
 stored=1;assert.equal(win.quiet.active(),false);await win.quiet.enable();
 assert.equal(stored,0);assert.equal(win.quiet.active(),true);assert.equal(JSON.parse(fs.readFileSync(path.join(data,'console-mode.json'),'utf8')).toast,1);
 const afterCrash=consoleMode.create({app:winApp,platform:'win32',data,execFile,env:{},args:[]});
 assert.equal(afterCrash.quiet.active(),true,'an interrupted session is still restorable');
 await afterCrash.quiet.restore();assert.equal(stored,1);assert.equal(fs.existsSync(path.join(data,'console-mode.json')),false);
 stored=null;await win.quiet.enable();assert.equal(stored,0);await win.quiet.restore();assert.equal(stored,null,'a value that did not exist is removed again');
 assert.equal(await win.quiet.restore(),false,'restoring twice changes nothing');
 assert(regCalls.every(c=>c.includes('HKCU\\')),'only the current user is ever touched');
 /* settings pages are a closed list */
 await win.openSettings('network');assert.deepEqual(opened,['ms-settings:network']);
 await assert.rejects(()=>win.openSettings('cmd.exe'));await assert.rejects(()=>win.openSettings('constructor'));
 /* Linux: a desktop entry in the user's autostart folder */
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'nova-home-'));
 const linux=consoleMode.create({app:{isPackaged:true},platform:'linux',data,env:{APPIMAGE:'/opt/Nova Launcher.AppImage'},home,args:[]});
 assert.equal(linux.autostart.set(true),true);
 const entry=fs.readFileSync(path.join(home,'.config','autostart','nova-launcher.desktop'),'utf8');
 assert(entry.includes('Exec="/opt/Nova Launcher.AppImage" --bigscreen --autostart'));
 assert.equal(linux.autostart.set(false),false);assert.equal(fs.existsSync(path.join(home,'.config','autostart','nova-launcher.desktop')),false);
 assert.equal(linux.quiet.supported(),false);await assert.rejects(()=>linux.openSettings('network'));
 /* focus: through always-on-top on Windows, restored afterwards */
 const calls=[],fakeWindow={isDestroyed:()=>false,isMinimized:()=>true,restore:()=>calls.push('restore'),show:()=>calls.push('show'),focus:()=>calls.push('focus'),moveTop:()=>calls.push('top'),setAlwaysOnTop:v=>calls.push('pin:'+v)};
 assert.equal(win.focusWindow(fakeWindow),true);assert.deepEqual(calls,['restore','show','pin:true','focus','top','pin:false']);
 assert.equal(win.focusWindow(null),false);
 for(const ok of ['Control+Alt+Home','Alt+F1','Control+Shift+G','Control+Alt+Shift+9'])assert(consoleMode.validAccelerator(ok),ok);
 for(const bad of ['Home','Shift+A','Alt+F4','Alt+Tab','Control+Alt+Delete','Control+Control+A','Super+A','Control+Escape',''])assert(!consoleMode.validAccelerator(bad),bad);
 console.log('PASS: autostart, notification silencing, settings pages and window focus are opt-in and reversible.');
})().catch(e=>{console.error(e);process.exitCode=1;});

/* ── Store scan and manual games ── */
{
 const exists=p=>!/Missing/.test(p);
 const raw={gog:[{id:'1207658924',name:'Unreal Gold',path:'D:\\GOG\\Unreal Gold',exe:'System\\Unreal.exe',args:'-windowed',dependsOn:''},{id:'2',name:'Unreal Soundtrack',path:'D:\\GOG\\Unreal Gold',exe:'x.exe',dependsOn:'1207658924'},{id:'3',name:'Gone',path:'D:\\GOG\\Missing',exe:'a.exe',dependsOn:''},{id:'1207658924',name:'Unreal Gold',path:'D:\\GOG\\Unreal Gold',exe:'System\\Unreal.exe',dependsOn:''}],ubisoft:{id:'635',path:'D:/Ubisoft/Rayman_Legends/'}};
 const found=storeScan.parse(raw,exists);
 assert.deepEqual(found.map(f=>f.source+':'+f.title),['GOG:Unreal Gold','Ubisoft:Rayman Legends'],'add-ons, missing folders and duplicates are dropped');
 assert.equal(found[0].executable,'D:\\GOG\\Unreal Gold\\System\\Unreal.exe');
 const library={games:[{id:'ubi:1',title:'Rayman Legends',copies:[{id:'ubisoft:x',source:'Ubisoft Connect',installed:false}]}]};
 assert.equal(storeScan.merge(library,found),2);
 assert.equal(library.games.length,2,'a game already known through an account is not duplicated');
 assert.deepEqual([library.games[0].copies.length,library.games[0].copies[0].installed,library.games[0].copies[0].ubisoftId],[1,true,'635']);
 assert.equal(storeScan.merge(library,found),0,'a second scan changes nothing');
 storeScan.prune(library,[found[1]]);assert.equal(library.games[1].copies[0].installed,false,'an uninstalled game is no longer playable');
 const added=storeScan.addLocal(library,path.join(os.tmpdir(),'Games','Hollow Knight','hollow_knight.exe'));
 assert.equal(added.game.title,'Hollow Knight');assert.equal(added.copy.source,'Locale');
 storeScan.addLocal(library,path.join(os.tmpdir(),'Games','Hollow Knight','hollow_knight.exe'));assert.equal(library.games.filter(g=>g.title==='Hollow Knight').length,1,'adding the same file twice keeps one entry');
 const merged=storeScan.addLocal(library,path.join(os.tmpdir(),'Other','Rayman Legends','Rayman.exe'));assert.equal(merged.game,library.games[0],'a manual copy joins the existing game page');
 assert.equal(storeScan.removeLocal(library,library.games[0].id),true);assert.equal(library.games[0].copies.every(c=>c.source!=='Locale'),true);
 assert.equal(storeScan.removeLocal(library,added.game.id),true);assert.equal(library.games.some(g=>g.title==='Hollow Knight'),false);
 assert.equal(storeScan.removeLocal(library,'missing'),false);
 assert.equal(storeScan.titleFrom(path.join('x','Celeste','bin','Celeste.exe')),'Celeste');
 console.log('PASS: registry installs merge without duplicates and manual games can be added and removed.');
}

/* ── Shortcuts: defaults, overrides, swaps and reserved keys ── */
{
 const base=shortcuts.resolve({});
 assert.deepEqual([base.keys.search,base.pad.search,base.pad.sectionPrev,base.pad.sectionNext,base.pad.options],['/',3,4,5,9],'Y searches, LB/RB change section, Menu opens options');
 assert.equal(shortcuts.actionForKey(base,'Ctrl+k'),'search','aliases work next to the default');
 assert.equal(shortcuts.actionForPad(base,2),'quick');assert.equal(shortcuts.actionForPad(base,0),'','A is never an assignable action');
 let custom=shortcuts.assign({}, 'keys','search','s');
 assert.deepEqual(custom,{keys:{search:'s'},pad:{}},'only the difference from the defaults is stored');
 custom=shortcuts.assign(custom,'keys','favorite','x');
 assert.deepEqual([shortcuts.resolve(custom).keys.favorite,shortcuts.resolve(custom).keys.quick],['x','f'],'a key already in use swaps the two actions');
 assert.equal(shortcuts.assign({}, 'keys','search','Enter').keys.search,undefined,'navigation keys cannot be taken');
 assert.equal(shortcuts.assign({}, 'pad','search',0).pad.search,undefined,'A and B cannot be reassigned');
 assert.equal(shortcuts.assign({}, 'pad','search',13).pad.search,undefined,'the D-pad cannot be reassigned');
 assert.deepEqual(shortcuts.assign({}, 'pad','search',2).pad,{search:2,quick:3});
 assert.equal(shortcuts.resolve({keys:{search:'Escape'},pad:{search:99}}).keys.search,'/','invalid stored values fall back to the defaults');
 assert.equal(shortcuts.combo({key:'K',ctrlKey:true}),'Ctrl+k');assert.equal(shortcuts.combo({key:'F1',shiftKey:true}),'Shift+F1');assert.equal(shortcuts.combo({key:'Shift'}),'');
 assert.deepEqual([shortcuts.padName(3,'Xbox'),shortcuts.padName(3,'PlayStation'),shortcuts.padName(null),shortcuts.keyName('Ctrl+,'),shortcuts.keyName('PageUp')],['Y','△','—','Ctrl + ,','PgUp']);
 console.log('PASS: shortcuts keep safe defaults, store only changes and swap on conflict.');
}

/* ── Wiring: the shell loads after the scripts it extends and before localisation ── */
{
 const html=fs.readFileSync(path.join(app,'index.html'),'utf8'),at=name=>html.indexOf('src="'+name+'"');
 assert(at('console-shell.js')>at('game-setup-ui.js')&&at('console-shell.js')>at('settings-ui.js')&&at('shortcut-model.js')<at('console-shell.js'));
 assert(at('en-console.js')>at('en.js')&&at('en-console.js')<at('i18n.js'));
 assert(html.indexOf('href="console-shell.css"')>html.indexOf('href="console-ui.css"'));
 const css=fs.readFileSync(path.join(app,'console-shell.css'),'utf8');assert(!/blur\(/.test(css),'the shell layer adds no blur');
 const main=fs.readFileSync(path.join(app,'main.cjs'),'utf8');
 assert(main.indexOf('win.loadFile(')<main.indexOf('await loadNovaProfile();else loadGuestProfile();if(process.argv.includes'),'the interface starts loading before the profile is fetched');
 assert(!/Defender|DisableAntiSpyware|EnableLUA|wuauserv|Winlogon/i.test(main+fs.readFileSync(path.join(app,'console-mode.cjs'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'')),'security features and the Windows shell are never modified');
 console.log('PASS: shell scripts, styles and startup order are wired correctly.');
}

/* ── Focus: the nearest element in line wins, whatever its size ── */
{
 const focus=require(path.join(app,'focus-model.js')),box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
 const pick=(from,options,direction)=>{let best='',score=Infinity;for(const [name,rect] of Object.entries(options)){const s=focus.score(from,rect,direction);if(s<score){score=s;best=name;}}return best;};
 const card=box(400,600,200,300);
 assert.equal(pick(card,{play:box(100,500,150,60),tabs:box(100,560,300,30),far:box(380,100,240,60)},'up'),'far','up goes to what is above, not to something nearer but off to the side');
 assert.equal(pick(card,{next:box(620,600,200,300),wide:box(700,100,900,60)},'right'),'next');
 assert.equal(pick(box(100,100,150,60),{row:box(100,200,1200,80),chip:box(300,170,60,24)},'down'),'row','a wide row under the button beats a small chip beside it');
 assert.equal(pick(box(100,100,150,60),{a:box(100,200,150,60),b:box(100,300,150,60)},'down'),'a','the nearest of two aligned elements');
 assert.equal(pick(card,{diag:box(700,200,100,50)},'right'),'diag','a diagonal element is still reachable when nothing is in line');
 assert.equal(focus.score(card,box(100,600,200,300),'right'),Infinity);
 console.log('PASS: directional focus picks the nearest aligned element.');
}

/* ── Downloads: Steam manifests and Hydra entries become one list ── */
{
 const files={'/steam/steamapps/libraryfolders.vdf':'"path"\t\t"/games"','/steam/steamapps/appmanifest_10.acf':'"appid" "10"\n"name" "Half Done"\n"BytesToDownload" "2000"\n"BytesDownloaded" "500"','/steam/steamapps/appmanifest_20.acf':'"appid" "20"\n"name" "Finished"\n"BytesToDownload" "2000"\n"BytesDownloaded" "2000"','/games/steamapps/appmanifest_30.acf':'"appid" "30"\n"name" "Idle"\n"BytesToDownload" "0"\n"BytesDownloaded" "0"'};
 /* Paths are joined with the native separator; the fake disk uses forward slashes on every OS. */const posix=p=>p.replace(/\\/g,'/');const fsFake={readFileSync:p=>{p=posix(p);if(!(p in files))throw Error('missing');return files[p];},readdirSync:d=>{d=posix(d);return Object.keys(files).filter(f=>path.posix.dirname(f)===d).map(f=>path.posix.basename(f));}};
 const downloads=require(path.join(app,'downloads.cjs')).create({fs:fsFake});
 const library={games:[{id:'g10',steamId:'10',title:'Half Done',cover:'c.png',copies:[]},{id:'h1',title:'Hydra Game',copies:[{id:'hydra:1',source:'Hydra',download:{status:'active',progress:.75,ready:false}}]},{id:'h2',title:'Paused',copies:[{id:'hydra:2',source:'Hydra',download:{status:'paused',progress:.1,ready:false}}]},{id:'h3',title:'Ready',copies:[{id:'hydra:3',source:'Hydra',download:{status:'complete',progress:1,ready:true}}]}]};
 const result=downloads.list(library,'/steam');
 assert.deepEqual(result.items.map(d=>d.title+':'+Math.round(d.progress*100)+':'+d.status),['Hydra Game:75:active','Half Done:25:active','Paused:10:paused'],'finished and idle games are left out');
 assert.deepEqual([result.active,result.progress],[2,.5],'the ring shows the average of active downloads only');
 assert.deepEqual([result.items[1].gameId,result.items[1].cover],['g10','c.png'],'a download links to its game page');
 assert.deepEqual(downloads.list({games:[]},'').items,[]);
 console.log('PASS: downloads are read from Steam manifests and Hydra entries.');
}

/* ── Priority: launchers and apps stay behind full-screen Nova, games and requested apps do not ── */
{
 const log=[];let full=true,top=false,minimized=false,on=true;
 const win={isDestroyed:()=>false,isFullScreen:()=>full,isAlwaysOnTop:()=>top,setAlwaysOnTop:v=>{top=v;log.push('top:'+v);},isMinimized:()=>minimized,minimize:()=>{minimized=true;log.push('minimize');}};
 const mode=consoleMode.create({app:{isPackaged:true},platform:'win32',data:os.tmpdir(),args:[]});
 const priority=mode.createPriority({window:()=>win,enabled:()=>on});
 assert.equal(priority.apply(),true,'full-screen Nova stays above other windows');
 priority.yield();assert.equal(top,false,'something the user opened may cover Nova');
 priority.apply();assert.equal(top,false,'and keeps that right until Nova is focused again');
 priority.focused();assert.equal(top,true);
 priority.gameStarted();assert.deepEqual([top,minimized],[false,true],'a game takes the screen');
 minimized=false;priority.focused();priority.apply();assert.equal(top,false,'Nova brought back over a running game does not lock the game out');
 priority.gameEnded();assert.equal(top,true);
 full=false;priority.apply();assert.equal(top,false,'desktop mode is an ordinary window');
 full=true;on=false;priority.apply();assert.equal(top,false,'the option can be turned off');
 log.length=0;priority.gameStarted();assert.deepEqual(log,[],'with the option off Nova is left alone');
 console.log('PASS: Nova keeps priority over launchers and apps, and yields to games and requested apps.');
}

/* ── Storage, uninstall routes and system updates ── */
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-storage-'));fs.mkdirSync(path.join(dir,'game','data'),{recursive:true});fs.writeFileSync(path.join(dir,'game','a.bin'),Buffer.alloc(3000));fs.writeFileSync(path.join(dir,'game','data','b.bin'),Buffer.alloc(2000));
 let progress=0;const info=require(path.join(app,'system-info.cjs')).create({platform:'linux'});
 assert.equal(await info.folderSize(path.join(dir,'game')),5000);
 const games=[{id:'s',title:'Steam Game',steamId:'10',copies:[{id:'steam:10',source:'Steam',installed:true,folder:path.join(dir,'steam')}]},{id:'l',title:'Local Game',copies:[{id:'local:1',source:'Locale',installed:true,folder:path.join(dir,'game')},{id:'x',source:'Epic',installed:false,folder:'/nowhere'}]}];
 const first=await info.storage(games,{10:9000},()=>progress++);
 assert.deepEqual(first.games.map(g=>g.title+':'+g.size),['Steam Game:9000','Local Game:null'],'Steam sizes come from its manifests; the rest is measured afterwards');
 assert.equal(first.measuring,true);await new Promise(r=>setTimeout(r,150));assert.equal(progress,1);
 const second=await info.storage(games,{10:9000});assert.equal(second.games.find(g=>g.id==='l').size,5000);assert.equal(second.measuring,false);
 assert(second.drives.length>=1&&second.drives[0].total>=second.drives[0].free);
 assert.deepEqual(info.uninstallPlan({steamId:'10'},{source:'Steam'}),{method:'uri',url:'steam://uninstall/10'});
 assert.equal(info.uninstallPlan({},{source:'Locale'}).method,'forget');assert.equal(info.uninstallPlan({},{source:'GOG'}).method,'client');assert.equal(info.uninstallPlan({},{source:'Amazon'}).method,'none');
 assert.equal(/rmSync|unlink|rmdir|Remove-Item/.test(fs.readFileSync(path.join(app,'system-info.cjs'),'utf8')),false,'Nova never deletes game files itself');
 assert.equal((await info.systemUpdates()).supported,false,'system updates are a Windows feature');
 let searches=0;const windows=require(path.join(app,'system-info.cjs')).create({platform:'win32',ps:async code=>{if(/Update\.Session/.test(code)){searches++;return JSON.stringify({updates:[{title:'2026-11 Cumulative Update',driver:false,size:5e8,downloaded:true},{title:'Display driver 32.1',driver:true,size:8e8}],reboot:true});}return JSON.stringify({DeviceID:'c:',VolumeName:'System',Size:1e12,FreeSpace:4e11});}});
 const updates=await windows.systemUpdates();
 assert.deepEqual([updates.system.length,updates.drivers.length,updates.drivers[0].title,updates.rebootRequired],[1,1,'Display driver 32.1',true],'drivers are listed apart from Windows updates');
 await windows.systemUpdates();assert.equal(searches,1,'the search is cached');await windows.systemUpdates(true);assert.equal(searches,2);
 assert.deepEqual((await windows.storage([],{})).drives,[{id:'C:',name:'System',total:1e12,free:4e11}]);
 assert.deepEqual(windows.parseUpdates({updates:{title:'Only one',driver:true}}).drivers.length,1);
 const failing=require(path.join(app,'system-info.cjs')).create({platform:'win32',ps:async()=>{throw Error('no service');}});assert.equal((await failing.systemUpdates()).error,true);
 /* priority: focus lost while Nova starts a client is reclaimed; otherwise the user's choice is respected */
 let top=false;const win={isDestroyed:()=>false,isFullScreen:()=>true,isAlwaysOnTop:()=>top,setAlwaysOnTop:v=>{top=v;},isMinimized:()=>false,minimize(){}};
 const priority=consoleMode.create({app:{isPackaged:true},platform:'win32',data:os.tmpdir(),args:[]}).createPriority({window:()=>win});
 priority.apply();priority.guard(5000,1000);assert.equal(priority.blurred(3000),'reclaim');assert.equal(top,true);
 assert.equal(priority.blurred(7000),'yield');assert.equal(top,false,'Game Bar or the task switcher can take the screen');priority.focused();assert.equal(top,true);
 console.log('PASS: storage sizes, store-owned uninstall, Windows and driver updates, and focus guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
