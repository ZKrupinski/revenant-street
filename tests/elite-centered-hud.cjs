'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const marker='<style id="project-z-elite-centered-energy-v1">';
const begin=html.indexOf(marker),end=html.indexOf('</style>',begin);
assert(begin>0&&end>begin,'elite HP bar has its own small centered style block');
const css=html.slice(begin,end);
for(const part of [
 '#stageWrap #bossHud.compact-elite-energy',
 'left:50%!important;right:auto!important',
 'transform:translateX(-50%)!important',
 'width:clamp(174px,23cqw,292px)!important',
 'height:5px!important',
 'border-radius:0!important',
 '@container (max-width:620px)',
 'width:clamp(158px,41%,228px)!important'
]) assert(css.includes(part),'sharp centered elite bar missing '+part);
assert(html.includes("eliteEnergyHud.classList.toggle('compact-elite-energy',!!eliteOrBoss&&eliteOrBoss.type!=='boss')"),
 'elite and red-hood intruder get compact HUD only when alive and in range');
assert(html.includes("eliteEnergyHud.classList.toggle('final-boss-energy',!!eliteOrBoss&&eliteOrBoss.type==='boss')"),
 'final boss uses distinct original right-side large HP HUD');
assert(html.includes("eliteEnergyHud.hidden=gameState!=='playing'||!eliteOrBoss"),
 'HUD hides on fight exit and when no elite or boss is nearby');
assert(!css.includes('.final-boss-energy'),'original final boss styles untouched');
assert(html.includes("group.reduce((sum,e)=>sum+(e.dead?0:Math.max(0,e.hp)),0)"),
 'group HP still accounts for red-hood squad casualties');
console.log('PASS: slim 5px centered elite HUD, responsive sharp layout, unchanged final Hunter HP rail');
