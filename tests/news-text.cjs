var assert=require('node:assert/strict'),model=require('../app/page-model.js');
var raw='[h1]Patch [Notes][/h1]\n\n[b]Fixes[/b] {LINK}\n\n[quote=Dev]Hello &amp;amp; goodbye[/quote]\n\n[hr][/hr]\n\n-----\n\nâ€™Tis​ fine &mdash; ok &#8217; {STEAM_CLAN_IMAGE}/123/x.png [noparse]raw[/noparse]';
var blocks=model.articleBlocks(raw);
assert.deepEqual(blocks,[{type:'heading',text:'Patch [Notes]'},{type:'text',text:'Fixes'},{type:'text',text:'Hello & goodbye'},{type:'text',text:'’Tis fine — ok ’ raw'}]);
assert.equal(model.cleanText('[b]Title[/b] &amp; {BRACES} [Early Access]�'),'Title & [Early Access]','known markup and template tokens go; ordinary brackets stay');
assert.equal(model.cleanText('Mañana — Ângelo'),'Mañana — Ângelo','legitimate accents are untouched');
assert.equal(model.newsPreview(raw).excerpt.startsWith('Fixes Hello & goodbye'),true);
assert(!/[\[\]{}]/.test(model.newsPreview('[b]Bold[/b] {X_Y} [url=https://example.com]link[/url] [list][*]one[/list]').excerpt));
console.log('PASS: news text drops markup, template tokens, entities and invisible symbols but keeps real words.');
