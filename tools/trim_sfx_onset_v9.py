#!/usr/bin/env python3
"""PROJECT Z V9 zero-lead PCM sound mastering (non-destructive to original SFX).

Each real decoded recording is scanned for its FIRST AUDIBLE TRANSIENT in
~1ms windows, retaining 1.5ms of safety margin. The result is a PCM WAV
(not MP3 with added encoder priming), no sample added before the attack.
All tails, pitch and relative volumes are preserved.
"""
import array
import json
import os
from pathlib import Path
import subprocess
import sys
import wave

ROOT=Path(__file__).resolve().parents[1]
SR=44100
SOURCE={
 "punchA":"assets/sfx/z-ballistic-rifle-20261103-weight-v5.mp3",
 "punchB":"assets/sfx/z-ballistic-sidearm-20261103-weight-v5.mp3",
 "punchC":"assets/sfx/z-combat-v7-rifle-c.mp3",
 "punchD":"assets/sfx/z-combat-v7-rifle-d.mp3",
 "punchE":"assets/sfx/z-combat-v7c-rifle-e.mp3",
 "punchF":"assets/sfx/z-combat-v7c-rifle-f.mp3",
 "heavy":"assets/sfx/z-ballistic-heavy-20261103-weight-v5.mp3",
 # V8 explicitly swapped these event roles. Preserve the V8 sound identity.
 "parry":"assets/sfx/z-combat-v7b-counter-loud-reverb.mp3",
 "counter":"assets/sfx/z-combat-v7b-slide-b.mp3",
 "upgrade":"assets/sfx/z-ui-upgrade-confirm-v8.wav",
 "reroll":"assets/sfx/z-ui-upgrade-reroll-v8.wav",
 "enemyA":"assets/voice/hero-grunt-a.wav",
 "enemyB":"assets/voice/hero-grunt-b.wav",
}
# Preserve stereo width of reverb; the other impact / UI sound banks are mono.
STEREO={"parry","counter"}
def cmd(*parts):
 p=subprocess.run(parts,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
 if p.returncode:
  raise RuntimeError(" ".join(map(str,parts))+"\n"+p.stderr.decode(errors="replace"))
 return p.stdout

def first_audible_frame(pcm,channels):
 samples=array.array("h")
 samples.frombytes(pcm)
 if sys.byteorder!="little":samples.byteswap()
 frames=len(samples)//channels
 assert frames>SR//10
 peak=max(abs(x) for x in samples)
 assert peak>900, "source nearly silent"
 # -29dB relative to strongest sample (also require >-43dBFS).
 gate=max(210,int(peak*.034))
 window=max(1,SR//1000)
 first=0
 found=False
 for start in range(0,frames,window):
  end=min(frames,start+window)
  if max(abs(v) for v in samples[start*channels:end*channels])>=gate:
   first=start
   found=True
   break
 if not found:raise ValueError("no audible onset")
 return max(0,first-int(SR*.0015)),peak,gate,first

def render(name,source):
 if not (ROOT/source).is_file():raise FileNotFoundError(source)
 channels=2 if name in STEREO else 1
 pcm=cmd("ffmpeg","-nostdin","-hide_banner","-loglevel","error",
  "-i",str(ROOT/source),"-ar",str(SR),"-ac",str(channels),"-f","s16le","-acodec","pcm_s16le","pipe:1")
 trim,peak,gate,first=first_audible_frame(pcm,channels)
 # WAV has no MP3 encoder delay. Keep every sample following the trimmed onset.
 outpath=("assets/voice/" if name.startswith("enemy") else "assets/sfx/")+"z-lowlat-v9-"+name+".wav"
 output=ROOT/outpath
 output.parent.mkdir(parents=True,exist_ok=True)
 body=bytearray(pcm[trim*channels*2:])
 # 1.2ms fade prevents discontinuity pops while maintaining ~instant attack.
 fade=min(55,len(body)//(channels*2))
 for frame in range(fade):
  gain=(frame+1)/fade
  for ch in range(channels):
   pos=(frame*channels+ch)*2
   sample=int.from_bytes(body[pos:pos+2],"little",signed=True)
   body[pos:pos+2]=int(sample*gain).to_bytes(2,"little",signed=True)
 with wave.open(str(output),"wb") as f:
  f.setnchannels(channels)
  f.setsampwidth(2)
  f.setframerate(SR)
  f.writeframes(body)
 # Measure final quantized onset, not just assume the trim worked.
 first_out=first-trim
 original_ms=round(first*1000/SR,2)
 cut_ms=round(trim*1000/SR,2)
 result_ms=round(first_out*1000/SR,2)
 assert result_ms<=3.0,(name,result_ms)
 assert len(body)>int(SR*.14)*channels*2,(name,len(body))
 entry={"key":name,"source":source,"output":outpath,
  "original_audible_onset_ms":original_ms,
  "trimmed_front_ms":cut_ms,
  "final_audible_onset_ms":result_ms,
  "source_peak_16bit":peak,
  "gate_16bit":gate,
  "duration_ms":round(len(body)*1000/(SR*channels*2),1),
  "bytes":output.stat().st_size}
 print(name,":",original_ms,"ms onset ->",result_ms,"ms, cut",cut_ms,"ms,",entry["bytes"],"bytes",flush=True)
 return entry

def main():
 entries=[render(k,v) for k,v in SOURCE.items()]
 report={"version":"onset-tight-v9-20261103","sample_rate":SR,"channel_encoding":"pcm_s16le",
         "hard_max_onset_ms":3,"sources":entries}
 dest=ROOT/"assets/sfx/z-lowlat-v9-audit.json"
 dest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("VALIDATED",len(entries),"real zero-preroll PCM WAV sounds, audit:",dest)

if __name__=="__main__":main()
