'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=html.match(/<style id="z-neon-cybernetic-ui-v3">([\s\S]*?)<\/style>/);
assert(match,'approved neon cybernetic art-direction stylesheet must be linked in index.html');
const css=match[1];
for(const name of ['z-neon-outer-v2.png','z-neon-card-v2.png','z-tech-panel-v2.png']){
 const p=path.join(root,'assets','ui',name);
 const b=fs.readFileSync(p);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' must be real PNG bitmap artwork');
 assert(css.includes(name),name+' must appear in live UI rules');
}
for(const s of ['#stageWrap #menu.reward-dialog{','#stageWrap #menu.reward-dialog .upgrade-btn{','#stageWrap #menu.hub-dialog{','#stageWrap #menu.hub-dialog .hub-module{','#stageWrap #menu.reward-dialog .upgrade-art::after,','--z-neon-outer:','--z-neon-card:','grid-template-columns:repeat(3,minmax(0,1fr))!important','overflow:hidden!important']){
 assert(css.includes(s),'neon popups missing: '+s);
}
for(const s of ['class="up-progression"','class="${level?\'up-levelup\':\'up-new\'}"','class="up-lvl"','class="choice-grid"']){
 assert(html.includes(s),'reward card hierarchy missing: '+s);
}
assert(html.includes("class=\"hub-module hub-centered-card hub-${m.id}"),'hub centered cards retain ID/selection and gamepad semantics');
assert(!css.includes('data:image/svg'),'cybernetic design must be bitmap based, not vector art');
const iconPath=path.join(root,'assets/ui/upgrade-icons-v4.webp');
const atlas=fs.readFileSync(iconPath);
assert.equal(atlas.subarray(0,4).toString('ascii'),'RIFF','one complete WebP atlas');
assert.equal(atlas.subarray(8,12).toString('ascii'),'WEBP','25 icons load as WebP');
assert(atlas.length>200000,'final atlas retains a crisp painterly icon resolution');
assert(html.includes("if(src.src.includes('upgrade-icons-v4.webp'))"),'uniform 256px icon frames remain untouched');
assert(html.includes('sourcePreserved:true'), 'do not downscale the final painted 25-icon atlas');
assert(css.includes('content:none!important; /* The icon atlas already includes'),'a single neon frame should render, not two overlapping');
console.log('PASS: bitmap magenta/cyan window rails, hub and reward hierarchy, 3-column 16:9 layout, and NEW rank markers');

// The game title and masthead must stay on the approved hand-painted logo art.
require('./title-bi.cjs');

// Hero entrance is part of the initial UI-to-combat transition.
require('./hero-entry.cjs');

// Only the mid-bosses share a small screen-centered HP display.
require('./elite-centered-hud.cjs');
