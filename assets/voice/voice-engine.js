/* Project Z human vocal combat: real CC0 recordings by HaelDB.
 * Asset credits / provenance: assets/voice/LICENSE.md.
 * This bus does not touch BGM gain. All voice audio is decoded before a run. */
(() => {
 'use strict';
 const CLIPS={
  a:'./assets/voice/hero-grunt-a.wav',
  b:'./assets/voice/hero-grunt-b.wav',
  yell:'./assets/voice/voice-yell.wav',
  roar:'./assets/voice/voice-roar.wav'
 };
 const buffers=Object.create(null),active=new Set();
 let context=null,loading=null,master=null,lastCrowd=-99;
 async function prepare(ctx) {
  if(loading)return loading;
  if(!ctx||typeof ctx.decodeAudioData!=='function')return false;
  context=ctx;
  loading=Promise.all(Object.entries(CLIPS).map(async([name,url])=>{
   const response=await fetch(url,{cache:'force-cache'});
   if(!response.ok)throw Error('음성 '+name+' HTTP '+response.status);
   const bytes=await response.arrayBuffer();
   buffers[name]=await ctx.decodeAudioData(bytes);
  })).then(()=>true).catch(err=>{loading=null;throw err});
  return loading;
 }
 function play(kind,actor,hero) {
  if(!context||!buffers.a||!actor||!hero)return false;
  try {
   const now=context.currentTime,isHero=actor===hero,boss=!isHero&&actor.type==='boss';
   if(!isHero&&Math.abs(actor.x-hero.x)>1100)return false;
   const cooldown=kind==='enemyHurt'?.40:
    kind==='enemyShout'||kind==='bossShout'?2.2:
    kind==='heroStrike'?.32:kind==='heroPower'?.46:.24;
   if(now-(actor._voiceAt??-99)<cooldown)return false;
   if(kind==='enemyHurt'&&now-lastCrowd<.14)return false;
   const important=isHero||boss||kind==='enemyDeath';
   if(active.size>=3) {
    if(!important)return false;
    const quiet=[...active].find(v=>!v.important);
    if(!quiet)return false;
    try{quiet.source.stop()}catch(_){}
    active.delete(quiet);
   }
   const file=kind==='heroDeath'||kind==='enemyDeath'?'yell':
    kind==='bossDeath'||kind==='bossShout'?'roar':
    kind==='enemyShout'||kind==='heroPower'?'yell':
    Math.random()<.5?'a':'b';
   const buffer=buffers[file];
   if(!buffer)return false;
   if(!master) {
    const limiter=context.createDynamicsCompressor(),output=context.createGain();
    limiter.threshold.value=-14;limiter.knee.value=6;limiter.ratio.value=4;
    limiter.attack.value=.003;limiter.release.value=.14;
    output.gain.value=.92;limiter.connect(output).connect(context.destination);
    master=limiter;
   }
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=buffer;
   const characterPitch=isHero?1.055:boss?.77:actor.type==='elite'?.84:
    actor.type==='guard'?.90:actor.type==='assassin'?1.035:.97;
   const rate=Math.max(.68,Math.min(1.21,characterPitch*(.95+Math.random()*.10)));
   source.playbackRate.value=rate;
   const strengths={heroStrike:.92,heroPower:1.11,heroHurt:1.02,heroDeath:1.20,
    enemyHurt:.76,enemyShout:.84,enemyDeath:.92,bossShout:1.17,bossDeath:1.25};
   const position=isHero?1:Math.max(.3,1-Math.abs(actor.x-hero.x)/1600);
   const volume=(strengths[kind]||.7)*position;
   filter.type='lowpass';filter.frequency.value=boss?3500:isHero?6300:4500;
   const maxDuration=kind==='heroStrike'?.44:kind==='heroPower'?.88:
    kind==='enemyShout'?.72:kind==='bossShout'?1.20:
    kind==='enemyDeath'?1.25:2.2;
   const duration=Math.min(maxDuration,buffer.duration/rate);
   if(!(duration>.02))return false;
   const attack=Math.min(.007,duration*.12),release=Math.min(.09,duration*.28);
   gain.gain.setValueAtTime(.0001,now);
   gain.gain.linearRampToValueAtTime(volume,now+attack);
   gain.gain.setValueAtTime(volume,Math.max(now+attack,now+duration-release));
   gain.gain.linearRampToValueAtTime(.0001,now+duration);
   source.connect(filter).connect(gain).connect(master);
   const entry={source,important};active.add(entry);
   source.onended=()=>{active.delete(entry);source.disconnect();filter.disconnect();gain.disconnect()};
   source.start(now,0,duration*rate);
   source.stop(now+duration+.015);
   actor._voiceAt=now;
   if(kind==='enemyHurt')lastCrowd=now;
   return true;
  } catch(_){return false}
 }
 window.__zCombatVoice={
  prepare,play,
  state:()=>({ready:Object.keys(buffers).length===4,loaded:Object.keys(buffers).length,playing:active.size})
 };
})();
