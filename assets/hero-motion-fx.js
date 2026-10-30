/* Project Z — Z's eight-frame bitmap motion FX system.
 * No vector effects: every FX frame is baked from existing painted burst PNGs.
 * Sprite atlases (4 columns x 2 rows) are created once, then sampled by
 * drawImage; animation and combat hitboxes remain entirely independent.
 */
(function(){
 'use strict';
 const SIZE=160, COUNT=8, SHEET_COLUMNS=4;
 const SHEETS=['dust','speed','slash','leap','hurt','shield','aura','land'];
 const palettes={
  dust:['gold','red'],speed:['blue','gold'],slash:['gold','red'],
  leap:['blue','gold'],hurt:['red','gold'],shield:['blue','gold'],
  aura:['blue','gold'],land:['gold','blue']
 };
 const atlases=Object.create(null);
 let images=null,ready=false,building=false,buildCursor=0;
 let clock=0,lastKind='',lastMove='',lastX=null,lastY=null,stepDistance=0;
 let echoClock=0,moveFrameClock=0;
 let stamps=[],echoes=[],eventFlash=null;
 let totalDrawCalls=0;
 function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}
 function source(name){return images&&images['burst_'+name]}
 function sourceReady(){return ['blue','gold','red'].every(k=>source(k)?.complete&&source(k)?.naturalWidth>0)}
 function texture(c,image,x,y,w,h,angle,alpha,filter){
  if(!image)return;
  c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;
  if(filter)c.filter=filter;
  c.drawImage(image,-w/2,-h/2,w,h);c.restore();
 }
 function bake(type){
  const sheet=document.createElement('canvas');sheet.width=SIZE*SHEET_COLUMNS;sheet.height=SIZE*2;
  const c=sheet.getContext('2d',{alpha:true});
  const pair=palettes[type];
  for(let i=0;i<COUNT;i++){
   const t=i/7,phase=i*Math.PI/4,xx=i%4*SIZE,yy=Math.floor(i/4)*SIZE;
   c.save();c.beginPath();c.rect(xx,yy,SIZE,SIZE);c.clip();
   c.translate(xx+SIZE/2,yy+SIZE/2);c.globalCompositeOperation='screen';
   if(type==='dust'){
    // Dense, layered ochre smoke, with turbulent bits near the toes.
    const grow=.53+t*.88;
    texture(c,source('gold'),-28-14*t,22-13*t,95*grow,60*grow,-.38-.3*t,.55*(1-t*.67),'sepia(.95) saturate(.72) brightness(.78)');
    texture(c,source('gold'),20+24*t,16-18*t,102*grow,56*grow,.25+.37*t,.67*(1-t*.7),'sepia(.98) saturate(.5) brightness(.67)');
    texture(c,source('red'),-4,28-22*t,76*grow,30*grow,phase*.18,.25*(1-t*.65),'sepia(1) brightness(1.12)');
   }else if(type==='speed'){
    // Frame-by-frame streak ribbons formed from prepainted energy textures.
    const grow=.60+t*.63;
    texture(c,source('blue'),-12-42*t,-15,143*grow,33+17*t,-.12,.86*(1-t*.42),'brightness(1.38) saturate(1.35)');
    texture(c,source('blue'),-36-40*t,15+8*Math.sin(phase),132*grow,20+20*t,.14,.79*(1-t*.45),'hue-rotate(24deg) brightness(1.23)');
    texture(c,source('gold'),19-14*t,29,91*grow,20+9*t,-.20,.45*(1-t*.55),'brightness(1.36)');
   }else if(type==='slash'){
    const grow=.54+t*.82,arc=-.95+1.9*t;
    texture(c,source('gold'),12+32*Math.cos(arc),-4+28*Math.sin(arc),117*grow,30+13*t,arc,.96*(1-t*.24),'brightness(1.57) saturate(1.22)');
    texture(c,source('blue'),17+32*Math.cos(arc),-14+28*Math.sin(arc),137*grow,17+13*t,arc+.13,.80*(1-t*.48),'brightness(1.62)');
    texture(c,source('red'),33+23*t,12-20*t,65*grow,42*grow,arc+.5,.52*(1-t*.45),'brightness(1.14)');
   }else if(type==='leap'){
    const grow=.68+.69*t;
    texture(c,source('blue'),0,27-42*t,83*grow,127*grow,-.1+.25*t,.78*(1-t*.5),'brightness(1.65) saturate(1.13)');
    texture(c,source('gold'),-24+34*t,35-38*t,69*grow,83*grow,.2+t,.63*(1-t*.58),'brightness(1.4)');
    texture(c,source('blue'),18-32*t,48-37*t,60*grow,68*grow,-.4,.58*(1-t*.44),'brightness(1.33)');
   }else if(type==='hurt'){
    const grow=.55+.79*t;
    texture(c,source('red'),-17-9*t,-7,111*grow,96*grow,phase*.24,.89*(1-t*.63),'brightness(1.45) saturate(1.65)');
    texture(c,source('gold'),25+21*t,-6-22*t,74*grow,55*grow,phase*.23,.64*(1-t*.64),'hue-rotate(-21deg) brightness(1.23)');
   }else if(type==='shield'){
    const grow=.58+.68*t;
    texture(c,source('blue'),0,0,122*grow,125*grow,phase*.11,.69*(1-t*.42),'brightness(1.42) saturate(.67)');
    texture(c,source('gold'),0,0,74*grow,89*grow,-phase*.12,.47*(1-t*.63),'hue-rotate(62deg) brightness(1.18)');
   }else if(type==='aura'){
    const grow=.62+.29*Math.sin(Math.PI*t);
    texture(c,source('blue'),0,6,109*grow,114*grow,phase*.05,.46,'hue-rotate(20deg) brightness(1.17)');
    texture(c,source('gold'),2,-6,82*grow,92*grow,-phase*.10,.24,'hue-rotate(50deg) brightness(.93)');
   }else if(type==='land'){
    const grow=.67+t*.92;
    texture(c,source('gold'),0,14+13*t,125*grow,56*grow,phase*.03,.82*(1-t*.74),'sepia(.87) saturate(.82) brightness(1.1)');
    texture(c,source('blue'),-25-9*t,20,90*grow,43*grow,-.1,.50*(1-t*.66),'brightness(1.28)');
    texture(c,source('gold'),26+15*t,13,88*grow,53*grow,.1,.60*(1-t*.74),'sepia(.87) brightness(.9)');
   }
   c.restore();
  }
  return sheet;
 }
 function queueBuild(){
  if(ready||building||!sourceReady())return;
  building=true;
  const step=()=>{
   if(!sourceReady()){building=false;return}
   // One 8-frame sheet per task: prewarm gradually without a combat hitch.
   const type=SHEETS[buildCursor++];
   if(type)atlases[type]=bake(type);
   if(buildCursor<SHEETS.length)setTimeout(step,25);
   else{ready=true;building=false}
  };
  setTimeout(step,0);
 }
 function init(img){
  images=img;
  for(const id of ['blue','gold','red'])if(source(id)&&!source(id).complete)
   source(id).addEventListener('load',queueBuild,{once:true});
  queueBuild();
 }
 function kindOf(key,p){
  if(p.downTimer>0)return 'down';
  if(p.getupTimer>0)return 'recover';
  if(p.stun>0)return 'hurt';
  if(p.parry>0)return 'guard';
  if(p.dodge>0)return 'dash';
  if(p.attack>0)return p.z>5||p.airAttack?'airStrike':'strike';
  if(p.jumpStartTimer>0||key==='jumpstart')return 'jump';
  if(p.z>5||key==='airborne')return 'air';
  if(p.landingTimer>0||key==='landing')return 'land';
  if(key==='run')return 'run';
  if(key==='walk'||key==='backwalk')return 'walk';
  return 'idle';
 }
 function stamp(type,x,y,facing=1,life=.46,scale=1,z=0){
  if(stamps.length>=22)stamps.shift();
  stamps.push({type,x,y,facing,z,life,maxLife:life,scale});
 }
 function reset(){stamps.length=0;echoes.length=0;lastX=lastY=null;lastKind=lastMove='';stepDistance=echoClock=moveFrameClock=0;clock=0;eventFlash=null}
 function event(type,p){
  if(!p)return;
  const d=p.facing||1;
  if(type==='parry')stamp('shield',p.x+d*44,p.y-125,d,.39,1.55,p.z||0);
  else if(type==='hurt')stamp('hurt',p.x,p.y-140,d,.38,1.56,p.z||0);
  else if(type==='dodge')stamp('speed',p.x-d*38,p.y-75,d,.36,1.56,p.z||0);
  else if(type==='land')stamp('land',p.x,p.y-5,d,.43,1.55,0);
  else if(type==='jump')stamp('leap',p.x,p.y-25,d,.42,1.28,0);
  else if(type==='attack')stamp('slash',p.x+d*73,p.y-130,d,.35,1.36,p.z||0);
  else if(type==='execute')stamp('slash',p.x+d*95,p.y-126,d,.5,2.3,p.z||0);
  else if(type==='recover')stamp('aura',p.x,p.y-142,d,.50,1.15,p.z||0);
 }
 function update(dt,p,key){
  if(!p)return;
  clock+=dt;
  for(const a of stamps)a.life-=dt;
  stamps=stamps.filter(a=>a.life>0);
  for(const a of echoes)a.life-=dt;
  echoes=echoes.filter(a=>a.life>0);
  const kind=kindOf(key,p);
  if(kind!==lastKind){
   if(kind==='land')event('land',p);
   else if(kind==='jump')event('jump',p);
   else if(kind==='dash')event('dodge',p);
   else if(kind==='hurt'||kind==='down')event('hurt',p);
   else if(kind==='guard')stamp('shield',p.x+(p.facing||1)*42,p.y-128,p.facing||1,.28,.94,p.z||0);
   else if(kind==='recover')event('recover',p);
   else if(kind==='strike'||kind==='airStrike')event('attack',p);
  }
  if((kind==='strike'||kind==='airStrike')&&p.moveName!==lastMove&&lastKind===kind)event('attack',p);
  if(kind==='run'||kind==='walk'){
   const d=lastX===null?0:Math.hypot(p.x-lastX,(p.y-lastY)*1.3);
   stepDistance+=Math.min(d,35);
   const stride=kind==='run'?35:28;
   if(stepDistance>=stride){
    stepDistance%=stride;
    const left=Math.floor((p.gaitDistance||0)/stride)%2===0?-1:1;
    const facing=p.facing||1;
    stamp('dust',p.x-facing*(kind==='run'?33:19)+left*18,p.y-11,facing,
      kind==='run'?.52:.46,kind==='run'?1.30:1.03,0);
    if(kind==='run'&&stamps.length<20)
     stamp('speed',p.x-facing*77,p.y-65,facing,.25,1.05,0);
   }
  }else stepDistance=0;
  lastX=p.x;lastY=p.y;lastKind=kind;lastMove=p.moveName;
  echoClock=Math.max(0,echoClock-dt);
 }
 function capture(p,frame,key){
  if(!frame||!p)return;
  const kind=kindOf(key,p);
  if(kind!=='walk'&&kind!=='run'&&kind!=='dash')return;
  if(echoClock>0)return;
  const life=kind==='run'?.32:kind==='dash'?.4:.25;
  echoes.push({x:p.x,y:p.y,z:p.z||0,face:p.facing||1,frame,life,maxLife:life,kind});
  if(echoes.length>5)echoes.shift();
  echoClock=kind==='run'?.062:kind==='dash'?.050:.097;
 }
 function cell(ctx,type,frame,x,y,w,h,alpha=1,face=1){
  const sheet=atlases[type];if(!sheet)return;
  ctx.save();ctx.globalAlpha=clamp(alpha,0,1);
  ctx.translate(x,y);ctx.scale(face<0?-1:1,1);
  ctx.drawImage(sheet,(frame%4)*SIZE,Math.floor(frame/4)*SIZE,SIZE,SIZE,-w/2,-h/2,w,h);
  ctx.restore();totalDrawCalls++;
 }
 function renderStamps(ctx){
  for(const a of stamps){
   const phase=clamp(1-a.life/a.maxLife,0,.999),frame=Math.min(7,Math.floor(phase*8));
   const lift=a.type==='dust'?phase*15:a.type==='land'?0:0;
   const grow=1+phase*.27;
   cell(ctx,a.type,frame,a.x,a.y-a.z-lift,155*a.scale*grow,112*a.scale*grow,
     Math.min(1,a.life/a.maxLife*1.7),a.facing);
  }
 }
 function drawEchoes(ctx){
  for(const a of echoes){
   const frame=a.frame;if(!frame?.canvas)continue;
   const b=frame.bounds,sc=frame.unitScale??1;
   ctx.save();ctx.globalAlpha=(a.kind==='run'?.35:a.kind==='dash'?.39:.25)*clamp(a.life/a.maxLife,0,1);
   ctx.translate(a.x,Math.round(a.y-a.z+8));ctx.scale(a.face<0?-1:1,1);
   ctx.drawImage(frame.canvas,b.x,b.y,b.w,b.h,-b.w*sc/2,-b.h*sc,b.w*sc,b.h*sc);
   ctx.restore();totalDrawCalls++;
  }
 }
 function drawBehind(ctx,p,key){
  if(!ready)return;
  const kind=kindOf(key,p),face=p.facing||1,x=p.x,y=p.y,z=p.z||0;
  const f=Math.floor(clock*(kind==='run'?18:kind==='walk'?14:11))%8;
  renderStamps(ctx);drawEchoes(ctx);
  if(kind==='run'){
   cell(ctx,'speed',f,x-face*92,y-z-91,315,194,.94,face);
   cell(ctx,'speed',(f+3)%8,x-face*51,y-z-143,272,193,.75,face);
   cell(ctx,'dust',(f+2)%8,x-face*34,y-10,258,134,1,face);
  }else if(kind==='walk'){
   cell(ctx,'dust',f,x-face*27,y-5,222,128,.90,face);
   cell(ctx,'speed',(f+3)%8,x-face*67,y-z-57,205,114,.69,face);
  }else if(kind==='dash'){
   cell(ctx,'speed',f,x-face*103,y-z-110,340,236,1,face);
   cell(ctx,'dust',(f+3)%8,x-face*49,y-8,260,128,.94,face);
  }else if(kind==='strike'||kind==='airStrike'){
   cell(ctx,'slash',f,x+face*54,y-z-128,240,212,.89,face);
   if(kind==='airStrike')cell(ctx,'leap',(f+4)%8,x-face*29,y-z-55,185,203,.71,face);
  }else if(kind==='jump'||kind==='air'){
   cell(ctx,'leap',f,x-face*22,y-z+29,178,247,.83,face);
   cell(ctx,'dust',(f+3)%8,x,y-10,169,92,.65,face);
  }else if(kind==='land'){
   cell(ctx,'land',f,x,y-12,266,138,.96,face);
  }else if(kind==='guard'){
   cell(ctx,'shield',f,x+face*49,y-z-132,219,232,.77,face);
  }else if(kind==='hurt'||kind==='down'){
   cell(ctx,'hurt',f,x,y-z-130,230,231,.91,face);
   if(kind==='down')cell(ctx,'dust',(f+3)%8,x,y-5,215,111,.83,face);
  }else if(kind==='recover'){
   cell(ctx,'aura',f,x,y-z-122,217,234,.70,face);
   cell(ctx,'dust',f,x,y-11,178,101,.72,face);
  }else{
   cell(ctx,'aura',f,x,y-z-113,174,202,.30,face);
  }
 }
 function drawFront(ctx,p,key){
  if(!ready)return;
  const kind=kindOf(key,p),face=p.facing||1,x=p.x,y=p.y,z=p.z||0;
  const f=Math.floor(clock*(kind==='run'?19:kind==='walk'?13:12))%8;
  if(kind==='run'){
   cell(ctx,'speed',(f+2)%8,x-face*10,y-z-58,223,119,.68,face);
   cell(ctx,'dust',(f+5)%8,x+face*11,y-3,232,112,.83,face);
  }else if(kind==='walk'){
   cell(ctx,'dust',(f+4)%8,x+face*15,y-5,159,86,.68,face);
  }else if(kind==='dash'){
   cell(ctx,'speed',(f+4)%8,x+face*38,y-z-120,242,178,.89,face);
  }else if(kind==='strike'||kind==='airStrike'){
   const age=p.attackDuration?clamp(1-p.attack/p.attackDuration,0,1):0;
   const hitFrame=Math.min(7,Math.floor(age*8));
   cell(ctx,'slash',hitFrame,x+face*(key.includes('kick')?102:86),y-z-(key.includes('kick')?92:140),262,207,.85,face);
   if(kind==='airStrike')cell(ctx,'leap',(hitFrame+2)%8,x+face*57,y-z-64,154,171,.65,face);
  }else if(kind==='guard'){
   cell(ctx,'shield',f,x+face*68,y-z-131,169,188,.55,face);
  }else if(kind==='hurt'||kind==='down'){
   cell(ctx,'hurt',(f+3)%8,x+face*38,y-z-128,172,163,.77,face);
  }else if(kind==='land'){
   cell(ctx,'land',(f+3)%8,x,y-4,205,94,.62,face);
  }else if(kind==='jump'||kind==='air'){
   cell(ctx,'leap',(f+2)%8,x,y-z+37,137,176,.64,face);
  }
 }
 window.RZHeroFx={init,update,capture,drawBehind,drawFront,event,reset,
  getStatus:()=>({ready,atlasCount:Object.keys(atlases).length,stamps:stamps.length,echoes:echoes.length,drawCalls:totalDrawCalls})};
})();
