# NOMAD Roadmap

*Forward work only — shipped history lives in git log, COMBAT.md, and past
deploys (phases 0–2, the combat audit and its gear expansion, the living-world
island, the world at 100 rooms, fire & light, the waystation gate, the off-hand
trio — all live). Guiding principle (from the 2026-07-03 simulation pivot):
build systems that create stories, not scripted content. The interface is
friendly; the world is not. Population-dependent systems (PvP, economy,
factions) come last — they emerge from players, and you can't scaffold players.*

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
  wards, a wight's dry skin says it won't bleed, a chip never baits a refusal.
- **Scope litmus (from the lineage pass):** if an idea makes you ADD a system
  rather than DEEPEN one, it's the trap. Depth per item, never item count.
- **Keep zone.ts lean:** the spine is tick/combat + transport. Verbs live in
  verbs.ts, chips in chips.ts, light in light.ts, maps/journal in lore.ts,
  creature behavior in ai.ts, gate trade in gate.ts, constants in zone-data.ts.

## Open calls (awaiting rome)

- **Sentinel stun-resistance** — proposed after the flanged-mace playtest
  (blunt-ignore-2 zeroes the hound's armor and 35% stun chains it): "three
  heads, one always awake" — the hound can't be stun-locked, or stuns at
  reduced odds. rome: HOLD (2026-07-11). Not built.

## Next up (unblocked, pre-players)

- **The Hunter / Nemesis** — targeted pressure: the world sends a named
  predator after the too-successful player, who has to get out ahead of it.
  Reuses grudges + `curious` tracking. (rome: "i love this.") Also the natural
  long-term raid clock for the shallow keep.
- **Storied gear — items with biographies** *(the identity feature)*. The
  answer to "how does MUD + extraction distinguish itself": not more economy,
  a **meaning layer on top of it**. In Tarkov every sword is fungible; in a
  classic MUD every sword is static. NOMAD stands on the intersection neither
  can reach — one persistent world, signed serialized loot, condition as
  narrative, death-drops — so an item can have a **history** the dungeon
  attests. The inversion that makes it sing: you don't lose your gear when you
  die — **your gear loses you**, and carries you as a scar. "This notched
  greatsword has 214 kills, went to the King twice, and its last three owners
  died in the Sunless Deep." Story is the one currency that can't be farmed,
  duped, or inflated.
  *Build shape (cheap):* a deeds-ledger keyed by sealed serial (small D1
  table): kills, depths, owners, owner-deaths while carried. Surface it in
  `look`/the journal; let 31573/1573 carry it for bazaar interop. The substrate
  can land pre-players so day-one history is real; the payoff is
  population-gated.
- **Fire & light follow-ons** (the 057 arc's open ends):
  - `search` for hidden exits (dark hides them; light + searching finds them).
    Slots naturally into the Tideways ship.
  - **Map-blackout of dark rooms** — a room you've only seen dark doesn't
    belong on your HUD map.
  - The tidal flood graduated into the room-events arc below.
- **Encumbrance → combat penalty** — bones exist (`weight` column,
  `wornWeight()`); today weight only affects flee/dodge.
- **Shallows heat map** — mobs harden where they're farmed (+1–2 HP, not
  damage), decaying back for fresh players. Unblocked since curved armor.
- **Balance re-check** — `scripts/balance-audit.mjs` is stale (numbers predate
  the wards, 063 prices, and the off-hand trio). Re-run and update its tables
  before any combat tuning; it's also the gate on the afflictions framework.

## Room events — the world's weather *(APPROVED 2026-07-11; the next arc)*

rome's direction: events everywhere, not just a deep flood — "make the world
feel living" — and **mobs are citizens of the weather, not spectators**. The
spec, before any code:

**The law (every event, no exceptions):**
- **Telegraph → active window → aftermath.** Nothing hits a player the world
  didn't announce. The best telegraph is CREATURE BEHAVIOR, not narration —
  rats streaming up a stair say "water's coming" better than any prose.
- **Systemic only:** an active event is a bundle of toggles on rules that
  already exist (light, noise, wake odds, traces, wander bias, boldness,
  seize odds). Never a scripted scene, never a new one-off mechanic.
- **Mobs ride existing verbs:** events move creatures through wander bias,
  flee, `curious`, boldness, and birth timing — no new AI states.
- **Events bias each other, never trigger each other** (the bell empties the
  keep's rats into the warrens → a boil grows *likelier*, not scheduled).

**The clocks (rome's law, 2026-07-11 — the game is a simulation):** two
tracks. The BELL is *scheduled* — a keep rings its bell at its own hours,
twice a day (near 01:00/13:00 UTC, ±20min; learnable, plannable-around).
Everything else is *rolled*: one die every 3–6h picks ONE event from the whole
weighted pool — 4–6 a day, never a schedule. One thing in the sky at a time;
an arc not mid-run parks at NEVER and only the roll starts it. A roll slept
past (the tick needs an audience) happened unobserved.

**Built (all in `events.ts`, unshipped):**
1. **Rain** *(outdoors; pool weight 3 — the common sky)*. Iron-grey telegraph,
   torches drown (**the hooded lantern shrugs it off**), sound masks, traces
   wash, scavengers bold; aftermath mud cuts prints deeper, forage regrows
   sooner, and the storm refreshes the surface fishing pools.
2. **The bell** *(keep, SCHEDULED)*. One note, then 90s where the keep hears
   EVERYTHING and rat-kind bolts for the warrens; a 10-minute unsettled after.
   Someday a player-rung bell is a decoy/flush lever (hold that).
3. **The boil** *(warrens, w2)*. A rat tide takes one corridor room by room —
   a moving hazard that bites what stands in it; the posted hold their posts.
4. **Corpse-wake** *(warrens, w2)*. "The dead don't stay down tonight." The
   hollow all stop at once (the telegraph), then fresh death-litter is the
   beacon: where something fell lately, a barrow-wight pulls itself up through
   the floor (the beacon-trace consumed; ≤4 rise). Whatever still stands when
   the window shuts drops where it is. Camp your killing floor and your kills
   send for company. No fresh dead — the listening simply passes.
5. **The keeper's want** *(gate, w2)*. Chalk on the hatch: one named
   gatherable counts DOUBLE in trade for ~50min. The only weather that
   gives you somewhere to GO — it points every wanderer at the same corner of
   the map at once.
6. **The escaped thing** *(roams, w1 — the rarest)*. The Gaunt (068) gets
   loose: the whole zone hears the cry, then it walks the world for an hour —
   rooms empty ahead of it (its telegraph), it fixes-then-springs on whoever
   shares its room (the wind-up is the warning). Always drops its pelt
   (barter 20). Unkilled, it answers some call and goes back down.
7. **Marsh lights** *(fen + causeway, w2)*. Pale lights that read exactly like
   a carried torch, false careful footsteps on the roomSound channel a real
   neighbor would leak through. Nothing attacks. The event is doubt.
8. **The crows** *(outdoors, w2)*. Carrion birds take every high perch and cry
   out whoever crosses the open ground — every player under the sky hears
   where you moved. Anti-stealth, fully diegetic.
9. **The exhale** *(deep, w2)*. The deep breathes out: a cold current no open
   flame survives — carried torches die, none will catch until it settles;
   the hooded lantern's shuttered bead holds (its second argument). No new
   teeth: a lightless deep is ambush weather the LURKERS already own.
10. **The marrow-song** *(deep, w2)*. A bone-voice holds one note and every
   hollow thing below stands entranced — wake odds ZERO, walk right past the
   bone-country's garrison. The flesh-things are agitated by it instead, and
   the bones wake twitchy (×2) when it dies. The loot corridor nobody trusts.
11. **Fog** *(outdoors, w2)*. The anti-rain: spot odds down BOTH ways — wake
   odds halved AND every creature reads as "a grey shape in the fog" (tells
   blanked). Scavengers hunt in it. Unlike rain, the traces STAY. The
   stalker's weather.
12. **Cold snap** *(outdoors + deep, w2)*. Glass-clear and bitter: torches
   burn half as long (lit ones lose half their remainder; the lantern's oil
   doesn't care), resting heals half as often, and the living den up on warm
   ground — while the HOLLOW keep walking, the free tell. A quiet,
   safe-looking window that taxes your supplies.
13. **The breach — PARKED (rome, 2026-07-11: "doesn't fit")**. Fully built
   and idle: stone groans 90s, the wall GIVES, an exit exists both ways for
   10 minutes, rubble + scar after; 8 hand-picked walls in BREACH_PAIRS.
   Its pool ticket is commented out in events.ts — restoring the event is
   uncommenting one line. The flagged *wall-breach ↔ muster* pair was never
   in.

14. **THE TIDE — the crown (BUILT 2026-07-11; rome passed the map: "i like
   the tide"; migration 069, NEEDS RESEED on ship)**. The Tideways: ten
   rooms hanging below the water country, two mouths (under the undertow,
   under the weir — in one way, out the other). SCHEDULED like the bell
   (tides don't roll dice): roughly four a day, 5–7h apart. Telegraph 3min:
   the drips drum and everything living CLIMBS (wander bias up — their
   flight past you is the warning). Rising: one level per minute, cradle
   first; flooded rooms kill torches (the lantern survives a wade), refuse
   rest, and scatter what can't swim; the drowners' hour — everything of
   theirs in the deep ranges wide. A high tide (1 in 4) takes even the
   breathing-hall — the one air pocket, the camp you trust until you
   shouldn't. Crest holds ~8min, then the water lets go all at once:
   half the floor loot of every drowned room washes one level DOWN (why
   the still-cradle's floor is a midden), and the wing's fishing pools
   (eel-run, breathing-hall — new FISHING_DEEP waters) forget every angler.
   The wing is DEEP by every rule: chest tiers roam it, the exhale and the
   marrow-song reach it, the cold bites it. Not yet built on top: pack
   weight slowing the wade, exits sealing/float-ups, the undertow-grasper
   (watch list — its home is ready).

**Variety shelf (cheap follow-ons):** the warden's muster (patrol surge; a
wall and a window at once), and the stillness (everything everywhere sleeps
deeper for a few minutes — the marrow-song already plays this card for the
deep's hollow).

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
- **The undertow-grasper** (anti-turtle, designed not built) — a drowner
  cousin whose grab comes AROUND the shield. Build only if the pavise-turtle
  proves too safe in play.
- **Prices need players** — 063 killed the dominated buys; whether the curve
  is right waits on strangers with tender.

## Afflictions & cures — the framework *(gated)*

Bleed and hobble are the two proven instances of the pattern (status + tell +
cure path). The general framework — stacking statuses, cure-routing, mobs
applying them — stays on paper until (1) the glanceable-status UX carries more
than two tags comfortably and (2) the balance re-check above lands. When it
opens, the on-brand growth is **poisons, tinctures, and set traps** (gritty
survival, never magic) — including the parked deep-poison: a stacking drain
the longer you linger, ticks decaying when you leave/rest.

## Extraction feel (rome-ranked above the MUD-flavor ideas)

- **The dangerous walk back** — loot is worthless until you're *out*; the
  deeper you went, the longer the run home. The waystation's concentric
  pressure (grounds staging → shallow keep → committed deep) is the frame;
  the remaining work is content/geometry that keeps the best loot far from
  every gate. Highest leverage of the set.
- **Task / bounty runs** — objectives that *force* insertion: retrieve a
  thing, reach a room, hunt a marked wanderer (rides the blood-on-killer
  primitives).
- **The seal as a vulnerable moment** — claiming becomes a channeled hold: a
  few exposed ticks, sound carrying, interruptible. The gate stops being a
  safe button.
- **Campers make noise** — stillness leaks sound (shifting, breathing, gear
  creak) so gate-campers can't lurk silently; movement doesn't. Rides the
  sound-carries primitive.

## Phase 7 — Population systems (gated on actual players) — NOT STARTED

Do NOT build these before there are people; they emerge from density:

- **PvP** — cooperate / ignore / rob / kill when paths cross. Needs an economy
  worth robbing and enough players that murder has witnesses. Under the
  extraction rule a player-kill drops everything, signed included — murder is
  the only way to truly lose what's yours.
  **Anti-grief stack (all sim-native, no aggressor-punishing dice):**
  1. *Witnesses* — combat sound already carries through walls.
  2. *Blood on the killer, not names on the wall* — the world doesn't snitch.
     Death traces stay victim-only; the evidence walks around on the murderer:
     "He is bloody from a fight — it looks fresh." Man-blood reads different
     from creature blood, ages through buckets, stacks for repeat killers.
     Finding out who did it means meeting them and looking close.
  3. *The bloodstain as scent* — creatures aggro known killers on sight, the
     warden's patrol becomes a manhunt, the shrine refuses them.
  4. *Fat-tailed combat* (shipped) — every attack is a gamble; fumble and your
     blade is on the floor for the taking.
  5. *Fresh keys are weak* — power comes only from carried gear, never granted
     to new spawns. Throwaway identity = throwaway threat. This is the sybil
     resistance; hold it forever.
  Pre-wired and waiting: VITALS_PVP (0.5% armored → 1% naked, one call to
  wire) and the man-catcher's hobble-never-hold rule.
- **Economy** — scarcity already exists; trade verbs when there are traders.
  Zaps enter here (`nostr-lightning/` is on the shelf).
- **The black market / player trade layer** — hoarded gear re-enters
  circulation, prices float on supply/demand (Tarkov's flea). Completes the
  emergent-scarcity model; the hard currency for prices to settle in already
  circulates. Distinct from the keeper's NPC fence.
- **Factions** — earned names, not menus: bandit is what you did.
- **Reputation** — grudges prove the primitive; extend to the world (guards,
  towns) when towns exist.
- **Events** — migrations already are small events; big ones (flood, caravan,
  eclipse) once there's an audience to surprise.

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
- **Communication layer** — `tell`/`shout` (sound-carries proves the
  primitive), channels, emotes. Most on-brand: async **notes / dead-drops**
  (a written scrap left in a room for whoever comes next) and a shout that
  travels. Low-tech, high-flavor.
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
