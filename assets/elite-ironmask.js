/* Project Z — Iron Mask Elite v2: eight ORIGINAL bitmap animation atlases.
   Each 4x2 WebP carries 8 pre-cut, fixed-baseline full-body sprites.
   No palette shift, outline trick, destructive crop, or borrowed assassin sprite.
*/
(()=>{'use strict';
const KEYS=['idle','run','attack','hit','menace','death','charge','special'];
const CW=512,CH=608,FOOT=557,DATA=Object.create(null);
const ROOT='./assets/ironmask-elite/';
function load(key){
 if(!KEYS.includes(key))key='idle';
 if(!DATA[key]){
  const entry={ready:false,failed:false,loading:true,frames:8,image:null};
  const im=new Image();entry.image=im;
  im.onload=()=>{
   if(im.naturalWidth!==CW*4||im.naturalHeight!==CH*2){
    entry.failed=true;entry.error='Iron Mask '+key+' invalid 4x2 bitmap frame size';
   }else entry.ready=true;
   entry.loading=false;im.onload=null;im.onerror=null;
  };
  im.onerror=()=>{entry.failed=true;entry.loading=false;entry.error='Iron Mask '+key+' image missing'};
  im.src=ROOT+key+'.webp'+(key==='special'?'?rev=newhood-special-1f83b64-v2':'');
  DATA[key]=entry;
 }
 return DATA[key];
}
function preload(){return KEYS.map(load)}
function move(e){
 if(e.dead)return e.z>12?'hitFly':'death';
 if((e.reactionTime||0)>0||(e.proneTime||0)>0||(e.riseTime||0)>0)return 'hit';
 if(e.eliteTell>0)return 'charge';
 if(e.eliteSpecialPlaying||e.eliteRush>0||e.eliteAttack||e.eliteSpecialRecover>0)return 'special';
 if(e.windup>0||e.attackPoseTime>0)return 'attack';
 if(e.eliteMenace>0)return 'menace';
 return e.visualMoving?'run':'idle';
}
function frame(e,key){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 if(key==='death')return clamp(Math.floor((e.collapseAge||0)/.88*8),0,7);
 if(key==='hitFly')return clamp(Math.floor((e.reactionTime||0)*15),0,7);
 if(key==='hit'){
  if((e.reactionTime||0)>0)return clamp(Math.floor((1-e.reactionTime/Math.max(.001,e.reactionDuration||.5))*8),0,7);
  return Math.floor((e.spriteTime||0)*9)%8;
 }
 if(key==='charge')return clamp(Math.floor((1-e.eliteTell/Math.max(.001,e.eliteTellDuration||.9))*8),0,7);
 if(key==='special'){
  // A dedicated 1.04s timeline: exactly 8 painted frames, including last recovery.
  // Collision, windup and recovery do NOT restart the sprite-frame index.
  const duration=Math.max(.1,e.eliteSpecialDuration||1.04);
  const progress=clamp((e.eliteSpecialElapsed||0)/duration,0,.999999);
  return clamp(Math.floor(progress*8),0,7);
 }
 if(key==='attack'){
  if(e.windup>0)return clamp(Math.floor((1-e.windup/Math.max(.001,e.windupDuration||.42))*5),0,5);
  return clamp(6+Math.floor((1-(e.attackPoseTime||0)/.23)*2),0,7);
 }
 if(key==='menace')return clamp(Math.floor((e.spriteTime||0)*11),0,7);
 if(key==='run')return Math.floor(Math.max(0,e.spriteDistance||0)/39)%8;
 return Math.floor(Math.max(0,e.spriteTime||0)*5.9)%8;
}
function draw(e,x,y,z,api){
 const {ctx,ellipseShadow,clamp,time}=api;
 const key=move(e),atlasKey=key==='hitFly'?'hit':key;
 if(e.spriteKey!==key){e.spriteKey=key;e.spriteTime=0;e.spriteDistance=0}
 const selected=load(atlasKey),fallback=load('idle');
 const source=selected.ready?selected:fallback.ready?fallback:null;
 const idx=selected.ready?frame(e,key):0;
 const alpha=e.dead?clamp(e.fade,0,1):1;
 ellipseShadow(x,y,1.19,.48*alpha/(1+z*.022));
 ctx.save();ctx.translate(x,Math.round(y-z));
 // Original frame faces RIGHT, unlike the earlier borrowed assassin artwork.
 ctx.scale(e.face>=0?1:-1,1);
 ctx.globalAlpha=alpha;
 if(source){
  const scale=.69;
  const dx=-CW*scale*.5,dy=-FOOT*scale;
  ctx.drawImage(source.image,(idx%4)*CW,Math.floor(idx/4)*CH,CW,CH,
    dx,dy,CW*scale,CH*scale);
  if(e.hitFlash>0){
   ctx.save();ctx.filter='brightness(0) invert(1)';
   ctx.globalAlpha=alpha*.68*clamp(e.hitFlash/.30,0,1);
   ctx.drawImage(source.image,(idx%4)*CW,Math.floor(idx/4)*CH,CW,CH,
     dx,dy,CW*scale,CH*scale);
   ctx.restore();
  }
 }else{
  // Deliberately do NOT briefly draw the old bright casual elite.
  ctx.fillStyle='#121c23';ctx.fillRect(-24,-204,48,191);
 }
 ctx.restore();
 // Only in the explicit ?elite=preview QA encounter, expose the live atlas
 // frame number so all 8 poses can be verified without guessing from motion.
 if(/(?:[?&])elite=preview(?:&|$)/.test(window.location?.search||'')){
  ctx.save();ctx.fillStyle='#ffffff';ctx.font='900 18px Arial';
  ctx.textAlign='center';
  ctx.fillText('HOODED IRON MASK  /  '+key.toUpperCase()+'  '+(idx+1)+'/8',x,y-z-359);
  ctx.restore();
 }
 if(e.dead)return;
 const top=y-z-325,bw=125,tell=e.eliteTell>0;
 ctx.fillStyle='#090f1aca';ctx.fillRect(x-bw/2-2,top-2,bw+4,13);
 ctx.fillStyle=e.phase===2?'#ff657d':'#b78088';ctx.fillRect(x-bw/2,top,bw*clamp(e.hp/e.maxHp,0,1),8);
 if(e.poise>0){ctx.fillStyle='#71d5db';ctx.fillRect(x-bw/2,top+12,bw*clamp(e.poise/e.maxPoise,0,1),3)}
 ctx.textAlign='center';ctx.font='900 14px Arial';
 ctx.fillStyle='#e9c4ba';ctx.fillText('IRON MASK / ELITE',x,top-13);
 if(tell){ctx.fillStyle='#ff5878';ctx.font='900 24px Arial';ctx.fillText('CRIMSON RUSH!',x,top-28)}
 if(e.windup>0){ctx.fillStyle='#fa647a';ctx.font='900 28px Arial';ctx.fillText('!',x,top-29)}
 if(e.groggy>0){ctx.fillStyle='#a0efff';ctx.font='900 14px Arial';ctx.fillText('처형 가능',x,top-33)}
}
function colored(frame){return frame?.canvas||frame} // Legacy Frame Lab compatibility only.
window.RZElite={KEYS,load,preload,move,frame,draw,colored,CW,CH,FOOT};
load('idle');
})();