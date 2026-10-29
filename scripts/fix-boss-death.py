#!/usr/bin/env python3
"""Repair eight death frames of boss hunter using alpha-pixel floor anchors.

Previous 4x2 atlas put prone frames substantially above the floor and had
inconsistent cell offsets. Every *original* bitmap frame is extracted
without stretch, centered by visible silhouette, and grounded with alpha
ymax=cell_h-12. Do not affect other animations or boss design.
"""
from pathlib import Path
from PIL import Image
import numpy as np
P=Path(__file__).resolve().parents[1]/'assets'/'boss-hunter'/'death.webp'
CW,CH=512,544
src=Image.open(P).convert('RGBA')
assert src.size==(2048,1088),src.size
fixed=Image.new('RGBA',src.size,(0,0,0,0))
def bbox_of(im):
 a=np.asarray(im.getchannel('A'))
 yy,xx=np.nonzero(a>55)
 if not len(xx):raise RuntimeError('Blank boss death frame')
 return int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
for i in range(8):
 cell=src.crop(((i%4)*CW,(i//4)*CH,(i%4+1)*CW,(i//4+1)*CH))
 bounds=bbox_of(cell)
 actor=cell.crop(bounds)
 center=(CW-actor.width)//2
 target_y=CH-12-actor.height
 assert target_y>=0,(i,bounds,actor.size)
 fixed.alpha_composite(actor,((i%4)*CW+center,(i//4)*CH+target_y))
 frame=fixed.crop(((i%4)*CW,(i//4)*CH,(i%4+1)*CW,(i//4+1)*CH))
 repaired=bbox_of(frame)
 assert CH-repaired[3]==12,(i,repaired)
 assert repaired[0]>0 and repaired[2]<CW,(i,repaired)
 print('death',i+1,'shiftY',target_y-bounds[1],'floorGap',CH-repaired[3],'bbox',repaired)
fixed.save(P,format='WEBP',quality=97,method=6,exact=True)
print('PASS: 8 original death frames at uniform ground baseline')
