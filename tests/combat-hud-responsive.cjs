'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scriptStart=html.indexOf('function syncGameViewport(){');
const scriptEnd=html.indexOf('// A real touch/key gesture is required:',scriptStart);
assert(scriptStart>0&&scriptEnd>scriptStart,'view layout isolated from unrelated game code');
const code=html.slice(scriptStart,scriptEnd)+'\nthis.resizeGame=syncGameViewport;';
function inspect(width,height){
 const values={},flags={};
 const stageWrap={style:{setProperty(k,v){values[k]=v}}};
 const viewportHost={getBoundingClientRect:()=>({width,height}),
  classList:{toggle(k,v){flags[k]=v}}};
 const canvas={width:1280,height:720};
 const world={stageWrap,viewportHost,canvas,W:1280,H:720,
  MIN_GAME_ASPECT:16/9,window:{innerWidth:width,innerHeight:height},
  cameraX:0,p:{x:1400},STAGE_WIDTH:32000,Math};
 vm.createContext(world);vm.runInContext(code,world);
 const out=world.resizeGame();
 return {out,values,flags,world};
}
const reference=inspect(860,488);
assert.equal(Number(reference.values['--z-combat-safe-width'].replace('px','')),860);
assert.equal(Number(reference.values['--z-combat-scale']),1,'uploaded reference screen is visual scale 1');
assert.equal(reference.out.width,1280,'reference gameplay canvas remains native 1280');
const hd=inspect(1920,1080);
assert.equal(Number(hd.values['--z-combat-safe-width'].replace('px','')),1920);
assert(Math.abs(Number(hd.values['--z-combat-scale'])-1920/860)<.0001);
assert.equal(hd.out.width,1280,'1080p does not stretch the combat coordinate system');
const quad=inspect(3840,2160);
assert(Math.abs(Number(quad.values['--z-combat-scale'])-3840/860)<.0001,
 '4K UI scales both positioning and physical touch targets');
const wide=inspect(2560,1080);
assert.equal(Number(wide.values['--z-combat-safe-width'].replace('px','')),1920,
 '21:9 keeps a 16:9 overlay frame centered over extended world');
assert.equal(Number(wide.values['--z-combat-safe-gutter'].replace('px','')),320,
 'left/right safe insets match');
assert(wide.out.width>1280,'ultrawide game canvas still reveals world on the sides');
assert.equal(Number(wide.values['--z-combat-scale']),Number(hd.values['--z-combat-scale']),
 '1080p HUD and ultrawide 1080p HUD show the same reference proportions');
const portrait=inspect(390,844);
assert(portrait.out.topBottomBlack>0);
assert(portrait.flags['compact-game-stage'],'portrait 16:9 stage still gets compact UI');
const start=html.indexOf('<style id="z-responsive-combat-screenshot-safe-v1">');
const end=html.indexOf('</style>',start);
assert(start>0&&end>start);
const style=html.slice(start,end);
assert(style.includes('@container (min-width:900px)'),
 'desktop-only responsive override preserves original portrait styling');
for(const t of [
 "#hud.hud{","#hud .hud-left{","#hud .hud-center{","#hud .hud-right{",
 "#stageWrap .touch-controls{","#stageWrap .touch-controls .analog-pad{",
 "#stageWrap .touch-controls .analog-pad .analog-ring{",
 "#stageWrap .touch-controls .analog-pad .analog-touch-zone{",
 "#stageWrap .touch-controls .touch-actions{","#stageWrap .boss-hud{",
 "left:50%!important;right:auto!important;",
 "width:var(--z-combat-safe-width,100%)!important;",
 "--face-btn:calc(54px * var(--z-combat-scale,1))!important;"
])assert(style.includes(t),'screenshot responsive layout contract '+t);
assert(html.includes('grid-template-areas:". top ." "left . right" ". bottom ."'),
 'four-button UI grid remains intact');
console.log('PASS: reference, 1080p, 4K, ultrawide and portrait preserve screenshot-like HUD layout and touch-safe scaling');
