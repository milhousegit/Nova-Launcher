'use strict';
/* Installs a verified update over the running copy, so the new version takes the place of the old one:
   same folder, same shortcuts, same path for anything that starts Nova (AnyFSE, the login item, autostart).
   Windows runs the installer silently and lets it reopen Nova; Linux replaces the AppImage file itself.
   If the in-place route is not possible, the installer is simply opened as before. */
const fsReal=require('fs'),path=require('path'),cpReal=require('child_process');
module.exports=function({platform=process.platform,env=process.env,fs=fsReal,spawn=cpReal.spawn,openPath,quit,relaunchArgs=[]}){
 const detached=(file,args)=>new Promise((resolve,reject)=>{const child=spawn(file,args,{detached:true,stdio:'ignore'});child.once('error',reject);child.once('spawn',()=>{child.unref?.();resolve();});});
 async function manual(file){const error=await openPath(file);if(error)throw Error(error);quit();return 'manual';}
 return async function install(file){
  if(platform==='win32'){
   /* /S keeps the folder of the existing installation; --force-run starts the new version when it is done. */
   try{await detached(file,['/S','--updated','--force-run']);}catch{return manual(file);}
   quit();return 'silent';
  }
  if(platform==='linux'&&env.APPIMAGE){
   const target=env.APPIMAGE,staged=target+'.update';
   try{fs.copyFileSync(file,staged);fs.chmodSync(staged,0o755);fs.renameSync(staged,target);}
   catch{try{fs.rmSync(staged,{force:true});}catch{}return manual(file);}
   try{fs.rmSync(file,{force:true});}catch{}
   try{await detached(target,relaunchArgs);}catch{}
   quit();return 'replaced';
  }
  return manual(file);
 };
};
