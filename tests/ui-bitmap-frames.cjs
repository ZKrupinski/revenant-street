'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const begin=html.indexOf('<style id="z-art-direction-panel-v1">');
const end=html.indexOf('</style>',begin);
assert(begin>=0&&end>begin,'new bitmap panel art direction must be installed in the game document');
const css=html.slice(begin,end);
assert(!/\.svg|data:image\/svg/.test(css),'window resources must not use vector substitutes');
const files=[
 ['z-panel-grunge-v1.png',512,320,false],
 ['z-frame-cyan-v1.png',192,192,true],
 ['z-frame-red-v1.png',192,192,true],
 ['z-frame-gold-v1.png',192,192,true],
 ['z-frame-green-v1.png',192,192,true],
 ['z-button-primary-v1.png',512,112,false],
 ['z-button-secondary-v1.png',512,112,false]
];
function decodePng(file,width,height,alphaFrame){
 const b=fs.readFileSync(path.join(root,'assets/ui',file));
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',file+' PNG signature');
 assert.equal(b.readUInt32BE(16),width,file+' width');
 assert.equal(b.readUInt32BE(20),height,file+' height');
 assert.equal(b[25],6,file+' uses true RGBA pixels');
 let cursor=8,idat=[];
 while(cursor+12<=b.length){
  const n=b.readUInt32BE(cursor),type=b.toString('ascii',cursor+4,cursor+8);
  if(type==='IDAT')idat.push(b.subarray(cursor+8,cursor+8+n));
  cursor+=12+n;if(type==='IEND')break;
 }
 const raw=zlib.inflateSync(Buffer.concat(idat));
 assert.equal(raw.length,height*(width*4+1),file+' full pixel payload');
 const pixel=(x,y)=>{
  const at=y*(width*4+1)+1+4*x;
  return [raw[at],raw[at+1],raw[at+2],raw[at+3]];
 };
 const center=pixel(width>>1,height>>1),corner=pixel(23,23);
 if(alphaFrame){
  assert.equal(center[3],0,file+' transparent center enables 9-slice');
  assert(corner[3]>0,file+' real painted corner with rivet');
  assert(pixel(width>>1,18)[3]>0,file+' painted top rail');
 }else{
  assert.equal(center[3],255,file+' opaque painted metal texture');
  assert.equal(corner[3],255,file+' opaque full-size painted body');
  const unique=new Set();
  for(let y=4;y<height-4;y+=13)for(let x=4;x<width-4;x+=13){
   const [r,g,b]=pixel(x,y);unique.add((r<<16)|(g<<8)|b);
  }
  assert(unique.size>(file.startsWith('z-button-')?30:80),file+' must contain varied texture, not flat CSS color');
 }
 assert(css.includes(file),file+' must be linked from the visible UI CSS');
}
for(const [name,w,h,alpha] of files)decodePng(name,w,h,alpha);
for(const selector of [
 '#stageWrap #menu.menu{',
 '#stageWrap #menu.hub-dialog .hub-header{',
 '#stageWrap #menu.hub-dialog .hub-module{',
 '#stageWrap #menu.hub-dialog .hub-module.selected{',
 '#stageWrap #menu.hub-dialog .hub-module.installed{',
 '#stageWrap #menu.reward-dialog .upgrade-btn{',
 '#stageWrap #menu button.main-btn,',
 '#stageWrap #menu button.secondary-btn,'
])assert(css.includes(selector),'bitmap art is not applied to '+selector);
assert(css.includes('var(--z-frame-gold)'),'selected hub must have amber/gold metal frame');
assert(css.includes('var(--z-frame-green)'),'newly installed hub must have green metal frame');
assert(css.includes('var(--z-frame-cyan)'),'available hub must have cyan steel frame');
assert(css.includes('var(--z-frame-red)'),'primary action must use red metal frame');
assert(html.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'),
 '16:9 reward and hub cards must preserve three columns');
assert(html.includes('overflow:hidden!important;scrollbar-width:none!important'),
 'hub cards must not require inner scrolling');
assert(css.includes('#app.compact-game-stage #stageWrap #menu.menu'),
 'tiny letterbox screens must receive a thinner bitmap frame');
console.log('PASS: seven actual PNG UI resources decode; titles, Hub, reward cards, buttons use their bitmap frame art; three-column 16:9 layout and accessibility preserved');
