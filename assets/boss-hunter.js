(function(){
'use strict';
// Removed the fragmented rapid multi-strike skill and its broken bitmap VFX.
const NAMES=['idle','walk','dash','slam','taunt','hit','death'];
const CELL_W=512,CELL_H=544,DISPLAY=.72;
const images={};
const useNewBoss= !/(?:[?&])boss=old(?:&|$)/.test(location.search);
function load(name){
 if(!useNewBoss)return null;
 if(!images[name]){
  const o={ready:false,failed:false,img:new Image()},a=o.img;
  a.onload=()=>{o.ready=a.naturalWidth===2048&&a.naturalHeight===1088;o.failed=!o.ready};
  a.onerror=()=>{o.failed=true};
  a.src='./assets/boss-hunter/'+name+'.webp';
  images[name]=o;
 }
 return images[name];
}
function init(e){
 if(e.bossReady)return;
 e.bossReady=true;e.bossMode=null;e.bossAge=0;e.bossDuration=0;
 e.bossHitMask=0;e.bossCycle=0;e.bossCooldown=1.3;
 e.bossIntroduced=false;e.bossPhasePending=false;
 e.bossDashDir=0;e.bossMoving=false;
 load('idle');load('walk');load('death');
}
function start(e,name,duration,api){
 e.bossMode=name;e.bossAge=0;e.bossDuration=duration;e.bossHitMask=0;
 if(name==='dash')e.bossDashDir=e.face||-1;
 if(name==='slam')api.warning(e,'붉은 충격파!', 'red');
 
 if(name==='taunt'){api.warning(e,e.phase===2?'OVERDRIVE / 폭주':'HUNTER / 붉은 집행자','red');load('taunt')}
 load(name);
}
function strike(e,api,range,mult){
 const oldReach=e.reach,oldPower=e.bossDamageMult,oldRange=e.bossBonusReach;
 try{
  e.bossDamageMult=mult;e.bossBonusReach=Math.max(0,range-oldReach-64);
  api.attack(e);
 }finally{e.reach=oldReach;e.bossBonusReach=oldRange||0;e.bossDamageMult=oldPower||1}
}
function update(e,p,dt,api){
 if(!useNewBoss)return false;
 init(e);
 if(e.dead)return false;
 const dx=p.x-e.x,dist=Math.abs(dx),dy=Math.abs(p.y-e.y);
 e.bossCooldown=Math.max(0,e.bossCooldown-dt);
 e.bossMoving=false;
 if(e.bossPhasePending){
  e.bossPhasePending=false;
  start(e,'taunt',1.08,api);e.bossCooldown=.55;
  return true;
 }
 if(!e.bossIntroduced&&dist<850){
  e.bossIntroduced=true;
  start(e,'taunt',1.18,api);e.bossCooldown=.75;
  return true;
 }
 if(e.groggy>0){e.bossMode=null;return false}
 if(e.bossMode){
  e.bossAge=Math.min(e.bossDuration,e.bossAge+dt);
  const phase=e.bossAge/Math.max(.001,e.bossDuration);
  if(e.bossMode==='dash'){
    if(phase>.30&&phase<.89){
     const from=e.x,ty=p.x-e.bossDashDir*37,rate=e.phase===2?830:665;
     e.x=Math.max(55,Math.min(12735,e.x+e.bossDashDir*Math.min(rate*dt,Math.max(0,(ty-e.x)*e.bossDashDir))));
     const moved=Math.abs(e.x-from);
     e.spriteDistance+=moved;e.visualMoving=moved>0;e.visualSpeed=dt>0?moved/dt:0;
     e.bossMoving=moved>0;
     if(!(e.bossHitMask&1)&&Math.abs(e.x-p.x)<112&&Math.abs(p.y-e.y)<72){
      e.bossHitMask|=1;strike(e,api,125,e.phase===2?1.3:1.1);
     }
    }
  }else if(e.bossMode==='slam'){
    if(phase>=.61 && !(e.bossHitMask&1)){
      e.bossHitMask|=1;
      api.impact(e,'slam');
      // Only nearby player is hit; the warning permits dashing clear.
      if(Math.abs(dx)<255&&Math.abs(dy)<72)strike(e,api,240,e.phase===2?2.2:1.8);
    }
  }
  if(phase>=1){
    e.bossMode=null;e.bossAge=0;
    e.cooldown=Math.max(e.cooldown,.45);
    e.bossCooldown=e.phase===2?1.25:2.0;
  }
  return true;
 }
 if(e.stun>0||e.windup>0||e.z>45)return false;
 if(dist>1000||Math.abs(dy)>125)return false;
 if(e.bossCooldown>0)return false;
 e.face=dx>=0?1:-1;
 const cycle=e.bossCycle++;
 if(dist>210){
  start(e,'dash',e.phase===2?.70:.88,api);
 }else{
  // Powerful single slam with a readable anticipation. No stuttering combo.
  start(e,'slam',e.phase===2?.91:1.16,api);
 }
 e.cooldown=Math.max(e.cooldown,.5);
 return true;
}
function state(e){
 if(e.dead)return 'death';
 if(e.bossMode)return e.bossMode;
 if(e.reactionTime>0)return 'hit';
 if(e.visualMoving||e.bossMoving)return 'walk';
 if(e.windup>0||e.attackPoseTime>0)return 'idle';
 return 'idle';
}
function frame(e,key){
 if(key==='death')return Math.min(7,Math.floor((e.deathAge||0)/.82*8));
 if(key==='hit')return Math.min(7,Math.floor((1-(e.reactionTime||0)/Math.max(.05,e.reactionDuration||.46))*8));
 if(e.bossMode===key)return Math.min(7,Math.floor((e.bossAge/Math.max(.01,e.bossDuration))*8));
 if(key==='walk')return Math.floor((e.spriteDistance||0)/30)%8;
 return Math.floor((e.spriteTime||0)*6.2)%8;
}
function draw(e,x,y,z,api){
 if(!useNewBoss)return false;
 const key=state(e);
 const item=load(key),idle=load('idle');
 const chosen=item?.ready?item:idle?.ready?idle:null;
 if(!chosen)return false;
 const alpha=e.dead?Math.min(1,e.fade||1):1;
 api.shadow(x,y,2,.46*alpha);
 const ctx=api.ctx,w=CELL_W*DISPLAY,h=CELL_H*DISPLAY;
 const i=frame(e,chosen===item?key:'idle');
 ctx.save();ctx.translate(x,y-z+19);ctx.scale(e.face>0?-1:1,1);
 ctx.globalAlpha=alpha;
 // Full-body bitmap silhouette flash, including the boss's arm and helmet.
 if(e.hitFlash>0)ctx.filter=e.hitFlash>.12?
  'brightness(3.8) saturate(0) contrast(1.28)':'brightness(2.3) saturate(.3)';
 ctx.drawImage(chosen.img,(i%4)*CELL_W,Math.floor(i/4)*CELL_H,CELL_W,CELL_H,-w/2,-h,w,h);
 ctx.restore();
 if(!e.dead){
  const top=y-z-405,bw=165;
  ctx.fillStyle='#0b0d18dc';ctx.fillRect(x-bw/2,top,bw,8);
  ctx.fillStyle=e.phase===2?'#ff4f59':'#e1a6a5';
  ctx.fillRect(x-bw/2,top,bw*Math.max(0,Math.min(1,e.hp/e.maxHp)),8);
  if(e.bossMode==='slam'){
   ctx.textAlign='center';ctx.font='900 18px Arial';
   ctx.fillStyle='#ff677c';ctx.fillText('⚠ CRIMSON IMPACT',x,top-12);
  }
 }
 return true;
}
window.RZBossHunter={NAMES,load,init,start,update,state,frame,draw,isEnabled:()=>useNewBoss};
})();
