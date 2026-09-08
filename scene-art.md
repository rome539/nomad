# The room scene prompt

The style block every room plate was generated from. Companion to
`mob-roster.md` (creatures) — **the two are deliberately different styles**, and
mixing them up is how the world stops looking like itself.

Scenes are pixel art. Creatures are not: the chunky-pixel treatment was tested
on a hare and rejected in favour of handmade inked cutouts, so a creature sheet
uses the recipe in `mob-roster.md` instead of this one.

Verbatim, as used:

```
Retro dark-fantasy MUD game art in a late-1980s / early-1990s first-person
dungeon-crawler style.

Low-resolution 8-bit/16-bit-inspired pixel art with deliberately chunky pixels,
hard pixel edges, limited muted color palette, heavy shadows, strong contrast,
subtle dithering, restrained highlights, and simple readable silhouettes.

Dark medieval frontier atmosphere: ancient stone, decaying timber, rusted iron,
mud, blood, bones, ruined architecture, dead vegetation, worn equipment,
torchlight, fog, rain, darkness, and bleak wilderness.

Artwork should feel handmade and functional rather than polished modern concept
art. Avoid photorealism, smooth digital painting, modern 3D rendering, excessive
detail, glossy materials, cinematic realism, anti-aliased edges, and modern
game-art aesthetics.

RESOLUTION LOCK: rendered natively at 320x200 pixels, 4:3, then displayed
larger. Do not downscale or upscale from a higher-resolution painting. Pixel
density must be identical in every asset.

CAMERA LOCK: fixed eye-level first-person viewpoint, horizon exactly at 55% of
frame height, moderate field of view, strong central perspective. The
environment occupies the full frame.

THE SCENE IS A BACKDROP, NOT A MAP. Do not depict specific navigable exits,
doorways or passages as countable or directional. Paths may recede into shadow,
fog, or the frame edge. The image shows what the place IS, never where the ways
out are.

STAGE LOCK: this is a place you are STANDING IN, not a view you are looking at.
The nearest ground must be immediately underfoot and occupy the bottom third of
the frame, continuous, and level enough to stand a large animal on. Never a
viewpoint over distant country with nothing near the camera. A creature sprite
will be composited standing on that near ground at a scale where a man would
reach roughly a fifth of the frame height — compose so there is room for it.

NOTHING ALIVE. No people, no creatures, no animals, no bodies. The world is
empty in every plate; anything living is composited in later onto the near
ground.

No visible player character, hands, weapon, HUD, text, labels, icons, borders,
watermark, or interface elements.
```

## Why each lock is there

- **RESOLUTION LOCK** keeps pixel density identical across plates. Without it
  one plate is secretly a smooth painting and reads as a different game.
- **CAMERA LOCK** at 55% is what lets any sky sit behind any plate. The scene is
  chroma-keyed above the horizon and one of the shared skies is drawn behind it,
  so the horizon has to land in the same place every time.
- **STAGE LOCK** is what makes creature sprites work. Mobs are composited onto
  the near ground at a scale where a man is about a fifth of the frame — a plate
  that looks out over distant country has nowhere to stand them.
- **NOTHING ALIVE** because everything living is a sprite, drawn separately.

## Where the output goes

`game-server/public/room-bg/<terrain>-<condition>.webp`, five conditions per
terrain (`day` `night` `fog` `rain` `snow`) plus the gate plates
(`gate-<name>-<condition>`). That folder is gitignored and uploads from the
working tree at deploy — KEEP A COPY.
