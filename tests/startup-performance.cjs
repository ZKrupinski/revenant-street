const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const extract=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
// First direction lands on START for either sign; subsequent navigation works.
for(const step of [-1,1]){
 const items=['hub','start','guide'].map(action=>({dataset:{action},classList:{toggle(){}},focus(){this.focused=true}}));
 const w={rewardSelection:null,menuPad:{index:1,titleNavPending:true},menuButtons:()=>items,$:()=>({classList:{contains:k=>k==='title-dialog'}})};
 vm.createContext(w);vm.runInContext(extract('function selectMenuItem(','// HUB navigation'),w);
 w.selectMenuItem(step);assert.equal(w.menuPad.index,1);assert(items[1].focused);
 w.selectMenuItem(step);assert.equal(w.menuPad.index,1+step);
}
// Cache hits need no 90ms artificial batches; unfinished work remains bounded.
async function loaders(){
 const run=checks=>{const timers=[];const w={requiredSceneArt:()=>checks,performance:{now:()=>0},setTimeout:fn=>timers.push(fn),Promise,Error};vm.createContext(w);vm.runInContext(extract('function waitSceneArt(','async function requestRunStart('),w);return {promise:w.waitSceneArt(false),timers}};
 let reads=0;let r=run(Array.from({length:100},()=>['cached',()=>{reads++;return{ready:true}}]));await r.promise;assert.equal(reads,100);assert.equal(r.timers.length,0);
 const states=Array.from({length:8},()=>({ready:false}));let opened=0;
 r=run(states.map(state=>['pending',()=>{if(!state.open){state.open=true;opened++}return state}]));assert.equal(opened,3);
 states.slice(0,3).forEach(s=>s.ready=true);r.timers.shift()();assert.equal(opened,6);
 states.forEach(s=>s.ready=true);r.timers.shift()();await r.promise;
 await assert.rejects(run([['broken',()=>{throw Error('decoder failed')}]]).promise,/decoder failed/);
 await assert.rejects(run([['required',()=>({failed:true})]]).promise,/required/);
}
// Stationary stick must not force repeated layout; invalidation refreshes geometry.
let reads=0;const w={window:{addEventListener(){}},document:{addEventListener(){}},analog:{pointerId:null},gameState:'playing',heroEntry:{active:false},keys:new Set(),clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),analogPad:{querySelector:()=>({getBoundingClientRect(){reads++;return{width:100,height:100}}})},analogThumb:{style:{}},analogShaft:{style:{}}};
vm.createContext(w);vm.runInContext(extract("let externalStickVisualKey=",'function resetAnalog(){'),w);
for(let i=0;i<100;i++)w.syncExternalStickVisual({dx:0,dy:0});assert.equal(reads,1);
w.syncExternalStickVisual({dx:1,dy:0});assert.equal(reads,1);
w.invalidateStickVisual();w.syncExternalStickVisual({dx:1,dy:0});assert.equal(reads,2);
w.gameState='menu';w.invalidateStickVisual();w.syncExternalStickVisual({dx:0,dy:0});assert.equal(reads,2);
loaders().then(()=>console.log('PASS: first title direction, cached-load fast path, bounded decode queue, failure rejection, joystick layout caching')).catch(e=>{console.error(e);process.exitCode=1});
