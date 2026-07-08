# NOMAD Roadmap

*Forward work only — shipped phases live in git history and past deploys.
Guiding principle (from the 2026-07-03 simulation pivot): build systems that
create stories, not scripted content. The interface is friendly; the world is
not. Population-dependent systems (PvP, economy, factions) come last — they
emerge from players, and you can't scaffold players.*

## Combat & The Deep — Phases 0–2 SHIPPED (2026-07-07); Phase 3 is the next arc

**Through-line:** difficulty and reward climb *together* with depth. The deep
is where death and the good loot both live. **Gear must never equal safety.**
Origin: an all-night run wiped the whole map (incl. the deep) with no trouble
once geared — the power curve had no counter-pressure. Phases 0–2 (the ceiling
patch, deep teeth, the +18-room populated deep, emergent scarcity, the
corpse-key) are all live and validated under real play. Phase 3 below is the
remaining, bigger simulationist arc, for when rome's ready.

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
Content/populate SHIPPED 2026-07-07 (migrations 034–038); scarcity resolved the
same day via the emergent model (039 + sealed-wear + worn-on-entry); the
corpse-key (040) retired the tarnished-key. **Phase 2 is DONE** — the only
carry-over is the deferred **black market** (Icebox), which is population-gated
anyway. Next arc is Phase 3 (the simulationist direction) whenever rome's ready.
- ✅ **Deep is a kiddie pool → +18 rooms** (migration 036). A real layered
  descent: Drowned Reach ×4 (loop off the Black Canal), Sunless Deep ×9 (two
  nested loops off the Silted Stair, bottoming at the Sunless Well), King's
  Demesne ×5 (wrapping the throne). Geography verified reciprocal, no orphans.
- ✅ **Populate to themes** (034 garrison/kennels/chapel + 037 deep population).
  Dwellers by element — the-drowned (water), pale-crawler (dark), twice-dead
  (bone) — density-graded, worsening toward the bottom; rare bloodline cousins
  spike the threat deeper. Three coffers reward the descent (box-tide/relic/abyss),
  the Sunless Well's abyssal coffer the best non-boss prize. Some rooms left empty
  for dread. Plus the **three-headed hound** (035), a SENTINEL holding the deep's
  threshold from the Undercroft throne (sleeps/wakes/bars the way — see the
  corpse-key gateway below), and the **albino rat** (038) — a very rare, strong
  bloodline cousin of the rat (floor 1 + deep) that's fire-fearing
  (pre-wired, dormant).
- ✅ **Faster respawns** — `MIGRATION_FACTOR` 20 → 10.
- ✅ **Scarcity — the EMERGENT model** (rome, 2026-07-07; migration 039 +
  SEALED_WEAR_MULT). We deliberately **dropped the global supply-cap** idea: MUD
  (persistent, keep-your-stuff) and extraction (impermanent, lose-it-on-death)
  are fundamentally incompatible on loot — rome's call — and real extraction
  games (Tarkov, Dark and Darker) don't global-cap anyway; they instance loot
  and let **death + a market** create scarcity. NOMAD already resolves the tension
  structurally: **the seal/gate is the membrane** — the dungeon is the extraction
  layer (death drains it, no cap needed), the vault is the MUD layer (yours, kept).
  So scarcity is emergent, from three levers:
  - **Rarer faucets (039):** non-boss uncommon/rare gear drops ×0.6, cache rare
    ×0.7 / epic ×0.6. Bosses, common starter kit, the reliquary, cigs/maps/
    trophies all spared. Good gear is now an event, not an inevitability.
  - **Loot tier follows danger (043):** the two upper `is_safe` hideaway chests
    (box-bone/box-crack) were rare-gear machines in the safest, bank-adjacent
    rooms on the FASTEST refill — the inverse of the design. Re-stocked as modest
    stashes (common/uncommon kit + provisions + slim cig/map). Rare/epic gear now
    lives ONLY in the deep coffers (box-deep/tide/relic/abyss), behind real danger,
    far from banking.
  - **Sealed gear wears SLOWER, not never** (`SEALED_WEAR_MULT = 0.4`): sealing
    was making gear immortal in combat (the one real leak). Now it lasts ~2.5×
    but still, eventually, wears through — endgame gear leaves play by degrees.
    The economy's real sink. Follow-on fixes (2026-07-07): sealed gear can now be
    **repaired** at the bench (the old code refused it — a trap now that it wears;
    the seal is title, not condition, so mending keeps the serial), it **shows its
    wear** in every list (was hidden while it was frozen), and salvage still
    refuses sealed (the seal protects from destruction, not from mending).
  - **Gear enters WORN — pristine is a rare find** (rome, 2026-07-07;
    `rollGearCondition`). Gear no longer arrives at 100%. Off the dead
    (`kept=false`): avg ~58%, ~6% pristine. From a sealed coffer (`kept=true`):
    avg ~78%, ~21% pristine. Where you find it tells you its state. Condition is
    stamped when gear lands on the floor (`groundCond` map) so a dropped/fumbled/
    thrown blade keeps its wear — no reroll-on-pickup. Makes the world feel old
    and used, makes a pristine piece a real trophy, and speeds the sink (worn
    gear breaks sooner).
  - **Death is the sink** (already built): player-kills drop everything.
  - **Deferred — the black market / trade layer** (rome: "for another time"). The
    piece that lets hoarded gear re-enter circulation and floats prices on
    supply/demand. When it lands it completes the emergent economy. See Icebox.
- ✅ **The key the world grows — the corpse-key** (rome approved 2026-07-07;
  migration 040 + code, Direction C). Retires the tarnished-key entirely. The
  black door into the deep now opens to a **still-cold heart** cut from a
  deep-dweller the *simulation* surfaced — not a key on a shelf:
  - **Sim-minted:** while the deep door is SEALED, the tick surfaces one mobile
    deep-kin (twice-dead/pale-crawler, `SURFACERS`) up into the shallows
    (`SURFACE_ROOMS`) ~every 6 min (`SURFACE_INTERVAL_MS`, jittered), one at a
    time. It arrives revealed and desperate (`surfaced` flag). Kill it → its
    heart drops, always, fresh-stamped.
  - **Perishable, no schema change:** freshness reads the existing `acquired_at`
    (epoch secs); the door takes a heart cut within `HEART_FRESH_SEC` (10 min).
    Stale = grey slime, rejected and sloughed off. Can't hoard, can't litter —
    the whole old-key problem dissolves with zero cap.
  - **No soft-lock:** the sim never stops surfacing (arrivals restock the deep),
    so the door is always *eventually* openable, never on command.
  - **SHIPPED** (6880ed3, 2026-07-07). Door mechanics verified live: no-heart
    teaches the want; a fresh heart opens communally + is consumed; a stale one
    is slime, door stays sealed. Folded the 036 rooms into `DEEP_ROOMS`. The
    gateway is consolidated in **The Undercroft** (042): hall→undercroft is free,
    the hound holds the stone throne, and undercroft→descent is the heart-locked
    stair — drop through the hatch, slip past the sleeping hound once (it wakes;
    everyone after fights it), heart to descend. The one piece not yet confirmed
    under live play is the surfacing itself (the sim minting hearts).
  - **Tuning knobs if it needs feel-work:** `SURFACE_INTERVAL_MS`,
    `HEART_FRESH_SEC`, `SURFACE_ROOMS`, `SURFACERS`. The door's want is currently
    taught by the locked-door message itself ("something of the deep, still
    cold") + the heart's item text — no carving/keeper hint yet.
### Combat audit — full-ladder balance pass *(2026-07-08, confirmed with math)*

Expected-value audit of every weapon/armor/mob against the code's exact formulas
(steady stance, fresh gear; dogpile/ambush/boss-phases modeled separately).
**The shape is right:** naked player loses to a pale-crawler 1v1, uncommon kit
unlocks the upper floor, rare kit makes the deep tense-but-survivable, kings
beat rare-kit players 1v1 (group/epic content). The dogpile cap is the tension
floor — 3 crawlers ≈ 11 dmg/round into a FULL EPIC kit, 60hp in ~6 rounds, so
crowds stay lethal at every gear tier. Bleed is ~73% of a crawler's output vs
epic armor: the Phase-0 armor-ceiling lever is working as designed. Findings,
ranked. **Fixes 1–6 BUILT 2026-07-08** (first-swing rule, reckless 1.5/1.5,
guarded identity = GUARDED_WOUND_ODDS half-turns fresh wounds + GUARDED_BLOCK_BONUS
behind a shield, wear() comment, migration 044 weight on chitin/coral-crown);
post-fix ladder verified via the audit model: shiv 12.0→8.5, fleshing-knife
15→11.5, widow-maker 24.4→17.5, and heavy steel now wins vs armored mobs.
Awaiting ship. Original findings:

1. **Speed weapons structurally OP — CONFIRMED** (rome's 07-07 dagger instinct
   was right). Root cause: every extra swing re-rolls the FULL 2–5 body roll, so
   `speed` multiplies (base + weapon dmg), not the blade. Dmg/round vs a0:
   widow-maker (epic ×3) **24.4** vs headsman-sword (epic ×1) **9.5** — 2.6× at
   equal rarity; bone-shiv (UNCOMMON ×2) **12.0** beats every single-swing
   weapon in the game incl. both epics; fleshing-knife (rare ×2) **15.0**.
   Every slow weapon is a trap. **Fix (one rule, fits the fiction):** only the
   first swing carries the 2–5 body roll; follow-up swings deal weapon dmg only
   — *"only the first cut has your shoulder behind it."* Lands: shiv 12.0→7.9
   (between falchion 6.5 / graveblade 7.5 — right for uncommon), fleshing-knife
   15→11.2 (top rare, taxed by 2× wear), widow-maker 24.4→17.6 (still the DPS
   epic, no longer double). Stun/reach weapons become real choices.
2. **The fence sells the exploit for 8 tender:** bone-shiv at the keeper's
   hatch = second-best weapon in the game, minute one. Self-heals once fix #1
   lands (becomes the best-VALUE buy, which is fine); until then it hands every
   fresh player the degenerate build.
3. **Epic armor has no cost:** chitin-harness(4)/coral-crown(3)/warden-
   sabatons(2)/hyena-mantle(2) are ALL weight-0 → 11 armor (52% mitigation) AND
   quick-feet dodge AND clean flight. The heavy/light tradeoff only exists
   mid-tier, exactly where players pass through fastest. Real fix = the Phase-3
   encumbrance lever; cheap interim = a weight point on chitin/coral-crown so
   "light epic" is a choice (deadplate-heavy vs chitin-light should differ
   somewhere — condition fragility?).
4. **Reckless stance is efficiency-dominant:** ×1.5 out / ×1.3 in — the trade
   favors you, and with incoming capped by the dogpile, racing is nearly always
   correct. Guarded (×0.6/×0.6, symmetric) mostly makes fights 67% longer.
   Make reckless a true gamble (def 1.3→1.5) or give guarded a hook (raises
   block, or halves bleed re-open odds — "you fight behind your shield").
5. **Upper-floor tension collapses at uncommon kit — WATCH, don't fix:**
   falchion + 7a + buckler goes "easy" vs every non-variant upper mob (die-in
   19–54 rounds vs kill-in 2–10). Solo tension up top = crowds, noise-waking
   listeners, grudge first-strikes only. Probably fine (the upper floor IS the
   farm); if extraction starts feeling free, the lever is density/aggro, not
   stats.
6. **Housekeeping:** `wear()` comment still says "Sealed gear is frozen" —
   stale since `SEALED_WEAR_MULT`. Also worth knowing: HOLLOW mobs grind
   weapons 8×/strike, which taxes fast blades hardest — a hidden equalizer,
   but the deep is mostly flesh so it doesn't rescue #1.

   The audit model is `game-server/scripts/balance-audit.mjs` (expected-value
   tables: dmg/round per weapon vs armor, rounds-to-kill both directions per
   gear tier, 1v1 margins). Stats are hardcoded from the current tables — re-run
   it after any tuning pass, update its numbers if migrations move stats.

### The audit expansion — 16 pieces of gear with PROPERTIES *(built 2026-07-08, awaiting ship)*

Designed against the fresh model so each lands in tier on the first shot —
migration 045 + trait sets in zone-data.ts (the FEARS_FIRE pattern, no schema
change) + one-line hooks. NO raw-damage creep: every piece buys a situation.
- **Weapons (8):** quarterstaff c / pitted-spear u / war-pike r / abyssal-harpoon e
  (REACH — a set haft strips the ambush's AMBUSH_MULT); horsemans-pick u /
  crow-beak-pick r (PIERCE 2/3 — ignores mob armor; taxed by HOLLOW wear);
  sword-breaker r / kings-guard-blade e (PARRY — block column on a weapon, sums
  with shield). War-pike + harpoon are the first TWO-HANDED weapons (no shield,
  enforced at equip + auto-equip).
- **Armor (8):** quilted-coif c + riveted-cuirass r (PADDED — mob stuns halved,
  best piece counts); thick-hide-jack u (WARDHIDE — claw-wounds open half as
  often, stacks with guarded to a quarter); felt-soled-boots u + grave-shroud e
  (QUIET — LISTENER wake odds halved); strapped-baldric u (STRAPPED — cutpurse
  can't snatch); spiked-buckler u (THORNS — blocked blow costs attacker 1);
  eel-skin-cloak r (SLICK — seize takes hold half as often, breaks easier).
- **Placement follows danger (043):** commons/uncommons at the fence (3–9),
  rares in box-deep/relic, the drowned tier guards its own counters (eel-skin +
  harpoon in box-tide), kings-guard + grave-shroud in box-abyss.
- **The three archetypes complete:** ghost (felt boots, shroud, spear), turtle
  (cuirass, sword-breaker, buckler, guarded), cracker (picks, plate, reckless).
- Post-045 ladder verified in the model: pick flat-5.5 through a2, crow-beak
  flat-6.5 through a3 (best rare into the hound), pike/harpoon = greatsword/
  headsman + reach − shield arm, widow-maker still the ceiling at 17.5.

**The exclusives pass (046 "the deep provides", built 2026-07-08, awaiting
ship):** the corpse-gear table was mostly fence-duplicates and the three-headed
hound dropped NOTHING (sneak was strictly correct, killing it charity). Ten new
dungeon-only pieces — the fence dresses you, the deep defines you:
- **Off creatures** (gear_item, pried loose on death): sentinel's-mantle r
  (a2 wardhide, hound 0.45) + hound-fang trophy (barter 8, 0.9 — the hound
  finally pays), pale-hide-hood u (a1 quiet, albino 0.6), crawlers-hooks r
  (2 dmg ×2 bleed 3 = 10.5 dpr, under fleshing-knife, stalker 0.2), gaff-hook u
  (reach + bleed 1, the-drowned 0.12), knights-kite-shield r (.30 block w1,
  bone-knight 0.1); warden-captain now WIELDS the flanged-mace (0.10 — coffer
  epic made huntable, faucet stays a trickle).
- **Coffers only:** kelp-woven-mail r (a2 w0 slick, box-tide),
  shade-wrapped-greaves r (a1 quiet, box-deep), crown-guard-pavise e (.40 block
  thorns 2, reliquary/abyss — vs gravestone: trade 5% catch for teeth),
  abyssal-scale-coat e (a3 w0 slick, box-abyss — the GHOST's epic body;
  chitin/deadplate stay the tanks).
- **Drop-rate principle (rome):** the spawn is already the gate — the drop
  shouldn't double-gate. Trophies near-certain, signature hide ~half,
  epics-off-elites ~a tenth; spawn rarity does the rest. Two rulings
  (2026-07-08): the door-signet stays 1-in-5 off the King — the one legendary
  is DELIBERATE myth, allowed to double-gate; and the hyena-mantle came OFF the
  fence entirely + onto the dire-hyena at 0.3 (its own pelt — an infinite
  counter faucet closed, a 1-in-10 bloodline hunt opened; bottom line per rome:
  loot should feel scarce).
- All traits reuse 045 hooks (sets grew by an id or two); no strictly-better
  pieces (each checked against slot neighbors in the model); swaps not churn
  (stalker/drowned/knight traded fence-duplicate drops for exclusives; the
  crawler keeps the fleshing-knife, the hulk keeps the iron-bound shield).

**The deep gets two new species (047 "verdigris_and_marrow", built 2026-07-08,
awaiting ship):** the audit found the deep dense enough (29/32 rooms) but
NARROW — four base species, and 045/046 sold counters to every threat it has.
Two additions, each hunting a build the deep couldn't touch:
- **The verdigris-thing** (CORRODERS, wet Drowned-Reach rooms ×4): its landed
  blows bloom green on ONE random worn piece — CORRODE_WEAR 1.5/blow, SOFT by
  rome's call (a fight is a repair bill, not a wall; ~5–8 condition per
  encounter). Weapon in hand never touched; sealed kit resists via
  SEALED_WEAR_MULT (the seal finally matters mid-fight); the naked player
  shrugs. The extraction monster: it attacks equity.
- **The marrow-cantor** (LISTENERS + HOLLOW, King's Demesne bone rooms ×4):
  the bottom tier finally has EARS (quiet gear earns its keep where loot is
  best) and the 8× bone-tax (fast blades finally pay at the floor of the
  world). Warden-tier stats (38hp, 4-7, a2).
- **Tuning ride-along:** twice-dead stun 0.25→0.12 (rome: "that seems like a
  lot" — it stunned at a rare warden-maul's rate on a 9-spawn common).
- **NOTE FOR SHIP:** a warm world never re-reads mob_spawns — run
  POST /admin/reseed after deploying 047 or the new species never appear.
- **ICEBOX — the undertow-grasper** (anti-turtle, NOT built): a drowner cousin
  whose grab comes AROUND the shield (seize that block doesn't stop — arms,
  not blows). The pavise-turtle currently counters everything; this would be
  its counter. Deepest water only, if the turtle proves too safe in play.

### The map is a MAP now *(built 2026-07-08, awaiting ship — client-only)*
The map modal drew a list ("dir → destination" rows). Now it draws floor
plans. Zero server changes — the frame already carried rooms+exits+dirs; the
client auto-lays it out (renderMap in public.ts):
- **Stairs assign floors** (down = one deeper, BFS from where you stand,
  keep-first on the world's few bent stairs); **the compass lays each floor on
  a grid** (the world graph turned out grid-perfect: the surface is one clean
  5×8 plan with the Vaulted Hall dead center, zero collisions).
- Bands top-to-bottom: **the gates** (all above-surface air folds into one
  band) → **the surface** → **one down … eight down**. Rooms are boxes (gold
  = you, steel = gates, blood-dark = deep), passages are lines, ▲▼ = stairs.
  Wide bands shelf-wrap at 7 columns.
- **A crude map lies visibly now**: omitted rooms cut the walk, and whatever
  the walk can't reach lands in region-labeled bands — "the halls — pages
  adrift" / "the deep — pages adrift" (the copyist knows which part of the
  dungeon a page came from, just not where it sits; gates are never adrift).
  Lying exits draw as dashed blood-lines to the wrong box or stubs poking off
  the page — one copy even draws a deep room confidently into the halls. The
  surveyor's map draws true and still lights rooms known on the HUD. Shelf
  packing places tall pieces first (tight bands, no dead rows).
- Verified: tsc clean, served-script PARSE_OK, DOM-shim run against the real
  world graph (true from hall, true from throne, crude) — no cell overlaps.

### 048 — a second hideaway for the deep *(built 2026-07-08, awaiting ship)*
rome, reading the world chart: the deep had ONE hideaway (Pocket of Air, up in
the Drowned Reach) — everything below it was a no-breath run. Added **A
Worm-Bore** off the Worm Cloister, mid-Sunless-Deep: deep enough to matter,
still shy of the King's Demesne so the bottom keeps its dread. Same law as the
other three (is_safe, engine bars every creature, single squeeze back out —
and the cloister's pale-crawlers make the doorstep itself a gamble). Added to
DEEP_ROOMS (zone-data.ts) + the chart's mirror set. No reseed needed —
rooms/exits are static world data, re-read on deploy. Also: the desktop world
chart regenerates via `promo/capture/_map.mjs` (self-contained: reads local
D1, screenshots via headless Chrome; footer auto-counts migrations).

### Phase 3 — The simulationist direction *(bigger, later)*
- **Weapon-aware combat dialog** — ✅ SHIPPED 2026-07-08 (Phase 3 opener; "the
  sim speaks"). Each of the 30 weapons swings in its own voice (`WEAPON_VERBS`
  by item id in zone-data.ts, family register as fallback), and the swing
  appends a trait-tell when a mechanic actually fires this beat — PIERCE_TELL
  when the point beats armor, BLEED_TELL when an edge opens a fresh wound (crit
  still trumps; a landed stun keeps its own "reels" line for the thud). Player
  swing only for now; creature-side already event-narrates (seize/drown/stun),
  and the player ambush line is a cheap follow-up if wanted.
- **Combat/economy fixes rolled in same ship:** hollow weapon-wear 2.0→0.6
  (8×→~2.4×; ~50→~165 swings — was shredding blades in one deep dive);
  barter no longer seals fungibles (scrap/trophies/cigs carry no title — a
  sealed scrap couldn't be spent at forge/vice); `repairCore` now reaches the
  lockbox+vault (was pack-only — broke typed AND modal repair) and counts scrap
  seal-agnostically (rescues already-sealed scraps; same latent bug fixed in the
  forge counters); typed `vault <item>` now pulls from the lockbox too (parity
  with the modal shortcut).
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
  for fresh players. Gentle (+1–2). Its prerequisite (curved armor) shipped in
  Phase 0, so it's **unblocked** — bump HP not damage. rome's idea; good for the
  shallows, weak for the deep.

## Storied gear — items with biographies *(the identity feature, 2026-07-07)*

The answer to "how does MUD + extraction distinguish itself" — not more economy,
a **meaning layer on top of it**. The economics are done (seal/gate membrane,
death-drops, wear, worn-on-entry, lean faucets); this is what they're *for*.

**The pitch:** in Tarkov every sword is fungible; in a classic MUD every sword
is static. In NOMAD an item can have a **history** — because we're standing on
the exact intersection neither genre can reach:
- **One persistent shared world** — no resets; what happened, *happened*.
- **Signed, serialized loot** — the seal was built for anti-forgery, but a
  serial is a *biography slot*. The dungeon can attest every chapter.
- **Condition as narrative** (just built) — a blade at 38% isn't damaged
  goods, it's a veteran.
- **Death drops everything** — so items *outlive their owners* and change
  hands over corpses.

**The inversion that makes it sing:** you don't lose your gear when you die —
**your gear loses you**, and carries you as a scar. "This notched greatsword
has 214 kills, went to the King twice, and its last three owners died in the
Sunless Deep — you pried it from the third one's hand." Death stops being only
an economic sink and becomes how legends circulate. The scarcest resource
stops being epic-rarity and becomes **story** — the one thing that can't be
farmed, duped, or inflated, because it's only minted by things actually
happening in the one shared world.

**Build shape (cheap — the parts exist):** a deeds-ledger keyed by sealed
serial (small D1 table, not a system). Record: kills (creature/boss/player),
depths reached, owners, owner deaths while carried. Surface it in `look`/the
journal ("its account"), and let the 31573/1573 Nostr side carry it for
bazaar interop later — a storied item's cert should *show* its story.
**Sequencing:** the substrate (ledger + attestation) can land pre-players so
day-one history is real; the *payoff* is population-gated — stories need
people to make and hear them. Ties into the loot economy (a storied
piece is the ultimate barter good) and the Phase 7 legend systems.

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
- **The black market / player trade layer** (rome, 2026-07-07: "for another
  time") — the final piece of the emergent economy. A place hoarded gear
  re-enters circulation and prices float on supply/demand, the way Tarkov's
  flea market does. Completes the scarcity model built in Phase 2 (rarer
  faucets + sealed-wear are the drains; this is the re-supply/valve). The world
  already has a hard currency for prices to settle in. Player-to-player, distinct
  from the existing keeper/fence NPC trade. Gated on actual players.
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
- **Anonymize the relay feed (anti-stream-snipe) — SHIPPED 2026-07-07.** The
  public `24913` feed named players and their live room —
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
