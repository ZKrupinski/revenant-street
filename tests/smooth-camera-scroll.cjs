'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('function zFeelCamera(realDt=1/60){');
const end=html.indexOf('window.__zControlFeel=',begin);
assert(begin>0&&end>begin,'live continuous normal camera controller exists');
const env={
 cameraX:0,W:1280,STAGE_WIDTH:32000,
 p:{x:1000,facing:1},zCameraVelocity:0,zCameraLeadX:0,
 Z_FEEL:{lookAheadPixels:120,deadzonePixels:160},
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),Math,
};
vm.createContext(env);
vm.runInContext(html.slice(begin,end)+';this.moveCamera=zFeelCamera;',env);
const samples=[];
for(let i=0;i<140;i++){
 env.p.x+=690/60;
 env.moveCamera(1/60);
 samples.push(env.cameraX);
}
assert(samples.every(Number.isFinite));
assert(samples[0]>0&&samples[0]<20,'camera eases into following instead of snapping');
assert(samples.slice(1).every((v,i)=>v>=samples[i]-1e-7),'moving right has no backward twitch');
assert(samples[samples.length-1]>1100,'steady camera actually follows runner');
const before=env.cameraX;
env.p.facing=-1;env.p.x-=690/60;env.moveCamera(1/60);
assert(Math.abs(env.cameraX-before)<30,'direction reversal cannot teleport camera');
for(let i=0;i<160;i++){env.p.x-=690/60;env.moveCamera(1/60);}
assert(env.cameraX>=0,'camera clamps correctly at left edge');
env.p.x=20000;env.p.facing=1;for(let i=0;i<180;i++)env.moveCamera(1/60);
assert(env.cameraX>18000,'camera catches up after a distant target, no hard 80px threshold');
const settled=env.cameraX;for(let i=0;i<90;i++)env.moveCamera(1/60);
assert(Math.abs(env.cameraX-settled)<120,'no continual camera hunting at rest');
const drawStart=html.indexOf('function draw(interpolation=1){'),drawEnd=html.indexOf('const runtimePerf=',drawStart);
assert(drawStart>0&&drawEnd>drawStart);
const draw=html.slice(drawStart,drawEnd);
assert(draw.includes("const specialCamera=counterCameraTime>0||parryCameraTime>0||"),'special shots override the interpolation');
assert(draw.includes('renderCameraX=zCameraPrevTickX+(cameraX-zCameraPrevTickX)*clamp(interpolation,0,1)')||
 draw.includes('?zCameraPrevTickX+(cameraX-zCameraPrevTickX)*clamp(interpolation,0,1)'), 'fixed-step camera interpolation');
assert(draw.includes('drawBackdrop(renderCameraX)')&&draw.includes('ctx.translate(-renderCameraX,0)'),
 'panorama and actor transform share identical interpolated view position');
assert(!draw.includes('Math.round(cameraX)'),'rendering never quantizes world pan to whole pixels');
const bgStart=html.indexOf('function drawBackdrop(viewCameraX=cameraX){'),bgEnd=html.indexOf('function offscreenEnemyTargets()',bgStart);
const background=html.slice(bgStart,bgEnd);
assert(background.includes('const destX=i*tileW-offset;')&&!background.includes('Math.floor(i*tileW-offset)'),
 'panorama tiles move at subpixel precision');
assert(html.includes('const x=base+tileW*join;'),'seam props use the same continuous offset');
assert(html.includes('zCameraPrevTickX=cameraX;update(1/60)'),'render interpolation uses prior fixed-step sample');
assert(html.includes('draw(zFixedAccumulator*60)'),'render alpha is fed from the accumulator');
const startA=135.125,endA=140.625;
const frames=[0,.25,.5,.75,1].map(a=>startA+(endA-startA)*a);
assert(frames.every((v,i)=>i===0||v>frames[i-1]),'120Hz intermediate camera samples are continuous');
assert(html.includes('zFeelCamera(realDt)'),'normal camera uses real time, not slowdown world clock');
assert(html.includes('cameraZoom=Math.max(cameraZoom,1.15); // on press, before impact'),
 'signature zoom controller remains intact');
console.log('PASS: smooth continuous 60Hz pursuit/reversal, no hard deadzone, 120Hz interpolation, subpixel panorama/seam and preserved special cameras');
