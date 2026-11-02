const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),all=['chain','nova','leech','power','crit','guard'];
for(const id of all){
 const png=fs.readFileSync(path.join(root,'assets/vfx/project_z_upgrade_'+id+'_8f.png'));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG '+id);
 assert.equal(png.readUInt32BE(16),2048,'8x 256 columns '+id);
 assert.equal(png.readUInt32BE(20),256,'one row '+id);
 assert(png.length>10000,'non-empty '+id);
}
for(const filename of ['index.html','play-fixed-20261102.html']){
 const src=fs.readFileSync(path.join(root,filename),'utf8');
 assert(src.includes("const Z_UPGRADE_VFX_NAMES=['chain','nova','leech','power','crit','guard']"));
 assert(src.includes("project_z_upgrade_'+k+'_8f.png?v=20261102-clean-alpha-active-v2"));
 assert(src.includes('await Z_UPGRADE_VFX_PRELOAD'),'must load six images before combat');
 assert(src.includes("if(f.kind==='upgradeVfxSprite'){drawUpgradeVfx(f);continue;}"));
 assert(src.includes("f.kind==='basicHitSprite'||f.kind==='upgradeVfxSprite'?realDt"));
 assert(src.includes('frame*cw,0,cw,im.naturalHeight'),'frame cropping');
 for(const marker of [
  "spawnUpgradeVfx('chain',nearby.x","spawnUpgradeVfx('nova',e.x",
  "spawnUpgradeVfx('leech',(e.x+p.x)/2","spawnUpgradeVfx('power',e.x",
  "spawnUpgradeVfx('crit',e.x","spawnUpgradeVfx('guard',p.x"
 ])assert(src.includes(marker),'wired: '+marker);
 assert(src.includes("spawnHealVfx(p.hp-priorHealHp,'leech')"),'actual HP gains show mint healing at hero');
 assert(src.includes("if(Z_UPGRADE_VFX[m])spawnUpgradeVfx(m"),'on upgrade selection');
 assert(src.includes('window.__zUpgradeVfxStatus'),'status exposed');
}
console.log('PASS: six RGBA upgrade 8F bitmaps plus the separate real-HP mint leech recovery hook');
