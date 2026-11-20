const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const model=require('../app/game-info-model.js');
(async()=>{
 /* Epic: play time from the library service, details from the catalog */
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'nova-epic-')),seen=[];
 global.fetch=async(url)=>{url=String(url);seen.push(url);const body=url.includes('/playtime/account/acc1/all')?[{accountId:'acc1',artifactId:'Fortnite',totalTime:7200},{accountId:'acc1',artifactId:'Hades',totalTime:5400}]:url.includes('/assets/Windows')?[{appName:'Hades',namespace:'ns1',catalogItemId:'cat1'}]:url.includes('/bulk/items')?{cat1:{title:'Hades',description:'Breve',longDescription:'Sfida il dio dei morti.',developerDisplayName:'Supergiant Games',releaseInfo:[{dateAdded:'2020-09-17T00:00:00Z'}],keyImages:[{type:'DieselGameBoxTall',url:'https://x/tall.jpg',width:1200,height:1600},{type:'Screenshot',url:'https://x/s1.jpg',width:1920,height:1080}]}}:null;return {ok:true,status:200,json:async()=>body};};
 const accounts=require('../app/platform-accounts.cjs')({BrowserWindow:null,parent:()=>null,data,credentials:()=>({epic:{access_token:'t',account_id:'acc1',expires_at:new Date(Date.now()+3600e3).toISOString()}}),saveCredentials:async()=>{}});
 const library={games:[]};await accounts.refresh('epic',library);
 const g=library.games[0];
 assert.equal(g.title,'Hades');assert.equal(g.playtime,5400,'play time in seconds from Epic');assert.equal(g.copies[0].playtime,5400);
 assert.equal(g.description,'Sfida il dio dei morti.');assert.deepEqual(g.developers,['Supergiant Games']);assert.deepEqual(g.publishers,['Supergiant Games']);
 assert.equal(g.release,'2020-09-17T00:00:00Z');assert.deepEqual(g.screenshots,[{path_thumbnail:'https://x/s1.jpg',path_full:'https://x/s1.jpg'}]);
 assert(seen.some(u=>u.startsWith('https://library-service.live.use1a.on.epicgames.com/')));
 /* Trailers: only Steam's streamed H.264 version, the launch trailer first */
 const movies=model.movies([{id:1,name:'Gameplay',thumbnail:'https://a/1.jpg',dash_h264:'https://video.akamai.steamstatic.com/a/dash_h264.mpd'},{id:2,name:'Launch &amp; more',thumbnail:'https://a/2.jpg',dash_h264:'https://video.fastly.steamstatic.com/b/dash_h264.mpd',highlight:true},{id:3,dash_h264:'https://evil.example/x.mpd'},{id:4,hls_h264:'https://video.akamai.steamstatic.com/c.m3u8'}]);
 assert.deepEqual(movies.map(m=>m.id),['2','1']);assert.equal(movies[0].name,'Launch & more');
 const html=fs.readFileSync(path.join(__dirname,'..','app','index.html'),'utf8');
 assert(/media-src 'self' blob:/.test(html)&&/connect-src https:\/\/video\.akamai\.steamstatic\.com/.test(html),'trailers may stream only from Steam video hosts');
 console.log('PASS: Epic play time and details, and Steam trailers first in the gallery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
