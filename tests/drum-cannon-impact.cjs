'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const mapping={
 punchA:'z-ballistic-rifle-20261103-weight-v5.mp3',
 punchB:'z-ballistic-sidearm-20261103-weight-v5.mp3',
 punchC:'z-combat-v7-rifle-c.mp3',
 punchD:'z-combat-v7-rifle-d.mp3',
 punchE:'z-combat-v7c-rifle-e.mp3',
 punchF:'z-combat-v7c-rifle-f.mp3',
 heavy:'z-ballistic-heavy-20261103-weight-v5.mp3',
 parry:'z-combat-v7b-slide-b.mp3',
 counter:'z-combat-v7b-counter-loud-reverb.mp3'
};
const hashes=new Set();
for(const [key,filename] of Object.entries(mapping)){
 const b=fs.readFileSync(path.join(root,'assets/sfx',filename));
 assert(b.length>17000,'game audio file exists and has data '+key+' '+filename);
 assert(b.subarray(0,3).toString()==='ID3'||b[0]===0xff,'valid mp3 '+filename);
 hashes.add(crypto.createHash('sha256').update(b).digest('hex'));
}
assert.equal(hashes.size,9,'six attack sounds plus heavy, actual mechanical slide and big counter all differ');
assert.notDeepEqual(fs.readFileSync(path.join(root,'assets/sfx/z-combat-v7b-slide-b.mp3')),
 fs.readFileSync(path.join(root,'assets/sfx/z-rack-from-sidearm-attack-v6.mp3')),
 'successful parry has a new actual steel-slide recording');
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const [key,filename] of Object.entries(mapping)){
  const v=key==='punchA'||key==='punchB'||key==='heavy'?'weightV5':
   key==='punchE'||key==='punchF'?'audioV7c':
   key==='parry'||key==='counter'?'audioV7b':'audioV7';
  assert(html.includes(key+":'./assets/sfx/"+filename+"?v="+v+"'"),entry+' missing active clip '+key);
 }
 for(const phrase of [
  "playImpactSound('parry',1.65)","playImpactSound('counter',1.35)",
  "playImpactSound('parry',.90)","playImpactSound('parry',.85)",
  "playImpactSound('counter',1.30)","playImpactSound('counter',powered?1.35:1.08)",
  "version:'six-shots-steel-slide-reverb-v7c-20261103'",
  "Object.keys(impactSfxBuffers).length===9",
  "const Z_ATTACK_REPORT_KEYS=Object.freeze(",
  "function nextImpactAttackKey()","if(bag[0]===impactLastAttackKey)",
  "const duration=key==='counter'?2.28",
  "const release=key==='counter'?Math.min(.34",
  "counter:[590,1,1]","vibrateImpact('counter',true)"
 ])assert(html.includes(phrase),entry+' missing V7c integration '+phrase);
 const a=html.indexOf('// PROJECT Z AUDIO V7:'),b=html.indexOf('// Single active controller',a);
 assert(a>0&&b>a,'V7c code in main game entrypoints');
 const engine=html.slice(a,b);
 assert(!engine.includes('createOscillator')&&!engine.includes('impact-drum')&&
        !engine.includes('shotgun-rack-v2')&&!engine.includes('/assets/voice/shot-'),'old discarded Foley is not used');
 assert(!html.includes('z-combat-v7-slide-a.mp3'),'silent slide A must not be loaded');
 assert(!html.includes('z-combat-v7-pistol-e.mp3')&&!html.includes('z-combat-v7-magnum-f.mp3'),
  'weak attack takes must not be loaded');
 assert(!engine.includes('__revenantBgm'),'BGM never ducks at impact');
 assert(html.includes("if(p.dashSmash&&!p._dashExplosionPlayed)"),'dash boom only once');
 assert(!html.includes("sound('attack')"),'no cartoon attack oscillator');
}
console.log('PASS: six unique shuffled attack audio files, audible genuine metal rack, counter reverb, BGM untouched');
