(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.novaSocial=factory();})(globalThis,()=>{
 const key=f=>(f.store||'Discord')+':'+f.id,online=f=>[0,3,4,6].includes(f.status);
 // Steam uses different presence codes. Missing or invisible states are not online.
 const steamStatus=value=>({0:5,1:0,2:4,3:3,4:3,5:0,6:0,7:5})[value]??5;
 function link(groups,a,b){if(!a||!b||a===b)throw Error('Scegli due profili diversi.');const hit=groups.filter(g=>g.members.includes(a)||g.members.includes(b)),members=[...new Set([a,b,...hit.flatMap(g=>g.members)])];return [...groups.filter(g=>!hit.includes(g)),{id:hit[0]?.id||a,members}];}
 function remember(groups,friends){return groups.map(g=>({...g,profiles:g.members.map(member=>{const f=friends.find(f=>key(f)===member)||g.profiles?.find(f=>key(f)===member);return f?{id:f.id,store:f.store,name:f.name,avatar:f.avatar}:null;}).filter(Boolean)}));}
 function people(friends,groups=[]){const used=new Set(),result=[];for(const group of groups){const members=friends.filter(f=>group.members.includes(key(f)));if(!members.length)continue;members.forEach(f=>used.add(key(f)));const primary=members.find(f=>online(f)&&f.game)||members.find(online)||members[0];result.push({...primary,id:group.id,store:[...new Set(members.map(f=>f.store||'Discord'))].join(' + '),game:[...new Set(members.filter(online).map(f=>f.game).filter(Boolean))].join(' · '),accounts:members});}return [...result,...friends.filter(f=>!used.has(key(f)))];}
 /* Identical display names on different platforms are probably the same person. Offered, never applied silently. */
 const normalize=name=>String(name||'').normalize('NFKD').replace(/\p{M}+/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
 const shape=f=>({id:f.id,store:f.store||'Discord',name:f.name,avatar:f.avatar||'',key:key(f)});
 function suggestions(friends,groups=[],dismissed=[]){
  const groupOf=new Map();for(const g of groups)for(const member of g.members)groupOf.set(member,g.id);
  const byName=new Map();for(const f of friends){const name=normalize(f.name);if(name.length<2)continue;if(!byName.has(name))byName.set(name,[]);byName.get(name).push(f);}
  const skipped=new Set(dismissed),out=[];
  for(const list of byName.values()){
   const stores=list.map(f=>f.store||'Discord');
   if(new Set(stores).size<2||new Set(stores).size!==list.length)continue; // one profile per platform, otherwise ambiguous
   const keys=list.map(key),first=groupOf.get(keys[0]);
   if(first&&keys.every(k=>groupOf.get(k)===first))continue; // already together
   const id=[...keys].sort().join('|');if(skipped.has(id))continue;
   out.push({id,name:list[0].name,profiles:list.map(shape),pairs:keys.slice(1).map(k=>[keys[0],k])});
  }
  return out.sort((a,b)=>String(a.name).localeCompare(String(b.name),'it'));
 }
 return {key,link,people,remember,online,steamStatus,normalize,suggestions};
});
