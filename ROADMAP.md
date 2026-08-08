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

## THE WORLD GROWS OUTWARD — the surface expansion *(THE ACTIVE ARC)*

The world stops being a fortress and becomes a country. Hand-authored, not
generated — rome ruled procedural out: the rooms read well *because* they're
written. Baseline tagged `world-v1-110` before the first new room.

**Where it stands: 408 rooms, 193 spawns.** Built and live: the **west road**
(68 rooms, with the drove fork and the three-way fen), the **wood** (171 — a
real maze, the woodward walking it, its own crafting materials and traits), the
**den ground** (60) and the **den system** on top of it. What's left, in order:

| region | rooms | mobs | shape |
|---|---|---|---|
| East Road | 45 | 10 | rises for a dozen rooms before the climb |
| The Crossing | 170 | ~100 | the great water; gates the mountain by being a place, not a lock |
| The Mountain | 380 | ~300 | five tiers; density CLIMBS with altitude (0.4 foothills → 1.2 ridge) |
| The Summit | 1 | the dragon | |

**Build order:** east road → crossing → mountain → dragon.

**Rulings that bind what's left:**

- **New REGIONS, not new zone-DOs.** `regionOf` gains values; `ZONES` stays
  `["door"]`. Two always-on zone-DOs would be 162% of the included allowance and
  billable; one is ~81% and free.
- **The dragon is an ANIMAL, not a wyrm.** NOMAD's register is dead institutions
  and things that used to be people — a hoard-sitting fantasy dragon would be the
  first borrowed thing in this world. An enormous old cold-blooded thing that has
  held the top of a mountain a very long time and needs no reason.
- **Altitude IS the difficulty curve.** Mob density rises with height, so the high
  ridge is worse than the deep and you can see how far up you are.
- **The Crossing gates the mountain** — a place, not a lock. It also brings the
  water machinery (fishing, drowning, the tide, drowners) to the surface.
- **Roads get PATROLLERS, not residents** — you meet something *going somewhere*.
  Roads also make natural MOUTHS, so migrants come up them and you pass them.
- **NO progression flags on gates.** A gate is a door that's there. What keeps the
  far country out of reach early is that you cannot survive the walk.
- **Respawn stays RANDOM across spawn points** — nearest-gate was proposed and
  rejected. You don't choose where you wash up and nobody camps one gate.
- **A CORRIDOR IS A CORRIDOR.** Redundancy is not more doors, more mouths, or a
  loop in the middle: it is independent routes END TO END. The pipeline now runs a
  min-cut on every region it builds and reports how many people it takes to own
  that ground (one route per 40 rooms, floor of 2). **The east road, the Crossing
  and the mountain are each a single line off one seam by default — none of them
  may ship that way.**
- **A room's square is a FACT, baked in its row** (`map_x`/`map_y`). Nothing is
  derived, nothing collides, and adding a region cannot disturb a room already
  drawn. New ground gets its squares authored by the pipeline.

**Engineering still needed:**

- **Mob rosters** per region (stat-blocks are data; new *behaviours* are code).
- **The dragon's mechanic** — breath, a room-wide sweep, an airborne phase. Real
  code, not a migration.
- **Per-region** mouths, water/forage rooms, chest tiers, ambience, map label.
- **SPLIT `b:creatures` BY ZONE — when the mountain starts.** A dated appointment,
  not a bug. `simstore.ts` warns at 64 KB; at 216 bytes/creature that's ~303
  creatures. The plan lands near 625. One blob per region instead of one for the
  world, so only the dirty region writes. **Rooms are free; monsters are the load.**
- **The wood's map squares are 226/410 correct** — its maze cores were wired for
  connectivity rather than geometry, so its loops don't close. Frozen-wrong beats
  differently-wrong every deploy; correctable one door at a time.

**Capacity (measured, Workers Paid):** nothing here is close to a limit. DO
memory ~5–15 MB of 128. D1 storage ~3 MB of 5 GB. Rows read 1.5% of the monthly
allowance. **DO duration is the one real ceiling and the calendar caps it** —
889 hours of world-awake time against a 720-hour month, so one zone running
24/7 lands at ~81% and still costs nothing. The world only ticks while a socket
is connected, which is why an idle NOMAD bills zero.

## Next up (unblocked, pre-players)

- **Forge & smelt economy — the half that's left** *(rome, 2026-07-15)*. The
  two-tier material SHIPPED: salvage yields scrap, and `SMELT_SCRAP_PER_IRON`
  (5) smelts scrap into iron, so iron is accumulated rather than handed out.
  What is still not done, of 43 recipes:
  1. **Forge-EXCLUSIVE gear.** Almost every recipe makes something that also
     drops in the world, so forging is never the only path to anything and
     rarely worth the scrap. Add gear you can get ONLY by forging — a reason to
     gather iron. (The wood's six recipes from mig 153 are the model: they take
     wood trophies nothing else wanted.)
  2. **Cut some recipes.** Trim the junk end so the slate reads as a craft menu
     rather than a pile of starter-tier duplicates.

- **The Hunter / Nemesis** *(now the top of the stack)* — targeted pressure:
  the world sends a named predator after the too-successful player, who has to
  get out ahead of it. Reuses grudges + `curious` tracking + the blood-on-killer
  scent primitives that PvP just proved. Also the natural long-term raid clock
  for the shallow keep. (rome: "i love this.")
- **Shallows heat map** — mobs harden where they're farmed (+1–2 HP, not
  damage), decaying back for fresh players. Unblocked since curved armor.

## Shipped systems — open ends only

- **Room events / the weather** (events.ts): the **undertow-grasper** (anti-turtle,
  designed not built — build only if the pavise-turtle proves too safe); **pack
  weight slowing the wade, exits sealing on flood, float-ups** (the tide's deferred
  second layer); the **warden's muster** (a patrol surge) and a general
  **stillness**. **The breach is PARKED** (rome: "doesn't fit") — fully built and
  idle, its pool ticket one commented line; restore = uncomment.
- **The small lives**: fleet-rat play (pure flavour), scavenger killing-floor
  rounds (mostly covered by the existing corpse-smell wander).
- **Storied gear v2** (population-gated): deeds riding the 31573 loot cert for
  bazaar interop, plus a journal surface. The engraving itself is live.
- **Fire & light**: `search` for hidden exits (dark hides them, light finds them),
  and **map-blackout of dark rooms** — a room you've only seen dark shouldn't sit
  on your HUD map. Neither built.

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
- **Should a wielded weapon feed movement noise like plate does?** *(parked, no
  one has asked)*. `loadOf` sums every equipped slot including the weapon and
  shield, so a naked delver holding a wt-3 mace is 24% noise a move. The AMOUNT
  is the load law working as designed and stays; the lever if it's ever wanted is
  to drop or halve the weapon slot **in the noise calculation only**. (The
  related flavour bug — telling a man with no armour that his "armor rings" — is
  fixed; `wornArmorWeight` names the true source now.)

## Afflictions & cures — the framework *(gated)*

Bleed and hobble are the two proven instances of the pattern (status + tell +
cure path). The general framework — stacking statuses, cure-routing, mobs
applying them — stays on paper until (1) the glanceable-status UX carries more
than two tags comfortably and (2) play validates the fresh combat numbers.
When it opens, the on-brand growth is **poisons, tinctures, and set traps**
(gritty survival, never magic) — including the parked deep-poison: a stacking
drain the longer you linger, ticks decaying when you leave/rest.

## Extraction feel (rome-ranked above the MUD-flavor ideas)

- **The dangerous walk back** — loot is worthless until you're *out*; the deeper
  you went, the longer the run home. **This is the load-bearing wall of the whole
  design.** NOMAD has no raid timer and no exit queue, so the walk is the only
  thing making "push on or bank it" a real decision. Anything that shortens the
  walk home, or makes banking more convenient, quietly removes the game.
- **THE GATEHOUSE CLOSES FOR WORKS** *(rome, 2026-08-07 — designed, not built)*.
  A gatehouse shuts for a while — under construction, being rebuilt — and while
  it is shut the door will not open. The **gate room is untouched**: still
  walkable, still a spawn, still on the map. What goes is everything behind the
  door at once — the lockbox and vault, the keeper's hatch, the forge and
  smelting, the smoke racks, the wall chart, and the safe step out of the world
  (every gate room is `is_safe=0` itself bar the Withy Hut, so the shelter *is*
  the gatehouse). You walked here carrying everything and there is nowhere to put
  it and nowhere to stand. It is the walk-home pressure above, applied on a dial.

  **Measured before designing — there are 4 BANKS, not 7 gates:**

  | bank | doors | cost of shutting one |
  |---|---|---|
  | the fortress | `gate`, `sally-port`, `weeper-arch` — 5–6 rooms apart | world average walk 6.6 → 6.7. Nothing. |
  | the road | `the-first-milestone` | 6.6 → 6.9; the fortress is 5 rooms on |
  | the wood | `gate-arch`, `timber-stack`, `withy-hut` — 8–10 apart | 6.6 → **7.4** |

  Uniform random over seven doors spends three rolls in seven on the fortress
  cluster, where the event is invisible. **Draw from the four banks, not the seven
  doors.** Two shut at once is where it bites: `timber-stack + withy-hut` takes the
  world average 6.6 → **9.2** and the worst walk 21 → 25. Nothing is ever stranded
  — every room still reaches a bank in every one- and two-closure case tested, so
  there is no fairness cliff at two.

  **Rules it needs:** never the last open bank; **announced** (the keeper names
  the works, and it rides the gatehouse news) so it is a plan you make rather than
  a nine-room surprise; nobody shut inside — if you are in there when the works
  start you are let out, not trapped; hours, not minutes.
- **Task / bounty runs** — objectives that *force* insertion: retrieve a thing,
  reach a room, hunt a marked wanderer (rides the blood-on-killer primitives).
- **The seal as a vulnerable moment** — claiming becomes a channeled hold: a few
  exposed ticks, sound carrying, interruptible. The gate stops being a safe
  button. *(Not built.)*
- **Campers make noise** — the reactive half is live (`listen` surfaces a still
  camper; a heavy pack betrays them standing). The open end is the *passive*
  broadcast: stillness that leaks into a room's ambient with nobody listening.

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

