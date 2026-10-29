#!/usr/bin/env python3
"""Pack Project Z HUNTER eight 8-frame boss actions with no X/Y distortion.

Four exact OpenAI-generated source images use measured 512x544 foot-anchored
cut boundaries from the previously approved QA metadata. Four replacement
shots use the same original boss design as their reference.
Input source/ images are 4x2 RGBA or bright green 4x2 RGB sheets.
Output is 8 WebP files, 2048x1088 (512x544 cells), with alpha.
"""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT=Path(__file__).resolve().parents[1]/"assets"/"boss-hunter"
SRC=ROOT/"source"
CW,CH=512,544
STATES=("idle","walk","dash","combo","slam","taunt","hit","death")
# Source-frame bounds were taken from the prior 64-cell precision-cut QA.
PRECISE={
"idle":{"shift":16,"boxes":[[22,9,418,465],[32,14,418,465],[32,8,418,465],[36,27,413,465],[14,9,418,449],[32,6,418,449],[32,6,418,449],[20,5,410,449]]},
"walk":{"shift":24,"boxes":[[18,28,418,460],[29,30,415,461],[1,32,414,461],[17,34,408,465],[39,19,418,436],[20,17,418,437],[0,16,418,437],[0,23,399,436]]},
"dash":{"shift":0,"boxes":[[41,291,404,470],[0,254,385,470],[6,236,400,470],[0,213,407,470],[40,134,418,421],[39,134,418,424],[44,132,418,425],[7,143,409,423]]},
"hit":{"shift":17,"boxes":[[19,34,418,441],[32,74,418,441],[0,103,415,441],[0,214,404,470],[30,89,418,424],[0,43,415,424],[0,6,390,424],[0,0,399,424]]},
}

def unmatte(arr):
    if arr.ndim==2: raise ValueError("unexpected grayscale atlas")
    if arr.shape[2]==3:
        a=np.full((*arr.shape[:2],1),255,dtype=np.uint8)
        arr=np.concatenate([arr,a],axis=2)
    rgb=arr[:,:,:3].astype(np.int16)
    red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    is_green=(green>100)&(green-red>21)&(green-blue>21)&(green>red*1.14)&(green>blue*1.10)
    arr[is_green,3]=0
    soft=(green>100)&(green-red>10)&(green-blue>10)&~is_green
    arr[soft,1]=np.minimum(arr[soft,1],np.maximum(arr[soft,0],arr[soft,2])+8)
    arr[arr[:,:,3]<9,3]=0
    return arr

for state in STATES:
    im=Image.open(SRC/(state+".png")).convert("RGBA")
    width,height=im.size
    assert width>=1600 and height>=900,(state,im.size)
    tiles=[]
    for i in range(8):
        col,row=i%4,i//4
        x0=round(col*width/4);x1=round((col+1)*width/4)
        y0=round(row*height/2);y1=round((row+1)*height/2)
        arr=np.array(im.crop((x0,y0,x1,y1)),dtype=np.uint8)
        if state in PRECISE and width==1672 and height==941:
            bx0,by0,bx1,by1=PRECISE[state]["boxes"][i]
            valid=np.zeros(arr.shape[:2],dtype=np.bool_)
            valid[by0:by1,bx0:bx1]=True
            arr[~valid,3]=0
        else:
            arr=unmatte(arr)
            # Remove specks, not the thin red lightning in each isolated tile.
            # The generator's generous margins protect the neighboring frames.
        alpha=arr[:,:,3]>65
        assert np.count_nonzero(alpha)>900,(state,i,"empty cell")
        tiles.append(Image.fromarray(arr,"RGBA"))
    out=Image.new("RGBA",(CW*4,CH*2),(0,0,0,0))
    for i,tile in enumerate(tiles):
        row,col=i//4,i%4
        if state in PRECISE and width==1672 and height==941:
            # Raw source pixels are copied exactly at a constant physical
            # scale; no interpolation, independent stretch, or foot warping.
            x=47
            y=48+(PRECISE[state]["shift"] if row else 0)
            out.alpha_composite(tile,(col*CW+x,row*CH+y))
        else:
            bbox=tile.getchannel("A").getbbox()
            assert bbox,(state,i)
            isolated=tile.crop(bbox)
            # constant relative size for all frames in one 4x2 atlas
            maxwidth=max(1,max(x.getchannel("A").getbbox()[2]-x.getchannel("A").getbbox()[0] for x in tiles))
            maxheight=max(1,max(x.getchannel("A").getbbox()[3]-x.getchannel("A").getbbox()[1] for x in tiles))
            uniform=min((CW-30)/maxwidth,(CH-30)/maxheight)
            fw,fh=max(1,round(isolated.width*uniform)),max(1,round(isolated.height*uniform))
            scaled=isolated.resize((fw,fh),Image.Resampling.LANCZOS)
            # center by torso, place feet on a consistent ground plane
            posx=(CW-fw)//2
            posy=CH-20-fh
            out.alpha_composite(scaled,(col*CW+posx,row*CH+posy))
    target=ROOT/(state+".webp")
    out.save(target,"WEBP",quality=94,method=6,exact=True)
    assert target.stat().st_size>45000,(state,target.stat().st_size)
    for i in range(8):
        f=out.crop(((i%4)*CW,(i//4)*CH,(i%4+1)*CW,(i//4+1)*CH))
        assert f.getchannel("A").getbbox(),(state,i)
    print(state,"4x2",out.size,"bytes",target.stat().st_size,"source",im.size)
print("PASS 64 boss frames; consistent 512x544 RGBA cells; foot-anchored art")
