'use strict';
/* Downloads in progress, read from what the stores already write to disk: Steam's app manifests and
   the Hydra entries Nova keeps in the library. Reading only; no client is started or contacted. */
const fsReal=require('fs'),path=require('path');
function create({fs=fsReal}={}){
 const field=(text,name)=>text.match(new RegExp('"'+name+'"\\s*"([^"\\r\\n]*)"'))?.[1]||'';
 /* Every Steam library folder, from the client's own list. */
 function steamFolders(steamPath){
  if(!steamPath)return [];
  const folders=[path.join(steamPath,'steamapps')];
  try{for(const m of fs.readFileSync(path.join(steamPath,'steamapps','libraryfolders.vdf'),'utf8').matchAll(/"path"\s*"([^"]+)"/g))folders.push(path.join(m[1].replace(/\\\\/g,'\\'),'steamapps'));}catch{}
  return [...new Set(folders)];
 }
 function steam(steamPath){
  const rows=[];
  for(const folder of steamFolders(steamPath)){
   let files=[];try{files=fs.readdirSync(folder).filter(f=>/^appmanifest_\d+\.acf$/.test(f));}catch{continue;}
   for(const file of files){
    let text='';try{text=fs.readFileSync(path.join(folder,file),'utf8');}catch{continue;}
    const total=Number(field(text,'BytesToDownload')),done=Number(field(text,'BytesDownloaded')),id=field(text,'appid');
    /* A finished or untouched game has nothing left to fetch. */
    if(!id||id==='228980'||!(total>0)||done>=total)continue;
    rows.push({id:'steam:'+id,steamId:id,title:field(text,'name')||'Steam '+id,source:'Steam',progress:Math.max(0,Math.min(1,done/total)),bytesDone:done,bytesTotal:total,status:'active'});
   }
  }
  return rows;
 }
 /* What Steam itself reports as the installed size of each game. */
 function steamSizes(steamPath){const out={};for(const folder of steamFolders(steamPath)){let files=[];try{files=fs.readdirSync(folder).filter(f=>/^appmanifest_\d+\.acf$/.test(f));}catch{continue;}for(const file of files){try{const text=fs.readFileSync(path.join(folder,file),'utf8'),id=field(text,'appid'),size=Number(field(text,'SizeOnDisk'));if(id&&size>0)out[id]=size;}catch{}}}return out;}
 function hydra(library){
  const rows=[];
  for(const game of library?.games||[])for(const copy of game.copies||[]){
   const d=copy.source==='Hydra'&&copy.download;if(!d||d.ready)continue;
   const progress=Math.max(0,Math.min(1,Number(d.progress)||0));
   if(progress>=1||['complete','seeding','removed','error'].includes(String(d.status)))continue;
   rows.push({id:copy.id,gameId:game.id,title:game.title,source:'Hydra',progress,status:String(d.status)==='paused'?'paused':'active'});
  }
  return rows;
 }
 /* One list for the interface, with the game page and cover when the game is in the library. */
 function list(library,steamPath){
  const rows=[...steam(steamPath),...hydra(library)];
  for(const row of rows){
   const game=(library?.games||[]).find(g=>row.gameId?g.id===row.gameId:row.steamId&&String(g.steamId)===row.steamId);
   if(game){row.gameId=game.id;row.title=game.title||row.title;row.cover=game.cover||'';}
  }
  const active=rows.filter(r=>r.status==='active');
  return {items:rows.sort((a,b)=>b.progress-a.progress),active:active.length,progress:active.length?active.reduce((n,r)=>n+r.progress,0)/active.length:0};
 }
 return {steam,hydra,list,steamFolders,steamSizes};
}
module.exports={create};
