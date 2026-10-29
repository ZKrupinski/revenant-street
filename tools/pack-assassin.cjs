// Offline atlas packing using the game's established chroma-key extraction.
// Usage: node tools/pack-assassin.cjs <raw-directory> <output-directory>
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..'),rawDir=path.resolve(process.argv[2]),outDir=path.resolve(process.argv[3]);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=html.indexOf('function prepareZCells(im){');
const end=html.indexOf('// Common union bounds',start);
const fn=html.slice(start,end)+'return raw;\n}';
const sandbox={document:{createElement:()=>createCanvas(1,1)}};vm.createContext(sandbox);vm.runInContext(fn,sandbox);
const keys=['idle','walk','run','charge','attack','hitHead','hitBody','hitSpin','hitLaunch','hitFly','fall','getup'];
const CELL_W=320,CELL_H=300,FOOT_Y=280;
(async()=>{
 fs.mkdirSync(outDir,{recursive:true});
 const idleImage=await loadImage(path.join(rawDir,'idle.png'));
 const idle=sandbox.prepareZCells(idleImage);
 const heights=idle.map(f=>f.bounds.h).sort((a,b)=>a-b);
 const referenceHeight=(heights[3]+heights[4])/2;
 const sourceFoot=idle.reduce((a,f)=>a+f.bounds.y+f.bounds.h,0)/8;
 const sourceHeight=idleImage.height/2;
 const metadata={version:1,frameWidth:CELL_W,frameHeight:CELL_H,columns:4,rows:2,frames:8,anchorX:CELL_W/2,anchorY:FOOT_Y,displayHeight:244,referenceHeight,sourceFoot,actions:{}};
 const selected=process.argv.slice(4);
 if(selected.length)metadata.actions=JSON.parse(fs.readFileSync(path.join(outDir,'atlas.json'),'utf8')).actions;
 for(const key of keys.filter(k=>!selected.length||selected.includes(k))){
  const im=await loadImage(path.join(rawDir,key+'.png'));
  const frames=sandbox.prepareZCells(im),sheet=createCanvas(CELL_W*4,CELL_H*2),c=sheet.getContext('2d');
  // One scale and baseline for all frames, including crouches and deaths.
  const resolutionRatio=(im.height/2)/sourceHeight;
  const scale=244/referenceHeight/resolutionRatio;
  const bounds=[];
  for(let i=0;i<8;i++){
   const f=frames[i],left=CELL_W/2-f.canvas.width*scale/2,top=FOOT_Y-sourceFoot*resolutionRatio*scale;
   const box={x:left+f.bounds.x*scale,y:top+f.bounds.y*scale,w:f.bounds.w*scale,h:f.bounds.h*scale};
   if(box.x<0||box.y<0||box.x+box.w>CELL_W||box.y+box.h>CELL_H)throw Error(key+' frame '+i+' clips cell '+JSON.stringify(box));
   c.drawImage(f.canvas,(i%4)*CELL_W+left,Math.floor(i/4)*CELL_H+top,f.canvas.width*scale,f.canvas.height*scale);bounds.push(box);
  }
  const file=key+'.webp';await sharp(sheet.toBuffer('image/png')).webp({quality:94,alphaQuality:100,effort:6}).toFile(path.join(outDir,file));
  metadata.actions[key]={file,bounds,sourceWidth:im.width,sourceHeight:im.height};
  console.log(key,im.width+'x'+im.height,'height',bounds.map(b=>Math.round(b.h)).join(','));
 }
 fs.writeFileSync(path.join(outDir,'atlas.json'),JSON.stringify(metadata,null,2)+'\n');
})();
