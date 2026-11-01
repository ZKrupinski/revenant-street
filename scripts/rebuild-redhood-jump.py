#!/usr/bin/env python3
"""Repack the RED HOOD INTRUDER Crimson Dive, without sacrificing limbs or VFX.

The artist's original 1774x887 4x2 PNG crowded its 443/444px source cells,
and the runtime eroded/auto-cropped those cells. Preserve each of the eight
original illustrated poses at its native pixels, separate them into 576x576
safe cells, and softly continue only the RED painted energy at a hard seam.
Do not borrow Iron Mask elite or regular red-hood combat art.
"""
from pathlib import Path
from PIL import Image
import json,math
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'assets/enemies/redhood-intruder'
SRC=DIR/'special.png'
OUT=DIR/'special-fullframe.webp'
REPORT=DIR/'special-fullframe-bounds.json'
source=Image.open(SRC).convert('RGBA')
assert source.size==(1774,887), f'Unexpected original red-hood source dimensions: {source.size}'
CW=CH=576
atlas=Image.new('RGBA',(CW*4,CH*2))
stats=[]
SOURCE_FOOT=[440,443,409,436,410,418,407,417]

def extend_bitmap_crimson_edges(canvas,cell,ox,oy):
    """Reconstruct fading portions of red bitmap streaks clipped at a gridline.

    No polygon/vector art and no fake limbs. Only original sampled scarlet
    stroke pixels get a short natural alpha tail within the safe 66px padding.
    """
    src=cell.load();dst=canvas.load();w,h=cell.size
    extended=0
    for side in ('left','right'):
        x=0 if side=='left' else w-1
        for y in range(3,h-3):
            r,g,b,a=src[x,y]
            if not (a>=18 and r>=95 and r>g*1.42 and r>b*1.21):
                continue
            # Continue original edge colors with a diminishing transparent tip,
            # not the adjoining frame's unrelated glove, cloak or boot.
            for d in range(1,31):
                nx=ox-d if side=='left' else ox+w-1+d
                if nx<0 or nx>=CW:break
                k=max(0.0,(1-d/31)**1.65)
                strength=round(a*k*.77)
                if strength<3:break
                old=dst[nx,oy+y]
                if strength>old[3]:
                    dst[nx,oy+y]=(r,g,b,strength)
                    extended+=1
    return extended

for i in range(8):
    c,r=i%4,i//4
    x0=round(c*source.width/4);x1=round((c+1)*source.width/4)
    y0=round(r*source.height/2);y1=round((r+1)*source.height/2)
    piece=source.crop((x0,y0,x1,y1))
    w,h=piece.size
    pad_x=(CW-w)//2
    pad_y=(CH-h)//2
    safe=Image.new('RGBA',(CW,CH),(0,0,0,0))
    safe.paste(piece,(pad_x,pad_y))
    restored=extend_bitmap_crimson_edges(safe,piece,pad_x,pad_y)
    bbox=safe.getchannel('A').point(lambda a:255 if a>=20 else 0).getbbox()
    if bbox is None:raise RuntimeError(f'redhood special frame {i+1} is blank')
    margins=[bbox[0],bbox[1],CW-bbox[2],CH-bbox[3]]
    if min(margins)<27:raise RuntimeError(f'Frame {i+1} unsafe: {margins}')
    # Keep each existing drawn frame's own grounded foot reference.
    new_foot=pad_y+SOURCE_FOOT[i]
    if new_foot>=CH-20:raise RuntimeError(f'Invalid foot baseline on {i+1}')
    atlas.alpha_composite(safe,(c*CW,r*CH))
    stats.append({'frame':i+1,'source_size':[w,h],
                  'bbox':bbox,'margins':margins,'foot':new_foot,
                  'extended_crimson_pixels':restored})
    print('RED HOOD DIVE',i+1,'/8 safe margins',margins,'foot',new_foot,'crimson',restored,flush=True)

atlas.save(OUT,'WEBP',quality=96,method=6)
check=Image.open(OUT)
assert check.size==(2304,1152) and OUT.stat().st_size>150000
REPORT.write_text(json.dumps({'original':str(SRC.relative_to(ROOT)),
 'output':str(OUT.relative_to(ROOT)), 'cell':[CW,CH],'frames':stats},indent=2))
print('PASS: Eight complete packed red-hood Crimson Dive cells, original resolution preserved',OUT.stat().st_size,flush=True)
