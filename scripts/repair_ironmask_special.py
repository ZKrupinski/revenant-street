#!/usr/bin/env python3
"""Reconstruct the *new hooded* Iron Mask special from its actual original art.

The source artist's eight poses are in special-original.webp at 4x2 / 512x608.
Four shots spill over the generated cell borders, so pasting the old crops
directly into the game loses body parts. Keep the intact original poses;
rebuild the two unsafe action extremes with complete original hooded punch
poses and original charge/slash bitmap VFX. No blank or repeated atlas cells.
"""
from pathlib import Path
from PIL import Image,ImageFilter,ImageChops
from collections import deque
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'assets/ironmask-elite'
W,H,FOOT=512,608,557
def frames(name):
    im=Image.open(DIR/name).convert('RGBA')
    assert im.size==(W*4,H*2), (name,im.size)
    return [im.crop(((i%4)*W,(i//4)*H,(i%4+1)*W,(i//4+1)*H)) for i in range(8)]
special=frames('source/special-original.webp')
charge=frames('charge.webp')
attack=frames('attack.webp')
run=frames('run.webp')
def subject(img):
    """Remove tiny disconnected fragments spilled across atlas gridlines."""
    # Existing generated cells contain partial neighbors along their borders.
    mask=img.getchannel('A').point(lambda a:255 if a>=22 else 0).filter(ImageFilter.MaxFilter(3))
    px=mask.load(); seen=bytearray(W*H);best=[]
    for y in range(H):
        for x in range(W):
            j=y*W+x
            if seen[j] or not px[x,y]:continue
            queue=deque([j]); seen[j]=1;component=[]
            while queue:
                u=queue.popleft();component.append(u);uy,ux=divmod(u,W)
                for nx,ny in ((ux-1,uy),(ux+1,uy),(ux,uy-1),(ux,uy+1)):
                    if 0<=nx<W and 0<=ny<H:
                        k=ny*W+nx
                        if not seen[k] and px[nx,ny]:
                            seen[k]=1;queue.append(k)
            if len(component)>len(best):best=component
    if not best:return img
    connected=Image.new('L',(W,H));p=connected.load()
    for u in best:
        y,x=divmod(u,W);p[x,y]=255
    connected=connected.filter(ImageFilter.MaxFilter(5))
    out=img.copy()
    out.putalpha(ImageChops.multiply(img.getchannel('A'),connected))
    return out

def stage_pose(img,shift_x=0,shift_y=0,max_width=452,max_height=525):
    # Per-frame alpha trim followed by fixed ground alignment; no clipping,
    # no arbitrary canvas scaling of the body's anatomy.
    bb=img.getchannel('A').point(lambda a:255 if a>=22 else 0).getbbox()
    if not bb:raise RuntimeError('blank pose in input source')
    crop=img.crop(bb)
    factor=min(1.0,max_width/crop.width,max_height/crop.height)
    if factor<1:
        crop=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(W,H))
    x=max(8,min(W-crop.width-8,(W-crop.width)//2+shift_x))
    y=max(8,min(H-crop.height-8,FOOT-crop.height+shift_y))
    canvas.paste(crop,(x,y))
    return canvas

def painted_energy(img,opacity=1.0):
    # Isolate the existing *painted* crimson energy, not character silhouette.
    filtered=Image.new('RGBA',img.size)
    data=[]
    for rr,gg,bb,aa in img.getdata():
        vivid=rr>110 and rr>gg*1.48 and rr>bb*1.24
        alpha=round(aa*opacity*min(1,(rr-gg)/65)) if vivid else 0
        data.append((rr,gg,bb,alpha))
    filtered.putdata(data)
    return filtered
def add_energy(stage,source,opacity=1.0,shift_x=25,shift_y=-48,max_width=390):
    bitmap=painted_energy(source,opacity)
    bb=bitmap.getchannel('A').point(lambda a:255 if a>=10 else 0).getbbox()
    if not bb:return stage
    crop=bitmap.crop(bb)
    factor=min(1.0,max_width/crop.width,470/crop.height)
    if factor<1:crop=crop.resize((max(1,round(crop.width*factor)),max(1,round(crop.height*factor))),Image.Resampling.LANCZOS)
    fx=Image.new('RGBA',(W,H))
    x=max(8,min(W-crop.width-8,(W-crop.width)//2+shift_x))
    y=max(8,min(H-crop.height-8,(H-crop.height)//2+shift_y))
    fx.paste(crop,(x,y))
    return Image.alpha_composite(fx,stage)
# Preserve the new character's original one-shot storyboard, not a duplicate
# of the regular locomotion strip. Original 4 & 5 were already cut by the
# artwork generator; those two must be rebuilt from the SAME hooded character.
storyboard=[
    ('original',0),  # ready
    ('original',1),  # crouched start
    ('original',2),  # accelerating with cape
    ('original',3),  # long red diving strike
    ('rebuild',4),   # full-body impact
    ('rebuild',5),   # extended fist follow-through
    ('original',6),  # slide recovery with scarlet trail
    ('original',7)   # return to guard
]
out=Image.new('RGBA',(4*W,2*H))
for i,(kind,index) in enumerate(storyboard):
    if kind=='original':
        stage=stage_pose(subject(special[index]),shift_x=6 if i in (2,3) else 0)
    elif i==4:
        body=stage_pose(subject(attack[4]),shift_x=20)
        stage=add_energy(body,charge[7],.96,35,-65)
        stage=add_energy(stage,special[3],.72,30,-52)
    else:
        body=stage_pose(subject(attack[5]),shift_x=15)
        stage=add_energy(body,charge[6],.92,36,-54)
        stage=add_energy(stage,special[3],.80,32,-42)
    # Keep every frame safely within its cell so the *next* pose is untouched.
    bounds=stage.getchannel('A').point(lambda a:255 if a>=24 else 0).getbbox()
    if not bounds or bounds[0]<5 or bounds[1]<5 or bounds[2]>W-5 or bounds[3]>H-5:
        raise RuntimeError(f'Frame {i+1} unsafe or empty: {bounds}')
    out.alpha_composite(stage,((i%4)*W,(i//4)*H))
    print(f'REBUILT HOODED IRON MASK {i+1}/8: {bounds}',flush=True)
dest=DIR/'special.webp'
out.save(dest,'WEBP',quality=98,method=6)
assert dest.stat().st_size>150000,('Suspiciously empty animation',dest.stat().st_size)
print('PASS: exact eight poses, no unused sprite cells',dest.stat().st_size)
