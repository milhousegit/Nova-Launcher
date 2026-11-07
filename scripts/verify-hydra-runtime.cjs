// electron-builder omits node_modules inside generic extraFiles sources.
// A separate fileset must copy the database reader and its production dependencies.
const fs=require('fs'),path=require('path'),cp=require('child_process');
module.exports=async function(context){
 const tools=path.join(context.appOutDir,'tools');
 for(const file of ['snapshot.cjs','node_modules/classic-level/package.json','node_modules/node-gyp-build/package.json'])if(!fs.existsSync(path.join(tools,file)))throw Error('Hydra runtime missing from package: '+file);
 if(context.electronPlatformName==='win32'&&process.platform==='win32'){
  const result=cp.spawnSync(path.join(tools,'node.exe'),['-e',"const {ClassicLevel}=require('./node_modules/classic-level');if(typeof ClassicLevel!=='function')process.exit(1)"],{cwd:tools,encoding:'utf8',windowsHide:true});
  if(result.error||result.status!==0)throw Error('Packaged Hydra database reader failed to load: '+(result.error?.message||result.stderr));
 }
};
