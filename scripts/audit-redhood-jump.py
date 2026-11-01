#!/usr/bin/env python3
"""Diagnostic previews for the *red hood intruder*, not Iron Mask elite."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'assets/enemies'
specs=[('entry',DIR/'redhood-ambush-entry-8.webp'),('crimson-dive',DIR/'redhood-intruder/special.png')]
def report(name,source):
 im=Image.open(source).convert('RGBA');w,h=im.size
 print(name,'canvas',im.size,flush=True)
 out=Image.new('RGBA',(w,h),(0,0,0,0))
 report=[]
 for i in range(8):
  x0=round(i%4*w/4);y0=round(i//4*h/2)
  x1=round((i%4+1)*w/4);y1=round((i//4+1)*h/2)
  piece=im.crop((x0,y0,x1,y1))
  bb=piece.getchannel('A').point(lambda a:255 if a>=24 else 0).getbbox()
  edge=None
  if bb:
   edge={'L':bb[0],'T':bb[1],'R':piece.width-bb[2],'B':piece.height-bb[3]}
  print(name,'frame',i+1,'bbox',bb,'margins',edge,flush=True)
  # Identify disconnected pieces that might belong to the PREVIOUS pose.
  # Half-scale 8-connected components are enough to detect a stray hood/fist.
  reduced=piece.getchannel('A').resize((max(1,piece.width//2),max(1,piece.height//2)),Image.Resampling.NEAREST)
  pw,ph=reduced.size;pix=reduced.load();seen=bytearray(pw*ph);groups=[]
  for yy in range(ph):
   for xx in range(pw):
    pos=yy*pw+xx
    if seen[pos] or pix[xx,yy]<36:continue
    stack=[pos];seen[pos]=1;area=0;minx=pw;maxx=0;miny=ph;maxy=0
    while stack:
     p=stack.pop();cy,cx=divmod(p,pw)
     area+=1;minx=min(minx,cx);maxx=max(maxx,cx);miny=min(miny,cy);maxy=max(maxy,cy)
     for nx,ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1),
                   (cx-1,cy-1),(cx+1,cy-1),(cx-1,cy+1),(cx+1,cy+1)):
      if 0<=nx<pw and 0<=ny<ph:
       k=ny*pw+nx
       if not seen[k] and pix[nx,ny]>=36:
        seen[k]=1;stack.append(k)
    if area>=12:groups.append({'area':area*4,'box':[minx*2,miny*2,(maxx+1)*2,(maxy+1)*2]})
  groups.sort(key=lambda g:-g['area'])
  print(name,'components',i+1,groups[:8],flush=True)
  report.append({'frame':i+1,'bbox':bb,'margins':edge,'components':groups[:12]})
 # Downsize long atlases to 1536x768, preserving layout, for visual review.
 im.thumbnail((1536,768),Image.Resampling.LANCZOS)
 dest=DIR/('redhood-entry-audit.webp' if name=='entry' else 'redhood-intruder/special-jump-audit.webp')
 im.save(dest,'WEBP',quality=86,method=4)
 (DIR/('redhood-entry-diagnostic.json' if name=='entry' else 'redhood-intruder/special-jump-diagnostic.json')).write_text(
  json.dumps({'source':str(source.relative_to(ROOT)),'size':[w,h],'frames':report},indent=2))
 print('AUDIT OUTPUT',dest,flush=True)
for name,source in specs:report(name,source)
