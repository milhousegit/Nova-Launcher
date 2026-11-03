const net=require('net'),cp=require('child_process'),path=require('path'),crypto=require('crypto');
module.exports=function({root,notify=()=>{},launch,connect=pipe=>net.createConnection(pipe),wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 let socket=null,enabled=false,busy=false,closed=false,processes=0;
 const status=()=>({enabled,busy,processes,temporary:true});
 const changed=()=>notify({steamNetwork:status()});
 const elevate=launch||((pipe)=>new Promise((resolve,reject)=>{
  const file=path.join(root,'tools','steam-network','NovaSteamNetwork.exe');
  const quote=s=>"'"+s.replace(/'/g,"''")+"'";
  const script=`$ErrorActionPreference='Stop'; $p=Start-Process -FilePath ${quote(file)} -ArgumentList @('${process.pid}',${quote(pipe)}) -Verb RunAs -WindowStyle Hidden -PassThru; $p.WaitForExit(); exit $p.ExitCode`;
  cp.execFile('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,maxBuffer:8192},e=>e?reject(Error('Attivazione non autorizzata da Windows o modulo non disponibile.')):resolve());
 }));
 async function start(){
  const name='nova-steam-'+crypto.randomBytes(16).toString('hex');let launchError=null,exited=false;
  elevate(name).then(()=>{exited=true},e=>{launchError=e;exited=true});
  const deadline=Date.now()+60000;
  while(Date.now()<deadline&&!closed){
   if(launchError)throw launchError;if(exited)throw Error('Il modulo di rete Steam si è chiuso.');
   const candidate=await new Promise(resolve=>{const c=connect('\\\\.\\pipe\\'+name);c.once('error',()=>{c.destroy();resolve(null)});c.once('connect',()=>{c.removeAllListeners('error');resolve(c)});});
   if(!candidate){await wait(200);continue;}
   socket=candidate;
   try{await new Promise((resolve,reject)=>{
    let buffer='';const timer=setTimeout(()=>reject(Error('Il filtro Steam non ha risposto.')),12000);
    const fail=()=>{clearTimeout(timer);reject(Error('Collegamento al filtro Steam interrotto.'));};
    candidate.once('error',fail);candidate.once('close',fail);
    candidate.on('data',chunk=>{buffer+=chunk.toString();if(buffer.length>4096)return fail();const line=buffer.split('\n')[0].trim();if(!buffer.includes('\n'))return;
     clearTimeout(timer);if(line.startsWith('READY:')){processes=Number(line.split(':')[1]);enabled=true;resolve();}
     else reject(Error(line.startsWith('ERROR:')?'Impossibile attivare il filtro Steam ('+line.slice(6)+').':'Risposta del filtro Steam non valida.'));
    });
   });}catch(e){candidate.destroy();socket=null;throw e;}
   candidate.on('error',()=>{});candidate.once('close',()=>{if(socket===candidate){socket=null;enabled=false;processes=0;changed();}});
   if(closed){candidate.destroy();enabled=false;throw Error('Nova in chiusura.');}return;
  }throw Error('Attivazione annullata o scaduta. Riprova e conferma la richiesta di Windows.');
 }
 async function stop(){
  if(!socket){enabled=false;return;}const current=socket;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{current.destroy();reject(Error('Ripristino in corso: il filtro temporaneo si sta chiudendo.'));},5000);const done=()=>{clearTimeout(timer);resolve();};current.once('close',done);current.once('error',done);current.on('data',chunk=>{if(chunk.toString().includes('STOPPED')){current.end();done();}});current.write('STOP\n');});
  enabled=false;processes=0;
 }
 return {status,async set(value){if(typeof value!=='boolean')throw Error('Stato del filtro non valido.');if(closed||busy)throw Error('Attendi il completamento del filtro Steam.');if(value===enabled)return status();busy=true;changed();try{if(value)await start();else await stop();return {...status(),busy:false};}finally{busy=false;changed();}},close(){closed=true;if(socket){socket.end('STOP\n');socket.destroy();}enabled=false;}};
};
