#!/usr/bin/env python3
"""Audit and preview Project Z original protagonist idle hair/head per sprite frame."""
from pathlib import Path
from PIL import Image,ImageDraw
source=Path("assets/project-z-hero/idle-source.png")
im=Image.open(source).convert("RGBA")
w,h=im.size
print(f"Z IDLE SOURCE {w}x{h} MODE {im.mode}")
out=Image.new("RGB",(4*310,2*350),(12,19,32))
d=ImageDraw.Draw(out)
for n in range(8):
 c,r=n%4,n//4
 x0,x1=round(c*w/4),round((c+1)*w/4)
 y0,y1=round(r*h/2),round((r+1)*h/2)
 frame=im.crop((x0,y0,x1,y1))
 cw,ch=frame.size
 # Detect non-green hair and all non-background details along top edge.
 pixels=frame.load()
 top_dark=0;top_green=0
 for y in range(min(26,ch)):
  for x in range(cw):
   rr,gg,bb,aa=pixels[x,y]
   if aa<=8:continue
   green=gg>70 and gg>rr*1.10 and gg>bb*1.08 and gg-rr>17
   if green:top_green+=1
   elif max(rr,gg,bb)<225:top_dark+=1
 # Print source-pixel coverage near cell head/tile boundaries.
 print(f"IDLE FRAME {n+1}: cell={cw}x{ch}, top_26_non_green={top_dark}, top_26_green={top_green}")
 frame.thumbnail((300,308),Image.Resampling.LANCZOS)
 px=c*310+(310-frame.width)//2;py=r*350+3
 out.paste(frame,(px,py),frame)
 d.rectangle((c*310+2,r*350+2,c*310+307,r*350+314),outline=(242,47,115),width=2)
 d.text((c*310+9,r*350+326),f"ORIGINAL IDLE {n+1}",fill=(232,241,253))
qa=Path("assets/project-z-hero/idle-source-audit.webp")
qa.parent.mkdir(parents=True,exist_ok=True)
out.save(qa,"WEBP",quality=86,method=6)
print(f"IDLE_SOURCE_AUDIT {qa} {qa.stat().st_size} bytes")
