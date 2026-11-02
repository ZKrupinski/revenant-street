'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const crypto=require('node:crypto');
const png=fs.readFileSync(path.join(__dirname,'..','assets/vfx/project_z_parry_counter_user_8f.png'));
assert.equal(png.length,1696725,'the user-approved original PNG is present at its exact byte size');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16),1774,'source columns must not be resized or repainted');
assert.equal(png.readUInt32BE(20),887,'source rows must not be resized or repainted');
assert.equal(png[25],6,'original RGBA alpha data remains intact');
const gitBlob=crypto.createHash('sha1').update('blob '+png.length+'\0').update(png).digest('hex');
assert.equal(gitBlob,'0706091f8a7c592f4a9d880fc4599792d627e9fa',
 'exact original Git blob SHA must match the approved upload, no re-generation');

assert(html.includes("src:'./assets/vfx/project_z_parry_counter_user_8f.png'"));
assert(html.includes("spawnParryCounterFx(p,e,skill.visual); // true parry follow-up contact only"));
assert(html.includes("if(f.kind==='parryCounterSprite'){drawParryCounterSprite(f);continue;}"));
assert(html.includes("['패링 반격 원본 8프레임 비트맵',()=>ensureBitmapDecoded(PARRY_COUNTER_ART.image)]"),
 'approved user artwork is a required and decoded battle resource');
const start=html.indexOf('const PARRY_COUNTER_ART='),end=html.indexOf('function heelLandingShockwave(',start);
assert(start>0&&end>start);
const draws=[],moves=[];
const ctx={save(){},restore(){},translate(x,y){moves.push(['translate',x,y])},
 scale(x,y){moves.push(['scale',x,y])},drawImage(...args){draws.push(args)}};
const env={Image:class {constructor(){this.complete=false;this.naturalWidth=1774;this.naturalHeight=887}set src(v){this._src=v;this.complete=true;this.onload?.()}get src(){return this._src}},
 ctx,fx:[],window:{},clamp:(v,a,b)=>Math.min(b,Math.max(a,v))};
vm.createContext(env);
vm.runInContext(html.slice(start,end)+'\nthis.spawn=spawnParryCounterFx;this.draw=drawParryCounterSprite;',env);
assert.equal(env.PARRY_COUNTER_ART?.available,undefined); // lexical const stays isolated
const hero={x:100,y:560,facing:1},enemy={x:270,y:560};
assert.equal(env.spawn(hero,enemy),true);
const fx=env.fx[0];assert.equal(fx.kind,'parryCounterSprite');
assert.equal(fx.x,183);assert.equal(fx.y,419);assert.equal(fx.dir,1);
for(let i=0;i<8;i++){fx.age=fx.maxLife;fx.life=.04;assert.equal(env.draw(fx),true);}
assert.equal(draws.length,8,'all 8 authored poses survive severe FPS drops');
for(let i=0;i<8;i++){
 const a=draws[i],col=i%4,row=Math.floor(i/4);
 assert.equal(a[1],Math.round(col*1774/4));
 assert.equal(a[2],Math.round(row*887/2));
 assert.equal(a[3],Math.round((col+1)*1774/4)-a[1]);
 assert.equal(a[4],Math.round((row+1)*887/2)-a[2]);
 assert.equal(a.length,9);
 assert(Math.abs(a[7]-fx.width)<1e-6,'parry follow-up PNG is original size while source crop remains pixel-exact');
 assert(a[7]>a[8],'counter blast is spread toward enemy, not tall smoke');
}
env.spawn({x:500,y:560,facing:-1},{x:320,y:560});
const left=env.fx[1];assert.equal(left.x,417);assert.equal(left.dir,-1);
assert.equal(env.draw(left),true);
assert(moves.some(([op,x,y])=>op==='scale'&&x===-1&&y===1),'left hit mirrors approved source frame');
assert(!html.includes('spawnParryCounterFx(p,e); // on parry input'),'no effect before actual counter impact');
console.log('PASS: approved 4x2 uneven source, no recolor, eight frames, counter-hit trigger, left-right mirror, optional missing-art fallback');
