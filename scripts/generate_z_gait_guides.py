#!/usr/bin/env python3
"""Bitmap *production reference only* for 16 anatomical Z gait phases.
These colored skeletons must NEVER appear as in-game graphics.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

OUT=Path("assets/project-z-hero/pose-guides")
OUT.mkdir(parents=True,exist_ok=True)
# near (RED) and far (BLUE) legs have distinct hip, knee, shoe positions.
# x increases toward the direction of travel (right).
WALK=[
 ((319,486),(359,610),(185,503),(126,615),0),
 ((280,500),(286,615),(215,486),(227,591),3),
 ((237,519),(253,615),(298,480),(316,572),-3),
 ((209,506),(167,614),(316,489),(351,608),0),
 ((183,503),(130,615),(320,486),(359,610),0),
 ((213,486),(227,591),(280,500),(286,615),3),
 ((298,480),(316,572),(237,519),(253,615),-3),
 ((316,489),(351,608),(209,506),(167,614),0),
]
RUN=[
 ((320,480),(369,618),(176,500),(126,565),0),
 ((254,470),(255,610),(333,422),(360,508),-10),
 ((186,469),(159,553),(324,415),(379,529),-32),
 ((184,487),(155,577),(327,467),(378,604),-15),
 ((180,500),(126,565),(320,480),(369,618),0),
 ((333,422),(360,508),(254,470),(255,610),-10),
 ((324,415),(379,529),(186,469),(159,553),-32),
 ((327,467),(378,604),(184,487),(155,577),-15),
]
FONT_PATH="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
try:
 FONT=ImageFont.truetype(FONT_PATH,21)
 SMALL=ImageFont.truetype(FONT_PATH,15)
except OSError:
 FONT=ImageFont.load_default();SMALL=FONT

def guide(kind,phase,pose):
    near_knee,near_foot,far_knee,far_foot,bob=pose
    im=Image.new("RGB",(512,720),(247,247,244))
    d=ImageDraw.Draw(im)
    black=(26,31,38);near=(214,48,50);far=(42,102,209)
    pelvis=(255,382+bob)
    shoulder=(241+(18 if kind=="run" else 3),218+bob)
    d.rectangle((14,13,498,702),outline=(210,211,213),width=3)
    d.line((23,643,489,643),fill=(149,152,158),width=3)
    # Far and near legs drawn as full hip-knee-foot triangles.
    d.line((pelvis,far_knee,far_foot),fill=far,width=20,joint="curve")
    d.line((far_foot,(far_foot[0]+27,far_foot[1]+1)),fill=far,width=10)
    d.line((pelvis,near_knee,near_foot),fill=near,width=22,joint="curve")
    d.line((near_foot,(near_foot[0]+27,near_foot[1]+1)),fill=near,width=10)
    for xy,color in [(far_knee,far),(near_knee,near)]:
        d.ellipse((xy[0]-11,xy[1]-11,xy[0]+11,xy[1]+11),fill=color)
    d.line((pelvis,shoulder),fill=black,width=40)
    head=(shoulder[0]+13,142+bob)
    d.ellipse((head[0]-31,head[1]-38,head[0]+31,head[1]+38),fill=black)
    d.polygon([(head[0]+18,head[1]-4),(head[0]+53,head[1]+8),(head[0]+16,head[1]+10)],fill=black)
    # True opposite-phase swing, with near/right arm leading in opposite gait.
    lead_near=phase in (2,3,4,5)  # when far/right leg forward, near arm forward
    reach=100 if kind=="run" else 76
    near_elbow=(shoulder[0]+(62 if lead_near else -66),305+bob)
    near_hand=(shoulder[0]+(reach if lead_near else -reach),350+bob)
    far_elbow=(shoulder[0]+(-53 if lead_near else 65),299+bob)
    far_hand=(shoulder[0]+(-reach+15 if lead_near else reach-15),340+bob)
    d.line((shoulder,far_elbow,far_hand),fill=(69,100,151),width=15,joint="curve")
    d.line((shoulder,near_elbow,near_hand),fill=(125,69,74),width=17,joint="curve")
    d.ellipse((near_hand[0]-9,near_hand[1]-9,near_hand[0]+9,near_hand[1]+9),fill=(125,69,74))
    d.ellipse((far_hand[0]-9,far_hand[1]-9,far_hand[0]+9,far_hand[1]+9),fill=(69,100,151))
    d.text((31,29),f"{kind.upper()}  /  FRAME {phase+1:02}",font=FONT,fill=black)
    name=(
        ["L CONTACT","L SUPPORT","R PASS / CROSS","R SWING","R CONTACT","R SUPPORT","L PASS / CROSS","L SWING"]
        if kind=="walk" else
        ["L CONTACT","L TOE-OFF","R KNEE FLIGHT","R PRECONTACT","R CONTACT","R TOE-OFF","L KNEE FLIGHT","L PRECONTACT"]
    )[phase]
    d.text((31,65),name,font=FONT,fill=(12,16,19))
    d.text((31,671),"RED = NEAR/LEFT LEG    BLUE = FAR/RIGHT LEG",font=SMALL,fill=(42,45,48))
    d.text((31,693),"NOT IN-GAME ART - FOLLOW THE POSE",font=SMALL,fill=(79,82,87))
    out=OUT/f"{kind}-f{phase+1:02}.png"
    im.save(out,optimize=True)
    return im

for action,poses in (("walk",WALK),("run",RUN)):
    imgs=[guide(action,i,p) for i,p in enumerate(poses)]
    sheet=Image.new("RGB",(512*4,720*2),(255,255,255))
    for i,im in enumerate(imgs):sheet.paste(im,((i%4)*512,(i//4)*720))
    sheet.save(OUT/f"{action}-8f-contact.png",optimize=True)
    print(action,"generated",len(imgs),"individual phase guides and contact sheet")
