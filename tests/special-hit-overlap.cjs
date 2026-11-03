'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
// Test the real damage entrypoint, including lethal special hits.
const start=html.indexOf("function hurtEnemy(e,dmg,poise,specialKind=''){");
const stop=html.indexOf(" e.poise=clamp(",start);
assert(start>0&&stop>start,'enemy damage entry point preserved');
const contacts=[];
const state={Math,p:{moveName:'jab',dashSmash:false,airAttack:false,counterBoost:false,airKickPhase:''},
 runStats:{hits:0},gainCombatUpgradeCharge(){},intruderEntering:()=>false,
 spawnBasicContactFx(){},
 spawnEnemyHitBitmap(e,dmg,special){contacts.push({e,dmg,special})},
 playCombatVoice(){},time:3};
vm.createContext(state);
vm.runInContext(html.slice(start,stop)+"\n}\nthis.applyHit=hurtEnemy;",state);
function target(hp){return {hp,type:'raider',dead:false,inv:0}}
const killing=target(10);
state.applyHit(killing,100,30,'dash');
assert(killing.hp<0,'special can be lethal');
assert.equal(contacts.length,1,'fatal dash still paints a contact hit');
assert.equal(contacts[0].special,true,'fatal special flagged to bypass budget/throttle');
state.applyHit(target(90),12,22,'');
assert.equal(contacts.length,2,'basic nonfatal contact unchanged');
assert.equal(contacts[1].special,false,'normal hits remain normal');
state.applyHit(target(10),99,90,'');
assert.equal(contacts.length,2,'basic lethal contact is not given an extra forced explosion');
state.p.dashSmash=true;
state.applyHit(target(5),120,100,'');
assert.equal(contacts.length,3,'runtime special mode still guarantees a fatal impact');
assert.equal(contacts[2].special,true);
state.p.dashSmash=false;
for(const [label,needle] of [
 ['jump AoE',"hurtEnemy(enemy,(skill.damage+p.damageBoost)*(1+modRank('power')*.16),45+modRank('jumpspeed')*14,'jump')"],
 ['splash',"hurtEnemy(enemy,damage,(dash?33:45)+rank*(dash?8:14),kind)"],
 ['parry primary',"hurtEnemy(e,Math.min(e.hp,dmg),65+modRank('counter')*25,'counter')"],
 ['direct specials',"p.dashSmash?'dash':p.counterBoost?'counter':p.airAttack||p.airKickPhase==='dive'?'jump':''"],
 ['execution',"hurtEnemy(target,target.type==='boss'?260:999,100,'execution')"],
 ['overload',"hurtEnemy(e,85,105,'overload')"]
 ])assert(html.includes(needle),'explicit victim-hit route for '+label);
assert(html.includes("if(!specialContact&&time-(enemy.lastBitmapHitAt??-99)<.060)return false;"),
 'special hits bypass the ordinary combo contact debounce');
assert(html.includes("if(fx.length>=108){")&&
 html.includes("f.kind==='basicHitSprite'||f.kind==='enemyHitBitmap'"),
 'special AoE impact sprite can replace old normal hit assets under heavy VFX load');
// Validate actual HUD-independent VFX paint order: hit always above bespoke FX,
// death still behind the actors and never drawn in the front pass.
const effectStart=html.indexOf('const Z_FRONT_SPECIAL_FX=new Set([');
const drawStart=html.indexOf('function drawEffects(',effectStart);
const drawEnd=html.indexOf('// Combat-only text overlays are intentionally disabled',drawStart);
assert(effectStart>0&&drawStart>effectStart&&drawEnd>drawStart);
const enemy={x:530,y:560,renderX:530,renderY:560,dead:false,fade:1};
const hit={kind:'enemyHitBitmap',x:535,y:420,contactEnemy:enemy,specialContact:true};
const dash={kind:'dashPierceSprite',x:535,y:420};
const counter={kind:'parryCounterSprite',x:535,y:420};
const slam={kind:'groundSlamSprite',x:535,y:420};
const death={kind:'enemyDeathBitmap',x:535,y:560,deadEnemy:enemy};
const seen=[];
const scene={
 Math,fx:[hit,dash,counter,slam,death],enemies:[enemy],attributeFx:[],
 Z_ENEMY_STATUS_VFX:[],p:{x:90,y:550,dodge:0,evadeBackstep:false},
 W:1280,cameraX:0,drawModEnergy(){},ctx:{save(){},restore(){},drawImage(){}},
 img:{},drawEnemyBitmapFx(f){seen.push(f.kind)},
 drawDashPierceSprite(){seen.push('dashPierceSprite')},
 drawParryCounterSprite(){seen.push('parryCounterSprite')},
 drawGroundSlamSprite(){seen.push('groundSlamSprite');return true}
};
vm.createContext(scene);
vm.runInContext(html.slice(effectStart,drawStart)+'\nthis.selectFx=zHybridVfxForeground;',scene);
vm.runInContext(html.slice(drawStart,drawEnd)+'\nthis.paintFx=drawEffects;',scene);
const selection=scene.selectFx();
scene.paintFx('back',selection);
assert.deepEqual(seen,['enemyDeathBitmap'],'death remains behind characters');
scene.paintFx('front',selection);
assert.deepEqual(seen,['enemyDeathBitmap','dashPierceSprite','parryCounterSprite','groundSlamSprite','enemyHitBitmap'],
 'hit bitmap overlays dash/parry/ground signatures on the same frame, never twice');
console.log('PASS: lethal/nonlethal special hit overlays plus dash/counter/jump/finisher routes; hit is the foremost painted VFX');
