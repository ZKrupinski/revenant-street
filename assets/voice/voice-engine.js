/* Project Z combat accent sounds: synthesized firearm mechanism foley for
 * protagonist ATTACKS and UNPITCHED CC0 human pain recordings for enemies.
 * Asset credits / provenance: assets/voice/LICENSE.md.
 * All samples are decoded before gameplay; original impact SFX and BGM are
 * on independent buses and are never attenuated by these effects. */
(() => {
 'use strict';
 const CLIPS={
  // Only two short CC0 human grunts. Old long screams and animal-like
  // pitch-shifted remasters are archival, never loaded or played.
  enemyA:'./assets/voice/hero-grunt-a.wav',
  enemyB:'./assets/voice/hero-grunt-b.wav',
  // Foley, not gunfire: short firearm slide, bolt and charging-lever clicks.
  mechA:'./assets/voice/hero-mech-a.mp3',
  mechB:'./assets/voice/hero-mech-b.mp3',
  mechPower:'./assets/voice/hero-mech-power.mp3',
  shotPistol:'./assets/voice/shot-pistol.mp3',
  shotRevolver:'./assets/voice/shot-revolver.mp3',
  shotRifle:'./assets/voice/shot-rifle.mp3',
  shotHeavy:'./assets/voice/shot-heavy.mp3'
 };
 const buffers=Object.create(null),active=new Set(),activeShots=new Set();
 // Match the game's global SFX 70% mix; this is post-compressor and
 // never touches the separate HTMLAudioElement background soundtrack.
 const NON_BGM_SFX_LEVEL=.70;
 // Preserve normal human formants; no exaggerated 2.15x roar gain.
 // Impact transients remain foreground on an independent bus.
 const ENEMY_VOICE_GAIN=.94;
 let context=null,loading=null,master=null,gunBus=null,lastCrowd=-99;
 const SHOT_FAMILIES=['shotPistol','shotRevolver','shotRifle','shotHeavy'];
 // Attack motions deterministically choose their own timbre and pitch;
 // the same combo will not sound like an identical repeated sample.
 const MOVE_SHOTS={
  jab:0,cross:2,hook:1,uppercut:3,backfist:0,hammerfist:3,
  spinning_elbow:2,rising_elbow:1,superman_punch:3,shovel_hook:1,
  frontkick:0,lowkick:2,roundkick:1,axe_kick:3,sidekick:2,
  spinning_heel:3,crescent_kick:0,diagonal_airkick:2,
  rising_headbutt:1,forward_headbutt:3
 };
 function sampleOnset(buffer) {
  // Trim front silence from generated clips so each blast lands on the
  // actual damage frame. Ordinary browser-decoded buffers have PCM data.
  if(!buffer?.getChannelData)return 0;
  try{
   const data=buffer.getChannelData(0),hz=buffer.sampleRate;
   if(!data?.length||!hz)return 0;
   const step=Math.max(1,Math.floor(hz*.004)),last=Math.min(data.length,Math.floor(hz*.45));
   for(let i=0;i<last;i+=step){
    let peak=0;
    for(let n=i;n<Math.min(i+step,last);n++)peak=Math.max(peak,Math.abs(data[n]));
    if(peak>.035)return Math.max(0,(i/hz)-.006);
   }
  }catch(_){}
  return 0;
 }
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
 function fire(kind='normal',move='jab'){
  if(!context||!buffers.shotPistol)return false;
  try{
   const power=kind==='heavy'||kind==='counter'||kind==='slam'||kind==='execution';
   const idx=power?(kind==='execution'?3:kind==='slam'?3:kind==='counter'?2:3):(MOVE_SHOTS[move]??0);
   const file=SHOT_FAMILIES[idx],buffer=buffers[file],now=context.currentTime;
   if(!buffer)return false;
   if(!gunBus){
    // The shot bus is separate from the CC0 enemy voice and from punch
    // transients; neither hit SFX nor BGM receives ducking or replacement.
    const comp=context.createDynamicsCompressor(),out=context.createGain();
    comp.threshold.value=-10;comp.knee.value=5;comp.ratio.value=3.5;
    comp.attack.value=.002;comp.release.value=.13;
    out.gain.value=1.05*NON_BGM_SFX_LEVEL;comp.connect(out).connect(context.destination);
    gunBus=comp;
   }
   // Never mute a shot because three enemies are simultaneously groaning.
   // Bound shot polyphony independently, stopping only the oldest report.
   if(activeShots.size>=4){const old=activeShots.values().next().value;
    if(old){try{old.source.stop()}catch(_){}activeShots.delete(old)}}
   const source=context.createBufferSource(),eq=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=buffer;eq.type='highpass';eq.frequency.value=power?90:145;
   const moves=Object.keys(MOVE_SHOTS),position=moves.indexOf(move);
   const variation=position<0?0:((position*7)%13)-6;
   source.playbackRate.value=power?(kind==='execution'?.81:kind==='slam'?.84:.90):
    Math.max(.82,Math.min(1.18,1+variation*.016));
   const offset=sampleOnset(buffer),rate=source.playbackRate.value;
   const length=Math.min(power?.80:.52,Math.max(.03,(buffer.duration-offset)/rate));
   if(!(length>.02))return false;
   const volume=kind==='execution'?1.42:kind==='slam'?1.36:power?1.22:.98;
   gain.gain.setValueAtTime(.0001,now);
   gain.gain.linearRampToValueAtTime(volume,now+.006);
   gain.gain.setValueAtTime(volume,Math.max(now+.006,now+length-.065));
   gain.gain.linearRampToValueAtTime(.0001,now+length);
   source.connect(eq).connect(gain).connect(gunBus);
   const entry={source};activeShots.add(entry);
   source.onended=()=>{activeShots.delete(entry);source.disconnect();eq.disconnect();gain.disconnect()};
   source.start(now,offset,length*rate);source.stop(now+length+.012);
   return true;
  }catch(_){return false}
 }


 const ENEMY_ARCHETYPES={
  // Distinct voices by painted enemy appearance, without reusing long thin yells.
  raider:{clip:'enemyA',rate:1.045,low:4900,high:160,presence:-.7,gain:.92,hurt:.18},
  assassin:{clip:'enemyB',rate:1.095,low:6000,high:260,presence:.7,gain:.73,hurt:.15},
  guard:{clip:'enemyA',rate:.925,low:2850,high:95,presence:-2.6,gain:1.03,hurt:.21},
  intruder:{clip:'enemyB',rate:.985,low:3600,high:130,presence:-2.1,gain:.97,hurt:.21},
  elite:{clip:'enemyA',rate:.885,low:2450,high:75,presence:-3.1,gain:1.16,hurt:.25},
  boss:{clip:'enemyB',rate:.865,low:2250,high:65,presence:-3.6,gain:1.20,hurt:.28}
 };
 // [audio clip, start offset in seconds, maximum clip duration, pitch, gain].
 // Redhood, Iron Mask and Hunter gasp several times as they collapse:
 // NEVER play the old long drawn-out "으아아~" vocal.
 const ENEMY_DEATH_STEPS={
  raider:[['enemyA',0,.30,1,1]],
  assassin:[['enemyB',0,.26,1,1]],
  guard:[['enemyA',0,.33,1,1],['enemyB',.29,.24,.97,.54]],
  intruder:[['enemyB',0,.42,1,1],['enemyA',.36,.46,.95,.84],['enemyB',.83,.41,.90,.54]],
  elite:[['enemyA',0,.46,1,1],['enemyB',.37,.56,.96,.92],['enemyA',.91,.58,.92,.73],['enemyB',1.44,.47,.90,.48]],
  boss:[['enemyB',0,.50,1,1],['enemyA',.41,.58,.96,.96],['enemyB',.95,.62,.92,.79],['enemyA',1.52,.57,.88,.62],['enemyB',2.05,.50,.90,.42]]
 };
 function stopVoiceEntry(entry){
  if(!entry)return;
  for(const source of entry.sources){try{source.stop()}catch(_){}}
  active.delete(entry);
  if(entry.actor?._voiceEntry===entry)entry.actor._voiceEntry=null;
 }
 function play(kind,actor,hero){
  if(!context||!buffers.mechA||!actor||!hero)return false;
  try{
   const now=context.currentTime,isHero=actor===hero;
   const profile=isHero?null:(ENEMY_ARCHETYPES[actor.type]||ENEMY_ARCHETYPES.raider);
   if(isHero&&kind!=='heroStrike'&&kind!=='heroPower'&&kind!=='heroMove')return false;
   if(!isHero&&Math.abs(actor.x-hero.x)>1100)return false;
   const fatal=!isHero&&(kind==='enemyDeath'||kind==='bossDeath');
   const cooldown=kind==='enemyHurt'?.48:
    kind==='enemyShout'||kind==='bossShout'?2.8:
    kind==='heroStrike'?.13:kind==='heroPower'?.20:kind==='heroMove'?1.0:.24;
   if(!fatal&&now-(actor._voiceAt??-99)<(kind==='heroPower'?.14:cooldown))return false;
   if(kind==='enemyHurt'&&now-lastCrowd<.20)return false;
   // Fatal cries always override earlier injury samples on this actor.
   if(fatal&&actor._voiceEntry)stopVoiceEntry(actor._voiceEntry);
   const important=isHero||fatal||actor.type==='boss'||actor.type==='elite';
   if(active.size>=4){
    const quiet=[...active].find(v=>!v.important);
    if(!quiet&&!important)return false;
    const victim=quiet||[...active][0];
    if(victim)stopVoiceEntry(victim);
   }
   if(!master){
    const limiter=context.createDynamicsCompressor(),output=context.createGain();
    limiter.threshold.value=-14;limiter.knee.value=6;limiter.ratio.value=4;
    limiter.attack.value=.003;limiter.release.value=.14;
    output.gain.value=.58*NON_BGM_SFX_LEVEL;
    limiter.connect(output).connect(context.destination);
    master=limiter;
   }
   const strengths={heroStrike:.94,heroPower:1.07,heroMove:.29,
    enemyHurt:.64,enemyShout:.48,enemyDeath:.60,bossShout:.58,bossDeath:.74};
   const position=isHero?1:Math.max(.62,1-Math.abs(actor.x-hero.x)/2350);
   const volume=(strengths[kind]||.7)*position*(isHero?1:ENEMY_VOICE_GAIN*profile.gain);
   const heroClip=kind==='heroPower'?'mechPower':Math.random()<.5?'mechA':'mechB';
   const variation=isHero?0:(actor._voiceVariation=(actor._voiceVariation||0)+1);
   const baseRate=isHero?(kind==='heroPower'?.92:1.03):
    profile.rate*(variation%2===0?.985:1.015);
   let steps;
   if(isHero){
    const duration=kind==='heroMove'?.19:kind==='heroStrike'?.42:.72;
    steps=[[heroClip,0,duration,1,1]];
   }else if(fatal){
    steps=ENEMY_DEATH_STEPS[actor.type]||ENEMY_DEATH_STEPS.raider;
   }else{
    const duration=kind==='enemyHurt'?profile.hurt:
     kind==='bossShout'?.29:kind==='enemyShout'?.21:.22;
    steps=[[profile.clip,0,duration,1,1]];
   }
   const entry={important,actor,sources:[]};
   let pending=0;
   for(const [clip,delay,maxDuration,rateFactor,relativeGain] of steps){
    const buffer=buffers[clip];if(!buffer)continue;
    const offset=isHero?0:sampleOnset(buffer);
    const rate=Math.max(.80,Math.min(1.14,baseRate*rateFactor));
    const duration=Math.min(maxDuration,Math.max(0,(buffer.duration-offset)/rate));
    if(!(duration>.02))continue;
    const at=now+(isHero?0:kind==='enemyHurt'||fatal?.06:0)+delay;
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=buffer;source.playbackRate.value=rate;
    filter.type='lowpass';filter.frequency.value=isHero?7600:profile.low;
    const high=isHero?null:context.createBiquadFilter();
    if(high){high.type='highpass';high.frequency.value=profile.high;}
    const presence=isHero?null:context.createBiquadFilter();
    if(presence){presence.type='peaking';presence.frequency.value=1800;presence.gain.value=profile.presence;}
    const attack=Math.min(.009,duration*.12),release=Math.min(fatal?.15:.075,duration*.38);
    const loud=volume*relativeGain;
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.linearRampToValueAtTime(loud,at+attack);
    gain.gain.setValueAtTime(loud,Math.max(at+attack,at+duration-release));
    gain.gain.linearRampToValueAtTime(.0001,at+duration);
    source.connect(filter);
    if(high){filter.connect(high);high.connect(presence);}
    else if(presence)filter.connect(presence);
    if(presence)presence.connect(gain);else filter.connect(gain);
    gain.connect(master);
    pending++;entry.sources.push(source);
    source.onended=()=>{
     pending--;source.disconnect();filter.disconnect();high?.disconnect();presence?.disconnect();gain.disconnect();
     if(pending===0){active.delete(entry);if(actor._voiceEntry===entry)actor._voiceEntry=null;}
    };
    source.start(at,offset,duration*rate);
    source.stop(at+duration+.015);
   }
   if(!pending)return false;
   active.add(entry);actor._voiceEntry=entry;actor._voiceAt=now;
   if(kind==='enemyHurt')lastCrowd=now;
   return true;
  }catch(_){return false}
 }
 window.__zCombatVoice={
  prepare,play,fire,
  state:()=>({ready:Object.keys(buffers).length===Object.keys(CLIPS).length,loaded:Object.keys(buffers).length,playing:active.size,gunshots:activeShots.size})
 };
})();
