/* Project Z combat accent sounds: synthesized firearm mechanism foley for
 * protagonist ATTACKS and separate CC0 human groans/yells for enemies.
 * Asset credits / provenance: assets/voice/LICENSE.md.
 * All samples are decoded before gameplay; original impact SFX and BGM are
 * on independent buses and are never attenuated by these effects. */
(() => {
 'use strict';
 const CLIPS={
  // Former protagonist cries are now exclusively the enemy pain voices.
  enemyA:'./assets/voice/hero-grunt-a.wav',
  enemyB:'./assets/voice/hero-grunt-b.wav',
  yell:'./assets/voice/voice-yell.wav',
  roar:'./assets/voice/voice-roar.wav',
  // Foley, not gunfire: short firearm slide, bolt and charging-lever clicks.
  mechA:'./assets/voice/hero-mech-a.mp3',
  mechB:'./assets/voice/hero-mech-b.mp3',
  mechPower:'./assets/voice/hero-mech-power.mp3'
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
  if(!context||!buffers.mechA||!actor||!hero)return false;
  try {
   const now=context.currentTime,isHero=actor===hero,boss=!isHero&&actor.type==='boss';
   // The player is silent on wounds/death: no recycled kiai, and a
   // reload/cocking sound must not fire when the player gets hit.
   if(isHero&&kind!=='heroStrike'&&kind!=='heroPower')return false;
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
   // Absolutely no protagonist voice files can be selected in any branch.
   // The old hero groans remain exclusive to the enemy impact bank.
   const file=kind==='heroPower'?'mechPower':
    kind==='heroStrike'?(Math.random()<.5?'mechA':'mechB'):
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
    // Independent accent bus; impact transients remain foreground and loudest.
    output.gain.value=.58;limiter.connect(output).connect(context.destination);
    master=limiter;
   }
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=buffer;
   const characterPitch=isHero?(kind==='heroPower'?.92:1.03):boss?.77:actor.type==='elite'?.84:
    actor.type==='guard'?.90:actor.type==='assassin'?1.035:.97;
   const rate=Math.max(.68,Math.min(1.21,characterPitch*(.95+Math.random()*.10)));
   source.playbackRate.value=rate;
   const strengths={heroStrike:.94,heroPower:1.07,
    enemyHurt:.59,enemyShout:.73,enemyDeath:.87,bossShout:1.02,bossDeath:1.11};
   const position=isHero?1:Math.max(.3,1-Math.abs(actor.x-hero.x)/1600);
   const volume=(strengths[kind]||.7)*position;
   filter.type='lowpass';filter.frequency.value=isHero?7600:boss?3500:4500;
   const maxDuration=kind==='heroStrike'?.42:kind==='heroPower'?.72:
    kind==='enemyHurt'?.34:kind==='enemyShout'?.74:kind==='bossShout'?1.20:
    kind==='enemyDeath'?1.25:2.2;
   const duration=Math.min(maxDuration,buffer.duration/rate);
   if(!(duration>.02))return false;
   // Let the independent punch crack play first; groans follow ~75ms later.
   const delay=kind==='enemyHurt'||kind==='enemyDeath'||kind==='bossDeath'?.085:0;
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
