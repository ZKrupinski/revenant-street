#!/usr/bin/env python3
"""Repair the Iron Mask special 8-frame bitmap sheet without clipped attack poses.

The original special atlas contains baked-in vertical crop boundaries in source
frames 4–6. Reconstruct those stages from complete painted attack poses rather
than trying to expand a source image whose pixels are already missing.
All eight frames are re-aligned to the same ground anchor (557px).
"""
from pathlib import Path
from PIL import Image
import math

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"assets/ironmask-elite/special.webp"
DEST=SOURCE
CELL_W,CELL_H,FOOT=512,608,557
atlas=Image.open(SOURCE).convert("RGBA")
assert atlas.size==(CELL_W*4,CELL_H*2), f"Unexpected Iron Mask source sheet size: {atlas.size}"
frames=[atlas.crop(((i%4)*CELL_W,(i//4)*CELL_H,(i%4+1)*CELL_W,(i//4+1)*CELL_H)) for i in range(8)]

def isolate_main_pose(im):
    """Retain the largest connected painted subject; omit orphaned cropped arcs."""
    from collections import deque
    from PIL import ImageFilter
    alpha=im.getchannel("A")
    # Lightly connect anti-aliased adjoining edges, leaving separated crop debris.
    mask=alpha.point(lambda v: 255 if v>=24 else 0).filter(ImageFilter.MaxFilter(3))
    w,h=mask.size
    pix=mask.load()
    visited=bytearray(w*h)
    best=[]
    for yy in range(h):
        for xx in range(w):
            k=yy*w+xx
            if not pix[xx,yy] or visited[k]: continue
            q=deque([k]);visited[k]=1;component=[]
            while q:
                p=q.popleft();component.append(p)
                y,x=divmod(p,w)
                for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if nx<0 or nx>=w or ny<0 or ny>=h:continue
                    nk=ny*w+nx
                    if not visited[nk] and pix[nx,ny]:
                        visited[nk]=1;q.append(nk)
            if len(component)>len(best):best=component
    # If all fragments touch, the safest result is still the original bitmap.
    if not best:return im
    keep=Image.new("L",(w,h))
    px=keep.load()
    for p in best:
        y,x=divmod(p,w);px[x,y]=255
    keep=keep.filter(ImageFilter.MaxFilter(5))
    out=im.copy()
    original_alpha=im.getchannel("A")
    from PIL import ImageChops
    out.putalpha(ImageChops.multiply(original_alpha,keep))
    return out

# Source poses 4,5,6 were cut at the source before packing; do not replay them.
# 0-3 are retained where safe, while 4-6 form follow-through motion from intact art.
timeline=[
    (0,0.99,-1,0,0),     # guard into special
    (1,0.99,-5,0,0),     # crouched forward
    (2,0.98,0,0,0),      # explosive initial rush
    (3,0.94,0,0,0),      # first complete red arc
    (3,1.01,8,-2,-2),    # stronger active hit
    (3,0.98,20,0,3),     # follow-through, still a full painted pose
    (0,0.98,17,0,0),     # recovery rather than source-cut frame 6
    (7,1.00,0,0,0),      # complete recovery pose
]
fixed=Image.new("RGBA",atlas.size,(0,0,0,0))
for i,(source_idx,scale,shift_x,shift_y,angle) in enumerate(timeline):
    src=frames[source_idx]
    if source_idx in (0,1,2):
        src=isolate_main_pose(src)
    scaled=src.resize((round(CELL_W*scale),round(CELL_H*scale)),Image.Resampling.LANCZOS)
    if angle:
        # Rotate with transparent expansion; preserve the original target ground plane.
        scaled=scaled.rotate(angle,Image.Resampling.BICUBIC,expand=True)
    cell=Image.new("RGBA",(CELL_W,CELL_H),(0,0,0,0))
    x=round((CELL_W-scaled.width)/2+shift_x)
    y=round(FOOT*(1-scale)+shift_y)
    cell.paste(scaled,(x,y),scaled)
    fixed.alpha_composite(cell,((i%4)*CELL_W,(i//4)*CELL_H))
# WebP with alpha, preserving 4x2/512x608 and the old loader's exact geometry.
fixed.save(DEST,"WEBP",quality=97,method=6)
print("Repaired eight Iron Mask attack frames:",DEST,DEST.stat().st_size,"bytes")
