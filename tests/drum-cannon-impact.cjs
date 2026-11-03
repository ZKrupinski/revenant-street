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
 parry:'z-combat-v7b-counter-loud-reverb.mp3',
 counter:'z-combat-v7b-slide-b.mp3',
 upgrade:'z-ui-upgrade-confirm-v8.wav',
 reroll:'z-ui-upgrade-reroll-v8.wav'
};
const hashes=new Set();
for(const [key,filename] of Object.entries(mapping)){
 const b=fs.readFileSync(path.join(root,'assets/sfx',filename));
 assert(b.length>(filename.endsWith('.wav')?32000:17000),'non-silent game sound source exists '+key+' '+filename);
 if(filename.endsWith('.wav')){
  assert.equal(b.subarray(0,4).toString(),'RIFF',filename+' must be real WAV');
  assert.equal(b.subarray(8,12).toString(),'WAVE',filename+' correct wave header');
  let peak=0;for(let i=44;i<b.length-1;i+=2)
   peak=Math.max(peak,Math.abs(b.readInt16LE(i)));
  assert(peak>6000,filename+' audible UI feedback');
 }else assert(b.subarray(0,3).toString()==='ID3'||b[0]===0xff,'valid mp3 '+filename);
 hashes.add(crypto.createHash('sha256').update(b).digest('hex'));
}
assert.equal(hashes.size,11,'six attacks, heavy, swapped parry/counter and two separate UI sounds');
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const [key,filename] of Object.entries(mapping)){
  const version=key==='punchA'||key==='punchB'||key==='heavy'?'weightV5':
   key==='punchE'||key==='punchF'?'audioV7c':
   key==='parry'||key==='counter'?'audioV8swap':
   key==='upgrade'||key==='reroll'?'audioV8':'audioV7';
  assert(html.includes(key+":'./assets/sfx/"+filename+"?v="+version+"'"),entry+' game loads '+key);
 }
 for(const phrase of [
  "playImpactSound('parry',1.65)","playImpactSound('counter',1.35)",
  "playImpactSound('parry',.90)","playImpactSound('parry',.85)",
  "playImpactSound('counter',1.30)","playImpactSound('counter',powered?1.35:1.08)",
  "version:'parry-counter-swap-upgrade-ui-v8-20261103'",
  "Object.keys(impactSfxBuffers).length===11",
  "function nextImpactAttackKey()","if(bag[0]===impactLastAttackKey)",
  "const duration=key==='parry'?2.28",
  "const release=key==='parry'?Math.min(.34",
  "counter:[590,1,1]","vibrateImpact('counter',true)",
  "function playUpgradeSfx(type='confirm')",
  "playUpgradeSfx('confirm')","playUpgradeSfx('reroll')"
 ])assert(html.includes(phrase),entry+' missing swapped event or independent UI cue '+phrase);
 const a=html.indexOf('// PROJECT Z AUDIO V8:'),b=html.indexOf('// Single active controller',a);
 assert(a>0&&b>a,'V8 audio code active in game');
 const engine=html.slice(a,b);
 assert(!engine.includes('createOscillator')&&!engine.includes('impact-drum')&&
        !engine.includes('shotgun-rack-v2')&&!engine.includes('/assets/voice/shot-'),'no old discarded sounds');
 assert(!engine.includes('__revenantBgm'),'no BGM ducking');
 assert(html.includes("const isRack=key==='counter'"),'parry and counter sample assignments truly reversed');
 assert(html.includes("const rate=attackIndex<0?1:"),'six shots have additional audible timbre/rate distinctions');
 assert(html.includes("if(withAudio)playImpactSound(target===p?kind:'punch'"),
  'all STANDARD attacks (including heavy punches/kicks) use shuffled sounds, not the same heavy recording');
 assert(html.includes("applyImpactFeedback(e,smash||p.dashSmash,p.dashSmash?'dashImpact':smash?'heavy':'punch'"),
  'heavy punches/kicks still retain their full haptic intensity');
 assert(!html.includes("sound('parry');playImpactSound('heavy',.83)"),
  'upgrade confirmation must not play two aggressive combat sounds');
 assert(html.includes("rewardMenu(upgradeReason,true);updateHud();playUpgradeSfx('reroll')"),
  'upgrade refresh is a separate UI sound');
 assert(html.includes("if(p.dashSmash&&!p._dashExplosionPlayed)"),'dash specials never double play blast');
 assert(!html.includes("sound('attack')"),'never use the old attack oscillator');
}
console.log('PASS: actual swapped parry/counter, six audible varied standard hits, two original UI sounds with independent bus');
