// Package and run locally. This script never pushes code, tags, releases or deployments.
const path=require('path'),fs=require('fs'),{spawnSync,spawn}=require('child_process');
const root=path.resolve(__dirname,'..'),platform=process.platform;
if(!['win32','linux'].includes(platform))throw Error('Local preview currently supports Windows and Linux.');
const output=platform==='win32'?'preview-windows':'preview-linux';
const args=[require.resolve('electron-builder/out/cli/cli.js'),'--dir',platform==='win32'?'--win':'--linux','--x64','--publish','never','--config.directories.output='+output];
if(process.env.NOVA_ELECTRON_DIST)args.push('--config.electronDist='+path.resolve(process.env.NOVA_ELECTRON_DIST));
const build=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});
if(build.error)throw build.error;if(build.status)process.exit(build.status);
const exe=path.join(root,output,platform==='win32'?'win-unpacked':'linux-unpacked',platform==='win32'?'Nova Launcher.exe':'nova-launcher');
if(!fs.existsSync(exe))throw Error('Packaged preview was not produced.');
spawn(exe,['--local-preview'],{cwd:path.dirname(exe),detached:true,stdio:'ignore'}).unref();
console.log('Started Nova local preview. Nothing has been published.');
