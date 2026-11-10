'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function applyImpactFeedback(');
const stop=html.indexOf('function actorShakeOffset(',start);
assert(start>=0&&stop>start,'impact feedback source found');
const impact=html.slice(start,stop);
const context={
  p:{hp:100},screenShake:0,screenTint:0,hitStop:0,
  playImpactSound(){},vibrateImpact(){},
};
vm.createContext(context);
vm.runInContext(impact+'\nthis.impact=applyImpactFeedback;',context);

function trigger({heavy=false,kind='punch',hero=false,previous=0}={}){
  context.screenShake=previous;
  context.screenTint=0;
  context.hitStop=0;
  const actor=hero?context.p:{hp:40};
  context.impact(actor,heavy,kind,false);
  return {shake:context.screenShake,body:actor.bodyShakePower,tint:context.screenTint,stop:context.hitStop};
}
let v=trigger();assert.equal(v.shake,13.5,'regular player hit camera shake decreases from 16 to 13.5');
assert.equal(v.body,9,'enemy recoil stays intact');
assert.equal(v.stop,.072,'hitstop stays intact');
assert.equal(v.tint,.105,'tint stays intact');

v=trigger({hero:true});assert.equal(v.shake,16,'incoming player hit keeps its original shake');
v=trigger({heavy:true});assert.equal(v.shake,24,'heavy strike stays strong');
v=trigger({heavy:true,kind:'dashImpact'});assert.equal(v.shake,24,'dash special stays strong');
v=trigger({heavy:false,kind:'parry'});assert.equal(v.shake,16,'parry routing stays unchanged');
v=trigger({previous:22});assert.equal(v.shake,22,'ongoing larger shake is never erased');
assert(html.includes("screenShake=Math.max(screenShake,powered?25:20);"),'jump landing stays unchanged');
assert(html.includes("hitStop=Math.max(hitStop,.22);screenShake=Math.max(screenShake,30);"),'parry riposte stays unchanged');
assert(html.includes("screenShake=Math.max(screenShake,kind==='slam'?24:12);"),'boss signature stays unchanged');
assert(html.includes("if(screenShake>0){const cameraShake=screenShake*.85;"),'global camera-shake multiplier untouched');
console.log('PASS: basic hit shake 16 -> 13.5 (~16% lower); player damage, heavy/parry/dash, body recoil, tint, hitstop, bosses and global camera motion unchanged');
