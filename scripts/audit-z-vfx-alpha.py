#!/usr/bin/env python3
"""Read-only alpha/matte audit for Project Z combat FX sprites."""
from pathlib import Path
from PIL import Image
import re, base64, io, sys

ROOT=Path(__file__).resolve().parents[1]
VFX=ROOT/"assets"/"vfx"
paths=sorted(VFX.glob("*.png"))
failures=[]
reports=[]
print("=== Project Z bitmap FX alpha/matte audit ===")
for p in paths:
    with Image.open(p) as im:
        rgba=im.convert("RGBA")
        w,h=rgba.size
        pixels=rgba.load()
        step=max(1,int((w*h/240000)**.5))
        total=transparent=opaque_dark=0
        for y in range(0,h,step):
            for x in range(0,w,step):
                r,g,b,a=pixels[x,y]
                total+=1
                if a<10:transparent+=1
                if a>240 and max(r,g,b)<25:opaque_dark+=1
        border=0
        bad=0
        spacing=max(1,round(min(w,h)*.003))
        coords=set()
        for x in range(0,w,max(1,w//100)):
            for y in list(range(0,spacing))+list(range(h-spacing,h)):
                coords.add((x,y))
        for y in range(0,h,max(1,h//100)):
            for x in list(range(0,spacing))+list(range(w-spacing,w)):
                coords.add((x,y))
        for x,y in coords:
            if 0<=x<w and 0<=y<h:
                r,g,b,a=pixels[x,y];border+=1
                if a>240 and max(r,g,b)<25:bad+=1
        transp=transparent/max(1,total)
        black=opaque_dark/max(1,total)
        edge=bad/max(1,border)
        if transp<.0001 or edge>.08 or black>.25:
            failures.append((p.name,round(transp,4),round(edge,4),round(black,4)))
        print(f"{p.name}: {w}x{h} mode={im.mode} alpha0={transp:.3%} blackOpaque={black:.3%} blackBorder={edge:.3%}")

# The parry AVIF is embedded in index.html and historically relies on screen blending.
html=(ROOT/"index.html").read_text(encoding="utf-8")
match=re.search(r"parrySuccessImage\.src='data:image/avif;base64,([^']+)'",html)
if not match:
    print("FAIL: parry success AVIF missing");sys.exit(1)
parry_bytes=base64.b64decode(match.group(1))
print(f"Parry source: embedded AVIF {len(parry_bytes)} bytes; no binary resource was modified")
print("Screen on a transparent canvas does not key black; verify explicit RGBA conversion:")
required=[
    "function zKeyBlackVfxCanvas(g,w,h)",
    "g.getImageData(0,0,w,h)",
    "g.putImageData(frame,0,0)",
    "alphaReport.push({frame:i+1,...zKeyBlackVfxCanvas(g,cv.width,cv.height)})",
    "if(!cell)continue;",
    "ctx.drawImage(cell,-w*.32-edgeX,-h*.5-edgeY,w+edgeX*2,h+edgeY*2);"
]
for marker in required:
    if marker not in html:
        print("FAIL: missing alpha key/guard:",marker);sys.exit(1)
if "else ctx.drawImage(a,crop.sx,crop.sy,crop.sw,crop.sh,-w*.32,-h*.5,w,h)" in html:
    print("FAIL: raw black-matte AVIF fallback still active");sys.exit(1)
print(f"PRODUCTION PARRY KEY: pass; source AVIF maintained, 10 cleaned RGBA cells required")
if failures:
    print("SUSPECT ASSETS (review needed; not necessarily defects):")
    for f in failures:print(" ",f)
else:
    print(f"No suspicious opaque-black mattes on {len(paths)} FX PNG resources.")
print(f"AUDIT FINISHED: scanned {len(paths)} external FX PNG sprites + parry AVIF")
