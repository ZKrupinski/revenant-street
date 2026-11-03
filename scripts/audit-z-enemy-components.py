#!/usr/bin/env python3
"""Inspect separated alpha islands in enemy/boss original 4x2 source cells.
Read-only, designed to distinguish detached-fist glitches from legitimate VFX.
"""
from pathlib import Path
from PIL import Image
import cv2, numpy as np

ROOT=Path(__file__).resolve().parents[1]
sources=[
 'assets/enemies/redhood-intruder/attack-fullfist.webp',
 'assets/enemies/redhood-intruder/death-fullbody.webp',
 'assets/enemies/redhood-intruder/special-fullframe.webp',
 'assets/ironmask-elite/attack.webp',
 'assets/ironmask-elite/death.webp',
 'assets/ironmask-elite/special.webp',
 'assets/boss-hunter/slam.webp',
 'assets/boss-hunter/death.webp',
 'assets/riot-shield/attack.webp',
 'assets/assassin-b/attack.webp',
]
for src in sources:
 im=np.asarray(Image.open(ROOT/src).convert('RGBA'))
 h,w=im.shape[:2];print('\nSHEET',src,w,h,flush=True)
 for i in range(8):
  c,r=i%4,i//4;x0=(c*w+2)//4;x1=((c+1)*w+2)//4
  y0=(r*h+1)//2;y1=((r+1)*h+1)//2
  alpha=im[y0:y1,x0:x1,3]
  # Thin dark fringe should not produce separate chunks.
  visible=(alpha>=80).astype('uint8')
  n,labels,stats,centroids=cv2.connectedComponentsWithStats(visible,8)
  pieces=sorted(((int(stats[j,cv2.CC_STAT_AREA]),
    int(stats[j,cv2.CC_STAT_LEFT]),int(stats[j,cv2.CC_STAT_TOP]),
    int(stats[j,cv2.CC_STAT_WIDTH]),int(stats[j,cv2.CC_STAT_HEIGHT]))
    for j in range(1,n) if int(stats[j,cv2.CC_STAT_AREA])>=25),
    reverse=True)
  print('  pose',i+1,'major:',pieces[:7],flush=True)
