'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const expected=[
 ['basic contact render +80% versus original',"const elapsed=f.age-f.delay,w=f.width*1.80;"],
 ['elemental burst +65%',"const width=(130+progress*55)*ef.scale*1.65;"],
 ['enemy element timers +45%',"const width=(164+Math.min(rank,6)*8)*state.scale*1.45;"],
 ['one low-opacity hero element cue +40%',"y-z-126,(100+rank*9)*1.40,"],
 ['mint heal +68%',"const cell=im.naturalWidth/8,width=170*f.scale*1.68,"],
 ['upgrade skill hit +68%',"const cw=im.naturalWidth/8,width=218*f.scale*1.68,"],
 ['ground slam +57%',"const width=clamp(530*f.scale,230,910)*1.57,"],
 ['dash pierce +60%',"const width=f.width*1.60,height=width*(ch/cw);"],
 ['dash wake +45%',"const width=f.width*(gathering?.82+age*.38:1)*1.45;"],
 ['dash charging +45%',"const width=(220+progress*112)*1.45,"],
 ['parry riposte +65%',"const width=f.width*1.65,height=width*(sh/sw)*.81;"],
 ['original ten-frame parry impact +50%',"const w=318*1.50,h=296*1.50;"],
 ['ground slam backup +57%',"const w=230*f.scale*1.57;"]
];
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 for(const [name,code] of expected)assert(html.includes(code),file+': '+name);
 assert(html.includes('const x=enemy.x+dir*Math.min(54,Math.max(24,bodyHalfX(enemy)*.48));'),'hit FX begins on the forward side of the enemy');
 assert(html.includes('vx:dir*(main?rnd(22,52):rnd(42,90))'),'hit FX advances into the attack, not back toward hero');
 const sourceFrames=[
  'const sw=atlas.naturalWidth/8,sh=atlas.naturalHeight/5,',
  'const cw=bitmap.naturalWidth/4,ch=bitmap.naturalHeight/2;',
  'const cw=im.naturalWidth/4,ch=im.naturalHeight/2;',
  'const col=frame%4,row=Math.floor(frame/4);',
  'const cw=im.naturalWidth/8,displayH=width*(im.naturalHeight/cw);',
  'const cell=im.naturalWidth/8,width=170*f.scale*1.68,'
 ];
 for(const code of sourceFrames)assert(html.includes(code),file+': preserves strict original sprite-sheet source crops: '+code);
 assert(!html.includes("spawnUpgradeVfx('guard'"),'guard bubble cannot return when zooming bitmap art');
 assert(!html.includes('spawnParryShieldFx('),'upgrade never spawns legacy parry shield');
 assert(!html.includes("sprite:'guard'"),'ice timer cannot revive shield');
 const first=html.indexOf("(()=>{'use strict';"),last=html.lastIndexOf('\n})();\n\n</script>');
 assert(first>0&&last>first);new vm.Script(html.slice(first,last+6),{filename:file});
}
console.log('PASS: enlarged combat sprites across both entrypoints; 8-frame source cropping remains unchanged; no shield VFX regression');
