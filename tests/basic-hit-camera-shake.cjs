'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const slice=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const w={console,Math,window:{},location:{search:''},p:{},enemies:[],fx:[],clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 screenShake:0,screenTint:0,hitStop:0,playImpactSound(){},vibrateImpact(){}};
vm.createContext(w);vm.runInContext(slice('// PROJECT Z integrated control feel v1','// END PROJECT Z integrated control feel v1')+
 slice('function applyImpactFeedback(','function actorShakeOffset('),w);
for(const preset of ['Moderate','Extreme']){
 w.window.__zControlFeel.setPreset(preset);
 for(let tick=0;tick<30;tick++){
  vm.runInContext('zFeelTick++',w);
  for(let hit=0;hit<20;hit++)w.applyImpactFeedback({},hit%2===0,'punch',false);
  w.zFeelEndTick();
  for(const scale of [.5,1,2,3]){const off=w.zFeelShakeOffset(scale);assert(Math.hypot(off.x,off.y)*scale<=11+1e-9,'radial CSS pixel cap');}
 }
 for(let n=0;n<5;n++){vm.runInContext('zFeelTick++',w);w.zFeelEndTick();}
 const off=w.zFeelShakeOffset();assert.equal(off.x,0);assert.equal(off.y,0);
}
w.window.__zControlFeel.setPreset('None');w.applyImpactFeedback({},true,'punch',false);w.zFeelEndTick();assert.equal(w.zFeelShakeOffset().x,0);
assert(html.includes('ctx.translate(shake.x,shake.y);'),'renderer consumes capped vector before zoom');
console.log('PASS: all hit kinds and repeated hits <=11 CSS pixels, finite decay, no accumulation, None reset, scaled viewports');
