var assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
var social=require('../app/social-model.js'),monitor=require('../app/hydra-monitor.cjs');

// Same display name on different platforms is suggested, never applied; accents and case are ignored.
var friends=[{id:'1',store:'Steam',name:'Álex Rossi'},{id:'9',store:'Discord',name:'alex rossi'},{id:'2',store:'Steam',name:'Marta'},{id:'8',store:'Discord',name:'Giulia'},{id:'3',store:'Steam',name:'Giulia'},{id:'4',store:'Steam',name:'Twin'},{id:'5',store:'Steam',name:'twin'},{id:'6',store:'Discord',name:'Twin'},{id:'7',store:'Discord',name:'x'},{id:'10',store:'Steam',name:'x'}];
var found=social.suggestions(friends,[]);
assert.deepEqual(found.map(s=>s.name),['Álex Rossi','Giulia'],'only unambiguous cross-platform matches');
assert.deepEqual(found[0].pairs,[['Steam:1','Discord:9']]);
assert.deepEqual(social.suggestions(friends,[{id:'g',members:['Steam:1','Discord:9']}]).map(s=>s.name),['Giulia'],'already merged profiles are not suggested');
assert.deepEqual(social.suggestions(friends,[],[found[1].id]).map(s=>s.name),['Álex Rossi'],'dismissed suggestions stay hidden');
var linked=found[0].pairs.reduce((groups,[a,b])=>social.link(groups,a,b),[]);assert.equal(social.people(friends,linked).filter(p=>p.accounts).length,1);

// Hydra downloads: new installs are detected, saves are matched once, and unchanged data is not re-checked.
var library={games:[{id:'g1',title:'One',copies:[{source:'Hydra',installed:false}]},{id:'g2',title:'Two',copies:[{source:'Hydra',installed:true,folder:'D:/Two',saves:{checkedAt:'earlier',folders:1}}]}]};
var calls={refresh:0,locations:[],forgot:[],changed:[]};
var fake=monitor.create({appData:fs.mkdtempSync(path.join(os.tmpdir(),'hydra-')),library:()=>library,
 refresh:async lib=>{calls.refresh++;lib.games[0].copies[0].installed=true;lib.games[0].copies[0].folder='D:/One';return [];},
 locations:Object.assign(async(g)=>{calls.locations.push(g.id);return [{folder:'x',count:1}];},{forget:g=>calls.forgot.push(g.id)}),
 processes:async()=>[],open:async()=>{},changed:r=>calls.changed.push(r),running:async()=>true,wait:async()=>{}});
(async()=>{
 var first=await fake.verify('both-open');
 assert.deepEqual(first.changes.map(c=>[c.id,c.installed]),[['g1',true]]);
 assert.deepEqual(calls.forgot,['g1']);assert.deepEqual(calls.locations,['g1'],'only the changed game is matched; g2 was already checked');
 assert.equal(first.installed,2);assert.equal(first.saves.matched,2);assert.equal(library.games[0].copies[0].saves.folders,1);
 assert.equal(calls.changed.length,1);
 var second=await fake.verify('hydra-changed');
 assert.equal(second.changes.length,0);assert.deepEqual(calls.locations,['g1'],'unchanged games are not re-checked');assert.equal(calls.changed.length,1,'no notification without news');
 var busy=monitor.create({library:()=>library,refresh:async()=>[],locations:async()=>[],processes:async()=>[],open:async()=>{},busy:()=>true,running:async()=>true});
 assert.equal(await busy.verify('x'),null,'no check while a library sync is running');
 // Connecting opens Hydra when it is closed, waits for it, then verifies.
 var state={running:false,opened:0},connectCalls=0,linker=monitor.create({appData:fs.mkdtempSync(path.join(os.tmpdir(),'hydra-')),library:()=>({games:[]}),refresh:async()=>{connectCalls++;return [];},locations:async()=>[],processes:async()=>[],open:async()=>{state.opened++;setTimeout(()=>{state.running=true;},1);},running:async()=>state.running,wait:ms=>new Promise(r=>setTimeout(r,1))});
 var result=await linker.connect();assert.equal(state.opened,1);assert.equal(result.opened,true);assert.equal(connectCalls,1);
 var again=await linker.connect();assert.equal(state.opened,1,'an already-open Hydra is not launched again');assert.equal(again.opened,false);
 assert(monitor.hydraExecutable('C:/Users/me/AppData/Local/Programs/Hydra/Hydra.exe')&&!monitor.hydraExecutable('C:/Games/NotHydraGame.exe'));
 // The snapshot tool reads finished downloads as installed games.
 var snapshot=fs.readFileSync(path.join(__dirname,'../tools/snapshot.cjs'),'utf8');assert(snapshot.includes("'!downloads!'")&&snapshot.includes('downloaded'));
 console.log('PASS: friend-name suggestions, Hydra download detection, single save matching, connect-time launch and busy guard.');
})().catch(e=>{console.error(e);process.exit(1);});
