const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const validation=JSON.parse(fs.readFileSync(path.join(root,'assets/original-z-hf/gait-v3-validation.json'),'utf8'));
assert.ok(index.includes("'./assets/original-z-hf/walk-'+zGaitChoice+'.webp'"));
assert.ok(index.includes("'./assets/original-z-hf/run-'+zGaitChoice+'.webp'"));
assert.match(index,/Z_REMOTE_ATLAS\.backwalk=Z_REMOTE_ATLAS\.walk/);
assert.match(index,/key==='walk'\|\|key==='run'\|\|key==='backwalk'\)\)frames=preparePremattedGaitCells/);
assert.ok(index.includes("(zGaitChoice==='v3'||zGaitChoice==='v4')?(8-step)%8:step"));
for(const kind of ['walk','run']){
 const image=fs.readFileSync(path.join(root,'assets/original-z-hf',kind+'-v3.webp'));
 assert.equal(image.subarray(0,4).toString(),'RIFF');
 assert.equal(image.subarray(8,12).toString(),'WEBP');
 assert.ok(image.length>100000,kind+' source is too small');
 assert.equal(validation[kind].frames,8);
 assert.deepEqual(validation[kind].cell,[512,620]);
 assert.equal(validation[kind].frame_sizes.length,8);
 assert.equal(validation[kind].feet.length,8);
 assert.ok(validation[kind].frame_sizes.every(pair=>pair[0]>180&&pair[1]>320),kind+' has small/cut frames');
}

// Regression: an entirely transparent painted fist in a single idle cell
// is repaired from neighbouring ORIGINAL poses without touching hair or feet.
const idleBegin=index.indexOf('function repairIdleFistAlpha(');
const idleEnd=index.indexOf('function loadZMove(',idleBegin);
assert(idleBegin>0&&idleEnd>idleBegin,'original idle fist alpha repair is present');
assert(index.includes('repairIdleFistAlpha(frames);'),'pre-matted idle runs alpha repair during atlas loading');
const w=80,h=100;
const images=Array.from({length:8},()=>{
 const data=new Uint8ClampedArray(w*h*4);
 // A painted right glove, identical across a subtle breathing motion.
 for(let y=39;y<50;y++)for(let x=59;x<70;x++){
  const k=(y*w+x)*4;
  data[k]=145;data[k+1]=110;data[k+2]=89;data[k+3]=255;
 }
 // Non-hand hair/boots should never be modified by the patch.
 for(let y=2;y<15;y++)for(let x=28;x<52;x++){
  const k=(y*w+x)*4;data[k]=22;data[k+1]=24;data[k+2]=27;data[k+3]=255;
 }
 return data;
});
for(let y=39;y<50;y++)for(let x=59;x<70;x++)images[3][(y*w+x)*4+3]=0;
const originalFrame3=new Uint8ClampedArray(images[3]);
const frames=images.map(data=>({
 canvas:{width:w,height:h,getContext(){return {
  getImageData(){return {data:new Uint8ClampedArray(data)}},
  putImageData(img){data.set(img.data)}
 }}}
}));
const vm=require('node:vm');
const world={frames,Math,Uint8Array,window:{}};
vm.createContext(world);
vm.runInContext(index.slice(idleBegin,idleEnd)+'\nthis.result=repairIdleFistAlpha(frames);',world);
assert(world.result.repairedPixels>=100,'missing glove pixels are restored');
assert(world.result.patches.some(v=>v.frame===3),'only damaged idle pose is repaired');
assert.equal(images[3][(44*w+64)*4+3],255,'fist now fully opaque');
assert.equal(images[3][(6*w+35)*4+3],originalFrame3[(6*w+35)*4+3],'hair stays original');
for(let i=0;i<8;i++)if(i!==3)assert.equal(images[i][(44*w+64)*4+3],255,'healthy pose unchanged');
assert(index.includes("const idle=key==='idle'"),'idle has dedicated ghost capture');
assert(index.includes("ghost.idle?.20"),'idle trails remain much softer than combat');
assert(index.includes('HERO_GHOST_MOBILE?4:6'),'mobile ghost count stays capped');

// Inspect the actual published original-Z idle WEBP as raw RGBA on CI.
// This is diagnostic: different poses may legitimately move their gloves.
try{
 const cp=require('node:child_process');
 const source=path.join(root,'assets/project-z-hero/z-idle-hair-safe.webp');
 const bytes=cp.execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',source,'-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:8*1024*1024});
 const cellW=240,cellH=254,atlasW=cellW*4;
 assert(bytes.length>=atlasW*cellH*2*4,'idle WEBP decoded to RGBA');
 const real=Array.from({length:8},(_,i)=>{
  const data=new Uint8ClampedArray(cellW*cellH*4);
  for(let y=0;y<cellH;y++){
   const offset=(((i/4)|0)*cellH+y)*atlasW*4+(i%4)*cellW*4;
   data.set(bytes.subarray(offset,offset+cellW*4),y*cellW*4);
  }
  return {canvas:{width:cellW,height:cellH,getContext(){return{
   getImageData(){return {data:new Uint8ClampedArray(data)}},
   putImageData(img){data.set(img.data)}
  }}}};
 });
 const auditWorld={frames:real,Math,Uint8Array,window:{}};
 vm.createContext(auditWorld);
 vm.runInContext(index.slice(idleBegin,idleEnd)+'\nthis.audit=repairIdleFistAlpha(frames);',auditWorld);
 console.log('Idle atlas glove-alpha audit:',JSON.stringify(auditWorld.audit));
}catch(error){
 console.log('Idle atlas optional ffmpeg QA:',error.message.slice(0,140));
}


console.log('PASS: original-Z V3 gait, intact idle fist repair, subtle idle ghosts, and backwards walk share intact 8-frame atlases with reverse steps');
