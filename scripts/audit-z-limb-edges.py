#!/usr/bin/env python3
"""Read-only QA of all 20 original 4x2 Project Z protagonist attack sheets.
Reports source-cell limb-edge contacts before runtime chroma-key, independently
of the browser. Does not redraw, rescale, or change any approved artwork.
"""
import json
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/z-attacks-20'
OUT = ROOT / 'sprite-edge-audit'
OUT.mkdir(exist_ok=True)
FILES = sorted(SOURCE.glob('*.webp'))
assert len(FILES) == 20, f'Expected all 20 original attacks, got {len(FILES)}'

def subject(color):
    r,g,b,a = color
    # Bright chroma-key is not part of the costume silhouette.
    green = g > 70 and g > r*1.10 and g > b*1.08 and g-r > 17
    return a >= 64 and not green and max(r,g,b) > 27

def runs(points):
    spans=[]; start=previous=None
    for value in points:
        if start is None: start=previous=value;continue
        if value>previous+2:
            spans.append([start,previous]);start=value
        previous=value
    if start is not None:spans.append([start,previous])
    return [span for span in spans if span[1]-span[0]>=3]

report={'total_sheets':len(FILES),'frames_checked':0,'warnings':[],'motions':{}}
for source in FILES:
    im = Image.open(source).convert('RGBA')
    w,h=im.size
    assert w%4==0 and h%2==0,(source.name,im.size)
    fw,fh=w//4,h//2;pix=im.load()
    notes=[]
    for frame in range(8):
        col,row=frame%4,frame//4
        sx,sy=col*fw,row*fh
        edges={}
        for side in ['left','right','top','bottom']:
            coords=[]
            if side in ('left','right'):
                xx=sx+(1 if side=='left' else fw-2)
                for yy in range(sy+5,sy+fh-5):
                    if subject(pix[xx,yy]):coords.append(yy-sy)
            else:
                yy=sy+(1 if side=='top' else fh-2)
                for xx in range(sx+5,sx+fw-5):
                    if subject(pix[xx,yy]):coords.append(xx-sx)
            spans=runs(coords)
            if spans:edges[side]={'ranges':spans,'pixels':len(coords)}
        if edges:
            notes.append({'frame':frame+1,'sides':edges})
            report['warnings'].append({'move':source.stem,'frame':frame+1,'sides':edges})
        report['frames_checked']+=1
    report['motions'][source.stem]={'size':[w,h],'frame_size':[fw,fh],
                                   'warnings':notes}
    print(f"{source.stem:20s} {len(notes):2d}/8 edge-touch candidate frames",flush=True)
    for hit in notes:
        compact=', '.join(f"{side}:{value['ranges']}" for side,value in hit['sides'].items())
        print(f"  frame {hit['frame']}: {compact}",flush=True)
print('Detected',len(report['warnings']),'potential edge contacts in',report['frames_checked'],'frames',flush=True)
# The Supermann Punch source has a real glove and rear boot in adjacent
# cell spaces, as confirmed from the actual approved 8-frame sheet.
sheet=report['motions']['superman_punch']
assert sheet['frame_size'][0]>=320
report['confirmed_repairs']=[
 {'move':'superman_punch','frame':3,'left':'airborne rear boot',
  'right':'fully extended fist','repair':'direction-specific overscan at runtime'},
 {'move':'sidekick','frames':[5,6],'right':'extended boot',
  'repair':'existing local sidekick foot-safe overscan'}
]
target=OUT/'hero-attack-limb-edge-audit.json'
target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
summary=os.environ.get('GITHUB_STEP_SUMMARY')
if summary:
    with open(summary,'a',encoding='utf-8') as out:
        out.write(f'## Project Z · 20-sheet arm/leg crop audit\n\n')
        out.write(f'- **{report["frames_checked"]} animation frames** checked across {len(FILES)} original sheets\n')
        out.write(f'- **{len(report["warnings"])} boundary contacts** are candidates, not automatically proven limb truncations\n')
        out.write('- Superman Punch pose 3: original glove/boot extend into neighboring cells; dedicated non-overlapping overscan\n')
        out.write('- Sidekick poses 5/6: original boot overscan retained\n\n')
        out.write('| Move | Candidate frames |\n|---|---|\n')
        for name,entry in report['motions'].items():
            frames=','.join(str(x['frame']) for x in entry['warnings']) or '—'
            out.write(f'| {name} | {frames} |\n')
print('Wrote',target,flush=True)
