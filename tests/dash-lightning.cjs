'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sprite=fs.readFileSync(path.join(root,'assets/vfx/project_z_dash_lightning_8f.png'));
assert.equal(sprite.subarray(0,8).toString('hex'),'89504e470d0a1a0a','raster PNG, not procedural vectors');
assert.equal(sprite.readUInt32BE(16),2172,'4 columns of 543px frames');
assert.equal(sprite.readUInt32BE(20),724,'2 rows of 362px frames');
assert(sprite.includes(Buffer.from('tRNS')),'transparent margins are encoded in the PNG');
assert(sprite.length>25000&&sprite.length<120000,'real authored sprite art is included efficiently');
assert(html.includes("src:'./assets/vfx/project_z_dash_lightning_8f.png'"),'game loads the authored lightning sheet');
assert(html.includes("['대쉬 후 번개 관통 8프레임 비트맵',()=>ensureBitmapDecoded(DASH_PIERCE_ART.image)]"),
 'required art preload must decode lightning before game start');
const begin=html.indexOf('const DASH_PIERCE_ART={');
const end=html.indexOf('function heelLandingShockwave(',begin);
assert(begin>0&&end>begin,'shared eight-frame renderer and spawner exist');
const draws=[],transforms=[];
const world={
 Image:class {
  constructor(){this.complete=false;this.naturalWidth=2172;this.naturalHeight=724}
  set src(s){this._src=s;this.complete=true;this.onload?.()}
  get src(){return this._src}
 },
 ctx:{save(){},restore(){},rotate(){},translate(x,y){transforms.push(['translate',x,y])},
  scale(x,y){transforms.push(['scale',x,y])},drawImage(...args){draws.push(args)}},
 fx:[],window:{},clamp:(v,min,max)=>Math.min(max,Math.max(min,v)),modRank:()=>0
};
vm.createContext(world);
world.p={x:250,y:550,dodge:.25,dodgeDuration:.32,dodgeX:1,evadeBackstep:false,dashSparkDistance:0,dashSparkCount:0,dashSparkSeq:1};
vm.runInContext(html.slice(begin,end)+'\nthis.drawDash=drawDashPierceSprite;this.spawnDash=spawnDashPierceFx;this.emitTrail=emitDashTrailFx;this.drawTrail=drawDashTrailSprite;this.drawCharge=drawDashChargeSprite;',world);
world.spawnDash({x:100,y:550,facing:1},{x:265,y:550});
assert.equal(world.fx.length,1,'one sprite per successful dash attack, not one per nearby enemy');
const f=world.fx[0];
assert.equal(f.kind,'dashPierceSprite');
assert.equal(f.dir,1);
assert.equal(f.x,198,'bolt starts forward near the right-hand fist');
assert.equal(f.y,402,'bolt aligns with attacker punch height');
assert.equal(f.width,560,'bolt grows at least 27% for a nearby impact');
for(let i=0;i<8;i++){
 const progress=(i+.25)/8;
 f.age=f.maxLife*progress;
 f.life=f.maxLife*(1-progress);
 assert.equal(world.drawDash(f),true);
}
assert.equal(draws.length,8,'all eight source cells render');
for(let i=0;i<8;i++){
 const args=draws[i];
 assert.equal(args[1],(i%4)*543);
 assert.equal(args[2],Math.floor(i/4)*362);
 assert.equal(args[3],543);
 assert.equal(args[4],362);
}

const skipsBefore=draws.length;
world.spawnDash({x:100,y:550,facing:1},{x:430,y:550});
const stalled=world.fx.at(-1);
for(let i=0;i<8;i++){
 stalled.age=stalled.maxLife; // Simulate a large elapsed frame time.
 assert.equal(world.drawDash(stalled),true);
}
assert.deepEqual(draws.slice(skipsBefore).map(d=>[d[1],d[2]]),
 Array.from({length:8},(_,i)=>[(i%4)*543,Math.floor(i/4)*362]),
 'variable-FPS catchup must still display every frame once and in order');
world.spawnDash({x:600,y:550,facing:-1},{x:430,y:550});
const left=world.fx.at(-1);
assert.equal(left.dir,-1);
assert.equal(left.x,502,'left-facing art shifts toward enemy, not behind Z');
assert.equal(world.drawDash(left),true);
assert(transforms.some(([op,x,y])=>op==='scale'&&x===-1&&y===1),
 'left attacks flip the authored right-facing sprite horizontally');
assert(html.includes('if(p.dashSmash&&hits===0){')&&
 html.includes('spawnDashPierceFx(p,e); // single real contact, not once per splash victim'),
 'lightning plays only at the first confirmed direct punch collision, never once per splash enemy');
assert(!html.includes("spawnDashPierceFx(p,e); // when beginning dash"),
 'not played on button press or whiff');
assert(html.includes("if(f.kind==='dashPierceSprite'){drawDashPierceSprite(f);continue;}"),
 'sprite renders in the normal world-space effect pass, over the enemy');
console.log('PASS: 8-frame transparent lightning, decoded on start, first dash hit only, full sequence and bilateral facing');


// Dash ends with a short grace and its committed follow-up punch cannot be
// interrupted before impact by the enemy hurt/stun code.
const combat={
 gameState:'playing',hitStop:0.2,
 runStats:{attacks:0,hits:0,style:{jump:0,dash:0,parry:0}},
 p:{x:100,y:550,z:0,facing:1,stun:0,downTimer:0,getupTimer:0,
  hp:100,stamina:100,moveDX:0,attack:0,parry:0,dodge:0,inv:0,
  riposteChasing:false,dashFollowWindow:0,recentMoves:[],comboIdx:0},
 analog:{dx:0},keys:new Set(),performance:{now:()=>10},
 dashMobilityStats:()=>({duration:.32,speed:1250}),
 modRank:()=>0,clamp:(v,min,max)=>Math.min(max,Math.max(min,v)),
 loadZMove(){},fxBurst(){},sound(){},playCombatVoice(){},playImpactSound(){return true},
 triggerStrikeCamera(){},vibrateImpact(){},bodyHalfX:()=>54
};
vm.createContext(combat);
const dodgeStart=html.indexOf('function dodge('),dodgeEnd=html.indexOf('function consumeBufferedDash(');
const attackStart=html.indexOf('function startAttack(){'),attackEnd=html.indexOf('function parry(){');
const enemyStart=html.indexOf('function enemyAttack('),enemyEnd=html.indexOf('function fxBurst(');
assert(dodgeStart>0&&dodgeEnd>dodgeStart&&attackStart>0&&attackEnd>attackStart&&enemyStart>0&&enemyEnd>enemyStart);
vm.runInContext(html.slice(dodgeStart,dodgeEnd)+'\nthis.useDash=dodge;',combat);
vm.runInContext(html.slice(attackStart,attackEnd)+'\nthis.useDashAttack=startAttack;',combat);
vm.runInContext(html.slice(enemyStart,enemyEnd)+'\nthis.enemyStrike=enemyAttack;',combat);
assert.equal(combat.useDash(),true);
assert(Math.abs(combat.p.inv-(combat.p.dodgeDuration+.24))<1e-8,
 'regular forward dash gets 240ms i-frames AFTER movement ends');
combat.p.dodge=0; // elapsed dash, the follow-up window is still active
combat.p.inv=.18; // simulate remaining post-dash invulnerability
combat.useDashAttack();
assert.equal(combat.p.dashSmash,true,'dash + attack commits to the lunge punch');
assert(combat.p.inv>=combat.p.attackDuration+.139,
 'the entire dash follow-up and 140ms of recovery are invulnerable');
const hpBefore=combat.p.hp,attackBefore=combat.p.attack;
combat.enemyStrike({type:'raider',dead:false,groggy:0,eliteAttack:false,
 x:combat.p.x+66,y:combat.p.y,z:0,reach:70,damage:30,face:-1});
assert.equal(combat.p.hp,hpBefore,'enemy attack cannot damage during the protected dash punch');
assert.equal(combat.p.attack,attackBefore,'enemy attack cannot cancel the protected dash punch');
console.log('PASS: enlarged forward-aligned dash lightning and uninterrupted post-dash punch');

const firstTrail=world.fx.length;
world.emitTrail(world.p,100,292);
const streaks=world.fx.slice(firstTrail);
assert.equal(streaks.length,6,'3 pairs per 192px real forward dash');
assert.equal(streaks.filter(f=>f.mode==='wake').length,3);
assert.equal(streaks.filter(f=>f.mode==='gather').length,3);
assert(streaks.every(f=>f.kind==='dashTrailSprite'&&f.dir===1));
assert.equal(streaks[0].x,118,'wake lands 36px behind its distance sample');
assert.equal(streaks[1].x,89,'gather electricity spawns farther back on dash path');
assert.equal(streaks[0].width,230,'wake is horizontally wider than original 166px');
assert.equal(streaks[1].width,154,'fist seeking sparks widen while staying small');
const seeker=streaks.find(f=>f.mode==='gather');
const wake=streaks.find(f=>f.mode==='wake');
const startDraw=draws.length,startTransform=transforms.length;
world.p.x=410;seeker.life=seeker.maxLife*.30;
assert(world.drawTrail(seeker)&&world.drawTrail(wake)&&world.drawCharge(world.p));
assert.equal(draws.length,startDraw+3,'all dash sprites come from 8F bitmap');
const tailTransforms=transforms.slice(startTransform);
assert(tailTransforms.some(([k,x,y])=>k==='translate'&&x>seeker.x&&Math.abs(y-404)<Math.abs(seeker.y-404)),
 'electricity converges toward forward moving fist');
assert(tailTransforms.some(([k,x,y])=>k==='translate'&&x===world.p.x+52+(1-world.p.dodge/world.p.dodgeDuration)*26&&y===404),
 'charged bitmap shifts 32px toward the rear while staying at fist height');
const drawnWake=draws[startDraw+1],drawnCharge=draws[startDraw+2];
assert(drawnWake[8]<drawnWake[7]*.52,'wake is stretched wide and compressed vertically');
assert(drawnCharge[8]<drawnCharge[7]*.57,'charging electricity also stretches across dash direction');
const noMore=world.fx.length;
world.p.evadeBackstep=true;world.emitTrail(world.p,410,335);
assert.equal(world.fx.length,noMore);assert.equal(world.drawCharge(world.p),false);
world.p.evadeBackstep=false;world.p.dodge=0;world.emitTrail(world.p,335,450);
assert.equal(world.fx.length,noMore,'no fake trail on regular running');
world.p.dodge=.18;world.p.dodgeX=-1;world.p.dashSparkSeq++;world.p.dashSparkDistance=0;world.p.dashSparkCount=0;
world.emitTrail(world.p,600,440);
assert(world.fx.slice(noMore).some(f=>f.dir===-1),'mirror for left dash');
assert(html.includes("if(p.dodge>0&&!p.evadeBackstep&&p.stun<=0)emitDashTrailFx(p,movementStartX,p.x)"));
assert(html.includes("if(layer!=='back'&&p.dodge>0&&!p.evadeBackstep)drawDashChargeSprite(p)"),'dash charge stays in front of characters in hybrid mode');
console.log('PASS: trailing and fist-seeking electrical sprites on forward dash only');
