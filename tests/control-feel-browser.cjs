const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.Z_BROWSER_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
await page.route('**/index.html',async route=>{
 let h=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
 h=h.replace("canvas.style.visibility='hidden';syncGameViewport();titleMenu();requestAnimationFrame(loop);",`window.__qa={p,keys,reset(){resetPlayer();gameState='playing';heroEntry.active=false;enemies=[];},tick(){update(1/60);zFeelEndTick();zFeelInTick=false;},jump,dodge,startAttack};canvas.style.visibility='hidden';syncGameViewport();titleMenu();requestAnimationFrame(loop);`);
 await route.fulfill({status:200,contentType:'text/html',body:h});
});
await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});
assert(await page.evaluate(()=>!!window.__revenant&&!!window.__zControlFeel));
await page.evaluate(()=>window.__qa.reset());
await page.keyboard.down('d');for(let i=0;i<6;i++)await page.evaluate(()=>__qa.tick());
assert.equal(await page.evaluate(()=>__qa.p._feelVX),690);
await page.keyboard.up('d');for(let i=0;i<4;i++)await page.evaluate(()=>__qa.tick());
await page.keyboard.down('ArrowUp');await page.evaluate(()=>__qa.tick());assert(await page.evaluate(()=>__qa.p.z>0));
await page.keyboard.up('ArrowUp');await page.evaluate(()=>__qa.tick());
await page.evaluate(()=>{__qa.p.mods=['jumpheight','jumpheight','jumpheight'];});
await page.keyboard.down('ArrowUp');await page.evaluate(()=>__qa.tick());assert.equal(await page.evaluate(()=>__qa.p.doubleJumpUsed),true);
await page.keyboard.up('ArrowUp');await page.evaluate(()=>__qa.tick());await page.keyboard.down('ArrowUp');await page.evaluate(()=>__qa.tick());
assert.equal(await page.evaluate(()=>__zControlFeel.logs().filter(e=>e.source==='double-jump').length),1);
await page.keyboard.up('ArrowUp');
await page.evaluate(()=>{__qa.reset();__qa.startAttack();__qa.dodge();__qa.tick();});
assert(await page.evaluate(()=>__qa.p.dodge>0));assert.equal(await page.evaluate(()=>__qa.p.attack),0);
assert.deepEqual(errors,[]);console.log('PASS browser runtime: title initialized, DOM WASD, jump, Lv3 double jump once, same-tick dodge priority; no page errors.');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
