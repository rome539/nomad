# The depth audit — applying the watchman law

*An audit of where the simulation can get deeper without getting bigger.
2026-08-29. Three read-only surveys (items, mobs, event edges) plus a fixture
pass, measured against design-laws.md. Findings only — nothing was changed.*

## The law, restated

A new thing should change the VALUE of something that already exists before
it adds anything of its own. The best features make the old world deeper,
not bigger. And every coupling must stay a BIAS on a choice — never a
trigger, never a wall, never an unwitnessed show.

## The proof: the law already shipped five times

The philosophy is not new to this codebase — it has five working instances.
The bell door was the sixth, not the first.

| coupling | mechanism | what it re-values |
|---|---|---|
| last-watchman → the bell | tickBell waits for him at the-watch-turret | a killable mob worth keeping alive |
| charcoal-burner → the clamp fire | FIREKEEPERS lights his home room | the wood's only living light |
| road-carrier → the carrier run | tickCarrier hatches him with the satchel | a road event with a face |
| the drake → the shadow | "the shadow IS the animal" | the summit boss owns the mountain's passage |
| the old raven → the barter | feed it, it fetches; kill it, the nest dies | a bird worth feeding, not killing |

Every finding below follows the same shape: borrow a system that exists,
lean on it, and let the value of something already in the world change.

## A. Event edges — the bias surface is three call sites wide

The entire wired arc→arc bias surface is: settled rain charges spate and
fever; fresh corpses charge the wake; the melt charges the spate. That is
all. Meanwhile the fiction claims a dozen more edges the code never
implements. The candidates, ranked:

1. **Bell → boil** [S] — `tickBell`'s own comment says the vermin bolting for
   the warrens "makes a boil likelier... bias, never a trigger," but no
   `chargeBand(z,"warrens","boil")` exists. One call completes the code's own
   stated promise. *The cheapest real edge in the file.*
2. **The moon → the spring tide** [S/M] — the prose claims "the moon sets the
   hour" and "the moon does not roll dice," but `tickTide` never reads
   `moonPhase`: the spring is a flat 0.25 roll on a jittered timer. Bias the
   spring odds by phase (peak at full/new, trough at quarters). This is the
   largest single fiction gap in the event system, and it re-values watching
   the moon — which the moon door has already taught players to do.
3. **Blood moon → wake** [M] — "the dead's moon" never touches the dead.
   On blood-moon nights, lower `WAKE_CHARGE_CORPSES` so the red night
   pre-charges the warrens. The schedule read exists; the charge pattern
   exists; only the edge is missing.
4. **Fever ↔ wake** [M] — both share the graves fiction ("wind off the
   graves" / "the floor gives and something buried pulls up") on adjacent
   bands with no edge. A running fever charges the wake; a wake's fresh
   corpses charge the fever.
5. **Tide → eel-run** [S] — "one water": `eelRunOn` reads only night and
   moon, never the water itself. Gate the run on the making tide, so the
   eels move with the flood.
6. **Mast → rut** [M] — "the rut is the deer's event; this is the FOREST's."
   A full mast floor feeds the deer: mast active could charge the rut.
   (Mast already heals grazers — the seed of the same edge.)
7. **Bell → gloam** [M, weakest] — the aftermath leaves "the halls still
   unsettled" and gloam is the dark that owns a room. The ringing could
   charge the upper band's gloam. Less explicit in the fiction than #1.

**Do NOT wire:** eclipse ↔ drake's shadow — the prose explicitly disclaims it
("not the drake's shadow. It is the sun's own"), and disclaimers are fiction
too. Crows → wake [L] is rejected on geography: carrion birds live on the
outdoor band, the wake lives in the warrens, and a band-crossing charge
would be a new mechanism, not an existing one.

## B. Mobs worth keeping alive — the watchman's siblings

Six mobs map onto real world systems and currently have NO aliveness
coupling. Ranked by thematic strength:

1. **The marrow-cantor → the marrow-song** [M] — `tickSong` roots every
   HOLLOW in the deep and panics the living, yet fires off the POOL clock
   with zero read of the cantor. Gate the song's start on a living cantor at
   his demesne post — the watchman's law told in bone: kill the choir,
   silence the deep's one music. *The cleanest bell-shaped hole left.*
2. **The bellfounder → the pour** [M] — the bell's maker waits by a dead
   mould: "there is no pour. There has never been a pour." While he lives,
   the bell-pit stays warm and a player can finish his cast there: bell-metal
   in, the clapper out (bell-metal is currently a bounty trophy and nothing
   else). Kill him and the pit goes cold — the pour is over forever. Bias,
   never trigger: the pour is optional, and its loss is his death's weight.
3. **The tide warden → the tide's legibility** [M] — he is described as the
   one who "cuts the notch" in the tide marks. His survival keeps the
   half-tide post and far milestone reading the water; kill him and the
   marks go dark — and the tide-tally he drops (already stocked in the tide
   door's box) becomes the only record. Knowledge-as-loot. *Caveat: this one
   brushes law #4 (legibility) — it ships only if the tally reads the water
   where the post has gone silent, so the information is never simply gone.*
4. **The keeper of the holding → the holding** [M] — he bars the mountain's
   hall-floor; his death could open the hall to `settle`, or his survival
   could gate a piece of the homestead economy. One den-sized lever.
5. **The toll clerk → the road's memory** [M] — he already brands travelers
   (MARKERS) and chalks the toll. His death could end the institution: no
   new marks, the chalked board goes blank, and the road forgets faces.
6. **The drowned ferryman → the rope** [M] — the crossing's one moving
   hazard. While he lives the rope stays worked and the drag real; kill him
   and the rope goes slack. Pairs with the hempen cord below.

*Honest caveat:* the crossing's dozen dead-at-work mobs are HOLLOW — dead in
the fiction — so for most of them (drover, eel-cutter, fowler, reed-walker,
refuge-man, scaffold-hand) "aliveness" has nothing left to bias; they hold
witnessed habits and nothing bigger. Only the warden, ferryman, pilot,
miller, mason and widow map onto a real system.

## C. Treasures that promise more than they do

No pure orphans exist — every barter item has at least one role. Three
near-orphans promise a use their descriptions already claim:

| item | the promise in its own prose | the coupling |
|---|---|---|
| `summit-tooth` (22b, one-time ground spawn) | "it did not use them to fight... it used them to carry things a very long way" | the summit beast should drop its own tooth — a real trophy, not vendor trash [S] |
| `glassed-stone` (8b, three spawns) | "one face gone to black glass... sharp enough to open a hand carelessly closed on it" | an obsidian edge: a one-use cutting tool (butcher, carve, cut free) [S] |
| `hempen-cord` (4b, one-time spawn) | "cut through cleanly at one end... it would hold your weight today" | a working rope — pairs with the ferryman's rope, the beam-walk, or lowering into the deep [M] |

And two fixtures whose own text promises an action nothing performs:

- **The bell-buoy** says "you could ring it now, and everything for a mile
  would hear" — there is no way to ring anything in this game. Ringing the
  buoy (and a carried `drowned-bell`, which "still rings, and it rings
  wet") needs one small verb — the raven's `feed` is the template. The
  drowned bell gains a purpose; the buoy's promise is kept. [S/M]
- **The wether-bell's** clapper is wire-bound — "somebody stopped it ringing
  on purpose." Unbinding it could become meaningful only once ringing
  exists; park it until then.

## The shortlist — what to build, in order

*(Built 2026-08-29: items 1–8 shipped — migration 286 + code. The deferred
list below is untouched. Two implementation notes: the summit-tooth joined
the keeper's bounty board rather than a mob drop, because mob_templates has
a single loot row and the board is the trophy institution; and the glassed
stone pays for the wether's bell's unbound clapper, which is the one-use cut
its prose always promised.)*

1. **Bell → boil charge** [S] — one call, completes the file's own promise.
2. **Moon → spring tide** [S/M] — fixes the biggest fiction gap; the moon
   door has already taught the world to watch the sky.
3. **Ring the buoy + the drowned bell** [S/M] — the smallest new verb in the
   game re-values an item and a fixture at once.
4. **Marrow-cantor → the marrow-song** [M] — the deep gets its watchman.
5. **The pour at the bell-pit** [M] — re-values the bellfounder, bell-metal,
   and the pit together; the clapper design already exists from the bell
   door's scoping.
6. **Tide → eel-run** [S] — one read, "one water" made true.
7. **Blood moon → wake** and **fever ↔ wake** [M each] — the graves edges.
8. **summit-tooth** and **glassed-stone** [S each] — make the prose true.
9. Deferred, still good: mast → rut [M], toll clerk [M], keeper of the
   holding [M], ferryman + hempen cord [M], bell → gloam [M].

**Never wired:** eclipse ↔ shadow (disclaimed), crows → wake (band-crossing
would need new machinery), tide-warden → dark marks (unless the tally reads
the water in the post's place — legibility outranks cleverness).
