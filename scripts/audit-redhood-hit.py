#!/usr/bin/env python3
"""One-time alpha and crop audit for the user's original Redhood hit sprites."""
from PIL import Image, ImageDraw
from pathlib import Path
import sys
src=Path('assets/enemies/redhood-intruder/hit.png')
im=Image.open(src).convert('RGBA')
w,h=im.size
print(f'REDHOOD HIT SIZE {w}x{h} rows=2 columns=4')
cols,rows=4,2
sheet=Image.new('RGB',(4*240,2*280),(15,23,39))
pen=ImageDraw.Draw(sheet)
for n in range(8):
    col=n%4;row=n//4
    x0=round(col*w/4);x1=round((col+1)*w/4)
    y0=round(row*h/2);y1=round((row+1)*h/2)
    tile=im.crop((x0,y0,x1,y1))
    alpha=tile.getchannel('A')
    mask=alpha.point(lambda a:255 if a>=10 else 0)
    bbox=mask.getbbox()
    edge={'left':0,'right':0,'top':0,'bottom':0}
    pix=mask.load()
    tw,th=tile.size
    for y in range(th):
        if pix[0,y]:edge['left']+=1
        if pix[tw-1,y]:edge['right']+=1
    for x in range(tw):
        if pix[x,0]:edge['top']+=1
        if pix[x,th-1]:edge['bottom']+=1
    print(f'hit {n}: size={tw}x{th} alpha_bbox={bbox} border_pixels={edge}, occupancy={sum(1 for a in mask.getdata() if a)/float(tw*th):.4f}')
    tile.thumbnail((225,241),Image.Resampling.LANCZOS)
    xx=col*240+(240-tile.width)//2;yy=row*280+5
    sheet.paste(tile,(xx,yy),tile)
    pen.text((col*240+8,row*280+249),f'hit frame {n+1} | {bbox}',fill=(225,225,255))
dst=Path('assets/enemies/redhood-intruder/hit-audit.webp')
sheet.save(dst,format='WEBP',quality=79,method=6)
print('AUDIT IMAGE '+str(dst)+' size='+str(dst.stat().st_size))
