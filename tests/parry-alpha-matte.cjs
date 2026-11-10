'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const html=fs.readFileSync(root+'/index.html','utf8');
const marker="function zKeyBlackVfxCanvas(g,w,h){";
const start=html.indexOf(marker);
const end=html.indexOf("window.__zParryAlphaStatus",start);
assert(start>=0&&end>start,'production keying implementation must exist');
const source=html.slice(start,end);
new vm.Script(source);
const result={};
const rgba=new Uint8ClampedArray([
  0,0,0,255,       // opaque black source matte -> transparent
  8,12,13,255,     // AVIF near-black compression -> transparent
  40,60,82,255,    // faint glow -> partial alpha
  20,190,255,255,  // bright cyan -> unchanged
  255,220,110,180, // already translucent flash -> unchanged
  0,0,0,0          // transparent frame padding -> transparent
]);
const ctx={getImageData(x,y,w,h){assert.equal(w,6);return{data:rgba,width:w,height:h}},
 putImageData(frame){result.pixels=frame.data}};
const env={Math};vm.createContext(env);vm.runInContext(source+';this.key=zKeyBlackVfxCanvas',env);
const stats=env.key(ctx,6,1);
assert.equal(rgba[3],0,'black matte fully removed');
assert.equal(rgba[7],0,'compression-black matte removed');
assert(rgba[11]>0&&rgba[11]<255,'soft light fringe preserved');
assert.equal(rgba[15],255,'cyan blast preserved');
assert.equal(rgba[19],180,'authored transparency preserved');
assert.equal(rgba[23],0,'padding preserved');
assert.equal(stats.removed,2);
assert(html.includes("if(!cell)continue;"),'unclean AVIF frame cannot be drawn directly');
const draw=html.slice(html.indexOf("if(f.kind==='parrySuccess10')"),html.indexOf("let a=img['burst_'+f.color]",html.indexOf("if(f.kind==='parrySuccess10')")));
assert(!draw.includes("else ctx.drawImage(a,"),'opaque black AVIF fallback must not return');
assert(draw.includes("ctx.globalCompositeOperation='screen'"),'old artistic blend maintained for off comparison');
assert(/alphaReport.push\(\{frame:i\+1,\.\.\.zKeyBlackVfxCanvas/.test(html),'all ten frames including overscan converted');
assert(html.includes("const w=318,h=296;"),'parry on-screen size unchanged');
assert(html.includes("const PARRY_SUCCESS_CELL_PAD=10;"),'frame overscan preserved');
const gl=fs.readFileSync(root+'/assets/z-fx-webgl2.js','utf8');
assert(gl.includes('const ADD = 0.30, BLOOM = 0.35, RADIUS = 10;'),'FX shaders settings unchanged');
console.log('PASS: 10-frame pre-keying, black/AVIF noise removal, soft edge alpha, opaque source never drawn, parry scale/FX intensity unchanged');
