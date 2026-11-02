const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
for(const name of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 assert(html.includes("orientation.lock('landscape')"),'real landscape orientation lock');
 assert(html.includes("stageWrap.addEventListener('pointerdown'"),'first title touch');
 assert(html.includes("isMobileImmersiveDevice()&&['arrowleft'"),'title keyboard entry');
 assert(html.includes("const result=modern?viewportHost.requestFullscreen({navigationUI:'hide'})"),'activation-time fullscreen request');
 assert(html.includes("screen.orientation?.unlock?.();"),'exit returns rotation control');
 assert(html.includes('id="titleLandscapeHint"'),'unsupported browser fallback');
 assert(html.includes('function syncGameViewport()'),'preserve existing 16:9 viewport');
 assert(html.includes("requestGameFullscreen(); // User's START action"),'keep direct game start fullscreen');
 const begin=html.indexOf('function isMobileImmersiveDevice()');
 const end=html.indexOf('// Animation-only tuning:',begin);
 assert(begin>0&&end>begin,'fullscreen runtime isolate present');
 const script=html.slice(begin,end);
 // Browser simulators: fullscreen gesture succeeds, then orientation locks,
 // and leaving fullscreen must NOT put it back in fullscreen.
 for(const mobile of [true,false]){
  let fullscreenCalls=0,lockCalls=0,unlockCalls=0,layoutCalls=0;
  const listeners={},stageListeners={},document={
   fullscreenElement:null,webkitFullscreenElement:null,
   addEventListener(k,cb){listeners[k]=cb}
  };
  const app={requestFullscreen(){fullscreenCalls++;document.fullscreenElement=app;
   listeners.fullscreenchange?.();return Promise.resolve();}};
  const menu={classList:{contains(k){return k==='title-dialog'}}};
  const window={innerWidth:400,innerHeight:800,matchMedia(q){return {matches:q.includes('pointer: coarse')?mobile:true}},
   addEventListener(){},visualViewport:{addEventListener(){}}};
  const screen={orientation:{lock:async value=>{assert.equal(value,'landscape');lockCalls++},unlock(){unlockCalls++}}};
  const world={window,screen,navigator:{maxTouchPoints:mobile?5:0},
   stageWrap:{addEventListener(k,fn){stageListeners[k]=fn}},
   viewportHost:app,document,gameState:'menu',syncGameViewport(){layoutCalls++},
   $:()=>menu,Promise,Error,console};
  vm.createContext(world);vm.runInContext(script,world);
  stageListeners.pointerdown();
  if(mobile){
   assert.equal(fullscreenCalls,1,'title touch enters fullscreen on a phone');
   await Promise.resolve();await new Promise(r=>setImmediate(r));
   assert.equal(lockCalls,1,'landscape lock requested after fullscreen');
   assert(layoutCalls>0,'re-layout after orientation/fullscreen');
   // Repeated request when already fullscreen does not call requestFullscreen again.
   vm.runInContext('requestGameFullscreen()',world);await Promise.resolve();
   assert.equal(fullscreenCalls,1);
   document.fullscreenElement=null;listeners.fullscreenchange();
   assert.equal(unlockCalls,1,'release when user leaves fullscreen');
   assert.equal(fullscreenCalls,1,'never force reentry after user exit');
  }else{
   assert.equal(fullscreenCalls,0,'desktop title does not enter fullscreen without START');
   assert.equal(lockCalls,0,'desktop orientation unchanged');
  }
 }
 // Explicit API denial must not crash the title or game start.
 const doc2={fullscreenElement:null,webkitFullscreenElement:null,addEventListener(){}};
 const win2={innerWidth:360,innerHeight:780,matchMedia:()=>({matches:true}),
  addEventListener(){},visualViewport:{addEventListener(){}}};
 const world2={window:win2,screen:{orientation:{}},navigator:{maxTouchPoints:1},
   stageWrap:{addEventListener(){}},viewportHost:{requestFullscreen:()=>Promise.reject(new Error('Denied'))},
   document:doc2,gameState:'menu',syncGameViewport(){},$:()=>({classList:{contains:()=>true}}),Promise,Error};
 vm.createContext(world2);vm.runInContext(script,world2);
 vm.runInContext('requestGameFullscreen()',world2);
 await Promise.resolve();await Promise.resolve();
 assert.equal(vm.runInContext('zFullscreenPending',world2),false,'failed fullscreen re-triable');
}
console.log('PASS: title-first touch fullscreen, Android landscape lock, desktop unchanged, exit unlock and unsupported browser fallback');
