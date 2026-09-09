# The creature sprite pipeline

How a drawn pose becomes a creature moving on screen, and the rules that keep it
from breaking. Written down after a session where most of the cost was not the
art or the code but believing labels instead of looking at pixels.

**Making the art is a separate document:** `mob-roster.md` holds the prompt
recipe (sheet geometry, the camera paragraph, the magenta rule, the banned list)
and the per-creature spec — what each animal looks like, how it behaves, and its
six poses in order. Read that before generating; read this before packing.

## The one law

**Verify against the pixels, never against the names.**

Every mistake worth writing down came from trusting a label. `inventory.json`
calls a wolf's second frame `rest`, so it was believed. A table said `n: 6`, so
that was believed too. Both were wrong in ways that a single rendered contact
sheet would have shown in five seconds.

The art does not always follow the brief it was generated from. The mountain
roster was specified with per-creature poses ("turn toward player", "retreat
step") and the generator delivered a generic six for most ground mammals
(`idle` `move-a` `move-b` `attack` `rest` `death`) instead. That happened to be
lucky - a rest and a death pose are more useful than what was asked for - but it
means **a pose list is a request, not a record.** Render the strip and read it.

## What a strip is

One creature is ONE horizontal `.webp`: n frames side by side, all the same box.
The client shows it through a window exactly one frame wide - `background-size:
n*100% 100%`, stepping `background-position-x` - and reads `MOB_ANIM` in
`game-server/src/public.ts` to know how many frames there are, the shape of one,
and which index each named pose sits at.

```
"hill-wolf": { n: 6, aspect: 1.43, f: {"idle":0,"rest":1,"move-a":2,"move-b":3,"attack":4,"death":5} }
```

`MOB_SPRITE` (same file) gives the creature's on-screen height in vh, derived
from its real height in metres against a standing man at 1.75m = 22.

## The pipeline

```
0  node scripts/mob-prompt.mjs <id>          # the prompt, ready to paste
   …generate, then save the sheet as        output/mountain-mobs/<id>/source.png
1  node scripts/cut-mob-sheet.mjs <sheet> <id> <pose> <pose> …
2  node scripts/build-mob-strips.mjs                # DRY RUN, writes nothing
   node scripts/build-mob-strips.mjs --patch        # build + write MOB_ANIM
3  node scripts/audit-mob-strips.mjs               # must pass
4  bump ART_V in public.ts          if an existing filename changed content
5  node scripts/build-mob-preview.mjs              # then serve ./preview
6  look at it                       attack / take a hit / die / sleep buttons
7  node scripts/test-mob-driver.mjs                # the driver, headless
8  tsc --noEmit  +  node scripts/check-served.mjs  # the standing ship gates
```

Step 3 is not optional and step 6 is not optional. The audit catches what is
mechanically wrong, the driver test catches a broken state machine, and only your
eyes catch a pose mapped to the wrong meaning.

The four scripts live in `game-server/scripts/`:

| script | does |
|---|---|
| `mob-prompt.mjs` | writes the generation prompt: real description, right poses |
| `cut-mob-sheet.mjs` | splits a finished sheet into keyed pose PNGs |
| `build-mob-strips.mjs` | packs pose PNGs into strips, prints `MOB_ANIM` rows |
| `audit-mob-strips.mjs` | the invariants below; exits non-zero on any break |
| `build-mob-preview.mjs` | the preview page, driver lifted from `public.ts` |
| `test-mob-driver.mjs` | runs that driver headless against fake creatures |
| `test-build-guard.mjs` | the stale-page guard: reload rules, headless |
| `test-mob-paint.mjs` | what paintMobs builds, against a DOM stub |

## The invariants the audit enforces

| check | what it prevents |
|---|---|
| width divisible by n | the window landing between two frames |
| declared aspect == measured, within 0.01 | **every** frame stretched |
| exactly one pose name per frame | the map and the file having drifted |
| every index inside the file | a blank frame |
| drawn but not shipped | art existing that the strip never carries |

That last one is the highest-value check in the file. It is what found both
drakes shipping 8 of their 14 drawn poses - `bite`, `sweep`, `inhale`, `breath`,
`takeoff` and a real `hit` recoil were all missing, so the hill's two bosses
stood inert while they killed you.

## Traps, each of which cost real time

- **One coordinate frame per creature.** Crop every pose by the SAME rect (the
  union of their ink). Cropping each to its own bbox looks correct frame by
  frame and swims horribly in motion.
- **Pad to a common canvas first, bottom-aligned.** Canvas size can differ
  *within* one creature - the drake's ground poses are 768x512 and its flight
  poses 768x640. Skip this and extract throws `bad extract area`, or the feet
  drift between frames.
- **State the width, never derive it.** The client sets the element's width from
  `MOB_SPRITE * MOB_SCALE * aspect` and `flex: 0 0 auto`. Let flex or
  `aspect-ratio` decide the box and every frame in the row is squeezed.
- **`sharp` caches by path.** Reading metadata from a file you just overwrote
  returns the OLD metadata. Both scripts call `sharp.cache(false)`; do not remove
  it. This shipped a wrong aspect once, minutes after being fixed.
- **Never hand-copy the driver.** The preview generator extracts `poseAt`,
  `mobBeat`, `stepAnims`, `applyRest` and the constant blocks out of `public.ts`
  by brace-matching. An earlier hand-copied version drifted and spent a session
  showing animations the game did not have.
- **A blanket rebuild is opt-in and skips foreign art.** The builder writes
  nothing without `--write`, because a "dry run" that quietly replaced 43 strips
  is not a dry run - it did that once. Creatures whose shipped art was drawn
  outside the studies folder are listed in `FOREIGN` and skipped by a blanket
  run; name one explicitly to rebuild it on purpose. The studies hold an older,
  different-looking version of those same animals, and a blanket rebuild silently
  swapped the good art for it.
- **A blow is not always called `attack`.** The client picks from preference
  lists, so art that names its poses differently still works:
  `STRIKE_POSES = attack, bite, sweep, breath` · `HIT_POSES = hit` ·
  `SLEEP_POSES = rest, bask, hold-warm-ground, hold-ground, feed`. Add to those
  lists rather than renaming somebody's art.
- **The art is gitignored** (`game-server/public/mob/`) and uploads from the
  working tree at deploy. A fresh clone has these scripts but not their input, and
  can deploy the game without pictures. KEEP A COPY.
- **A page open across a deploy goes stale, and now knows it.** The client is
  stamped with a hash of the page it was served and the room frame carries the
  world's; when they part it reloads — out of combat only, and once. Any change
  to `public.ts` moves that hash, so nothing has to be remembered. Server-only
  changes don't move it, which is right: the client has no reason to reload.
- **`ART_V` bumps only when an existing filename's content changes.** A brand
  new filename needs no bump. A bump re-uploads every asset - that is the slow
  deploy, several minutes.

## What drives the poses at runtime

The world tells the client; the client never parses prose to guess.

```
ctx frame     mobs: [ids]        which creatures the room paints (max 4)
              dead: [ids]        bodies lying in it (max 3)
              rest: [ids]        which of them are lying up
beat frame    swung: [ids]       struck the player this round
              struck: [ids]      the player hit them this round
              died:  [ids]       went down
```

`swung`/`struck` are buffered and flushed **once per combat round, after the
creatures have answered** - a dogpile landing four times in a beat should move
each creature once, and flushing before the creature pass draws their blows a
full round late. `died` is sent immediately instead, because the room frame that
removes the creature follows right behind it and the client needs the death first
to know to hold the body (`DEATH_S`, 1.1s) before repainting the row.

Only players with pictures are sent any of this.

## Where it stands

43 animated · 38 can strike · 32 can die · 19 have a real lying-up pose ·
2 have a drawn recoil (the drakes; everything else shakes its idle pose).

**Eleven flying birds have no death frame drawn** - their six-pose sheets spent
the last slot on `landing`, so they still vanish rather than drop:

    bone-breaker  carrion-vulture  eagle-owl  eyrie-holder  great-vulture
    hill-eagle  mountain-chough  ptarmigan  scarp-raven  the-bone-dropper
    the-old-raven

When more sheets come back, the whole pipeline above is steps 0 through 8.

## The frame is filled by the pose, not by the animal

A sprite's cell is the union bounding box of every pose that creature has, and
the size table scales whatever is inside it. So the number describes **the drawn
extent**, not the creature's notional height — and for anything drawn low in
every one of its poses those are not the same thing.

`the-milker` is the one entry this has bitten (rome, 2026-09-08: she was much
larger than the herdsman). She is crouched at her pail in all six poses, so her
frame holds about 0.6 of a standing woman. Sized at 20 — the height a standing
woman would have — everything about her inflated by the same factor, and the
first thing that inflates is the head: measured, **1.88x the herdsman's**. She
did not read as a woman crouching, she read as a giant crouching.

**Head width is the invariant to check against**, because two humans have the
same head whatever posture they are in. Two cautions from doing it:

- Match against a **typical** figure. The herdsman is drawn long and lanky with
  a small head, so head-matching him alone over-corrected to 10. The butter wife
  is the ordinary build of the two standing humans, and matching her gave 13.
- The metre rule alone was not enough either. A crouched adult is ~1.3m, which
  converts to 16, and at 16 the head still measured 1.47x the herdsman's —
  because posture and the art's own head-to-body ratio are two separate errors
  and this sprite had both.

The general form: **if a creature is drawn low in every pose, size it by a
feature that does not change with posture, not by how tall the animal is when it
stands up.**
