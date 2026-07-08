# COMBAT.md — how the dungeon fights

The one place that knows what happens when something swings. Every number
here is the number in the code; when they drift, the code wins and this file
is the bug. Sources of truth:

- **Constants & behavior families** — `game-server/src/zone-data.ts` (the
  constants block up top, and the trait/behavior `Set`s and `Map`s below it).
- **The combat spine** — `game-server/src/zone.ts` (the tick in `alarm()` and
  the swing resolution); creature *behavior* lives in `game-server/src/ai.ts`,
  the gate/trade/extraction layer in `game-server/src/gate.ts`. Keep zone.ts to
  the tick/combat/transport spine — new creature behavior goes in ai.ts, new
  sets/constants in zone-data.ts.
- **Gear & creature stats** — D1 `item_templates` / `mob_templates`, seeded
  and altered by `game-server/migrations/` (001 through 047).
- **The map** — 67 rooms: four surface gates and an outer ring around the
  Vaulted Hall, then the undercroft and the graded deep below it.
- **Verbs** — `game-server/src/parser.ts` (aliases, help text).

Design spine (from ROADMAP.md): *the world never moralizes, every attack is a
gamble, and power comes only from carried gear — a fresh key is a weak key,
and that weakness is the sybil resistance. This is an extraction MUD: getting
out with your loot sealed is the whole game, and the seal is the membrane.*

---

## The round

The zone alarm fires every **2 s** (`TICK_MS`) for world upkeep — healing,
hunger, grudge decay, wandering, rust, bleed and seize weeping. But **blows
only land on the combat round, every 4 s** (`COMBAT_ROUND_MS`): a swing you
commit resolves on the next 4-second beat, the same beat for everyone in the
room. Combat only runs while someone is connected; offline time is caught up
by the silent simulation, which never fights. Order inside a combat round:

1. **Players swing** (the living get initiative).
2. **Creatures act** — flee if badly hurt, otherwise fight back.
3. Bodies and appetites resolve on the 2 s tick between beats.

Two attacks happen *outside* the beat, resolved on the spot: the **ambush**
first strike (`attack` on an unaware creature) and **`throw`**.

## Your swing

You **focus one foe** and auto-advance: the moment your target falls — or
something new is on you while you're idle — you're swinging at the next.
Never idle, but a swarm trades several-for-one against you: they all hit
back each round, you answer one at a time (up to `DOGPILE_CAP` = **3** can
land a blow on you in a beat; the rest press at the edges). Gear bends the rule:

- **speed** — swings per round (fast blades: 2, a widow-maker: 3).
- **sweep** — foes caught per swing (a cleaver: up to 3).

Damage pipeline, in exact order:

```
first swing:  roll 2–5 (PLAYER_DMG) + effective weapon dmg
extra swings: effective weapon dmg ONLY — no body roll     (first-swing rule)
× stance atk (0.6 / 1.0 / 1.5)
× 0.75 if you're wounded (< ⅓ hp)                           WOUNDED_DMG_MULT
× 2 on a crit (5%)
− target's armor  (a PIERCE weapon ignores that much)      floored at 1
```

**The first-swing rule** is the spine of weapon balance: only the first cut of
the round carries the 2–5 body roll — "your shoulder behind it." Follow-up
swings from fast steel carry the blade's edge *alone*. So speed multiplies the
weapon, never your whole arm: a fast dagger and a slow greatsword end up in the
same tier instead of the dagger running away with the fight. `effective weapon
dmg` = `ceil(base × condition / 100)` — a worn blade hits softer.

**Fumble** — 5% per swing (`FUMBLE_CHANCE`), +5% while wounded
(`WOUNDED_FUMBLE_BONUS`), rolled once per swing:

- The whole swing goes wide. The blade only **flies from your grip** when your
  blood is low **and** the luck runs against you (`WOUNDED_DROP_ODDS` = 0.3 on
  top of the fumble). Hale, you just whiff; hurt, you usually just whiff too,
  and only rarely lose the sword. You never drop it at full strength.
- A dropped weapon lands on the **floor of the room**, anyone's to take
  (including you, mid-fight — `get` is combat-legal). A sealed one cracks its
  claim (mint voided) as it lands.
- bare-handed, a fumble leaves you **staggered**.

**Staggered** (an "opening"): the next hit that lands on you costs **+2**.
Cleared when that hit lands, or when you leave the room.

## Their swing

Each creature fights its one `target` (same focus rule). Pipeline:

```
roll dmg_min–dmg_max                    from mob_templates
+ 3 × phase, boss only
× 1.25 if it already has you SEIZED      (a drowned thing drags harder)
× 0.75 if the creature is wounded (< ⅓ hp)
miss chance 5%  (+5% if your worn weight is 0 — quick feet)
× 2 on a crit (5%)
+ 2 if you were staggered (consumes it)
× ARMOR_K / (your armor + ARMOR_K)       curved mitigation, K=10, floored at 1
× stance def (0.6 / 1.0 / 1.5)           floored at 1
```

**Armor is a curve, not a wall.** This is the Phase-0 ceiling patch: your armor
mitigates a *percentage* — `10/(armor+10)` — never an immunity. 4 armor turns
~29%, 11 armor turns ~52%. Stacking plate always helps and never trivializes,
so the top of the gear curve still has to sweat. (Note the asymmetry: *your*
blows subtract mob armor flat, floored at 1; *their* blows are curved by yours.
The curve is the thing that keeps a fully-kitted player killable.)

A creature below **25% hp** (`FLEE_BELOW`) tries to flee each tick at **50%**
odds (bosses never flee). Fleeing clears its target; the wound and the grudge
stay.

## Status effects — the threats that route around gear

Armor and hp are the front door; these three are the windows. They're how the
deep makes a full-epic player sweat.

- **Bleed** — a cutting edge opens a wound that weeps for `BLEED_TICKS` = 3
  ticks, **ignoring all armor**; fresh hits refresh it. On the tick a bleed
  would run out, `BLEED_KILL_ODDS` = 0.5 decides whether the last of it takes
  the victim or clots. Cuts both ways: your bleed-weapons work on mobs, their
  bleed works on you. **WARDHIDE** armor half-turns fresh wounds on you. The
  **HOLLOW are immune** — dry bone and old iron have no blood to spill, so a
  bleeder is the wrong tool in the bone rooms (and it wears fast there besides).
- **Stun** — a blunt blow (a weapon's `stun`, or a heavy mob's) rings the
  target senseless: **they lose their next swing**. One hit, one lost beat —
  no stun-chaining a thing already reeling, and the boss never reels. **PADDED**
  armor halves the odds a stun lands on you (`PADDED_STUN_MULT` = 0.5).
- **Seize / drown** — the **DROWNERS** (the-drowned, drowned-hulk, drowned-god)
  don't just hit: a landed blow can take **hold** (`SEIZE_ODDS` = 0.2). Held,
  you **can't flee**, and it hits **×1.25** (`SEIZE_DMG_MULT`). Each beat you
  get `SEIZE_BREAK_ODDS` = 0.5 to wrench loose (any action; fighting counts).
  While it has you, `SEIZE_DROWN_ODDS` = 0.10 per beat it drags you under for
  `SEIZE_DROWN_FRACTION` = 0.15 of your max hp, **unmitigated** — armor means
  nothing to black water in the lungs. **SLICK** armor halves the grip odds and
  adds +0.25 to your break chance. This is the one threat that punishes the
  turtle build: plate doesn't save you from drowning.

## Stances — `stance reckless | steady | guarded`

| stance | you deal | you take | extra |
|---|---|---|---|
| reckless | ×1.5 | ×1.5 | a true gamble — hit half again as hard, take it half again as hard |
| steady (default) | ×1.0 | ×1.0 | — |
| guarded | ×0.6 | ×0.6 | +0.10 shield block (`GUARDED_BLOCK_BONUS`); a fresh wound only half-opens (`GUARDED_WOUND_ODDS` = 0.5) |

Free to change mid-fight (it's the live tactical dial). **Persisted** on the
player row (D1 `players.stance`) — it follows the key to any device. Guarded is
the deliberate turtle: your blows lose their bite, but behind a shield you're a
hard thing to open, and wounds mostly skate off you. (Hide-under-a-guard
stacks: WARDHIDE's half-turn applies *separately* from the guarded half-turn,
down to a quarter.)

## Initiative — the ambush

`attack` (or `throw` at) a creature that has **no fight on and holds no live
grudge against you** → one immediate strike at **×1.5** (`AMBUSH_MULT`), before
the beat, before it can answer. Crit applies; fumble does not.

**The mirror is real, and it cuts both ways.** Step into a room where something
**remembers you** and it gets the jump right back: one immediate blow at
**×1.5**, before the round, before you can set your feet — no miss, no crit,
just the punch, with your armor and stance still turning what they can. The
same is true if a grudge-holder *wanders into* your room (a fleeing one won't;
it's running, not hunting). Only the first one to reach you gets the free hit;
the rest merely engage. Two mercies: **blinking back in on a reconnect** costs
no free strike, and a **REACH** weapon in your hands (spear, pike, harpoon)
holds the ambusher at length — its first strike loses the ×1.5.

## Throw — `throw <item> at <mob>`

Instant, not beat-based — but **one throw per round** (the arm owes its
follow-through), and throws roll the same **5% fumble** (+5% wounded): a wild
throw still leaves your hand, still wakes the target. Any **provisional**
carried item (sealed things refuse to be cast away). Pipeline: `1–3 + effective
item dmg` (the arm adds less than a full swing), then stance → wounded → ambush
×1.5 **or** crit (never both) → target armor. The item then lies on **this
room's floor**, theirs to stand on, yours to fetch back — **unless it shatters
on impact**: 15% base, **40% against the HOLLOW** (stone on bone and old iron),
gone for good. Rocks regrow at the gate and stair: the people's artillery, not
the people's machine gun — picking anything up mid-fight is an opening.

## Combat narrows the world

While anything is fighting you (`inCombat`):

- **Refused outright**: `carve`, `claim`, `stash`, `unstash`, `vault`,
  `publish`, `name`, `rest`, the gatehouse **bench**, and **armor** on/off.
  (Claim/stash blocking is the anti-PvP law: you can't insta-seal your pack or
  vanish into the bench the moment you're jumped.)
- **Allowed at the cost of an opening** (staggered): `eat`, `get` (you stoop
  under the swing — this is what keeps throw-recycling honest), and swapping
  or lowering your **weapon**.
- **Free**: `stance`, `go` (fleeing), `drop`, `look`, `say`, `who`,
  `inventory`, `throw` (rate-limited), `attack`.

The **command chips** follow this same law, in every room: the moment a fight
is on you, the peacetime chips stand down and only the fight offers itself —
attack, throw, stances, flee, and the opening-cost moves. Typing still works
for anything the rules allow; the chips just stop tempting you toward what
they don't.

## Mobility — armor weight

- **Weight 0 worn (or nothing)**: foes miss you +5% ("you slip aside"), and
  you flee clean.
- **Weight ≥ 1** (mail, warden's plate): full soak, but leaving a fight has a
  **40%** chance of one parting blow on the way out (armor and stance still
  apply to it; it can kill you).

## Gear

Slots — **weapon** and **armor** family (helm / body / cloak / feet / shield) —
one item each. Your first pickup of a slot auto-equips; switching is deliberate
(`equip`/`wear`/`put on`, `remove`/`take off`). Two-handed weapons
(**TWO_HANDED**: war-pike, abyssal-harpoon) refuse to share the hand with a
shield, and vice versa. Loot from kills lands in the pack un-equipped.

**Condition (0–100, per instance.)** Gear decays with use and can be **mended
at the gatehouse bench**. A **sealed** piece wears at `SEALED_WEAR_MULT` = 0.4
the normal rate — *slower, not never* (an old trap in the code refused to repair
sealed gear at all; fixed). Wear shows in the item's tags.

| wear source | rate | lifetime from fresh |
|---|---|---|
| weapon, per landed strike | 0.25 (`WEAPON_WEAR`) | ~400 swings |
| weapon, per strike on a HOLLOW target | 0.6 (`WEAPON_WEAR_HOLLOW`) | ~165 swings — bone and old iron eat an edge (~2.4× the tax) |
| armor, per blow eaten | 0.3 (`ARMOR_WEAR`) | ~330 blows |
| armor, per blow from a CORRODER | 1.5 (`CORRODE_WEAR`) | ~one worn piece over a long fight — its touch is rust, not blood |
| rust, per 2 s tick carried | 0.001 (`RUST_PER_TICK`) | ~55 h of active carry |

Effective stat = `ceil(base × condition / 100)` — a piece keeps a sliver of
use until it breaks at 0 ("it comes apart in your grip and is gone").
Inventory tags: *sound / worn / battered / failing / nearly broken*.
**Gear on the floor keeps its wear** (`groundCond` — the old "re-pickup makes
it fresh" quirk is fixed): drop, throw, or fumble a piece and it lies there
with the condition it landed with. Mob-dropped gear arrives already worn
(a corpse's kit is battered; the rare kept piece is better).

## Traits — gear that does something (045 / 046)

Beyond dmg/armor, pieces carry named properties (sets/maps in zone-data.ts,
one-line hooks in the swing). They shown in an item's tags. This is where the
counterplay to the deep's threats is sold:

| trait | on | effect |
|---|---|---|
| **reach** | quarterstaff, pitted-spear, war-pike, abyssal-harpoon, gaff-hook | negates an ambusher's ×1.5 first strike (you hold them at length) |
| **pierce N** | horsemans-pick (2), crow-beak-pick (3) | ignores N of the target's armor |
| **two-handed** | war-pike, abyssal-harpoon | no shield alongside |
| **padded** | quilted-coif, riveted-cuirass | halves stun odds against you |
| **wards wounds** | thick-hide-jack, sentinels-mantle | half-turns fresh bleed (stacks with guarded) |
| **quiet** | felt-soled-boots, grave-shroud, pale-hide-hood, shade-wrapped-greaves | halves the odds a LISTENER wakes to your movement |
| **slick** | eel-skin-cloak, kelp-woven-mail, abyssal-scale-coat | halves a drowner's grip, +0.25 to break free |
| **strapped-down** | strapped-baldric | a cutpurse finds nothing to snatch |
| **spiked N** | spiked-buckler (1), crown-guard-pavise (2) | a blocked blow deals N back on the attacker (can kill) |

The point: 045/046 sold a counter to every one of the deep's threats — wardhide
vs bleed, slick vs seize, padded vs stun, the pavise vs everything. That's why
047 added two species (verdigris-thing, marrow-cantor) hunting builds the deep
couldn't otherwise touch.

## The arsenal (a sampling — the full table is `item_templates`)

Per-swing damage shown as bare-hands body + weapon; the first-swing rule means
only the first swing gets the 2–5.

| weapon | tier | first swing | property |
|---|---|---|---|
| bare hands | — | 2–5 | — |
| loose rock | — | 3–6 | regrows at every gate & the stair; the dungeon is killable |
| rusted sword | common | 4–7 | also what skeletons swing |
| quarterstaff | common | 3–6 | reach |
| bone shiv | uncommon | ×2 swings, +bleed | fast; edge-only follow-ups |
| pitted-spear | uncommon | reach | at length |
| horsemans-pick | uncommon | pierce 2 | punches plate |
| graveblade | uncommon | 6–9 | the heavy single blow |
| notched-greatsword | rare | high single | slow, heavy |
| fleshing-knife | rare | ×2, +bleed | the bleed workhorse |
| war-pike | rare | reach, two-handed | |
| headsman-sword | epic | 8–11 | |
| kings-guard-blade | epic | +0.15 block | parry on the weapon |
| abyssal-harpoon | epic | reach, two-handed | the deep's best pole |
| widow-maker | epic | ×3, +bleed | fastest; edge-only follow-ups (the first-swing rule tamed it from ~24 to ~17 dpr) |

Armor spans helm / body / cloak / feet / shield across common→epic; the
tank ceiling is ~11 soak + a shield (weight ≥ 1, no clean flight), traded
against weight-0 kits that dodge and extract clean.

## Creatures

Same physics as players: persistent hp, armor that soaks, gear that drops,
wounds that diminish them, no encounter resets — ever. Behavior lives in
**families** (sets in zone-data.ts, logic in ai.ts):

- **LISTENERS** (skeleton, bone-knight, marrow-cantor) — blind but listening.
  Dormant with no grudge: stay still and quiet and they wander past. **Sound
  or movement wakes them** into a first strike — leaving the room, sometimes
  entering, or any fight in the room. QUIET gear halves the wake odds. The
  marrow-cantor brings ears (and the 8× bone-tax) to the King's Demesne.
- **RUNNERS** (fleet-rat) — never stand and fight; bolt the instant they can.
  Killing one is a chase, room to room, one hit each time before it's gone.
- **BROODERS** (brood-rat) — nest-bound, won't flee, won't wander, and while
  left alone births more rats into the room. Engaging stops the births;
  killing the mother stops them for good. A living source: kill it or drown.
- **THIEVES** (cutpurse, cutthroat) — fight to *grab*. First landed hit snatches
  one unsealed, unequipped item and bolts. Sealed loot and equipped gear are
  safe; STRAPPED-down kit leaves nothing to take. Kill it and the loot spills.
- **SCAVENGERS** (grave-hyena, dire-hyena) — ignore you while there are dead to
  eat; each corpse heals them and makes them bolder. Past three they stop
  fleeing and hit harder. The dire cousin *guards its meal* — walk in on a
  feeding one and it turns on you unprovoked. Clear a battlefield or feed a threat.
- **DROWNERS** (the-drowned, drowned-hulk, drowned-god) — seize and drown (above).
- **LURKERS** (pale-crawler, pale-stalker) — low armor, high bleed; glass
  cannons that open you and let the wound do the work. SLICK/WARDHIDE answer them.
- **REVENANTS** (twice-dead, thrice-dead, marrow-king) — don't die the first
  time. They rise weakened (`REVIVE_FRAC` = 0.4 hp) up to their limit (most
  once; the cairn-wight twice). Only the final fall is real.
- **CORRODERS** (verdigris-thing) — don't want your blood; their touch is rust.
  Each landed blow eats the condition of one worn piece (`CORRODE_WEAR`, never
  your weapon). The naked player shrugs; the full-epic player bleeds equity
  every beat. Sealed gear resists. An extraction monster: a bill, not a wall.
- **SENTINELS** (three-hound) — the three-headed guardian barring the descent.
  Sleeps; a blow or a step-over rouses it; deaf to lures. The only way down
  past a woken one is to put it down — or slip over the sleeping one once.
- **FEARS_FIRE** (albino-rat) — the first fire-fearing bloodline, pre-wired to
  flee a torch once the Light phase ships. Dormant for now.
- **HOLLOW** (all the bone and drowned-god and the kings) — nothing inside.
  They don't bleed (deaths leave a `remains` trace, not blood), don't hunger,
  can't be baited with food — **bait the living with food, bait the dead with
  noise**. And they eat an edge at 8× (the bone-tax).

**Grudges**: a creature remembers up to 5 attackers; fresh blood renews the
clock; walking into a room with something that remembers you = instant aggro.
A grudge ends only two ways: the creature **dies** (its replacement migrant
never knew you), or **time** (`FORGET_MS` per species, 24 h default). Your own
death buys nothing.

**Bosses** — the Forgotten King (surface throne), the marrow-king and
drowned-god (deep). They phase at ⅔ and ⅓ hp (+3 dmg each), never flee, never
forget, and hold no encounter reset. When a fresh boss migrates in, the door it
keeps **reseals** for everyone.

## Wounds, healing, death

Hp is world-state on both sides; there are no encounter resets.

- **Wounded** (< ⅓ hp, `WOUNDED_FRACTION`): blows ×0.75 and +5% fumble — you
  *and* them. A half-killed warden met an hour later is genuinely diminished.
- **Creatures** heal 1 hp/min, only out of combat (rats and scavengers also
  heal by eating). Failed boss attempts are inherited by the next challenger.
- **Players** have **60 max hp** (`PLAYER_MAX_HP`) and **no passive regen**:
  `rest` (1 hp/tick, interruptible, blocked in combat) or `eat`. Time is on the
  dungeon's side.
- **Death**: EVERYTHING carried scatters where you fall, sealed included — the
  seal is title, not armor; it cracks as it leaves your hands (mint voided),
  and the corpse run races whoever finds it first. **Only the lockbox and vault
  keep.** You wake at a **random gate**, **whole** (full hp) but emptied —
  never the gate you'd expect, so no death hands you back a route you knew cold.
  One law for every killer, world or (later) player: the gate containers
  protect; nothing else does.

## Keeping — the two containers

Both are reachable at **every gate** (keyed to your pubkey, not a place), both
gate-only and combat-blocked, both beyond death's reach. Condition is preserved
inside; stored items are unequipped.

| container | slots | takes | verbs | role |
|---|---|---|---|---|
| **lockbox** | 8 | anything (sealed or raw) | `stash` / `unstash` | the run closet — park rare loot fast, no ceremony |
| **vault** | 40 | **sealed only** | `vault` / `unvault` (`bank`, `deposit` / `withdraw`) | the bank — notarized wealth, the hoard |

The lockbox's open door is *why* the seal is no longer a safety prerequisite —
raw loot goes straight in. The vault keeps `claim` meaningful: sealing is the
toll between stuff and banked wealth, and **barter purchases arrive already
sealed** (the keeper's wares carry the gate's mark).

**The gatehouse bench.** At a gate, out of combat, one action steps you **out of
the world entirely** — untouchable, invisible to creatures and to `who`,
dropped by anything that had marked you — and lays your pack, lockbox, and vault
open together. Move items between them, `seal` unsealed loot in place, and
**mend worn gear**, all at once, with no one able to knife you mid-sort. You can
only enter out of combat (the anti-grief law), and reappear where you left.

## The deep & extraction — the membrane

The world grades downward: the surface ring, then through the **undercroft**
(hall → undercroft is free; the hound sits the throne there) to the **descent**,
which is **heart-locked**. The deep runs three tiers — the **Drowned Reach**,
the **Sunless Deep**, the **King's Demesne** — richer and deadlier as you go,
population element-graded, the abyssal coffers the best non-boss prize.

**The corpse-key** (`DEEP_DOOR_KEY` = "undercroft:down"): with the deep door
sealed, the sim surfaces a deep-dweller into the shallows. Kill it, cut the
**deep-heart**, and press the heart to the door before it rots (`HEART_FRESH_SEC`
= 600 s from the cut). A perishable, single-use key — no hoarding, no littering,
no soft-lock. That descent, and the extraction back out with sealed loot in the
vault, is the loop the whole system serves.

## Population & the threshold

- The dead stay dead; **migration** refills a type when it's below its spawn
  cap: one migrant at a time, after `respawn_secs × factor`. Factor is
  `MIGRATION_FACTOR` = 10 solo, ÷ players in zone, floored at 5. Bosses are
  exempt (always the long timer).
- **The threshold rule**: no ordinary creature ever wanders or migrates into a
  gate. You cannot be spawn-camped where you wake.
- **Hideaways** (`is_safe` rooms): cracks too tight to hunt through. No creature
  enters, not even a king; fold in and combat can't reach you. A place to catch
  your breath and `rest`, not a place to hide loot from another player.
- **A warm world never re-reads `mob_spawns`.** A saved Durable Object holds its
  creatures in memory — new spawns from a migration only land after
  `POST /admin/reseed` (wipes and re-seeds the sim from the spawn tables; D1,
  players, loot, vaults untouched). Ship a new species → reseed, or it exists
  only on paper.

## Adding to combat — the checklist

- **New weapon/armor** → a row in `item_templates` (dmg/armor/slot/speed/
  sweep/weight/stun/block/bleed) + a `ground_spawns`, `fence_stock`,
  `cache_loot`, or mob `gear_item`. A trait? add the id to its `Set`/`Map` in
  zone-data.ts (the hooks already read it). Live worlds lay new ground spawns
  down automatically, one time.
- **New creature** → `mob_templates` (incl. `armor`, `gear_item`/`gear_drop`,
  `bleed`, `stun`) + `mob_spawns`. Then decide its family: a `FORGET_MS` entry
  (else 24 h), and membership in `HOLLOW` / `LISTENERS` / `DROWNERS` /
  `SCAVENGERS` / `LURKERS` / `REVENANTS` / `CORRODERS` / `SENTINELS` /
  `FEARS_FIRE` as needed. Then **reseed** a warm world.
- **New rule** → a named constant in the zone-data.ts constants block, a line in
  parser.ts HELP_TEXT if it's player-facing, and an update **here**.

Balance is modeled in `game-server/scripts/balance-audit.mjs` — an
expected-value pass over these exact formulas. Re-run it after any tuning; if
its numbers and these disagree, one of them is a bug.
