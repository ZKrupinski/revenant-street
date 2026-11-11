'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('const Z_SIGNATURE_SLOW_PORTION=2/3;');
const end=html.indexOf('function heelLandingShockwave(',begin);
assert(begin>0&&end>begin,'production signature slow controller is present');
const env={fx:[],slowMotion:1.4,riposteCinematicTime:.8,parrySlowTarget:null};
vm.createContext(env);
vm.runInContext(html.slice(begin,end)+
 '\nthis.begin=triggerSpecialContactSlowMo;this.active=zSignatureSlowActive;this.state=()=>({kind:zSignatureSlowKind,fx:zSignatureSlowFx,rate:Z_SIGNATURE_SLOW_RATE,portion:Z_SIGNATURE_SLOW_PORTION});',env);
assert.equal(env.state().rate,.42);
assert.equal(env.state().portion,2/3);
const presets=[
 {kind:'jump',fx:'groundSlamSprite',duration:.41,release:.41*2/3},
 {kind:'dash',fx:'dashPierceSprite',duration:.29,release:.29*2/3},
 {kind:'counter',fx:'parryCounterSprite',duration:.38,release:.38*2/3}
];
for(const {kind,fx,duration,release} of presets){
 const target={kind,stun:0},effect={kind:fx,maxLife:duration,life:duration,age:0};
 env.fx.length=0;env.fx.push(effect);
 env.slowMotion=1.4;env.riposteCinematicTime=.8;
 assert.equal(env.begin(kind,target,effect),true,'real contact starts '+kind);
 assert.equal(env.begin(kind,target,effect),false,'same effect cannot start twice');
 assert.equal(env.slowMotion,0,'old general slow is cleared');
 assert.equal(env.riposteCinematicTime,0,'old counter slow is cleared');
 assert.equal(env.parrySlowTarget,target);
 let elapsed=0,ticks=0;
 while(env.active()&&ticks<120){
  effect.life=Math.max(0,effect.life-1/60);
  effect.age=duration-effect.life;
  elapsed+=1/60;ticks++;
 }
 assert(ticks<120,'slow must terminate');
 assert(Math.abs(elapsed-release)<=1/60+1e-8,
  kind+' unfreezes after ~2/3 of '+duration+'s original animation');
 assert(effect.life>0,'last third of the painted animation remains visible at full speed');
 assert.equal(env.parrySlowTarget,null,'victim local time unfreezes with the world');
 assert.equal(env.state().fx,null,'ownership is released for next attack');
}
const target={};
const a={kind:'dashPierceSprite',maxLife:.29,life:.29};
const b={kind:'groundSlamSprite',maxLife:.41,life:.41};
env.fx.splice(0,env.fx.length,a,b);
assert(env.begin('dash',target,a));
assert(env.begin('jump',target,b),'new contact supersedes rather than adding time');
a.life=0;assert(env.active(),'old expired effect cannot cancel newer active one');
b.life=.41/3;assert(!env.active(),'new effect releases at its own 2/3 threshold');
const update=html.slice(html.indexOf('function updateEffects('),html.indexOf('// Prebuilt metallic numeric PNG glyphs',html.indexOf('function updateEffects(')));
assert(update.includes("const signature=f.kind==='groundSlamSprite'||f.kind==='dashPierceSprite'||f.kind==='parryCounterSprite'"));
assert(update.includes("const fxDt=signature||"));
assert(update.includes("?realDt:dt;"),'the original 8F FX follows wall-clock seconds');
assert(html.includes("const signatureCinematic=zSignatureSlowActive()"));
assert(html.includes("const worldDt=dt*(signatureCinematic?Z_SIGNATURE_SLOW_RATE:"));
assert(html.includes("const heroDt=worldDt*(signatureCinematic?.86:"));
assert(html.includes("const targetScale=signatureCinematic?.85:"));
assert(html.includes("triggerSpecialContactSlowMo('jump',impacted[0],slamFx)"));
assert(html.includes("triggerSpecialContactSlowMo('dash',dashImpactTarget,dashImpactFx)"));
assert(html.includes("triggerSpecialContactSlowMo('counter',e,counterFx)"));
assert(!html.includes("riposteCinematicTime=1.08;"),'old long counter freeze removed');
assert(!html.includes("slowMotion=Math.max(slowMotion,1.48)"),'old additive 1.48s counter slow removed');
console.log('PASS: jump, dash and counter release in 2/3 of real 8F animation at 42% world speed; no doubled slow timers or cut-off last frames');
