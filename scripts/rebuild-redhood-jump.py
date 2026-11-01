#!/usr/bin/env python3
"""Exact eight-cell repack of the NEW red-hood intruder's Crimson Dive.

The published 1774×887 4×2 original has orphaned hood, cape and effect parts
inside adjacent poses. Preserve the artist's complete transparent pixels and
reattach identified edge fragments before giving each motion its own 608px cell.
No vector art, no borrowing another enemy, no altered costume.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'assets/enemies/redhood-intruder'
SRC=DIR/'special.png'
OUT=DIR/'special-fullframe.webp'
REPORT=DIR/'special-fullframe-bounds.json'
im=Image.open(SRC).convert('RGBA')
assert im.size==(1774,887),f'Unexpected original source dimensions {im.size}'
W=H=608
SOURCE_FOOT=[440,443,409,436,410,418,407,417]
cells=[]
for i in range(8):
    col,row=i%4,i//4
    # Match the JS renderer's Math.round on positive source coordinates.
    x0=(col*im.width//4) if col%2==0 else (col*im.width*2//4+1)//2
    x1=((col+1)*im.width//4) if (col+1)%2==0 else (((col+1)*im.width*2//4+1)//2)
    y0=0 if row==0 else (im.height+1)//2
    y1=(im.height+1)//2 if row==0 else im.height
    cells.append(im.crop((x0,y0,x1,y1)))
# Explicit cross-cell ownership, verified against half-size connected
# component audit. The next frame's left-edge fragments are NOT that frame's
# hood/arm; they belong to the preceding motion. Likewise the right-edge
# splashes on frame 5 belong to the following impact frame.
# (source frame, recipient frame, rectangle, direction)
recoveries=[
 (3,2,(0,92,54,278),'previous'),  # frame 4 contained frame 3's hood/fist
 (6,5,(0,316,48,416),'previous'), # frame 7 contained frame 6's ground VFX
 (7,6,(0,314,40,398),'previous'), # frame 8 contained frame 7's dust
 (4,5,(410,254,444,410),'next'), # frame 5 held frame 6's left-side splashes
]
fragments=[]
for from_i,to_i,box,direction in recoveries:
    src=cells[from_i]
    left,top,right,bottom=box
    assert right<=src.width and bottom<=src.height
    fragment=src.crop(box)
    count=sum(1 for alpha in fragment.getchannel('A').getdata() if alpha>=24)
    if count<20:raise RuntimeError(f'Unexpectedly blank transferred fragment {from_i+1}: {count}')
    ImageDraw.Draw(src).rectangle((left,top,right-1,bottom-1),fill=(0,0,0,0))
    # Place the recovered pixels in their original neighboring source position:
    # right after the prior cell, or just before the next cell.
    relative_x=(cells[to_i].width+left) if direction=='previous' else (left-src.width)
    fragments.append((to_i,fragment,relative_x,top,from_i,count))
    print(f'REATTACH source {from_i+1} -> frame {to_i+1}: {count} artist pixels',flush=True)
output=Image.new('RGBA',(W*4,H*2))
stats=[]
for i,cell in enumerate(cells):
    stage=Image.new('RGBA',(W,H))
    pad_x=(W-cell.width)//2
    pad_y=(H-cell.height)//2
    stage.alpha_composite(cell,(pad_x,pad_y))
    restored=0
    for to_i,fragment,source_x,source_y,from_i,pixel_count in fragments:
        if to_i!=i:continue
        # x and y measured in the target's original cell coordinates.
        px=pad_x+source_x
        py=pad_y+source_y
        if px<10 or py<10 or px+fragment.width>W-10 or py+fragment.height>H-10:
            raise RuntimeError(f'Reattached fragment cannot fit frame {i+1}')
        stage.alpha_composite(fragment,(px,py))
        restored+=pixel_count
    # The trim is non-destructive: preserve all originally painted contours.
    box=stage.getchannel('A').point(lambda a:255 if a>=22 else 0).getbbox()
    if not box:raise RuntimeError(f'Empty red-hood motion frame {i+1}')
    margins=[box[0],box[1],W-box[2],H-box[3]]
    if min(margins)<18:raise RuntimeError(f'Unsafe red-hood motion frame {i+1}: {margins}')
    foot=pad_y+SOURCE_FOOT[i]
    if not 0<foot<H-20:raise RuntimeError(f'Bad foot anchor {i+1}: {foot}')
    output.alpha_composite(stage,((i%4)*W,(i//4)*H))
    stats.append({'frame':i+1,'bbox':box,'margins':margins,
       'foot':foot,'recovered_neighbor_pixels':restored})
    print('RED-HOOD SPECIAL',i+1,'/8','bbox',box,'margins',margins,'anchor',foot,flush=True)
output.save(OUT,'WEBP',quality=95,method=6)
assert Image.open(OUT).size==(4*W,2*H) and OUT.stat().st_size>180000
REPORT.write_text(json.dumps({'source':str(SRC.relative_to(ROOT)),
 'output':str(OUT.relative_to(ROOT)),'cell':[W,H], 'frames':stats},indent=2))
print('PASS: 8 unique real Crimson Dive poses, corrected neighbor-sprite ownership',OUT.stat().st_size,flush=True)
