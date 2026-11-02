const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),script=fs.readFileSync(path.join(root,'assets/voice/voice-engine.js'),'utf8');
for(const name of ['index.html','play-fixed-20261102.html'])
 assert(fs.readFileSync(path.join(root,name),'utf8').includes('voice-engine.js?v=20261102-enemy-archetype-voices-v5'),'both entrypoints bust voice cache');
assert(!script.includes("enemyShout:'./assets/voice/voice-yell.wav'"));
assert(!script.includes("enemyDeath:'./assets/voice/voice-yell.wav'"));
const recorded=[],loads=[];
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){}});
const node=()=>({gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),playbackRate:{value:1},connect(x){return x},disconnect(){}});
const context={currentTime:0,destination:node(),createGain:node,createBiquadFilter:node,createDynamicsCompressor:node,
 createBufferSource:()=>{const n=node();n.start=function(at,offset,len){this.startAt=at;this.playLength=len;this.rate=this.playbackRate.value};n.stop=function(){};recorded.push(n);return n},
 decodeAudioData:async data=>({duration:1.2,clip:data.clip})};
const world={window:{},Math,fetch:async url=>{loads.push(url);return{ok:true,arrayBuffer:async()=>({clip:url})}}};
vm.createContext(world);vm.runInContext(script,world);
(async()=>{
 const api=world.window.__zCombatVoice;await api.prepare(context);
 assert.equal(loads.length,9,'preload 2 enemy grunts, not the shrill yell');
 assert(!loads.some(url=>url.includes('voice-yell')||url.includes('voice-roar')));
 const hero={x:100},names=['raider','assassin','guard','intruder','elite','boss'],identities=new Set();
 for(let i=0;i<names.length;i++){
  const actor={type:names[i],x:260,slot:i};context.currentTime+=.7;
  assert(api.play('enemyHurt',actor,hero),'hurt '+names[i]);
  const last=recorded.at(-1);
  identities.add(last.buffer.clip+'|'+last.rate.toFixed(4));
  assert(last.playLength<.32,'short injury '+names[i]);
  assert(last.startAt>context.currentTime,'impact crack precedes hurt '+names[i]);
  for(const src of recorded){if(src.onended){src.onended();src.onended=null}}
 }
 assert.equal(identities.size,6,'six different types of hit-grunt playback');
 for(const [type,min,max] of [['raider',0,.4],['assassin',0,.4],['guard',.3,.8],['intruder',1.1,1.6],['elite',1.75,2.2],['boss',2.3,3.0]]){
  context.currentTime+=4;
  for(const src of recorded){if(src.onended){src.onended();src.onended=null}}
  const before=recorded.length,actor={x:220,type};
  assert(api.play(type==='boss'?'bossDeath':'enemyDeath',actor,hero),'death '+type);
  const clips=recorded.slice(before),end=Math.max(...clips.map(s=>s.startAt+s.playLength/s.rate))-context.currentTime;
  assert(end>min&&end<max,type+' death timing '+end);
  assert(clips.every(s=>/hero-grunt-[ab]\.wav$/.test(s.buffer.clip)),type+' old shrill vocal absent');
 }
 assert(!script.includes('__revenantBgm'),'voice must not duck music');
 console.log('PASS: all six enemy appearances have unique grunts, increasingly extended elite deaths, no whiny scream');
})().catch(e=>{console.error(e);process.exitCode=1});