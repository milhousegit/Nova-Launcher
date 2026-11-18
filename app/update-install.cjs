'use strict';
/* Installs a verified update over the running copy, so the new version takes the place of the old one:
   same folder, same shortcuts, same path for anything that starts Nova (AnyFSE, the login item, autostart).
   The new version is started only after this process has exited: a copy of Nova that is still saving and
   closing would keep files open (Windows) or hold the single-instance lock and turn the new one away (Linux).
   Windows opens the installer's setup window once Nova has exited, keeping the existing folder; Linux replaces the
   AppImage file itself and starts it once Nova has exited.
   If the in-place route is not possible, the installer is simply opened as before. */
const fsReal=require('fs'),path=require('path'),cpReal=require('child_process');
/* Both helpers wait at most 30 seconds; after that the installer closes whatever is left. */
const WINDOWS_WAIT="try{Wait-Process -Id ([int]$env:NOVA_PARENT_PID) -Timeout 30 -ErrorAction Stop}catch{}; Start-Process -FilePath $env:NOVA_UPDATE_FILE -ArgumentList '--updated'";
const LINUX_WAIT='i=0; while kill -0 "$NOVA_PARENT_PID" 2>/dev/null && [ "$i" -lt 60 ]; do sleep 0.5; i=$((i+1)); done; exec "$0" "$@"';
module.exports=function({platform=process.platform,env=process.env,fs=fsReal,spawn=cpReal.spawn,openPath,quit,relaunchArgs=[],pid=process.pid}){
 const detached=(file,args,extra)=>new Promise((resolve,reject)=>{const child=spawn(file,args,{detached:true,stdio:'ignore',windowsHide:true,...(extra?{env:{...env,...extra}}:{})});child.once('error',reject);child.once('spawn',()=>{child.unref?.();resolve();});});
 async function manual(file){const error=await openPath(file);if(error)throw Error(error);quit();return 'manual';}
 return async function install(file){
  if(platform==='win32'){
   const powershell=path.win32.join(env.SystemRoot||env.windir||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
   /* --updated tells the setup this is an update of the installed copy, so it does not ask to close Nova. */
   try{await detached(powershell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-Command',WINDOWS_WAIT],{NOVA_PARENT_PID:String(pid),NOVA_UPDATE_FILE:file});}
   catch{try{await detached(file,['--updated']);}catch{return manual(file);}}
   quit();return 'setup';
  }
  if(platform==='linux'&&env.APPIMAGE){
   const target=env.APPIMAGE,staged=target+'.update';
   try{fs.copyFileSync(file,staged);fs.chmodSync(staged,0o755);fs.renameSync(staged,target);}
   catch{try{fs.rmSync(staged,{force:true});}catch{}return manual(file);}
   try{fs.rmSync(file,{force:true});}catch{}
   try{await detached('/bin/sh',['-c',LINUX_WAIT,target,...relaunchArgs],{NOVA_PARENT_PID:String(pid)});}catch{}
   quit();return 'replaced';
  }
  return manual(file);
 };
};
module.exports.WINDOWS_WAIT=WINDOWS_WAIT;module.exports.LINUX_WAIT=LINUX_WAIT;
