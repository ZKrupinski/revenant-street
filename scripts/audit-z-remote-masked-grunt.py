#!/usr/bin/env python3
"""Audit the live MASKED_GRUNT_ATLAS from index.html (12 CDN actions).
Unlike prematted enemy sources these 4x2 sheets may use a green-screen
background, so reject green pixels rather than treating opaque green as art.
Read-only diagnostics; do not switch the game's artwork.
"""
from pathlib import Path
from PIL import Image
import json, re, io, urllib.request
from concurrent.futures import ThreadPoolExecutor,as_completed

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
match=re.search(r'const MASKED_GRUNT_ATLAS=(\{[^\n]+\});',html)
assert match,'Masked grunt atlas manifest not found'
urls=json.loads(match.group(1))
assert len(urls)==12,len(urls)
def eligible(color):
 r,g,b,a=color
 return a>=64 and not(g>70 and g>r*1.10 and g>b*1.08 and g-r>17)
def spans(values):
 if not values:return []
 result=[];start=last=values[0]
 for v in values[1:]:
  if v>last+2:
   if last-start>=4:result.append([start,last])
   start=v
  last=v
 if last-start>=4:result.append([start,last])
 return result
def check(key,url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 ProjectZ-enemy-crop-audit'})
 with urllib.request.urlopen(req,timeout=25) as res:
  data=res.read(20_000_000)
 img=Image.open(io.BytesIO(data)).convert('RGBA')
 w,h=img.size
 assert w>=440 and h>=240,(key,w,h)
 pixel=img.load();notes=[]
 for frame in range(8):
  col,row=frame%4,frame//4
  x0=(col*w+2)//4;x1=((col+1)*w+2)//4
  y0=(row*h+1)//2;y1=((row+1)*h+1)//2
  lines={}
  for side in ['left','right','top','bottom']:
   hits=[]
   if side in ('left','right'):
    x=x0+(2 if side=='left' else x1-x0-3)
    for y in range(y0+3,y1-3):
     if eligible(pixel[x,y]):hits.append(y-y0)
   else:
    y=y0+(2 if side=='top' else y1-y0-3)
    for x in range(x0+3,x1-3):
     if eligible(pixel[x,y]):hits.append(x-x0)
   intervals=spans(hits)
   if intervals:lines[side]=intervals
  if lines:notes.append({'frame':frame+1,'edges':lines})
 return key,{'dimensions':[w,h],'bytes':len(data),'edge_contacts':notes}
items={};errors={}
with ThreadPoolExecutor(max_workers=4) as pool:
 jobs={pool.submit(check,k,v):k for k,v in urls.items()}
 for job in as_completed(jobs):
  key=jobs[job]
  try:
   name,data=job.result();items[name]=data
   print(name,'frames',8,'border hits',data['edge_contacts'],flush=True)
  except Exception as e:
   errors[key]=str(e);print('UNAVAILABLE',key,str(e),flush=True)
assert len(items)+len(errors)==12
report={'remote_actions':len(items),'frames_checked':8*len(items),
        'edge_candidates':sum(len(x['edge_contacts']) for x in items.values()),
        'actions':items,'unavailable':errors}
out=ROOT/'enemy-edge-audit';out.mkdir(exist_ok=True)
(out/'remote-masked-grunt-audit.json').write_text(
 json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('REMOTE MASKED GRUNT AUDIT',report['frames_checked'],'frames',
      report['edge_candidates'],'potential edge hits',
      len(errors),'unavailable',flush=True)
