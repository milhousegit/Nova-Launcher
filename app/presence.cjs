const {people}=require('./social-model.js');
const text=v=>String(v||'').slice(0,160);
const image=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:'';}catch{return '';}};
function snapshot(data,groups){return {version:1,friends:people(data.friends||[],groups||[]).slice(0,1000).map(f=>({id:text(f.id),name:text(f.name),avatar:image(f.avatar),online:[0,3,4,6].includes(f.status),status:f.status===3?'Away':f.status===4?'Busy':[0,6].includes(f.status)?'Online':'Offline',game:text(f.game),platforms:[...new Set((f.accounts||[f]).map(a=>text(a.store)))],voice:(f.accounts||[f]).some(a=>a.voiceKnown===true&&a.voiceInChannel===true)}))};}
module.exports={snapshot};
