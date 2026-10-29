#!/usr/bin/env python3
"""Precise eight-frame original-Z walk/run V3; full-body art, never limb-segmented.

Source: four unique positions from the explicitly staged first-row walk/run
Higgsfield sheets, then four individually drawn opposite-leg positions.
A 4x2 alpha-preserved WebP uses shared source-group scales, a consistent
pelvis anchor, fixed contact baseline, and no per-frame squashing.
"""
import os, numpy as np, json
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(os.environ.get('GAIT_V3_SOURCE','/tmp/z-gait-v3'))
OUT=ROOT/'assets'/'original-z-hf'
CW,CH=512,620
OUT.mkdir(parents=True,exist_ok=True)
def matte(im):
    rgba=np.array(im.convert('RGBA'),dtype=np.uint8).copy()
    rgb=rgba[:,:,:3].astype(np.float32)
    r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    excess=g-np.maximum(r,b)
    # Smooth edge transition only where green is more dominant than the
    # local red/blue. Never remove dark clothes or silver arm texture.
    high=(g>76)&(g>r*1.13)&(g>b*1.13)&(excess>19)
    transparency=np.clip((68.0-excess)*255/47,0,255).astype(np.uint8)
    rgba[:,:,3][high]=np.minimum(rgba[:,:,3][high],transparency[high])
    partial=high&(rgba[:,:,3]>0)&(rgba[:,:,3]<245)
    rgba[:,:,1][partial]=np.minimum(rgba[:,:,1][partial],np.maximum(rgba[:,:,0][partial],rgba[:,:,2][partial])+9)
    rgba[rgba[:,:,3]<9,3]=0
    yy,xx=np.where(rgba[:,:,3]>65)
    if len(xx)<3000:raise ValueError('empty silhouette')
    bounds=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
    return Image.fromarray(rgba,'RGBA').crop(bounds)
def make_frames(kind):
    atlas=Image.open(SOURCE/f'{kind}-sheet.png').convert('RGBA')
    frames=[]
    for i in range(4):
        x=(i%4)*atlas.width//4
        # Only take top row: bottom row repeats the same stepping leg.
        cell=atlas.crop((x+3,3,(i+1)*atlas.width//4-3,atlas.height//2-3))
        frames.append(matte(cell))
    for frame in range(5,9):
        frames.append(matte(Image.open(SOURCE/f'{kind}-f{frame:02}.png')))
    return frames
def torso_center(im):
    a=np.asarray(im.getchannel('A'))
    h,w=a.shape
    y0=int(h*.16);y1=max(y0+1,int(h*.57))
    yy,xx=np.where(a[y0:y1,:]>90)
    if len(xx)<200:return w/2
    return float(np.median(xx))
qa={}
for kind in ('walk','run'):
    sprites=make_frames(kind)
    group_data=[]
    for group in (sprites[:4],sprites[4:]):
        maxw=max(im.width for im in group)
        maxh=max(im.height for im in group)
        scale=min((CW-48)/maxw,(CH-58)/maxh)
        group_data.append(float(scale))
    output=Image.new('RGBA',(CW*4,CH*2),(0,0,0,0))
    dims=[];feet=[];tcentres=[]
    for i,sprite in enumerate(sprites):
        scale=group_data[0 if i<4 else 1]
        nw,nh=round(sprite.width*scale),round(sprite.height*scale)
        if nw<30 or nh<80:raise ValueError((kind,i,'suspicious sprite size',nw,nh))
        im=sprite.resize((nw,nh),Image.Resampling.LANCZOS)
        # Visually stable pelvis/torso reference while boots/arms swing.
        torso=torso_center(sprite)*scale
        xpos=round(CW/2-torso)
        xpos=max(8,min(CW-8-nw,xpos))
        # Frames 3,7 of run are flight stages; their feet are airborne.
        lift=34 if kind=='run' and i in (2,6) else 0
        ypos=CH-20-nh-lift
        if ypos<6:raise ValueError((kind,i,'cropped above tile',ypos))
        output.alpha_composite(im,((i%4)*CW+xpos,(i//4)*CH+ypos))
        dims.append([nw,nh]);feet.append(CH-20-lift);tcentres.append(round(torso,1))
    dest=OUT/f'{kind}-v3.webp'
    output.save(dest,'WEBP',quality=94,method=6,exact=True)
    masks=[]
    for i in range(8):
        sub=output.crop(((i%4)*CW,(i//4)*CH,(i%4+1)*CW,(i//4+1)*CH))
        a=np.asarray(sub.getchannel('A'))
        assert int(np.count_nonzero(a>65))>10000,(kind,i,'blank/corrupt')
        mask=sub.getchannel('A').getbbox()
        assert mask and mask[0]>=1 and mask[2]<=CW-1 and mask[1]>=1 and mask[3]<=CH-1,(kind,i,'cut border',mask)
        masks.append(sub.resize((64,78),Image.Resampling.BILINEAR).convert('RGB'))
    # Ensure alternate contact and passing frames are truly different.
    for i,j in ((0,4),(2,6)):
        a=np.asarray(masks[i]).astype(np.float32);b=np.asarray(masks[j]).astype(np.float32)
        difference=float(np.abs(a-b).mean())
        assert difference>3.4,(kind,i+1,j+1,'duplicated half-cycle',difference)
    preview=Image.new('RGBA',output.size,(34,43,52,255))
    preview.alpha_composite(output)
    preview.thumbnail((1200,760),Image.Resampling.LANCZOS)
    rgb=preview.convert('RGB')
    d=ImageDraw.Draw(rgb)
    for i in range(8):
        col,row=i%4,i//4
        d.text((col*rgb.width//4+10,row*rgb.height//2+10),f'{kind.upper()} {i+1}',fill='white')
    rgb.save(OUT/f'{kind}-v3-qa.jpg',quality=86,optimize=True)
    qa[kind]={'size':[CW*4,CH*2],'frames':8,'cell':[CW,CH],
              'scales':group_data,'frame_sizes':dims,'feet':feet,
              'bytes':dest.stat().st_size,'torso_centres':tcentres}
(OUT/'gait-v3-validation.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
print('PASS: V3 original-Z 16 full-body frames, real alternating half cycles, alpha, scale, baseline, cut-border QA')
for key,val in qa.items():print(key,val['bytes'],'bytes','group scales',val['scales'],'frame sizes',val['frame_sizes'])
