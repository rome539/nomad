# COMBAT.md — how the dungeon fights

The one place that knows what happens when something swings. Every number
here is the number in the code; when they drift, the code wins and this file
is the bug. Sources of truth:

- **Rules & constants** — `game-server/src/zone.ts` (the constants block at
  the top, and the tick in `alarm()`).
- **Gear & creature stats** — D1 `item_templates` / `mob_templates`, seeded
  and altered by `game-server/migrations/` (001, 004, 007, 008, 011, 012).
- **The map** — 27 rooms (001, grown to four gates + a ring by 014, two hideaways by 015).
- **Behavior families** — `THIEVES` / `SCAVENGERS` / `AGGRO_SCAVENGERS` / `RUNNERS` / `BROODERS` / `LISTENERS` sets in `zone.ts`; their flesh is seeded by migrations 016–018 (the skeleton's listening is pure engine — no migration).
- **Verbs** — `game-server/src/parser.ts` (aliases, help text).

Design spine (from ROADMAP.md): *the world never moralizes, every attack is a
gamble, and power comes only from carried gear — a fresh key is a weak key,
and that weakness is the sybil resistance.*

---

## The round

Combat resolves on the zone tick, every **2 s**, only while someone is
connected (offline time is caught up by the silent simulation, which never
fights). Order inside a tick:

1. **Players swing** (the living get initiative).
2. **Creatures act** — flee if badly hurt, otherwise fight back.
3. Bodies and appetites: healing, hunger, grudge decay, wandering, rust.

Two attacks happen *outside* the tick, resolved on the spot: the **ambush**
first strike (`attack` on an unaware creature) and **`throw`**.

## Your swing

You **focus one foe** and auto-advance: the moment your target falls — or
something new is on you while you're idle — you're swinging at the next.
Never idle, but a swarm trades several-for-one against you: they all hit
back each round, you answer one at a time. Gear bends the rule:

- **speed** — swings per round (bone shiv: 2, everything else: 1).
- **sweep** — foes caught per swing (cleaver: up to 3, everything else: 1).

Damage pipeline, in exact order:

```
roll 2–5 (bare hands, PLAYER_DMG)      every living swing is the same dice
+ effective weapon dmg                  dmg × condition/100, rounded up
× stance atk (0.6 / 1.0 / 1.5)
× 0.75 if you're wounded (< ⅓ hp)
× 2 on a crit (5%)
− target's armor                        floored at 1: a blow always bites
```

**Fumble** — 5% per swing (+5% while wounded), rolled once per swing arc:

- any wielded weapon → it **flies to the floor of the room**, anyone's to
  take (including you, mid-fight — `get` is combat-legal). A sealed one
  cracks its claim (mint voided) as it lands;
- bare hands → you stumble (**staggered**).

**Staggered** (an "opening"): the next hit that lands on you costs **+2**.
Cleared when that hit lands, or when you leave the room.

## Their swing

Each creature fights its one `target` (same focus rule). Pipeline:

```
roll dmg_min–dmg_max                    from mob_templates
+ 3 × phase, boss only
× 0.75 if the creature is wounded (< ⅓ hp)
miss chance 5%  (+5% if your worn weight is 0 — quick feet)
× 2 on a crit (5%)
+ 2 if you were staggered (consumes it)
− your effective armor                  floored at 1
× stance def (0.6 / 1.0 / 1.3)          floored at 1
```

A creature below **25% hp** tries to flee each tick at **50%** odds (bosses
never flee). Fleeing clears its target; the wound and the grudge stay.

## Stances — `stance reckless | steady | guarded`

| stance | you deal | you take |
|---|---|---|
| reckless | ×1.5 | ×1.3 |
| steady (default) | ×1.0 | ×1.0 |
| guarded | ×0.6 | ×0.6 |

Free to change mid-fight (it's the live tactical dial). **Persisted** on the
player row (D1 `players.stance`) — it follows the key to any device.

## Initiative — the ambush

`attack` (or `throw` at) a creature that has **no fight on and holds no live
grudge against you** → one immediate strike at **×1.5**, before the tick,
before it can answer. Crit applies; fumble does not.

**The mirror is real, and it cuts both ways.** Step into a room where something
**remembers you** and it gets the jump right back: one immediate blow at
**×1.5**, before the round, before you can set your feet — no miss, no crit,
just the punch, with your armor and stance still turning what they can. The
same is true if a grudge-holder *wanders into* your room (a fleeing one won't;
it's running, not hunting). Only the first one to reach you gets the free hit;
the rest merely engage. One mercy: **blinking back in on a reconnect** costs no
free strike — reappearing where you logged off is not "walking in."

## Throw — `throw <item> at <mob>`

Instant, not tick-based — but **one throw per round** (2 s cooldown; the arm
owes its follow-through), and throws roll the same **5% fumble** (+5%
wounded): a wild throw still leaves your hand, still wakes the target. Any
**provisional** carried item (sealed things refuse to be cast away).
Pipeline: `1–3 + effective item dmg` (the arm adds less than a full swing),
then stance → wounded → ambush ×1.5 **or** crit (never both) → target armor.
The item then lies on **this room's floor** — theirs to stand on, yours to
fetch back — **unless it shatters on impact**: 15% base, **40% against the
hollow** (stone on bone and old iron), gone for good. Rocks regrow at the
gate and stair: the people's artillery, not the people's machine gun —
picking anything up mid-fight is an opening (see below).

## Combat narrows the world

While anything is fighting you (`inCombat`):

- **Refused outright**: `carve`, `claim`, `stash`, `unstash`, `publish`,
  `name`, `rest`, and **armor** on/off. (Claim/stash blocking is the future
  anti-PvP cheat: you can't insta-seal your pack the moment you're jumped.)
- **Allowed at the cost of an opening** (staggered): `eat`, `get` (you stoop
  under the swing — this is what keeps throw-recycling honest), and swapping
  or lowering your **weapon**.
- **Free**: `stance`, `go` (fleeing), `drop`, `look`, `say`, `who`,
  `inventory`, `throw` (rate-limited), `attack`.

The **command chips** follow this same law, in every room: the moment a fight
is on you, the peacetime chips (look, rest, say, help, inventory, the gate's
claim/stash/vault, even the standing `keys` chip) stand down, and only the
fight offers itself — attack, throw, stances, flee, and the opening-cost moves
(get a fallen weapon, eat, swap steel). Typing still works for anything the
rules allow; the chips just stop tempting you toward what they don't.

## Mobility — armor weight

- **Weight 0 worn (or nothing)**: foes miss you +5% ("you slip aside"), and
  you flee clean.
- **Weight ≥ 1** (mail, warden's plate): full soak, but leaving a fight has a
  **40%** chance of one parting blow on the way out (armor and stance still
  apply to it; it can kill you).

## Gear

Two slots — **weapon** and **armor** — one item each. Your first pickup of a
slot auto-equips; switching is deliberate (`equip`/`wear`/`put on`,
`remove`/`take off`). Loot from kills lands in the pack un-equipped.

**Condition (0–100, per instance).** Only *provisional* gear decays; a
sealed piece is frozen where it was notarized (a banked heirloom doesn't
rot). That freeze is the seal's ONLY physical perk — it stops rust, not
death.

| wear source | rate | lifetime from fresh |
|---|---|---|
| weapon, per landed strike | 0.25 | ~400 swings |
| weapon, per strike on a HOLLOW target | 2.0 | ~50 swings — bone and old iron eat an edge |
| armor, per blow eaten | 0.3 | ~330 blows |
| rust, per 2 s tick carried | 0.001 | ~55 h of active carry |

Effective stat = `ceil(base × condition / 100)` — a piece keeps a sliver of
use until it breaks at 0 ("it comes apart in your grip and is gone").
Inventory tags: *sound / worn / battered / failing / nearly broken*.
Known quirk: an item dropped/thrown/fumbled to the floor loses its condition
(floors store bare item ids); re-picked up it's fresh (100).

**The arsenal** (per-swing damage shown as bare hands + weapon):

| weapon | where | per swing | property |
|---|---|---|---|
| bare hands | — | 2–5 | — |
| loose rock | every gate & the stair, **regrows** | 3–6 | anyone can stoop; the dungeon is killable |
| rusted sword | armory | 4–7 | also what skeletons swing |
| bone shiv | shrine | 3–6 ×2 swings | double fumble rolls, double wear |
| graveblade | barracks | 6–9 | the heavy single blow |
| rust-eaten cleaver | cistern | 4–7, sweeps ≤3 | wears once per foe hit |

| armor | where | soak | weight |
|---|---|---|---|
| padded jerkin | armory | 1 | light (dodge, clean flight) |
| mail hauberk | barracks | 2 | heavy (parting blow) |
| warden's plate | pried off the warden | 3 | heavy; only enters the world worn |

## Creatures

Same physics as players: persistent hp, armor that soaks, gear that drops,
wounds that diminish them, no encounter resets — ever.

| creature | lvl | hp | dmg | armor | wields/wears (drop odds) | forgets a grudge in |
|---|---|---|---|---|---|---|
| scabby rat | 1 | 8 | 1–2 | 0 | — | 30 min |
| scary rat | 1 | 6 | — (won't fight) | 0 | rat-meat (80%) | 30 min |
| swollen brood-rat | 2 | 18 | 1–3 | 0 | rat-meat (60%) | 24 h |
| skittering cutpurse | 2 | 14 | 1–2 | 0 | — (steals, see below) | 20 min |
| rattling skeleton | 2 | 20 | 2–4 | 0 | rusted sword (35%) | 24 h |
| grave-hyena | 3 | 30 | 3–5 | 1 | bone charm (20%) | 12 h |
| dire hyena | 4 | 45 | 5–8 | 1 | bone charm (30%) | 24 h |
| hollow warden | 3 | 35 | 3–6 | 3 | warden's plate (25%) | 7 days |
| the Forgotten King | 5 | 120 | 5–9 (+3/phase) | 2 | — (Signet: 20% loot) | never |

**Creatures that do things** (the sim, not a stat block):

- **The rattling skeleton** is **blind but listening** — empty sockets, nothing
  behind them. With no grudge on you it's **dormant**: stay still and quiet and
  it wanders right past. But **sound wakes it** — trying to **leave** its room
  (~65%, it swings as you slip past), **sometimes entering** one (~30%), or any
  **fight in the room** (~80%) can make it lurch awake into a first strike. Once
  it *knows* you (a grudge), it wakes on sight like anything else. Sneaking past
  a skeleton is real now: freeze, or risk the swing.
- **The scary rat** (hall, gallery) never stands and fights — it **bolts** the
  instant it can. You swing first each round (the living get initiative), so
  your blow lands *as it breaks for the door*; then it's gone, and killing it is
  a **chase** — corner it room to room, landing one hit each time, before it
  skitters off. Dawdle and it's away clean. (It never deals damage; the whole
  fight is catching it.)
- **The brood-rat** (well, library) is the opposite of a runner: **nest-bound,
  won't flee, won't wander** — and while she lives and is **left alone** she
  keeps **birthing scabby rats** into her room (~one every 90 s, up to three at
  a time). Clear the room and ignore her and it fills right back up. She only
  breeds while *unbothered* — **engaging her stops the births**, and killing her
  stops them for good. She's a living **source**: kill the source, or drown.
- **The cutpurse** (cells, ossuary) fights to *grab*, not to kill. Its first
  landed hit **snatches one unsealed, unequipped item** off you — the richest
  it can reach — and it **bolts** that instant. Kill it and the loot spills on
  the floor where it fell (a corpse-run for your own pack); let it escape and
  it's gone. **Sealed loot is safe from it** — title the dungeon marked as
  yours, its fingers slide off. So the gate-seal now guards against *theft*,
  not only death. Equipped gear is safe too (it grabs loose loot, not your grip).
- **The grave-hyena** (catacomb, kennels) ignores you while there are **dead to
  eat**. It roams toward the **blood and remains** a fight leaves lying, and
  each corpse it eats heals it (+6) and makes it **bolder**. Past three
  corpses it turns: it **stops fleeing** and hits **×1.35**. A battlefield left
  uncleared fattens it into a real threat — the dungeon's own dead arm it.
  (It still only *aggros* by grudge, like everything else — but a fed one is a
  far worse thing to provoke.)
- **The dire hyena** (refectory, ossuary) is the grave-hyena's mean cousin —
  bigger, harder-hitting, longer-grudged, and it **guards its meal**. Walk into
  a room where it's on a corpse (or where it's eaten itself **bold**) and it
  turns on you **unprovoked, no grudge needed** — with the same first-strike a
  grudge-holder gets if you stepped in. Standing in the room when it starts
  guarding (it drags a kill in, or goes bold beside you) draws it too. It's the
  one creature that punishes *walking past* a feeding thing: give it a wide
  berth, or clear its meal from range, or pay for the intrusion.

- **Mob-dropped gear arrives worn** (condition 25–70 — "a century at its
  post"); the other rolls it's "ruined in the fall." It lands in the killer's
  pack, unclaimed.
- **Grudges**: a creature remembers up to 5 attackers; fresh blood renews the
  clock; walking into a room with something that remembers you = instant
  aggro. A grudge ends only two ways: the creature **dies** (its replacement
  migrant never knew you), or **time** (table above). Your own death buys
  nothing.
- **HOLLOW** (skeleton, warden, King): nothing inside. They don't bleed
  (deaths leave a `remains` trace, 12 h, not blood), don't hunger, and can't
  be baited with food — **bait the living with food, bait the dead with
  noise** (they still investigate sounds; `squink` is not free).
- **The King**: phases at ⅔ and ⅓ hp (+3 dmg each; phase 2 summons a rat
  from under the throne). Phases reset only at full heal ("whole again,
  seated again"). When a new King migrates in (~3 h 20 m), the black door
  **reseals** for everyone.

## Wounds, healing, death

Hp is world-state on both sides; there are no encounter resets.

- **Wounded** (< ⅓ hp): blows ×0.75 and +5% fumble — you *and* them. A
  half-killed warden met an hour later is genuinely diminished.
- **Creatures** heal 1 hp/min, only out of combat (rats also heal by eating).
  Failed boss attempts are inherited by the next challenger for up to ~2 h.
- **Players** have 40 max hp and **no passive regen**: `rest` (1 hp/tick,
  interruptible, blocked in combat) or `eat`. Time is on the dungeon's side.
- **Death**: EVERYTHING carried scatters where you fall, sealed included —
  the seal is title, not armor; it cracks as it leaves your hands (mint
  voided), and the corpse run races whoever finds it first. You wake at a
  **random gate** at **10 hp** — never the one you'd expect, so no death hands
  you back a route you already know cold. One law for every killer, world or
  (later) player: the gate containers protect; nothing else does.

## Keeping — the two containers

Both are reachable at **every gate** (they're keyed to your pubkey, not a
place), both are gate-only and combat-blocked, both are beyond death's reach.
Condition is preserved inside; stored items are unequipped.

| container | slots | takes | verbs | role |
|---|---|---|---|---|
| **lockbox** | 8 | anything (sealed or raw) | `stash` / `unstash` | the run closet — park rare loot fast, no ceremony |
| **vault** | 40 | **sealed only** | `vault` / `unvault` (`bank`, `deposit` / `withdraw`) | the bank — notarized wealth, the hoard |

`stash`/`vault` alone list a container (slot count + per-item
condition/mint). The lockbox's open door is *why* the seal is no longer a
safety prerequisite — raw loot goes straight in. The vault keeps `claim`
meaningful: sealing is the toll between stuff and banked wealth.

**The gatehouse bench.** At a gate, out of combat, one action ("open the
lockbox" chip, or the bench modal) steps you **out of the world entirely** —
untouchable, invisible to creatures and to `who`, dropped by anything that
had marked you — and lays your pack, lockbox, and vault open together. You
move items between them, and `seal` unsealed loot in place (so it can bank),
all at once, with no one able to knife you mid-sort. You can only enter it out
of combat (the same anti-grief law as sealing: no vanishing the instant you're
jumped), and you reappear where you left when you close it. The typed
`stash`/`vault`/`claim` verbs still work for terminal purists; the bench is
the click path, and it's the reason keeping no longer means clicking one item
at a time under threat.

## Population & the threshold

- The dead stay dead; **migration** refills a type when it's below its spawn
  cap: one migrant at a time, after `respawn_secs × factor`. Factor is 20
  solo, ÷ players in zone, floored at 5. The boss is exempt (always ×20).
- Solo respawns: rat 10 min · skeleton 20 min · warden 40 min · King 3 h 20 m.
- **The threshold rule**: no ordinary creature ever wanders into — or
  migrates into — **any of the four gates**. You cannot be spawn-camped where
  you wake, at any of them.
- **The map**: four gates ring the surface (north Broken Gate, east Weeper's
  Arch, south Sally Port, and the **Sewer** you climb *up* out of), each a
  drop-in and an extraction. They drain through an outer ring of chambers to
  the Long Hall at the center, and the black hatch in its floor drops to the
  King. Wardens beat the inner ring; the ring's loops are what make a chase —
  or a corpse run — a real geography, not a corridor.
- **Hideaways** (`is_safe` rooms): two cracks too tight to hunt through — one
  behind the gallery (NW), one behind the ossuary wall (SE). **No creature
  enters, not even the King**; fold in and combat can't reach you (mobs only
  strike a target in their own room, and drop it the instant you leave). Each
  is a single squeeze back to the ring — a place to catch your breath and
  `rest` uninterrupted, not a place to hide loot from another player later.

## Adding to combat — the checklist

- **New weapon/armor** → a row in `item_templates` (dmg/armor/slot/speed/
  sweep/weight) + a `ground_spawns` row or a mob's `gear_item`. Live worlds
  lay new ground spawns down automatically (no reset), one time.
- **New creature** → `mob_templates` (incl. `armor`, `gear_item`/`gear_drop`)
  + `mob_spawns`. Then decide: `FORGET_MS` entry (else 24 h default),
  `HOLLOW`? `PATROLS`? `MOVE_SOUNDS`/`HURT_STYLE`? Boss flags?
- **New rule** → a named constant in the zone.ts constants block, a line in
  parser.ts HELP_TEXT if it's player-facing, and an update **here**.
