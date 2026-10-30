const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const validation=JSON.parse(fs.readFileSync(path.join(root,'assets/original-z-hf/gait-v3-validation.json'),'utf8'));
assert.ok(index.includes("'./assets/original-z-hf/walk-'+zGaitChoice+'.webp'"));
assert.ok(index.includes("'./assets/original-z-hf/run-'+zGaitChoice+'.webp'"));
assert.match(index,/Z_REMOTE_ATLAS\.backwalk=Z_REMOTE_ATLAS\.walk/);
assert.match(index,/key==='walk'\|\|key==='run'\|\|key==='backwalk'\)\?preparePremattedGaitCells/);
assert.ok(index.includes("(zGaitChoice==='v3'||zGaitChoice==='v4')?(8-step)%8:step"));
for(const kind of ['walk','run']){
 const image=fs.readFileSync(path.join(root,'assets/original-z-hf',kind+'-v3.webp'));
 assert.equal(image.subarray(0,4).toString(),'RIFF');
 assert.equal(image.subarray(8,12).toString(),'WEBP');
 assert.ok(image.length>100000,kind+' source is too small');
 assert.equal(validation[kind].frames,8);
 assert.deepEqual(validation[kind].cell,[512,620]);
 assert.equal(validation[kind].frame_sizes.length,8);
 assert.equal(validation[kind].feet.length,8);
 assert.ok(validation[kind].frame_sizes.every(pair=>pair[0]>180&&pair[1]>320),kind+' has small/cut frames');
}
console.log('PASS: original-Z V3 walk/run and backwards walk share intact 8-frame atlases with reverse steps');
