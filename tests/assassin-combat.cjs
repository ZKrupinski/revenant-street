const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
const nodes=new Map(),ctx=new Proxy({},{get:()=>()=>{}});
function node(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){}},getContext:()=>ctx,addEventListener(){},querySelector:()=>node('child'),querySelectorAll:()=>[]});return nodes.get(id)}
const world={console,setTimeout(){return 1},clearTimeout(){},document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){},createElement:()=>node('canvas')},Image:class{},navigator:{getGamepads:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(){},addEventListener(){},RZAssassinArt:{load:()=>({ready:false}),warm(){},status:()=>({})}};world.window=world;vm.createContext(world);
for(const script of scripts.slice(0,-1))vm.runInContext(script,world);
vm.runInContext(scripts.at(-1).replace('titleMenu();requestAnimationFrame(loop);',`window.test={p,COMBO_ROTATION,zArtState,pickComboMove,specialStats,upgradeDescription,MOD_META,makeEnemy,updateEnemies,hurtEnemy,startAttack,enemyAttack,getAssassinMove,getMaskedMove,maskedFrame,anchorMaskedFrames,updateEliteAI,zOneShotFrame,zStride,currentZFrameIndex,getZMove,keyDown,keyUp,menuPad,menuConfirm,heldKeyboard,keys,getRiotGuardState,getRiotGuardFrame,offscreenEnemyTarget,groundY,modRank,rewardMenu,selectMod,updateHud,setModsExpanded,updateModToggle,pollPad,attackCheck,control,jump,dodge,heelLandingShockwave,updateComboCamera,followComboCamera,getCameraZoom:()=>cameraZoom,getStrikeCameraTime:()=>strikeCameraTime,getCameraX:()=>cameraX,spawnWave,spawnNextEncounter,SQUAD_SPOTS,SQUAD_ROSTERS,STAGE_WIDTH,WAVE_GATES,getSquad:()=>squadIndex,setSquad:v=>squadIndex=v,setCameraX:v=>cameraX=v,setWave:v=>wave=v,applyImpactFeedback,actorShakeOffset,playImpactSound,sound,vibrateImpact,gamepadRumble,activeRumbleActuator,gamepadHapticDiagnostics,updateRumbleDiagnostics,testGamepadRumble,stopGamepadRumble,footstepRumble,RUMBLE_PROFILES,setHapticTime:v=>time=v,getHapticPriorityUntil:()=>hapticPriorityUntil,parry,pauseToggle,setEnemies:v=>enemies=v,getEnemies:()=>enemies,getFx:()=>fx};titleMenu();`),world);
const g=world.__revenant,t=world.test;let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS',name)};
test('opening battle spawns one small squad just beyond the screen',()=>{
 g.startRun();
 const live=t.getEnemies().filter(e=>!e.dead);
 assert(live.length>=3&&live.length<=6,'no initial crowd of 18+');
 assert(live.some(e=>e.type==='assassin'),'diverse enemy classes');
 assert(live.every(e=>e.x>1280),'enemies must walk in from outside screen');
 assert.equal(t.getSquad(),1);
});
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

test('elite enters in a later encounter, not in the opening troop',()=>{
 g.startRun();
 assert.equal(t.getEnemies().filter(e=>e.type==='elite').length,0);
 for(let i=1;i<5;i++){
  t.setEnemies([]);t.p.x=t.SQUAD_SPOTS[1][i];
  t.setCameraX(t.p.x-465);
  assert.equal(t.spawnNextEncounter(),true);
 }
 const elites=t.getEnemies().filter(e=>e.type==='elite');
 assert.equal(elites.length,1);
 assert(elites[0].maxHp>530,'later elite has squad durability scaling');
 assert.equal(elites[0].maxPoise,260);
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
 assert.equal(t.maskedFrame(e,'walk'),0,'enemy walk animations now use a much longer visual stride');
 assert.equal(t.maskedFrame(e,'idle'),2,'enemy idle frame cycling is slower without changing actual AI timing');
 assert.equal(t.currentZFrameIndex('walk'),0,'the enemy-only speed change must not touch the hero gait');
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
 assert(t.p.x<=t.STAGE_WIDTH-64,'world bounds remain enforced');
});
test('original eight-frame punches run at authored speed and a buffered combo links after the eighth frame',()=>{
 g.startRun();t.setEnemies([]);
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:true};
 t.p.x=1100;t.p.y=570;t.p.facing=1;t.p.stamina=100;
 t.startAttack();assert.equal(t.p.moveName,'jab');
 const firstDuration=t.p.attackDuration,firstMove=t.p.moveName;
 assert(firstDuration>=.30&&firstDuration<=.33,'jab returns to ~.31s instead of the .39s slowdown floor');
 const seen=new Set([t.currentZFrameIndex(firstMove)]);
 t.startAttack();assert.equal(t.p.attackQueued,true,'a follow-up press should be buffered');
 let elapsed=0,linked=false;
 for(let tick=0;tick<30;tick++){
  t.control(1/60,{dx:0,dy:0});elapsed+=1/60;
  if(t.p.moveName!==firstMove){linked=true;break}
  seen.add(t.currentZFrameIndex(firstMove));
 }
 assert(linked,'buffered follow-up must start promptly');
 assert(elapsed<=firstDuration+1/60,'combo should not wait beyond the authored attack duration');
 assert(elapsed<.36,'chain is faster than the former .39s minimum');
 for(let frame=0;frame<8;frame++)assert(seen.has(frame),'all eight frames stay visible: '+frame);
 assert.equal(t.p.comboMoveCount,2);
 assert.notEqual(t.p.moveName,firstMove,'follow-up uses different move artwork');
});
test('faster basic forward rush keeps the original distance cap and respects enemy footprints',()=>{
 g.startRun();t.setEnemies([]);
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:move==='jab'};
 t.p.x=1100;t.p.y=570;t.p.facing=1;t.p.stamina=100;
 t.startAttack();const total=t.p.attackDriveTotal,start=t.p.x;
 assert(total>=50,'neutral punch must keep a meaningful forward lunge');
 for(let i=0;i<6;i++)t.control(1/60,{dx:0,dy:0});
 assert(t.p.x-start>29,'forward rush should get visibly ahead within 0.10 seconds');
 assert(t.p.x-start<=total+1,'no extra distance from the faster profile');
 g.startRun();t.p.x=1200;t.p.y=570;t.p.stamina=100;
 const e=t.makeEnemy('raider',t.p.x+130,t.p.y,0);e.stun=3;e.hp=e.maxHp=2000;t.setEnemies([e]);
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:move==='jab'};
 t.startAttack();let maxMove=0,minGap=Infinity;
 for(let i=0;i<14;i++){
  const previous=t.p.x;t.control(1/60,{dx:0,dy:0});
  maxMove=Math.max(maxMove,Math.abs(t.p.x-previous));
  minGap=Math.min(minGap,e.x-t.p.x);
 }
 assert(maxMove<40,'burst movement must stay below 40px/frame at 60fps');
 assert(minGap>=100,'hero cannot pass through the raider collision footprint');
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

test('connected PC gamepad uses first controller dual-rumble, not a second gamepad',()=>{
 const previous=world.navigator.getGamepads,phone=world.navigator.vibrate;
 const padCalls=[],otherCalls=[],phoneCalls=[];
 world.navigator.getGamepads=()=>[
  {connected:true,vibrationActuator:{playEffect:(type,options)=>{
   padCalls.push({type,options});return Promise.resolve('complete');
  }}},
  {connected:true,vibrationActuator:{playEffect:(type,options)=>{
   otherCalls.push({type,options});return Promise.resolve('complete');
  }}}
 ];
 world.navigator.vibrate=pattern=>{phoneCalls.push(pattern);return true};
 try{
  assert(t.activeRumbleActuator(),'first active controller has an actuator');
  assert.equal(t.vibrateImpact('punch',true),true);
  assert.equal(t.vibrateImpact('heavy',true),true);
  assert.equal(t.vibrateImpact('parry',true),true);
  assert.equal(t.vibrateImpact('hurt',true),true);
  assert.equal(t.vibrateImpact('execution',true),true);
  assert.equal(padCalls.length,5);
  assert.equal(otherCalls.length,0,'never vibrate spectator controllers');
  assert.equal(phoneCalls.length,0,'mobile phone should not buzz when pad rumble succeeded');
  assert(padCalls.every(x=>x.type==='dual-rumble'));
  const light=padCalls[0].options,heavy=padCalls[1].options;
  assert(heavy.duration>light.duration);
  assert(heavy.strongMagnitude>light.strongMagnitude);
  assert.equal(heavy.startDelay,0);
  assert(padCalls[2].options.weakMagnitude>light.weakMagnitude);
  assert(padCalls[4].options.duration>heavy.duration);
 }finally{world.navigator.getGamepads=previous;if(phone)world.navigator.vibrate=phone;else delete world.navigator.vibrate}
});
test('mobile/legacy gamepad pulse fallback works without phone vibration',()=>{
 const previous=world.navigator.getGamepads,phone=world.navigator.vibrate;
 const calls=[],phoneCalls=[];
 world.navigator.getGamepads=()=>[{connected:true,hapticActuators:[{
  pulse:(intensity,duration)=>{calls.push({intensity,duration});return Promise.resolve(true)}
 }]}];
 world.navigator.vibrate=pattern=>{phoneCalls.push(pattern);return true};
 try{
  assert.equal(t.gamepadRumble('dash'),true);
  assert.equal(t.gamepadRumble('air'),true);
  assert.equal(calls.length,2);
  assert(calls.every(c=>c.intensity>0&&c.intensity<=1));
  assert(calls[1].duration>calls[0].duration);
  assert.equal(t.vibrateImpact('heavy',true),true);
  assert.equal(phoneCalls.length,0);
 }finally{world.navigator.getGamepads=previous;if(phone)world.navigator.vibrate=phone;else delete world.navigator.vibrate}
});
test('unsupported gamepads never break combat and fall back to phone haptics',()=>{
 const previous=world.navigator.getGamepads,phone=world.navigator.vibrate;
 const calls=[];
 try{
  world.navigator.getGamepads=()=>[{connected:true,vibrationActuator:{playEffect(){throw Error('not supported')}}}];
  world.navigator.vibrate=pattern=>{calls.push(pattern);return true};
  assert.equal(t.gamepadRumble('heavy'),false);
  assert.equal(t.vibrateImpact('heavy',true),true,'phone can still vibrate');
  assert.equal(calls.length,1);
  assert(Array.isArray(calls[0]));
  world.navigator.getGamepads=()=>{throw Error('permission denied')};
  assert.equal(t.activeRumbleActuator(),null,'Gamepad API errors must not crash combat');
  world.navigator.getGamepads=()=>[];
  delete world.navigator.vibrate;
  assert.equal(t.vibrateImpact('heavy',true),false,'unsupported devices run without any rumble');
 }finally{world.navigator.getGamepads=previous;if(phone)world.navigator.vibrate=phone;else delete world.navigator.vibrate}
});
test('G8+ Bluetooth Android detection shows exact controller name and missing vibration API',()=>{
 const old=world.navigator.getGamepads;
 try{
  world.navigator.getGamepads=()=>[{id:'GameSir-G8+ Bluetooth',connected:true,buttons:[],axes:[0,0]}];
  const info=t.gamepadHapticDiagnostics();
  assert.equal(info.connected,true);
  assert.equal(info.name,'GameSir-G8+ Bluetooth');
  assert.equal(info.hasActuator,false,'gamepad input need not imply motor support');
  t.updateRumbleDiagnostics();
  assert(node('rumbleStatus').textContent.includes('진동 API가 없음'));
  assert(node('rumbleStatus').textContent.includes('GameSir-G8+'));
 }finally{world.navigator.getGamepads=old}
});
test('Gamepad API exposes unsupported dual-rumble: do not report a false successful pulse',()=>{
 const old=world.navigator.getGamepads,phone=world.navigator.vibrate;
 let called=0;
 world.navigator.getGamepads=()=>[{id:'GameSir G8+',connected:true,buttons:[],axes:[0,0],vibrationActuator:{
  effects:[],playEffect(){called++;return Promise.resolve('not-supported')}
 }}];
 try{
  const state=t.gamepadHapticDiagnostics();
  assert.equal(state.hasActuator,true);
  assert.equal(state.dual,false,'declared effects list determines support');
  assert.equal(t.gamepadRumble('test'),false,'no false-success when only unsupported effects are listed');
  assert.equal(called,0,'must not call an effect browser declares unsupported');
  t.updateRumbleDiagnostics();
  assert(node('rumbleStatus').textContent.includes('지원하지 않음'));
 }finally{world.navigator.getGamepads=old;if(phone)world.navigator.vibrate=phone}
});
test('G8+ dual-rumble unavailable but legacy pulse present falls back to pulse',()=>{
 const old=world.navigator.getGamepads,calls=[];
 world.navigator.getGamepads=()=>[{id:'GameSir G8+',connected:true,buttons:[],axes:[0,0],vibrationActuator:{
  effects:[],playEffect(){throw Error('unsupported dual-rumble')},
  pulse:(strength,duration)=>{calls.push({strength,duration});return Promise.resolve(true)}
 }}];
 try{
  assert.equal(t.gamepadHapticDiagnostics().dual,false);
  assert.equal(t.gamepadHapticDiagnostics().pulse,true);
  assert.equal(t.gamepadRumble('heavy'),true,'legacy rumble should still work');
  assert.equal(calls.length,1);
  assert.equal(calls[0].duration,220);
 }finally{world.navigator.getGamepads=old}
});
test('rumble UI only claims that browser processed a command, never claims physical feedback',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(file.includes("result===true||output==='complete'"));
 assert(file.includes('실제 G8+ 모터 진동은 직접 확인 필요.'));
 assert(file.includes('void testGamepadRumble()'));
 assert(!file.includes('진동 신호를 보냈습니다. 실제 진동 여부는 패드'));
});
test('pause vibration test is reachable and stops effects safely',()=>{
 const previous=world.navigator.getGamepads;
 const calls=[],resets=[];
 world.navigator.getGamepads=()=>[{connected:true,vibrationActuator:{
  playEffect:(kind,data)=>{calls.push({kind,data});return Promise.resolve('complete')},
  reset:()=>{resets.push(true);return Promise.resolve('complete')}
 }}];
 try{
  assert.equal(t.vibrateImpact('test',true),true);
  assert.equal(calls.length,1);
  assert.equal(calls[0].data.duration,290);
  t.stopGamepadRumble();
  assert.equal(resets.length,1);
  assert(html.includes('data-action="rumbleTest"'));
  assert(html.includes('id="rumbleStatus"'));
 }finally{world.navigator.getGamepads=previous}
});
test('strong gamepad impacts use hardware maximum motors and longest cinematic pulses',()=>{
 const p=t.RUMBLE_PROFILES;
 for(const kind of ['heavy','parry','execution','dashImpact','slam']){
  assert.equal(p[kind][1],1,'MAX weak motor on '+kind);
  assert.equal(p[kind][2],1,'MAX strong motor on '+kind);
 }
 assert(p.punch[2]>.9,'ordinary punches must now hit much harder');
 assert(p.heavy[0]>130&&p.parry[0]>150&&p.hurt[0]>160,
  'regular hits, parry and hero hurt all need longer pulses');
 assert(p.dashImpact[0]>=375,'dash punch should sustain maximum vibration');
 assert(p.slam[0]>=440,'heel slam gets the longest maximum vibration');
 assert(p.footwalk[2]<p.footrun[2],'running should rumble harder than walking');
 assert(p.footrun[2]<p.heavy[2],'impact must stay stronger than footsteps');
});
test('walking and running trigger genuine rhythmic controller footsteps, never idle rumble',()=>{
 const prior=world.navigator.getGamepads,phone=world.navigator.vibrate;
 const calls=[],phoneCalls=[];
 world.navigator.getGamepads=()=>[{connected:true,vibrationActuator:{
  playEffect:(effect,options)=>{calls.push({effect,...options});return Promise.resolve('complete')},
  reset:()=>Promise.resolve('complete')
 }}];
 world.navigator.vibrate=pattern=>{phoneCalls.push(pattern);return true};
 try{
  g.startRun();t.setEnemies([]);t.p.x=2500;t.p.y=570;
  for(let i=0;i<85;i++){
   t.setHapticTime(i/60+7);t.control(1/60,{dx:.7,dy:0});
  }
  const walking=calls.filter(v=>v.duration===65);
  assert(walking.length>=2,'walking footsteps should pulse multiple times');
  calls.length=0;
  g.startRun();t.setEnemies([]);t.p.x=2500;t.p.y=570;
  for(let i=0;i<85;i++){
   t.setHapticTime(i/60+11);t.control(1/60,{dx:1,dy:0});
  }
  const running=calls.filter(v=>v.duration===85);
  assert(running.length>=3,'running footsteps should be frequent');
  assert(running.every(v=>v.strongMagnitude>.7),'running motor stronger than walk');
  const count=calls.length;
  for(let i=0;i<30;i++){
   t.setHapticTime(i/60+13);t.control(1/60,{dx:0,dy:0});
  }
  assert.equal(calls.length,count,'standing still cannot vibrate footsteps');
  assert.equal(phoneCalls.length,0,'footstep pulse does not vibrate the phone');
 }finally{world.navigator.getGamepads=prior;if(phone)world.navigator.vibrate=phone;else delete world.navigator.vibrate}
});
test('long slam and dash punch rumble outranks steps until the maximum pulse ends',()=>{
 const prior=world.navigator.getGamepads;
 const calls=[];
 world.navigator.getGamepads=()=>[{connected:true,vibrationActuator:{
  playEffect:(effect,opts)=>{calls.push(opts);return Promise.resolve('complete')}
 }}];
 try{
  g.startRun();t.setEnemies([]);t.p.x=2600;
  t.setHapticTime(20);
  assert.equal(t.vibrateImpact('slam',true),true);
  assert.equal(calls[0].duration,440);
  assert(t.getHapticPriorityUntil()>20.48);
  for(let i=0;i<25;i++){
   t.setHapticTime(20+i/60);t.control(1/60,{dx:1,dy:0});
  }
  assert.equal(calls.length,1,'footsteps cannot interrupt a 440ms landing slam');
  for(let i=25;i<72;i++){
   t.setHapticTime(20+i/60);t.control(1/60,{dx:1,dy:0});
  }
  assert(calls.some(c=>c.duration===85),'running footsteps resume naturally after slam');
  t.setHapticTime(23);
  const before=calls.length;
  assert.equal(t.vibrateImpact('dashImpact',true),true);
  assert.equal(calls[before].duration,375);
  assert.equal(calls[before].weakMagnitude,1);
  assert.equal(calls[before].strongMagnitude,1);
 }finally{world.navigator.getGamepads=prior}
});
test('no connected actuator means no continuous footsteps or audio loop',()=>{
 const prior=world.navigator.getGamepads;
 world.navigator.getGamepads=()=>[];
 try{
  g.startRun();t.p.x=2500;t.setHapticTime(35);
  for(let i=0;i<70;i++){
   t.setHapticTime(35+i/60);t.control(1/60,{dx:1,dy:0});
  }
  assert.equal(t.footstepRumble(1/60,80),false);
 }finally{world.navigator.getGamepads=prior}
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
test('a successful parry rapidly launches the target to the current visible screen edge',()=>{
 for(const sign of [-1,1]){
  g.startRun();t.setEnemies([]);t.p.x=2600;t.p.y=570;t.p.facing=sign;t.p.stamina=100;
  t.setCameraX(t.p.x-465);
  const enemy=t.makeEnemy('raider',t.p.x+sign*80,t.p.y,0);
  t.setEnemies([enemy]);const initial=enemy.x;
  const visibleEdge=sign>0?t.getCameraX()+1280-130:t.getCameraX()+130;
  t.parry();t.enemyAttack(enemy);
  assert(enemy.knockVX*sign>2000,'parried raider must launch very fast');
  assert.equal(t.p.riposteTarget,enemy);
  assert(t.p.riposteWindow>=1.8,'give a responsive follow-up opportunity');
  for(let n=0;n<75;n++)t.updateEnemies(1/60);
  const travel=(enemy.x-initial)*sign;
  assert(travel>145,'parried enemy should still fly away at high speed');
  assert(Math.abs(enemy.x-visibleEdge)<7,'enemy must stop at the visible boundary instead of leaving the screen');
  const stoppedAt=enemy.x;
  for(let n=0;n<50;n++)t.updateEnemies(1/60);
  assert(Math.abs(enemy.x-stoppedAt)<2,'residual knockback cannot carry the parried enemy offscreen');
  assert.equal(enemy.dead,false,'parry alone is a launch, not instant lethal damage');
  assert.equal(enemy.hp,enemy.maxHp);
 }
});
test('one follow-up attack tracks the parried target, kills ordinary foes, and keeps the launch',()=>{
 for(const sign of [-1,1]){
  g.startRun();t.p.mods=Array(6).fill('counter');t.setEnemies([]);
  t.p.x=2650;t.p.y=565;t.p.facing=sign;t.p.stamina=100;
  t.setCameraX(t.p.x-465);
  const enemy=t.makeEnemy('raider',t.p.x+sign*88,t.p.y,0);
  const other=t.makeEnemy('guard',t.p.x-sign*390,t.p.y,1);
  other.stun=30;t.setEnemies([enemy,other]);
  t.parry();t.enemyAttack(enemy);
  const initialEnemyX=enemy.x,initialHeroX=t.p.x,originalHP=enemy.hp;
  t.startAttack();
  assert.equal(t.p.riposteChasing,true,'attack button arms the target-tracking sprint');
  assert.equal(t.p.riposteChaseTarget,enemy,'lock onto the actual attacker, not another enemy');
  assert.equal(t.getZMove(),'run','full-body running art shows during parry pursuit');
  assert(t.p.riposteChaseWarmup>=.30,'allow enemy to fly before contact');
  const firstRunFrame=t.currentZFrameIndex('run');
  for(let n=0;n<6;n++)t.control(1/60,{dx:0,dy:0});
  assert.equal(t.getZMove(),'run','pursuit keeps running rather than swapping back to dash pose');
  assert.notEqual(t.currentZFrameIndex('run'),firstRunFrame,'eight-frame running cycle advances even when chase closes quickly');
  let maxEnemyDisplacement=0,sawStrike=false;
  for(let n=0;n<150;n++){
   t.control(1/60,{dx:0,dy:0});
   t.updateEnemies(1/60);
   maxEnemyDisplacement=Math.max(maxEnemyDisplacement,Math.abs(enemy.x-initialEnemyX));
   if(t.p.moveName==='superman_punch')sawStrike=true;
  }
  assert(sawStrike,'automatically close in and transition to powerful 8-frame punch');
  assert(maxEnemyDisplacement>(sign>0?350:160),'parried enemy must visibly fly toward the screen boundary');
  assert((t.p.x-initialHeroX)*sign>125,'hero must physically sprint toward the enemy');
  assert.equal(enemy.dead,true,'ordinary enemies should die rather than return with forced sliver of HP');
  assert.equal(enemy.hp,0,'finisher must not reserve one-digit HP');
  assert(enemy.knockVX*sign>0,'lethal second hit still launches target in original direction');
  assert(enemy.z>=0,'lethal hit preserves airborne knockback physics');
  assert.equal(other.hp,other.maxHp,'pursuit counter only damages the parried target');
  assert.equal(t.p.riposteChasing,false);
  assert.equal(t.p.riposteStrikeTarget,null,'consume the special hit exactly once');
 }
});
test('finisher damage scales by enemy type without a forced survival threshold',()=>{
 for(const [type,expectedRemaining] of [['guard',0],['assassin',0],['elite',.22],['boss',.76]]){
  g.startRun();t.p.mods=Array(6).fill('counter');t.setEnemies([]);t.p.x=3000;t.p.facing=1;t.p.stamina=100;
  const e=t.makeEnemy(type,t.p.x+130,t.p.y,0);
  t.setEnemies([e]);t.p.riposteStrikeTarget=e;
  t.attackCheck();
  if(expectedRemaining===0){
   assert.equal(e.dead,true,type+' must be finishable by a full-HP counter');
   assert.equal(e.hp,0,type+' must not return with 1 HP');
  }else{
   assert.equal(e.dead,false,type+' should retain boss/elite durability');
   const ratio=e.hp/e.maxHp;
   assert.equal(e.maxHp-e.hp,225,'upgraded counter deals finite damage, not a max-HP percentage');
  }
  assert(e.knockVX>1200,type+' must still receive the dramatic second launch');
  assert.equal(t.p.riposteStrikeTarget,null,'special counter consumed exactly once');
 }
});
test('weakened elites and bosses can die to a finisher instead of being saved',()=>{
 for(const type of ['elite','boss']){
  g.startRun();t.p.mods=Array(6).fill('counter');t.setEnemies([]);t.p.x=3000;t.p.facing=1;
  const e=t.makeEnemy(type,t.p.x+130,t.p.y,0);e.hp=150;
  t.setEnemies([e]);t.p.riposteStrikeTarget=e;t.attackCheck();
  assert(e.dead,type+' must be killable without special HP protection');
  assert.equal(e.hp,0,'finisher should deal remaining HP and kill');
  assert(e.knockVX>1000,'fatal counter retains the air launch');
 }
});
test('without attack input, parry launch never auto-chases or causes free punch damage',()=>{
 g.startRun();t.setEnemies([]);t.p.x=2500;
 const e=t.makeEnemy('raider',t.p.x+80,t.p.y,0);t.setEnemies([e]);
 t.parry();t.enemyAttack(e);
 for(let n=0;n<130;n++){t.control(1/60,{dx:0,dy:0});t.updateEnemies(1/60)}
 assert.equal(t.p.riposteChasing,false);
 assert.equal(t.p.riposteStrikeTarget,null);
 assert.equal(e.hp,e.maxHp,'parry alone must not damage enemy');
});
test('dying parried opponent cancels pursuit rather than striking another enemy',()=>{
 g.startRun();t.setEnemies([]);t.p.x=2500;
 const e=t.makeEnemy('raider',t.p.x+80,t.p.y,0),other=t.makeEnemy('guard',t.p.x-250,t.p.y,1);
 other.stun=5;t.setEnemies([e,other]);t.parry();t.enemyAttack(e);t.startAttack();
 assert.equal(t.p.riposteChasing,true);
 e.dead=true;t.control(1/60,{dx:0,dy:0});
 assert.equal(t.p.riposteChasing,false);
 assert.equal(t.p.riposteStrikeTarget,null);
 assert.equal(other.hp,other.maxHp);
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
 assert.equal(e.maxHp,165);
 assert.equal(e.maxPoise,132);
 assert.equal(e.speed,112);
 assert.equal(e.reach,48);
 assert.equal(e.damage,20);
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
test('boss dash stays inside 32k stage without teleporting to old 12.7k boundary',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../assets/boss-hunter.js'),'utf8');
 const context={location:{search:''},Image:class{},console};context.window=context;
 vm.runInNewContext(source,context);
 const hunter=context.RZBossHunter;
 const boss=t.makeEnemy('boss',30900,560,0),hero={x:30470,y:560};
 const events={dash:0,slam:0,strike:0};
 const api={stageWidth:32000,attack:()=>events.strike++,
  warning:()=>{},impact:(e,kind)=>{if(kind==='slam')events.slam++}};
 let maxDisplacement=0,seenDash=false,seenSlam=false;
 for(let n=0;n<420;n++){
  const before=boss.x;
  hunter.update(boss,hero,1/60,api);
  maxDisplacement=Math.max(maxDisplacement,Math.abs(boss.x-before));
  if(boss.bossMode==='dash'){seenDash=true;events.dash++}
  if(boss.bossMode==='slam')seenSlam=true;
  assert(boss.x>29700&&boss.x<=31945,'boss must never vanish outside the late-stage arena');
  assert(Number.isFinite(boss.x),'boss position remains finite');
 }
 assert(maxDisplacement<22,'charge per-frame movement must be physical, not world teleport');
 assert(seenDash,'boss rushes toward the player');
 assert(seenSlam,'boss follows up with readable heavy slam patterns');
 assert(events.strike>0,'boss performs actual attacks, not only animations');
 assert(events.slam>0,'boss impacts occur');
 assert.equal(boss.dead,false,'alive boss remains visible');
});
test('actual boss AI hits the player and continues after several normal hits',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../assets/boss-hunter.js'),'utf8');
 const previous=world.RZBossHunter,previousLocation=world.location;
 world.location={search:''};
 vm.runInContext(source,world);
 try{
  g.startRun();t.setWave(3);
  t.p.x=30480;t.p.y=560;t.p.hp=t.p.maxHp=800;t.p.inv=0;
  const boss=t.makeEnemy('boss',30900,560,0);t.setEnemies([boss]);
  let seenDash=false,seenSlam=false,attacks=0;
  let priorHP=t.p.hp;
  for(let frame=0;frame<480;frame++){
   if(frame%12===0&&frame<180){
    t.p.moveName='jab';
    t.hurtEnemy(boss,8,0);
    boss.knockVX=0; // keep controlled test target in the duel.
   }
   const x=boss.x;
   t.updateEnemies(1/60);
   assert(Math.abs(boss.x-x)<25,'boss must never leave the screen in one tick');
   assert(boss.x>29500&&boss.x<32000,'boss stays in current end-of-stage combat zone');
   if(boss.bossMode==='dash')seenDash=true;
   if(boss.bossMode==='slam')seenSlam=true;
   if(t.p.hp<priorHP){attacks++;priorHP=t.p.hp}
  }
  assert(seenDash,'boss must charge despite repeated small punches');
  assert(seenSlam,'boss must follow up with slam despite repeated punches');
  assert(attacks>0,'boss offensive move must actually damage hero');
  assert.equal(boss.dead,false,'boss must stay alive after modest chip damage');
 }finally{world.RZBossHunter=previous;world.location=previousLocation}
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
  t.p.x=t.WAVE_GATES[1]+10;t.setEnemies([]);
   t.setSquad(t.SQUAD_SPOTS[1].length);t.updateEnemies(0);
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


test('boss chapter is isolated at the end of the 32k street',()=>{
 g.startRun();t.setWave(2);
 t.spawnWave();
 const live=t.getEnemies().filter(e=>!e.dead);
 assert.equal(live.length,1);
 assert.equal(live[0].type,'boss');
 assert.equal(live[0].x,30900);
 assert.equal(t.STAGE_WIDTH,32000);
 assert.equal(t.WAVE_GATES[3],31850);
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
 assert(code.includes("if(gameState!=='playing')return")||
   code.includes("if(gameState==='loading'||gameState==='menu'||gameState==='hub')return"),
   'loading, menu and paused modes must not render live gameplay');
 assert(!code.includes('function update(dt){RZAssassinArt.warm(dt)'));
 assert(code.includes("if(a==='start')requestRunStart()"));
});

test('ground attacks drive farther than Alpha 1.26 and stay capped per frame',()=>{
 g.startRun();t.setEnemies([]);
 t.p.x=440;t.p.y=570;t.p.facing=1;t.p.stamina=100;t.p.attack=0;
 t.p.comboWindow=0;t.p.moveDX=0;t.p.moveDY=0;
 t.startAttack();
 assert(t.p.attackDriveTotal>=50,'every neutral attack should surge substantially');
 assert(t.p.attackDriveTotal<=275,'total lunge stays within the current combat budget');
 const start=t.p.x;
 for(let i=0;i<12;i++){const before=t.p.x;t.control(1/60,{dx:0,dy:0});assert(t.p.x-before<=35,'a single frame must not teleport the player')}
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
 boss.x=t.STAGE_WIDTH-70;boss.knockVX=1500;t.updateEnemies(.4);
 assert(boss.x<=t.STAGE_WIDTH-45,'knockback should stay inside the extended world bounds');
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
test('stage difficulty scales upgraded enemy health without making normal foes bullet sponges',()=>{
 g.startRun();
 const first=t.makeEnemy('raider',1000,560,0),elite1=t.makeEnemy('elite',1200,560,1);
 assert(first.maxHp>=65&&first.maxHp<=90,'early mobs should survive some hits but not become bosses');
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
 assert(node('modStrip').innerHTML.includes('x2'),'the icon-only HUD must display visible xN stack ranks');
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
  press('ArrowLeft');t.p.x=t.WAVE_GATES[1]+10;t.setEnemies([]);t.setSquad(t.SQUAD_SPOTS[1].length);t.updateEnemies(0);
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
  pad.buttons[2].pressed=true;t.p.x=t.WAVE_GATES[1]+10;t.setEnemies([]);t.setSquad(t.SQUAD_SPOTS[1].length);t.updateEnemies(0);
  t.pollPad();t.menuPad.readyAt=0;for(let i=0;i<10;i++)t.pollPad();assert.equal(fake[0].clicked,0);
  pad.buttons[2].pressed=false;t.menuPad.neutralAt=0;t.pollPad();
  for(let i=0;i<10;i++){pad.buttons[0].pressed=true;t.pollPad();pad.buttons[0].pressed=false;t.pollPad()}
  assert.equal(fake[0].clicked,0,'A/cross must not confirm');
  pad.buttons[2].pressed=true;t.pollPad();t.pollPad();assert.equal(fake[0].clicked,1);
 }finally{m.querySelectorAll=old;world.navigator.getGamepads=()=>[];t.pollPad()}
});

test('successful parry launches a strong physical knockback and short player recoil',()=>{
 g.startRun();t.setEnemies([]);
 const e=t.makeEnemy('assassin',t.p.x+68,t.p.y,0);t.setEnemies([e]);
 t.parry();
 assert.equal(t.getFx().filter(f=>f.kind==='parryShield').length,0,'no bitmap shield for parry startup');
 t.enemyAttack(e);
 assert(e.knockVX>=1000,'stronger velocity launch, not teleport');
 assert.equal(t.getFx().filter(f=>f.kind==='parryShield').length,1,'only on successful attack contact');
 assert(t.p.parryRecoilTime>0&&t.p.parryRecoilRemaining>0);
 const x=t.p.x;t.control(1/60,{dx:0,dy:0});
 assert(t.p.x<x&&t.p.x>x-6,'gradual short backward player slide');
});
test('parry shield is a real eight-frame transparent PNG',()=>{
 const png=fs.readFileSync(path.join(__dirname,'../assets/fx/parry-shield.png'));
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),256);
 assert(html.includes("parryShieldImage.src='./assets/fx/parry-shield.png'"));
});
test('all twenty distinct bitmap attack atlases are archived locally and playable',()=>{
 const attacks=[
  'jab','cross','hook','uppercut','backfist','hammerfist','spinning_elbow',
  'rising_elbow','superman_punch','shovel_hook','frontkick','roundkick',
  'lowkick','axe_kick','sidekick','spinning_heel','crescent_kick',
  'diagonal_airkick','rising_headbutt','forward_headbutt'
 ];
 const artSrc=fs.readFileSync(path.join(__dirname,'../assets/attacks-20.js'),'utf8');
 const artContext={window:{}};
 vm.runInNewContext(artSrc,artContext);
 const map=artContext.window.RZ_LOCAL_20_ATTACKS;
 assert.equal(Object.keys(map).length,20);
 assert.equal(new Set(Object.values(map)).size,20);
 for(const move of attacks){
  assert.equal(map[move],'./assets/z-attacks-20/'+move+'.webp');
  const bytes=fs.readFileSync(path.join(__dirname,'..',map[move]));
  assert(bytes.length>12000,'missing art for '+move);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 }
 assert(html.includes('Object.assign(Z_REMOTE_ATLAS,window.RZ_LOCAL_20_ATTACKS||{})'));
 assert(html.includes('...Object.keys(Z_REMOTE_ATLAS).map'),'all combat moves must preload before play');
 assert(!html.includes('return;warmZSprites(dt);'),'combat must not decode new atlases in the update loop');
 assert(html.includes("p.moveName='axe_kick';loadZMove('axe_kick');"),
   'aerial attack must select the dedicated vertical axe-kick, not a sideways kick');
 assert(html.includes("p.moveName='jumpstart';"),
   'ordinary jumps must not select an attack atlas');
});
test('elite and boss use pure white bitmap flash and jump has longer vertical travel',()=>{
 const elite=fs.readFileSync(path.join(__dirname,'../assets/elite-ironmask.js'),'utf8');
 const boss=fs.readFileSync(path.join(__dirname,'../assets/boss-hunter.js'),'utf8');
 assert(elite.includes("'brightness(0) invert(1)'"),'elite flash should whiten actual sprite');
 assert(boss.includes("'brightness(0) invert(1)'"),'boss flash should whiten actual sprite');
 assert(html.includes("p.vz=760;p.z=2"),'higher jump impulse');
 assert(html.includes("p.vz=-1150"),'fast downward kick');
 assert(html.includes("p.airKickPhase==='dive'?1950:1440"),'only attack-button dive has heavier downward gravity');
 assert(!html.includes("p.jumpHeel"),'original auto-attack jump flag must be removed');
});
test('stationary JUMP without ATTACK keeps ordinary airborne poses and cannot hit anyone',()=>{
 g.startRun();t.keys.clear();t.p.x=1600;t.p.y=575;
 const eL=t.makeEnemy('raider',t.p.x-125,t.p.y,0);
 const eR=t.makeEnemy('raider',t.p.x+125,t.p.y,1);
 for(const e of [eL,eR]){e.hp=1200;e.maxHp=1200;e.stun=4}
 t.setEnemies([eL,eR]);
 const x=t.p.x;
 t.jump();
 assert.equal(t.getZMove(),'jumpstart');
 assert.equal(t.p.jumpLeap,false);
 let maxHeight=0,airborne=false;
 for(let i=0;i<90;i++){
  t.control(1/60,{dx:0,dy:0});
  maxHeight=Math.max(maxHeight,t.p.z);
  if(t.getZMove()==='airborne')airborne=true;
  assert.notEqual(t.getZMove(),'axe_kick','a plain jump must never display the attack pose');
  assert.notEqual(t.getZMove(),'diagonal_airkick','a plain jump must never show sideways kick');
 }
 assert(maxHeight>175,'stationary jump should still be tall');
 assert(airborne,'ordinary airborne pose should display');
 assert(Math.abs(t.p.x-x)<2,'neutral jump should not drift');
 assert.equal(t.p.jumpLandingTriggered,false,'no unrequested landing blast');
 assert.equal(eL.hp,1200);assert.equal(eR.hp,1200);
 assert.equal(eL.knockVX,0);assert.equal(eR.knockVX,0);
});
test('directional JUMP travels farther without automatically kicking on landing',()=>{
 for(const [key,sign] of [['d',1],['a',-1]]){
  g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=1900;
  t.keys.add(key);const origin=t.p.x;t.jump();
  assert.equal(t.p.jumpLeap,true);
  assert.equal(t.getZMove(),'jumpstart');
  for(let i=0;i<85;i++){
   t.control(1/60,{dx:sign,dy:0});
   assert.notEqual(t.getZMove(),'diagonal_airkick');
  }
  assert((t.p.x-origin)*sign>345,'keep existing long directional leap');
  assert.equal(t.p.jumpLandingTriggered,false,'no automatic shockwave');
  t.keys.delete(key);
 }
});
test('explicit aerial ATTACK launches true vertical heel-chop with a single landing blast',()=>{
 g.startRun();t.keys.clear();t.p.x=1600;t.p.y=575;
 const eL=t.makeEnemy('raider',t.p.x-125,t.p.y,0);
 const eR=t.makeEnemy('raider',t.p.x+125,t.p.y,1);
 for(const e of [eL,eR]){e.hp=1200;e.maxHp=1200;e.stun=5}
 t.setEnemies([eL,eR]);
 t.jump();
 for(let i=0;i<10;i++)t.control(1/60,{dx:0,dy:0});
 assert(t.p.z>16);
 assert.equal(eL.hp,1200);
 t.startAttack(); // actual new press AFTER jumping
 assert.equal(t.p.moveName,'axe_kick');
 assert.equal(t.getZMove(),'axe_kick');
 assert.equal(t.p.airKickPhase,'charge');
 assert.equal(t.currentZFrameIndex('axe_kick'),0);
 for(let i=0;i<8;i++)t.control(1/60,{dx:0,dy:0});
 assert.equal(t.p.airKickPhase,'charge','heel must visibly gather before descent');
 assert.equal(eL.hp,1200,'charge must never damage');
 let descending=false;
 for(let i=0;i<70;i++){
  t.control(1/60,{dx:0,dy:0});
  if(t.p.airKickPhase==='dive')descending=true;
 }
 assert(descending,'explicit attack must descend quickly');
 assert.equal(t.p.jumpLandingTriggered,true);
 assert(eL.hp<1200&&eR.hp<1200,'one powered landing shockwave hits both sides');
 assert(eL.knockVX<0&&eR.knockVX>0);
 const hpL=eL.hp,hpR=eR.hp;
 for(let i=0;i<40;i++)t.control(1/60,{dx:0,dy:0});
 assert.equal(eL.hp,hpL,'no duplicate landing AoE');
 assert.equal(eR.hp,hpR);
});
test('moving aerial ATTACK uses vertical kick artwork, never sideways diagonal kick',()=>{
 for(const [key,sign] of [['d',1],['a',-1]]){
  g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=1900;
  t.keys.add(key);const start=t.p.x;t.jump();
  for(let i=0;i<9;i++)t.control(1/60,{dx:sign,dy:0});
  assert(t.p.z>16);
  t.startAttack();
  assert.equal(t.p.moveName,'axe_kick');
  assert.equal(t.getZMove(),'axe_kick');
  for(let i=0;i<70;i++)t.control(1/60,{dx:sign,dy:0});
  assert.equal(t.p.jumpLandingTriggered,true);
  assert((t.p.x-start)*sign>200,'directional momentum stays intact during heel drop');
  t.keys.delete(key);
 }
});
test('holding ATTACK across JUMP does not trigger an automatic aerial attack',()=>{
 g.startRun();t.keys.clear();t.p.x=1700;t.p.y=570;
 t.keys.add('j');t.jump();
 for(let i=0;i<85;i++)t.control(1/60,{dx:0,dy:0});
 assert.equal(t.p.jumpLandingTriggered,false,'held attack must not cause auto impact');
 assert.equal(t.p.airKickUsed,false,'a new press is required to arm air attack');
 t.keys.delete('j');
});
test('rebalanced mobs need more hits but remain easy to knock airborne',()=>{
 g.startRun();
 for(const [kind,hp] of [['raider',84],['assassin',76],['guard',165],['elite',530],['boss',3900]]){
  const enemy=t.makeEnemy(kind,t.p.x+170,t.p.y,0);
  assert.equal(enemy.maxHp,hp,'HP of '+kind+' should reflect crowd durability');
 }
 const e=t.makeEnemy('raider',t.p.x+100,t.p.y,1);
 t.setEnemies([e]);t.p.moveName='roundkick';
 t.hurtEnemy(e,23,45);
 assert(e.hp>0,'common enemy can take more than one hit');
 assert(e.vz>0,'strikes still launch enemy in an arc');
});
test('heel landing launches mob but damping prevents screen-edge travel',()=>{
 g.startRun();t.p.x=1750;t.p.y=570;t.p.moveName='axe_kick';
 const left=t.makeEnemy('raider',t.p.x-115,t.p.y,0);
 const right=t.makeEnemy('assassin',t.p.x+115,t.p.y,1);
 t.setEnemies([left,right]);
 const originL=left.x,originR=right.x;
 t.heelLandingShockwave(false);
 assert(left.knockVX<0&&right.knockVX>0);
 assert.equal(left.knockDrag,5.6);
 assert(right.vz>=300,'enemies must still visibly pop off the floor');
 for(let i=0;i<150;i++)t.updateEnemies(1/60);
 assert(originL-left.x<195,'left target should not fly offscreen');
 assert(right.x-originR<195,'right target should not fly offscreen');
});
test('forward dodge plus immediate attack is a strong cross punch with a long second lunge',()=>{
 g.startRun();t.setEnemies([]);t.p.x=2000;t.p.y=570;t.p.facing=1;t.p.moveDX=0;t.p.stamina=100;
 const e=t.makeEnemy('raider',t.p.x+130,t.p.y,0);e.hp=500;e.maxHp=500;e.stun=3;
 t.setEnemies([e]);
 t.dodge();assert(t.p.dodge>.25&&t.p.dashFollowWindow>.5);
 t.startAttack();
 assert.equal(t.p.dodge,0,'attack press must cancel forward dash into the strike');
 assert.equal(t.p.moveName,'cross','dash follow-up MUST use a punch, not a side kick');
 assert.equal(t.p.dashSmash,true);
 assert.equal(t.p.attackDriveTotal,280,'the attack itself advances substantially further');
 assert(t.getStrikeCameraTime()>.4,'attack button must activate hero camera instantly');
 assert(t.getCameraZoom()>=1.15,'input starts the zoom before hit detection');
 let strike=false;
 for(let i=0;i<36;i++){
  t.control(1/60,{dx:0,dy:0});
  if(e.hp<500)strike=true;
 }
 assert(strike,'dedicated dash counter must reach enemy and connect');
 assert(e.knockVX>=520,'base dash punch retains a readable shove before upgrades');
 assert.equal(e.knockDrag,4.7,'dash heavy shove should still have friction');
 const afterHit=e.hp;
 for(let i=0;i<24;i++)t.control(1/60,{dx:0,dy:0});
 assert.equal(e.hp,afterHit,'one dash punch must not hit same enemy repeatedly');
 assert.equal(t.p.dashSmash,false,'dash finisher must clear');
});
test('dash cross covers more distance than old 140px kick, without frame teleport',()=>{
 g.startRun();t.p.x=2600;t.p.y=570;t.p.facing=1;t.p.moveDX=0;t.p.stamina=100;t.setEnemies([]);
 t.dodge();t.startAttack();const origin=t.p.x;
 assert.equal(t.p.moveName,'cross');
 let farthest=origin,maxFrame=0;
 for(let i=0;i<40;i++){
  const before=t.p.x;t.control(1/60,{dx:0,dy:0});
  farthest=Math.max(farthest,t.p.x);
  maxFrame=Math.max(maxFrame,Math.abs(t.p.x-before));
 }
 assert(farthest-origin>220,'attack should add a whole extra long punch lunge');
 assert(maxFrame<45,'forward motion must be frame-smoothed, not instant teleport');
});
test('periodic camera recenter keeps normal framing, briefly centers hero, then returns',()=>{
 g.startRun();t.setEnemies([]);t.p.x=3000;t.p.y=570;t.setCameraX(3000-465);
 const normal=t.getCameraX();
 // 4.6-second interval, with gentle camera easing rather than teleport.
 for(let i=0;i<320;i++){t.updateComboCamera(1/60);t.followComboCamera(1/60)}
 const centered=t.getCameraX();
 assert(centered<normal-115,'center pass must sweep the street visibly sideways');
 assert(Math.abs(centered-(t.p.x-640))<45,'hero should reach screen center during a pass');
 for(let i=0;i<165;i++){t.updateComboCamera(1/60);t.followComboCamera(1/60)}
 assert(Math.abs(t.getCameraX()-normal)<30,'camera returns to original 465px hero framing');
 assert(t.getCameraZoom()<1.02,'periodic centering never adds an unwanted zoom');
 g.startRun();t.setEnemies([]);t.p.x=3000;t.setCameraX(3000-465);
 for(let i=0;i<70;i++){t.updateComboCamera(1/60);t.followComboCamera(1/60)}
 assert(Math.abs(t.getCameraX()-(3000-465))<3,'fresh run resets the recenter timer');
});
test('camera snaps into hero focus on dash-punch PRESS and eases back',()=>{
 g.startRun();t.setEnemies([]);t.p.x=2200;t.p.y=570;t.p.facing=1;t.p.moveDX=0;
 t.dodge();t.startAttack();
 assert(t.getCameraZoom()>=1.15,'instant press zoom even before update');
 assert(t.getStrikeCameraTime()>.4,'special camera armed immediately');
 const firstX=t.getCameraX();
 for(let i=0;i<8;i++){t.updateComboCamera(1/60);t.followComboCamera(1/60)}
 assert(t.getCameraZoom()>1.29,'strong ~1.32 camera closeup');
 assert(t.getCameraX()>firstX+400,'quickly reacquire hero after attack input');
 for(let i=0;i<90;i++){t.updateComboCamera(1/60);t.followComboCamera(1/60)}
 assert(t.getCameraZoom()<1.08,'camera returns after special attack');
 assert.equal(t.getStrikeCameraTime(),0);
});
test('explicit aerial attack immediately zooms tighter than dash punch',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2300;
 t.jump();assert.equal(t.getStrikeCameraTime(),0,'jump by itself never zooms as an attack');
 for(let i=0;i<8;i++)t.control(1/60,{dx:0,dy:0});
 t.startAttack();assert.equal(t.p.moveName,'axe_kick');
 assert(t.getStrikeCameraTime()>.50,'aerial ATTACK button sets zoom immediately');
 assert(t.getCameraZoom()>=1.15);
 for(let i=0;i<8;i++){t.updateComboCamera(1/60);t.followComboCamera(1/60)}
 assert(t.getCameraZoom()>1.33,'air chop closes in ~1.34x');
});
test('backstep is not a forward dash finisher',()=>{
 g.startRun();t.setEnemies([]);t.p.facing=1;t.p.moveDX=-1;
 t.dodge();assert.equal(t.p.dashFollowWindow,0);
 t.startAttack();assert.equal(t.p.attack,0,'backstep cannot cancel to free rush');
});
test('later encounters appear only after previous squad cleared and forward progress',()=>{
 g.startRun();
 assert.equal(t.getSquad(),1);
 const opening=t.getEnemies().filter(e=>!e.dead);
 t.p.x=900;t.setCameraX(t.p.x-465);
 assert.equal(t.spawnNextEncounter(),false,'cannot stack next crowd on a living group');
 t.setEnemies([]);
 assert.equal(t.spawnNextEncounter(),false,'must advance past next troop trigger');
 t.p.x=1600;t.setCameraX(1135);
 assert.equal(t.spawnNextEncounter(),true);
 const troop=t.getEnemies().filter(e=>!e.dead);
 assert(troop.length>=4&&troop.length<=6);
 assert(troop.some(e=>e.x<1135),'some enemies emerge from the left outside viewport');
 assert(troop.some(e=>e.x>1135+1280),'others emerge from right outside viewport');
 assert(troop.every(e=>e.encountered),'spawned encounter must approach from offscreen without waiting for player detection');
 const laterHP=troop.find(e=>e.type==='raider')?.maxHp;
 assert(laterHP>70,'each new wave segment should gain HP');
});
test('enemy that has engaged Z continues pursuing after exiting camera range',()=>{
 g.startRun();t.setEnemies([]);
 const e=t.makeEnemy('raider',t.p.x+500,t.p.y,0);e.stun=0;
 t.setEnemies([e]);
 t.updateEnemies(.016);
 assert.equal(e.encountered,true);
 t.p.x=3500;
 const oldX=e.x;
 for(let i=0;i<70;i++)t.updateEnemies(1/60);
 assert(e.x>oldX+100,'detected enemy must chase even beyond 920px');
 assert.equal(e.encountered,true,'aggro never resets');
 assert(e.x<t.p.x,'follower should not teleport through player');
});
test('stage-relative HUD reserves separate left, centre and right layout areas',()=>{
 const css=html.slice(html.indexOf('<style id="compact-combat-ui">'),html.indexOf('</style>',html.indexOf('<style id="compact-combat-ui">')));
 assert(css.includes('.stage-wrap{container-type:inline-size}'),'responsive by stage width');
 assert(css.includes('#hud .hud-left{left:0;top:0;'),'player bars dock left');
 assert(css.includes('#hud .hud-right{right:0;top:0;'),'pause and credits dock right');
 assert(css.includes('#hud .hud-center{left:29%;width:42%;'),'centre has its own lane');
 assert(css.includes('@container (max-width:610px)'),'compact landscape or fold devices');
 assert(css.includes('#stageWrap .touch-actions{--face-btn:clamp(43px,5.2cqw,61px)'));
 assert(!html.includes('id="bottomTip"'),'bottom keyboard and gamepad guide must be removed, not hidden');
 assert(!html.includes("('bottomTip')"),'no title reset may reference the removed banner');
 assert(!css.includes('.bottom-tip'),'combat stage should have no bottom guide styling');
 assert(html.includes('id="touchControls"'),'touch input controls must remain available');
 assert(html.includes('data-key="j"'),'attack touch button must remain operational');
 assert(!css.includes('display:none!important} #stageWrap .touch-controls'),'touch control must remain visible');
});
test('upgrades stay in two rows by default and expand only when selected',()=>{
 g.startRun();
 const items=['fire','shock','bleed','ice','power','crit','rush','impact'];
 t.p.mods=items;
 t.updateHud();
 const toggle=node('modToggle');
 assert.equal(toggle.hidden,false,'surplus effects should have a visible toggle');
 assert(toggle.textContent.includes('+2'),'button must reveal how many effects are hidden');
 assert.equal((node('modStrip').innerHTML.match(/mod-chip compact/g)||[]).length,8);
 t.setModsExpanded(true);t.updateModToggle(8);
 assert(toggle.textContent.includes('접기'),'expanded tray has visible collapse action');
 t.setModsExpanded(false);t.updateModToggle(8);
 assert(toggle.textContent.includes('+2'),'collapse returns to two-row default');
 t.p.mods=items.slice(0,3);t.updateHud();
 assert.equal(toggle.hidden,true,'toggle disappears when all icons fit');
});
test('opening squad approaches and kills an idle player without any input',()=>{
 g.startRun();t.p.mods=[];t.p.maxHp=t.p.hp=100;t.keys.clear();world.navigator.getGamepads=()=>[];
 let elapsed=0;
 while(t.p.hp>0&&elapsed<45){t.control(1/60,{dx:0,dy:0});t.updateEnemies(1/60);elapsed+=1/60;}
 assert.equal(t.p.hp,0,'standing still must not survive the opening encounter');
 assert(elapsed>5&&elapsed<45,'opening pressure leaves time to react: '+elapsed);
 console.log('Idle defeat after',elapsed.toFixed(1),'seconds');
});
test('three special moves improve damage area and shove at every rank',()=>{
 g.startRun();
 for(const id of ['slam','dashpower','counter']){
  assert(t.MOD_META[id]);
  for(let rank=0;rank<6;rank++){
   const a=t.specialStats(id,rank),b=t.specialStats(id,rank+1);
   for(const key of ['damage','range','lane','push','visual'])assert(b[key]>a[key],id+' rank '+rank+' '+key);
   assert(t.upgradeDescription(id,rank).includes('→'));
  }
 }
});
test('slam upgrade expands actual landing damage and radius',()=>{
 const result=[];
 for(const rank of [0,3,6]){
  g.startRun();t.p.x=2500;t.p.mods=Array(rank).fill('slam');
  const near=t.makeEnemy('raider',t.p.x+80,t.p.y,0),far=t.makeEnemy('raider',t.p.x+300,t.p.y,1);
  near.hp=far.hp=1000;near.maxHp=far.maxHp=1000;t.setEnemies([near,far]);
  t.heelLandingShockwave(true);result.push([1000-near.hp,1000-far.hp,Math.abs(near.knockVX)]);
 }
 assert.equal(result[0][1],0);assert(result[2][1]>0);
 for(let i=1;i<3;i++){assert(result[i][0]>result[i-1][0]);assert(result[i][2]>result[i-1][2]);}
});
test('counter upgrade expands actual splash and never grants a free max-HP kill',()=>{
 for(const rank of [0,6]){
  g.startRun();t.p.x=2500;t.p.mods=Array(rank).fill('counter');
  const target=t.makeEnemy('elite',t.p.x+130,t.p.y,0),neighbor=t.makeEnemy('guard',t.p.x+350,t.p.y,1);
  target.hp=target.maxHp=1000;neighbor.hp=neighbor.maxHp=1000;t.setEnemies([target,neighbor]);
  t.p.riposteStrikeTarget=target;t.attackCheck();assert.equal(1000-target.hp,45+30*rank);
  assert.equal(neighbor.hp<1000,rank===6,'splash radius grows around struck target');
 }
});
test('dash upgrades expand actual hit range, damage and push',()=>{
 const results=[];
 for(const rank of [0,3,6]){
  g.startRun();t.p.x=2500;t.p.facing=1;t.p.mods=Array(rank).fill('dashpower');
  t.p.dashSmash=true;t.p.attack=.3;t.p.moveName='cross';t.p.comboIdx=0;
  const near=t.makeEnemy('raider',t.p.x+100,t.p.y,0),far=t.makeEnemy('raider',t.p.x+265,t.p.y,1);
  near.hp=far.hp=1000;near.maxHp=far.maxHp=1000;t.setEnemies([near,far]);
  t.attackCheck();results.push([1000-near.hp,1000-far.hp,near.knockVX]);
 }
 assert.equal(results[0][1],0);assert(results[2][1]>0);
 for(let i=1;i<3;i++){assert(results[i][0]>results[i-1][0]);assert(results[i][2]>results[i-1][2]);}
});
test('normal attacks exhaust the ready repertoire without repeats across pauses',()=>{
 g.startRun();t.setEnemies([]);
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:true};
 const moves=[];
 for(let i=0;i<57;i++){
  t.p.attack=0;t.p.stamina=100;t.p.comboWindow=i%5===0?0:1;
  t.startAttack();moves.push(t.p.moveName);
 }
 for(let cycle=0;cycle<3;cycle++)assert.equal(new Set(moves.slice(cycle*19,cycle*19+19)).size,19);
 for(let i=8;i<moves.length;i++)assert(!moves.slice(i-8,i).includes(moves[i]));
});
test('first eight combo strikes display different silhouette families and readable animation',()=>{
 g.startRun();t.setEnemies([]);
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:true};
 const first=[];
 for(let i=0;i<8;i++){
  t.p.attack=0;t.p.stamina=100;t.startAttack();
  assert(t.p.attackDuration>=.29,'authored eight-frame strikes should retain original quick timing');
  first.push(t.p.moveName);
 }
 const kicks=new Set(['roundkick','frontkick','lowkick','axe_kick','sidekick','spinning_heel','crescent_kick']);
 assert.equal(new Set(first).size,8,'the scripted eight-strike combo cannot repeat');
 assert(first.filter(m=>kicks.has(m)).length>=3,'three visually different kicks must enter early');
 assert(first.some(m=>m.includes('elbow')),'show elbow within the first eight');
 assert(first.some(m=>m.includes('headbutt')),'show headbutt within the first eight');
});
test('unavailable attacks are skipped and failed inputs do not consume moves',()=>{
 g.startRun();t.setEnemies([]);
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:['jab','frontkick','hook'].includes(move)};
 const next=t.pickComboMove(0,'idle',false);t.p.stamina=0;t.startAttack();
 assert.equal(t.p.comboMoveCycle.length,0);assert.equal(t.pickComboMove(0,'idle',false),next);
 const moves=[];
 for(let i=0;i<9;i++){t.p.stamina=100;t.p.attack=0;t.startAttack();moves.push(t.p.moveName)}
 for(let i=0;i<9;i+=3)assert.equal(new Set(moves.slice(i,i+3)).size,3);
});
test('new PA-K punch is a loud transient on its own audio bus and never ducks music',()=>{
 const previousAC=world.AudioContext,previousBgm=world.__revenantBgm;
 const filters=[],gains=[],compressors=[];let ctx,ducked=false;
 const param=()=>({value:0,max:0,
  setValueAtTime(v){this.value=v;this.max=Math.max(this.max,v)},
  linearRampToValueAtTime(v){this.value=v;this.max=Math.max(this.max,v)},
  exponentialRampToValueAtTime(v){this.value=v;this.max=Math.max(this.max,v)}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),
  connect(other){return other},disconnect(){},start(){},stop(){}});
 class FakeAudioContext{
  constructor(){ctx=this;this.currentTime=12;this.sampleRate=44100;this.destination=node();this.state='running'}
  createDynamicsCompressor(){const n=node();compressors.push(n);return n}
  createGain(){const n=node();gains.push(n);return n}
  createOscillator(){return node()}
  createBufferSource(){return node()}
  createBiquadFilter(){const n=node();filters.push(n);return n}
  createBuffer(_,length,rate){return{sampleRate:rate,getChannelData:()=>new Float32Array(length)}}
 }
 world.AudioContext=FakeAudioContext;
 world.__revenantBgm={duckImpact(){ducked=true}};
 try{
  assert.equal(t.playImpactSound('punch',1),true);
  const firstSnap=filters.find(f=>f.type==='highpass');
  assert(firstSnap&&firstSnap.frequency.value>=1800,'ordinary punch needs instant audible snap');
  assert(gains.some(g=>g.gain.max>=.9),'foreground punch transient keeps its original input envelope');
  assert(gains.some(g=>Math.abs(g.gain.value-(.98*.70))<1e-8),'impact master output uses exactly 70% previous gain');
  ctx.currentTime+=.14;
  assert.equal(t.playImpactSound('heavy',1.35),true);
  assert(filters.filter(f=>f.type==='highpass').length>=2,'heavy punch needs a second hard transient');
  assert(gains.some(g=>g.gain.max>1.3),'heavy attack transient must exceed normal strike');
  assert.equal(compressors.length,1,'reuse master limiter and prevent stacking clipping');
  const toneStart=gains.length;t.sound('attack');
  assert(gains.slice(toneStart).some(g=>Math.abs(g.gain.max-(.07*.70))<1e-8),'synthetic attack tone is set to 70%');
  const breakStart=gains.length;t.sound('break');
  assert(gains.slice(breakStart).some(g=>Math.abs(g.gain.max-(.19*.70))<1e-8),'break tone peak is set to 70%');
  assert(gains.slice(breakStart).some(g=>Math.abs(g.gain.value-(.22*.70))<1e-8),'break noise body is set to 70%');
  assert.equal(ducked,false,'impact must not adjust music volume');
 }finally{
  if(previousAC)world.AudioContext=previousAC;else delete world.AudioContext;
  if(previousBgm)world.__revenantBgm=previousBgm;else delete world.__revenantBgm;
 }
});
console.log(`${checks} combat regression checks passed`);
