'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),file=path.join(root,'assets/vfx/project_z_execution_critical_cyber_8f.png');
const data=fs.readFileSync(file);
assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG magic');
assert.equal(data.readUInt32BE(16),2176,'8 frames x 272px');
assert.equal(data.readUInt32BE(20),320,'2 animation rows x 160px');
for(const name of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 assert(html.includes('function spawnCombatWordFx(name,target)'),'sprite FX emitter');
 assert(html.includes('function drawCombatWordFx(f)'),'atlas sprite renderer');
 assert(html.includes("const width=kind==='execution'?382:320;"),'reduced character-safe wordmark sizes');
 assert(html.includes("duration=kind==='execution'?.50:.40"),'slower 8-frame animations');
 assert(html.includes("const y=(target.y??p.y)-Math.max(0,target.z||0)-head-28;"),'overhead positioning, not body overlap');
 assert(html.includes("const padX=2,padY=3;"),'parry crop preserves painted frame tips');
 assert(html.includes("zClampVfxX(f.x,dir>0?w*.32:w*.68,dir>0?w*.68:w*.32)"),'direction-aware edge crop prevention');
 assert(html.includes("spawnCombatWordFx('execution',target)"),'execution sprite called');
 assert(html.includes("spawnCombatWordFx('critical',e)"),'critical sprite called');
 assert(!html.includes("flash('EXECUTION!'"),'old text execution popup removed');
 assert(!html.includes("floatText('CRITICAL!'"),'old drawn critical text removed');
 assert(html.includes("['사이버네틱 EXECUTION / CRITICAL 8프레임'"),'preloaded before combat');
 assert(html.includes("'combatWordSprite','parrySuccess10'"),'always foreground');
 assert(html.includes("if(f.kind==='combatWordSprite'){drawCombatWordFx(f);continue;}"),'FX draw pass');
 assert(html.includes('if(f.kind===\'combatWordSprite\'&&(f.drawnFrame??-1)<7)'), 'all frames retained');
}
// Runtime simulation: verify source-frame safety and zoom-aware edge clipping.
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const helperStart=html.indexOf('const Z_COMBAT_WORD_ART=');
const helperEnd=html.indexOf('// Five original painted transparent bitmap hit variants:',helperStart);
assert(helperStart>0&&helperEnd>helperStart);
const sprites=[],translations=[];
const ctx={save(){},restore(){},translate(x,y){translations.push([x,y])},scale(){},
 drawImage(...a){sprites.push(a)}};
class ImageStub{
 constructor(){this.complete=true;this.naturalWidth=2176;this.naturalHeight=320;}
 set src(value){this.url=value;this.onload?.();}
 get src(){return this.url;}
}
const env={Image:ImageStub,window:{},fx:[],p:{x:500,y:560,facing:1},
 cameraZoom:1.36,cameraX:0,W:1280,ctx,Math,
 clamp:(v,min,max)=>Math.max(min,Math.min(max,v))};
vm.createContext(env);
vm.runInContext(html.slice(helperStart,helperEnd)+
 '\nthis.emit=spawnCombatWordFx;this.paint=drawCombatWordFx;this.safeX=zClampVfxX;',env);
assert(env.emit('critical',{type:'intruder',x:1260,y:560,z:0}), 'critical emitted');
assert.equal(env.fx[0].width,320);assert.equal(env.fx[0].maxLife,.40);
assert.equal(env.fx[0].y,187,'intruder head clearance');
assert(env.emit('execution',{type:'elite',x:20,y:560,z:0}),'execution emitted');
assert.equal(env.fx[1].width,382);assert.equal(env.fx[1].maxLife,.50);
for(const f of env.fx){
 for(let frame=0;frame<8;frame++){
  f.age=f.maxLife;env.paint(f);
  const a=sprites.at(-1),cx=1280*.52,zoom=env.cameraZoom;
  const left=(a[5]-env.cameraX-cx)*zoom+cx;
  const right=(a[5]+a[7]-env.cameraX-cx)*zoom+cx;
  assert(left>=41&&right<=1239,'full wordmark inside zoomed, shaken viewport');
  assert.equal(a[1],frame*272,'no skipped source frames');
  assert.equal(a[2],f.word==='critical'?160:0,'correct painted row');
 }
}
const cutStart=html.indexOf('function parrySuccessSourceRect(');
const cutEnd=html.indexOf('// Preserve signature attacks above actors.',cutStart);
const renderStart=html.indexOf('function drawEffects(');
const renderEnd=html.indexOf('// Combat-only text overlays are intentionally disabled;',renderStart);
const parryEnv={fx:[{kind:'parrySuccess10',x:1250,y:450,face:1,life:.14,maxLife:.27}],
 parrySuccessImage:{complete:true,naturalWidth:1536,naturalHeight:1024},ctx,
 cameraX:0,cameraZoom:1.36,W:1280,p:{dodge:0},img:{},Math,
 clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
 zClampVfxX:env.safeX,zDrawInLayer:()=>true,zIsSignatureVfx:()=>true,
 drawModEnergy(){}, parrySuccessSourceRect:null};
vm.createContext(parryEnv);
vm.runInContext(html.slice(cutStart,cutEnd)+'\nthis.crop=parrySuccessSourceRect;',parryEnv);
parryEnv.parrySuccessSourceRect=parryEnv.crop;
vm.runInContext(html.slice(renderStart,renderEnd)+'\nthis.paint=drawEffects;',parryEnv);
for(const face of [1,-1]){
 for(const x of [5,1250]){
  const f=parryEnv.fx[0];f.face=face;f.x=x;
  parryEnv.paint('all');
  const tx=translations.at(-1)[0],w=318,cx=1280*.52;
  const leftWorld=tx-(face>0?w*.32:w*.68),rightWorld=tx+(face>0?w*.68:w*.32);
  const left=(leftWorld-cx)*1.36+cx,right=(rightWorld-cx)*1.36+cx;
  assert(left>=41&&right<=1239,'parry tip visible for both directions at viewport edges');
  const crop=sprites.at(-1);
  assert(crop[3]>300-3&&crop[4]>500,'parry full painted sprite source visible');
 }
}
console.log('PASS: smaller 8-frame wordmarks above heads, 25% slower, edge-safe parry source and viewport rendering');
