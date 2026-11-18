# Legendaries

Every legendary has one ability nothing else in the game has. Built 2026-11-17 (migration 402, `game-server/src/legendary.ts`).

## The rule

A legendary used to be a good item with a gold name: every trait on one was also on ordinary gear. Now each one has:

1. **What it is.** The traits that are the item's shape stay on it: reach, two-handed, pierce, wall, riposte, thorns, spiked, tripping, watertight, mailward, glinting.
2. **One signature.** A `sig-*` tag on its template row that no other row carries. It pushes a mechanic the game **already has** further than any other item can. Nothing invented.
3. **The lottery.** The soft bonus traits came off: quiet, slick, padded, wardhide, strapped, staunched, fleeced, hooded, keen, wicked, weighted, balanced, tempered, greased. Instead, every legendary copy rolls the trait lottery **at least once** (ordinary gear rolls 22% of the time). A roll can be good or a flaw, so two copies of one legendary differ. A roll the signature makes pointless is never drawn (`SIG_DEAD_ROLLS`), the same way a trait the material can't carry is never drawn.

## The 29

| Item | Signature | What it does | Mechanic it pushes |
|---|---|---|---|
| Last Watch | `sig-upright` | Stun and grab resistance stays at its 75% maximum, whatever you wear | poise (`POISE_CAP`) |
| Hulk's Iron | `sig-clotting` | Your bleeds stop after 1 tick, not 3 | `BLEED_TICKS` |
| Tenor Bell | `sig-unshaken` | Never caught off balance: a fumble doesn't give the next blow on you its +2 | `STAGGER_BONUS` |
| Mirror Plate | `sig-glancing` | Nothing lands a critical hit on you | `CRIT_CHANCE` on blows against you |
| Great Shell | `sig-unparted` | No parting blow when you run from a fight | `PARTING_*` |
| Still-Water Shroud | `sig-dry-pack` | Nothing you carry rusts | `RUST_PER_TICK` |
| Long-Hunger Shroud | `sig-chill-proof` | You never catch the chill | cough.ts chill |
| Pale-Scale Mantle | `sig-hearth` | Resting anywhere heals at the fire's rate | `FIRE_REST_REGEN_PER_TICK` |
| White Roe | `sig-unstalked` | Wolves never test or follow you; cats never stalk you | ai.ts `wolfTests`, styles.ts stalk |
| The Cold Lining (new) | `sig-cold-keep` | Food in your pack spoils at half speed | food clock, as the den larder |
| Pale Tread | `sig-silent` | Walking makes no noise | movement noise roll |
| Carrier's Mile | `sig-untiring` | Walking tires you half as much | exhaustion `walk` |
| Snow Road | `sig-trackless` | You leave no footprints | `passage` traces |
| The Head Start (new) | `sig-head-start` | Chasers come through twice as late (6-12 s, not 3-6) | chase.ts `CHASE_LAG_*` |
| Marrow Crown | `sig-steady-hands` | Badly hurt never makes you clumsy: no extra fumbles, never drop your weapon | `WOUNDED_FUMBLE_BONUS`, `WOUNDED_DROP_ODDS` |
| Bounds Hood | `sig-unburdened` | You dodge as if you carried nothing | `DODGE_MAX` |
| Last Bear | `sig-bear-guard` | The guarded stance keeps 80% of your damage, not 60% | `STANCE.guarded.atk` |
| Bearded Cowl | `sig-muffled` | Your fights never draw animals from the next room | fight noise (`creatureNoise`) |
| Captain's Wall | `sig-watch-room` | Standing guard with it covers everyone in the room (50% to spoil an ambush) | `GUARD_SPOIL_ODDS` |
| Drake-Scale Shield | `sig-set-wall` | Guarded adds twice the block | `GUARDED_BLOCK_BONUS` |
| Turnpike | `sig-two-abreast` | Only 2 creatures can land blows on you a round, not 3 | `DOGPILE_CAP` |
| Attainder | `sig-attaint` | An ambush does ×2, not ×1.5 | `AMBUSH_MULT` |
| Houndsbane | `sig-killing-point` | Critical hits 10%, not 5% | `CRIT_CHANCE` |
| Hedge Bill | `sig-all-tools` | Every house-building tool, and the work in one go | den.ts `denTool`, `DEN_BUILD_WORK` |
| Long Crossing | `sig-sure-swing` | Reckless swings never miss | `RECKLESS_MISS` |
| Lash Flail | `sig-leg-taker` | Every landed blow trips (not 3 in 10) | `TRIP_ODDS` |
| Harvest | `sig-long-bleed` | Its cuts bleed 5 ticks, not 3 | `BLEED_TICKS` on creatures |
| Filed Edge | `sig-unwearing` | Never wears | `wear()` |
| Long Tooth | `sig-sure-grip` | Never fumbles | `FUMBLE_CHANCE` |

The signatures apply in fights against other players too, wherever that code has the same roll (pvp.ts).

## Where they are found

- **Anywhere (the worldwide chest pool):** the Cold Lining, the Head Start, the Still-Water Shroud, the Mirror Plate and the Pale Tread are in every chest at 0.15% a refill each. There are 34 chests outside the hamlets, so together that is about one box legendary's 5%, and no single chest can be camped for them. They left their old fixed boxes (the tide box, the abyss box, the cairn cache, the glade box).
- **The hamlets hold none**, by the 219 ruling: they are where people live.
- **Everything with a boss or a story behind it stays where it was.** The current list of sources is a query away (mob `gear_item`, `mob_keys`, `cache_loot`, `forge_recipes`).

## Adding a legendary

1. Pick a mechanic the game **already has** and check it in the code: who it applies to (players or creatures), how often it happens, and whether another item already does it. Most rejected ideas failed one of these three (below).
2. Add the tag to `SIG` and its line to `SIG_TELL` in `legendary.ts`, using the item-talking sentence plus a bracketed effect.
3. Put the tag on the item's `traits` in a migration, and the one-line check at the mechanic's site, marked `// SIGNATURE`.
4. If the signature makes a roll pointless, add it to `SIG_DEAD_ROLLS`.
5. Make the description match what the item does.
6. The regression check "every legendary has one thing nothing else has" counts the items in migration 402 and fails if a signature is unused or doubled; extend it for a new one.

## Turned down, and why

So these don't get proposed again:

- **Anything about player hunger.** Only animals get hungry.
- **Bleed stack caps.** Animals bleed you for the highest bleed, not the sum, so a player never bleeds past 3; the cap of 6 only matters for parried counter-cuts on creatures.
- **Clinging on at 1 HP.** That's dead anyway.
- **Three different "be quiet" boots/cloaks.** One silent piece (Pale Tread) is enough.
- **Extra damage "at bay".** Too unclear to read.
- **Fire-fear without fire.** It needs a real lit flame.
- **Staggering creatures.** Only players can be caught off balance.
- **Captain's Wall with no shield drag.** It felt too strong; the room guard replaced it.
- **Hedge Bill catching more foes.** The Flail and the Harvest already hit 3.
- **Carrier's Mile and pack weight.** Spare gear past 3 pieces is the only pack weight, and that wasn't the point.
- **Boots for the fen carry limit, the bad ground (scree, thin ice, beam), the entry ambush, reading tracks, or listening further.** Each was too weak, too strong, too rare, or not useful in practice.
- **Fishing, light, cooking, curing, trophies or the forge for a legendary.**

## Later work

- Not yet simulated against real play. Watch for the Turnpike (only 2 blows a round) and the Mirror Plate (no critical hits on you) being too strong in big fights.
- The Captain's Wall's guard only covers ambushes into the room, not blows from things already fighting you.
- The gate's gear sheet names a signature "its own"; `look` gives its full line, and the paperdoll lists what it does.
