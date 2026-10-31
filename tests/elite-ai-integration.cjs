'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const actorCode=fs.readFileSync(path.join(root,'assets/elite-ironmask.js'),'utf8');
const moduleCtx={window:{},Image:class {set src(v){this._src=v}},console};
vm.runInNewContext(actorCode,moduleCtx);
const iron=moduleCtx.window.RZElite;
const begin=html.indexOf('function updateEliteAI(');
const end=html.indexOf('// The elite red-hood relief team',begin);
assert(begin>0&&end>begin,'actual in-game Iron Mask AI located');
const game={p:{x:700,y:560},STAGE_WIDTH:31850,screenShake:0,
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),groundY:y=>Math.min(658,Math.max(551,y)),
 bodyHalfX:()=>36,fxBurst:()=>{},floatText:()=>{},playCombatVoice:()=>{}};
vm.createContext(game);
vm.runInContext(html.slice(begin,end)+';this.stepElite=updateEliteAI;',game);
function testScenario(startX,label) {
 const actor={type:'elite',x:startX,y:560,z:0,face:startX>700?-1:1,speed:147,reach:74,
  windup:0,cooldown:0,eliteCooldown:0,eliteSpecialRecover:0,eliteAnnounced:true,
  eliteMenace:0,eliteTell:0,eliteRush:0,eliteRushFace:startX>700?-1:1,
  eliteSpecialElapsed:0,eliteSpecialDuration:1.04,eliteSpecialPlaying:false,
  eliteAttack:false,spriteTime:0,spriteDistance:0,phase:1,visualMoving:false};
 const frames=new Set(),charge=new Set();let rushSeen=false,completed=false;
 for(let i=0;i<360;i++){
  const dt=1/60;
  if(actor.eliteSpecialPlaying){
   actor.eliteSpecialElapsed=Math.min(actor.eliteSpecialDuration,actor.eliteSpecialElapsed+dt);
   if(actor.eliteSpecialElapsed>=actor.eliteSpecialDuration&&actor.eliteRush<=0&&actor.windup<=0)
    actor.eliteSpecialPlaying=false;
  }
  const dx=game.p.x-actor.x,dy=game.p.y-actor.y;
  const processed=game.stepElite(actor,dt,dx,dy,Math.abs(dx));
  if(actor.eliteRush>0)rushSeen=true;
  // Simulate the ordinary windup and damage phase at the exact real AI seam.
  if(!processed&&actor.windup>0){
   actor.windup=Math.max(0,actor.windup-dt);
   if(actor.windup===0)actor.eliteAttack=false;
  }
  const motion=iron.move(actor);
  if(motion==='charge')charge.add(iron.frame(actor,'charge'));
  if(motion==='special')frames.add(iron.frame(actor,'special'));
  if(rushSeen&&!actor.eliteSpecialPlaying&&frames.has(7)){completed=true;break;}
 }
 assert(rushSeen,label+': real AI never fired a crimson rush');
 assert(completed,label+': special interrupted before all 8 frames played');
 assert.deepEqual([...frames].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7],
  label+': every original special frame must be displayed in actual combat');
 assert.deepEqual([...charge].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7],
  label+': charge should also play all 8 original frames');
}
testScenario(780,'close melee 80px');
testScenario(1065,'standard approach 365px');
const interrupt=html.indexOf('const ironSpecialArmor=e.type');
const oldCancel=html.indexOf("if(e.type==='elite'){e.eliteTell=0",interrupt);
assert(interrupt>0&&oldCancel>interrupt,'superarmor is checked before ordinary hit interruption');
assert(html.slice(interrupt,oldCancel).includes('if(ironSpecialArmor)'),
  'ordinary combo hits cannot reset the special before showing all 8 frames');
assert(html.includes('elite=preview'),'direct real Iron Mask test encounter available');
console.log('PASS: actual hooded Iron Mask melee/range AI runs charge 1-8 and attack 1-8; ordinary hits cannot cancel its animation');
