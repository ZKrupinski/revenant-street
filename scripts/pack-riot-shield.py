#!/usr/bin/env python3
"""Normalize Higgsfield riot-shield sprites without independent XY stretching.

The 7 actions share one global bitmap scale, 4-by-2 grid, transparent background
and a fixed world-space foot anchor. This prevents shield deformation and size
jumps. Original 2K source atlases remain preserved in assets/riot-shield/source/.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label

ROOT=Path(__file__).resolve().parents[1]/"assets"/"riot-shield"
NAMES=("idle","walk","run","block","attack","hit","fall")
CW,CH=320,354
def isolate(name):
    picture=Image.open(ROOT/"source"/(name+".png")).convert("RGBA")
    W,H=picture.size
    assert W>=1800 and H>=1000 and W%4==0 and H%2==0,(name,picture.size)
    tw,th=W//4,H//2
    sprites=[]
    for i in range(8):
        ix,iy=i%4,i//4
        tile=np.array(picture.crop((ix*tw+2,iy*th+2,(ix+1)*tw-2,(iy+1)*th-2)),dtype=np.uint8)
        rgb=tile[:,:,:3].astype(np.int16)
        r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
        # Green screen only; black armor and gray/olive materials remain opaque.
        chroma=(g>102)&(g-r>21)&(g-b>21)&(g>r*1.16)&(g>b*1.14)
        tile[chroma,3]=0
        weak=(g>84)&(g-r>13)&(g-b>12)&(~chroma)
        tile[weak,1]=np.minimum(tile[weak,1],np.maximum(tile[weak,0],tile[weak,2])+5)
        # Remove tiny green anti-alias specks; preserve shield/baton fragments
        # regardless of whether the model has separated them by an outline.
        fg=tile[:,:,3]>75
        groups,n=label(fg,np.ones((3,3),dtype=np.uint8))
        if n>0:
            counts=np.bincount(groups.reshape(-1))
            counts[0]=0
            significant=np.flatnonzero(counts>=max(60,int(counts.max()*.0008)))
            keep=np.isin(groups,significant)
            tile[~keep,3]=0
        yy,xx=np.where(tile[:,:,3]>100)
        assert len(xx)>4500,(name,i,"frame is blank")
        box=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
        # Some AI frames include an extra isolated weapon blob; keep all 
        # significant fragments, but never use pixels from neighboring cells.
        sprite=Image.fromarray(tile,"RGBA").crop(box)
        sprites.append(sprite)
    return sprites

groups={name:isolate(name) for name in NAMES}
maxW=max(im.width for frames in groups.values() for im in frames)
maxH=max(im.height for frames in groups.values() for im in frames)
scale=min((CW-22)/maxW,(CH-24)/maxH)
assert .20<scale<1,(scale,maxW,maxH)
for name,frames in groups.items():
    out=Image.new("RGBA",(CW*4,CH*2),(0,0,0,0))
    for i,im in enumerate(frames):
        w,h=max(1,round(im.width*scale)),max(1,round(im.height*scale))
        resized=im.resize((w,h),Image.Resampling.LANCZOS)
        x=round((CW-w)/2)
        y=CH-h-12
        out.alpha_composite(resized,((i%4)*CW+x,(i//4)*CH+y))
    p=ROOT/(name+".webp")
    out.save(p,"WEBP",quality=93,method=6,exact=True)
    assert p.stat().st_size>40000,(name,p.stat().st_size)
    print(name,"source_frames=8","output",out.size,"bytes",p.stat().st_size,"global_scale",round(scale,3))
print("done - all 56 complete bitmap sprites normalized at a single global scale")
