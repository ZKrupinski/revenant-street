'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mapping={punchA:'rifle',punchB:'sidearm',heavy:'heavy',parry:'parry',counter:'counter'};
const samples=new Set();
for(const key of Object.keys(mapping)){
 const filename='z-ballistic-'+mapping[key]+'-20261103-weight-v5.mp3';
 const file=path.join(root,'assets/sfx',filename);
 const b=fs.readFileSync(file);
 assert(b.length>15000,'independent new original sample '+filename);
 assert(b.length>28000,'enhanced 192 kbps master is shipped: '+filename);
 assert(b.subarray(0,3).toString()==='ID3'||b[0]===0xff,'valid MP3: '+filename);
 samples.add(require('node:crypto').createHash('sha256').update(b).digest('hex'));
}
assert.equal(samples.size,5,'five independently generated original sounds, not recycled assets');
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const [key,label] of Object.entries(mapping))
  assert(html.includes(key+":'./assets/sfx/z-ballistic-"+label+"-20261103-weight-v5.mp3?v=weightV5'"),'active sample '+key);
 for(const phrase of ["playImpactSound('parry',1.65)","playImpactSound('counter',1.25)",
 "Object.keys(impactSfxBuffers).length===5","version:'ballistic-weight-v5-20261103'"])
  assert(html.includes(phrase),entry+' '+phrase);
 const a=html.indexOf('// PROJECT Z ORIGINAL FOLEY V4 / WEIGHT V5 MASTER:'),b=html.indexOf('// Single active controller',a);
 const engine=html.slice(a,b);
 assert(a>0&&b>a,'weight V5 original master loaded');
 assert(!engine.includes('createOscillator')&&!engine.includes('impact-drum')&&!engine.includes('shotgun-rack-v2')&&!engine.includes('/assets/voice/shot-'),'retired original fight sounds');
 assert(!engine.includes('__revenantBgm'),'BGM must never be ducked');
 assert(engine.includes('layer(key,0,1,level,duration,12500,45)'),'single fresh sample per impact, without prior recording layers');
 assert(engine.includes('output.gain.value=1.11*NON_BGM_SFX_LEVEL*IMPACT_SFX_TRIM'),'impact bus is louder without touching music');
 assert(!html.includes("sound('attack')"),'retire synthesized cartoon attack bleeps');
 assert(!html.includes("playCombatVoice('heroPower')"),'retire mechanical hero prep accents');
 assert(html.includes('voice-engine.js?v=20261103-enemyonly-v4'),'new voice cache version');
}
console.log('PASS: five original high-resolution weighted masters, raised combat bus, no recycled audio or BGM ducking');
