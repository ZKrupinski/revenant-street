#!/usr/bin/env python3
"""Project Z HUD v8: non-generative cleanup of original approved raster art.

Sources are the original art samples already in assets/ui/. This does not redraw,
re-vectorize or synthesize panels. It only removes exterior matte, clears baked
progress-bar red glow, and extracts the original metal numerals with true alpha.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import json

UI = Path(__file__).resolve().parents[1] / "assets" / "ui"

def silhouette(source, points, original_size):
    image = Image.open(UI / source).convert("RGBA")
    w, h = image.size
    sw, sh = original_size
    # Pixel-accurate silhouette tracing at 4x and downsample once to keep
    # 1px antialiased cut edges instead of fuzzy Gaussian feathering.
    k = 4
    mask = Image.new("L", (w*k, h*k), 0)
    draw = ImageDraw.Draw(mask)
    polygon = [(round(x*w/sw*k), round(y*h/sh*k)) for x,y in points]
    draw.polygon(polygon, fill=255)
    mask = mask.resize((w,h), Image.Resampling.LANCZOS)
    image.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
    return image

def wave():
    # Follow the original 1600x211 metal perimeter, including the step at
    # the bottom rail and the asymmetrical upper-right angled horns.
    contour=[
        (0,146),(6,138),(73,35),(84,19),(89,13),
        (522,13),(537,35),(1029,35),(1047,25),(1211,25),
        (1224,15),(1330,15),(1346,2),(1534,2),(1555,10),
        (1598,54),(1598,65),(1543,187),(1515,208),
        (1121,208),(1096,184),(776,184),(756,195),
        (568,195),(552,208),(382,208),(367,193),
        (219,193),(199,209),(33,209),(20,188)
    ]
    image=silhouette("ref-wave-frame-v5.webp",contour,(1600,211))
    px=image.load(); w,h=image.size
    # The approved source screenshot had a partially-filled wave meter.
    # Previous crops retained a red stripe on its empty upper track.
    # Remove only RED pixels in that narrow meter header; preserve every
    # surrounding metal edge, cyan LED, left WAVE lettering and skull.
    for y in range(round(57*h/211),round(94*h/211)):
        for x in range(round(451*w/1600),round(889*w/1600)):
            r,g,b,a=px[x,y]
            if a and r>95 and r>g*1.36 and r>b*1.24:
                # Convert the baked red paint/glow into dark neutral metallic
                # pixels, so all red meter pixels come from the live fill ONLY.
                v=min(100,round((g+b)*.44)+8)
                px[x,y]=(v,min(255,v+2),min(255,v+7),a)
    output=UI/"ref-wave-frame-v8.png"
    image.save(output,optimize=True)
    return output

def hp():
    contour=[
        (0,80),(34,27),(42,24),(101,24),(112,36),
        (167,36),(178,44),(547,44),(561,34),(633,34),
        (633,43),(611,98),(596,108),(578,117),
        (224,117),(212,123),(83,123),(71,126),
        (23,125),(3,98)
    ]
    image=silhouette("ref-hero-hp-frame-v7.webp",contour,(637,127))
    output=UI/"ref-hero-hp-frame-v8.png"
    image.save(output,optimize=True)
    return output

def digits():
    atlas=Image.open(UI/"ref-metal-number-atlas-v6.webp").convert("RGBA")
    w,h=atlas.size
    results=[]
    # Unlike CSS background-position atlas slicing, each glyph gets its
    # own fully transparent independent cell and guaranteed italic padding.
    for digit in range(10):
        x0=round(digit*w/10);x1=round((digit+1)*w/10)
        tile=atlas.crop((x0,0,x1,h))
        r,g,b,a=tile.split()
        light=ImageChops.lighter(ImageChops.lighter(r,g),b)
        # Black is a composited source matte, not part of the numeral.
        # Remove it with a 42-level feather. No hard rectangular residue.
        lut=[0 if p<=24 else min(255,round((p-24)*255/48)) for p in range(256)]
        alpha=ImageChops.multiply(light.point(lut),a)
        tile.putalpha(alpha)
        bbox=alpha.point(lambda v:255 if v>=38 else 0).getbbox()
        if not bbox:
            raise RuntimeError("Empty source glyph "+str(digit))
        margin=4
        left=max(0,bbox[0]-margin);right=min(tile.width,bbox[2]+margin)
        top=max(0,bbox[1]-margin);bottom=min(tile.height,bbox[3]+margin)
        glyph=tile.crop((left,top,right,bottom))
        # Keep aspect; align EVERY digit to the SAME bottom baseline.
        factor=min(78/glyph.width,119/glyph.height)
        target=(max(1,round(glyph.width*factor)),max(1,round(glyph.height*factor)))
        glyph=glyph.resize(target,Image.Resampling.LANCZOS)
        result=Image.new("RGBA",(88,136),(0,0,0,0))
        dest=(round((88-target[0])/2),130-target[1])
        result.alpha_composite(glyph,dest)
        output=UI/f"ref-metal-digit-{digit}-v8.png"
        result.save(output,optimize=True)
        results.append(output)
    return results

if __name__=="__main__":
    out=[wave(),hp(),*digits()]
    for path in out:
        im=Image.open(path).convert("RGBA")
        assert im.getpixel((0,0))[3]==0, path
        assert im.getpixel((im.width-1,im.height-1))[3]==0, path
    print(json.dumps({p.name:{"size":Image.open(p).size,"bytes":p.stat().st_size} for p in out},indent=2))
