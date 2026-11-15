const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events');
const create=require('../app/update-install.cjs');
(async()=>{
 const spawned=[],spawn=(file,args,options={})=>{spawned.push([file,args,options.env]);const c=new EventEmitter();c.unref=()=>{};setImmediate(()=>c.emit('spawn'));return c;};
 const failing=()=>{const c=new EventEmitter();setImmediate(()=>c.emit('error',Error('blocked')));return c;};
 let quits=0,opened=[];const base={quit:()=>quits++,openPath:async f=>{opened.push(f);return '';}};
 /* Windows: silent installer keeps the existing folder and reopens Nova */
 /* Windows: a hidden helper waits for this process to exit, then runs the silent installer that reopens Nova */
 assert.equal(await create({...base,platform:'win32',env:{SystemRoot:'C:\\Windows'},pid:4242,spawn})('C:\\u\\nova-launcher-v9.exe'),'silent');
 assert.equal(spawned[0][0],'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
 assert.equal(spawned[0][1].at(-1),create.WINDOWS_WAIT);assert.match(create.WINDOWS_WAIT,/Wait-Process[\s\S]*Start-Process[\s\S]*'\/S','--updated','--force-run'/,'the installer starts only after Nova has exited');
 assert.equal(spawned[0][2].NOVA_PARENT_PID,'4242');assert.equal(spawned[0][2].NOVA_UPDATE_FILE,'C:\\u\\nova-launcher-v9.exe','paths reach the helper through the environment, never the command line');assert.equal(quits,1);
 /* Without PowerShell the installer is started directly; it closes Nova itself */
 let calls=0;const noPowershell=(file,args)=>{calls++;if(calls===1)return failing();return spawn(file,args);};spawned.length=0;
 assert.equal(await create({...base,platform:'win32',spawn:noPowershell})('C:\\u\\y.exe'),'silent');assert.deepEqual(spawned[0].slice(0,2),['C:\\u\\y.exe',['/S','--updated','--force-run']]);
 assert.equal(await create({...base,platform:'win32',spawn:failing})('C:\\u\\x.exe'),'manual');assert.deepEqual(opened,['C:\\u\\x.exe'],'falls back to opening the installer');
 /* Linux: the running AppImage file itself is replaced, then started again in the same mode */
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-update-')),current=path.join(dir,'Nova.AppImage'),next=path.join(dir,'download.AppImage');
 fs.writeFileSync(current,'old');fs.writeFileSync(next,'new');spawned.length=0;
 assert.equal(await create({...base,platform:'linux',env:{APPIMAGE:current},pid:777,spawn,relaunchArgs:['--bigscreen']})(next),'replaced');
 assert.equal(fs.readFileSync(current,'utf8'),'new');assert.equal(fs.existsSync(next),false);assert.equal(fs.existsSync(current+'.update'),false);
 /* Windows has no executable bit */if(process.platform!=='win32')assert(fs.statSync(current).mode&0o100,'the replaced AppImage is executable');assert.deepEqual(spawned[0].slice(0,2),['/bin/sh',['-c',create.LINUX_WAIT,current,'--bigscreen']],'the new AppImage starts once Nova has exited');assert.equal(spawned[0][2].NOVA_PARENT_PID,'777');
 /* Linux without a writable AppImage, or not running from one: the download is opened as before */
 fs.writeFileSync(next,'newer');opened=[];
 assert.equal(await create({...base,platform:'linux',env:{APPIMAGE:path.join(dir,'missing','Nova.AppImage')},spawn})(next),'manual');
 assert.equal(await create({...base,platform:'linux',env:{},spawn})(next),'manual');assert.equal(opened.length,2);
 await assert.rejects(()=>create({...base,platform:'linux',env:{},openPath:async()=>'cannot open'})(next));
 /* The Windows installer closes everything running from the installation folder and blocks restarts while it replaces files */
 const pkg=require('../package.json'),nsh=fs.readFileSync(path.join(__dirname,'..',pkg.build.nsis.include),'utf8');
 assert.equal(pkg.build.nsis.include,'build/installer.nsh');
 for(const part of ['!macro customCheckAppRunning','!macro customUnInstallCheck','.updating','ExecutablePath.StartsWith','Stop-Process','novaRestoreExecutable','novaStartInstalledCopy'])assert(nsh.includes(part),'installer hook: '+part);
 assert(nsh.indexOf('Rename "$INSTDIR\\${APP_EXECUTABLE_FILENAME}" "$INSTDIR\\${APP_EXECUTABLE_FILENAME}.updating"')<nsh.indexOf('${Do}'),'Nova is made unstartable before its processes are closed');
 console.log('PASS: updates replace the installed version in place and fall back to the manual installer.');
})().catch(e=>{console.error(e);process.exitCode=1;});
