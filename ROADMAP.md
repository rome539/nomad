# NOMAD Roadmap

*Forward work only — shipped history lives in git log, COMBAT.md, and past
deploys. The major arcs are all live: phases 0–2, the combat audit and its gear
expansion, the living-world island, the world at 100 rooms, fire & light, the
waystation gate, the off-hand trio, **the room-events weather arc + THE TIDE**
(events.ts), **encumbrance as a combat penalty** (burden/clatter + the shield
wall's swing tax), and **PvP with its full anti-grief stack** (blood-on-killer,
witnesses, weak fresh keys). Guiding principle (from the 2026-07-03 simulation
pivot): build systems that create stories, not scripted content. The interface
is friendly; the world is not. What's left is depth on the systems that exist
and the population layer that only real players can fill.*

## Standing design law (rulings that bind future work)

- **Depth through-line:** difficulty and reward climb *together*. The deep is
  where death and the good loot both live. **Gear must never equal safety.**
- **Drop rates:** the spawn is already the gate — the drop shouldn't
  double-gate. Trophies near-certain, signature hide ~half, epics-off-elites
  ~a tenth; spawn rarity does the rest. Exceptions by ruling: the door-signet
  stays 1-in-5 off the King (the one legendary is deliberate myth), and
  counters never sit on an infinite fence faucet (the hyena-mantle precedent).
  Bottom line: loot should feel scarce.
- **No rage-slot-machines:** an affliction may never randomly deny escape.
  Hobble is the model — a flee *timer* (limp clear, exposed, then you're out),
  never a dice-block. Same law behind the man-catcher's PvP rule (vs players
  it hobbles, never holds) and the anti-grief stack (no aggressor-punishing
  dice, ever).
- **Legibility:** the fiction must teach the mechanic — a ward says what it
  wards, a wight's dry skin says it won't bleed, a chip never baits a refusal,
  a wall shield drags the swing it protects and *says so*.
- **Data, not code, tunes:** when a number is too strong, drop it at its source
  (a stat migration), never invent a code multiplier (the stun lesson, 073;
  the block cap, 074).
- **Scope litmus (from the lineage pass):** if an idea makes you ADD a system
  rather than DEEPEN one, it's the trap. Depth per item, never item count.
- **Keep zone.ts lean:** the spine is tick/combat + transport. Verbs live in
  verbs.ts, chips in chips.ts, light in light.ts, maps/journal in lore.ts,
  creature behavior in ai.ts, gate trade in gate.ts, events in events.ts,
  PvP in pvp.ts, constants in zone-data.ts.
- **Floor renewal (agreed 2026-07-12):** **consumables and the starter
  loose-rock regrow deterministically** — the world stays livable and no fresh
  key ever spawns weaponless or lightless (torch stays reliable too). **All
  other renewable floor GEAR appears by RNG-cadence** — a slow tick rolls a low
  chance to place the piece if it's absent, so "sometimes there" is dice, never
  a scheduled take-wait-repeat faucet; keep any built-in ceiling (hammerstone's
  `STONE_GROUND_CAP`). **Mob drops are unchanged** (already per-kill dice). The
  faucet was the root of un-scarce gear ([[nomad-loot-economy]]); this is the
  general cure.

## Open calls (awaiting rome)

- **Sentinel stun-resistance** — proposed after the flanged-mace playtest
  (blunt-ignore-2 zeroes the hound's armor and stun chains it): "three heads,
  one always awake" — the hound can't be stun-locked, or stuns at reduced odds.
  rome: HOLD (2026-07-11). Migration 073 halved stun globally, which took the
  urgency off; revisit only if a hound still stun-locks in play.
- **Stance through death** — RULED NO (rome, 2026-07-17): stance stays as it
  was through death. A corpse that comes back still reckless is the player's
  own posture, kept — not a bug. Closed; don't re-propose.
- **Stance in the status bar** — RULED NO (rome, 2026-07-17): the bar stays as
  it is; stance lives in the doll and the typed reads. Closed; don't re-propose.

## THE WORLD GROWS OUTWARD — the surface expansion *(rome, 2026-08-01; THE ACTIVE ARC)*

The world stops being a fortress and becomes a country. ~966 new rooms hung off
the existing grounds, taking the world from 110 to **~1,076 rooms and ~702
mobs** — a tenfold world. Hand-authored, not generated (rome ruled procedural
out: the rooms read well *because* they're written). Baseline tagged
`world-v1-110` before the first new room, so "the original world" stays a
findable point.

**Where it attaches.** The surface was the thinnest part of the world (20 of 110
rooms; the deep alone is 43) and the part every player meets first. It also had
open edges everywhere — the Waystation and the Mass-Grave are dead ends, and the
Black Fen, Drowned Orchard, Sally Ditch and Hanging Hill all have unclaimed
compass points.

```
   THE WOOD (maze)          THE FORTRESS         THE ROAD EAST
   ───────────────          ────────────         ─────────────
   west/south, off the      the 110 rooms        Waystation ► THE CROSSING
   orchard + black fen      you already have       ► foothills ► slopes
        │                                          ► ridge ► THE SUMMIT ◄ dragon
    ★ THE DENS
   (clearings at the
    wood's near edge)
```

| region | rooms | mobs | density | shape |
|---|---|---|---|---|
| West Road | 30 | 7 | 0.16 | paving → ruts → track → a gap in the trees |
| The Wood | 280 | ~195 | 0.70 | one canopy, few landmarks, genuinely losable |
| The Dens | 60 | ~3 | 0.05 | clearings and holdings; near-empty by design |
| East Road | 45 | 10 | 0.16 | rises for a dozen rooms before the climb |
| The Crossing | 170 | ~100 | 0.59 | the great water; gates the mountain by being a place, not a lock |
| The Mountain | 380 | ~300 | 0.80 avg | five tiers; density CLIMBS with altitude (0.4 foothills → 1.2 ridge) |
| The Summit | 1 | dragon | — | |
| **new** | **966** | **~615** | | |
| **world** | **1,076** | **~702** | | |

**Rulings from the design pass (2026-08-01):**

- **New REGIONS, not new zone-DOs.** `regionOf` gains values; `ZONES` stays
  `["door"]`. This is not just less engineering — it's the difference between
  paying nothing and paying money (see the DO-duration measurement below).
- **Roads get PATROLLERS, not residents.** That's what makes a road a road: you
  meet something *going somewhere*, not something that lives there. Pure data —
  `PATROLS` already does this (`warden-surface` walks the grounds). Roads also
  make natural `MOUTHS`, so migrants come up the road and you pass them.
- **The dragon is an ANIMAL, not a wyrm.** NOMAD's register is dead
  institutions and things that used to be people — a hoard-sitting fantasy
  dragon would be the first borrowed thing in this world. An enormous old
  cold-blooded thing that has held the top of a mountain a very long time and
  needs no reason. Same fight, same fear, different words.
- **Altitude IS the difficulty curve.** The mountain's mob density rises with
  height, so the high ridge is worse than the deep, and you can see how far up
  you are.
- **A den is a HOLDING WITH BUNKS, not a room with an owner.** One-room-one-nomad
  caps housing at 60 forever and locks out the 61st permanently. A claim gives
  you the room; the room has capacity; the holder decides who else gets a key.
  60 doors × ~6 bunks ≈ **360 nomads housed**, while dens stay scarce as
  *property* — which is what keeps rome's own guardrail intact ("does having a
  den make leaving it feel MORE dangerous"). It also makes nomads depend on each
  other: you're not looking for an empty room, you're looking for someone who'll
  take you in.
- **The Crossing gates the mountain.** rome asked whether the climb should be
  sealed like the deep. A crossing is the better gate — a place, not a lock. It
  also brings the water machinery (fishing, drowning, the tide, drowners) to the
  surface, where none of it currently runs.
- **Build the den GROUND now, the den SYSTEM later.** 60 rooms that are
  obviously meant for something, with nothing to claim yet, until the space has
  been walked.
- **SPLIT "is a gate" FROM "is a spawn"** *(rome, 2026-08-01)*. `is_entry` means
  both today, which forces two unrelated decisions to share one flag. At scale
  that breaks: the fortress holds 4 gates in 110 rooms (one per 27) while the new
  world would hold ~3 in 966 (one per 322), so **57% of all deaths would return
  you to the fortress** — including dying at the summit — while 90% of the world
  shared the rest. Add a second column. Gates go where the fiction wants a door;
  spawn points go where the map needs balance; they are not the same places.
- **Respawn stays RANDOM across spawn points** (rome ruled, same day — nearest-gate
  was proposed and rejected). You don't choose where you wash up, and nobody camps
  one gate. With spawn points spread across the world this makes death genuinely
  displacing, which is the intent.
- **NO progression flags on gates.** A "gate you unlock by reaching it" was
  proposed and killed: it's a checkpoint system, and per standing law every
  system here must be simulation-native — real state that changed because
  something real happened, never a meter that fills. A gate is a door that's
  there. What keeps the far country out of reach early is that you cannot
  survive the walk, not a flag on your character.
- **ROAMING DENS on the road** *(rome, 2026-08-02: "do they have dens? i think
  we should have it as rng where they spawn on a road")*. Every creature in the
  game has a HOME — the den it was seeded at, the ground it keeps to. Right for
  a dungeon, wrong for a road: the road's own ruling was PATROLLERS NOT
  RESIDENTS, and a dog that reliably re-appears at the mustering yard is a
  resident with extra steps. Three trips taught you the whole roster's
  addresses. `ROAMING_DENS` (masterless-dog, footpad — NOT the carrier, who
  patrols) now re-roll their den across every room of their band on each
  arrival AND at first placement, gates and hideaways excluded. Went from 3
  fixed rooms per template to any of 28. Territory is unchanged once placed:
  they keep to the ground around wherever they woke. **You never learn where the
  footpads are; you learn that the road has footpads.** Candidate to extend to
  the wood's deer and wolves — not done, rome named the road.
- **Roads carry POINTS OF INTEREST** *(rome, 2026-08-01)* — roughly one every 8
  rooms. Each rides a system that already exists, so they're content, not new
  code: **milestones** you carve your name into (the `wallCarve`/`wallMarks`
  precedent — the road keeps a record of who went up it and didn't come back),
  **wayside shelters** (`is_safe` — a long road becomes "push on hurt or hole
  up"), **wrecked carts** (`ground_spawns` + `caches`, loot with a story
  attached), **wells and fords** (`WATER_ROOMS`/`FISHING_ROOMS` — puts the food
  web on the road, since hyenas already path to water), and **gibbets and
  roadside graves** (ambience + traces, the Hanging Hill's siblings). Model for
  all of it is the Waystation, which was already a road POI before there were
  roads.
  *(Terminology note: "toll-house" is FLAVOUR PROSE in the Waystation's
  description and nowhere else in the world or the code. The system is the
  GATEHOUSE — the safe room behind a gate's door. Don't invent a parallel name.)*

**Open calls (need rome before the wood is built):**
1. ~~**Does the wood lie about direction?**~~ ~~**RULED: THE HYBRID**~~
   **OVERRULED — THE WOOD DOES NOT LIE** *(rome, 2026-08-03: "i think we need to
   change the lying woods into just a regular maze")*. **Mig 149** re-cut all 82
   core rooms as ordinary mazes: each core's rooms laid on a small grid (3×2,
   3×3, 4×3) with a randomised depth-first spanning tree carved through it, both
   directions written for every corridor. **Every exit in the wood now answers
   with its opposite.** Core rooms went from 4 exits each to ~2 (a maze is
   mostly walls), the wood gained **21 dead ends** where it had none, and the
   longest true path inside a core runs 4 rooms (the centre) to 10 (the sunken
   wood and core G). The eleven **SPILLS are cut** — every one landed on a band
   room whose facing side was already a door, so none could be made two-way
   where it stood, and re-hosting them put a core's south exit four rooms away
   in the far north, which is the old disorientation in a new hat. Each maze is
   now entered and left by its own threshold and its own falls. Two other exits
   went too: a west door between cores D and E, and a redundant second door
   between core H and the Boar Ground. **Measured side effect:** 192 exits in
   the world had no return by ANY direction, which failed `exitsSymmetric` in
   `zone.ts buildWorldMaps` and forced the distance cache into strict forward
   lookups **world-wide, dungeon included**. That is now 0, so the reverse
   lookup is valid again. The woodward's round was re-walked to match (a
   depth-first out-and-back, like the surface warden's). Untouched: every room
   id/name/description, all 115 spawns and the depth ladder, the far side's
   arrive-from-underneath shape. *The record of the old design, kept because
   it is why the wood is shaped the way it is:* an honest outer band, a lying
   core. Pure-honest is solvable
   once and permanently (someone posts a route and the maze is a corridor);
   pure-lying makes the dens hostile to reach and stepping off the road feel
   unfair rather than dangerous. Slab 1 built (mig 130): a 5×3 honest lattice
   west of the Gap in the Trees, a threshold column that is the last honest
   ground, and a 6-room lying core. **THE CORE'S DESIGN LAW:** every core room
   carries all four compass exits, and none of them pairs with its opposite. A
   room merely *missing* an east exit would answer "there is no way east from
   here", which announces the trick — the lie has to be that east works
   perfectly and puts you somewhere else. Two rooms spill you back onto the
   honest band (the Turned Ground east, the Heart of It south) at places you
   did not go in by: **you always get out; you never get out where you
   expect.** Verified by script, not by eye — no exit retraces, no core room is
   a trap, the band is symmetric everywhere outside the threshold.
   **SLAB 2 (mig 131): 32 more rooms — 59 of ~280.** The honest lattice went
   from 3 rows to 5 (northern and southern rows, six pockets: a spring head, a
   hunter's stand, a lime kiln, a deer fence, fox earths, a burnt stand), plus
   two more thresholds and TWO more lying cores. **The core pattern is now
   formalised as a RING WITH FIXED OFFSETS** — 8 rooms, `north:+1 east:+3
   south:+5 west:+7` around the ring — which makes the no-retrace law
   arithmetic instead of eyeballed (a→a+1 by north, and that room's south goes
   to a+6, never back). Two exits per core are swapped for spills onto the band
   far from the threshold you entered by. Future slabs: reuse the ring, write
   new prose, done.
   **SLAB 3 (mig 132): 56 more rooms — 115 of ~280.** Two more honest rows (the
   wood is 7 deep now), eight pockets, two thresholds, three more lying cores —
   this time rings of TWELVE (`d_n+d_s = 6`, `d_e+d_w = 10`, neither ≡ 0 mod 12,
   so the law still holds). **NEW STRUCTURE: THE SUNKEN WOOD.** A core that sits
   BELOW the others, reached only by `down` exits added to four rooms scattered
   through three older cores — the ground gives way where you did not choose it
   to — and left by two `up` exits onto honest ground. Being lost now has a
   second stage: lost, and then lower. 4 ways down, 2 ways back up.
   **SLAB 4 (mig 133): 55 rooms — THE MAZE IS CLOSED AT 170.** rome cut the
   target from 280 to 170 (2026-08-02): losability comes from the lying cores,
   not room count, and the extra 110 would have been more honest band.
   Final shape: **82 lying rooms, 88 honest.** This slab added **THE FAR SIDE** —
   31 honest rooms you CANNOT REACH BY WALKING WEST. Its only entrances are
   five `up` climbs out of the sunken wood and out of Core G below it, so you
   reach the far side by going UNDER the maze: you get there by being lost, not
   by deciding to. You can always leave (two rooms lie eastward into cores,
   cores spill onto the band) but you cannot walk back to it deliberately.
   Out there: **the holding** — a ruined moated house, nine rooms, the only
   built thing in the whole wood, and the reason the far side exists. Plus
   CORE G (a second sunken layer, below the sunken wood, leaving only by
   climbing onto the far side) and CORE H (dry scrub, hung off the far side's
   west edge). Verified: every lying room has all four compass points, no
   accidental lies in the honest half, and from all 170 rooms you can still get
   out of the wood entirely.
   **THE WOOD IS PEOPLED (mig 134, 2026-08-02): 115 bodies, 8 templates, 4 new
   items.** The roster's law is **DEPTH — how lost you are.** The fortress
   arranges danger by tier, the road by distance, the mountain will by altitude;
   the wood by how far past knowing-the-way you have gone. Measured against the
   built world: honest band 0.68 density / avg level 2.0 / avg 28 hp → lying
   cores 0.72 / 3.9 / 45 → sunken 0.75 / 4.0 / 70 → the holding, one keeper,
   level 6, 130 hp. 73 of the 170 rooms hold nothing: the wood has to breathe.
   Placement is a deterministic even spread per band (no RNG — the same world
   always places them the same way, and a re-run never quietly reshuffles).
   Roster: roe-deer (RUNNERS+VERMIN, the wood's food), wild-boar (AGGRESSIVE —
   it holds its rooting ground), grey-wolf (SCAVENGERS+STARVE_HUNTERS, PREYS_ON
   roe-deer, so the wood has its own food web you can walk into the middle of),
   **the-follower** (a LURKER — not in the room until it drops on you, which is
   the only honest way to write a thing you never catch sight of; it lives in
   the lying cores, so it finds you exactly when you have stopped knowing the
   way), the charcoal burner, root-things, the mire-walker, and the keeper of
   the holding.
   **THE WOOD FEARS FIRE (rome, 2026-08-03: "most of the mobs... the ones that
   make sense").** `FEARS_FIRE` grew from one dungeon rat to 63 of the wood's 87
   bodies: roe-deer, grey-wolf, wild-boar and root-thing, plus the rare bloods
   (white-roe, dire-wolf, old-boar). An engaged one breaks and runs from an open
   flame — **on a roll each round (`FIRE_FLEE_CHANCE` 0.35), not on sight**
   (rome, same day: "they're running away too much... it should be a chance they
   run away during the rounds"). It shipped absolute, which made a torch a
   no-fight button; now the fire argues with them round after round — 65% still
   on you after one, 42% after two, 27% after three. **Out on purpose:** the charcoal burner (fire is his
   trade), the mire-walker (it comes out of standing water), and the three that
   hold ground — the woodward and the keeper, because a boss that runs from a
   stick isn't a boss. **Left out pending rome:** the-follower and
   something-ahead — it fits the fiction, but 8 of them exist and a torch would
   switch the wood's whole dread off at once. **Why this doesn't flatten the
   wood:** the hooded lantern is NOT fire (the shutter tames it), so the long
   light scares nothing — a torch buys passage but burns out fast and costs your
   shield guard, while hunting for pelts, haunches and tusks now belongs to
   whoever walks in by lantern-light or none. And the MANCATCHER still holds a
   fire-flinch like any other bolt, so torch + barbed collar means the wood
   can't run from you either.
   **WHAT THE WOOD MAKES (mig 153, rome 2026-08-03: "what new gear can we
   introduce with the new mobs... what about the woodward gear you can make?
   what is the keeper dropping?").** Two structural holes closed. The forge's
   seven materials were ALL dungeon trophies, so the wood's eight trophy types
   fed nothing and the bench only paid you for going down; and the wood dropped
   **no armour at all**, in the one zone tuned for fresh keys (mig 148). Six
   recipes now cut in wood materials — wolfskin cloak (a2, hooded), tusk-goad
   (dmg 3, pierces 1), moss-packed jerkin (a2, staunched), white-hide coat (a3,
   wardhide), wolf-skull helm (a2, padded), and **the woodward's coat** (epic,
   a4, wardhide+strapped, 5 scrap + 1 bounds tally, the first use that token has
   ever had). **The keeper stops dropping a graveblade** — an uncommon barrow
   sword from mig 004 that had been standing in as a 130 hp boss's signature —
   and drops **the keeper's wrap**: epic cloak, a2, staunched + hooded. The
   deep's three epics are greatplate, weapon, shield, all heavy; the surface
   answers with a LIGHT capstone, which costs the armour ladder nothing because
   cloaks cap at 2 armour even at epic.
   **TWO NEW TRAITS, both hooks into what the wood taught us.** `staunched` — a
   wound clots a tick sooner (3→2): the FIRST thing in the game that touches
   bleed after it opens, since wardhide/mailward only stop one starting and
   armour cannot help at all (a bleed is subtracted raw — the exact reason the
   surface bosses hit above their damage column, mig 151). `hooded` — a torch
   catches in the rain, which `raining()` had refused flatly in the one region
   that is outdoors end to end. Both joined TRAIT_POOL for their slots, so found
   gear rolls them too.
   **THE LOAD LAW HELD.** I proposed light armour (3 armour at weight 1) and was
   wrong — mig 096 sets weight by formula (body/helm = armour−1) and is
   idempotent, so it would have flattened it on the next run. The wood pays for
   its identity in traits, not in cheap armour; every one of the seven pieces
   matches what 096 would compute. Still unfed on purpose: the mire-walker's
   grave-pearl, and the woodward's axe stays rare at 5 dmg (mig 145's ruling).
   **THE WOODWARD — the maze's boss (mig 135, rome 2026-08-02: "we need a boss,
   a minotaur or equivalent").** NOT a minotaur: same objection as the dragon —
   a bull-headed man out of Greek myth would be the first borrowed thing in this
   world. The woodward was a real office. He kept the wood, walked its bounds,
   took the tools off anyone cutting without right, and answered to a lord dead
   for centuries. He is still doing the job. **What makes him the maze's boss is
   that he WALKS it** — a closed six-room circuit of the centre core (`PATROLS`),
   the one core you cannot navigate. He walks it correctly, forever. You are lost
   in his rounds. 145 hp / 7-11 through armor 3 / bleed + stun — the hardest
   thing on the surface, above the keeper of the holding and below the king. The
   real danger is WHERE the fight is: you cannot break off in a straight line
   because there are no straight lines in there. Drops the woodward's axe (9 dmg,
   sweep 2, 18 barter) and a bounds tally.
   **ENGINE CHANGE THIS NEEDED: a boss with a route walks it.** Bosses stand
   where they live (the king in his hoard, the hound on its threshold) because a
   wandering boss drifts off the thing it guards — every wander caller gated on
   `!tmpl.is_boss`. Now `(!tmpl.is_boss || PATROLS[tmpl.id])`: a boss's route IS
   where it lives. No existing boss has a route, so nothing else changes.
   **TWO BUGS FOUND BY WALKING IT, both fixed:**
   1. **NO MOUTHS OUTSIDE THE FORTRESS.** A migrant surfaces at the mouth
      *nearest its den* and walks in — and every mouth was in the old world, so
      every wolf, boar and root-thing would have been born in the fortress
      grounds and marched 40–90 rooms to get home. The wood would sit silent for
      hours while the grounds filled with things that don't live there. Added 13
      mouths across road, band, cores, sunken layers and far side — each one
      somewhere a thing could come out of unseen (burrows, brakes, a quarry, an
      earth-fall), never open ground.
   2. **`listen` answered "stone, and a far-off drip" in a wood.** The dungeon's
      silence was answering for the whole world. Now region-aware.
   *Note for whoever checks this next:* a core ring DOES contain returns via
   different directions (east then south can loop you back). That is fine and
   invisible — the invariant that matters is that REVERSING a step never
   retraces. A checker keyed on "any return at all" reports 17 false positives.
2. **Six bunks per den** — confirm or change.
3. **How many spawn points, and where** — once the gate/spawn split exists, this
   is a placement decision, not a density accident.

**Engineering: DONE.**
- **The room ceiling is lifted** (`85ee069`). The all-pairs distance table was
  O(N²) — measured 60.8 MB and a 319 ms cold start at ~1,110 rooms, against a
  128 MB Durable Object budget. It would have failed *gradually, mid-build*,
  with nothing in the game looking wrong. Now lazy + LRU, with the hottest query
  (territory checks) moved to bounded walks: **2.2 MB, 0 ms, and room count no
  longer costs memory.** Verified against all 12,100 room pairs, zero mismatches.

**Engineering: STILL NEEDED.**
- **The authoring pipeline** *(next, and it gates everything)*. 966 rooms is
  ~180,000 characters of prose; nobody hand-writes that many INSERTs without a
  silent orphan room. Plain text in (`## id | Name`, prose, `> dir target`),
  validated migration out: every exit resolves, every exit has a return path
  unless marked one-way, no duplicate ids, no room unreachable from a gate, no
  missing description.
- ~~**Region plumbing.**~~ **BUILT 2026-08-01 (mig 126, uncommitted).** A room
  now carries its own `region` instead of having one derived from a hardcoded
  id-set: `REGIONS` in `world.ts` is the list (`gate`/`deep`/`upper` plus
  `road`/`wood`/`mountain`), `regionOf` prefers the room's own and falls back to
  the old derivation, so all 110 existing rooms are untouched. `AMBIENCE` went
  `Partial` — a band with no pool yet is SILENT rather than borrowing the
  dungeon's drips. `is_spawn` split off `is_entry`, backfilled so today's four
  gates are today's four spawns; `randomGate()` now draws from spawns. The
  pipeline takes `!region <name>` (file-level) and `!spawn`, refuses a region
  name the engine doesn't know, and refuses a new room that declares none —
  silence there would quietly mean "the dungeon's halls". Still needed per
  region as it lands: an AMBIENCE pool, a map label in `lore.ts`, and its
  entries in the chest-tier/weather/dark-room tables.
- **Mob rosters** per region (stat-blocks are data; new *behaviors* are code —
  abilities are hardcoded Sets).
- **The dragon's mechanic** — breath, a room-wide sweep, an airborne phase.
  Real code, not a migration.
- **Per-region** mouths, water/forage rooms, chest tiers, names.

**Build order:** ~~pipeline~~ → ~~region plumbing~~ → ~~west road~~ → ~~wood~~ →
~~den ground~~ → ~~den system~~ → east road + crossing → mountain → dragon.
*(The den system jumped its slot: rome, 2026-08-03, on being shown 60 quiet rooms
with a larder in them — "ITS SUPPOSED TO BE A FUCKING PLACE WHERE NOMADS FUCKING
LIVE." He is right; ground with nothing to claim on it is scenery, and "walk the
space first" was me deferring the only thing that makes the region a region.)*

**THE WEST GETS A SECOND ARTERY — AND THE PIPELINE LEARNS TO COUNT THROATS**
*(2026-08-03, migs 163 + 164, source in `game-server/regions/the-fen-road.rooms`,
check in `scripts/build-rooms.mjs`)*. Measuring the den ground's exposure to
gankers turned up something older and far worse: **four rooms sealed off 241 of
the world's 390** — the whole wood, the whole den ground, most of the road — with
**not one of the eight gates inside that pocket**. The Mustering Yard (one room
from a gate) and three of the wood's rides. Four people standing still could cut
the western half of the world off from every bank in the game. Nobody built it;
it accumulated, one region at a time, and was invisible until the dens gave
people a reason to walk it with full pockets.
- **What did NOT work, all measured before building anything.** More doors onto
  the den ground: 4. More approaches to it: 4. One fen road with three landfalls:
  5. More mouths onto that road: 5 (its middle becomes the throat). Braiding its
  middle: 5 (the junction becomes the throat). **A CORRIDOR IS A CORRIDOR** —
  redundancy is not doors, not mouths, and not a loop in the middle; it is
  independent routes END TO END, and anything that funnels even briefly is worth
  exactly one route.
- **THE FEN (18 rooms, three ways, sharing no room).** The way west before the
  road was cut. *The Sally Way* out of the postern ditch, ashore at the wood's
  Willow Margin. *The Black Way* south out of the Black Fen through the peat
  workings, ashore on the den ground's Far Waste. *The Grave Path* — the drain
  out of the **Mass-Grave, a dead end for this world's whole life** — ashore at
  the wood's Osier Beds. Two cross-rungs so it reads as one country, not three
  tunnels. The trade against the road is real: no throat, no patrol, and no
  floor. **4 rooms → 7.** World at 408.
- **THE THROAT CHECK, and this is the scalable half.** The room pipeline now
  runs a max-flow/min-cut on every region it builds — every room worth 1 (a room
  is a place one person can stand), sources every gate and spawn — and reports
  *how many people it takes to own this ground* against a threshold that scales
  with what is shut in behind it (one route per 40 rooms, floor of 2). A pocket
  may hang off one door; a province may not. **The east road, the Crossing and
  the mountain cannot repeat this quietly** — which is the whole point, because
  every one of them is a single line hanging off one seam by default.

**THE MAP LEARNED TO DRAW A COUNTRY** *(2026-08-03, `lore.ts worldGrid`, no
migration)*. rome walked east from the Street Head and the map drew the room to
the NORTH. Real bug, and bigger than the one room: the canonical grid laid rooms
out ONE GRID PER BAND, correct while a band WAS a region (the fortress's three
strata) and wrong the day band 1 came to hold the fortress, the road, the wood
and the dens — 390 rooms on one plane, colliding, each collision shoving a room
to the nearest free square and every room reached THROUGH it inheriting the
shove. **30 of the den's 154 horizontal exits were drawn pointing the wrong way.**
Now: the world is cut into pieces of ground that don't contradict themselves
(embed a piece; any door that comes out wrong IS a contradiction, so cut it and
embed the parts — the wood's eight maze cores separate themselves), each piece is
embedded on its own grid, and pieces are placed most-connected-first where the
average of their doors says they belong. **A small clash moves the few rooms in
the way, not the whole piece** — the hamlet was landing nine cells off the road
because exactly THREE of its 34 squares wanted ground a road pocket held, which
is what "the dens isnt even fucking connected" was. Verified against the live map
frame, not a model of it: **den arrows 30 wrong → 0, seven of its eight doorways
drawn touching, zero overlapping cells, and the wood's own wrong arrows 214 →
188.** Two wrong turns on the way, both recorded in the code: one grid per REGION
(the den ground is two places joined through a ROAD room, so it carried a 40-cell
hole and got spiralled into a corner — worse than the bug) and a settle pass
(traded 14 loose seams for 20+ to buy one cell).
- **STILL BROKEN, and it is the wood, not the map.** The wood's eight cores were
  wired together for CONNECTIVITY, not geometry, so its loops don't close and
  **no grid can draw it honestly** — 188 of its 410 exits are wrong whatever the
  layout does, and its one bad door drags the Squatters' Row 11 cells off the
  Sunken Ditch. The fix is re-cutting the doors between the cores, which is a
  world change, not a rendering change. rome's call, not mine.

**THE DEN SYSTEM IS BUILT** *(2026-08-03, mig 162 + `game-server/src/den.ts`)*.
Every ruling below is his, from the arc pass and the dens→towns design — this
build settled no design questions, it implemented the ones already settled.
- **A HOLDING WITH BUNKS.** `settle` takes a roof; the roof holds you plus
  **six** (`DEN_BUNKS`, his own proposed number and the roadmap's one open
  question on it — confirmed). Six doors on this ground, thirty-six beds behind
  them. **The scarce thing is the DOOR, never the bed**, so nobody is locked out
  of the world for want of property and the thirty-seventh nomad's way in is to
  find somebody who will take them in. A key is handed over FACE TO FACE
  (`bunk <name>`, they must be standing in the room) — taking someone in is
  something you did in a place, not a name typed at a menu.
- **IT OPENS EXPOSED.** A fresh den is an ordinary room and creatures walk in.
  `bar` — 2 iron and 3 scrap — hangs a bar, and only then does `ai.ts` treat it
  like a hideaway. **The gatehouse is safe because it is nobody's; a den is safe
  only as far as you have made it so**, and the iron that makes it safe has to be
  carried out of somewhere dangerous.
- **IT LAPSES, and that is the entire upkeep system.** No rent, no meter, no
  chore: `tended_at` is the last time the holder stood in their own doorway, and
  a fortnight of not coming home drops the hold to whoever is standing there.
  Walking home IS the upkeep. Simulation-native — real state that changed because
  something real happened.
- **NOTHING IS FROZEN IN IT.** `stow`/`fetch` ride the same `container` column as
  the lockbox and vault (`den:<room_id>`), so a den inherits the world's clock
  for free: food ages on your shelf, iron wears. **The vault stops time; the house
  does not.** 12 slots — more than you can carry, less than a bank.
- **A lapsed or handed-over den keeps other people's things in it.** Rows keep
  their owner's pubkey, so a new holder finds somebody else's belongings and
  cannot touch them, and the old holder can still walk in and clear their own out
  — even past the bar. A house somebody stopped coming back to should still have
  their things in it.
- **Six holdings, flagged `is_holding` on the room** (the Reeve's House, the North
  House, the Smithy, the Mill, the Black Hut, the Warrener's Lodge). The Bare
  Chapel is deliberately not one: it stays the ground's communal bolthole.
- Verified end to end on local: settle → look (the room names its holder) → bar →
  stow → den → fetch → abandon, plus every refusal path.
- **STILL OPEN, and next:** the TOWN layer (3+ dens clustered → a shared front
  gate, a fire that stays lit, a trader who only shows where people live);
  MONSTER-driven raids, which is what the bar is waiting for; and the hearth as
  where real cooking happens. **Player raiding stays out** per his ruling.

**THE DEN GROUND IS BUILT** *(2026-08-03, migs 160 + 161, source in
`game-server/regions/the-dens-1.rooms` and `-2`)*. 60 rooms in the angle between
the road's last room and the wood's near edge — reachable **without entering the
maze**, which is the point: this is the safe edge of the far country, the place a
person stops walking. Built to the arc's own ruling — *the den GROUND now, the
den SYSTEM later*: sixty rooms obviously meant for something, with nothing to
claim yet, until the space has been walked. **The world is 390 rooms.**
- **Two grounds, on purpose, because they are the argument the den system will
  have to settle.** THE FIELD END (34 rooms, north of the road's end) is a
  hamlet that emptied: a street, five holdings, a smithy, a reeve's house with a
  loft, a pinfold, a stone-roofed chapel, a mill with its wheel-pit, ridge and
  furrow under the grass. Nothing grand and nothing ruined — the doors were shut
  on the way out by people who expected to want them shut. THE WASTE (26 rooms,
  south) is common ground nobody owned: turf huts raised overnight, a hurdle
  yard, a bark-peelers' camp, fever graves, a warrener's lodge with a ladder you
  can pull up after you. **Inherit a dead family's house, or build on ground with
  no deed.** Both grounds exist now so that call can be made on real rooms.
- **Density 0.05, and it is the most important number in the region.** Three
  bodies in sixty rooms — a roe deer on the common field, a masterless dog over
  the rabbit warren, one footpad who had the same idea about this place and got
  here first. The wood's 195-in-170 is what makes this quiet mean anything. Both
  the dog and the footpad are in `ROAMING_DENS`, so the dens have a footpad and
  you never learn where.
- **No gate and no spawn region.** A gatehouse here would make the dens the best
  place in the world to *stand* rather than a place worth walking to. One safe
  room, the Bare Chapel (the only stone roof for a long way) — the Warrener's
  Lodge and the Black Hut are shelter you can be *found* in, which is a different
  offer. Payoff is UPKEEP, not gear: food, water, fuel, rock, scrap, and one
  locked box under the reeve's floor.
- **Engine gap this closed: `INDOOR_ROOMS`.** A band declares itself outdoors as
  a whole, which was true enough for a road and a wood. The dens are the first
  outdoor band that is partly ROOF, and rain falling on someone sitting in a mill
  with the door shut is simply wrong. The exception set reaches back and covers
  the wood's Charcoal Hut and Withy Hut too — the two rooms in that region where
  being under cover is the entire point, both rained on since the wood shipped.
- Plumbing that lands with every new band: `den` in `REGIONS`, `OUTDOOR_REGIONS`,
  `FORAGE_REGIONS`, `SURFACE_BANDS`, `MAP_BAND_OF`; a map stratum labelled *The
  Dens* on both the surveyor's map and the gatehouse wall; a map colour (`--heal`,
  the only green in the palette, and the dens are the only band that is grass);
  its own `listen` line; 44 `ROOM_AMBIENCE` pools and 12 `DARK_TOUCH` lines,
  every one of them the building or the ground doing something on its own,
  because nothing here implies a body — there isn't one. Three made waters into
  `WATER_ROOMS` (mill pond, barrel-well, marl pit): the dens are the first band
  with no natural running water at all, and every drop in them is something
  somebody built to hold it.

**THE WEST ROAD IS BUILT** *(2026-08-01, uncommitted: migs 127 + 128, source in
`game-server/regions/west-road.rooms`)*. 30 rooms hung off the Drowned Orchard's
west edge, ending at THE GAP IN THE TREES — the stub the wood attaches to (28
steps from the main gate). Paving → frost-heave → weeds → earth → ruts → green
  **THE ROAD GETS LONGER (migs 157-159, same day, after I spent the first ten
  rooms on the fork instead of on length: "i was fucking saying 10 rooms plus
  the fucking fork").** Ten more, threaded into the MIDDLE at the seam between
  the Long Straight and the Weed Paving — not onto either end, since one is the
  fortress's doorstep and the other the wood's. Eight on the spine (two more
  numbered milestones, an open heath, a burnt farmstead, a wind row, a culvert,
  a crooked mile, a hollow elm) and two pockets (a pinfold, a smithy ruin —
  which is the only place on either road that regrows scrap). A road that grows
  in the middle has to be cut open first: mig 157 deletes the seam's two exits
  before 158 writes the stretch, because the room pipeline only ever WRITES
  exits and an INSERT onto an existing (room_id, dir) is a PK error. **The
  carrier's round went 49 stops to 64** — his route ran straight through that
  seam, so without extending it his legs stopped being adjacent there and the
  patrol would have quietly fallen back to wandering. Verified leg by leg
  against the live exits. **The road is 50 rooms now**, the world 330.
  **THE DROVE ROAD (migs 155-156, rome 2026-08-03: "can we make the road 10
  rooms longer? and also maybe split the path a lil").** Both at once, because a
  fork is a better ten rooms than an extension: the road ran fortress-to-wood as
  ONE line with five dead-end pockets, so every wanderer walked the same 25
  rooms in the same order. Now the FLOODED QUARRY stops being a dead end and
  becomes the junction — a pocket players already know is the right place to
  hide a road. The drove leaves west out of the quarry, crosses the beck on a
  plank bridge upstream, runs the dry ridge, and drops back onto the paving at
  the Old Boundary. **The trade is real:** the paving is 5 rooms, shorter, holds
  the cart's strongbox, and crosses water the tide and rain both have opinions
  about; the drove is 8 rooms plus two pockets (a droving stance, a sheep-fold),
  longer, drier, no ford, unmaintained since the beasts stopped coming. The
  Shallow Ford's own prose has been asking for it since it shipped — "there has
  been a bridge here, once". 3 spawns at the road's own density (0.23/room),
  placed on what the prose already said. **The carrier stays on the paving** on
  purpose: the fork is the way around HIM as much as around the ford.
tunnel: the surface underfoot tells you how far out you are. 25-room spine plus
five off-spine pockets. POIs as ruled: two milestones, a wayside shelter
(`is_safe`), a broken axle, a shallow ford (`WATER_ROOMS`), a gibbet and roadside
graves. ONE gate — the Roadwarden's Post — deliberately **not** a spawn (open
call 3 is still rome's).
- **Roster (mig 128): 7 bodies, 3 templates.** The carrier (a courier still
  walking a route for an institution that stopped existing — `PATROLS`, the
  whole spine out and back, 48 legs, the longest route in the game), three
  masterless dogs, three footpads (`THIEVES`). Difficulty rides DISTANCE the way
  the mountain's will ride altitude: nothing at all on the paved end, both far
  spawns past the Old Boundary.
- **Two engine gaps this exposed and closed.** (1) `OUTDOOR_ROOMS` was a
  hardcoded id-set of the fortress's 20 grounds — a road that never gets rained
  on or dark isn't a road. Bands now declare themselves outdoors via
  `OUTDOOR_REGIONS` and fold in at world load; it stays a Set of ids because one
  caller iterates it. (2) A gate reads as region `gate` wherever it stands, so
  the Roadwarden's Post would have drawn the fortress's ambience — *cold air
  wells up out of the dark below*, at a house with nothing under it. It has its
  own `ROOM_AMBIENCE` pool now, as do 12 other road rooms, plus 17 `DARK_TOUCH`
  lines (moonless nights out there are total).
- **THE MILESTONE REGISTER** *(rome approved 2026-08-01; code + no migration)*.
  Two stones twelve rooms apart keep a PERMANENT list of names (`stoneNames`,
  persisted in sim rows; cap 40, oldest weather off). Bare `carve` at a stone
  cuts your own name — the same shape as bare `carve` inside the gatehouse —
  and `read stone` lists them, marking anyone who also appears on the OTHER
  stone. That comparison is the whole feature: the near stone is four rooms
  out and anyone reaches it, the drowned stone is past the ford where the dogs
  are, so a name on both is somebody who went on and a name on one is somebody
  who turned back or didn't turn anything back. **Nothing tracks deaths — the
  two lists ARE the record.** Distinct from its two neighbours on purpose: the
  gatehouse wall records HALLS (shared map knowledge), `carve <words>` records
  anything and weathers off in a day, a milestone records PEOPLE. Reading needs
  light; carving is loud (`creatureNoise`) and takes a while, on an open road.
- **THE CART'S LOAD** *(mig 129)*. A locked `caches` row, not `ground_spawns` —
  a renewing floor pile would walk back the scarcity fix. In fiction the loose
  cargo went within a week and what's left is the box strapped under the
  boards, which is *why* the cart is still worth stopping at. Cargo not kit
  (hardtack, scrap, dressings, iron stock, one pair of dead man's boots): the
  road's payoff is supplies for going FURTHER; gear comes from the wood and the
  mountain. One exception, `dry-cigarettes` at 0.06 — a merchant's cart is
  exactly where they'd be, and it seeds the hard currency outside the deep
  without a word of explanation. Six-hour refill; a rock opens it, which means
  ringing iron in the open.

**SCHEDULED: SPLIT `b:creatures` BY ZONE — do it when the mountain starts**
*(rome, 2026-08-02: "keep this in mind for later")*. Not a bug and not urgent;
a dated appointment. Measured 2026-08-02 with the road and maze built:

```
b:creatures   45,519 bytes   ← 211 creatures, 216 bytes each
b:meta         8,808
b:ground       2,455
```

`simstore.ts:389` warns at **64 KB**, which at 216 bytes/creature is **~303
creatures**. Today: 211. The rest of the plan — dens (~3), east road (~10), the
Crossing (~100), the mountain (~300) — lands near **625 creatures ≈ 135 KB**,
well past it. The mountain ALONE roughly doubles the world's creature count,
which is why the trigger is "when the mountain starts", not "when it's done".

The escape is already designed and named in simstore's own header: one creature
blob per zone/region instead of one for the world, so only the dirty region
writes. Writes are already cheap (1–2 rows a flush — the whole point of the blob
shape); this is about the single blob having stopped being the right shape, not
about a hard wall. **Rooms are free; monsters are the load.**

**Capacity, measured 2026-08-01 (Workers Paid, $5/mo):** none of this is close
to a limit. DO memory ~5–15 MB of 128. D1 storage 1.03 MB → ~3 MB of 5 GB. D1
rows read 0.3% → **1.5%** of the 25 B/month (reads are dominated by DO cold
starts reloading the world, so they scale with world size — you'd need a world
70× the target to see a bill). Requests 0.06%, CPU 0.04%. **DO duration is the
one real ceiling and the calendar caps it:** 400,000 GB-s ÷ 0.125 GB = 889 hours
of world-awake time, and a month has 720 — so a single zone running 24/7 all
month lands at ~81% of the included allowance and still costs nothing. TWO
always-on zone-DOs would be 162% and billable, which is the hard argument for
regions over sharding. Tightest ratio on the board is the worker script: 1.81 MB
of 10 MB gzipped. The world only ticks while a socket is connected
(`ensureAlarm`), which is why an idle NOMAD bills zero.

## Next up (unblocked, pre-players)

- **BUG: surveyor-map shows the `journal` chip — FIXED (pending ship), 2026-07-20.**
  Fixed at all four `journalId`-as-journal readers with the guard
  `c.journalId && !MAP_ITEMS.has(c.itemId)`: the `journal` + mid-fight `study`
  chips (chips.ts 212/144), `whereIsJournal` + `carriedJournals` (lore.ts
  197/209), and the kill-log hook (zone.ts 3528 — was misfiling kills to a
  carried map instead of the bestiary). Detail below for the record.
  *(Lunapilot/rome, 2026-07-20)*. The surveyor's blank (b98921a) rides the JOURNAL's
  instanced rail — it mints a `journalId` (`map-<uuid>`) on the MAP itself to
  hold its ink. But the chip logic keys "this is a journal" on ANY `journalId`:
  [chips.ts:210-212] `session.items.some((c) => c.journalId)` → pushes the
  `journal` chip for a map, and [chips.ts:142] does the same for the mid-fight
  `study` chip. A carried surveyor-map should offer ONLY `map`, never `journal`/
  `study`. Fix: distinguish a real journal from a map-with-ink at both sites —
  `c.journalId && !MAP_ITEMS.has(c.itemId)` (or `c.itemId === JOURNAL_ITEM`).
  Root lesson: `journalId` is now OVERLOADED (journal pages OR map ink) — any
  code reading `c.journalId` as "is a journal" must exclude MAP_ITEMS. Audit the
  other `c.journalId` readers when fixing (stackable(), whereIsJournal, etc.).

- **Stray-item floor-drain** *(SHIPPED `4bd9f76` 2026-07-16 — the half that
  mattered)*. Torches got the sodden law (`strayTorch`, 30–60 min off their
  threshold spawns, RotEntry kind `"sodden"`), and the audit found thrown rocks
  never armed crumble at all — both laws now fire at EVERY off-spawn landing:
  drop, throw-at-creature, noise-throw, death-spill, cutpurse-spill. The
  free-light beacon is dead. **The general-gear half is deliberately NOT
  built:** its second motive (sim-blob inflation) died with the SQL-rows fix
  (see icebox — built), and gear on floors is load-bearing gameplay — death
  piles must be reclaimable, scavengers eye it, the engraving rides it. If
  floor-gear litter ever reads as a problem in play, it's a watch-list item,
  not a law.
- **Rare torch spawn — THE LONGBRAND** *(SHIPPED `e1537f7` 2026-07-17,
  migration 088 local + remote)*. The clean parallel won: a much **longer burn**
  (`BRAND_BURN_MS` = 25 min, 2.5× a torch), still an OPEN flame (fire-fear
  wakes, weather drowns, cold pinches — litSource stays "torch" so every
  downstream system reads it unchanged). Minted on the hammerstone's dice law
  (`nextBrandAt`, 3–6h roll × 0.25 odds ≈ 1/day, cap ONE unfound) into
  `BRAND_HAUNTS` — fire-keeping country: the cold hearth, smokehouse,
  guardroom, warden-post, watch turret, wall-walk, barracks, buried chapel,
  scriptorium, bell-cote. Plain torches burn FIRST unless the brand is named
  ('light brand'), the dark-room chip never offers it while common sticks
  remain, it doesn't count against PACK_TORCH_CAP (the cap rations the common
  stick), and the seal keeps the damp out — a strayed brand never sods
  (strayTorch stays TORCH_ITEM-only, on purpose). Barter 4 at the hatch.
- **Forge & smelt economy — make crafting actually matter** *(design, rome
  2026-07-15; noted, not building yet)*. Three linked changes:
  1. **Salvage shouldn't cough a whole iron per piece.** Today `SALVAGE_YIELD`
     = common 1 / uncommon 2 / rare 4 / epic 8 scrap, and one common salvage
     hands you a usable unit. rome wants a TWO-TIER material: breaking a piece
     yields a **scrap (~1/5 of an iron)**, and ~5 scraps **smelt into one full
     iron**. Iron becomes something you accumulate, not a per-salvage handout —
     tightens the forge feed the way the floor-renewal law tightened gear.
  2. **Forge-EXCLUSIVE gear.** Current recipes (sharpened-rib, rusted-sword,
     splintered-cudgel, rag-vest, padded-jerkin, leather-cap, worn-boots,
     tattered-cloak, battered-buckler, bone-shiv, chipped-falchion,
     rust-eaten-cleaver, graveblade, scavenger-coat…) are low junk that ALSO
     drops in the world, so forging is never the ONLY path to anything and never
     worth the scrap. Add gear you can get ONLY by forging — a reason to gather
     iron.
  3. **Cut some recipes.** Trim the junk end so the slate reads as a real craft
     menu, not a pile of starter-tier duplicates.
  Net: iron is scarcer to make, and what you make is worth making. Forge data
  lives in `forge_recipes` (D1, cached at init) + `SALVAGE_YIELD` (zone-data);
  the scrap→iron tier is new (item template + smelt recipe/verb) — a migration
  plus a bit of gate.ts.
- **The Hunter / Nemesis** *(now the top of the stack)* — targeted pressure:
  the world sends a named predator after the too-successful player, who has to
  get out ahead of it. Reuses grudges + `curious` tracking + the blood-on-killer
  scent primitives that PvP just proved. Also the natural long-term raid clock
  for the shallow keep. (rome: "i love this.")
- **Storied gear — THE ENGRAVING** *(SHIPPED f60ef32, migration 077)*. Live:
  the first sealing **engraves** a piece (lore_id, gear only), and a deeds-ledger
  (**kills / descents / owners / deaths**) rides the mark through every hand and
  floor (groundLore, instanced like wear), surfaced in `look` (carried, lockbox,
  the floor — the murdered man's sword talks). The fence files the mark off
  (laundering, by design). **Forward work (v2, population-gated):** deeds riding
  the 31573 loot cert (bazaar interop — add when the bazaar is real) + a journal
  surface.
- **Fire & light follow-ons** (the 057 arc's remaining open ends):
  - `search` for hidden exits (dark hides them; light + searching finds them).
    Not built (zone-data.ts still flags it a follow-on).
  - **Map-blackout of dark rooms** — a room you've only seen dark doesn't
    belong on your HUD map. Not built.
- **Shallows heat map** — mobs harden where they're farmed (+1–2 HP, not
  damage), decaying back for fresh players. Unblocked since curved armor.

## Room events — the world's weather *(SHIPPED — events.ts; open ends only)*

- **The undertow-grasper** (anti-turtle, designed not built) — a drowner cousin
  whose grab comes AROUND the shield; its Tideways home is ready. Build only if
  the pavise-turtle proves too safe in play (see watch list).
- **Pack weight slowing the wade / exits sealing on flood / float-ups** — the
  tide's deferred second layer.
- **The breach — PARKED** (rome: "doesn't fit"). Fully built and idle; its pool
  ticket is one commented line in events.ts. Restore = uncomment.
- **Variety shelf:** the warden's muster (patrol surge; a wall and a window at
  once), and a general stillness (everything sleeps deeper for a few minutes —
  the marrow-song already plays this card for the deep's hollow).

## The small lives *(SHIPPED f60ef32 — code only, no migration; open ends only)*

Deferred from the same design talk: fleet-rat play (pure flavor), scavenger
killing-floor rounds (mostly covered by the existing corpse-smell wander).

## Watch list (don't fix until play says so)

- **Upper-floor tension at uncommon kit** — solo tension up top is crowds/
  noise/grudges only; fine while the upper floor is the farm. Lever if
  extraction ever feels free: density/aggro, not stats.
- **Warden-plate's thin niche** — plain armor-3 kill-loot in a world of warded
  threes; watch whether anyone ever picks it.
- **Rare-ward drop rates** — whether sneak/deep-diver builds are real depends
  on QUIET/SLICK pieces actually circulating.
- **The rusted pick is a scrap faucet** — the renewable pick can be farmed for
  scrap (take, salvage, wait). Harmless at current scrap prices; if the scrap
  economy tightens, levers: salvage yield 0/1, slower regrow, or fence-only.
- **The undertow-grasper** (anti-turtle) — build only if the pavise-turtle
  proves too safe now that the shield wall costs a swing tax.
- **Shield-wall drag (0.85) + block cap (30%)** — the fresh tuning. Watch
  whether the wall-turtle is now a real trade-off or still dominant; the audit
  says murder-vs-tank became a coin-flip, but play is the judge.
- **Prices need players** — 063 killed the dominated buys; whether the curve
  is right waits on strangers with tender.
- **"No armour still loud"** *(Lunapilot reported, 2026-07-20; diagnosed, NOT a
  code bug — the load law as written)*. Movement noise is `NOISE_FLOOR(0.06) +
  loadOf × NOISE_PER_WEIGHT(0.06)` (verbs.ts ~807), and `loadOf` =
  `wornWeight` (sums EVERY equipped slot incl. the wielded WEAPON + shield, via
  equippedAll) `+ max(0, looseIron − BURDEN_FREE_IRON=3)` (spare gear in the
  pack). So an unarmored player is still loud from (a) the weapon in hand — a
  flanged mace is wt3 → naked-but-swinging = `0.06+3×0.06 = 24%`/move, +shield &
  a couple spare pieces → ~36-40%, and (b) loot past the 3 free. A truly
  empty-handed naked delver sits at the 6% floor (quiet). "Some locations" =
  `RAIN_NOISE_MASK` eats half of outdoor-rain noise, so dry/deep rooms carry the
  full racket while rainy surface reads silent — same load, location-variable
  audibility. **RESOLVED as WAI + a flavor fix (rome, 2026-07-20):** the noise
  AMOUNT is the load law working — a weapon and shield ARE weight, so you make
  sound; that stays. The actual bug was the FLAVOR lying — the message keyed on
  `wornWeight > 0` (which lumps weapon+shield in) and told a rock-and-shield,
  no-armor delver his "armor rings." FIXED: new `wornArmorWeight` (helm/body/
  cloak/feet only) splits real armor from held gear, and the self + roomSound
  lines now name the true source ("the gear in your hands knocks", "the iron in
  your pack", worn "armor rings", or a bare "loose stone"). STILL PARKED (not
  done, no one's asked): whether a wielded weapon SHOULD feed movement noise per
  point of weight exactly like plate — lever if ever wanted is to drop/half the
  weapon slot in the noise calc only.

## Afflictions & cures — the framework *(gated)*

Bleed and hobble are the two proven instances of the pattern (status + tell +
cure path). The general framework — stacking statuses, cure-routing, mobs
applying them — stays on paper until (1) the glanceable-status UX carries more
than two tags comfortably and (2) play validates the fresh combat numbers.
When it opens, the on-brand growth is **poisons, tinctures, and set traps**
(gritty survival, never magic) — including the parked deep-poison: a stacking
drain the longer you linger, ticks decaying when you leave/rest.

## Extraction feel (rome-ranked above the MUD-flavor ideas)

- **The dangerous walk back** — loot is worthless until you're *out*; the
  deeper you went, the longer the run home. The waystation's concentric
  pressure (grounds staging → shallow keep → committed deep) is the frame;
  the remaining work is content/geometry that keeps the best loot far from
  every gate. Highest leverage of the set.
- **Task / bounty runs** — objectives that *force* insertion: retrieve a
  thing, reach a room, hunt a marked wanderer (rides the blood-on-killer
  primitives, now live).
- **The seal as a vulnerable moment** — claiming becomes a channeled hold: a
  few exposed ticks, sound carrying, interruptible. The gate stops being a
  safe button. *(Not built.)*
- **Campers make noise** *(reactive half SHIPPED — `listen` surfaces a still
  camper, and a heavy pack betrays them even standing)*. The open end is the
  *passive* broadcast: stillness that leaks to a whole room's ambient without
  anyone pressing an ear.

## Population systems (gated on actual players)

PvP is out of this bucket — it shipped (4196f5f), because the whole point was
that it emerges the moment two players share a room, and the anti-grief stack
is sim-native (no audience required to be correct). The rest genuinely need
density and do NOT get built before there are people:

- **Economy** — scarcity already exists; trade verbs when there are traders.
  Zaps enter here (`nostr-lightning/` is on the shelf).
- **The black market / player trade layer** — hoarded gear re-enters
  circulation, prices float on supply/demand (Tarkov's flea). Completes the
  emergent-scarcity model; the hard currency for prices to settle in already
  circulates. Distinct from the keeper's NPC fence.
- **Factions** — earned names, not menus: bandit is what you did.
- **Reputation** — grudges prove the primitive; extend to the world (guards,
  towns) when towns exist.

## Design lineage — what to steal, what to avoid *(2026-07-09)*

The reference games for NOMAD (rome's homework list + one add), vetted for fit.
Each: the one thing to **steal**, and the specific **trap** that would hurt NOMAD
if copied wholesale. The throughline of every trap: **depth belongs in the world,
clarity in the interface, scope in a small number of deep systems.**

- **Rain World** — *Steal:* creatures with agendas that relate to each other (a
  food web; you're prey, not protagonist). *Trap:* its deliberate player-hostility
  and opacity — NOMAD's cruelty is in the world, never the interface. → food-web (shipped).
- **Project Zomboid** — *Steal:* the layered injury model (a wound worsens, needs a
  specific cure, tells a death-story). *Trap:* the full survival-needs stack
  (hunger/thirst/mood/temperature) — chore-management, not tension. → afflictions slice.
- **Kenshi** — *Steal:* the tone — no chosen one, ruin is normal and recoverable, the
  world won't wait. *Trap:* its aimlessness; a small dungeon needs the extract-pull
  for a spine.
- **Dwarf Fortress** — *Steal:* the philosophy — a few deep systems generate stories;
  "losing is fun." *Trap:* the breadth (biggest scope risk on the list). Litmus: if an
  idea makes you ADD a system rather than DEEPEN one, it's the trap.
- **Cataclysm: DDA** — *Steal:* proof deep sim (body-parts, afflictions, item
  interaction) reads clearly in text. *Trap:* crafting-tree / item-count sprawl — the
  enemy of scarcity. Depth per item, never item count.
- **Dark and Darker** — *Steal:* "push deeper vs. leave" as a live decision every few
  rooms; dread in tight corridors at near-zero content cost. *Trap:* classes +
  matchmade rounds — NOMAD is persistent and identity-based, not session-classes.
- **Escape from Tarkov** — *Steal:* extract psychology + secure-container/flea membrane
  + tiered hard currency (already core). *Trap:* the spreadsheet barrier, and **wipes**
  — the Nostr identity is permanent by design; a wipe would betray it.
- **Achaea** — *Steal:* herb/affliction/balance texture + the live mapper (shipped) +
  MUD-native command feel. *Trap:* the veteran-wall — keep afflictions readable and
  forgiving-to-learn, or you rebuild the newbie-hostility you design against.
- **Caves of Qud** (the add) — *Steal:* best-in-class text UX — legible deep sim,
  rewarding `look`/`examine`, glanceable status. *Trap:* its lore/character-build depth
  (mutations, skill trees, attributes) — NOMAD's identity is gear + world, not builds.
- **The gap:** none of these teaches NOMAD's real differentiator — extraction *as a
  social protocol layer* over Nostr (portable identity, custodial keys). No homework
  exists for that; it's the part being invented.

## Icebox — liked, not building yet

Directions rome likes and wants held. Design only; no code until he says go.

- **Dens → towns — a personal stake in the world** *(rome, 2026-07-22, several
  days out — design only)*. The gap identified: NOMAD already simulates on a
  real clock (creature hunger/decay, food/heart spoilage) whether you're
  logged in or not, but nothing the PLAYER owns is on that clock — extraction
  currently ends at the shared, neutral gatehouse, nothing personal to lose or
  tend. **The gatehouse/den split: the gatehouse is a small vault — a moving
  inn, safe because it's shared and neutral and nobody's. The den is the
  opposite: safe only because it's YOURS and only as far as you've made it
  so** — which resolves the "den might undercut extraction tension" worry
  below: the gatehouse already covers neutral-safe, so a den can open
  genuinely exposed and earn its security entirely through upgrades, never by
  default. A den fills that: a claimed private space (room or pocket off one)
  with real-clock decay on what's stored there and mechanical upgrades earned
  by doing things in the world (not a grind currency/XP bar — stays
  simulation-native, same category as gear condition, not a bolted-on
  progression system). Once enough dens cluster in one area (proposed
  threshold: 3+), a shared town layer unlocks — one front gate, communal
  stuff no single den justifies alone (a fire that stays lit, a shared cache,
  maybe a trader who only shows where people live). Raids on the town should
  be MONSTER-driven (plugs into the existing aggression/hunger machinery —
  starving predators, the bell, thieves), not player-vs-player — property
  raiding by other players is a much heavier anti-grief problem than the
  existing PvP-kill stack was built to solve and wasn't part of this
  conversation's design. Central risk to hold the line on when building: a
  den that's too safe/rewarding undercuts the extraction loop's whole tension
  (the deep is where the loot AND the death are) — the design bar is "does
  having a den make leaving it feel MORE dangerous," not just "is this cool."
  **Bundled as one expansion arc, not four separate ones** (rome, same day):
  dens/town belong at the SAFE edge of a genuinely new zone, not carved out of
  the existing stable ~110-room world — new rooms need new mobs to justify
  existing (empty territory is filler), new mobs need a capping boss to give
  the zone an edge (same role the King/other bosses play elsewhere), and the
  den/town is the reason players return to *this* new zone specifically
  instead of just passing through toward its loot. One arc: new zone + its
  mob population + a capping boss + dens/town at its safe end.
  **Cooking, tied to the den's hearth** (same conversation): the smoke-racks
  (`cmdSmoke`/curing) are already the right shape for this — real-clock,
  single-ingredient, tended-or-lost — just not a recipe system yet. Room to
  grow: multi-ingredient recipes (raw meat + a foraged herb → something
  better than either alone), effects beyond a flat heal (staunches bleed,
  wards cold, briefly buffs the next fight), and the den's own hearth as
  where REAL cooking happens vs. the gatehouse racks staying the safe/basic
  option. Gives the den something to DO, not just something to guard.
  **Genre check (rome, same day): is this what simulation games aim for, is
  this Achaea?** Yes to both, on purpose, with a guardrail. Dwarf
  Fortress/RimWorld/Zomboid all use a persistent, personally-owned place as
  the surface where background systems (weather, hunger, decay, raids)
  actually become legible to the player — NOMAD has the background systems
  (hunger, decay, weather, aggression) already but nothing of the player's
  for them to press on; a den is that surface. Achaea's the same instinct at
  MUD scale (crafting/cooking/city economy giving players a reason to depend
  on each other beyond combat) — the shape is right to chase, but NOT
  Achaea's skill-tree/XP-grind mechanism. Every new system here (den
  upgrades, cooking) must stay simulation-native — real state that changed
  because something real happened, never a meter that fills from repetition.

- **New mob mechanics — genuinely unbuilt categories** *(rome, 2026-07-22,
  same conversation as dens — design only, several are candidates for the
  new zone's population)*. `MobTemplate` only has `bleed`/`stun` (mirrors
  weapons' edge/blunt); it has no `pierce`, no `sweep`/cleave equivalent, and
  no trait ledger the way gear does — mob abilities are hardcoded Sets
  (`LURKERS`, `THIEVES`, `SENTINELS`, etc.), so a new mob mechanic is always a
  real code build, never a data-only migration the way a new weapon is.
  Ranged/thrown was considered and DROPPED — the room-based combat model has
  no notion of acting on a player from outside their own room, and that's too
  much new plumbing for uncertain payoff (rome, 2026-07-22: "that will be
  hard to get right"). What's left, roughly ordered by how much they reuse
  existing plumbing vs. need new:
  - **Armor-piercing bite** — mirrors weapon `pierce`; cheapest gap to close.
  - **Sweep attack** — hits everyone in the room on its swing, not just its
    target (mirrors weapon `sweep`); nothing currently lets a mob hit more
    than one player at once.
  - **Regenerates unless it's bleeding** — heals back damage each tick unless
    an open wound (bleed/pierce landed) shuts that off; forces a weapon-class
    choice instead of just being a bigger HP bar.
  - **Corrosive/degrading hit** — eats condition off worn gear
    (`rollGearCondition`'s existing 0–100 number) instead of, or alongside,
    HP damage. Real stakes without touching combat math.
  - **Alarm call** — being hit (not just aggroed) alerts same-species
    creatures elsewhere in the zone, pulling their wander toward its room; a
    pack that actually musters instead of every mob living in isolation.
  - **Splits on death** — dies into 2 weaker copies instead of dropping loot
    outright (a slime/swarm type); new spawn-on-death path, doesn't exist now.
  - **Debuff on a landed heavy hit, never a disable** — a visible, temporary
    softening of your next swing (damage or accuracy), reworked from a
    fear/rout idea specifically to respect the standing law that no
    affliction may deny escape as a dice-roll — always visible, always
    timed, same shape as hobble.
  - **Snuffs your light** — sets `session.litUntil = undefined` (the exact
    field `light.ts` already reads) instead of dealing damage. Cheap — reuses
    real shipped state — and plunges you straight into `isDark()`
    consequences mid-fight, doubly relevant now that day/night is landing.
  - **Eats an item, not you** — destroys something specific out of your pack
    (a ration, a dressing, your only light) rather than stealing-and-dropping
    like the existing thief. Makes it a threat to plan around, not tank.
  - **Marks you** — leaves a scent that makes every other creature in the
    zone more likely to notice you for a while, separate from the wound-scent
    mechanic just shipped (this one fires without you being hurt at all).
  - **Silences you** — mutes shout/talk for a duration; attacks your social
    tools (calling for help, coordinating) rather than your body.
  - **Swaps places with you** — a blink/displace trading your position with
    the creature's mid-fight; disorienting, not damaging — you may end up cut
    off from your own exit.
  - **Drags you off** *(distinct from the drowner's seize-in-place — nothing
    currently moves a player's `roomId` against their will except spawn/death
    respawn)*: wins a grapple and relocates you to a different room instead
    of holding you still — a den, a pit, deeper in — displacement as the
    stake instead of damage. Telegraphed the same as seize (a visible
    grab-window to break out of before the drag completes).
  - **Closes some of a room's exits while it's alive** *(distinct from a
    sentinel, which is one hardcoded creature barring one hardcoded exit in
    one hardcoded room — `SENTINEL_ROOMS`)*: a general mechanic where any
    room with multiple exits has SOME (not all) blocked for as long as this
    creature occupies it — kill it or drive it off and the room reopens to
    its full exit list. A room-shaping threat that acts on the map itself,
    not on HP/gear/position — a genuinely different category from every
    other mechanic on this list.

- **Far-world write cost — mostly already solved; small residual lever** *(rome,
  2026-07-20 — investigated the "lots more mobs" scaling question, found the win
  is already banked)*. The write axis (rows_written → $), not CPU, is what meters
  mob scale. **The "stop rewriting rooms for hunger they can recompute" idea is
  ALREADY SHIPPED:** `simstore.ts` `VOLATILE` set (`hunger, nextWanderAt,
  thirstAt, sleepUntil, repositionAt, murmuredAt`) is stripped before the dirty
  comparison (`stableCreatureCopy`), so smooth drift generates ZERO writes; a 60s
  throttle + 5-min full flush persist churn with bounded staleness. Combined with
  the bubble freezing far creatures outright, **idle far regions already cost
  ~nothing on writes** — the headroom is already there (no build needed for the
  planned ~400 rooms / ~800 mobs). The ONLY residual lever, and it's small: the
  30s ecology sweep still produces genuine STRUCTURAL far events (a mob changes
  rooms — `WANDER_MIN/MAX_MS` 45–150s — a birth, a death) that dirty legitimately.
  To cut those you'd freeze/slow far-world WANDER (unobserved mobs have no reason
  to pace; hold position, redistribute lazily on bubble-entry) so the far world
  only writes on rare tens-of-minutes events. Modest gain, only worth it at
  thousands-of-rooms scale. Cheapest knob of all if writes ever bite: bump
  `SLOW_ECOLOGY_MS` 30s→60s (halves structural-sweep + throttle writes; cost =
  coarser far dynamics, NOT visible staleness — entry catch-up is capped by
  `CATCHUP_CAP_MS`). See [[nomad-scaling-ceiling]].

- **System-hook gear — seven approved pieces** *(rome, 2026-07-19: "these all
  sound good, note them down")*. The anti-reskin law behind them: **every new
  piece hooks a SYSTEM the sim already runs, never just a stat** — if the pitch
  is "like X but +1," it's a reskin; if it changes how a live system reads you,
  it's an item. Grid method: slots × systems (noise/load, light, traces, scent,
  weather, sleep, theft, rot, CC…), fill EMPTY cells. The seven:
  - **Feet × traces** — boots that leave no footprints (the tracker economy has
    no counter today).
  - **Cloak × scent** — a tanner's cloak that masks your blood-drip from the
    scavengers' nose (SCENT_FRESH/drip trails are live; nothing beats them).
  - **Cloak × weather** — oilcloth that keeps a torch lit in the rain
    (rainSoaksTorch kills them today).
  - **Helm × sleep** — a helm that muffles the bell for its wearer
    (bellWakeMult exists; no counter).
  - **Body × hunger** — a pack-liner that slows carried-food rot (the rot
    clock exists; FOOD_KEEPS is the only escape).
  - **Weapon × theft** — a strapped blade the cutpurse can't snatch (STRAPPED
    exists for exactly one item, the baldric).
  - **Shield × light** — a mirrored boss that spooks fire-fearing mobs
    (dreadsFire exists, dormant-ish).
  Guardrails when building: stat ladders stay ≤3 tiers/slot/weight-class;
  every new power pays a legible cost (weight is the currency — the blunt
  weight-point and proportional shield drag are the precedent).

- **The trait lottery + the legends — SHIPPED `80aad49`, 2026-07-20 (migs
  099+100).** Phase 1: fresh world-loot rolls <=1 slot-pool trait per instance
  (`rolled_traits` on player_items, rides the floor via `groundRolled`,
  `wearsTrait` folds template ∪ instance). Phase 2: nine legendary wearables,
  one per boss/elite, each a trait-combo the lottery can't produce. Original
  design notes kept below for the record; v2 upgrade (instanced rail to kill the
  same-floor roll-smear) and more legends remain open.
  *(rome, 2026-07-19: "roll the traits"; the trait ledger (098) was its
  foundation)*. THIS copy of a scavenger's coat rolled `quiet` when it
  entered the world; the next one didn't — small catalog, real variety, every
  drop worth inspecting. The shape: (1) roll at MINT (loot drops/cache spills;
  keeper stock stays plain) from a slot-appropriate, fiction-plausible pool
  (felt lining on cloth/leather never plate; eel-grease on cloaks/treads),
  most pieces roll NOTHING, cap one rolled trait — no god-rolls; (2) store on
  the player_items row (per-instance, like condition/journal_id), carried
  through drop/death/theft like condition already is; (3) read path =
  template tags ∪ instance tags (the ledger's trait()/hasTrait() single
  read-point makes this one layer, but it re-touches ~50 sites' data source —
  half a day careful, not an evening); (4) NAMES come from display-time
  rendering ("a scavenger's coat — felt-lined"), never from new template
  rows. Cost: D1 only, a few writes at mint — the DO never sees it.
  **BOTH LAYERS RULE (rome asked; answered 2026-07-19): rolls for breadth,
  templates for legends.** Authored variant templates stay FEW and iconic
  (hand-named, hunt-able, maybe trait-pairs the lottery never rolls) — the
  reskin-hurt is real only as (a) adjective-spam across bases, (b) value
  compression if authored variants undercut the lottery's scarcity, (c)
  balance surface sprawl. Every row must earn its name.
  **SCOPE ACCEPTED (rome, 2026-07-20 — "this sounds good", designed not built).**
  Growth math: ~40 droppable templates × (1 base + ~3 slot-pool rolls) ≈ ~160
  felt finds from the rows we already have; the catalog barely grows (the point).
  FORWARD-COMPAT is the real test and it holds: a new trait = one line added to
  its slot's pool (instantly roll-able on every item in that slot, the moment its
  one-line hook exists); new gear = a DB row (ledger already), inherits its slot's
  pool automatically — both growth paths stay one-liners, the lottery is the
  amplifier UNDER whatever we add next. Build shape (one focused ~1-day pass, like
  the ledger): (1a) mig adds `rolled_traits` to player_items + `rolledTraits` on
  CarriedItem + `effTrait/effHasTrait` folding instance ∪ template — the read-path
  swap at combat sites is the only real risk, do it COMPILER-GUIDED (tsc
  enumerates the sites the way it did for the ledger); (1b) roll-at-mint + slot
  pool (code map, tunable, no reship) + display-name suffix + floor survival.
  DECIDED defaults: survival rides the condition rail (`groundRolled` map mirrors
  `groundCond`, scalar-simple, accepts the same rare same-floor collision
  condition already does — upgrade to the instanced journal rail ONLY if it
  bites); roll is VISIBLE on the floor (the adjective shows in the room glance —
  the extraction thrill). Legends = a later, separate content pass (a few
  hand-authored variant rows + a rare drop-weight, ~zero engine code).

- **Day and night** *(rome likes it, 2026-07-17 — "a bigger feature, more
  thought needed"; design only)*. Today NOMAD has NO clock: "tonight" is pure
  flavor in event prose, darkness is spatial (`DARK_ROOMS` are born-dark
  forever), and the only day-anchored math is the bell's scheduling jitter
  (events.ts ~602). The sketch so far: the cycle is **surface-only** — the
  dungeon's eternal dark is its identity and must not gain a sun. At night the
  surface band (causeway, fen, hanging-hill, old road) joins the dark rooms:
  torch rules apply above ground, the map blacks out, crossing between gates
  after dark becomes a real decision; dawn/dusk each get a feed line; night
  could tilt what surfaces or prowls up top. Mechanically it's mostly one
  `isNight()` read feeding systems that already exist (dark-gate, torch
  economy, event weighting). **Open questions that make it "more thought
  needed":** cycle length (real-world-anchored vs an accelerated world-clock —
  a ~3h full day so every session sees both faces; lean accelerated, players
  span timezones); how night interacts with the weather events (does the gloam
  own the night? does rain at night read differently?); whether mobs keep
  their own sleep/wake rhythm against it (warm-bloods already doze); and
  whether the gatehouse fire becomes the night's anchor (rest/safety pull
  after dark). Not building until the cycle-length call and the
  night-ecology pass are designed.

- **Per-browser feed key for the arena stream** *(DEFERRED — do in a login/client
  polish pass, before any wider launch)*. Problem: extension (NIP-07) and bunker
  (NIP-46) logins prompt for **every** signature, so a player who hasn't set
  auto-approve publishes NONE of their ephemeral 24913 deeds → invisible in the
  colosseum (confirmed live 2026-07-16 with a lowercase extension player). Their
  actual gameplay is unaffected — only the spectator feed. **Fix:** generate a
  lightweight feed key per browser (localStorage), sign the ephemeral 24913 feed
  (and maybe 24914 speech — open) with it instead of the identity signer, so no
  login method ever prompts for the show. Load is unchanged (still one key per
  browser, NOT one shared firehose key — that anti-pattern stays avoided). The
  feed was always *"a spoofable show; the true record lives in D1/31573,"* so it
  never needed identity-grade signing. To keep colosseum colours matching in-game
  (rome cares), tag each feed event `["p", <identity-pubkey-hex>]` and have the
  colosseum colour by that tag, not the signing key. ~20 lines: `public.ts`
  publishFeed path (a ship + served-parse) + colosseum `nameColor` source (redeploy).
  **Stopgap until then:** tell the affected player to enable auto-approve/"always
  allow" for kind 24913 in their extension (Alby/nos2x support it; fragile,
  per-user/per-device). See [[nomad-arena-colosseum]].

- **The action-cost clock** *(Achaea's balance/equilibrium — rome iceboxed)*.
  Reassessed as the biggest and riskiest Achaea idea: it rewrites the combat
  cadence everything is tuned to. The primitive exists (`nextThrowAt`,
  stagger), so if it ever happens it's 1–2 opportunistic special cases (a
  heavy/reckless swing costs the *next* beat) — never a global balance bar
  retrofit onto the 4s round.
- **Idle kick** — boot truly-AFK players after N minutes so a forgotten tab
  doesn't hold a live session.
- **`say` is public, and named. Nobody's told.** *(updated 2026-07-15 — the
  mechanism CHANGED with the arena-feed ship.)* `say`/`shout` now go out under
  the **player's OWN key** (kind 24914 via `speechOut`), no longer the
  anonymised world key — the room copy is local (`toRelay=false`), but the wire
  copy is signed by the speaker, in clear, their real npub. So a player thinks
  two-of-you-alone-in-the-dark is private, and it's actually broadcast under
  their name. The architecture question ((a) should speech be on the wire at
  all) is effectively answered — it IS, and the public feed of overheard voices
  is one of the most compelling things about watching NOMAD from outside. The
  LIVE open end is (b): **the player should be told.** A room whose speech
  broadcasts should say so, the way the gatehouse says the opposite. Don't fix
  it by muting speech — fix it by disclosing it.
- **Communication layer** — `tell` is the remaining gap (`shout` and
  sound-carries shipped). Most on-brand: async **notes / dead-drops** (a
  written scrap left in a room for whoever comes next). Low-tech, high-flavor.
- **Guest-key wrapping at rest** *(decided AGAINST 2026-07-09, reasoning
  recorded)*: wrapping the localStorage nsec with an IndexedDB CryptoKey buys
  little — XSS, extensions, and disk malware all defeat it. The real walls are
  the textContent-only render path and the graduation paths. Revisit only if
  the client ever renders rich/user-URL content.
- **World events — the long weather (days-to-a-week)** *(design, rome
  2026-07-15; timed for JUST BEFORE the ~1000-room map expansion)*. Distinct
  from the shipped ROOM events (events.ts — tide/fog/weather, minutes-scale,
  ONE room): these are **world-scale and persist DAYS to a WEEK** — a condition
  that colours the WHOLE dungeon for a stretch: a season, a siege, a plague, a
  drought, a migration, a red moon. Purpose: a living calendar the world runs on
  its own — a reason for a player to check in ("what's happening this week"),
  and history the dungeon accumulates. Bigger map needs bigger weather: a
  1000-room world wants events that SWEEP it, not just per-room drizzle. Likely
  rides the existing daily cron (`schedule: 17 4 * * *`) to roll a world-event
  start/stop each day, persisted across the day-boundary + offline-sim so it
  survives restarts. Build the framework here; individual events are content.
- More rooms/creatures for the Door — but content sprawl stays the enemy;
  systems first.
- **SQL-rows for live state — the world-size ceiling fix** *(SHIPPED `e1537f7`
  2026-07-17 — `simstore.ts`; prod migrated itself on first wake, clean tail)*. The sim now sleeps in the
  DO's own SQLite (`sim_kv`): one row per creature, one per room-with-a-floor,
  one per singleton — the 128 KiB one-blob ceiling is gone (10 GB space).
  Saves are dirty-diffed in one transaction (usually cheaper than the old
  whole-blob rewrite); creature beat-churn (hunger/clocks) is excluded from
  the dirt judgement + a 5-min full flush, so free-tier row-write budgets
  hold. Migration is automatic on first wake (blob → rows → blob deleted, in
  that order). Verified: live blob→rows→eviction→rows pass on the local
  world, byte-exact shard/unshard roundtrip over every field, and a
  compile-time guard that fails the build if a SimState field isn't
  persisted. Disclosed trade-offs: savedAt ≤60s stale on hard restart (one
  catch-up step), creature hunger ≤5 min stale, and a worker ROLLBACK after
  prod migrates re-seeds the world (players' D1 state safe) — forward-fix
  policy. **Next ceiling** (far off): tick CPU over thousands of monsters;
  beyond one zone → shard into more zone-DOs (code already keys by `zone`).

## Easter eggs (parked; an egg in a help file stops being an egg)

- **Zap-triggered whispers** — zap a shrine 21 / 2100 / 21000 sats and
  something answers. Real value in, a wink out. Only NOMAD can do this.
- **Root-npub recognition** — if rome's own npub ever walks the Door, the
  dungeon knows its maker. Private, unfakeable.
- **A too-deep room** at the literal bottom, reached by an undocumented exit —
  a maker's message / one strange item.
- **Time-based winks** — genesis block (Jan 3), whitepaper day (Oct 31), or a
  NOMAD anniversary: one creature/line/trace changes for 24h.
- **Silent achievements** — a no-death deep extraction, a kill far above
  weight, all-maps-found: a private line, never a badge on a wall.

Rule: an egg must never break the sim or cheapen a secret.
