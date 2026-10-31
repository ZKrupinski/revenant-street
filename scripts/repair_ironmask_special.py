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
# Always use the ORIGINAL artist-painted special effects; using an already
# repaired sheet would progressively erase the vivid red sweep on every build.
original=DIR/'source'/'special-original.webp'
if not original.is_file():
    raise FileNotFoundError('Original Iron Mask special effect sheet is required: '+str(original))
original_image=Image.open(original).convert('RGBA')
if original_image.size!=(W*4,H*2):
    raise RuntimeError('Unexpected original special atlas dimensions')
# Source frame 4 has the most complete crimson sweep. Remove the chopped
# character silhouette and keep only the saturated red painted energy.
original_arc=original_image.crop((3*W,0,4*W,H))
effect=Image.new('RGBA',(W,H))
pix=[]
for rr,gg,bb,aa in original_arc.getdata():
    vivid=(rr>115 and rr>gg*1.45 and rr>bb*1.24)
    if aa>16 and vivid:
        power=min(1.0,max(0.0,(rr-gg)/65))
        pix.append((rr,gg,bb,round(aa*power)))
    else:
        pix.append((0,0,0,0))
effect.putdata(pix)
effect.putalpha(effect.getchannel('A').filter(ImageFilter.GaussianBlur(.8)))
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
        # Original BITMAP crimson arc, re-scaled inside each 512x608 cell:
        # never rely on image data protruding into a neighbor's cell.
        # Each impact stage has its own frame size, energy opacity and placement.
        effect_scales={2:.60,3:.73,4:.87,5:.81,6:.63}
        scale_fx=effect_scales.get(i,.65)
        spark=effect.resize((round(W*scale_fx),round(H*scale_fx)),Image.Resampling.LANCZOS)
        spark_alpha=spark.getchannel('A').point(lambda v:round(v*flash))
        spark.putalpha(spark_alpha)
        # Place the original uppercut arc ABOVE the fighter's fist, behind the body.
        spark_x=round((W-spark.width)/2+14)
        spark_y=round((H-spark.height)/2-56)
        eback=Image.new('RGBA',(W,H))
        eback.paste(spark,(spark_x,spark_y))
        stage=Image.alpha_composite(stage,eback)
    stage=Image.alpha_composite(stage,backing)
    atlas.alpha_composite(stage,((i%4)*W,(i//4)*H))
    # Verify no missing frame or hidden, partially cropped fighter.
    ink=stage.getchannel('A').point(lambda a:255 if a>=28 else 0)
    bbox=ink.getbbox()
    if not bbox:raise RuntimeError(f'Special frame {i+1} is empty')
    if bbox[0]<4 or bbox[1]<5 or bbox[2]>W-4 or bbox[3]>H-6:
        raise RuntimeError(f'Special frame {i+1} spills outside the safe rectangle: {bbox}')
    print(f'SPECIAL FRAME {i+1}/8: complete, safe bounds {bbox}',flush=True)
# Source dimensions and foot anchor are identical to the JavaScript loader.
out=DIR/'special.webp'
atlas.save(out,format='WEBP',quality=97,method=6)
print('Iron Mask: 8 complete frames,',out.stat().st_size,'bytes')
