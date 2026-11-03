#!/usr/bin/env python3
"""Re-cut PROJECT Z HUD bitmaps from the approved v5/v6 art.
Only regions outside the metallic frame and numeral silhouettes are transparent.
Usage: python scripts/repair_project_z_hud_v7.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

BASE = Path(__file__).resolve().parents[1] / "assets" / "ui"

def recut_wave_frame():
    source = Image.open(BASE / "ref-wave-frame-v5.webp").convert("RGBA")
    w, h = source.size
    alpha = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(alpha)
    # Exact HUD silhouette, normalized so the original bitmap can be upgraded.
    # Exterior sky/ground bands are deliberately cut away, not painted dark.
    shape = [
        (0.000, .715), (.056, .108), (.061, .057), (.220, .057),
        (.230, .106), (.328, .105), (.343, .178), (.632, .178),
        (.648, .114), (.737, .102), (.751, .042), (.845, .042),
        (.855, .004), (.954, .004), (.999, .276), (.997, .381),
        (.971, .912), (.959, .964), (.700, .964), (.675, .866),
        (.233, .866), (.218, .916), (.129, .916), (.119, .978),
        (.027, .978), (.000, .760),
    ]
    draw.polygon([(round(x * (w-1)), round(y * (h-1))) for x,y in shape], fill=255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    source.putalpha(ImageChops.multiply(source.getchannel("A"), alpha))
    target = BASE / "ref-wave-frame-v7.png"
    source.save(target, optimize=True)
    print(f"{target.name}: {w}x{h}, alpha=transparent outside shell")

def recut_numbers():
    sheet = Image.open(BASE / "ref-metal-number-atlas-v6.webp").convert("RGBA")
    w, h = sheet.size
    out_files = []
    for digit in range(10):
        # Completely independent source tile: no background-position bleed
        # from the neighboring number, including the red streak near '1'.
        left = round(w * digit / 10) + 3
        right = round(w * (digit+1) / 10) - 3
        if not 0 <= left < right <= w:
            raise ValueError(f"Invalid digit {digit} boundaries")
        tile = sheet.crop((left, 0, right, h))
        r, g, b, original_alpha = tile.split()
        brightness = ImageChops.lighter(ImageChops.lighter(r, g), b)
        # The source WebP uses an opaque black matte. Convert that matte and
        # its compression fringe to real alpha without losing silver/red art.
        lut = [0 if v <= 17 else min(255, round((v-17)*255/48)) for v in range(256)]
        cut_alpha = ImageChops.multiply(brightness.point(lut), original_alpha)
        tile.putalpha(cut_alpha)
        solid = cut_alpha.point(lambda v: 255 if v >= 44 else 0)
        bbox = solid.getbbox()
        if bbox is None:
            raise ValueError(f"No painted pixels for glyph {digit}")
        x0,y0,x1,y1 = bbox
        x0=max(0,x0-2); y0=max(0,y0-2)
        x1=min(tile.width,x1+2); y1=min(tile.height,y1+2)
        glyph = tile.crop((x0,y0,x1,y1))
        # Uniform cell with transparent breathing room, not 10 squeezed
        # background positions. Consistent baseline and safe italics extent.
        glyph = glyph.resize((76,112), Image.Resampling.LANCZOS)
        output = Image.new("RGBA",(84,128),(0,0,0,0))
        output.alpha_composite(glyph,(4,8))
        target=BASE / f"ref-metal-digit-{digit}-v7.png"
        output.save(target,optimize=True)
        out_files.append(target.name)
    print(f"Numeral atlas {w}x{h} -> {len(out_files)} separately alpha-cut PNG digits")
    return out_files

if __name__ == "__main__":
    recut_wave_frame()
    recut_numbers()
