'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const [name,seconds] of [
 ['impact-drum-a-v2.wav',.33],['impact-drum-b-v2.wav',.36],
 ['impact-drum-heavy-v2.wav',.50],['shotgun-rack-v2.wav',.43],['shotgun-blast-v2.wav',.76]
]){
 const a=fs.readFileSync(path.join(root,'assets/sfx',name));
 assert(a.length>18000&&a.length<65000,name+' valid original PCM');
 assert.equal(a.subarray(0,4).toString(),'RIFF',name+' RIFF');
 assert.equal(a.subarray(8,12).toString(),'WAVE',name+' WAVE');
 assert.equal(a.readUInt32LE(24),32000,'sample rate');
 assert.equal(a.readUInt16LE(22),1,'mono');
 assert.equal(a.readUInt16LE(34),16,'bit depth');
 assert(Math.abs(a.readUInt32LE(40)/64000-seconds)<.001,'duration');
 let peak=0,energy=0;for(let i=44;i<a.length;i+=2){const v=a.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));energy+=v*v;}
 assert(peak<.91&&peak>.70,'safe peak without hard clipping');
 assert(Math.sqrt(energy/((a.length-44)/2))>.10,'substantial body and volume');
}
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const s of ["prepareImpactSfx(audio)","playImpactSound('counter',1.25)",
  "punchA:'./assets/sfx/impact-drum-a-v2.wav","parry:'./assets/sfx/shotgun-rack-v2.wav",
  "counter:'./assets/sfx/shotgun-blast-v2.wav",
  "const now=audio.currentTime,priority=kind==='counter'||kind==='parry';",
  "output.gain.value=.88*NON_BGM_SFX_LEVEL*IMPACT_SFX_TRIM;"])
  assert(html.includes(s),entry+' audio integration '+s);
 assert(html.includes("if(p.dashSmash||p.airAttack)playCombatGunfire('heavy',p.moveName)"),'gunshots only on specials');
 assert(!html.includes("playCombatGunfire(p.dashSmash?'heavy':'normal',p.moveName)"),'normal strikes drum only');
 assert(!html.includes("p.stamina=clamp(p.stamina+25,0,100);sound('parry');"),'parry has no old beep');
 const start=html.indexOf('const Z_IMPACT_SFX_URLS=');
 const end=html.indexOf('// Single active controller',start);
 assert(start>0&&end>start);
 const engine=html.slice(start,end);
 assert(!engine.includes('createOscillator')&&!engine.includes('Math.random()*2-1'),'no noisy live synth');
 assert(!engine.includes('__revenantBgm'),'BGM not ducked');
}
console.log('PASS: 5 original PCM impact samples, shotgun reload and blast, no clipping');
