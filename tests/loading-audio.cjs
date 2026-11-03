const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=html.slice(html.indexOf('async function requestRunStart(){'),html.indexOf('\nfunction startRun(){'));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
async function startup(fail=false){
 const music=deferred(),art=deferred(),voices=deferred();let starts=0,prepared=0,menu='';
 const nodes=new Map();const world={loadingRun:false,gameState:'title',setTimeout,clearTimeout,Error,Promise,
 $:id=>{if(!nodes.has(id))nodes.set(id,{style:{}});return nodes.get(id)},
 resetFailedSceneArt(){},resetFailedUiBitmaps(){},requestGameFullscreen(){},Z_UPGRADE_VFX_PRELOAD:Promise.resolve(null),buildSquareUpgradeIconAtlas:()=>true,prepareIntruderSpriteCrops(){},prepareStreetSeamProps(){},showMenu:s=>menu=s,waitSceneArt:()=>art.promise,depthBackdrop:()=>prepared++,img:{street_pano:{}},startRun:()=>starts++,prepareCombatVoices:()=>voices.promise,
 window:{location:{search:''},__revenantBgm:{prepare:()=>music.promise,beginPlayback:()=>Promise.resolve()}}};
 vm.createContext(world);vm.runInContext(code,world);
 const run=world.requestRunStart();await world.requestRunStart();
 assert.equal(starts,0);art.resolve();await new Promise(r=>setTimeout(r,10));
 assert.equal(prepared,1);assert.equal(starts,0,'must wait for music after art');
 if(fail){music.reject(Error('music unavailable'));voices.resolve()}
 else {music.resolve();await new Promise(r=>setTimeout(r,10));assert.equal(starts,0,'must wait for all decoded voice recordings');voices.resolve()}
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
 assert(Math.abs(bgm.getState().volume-.33)<.001);
 // Hits must not have any route to lower music; only upgrade screens fade.
 assert.equal(typeof bgm.duckImpact,'undefined','combat hit ducking API is removed');
 const combatLevel=bgm.getState().volume;
 for(let i=0;i<10;i++){now+=50;tick()}
 assert.equal(bgm.getState().volume,combatLevel,'playing combat BGM remains constant');
 assert(!fs.readFileSync(path.join(root,'assets/industrial-combat-bgm.js'),'utf8').includes('NON_BGM_SFX_LEVEL'),'effect mix factor must never enter soundtrack engine');
 assert(!html.includes('__revenantBgm?.duckImpact'),'impact sounds must never touch BGM volume');
 state='reward';for(let i=0;i<8;i++){now+=180;tick()}
 assert(Math.abs(bgm.getState().volume-.24)<.001);assert.equal(plays,1,'upgrade must preserve playback');
 await bgm.prepare();assert.equal(fetches,1,'restart reuses full audio');
}
async function combatVoices(){
 const script=fs.readFileSync(path.join(root,'assets/voice/voice-engine.js'),'utf8');
 const clips=[],gains=[],requests=[];
 const param=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v}});
 const node=()=>({gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),playbackRate:{value:1},
  connect(x){return x},disconnect(){},start(at,offset,len){this.startedAt=at;this.playLength=len},stop(){}});
 const ctx={currentTime:0,destination:node(),createGain:()=>{const g=node();gains.push(g);return g},
  createBiquadFilter:node,createDynamicsCompressor:node,createBufferSource:()=>{const src=node();clips.push(src);return src},
  decodeAudioData:async x=>({duration:1.2,clip:x.clip})};
 const world={window:{},Math,fetch:async url=>{requests.push(url);return{ok:true,arrayBuffer:async()=>({clip:url})}}};
 vm.createContext(world);vm.runInContext(script,world);
 const api=world.window.__zCombatVoice;
 await api.prepare(ctx);
 assert.equal(requests.length,2,'only two enemy grunts should preload, no prior mechanical/gun Foley');
 assert(requests.every(url=>/z-lowlat-v9-enemy[AB]\.wav\?v=zeroLeadV9$/.test(url)),'only the new zero-preroll human grunts load; old pistol and mechanical sources remain retired');
 assert.equal(api.state().ready,true);
 await api.prepare(ctx);assert.equal(requests.length,2,'cache decoded enemy voices');
 const hero={x:300,y:550},raider={x:450,y:550,type:'raider'},boss={x:500,y:550,type:'boss'};
 assert.equal(api.play('heroStrike',hero,hero),false,'legacy hero strike sound removed');
 assert.equal(api.play('heroPower',hero,hero),false,'legacy hero power sound removed');
 assert.equal(api.play('heroMove',hero,hero),false,'legacy hero locomotion sounds removed');
 assert.equal(api.fire('normal','jab'),false,'legacy gunfire bus no longer supplies attacks');
 ctx.currentTime=.7;
 assert.equal(api.play('enemyHurt',raider,hero),true,'enemy grunt preserved on damage');
 assert.equal(clips.at(-1).buffer.clip.endsWith('z-lowlat-v9-enemyA.wav?v=zeroLeadV9'),true,'actual enemy human recording');
 assert(clips.at(-1).startedAt===ctx.currentTime,'enemy reacts immediately with no extra 60ms scheduling hold');
 assert.equal(api.play('enemyHurt',raider,hero),false,'enemy reactions are rate limited');
 ctx.currentTime=1.3;for(const c of clips)if(c.onended){c.onended();c.onended=null}
 assert.equal(api.play('bossShout',boss,hero),true,'boss original recorded grunt preserved');
 assert(!script.includes("shotPistol:'")&&!script.includes("mechA:'"),'legacy hero audio is not in preload manifest');
 assert(html.includes('voice-engine.js?v=20261103-zero-lead-v9'),'new browser cache version');
 assert(html.includes("playImpactSound('counter',1.35)"),'new parry riposte sample preserved');
 assert(html.includes("applyImpactFeedback(e,smash||p.dashSmash"),'contact-driven attack sample remains');
 assert(!html.includes("sound('attack')"),'legacy synthetic attack bleeps removed');
 assert(!script.includes('__revenantBgm'),'enemy voices never alter background music');
 console.log('PASS: two human enemy grunts; all previous hero gun and mechanism sounds retired; new originals trigger at contact');
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
 w.waitSceneArt(false);assert.equal(resolved,optional);assert.equal(rejected,!optional);
 }
 console.log('PASS: unavailable extra combo does not block start; required artwork still blocks');
}

async function uiBitmapPreload(){
 const source=html.slice(html.indexOf('const UI_DECODE_CACHE=new WeakMap();'),html.indexOf('function requiredSceneArt(preview=false){'));
 assert(source.includes('function ensureBitmapDecoded(image)'),'decoder readiness tracker is present');
 const vmWorld={Promise,WeakMap,Date,Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0}},document:{documentElement:{style:{setProperty(){}}}}};
 vm.createContext(vmWorld);vm.runInContext(source,vmWorld);
 // CSS-only frames used to download lazily when the first reward/HUB opened.
 // Require the exact URL used in the stylesheet and a decoded start gate.
 const chrome=vm.runInContext('UI_CHROME_SOURCES.map(({label,url,cssVar,image})=>({label,url,cssVar,loaded:!!image}))',vmWorld);
 const files=chrome.map(item=>item.url);
 assert.equal(chrome.length,12,'all 10 popup CSS bitmaps and 2 title graphics are preloaded');
 assert.equal(new Set(files).size,chrome.length,'preloaded CSS assets must not be duplicated');
 assert(chrome.every(item=>item.loaded),'all CSS image requests start before the battle');
 assert(html.includes("...UI_CHROME_SOURCES.map(item=>['UI '+item.label,()=>ensureBitmapDecoded(item.image)])"),
  'start checks every UI frame and its decoded pixels, not merely a network fetch');
 assert(html.includes("document.documentElement?.style?.setProperty(item.cssVar"),
  'failed border-image URLs must be cache-busted in the live CSS on retry');
 const styles=html.slice(0,html.indexOf('</head>'));
 for(const item of chrome){
  assert(styles.includes(item.url)||item.url.includes('project-z-title-bi')||item.url.includes('project-z-wordmark-bi'),
   'chrome preloader must point to the same URL used by CSS: '+item.url);
  const file=path.join(root,item.url.slice(2));
  const b=fs.readFileSync(file);
  assert(b.length>3000,'chrome asset is nonempty: '+item.url);
  if(item.url.endsWith('.png'))assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG chrome decode source');
  else assert.equal(b.subarray(0,4).toString('ascii'),'RIFF','WebP title decode source');
 }
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
 assert(html.includes("['업그레이드 아이콘 25종',()=>ensureBitmapDecoded(upgradeIconsImage)]"));
 assert(html.includes("['좌우 방향 화살표 8프레임',()=>ensureBitmapDecoded(offscreenArrow)]"));
 assert(html.includes("['난입 상단 4프레임',()=>ensureBitmapDecoded(intruderEntryImage)]"));
 assert(html.includes("...INTRUDER_MOTION_KEYS.map(k=>['신규 빨간 후드 '+k+' 8프레임',()=>ensureBitmapDecoded(intruderMotionImages[k])])"));
 assert(html.includes("const INTRUDER_MOTION_KEYS=['idle','run','attack','hit','death','special']"));
 assert(!html.includes("['패링 방패 UI',()=>ensureBitmapDecoded(parryShieldImage)]"),'removed defensive bubble image must not be preloaded');
 assert(html.includes("['아케이드 조작 버튼 4종·눌림 8프레임',()=>ensureBitmapDecoded(arcadeButtonsImage)]"));
 assert(html.includes("['왼쪽 아케이드 스틱 베이스',()=>ensureBitmapDecoded(joystickBaseImage)]"));
 assert(html.includes("['왼쪽 아케이드 스틱 금속 봉',()=>ensureBitmapDecoded(joystickShaftImage)]"));
 assert(html.includes("['왼쪽 아케이드 스틱 빨간 볼탑',()=>ensureBitmapDecoded(joystickKnobImage)]"));
 assert(html.includes("['볼탑 옛 봉 제거 투명 마스크',()=>ensureBitmapDecoded(joystickBallMaskImage)]"));
 for(const file of ['assets/ui/upgrade-icons-v4.webp','assets/ui/edge-arrows-animated.webp','assets/fx/parry-shield.png','assets/ui/arcade-action-buttons-v1.webp','assets/ui/z-arcade-stick-base-centerhole.webp','assets/ui/z-arcade-stick-shaft-centered.webp','assets/ui/z-arcade-stick-knob.webp','assets/ui/z-arcade-stick-ball-only-mask.webp']){
  const imgBytes=fs.readFileSync(path.join(root,file));
  assert(imgBytes.length>(file.endsWith('z-arcade-stick-ball-only-mask.webp')?2400:3000),'real UI bitmap asset exists: '+file);
 }
 assert(html.includes("const MOD_ICON_ORDER=[...MOD_UI_ORDER,'neuro','hub-core','hub-servo','hub-reflex']"),'21 combat, one composite and three hub icons share one canonical 25-cell atlas');
 assert(html.includes('const src=upgradeIconsImage,columns=5,rows=5,iconSize=96;'),'every icon is cut into an equal square 5×5 sheet');
 assert(html.includes('const scale=Math.min(iconSize*.84/bw,iconSize*.84/bh)'),'original icon proportions are preserved during square normalization');
 assert(html.includes('modIconMarkup(m.art)'),'all three hub upgrades use their dedicated atlas pictures');
 assert(html.includes('modIconMarkup(id)'),'combat upgrade cards use the shared atlas');
 assert(html.includes('resetFailedUiBitmaps();'),'start retry resets failed UI assets');
 assert(html.includes("background-image:var(--upgrade-preloaded-url,url('./assets/ui/upgrade-icons-v4.webp'))"),
 'CSS icon sprite shares the preloaded image URL and supports cache-busted retries');
}

(async()=>{await uiBitmapPreload();spriteRetry();optionalArt();await startup();await startup(true);await audio();await combatVoices();console.log('PASS: start waits for art + full BGM; failures block start; repeated starts deduplicate; upgrades soften music but combat impact never ducks music');})().catch(e=>{console.error(e);process.exitCode=1});
