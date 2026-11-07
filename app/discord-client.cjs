const fs=require('fs'),path=require('path'),cp=require('child_process');
module.exports=function({processes,platform=process.platform,env=process.env,exists=fs.existsSync,readDir=fs.readdirSync,spawn=cp.spawn,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 let task;
 const running=async()=> (await processes()).some(p=>/^discord(?:canary|ptb)?(?:\.exe)?$/i.test(path.basename(p.ExecutablePath||'')));
 function command(){
  if(platform==='win32')for(const name of ['Discord','DiscordPTB','DiscordCanary']){
   const root=path.join(env.LOCALAPPDATA||'',name),update=path.join(root,'Update.exe');
   if(exists(update))return [update,['--processStart',name+'.exe','--process-start-args','--start-minimized']];
   let versions=[];try{versions=readDir(root).filter(n=>/^app-\d/.test(n)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));}catch{}
   for(const version of versions){const exe=path.join(root,version,name+'.exe');if(exists(exe))return [exe,['--start-minimized']];}
  }
  if(platform==='linux')return ['discord',['--start-minimized']];
  throw Error('Discord non trovato. Installa il client Discord sul PC.');
 }
 return function ensure(){if(task)return task;task=(async()=>{
  if(await running())return {opened:false};
  const [exe,args]=command();await new Promise((resolve,reject)=>{const child=spawn(exe,args,{windowsHide:true,detached:true,stdio:'ignore'});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});
  for(let i=0;i<30;i++){if(await running())return {opened:true};await wait(500);}
  throw Error('Discord si sta avviando. Riprova tra qualche istante.');
 })().finally(()=>task=null);return task;};
};
