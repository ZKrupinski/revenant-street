#!/usr/bin/env python3
"""Normalize 25 Project Z painted upgrades to one 5x5 neon arcade-frame atlas.
The original picture art comes from the supplied Project Z icon sheet; this
tool does not synthesize replacement gameplay illustration or vector icons.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

N=256
SOURCE_CELLS=5
def draw_tile(image: Image.Image, index: int) -> Image.Image:
    w,h=image.size
    col,row=index%SOURCE_CELLS,index//SOURCE_CELLS
    x0=round(col*w/SOURCE_CELLS);x1=round((col+1)*w/SOURCE_CELLS)
    y0=round(row*h/SOURCE_CELLS);y1=round((row+1)*h/SOURCE_CELLS)
    # The original sheet mixes graphite and pink outer borders. Remove only
    # those outer 12% rails; preserve the original character/skill illustration.
    sub=image.crop((x0,y0,x1,y1)).convert('RGBA')
    cw,ch=sub.size
    inset=int(min(cw,ch)*.115)
    art=sub.crop((inset,inset,cw-inset,ch-inset)).convert('RGBA')
    art=art.resize((202,202),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(N,N),(0,0,0,0))
    d=ImageDraw.Draw(tile)
    d.rounded_rectangle((19,19,237,237),radius=9,fill=(2,8,20,255))
    tile.alpha_composite(art,(27,27))
    d=ImageDraw.Draw(tile,'RGBA')
    # Hard-edged steel inner chassis. Identical numbers on all 25 icons.
    d.line([(29,20),(227,20)],fill=(16,33,52,255),width=8)
    d.line([(29,235),(227,235)],fill=(10,28,50,255),width=8)
    d.line([(20,30),(20,226)],fill=(13,30,48,255),width=8)
    d.line([(235,30),(235,226)],fill=(10,29,47,255),width=8)
    for x in (26,230):
        d.line([(x,30),(x,225)],fill=(82,110,135,240),width=2)
    for y in (26,229):
        d.line([(31,y),(226,y)],fill=(122,148,166,226),width=2)
    # Four bracketed magenta neon corners, a visual match for the selected UI.
    fx=Image.new('RGBA',(N,N),(0,0,0,0))
    f=ImageDraw.Draw(fx,'RGBA')
    neon=(255,43,119,255);sky=(121,226,255,255)
    brackets=[
        [(15,55),(15,29),(29,15),(55,15)],
        [(201,15),(227,15),(241,29),(241,55)],
        [(15,201),(15,227),(29,241),(55,241)],
        [(201,241),(227,241),(241,227),(241,201)]
    ]
    for points in brackets:
        f.line(points,fill=neon,width=4,joint='curve')
    for coords in [
        (110,22,146,27),(110,229,146,234),
        (21,112,26,144),(230,112,235,144)
    ]:
        f.rounded_rectangle(coords,radius=2,fill=sky)
    # Four cyan inner-angle details and small specular highlights.
    for points in [
        [(32,43),(32,35),(45,31)],[(224,43),(224,35),(211,31)],
        [(32,213),(32,221),(45,225)],[(224,213),(224,221),(211,225)]
    ]: f.line(points,fill=(149,225,255,240),width=2)
    halo=fx.filter(ImageFilter.GaussianBlur(5))
    halo.putalpha(halo.getchannel('A').point(lambda a: min(155,int(a*.62))))
    tile.alpha_composite(halo)
    tile.alpha_composite(fx)
    return tile

def main():
    p=argparse.ArgumentParser()
    p.add_argument('input',type=Path)
    p.add_argument('output',type=Path)
    a=p.parse_args()
    src=Image.open(a.input).convert('RGBA')
    assert src.width>=1000 and src.height>=1000,'Expected the supplied high-res 25-cell icon source'
    atlas=Image.new('RGBA',(5*N,5*N),(0,0,0,0))
    for i in range(25):
        atlas.alpha_composite(draw_tile(src,i),((i%5)*N,(i//5)*N))
    a.output.parent.mkdir(parents=True,exist_ok=True)
    atlas.save(a.output,'WEBP',quality=83,method=6)
    check=Image.open(a.output)
    assert check.size==(1280,1280)
    print(f'PASS: original art preserved in 25 uniform 256px neon icon frames: {a.output} ({a.output.stat().st_size} bytes)')
if __name__=='__main__': main()
