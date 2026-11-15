'use strict';
/* What a console shows about the machine without a trip to the desktop: disk space, how much each game
   takes, and which system and driver updates are waiting. Everything here only reads; installing
   updates and removing games is left to Windows and to the store that owns the game. */
const fsReal=require('fs'),path=require('path');
function create({platform=process.platform,fs=fsReal,ps=async()=>'',now=Date.now}={}){
 const sizes=new Map();let sizing=null;
 /* Size of a folder, walked a little at a time so the interface never waits on it. */
 async function folderSize(folder,limit=400000){
  let total=0,seen=0;const queue=[folder];
  while(queue.length&&seen<limit){
   const dir=queue.pop();let entries=[];
   try{entries=await fs.promises.readdir(dir,{withFileTypes:true});}catch{continue;}
   for(const entry of entries){
    seen++;const full=path.join(dir,entry.name);
    if(entry.isSymbolicLink?.())continue;
    if(entry.isDirectory())queue.push(full);
    else try{total+=(await fs.promises.stat(full)).size;}catch{}
   }
  }
  return total;
 }
 async function drives(folders){
  if(platform==='win32'){
   try{
    const rows=JSON.parse(String(await ps("Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,VolumeName,Size,FreeSpace | ConvertTo-Json -Compress")).trim()||'[]');
    return (Array.isArray(rows)?rows:[rows]).filter(r=>Number(r.Size)>0).map(r=>({id:String(r.DeviceID).toUpperCase(),name:String(r.VolumeName||'').trim(),total:Number(r.Size),free:Number(r.FreeSpace)}));
   }catch{return [];}
  }
  /* Elsewhere: the file systems that actually hold games. */
  const found=new Map();
  for(const folder of ['/',...folders]){try{const s=fs.statfsSync(folder),total=s.blocks*s.bsize,free=s.bavail*s.bsize,key=total+':'+s.type;if(total>0&&!found.has(key))found.set(key,{id:folder==='/'?'/':path.parse(folder).root+folder.split(path.sep)[1],name:'',total,free});}catch{}}
  return [...found.values()];
 }
 const driveOf=folder=>platform==='win32'?String(folder).slice(0,2).toUpperCase():'';
 /* Installed games with the size already known; the rest are measured in the background. */
 async function storage(games,steamSizes={},onProgress=()=>{}){
  const rows=[];
  for(const g of games)for(const c of g.copies||[]){
   if(!c.installed||!c.folder)continue;
   const known=c.source.startsWith('Steam')&&steamSizes[String(g.steamId)]||sizes.get(c.folder)?.size;
   rows.push({id:g.id,copyId:c.id,title:g.title,cover:g.cover||'',source:c.source,folder:c.folder,drive:driveOf(c.folder),size:known??null});
  }
  const missing=rows.filter(r=>r.size===null).map(r=>r.folder);
  if(missing.length&&!sizing)sizing=(async()=>{for(const folder of missing){if(sizes.has(folder))continue;sizes.set(folder,{size:await folderSize(folder),at:now()});onProgress();}})().finally(()=>{sizing=null;});
  return {drives:await drives(rows.map(r=>r.folder)),games:rows.sort((a,b)=>(b.size||0)-(a.size||0)),measuring:missing.length>0};
 }
 /* How a game is removed: by the store that installed it. Nova never deletes game files itself. */
 function uninstallPlan(game,copy){
  const source=String(copy?.source||'');
  if(source.startsWith('Steam')&&game.steamId)return {method:'uri',url:'steam://uninstall/'+game.steamId};
  if(source==='Locale')return {method:'forget'};
  if(['Epic','GOG','Ubisoft','Ubisoft Connect','Hydra'].includes(source))return {method:'client',name:source};
  return {method:'none'};
 }

 /* Windows Update, drivers included: the same search Windows Settings runs. It can take a minute. */
 let updates=null,searching=null;
 const script=`$ErrorActionPreference='Stop'
$searcher=(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher()
$found=$searcher.Search('IsInstalled=0 and IsHidden=0').Updates
$list=@();foreach($u in $found){$list+=@{title=[string]$u.Title;driver=($u.Type -eq 2);size=[double]$u.MaxDownloadSize;downloaded=[bool]$u.IsDownloaded}}
@{updates=$list;reboot=(Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired')} | ConvertTo-Json -Depth 4 -Compress`;
 function parseUpdates(raw){
  const list=Array.isArray(raw?.updates)?raw.updates:raw?.updates?[raw.updates]:[];
  const items=list.filter(u=>u&&u.title).map(u=>({title:String(u.title).slice(0,200),driver:!!u.driver,size:Number(u.size)||0,downloaded:!!u.downloaded}));
  return {supported:true,system:items.filter(u=>!u.driver),drivers:items.filter(u=>u.driver),rebootRequired:!!raw?.reboot};
 }
 async function systemUpdates(force=false){
  if(platform!=='win32')return {supported:false,system:[],drivers:[],rebootRequired:false};
  if(!force&&updates&&now()-updates.checkedAt<1800000)return updates;
  if(!searching)searching=(async()=>{try{updates={...parseUpdates(JSON.parse(String(await ps(script)).trim()||'{}')),checkedAt:now()};}catch(e){updates={supported:true,system:[],drivers:[],rebootRequired:false,error:true,checkedAt:now()};}return updates;})().finally(()=>{searching=null;});
  return searching;
 }
 return {storage,folderSize,uninstallPlan,systemUpdates,parseUpdates};
}
module.exports={create};
