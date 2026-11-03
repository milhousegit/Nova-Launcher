const {LoginSession,EAuthTokenPlatformType}=require('steam-session'),SteamUser=require('steam-user'),QRCode=require('qrcode');
module.exports=function({credentials,save,notify,onReady,onLicenses}){
 let attempt=null,client=null,token='',owner='',phase='idle',error='',qr='',serial=0,licenseCount=0,datedCount=0;
 const status=()=>({phase,error,qr,connected:phase==='ready',configured:!!credentials().steamSession?.refreshToken,userId:owner,licenseCount,datedCount});
 const emit=()=>notify({steamQR:status()});
 function stop(){serial++;attempt?.cancelLoginAttempt();attempt=null;client?.logOff();client=null;token='';owner='';qr='';phase='idle';}
 function resume(){const stored=credentials().steamSession;if(!stored?.refreshToken)return;const id=stored.userId;if(client&&owner===id&&phase!=='error')return;stop();owner=id;phase='connecting';emit();const c=new SteamUser({dataDirectory:null,enablePicsCache:true,changelistUpdateInterval:0,autoRelogin:true,renewRefreshTokens:true});client=c;
  c.on('error',()=>{if(client!==c)return;token='';phase='error';error='Steam non raggiungibile o sessione scaduta. Riprova il collegamento QR.';emit();});
  c.on('refreshToken',value=>{if(client===c)Promise.resolve(save({refreshToken:value,userId:id})).catch(()=>{});});
  c.on('disconnected',()=>{if(client!==c)return;token='';phase='connecting';emit();});
  c.on('loggedOn',()=>{if(client===c)c.webLogOn();});
  c.on('webSession',async(_,cookies)=>{if(client!==c)return;const cookie=cookies.find(x=>x.startsWith('steamLoginSecure='));const value=cookie?decodeURIComponent(cookie.slice(cookie.indexOf('=')+1)).split(';')[0].split('||'):[];if(value[0]!==owner||!value[1])return;token=value[1];phase='ready';qr='';error='';emit();await onReady(owner).catch(()=>{});});
  c.on('ownershipCached',async()=>{if(client!==c)return;const dates={};for(const licence of c.licenses||[]){if(licence.flags&SteamUser.ELicenseFlags.Expired)continue;const seconds=Number(licence.time_created);if(!(seconds>0))continue;const pkg=c.picsCache.packages[licence.package_id]?.packageinfo;for(const appid of Object.values(pkg?.appids||{})){if(!dates[appid]||dates[appid]>seconds)dates[appid]=seconds;}}const games=c.getOwnedApps({excludeShared:true}).map(id=>({id,title:c.picsCache.apps[id]?.appinfo?.common?.name,type:c.picsCache.apps[id]?.appinfo?.common?.type,acquiredAt:dates[id]?new Date(dates[id]*1000).toISOString():null}));const details=await c.getUserOwnedApps(owner,{includeAppInfo:true,includePlayedFreeGames:true,skipUnvettedApps:false}).catch(()=>({apps:[]}));if(client!==c)return;for(const row of details.apps||[]){const g=games.find(g=>g.id===row.appid);if(g){g.playtime=Number(row.playtime_forever||0)*60;g.lastPlayed=row.rtime_last_played?new Date(row.rtime_last_played*1000).toISOString():null;}}licenseCount=games.length;datedCount=games.filter(g=>g.acquiredAt).length;onLicenses(games,owner);emit();});
  try{c.logOn({refreshToken:stored.refreshToken,logonID:require('crypto').randomBytes(4).readUInt32LE()});}catch{phase='error';error='Steam session unavailable. Retry the connection.';emit();}
 }
 async function start(){stop();const ticket=serial;error='';phase='waiting';const session=new LoginSession(EAuthTokenPlatformType.SteamClient,{transport:new (require('steam-session/dist/transports/WebApiTransport').default)(new (require('@doctormckay/stdlib/http').HttpClient)()),machineFriendlyName:'Nova Launcher'});attempt=session;session.loginTimeout=120000;
  session.on('error',()=>{if(ticket!==serial)return;phase='error';error='Collegamento Steam non riuscito. Genera un nuovo QR.';qr='';emit();});
  session.on('timeout',()=>{if(ticket!==serial)return;phase='expired';qr='';emit();});
  session.on('remoteInteraction',()=>{if(ticket===serial){phase='confirm';emit();}});
  session.on('authenticated',async()=>{if(ticket!==serial)return;try{const id=session.steamID.getSteamID64();await save({refreshToken:session.refreshToken,userId:id});attempt=null;resume();}catch{phase='error';error='Impossibile salvare il collegamento protetto Steam.';emit();}});
  const result=await session.startWithQR();if(ticket!==serial)return status();qr=await QRCode.toDataURL(result.qrChallengeUrl,{width:320,margin:3,errorCorrectionLevel:'M'});emit();return status();
 }
 async function friends(){if(!client?.steamID)return null;const ids=Object.entries(client.myFriends||{}).filter(([,v])=>v===SteamUser.EFriendRelationship.Friend).map(([id])=>id);if(!ids.length)return {status:'ready',friends:[]};const {personas}=await client.getPersonas(ids);return {status:'ready',friends:Object.entries(personas).map(([id,p])=>({id,store:'Steam',name:p.player_name||id,avatar:p.avatar_hash?'https://avatars.steamstatic.com/'+Buffer.from(p.avatar_hash).toString('hex')+'_full.jpg':'',status:p.persona_state===0?5:p.persona_state===3?3:0,game:p.game_name||'',gameId:String(p.gameid||'')}))};}
 return {start,resume,stop,status,friends,accessToken(){return credentials().steamSession?.userId===owner?token:'';}};
};
