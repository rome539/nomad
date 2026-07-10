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
**SHIPPED 2026-07-08 (7dbf1e7).** Original findings:

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

### The audit expansion — 16 pieces of gear with PROPERTIES *(SHIPPED 2026-07-08, 7dbf1e7)*

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

**The exclusives pass (046 "the deep provides", SHIPPED 2026-07-08, 7dbf1e7):**
the corpse-gear table was mostly fence-duplicates and the three-headed
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

**The deep gets two new species (047 "verdigris_and_marrow", SHIPPED 2026-07-08,
7dbf1e7):** the audit found the deep dense enough (29/32 rooms) but
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
- **Reseed done on ship** (a warm world never re-reads mob_spawns, so 047's
  species needed POST /admin/reseed after deploy — run at ship time).
- **ICEBOX — the undertow-grasper** (anti-turtle, NOT built): a drowner cousin
  whose grab comes AROUND the shield (seize that block doesn't stop — arms,
  not blows). The pavise-turtle currently counters everything; this would be
  its counter. Deepest water only, if the turtle proves too safe in play.

### The map is a live Achaea-style schematic now *(✅ 2026-07-09 — superseded the posters)*
> **Third step (2026-07-09):** rome researched Achaea and the PNG poster was the
> wrong call — a static poster can't show WHERE YOU ARE and makes every crude copy
> an identical lie (wasting the per-book deterministic-lie the server already
> computes). The modal now **draws the room graph live** on a canvas: rooms as
> region-tinted tiles auto-laid on a grid by walking the exit directions (the
> server already sends the graph + `here` + per-book crude lies), your room
> **glows**, exits are lines, up/down dashed, drag-to-pan + zoom. Crude maps render
> their own individual wrong graph; connected-component packing keeps a shattered
> crude map from collapsing into one row; labels clip to their tile (strip "The ").
> The **`/map-survey.png` + `/map-crude.png` routes, `src/mapimg.ts`, and
> `scripts/embed-maps.mjs` were all PRUNED** (dead once the client draws its own).
> The promo poster pipeline (`promo/capture/_map.mjs`) survives as promo art only.
> The old steps, kept for the record:

Two steps, the second superseding the first:
- **7dbf1e7** replaced the old list ("dir → destination" rows) with live
  client-drawn floor plans (a `renderMap` that BFS-assigned floors and laid each
  on a compass grid).
- **4154837** superseded that: the modal now shows the **drawn PNG poster** the
  promo pipeline already produces — the surveyor's truth and the crude copy —
  served by the worker at `/map-survey.png` & `/map-crude.png` from
  `src/mapimg.ts` (base64; **one string literal per blob** — `+`-concat hangs
  tsc). The in-game chart is now literally the poster on the wall. The old
  client-side floor-plan layout code was removed.
- **Regen:** `promo/capture/_map.mjs` draws the charts from the exit graph to
  `~/Desktop` (`--crude [copy#]` for a lying copy), then
  `scripts/embed-maps.mjs` base64s them into `mapimg.ts`. Rerun both after any
  migration that moves rooms/exits.

### 048 — a second hideaway for the deep *(SHIPPED 2026-07-08, 7dbf1e7)*
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
- **Follow-on fixes (SHIPPED 2026-07-08, c4fc8e8):** the HOLLOW no longer bleed
  — the bleed DoT was applying to bloodless things (skeletons/wardens/kings/
  cantor/drowned-god) against the design; now immune, with an occasional dry-tell
  ("no blood in it to spill") so bleeders read as the wrong tool in the bone
  rooms. And barter gear stopped rolling the dungeon's worn condition: it's new
  stock now (`rollShopCondition` — ~79% pristine, ~21% "worn", never battered).
  OPEN: the revenants (twice-dead/thrice-dead) aren't in HOLLOW, so they still
  bleed — left bleedable pending rome's call.
- **The vitals lottery — the Tarkov headshot** *(✅ PvE SHIPPED 2026-07-09; rome
  specced the numbers; this DELIBERATELY overrides the old "never random" line
  below)*. **What shipped:** both PvE directions (a threat can headshot you;
  YOU can land a lucky killing blow on a mob), weapon-aware text on both sides
  (creatureVitals teeth/bone/water/knife; playerVitalsVerb pierce→throat/skull,
  edge→throat, blunt→skull, thrust→heart). **Gates:** bosses excluded (the wall);
  the three-hound only falls to a PIERCING weapon (VITALS_HOUND 1/5000); the
  hollow only to a BLUNT weapon (no throat — shatter the skull). **PvP half still
  waits on PvP existing** (VITALS_PVP 0.5→1% ready; one call to wire). A
  hit to the vitals can end anyone — mob→player AND player→player — regardless of
  gear. It IS a lottery (genuinely random), which the old note banned; rome
  reversed that on purpose because the randomness is the whole point of the
  headshot: it's the equalizer that lets a naked player kill a geared one (the
  fresh-vs-geared answer for PvP). Kept fair by three guards, all pure Tarkov:
  - **Armor covers vitals** — a helm/vitals piece buys the odds down (or covers
    the zone). Still random, but gear-meaningful and *fair*: you chose not to
    protect your head. This is the Tarkov helmet.
  - **Threat-gated in PvE** — trash (rats) NEVER roll it; only real threats
    (pale-stalker, the hound, deep dwellers, bosses) can. Protects the first run.
  - **Symmetric in PvP** — always on, both ways.
  - **The numbers** (designed from cumulative per-run/per-duel odds, not the
    meaningless per-hit figure — 2–5%/hit = ~99% death per run, a sentence not a
    lottery): **PvE 1/3000 armored → ~1/1500 naked** (≈6% of runs armored, ≈12%
    naked, at ~200 hits/run). **PvP 0.5% armored → 1% naked** (≈1 in 20 duels
    armored, ≈1 in 10 naked, at ~10 hits/duel). Two separate dials because a duel
    is ~10 hits and a run is ~200 — one per-hit number can't serve both.
  - Distinct from the leg-wound affliction, though both are body-zone. Could
    eventually *replace* the flat armor number with zonal coverage.
  - OLD DESIGN (rome overrode this 2026-07-09, kept for the record): "earned
    finishers on an opening + telegraphed, NEVER random — a slot machine that
    hurts fresh players worst."
- **The Hunter / Nemesis** — targeted pressure: the world sends a named predator
  after the too-successful player, who has to get out ahead of it. Reuses
  grudges + `curious` tracking. (rome: "i love this.")
- **Encumbrance → combat penalty** + weight-based pack (bones exist: `weight`
  column, `wornWeight()` — today it only affects flee/dodge).
- **Shallows heat map** — mobs get harder the faster they're farmed, decaying back
  for fresh players. Gentle (+1–2). Its prerequisite (curved armor) shipped in
  Phase 0, so it's **unblocked** — bump HP not damage. rome's idea; good for the
  shallows, weak for the deep.

### The living-world & combat-depth layer *(rome approved, 2026-07-09; drawn from the reference list below)*

Lessons from Achaea, Rain World, and Caves of Qud — deliberately at a **smaller
scale than the source systems**. Each has a big Phase-3 form and a minimal first
slice that reuses machinery we already ship. rome: build the slices; the
frameworks stay on paper. **These four are one design island** — a wounded mob
*looks* wounded, a hungry mob *eyes* its rival, and your own wounds *show*
(Qud's "legible deep sim" applied to systems we mostly already have).

> **✅ SHIPPED 2026-07-09** — four of the five island slices landed in one batch:
> **food web**, **glanceable status**, **leg-wound/hobble** (flee-timer), and the
> **vitals lottery** keystone (PvE both directions, weapon-aware). Plus two combat
> tunes rome asked for alongside: **blunt weapons now ignore 2 armor** (a mace
> caves plate, `BLUNT_ARMOR_IGNORE`, with its own BLUNT_TELL) and the **hollow can
> only be vitals-killed by blunt** (no throat to open — shatter the skull). Only
> **herbs** remains of the island. Details in each bullet below.

- **Mob food web — creatures prey on each other** *(APPROVED, 2026-07-09; from
  Rain World — the best-fit idea on the list, and it's small)*. The world's danger
  should come from *ecology*, not spawn tables: a dire-hyena drives a grave-hyena
  off its kill, hyenas eat rats, the hound bullies whatever's near its throne,
  albino-rat is apex vermin. Build: a **dominance/predation table** (code-side, same
  shape as `BLEED_ODDS`/`PIERCE`) + **one hook in the AI tick** — when two creatures
  share a room a dominant/predator may turn on the weaker, **especially over food**
  present (a corpse, or the `offal` lure). Lives entirely in `ai.ts` per
  [[keep-zone-ts-lean]]; reuses combat + scavenger + lure. **Why it's safe to build
  first:** touches ZERO player-combat balance, *thins herds on its own* (a partial
  fix for the recurring brood/overpopulation fights), and hands players real tactics
  (throw offal to start a fight and slip past; lure a predator onto your pursuer).

- **Herbs / reagents — a foraging survival layer** *(APPROVED — start with the slice)*.
  - *Full (later):* room-specific plants, some deep-only, plus a **dry/prepare**
    state machine so raw ≠ ready. The prepare step is a new verb + item-state —
    the expensive part; defer it.
  - *Slice first:* add 2–3 more region-placed edibles with distinct effects, 1–2
    **deep-only**. Pure DATA on the edible-prop system already live (well-water /
    cave-lichen, migration 052) — near-free, no new system. The "economy" emerges
    from *placement*; gives the deep a non-gear reason to be entered. Scarcity-safe
    (renewable but gated by *where*). See [[nomad-loot-economy]].
- **Roaming chests — pull loot out of the safe rooms** *(rome, 2026-07-10)*. Today
  the 7 caches are nailed to fixed rooms, and two (box-bone, box-crack) sit in the
  safe hideaways — zero-risk loot by the bank, which undercuts extraction. Fix:
  keep the same *number* of chests (scarcity math unchanged), but each refill cycle
  a chest **relocates to a random eligible room** instead of a fixed one — finding
  one becomes exploration + luck. **Pull the two safe-room chests out**; their
  supply folds into the roaming pool so all chest loot carries risk. Eligibility is
  danger-tiered (a chest stays in its tier — deep boxes roam deep rooms, not up to
  the gate). Reuses the `caches` + `cacheSpent` refill machinery; the roam is just
  a room re-pick on refill. Pairs with the herbs slice (the world seeds things
  where you have to go find them).
- **Glanceable status + rewarding `look` — the Qud UX layer** *(APPROVED, 2026-07-09;
  the PREREQUISITE for afflictions, do it first)*. Two concrete things:
  - *Status you can read at a glance:* afflictions/effects shown as compact
    persistent HUD tags (`you ▸ hp 42/60  ⚑ leg: hobbled  ⚑ bleeding`), not prose
    buried in the scroll. Reuses the color-coded chip/HUD system — half-built already.
    **An affliction you can't read at a glance is just an invisible debuff; this is
    what makes one worth having.**
  - *`look`/`examine` that leaks real information:* layered description that does
    flavor + mechanics at once — a mob's limp reads as its wound, a hungry mob
    "keeps glancing at the smaller hyena across the room" (telegraphs the food web).
    Hooks into the journal/bestiary (study deepens what `look` tells you).
- **Afflictions & cures — tactical status-trading** *(APPROVED — one instance, not a
  framework; GATED on two things)*.
  - **Sequencing (rome's call, 2026-07-09):** don't stack a tactical layer on an
    unmeasured base. Gated on (1) the glanceable-status UX above, and (2) a fresh
    **balance re-check** — re-run `scripts/balance-audit.mjs` (stale since the combat
    audit) so we decide on real DPR/TTK numbers, not a hunch. Build food-web first.
  - *Full (later):* a general affliction system — stacking statuses, cure-routing,
    mobs applying them. This is the framework; hold it.
  - *Slice first:* bleed **is** already an affliction and bandage **is** its cure —
    add exactly **one more instance** of that pattern: a **leg wound / hobble**,
    cured by rest (a splint item later). One status flag + one hook into flee +
    one cure path. Proves the tactical layer without building a system. Keep the
    new behaviour out of zone.ts's spine per [[keep-zone-ts-lean]].
  - **Hobble = a flee TIMER, not a dice-block (rome, 2026-07-09).** A leg wound
    must NOT randomly stop you from fleeing — that's the rage-inducing slot machine
    the lethality item bans. Instead: while hobbled, `flee` doesn't fire instantly;
    the first attempt starts you "limping clear," and you break away only after a
    set delay (~1 combat round / 4s), exposed the whole time. Deterministic and
    tactical: you *can* always escape, but a pack on a hobbled leg forces the
    choice — eat the wind-up, or cure/kill your way clear first. Cure (rest) clears
    it at once.
  - *Build order for the island:* **food web ✅ → glanceable status ✅ → balance
    re-check ✅ → leg-wound affliction ✅ → herbs slice ⬜** (herbs make the cures
    matter — the only piece left).

## Design lineage — what to steal, what to avoid *(2026-07-09)*

The reference games for NOMAD (rome's homework list + one add), vetted for fit.
Each: the one thing to **steal**, and the specific **trap** that would hurt NOMAD
if copied wholesale. The throughline of every trap: **depth belongs in the world,
clarity in the interface, scope in a small number of deep systems.**

- **Rain World** — *Steal:* creatures with agendas that relate to each other (a
  food web; you're prey, not protagonist). *Trap:* its deliberate player-hostility
  and opacity — NOMAD's cruelty is in the world, never the interface. → food-web (approved).
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

- **Connection stability — ✅ SHIPPED 2026-07-09 (`dae29c2`).** Both fixes
  landed together: the 25s client heartbeat (answered by
  `setWebSocketAutoResponse` without waking the DO) *and* the full Hibernation
  API migration (sockets survive deploys/evictions; sessions rebuild from
  D1 + the sim on wake). Remaining: a throwaway-key prod validation pass —
  connect, deploy while connected, confirm no disconnect.
- **Guest-key wrapping at rest** *(from the nsec audit, 2026-07-09 — decided
  AGAINST for now, reasoning recorded)*. The guest nsec lives as plaintext hex
  in `localStorage.nomad_sk` (and `nomad_sk_prev`). Considered wrapping it with
  a non-extractable AES-GCM CryptoKey in IndexedDB so a localStorage-only read
  yields ciphertext. Passed because the gain is thin: XSS defeats it (can run
  code in-origin), extensions defeat it, and disk-level malware defeats it (the
  wrapping key sits in the same browser profile). The real walls are the
  textContent-only render path (no injection surface) and the graduation paths
  for high-stakes identities (extension / signer app / Google custody — the
  key never touches the page on the first two). Revisit only if the client
  ever renders rich/user-URL content, which is also the security-kit trigger.
  Bare-nsec-paste fix + history masking SHIPPED separately (see sendCmd).
- **Balance / equilibrium — the action-cost clock** *(from the Achaea pass,
  2026-07-09 — rome iceboxed this one; keep 1+2, hold 3)*. Achaea's texture comes
  from every action costing a recovery window you can't act through. Reassessed as
  the **biggest and riskiest** of the three Achaea ideas — it rewrites the combat
  cadence everything is tuned to, and it fights [[keep-zone-ts-lean]]. The primitive
  already exists (`nextThrowAt` is a per-action cooldown; stagger is a forced skip),
  so if it ever happens it should be **1–2 opportunistic special cases** (a heavy /
  reckless swing costs you the *next* beat) expressed with those tools — **never** a
  global balance bar retrofit onto the 4s round. Hold the general system.
- **Idle kick** (spun off the above) — optionally boot truly-AFK players after N
  minutes of no commands, so a forgotten open tab doesn't hold a live session.
- **The black market / player trade layer** (rome, 2026-07-07: "for another
  time") — the final piece of the emergent economy. A place hoarded gear
  re-enters circulation and prices float on supply/demand, the way Tarkov's
  flea market does. Completes the scarcity model built in Phase 2 (rarer
  faucets + sealed-wear are the drains; this is the re-supply/valve). The world
  already has a hard currency for prices to settle in. Player-to-player, distinct
  from the existing keeper/fence NPC trade. Gated on actual players.
- **WATCH — the rusted pick is a scrap-iron faucet** (rome, 2026-07-08). The
  free renewable pick (051, regrows in the Stripped Armory) can be farmed for
  scrap iron — stand near the armory, take the pick, break it down, repeat. Not
  a problem *now* (scrap isn't scarce enough for the trickle to matter, and the
  5–25 min regrow throttles the rate), but if the scrap economy ever tightens
  (a leaner repair/forge cost, or salvage yield goes up) this becomes an
  unbounded supply. It's the inherent cost of it being renewable. Levers when it
  bites: make the pick non-salvageable (yield 0 scrap), or a token 1, slow its
  regrow, or pull the ground-spawn and sell it cheap at the fence instead. Same
  caution applies to any future renewable gear on the floor.
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

- **Retune mob memory — how long a grudge lasts (ALL mobs)** *(rome, 2026-07-09
  — icebox, decide the numbers later)*. The lever is `FORGET_MS` (per-mob) +
  `FORGET_DEFAULT` in `zone-data.ts`, read by `forgetMs()`/`remembers()` in
  `ai.ts`; killing the creature settles it, `is_boss` → never forgets. Current
  scale feels off to rome: default **24h**, warden **7 days**, brood/skeleton/
  dire-hyena **24h**, grave-hyena **12h**, rat/fleet-rat **30min**, cutpurse
  **20min**. He wants these changed across the board — open question is
  shorter (less punishing across sessions) vs a re-shaped curve. Pure data/
  constants edit, no migration; ship whenever the numbers are settled.
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
