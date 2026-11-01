'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sprite=path.join(root,'assets/vfx/project_z_ground_slam_8f_transparent.png');
const raw=fs.readFileSync(sprite);
assert.equal(raw.subarray(0,8).toString('hex'),'89504e470d0a1a0a','original RGBA PNG is present');
assert.equal(raw.toString('ascii',12,16),'IHDR','original spritesheet has PNG dimensions');
assert.equal(raw.readUInt32BE(16),2560,'4 columns × 640px, no cropping');
assert.equal(raw.readUInt32BE(20),800,'2 rows × 400px, no cropping');
assert.equal(raw[25],6,'true-color PNG with alpha; transparent empty margin remains transparent');
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),
 '21be66bd5f26137f4670f2bcde652725245618a65c889d9c2af4b9ccb3a93241',
 'asset remains pixel-exact to the approved source sheet');
const rules=[
 "src:'./assets/vfx/project_z_ground_slam_8f_transparent.png'",
 'columns:4,rows:2,frames:8,footX:.5,footY:.8',
 "function spawnGroundSlamFx(x,y,intensity=1,source='hero')",
 "kind:'groundSlamSprite'",
 'Math.min(7,Math.floor(ratio*8))',
 'bitmap.naturalWidth/4,ch=bitmap.naturalHeight/2',
 'const footAnchor=height*.8',
 "spawnGroundSlamFx(p.x,p.y,skill.visual,'hero')",
 "if(kind==='slam')spawnGroundSlamFx(b.x,b.y,1.55,'boss')",
 "spawnGroundSlamFx(e.x+e.face*35,e.y,1.20,'elite')",
 "spawnGroundSlamFx(e.x,e.y,1.40,'elite')",
 "if(f.kind==='groundSlamSprite')",
 "['지면강타 8프레임 비트맵',()=>ensureBitmapDecoded(GROUND_SLAM_ART.image)]"
];
for(const x of rules)assert(html.includes(x),'missing shared ground-slam source, anchor, or combat hookup: '+x);
assert(!html.includes("spawnModBitmap('red',e.x,e.y-32,3.45"),'old overlapping red-hood explosion removed');
console.log('PASS: original 2560×800 alpha sprite, 8 frames, foot anchor, hero + iron-mask + red-hood + boss impact events');
