const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {ClassicLevel}=require('../tools/node_modules/classic-level');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-hydra-install-')),prior=process.env.APPDATA;
(async()=>{try{
 const folder=path.join(dir,'Games','Installed'),exe=path.join(folder,'game.exe'),download=path.join(dir,'Games','Downloaded');fs.mkdirSync(folder,{recursive:true});fs.mkdirSync(download);fs.writeFileSync(exe,'fixture');
 const db=new ClassicLevel(path.join(dir,'hydralauncher','hydra-db'),{valueEncoding:'utf8'});await db.open();
 await db.batch([
  {type:'put',key:'!games!steam:1',value:JSON.stringify({shop:'steam',objectId:'1',title:'Installed',executablePath:exe})},
  {type:'put',key:'!games!steam:2',value:JSON.stringify({shop:'steam',objectId:'2',title:'Downloaded'})},
  {type:'put',key:'!downloads!steam:2',value:JSON.stringify({downloadPath:path.dirname(download),folderName:'Downloaded',status:'complete',progress:1})},
  {type:'put',key:'!games!steam:3',value:JSON.stringify({shop:'steam',objectId:'3',title:'Cloud only',executablePath:path.join(dir,'missing.exe')})}
 ]);await db.close();process.env.APPDATA=dir;
 const library={games:[{id:'cloud:1',steamId:'1',hydraKey:'steam:1',title:'Installed',copies:[{id:'hydra:steam:1',source:'Hydra',remoteId:'cloud-id',installed:false}]}]},output=path.join(dir,'nova');
 const errors=await require('../app/independent.cjs').refreshHydra(root,library,output,{executable:process.execPath});assert(!errors.some(e=>e.startsWith('Hydra:')),errors.join('\n'));
 const installed=library.games.find(g=>g.steamId==='1');assert.equal(installed.copies.length,1);assert.equal(installed.copies[0].installed,true);assert.equal(installed.copies[0].executable,exe);assert.equal(installed.copies[0].remoteId,'cloud-id');
 assert.equal(library.games.find(g=>g.steamId==='2').installed,true);assert.equal(library.games.find(g=>g.steamId==='3').installed,false);
 const hydra=require('../app/hydra-account.cjs')({credentials:()=>({hydra:{accessToken:'fixture',user:{id:'fixture'}}}),saveCredentials:async()=>{},fetcher:async url=>({ok:true,status:200,json:async()=>url.endsWith('/profile/me')?{id:'fixture'}:[{id:'cloud-id',shop:'steam',objectId:'1',title:'Installed'}]})});
 await hydra.refresh(library);assert.equal(installed.copies[0].installed,true);assert.equal(installed.copies[0].executable,exe,'Cloud refresh keeps this device installation');
 const config=require('../package.json').build;for(const platform of ['win','linux'])assert(config[platform].extraFiles.some(f=>f.from==='tools/node_modules'&&f.to==='tools/node_modules'));
 const verify=require('../scripts/verify-hydra-runtime.cjs');await assert.rejects(verify({appOutDir:dir,electronPlatformName:'linux'}),/Hydra runtime missing/);
 console.log('PASS: real Hydra database scan detects executables and completed downloads, rejects missing files, merges cloud copies and preserves local installation state; package dependency guard catches missing runtime.');
}finally{if(prior===undefined)delete process.env.APPDATA;else process.env.APPDATA=prior;fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
