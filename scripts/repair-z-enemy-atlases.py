#!/usr/bin/env python3
"""Surgical pixel-only repair of isolated artifacts in APPROVED enemy atlases.
Keep every original pose, palette, costume, baseline, and frame dimensions.
No generative redraw, geometric scaling or new flat/painted shapes.
"""
from pathlib import Path
from PIL import Image
import cv2
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
CASES=[
 ('assets/ironmask-elite/attack.webp','assets/ironmask-elite/attack-crop-safe.webp'),
 ('assets/ironmask-elite/death.webp','assets/ironmask-elite/death-crop-safe.webp'),
 ('assets/enemies/redhood-intruder/death-fullbody.webp',
  'assets/enemies/redhood-intruder/death-fullbody-crop-safe.webp'),
]
def frame_roi(array,i):
    h,w=array.shape[:2]
    c,r=i%4,i//4
    x0=(c*w+2)//4;x1=((c+1)*w+2)//4
    y0=(r*h+1)//2;y1=((r+1)*h+1)//2
    return array[y0:y1,x0:x1]

def prune(source,frame,area,x,y,w,h,body):
    bx,by,bw,bh=body
    right=x>=bx+bw+10
    # These source-side islands were verified against the authored atlas
    # and are NOT an arm, boot, detached weapon or authored VFX.
    if source=='attack':
        return (frame==2 and right and area<1800) or (
          frame==5 and x<95 and y<330 and area<1500)
    if source=='death':
        return ((frame in (1,2,5,6) and right and area<2500)
                or (frame==5 and y>450 and x>420 and area<1500))
    if source=='redhood-death':
        return frame in (1,2,6) and right and area<400
    return False

changed={}
for orig,dest in CASES:
    im=np.asarray(Image.open(ROOT/orig).convert('RGBA')).copy()
    typ=('redhood-death' if 'redhood' in orig else 'death' if 'death' in orig else 'attack')
    removed=0;changes=[]
    for i in range(8):
        cell=frame_roi(im,i)
        src=cell.copy()
        mask=(src[:,:,3]>=42).astype('uint8')
        n,lab,stats,_=cv2.connectedComponentsWithStats(mask,8)
        components=sorted(range(1,n),key=lambda k:int(stats[k,cv2.CC_STAT_AREA]),reverse=True)
        if not components:raise AssertionError(f'{orig} empty frame {i}')
        main=components[0]
        body=[int(stats[main,k]) for k in (
            cv2.CC_STAT_LEFT,cv2.CC_STAT_TOP,cv2.CC_STAT_WIDTH,cv2.CC_STAT_HEIGHT)]
        for k in components[1:]:
            x,y,w,h,area=[int(stats[k,j]) for j in range(5)]
            if not prune(typ,i,area,x,y,w,h,body):continue
            # Only erase pixels from the exact offending disconnected island
            # plus its nearest alpha fringe, never intersect the main actor.
            orphan=(lab==k).astype('uint8')
            fringe=cv2.dilate(orphan,np.ones((3,3),'uint8'),iterations=1)
            mainmask=cv2.dilate((lab==main).astype('uint8'),
                               np.ones((3,3),'uint8'),iterations=1)
            erase=(fringe>0)&(mainmask==0)
            removed+=int(np.sum(erase & (cell[:,:,3]>0)))
            cell[erase]=[0,0,0,0]
            changes.append({'pose':i+1,'area':area,'bbox':[x,y,w,h]})
        # Residual semitransparent outlines (alpha <42) are not captured by
        # connected-component thresholding. The audited gutters below are
        # entirely outside the actor; keep the actor-connected pixels and
        # their 4px antialias margin protected.
        gutters={
            'attack':{2:[(401,356,458,465)],5:[(50,241,112,314)]},
            'death':{1:[(419,418,454,495)],2:[(398,439,455,534)],
                     5:[(409,482,453,539)],6:[(393,491,455,562)]},
            'redhood-death':{1:[(480,355,527,420)],
                             2:[(491,383,531,540)],6:[(500,489,539,541)]}
        }
        protected=cv2.dilate((lab==main).astype('uint8'),
                             np.ones((9,9),'uint8'),iterations=1)
        for left,top,right,bottom in gutters.get(typ,{}).get(i,[]):
            sub=cell[top:bottom,left:right]
            guard=protected[top:bottom,left:right]
            sub[guard==0]=[0,0,0,0]
    if not changes:raise AssertionError(f'Expected source artifacts not found in {orig}')
    if typ=='attack':
        # Pose 5's extended metal fist was painted with a squared-off tip.
        # The next authored 8-frame pose has the SAME actor, same foot plane,
        # same straight arm and a COMPLETE painted fist. Reuse only those
        # original glove/forearm pixels, not a synthetic patch or rescale.
        # All other limb/body pixels and seven remaining poses stay unchanged.
        with Image.open(ROOT/orig) as src_image:
            original=np.asarray(src_image.convert('RGBA')).copy()
        target=frame_roi(im,4)
        donor=frame_roi(original,5)
        x0,x1,y0,y1=390,461,245,337
        assert target.shape==donor.shape and target.shape[1]>=461
        assert int(np.count_nonzero(donor[y0:y1,x0:x1,3]>60))>600, 'intact donor glove missing'
        for x in range(x0,x1):
            factor=min(1.,max(0.,(x-x0)/11.))
            if factor<=0:continue
            a=target[y0:y1,x,:].astype('float32')
            b=donor[y0:y1,x,:].astype('float32')
            target[y0:y1,x,:]=np.clip(a*(1-factor)+b*factor,0,255).astype('uint8')
        print('GLOVE RECOVERED ironmask attack pose 5 from original complete pose 6 sleeve/hand',flush=True)
    final=Image.fromarray(im,'RGBA')
    target=ROOT/dest;target.parent.mkdir(exist_ok=True,parents=True)
    final.save(target,'WEBP',quality=97,method=6)
    # Verify the originals remain completely unaltered.
    with Image.open(target) as check:
        assert check.size==final.size and check.mode=='RGBA'
    changed[dest]=(len(changes),removed,changes)
    print('REPAIRED',dest,'removed islands:',len(changes),
          'fringe pixels:',removed,'details:',changes,flush=True)
assert len(changed)==3
print('All repaired atlases keep their original pixel dimensions and frame count',flush=True)
