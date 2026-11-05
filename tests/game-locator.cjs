var assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
var locator=require('../app/game-locator.cjs').create({env:{}});
var base=fs.mkdtempSync(path.join(os.tmpdir(),'nova-locator-')),games=path.join(base,'Games');
function file(relative,size){var full=path.join(games,relative);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,Buffer.alloc(size));return full;}
var other=path.join(games,'Other Game');file('Other Game/other.exe',200000);
var exe=file('Cool Game v2/bin/CoolGame.exe',400000);file('Cool Game v2/unins000.exe',300000);file('Cool Game v2/UnityCrashHandler64.exe',300000);file('Cool Game v2/tiny.exe',1000);file('Cool Game v2/Redist/vcredist_x64.exe',900000);file('Cooler/cooler.exe',200000);
var library={games:[{id:'a',title:'Other Game',copies:[{source:'Hydra',installed:true,folder:other}]}]};

// The folder is found beside the games already in the library; installers and helpers are never picked.
var found=locator.locate({title:'Cool Game'},{source:'Hydra',installed:true},library);
assert.equal(found.folder,path.join(games,'Cool Game v2'));assert.equal(found.executable,exe);
// A known folder is kept and only the executable is searched.
assert.equal(locator.locate({title:'Cool Game'},{source:'Hydra',folder:path.join(games,'Cool Game v2')},library).executable,exe);
// A known executable is kept as it is.
assert.equal(locator.locate({title:'Cool Game'},{source:'Hydra',folder:path.join(games,'Cool Game v2'),executable:exe},library).executable,exe);
// Nothing similar, nothing returned: the user is asked instead.
assert.equal(locator.locate({title:'Unknown Title'},{source:'Hydra',installed:true},library),null);
assert.equal(locator.normalize('Cool Game: Definitive Edition'),'coolgame');
fs.rmSync(base,{recursive:true,force:true});

// Wiring: main applies the user's choices over detected values, and launch options reach Steam and the executable.
var main=fs.readFileSync(path.join(__dirname,'../app/main.cjs'),'utf8');
assert(main.includes("steam://run/'+g.steamId+'//'+encodeURIComponent(copy.arguments)"),'Steam launch options use the documented steam://run form');
assert(main.includes("case 'launchOptions'")&&main.includes("case 'locateGame'")&&main.includes("case 'selectExecutable'"));
assert(main.includes('function withOverrides'),'user choices are layered over detected values');
// SteamGridDB: the game is matched by Steam id, then title, remembered, and can be changed by hand.
assert(main.includes("case 'artMatch'")&&main.includes("sg('games/steam/'+steam)")&&main.includes("case 'artRemember'"));
var setup=fs.readFileSync(path.join(__dirname,'../app/game-setup-ui.js'),'utf8');
assert(setup.includes("call('artMatch'")&&setup.includes('Cambia gioco')&&setup.includes("call('artRemember'"));
console.log('PASS: automatic game folder and executable detection, safe executable choice, and launch option wiring.');
