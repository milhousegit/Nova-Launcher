const normalize=s=>String(s||'').replace(/[™®©]/g,'').normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
function apply(rows,library){let count=0,unmatched=0;for(const row of rows){
 const text=String(row.date||'').trim();if(!/^(?:\d{1,2}\s+[A-Za-z]{3,9}\s*,?\s*\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})$/.test(text))continue;
 const time=Date.parse(text+' UTC');if(!Number.isFinite(time)||time>Date.now()+86400000)continue;
 const matches=library.games.filter(g=>row.appid?String(g.steamId)===String(row.appid):normalize(g.title)===normalize(row.title));
 if(matches.length!==1){unmatched++;continue;}const g=matches[0],date=new Date(time).toISOString();
 const copies=g.copies.filter(c=>c.source?.startsWith('Steam'));if(!copies.length){unmatched++;continue;}
 for(const c of copies){if(!c.acquiredAt||Date.parse(c.acquiredAt)>time)c.acquiredAt=date;c.acquisitionSource='Steam licences';}
 g.acquiredAt=copies.reduce((earliest,c)=>!earliest||Date.parse(c.acquiredAt)<Date.parse(earliest)?c.acquiredAt:earliest,null);count++;
 }return {count,unmatched};}
let current;
function open({BrowserWindow,parent,expectedId,library,onSave}){
 if(!/^\d{17}$/.test(expectedId||''))throw Error('Collega prima Steam nelle impostazioni.');if(current&&!current.isDestroyed()){current.focus();return true;}
 const w=new BrowserWindow({width:1120,height:860,title:'Nova · Importa date di riscatto Steam',parent,webPreferences:{partition:'persist:nova-steam-licenses',contextIsolation:true,nodeIntegration:false,sandbox:true}});current=w;w.removeMenu();w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.session.setPermissionRequestHandler((a,b,done)=>done(false));
 const official=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['store.steampowered.com','login.steampowered.com','steamcommunity.com','help.steampowered.com'].includes(u.hostname)}catch{return false}};
 w.webContents.on('will-navigate',(e,url)=>{if(!official(url))e.preventDefault();});
 let busy=false;
 async function message(text){if(w.isDestroyed())return;await w.webContents.executeJavaScript('document.getElementById("nova-license-status").textContent='+JSON.stringify(text)).catch(()=>{});}
 w.webContents.on('console-message',async details=>{if(details.message!=='NOVA_IMPORT_LICENSE_DATES'||busy)return;const url=new URL(w.webContents.getURL());if(url.hostname!=='store.steampowered.com'||url.pathname!=='/account/licenses/')return;busy=true;
 try{
  // Verify the account identity in memory; no cookie/session value is exported.
  const cookies=await w.webContents.session.cookies.get({url:'https://store.steampowered.com/',name:'steamLoginSecure'});
  const identity=cookies.some(c=>decodeURIComponent(c.value).split('||')[0]===expectedId);
  if(!identity){await message('Accedi allo stesso account Steam collegato a Nova, poi riprova.');return;}
  const rows=await w.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.account_table tr, .account_table_ctn tr')).map(r=>{const cells=r.querySelectorAll('td');if(cells.length<2)return null;const a=cells[1].querySelector('a[href*="/app/"]');return {date:cells[0].innerText.trim(),title:cells[1].innerText.replace(/Remove|Rimuovi/gi,'').trim(),appid:a?.href.match(/\\/app\\/(\\d+)/)?.[1]||''};}).filter(Boolean)`);
  if(!rows.length){await message('Nessuna riga leggibile in questa pagina. Apri la tabella delle licenze e riprova.');return;}
  const result=apply(rows,library);onSave();await message(result.count+' date importate. '+result.unmatched+' licenze senza corrispondenza certa (ad esempio pacchetti). Se ci sono altre pagine, apri la successiva e premi di nuovo Importa.');
 }catch{await message('Importazione non riuscita. Riprova dalla pagina delle licenze.');}finally{busy=false;}});
 w.webContents.on('did-finish-load',async()=>{if(w.isDestroyed())return;const u=new URL(w.webContents.getURL());if(u.hostname!=='store.steampowered.com'||u.pathname!=='/account/licenses/')return;
 await w.webContents.executeJavaScript(`(()=>{if(document.getElementById('nova-license-import'))return;const bar=document.createElement('div');bar.id='nova-license-import';bar.style.cssText='position:sticky;top:0;z-index:99999;padding:16px;background:#172126;color:white;display:flex;align-items:center;gap:20px;font:14px sans-serif';const button=document.createElement('button');button.textContent='Importa le date di questa pagina in Nova';button.style.cssText='padding:12px;cursor:pointer';button.onclick=()=>console.info('NOVA_IMPORT_LICENSE_DATES');const status=document.createElement('span');status.id='nova-license-status';status.textContent='Vengono importati solo titolo e data delle licenze riconosciute.';bar.append(button,status);document.body.prepend(bar);})()`);
 });w.on('closed',()=>{current=null;});w.loadURL('https://store.steampowered.com/account/licenses/?l=english');return true;
}
module.exports={open,apply};
