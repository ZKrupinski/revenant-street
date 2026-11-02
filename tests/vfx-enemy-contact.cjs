'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const start=html.indexOf('function spawnEnemyContactVfx('),end=html.indexOf('// Only sprite-based VFX:',start);
 assert(start>0&&end>start,'separate contact renderer and source atlas isolated');
 const fx=[],moves=[];
 const ctx={save(){},restore(){},translate(x,y){moves.push(['translate',x,y])},
  scale(x,y){moves.push(['scale',x,y])},rotate(n){moves.push(['rotate',n])},
  drawImage(...args){moves.push(['draw',...args])}};
 const source={naturalWidth:2048,naturalHeight:256,complete:true},names=['nova','power','crit','chain','leech','guard'];
 const assets=Object.fromEntries(names.map(n=>[n,{image:source,ready:true,drawn:0}]));
 const world={fx,p:{facing:1},Z_UPGRADE_VFX:assets,ctx,
  bodyHalfX:()=>90,clamp:(x,min,max)=>Math.max(min,Math.min(max,x)),Math};
 vm.createContext(world);
 vm.runInContext(html.slice(start,end)+'\nthis.contact=spawnEnemyContactVfx;this.paint=drawUpgradeVfx;',world);
 const enemy={x:600,y:560,z:0,dead:false};
 assert(world.contact('nova',enemy,1,.32),'nova impact at enemy');
 let shot=fx.at(-1);
 assert(shot.x>enemy.x&&shot.y<enemy.y-80,'floor-splash sprite anchored forward at hit elevation');
 assert(shot.rotation>1.25&&shot.rotation<1.4,'nova is rotated upward into a collision, about 75 degrees');
 assert.equal(shot.contactEnemy,enemy);
 assert(world.paint(shot),'real painted sprite is drawn');
 assert(moves.some(m=>m[0]==='rotate'&&m[1]===shot.rotation),'canvas applies contact rotation');
 assert(moves.some(m=>m[0]==='draw'&&m[4]===256),'draws a single 8F source cell, no atlas bleeding');
 world.p.facing=-1;
 assert(world.contact('power',enemy,1,.32),'power collides from the other side');
 assert.equal(fx.length,1,'only one upgraded impact per enemy, not several overlapping circles');
 shot=fx[0];
 assert(shot.x<enemy.x,'mirrored contact is on enemy left side');
 assert.equal(shot.dir,-1,'left-facing contact is flipped as well as rotated');
 assert(shot.rotation>1.25,'floor-origin gold eruption is turned toward the enemy');
 assert(world.contact('crit',enemy,1,.30),'red collision also replaces overlapping gold');
 assert.equal(fx.length,1);
 assert.equal(fx[0].upgrade,'crit');
 enemy.dead=true;
 assert(world.contact('nova',enemy,1,.32),'killing blow retains collision artwork');

 // All four elements still inflict damage; the art cycles one at a time
 // instead of painting several floor circles across the same enemy.
 const first=html.indexOf('function createModImpact(e){');
 const last=html.indexOf('const MOD_STATUS_STATES=',first);
 assert(first>0&&last>first);
 const art=[],world2={attributeFx:art,p:{facing:1,mod:'none'},
  modRank:id=>['fire','shock','bleed','ice'].includes(id)?1:0,
  rnd:(a,b)=>(a+b)/2,spawnModBitmap(){},Math};
 vm.createContext(world2);vm.runInContext(html.slice(first,last)+'\nthis.create=createModImpact;',world2);
 const foe={x:520,y:560,z:0};
 for(let i=0;i<8;i++){
  world2.create(foe);
  assert.equal(world2.attributeFx.length,1,'at most one visible element from four installed buffs');
  assert.equal(world2.attributeFx[0].mod,['fire','shock','bleed','ice'][i%4],'successive impacts rotate through all four elements');
 }
 world2.create(foe);
 assert.equal(world2.attributeFx[0].rotation,1.31,'nova fire element is angled upright');
 assert.equal(world2.attributeFx[0].target,foe);
 assert(!html.includes('drawUpgradeVfxLoop(Z_ELEMENT_IMPACT_SPRITES[mod]'),'hero no longer shows ground-based elemental eruptions');
 assert(!html.includes("spawnUpgradeVfx('guard'"),'removed defensive bubble never returns');
 assert(html.includes("spawnGroundSlamFx(p.x,p.y,skill.visual,'hero')"),'real ground slam continues to land on actual floor');
}
console.log('PASS: floor-origin PNGs tilt 75 degrees at mirrored victim contact, one upgrade and one element layer per target, no torso stacking or lost final-hit FX');
