# Plate prompts: the format

How every NOMAD room plate prompt is written, so a new plate can be made from any
account or machine. The blocks below come from the newest prompts actually used
(the fold redo, 2026-11-04; indoor wording from the dens set), with the fixed
footing block taken out on 2026-11-05. `scene-art.md` covers wiring a finished plate into the game.

## The rules

- **One plate per prompt.** Batching several in one prompt gives a collage.
- **A ground gets four plates: day, night, night-torch, snow.** Never fog or rain
  plates; fog and rain are laid over the ground by the game. Indoor rooms get
  day, night, night-torch (no snow). Fortress halls that light themselves get one
  night plate lit by their own wall torches.
- **Day is the first shot, with the full prompt.** Night, snow and night-torch are
  short follow-ups that hand back a picture: night and snow hand back the DAY
  picture, night-torch hands back the NIGHT picture.
- **The subject names only what the ground's rooms describe.** Read every room the
  plate will serve; name only their common ground, nothing that belongs to one
  named room. End the subject with a "No ..." line ruling out what must not be
  drawn (no ruins, no house, no tools, nothing lying about, no symmetry).
- **Every subject ends with a Palette line.** It names this place's own dull colours,
  material by material ("Palette: dull green grass, grey chalk, brown earth, dark
  grey fortress stone."). Without it the colours drift brighter than the rest of the game.
- **Every plate needs room for creatures to stand, and that room must look natural.**
  Several creatures and their dead stand side by side on the near ground, so it has
  to be broad, open and easy to walk on, with what stands up placed further back or
  off to one side. Say it in the subject, in this place's own ground, the way the
  place really is, and word it differently for every room ("underfoot the ploughing
  has long since worn away, and the old field spreads out broad and hard and easy to
  walk on, rough short grass with thin patches of bare earth"). Never use a shared
  footing paragraph, and never stage directions like "a strip from edge to edge",
  "its far edge at the middle" or "nothing standing on it": those make every room
  the same picture. Check every subject for this before using it, and if the feature
  the room is named for would fill the near ground, move it further out.
- **A redo keeps the original subject word for word** (the originals are in The
  Plate Book artifact). Remove only the thing that was asked; never redesign, and
  never add a staged footing or apron line to a redo. If a redo has no room for
  creatures, reword its near ground the natural way described below.
- **The torch has no direction.** Light comes from the camera's own position.
- **Never change the constants.** The head, SKY and Door Rule blocks below are fixed.
- File names: `<ground>-day.png`, `<ground>-night.png`, `<ground>-night-torch.png`,
  `<ground>-snow.png`.

## 1. Outdoor ground (sky keyed out in magenta)

### Day (full prompt)

```
Retro dark-fantasy MUD game art in a late-1980s / early-1990s first-person dungeon-crawler style.

Low-resolution 8-bit/16-bit-inspired pixel art with deliberately chunky pixels, hard pixel edges, limited muted color palette, heavy shadows, strong contrast, subtle dithering, restrained highlights, and simple readable silhouettes.

Dark medieval frontier atmosphere: ancient stone, decaying timber, rusted iron, mud, blood, bones, ruined architecture, dead vegetation, worn equipment, torchlight, fog, rain, darkness, and bleak wilderness.

Artwork should feel handmade and functional rather than polished modern concept art. Avoid photorealism, smooth digital painting, modern 3D rendering, excessive detail, glossy materials, cinematic realism, anti-aliased edges, and modern game-art aesthetics.

FRAME LOCK: WIDE LANDSCAPE, 16:10 aspect ratio, 1584x993 pixels. The image is much wider than it is tall. Never square, never portrait, never 4:3.

RESOLUTION LOCK: rendered natively at 320x200 pixels (16:10), then displayed larger. Do not downscale or upscale from a higher-resolution painting. Pixel density must be identical in every asset.

CAMERA LOCK: fixed eye-level first-person viewpoint, horizon exactly at 55% of frame height, moderate field of view, strong central perspective. The environment occupies the full frame.

THE SCENE IS A BACKDROP, NOT A MAP. Do not depict specific navigable exits, doorways or passages as countable or directional. Paths may recede into shadow, fog, or the frame edge. The image shows what the place IS, never where the ways out are.

STAGE LOCK: this is a place you are STANDING IN, not a view you are looking at. The nearest ground must be immediately underfoot and occupy the bottom third of the frame, continuous, and level enough to stand a large animal on. Never a viewpoint over distant country with nothing near the camera. A creature sprite will be composited standing on that near ground at a scale where a man would reach roughly a fifth of the frame height - compose so there is room for it.

NOTHING ALIVE. No people, no creatures, no animals, no birds, no bodies. The world is empty in every plate; anything living is composited in later onto the near ground.

No visible player character, hands, weapon, HUD, text, labels, icons, borders, watermark, or interface elements.

SUBJECT: <THE GROUND> - <what it is, in one line>. One shared backdrop for every room on this ground. Only their common ground - nothing that belongs to one named room.

<Standing in ... : the near ground first, said the way this place really is, broad,
open and easy to walk on with room for creatures to stand, then what is around it
further out or off to one side, then the distance "small with distance". Only things
the rooms describe.> No <...>, no symmetry. Palette: <the muted colours of this place's own materials>.

SKY: every patch of sky - above the skyline and in every gap between branches - is a perfectly uniform flat opaque #FF00FF field. No real sky, clouds, gradient, sun, moon or light in the magenta. Every sky pixel exact #FF00FF, and magenta, pink and purple nowhere in the ground, bark, leaves or flowers.
```

### Night (hand back the day picture)

```
Same picture. Keep <EVERY THING THE SUBJECT NAMES>, the camera, the composition and every object exactly as they are.

Now it is night and there is no light: the whole scene deep blue-black, the near ground just readable, the middle distance reduced to silhouettes, the far ground gone to black. No moon, no torch, no glow, no light source of any kind.

The sky stays exactly as it is: perfectly flat #FF00FF in every sky pixel, untouched.
```

### Night, torch (hand back the NIGHT picture)

```
Same picture as the night one. Keep <EVERY THING THE SUBJECT NAMES>, the camera, the composition and every object exactly as they are.

Now a torch is being carried by the viewer, out of frame: warm orange light comes from the camera's own position and falls evenly on the near ground and the nearest surfaces, bright close to the camera and falling off fast with distance. The middle distance catches only a little of it and the far ground stays dark. No flame visible in the frame.

The sky stays exactly as it is: perfectly flat #FF00FF in every sky pixel, untouched.
```

### Snow (hand back the day picture)

```
Same picture. Keep <EVERY THING THE SUBJECT NAMES>, the camera, the composition and every object exactly as they are.

Now it is snowing AND snow is lying: flakes in the air, snow along every <TOP SURFACE>, the near ground white, drifts banked against <WHAT STANDS UP>, the far ground white and featureless. Everything colder and paler.

REPLACE THE MAGENTA WITH REAL SKY - heavy grey snow sky, no magenta anywhere in the frame.
```

## 2. Indoor room (roofed, no sky)

Day prompt: the same head and SUBJECT layout as above, and in place
of the SKY block:

```
NO SKY AND NO MAGENTA ANYWHERE - this is an enclosed space, opaque to every edge of the frame, filled corner to corner with its walls, floor and dark.
```

Night (hand back the day picture):

```
Same picture. Keep <EVERY THING THE SUBJECT NAMES>, the camera, the composition and every object exactly as they are.

Now it is night and there is no light in the room: everything deep blue-black, the shapes of the room just readable, the corners gone to black. No light source of any kind.

Still no sky and no magenta anywhere - enclosed, opaque to every edge.
```

Night, torch (hand back the NIGHT picture): the outdoor night-torch text, ending
with `Still no sky and no magenta anywhere - enclosed, opaque to every edge.` in
place of the sky line.

## 3. Fortress halls that light themselves

One night plate only. Same head; the subject says the room is "at night, lit only
by two iron wall-torches on the side walls" (or "one on each side wall"), then the
room, then "The near floor is ... level ... running unbroken from the bottom of the
frame to the back wall", then the "No ..." line and the Palette line, then the indoor NO SKY block.

## 4. Gates

A gate gets the same four plates as an outdoor ground (day, night, night-torch,
snow), from the newest gate made (the village smithy, 2026-11-03). File names:
`gate-<room id>-day.png`, `-night.png`, `-night-torch.png`, `-snow.png`.

### Day (full prompt)

The outdoor head (section 1, everything before SUBJECT), then the Door Rule, then
the gate's subject, then SKY exactly as in section 1.

```
THIS PLATE IS A DOOR, AND THE DOOR IS THE SUBJECT. It is one of fourteen places in the world where a wanderer can get in out of the weather, and four rules govern all fourteen.

THE BUILDING IS NOT OPTIONAL. The frame must contain a built structure — stone, timber, turf — with a way INTO it: a doorway a person could walk through, standing open, dark inside. Whatever else the room is named for is the landmark BESIDE that building, never the whole picture. Somebody looking at this image must be able to point at the place they would walk in.

THE KEEPER'S HATCH. Set into the wall of that building, beside the door, a small square shuttered hatch with a lamp burning on a bracket above it. This is the same fitting at every one of the fourteen doors and it is how the place is known.

THE ONE WARM LIGHT. That lamp and the dark of that doorway carry the only warm light in the frame. Everything else is cold: grey stone, wet rock, dead grass, overcast sky. Use #d8a94e for the flame and for nothing else, keep it small, and never let it light the whole scene.

NO SUN AND NO MOON, no shaft of light, no lens flare — those live in the sky picture, not this one. The lamp over the hatch is the only light source in the frame and it stays.

THE GROUND CARRIES THE HOUR. Light the stone, the timber and the road for the time of day being asked for.

THE BUILDING SITS OFF-CENTRE and is not squared to the camera. The near ground stays open and walkable in front of it, per the stage lock. You are outside, on the road or the hill, looking at somewhere you could go in.

NOTHING ALIVE still holds, including whoever keeps the lamp burning. The lamp is the whole of the evidence that anyone is there.

SUBJECT: <THE GATE> - <what it is, in one line>.

<The building standing off-centre on one side, not squared to the camera, then the
named landmark beside it (only what the room's text describes). In the wall facing
the camera, a low doorway standing open and dark into a room behind, and beside
that doorway a small square shuttered hatch with a lamp burning on a bracket above
it. Open ground in the near ground, running off both side edges. Daylight on the
ground.> No <...>. Palette: <the muted colours of this place's own materials>.
```

### Night (hand back the day picture)

```
Same picture. Keep <EVERY THING THE SUBJECT NAMES, including the doorway, the hatch and its lamp>, the camera, the composition and every object exactly as they are.

Change only the light on the ground to night: cold, dim and blue, with no moon and no torch, and the lamp over the hatch now the brightest thing in the picture and throwing warm light onto the wall and the ground around it.

The sky stays exactly as it is: perfectly flat #FF00FF in every sky pixel, untouched.
```

### Night, torch (hand back the NIGHT picture)

```
Same picture as the night one. Keep <EVERY THING THE SUBJECT NAMES, including the doorway, the hatch and its lamp>, the camera, the composition and every object exactly as they are.

Now a torch is being carried by the viewer, out of frame: warm orange light comes from the camera's own position and falls evenly on the near ground and the nearest surfaces, bright close to the camera and falling off fast with distance. The middle distance catches only a little of it and the far ground stays dark. No flame visible in the frame. The lamp over the hatch stays lit exactly as it is in the night picture.

The sky stays exactly as it is: perfectly flat #FF00FF in every sky pixel, untouched.
```

### Snow (hand back the day picture)

```
Same picture. Keep <EVERY THING THE SUBJECT NAMES, including the doorway, the hatch and its lamp>, the camera, the composition and every object exactly as they are.

Now it is snowing AND snow is lying: flakes in the air, the roof white, <the ground> buried, drifts banked against the wall, the far ground white and featureless. Everything colder and paler except the lamp.

REPLACE THE MAGENTA WITH REAL SKY - heavy grey snow sky, no magenta anywhere in the frame.
```

The Door Book artifact is the OLD gate format (magenta #f102fd, fog and rain
plates, no torch plate, 1586x992): never copy constants from it.

## Creature sheets

Never written by hand: `game-server/scripts/mob-prompt.mjs` builds every sheet
prompt (from `game-server/`: `node scripts/mob-prompt.mjs <creature id>`), and
`mob-sprites.md` is the method. Keep the tool's recorded sheet order
(death last), nothing in hands, and verify against the pixels.
