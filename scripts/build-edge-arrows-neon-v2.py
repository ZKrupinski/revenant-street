#!/usr/bin/env python3
"""PROJECT Z: export hand-tuned 4x2 transparent bitmap animation for edge indicators.
Top 4 cells = RIGHT, bottom 4 cells = LEFT.
Metallic twin-chevron silhouette is fixed; only inner fire, glow, and sparks flicker.
Output: assets/ui/edge-arrows-neon-v2.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math
import random

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/ui/edge-arrows-neon-v2.png'
FRAME_W,FRAME_H=192,128
S=3
AMPLITUDES=(0.42,0.78,1.0,0.61)
RNG=random.Random(11577)

def blink_frame(k):
    w,h=FRAME_W*S, FRAME_H*S
    amp=AMPLITUDES[k]
    shadow=Image.new('RGBA',(w,h),(0,0,0,0))
    metal=Image.new('RGBA',(w,h),(0,0,0,0))
    core=Image.new('RGBA',(w,h),(0,0,0,0))
    ds=ImageDraw.Draw(shadow,'RGBA')
    dm=ImageDraw.Draw(metal,'RGBA')
    dc=ImageDraw.Draw(core,'RGBA')
    def points(seq): return [(round(x*S),round(y*S)) for x,y in seq]
    def line(draw, pts, fill, width, joint='curve'):
        draw.line(points(pts), fill=fill,width=round(width*S),joint=joint)
    # Two separate slanted plates: matching the slim double-chevron look in
    # the approved UI mock-up, without the old broad red explosion silhouette.
    for offset in (0,46):
        chevron=[(45+offset,32),(77+offset,64),(45+offset,96)]
        line(ds,chevron,(5,2,8,225),26)
        line(dm,chevron,(33,29,37,245),21)
        line(dm,chevron,(104,41,52,245),15)
        line(dm,chevron,(14,12,19,255),10)
        line(dc,chevron,(158,10,27,round(205*amp)),10)
        line(dc,chevron,(255,45,36,round(245*amp)),6)
        line(dc,[(46+offset,34),(75+offset,64),(46+offset,94)],
             (255,218,183,round(255*amp)),2.5)
        # Angular graphite bevel fragments, not flat vector-filled arrows.
        line(dm,[(43+offset,31),(78+offset,63)],(216,101,102,95),1.3)
        line(dm,[(78+offset,65),(43+offset,97)],(10,5,9,210),1.5)

    # Metallic flecks / short flame streaks dance independently in every cel.
    # All flame texture is baked into the PNG sprites; no CSS vector icon.
    for j in range(19):
        x=RNG.uniform(14,151)
        y=RNG.uniform(38,90)
        length=RNG.uniform(3,9)*(0.65+amp*0.6)
        flicker=((j*5+k*7)%11)/10
        a=round((35+130*flicker)*amp)
        color=(245,29+int(92*flicker),39,a)
        dm.line(points([(x,y),(x+length,y-RNG.uniform(-1.8,1.8))]),
                fill=color,width=max(1,round((.7+flicker)*S)))
    streaks=[(17,51,41,50),(9,65,38,65),(22,78,49,78)]
    for j,(x0,y0,x1,y1) in enumerate(streaks):
        advance=(k*9+j*3)%11
        line(dc,[(x0+advance,y0),(x1+advance,y1)],
             (255,43+20*j,28,round((88+33*j)*amp)),1.7)
    # Additional peak embers, sparse rather than a broad opaque smoke cloud.
    if k in (1,2):
        for j in range(6+4*k):
            x=RNG.uniform(25,158);y=RNG.choice([34,46,61,75,91])+RNG.uniform(-7,7)
            rr=RNG.choice([.7,1,1.5,2.0])*S
            dc.ellipse((x*S-rr,y*S-rr,x*S+rr,y*S+rr),
                       fill=(255,82,54,round(150*amp)))

    glow=core.filter(ImageFilter.GaussianBlur(8*S))
    glow.putalpha(glow.getchannel('A').point(lambda v:int(v*0.84)))
    small=core.filter(ImageFilter.GaussianBlur(2.6*S))
    out=Image.new('RGBA',(w,h))
    for layer in (shadow,glow,metal,small,core):out=Image.alpha_composite(out,layer)
    out=out.resize((FRAME_W,FRAME_H), Image.Resampling.LANCZOS)
    return out

atlas=Image.new('RGBA',(FRAME_W*4,FRAME_H*2),(0,0,0,0))
frames=[]
for idx in range(4):
    right=blink_frame(idx)
    left=right.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    atlas.alpha_composite(right,(idx*FRAME_W,0))
    atlas.alpha_composite(left,(idx*FRAME_W,FRAME_H))
    frames.append(right)
OUT.parent.mkdir(parents=True,exist_ok=True)
atlas.save(OUT,optimize=True)
assert atlas.size==(768,256)
assert atlas.getpixel((0,0))[3]==0
assert len(set(f.tobytes() for f in frames))==4
print(f'Saved {OUT}: {atlas.width}x{atlas.height}; transparent; 8 cells (4 RIGHT, 4 LEFT) @ 8fps ping-pong')
