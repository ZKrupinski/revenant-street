# Project Z / Z locomotion: 8F full-body production spec
2026-10-29 / main hero Z (original dark streetfighter suit with red circular cybernetic shoulder armor). Stage for QA first. No automatic sprite replacement until visual pass.

## Nonnegotiable
- Exactly eight different complete redraws per action. 4 × 2 or eight isolated frames. Right-facing silhouette, consistent original identity, no character swap.
- True left/right reversal. A leg is **not** permanently extended backwards; it folds at its knee, passes beneath the hips and becomes the forward leg.
- Arms swing **opposite** their matching leg, shoulders twist gently opposite the pelvis. Footfall must be clear.
- Keep head and costume stable; no separate limb sprites, tweened skeletal cutouts or drawn vector geometry in the game.
- In walking, visible head bob only 2–5px; shoulder yaw ±3–5°, pelvis yaw ∓3–5°, compact arm swing. In running, head bob 6–12px, shoulder yaw ±6–9°, pelvis yaw ∓5–8°, stronger elbow drive and airborne strides.
- Same ground floor, consistent character scale, no chopped arms/hair, transparent or chroma-key background, 8 different poses. Normal combat animation and physics timings untouched.

## Individual walk frames
|F|Near/left leg (RED in guides)|Far/right leg (BLUE in guides)|Arms & shoulder|Hip & mass|
|---|---|---|---|---|
|1|Left front heel strike, knee lightly bent|Right back, bent knee and toe pushing|Right arm forward / left arm back, right shoulder forward 4°|mass ahead, pelvis +4°|
|2|Left planted load-bearing|Right heel lifts, knee flexes|Arms sweep toward center|settle 3px lower|
|3|Left supports under pelvis|**Right knee overtakes left knee; feet pass under body**|Hands pass beside rib cage, shoulders neutral|mass elevated 4px|
|4|Left heel releases|Right swings ahead of hips|Left arm starts forward; right arm moves back|pelvis reverses|
|5|Left back, knee bending and toe-off|Right front heel strike|Left arm forward / right arm back, left shoulder forward 4°|mass ahead, pelvis -4°|
|6|Left heel lifts and knee folds|Right planted load-bearing|Arms swing back toward center|settle 3px lower|
|7|**Left knee overtakes right knee; legs cross beneath hips**|Right supports under pelvis|Hands pass beside ribs, shoulders neutral|mass elevated 4px|
|8|Left swings ahead for next heel strike|Right heel lifts behind with bent knee|Right arm starts forward|pelvis returns to phase 1|

## Individual run frames
|F|Leg motion|Arm/shoulder/torso|Contact|
|---|---|---|---|
|1|Left foot lands forward, right knee bends behind|Right fist forward, left elbow back; torso lean 13°|LEFT contact|
|2|Left pushes off, right knee folds and advances|Near arm drives backwards, far arm comes forward|LEFT toe-off|
|3|Right knee drives clearly past hips, left knee tucked back|Opposite fists, shoulder twist ±8°|AIRBORNE|
|4|Right foot extends toward ground, left knee fully flexed|Arms counter-swing|RIGHT precontact|
|5|Right foot lands forward, left knee bends behind|Left fist forward, right elbow back; torso lean 13°|RIGHT contact|
|6|Right pushes off, left knee folds and advances|Near arm drives forward|RIGHT toe-off|
|7|Left knee drives clearly past hips, right knee tucked back|Opposite fists, shoulder twist ±8°|AIRBORNE|
|8|Left foot extends toward ground, right knee fully flexed|Arms counter-swing to phase 1|LEFT precontact|

## Quality gate
1. Contact frames 1 and 5 must have opposite near/far foot leads.
2. Frame 3 has the right leg passing across; frame 7 left leg passing across; legs cannot simply stay in the same front-back relationship.
3. Same arm cannot stay forwards in all frames; shoulders and pelvis are not frozen.
4. Frame 8 flows back into frame 1 without heel slide or sudden torso jump.
5. Inspect at native resolution, then at in-game sprite size, and at about 8 FPS. Preserve previous assets with an A/B switch and only publish a selected set after explicit visual QA.
