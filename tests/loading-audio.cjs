const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=html.slice(html.indexOf('async function requestRunStart(){'),html.indexOf('\nfunction startRun(){'));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
async function startup(fail=false){
 const music=deferred(),art=deferred();let starts=0,prepared=0,menu='';
 const nodes=new Map();const world={loadingRun:false,gameState:'title',setTimeout,Error,Promise,
 $:id=>{if(!nodes.has(id))nodes.set(id,{style:{}});return nodes.get(id)},
 showMenu:s=>menu=s,waitSceneArt:()=>art.promise,depthBackdrop:()=>prepared++,img:{street_pano:{}},startRun:()=>starts++,
 window:{location:{search:''},__revenantBgm:{prepare:()=>music.promise,beginPlayback:()=>Promise.resolve()}}};
 vm.createContext(world);vm.runInContext(code,world);
 const run=world.requestRunStart();await world.requestRunStart();
 assert.equal(starts,0);art.resolve();await new Promise(r=>setTimeout(r,10));
 assert.equal(prepared,1);assert.equal(starts,0,'must wait for music after art');
 if(fail)music.reject(Error('music unavailable'));else music.resolve();
 await run;assert.equal(starts,fail?0:1);assert.equal(world.loadingRun,false);
 if(fail)assert(menu.includes('music unavailable'));
}
async function audio(){
 const download=deferred(),listeners=new Map();let now=0,state='playing',tick,fetches=0,plays=0;
 class AudioMock {constructor(){this.paused=true;this.volume=0;this.currentTime=17;}
 addEventListener(k,fn){listeners.set(k,fn)} removeEventListener(k){listeners.delete(k)}
 load(){queueMicrotask(()=>listeners.get('canplay')?.())}
 play(){plays++;this.paused=false;return Promise.resolve()} pause(){this.paused=true}}
 const button={style:{},setAttribute(){},addEventListener(){}};
 const world={Audio:AudioMock,localStorage:{getItem:()=>null},performance:{now:()=>now},setTimeout,clearTimeout,setInterval:fn=>tick=fn,AbortController,
 fetch:()=>{fetches++;return download.promise},URL:{createObjectURL:()=> 'blob:complete',revokeObjectURL(){}},
 document:{hidden:false,getElementById:()=>({textContent:'SOUND: ON'}),querySelector:()=>({append(){}}),createElement:()=>button,addEventListener(){}},
 window:{__revenant:{getMusicState:()=>state}}};
 vm.createContext(world);vm.runInContext(fs.readFileSync(path.join(root,'assets/industrial-combat-bgm.js'),'utf8'),world);
 const bgm=world.window.__revenantBgm,ready=bgm.prepare();assert.equal(fetches,1);assert.equal(bgm.getState().ready,false);
 download.resolve({ok:true,blob:async()=>({size:100})});await ready;
 assert.equal(bgm.getState().ready,true);assert.equal(bgm.getState().source,'blob:complete');
 await bgm.beginPlayback();for(let i=0;i<8;i++){now+=180;tick()}
 assert(Math.abs(bgm.getState().volume-.29)<.001);
 state='reward';for(let i=0;i<8;i++){now+=180;tick()}
 assert(Math.abs(bgm.getState().volume-.21)<.001);assert.equal(plays,1,'upgrade must preserve playback');
 await bgm.prepare();assert.equal(fetches,1,'restart reuses full audio');
}
(async()=>{await startup();await startup(true);await audio();console.log('PASS: start waits for art + full BGM; failures block start; repeated starts deduplicate; upgrades keep music playing and duck volume');})().catch(e=>{console.error(e);process.exitCode=1});
