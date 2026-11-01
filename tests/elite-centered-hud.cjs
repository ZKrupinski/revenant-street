'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('// Only the final boss gets a separate, screen-fixed health bar.');
const end=html.indexOf('function update(dt){',start);
assert(start>0&&end>start,'boss-only HUD update branch exists');
const code=html.slice(start,end);
assert(code.includes("e.type==='boss'"),'final boss remains the only eligible HUD subject');
assert(!code.includes("e.type==='elite'")&&!code.includes("e.type==='intruder'"),
 'elites and support teams no longer own screen-fixed health bars');
assert(code.includes("bossEnergyHud.hidden=gameState!=='playing'||!activeBoss;"),
 'top health bar disappears when final boss is absent');
assert(code.includes("bossEnergyHud.classList.toggle('final-boss-energy',!!activeBoss)"),
 'final Hunter keeps its distinct HP rail');
assert(code.includes("clamp(100*activeBoss.hp/Math.max(1,activeBoss.maxHp),0,100)"),
 'final boss retains accurate HP fill');
assert(!html.includes('<style id="project-z-elite-centered-energy-v1">'),
 'obsolete elite health-bar CSS is removed');
assert(!html.includes("classList.toggle('compact-elite-energy'"),
 'elite HP rail is never reactivated through UI classes');
assert(html.includes("bossHud\" hidden"),
 'final boss HUD remains part of the rendered game UI');
console.log('PASS: elite and intruder standalone HP bars removed; final Hunter bar remains fully functional');
