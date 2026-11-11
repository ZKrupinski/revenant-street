# Project Z control feel integration — 2026-11-11

Base: main e9d610c969ba70b12b1bb2e511d77bfee3f82590. Applies directly to the live index.html entrypoint. Historical play-fixed-20261102.html is not replaced.

## Preserved progression
- JUMP THRUSTER unlocks double jump at rank 3; exactly one extra jump per airborne cycle. New buffered presses never silently spend the midair charge.
- jumpheight and permanent lift preserve their relative impulse/height scaling. The unupgraded first jump is normalized to 150px / 22 rise frames; higher ranks scale its height and duration. Upgrade descriptions now use the normalized height formula.
- jumpspeed still changes airspeed and ground-slam damage/range/push. Double-jump speed multipliers remain unchanged.
- dashrange, dashspeed, exhausted emergency dash, backstep, dash follow-up attack and parry chase remain intact.
- HASTE still scales attack duration; 27-frame normal attacks and frame-15 dodge cancel are the unupgraded reference. Specials retain their original committed durations/cancel restrictions. Normal attack re-press and held chaining remain supported.
- All mod IDs, inventory, saved perma values, economy, damage, skill range/push formulas and save keys remain unchanged.

## Integrated behavior
- A single 60Hz input queue arbitrates keyboard, touch and pad edges; dodge wins over attack and clears pending attack.
- Jump buffer 6 ticks; dodge/attack buffers 5 ticks, including hitstop. Inputs are consumed once. Menus/reset clear pending gameplay inputs.
- Movement accelerates in 6 ticks, reverses in 7 and stops in 4. The original 690px/s run and permanent sprint bonus remain. A nonlinear coast maintains about 6px unupgraded stopping distance instead of reducing run speed to the standalone module's 180px/s.
- Full jump uses calibrated piecewise gravity, minimum tap reaches 55%, apex window is 9 frames; additional gravity calibration is required to achieve 18-frame descent (pure 1.6 gravity alone cannot satisfy all constraints). Upgraded jumps scale in time/height.
- Landing-buffered jump sets velocity in the same collision tick, with no extra integration. Released input immediately uses low-jump velocity.
- Hitstop pauses participants, not the whole world. Contact FX/flash/inputs use the independent 60Hz clock.
- Camera displacement is vector-capped at 11 CSS pixels, 3–5 ticks with damping; repeated hits refresh duration without amplitude accumulation.
- Contact bitmap VFX last 4–6 ticks, alpha <= .7, are small and rendered behind all actors outside the ADD/Bloom pass. Death/status/upgrade bitmap effects are preserved.
- White sprite alpha-mask flash lasts 3 ticks. Original enemy silhouette/alpha remain visible.
- Normal camera has 160px deadzone and a 120px directional target with 22-tick easing. Deadzone freeze has priority; special parry/dash/jump cinematic camera paths remain intact. Z height is not used for ordinary camera Y movement.

## Flat-street geometry
The current belt-scroller has a continuous flat floor, lane-depth Y and jump-height Z. It has no ledges or overhead platforms. No fake ground state or invented terrain was added. Coyote/corner parameters and geometry adapter hooks exist, but there is no natural trigger on this map. A future terrain implementation must provide `__zControlFeel.terrain.supported(x,y,z)` and full-body swept `correctHead({x,y,fromZ,toZ,maxPixels})` queries. The latter must return `{clear,dx}` or `{blocked,z}`; movement is accepted only inside the 5px budget. These adapters do not replace the future terrain solver.

## Tuning
`window.__zControlFeel.config` holds frame/pixel settings. `state()` and `logs()` expose state and assisted-input causes. `setPreset('None'|'Moderate'|'Extreme')` switches immediately. Add `?feeldebug=1` to show a preset selector.

Extreme's requested 50px / 8 frames conflicts with absolute caps. It remains limited to 11px / 4 frames; no hidden unrestricted mode. None turns off hitstop, contact effects, hit flash and camera shake; gameplay upgrades remain active.

## Validation
- `node tests/control-feel-integration.cjs`: actual-source VM integration checks (progression ranks 0–6, permanent lift, double-charge safety, jump height/timing, landing buffer, cancel boundary, hitstop buffer, locomotion, HASTE and contact limits).
- `node tests/keyboard-run-menu-input.cjs`: existing keyboard/menu regression.
- All inline JavaScript blocks parsed successfully.
- Local browser launch was unavailable because the execution environment rejected Chromium's socket creation. Full graphical playtesting is not claimed by these tests.
