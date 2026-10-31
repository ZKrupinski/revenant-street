#!/usr/bin/env python3
"""Visual and alpha-bound audit of the original 4x2 redhood attack sprites."""
from pathlib import Path
from PIL import Image, ImageDraw
src=Image.open("assets/enemies/redhood-intruder/attack.png").convert("RGBA")
w,h=src.size
print("ATTACK SOURCE",w,h)
out=Image.new("RGB",(4*320,2*355),(14,22,37))
d=ImageDraw.Draw(out)
for n in range(8):
  c,r=n%4,n//4
  x0,x1=round(c*w/4),round((c+1)*w/4)
  y0,y1=round(r*h/2),round((r+1)*h/2)
  cell=src.crop((x0,y0,x1,y1))
  a=cell.getchannel("A").point(lambda z:255 if z>=12 else 0)
  bbox=a.getbbox()
  cw,ch=cell.size
  edges={}
  for edge,pixels in {"left":[a.getpixel((0,y)) for y in range(ch)],
                       "right":[a.getpixel((cw-1,y)) for y in range(ch)],
                       "top":[a.getpixel((x,0)) for x in range(cw)],
                       "bottom":[a.getpixel((x,ch-1)) for x in range(cw)]}.items():
      edges[edge]=sum(p>0 for p in pixels)
  print(f"ATTACK_FRAME {n+1}: cell={cw}x{ch}, bbox={bbox}, edgeContacts={edges}")
  tile=cell.copy();tile.thumbnail((305,308),Image.Resampling.LANCZOS)
  px=c*320+(320-tile.width)//2;py=r*355+4
  out.paste(tile,(px,py),tile)
  d.rectangle((c*320+2,r*355+2,c*320+318,r*355+318),outline=(247,66,100),width=2)
  d.text((c*320+8,r*355+325),f"ATTACK {n+1} | {bbox}",fill=(230,239,252))
dest=Path("assets/enemies/redhood-intruder/attack-raw-audit.webp")
out.save(dest,"WEBP",quality=83,method=6)
print("ATTACK_AUDIT_FILE",str(dest),dest.stat().st_size)
