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

### Phase 0 — The ceiling patch *(cheap, structural)* — ✅ DONE
- ✅ **Curved / % armor mitigation** (`ARMOR_K=10`: `dmg × K/(armor+K)`), replacing
  flat subtraction at all three hit paths in `zone.ts`. Flat armor couldn't span a
  power range: once total armor ≥ a mob's hit, everything floored to 1 = immunity.
  The curve gives diminishing returns and never reaches zero — a fresh player
  (~1 armor) stays ~unchanged; a geared kit loses immunity but stays tanky.
  **Prerequisite for the heat idea** (under flat armor a +1–3 bump did nothing to
  the geared and only hurt the weak — the inverse of intent).

### Phase 1 — The deep gets teeth *(threats that route around gear)* — ✅ DONE
- ✅ **Player-side bleed** — armor-ignoring wound; a fatal tick can drop you outright.
- ✅ **Bandages** (linen-dressing) — auto-apply at half health + manual `bandage`/`bind`/`dress`.
- ✅ **Stun** — thrown rock + barrow-wight blow make you lose a swing.
- ✅ **Seize → drowning-pull** — the-drowned drags you under for a share of max HP
  (unmitigated). Softened to 0.15 / 0.10 after playtest.
- ✅ **Retune** the three deep-dwellers off "soft-for-learning" (migration 032).

**Parked — poison.** Stacking drain the longer you linger (the deep-lung idea):
each round in a poisoned state adds a tick; ticks decay when you leave/rest. Held
deliberately for a later pass — everything else in Phase 1 shipped without it.

### Phase 2 — Expand the deep + populate the world *(content/data pass)*
The content/populate half SHIPPED 2026-07-07 (migrations 034–038). The one
remaining piece is the scarcity/item-supply system below.
- ✅ **Deep is a kiddie pool → +18 rooms** (migration 036). A real layered
  descent: Drowned Reach ×4 (loop off the Black Canal), Sunless Deep ×9 (two
  nested loops off the Silted Stair, bottoming at the Sunless Well), King's
  Demesne ×5 (wrapping the throne). Geography verified reciprocal, no orphans.
- ✅ **Populate to themes** (034 garrison/kennels/chapel + 037 deep population).
  Dwellers by element — the-drowned (water), pale-crawler (dark), twice-dead
  (bone) — density-graded, worsening toward the bottom; rare bloodline cousins
  spike the threat deeper. Three coffers reward the descent (box-tide/relic/abyss),
  the Sunless Well's abyssal coffer the best non-boss prize. Some rooms left empty
  for dread. Plus the **three-headed hound** (035), a SENTINEL holding the descent
  (sleeps/wakes/bars the way), and the **albino rat** (038) — a very rare, strong
  bloodline cousin of the rat (floor 1 + deep) that's [[keep-zone-ts-lean|fire-fearing]]
  (pre-wired, dormant).
- ✅ **Faster respawns** — `MIGRATION_FACTOR` 20 → 10.
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
- **Balance watch — daggers may be too OP** (rome, 2026-07-07). Suspected
  overpowered; revisit weapon tuning. Check dmg range / speed vs. other weapons
  and whether the near-death fumble-only rule or armor curve favors fast light
  weapons too much. Observation only — not yet confirmed with numbers.

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

## Phase 7 — Population systems (gated on actual players) — NOT STARTED

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

- **Connection stability — UNCONFIRMED.** rome *may* be seeing intermittent
  connect/disconnect in prod; not yet confirmed it's real. Audit (2026-07-07):
  the DO holds players on **in-memory** WebSockets (not the Hibernation API) and
  there's **no heartbeat** anywhere. Likely everyday trigger if real = idle-timeout
  reaping (NAT/proxy/mobile kill a silent socket after ~60–120s; ambient lines are
  too sparse to keep it warm). Two fixes: (1) **quick** — a ~25s client heartbeat
  (`{t:"ping"}`, server ignores) to keep the socket warm; ~15 lines, near-zero risk,
  naturally player-gated (client-driven, and the tick already halts at 0 sessions).
  (2) **proper** — migrate to the **Hibernation API** + `setWebSocketAutoResponse`
  so sockets survive DO eviction/deploys; bigger (must rebuild in-memory session
  state on wake). **First step: confirm it's actually happening** (server/DO logs,
  or reproduce) before building either.
- **Idle kick** (spun off the above) — optionally boot truly-AFK players after N
  minutes of no commands, so a forgotten open tab doesn't hold a live session.
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
  - **Fire-fear is PRE-WIRED (2026-07-07).** The `FEARS_FIRE` behaviour set
    + `carriesFire()` (zone.ts) already ship, dormant: a fire-fearing creature
    cornered by a flame-bearer breaks and runs. The albino rat is the first
    member. To WAKE it, this phase only has to add the lit-fire item and put its
    id in `FIRE_ITEMS` (zone-data) — or swap `carriesFire` to read a `light`
    item property. No other wiring needed; the flee logic and flavour lines exist.

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
- **Anonymize the relay feed (anti-stream-snipe) — DONE 2026-07-07, in the
  working tree.** The public `24913` feed named players and their live room —
  a real-time tracker letting a sniper subscribe to `mudroom-*` and follow one
  wanderer room to room (the world snitching, which the design forbids). Fixed:
  a centralized `anonForRelay(text)` scrub in `relayFeed` replaces every
  connected player's name with "a wanderer" *on the relay only* (people in the
  room still see real names on their local socket). Loses nothing — identity
  here is already opt-in via the self-published 31573 sheets.

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
