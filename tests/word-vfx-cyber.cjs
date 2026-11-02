'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'assets/vfx/project_z_execution_critical_cyber_8f.png'),data=fs.readFileSync(file);
assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(data.readUInt32BE(16),2176);assert.equal(data.readUInt32BE(20),320);
for(const filename of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,filename),'utf8');
 assert(html.includes('id="combatWordHud" width="320" height="200"'),'dedicated HUD canvas');
 assert(html.includes('right:calc(100% + 8px)'),'fixed to pause left');
 assert(html.includes('pause.offsetTop+pause.offsetHeight*.5'),'fixed pause vertical center');
 assert(html.includes("execution:{frames:.98,hold:.30,fade:.32,width:282}"),'slow execution sequence');
 assert(html.includes("critical:{frames:.86,hold:.26,fade:.30,width:264}"),'slow critical sequence');
 assert(html.includes('drawCombatWordHud();'),'HUD render after camera restores');
 assert(html.includes("if(f.kind==='combatWordSprite')continue;"),'no in-world redraw');
 assert(html.includes("spawnCombatWordFx('execution',target)"),'execution sprite trigger');
 assert(html.includes("spawnCombatWordFx('critical',e)"),'critical sprite trigger');
 assert(html.includes("const critChance=Math.min(.72,.22+modRank('crit')*.10);"),'22% base plus upgraded crit');
 assert(html.includes('(p.critDrought||0)>=4'),'pity prevents long noncritical streaks');
 assert(html.includes('const padX=2,padY=3;'),'parry tip safely preserved');
 assert(html.includes("zClampVfxX(f.x,dir>0?w*.32:w*.68,dir>0?w*.68:w*.32)"),'parry mirrored edge clamp retained');
 assert(!html.includes("flash('EXECUTION!'"),'no font-based execution');
 assert(!html.includes("floatText('CRITICAL!'"),'no floating critical');
 const begin=html.indexOf('const Z_COMBAT_WORD_TIMING=');
 const end=html.indexOf('// Five original painted transparent bitmap hit variants:',begin);
 assert(begin>0&&end>begin,'HUD wordmark source isolated');
 const drawn=[],ctx={save(){},restore(){},clearRect(){},drawImage(...args){drawn.push(args)}};
 const canvas={width:320,height:200,style:{},getContext:()=>ctx,getBoundingClientRect:()=>({height:115})};
 const pause={offsetTop:82,offsetHeight:32};
 const elements={combatWordHud:canvas,pauseButton:pause};
 const world={Z_COMBAT_WORD_ART:{image:{naturalWidth:2176,naturalHeight:320,complete:true},ready:true,missing:false},
 window:{},fx:[],p:{x:420,y:540},gameState:'playing',Math,
 clamp:(v,l,h)=>Math.max(l,Math.min(h,v))};
 // Use a local $ lookup; no other DOM infrastructure is needed.
 world.$=name=>elements[name];
 vm.createContext(world);
 vm.runInContext(html.slice(begin,end)+'\nthis.spawn=spawnCombatWordFx;this.drawHud=drawCombatWordHud;',world);
 assert(world.spawn('critical',{x:430,y:500}));assert.equal(world.fx.length,1);
 let word=world.fx[0];assert(Math.abs(word.maxLife-1.42)<1e-8,'critical total duration');
 assert.equal(word.x,420,'world coordinates never affect HUD position');
 for(let i=0;i<8;i++){word.age=i*.86/8;world.drawHud();}
 assert.equal(drawn.length,8,'every authored pose displayed once');
 for(let i=0;i<8;i++)assert.equal(drawn[i][1],i*272,'source frame index '+i);
 assert.equal(canvas.style.top,'41px','pause centered vertically');
 word.age=1.12;world.drawHud();assert.equal(drawn.at(-1)[1],7*272,'final frame held');
 word.age=1.40;world.drawHud();assert(ctx && drawn.at(-1),'faded without throwing');
 assert(world.spawn('execution',{x:1234,y:670}));assert.equal(world.fx.length,1,'only one HUD mark at a time');
 assert(Math.abs(world.fx[0].maxLife-1.60)<1e-8,'execution total duration');
 world.fx=[];world.drawHud();assert.equal(canvas.style.display,'none','hide when inactive');
}
console.log('PASS: anchored pause-left transparent wordmark, all 8 slower frames, hold/fade, higher critical baseline, old text gone, parry edge safety');
