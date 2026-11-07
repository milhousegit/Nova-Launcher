'use strict';
// Invoked only after an explicit power action, never during app startup or exit.
module.exports=function({platform=process.platform,execFile=require('child_process').execFile,beforeShutdown=async()=>{}}){
 let pending=null;
 async function perform(language){
  if(!['win32','linux'].includes(platform))throw Error('System shutdown is unavailable on this platform.');
  await beforeShutdown();
  const file=platform==='win32'?'C:\\Windows\\System32\\shutdown.exe':'systemctl';
  const args=platform==='win32'?['/s','/f','/t','0']:['poweroff'];
  await new Promise((resolve,reject)=>execFile(file,args,{windowsHide:true,timeout:15000},error=>error?reject(Error(language==='it'?'Arresto non riuscito. Controlla i permessi di sistema.':'Shutdown failed. Check system permissions.')):resolve()));
  return {accepted:true};
 }
 return {shutdown(language='en'){if(!pending)pending=perform(language).finally(()=>{pending=null;});return pending;}};
};
