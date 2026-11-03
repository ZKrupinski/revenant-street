'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('const Z_FRONT_SPECIAL_FX=new Set([');
const effectStart=html.indexOf('function drawEffects(',start);
const effectEnd=html.indexOf('// Combat-only text overlays are intentionally disabled',effectStart);
assert(start>0&&effectStart>start&&effectEnd>effectStart);
const enemy={x:500,y:580,renderX:500,renderY:580,dead:false,fade:1};
const hit={kind:'enemyHitBitmap',x:530,y:450,contactEnemy:enemy};
const death={kind:'enemyDeathBitmap',x:500,y:580,deadEnemy:enemy};
const basic={kind:'basicHitSprite',x:530,y:450,contactEnemy:enemy,delay:0};
const calls=[];
const ctx={save(){},restore(){},drawImage(){}};
const scene={
 Math,fx:[hit,death,basic],enemies:[enemy],attributeFx:[],Z_ENEMY_STATUS_VFX:[],
 p:{x:120,y:560,dodge:0,evadeBackstep:false},W:1280,cameraX:0,
 drawModEnergy(){},drawEnemyBitmapFx(f){calls.push(f.kind)},
 drawBasicContactFx(f){calls.push(f.kind)},ctx,img:{},window:{}
};
vm.createContext(scene);
vm.runInContext(html.slice(start,effectStart)+'\nthis.choose=zHybridVfxForeground;this.isSignature=zIsSignatureVfx;',scene);
const chosen=scene.choose();
assert(scene.isSignature(hit),'enemy hit is a forced foreground signature VFX');
assert(!scene.isSignature(death),'enemy death is not a foreground signature VFX');
assert(!chosen.fx.has(death),'death cannot be promoted by the hybrid multiple-effect selector');
assert(html.includes("f.kind==='enemyHitBitmap'?true:f.kind==='enemyDeathBitmap'?false"),
 'drawEffects explicitly forces correct layer independent of selected effect score');
vm.runInContext(html.slice(effectStart,effectEnd)+'\nthis.drawEffects=drawEffects;',scene);
scene.drawEffects('back',chosen);
assert.deepEqual(calls,['enemyDeathBitmap','basicHitSprite'],
 'death and normal effect draw behind the character in back pass');
scene.drawEffects('front',chosen);
assert.deepEqual(calls,['enemyDeathBitmap','basicHitSprite','enemyHitBitmap'],
 'enemy hit draws on top of character and death is not drawn twice');
const actorStart=html.indexOf("const vfxSelection=Z_VFX_MODE==='hybrid'?");
const backPos=html.indexOf("drawEffects('back',vfxSelection)",actorStart);
const actorsPos=html.indexOf('actors.forEach(drawActor)',actorStart);
const frontPos=html.indexOf("drawEffects('front',vfxSelection)",actorStart);
assert(backPos<actorsPos&&actorsPos<frontPos,'real actor pass is between death and hit VFX passes');
assert(html.includes('function drawEnemyBitmapFx(effect){'),'original two 8-frame images remain untouched');
console.log('PASS: enemy hit renders above characters; enemy death remains behind, no double-pass or forced promotion');
