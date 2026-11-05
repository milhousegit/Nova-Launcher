(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.novaContent=factory();})(globalThis,()=>{
 /* Steam announcements mix BBCode, template tokens, HTML entities and mis-encoded text. Readers only want the words. */
 const named={nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',mdash:'—',ndash:'–',hellip:'…',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',bull:'•',middot:'·',copy:'©',reg:'®',trade:'™',euro:'€',pound:'£',deg:'°',times:'×',laquo:'«',raquo:'»'};
 const entity=s=>String(s||'').replace(/&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]{2,8}));/gi,(whole,dec,hex,name)=>{if(name)return named[name.toLowerCase()]??whole;const code=dec?Number(dec):parseInt(hex,16);return code>0&&code<=0x10FFFF&&!(code>=0xD800&&code<=0xDFFF)?String.fromCodePoint(code):'';});
 const decode=s=>{let text=String(s||'');for(let pass=0;pass<2;pass++){const next=entity(text);if(next===text)break;text=next;if(!/&(?:[a-z]{2,8}|#\d{1,7}|#x[0-9a-f]{1,6});/i.test(text))break;}return text;};
 const mojibake=[['â€™','’'],['â€˜','‘'],['â€œ','“'],['â€\u009d','”'],['â€“','–'],['â€”','—'],['â€¦','…'],['â„¢','™'],['Â®','®'],['Â·','·'],['Â ',' ']];
 const markupTags='b|i|u|s|strike|spoiler|noparse|quote|code|list|olist|ulist|li|url|img|color|size|font|center|left|right|justify|sup|sub|h[1-6]|hr|table|thead|tbody|tr|td|th|youtube|video|previewyoutube|p|br|tag|mention|emoji|sticker|lang|hide|expand|carousel|button|dynamiclink';
 const markupPattern=new RegExp('\\[\\/?(?:'+markupTags+')(?:[=\\s][^\\]\\n]*)?\\]','gi');
 const ZWJ=String.fromCharCode(0x200D),odd=String.fromCharCode(0xFFFC,0xFFFD);
 const invisible=new RegExp('(?![\\n\\r\\t])\\p{Cc}|(?!'+ZWJ+')[\\p{Cf}\\p{Zl}\\p{Zp}'+odd+']','gu');
 function cleanText(value){let text=decode(value);for(const [bad,good] of mojibake)text=text.split(bad).join(good);return text.replace(markupPattern,'').replace(/\{[A-Z][A-Z0-9_]{2,}\}(?:\/\S*)?/g,'').replace(invisible,'').replace(/\s*(?:\{\s*\}|\[\s*\])/g,'').replace(/[ \t\f\v ]+/g,' ').replace(/ *\n */g,'\n').trim();}
 const decorative=s=>/^[\s\-_=*~#•·.|+<>^]{3,}$/.test(s);
 function imageUrl(value){value=decode(value).trim().replace('{STEAM_CLAN_IMAGE}','https://clan.cloudflare.steamstatic.com/images');try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
 function articleBlocks(raw){let text=String(raw||'').slice(0,1000000),images=[];const image=value=>{const url=imageUrl(value);if(!url)return '';const index=images.push(url)-1;return '\n\n@@IMAGE'+index+'@@\n\n';};
  text=text.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,'');
  text=text.replace(/\[img\b[^\]]*\bsrc\s*=\s*["']([^"']+)["'][^\]]*\](?:\s*\[\/img\])?/gi,(_,u)=>image(u));
  text=text.replace(/\[\/?p\]/gi,'\n\n');
  text=text.replace(/\[img\][\s\S]*?\[\/img\]/gi,m=>image(m.slice(5,-6))).replace(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi,(_,u)=>image(u));
  text=text.replace(/\[h[1-6]\]([\s\S]*?)\[\/h[1-6]\]/gi,'\n\n## $1\n\n').replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi,'\n\n## $1\n\n');
  text=text.replace(/\[\*\]/g,'\n• ').replace(/\[url(?:=[^\]]*)?\]([\s\S]*?)\[\/url\]/gi,'$1').replace(/\[(?:\/?(?:b|i|u|s|list|olist|quote|code|p|table|tr|td|th|spoiler|hr)|(?:color|size|url|img)=[^\]]*)\]/gi,'').replace(/\[previewyoutube=[\s\S]*?\[\/previewyoutube\]/gi,'');
  text=text.replace(/<br\s*\/?\s*>|<\/(?:p|div|li|ul|ol|blockquote)>/gi,'\n\n').replace(/<[^>]*>/g,'');
  return text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean).flatMap(s=>{if(/^#+$/.test(s))return [];const marker=s.match(/^@@IMAGE(\d+)@@$/);if(marker)return [{type:'image',url:images[Number(marker[1])]}];const heading=s.startsWith('## '),clean=cleanText(heading?s.slice(3):s);if(!clean||decorative(clean))return [];return [{type:heading?'heading':'text',text:clean}];});
 }
 function newsPreview(raw){const blocks=articleBlocks(raw);return {image:blocks.find(b=>b.type==='image')?.url||'',excerpt:blocks.filter(b=>b.type==='text').map(b=>b.text).join(' ').replace(/\s+/g,' ').slice(0,200)};}
 /* One platform per store: Steam Family Sharing is Steam, as the source badges already show. */
 const platformName=n=>/^(steam|steam family|steam family sharing)$/i.test(String(n||'').trim())?'Steam':/^ubisoft( connect)?$/i.test(n)?'Ubisoft':/^(xbox|microsoft store|microsoft|xbox app|pc game pass)$/i.test(n)?'Xbox':n;
 function filterGames(games,{query='',genre='',platform='',status='all'}={}){return games.filter(g=>(!query||g.title.toLowerCase().includes(query.toLowerCase()))&&(!genre||(g.genres||[]).includes(genre))&&(!platform||(g.sources||[]).some(s=>platformName(s)===platformName(platform)))&&(status!=='installed'||g.installed)&&(status!=='never'||!(g.playtime>0)&&!(Date.parse(g.lastPlayed)>0)));}

 function uniqueNews(items){const seen=new Set(),out=[];for(const n of [...(items||[])].sort((a,b)=>Number(b.date)-Number(a.date))){const title=String(n.title||'').toLowerCase().replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(),body=String(n.contents||n.excerpt||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),keys=[];if(n.gid)keys.push('gid:'+n.gid);if(n.url){try{const u=new URL(n.url);u.hash='';for(const key of [...u.searchParams.keys()])if(/^(utm_|snr|source|ref)/i.test(key))u.searchParams.delete(key);keys.push('url:'+u.href.replace(/\/$/,''));const id=u.pathname.match(/\/(?:detail|view)\/(\d+)/)?.[1];if(id)keys.push('gid:'+id);}catch{}}if(title&&body)keys.push('body:'+Math.floor(Number(n.date)/86400)+':'+title+':'+body);if(keys.some(k=>seen.has(k)))continue;keys.forEach(k=>seen.add(k));out.push(n);}return out;}
 function feed(news,achievements,friends){const entries=uniqueNews(news).map(n=>({type:'news',key:'news:'+n.gid,title:n.title,date:Number(n.date)*1000,gid:n.gid,image:n.image||'',imageKind:n.imageKind||'',excerpt:n.excerpt||''}));for(const a of achievements||[])if(a.unlocked&&a.date)entries.push({type:'achievement',key:'self:'+(a.id||a.name),title:a.name,description:a.description,icon:a.icon,date:Date.parse(a.date),source:(a.unlockSources||[]).join(', ')});for(const f of friends||[])entries.push({...f,type:'friendAchievement',key:'friend:'+f.friendId+':'+f.id});return entries.filter(e=>Number.isFinite(e.date)).sort((a,b)=>b.date-a.date);}
 return {uniqueNews,articleBlocks,newsPreview,filterGames,feed,platformName,cleanText};
});
