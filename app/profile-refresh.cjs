// Refresh store progress in the background; returning the profile never waits on the network.
module.exports=function({owner,games,refresh,notify,now=Date.now}){
 const checked=new Map();let task=null;
 return function start(){
  if(task)return task;
  const account=owner(),pending=[...games()].filter(g=>(Number(g.playtime)>0||Number(g.achievementUnlocked)>0||(g.copies||[]).some(c=>Number(c.playtime)>0))&&now()-(checked.get(account+':'+g.id)??-Infinity)>1800000).sort((a,b)=>(Date.parse(b.lastPlayed)||0)-(Date.parse(a.lastPlayed)||0));
  if(!pending.length)return Promise.resolve();
  task=(async()=>{let next=0,completed=0;await Promise.all(Array.from({length:2},async()=>{
   while(next<pending.length&&owner()===account){const g=pending[next++];checked.set(account+':'+g.id,now());try{await refresh(g);}catch{/* Keep the last confirmed store data. */}
    if(owner()!==account)return;if(++completed%4===0)notify();
   }
  }));if(owner()===account)notify();})().finally(()=>task=null);
  return task;
 };
};
