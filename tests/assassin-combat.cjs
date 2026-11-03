const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
const nodes=new Map(),ctx=new Proxy({},{get:()=>()=>{}});
function node(id){if(!nodes.has(id))nodes.set(id,{style:{setProperty(){}},classList:{_s:new Set(),add(...ks){ks.forEach(k=>this._s.add(k))},remove(...ks){ks.forEach(k=>this._s.delete(k))},toggle(k,on){if(on===undefined)on=!this._s.has(k);on?this._s.add(k):this._s.delete(k);return !!on},contains(k){return this._s.has(k)}},getBoundingClientRect:()=>({left:0,top:0,right:1280,bottom:720,width:1280,height:720}),getContext:()=>ctx,addEventListener(){},appendChild(){},querySelector:selector=>selector==='.hub-shard-notice-mask'?null:node('child'),querySelectorAll:()=>[]});return nodes.get(id)}
const world={console,location:{search:'?intro=off'},setTimeout(){return 1},clearTimeout(){},document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){},createElement:()=>node('canvas')},Image:class{addEventListener(){}},navigator:{getGamepads:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(){},addEventListener(){},RZAssassinArt:{load:()=>({ready:false}),warm(){},status:()=>({})}};world.window=world;vm.createContext(world);
for(const script of scripts.slice(0,-1))vm.runInContext(script,world);
vm.runInContext(scripts.at(-1).replace('titleMenu();requestAnimationFrame(loop);',`window.test={seedImpactAudio:(ctx,buffers)=>{audio=ctx;impactBus=null;lastImpactAudio=-99;Object.keys(impactSfxBuffers).forEach(k=>delete impactSfxBuffers[k]);Object.assign(impactSfxBuffers,buffers||{});impactVoices.length=0;},intruderEntering,intruderEntryFrame,drawIntruderEntry,drawIntruderCombat,intruderVisualMove,intruderMotionImages,INTRUDER_FRAME_FOOT,intruderCombatFrame,updateIntruderSpecial,zCellSamplingSpec,hubMenu,selectHubModule,focusHubApplyAfterSelection,permanentBaseStats,renderTitleBaseStats,prepareHubReset,cancelHubReset,resetHubUpgrades,buyUpgrade,HUB_COST,HUB_MODULES,HUB_MAX_LEVEL,hubUpgradeCost,hubRefreshCost,hubAvailableModules,refreshHubOffers,hubEconomyMenu,scoreRunBonus,awardRunShards,recordStyleDamage,runResultMarkup,getRunStats:()=>runStats,completeMenu,deadMenu,offscreenArrowFrameAt,requestSelectMod,getRewardSelection:()=>rewardSelection,p,COMBO_ROTATION,dashMobilityStats,jumpMobilityStats,zArtState,pickComboMove,specialStats,upgradeDescription,MOD_META,MOD_UI_ORDER,MOD_ICON_INDEX,modIconMarkup,makeEnemy,updateEnemies,hurtEnemy,startAttack,enemyAttack,getAssassinMove,getMaskedMove,maskedFrame,anchorMaskedFrames,updateEliteAI,zOneShotFrame,zStride,currentZFrameIndex,getZMove,keyDown,keyUp,menuPad,menuConfirm,hubMenuNavigate,heldKeyboard,keys,getRiotGuardState,getRiotGuardFrame,offscreenEnemyTarget,offscreenEnemyTargets,groundY,modRank,rewardMenu,selectMod,updateHud,setModsExpanded,updateModToggle,pollPad,attackCheck,control,jump,dodge,heelLandingShockwave,updateComboCamera,followComboCamera,normalCameraTargetX,registerComboCameraHit,getCameraZoom:()=>cameraZoom,getStrikeCameraTime:()=>strikeCameraTime,getCounterCameraTime:()=>counterCameraTime,getRiposteCinematicTime:()=>riposteCinematicTime,getCameraX:()=>cameraX,triggerCounterCamera,counterCameraZoomGoal,counterCameraWorldAnchor,spawnRiposteAfterimages,getHeroAfterimages:()=>heroAfterimages,getCameraX:()=>cameraX,update,getGameTime:()=>time,getSlowMotion:()=>slowMotion,getSlowVictim:()=>parrySlowTarget,getHitStop:()=>hitStop,spawnWave,spawnNextEncounter,spawnIntruderSupport,intruderSupportCount,SQUAD_SPOTS,SQUAD_ROSTERS,STAGE_WIDTH,WAVE_GATES,encounterRoster,waveEnemyTotals,getSquad:()=>squadIndex,setSquad:v=>squadIndex=v,setCameraX:v=>cameraX=v,setWave:v=>wave=v,applyImpactFeedback,actorShakeOffset,playImpactSound,sound,vibrateImpact,gamepadRumble,activeRumbleActuator,gamepadHapticDiagnostics,updateRumbleDiagnostics,testGamepadRumble,stopGamepadRumble,footstepRumble,RUMBLE_PROFILES,setHapticTime:v=>time=v,getHapticPriorityUntil:()=>hapticPriorityUntil,parry,pauseToggle,setEnemies:v=>enemies=v,getEnemies:()=>enemies,getFx:()=>fx};titleMenu();`),world);
const g=world.__revenant,t=world.test;let checks=0;
// Crit-safe damage comparisons must override RNG inside the game's VM realm.
const withNormalHit=(fn)=>{
 const original=vm.runInContext('Math.random',world);
 world.__normalHitRng=()=>.999;
 vm.runInContext('Math.random=__normalHitRng',world);
 try{return fn();}
 finally{
  world.__normalHitRng=original;
  vm.runInContext('Math.random=__normalHitRng',world);
  delete world.__normalHitRng;
 }
};
const test=(name,fn)=>{fn();checks++;console.log('PASS',name)};
test('Rebel Hub shows entire actual base stat roster and requires a separate apply',()=>{
 const perma=g.getState().perma,backup={...perma};
 try{
  Object.assign(perma,{core:0,servo:0,reflex:0,shards:6});t.hubMenu();
  const m=node('menu').innerHTML;
  for(const id of ['hp','damage','parry','stamina','walk','run','dash','jump','jumpHeight','weapon'])
   assert(m.includes('data-stat="'+id+'"'),'full base stat display '+id);
  assert(m.includes('100 HP')&&m.includes('→ 120 HP'));
  assert(m.includes('data-action="hubApply"'));
  assert(m.includes('data-action="hubReset"')&&m.includes('data-action="start"')&&m.includes('data-action="title"'));
  assert.equal(t.selectHubModule('servo'),true);
  assert.equal(perma.shards,6,'selecting alone never spends currency');
  assert(node('menu').innerHTML.includes('→ +2'),'selected attack upgrade shows stat improvement');
  assert.equal(t.buyUpgrade('core'),false,'cannot directly buy an unselected stat');
  assert.equal(t.buyUpgrade(),true,'separate apply confirms selected upgrade');
  assert.equal(perma.shards,4);assert.equal(perma.servo,1);
  assert.equal(t.hubUpgradeCost(perma.servo),3,'buying next level costs more');
  assert(node('menu').innerHTML.includes('이 기기에 저장했습니다'));
  assert.equal(t.selectHubModule('reflex'),true);
  assert(node('menu').innerHTML.includes('0.375초'));
 }finally{Object.assign(perma,backup);t.hubMenu()}
});
test('choosing a Hub item shifts keyboard and gamepad highlight to Apply without purchasing',()=>{
 const perma=g.getState().perma,backup={...perma},menu=node('menu');
 const oldQuery=menu.querySelector,oldAll=menu.querySelectorAll;
 const item=(action)=>({disabled:false,dataset:action==='apply'?{action:'hubApply'}:{perma:action},
  focused:0,clicks:0,selected:false,
  classList:{toggle(k,on){if(k==='pad-selected')this.selected=on}},
  focus(){this.focused++},click(){this.clicks++}});
 const cards=[item('core'),item('servo'),item('reflex')],apply=item('apply');
 menu.querySelector=selector=>selector==='[data-action="hubApply"]'?apply:null;
 menu.querySelectorAll=()=>[...cards,apply];
 try{
  Object.assign(perma,{core:0,servo:0,reflex:0,shards:10,hubRefreshes:0});
  t.hubMenu();
  assert.equal(t.selectHubModule('servo'),true);
  assert.equal(t.menuPad.index,3,'controller selection must jump beyond three cards to Apply');
  assert.equal(apply.focused,1,'keyboard focus moves to Apply');
  assert.equal(apply.classList.selected,true,'highlight follows focus onto Apply');
  assert(cards.every(c=>!c.classList.selected),'old card focus is cleared');
  assert.equal(perma.shards,10,'selecting a card alone must never spend shards');
  t.menuPad.readyAt=0;
  assert.equal(t.menuConfirm(),true,'the next confirm activates focused Apply');
  assert.equal(apply.clicks,1);
  assert.equal(perma.shards,10,'focus move and mock confirmation cannot auto-buy');
  perma.shards=0;
  assert.equal(t.selectHubModule('core'),true);
  assert(node('menu').innerHTML.includes('data-action="hubApply" aria-disabled="true"'),
    'unaffordable Apply retains visible disabled state while remaining focusable');
  assert.equal(t.menuPad.index,3,'selection still moves to Apply without enough shards');
  assert.equal(t.buyUpgrade(),false,'an unavailable upgrade does not charge negative shards');
 }finally{
  menu.querySelector=oldQuery;menu.querySelectorAll=oldAll;
  Object.assign(perma,backup);t.hubMenu();
 }
});
test('HUB cyan focus frame appears only on hover, navigation or brief touch, never at rest',()=>{
 const cssStart=html.indexOf('<style id="hub-contextual-focus-v1">');
 assert(cssStart>=0,'interaction-specific HUB style is present');
 const css=html.slice(cssStart,html.indexOf('</style>',cssStart));
 assert(css.includes('.hub-module:not(.selected):not(.installed)')&&
        css.includes('border-image-source:var(--z-neon-card)!important'),
  'idle selectable cards retain the original low-intensity illustrated frame instead of a bright focus or plain box');
 assert(css.includes('.hub-module.pad-selected')&&!css.includes('.hub-module:focus-visible'),
  'sky-blue focus is driven by explicit navigation, not lingering Android touch focus');
 assert(css.includes('border-image-source:var(--z-frame-gold)!important')&&
  css.includes('border-image-source:var(--z-frame-green)!important'),
  'selected and installed cards retain stable gold and green frames independent of focus');
 assert(css.includes('@media(hover:hover) and (pointer:fine)')&&css.includes('.hub-module:hover'),
  'mouse pointer highlight is enabled only on hover-capable devices');
 assert(css.includes('.hub-module.touch-focus')&&css.includes('--z-frame-cyan'),
  'real touch selection uses the existing painted cyan bitmap frame');
 assert(html.includes("hubTouchPointerPending=hubPointerFocusPending&&e.pointerType==='touch'"),
  'touch uses actual pointer type and only when a card is actually pressed');
 assert(html.includes("if(hubPointerFocusPending&&e.target.dataset?.perma)"),
  'pointer focus does not create a sticky gamepad-style selection');
 assert(html.includes("setTimeout(()=>card.classList.remove('touch-focus'),540)"),
  'touch highlight disappears automatically after a short pulse');
 const perma=g.getState().perma,backup={...perma},menu=node('menu'),oldQuery=menu.querySelector;
 try{
  Object.assign(perma,{core:0,servo:0,reflex:0,hubRefreshes:0,shards:9});
  t.hubMenu();
  const touchCard=node('child');
  touchCard.classList.remove('touch-focus');
  menu.querySelector=selector=>selector==='[data-action="hubApply"]'?null:
   selector==='button[data-perma="servo"]'?touchCard:null;
  assert.equal(t.selectHubModule('servo',true),true);
  assert(touchCard.classList.contains('touch-focus'),'touch selection briefly marks the new card');
  assert.equal(perma.shards,9,'touch selection never auto-purchases');
  touchCard.classList.remove('touch-focus');
  assert.equal(t.selectHubModule('core'),true,'regular card preview still works');
  assert(!touchCard.classList.contains('touch-focus'),'normal selection has no sticky touch border');
 }finally{
  menu.querySelector=oldQuery;Object.assign(perma,backup);t.hubMenu();
 }
});
test('HUB card previews preserve held gamepad direction and permit the next intentional confirm',()=>{
 const menu=node('menu'),oldQuery=menu.querySelector,oldAll=menu.querySelectorAll;
 const perma=g.getState().perma,backup={...perma},oldPad=world.navigator.getGamepads;
 const cards=Array.from({length:3},()=>({disabled:false,classList:{toggle(){}},focus(){},scrollIntoView(){}}));
 const apply={disabled:false,classList:{toggle(){}},focus(){},scrollIntoView(){},click(){}};
 let axes=[1,0];
 world.navigator.getGamepads=()=>[{axes,buttons:Array.from({length:16},()=>({pressed:false})),connected:true}];
 menu.querySelector=(selector)=>selector==='[data-action="hubApply"]'?apply:null;
 menu.querySelectorAll=()=>[...cards,apply];
 try{
  Object.assign(perma,{core:0,servo:0,reflex:0,shards:20,hubRefreshes:0});
  t.hubMenu();
  t.menuPad.nav=2;t.menuPad.confirm=true;t.menuPad.armed=false;t.menuPad.readyAt=Date.now()+10000;
  assert.equal(t.selectHubModule('servo'),true);
  assert.equal(t.menuPad.nav,2,'active stick direction survives card DOM replacement');
  assert.equal(t.menuPad.confirm,true,'the held accept button remains recorded and cannot double-fire');
  assert.equal(t.menuPad.armed,true,'newly selected Apply is ready immediately, without rearming delay');
  assert(t.menuPad.readyAt<=Date.now(),'preview does not add an unnecessary 180ms input gate');
  assert.equal(t.menuPad.index,3,'after preview the gamepad points directly at Apply');
  t.pollPad();
  assert.equal(t.menuPad.index,3,'held stick must not spuriously navigate away from Apply after rerender');
  axes=[0,0];t.pollPad();
  axes=[1,0];t.pollPad();
  assert.equal(t.menuPad.index,3,'in isolated one-action test, moving right does not jump back to a card');
  axes=[0,0];t.pollPad();
  t.menuPad.nav=-1;t.menuPad.confirm=true;
  assert.equal(t.buyUpgrade('servo'),true);
  assert.equal(t.menuPad.nav,-1,'buy/re-render also preserves stick direction');
  assert.equal(t.menuPad.confirm,true,'buy/re-render preserves face-button edge gating');
  assert.equal(t.menuPad.index,3,'after buying focus remains on Apply for optional next upgrade');
 }finally{
  world.navigator.getGamepads=oldPad;menu.querySelector=oldQuery;menu.querySelectorAll=oldAll;
  Object.assign(perma,backup);t.menuPad.nav=0;t.menuPad.confirm=false;t.hubMenu();
 }
});
test('HUB controller and WASD navigate spatially between button rows, never a flat list',()=>{
 const menu=node('menu'),oldQuery=menu.querySelectorAll,oldBtnQuery=menu.querySelector,perma=g.getState().perma,backup={...perma};
 // Fake the real HUB layout: 3 large cards in a row, three buttons beneath
 // them, then three right-side buttons in the same bottom band.
 const box=(id,x,y,permaId,action)=>({
  id,disabled:false,dataset:permaId?{perma:permaId}:{action},
  classList:{selected:false,toggle(k,v){if(k==='pad-selected')this.selected=v},contains(k){return k==='pad-selected'&&this.selected}},
  focusCount:0,focus(){this.focusCount++},getBoundingClientRect(){return{left:x-55,top:y-18,width:110,height:36}}
 });
 const cards=[box('core',205,310,'core'),box('servo',640,310,'servo'),box('reflex',1070,310,'reflex')];
 const bottom=[
  box('apply',120,570,null,'hubApply'),
  box('refresh',265,570,null,'hubRefresh'),
  box('reset',400,570,null,'hubReset'),
  box('economy',880,570,null,'hubEconomy'),
  box('start',1090,570,null,'start'),
  box('title',1210,570,null,'title')];
 const buttons=[...cards,...bottom];
 try{
  Object.assign(perma,{core:0,servo:0,reflex:0,hubRefreshes:0,shards:30});
  t.hubMenu();
  menu.querySelectorAll=()=>buttons;
  menu.querySelector=selector=>selector==='[data-action="hubApply"]'?bottom[0]:null;
  t.menuPad.index=5; // reset button (third button along bottom)
  t.hubMenuNavigate(0,-1);
  assert.equal(t.menuPad.index,0,'UP from left-bottom reset selects the card above, not left refresh button');
  assert.equal(cards[0].focusCount,1);
  t.menuPad.index=6; // economy button underneath middle/right part
  t.hubMenuNavigate(0,-1);
  assert.equal(t.menuPad.index,2,'UP from economy goes to the rightmost card directly above');
  t.hubMenuNavigate(-1,0);
  assert.equal(t.menuPad.index,1,'LEFT moves to the adjacent card on the same row');
  t.hubMenuNavigate(1,0);
  assert.equal(t.menuPad.index,2,'RIGHT returns to the adjacent right card');
  t.hubMenuNavigate(0,1);
  assert.equal(t.menuPad.index,7,'DOWN goes to nearest bottom-row button below the right card');
  t.hubMenuNavigate(-1,0);
  assert.equal(t.menuPad.index,6,'LEFT on bottom row moves to neighboring bottom button');
  t.hubMenuNavigate(0,-1);
  assert.equal(t.menuPad.index,2,'UP returns to the rightmost card geometrically above the economy action');
  // WASD uses the same spatial model, while ArrowLeft remains confirmation.
  t.menuPad.index=4;t.heldKeyboard.clear();
  const key=k=>{t.keyDown({key:k,repeat:false,preventDefault(){}});t.keyUp({key:k})};
  key('w');
  assert.equal(t.menuPad.index,0,'W means up to item, not previous flat list button');
  key('d');assert.equal(t.menuPad.index,1,'D means right within card row');
  key('s');assert.equal(t.menuPad.index,5,'S means down to the closest bottom action');
  key('a');assert.equal(t.menuPad.index,4,'A means left within the action row');
 }finally{
  menu.querySelectorAll=oldQuery;menu.querySelector=oldBtnQuery;
  Object.assign(perma,backup);t.heldKeyboard.clear();t.hubMenu();
 }
});
test('Permanent save reset needs double confirmation and clears upgrades, refresh history and all shards',()=>{
 const perma=g.getState().perma,backup={...perma};
 try{
  Object.assign(perma,{core:2,servo:1,reflex:3,shards:1});t.hubMenu();
  assert.equal(t.resetHubUpgrades(),false);
  assert.equal(t.prepareHubReset(),true);
  assert(node('menu').innerHTML.includes('data-action="hubResetConfirm"'));
  assert.equal(t.buyUpgrade(),false,'cannot purchase during reset dialog');
  assert.equal(t.cancelHubReset(),true);
  assert.equal(t.resetHubUpgrades(),false,'cancel preserves progress');
  assert.equal(t.prepareHubReset(),true);
  assert.equal(t.resetHubUpgrades(),true);
  assert.equal(perma.core,0);assert.equal(perma.servo,0);assert.equal(perma.reflex,0);
  assert.equal(perma.shards,0,'save reset must zero the wallet instead of refunding invested shards');
  assert.equal(perma.hubRefreshes,0,'shop refresh history also resets');
  assert.equal(t.resetHubUpgrades(),false,'cannot refund twice');
 }finally{Object.assign(perma,backup);t.hubMenu()}
});
test('Title and Hub base stat preview reflect combat-effective permanent bonuses',()=>{
 const perma=g.getState().perma,backup={...perma};
 try{
  Object.assign(perma,{core:3,servo:4,reflex:2,shards:9});
  const stats=t.permanentBaseStats();
  assert.equal(stats.hp,160);assert.equal(stats.damage,8);
  assert.equal(stats.parry,.34+.035*2);
  assert.equal(stats.stamina,100);assert.equal(stats.walk,395);assert.equal(stats.run,690);
  assert.equal(stats.dash,616);assert.equal(stats.jump,700);assert.equal(stats.weapon,18);
  assert(t.renderTitleBaseStats().includes('HP 160'));
  assert(t.renderTitleBaseStats().includes('추가 공격 +8'));
  g.startRun();assert.equal(t.p.maxHp,160);assert.equal(t.p.damageBoost,8);
  t.parry();assert.equal(t.p.parryDuration,stats.parry);
 }finally{Object.assign(perma,backup);t.hubMenu()}
});
test('Versioned perma storage remains backward compatible across apply and reset',()=>{
 assert(html.includes("localStorage.getItem('revenant-perma-v1')"));
 assert(html.includes("localStorage.setItem('revenant-perma-v1',JSON.stringify(perma))"));
 assert(html.includes("else if(a==='hubApply')buyUpgrade()"));
 assert(html.includes("else if(a==='hubRefresh')refreshHubOffers()"));
 assert(html.includes("else if(a==='hubEconomy')hubEconomyMenu()"));
 assert(html.includes("else if(a==='hubResetConfirm')resetHubUpgrades()"));
 assert(html.includes("else if(b.dataset.perma){const touched=hubTouchPointerPending"),'HUB card clicks preserve the actual pointer type');
 const css=html.slice(html.indexOf('<style id="hub-base-stats-preview">'),html.indexOf('</style>',html.indexOf('<style id="hub-base-stats-preview">')));
 assert(css.includes('.hub-bottom')&&css.includes('.hub-action-row')&&css.includes('@container(max-width:610px)'));
});
test('reward economy table weighs kills, attack attempts, real hits and stylish combat damage',()=>{
 const stats={attacks:40,hits:30,style:{jump:500,dash:400,parry:200}};
 const done=t.scoreRunBonus(true,stats,12);
 assert.equal(done.base,1);assert.equal(done.killShards,3);
 assert.equal(done.attackShards,2);assert.equal(done.stylePoints,1310);
 assert.equal(done.styleShards,2);assert.equal(done.clearShards,3);
 assert.equal(done.total,11);assert.equal(done.grade,'A');
 const idle=t.scoreRunBonus(false,{attacks:3000,hits:0,style:{jump:0,dash:0,parry:0}},0);
 assert.equal(idle.total,1,'spamming attacks without hitting cannot farm shards');
 assert.equal(idle.attackShards,0);
 assert.equal(t.hubUpgradeCost(0),2);
 assert.deepEqual([0,1,2,3,4,5,6].map(t.hubUpgradeCost),[2,3,5,8,11,15,20]);
});
test('run shard settlement happens exactly once and includes style stats in result text',()=>{
 const perma=g.getState().perma,backup={...perma};
 try{
  g.startRun();perma.shards=5;
  const stats=t.getRunStats();stats.attacks=35;stats.hits=25;stats.style.jump=550;stats.style.dash=400;stats.style.parry=220;
  const reward=t.awardRunShards(false);assert(reward.total>1);
  assert.equal(perma.shards,5+reward.total);
  assert.equal(t.awardRunShards(false),null,'reward cannot be claimed twice');
  assert(t.runResultMarkup(reward).includes('스타일')&&t.runResultMarkup(reward).includes('패링'));
  g.startRun();assert.equal(t.getRunStats().attacks,0,'new run resets all attack counters');
  assert.equal(t.getRunStats().style.parry,0,'new run resets all stylish damage');
 }finally{Object.assign(perma,backup);t.hubMenu()}
});
test('HUB shop rotates three genuine module offers for shards and scales every rank price',()=>{
 const perma=g.getState().perma,backup={...perma};
 try{
  Object.assign(perma,{core:0,servo:0,reflex:0,armor:0,sprint:0,lift:0,hubRefreshes:0,shards:17});
  t.hubMenu();assert.equal(t.hubRefreshCost(),1);
  const starting=Array.from(t.hubAvailableModules(),x=>x.id);
  assert.deepEqual(starting,['core','servo','reflex']);
  assert(node('menu').innerHTML.includes('data-action="hubRefresh"'));
  assert(node('menu').innerHTML.includes('data-action="hubEconomy"'));
  assert.equal(t.refreshHubOffers(),true);assert.equal(perma.shards,16);
  const next=Array.from(t.hubAvailableModules(),x=>x.id);
  assert.deepEqual(next,['armor','sprint','lift']);
  assert.equal(t.selectHubModule('core'),false,'cannot select an off-offer module');
  assert.equal(t.selectHubModule('armor'),true);
  assert.equal(t.buyUpgrade(),true);assert.equal(perma.shards,14);assert.equal(perma.armor,1);
  assert.equal(t.hubUpgradeCost(perma.armor),3);
  assert.equal(t.hubRefreshCost(),2);
  assert.equal(t.refreshHubOffers(),true);assert.equal(perma.shards,12);
  assert.notDeepEqual(Array.from(t.hubAvailableModules(),x=>x.id),next);
  const after=t.permanentBaseStats({...perma,armor:2,sprint:2,lift:3});
  assert.equal(after.armor,8);assert.equal(after.run,740);
  assert(after.jumpHeight>t.permanentBaseStats({...perma,lift:0}).jumpHeight);
  assert.equal(t.hubEconomyMenu(),true);
  assert(node('menu').innerHTML.includes('보상')&&node('menu').innerHTML.includes('Lv.12'));
  assert.equal(t.buyUpgrade('armor'),false,'buying a module other than the selected offer is blocked');
 }finally{Object.assign(perma,backup);t.hubMenu()}
});
test('defeat and victory share a fully visible scroll-free 16:9 result panel',()=>{
 const css=html.slice(html.indexOf('<style id="result-16x9-no-scroll">'),html.indexOf('</style>',html.indexOf('<style id="result-16x9-no-scroll">')));
 assert(css.includes('#stageWrap #menu.result-dialog'),'dedicated high-priority result styles exist');
 assert(css.includes('overflow:hidden!important'),'result container must never scroll');
 assert(css.includes('grid-template-areas:"title payout" "stats stats" "actions actions" "tip tip"'),
  'result layout reserves the bottom rows for BOTH actions and control hint');
 assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'),
  'stat tiles fit in 2x2 without stacking to 4 tall rows');
 assert(css.includes('max-height:calc(100% - 16px)!important'),
  'result remains inside the 16:9 stage at all heights');
 assert(html.includes("gameState==='dead'||gameState==='complete'"),'both endings enable layout');
 assert(html.includes("!$('menu').classList.contains('result-dialog')"),'gamepad menu navigation never scrolls the result');
 for(const type of ['dead','complete']){
  g.startRun();t.setEnemies([]);t.p.x=3300;
  if(type==='dead')t.deadMenu();else t.completeMenu();
  assert(node('menu').classList.contains('result-dialog'),type+' sets layout mode');
  const menu=node('menu').innerHTML;
  assert(menu.includes('class="result-screen"')&&menu.includes('result-payout')&&menu.includes('result-actions'));
  assert(menu.includes('run-result-grid')&&menu.includes('result-tip'),'all details and controls remain present');
  assert(menu.includes('data-action="hub"')&&menu.includes('data-action="start"'),'both result buttons preserved');
  assert(!node('menu').classList.contains('reward-dialog'),'result mode does not inherit reward scrolling');
 }
 t.hubMenu();assert(!node('menu').classList.contains('result-dialog'),'opening Hub clears result-only CSS state');
});
test('hero remains fully opaque during invulnerability and does not crossfade on entrance',()=>{
 const paint=html.slice(html.indexOf('function paintZ(x,y,z,externalOpacity=1){'),
  html.indexOf('function syncZSprite(){'));
 assert(paint.includes('ctx.globalAlpha=externalOpacity;'),
  'hero bitmap is unaffected by invulnerability oscillation');
 assert(!paint.includes('p.inv>0&&Math.sin'),'removes 67% invincibility alpha flicker entirely');
 const entry=html.slice(html.indexOf('function drawHeroEntryCinematic(){'),
  html.indexOf('// Each confirmed combo impact'));
 assert(entry.includes('stagePoseOpacity>=.5')&&entry.includes('paintZ(actorScreenX,p.y,p.z,1)'),
  'intro swaps only at the matching pose and renders full-opacity hero');
 assert(!entry.includes('ctx.globalAlpha=1-stagePoseOpacity'),
  'intro image no longer fades to partially transparent outline');
});
test('opening battle spawns one small squad just beyond the screen',()=>{
 g.startRun();
 const live=t.getEnemies().filter(e=>!e.dead);
 assert(live.length>=3&&live.length<=6,'no initial crowd of 18+');
 assert(live.some(e=>e.type==='assassin'),'diverse enemy classes');
 assert(live.filter(e=>e.type!=='intruder').every(e=>e.x>1280),
 'ordinary enemies must approach from outside the visible screen');
 assert(live.every(e=>e.type!=='intruder'),
 'the special red-hood should arrive as mid-fight reinforcements instead of spawning at the beginning');
 assert.equal(t.getSquad(),1);
});
test('each troop grows and covers a broader offscreen area deeper into both waves',()=>{
 g.startRun();
 const counts1=t.SQUAD_SPOTS[1].map((_,i)=>t.encounterRoster(1,i).length);
 const counts2=t.SQUAD_SPOTS[2].map((_,i)=>t.encounterRoster(2,i).length);
 assert.equal(counts1[0],4,'opening troop has four normal foes; intruders arrive as support later');
 assert(counts1.at(-1)>=counts1[0]+5,'wave one ending troop is substantially larger');
 assert(counts2[0]>counts1[0],'wave two starts with more enemies than the opening');
 assert(counts2.at(-1)>counts2[0]+4,'wave two later encounters also grow');
 assert(counts1.every((n,i)=>i===0||n>=counts1[i-1]-1),'growth does not collapse between consecutive troops');
 const init=t.waveEnemyTotals();
 assert.equal(init.current,4);
 assert(init.total>counts1.reduce((a,b)=>a+b,0),'wave total includes the separately spawned intruder reinforcements');
 assert.equal(init.remaining,init.total);
 assert.equal(init.defeated,0);
 // Go to a later segment without keeping old enemies alive.
 t.setEnemies([]);t.setSquad(8);t.p.x=t.SQUAD_SPOTS[1][8];
 t.setCameraX(t.p.x-465);assert.equal(t.spawnNextEncounter(),true);
 const troop=t.getEnemies().filter(e=>!e.dead);
 assert.equal(troop.length,counts1[8]);
 const spread=Math.max(...troop.map(e=>e.x))-Math.min(...troop.map(e=>e.x));
 assert(spread>1800,'later troops should arrive from a genuinely wider street distribution');
 assert(troop.some(e=>e.x<t.getCameraX())&&troop.some(e=>e.x>t.getCameraX()+1280),'enemy waves approach from both directions');
 assert(new Set(troop.map(e=>e.y)).size>=5,'additional enemies must occupy varied playable ground lanes');
});
test('new HUD distinguishes live squad from unspawned remaining wave enemies',()=>{
 g.startRun();t.setEnemies(t.getEnemies());t.updateHud();
 const start=t.waveEnemyTotals();
 assert.equal(start.current,4);assert(start.future>start.current);
 assert(node('enemyCount').textContent.includes('현재 4명'),'current onscreen squad is explicit');
 assert(node('enemyCount').textContent.includes('턴 잔여 '+start.remaining+'명'),'future squads are included in total');
 assert(node('enemyStatus').textContent.includes('무리 1/11'),'enemy squad index is visible');
 assert.equal(node('enemyProgressFill').style.width,'0%');
 const killed=t.getEnemies()[0];killed.dead=true;t.updateHud();
 const after=t.waveEnemyTotals();
 assert.equal(after.current,3);
 assert.equal(after.remaining,start.remaining-1);
 assert.equal(after.defeated,1);
 assert(node('enemyCount').textContent.includes('현재 3명'));
 assert(node('enemyProgressFill').style.width!=='0%','defeat fills progress meter');
 t.setEnemies([]);t.updateHud();
 assert(node('enemyCount').textContent.includes('다음 무리 대기'),'zero active enemies must not imply wave is over');
 assert(node('enemyStatus').textContent.includes('오른쪽으로 전진'));
 t.spawnWave();t.updateHud();
 assert.equal(t.waveEnemyTotals().current,0,'new wave has not yet spawned its first troop');
 assert(node('enemyCount').textContent.includes('첫 무리 출현 전'),'new wave must not claim a nonexistent squad was defeated');
 assert(node('enemyStatus').textContent.includes('다음 적 무리 지점으로 전진'));
 assert(html.includes('role="progressbar"')&&html.includes('id="enemyProgressFill"'),'progress bar accessible to mobile and desktop');
});
test('tactical AI briefly retreats, flanks, and enters a telegraphed berserk rush',()=>{
 g.startRun();t.setEnemies([]);t.p.x=1800;t.p.y=580;
 const foe=t.makeEnemy('raider',t.p.x+180,t.p.y,1);
 foe.encountered=true;foe.cooldown=5;foe.chargeCooldown=5;
 foe.tactic='retreat';foe.tacticTime=.52;foe.retreatCooldown=4;foe.hp=foe.maxHp*.45;
 t.setEnemies([foe]);const origin=foe.x;
 for(let n=0;n<12;n++)t.updateEnemies(1/60);
 assert(foe.x>origin+35,'short withdrawal creates visible space');
 assert(foe.x-t.p.x<440,'retreat cannot run forever offscreen');
 foe.tactic='feint';foe.tacticTime=.70;foe.cooldown=5;foe.chargeCooldown=5;
 // Start outside the desired baiting ring: otherwise a random strafe sign
 // may land exactly on its goal and make this a flaky no-movement test.
 foe.x=t.p.x+355;foe.y=t.p.y;foe.strafe=1;
 const y=foe.y,x=foe.x;
 for(let n=0;n<20;n++)t.updateEnemies(1/60);
 assert(Math.abs(foe.y-y)>4||Math.abs(foe.x-x)>8,'feint visibly repositions instead of standing still');
 foe.x=t.p.x+280;foe.y=t.p.y;foe.tactic='berserk';foe.tacticTime=.5;
 foe.chargeCooldown=0;foe.berserkCooldown=4;foe.cooldown=5;
 t.updateEnemies(1/60);
 assert(foe.chargePrep>0,'berserk starts with a visible attack tell');
 assert(t.getFx().some(f=>f.color==='red'),'berserk emits a readable red warning effect');
 for(let n=0;n<17;n++)t.updateEnemies(1/60);
 assert(foe.chargeTime>0||foe.windup>0,'berserk warning converts into a fast rush or strike');
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
 assert.equal(elites[0].maxPoise,460);
});
test('Iron Mask elite uses eight original dark 4x2 painted animation sheets and greater toughness',()=>{
 const pathRoot=path.join(__dirname,'../assets/ironmask-elite');
 const variants=['idle','run','attack','hit','menace','death','charge','special'];
 const files=variants.map(key=>fs.readFileSync(path.join(pathRoot,key+'.webp')));
 for(let i=0;i<files.length;i++){
  assert.equal(files[i].toString('ascii',0,4),'RIFF',variants[i]+' is an actual bitmap');
  assert.equal(files[i].toString('ascii',8,12),'WEBP',variants[i]+' decodes as WebP');
  assert(files[i].length>85000,variants[i]+' full eight-frame sheet must not be a placeholder');
 }
 const e=t.makeEnemy('elite',t.p.x+240,t.p.y,0);
 assert.equal(e.maxHp,1120,'Elite has >2x the old 530 HP');
 assert.equal(e.maxPoise,460,'Elite stagger threshold is significantly higher');
 assert(e.damage>=26,'elite has menacing heavyweight attacks');
 const src=fs.readFileSync(path.join(__dirname,'../assets/elite-ironmask.js'),'utf8');
 assert(src.includes("const KEYS=['idle','run','attack','hit','menace','death','charge','special']"));
 assert(src.includes("ctx.drawImage(source.image,(idx%4)*CW"),'renderer actually draws the new 64 painted frames');
 assert(!src.includes('ctx.putImageData(pix'),'old turquoise recolor must be removed');
 assert(src.includes("ctx.scale(e.face>=0?1:-1,1)"),'right-facing source artwork must match direction');
 assert(html.includes("...window.RZElite.KEYS.map(k=>"),'all eight motions preload before gameplay');
 vm.runInContext(src,world);
 const worldElite=world.RZElite;
 assert.equal(worldElite.move({...e,eliteTell:.7,eliteRush:0,dead:false}),'charge');
 assert.equal(worldElite.move({...e,eliteTell:0,eliteRush:.3,dead:false}),'special');
 assert.equal(worldElite.move({...e,eliteTell:0,eliteRush:0,eliteAttack:false,eliteMenace:.4,dead:false}),'menace');
 assert.equal(worldElite.move({...e,dead:true,z:0}),'death');
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
 const enemy={...e,dead:false,z:0,reactionTime:0,proneTime:0,riseTime:0,eliteTell:.5,eliteRush:0};
 // Physical knockback takes precedence over charge/idle visuals.
 assert.equal(world.RZElite.move(enemy,()=> 'idle'),'hit');
 enemy.knockVX=0;enemy.pendingFall=false;enemy.z=0;
 assert.equal(world.RZElite.move(enemy,()=> 'idle'),'charge');
 enemy.eliteTell=0;enemy.dead=true;enemy.z=20;
 assert.equal(world.RZElite.move(enemy,()=> 'idle'),'death','death art wins over airborne recoil');
});
test('Frame Lab displays the eight original Iron Mask painted animations, not recolored assassin art',()=>{
 const lab=fs.readFileSync(path.join(__dirname,'../z-frame-lab.html'),'utf8');
 const script=lab.slice(lab.lastIndexOf('<script>')+8,lab.lastIndexOf('</script>'));
 assert(script,'Frame Lab inline script missing');
 new vm.Script(script);
 assert(lab.includes('variant:\'elite\''),'elite variants not registered');
 assert(lab.includes("RZElite.KEYS.forEach(key=>list.push"),'Frame Lab must include the eight real new Iron Mask motions');
 assert(lab.includes("sheet_url:'./assets/ironmask-elite/'+key+'.webp'"),'Frame Lab must use same sprite art as game');
 assert(!lab.includes('RZElite.colored(c)'),'no legacy colored assassin sprites should appear');
 assert(lab.includes("cacheKey=a.variant==='elite'"),'elite cache must be isolated');
});

test('animation loops advance slower than Alpha 1.13 at the same travel distance',()=>{
 g.startRun();
 t.p.gaitDistance=25;t.p.motionTime=0;
 assert.equal(t.currentZFrameIndex('walk'),0,'both modes now share the current run motion and its 32px stride');
 assert.equal(t.currentZFrameIndex('run'),0,'same travel distance has the same full-body pose');
 t.p.gaitDistance=40;
 assert.equal(t.currentZFrameIndex('walk'),1,'walking takes the full former running step');
 assert.equal(t.currentZFrameIndex('run'),1,'running uses exactly the same eight-frame running cycle');
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
 assert(html.includes('if(Z_HOODIE_HERO)frames=prepareTransparentHeroCells(im)'),'alternate hoodie art must preserve transparency');
 assert(lab.includes('preclearedHeroFrames'),'alternate hoodie must remain available for comparison');
 t.p.getupTimer=.64;t.p.recoveryDuration=.64;
 assert.equal(t.currentZFrameIndex('getup'),0,'original hero get-up must begin on original first frame');
 t.p.getupTimer=0;
 assert.equal(t.currentZFrameIndex('getup'),7,'original hero get-up must finish on original last frame');
});


test('original Z idle retains all eight complete hairstyles in transparent prematted game art',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../assets/project-z-hero/z-idle-hair-safe.webp'));
 assert(file.length>85000,'eight high quality hair-safe sprites must load from the local repository');
 assert.equal(file.subarray(0,4).toString('ascii'),'RIFF','not a placeholder or CSS vector');
 assert.equal(file.subarray(8,12).toString('ascii'),'WEBP','use original painted WebP sprites');
 assert(html.includes("if(!Z_HOODIE_HERO)Z_REMOTE_ATLAS.idle='./assets/project-z-hero/z-idle-hair-safe.webp'"),
  'original protagonist idle source must use approved local hair-safe atlas');
 assert(html.includes('function preparePremattedIdleCells(im){'),
  'dedicated non-destructive 8-frame idle loading path required');
 assert(html.includes('if(cw!==240||ch!==254)'),
  'fixed 4x2 square-grid with common ground alignment is required');
 assert(html.includes("else if(key==='idle'&&url==='./assets/project-z-hero/z-idle-hair-safe.webp')frames=preparePremattedIdleCells(im)"),
  'the original hair must bypass green-screen connected-component removal');
 assert(html.includes('else frames=prepareZCells(im,localSidekickFootFix?'),
  'other original moves must retain their existing sprite pipeline');
});
test('all 21 combat upgrades, NEURO and 3 Hub modules have distinct square bitmap-icon cells',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../assets/ui/upgrade-icons-v4.webp'));
 assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF','sprite is real WebP bitmap');
 assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP');
 assert(bytes.length>100000&&bytes.length<500000,'complete high resolution 25-cell bitmap exists at the new atlas path');
 assert.equal(t.MOD_UI_ORDER.length,21,'all 21 stackable upgrades are supported');
 const ids=[...t.MOD_UI_ORDER,'neuro','hub-core','hub-servo','hub-reflex'];
 assert.equal(new Set(ids).size,25,'all ability identifiers must be unique');
 const cells=ids.map(id=>{
  assert(t.MOD_META[id]||id==='neuro'||id.startsWith('hub-'),'unknown upgrade '+id);
  assert(t.modIconMarkup(id).includes('upgrade-art'),'bitmap is selected for '+id);
  return t.modIconMarkup(id).match(/background-position:([^"]+)/)?.[1];
 });
 assert.equal(new Set(cells).size,25,'no two upgrades may display the same atlas cell');
 assert(html.includes("background-image:var(--upgrade-preloaded-url,url('./assets/ui/upgrade-icons-v4.webp'))"),
  'HUD and power-up cards use the decoded bitmap cache, including failed-download retry');
 assert(html.includes("<span class=\"sym\">${modIconMarkup(id)}"),
  'reward cards show unique imagery instead of repeated Unicode symbols');
 assert(html.includes("modIconMarkup('neuro')"),'hybrid element also has unique picture');
 assert(html.includes("const src=upgradeIconsImage,columns=5,rows=5,iconSize=96;"),
  'all 25 icons are normalized into equal 96px square frames');
 assert(html.includes("art:'hub-core'")&&html.includes("art:'hub-servo'")&&html.includes("art:'hub-reflex'"),
  'permanent upgrades use independent art rather than reused battle icons');
 assert(html.includes('.choice-grid .upgrade-btn .sym{display:flex!important'),
  'portrait mobile mode must not hide upgrade pictures');
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
test('walking takes the old run 395px speed and exactly the former running eight-frame atlas',()=>{
 const main=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(main.includes('Z_REMOTE_ATLAS.walk=Z_REMOTE_ATLAS.run'),'both locomotion modes share the exact running spritesheet');
 assert.equal(t.zArtState.walk,t.zArtState.run,'decoded 8-frame atlas must be shared, with no duplicated resource load');
 g.startRun();t.setEnemies([]);t.keys.clear();t.p.x=2600;t.p.y=570;
 const start=t.p.x;t.keys.add('d');
 for(let i=0;i<60;i++)t.control(1/60,{dx:0,dy:0});
 t.keys.delete('d');
 const dx=t.p.x-start;
 assert(Math.abs(dx-395)<3,'WASD walk must move at the previous 395px/sec run speed; actual '+dx);
 assert.equal(t.p.running,false,'keyboard movement still selects walking speed');
 assert.equal(t.getZMove(),'walk','normal walking retains its own gait state for footsteps');
});
test('full-tilt analog run shares walk artwork but advances substantially farther',()=>{
 g.startRun();t.setEnemies([]);t.keys.clear();t.p.x=2600;t.p.y=570;
 const x=t.p.x;
 for(let i=0;i<60;i++)t.control(1/60,{dx:1,dy:0});
 const dx=t.p.x-x;
 assert.equal(t.p.running,true,'full tilt must set run mode');
 assert.equal(t.getZMove(),'run','running state stays distinct from walking state');
 assert(Math.abs(dx-690)<3,'full-tilt run must travel about 690px/sec; actual '+dx);
 assert(dx>395*1.7,'run covers significantly more world distance than walking');
 assert.equal(t.zArtState.walk,t.zArtState.run,'full-speed run and walk render same eight poses');
 t.p.gaitDistance=120;
 assert.equal(t.currentZFrameIndex('walk'),t.currentZFrameIndex('run'),'shared atlas remains synchronized per distance');
});
test('unupgraded dash is much shorter than prior near-teleport, with eight complete frames and stage safety',()=>{
 g.startRun();t.setEnemies([]);t.keys.clear();t.p.x=3000;t.p.y=570;t.p.facing=1;t.p.moveDX=0;t.p.stamina=100;
 const origin=t.p.x;t.dodge();
 assert(t.p.dodge>.27&&t.p.dodge<.30,'basic dash duration is now 0.28 seconds');
 const seen=new Set([t.currentZFrameIndex('dash')]);
 for(let i=0;i<18;i++){
  t.control(1/60,{dx:0,dy:0});
  if(t.p.dodge>0)seen.add(t.currentZFrameIndex('dash'));
 }
 const dist=t.p.x-origin;
 assert(dist>590&&dist<660,'unupgraded dash should travel near 616px rather than 1080px; '+dist);
 assert(seen.size>=7,'fast dash retains nearly every visible eight-frame dash pose');
 assert(t.p.x<=32000-64,'dash must remain within stage bounds');
 g.startRun();t.setEnemies([]);t.keys.clear();t.p.x=31950;t.p.facing=1;t.p.moveDX=0;t.p.stamina=100;
 t.dodge();for(let i=0;i<18;i++)t.control(1/60,{dx:0,dy:0});
 assert.equal(t.p.x,32000-64,'rightward dash clamps at final world edge');
 g.startRun();t.setEnemies([]);t.keys.clear();t.p.x=200;t.p.facing=-1;t.p.moveDX=0;t.p.stamina=100;
 t.dodge();for(let i=0;i<18;i++)t.control(1/60,{dx:0,dy:0});
 assert.equal(t.p.x,64,'leftward dash clamps at start of world');
});
test('Dash Extender and Dash Overdrive stack independently, each up to six levels, and share one travel formula',()=>{
 const base=t.dashMobilityStats(0,0);
 assert.equal(base.distance,616);
 const values=[];
 for(const rank of [1,3,6]){
  g.startRun();t.setEnemies([]);t.p.mods=[];t.p.stamina=100;
  for(let i=0;i<rank;i++){
   t.rewardMenu('mid');t.selectMod('dashrange');
   t.rewardMenu('mid');t.selectMod('dashspeed');
  }
  assert.equal(t.modRank('dashrange'),rank,'Extender must retain every chosen stack');
  assert.equal(t.modRank('dashspeed'),rank,'Overdrive must retain every chosen stack');
  const r=t.dashMobilityStats(),onlyRange=t.dashMobilityStats(rank,0),onlySpeed=t.dashMobilityStats(0,rank);
  const attack=t.specialStats('dashspeed');
  assert.equal(r.duration,onlyRange.duration,'Extender owns duration');
  assert.equal(r.speed,onlySpeed.speed,'Overdrive owns speed');
  assert.equal(r.distance,Math.round(r.duration*r.speed),'true combined dash distance');
  assert(r.distance>onlyRange.distance&&r.distance>onlySpeed.distance,
   'both upgrades must have cumulative movement benefit');
  assert.equal(attack.damage,t.specialStats('dashspeed',rank).damage,
   'Extender must not double-apply Overdrive damage multiplier');
  assert.equal(attack.range,t.specialStats('dashspeed',rank).range);
  assert.equal(attack.push,t.specialStats('dashspeed',rank).push);
  values.push(r.distance);
  if(rank===6){
   const before=t.p.mods.length;
   t.selectMod('dashrange');t.selectMod('dashspeed');
   assert.equal(t.p.mods.length,before,'fully leveled cards cannot consume another rank');
   assert.equal(t.modRank('dashrange'),6);
   assert.equal(t.modRank('dashspeed'),6);
  }
 }
 assert(values[0]<values[1]&&values[1]<values[2],'every combined rank improves actual distance');
 assert.deepEqual(values,[Math.round(.31*2508),Math.round(.37*3124),Math.round(.46*4048)]);
});
test('dash reach and dash speed are two independent six-level upgrade items',()=>{
 const init=t.dashMobilityStats(0,0),fast=t.dashMobilityStats(0,6),long=t.dashMobilityStats(6,0),both=t.dashMobilityStats(6,6);
 assert.equal(init.speed,2200);assert.equal(init.duration,.28);assert.equal(init.distance,616);
 assert.equal(fast.duration,init.duration,'speed upgrade does not lengthen animation duration');
 assert(fast.speed>init.speed*1.8,'dash speed grows substantially across six stacks');
 assert.equal(long.speed,init.speed,'dash reach upgrade does not modify speed');
 assert(long.duration>init.duration+.17,'dash reach upgrade extends the active dash');
 assert(both.distance>1800,'fully upgraded dash significantly exceeds previous 1080px');
 for(const id of ['dashrange','dashspeed']){
  assert(t.MOD_META[id],'mobility item appears in upgrade pool');
  for(let level=0;level<6;level++){
   assert(t.upgradeDescription(id,level).includes('→'),'show before/after upgrade effect');
   const a=id==='dashrange'?t.dashMobilityStats(level,0):t.dashMobilityStats(0,level);
   const b=id==='dashrange'?t.dashMobilityStats(level+1,0):t.dashMobilityStats(0,level+1);
   assert(b.distance>a.distance,'dash mobility level must increase actual travel');
  }
 }
 const sample=(ranks)=>{
  g.startRun();t.setEnemies([]);t.keys.clear();t.p.x=3100;t.p.y=570;t.p.facing=1;t.p.moveDX=0;
  t.p.mods=Array(ranks.range).fill('dashrange').concat(Array(ranks.speed).fill('dashspeed'));
  const begin=t.p.x;t.dodge(),duration=t.p.dodge;
  const poses=new Set([t.currentZFrameIndex('dash')]);
  for(let i=0;i<45;i++){t.control(1/60,{dx:0,dy:0});if(t.p.dodge>0)poses.add(t.currentZFrameIndex('dash'))}
  return {distance:t.p.x-begin,duration,poses:poses.size};
 };
 const zero=sample({range:0,speed:0}),extent=sample({range:4,speed:0}),velocity=sample({range:0,speed:4}),bothReal=sample({range:4,speed:4});
 assert(extent.duration>zero.duration,'dash distance module extends real dash duration');
 assert(extent.distance>zero.distance*1.35,'dash range increases measured travel');
 assert(velocity.distance>zero.distance*1.45,'dash speed increases measured travel');
 assert(bothReal.distance>extent.distance&&bothReal.distance>velocity.distance,'upgrades combine multiplicatively');
 assert(bothReal.poses>=7,'expanded dash still displays nearly all authored eight poses');
});
test('jump height and airborne travel speed upgrade independently across six levels',()=>{
 const start=t.jumpMobilityStats(0,0),high=t.jumpMobilityStats(6,0),fast=t.jumpMobilityStats(0,6);
 assert.equal(start.impulse,670);assert.equal(start.moveSpeed,700);
 assert(high.height>start.height*1.9,'jump height gains strong tiered vertical lift');
 assert.equal(high.moveSpeed,start.moveSpeed,'height upgrade does not magically speed air movement');
 assert(fast.moveSpeed>start.moveSpeed*1.8,'air speed upgrade strongly increases travel');
 assert.equal(fast.height,start.height,'speed upgrade does not directly increase peak height');
 for(const id of ['jumpheight','jumpspeed']){
  assert(t.MOD_META[id]);
  for(let level=0;level<6;level++){
   assert(t.upgradeDescription(id,level).includes('→'));
   const a=id==='jumpheight'?t.jumpMobilityStats(level,0):t.jumpMobilityStats(0,level);
   const b=id==='jumpheight'?t.jumpMobilityStats(level+1,0):t.jumpMobilityStats(0,level+1);
   assert(b[id==='jumpheight'?'height':'moveSpeed']>a[id==='jumpheight'?'height':'moveSpeed']);
  }
 }
 const sample=(height,speed)=>{
  g.startRun();t.setEnemies([]);t.keys.clear();t.p.x=2000;t.p.y=570;
  t.p.mods=Array(height).fill('jumpheight').concat(Array(speed).fill('jumpspeed'));
  t.keys.add('d');t.jump();t.keys.delete('d');
  const launch=t.p.vz,x=t.p.x;let peak=0;
  for(let i=0;i<100;i++){t.control(1/60,{dx:0,dy:0});peak=Math.max(peak,t.p.z)}
  return {launch,peak,distance:t.p.x-x};
 };
 const base=sample(0,0),highReal=sample(3,0),fastReal=sample(0,3);
 assert(base.peak>130&&base.peak<180,'base jump is intentionally shorter than former 760 impulse');
 assert(highReal.peak>base.peak+60,'height item actually boosts world-space peak height');
 assert(fastReal.distance>base.distance*1.35,'speed item boosts actual airborne travel');
 assert(Math.abs(fastReal.peak-base.peak)<3,'speed item does not change jump apex');
});
test('combat upgrade choices show four distinct cards without stale three-card assumptions',()=>{
 for(let i=0;i<12;i++){
  g.startRun();t.rewardMenu('mid');
  const markup=node('menu').innerHTML;
  const picks=[...markup.matchAll(/class="upgrade-btn" data-mod="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(picks.length,4,'upgrade UI presents four selectable cards');
  assert.equal(new Set(picks).size,4,'upgrade card choices never repeat in the same selection');
 }
});
test('new attack press immediately cancels the prior eight-frame ground pose without a render gap',()=>{
 g.startRun();t.setEnemies([]);t.keys.clear();
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:true};
 t.p.x=1100;t.p.y=570;t.p.facing=1;t.p.stamina=100;
 t.startAttack();assert.equal(t.p.moveName,'jab');
 const firstDuration=t.p.attackDuration,firstMove=t.p.moveName;
 assert(firstDuration>=.23&&firstDuration<.26,'jab animation accelerates to roughly .25 seconds');
 assert.equal(t.currentZFrameIndex(firstMove),0);
 // No frame, timeout or control update is allowed between these two presses.
 t.startAttack();
 assert.notEqual(t.p.moveName,firstMove,'new press must select another loaded sprite immediately');
 assert.equal(t.p.attackQueued,false,'regular attacks are never delayed in the old input buffer');
 assert.equal(t.p.comboMoveCount,2);
 assert.equal(t.currentZFrameIndex(t.p.moveName),0,'new eight-frame animation starts at pose zero instantly');
 assert.equal(t.p.attack,t.p.attackDuration,'new animation timer must start now');
 assert(t.p.attackDuration<=.48,'later attacks also animate faster');
});
test('interrupting after the contact beat preserves exactly one hit, early repeated taps do not invent hits',()=>{
 g.startRun();t.keys.clear();t.p.x=1700;t.p.y=570;t.p.facing=1;t.p.stamina=100;
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:true};
 const enemy=t.makeEnemy('raider',t.p.x+92,t.p.y,0);
 enemy.hp=enemy.maxHp=5000;enemy.stun=5;t.setEnemies([enemy]);
 t.startAttack();const before=enemy.hp;
 t.p.attack=t.p.attackDuration*.83;
 t.startAttack();assert(enemy.hp<before,'outgoing strike keeps its impact at the cancel window');
 assert(t.p.hitDone===false,'incoming strike still gets its own independent hit');
 const after=enemy.hp;
 t.startAttack();assert.equal(enemy.hp,after,'a zero-frame next press cannot conjure an unrendered hit');
 assert.equal(t.p.comboMoveCount,3,'two subsequent presses produce three different visible ground attacks');
 assert.notEqual(t.p.recentMoves[1],t.p.recentMoves[2],'quick cancels still exhaust diverse artwork');
});
test('holding attack automatically chains early and never flashes idle between moves',()=>{
 g.startRun();t.setEnemies([]);t.keys.clear();
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:true};
 t.p.x=1600;t.p.y=570;t.p.stamina=100;
 t.startAttack();t.keys.add('j');
 let swapped=false,elapsed=0,previous=t.p.moveName;
 for(let tick=0;tick<65;tick++){
  t.control(1/60,{dx:0,dy:0});elapsed+=1/60;
  assert(t.getZMove()!=='idle','held combo should always remain in an attack pose');
  if(t.p.moveName!==previous){swapped=true;break}
 }
 t.keys.delete('j');
 assert(swapped,'held attack automatically chains to the next distinct move');
 assert(elapsed<t.p.attackDuration+.03||elapsed<.25,'holding attack does not wait through a long recovery');
 assert.equal(t.p.attackQueued,false);
});
test('a fresh attack press does not interrupt committed dash-smash or airborne heel slam',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);
 t.p.x=2700;t.p.y=570;t.p.facing=1;t.p.moveDX=0;t.p.stamina=100;
 t.dodge();t.startAttack();
 assert.equal(t.p.dashSmash,true);
 const dashRemaining=t.p.attack,move=t.p.moveName;
 t.startAttack();
 assert.equal(t.p.dashSmash,true);assert.equal(t.p.moveName,move);
 assert.equal(t.p.attack,dashRemaining,'dash finisher is protected from instant cancel');
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2700;
 t.jump();for(let i=0;i<9;i++)t.control(1/60,{dx:0,dy:0});
 t.startAttack();assert.equal(t.p.airAttack,true);
 const phase=t.p.airKickPhase,remaining=t.p.attack;
 t.startAttack();
 assert.equal(t.p.airKickPhase,phase);
 assert.equal(t.p.attack,remaining,'airborne heel slam is committed, not canceled');
});
test('faster, longer basic forward rush respects enemy footprints',()=>{
 g.startRun();t.setEnemies([]);
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:move==='jab'};
 t.p.x=1100;t.p.y=570;t.p.facing=1;t.p.stamina=100;
 t.startAttack();const total=t.p.attackDriveTotal,start=t.p.x;
 assert(total>=65,'neutral punch gains noticeably more forward lunge');
 for(let i=0;i<6;i++)t.control(1/60,{dx:0,dy:0});
 assert(t.p.x-start>=60,'new forward rush should spend most of its longer lunge within 0.10 seconds');
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
test('basic hit shoves the enemy and its sprite immediately while the hero keeps pressing forward',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);
 for(const move of t.COMBO_ROTATION)t.zArtState[move]={ready:move==='jab'};
 t.p.x=1650;t.p.y=570;t.p.facing=1;t.p.stamina=100;t.p.moveDX=0;t.p.moveDY=0;
 const foe=t.makeEnemy('raider',t.p.x+132,t.p.y,0);
 foe.hp=foe.maxHp=2000;foe.stun=3;t.setEnemies([foe]);
 const foeStart=foe.x,heroStart=t.p.x;
 t.startAttack();const budget=t.p.attackDriveTotal;
 for(let i=0;i<14&&!t.p.hitDone;i++)t.control(1/60,{dx:0,dy:0});
 assert(t.p.hitDone,'first ground jab contacts the target during the forward surge');
 assert(foe.hp<2000,'target takes damage at the contact beat');
 assert(foe.x>foeStart+24,'victim footprint moves back in the very same contact tick');
 assert.equal(foe.renderX,foe.x,'victim bitmap has no delayed post-impact visual position');
 assert(foe.knockVX>budget*4,'knockback follows the stronger forward drive');
 const oldVictim=foe.x,oldHero=t.p.x;
 t.control(1/60,{dx:0,dy:0});t.updateEnemies(1/60);
 assert(foe.x>oldVictim,'enemy continues moving backward after instant recoil');
 assert(t.p.x>=oldHero,'hero continues forward to sustain the combo pressure');
 assert(foe.x-t.p.x>=95,'hero and victim do not overlap');
 assert(t.p.x>heroStart,'hero visibly pursues the target');
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
test('guard reaches its full brace then recovers while the active parry window remains open',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);
 t.p.parry=0;t.p.stun=0;t.p.stamina=100;t.parry();
 const activeWindow=t.p.parryDuration;
 assert(activeWindow>=.34&&activeWindow<.35,'original active counter window is preserved');
 assert.equal(t.currentZFrameIndex('guard'),0,'guard begins on its first actual atlas frame');
 // control() only reads movement; the main update solver advances the timer.
 // Exercise the frame curve directly to avoid a false regression.
 t.p.parryAnimAge=.13;
 assert(t.currentZFrameIndex('guard')>=4,'defensive sprite advances rapidly within 100ms');
 t.p.parryAnimAge=.17;
 assert.equal(t.currentZFrameIndex('guard'),7,'full guard brace appears at midpoint of the parry');
 t.p.parryAnimAge=.23;
 assert.equal(t.currentZFrameIndex('guard'),6,'painted recovery follows the held defensive pose');
 assert(t.p.parry>0,'parry collision window remains open during visual recovery');
 const last=t.currentZFrameIndex('guard');
 t.p.parry=Math.max(t.p.parry,.30);
 assert.equal(t.currentZFrameIndex('guard'),last,'success hold must not rewind the animation');
});
test('four smaller bitmap arcade controls retain large touch surfaces and pressed sprite art',()=>{
 const atlas=fs.readFileSync(path.join(__dirname,'../assets/ui/arcade-action-buttons-v1.webp'));
 assert.equal(atlas.toString('ascii',0,4),'RIFF','arcade art is real transparent WebP bitmap');
 assert.equal(atlas.toString('ascii',8,12),'WEBP');
 assert.equal(atlas.toString('ascii',12,16),'VP8X');
 assert.equal(atlas.readUIntLE(24,3)+1,1024,'four 256px wide raised/pressed sprite columns');
 assert.equal(atlas.readUIntLE(27,3)+1,512,'two 256px high button states');
 const css=html.slice(html.indexOf('<style id="arcade-physical-controls">'),
  html.indexOf('</style>',html.indexOf('<style id="arcade-physical-controls">')));
 assert(css.includes("background-image:var(--arcade-control-url,url('./assets/ui/arcade-action-buttons-v1.webp'))"));
 assert(css.includes('background-size:400% 200%'));
 assert(css.includes('background-position:var(--arcade-x) 100%!important;'),
 'press should switch to the real recessed button sprite');
 assert(css.includes('translate3d(0,4px,0) scale(.965)'),'press should physically sink');
 assert(css.includes('transition:transform .02s linear,filter .02s linear;'),
 'physical button depression responds within 20ms of pointerdown');
 assert(css.includes('transition:transform .05s ease-out,filter .05s ease-out;'),
 'released button rebounds within 50ms');
 assert(css.includes('--face-btn:clamp(48px,12.4cqw,64px)'),
 'face buttons shrink modestly with at least a 48px tap target');
 assert(css.includes('--face-btn:clamp(48px,10.5vh,56px)'),
 'landscape also uses a reduced physical footprint');
 assert(css.includes('--face-btn:48px'),
 'narrow screens retain 48px touch surfaces');
 assert(css.includes('calc(var(--face-btn)*.68)'),'button spacing tightens from .75 to .68 diameters');
 assert(css.includes('calc(var(--face-btn)*1.36)'),'right and bottom keys join the tighter cluster');
 assert(css.includes('calc(var(--face-btn)*2.36)'),'whole control area shrinks with the closer centers');
 const ctl=html.slice(html.indexOf('<div class="touch-actions"'),html.indexOf('</div>',html.indexOf('<div class="touch-actions"')));
 for(const [action,face,key] of [['attack','left','j'],['parry','right','l'],['dash','bottom','Shift'],['jump','top','k']]){
  assert(ctl.includes('data-face="'+face+'" data-art="'+action+'"'),
   action+' has a correctly positioned, labeled arcade bitmap');
  assert(ctl.includes('data-key="'+key+'"'),'original '+action+' input remains intact');
 }
 assert(html.includes("button.classList.toggle('pressed',pressed)")&&html.includes("touchFaceHeld.add(art)")&&html.includes("touchFaceHeld.delete(art)"),
 'touch and gamepad presses update bitmap depressed/released poses through the shared button state');
});
test('left touch joystick has an enlarged invisible hit area and keeps the original drag/bitmap',()=>{
 const markup=html.slice(html.indexOf('id="analogPad"'),html.indexOf('id="analogThumb"'));
 assert(markup.includes('class="analog-touch-zone" aria-hidden="true"'),
  'joystick has a transparent child hit region without adding visual artwork');
 assert(markup.indexOf('analog-touch-zone')<markup.indexOf('analog-ring'),
  'hit region is beneath the painted joystick');
 const first=html.indexOf('<style id="expanded-joystick-touch-v1">'),end=html.indexOf('</style>',first);
 assert(first>0&&end>first,'expanded hitbox CSS is present after existing controller styles');
 const css=html.slice(first,end);
 for(const token of [
  'position:absolute!important','top:calc(-1 * clamp(24px,3.2cqw,42px))!important',
  'right:calc(-1 * clamp(18px,2.6cqw,38px))!important',
  'bottom:calc(-1 * clamp(18px,2.5cqw,32px))!important',
  'left:calc(-1 * clamp(18px,2.6cqw,36px))!important',
  'pointer-events:auto!important','touch-action:none!important',
  'background:transparent!important','z-index:0!important',
  '.analog-pad .analog-ring{','z-index:1!important'
 ])assert(css.includes(token),'missing invisible expanded joystick hitbox rule: '+token);
 const input=html.slice(html.indexOf("analogPad.addEventListener('pointerdown'"),
  html.indexOf("function resetInputs()"));
 assert(input.includes('analogPad.setPointerCapture(e.pointerId)'),
  'expanded zone uses original drag capture on the parent');
 assert(input.includes('analogPad.addEventListener(\'pointermove\'')&&
  input.includes('analogPad.addEventListener(\'pointercancel\''),
  'original drag tracking and cancellation still function');
 assert(input.includes('trackAnalog(e)'),'touch input uses original analog movement mapping');
 assert(html.includes("const ring=analogPad.querySelector('.analog-ring'),r=ring.getBoundingClientRect();"),
  'movement is still centered on the visible joystick rather than the expanded hit area');
});
test('approved arcade joystick uses bitmap disc and separately movable red ball, no guide circles',()=>{
 const root=path.join(__dirname,'../assets/ui');
 for(const name of ['z-arcade-stick-base-centerhole.webp','z-arcade-stick-shaft-centered.webp','z-arcade-stick-knob.webp']){
  const bytes=fs.readFileSync(path.join(root,name));
  assert(bytes.length>4000&&bytes.subarray(0,4).toString()==='RIFF',name+' exists as a transparent bitmap');
 }
 const part=html.slice(html.indexOf('<style id="joystick-arcade-control">'),
 html.indexOf('</style>',html.indexOf('<style id="joystick-arcade-control">')));
 assert(part.includes('--joystick-base-url')&&part.includes('--joystick-shaft-url')&&part.includes('--joystick-knob-url'),
 'fixed base, angled metal shaft and red ball use three independent bitmap layers');
 assert(part.includes('transform-origin:50% 75%')&&part.includes('z-index:1'),
 'shaft rotates at fixed 50% X and correct lower socket height below the ball');
 assert(part.includes("z-arcade-stick-shaft-centered.webp")&&
 html.includes("joystickShaftImage.src='./assets/ui/z-arcade-stick-shaft-centered.webp'"),
 'centered shaft art must be preloaded and visible as the real bitmap, not the offset original');
 assert(part.includes('position:absolute;left:50%;top:50%;width:100%;height:100%'),
 'shaft DOM and stationary base use the same exact visual center without offsets');
 assert(part.includes("-webkit-mask-image:var(--joystick-ball-mask-url,url('./assets/ui/z-arcade-stick-ball-only-mask.webp'))")&&
 part.includes("mask-image:var(--joystick-ball-mask-url,url('./assets/ui/z-arcade-stick-ball-only-mask.webp'))"),
 'the original red sphere uses a real matte bitmap to hide its attached black stub');
 assert(!part.includes('clip-path:inset(0 0 31% 0)'),
 'old rectangular clipping is replaced by an antialiased sphere contour');
 const alphaMask=fs.readFileSync(path.join(root,'z-arcade-stick-ball-only-mask.webp'));
 assert(alphaMask.length>2400&&alphaMask.subarray(0,4).toString()==='RIFF'&&
 alphaMask.toString('ascii',8,12)==='WEBP',
 'knob mask is a real alpha-raster webp, not CSS vector artwork');
 assert(part.includes('-webkit-mask-size:100% 100%')&&part.includes('mask-size:100% 100%'),
 'cutout follows exact existing knob artwork size on Android and desktop');
 assert(html.includes('id="analogShaft" aria-hidden="true"')&&
 html.indexOf('id="analogShaft"')<html.indexOf('id="analogThumb"'),
 'shaft is positioned between the fixed metallic base and foreground red knob');
 assert(html.includes('shaftAngle=clamp(nx,-1,1)*28')&&
 html.includes('shaftDepth=1-clamp(ny,-1,1)*.38'),
 'live pointer lean and fore/aft shaft depth are both calculated');
 assert(html.includes('analogShaft.style.transform=')&&
 html.includes("analogShaft.style.transform='translate(-50%,-60.56%) rotate(0deg) scaleY(1)'"),
 'pointer motion tilts the shaft and release returns it upright');
 assert(part.includes('.analog-ring::after')&&part.includes('.analog-axis')&&part.includes('display:none!important'),
 'old circle guide / vector axis must be gone');
 assert(part.includes('transform:translate(10px,-13px)')&&
 part.includes('clamp(118px,11.8cqw,138px)'),
 'arcade stick shifts 10px right, 13px up, with its current size unchanged');
 assert(part.includes('transform:translate(8px,-11px)')&&part.includes('width:108px!important'),
 'compact screens maintain a smaller proportional offset and larger cap');
 assert(part.includes('transition:translate .045s ease-out'),
 'ball tilts responsively within its collar');
 assert(html.includes('cy=r.top+r.height*.245'),
 'pointer neutral center follows the repositioned red ball over the painted center hole');
 assert(part.includes('z-arcade-stick-base-centerhole.webp')&&
 html.includes("joystickBaseImage.src='./assets/ui/z-arcade-stick-base-centerhole.webp'"),
 'approved new bitmap replaces the old lower-socket base graphic');
 assert(part.includes('translate(-50%,-60.56%) rotate(0deg)')&&
 part.includes('translate:0 -10.56%'),
 'original shaft and ball move together to the center of the new base socket');
 assert(html.includes("analogThumb.style.translate='0 -10.56%'"),
 'release returns the ball directly over the new center socket');
 assert(html.includes("${(x*.42).toFixed(1)}px ${(y*.42-r.height*(38/360)).toFixed(1)}px"),
 'tilt travel preserves full input sensitivity with the new optical neutral center');
 const compact=html.slice(html.indexOf('<style id="compact-arcade-face-buttons">'),
 html.indexOf('</style>',html.indexOf('<style id="compact-arcade-face-buttons">')));
 assert(compact.includes('position:absolute;inset:6%'),'visible caps shrink without reducing tap targets');
 assert(compact.includes('button.pressed::before')&&compact.includes('background-position:var(--arcade-x) 100%'),
 'fast pressed sprite swapping is preserved');
 assert(compact.includes('background-image:none!important')&&compact.includes('transform:none!important'),
 'outer full square touch target does not shrink');
});
test('sidekick boot crossing the source cell grid is recovered with foot-safe sample widths',()=>{
 const cw=336;
 const overflow=t.zCellSamplingSpec('sidekick-local',5,cw,1);
 assert.equal(overflow.canvasWidth,365+Math.ceil(cw*.14),'sidekick also has a leftward upper-limb margin across all poses');
 assert.equal(overflow.readWidth,365,'6th sidekick frame reads the boot beyond the original 334px crop');
 assert(overflow.bleed>=25,'allow enough room for the full extended shoe tip');
 const neighboring=t.zCellSamplingSpec('sidekick-local',4,cw,1);
 assert.equal(neighboring.readWidth,342,'5th frame receives only a small toe-safe margin');
 for(const i of [0,1,2,3,6,7]){
  const c=t.zCellSamplingSpec('sidekick-local',i,cw,1);
  assert.equal(c.readWidth,334,'other frames never read their neighbors: '+i);
  assert.equal(c.canvasWidth,overflow.canvasWidth,'union crop aligns all 8 frames');
 }
 for(const k of ['frontkick','roundkick','spinning_heel','sidekick','', 'axe_kick']){
  for(let i=0;i<8;i++){
   const c=t.zCellSamplingSpec(k,i,cw,1);
   assert.equal(c.readWidth,334,'other art sources cannot bleed into adjacent frames: '+k+' '+i);
   assert.equal(c.canvasWidth,334,'other actions retain their original sprite cell geometry');
  }
 }
 assert(html.includes("key==='sidekick'&&url==='./assets/z-attacks-20/sidekick.webp'"),
 'special reading is enabled only on the approved local sidekick atlas');
 assert(html.includes("const localSidekickFootFix=key==='sidekick'&&url==='./assets/z-attacks-20/sidekick.webp'"),
 'the loaded atlas uses the correct frame extraction path');
 const anchor=html.slice(html.indexOf('function prepareZCells(im,'),html.indexOf('function loadMaskedMove(key)'));
 assert(anchor.includes("crop.readWidth,coreHeight,crop.padLeft,crop.padTop,crop.readWidth,coreHeight"),
 'drawImage copies the extended source shoe before background removal');
 assert(anchor.includes('r.canvas,union.x,union.y,union.w,union.h'),
 'the same full-body union crop applies to every output frame');
});
test('Superman Punch third frame restores the extended fist and rear boot without neighbor-frame leakage',()=>{
 const cw=340,main=t.zCellSamplingSpec('superman_punch-local',2,cw,1),pad=Math.ceil(cw*.17);
 assert.equal(main.canvasWidth,338+pad*2,'all 8 superman frames receive equal safe margins');
 assert.equal(main.readWidth,338,'normal source core is still cell-exact');
 assert.equal(main.padLeft,pad,'all poses share the original cell center');
 assert.equal(main.spillLeft,pad,'the flying rear boot is recovered beyond the cell');
 assert.equal(main.spillRight,pad,'the fully outstretched fist is recovered beyond the cell');
 for(const i of [0,1,3,4,5,6,7]){
  const crop=t.zCellSamplingSpec('superman_punch-local',i,cw,1);
  assert.equal(crop.canvasWidth,main.canvasWidth,'no size flicker between poses');
  assert.equal(crop.padLeft,pad,'same foot and body alignment');
  assert.equal(crop.spillLeft,0,'other poses cannot steal left neighboring frame pixels');
  assert.equal(crop.spillRight,0,'other poses cannot steal right neighboring frame pixels');
 }
 assert(html.includes("url==='./assets/z-attacks-20/'+key+'.webp'"),
  'only the approved locally hosted original Superman Punch is patched');
 assert(html.includes("else frames=prepareZCells(im,localHeroLimbFix?key+'-local':'')"),
  'loader selects the matching oversized-frame extraction');
 const cropCode=html.slice(html.indexOf('function prepareZCells('),html.indexOf('// Masked cyberpunk grunt A:'));
 assert(cropCode.includes("const upper=Math.floor(coreHeight*.55)"),
  'the enemy-facing tip samples only the upper-half source strip');
 assert(cropCode.includes("crop.leftBand==='mid'?.40:.68"),
  'the flying boot samples only the lower-half strip');
 assert(cropCode.includes('sx+crop.readWidth,sy,crop.spillRight,upper'),
  'the wrist and glove are truly sampled from their source image');
 assert(cropCode.includes('sx-crop.spillLeft,sy+start,crop.spillLeft,height'),
  'the rear boot is genuinely sampled from the original image');
 assert(cropCode.includes("const targetW=moveKey==='superman_punch-local'?320:hasExtra?269:240"),
  'the complete flying pose remains at a readable scale, not shrunk');
 assert(cropCode.includes('r.canvas,union.x,union.y,union.w,union.h'),
  'all eight frames continue to share the same foot-anchored union');
});
test('audit-backed hero limb overscan is limited to verified punches, boots and uppercuts',()=>{
 const policies={
  'cross-local':{left:[2,3]},'jab-local':{left:[1,2,3]},
  'forward_headbutt-local':{left:[2,3]},
  'shovel_hook-local':{left:[2,3]},
  'rising_headbutt-local':{left:[3]},
  'roundkick-local':{left:[6]},
  'sidekick-local':{left:[3]},
  'superman_punch-local':{left:[2],right:[2]},
  'rising_elbow-local':{top:[4,5]},
  'uppercut-local':{top:[4]}
 };
 for(const [move,parts] of Object.entries(policies)){
  const origin=t.zCellSamplingSpec(move,0,340,1);
  for(let i=0;i<8;i++){
   const crop=t.zCellSamplingSpec(move,i,340,1);
   assert.equal(crop.canvasWidth,origin.canvasWidth,move+' has no frame-size flicker');
   assert.equal(crop.padLeft,origin.padLeft,move+' has no horizontal anchor jitter');
   assert.equal(crop.padTop,origin.padTop,move+' has no vertical anchor jitter');
   assert.equal(crop.spillLeft>0,!!parts.left?.includes(i),move+' left band is isolated on frame '+i);
   assert.equal(crop.spillRight>0,!!parts.right?.includes(i),move+' right band is isolated on frame '+i);
   assert.equal(crop.spillTop>0,!!parts.top?.includes(i),move+' raised glove uses the right row '+i);
  }
 }
 for(const move of ['backfist','hammerfist','hook','frontkick','lowkick','spinning_elbow','spinning_heel','axe_kick','crescent_kick','diagonal_airkick']){
  for(let i=0;i<8;i++){
   const crop=t.zCellSamplingSpec(move+'-local',i,340,1);
   assert.equal(crop.canvasWidth,338,'safe moves never borrow neighbors');
   assert.equal(crop.readWidth,338,'safe moves use the exact source cell');
   assert.equal(crop.padTop,0);
  }
 }
 const source=html.slice(html.indexOf('function prepareZCells('),html.indexOf('// Masked cyberpunk grunt A:'));
 assert(source.includes("crop.leftBand==='upper'?Math.floor(coreHeight*.44):coreHeight"),
  'upper-frame spill cannot copy another actor foot');
 assert(source.includes("crop.leftBand==='mid'?.40:.68"),
  'grounded rear boots only sample the lower third of the preceding cell');
 assert(source.includes('sx+x0,sy-crop.spillTop,width,crop.spillTop'),
  'raised fist source bleed is sampled without borrowing the prior row body');
 assert(source.includes('const targetH=Z_LOCAL_HERO_LIMB_OVERSCAN[moveKey]?.top?.length?272:254'),
  'raised-fist poses keep their established head/torso size');
});
test('offscreen arrows ping-pong across eight hand-painted frames at 8 fps',()=>{
 const atlas=fs.readFileSync(path.join(__dirname,'../assets/ui/edge-arrows-animated.webp'));
 assert.equal(atlas.toString('ascii',0,4),'RIFF','WebP signature');
 assert.equal(atlas.toString('ascii',8,12),'WEBP');
 assert.equal(atlas.toString('ascii',12,16),'VP8X');
 assert.equal(atlas.readUIntLE(24,3)+1,640,'four 160px columns');
 assert.equal(atlas.readUIntLE(27,3)+1,256,'two 128px rows');
 assert.deepEqual(Array.from({length:12},(_,i)=>t.offscreenArrowFrameAt(i/8)),
 [0,1,2,3,2,1,0,1,2,3,2,1],'8fps back-and-forth frames');
 assert(html.includes("offscreenArrow.src='./assets/ui/edge-arrows-animated.webp'"));
 const section=html.slice(html.indexOf('function drawOffscreenEnemyIndicator(){'),html.indexOf('function drawTravelMeter(){'));
 assert(section.includes('const frame=offscreenArrowFrameAt(time)')&&
  section.includes('frame*cellW,left?cellH:0,cellW,cellH'),
  'left and right directions select correct source row and animated column');
 assert(section.includes('Math.sin(time*11.5)')&&section.includes('ctx.globalAlpha=blink'),
  'previous blink and glow are preserved');
 assert(!section.includes('fillRect')&&!section.includes('strokeRect'),'no vector rectangle around arrows');
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
 assert(game.includes("window.RZBossHunter?.update(e,p,actorDt"),'boss behavior state machine must use per-actor time');
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
 assert(game.includes("function drawModEnergy(layer='all',selection=null)"));
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
test('combat credits are paid per kill once, while shards settle only at run end including DOT kills',()=>{
 g.startRun();
 const money=t.p.credits,shards=world.__revenant.getState().perma.shards;
 const e=t.makeEnemy('guard',t.p.x+75,t.p.y,0);t.setEnemies([e]);
 t.hurtEnemy(e,999,3);
 assert(t.p.credits>=money+65);
 assert.equal(world.__revenant.getState().perma.shards,shards,'kill shards must be deferred to end-of-run result');
 const oldMoney=t.p.credits;
 t.hurtEnemy(e,5,5);
 assert.equal(t.p.credits,oldMoney,'dead guard cannot pay twice');
 const burn=t.makeEnemy('raider',t.p.x+90,t.p.y,1);
 t.setEnemies([burn]);burn.hp=1;burn.burn=1;burn.stun=1;
 t.updateEnemies(.3);
 assert(burn.dead);
 assert(t.p.credits>=oldMoney+45,'DOT kill must award credits too');
 const paid=t.awardRunShards(false);assert(paid.total>=1);
 assert.equal(world.__revenant.getState().perma.shards,shards+paid.total,'all shards settle once after result');
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
 assert(t.p.attackDriveTotal>=65,'every neutral attack should surge substantially');
 assert(t.p.attackDriveTotal<=315,'total lunge stays within a controlled combat budget');
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

test('Red hood grunt enters from the camera on one eight-frame bitmap sheet',()=>{
 const atlas=fs.readFileSync(path.join(__dirname,'../assets/enemies/redhood-ambush-entry-8.webp'));
 assert.equal(atlas.toString('ascii',0,4),'RIFF');
 assert.equal(atlas.toString('ascii',8,12),'WEBP');
 assert.equal(atlas.readUIntLE(24,3)+1,1536);
 assert.equal(atlas.readUIntLE(27,3)+1,768);
 assert(html.includes("intruderEntryImage.src='./assets/enemies/redhood-ambush-entry-8.webp'"));
 assert(html.includes("['난입 상단 4프레임',()=>ensureBitmapDecoded(intruderEntryImage)]"));
 for(const action of ['idle','run','attack','hit','death','special'])
  assert(html.includes("image.src='./assets/enemies/redhood-intruder/'+(key==='death'?'death-fullbody.webp':key==='attack'?'attack-fullfist.webp':key==='special'?'special-fullframe.webp?v=redhood-safe-eight-20261101':key+'.png')"));
 assert(html.includes("...INTRUDER_MOTION_KEYS.map(k=>['신규 빨간 후드 '+k+' 8프레임'"));
});
test('Crimson intruder drops into an ongoing squad as reinforcements and joins the fight',()=>{
 g.startRun();t.setEnemies([]);t.setSquad(1);
 t.p.x=t.SQUAD_SPOTS[1][1];t.setCameraX(t.p.x-465);
 assert.equal(t.spawnNextEncounter(),true,'second squad activates its support event');
 t.setEnemies(t.getEnemies().slice(0,2));
 assert.equal(t.intruderSupportCount(1,1),2);
 assert.equal(t.spawnIntruderSupport(),true,'red hood joins the squad after ordinary enemies are weakened');
 const enemy=t.getEnemies().find(e=>e.type==='intruder');
 assert(enemy&&enemy.x>t.getCameraX()&&enemy.x<t.getCameraX()+1280,'enemy enters from foreground, inside the camera');
 assert.equal(enemy.entryAge,0);assert.equal(enemy.entryDuration,.68);
 const health=enemy.hp;
 t.hurtEnemy(enemy,15,12);assert.equal(enemy.hp,health,'flying entrance is temporarily unhittable');
 for(let i=0;i<28;i++)t.updateEnemies(.02);
 assert(t.intruderEntering(enemy));assert.equal(t.intruderEntryFrame(enemy),2,'approved arrival storyboard plays painted cells in 0-1-3-2 order');
 for(let i=0;i<31;i++)t.updateEnemies(.02);
 assert.equal(t.intruderEntering(enemy),false,'entry concludes before normal combat behavior');
 assert.equal(enemy.entryLandingPlayed,true,'landing is signaled once');
 assert.equal(enemy.brain,'support_elite','elite fighter retains its own special attack AI');
});
test('Redhood basic punch restores all three fists that crossed neighboring sprite cells',()=>{
 const sprite=fs.readFileSync(path.join(__dirname,'../assets/enemies/redhood-intruder/attack-fullfist.webp'));
 assert(sprite.length>250000,'finished hand-painted eight-frame atlas must exist in game assets');
 assert.equal(sprite.toString('ascii',0,4),'RIFF','sprite is a real WebP bitmap');
 assert.equal(sprite.toString('ascii',8,12),'WEBP');
 assert.equal(t.intruderMotionImages.attack.src,'./assets/enemies/redhood-intruder/attack-fullfist.webp',
  'live Redhood attacks load restored fist artwork rather than the fragmented original');
 assert(html.includes("if(name==='hit'||name==='death'||name==='attack'||name==='special'){"),
  'all eight attack poses must skip destructive connected-component separation');
 assert.deepEqual(Array.from(t.INTRUDER_FRAME_FOOT.attack),Array(8).fill(598),
  'attacking frames share one measured full-body ground anchor');
 // Source audit finds fist fragments from 2->3, 5->6 and 7->8;
 // the generated source keeps all original pixels and prevents stray punches.
 for(const frame of [0,1,2,3,4,5,6,7]){
  const actor=t.makeEnemy('intruder',700,555,frame+40);
  actor.windup=0;actor.attackPoseTime=.1;
  const id=t.intruderCombatFrame(actor,'attack');
  assert(id>=0&&id<8,'repaired atlas must retain eight original attack pose slots');
 }
});
test('redhood death uses the rebuilt 8-frame full-body atlas and restores legs across the former row seam',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../assets/enemies/redhood-intruder/death-fullbody.webp'));
 assert(source.length>150000,'full-body 8-frame bitmap exists and retains illustrated leg details');
 assert.equal(source.toString('ascii',0,4),'RIFF');
 assert.equal(source.toString('ascii',8,12),'WEBP');
 assert(html.includes("key==='death'?'death-fullbody.webp':key==='attack'?'attack-fullfist.webp':key==='special'?'special-fullframe.webp?v=redhood-safe-eight-20261101':key+'.png'"),'death must use rebuilt art, not the original row-overlapping PNG');
 assert.equal(t.intruderMotionImages.death.src,'./assets/enemies/redhood-intruder/death-fullbody.webp');
 assert(html.includes("if(name==='hit'||name==='death'||name==='attack'||name==='special'){"),'death must skip destructive eroded-core sprite isolation');
 assert(html.includes('diagnostic.byAtlas[name]=cuts.map'),'death cut QA must register sourcePreserved and zero removed pixels');
 assert.deepEqual(Array.from(t.INTRUDER_FRAME_FOOT.death),Array(8).fill(536),'all 8 poses have consistent foot position after reassembly');
 const e=t.makeEnemy('intruder',800,560,88);e.dead=true;e.collapseAge=.76;
 assert.equal(t.intruderVisualMove(e,'fall'),'death');
 assert(t.intruderCombatFrame(e,'fall')>=0&&t.intruderCombatFrame(e,'fall')<8);
});
test('redhood hit keeps original full-length boots and audited ground anchors',()=>{
 // Source 1774x887 bitmap audit: eight original poses show both complete feet,
 // and none touches a cell border. Disable destructive isolation ONLY for hit.
 assert(html.includes("if(name==='hit'||name==='death'||name==='attack'||name==='special'){"),'hit and death motions must both retain their own non-destructive crop path');
 assert(html.includes('sourcePreserved:true'),'diagnostic records uncut original hit alpha');
 const isolated=html.slice(html.indexOf("if(name==='hit'||name==='death'||name==='attack'||name==='special'){"),html.indexOf("const result=isolateIntruderFrames(image,cuts,name);"));
 assert(isolated.includes('continue;'),'original hit poses must skip eroded-core alpha pruning');
 assert.deepEqual(Array.from(t.INTRUDER_FRAME_FOOT.hit),[439,440,441,440,419,421,421,419],
  'all eight floor anchors match original source boot-tip pixels');
 for(const kind of ['attack','death','idle','run','special'])
  assert.equal(t.INTRUDER_FRAME_FOOT[kind].length,8,kind+' retains existing ground alignment');
});
test('Crimson support enemies are separate from regular wave rosters and keep distinct eight-frame art',()=>{
 for(let w=1;w<=2;w++)for(let i=0;i<11;i++){
  const roster=t.encounterRoster(w,i);
  assert.equal(roster.filter(x=>x==='intruder').length,0,'support is staged separately from normal squads');
  assert.equal(t.intruderSupportCount(w,i),i>=1&&i%3===1?(i>=4?3:2):0);
  assert(roster.filter(x=>x==='raider').length>=t.SQUAD_ROSTERS[w][i].filter(x=>x==='raider').length,
   'reinforcements do not replace regular masked raiders');
 }
 const a=t.makeEnemy('intruder',500,570,2),b=t.makeEnemy('raider',500,570,2);
 assert(a.maxHp>b.maxHp*3&&a.maxPoise>b.maxPoise,'redhood has elite durability');
 assert(a.damage>b.damage,'redhood is a meaningful special threat');
 assert(html.includes("if(a.type==='intruder')"));
 assert(html.includes("else drawIntruderCombat(a,x,y,z)"));
 assert(!html.includes("else drawMaskedGrunt(a,x,y,z)"));
 assert.equal(t.intruderVisualMove(a,'idle'),'idle');
 assert.equal(t.intruderVisualMove(a,'run'),'run');
 assert.equal(t.intruderVisualMove(a,'attack'),'attack');
 assert.equal(t.intruderVisualMove(a,'hitHead'),'hit');
 assert.equal(t.intruderVisualMove(a,'fall'),'death');
 assert.equal(Object.keys(t.intruderMotionImages).length,6,'six independent action sheets');
 for(const kind of ['idle','run','attack','hit','death','special']){
  assert.equal(t.INTRUDER_FRAME_FOOT[kind].length,8,kind+' frames align with ground');
  assert.equal(t.intruderMotionImages[kind].src,'./assets/enemies/redhood-intruder/'+(kind==='death'?'death-fullbody.webp':kind==='attack'?'attack-fullfist.webp':kind==='special'?'special-fullframe.webp?v=redhood-safe-eight-20261101':kind+'.png'));
 }
 for(const [key,detail] of [['idle',{}],['run',{visualMoving:true,spriteDistance:200,locomotionMode:'run'}],
   ['attack',{windup:.2,windupDuration:.45}],['hit',{reactionTime:.3,reactionDuration:.48,hitAnimation:'hitHead'}]]){
  const enemy={...a,...detail,specialPhase:''};
  const drawKey=key==='run'?'run':key==='attack'?'attack':key==='hit'?'hitHead':'idle';
  assert(t.intruderCombatFrame(enemy,drawKey)>=0&&t.intruderCombatFrame(enemy,drawKey)<8,key+' frame range');
 }
 for(const phase of ['windup','leap','hang','dive','recovery']){
  const enemy={...a,specialPhase:phase,specialTime:.15};
  assert.equal(t.intruderVisualMove(enemy,'idle'),'special');
  assert(t.intruderCombatFrame(enemy,'idle')<8,'special poses stay in their own sheet');
 }
});
test('Crimson Dive telegraphs, leaps, locks target, and hits on the ground with regular damage rules',()=>{
 g.startRun();t.p.x=575;t.p.y=570;t.p.inv=0;
 const e=t.makeEnemy('intruder',900,570,15);
 e.entryAge=e.entryDuration=1.12;e.encountered=true;e.specialCooldown=0;
 t.setEnemies([e]);
 const hp=t.p.hp;
 assert.equal(t.updateIntruderSpecial(e,.02),true);
 assert.equal(e.specialPhase,'windup');
 const locked=e.specialTargetX;
 t.p.x+=8;
 for(let i=0;i<90&&e.specialPhase!=='recovery';i++)t.updateIntruderSpecial(e,.02);
 assert.equal(e.specialPhase,'recovery');
 assert.equal(e.specialTargetX,locked,'dive marker locks the ground impact point');
 assert.equal(e.z,0,'special lands on correct foot contact plane');
 assert(t.p.hp<hp,'unblocked ground slam damages the player');
 assert(e.specialCooldown>3,'special cooldown prevents constant repeated dives');
});
test('Crimson Dive landing is parryable and knockback cancels the special',()=>{
 g.startRun();t.p.x=575;t.p.y=570;t.p.inv=0;
 const e=t.makeEnemy('intruder',900,570,15);
 e.entryAge=e.entryDuration=1.12;e.encountered=true;e.specialCooldown=0;
 t.setEnemies([e]);
 const hp=t.p.hp;
 t.updateIntruderSpecial(e,.02);
 for(let i=0;i<80&&e.specialPhase!=='dive';i++)t.updateIntruderSpecial(e,.02);
 assert.equal(e.specialPhase,'dive');
 t.p.parry=.7;
 for(let i=0;i<18&&e.specialPhase==='dive';i++)t.updateIntruderSpecial(e,.02);
 assert.equal(t.p.hp,hp,'parried special deals no damage');
 assert.equal(e.specialPhase,'','successful parry interrupts recovery animation');
 assert(e.stun>1,'parried intruder is punished with standard stun');
});
test('Crimson Dive cancels if a player attack hits its windup',()=>{
 g.startRun();t.p.x=575;t.p.y=570;
 const e=t.makeEnemy('intruder',810,570,15);
 e.entryAge=e.entryDuration=1.12;e.encountered=true;e.specialCooldown=0;
 t.setEnemies([e]);t.updateIntruderSpecial(e,.02);
 assert.equal(e.specialPhase,'windup');
 t.hurtEnemy(e,12,8);
 assert.equal(e.specialPhase,'');
 assert(e.specialCooldown>=2);
});
test('every spawned offscreen enemy is indicated even before detection and while visible foes fight',()=>{
 g.startRun();t.setCameraX(0);t.p.x=450;
 const far=t.makeEnemy('raider',3000,560,0);
 far.encountered=false;t.setEnemies([far]);
 const right=t.offscreenEnemyTarget();
 assert(right&&right.side==='right'&&right.remaining===1);
 assert.equal(t.offscreenEnemyTargets().length,1);
 const shown=t.makeEnemy('raider',650,560,1);
 t.setEnemies([far,shown]);
 assert.equal(t.offscreenEnemyTarget().side,'right',
  'visible combat must never suppress a previously unknown faraway foe');
 assert.equal(t.offscreenEnemyTargets()[0].remaining,1,
  'on-screen enemies do not count toward offscreen warning');
 t.setEnemies([far]);t.setCameraX(3500);
 assert.equal(t.offscreenEnemyTarget().side,'left','arrow must flip behind camera');
 assert.equal(t.offscreenEnemyTargets().length,1);
});
test('simultaneous left and right offscreen spawns create both directional indicators',()=>{
 g.startRun();t.setCameraX(2000);t.p.x=2450;
 const left=t.makeEnemy('raider',1600,550,0);
 const right1=t.makeEnemy('raider',3600,560,1);
 const right2=t.makeEnemy('elite',3900,560,2);
 const shown=t.makeEnemy('raider',2350,560,3);
 left.encountered=false;right1.encountered=false;right2.encountered=false;
 t.setEnemies([left,right1,right2,shown]);
 const targets=t.offscreenEnemyTargets();
 assert.equal(targets.length,2,'both sides must show when enemies exist on each edge');
 assert.equal(targets[0].side,'left');assert.equal(targets[0].remaining,1);
 assert.equal(targets[1].side,'right');assert.equal(targets[1].remaining,2);
 assert.equal(targets[1].worldX,3600,'closest spawned enemy supplies the distance for its side');
 right1.dead=true;
 assert.equal(t.offscreenEnemyTargets()[1].remaining,1,'dead enemies immediately disappear from warning counts');
 t.setEnemies([shown]);assert.equal(t.offscreenEnemyTargets().length,0,
  'only enemies that actually exist outside camera get arrows; never unspawned squads');
 const section=html.slice(html.indexOf('function offscreenEnemyTargets(){'),html.indexOf('function drawTravelMeter(){'));
 assert(!section.includes("if(live.some("),'visible enemies no longer suppress direction markers');
 assert(section.includes('const targets=offscreenEnemyTargets()')&&section.includes('for(const target of targets)'),
  'renderer draws one bitmap marker for each side with offscreen enemies');
 assert(section.includes('anyVisible?98:130')&&section.includes('anyVisible?76:100'),
  'smaller warnings preserve visibility when combat is happening');
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
  // Compare the power modifier at fixed normal-hit damage, not random crit RNG.
  t.p.critDrought=0;
  withNormalHit(()=>t.attackCheck());
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
 t.p.x=550;t.p.y=594;t.p.z=0;t.p.stun=0;t.p.dodge=0;t.p.parry=0;t.p.attack=0;t.p.parryRecoilTime=0;t.p.parryRecoilRemaining=0;t.p.riposteChasing=false;t.p.downTimer=0;t.p.getupTimer=0;t.p.counterRush=0;t.p.airAttack=false;t.p.jumpActive=false;t.p.airKickPhase='';t.p.riposteStrikeTarget=null;t.p.riposteChaseTarget=null;
 t.keys.add('arrowleft');t.keys.add('arrowup');
 t.control(.1,{dx:0,dy:0});
 assert.equal(t.p.x,550,'left arrow must not move player left');
 assert.equal(t.p.y,594,'up arrow must not move player toward background');
 t.keys.clear();t.keys.add('w');t.keys.add('a');
 // The held left-arrow attack properly began a combo in the previous step.
 // Stop its forward lunge before isolating movement-only WASD physics.
 t.p.attack=0;t.p.attackQueued=false;t.p.attackDriveRemaining=0;t.p.attackDriveTotal=0;
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
test('reward choices open with no prelit first-card focus or outline',()=>{
 g.startRun();t.heldKeyboard.clear();
 const fake=Array.from({length:3},()=>({disabled:false,focused:0,selected:false,
  classList:{toggle(){throw Error('reward must not add a selection on open')}},
  focus(){this.focused++},scrollIntoView(){}}));
 const menu=node('menu'),old=menu.querySelectorAll;menu.querySelectorAll=()=>fake;
 try{
  t.p.x=t.WAVE_GATES[1]+10;t.setEnemies([]);
  t.setSquad(t.SQUAD_SPOTS[1].length);t.updateEnemies(0);
  assert.equal(g.getState().gameState,'reward');
  assert.equal(t.menuPad.index,0,'navigation order remains unchanged');
  assert(fake.every(b=>b.focused===0),'no upgrade button auto-focused on reveal');
  assert(!html.includes("if(gameState!=='reward')selectMenuItem(0)"),'all menus including rewards open without automatic focus');
 }finally{menu.querySelectorAll=old}
});
test('reward confirmation glows and holds before granting exactly one upgrade',()=>{
 g.startRun();t.keys.clear();t.heldKeyboard.clear();
 t.p.x=t.WAVE_GATES[1]+10;t.setSquad(t.SQUAD_SPOTS[1].length);t.setEnemies([]);
 t.updateEnemies(0);assert.equal(g.getState().gameState,'reward','real wave clear must open the reward menu');
 const before=t.modRank('rush');
 assert.equal(t.requestSelectMod('rush'),true);
 assert.equal(g.getState().gameState,'reward');
 assert.equal(t.modRank('rush'),before,'bonus is not granted until the visual confirms');
 assert.equal(t.requestSelectMod('rush'),false,'double press cannot start another confirmation');
 assert(t.getRewardSelection()?.id==='rush');
 t.update(.3);assert.equal(g.getState().gameState,'reward');
 t.update(.3);assert.equal(g.getState().gameState,'reward');
 t.update(.3);assert.equal(g.getState().gameState,'playing');
 assert.equal(t.getRewardSelection(),null);
 assert.equal(t.modRank('rush'),before+1,'grant occurs once and only once');
 assert(html.includes('reward-selected-glow')&&html.includes('reward-fly-to-hud')&&
 html.includes('reward-hud-flash'),'all three bitmap-card-to-HUD animations exist');
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
test('held pad attack cannot auto-pick until released; A and X both confirm menu items',()=>{
 g.startRun();const fake=Array.from({length:3},()=>({disabled:false,dataset:{},clicked:0,classList:{toggle(){}},click(){this.clicked++}}));
 const m=node('menu'),old=m.querySelectorAll;m.querySelectorAll=()=>fake;
 const pad={axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false}))};world.navigator.getGamepads=()=>[pad];
 try{
  pad.buttons[2].pressed=true;t.p.x=t.WAVE_GATES[1]+10;t.setEnemies([]);t.setSquad(t.SQUAD_SPOTS[1].length);t.updateEnemies(0);
  t.pollPad();t.menuPad.readyAt=0;for(let i=0;i<10;i++)t.pollPad();assert.equal(fake[0].clicked,0);
  pad.buttons[2].pressed=false;t.menuPad.neutralAt=0;t.pollPad();
  for(let i=0;i<10;i++){pad.buttons[0].pressed=true;t.pollPad();pad.buttons[0].pressed=false;t.pollPad()}
  assert(fake[0].clicked>=1,'A/cross must confirm after release of a previously held face button');
  const afterA=fake[0].clicked;
  // The test does not run a clock; skip the intentional menu confirm cooldown.
  t.menuPad.readyAt=0;t.menuPad.neutralAt=0;t.pollPad();
  pad.buttons[2].pressed=true;t.pollPad();t.pollPad();
  assert.equal(fake[0].clicked,afterA+1,'X also confirms after neutral release and cooldown');
 }finally{m.querySelectorAll=old;world.navigator.getGamepads=()=>[];t.pollPad()}
});

test('successful parry launches a strong physical knockback and short player recoil',()=>{
 g.startRun();t.setEnemies([]);
 const e=t.makeEnemy('assassin',t.p.x+68,t.p.y,0);t.setEnemies([e]);
 t.parry();
 assert.equal(t.getFx().filter(f=>f.kind==='parryShield').length,0,'no bitmap shield for parry startup');
 t.enemyAttack(e);
 assert(e.knockVX>=1000,'stronger velocity launch, not teleport');
 assert.equal(t.getFx().filter(f=>f.kind==='parrySuccess10').length,1,'ten-frame sprite only on successful attack contact');
 assert(t.p.parryRecoilTime>0&&t.p.parryRecoilRemaining>0);
 const x=t.p.x;t.control(1/60,{dx:0,dy:0});
 assert(t.p.x<x&&t.p.x>x-6,'gradual short backward player slide');
});
test('JUST PARRY shows the artist ten-frame blue burst without stacked enlarged FX and preserves global cinematic',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2100;t.p.y=570;
 const enemy=t.makeEnemy('assassin',t.p.x+78,t.p.y,0);enemy.stun=0;t.setEnemies([enemy]);
 t.parry();
 assert.equal(t.getFx().filter(f=>f.kind==='parrySuccess10').length,0,'no impact before a real parry');
 assert.equal(t.getSlowMotion(),0,'guard startup never slows the world');
 t.enemyAttack(enemy);
 const bursts=t.getFx().filter(f=>f.kind==='parrySuccess10');
 assert.equal(bursts.length,1,'one original ten-frame blue burst per confirmed parry');
 assert.equal(bursts[0].life,.31,'V11 ten-frame burst uses a slightly slower 310ms real-time clock');
 assert.equal(t.getFx().filter(f=>f.kind==='parryShield').length,0,'no inflated prior shield effect');
 assert(!t.getFx().some(f=>f.kind==='modBitmap'&&f.color==='blue'),'no duplicate blue bitmap glow');
 assert(!t.getFx().some(f=>f.color==='gold'),'no stacked golden burst');
 assert(t.getSlowMotion()>=1.39,'dramatic parry cinematic lasts 1.4 seconds');
 assert.equal(t.getSlowVictim(),enemy,'only successfully parried actor gets stacked slowdown');
 assert(t.getHitStop()>=.19,'initial parry impact has an extended 190ms freeze');
});
test('V11 ten-frame parry burst plays slightly slower on real time through freeze and slow-mo',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2600;t.p.y=570;t.p.facing=1;
 t.setCameraX(t.p.x-465);
 const enemy=t.makeEnemy('assassin',t.p.x+80,t.p.y,0);t.setEnemies([enemy]);
 t.parry();t.enemyAttack(enemy);
 const shot=t.getFx().find(f=>f.kind==='parrySuccess10');
 assert(shot,'parry success creates a unique 10-frame burst');
 const world=t.getGameTime();
 for(let n=0;n<6;n++)t.update(1/60);
 const elapsed=(6/60);
 assert(shot.life<.31-elapsed+.0001,'VFX must advance on real time even during hitstop');
 assert(t.getGameTime()-world<elapsed*.26,'background/world effects remain strongly slowed');
 assert(t.getCameraZoom()>1.25,'camera zoom is visible before flash completes');
 assert(t.getCameraX()>t.p.x-455,'camera follows the parry toward the enemy-facing side');
 for(let n=0;n<15;n++)t.update(1/60);
 assert(!t.getFx().includes(shot),'the full ten-frame flash ends after ~310ms, before 350ms real time');
 assert(t.getSlowMotion()>1.0,'surrounding actors remain in slow motion after burst');
});
test('parry camera looks forward in either direction and safely frames the entire burst',()=>{
 for(const facing of [1,-1]){
  g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=3600;t.p.y=570;t.p.facing=facing;
  t.setCameraX(t.p.x-(facing>0?465:815));
  const initialX=t.getCameraX();
  const enemy=t.makeEnemy('raider',t.p.x+facing*75,t.p.y,0);
  t.setEnemies([enemy]);t.parry();t.enemyAttack(enemy);
  assert(t.getCameraZoom()>=1.11,'zoom starts during the parry contact frame');
  for(let n=0;n<10;n++)t.update(1/60);
  const cx=t.getCameraX(),zoom=t.getCameraZoom(),focus=1280*.52;
  assert(zoom>=1.27&&zoom<=1.36,'parry closeup zooms closer but stays within safe clip');
  assert((cx-initialX)*facing>30,'camera leads in the outgoing attack direction');
  const project=x=>focus+(x-cx-focus)*zoom;
  const furthest=project(t.p.x+facing*215);
  assert(furthest>36&&furthest<1280-36,'full blast remains safely on-screen even with closeup');
 }
});
test('user uploaded ten-frame parry artwork is embedded intact and uses 5x2 screen-key draw',()=>{
 const match=html.match(/parrySuccessImage\.src='data:image\/avif;base64,([^']+)'/);
 assert(match,'actual user artwork must be embedded in the gameplay preload');
 const avif=Buffer.from(match[1],'base64');
 assert.equal(avif.length,6788);
 assert.equal(avif.subarray(4,12).toString(),'ftypavif');
 const blob=require('node:crypto').createHash('sha1').update('blob '+avif.length+'\0').update(avif).digest('hex');
 assert.equal(blob,'6182b78d4426ffe678e36306d65c5e23ee29c9be','must match the validated uploaded ten-frame asset');
 assert(html.includes('spawnParrySuccessFx(p.x+p.facing*42,p.y-132,p.facing);'),'impact is anchored near hero forearm');
 assert(html.includes('const w=318,h=296'),'the corrected ten-frame burst stays at its original size without changing its source ratio');
 assert(html.includes("ctx.drawImage(a,crop.sx,crop.sy,crop.sw,crop.sh,-w*.32,-h*.5,w,h)"));
 assert(html.includes("ctx.globalCompositeOperation='screen'"),'solid black frame background must not become a rectangle');
 assert(html.includes('const PARRY_SUCCESS_CELL_PAD=10'),'transparent per-frame margin is present');
  assert(html.includes('g.imageSmoothingEnabled=false'),'source frames are copied pixel-for-pixel');
  assert(html.includes('prepareParrySuccessCells();'),'ten frame precut occurs during preloading');
  assert(html.includes('if(cell)ctx.drawImage(cell,'),'draw the separated frame');
  assert(html.includes('g.drawImage(source,r.sx+r.sw-1-x,'),
   'enemy-side edge reuses only the same source cell');
  const first=html.indexOf('function parrySuccessSourceRect(w,h,frame){');
 const last=html.indexOf('function drawEffects(',first);
 assert(first>=0&&last>first,'crop source helper must precede rendering');
 const sourceRect=vm.runInNewContext(html.slice(first,last)+'\nparrySuccessSourceRect');
 for(let frame=0;frame<10;frame++){
  const r=sourceRect(1536,1024,frame),col=frame%5,row=Math.floor(frame/5);
  const x0=Math.round(col*1536/5),x1=Math.round((col+1)*1536/5);
  const y0=Math.round(row*1024/2),y1=Math.round((row+1)*1024/2);
  // Full native cell: the individual 1:1 bitmap prevents neighbor bleed.
  assert.equal(r.sx,x0,'retain the full left edge');
  assert.equal(r.sy,y0,'retain the full top edge');
  assert(r.sw>0&&r.sh>0&&r.sx+r.sw===x1&&r.sy+r.sh===y1,
   'retain the painted tip while never sampling another cell');
  assert.equal(r.sx%1,0);assert.equal(r.sy%1,0);
  assert.equal(r.sw%1,0);assert.equal(r.sh%1,0);
 }
 console.log('PASS: parry atlas source rectangles safe for all 10 frames, corrected width-height ratio and forearm position');
});
test('successful riposte impact retriggers camera-forward and layered slow, without affecting failed hits',()=>{
 for(const facing of [1,-1]){
  g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=3400;t.p.y=570;t.p.facing=facing;
  t.setCameraX(t.p.x-(facing>0?465:815));
  const before=t.getCameraX();
  const target=t.makeEnemy('assassin',t.p.x+facing*132,t.p.y,0);
  target.hp=target.maxHp=3000;t.setEnemies([target]);
  assert.equal(t.getCounterCameraTime(),0,'no counter camera before a landed punch');
  t.p.moveName='superman_punch';t.p.riposteStrikeTarget=target;
  t.attackCheck();
  assert.equal(t.p.riposteStrikeTarget,null,'consume the hit exactly once');
  assert(t.getCounterCameraTime()>=1.09,'impact triggers a separate counter framing window');
  assert(t.getRiposteCinematicTime()>=1.07,'impact starts a distinct strong slow-motion phase');
  assert(t.getSlowMotion()>=1.47,'hit restores the cinematic slowdown even if the initial parry ended');
  assert(t.getHitStop()>=.22,'confirmed counter has an emphatic impact freeze');
  for(let n=0;n<10;n++)t.update(1/60);
  assert((t.getCameraX()-before)*facing>80,'follow camera must move farther into the counter direction');
  const zoom=t.getCameraZoom(),cx=t.getCameraX(),focus=1280*.52;
  const project=x=>focus+(x-cx-focus)*zoom;
  const width=665; // baseline eight-frame original counter atlas
  const back=project(t.p.x+facing*(83-width*.18)),front=project(t.p.x+facing*(83+width*.82));
  assert(Math.min(front,back)>20&&Math.max(front,back)<1260,'both ends of bitmap counter fit the zoomed view');
  const start=t.getGameTime();t.update(1/60);
  assert(t.getGameTime()-start<.0032,'riposte surrounding world runs below 20% of real time');
 }
});
test('fully upgraded counter atlas stays in frame without resizing or cutting the source',()=>{
 for(const facing of [1,-1]){
  g.startRun();t.setEnemies([]);t.p.x=4200;t.p.y=570;t.p.facing=facing;
  t.setCameraX(t.p.x-(facing>0?465:815));
  t.triggerCounterCamera(facing,1090);
  const safeZoom=t.counterCameraZoomGoal();
  assert(safeZoom>1&&safeZoom<1.2,'largest original atlas uses an adaptive safe camera zoom');
  for(let n=0;n<18;n++){t.updateComboCamera(1/60,1/60);t.followComboCamera(1/60,1/60)}
  const c=t.getCameraX(),z=t.getCameraZoom(),focus=1280*.52;
  const project=x=>focus+(x-c-focus)*z;
  const bounds=[project(t.p.x+facing*(83-1090*.18)),project(t.p.x+facing*(83+1090*.82))];
  assert(Math.min(...bounds)>30&&Math.max(...bounds)<1250,'full upscaled skill VFX remains visible in both directions');
 }
});
test('counter ghost trail uses actual five bitmap attack poses, with temporary mobile-safe limits',()=>{
 g.startRun();t.setEnemies([]);t.p.x=2800;t.p.y=570;t.p.facing=1;
 const old=t.zArtState.superman_punch;
 const frames=Array.from({length:8},(_,i)=>({canvas:{testFrame:i},bounds:{x:0,y:0,w:80,h:90},unitScale:1}));
 try{
  t.zArtState.superman_punch={ready:true,frames};
  const target=t.makeEnemy('assassin',t.p.x+120,t.p.y,0);
  target.hp=target.maxHp=2500;t.setEnemies([target]);
  t.p.riposteStrikeTarget=target;t.attackCheck();
  const ghosts=t.getHeroAfterimages().filter(x=>x.counterEcho);
  assert(ghosts.length>=4&&ghosts.length<=5,'contact creates a bounded set of real rendered sprite echoes');
  assert(new Set(ghosts.map(x=>x.frame)).size>=4,'echoes show multiple attack poses, not a single pasted sprite');
  assert(ghosts.every(x=>x.x<t.p.x&&x.life>=.8),'image trails fan behind the successful right-facing punch');
  const before=ghosts[0].life;
  t.update(1/60);
  assert(ghosts[0].life<before,'echoes fade even while the world is frozen');
 }finally{
  if(old)t.zArtState.superman_punch=old;
  else delete t.zArtState.superman_punch;
 }
});
test('global parry cinematic slows camera world clock, hero, and parried foe in three layers',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2200;t.p.y=570;t.p.stamina=100;
 const target=t.makeEnemy('raider',t.p.x+79,t.p.y,0);
 const other=t.makeEnemy('raider',t.p.x+375,t.p.y,1);other.stun=4;
 t.setEnemies([target,other]);t.parry();t.enemyAttack(target);
 // Freeze frames do not process movement; afterwards independently sample
 // the global clock, hero sprite pose clock and target's motion clock.
 for(let j=0;j<12;j++)t.update(1/60);
 assert.equal(t.getHitStop(),0,'initial impact freeze must eventually release');
 const oldWorld=t.getGameTime(),oldHero=t.p.motionTime,oldVictim=target.spriteTime,oldOther=other.spriteTime;
 t.update(1/60);
 const worldStep=t.getGameTime()-oldWorld,heroStep=t.p.motionTime-oldHero;
 const victimStep=target.spriteTime-oldVictim,otherStep=other.spriteTime-oldOther;
 assert(Math.abs(worldStep-(1/60)*.24)<.0002,'background and normal enemies run at 24% speed: '+worldStep);
 assert(Math.abs(otherStep-worldStep)<.0002,'other foes use slowed global world time');
 assert(Math.abs(heroStep-worldStep*.58)<.0002,'hero animation and movement run at 58% of the slowed world clock');
 assert(Math.abs(victimStep-worldStep*.32)<.0002,'parried actor animation and AI run at 32% of world time');
 assert(victimStep<heroStep&&heroStep<otherStep,'layered time factors visibly separate victim/hero/environment');
 assert(t.getSlowMotion()>.6,'cinematic is still active after impact freeze');
 // All cooldowns recover to normal after the real-time cinematic ends.
 for(let j=0;j<85;j++)t.update(1/60);
 assert.equal(t.getSlowMotion(),0,'global time returns to normal without sticking');
 assert.equal(t.getSlowVictim(),null,'victim-specific slow reference clears after the cinematic');
 t.p.stun=0;t.p.parry=0;t.setEnemies([]);
 const resumed=t.getGameTime();t.update(1/60);
 assert(Math.abs(t.getGameTime()-resumed-1/60)<.0001,'world returns to 1x');
});
test('parry chase is full-speed after input; actual counter contact restores slow motion',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2350;t.p.y=570;
 const e=t.makeEnemy('assassin',t.p.x+82,t.p.y,0);e.hp=e.maxHp=950;
 t.setEnemies([e]);t.parry();t.enemyAttack(e);
 assert(t.getSlowMotion()>=1.39,'parry success initially slows the world');
 assert(t.getHitStop()>=.19,'parry success keeps its initial hit freeze');
 t.startAttack();
 assert.equal(t.p.riposteChasing,true,'chase starts immediately from accepted attack input');
 assert.equal(t.p.riposteChaseTarget,e,'original parry target retained');
 assert.equal(t.getSlowMotion(),0,'no old parry slow during the chase');
 assert.equal(t.getSlowVictim(),null,'parried target returns to 1x during chase');
 assert.equal(t.getRiposteCinematicTime(),0,'no prior counter cinematic during the chase');
 assert.equal(t.getHitStop(),0,'the parry freeze cannot hold up the chase');
 const timeBefore=t.getGameTime();
 t.update(1/60);
 assert(Math.abs(t.getGameTime()-timeBefore-1/60)<.0001,'world clock advances at normal speed during chase');
 assert.equal(t.getSlowMotion(),0,'chase stays at normal speed across subsequent frames');
 // Contact brings the second slow-motion beat back, without changing chase motion.
 t.p.riposteChasing=false;t.p.riposteStrikeTarget=e;
 t.attackCheck();
 assert(t.getSlowMotion()>=1.47,'landed riposte restores the powerful slow motion');
 assert(t.getRiposteCinematicTime()>=1.07,'contact starts the second cinematic phase');
});
test('manual dash following parry also clears slow motion, without altering its startup feedback',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2550;t.p.y=570;
 const e=t.makeEnemy('assassin',t.p.x+80,t.p.y,0);
 t.setEnemies([e]);t.parry();t.enemyAttack(e);
 assert(t.getSlowMotion()>=1.39,'parry slow starts on success');
 assert.equal(t.dodge(),true,'dash is accepted within the parry follow-up window');
 assert.equal(t.getSlowMotion(),0,'dash removes parry slow');
 assert.equal(t.getSlowVictim(),null,'dash removes the leftover target slow');
 const before=t.getGameTime();t.update(1/60);
 assert(Math.abs(t.getGameTime()-before-1/60)<.0001,'manual dash advances the world at 1x');
});
test('parry shield is a real eight-frame transparent PNG',()=>{
 const png=fs.readFileSync(path.join(__dirname,'../assets/fx/parry-shield.png'));
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),256);
 assert(!html.includes('parryShieldImage.src='),'old defensive bubble image is not loaded by gameplay');
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
test('Iron Mask no longer flashes a ghost silhouette, boss still has impact flash and jump travels vertically',()=>{
 const elite=fs.readFileSync(path.join(__dirname,'../assets/elite-ironmask.js'),'utf8');
 const boss=fs.readFileSync(path.join(__dirname,'../assets/boss-hunter.js'),'utf8');
 assert(!elite.includes("'brightness(0) invert(1)'"),'Iron Mask must not overlay a transparent duplicate of its silhouette');
 assert(boss.includes("'brightness(0) invert(1)'"),'boss flash should whiten actual sprite');
 assert(html.includes("p.vz=jumpMobilityStats().impulse;p.z=2"),'jump launch impulse must grow with height upgrades');
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
 assert(maxHeight>138&&maxHeight<172,'unupgraded jump is lower, but still clears ordinary combat; '+maxHeight);
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
test('longer jump travels farther while neutral jump still has no drift',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2100;t.p.y=570;
 const start=t.p.x;t.keys.add('d');t.jump();t.keys.delete('d');
 for(let i=0;i<70;i++)t.control(1/60,{dx:0,dy:0});
 assert(t.p.x-start>490,'airborne travel extends substantially beyond previous 345px threshold');
 assert.equal(t.p.jumpLandingTriggered,false,'a longer regular jump never triggers a free attack');
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2100;
 const neutral=t.p.x;t.jump();
 for(let i=0;i<70;i++)t.control(1/60,{dx:0,dy:0});
 assert(Math.abs(t.p.x-neutral)<1,'unsteered neutral jump stays centered');
});
test('direction changes immediately in midair on keyboard and gamepad, including neutral launches',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2200;
 t.keys.add('d');t.jump();t.keys.delete('d');
 for(let i=0;i<8;i++)t.control(1/60,{dx:1,dy:0});
 const rightX=t.p.x;
 t.control(1/60,{dx:-1,dy:0});
 assert(t.p.x<rightX,'left input reverses horizontal world travel in one tick');
 assert.equal(t.p.facing,-1,'hero rotates to face the new direction before landing');
 const leftX=t.p.x;
 t.control(1/60,{dx:1,dy:0});
 assert(t.p.x>leftX,'gamepad right input reverses again without waiting to land');
 assert.equal(t.p.facing,1,'hero turns toward right input');
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2200;
 t.jump();assert.equal(t.p.jumpLeap,false);
 for(let i=0;i<5;i++)t.control(1/60,{dx:0,dy:0});
 const start=t.p.x;
 t.control(1/60,{dx:-1,dy:0});
 assert(t.p.x<start,'a stationary jump can start moving left after takeoff');
 assert.equal(t.p.jumpLeap,true);
 assert.equal(t.p.facing,-1);
 const prior=t.p.x;
 t.control(1/60,{dx:0,dy:0});
 assert(t.p.x<prior,'letting go maintains momentum while airborne');
});
test('midair turning remains available during an explicitly requested heel chop',()=>{
 g.startRun();t.keys.clear();t.setEnemies([]);t.p.x=2300;
 t.keys.add('d');t.jump();t.keys.delete('d');
 for(let i=0;i<10;i++)t.control(1/60,{dx:1,dy:0});
 t.startAttack();assert.equal(t.p.airKickPhase,'charge');
 const previous=t.p.x;t.control(1/60,{dx:-1,dy:0});
 assert(t.p.x<previous,'player can steer away even during aerial kick charge');
 assert.equal(t.p.facing,-1);
 for(let i=0;i<55;i++)t.control(1/60,{dx:-1,dy:0});
 assert.equal(t.p.jumpLandingTriggered,true,'existing heel slam still occurs exactly once');
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
 for(const [kind,hp] of [['raider',84],['assassin',76],['guard',165],['elite',1120],['boss',3900]]){
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
test('basic camera gives symmetric forward view to both right and left facing',()=>{
 g.startRun();t.setEnemies([]);t.p.x=3000;t.p.y=570;t.p.facing=1;
 const right=t.normalCameraTargetX();
 assert.equal(right,3000-465,'right facing preserves the approved 465px hero anchor');
 t.p.facing=-1;
 const left=t.normalCameraTargetX();
 assert.equal(left,3000-(1280-465),'left facing uses matching 815px hero anchor');
 assert.equal((3000-right)+(3000-left),1280,'left/right framing must mirror the full stage width');
 assert(left<right,'camera should move left to expose more world on the left');
 t.setCameraX(right);
 t.followComboCamera(1/60);
 assert(t.getCameraX()<right&&t.getCameraX()>left,'turning must pan smoothly, never snap');
 for(let i=0;i<100;i++)t.followComboCamera(1/60);
 assert(Math.abs(t.getCameraX()-left)<2,'left look-ahead settles to the mirrored anchor');
 t.p.facing=1;
 for(let i=0;i<100;i++)t.followComboCamera(1/60);
 assert(Math.abs(t.getCameraX()-right)<2,'reversing to right restores the original anchor');
});
test('combo-hit camera focus mirrors in both attack directions',()=>{
 const targets=[];
 for(const facing of [1,-1]){
  g.startRun();t.setEnemies([]);t.p.x=4000;t.p.y=570;t.p.facing=facing;
  t.p.hits=3;
  t.registerComboCameraHit({x:t.p.x+facing*145});
  targets.push(t.normalCameraTargetX());
 }
 const [right,left]=targets;
 assert(right>4000-700&&right<4000,'right combo target stays near hero');
 assert(left>4000-1280&&left<4000,'left combo target stays near hero');
 assert(Math.abs((4000-right)+(4000-left)-1280)<.01,'combo camera focus must be symmetrical');
});
test('periodic hero recenter still works and returns to left-facing lead',()=>{
 g.startRun();t.setEnemies([]);t.p.x=3000;t.p.y=570;t.p.facing=-1;
 const home=t.normalCameraTargetX();t.setCameraX(home);
 for(let i=0;i<320;i++){t.updateComboCamera(1/60);t.followComboCamera(1/60)}
 const centered=t.getCameraX();
 assert(centered>home+115,'left recenter sweeps to screen center in opposite direction');
 assert(Math.abs(centered-(t.p.x-640))<45,'periodic pass still centers the left-facing hero');
 for(let i=0;i<165;i++){t.updateComboCamera(1/60);t.followComboCamera(1/60)}
 assert(Math.abs(t.getCameraX()-home)<30,'camera returns to the left-facing look-ahead afterward');
});
test('mirrored camera stops at both world boundaries',()=>{
 for(const [x,facing] of [[64,-1],[31936,1]]){
  g.startRun();t.setEnemies([]);t.p.x=x;t.p.facing=facing;
  t.followComboCamera(1);
  assert(t.getCameraX()>=0&&t.getCameraX()<=32000-1280,'camera must not leave the 32k street');
  if(x===64)assert.equal(t.getCameraX(),0);
  else assert.equal(t.getCameraX(),32000-1280);
 }
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
test('both overdrives and counter improve their special attacks at every rank',()=>{
 g.startRun();
 for(const id of ['jumpspeed','dashspeed','counter']){
  assert(t.MOD_META[id]);
  for(let rank=0;rank<6;rank++){
   const a=t.specialStats(id,rank),b=t.specialStats(id,rank+1);
   for(const key of ['damage','range','lane','push','visual'])assert(b[key]>a[key],id+' rank '+rank+' '+key);
   assert(t.upgradeDescription(id,rank).includes('→'));
  }
 }
});
test('dash and jump overdrives each replace their standalone attack upgrades in the offer pool',()=>{
 g.startRun();t.p.mods=[];
 for(const oldKey of ['slam','dashpower']){
  assert.equal(t.MOD_META[oldKey],undefined,'old attack-only card must be fully removed');
  assert(!html.includes('data-mod="'+oldKey+'"'));
 }
 assert.equal(t.MOD_META.dashspeed.title,'대쉬 오버드라이브');
 assert.equal(t.MOD_META.jumpspeed.title,'점프 오버드라이브');
 for(const [id,oldKey] of [['dashspeed','dashpower'],['jumpspeed','slam']]){
  for(let rank=0;rank<6;rank++){
   const a=t.specialStats(id,rank),b=t.specialStats(id,rank+1);
   assert(b.damage>a.damage&&b.range>a.range&&b.lane>a.lane&&b.push>a.push&&b.visual>a.visual,id+' upgrades every attack effect');
   assert.equal(t.specialStats(oldKey,rank).damage,a.damage,'legacy internal alias must follow the same new rank');
   const desc=t.upgradeDescription(id,rank);
   assert(desc.includes('속도')&&desc.includes('범위')&&desc.includes('넉백'),'upgrade preview must show speed, attack area, and knockback together');
  }
 }
 const before=t.dashMobilityStats(0,0),after=t.dashMobilityStats(0,1);
 assert(after.speed>before.speed&&t.specialStats('dashspeed',1).damage>t.specialStats('dashspeed',0).damage);
 const air=t.jumpMobilityStats(0,0),boost=t.jumpMobilityStats(0,1);
 assert(boost.moveSpeed>air.moveSpeed&&t.specialStats('jumpspeed',1).damage>t.specialStats('jumpspeed',0).damage);
 for(let i=0;i<15;i++){
  t.rewardMenu('mid');
  const offered=node('menu').innerHTML;
  assert(!offered.includes('data-mod="slam"')&&!offered.includes('data-mod="dashpower"'),'neither obsolete card can appear');
 }
});
test('choosing dash/jump overdrive once upgrades both movement and follow-up impact',()=>{
 for(const item of ['dashspeed','jumpspeed']){
  g.startRun();t.p.mods=[];t.setEnemies([]);
  const movement=item==='dashspeed'?()=>t.dashMobilityStats():()=>t.jumpMobilityStats();
  const startMove=movement(),startHit=t.specialStats(item);
  t.rewardMenu('mid');t.selectMod(item);
  assert.equal(t.modRank(item),1);
  const moved=movement(),hit=t.specialStats(item);
  assert((item==='dashspeed'?moved.speed:moved.moveSpeed)>(item==='dashspeed'?startMove.speed:startMove.moveSpeed),'movement improves with one card');
  assert(hit.damage>startHit.damage&&hit.range>startHit.range&&hit.push>startHit.push,'same card also boosts follow-up attack');
  assert.equal(t.p.mods.length,1,'one card grants both benefits without separate skill stacks');
 }
});
test('slam upgrade expands actual landing damage and radius',()=>{
 const result=[];
 for(const rank of [0,3,6]){
  g.startRun();t.p.x=2500;t.p.mods=Array(rank).fill('jumpspeed');
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
  g.startRun();t.p.x=2500;t.p.facing=1;t.p.mods=Array(rank).fill('dashspeed');
  t.p.dashSmash=true;t.p.attack=.3;t.p.moveName='cross';t.p.comboIdx=0;
  const near=t.makeEnemy('raider',t.p.x+100,t.p.y,0),far=t.makeEnemy('raider',t.p.x+265,t.p.y,1);
  near.hp=far.hp=1000;near.maxHp=far.maxHp=1000;t.setEnemies([near,far]);
  t.p.critDrought=0;
  withNormalHit(()=>t.attackCheck());
  results.push([1000-near.hp,1000-far.hp,near.knockVX]);
 }
 assert(results[0][1]>0,'the base dash punch splashes a nearby forward enemy even beyond the direct hitbox');
 assert(results[2][1]>results[0][1],'the ranked dash range and damage make the farther enemy take more damage');
 for(let i=1;i<3;i++){assert(results[i][0]>results[i-1][0]);assert(results[i][2]>results[i-1][2]);}
});
test('dash-punch direct strike damages its primary once and hits nearby forward side-lane enemies',()=>{
 for(const facing of [1,-1]){
  g.startRun();t.p.x=3500;t.p.y=570;t.p.facing=facing;t.p.mods=[];
  t.p.dashSmash=true;t.p.attack=.3;t.p.moveName='cross';t.p.comboIdx=0;
  const primary=t.makeEnemy('raider',t.p.x+facing*100,t.p.y,0);
  const side=t.makeEnemy('raider',t.p.x+facing*190,t.p.y+65,1);
  const rear=t.makeEnemy('raider',t.p.x-facing*80,t.p.y+65,2);
  const far=t.makeEnemy('raider',t.p.x+facing*700,t.p.y+65,3);
  for(const e of [primary,side,rear,far])e.hp=e.maxHp=500;
  t.setEnemies([primary,side,rear,far]);t.attackCheck();
  const primaryDamage=500-primary.hp,sideDamage=500-side.hp;
  assert(primaryDamage>sideDamage&&sideDamage>0,'direct punch beats side-lane splash in damage');
  assert.equal(rear.hp,500,'forward blast cannot damage enemies behind the hero');
  assert.equal(far.hp,500,'out-of-range enemy remains untouched');
  assert(side.knockVX*facing>0&&side.stun>0,'splash victim receives a forward shove and stagger');
  assert(t.getFx().filter(f=>f.kind==='dashPierceSprite').length<=1,'one direct punch cannot duplicate its pierced bitmap');
 }
});
test('dash and counter splash only occur on genuine impact, and never strike the main victim twice',()=>{
 for(const kind of ['dash','counter']){
  g.startRun();t.p.x=3300;t.p.y=570;t.p.facing=1;t.p.mods=[];t.setEnemies([]);
  if(kind==='dash'){
   t.p.dashSmash=true;t.p.attack=.3;t.p.moveName='cross';
   t.attackCheck();assert.equal(t.getFx().filter(f=>f.kind==='dashPierceSprite').length,0,'dash whiff cannot spawn hit VFX or splash');
  }else{
   t.p.riposteStrikeTarget=null;t.attackCheck();
   assert.equal(t.getFx().filter(f=>f.kind==='parryCounterSprite').length,0,'no free counter splash without a target');
  }
  const e=t.makeEnemy('raider',t.p.x+100,t.p.y,0);
  e.hp=e.maxHp=2000;t.setEnemies([e]);
  if(kind==='counter')t.p.riposteStrikeTarget=e;
  t.attackCheck();
  const damage=2000-e.hp;
  if(kind==='counter')assert(Math.abs(damage-45)<.001,'counter primary only takes its original 45 HP without second splash');
  else assert(damage>0&&damage<70,'dash primary does not take additional AoE damage');
 }
});
test('counter splash hits only nearby enemies in front, including side lanes, in either facing',()=>{
 for(const facing of [-1,1]){
  g.startRun();t.p.x=3900;t.p.y=570;t.p.facing=facing;t.p.mods=[];
  const primary=t.makeEnemy('assassin',t.p.x+facing*120,t.p.y,0);
  const side=t.makeEnemy('raider',t.p.x+facing*205,t.p.y+65,1);
  const rear=t.makeEnemy('raider',t.p.x-facing*85,t.p.y+65,2);
  const far=t.makeEnemy('raider',t.p.x+facing*610,t.p.y+65,3);
  for(const e of [primary,side,rear,far])e.hp=e.maxHp=1000;
  t.setEnemies([primary,side,rear,far]);t.p.riposteStrikeTarget=primary;t.attackCheck();
  assert.equal(primary.hp,955,'unchanged primary 45 damage at zero counter rank');
  assert(side.hp<1000&&side.knockVX*facing>0,'nearby forward side-lane foe is damaged and sent away');
  assert.equal(rear.hp,1000,'rear foe cannot be caught by forward counter shockwave');
  assert.equal(far.hp,1000,'enemy outside the forward shockwave keeps full health');
 }
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
  assert(t.p.attackDuration>=.23&&t.p.attackDuration<=.50,'eight-frame strikes should animate faster without zero-duration poses');
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
test('ballistic Foley predecodes, fires at impact and never ducks music',()=>{
 const prior=world.AudioContext,priorMusic=world.__revenantBgm,played=[],gains=[];
 const p=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v}});
 const node=()=>({gain:p(),frequency:{value:0},threshold:{value:0},knee:{value:0},ratio:{value:0},
  attack:{value:0},release:{value:0},playbackRate:{value:1},
  connect(x){return x},disconnect(){},stop(){}});
 let context;
 class FakeAC{
  constructor(){context=this;this.currentTime=12;this.state='running';this.destination=node()}
  createDynamicsCompressor(){return node()}
  createGain(){const v=node();gains.push(v);return v}
  createBiquadFilter(){return node()}
  createBufferSource(){const v=node();v.start=()=>played.push(v);return v}
 }
 world.AudioContext=FakeAC;let ducked=false;
 world.__revenantBgm={duckImpact(){ducked=true}};
 t.seedImpactAudio(new FakeAC(),{punchA:{duration:.33},punchB:{duration:.36},
  punchC:{duration:.41},punchD:{duration:.42},punchE:{duration:.43},punchF:{duration:.44},
  heavy:{duration:.60},parry:{duration:2.1},counter:{duration:.46},upgrade:{duration:.96},reroll:{duration:.68}});
 try{
  const heard=[];
  for(let i=0;i<6;i++){
   const pos=played.length;
   assert.equal(t.playImpactSound('punch'),true,'six shuffled original gunshots play on contact');
   heard.push(played[pos].buffer.duration);
   assert.equal(t.playImpactSound('punch'),false,'normal rapid hit is capped');
   context.currentTime+=.11;
  }
  assert.equal(new Set(heard).size,6,'six attack shots are distinct without repetition');
  let pos=played.length;
  assert.equal(t.playImpactSound('heavy',1.2),true);
  assert.equal(played[pos].buffer.duration,.60,'heavy shot is foremost');
  pos=played.length;
  assert.equal(t.playImpactSound('parry',1.65),true,'swapped explosive parry bypasses impact cooldown');
  assert.equal(played[pos].buffer.duration,2.1,'parry now plays the original long boom from counter');
  pos=played.length;
  assert.equal(t.playImpactSound('counter',1.25),true,'swapped slide counter retains special priority');
  assert.equal(played[pos].buffer.duration,.46,'riposte now plays the metallic slide originally on parry');
  assert(gains.some(v=>Math.abs(v.gain.value-(1.11*.70*.92))<1e-8),'compressed mix preserves safe headroom');
  assert.equal(ducked,false,'sound effects never duck background music');
 }finally{
  if(prior)world.AudioContext=prior;else delete world.AudioContext;
  if(priorMusic)world.__revenantBgm=priorMusic;else delete world.__revenantBgm;
  t.seedImpactAudio(null,{});
 }
});
// The same 4x2 bitmap ground slam is wired to hero landing, elite special
// collision, and the Hunter boss' actual painted slam strike (not their tells).
{
 const rules=[
  "const GROUND_SLAM_ART={",
  "src:'./assets/vfx/project_z_ground_slam_8f_transparent.png'",
  "columns:4,rows:2,frames:8,footX:.5,footY:.8",
  "function spawnGroundSlamFx(x,y,intensity=1,source='hero')",
  "kind:'groundSlamSprite'",
  "const frame=Math.min(7,Math.floor(ratio*8))",
  "ctx.drawImage(bitmap,(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch",
  "spawnGroundSlamFx(p.x,p.y,skill.visual,'hero')",
  "if(kind==='slam')spawnGroundSlamFx(b.x,b.y,1.55,'boss')",
  "spawnGroundSlamFx(e.x+e.face*82,e.y,1.46,'elite')",
  "if(f.kind==='groundSlamSprite')",
  "if(!drawGroundSlamSprite(f))"
 ];
 for(const rule of rules)assert(html.includes(rule),'missing shared ground smash spritesheet integration: '+rule);
 assert(!html.includes("drawGroundSlamSprite(f);fxBurst("),'no double-up geometry on the same slam');
 const begin=html.indexOf("function drawGroundSlamSprite("),
  end=html.indexOf("function heelLandingShockwave(",begin);
 const block=html.slice(begin,end);
 assert(block.includes("width*(ch/cw)"),'4x2 frame maintains authored aspect ratio');
 assert(block.includes("f.y-footAnchor"),'feet remain locked to the actor ground');
 const elite=html.indexOf("spawnGroundSlamFx(e.x+e.face*82,e.y,1.46,'elite')");
 const hit=html.indexOf("e.eliteAttack=true;",elite-1500);
 assert(hit>=0&&hit<elite,'iron mask spawn occurs at special attack collision not warning');
}

console.log(`${checks} combat regression checks passed`);
