# THE ROOM EFFECTS' DATA, read off the plates themselves (rome, 2026-09-25).
#
# The client lays live effects over a plate - its painted torches flicker and
# throw embers, a wet floor ripples, the torch you carry sways - and every one
# of those needs to know something about the PICTURE that nobody wrote down:
# where the flames are, how near each one is, whether the floor is wet, how far
# back each pixel sits. This works it out from the pixels, once, and writes it
# beside them:
#
#   public/room-fx/<plate>.png   a depth map (white = near), small and blurred
#   public/room-fx/fx.json       per plate: its torches [x, y, nearness] and
#                                whether its floor is wet
#
# WHERE THE FLAMES ARE IS WRITTEN DOWN, NOT GUESSED. A colour test found the
# torches and also found gold, bone walls and every reflection in standing
# water, so the positions live in scripts/plate-fx-torches.json, checked by eye
# against each plate. A new torch plate needs its flames added there. The same
# goes for WET below: a firelit dry floor and a wet one are the same colour.
#
# READ-ONLY ON THE PLATES. It opens public/room-bg/*.webp and never writes there.
#
# Run from game-server/, with a Python that has onnxruntime, numpy and pillow,
# and the Depth Anything V2 small model (onnx-community/depth-anything-v2-small,
# onnx/model.onnx) at the path in PLATE_FX_MODEL:
#
#   PLATE_FX_MODEL=/path/to/model.onnx python3 scripts/plate-fx.py
#
# A plate that already has its depth map reuses it, so a rerun after new plates
# land only pays the model for the new ones. --force redoes every depth map.
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

SRC = "public/room-bg"
OUT = "public/room-fx"
DEPTH_W = 400                       # soft effects; a depth map this size is plenty

def depth_session():
    import onnxruntime as ort
    path = os.environ.get("PLATE_FX_MODEL", "")
    if not path or not os.path.exists(path):
        sys.exit("set PLATE_FX_MODEL to the depth-anything-v2-small model.onnx")
    return ort.InferenceSession(path)

def depth_of(sess, im):
    W, H = im.size
    h = 518; w = int(round(W / H * h / 14)) * 14
    x = np.asarray(im.convert("RGB").resize((w, h), Image.BICUBIC), dtype=np.float32) / 255
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    d = sess.run(None, {"pixel_values": x})[0][0]
    d = (d - d.min()) / max(1e-6, d.max() - d.min())
    dh = int(round(DEPTH_W * H / W))
    return Image.fromarray((d * 255).astype(np.uint8)).resize((DEPTH_W, dh), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.2))

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "plate-fx-torches.json")) as fh:
    TORCHES = json.load(fh)
# Floors that are standing water or wet flags, by eye - the ripple is theirs.
WET = {"undercroft-night", "deep-hall-night", "deep-water-night"}

# How near each flame is, against the room's own nearest, read off the depth
# map, and floored so the one at the far end of a hall still shows as a flame.
# A gate's lantern is measured against the depth map as it stands, not against
# the nearest flame in the picture: a door has one lantern, and "the nearest of
# one" made every one of them as big as a torch at your elbow.
def torches(name, depth):
    d = np.asarray(depth, dtype=np.float32) / 255
    dh, dw = d.shape
    out = []
    for x, y in TORCHES.get(name, []):
        near = float(np.median(d[max(0, int(y * dh) - 2):int(y * dh) + 3, max(0, int(x * dw) - 2):int(x * dw) + 3]))
        out.append([x, y, near])
    if out:
        top = 1. if name.startswith("gate-") else (max(t[2] for t in out) or 1)
        for t in out: t[2] = round(max(.03, t[2] / top), 2)
    return out

def main():
    force = "--force" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, "fx.json")
    idx = {}
    sess = None
    names = sorted(f[:-5] for f in os.listdir(SRC) if f.endswith(".webp"))
    for name in names:
        torch_plate = "-night-torch" in name
        night_plate = name.endswith("-night") or name.endswith("-night-flood")
        # ...and any plate whose flames are written down, whatever its condition:
        # the gatehouse is one warm room at every hour, lit by its own hearth.
        night_plate = night_plate or (name in TORCHES and not torch_plate)
        if not (torch_plate or night_plate): continue          # daylight has no flame to carry
        dpath = os.path.join(OUT, name + ".png")
        if night_plate and name not in TORCHES: continue       # no flame painted in it
        if os.path.exists(dpath) and not force:
            dep = Image.open(dpath)                             # the slow half is already done
        else:
            if sess is None: sess = depth_session()
            dep = depth_of(sess, Image.open(os.path.join(SRC, name + ".webp")))
        entry = {}
        if name in TORCHES:
            t = torches(name, dep)
            if t:
                entry["t"] = t
                if name in WET: entry["w"] = 1
        if torch_plate: entry["hand"] = 1
        if not entry: continue                                  # a dark plate with nothing burning in it
        dep.save(dpath, optimize=True)
        idx[name] = entry
        print(name, len(entry.get("t", [])), "torches" + (" wet" if entry.get("w") else "") + (" hand" if entry.get("hand") else ""))
    with open(idx_path, "w") as fh: json.dump(idx, fh, separators=(",", ":"), sort_keys=True)
    print(len(idx), "plates with effects")

if __name__ == "__main__":
    main()
