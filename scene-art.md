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

  **When a plate genuinely has to break it**, say where its ground is in
  `MOB_LINE` (public.ts). Creatures are centred on 55% of the frame because that
  is the camera lock; the two corries are bowls seen from the edge, so they look
  down across water and their nearest standing ground starts near 72%. At 55% a
  big animal's feet land at 76% and just catch the near terrace, which is how it
  went unnoticed — but a creature is *centred*, not stood, so a hill adder's feet
  land at 58% and it floats over the tarn. The small ones give it away.

  The number is the **centre**; feet land at about centre + half the creature's
  height, and the largest thing in the game is 21% of the frame — which caps the
  line at 72 rather than 80, because at 80 a stag's feet leave the picture.
- **NOTHING ALIVE** because everything living is a sprite, drawn separately.

## The skies are a third recipe

A sky is not a scene. There are eight — `day night dawn dusk moon blood eclipse`
and `after-rain` — and every layered room in the world is painted with its scene keyed above the
horizon and **one shared sky drawn behind it**, so a sky must survive being
cropped by any skyline in the game.

**Which ground each sky stands on** is `SKY_BASE`. Only `day` and `after-rain`
take the day plate; `dawn`, `dusk`, `night`, `moon`, `blood` and `eclipse` all
take the **night** one. Dusk and dawn moved there on 2026-09-08 (rome), and the
reason is worth keeping: the ground goes before the sky does. By the time the
sky is still burning overhead the stone underfoot has already gone — which is
exactly why anyone reaches for a torch at that hour — and a noon photograph
turned down is a bright hillside with noon's own shadows in it, not an evening.
**And they take no ground tint at all** (rome, same day). The hour tint exists
to repair a ground lit for the *wrong* light — a noon hillside standing in after
dark. The night plate is not that: it is the right dark ground for a dark hour,
and the sky behind it is what carries the evening. Washing it warm would be
inventing light that is not reaching the stone. `NO_GROUND_TINT` holds the two,
and deliberately not the family around them — the full moon genuinely lights the
ground, the blood moon genuinely reddens it, and totality genuinely takes the
light away, so those keep theirs.

One number moved as a consequence, not as a choice. The night plates measure
0.591 of their day plates across all sixteen pairs, so dawn's ground fell from
0.74 of day to 0.591 while its *creature* tint stayed at 0.55 — leaving an
animal at 93% of the stone it stands on, which is the sticker-on-a-photograph
failure the mob tints exist to prevent. `#mobs.t-dawn` went to 0.44, which is
the same creature-to-ground ratio the hour had before anything moved.

That gives it constraints a scene does not have:

- **Exactly 1584 x 993**, sky edge to edge. No ground, no horizon line, nothing
  standing up into it.
- **No focal object.** No moon, no comet, no Milky Way, no constellation. Spread
  the interest evenly so every centre, edge and corner survives an arbitrary
  crop — a composition with a subject will have that subject cut in half by some
  room's ridgeline.
- **The bottom 15-20% lightens** into thickening pale air toward an implied
  horizon *below* the frame. Never a flat black wall, and never a drawn line.
- **No magenta, purple, pink or red anywhere.** The scenes are keyed on hue and
  the sky sits behind them; a pink cloud is a hole waiting to happen.
- **Opaque, no transparency.** The keying happens in the scene, not here.

Style is the same pixel-art discipline as the plates, stated harder because a
sky is all gradient and gradients are where a generator reaches for smooth
blending: visible ordered dithering through every transition, every cloud edge
stepped and speckled rather than blended, crisp square pixels, no
anti-aliasing, no blur, no depth of field, no painterly brushwork.

Attach the installed skies as pixel-scale reference — but say plainly that
composition and cloud layout are **not** to be reused, or the new one comes back
as a variation of an old one.

The working prompts live beside the art in `output/imagegen/`.

## The sixth condition: a torch in your hand

`night-torch` is the same place at the same hour with a flame you are carrying.
It sits in `TERRAIN_SCENES` and `GATE_PLATE` beside the other five rather than
in the sky list, and that is the whole argument for how it works: **a torch is
ground weather.** What happens in the air is the sky changing behind an
unchanged scene; what happens on the ground is a different photograph. The night
sky over you does not move when you strike a light — the stone at your feet
does.

So the client swaps the plate and leaves the sky alone, and three things follow
that are easy to get backwards:

- **The sky is the base's, never the variant's.** There is no `night-torch.webp`
  in the sky folder and there never will be. Under a full moon or a blood moon
  or totality it is still the torch ground, still that sky.
- **No tint correction.** The hour tint is a fix for *borrowed* ground, and the
  torch plate was shot for this hour. Comparing the variant instead of the base
  would find `night-torch !== night` and hang `t-night` — brightness `.42` — over
  a picture whose entire subject is that it is lit.
- **The creatures go the other way.** Every other hour a sprite is *darker* than
  its ground, because open ground faces the sky and a creature stands edge-on to
  it. A torch is low and near and falls on the upright thing in front of you
  first, so `t-night-torch` is the one tint that goes brighter than its own
  scene. It follows the PLATE, not the flame: on a ground with no torch plate
  cut, nothing is lit by a light the picture cannot see.

A ground that has not been shot this way is simply not listed and keeps its
ordinary night. **As of 2026-09-08 none is waiting**: all eleven mountain grounds
and all five doors carry a torch-lit night, sixteen plates in all. The fallback
still works and is still tested — it is the path a new terrain takes the day it
lands with one photograph.

**Six hours, not one.** `TORCH_HOURS` is its own table because it is a judgement
and not a consequence, and deriving it got it wrong first time: keying on
"is this the night ground" meant a torch lit at dusk did nothing until the clock
rolled over. Nobody waits for full dark to strike a light — you light it because
you can see the dark coming. So `night moon blood eclipse dusk dawn` all show a
carried flame, and the four missing are missing for a reason: plain day has
nothing to show, and fog, rain and snow are whole photographs that carry their
own light and were never shot with a flame in them.

**Compose it as the same photograph.** The light changes; the camera does not.
The keyed skyline of `<name>-night-torch` must sit where `<name>-night`'s does,
because both are cut and the shared sky shows through both — a horizon that
moved would make the sky jump when you strike a light. `key-scene.mjs` measures
this (all fifteen installed plates agree with their night sibling to within
0.14%) and the light lands where it should: the near ground lifts 1.5x to 2.7x
while the far country stays dark.

## An hour can own more than one sky

`SKY_POOL` lets an hour hold a list instead of one file, and which one is up
comes from the **world-day count** the server sends (`worldDay()` — the same
`floor(now / DAY_CYCLE_MS)` the moon phase has always been read from) — **hashed
into the pool, not used as an index** (rome, 2026-09-08). Indexing marched an
hour through its list in order and returned to the same sky every Nth day, which
is a pattern a player learns without meaning to.

It cannot become a real random: one sky over the world is the claim the whole
scheme rests on, and `Math.random()` here would give two people in the same room
two different evenings. So the day is hashed, salted with the hour so day, night,
dawn and dusk stop moving in lockstep. FNV-1a alone was not enough — its low bits
track the end of the string, so `"night:7" % 4` read the last digit almost
directly and produced a permuted cycle, with day and night coming out identical
because they differ only at the *start*. `mix32`, the murmurhash3 finalizer,
pushes the high bits down where a modulo can see them. Measured over 4000 days:
each entry used 976–1030 times against an even 1000, and days four apart match
26% where chance is 25%.

That key is the design, not a detail. There is one sky over this world at any
instant; that is not a saving, it is the claim the whole two-layer scheme rests
on. So a sky may vary, but only on something every player reads the same way and
that changes slowly. Per room would be fatal — walk three steps, get a different
evening, and the world stops being a place. Per session would be quietly worse:
two wanderers in one room describing two different nights.

**Swapping and turning are different permissions**, and conflating them locks a
sky out of something that could never have harmed it.

*Swapping* — showing one hour's picture for another's — is the move that can
lie. `moon`, `blood` and `eclipse` may never do it: a full moon lights the ground
and shuts a door, so its sky is a statement about the world, not a mood.
`after-rain` may not either — an aftermath sky over a plain midday would still be
a lie. Day, night, dawn and dusk assert nothing but the hour and *may*.

**None of them currently does.** Dawn and dusk borrowed each other until
2026-09-08, on the argument that a sky with no sun in it asserts no side of the
day — which is true, and stopped being the point when the new dusk landed at a
mean of 25 against dawn's 85. Half of dawn's pool would have been a sky less
than a third as bright as the other half: not variety, a flicker between two
different times of day. Each hour keeps its own picture now.

What those four hours are free to hold instead is **several pictures of their
own hour**, which is not a swap at all and is what the pools are really for.

*Turning* cannot lie at all. It is the same photograph, the same colour, the
same claim, with the cloud somewhere else. A pool entry may carry one:

```
"night"      as painted        "night/y"    flipped
"night/x"    mirrored          "night/xy"   turned through 180
```

Four turns of a rectangle, and all four are distinct arrangements — `/y` is not
`/xy`, it is `/xy` mirrored. **It costs nothing**: no second file, no download,
no cache entry, because it is a CSS transform on the sky layer alone, and the
keyed ground in front is untouched. Five hours take all four, which is 4 skies
for day, night and after-rain and **8 each for dawn and dusk** — 24 skies out of
eight files. The three calendar skies are left out of turning too, and only
because nobody has asked; there is no argument against it.

**Two of the four invert the light**, and that is a cost worth stating rather
than hiding. Most skies are painted dark at the top and pale toward the bottom —
thickening air near a horizon below the frame; measured, day runs 84→190 and
night 25→93. `/x` leaves that alone and only moves the cloud, so it is free.
`/y` and `/xy` turn it over, and a pale zenith above a dark roof may read as a
lid lit from above rather than as a sky. Deleting the entry is the whole cost of
cutting them.

**`dusk` is the exception, and it was chosen that way** (rome, 2026-09-08). It
replaced a sky that ran 24→86 with one that runs 21 26 28 28 25 — flat, and half
as bright overall — which departs from the lower-edge rule above and was judged
better on the picture rather than on the rule. That is the right way round: the
rule exists to keep skies croppable, and the eye is the authority on whether one
worked. It also makes dusk the one sky whose `/y` and `/xy` turns cost nothing at
all, there being no gradient to invert.

A replacement is installed **over the old filename** — the file is named for the
hour, and a `dusk2` outliving the picture it was numbered against would leave the
game with no `dusk` at all. That means bumping `ART_V`, every time.

The current set, top of frame to bottom:

```
after-rain   97 106 121 142 171    mean 127
day          84  95 127 151 190    mean 130
dawn         36  53  77 110 152    mean  85
moon         47  68  60  62  96    mean  67
eclipse      30  35  37  56 112    mean  54
night        25  30  37  50  93    mean  47
dusk         21  26  28  28  25    mean  25
blood         7  10  11  13  22    mean  13
```

Every pool is now **one file turned four ways** — four skies each for `day`,
`night`, `dawn`, `dusk` and `after-rain`, one each for the three calendar skies.
Twenty in total out of eight files, and every one of them honest about its hour.

To grow a pool: generate the sky, install it, add its name to the list. Nothing
else moves. **Only ever name a file that exists** — a missing sky is a hole in
the world, not a fallback. Prompts for the four not yet drawn are waiting in
`output/imagegen/`: `night-overcast`, `night-clear`, `day-overcast`,
`day-high-cloud`.

## Cutting the sky out

`game-server/scripts/key-scene.mjs` is the one step between a generated PNG with
a flat magenta sky and an installed plate with a hole where that sky was:

```
node scripts/key-scene.mjs <source.png> <plate-name>            # dry
node scripts/key-scene.mjs <source.png> <plate-name> --write
```

Magenta is keyed **by hue**, not by matching one colour: alpha drops wherever
`min(r-g, b-g) > 30`, which survives the compression fringing a flat `#FF00FF`
test leaves behind as a halo, and the same amount comes off red and blue, which
is what stops a pink rim along a skyline. It reports the sky fraction, compares
the skyline against whichever sibling plate is already installed, and writes
webp q92 / alphaQuality 100.

It is **dry by default** and writing overwrites — the same law as the mob strip
builder, and for the same reason.

## A room that is one of one

There are now three ways to name a place, most specific first:

```
ROOM_PLATE    a single room, by its id      the summit, the last shelter
GATE_PLATE    a specific built thing        the fourteen doors
TERRAIN_*     a kind of ground              scree, snow, the corries
```

The middle one exists because a gate is never its hillside. The first exists for
the same reason one step further in: the mountain kept making rooms that are
singular, are not doors, and that the ground rules describe *wrongly* — the Last
Shelter and the Summit Gate both matched `vent` on their warm air and were handed
a bare scree slope, and the Summit matched `snow` and was painted as a snowfield
by a room whose own text says there is no snow in it.

`ART_ROOMS` (zone-data.ts) is the server side and adds a `place` to the status
frame **beside** the terrain, never instead of it — so naming a room there costs
nothing and is reversible: a client with no plate for the id paints exactly what
it painted before. That is the opposite of the `gate:` prefix, which replaces the
terrain outright and may only be used once the plate is cut.

`ROOM_PLATE` (public.ts) is the client side and follows the same law as the other
two: **a name goes in when its plate exists, and not before.**

### A room the weather does not reach

`SHELTERED` names the room plates with a roof on them. It is **not** the same
question as whether the world counts a room indoors: the Last Shelter is a hole
under a fallen block on an open mountain, so it goes dark at night and the cold
finds you there — what stops at the stone is the *picture* of the weather. Rain
cannot change a room with a roof; all it can change is the light in the slot you
see out of, which is a sixth of the frame and not worth three more photographs.

So a sheltered plate takes **no hour or weather correction at all**, and the
creatures standing in it read the plate's own condition rather than the sky
outside. The sky layer is still drawn, which is the whole point: `day` is keyed,
so the shared sky sits behind the plate and shows through the slot, and the hour
turns in a bright band at the far end of a dark hole for the cost of no art
whatever.

Three conditions is the whole set for such a room — `day night night-torch`. The
gatehouse has had this rule since it was painted; it just lived in the old
single-plate branch and never reached the layered one.

**Weather is not nothing under a roof, though** (rome, 2026-09-08). Rain, fog,
snow and the rain's aftermath are dark grey days, and seen from inside a hole
they do two things, neither of which is a wash over the picture: the room goes
**dark**, so it takes its night plate, and the slot goes **grey**, so the
`after-rain` sky is drawn behind it — the one bright overcast sky the game owns,
and the closest thing to weather-seen-from-indoors without shooting three more
plates for a sixth of a frame. A dark hole with grey light in the gap.

`after-rain` is the odd one in that list, because it is not weather at all — it
is a phase, and out on the hill it stays a bright churned grey **day** on the day
ground. Under a roof the distinction stops mattering: overcast is overcast, and a
hole with a slot in it is dim under any of the four.

That carries one more rule with it: **a torch shows wherever the room is dark**,
which under a roof is not the same question as which hour it is. `TORCH_HOURS`
answers it outdoors, where rain and snow are daylit whole photographs — but a
sheltered room in rain has just resolved to its night plate, and a room dark
enough to be drawn at night is a room a flame belongs in. Outdoors that clause
changes nothing, since every hour whose ground is the night plate is already in
`TORCH_HOURS`.

## Where the output goes

Scenes: `game-server/public/room-bg/<terrain>-<condition>.webp`, six conditions
per terrain (`day` `night` `night-torch` `fog` `rain` `snow`) plus the gate
plates (`gate-<name>-<condition>`).

Skies: `game-server/public/sky/<hour>.webp`, eight of them, listed in
`SKY_PAINTED` in `public.ts`. Seven are hours; `after-rain` is the odd one — it
belongs to a weather PHASE, the rain's aftermath, and it exists because the
world already knew the ground was churned to mud while the picture had gone
back to a blue midday. Convert at **webp q92**, the same as every other
asset — that lands a sky around 300-450KB.

Both folders are gitignored and upload from the working tree at deploy — KEEP A
COPY. And replacing a file that already exists means **bumping `ART_V`**, or
every browser keeps the old one.
