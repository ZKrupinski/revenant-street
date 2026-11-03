'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'assets/elite-ironmask.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ctx={window:{},Image:class {set src(v){this._src=v;}},console};
vm.runInNewContext(code,ctx,{filename:'elite-ironmask.js'});
const iron=ctx.window.RZElite;
assert.deepEqual([...iron.KEYS],['idle','run','attack','hit','menace','death','charge','special']);
const duration=1.04;
for(let i=0;i<8;i++){
 const actor={eliteSpecialDuration:duration,eliteSpecialElapsed:(i+.4)/8*duration,
   eliteSpecialPlaying:true,eliteRush:0,eliteTell:0,windup:0,attackPoseTime:0,
   eliteSpecialRecover:0,reactionTime:0,proneTime:0,riseTime:0,dead:false,visualMoving:false};
 assert.equal(iron.move(actor),'special','early contact keeps special active in pose '+i);
 assert.equal(iron.frame(actor,'special'),i,'every frame of all 8 must display: '+i);
}
assert.equal(iron.frame({eliteSpecialDuration:duration,eliteSpecialElapsed:duration},'special'),7);
assert.equal(iron.frame({eliteSpecialDuration:duration,eliteSpecialElapsed:0},'special'),0);
const key='eliteSpecialPlaying';
assert(html.includes('eliteSpecialElapsed:0,eliteSpecialDuration:1.04'),
  'new elites begin with an explicit special-attack timer');
assert(html.includes('e.eliteSpecialElapsed=Math.min(duration,(e.eliteSpecialElapsed||0)+actorDt)'),
  'elapsed time always advances independent of windup and collision');
assert(html.includes('e.eliteSpecialPlaying&&e.eliteRush<=0&&e.eliteTell<=0'),
  'early collision must keep the special animation on screen');
assert(html.includes('e.eliteSpecialElapsed=0;e.eliteSpecialDuration=1.04;e.eliteSpecialPlaying=true'),
  'each fresh cast restarts the animation exactly once');
assert(!code.includes('(e.spriteTime||0)*16.4'),
  'old unrelated sprite clock must never skip attack frames');
assert(code.includes('e.eliteSpecialElapsed||0'),'the atlas uses its own timeline');
assert(html.includes('elite-ironmask.js?v=ironmask-recoil-fx-v3-20261103'),
  'both the game and web browser load updated v3 recoil logic');
assert(code.includes("?rev=newhood-special-1f83b64-v2"),
  'original 8-frame special atlas is unchanged and all eight poses retained');
const sheet=fs.readFileSync(path.join(root,'assets/ironmask-elite/special.webp'));
assert(sheet.length>100000,'8-frame bitmap atlas should be fully populated');
assert.equal(sheet.toString('ascii',0,4),'RIFF');
assert.equal(sheet.toString('ascii',8,12),'WEBP');

// Motion transitions: recoil must remain visible during physical knockback,
// and standing idle must never loop the entire 8-frame hurt sheet.
const e={dead:false,z:0,knockVX:0,eliteTell:0,eliteRush:0,windup:0,
 reactionTime:0,reactionDuration:.5,pendingFall:false,proneTime:0,riseTime:0,
 eliteAttack:false,eliteSpecialRecover:0,eliteSpecialPlaying:false,eliteMenace:0,
 visualMoving:false,spriteTime:2};
assert.equal(iron.move(e),'idle');
assert.equal(iron.frame(e,'idle'),Math.floor(2*5.9)%8);
e.knockVX=840;e.spriteTime=10;
assert.equal(iron.move(e),'hit','a body sliding backwards cannot render Idle');
assert.equal(iron.frame(e,'hit'),4,'hold a clear recoil pose while moving');
e.z=72;
assert.equal(iron.move(e),'hit','flying backwards does not look like standing Idle');
assert.equal(iron.frame(e,'hit'),3);
e.knockVX=0;e.z=0;e.reactionTime=.4;
assert.equal(iron.move(e),'hit','the first contact always uses hurt atlas');
assert.equal(iron.frame(e,'hit'),1);
e.reactionTime=0;e.pendingFall=true;
assert.equal(iron.move(e),'hit','pending landing holds knockback pose');
e.pendingFall=false;e.proneTime=.30;
assert.equal(iron.move(e),'hit');
const hold=iron.frame(e,'hit');e.spriteTime+=3;
assert.equal(iron.frame(e,'hit'),hold,'fallen elite never cycles through all eight hurt poses while idle');
assert.equal(hold,7);
e.proneTime=0;e.riseTime=.45;
assert.equal(iron.move(e),'idle','getup is not another looping hit animation');
assert.equal(iron.frame(e,'idle'),0);
e.riseTime=0;
assert.equal(iron.move(e),'idle','only now return to the real idle atlas');
e.visualMoving=true;
assert.equal(iron.move(e),'run','motion resumes after recovery');
e.dead=true;e.z=83;e.knockVX=500;e.reactionTime=.5;
assert.equal(iron.move(e),'death','death artwork wins even while airborne');
assert(!code.includes("ctx.filter='brightness(0) invert(1)'"),
 'no ghostly duplicate white full-body flash during Idle or attacks');
assert(html.includes("if(e.type==='elite')continue;"),
 'elite has no permanent small blinking status satellites');
assert(html.includes("spawnGroundSlamFx(e.x+e.face*82,e.y,1.46,'elite')"),
 'elite slam remains a large grounded VFX forward of its boots');

console.log('PASS: Iron Mask special shows frame 1..8, last pose, independent timeline, source atlas loaded');
