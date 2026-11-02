const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm');
const root=path.join(__dirname,'..'),names=['chain','nova','leech','power','crit','guard'];
// Decode real RGBA rows. Checking PNG dimensions alone does not detect
// neighboring-frame bleed or chopped silhouettes at the 256px border.
function decodeAlpha(buffer){
 assert.equal(buffer.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let pos=8,width=0,height=0,idat=[],depth=0,color=0;
 while(pos<buffer.length){
  const len=buffer.readUInt32BE(pos),type=buffer.toString('ascii',pos+4,pos+8),body=buffer.subarray(pos+8,pos+8+len);
  if(type==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);depth=body[8];color=body[9];}
  if(type==='IDAT')idat.push(body);
  pos+=len+12;if(type==='IEND')break;
 }
 assert.equal(width,2048);assert.equal(height,256);assert.equal(depth,8);assert.equal(color,6,'clean RGBA, no opaque JPG conversion');
 const zipped=zlib.inflateSync(Buffer.concat(idat)),rowBytes=width*4;
 const alphas=new Uint8Array(width*height);
 let rawAt=0,prev=Buffer.alloc(rowBytes),cur=Buffer.alloc(rowBytes);
 for(let y=0;y<height;y++){
  const filt=zipped[rawAt++];
  for(let x=0;x<rowBytes;x++){
   const value=zipped[rawAt++],left=x>=4?cur[x-4]:0,up=prev[x],upleft=x>=4?prev[x-4]:0;
   let predictor=0;
   if(filt===1)predictor=left;
   if(filt===2)predictor=up;
   if(filt===3)predictor=Math.floor((left+up)/2);
   if(filt===4){
    const p=left+up-upleft,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-upleft);
    predictor=a<=b&&a<=c?left:b<=c?up:upleft;
   }
   assert(filt>=0&&filt<=4,'PNG filter');
   cur[x]=(value+predictor)&255;
  }
  for(let x=0;x<width;x++)alphas[y*width+x]=cur[x*4+3];
  const old=prev;prev=cur;cur=old;cur.fill(0);
 }
 return {alphas,width,height};
}
for(const id of names){
 const png=fs.readFileSync(path.join(root,'assets/vfx/project_z_upgrade_'+id+'_8f.png'));
 const {alphas,width,height}=decodeAlpha(png);
 const counted=[];
 for(let frame=0;frame<8;frame++){
  let count=0,cut=0;
  for(let y=0;y<height;y++)for(let x=0;x<256;x++){
   const alpha=alphas[y*width+frame*256+x];
   if(alpha>12)count++;
   if(x<8||x>=248||y<8||y>=248){if(alpha>12)cut++;}
  }
  assert(count>=200,id+' frame '+(frame+1)+' empty');
  assert.equal(cut,0,id+' frame '+(frame+1)+' bleeds or clips at boundary');
  counted.push(count);
 }
 assert.equal(counted.length,8);
}
for(const filename of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,filename),'utf8');
 assert(html.includes("project_z_upgrade_'+k+'_8f.png?v=20261102-clean-alpha-active-v2"),'fresh six PNG cache');
 assert(html.includes('const Z_ENEMY_STATUS_VFX=['),'persistent enemy ailments');
 assert(html.includes("const Z_ELEMENT_IMPACT_SPRITES=Object.freeze({fire:'nova',shock:'chain',bleed:'leech',ice:'chain'})"),'shared transparent element art');
 assert(html.includes('const sprite=Z_ELEMENT_IMPACT_SPRITES[ef.mod]'),'contact pop uses transparent PNG rather than filtered legacy burst');
 assert(!html.includes('drawUpgradeVfxLoop(Z_ELEMENT_IMPACT_SPRITES[mod]'),'no ground-impact aura painted over the hero');
 assert(html.includes("drawUpgradeVfxLoop(state.sprite"),'reuse actual 8F bitmap during status timer');
 assert(html.includes('for(const e of enemies)'),'enemy-side effect rather than hero-only');
 assert(!html.includes("drawUpgradeVfxLoop('guard',x"),'remove passive floating shield aura');
 assert(html.includes("spawnUpgradeVfx('chain',p.x-p.facing*24"),'haste active on attack');
 assert(html.includes("spawnHealVfx(p.regenAccumulated,'regen')"),'regen uses actual HP and a mint recovery pulse');
 assert(html.includes("spawnEnemyContactVfx('crit',e"),'impact uses victim surface, not body-center sprite');
 assert(html.includes("spawnEnemyContactVfx('power',e"),'momentum collides against enemy in the forward direction');
 assert(html.includes("if(f.kind==='upgradeVfxSprite'){drawUpgradeVfx(f);continue;}"),'existing effect renderer retained');
 // Compile whole main game IIFE without launching the browser (no DOM required).
 const first=html.indexOf("(()=>{'use strict';"),last=html.lastIndexOf('\n})();\n\n</script>');
 assert(first>0&&last>first,'main game IIFE');
 new vm.Script(html.slice(first,last+6),{filename});
 // Execute the actual ongoing-ailment drawing code against a Canvas mock.
 const start=html.indexOf('const Z_ENEMY_FX_SLOTS='),end=html.indexOf('function drawHeroModAura(',start);
 assert(start>0&&end>start);
 const draws=[],effects=Object.fromEntries(names.map(id=>[id,{ready:true,image:{naturalWidth:2048,naturalHeight:256,complete:true},drawn:0}]));
 const enemy={x:460,y:570,renderX:462,renderY:568,z:0,slot:3,face:-1,dead:false,
  shock:1,burn:0,bleed:0,freeze:0,shockPower:2};
 const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},
  drawImage(...args){draws.push(args)},globalAlpha:1,filter:'none'};
 const world={Z_UPGRADE_VFX:effects,ctx,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  enemies:[enemy],attributeFx:[],time:11,cameraX:0,W:1280,Math,MOD_META:{},img:{}};
 vm.createContext(world);
 vm.runInContext(html.slice(start,end)+'\nthis.paintStatuses=drawModEnergy;',world);
 world.paintStatuses();assert(draws.length===1,'shock remains visible while afflicted');
 const shockDisplayWidth=draws[0][7];
 assert(shockDisplayWidth>125,'active electrical status visibly enlarged');
 assert.strictEqual(draws.at(-1)[0],effects.chain.image,'enemy electric PNG');
 assert(draws[0][3]===256,'exact cell-width crop, no adjoining frame');
 draws.length=0;enemy.shock=0;enemy.burn=2;enemy.burnPower=3;
 world.paintStatuses();assert(draws.length===1,'burn remains visible during damage over time');
 assert.strictEqual(draws.at(-1)[0],effects.nova.image);
 draws.length=0;enemy.burn=0;enemy.bleed=1;enemy.bleedPower=2;
 world.paintStatuses();assert.strictEqual(draws.at(-1)[0],effects.leech.image);
 draws.length=0;enemy.bleed=0;enemy.freeze=1;enemy.freezePower=2;
 world.paintStatuses();assert.strictEqual(draws.at(-1)[0],effects.chain.image);
 assert(shockDisplayWidth>draws.at(-1)[7]*2,'shock status is visibly more powerful than ice, despite sharing bitmap');
 draws.length=0;enemy.shock=enemy.burn=enemy.bleed=enemy.freeze=1;
 world.paintStatuses();assert.equal(draws.length,4,'burn, shock, bleed and freeze all remain visible together');
 assert.equal(new Set(draws.map(d=>d[0])).size,3,'all 4 states draw even when shock and freeze share the electric source PNG');
 draws.length=0;enemy.dead=true;
 world.paintStatuses();assert.equal(draws.length,0,'do not render persistent VFX on corpses');
 // Transient element hit feedback must also use the new clean RGBA strips.
 world.attributeFx=[{mod:'fire',x:432,y:438,life:.25,maxLife:.4,scale:1.1}];
 world.paintStatuses();assert.equal(draws.length,1,'draw impact PNG');
 assert.strictEqual(draws[0][0],effects.nova.image,'no legacy filtered gold bitmap on fire impact');
 draws.length=0;
 world.attributeFx=[{mod:'ice',x:432,y:438,life:.25,maxLife:.4,scale:1.1}];
 world.paintStatuses();assert.strictEqual(draws[0][0],effects.chain.image,'ice impact avoids old guard/shield bitmap');
 // Test installed powers on the hero independently of enemy timer state.
 world.attributeFx=[];
 world.p={mods:['shock','fire'],hp:80,maxHp:100,facing:1};
 world.modRank=id=>world.p.mods.filter(m=>m===id).length;
 const heroStart=html.indexOf('function drawHeroModAura(');
 const heroEnd=html.indexOf('// Road art:',heroStart);
 assert(heroStart>0&&heroEnd>heroStart,'isolate equipped elemental hero cues');
 vm.runInContext(html.slice(heroStart,heroEnd)+'\nthis.paintHeroAura=drawHeroModAura;',world);
 draws.length=0;
 world.paintHeroAura(500,600,0);
 assert.equal(draws.length,0,'no painted attack explosions at the protagonist torso');
 world.p.mods.push('haste');world.p.running=true;world.time=10.1;
 world.paintHeroAura(500,600,0);
 assert.equal(draws.length,1,'small trail on running haste still works');
 assert.strictEqual(draws[0][0],effects.chain.image);
}
console.log('PASS: 48 transparent RGBA frames; 4 simultaneous spatially separated ailments, larger electric visual and no hero attack aura');
