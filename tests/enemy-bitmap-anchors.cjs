'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const expected={
 raider:[280,390],assassin:[280,390],guard:[320,440],
 intruder:[350,480],elite:[400,540],boss:[480,650]
};
for(const name of ['hit_explosion','death_evaporation']){
 const file=fs.readFileSync(path.join(root,'assets/vfx/project_z_enemy_'+name+'_8f.png'));
 assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' is real PNG');
 assert.equal(file.readUInt32BE(16),2048,'four 512px columns: '+name);
 assert.equal(file.readUInt32BE(20),1024,'two 512px rows: '+name);
 assert(file.length>500000,'non-empty full-resolution source: '+name);
}
const start=html.indexOf('const Z_ENEMY_FX_SIZES=');
const end=html.indexOf('function spawnParrySuccessFx(',start);
assert(start>=0&&end>start,'new effect anchors extracted without other combat modules');
const draws=[],fx=[];
const ctx={globalCompositeOperation:'source-over',globalAlpha:1,save(){},restore(){},
 drawImage(...a){draws.push(a)}};
const atlas={complete:true,naturalWidth:2048,naturalHeight:1024};
const world={Math,fx,ctx,window:{},W:1280,cameraX:0,time:1,
 p:{moveName:'jab',facing:1,dashSmash:false,counterBoost:false,airAttack:false},
 Z_ENEMY_BITMAP_ART:{hit:{image:atlas,duration:.27},death:{image:atlas,duration:.66}},
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 rnd:(a,b)=>(a+b)/2,bodyHalfX:()=>70};
vm.createContext(world);vm.runInContext(html.slice(start,end),world);
const makeEnemy=(type,z=77)=>({type,x:650,y:580,z,renderX:650,renderY:580,dead:false});
for(const [type,[hitSize,deathSize]] of Object.entries(expected)){
 const e=makeEnemy(type);
 world.time+=1;
 assert.equal(world.spawnEnemyHitBitmap(e,25),true,'hit spawn '+type);
 const hit=fx.at(-1);
 assert.equal(hit.kind,'enemyHitBitmap');
 assert.equal(hit.width,hitSize,'hit scale '+type);
 const height=world.zEnemyFxSize(e).height;
 assert.equal(hit.y,580-77-height*.60,'jab strike point at torso '+type);
 world.p.moveName='lowkick';
 world.time+=1;
 assert.equal(world.spawnEnemyHitBitmap(e,25),true);
 assert.equal(fx.at(-1).y,580-77-height*.25,'low kick near leg '+type);
 world.p.moveName='headbutt';
 world.time+=1;
 assert.equal(world.spawnEnemyHitBitmap(e,25),true);
 assert.equal(fx.at(-1).y,580-77-height*.80,'head attack higher '+type);
 world.p.moveName='jab';
 world.time+=1;
 assert.equal(world.spawnEnemyHitBitmap(e,85),true);
 assert.equal(fx.at(-1).width,hitSize*1.1,'heavy/critical scale '+type);
 assert.equal(world.spawnEnemyDeathBitmap(e),true);
 const death=fx.at(-1);
 assert.equal(death.kind,'enemyDeathBitmap');
 assert.equal(death.width,deathSize,'death scale '+type);
 assert.equal(death.x,650,'ground X pinned '+type);
 assert.equal(death.footY,580,'death ignores airborne Z '+type);
 assert.equal(world.spawnEnemyDeathBitmap(e),false,'no duplicate death '+type);
 for(let frame=0;frame<8;frame++){
  death.age=(frame+.25)/8*death.maxLife;
  draws.length=0;
  world.drawEnemyBitmapFx(death);
  assert.equal(draws.length,1,'one frame for '+type+' frame '+frame);
  const d=draws[0];
  assert.deepEqual(d.slice(1,5),[(frame%4)*512,Math.floor(frame/4)*512,512,512],
   'exact cell without adjacent frame bleed '+type+':'+frame);
  assert.equal(d[6],580-77-deathSize*422/512+Math.max(35,Math.min(60,deathSize*.10)),
   'ash pile aligns below the currently airborne sprite feet '+type+':'+frame);
  assert.equal(d[7],deathSize);assert.equal(d[8],deathSize);
 }
 // A dying body keeps moving during knockback; the VFX must FOLLOW its art,
 // not remain where HP first reached zero.
 e.renderX=735;e.renderY=552;e.z=31;
 death.age=death.maxLife*.35;
 draws.length=0;world.drawEnemyBitmapFx(death);
 assert.equal(death.x,735,'death VFX X follows moving sprite '+type);
 assert.equal(death.footY,521,'death VFX Y follows moving airborne foot '+type);
 assert.equal(draws[0][5]+deathSize/2,735,'effect stays centered underneath sprite '+type);
 e.renderX=700;e.renderY=570;e.z=0;draws.length=0;
 world.drawEnemyBitmapFx(death);
 assert.equal(death.x,700,'death effect follows continuing slide '+type);
 assert.equal(death.footY,570,'death effect settles with landed sprite '+type);
}
const e=makeEnemy('raider',0);
world.p.moveName='jab';world.time+=1;
const before=fx.length;
world.rnd=(a,b)=>b;
world.spawnEnemyHitBitmap(e,25);
const first=fx.at(-1);
assert(first.x>e.x,'jitter is applied once at the true impact point');
draws.length=0;first.age=.04;world.drawEnemyBitmapFx(first);const originalDrawX=draws[0][5];
draws.length=0;first.age=.09;world.drawEnemyBitmapFx(first);
assert.equal(draws[0][5],originalDrawX,'random offset never changes during 8-frame playback');
world.cameraX=0;
const edge=makeEnemy('boss',0);edge.x=5;edge.renderX=5;
world.spawnEnemyDeathBitmap(edge);
const d=fx.at(-1);draws.length=0;world.drawEnemyBitmapFx(d);
assert(Math.abs((draws[0][5]+d.width/2)-edge.x)<=36,'edge correction limited to 36px, preserve feet');
assert(html.includes("if(e.hp>0)spawnEnemyHitBitmap(e,dmg);"),'only living enemy takes hit burst');
assert(html.includes('spawnEnemyDeathBitmap(e);'),'death explosion spans all enemy types');
console.log('PASS: six enemy sizes, hit-height offsets, death sprite-follow anchors through knockback/landing, 8-frame crop safety');
