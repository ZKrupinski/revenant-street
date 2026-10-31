#!/usr/bin/env python3
"""Repair Redhood attack hand silhouettes split across 4x2 PNG column seams.
Pixel-preserving relocation: no drawing/synthesis/AI, no costume changes.
"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
src=Image.open("assets/enemies/redhood-intruder/attack.png").convert("RGBA")
w,h=src.size
assert (w,h)==(1774,887),(w,h)
CELL=640
FOOT=598
tiles=[]
for n in range(8):
 c,r=n%4,n//4
 box=(round(c*w/4),round(r*h/2),round((c+1)*w/4),round((r+1)*h/2))
 tiles.append(src.crop(box))
transfers={}
for previous,following in [(1,2),(4,5),(6,7)]:
 donor=tiles[following]
 dw,dh=donor.size
 a=donor.getchannel("A")
 pix=a.load()
 visited=bytearray(dw*dh)
 groups=[]
 for yy in range(dh):
  if max(pix[0,yy],pix[1,yy])<15:continue
  for xx in range(2):
   if pix[xx,yy]<15 or visited[yy*dw+xx]:continue
   q=deque([(xx,yy)]);visited[yy*dw+xx]=1
   pts=[];lowx=dw;highx=-1;lowy=dh;highy=-1
   while q:
    x,y=q.popleft();pts.append((x,y))
    lowx=min(lowx,x);highx=max(highx,x)
    lowy=min(lowy,y);highy=max(highy,y)
    for ny in (y-1,y,y+1):
     if not 0<=ny<dh:continue
     for nx in (x-1,x,x+1):
      if not 0<=nx<dw:continue
      k=ny*dw+nx
      if not visited[k] and pix[nx,ny]>=15:
       visited[k]=1;q.append((nx,ny))
   if pts:groups.append((pts,(lowx,lowy,highx+1,highy+1)))
 groups.sort(key=lambda a:len(a[0]),reverse=True)
 print("ATTACK SEAM",previous+1,"->",following+1,"candidates",[(len(p),b) for p,b in groups[:8]])
 assert groups,f"No fist fragment in receiver frame {following+1}"
 points,bbox=groups[0]
 assert len(points)>=50,f"Too few fist pixels: {len(points)}"
 assert bbox[0]<=2 and bbox[2]<dw*.37, f"Detected fragment overlaps whole actor: {bbox}"
 mask=Image.new("L",(dw,dh),0);mp=mask.load()
 for x,y in points:mp[x,y]=255
 mask=mask.filter(ImageFilter.MaxFilter(3))
 fragment=donor.copy()
 fragment.putalpha(Image.composite(donor.getchannel('A'),Image.new('L',(dw,dh),0),mask))
 clean=donor.copy()
 clean.putalpha(Image.composite(Image.new('L',(dw,dh),0),donor.getchannel('A'),mask))
 tiles[following]=clean
 transfers[previous]=fragment
 print("FIST RECOVERED",previous+1,"from",following+1,"px",len(points),"bbox",bbox)

canvas=Image.new("RGBA",(CELL*4,CELL*2),(0,0,0,0))
qa=Image.new("RGB",(4*320,2*350),(15,22,35));qdraw=ImageDraw.Draw(qa)
for i,tile in enumerate(tiles):
 c,r=i%4,i//4
 tw,th=tile.size
 posx=(CELL-tw)//2
 originalfoot=438 if i<4 else 414
 posy=FOOT-originalfoot
 assert posx>=0 and posy>=0 and posy+th<=CELL,(i,posx,posy)
 stage=Image.new("RGBA",(CELL,CELL),(0,0,0,0))
 stage.alpha_composite(tile,(posx,posy))
 if i in transfers:
  donor=transfers[i]
  assert posx+tw+donor.width<=CELL+donor.width
  # Place the spilled original paint at its continuous source x-coordinate.
  fragment=Image.new("RGBA",(CELL,CELL),(0,0,0,0))
  frag=donor.crop((0,0,min(donor.width,CELL-(posx+tw)),donor.height))
  fragment.alpha_composite(frag,(posx+tw,posy))
  stage.alpha_composite(fragment)
  print("FIST ADDED",i+1,"offset",posx+tw,"source_seam","right")
 bbox=stage.getchannel("A").point(lambda z:255 if z>=12 else 0).getbbox()
 assert bbox,f"Empty attack frame {i+1}"
 assert bbox[0]>0 and bbox[2]<CELL and bbox[1]>0 and bbox[3]<CELL, f"Frame {i+1} clipped by rebuilt cell {bbox}"
 assert bbox[3]>=596 and bbox[3]<=603,(i,bbox)
 canvas.alpha_composite(stage,(c*CELL,r*CELL))
 thumb=stage.copy();thumb.thumbnail((315,310),Image.Resampling.LANCZOS)
 qa.paste(thumb,(c*320+(320-thumb.width)//2,r*350+3),thumb)
 qdraw.rectangle((c*320+2,r*350+2,c*320+317,r*350+318),outline=(242,67,107),width=2)
 qdraw.text((c*320+9,r*350+328),f"ATTACK {i+1} | FULL FIST | FOOT {FOOT}",fill=(221,238,254))
 print("ATTACK RESTORED",i+1,"alpha_bounds",bbox)

asset=Path("assets/enemies/redhood-intruder/attack-fullfist.webp")
asset.parent.mkdir(parents=True,exist_ok=True)
canvas.save(asset,"WEBP",quality=95,method=6,alpha_quality=100)
qa_file=Path("assets/enemies/redhood-intruder/attack-fullfist-audit.webp")
qa.save(qa_file,"WEBP",quality=83,method=6)
check=Image.open(asset)
assert check.size==(2560,1280)
print("PASS REDHOOD ATTACK RECONSTRUCTION",asset,asset.stat().st_size)
print("ATTACK FULL FIST QA",qa_file,qa_file.stat().st_size)
