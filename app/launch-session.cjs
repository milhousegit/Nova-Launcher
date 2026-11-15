'use strict';
/* Follows a game from the moment it is asked to start until its process is really gone.
   States: launching → running → (ended) or launching → error.
   A store client opening is never "running": only a process inside the game's own folder counts,
   which is what `matches` reports. */
function create({matches,now=Date.now,onChange=()=>{},timeoutMs=150000,missesToEnd=2,errorTtlMs=12000,untrackedMs=20000}={}){
 const sessions=new Map();
 const view=s=>({id:s.id,state:s.state,source:s.source,since:s.since,startedAt:s.startedAt||0,reason:s.reason||'',adopted:!!s.adopted});
 const emit=(s,event)=>{try{onChange(event,view(s));}catch{}};
 /* Starting a game that is already starting or running is refused, so a double press cannot launch it twice. */
 function begin(game,copy={},plan={},{trackable=true}={}){
  const current=sessions.get(game.id);
  if(current&&current.state!=='error')return {accepted:false,session:view(current)};
  const session={id:game.id,game,state:'launching',source:plan.via||copy.source||'',copyId:copy.id||'',since:now(),misses:0,trackable};
  sessions.set(game.id,session);emit(session,'launching');
  return {accepted:true,session:view(session)};
 }
 function fail(id,reason='failed'){
  const s=sessions.get(id);if(!s)return;
  s.state='error';s.reason=reason;s.since=now();emit(s,'error');
 }
 /* A game Nova did not start (opened from a store client, or still open from before) is adopted as running. */
 function adopt(game){
  if(sessions.has(game.id))return;
  const session={id:game.id,game,state:'running',source:'',copyId:'',since:now(),startedAt:now(),misses:0,adopted:true};
  sessions.set(game.id,session);emit(session,'running');
 }
 function tick(processes){
  const ended=[];
  for(const s of [...sessions.values()]){
   const alive=matches(s.game,processes).length>0;
   if(s.state==='launching'){
    if(alive){s.state='running';s.startedAt=now();s.misses=0;emit(s,'running');}
    /* Without a known folder the process cannot be recognised: the launch is simply left to finish on its own. */
    else if(!s.trackable){if(now()-s.since>untrackedMs){sessions.delete(s.id);emit({...s,state:'idle'},'cleared');}}
    else if(now()-s.since>timeoutMs){s.state='error';s.reason='timeout';s.since=now();emit(s,'error');}
   }else if(s.state==='running'){
    /* Some games restart themselves (launcher → game, or a patch): one empty reading is not an exit. */
    if(alive)s.misses=0;
    else if(++s.misses>=missesToEnd){sessions.delete(s.id);s.state='ended';s.endedAt=now();ended.push(view(s));emit(s,'ended');}
   }else if(s.state==='error'&&now()-s.since>errorTtlMs){sessions.delete(s.id);emit({...s,state:'idle'},'cleared');}
  }
  return ended;
 }
 const dismiss=id=>{const s=sessions.get(id);if(s&&s.state==='error'){sessions.delete(id);emit({...s,state:'idle'},'cleared');}};
 const snapshot=()=>Object.fromEntries([...sessions.values()].map(s=>[s.id,view(s)]));
 const active=()=>[...sessions.values()].some(s=>s.state==='launching'||s.state==='running');
 const launching=()=>[...sessions.values()].some(s=>s.state==='launching');
 /* A running game that just went missing: the next reading decides, so it should come quickly. */
 const closing=()=>[...sessions.values()].some(s=>s.state==='running'&&s.misses>0);
 const pace=()=>({launching:launching(),active:active(),closing:closing()});
 const copyOf=id=>sessions.get(id)?.copyId||'';
 return {begin,fail,adopt,tick,dismiss,snapshot,active,launching,closing,pace,copyOf,has:id=>sessions.has(id)};
}
/* How often the process list is worth reading: fast while a game is starting, relaxed otherwise. */
const pollInterval=({launching=false,active=false,closing=false}={})=>closing?1000:launching?1500:active?4000:10000;
module.exports={create,pollInterval};
