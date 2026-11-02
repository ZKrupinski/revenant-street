'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const expected=[
 ['basic contact render +18%',"const elapsed=f.age-f.delay,w=f.width*1.18;"],
 ['elemental burst +16%',"const width=(130+progress*55)*ef.scale*1.16;"],
 ['enemy element timers +12%',"const width=(164+Math.min(rank,6)*8)*state.scale*1.12;"],
 ['one low-opacity hero element cue +12%',"y-z-126,(100+rank*9)*1.12,"],
 ['mint heal +20%',"const cell=im.naturalWidth/8,width=170*f.scale*1.20,"],
 ['upgrade skill hit +15%',"const cw=im.naturalWidth/8,width=218*f.scale*1.15,"],
 ['ground slam +20%',"const width=clamp(530*f.scale,230,910)*1.20,"],
 ['dash pierce +18%',"const width=f.width*1.18,height=width*(ch/cw);"],
 ['dash wake +12%',"const width=f.width*(gathering?.82+age*.38:1)*1.12;"],
 ['dash charging +12%',"const width=(220+progress*112)*1.12,"],
 ['parry riposte +15%',"const width=f.width*1.15,height=width*(sh/sw)*.81;"],
 ['original ten-frame parry impact +12%',"const w=318*1.12,h=296*1.12;"],
 ['ground slam backup +20%',"const w=230*f.scale*1.20;"]
];
for(const file of ['index.html','play-fixed-20261102.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 for(const [name,code] of expected)assert(html.includes(code),file+': '+name);
 const sourceFrames=[
  'const sw=atlas.naturalWidth/8,sh=atlas.naturalHeight/5,',
  'const cw=bitmap.naturalWidth/4,ch=bitmap.naturalHeight/2;',
  'const cw=im.naturalWidth/4,ch=im.naturalHeight/2;',
  'const col=frame%4,row=Math.floor(frame/4);',
  'const cw=im.naturalWidth/8,displayH=width*(im.naturalHeight/cw);',
  'const cell=im.naturalWidth/8,width=170*f.scale*1.20,'
 ];
 for(const code of sourceFrames)assert(html.includes(code),file+': preserves strict original sprite-sheet source crops: '+code);
 assert(!html.includes("spawnUpgradeVfx('guard'"),'guard bubble cannot return when zooming bitmap art');
 assert(!html.includes('spawnParryShieldFx('),'upgrade never spawns legacy parry shield');
 assert(!html.includes("sprite:'guard'"),'ice timer cannot revive shield');
 const first=html.indexOf("(()=>{'use strict';"),last=html.lastIndexOf('\n})();\n\n</script>');
 assert(first>0&&last>first);new vm.Script(html.slice(first,last+6),{filename:file});
}
console.log('PASS: enlarged combat sprites across both entrypoints; 8-frame source cropping remains unchanged; no shield VFX regression');
