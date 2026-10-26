# THE FOG, BY DISTANCE (rome, 2026-10-26: the fog looked wrong).
#
# The fog was a veil by height on the screen - thick at the top of the picture,
# thin at the bottom - so the tree beside you was washed out at its crown as
# hard as the far wood, and the ground at your feet stayed clear however far it
# ran. Fog does not care how high a thing is, only how far away. So each plate
# gets a FOG MASK worked out from its own depth: near things almost clear, far
# things gone, and the sky (keyed out of the plate) fully fogged. The client
# lays the fog's colour through it (public.ts, #fogveil).
#
#   public/room-fog/<plate>.webp   the mask: black, its alpha is the fog
#   public/room-fog/fog.json       which plates have one
#
# Day and night plates, and their flooded twins. A torch plate is drawn over the
# same ground as its night plate, and the client uses the night mask for it.
#
# The depth comes from the same model and code as plate-fx.py. A plate that
# already has a room-fx depth map reuses it; the rest are cached outside the
# repo in ~/.plate-fx/depth-cache/, so a rerun only pays the model for new
# plates. READ-ONLY ON THE PLATES.
#
#   PLATE_FX_MODEL=~/.plate-fx/depth.onnx ~/.plate-fx/bin/python scripts/plate-fog.py
#
# AND THE TORCH ON THE SNOW (rome, 2026-10-26). Snow has no torch picture, so a
# torch carried through snow at night lit nothing. Every ground with a snow plate
# also has a night-torch plate, and in that picture the only orange is the
# torchlight - everything it does not reach is night blue. So the light is
# where the torch plate is orange (rome's idea, 2026-10-26; it was the torch
# plate less the night plate, which left a glow beside every post the two
# pictures did not paint in quite the same place). It is taken smoothed - the
# light, not the ground it was painted on, or the snow would turn back into
# grass - and saved as a light map the client lets the snow reflect in the
# torch's colour:
#
#   public/room-fog/<ground>-snowlight.webp   black, its alpha is the light
#
# After any change to the masks, bump FOG_V in public.ts.
import importlib.util, json, os, re, sys
sys.dont_write_bytecode = True  # importing plate-fx.py must not leave a __pycache__ in scripts/
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("plate_fx", os.path.join(HERE, "plate-fx.py"))
pfx = importlib.util.module_from_spec(spec); spec.loader.exec_module(pfx)

SRC = "public/room-bg"
FX = "public/room-fx"
OUT = "public/room-fog"
CACHE = os.path.expanduser("~/.plate-fx/depth-cache")

# The curve, tuned by eye against the plates (2026-10-26, made heavier the same
# day at rome's ask): a floor of haze
# everywhere, then fog that climbs steeply only for the genuinely far.
FLOOR, K, P, CAP = 0.18, 3.6, 2.0, 0.97

def fog_mask(plate, depth):
    w, h = depth.size
    d = np.asarray(depth.convert("L"), dtype=np.float32) / 255
    a = np.asarray(plate.convert("RGBA").resize((w, h), Image.BILINEAR), dtype=np.float32)[..., 3] / 255
    far = 1 - d * (a >= 0.5)                 # the keyed sky is as far as anything gets
    f = np.minimum(CAP, FLOOR + (1 - FLOOR) * (1 - np.exp(-K * far ** P)))
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 3] = (f * 255).round().astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")

LIGHT_W, LIGHT_BLUR, LIGHT_FULL = 1000, 14, 120   # read at this width, smoothed, full at this much more red than blue

def snow_light(torch):
    h = round(LIGHT_W * torch.size[1] / torch.size[0])
    im = np.asarray(torch.convert("RGB").resize((LIGHT_W, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(LIGHT_BLUR)), dtype=np.float32)
    i = np.clip((im[..., 0] - im[..., 2]) / LIGHT_FULL, 0, 1)   # orange: red well over blue
    rgba = np.zeros((h, LIGHT_W, 4), dtype=np.uint8)
    rgba[..., 3] = (i * 255).round().astype(np.uint8)
    w = pfx.DEPTH_W
    return Image.fromarray(rgba, "RGBA").resize((w, round(w * h / LIGHT_W)), Image.BILINEAR)

def main():
    force = "--force" in sys.argv
    os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
    sess = None
    done = []
    names = sorted(f[:-5] for f in os.listdir(SRC) if re.search(r"-(day|night)(-flood)?\.webp$", f))
    for name in names:
        out = os.path.join(OUT, name + ".webp")
        if os.path.exists(out) and not force:
            done.append(name); continue
        plate = Image.open(os.path.join(SRC, name + ".webp"))
        cached = os.path.join(CACHE, name + ".png")
        fx = os.path.join(FX, name + ".png")
        if os.path.exists(fx): depth = Image.open(fx)
        elif os.path.exists(cached): depth = Image.open(cached)
        else:
            if sess is None: sess = pfx.depth_session()
            depth = pfx.depth_of(sess, plate); depth.save(cached)
        fog_mask(plate, depth).save(out, "WEBP", lossless=True, quality=100)
        done.append(name)
        print(name)
    lights = 0
    for f in sorted(os.listdir(SRC)):
        if not f.endswith("-snow.webp"): continue
        base = f[:-len("-snow.webp")]
        torch = os.path.join(SRC, base + "-night-torch.webp")
        if not os.path.exists(torch): continue
        out = os.path.join(OUT, base + "-snowlight.webp")
        if force or not os.path.exists(out):
            snow_light(Image.open(torch)).save(out, "WEBP", lossless=True, quality=100)
            print(base, "snow light")
        done.append(base + "-snowlight"); lights += 1
    with open(os.path.join(OUT, "fog.json"), "w") as fh: json.dump(done, fh, separators=(",", ":"))
    print(len(done) - lights, "fog masks,", lights, "snow lights")

if __name__ == "__main__":
    main()
