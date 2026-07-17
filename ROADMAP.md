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

- **TODO — FIRST THING (rome, 2026-07-15): stray-item floor-drain.** Torches and
  most dropped gear have NO decay — they lie on a floor forever, a permanent
  free-light/free-loot beacon AND slow inflation of the one `sim` blob (see the
  scaling-ceiling icebox entry). Generalise the rock's `strayRock(roomId)` into
  `strayItem(roomId, itemId)`: arm crumble timers for stray items dropped OFF a
  gate spawn (gate supply untouched, exactly like rocks), with per-item flavour
  (a torch "gutters out and is lost," not "kicked into the rubble"). Wire it on
  drop (`verbs.ts` ~805, currently only `loose-rock`) and on death-spill
  (`zone.ts` ~3086). Reuses the existing `rot`/`crumble` machinery and
  `ROCK_CRUMBLE_MIN/MAX_MS` (or a per-item window). Cheap, no migration; buys
  free headroom against the 128 KB ceiling.
- **Rare torch spawn — mirror the hammerstone** *(design, rome 2026-07-15)*.
  Same shape as the hammerstone (migration 070): the world MINTS a rare torch
  variant every N hours into a random haunt — no farmable spot (mirror
  `nextStoneAt` + the HAMMERSTONE_HAUNTS pool) — and it's simply BETTER at a
  torch's job. Edge (open Q, RECOMMEND the clean parallel): a much **longer
  burn** — 2–3× `TORCH_BURN_MS` — "better at its one thing," and it doesn't
  tread on the lantern's niche. Alternatives if rome wants: a **tame flame**
  (no fire-fear wake — but that IS the lantern's role) or a **brighter reach**
  (lights/reveals adjacent rooms). Build = item template + mint timer (copy the
  hammerstone's) + a burn-length branch by itemId in light.ts. Pairs naturally
  with the stray-item drain above (both torch work).
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
- **SQL-rows for live state — the world-size ceiling fix** *(measured
  2026-07-15; DO NOT build until approaching the ceiling — rome's call)*.
  The whole live world (this.creatures + all ground maps) serialises into ONE
  DO storage key `"sim"` (`persist()`, `storage.put("sim", …)`), and a single
  DO value is capped at **128 KiB**. Measured live blob = **27.5 KB = 21% full**
  at 110 rooms / 87 mob-spawns / 68 ground-spawns. Blob scales with LIVE
  monsters + ground (~180 B/entity), NOT rooms → cap ≈ **~400 monsters + ~325
  ground → ~500–700 rooms at today's 0.8-mob/room density** (a few thousand if
  sparse; rooms themselves are free — D1/RAM). **Fix (when needed):** ZoneDO is
  already `new_sqlite_classes`, so move creatures/ground out of the one blob
  into DO **SQLite rows** (the 10 GB space), writing only DIRTY rows per persist
  — *cheaper* than today's whole-blob rewrite, no extra cost on free tier if you
  don't re-write every row every tick. Real cost = a careful save/load refactor
  (riskiest code — lose state = lose the world), not money/perf. Beyond one
  zone → shard into more zone-DOs (code already keys by `zone`). **Trigger:**
  re-measure the blob (`SELECT length(value) FROM _cf_KV WHERE key='sim'` in the
  DO's local sqlite; prod differs) and build this at ~**70% / ~90 KB / ~300
  monsters** — not before. Blob also creeps up from undecayed litter (torches
  and dropped gear have NO floor-drain — see loot economy); adding stray-item
  drains buys headroom for free. Target ~1,000–1,500 dense rooms works TODAY
  with no code change if monster density is kept ~0.3/room.

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
