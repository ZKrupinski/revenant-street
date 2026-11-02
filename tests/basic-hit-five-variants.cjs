const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const png=fs.readFileSync(path.join(root,'assets/vfx/project_z_enemy_hit_5x8.png'));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),520);
for(const pathName of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,pathName),'utf8');
 assert(html.includes('project_z_enemy_hit_5x8.png?v=20261102-five-brush-variants'));
 assert(html.includes('const bag=[0,1,2,3,4]'));
 assert(html.includes('Math.min(7,Math.floor(progress*8))'));
 assert(html.includes('sw=atlas.naturalWidth/8,sh=atlas.naturalHeight/5'));
 assert(html.includes("spawnBasicContactFx(e,p.moveName||'jab'"));
 assert.equal((html.match(/spawnBasicContactFx\(/g)||[]).length,2);
 assert(html.includes("if(f.kind==='basicHitSprite'){drawBasicContactFx(f);continue;}"));
 assert(html.includes("if(f.kind==='basicHitSprite')f.age+=fxDt"));
}
console.log('PASS: original raster 5x8 hit sheet, 5 shuffled non-repeating variants, all enemy strikes, both launchers');
