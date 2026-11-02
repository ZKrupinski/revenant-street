'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const png=fs.readFileSync(path.join(root,'assets/vfx/project_z_execution_critical_8f_slant_safe_v3.png'));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','original raster art remains PNG');
assert.equal(png.readUInt32BE(16),2816,'8 sprite cells, each 352px wide; slanted ends guarded');
assert.equal(png.readUInt32BE(20),384,'2 animation strips, each 192px high');
// Independently decode indexed PNG alpha (no image libraries in CI):
// verify every cel has genuinely empty pixel guards, including E4/E5/C5/C6.
const zlib=require('node:zlib');
let ptr=8,alphaPalette=null,ids=[],depth=0,colorType=0;
while(ptr<png.length){
 const len=png.readUInt32BE(ptr),type=png.toString('ascii',ptr+4,ptr+8);
 const data=png.subarray(ptr+8,ptr+8+len);ptr+=len+12;
 if(type==='IHDR'){depth=data[8];colorType=data[9];}
 if(type==='tRNS')alphaPalette=data;
 if(type==='IDAT')ids.push(data);
 if(type==='IEND')break;
}
assert.equal(depth,8,'8-bit lossless indexed sprites');
assert.equal(colorType,3,'indexed PNG stores source alpha palette');
assert(alphaPalette&&ids.length,'alpha palette and PNG image data');
const raw=zlib.inflateSync(Buffer.concat(ids)),W=2816,H=384,stride=W+1;
let last=new Uint8Array(W),edgeErrors=0,nonEmpty=Array(16).fill(0);
const paeth=(a,b,c)=>{
 const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
 return da<=db&&da<=dc?a:db<=dc?b:c;
};
for(let y=0;y<H;y++){
 const at=y*stride,filter=raw[at],row=new Uint8Array(W);
 for(let x=0;x<W;x++){
  const l=x?row[x-1]:0,u=last[x],ul=x?last[x-1]:0;
  const delta=filter===0?0:filter===1?l:filter===2?u:filter===3?Math.floor((l+u)/2):filter===4?paeth(l,u,ul):NaN;
  assert(Number.isFinite(delta),'known PNG scanline filter');
  const paletteIndex=(raw[at+1+x]+delta)&255;
  row[x]=paletteIndex;
  const alpha=paletteIndex<alphaPalette.length?alphaPalette[paletteIndex]:255;
  const col=Math.floor(x/352),localX=x%352,rowIndex=Math.floor(y/192);
  const cell=rowIndex*8+col;
  if(alpha>0)nonEmpty[cell]++;
  if((localX<16||localX>=330)&&alpha!==0)edgeErrors++;
 }
 last=row;
}
assert.equal(edgeErrors,0,'no slanted text or glow touches left/right cell bounds');
assert(nonEmpty.every(n=>n>350),'all 16 frames contain intact bitmap artwork');
for(const filename of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,filename),'utf8');
 for(const needle of [
  'id="combatWordHud" width="320" height="200"',
  'right:43px',
  'width:clamp(138px,24cqw,320px)',
  'Z_COMBAT_WORD_ART.ready=im.naturalWidth===2816&&im.naturalHeight===384;',
  "src='./assets/vfx/project_z_execution_critical_8f_slant_safe_v3.png?v=20261102-slant-safe-3'",
  'execution:{enter:.15,shake:.145,text:1.39,hold:.20,exit:.40,width:320}',
  'critical:{enter:.135,shake:.135,text:1.24,hold:.17,exit:.37,width:320}',
  'drawCombatWordHud();',
  'const width=cfg.width+32,height=width*ch/cw;',
  "if(f.kind==='combatWordSprite')continue;",
  "spawnCombatWordFx('execution',target)",
  "spawnCombatWordFx('critical',e)",
  "const critChance=Math.min(.72,.22+modRank('crit')*.10);",
  "(p.critDrought||0)>=4",
  "const padX=2,padY=3;",
  "zCombatWordQueue.length=0;floating=[]",
  "zStartCombatWord(zCombatWordQueue.shift())"
 ])assert(html.includes(needle),filename+' missing '+needle);
 assert(!html.includes("flash('EXECUTION!'"));
 assert(!html.includes("floatText('CRITICAL!'"));
 const a=html.indexOf('const Z_COMBAT_WORD_TIMING='),b=html.indexOf('// Five original painted transparent bitmap hit variants:',a);
 assert(a>0&&b>a);
 const draws=[],ctx={clearRect(){},drawImage(...args){draws.push(args)}};
 const canvas={width:320,height:200,style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:200})};
 const pause={offsetTop:85,offsetHeight:32,offsetWidth:35,parentElement:{offsetWidth:190}};
 const nodes={combatWordHud:canvas,pauseButton:pause};
 const env={Z_COMBAT_WORD_ART:{image:{naturalWidth:2816,naturalHeight:384,complete:true},ready:true,missing:false},
  window:{},fx:[],p:{x:500,y:560},gameState:'playing',Math,
  $:id=>nodes[id],clamp:(x,min,max)=>Math.max(min,Math.min(max,x))};
 vm.createContext(env);
 vm.runInContext(html.slice(a,b)+'\nthis.spawn=spawnCombatWordFx;this.render=drawCombatWordHud;this.start=zStartCombatWord;this.queue=zCombatWordQueue;',env);
 assert(env.spawn('critical',{x:1210,y:580}),'critical begins');
 let f=env.fx[0];
 assert(Math.abs(f.maxLife-2.05)<1e-9,'critical spring settles before lettering begins');
 const paint=t=>{f.age=t;env.render();return {draw:draws.at(-1),offset:parseFloat(canvas.style.transform.slice(12)),opacity:Number(canvas.style.opacity),f:f.drawnFrame}};
 // At arrival, impact travels >8px, reverses, squeezes and settles.
 const tremorA=paint(.135+.135*.1);
 assert(Math.abs(tremorA.offset)>8,'strong first landing jolt');
 assert(tremorA.f===0,'impact shake is confined to line-only sprite');
 const tremorB=paint(.135+.135*.3);
 assert(tremorA.offset*tremorB.offset<0,'second recoil reverses direction');
 assert(canvas.style.transform.includes(' scale('),'spring compression is visible');
 const steps=[
  [0,0,true],[.06,0,true],[.14,0,true],[.18,0,true],[.245,0,true],
  [.27,1,false],[.49,2,false],[.69,3,false],[.90,4,false],
  [1.19,4,false],[1.27,5,false],[1.49,6,false],
  [1.70,7,true],[1.86,7,true],[2.05,7,true]
 ];
 for(const [t,expected,moving] of steps){
  const out=paint(t);
  assert.equal(out.f,expected,'critical original frame at '+t);
  if(!moving)assert(Math.abs(out.offset)<1e-7,'word-bearing frame must never move, time '+t);
  if(t===0)assert.equal(out.opacity,0,'initial line is transparent');
  if(t===2.05)assert.equal(out.opacity,0,'exit line disappears at far right');
  assert.equal(out.draw[3],352,'complete slant-safe source, 352px per cell');
  assert.equal(out.draw[4],192,'full protected sprite cell height');
  assert.equal(out.draw[5],-16,'left 16px transparent overscan safely outside the canvas');
  assert.equal(out.draw[7],352,'do not shrink original tilted lettering');
  assert(out.draw[5]+17>=0 && out.draw[5]+329<=320,
   'every nontransparent source pixel stays within the HUD even with tilted overhang');
 }
 // Consecutive crits must queue, not cause an interruption mid-word.
 env.spawn('critical',{x:100,y:500});assert.equal(env.fx.length,1);
 assert.deepEqual(Array.from(env.queue),['critical']);
 env.spawn('execution',{x:150,y:540});
 assert.deepEqual(Array.from(env.queue),['execution','critical']);
 env.fx=[];env.start(env.queue.shift());f=env.fx[0];
 assert.equal(f.word,'execution');
 assert(Math.abs(f.maxLife-2.285)<1e-9,'execution has a strong arrival impact');
 f.drawnFrame=-1;
 for(const [t,frame] of [[0,0],[.31,1],[.55,2],[.80,3],[1.05,4],[1.35,4],[1.53,5],[1.77,6],[1.91,7]]){
  const o=paint(t);assert.equal(o.f,frame,'execution frame at '+t);
 }
 env.fx=[];env.queue.length=0;env.render();
 assert.equal(canvas.style.display,'none','wordmark clears when inactive');
 assert.equal(canvas.style.right,'43px','wordmarks exactly 8px left of pause, not at center HUD');
}
console.log('PASS: clean padded 8x2 raster sprites, line-only arrival/exit, text-only stationary animation, faster timeline, rightward move, crit/parry retained');
