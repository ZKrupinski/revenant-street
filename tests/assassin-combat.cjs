const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const nodes=new Map(),ctx=new Proxy({},{get:()=>()=>{}});
function node(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){}},getContext:()=>ctx,addEventListener(){},querySelector:()=>node('child'),querySelectorAll:()=>[]});return nodes.get(id)}
const world={console,document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){},createElement:()=>node('canvas')},Image:class{},navigator:{getGamepads:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(){},addEventListener(){},RZAssassinArt:{load:()=>({ready:false}),warm(){},status:()=>({})}};world.window=world;vm.createContext(world);
for(const script of scripts.slice(0,-1))vm.runInContext(script,world);
vm.runInContext(scripts.at(-1).replace('titleMenu();requestAnimationFrame(loop);',`window.test={p,makeEnemy,updateEnemies,hurtEnemy,startAttack,enemyAttack,getAssassinMove,getMaskedMove,maskedFrame,anchorMaskedFrames,updateEliteAI,zOneShotFrame,zStride,currentZFrameIndex,getZMove,keyDown,keyUp,menuPad,menuConfirm,heldKeyboard,keys,getRiotGuardState,getRiotGuardFrame,offscreenEnemyTarget,groundY,modRank,rewardMenu,selectMod,updateHud,pollPad,attackCheck,control,setCameraX:v=>cameraX=v,setWave:v=>wave=v,applyImpactFeedback,actorShakeOffset,playImpactSound,vibrateImpact,parry,pauseToggle,setEnemies:v=>enemies=v,getEnemies:()=>enemies};titleMenu();`),world);
const g=world.__revenant,t=world.test;let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS',name)};
test('existing wave composition preserves assassin slots',()=>{g.startRun();assert.equal(t.getEnemies().filter(e=>e.type==='assassin').length,6)});
test('all assassin AI roles reach and damage the player',()=>{for(let i=0;i<6;i++){g.startRun();const e=t.makeEnemy('assassin',t.p.x+180,t.p.y,i);t.setEnemies([e]);for(let n=0;n<900&&t.p.hp===t.p.maxHp;n++)t.updateEnemies(1/60);assert(t.p.hp<t.p.maxHp,`slot ${i}`)}});
test('all twelve artwork states are reachable',()=>{const e=t.makeEnemy('assassin',0,0,0);const cases={idle:{},walk:{visualMoving:true,visualSpeed:100},run:{visualMoving:true,visualSpeed:240,locomotionMode:'run'},charge:{chargePrep:.3},attack:{windup:.4},hitHead:{reactionTime:.3,hitAnimation:'hitHead'},hitBody:{reactionTime:.3,hitAnimation:'hitBody'},hitSpin:{reactionTime:.3,hitAnimation:'hitSpin'},hitLaunch:{reactionTime:.3,hitAnimation:'hitLaunch'},hitFly:{reactionTime:.3,hitAnimation:'hitFly'},fall:{proneTime:.5},getup:{riseTime:.5}};for(const [key,state]of Object.entries(cases)){const actor={...e,...state};assert.equal(t.getAssassinMove(actor),key);assert(t.maskedFrame(actor,key)>=0&&t.maskedFrame(actor,key)<8)}});
test('assassin uses grounded fall and recovery timers',()=>{g.startRun();const e=t.makeEnemy('assassin',t.p.x+120,t.p.y,0);e.pendingFall=true;t.setEnemies([e]);t.updateEnemies(.01);assert.equal(t.getAssassinMove(e),'fall');t.updateEnemies(.62);assert.equal(t.getAssassinMove(e),'getup');t.updateEnemies(.67);assert.equal(e.riseTime,0)});
test('airborne dead assassin holds knockback before ground collapse',()=>{g.startRun();const e=t.makeEnemy('assassin',t.p.x+120,t.p.y,0);Object.assign(e,{dead:true,z:70,vz:0});t.setEnemies([e]);assert.equal(t.getAssassinMove(e),'hitFly');t.updateEnemies(.01);assert.equal(e.collapseAge,0);e.z=0;e.vz=0;t.updateEnemies(.05);assert(e.collapseAge>0);assert.equal(t.getAssassinMove(e),'fall')});
test('parry and execution retain normal assassin combat rules',()=>{g.startRun();const e=t.makeEnemy('assassin',t.p.x+70,t.p.y,0);t.setEnemies([e]);t.parry();t.enemyAttack(e);assert.equal(t.p.hp,t.p.maxHp);assert(e.groggy>0);t.p.riposteWindow=0;t.p.parry=0;t.startAttack();assert(e.dead)});
test('old raider still follows its own animation and knockdown path',()=>{g.startRun();const e=t.makeEnemy('raider',t.p.x+120,t.p.y,0);e.pendingFall=true;t.setEnemies([e]);t.updateEnemies(.01);assert(e.proneTime>0)});

test('masked grunt anchors each generated frame to the same planted foot',()=>{
 function frame(cx,foot){
  const w=120,h=160,data=new Uint8ClampedArray(w*h*4);
  for(let y=foot-85;y<=foot;y++)for(let x=cx-12;x<=cx+12;x++)data[(y*w+x)*4+3]=255;
  return {canvas:{width:w,height:h,getContext:()=>({getImageData:()=>({data})})},bounds:{w,h}};
 }
 const frames=[frame(49,129),frame(65,142),frame(54,133)];
 t.anchorMaskedFrames(frames,'walk');
 for(let i=1;i<frames.length;i++){
  assert(Math.abs((frames[i].anchorX-[49,65,54][i])-(frames[0].anchorX-49))<.1);
  assert(Math.abs((frames[i].anchorY-[129,142,133][i])-(frames[0].anchorY-129))<.1);
 }
});
test('crowded grunts do not snap player dozens of pixels in a single frame',()=>{
 g.startRun();t.p.x=500;t.p.y=570;
 const e=t.makeEnemy('raider',502,570,0);e.stun=2;t.setEnemies([e]);
 t.updateEnemies(1/60);
 assert(Math.abs(t.p.x-500)<4,'player should be protected from abrupt collision correction');
 assert(Number.isFinite(e.renderX)&&Number.isFinite(e.renderY));
 const previous=e.renderX;e.x+=40;t.updateEnemies(1/60);
 assert(e.renderX>previous&&e.renderX<e.x,'render position should ease toward footprint');
});
test('raider airborne death and landing follow an uninterrupted animation',()=>{
 g.startRun();const e=t.makeEnemy('raider',t.p.x+130,t.p.y,0);
 Object.assign(e,{dead:true,z:80,vz:0,hitFlash:.2});t.setEnemies([e]);
 assert.equal(t.getMaskedMove(e),'hitFly');
 t.updateEnemies(.01);
 assert.equal(e.collapseAge,0);assert(e.hitFlash<.2);
 e.z=0;e.vz=0;t.updateEnemies(.05);
 assert.equal(t.getMaskedMove(e),'fall');
 assert(e.collapseAge>0);
});

test('elite appears once in the first wave and uses a separate combat type',()=>{
 g.startRun();
 const elite=t.getEnemies().filter(e=>e.type==='elite');
 assert.equal(elite.length,1);
 assert.equal(elite[0].maxHp,430);
 assert.equal(elite[0].maxPoise,260);
 assert(elite[0].x>2000&&elite[0].x<2500);
});
test('elite battle telegraphs and rushes before a strong attack',()=>{
 g.startRun();
 const e=t.makeEnemy('elite',t.p.x+250,t.p.y,0);
 e.eliteCooldown=0;t.setEnemies([e]);
 t.updateEnemies(.016);
 assert(e.eliteTell>.5,'elite should telegraph instead of instantly attacking');
 let charged=false,powered=false;
 for(let i=0;i<150;i++){
  t.updateEnemies(1/60);
  if(e.eliteRush>0)charged=true;
  if(e.eliteAttack||e.attackPoseTime>0)powered=true;
 }
 assert(charged,'elite should dash after warning');
 assert(powered,'elite should transition to powered attack');
});
test('parrying elite power attack creates execution vulnerability',()=>{
 g.startRun();
 const e=t.makeEnemy('elite',t.p.x+80,t.p.y,0);
 t.setEnemies([e]);e.eliteAttack=true;
 t.parry();t.enemyAttack(e);
 assert.equal(t.p.hp,t.p.maxHp);
 assert(e.groggy>0,'parry should break elite poise');
 assert.equal(e.eliteAttack,false,'power attack must reset on parry');
});
test('elite overdrive at critical health and independent sprite module',()=>{
 g.startRun();
 const e=t.makeEnemy('elite',t.p.x+125,t.p.y,0);
 t.setEnemies([e]);t.hurtEnemy(e,e.maxHp*.62,20);
 assert.equal(e.phase,2);
 const art=fs.readFileSync(path.join(__dirname,'../assets/elite-ironmask.js'),'utf8');
 new vm.Script(art);
 vm.runInContext(art,world);
 const enemy={...e,dead:false,z:0,eliteTell:.5,eliteRush:0};
 assert.equal(world.RZElite.move(enemy,()=> 'idle'),'charge');
 enemy.eliteTell=0;enemy.dead=true;enemy.z=20;
 assert.equal(world.RZElite.move(enemy,()=> 'idle'),'hitFly');
});
test('Frame Lab exposes all twelve elite animations without sharing original cache keys',()=>{
 const lab=fs.readFileSync(path.join(__dirname,'../z-frame-lab.html'),'utf8');
 const script=lab.slice(lab.lastIndexOf('<script>')+8,lab.lastIndexOf('</script>'));
 assert(script,'Frame Lab inline script missing');
 new vm.Script(script);
 assert(lab.includes('variant:\'elite\''),'elite variants not registered');
 assert(lab.includes('RZElite.colored(c)'),'elite bitmap transform not in Frame Lab');
 assert(lab.includes("cacheKey=a.variant==='elite'"),'elite cache must be isolated');
});

test('animation loops advance slower than Alpha 1.13 at the same travel distance',()=>{
 g.startRun();
 t.p.gaitDistance=25;t.p.motionTime=0;
 assert.equal(t.currentZFrameIndex('walk'),1);
 assert.equal(t.currentZFrameIndex('run'),0,'run should advance more slowly after stride tuning');
 t.p.gaitDistance=0;t.p.motionTime=1;
 assert.equal(t.currentZFrameIndex('idle'),4,'idle cycle should advance at 78% original cadence');
 const e=t.makeEnemy('raider',400,570,0);
 e.spriteDistance=25;e.spriteTime=1;
 assert.equal(t.maskedFrame(e,'walk'),1);
 assert.equal(t.maskedFrame(e,'idle'),4);
});
test('one-shot animations preserve the last pose without altering hit timers',()=>{
 assert.equal(t.zOneShotFrame(0),0);
 assert.equal(t.zOneShotFrame(1),7);
 assert(t.zOneShotFrame(.5)<4,'early frames must stay on screen longer');
 assert(t.zOneShotFrame(.97)>=7);
 g.startRun();
 t.p.moveName='jab';t.p.attackDuration=.31;t.p.attack=.155;
 assert.equal(t.currentZFrameIndex('jab'),t.zOneShotFrame(.5));
 assert.equal(t.p.attackDuration,.31,'animation playback must not change combat timings');
});
test('enemy visual locomotion uses speed hysteresis to suppress frame flicker',()=>{
 g.startRun();
 const e=t.makeEnemy('raider',t.p.x+170,t.p.y,0);
 t.setEnemies([e]);e.stun=5;
 // updateEnemies deliberately recomputes visualMoving from physics each tick.
 // Inject the observed smoothed speed to probe the threshold hysteresis.
 e.visualSpeedSmooth=180;t.updateEnemies(.016);
 assert.equal(e.locomotionMode,'walk','one noisy sample must not trigger run');
 e.visualSpeedSmooth=270;t.updateEnemies(.016);
 assert.equal(e.locomotionMode,'run','sustained fast motion should trigger run');
 e.visualSpeedSmooth=205;t.updateEnemies(.016);
 assert.equal(e.locomotionMode,'run','minor speed dip must not flip back into walk');
 e.visualSpeedSmooth=140;t.updateEnemies(.016);
 assert.equal(e.locomotionMode,'walk','large speed drop eventually returns to walk');
});

test('crossing-step original Z art is locally packaged with old gait rollback',()=>{
 const main=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const lab=fs.readFileSync(path.join(__dirname,'../z-frame-lab.html'),'utf8');
 for(const kind of ['walk','run']){
  const source='assets/project-z-hero/z-'+kind+'-crossing.png';
  const file=fs.readFileSync(path.join(__dirname,'..',source));
  assert(file.length>100000,kind+' sprite sheet too small');
  assert.equal(file.subarray(1,4).toString(),'PNG');
  assert(main.includes(source),kind+' missing from game');
  assert(lab.includes(source),kind+' missing from Frame Lab');
 }
 assert(main.includes('gait=previous'),'older gait A/B fallback must remain available');
 assert(lab.includes("requestedGait==='previous'"),'Frame Lab must support previous-gait comparison');
 assert(lab.includes("requestedGait==='poseguided'"),'Pose-guided candidates should remain QA-only');
 assert(main.includes('const Z_ANIM_RATE=.72'),'animation cadence must remain slower');
 assert(main.includes('const zStride=key=>(key===\'run\'?32'),'running stride should reduce frame jumps');
 assert(lab.includes('value="8"'),'Frame Lab default speed should be 8 FPS');
});

test('new black-hoodie protagonist maps gameplay motions to eight local original-quality atlases',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const lab=fs.readFileSync(path.join(__dirname,'../z-frame-lab.html'),'utf8');
 for(const kind of ['idle','walk','run','jump','punch','kick','hit','death']){
  const file=fs.readFileSync(path.join(__dirname,'../assets/new-hero/'+kind+'.png'));
  assert(file.length>30000,kind+' atlas is empty');
  assert.equal(file.subarray(1,4).toString(),'PNG');
  const w=file.readUInt32BE(16),h=file.readUInt32BE(20);
  assert.equal(w,1536,'each action needs four equal-width frames');
  assert.equal(h,832,'each action needs two equal-height frame rows');
  assert(html.includes("new-hero/'+motion+'.png"),'game hero mapping absent');
 }
 assert(html.includes("const Z_HOODIE_HERO=/(?:[?&])hero=hoodie"),'original Z must be the game default');
 assert(lab.includes("const isBlackHoodieHero=/(?:[?&])hero=hoodie"),'original Z must be the Frame Lab default');
 assert(html.includes('Z_HOODIE_HERO?prepareTransparentHeroCells'),'alternate hoodie art must preserve transparency');
 assert(lab.includes('preclearedHeroFrames'),'alternate hoodie must remain available for comparison');
 t.p.getupTimer=.64;t.p.recoveryDuration=.64;
 assert.equal(t.currentZFrameIndex('getup'),0,'original hero get-up must begin on original first frame');
 t.p.getupTimer=0;
 assert.equal(t.currentZFrameIndex('getup'),7,'original hero get-up must finish on original last frame');
});

test('ground combos now lunge decisively even with a neutral joystick',()=>{
 g.startRun();t.setEnemies([]);
 t.p.x=350;t.p.y=570;t.p.facing=1;t.p.moveDX=0;t.p.moveDY=0;t.p.attack=0;t.p.comboWindow=0;t.p.stamina=100;
 t.startAttack();
 const total=t.p.attackDriveTotal;
 assert(total>=42,'neutral jab should drive forwards, not stay in place');
 const atStart=t.p.x;
 for(let i=0;i<17;i++)t.control(1/60,{dx:0,dy:0});
 assert(t.p.x-atStart>=34,'first punch must visibly advance without joystick input');
 assert(t.p.attackDriveRemaining<total,'distance budget should be used on forward movement');
 assert(t.p.x<=12800-64,'world bounds remain enforced');
});
test('combo lunge respects facing and does not teleport on one frame',()=>{
 g.startRun();t.setEnemies([]);
 t.p.x=750;t.p.y=570;t.p.facing=-1;t.p.moveDX=0;t.p.moveDY=0;t.p.attack=0;t.p.comboWindow=0;t.p.stamina=100;
 t.startAttack();
 const prior=t.p.x;t.control(1/60,{dx:0,dy:0});
 assert(t.p.x<prior,'left-facing attack must travel left');
 assert(prior-t.p.x<40,'lunge must not teleport across the arena in one frame');
});

test('original armored Z uses four local Higgsfield sprite motions and retains rollback',()=>{
 const game=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const lab=fs.readFileSync(path.join(__dirname,'../z-frame-lab.html'),'utf8');
 for(const key of ['walk','run','punch','kick']){
  const data=fs.readFileSync(path.join(__dirname,'../assets/original-z-hf/'+key+'.webp'));
  assert(data.length>75000,key+' local art missing');
  assert.equal(data.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(data.subarray(8,12).toString('ascii'),'WEBP');
  assert(game.includes("original-z-hf/'+art+'.webp"),'game should map attack sheets');
  assert(lab.includes("original-z-hf/'+value+'.webp"),'Frame Lab should allow visual comparison');
 }
 assert(game.includes("const Z_HF_ART=!/(?:[?&])zart=original"),'game needs one-click original-Z art rollback');
 assert(game.includes("if(!zUsePreviousGait)"),'old walking and running must remain selectable');
 assert(game.includes("const Z_HOODIE_HERO=/(?:[?&])hero=hoodie"),'do not change the playable character identity');
});

test('successful heavy hits trigger actor vibration and decay without gameplay movement',()=>{
 g.startRun();
 const e=t.makeEnemy('raider',t.p.x+100,t.p.y,0);t.setEnemies([e]);
 t.p.moveName='roundkick';
 const startX=e.x,startY=e.y;
 t.hurtEnemy(e,24,23);
 assert(e.bodyShakeDuration>=.23,'heavy strike must have sustained body shake');
 assert(e.bodyShakePower>=11,'kick impact should visibly shake sprite');
 const [sx,sy]=t.actorShakeOffset(e);
 assert(Math.abs(sx)<=e.bodyShakePower&&Math.abs(sy)<=e.bodyShakePower);
 assert.equal(e.x-startX,22,'body shaking must not change physical x position beyond original knockback');
 assert.equal(e.y,startY,'body shaking must be render-only');
 t.updateEnemies(.3);
 assert.equal(e.bodyShakeTime,0,'body vibration must fade without looping');
});
test('ordinary punches trigger a lighter visual impact without changing hero scale',()=>{
 g.startRun();
 const e=t.makeEnemy('assassin',t.p.x+100,t.p.y,1);t.setEnemies([e]);
 t.p.moveName='jab';t.hurtEnemy(e,12,9);
 assert(e.bodyShakeDuration<=.18);
 assert(e.bodyShakePower<10);
 t.applyImpactFeedback(t.p,true,'heavy');
 assert(t.p.bodyShakePower>e.bodyShakePower);
});
test('Android or gamepad rumble is optional and rapid-hit bursts are rate-limited',()=>{
 const old=world.navigator.vibrate;
 const felt=[];
 world.navigator.vibrate=pattern=>{felt.push(pattern);return true};
 try{
  assert.equal(t.vibrateImpact('heavy'),true,'supported devices should vibrate');
  assert(Array.isArray(felt[0])&&felt[0].length>=3,'heavy collision needs dual pulse');
  assert.equal(t.vibrateImpact('punch'),false,'near-simultaneous hits should not spam device');
  assert.equal(felt.length,1);
 }finally{if(old)world.navigator.vibrate=old;else delete world.navigator.vibrate}
 assert.equal(t.playImpactSound('heavy'),false,'missing Web Audio API should not crash combat');
});

test('rear-side enemy attacks are caught by parry and hero immediately turns',()=>{
 g.startRun();
 const e=t.makeEnemy('raider',t.p.x-72,t.p.y,0);
 t.setEnemies([e]);t.p.facing=1;t.p.inv=0;t.p.stamina=100;
 const hp=t.p.hp;
 t.parry();
 assert(t.p.parry>0);
 t.enemyAttack(e);
 assert.equal(t.p.facing,-1,'rear strike must flip guard facing toward attacker');
 assert.equal(t.p.hp,hp,'timed rear parry must negate hit damage');
 assert(e.stun>1,'rear attacker must be staggered');
 assert(e.knockVX<0,'rear attacker must be knocked away to the left');
 assert.equal(t.p.riposteTarget,e,'counter must target the enemy that attacked from behind');
});
test('parry button pre-turns to a winding-up enemy behind',()=>{
 g.startRun();
 const e=t.makeEnemy('assassin',t.p.x-115,t.p.y,0);e.windup=.12;
 t.setEnemies([e]);t.p.facing=1;t.p.stamina=100;
 t.parry();assert.equal(t.p.facing,-1,'a pending rear attack must be faced before contact');
 t.control(1/60,{dx:1,dy:0});
 assert.equal(t.p.facing,-1,'joystick movement must not force parry guard away from attacker');
});
test('rear enemy still damages hero without an active parry',()=>{
 g.startRun();
 const e=t.makeEnemy('raider',t.p.x-75,t.p.y,0);t.setEnemies([e]);
 t.p.facing=1;t.p.parry=0;t.p.inv=0;
 const hp=t.p.hp;t.enemyAttack(e);
 assert(t.p.hp<hp,'rear protection must not become automatic invulnerability');
});

test('seven Higgsfield guard actions each have real 4 by 2 transparent WebP atlases',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const lab=fs.readFileSync(path.join(__dirname,'../z-frame-lab.html'),'utf8');
 for(const key of ['idle','walk','run','block','attack','hit','fall']){
  const data=fs.readFileSync(path.join(__dirname,'../assets/riot-shield/'+key+'.webp'));
  assert(data.length>40000,key+' action must not be empty');
  assert.equal(data.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(data.subarray(8,12).toString('ascii'),'WEBP');
  assert(lab.includes("'./assets/riot-shield/'+key+'.webp'"));
 }
 assert(source.includes('const USE_HF_SHIELD=!/(?:[?&])shield=old'),'legacy shield sprite must remain recoverable');
 assert(source.includes("if(a.type==='guard'&&USE_HF_SHIELD)"),'game must use the new guard sprite code path');
});
test('guard action state tracks motion, bracing, attacks, injury and falling',()=>{
 g.startRun();
 const e=t.makeEnemy('guard',t.p.x+140,t.p.y,2);
 t.setEnemies([e]);e.face=-1;
 assert.equal(t.getRiotGuardState(e),'idle');
 e.visualMoving=true;
 assert.equal(t.getRiotGuardState(e),'walk');
 e.locomotionMode='run';
 assert.equal(t.getRiotGuardState(e),'run');
 e.visualMoving=false;e.chargePrep=.24;
 assert.equal(t.getRiotGuardState(e),'block');
 e.chargePrep=0;e.windup=.30;
 assert.equal(t.getRiotGuardState(e),'attack');
 assert(t.getRiotGuardFrame(e,'attack')>=0&&t.getRiotGuardFrame(e,'attack')<=7);
 e.windup=0;e.reactionTime=.40;e.reactionDuration=.50;
 assert.equal(t.getRiotGuardState(e),'hit');
 e.reactionTime=0;e.dead=true;e.deathAge=0;
 assert.equal(t.getRiotGuardState(e),'fall');
 assert.equal(t.getRiotGuardFrame(e,'fall'),0);
 e.deathAge=.9;assert.equal(t.getRiotGuardFrame(e,'fall'),7);
});
test('guard keeps its own original combat stats and previous actor systems intact',()=>{
 g.startRun();
 const e=t.makeEnemy('guard',t.p.x+110,t.p.y,0);
 assert.equal(e.maxHp,100);
 assert.equal(e.maxPoise,132);
 assert.equal(e.speed,99);
 assert.equal(e.reach,41);
 assert.equal(e.damage,13);
});

test('eight new boss animation atlases exist and are genuinely used by boss drawing',()=>{
 const game=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const script=fs.readFileSync(path.join(__dirname,'../assets/boss-hunter.js'),'utf8');
 for(const name of ['idle','walk','dash','combo','slam','taunt','hit','death']){
  const file=fs.readFileSync(path.join(__dirname,'../assets/boss-hunter/'+name+'.webp'));
  assert(file.length>45000,name+' missing packed sprite');
  assert.equal(file.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(file.subarray(8,12).toString('ascii'),'WEBP');
 }
 assert(game.includes("if(a.type==='boss'&&window.RZBossHunter?.draw"),'boss must render new sprite');
 assert(game.includes("window.RZBossHunter?.update(e,p,dt"),'boss behavior state machine not active');
 assert(script.includes("e.bossPhasePending")&&script.includes("'slam'"));assert(!script.includes("start(e,'combo'"),'removed rapid combo must not be selected');
});
test('boss introduction, charge, phase 2 and death select real animations',()=>{
 const script=fs.readFileSync(path.join(__dirname,'../assets/boss-hunter.js'),'utf8');
 const context={location:{search:''},Image:class{},console};context.window=context;
 vm.runInNewContext(script,context);
 const boss=context.RZBossHunter;
 const e=t.makeEnemy('boss',1350,560,0),actor={x:1100,y:560};
 const events={strikes:0,warnings:[],impacts:[]};
 const api={attack:()=>events.strikes++,warning:(enemy,s)=>events.warnings.push(s),impact:(enemy,k)=>events.impacts.push(k)};
 assert(boss.update(e,actor,.016,api));
 assert.equal(e.bossMode,'taunt');
 for(let i=0;i<90;i++)boss.update(e,actor,1/60,api);
 e.bossCooldown=0;
 assert(boss.update(e,actor,.016,api));
 assert.equal(e.bossMode,'dash');
 assert.equal(boss.state(e),'dash');
 e.bossMode=null;e.bossPhasePending=true;e.phase=2;
 assert(boss.update(e,actor,.016,api));assert.equal(e.bossMode,'taunt');
 e.dead=true;e.deathAge=1.5;assert.equal(boss.state(e),'death');
 assert.equal(boss.frame(e,'death'),7);
});
test('fire, bleed, shock and ice apply distinct combat statuses and visible bitmap impacts',()=>{
 g.startRun();
 const e=t.makeEnemy('raider',t.p.x+73,t.p.y,2);
 t.setEnemies([e]);
 t.p.mods=['fire','bleed','shock','ice'];t.p.mod='neuro';t.p.moveName='jab';
 const hp=e.hp;
 t.attackCheck();
 assert(e.burn>0,'fire must ignite with its own timer');
 assert(e.bleed>0,'bleed timer should not replace burn');
 assert(e.shock>0,'electric stun should be applied');
 assert(e.freeze>0,'ice slow should be applied');
 assert(e.hp<hp,'actual combat damage');
 const before=e.hp;
 e.inv=0;e.stun=0;e.shock=0;e.groggy=0;
 t.updateEnemies(.5);
 assert(e.hp<before,'burn and bleed should damage target continuously');
 const game=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(game.includes('function drawModEnergy()'));
 assert(game.includes('function createModImpact(e)'));
 assert(game.includes('id="modStrip"'));
});
test('gamepad D-pad/left stick can choose and confirm upgrade options without auto-dash',()=>{
 g.startRun();
 const fake=Array.from({length:3},(_,i)=>({
  disabled:false,dataset:{mod:['fire','shock','ice'][i]},clicked:0,
  classList:{toggle(){}},click(){this.clicked++}
 }));
 const m=node('menu'),old=m.querySelectorAll;
 m.querySelectorAll=()=>fake;
 try{
  t.p.x=4235;t.setEnemies([]);t.updateEnemies(0);
  assert.equal(g.getState().gameState,'reward');
  const pad={axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false}))};
  world.navigator.getGamepads=()=>[pad];
  t.menuPad.readyAt=0;t.menuPad.neutralAt=0;t.pollPad();
  pad.buttons[15].pressed=true;t.pollPad();pad.buttons[15].pressed=false;t.pollPad();
  pad.buttons[2].pressed=true;t.pollPad();t.pollPad();
  assert.equal(fake[1].clicked,1,'X must confirm the second reward only once');
  assert.equal(fake[0].clicked,0);
 }finally{m.querySelectorAll=old;world.navigator.getGamepads=()=>[];t.pollPad()}
});


test('final hunter fight is boss only, without a performance-heavy entourage',()=>{
 g.startRun();
 t.setEnemies([]);const code=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const wave3=code.match(/  3:\[([\s\S]*?)\n  \]/);
 assert(wave3,'wave 3 should be found');
 assert(wave3[1].includes("['boss',11880,561]"));
 assert(!/\['(?:raider|guard|assassin|elite)'/.test(wave3[1]));
});
test('real combat currency and shards are paid exactly once, including DOT kills',()=>{
 g.startRun();
 const money=t.p.credits,shards=world.__revenant.getState().perma.shards;
 const e=t.makeEnemy('guard',t.p.x+75,t.p.y,0);t.setEnemies([e]);
 t.hurtEnemy(e,999,3);
 assert(t.p.credits>=money+65);
 assert.equal(world.__revenant.getState().perma.shards,shards+1);
 const oldMoney=t.p.credits;
 t.hurtEnemy(e,5,5);
 assert.equal(t.p.credits,oldMoney,'dead guard cannot pay twice');
 const burn=t.makeEnemy('raider',t.p.x+90,t.p.y,1);
 t.setEnemies([burn]);burn.hp=1;burn.burn=1;burn.stun=1;
 t.updateEnemies(.3);
 assert(burn.dead);
 assert(t.p.credits>=oldMoney+45,'DOT kill must award credits too');
});
test('loading gate is present, checks mandatory sprites and disables live animation warmup',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(code.includes('async function requestRunStart()'));
 assert(code.includes('function waitSceneArt(preview,onProgress)'));
 assert(code.includes("canvas.style.visibility='hidden'"));
 assert(code.includes("if(gameState==='loading'||gameState==='menu'||gameState==='hub')return"));
 assert(!code.includes('function update(dt){RZAssassinArt.warm(dt)'));
 assert(code.includes("if(a==='start')requestRunStart()"));
});

test('ground attacks drive farther than Alpha 1.26 and stay capped per frame',()=>{
 g.startRun();t.setEnemies([]);
 t.p.x=440;t.p.y=570;t.p.facing=1;t.p.stamina=100;t.p.attack=0;
 t.p.comboWindow=0;t.p.moveDX=0;t.p.moveDY=0;
 t.startAttack();
 assert(t.p.attackDriveTotal>=50,'every neutral attack should surge substantially');
 assert(t.p.attackDriveTotal<=242,'do not teleport across the screen in one strike');
 const start=t.p.x;
 for(let i=0;i<12;i++)t.control(1/60,{dx:0,dy:0});
 assert(t.p.x>start+30,'visible forward momentum even with no joystick input');
});
test('attack rush cannot overtake a victim before the hit and continues pursuit after contact',()=>{
 g.startRun();
 const e=t.makeEnemy('guard',t.p.x+95,t.p.y,0);
 e.hp=1000;e.maxHp=1000;e.stun=2;
 t.setEnemies([e]);t.p.facing=1;t.p.stamina=100;t.p.comboWindow=0;
 t.p.moveDX=0;t.p.moveDY=0;t.p.attack=0;t.startAttack();
 t.p.moveName='sidekick';t.p.attackDriveTotal=195;t.p.attackDriveRemaining=195;
 const start=t.p.x;
 for(let i=0;i<60&&t.p.attack>0;i++){
   t.control(1/60,{dx:0,dy:0});
   assert(t.p.x<=e.x-40,'attack advance must not cross the enemy hurtbox');
   t.updateEnemies(1/60);
 }
 assert(t.p.hitDone,'attack should reach the impact frame');
 assert(e.hp<1000,'attack must hit instead of dashing through the target');
 assert(e.x>start+95,'victim is actually driven backwards');
 assert(t.p.x>start+25,'hero should also travel forwards in the same strike');
});
test('heavy kicks drive grunts farther than jabs and retain aerial trajectories',()=>{
 const distance=(key,drive)=>{
  g.startRun();
  const x0=t.p.x;
  const e=t.makeEnemy('assassin',x0+78,t.p.y,0);
  e.hp=e.maxHp=1000;e.stun=2;
  t.setEnemies([e]);t.p.moveName=key;t.p.attackDriveTotal=drive;t.p.attackDriveRemaining=drive;
  t.hurtEnemy(e,10,20);
  const force=e.knockVX;
  for(let i=0;i<18;i++)t.updateEnemies(1/60);
  return{force,distance:e.x-(x0+78),height:e.z};
 };
 const jab=distance('jab',66),kick=distance('sidekick',175);
 assert(jab.force>250,'even a regular jab must visibly knock enemies back');
 assert(kick.force>jab.force*1.4,'kick and forward-drive momentum should matter');
 assert(kick.distance>jab.distance+35,'enemy displacement should reflect a stronger kick');
 assert(kick.distance>125,'kick knockback should be dramatic');
});
test('reaction variation avoids identical repeats and preserves boss mass and world bounds',()=>{
 g.startRun();const x=t.p.x;
 const grunt=t.makeEnemy('raider',x+85,t.p.y,0);grunt.hp=9000;grunt.maxHp=9000;
 t.setEnemies([grunt]);t.p.facing=1;t.p.moveName='uppercut';t.p.attackDriveTotal=120;
 let launched=0;
 for(let i=0;i<24;i++){
  const before=grunt.reactionVariant;
  grunt.previousReactionVariant=before;
  t.hurtEnemy(grunt,2,0);
  if(before!==undefined)assert.notEqual(grunt.reactionVariant,before,'do not repeat the last same reaction pose');
  if(grunt.vz>120)launched++;
  grunt.x=x+85;grunt.z=0;grunt.knockVX=0;grunt.vz=0;grunt.hp=9000;
 }
 assert(launched>=10,'air knockbacks should appear frequently');
 const boss=t.makeEnemy('boss',x+85,t.p.y,1);boss.hp=9000;t.setEnemies([boss]);
 t.hurtEnemy(boss,10,0);
 assert(Math.abs(boss.knockVX)<700,'boss must retain its heavy footing');
 assert.equal(boss.vz,0,'boss should not float like a grunt');
 boss.x=12730;boss.knockVX=1500;t.updateEnemies(.4);
 assert(boss.x<=12755,'knockback should stay inside world bounds');
});

test('remaining off-screen enemy shows a direction; active visible enemies suppress it',()=>{
 g.startRun();t.setCameraX(0);t.p.x=450;
 const far=t.makeEnemy('raider',3000,560,0);t.setEnemies([far]);
 const right=t.offscreenEnemyTarget();
 assert(right&&right.side==='right'&&right.remaining===1);
 const shown=t.makeEnemy('raider',650,560,1);t.setEnemies([far,shown]);
 assert.equal(t.offscreenEnemyTarget(),null,'never cover visible combat with a directional icon');
 t.setEnemies([far]);t.setCameraX(3500);
 assert.equal(t.offscreenEnemyTarget().side,'left','arrow must flip behind the camera');
});
test('ground perspective limits player and enemy feet without restricting jump altitude',()=>{
 g.startRun();assert.equal(t.groundY(320),551);assert.equal(t.groundY(720),658);
 const e=t.makeEnemy('raider',900,480,0);
 assert.equal(e.y,551,'enemies should never stand on elevated background scenery');
 t.p.x=420;t.p.y=554;t.setEnemies([]);
 for(let i=0;i<150;i++)t.control(1/60,{dx:0,dy:-1});
 assert(t.p.y>=551,'player feet must stay on walkable foreground');
 t.p.y=659;t.p.stun=0;
 for(let i=0;i<55;i++)t.control(1/60,{dx:0,dy:1});
 assert(t.p.y<=658,'bottom of walkable floor must be enforced');
});
test('stage difficulty scales enemy health while fodder stays quick to defeat',()=>{
 g.startRun();
 const first=t.makeEnemy('raider',1000,560,0),elite1=t.makeEnemy('elite',1200,560,1);
 assert(first.maxHp<=45,'early cannon fodder should drop in a few hits');
 assert(elite1.maxHp>=350,'elite should be a clear combat challenge');
 t.setWave(2);
 const later=t.makeEnemy('raider',1000,560,0),elite2=t.makeEnemy('elite',1200,560,1);
 assert(later.maxHp>first.maxHp);
 assert(elite2.maxHp>elite1.maxHp);
 t.setWave(3);const boss=t.makeEnemy('boss',11000,560,0);
 assert(boss.maxHp>=3000,'boss should survive several player combos');
 assert(boss.maxPoise>elite2.maxPoise,'boss must have more poise than elite');
});
test('upgrades may stack repeatedly and have genuine attack damage benefit',()=>{
 g.startRun();
 const hit=()=>{
  const e=t.makeEnemy('raider',t.p.x+75,t.p.y,1);
  e.hp=1000;e.maxHp=1000;e.stun=2;t.setEnemies([e]);
  t.p.facing=1;t.p.moveName='jab';t.p.comboIdx=0;t.p.counterBoost=false;t.p.hitDone=false;
  t.attackCheck();
  return 1000-e.hp;
 };
 const basic=hit();
 t.rewardMenu('mid');t.selectMod('power');t.rewardMenu('mid');t.selectMod('power');
 assert.equal(t.modRank('power'),2,'two picks should both count');
 assert.equal(g.getState().wave,1,'selecting a mid-wave upgrade must not restart the wave');
 const powered=hit();
 assert(powered>basic*1.3,'two power stacks must be visibly stronger');
 t.updateHud();
 assert(node('modStrip').innerHTML.includes('×2'),'the HUD must display real stack ranks');
});
test('five kills trigger optional mid-combat reward without losing surviving mobs',()=>{
 g.startRun();
 const survivor=t.makeEnemy('raider',t.p.x+490,t.p.y,5);
 survivor.stun=2;t.setEnemies([survivor]);
 for(let i=0;i<5;i++){
  const e=t.makeEnemy('raider',t.p.x+65,t.p.y,i);
  t.hurtEnemy(e,999,5);
 }
 t.updateEnemies(1/60);
 assert.equal(g.getState().gameState,'reward','fifth kill should pause for a growth pick');
 t.selectMod('rush');
 assert.equal(g.getState().gameState,'playing');
 assert.equal(g.getState().wave,1);
 assert.equal(t.getEnemies().filter(e=>!e.dead).length,1,'midwave pick keeps remaining fight');
});

test('PC arrows trigger their on-screen positions without controlling movement',()=>{
 const fire=key=>t.keyDown({key,preventDefault(){}});
 g.startRun();t.setEnemies([]);fire('ArrowUp');
 assert(t.p.vz>=500,'up arrow should jump');assert(t.p.z>0);
 g.startRun();t.setEnemies([]);fire('ArrowLeft');
 assert(t.p.attack>0,'left arrow should attack');
 g.startRun();t.setEnemies([]);fire('ArrowRight');
 assert(t.p.parry>0,'right arrow should parry');
 g.startRun();t.setEnemies([]);fire('ArrowDown');
 assert(t.p.dodge>0,'down arrow should dash');
 assert(!t.p.evadeBackstep,'arrow-based attacking should not be mistaken for backwards input');
});
test('WASD are the only PC keys that control X/Y locomotion',()=>{
 g.startRun();t.setEnemies([]);
 t.p.x=550;t.p.y=594;t.p.z=0;t.p.stun=0;t.p.dodge=0;t.p.parry=0;t.p.attack=0;
 t.keys.add('arrowleft');t.keys.add('arrowup');
 t.control(.1,{dx:0,dy:0});
 assert.equal(t.p.x,550,'left arrow must not move player left');
 assert.equal(t.p.y,594,'up arrow must not move player toward background');
 t.keys.clear();t.keys.add('w');t.keys.add('a');
 t.control(.1,{dx:0,dy:0});
 assert(t.p.x<550,'A must move left');assert(t.p.y<594,'W must move toward road top');
 const left=t.p.x,up=t.p.y;t.keys.clear();t.keys.add('s');t.keys.add('d');
 t.control(.1,{dx:0,dy:0});
 assert(t.p.x>left,'D must move right');assert(t.p.y>up,'S must move toward foreground');
});

test('separately posed original-Z v2 walk/run atlases retain 8 frames each',()=>{
 const art=require('../assets/original-z-hf/gait-v2-validation.json');
 for(const key of ['walk','run']){
  const buf=fs.readFileSync(path.join(__dirname,'../assets/original-z-hf/'+key+'-v2.webp'));
  assert(buf.length>100000,key+' v2 art missing');
  assert.equal(buf.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(buf.subarray(8,12).toString('ascii'),'WEBP');
  assert.equal(art[key].source_frames,8);
  assert.deepEqual(Array.from(art[key].per_frame),[512,620]);
  assert(art[key].shared_scale>.15);
  assert.equal(art[key].source_bounds.length,8);
 }
});
test('original hero defaults to v4 shuffle and dash with previous atlas rollback',()=>{
 const game=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const lab=fs.readFileSync(path.join(__dirname,'../z-frame-lab.html'),'utf8');
 assert(game.includes("||'v4'"),'shuffle/dash v4 should be the default');
 assert(game.includes("walk-'+zGaitChoice+'.webp")&&game.includes("run-'+zGaitChoice+'.webp"),'game must reference both v3 atlases');
 assert(game.includes('preparePremattedGaitCells(im)'),'game must avoid re-keying pre-matted v3 art');
 assert(game.includes("const suffix=zGaitChoice==='v1'?'':'-v2'"),'v1 full-body art rollback required');
 assert(game.includes("const zUsePreviousGait=zGaitChoice==='previous'"),'historical gait rollback required');
 assert(game.includes("if(zGaitChoice==='crossing')"),'prior crossing version should remain selectable');
 assert(lab.includes("map.walk='walk'+suffix;map.run='run'+suffix"),'Frame Lab should use same v3 assets as game');
 assert(lab.includes("value.endsWith('-v3')")&&lab.includes('art.precleared=true'),'Frame Lab must display pre-cleared v3 atlases directly');
});
test('original Z new V3 walking and running atlas packs have 16 complete transparent cells',()=>{
 const art=require('../assets/original-z-hf/gait-v3-validation.json');
 for(const kind of ['walk','run']){
  const file=path.join(__dirname,'../assets/original-z-hf/'+kind+'-v3.webp');
  const buf=fs.readFileSync(file);
  assert(buf.length>100000,kind+' v3 source missing');
  assert.equal(buf.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(buf.subarray(8,12).toString('ascii'),'WEBP');
  assert.deepEqual(Array.from(art[kind].size),[2048,1240]);
  assert.deepEqual(Array.from(art[kind].cell),[512,620]);
  assert.equal(art[kind].frames,8);
  assert.equal(art[kind].frame_sizes.length,8);
  assert.equal(art[kind].feet.length,8);
  assert(art[kind].scales[0]>.2&&art[kind].scales[1]>.2,'shared half-cycle scales missing');
  for(const [i,feet] of art[kind].feet.entries()){
   assert.equal(feet,kind==='run'&&[2,6].includes(i)?566:600,'run airborne frames must be lifted');
  }
 }
});
test('air heel kick holds its charge then dives, hits once and recovers at ground',()=>{
 for(const height of [20,105]){
  g.startRun();t.setEnemies([]);Object.assign(t.p,{z:height,vz:120});t.startAttack();
  assert.equal(t.p.moveName,'axe_kick');assert.equal(t.p.airKickPhase,'charge');
  const x=t.p.x;
  for(let i=0;i<8;i++)t.control(1/60,{dx:0,dy:0});
  assert.equal(t.p.z,height,'charge must hold altitude');assert(t.p.x-x<6);
  assert.equal(t.p.hitDone,false,'charge cannot damage');
  const e=t.makeEnemy('guard',t.p.x+65,t.p.y,0);e.hp=500;e.maxHp=500;t.setEnemies([e]);
  for(let i=0;i<20;i++)t.control(1/60,{dx:0,dy:0});
  assert.equal(t.p.z,0);assert.equal(t.p.airAttack,false);assert.equal(t.p.hitDone,true);
  assert(e.hp<500,'descending heel must connect');
  const hp=e.hp;
  for(let i=0;i<30;i++)t.control(1/60,{dx:0,dy:0});
  assert.equal(e.hp,hp,'landing cannot duplicate the hit');assert.equal(t.p.airKickPhase,'');
 }
});
test('WASD moves reward focus and left arrow confirms only the selected card',()=>{
 g.startRun();t.heldKeyboard.clear();
 const fake=Array.from({length:3},(_,i)=>({disabled:false,dataset:{mod:['fire','ice','shock'][i]},clicked:0,focused:0,
  classList:{toggle(){}},focus(){this.focused++},scrollIntoView(){},click(){this.clicked++}}));
 const m=node('menu'),old=m.querySelectorAll;m.querySelectorAll=()=>fake;
 const press=(key,repeat=false)=>t.keyDown({key,repeat,preventDefault(){}});
 const release=key=>t.keyUp({key});
 try{
  // Hold the combat arrow through the transition: it must not move the reward cursor.
  press('ArrowLeft');t.p.x=4235;t.setEnemies([]);t.updateEnemies(0);
  press('ArrowLeft',true);assert.equal(t.menuPad.index,0);release('ArrowLeft');
  press('d');release('d');assert.equal(t.menuPad.index,1);assert(fake[1].focused>0);
  press('s');release('s');assert.equal(t.menuPad.index,2);
  press('w');release('w');assert.equal(t.menuPad.index,1);
  press('ArrowLeft');assert.equal(fake[1].clicked,0,'opening grace period blocks confirmation');
  t.menuPad.readyAt=0;press('ArrowLeft',true);assert.equal(fake[1].clicked,0,'held left arrow cannot carry through grace period');
  release('ArrowLeft');press(' ');release(' ');press('j');release('j');assert.equal(fake[1].clicked,0);
  press('ArrowLeft');release('ArrowLeft');assert.equal(fake[1].clicked,1);assert.equal(fake[0].clicked,0);
 }finally{m.querySelectorAll=old;t.heldKeyboard.clear()}
});
test('held pad attack cannot auto-pick until released; X confirms and A does not',()=>{
 g.startRun();const fake=Array.from({length:3},()=>({disabled:false,dataset:{},clicked:0,classList:{toggle(){}},click(){this.clicked++}}));
 const m=node('menu'),old=m.querySelectorAll;m.querySelectorAll=()=>fake;
 const pad={axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false}))};world.navigator.getGamepads=()=>[pad];
 try{
  pad.buttons[2].pressed=true;t.p.x=4235;t.setEnemies([]);t.updateEnemies(0);
  t.pollPad();t.menuPad.readyAt=0;for(let i=0;i<10;i++)t.pollPad();assert.equal(fake[0].clicked,0);
  pad.buttons[2].pressed=false;t.menuPad.neutralAt=0;t.pollPad();
  for(let i=0;i<10;i++){pad.buttons[0].pressed=true;t.pollPad();pad.buttons[0].pressed=false;t.pollPad()}
  assert.equal(fake[0].clicked,0,'A/cross must not confirm');
  pad.buttons[2].pressed=true;t.pollPad();t.pollPad();assert.equal(fake[0].clicked,1);
 }finally{m.querySelectorAll=old;world.navigator.getGamepads=()=>[];t.pollPad()}
});
console.log(`${checks} combat regression checks passed`);
