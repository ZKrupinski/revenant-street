/* Project Z human vocal combat: real CC0 recordings by HaelDB.
 * Asset credits / provenance: assets/voice/LICENSE.md.
 * This bus does not touch BGM gain. All voice audio is decoded before a run. */
(() => {
 'use strict';
 const CLIPS={
  // Former protagonist cries are now exclusively the enemy pain voices.
  enemyA:'./assets/voice/hero-grunt-a.wav',
  enemyB:'./assets/voice/hero-grunt-b.wav',
  yell:'./assets/voice/voice-yell.wav',
  roar:'./assets/voice/voice-roar.wav',
  // Distinct original generated high-pitched martial arts kiai, not an
  // actor's recording or a voice clone.
  heroA:'./assets/voice/hero-kiai-a.mp3',
  heroB:'./assets/voice/hero-kiai-b.mp3',
  heroPower:'./assets/voice/hero-kiai-power.mp3'
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
  if(!context||!buffers.heroA||!actor||!hero)return false;
  try {
   const now=context.currentTime,isHero=actor===hero,boss=!isHero&&actor.type==='boss';
   if(!isHero&&Math.abs(actor.x-hero.x)>1100)return false;
   const cooldown=kind==='enemyHurt'?.40:
    kind==='enemyShout'||kind==='bossShout'?2.2:
    kind==='heroStrike'?.32:kind==='heroPower'?.46:.24;
   // A lethal scream must never be lost because a grunt just played.
   const fatal=kind==='heroDeath'||kind==='enemyDeath'||kind==='bossDeath';
   if(!fatal&&now-(actor._voiceAt??-99)<(kind==='heroPower'?.14:cooldown))return false;
   if(kind==='enemyHurt'&&now-lastCrowd<.14)return false;
   const important=isHero||boss||kind==='enemyDeath';
   if(active.size>=3) {
    if(!important)return false;
    // Hard caps must not silence the hero's next strong attack or a kill scream.
    const quiet=[...active].find(v=>!v.important)||[...active][0];
    if(!quiet)return false;
    try{quiet.source.stop()}catch(_){}
    active.delete(quiet);
   }
   // Hero offense never borrows the enemies' sustained death shrieks.
   // The hero uses short actual male grunts; enemy wounds/yells use the
   // separate screams/roars. Only the hero's own death may scream.
   // The hero NEVER plays enemy groans, death screams or boss roars.
   // Old hero recordings (enemyA/B) are now the enemy hit reaction pool.
   const file=kind==='heroPower'||kind==='heroDeath'?'heroPower':
    kind==='heroStrike'||kind==='heroHurt'?(Math.random()<.5?'heroA':'heroB'):
    kind==='bossDeath'||kind==='bossShout'?'roar':
    kind==='enemyDeath'?(Math.random()<.65?'yell':'enemyB'):
    kind==='enemyShout'?(Math.random()<.6?'enemyB':'yell'):
    (Math.random()<.5?'enemyA':'enemyB');
   const buffer=buffers[file];
   if(!buffer)return false;
   if(!master) {
    const limiter=context.createDynamicsCompressor(),output=context.createGain();
    limiter.threshold.value=-14;limiter.knee.value=6;limiter.ratio.value=4;
    limiter.attack.value=.003;limiter.release.value=.14;
    // Impact compressor stays on a completely separate audio bus and loudest.
    output.gain.value=.68;limiter.connect(output).connect(context.destination);
    master=limiter;
   }
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=buffer;
   const characterPitch=isHero?(kind==='heroPower'?1.08:kind==='heroHurt'?.92:1.13):boss?.77:actor.type==='elite'?.84:
    actor.type==='guard'?.90:actor.type==='assassin'?1.035:.97;
   const rate=Math.max(.68,Math.min(1.21,characterPitch*(.95+Math.random()*.10)));
   source.playbackRate.value=rate;
   const strengths={heroStrike:.82,heroPower:1.06,heroHurt:.84,heroDeath:1.08,
    enemyHurt:.59,enemyShout:.73,enemyDeath:.87,bossShout:1.02,bossDeath:1.11};
   const position=isHero?1:Math.max(.3,1-Math.abs(actor.x-hero.x)/1600);
   const volume=(strengths[kind]||.7)*position;
   filter.type='lowpass';filter.frequency.value=boss?3500:isHero?6300:4500;
   const maxDuration=kind==='heroStrike'?.42:kind==='heroPower'?.72:
    kind==='heroHurt'?.28:kind==='heroDeath'?1.0:
    kind==='enemyHurt'?.34:kind==='enemyShout'?.74:kind==='bossShout'?1.20:
    kind==='enemyDeath'?1.25:2.2;
   const duration=Math.min(maxDuration,buffer.duration/rate);
   if(!(duration>.02))return false;
   // Let the independent punch crack play first; groans follow ~75ms later.
   const delay=kind==='enemyHurt'||kind==='enemyDeath'||kind==='bossDeath'||kind==='heroHurt'?.085:0;
   const at=now+delay;
   const attack=Math.min(.007,duration*.12),release=Math.min(.09,duration*.28);
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.linearRampToValueAtTime(volume,at+attack);
   gain.gain.setValueAtTime(volume,Math.max(at+attack,at+duration-release));
   gain.gain.linearRampToValueAtTime(.0001,at+duration);
   source.connect(filter).connect(gain).connect(master);
   const entry={source,important};active.add(entry);
   source.onended=()=>{active.delete(entry);source.disconnect();filter.disconnect();gain.disconnect()};
   source.start(at,0,duration*rate);
   source.stop(at+duration+.015);
   actor._voiceAt=now;
   if(kind==='enemyHurt')lastCrowd=now;
   return true;
  } catch(_){return false}
 }
 window.__zCombatVoice={
  prepare,play,
  state:()=>({ready:Object.keys(buffers).length===Object.keys(CLIPS).length,loaded:Object.keys(buffers).length,playing:active.size})
 };
})();
