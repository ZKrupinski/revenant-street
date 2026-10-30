#!/usr/bin/env python3
"""Import the twenty previously generated unique 8-frame attack sprite sheets.
Preserve their existing appearance and cell layout; only compress to local WebP.
Do not invent vector art or replace animations with two generic motion sheets.
"""
import io, json, time, urllib.request
from pathlib import Path
from PIL import Image, ImageStat

SOURCES = json.loads("{\"jab\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143239_377aabfb-4869-441d-aca8-683ac72415c9.png\",\"cross\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143239_3240affc-668d-4de5-bef2-d657ad7f6fbf.png\",\"hook\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143239_b6662823-b50f-4340-b103-c0c7140c9db0.png\",\"uppercut\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143240_65c21593-0457-4152-9786-0a85852b320d.png\",\"backfist\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142100_aaf7af68-1a98-43bf-8d58-a1abbe8d29fe.png\",\"hammerfist\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142058_606a896b-d863-4317-9852-0ec304fd3a07.png\",\"spinning_elbow\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142059_a7e54477-eec6-4d34-bd3e-71c668396713.png\",\"rising_elbow\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142058_0f96cd12-f64b-4783-90a0-aa31360716dc.png\",\"superman_punch\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143454_cdd607be-4273-4499-ba4a-f73d16223d1f.png\",\"shovel_hook\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143454_39eb87dc-3f5c-4f5c-8b69-24bd7afea7cf.png\",\"frontkick\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143413_3e64c79d-2b08-4c24-82b7-3699732eeda5.png\",\"roundkick\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143412_9615993d-3bd6-4736-bd20-2551d4eafd7d.png\",\"lowkick\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143414_4b247ac6-c356-4e5c-93f2-a98e3d574f89.png\",\"axe_kick\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142231_e32bd5b7-cfc4-465d-bc6b-1913ac5c831d.png\",\"sidekick\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142059_1d90f1f9-7c20-4d14-8aa5-d6e3a1d9f577.png\",\"spinning_heel\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142107_8b037e9b-4946-44bf-b536-1032a07663a4.png\",\"crescent_kick\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142106_57e0aef6-0cb9-4321-9fc1-2932490f269a.png\",\"diagonal_airkick\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142106_06a14011-996c-4bf6-959f-aead00b2cf71.png\",\"rising_headbutt\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_142105_cb10b9be-877b-4262-b3b1-37ea1debfd53.png\",\"forward_headbutt\":\"https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261028_143455_7872cba8-7103-4d65-a885-82ada5b44dcb.png\"}")
OUT = Path("assets/z-attacks-20")
OUT.mkdir(parents=True, exist_ok=True)
local = {}
failures = {}
for name, url in SOURCES.items():
    print(f"IMPORT {name}", flush=True)
    data = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 ProjectZ-Sprite-Importer"})
            with urllib.request.urlopen(req, timeout=40) as response:
                data = response.read(24_000_000)
            break
        except Exception as exc:
            failures[name] = str(exc)
            time.sleep(min(3, attempt + 1))
    if not data:
        print("FAILED download", name, failures.get(name), flush=True)
        continue
    try:
        im = Image.open(io.BytesIO(data)).convert("RGBA")
        w, h = im.size
        if w < 440 or h < 240 or w % 4 or h % 2:
            raise ValueError(f"not a 4x2 sprite sheet: {w}x{h}")
        fw, fh = w // 4, h // 2
        for i in range(8):
            fr = im.crop(((i % 4) * fw, (i // 4) * fh,
                          ((i % 4) + 1) * fw, ((i // 4) + 1) * fh))
            if max(ImageStat.Stat(fr.convert("RGB")).stddev) < 3:
                raise ValueError(f"empty or blank frame {i} in {name}")
        target = OUT / (name + ".webp")
        im.save(target, "WEBP", quality=94, method=5)
        if target.stat().st_size < 12000:
            raise ValueError("file suspiciously small")
        local[name] = "./assets/z-attacks-20/" + name + ".webp"
        print("SAVED", name, im.size, target.stat().st_size, flush=True)
    except Exception as exc:
        failures[name] = str(exc)
        (OUT / (name + ".webp")).unlink(missing_ok=True)
        print("FAILED validation", name, failures[name], flush=True)
manifest = "/* Original Project Z attacks, only validated 4x2 eight-frame files. */\nwindow.RZ_LOCAL_20_ATTACKS=" + json.dumps(local, ensure_ascii=False, indent=2) + ";\n"
Path("assets/attacks-20.js").write_text(manifest, encoding="utf-8")
(OUT / "import-report.json").write_text(json.dumps({
    "expected": len(SOURCES), "imported": len(local),
    "local": sorted(local), "errors": failures
}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"DONE: {len(local)}/{len(SOURCES)} validated original sheets", flush=True)
if not local:
    raise SystemExit("No images downloaded. Keep original remote references and retry.")
