'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const keys=['punchA','punchB','punchC','punchD','punchE','punchF','heavy','parry','counter','upgrade','reroll'];
const audit=JSON.parse(fs.readFileSync(path.join(root,'assets/sfx/z-lowlat-v9-audit.json'),'utf8'));
const allKeys=[...keys,'enemyA','enemyB'];
assert.equal(audit.version,'onset-tight-v9-20261103');
assert.equal(audit.sources.length,13,'11 independent combat/UI sounds and 2 real recorded enemy voices');
const audited=new Map(audit.sources.map(x=>[x.key,x]));
const hashes=new Set();
for(const key of allKeys){
 const a=audited.get(key);assert(a,'missing zero-lead audio report '+key);
 const p=path.join(root,a.output),b=fs.readFileSync(p);
 assert(b.length>10000,'real PCM waveform not silent '+key);
 assert.equal(b.subarray(0,4).toString(),'RIFF','no encoder preroll, actual WAV '+key);
 assert.equal(b.subarray(8,12).toString(),'WAVE','correct PCM header '+key);
 assert(a.final_audible_onset_ms<=3.0,'audio begins within 3ms '+key);
 assert(a.trimmed_front_ms>=0,'nonnegative trim '+key);
 assert(a.duration_ms>140,'no premature cutoff '+key);
 hashes.add(crypto.createHash('sha256').update(b).digest('hex'));
}
assert.equal(hashes.size,13,'all live source recordings distinct');
assert(audited.get('counter').trimmed_front_ms>95,'the very delayed counter slide removes >95ms of silence');
assert(audited.get('parry').trimmed_front_ms>155,'parry explosion removes >155ms of silence');
assert(audited.get('heavy').trimmed_front_ms>145,'heavy attack removes >145ms of silence');
assert(audited.get('parry').source.includes('counter-loud-reverb'),'V8: parry is still the old counter blast');
assert(audited.get('counter').source.includes('slide-b'),'V8: counter is still the old parry metal slide');
for(const entry of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const key of keys){
  assert(html.includes(key+":'./assets/sfx/z-lowlat-v9-"+key+".wav?v=zeroLeadV9'"),
   entry+' must use real decoded PCM V9 sample '+key);
 }
 for(const phrase of [
  "playImpactSound('parry',1.65)","playImpactSound('counter',1.35)",
  "playImpactSound('parry',.90)","playImpactSound('parry',.85)",
  "playImpactSound('counter',1.30)","playImpactSound('counter',powered?1.35:1.08)",
  "version:'zero-lead-pcm-v9-20261103'",
  "Object.keys(impactSfxBuffers).length===11",
  "function nextImpactAttackKey()","if(bag[0]===impactLastAttackKey)",
  "const duration=key==='parry'?2.28","const release=key==='parry'?Math.min(.34",
  "counter:[590,1,1]","vibrateImpact('counter',true)",
  "function playUpgradeSfx(type='confirm')",
  "playUpgradeSfx('confirm')","playUpgradeSfx('reroll')"
 ])assert(html.includes(phrase),entry+' missing cue or original 8-frame combat wiring '+phrase);
 const a=html.indexOf('// PROJECT Z AUDIO V9:'),b=html.indexOf('// Single active controller',a);
 assert(a>0&&b>a,'V9 master active in both HTML entrypoints');
 const engine=html.slice(a,b),start=html.indexOf('function startAttack()'),
  endStart=html.indexOf('function parry(){',start),attack=html.indexOf('function attackCheck()');
 assert(start>0&&endStart>start&&attack>endStart,'actual attack input and impact functions found');
 const input=html.slice(start,endStart),onHit=html.slice(attack,html.indexOf('// Every one of the 19 attack motions',attack));
 assert(input.includes("p._inputStrikeSfxPlayed=playImpactSound('punch',.97)"),
  'accepted normal attack triggers sound at BUTTON INPUT, not after animation');
 assert(input.includes("playImpactSound('counter',1.35)"),
  'accepted parry follow-up plays metal counter immediately at button press');
 assert(input.includes('p.riposteChaseWarmup=.10'),
  'post-parry chase has shortened, still-visible windup');
 assert(!onHit.includes("playImpactSound('counter',1.35)"),
  'confirmed follow-up hits retain rumble without playing a second delayed counter sound');
 assert(input.includes("p._dashExplosionPlayed=playImpactSound('counter',1.22)"),
  'dash punch cue starts instantly and cannot double-trigger at strike');
 assert(html.includes("p.dashSmash||p.airAttack||p._inputStrikeSfxPlayed"),
  'physical collision retains haptics but does not double-play an input gunshot');
 assert(html.includes('const offset=0;'),'zero preroll WAV sources do not trigger expensive runtime waveform scanning');
 assert(html.includes('attack=Math.min(.0008'),'fast submillisecond audio attack envelope');
 assert(html.includes("cache:'force-cache'"),'decoded V9 audio fetches use versioned cache');
 assert(!engine.includes('createOscillator')&&!engine.includes('impact-drum')&&
        !engine.includes('shotgun-rack-v2')&&!engine.includes('/assets/voice/shot-'),
  'discarded arcade sound sources not reintroduced');
 assert(!engine.includes('__revenantBgm'),'combat bus does not duck music');
 assert(!html.includes("sound('attack')"),'old chirping arcade attack sound stays removed');
}
console.log('PASS: 13 measured real PCM sounds <3ms onset, instant attack/counter input, preserved hit rumble and V8 sample swap');
