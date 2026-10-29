const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const guideDir=path.join(root,'assets/project-z-hero/pose-guides');
const page=fs.readFileSync(path.join(root,'z-gait-planner.html'),'utf8');
const spec=fs.readFileSync(path.join(root,'docs/z-locomotion-8f-spec.md'),'utf8');
let total=0;
for(const kind of ['walk','run']){
 for(let i=1;i<=8;i++){
  const file=path.join(guideDir,kind+'-f'+String(i).padStart(2,'0')+'.png');
  const bytes=fs.readFileSync(file);
  assert(bytes.length>2000, file+' is too small');
  assert.equal(bytes.subarray(1,4).toString(),'PNG',file+' is not PNG');
  total++;
 }
}
const js=page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>'));
new vm.Script(js);
assert(page.includes("aria-pressed")&&page.includes("requestAnimationFrame(tick)"));
assert(page.includes("frame=(frame+1)%8"));
assert(spec.includes('shoulder')&&spec.includes('pelvis')&&spec.includes('pass'));
assert(spec.includes('Frame 3')||spec.includes('|3|'));
assert(spec.includes('Frame 7')||spec.includes('|7|'));
console.log('PASS: '+total+' bitmap gait guides; interactive planner JS syntax; arm/shoulder/hip production spec');
