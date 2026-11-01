'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const assets=[
 ['title','assets/ui/project-z-title-bi-20261101.webp',140000],
 ['masthead','assets/ui/project-z-wordmark-bi-20261101.webp',20000]
];
for(const [role,name,minBytes] of assets){
 const buf=fs.readFileSync(path.join(root,name));
 assert.equal(buf.toString('ascii',0,4),'RIFF',role+' must be a real raster WebP');
 assert.equal(buf.toString('ascii',8,12),'WEBP',role+' must have WebP encoding');
 assert(buf.byteLength>minBytes,role+' must retain detailed bitmap art, not an empty replacement');
}
assert(html.includes('class="masthead-brand-bi" src="./assets/ui/project-z-wordmark-bi-20261101.webp"'),
 'small top branding shows approved original title art instead of old font');
assert(html.includes('class="title-full-bi" src="./assets/ui/project-z-title-bi-20261101.webp"'),
 'the main title shows approved full original punch-through-frame composition');
assert(!html.includes('<h1>REVENANT <span>STREET</span></h1>'),
 'old type-only game logo must not appear instead of bitmap');
assert(!html.includes('<strong>REVENANT <em>STREET</em></strong>'),
 'old type-only masthead logo must not remain');
const p=html.indexOf('<style id="project-z-final-bitmap-bi-v1">');
const q=html.indexOf('</style>',p);
assert(p>0&&q>p,'final title presentation CSS must be last in head');
const css=html.slice(p,q);
for(const k of [
 '#stageWrap #menu.title-dialog',
 '.title-full-bi',
 'object-fit:cover!important',
 '.masthead-brand-bi',
 'object-fit:contain',
 '.title-bi-fade',
 'justify-content:flex-end',
 '#app.compact-game-stage'
])assert(css.includes(k),'preserve full art and accessible 16:9 layout: '+k);
assert(html.includes('class="title-bi-accessible">REVENANT STREET</h1>'),
 'screen readers still get a text title');
assert(html.includes('data-action="start"')&&html.includes('data-action="hub"')&&html.includes('data-action="guide"'),
 'all original title buttons remain usable');

const start=html.indexOf('function titleMenu(){');
const end=html.indexOf('function guideMenu(',start);
assert(start>0&&end>start,'original titleMenu function still exists');
const title=html.slice(start,end);
for(const banned of ['<p class="desc">','<div class="feature-row">','${renderTitleBaseStats()}','<p class="micro">']){
 assert(!title.includes(banned),'title overlay no longer obscures BI: '+banned);
}
const css2=html.slice(html.indexOf('<style id="project-z-title-art-first-v2">'));
assert(css2.includes('#stageWrap #menu.title-dialog .all-face-confirm-hint'),
 'automatically appended controller hint is hidden only on the title screen');
assert(css2.includes('max-height:44px!important'),
 'title action buttons have a compact height cap');
assert(css2.includes('white-space:nowrap!important'),
 'title buttons stay in one line rather than growing vertically');
assert((title.match(/data-action="(start|hub|guide)"/g)||[]).length===3,
 'all three title actions remain intact');
const titleActions=['data-action="hub"','data-action="start"','data-action="guide"'];
const buttonOrder=titleActions.map(a=>title.indexOf(a));
assert(buttonOrder.every(i=>i>=0)&&buttonOrder[0]<buttonOrder[1]&&buttonOrder[1]<buttonOrder[2],
 'HUB, centered GAME START, and controls are in this order');
assert(title.includes('class="main-btn title-game-start" data-action="start"><span class="title-start-text">GAME START</span></button>'),
 'center start button keeps its start action and bold flashing text span');
const titleStyleStart=html.indexOf('<style id="project-z-title-art-first-v2">');
const titleStyleEnd=html.indexOf('</style>',titleStyleStart);
const titleStyle=titleStyleStart>=0&&titleStyleEnd>titleStyleStart?[null,html.slice(titleStyleStart,titleStyleEnd)]:null;
assert(titleStyle,'art-first title style exists');
for(const token of ['.buttons.title-action-row','font:1000','z-title-start-text-blink','steps(1,end)','prefers-reduced-motion'])
 assert(titleStyle[1].includes(token),'title center/blink style missing: '+token);

// The CTA is physically centered: symmetric side tracks, a larger middle track.
assert(titleStyle[1].includes('grid-template-columns:minmax(0,1fr) minmax(0,1.27fr) minmax(0,1fr)!important'),
 'GAME START must be exactly horizontally centered and wider than side buttons');
assert(titleStyle[1].includes('height:clamp(47px,7.8cqh,63px)!important'),
 'GAME START must be taller than the secondary actions');
assert(titleStyle[1].includes('font:1000 clamp(20px,2.55cqw,30px)'),
 'GAME START must have the largest heavyweight type');
assert(titleStyle[1].includes('55%,100%{opacity:.48}'),
 'GAME START blink should remain readable even in its dim phase');
assert(html.includes("menuPad.index=$('menu').querySelector('.title-action-row')?1:0;"),
 'title confirm defaults to the middle GAME START, without initial focus');
assert(!html.includes("if(gameState!=='reward')selectMenuItem(0)"),
 'no menu may auto-select and light an unrelated button on open');

console.log('PASS: BI landing screen has zero lower text lines and compact readable action buttons');

console.log('PASS: title and header use approved original cybernetic bitmap, with no cropped artwork or missing controls');
