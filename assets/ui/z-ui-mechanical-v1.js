(function(){
 'use strict';
 // Procedural, zero-lead mechanical UI Foley: no rising bleeps, no BGM ducking.
 // A separate UI audio bus keeps the existing firearm/impact samples unchanged.
 const profiles={
  move:{duration:.115,level:.34,strokes:[[0,.28,.38,.19],[.023,.14,.19,.11]]},
  press:{duration:.165,level:.51,strokes:[[0,.44,.44,.34],[.048,.35,.29,.25]]},
  back:{duration:.17,level:.45,strokes:[[0,.34,.35,.24],[.038,.24,.21,.17]]},
  error:{duration:.175,level:.41,strokes:[[0,.42,.51,.13],[.019,.22,.19,.10]]},
  reroll:{duration:.255,level:.59,strokes:[[0,.42,.42,.32],[.041,.35,.38,.25],[.092,.57,.46,.32]]},
  upgrade:{duration:.35,level:.88,strokes:[[0,.67,.49,.46],[.062,1.0,.63,.60],[.139,.42,.25,.44]]}
 };
 const buffers=new WeakMap();
 const lastPlayed=new WeakMap();
 function build(context,kind){
  const cfg=profiles[kind],rate=context.sampleRate;
  const buffer=context.createBuffer(1,Math.ceil(rate*cfg.duration),rate),out=buffer.getChannelData(0);
  let seed=0x532b8175+kind.length*811;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)/4294967295)*2-1};
  for(const [offset,body,click,metal] of cfg.strokes){
   const start=Math.round(offset*rate),duration=Math.min(.195,cfg.duration-offset);
   let filtered=0,previous=0;
   for(let i=0;i<Math.ceil(duration*rate)&&start+i<out.length;i++){
    const t=i/rate,white=random();
    filtered=filtered*.81+white*.19;
    const sharp=white-filtered*.65;
    const low=Math.sin(2*Math.PI*(103*t+21*(1-Math.exp(-29*t))/29))*
     Math.exp(-t*39)*body;
    const gritty=(sharp*.82+filtered*.56)*Math.exp(-t*76)*click;
    // Inharmonic, rapidly damped sheet-metal resonances (not musical tones).
    const plate=(Math.sin(2*Math.PI*493*t)+.47*Math.sin(2*Math.PI*1163*t)+
       .26*Math.sin(2*Math.PI*1979*t)) * Math.exp(-t*39)*metal;
    const scrape=(filtered-previous*.35)*Math.exp(-t*23)*.23*metal;
    previous=filtered;
    const attack=Math.min(1,t*2500);
    out[start+i]+=attack*(low*.93+gritty*.78+plate*.27+scrape);
   }
  }
  // Small mechanical motor in the gap between the two heavy locking strikes.
  if(kind==='upgrade'||kind==='reroll'){
   const begin=kind==='upgrade'?.015:.014,end=kind==='upgrade'?.175:.115;
   let lp=0;
   for(let i=Math.round(begin*rate);i<Math.min(out.length,Math.round(end*rate));i++){
    const t=i/rate-begin,u=(t/Math.max(.001,end-begin));
    lp=lp*.71+random()*.29;
    const env=Math.sin(Math.PI*u)**1.3;
    const motor=Math.sin(2*Math.PI*(kind==='upgrade'?132:169)*t)*.16;
    out[i]+=(lp*.32+motor)*env*(kind==='upgrade'?.27:.22);
   }
  }
  let peak=.00001;
  for(let i=0;i<out.length;i++)peak=Math.max(peak,Math.abs(out[i]));
  const scale=1/peak;
  for(let i=0;i<out.length;i++){
   const v=out[i]*scale*1.45;
   out[i]=Math.tanh(v)*.87;
  }
  return buffer;
 }
 function prepare(context){
  if(!context)return false;
  if(buffers.has(context))return true;
  const clips={};
  for(const kind of Object.keys(profiles))clips[kind]=build(context,kind);
  buffers.set(context,clips);
  return true;
 }
 function play(context,kind='press'){
  if(!context||!profiles[kind])return false;
  try{
   if(context.state==='suspended')void context.resume?.().catch?.(()=>{});
   if(!prepare(context))return false;
   const now=context.currentTime,stamp=lastPlayed.get(context)||{};
   if(kind==='move'&&now-(stamp.move??-100)<.048)return false;
   stamp[kind]=now;lastPlayed.set(context,stamp);
   const source=context.createBufferSource(),gain=context.createGain();
   source.buffer=buffers.get(context)[kind];
   source.playbackRate.value=kind==='move'?.98+Math.random()*.04:1;
   gain.gain.value=profiles[kind].level*.70;
   source.connect(gain).connect(context.destination);
   source.onended=()=>{try{source.disconnect();gain.disconnect()}catch(_){}};
   source.start(now);
   return true;
  }catch(_){return false}
 }
 function status(context){return {version:'heavy-mechanical-ui-v1',ready:!!context&&buffers.has(context),
  kinds:Object.keys(profiles),independentOfCombat:true,noBgmDucking:true};}
 window.__zUiMachineAudio={prepare,play,status};
})();