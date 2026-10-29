const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
(async()=>{
 const meta=JSON.parse(fs.readFileSync(path.join(root,'assets/assassin-b/atlas.json'),'utf8'));
 assert.equal(Object.keys(meta.actions).length,12);
 const proof=createCanvas(1430,12*156),ctx=proof.getContext('2d');ctx.fillStyle='#111b27';ctx.fillRect(0,0,proof.width,proof.height);
 let row=0,totalBytes=0;
 for(const [key,action] of Object.entries(meta.actions)){
  const file=path.join(root,'assets/assassin-b',action.file),im=await loadImage(file);totalBytes+=fs.statSync(file).size;
  assert.equal(im.width,1280);assert.equal(im.height,600);ctx.fillStyle='#8edcdd';ctx.font='16px sans-serif';ctx.fillText(key,10,row*156+80);
  for(let i=0;i<8;i++){
   const cell=createCanvas(320,300),c=cell.getContext('2d');c.drawImage(im,i%4*320,Math.floor(i/4)*300,320,300,0,0,320,300);
   const p=c.getImageData(0,0,320,300).data;let solid=0,green=0,edge=0;
   for(let y=0;y<300;y++)for(let x=0;x<320;x++){const n=(y*320+x)*4;if(p[n+3]<64)continue;solid++;if(p[n+1]>150&&p[n+1]-p[n]>65&&p[n+1]-p[n+2]>65)green++;if(x<2||x>317||y<2||y>297)edge++;}
   assert(solid>1000,`${key}/${i} empty`);assert.equal(edge,0,`${key}/${i} clipped`);assert(green/solid<.001,`${key}/${i} chroma remnant`);
   ctx.fillStyle=(i%2)?'#24313f':'#1b2938';ctx.fillRect(150+i*160,row*156,160,150);ctx.drawImage(cell,150+i*160,row*156,160,150);
  }
  row++;
 }
 const out=process.env.QA_DIR;if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'all-assassin-frames.png'),proof.toBuffer('image/png'));}
 console.log(`PASS: 12 atlases / 96 nonempty unclipped transparent frames; ${(totalBytes/1024).toFixed(0)} KiB total`);
})().catch(e=>{console.error(e);process.exit(1)});
