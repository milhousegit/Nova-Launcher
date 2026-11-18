'use strict';
/* RecompLauncher (github.com/elripalda/RecompLauncher), shared by the Windows and Linux builds.
   Nova only reads the launcher's own library.json: what is installed, where, and how long it was
   played. Games start through the launcher with `--play <id>`, so its playtime, backups, cloud saves
   and quick menu keep working; when the launcher itself cannot be found, the game's own program runs. */
const fs=require('fs'),os=require('os');
const paths=platform=>platform==='win32'?require('path').win32:require('path').posix;

function dataDirs({platform=process.platform,env=process.env,home=os.homedir()}={}){
 const path=paths(platform);
 if(platform==='win32')return [env.APPDATA&&path.join(env.APPDATA,'com.recomplauncher.app')].filter(Boolean);
 const xdg=env.XDG_DATA_HOME||path.join(home,'.local','share');
 return [path.join(xdg,'com.recomplauncher.app'),path.join(home,'.var','app','com.recomplauncher.RecompLauncher','data','com.recomplauncher.app')];
}
function launcherCandidates({platform=process.platform,env=process.env,home=os.homedir()}={}){
 const path=paths(platform);
 if(platform==='win32')return [env.LOCALAPPDATA&&path.join(env.LOCALAPPDATA,'RecompLauncher','recomplauncher.exe'),env.ProgramFiles&&path.join(env.ProgramFiles,'RecompLauncher','recomplauncher.exe')].filter(Boolean);
 return [...String(env.PATH||'').split(':').filter(Boolean).map(d=>path.join(d,'recomplauncher')),path.join(home,'Applications','RecompLauncher.AppImage'),path.join(home,'.local','bin','RecompLauncher.AppImage')];
}
/* Paths in library.json are written with forward slashes on every system. */
const native=(p,platform)=>platform==='win32'?String(p).replace(/\//g,'\\'):String(p);
const join=(platform,...parts)=>paths(platform).join(...parts.map(p=>native(p,platform)));
const absolute=(platform,p)=>paths(platform).isAbsolute(native(p,platform));

/* The games of one library.json, as Nova copies. Pure: easy to test on any system. */
function parse(json,{platform=process.platform,exists=fs.existsSync,launcher=''}={}){
 const out=[];
 for(const [key,g] of Object.entries(json?.installed||{})){
  if(!g||typeof g!=='object')continue;
  const id=String(g.id||key);if(!/^[\w.-]+$/.test(id)||!g.path)continue;
  const folder=native(g.path,platform),own=g.exe?(absolute(platform,g.exe)?native(g.exe,platform):join(platform,g.path,g.exe)):'';
  const ready=!!own&&exists(own);
  const copy={id:'recomp:'+id,source:'Recomp',storeId:id,folder,installed:ready,playtimeOrigin:'Recomp'};
  if(ready&&launcher){copy.executable=launcher;copy.arguments='--play '+id;}else if(ready)copy.executable=own;
  if(ready)copy.gameExecutable=own;
  const secs=Number(g.played_secs);if(Number.isFinite(secs)&&secs>0)copy.playtime=Math.round(secs);
  const last=Number(g.last_played);if(Number.isFinite(last)&&last>0)copy.lastPlayed=new Date((last>1e12?last:last*1000)).toISOString();
  out.push({id,title:String(g.name||g.game||id),version:String(g.version||g.tag||''),repo:String(g.repo||''),copy});
 }
 return out;
}

module.exports=function create({platform=process.platform,env=process.env,home=os.homedir(),exists=fs.existsSync,read=f=>fs.readFileSync(f,'utf8')}={}){
 let snapshot=null;
 const where=()=>dataDirs({platform,env,home}).map(d=>paths(platform).join(d,'library.json')).find(f=>exists(f))||'';
 const launcher=()=>launcherCandidates({platform,env,home}).find(f=>exists(f))||'';
 function load(){const file=where();if(!file)return null;try{const games=parse(JSON.parse(read(file)),{platform,exists,launcher:launcher()});return {file,games,launcher:launcher(),updated:new Date().toISOString()};}catch{return null;}}
 function status(){const s=snapshot||load();return {found:!!s,launcher:!!s?.launcher,games:s?.games?.filter(g=>g.copy.installed).length||0,updated:s?.updated||''};}
 const normalize=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
 /* Adds or refreshes the Recomp copies; copies of games no longer in the launcher are taken out. */
 function refresh(library){
  snapshot=load();const rows=snapshot?.games||[],seen=new Set(rows.map(r=>r.copy.id));
  for(const g of library.games){if(!g.copies?.some(c=>c.source==='Recomp'&&!seen.has(c.id)))continue;g.copies=g.copies.filter(c=>c.source!=='Recomp'||seen.has(c.id));g.sources=[...new Set(g.copies.map(c=>c.source))];g.installed=g.copies.some(c=>c.installed);}
  library.games=library.games.filter(g=>g.copies?.length||!String(g.id).startsWith('recomp:'));
  for(const row of rows){
   let g=library.games.find(x=>x.copies?.some(c=>c.id===row.copy.id))||library.games.find(x=>normalize(x.title)===normalize(row.title));
   if(!g){g={id:'recomp:'+row.id,title:row.title,source:'Recomp',copies:[],sources:[],genres:[],developers:[],publishers:[],screenshots:[],playtime:0};library.games.push(g);}
   const old=g.copies.find(c=>c.id===row.copy.id)||{};
   g.copies=g.copies.filter(c=>c.id!==row.copy.id).concat({...old,...row.copy});
   g.sources=[...new Set(g.copies.map(c=>c.source))];g.installed=g.copies.some(c=>c.installed);
   if(row.copy.playtime)g.playtime=Math.max(g.playtime||0,row.copy.playtime);
   if(row.copy.lastPlayed&&(!g.lastPlayed||Date.parse(row.copy.lastPlayed)>Date.parse(g.lastPlayed)))g.lastPlayed=row.copy.lastPlayed;
   if(row.repo&&!g.recompRepo)g.recompRepo=row.repo;
  }
  return status();
 }
 /* Removes everything this module added, for "Disconnect". */
 function forget(library){for(const g of library.games){if(!g.copies?.some(c=>c.source==='Recomp'))continue;g.copies=g.copies.filter(c=>c.source!=='Recomp');g.sources=[...new Set(g.copies.map(c=>c.source))];g.installed=g.copies.some(c=>c.installed);}library.games=library.games.filter(g=>g.copies?.length||!String(g.id).startsWith('recomp:'));snapshot=null;}
 return {refresh,forget,status,launcher,dataFile:where};
};
module.exports.parse=parse;module.exports.dataDirs=dataDirs;module.exports.launcherCandidates=launcherCandidates;
