# Room effects: how the plates move

Live effects are drawn over a room plate: torches flicker, wet floors ripple, the torch you carry sways and creatures cast shadows. **The plate itself is never changed.** Everything below is what is needed to rebuild the effects, add them to a new plate, or fix them after a plate is remade.

## What each plate gets

The script decides this from the plate's name and from two hand-kept lists. The client then reads the result, `public/room-fx/fx.json`.

| Plate | Effects |
|---|---|
| Any plate listed in `scripts/plate-fx-torches.json` | Each flame flickers and licks, sized by how near it is. Its bright core pulses, embers rise from it, and dust shows where its light falls. |
| The same plates, except gates and the gatehouse | Low mist on the floor, thicker further back. |
| Plates named in `WET` in `scripts/plate-fx.py`: undercroft, deep-hall, deep-water | The torch reflections on the floor ripple. |
| Every `-night-torch` plate (the light is the one you carry) | The light pool sways and flickers, grit glints at random, and up to four creatures on the stage cast a shadow away from you. A gate's night-torch plate also keeps its lantern. |

Effects are off in text view, for reduced motion, and on any plate being tinted for a different hour. They sit on a layer between the plate and the creatures, and wherever the plate is transparent (a keyed sky) they draw nothing.

## Files

| File | What it is | In git? |
|---|---|---|
| `game-server/scripts/plate-fx.py` | Builds the depth maps and `fx.json` | yes |
| `game-server/scripts/plate-fx-torches.json` | **Where every flame is**, placed by hand and checked by eye | yes |
| `game-server/scripts/plate-fx-check.py` | Draws the markers on the plates so you can check them | yes |
| `game-server/public/room-fx/*.png` | One depth map per plate (white means near), 400 px wide | no, uploads from the working tree like the plates |
| `game-server/public/room-fx/fx.json` | Per plate: torches `[x, y, nearness]`, `w` for wet, `hand` for night-torch | no, same |
| `game-server/src/public.ts` | Client code: the `THE ROOM, ALIVE` block, `fxScene`, and the `scene-fx` / `scene-sparks` canvases | yes |

Keep a copy of `public/room-fx/`, as with the other art folders. A fresh clone can rebuild it by running the script, which takes a few minutes.

## One-time setup

The script needs Python 3 with `onnxruntime`, `numpy` and `pillow`, plus the depth model, **Depth Anything V2 small** (about 100 MB, not in the repo):

```sh
python3 -m venv ~/.plate-fx && ~/.plate-fx/bin/pip install onnxruntime numpy pillow
curl -L -o ~/.plate-fx/depth.onnx \
  https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
```

## Rebuilding the data

From `game-server/`:

```sh
PLATE_FX_MODEL=~/.plate-fx/depth.onnx ~/.plate-fx/bin/python scripts/plate-fx.py
```

It reads `public/room-bg/*.webp` and never writes there. A plate that already has a depth map reuses it, so a rerun only pays the model for new plates. Add `--force` to redo every depth map.

**After any change to the data, bump `FX_V` in `public.ts`.** A player's browser otherwise keeps the old depth maps and index. This is the same rule as `BG_V` for a replaced plate.

## Adding flames to a plate, or fixing them

Flame positions are **written down, not detected**. A colour test was tried first. It found every torch, but also gold coins, bone walls and every reflection in standing water, and it split big flames into several markers. The list in `plate-fx-torches.json` is the fix: plate name → `[[x, y], ...]` in 0–1 picture coordinates, where x is across and y is down.

1. **Check what's there:**
   ```sh
   ~/.plate-fx/bin/python scripts/plate-fx-check.py keep-quarters            # zoomed close-up of each flame
   ~/.plate-fx/bin/python scripts/plate-fx-check.py --whole keep-quarters    # the whole plate with markers numbered
   ```
   Open `output/plate-fx-check.jpg`. It also lists bright spots with no marker. Most are reflections, but any of them could be a torch nobody marked.
2. **Fix the list:**
   - A marker beside its flame: move it onto the **brightest part of the flame**, not the glow on the wall.
   - A flame with no marker: add one.
   - A marker on bare wall: remove it, but look at the whole plate first. A marker off to the side of a real torch should be moved, not dropped.
   - To place one by eye, read the pixel off the `--whole` sheet and divide by the plate's width and height.
3. **Rerun `plate-fx.py`, bump `FX_V`,** and look at the room in the preview.

What went wrong the first time, so it can be checked for:
- Markers 5–50 px off the flame.
- One flame marked twice.
- A torch cut off at the picture's edge left unmarked.
- A real torch dropped because its marker sat beside it.
- Tiny torches at the back of a hall missed altogether.

**Every plate has to be looked at.**

## When a plate is remade

The old flame positions and depth map belong to the old picture. For a remade plate:

1. Rerun `plate-fx.py --force`, or delete that plate's `.png` in `public/room-fx/` first so only it is redone.
2. Run `plate-fx-check.py <plate>` and fix its entry in `plate-fx-torches.json`. Flames almost always move when a plate is regenerated.
3. Bump `FX_V`, as well as `BG_V` for the plate itself.

A **new condition of an existing room** (for example a new `-night` plate) gets no flames until it has its own entry in `plate-fx-torches.json`. The exception is a gate's `-night-torch` plate, whose lantern positions were copied from its `-night` entry and then checked.

A **wet floor** is decided by eye and named in `WET` in `plate-fx.py`. A firelit dry floor and a wet one are the same colour, so no pixel test can tell them apart.

## How it works (client)

- **The layer.** There is one WebGL canvas, `#scene-fx`, over the scene box and under `#mobs`. It draws only the *difference* from the plate, in premultiplied colour: brightening is added colour with no cover, and darkening is cover with no colour. So one pass can do both, and the plate underneath is never re-drawn. Embers and dust are on a second 2D canvas, `#scene-sparks`, blended with `screen`.
- **The hook.** `paintScene` reaches the effects only through `sceneFx.paint(scene, tint)` / `sceneFx.stop()`, guarded with `typeof`. The first room is painted before the effects block has run, and the scene tests lift `paintScene` on its own.
- **Nearness** is each flame's depth divided by the room's nearest flame, with a floor of 0.03. Gate lanterns use raw depth instead, because a door has one lantern and "the nearest of one" made each look like a torch at your elbow. Nearness scales glow radius, embers, and the flame's lick. The lick has a floor, so a small flame at the back of a hall still visibly moves.
- **Your torch.** Each pixel's position in the room comes from the depth map. The light is compared where it is now against where the plate was painted lit from, `(.15, -.35, .05)`, so the near floor changes most and the far end barely at all.
- **Shadows.** Each `.mob` carries `data-id`. The layer reads the sprite's on-screen box and current strip frame, and draws that frame's outline, flipped back along the floor and leaning with the flame.

## Tuning (all in the shader in `public.ts`)

| What | Where | Current |
|---|---|---|
| Torch glow strength | `k = 1. + flickOn * glow * .22` | .22 (reduced at rome's request) |
| Glow size | `r = .012 + .13 * s` | grows with nearness |
| Flame lick | `.0011 + .0011 * s` sideways, `.001 + .0012 * s` up | with a floor for far flames |
| Flame core pulse | `hot * .28` | |
| Embers | `Math.random() < dt * 5` | a few a second |
| Mist density | `* .8` on `m` | |
| Grit glints | `step(.979, g)`, strength `.08 + .29 * b * b` | sparse, random, faint (rome's tuning) |
| Shadow darkness | `a * .7 * (1. - up * .6)` | |

A test to extend if this area changes: `scripts/test-scene-torch.mjs` already paints scenes through the real `paintScene`. The effects block itself was checked in headless Chrome through `/game?src=local`, at about 58 fps with no long tasks.
