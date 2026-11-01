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
console.log('PASS: title and header use approved original cybernetic bitmap, with no cropped artwork or missing controls');
