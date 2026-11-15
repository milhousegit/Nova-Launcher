'use strict';
/* Directional focus: which element is "next" when a direction is pressed.
   Distance is measured between edges, not centres, so a wide row and a small button compare fairly.
   Elements in line with the current one always win over diagonal ones; among those, the nearest wins. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.novaFocus=factory();})(globalThis,()=>{
 function score(from,to,direction){
  const horizontal=direction==='left'||direction==='right';
  const gap=direction==='left'?from.left-to.right:direction==='right'?to.left-from.right:direction==='up'?from.top-to.bottom:to.top-from.bottom;
  const fromCentre=horizontal?from.left+from.width/2:from.top+from.height/2,toCentre=horizontal?to.left+to.width/2:to.top+to.height/2;
  const ahead=(direction==='left'||direction==='up')?fromCentre-toCentre:toCentre-fromCentre;
  /* Not in that direction at all. */
  if(ahead<=3||gap<-Math.min(horizontal?from.width:from.height,horizontal?to.width:to.height)/2)return Infinity;
  const overlap=horizontal?Math.min(from.bottom,to.bottom)-Math.max(from.top,to.top):Math.min(from.right,to.right)-Math.max(from.left,to.left);
  const main=Math.max(0,gap);
  if(overlap>0){
   /* In line: nearest first; between equally near ones, the one sharing more of the edge. */
   const share=overlap/Math.min(horizontal?from.height:from.width,horizontal?to.height:to.width);
   return main+(1-Math.min(1,share))*8+ahead*.001;
  }
  /* Diagonal: only when nothing is in line, and the sideways distance counts double. */
  return 100000+main+(-overlap)*2;
 }
 return {score};
});
