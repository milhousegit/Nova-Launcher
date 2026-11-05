'use strict';
/* Suggests merging friends who share a display name across platforms, as soon as friends data arrives.
   Nothing is merged without confirmation. */
(()=>{
 let announced=false,discordWas='';
 const base=adoptFriends;
 function announce(data,was){
  if(announced||!window.novaSocial?.suggestions)return;
  const list=window.novaSocial.suggestions(state.discord.friends||[],state.settings.friendGroups||[],state.settings.friendSuggestionsDismissed||[]);
  if(!list.length)return;
  announced=true;
  const justLinked=!!was&&was!=='ready'&&data?.discordStatus==='ready';
  if(justLinked&&!panels.length&&!detailGame){showFriendIdentities();return;}
  toast('Amici con lo stesso nome trovati su Steam e Discord. Apri Profili degli amici per unirli.');
 }
 adoptFriends=function(data){
  const was=discordWas;discordWas=data?.discordStatus||'';
  base(data);
  try{announce(data,was);}catch{}
 };
})();
