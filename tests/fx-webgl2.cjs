'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets/z-fx-webgl2.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
new vm.Script(source,{filename:'assets/z-fx-webgl2.js'});
assert(html.includes('./assets/z-fx-webgl2.js?v=20261110-fx-v1'),'webgl script loads before the game');
assert(html.includes("zDrawFxPost(()=>drawEffects('back',vfxSelection))"),'background FX isolated');
assert(html.includes("zDrawFxPost(()=>drawEffects('front',vfxSelection))"),'foreground FX isolated');
assert(html.indexOf("zDrawFxPost(()=>drawEffects('front',vfxSelection))")<
  html.indexOf('for(const entrant of entryActors)drawActor(entrant);'),
  'entering red hood stays above all VFX');
assert(html.includes("zDrawFxPost(()=>drawHeroHealingOverlays())"),'healing stays behind hero');
assert(html.includes("zDrawFxPost(()=>drawHeroModAura(x,y,z))"),'haste energy is included');
assert(!html.includes("zDrawFxPost(()=>drawBackdrop())"),'background excluded');
assert(!html.includes("zDrawFxPost(()=>drawCombatWordHud())"),'HUD excluded');
function harness({gpu=false, query='', limited=false}={}){
 const events=[];
 function canvas(){
  const c={width:0,height:0,style:{},addEventListener(){}};
  const ctx={
   globalAlpha:1,globalCompositeOperation:'source-over',transform:null,
   save(){events.push('save')},restore(){events.push('restore')},
   setTransform(...args){this.transform=args;},
   getTransform(){return {a:1,b:0,c:0,d:1,e:4,f:7}},
   clearRect(){events.push('clear')},
   drawImage(){events.push('draw:'+(this.name||'anonymous')+':'+this.globalCompositeOperation+':'+this.globalAlpha)}
  };
  c.getContext=(type)=>{
   if(type==='2d'){if(!c.ctx){ctx.name='offscreen';c.ctx=ctx;}return c.ctx}
   if(type==='webgl2')return gpu?GL:null;
   return null;
  };
  return c;
 }
 let drawCalls=0;
 const GL={
  VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,
  STATIC_DRAW:6,FLOAT:7,TEXTURE_2D:8,TEXTURE_MIN_FILTER:9,TEXTURE_MAG_FILTER:10,
  LINEAR:11,TEXTURE_WRAP_S:12,TEXTURE_WRAP_T:13,CLAMP_TO_EDGE:14,
  FRAMEBUFFER:15,COLOR_ATTACHMENT0:16,RGBA:17,UNSIGNED_BYTE:18,FRAMEBUFFER_COMPLETE:19,
  TEXTURE0:20,UNPACK_FLIP_Y_WEBGL:21,TRIANGLE_STRIP:22,COLOR_BUFFER_BIT:23,
  createShader(){return{}},shaderSource(){},compileShader(){},getShaderParameter(){return true},
  getShaderInfoLog(){return''},deleteShader(){},createProgram(){return{}},
  attachShader(){},linkProgram(){},deleteProgram(){},getProgramParameter(){return true},
  getProgramInfoLog(){return''},getUniformLocation(){return{}},createVertexArray(){return{}},
  bindVertexArray(){},createBuffer(){return{}},bindBuffer(){},bufferData(){},
  enableVertexAttribArray(){},vertexAttribPointer(){},createTexture(){return{}},
  bindTexture(){},texParameteri(){},createFramebuffer(){return{}},
  bindFramebuffer(){},texImage2D(){},framebufferTexture2D(){},
  checkFramebufferStatus(){return 19},viewport(){},useProgram(){},activeTexture(){},
  uniform1i(){},uniform1f(){},uniform2f(){},pixelStorei(){},clearColor(){},clear(){},
  drawArrays(){drawCalls++},isContextLost(){return false}
 };
 const app={URLSearchParams,console:{warn(){}},location:{search:query},
  navigator:{deviceMemory:limited?2:8,hardwareConcurrency:limited?2:8},
  window:{matchMedia:()=>({matches:true})},
  document:{createElement:()=>canvas()}};
 vm.createContext(app);vm.runInContext(source,app);
 const main=canvas().getContext('2d');main.name='main';
 return{api:app.window.ProjectZFxShader,main,events,drawCalls:()=>drawCalls};
}
{
 const h=harness({gpu:false});
 const pass=h.api.begin(h.main,1280,720);
 assert(pass,'2D offscreen pass available in WebGL fallback');
 assert.equal(pass.transform[0].e,4,'world camera transform copied');
 pass.drawImage({},0,0);
 h.api.finish(h.main);
 assert.equal(h.api.status().mode,'add-only');
 assert(h.events.includes('draw:main:source-over:1'),'original PNG alpha painted');
 assert(h.events.includes('draw:main:lighter:0.3'),'30% additive applied');
 assert(!h.events.includes('draw:main:lighter:0.35'),'unsupported bloom not drawn');
}
{
 const h=harness({gpu:true});
 const pass=h.api.begin(h.main,1280,720);
 pass.drawImage({},0,0);
 h.api.finish(h.main);
 const s=h.api.status();
 assert.equal(s.mode,'webgl2');
 assert.equal(s.add,.30);assert.equal(s.bloom,.35);assert.equal(s.radiusPx,10);
 assert.equal(h.drawCalls(),2,'WebGL2 blur runs horizontal and vertical passes');
 assert(h.events.includes('draw:main:lighter:0.35'),'35% bloom composite applied');
 for(let i=0;i<4;i++)h.api.performanceGuard(20);
 assert.equal(h.api.status().scale,.25,'slow renderer lowers bloom resolution');
}
{
 const h=harness({gpu:true,limited:true});h.api.begin(h.main,1280,720);h.api.finish(h.main);
 assert.equal(h.api.status().mode,'add-only','low-end mobile is additive-only');
}
{
 const h=harness({gpu:true,query:'?fx=off'});
 assert.equal(h.api.begin(h.main,1280,720),null,'QA opt-out preserves original renderer');
 assert.equal(h.api.status().mode,'off');
}
console.log('PASS: WebGL2 FX-only bloom, 30% ADD, 35% bloom, 10px radius, transform/actor depth, mobile fallback, 2-pass blur, perf guard');
