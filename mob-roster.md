# The creature roster — how the animals get made

The generation spec for every mountain creature, and the recipe that produced
them. Companion to `mob-sprites.md`, which covers turning the delivered art into
a working strip.

**Read this first:** the table below is what was ASKED FOR. It is a request, not
a record. The generator delivered a generic six for most ground mammals instead
of the poses specified — which is why a curled sleep and a death pose exist at
all. What actually shipped is the second table. Always check the two against
each other, and against the pixels.

## Write the prompt with the script

Do not assemble one by hand — the subject paragraph has to be the creature's
**exact in-game description**, and the pose set has to match what the world
actually makes that animal do:

```
node scripts/mob-prompt.mjs hill-wolf
```

It pulls the description live from D1, proposes a pose set from the creature's
behaviour sets (a scavenger gets `feed`, a grazer `graze`, a pack caller `call`),
works out the sheet geometry from the pose count, and prints the cut command with
the matching pose names already in the right order. Pass your own poses to
override. Attach an approved sheet as the style reference when you paste it.

The recipe below is what that script emits, written out so it can be checked and
changed.

## The prompt recipe

Every sheet is **six poses, 3 columns × 2 rows, landscape 1536×1024, cells
512×512**, read left to right then top row to bottom. The drakes are the
exception (three sheets, 14 poses).

A working prompt has these blocks, in this order:

**1 · Style, by reference not description.** Attach an approved sheet and say it
is STYLE REFERENCE ONLY. The house style is: handmade dark ink contours, etched
crosshatching, dry muted mineral browns and greys, bone highlights, subdued
colour — an old dungeon-crawler bestiary remastered as crisp illustrated cutout
art. Explicitly *not* photographic, *not* smooth painted or 3D, *not* cartoon,
*not* voxel. Species anatomy stays authentic.

**2 · Subject, quoting the game.** Name the animal and paste its exact in-game
description. The prose already encodes how the thing carries itself, and the
generator uses it.

**3 · Sheet geometry.** Equal cells, generous blank gutters on all four edges of
every cell, every wing/tail/limb/carried item fully inside its own cell, never
crossing a row or column boundary.

**4 · Camera and scale — the paragraph that matters most.** Consistent eye-level
three-quarter camera, facing consistently one way. Consistent physical body scale
across all six poses, sized to fit the widest wingspan. Stable proportions and
markings. Feet aligned near the lower edge in ground poses; flight bodies
centred. Get this wrong and the creature changes size between frames, which no
amount of packing can fix.

**5 · MAGENTA background.** Pure opaque solid `#FF00FF` everywhere outside the
creature. Tested against a transparent background and magenta works better —
do not "improve" this. The cutter keys on hue (`min(r-g, b-g) > 30`), so the
background must be saturated magenta and nothing in the creature may be.

**6 · The six poses, numbered.** Say what each one is, in reading order.

**7 · The banned list.** No invented magic, no armour on animals, no fire, smoke,
dust, trails, glows, scenery, cast shadows, text, grid lines, labels, borders.
No humans unless the subject is human. No dragon hybrids.

### When a sheet comes back wrong

Write a correction prompt that states the anatomy positively and at length
rather than listing what to avoid — the gill adder needed "ONE continuous
limbless body, ONE tapering tail, small flat viper head, eyes visible on BOTH
sides, no dragon snout, no paws, no ears, no horns" before it stopped drawing a
dragon. Correction prompts live next to the art as `revision-prompt.txt`.

### Generate at the size it will be shown

The drakes are displayed at ~713px tall on a normal screen and their source ink
is 328px. They are upscaled and soft, and no pipeline step can fix it. Check the
creature's `MOB_SPRITE` height before generating: on-screen px ≈
`MOB_SPRITE × MOB_SCALE × 10.8`. Small creatures are the opposite problem —
several are stored 8× larger than they are ever drawn.

## Handing a finished sheet over

The sheet arrives as one PNG — magenta background, cells in reading order. To
get it into the game:

```
node scripts/cut-mob-sheet.mjs ~/Desktop/hill-wolf.png hill-wolf \
     idle move-a move-b attack rest death
node scripts/build-mob-strips.mjs hill-wolf --patch
node scripts/audit-mob-strips.mjs
```

The pose names you pass ARE the names the game looks for, in the sheet's reading
order — left to right, top row then bottom. Get the order wrong and the creature
attacks with its sleeping pose; there is no way for anything downstream to
notice. The cutter warns on a cell that comes out nearly empty (a misread grid)
or barely keyed (a background that was not magenta).

Then keep the sheet: `output/mountain-mobs/<id>/source.png`. That folder is
gitignored — it is the only copy.

## The spec — six poses, in order

| Mob | Appearance and behaviour | Six poses, in order |
|---|---|---|
| Ptarmigan | Round grey-and-white mottled bird, feathered feet. Holds still, then escapes downhill with an alarm call. | Still; alarm call; takeoff; wings up; wings down; landing |
| Mountain hare | Large hare in transitional brown-and-white coat, black ear tips. Sudden uphill escape. | Sit alert; ears turn; extended bound; gathered bound; defensive kick; rest |
| Snow hare | Mountain-hare variant, white coat with black ear tips. | Sit low; alert; extended bound; gathered bound; defensive kick; rest |
| Red hind | Rangy red-brown female deer. No antlers. Ears move independently. | Watch; graze; walking A; walking B; defensive forehoof strike; flee |
| Red stag | Mature male red deer, broad branching antlers, thick maned neck. Holds his ground. | Stand square; watch; walking A; walking B; lower antlers; antler thrust |
| Feral goat | Matted, rope-like fur, used horns, horizontal pupils, cloven hooves. Sure-footed grazer. | Watch; chew; careful step A; careful step B; lower head; head-butt |
| Old billy | Male goat with felted beard, yellow eyes, scarred backward/outward horns, one split horn. Refuses to retreat. | Stand; watch; heavy step A; heavy step B; lowered-head threat; head-butt |
| Scarp raven | Large blue-black raven. Inspects things repeatedly and rides updrafts. | Watch; head tilt; takeoff; wings up; wings down; glide |
| Old raven | Larger, bold raven. Walks sideways, steals and caches items. | Watch; sideways step; inspect with head cocked; pick up item; carry in flight; cache item |
| Hill fox | Low, quick, bracken-coloured fox with long brush. Hunts nose-down along stones. | Watch; sniff; stalk A; stalk B; pounce; rest |
| Raiding fox | Larger bold fox with patchy flanks. Snatches belongings and escapes. | Watch; approach; snatch pouch; escape extended; escape gathered; rest |
| Snow fox | Small white fox, rounded ears, thick tail. Waits for scraps. | Sit with tail around paws; watch; walk A; walk B; feed; curl asleep |
| Blue fox | Slate-coloured snow-fox variant, hungry and conspicuous. Approaches openly instead of stalking. | Watch; direct trot A; direct trot B; bite; recoil; rest |
| Wildcat | Large broad-headed striped cat, thick blunt ringed tail. Flattens into concealment. | Flattened watch; ears back; stalk A; stalk B; pounce; rest |
| The tom | Dog-sized wildcat, very broad head, thick black-ringed tail. Advances aggressively. | Stand; ears back; advance A; advance B; claw strike; bite |
| Lynx | Grey spotted cat, long legs, broad furred feet, facial ruff, black ear tufts, short tail. Sudden ambush. | Watch; step A; step B; immediate pounce; contact strike; recovery |
| Cave lion | Pony-sized, maneless, bone-coloured cat. Broad low head and powerful jaw. No warning roar. | Concealed low posture; watch; advance; silent pounce; grappling strike; recovery |
| Ermine | Small white stoat with long supple body, short legs, black tail tip. Stands upright to inspect. | Low watch; flowing step A; flowing step B; upright inspection; bite; curl asleep |
| The dancer | Ermine variant. Erratic sideways hops and changes of direction precede a neck bite. | Watch; upright inspection; sideways hop left; sideways hop right; extended neck-bite leap; landing |
| Hill wolf | Lean, long-legged grey wolf with cream throat. Watches side-on and circles slowly. | Watch; lateral step A; lateral step B; turn toward player; bite; retreat step |
| Lead wolf | Larger wolf with massive neck ruff. Stands square while the pack moves around him. | Square watch; head turn; advance A; advance B; bite; hold ground |
| Glutton | Wolverine: low heavy body, dark fur, pale flank bands, small rounded ears, bushy tail. Heavy gait and scavenging. | Watch; heavy step A; heavy step B; feed; bite; rest |
| Old glutton | Larger, slower wolverine with healed damage to the left face and broken front teeth. | Watch; slow step A; slow step B; feed; bite; recovery |
| Hill eagle | Large brown-and-gold eagle. Glides close to rock faces, awkward on the ground. | Ground watch; awkward step; takeoff; glide; talons-forward strike; landing |
| Eagle owl | Lichen-brown barred owl, broad facial disc, huge orange eyes. Silent flight. | Ground watch; head turn; takeoff; wings up; wings down; talons-forward landing |
| Mountain chough | Black bird with curved bright red bill and red legs. Calls and follows intruders. | Watch; alarm call; hop; takeoff; wings up; wings down |
| Bone-breaker | Bearded vulture / lammergeier: narrow wings, long tail, rusty underside. Carries bones upward and drops them. | Ground watch; pick up bone; carrying ascent; carrying glide; release bone; descending glide |
| Bone-dropper | Bearded-vulture variant with conspicuous black bristle beard. Steals objects and drops them onto rock. | Inspect; grasp item; carrying ascent; carrying glide; release item; descent |
| Carrion vulture | Hunched bald-necked vulture. Takes several heavy running strides before launching. | Hunch; running step A; running step B; takeoff; glide; landing |
| Great vulture | Huge vulture that displaces other scavengers. Broad wings and powerful feeding posture. | Stand; spread-wing threat; feed; takeoff; glide; landing |
| Brooding vulture | Low nest defender with wings spread protectively. Stays grounded at its nest. | Brood low; watch; spread-wing threat; short grounded lunge; withdraw; settle |
| Eyrie holder | Nearly human-height territorial raptor. Lands wings-out and lowers its head toward intruders. | Ground watch; head-forward threat; takeoff; glide; wings-out landing; talon strike |
| Gill adder | Short thick bracken-brown snake with dark dorsal zigzag. Front-facing, natural small snake head. | Flat coil; alert; forward slither A; forward slither B; low forward strike; recovery |
| Stone adder | Short thick grey-brown adder with black zigzag. Holds warm ground. No cobra-like rearing. | Flat coil; watch; tighten coil; low forward strike; withdraw; bask |
| Gravid adder | Heavier-bodied pregnant adder. Holds its warm spot rather than fleeing. | Flat heavy coil; watch; defensive tightening; short forward strike; withdraw; bask |
| The herd | Weathered male shepherd in earth-coloured frock coat. Holds a long staff across both hands and turns an absent flock. | Hold staff across body; look along slope; side-step A; side-step B; turn flock gesture; defensive staff shove |
| The milker | Woman crouched with a dry wooden pail between her knees, milking empty air. | Work at rest; hands raised; downward pull; reset grip; glance uphill; shift aside |
| A fold dog | Thin rough black-and-white collie. Runs low, wide herding arcs around an absent flock. | Watch; extended gallop; gathered gallop; turn inward; low herding crouch; rest |
| The last dog | Healthier black-and-white collie. Runs up, drops its chest, raises one paw, and calls uphill. | Watch; extended run; gathered run; chest-down stop; one paw lifted; call uphill |
| The one who stayed | Older shepherd, repeatedly patched frock coat, stick held down alongside his leg. Advances purposefully. | Stand; advance A; advance B; grip stick; strike; recover |
| The butter wife | Older woman with churn between her knees. Works steadily, then freezes midstroke to listen. | Seated work; dasher raised; dasher lowered; midstroke freeze; head turned listening; resume |
| The drake | Approved grey-scaled drake with bone horns/chest and worn wings. Ground sweep, breath windup, flight and dives. | Three-sheet layout, 14 poses — see below |
| The pale drake | Albino rainbow-boa-inspired drake: ivory/cream base, peach/apricot saddle and ring markings, pink-red eyes, restrained rainbow iridescence across scales and wings. | Same three sheets as the drake |

**The drakes** are not a six-pose sheet. They take three: ground, combat and
flight, yielding 14 poses — `idle alert bite sweep inhale breath takeoff up
glide down dive landing hit death`. They are the only creatures with a drawn
`hit` recoil, and the reason the client picks its strike pose from a preference
list (`attack → bite → sweep → breath`) rather than demanding one named
`attack`.

## What actually shipped

Generated from `MOB_ANIM` — regenerate with
`node scripts/audit-mob-strips.mjs` and the builder's row output.

| id | frames | poses in strip order |
|---|---|---|
| `a-fold-dog` | 6 | idle · rest · move-a · move-b · attack · death |
| `bone-breaker` | 6 | idle · carry-bone · up · glide · down · landing |
| `brooding-vulture` | 6 | idle · rest · recover · defend-nest · attack · death |
| `carrion-vulture` | 6 | idle · up · glide · down · landing · attack |
| `cave-lion` | 6 | idle · rest · move-a · move-b · attack · death |
| `eagle-owl` | 6 | idle · up · glide · down · landing · attack |
| `ermine` | 6 | idle · inspect-upright · move-a · move-b · attack · death |
| `eyrie-holder` | 6 | idle · up · glide · down · landing · attack |
| `feral-goat` | 6 | idle · graze · move-a · move-b · attack · death |
| `gill-adder` | 8 | idle · alert · move-a · move-b · attack · recover · death · bask |
| `glutton` | 6 | idle · feed · move-a · move-b · attack · death |
| `great-vulture` | 6 | idle · up · glide · down · landing · attack |
| `hill-eagle` | 6 | idle · up · glide · down · landing · attack |
| `hill-fox` | 6 | idle · rest · move-a · move-b · attack · death |
| `hill-wolf` | 6 | idle · rest · move-a · move-b · attack · death |
| `lead-wolf` | 6 | idle · hold-ground · move-a · move-b · attack · death |
| `lynx` | 6 | idle · rest · move-a · move-b · attack · death |
| `mountain-chough` | 6 | idle · alarm-call · up · glide · down · landing |
| `mountain-hare` | 6 | idle · rest · move-a · move-b · attack · death |
| `old-billy` | 6 | idle · stand-ground · move-a · move-b · attack · death |
| `ptarmigan` | 6 | idle · alert-alarm · up · glide · down · landing |
| `red-hind` | 6 | idle · graze · move-a · move-b · attack · death |
| `red-stag` | 6 | idle · hold-ground · move-a · move-b · attack · death |
| `scarp-raven` | 6 | idle · up · glide · down · landing · attack |
| `snow-fox` | 6 | idle · rest · move-a · move-b · attack · death |
| `snow-hare` | 6 | idle · rest · move-a · move-b · attack · death |
| `stone-adder` | 7 | idle · watch · hold-warm-ground · attack · recover · bask · death |
| `the-blue-fox` | 6 | idle · rest · move-a · move-b · attack · death |
| `the-bone-dropper` | 6 | idle · carry-stolen-item · up · glide · down · landing |
| `the-butter-wife` | 6 | idle · listen · move-a · move-b · attack · death |
| `the-dancer` | 6 | idle · twisting-leap · move-a · move-b · attack · death |
| `the-drake` | 14 | idle · alert · bite · sweep · inhale · breath · takeoff · up · glide · down · dive · landing · hit · death |
| `the-gravid-adder` | 7 | idle · watch · hold-warm-ground · attack · recover · bask · death |
| `the-herd` | 6 | idle · keep-the-line · move-a · move-b · attack · death |
| `the-last-dog` | 6 | idle · call-uphill · move-a · move-b · attack · death |
| `the-milker` | 6 | idle · work-pull · move-a · move-b · attack · death |
| `the-old-glutton` | 6 | idle · feed · move-a · move-b · attack · death |
| `the-old-raven` | 6 | idle · steal-cache · up · glide · down · landing |
| `the-one-who-stayed` | 6 | idle · advance · move-a · move-b · attack · death |
| `the-pale-drake` | 14 | idle · alert · bite · sweep · inhale · breath · takeoff · up · glide · down · dive · landing · hit · death |
| `the-raiding-fox` | 6 | idle · snatch-escape · move-a · move-b · attack · death |
| `the-tom` | 6 | idle · rest · move-a · move-b · attack · death |
| `wildcat` | 6 | idle · rest · move-a · move-b · attack · death |
**The birds were redone at eight poses on 8 September** and every creature on
the hill can now strike and fall. The trade to watch: eight slots spent on
`idle up down glide landing attack rest/feed death` leave no room for the pose
that made the bird itself — the old raven lost its `steal-cache`, the
bone-dropper its `carry-stolen-item`, the ptarmigan and the chough their alarm
calls. **Birds want nine, not eight.**
