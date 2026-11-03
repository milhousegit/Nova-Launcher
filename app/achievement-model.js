(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.novaAchievements=factory();})(globalThis,()=>{
 function summarize(profiles,view='all'){
  const available=Object.entries(profiles||{}).filter(([,p])=>Array.isArray(p.items));
  const selected=view==='all'?available:available.filter(([name])=>name===view);
  const byId=new Map();
  for(const [source,p]of selected)for(const item of p.items){
   const id=item.id?String(item.id).toUpperCase():source+':'+item.name;
   const existing=byId.get(id),earned=!!item.unlocked,known=item.progressKnown!==false;
   if(!existing)byId.set(id,{...item,unlocked:earned,progressKnown:known,unlockSources:earned?[source]:[],sources:[source]});
   else{existing.sources.push(source);if(earned){existing.unlockSources.push(source);if(!existing.unlocked||new Date(item.date||0)>new Date(existing.date||0)){existing.date=item.date;existing.icon=item.icon;}existing.unlocked=true;}existing.progressKnown=existing.progressKnown||known;}
  }
  const items=[...byId.values()].sort((a,b)=>Number(b.unlocked)-Number(a.unlocked)||(new Date(b.date||0)-new Date(a.date||0))||String(a.name).localeCompare(String(b.name),'it'));
  return {achievements:items,achievementTotal:items.length,achievementUnlocked:items.filter(a=>a.unlocked).length,achievementSource:selected.map(([s])=>s).join(' + '),achievementError:selected.map(([s,p])=>p.error?s+': '+p.error:'').filter(Boolean).join(' · ')};
 }
 return {summarize};
});
