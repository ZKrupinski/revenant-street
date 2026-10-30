from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/original-z-hf'
SOURCES={
 'walk':'https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261030_031834_f0d5f4b1-d223-4619-a82b-c55ddee565ee.png',
 'run':'https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261030_031909_9b52c004-ab1c-434f-a6cc-b963017f42c2.png'
}
framesets={}
import urllib.request
for kind,url in SOURCES.items():
 target=ROOT.parent/f'{kind}-new.png'
 if not target.exists(): urllib.request.urlretrieve(url,target)
for kind in ('walk','run'):
 im=Image.open(ROOT.parent/f'{kind}-new.png').convert('RGB')
 a=np.array(im); white=np.min(a,axis=2)>225
 labels,n=ndi.label(~white)
 sizes=np.bincount(labels.ravel()); ids=np.argsort(sizes[1:])[-8:]+1
 objects=[]
 for j in ids:
  yy,xx=np.where(labels==j); objects.append((int(yy.min()),int(xx.min()),int(xx.max()+1),int(yy.max()+1),j))
 objects.sort(key=lambda t:t[0]); objects=sorted(objects[:4],key=lambda t:t[1])+sorted(objects[4:],key=lambda t:t[1])
 frames=[]
 for y,x,r,b,j in objects:
  mask=ndi.binary_fill_holes(labels==j)
  # Retain enclosed white fabric and trim the white source fringe.
  mask=ndi.binary_erosion(mask,iterations=1)
  rgba=np.dstack([a,mask.astype('uint8')*255])
  sprite=Image.fromarray(rgba,'RGBA').crop((max(0,x-2),max(0,y-2),min(im.width,r+2),min(im.height,b+2)))
  frames.append(sprite)
 framesets[kind]=frames
# Shared scale preserves body size between upright shuffle and low dash.
scale=1.55
for kind,frames in framesets.items():
 atlas=Image.new('RGBA',(2048,1240))
 preview=[]
 for i,im in enumerate(frames):
  im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
  tile=Image.new('RGBA',(512,620))
  lift= [0,0,7,20,9,0,0,0][i] if kind=='run' else 0
  tile.alpha_composite(im,((512-im.width)//2,600-im.height-lift))
  assert tile.getbbox()[0]>0 and tile.getbbox()[2]<512
  atlas.alpha_composite(tile,((i%4)*512,(i//4)*620))
  bg=Image.new('RGBA',tile.size,(38,43,51,255));bg.alpha_composite(tile);preview.append(bg.convert('RGB').resize((256,310)))
 atlas.save(OUT/f'{kind}-v4.webp','WEBP',lossless=True,method=6)
 preview[0].save(OUT/f'{kind}-v4-preview.gif',save_all=True,append_images=preview[1:],duration=110 if kind=='walk' else 75,loop=0)
 print(kind,len(frames),[f.size for f in frames])
