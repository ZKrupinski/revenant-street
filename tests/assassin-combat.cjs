const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const nodes=new Map(),ctx=new Proxy({},{get:()=>()=>{}});
function node(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){}},getContext:()=>ctx,addEventListener(){},querySelector:()=>node('child'),querySelectorAll:()=>[]});return nodes.get(id)}
const world={console,document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){},createElement:()=>node('canvas')},Image:class{},navigator:{getGamepads:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(){},addEventListener(){},RZAssassinArt:{load:()=>({ready:false}),warm(){},status:()=>({})}};world.window=world;vm.createContext(world);
for(const script of scripts.slice(0,-1))vm.runInContext(script,world);
vm.runInContext(scripts.at(-1).replace('titleMenu();requestAnimationFrame(loop);',`window.test={p,makeEnemy,updateEnemies,hurtEnemy,startAttack,enemyAttack,getAssassinMove,getMaskedMove,maskedFrame,anchorMaskedFrames,updateEliteAI,zOneShotFrame,zStride,currentZFrameIndex,getZMove,control,applyImpactFeedback,actorShakeOffset,playImpactSound,vibrateImpact,parry,pauseToggle,setEnemies:v=>enemies=v,getEnemies:()=>enemies};titleMenu();`),world);
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
 assert.equal(elite[0].maxHp,210);
 assert.equal(elite[0].maxPoise,185);
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
 t.setEnemies([e]);t.hurtEnemy(e,120,20);
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
console.log(`${checks} combat regression checks passed`);
