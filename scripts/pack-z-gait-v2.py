#!/usr/bin/env python3
"""Pack 16 individually generated full-body Higgsfield frames into two 8F sprite atlases.

- Exact original Z outfit, eight individually painted poses for each gait.
- Chromakey -> alpha, one shared scale per action; no limb cutouts.
- Feet share a single contact baseline; airborne running frames stay raised.
- 4 x 2 transparent WebP; previous shipped source files remain untouched.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
import json

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path("/tmp/z-gait-individual-v2")
OUT=ROOT/"assets"/"original-z-hf"
OUT.mkdir(parents=True,exist_ok=True)
CW,CH=512,620
qa={}
for kind in ("walk","run"):
    frames=[];bounds=[]
    for i in range(1,9):
        im=Image.open(SOURCE/f"{kind}-f{i:02}.png").convert("RGBA")
        a=np.asarray(im).copy()
        rgb=a[:,:,:3].astype(np.int16)
        red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
        excess=green-np.maximum(red,blue)
        chroma=(green>84)&(green>red*1.11)&(green>blue*1.10)&(excess>12)
        # Float maths is critical here: 16-bit green overflow yields opaque backgrounds.
        alpha=np.clip((70.0-excess.astype(np.float32))*255/52,0,255).astype(np.uint8)
        a[chroma,3]=np.minimum(a[chroma,3],alpha[chroma])
        a[a[:,:,3]<10,3]=0
        yy,xx=np.where(a[:,:,3]>90)
        assert len(xx)>25000,(kind,i,"empty figure")
        box=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
        cropped=Image.fromarray(a,"RGBA").crop(box)
        assert cropped.width>300 and cropped.height>850,(kind,i,"unexpected crop")
        bounds.append(box);frames.append(cropped)
    # One physical sprite scale for all eight; never independently resize limbs.
    scale=min((CW-38)/max(x.width for x in frames),(CH-45)/max(x.height for x in frames))
    atlas=Image.new("RGBA",(CW*4,CH*2))
    for i,im in enumerate(frames):
        nw,nh=max(1,round(im.width*scale)),max(1,round(im.height*scale))
        sprite=im.resize((nw,nh),Image.Resampling.LANCZOS)
        # Only running flight poses 3/7 are high. Walking overpass is tiny.
        airborne=24 if kind=="run" and i in (2,6) else 5 if kind=="walk" and i in (2,6) else 0
        x=(i%4)*CW+(CW-nw)//2
        y=(i//4)*CH+CH-23-nh-airborne
        assert x>=(i%4)*CW and y>=(i//4)*CH,(kind,i,"sprite spills into prior cell")
        atlas.alpha_composite(sprite,(x,y))
    out=OUT/f"{kind}-v2.webp"
    atlas.save(out,"WEBP",quality=94,method=6,exact=True)
    assert out.stat().st_size>100000,(kind,"suspicious size")
    # Structural QA: all cells nonempty and visibly distinct source paintings.
    mini=[]
    for i in range(8):
        f=atlas.crop(((i%4)*CW,(i//4)*CH,(i%4+1)*CW,(i//4+1)*CH))
        mask=f.getchannel("A")
        assert mask.getbbox(),(kind,i,"blank frame")
        assert np.asarray(mask).sum()>1700000,(kind,i,"corrupt alpha")
        mini.append(np.asarray(f.resize((64,76),Image.Resampling.BILINEAR).convert("RGB"),dtype=np.int16))
    for a,b in ((0,4),(2,6)):
        change=float(np.mean(np.abs(mini[a]-mini[b])))
        assert change>3.0,(kind,a+1,b+1,"same stride duplicated",change)
    preview=Image.new("RGBA",atlas.size,(39,44,52,255))
    preview.alpha_composite(atlas)
    thumbnail=preview.convert("RGB")
    thumbnail.thumbnail((1150,800),Image.Resampling.LANCZOS)
    draw=ImageDraw.Draw(thumbnail)
    for i in range(8):
        draw.text(((i%4)*thumbnail.width/4+10,(i//4)*thumbnail.height/2+8),
                  f"{kind.upper()} F{i+1}",fill="white")
    thumbnail.save(OUT/f"{kind}-v2-qa.jpg",quality=83,optimize=True)
    qa[kind]={"source_frames":8,"size":list(atlas.size),"per_frame":[CW,CH],
              "shared_scale":round(scale,6),"bytes":out.stat().st_size,
              "source_bounds":bounds}
(OUT/"gait-v2-validation.json").write_text(json.dumps(qa,ensure_ascii=False,indent=2))
print("PASS: 16 separately authored original Z frames; 2 common-scale 8F atlases; alpha, foot plane, and duplicate QA")
for key,val in qa.items():print(key,val["bytes"],"bytes",val["shared_scale"],"scale")
