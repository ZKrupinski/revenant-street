'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'assets/boss-hunter.js'),'utf8');
const warnings=[],impacts=[],attacks=[];
const context={window:{},location:{search:''},
 Image:class{set src(url){this._src=url;this.naturalWidth=2048;this.naturalHeight=1088;this.onload?.()}get src(){return this._src}},
 Math,console};
vm.createContext(context);vm.runInContext(source,context);
const boss=context.window.RZBossHunter;
assert(boss?.onHit&&boss?.tick&&boss?.update&&boss?.state&&boss?.frame);
const api={stageWidth:32000,warning:(e,name)=>warnings.push(name),
 impact:(e,kind)=>impacts.push(kind),attack:(e)=>attacks.push(e.bossMode)};
const player={x:800,y:560};
function enemy(phase=1){return {type:'boss',x:400,y:560,z:0,vz:0,slot:0,
 hp:10500,maxHp:10500,maxPoise:1050,poise:0,phase,face:1,reach:112,damage:44,
 stun:0,groggy:0,windup:0,cooldown:0,knockVX:0,knockVY:0,
 spriteTime:0,spriteDistance:0,visualMoving:false,visualSpeed:0};}
const e=enemy();boss.init(e);e.bossGuardCooldown=0;e.bossIntroduced=true;
for(let i=1;i<=2;i++){const hit=boss.onHit(e,28,'',true,api);assert.equal(hit.guarded,false);assert.equal(e.bossMode,null);}
const blocked=boss.onHit(e,28,'',true,api);
assert.equal(blocked.guarded,true);assert.equal(blocked.triggered,true);
assert.equal(blocked.damageScale,.48);assert.equal(e.bossMode,'guard');
assert.equal(e.bossGuardActivations,1);assert.equal(e.bossRetaliationPending,true);
assert.equal(boss.state(e),'taunt','approved taunt bitmap doubles as an armored brace');
assert(warnings.includes('CRIMSON GUARD'));
const frames=new Set();
for(let t=0;t<48&&e.bossMode==='guard';t++){
 frames.add(boss.frame(e,'taunt'));
 boss.tick(e,1/60);boss.update(e,player,1/60,api);
}
assert.deepEqual([...frames].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7],
 'all eight original taunt cells play while bracing');
assert.equal(e.bossMode,'dash','defense transitions straight to an existing dash counter');
assert.equal(e.bossRetaliationPending,false);
for(let t=0;t<120;t++){boss.tick(e,1/60);boss.update(e,player,1/60,api);}
assert(attacks.includes('dash'),'the retaliation should be a real attack, not only a VFX');
assert.equal(e.bossGuardActivations,1,'no duplicate guard triggers during a single retaliation');
const cooldown=e.bossGuardCooldown;boss.tick(e,.2);assert(e.bossGuardCooldown<cooldown,
 'guard cooldown expires even while another system applies brief stun');
const secondHit=boss.onHit(e,28,'',true,api);assert(!secondHit.triggered,'guard cannot immediately chain again');
const guardHit=enemy();boss.init(guardHit);guardHit.bossGuardCooldown=0;guardHit.bossIntroduced=true;
boss.onHit(guardHit,34,'',true,api);boss.onHit(guardHit,34,'',true,api);
boss.onHit(guardHit,34,'',true,api);
const ordinaryBlocked=boss.onHit(guardHit,34,'',true,api);
assert.equal(ordinaryBlocked.damageScale,.36,'light combos are reduced during guard');
assert.equal(ordinaryBlocked.poiseScale,.12);
assert.equal(ordinaryBlocked.guarded,true);
const heavyHit=boss.onHit(guardHit,220,'dash',false,api);
assert.equal(heavyHit.guarded,false,'strong signature hits are not stunlock-blocked');
assert.equal(heavyHit.damageScale,.86,'heavy skills keep most of their damage');
const perfect=boss.onHit(guardHit,320,'counter',false,api);
assert.equal(perfect.guardBroken,true,'successful parry riposte breaks guard');
assert.equal(perfect.damageScale,1,'skill reward keeps full damage');
assert.equal(guardHit.bossMode,null);assert.equal(guardHit.bossRetaliationPending,false);
const p2=enemy(2);boss.init(p2);p2.bossGuardCooldown=0;p2.bossIntroduced=true;
assert(!boss.onHit(p2,30,'',true,api).triggered);
assert(boss.onHit(p2,30,'',true,api).triggered,'phase 2 punishes two-hit spam');
assert(p2.bossGuardCooldown<e.bossGuardCooldown+6,'guard has a finite cooldown');
const close=enemy();boss.init(close);close.bossIntroduced=true;close.bossGuardCooldown=0;
boss.onHit(close,24,'',true,api);boss.onHit(close,24,'',true,api);
boss.onHit(close,24,'',true,api);
const closeP={x:close.x+145,y:close.y};
for(let t=0;t<50&&close.bossMode==='guard';t++){boss.tick(close,1/60);boss.update(close,closeP,1/60,api);}
assert.equal(close.bossMode,'slam','close-range reversal uses the painted slam, not a teleport');
for(let t=0;t<90;t++){boss.tick(close,1/60);boss.update(close,closeP,1/60,api);}
assert(impacts.includes('slam'),'guard-to-slam genuinely strikes with the existing VFX');
assert(html.includes('boss:[10500,1050,102,44,112]'),'final boss significantly stronger');
assert(html.includes('hunter.maxHp*(wave===1?.52:.76)'),'intermediate bosses have stage-scaled HP');
assert(html.includes('e.type===\'boss\'&&window.RZBossHunter?.onHit?.('),'real damage path checks live guard');
assert(html.includes('if(e.type===\'boss\')window.RZBossHunter?.tick?.(e,actorDt)'),
 'cooldown runs before stun gate');
assert(html.includes('const bossCommitted=e.type===\'boss\''),'committed dash/slam resist combo stunlock');
const begin=html.indexOf('function zBossGuardReversal(e){'),end=html.indexOf('function hurtEnemy(',begin);
assert(begin>0&&end>begin);
const hero={x:505,y:560,z:0,hp:100,attack:.25,attackQueued:true,comboWindow:.5,hitDone:false,stun:0,inv:0,
 attackDriveRemaining:140,attackDriveTotal:280,dashSmash:false,counterBoost:false,airAttack:false};
const heroWorld={p:hero,zFeelPending:{attack:{until:300}},screenShake:0,hitStop:0,STAGE_WIDTH:32000,
 zCancelAttackApproach(){},fxBurst(){},playImpactSound(){return true},vibrateImpact(){},
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),Math};
vm.createContext(heroWorld);vm.runInContext(html.slice(begin,end)+'this.reverse=zBossGuardReversal;',heroWorld);
heroWorld.reverse(e);
assert.equal(hero.hp,100,'defensive recoil pushes Z but does not deal arbitrary damage');
assert.equal(hero.attack,0);assert.equal(hero.attackQueued,false);assert.equal(hero.attackDriveRemaining,0);
assert(hero.x>=605,'hero is knocked back out of melee range');
assert(hero.stun>=.28&&hero.inv>=.42,'short, fair reaction and recovery window');
assert(!heroWorld.zFeelPending.attack,'queued combo press cannot override boss counter');
console.log('PASS: wave/final HP, three-hit guard, phase-2 two-hit guard, 8F brace, real slam/dash retaliation, guard-break, hero recoil, anti-stunlock');
