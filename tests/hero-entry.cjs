'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const asset=fs.readFileSync(path.join(root,'assets/hero/hero-intro-scarf-free-clean-8f.webp'));
assert.equal(asset.toString('ascii',0,4),'RIFF');
assert.equal(asset.toString('ascii',8,12),'WEBP');
assert(asset.length>400000,'the cleaned hero atlas contains 8 full-resolution painted poses');
assert(html.includes("const HERO_ENTRY_ATLAS_URL='./assets/hero/hero-intro-scarf-free-clean-8f.webp?v=20261101-recut'"),
 'Game must load locally deployed, precision-cut scarf-free bitmap (not remote original)');
assert(html.includes('const HERO_ENTRY_FRAME_W=640,HERO_ENTRY_FRAME_H=560,HERO_ENTRY_FOOT_Y=480'),
 'all eight sprites have a safe cell border and identical grounded foot pivot');
assert(html.includes("['주인공 머플러 제거 등장 8프레임',()=>ensureBitmapDecoded(heroEntry.image)]"),
 'decode the packed images BEFORE the START transition');
const drawPos=html.indexOf('function draw(){');
const drawBody=html.slice(drawPos,html.indexOf('const runtimePerf',drawPos));
assert(drawBody.indexOf("if(heroEntry.active){drawHeroEntryCinematic();return;}")>=0);
assert(drawBody.indexOf("if(heroEntry.active){drawHeroEntryCinematic();return;}")<drawBody.indexOf("ctx.save();"),
 'cinematic is drawn BEFORE canvas camera shake and zoom; black cannot expose edge strips');
assert(html.includes("ctx.fillStyle='#000000';ctx.fillRect(0,0,W,H)"),
 'initial background is strictly black, not darkened pre-existing street');
const introStart=html.indexOf('function drawHeroEntryCinematic()');
const introEnd=html.indexOf('// Each confirmed combo impact',introStart);
const intro=html.slice(introStart,introEnd);
assert(intro.indexOf("ctx.fillStyle='#000000'")<intro.indexOf('drawBackdrop()'),
 'real backdrop is rendered only once after black fill');
assert(intro.includes('if(backdropAlpha>0)') && intro.includes('heroEntryReveal()'),
 'street is not visible before flash timing');
assert(intro.includes('ctx.fillRect(0,0,W,H);')&&intro.includes('heroEntryFlash()'),
 'white flash overlays the existing stage on grounded landing');
assert(intro.includes('stagePoseOpacity>=.5')&&intro.includes('paintZ(actorScreenX,p.y,p.z,1)'),
 'arrival switches to solid combat sprite at matched foot position without translucent crossfade');
assert(!intro.includes('ctx.globalAlpha=1-stagePoseOpacity'),
 'original arrival art is no longer faded to semi-transparency during hero handoff');
assert(html.includes('  if(!heroEntry.landed&&heroEntry.elapsed>=heroEntry.revealAt){'),
 'land sound+rumble must align with background reveal flash');
assert(html.includes("if(heroEntry.active&&gameState!=='playing')heroEntry.active=false"),
 'reward/pause UI can abort intro without freezing');
assert(html.includes("p.inv=Math.max(p.inv,.30);setStatus('COMBAT LIVE');updateHud()"),
 'the full game and HUD resume only after last frame');
assert(html.includes('getIntroStatus:()=>('),'QA can observe the startup phase');
const ctx={};
vm.runInNewContext("const clamp=(v,a,b)=>Math.max(a,Math.min(v,b));function heroEntryPose(u){return Math.min(7,Math.floor(clamp(u,0,.99999)*8))};function heroEntryEase(t){t=clamp(t,0,1);return t*t*(3-2*t)};this.pose=heroEntryPose;this.ease=heroEntryEase",ctx);
assert.deepEqual(Array.from({length:8},(_,i)=>ctx.pose((i+.5)/8)),[0,1,2,3,4,5,6,7]);
assert.equal(ctx.pose(1),7);
for(const t of [0,.2,.5,1,1.4]){const a=ctx.ease(t);assert(a>=0&&a<=1)}
console.log('PASS: 8 re-cut original frames, completely black intro, timed landing flash, smooth backdrop/game-actor reveal');
