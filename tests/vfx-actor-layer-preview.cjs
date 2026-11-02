'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
// Both comparisons share the exact same gameplay and art; only drawing order changes.
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert(html.includes('function drawFloatingEffects(){'),'combat labels must be independent from bitmap layer');
 assert(html.includes('if(Z_VFX_BEHIND_ACTORS)drawEffects();'),'draw visual bitmaps before actors');
 assert(html.includes('if(!Z_VFX_BEHIND_ACTORS)drawEffects();'),'old foreground art reachable by URL');
 assert(html.includes('drawFloatingEffects();'),'combat damage numbers remain foreground');
 assert(html.includes('window.__zVfxLayerStatus'),'live preview mode exposed');
 assert(html.includes('function drawEffects(){drawModEnergy();'),'all original effects continue to render');
 assert(html.includes("if(f.kind==='parryCounterSprite'){drawParryCounterSprite(f);continue;}"),'parry counter kept');
 assert(html.includes("if(f.kind==='groundSlamSprite'){"),'ground slam kept');
 assert(html.includes("if(f.kind==='healVfxSprite'){drawHealVfx(f);continue;}"),'healing kept');
 assert(html.includes("const width=f.width,height=width*(sh/sw)*.81;"),'original counter scale unchanged');
 const begin=html.indexOf('const Z_VFX_BEHIND_ACTORS='),end=html.indexOf('const runtimePerf=',begin);
 assert(begin>0&&end>begin,'preview selector and rendering isolated');
 const script=html.slice(begin,end);
 for(const [query,mode] of [['','behind'],['?vfx=back','behind'],['?vfx=front','front'],['?intro=off&vfx=front','front']]){
  const called=[],p={x:200,y:540},e={x:300,y:565,dead:false},W=1280,H=720;
  const world={
   window:null,location:{search:query},gameState:'playing',heroEntry:{active:false},ctx:{
    clearRect(){},save(){},restore(){},translate(){},scale(){}},
   screenShake:0,cameraZoom:1,screenTint:0,cameraX:0,
   W,H,p,enemies:[e],Math,clamp:(a,lo,hi)=>Math.max(lo,Math.min(hi,a)),
   drawBackdrop(){called.push('backdrop')},
   drawIntruderSpecialWarnings(){called.push('warnings')},
   drawActor(a){called.push(a===p?'hero':'enemy')},
   drawEffects(){called.push('sprite-vfx')},
   drawFloatingEffects(){called.push('text-front')},
   drawEnemyStatusIcons(){called.push('status-front')},
   syncZSprite(){called.push('sync')},
   drawTravelMeter(){called.push('travel')},
   drawOffscreenEnemyIndicator(){called.push('indicators')}
  };
  world.window=world;vm.createContext(world);
  vm.runInContext(script+'\nthis.preview=draw;',world,{filename:file});
  assert.equal(world.__zVfxLayerStatus(),mode);
  world.preview();
  assert.deepEqual(called,mode==='behind'
   ?['backdrop','warnings','sprite-vfx','hero','enemy','text-front','status-front','sync','travel','indicators']
   :['backdrop','warnings','hero','enemy','sprite-vfx','text-front','status-front','sync','travel','indicators'],
   file+': '+mode+' mode draws exactly one VFX pass, readable combat text and status icons');
 }
 const first=html.indexOf("(()=>{'use strict';"),last=html.lastIndexOf('\n})();\n\n</script>');
 assert(first>0&&last>first);
 new vm.Script(html.slice(first,last+6),{filename:file});
}
console.log('PASS: VFX behind/foreground URL comparison, actor occlusion order, combat text and status UI retained, both builds compile');
