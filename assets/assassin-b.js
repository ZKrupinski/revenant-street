/* Assassin B: pre-matted eight-frame atlases, fixed scale and floor anchor. */
(()=>{
 'use strict';
 const keys=['idle','walk','run','charge','attack','hitHead','hitBody','hitSpin','hitLaunch','hitFly','fall','getup'];
 const cache={},width=320,height=300,anchorX=160,anchorY=280;
 const source=key=>'./assets/assassin-b/'+key+'.webp';
 function split(image){
  if(image.naturalWidth!==width*4||image.naturalHeight!==height*2)throw Error('Invalid Assassin B atlas dimensions');
  return Array.from({length:8},(_,i)=>{
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   canvas.getContext('2d').drawImage(image,(i%4)*width,Math.floor(i/4)*height,width,height,0,0,width,height);
   return {canvas,bounds:{x:0,y:0,w:width,h:height},unitScale:1};
  });
 }
 function load(key){
  if(!keys.includes(key))key='idle';
  const previous=cache[key];
  if(previous&&(!previous.failed||previous.attempts>=3||Date.now()<previous.retryAt))return previous;
  const art={ready:false,loading:true,failed:false,frames:[],attempts:(previous?.attempts||0)+1,retryAt:0,error:null};
  cache[key]=art;
  const image=new Image();
  const failed=message=>{art.loading=false;art.failed=true;art.error=String(message);art.retryAt=Date.now()+2000;image.onload=null;image.onerror=null;};
  image.onload=()=>{try{art.frames=split(image);art.ready=true;art.loading=false;image.onload=null;image.onerror=null}catch(error){failed(error)}};
  image.onerror=()=>failed('Image failed to load: '+key);
  image.src=source(key);return art;
 }
 let warmDelay=0;
 function warm(dt){
  warmDelay-=dt;if(warmDelay>0||Object.values(cache).some(a=>a.loading))return;
  const key=keys.find(k=>!cache[k]||(cache[k].failed&&cache[k].attempts<3&&Date.now()>=cache[k].retryAt));
  if(key){load(key);warmDelay=.18;}
 }
 window.RZAssassinArt={keys,source,split,load,warm,width,height,anchorX,anchorY,status:()=>Object.fromEntries(keys.map(k=>[k,{ready:!!cache[k]?.ready,failed:!!cache[k]?.failed,frames:cache[k]?.frames.length||0,error:cache[k]?.error||null}]))};
})();
