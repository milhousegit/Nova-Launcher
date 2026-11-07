const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net'),cp=require('node:child_process');
if(process.platform!=='win32'){console.log('SKIP: native Discord pipe cleanup requires Windows.');process.exit(0);}
(async()=>{
 const name='nova-handshake-'+process.pid,dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-handshake-'));let closed=false;
 const server=net.createServer(socket=>{socket.on('error',()=>{});socket.on('close',()=>closed=true);socket.once('data',()=>{const body=Buffer.from(JSON.stringify({evt:'ERROR',data:{message:'fixture handshake rejection'}})),frame=Buffer.alloc(8+body.length);frame.writeInt32LE(1);frame.writeInt32LE(body.length,4);body.copy(frame,8);socket.write(frame);});});
 try{await new Promise(r=>server.listen('\\\\.\\pipe\\'+name,r));
  const output=await new Promise((resolve,reject)=>cp.execFile(path.join(__dirname,'../tools/discord/DiscordAdapter.exe'),[dir,'1566106996351041757','--rpc-probe'],{env:{...process.env,NOVA_DISCORD_IPC:name},windowsHide:true,timeout:5000},(error,stdout)=>error?reject(error):resolve(stdout)));
  await new Promise(r=>setTimeout(r,100));assert(output.includes('fixture handshake rejection'));assert(closed,'A failed handshake must dispose the pipe instead of leaking a connection');
  console.log('PASS: failed native Discord handshake closes its pipe and reports the cause.');
 }finally{server.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
