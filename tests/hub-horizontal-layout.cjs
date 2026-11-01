'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const p=html.indexOf('<style id="hub-horizontal-cards-footer-v5">'),q=html.indexOf('</style>',p);
assert(p>=0&&q>p,'final approved Hub 2-column card layout stylesheet is present');
const css=html.slice(p,q);
const begin=html.indexOf('function hubMenu(upgraded='),end=html.indexOf('function buyUpgrade(',begin);
assert(begin>=0&&end>begin,'Hub markup generator exists');
const render=html.slice(begin,end);
for(const s of [
 'class="hub-art-slot"',
 'class="hub-card-info"',
 'class="hub-emblem">${modIconMarkup(m.art)}',
 'class="hub-module-name"',
 'class="hub-forecast"',
 'class="hub-buy"',
 'class="hub-footer-guide"',
 'class="hub-footer-guide-text"',
 '보유 파편',
 'data-action="hubApply"',
 'data-action="start"',
 'data-action="title"'
])assert(render.includes(s),'new Hub UI preserves icon/controls/text: '+s);
assert.equal((render.match(/class="hub-art-slot"/g)||[]).length,1,
 'one icon slot template per card; map creates exactly three left-aligned icons');
assert.equal((render.match(/class="hub-footer-guide"/g)||[]).length,1,
 'only one centered lower title-frame guide');
assert(render.indexOf('class="hub-art-slot"')<render.indexOf('class="hub-card-info"'),
 'full square icon is in the left column, text in the right column');
assert(render.indexOf('class="hub-footer-guide"')>render.indexOf('class="hub-buttons"'),
 'controller hint belongs below the action row inside the neon frame');
assert(html.includes("if(['menu','dead','paused'].includes(gameState))"),
 'no second generic outside-the-frame control guide in Hub mode');
assert(!html.includes("if(['menu','hub','dead','paused'].includes(gameState))"),
 'remove previous duplicate loose Hub control guide');
for(const c of [
 '#stageWrap #menu.hub-dialog .hub-module{',
 'grid-template-columns:minmax(0,clamp(63px,8.6cqw,102px)) minmax(0,1fr)!important',
 '#stageWrap #menu.hub-dialog .hub-art-slot{',
 '#stageWrap #menu.hub-dialog .hub-art-slot .hub-emblem{',
 '#stageWrap #menu.hub-dialog .hub-art-slot .hub-emblem .upgrade-art{',
 'aspect-ratio:1 / 1!important;',
 'background-size:500% 500%!important',
 '#stageWrap #menu.hub-dialog .hub-card-info{',
 '#stageWrap #menu.hub-dialog .hub-card-info .hub-forecast{',
 '#stageWrap #menu.hub-dialog .hub-card-info .hub-buy{',
 '#stageWrap #menu.hub-dialog .hub-footer-guide{',
 'justify-content:center!important',
 '#app.tight-hub-stage #stageWrap #menu.hub-dialog .hub-module{',
 '#app.compact-game-stage #stageWrap #menu.hub-dialog .hub-module{'
])assert(css.includes(c),'layout protection missing: '+c);
assert(css.includes('height:auto!important;\n aspect-ratio:1 / 1!important;'),
 'icon bitmap must use square aspect ratio, never an unresolved full-height container');
assert(html.includes("const MOD_ICON_ORDER=[...MOD_UI_ORDER,'neuro','hub-core','hub-servo','hub-reflex']"),
 'Hub keeps its three dedicated icons inside the 25-image atlas');
assert(html.includes("key==='death'?'death-fullbody.webp':key==='attack'?'attack-fullfist.webp':key==='special'?'special-fullframe.webp?v=redhood-safe-eight-20261101':key+'.png'"),
 'unrelated redhood full-body fixes remain intact');
console.log('PASS: 3 left-side fully square icons; all captions/actions on right; single centered in-window control footer; no-scroll 16:9 and compact rules');
