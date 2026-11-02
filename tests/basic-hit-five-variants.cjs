const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),png=fs.readFileSync(path.join(root,'assets/vfx/project_z_enemy_hit_5x8.png'));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),520);
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert(html.includes('project_z_enemy_hit_5x8.png?v=20261102-visible-impact-v2'),'cache invalidation');
 assert(html.includes("spawnBasicContactFx(e,p.moveName||'jab'"),'all hits emit');
 assert.equal((html.match(/spawnBasicContactFx\(/g)||[]).length,2,'only one emission site');
 assert(!html.includes("if(!p.dashSmash&&!p.counterBoost&&!p.airAttack&&p.airKickPhase!=='dive')\n"),'no stray conditional intercepts combat');
 assert(html.includes('brightness(2.1) contrast(1.13)'),'bright raster');
 assert(html.includes('main?rnd(.30,.35):rnd(.22,.27)'),'linger long enough to see');
 assert(html.includes('main?rnd(228,262):rnd(105,128)'),'visible at playing resolution');
 assert(html.includes("if(f.kind==='basicHitSprite'){drawBasicContactFx(f);continue;}"),'draw path');
 assert(html.includes("if(f.kind==='basicHitSprite')f.age+=fxDt"),'animated');
 const begin=html.indexOf('const BASIC_HIT_FIVE='),end=html.indexOf('function spawnParryCounterFx(',begin);
 assert(begin>0&&end>begin,'standalone bitmap renderer found');
 const script=html.slice(begin,end);
 const drawn=[],fx=[],ctx={globalAlpha:1,globalCompositeOperation:'source-over',filter:'none',
   save(){},restore(){},translate(){},scale(){},rotate(){},
   drawImage(...args){drawn.push({args,filter:this.filter,alpha:this.globalAlpha,composite:this.globalCompositeOperation})}};
 class MockImage{
  constructor(){this.complete=true;this.naturalWidth=1280;this.naturalHeight=520;}
  set src(value){this.url=value;if(this.onload)this.onload()}
 }
 const enemy={x:480,y:550,z:0};
 const world={Image:MockImage,window:{},fx,ctx,Math,
  p:{facing:1,moveName:'hook'},Z_KICK_MOVES:new Set(),Z_HEAD_MOVES:new Set(),
  rnd:(a,b)=>(a+b)/2,bodyHalfX:()=>55,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  img:{},PARRY_COUNTER_ART:{image:null},enemy};
 vm.createContext(world);vm.runInContext(script,world);
 const five=new Set();
 for(let j=0;j<5;j++)five.add(vm.runInContext('randomHitVariant(enemy)',world));
 assert.equal(five.size,5,'five unique looks before repeating');
 for(let i=0;i<5;i++){
  assert(vm.runInContext("spawnBasicContactFx(enemy,'hook',false)",world),'spawn');
  const sprites=fx.splice(0);
  assert(sprites.length>0,'sprite instance created');
  const f=sprites[0];f.variant=i;f.age=f.duration*.35;
  world.f=f;vm.runInContext('drawBasicContactFx(f)',world);
  const draw=drawn.at(-1);
  assert(draw,'at least one drawImage for each hit');
  assert(draw.args[0] instanceof MockImage,'real image sprite source');
  assert(draw.alpha>.90,'bright impact');
  assert.equal(draw.composite,'screen','raster visible over fighters');
  assert(draw.filter.includes('brightness(2.1)'),'brighten pixel art');
  assert.equal(draw.args[3],160);assert.equal(draw.args[4],104);
  assert(Math.abs(draw.args[7]-f.width*1.80)<1e-6,'five painted hit variants are 80% larger than original without changing source cells');
 }
 // Right and left attacks must stamp effects on the far, enemy-facing side,
 // then drift further in the strike direction, never backward toward the hero.
 for(const facing of [1,-1]){
  world.p.facing=facing;
  assert(vm.runInContext("spawnBasicContactFx(enemy,'hook',false)",world));
  const sprites=fx.splice(0);
  assert(sprites.length>=1);
  assert((sprites[0].x-enemy.x)*facing>=20,'main blast centered toward enemy front');
  assert(sprites[0].vx*facing>0,'impact bitmap travels in strike direction');
  if(sprites[1])assert((sprites[1].x-enemy.x)*facing>20,'secondary spark follows the strike');
 }
 assert(world.window.__zHitFxStatus().drawn>=5,'live render instrumentation');
}
console.log('PASS: 5 actual canvas drawImage hits, clear impact contrast, realistic duration, no stray if');
