# CHECK THE FLAMES BY EYE. Draws every torch in scripts/plate-fx-torches.json
# as a marker on a close-up of its own plate, so a marker sitting on bare wall
# beside its flame is obvious at a glance. Every mistake in the first pass was
# caught this way and none by any number.
#
#   python3 scripts/plate-fx-check.py                  every plate
#   python3 scripts/plate-fx-check.py keep-quarters    plates whose name contains that
#   python3 scripts/plate-fx-check.py --whole ...      whole plates instead of close-ups
#
# Writes output/plate-fx-check.jpg (output/ is not committed). Run from game-server/.
# Also lists, per plate, bright flame-coloured spots with NO marker near them -
# a torch that was never marked is the other half of what goes wrong.
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
whole = "--whole" in sys.argv
with open(os.path.join(HERE, "plate-fx-torches.json")) as fh:
    T = json.load(fh)
names = [n for n in sorted(T) if not args or any(a in n for a in args)]
if not names: sys.exit("no plate in plate-fx-torches.json matches " + " ".join(args))

def unmarked(n, pts):
    a = np.asarray(Image.open(f"public/room-bg/{n}.webp").convert("RGB")).astype(int)
    H, W, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    hot = (r >= 240) & (g >= 170) & (b <= 190) & (r - b >= 60)
    ys, xs = np.nonzero(hot[: int(H * .6)])          # flames sit above the stage
    miss = []
    for y, x in zip(ys[::7], xs[::7]):
        if all(abs(x / W - px) > .03 or abs(y / H - py) > .05 for px, py in pts) and \
           all(abs(x / W - mx) > .03 or abs(y / H - my) > .05 for mx, my in miss):
            miss.append((x / W, y / H))
    return miss

tiles = []
for n in names:
    im = Image.open(f"public/room-bg/{n}.webp").convert("RGB"); W, H = im.size
    for mx, my in unmarked(n, T[n]):
        print(f"{n}: bright unmarked spot at [{mx:.4f}, {my:.4f}] - a torch, or a reflection?")
    if whole:
        tw = 720; th = int(tw * H / W); c = im.resize((tw, th)); d = ImageDraw.Draw(c)
        for i, (x, y) in enumerate(T[n]):
            d.ellipse([x * tw - 7, y * th - 7, x * tw + 7, y * th + 7], outline=(0, 255, 255), width=2)
            d.text((x * tw + 9, y * th - 6), str(i), fill=(0, 255, 255))
        d.rectangle([0, 0, tw, 14], fill="black"); d.text((3, 2), n, fill="white")
        tiles.append(c)
        continue
    for i, (x, y) in enumerate(T[n]):
        cx, cy = int(x * W), int(y * H)
        c = im.crop((cx - 80, cy - 60, cx + 80, cy + 60))
        ImageDraw.Draw(c).ellipse([75, 55, 85, 65], outline=(0, 255, 255), width=2)
        t = Image.new("RGB", (160, 132), "black"); t.paste(c, (0, 12))
        ImageDraw.Draw(t).text((2, 0), f"{n.replace('-night', '')[:20]} #{i}", fill="white")
        tiles.append(t)

cols = 2 if whole else 9
tw, th = max(t.width for t in tiles), max(t.height for t in tiles)
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (tw * cols, th * rows), "black")
for k, t in enumerate(tiles): sheet.paste(t, ((k % cols) * tw, (k // cols) * th))
os.makedirs("output", exist_ok=True)
sheet.save("output/plate-fx-check.jpg", quality=86)
print(f"output/plate-fx-check.jpg - {len(tiles)} {'plates' if whole else 'flames'}")
