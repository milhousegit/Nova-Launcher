var assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('../node_modules/jsdom');
var app=path.join(__dirname,'../app'),read=file=>fs.readFileSync(path.join(app,file),'utf8');

// The design layer and the navigation flow load after every other stylesheet and script.
var html=read('index.html');
assert(html.indexOf('href="console-ui.css"')>html.indexOf('href="settings-recap.css"'),'console-ui.css must load last');
assert(html.indexOf('src="flow.js"')>html.indexOf('src="i18n.js"'),'flow.js must wrap the final render');
var css=read('console-ui.css');
assert(css.includes('#toast{background:#f4f6f3;color:#152025'),'confirmation toast is white with dark text');
for(var rule of css.replace(/\/\*[\s\S]*?\*\//g,'').split('\n').filter(line=>/blur\(/.test(line)))assert(rule.startsWith('body[data-page=details] '),'blur is only allowed on detail pages: '+rule);
assert(!/@keyframes\s+(pageIn|rise)\{[^@]*filter/.test(css),'page keyframes must not animate filters');

// A view change plays one transition; re-rendering the same view or reduced motion does not.
var flow=new JSDOM('<html><body><main id="main"></main></body></html>',{runScripts:'outside-only',url:'https://fixture.invalid'}).window;
flow.eval("var state={settings:{reduceMotion:false}},page='home',lower=-1,detailGame=null,renders=0,animations=0;function render(){renders++;document.getElementById('main').innerHTML='<img src=\"cover.png\">';}document.getElementById('main').animate=function(){animations++;return {cancel(){}}};");
flow.eval(read('flow.js'));
flow.eval('render()');assert.equal(flow.eval('animations'),1);
flow.eval('render()');assert.equal(flow.eval('animations'),1,'same view must not replay the transition');
flow.eval("page='library';render()");assert.equal(flow.eval('animations'),2);
flow.eval("state.settings.reduceMotion=true;page='explore';render()");assert.equal(flow.eval('animations'),2,'reduced motion skips the transition');
assert.equal(flow.eval('renders'),4);
flow.close();

// Changing a settings category swaps the content column without rebuilding the page.
var dom=new JSDOM('<html><body><main id="main"></main></body></html>',{runScripts:'outside-only',url:'https://fixture.invalid'}),w=dom.window;
w.eval("var state={settings:{startupMode:'desktop',platform:'win32'},games:[],apps:[],discord:{}};var settingsTab='general';var page='settings',detailGame=null,panels=[],renderCalls=0;var esc=x=>String(x??'').replaceAll('<','&lt;');var icon=x=>'<svg></svg>';var row=(text,action)=>'<button data-action=\"'+action+'\">'+text+'</button>';var switchRow=row;var keyboardSetting=()=>'';var platformAccountSettingsMarkup=()=>'';var storeDiscoverySettingsMarkup=()=>'';var novaProfileSettingsMarkup=()=>'';var novaAccountMarkup=()=>'';var settingsMarkup=()=>'';var render=()=>{renderCalls++};var paintFocus=()=>{};var call=async()=>true;var toast=()=>{};");
w.eval(read('settings-ui.js'));
var main=w.document.getElementById('main');main.innerHTML=w.eval('settingsMarkup()');
assert(main.querySelector('.settings-status b'),'settings header shows version status');
var before=main.querySelector('.settings-content');
main.querySelector('[data-settings-tab="appearance"]').click();
assert.equal(w.eval('settingsTab'),'appearance');
assert.equal(w.eval('renderCalls'),0,'tab change must not rebuild the page');
assert.notEqual(main.querySelector('.settings-content'),before);
assert(main.querySelector('[data-action="accent-color"]'),'appearance content is shown');
assert.equal(main.querySelector('[data-settings-tab="appearance"]').getAttribute('aria-current'),'page');
assert.equal(main.querySelector('[data-settings-tab="general"]').getAttribute('aria-current'),'false');
assert(main.querySelector('[data-settings-tab="appearance"]').classList.contains('active'));
var current=main.querySelector('.settings-content');
main.querySelector('[data-settings-tab="appearance"]').click();
assert.equal(main.querySelector('.settings-content'),current,'selecting the open category is a no-op');
// Steam and Steam Family Sharing are one platform in the library filter.
var content=require('../app/page-model.js'),owned=[{title:'A',sources:['Steam']},{title:'B',sources:['Steam Family Sharing']},{title:'C',sources:['Epic']}];
assert.equal(content.platformName('Steam Family Sharing'),'Steam');assert.equal(content.platformName('Epic'),'Epic');
assert.deepEqual(content.filterGames(owned,{platform:'Steam'}).map(g=>g.title),['A','B']);
assert.deepEqual([...new Set(owned.flatMap(g=>g.sources.map(content.platformName)))].sort(),['Epic','Steam']);
// Arrow keys leave a text field: up/down always, left/right only at the caret edge.
var field=new JSDOM('<html><body><input id="q" value="abc"></body></html>',{runScripts:'outside-only',url:'https://fixture.invalid'}).window;
field.eval("var panels=[],moves=[];function move(d){moves.push(d)};"+read('ui.js').match(/function leaveField[^\n]*/)[0]);
var input=field.document.getElementById('q');
function press(key,caret,extra){input.setSelectionRange(caret,caret);var before=field.eval('moves.length');field.eval('leaveField')(Object.assign({key,target:input,preventDefault(){}},extra));return field.eval('moves.length')>before;}
assert(press('ArrowDown',1),'down leaves the field');
assert(press('ArrowUp',1),'up leaves the field');
assert(!press('ArrowLeft',2),'left inside the text moves the caret');
assert(press('ArrowLeft',0),'left at the start leaves the field');
assert(!press('ArrowRight',1),'right inside the text moves the caret');
assert(press('ArrowRight',3),'right at the end leaves the field');
assert(!press('ArrowDown',1,{shiftKey:true}),'modified arrows keep native behaviour');
field.close();
dom.window.close();
console.log('PASS: console design layer order, single navigation transition, and in-place settings category switching.');
