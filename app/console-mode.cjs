'use strict';
/* Console mode: what makes Nova feel like the system instead of a program running on it.
   Everything here is opt-in and reversible. Nothing touches Defender, UAC, Windows Update or services,
   and nothing replaces the Windows shell. */
const fsReal=require('fs'),path=require('path');

/* Windows settings pages Nova may open on request, so the desktop is only needed when the user asks for it. */
const settingsPages={home:'ms-settings:',network:'ms-settings:network',bluetooth:'ms-settings:bluetooth',display:'ms-settings:display',sound:'ms-settings:sound',controllers:'ms-settings:devices',update:'ms-settings:windowsupdate',notifications:'ms-settings:notifications',power:'ms-settings:powersleep'};

/* Accelerators Nova accepts for the global "bring Nova back" shortcut: at least one modifier, one plain key. */
function validAccelerator(value){
 const parts=String(value||'').split('+');if(parts.length<2||parts.length>4)return false;
 const key=parts.pop(),mods=new Set(parts);
 if(mods.size!==parts.length||![...mods].every(m=>['Control','Alt','Shift'].includes(m)))return false;
 if(mods.size===1&&mods.has('Shift'))return false;
 if(!/^(?:[A-Z0-9]|F(?:[1-9]|1\d|2[0-4])|Home|End|PageUp|PageDown|Insert|Space)$/.test(key))return false;
 /* Combinations Windows or most games already own. */
 const reserved=['Control+Alt+Delete','Alt+F4','Alt+Tab','Control+Shift+Escape','Alt+Space','Control+Alt+Tab'];
 return !reserved.includes([...['Control','Alt','Shift'].filter(m=>mods.has(m)),key].join('+'));
}

function create({app,platform=process.platform,fs=fsReal,env=process.env,execFile=require('child_process').execFile,data,openExternal=async()=>{},args=process.argv,home=require('os').homedir()}){
 const stateFile=path.join(data,'console-mode.json');
 const readState=()=>{try{return JSON.parse(fs.readFileSync(stateFile,'utf8'));}catch{return {};}};
 const writeState=value=>{if(Object.keys(value).length)fs.writeFileSync(stateFile,JSON.stringify(value));else try{fs.unlinkSync(stateFile);}catch{}};
 const reg=params=>new Promise((resolve,reject)=>execFile(path.join(env.SystemRoot||'C:\\Windows','System32','reg.exe'),params,{windowsHide:true,timeout:10000},(error,out)=>error?reject(error):resolve(String(out||''))));

 /* ── Start with the system ─────────────────────────────────────────────── */
 const loginArgs=['--bigscreen','--autostart'];let autostartCache=null;
 const desktopEntry=()=>path.join(env.XDG_CONFIG_HOME||path.join(home,'.config'),'autostart','nova-launcher.desktop');
 const autostart={
  supported(){return (platform==='win32'||platform==='linux')&&!!app.isPackaged&&!args.includes('--local-preview');},
  /* Read once: the answer only changes through set(). */
  get(){
   if(autostartCache!==null)return autostartCache;
   if(!autostart.supported())return autostartCache=false;
   if(platform==='win32')return autostartCache=!!app.getLoginItemSettings({args:loginArgs}).openAtLogin;
   return autostartCache=fs.existsSync(desktopEntry());
  },
  set(enabled){
   autostartCache=null;
   if(!autostart.supported())throw Error('L’avvio automatico è disponibile solo nella versione installata di Nova.');
   if(platform==='win32'){app.setLoginItemSettings({openAtLogin:!!enabled,args:loginArgs});return autostart.get();}
   const file=desktopEntry();
   if(!enabled){try{fs.unlinkSync(file);}catch{}return autostartCache=false;}
   const target=env.APPIMAGE||process.execPath;
   fs.mkdirSync(path.dirname(file),{recursive:true});
   fs.writeFileSync(file,['[Desktop Entry]','Type=Application','Name=Nova Launcher','Comment=Start Nova Launcher in console mode','Exec="'+target.replace(/(["\\`$])/g,'\\$1')+'" '+loginArgs.join(' '),'Terminal=false','X-GNOME-Autostart-enabled=true',''].join('\n'));
   return autostartCache=true;
  }
 };

 /* ── Quiet Windows notifications while Nova is the console ────────────────
    Uses the same per-user switch as Settings → System → Notifications. The previous value is
    remembered on disk first, so it is put back when Nova closes, when the option is turned off,
    or at the next start if Nova was interrupted. */
 const toastKey='HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications';
 const quiet={
  supported:()=>platform==='win32',
  active:()=>readState().toast!==undefined,
  async enable(){
   if(!quiet.supported())throw Error('Disponibile solo su Windows.');
   if(quiet.active())return true;
   let previous='absent';
   try{const out=await reg(['query',toastKey,'/v','ToastEnabled']);const m=out.match(/ToastEnabled\s+REG_DWORD\s+0x([0-9a-f]+)/i);if(m)previous=parseInt(m[1],16);}catch{}
   writeState({...readState(),toast:previous});
   try{await reg(['add',toastKey,'/v','ToastEnabled','/t','REG_DWORD','/d','0','/f']);}
   catch(e){const s=readState();delete s.toast;writeState(s);throw Error('Non riesco a silenziare le notifiche di Windows.');}
   return true;
  },
  async restore(){
   const state=readState();if(state.toast===undefined)return false;
   if(platform==='win32'){
    if(state.toast==='absent')await reg(['delete',toastKey,'/v','ToastEnabled','/f']).catch(()=>{});
    else await reg(['add',toastKey,'/v','ToastEnabled','/t','REG_DWORD','/d',String(Number(state.toast)||0),'/f']);
   }
   delete state.toast;writeState(state);return true;
  }
 };

 /* ── Windows settings, only when asked ─────────────────────────────────── */
 async function openSettings(page){
  if(platform!=='win32')throw Error('Le impostazioni di sistema si aprono da Nova solo su Windows.');
  if(!Object.prototype.hasOwnProperty.call(settingsPages,page))throw Error('Pagina delle impostazioni non valida.');
  await openExternal(settingsPages[page]);return true;
 }

 /* ── Bring Nova back in front ──────────────────────────────────────────────
    Windows refuses to hand focus to a background window; passing through "always on top" is the
    documented way to come forward without minimising whatever was in front. */
 function focusWindow(win){
  if(!win||win.isDestroyed())return false;
  if(win.isMinimized())win.restore();
  win.show();
  if(platform==='win32'){win.setAlwaysOnTop(true,'screen-saver');win.focus();win.moveTop?.();win.setAlwaysOnTop(false);}
  else{win.focus();win.moveTop?.();}
  return true;
 }

 /* ── Priority: as the full-screen console, Nova stays above launchers and apps; only games cover it ──
    Nova is kept on top while it is full screen, except in two cases: a game is on screen, or the user
    asked Nova to open something else (a store client, Windows settings, a folder). In the second case
    priority comes back as soon as Nova has the focus again. */
 function createPriority({window:getWindow,enabled=()=>true}){
  let game=false,yielded=false;
  const wanted=()=>{const win=getWindow();return !!win&&!win.isDestroyed()&&enabled()&&win.isFullScreen()&&!game&&!yielded;};
  function apply(){const win=getWindow();if(!win||win.isDestroyed())return false;const on=wanted();if(win.isAlwaysOnTop()!==on)win.setAlwaysOnTop(on);return on;}
  return {
   apply,
   /* The game takes the screen: Nova steps down and out of the way. */
   gameStarted(){game=true;const win=getWindow();apply();if(win&&!win.isDestroyed()&&enabled()&&win.isFullScreen()&&!win.isMinimized())win.minimize();},
   gameEnded(){game=false;apply();},
   /* Something the user opened on purpose may cover Nova until Nova is focused again. */
   yield(){yielded=true;apply();},
   focused(){if(yielded){yielded=false;apply();}},
   state:()=>({game,yielded,onTop:wanted()})
  };
 }
 return {autostart,quiet,openSettings,focusWindow,createPriority,settingsPages:Object.keys(settingsPages)};
}
module.exports={create,validAccelerator,settingsPages};
