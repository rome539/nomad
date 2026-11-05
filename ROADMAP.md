# NOMAD Roadmap

*Forward work only. Shipped history lives in the git log and in the migrations,
which carry their own reasoning — this file is what is NOT built yet, plus the
rulings that bind whatever gets built next. If an entry here has shipped, delete
it; the commit is the record.*

*Guiding principle (the 2026-07-03 simulation pivot): build systems that create
stories, not scripted content. The interface is friendly; the world is not.*

*What NOMAD is, named plainly: an **extraction game on a persistent simulated
world**. Death drops everything carried, the gatehouse is the bank, keys open
locked caches, cigarettes are the hidden hard currency, and load decides how
loud and how dodgeable you are. What no game in that genre has is the world
underneath — it ticks whether or not anyone is watching. **The walk home is the
whole design.** There is no raid timer and no exit queue, so distance and load
are the only things making "push on or bank it" a decision. Protect that above
everything.*

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

## The world as built *(checked 2026-11-03)*

The surface expansion is done. Hand-authored, not generated (rome ruled
procedural out: the rooms read well *because* they're written); the pre-growth
baseline is the git tag `world-v1-110`.

**Live: 1,528 rooms, 736 spawns, 14 gates, 144 creature kinds, 401 items.**

| region | rooms |
|---|---|
| the mountain | 402 |
| the wood | 332 |
| the road (west and east) | 249 |
| the crossing | 239 |
| the fortress | 118 |
| the open ground | 82 |
| the den ground | 60 |
| the deep | 46 |

The summit's animal is the drake (`the-drake`, 150 hp; `the-pale-drake` 160).
Creatures are saved one blob per shard (`b:creatures:<shard>`, simstore.ts),
so the split this file used to schedule has shipped.

**Rulings that still bind new ground:**

- **New REGIONS, not new zone-DOs.** `regionOf` gains values; `ZONES` stays
  `["door"]`. Two always-on zone-DOs would be billable; one is free.
- **The dragon is an ANIMAL, not a wyrm.** No hoard-sitting fantasy dragon:
  an enormous old thing that holds the top of a mountain and needs no reason.
- **Altitude IS the difficulty curve.** Density rises with height.
- **Roads get PATROLLERS, not residents**, and make natural MOUTHS.
- **NO progression flags on gates.** What keeps the far country out of reach
  early is that you cannot survive the walk.
- **Where you wake** (rome, 2026-11-02): any gate, or a random road room; your
  own den 1 time in 8 on death. Never other regions unless rome asks. You
  don't choose where you wash up.
- **A CORRIDOR IS A CORRIDOR.** Redundancy is independent routes END TO END,
  not more doors or a loop in the middle. The pipeline runs a min-cut on every
  region it builds (one route per 40 rooms, floor of 2).
- **A room's square is a FACT, baked in its row** (`map_x`/`map_y`).
- **Rooms come from `regions/*.rooms`** via scripts/build-rooms.mjs, never hand
  SQL; a new region needs a record (chronicle.ts RECORDS) or the tests fail.

**The wood is a maze on purpose** (rome, 2026-10-29): its exits between its
own rooms don't have to match the map, and scripts/check-map-true.mjs exempts
them. Every other compass exit points the way it says (3,762 checked live,
2026-11-03).

**Capacity** *(measured 2026-07 at ~400 rooms; not re-measured at 1,528)*:
nothing was near a limit then. DO duration is the one real ceiling and the
calendar caps it: one zone running 24/7 lands at ~81% of the included
allowance. The world only ticks while a socket is connected.

## Next up (unblocked)

- **Forge: cut some recipes** *(rome, 2026-07-15)*. Scrap, smelting and
  forge-only gear have all shipped (migs 091, 092, 254, 265). What is left:
  the slate has grown to 73 recipes, and the junk end could be trimmed so it
  reads as a craft menu rather than a pile of starter-tier duplicates.

- **The Hunter / Nemesis** *(now the top of the stack)* — targeted pressure:
  the world sends a named predator after the too-successful player, who has to
  get out ahead of it. Reuses grudges + `curious` tracking + the blood-on-killer
  scent primitives that PvP just proved. Also the natural long-term raid clock
  for the shallow keep. (rome loves this one.)
- **Shallows heat map** — mobs harden where they're farmed (+1–2 HP, not
  damage), decaying back for fresh players. Not built. (Related, shipped: the
  HUNTED region condition, conditions.ts, makes the prey wary where players
  have been killing hard; it changes behaviour, not HP.)

## Shipped systems — open ends only

- **Room events / the weather** (events.ts): the **undertow-grasper** (anti-turtle,
  designed not built — build only if the pavise-turtle proves too safe); **pack
  weight slowing the wade, exits sealing on flood, float-ups** (the tide's deferred
  second layer); the **warden's muster** (a patrol surge) and a general
  **stillness**. **The breach is PARKED** (rome: it does not fit) — fully built and
  idle, its pool ticket one commented line; restore = uncomment.
- **The small lives**: fleet-rat play (pure flavour), scavenger killing-floor
  rounds (mostly covered by the existing corpse-smell wander).
- **Fire & light**: `search` for hidden exits (dark hides them, light finds them),
  and **map-blackout of dark rooms** — a room you've only seen dark shouldn't sit
  on your HUD map. Neither built.
- **Storied gear v2 and THE SCAR are REJECTED.** Do not build or offer either.

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
- **Prices** — 063 killed the dominated buys; whether the curve is right is
  for play to show.
- **Should a wielded weapon feed movement noise like plate does?** *(parked, no
  one has asked)*. `loadOf` sums every equipped slot including the weapon and
  shield, so a naked delver holding a wt-3 mace is 24% noise a move. The AMOUNT
  is the load law working as designed and stays; the lever if it's ever wanted is
  to drop or halve the weapon slot **in the noise calculation only**. (The
  related flavour bug — telling a man with no armour that his "armor rings" — is
  fixed; `wornArmorWeight` names the true source now.)

## Afflictions & cures — the framework *(gated)*

The pattern (status + tell + cure path) now has several live instances: bleed,
hobble, the fever rat's fever, the rat king's cough, being wet, and being winded.
The general framework — stacking statuses, cure-routing, mobs applying them —
stays on paper until the glanceable-status UX carries them all comfortably and
play validates the combat numbers.
When it opens, the on-brand growth is **poisons, tinctures, and set traps**
(gritty survival, never magic) — including the parked deep-poison: a stacking
drain the longer you linger, ticks decaying when you leave/rest.

- **WOUNDS BY BODY PART** *(researched 2026-11-03; rome likes it, a bigger
  build, not yet)*. From Achaea's limb damage and the RPI MUDs' detailed
  wounds. NOMAD already has one: the **hobbled leg** (a leg-rake creature lands
  it, thick hide or worn mass can save you from it, you limp out of a fight
  slowly, and rest or a gatehouse mends it). The idea is more wounds of the
  same shape, not a new system:
  - an **arm wound** that weakens your swing;
  - a **head blow** that makes your next command miss (Achaea's concussion);
  - each with its own tell on a close look, and its own save and mending.
  Treatment today: a bandage stops a bleed, and rest mends a hobble. (`cure` is
  NOT a wound cure here: it smokes meat on a rack.) Open: which creatures land
  which wound, what saves each one, and whether a bandage or rest mends it.
  Check against the balance ceilings (2-22 rounds) before any numbers.

## Extraction feel (rome-ranked above the MUD-flavor ideas)

- **The dangerous walk back** — loot is worthless until you're *out*; the deeper
  you went, the longer the run home. **This is the load-bearing wall of the whole
  design.** NOMAD has no raid timer and no exit queue, so the walk is the only
  thing making "push on or bank it" a real decision. Anything that shortens the
  walk home, or makes banking more convenient, quietly removes the game.
- **Task / bounty runs** — objectives that *force* insertion: retrieve a thing,
  reach a room, hunt a marked wanderer (rides the blood-on-killer primitives).
  (The keeper's bounty board, which pays meals for trophies, has shipped; these
  are the other kinds.)
- **The seal as a vulnerable moment** — claiming becomes a channeled hold: a few
  exposed ticks, sound carrying, interruptible. The gate stops being a safe
  button. *(Not built.)*
- **Campers make noise** — the reactive half is live (`listen` surfaces a still
  camper; a heavy pack betrays them standing). The open end is the *passive*
  broadcast: stillness that leaks into a room's ambient with nobody listening.

## Player economy and society

Built as if the world were already full (rome, 2026-07-13). PvP has shipped
(by choice at a gate, mig 359), and so has trade between wanderers (`deal`,
trade.ts).

- **Zaps** — `nostr-lightning/` is on the shelf.
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

- **THE WORLD'S STORY — what emptied the country** *(rome, 2026-11-05)*. Every
  region shows the same thing: a settled country stopped mid-week and left in
  a hurry, the names later taken off. Rome's lean for the cause, for now, is
  **a plague** (the fever graves in every village, everyone going at once, the
  fever coming back each year as its echo) **together with something from
  below or above** (the iron doors that are never rusted, the warm summit,
  the older country under the ground). Two other causes are held for later
  story, not dropped:
  - **The country ordered empty.** Whoever held the writ called everyone in or
    away, the roads stopped where the order reached, and the keepers still
    keep "the arrangement" because nobody told them to stop.
  - **The siege went on.** Whoever undermined the Door went on through the
    rest of the country; the spoiling and the names taken off are the
    winners' work, or the hiders'.
  **Decided 2026-11-05: the sickness came up from below**, and the graves are
  older than the towns. The plague dead were buried fast in the one ground
  nobody wanted, an older burial ground, and a close look at every fever
  graves (the three villages and the fortress's ossuary, catacomb and plague
  trench) finds older bones under them and, under those, the same flat
  dressed stone laid tight with cold air coming up through its joints. Room
  texts unchanged.
  **Decided 2026-11-05: they went to different lands**, out of the country
  in different directions, not all one way (the roads can carry it).
  Still open: who took the names off, whether the keepers are one order, what the
  iron doors are, one fixed "how long ago" (room texts disagree: two hundred
  years, generations, a very long time), and who the player is.

- **THE WIDE LAND — the world's next shape** *(researched 2026-11-03; rome
  likes it, research only, nothing authorised)*. The world today is one thin
  strip: 165 squares west to east and about 34 north to south, every region a
  stop on a single line (wood, den ground, road, fortress, road, crossing,
  mountain), with the fortress's inside and the deep laid flat as a column on
  the land to the south. It reads as a corridor, the two ends are dead ends,
  and there is no open country for settlements. The older MUD that plays most
  like NOMAD, MUME, is one wide land drawn to scale with places dotted across
  it and no shortcut home; that is the model. The plan, as it stands:
  1. **New country, low ground only, nothing moves.** North country (low moors,
     a river valley, rolling hills) above the line, stopping at the crossing;
     south country (coast, salt marsh, fen, at sea level) below it, the whole
     width. Every existing room keeps its square.
  2. **The mountain stays the highest point.** Nothing new north of it (north
     of the mountain is only its own high face, cliffs and snow); the land
     rises one way, sea and marsh to moor and road to the crossing to the
     summit. The landmarks already make the mountain the thing seen furthest
     off, so new ground gets it for free.
  3. **A northern road** from the wood's north side across the north country
     to the mountain's foot by the crossing, never over higher ground: two
     ways home from either end.
  4. **Floors. BUILT 2026-11-03 (mig 365), not yet shipped.** Every room has
     a floor: 1 the overworks, 0 the ground, -1 the halls, -2 the warrens, -3
     the deep, taken from the stratum each room was already in rather than
     from the stairs. The halls, warrens and deep moved north to sit under the
     fortress, so the south of the open ground is free for the south country.
     The map window shows only the floor you stand on (rome turned down the
     ground drawn faint over the floors below), with arrows for the floors
     your copy has rooms on. `.rooms` files
     take `!floor N`; a square is unique per floor; check-map-true holds up to
     never lead to a lower floor. One stair disagrees and is listed as the
     check's only exception: up from the Black Fen into the Sewer Mouth, a
     warrens room. Floors are only for indoors and underground: the
     mountain's height stays ground you climb.
  5. **About 1,600 new rooms** (rome's pick): half the density of the wood and
     the mountain, open country with places dotted across it rather than a
     maze in every square. The world goes from 1,528 to about 3,100.
  6. **What the new ground is for:** settlements wherever three or more dens
     cluster, in any region; old places people left to find and rebuild (the
     holding, the hamlet, the old growth already exist, the new country adds
     more); the den shelf as a shop (goods priced in kind, taken by leaving
     the price); one thing per region players rebuild for everyone (the wood's
     west bridge, taken up from inside, is the first); and the returned names
     (below).
  7. **No recall, portals or coaches.** The walk home stays the game.
  Still open: the new country's regions and names, where the northern road
  meets the old ground, and the build order. Every new room still needs its
  plates (day, night, night-torch, snow) and creatures at the band's density.

- **THE NAMES COME BACK** *(researched 2026-11-03; rome likes it, research
  only)*. The fortress canon: after it fell, somebody took the names off
  everything (faces scraped, name-stones chiselled blank, devices cut off).
  A few names survived where the scrapers missed them, each a physical thing
  found by a close look in the right place (inside a helmet in the deep,
  under a tabard's lining, on a tally the holding kept, under a gravestone),
  no list and no hints, and carried home, so it drops if you die. Returning
  them opens **the deep's own secret** (rome, 2026-11-03), and the keeper
  starts telling that person's story, a telling that did not exist before.
  Why the deep: every other part of the world has a secret door of its own
  (the wood's moon door, the crossing's tide door, the mountain's riddle door,
  the fortress's bell door up from the armory), while the deep's heart door is
  only the way IN (undercroft, down); its 46 rooms hide nothing of their own.
  This gives it one, and the canon already points at it: the only writing the
  scrapers left in the deep is the warning on the Black Threshold's lintel.
  Open: what the secret is and where it opens, how many names it takes, and
  whether the names go back at the roll room or down in the deep itself.
  (A version where a named hollow lies down for good was offered and turned
  down; so was the chapter house being the sealed place.)

- **EXITS YOU SAY IN WORDS** *(researched 2026-11-03; rome likes it, research
  only)*. From Armageddon's rebuilt world, where an exit can be free text
  ("enter the wardrobe") as well as a compass point. Today NOMAD has the compass,
  up/down, in/out, and animal paths; `climb` is only another word for `go`. The
  idea: some ways out are things you do, `climb the yew`, `squeeze through the
  gap`, `wade the ford`, so crossing from one place into another feels like an
  event (Koster's zone lesson: make the exit between two pockets dramatic).
  Open: whether a word exit replaces the compass direction on that side or sits
  beside it; how the map draws it (rooms keep their fixed squares); whether the
  map-truth check and the corridor rule see it as an ordinary exit; and where
  word exits belong (the obvious places are where the room text already
  describes climbing, squeezing or wading).

- **THE ONE THING IN THE WORLD** *(researched 2026-11-03; rome likes the
  sound of it, research only)*. From Carrion Fields, where each team's powers
  live in one physical object under an NPC guard, and an enemy who kills the
  guard can carry the powers off. In NOMAD: a single object, the first true
  one-of-a-kind (every item today has copies), that does something while you
  carry it. It can't be sealed, stashed, vaulted or shelved, so it never stops
  moving; you die, it drops with everything else, and the killer takes it. The
  carrier is the most hunted wanderer on the map. Fits the parked "new kind of
  reward" thread. Open calls:
  1. **What it does.** Sideways, never more damage (gear tops out at epic).
     Offered: a light rain and wind can't put out; always knowing the way to
     the nearest gate; hearing the rooms next to you clearly; creatures that
     won't strike first.
  2. **How the world knows who has it.** The keepers say roughly where it was
     last seen; the region's record names the holder exactly (information has
     a toll: hunters go and ask).
  3. **The gatehouse.** It can't sit in there forever. Offered: it won't cross
     the gate; it can, but the keeper tells everyone; it pulls you out after a
     while.
  4. **Logging off with it.** Unchecked: can a logged-off body be attacked
     where it waits? If yes, nothing else is needed; if no, it has to drop.

- **THE KEEPER BUYS A FULL ACCOUNT** *(parked 2026-10-24 by rome, for later)*. Once
  study by behaviour shipped, a finished journal page (every behaviour the
  animal has, plus its kills) is real work, and the only thing it pays out is
  knowing the animal. The idea: sell a full account at the hatch, for barter or
  for one of the keeper's tellings. Open questions: does the page leave your
  book (a copy, or the page itself), and is it once per kind per wanderer.

- **THE HERALD — a rout that fetches the den** *(parked 2026-08-24; rome would rather give
  the behaviour to one specific creature)*.
  Offered as a mob-lottery trait and turned down as one, deliberately: a random
  1-in-12 animal that calls its whole den when it breaks is a thing that happens
  TO you, and you can never learn which one it was until it is too late to
  matter. On a NAMED creature it becomes a rule you can know and plan around —
  you learn that this one must not be allowed to run, and the fight changes
  shape because of it. Same behaviour, opposite legibility.
  The wiring already exists: `shareGrudges` (ai.ts) spreads a fled creature's
  grudge to kin **standing in the same room**. The herald widens that to the
  line's dens, so letting it escape stops being free and buys you a reception
  somewhere you have to walk through later. Wants a creature that already has
  a den worth calling — the lead-dog, a wolf, something with kin behind it —
  and its own tell, so the cost of letting it break is legible before you do.

- **THE BOARDED DOOR — a gate shut for works shows it** *(parked 2026-09-26 by
  rome)*. When `works.ts` boards a gatehouse up, the gate's picture still shows
  its door standing open. It was built once and taken back out before it
  shipped. That version had three parts. The status frame carried `shut: 1`,
  re-sent to anyone at the gate when the boards went up or came down. Each
  gate's door was outlined by its four corners. The room-effects layer
  (`room-fx.md`) fitted a boards image into the doorway and lit it from the
  wall beside it. What we learned:
  - A fully planked door looked pasted on: finer pixels than the plate,
    brighter than the wall, and fitted exactly inside the frame.
  - One plank across the doorway with the WORKS sign read better. rome wanted
    it as a NEW image (single plank, flat, magenta background) rather than
    one cut out of the full-door art.
  - At the Broken Gate and the Weeper Arch the boarded thing is the keeper's
    door beside the passage. The big gates stay open, because the room stays
    walkable while the door is shut.

  **Kept:** `game-server/scripts/plate-fx-doors.json`, the 14 door outlines
  (TL TR BR BL, 0–1 of the picture). Each was checked against all six
  conditions, and they hold across all 84 gate pictures.

- **THE SCAR — gear that carries its own history** — **REJECTED 2026-08-29.**
  rome turned it down flatly, and it is not a park this time: do not build it,
  and do not offer it again. The whole design stays below at his request —
  the thinking is worth keeping, the feature is not — so read the rest of this
  entry as a record of a decision, never as a queue item. The open question it
  ends on was never answered and now never needs to be.
  *(Originally pinned 2026-08-13 for later.)* Wear is currently a recurring bill and nothing
  else: repair sets condition flat back to 100 (gate.ts, REPAIR_COST by rarity),
  so a piece of gear is immortal as long as you keep paying. The scar gives that
  system a memory. The FIRST time a piece falls past GEAR_FAILING_AT (12), it
  permanently gains a bad trait — brittle, pitted — and wears it in its own name
  from then on: "a brittle rusted sword". Condition still repairs to 100; the
  numbers are fine; the character changed.

  CHEAP BY CONSTRUCTION: per-instance traits already exist and already persist.
  rolledTraits is written on the item row and read via rolledMap — the same
  field that makes one cloak "muffled" and the next one plain. Writing a trait
  at a condition threshold needs no schema change and no new system.

  THE OPEN QUESTION, and the reason it is parked: rome's objection was that a
  permanent mark is too permanent. Two answers were offered and neither chosen —
  (a) the FORGE grinds it out, dearer than a plain repair, so the scar is a bill
  rather than a brand and becomes an economy sink; (b) it FADES on its own once
  the piece has been kept in healthy condition for a while, so neglect marks it
  and care unmarks it and nothing is ever lost. Pick one before building.

  ONE TUNING NOTE ALREADY SETTLED: it must fire on FAILING (12), never on WORN
  (35). At 35 everything anybody owns is scarred inside a week and the mark
  stops meaning anything.

  NOT THE SAME AS GEAR MORTALITY, which rome raised in the same conversation and
  which is a much larger change: a falling repair CEILING (100, then 85, then
  70) makes every item in the game consumable and touches the fence, the vault,
  the seal and the whole scarcity model at once. That is its own conversation,
  deliberately, not a rider on this.

- **CREATURES THAT HARDEN ON UNHUNTED GROUND** *(pinned 2026-08-08; rome does not like it
  and parked it)*. Two versions were explored and BOTH are
  parked; the idea keeps coming back, so here is the whole thing including why
  each shape failed, so it is not re-derived from scratch.

  *Version A — promote the creature's VARIANT with age* (a grey wolf that lives
  long enough becomes a dire wolf). Three problems, one of them fatal:
  `reconcilePopulation` keys bloodlines by template and treats "a variant with
  its own dens" as its own line, so a promoted wolf puts the dire line over cap
  and the base line under — and gets CULLED as surplus on the next world load.
  Beyond that it is a one-way ratchet (nothing turns a dire wolf back), and
  variants carry richer drops, so free promotion is loot inflation with no kill
  behind it.

  *Version B — put it on the GROUND, not the creature.* Mark a room when a
  PLAYER kills there; recently-hunted ground makes animals jumpy (bolt earlier),
  long-unhunted ground makes them unafraid — reusing the `scavengerBold` shape
  (suppresses flee, 1.35x damage), which is already a proven soft boost that
  changes no template and touches no loot. Self-reversing by definition, since
  hunting is what erases it, and it needs no road exemption because the road is
  the most-trafficked band and therefore stays soft on its own. rome rejected
  this. NOT re-proposed without him raising it.

- **Dens → TOWNS** *(rome, 2026-07-22; the den system's own named next step)*.
  The den layer shipped and left this open. **3+ dens clustered on one ground
  become a town**: a shared front gate, a fire that stays lit, and a trader who
  only shows up where people actually live. With it come **monster-driven raids**
  — which is what the bar has been waiting for, since a bar nothing ever tests is
  a purchase rather than a decision — and **the hearth as where real cooking
  happens**. **Player raiding stays OUT** by his ruling. The point is a personal
  stake on the world's clock: extraction currently ends at a shared, neutral
  gatehouse with nothing of yours to tend or lose.

- **New mob mechanics — genuinely unbuilt categories** *(rome, 2026-07-22,
  same conversation as dens — design only, several are candidates for the
  new zone's population)*. `MobTemplate` only has `bleed`/`stun` (mirrors
  weapons' edge/blunt); it has no `pierce`, no `sweep`/cleave equivalent, and
  mob abilities are mostly hardcoded Sets (`LURKERS`, `THIEVES`, `SENTINELS`,
  etc.), so a new mob mechanic is a real code build, never a data-only
  migration the way a new weapon is. (Per-spawn traits now exist: the trait
  lottery, `MOB_TRAITS` in zone-data.ts.)
  Ranged/thrown was considered and DROPPED — the room-based combat model has
  no notion of acting on a player from outside their own room, and that's too
  much new plumbing for uncertain payoff (rome, 2026-07-22: too hard to get
  right). What's left, roughly ordered by how much they reuse
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
  - **Debuff on a landed heavy hit, never a disable** — a visible, temporary
    softening of your next swing (damage or accuracy), reworked from a
    fear/rout idea specifically to respect the standing law that no
    affliction may deny escape as a dice-roll — always visible, always
    timed, same shape as hobble.
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
  *(Since built, and so off this list: splits on death and light-snuffing, as
  mob traits; dragging you off, by the drowned ferryman's rope; and closing a
  room's exits, by the pack standing in the gaps, `ai.heldExits`.)*

- **Far-world write cost — mostly already solved; small residual lever** *(rome,
  2026-07-20 — investigated the "lots more mobs" scaling question, found the win
  is already banked)*. The write axis (rows_written → $), not CPU, is what meters
  mob scale. **The "stop rewriting rooms for hunger they can recompute" idea is
  ALREADY SHIPPED:** `simstore.ts` `VOLATILE` set (`hunger, nextWanderAt,
  thirstAt, sleepUntil, repositionAt, murmuredAt`) is stripped before the dirty
  comparison (`stableCreatureCopy`), so smooth drift generates ZERO writes; a 60s
  throttle + 5-min full flush persist churn with bounded staleness. Combined with
  the bubble freezing far creatures outright, **idle far regions already cost
  ~nothing on writes** — the headroom was there for ~400 rooms / ~800 mobs when
  this was measured (2026-07); the world is now 1,528 rooms and 736 spawns,
  with creatures saved per shard. The ONLY residual lever, and it's small: the
  30s ecology sweep still produces genuine STRUCTURAL far events (a mob changes
  rooms — `WANDER_MIN/MAX_MS` 45–150s — a birth, a death) that dirty legitimately.
  To cut those you'd freeze/slow far-world WANDER (unobserved mobs have no reason
  to pace; hold position, redistribute lazily on bubble-entry) so the far world
  only writes on rare tens-of-minutes events. Modest gain, only worth it at
  thousands-of-rooms scale. Cheapest knob of all if writes ever bite: bump
  `SLOW_ECOLOGY_MS` 30s→60s (halves structural-sweep + throttle writes; cost =
  coarser far dynamics, NOT visible staleness — entry catch-up is capped by
  `CATCHUP_CAP_MS`). See [[nomad-scaling-ceiling]].

- **System-hook gear — seven approved pieces** *(rome, 2026-07-19: approved all
  seven, to be noted down)*. The anti-reskin law behind them: **every new
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
- **A shout goes out under your own name, and nobody's told.** `say` reaches
  the room only and nothing goes to a relay (rome, 2026-07-21). `shout` still
  publishes, signed by the speaker's own key (kind 24914, `speechOut`), so a
  shout in the dark is public under a real npub. The open end: **the player
  should be told**, the way the gatehouse says the opposite. Fix it by
  disclosing it, not by muting it.
- **World events — the long weather (days-to-a-week)** *(design, rome
  2026-07-15; timed for JUST BEFORE the ~1000-room map expansion)*. Distinct
  from the shipped ROOM events (events.ts — tide/fog/weather, minutes-scale,
  ONE room): these are **world-scale and persist DAYS to a WEEK** — a condition
  that colours the WHOLE dungeon for a stretch: a siege, a plague, a drought, a
  migration. (There are NO seasons in NOMAD. Shipped since: region conditions,
  conditions.ts — boom, murrain, hunted, thick — earned per region, not rolled;
  and the blood moon and the eclipse.) Purpose: a living calendar the world runs on
  its own — a reason for a player to check in ("what's happening this week"),
  and history the dungeon accumulates. Bigger map needs bigger weather: a
  1000-room world wants events that SWEEP it, not just per-room drizzle. Likely
  rides the existing daily cron (`schedule: 17 4 * * *`) to roll a world-event
  start/stop each day, persisted across the day-boundary + offline-sim so it
  survives restarts. Build the framework here; individual events are content.
- More rooms/creatures for the Door — but content sprawl stays the enemy;
  systems first.
- **NOMAD as a webxdc app** *(pinned 2026-08-15 — rome: low-tier thought)*.
  A `.xdc` runs offline in a Delta Chat group: no network of any kind, no
  server, no relays, state shared only through an append-only broadcast log
  (`sendUpdate` / `setUpdateListener`). So the Durable Object cannot come along,
  and with it goes the referee that owns the tick, resolves the blow and decides
  what dropped.
  **It can still be real multiplayer, via deterministic lockstep**: every peer
  runs the identical sim, only INPUTS are broadcast ("go east", "attack the
  wolf"), each peer orders them by (tick, sender) and simulates. Cheat
  resistance then comes from REPLICATION rather than authority — a liar's client
  can submit inputs but every other peer validates them against its own copy of
  the rules, so a claimed legendary simply isn't one.
  **Why the codebase is closer than it looks:** all randomness funnels through
  one 27-line file (`rng.ts` — rand/randInt/chance/pick/uuid), so seeding it is a
  ONE-FILE change; the clock is already a threaded parameter (`tick(now)`,
  `creatureMoves(…, now, …)`); `simstore.ts` already isolates state from host;
  `ai.ts`/`events.ts` are already free functions over `z`; the client is already
  self-contained and textContent-only, which is exactly what a `.xdc` wants; and
  the offline catch-up sim already re-simulates from `savedAt`, which in lockstep
  stops being a special case and becomes the normal mode.
  **The two real costs.** (1) HIDDEN INFO LEAKS — every peer holds the whole
  world to simulate it, so chest contents, lurker positions and other players'
  packs sit in every client's memory; commit-reveal fixes the worst and is real
  work, and the mitigating fact is that a webxdc app lives in a group chat among
  people you know, not an open server. (2) You can only act while CAUGHT UP —
  inputs past a lag horizon are rejected, so a returning player watches the world
  replay first.
  Also: drop or hard-trim `assets.ts` (3.4MB of base64). Scale when pinned:
  761 rooms; now 1,528 rooms, 3,762 exits, 401 items, 144 creature kinds. Size
  is not the blocker.
  **A sibling, not a port**, sharing the engine with nomadmud.com. Weeks of work,
  and the first step is making the engine not care whether its host is a Durable
  Object or a browser tab.
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

