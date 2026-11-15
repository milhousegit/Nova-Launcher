const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events');
const create=require('../app/update-install.cjs');
(async()=>{
 const spawned=[],spawn=(file,args)=>{spawned.push([file,args]);const c=new EventEmitter();c.unref=()=>{};setImmediate(()=>c.emit('spawn'));return c;};
 const failing=()=>{const c=new EventEmitter();setImmediate(()=>c.emit('error',Error('blocked')));return c;};
 let quits=0,opened=[];const base={quit:()=>quits++,openPath:async f=>{opened.push(f);return '';}};
 /* Windows: silent installer keeps the existing folder and reopens Nova */
 assert.equal(await create({...base,platform:'win32',spawn})('C:\\u\\nova-launcher-v9.exe'),'silent');
 assert.deepEqual(spawned[0],['C:\\u\\nova-launcher-v9.exe',['/S','--updated','--force-run']]);assert.equal(quits,1);
 assert.equal(await create({...base,platform:'win32',spawn:failing})('C:\\u\\x.exe'),'manual');assert.deepEqual(opened,['C:\\u\\x.exe'],'falls back to opening the installer');
 /* Linux: the running AppImage file itself is replaced, then started again in the same mode */
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-update-')),current=path.join(dir,'Nova.AppImage'),next=path.join(dir,'download.AppImage');
 fs.writeFileSync(current,'old');fs.writeFileSync(next,'new');spawned.length=0;
 assert.equal(await create({...base,platform:'linux',env:{APPIMAGE:current},spawn,relaunchArgs:['--bigscreen']})(next),'replaced');
 assert.equal(fs.readFileSync(current,'utf8'),'new');assert.equal(fs.existsSync(next),false);assert.equal(fs.existsSync(current+'.update'),false);
 assert(fs.statSync(current).mode&0o100,'the replaced AppImage is executable');assert.deepEqual(spawned[0],[current,['--bigscreen']]);
 /* Linux without a writable AppImage, or not running from one: the download is opened as before */
 fs.writeFileSync(next,'newer');opened=[];
 assert.equal(await create({...base,platform:'linux',env:{APPIMAGE:path.join(dir,'missing','Nova.AppImage')},spawn})(next),'manual');
 assert.equal(await create({...base,platform:'linux',env:{},spawn})(next),'manual');assert.equal(opened.length,2);
 await assert.rejects(()=>create({...base,platform:'linux',env:{},openPath:async()=>'cannot open'})(next));
 console.log('PASS: updates replace the installed version in place and fall back to the manual installer.');
})().catch(e=>{console.error(e);process.exitCode=1;});
