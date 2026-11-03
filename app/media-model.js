(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.novaMedia=factory();})(globalThis,()=>{
 function image(value){const src=String(value||'').trim();if(!src)return '';try{const u=new URL(src);if(['file:','data:'].includes(u.protocol))return src;if(!['http:','https:'].includes(u.protocol))return '';const match=u.pathname.match(/^\/steamcommunity\/public\/images\/apps\/(\d+)\/([a-f0-9]+\.(?:jpg|png))$/i);if(match&&/(?:^|\.)(?:steamstatic\.com|akamaihd\.net|steampowered\.com)$/.test(u.hostname))return 'https://shared.steamstatic.com/community_assets/images/apps/'+match[1]+'/'+match[2];if(u.protocol==='http:'&&/(?:^|\.)(?:steamstatic\.com|steamcommunity\.com|steampowered\.com)$/.test(u.hostname))u.protocol='https:';return u.protocol==='https:'?u.href:'';}catch{return '';}}
 function depth(scroll,anchor=600){return Math.min(1,Math.max(0,(Number(scroll)||0)/Math.max(220,(Number(anchor)||600)*.55)));}
 return {image,depth};
});
