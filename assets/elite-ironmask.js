/* Project Z / Iron Mask elite: a fixed-foot, local 8-frame bitmap material variant. */
(()=>{'use strict';
const cache=new WeakMap();
function colored(f){
 const src=f.canvas;
 if(cache.has(src))return cache.get(src);
 const out=document.createElement('canvas');out.width=src.width;out.height=src.height;
 const ctx=out.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(src,0,0);const pix=ctx.getImageData(0,0,out.width,out.height),d=pix.data;
 for(let i=0;i<d.length;i+=4){
  if(!d[i+3])continue;
  const r=d[i],g=d[i+1],b=d[i+2],l=r*.27+g*.55+b*.18;
  if(r>g*1.18&&r>b*1.20&&r>65){
   d[i]=Math.min(255,l*1.12+64);d[i+1]=Math.min(255,l*.73+22);d[i+2]=Math.min(255,l*.30+12);
  }else if(b>r*1.08&&b>g*.93){
   d[i]=Math.min(255,l*.53+15);d[i+1]=Math.min(255,l*1.15+43);d[i+2]=Math.min(255,l*1.30+50);
  }else{
   d[i]=Math.min(255,l*.55+17);d[i+1]=Math.min(255,l*.67+26);d[i+2]=Math.min(255,l*.89+41);
  }
 }
 ctx.putImageData(pix,0,0);cache.set(src,out);return out;
}
function move(e,getAssassinMove){
 if(e.dead&&e.z>12)return 'hitFly';
 if(e.eliteTell>0||e.eliteRush>0)return 'charge';
 return getAssassinMove(e);
}
function draw(e,x,y,z,api){
 const {ctx,art,maskedFrame,getAssassinMove,ellipseShadow,clamp,images,time}=api;
 const key=move(e,getAssassinMove);
 if(e.spriteKey!==key){e.spriteKey=key;e.spriteTime=0;e.spriteDistance=0}
 const animation=art.load(key),idle=art.load('idle'),selected=animation.ready?animation:idle;
 const fi=key==='fall'&&e.dead?Math.min(7,Math.floor((e.collapseAge||0)/.7*8)):maskedFrame(e,selected===animation?key:'idle');
 const current=selected.ready?selected.frames[fi]:null;
 if(current)e.lastSprite=current;
 const fr=current||e.lastSprite,alpha=e.dead?clamp(e.fade,0,1):1;
 ellipseShadow(x,y,1.18,.48*alpha/(1+z*.022));
 const tell=e.eliteTell>0;
 if(tell&&images.burst_gold?.complete&&images.burst_gold.naturalWidth){
  ctx.save();ctx.globalAlpha=.23+.13*Math.sin(time*18);
  ctx.drawImage(images.burst_gold,x-85,y-z-206,170,160);ctx.restore();
 }
 ctx.save();ctx.translate(x,Math.round(y-z));ctx.scale(e.face>0?-1:1,1);ctx.globalAlpha=alpha;
 if(fr){
  if(tell){ctx.shadowColor='#f7a44b';ctx.shadowBlur=19}
  else if(e.eliteRush>0){ctx.shadowColor='#75e1f5';ctx.shadowBlur=14}
  // Keep 25%+ original illustration visible beneath white sprite overlay.
  const painted=colored(fr),px=-art.anchorX*1.13,py=-art.anchorY*1.13;
  const width=fr.canvas.width*1.13,height=fr.canvas.height*1.13;
  ctx.drawImage(painted,px,py,width,height);
  if(e.hitFlash>0){
   ctx.save();ctx.shadowBlur=0;ctx.filter='brightness(0) invert(1)';
   ctx.globalAlpha=alpha*.75*Math.min(1,e.hitFlash/.30);
   ctx.drawImage(painted,px,py,width,height);ctx.restore();
  }
 }else{
  ctx.fillStyle='#254154';ctx.fillRect(-24,-210,48,190);
  ctx.fillStyle='#bb8b4c';ctx.fillRect(-18,-229,36,26);
 }
 ctx.restore();
 if(e.dead)return;
 const top=y-z-303,bw=112;
 ctx.fillStyle='#071620ea';ctx.fillRect(x-bw/2-2,top-2,bw+4,12);
 ctx.fillStyle='#d6a258';ctx.fillRect(x-bw/2,top,bw*clamp(e.hp/e.maxHp,0,1),8);
 if(e.poise>0){ctx.fillStyle='#69d9e5';ctx.fillRect(x-bw/2,top+12,bw*clamp(e.poise/e.maxPoise,0,1),3)}
 ctx.fillStyle='#edcfaa';ctx.textAlign='center';ctx.font='900 14px Arial';
 ctx.fillText('IRON MASK / ELITE',x,top-13);
 if(tell){ctx.fillStyle='#f9b15d';ctx.font='900 30px Arial';ctx.fillText('!!',x,top-25)}
 if(e.windup>0){ctx.fillStyle='#f36f7d';ctx.font='900 27px Arial';ctx.fillText('!',x,top-25)}
 if(e.groggy>0){ctx.fillStyle='#a0efff';ctx.font='900 14px Arial';ctx.fillText('처형 가능',x,top-30)}
}
window.RZElite={move,draw,colored};
})();