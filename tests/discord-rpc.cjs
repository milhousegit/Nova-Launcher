// End-to-end check of the Discord voice adapter against a fake Discord client (local named pipe).
// The adapter is a Windows program, so this test only runs there.
var assert=require('node:assert/strict'),fs=require('node:fs'),net=require('node:net'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
var exe=path.join(__dirname,'../tools/discord/DiscordAdapter.exe');
if(process.platform!=='win32'||!fs.existsSync(exe)){console.log('SKIP: Discord voice adapter test needs the Windows adapter.');process.exit(0);}

var frame=(op,value)=>{var body=Buffer.from(JSON.stringify(value)),head=Buffer.alloc(8);head.writeInt32LE(op,0);head.writeInt32LE(body.length,4);return Buffer.concat([head,body]);};
var anna={user:{id:'111',username:'anna',global_name:'Anna',avatar:'hash1'},nick:null,voice_state:{self_mute:true,self_deaf:false},mute:false};
var bruno={user:{id:'112',username:'bruno',avatar:null},nick:'Bru',voice_state:{},mute:false};
var state={selected:null,mute:false,deaf:false,token:'good-token'};
var channels={'1001':{id:'1001',name:'Lobby',type:2,guild_id:'100',voice_states:[anna,bruno]},'9001':{id:'9001',name:null,type:1,voice_states:[anna]}};
function answer(cmd,args){
 switch(cmd){
  case 'AUTHENTICATE':if(args.access_token!==state.token)return {error:'Not authenticated'};return {data:{user:{id:'1'}}};
  case 'GET_SELECTED_VOICE_CHANNEL':return {data:state.selected?channels[state.selected]:null};
  case 'GET_VOICE_SETTINGS':return {data:{mute:state.mute,deaf:state.deaf}};
  case 'GET_GUILDS':return {data:{guilds:[{id:'100',name:'Squad',icon_url:'https://cdn.discordapp.com/icons/100/abc.png'},{id:'200',name:'Quiet',icon_url:null}]}};
  case 'GET_CHANNELS':return {data:{channels:args.guild_id==='100'?[{id:'1001',name:'Lobby',type:2},{id:'1002',name:'chat',type:0},{id:'1003',name:'Stage',type:13}]:[]}};
  case 'GET_CHANNEL':return {data:channels[args.channel_id]||{id:args.channel_id,name:'Stage',type:13,voice_states:[]}};
  case 'SELECT_VOICE_CHANNEL':state.selected=args.channel_id;return {data:state.selected?channels[state.selected]:null};
  case 'SET_VOICE_SETTINGS':if('mute' in args)state.mute=args.mute;if('deaf' in args)state.deaf=args.deaf;return {data:{mute:state.mute,deaf:state.deaf}};
 }
 return {error:'Unknown command'};
}
var pipe='nova-test-ipc-'+process.pid,server=net.createServer(socket=>{
 var buffer=Buffer.alloc(0);socket.on('error',()=>{});
 socket.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);while(buffer.length>=8){var op=buffer.readInt32LE(0),length=buffer.readInt32LE(4);if(buffer.length<8+length)return;var message=JSON.parse(buffer.slice(8,8+length).toString());buffer=buffer.slice(8+length);
  if(op===0){socket.write(frame(1,{cmd:'DISPATCH',evt:'READY',data:{v:1,user:{id:'1'}}}));continue;}
  var reply=answer(message.cmd,message.args||{});
  socket.write(frame(1,reply.error?{cmd:message.cmd,evt:'ERROR',data:{code:4000,message:reply.error},nonce:message.nonce}:{cmd:message.cmd,evt:null,data:reply.data,nonce:message.nonce}));}});
});
var sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(token){
 var dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-voice-')),file=path.join(dir,'discord-voice.json'),n=0;
 var child=cp.spawn(exe,[dir,'1566106996351041757','--voice-only'],{env:{...process.env,NOVA_DISCORD_IPC:pipe,NOVA_DISCORD_TOKEN:token},stdio:'ignore'});
 var read=()=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
 async function until(test,label){for(var i=0;i<100;i++){var v=read();if(v&&test(v))return v;await sleep(100);}throw new Error('timed out waiting for '+label+': '+JSON.stringify(read()));}
 async function send(command){var id='c'+(++n);fs.writeFileSync(path.join(dir,'discord-command.tmp'),JSON.stringify({id,...command}));fs.renameSync(path.join(dir,'discord-command.tmp'),path.join(dir,'discord-command.json'));return until(v=>v.result.id===id,'command '+command.action);}
 return {dir,child,read,until,send,stop(){fs.writeFileSync(path.join(dir,'discord-stop.flag'),'');try{child.kill();}catch{}}};
}
(async()=>{
 await new Promise(r=>server.listen('\\\\.\\pipe\\'+pipe,r));
 var good=await run('good-token');
 try{
  // Servers arrive with icons and only their voice and stage channels.
  var v=await good.until(x=>x.ready&&x.guildsLoaded,'servers');
  assert.equal(v.capable,true);assert.deepEqual(v.guilds.map(g=>g.name),['Squad','Quiet']);
  assert.equal(v.guilds[0].icon,'https://cdn.discordapp.com/icons/100/abc.png');assert.equal(v.guilds[1].icon,'');
  assert.deepEqual(v.guilds[0].channels.map(c=>[c.id,c.name,c.stage]),[['1001','Lobby',false],['1003','Stage',true]]);assert.equal(v.call,null);
  // Opening a server loads who is inside each channel, with profile pictures.
  v=await good.send({action:'members',guild:'100'});assert.equal(v.result.ok,true);
  v=await good.until(x=>x.guilds[0].channels[0].members.length===2,'members');
  var [a,b]=v.guilds[0].channels[0].members;
  assert.deepEqual([a.name,a.avatar,a.mute],['Anna','https://cdn.discordapp.com/avatars/111/hash1.png?size=64',true]);
  assert.deepEqual([b.name,b.avatar.startsWith('https://cdn.discordapp.com/embed/avatars/')],['Bru',true]);
  // Joining a voice channel, muting and leaving.
  v=await good.send({action:'join',channel:'1001'});assert.equal(v.result.ok,true);v=await good.until(x=>x.call&&x.call.id==='1001','call');assert.equal(v.call.members.length,2);
  v=await good.send({action:'mute',value:true});v=await good.until(x=>x.selfMute===true,'mute');
  v=await good.send({action:'leave'});v=await good.until(x=>x.call===null,'leave');
  // A private call is shown too, named after the people in it.
  v=await good.send({action:'join',channel:'9001'});v=await good.until(x=>x.call&&x.call.id==='9001','private call');assert.equal(v.call.type,1);assert.equal(v.call.name,'Anna');
  v=await good.send({action:'bogus'});assert.equal(v.result.ok,false);
 }finally{good.stop();}
 // A refused token leaves a clear message instead of a silent failure.
 var bad=await run('wrong-token');
 try{var v2=await bad.until(x=>x.error,'error');assert(v2.error.includes('Ricollega Discord'),v2.error);assert.equal(v2.ready,false);}finally{bad.stop();}
 server.close();
 console.log('PASS: Discord voice adapter against a fake client: servers with icons, voice channels, members with avatars, join, mute, leave, private calls and refused tokens.');
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
