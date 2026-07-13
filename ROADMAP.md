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
- **Stance through death** — stance persists across a death (onPlayerDeath
  doesn't reset it), which is why a corpse can come back still reckless. Ruling
  pending: reset to steady on death, or leave it as the player's problem.
- **Stance in the status bar** — the one combat read still not glanceable.
  Flagged during the feedback pass; not decided.

## Next up (unblocked, pre-players)

- **The Hunter / Nemesis** *(now the top of the stack)* — targeted pressure:
  the world sends a named predator after the too-successful player, who has to
  get out ahead of it. Reuses grudges + `curious` tracking + the blood-on-killer
  scent primitives that PvP just proved. Also the natural long-term raid clock
  for the shallow keep. (rome: "i love this.")
- **Storied gear — THE ENGRAVING (BUILT 2026-07-13, migration 077, in tree
  unshipped)**. The identity feature landed. Key architectural finding: the
  mint SERIAL couldn't carry the biography — title cracks at every transfer
  (drop/death/trade, the 2026-07-05 law, unchanged) — so the FIRST sealing
  **engraves** the piece (lore_id, gear only) and the deeds-ledger keys on the
  mark, which endures through every hand and floor (groundLore, the
  wear-survives-drop pattern; instanced like wear, not like journals).
  Ledger: **kills** (equipped weapon, PvE + PvP), **descents** (carried down
  past the black door), **owners** (a NEW hand sealing a marked piece grows
  the chain), **deaths** (an owner dying while it's carried — the scar,
  written at the scatter). Surfaced in `look` (carried, lockbox, and THE
  FLOOR — the murdered man's sword talks). Fates: a scavenger dragging a
  marked piece off ends its story (the beast doesn't read); the fence files
  the mark off (trade/salvage orphan the ledger — laundering, by design).
  **Not in v1, deliberately:** deeds riding the 31573 loot cert (bazaar
  interop — add when the bazaar is real), and a journal surface. The payoff
  stays population-gated; the substrate is live so day-one history is real.
- **Fire & light follow-ons** (the 057 arc's remaining open ends):
  - `search` for hidden exits (dark hides them; light + searching finds them).
    Not built (zone-data.ts still flags it a follow-on).
  - **Map-blackout of dark rooms** — a room you've only seen dark doesn't
    belong on your HUD map. Not built.
- **Shallows heat map** — mobs harden where they're farmed (+1–2 HP, not
  damage), decaying back for fresh players. Unblocked since curved armor.

## Armor pass — filling the defensive ladder *(BUILT 2026-07-13 — migration 075 + ward wiring + the RNG floor-renewal engine, in tree unshipped; no reseed needed, live worlds self-lay new ground spawns)*

rome flagged the game is short on ARMOR PIECES (not armor value). The data
confirms it: weapons have 7–9 options per rarity tier (31 total); every armor
slot has ~⅓ that depth, and the TOP end collapses — helm/feet/cloak each have a
single rare and/or epic, so the endgame is BiS-per-slot with no build choice.
Worse, the anti-stun build tops out at a *common* coif, and the sneak/anti-bleed
builds have no rare/epic pieces at all. Fix = a content migration bringing each
thin slot to ~10 (≤8 per tier), each new piece carrying an EXISTING ward so
every build gets a full ladder. Targets: helm 6→10, feet 6→10, cloak 7→10,
shield 9→10; body armor already at 12.

**The 14 pieces (12-piece ladder + 2 guardroom finds):**

| slot | rarity | piece | arm | identity (existing ward) | proposed home |
|---|---|---|---|---|---|
| helm | unc | a riveted coif | 1 | MAILWARD (bleeds) | bone-knight |
| helm | rare | a padded greathelm | 2 | PADDED (stun) | warden-captain |
| helm | rare | a shroud-hood | 1 | QUIET (sneak) | cutpurse / thief-door |
| helm | epic | a bone-barred visor | 3 | WARDHIDE (wounds) | marrow-king / deep |
| feet | common | cracked-leather shoes | 1 | raw filler | grounds spawn |
| feet | unc | hobnailed boots | 1 | raw | warrens |
| feet | rare | eel-hide treads | 1 | SLICK (anti-seize) | drowned / Tideways |
| feet | epic | shadow-step boots | 2 | QUIET (sneak) | pale-stalker |
| cloak | common | a moth-eaten mantle | 1 | raw filler | grounds spawn |
| cloak | epic | a chain-lined mantle | 2 | MAILWARD (bleeds) | warden-captain |
| cloak | epic | a drowned-diver's shroud | 1 | QUIET (deep sneak) | deep |
| shield | common | a lashed-plank shield | ~.08 block | raw filler | fence / grounds |
| helm | unc | a watchman's kettle-helm | 2 | raw (guard kit) | **guardroom** ground-spawn |
| cloak | unc | a warden's watch-mantle | 2 | raw (guard kit) | **guardroom** ground-spawn |

Per-slot result: helm 2/3/3/2, feet 2/3/3/2, cloak 2/2/3/3, shield 2/4/2/2 (plus
the 2 guardroom uncommons nudging helm/cloak to 11). No tier over 8, and the
anti-stun / sneak / anti-seize / anti-bleed / wards-wounds builds each pick up
the top-end piece they were missing.

**Renewal — RESOLVED (loot-economy talk 2026-07-12):** the guardroom pieces (and
any renewable floor gear) use the **RNG-cadence** model from the Floor-renewal
standing law above — a slow tick rolls a low chance to hang the kit on the pegs
if it's absent, so it's dice, not a faucet. Same engine change flips **rusted-pick**
and **hammerstone** off their deterministic timers onto RNG (hammerstone keeps
its `STONE_GROUND_CAP`); **loose-rock, torch, and all consumables keep
regrowing**. Acquisition for the ladder pieces: thematic mob drops for the
warded ones (ward matches the beast), fence/grounds for the raw commons + plank
shield; the 2 guardroom uncommons are RNG floor spawns in `guardroom`.

**Build cost:** an `applyRegrow` engine change (RNG-cadence for gear) + the
pick/hammerstone conversions + a CONTENT MIGRATION (14 new item_templates + drop
wiring) that NEEDS A SEED — write it, verify local, leave the remote seed for
rome to trigger (never reseed while he plays).

## Room events — the world's weather *(SHIPPED — events.ts; kept here for the open ends)*

The arc landed whole: twelve events on two clocks (the scheduled bell + one
weighted roll every 3–6h), each obeying **telegraph → active window →
aftermath**, systemic-only, with mobs as citizens of the weather. THE TIDE is
the crown (the Tideways wing floods bottom-up on its own schedule). **Event 13,
THE GLOAM, built 2026-07-13 (in tree):** the dark itself walks the keep — one
interior hall at a time is true dark (rides `z.isDark`, the new choke-point
over DARK_ROOMS), drifting room to room; a torch holds it off, the living flee
it, the HOLLOW keep walking inside it. Never outdoors, never a gate room.
Full spec lives in git and the memory ship log. What's still *not* built on
top:

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

## The small lives *(BUILT 2026-07-13, in tree unshipped — code only, no migration)*

Sleep, thirst, calls, and fear — per creature, never blanket; the refusals are
design (the dead never sleep, never drink, never call). All guards from the
consequences audit are law in the code:

- **Sleep:** rats doze anywhere quiet, the cutpurse only in his own crack,
  hyenas drop off on a full belly (the meal-guard's other face). Nothing naps
  with a stranger present — you only ever *walk in* on a sleeper. Waking is
  wakeListeners' one law (entry/noise odds, QUIET gear, the bell); a blow
  wakes instantly and rides the existing unaware/ambush multiplier — one
  heavy blow, never a coup de grace (the sentinel rouse law). Scatter events
  (gloam, boil, Gaunt) and teeth all wake. Sleepers read plainly on look and
  to a pressed ear.
- **Thirst:** hyenas only — a destination habit (WATER_ROOMS), tether-bound
  (no territory leak), one drinker at a hole, rain skips it. Learn the rhythm
  and the waterhole is ambush ground — theirs and yours.
- **The call-bus:** one primitive, three meanings. Prey calls AWAY (a rat
  fleeing a player squeals; the warren nearby fear-marks the room and flows
  off). Predators call TOWARD (a feeding grave-hyena laughs ONE adjacent
  packmate in; the dire is a loner). Thieves WARN (an escaped cutpurse
  whistles; the dead tell no one). **The hard law: a call never triggers a
  call** (calledTo guard) and calls never ride creatureNoise — no cascades.
- **Place-fear:** avoids-memory per creature, decays, dies with the creature
  (migrants arrive naive — fear can't be farmed into a safe corridor). Home is
  exempt; fear never strands. **Lurkers read traffic instead:** every few
  hours an unseen one shifts its ambush to the born-dark room (tether-bound)
  with the freshest footprints — vary your route. Never moves under an eye.

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

*PvP's anti-grief stack, now live, for reference when the rest of this bucket
builds on it: witnesses (combat sound carries), blood on the killer (not names
on the wall — the world doesn't snitch), the bloodstain as scent (creatures
aggro known killers), fat-tailed combat (fumble and your blade's on the floor),
and weak fresh keys (the sybil wall — power is carried, never granted). A
player-kill drops everything, signed included — murder is the only way to truly
lose what's yours.*

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

- **The action-cost clock** *(Achaea's balance/equilibrium — rome iceboxed)*.
  Reassessed as the biggest and riskiest Achaea idea: it rewrites the combat
  cadence everything is tuned to. The primitive exists (`nextThrowAt`,
  stagger), so if it ever happens it's 1–2 opportunistic special cases (a
  heavy/reckless swing costs the *next* beat) — never a global balance bar
  retrofit onto the 4s round.
- **Idle kick** — boot truly-AFK players after N minutes so a forgotten tab
  doesn't hold a live session.
- **Communication layer** — `tell` is the remaining gap (`shout` and
  sound-carries shipped). Most on-brand: async **notes / dead-drops** (a
  written scrap left in a room for whoever comes next). Low-tech, high-flavor.
- **Guest-key wrapping at rest** *(decided AGAINST 2026-07-09, reasoning
  recorded)*: wrapping the localStorage nsec with an IndexedDB CryptoKey buys
  little — XSS, extensions, and disk malware all defeat it. The real walls are
  the textContent-only render path and the graduation paths. Revisit only if
  the client ever renders rich/user-URL content.
- **Day/night** — nocturnal creatures, darker descriptions after dusk.
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
