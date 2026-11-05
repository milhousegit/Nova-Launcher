'use strict';
/* Navigation flow shared by the Windows and Linux builds.
   Wraps the final render so a view change gets one cheap, compositor-only transition,
   while re-renders of the same view (toggles, filters, data arriving) stay still. */
(()=>{
 const main=document.getElementById('main');
 if(!main||typeof render!=='function')return;
 const reduced=()=>!!(state.settings&&state.settings.reduceMotion)||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 const viewKey=()=>{
  if(detailGame)return 'game:'+detailGame.id;
  if(typeof shopGame!=='undefined'&&shopGame)return 'shop:'+(shopGame.id||shopGame.appid||shopGame.title||'');
  return page==='home'?'home:'+lower:page;
 };
 let lastKey='',running=null;
 function enter(){
  if(!main.animate)return;
  if(running)running.cancel();
  running=main.animate([{opacity:0,transform:'translate3d(0,10px,0)'},{opacity:1,transform:'none'}],{duration:230,easing:'cubic-bezier(.16,1,.3,1)'});
  const done=()=>{running=null};
  running.onfinish=done;running.oncancel=done;
 }
 const baseRender=render;
 render=function(keepScroll=false){
  const key=viewKey(),changed=key!==lastKey;
  lastKey=key;
  baseRender(keepScroll);
  if(changed&&!reduced())enter();
 };
 window.novaFlow={enter,viewKey};
})();
