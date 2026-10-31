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
assert(html.includes('?v=newhood-special-1f83b64-v2'),
  'the game reloads the updated Iron Mask animation logic');
const sheet=fs.readFileSync(path.join(root,'assets/ironmask-elite/special.webp'));
assert(sheet.length>100000,'8-frame bitmap atlas should be fully populated');
assert.equal(sheet.toString('ascii',0,4),'RIFF');
assert.equal(sheet.toString('ascii',8,12),'WEBP');
console.log('PASS: Iron Mask special shows frame 1..8, last pose, independent timeline, source atlas loaded');
