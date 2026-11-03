'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('const Z_ENEMY_FX_SIZES=');
const end=html.indexOf('function spawnParrySuccessFx(',begin);
const updateBegin=html.indexOf('function updateEffects(');
const updateEnd=html.indexOf('let modStripCache=',updateBegin);
assert(begin>0&&end>begin&&updateBegin>0&&updateEnd>updateBegin);
const drawn=[],ctx={globalAlpha:.3,globalCompositeOperation:'source-over',save(){},restore(){},
 drawImage(...args){drawn.push({args,alpha:this.globalAlpha})}};
const art={complete:true,naturalWidth:2048,naturalHeight:1024};
const world={
 Math,ctx,fx:[],window:{},W:1280,cameraX:0,time:0,
 p:{moveName:'jab',facing:1,hitFlash:0,bodyShakeTime:0},
 Z_ENEMY_BITMAP_ART:{hit:{image:art,duration:.27},death:{image:art,duration:.72+1/.74}},
 clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),rnd:(a,b)=>(a+b)/2,bodyHalfX:()=>60,
 heroAfterimages:[],attributeFx:[],floating:[],rain:[],
 screenShake:0,screenTint:0,gameState:'menu',zCombatWordQueue:[]
};
vm.createContext(world);
vm.runInContext(html.slice(begin,end)+'\nthis.spawnDeath=spawnEnemyDeathBitmap;this.drawBitmap=drawEnemyBitmapFx;this.deathDuration=zEnemyDeathDuration;',world);
vm.runInContext(html.slice(updateBegin,updateEnd)+'\nthis.tickFx=updateEffects;',world);
function enemy(type){
 return {type,dead:true,fade:1,deathAge:0,collapseAge:0,
  x:520,y:555,z:0,renderX:520,renderY:555};
}
const expectedFrameEnds=[.055,.125,.205,.295,.405,.525,.655,.8];
assert(html.includes('const Z_DEATH_BITMAP_FRAME_ENDS=Object.freeze([.055,.125,.205,.295,.405,.525,.655,.800]);'),
 'eight original death source cells advance on independent time deadlines');
function expectedDeathFrame(t){
 for(let i=0;i<expectedFrameEnds.length;i++)if(t<expectedFrameEnds[i])return i;
 return 6+(Math.floor((t-.8)/.18)%2);
}
function checkFrame(f,expected=expectedDeathFrame(f.firstBurstAge||0)){
 drawn.length=0;world.drawBitmap(f);
 assert.equal(drawn.length,1,'one 512px sprite cell painted');
 const args=drawn[0].args,frame=expectedDeathFrame(f.firstBurstAge||0);
 assert.deepEqual(args.slice(1,5),[(frame%4)*512,Math.floor(frame/4)*512,512,512]);
 assert.equal(drawn[0].alpha,1,'no synthetic death opacity fade');
 assert.equal(frame,expected,'independent VFX clock frame expected');
}
for(const type of ['raider','elite','intruder','guard','assassin','boss']){
 const e=enemy(type),duration=type==='boss'?2.7+1/.58:.72+1/.74;
 world.fx.length=0;assert(world.spawnDeath(e));
 const f=world.fx[0];
 assert.equal(f.maxLife,duration,'death sequence matches actor hold+fade for '+type);
 const collapsing=['raider','elite','intruder','assassin'].includes(type);
 const hold=type==='boss'?2.7:.72;
 const rate=type==='boss'?.58:.74;
 // During fall, effects stay alive and progressively traverse the 8 frames.
 const atHold=hold*.8;
 e.deathAge=atHold;e.collapseAge=collapsing?atHold:0;e.fade=1;
 world.tickFx(.02,.02);
 assert(world.fx.includes(f),'effect is still active while body is shown: '+type);
 assert(Math.abs(f.age-atHold)<1e-8,'effect age locked to body death clock: '+type);
 const p=f.age/f.maxLife;
 checkFrame(f);
 // During body fade, not a single drawing is artificially faded.
 e.deathAge=hold+.5/rate;e.collapseAge=collapsing?e.deathAge:0;e.fade=.5;
 world.tickFx(.02,.02);
 assert(Math.abs(f.age-e.deathAge)<1e-8,'frame follows half-faded character: '+type);
 assert(world.fx.includes(f));
 const middle=f.age/f.maxLife;
 checkFrame(f);
 // Boss/normal both survive until the actor actually reaches zero opacity.
 e.deathAge=hold+.98/rate;e.collapseAge=collapsing?e.deathAge:0;e.fade=.02;
 world.tickFx(.02,.02);
 assert(world.fx.includes(f),'VFX outlives 98% of the body fade: '+type);
 const endProgress=f.age/f.maxLife;
 checkFrame(f);
 e.fade=0;e.deathAge=duration;e.collapseAge=collapsing?duration:0;
 world.tickFx(.02,.02);
 assert(!world.fx.includes(f),'VFX ends only when actor vanishes: '+type);
}
// A long knockback MUST NOT freeze at second flame, nor accelerate body fade.
// Every frame advances within 0.8s even while collapseAge remains zero.
{
 const e=enemy('raider');e.z=125;world.fx=[];world.spawnDeath(e);
 const f=world.fx[0];
 let previous=0;
 const timeline=[[.03,0],[.08,1],[.16,2],[.24,3],[.34,4],
  [.45,5],[.58,6],[.70,7],[.85,6],[1.03,7],[1.23,6]];
 for(const [time,frame] of timeline){
  const elapsed=time-previous;previous=time;e.deathAge+=elapsed;
  e.collapseAge=0;e.fade=1;
  world.tickFx(elapsed,elapsed);
  assert.equal(f.age,0,'collapseAge stays stopped in mid-air');
  assert(world.fx.includes(f),'VFX remains until body vanishes');
  assert(Math.abs(f.firstBurstAge-time)<.00001,'independent animation clock runs in air');
  checkFrame(f,frame);
 }
}

assert(html.includes("ctx.globalAlpha=hit&&progress>.81?Math.max(0,(1-progress)/.19):1;"),
 'hit fading preserved, death opacity stays at 100%');
assert(html.includes("f.kind==='enemyHitBitmap'?true:f.kind==='enemyDeathBitmap'?false"),
 'hit above and death behind character layering remains');
console.log('PASS: uninterrupted 8F death sequence within 800ms even while airborne, moving ash tail until body fades');
