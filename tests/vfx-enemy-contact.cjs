'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const slotBegin=html.indexOf('const Z_ENEMY_FX_SLOTS=');
 const slotEnd=html.indexOf('const MOD_STATUS_STATES=',slotBegin);
 const contactBegin=html.indexOf('function spawnEnemyContactVfx(');
 const contactEnd=html.indexOf('// Only sprite-based VFX:',contactBegin);
 assert(slotBegin>0&&slotEnd>slotBegin&&contactBegin>0&&contactEnd>contactBegin);
 const slots=html.slice(slotBegin,slotEnd);
 const bursts=html.slice(contactBegin,contactEnd);
 const fx=[],transforms=[],paint=[];
 const ctx={save(){},restore(){},translate(x,y){transforms.push(['translate',x,y])},
  scale(x,y){transforms.push(['scale',x,y])},rotate(v){transforms.push(['rotate',v])},
  drawImage(...args){paint.push(args)}};
 const src={naturalWidth:2048,naturalHeight:256,complete:true},names=['nova','power','crit','chain','leech','guard'];
 const assets=Object.fromEntries(names.map(n=>[n,{image:src,ready:true,drawn:0}]));
 const world={fx,p:{facing:1},Z_UPGRADE_VFX:assets,ctx,Math,
  clamp:(v,min,max)=>Math.min(max,Math.max(min,v))};
 vm.createContext(world);
 vm.runInContext(slots+bursts+'\nthis.hit=spawnEnemyContactVfx;this.draw=drawUpgradeVfx;this.getSlot=enemyFxSlot;',world);
 const e={x:600,y:560,z:0,dead:false};
 assert(world.hit('nova',e,1,.32));
 assert.equal(fx.length,1);
 assert(fx[0].x>e.x&&fx[0].rotation>1.3,'upright ground splash hits forward victim side');
 world.draw(fx[0]);assert.equal(paint.at(-1)[3],256,'draw exactly one authored source cell');
 assert(transforms.some(x=>x[0]==='rotate'&&x[1]>1.3),'actual canvas rotation is applied');
 world.p.facing=-1;
 assert(world.hit('power',e,1,.32));
 assert.equal(fx.length,2,'power and nova coexist independently');
 assert(fx[1].x<e.x&&fx[1].dir===-1,'enemy contact mirrors on left-facing hit');
 assert(world.hit('crit',e,1,.30));
 assert.equal(fx.length,3,'crit, power and nova coexist');
 const before=fx.find(f=>f.upgrade==='power');
 assert(world.hit('crit',e,1,.36));assert.equal(fx.length,3,'same-type repeat refreshes only the matching effect');
 assert(fx.includes(before),'power is preserved by repeated critical hit');
 assert.equal(fx.filter(f=>f.upgrade==='crit').length,1);
 assert(world.hit('chain',e,1,.33));assert.equal(fx.length,4,'electric chain also coexists');
 const chain=fx.find(f=>f.upgrade==='chain'),crit=fx.find(f=>f.upgrade==='crit');
 world.draw(chain);const chainWidth=paint.at(-1)[7];
 world.draw(crit);const critWidth=paint.at(-1)[7];
 assert.equal(chainWidth,218*1.95,'electric contact is 50% bigger than balanced 1.30 scale');
 assert.equal(critWidth,218*1.86,'critical contact is 43% bigger than balanced 1.30 scale');
 assert.notEqual(chain.x,crit.x,'electric and critical have separate location slots');
 e.dead=true;assert(world.hit('leech',e,1,.32),'final-hit sprite can still draw on a defeated enemy');

 const elementBegin=html.indexOf('function createModImpact(e){');
 const elementEnd=html.indexOf('const Z_ENEMY_FX_SLOTS=',elementBegin);
 assert(elementBegin>0&&elementEnd>elementBegin);
 const ctx2={attributeFx:[],p:{facing:1,mod:'none'},Math,
  modRank:id=>['fire','shock','bleed','ice'].includes(id)?2:0,spawnModBitmap(){}};
 vm.createContext(ctx2);
 vm.runInContext(slots+html.slice(elementBegin,elementEnd)+'\nthis.spawnElements=createModImpact;',ctx2);
 const foe={x:530,y:550,z:0};
 ctx2.spawnElements(foe);
 assert.deepEqual(Array.from(ctx2.attributeFx,x=>x.mod),['fire','shock','bleed','ice'],
  'all four equipped elements show immediately on a single hit');
 assert.equal(new Set(ctx2.attributeFx.map(f=>[f.x,f.y].join(':'))).size,4,
  'all elemental effects have independent contact slots');
 const previous=ctx2.attributeFx.find(f=>f.mod==='fire');
 ctx2.spawnElements(foe);
 assert.equal(ctx2.attributeFx.length,4,'repeat attack refreshes each kind, without accumulation');
 assert(!ctx2.attributeFx.includes(previous),'same-type impact is refreshed');
 assert(ctx2.attributeFx.find(f=>f.mod==='fire').rotation>1.3,'fire splash remains upright');
 assert(!html.includes("spawnUpgradeVfx('guard'"),'removed defense shield never returns');
 assert(html.includes("spawnGroundSlamFx(p.x,p.y,skill.visual,'hero')"),'jump ground effect still stays on floor');
 assert(html.includes('const w=318,h=296;')&&html.includes('const width=f.width,height=width*(sh/sw)*.81;'),
  'parry and counter are not enlarged');
}
console.log('PASS: simultaneous elemental hits + four status sectors; per-type refresh; separate amplified electric and critical VFX; original parry/counter scales');
