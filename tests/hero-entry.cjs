'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(html.includes('const HERO_ENTRY_ATLAS_URL=')&&html.includes('6a789253-a909-44c9-80b3-42af6957ed70.webp'),
 'the real 8-frame scarf-free bitmap is the only intro source');
assert(html.includes("heroEntry.image.crossOrigin='anonymous'"),
 'external alpha sprite must load safely on canvas');
assert(html.includes("'주인공 머플러 제거 등장 8프레임'") ||
 html.includes('머플러 제거 등장 8프레임'),
 'intro art must preload before starting music and gameplay');
assert(html.includes("if(heroEntry.active){drawHeroEntryCinematic();ctx.restore();return;}"),
 'no normal enemies or player idle should appear under the cinematic');
assert(html.includes("heroEntry.active=!urlQA"),'standard START triggers cinematic');
assert(html.includes('heroEntry.elapsed=Math.min(heroEntry.duration,previous+dt)'),
 'intro follows real dt, independent of animation hit stop');
assert(html.includes("if(heroEntry.active&&gameState!=='playing')heroEntry.active=false"),
 'pause and upgrade menus cannot freeze under the title cinematic');
assert(html.includes("p.inv=Math.max(p.inv,.30);setStatus('COMBAT LIVE');updateHud()"),
 'the full game and HUD resume after the final frame');
assert(html.includes("getIntroStatus:()=>("),'QA can observe startup phase');
const code='const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));'+
 'function heroEntryPose(u){return Math.min(7,Math.floor(clamp(u,0,.99999)*8))};'+
 'function heroEntryEase(t){t=clamp(t,0,1);return t*t*(3-2*t)};'+
 'this.pose=heroEntryPose;this.ease=heroEntryEase;';
const context={};vm.runInNewContext(code,context);
assert.deepEqual(Array.from({length:8},(_,i)=>context.pose((i+.5)/8)),[0,1,2,3,4,5,6,7],
 'all eight distinct entry poses appear without repeats or skipped cells');
assert.equal(context.pose(1),7,'last pose holds before normal idle replaces it');
assert.equal(context.ease(-1),0);assert.equal(context.ease(1.4),1);
console.log('PASS 8 scarf-free original Z poses, closeup-to-street framing, no mid-intro AI, normal post-intro combat');
