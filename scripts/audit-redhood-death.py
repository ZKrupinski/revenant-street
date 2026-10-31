#!/usr/bin/env python3
"""Ground-reference audit: original redhood death.png 4x2 atlas, 8 full poses."""
from pathlib import Path
from PIL import Image
src=Image.open(Path("assets/enemies/redhood-intruder/death.png")).convert("RGBA")
w,h=src.size
print(f"REDHOOD DEATH SOURCE {w}x{h}")
feet=[]
for n in range(8):
 col=n%4; row=n//4
 x0=round(col*w/4); x1=round((col+1)*w/4)
 y0=round(row*h/2); y1=round((row+1)*h/2)
 cell=src.crop((x0,y0,x1,y1)); cw,ch=cell.size
 mask=cell.getchannel("A").point(lambda a:255 if a>=10 else 0)
 bbox=mask.getbbox()
 assert bbox,f"death frame {n+1} is blank"
 edge=sum(1 for x in range(cw) if mask.getpixel((x,ch-1)))+sum(1 for y in range(ch) if mask.getpixel((0,y)) or mask.getpixel((cw-1,y)))
 feet.append(bbox[3]-1)
 print(f"DEATH {n+1} cell={cw}x{ch} alpha_bbox={bbox} bottom_contact={edge} bottommost_alpha_y={bbox[3]-1}")
print("AUDITED_DEATH_FOOT="+repr(feet))

from PIL import ImageDraw
sheet=Image.new('RGBA',(4*300,2*332),(17,24,35,255))
draw=ImageDraw.Draw(sheet)
for n in range(8):
 col,row=n%4,n//4
 left,right=round(col*w/4),round((col+1)*w/4)
 top,bottom=round(row*h/2),round((row+1)*h/2)
 raw=src.crop((left,top,right,bottom))
 raw.thumbnail((284,290),Image.Resampling.LANCZOS)
 px=col*300+(300-raw.width)//2;py=row*332+5
 sheet.alpha_composite(raw,(px,py))
 draw.rectangle((col*300+3,row*332+3,col*300+297,row*332+296),outline=(242,75,108,255),width=2)
 draw.text((col*300+12,row*332+306),f'DEATH {n+1} raw cell',fill=(230,236,248,255))
out=Path('assets/enemies/redhood-intruder/death-audit.webp')
sheet.convert('RGB').save(out,format='WEBP',quality=80,method=6)
print('SOURCE CONTACT SHEET='+str(out)+' bytes='+str(out.stat().st_size))
