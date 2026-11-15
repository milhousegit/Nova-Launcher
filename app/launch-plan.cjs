'use strict';
/* Chooses how a game is started, preferring the least intrusive route:
   1. the game's own executable, when the copy is not tied to a store client;
   2. the store's official URI or command line, asked to stay in the background;
   3. the store client itself, only when nothing else can start the game.
   Nothing here bypasses a store: DRM, sign-in and anti-cheat stay with the client that owns them. */
const path=require('path');

const splitArgs=text=>String(text||'').match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a=>a.replace(/^"|"$/g,''))||[];
const isSteam=source=>String(source||'').startsWith('Steam');
/* 'auto' lets Nova decide, 'direct' always runs the executable, 'store' always asks the store client. */
const validMethod=value=>['auto','direct','store'].includes(value);

function plan({game={},copy={},platform=process.platform,method='auto',steamExe='',steamRunning=false,exists=()=>false}={}){
 const source=String(copy.source||''),args=splitArgs(copy.arguments);
 const executable=copy.executable&&exists(copy.executable)?copy.executable:'';
 const direct=()=>({method:'exe',file:executable,args,cwd:copy.folder&&exists(copy.folder)?copy.folder:path.dirname(executable),via:source,launcher:false});
 if(method==='direct'){
  if(executable)return direct();
  return {method:'error',reason:'missing-executable',via:source};
 }
 if(isSteam(source)&&game.steamId){
  const id=String(game.steamId);
  /* A cold Steam start would put its window in front of the game: -silent keeps it in the tray. */
  if(platform==='win32'&&steamExe&&!steamRunning&&exists(steamExe))return {method:'spawn',file:steamExe,args:['-silent','-applaunch',id,...args],cwd:path.dirname(steamExe),via:'Steam',launcher:true};
  return {method:'uri',url:copy.arguments?'steam://run/'+id+'//'+encodeURIComponent(copy.arguments)+'/':'steam://rungameid/'+id,via:'Steam',launcher:true};
 }
 if(source==='Epic'&&copy.appName)return {method:'uri',url:'com.epicgames.launcher://apps/'+encodeURIComponent(copy.appName)+'?action=launch&silent=true',via:'Epic',launcher:true};
 if(method==='store'&&/^Ubisoft/.test(source)&&/^\d+$/.test(String(copy.ubisoftId||'')))return {method:'uri',url:'uplay://launch/'+copy.ubisoftId+'/0',via:'Ubisoft',launcher:true};
 if(executable)return direct();
 if(/^Ubisoft/.test(source)&&/^\d+$/.test(String(copy.ubisoftId||'')))return {method:'uri',url:'uplay://launch/'+copy.ubisoftId+'/0',via:'Ubisoft',launcher:true};
 if(source==='Hydra')return {method:'client',name:'Hydra',via:'Hydra',launcher:true,reason:'hydra-no-executable'};
 return {method:'error',reason:'missing-executable',via:source};
}
module.exports={plan,splitArgs,validMethod,isSteam};
