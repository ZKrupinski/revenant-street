const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const nodes=new Map(),ctx=new Proxy({},{get:()=>()=>{}});
function node(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){}},getContext:()=>ctx,addEventListener(){},querySelector:()=>node('child'),querySelectorAll:()=>[]});return nodes.get(id)}
const world={console,document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){},createElement:()=>node('canvas')},Image:class{},navigator:{getGamepads:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(){},addEventListener(){},RZAssassinArt:{load:()=>({ready:false}),warm(){},status:()=>({})}};world.window=world;vm.createContext(world);
for(const script of scripts.slice(0,-1))vm.runInContext(script,world);
vm.runInContext(scripts.at(-1).replace('titleMenu();requestAnimationFrame(loop);',`window.test={p,makeEnemy,updateEnemies,hurtEnemy,startAttack,enemyAttack,getAssassinMove,getMaskedMove,maskedFrame,anchorMaskedFrames,updateEliteAI,zOneShotFrame,zStride,currentZFrameIndex,getZMove,parry,pauseToggle,setEnemies:v=>enemies=v,getEnemies:()=>enemies};titleMenu();`),world);
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
 assert(lab.includes("get('gait')==='previous'"),'Frame Lab must support previous-gait comparison');
 assert(main.includes('const Z_ANIM_RATE=.72'),'animation cadence must remain slower');
 assert(main.includes('const zStride=key=>(key===\'run\'?32'),'running stride should reduce frame jumps');
 assert(lab.includes('value="8"'),'Frame Lab default speed should be 8 FPS');
});
console.log(`${checks} combat regression checks passed`);
