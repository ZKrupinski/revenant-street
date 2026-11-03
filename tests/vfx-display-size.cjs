'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const expected=[
 ['basic contact render +35% versus original',"const elapsed=f.age-f.delay,w=f.width*1.35;"],
 ['electric element selectively enlarged',"const width=(130+progress*55)*ef.scale*(ef.mod==='shock'?1.82:1.28);"],
 ['enemy electric status selectively enlarged',"state.status==='shock'?1.76:state.status==='freeze'?1.32:1.18"],
 ['angle-aware enemy status sectors', "const dir=e.face||1,slot=enemyFxSlot(kind,dir);"],
 ['mint heal +25%',"const cell=im.naturalWidth/8,width=170*f.scale*1.25,"],
 ['electric +50%, critical +43%, other upgrades baseline',
  "f.upgrade==='chain'?1.95:f.upgrade==='crit'?1.86:1.30"],
 ['ground slam ORIGINAL',"const width=clamp(530*f.scale,230,910),"],
 ['dash pierce ORIGINAL',"const width=f.width,height=width*(ch/cw);"],
 ['dash wake ORIGINAL',"const width=f.width*(gathering?.82+age*.38:1);"],
 ['dash charging ORIGINAL',"const width=220+progress*112,"],
 ['parry riposte ORIGINAL',"const width=f.width,height=width*(sh/sw)*.81;"],
 ['parry success ORIGINAL',"const w=318,h=296;"],
 ['ground slam backup ORIGINAL',"const w=230*f.scale;"]
];
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 for(const [name,code] of expected)assert(html.includes(code),file+': '+name);
 assert(html.includes("const x=enemy.x+dir*(eliteContact?137:Math.min(54,Math.max(24,bodyHalfX(enemy)*.48)));"),
  'regular enemy hits retain previous offset, Iron Mask uses its larger forward body edge');
 assert(html.includes("const count=Math.min(room,eliteContact?1:critical?2:Math.random()<.70?2:1)"),
  'no overlapping translucent hit sprites on elite');
 assert(html.includes("ctx.globalCompositeOperation=f.eliteContact?'source-over':'screen'"),
  'Iron Mask contact FX use solid paint not a ghostly additive body overlay');
 assert(html.includes('vx:dir*(main?rnd(22,52):rnd(42,90))'),'hit FX advances into the attack, not back toward hero');
 assert(html.includes('nova:{x:91,y:130,tilt:1.31}'),'ground-attack PNG stays angled toward enemy');
 assert(html.includes('fx[i].contactEnemy===e&&fx[i].upgrade===kind'),'each effect type persists independently on one opponent');
 assert(!html.includes('drawUpgradeVfxLoop(Z_ELEMENT_IMPACT_SPRITES[mod]'),'no overlapping hero elemental aura');
 assert(html.includes("const w=318,h=296;"),'special parry effect uses original display');
 assert(html.includes("const width=clamp(530*f.scale,230,910),"),'ground slam does not use extra zoom');
 assert(html.includes("const width=f.width,height=width*(ch/cw);"),'dash pierce original scale');
 assert(html.includes("const width=f.width,height=width*(sh/sw)*.81;"),'parry counter original scale');
 const sourceFrames=[
  'const sw=atlas.naturalWidth/8,sh=atlas.naturalHeight/5,',
  'const cw=bitmap.naturalWidth/4,ch=bitmap.naturalHeight/2;',
  'const cw=im.naturalWidth/4,ch=im.naturalHeight/2;',
  'const col=frame%4,row=Math.floor(frame/4);',
  'const cw=im.naturalWidth/8,displayH=width*(im.naturalHeight/cw);',
  'const cell=im.naturalWidth/8,width=170*f.scale*1.25,'
 ];
 for(const code of sourceFrames)assert(html.includes(code),file+': preserves strict original sprite-sheet source crops: '+code);
 assert(!html.includes("spawnUpgradeVfx('guard'"),'guard bubble cannot return when zooming bitmap art');
 assert(!html.includes('spawnParryShieldFx('),'upgrade never spawns legacy parry shield');
 assert(!html.includes("sprite:'guard'"),'ice timer cannot revive shield');
 const first=html.indexOf("(()=>{'use strict';"),last=html.lastIndexOf('\n})();\n\n</script>');
 assert(first>0&&last>first);new vm.Script(html.slice(first,last+6),{filename:file});
}
console.log('PASS: enlarged combat sprites across both entrypoints; 8-frame source cropping remains unchanged; no shield VFX regression');
