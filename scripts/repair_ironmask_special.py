#!/usr/bin/env python3
"""Rebuild the Iron Mask 8-frame special using complete existing painted poses.

The first-generation crimson-rush atlas includes baked-in cuts to the limbs,
cloak and crimson sweep. Padding those cropped frames cannot restore pixels.
Use complete run/attack poses for the body and retain the red energy as a
separate translucent bitmap effect, without repainting the character.
"""
from pathlib import Path
from PIL import Image, ImageFilter
from collections import deque

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"assets/ironmask-elite"
W,H,FOOT=512,608,557

def sheet_frames(name):
    im=Image.open(DIR/name).convert("RGBA")
    assert im.size==(W*4,H*2), f"{name} has unexpected size {im.size}"
    return [im.crop(((i%4)*W,(i//4)*H,((i%4)+1)*W,((i//4)+1)*H)) for i in range(8)]

def isolate_subject(im):
    """Discard separated residual scraps from adjacent generated atlas cells."""
    alpha=im.getchannel('A')
    mask=alpha.point(lambda v: 255 if v>=22 else 0).filter(ImageFilter.MaxFilter(3))
    pix=mask.load();seen=bytearray(W*H);largest=[]
    for y in range(H):
        for x in range(W):
            first=y*W+x
            if seen[first] or not pix[x,y]:continue
            todo=deque([first]);seen[first]=1;group=[]
            while todo:
                pos=todo.popleft();group.append(pos);yy,xx=divmod(pos,W)
                for nx,ny in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
                    if 0<=nx<W and 0<=ny<H:
                        p=ny*W+nx
                        if not seen[p] and pix[nx,ny]:
                            seen[p]=1;todo.append(p)
            if len(group)>len(largest):largest=group
    if not largest:return im
    selection=Image.new('L',(W,H))
    ss=selection.load()
    for pos in largest:
        yy,xx=divmod(pos,W);ss[xx,yy]=255
    selection=selection.filter(ImageFilter.MaxFilter(5))
    from PIL import ImageChops
    result=im.copy()
    result.putalpha(ImageChops.multiply(alpha,selection))
    return result

run=sheet_frames('run.webp')
attack=sheet_frames('attack.webp')
old_special=sheet_frames('special.webp')
# Paint-only crimson energy, not its chopped body/legs. No vector shapes.
effect=Image.new('RGBA',(W,H))
src=old_special[3].getdata()
pixels=[]
for rr,gg,bb,aa in src:
    if aa>14 and rr>100 and rr>gg*1.42 and rr>bb*1.16:
        strength=min(255,int(aa*min(1.0,(rr-gg)/75)*.92))
        pixels.append((rr,gg,bb,strength))
    else:pixels.append((0,0,0,0))
effect.putdata(pixels)
effect.putalpha(effect.getchannel('A').filter(ImageFilter.GaussianBlur(.7)))

# Each base is a COMPLETE painted sprite, not one of the damaged strike poses.
# 8 distinct complete stages: ready, rush, leap, impact, hard punch, recovery.
timeline=[
    ('attack',0,1.00,0,0,0.00),
    ('run',0,1.00,-4,0,0.00),
    ('run',2,1.00,1,0,0.32),
    ('run',3,1.00,4,0,0.65),
    ('attack',5,.97,4,0,1.00),
    ('run',5,1.00,8,0,0.78),
    ('attack',6,1.00,0,0,0.30),
    ('attack',7,1.00,0,0,0.00)
]
atlas=Image.new('RGBA',(W*4,H*2))
for i,(which,source_idx,scale,shift_x,shift_y,flash) in enumerate(timeline):
    body=isolate_subject((run if which=='run' else attack)[source_idx])
    body=body.resize((round(W*scale),round(H*scale)),Image.Resampling.LANCZOS)
    stage=Image.new('RGBA',(W,H))
    bx=round((W-body.width)/2+shift_x)
    by=round(FOOT*(1-scale)+shift_y)
    backing=Image.new('RGBA',(W,H))
    backing.paste(body,(bx,by))  # no mask: preserve original sprite alpha
    if flash:
        # Fit the pixel-art crimson swoosh safely inside the target frame.
        spark=effect.resize((round(W*.80),round(H*.80)),Image.Resampling.LANCZOS)
        spark_alpha=spark.getchannel('A').point(lambda v:round(v*flash))
        spark.putalpha(spark_alpha)
        eback=Image.new('RGBA',(W,H))
        eback.paste(spark,(round(W*.20/2)+23,round(H*.20/2)-10))
        stage=Image.alpha_composite(stage,eback)
    stage=Image.alpha_composite(stage,backing)
    atlas.alpha_composite(stage,((i%4)*W,(i//4)*H))
# Source dimensions and foot anchor are identical to the JavaScript loader.
out=DIR/'special.webp'
atlas.save(out,format='WEBP',quality=97,method=6)
print('Iron Mask: 8 complete frames,',out.stat().st_size,'bytes')
