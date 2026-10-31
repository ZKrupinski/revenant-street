#!/usr/bin/env python3
"""Reassemble original Redhood death frames across the improperly cut 4x2 row seam.
Input is hand-painted original death.png. Do not synthesize or change anatomy.
Output 4x2 non-destructive 576px-celled WebP with 8 recovered complete bodies.
"""
from PIL import Image, ImageDraw
from pathlib import Path

src=Image.open("assets/enemies/redhood-intruder/death.png").convert("RGBA")
w,h=src.size
assert w==1774 and h==887,(w,h)
cell=576;foot=536
out=Image.new('RGBA',(4*cell,2*cell),(0,0,0,0))
preview=Image.new('RGB',(4*300,2*320),(15,23,35))
draw=ImageDraw.Draw(preview)
splits=[]
for c in range(4):
  x0,x1=round(c*w/4),round((c+1)*w/4)
  below=src.crop((x0,round(h/2),x1,h)).getchannel('A')
  occupancy=[]
  for y in range(10,235):
    row=below.crop((0,y,below.width,y+1)).point(lambda a:255 if a>=14 else 0)
    occupancy.append(bool(row.getbbox()))
  empty=[]
  start=None
  for j,nonblank in enumerate(occupancy):
    y=j+10
    if not nonblank and start is None:start=y
    elif nonblank and start is not None:empty.append((start,y));start=None
  if start is not None:empty.append((start,235))
  # Find the quietest stripe between the dangling boots and the body below.
  options=[(hi-lo,lo,hi) for lo,hi in empty if lo>=20 and hi<=235]
  assert options,f"no seam gap in column {c}: {empty}"
  length,lo,hi=max(options)
  assert length>=12,f"not enough alpha-free pixels to separate death row {c}: {empty}"
  split=(lo+hi)//2
  splits.append(split)
  print(f"DEATH SEAM COLUMN {c+1}: transparent gap=({lo},{hi}) pixels={length}; split={split}")
  for rowno in range(2):
    n=rowno*4+c
    if rowno==0:raw=src.crop((x0,0,x1,round(h/2)+split))
    else:raw=src.crop((x0,round(h/2)+split,x1,h))
    alpha=raw.getchannel('A')
    box=alpha.point(lambda a:255 if a>=10 else 0).getbbox()
    assert box and box[3]-box[1]<foot and box[2]-box[0]<cell,(n,box)
    piece=raw.crop(box)
    dstx=(cell-(x1-x0))//2+box[0]
    dsty=foot-(piece.height-1)
    assert dsty>=0 and dstx>=0 and dstx+piece.width<=cell,(n,dstx,dsty,box)
    out.alpha_composite(piece,(c*cell+dstx,rowno*cell+dsty))
    print(f"DEATH RESTORED {n+1}: source={box}, destination=({dstx},{dsty}), foot_y={foot}, size={piece.size}")
    thumb=piece.copy();thumb.thumbnail((286,284),Image.Resampling.LANCZOS)
    px=c*300+(300-thumb.width)//2
    py=rowno*320+(290-thumb.height)//2
    preview.paste(thumb,(px,py),thumb)
    draw.rectangle((c*300+2,rowno*320+2,c*300+297,rowno*320+290),outline=(218,56,94),width=2)
    draw.text((c*300+8,rowno*320+299),f'DEATH {n+1} repaired / foot 536',fill=(229,238,250))
assert len(splits)==4
dest=Path("assets/enemies/redhood-intruder/death-fullbody.webp")
dest.parent.mkdir(parents=True,exist_ok=True)
out.save(dest,"WEBP",quality=93,method=6,alpha_quality=100)
qa=Path("assets/enemies/redhood-intruder/death-fullbody-audit.webp")
preview.save(qa,"WEBP",quality=82,method=6)
back=Image.open(dest)
assert back.size==(2304,1152),back.size
for n in range(8):
  c=n%4;r=n//4
  im=back.crop((c*cell,r*cell,(c+1)*cell,(r+1)*cell))
  bbox=im.getchannel('A').point(lambda a:255 if a>=10 else 0).getbbox()
  assert bbox and bbox[3] in (536,537,538),f"death frame {n} foot anchor invalid: {bbox}"
print(f"PASS REDHOOD DEATH 8 COMPLETE SOURCE-REPAIRED FRAMES, splits={splits}")
print(f"FINAL DEATH ASSET {dest} {dest.stat().st_size} bytes")
print(f"QA CONTACT {qa} {qa.stat().st_size} bytes")
