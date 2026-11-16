/* The Explore calendar scans a whole month of Steam releases. It must not re-read cached pages per game
   (that blocked Nova's main process for seconds) and must not redo the work when the same month is reopened. */
const assert=require('assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const N=1500,item=id=>({appid:id,item_type:0,type:0,success:1,name:'Game '+id,basic_info:{short_description:'x',developers:[{name:'D'}],publishers:[{name:'P'}]},release:{steam_release_date:1793000000+id,is_coming_soon:true},assets:{asset_url_format:'steam/apps/'+id+'/${FILENAME}',library_capsule:'c.jpg',library_hero:'h.jpg'},tagids:[1,2,3],screenshots:{all_ages_screenshots:[{filename:'s.jpg'}]}});
let fetches=0;global.fetch=async url=>{fetches++;const u=decodeURIComponent(url),q=JSON.parse(u.slice(u.indexOf('input_json=')+11));let body={};
 if(u.includes('IStoreQueryService/Query')){const start=q.query.start||0;body={response:{metadata:{total_matching_records:N},store_items:Array.from({length:Math.max(0,Math.min(500,N-start))},(_,i)=>item(100000+start+i))}};}
 else if(u.includes('GetItems'))body={response:{store_items:q.ids.map(x=>item(x.appid))}};
 return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)};};
const data=fs.mkdtempSync(path.join(os.tmpdir(),'nova-calendar-')),prefs={storeDiscovery:{},steamUserId:'1'};
const discovery=require('../app/discovery.cjs')({data,library:()=>({games:[]}),preferences:()=>prefs,save:()=>{},gameInfo:async()=>null,sg:null});
const realRead=fs.readFileSync;let pageReads=0;fs.readFileSync=function(file,...rest){if(String(file).startsWith(path.join(data,'Discovery'))&&!String(file).includes('items-v2'))pageReads++;return realRead.call(this,file,...rest);};
(async()=>{try{
 const first=await discovery.calendar(0);assert.equal(first.scanned,N);
 assert(pageReads<40,'cached pages are read a handful of times, not once per game (read '+pageReads+')');
 const before=fetches,again=await discovery.calendar(0);assert.equal(fetches,before,'reopening the same month reuses the computed calendar');assert.equal(again.scanned,N);
 const other=await discovery.calendar(0,'2027-01');assert.equal(other.month,'2027-01');assert(fetches>before,'another month is computed on its own');
 console.log('PASS: the calendar reads cached pages once and reopening a month is immediate.');
}finally{fs.readFileSync=realRead;fs.rmSync(data,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
