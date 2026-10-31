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
assert(html.includes("class=\"hub-module hub-${m.id}"),'hub cards retain existing ID/selection and gamepad semantics');
assert(!css.includes('data:image/svg'),'cybernetic design must be bitmap based, not vector art');
console.log('PASS: bitmap magenta/cyan window rails, hub and reward hierarchy, 3-column 16:9 layout, and NEW rank markers');
