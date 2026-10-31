#!/usr/bin/env python3
from PIL import Image,ImageDraw
from pathlib import Path
src=Image.open("assets/project-z-hero/idle-source.png").convert("RGBA")
sw,sh=src.size
assert sw%4==0 and sh%2==0
cw,ch=sw//4,sh//2
frames=[];boxes=[]
for i in range(8):
 x,y=i%4,i//4
 cell=src.crop((x*cw,y*ch,(x+1)*cw,(y+1)*ch))
 pix=cell.load()
 for yy in range(ch):
  for xx in range(cw):
   r,g,b,a=pix[xx,yy]
   if a<8:continue
   if g>65 and g>r*1.12 and g>b*1.10 and (g-r)>19 and (g-b)>16:
    pix[xx,yy]=(r,g,b,0)
   elif g>61 and g>r+10 and g>b+9:
    amount=min(1,(g-max(r,b)-9)/42)
    pix[xx,yy]=(r,min(g,max(r,b)+14),b,int(a*(1-amount*.78)))
 box=cell.getchannel("A").point(lambda a:255 if a>=35 else 0).getbbox()
 assert box
 frames.append(cell);boxes.append(box)
 print("IDLE ORIGINAL HAIR",i+1,"bbox",box)
left=max(0,min(b[0] for b in boxes)-13)
top=max(0,min(b[1] for b in boxes)-14)
right=min(cw,max(b[2] for b in boxes)+12)
bottom=min(ch,max(b[3] for b in boxes)+7)
w,h=right-left,bottom-top
scale=min(240/w,254/h)
rw,rh=round(w*scale),round(h*scale)
out=Image.new("RGBA",(960,508))
qa=Image.new("RGB",(1144,620),(13,21,34))
draw=ImageDraw.Draw(qa)
for i,source in enumerate(frames):
 col,row=i%4,i//4
 resized=source.crop((left,top,right,bottom)).resize((rw,rh),Image.Resampling.LANCZOS)
 f=Image.new("RGBA",(240,254))
 f.alpha_composite(resized,((240-rw)//2,254-rh))
 b=f.getchannel("A").point(lambda a:255 if a>=40 else 0).getbbox()
 assert b and b[0]>0 and b[2]<240,(i,b)
 out.alpha_composite(f,(col*240,row*254))
 preview=f.resize((256,270),Image.Resampling.LANCZOS)
 qa.paste(preview,(col*286+15,row*310+4),preview)
 draw.rectangle((col*286+3,row*310+2,col*286+283,row*310+279),outline=(239,46,111),width=2)
 draw.text((col*286+10,row*310+288),"Z IDLE "+str(i+1)+" - COMPLETE HAIR",fill=(224,239,253))
 print("IDLE REPAIRED",i+1,"bbox",b)
asset=Path("assets/project-z-hero/z-idle-hair-safe.webp")
asset.parent.mkdir(exist_ok=True,parents=True)
out.save(asset,"WEBP",quality=94,method=6,alpha_quality=100)
preview=Path("assets/project-z-hero/z-idle-hair-safe-qa.webp")
qa.save(preview,"WEBP",quality=85,method=6)
assert Image.open(asset).size==(960,508)
print("PASS IDLE COMPLETE 8 FRAMES",asset,asset.stat().st_size)
