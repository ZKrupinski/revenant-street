/* Project Z VFX-only matte safety: opt-in correction of opaque black plates.
 * Source sprites stay untouched. Clean RGBA PNGs are returned unchanged.
 * The low-cost downsampled alpha scan runs once per unique decoded image;
 * full-resolution conversion occurs only on atlas cells with a black border.
 */
(function(){
'use strict';
const cache=new WeakMap();
const report={checked:0,converted:0,convertedCells:0,inaccessible:0};
function gridFor(image){
 const url=String(image.src||'');
 if(/project_z_enemy_hit_5x8/.test(url))return [8,5];
 if(/project_z_(?:enemy_hit_explosion|enemy_death_evaporation|ground_slam|parry_counter|dash_lightning|execution_critical)/.test(url))return [4,2];
 if(/project_z_upgrade_/.test(url))return [8,1];
 return [1,1];
}
function classify(data,w,h,cols,rows){
 const bad=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x0=Math.round(col*w/cols),x1=Math.round((col+1)*w/cols)-1;
  const y0=Math.round(row*h/rows),y1=Math.round((row+1)*h/rows)-1;
  let dark=0,total=0;
  for(let i=1;i<=12;i++){
   const t=i/13,x=Math.round(x0+(x1-x0)*t),y=Math.round(y0+(y1-y0)*t);
   for(const [px,py] of [[x,y0],[x,y1],[x0,y],[x1,y]]){
    const k=(py*w+px)*4;
    if(data[k+3]>=225&&Math.max(data[k],data[k+1],data[k+2])<=36)dark++;
    total++;
   }
  }
  if(dark/Math.max(1,total)>=.48)bad.push([row,col]);
 }
 return bad;
}
function safeSource(image){
 if(!image||typeof image!=='object'||!image.naturalWidth||!image.naturalHeight||!image.complete)return image;
 if(cache.has(image))return cache.get(image);
 // Mark before work to avoid recursively inspecting our own scratch canvas.
 cache.set(image,image);
 report.checked++;
 try{
  const w=image.naturalWidth,h=image.naturalHeight,[cols,rows]=gridFor(image);
  const probe=document.createElement('canvas');
  probe.width=Math.max(cols*28,Math.min(256,w));
  probe.height=Math.max(rows*28,Math.min(192,h));
  const pc=probe.getContext('2d',{willReadFrequently:true});
  if(!pc)return image;
  pc.drawImage(image,0,0,probe.width,probe.height);
  const preview=pc.getImageData(0,0,probe.width,probe.height);
  const suspect=classify(preview.data,probe.width,probe.height,cols,rows);
  if(!suspect.length)return image;
  const fixed=document.createElement('canvas');fixed.width=w;fixed.height=h;
  const fc=fixed.getContext('2d',{willReadFrequently:true});
  if(!fc)return image;
  fc.drawImage(image,0,0);
  const pixels=fc.getImageData(0,0,w,h);
  for(const [row,col] of suspect){
   const x0=Math.round(col*w/cols),x1=Math.round((col+1)*w/cols);
   const y0=Math.round(row*h/rows),y1=Math.round((row+1)*h/rows);
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const k=(y*w+x)*4;
    if(!pixels.data[k+3])continue;
    const light=Math.max(pixels.data[k],pixels.data[k+1],pixels.data[k+2]);
    const t=Math.max(0,Math.min(1,(light-30)/64));
    const alpha=t*t*(3-2*t);
    pixels.data[k+3]=Math.round(pixels.data[k+3]*alpha);
   }
  }
  fc.putImageData(pixels,0,0);
  cache.set(image,fixed);report.converted++;report.convertedCells+=suspect.length;
  return fixed;
 }catch(err){
  // A tainted cross-origin canvas must never halt the game or block its FX.
  report.inaccessible++;return image;
 }
}
window.ProjectZFxMatteGuard=Object.freeze({safeSource,status:()=>({...report})});
})();