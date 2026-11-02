'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const n of ['drum-punch-a','drum-punch-b','drum-heavy','shield-parry','cannon-riposte']){
 const a=fs.readFileSync(path.join(root,'assets/sfx',n+'.mp3'));
 assert(a.length>5000&&a.length<16000,n+' encoded original mp3');
 assert(a.subarray(0,3).toString()==='ID3'||a[0]===255,n+' valid MP3 header');
}
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const s of ["prepareImpactSfx(audio)","playImpactSound('counter',1.25)",
  "punchA:'./assets/sfx/drum-punch-a.mp3","counter:'./assets/sfx/cannon-riposte.mp3",
  'output.gain.value=.90*NON_BGM_SFX_LEVEL*IMPACT_SFX_TRIM;'])
  assert(html.includes(s),entry+' audio integration '+s);
 const start=html.indexOf('const Z_IMPACT_SFX_URLS=');
 const end=html.indexOf('// Single active controller',start);
 assert(start>0&&end>start);
 const engine=html.slice(start,end);
 assert(!engine.includes('createOscillator')&&!engine.includes('Math.random()*2-1'),
  'original samples replace overdriven synth and random clipped noise');
 assert(!engine.includes('__revenantBgm'),'impact code never ducks the soundtrack');
 assert(!html.includes("playCombatGunfire('counter','superman_punch')"),
  'counter cannon does not double with high-frequency rifle shot');
}
console.log('PASS: five original percussion and cannon MP3, predecoded, no noise oscillator or BGM ducking, landed riposte cannon');
