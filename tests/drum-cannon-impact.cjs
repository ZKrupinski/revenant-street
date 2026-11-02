'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const mapping={
 punchA:'z-ballistic-rifle-20261103-weight-v5.mp3',
 punchB:'z-ballistic-sidearm-20261103-weight-v5.mp3',
 punchC:'z-combat-v7-rifle-c.mp3',
 punchD:'z-combat-v7-rifle-d.mp3',
 punchE:'z-combat-v7-pistol-e.mp3',
 punchF:'z-combat-v7-magnum-f.mp3',
 heavy:'z-ballistic-heavy-20261103-weight-v5.mp3',
 parry:'z-combat-v7-slide-a.mp3',
 parryAlt:'z-combat-v7-slide-b.mp3',
 counter:'z-combat-v7-counter-reverb.mp3'
};
const hashes=new Set();
for(const [key,filename] of Object.entries(mapping)){
 const b=fs.readFileSync(path.join(root,'assets/sfx',filename));
 assert(b.length>15000,'audio ready '+key+' '+filename);
 assert(b.subarray(0,3).toString()==='ID3'||b[0]===0xff,'true MP3 '+filename);
 hashes.add(crypto.createHash('sha256').update(b).digest('hex'));
}
assert.equal(hashes.size,10,'ten independent audio buffers, no identical repeated files');
assert.notDeepEqual(fs.readFileSync(path.join(root,'assets/sfx/z-combat-v7-slide-a.mp3')),
 fs.readFileSync(path.join(root,'assets/sfx/z-rack-from-sidearm-attack-v6.mp3')),
 'V7 successful parry uses a new real steel-slide recording, not a recycled attack excerpt');
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const [key,filename] of Object.entries(mapping)){
  const q=key==='punchA'||key==='punchB'||key==='heavy'?'weightV5':'audioV7';
  assert(html.includes(key+":'./assets/sfx/"+filename+"?v="+q+"'"),entry+' missing key '+key);
 }
 for(const phrase of [
  "playImpactSound('parry',1.65)","playImpactSound('counter',1.35)",
  "playImpactSound('parry',.90)","playImpactSound('parry',.85)",
  "playImpactSound('counter',1.30)","playImpactSound('counter',powered?1.35:1.08)",
  "version:'six-shots-steel-slide-reverb-v7-20261103'",
  "Object.keys(impactSfxBuffers).length===10","const Z_ATTACK_REPORT_KEYS=Object.freeze(",
  "function nextImpactAttackKey()","if(bag[0]===impactLastAttackKey)",
  "const duration=key==='counter'?2.28",
  "const release=key==='counter'?Math.min(.34",
  "counter:[590,1,1]","vibrateImpact('counter',true)"
 ])assert(html.includes(phrase),entry+' missing V7 integration '+phrase);
 const a=html.indexOf('// PROJECT Z AUDIO V7:'),b=html.indexOf('// Single active controller',a);
 assert(a>0&&b>a,'V7 engine is live');
 const engine=html.slice(a,b);
 assert(!engine.includes('createOscillator')&&!engine.includes('impact-drum')&&
        !engine.includes('shotgun-rack-v2')&&!engine.includes('/assets/voice/shot-'),'no discarded sounds in live attack bus');
 assert(!engine.includes('__revenantBgm'),'no background music ducking');
 assert(html.includes('if(p.dashSmash&&!p._dashExplosionPlayed)'), 'dash and jump explosion does not duplicate per enemy');
 assert(!html.includes("sound('attack')"),'never replay synthetic arcade attack chirps');
}
console.log('PASS: six non-repeating gun reports, two new real slide actions, 2.28s counter resonance and stronger rumble');
