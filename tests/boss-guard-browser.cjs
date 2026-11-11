'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.Z_BROWSER_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
await page.route('**/index.html',async route=>{
 let h=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const anchor="canvas.style.visibility='hidden';syncGameViewport();titleMenu();requestAnimationFrame(loop);";
 assert.equal(h.split(anchor).length,2,'live test hook');
 h=h.replace(anchor,`window.__bossQA={
 reset(){
  resetPlayer();gameState='playing';heroEntry.active=false;wave=3;
  const b=makeEnemy('boss',p.x+210,p.y,10);b.encountered=true;
  b.bossReady=false;window.RZBossHunter.init(b);
  b.bossIntroduced=true;b.bossGuardCooldown=0;b.bossCooldown=9;
  enemies=[b];p.inv=9;return b.maxHp;
 },
 hit(damage=32,kind=''){
  const b=enemies[0];p.stun=0;p.attack=.42;
  hurtEnemy(b,damage,42,kind);
  return {hp:b.hp,mode:b.bossMode,x:p.x,attack:p.attack,guard:b.bossGuardActivations};
 },
 state(){const b=enemies[0];return {hp:b.hp,maxHp:b.maxHp,mode:b.bossMode,guard:b.bossGuardActivations,
  phase:b.phase,x:p.x,heroHp:p.hp,retaliation:b.bossRetaliationPending};},
 tick(n=1){for(let i=0;i<n;i++){update(1/60);zFeelEndTick();zFeelInTick=false;}},
 }; `+anchor);
 await route.fulfill({status:200,contentType:'text/html',body:h});
});
await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});
assert.equal(await page.evaluate(()=>!!window.RZBossHunter?.onHit),true,'runtime loaded new Hunter AI');
assert.equal(await page.evaluate(()=>__bossQA.reset()),10500);
const before=await page.evaluate(()=>__bossQA.state());
await page.evaluate(()=>{__bossQA.hit();__bossQA.hit();__bossQA.hit();});
const guarded=await page.evaluate(()=>__bossQA.state());
assert.equal(guarded.mode,'guard','third actual combat hit cancels into guard');
assert.equal(guarded.guard,1,'boss reacts only once per three-hit pressure cycle');
assert(guarded.hp<guarded.maxHp&&guarded.hp>guarded.maxHp-100,'guard mitigates damage but is not invulnerable');
assert(Math.abs(guarded.x-before.x)>=100,'actual hero attack gets cancelled and hero knocked back');
assert.equal(guarded.heroHp,before.heroHp,'defense itself does not subtract health');
await page.evaluate(()=>__bossQA.tick(48));
const retaliation=await page.evaluate(()=>__bossQA.state());
assert(['dash','slam',null].includes(retaliation.mode),'guard transitions to live counter without crashing');
assert.equal(retaliation.guard,1);
await page.evaluate(()=>__bossQA.reset());
await page.evaluate(()=>{__bossQA.hit();__bossQA.hit();__bossQA.hit();});
const broken=await page.evaluate(()=>__bossQA.hit(280,'counter'));
assert.notEqual(broken.mode,'guard','perfect counter breaks active guard');
assert(broken.hp>0,'boss remains alive for meaningful follow-up fight');
assert.deepEqual(errors,[],'no runtime errors during defense, impact or guard break');
console.log('PASS live browser Hunter: 10500 HP, three-hit guard cancels combo, hero recoil, damage mitigation, dash/slam follow-up, perfect counter guard break');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
