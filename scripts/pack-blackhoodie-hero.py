#!/usr/bin/env python3
"""Safely prepare Project Z black-hoodie protagonist 8F atlas sheets.
Input: eight 4x2 2688x1520 green screen images.
Output: eight 4x2 transparent, common-cell, aspect-locked atlases.
Never warp X/Y independently or blend adjacent frames.
"""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label
import sys
BASE=Path(__file__).resolve().parents[1]
SRC=BASE/'assets/new-hero/source'
OUT=BASE/'assets/new-hero'
NAMES=('idle','walk','run','jump','punch','kick','hit','death')
CW,CH=384,416
for name in NAMES:
 p=SRC/(name+'.png')
 im=Image.open(p).convert('RGBA')
 W,H=im.size
 assert W>=1800 and H>=900, (name,W,H)
 tiles=[];boxes=[]
 for i in range(8):
  col,row=i%4,i//4
  x0,x1=round(col*W/4),round((col+1)*W/4)
  y0,y1=round(row*H/2),round((row+1)*H/2)
  a=np.array(im.crop((x0,y0,x1,y1)))
  rgb=a[:,:,:3].astype(np.int16)
  red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
  # Chroma is saturated and constant. Do not remove dark-colored clothing.
  chroma=(green>110)&(green-red>22)&(green-blue>22)&(green>red*1.15)&(green>blue*1.14)
  a[chroma,3]=0
  # Trim slight green fringe without shrinking the figure silhouette.
  semi=(green>red+13)&(green>blue+13)&(green>75)&(~chroma)
  a[semi,1]=np.minimum(a[semi,1],np.maximum(a[semi,0],a[semi,2])+7)
  foreground=a[:,:,3]>70
  groups,n=label(foreground,np.ones((3,3),dtype=np.uint8))
  sizes=np.bincount(groups.reshape(-1));sizes[0]=0
  if len(sizes)<2 or max(sizes)<6000:raise ValueError('empty '+name+' '+str(i))
  primary=int(np.argmax(sizes))
  # One full body per tile; this removes shoe fragments crossing a row seam.
  keep=groups==primary
  a[~keep,3]=0
  yy,xx=np.where(a[:,:,3]>90)
  bounds=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
  tiles.append(Image.fromarray(a,'RGBA'));boxes.append(bounds)
 # All 8 source cells use a SINGLE uniform scale.
 maxW=max(b[2]-b[0] for b in boxes)
 maxH=max(b[3]-b[1] for b in boxes)
 scale=min((CW-38)/maxW,(CH-42)/maxH)
 out=Image.new('RGBA',(CW*4,CH*2),(0,0,0,0))
 for i,(tile,b) in enumerate(zip(tiles,boxes)):
  sprite=tile.crop(b)
  dest=(max(1,round(sprite.width*scale)),max(1,round(sprite.height*scale)))
  sprite=sprite.resize(dest,Image.Resampling.LANCZOS)
  frame=Image.new('RGBA',(CW,CH),(0,0,0,0))
  # Stable horizontal torso anchor; not a bounding-box edge of a swinging arm.
  ax=np.array(sprite.getchannel('A'))
  y0,y1=int(dest[1]*.38),int(dest[1]*.66)
  q=np.where(ax[y0:y1]>160)
  center=float(np.median(q[1])) if len(q[1]) else dest[0]/2
  px=round(CW/2-center)
  # Walk/idle/attacks/hit use grounded feet, jump/death retain original phase height.
  py=CH-17-dest[1]
  if name in ('jump','death'):
   # Original actor height changes deliberately. Keep the footfall evolution.
   py=CH-22-dest[1]
  # Constrain to cell only. No frames can spill into adjacent cells.
  frame.alpha_composite(sprite,(px,py))
  out.alpha_composite(frame,((i%4)*CW,(i//4)*CH))
 # PNG original high-res after processing; transparent background preserved.
 out.save(OUT/(name+'.png'),optimize=True)
 print(name,im.size,'=>',out.size,'scale',round(scale,3),'bytes',(OUT/(name+'.png')).stat().st_size)
