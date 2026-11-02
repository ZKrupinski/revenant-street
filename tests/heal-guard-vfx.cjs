'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const sprite=fs.readFileSync(path.join(root,'assets/vfx/project_z_heal_mint_8f.png'));
assert.equal(sprite.subarray(0,8).toString('hex'),'89504e470d0a1a0a','dedicated raster PNG');
assert.equal(sprite.readUInt32BE(16),1280);
assert.equal(sprite.readUInt32BE(20),160);
assert.equal(sprite[24],8,'8-bit');
assert.equal(sprite[25],6,'RGBA with alpha');
let pos=8,parts=[];
while(pos<sprite.length){
 const n=sprite.readUInt32BE(pos),type=sprite.toString('ascii',pos+4,pos+8);
 if(type==='IDAT')parts.push(sprite.subarray(pos+8,pos+8+n));
 pos+=n+12;if(type==='IEND')break;
}
const decoded=zlib.inflateSync(Buffer.concat(parts)),line=1280*4+1;
assert.equal(decoded.length,160*line);
for(let frame=0;frame<8;frame++){
 let pixels=0,contact=0;
 for(let y=0;y<160;y++){
  assert.equal(decoded[y*line],0,'unfiltered raster row');
  for(let x=0;x<160;x++){
   const a=decoded[y*line+1+(frame*160+x)*4+3];
   if(a>5)pixels++;
   if(x<9||x>=151||y<9||y>=151)contact+=a;
  }
 }
 assert(pixels>120,'healing pose has visible mint energy: '+frame);
 assert.equal(contact,0,'all eight sprite poses have independent transparent margins: '+frame);
}
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const first=html.indexOf("(()=>{'use strict';"),last=html.lastIndexOf('\n})();\n\n</script>');
 assert(first>0&&last>first);new vm.Script(html.slice(first,last+6),{filename:file});
 for(const fragment of [
  "project_z_heal_mint_8f.png?v=20261102-soft-healing-v1",
  "['치료 민트 8프레임 비트맵',()=>ensureBitmapDecoded(Z_HEAL_ART.image)]",
  "if(f.kind==='healVfxSprite'){drawHealVfx(f);continue;}",
  "spawnHealVfx(p.hp-hpBeforeUpgrade,'burst')",
  "spawnHealVfx(p.hp-hpBeforeFinisher,'finisher')",
  "spawnHealVfx(p.hp-priorHealHp,'leech')",
  "spawnHealVfx(p.regenAccumulated,'regen')",
  "if(!(amount>.001)||gameState==='dying')return false"
 ])assert(html.includes(fragment),'missing real-HP healing / tiny reactive guard feature: '+fragment);
 assert(!html.includes("drawUpgradeVfxLoop('guard',x"),'passive guard orb must disappear');
 assert(!html.includes("spawnUpgradeVfx('guard'"),'no defensive VFX even on enemy contact or upgrade');
 assert(!html.includes("spawnParryShieldFx("),'shield selection bubble removed');
 assert(!html.includes("f.kind==='parryShield'"),'obsolete shield renderer removed');
 assert(html.includes("const damageTaken=dmg*clamp(1-modRank('guard')*.09"),'armor mechanics untouched');
 assert(!html.includes("spawnUpgradeVfx('guard',p.x,p.y-130"),'regen cannot fake a shield glow');
 const start=html.indexOf('const Z_HEAL_ART='),end=html.indexOf('function spawnUpgradeVfx(',start);
 assert(start>0&&end>start,'isolated healing artwork and draw functions');
 const draws=[],texts=[];
 const world={
  Image:class{
   constructor(){this.complete=false;this.naturalWidth=1280;this.naturalHeight=160}
   set src(s){this._src=s;this.complete=true;this.onload?.()}
   get src(){return this._src}
  },window:{},gameState:'playing',p:{x:450,y:570},fx:[],time:10,Math,
  clamp:(a,b,c)=>Math.max(b,Math.min(c,a)),floatText(...x){texts.push(x)},
  ctx:{save(){},restore(){},translate(){},drawImage(...args){draws.push(args)}}
 };
 vm.createContext(world);
 vm.runInContext(html.slice(start,end)+'\nthis.spawnHeal=spawnHealVfx;this.drawHeal=drawHealVfx;',world);
 assert.equal(world.spawnHeal(0),false,'no visual healing with 0 actual HP restored');
 assert.equal(world.fx.length,0);
 assert.equal(world.spawnHeal(11,'burst'),true);
 assert.equal(world.fx.length,1);
 assert.equal(texts.length,1,'large confirmed heal gives +HP popup');
 const healing=world.fx[0];
 for(let frame=0;frame<8;frame++){
  healing.life=healing.maxLife*(1-(frame+.2)/8);
  assert.equal(world.drawHeal(healing),true);
  assert.equal(draws.at(-1)[1],frame*160,'8 successive 160px source cells');
  assert(Math.abs(draws.at(-1)[7]-(170*healing.scale*1.20))<1e-6,'healing becomes 20% larger while keeping the exact RGBA frame crop');
 }
 assert.equal(world.spawnHeal(1,'burst'),false,'healing FX is rate-limited');
 world.time=12;
 assert.equal(world.spawnHeal(1,'regen'),true);
 assert.equal(world.spawnHeal(1,'regen'),false,'regen must not spam particles every 60Hz tick');
 world.gameState='dying';
 assert.equal(world.spawnHeal(10,'finisher'),false,'no green pulse over death cinematic');
}
console.log('PASS: 8 clean transparent mint healing frames, accurate HP-only triggers, no defensive shield artwork at any time and preload on both entrypoints');
