#!/usr/bin/env python3
"""Switch Project Z's red-hood aerial special to its repaired 8-frame bitmap."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def replace_once(path,old,new):
    src=path.read_text()
    if old not in src:
        if new in src:return
        raise RuntimeError(f'Expected existing source missing in {path}: {old[:90]}')
    if src.count(old)!=1:raise RuntimeError(f'Ambiguous patch in {path}: {src.count(old)} matches')
    path.write_text(src.replace(old,new))
html=ROOT/'index.html'
old_source="const image=new Image();image.src='./assets/enemies/redhood-intruder/'+(key==='death'?'death-fullbody.webp':key==='attack'?'attack-fullfist.webp':key+'.png');"
new_source="const image=new Image();image.src='./assets/enemies/redhood-intruder/'+(key==='death'?'death-fullbody.webp':key==='attack'?'attack-fullfist.webp':key==='special'?'special-fullframe.webp?v=redhood-safe-eight-20261101':key+'.png');"
replace_once(html,old_source,new_source)
replace_once(html,
 "if(name==='hit'||name==='death'||name==='attack'){",
 "if(name==='hit'||name==='death'||name==='attack'||name==='special'){")
replace_once(html,
 " special:[440,443,409,436,410,418,407,417]",
 " special:[522,525,491,518,492,500,489,499]")
replace_once(html,
 "   // Hit, rebuilt death and repaired attack atlases retain complete original\n   // pixels.",
 "   // Hit, death, full-fist attack and Crimson Dive have repaired, separated\n   // original bitmap frames: never trim away restored gloves or cape. ")
original=" if(/(?:[?&])elite=preview(?:&|$)/.test(window.location?.search||'')){"
updated=""" if(/(?:[?&])intruder=(preview|entry)(?:&|$)/.test(window.location?.search||'')){
  // Real red-hood QA: preview tests aerial attack; entry tests foreground leap.
  const entryQA=/(?:[?&])intruder=entry(?:&|$)/.test(window.location?.search||'');
  wave=1;p.x=700;p.y=570;cameraX=clamp(p.x-425,0,STAGE_WIDTH-W);
  const red=makeEnemy('intruder',p.x+320,p.y,enemySerial++);
  red.entryDuration=.98;red.entryAge=entryQA?0:red.entryDuration;
  red.entryLandingPlayed=!entryQA;red.entrySide=1;
  red.supportTeam=true;red.supportGroup='redhood-qa';
  red.supportTeamMaxHp=red.maxHp;red.supportTeamSize=1;red.encountered=true;
  red.specialCooldown=entryQA?1.2:0;
  red.cooldown=.25;red.renderX=red.x;red.renderY=red.y;
  enemies=[red];squadIndex=1;supportTriggered=true;
  flash(entryQA?'RED HOOD / 난입 4프레임 검수':'RED HOOD / 공중 특수공격 8프레임 검수',2);
 }else if(/(?:[?&])elite=preview(?:&|$)/.test(window.location?.search||'')){"""
replace_once(html,original,updated)
test=ROOT/'tests/assassin-combat.cjs'
replace_once(test,old_source[old_source.index('image.src='):-1],new_source[new_source.index('image.src='):-1])
# Existing 4 red-hood punch/death/hit tests quoted the exact old conditional.
# Preserve their assertions while adding 'special' to the non-destructive path.
prior_guard="if(name==='hit'||name==='death'||name==='attack'){"
fixed_guard="if(name==='hit'||name==='death'||name==='attack'||name==='special'){"
text=test.read_text()
if prior_guard in text:
    test.write_text(text.replace(prior_guard,fixed_guard))
elif fixed_guard not in text:
    raise RuntimeError('Redhood frame-preservation test guard was not found')
# Death QA asserted the exact old asset selection expression; preserve its
# purpose but account for the additional safe special-animation case.
old_death="key==='death'?'death-fullbody.webp':key==='attack'?'attack-fullfist.webp':key+'.png'"
new_death="key==='death'?'death-fullbody.webp':key==='attack'?'attack-fullfist.webp':key==='special'?'special-fullframe.webp?v=redhood-safe-eight-20261101':key+'.png'"
text=test.read_text()
if old_death in text:test.write_text(text.replace(old_death,new_death))
elif new_death not in text:raise RuntimeError('Death fixture asset-path assertion missing')
old_src="kind==='death'?'death-fullbody.webp':kind==='attack'?'attack-fullfist.webp':kind+'.png'"
new_src="kind==='death'?'death-fullbody.webp':kind==='attack'?'attack-fullfist.webp':kind==='special'?'special-fullframe.webp?v=redhood-safe-eight-20261101':kind+'.png'"
text=test.read_text()
if old_src in text:test.write_text(text.replace(old_src,new_src))
elif new_src not in text:raise RuntimeError('Support roster sprite assertion missing')

print('PASS: red hood real-game atlas swapped, sprite extraction kept complete, QA routes ready')
