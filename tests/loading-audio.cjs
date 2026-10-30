const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=html.slice(html.indexOf('async function requestRunStart(){'),html.indexOf('\nfunction startRun(){'));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
async function startup(fail=false){
 const music=deferred(),art=deferred(),voices=deferred();let starts=0,prepared=0,menu='';
 const nodes=new Map();const world={loadingRun:false,gameState:'title',setTimeout,Error,Promise,
 $:id=>{if(!nodes.has(id))nodes.set(id,{style:{}});return nodes.get(id)},
 resetFailedSceneArt(){},showMenu:s=>menu=s,waitSceneArt:()=>art.promise,depthBackdrop:()=>prepared++,img:{street_pano:{}},startRun:()=>starts++,prepareCombatVoices:()=>voices.promise,
 window:{location:{search:''},__revenantBgm:{prepare:()=>music.promise,beginPlayback:()=>Promise.resolve()}}};
 vm.createContext(world);vm.runInContext(code,world);
 const run=world.requestRunStart();await world.requestRunStart();
 assert.equal(starts,0);art.resolve();await new Promise(r=>setTimeout(r,10));
 assert.equal(prepared,1);assert.equal(starts,0,'must wait for music after art');
 if(fail){music.reject(Error('music unavailable'));voices.resolve()}
 else {music.resolve();await new Promise(r=>setTimeout(r,10));assert.equal(starts,0,'must wait for four decoded voice recordings');voices.resolve()}
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
 // Hits must not have any route to lower music; only upgrade screens fade.
 assert.equal(typeof bgm.duckImpact,'undefined','combat hit ducking API is removed');
 const combatLevel=bgm.getState().volume;
 for(let i=0;i<10;i++){now+=50;tick()}
 assert.equal(bgm.getState().volume,combatLevel,'playing combat BGM remains constant');
 assert(!html.includes('__revenantBgm?.duckImpact'),'impact sounds must never touch BGM volume');
 state='reward';for(let i=0;i<8;i++){now+=180;tick()}
 assert(Math.abs(bgm.getState().volume-.21)<.001);assert.equal(plays,1,'upgrade must preserve playback');
 await bgm.prepare();assert.equal(fetches,1,'restart reuses full audio');
}
async function combatVoices(){
 const voiceScript=fs.readFileSync(path.join(root,'assets/voice/voice-engine.js'),'utf8');
 let fetches=0,decoded=0;
 const createdSources=[];
 const param=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v}});
 const node=()=>({gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),playbackRate:{value:1},
  connect(x){return x},disconnect(){},start(when){this.started=true;this.startedAt=when},stop(){this.stopped=true}});
 const ctx={currentTime:0,destination:node(),
  createDynamicsCompressor:()=>node(),createGain:()=>node(),createBiquadFilter:()=>node(),
  createBufferSource:()=>{const s=node();createdSources.push(s);return s},
  decodeAudioData:async bytes=>{decoded++;return{duration:.9,clip:bytes.clip}}};
 const w={window:{},Math,fetch:async url=>{fetches++;return{ok:true,arrayBuffer:async()=>({clip:url})}}};
 vm.createContext(w);vm.runInContext(voiceScript,w);
 const voices=w.window.__zCombatVoice;
 assert.equal(voices.state().ready,false);
 await voices.prepare(ctx);
 assert.equal(fetches,4,'all four actual voice clips are fetched before combat');
 assert.equal(decoded,4);
 assert.equal(voices.state().ready,true);
 await voices.prepare(ctx);assert.equal(fetches,4,'voice bank decodes only once');
 const hero={x:300,y:560},foe={x:420,y:560,type:'raider'},boss={x:560,y:560,type:'boss'};
 assert.equal(voices.play('heroStrike',hero,hero),true);
 assert.equal(voices.play('heroStrike',hero,hero),false,'one hero cannot stack grunts');
 ctx.currentTime=.06;
 assert.equal(voices.play('heroDeath',hero,hero),true,'lethal vocal must override a recent strike grunt');
 ctx.currentTime=.6;
 assert.equal(voices.play('enemyHurt',foe,hero),true,'enemy pain follows the real damage event');
 assert.equal(voices.play('enemyHurt',foe,hero),false,'injury voice is rate limited');
 ctx.currentTime=1.3;
 assert.equal(voices.play('bossShout',boss,hero),true,'boss warning has a dedicated roar');
 ctx.currentTime=1.9;
 assert.equal(voices.play('heroPower',hero,hero),true,'heavy attack emits a hero effort grunt');
 const powerClip=createdSources.at(-1).buffer.clip;
 assert(powerClip.endsWith('hero-grunt-b.wav'),'heavy attack MUST NOT use enemy scream file');
 assert(!powerClip.includes('voice-yell'),'hero power must not play the death wail');
 ctx.currentTime=2.5;
 assert.equal(voices.play('enemyHurt',foe,hero),true,'enemy gets its own wounded vocal');
 assert(/hero-grunt-[ab]\.wav$/.test(createdSources.at(-1).buffer.clip),'ordinary pain must grunt instead of death-screaming');
 assert(createdSources.at(-1).startedAt>=ctx.currentTime+.075,'the crack of impact should precede the groan');
 ctx.currentTime=3.0;
 assert.equal(voices.play('heroStrike',hero,hero),true,'normal hero strikes use short grunts');
 assert(/hero-grunt-[ab]\.wav$/.test(createdSources.at(-1).buffer.clip),'hero normal hits never use enemy scream clips');
 assert(createdSources.length>=3,'all voice families use genuine recorded buffers');
 assert(!voiceScript.includes('duckImpact'),'vocals do not change BGM volume');
 assert(html.includes("playImpactSound(kind,heavy?1.15:1)"),'character impact sound must continue alongside grunt');
 assert(html.includes("applyImpactFeedback(e,smash||p.dashSmash"),'striking an enemy must still play the physical hit sound');
 assert(!voiceScript.includes('window.__revenantBgm'),'the voice engine must never lower the music');
 for(const file of ['hero-grunt-a.wav','hero-grunt-b.wav','voice-yell.wav','voice-roar.wav']){
  const bytes=fs.readFileSync(path.join(root,'assets/voice',file));
  assert(bytes.length>10000,'real recording is present: '+file);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');
 }
 console.log('PASS: 4 CC0 human voices decoded before start; battle cries, pain and boss calls rate-limited; no BGM duck');
}
function spriteRetry(){
 const images=[];let now=1000;
 const w={Z_REMOTE_ATLAS:{sidekick:'kick.webp',alias:'kick.webp'},zArtState:{},zArtFrameShared:new Map(),
 Image:class{constructor(){images.push(this)}},Date:{now:()=>now},setTimeout:()=>1,clearTimeout(){},
 Z_HOODIE_HERO:false,Z_HF_ART:false,prepareZCells:()=>Array(8).fill({}),maskedArt:{},riotGuardImages:{}};
 vm.createContext(w);vm.runInContext(html.slice(html.indexOf('function loadZMove('),html.indexOf('function currentZFrameIndex(')),w);
 let art=w.loadZMove('sidekick');images[0].onerror();assert.equal(art.failed,false);
 w.loadZMove('sidekick');assert.equal(images.length,1,'retry obeys backoff');now+=500;
 w.loadZMove('alias');assert.equal(images.length,2);assert(images[1].src.includes('retry=2'));
 images[1].onload();assert.equal(art.ready,true);assert.equal(w.loadZMove('sidekick'),w.loadZMove('alias'));
 // Permanent failure is bounded, and manual retry actually issues another request.
 art.ready=false;art.attempts=2;art.retryAt=0;w.loadZMove('sidekick');images[2].onerror();
 assert.equal(art.failed,true);now+=5000;w.loadZMove('sidekick');assert.equal(images.length,3);
 w.resetFailedSceneArt();w.loadZMove('sidekick');assert.equal(images.length,4);assert.equal(art.failed,false);
 console.log('PASS: transient sprite failures retry; shared aliases recover; retries bounded; manual retry resets failed cache');
}
function optionalArt(){
 for(const optional of [true,false]){
 let tick,resolved=false,rejected=false;
 const w={requiredSceneArt:()=>[['sidekick',()=>({failed:true,ready:false}),optional]],performance:{now:()=>0},
 setInterval:fn=>{tick=fn;return 1},clearInterval(){},Promise:class{constructor(fn){fn(()=>resolved=true,()=>rejected=true)}},Error};
 vm.createContext(w);vm.runInContext(html.slice(html.indexOf('function waitSceneArt('),html.indexOf('async function requestRunStart(')),w);
 w.waitSceneArt(false);tick();assert.equal(resolved,optional);assert.equal(rejected,!optional);
 }
 console.log('PASS: unavailable extra combo does not block start; required artwork still blocks');
}
(async()=>{spriteRetry();optionalArt();await startup();await startup(true);await audio();await combatVoices();console.log('PASS: start waits for art + full BGM; failures block start; repeated starts deduplicate; upgrades soften music but combat impact never ducks music');})().catch(e=>{console.error(e);process.exitCode=1});
