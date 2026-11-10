'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>{
 const start=html.indexOf(a),end=html.indexOf(b,start+a.length);
 assert(start>=0&&end>start, 'source includes '+a+' → '+b);
 return html.slice(start,end);
};
// Keyboard WASD must be a digital full-run input, not a low analog-stick walk.
const running=between(' const stickMag=Math.hypot(analog.dx,analog.dy);',' const movementStartX=p.x,movementStartY=p.y;');
function runState(pressed=[],state={},stick={dx:0,dy:0},pad={dx:0,dy:0}){
 const scope={Math,keys:new Set(pressed),analog:stick,p:{z:0,attack:0,dodge:0,parry:0,...state},pad};
 vm.runInNewContext(running,scope);
 return scope.p.running;
}
for(const k of ['w','a','s','d'])assert.equal(runState([k]),true,'keyboard '+k+' runs');
assert.equal(runState(['w','d']),true,'diagonal WASD runs');
assert.equal(runState([]),false,'neutral stays idle/walk');
assert.equal(runState(['w','s']),false,'opposing keyboard keys do not cause run');
assert.equal(runState(['w'],{attack:.18}),false,'attack movement gate retained');
assert.equal(runState(['a'],{parry:.20}),false,'parry movement gate retained');
assert.equal(runState(['d'],{dodge:.20}),false,'dash movement gate retained');
assert.equal(runState(['s'],{z:50}),false,'airborne animation gate retained');
assert.equal(runState([],{}, {dx:1,dy:0}),true,'touch fully pushed still runs');
assert.equal(runState([],{}, {dx:0,dy:0},{dx:1,dy:0}),true,'gamepad fully pushed still runs');
assert(html.includes('let speed=p.running?PLAYER_RUN_SPEED+25*perma.sprint:PLAYER_WALK_SPEED;'),
 'run flag is applied to real movement speed');

// Check the actual keyboard dispatcher: all arrows (especially Down = pad A)
// confirm in title / pause / HUB, while WASD remains menu navigation.
const keyCode=between('function keyDown(ev){','function keyUp(ev){');
function keyHarness(mode='menu',opts={}){
 const calls=[],heldKeyboard=new Set(),menuBlockedKeys=new Set(),keys=new Set();
 const ctx={
  gameState:mode,keys,heldKeyboard,menuBlockedKeys,rewardSelection:null,
  menuPad:{titleNavPending:true},
  $:id=>({classList:{contains:c=>c==='title-dialog'&&!!opts.title}}),
  isMobileImmersiveDevice:()=>false,requestGameFullscreen(){calls.push('fullscreen')},
  menuConfirm(){calls.push('confirm')},hubMenuNavigate(x,y){calls.push('hub:'+x+','+y)},
  selectMenuItem(step){calls.push('navigate:'+step)},menuReady:()=>true,
  menuBack(){calls.push('back')},playUiMechanical(){},pauseToggle(){calls.push('pause')},
  startAttack(){calls.push('attack')},jump(){calls.push('jump')},
  parry(){calls.push('parry')},dodge(){calls.push('dodge')},
  syncFaceButtonVisuals(){},
 };
 vm.createContext(ctx);
 vm.runInContext(keyCode+';this.onKey=keyDown',ctx);
 return {ctx,calls,keydown(key,repeat=false){
  ctx.onKey({key,repeat,preventDefault(){calls.push('preventDefault')}});
 }};
}
{
 const h=keyHarness('menu',{title:true});
 h.keydown('ArrowDown');
 assert.equal(h.calls.filter(c=>c==='confirm').length,1,'first title Down confirms game start');
 h.keydown('ArrowDown',true);
 assert.equal(h.calls.filter(c=>c==='confirm').length,1,'OS key-repeat never double-confirms');
}
for(const state of ['paused','dead','complete','hub']){
 const h=keyHarness(state);
 h.keydown('ArrowDown');
 assert.equal(h.calls.filter(c=>c==='confirm').length,1,state+' first Down confirms');
}
{
 const h=keyHarness('hub');
 h.keydown('s');
 assert(h.calls.includes('hub:0,1'),'HUB S still navigates downward');
}
{
 const h=keyHarness('paused');
 h.ctx.menuBlockedKeys.add('arrowdown');
 h.keydown('ArrowDown');
 assert(!h.calls.includes('confirm'),'carried combat key cannot click menu');
}
{
 const h=keyHarness('playing');
 h.keydown('ArrowDown');
 assert(h.calls.includes('dodge'),'ArrowDown in combat still dashes, not menu confirm');
}
for(const key of ['ArrowLeft','ArrowUp','ArrowRight','Enter',' ']){
 const h=keyHarness('paused');
 h.keydown(key);
 assert(h.calls.includes('confirm'),key+' confirms current menu');
}

// Test actual queued menuConfirm function against a mocked clock. The first
// press during the 180ms entrance lock is delivered ONCE after readyAt.
const queued=between('let queuedMenuConfirmTimer=null;','function menuButtons(){');
const confirm=between('function menuConfirm(){','function menuBack(){');
{
 let now=1000, pending=null, scheduled=0,clicked=0,cleared=0;
 const selected={click(){clicked++}};
 const scope={
  Date:{now:()=>now},rewardSelection:null,gameState:'paused',
  menuPad:{readyAt:1180},setTimeout(fn,ms){scheduled=ms;pending=fn;return 1},
  clearTimeout(){cleared++},$(){return{classList:{contains:()=>true}}},
  selectMenuItem(){return selected},
 };
 vm.createContext(scope);
 vm.runInContext(queued+confirm+';this.confirm=menuConfirm;this.cancel=cancelQueuedMenuConfirm',scope);
 assert.equal(scope.confirm(),true,'first early confirmation must be queued');
 assert.equal(clicked,0,'do not click before entrance lock');
 assert(scheduled>=180,'dispatch after readyAt');
 assert.equal(scope.confirm(),true,'repeat early confirm coalesces');
 now=1200;pending();
 assert.equal(clicked,1,'exactly one click delivered after entrance');
 assert.equal(scope.queuedMenuConfirmTimer,null,'timer cleared after dispatch');
}
{
 let now=2000,pending=null,clicked=0,canceled=0;
 const scope={
  Date:{now:()=>now},rewardSelection:null,gameState:'menu',
  menuPad:{readyAt:2200},setTimeout(fn){pending=fn;return 2},
  clearTimeout(){canceled++},$(){return{classList:{contains:()=>true}}},
  selectMenuItem(){return{click(){clicked++}}},
 };
 vm.createContext(scope);
 vm.runInContext(queued+confirm+';this.confirm=menuConfirm;this.cancel=cancelQueuedMenuConfirm',scope);
 scope.confirm();
 scope.cancel();
 now=2250;
 assert.equal(canceled,1,'menu transition cancels pending activation');
 // A queued browser callback that raced cancellation is state-guarded too.
 scope.gameState='hub';
 pending();
 assert.equal(clicked,0,'stale title confirm never triggers inside a new menu');
}
assert(html.includes("function showMenu(html){\n cancelQueuedMenuConfirm();"),
 'menu changes cancel pending first-press action');
assert(html.includes("function hideMenu(){cancelQueuedMenuConfirm();"),
 'closing menu cancels pending first-press action');
assert(html.includes("if(neutral)menuPad.armed=true;"),
 'gamepad A/B/X/Y re-armed from neutral without a 250ms dead period');
console.log('PASS: WASD immediate run / full speed; first ArrowDown=A confirm on title, pause, result and HUB; early press queue; repeat / stale / combat isolation; pad neutral arming');
