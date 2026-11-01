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
  report.append({'frame':i+1,'bbox':bb,'margins':edge})
 # Downsize long atlases to 1536x768, preserving layout, for visual review.
 im.thumbnail((1536,768),Image.Resampling.LANCZOS)
 dest=DIR/('redhood-entry-audit.webp' if name=='entry' else 'redhood-intruder/special-jump-audit.webp')
 im.save(dest,'WEBP',quality=86,method=4)
 (DIR/('redhood-entry-diagnostic.json' if name=='entry' else 'redhood-intruder/special-jump-diagnostic.json')).write_text(
  json.dumps({'source':str(source.relative_to(ROOT)),'size':[w,h],'frames':report},indent=2))
 print('AUDIT OUTPUT',dest,flush=True)
for name,source in specs:report(name,source)
