'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const getStyle=id=>{
 const p=html.indexOf('<style id="'+id+'">'),q=html.indexOf('</style>',p);
 assert(p>=0&&q>p,'expected stylesheet: '+id);
 return {position:p,css:html.slice(p,q)};
};
const oldSplit=getStyle('hub-horizontal-cards-footer-v5');
const oldWide=getStyle('hub-single-line-stat-and-uncropped-card-v6');
const center=getStyle('hub-centered-artwork-v7');
assert(center.position>oldSplit.position&&center.position>oldWide.position,
 'centered style must override old split layouts');
for(const s of [
 '#stageWrap #menu.hub-dialog .hub-module{',
 'display:flex!important;flex-direction:column!important',
 'grid-template-columns:none!important;grid-template-rows:none!important',
 'border-right:0!important',
 'width:clamp(90px,25cqh,172px)!important',
 'aspect-ratio:1/1!important',
 'align-items:center!important;justify-content:center!important',
 '.hub-card-info .hub-module-name',
 '.hub-card-info .hub-forecast',
 '.hub-card-info .hub-buy',
 '#app.tight-hub-stage',
 '#app.compact-game-stage',
 '@media(max-height:580px)'
])assert(center.css.includes(s),'missing centered Hub visual protection: '+s);
// Card-relative unit sizing must supersede the previous stage-relative 25cqh.
const fit=getStyle('hub-card-no-overlap-v8');
assert(fit.position>center.position,'safe portrait/landscape card sizing must be the last Hub styling');
for(const rule of [
 'container-name:hub-upgrade-card;',
 'container-type:size;',
 'height:100%!important;max-height:100%!important;min-height:0!important;',
 'width:min(138px,38cqh,70cqw)!important',
 'height:min(138px,38cqh,70cqw)!important',
 'flex:1 1 auto!important;max-height:none!important;overflow:hidden!important;',
 '.hub-card-info .hub-module-name',
 '.hub-card-info .hub-forecast',
 '.hub-card-info .hub-buy',
 'position:static!important',
 'height:clamp(24px,15cqh,38px)!important',
 '@container hub-upgrade-card (max-height:220px)',
 '@container hub-upgrade-card (max-height:165px)'
])assert(fit.css.includes(rule),'Hub icon may cover title/stats/button on small cards: '+rule);
assert(fit.css.indexOf('.hub-art-slot')<fit.css.indexOf('.hub-card-info'),
 'art slot precedes text and footer in the card layout');

// The final override must prioritize numbers and buttons over decorative art.
const finalFit=getStyle('hub-reward-readable-v9');
assert(finalFit.position>fit.position,'readable-card overrides must load after earlier artwork styles');
for(const rule of [
 '#stageWrap #menu.hub-dialog .hub-modules .hub-module .hub-art-slot>.hub-emblem{',
 'width:min(100px,40cqh,40cqw)!important',
 'height:min(100px,40cqh,40cqw)!important',
 '#stageWrap #menu.hub-dialog .hub-modules .hub-module .hub-module-name{',
 '#stageWrap #menu.hub-dialog .hub-modules .hub-module .hub-forecast{',
 '#stageWrap #menu.hub-dialog .hub-modules .hub-module .hub-buy{',
 'margin:auto auto 0!important',
 'width:78%!important',
 '@container hub-upgrade-card (max-height:230px)',
 '#stageWrap #menu.reward-dialog>.choice-grid>.upgrade-btn>.sym>.upgrade-art{',
 'width:min(120px,19cqh,66cqw)!important',
 '#stageWrap #menu.reward-dialog>.choice-grid>.upgrade-btn>.up-progression{',
 'display:none!important; /* Duplicate of up-lvl + title; preserve effect details. */',
 '#stageWrap #menu.reward-dialog>.choice-grid>.upgrade-btn>small{',
 'overflow:visible!important',
 '#app.compact-game-stage #stageWrap #menu.reward-dialog>.choice-grid>.upgrade-btn>small{'
])assert(finalFit.css.includes(rule),'final Hub/reward layout must preserve readable text: '+rule);
assert(!finalFit.css.includes('width:min(176px'),'do not restore oversized icons');
for(const rule of [
 '#app.tight-hub-stage #stageWrap #menu.hub-dialog .hub-modules .hub-module .hub-art-slot>.hub-emblem{',
 '#app.compact-game-stage #stageWrap #menu.hub-dialog .hub-modules .hub-module .hub-art-slot>.hub-emblem{',
 'width:min(92px,37cqh,40cqw)!important',
 'width:min(60px,31cqh,40cqw)!important',
 '#app.tight-hub-stage #stageWrap #menu.hub-dialog .hub-modules .hub-module .hub-forecast,',
 '#app.tight-hub-stage #stageWrap #menu.hub-dialog .hub-modules .hub-module .hub-buy,',
 '#app.tight-hub-stage #stageWrap #menu.reward-dialog>.choice-grid>.upgrade-btn>small{'
])assert(finalFit.css.includes(rule),'short 16:9 stage must win over earlier higher-specificity selectors: '+rule);


// v10: the largest icon that FITS the residual art cell, not the whole stage.
const iconFit=getStyle('hub-icons-art-first-v10');
assert(iconFit.position>finalFit.position,
 'art-first Hub layout must supersede earlier 100px clamps');
for(const rule of [
 'grid-template-rows:minmax(0,1fr) max-content!important',
 'container-name:hub-art-space!important;container-type:size!important',
 'grid-column:1!important;grid-row:1!important',
 'width:min(150px,92cqh,86cqw)!important',
 'height:min(150px,92cqh,86cqw)!important',
 'grid-template-rows:max-content max-content max-content!important',
 'grid-column:1!important;grid-row:2!important',
 'grid-column:1!important;grid-row:3!important',
 'min-height:27px!important',
 '#app.tight-hub-stage #stageWrap #menu.hub-dialog .hub-modules>.hub-module>.hub-art-slot>.hub-emblem,',
 '#app.compact-game-stage #stageWrap #menu.hub-dialog .hub-modules>.hub-module>.hub-art-slot>.hub-emblem{'
])assert(iconFit.css.includes(rule),'Hub icon or reserved text rows missing: '+rule);
assert(!iconFit.css.includes('position:absolute!important'),
 'do not put icon or button atop the title and numeric stat');

const begin=html.indexOf("function hubMenu(upgraded='");
const end=html.indexOf('function buyUpgrade(',begin);
assert(begin>=0&&end>begin,'Hub template must exist');
const render=html.slice(begin,end);
for(const s of [
 'class="hub-module hub-centered-card',
 'class="hub-art-slot"',
 'class="hub-card-info"',
 'class="hub-emblem">',
 'modIconMarkup(m.art)',
 'class="hub-module-name"',
 'class="hub-forecast"',
 'class="hub-buy"',
 'data-action="hubApply"',
 'class="hub-footer-guide"',
 'class="hub-footer-guide-text"',
 'data-action="start"',
 'data-action="title"'
])assert(render.includes(s),'Hub behavior or centered DOM missing: '+s);
assert(!render.includes('style="display:flex!important;flex-direction:column!important;'),
 'inline layout declarations must not override the responsive Hub CSS');
assert.equal((render.match(/class="hub-art-slot"/g)||[]).length,1,
 'one bitmap slot per Hub card template; three generated modules');
assert.equal((render.match(/class="hub-footer-guide"/g)||[]).length,1,
 'single controller guide in Hub title frame');
assert(html.includes("const MOD_ICON_ORDER=[...MOD_UI_ORDER,'neuro','hub-core','hub-servo','hub-reflex']"),
 'Hub retains dedicated bitmap upgrade icons');
console.log('PASS: centered 3-card Hub, large bitmap icons, no vertical dividers, preserved upgrade buttons/footer & compact-stage rules');
