(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.novaSocial=factory();})(globalThis,()=>{
 const key=f=>(f.store||'Discord')+':'+f.id,online=f=>[0,3,4,6].includes(f.status);
 function link(groups,a,b){if(!a||!b||a===b)throw Error('Scegli due profili diversi.');const hit=groups.filter(g=>g.members.includes(a)||g.members.includes(b)),members=[...new Set([a,b,...hit.flatMap(g=>g.members)])];return [...groups.filter(g=>!hit.includes(g)),{id:hit[0]?.id||a,members}];}
 function remember(groups,friends){return groups.map(g=>({...g,profiles:g.members.map(member=>{const f=friends.find(f=>key(f)===member)||g.profiles?.find(f=>key(f)===member);return f?{id:f.id,store:f.store,name:f.name,avatar:f.avatar}:null;}).filter(Boolean)}));}
 function people(friends,groups=[]){const used=new Set(),result=[];for(const group of groups){const members=friends.filter(f=>group.members.includes(key(f)));if(!members.length)continue;members.forEach(f=>used.add(key(f)));const primary=members.find(f=>online(f)&&f.game)||members.find(online)||members[0];result.push({...primary,id:group.id,store:[...new Set(members.map(f=>f.store||'Discord'))].join(' + '),game:[...new Set(members.filter(online).map(f=>f.game).filter(Boolean))].join(' · '),accounts:members});}return [...result,...friends.filter(f=>!used.has(key(f)))];}
 return {key,link,people,remember};
});
