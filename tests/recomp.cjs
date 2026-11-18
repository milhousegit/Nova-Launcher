'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const create=require('../app/recomp.cjs'),launchPlan=require('../app/launch-plan.cjs');
const lib={installed:{
 sm64:{id:'sm64',name:'Super Mario 64',path:'C:/Recomp Library/sm64',exe:'sm64.exe',played_secs:7260,last_played:1763400000,tag:'v1.2'},
 zelda:{id:'zelda',name:'Zelda 64',path:'C:/Recomp Library/zelda',exe:'zelda.exe'},
 waiting:{id:'waiting',name:'Waiting Setup',path:'C:/Recomp Library/waiting'},
 'bad id':{id:'bad id',name:'x',path:'C:/x',exe:'x.exe'}}};
/* Windows: the launcher is found in its per-user install folder and starts the game with --play. */
const winFiles=new Set(['C:\\Users\\p\\AppData\\Roaming\\com.recomplauncher.app\\library.json','C:\\Users\\p\\AppData\\Local\\RecompLauncher\\recomplauncher.exe','C:\\Recomp Library\\sm64\\sm64.exe','C:\\Recomp Library\\zelda\\zelda.exe']);
const env={APPDATA:'C:\\Users\\p\\AppData\\Roaming',LOCALAPPDATA:'C:\\Users\\p\\AppData\\Local'};
const win=create({platform:'win32',env,home:'C:\\Users\\p',exists:f=>winFiles.has(f),read:()=>JSON.stringify(lib)});
const library={games:[{id:'steam:1',title:'Zelda 64',copies:[{id:'s1',source:'Steam',installed:false}],sources:['Steam']}]};
assert.deepEqual(win.refresh(library),{found:true,launcher:true,games:2,updated:win.status().updated});
const mario=library.games.find(g=>g.id==='recomp:sm64');
assert.equal(mario.title,'Super Mario 64');assert.equal(mario.playtime,7260);assert(mario.lastPlayed.startsWith('2025-11-17'));
const copy=mario.copies[0];
assert.deepEqual([copy.source,copy.installed,copy.executable,copy.arguments,copy.folder],['Recomp',true,'C:\\Users\\p\\AppData\\Local\\RecompLauncher\\recomplauncher.exe','--play sm64','C:\\Recomp Library\\sm64']);
const zelda=library.games.find(g=>g.id==='steam:1');
assert.deepEqual(zelda.sources,['Steam','Recomp'],'a port of a game already in the library joins it as another copy');
assert.equal(library.games.find(g=>g.id==='recomp:waiting').copies[0].installed,false,'a game still waiting for its setup is not playable');
assert(!library.games.some(g=>/bad id/.test(g.id)),'ids that are not safe on a command line are skipped');
const plan=launchPlan.plan({game:mario,copy,platform:'win32',exists:f=>winFiles.has(f)});
assert.deepEqual([plan.method,plan.file,plan.args],['exe',copy.executable,['--play','sm64']],'the launcher starts the game, keeping its playtime and saves');
/* A game removed from RecompLauncher leaves Nova too; Disconnect removes every Recomp copy. */
const fewer=create({platform:'win32',env,home:'C:\\Users\\p',exists:f=>winFiles.has(f),read:()=>JSON.stringify({installed:{sm64:lib.installed.sm64}})});
fewer.refresh(library);
assert.deepEqual(zelda.sources,['Steam']);assert(!library.games.some(g=>g.id==='recomp:zelda'||g.id==='recomp:waiting'));
fewer.forget(library);assert(!library.games.some(g=>g.copies.some(c=>c.source==='Recomp')));assert.equal(library.games.length,1);
/* Linux: no launcher on PATH, so the game's own program runs; the Flatpak data folder is read too. */
const linuxFiles=new Set(['/home/p/.var/app/com.recomplauncher.RecompLauncher/data/com.recomplauncher.app/library.json','/home/p/Games/Recomp Library/sm64/sm64']);
const linux=create({platform:'linux',env:{PATH:'/usr/bin'},home:'/home/p',exists:f=>linuxFiles.has(f),read:()=>JSON.stringify({installed:{sm64:{id:'sm64',name:'Super Mario 64',path:'/home/p/Games/Recomp Library/sm64',exe:'sm64'}}})});
const l2={games:[]};assert.equal(linux.refresh(l2).launcher,false);
assert.deepEqual([l2.games[0].copies[0].executable,l2.games[0].copies[0].arguments],['/home/p/Games/Recomp Library/sm64/sm64',undefined]);
/* Nothing installed: nothing found, nothing added. */
assert.deepEqual(create({platform:'linux',env:{},home:'/none',exists:()=>false}).status().found,false);
console.log('PASS: RecompLauncher library on Windows and Linux, launch through --play, removal and disconnect.');
