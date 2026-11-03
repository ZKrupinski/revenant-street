#!/usr/bin/env python3
"""Original PROJECT Z cybernetic upgrade UI feedback, purposefully unlike combat Foley.
Only Python standard library; deterministic audible 16-bit PCM mono output."""
from math import sin, pi, exp, tanh
from pathlib import Path
import random
import struct
import wave

SR = 32000
ROOT = Path(__file__).resolve().parents[1] / "assets" / "sfx"
ROOT.mkdir(parents=True, exist_ok=True)

def envelope(t, duration):
    if t < 0 or t >= duration:
        return 0.0
    return min(1.0, t / 0.006) * (1 - min(1, t / duration)) ** 1.30 * exp(-1.2 * t / duration)

def bell(t, begin, freq, duration, level=0.2):
    u = t - begin
    a = envelope(u, duration)
    if a <= 0:
        return 0.0
    # Unmistakably synthetic/glassy UI progression, not a firearm transient.
    phase = 2 * pi * freq * u
    return level * a * (sin(phase) + 0.21*sin(2.012*phase) +
                         0.08*sin(3.71*phase))

def render(kind, filename, seconds):
    rand = random.Random(20261103 if kind == "confirm" else 20261104)
    samples = []
    for i in range(int(seconds * SR)):
        t = i / SR
        if kind == "confirm":
            # Soft servo click then uplifting three-note cybernetic acquisition.
            signal = (bell(t, 0.014, 392.0, 0.32, 0.21) +
                      bell(t, 0.110, 587.33, 0.37, 0.25) +
                      bell(t, 0.246, 880.0, 0.53, 0.29) +
                      bell(t, 0.272, 1760.0, 0.37, 0.043) +
                      bell(t, 0.110, 196.0, 0.47, 0.075))
            click = 0.038 * (rand.random()*2 - 1) * exp(-t*100) if t < .07 else 0
        else:
            # Soft futuristic scan / card reshuffle, NOT a combat impact.
            signal = (bell(t, 0.025, 622.25, 0.20, .16) +
                      bell(t, 0.135, 493.88, 0.23, .17) +
                      bell(t, 0.255, 739.99, 0.37, .20))
            click = 0.018 * (rand.random()*2-1) * exp(-t*95) if t < .06 else 0
        samples.append(signal + click)
    # Short, subtle room reflections distinguish pleasant UI sound from dry shots.
    delay1 = int(SR * 0.097)
    delay2 = int(SR * 0.184)
    mixed = []
    for i, x in enumerate(samples):
        out = x + (0.13*samples[i-delay1] if i>=delay1 else 0) + (
            0.075*samples[i-delay2] if i>=delay2 else 0)
        mixed.append(out)
    max_abs = max(abs(x) for x in mixed)
    assert 0.01 < max_abs < 5, f"silent or invalid {kind}: {max_abs}"
    gain = 0.72 / max_abs
    # Fast fade to absolute silence at the tail; preserve soft transient.
    pcm = bytearray()
    n = len(mixed)
    for i, x in enumerate(mixed):
        fade = min(1, (n-i)/max(1, int(SR*0.05)))
        y = tanh(x*gain) * fade
        pcm.extend(struct.pack("<h", int(max(-.999, min(.999, y)) * 32767)))
    target=ROOT / filename
    with wave.open(str(target), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(SR)
        audio.writeframes(pcm)
    assert target.stat().st_size > 45000
    print(f"{target}: {seconds}s, {target.stat().st_size} bytes, max={max_abs:.3f}")

if __name__ == "__main__":
    render("confirm", "z-ui-upgrade-confirm-v8.wav", .96)
    render("reroll", "z-ui-upgrade-reroll-v8.wav", .68)
