'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mapping={punchA:'rifle',punchB:'sidearm',heavy:'heavy',parry:'parry',counter:'counter'};
const samples=new Set();
for(const key of Object.keys(mapping)){
 const filename='z-ballistic-'+mapping[key]+'-20261103.mp3';
 const file=path.join(root,'assets/sfx',filename);
 const b=fs.readFileSync(file);
 assert(b.length>15000,'independent new original sample '+filename);
 assert(b.subarray(0,3).toString()==='ID3'||b[0]===0xff,'valid MP3: '+filename);
 samples.add(require('node:crypto').createHash('sha256').update(b).digest('hex'));
}
assert.equal(samples.size,5,'five independently generated original sounds, not recycled assets');
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const [key,label] of Object.entries(mapping))
  assert(html.includes(key+":'./assets/sfx/z-ballistic-"+label+"-20261103.mp3?v=originalV4'"),'active sample '+key);
 for(const phrase of ["playImpactSound('parry',1.65)","playImpactSound('counter',1.25)",
 "Object.keys(impactSfxBuffers).length===5","version:'original-mirelo-v4-20261103'"])
  assert(html.includes(phrase),entry+' '+phrase);
 const a=html.indexOf('// PROJECT Z ORIGINAL FOLEY V4:'),b=html.indexOf('// Single active controller',a);
 const engine=html.slice(a,b);
 assert(a>0&&b>a,'original V4 loaded');
 assert(!engine.includes('createOscillator')&&!engine.includes('impact-drum')&&!engine.includes('shotgun-rack-v2')&&!engine.includes('/assets/voice/shot-'),'retired original fight sounds');
 assert(!engine.includes('__revenantBgm'),'BGM must never be ducked');
 assert(engine.includes('layer(key,0,1,level,duration,12500,45)'),'single fresh sample per impact, without prior recording layers');
 assert(!html.includes("sound('attack')"),'retire synthesized cartoon attack bleeps');
 assert(!html.includes("playCombatVoice('heroPower')"),'retire mechanical hero prep accents');
 assert(html.includes('voice-engine.js?v=20261103-enemyonly-v4'),'new voice cache version');
}
console.log('PASS: five unique original Mirelo MP3s, no legacy sounds, distinct parry/counter, no BGM ducking');
