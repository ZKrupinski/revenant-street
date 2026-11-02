'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const png=fs.readFileSync(path.join(root,'assets/vfx/project_z_execution_critical_cyber_8f.png'));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG source art');
assert.equal(png.readUInt32BE(16),2176,'8 columns x 272 pixels');
assert.equal(png.readUInt32BE(20),320,'2 rows x 160 pixels');
for(const filename of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,filename),'utf8');
 for(const literal of [
  'id="combatWordHud" width="320" height="200"',
  'right:calc(100% + 8px)',
  'width:clamp(118px,22cqw,290px)',
  "execution:{enter:.20,shake:.14,frames:2.06,hold:.50,exit:.64,width:316}",
  "critical:{enter:.18,shake:.12,frames:1.85,hold:.42,exit:.60,width:312}",
  'drawCombatWordHud();',
  "if(f.kind==='combatWordSprite')continue;",
  "spawnCombatWordFx('execution',target)",
  "spawnCombatWordFx('critical',e)",
  "const critChance=Math.min(.72,.22+modRank('crit')*.10);",
  "(p.critDrought||0)>=4",
  "const padX=2,padY=3;",
  "zClampVfxX(f.x,dir>0?w*.32:w*.68,dir>0?w*.68:w*.32)",
  "zCombatWordQueue.length=0;floating=[]",
  "zStartCombatWord(zCombatWordQueue.shift())",
  "canvas.style.transform='translate3d('"
 ])assert(html.includes(literal),filename+': expected scene and previous mechanics retained: '+literal);
 assert(!html.includes("flash('EXECUTION!'"),'execution is bitmap-only');
 assert(!html.includes("floatText('CRITICAL!'"),'critical is bitmap-only');
 assert(!html.includes("ctx.drawImage(im,frame*cw,row*ch,cw,ch,drawX"),'wordmark never rendered in world');
 const begin=html.indexOf('const Z_COMBAT_WORD_TIMING=');
 const end=html.indexOf('// Five original painted transparent bitmap hit variants:',begin);
 assert(begin>0&&end>begin,'isolated HUD sprite renderer');
 const draws=[],ctx={save(){},restore(){},clearRect(){},drawImage(...a){draws.push(a)}};
 const canvas={width:320,height:200,style:{},getContext:()=>ctx,
  getBoundingClientRect:()=>({width:290,height:181.25})};
 const pause={offsetTop:82,offsetHeight:32,parentElement:{offsetWidth:190}};
 const elements={combatWordHud:canvas,pauseButton:pause};
 const world={Z_COMBAT_WORD_ART:{image:{naturalWidth:2176,naturalHeight:320,complete:true},ready:true,missing:false},
  window:{},fx:[],p:{x:420,y:540},gameState:'playing',Math,
  clamp:(v,l,h)=>Math.max(l,Math.min(h,v)),$:name=>elements[name]};
 vm.createContext(world);
 vm.runInContext(html.slice(begin,end)+
  '\nthis.emit=spawnCombatWordFx;this.paint=drawCombatWordHud;this.start=zStartCombatWord;this.pending=zCombatWordQueue;',world);
 const dx=()=>Number(canvas.style.transform.match(/translate3d\(([-\d.]+)px/)[1]);
 const paint=t=>{word.age=t;world.paint();return draws.at(-1)};
 assert(world.emit('critical',{x:250,y:570}), 'critical triggered');
 let word=world.fx[0];
 assert(Math.abs(word.maxLife-2.87)<1e-8,'critical plays around 2.9 seconds including hold/exit');
 assert.equal(word.x,420,'HUD anchored, not following struck opponent');
 assert.equal(canvas.style.display,undefined,'not shown before render');
 paint(0);
 assert.equal(canvas.style.opacity,'0.000','appears transparent');
 assert(dx()<=-149,'entering from left center of billboard');
 paint(.19);
 assert.equal(canvas.style.opacity,'1.000','fully visible after swift entry');
 assert(Math.abs(dx())<6,'small settling jitter at arrival');
 for(let i=0;i<8;i++){
  const a=paint(i*1.85/8+.0001);
  assert.equal(a[1],i*272,'original CRITICAL animation frame '+i);
  assert.equal(a[2],160,'cyan bottom row');
 }
 paint(1.85+.2);
 assert.equal(draws.at(-1)[1],7*272,'hold final frame while readable');
 assert.equal(canvas.style.opacity,'1.000','fully opaque during hold');
 paint(1.85+.42+.30);
 assert(dx()>0,'rightward exit from pause left');
 assert(Math.abs(Number(canvas.style.opacity)-.5)<.001,'fades while exiting');
 paint(2.87);
 assert.equal(canvas.style.opacity,'0.000','fully transparent at exit');
 assert(dx()>290+190,'whole billboard offscreen, not cropped inside the 320px canvas');
 assert(world.emit('critical',{x:220,y:570}));
 assert.equal(world.fx.length,1,'new CRITICAL must not interrupt previous slow animation');
 assert.equal(world.pending.length,1,'one pending critical max');
 assert(world.emit('execution',{x:220,y:570}));
 assert.deepEqual(Array.from(world.pending),['execution','critical'],'execution prioritised before waiting crit');
 world.fx=[];world.start(world.pending.shift());
 word=world.fx[0];assert.equal(word.word,'execution');
 assert(Math.abs(word.maxLife-3.20)<1e-8,'execution remains longer');
 word.age=0;word.drawnFrame=-1;
 for(let i=0;i<8;i++){
  const a=paint(i*2.06/8+.0001);
  assert.equal(a[1],i*272,'original EXECUTION animation frame '+i);
  assert.equal(a[2],0,'red first row');
 }
 assert.equal(canvas.style.top,Math.round(82+16-181.25*.5)+'px','centered beside pause button');
 world.fx=[];world.pending.splice(0);world.paint();
 assert.equal(canvas.style.display,'none','hides when no effect is active');
}
console.log('PASS: large pause-left bitmap wordmarks, fast transparent slide-in, small settling shake, slow 8F, hold, rightward fade exit, priority queuing and previous combat changes');
