const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
for(const name of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 const first=html.indexOf("(()=>{'use strict';");
 const last=html.lastIndexOf("\n})();\n\n</script>");
 assert(first>0&&last>first,'locate main game JS');
 new vm.Script(html.slice(first,last+6),{filename:name});
 for(const fragment of [
  'function gainCombatUpgradeCharge(points)','function openCombatUpgrade()',
  "gainCombatUpgradeCharge(9+(p.dashSmash?9:0)",
  "gainCombatUpgradeCharge(e.type==='boss'?60",
  'gainCombatUpgradeCharge(22);','if(openCombatUpgrade())return;',
  'function chooseCombatUpgradeOffers()',
  'while(picks.length<4&&take(pool)){}',
  'function combatRerollCost(){return 70+combatUpgrades.rerolls*45}',
  'function refreshCombatUpgradeOffers()',
  'data-action="rewardRefresh"',
  "else if(a==='rewardRefresh')refreshCombatUpgradeOffers();",
  'grid-template-columns:repeat(4,minmax(0,1fr))!important',
  "if(!rerolled)combatUpgrades.rerolls=0",
  "const intermediate=upgradeReason==='mid'",
  'if(!intermediate)spawnWave()',
  "menuPad.readyAt=Date.now()+(gameState==='reward'?700:180)"
 ])assert(html.includes(fragment),name+' missing '+fragment);
 assert(!html.includes('UPGRADE_MILESTONES'),'old six-step kill threshold removed');
 const start=html.indexOf("let upgradeReason='wave'");
 const end=html.indexOf("let attributeFx=[];",start);
 assert(start>0&&end>start&&end-start<6500,'charge module is isolated');
 const ids=['dashrange','dashspeed','jumpheight','jumpspeed','counter','fire','shock','bleed','ice','power','crit','rush','impact','momentum','chain','nova','vital','regen','leech','guard','haste'];
 const world={
  MOD_META:Object.fromEntries(ids.map(id=>[id,{title:id}])),MOD_LEVEL_CAP:6,
  Math,Number,Date,time:30,gameState:'playing',
  heroEntry:{active:false},deathCinematic:{active:false},
  p:{hp:100,attack:0,parry:0,riposteChasing:false,airAttack:false,mods:[],credits:240},
  slowMotion:0,riposteCinematicTime:0,enemies:[{dead:false}],
  menuReady:()=>true,rewardMenu:(reason,rerolled)=>{world.lastMenu={reason,rerolled}},
  updateHud:()=>{},sound:()=>{},playUpgradeSfx:kind=>{world.lastUiSfx=kind}
 };
 world.modRank=id=>world.p.mods.filter(m=>m===id).length;
 vm.createContext(world);
 vm.runInContext(html.slice(start,end)+"\nthis.testApi={gainCombatUpgradeCharge,canOpenCombatUpgrade,openCombatUpgrade,chooseCombatUpgradeOffers,combatRerollCost,refreshCombatUpgradeOffers,get:()=>combatUpgrades,setSelection:x=>{rewardSelection=x},setReason:x=>{upgradeReason=x}};",world);
 const api=world.testApi;
 api.gainCombatUpgradeCharge(80);
 assert(api.canOpenCombatUpgrade(),'hits unlock growth without wave clear');
 assert(api.openCombatUpgrade(),'open mid-wave upgrade');
 assert.equal(world.gameState,'reward');
 assert.equal(world.lastMenu.reason,'mid');
 assert.equal(api.get().earned,1);
 assert.equal(api.get().threshold,88);
 world.gameState='playing';world.time=32;
 api.gainCombatUpgradeCharge(180);
 assert(!api.canOpenCombatUpgrade(),'cooldown prevents repeated UI interruptions');
 world.time=50;
 assert(api.canOpenCombatUpgrade(),'score queued until recovery');
 world.p.mods=['power','power','guard'];
 const offered=api.chooseCombatUpgradeOffers();
 assert.equal(offered.length,4);
 assert.equal(new Set(offered.map(o=>o.id)).size,4);
 assert(offered.some(o=>o.id==='power'||o.id==='guard'),'offer existing stack');
 assert(offered.some(o=>!['power','guard'].includes(o.id)),'include unfamiliar upgrades');
 const lastIds=api.get().lastOffers.slice();
 const again=api.chooseCombatUpgradeOffers();
 assert.equal(again.length,4);
 assert(!again.some(o=>lastIds.includes(o.id)),'show new set when 21 upgrades available');
 world.gameState='reward';
 api.setSelection(null);api.setReason('mid');
 assert.equal(api.combatRerollCost(),70);
 assert(api.refreshCombatUpgradeOffers(),'spend credits to reroll');
 assert.equal(world.p.credits,170);
 assert.equal(api.combatRerollCost(),115);
 assert.equal(world.lastMenu.reason,'mid');
 assert(world.lastMenu.rerolled,'reroll preserves current mode');
 assert.equal(world.lastUiSfx,'reroll','paid refresh uses the dedicated UI cue, never parry or a gunshot');
 world.p.credits=10;
 assert(!api.refreshCombatUpgradeOffers(),'cannot spend unavailable currency');
 assert.equal(world.p.credits,10);
 api.setSelection({id:'crit'});
 assert(!api.refreshCombatUpgradeOffers(),'cannot reroll during animation');
}
console.log('PASS: syntax, non-wave charge upgrades, 4 varied choices, paid ₩ refresh, anti-spam and both game entrypoints');
