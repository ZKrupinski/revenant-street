'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const asset=path.join(root,'assets/enemies/redhood-intruder/special-fullframe.webp');
const atlas=fs.readFileSync(asset);
const report=JSON.parse(fs.readFileSync(path.join(root,'assets/enemies/redhood-intruder/special-fullframe-bounds.json'),'utf8'));
assert.equal(atlas.toString('ascii',0,4),'RIFF','packed 8-frame red-hood atlas is WebP');
assert.equal(atlas.toString('ascii',8,12),'WEBP');
assert.equal(atlas.toString('ascii',12,16),'VP8X');
assert.equal(atlas.readUIntLE(24,3)+1,2432,'four 608px independent columns');
assert.equal(atlas.readUIntLE(27,3)+1,1216,'two 608px independent rows');
assert.equal(report.frames.length,8,'all 8 original special frames are preserved');
assert.deepEqual(report.frames.map(f=>f.foot),[522,525,491,518,492,500,489,499]);
for(const f of report.frames){
 assert(f.bbox&&Math.min(...f.margins)>=18,'frame '+f.frame+' has safe uncropped margins');
 assert(f.bbox[2]>f.bbox[0]&&f.bbox[3]>f.bbox[1], 'frame '+f.frame+' is nonempty');
}
assert(report.frames[2].recovered_neighbor_pixels>2000,'the third dash frame recovers the dislocated hood and glove');
assert(report.frames[5].recovered_neighbor_pixels>1000,'the sixth impact frame recovers displaced red trail');
assert(report.frames[6].recovered_neighbor_pixels>1000,'the seventh recovery frame has its own VFX');
assert(html.includes("key==='special'?'special-fullframe.webp?v=redhood-safe-eight-20261101'"),
 'the live intruder special points to the restored sprite sheet, not its clipped source');
assert(html.includes("if(name==='hit'||name==='death'||name==='attack'||name==='special')"),
 'runtime must skip destructive component eroding on already repaired sprite');
assert(html.includes('special:[522,525,491,518,492,500,489,499]'),
 'all aerial poses use corrected native ground-reference anchors');
assert(html.includes('intruder=(preview|entry)'),'two real gameplay QA routes available');
assert(html.includes("intruderEntryImage.src='./assets/enemies/redhood-ambush-entry-8.webp'"),
 'foreground entrance is still the original unmodified cinematic art');
console.log('PASS: red-hood special 8/8, recovered neighbor fragments, safe bitmap boundaries, actual render atlas, unchanged foreground entrance');
