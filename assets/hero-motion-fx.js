/* Project Z — Z's eight-frame bitmap motion FX system.
 * No vector effects: every FX frame is baked from existing painted burst PNGs.
 * Sprite atlases (4 columns x 2 rows) are created once, then sampled by
 * drawImage; animation and combat hitboxes remain entirely independent.
 */
(function(){
 'use strict';
 const SIZE=160, COUNT=8, SHEET_COLUMNS=4;
 // Keep visuals deliberately strong while bounding long-session mobile cost.
 const TOUCH_DEVICE=!!window.matchMedia?.('(pointer: coarse)').matches;
 const STAMP_BUDGET=TOUCH_DEVICE?14:22,ECHO_BUDGET=TOUCH_DEVICE?3:5;
 const SHEETS=['dust','speed','slash','blade','impact','leap','hurt','shield','aura','land'];
 const palettes={
  dust:['gold','red'],speed:['blue','gold'],slash:['gold','red'],blade:['blue','gold'],impact:['gold','red'],
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
    texture(c,source('gold'),-28-14*t,22-13*t,105*grow,70*grow,-.38-.3*t,.95*(1-t*.36),'sepia(.88) saturate(.97) brightness(1.22)');
    texture(c,source('gold'),20+24*t,16-18*t,111*grow,68*grow,.25+.37*t,.97*(1-t*.35),'sepia(.9) saturate(.92) brightness(1.16)');
    texture(c,source('red'),-4,28-22*t,91*grow,42*grow,phase*.18,.75*(1-t*.43),'sepia(1) brightness(1.35)');
   }else if(type==='speed'){
    // Frame-by-frame streak ribbons formed from prepainted energy textures.
    const grow=.60+t*.63;
    texture(c,source('blue'),-12-42*t,-15,151*grow,46+17*t,-.12,.99*(1-t*.20),'brightness(1.78) saturate(1.55)');
    texture(c,source('blue'),-36-40*t,15+8*Math.sin(phase),145*grow,26+23*t,.14,.95*(1-t*.27),'hue-rotate(18deg) brightness(1.68)');
    texture(c,source('gold'),19-14*t,29,101*grow,26+11*t,-.20,.77*(1-t*.40),'brightness(1.57)');
   }else if(type==='slash'){
    const grow=.54+t*.82,arc=-.95+1.9*t;
    texture(c,source('gold'),12+32*Math.cos(arc),-4+28*Math.sin(arc),117*grow,30+13*t,arc,.96*(1-t*.24),'brightness(1.57) saturate(1.22)');
    texture(c,source('blue'),17+32*Math.cos(arc),-14+28*Math.sin(arc),137*grow,17+13*t,arc+.13,.80*(1-t*.48),'brightness(1.62)');
    texture(c,source('red'),33+23*t,12-20*t,65*grow,42*grow,arc+.5,.52*(1-t*.45),'brightness(1.14)');
   }else if(type==='blade'){
    // Hand-painted burst texture compressed into a long, tapering luminous
    // energy edge. Eight independent bitmap cells, no vector line/arc.
    const pulse=Math.sin(Math.PI*(.08+t*.85)),grow=.39+.79*Math.max(.12,pulse);
    const travel=-37+t*63,angle=-.16+.22*t;
    texture(c,source('blue'),travel-9,-11,154*grow,37*grow,angle,.98*(.76+.24*pulse),'brightness(2.0) saturate(1.35)');
    texture(c,source('gold'),travel+6,-9,144*grow,24*grow,angle+.025,.97*(.74+.26*pulse),'brightness(2.0) saturate(.45)');
    texture(c,source('blue'),travel+11,-8,129*grow,12*grow,angle+.025,.97,'grayscale(.73) brightness(3.1)');
    texture(c,source('gold'),travel-44,6,91*grow,46*grow,angle+.04,.79*(1-t*.30),'brightness(1.65)');
   }else if(type==='impact'){
    // Enemy-only contact flash: not drawn on an attack that misses.
    const pulse=Math.sin(Math.PI*(.12+t*.81)),grow=.45+1.02*pulse;
    texture(c,source('gold'),0,0,135*grow,128*grow,phase*.19,.98*(1-t*.28),'brightness(1.85) saturate(.7)');
    texture(c,source('red'),19+26*t,4,99*grow,90*grow,phase*.13,.87*(1-t*.38),'brightness(1.53) saturate(1.35)');
    texture(c,source('blue'),-13,-8,79*grow,80*grow,-phase*.13,.78*(1-t*.39),'brightness(2.1)');
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
  for(const id of ['blue','gold','red']){
   const bitmap=source(id);
   if(bitmap&&!bitmap.complete&&typeof bitmap.addEventListener==='function')
    bitmap.addEventListener('load',queueBuild,{once:true});
  }
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
  if(stamps.length>=STAMP_BUDGET)stamps.shift();
  stamps.push({type,x,y,facing,z,life,maxLife:life,scale});
 }
 function reset(){stamps.length=0;echoes.length=0;lastX=lastY=null;lastKind=lastMove='';stepDistance=echoClock=moveFrameClock=0;clock=0;eventFlash=null;totalDrawCalls=0}
 function event(type,p){
  if(!p)return;
  const d=p.facing||1;
  if(type==='parry')stamp('shield',p.x+d*44,p.y-125,d,.39,1.55,p.z||0);
  else if(type==='hurt')stamp('hurt',p.x,p.y-140,d,.38,1.56,p.z||0);
  else if(type==='dodge')stamp('speed',p.x-d*38,p.y-75,d,.36,1.56,p.z||0);
  else if(type==='land')stamp('land',p.x,p.y-5,d,.43,1.55,0);
  else if(type==='jump')stamp('leap',p.x,p.y-25,d,.42,1.28,0);
  // Attack swordlight is drawn from the hero every animation frame,
  // not stamped at a guessed enemy position. Contact has its own onHit FX.
  else if(type==='attack')return;
  else if(type==='execute')stamp('blade',p.x+d*145,p.y-132,d,.38,2.2,p.z||0);
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
    const facing=Math.abs(p.x-lastX)>.2?Math.sign(p.x-lastX):(p.facing||1);
    stamp('dust',p.x-facing*(kind==='run'?33:19)+left*18,p.y-11,facing,
      kind==='run'?.67:.59,kind==='run'?1.68:1.35,0);
    if(kind==='run'&&stamps.length<20)
     stamp('speed',p.x-facing*94,p.y-65,facing,.33,1.43,0);
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
  if(echoes.length>ECHO_BUDGET)echoes.shift();
  echoClock=kind==='run'?.062:kind==='dash'?.050:.097;
 }
 function cell(ctx,type,frame,x,y,w,h,alpha=1,face=1,angle=0){
  const sheet=atlases[type];if(!sheet)return;
  ctx.save();ctx.globalAlpha=clamp(alpha,0,1);
  ctx.translate(x,y);ctx.scale(face<0?-1:1,1);if(angle)ctx.rotate(angle);
  ctx.drawImage(sheet,(frame%4)*SIZE,Math.floor(frame/4)*SIZE,SIZE,SIZE,-w/2,-h/2,w,h);
  ctx.restore();totalDrawCalls++;
 }
 function renderStamps(ctx){
  for(const a of stamps){
   if(a.type==='impact')continue; // Impact belongs on top of its victim, after all actors.
   const phase=clamp(1-a.life/a.maxLife,0,.999),frame=Math.min(7,Math.floor(phase*8));
   const lift=a.type==='dust'?phase*15:a.type==='land'?0:0;
   const grow=1+phase*.27;
   cell(ctx,a.type,frame,a.x,a.y-a.z-lift,(a.type==='dust'?198:166)*a.scale*grow,(a.type==='dust'?139:117)*a.scale*grow,
     a.type==='dust'?Math.min(1,.45+a.life/a.maxLife*.8):Math.min(1,.29+a.life/a.maxLife*.85),a.facing);
  }
 }
 function drawImpacts(ctx){
  if(!ready)return;
  for(const a of stamps){
   if(a.type!=='impact')continue;
   const phase=clamp(1-a.life/a.maxLife,0,.999);
   const frame=Math.min(7,Math.floor(phase*8));
   const grow=1+phase*.24;
   cell(ctx,'impact',frame,a.x,a.y-a.z,153*a.scale*grow,141*a.scale*grow,
    Math.min(1,.42+a.life/a.maxLife*.74),a.facing);
  }
 }
 function drawEchoes(ctx){
  for(const a of echoes){
   const frame=a.frame;if(!frame?.canvas)continue;
   const b=frame.bounds,sc=frame.unitScale??1;
   ctx.save();ctx.globalAlpha=(a.kind==='run'?.61:a.kind==='dash'?.54:.48)*clamp(a.life/a.maxLife,0,1);
   ctx.translate(a.x,Math.round(a.y-a.z+8));ctx.scale(a.face<0?-1:1,1);
   ctx.drawImage(frame.canvas,b.x,b.y,b.w,b.h,-b.w*sc/2,-b.h*sc,b.w*sc,b.h*sc);
   ctx.restore();totalDrawCalls++;
  }
 }
 // Combat direction comes from the active animation, not the enemy location.
 function attackBeam(p,key,kind){
  const move=(p.moveName||key||'').toLowerCase();
  const kick=/kick|heel|crescent/.test(move);
  const rising=/uppercut|rising|superman/.test(move);
  const low=/lowkick|shovel/.test(move);
  const sweep=/spinning|roundkick|crescent|hook|elbow/.test(move);
  const air=kind==='airStrike';
  const age=p.attackDuration?clamp(1-p.attack/p.attackDuration,0,1):.45;
  const bloom=clamp(age/.37,0,1)*(1-.18*clamp((age-.80)/.2,0,1));
  const height=air?118:kick?110:93;
  return {
   frame:Math.min(7,Math.floor(age*8)),
   offset:70+age*123+(kick?19:0),
   width:(kick?334:305)+bloom*(kick?136:151),
   height:height+bloom*(air?49:32),
   y:p.y-(p.z||0)-(air?69:low?77:kick?107:rising?160:143),
   angle:rising?-.30:low?.20:sweep?-.14:air?.26:0
  };
 }
 function onHit(enemy,hero,heavy=false){
  if(!enemy||enemy.dead||!hero)return;
  // Enemy-local contact only if the damage resolver actually registered a hit.
  stamp('impact',enemy.x,enemy.y-126,hero.facing||1,heavy?.36:.27,
        heavy?1.65:1.28,enemy.z||0);
 }
 function drawBehind(ctx,p,key){
  if(!ready)return;
  const kind=kindOf(key,p),face=key==='backwalk'?-(p.facing||1):(p.facing||1),x=p.x,y=p.y,z=p.z||0;
  const f=Math.floor(clock*(kind==='run'?18:kind==='walk'?14:11))%8;
  renderStamps(ctx);drawEchoes(ctx);
  if(kind==='run'){
   cell(ctx,'speed',f,x-face*111,y-z-93,425,248,1,face);
   cell(ctx,'speed',(f+3)%8,x-face*77,y-z-157,382,218,.97,face);
   cell(ctx,'dust',(f+2)%8,x-face*46,y-13,353,183,1,face);
  }else if(kind==='walk'){
   cell(ctx,'dust',f,x-face*34,y-8,308,174,1,face);
   cell(ctx,'speed',(f+3)%8,x-face*83,y-z-65,273,151,.94,face);
  }else if(kind==='dash'){
   cell(ctx,'speed',f,x-face*103,y-z-110,340,236,1,face);
   cell(ctx,'dust',(f+3)%8,x-face*49,y-8,260,128,.94,face);
  }else if(kind==='strike'||kind==='airStrike'){
   const strike=attackBeam(p,key,kind);
   cell(ctx,'blade',strike.frame,x+face*(strike.offset-25),strike.y+7,
    strike.width*.97,strike.height*1.30,.83,face,strike.angle);
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
   cell(ctx,'speed',(f+2)%8,x-face*15,y-z-63,310,156,.97,face);
   cell(ctx,'dust',(f+5)%8,x+face*14,y-6,312,154,.98,face);
  }else if(kind==='walk'){
   cell(ctx,'dust',(f+4)%8,x+face*18,y-7,218,127,.98,face);
  }else if(kind==='dash'){
   cell(ctx,'speed',(f+4)%8,x+face*38,y-z-120,242,178,.89,face);
  }else if(kind==='strike'||kind==='airStrike'){
   const strike=attackBeam(p,key,kind);
   // Tip travels away from the hero while the base stays at the attack arm/leg.
   // This slash is always drawn, even if no enemy was struck.
   cell(ctx,'blade',strike.frame,x+face*strike.offset,strike.y,
    strike.width,strike.height,1,face,strike.angle);
   if(kind==='airStrike')cell(ctx,'leap',(strike.frame+2)%8,x+face*41,y-z-68,171,178,.69,face);
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
 window.RZHeroFx={init,update,capture,drawBehind,drawFront,drawImpacts,event,onHit,reset,
  getStatus:()=>({ready,atlasCount:Object.keys(atlases).length,stamps:stamps.length,echoes:echoes.length,drawCalls:totalDrawCalls})};
})();
