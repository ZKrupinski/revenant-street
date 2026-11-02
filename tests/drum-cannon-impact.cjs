'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const name of ['shot-pistol.mp3','shot-revolver.mp3','shot-rifle.mp3','shot-heavy.mp3']){
 const b=fs.readFileSync(path.join(root,'assets/voice',name));
 assert(b.length>15000,'recorded firearm report '+name);
}
const rack=fs.readFileSync(path.join(root,'assets/sfx/shotgun-rack-v2.wav'));
assert.equal(rack.subarray(0,4).toString(),'RIFF');
for(const name of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 for(const s of [
 "punchA:'./assets/voice/shot-pistol.mp3?v=ballistic20261103'",
 "punchB:'./assets/voice/shot-revolver.mp3?v=ballistic20261103'",
 "counter:'./assets/voice/shot-heavy.mp3?v=ballistic20261103'",
 "crack:'./assets/voice/shot-rifle.mp3?v=ballistic20261103'",
 "parry:'./assets/sfx/shotgun-rack-v2.wav?v=ballistic20261103'",
 "playImpactSound('counter',1.25)",
 "playImpactSound('parry',1.65)",
 "comp.threshold.value=-16",
 "Object.keys(impactSfxBuffers).length===6"
 ])assert(html.includes(s),name+' integration '+s);
 const start=html.indexOf('// BALLISTIC FOLEY V3:');
 const end=html.indexOf('// Single active controller',start);
 const sound=html.slice(start,end);
 assert(start>0&&end>start);
 assert(!sound.includes('createOscillator')&&!sound.includes("impact-drum-"),'no comic oscillator or drum assets');
 assert(!sound.includes('__revenantBgm'),'gunfire never ducks BGM');
 assert(!html.includes("if(p.dashSmash||p.airAttack)playCombatGunfire('heavy',p.moveName)"),
   'avoid duplicate muzzle report');
 assert(!html.includes("sound('parry');playCombatVoice('heroStrike')"),
   'no squeaky parry-prep beep');
}
console.log('PASS: ballistic combat reports, predecoded rack/crack, BGM untouched');
