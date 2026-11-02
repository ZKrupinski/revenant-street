'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert(!html.includes('function drawFloatingEffects(){'),'no floating damage numbers');
 assert(html.includes("if(Z_VFX_MODE==='back')drawEffects('all');"),'old all-back preview');
 assert(html.includes("if(Z_VFX_MODE==='front')drawEffects('all');"),'old all-front preview');
 assert(html.includes("drawEffects('back',vfxSelection)"),'ordinary FX render under actor sprites');
 assert(html.includes("drawEffects('front',vfxSelection)"),'signature FX render over actor sprites');
 assert(html.includes("const Z_FRONT_SPECIAL_FX=new Set(["),'signature FX whitelist');
 for(const type of ['parrySuccess10','parryCounterSprite','groundSlamSprite','dashPierceSprite','dashTrailSprite']){
  assert(html.includes("'"+type+"'"),'special attack must remain in the front pass: '+type);
 }
 assert(html.includes("if(layer!=='back'&&p.dodge>0&&!p.evadeBackstep)drawDashChargeSprite(p)"),'dash charging bitmap is always above actors in hybrid');
 assert(html.includes("fxBurst(enemy.x,enemy.y-96,'red',powered?1.55:1.25,true)"),'jump AoE sparks in front');
 assert(html.includes("fxBurst(enemy.x,enemy.y-110,dash?'blue':'gold',.78+rank*.08,true)"),'dash/parry secondary spark above actors');
 assert(html.includes("fxBurst(e.x,e.y-125,'gold',skill.visual,true)"),'parry riposte extra impact in front');
 assert(html.includes("fxBurst(e.x,e.y-118,'gold',specialStats('dashspeed').visual,true)"),'dash finisher sparks in front');
 assert(html.includes("const w=318,h=296;")&&html.includes("const width=f.width,height=width*(sh/sw)*.81;"),'original parry and counter sizes unchanged');

 const helperStart=html.indexOf('const Z_FRONT_SPECIAL_FX=');
 const helperEnd=html.indexOf('function drawEffects(',helperStart);
 assert(helperStart>0&&helperEnd>helperStart,'hybrid selection helpers isolated');
 const e1={x:400,y:550,dead:false,fade:1,renderX:400,renderY:550,
  shock:1,burn:1,bleed:1,freeze:1},e2={x:890,y:560,dead:false,fade:1};
 const p={x:120,y:560};
 const normal={kind:'basicHitSprite',x:912,y:420,delay:0};
 const secondary={kind:'basicHitSprite',x:923,y:424,delay:.02};
 const crit={kind:'upgradeVfxSprite',upgrade:'crit',x:420,y:402,contactEnemy:e1};
 const chain={kind:'upgradeVfxSprite',upgrade:'chain',x:410,y:398,contactEnemy:e1};
 const parry={kind:'parrySuccess10',x:400,y:450};
 const slam={kind:'groundSlamSprite',x:300,y:600};
 const dash={kind:'dashPierceSprite',x:900,y:420};
 const riposte={kind:'parryCounterSprite',x:450,y:390};
 const trail={kind:'dashTrailSprite',x:125,y:500};
 const extra={kind:'modBitmap',x:400,y:425,specialAttackFx:true};
 const attributes=[{mod:'fire',target:e1,x:450,y:380},{mod:'shock',target:e1,x:390,y:350}];
 const world={enemies:[e1,e2],p,fx:[normal,secondary,crit,chain,parry,slam,dash,riposte,trail,extra],
  attributeFx:attributes,Z_ENEMY_STATUS_VFX:[
   {status:'shock'},{status:'burn'},{status:'bleed'},{status:'freeze'}],Math};
 vm.createContext(world);
 vm.runInContext(html.slice(helperStart,helperEnd)+
  '\nthis.choose=zHybridVfxForeground;this.signature=zIsSignatureVfx;this.inPass=zDrawInLayer;',world);
 const selection=world.choose();
 for(const f of [parry,slam,dash,riposte,trail,extra])assert(world.signature(f),'special must render above actors');
 assert(!world.signature(normal),'normal hit defaults behind');
 assert(!selection.fx.has(normal)&&selection.fx.has(secondary),'one of two simultaneous normal hit sprites promoted');
 assert(selection.fx.has(crit)&&selection.fx.has(chain),'two strongest accents promoted in a heavy multi-effect cluster');
 assert(!selection.attributes.has(attributes[0])&&!selection.attributes.has(attributes[1]),'other simultaneous elemental layers remain behind, not erased');
 assert.equal(selection.fx.size,3,'one promoted normal + two promoted upgraded effects');
 assert.equal(world.inPass('back',false),true);assert.equal(world.inPass('back',true),false);
 assert.equal(world.inPass('front',true),true);assert.equal(world.inPass('front',false),false);
 assert.equal(world.inPass('all',true),true);

 // Simulate the actual drawEffects pass with PNG draw stubs.
 const effectStart=html.indexOf('function drawEffects('),effectEnd=html.indexOf('// Combat-only text overlays are intentionally disabled',effectStart);
 assert(effectStart>helperStart&&effectEnd>effectStart);
 const evt=[],testFx=[normal,secondary,crit,chain,parry,slam,dash,riposte,trail,extra];
 const render={
  fx:testFx,p:{dodge:0},cameraX:0,W:1280,Math,img:{},ctx:{save(){},restore(){},drawImage(){}},
  drawModEnergy(layer){evt.push('statuses:'+layer)},
  drawBasicContactFx(f){evt.push('basic:'+testFx.indexOf(f))},
  drawUpgradeVfx(f){evt.push('upgrade:'+f.upgrade)},
  drawGroundSlamSprite(f){evt.push('slam');return true},
  drawDashPierceSprite(f){evt.push('dash')},
  drawParryCounterSprite(f){evt.push('riposte')},
  drawDashTrailSprite(f){evt.push('trail')},
  parrySuccessImage:{complete:false},parrySuccessSourceRect(){},clamp(){return 1;},
  zIsSignatureVfx:world.signature,zDrawInLayer:world.inPass,
  // floating labels are deliberately not rendered inside either bitmap pass
  floatText(){throw Error('floating text should be independent')}
 };
 // Use actual objects created in this test, with world-issued selection.
 vm.createContext(render);vm.runInContext(html.slice(effectStart,effectEnd)+'\nthis.render=drawEffects;',render);
 render.render('back',selection);render.render('front',selection);
 for(const value of ['basic:0','basic:1','upgrade:crit','upgrade:chain','slam','dash','riposte','trail']){
  assert.equal(evt.filter(x=>x===value).length,1,'each sprite is drawn exactly once in correct pass: '+value);
 }
 assert(evt.indexOf('basic:0')<evt.indexOf('slam'),'ordinary main hit is behind signature blast');
 assert(evt.indexOf('slam')>evt.indexOf('basic:1'),'signature ground slam only draws in foreground');

 // The three URL modes share the same game build. Check exact actor ordering.
 const begin=html.indexOf('const Z_VFX_MODE='),end=html.indexOf('const runtimePerf=',begin);
 assert(begin>0&&end>begin);
 const renderCode=html.slice(begin,end);
 assert(!renderCode.includes('drawFloatingEffects()')&&!renderCode.includes('drawEnemyStatusIcons('),'character text not in draw order');
 for(const [query,mode] of [['','hybrid'],['?vfx=back','back'],['?vfx=front','front'],['?k=1&vfx=front','front']]){
  const calls=[],hero={x:200,y:540},enemy={x:300,y:565,dead:false};
  const a={window:null,location:{search:query},gameState:'playing',heroEntry:{active:false},
   ctx:{clearRect(){},save(){},restore(){},translate(){},scale(){}},screenShake:0,
   cameraZoom:1,screenTint:0,cameraX:0,W:1280,H:720,p:hero,enemies:[enemy],Math,
   clamp:(n,lo,hi)=>Math.max(lo,Math.min(hi,n)),zHybridVfxForeground(){return selection;},
   drawBackdrop(){calls.push('backdrop')},drawIntruderSpecialWarnings(){},
   drawActor(v){calls.push(v===hero?'hero':'enemy')},
   drawEffects(layer){calls.push('vfx:'+layer)},drawFloatingEffects(){calls.push('text')},
   drawEnemyStatusIcons(){calls.push('icons')},syncZSprite(){},
   drawTravelMeter(){},drawOffscreenEnemyIndicator(){}
  };
  a.window=a;vm.createContext(a);vm.runInContext(renderCode+'\nthis.paint=draw;',a);
  assert.equal(a.__zVfxLayerStatus(),mode);
  a.paint();
  const expect=mode==='hybrid'
   ?['backdrop','vfx:back','hero','enemy','vfx:front']
   :mode==='back'
   ?['backdrop','vfx:all','hero','enemy']
   :['backdrop','hero','enemy','vfx:all'];
  assert.deepEqual(calls,expect,file+' mode '+mode);
 }
 const first=html.indexOf("(()=>{'use strict';"),last=html.lastIndexOf('\n})();\n\n</script>');
 assert(first>0&&last>first);new vm.Script(html.slice(first,last+6),{filename:file});
}
console.log('PASS: hybrid two-pass VFX layering, foreground parry/jump/dash/counter, 1–2 normal accents on top, all other effects behind; no duplicate draws, 3 URL modes');
