#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
KEYS=("idle","run","attack","hit","menace","death","charge","special")
SRC=Path("assets/ironmask-elite/source")
DST=Path("assets/ironmask-elite")
CW,CH=512,608
BASELINE=557
DST.mkdir(parents=True,exist_ok=True)
for key in KEYS:
    original=Image.open(SRC/(key+".png")).convert("RGBA")
    w,h=original.size
    if (w,h)!=(1448,1086): raise RuntimeError(f"{key} original resolution changed: {(w,h)}")
    out=Image.new("RGBA",(4*CW,2*CH),(0,0,0,0))
    for frame in range(8):
        c,r=frame%4,frame//4
        piece=original.crop((round(c*w/4),round(r*h/2),round((c+1)*w/4),round((r+1)*h/2)))
        bb=piece.getchannel("A").point(lambda a:255 if a>=20 else 0).getbbox()
        if not bb: raise RuntimeError(f"{key} frame {frame+1} is blank")
        x=(CW-piece.width)//2
        y=BASELINE-bb[3]
        if x<32 or y<12 or y+bb[3]>CH-25:
            raise RuntimeError(f"{key} frame {frame+1} exceeded safe margins: {bb}, {(x,y)}")
        out.alpha_composite(piece,(c*CW+x,r*CH+y))
        check=out.crop((c*CW,r*CH,(c+1)*CW,(r+1)*CH))
        bbox=check.getchannel("A").point(lambda a:255 if a>=20 else 0).getbbox()
        if bbox[0]<24 or bbox[2]>CW-24 or bbox[1]<10 or bbox[3]>CH-28:
            raise RuntimeError(f"{key} frame {frame+1} clipped: {bbox}")
        print(f"{key} {frame+1}/8 OK alpha={bbox}",flush=True)
    dest=DST/(key+".webp")
    out.save(dest,"WEBP",quality=82,method=3)
    assert Image.open(dest).size==(CW*4,CH*2) and dest.stat().st_size>85000
    print(f"BUILT {dest} bytes={dest.stat().st_size}",flush=True)
print("PASS: 64 painted frames / eight motions / fixed 512x608 cell, foot y=557")
