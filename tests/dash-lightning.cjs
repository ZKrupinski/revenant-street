'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sprite=fs.readFileSync(path.join(root,'assets/vfx/project_z_dash_lightning_8f.png'));
assert.equal(sprite.subarray(0,8).toString('hex'),'89504e470d0a1a0a','raster PNG, not procedural vectors');
assert.equal(sprite.readUInt32BE(16),2172,'4 columns of 543px frames');
assert.equal(sprite.readUInt32BE(20),724,'2 rows of 362px frames');
assert(sprite.includes(Buffer.from('tRNS')),'transparent margins are encoded in the PNG');
assert(sprite.length>25000&&sprite.length<120000,'real authored sprite art is included efficiently');
assert(html.includes("src:'./assets/vfx/project_z_dash_lightning_8f.png'"),'game loads the authored lightning sheet');
assert(html.includes("['대쉬 후 번개 관통 8프레임 비트맵',()=>ensureBitmapDecoded(DASH_PIERCE_ART.image)]"),
 'required art preload must decode lightning before game start');
const begin=html.indexOf('const DASH_PIERCE_ART={');
const end=html.indexOf('function heelLandingShockwave(',begin);
assert(begin>0&&end>begin,'shared eight-frame renderer and spawner exist');
const draws=[],transforms=[];
const world={
 Image:class {
  constructor(){this.complete=false;this.naturalWidth=2172;this.naturalHeight=724}
  set src(s){this._src=s;this.complete=true;this.onload?.()}
  get src(){return this._src}
 },
 ctx:{save(){},restore(){},translate(x,y){transforms.push(['translate',x,y])},
  scale(x,y){transforms.push(['scale',x,y])},drawImage(...args){draws.push(args)}},
 fx:[],clamp:(v,min,max)=>Math.min(max,Math.max(min,v)),modRank:()=>0
};
vm.createContext(world);
vm.runInContext(html.slice(begin,end)+'\nthis.drawDash=drawDashPierceSprite;this.spawnDash=spawnDashPierceFx;',world);
world.spawnDash({x:100,y:550,facing:1},{x:265,y:550});
assert.equal(world.fx.length,1,'one sprite per successful dash attack, not one per nearby enemy');
const f=world.fx[0];
assert.equal(f.kind,'dashPierceSprite');
assert.equal(f.dir,1);
assert.equal(f.y,438,'electric spear pierces chest-height enemy plane');
for(let i=0;i<8;i++){
 const progress=(i+.25)/8;
 f.life=f.maxLife*(1-progress);
 assert.equal(world.drawDash(f),true);
}
assert.equal(draws.length,8,'all eight source cells render');
for(let i=0;i<8;i++){
 const args=draws[i];
 assert.equal(args[1],(i%4)*543);
 assert.equal(args[2],Math.floor(i/4)*362);
 assert.equal(args[3],543);
 assert.equal(args[4],362);
}
world.spawnDash({x:600,y:550,facing:-1},{x:430,y:550});
const left=world.fx.at(-1);
assert.equal(left.dir,-1);
assert.equal(world.drawDash(left),true);
assert(transforms.some(([op,x,y])=>op==='scale'&&x===-1&&y===1),
 'left attacks flip the authored right-facing sprite horizontally');
assert(html.includes('if(p.dashSmash&&hits===0)spawnDashPierceFx(p,e)'),
 'lightning plays only at the first actual collision of dash-followup strike');
assert(!html.includes("spawnDashPierceFx(p,e); // when beginning dash"),
 'not played on button press or whiff');
assert(html.includes("if(f.kind==='dashPierceSprite'){drawDashPierceSprite(f);continue;}"),
 'sprite renders in the normal world-space effect pass, over the enemy');
console.log('PASS: 8-frame transparent lightning, decoded on start, first dash hit only, full sequence and bilateral facing');
