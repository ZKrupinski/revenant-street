'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const section=(a,b)=>{const s=html.indexOf(a),e=html.indexOf(b,s+a.length);assert(s>=0&&e>s,a);return html.slice(s,e)};
let count=0;const test=(n,fn)=>{fn();count++;console.log('PASS',n)};
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
function harness(){
 const p={x:1000,y:570,z:0,vz:0,facing:1,hp:100,maxHp:100,stamina:100,stun:0,downTimer:0,getupTimer:0,
 attack:0,attackDuration:0,parry:0,dodge:0,moveDX:0,moveDY:0,jumpPadDX:0,jumpPadDY:0,
 jumpActive:false,jumpTime:0,doubleJumpUsed:false,airAttack:false,airKickPhase:'',mods:[],
 dashFollowWindow:0,riposteWindow:0,inv:0,counterRush:0,comboWindow:0,attackDriveRemaining:0,weapon:0,
 jumpStartTimer:0,landingTimer:0,hitHeavyTimer:0,hitTimeout:0,hits:0,parryRecoilTime:0,motionTime:0};
 const w={Math,console,window:{},location:{search:""},p,keys:new Set(),padPrev:{},touchFaceHeld:new Set(),analog:{dx:0,dy:0},
 gameState:'playing',heroEntry:{active:false},perma:{lift:0,sprint:0},runStats:{attacks:0},enemies:[],fx:[],
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),groundY:y=>y,MOD_LEVEL_CAP:6,PLAYER_DASH_SPEED:2200,
 PLAYER_RUN_SPEED:690,PLAYER_WALK_SPEED:395,W:1280,STAGE_WIDTH:32000,cameraX:0,
 slowMotion:0,parrySlowTarget:null,riposteCinematicTime:0,hitStop:0,screenShake:0,time:0,
 modRank:id=>p.mods.filter(x=>x===id).length,zCancelAttackApproach(){p.attackApproachTarget=null},
 loadZMove(){},fxBurst(){},playActionOnset(){},playImpactSound(){},
 consumeBufferedDash(){return false},bodyHalfX:()=>54,footstepRumble(){},emitDashTrailFx(){},spawnHealVfx(){},attackCheck(){},
 startAttackNow(){w.runStats.attacks++;p.attack=p.attackDuration=.45;},performance:{now:()=>0}};
 vm.createContext(w);
 vm.runInContext(section('function dashMobilityStats(', 'function upgradeDescription(')+
 section('// PROJECT Z integrated control feel v1','// END PROJECT Z integrated control feel v1')+
 section('function dodgeNow(', 'function consumeBufferedDash(')+
 section('function jumpNow(', 'function execute(')+
 section('function control(dt,pad){','// Visual-footprint spacing'),w);
 w.eval=s=>vm.runInContext(s,w);
 w.tick=(input)=>{if(input)w.eval(input);w.eval('zFeelTick++;zFeelInTick=true;zFeelConsume();');
  if(!w.eval('zFeelFrozen(p)'))w.control(1/60,{dx:0,dy:0});w.zFeelEndTick();w.eval('zFeelInTick=false');};
 return w;
}
test('all inline scripts parse',()=>{for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);});
test('upgrade formulas: dash range/speed, air speed, double jump unlock Lv3 preserved',()=>{
 const w=harness();for(let level=0;level<=6;level++){
  const d=w.dashMobilityStats(level,level);near(d.duration,.28+.03*level);assert.equal(d.speed,Math.round(2200*(1+.14*level)));
  const j=w.jumpMobilityStats(level,level),s=w.doubleJumpMobilityStats(level,level);
  assert.equal(j.impulse,670+45*level);assert.equal(j.moveSpeed,Math.round(700*(1+.14*level)));
  assert.equal(s.unlocked,level>=3);if(level>=3)near(s.speedMultiplier,1.12+.16*(level-3));
 }
 w.perma.lift=3;assert.equal(w.jumpMobilityStats(2).impulse,820);
});
test('actual jump function: locked below Lv3; once per airborne; no buffer secretly spends charge',()=>{
 for(const level of [0,2,3,6]){const w=harness();w.p.mods=Array(level).fill('jumpheight');w.keys.add('arrowup');
  w.tick('jump()');assert(w.p.jumpActive);w.tick();w.tick('jump()');assert.equal(w.p.doubleJumpUsed,level>=3);
  const before=w.p.vz;w.tick('jump()');assert(w.p.vz<before,'third press never adds impulse');
 }
 const w=harness();w.p.mods=Array(3).fill('jumpheight');w.keys.add('arrowup');w.tick('jump()');w.tick();
 w.eval('jump();p._feelFreezeUntil=zFeelTick+3');w.tick();w.tick();w.tick();assert.equal(w.p.doubleJumpUsed,false);
});
test('full basic jump 150px at tick22, landing tick40; quick release 82.5px',()=>{
 const w=harness();w.keys.add('arrowup');w.tick('jump()');for(let i=1;i<22;i++)w.tick();near(w.p.z,150);
 for(let i=22;i<40;i++)w.tick();near(w.p.z,0);
 const q=harness();q.tick('jump()');const profile=q.p._feelJump;near(profile.origin+q.p.vz*q.p.vz/(2*profile.g)+q.p.z,82.5);
});
test('landing buffer starts immediately without double-jump debit',()=>{
 const w=harness();w.p.z=1;w.p.vz=-100;w.p.jumpActive=true;w.p.doubleJumpUsed=true;
 w.tick('jump()');assert(w.p.z>0||w.p.vz>0);assert.equal(w.p.doubleJumpUsed,false);assert(w.p._feelJump.cut);
 assert(w.window.__zControlFeel.logs().some(e=>e.source==='landing-buffer'||e.source==='direct'));
});
test('same-tick attack+dodge prioritizes dodge; exact cancel boundary and expiry',()=>{
 const w=harness();w.tick('startAttack();dodge()');assert(w.p.dodge>0);assert.equal(w.runStats.attacks,0);
 for(const first of [10,11]){const a=harness();a.p.attackDuration=.45;a.p.attack=.45-(first-1)/60;
  for(let f=first;f<=15;f++)a.tick(f===first?'dodge()':undefined);
  assert.equal(a.p.dodge>0,first===11,'cancel first'+first);
 }
});
test('participant hitstop saves inputs while only actor movement stops',()=>{
 const w=harness(),target={};w.eval('p.attackDuration=.45;p.attack=.45-14/60');w.zFeelImpact(target);
 const x=w.p.x;w.tick('dodge()');near(w.p.x,x);assert.equal(w.p.dodge,0);w.tick();w.tick();w.tick();assert(w.p.dodge>0);
});
test('actual ground movement: six ticks to full run, four ticks/6px braking',()=>{
 const w=harness();w.keys.add('d');for(let i=0;i<6;i++)w.tick();near(w.p._feelVX,690);const x=w.p.x;
 w.keys.clear();for(let i=0;i<4;i++)w.tick();near(w.p.x-x,6);near(w.p._feelVX,0);
 w.keys.add('d');for(let i=0;i<6;i++)w.tick();w.keys.clear();w.keys.add('a');for(let i=0;i<7;i++)w.tick();near(w.p._feelVX,-690);
});
test('HASTE still scales attack duration and special skill formulas unchanged',()=>{
 assert(html.includes('Z_FEEL.attackFrames/60/(1+modRank(\'haste\')*.075)'));
 assert(html.includes("damage:28+12*level,range:180+36*level"));
 assert(html.includes("damage:1.10+.22*level,range:150+25*level"));
 assert(html.includes('damage:45+30*level,range:100+35*level'));
});
test('contact effect limit, duration, None, preset clamp',()=>{
 const w=harness(),enemy={};w.fx.push({kind:'enemyHitBitmap',width:600,life:2,maxLife:2,contactEnemy:enemy});
 w.zFeelLimitFx();near(w.fx[0].maxLife,5/60);assert(w.fx[0].width<=60);assert(w.fx[0].alpha<=.7);
 for(let i=0;i<6;i++){w.eval('zFeelTick++');w.zFeelLimitFx();}assert.equal(w.fx.length,0);
 w.window.__zControlFeel.setPreset('Extreme');w.zFeelImpact(enemy);assert(w.window.__zControlFeel.state().freezeFrames<=5);
 w.window.__zControlFeel.setPreset('None');assert.equal(w.zFeelFrozen(w.p),false);
});
test('signature FX keep original front layer, sprite sizes, full durations and bloom',()=>{
 const w=harness();
 const signatures=['parrySuccess10','parryCounterSprite','groundSlamSprite','dashPierceSprite'];
 const cases=signatures.map(kind=>({kind,width:760,scale:1.25,life:.38,maxLife:.38,age:0,alpha:1}));
 const specialHit={kind:'enemyHitBitmap',specialContact:true,contactEnemy:{},width:320,life:.25,maxLife:.25,age:0,alpha:1};
 for(const f of [...cases,specialHit]){assert.equal(w.zFeelContactFx(f),false, f.kind+' excluded from subdued contact limiter');w.fx.push(f);}
 w.zFeelLimitFx();
 for(const f of cases){near(f.life,.38);near(f.maxLife,.38);near(f.width,760);near(f.scale,1.25);near(f.alpha,1);}
 near(specialHit.width,320);near(specialHit.life,.25);near(specialHit.alpha,1);
 w.window.__zControlFeel.setPreset('None');
 assert.equal(w.fx.length,5,'presets cannot erase signature VFX');
 const front=section('const Z_FRONT_SPECIAL_FX=new Set([','function zHybridVfxForeground()');
 for(const kind of signatures)assert(front.includes("'"+kind+"'"),kind+' uses front-of-actor pass');
 assert(html.includes("if(zFeelContactFx(f))continue"),'only ordinary contact FX skip original FX compositor');
 assert(html.includes("const duration=.38; // VFX timing V11"),'parry counter authored 8F length retained');
 assert(html.includes("const duration=.29; // all 8 frames"),'dash pierce authored 8F length retained');
 assert(html.includes("const duration=source==='boss'?.52:source==='elite'?.45:.41"),'slam duration retained');
 assert(html.includes("kind:'parrySuccess10',x,y,face,life:.31,maxLife:.31"),'parry success 10F duration retained');
});
console.log(`${count} integration tests passed`);
