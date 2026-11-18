'use strict';
/* Shortcuts shared by keyboard and controller. Every action has a default that the user can change;
   only the differences from the defaults are stored. Confirm, back and the directions are fixed,
   so a wrong choice can never lock anyone out of the interface. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.novaShortcuts=factory();})(globalThis,()=>{
 const actions=[
  {id:'search',label:'Cerca un gioco',key:'/',pad:3},
  {id:'quick',label:'Azione rapida sul gioco',key:'x',pad:2},
  {id:'options',label:'Opzioni del gioco o menu',key:'o',pad:9},
  {id:'favorite',label:'Aggiungi o rimuovi dai preferiti',key:'f',pad:11},
  {id:'help',label:'Guida ai comandi',key:'F1',pad:8},
  {id:'settings',label:'Apri le impostazioni',key:'Ctrl+,',pad:null},
  {id:'home',label:'Vai alla Home',key:'h',pad:null},
  {id:'library',label:'Vai alla Libreria',key:'l',pad:null},
  {id:'sectionPrev',label:'Scheda precedente della pagina',key:'q',pad:4},
  {id:'sectionNext',label:'Scheda successiva della pagina',key:'e',pad:5},
  {id:'pagePrev',label:'Voce precedente del menu',key:'PageUp',pad:6},
  {id:'pageNext',label:'Voce successiva del menu',key:'PageDown',pad:7}
 ];
 const ids=actions.map(a=>a.id);
 /* Extra keys that always work next to the configurable one. */
 const aliases={'Ctrl+k':'search','ContextMenu':'options'};
 /* A key press as text: "Ctrl+k", "F1", "/". Shift only counts for named keys, so "?" stays "?". */
 function combo(e){const k=e.key;if(!k||['Control','Shift','Alt','Meta','AltGraph'].includes(k))return '';const name=k.length===1?k.toLowerCase():k;return (e.ctrlKey?'Ctrl+':'')+(e.altKey?'Alt+':'')+(e.shiftKey&&k.length>1?'Shift+':'')+name;}
 /* Keys the interface, Windows or the browser shell already own. */
 const reservedKey=c=>!c||/^(Enter|Escape|Tab|Shift\+Tab|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|F9|F11|Backspace|Delete| |Alt\+F4|Alt\+Tab|Ctrl\+Alt\+Delete|Ctrl\+Shift\+Escape|Ctrl\+w|Ctrl\+r|Ctrl\+Shift\+i)$/.test(c)||/Meta|OS|Unidentified|Dead/.test(c);
 /* Controller buttons that can be assigned: everything except A, B and the D-pad. */
 const assignablePad=i=>Number.isInteger(i)&&i>=2&&i<=16&&!(i>=12&&i<=15);
 function resolve(overrides={}){const keys={},pad={};for(const a of actions){const k=overrides.keys?.[a.id],b=overrides.pad?.[a.id];keys[a.id]=typeof k==='string'&&!reservedKey(k)?k:a.key;pad[a.id]=assignablePad(b)?b:a.pad;}return {keys,pad};}
 const actionForKey=(bindings,c)=>c?ids.find(id=>bindings.keys[id]===c)||(Object.values(bindings.keys).includes(c)?'':aliases[c])||'':'';
 const actionForPad=(bindings,index)=>ids.find(id=>bindings.pad[id]===index)||'';
 /* Assigning a key or button already in use swaps the two actions, so nothing is left without a command. */
 function assign(overrides,kind,action,value){
  if(!ids.includes(action)||!['keys','pad'].includes(kind))return compact(resolve(overrides));
  if(kind==='keys'?reservedKey(value):!assignablePad(value))return compact(resolve(overrides));
  const current=resolve(overrides),next={keys:{...current.keys},pad:{...current.pad}},other=ids.find(id=>id!==action&&current[kind][id]===value);
  if(other)next[kind][other]=current[kind][action];
  next[kind][action]=value;
  return compact(next);
 }
 /* Keeps only what differs from the defaults. */
 function compact(bindings){const keys={},pad={};for(const a of actions){if(bindings.keys?.[a.id]!==undefined&&bindings.keys[a.id]!==a.key&&bindings.keys[a.id]!==null)keys[a.id]=bindings.keys[a.id];if(bindings.pad?.[a.id]!==undefined&&bindings.pad[a.id]!==a.pad&&bindings.pad[a.id]!==null)pad[a.id]=bindings.pad[a.id];}return {keys,pad};}
 const padNames={xbox:['A','B','X','Y','LB','RB','LT','RT','View','Menu','L3','R3','↑','↓','←','→','Xbox'],playstation:['✕','○','□','△','L1','R1','L2','R2','Create','Options','L3','R3','↑','↓','←','→','PS']};
 const padName=(index,device='xbox')=>index===null||index===undefined?'—':(padNames[String(device).toLowerCase()==='playstation'?'playstation':'xbox'][index]||'Pulsante '+index);
 const keyName=c=>!c?'—':c.split('+').map(p=>({PageUp:'PgUp',PageDown:'PgDn',ContextMenu:'Menu',' ':'Spazio'})[p]||(p.length===1?p.toUpperCase():p)).join(' + ');
 return {actions,ids,combo,reservedKey,assignablePad,resolve,actionForKey,actionForPad,assign,compact,padName,keyName};
});
