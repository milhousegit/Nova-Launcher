/* Keeps Nova's view of Hydra downloads and save locations current while both apps are open.
   Only local Hydra data is read; nothing is sent anywhere. */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const hydraExecutable=value=>/(^|[\\/])hydra(\.exe)?$/i.test(String(value||''));
function hydraState(library){const state=new Map();for(const g of library.games||[]){const c=(g.copies||[]).find(c=>c.source==='Hydra');if(c)state.set(g.id,{title:g.title,installed:!!c.installed,folder:c.folder||''});}return state;}
function compare(before,after){const changes=[];for(const [id,now] of after){const old=before.get(id);if(!old||old.installed!==now.installed||old.folder!==now.folder)changes.push({id,title:now.title,installed:now.installed,added:!old});}for(const [id,old] of before)if(!after.has(id)&&old.installed)changes.push({id,title:old.title,installed:false,removed:true});return changes;}
function create({appData=process.env.APPDATA||process.env.XDG_CONFIG_HOME||path.join(require('os').homedir(),'.config'),library,refresh,locations,processes,open,changed=()=>{},busy=()=>false,log=()=>{},wait=ms=>new Promise(r=>setTimeout(r,ms)),running}){
 const db=appData?path.join(appData,'hydralauncher','hydra-db'):'';
 let checking=false,lastSignature='',wasOpen=false,lastRun=0,timer=null,latest=null;
 function signature(){try{return fs.readdirSync(db).map(f=>{const s=fs.statSync(path.join(db,f));return f+':'+s.size+':'+Math.floor(s.mtimeMs);}).sort().join('|');}catch{return '';}}
 async function isRunning(){if(running)return running();if(process.platform==='win32')return new Promise(ok=>cp.execFile('tasklist.exe',['/FI','IMAGENAME eq Hydra.exe','/NH','/FO','CSV'],{windowsHide:true,timeout:8000},(e,out)=>ok(!e&&/"Hydra\.exe"/i.test(String(out)))));try{return (await processes()).some(p=>hydraExecutable(p.ExecutablePath));}catch{return false;}}
 /* Re-reads Hydra's downloads, then checks that every installed Hydra game has its save locations matched. */
 async function verify(reason){
  if(checking||busy())return null;checking=true;
  try{
   const lib=library(),before=hydraState(lib),errors=await refresh(lib),after=hydraState(lib),changes=compare(before,after),touched=new Set(changes.map(c=>c.id));
   const checkedAt=new Date().toISOString();let checkedSaves=0,matchedSaves=0;
   for(const g of lib.games){const copy=(g.copies||[]).find(c=>c.source==='Hydra'&&c.installed);if(!copy)continue;
    if(touched.has(g.id))locations.forget?.(g);
    if(!touched.has(g.id)&&copy.saves?.checkedAt)continue;
    try{const folders=await locations(g,copy);copy.saves={folders:folders.length,checkedAt};}catch(e){copy.saves={folders:0,checkedAt,error:String(e.message||e)};}
    checkedSaves++;}
   const installed=[...after.values()].filter(v=>v.installed).length;
   matchedSaves=lib.games.filter(g=>(g.copies||[]).some(c=>c.source==='Hydra'&&c.installed&&c.saves?.folders>0)).length;
   latest={reason,checkedAt,games:after.size,installed,changes,saves:{checked:checkedSaves,matched:matchedSaves},errors:errors||[]};
   if(changes.length||checkedSaves)changed(latest);
   return latest;
  }catch(e){log(e);return {reason,error:String(e.message||e)};}
  finally{checking=false;}
 }
 /* Used right after the account is connected: open Hydra, give it time to publish its data, then verify. */
 async function connect(){
  let opened=false;
  if(!await isRunning()){try{await open();opened=true;}catch(e){return {opened:false,error:String(e.message||e)};}
   for(let i=0;i<20&&!await isRunning();i++)await wait(1500);
   await wait(6000);}
  wasOpen=true;lastSignature=signature();
  const result=await verify('connect');return result?{opened,...result}:{opened,busy:true};
 }
 /* While Hydra and Nova are open together, any change to Hydra's data triggers a new check. */
 async function tick(){
  if(checking||busy()||!db||!fs.existsSync(db))return;
  const open=await isRunning();
  if(!open){if(wasOpen&&await verify('hydra-closed')){wasOpen=false;lastSignature=signature();}return;}
  const current=signature();
  if(wasOpen&&current===lastSignature)return;
  if(Date.now()-lastRun<15000)return;
  const first=!wasOpen;lastRun=Date.now();
  if(await verify(first?'both-open':'hydra-changed')){wasOpen=true;lastSignature=current;}
 }
 function start(interval=20000){if(timer)return;timer=setInterval(()=>{tick().catch(log);},interval);timer.unref?.();}
 function stop(){clearInterval(timer);timer=null;}
 return {verify,connect,tick,start,stop,signature,get latest(){return latest;}};
}
module.exports={create,hydraState,compare,hydraExecutable};
