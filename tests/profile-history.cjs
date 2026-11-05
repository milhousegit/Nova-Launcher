const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const P=require('../app/profile-model.cjs'),A=require('../app/acquisition.js'),D=require('../app/profile-data.cjs');
const older='2020-01-01T12:00:00.000Z',unlock='2021-02-03T12:00:00.000Z',imported='2026-11-05T12:00:00.000Z';
const games=[{id:'known',title:'Known',copies:[{id:'steam:1',source:'Steam',acquiredAt:older,acquisitionSource:'Steam licences'}],acquiredAt:imported,achievementProfiles:{Steam:{items:[{id:'one',name:'First',unlocked:true,date:unlock}]},Hydra:{items:[{id:'ONE',name:'First',unlocked:true}]}},achievements:[{id:'one',name:'First',unlocked:true,date:unlock}]},{id:'unknown',title:'Unknown',copies:[],acquiredAt:imported,addedAt:imported,achievementProfiles:{},achievements:[{id:'two',name:'Undated',unlocked:true}]}];
assert.equal(A.time(games[0]),Date.parse(older));assert.equal(A.time(games[1]),0);
assert.equal(A.time({copies:[{source:'Steam Family Sharing',acquiredAt:older,acquisitionVerified:true}]}),0);
const prefs={profileActivity:{initialized:true,seen:['library:known','library:unknown'],events:games.map(g=>({id:'library:'+g.id,type:'library',gameId:g.id,at:Date.parse(imported)}))}};
P.observe(prefs,games,Date.parse(imported));let view=P.view(games,prefs);
assert.equal(view.summary.unlocked,2);assert.equal(view.recentAchievements.length,2);assert.equal(view.recentAchievements[0].date,unlock);
assert.deepEqual(view.events.map(e=>[e.type,e.at]),[['achievements',Date.parse(unlock)],['library',Date.parse(older)]]);
P.observe(prefs,games,Date.parse(imported)+1000);assert.equal(prefs.profileActivity.events.length,2);
const fresh={};P.observe(fresh,games,Date.parse(imported));assert.equal(P.view(games,fresh).events.length,2,'Historical progress is available on the first profile visit');
const portable=D.portable({games},prefs,{});assert.equal(A.time(portable.games[0]),Date.parse(older));
prefs.profile={visibility:{achievements:false}};assert.equal(P.view(games,prefs).recentAchievements.length,0);
P.reset(prefs,'activity',games,Date.parse(imported));assert.equal(P.view(games,prefs).events.length,0);

(async()=>{
 // QR authentication can retrieve progress without a second API-key sign-in.
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-history-'));try{
  let requests=0;const steam=require('../app/steam.cjs')({data:dir,credentials:()=>({steamAccessToken:'fixture-token',steamUserId:'76561198000000001'}),fetcher:async url=>{assert.equal(url.searchParams.get('access_token'),'fixture-token');requests++;return {ok:true,json:async()=>url.pathname.includes('GetSchemaForGame')?{game:{availableGameStats:{achievements:[{name:'one',displayName:'First',icon:'https://fixture.invalid/one.png'}]}}}:{playerstats:{success:true,achievements:[{apiname:'one',achieved:1,unlocktime:1612353600}]}}};}});
  const game={steamId:'1'};assert(await steam.achievements(game));assert.equal(game.achievementUnlocked,1);assert.equal(requests,2);assert(game.achievements[0].date);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 const create=require('../app/profile-refresh.cjs');let account='a',clock=1,calls=[],active=0,peak=0,notifications=0;
 const list=Array.from({length:7},(_,i)=>({id:String(i),playtime:60})).concat({id:'unplayed'});
 const run=create({owner:()=>account,games:()=>list,now:()=>clock,refresh:async g=>{calls.push(g.id);peak=Math.max(peak,++active);await new Promise(r=>setImmediate(r));active--;if(g.id==='1')throw Error('Unavailable');},notify:()=>notifications++});
 const task=run();assert.equal(run(),task);await task;assert.equal(calls.length,7);assert.equal(peak,2);assert.equal(notifications,2);await run();assert.equal(calls.length,7,'Cached progress is not fetched in a reload loop');clock+=1800001;await run();assert.equal(calls.length,14);
 calls=[];const switching=create({owner:()=>account,games:()=>list,refresh:async g=>{calls.push(g.id);account='b';},notify:()=>assert.fail('Do not notify an old account')});await switching();assert.equal(calls.length,1,'Queued work stops when the account changes');
 console.log('PASS: real acquisition/unlock history, import-date migration, cross-store deduplication, visibility/reset, portable provenance, QR-only achievement retrieval and bounded background refresh.');
})().catch(e=>{console.error(e);process.exitCode=1;});
