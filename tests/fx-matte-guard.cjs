'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/z-fx-matte-guard.js'),'utf8');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
new vm.Script(source);
const canvases=[];
function canvas(){
 const cv={width:0,height:0,pixels:null};
 const ctx={
  drawImage(img){this.pixels=new Uint8ClampedArray(img.pixels);},
  getImageData(x,y,w,h){assert.equal(w,cv.width);assert.equal(h,cv.height);return {data:new Uint8ClampedArray(this.pixels)};},
  putImageData(data){this.pixels=new Uint8ClampedArray(data.data);}
 };
 cv.getContext=()=>ctx;
 Object.defineProperty(ctx,'pixels',{get(){return cv.pixels},set(v){cv.pixels=v}});
 canvases.push(cv);return cv;
}
const context={Math,Uint8ClampedArray,WeakMap,Object,window:{},document:{createElement:kind=>{assert.equal(kind,'canvas');return canvas();}}};
vm.createContext(context);vm.runInContext(source,context);
const api=context.window.ProjectZFxMatteGuard;
function bitmap(w,h,src,color=[0,0,0,0]){
 const pixels=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++)pixels.set(color,i*4);
 return {complete:true,naturalWidth:w,naturalHeight:h,src,pixels};
}
const dark=bitmap(28,28,'./some-effect-opaque.png',[20,20,20,255]);
for(let y=8;y<20;y++)for(let x=8;x<20;x++)dark.pixels.set([240,170,50,255],(y*28+x)*4);
const fixed=api.safeSource(dark);
assert.notEqual(fixed,dark,'solid near-black plate is detected');
assert.equal(fixed.pixels[3],0,'outer matte is transparent');
assert.equal(fixed.pixels[(14*28+14)*4+3],255,'painted central spark remains opaque');
assert.equal(api.safeSource(dark),fixed,'one-time conversion is cached');
const clean=bitmap(28,28,'./transparent-effect.png',[20,20,20,0]);
clean.pixels.set([170,140,70,255],(14*28+14)*4);
assert.equal(api.safeSource(clean),clean,'genuine transparent bitmap must be reused, never re-keyed');
const partial=bitmap(112,56,'./assets/vfx/project_z_ground_slam_8f_transparent.png');
for(let y=0;y<28;y++)for(let x=0;x<28;x++)partial.pixels.set([16,16,16,255],(y*112+x)*4);
partial.pixels.set([200,50,40,255],(14*112+14)*4);
const repaired=api.safeSource(partial);
assert.notEqual(repaired,partial,'per-cell atlas guard finds only bad plate');
assert.equal(repaired.pixels[3],0,'bad cell background keyed out');
assert.equal(repaired.pixels[(14*112+14)*4+3],255,'bad cell brighter content retained');
assert.equal(repaired.pixels[(14*112+40)*4+3],0,'healthy adjacent cell stays transparent');
const status=api.status();
assert.equal(status.checked,3);assert.equal(status.converted,2);assert.equal(status.convertedCells,2);
assert(html.includes('z-fx-matte-guard.js?v=20261111-matte-v1'),'source loaded before FX compositor');
assert(html.includes('ProjectZFxMatteGuard?.safeSource(source)'),'postpass uses guard');
console.log('PASS: solid-black/near-black FX plates removed per atlas cell, legitimate transparent bitmap untouched, cached one-time and FX-only');
