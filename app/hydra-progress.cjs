const fs=require('fs'),path=require('path');
function localProgress(id,env=process.env){
 const map=new Map();let found=false;if(!/^\d+$/.test(String(id)))return {map,found};
 const files=[],docs=env.USERPROFILE&&path.join(env.USERPROFILE,'Documents'),pub=path.join(env.PUBLIC||'C:/Users/Public','Documents');
 for(const base of [docs,pub].filter(Boolean))for(const vendor of ['CODEX','RUNE','FLT','CPY'])files.push(path.join(base,'Steam',vendor,String(id),'achievements.ini'));
 files.push(path.join(pub,'OnlineFix',String(id),'Stats','Achievements.ini'),path.join(pub,'OnlineFix',String(id),'Achievements.ini'));
 if(env.APPDATA)for(const vendor of ['Goldberg SteamEmu Saves','GSE Saves'])files.push(path.join(env.APPDATA,vendor,String(id),'achievements.json'));
 for(const file of files){try{if(!fs.existsSync(file))continue;const text=fs.readFileSync(file,'utf8');
  if(file.endsWith('.json')){const data=JSON.parse(text);for(const [name,a]of Object.entries(data))if(a&&(a.earned||a.unlocked))map.set(name.toUpperCase(),{unlockTime:Number(a.earned_time||a.unlock_time||0)*1000});}
  else{let section='',values={};const commit=()=>{if(section&&(values.achieved==='1'||values.state==='1'))map.set(section.toUpperCase(),{unlockTime:Number(values.unlocktime||0)*1000});};for(const line of text.split(/\r?\n/)){const header=line.match(/^\s*\[([^\]]+)\]/);if(header){commit();section=header[1];values={};}else{const kv=line.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);if(kv)values[kv[1].toLowerCase()]=kv[2];}}commit();}found=true;
 }catch{}}
 return {map,found};
}
function iso(value){const d=new Date(value);return value&&Number.isFinite(d.getTime())?d.toISOString():null;}
function reconcile(profile,previous,local={map:new Map(),found:false}){
 const same=profile.owner&&previous?.owner===profile.owner;
 const cached=new Map((same?previous.items||[]:[]).map(a=>[String(a.id).toUpperCase(),a]));
 const items=new Map((profile.items||[]).map(a=>[String(a.id).toUpperCase(),{...a}]));
 // Earned history belongs to the verified account; an empty server response
 // must not erase it. Never import another account's cached progress.
 if(same)for(const [id,a]of cached)if(a.unlocked&&!items.has(id))items.set(id,{...a});
 for(const [id,a]of items){const old=cached.get(id),earned=local.map.get(id);const unlocked=!!a.unlocked||!!old?.unlocked||!!earned;
  const dates=[a.unlocked&&a.date,old?.unlocked&&old.date,earned?.unlockTime].map(iso).filter(Boolean).sort();
  a.date=unlocked?dates.at(-1)||null:null;a.progressKnown=a.progressKnown!==false||!!old?.progressKnown||local.found;
  if(unlocked&&!a.unlocked)a.icon=a.unlockedIcon||(old?.unlocked?old.icon:'')||a.icon;
  a.unlocked=unlocked;
 }
 return {...profile,items:[...items.values()]};
}
module.exports={localProgress,reconcile};
