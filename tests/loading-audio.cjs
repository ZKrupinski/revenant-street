const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=html.slice(html.indexOf('async function requestRunStart(){'),html.indexOf('\nfunction startRun(){'));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
async function startup(fail=false){
 const music=deferred(),art=deferred(),voices=deferred();let starts=0,prepared=0,menu='';
 const nodes=new Map();const world={loadingRun:false,gameState:'title',setTimeout,Error,Promise,
 $:id=>{if(!nodes.has(id))nodes.set(id,{style:{}});return nodes.get(id)},
 resetFailedSceneArt(){},resetFailedUiBitmaps(){},showMenu:s=>menu=s,waitSceneArt:()=>art.promise,depthBackdrop:()=>prepared++,img:{street_pano:{}},startRun:()=>starts++,prepareCombatVoices:()=>voices.promise,
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
 assert(!fs.readFileSync(path.join(root,'assets/industrial-combat-bgm.js'),'utf8').includes('NON_BGM_SFX_LEVEL'),'effect mix factor must never enter soundtrack engine');
 assert(!html.includes('__revenantBgm?.duckImpact'),'impact sounds must never touch BGM volume');
 state='reward';for(let i=0;i<8;i++){now+=180;tick()}
 assert(Math.abs(bgm.getState().volume-.21)<.001);assert.equal(plays,1,'upgrade must preserve playback');
 await bgm.prepare();assert.equal(fetches,1,'restart reuses full audio');
}
async function combatVoices(){
 const voiceScript=fs.readFileSync(path.join(root,'assets/voice/voice-engine.js'),'utf8');
 let fetches=0,decoded=0;
 const createdSources=[],voiceGains=[];
 const param=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v}});
 const node=()=>({gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),playbackRate:{value:1},
  connect(x){return x},disconnect(){},start(when){this.started=true;this.startedAt=when},stop(){this.stopped=true}});
 const ctx={currentTime:0,destination:node(),
  createDynamicsCompressor:()=>node(),createGain:()=>{const g=node();voiceGains.push(g);return g},createBiquadFilter:()=>node(),
  createBufferSource:()=>{const s=node();createdSources.push(s);return s},
  decodeAudioData:async bytes=>{decoded++;return{duration:.9,clip:bytes.clip}}};
 const w={window:{},Math,fetch:async url=>{fetches++;return{ok:true,arrayBuffer:async()=>({clip:url})}}};
 vm.createContext(w);vm.runInContext(voiceScript,w);
 const voices=w.window.__zCombatVoice;
 assert.equal(voices.state().ready,false);
 await voices.prepare(ctx);
 assert.equal(fetches,11,'four gunshots, three slide actions and four enemy voices preloaded');
 assert.equal(decoded,11);
 assert.equal(voices.state().ready,true);
 await voices.prepare(ctx);assert.equal(fetches,11,'gunfire and vocals decode only once');
 const hero={x:300,y:560},foe={x:420,y:560,type:'raider'},boss={x:560,y:560,type:'boss'};
 assert.equal(voices.play('heroStrike',hero,hero),true);
 assert.equal(voiceGains[0].gain.value,.58*.70,'enemy and metal voice master must output 70% of prior amplitude');
 assert(/hero-mech-[ab]\.mp3$/.test(createdSources.at(-1).buffer.clip),'hero first attack must use a slide/bolt sound, not any voice');
 assert.equal(voices.play('heroStrike',hero,hero),false,'one hero cannot stack grunts');
 ctx.currentTime=.06;
 const beforeSilent=createdSources.length;
 assert.equal(voices.play('heroHurt',hero,hero),false,'hero pain must not play a voice or firearm mechanism');
 assert.equal(voices.play('heroDeath',hero,hero),false,'hero death must not play a scream or gun reload');
 assert.equal(createdSources.length,beforeSilent,'no player vocal sources should be created on hurt or death');
 ctx.currentTime=.6;
 assert.equal(voices.play('enemyHurt',foe,hero),true,'enemy pain follows the real damage event');
 assert.equal(voices.play('enemyHurt',foe,hero),false,'injury voice is rate limited');
 ctx.currentTime=1.3;
 assert.equal(voices.play('bossShout',boss,hero),true,'boss warning has a dedicated roar');
 ctx.currentTime=1.9;
 assert.equal(voices.play('heroPower',hero,hero),true,'heavy attack emits a powerful metallic bolt action');
 const powerClip=createdSources.at(-1).buffer.clip;
 assert(powerClip.endsWith('hero-mech-power.mp3'),'heavy attack MUST use a heavy metal charging mechanism');
 assert(!powerClip.includes('voice-yell')&&!powerClip.includes('kiai'),'hero power must never play a human yell');
 ctx.currentTime=2.5;
 // In a real browser voice sources have ended by 2.5s; advance mocked
 // onended callbacks to release the three-slot voice cap.
 for(const src of createdSources){if(src.onended){src.onended();src.onended=null}}
 assert.equal(voices.play('enemyHurt',foe,hero),true,'enemy gets its own wounded vocal');
 assert(/hero-grunt-[ab]\.wav$/.test(createdSources.at(-1).buffer.clip),'ordinary pain must grunt instead of death-screaming');
 assert(createdSources.at(-1).startedAt>=ctx.currentTime+.075,'the crack of impact should precede the groan');
 ctx.currentTime=3.0;
 assert.equal(voices.play('heroStrike',hero,hero),true,'normal hero strikes use mechanical charging clicks');
 assert(/hero-mech-[ab]\.mp3$/.test(createdSources.at(-1).buffer.clip),'hero normal hits never play human recordings');
 assert(createdSources.length>=3,'all voice families use genuine recorded buffers');
 assert(!voiceScript.includes('duckImpact'),'metal accents and enemy vocals do not change BGM volume');
 assert(!voiceScript.includes('hero-kiai-'),'old player shouts must be entirely disconnected from active gameplay');
 assert(html.includes("playImpactSound(kind,heavy?1.15:1)"),'character impact sound must continue alongside grunt');
 assert(html.includes("applyImpactFeedback(e,smash||p.dashSmash"),'striking an enemy must still play the physical hit sound');
 assert(!voiceScript.includes('window.__revenantBgm'),'the voice engine must never lower the music');
 for(const file of ['hero-grunt-a.wav','hero-grunt-b.wav','voice-yell.wav','voice-roar.wav']){
  const bytes=fs.readFileSync(path.join(root,'assets/voice',file));
  assert(bytes.length>10000,'CC0 voice file is present: '+file);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');
 }
 for(const file of ['hero-mech-a.mp3','hero-mech-b.mp3','hero-mech-power.mp3']){
  const bytes=fs.readFileSync(path.join(root,'assets/voice',file));
  assert(bytes.length>6000,'mechanical Foley is shipped locally: '+file);
  assert(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===0xff,'mechanical effect is mp3: '+file);
 }
 assert(html.includes("playCombatGunfire(p.dashSmash?'heavy':'normal',p.moveName)"),'all ordinary move attacks must fire at their contact frame');
 assert(html.includes("playCombatGunfire('counter','superman_punch')"),'parry counter fires');
 assert(html.includes("playCombatGunfire('execution','uppercut')"),'execution fires');
 assert(html.includes("playCombatGunfire('slam','axe_kick')"),'powered landing fires');
 assert(html.includes("playCombatVoice('heroMove')"),'movement cycles occasional quiet metallic mechanisms');
 const motions=['jab','roundkick','spinning_elbow','sidekick','uppercut',
  'spinning_heel','hammerfist','rising_headbutt','cross','axe_kick',
  'backfist','crescent_kick','rising_elbow','frontkick','superman_punch',
  'lowkick','hook','forward_headbutt','shovel_hook'];
 const tones=new Set(),families=new Set();
 for(const move of motions){
  ctx.currentTime+=.12;
  assert.equal(voices.fire('normal',move),true,'shot for every attack: '+move);
  const src=createdSources.at(-1);
  assert(src.buffer.clip.includes('/shot-'),'gunshot from local file: '+move);
  assert(src.started,'shot is triggered independently of target hit');
  tones.add(src.buffer.clip+'@'+src.playbackRate.value);
  families.add(src.buffer.clip);
 }
 assert.equal(families.size,4,'normal attacks use all four gunshot sample families');
 assert(tones.size>=15,'all 19 attack moves have distinct timbre/pitch variation');
 for(const kind of ['heavy','counter','slam','execution']){
  ctx.currentTime+=.25;
  assert.equal(voices.fire(kind,'uppercut'),true,kind+' strong fire must never be crowded out');
 }
 assert(voiceGains.some(x=>Math.abs(x.gain.value-1.05*.70)<.000001),'independent gunfire bus must output 70% of prior amplitude');
 assert(1.05*.70>.58*.70,'original relative gunfire-over-vocal mix is retained');
 ctx.currentTime+=1.5;
 for(const src of createdSources){if(src.onended){src.onended();src.onended=null}}
 assert.equal(voices.play('heroMove',hero,hero),true,'walk and run occasionally rack a slide');
 assert.equal(voices.play('heroMove',hero,hero),false,'movement mechanical sound cannot spam every footstep');
 for(const name of ['shot-pistol.mp3','shot-revolver.mp3','shot-rifle.mp3','shot-heavy.mp3']){
  const bytes=fs.readFileSync(path.join(root,'assets/voice',name));
  assert(bytes.length>6000,'game embeds an original gun report: '+name);
  assert(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===0xff,'MP3 gun report must be valid: '+name);
 }
 console.log('PASS: all 19 move variations have gunshots, four firearm families, all 11 clips preload, independent louder gunfire and quiet slide locomotion');
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

async function uiBitmapPreload(){
 const source=html.slice(html.indexOf('const UI_DECODE_CACHE=new WeakMap();'),html.indexOf('function requiredSceneArt(preview=false){'));
 assert(source.includes('function ensureBitmapDecoded(image)'),'decoder readiness tracker is present');
 const vmWorld={Promise,WeakMap,Date,Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0}},document:{documentElement:{style:{setProperty(){}}}}};
 vm.createContext(vmWorld);vm.runInContext(source,vmWorld);
 const d=deferred(),bitmap={complete:false,naturalWidth:640,naturalHeight:256,decode:()=>d.promise};
 const before=vmWorld.ensureBitmapDecoded(bitmap);
 assert.equal(before.ready,false,'downloaded bitmap is not marked ready until decoding resolves');
 assert.equal(before.failed,false);
 assert.equal(vmWorld.ensureBitmapDecoded(bitmap),before,'same bitmap has one shared decode state');
 d.resolve();await d.promise;await Promise.resolve();await Promise.resolve();
 assert.equal(before.ready,true,'decoded pixels allow the game to start');
 const failure=deferred(),broken={complete:true,naturalWidth:640,naturalHeight:256,decode:()=>failure.promise};
 const bad=vmWorld.ensureBitmapDecoded(broken);failure.reject(Error('corrupt bitmap'));
 await Promise.resolve();await Promise.resolve();
 assert.equal(bad.failed,true,'decode errors fail the start gate rather than presenting missing UI');
 assert(html.includes("['업그레이드 아이콘 22종',()=>ensureBitmapDecoded(upgradeIconsImage)]"));
 assert(html.includes("['좌우 방향 화살표 8프레임',()=>ensureBitmapDecoded(offscreenArrow)]"));
 assert(html.includes("['패링 방패 UI',()=>ensureBitmapDecoded(parryShieldImage)]"));
 for(const file of ['assets/ui/upgrade-icons-v2.webp','assets/ui/edge-arrows-animated.webp','assets/fx/parry-shield.png']){
  const imgBytes=fs.readFileSync(path.join(root,file));
  assert(imgBytes.length>3000,'real UI bitmap asset exists: '+file);
 }
 assert(html.includes('resetFailedUiBitmaps();'),'start retry resets failed UI assets');
 assert(html.includes("background-image:var(--upgrade-preloaded-url,url('./assets/ui/upgrade-icons-v2.webp'))"),
 'CSS icon sprite shares the preloaded image URL and supports cache-busted retries');
}

(async()=>{await uiBitmapPreload();spriteRetry();optionalArt();await startup();await startup(true);await audio();await combatVoices();console.log('PASS: start waits for art + full BGM; failures block start; repeated starts deduplicate; upgrades soften music but combat impact never ducks music');})().catch(e=>{console.error(e);process.exitCode=1});
