const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const content=require('./page-model.js');
const root=path.dirname(process.execPath),data=path.join(process.env.APPDATA||require('os').homedir(),'Nova Launcher');
const read=(p,f={})=>{try{return JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))}catch{return f}};
const media=p=>!p?'':/^(https?:|file:|data:)/.test(p)?p:pathToFileURL(p).href;
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
function enrich(g){const pg=read(path.join(data,'GamePages',g.playniteId+'.json'));g.description=plain(g.description||pg.description);g.screenshots=g.screenshots?.length?g.screenshots:pg.screenshots||[];g.genres=g.genres?.length?g.genres:(pg.genres||[]).map(x=>x.description);g.developers=g.developers||pg.developers||[];g.release=g.release||pg.release||'';return g;}
function news(games){const result=[];for(const game of games.filter(g=>g.steamId)){const n=read(path.join(data,'News',game.steamId+'.json'));for(const item of n.appnews?.newsitems||[]){if(item.date*1000<Date.now()-7*86400000)continue;result.push({gid:item.gid,title:plain(item.title),gameId:game.id,game:game.title,cover:game.cover,...content.newsPreview(item.contents),date:item.date,url:item.url,contents:plain(item.contents)});}}return content.uniqueNews(result);}
module.exports={root,data,read,media,plain,news,enrich};
