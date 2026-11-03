#!/usr/bin/env python3
"""Read-only Project Z enemy/boss eight-frame sprite border and dimension audit.
Preserves originals. Edge contacts are candidates; never delete a limb from
this metric alone. Emits JSON with per-frame and source-edge coordinates.
"""
from pathlib import Path
import json, os
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
DIRS={
 'masked-grunt': ROOT/'assets/riot-shield',
 'assassin-b': ROOT/'assets/assassin-b',
 'ironmask-elite': ROOT/'assets/ironmask-elite',
 'boss-hunter': ROOT/'assets/boss-hunter'
}
REDHOOD={
 'entry': ROOT/'assets/enemies/redhood-ambush-entry-8.webp',
 'idle': ROOT/'assets/enemies/redhood-intruder/idle.png',
 'run': ROOT/'assets/enemies/redhood-intruder/run.png',
 'attack': ROOT/'assets/enemies/redhood-intruder/attack-fullfist.webp',
 'hit': ROOT/'assets/enemies/redhood-intruder/hit.png',
 'death': ROOT/'assets/enemies/redhood-intruder/death-fullbody.webp',
 'special': ROOT/'assets/enemies/redhood-intruder/special-fullframe.webp'
}
def spans(values):
    if not values: return []
    runs=[];left=prev=values[0]
    for x in values[1:]:
        if x>prev+2:
            if prev-left>=4:runs.append([left,prev])
            left=x
        prev=x
    if prev-left>=4:runs.append([left,prev])
    return runs

def edges(im,x0,y0,fw,fh):
    out={}
    # Prematted sources: subject is alpha>72, regardless of dark outfit.
    # A seam touch is significant only when connected through 5+ pixels.
    p=im.load()
    for edge in ['left','right','top','bottom']:
        hits=[]
        if edge in ('left','right'):
            x=x0+(2 if edge=='left' else fw-3)
            for y in range(y0+3,y0+fh-3):
                if p[x,y][3]>=72:hits.append(y-y0)
        else:
            y=y0+(2 if edge=='top' else fh-3)
            for x in range(x0+3,x0+fw-3):
                if p[x,y][3]>=72:hits.append(x-x0)
        intervals=spans(hits)
        if intervals:out[edge]={'runs':intervals,'contact_pixels':len(hits)}
    return out
sources=[(category,entry.stem,entry) for category,directory in DIRS.items()
         for entry in sorted(directory.glob('*.webp'))]
sources += [('redhood-intruder',name,path) for name,path in REDHOOD.items()]
report={'sheets':0,'frames':0,'edge_candidates':0,'by_enemy':{},'warnings':[],
  'scope':'current game-used local enemy and boss eight-frame bitmap atlases'}
for group,name,path in sources:
    with Image.open(path) as source:
        im=source.convert('RGBA')
    w,h=im.size
    if w%4 or h%2: raise AssertionError(f'Bad 4x2 grid {path}: {w}x{h}')
    cw,ch=w//4,h//2
    groupinfo=report['by_enemy'].setdefault(group,{'sheets':{},'candidates':0})
    rec={'file':str(path.relative_to(ROOT)),'dimensions':[w,h],
         'cell':[cw,ch],'border_contacts':[]}
    for i in range(8):
        x=(i%4)*cw;y=(i//4)*ch
        contact=edges(im,x,y,cw,ch)
        if contact:
            item={'frame':i+1,'edges':contact}
            rec['border_contacts'].append(item)
            report['warnings'].append({'enemy':group,'move':name,**item})
            groupinfo['candidates']+=1;report['edge_candidates']+=1
        report['frames']+=1
    groupinfo['sheets'][name]=rec;report['sheets']+=1
    states=', '.join(f"{e['frame']}:{'/'.join(e['edges'])}" for e in rec['border_contacts'])
    print(f"{group:17s} {name:18s} {len(rec['border_contacts']):d}/8 [ {states or 'clear'} ]",flush=True)
assert report['sheets']>=46 and report['frames']==report['sheets']*8,(report['sheets'],report['frames'])
out=ROOT/'enemy-edge-audit'
out.mkdir(exist_ok=True)
target=out/'enemy-boss-edge-audit.json'
target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"Audited {report['sheets']} sheets / {report['frames']} poses; {report['edge_candidates']} edge-contact candidates",flush=True)
print('WROTE',target,flush=True)
summary=os.environ.get('GITHUB_STEP_SUMMARY')
if summary:
 with open(summary,'a',encoding='utf-8') as fp:
    fp.write(f"## Project Z Enemy/Boss Sprite Audit\n\n")
    fp.write(f"- {report['sheets']} original sheets, {report['frames']} poses checked.\n")
    fp.write(f"- {report['edge_candidates']} possible seam contacts (not all are actual truncations).\n")
    fp.write('| Enemy | Sheets | Border candidates |\n|---|---:|---:|\n')
    for kind,x in report['by_enemy'].items():
        fp.write(f"| {kind} | {len(x['sheets'])} | {x['candidates']} |\n")
