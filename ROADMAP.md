# NOMAD Roadmap

*Forward work only — shipped phases live in git history and past deploys.
Guiding principle (from the 2026-07-03 simulation pivot): build systems that
create stories, not scripted content. The interface is friendly; the world is
not. Population-dependent systems (PvP, economy, factions) come last — they
emerge from players, and you can't scaffold players.*

## Combat & The Deep — active (2026-07-07)

**Through-line:** difficulty and reward climb *together* with depth. The deep
is where death and the good loot both live. **Gear must never equal safety.**
Origin: an all-night run wiped the whole map (incl. the deep) with no trouble
once geared — the power curve has no counter-pressure.

### Phase 0 — The ceiling patch *(next, cheap, structural)*
- **Curved / % armor mitigation**, replacing flat subtraction at
  `zone.ts` (`dmg = max(1, dmg - equippedArmor)`). Flat armor can't span a power
  range: once total armor ≥ a mob's hit, everything floors to 1 = immunity. Measured:
  deep-dwellers hit 3–7; best-in-slot kit = 11 armor → every non-crit floored to 1.
  Fresh player (~1 armor) stays ~unchanged; geared kit loses immunity.
  **Prerequisite for the heat idea** (under flat armor a +1–3 bump does nothing to
  the geared and only hurts the weak — the inverse of intent).

### Phase 1 — The deep gets teeth *(threats that route around gear)*
- **Player-side bleed** — cheapest bypass; mirror the existing mob-only bleed loop.
- Then **poison** (stacking drain the longer you linger), deeper **seize**, **stun**,
  and rare **true/%-HP** hits. Retune the three current deep-dwellers off
  "soft-for-learning" — they're not the tutorial anymore.

### Phase 2 — Expand the deep + populate the world *(content/data pass)*
- **Deep is a kiddie pool** (a mouth, a root-vault, the throne + 3 soft mobs).
  Make it a real layered descent (mouth → mid → drowned depths → throne). **+18
  rooms** designed and approved 2026-07-07 (3 tiers: Drowned Reach ×4, Sunless
  Deep ×9 as a branching loop off the silted-stair, King's Demesne ×5 wrapping
  the throne; no hideaways counted). Dwellers worsen with depth; scarcest/best
  loot at the bottom, far from safe banking (extraction tension by geography).
  *Next concrete step: write the rooms-only migration in 021's voice/format.*
- **Populate to themes** — named atmosphere rooms are ghost towns because their
  seed count *is* their population cap: Hound Kennels = 2 (1 hyena + 1 rat),
  Warden's Post = 1 warden, Broken Chapel = **0** (spawns nothing, ever). Seed each
  to its theme (pack in the kennels, 2–3 wardens on watch, *an inhabitant for the
  chapel — TBD by rome*). Modest +1–2 per room elsewhere.
- **Faster respawns** — lower `MIGRATION_FACTOR` (20 → ~10). Solo refill is
  respawn_secs×20 today (a rat ~10 min, a deep-dweller ~30), so cleared rooms stay
  dead too long.
- **Scarcity via a dungeon-aware item supply** (rome, 2026-07-07) — the primary
  scarcity mechanism. Model item refills on the mob-migration system: each capped
  item has a target count in the world; the dungeon refills *toward* the cap only
  when supply runs short (not on a blind timer), placing restocks at themed homes.
  Gives the gear economy a **bounded money supply** — a geared player has removed
  that gear from circulation until it leaves play. Reuses the mob bones
  (cap + `scheduleArrivals` + a `MIGRATION_FACTOR`-style speed), but counting
  supply touches D1 (instances live across ground/caches/mob-carried/pack/lockbox/
  vault). Generalizes the tarnished-key fix ("refill only when none exists").
  - **Needs sinks or it fills once and freezes** — cap = ceiling, sinks = churn.
    Drains mostly exist already: death-drops, rust/breakage, rot. Cap sets the
    ceiling; those set the flow.
  - **Per-item policy** (like a mob template's behavior): gear = capped & scarce;
    food/junk = cheap/free regrow; **the rarest things get the tightest cap of
    all** — barely restocked, if at all.
  - Drop-table tuning (`gear_drop` / drop chances) is demoted to *one input* — how
    fast the cap refills — not the whole mechanism.
  - **Open decisions:** (a) does player-held loot (packs/lockboxes/vaults) count
    against the cap? *Yes* = hoarders create scarcity for everyone (simulationist,
    scarce); *No* = simpler but players just drain-and-bank. Leaning yes.
    (b) which items are capped vs. free-regrow. *Pending rome.*
- **Tarnished key** regrows every 10 min at the shrine (it's the undercroft door
  key, kept obtainable so no one's soft-locked) — but it litters copies. Fix:
  regrow only when none exists in the world. (Check first whether the door
  *consumes* it.)

### Phase 3 — The simulationist direction *(bigger, later)*
- **Lethality / hit-location** (rome's "damage dire as real life — a hit to the
  throat"): earned finishers on an opening (staggered/seized/bleeding) + armor as
  *coverage* of body zones + telegraphed. Never random (that's a slot machine that
  hurts fresh players worst). Could eventually *replace* the flat armor number.
- **The Hunter / Nemesis** — targeted pressure: the world sends a named predator
  after the too-successful player, who has to get out ahead of it. Reuses
  grudges + `curious` tracking. (rome: "i love this.")
- **Encumbrance → combat penalty** + weight-based pack (bones exist: `weight`
  column, `wornWeight()` — today it only affects flee/dodge).
- **Shallows heat map** — mobs get harder the faster they're farmed, decaying back
  for fresh players. Gentle (+1–2). Works only *after* curved armor (or bump HP,
  not damage). rome's idea; good for the shallows, weak for the deep.

### Open inputs (from rome)
- Chapel inhabitant + rough headcounts for the "populate to themes" pass.
- Which mob-drop items are the "questionable" ones flooding gear.
- How big is the deep expansion — a few rooms, or a whole sub-zone?

## Population systems (gated on actual players)

Do NOT build these before there are people; they emerge from density:

- **PvP** — cooperate / ignore / rob / kill when paths cross. Needs an
  economy worth robbing and enough players that murder has witnesses.
  Under the extraction rule a player-kill drops everything, signed
  included — murder is the only way to truly lose what's yours, which
  is what makes the rest of this list matter.
  **Anti-grief stack (all sim-native, no aggressor-punishing dice):**
  1. *Witnesses* — combat sound already carries through walls.
  2. *Blood on the killer, not names on the wall* — the world doesn't
     snitch. Death traces stay victim-only; the evidence walks around
     on the murderer: "He is bloody from a fight — it looks fresh."
     Man-blood reads different from creature blood (bright, clings),
     ages through buckets like any trace, stacks for repeat killers
     ("caked in blood, old under new"). Finding out who did it means
     meeting them and looking close.
  3. *The bloodstain* — the same mark, rendered as scent: creatures
     aggro known killers on sight, the warden's patrol becomes a
     manhunt, the shrine refuses them.
  4. *Fat-tailed combat* (shipped) — every attack is a gamble, even for
     a veteran; fumble and your blade is on the floor for the taking.
  5. *Fresh keys are weak* — power comes only from carried gear,
     never granted to new spawns. Throwaway identity = throwaway
     threat. This is the sybil resistance; hold it forever.
- **Economy** — scarcity already exists; trade verbs when there are
  traders. Zaps enter here (`nostr-lightning/` is on the shelf).
- **Factions** — earned names, not menus: bandit is what you did.
- **Reputation** — grudges already prove the primitive; extend from
  creatures to the world (guards, towns) when towns exist.
- **Events** — migrations already are small events; big ones (flood,
  caravan, eclipse) once there's an audience to surprise.

## Icebox — liked, not building yet (rome, 2026-07-06)

Directions rome likes and wants held for later. Design only; no code
until he says go.

- **Communication layer** — the thing that turns a dungeon into a
  social world. `say`/`tell`/`shout` (shout carries between rooms —
  combat sound already proves the primitive), channels (ooc/gossip),
  emotes/socials. The two most on-brand: async **notes / dead-drops**
  (leave a written scrap in a room for whoever comes next) and a shout
  that travels. Low-tech, high-flavor.
- **Consumables / toxins / traps** — NOT magic. Tone is gritty
  survival, not high fantasy, so no spellbooks/mana. But bleed/stun
  already exist as status effects, so the on-brand version is
  drinkable/throwable/plantable: poisons, tinctures, and set traps
  that carry the same status-effect engine.
- **Light & search (world-sim depth)** — a dark floor you can't map
  without a lantern is pure extraction tension. `search` for hidden
  exits, the `light` property gating what you can see/map, torch
  burnout. Fits the simulation direction; pairs with the maps/journal
  knowledge-as-loot line.

Extraction-specific (rome, 2026-07-06) — the genre NOMAD actually is,
so these rank above the MUD-flavor three when we build:

- **The dangerous walk back** — the defining extraction feeling: loot
  is worthless until you're *out*, and the deeper you went, the longer
  the run home. Today sealing at a gate is safe and instant. Make
  **depth = commitment**: the good loot lives far from any gate, and
  the walk back with a full pack is the real gauntlet. Mostly
  content/geometry, not new systems — highest leverage of the set.
  (Feeds Phase 2's deep expansion above.)
- **Task / bounty runs** — objectives that *force* insertion:
  retrieve a specific thing, reach a deep room, hunt a marked wanderer
  (Hunt: Showdown's bounty). Gives the loop direction beyond "get
  rich," and the marked-wanderer bounty rides on the existing
  blood-on-killer / manhunt primitives.
- **The seal as a vulnerable moment** — make claiming at the gate a
  **channeled hold**: a few ticks where you're exposed, your sound
  carries, and someone can interrupt you. Turns the gate from a safe
  button into a tense beat.
- **Campers make noise** — the anti-camp: a wanderer who stays still too
  long starts giving themselves away with sound (shifting, breathing,
  gear creak), so gate-campers can't lurk silently forever. Rides on the
  existing sound-carries primitive — stillness leaks, movement doesn't.

## Seasoning (slot anywhere, low cost)

- Day/night: nocturnal creatures, darker descriptions after dusk.
- Torch burnout when light matters (needs the `light` property).
- More rooms/creatures for the Door — but content sprawl stays the
  enemy; systems first.

## Easter eggs (rome, 2026-07-06)

Parked for later, in rough order of fit:
- **Zap-triggered whispers** — `nostr-lightning/` on the shelf; zap a
  shrine 21 / 2100 / 21000 sats and something answers. Real value in,
  a wink out. Only NOMAD can do this.
- **Root-npub recognition** — if rome's own npub ever walks the Door,
  the dungeon knows its maker. Private, unfakeable.
- **A too-deep room** at the literal bottom, reached by an undocumented
  exit — a maker's message / one strange item.
- **Time-based winks** — genesis block (Jan 3), whitepaper day (Oct 31),
  or a NOMAD anniversary: one creature/line/trace changes for 24h.
- **Silent achievements** — a no-death deep extraction, a kill far above
  weight, all-maps-found: a private line, never a badge on a wall.

Rule: an egg must never break the sim or cheapen a secret, and the
moment it's in a help file it stops being an egg.
