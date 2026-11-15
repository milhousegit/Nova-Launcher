'use strict';
/* Finds games that are already installed but that Nova would otherwise only know through an account:
   GOG and Ubisoft Connect write their installs to the Windows registry. Also owns games added by hand.
   Reading only: nothing is written to the registry and no store client is started. */
const path=require('path'),crypto=require('crypto');
const normalize=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');

/* One PowerShell call for every store, so a library refresh starts a single extra process. */
const script=`$ErrorActionPreference='SilentlyContinue'
$out=@{gog=@();ubisoft=@()}
foreach($root in 'HKLM:\\SOFTWARE\\WOW6432Node\\GOG.com\\Games','HKLM:\\SOFTWARE\\GOG.com\\Games'){
 Get-ChildItem $root | ForEach-Object { $p=Get-ItemProperty $_.PSPath; $out.gog+=@{id=[string]$p.gameID;name=[string]$p.gameName;path=[string]$p.path;exe=[string]$p.exe;args=[string]$p.launchParam;cwd=[string]$p.workingDir;dependsOn=[string]$p.dependsOn} }
}
foreach($root in 'HKLM:\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs','HKLM:\\SOFTWARE\\Ubisoft\\Launcher\\Installs'){
 Get-ChildItem $root | ForEach-Object { $p=Get-ItemProperty $_.PSPath; $out.ubisoft+=@{id=[string]$_.PSChildName;path=[string]$p.InstallDir} }
}
$out | ConvertTo-Json -Depth 4 -Compress`;

/* Raw registry rows → installed copies. Add-ons, broken entries and duplicates are dropped. */
function parse(raw,exists=()=>true){
 const list=v=>Array.isArray(v)?v:v?[v]:[],found=[],seen=new Set();
 const push=row=>{const key=row.source+':'+row.storeId;if(!seen.has(key)){seen.add(key);found.push(row);}};
 for(const g of list(raw?.gog)){
  if(!g||!g.id||!g.name||!g.path||g.dependsOn||!exists(g.path))continue;
  const executable=g.exe?path.win32.isAbsolute(g.exe)?g.exe:path.win32.join(g.path,g.exe):'';
  push({source:'GOG',storeId:String(g.id),title:String(g.name).trim(),folder:g.path,executable:executable&&exists(executable)?executable:'',arguments:String(g.args||'').trim()});
 }
 for(const u of list(raw?.ubisoft)){
  if(!u||!/^\d+$/.test(String(u.id))||!u.path)continue;
  const folder=String(u.path).replace(/[\\/]+$/,'');if(!exists(folder))continue;
  push({source:'Ubisoft',storeId:String(u.id),title:path.win32.basename(folder).replace(/[_]+/g,' ').trim(),folder,executable:'',arguments:''});
 }
 return found;
}

/* Adds what was found to the library without replacing what a store account already reported. */
function merge(library,found){
 let changed=0;
 for(const row of found){
  const sameSource=c=>c.source===row.source||row.source==='Ubisoft'&&c.source==='Ubisoft Connect';
  let game=library.games.find(g=>g.copies?.some(c=>sameSource(c)&&(String(c.ubisoftId||c.gogId||'')===row.storeId||c.id===row.source.toLowerCase()+':'+row.storeId)))||library.games.find(g=>normalize(g.title)===normalize(row.title));
  if(!game){game={id:row.source.toLowerCase()+':'+row.storeId,title:row.title,source:row.source,sources:[row.source],genres:[],screenshots:[],achievements:[],copies:[]};library.games.push(game);}
  let copy=game.copies.find(sameSource);
  if(!copy){copy={id:row.source.toLowerCase()+':'+row.storeId,source:row.source};game.copies.push(copy);}
  const before=JSON.stringify(copy);
  copy.installed=true;copy.detectedBy='registry';
  if(!copy.folder)copy.folder=row.folder;
  if(!copy.executable&&row.executable)copy.executable=row.executable;
  if(copy.arguments===undefined&&row.arguments)copy.arguments=row.arguments;
  if(row.source==='Ubisoft')copy.ubisoftId=row.storeId;else copy.gogId=row.storeId;
  if(before!==JSON.stringify(copy))changed++;
  game.sources=[...new Set(game.copies.map(c=>c.source))];game.installed=true;
 }
 return changed;
}

/* A copy the registry reported earlier that is no longer there is marked as not installed. */
function prune(library,found){
 const live=new Set(found.map(r=>r.source+':'+r.storeId));
 for(const game of library.games)for(const copy of game.copies||[]){
  if(copy.detectedBy!=='registry')continue;
  const key=(copy.source==='Ubisoft Connect'?'Ubisoft':copy.source)+':'+(copy.ubisoftId||copy.gogId||'');
  if(!live.has(key)){copy.installed=false;delete copy.detectedBy;game.installed=game.copies.some(c=>c.installed);}
 }
}

async function scan({platform=process.platform,ps,exists}){
 if(platform!=='win32')return [];
 const out=await ps(script);
 return parse(JSON.parse(String(out).trim()||'{}'),exists);
}

/* ── Games added by hand ─────────────────────────────────────────────────── */
const LOCAL='Locale';
const titleFrom=file=>{const folder=path.basename(path.dirname(file)),name=path.basename(file).replace(/\.(exe|sh|appimage|x86_64)$/i,'');const generic=/^(bin|binaries|win64|win32|x64|x86|game|launcher|shipping|release|retail)$/i;const pick=!generic.test(folder)&&folder.length>2?folder:name;return pick.replace(/[_.]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim()||name;};
function addLocal(library,file,title=''){
 const id='local:'+crypto.createHash('sha1').update(path.resolve(file).toLowerCase()).digest('hex').slice(0,16);
 const name=String(title||titleFrom(file)).slice(0,120);
 const copy={id,source:LOCAL,installed:true,folder:path.dirname(file),executable:file,addedAt:new Date().toISOString()};
 /* The same game from a store keeps its page: the local copy is added to it instead of a duplicate. */
 let game=library.games.find(g=>g.copies?.some(c=>c.id===id))||library.games.find(g=>normalize(g.title)===normalize(name));
 if(!game){game={id,title:name,source:LOCAL,sources:[LOCAL],genres:[],screenshots:[],achievements:[],copies:[],playtime:0};library.games.push(game);}
 game.copies=game.copies.filter(c=>c.source!==LOCAL).concat(copy);
 game.sources=[...new Set(game.copies.map(c=>c.source))];game.installed=true;
 return {game,copy};
}
function removeLocal(library,gameId){
 const game=library.games.find(g=>g.id===gameId);if(!game||!game.copies.some(c=>c.source===LOCAL))return false;
 game.copies=game.copies.filter(c=>c.source!==LOCAL);
 if(!game.copies.length)library.games=library.games.filter(g=>g!==game);
 else{game.sources=[...new Set(game.copies.map(c=>c.source))];game.installed=game.copies.some(c=>c.installed);}
 return true;
}
module.exports={scan,parse,merge,prune,addLocal,removeLocal,titleFrom,LOCAL,script};
