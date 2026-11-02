'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mapping={
 punchA:'z-ballistic-rifle-20261103-weight-v5.mp3',
 punchB:'z-ballistic-sidearm-20261103-weight-v5.mp3',
 heavy:'z-ballistic-heavy-20261103-weight-v5.mp3',
 parry:'z-rack-from-sidearm-attack-v6.mp3',
 counter:'z-counter-explosive-v6.mp3'
};
const hashes=new Set();
for(const [key,filename] of Object.entries(mapping)){
 const b=fs.readFileSync(path.join(root,'assets/sfx',filename));
 assert(b.length>15000,'new audio master exists '+key+' '+filename);
 assert(b.subarray(0,3).toString()==='ID3'||b[0]===0xff,'MP3 '+filename);
 hashes.add(require('node:crypto').createHash('sha256').update(b).digest('hex'));
}
assert.equal(hashes.size,5,'each of five live SFX paths has its own recorded sample');
const oldRack=fs.readFileSync(path.join(root,'assets/sfx/z-ballistic-parry-20261103-weight-v5.mp3'));
const newRack=fs.readFileSync(path.join(root,'assets/sfx',mapping.parry));
assert.notDeepEqual(oldRack,newRack,'rack is not the previous generated parry sound');
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const [key,filename] of Object.entries(mapping))
  assert(html.includes(key+":'./assets/sfx/"+filename+"?v="+(key==='parry'||key==='counter'?'impactV6':'weightV5')+"'"),entry+' live sample '+key);
 for(const phrase of [
  "playImpactSound('parry',1.65)","playImpactSound('counter',1.35)",
  "playImpactSound('parry',.90)","playImpactSound('parry',.85)",
  "playImpactSound('counter',1.30)","playImpactSound('counter',powered?1.35:1.08)",
  "version:'rack-explosion-v6-20261103'","Object.keys(impactSfxBuffers).length===5"
 ])assert(html.includes(phrase),entry+' missing '+phrase);
 const a=html.indexOf('// PROJECT Z AUDIO V6:'),b=html.indexOf('// Single active controller',a);
 assert(a>0&&b>a,'V6 audio bridge is active');
 const engine=html.slice(a,b);
 assert(!engine.includes('createOscillator')&&!engine.includes('impact-drum')&&
        !engine.includes('shotgun-rack-v2')&&!engine.includes('/assets/voice/shot-'),
       'no previous cartoon or discarded recordings in live attack bus');
 assert(!engine.includes('__revenantBgm'),'do not duck background music');
 assert(engine.includes("const level=key==='counter'?1.89:key==='parry'?1.63"),
  'rack and explosion gain boosted independently');
 assert(html.includes("if(withAudio)playImpactSound(kind,heavy?1.15:1)"),
  'hit feedback can avoid double-blasts while preserving shake and rumble');
 assert(html.includes("!(p.dashSmash||p.airAttack)"),'specials mute per-victim ordinary shots');
 assert(html.includes("if(p.dashSmash&&!p._dashExplosionPlayed)"),'one dash blast per completed attack');
 assert(!html.includes("playImpactSound('heavy',1.1)"),'no old heavy shot layered on dash contacts');
 assert(!html.includes("sound('attack')"),'no old synthetic action chirps');
}
console.log('PASS: attack-derived loud steel rack on parry/jump/dash; V6 explosion on counter and special hits without duplicate sounds');
