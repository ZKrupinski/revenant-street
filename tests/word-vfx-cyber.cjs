'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),file=path.join(root,'assets/vfx/project_z_execution_critical_cyber_8f.png');
const data=fs.readFileSync(file);
assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG magic');
assert.equal(data.readUInt32BE(16),2176,'8 frames x 272px');
assert.equal(data.readUInt32BE(20),320,'2 animation rows x 160px');
for(const name of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 assert(html.includes('function spawnCombatWordFx(name,target)'),'sprite FX emitter');
 assert(html.includes('function drawCombatWordFx(f)'),'atlas sprite renderer');
 assert(html.includes("spawnCombatWordFx('execution',target)"),'execution sprite called');
 assert(html.includes("spawnCombatWordFx('critical',e)"),'critical sprite called');
 assert(!html.includes("flash('EXECUTION!'"),'old text execution popup removed');
 assert(!html.includes("floatText('CRITICAL!'"),'old drawn critical text removed');
 assert(html.includes("['사이버네틱 EXECUTION / CRITICAL 8프레임'"),'preloaded before combat');
 assert(html.includes("'combatWordSprite','parrySuccess10'"),'always foreground');
 assert(html.includes("if(f.kind==='combatWordSprite'){drawCombatWordFx(f);continue;}"),'FX draw pass');
 assert(html.includes('if(f.kind===\'combatWordSprite\'&&(f.drawnFrame??-1)<7)'), 'all frames retained');
}
console.log('PASS: exact 8+8 cyberpunk raster text frames; execution / critical triggers; preload; no canvas text or skipped frames');
