'use strict';
// A key is verified against the official API before it replaces a saved key.
module.exports=function({key,fetcher=fetch}){
 function failure(message,code){const error=new Error(message);error.sgdb=code;return error;}
 async function request(route,token=key()){
  if(!/^[a-f0-9]{32}$/i.test(token||''))throw failure('Inserisci una chiave API SteamGridDB di 32 caratteri, senza spazi o prefisso Bearer.','missing');
  let r;try{r=await fetcher('https://www.steamgriddb.com/api/v2/'+route,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},credentials:'omit',signal:AbortSignal.timeout(16000)});}catch{throw failure('SteamGridDB non raggiungibile. Controlla la connessione e riprova.','network');}
  if(r.status===401||r.status===403)throw failure('SteamGridDB ha rifiutato la chiave. Genera una chiave dalle preferenze del tuo account e riprova.','auth');
  if(r.status===429)throw failure('SteamGridDB ha limitato le richieste. Attendi un momento e riprova.','rate');
  if(!r.ok)throw failure('SteamGridDB temporaneamente non disponibile ('+r.status+'). Riprova più tardi.','service');
  let value;try{value=await r.json();}catch{throw failure('SteamGridDB ha restituito una risposta non valida. Riprova.','service');}
  if(value?.success!==true||value.data==null)throw failure('SteamGridDB ha restituito una risposta non valida. Riprova.','service');
  return value;
 }
 async function verify(token=key()){await request('search/autocomplete/Sekiro',token);return true;}
 return {request,verify};
};
