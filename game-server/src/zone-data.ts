// Tuning constants, creature-behavior sets, and the flavor/bestiary text tables
// for the dungeon — lifted out of the ZoneDO monolith. Pure data; no state, no
// logic. Values and names are unchanged from when they lived in zone.ts.
import type { Stance } from "./zone-types";
import { type ItemTemplate, type Region, trait } from "./world";
// The wood's own voice (detail.ts). Spread in below rather than pasted here:
// ROOM_AMBIENCE and DARK_TOUCH must stay SINGLE tables — a lookup split across
// two files is a lookup that will drift — but 170 rooms of new prose would push
// this file past 3,700 lines, and rome's standing rule is that the spine stays
// lean. So the tables live here and the wood's contribution lives there.
import { WOOD_ROOM_AMBIENCE, WOOD_DARK } from "./detail";


export const TICK_MS = 2000;
// The world SIM (creatures, ground, meta) persists to DO-SQLite rows. Doing it
// every 2s tick writes a handful of changed rows each beat — 43,200 saves/day
// — which is what blew the free plan's rows_written cap (and burns the paid
// plan's allowance too). The sim still TICKS every 2s (creatures act on the
// beat); only the disk flush batches to this interval, so a mob that shifts
// three times in 6s writes once, not three times. Command-driven saves
// (kills, banking, loot) still persist IMMEDIATELY via z.persist(), so nothing
// a player does waits on this — only ambient creature churn does. Crash cost:
// up to this much AMBIENT world state (player inventory/vault live in D1, safe;
// volatile creature fields re-sim from savedAt on restart). (2026-07-18)
export const TICK_SIM_FLUSH_MS = 6000;
// The tick's two speeds (2026-07-18). Every setAlarm is itself a billed row
// written, so the alarm chain — not the sim — is the write floor: a 2s beat
// costs ~43,200 rows/day for as long as ANY socket stays connected. But the
// alarm only drives AMBIENT sim (wander, rot, regrow); player commands arrive
// over the socket and never wait for it. So a LIVE world beats at TICK_MS and
// a quiet one stretches to IDLE_TICK_MS (~2,880 rows/day) — "live" decided by
// worldIsHot: a fight, someone resting, an event arc, or any command inside
// HOT_WINDOW_MS. Big steps are safe: catchUp already fast-forwards a world
// that slept. A hot world waiting on a quiet-length alarm re-arms early, so
// the first swing of a fresh fight never waits on the slow beat.
export const IDLE_TICK_MS = 15_000;
export const HOT_WINDOW_MS = 60_000;
// A socket silent this long isn't a player, it's a meter running — its mere
// connection keeps the alarm chain billing. The tick puts it to sleep via the
// normal leave path (a live fight still holds the body linkdead — sleep is
// never an escape hatch), and the last socket out stops the world entirely.
export const IDLE_TIMEOUT_MS = 30 * 60_000;
// How often the tick flushes every live session's mutable state (hp, room) to
// D1, so a DO restart (a deploy, or a Cloudflare eviction) is a reconnect blip,
// not a revert. In-memory-only heals — chiefly rest — would otherwise vanish on
// the next cold start and snap a rested player back to stale HP.
export const FLUSH_INTERVAL_MS = 10_000;
// The world ticks every TICK_MS, but blows land on a slower heartbeat so a
// fight is readable: you get this long between exchanges to read the room and
// decide — change stance, choke down food, or run — before steel meets steel
// again. Everything else (regen, movement, atmosphere) stays at the tick.
export const COMBAT_ROUND_MS = 4000;
// Bare hands. Steel is carried, never granted — a fresh key is a weak key,
// and that weakness is the sybil resistance (a throwaway identity is a
// throwaway threat). The best weapon in the pack adds its dmg.
export const PLAYER_DMG_MIN = 2;
export const PLAYER_DMG_MAX = 5;
// Fat tails, the same for every living thing that swings — the world never
// moralizes, but every attack is a gamble.
export const CRIT_CHANCE = 0.05;
export const FUMBLE_CHANCE = 0.05;
// Gear condition (0-100) decays VERY slowly — wear is a background pressure, a
// battered blade is a veteran's, not a fragile toy. The gate's seal SLOWS the
// wear — it doesn't stop it. Sealed gear is protected, not immortal: it lasts
// far longer, but it still, eventually, wears through. That slow burn is the
// economy's real sink — endgame gear leaves play by degrees instead of never.
export const WEAPON_WEAR = 0.25; // per strike landed (~400 swings to wear out fresh)
export const ARMOR_WEAR = 0.3;   // per hit turned away (~330 blows)
export const SEALED_WEAR_MULT = 0.4; // sealed gear takes wear at this rate (~2.5x the life of unsealed)
// Wear was SILENT until the thing broke in your hand. Two heads-up marks give a
// player the warning: a first "showing hard wear" as condition falls past WORN,
// then an urgent "about to fail" past FAILING — each a ONE-SHOT crossing (the
// continuous decrement passes each mark exactly once), so it warns without nagging.
export const GEAR_WORN_AT = 35;    // condition (0-100) falling past this = the first notched/battered tell
export const GEAR_FAILING_AT = 12; // falling past this = the urgent last-chance tell (repair, or it's about to go)
// Armor mitigates by PERCENTAGE, not flat subtraction: a hit takes armor/(armor+K)
// off, so gear always helps but never reaches immunity (flat subtraction let a
// stacked kit floor every hit to 1). Higher K = armor weaker; lower = stronger.
export const ARMOR_K = 10;
export const RUST_PER_TICK = 0.001; // per 2s tick while carried in the damp (~55h to rust away)

// Wounds are felt, not just counted — on BOTH sides of the blade. Below a
// third of your blood, your blows soften and your hands shake; same for them.
export const WOUNDED_FRACTION = 1 / 3;
export const WOUNDED_DMG_MULT = 0.75;
export const WOUNDED_FUMBLE_BONUS = 0.05;
// Even a shaky near-death fumble mostly just goes wide — the blade only actually
// flies from your grip a FRACTION of those times. So the "lost my sword" moment
// is rare (per hurt swing: fumble ~10% × this ≈ 3%), not most low-HP swings.
export const WOUNDED_DROP_ODDS = 0.3;
// Auto-eat: when a fight drops you below this and you're carrying provisions,
// a hand goes to the pack on its own — one reflexive bite so a distracted
// wanderer doesn't bleed out mid-swing. Fires below the WOUNDED line (it's a
// last resort, not a feeding trough) and, being a reflex, never staggers you.
export const AUTO_EAT_FRACTION = 0.25;
// Initiative: the first blow against something that hasn't marked you yet
// lands heavy. (Getting jumped already costs you — this is the other edge.)
export const AMBUSH_MULT = 1.5;
// A thrown thing: its own bite plus the arm behind it, and then it's on the
// floor — theirs to stand on, yours to fetch back.
export const THROW_DMG_MIN = 1; // the arm adds less than a full swing
export const THROW_DMG_MAX = 3;
export const THROW_COOLDOWN_MS = 4000; // one throw per combat round (== COMBAT_ROUND_MS) — no rock machine-guns; was 2000, which let two throws land per round
export const THROW_SHATTER = 0.15; // a thrown thing may not survive the landing
export const THROW_SHATTER_HOLLOW = 0.4; // stone on bone or old iron, near coin-flip
// Bone and old iron eat an edge faster than flesh: landed strikes on the HOLLOW
// grind a weapon 2× the normal rate (rome's rule — wear as a counter, not
// just smaller numbers). ~200 strikes on skeletons wears a fresh blade out —
// a real bone-tax at the loot floor, not a weapon-shredder (was 8× / ~50, too
// fast: a single deep dive through the Demesne could ruin a blade; then 2.4×).
export const WEAPON_WEAR_HOLLOW = 0.5;

// THE LOAD LAW (rome, 2026-07-19 — the graduated rebuild): the heavy/light axis
// rides ONE number, loadOf = worn armor weight + loose pack-iron past
// BURDEN_FREE_IRON. Light is quick, quiet, and free to leave; heavy is none of
// those — on a SLOPE, not a cliff, so every point of load costs you. Worn MASS
// also grants poise (below). Total worn kit runs ~0 (naked) to ~7 (full plate +
// maul + wall shield), so the curves are calibrated to that range.
// Calibrated to the REAL worn range under the WEIGHT LAW (mig 096; the armor
// tiers stay INTACT — light is a low-ARMOR choice, not a cut). A minimal LIGHT
// build ≈ armor 5 / weight 2 (fragile, slippery), a MEDIUM build ≈ armor 8 /
// weight ~6, a full HEAVY build ≈ armor 12 / weight 11-13 (tanky, loud, trapped),
// naked 0. So the curves span load 0..13. Armor costs weight — you armor up by
// paying mobility, and a genuinely light kit stays squishy (rome, 2026-07-19).
export const DODGE_MAX = 0.15;        // quick-foot bonus to a foe's miss at zero load (naked ≈ this + FUMBLE_CHANCE 5% ≈ 20%; a light build ~2 ≈ 17%)...
export const DODGE_ZERO_AT = 13;      // ...falling linearly to nothing at the maximal heavy load (base 5% only in full plate)
export const NOISE_FLOOR = 0.06;      // even bare feet knock a stone loose now and then — naked is rare-but-not-silent, not dead quiet
export const NOISE_PER_WEIGHT = 0.06; // ...plus this per point of load: a room-change leaks sound to the neighbors AND rouses the room (0.06 + 13×0.06 ≈ cap)
export const NOISE_CAP = 0.85;
// At or above this load your kit is the thing making the racket — the mover hears
// their own noise ("your armor rings on the stone") and a woken sleeper blames
// the armor, not just "the sound of you" (rome, 2026-07-19: the noise the load
// law makes should be legible from the INSIDE, not only to the neighbors).
// ~6 is medium-and-up (light ≈3 stays quiet-flavored); the noise ROLL is separate.
export const NOISY_LOAD = 6;
export const LOUD_SELF_COOLDOWN_MS = 15_000; // ...but tell the noisemaker at most this often, so continuous marching isn't a line every step
export const PARTING_PER_WEIGHT = 0.06; // odds/point-of-load the fight bills you one blow as you flee it (13×0.06 ≈ cap)
export const PARTING_CAP = 0.80;
export const ENTRY_STEALTH_MIN = 0.25;  // the lightest tread still wakes a sleeper this fraction of the full WAKE_ENTER roll
// POISE: worn MASS keeps your feet — it reduces the odds a control effect (stun
// / hobble / seize) lands, scaling with WORN weight ONLY (a heavy pack doesn't
// plant you). Combined with the resist traits (PADDED stun / WARDHIDE hobble /
// SLICK seize) STRONGEST-WINS, never stacked — so heavy gets broad poise from
// mass, while a LIGHT build buys back a specific resist by slotting its trait.
export const POISE_PER_WEIGHT = 0.12; // CC-resist fraction per point of worn weight...
export const POISE_CAP = 0.75;        // ...capped here — never full immunity
// The pack's iron is the OTHER half of the load. Loose gear past BURDEN_FREE_IRON
// counts into loadOf (dodge/noise/parting all feel it); `drop` is the valve —
// shed the iron mid-chase and you're the naked sprinter again. Your life or your
// haul: nobody gets to be rich, armed, AND silent.
export const BURDEN_FREE_IRON = 3;  // loose gear pieces the pack carries quiet before it counts as load

// Fighting stance: trade offense for defense. `atk` scales the damage you deal,
// `def` scales the damage you take (after armor). Reckless is a glass edge;
// guarded is a turtle; steady is even. A moment-to-moment choice (`stance`).
export const STANCE: Record<Stance, { atk: number; def: number }> = {
  reckless: { atk: 1.5, def: 1.5 }, // a true gamble: hit half again as hard — and take it half again as hard
  steady: { atk: 1.0, def: 1.0 },
  guarded: { atk: 0.6, def: 0.6 }, // soak far less, but your blows lose their bite
};
// Reckless swings are all shoulder and no aim: a slice of them sail wide, on
// top of the ordinary fumble — a clean whiff (you keep your grip) that still
// leaves you open. The tax that keeps the 1.5x stance an honest gamble rather
// than a free upgrade (rome, 2026-07-12). Steady/guarded never whiff for this.
export const RECKLESS_MISS = 0.10;
// The wall-class shields: real fortifications, not bucklers. Behind one you
// fight AROUND the thing you carry — every blow you deal loses a share of its
// weight (rome, 2026-07-12: the shield was the one defense with no offense
// tax; guarded pays 0.6x, plain shield-holding paid nothing). Data-simple,
// told at equip and on the item read; bucklers and the parrying dagger stay
// free so the light skirmisher remains a real archetype.
// `wall` (trait tag, 098): the wall-class shield identity — the label and the
// equip note; the offense tax itself is proportional to block (wallDrag).
// Block and offense are one dial: a shield costs your swing in proportion to how
// much it guards, so a bigger guard is always "how much offense will I trade?"
// rather than a free upgrade (rome, 2026-07-19). A buckler's-worth of block is
// FREE (SHIELD_DRAG_FREE) — a light guard doesn't slow your arm; every point of
// block ABOVE that drags SHIELD_DRAG_PER_BLOCK of your damage. Tuned so the walls
// land at ~0.85 (30% block -> (0.30-0.10)*0.75 = 0.15 drag), exactly where the
// old flat SHIELD_WALL_DRAG cliff sat — but now smooth from the buckler up.
// Off the shield's OWN block (not stance/condition): the guarded stance already
// pays offense through STANCE.atk, so it adds block without a second tax.
export const SHIELD_DRAG_FREE = 0.10;      // block up to a buckler's guard costs no offense
export const SHIELD_DRAG_PER_BLOCK = 0.75; // damage lost per point of block above the free floor
// Guarded is more than the number — you fight behind your shield. Behind a
// raised shield it blocks a shade more, and claws that would open a wound
// (armor-ignoring bleed) only get through half the time. The skill answer to
// the bleed mobs; wasted on things that don't cut (know your bestiary).
export const GUARDED_BLOCK_BONUS = 0.10; // added to shield block while guarded
export const GUARDED_WOUND_ODDS = 0.5;   // odds a fresh wound still opens through your guard
export const STAGGER_BONUS = 2; // an opening costs you
// Carry space is measured in SLOTS. Fungibles (trophies, food, scrap, keys,
// cigarettes) stack: a whole pile of rat-tails is one slot. Gear, sealed items,
// journals, and maps are each their own slot. So the pack limits distinct kit
// you haul, not how many trophies you hoard.
export const PACK_CAP = 20;
// Food free-stacks (a whole kind is one slot, however deep), which turned the
// pack into an unlimited healing pump you could carry into any fight. A hard
// ceiling on TOTAL rations carried — any mix of kinds — makes healing a supply
// decision again: you ration, or you run back to bank and restock (rome,
// 2026-07-14). Not a slot cost (food still rides light); a count, on its own.
export const PACK_FOOD_CAP = 8;
// Torches free-stack the same way (a whole pile is one slot), and they're a
// REGROWING floor forage at every gate threshold — so you could stand at the
// arch and pick up torch after torch as they respawn, hoarding bottomless light
// in one slot. That guts the torch's whole point: it's the run's clock (mig
// 057, ~10 min a burn, "long enough if you do not linger"). A hard ceiling on
// spare torches carried makes the dark a supply decision again — you stock a
// reserve, you don't erase the night (rome, 2026-07-16). Count, not a slot.
export const PACK_TORCH_CAP = 5;
// Dressings free-stack the same way — a whole kind of bandages is one slot,
// however deep — so a run could carry a bottomless supply of bleed-clots and
// hp-staunch and never fear a wound. Same cure as food and torches: a hard
// ceiling on TOTAL dressings carried (any mix — linen-dressing, linen-strips,
// bloodwort), so surviving the deep's bleeds is a supply decision, not a given
// (rome, 2026-07-18). Count, not a slot. grave-moss doubles as food, so it
// rides the FOOD cap instead — no double jeopardy (dressingCapped skips edibles).
export const PACK_DRESSING_CAP = 6;

// ---------------------------------------------------------------------------
// THE KEEPER LOOKS UP (rome, 2026-08-06: "the gatehouse literally feels like a
// tavern, when new people join in" -> "that the keeper reacts to arrivals ...
// but make it soft").
//
// He already tells the region's story while he works — at the room, never to
// you — which is most of why the place reads as a tavern: there is always
// something being said, so a newcomer walks into a conversation already going
// rather than into silence. What he could not do was NOTICE anybody. He was on
// a timer and the door might as well not have opened.
//
// SOFT MEANS SOFT, and every part of this is built to stay under the line:
//   - he never addresses you. No welcome, no name, no "traveller". He is a man
//     behind a hatch who happened to glance at the door, and the room sees it.
//   - not every arrival: KEEPER_NOD_ODDS, so walking in is usually nothing.
//   - and never twice in a hurry: KEEPER_NOD_EVERY_MS across the WHOLE room, so
//     four people coming in off a bad run do not turn him into a performance.
//   - the lines are gestures, not speech. A cup moved. A glance. Going back to
//     what he was doing, which is the point: you are not an event.
export const KEEPER_NOD_ODDS = 0.4;
export const KEEPER_NOD_EVERY_MS = 90_000;
// When somebody comes in and he is the only one there to see it.
export const KEEPER_NODS = [
  "The keeper looks up, marks who it is, and goes back to the tankard he was drying.",
  "The keeper's eyes come up to the door and down again. The rag does not stop moving.",
  "Behind the hatch the keeper shifts a cup along the counter an inch, as if that had been the plan all along.",
  "The keeper glances over, says nothing, and sets a second cup out where it can be reached.",
  "The keeper takes the weight off one elbow, looks, and puts it back.",
];
// ...and when there are already people in here. He is a barman: the door is
// worth a look, and the room he is in is worth more.
export const KEEPER_NODS_BUSY = [
  "The keeper glances at the door, then back at the room, and lets whatever was being said go on being said.",
  "The keeper looks up from the hatch, counts the room without seeming to, and goes back to it.",
  "Somewhere behind the counter the keeper knocks the ash out of something and does not look up for long.",
];

// ---------------------------------------------------------------------------
// THE FEN CARRIES YOU, NOT YOUR GOODS (rome, 2026-08-06: "you made it into a
// complete shortcut of the roaad" — measured, and he is right).
//
// WHAT WAS WRONG. From the fortress gate: the Osier Beds are 8 rooms through the
// fen and 44 by road. The Willow Margin 11 against 41. The Far Waste 11 against
// 44. An eighteen-room bog was not a shortcut past the road's throat, it DELETED
// the road — both milestones, the carrier, the ford, the whole 68-room spine
// reduced to optional scenery. And the den price (12 iron + 20 scrap, carried
// out there) rests entirely on that walk being long.
//
// WHY NOT JUST SHUT ITS FORTRESS DOORS. Measured too, and it is the wrong fix:
//   rooms needed to cut the fortress off from the den ground
//     road + fen, as it stands ....................  4
//     fen deleted entirely ........................  1
//     fen kept, its three fortress-end rooms cut ..  1
// The fen is load-bearing. It is the only reason the west is not hanging off the
// keep by a single room — the exact defect it was built to fix. Close it and one
// person standing in one room seals half the world off again.
//
// SO IT COSTS SOMETHING OTHER THAN LENGTH: you cannot carry through a bog.
//
// AND IT MUST BE COUNTED IN RAW ITEMS, which took two wrong answers to find:
//   loadOf ... skips anything with no equip slot, so 12 iron + 20 scrap weighs 0
//   slots .... collapse stackables to one per kind, so that haul is 2, food free
// Raw items is the only measure that can see cargo at all: that haul is 32.
//
// EXCEPT WHAT KEEPS YOU ALIVE. The pack caps are 8 food, 5 torches, 6 dressings —
// a properly provisioned runner carries 19 consumables before any gear, and
// stopping a hunter with a full kit is not stopping cargo. So rations, torches
// and dressings are free of this count, and the rule reads as one sentence a
// player never needs told twice: THE FEN CARRIES YOU AND WHAT KEEPS YOU ALIVE.
// IT DOES NOT CARRY GOODS.
export const FEN_CARRY_CAP = 6;
// Every room of the three ways across. The gate is on ENTERING any of them, so
// it fires at the fortress doors, at both landfalls, and at every rung between —
// there is no way to be halfway across with a haul, and no direction of travel
// is privileged: goods do not move west through here and they do not move east.
export const FEN_ROOMS = new Set<string>([
  // the Sally Way
  "the-ditch-end", "the-fen-edge", "the-sinking-path", "the-drowned-hurdles",
  "the-tussock-ford", "the-willow-landing",
  // the Black Way
  "the-fen-gut", "the-peat-road", "the-peat-cuts", "the-open-water",
  "the-dead-alders", "the-rush-shore", "the-eel-traps", "the-waste-foot",
  // the Grave Path
  "the-grave-drain", "the-quaking-flat", "the-heron-stand", "the-osier-landing",
]);
export const FLOOR_ITEMS_BRIEF = 3; // walking in, a floor with more loose loot than this condenses to a count — you 'look' to see it all (rome, 2026-07-20)
export const LOCKBOX_CAP = 8; // the run closet — small, takes anything, sealed or raw
export const FOOD_LOCKBOX_STACK = 8; // rations stack in the run closet: a kind rides ONE slot this deep, then spills to a second (rome, 2026-07-20)
export const VAULT_CAP = 50; // the bank — deep, generous, sealed wealth only
// Not every forced box pays out. Now and then the lock gives on nothing —
// picked clean before you got there, or never worth the key. Uncommon enough
// that a haul still feels earned, common enough to sting when a key buys air.
// (The reliquary is spared it — see cmdUnlock: a boss-and-black-key box that
// duds is cruelty, not mischief.)
export const CACHE_EMPTY_ODDS = 0.15;
// A WORD OF THE BOXES (086): the keeper's rumor good. Bought like any stock,
// but delivered as SPEECH — he names the room where a roaming strongbox sits
// right now, and nothing enters the pack. The roam was the chests' best trick
// and their most invisible one; the word makes it legible, for a price.
export const BOX_WORD = "box-word";
// A sentinel chip: the client intercepts it and opens the keeping modal
// (pack + lockbox, plus vault & seal at a gate) instead of sending it as a
// command (see renderChips). It rides on the 'inventory' chip — tapping opens
// the modal, while TYPING 'inventory' still prints the plain text list.
export const BENCH_CHIP = "inventory";
// The same sentinel for a den's shelf: tapping 'stow' opens that keeping modal
// with the shelf as a fourth column; typing 'stow <item>' still moves one thing
// by name (rome, 2026-08-04). The shelf was the last store in the game you could
// only reach by typing, and it is the biggest one.
export const DEN_CHIP = "stow";
// WHAT A DEN COSTS TO RAISE (mig 172, repriced 2026-08-04: rome, "even that
// seems a bit cheap"). The room is a site, not a seat — anybody may build on it,
// and the ground never runs out — so this price is the ONLY thing rationing
// homes in the entire game. It has to read as an expedition, not an errand.
//
// THE SCALE IT IS PRICED AGAINST, because the number is meaningless without it:
// salvage yields 1/2/4/8 scrap by rarity, smelt is 5 scrap to the iron bar, the
// dearest thing the forge can make is 6 scrap, and a repair is 1 to 3. So the
// whole economy is denominated in scrap, and a den is worth stating that way:
//
//   the first cut ... 4 iron + 10 scrap  =  30 scrap   (five forge recipes)
//   NOW ............ 12 iron + 20 scrap  =  80 scrap
//   the bar, after .. 2 iron +  3 scrap  =  13 scrap
//
// 80 scrap is 80 common pieces rendered down, or 40 uncommon, or 20 rare, or 10
// epic. That is a real haul, and — this is the point of the number — it competes
// directly with keeping your OWN kit repaired and forged, out of the same pile.
// A home should cost you a run you would otherwise have spent on yourself.
//
// IRON CARRIES MOST OF IT ON PURPOSE. Iron only exists by melting five scrap, so
// it is the one material you cannot pick up off a floor: 12 bars is sixty scrap
// that went through a gate's fire, which is a walk, a bench and a decision.
export const DEN_RAISE_IRON = 12;
export const DEN_RAISE_SCRAP = 20;
// Same trick for the keeper's hatch: the client opens the trade modal instead
// of sending it as text. (Typed 'barter'/'buy'/'offer' still work bare.)
export const TRADE_CHIP = "barter with the keeper";
// And the forge: the 'forge' chip opens the forge modal (reads your pack, shows
// what the bench can make and what you can afford). Typed 'forge' still reads
// the slate / works one recipe by name.
export const FORGE_CHIP = "forge";
// The bench's other trades (gate only): the vice breaks gear into scrap iron,
// scrap mends wear, and the recipe book (forge_recipes) turns scrap back into
// steel. Yields and mend costs scale with rarity; epics are found, never made.
export const SCRAP_ID = "scrap-iron";
// The two-tier forge stock (roadmap "Forge & smelt economy"): salvage gives the
// small unit (scrap); 'smelt' casts SMELT_SCRAP_PER_IRON scrap into one IRON bar;
// the forge cuts its recipes in iron (repair still spends scrap — small mends).
export const IRON_ID = "iron";
export const SMELT_SCRAP_PER_IRON = 5;
// The renewable rusted pick would be an iron FAUCET once iron is scarce (take →
// salvage → wait → repeat), so the vice makes nothing of it — the iron in it is
// more rust than metal (roadmap: the scrap-faucet lever).
export const NO_SALVAGE = new Set(["rusted-pick"]);
// Knowledge as loot (see migration 029). Read by id, like the scrap above.
export const DETAILED_MAP = "surveyor-map";
export const CRUDE_MAP = "crude-map";
export const MAP_ITEMS = new Set([DETAILED_MAP, CRUDE_MAP]);
export const JOURNAL_ITEM = "hunters-journal";
// Fishing: only off the dry shelf of the Pocket of Air, dropping a line into
// the flood below (where the water — and what swims in it — can't reach you).
// A cast rarely lands anything; the catch is mostly the blind cave-fish, now
// and then the rarer, richer pale eel. Patience, not a button to mash.
// The waters split by depth (067): SURFACE water is open-sky and easy company
// (the fen, the drowned orchard) — mostly cave-fish, and the RAIN wakes it
// (the bite doubles under a downpour; the fen is the storm-angler's spot).
// DEEP floodwater is where the good eating swims: eel odds up, and rarely the
// marrow-lamprey, the deep's delicacy. Any water can also snag JUNK off the
// bottom — the flood keeps a little scrap for the patient.
// The flooded quarry only — deep still water with a working face going down out
// of sight. The ford is shin-deep over gravel: you can drink it and wade it, but
// there is nothing in it to catch.
export const FISHING_SURFACE = new Set(["the-black-fen", "the-drowned-orchard", "the-flooded-quarry"]);
export const FISHING_DEEP = new Set(["pocket-of-air", "the-weir", "black-canal", "leech-pools", "the-sump", "the-cistern",
  "the-eel-run", "the-breathing-hall"]); // the Tideways' waters (069) — the tide restocks them when it drains
export const FISHING_ROOMS = new Set([...FISHING_SURFACE, ...FISHING_DEEP]);
export const FISH_ODDS = 0.18;         // a cast catches SOMETHING less than one time in five
export const RAIN_BITE_MULT = 2;       // under open rain the surface waters wake
export const PALE_EEL_ODDS = 0.2;      // of DEEP catches, a fifth are the eel...
export const LAMPREY_ODDS = 0.08;      // ...and fewer still the lamprey (rolled first)
export const EEL_SURFACE_ODDS = 0.07;  // surface water almost never gives up an eel
export const JUNK_SNAG_ODDS = 0.05;    // of MISSES, one in twenty drags up scrap instead (a bonus, never a wage)
export const FISH_COOLDOWN_MS = 6000;  // each cast is a deliberate wait
// POOLS FISH OUT (rome-approved, 2026-07-11 — the answer to the fen being a
// money pump): each water holds a few catches, then goes quiet while it
// forgets you. A meal on the way through is untouched; camping a pool caps at
// a handful an hour. A junk snag spends from the same budget. Rain refreshes
// the SURFACE pools when it opens (the storm-angler's moment stays real).
export const FISH_POOL_CATCHES = 5;
export const FISH_POOL_REST_MS = 25 * 60_000;
// How much a crude map lies: how much of the map it omits, and how many of the
// exits it does show are wrong (dropped or pointing at the wrong room). No two
// copyists worked alike — each copy rolls a hand (rome, 2026-07-13: RNG decides
// the map's condition) that slides both rates between these rails. A careful
// hand omits little; a drunk one hands you noise. Averages sit near the old
// flat 0.30 / 0.15.
export const CRUDE_DROP_MIN = 0.10;   // best hand: ~10% of rooms missing
export const CRUDE_DROP_MAX = 0.50;   // worst hand: half the keep isn't on it
export const CRUDE_BAD_MIN = 0.05;    // best hand: ~5% of shown exits lie
export const CRUDE_BAD_MAX = 0.25;    // worst hand: a quarter walk you wrong
export const SALVAGE_YIELD: Record<string, number> = { common: 1, uncommon: 2, rare: 4, epic: 8 };
export const REPAIR_COST: Record<string, number> = { common: 1, uncommon: 1, rare: 2, epic: 3 };
// The gate keeper deals in kind: barter value ≥ this and his manner changes.
// What clears the bar is never written down anywhere a player can read.
export const RICH_TENDER = 15;
// The hard currency wears many faces (mig 089): a kept tin, a crushed pack off a
// dead soldier, a twist of hand-rolled leaf from the deep. All worth the same
// (barter 20 — rich tender), all smokeable, and NONE of it ever named as money
// in-world. Pure flavor: what you loot tells you who you took it from. Value and
// the tender bar are barter-driven, so this set only gates the 'smoke' deed.
export const CIGARETTES = new Set(["dry-cigarettes", "crushed-pack", "hand-rolled-smokes"]);
// Canonical compass order for direction chips, so they never shuffle room to room.
export const DIR_ORDER: Record<string, number> = { north: 0, south: 1, east: 2, west: 3, up: 4, down: 5 };
export const RATE_CAPACITY = 6; // command tokens
export const RATE_REFILL_PER_SEC = 2;

// Body: wounds close only deliberately — resting, or the shelter of a
// gatehouse (bench or hatch open at a gate: out of the world, mending).
// Death wakes you whole: the price of dying is everything you carried,
// not a hobbled morning.
export const REST_REGEN_PER_TICK = 1;
// Two kinds of rest (rome, 2026-07-16). The DUNGEON rest is the one above:
// cold stone, one eye open, REST_REGEN_PER_TICK — and anything ends it. The
// FIRE rest is a deliberate doze INSIDE the gatehouse (typed 'rest' by the
// fire): warm, truly safe, and wounds close at double time. Standing shelter
// (bench/hatch open at a gate, not dozing) stays the slow rate — the fire
// rewards actually settling in, not just being indoors.
export const FIRE_REST_REGEN_PER_TICK = 2;

// Simulation clocks.
export const SIM_STEP_MS = 60_000; // catch-up granularity
export const CATCHUP_CAP_MS = 14 * 24 * 3_600_000;
// THE BUBBLE (rome, 2026-07-19): the full per-beat simulation runs only within
// this many rooms of someone's boots. Noise carries 1 room and nothing moves
// more than 1 room per beat, so radius 2 is the interaction range plus one beat
// of lookahead — measured on the real graph it keeps ~7% of the world hot per
// player instead of all of it, and (because persist writes only the dirt) the
// frozen rest costs no rows either. Everything outside the bubbles lives on the
// slow clock below. Set to Infinity to restore the old whole-world tick — that
// is the rollback switch, no code change needed.
export const SIM_RADIUS = 2;
// The far world's own heartbeat: every this-often, everything OUTSIDE the
// bubbles advances by the real elapsed time — hunger, healing, eating, brood
// births, predation, a wander step. Same quiet-life model as the offline
// catch-up, so "unobserved" behaves identically whether the whole world is
// empty or just that corner of it. Creatures entering a bubble are therefore
// at most this stale — imperceptible, and no per-creature bookkeeping needed.
export const SLOW_ECOLOGY_MS = 30_000;
export const CREATURE_HEAL_PER_MIN = 1;
// 0..100, counted in REAL wall-clock minutes (the tick advances it by elapsed,
// not by beats). Was 2 (rome, 2026-07-31: "restless in 25 mins seems too
// fast") — at that rate a creature went from fed to PINNED AT MAX in 50
// minutes, and only vermin (foraging) and scavengers (corpses) have a supply
// quick enough to keep up. Everything else — crawlers, the pale hunters,
// anything between meals — simply sat at 100 forever, so "restless with
// hunger" stopped being a signal and became background noise on half the room.
// At 0.5 the arc is hours, not minutes: restless ~1h40m, starving ~2h50m,
// pinned ~3h20m. Hunger is a state a creature passes through again, which is
// what makes the tell worth reading — and predation, thief-robbing and the
// starving-hunt go back to being occasional events rather than the default.
// Spawn hunger is deliberately untouched: some things arriving hungry is good.
export const HUNGER_PER_MIN = 0.5;
export const HUNGER_MAX = 100;
export const HUNGRY_AT = 50;

// THE GAMESTR LEADERBOARDS (kind 30762, dungeon-signed = "verified"). Published
// ONLY on the player's say-so (`publish score`) — the same opt-in law as the
// sheet. Two boards: `trophies` = the barter value of every trophy held (pack +
// lockbox + vault), `legend` = lifetime combat prestige (boss/pvp kills + kills).
// Weights and genres are data; tune freely.
export const LB_GENRES = ["mud", "extraction", "roguelike", "pvp", "dungeon-crawler"];
export const LB_BOSS_PTS = 100;
export const LB_PVP_PTS = 25;
export const STARVING_AT = 85; // past mere hunger: the end of the rope, where a predator with no easier meal eyes a lone delver as meat
export const WANDER_MIN_MS = 45_000;
export const WANDER_MAX_MS = 150_000;
export const FLEE_BELOW = 0.18; // flesh runs only when nearly done (was 0.25 — everything bolted early)
export const FLEE_CHANCE = 0.2; // per round once below the threshold (was 0.5)
// FEARS_FIRE, but as nerve rather than a wall (rome, 2026-08-03: "the woods
// mobs are running away too much when a person has fire, it should be a chance
// they run away during the rounds"). It was absolute: a fire-fearing thing broke
// on the first round it could see a flame, every time, which made a torch a
// no-fight button over 63 of the wood's 87 bodies. Now it is a roll each round,
// the same shape as FLEE_CHANCE — a wolf still means to have you, and the fire
// is what keeps talking it out of it. 0.35 averages a break around the third
// round: long enough to be a fight, short enough that the flame is why you won.
export const FIRE_FLEE_CHANCE = 0.35;
export const MIGRATION_FACTOR = 10; // respawn_secs * this = how long an EMPTY/solo zone takes to refill (was 20; halved so leaner rooms don't feel dead)
// A busy dungeon refills faster: more wanderers, more blood and disturbance,
// more drawn up from the dark. The effective factor is divided by the number
// of players in the zone (solo = unchanged), down to a floor so even a crowd
// keeps some scarcity. Bosses are exempt — the King reforms on its own clock.
export const MIGRATION_MIN_FACTOR = 5;
// Regrowing ground spawns (rocks, provisions, the rusted pick) come back after
// a RANDOM delay in this window, not a fixed metronome — so the world doesn't
// tick out a predictable stream you can stand and farm. 5–25 min, mean ~15.
export const REGROW_MIN_MS = 5 * 60_000;
export const REGROW_MAX_MS = 25 * 60_000;
// THE FLOOR-RENEWAL LAW (rome, 2026-07-12): consumables and the starter
// loose-rock keep the deterministic clocks — the world stays livable, and a
// fresh key is never weaponless or lightless. Renewable floor GEAR is DICE:
// when its check comes up the world ROLLS whether to cough one back, and a
// miss just leaves the spot bare until the next roll. "Sometimes there" is
// literally dice — never a take-wait-take faucet you can farm by the clock.
// (The rusted pick rides this now; the armor pass's guardroom kit will too.)
export const GEAR_ROLL_MIN_MS = 30 * 60_000; // a bare spot re-checks itself every 30–60 min
export const GEAR_ROLL_MAX_MS = 60 * 60_000;
export const GEAR_REGROW_ODDS = 0.2;         // ~1 roll in 5 hangs the piece back up
export const RELIABLE_GEAR = new Set(["loose-rock"]); // the starter tool: exempt, always comes back
// ...but "always comes back" at the GATE has no drain out in the world: a rock
// carried off and left where you die (or dropped in a room that doesn't grow
// them) is net-new — the gate refills behind it, and a rock isn't edible, so
// nothing ever rots it off the floor. The world silted up with free artillery
// in every room a body fell (rome, 2026-07-14). A stray rock on a NON-gate
// floor now crumbles back to rubble on this window; the gate supply is untouched.
export const ROCK_CRUMBLE_MIN_MS = 20 * 60_000; // 20–40 min, dice-jittered so it's no metronome
export const ROCK_CRUMBLE_MAX_MS = 40 * 60_000;
// A torch left lying OFF its spawn floors goes the same way (rome, 2026-07-16):
// the dungeon is wet stone, and pitch left in the damp drinks it — rag and
// sludge inside the hour. Same law as the rock (dropped/thrown/spilled copies
// only; the regrowing threshold torches are the world's own and never spoil),
// so torch litter can't carpet the halls into a free light network.
export const TORCH_SODDEN_MIN_MS = 30 * 60_000; // 30–60 min, jittered
export const TORCH_SODDEN_MAX_MS = 60 * 60_000;
// The growing physics — cut bloodwort, torn linen — dry out and molder just as
// fast off their damp spawn floors (rome, 2026-07-17: "every consumable that
// grows should decay like the rock and torch"). Same law, same reason: the
// renewable supply can't be hauled off and stockpiled into a free apothecary.
export const WILT_MIN_MS = 20 * 60_000; // 20–40 min, jittered
export const WILT_MAX_MS = 40 * 60_000;
// The one table for it all: every GROWING consumable, mapped to how it spoils
// once it's off its own regrow floor. Add a growing consumable here and the
// stray law covers it automatically — no new hand-wiring. Food is deliberately
// NOT here: it has its own slower rot+scraps clock (ROT_MS) that lures scavengers.
export const STRAY_DECAY: Record<string, { kind: "crumble" | "sodden" | "wilt"; min: number; max: number }> = {
  "torch":        { kind: "sodden",  min: TORCH_SODDEN_MIN_MS,  max: TORCH_SODDEN_MAX_MS }, // = TORCH_ITEM (declared later in this file)
  "loose-rock":   { kind: "crumble", min: ROCK_CRUMBLE_MIN_MS,  max: ROCK_CRUMBLE_MAX_MS },
  "bloodwort":    { kind: "wilt",    min: WILT_MIN_MS,          max: WILT_MAX_MS },
  "linen-strips": { kind: "wilt",    min: WILT_MIN_MS,          max: WILT_MAX_MS },
};
// The two kinds of renewable (rome, 2026-07-11 — the larder was a healing
// pump): living forage (moss, lichen, nettle, caps, water) GROWS, and keeps
// the fast clock above. DEAD STOCK — cured provisions nobody is curing
// anymore — trickles back on the slow clock: what you find is what a long
// age left behind, and a picked-clean shelf stays picked most of a session.
// Offal is carrion, not provisions: in carrion country (things keep dying
// there) it keeps the fast clock; on a pantry hook it's dead stock too.
export const DEAD_STOCK = new Set(["smoked-haunch", "salt-fish", "hardtack", "offal"]);
// Thrown things that survive any landing: the hammerstone (070) never
// shatters — you walk over and pick your argument back up. Its spawns come
// back roughly twice a DAY (rome's tune): rarer than provisions.
export const THROW_TOUGH = new Set(["hammerstone"]);
// Where a hammerstone can turn up (rome: no fixed spots — "people just run to
// the same spots"): the world ROLLS for one on the STONE_ROLL cadence (the
// floor-renewal law — dice, not a mint schedule) into a random one of these —
// stone country: graves, scree, rubble, mine-throats, and the tide's midden.
// Cadence × odds keeps rome's original tune (~twice a day), but any given
// roll can hit — there is no clock to farm. Capped so misses don't pile up.
export const HAMMERSTONE_HAUNTS = [
  "the-mass-grave", "the-dry-moat", "the-gatefall", "the-wall-breach",
  "the-burned-village", "the-undermine", "the-earth-throat", "the-bone-midden",
  "blackreach", "the-sump", "the-still-cradle",
];
export const STONE_GROUND_CAP = 2; // at most this many lying loose in the haunts at once
// A rock against a latch (rome, 2026-07-11): strongbox latches give to stone,
// sometimes. The plain rock is spent by the trying, opened or not; the
// hammerstone survives and near-always wins. Either way the hammering is a
// dinner bell — every listener in earshot hears iron being beaten. The
// reliquary is exempt: a king's lock takes a king's key, not geology.
export const ROCK_SMASH_ODDS = 0.10;
export const HAMMERSTONE_SMASH_ODDS = 0.80;
export const STONE_WEAR = 20; // condition per smash attempt: ~5 latches in a stone, then it cracks through — and NO mend refills it (rome: "no repairs for this rock")
// THE GATEHOUSE CLOSES FOR WORKS (works.ts). The cadence dials, and ONLY the
// cadence dials — which door shuts is measured off the live map every load, not
// listed here, because the map is still growing.
export const WORKS_GAP_MIN_MS = 5 * 3_600_000;  // the world considers works every 5–9h
export const WORKS_GAP_MAX_MS = 9 * 3_600_000;
export const WORKS_LEN_MIN_MS = 2 * 3_600_000;  // and when it does, they last 2–5h: hours, not minutes,
export const WORKS_LEN_MAX_MS = 5 * 3_600_000;  // so it is a thing you plan around rather than wait out
export const WORKS_MAX_SHUT = 2;                // never more than two doors at once
export const WORKS_SECOND_ODDS = 0.2;           // and the second is rare — it is the case that really bites
// The floor under a measured draw weight. A door worth ~nothing to shut should
// be nearly never drawn, but never absolutely impossible: today's dead-cheap
// fortress door is tomorrow's only way out of a new wing, and the weight will
// say so on its own the moment that is true.
export const WORKS_MIN_WEIGHT = 0.02;
export const STONE_ROLL_MIN_MS = 2 * 3_600_000; // the world checks every 2–4h...
export const STONE_ROLL_MAX_MS = 4 * 3_600_000;
export const STONE_MINT_ODDS = 0.25;             // ...and 1 check in 4 mints — ~twice a day, on dice
// The keeper's shelves are a market, not a vending machine (rome, 2026-07-11):
// things sell out. Sometimes YOU take the last one; sometimes an off-screen
// wanderer beat you to it (the churn — the world has other customers). A bare
// shelf restocks on its own within the window.
// The keeper's shelf ROTATES (rome, 2026-07-20): at any time about a third of
// his gear/oddments simply aren't on offer — not "sold out" on a bare shelf,
// just not carried right now — and they cycle back over an hour or three. The
// basics (food, water, dressings, torches, scrap) are always kept.
export const FENCE_ABSENT_FRACTION = 0.33; // share of the ROTATING catalog gone at any time
export const FENCE_OUT_MIN_MS = 60 * 60_000;  // an absent item stays gone this long...
export const FENCE_OUT_MAX_MS = 180 * 60_000; // ...to this — "for some time", then it's back
export const FENCE_LAST_ONE_ODDS = 0.2; // per item bought: that was his last (staples never sell out)
export const FENCE_CHURN_MIN_MS = 20 * 60_000; // how often the shelf tops itself back up to the rotation target
export const FENCE_CHURN_MAX_MS = 45 * 60_000;
export const CARRION_ROOMS = new Set(["the-mass-grave", "the-bone-midden", "carrion-gallery"]);
export const STOCK_REGROW_MIN_MS = 2 * 3_600_000;
export const STOCK_REGROW_MAX_MS = 4 * 3_600_000;
export const GRUDGE_MAX = 5;
// How long a creature holds a grudge before it forgets — each kind at its own
// pace. Killing the creature settles it outright (it's gone, and a migrant
// replacement never knew you); this is the slower mercy of time for one you
// couldn't put down. The Forgotten King never forgets (is_boss → Infinity).
// A grudge should live inside ONE run — "this fight isn't over, it'll come for
// you" — not across real-life sessions (rome, 2026-07-10: the old scale ran
// hours-to-days, so a mob you FLED was still hunting you at next login). Killing
// the thing settles it instantly; this only governs the ones you ran from. So
// the curve is minutes-to-a-few-hours now. Bosses still never forget (is_boss).
export const FORGET_MS: Record<string, number> = {
  rat: 30 * 60_000,            // vermin: a short, scrabbling temper
  "fleet-rat": 30 * 60_000,    // it's already running; a grudge means little
  cutpurse: 20 * 60_000,       // it got what it wanted; no reason to hold a grudge
  "grave-hyena": 2 * 3_600_000, // remembers a bad meal a couple hours
  skeleton: 2 * 3_600_000,      // habit and repetition, but it fades
  "dire-hyena": 3 * 3_600_000,  // the mean one holds it longer
  "brood-rat": 3 * 3_600_000,   // a mother remembers what came for her nest
  warden: 4 * 3_600_000,        // a hollow warden holds it the longest of the un-bossed
};
export const FORGET_DEFAULT = 2 * 3_600_000; // deep dwellers & pale kin: a couple hours
export const COMBAT_NOISE_EVERY_MS = 8000; // a running fight rings out this often
export const NOISE_HEED_ODDS = 0.4; // per noise ring — a fight re-rings every 8s and re-rolls, so this converges (64% by ring 2, 78% by 3); 0.7 made every fight a certain crowd (rome dialed it down 2026-07-13)
export const DOGPILE_CAP = 3; // most creatures that can land a blow on one player in a tick; the rest press at the edges
export const CROWD_CAP = 5; // a room this full stops drawing more (no wandering in, no answering a fight) — no black holes
// Worn slots that contribute ARMOR (they all sum). The shield is a worn slot
// too but pays in BLOCK, not soak; the weapon is worn for WEIGHT only.
export const ARMOR_SLOTS = new Set(["armor", "helm", "feet", "cloak"]);
export const BLEED_TICKS = 3; // how many ticks a fresh cut weeps before it clots
// Bleed DAMAGE per tick takes the MAX across weapon hits (a fast blade re-opening
// one wound doesn't stack into a runaway DoT). But a PARRY RIPOSTE is a SEPARATE
// wound from a separate blade, so it STACKS on top of the weapon bleed — capped
// here so sustained parrying can't climb forever (rome, edges-all-bleed era).
export const BLEED_STACK_CAP = 6;
// A wound that would drop you to 0 SOMETIMES kills outright; otherwise you cling
// on at 1 hp, one more beat to bind it or run. Bleeding out is a coin-flip, not
// a sentence — but with no dressing left, the flips keep coming.
export const BLEED_KILL_ODDS = 0.5;
// A dressing auto-binds the moment a bleeding wanderer drops to half — the reflex
// that saves you, if you're carrying one. (Mirrors the auto-eat line.)
export const BANDAGE_FRACTION = 0.5;

// Traces: the world's memory, decaying at each kind's own pace.
export const TRACE_LIFE_MS: Record<string, number> = {
  blood: 6 * 3_600_000,
  // The walking wound's trail: shorter-lived than a death's pool — a trail is
  // hunt-fresh intelligence, not an archive. (Bleeds clot in a few ticks, so a
  // trail is a handful of rooms; 45 min keeps it followable, then the stones
  // forget.)
  drip: 45 * 60_000,
  remains: 12 * 3_600_000, // bone and broken armor outlast a bloodstain
  scraps: 6 * 3_600_000,
  rest: 3 * 3_600_000,
  passage: 90 * 60_000,
  // A carving is the most durable trace — you chiseled it — but the stone
  // still weathers within a day. Nothing a stranger scratches here scars the
  // world for good; graffiti self-erases, same spine as guest pruning.
  carve: 24 * 3_600_000,
};
export const TRACE_CAP = 12; // per room; oldest non-carving forgotten first
export const CARVE_CAP = 5; // wall space is finite
export const CARVE_MAX_LEN = 40;
export const ROT_MS = 4 * 3_600_000; // food on the floor keeps this long, then rots to scraps (was 12h — rome 2026-07-17: too long; 4h still outlasts any delve, and the scraps feed the scavengers sooner)

// What a creature on the move sounds like from one room away. Every dweller
// gets its own voice through the walls — the deep ones especially, so the dark
// below is never just "something moves."
export const MOVE_SOUNDS: Record<string, string> = {
  rat: "Claws skitter {dir}.",
  "fleet-rat": "Tiny claws scrabble away {dir}, fast.",
  "brood-rat": "Something heavy drags itself {dir}.",
  skeleton: "Dry bones clatter {dir}.",
  "bone-knight": "Mail and old bone grind together {dir}, in step.",
  warden: "Slow, heavy footfalls sound {dir}.",
  "warden-captain": "A heavy tread rings {dir}, and does not hurry.",
  cutpurse: "Quick, light footsteps patter {dir}.",
  cutthroat: "A soft, unhurried step crosses {dir}, and is gone.",
  "grave-hyena": "Something big pads {dir}, sniffing.",
  "dire-hyena": "Something heavy pads {dir}, close and unhurried.",
  "last-watchman": "A slow, measured tread {dir} — boots keeping time on old stone.",
  "the-drowned": "Water shifts {dir}, thick and slow, around something wading.",
  "drowned-hulk": "A great mass moves through water {dir}, and the flood slaps the walls.",
  "pale-crawler": "Something long drags itself over wet stone {dir}.",
  "pale-stalker": "A wet, boneless sound slides {dir}, and stops.",
  "twice-dead": "Old bones shift {dir}, unhurried, as if they have all the time there is.",
  "thrice-dead": "Something dead resettles itself {dir}, patient and wrong.",
  "the-gaunt": "Something very tall moves {dir}, breathing in long, starving pulls.",
  "rag-and-bone": "Something moves {dir} in a slow clatter of hanging metal, like a cart of scrap walking.",
  "road-carrier": "Boots go {dir} at a steady walking pace, neither hurrying nor stopping.",
  "masterless-dog": "Something four-legged trots {dir}, claws ticking on stone.",
  "the-keeper-of-the-holding": "A heavy tread crosses {dir} on boards that have not held anyone in a long time.",
  "warden-surface": "Armor moves {dir}, grinding, out under the open sky.",
  "lead-dog": "Something four-legged goes {dir} at a walk, in no hurry at all.",
  "wayman": "A single step {dir}, placed deliberately, by somebody who could have been quieter.",
  "dire-wolf": "A heavy padding crosses {dir}, and the stride is far too long.",
  "white-roe": "Something light steps {dir} and does not hurry.",
  "old-boar": "Something very heavy goes {dir} through the brush and does not go around anything.",
  "something-ahead": "A step {dir} that matches yours — and it is in front of you.",
  footpad: "A step scuffs the verge {dir}, and takes care to be the last one you hear.",
  "roe-deer": "Something light and quick breaks {dir} through the undergrowth, all at once.",
  "wild-boar": "Something heavy shoulders through the brush {dir}, taking the straight way.",
  "grey-wolf": "A long, unhurried padding crosses {dir}, and does not stop to consider you.",
  "the-follower": "A step {dir} that matches yours, and stops when you stop.",
  "charcoal-burner": "Boots and a dragging haft go {dir}, at a working pace.",
  "root-thing": "Earth and root shift {dir}, slowly, like a bank giving way.",
  "the-mire-walker": "Water drags {dir} around something that will not lift its feet clear.",
  "the-woodward": "A steady tread goes {dir}, unhurried, and does not cast about for the way.",
};

// What a creature sounds like STANDING STILL, for an ear pressed to the dark
// (verbs.cmdListen). MOVE_SOUNDS is a thing passing; this is a thing that's
// simply there. Bespoke voices here; anything unlisted falls back to its
// family register in cmdListen (drowned = water, hollow = dry bone, thieves =
// a careful boot, beasts = breathing). Hidden lurkers make no sound at all —
// silence is what an ambush sounds like.
export const STILL_SOUNDS: Record<string, string> = {
  "three-hound": "slow, enormous breathing — three sets of lungs working as one",
  "two-hound": "slow, heavy breathing, doubled — big lungs working in step",
  "last-watchman": "the creak of old leather and iron, holding perfectly still — something standing at attention",
  "brood-rat": "a wet, many-voiced squirming",
  "the-gaunt": "long, starving breaths, drawn through teeth",
  "drowned-hulk": "water pressing and settling around something vast",
  "rag-and-bone": "a soft, ceaseless chink of metal on metal — a great many small things hung on one slow-breathing thing",
  "road-carrier": "the creak of a loaded satchel strap, and breathing measured to a pace — something standing still that would rather be walking",
  "roe-deer": "quick shallow breathing, held — something small deciding whether it has been seen",
  "wild-boar": "a low grunting and the steady work of something rooting, unbothered",
  "grey-wolf": "nothing at all, and then the small sound of a jaw closing",
  "lead-dog": "slow breathing through a bad nose, and a collar-chain that has not been on anything for a long time",
  "wayman": "cloth shifting, and a man breathing through his mouth to keep it quiet",
  "dire-wolf": "breathing far too deep and slow for a wolf, and nothing else at all",
  "white-roe": "breathing, unhurried and quite steady — something that has not decided to be afraid of you",
  "old-boar": "a deep, wet snorting, and a tusk knocking on wood, over and over",
  "something-ahead": "your own breathing, and ahead of it, a fraction EARLY, something doing the same",
  "the-follower": "your own breathing, and under it, a fraction late, something doing the same",
  "charcoal-burner": "wood being laid on wood, one piece at a time, patiently, by somebody who is not hurrying",
  "root-thing": "a slow creak of wet timber taking weight, over and over, going nowhere",
  "the-mire-walker": "water settling around something standing in it, and settling again",
  "the-woodward": "a slow creak of leather, and breathing — something standing at ease in a place it has never once been lost in",
  "masterless-dog": "panting, low and open-mouthed, and the small sound of a collar shifting",
};

// Territory: every creature remembers its den and keeps to the ground around
// it. Idle wandering never crosses the edge; a creature that finds itself
// beyond it (fled, or freshly walked in from a dark mouth) spends every idle
// step walking home. This is what keeps the deep in the deep — and the rats
// out of rooms three corridors from their nest. Patrollers (PATROLS) are
// exempt: their route is their territory. The boss goes where it pleases.
export const TERRITORY_RADIUS = 3;

// ---------------------------------------------------------------------------
// MIGRATION (rome, 2026-08-06: "can we make it so that some mobs can migrate to
// different areas? (on a very very small rng roll)").
//
// HOW IT WORKS, and it is almost no new machinery: a creature's territory is
// the ground around its `home`, and the wander code already walks a creature
// BACK to a home it is far from — with purpose, at a travelling pace, over
// minutes (ai.ts, "carries a migrant from the mouth to its range"). So a
// migration is one line: rarely, give it a different home. The animal then
// makes its own way there, room by room, through whatever is in between, and
// anybody standing on that road sees a wolf going somewhere.
//
// WHO MOVES. Things with legs and a reason. Wolves, dogs, hyenas, boar, deer,
// and the men who follow them — a footpad goes where the traffic is. NOT the
// bosses (they are a place, not a population), not the patrols (their route is
// their territory), not the hollow or the drowned or the deep's own kin: those
// are bound to what made them, and the surface trip they get is SURFACERS, a
// different rule with a different meaning.
export const MIGRANTS = new Set<string>([
  "roe-deer", "white-roe", "wild-boar", "old-boar",          // the game
  "grey-wolf", "dire-wolf", "grave-hyena", "dire-hyena",     // what follows the game
  "masterless-dog", "lead-dog", "two-hound", "three-hound",  // the pack
  "footpad", "cutthroat", "wayman",                          // what follows the people
  "fleet-rat",
]);
// The ground they may move BETWEEN. Surface only, and the whole surface: an
// animal that walks from the wood to the den ground has walked somewhere it
// could plausibly get to, and the map now says so — they share borders.
export const MIGRATE_BANDS = new Set<string>(["road", "wood", "den", "out"]);

// THE DESTINATION HAS TO BE ABLE TO HOLD IT (rome, 2026-08-06: "do we have the
// right eco system for thse migrants? ... it should be proper with the mob
// type"). It could not, and the census says so plainly:
//
//   where they live       road  wood  den  fortress
//     roe deer               0    30    1     0
//     wild boar              0     7    0     0
//     grey wolf              0    16    0     0
//     grave hyena            0     0    0     9
//     masterless dog         6     0    1     0
//
// THE WOOD IS THE ONLY BAND WITH A FOOD WEB. Everything else is a monoculture,
// which broke migration three ways: a wolf that left the wood found nothing to
// eat and STARVED — and starving is what drives starvingHunts, so migration
// would have quietly turned wolves into player-hunters, a difficulty spike with
// a nature-documentary excuse. Hyenas eat rats and rats are fortress-only, so
// every hyena migration was a one-way trip to famine. And the wood, the one
// working web, was the only donor to all of it.
//
// So the destination proves itself, LIVE, at the moment of the roll:
//
//   GRAZERS go where the ground grows something (FORAGE_REGIONS). Never onto
//   the fortress ring, which grows nothing.
//
//   PREDATORS go where something they actually prey on is STANDING RIGHT NOW —
//   the live world, not the spawn table. A wolf follows deer. No deer on the
//   road, no wolf on the road. Which makes the whole thing self-correcting: the
//   moment deer drift out, wolves become ABLE to follow, and the web builds
//   itself outward instead of being drained.
//
//   PEOPLE follow traffic, not animals — the road, the dens, the fortress ring.
//   That is what a footpad is FOR.
//
// And a floor under the band it leaves, so nowhere is ever emptied out.
export const MIGRATE_KEEP = 3; // a band never gives up its last this-many of a line
// VERY, VERY SMALL, and here is the arithmetic behind the number rather than a
// guess. 83 eligible creatures stand on the surface; each rolls once per wander
// (45-150s), which is about 3,065 rolls an hour across all of them.
//
//   0.00200 -> 6.1 an hour   (147/day)  a visible churn; the world stops having places
//   0.00100 -> 3.1 an hour    (74/day)
//   0.00050 -> 1.5 an hour    (37/day)
//   0.00025 -> 0.8 an hour    (18/day)  <- this
//
// Under one an hour, world-wide, across four bands, and the ecology gate above
// will refuse a good share of those outright. You will not watch it happen.
// What you will notice, weeks apart, is that there are wolves on the road this
// month and there were not before — which is the entire point: the distribution
// of animals should be something the world arrives at, not something I typed
// into a migration file once.
export const MIGRATE_ODDS = 0.00025;

// The dark mouths: where migrants physically enter the world — a well shaft,
// a forgotten hole, cracks the dungeon never sealed. A refill surfaces at the
// mouth nearest its den and walks in; nothing materializes in a watched room.
// (The sessile — brood-mothers, the drowned — simply are where they live.)
export const MOUTHS = [
  "well", "oubliette", "kennels", "catacomb", "the-weir", "root-vault",
  // The outside keeps its own dark edges: the grounds' beasts come in from
  // the fen and the briars, the shallow warrens breathe through the sewer-slip
  // — not out of the crypt. Kills the migrant parade through the keep's ring.
  "the-black-fen", "the-briar-field", "the-sewer-slip",
  // THE SURFACE EXPANSION NEEDS ITS OWN EDGES (2026-08-02). A migrant surfaces
  // at the mouth NEAREST its den and walks in, and before this the nearest
  // mouth to anything in the road or the wood was the fen or the briars — so
  // every wolf, boar and root-thing would have been born in the fortress
  // grounds and marched forty to ninety rooms across the whole world to get
  // home. The wood would have stayed empty for hours while the grounds filled
  // with things that do not live there. Found by walking it: the wood was
  // silent twenty minutes after the roster shipped.
  //
  // Each of these is somewhere a thing could plausibly come out of unseen —
  // burrows, brakes, a quarry, a hollow, an earth-fall — never open ground.
  "the-flooded-quarry", "the-beggars-hollow",                    // the road
  "the-holly-brake", "the-fox-earths", "the-badger-ground", "the-alder-carr", // the wood, honest band
  "the-hollow-beeches", "the-grey-thicket", "the-rush-bed",      // the cores
  "the-earth-fall", "the-under-roots",                           // the sunken wood, and below it
  "the-wolf-pits", "the-icehouse",                               // the far side
  // TWO MORE DEEP MOUTHS (rome, 2026-07-27: "the mobs in the deep are just all
  // in the central corridor"). applyArrivals walks a migrant in from the
  // nearest mouth on ITS side of the descent — and only the-weir and root-vault
  // were deep, so every deep respawn entered through one of two rooms and
  // marched to its den, all along the same spine. Measured over the live spawn
  // table: 31 deep walkers, busiest corridor room carrying 17 of them, average
  // march 5.1 rooms — so a large share of the deep's population was permanently
  // in transit on the boss road instead of at home. These two cut that to 11
  // and 2.4. Both are openings by their own prose (the sump is where everything
  // the deep loosens gathers; the undertow drags toward the deeper black), the
  // same law as the weir's gap and the root-split vault. worm-bore is
  // deliberately NOT one — it's the deep's hideaway, and things crawling out of
  // it would ruin the one place nothing can follow you.
  "the-sump", "the-undertow",
];

// The warden walks its rounds — it always has ("armor... still walking its
// rounds"). Knocked off the route (fled, investigated), it drifts back. It
// beats the full INNER RING that circles the hall — never the gates (the
// threshold rule bars that) and never resting on any one wanderer's path in.
// Each step is to an adjacent room, so the rounds actually close.
export const PATROLS: Record<string, string[]> = {
  warden: ["barracks", "cells", "cistern", "ossuary", "catacomb", "kennels", "armory", "gallery"],
  "warden-captain": ["barracks", "cells", "cistern", "ossuary", "catacomb", "kennels", "armory", "gallery"],
  // The last watchman (076) walks the high circuit out-and-back — every leg
  // adjacent, so his rounds NEVER leave the walls (no off-route drift down a
  // stair). The bell-cote hangs above the turret, off his route: the one
  // perch the watch never checks. Wait up there and let him pass beneath.
  "last-watchman": [
    "the-watch-turret", "the-wall-walk", "the-broken-battlement", "the-leaning-spire",
    "the-rotted-scaffold", "the-weepers-crown", "the-rotted-scaffold", "the-leaning-spire",
    "the-broken-battlement", "the-wall-walk",
  ],
  // rome, 2026-07-24: one warden pulled off the interior circuit to walk the
  // open ground instead — the ONE spot in the world with a patroller on it
  // now. Full loop of GROUNDS_ROOMS, out-and-back on its three dead ends
  // (mass-grave, old-road, sally-ditch) same as the last-watchman's route;
  // every leg here is a real adjacent exit.
  "warden-surface": [
    "the-causeway", "the-gatefall", "the-dry-moat", "the-wall-breach", "the-thorn-court",
    "the-mass-grave", "the-thorn-court", "the-briar-field", "the-hanging-hill", "the-old-road",
    "the-hanging-hill", "the-briar-field", "the-black-fen", "the-drowned-orchard", "the-sally-ditch",
    "the-drowned-orchard", "the-burned-village",
  ],
  // THE CARRIER (2026-08-01): the West Road's whole spine, out and back — the
  // longest route in the game by a wide margin, and the point of it. A road
  // patroller you meet every few minutes isn't going anywhere; one who takes a
  // very long time to come round again is a man with 25 rooms of road to walk.
  // Every leg is a real adjacent exit (the spine only — he never turns off into
  // the shelter, the well, the quarry or the hollow, because a courier doesn't).
  "road-carrier": [
    "the-cart-road", "the-broken-paving", "the-first-milestone", "the-elder-hedge",
    "the-sunken-lane", "the-drovers-turn", "the-crooked-gibbet", "the-ash-verge",
    "the-long-straight",
    // the new stretch (migs 157-158) — the road grew ten rooms in the middle and
    // a courier's route is the road. Without these his legs stopped being
    // adjacent at the seam and the patrol quietly fell back to wandering.
    "the-second-milestone", "the-open-heath", "the-burnt-farmstead", "the-wind-row",
    "the-culvert", "the-crooked-mile", "the-hollow-elm", "the-third-milestone",
    "the-weed-paving", "the-roadwarden-post", "the-mustering-yard",
    "the-shallow-ford", "the-drowned-milestone", "the-broken-axle", "the-cutting",
    "the-rain-shadow", "the-old-boundary", "the-tinkers-camp", "the-last-paving",
    "the-track", "the-rutted-track", "the-green-lane", "the-holloway",
    "the-gap-in-the-trees",
    // and back the way he came
    "the-holloway", "the-green-lane", "the-rutted-track", "the-track",
    "the-last-paving", "the-tinkers-camp", "the-old-boundary", "the-rain-shadow",
    "the-cutting", "the-broken-axle", "the-drowned-milestone", "the-shallow-ford",
    "the-mustering-yard", "the-roadwarden-post", "the-weed-paving",
    "the-third-milestone", "the-hollow-elm", "the-crooked-mile", "the-culvert",
    "the-wind-row", "the-burnt-farmstead", "the-open-heath", "the-second-milestone",
    "the-long-straight",
    "the-ash-verge", "the-crooked-gibbet", "the-drovers-turn", "the-sunken-lane",
    "the-elder-hedge", "the-first-milestone", "the-broken-paving",
  ],
  // THE WOODWARD (rome, 2026-08-02: "we need a boss in the center of the maze").
  // He walks the CENTRE CORE, the one behind the Turning, and that is the entire
  // idea of him. The maze is not a place he is kept in. It is a place he keeps.
  //
  // Re-walked 2026-08-03, when the wood stopped lying (mig 149). His old round
  // was a closed ring through a core where nothing paired with its opposite; the
  // core is a cut maze now, so his round is a depth-first walk of it and back out
  // of every branch — the same shape as the surface warden's and the carrier's.
  // He still covers all six rooms and passes the Listening Stand three times,
  // which is right: it is the junction the whole core hangs off.
  //
  // Every leg is a real exit (checked by script), and the round closes: the Same
  // Tree east returns to the Close Dark.
  "the-woodward": [
    "the-close-dark", "the-same-tree", "the-turned-ground", "the-listening-stand",
    "the-heart-of-it", "the-listening-stand", "the-hollow-beeches",
    "the-listening-stand", "the-turned-ground", "the-same-tree",
  ],
};

// Creatures with nothing inside. They do not bleed (broken remains, not blood),
// do not hunger, and no smell of food moves them. The rat is the only thing
// down here that's honestly alive.
export const HOLLOW = new Set(["skeleton", "bone-knight", "warden", "warden-surface", "warden-captain", "forgotten-king", "drowned-god", "marrow-king", "marrow-cantor",
  "twice-dead", "thrice-dead", "last-watchman"]); // the wights joined 066: dry grave-flesh — nothing pumps, nothing spills, and nothing in them knows how to run; the watchman (076) kept his post past all of it
// GRAVE_FLESH: hollow, but a BODY — dried corpse, not bare bone or old iron
// (rome, 2026-07-11: "sounds like a zombie"). A wight has a skull to split, a
// spine to sever, ribs over what used to matter — so the vitals lottery stays
// open to EVERY weapon on these two, not the bone-set's blunt-only gate.
export const GRAVE_FLESH = new Set(["twice-dead", "thrice-dead", "last-watchman"]); // the watchman is a dried MAN in kit, not bare bone — every weapon finds him

// Behavior families — creatures that DO a thing, not just fight:
// THIEVES snatch an unsealed item on a hit and run; kill them to get it back.
export const THIEVES = new Set(["cutpurse", "cutthroat", "footpad", "wayman"]);

// ROAMING DENS (rome, 2026-08-02: "do they have dens? i think we should have it
// as rng where they spawn on a road").
//
// Every other creature in the game has a HOME — the den it was seeded at, the
// ground it keeps to, the room it walks back toward when idle. That is right for
// a dungeon, where a thing lives somewhere. It is wrong for a road. The road's
// own ruling was PATROLLERS, NOT RESIDENTS: what makes a road a road is meeting
// something that was already going somewhere. A dog that reliably re-appears at
// the mustering yard is a resident with extra steps, and three trips teach you
// the whole roster's addresses.
//
// So these take a NEW den every time they arrive, rolled across every room of
// the band they belong to (gates and hideaways excluded — nothing dens on a
// threshold or in a bolthole). Territory still works exactly as before once
// they are placed: they keep to the ground around wherever they woke. You never
// learn where the footpads are. You learn that the road has footpads.
//
// The carrier is deliberately NOT here — he patrols, so his den only decides
// where he re-enters the world, and the road is his route either way.
//
// THE WOOD'S GAME JOINED THEM (rome, 2026-08-02: "roaming would suit them").
// Different argument from the road's, same conclusion. A deer has no address —
// that is most of what a deer IS — and a wolf follows the deer, so pinning
// either to a fixed den turns the wood's food chain into a timetable. Worse
// here than on the road, because the wood is 170 rooms and its whole promise is
// that you do not know where you are: a player who cannot navigate the cores
// can still learn "the deer are at the Spring Head", and that is a landmark
// handed out for free in the one region built to withhold them.
//
// The woodward stays out for the carrier's reason (he patrols), and the
// follower stays out for the opposite one — it is the maze's fixture, one to a
// core, and a follower that moved house would stop being the thing that is
// always already there.
//
// Note this converts GRADUALLY, not on load: the deer and wolves alive right
// now keep the homes they woke at, and each re-roll happens when one dies and
// the next arrives. Animals do not relocate because a constant changed.
export const ROAMING_DENS = new Set(["masterless-dog", "footpad", "roe-deer", "grey-wolf"]);

// SPAWN REGIONS (rome, 2026-08-02: "make the road spawn rng anywhere, like
// mobs"). A band listed here hatches wanderers ANYWHERE in itself rather than at
// a marked room — the same idea as ROAMING_DENS, applied to people.
//
// The road is the right place for it and the fortress is not. A road is where
// you meet things that were already going somewhere; waking on it at a random
// milestone reads as having walked there. The fortress's four spawns are
// thresholds — arches and ports, places you are meant to arrive AT — so they
// stay marked rooms.
//
// Weighting: each spawn ROOM is one slot and each spawn REGION is also one slot,
// so the road is a fifth of arrivals rather than swamping the four fortress
// gates with its thirty rooms. Hideaways are excluded (nobody wakes inside a
// bolthole) and so are gates, since regionOf calls a gate "gate" — you never
// wake on the Roadwarden's doorstep, you wake somewhere out on the road.
export const SPAWN_REGIONS = new Set<string>(["road"]);

// THE MILESTONES (2026-08-01). Two stones on the West Road, twelve rooms apart,
// that keep a PERMANENT register of names — distinct from `carve <words>`, which
// is a trace and weathers off within a day, and from the gatehouse wall chart,
// which records HALLS (shared map knowledge) rather than people.
//
// The whole mechanic is having two of them. The first stone is four rooms out
// and anyone can reach it; the drowned stone is past the ford, out where the
// dogs are. Compare the lists and the road tells you who went on — nobody
// tracks deaths, nobody writes a "who survived" system, the two registers ARE
// the record. Names on the near stone only are people who turned back, or who
// turned nothing back.
export const MILESTONES = new Map<string, { stone: string; other: string; also: string }>([
  ["the-first-milestone", {
    stone: "the milestone",
    other: "the-drowned-milestone",
    also: "and again on the drowned stone, twelve rooms on",
  }],
  ["the-drowned-milestone", {
    stone: "the drowned milestone",
    other: "the-first-milestone",
    also: "who cut the first stone too",
  }],
]);
export const MILESTONE_CAP = 40;   // names a stone holds; the oldest weather off as new ones are cut
export const MILESTONE_SHOW = 12;  // how many you can read at a glance, newest first
// RUNNERS never stand and fight — they bolt the instant they can, so the only
// way to kill one is to catch it: hit it as it breaks for the door.
// The WHITE ROE is deliberately NOT here (mig 141). Everything in the wood that
// can bolt, bolts — so the rarest thing on the surface is the one that stands in
// the open and looks back at you. Its whole effect is the omission.
export const RUNNERS = new Set(["fleet-rat", "roe-deer"]);
// BROODERS are nest-bound: they don't wander, don't flee, and while they live
// they keep birthing scabby rats into their room. Kill the mother or the room
// stays an infestation. A living source, not a stat block.
export const BROODERS = new Set(["brood-rat"]);
export const BROOD_CAP = 6; // most LIVING pups a mother sustains at once (total, by nest — counts dispersed pups too, so it can't runaway-infest); she breeds a replacement whenever one dies or is culled
export const BROOD_INTERVAL_MS = 90_000; // ~90s between births
// LISTENERS are dormant to sight — empty sockets, nothing behind them — but
// they HEAR. A still, quiet wanderer they walk right past; move (in or out) or
// make a din and they may lurch awake and swing. (A grudge still wakes them
// outright; this is only for the ones that don't yet know you.)
export const LISTENERS = new Set(["skeleton", "bone-knight", "marrow-cantor"]); // the cantor brings ears (and the bone-tax) to the King's Demesne
export const WAKE_ENTER = 0.3;  // sometimes it catches the sound of you coming in
export const WAKE_EXIT = 0.45;  // your move for the door is still the loudest thing you do — but it SCALES with your load now (rome, 2026-07-30). At a flat 0.65 leaving a room with a sleeper in it was punished two times in three, with no way to creep out: entry took ENTRY_STEALTH_MIN scaling ("the plate ninja is dead"), the exit took none, so light gear helped you arrive and did nothing for you leaving. Same roll both ways now, and the door stays the louder of the two.
export const WAKE_NOISE = 0.8;  // a fight in the room is almost unmissable
export const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
// SCAVENGERS roam the dungeon eating its dead (blood/remains litter), healing
// and — past BOLD — losing their nerve entirely: they stop fleeing and hit harder.
export const SCAVENGERS = new Set(["grave-hyena", "dire-hyena", "grey-wolf", "dire-wolf"]);
// VERMIN eat the dead too — but only to SURVIVE, none of the hyena's package.
// Rats had no food at all (not predators, not scavengers), so they sat pinned at
// max hunger, forever "restless with hunger" (rome, 2026-07-17: "what are rats
// eating? i always see them starving"). Now a hungry rat gnaws a corpse in its
// room to sate and heal a little — but it does NOT haul off loot, mourn its kin,
// or gorge itself bold into a threat (all of that stays gated on SCAVENGERS).
// The bone rooms clean their own dead; the rat just doesn't starve in them.
export const VERMIN = new Set(["rat", "fleet-rat", "brood-rat", "roe-deer", "white-roe"]);
// THE NOSE (rome, 2026-07-17): a scavenger with nothing better to do drifts
// toward fresh blood next door — a drip trail (a wounded thing that walked
// through) or a kill's pool. Odds-gated so it's a drift, not a magnet; the
// freshness window keeps them off stale archaeology. Emergence for free:
// bleeding + traces + the existing `curious` walk = run wounded and the
// dungeon can follow you home.
export const SCENT_FRESH_MS = 15 * 60_000; // blood younger than this pulls
export const SCENT_HEED_ODDS = 0.6; // per wander beat, when fresh blood is adjacent
// The mean subtype GUARDS its meal: walk into a room where it's on a corpse
// (or where it's already gorged bold) and it turns on you unprovoked. It also
// hits harder and holds a grudge longer — a far worse thing to disturb.
export const AGGRO_SCAVENGERS = new Set(["dire-hyena"]);
// The scavenger's theft is paced and telegraphed (rome, 2026-07-11: gear was
// gone within one 2s tick of a room emptying — "before you can even touch
// it"). Fresh-fallen gear is safe for the grace; then the thief noses at its
// prize a beat (the snuffling carries through walls — a chaser one room over
// can run back and interrupt) before the snatch.
export const SCOOP_GRACE_MS = 90_000;
export const SCOOP_NOSE_MS = 8_000;
// THE HOARDER (rome, 2026-08-01): the deep's mini-boss isn't a bigger set of
// teeth — it's a thing that has been down here longer than you, picking up
// everything the dark drops. It builds its OWN loot table out of the deep's
// litter, so what it's worth is a function of how long it has been left alive.
// Mechanically it's the hyena's scoop widened: same nose-first telegraph, same
// grace window, same spill-on-death, just a far deeper pocket and no appetite
// (it collects; it doesn't eat — see hungers()). It takes anything but the free
// rock, where a hyena only takes real gear: junk and trophies are treasure to
// something that keeps rather than uses.
// PASSIVITY IS PART OF THE DESIGN (rome, 2026-08-01: "not aggressive, only
// attacks when attacked"). A hoarder is deliberately absent from AGGRESSIVE,
// STARVE_HUNTERS, THIEVES, SCAVENGERS and PREYS_ON — those five gate every
// unprovoked-attack path there is, so it only swings at someone who swung
// first. Adding it to STARVE_HUNTERS would break that SILENTLY: woundedPreyHunts
// is gated on membership alone and never reads hunger, so the hunger exemption
// below would not save it. It is a 115 hp wall you choose to fight.
export const HOARDERS = new Set(["rag-and-bone"]);
export const HOARD_CARRY_CAP = 8;   // the deep pocket (a hyena's jaws hold 3)
// The den is a TELL, not the prize (rome: "carries it, den is a bonus"). Above
// the keep line it sheds the odd piece where it sleeps, so the room slowly
// silts up into a warning — something big walks here, and it has been busy.
// It never sheds below HOARD_KEEP, so killing it is always worth the fight.
export const HOARD_KEEP = 4;
// Shed rates are WALL-CLOCK intervals, not per-beat odds, and that distinction
// is load-bearing (rome caught this 2026-08-01). The scoop runs on two different
// clocks: the live tick every TICK_MS (2s) for anything inside the SIM_RADIUS
// bubble, and slowEcology every SLOW_ECOLOGY_MS (30s) for everything outside it.
// A per-beat chance therefore fires 15x faster whenever a player is within two
// rooms — so the first version of this made the hoarder vomit its hoard the
// moment anyone came near, which is precisely backwards. Timestamps can't drift
// with the beat, and they survive anyone retuning either constant later.
export const HOARD_DEN_MS = 150_000;   // ~2.5 min between pieces, at its own den

// THE TRAIL (rome, 2026-08-01: "slowly drops an item to spread loot around the
// deep, and then keeps picking up"). Away from the den, pieces work loose from
// the lashings and fall where it happens to be standing. That turns the hoarder
// from a vacuum into a CURRENT: it lifts loot out of the rooms that have it and
// leaves it in rooms that don't, so the deep's litter keeps circulating instead
// of pooling wherever it happened to drop. Slow on purpose — at the 30s far-world
// beat this is roughly one piece every eight minutes of wandering, so you find a
// dropped blade in a corridor and wonder what put it there.
export const HOARD_TRAIL_MS = 500_000; // ~8 min of wandering between dropped pieces
// It hears a fight two rooms off and wants no part of it. How long it shuns a
// room it heard trouble in (its own den is always exempt — see the avoids law).
export const HOARD_SPOOK_MS = 10 * 60_000;
// The soft beat (rome, 2026-07-11): a rat that walks in on a resting wanderer
// may decide you are furniture — warm furniture — and curl up against you.
// Purely the world being alive, with one grace note: in a cold snap a rat
// pressed against your ribs is REAL warmth (the cold's rest penalty waives).
// A rat with a grudge never cuddles; it attacks on arrival like always.
export const CUDDLE_ODDS = 0.04; // per idle 2s tick sharing a room with a rester
export const CUDDLE_COLD_MULT = 3; // in the cold, everything warm looks like a bed
// It doesn't spring the instant you're in reach — it lifts its head, hackles up,
// and takes a beat to commit. That wind-up is your window to back out or hit first.
export const DIRE_ROUSE_MS = 5000;
// The grave-hyena will not eat its own kind. It stands over a dead grave-hyena,
// throws its head back, and laughs — that keening, no-mirth laugh — and holds
// over the body a while before it drifts off. The dire-hyena has no such
// scruple: the mean cousin eats whatever falls, its own dead included.
export const MOURN_FRESH_MS = 3 * 60_000; // only a fresh body moves it; old litter doesn't
export const MOURN_VIGIL_MS = 20_000;     // it holds its vigil this long before wandering on
// Look into still water and your face comes back — and once in a rare while it
// does something you didn't. Rare on purpose: the dread is in not expecting it.
export const REFLECTION_LIE_ODDS = 0.08;
// The dead remember their own. A hollow thing, idle in a room where a wanderer
// truly fell, works its jaw and breathes the name off the bloodstain — soft, the
// way you'd call for someone who isn't coming. Rare, and never a chant.
export const MURMUR_ODDS = 0.005;          // RARE on purpose — minutes of standing idle with the dead before one ever speaks
export const MURMUR_COOLDOWN_MS = 300_000; // and then a long quiet (5 min) before that same one speaks again
export const CORPSE_TRACES = new Set(["blood", "remains"]);
// THE GLOAM (rome, 2026-07-13): the dark itself gets up and walks the keep.
// One interior room at a time is TRUE dark — blind without a light. A carried
// flame still holds it off (this is a moving dark room, not the exhale). It
// drifts to an adjacent hall every few minutes; the living flee the room it
// takes, and the HOLLOW keep walking inside it — bones don't need eyes.
// Never outdoors (the sky kills it), never a gate room (no fresh key wakes
// blind). Its room rides EventState.data, so a deploy mid-drift doesn't
// blink the dark out.
export const GLOAM_TELEGRAPH_MS = 90_000;      // the light goes thin and brown first
export const GLOAM_STEP_MS = 150_000;          // it takes a new room every 2.5 min
export const GLOAM_ACTIVE_MS = 45 * 60_000;    // the walk's ceiling
export const GLOAM_AFTERMATH_MS = 10 * 60_000; // the halls stay wrong a while

// ---------------------------------------------------------------------------
// THE NEW GROUND'S WEATHER (rome, 2026-08-06: "we hvae new areas now such as
// the woods and dens, lets add some events").
//
// The wood is 170 rooms and the den ground 60 — 230 of the world's 408 — and
// between them they had NOT ONE arc. Every event in the pool was written for a
// fortress: the boil and the corpse-wake are the warrens', the exhale and the
// marrow-song are the deep's, the gloam is the keep's, and the weather (rain,
// fog, cold, crows, lights) falls on "outdoors" as a single undifferentiated
// sheet. So the west half of the world had sky and nothing else.
//
// Five arcs, three for the wood and two for the dens, and every one of them is
// a bundle of toggles on rules that already exist — the law this file has kept
// since the first event.

// ---- THE RUT (wood) ----
// The roe come into season. Game everywhere, stags that will NOT run, and the
// wolves come in behind the noise. The wood's one good hunting window and the
// one time it is full of things that hunt back.
export const RUT_TELEGRAPH_MS = 60_000;
export const RUT_ACTIVE_MIN_MS = 20 * 60_000;
export const RUT_ACTIVE_MAX_MS = 35 * 60_000;
export const RUT_AFTERMATH_MS = 8 * 60_000;
export const RUT_DEER = 7;    // put on the wood for the window, cleared after
export const RUT_WOLVES = 3;  // they follow the noise, they do not arrive with it
export const RUT_WOLF_DELAY_MS = 4 * 60_000; // ...and they are LATE, which is the whole shape of it
// AND THE ROARING IS REAL NOISE (rome, 2026-08-06: "when deers are in the rut,
// are the making noise? (mateing call)"). It was prose only — the stags roared
// in the ambient lines and the noise system never heard a thing, which left the
// wolves arriving on a timer because I said so rather than because anything
// called them. Now a rutting stag ROARS: it carries to the neighbouring rooms
// like any other sound, and it pulls what hunts the same way a fight does.
//
// So the arc has two sides instead of one. The roaring MASKS you — the wood is
// full of noise that is not yours, and this is the one window where a loud pack
// costs you nothing — and the roaring DRAWS, because every wolf and hyena
// already in the wood is converging on exactly the rooms you want to be in.
// The wolves that arrive late are not the danger; they are the confirmation.
export const RUT_ROAR_EVERY_MS = 25_000; // per room holding a stag, at most
export const RUT_ROAR_ODDS = 0.45;       // ...and not every window
export const RUT_NOISE_MASK = 0.4;       // your own noise the roaring swallows, in the wood, while it runs

// ---- THE WOODWARD WALKS (wood) ----
// He is a boss with a patrol route around the centre core, and the entire idea
// of him is "the maze is not a place he is kept in, it is a place he keeps".
// This is the day he keeps all of it: the route is dropped and he strides the
// whole wood. No spawn, no new creature — the one already standing there simply
// stops staying home.
export const WALK_TELEGRAPH_MS = 90_000;
export const WALK_ACTIVE_MIN_MS = 18 * 60_000;
export const WALK_ACTIVE_MAX_MS = 30 * 60_000;
export const WALK_AFTERMATH_MS = 10 * 60_000;
export const WALK_STRIDE_MIN_MS = 25_000; // a patrol's pace is slow; this is not a patrol
export const WALK_STRIDE_MAX_MS = 50_000;
export const WOODWARD_TMPL = "the-woodward";

// ---- THE QUIET (wood) ----
// Every bird stops. Nothing wanders, and SOUND CARRIES: you hear a room
// further than you could, and everything with ears hears you the same way. The
// only arc in the game that is an ABSENCE, and it cuts exactly both ways.
export const QUIET_TELEGRAPH_MS = 45_000;
export const QUIET_ACTIVE_MIN_MS = 12 * 60_000;
export const QUIET_ACTIVE_MAX_MS = 20 * 60_000;
export const QUIET_AFTERMATH_MS = 6 * 60_000;
export const QUIET_WANDER_MULT = 6;   // a creature's next step is six times further off
export const QUIET_HEED_MULT = 2.2;   // ...and a noise it does hear pulls that much harder

// ---- THE PACK COMES IN (dens) ----
// Things off the Waste take the hamlet. It exists to serve the den's founding
// bar (rome: "does having a den make leaving it feel MORE dangerous") — the
// walk home becomes the fight, and a barred door becomes a real choice rather
// than an upgrade you fitted once.
//
// IT HAS A HEAD, AND THAT IS THE POINT. Kill it and the pack breaks: the dogs
// scatter for the Waste, the wolves go back to the wood, the arc ends early.
// An event you can END, not one you wait out — and it makes the den ground the
// one place in the world where clearing a room changes the weather.
export const PACK_TELEGRAPH_MS = 75_000;
export const PACK_ACTIVE_MIN_MS = 25 * 60_000;
export const PACK_ACTIVE_MAX_MS = 40 * 60_000;
export const PACK_AFTERMATH_MS = 10 * 60_000;
export const PACK_DOGS = 5;      // the body of it
export const PACK_WOLVES = 2;    // came in behind the dogs, and do not mix with them
export const PACK_HYENAS = 2;    // follow packs, never join them
export const PACK_HEAD_ODDS = 0.3; // ...that it is something worse than the lead dog
export const PACK_HEADS_BAD = ["dire-wolf", "two-hound"];
export const PACK_HEAD = "lead-dog";
export const PACK_DOG = "masterless-dog";
export const PACK_WOLF = "grey-wolf";
export const PACK_HYENA = "grave-hyena";

// ---- THE FEVER (dens) ----
// Off the fever graves, which have been standing on that ground since it
// shipped. ONE RULE, THREE HOOKS: on fevered ground NOTHING MENDS — rest, food
// and dressings all pay the same fraction. There is no cure to buy and nothing
// to fight; the answer is to leave, which is the whole point of putting it on
// the ground people LIVE on, and it is the only arc in the game whose counter
// is "go somewhere else".
export const FEVER_TELEGRAPH_MS = 60_000;
export const FEVER_ACTIVE_MIN_MS = 25 * 60_000;
export const FEVER_ACTIVE_MAX_MS = 45 * 60_000;
export const FEVER_AFTERMATH_MS = 12 * 60_000;
export const FEVER_MEND_MULT = 0.35;  // what rest, food and a bandage are all worth on bad ground
// ---- the small lives (rome, 2026-07-13): sleep, thirst, calls, and fear ----
// Nothing blanket: each need lands only where it CHARACTERIZES, and the
// refusals are design too — the dead never sleep, never drink, never call.
// SLEEP: warm blood dozes. Rats curl up anywhere quiet; the cutpurse catnaps
// only in his own crack; hyenas drop off on a full belly (scavengerFeeds
// rolls it — sleep is the other face of the meal-guard). Nothing naps with a
// stranger standing over it. Waking shares wakeListeners' one law (entry/
// noise odds, QUIET gear, the bell); a blow wakes instantly and the striker's
// hit rides the existing unaware/ambush multiplier — one heavy blow, never a
// coup de grace (the sentinel rouse law, reused).
export const NAPPERS = new Set(["rat", "fleet-rat", "albino-rat", "cutpurse"]); // hyenas nap via the gorge only
export const NAP_ODDS = 0.006;        // per idle 2s tick — a doze now and then, not a schedule
export const NAP_MIN_MS = 3 * 60_000; // a doze, not a hibernation
export const NAP_MAX_MS = 8 * 60_000;
export const GORGE_NAP_ODDS = 0.5;    // a hyena that just fed likely lies down on the bones
// THIRST: only the hyenas drink — a destination habit, never a meter. The run
// stays INSIDE the territory tether (a den with no water in reach simply
// doesn't have the habit — the leak law), one drinker at a hole at a time,
// and rain IS water (the run skips).
// Where a thirsty creature paths to. The road's two waters put the food web out
// on it — the ford is the only drinkable thing for a dozen rooms in either
// direction, which makes it the road's natural ambush, and the masterless dogs
// path to it on their own.
// The den ground's three: the mill pond behind its dam, the barrel-well on the
// waste, and the water in the bottom of the marl pit. A settlement is built
// around water before it is built around anything else, and the dens are the
// first band with no natural running water in them at all — every one of these
// is a thing somebody MADE hold water, which is the difference between the dens
// and everywhere else in the world.
export const WATER_ROOMS = new Set(["the-sally-ditch", "the-black-fen", "the-drowned-orchard", "well", "the-dry-moat",
  "the-shallow-ford", "the-flooded-quarry",
  "the-mill-dam", "the-shallow-well", "the-marl-water",
  // The fen, which is water with paths across it rather than land with water in
  // it. Every thirsty thing west of the fortress can now drink somewhere that
  // isn't the road's one ford — which was the only drinkable thing for a dozen
  // rooms and therefore the road's natural ambush.
  "the-open-water", "the-tussock-ford", "the-fen-gut", "the-quaking-flat"]);
export const THIRST_MIN_MS = 2 * 3_600_000;
export const THIRST_MAX_MS = 4 * 3_600_000;
// CALLS: one primitive, three meanings — prey calls AWAY (a fleeing rat's
// squeal fear-marks its room for the warren nearby), predators call TOWARD
// (a feeding grave-hyena laughs ONE adjacent packmate in; the dire is a
// loner and calls no one), thieves WARN (an escaped cutpurse whistles and
// the others shun the room a while — the dead tell no one). THE HARD LAW:
// a call never triggers another call (calledTo marks the summoned), and
// calls ride their own species channel, never creatureNoise — no cascades.
export const RAT_AVOID_MS = 2 * 3_600_000;    // a squeal-marked (or fled) room is shunned a couple hours
export const WHISTLE_AVOID_MS = 10 * 60_000;  // a warned thief keeps clear ten minutes
export const DINNER_LAUGH_ODDS = 0.35;
// PLACE-FEAR decays and dies with the creature — migration replaces the dead
// with amnesiacs, so the world never accumulates permanent fright. LURKERS
// read the traffic instead: every few hours an unseen one shifts its ambush
// to the born-dark room (tether-bound) with the freshest footprints — vary
// your route. It never moves under an eye, and torchlight still reveals it.
export const LURKER_DRIFT_MS = 3 * 3_600_000;
// The food web: who hunts (or drives off) whom. A predator sharing a room with
// prey it outranks may turn on it — when it's hungry, or when there's a kill or
// bait to fight over. Every predator genuinely outstats its prey (hp + dmg);
// the HOLLOW don't eat and aren't here. Same pure-data shape as BLEED_ODDS/PIERCE.
// Effect: predators thin the herds the brood-mothers swell, and a player can
// throw bait to start a scrap and slip past. Read/applied in ai.ts (predation).
export const PREYS_ON = new Map<string, Set<string>>([
  ["three-hound", new Set(["rat", "fleet-rat", "grave-hyena", "dire-hyena"])], // apex at the threshold — bullies all comers
  // A HYENA EATS MORE THAN RATS (rome, 2026-08-06: "we can just make heyans eat
  // another thing like a dear or fight with a wolf"). It used to eat vermin and
  // nothing else, and since rats live only under the keep that made the whole
  // line fortress-bound — the migration gate correctly refused every hyena a
  // destination, which is the gate telling you the ECOLOGY was too thin rather
  // than the gate being wrong. A hyena runs down deer and takes kills off other
  // hunters; that is what the animal IS. So it eats what it can catch, and the
  // big cousin bullies wolves the way the old boar does.
  ["dire-hyena", new Set(["rat", "fleet-rat", "grave-hyena", "roe-deer", "white-roe", "grey-wolf"])], // drives off the plain hyena AND the plain wolf: 45hp/armor against 26hp
  ["grave-hyena", new Set(["rat", "fleet-rat", "roe-deer", "white-roe"])],      // vermin when there is nothing better, deer when there is
  ["albino-rat", new Set(["rat", "fleet-rat"])],                              // apex vermin bullies its own kind
  ["grey-wolf", new Set(["roe-deer", "white-roe", "grave-hyena"])],           // the wood's own food web: wolves run deer, and you can walk into the middle of it. A pack also puts a lone plain hyena off a carcass — the dire one it does not (see dire-hyena)
  ["dire-wolf", new Set(["roe-deer", "white-roe", "wild-boar"])],             // the big cousin outstats a boar where a plain wolf does not — 52hp/5-9 against 34hp/3-6 (mig 148)
  ["old-boar", new Set(["grey-wolf", "dire-wolf"])],                          // "hunts OR DRIVES OFF": 70hp and armor 2 taking a carcass off wolves. The wood's apex short of the woodward
  ["lead-dog", new Set(["masterless-dog"])],                                  // the mean cousin drives off the plain one (same law as dire-hyena over grave-hyena) — and the only food web the road has
  // The pale hunters are the DEEP's rat-catchers: hungry, they leave their lurk
  // and range toward the rat-runs (lurkerDrifts), run one down (predation), and
  // go quiet again. A stretch of dark with no rats left is what starves one onto
  // your torchlight (starvingHunts).
  ["pale-crawler", new Set(["rat", "fleet-rat", "brood-rat"])],
  ["pale-stalker", new Set(["rat", "fleet-rat", "brood-rat"])],
]);
// THE PACK (rome, 2026-08-02: "multiple grey wolves beats old boar"). PREYS_ON
// is a stats table — every edge in it holds because the predator genuinely
// outstats the prey alone. That law is right and it makes wolves wrong: a wolf
// is not a thing that wins alone, it is a thing that wins in threes, and a wood
// where one wolf can never touch a boar no matter how many of them are standing
// in the room is a wood with no pack in it.
//
// So: prey a line can only take IN NUMBERS, and how many it takes. Counted by
// LINE, not by template — variantBase folds the dire wolf in with the greys,
// which is exactly right, because the dire wolf's whole description is that it
// runs with the pack and the pack is used to it. Two greys and a dire cousin is
// a pack of three.
//
// The escalation is honest against the statlines (migs 147-148 retuned both
// sides; the law holds, and the margins actually got CLEANER — a lone wolf is
// now well under a boar, so needing the pack is arithmetic, not a ruling):
//   2 wolves  = 52hp, 4-10   vs the wild boar  34hp, 3-6,  no armor
//   3 wolves  = 78hp, 6-15   vs the old boar   70hp, 5-8,  armor 2
// and the dire wolf needs one fewer, because it is worth about two of them.
//
// It reads both ways at once, which is the point: alone, a wolf is on the old
// boar's OWN prey list. Walk in on one wolf and a boar and you know how that
// ends. Walk in on four wolves and a boar and you do not.
export const PACK_PREY = new Map<string, Map<string, number>>([
  ["grey-wolf", new Map([["wild-boar", 2], ["old-boar", 3], ["grave-hyena", 2]])], // one wolf yields a carcass to a hyena; two do not
  ["dire-wolf", new Map([["old-boar", 2]])],
  ["grave-hyena", new Map([["roe-deer", 2]])],  // a lone hyena harries a roe; a pair brings it down
  ["dire-hyena", new Map([["grey-wolf", 2]])],  // ...and it takes two of them to push a wolf off a kill
]);
export const PREDATION_ODDS = 0.35; // chance/tick an eligible predator strikes a roommate
// Who turns on a PLAYER when starved past all patience (STARVING_AT). Kept apart
// from PREYS_ON on purpose: hunting a lone delver for meat isn't the same list as
// "eats which weaker mob." The surface hunters carry a prey map too, so they run
// down an easier animal first (starvingHunts defers to it); the deep's pale
// hunters have NO prey down there — near-equals, everything else bloodless — so
// for them starvation has nowhere to go but your torchlight. (three-hound is a
// SENTINEL and takes the room on its own terms — it stays out.)
export const STARVE_HUNTERS = new Set(["dire-hyena", "grave-hyena", "albino-rat", "pale-crawler", "pale-stalker", "masterless-dog", "lead-dog", "grey-wolf", "dire-wolf"]);
// The deep eats its own: strayed rats (and worse) die in the dark and rot where
// they fall, and the pale hunters scavenge the carrion. A dice mint (same law as
// the stone/torch — cadence × odds, no clock to farm) drops one fresh carcass into
// a random deep room every several hours, so a crawler's hunger has SOMETHING to
// find — but only one body at a time, so a quiet-enough stretch still starves a
// hunter onto your light. Never stacks a second body on a room that still has one.
export const CARRION_ROLL_MIN_MS = 2 * 3_600_000; // the world checks every 2–4h...
export const CARRION_ROLL_MAX_MS = 4 * 3_600_000;
export const CARRION_MINT_ODDS = 0.3;             // ...and ~1 in 3 checks drops a carcass — a body every several hours, on dice
// A HUNGRY pale hunter ranges wider and repositions far more often than the idle
// 3h lurk-drift — it's hunting, not lying in wait. Fed, it falls back to the slow
// territorial drift (LURKER_DRIFT_MS / TERRITORY_RADIUS).
export const LURKER_HUNT_RADIUS = 6;               // twice its normal territory, to reach the rat-runs
// A lurk is a solitary thing (rome, 2026-07-30: "the pale stalkers still all
// bunch up in the deep"). lurkerDrifts moves on its own path, not through
// creatureMoves, so it never saw CROWD_CAP — and BOTH its branches pick a
// single deterministic best room (the nearest prey, or the freshest-trafficked
// room in territory), so every lurker with an overlapping range computes the
// SAME answer and piles into it. This is that missing cap, and it counts only
// other LURKERS: the hunting branch is meant to close on prey, so counting
// every creature would stop a stalker ever reaching a rat.
export const LURKER_CROWD = 2;                     // a dark room already holding this many lurkers stops drawing more
export const LURKER_HUNT_DRIFT_MS = 40 * 60_000;   // ~40 min between hunting moves (vs the 3h idle drift)
export const STARVE_HUNTS_ODDS = 0.2; // chance/tick a STARVING predator with no easier prey begins its wind-up on a player sharing the room (low: the threshold + no-prey gate already make it rare)
export const WOUNDED_PREY_ODDS = 0.15; // chance/tick an eligible predator begins its wind-up on a BADLY HURT player (< WOUNDED_FRACTION hp), independent of the predator's own hunger — slightly rarer than the starving-hunt since it can fire on ANY eligible predator, not just a genuinely starved one
export const THIEF_ROB_ODDS = 0.35; // chance/combat-round a HUNGRY thief sharing a player's room begins its wind-up to rob them (higher than the starving-hunt: it's a non-lethal grab-and-bolt, and the whole point of a hungry thief)
export const SCAVENGER_HEAL = 6; // hp restored per corpse fed on
export const SCAVENGER_BOLD_AT = 3; // corpses eaten before it turns bold
export const SCAVENGER_CARRY_CAP = 3; // jaws only hold so much — gear it can drag off before it stops scooping
export const BOLD_DMG_MULT = 1.35; // a gorged scavenger swings harder

// ---- the deep-dwellers (built SOFT; every trick has an answer) ----
// DROWNERS grapple: a landed blow can SEIZE you — held fast (can't flee) and hit
// harder — until you wrench free or put the thing down. They never chase or flee;
// they hold their patch of water. Wade in on your own terms, or not at all.
export const DROWNERS = new Set(["the-drowned", "drowned-hulk", "drowned-god"]);
export const SEIZE_ODDS = 0.2;        // soft: a blow only sometimes takes hold
export const SEIZE_BREAK_ODDS = 0.5;  // soft: about half the time you wrench loose each beat
export const SEIZE_DMG_MULT = 1.25;   // it hits a little harder while it has you
// While it HAS you under, a drowned thing can drag you deeper: a lungful of black
// water that no armor turns — a bite of your very life (% of max hp), and it can
// drown you outright. The counter is escape: break the grip before it lands.
export const SEIZE_DROWN_ODDS = 0.10;     // rare per beat while seized
export const SEIZE_DROWN_FRACTION = 0.15; // unmitigated, as a share of max hp
// LURKERS wait UNSEEN — not in the room description at all — until they drop on
// you. Blind, they wake to noise and to the careless walking in (they ride the
// same wake odds as LISTENERS, WAKE_ENTER/WAKE_NOISE); stay quiet and still and
// one may let you pass. Once it strikes it reveals itself, and it's just a fight.
// The follower is the maze's signature: it is a LURKER, so it is not in the
// room until it drops on you, which is the only honest way to write a thing
// you never catch sight of. It lives in the lying cores, so it finds you at
// exactly the moment you have stopped knowing the way back.
export const LURKERS = new Set(["pale-crawler", "pale-stalker", "the-follower", "something-ahead"]);
// REVENANTS don't stay down: put one to 0 and it RISES ONCE, at part health, and
// comes again. The second death is the real one. A longer fight, not a lost one.
export const REVENANTS = new Set(["twice-dead", "thrice-dead", "marrow-king"]);
export const REVIVE_FRAC = 0.4;       // soft: it comes back weakened
// How many times a revenant gets back up before the fall is real. Default 1
// (twice-dead, marrow-king); the cairn-wight rises twice.
export const RISE_LIMIT: Record<string, number> = { "thrice-dead": 2 };
// How the hollow come apart when they run. The living just bleed.
export const HURT_STYLE: Record<string, { out: string; in_: string }> = {
  // THE SURFACE MOVES LIKE ITSELF (2026-08-02). Every road and wood creature was
  // missing from this table, so all eighteen fell through to the generic
  // damage-class lines and fled and arrived identically — the whole new half of
  // the world moved like one animal. A thing's retreat should tell you what it
  // is as loudly as its attack does.
  "masterless-dog": { out: "bolts {dir}, tail down, keeping low to the ground.", in_: "comes in fast and low, head down." },
  "lead-dog": { out: "gives ground {dir} still facing you, and only turns at the last.", in_: "walks in and stops, square on, waiting." },
  footpad: { out: "is over the verge and gone {dir} before you can close.", in_: "steps in off the verge with the blade already out." },
  wayman: { out: "goes {dir} at a walk, without hurrying, which is somehow worse.", in_: "comes in unhurried, blade held low and easy." },
  "road-carrier": { out: "walks off {dir} at the pace it always keeps.", in_: "walks in at a steady pace and does not break it." },
  "roe-deer": { out: "breaks {dir} in one bound and is simply not there.", in_: "comes through in a rush, all legs and panic." },
  "white-roe": { out: "walks {dir}, unhurried, and does not look back.", in_: "steps in, stands, and looks directly at you." },
  "grey-wolf": { out: "gives ground {dir}, circling, never turning its back.", in_: "comes in at a trot, low and wide." },
  "dire-wolf": { out: "falls back {dir} at a walk, untroubled by the idea.", in_: "comes in, and the room is smaller for it." },
  "wild-boar": { out: "wheels and crashes off {dir} through the brush.", in_: "comes through the brush without slowing." },
  "old-boar": { out: "backs {dir} a few steps with its tusks up, daring you.", in_: "comes in straight and does not stop." },
  "the-follower": { out: "goes {dir} — the step you had been hearing, leaving.", in_: "arrives a fraction after the sound of it does." },
  "something-ahead": { out: "goes {dir}, and is somehow ahead of you again.", in_: "is here before the sound of it is." },
  "charcoal-burner": { out: "walks {dir}, soot falling off him as he goes.", in_: "comes in with the billhook trailing at his side." },
  "the-woodward": { out: "withdraws {dir} at a walk, axe at the trail.", in_: "walks in and looks at what you are doing on his ground." },
  "the-keeper-of-the-holding": { out: "gives back {dir} across his own hall floor.", in_: "comes across the hall floor to meet you." },
  "the-mire-walker": { out: "wades off {dir}, the water closing behind it.", in_: "comes up out of the wet and in." },
  "warden-surface": { out: "falls back {dir}, armor grinding.", in_: "bursts in, grinding." },
  skeleton: { out: "flees {dir} in a clatter of loose bone.", in_: "bursts in, rattling loose." },
  "bone-knight": { out: "withdraws {dir} in a grind of mail and bone.", in_: "strides in, mail grinding." },
  warden: { out: "flees {dir}, armor grinding.", in_: "bursts in, grinding." },
  "warden-captain": { out: "gives ground {dir}, harness shrieking.", in_: "bears in, harness shrieking." },
  "last-watchman": { out: "withdraws {dir} at a march, unhurried even now.", in_: "marches in, boots keeping time." },
};

// ---- the language of the fight ----
// Every landed blow used to read the same ("You hit X for N"); a long fight
// was a wall of identical lines. Now each strike draws a verb from a pool
// chosen by the weapon in hand — an edge cuts, a bludgeon cracks, a fist
// clouts — and each creature answers in its own register (teeth, cold hands,
// dead bone, a thief's knife). The numbers are unchanged; only the telling
// varies. Verbs are written to sit cleanly before " for N": "You <verb> for N".
export const PLAYER_HIT: Record<"edge" | "blunt" | "spear" | "fist" | "plain", string[]> = {
  // a cutting weapon (it draws blood — bleed > 0)
  edge: [
    "cut into {n}", "slash {n}", "hack at {n}", "lay {n} open", "carve into {n}",
    "score a line across {n}", "open {n} up", "draw steel across {n}",
  ],
  // a crushing weapon (it rings things senseless — stun > 0)
  blunt: [
    "crack {n}", "smash into {n}", "batter {n}", "club {n} down", "hammer {n}",
    "stave {n} in", "drive {n} back with a blow", "catch {n} a heavy blow",
  ],
  // a reaching or thrusting weapon (has some other edge — sweep/speed)
  spear: [
    "run at {n}", "drive into {n}", "thrust into {n}", "punch through {n}'s guard",
    "catch {n} on the point", "lunge into {n}",
  ],
  // bare hands
  fist: [
    "clout {n}", "crack {n} with a fist", "rap {n}", "hammer {n} bare-knuckled",
    "catch {n} across the jaw", "drive a fist into {n}",
  ],
  // a plain weapon with no special property
  plain: [
    "strike {n}", "hit {n}", "catch {n}", "land a blow on {n}", "drive into {n}",
    "beat at {n}", "chop into {n}",
  ],
};
// The vitals-lottery killing blow. A body has more than one place that ends it,
// and each weapon reaches a different set of them (rome, 2026-07-12: "the game
// is a simulation"). So each entry is a PAIR — the killer's account and the
// victim's, of the SAME wound. They're picked together (pickVitals), never
// independently: the man who opens a throat must not be told he caved a skull.
// `hit` completes "You ___" ({n} = the target; NEVER a pronoun, since {n} is a
// beast as often as a wanderer). `taken` is the loser's second person, and
// closes in the dark. Register by weapon: pierce (picks) > edge (anything that
// bleeds) > blunt (anything that stuns) > spear (fast/reaching) > plain (steel
// that just cuts — most swords and axes live here) > fist (bare hands).
// NOTE the hollow are gated upstream (a skeleton has no liver to find): only a
// blunt blow ends bare bone, so the soft-tissue kills never fire on them.
export const VITALS_KILLS: Record<"pierce" | "edge" | "blunt" | "spear" | "fist" | "plain", { hit: string; taken: string }[]> = {
  // A narrow point: it goes IN — the temple, the eye, under the jaw, the heart.
  pierce: [
    { hit: "punch the point through {n}'s temple",
      taken: "The point punches through your temple, and everything simply stops." },
    { hit: "run the point up under {n}'s jaw",
      taken: "The point drives up under your jaw and keeps going. You never feel it arrive." },
    { hit: "drive the point through {n}'s eye",
      taken: "It takes you through the eye, and the dark is instant and total." },
    { hit: "punch the point through {n}'s breastbone, into the heart",
      taken: "It punches through your breastbone and into the heart. Two beats, and no third." },
    { hit: "drive the point in at the base of {n}'s skull",
      taken: "The point goes in at the base of your skull. Everything below your neck stops answering." },
    { hit: "find the gap in {n}'s guard and drive through",
      taken: "It finds the gap you didn't know you'd left, and drives in to the haft." },
  ],
  // A cutting edge: the throat, between the ribs, under them, the low back, the
  // great vein of the thigh. The knife-fighter's map.
  edge: [
    { hit: "open {n}'s throat",
      taken: "A line of cold opens across your throat, and the warmth leaves faster than your hands can catch it." },
    { hit: "slip the edge between {n}'s ribs, into the heart",
      taken: "The edge slides between two ribs and finds your heart. The room folds shut around it." },
    { hit: "drive it up under {n}'s ribs, into the liver",
      taken: "It goes in under your ribs and drags. Everything warm in you starts leaving at once." },
    { hit: "put it in low, into {n}'s kidney",
      taken: "A cold punch low in your back — and the pain is so total there's no room left for anything else." },
    { hit: "lay open the great vein in {n}'s thigh",
      taken: "The edge opens the big vein in your thigh. You go grey in seconds, and the floor comes up to meet you." },
    { hit: "cut deep into the side of {n}'s neck",
      taken: "The cut goes deep in the side of your neck, and you hear your own breath whistle out of the wrong place." },
  ],
  // Weight and crush: bone driven into whatever it was caging. Skull, temple,
  // the back of the head, the neck, the ribs, the breastbone.
  blunt: [
    { hit: "stave in {n}'s skull",
      taken: "The blow caves your skull — one white crack of light, and then nothing at all." },
    { hit: "crush {n}'s temple with the fall of it",
      taken: "It catches you at the temple. The world snaps sideways and goes out like a pinched wick." },
    { hit: "break {n}'s neck with one falling blow",
      taken: "Something in your neck gives with a wet crack, and no limb you own answers again." },
    { hit: "cave {n}'s ribs into what they were caging",
      taken: "Your ribs stave inward into what they were caging. There is no breath left anywhere to find." },
    { hit: "bring it down on the back of {n}'s head",
      taken: "It lands at the base of your skull. The lights go out well before the pain arrives." },
    { hit: "drive the head of it through {n}'s breastbone",
      taken: "The weight of it drives your breastbone in, and your heart stops under the ruin of it." },
  ],
  // Reach and thrust: it goes THROUGH — heart, lung, throat, belly and out.
  spear: [
    { hit: "run {n} through the heart",
      taken: "The point runs you through the heart, and the room folds shut around it." },
    { hit: "punch through {n}'s ribs and into the lung",
      taken: "It punches through your ribs into the lung. You drown standing up, on dry stone." },
    { hit: "put the point clean through {n}'s throat",
      taken: "The point goes clean through your throat. You reach for it, and your hands don't answer." },
    { hit: "run {n} through the belly and out the back",
      taken: "It runs you through the belly and out the back, and pins something that mattered." },
    { hit: "drive the point up beneath {n}'s ribs",
      taken: "The point drives up beneath your ribs and finds the pump. It quits on the spot." },
  ],
  // Bare hands: the neck, the windpipe, the temple, the throat, and the long grey
  // patience of a grip that doesn't open.
  fist: [
    { hit: "snap {n}'s neck",
      taken: "Hands take your head and turn it too far. A dry crack, and nothing below it works." },
    { hit: "crush {n}'s windpipe",
      taken: "A hand crushes your windpipe — you claw for a breath that will not come, and the dark takes it." },
    { hit: "drive the heel of your hand into {n}'s temple",
      taken: "The heel of a hand catches your temple, and the lights go out mid-thought." },
    { hit: "drive a fist into {n}'s throat",
      taken: "Knuckles drive into your throat, and the air is simply gone." },
    { hit: "get your hands round {n}'s throat and keep them there",
      taken: "Hands close on your throat and do not open. The grey comes in from the edges, and then it's all grey." },
  ],
  // Plain steel that cuts and chops — most swords and axes. It takes heads, it
  // splits, it runs through.
  plain: [
    { hit: "take {n}'s head off at the neck",
      taken: "The steel takes your head from your shoulders. A brief, tumbling brightness — and then nothing." },
    { hit: "split {n} from the collarbone down",
      taken: "The blade splits you from the collarbone down, and everything inside you comes loose at once." },
    { hit: "run {n} through the heart",
      taken: "The steel goes in and finds your heart. The room folds shut around it." },
    { hit: "lay {n}'s throat open",
      taken: "The edge lays your neck open; you reach for it, and the reaching is the last thing you do." },
    { hit: "open {n}'s belly with one long cut",
      taken: "One long cut opens your belly, and you are holding yourself together with hands that will not grip." },
    { hit: "split {n}'s skull to the jaw",
      taken: "The blade splits your skull to the jaw, and the world ends between one breath and none." },
  ],
};
// How a STRANGER's kit reads at a glance — an impression, never a grade
// (rome, 2026-07-12: "the actual quality of the gear is too revealing, make it
// descriptive"). You can see that a man's gear is hard-used; you cannot see
// that his mail is three blows from failing — that would hand you his breaking
// point for free. So no per-piece condition tags on another wanderer: one
// sentence, drawn from the AVERAGE state of everything they wear and wield.
// (Your OWN kit still shows its exact wear — you know your own gear.)
// Bands are floors, richest first; the finder takes the first one it clears.
export const KIT_TELLS: { at: number; lines: string[] }[] = [
  { at: 85, lines: [
    "Their kit is clean and sound — someone has the coin, or the sense, to keep it that way.",
    "Nothing they carry looks as though it has failed them yet.",
  ] },
  { at: 60, lines: [
    "Their gear shows honest use, and no more than that.",
    "The kit is worn in rather than worn out.",
  ] },
  { at: 35, lines: [
    "Their kit is scarred and hard-used — this one has been down here a while.",
    "Everything on them is scratched, dented, and mended at least once.",
  ] },
  { at: 15, lines: [
    "Their gear is going: straps sprung, edges rolled, every piece a little wrong.",
    "The kit is failing on them, and they must know it.",
  ] },
  { at: 0, lines: [
    "Their kit is all but ruined — it looks ready to come apart at the first hard blow.",
    "What they carry is held together by habit and luck, and not much of either.",
  ] },
];
// The finality tacked onto a vitals verb (attacker's side), varied so the
// rarest kill in the game doesn't always end on the same four words. No
// pronoun — reads the same over a man or a beast.
export const VITALS_KICKER = [
  " — a killing blow.", " — struck home, and clean.", " — and that ends it, all at once.",
  " — no rising from that.", " — and the fight's over between heartbeats.", " — killed clean.",
];
// The blackout coda for a creature's vitals kill (the beast's verb comes from
// CREATURE_VITALS; this is where the lights go out).
export const VITALS_DARK = [
  "and the world goes white, then goes out.", "and everything rushes away into the dark.",
  "and there's a bright, brief pain, then nothing.", "and the black closes over you all at once.",
];
// Phase 3 — the sim speaks. Each weapon swings in its OWN voice (by item id),
// layered over the family pools above (fallback for anything unlisted). The
// verb sits before " for N": "You <verb> for N". {n} is the target. Naming the
// weapon in the verb is the point — a war-pike skewers, a crow-beak punches a
// hole, a shiv slips in — so every blade reads as itself, not "a weapon".
export const WEAPON_VERBS: Record<string, string[]> = {
  // — light & bone —
  "sharpened-rib": ["jab the rib into {n}", "work the splinter into {n}", "stick {n} with the sharpened rib"],
  "bone-shiv": ["slip the shiv into {n}", "stick {n} with the shiv", "open {n} up with the shiv"],
  "throwing-shard": ["slash {n} with the shard", "draw the shard across {n}", "nick {n} with the shard"],
  // — plain steel —
  "rusted-sword": ["hack at {n}", "cut into {n}", "chop the old sword into {n}"],
  "chipped-falchion": ["slash the falchion across {n}", "hack at {n}", "chop into {n}"],
  "graveblade": ["hew into {n} with the graveblade", "bring the graveblade down on {n}", "cleave into {n}"],
  "notched-greatsword": ["hew into {n} with the greatsword", "bring the greatsword down on {n}", "cleave {n} near in two"],
  "kings-guard-blade": ["drive the guard-blade through {n}", "hew into {n}", "cut {n} down with the king's blade"],
  "headsman-sword": ["bring the headsman's sword down on {n}", "hew into {n}", "cleave into {n}"],
  // — cutting edges (bleed) —
  "fleshing-knife": ["draw the fleshing-knife across {n}", "flay at {n}", "open {n} with the knife"],
  "crawlers-hooks": ["rake the hooks across {n}", "tear at {n} with the hooks", "hook into {n} and pull"],
  "gaff-hook": ["sink the gaff into {n}", "hook the gaff into {n}", "drag the gaff across {n}"],
  "widow-maker": ["draw the widow-maker across {n}", "slip the widow-maker into {n}", "flick the widow-maker over {n}"],
  // — cleaving & sweeping —
  "rust-eaten-cleaver": ["cleave into {n}", "hack the cleaver through {n}", "swing the cleaver across {n}"],
  "rusty-billhook": ["hook the billhook into {n}", "drag the billhook across {n}", "catch {n} with the hook"],
  "headtaker-axe": ["hew into {n} with the axe", "chop the headtaker into {n}", "cleave at {n}"],
  "reaver-glaive": ["sweep the glaive through {n}", "carve the glaive across {n}", "cut {n} down with the glaive"],
  // — reach & thrust —
  "quarterstaff": ["crack the staff across {n}", "jab the staff into {n}", "rap {n} with the quarterstaff"],
  "pitted-spear": ["drive the spear into {n}", "run the spear at {n}", "catch {n} on the spear-point"],
  "war-pike": ["run the pike into {n}", "skewer {n} on the war-pike", "drive the pike through {n}"],
  "abyssal-harpoon": ["drive the harpoon into {n}", "run the harpoon through {n}", "skewer {n} on the harpoon"],
  // — punching points (pierce) —
  "rusted-pick": ["punch the rusty point into {n}", "drive the pick at {n}", "hook the rusted pick into {n}"],
  "horsemans-pick": ["punch the pick into {n}", "drive the pick at {n}", "hook the horseman's pick into {n}"],
  "crow-beak-pick": ["punch the crow-beak into {n}", "drive the beak at {n}", "hook the crow-beak into {n}"],
  "sword-breaker": ["jab the sword-breaker into {n}", "catch {n} on the sword-breaker", "stab at {n}"],
  // — crushing (stun) —
  "loose-rock": ["crack the rock into {n}", "smash the stone against {n}", "cave at {n} with the rock"],
  "hammerstone": ["bring the hammerstone down on {n}", "club {n} with the stone", "drive the hammerstone into {n}"],
  "splintered-cudgel": ["club {n} with the cudgel", "batter {n}", "crack {n} across the skull"],
  "studded-maul": ["hammer {n} with the studded maul", "batter {n} down", "crack the maul into {n}"],
  "warden-maul": ["bring the warden-maul down on {n}", "hammer {n}", "crush {n} under the maul"],
  "flanged-mace": ["crush {n} with the flanged mace", "bring the mace down on {n}", "stave {n} in"],
  "marrow-scepter": ["crack the scepter across {n}", "hammer {n} with the scepter", "shatter the scepter into {n}"],
};
// The trait-tell: a short clause the swing appends when a MECHANIC actually
// fires this beat, so the prose reads out the system — a point through plate, a
// wound that won't clot. (Stun keeps its own line for the thud; crit trumps all.)
// Plate language belongs ONLY to the hollow — they're the ones in old steel.
// A living thing's armor is hide and muscle, so every tell splits by target:
// no rock ever "caves the plate" of a hyena (rome's audit, 2026-07-10).
export const PIERCE_TELL = [
  "the point finds the gap in its plate", "the narrow point punches through",
  "it slips past the armor", "plate can't turn a point like that", "the point bites past the guard",
];
export const PIERCE_TELL_FLESH = [
  "the point slips between the ribs", "it sinks deep where the hide runs thin",
  "no hide turns a point like that", "the point finds the soft beneath the shoulder",
  "it goes in far too easily",
];
// A blunt weapon against a living thing: weight against meat and bone.
// (Its bone cousin below keeps the dry voice for the hollow.)
export const BLUNT_TELL = [
  "something cracks deep under the weight of it", "ribs flex and give beneath the blow",
  "tough hide is no answer to a blow like that", "it lands with a wet, heavy crunch",
  "the whole flank shudders under it",
];
// The same crushing blow against the HOLLOW: there's no flesh under that plate,
// only old bone — the crush speaks bone, never meat (rome's audit, 2026-07-10).
export const BLUNT_TELL_BONE = [
  "the blow caves the plate", "old bone cracks beneath the steel",
  "something snaps dry under the weight of it", "the frame beneath the armor gives with a crunch",
  "steel buckles, and the bone under it goes with it",
];
// How a beaten thing runs tells you what beat it: an edge leaves a trail, a
// weight leaves a broken gait, a point leaves it stuck and leaking. Per-mob
// HURT_STYLE (the drowned's wet exits) outranks these; the fleet-rat's
// whole-bodied dart outranks everything. {dir} is the way out.
export const FLEE_TELL: Record<string, { out: string[]; in_: string[] }> = {
  edge: {
    out: [
      "flees {dir}, trailing blood.",
      "breaks and runs {dir}, a red line following it across the stone.",
      "staggers away {dir}, dripping where the edge opened it.",
      "bolts {dir}, slick and shining with its own blood.",
    ],
    in_: ["bursts in, bleeding.", "staggers in, leaving red on the stones."],
  },
  blunt: {
    out: [
      "drags itself {dir}, something broken inside.",
      "lurches away {dir}, moving all wrong where the weight landed.",
      "staggers {dir}, wheezing through what the blow caved in.",
      "hauls itself {dir}, one side hanging useless.",
    ],
    in_: ["lurches in, broken-gaited.", "staggers in, holding itself wrong."],
  },
  pierce: {
    out: [
      "flees {dir}, hunched around the hole in it.",
      "staggers away {dir}, leaking from somewhere deep.",
      "bolts {dir}, the wound in it whistling wet.",
      "scrambles {dir}, stuck deep and leaving a thin dark trail.",
    ],
    in_: ["staggers in, hunched around a deep wound.", "scrambles in, leaking."],
  },
  plain: {
    out: [
      "breaks and flees {dir}, beaten.",
      "scrambles away {dir}, wanting no more of it.",
      "turns and runs {dir}, beaten bloody.",
      "flees {dir}, ragged and done.",
    ],
    in_: ["scrambles in, beaten and wild-eyed.", "staggers in, running from something."],
  },
};
export const BLEED_TELL = [
  "the wound weeps and won't close", "the cut runs deep and stays open",
  "it opens, and keeps bleeding", "blood follows the blade back out", "the gash won't clot",
];
// A cutting edge on a HOLLOW thing finds nothing to open — no blood, no bleed
// (they leave a remains-trace, not a wound). Fires only sometimes, so the
// player learns the lesson without a line every swing: bring blunt to the bone.
export const BONE_DRY_TELL = [
  "no blood in it to spill", "the edge finds nothing to open",
  "dry bone drinks the cut and gives nothing", "there's nothing in it left to bleed",
];
// The stagger-punish flavor, edge's version: pierce/blunt already read this
// moment through PIERCE_TELL/BLUNT_TELL (their armor-ignore was already
// live, just bigger this swing); edge needed its own line, since this is the
// only time an edge weapon's direct hit ever bypasses armor at all.
export const STAGGER_EDGE_TELL = [
  "it's still off-balance — the cut goes in clean, armor or not",
  "still reeling from its own overreach, it never turns the blade",
  "caught flat-footed, the edge finds nothing in its way",
];
// Kept small and sharp — one of these caps a critical hit, player or creature.
export const CRIT_FLOURISH = [
  " — a savage blow!", " — and it tells!", " — clean through!", " — a brutal stroke!",
  " — everything behind it!", " — and something gives!",
];
// How each kind of thing lands a blow ON you. Keyed by behaviour family, so a
// new creature inherits its kin's register the moment it joins a Set.
export const CREATURE_HIT = {
  teeth: [
    "sinks its teeth into you", "snaps at you and tears", "bites deep", "savages you",
    "rakes you with its claws", "worries at you", "sets its jaws in you",
  ],
  bone: [
    "rakes bony fingers across you", "strikes with a rusted edge", "batters you",
    "catches you with a dead hand", "hacks at you", "swings its old iron into you",
  ],
  water: [
    "crushes down on you", "drags you against the cold stone", "batters you with a swollen limb",
    "closes its weight on you", "hauls at you", "grinds you under",
  ],
  knife: [
    "opens a thin line across you", "cuts you", "nicks you deep", "slashes at you",
    "slips its blade past your guard", "scores you",
  ],
  plain: [
    "hits you", "strikes you", "catches you a blow", "lands a blow on you",
    "gets past your guard", "beats you back",
  ],
} as const;
// The vitals-lottery killing blow, in the same register as CREATURE_HIT (teeth /
// bone / water / knife / plain) so the death reads like the thing that dealt it —
// a hound's jaws find the throat, a hollow's iron finds the heart. Picked by
// creatureVitals(); phrases complete "{The mob} ___".
export const CREATURE_VITALS = {
  teeth: [
    "closes its jaws on your throat", "tears your throat out", "finds the great vein of your neck",
    "sets its teeth in your throat and does not let go",
  ],
  bone: [
    "drives rusted iron up under your ribs", "punches a dead blade through your heart",
    "finds the gap in you with cold edge", "buries its old iron in your chest",
  ],
  water: [
    "crushes the last breath from you at once", "closes its cold weight over your throat",
    "grinds something vital out of you", "folds you under and does not let up",
  ],
  knife: [
    "slips its blade between your ribs, into the heart", "opens your throat with one clean draw",
    "finds the killing line and takes it", "slides steel past your guard, deep",
  ],
  plain: [
    "lands a blow that finds something vital", "catches you where it kills",
    "strikes true, and deep", "finds the one place that ends it",
  ],
} as const;
// Which register a creature swings in. Order matters — first match wins.
export const BITERS = new Set([
  "rat", "fleet-rat", "brood-rat", "albino-rat", "grave-hyena", "dire-hyena", "pale-crawler", "pale-stalker",
  "three-hound", // three sets of teeth at the throat of the deep
  "two-hound",   // two sets, same throat
]);

// SENTINELS hold their post. A guardian chained to one room: it never wanders
// (live tick or offline sim), and noise doesn't lure it off station. The
// hound bloodline holds the throat of the deep — usually the three-headed
// keeper, once in a while its two-headed runt cousin (mob_variants).
// Membership here is load-bearing beyond behavior: a sentinel arrival spawns
// AT its post instead of walking in from a mouth it could never leave.
export const SENTINELS = new Set(["three-hound", "two-hound"]);

// AGGRESSIVE creatures set on ANY wanderer who crosses into their room — no
// grudge, no meal, no wake needed — and hold their post to do it (they don't
// wander off, and noise won't lure them away). A living hazard chained to a
// place: the last watchman, who bars his turret to everyone who is not him.
// The boar holds its rooting ground and commits at whatever walks into it —
// the one room in the honest band you cannot cross casually. The keeper holds
// the hall floor of the holding for the same structural reason the watchman
// holds his turret: it is his.
export const AGGRESSIVE = new Set(["last-watchman", "wild-boar", "old-boar", "the-keeper-of-the-holding"]);

// TREASURY DOORS: a room that is some boss's hoard, keyed by the keeper who
// bars it. The way IN stays shut while that keeper lives in the room before it
// — you don't slip past a king into his grave-wealth, you put him down and walk
// in over the body (the exit itself carries no key; the KEEPER is the lock).
// The way OUT is never barred — nobody gets sealed in with the gold.
export const TREASURY_DOORS = new Map<string, string>([
  ["kings-hoard", "forgotten-king"],
]);

// The sentinel lines name their heads, and the runt has one fewer to lift.
// Quantifier phrase, so it drops into prose whole ("all three heads low and
// watching" / "both heads low and watching").
export const HOUND_HEADS = new Map<string, string>([
  ["three-hound", "all three heads"],
  ["two-hound", "both heads"],
]);
// Rooms a sentinel holds ALONE — nothing ordinary crosses the threshold, not
// even a boss (like a gate, but a guarded doorway). The undercroft is the
// hound's post: it spawns/migrates there and never wanders out, and nothing
// else drifts in through the stairs. Add a room here if it gets a lone guardian.
export const SENTINEL_ROOMS = new Set(["undercroft"]);
// Rooms with a real altar — the only places a regrown offering reads as "on the
// altar." Everywhere else, a renewing torch/bandage/herb/bone just turns up on
// the floor again (rome, 2026-07-19: the altar line was the regrow catch-all and
// leaked to ~20 altarless rooms — a torch "on the altar" at the gate). Add a
// room here only if it genuinely has an altar a gift could lie on.
export const ALTAR_ROOMS = new Set(["shrine", "chapel", "the-buried-chapel", "the-silt-chapel"]);
// A roused sentinel stays up this long. Asleep you slip past (and rouse it);
// awake it bars the way down until it's killed or drops back to sleep. Every
// fresh disturbance (a passer, a blow) resets the clock, so a busy deep keeps
// its hound awake.
export const HOUND_WAKE_MS = 900_000; // 15 minutes

// FEARS_FIRE — a creature that will not face an open flame: cornered by a
// fire-bearer it breaks and runs rather than fight. Pre-wired for the Light &
// search phase (torches / the `light` property). It hangs on carriesFire()
// (zone.ts), which reads whether a player holds any FIRE_ITEMS. No lit-fire item
// exists YET, so FIRE_ITEMS is empty and this whole behaviour sleeps until the
// light system lands — at which point one id in FIRE_ITEMS wakes it. The albino
// rat is the first of the timid: strong enough to maul you in the dark, but it
// remembers being a rat the instant it sees flame.
// THE WOOD IS AFRAID OF FIRE (rome, 2026-08-03: "most of the mobs in the new
// woods... the ones that make sense"). 63 of the wood's 87 bodies, and the line
// between in and out is whether the thing would run from a flame in a real wood:
//
//   IN — the animals. Deer bolt from fire, wolves have been kept off by a
//   campfire for as long as there have been campfires, and a boar wants nothing
//   to do with it either. Their rare bloods come with them (a dire wolf is still
//   a wolf). And the ROOT-THING, which is the one that isn't an animal but is
//   the most obvious of all: it is dry wood and old roots walking, and fire is
//   simply what ends it.
//
//   OUT — the charcoal burner, because burning wood is his TRADE and a man who
//   sleeps beside a smouldering stack does not flinch at a torch. The
//   mire-walker, because it comes out of standing water with the bog still
//   running off it — there is nothing on it to catch. And the three that hold
//   ground on purpose: the woodward, who coppiced and burned this wood himself,
//   and the keeper of the holding. A boss that runs from a stick isn't a boss.
//
// Left out on purpose, one word from rome away: THE FOLLOWER (and its
// something-ahead blood). It fits the fiction — the thing that keeps to the
// dark and is never quite seen would plausibly keep its distance from a flame —
// but it is the wood's whole dread, and 8 of them exist, and a torch would
// switch all of them off at once. That's his call, not mine.
//
// What keeps this from making the wood a walk: the hooded lantern is NOT fire
// (carriesFire, ai.ts — the shutter tames it), so the long light doesn't scare
// anything. A torch clears your path but burns out fast and costs your shield
// guard; a lantern lets you see for three torches' worth and leaves the wood
// exactly as dangerous as it was. And you can't hunt what runs from you: pelts,
// haunches and tusks now come to whoever walks in by lantern-light, or by none.
export const FEARS_FIRE = new Set([
  "albino-rat",
  "roe-deer", "white-roe",       // the wood's food, and it survives by leaving
  "grey-wolf", "dire-wolf",      // the oldest reason there are campfires
  "wild-boar", "old-boar",
  "root-thing",                  // dry wood on the move: fire is what ends it
]);
// Items that count as an open flame in hand ON THEIR OWN (always burning). Still
// empty — the torch isn't here: a torch is fire only while LIT, which is session
// state (litUntil), so carriesFire() reads that too. This set stays for a future
// ever-burning brand. FEARS_FIRE now wakes off a lit torch. (Light phase, 057.)
export const FIRE_ITEMS = new Set<string>([]);
// The lightless deep: rooms named for their dark, and now they mean it. Enter one
// without a lit light source and you see NOTHING — no room, no exits, no way to
// map it. A torch reveals it. (057; search/flood/map-blackout are follow-ons.)
export const DARK_ROOMS = new Set([
  "blackreach", "the-lightless-march", "the-gasping-dark", "black-threshold", "black-canal",
  "the-crawl-of-teeth", "the-earth-throat", // the warrens' lightless squeezes (058)
  "the-long-swallow", "the-tide-throat", "the-silt-chapel", "the-still-cradle", // the Tideways' drowned half (069)
  // The holloway (2026-08-01): sunk between root walls with the leaf canopy
  // closed over it. Dark at noon, not just at night — the one room on the road
  // that needs a torch in daylight, and it is the last room before the wood.
  "the-holloway",
  // The den ground's two lightless rooms, and both are INDOOR dark rather than
  // canopy dark: a turf hut has no window by construction, and the wheel pit is
  // under the mill's floor. Everything else in the dens has sky or a shutter.
  "the-black-hut", "the-wheel-pit",
  // The fen's two lightless places, and unlike everywhere else in the world
  // being caught here without a light is a drowning rather than a delay: the
  // dead alders stand thick enough to shut out noon, and the grave drain is a
  // stone channel you walk bent double.
  "the-dead-alders", "the-grave-drain",
]);
// The 058 blocks, named for the MAP's display regions only — game logic (chest
// tiers, ambience fallback) still reads them as "upper" via regionOf. The map
// tells you where you ARE; the sim doesn't care what the copyist labels it.
export const GROUNDS_ROOMS = new Set([
  "the-causeway", "the-old-road", "the-burned-village", "the-gatefall", "the-dry-moat",
  "the-wall-breach", "the-thorn-court", "the-mass-grave", "the-briar-field",
  "the-hanging-hill", "the-black-fen", "the-drowned-orchard", "the-sally-ditch",
]);
export const OVERWORKS_ROOMS = new Set([
  "the-wall-walk", "the-watch-turret", "the-bell-cote", "the-broken-battlement",
  "the-leaning-spire", "the-rotted-scaffold", "the-weepers-crown",
]);
export const WARRENS_ROOMS = new Set([
  "the-root-gnawed-run", "the-rat-warren", "the-crawl-of-teeth", "the-gnaw-hollow",
  "a-dry-burrow", "the-dripping-gallery", "the-bone-midden", "the-hyena-den",
  "the-undermine", "the-earth-throat", "the-sewer-slip", "the-buried-chapel",
  "bone-nook", // A Gap in the Bones — moved off the midden (079); safe rooms in this set are display/flavor only, every event actor filters safeRooms
]);
// THE FOOD WEB'S FLOOR (rome, 2026-07-18): the dungeon feeds its own. A hungry
// rat or thief standing in this muck-country — the warrens' fungus, carrion's
// scraps, the gate thresholds' regrowing forage — gnaws the ROOM itself to
// survive (no item consumed, a nibble's worth of heal). This is the primary
// producer that runs with NO players around and through offline catch-up, so
// the whole web (rats → hyenas, pale hunters, thieves) doesn't starve to the
// bone between visits. Gate thresholds (world.entryRooms) are folded in by code
// — they're a runtime set, not known here. Grazers only: carnivores keep to
// corpses and prey (a hyena doesn't chew fungus).
// WHERE A GRAZING THING CAN EAT THE ROOM ITSELF — the floor of the whole food
// web, and the thing that keeps it alive with nobody watching.
//
// This was the fortress's muck-country only, and the two hundred rooms shipped
// this morning had NOTHING IN THEM TO EAT (rome, 2026-08-02). Every ground spawn
// in the game is in the fortress, and forage was warrens + carrion, so a roe
// deer in a WOOD — surrounded by more browse than exists anywhere else in the
// world — could never once feed, and neither could a boar. They crossed hungry,
// stayed hungry, and the wolves ate the only thing that could.
//
// So bands declare themselves forage ground the same way they declare
// themselves outdoors (OUTDOOR_REGIONS), and their rooms fold into this set at
// world load. The wood is the obvious one; the road's verges are grass and hedge
// and count too. Kept a Set of ids rather than a predicate because the hunger
// walk reads it per-exit while choosing where to go.
// The dens count: fields gone back to grass, a common that was grazed by
// everyone, an orchard still dropping windfalls. It is the most food-per-room
// on the surface and it holds almost nothing that eats — which is the shape of
// a place people left.
export const FORAGE_REGIONS = new Set<string>(["road", "wood", "den"]);
export const FORAGE_ROOMS = new Set([...WARRENS_ROOMS, ...CARRION_ROOMS]);
// WHO EATS THE GROUND. Was the bare union VERMIN + THIEVES, written inline at
// two call sites — which quietly left the boar out, and a boar is a rooting
// animal before it is anything else. Named here so the next grazer is one line
// and not a hunt through ai.ts.
export const GRAZERS = new Set<string>([
  "rat", "fleet-rat", "brood-rat", "roe-deer", "white-roe",   // VERMIN
  "cutpurse", "cutthroat", "footpad", "wayman",               // THIEVES — they scavenge, not graze, but same floor
  "wild-boar", "old-boar",                                    // rooting, which is what a boar is FOR
]);
export const FORAGE_HEAL = 3; // a scavenged nibble — less than a corpse (SCAVENGER_HEAL 6) or a dropped meal
// The open sky: every room where weather can reach you (the grounds ring +
// the overworks rooftops). The room-events engine (events.ts) reads this for
// rain; anything indoor — keep, warrens, deep — is cover.
export const OUTDOOR_ROOMS = new Set([...GROUNDS_ROOMS, ...OVERWORKS_ROOMS]);
// Bands that are outdoors by their nature — every room of them is folded into
// OUTDOOR_ROOMS at world load (see init()), so weather, fog, cold, crows and
// the night dark reach them without anyone listing a thousand room ids. The
// wood counts: a canopy is a roof you still get rained through, and its own
// dark is a matter for DARK_ROOMS, room by room.
// ---- THE DENS (mig 162) — see den.ts for what each of these means ----------
// SIX BUNKS, which was rome's own proposal and the roadmap's one open question
// on it ("six bunks per den — confirm or change"). Six is the number that makes
// the DOOR the scarce thing and the bed abundant behind it: six roofs on this
// ground house thirty-six nomads, so nobody is locked out of the world for want
// of property, and the thirty-seventh still has to find somebody who will take
// them in. One-room-one-nomad was the thing this number exists to avoid.
export const DEN_BUNKS = 6;
// GEAR IN A DEN IS UNLIMITED (rome, 2026-08-03). This cap governs everything
// that ISN'T gear — food, rock, trophies, keys — twelve slots counted the
// lockbox's way. The split is what makes the den a different institution from
// the vault rather than a bigger copy of it:
//
//   THE VAULT   hard cap, sealed against time, open at any of eight gates.
//               CONVENIENCE, paid for in scarcity.
//   THE DEN     endless for gear, fifty rooms out, nothing sealed against
//               anything (food ages, iron wears), and the hold lapses if you
//               stop coming home. CAPACITY, paid for in the walk.
//
// An endless larder would be a food faucet and an endless rock pile a scrap
// faucet; a wall of hung armour is the whole point of having somewhere to put
// your things. So: gear free, the rest capped.
export const DEN_CAP = 12;
// A fortnight of not coming home and an UNBARRED hold falls in. This is the
// whole upkeep system: no rent, no meter — the only question it asks is whether
// you still live here.
//
// It used to apply to every den, on the argument that a ghost mustn't squat one
// of six finite doors. Mig 172 made a room a site rather than a slot, so that
// scarcity stopped existing and the clock was left punishing nothing but a
// player taking a fortnight off (rome, 2026-08-07). Now the bar decides: a door
// somebody paid iron to shut stays shut, a frame nobody finished falls in. See
// den.lapsed.
export const DEN_LAPSE_MS = 14 * 24 * 3_600_000;
// WAKING AT YOUR OWN DOOR (rome, 2026-08-07). Death normally hands you back at a
// gate; a small share of the time it hands you back home instead. Deliberately
// SMALL — a den you woke at reliably would be a respawn point, and the walk back
// out to where you died is most of what dying costs. At one in eight it's a
// mercy that happens, not a route you can plan around.
export const DEN_WAKE_CHANCE = 0.125;
// What a bar and its sockets cost. Iron is the deep's and the forge's currency,
// which is the point: the thing that makes your house safe has to be carried out
// of somewhere dangerous, so security is EARNED and never issued.
// WHAT THE SHELF COSTS (mig 165). Carried steel rusts at RUST_PER_TICK — about
// 1.8 condition an hour, ~55 hours from new to nothing. A den is indoors and
// put away, so it is a QUARTER of that: leave a plate on the shelf for a week
// and it comes off notched; leave it the full fourteen days it takes the hold
// itself to lapse and it comes off wrecked. Which is the right pairing — the
// house and the things in it fall down on the same clock.
export const DEN_RUST_PER_HOUR = 0.45;
// AND IT NEVER GOES. Floors below GEAR_FAILING_AT (12), so a long-abandoned
// piece reads as barely holding together and says so — and above zero, always.
// The ordinary wear path deletes at 0; the shelf cannot reach it. A floored
// piece is a bench job, not a loss: a den charges upkeep on what you hoard, it
// does not confiscate it.
export const DEN_RUST_FLOOR = 8;
export const DEN_BAR_IRON = 2;
export const DEN_BAR_SCRAP = 3;

export const OUTDOOR_REGIONS = new Set<string>(["road", "wood", "mountain", "den"]);
// ...AND THE ROOMS INSIDE THEM THAT ARE NOT. A band declares itself outdoors as
// a whole, which was true enough while the outdoor bands were a road and a wood.
// The dens are the first band that is mostly weather and partly ROOF — a smithy,
// a mill, a chapel with a stone roof, a turf hut — and rain falling on a man
// sitting inside a building with the door shut is simply wrong. This is the
// per-room exception the fold has always said belonged in a static set.
//
// It also closes a standing bug: the wood's Charcoal Hut and Withy Hut have been
// rained on and gone dark with the sky since the wood shipped, and both of them
// are hideaways — the two rooms in that region where being under cover is the
// entire point of the room.
export const INDOOR_ROOMS = new Set<string>([
  "the-charcoal-hut", "the-withy-hut",                                  // the wood's two boltholes
  "the-smithy", "the-reeves-house", "the-reeves-loft", "the-north-house", // the Field End
  "the-bare-chapel", "the-mill", "the-wheel-pit",
  "the-black-hut", "the-warreners-lodge", "the-lodge-loft",             // the Waste
]);
// A day/night world-clock (rome, 2026-07-22): every OUTDOOR room only, deep/
// warrens/keep are always their own dark regardless. Deliberately faster than
// a real day — a full cycle every DAY_CYCLE_MS — so a single play session
// actually sees both halves instead of always catching the same one. Derived
// from Date.now() modulo: zero persisted state, perfectly synced across every
// player, survives a deploy or a hibernation gap with no drift to correct.
// Read via isNight() (zone-util.ts) at exactly two dials: isDark() (night
// outdoors reads dark same as any other dark room — torches, lurkers, every
// existing blind rule inherits it for free) and scavengerBold() (night is
// hunting weather for outdoor scavengers, same slot as rain/fog).
export const DAY_CYCLE_MS = 4 * 3_600_000; // 2h day, 2h night
// The moon is a SLOWER clock riding on top of the day/night one, same
// "scheduled, not rolled" law as the bell and the tide — no dice, just a
// bigger modulo. Every MOON_FULL_EVERY-th night is full: `isDark()` (zone.ts)
// skips its outdoor-night check on those nights specifically, so a full moon
// genuinely lights the grounds instead of just being a flavor label. One full
// moon roughly once a day (6 * DAY_CYCLE_MS's 4h night-halves).
export const MOON_FULL_EVERY = 6;
// Predators hunt harder after dark: a straight multiplier on the two
// wind-up odds (STARVE_HUNTS_ODDS, WOUNDED_PREY_ODDS), same shape as the
// bell's bellWakeMult — never a new mechanic, just the existing roll made
// more likely. OUTDOOR rooms + night only (nightHuntMult, zone-util.ts);
// day/night has no opinion indoors at all, so this doesn't either.
export const NIGHT_HUNT_MULT = 1.6;
// THE WORLD'S CLOCKS (the simulation's law, rome 2026-07-11): two tracks.
// The BELL is scheduled — a keep rings its bell at its own hours, twice a day,
// and a player can learn them. Everything else is ROLLED: one die, every few
// hours, picks ONE event from the whole pool — four to six a day, never a
// schedule, so the world surprises. An arc that isn't mid-run parks at
// "never"; only the roll (or the bell's hours) starts one.
// HOW OFTEN THE WORLD DOES SOMETHING (rome, 2026-08-06: "then figure out how
// many events happens"). It was 3-6h — about five rolls a day — and that number
// was set when one arc at a time locked the WHOLE world, so five a day was five
// a day everywhere. It is now one arc per GROUND, and the pool went from 12 to
// 17, so five rolls spread across eight grounds is almost nothing. Measured, at
// the old cadence:
//
//   the wood ..... 2.3 arcs/day, something happening  6% of the time
//   the dens ..... 2.1 arcs/day,                      6%
//   the road ..... 1.8 arcs/day,                      5%
//   the deep ..... 0.8 arcs/day,                      1%
//   the warrens .. 0.6 arcs/day,                      1%
//
// A player with an hour to spend saw weather roughly never. At 1-2h it is 16
// rolls a day and the surface bands run 18-19% — about one session in five has
// something in it, which is what "the world has weather" should mean. It is not
// louder in any one place than the old number was: the same ground carries the
// same single arc; there is simply more world now, and the die has to cover it.
//
// THE UNDERGROUND IS STILL THIN (2-5%) and that is a CONTENT gap, not a clock
// one: the deep has two arcs, the warrens two, the keep one, and none of them
// catch the outdoor weather. More rolls cannot fix that — more arcs down there
// can. Noted, not papered over.
export const ROLL_EVERY_MIN_MS = 1 * 3_600_000; // between rolls: 1-2h -> ~16/day across 8 grounds
export const ROLL_EVERY_MAX_MS = 2 * 3_600_000;
export const ROLL_FIRST_MIN_MS = 20 * 60_000; // a fresh world proves its sky within the hour
export const ROLL_FIRST_MAX_MS = 60 * 60_000;
export const ROLL_GRACE_MS = 10 * 60_000; // a roll slept past by more than this happened unobserved
export const ROLL_MISSED_MIN_MS = 15 * 60_000; // ...and the next one lands mid-cycle, not instantly-on-login
export const ROLL_MISSED_MAX_MS = 1 * 3_600_000;
// Rain (the room-events opener, 067): telegraph -> active -> aftermath.
export const RAIN_TELEGRAPH_MS = 2 * 60_000; // the iron-grey light before the first drops
export const RAIN_ACTIVE_MIN_MS = 8 * 60_000;
export const RAIN_ACTIVE_MAX_MS = 12 * 60_000;
export const RAIN_AFTERMATH_MS = 15 * 60_000; // mud: deep tracks, quick forage
export const RAIN_NOISE_MASK = 0.5; // odds an outdoor sound simply drowns in the rain
// The bell (keep, SCHEDULED): one warning note, then the ringing — and while
// it rings the keep hears EVERYTHING (quiet gear included; a bell outshouts
// felt soles). It rings near these UTC hours, never to the minute.
export const BELL_HOURS_UTC = [1, 13];
export const BELL_JITTER_MS = 20 * 60_000; // the ringer is not a clock
export const BELL_GRACE_MS = 15 * 60_000;  // an hour slept past rang unobserved
export const BELL_TELEGRAPH_MS = 30_000; // the single note, hanging
export const BELL_ACTIVE_MS = 90_000;    // the ringing — ninety bad seconds
export const BELL_AFTERMATH_MS = 10 * 60_000; // the halls stay unsettled
export const BELL_AFTERMATH_WAKE_MULT = 1.5;
// The boil (warrens event): a den overflows and a tide of rats pours down one
// corridor — a moving hazard you stand aside from. The tide itself is
// transient (a deploy dissolves it mid-run; the warrens shrug).
export const BOIL_TELEGRAPH_MS = 60_000; // the squeaking swells
export const BOIL_STEP_MS = 15_000;      // the tide holds each room this long
export const BOIL_AFTERMATH_MS = 5 * 60_000;
export const BOIL_BITE = 1; // hp per tick while you stand in the tide (flee or climb clear)
// Corpse-wake (warrens): "the dead don't stay down tonight." Fresh death-
// litter (blood, remains) is the beacon: where something fell lately, the
// warrens' own buried dead pull themselves up through the floor for the
// window — then drop where they stand. Camp your killing floor and your kills
// send for company. No fresh dead, no wake: the listening simply passes.
export const WAKE_TELEGRAPH_MS = 90_000; // every hollow thing stops at once, listening
export const WAKE_ACTIVE_MS = 10 * 60_000;
export const WAKE_AFTERMATH_MS = 5 * 60_000;
export const WAKE_FRESH_MS = 90 * 60_000; // how recent a death still calls
export const WAKE_CAP = 4; // at most this many rise per wake
// The keeper's want (gate): chalked on the hatch, one named good counts
// double in trade for the window — a pull event, the only weather that
// gives you somewhere to GO. The table is all honest gatherables: fen fishing,
// hyena hunting, warrens rats, bone-country trinkets.
export const WANT_TABLE = ["cave-fish", "pale-eel", "hyena-fang", "rat-sinew", "bone-charm",
  "fistful-teeth", "verdigris-scale", "hound-fang", "finger-bone", "linen-dressing"];
export const WANT_MULT = 2;
export const WANT_TELEGRAPH_MS = 2 * 60_000;
export const WANT_ACTIVE_MS = 50 * 60_000; // long enough to hunt for
export const WANT_AFTERMATH_MS = 5 * 60_000;
// The escaped thing: the Gaunt gets loose from under the keep and walks the
// world for the window — announced by a cry the whole zone hears, telegraphed
// room to room by everything else fleeing ahead of it. Kill it for its pelt
// (the keeper prizes it), or read the emptying rooms and stay out of its way.
// If nothing puts it down, it answers some call and pours back into the dark.
export const ESCAPE_TMPL = "the-gaunt";
export const ESCAPE_TELEGRAPH_MS = 2 * 60_000;
export const ESCAPE_ACTIVE_MS = 60 * 60_000;
export const ESCAPE_AFTERMATH_MS = 5 * 60_000;
export const ESCAPE_STRIDE_MIN_MS = 20_000; // it strides, it doesn't graze
export const ESCAPE_STRIDE_MAX_MS = 40_000;
export const ESCAPE_ROUSE_MS = 8_000; // it fixes on you first — get out, or hit first
// Marsh lights (the wet ground): pale lights out over the water that read
// exactly like a carried torch, and careful footsteps that read exactly like
// a player keeping to the water's edge. Nothing attacks. The event is doubt.
export const LIGHTS_ROOMS = new Set(["the-black-fen", "the-drowned-orchard", "the-causeway"]);
export const LIGHTS_TELEGRAPH_MS = 60_000;
export const LIGHTS_ACTIVE_MS = 18 * 60_000;
export const LIGHTS_AFTERMATH_MS = 2 * 60_000;
export const LIGHTS_STEP_MIN_MS = 45_000; // cadence of the false footsteps
export const LIGHTS_STEP_MAX_MS = 90_000;
// Fog (outdoors): the anti-rain — milky air, spot odds down BOTH ways: the
// world half-misses you (wake odds cut) and you half-miss it (creature tells
// unreadable — every shape in the fog keeps its secrets). Scavengers hunt in
// it. Unlike rain, the traces STAY: the stalker's weather.
export const FOG_TELEGRAPH_MS = 90_000; // the air goes milky from the fen up
export const FOG_ACTIVE_MIN_MS = 10 * 60_000;
export const FOG_ACTIVE_MAX_MS = 15 * 60_000;
export const FOG_AFTERMATH_MS = 2 * 60_000;
export const FOG_WAKE_MULT = 0.5; // the fog swallows half of what would spot you
// Cold snap (outdoors + deep): clear and bitter. Torches burn double-fast
// (lit ones lose half their remaining flame when it bites; the lantern's oil
// doesn't care), resting barely holds (half the ticks heal nothing), and the
// living den up — while the HOLLOW keep walking, because nothing in them
// feels it. A quiet, safe-looking window that taxes your supplies; the free
// tell is which silhouettes are still moving.
export const COLD_TELEGRAPH_MS = 90_000;
export const COLD_ACTIVE_MIN_MS = 10 * 60_000;
export const COLD_ACTIVE_MAX_MS = 15 * 60_000;
export const COLD_AFTERMATH_MS = 3 * 60_000;
export const COLD_TORCH_MULT = 0.5; // a torch lit (or caught) in the cold burns half as long
export const COLD_REST_SKIP = 0.5; // odds a resting tick heals nothing in the cold
// The breach: the map itself is the event. Stone groans in two rooms that
// share a wall in the fiction (the telegraph), then the wall gives and an
// exit exists that isn't supposed to — for a window — then the rubble
// settles. Exits are data; creatures use the hole like anyone. The pair list
// is HAND-PICKED under the law of pairs (never across the deep-heart lock,
// never into a vault/hoard, an entry, or a safe hideaway); rome passed all
// eight 2026-07-11. Directions chosen to collide with no standing exit.
export const BREACH_PAIRS: { a: string; aDir: string; b: string; bDir: string }[] = [
  { a: "library", aDir: "east", b: "scriptorium", bDir: "west" },            // the book country joins
  { a: "forge", aDir: "east", b: "undercroft", bDir: "west" },               // the cellars meet; the descent stays keyed
  { a: "chapel", aDir: "down", b: "crypt-steps", bDir: "west" },             // the chapel floor gives onto the crypt stair
  { a: "the-mass-grave", aDir: "south", b: "the-hanging-hill", bDir: "north" }, // the grave ground slumps into a gully
  { a: "the-dry-moat", aDir: "south", b: "the-mass-grave", bDir: "north" },  // the moat bank collapses into the grave-pits
  { a: "the-hyena-den", aDir: "west", b: "the-earth-throat", bDir: "east" }, // the den's back wall goes
  { a: "the-lightless-march", aDir: "down", b: "the-undertow", bDir: "north" }, // the corridor floor drops to the water country
  { a: "the-cold-hearth", aDir: "south", b: "the-death-cell", bDir: "east" }, // two dead ends behind the throne
];
export const BREACH_TELEGRAPH_MS = 90_000; // groaning stone, sifting dust — get clear or get ready
export const BREACH_ACTIVE_MS = 10 * 60_000; // the passage stands open
export const BREACH_AFTERMATH_MS = 10 * 60_000; // fresh rubble, a scar in the wall
// The exhale (deep): the deep breathes out — a cold current no open flame
// survives. Torches gutter, torches won't catch; the hooded lantern's
// shuttered flame shrinks to a bead and holds (its second argument, after the
// storm). No new teeth: a lightless deep is ambush weather the LURKERS
// already know how to use.
export const EXHALE_TELEGRAPH_MS = 90_000; // the drips stop; every flame leans
export const EXHALE_ACTIVE_MS = 9 * 60_000;
export const EXHALE_AFTERMATH_MS = 5 * 60_000;
// The marrow-song (deep): a bone-voice hums one held note and every hollow
// thing below stands entranced — wake odds zero, feet still — the loot
// corridor nobody trusts. The flesh-things (drowners, crawlers) are agitated
// by it instead. After, the bones remember themselves, and are twitchy.
export const SONG_TELEGRAPH_MS = 60_000;
export const SONG_ACTIVE_MS = 10 * 60_000;
export const SONG_AFTERMATH_MS = 3 * 60_000;
export const SONG_AFTER_WAKE_MULT = 2; // the unsettled after, same shape as the bell's
// The crows (outdoors): carrion birds settle on every high thing and call out
// whatever crosses the open ground — everyone under the sky hears where you
// moved. Anti-stealth, fully diegetic: the world tells on you.
export const CROWS_TELEGRAPH_MS = 60_000;
export const CROWS_ACTIVE_MS = 25 * 60_000;
export const CROWS_AFTERMATH_MS = 60_000;
export const CROWS_THROTTLE_MS = 15_000; // one cry per mover per this window
export const TORCH_ITEM = "torch";
export const TORCH_BURN_MS = 10 * 60_000; // a lit torch throws light this long, then gutters out (the run's clock)
// The hooded lantern (065): the explorer's light. It burns three times a torch
// and isn't spent on lighting — but a shutter and a horn pane make it a TAME
// flame: it never wakes the fire-fear (ai.carriesFire skips it). Torch = short,
// aggressive, a weapon against the timid; lantern = long, patient, and the
// dark's things don't flinch. Each lighting costs LANTERN_WEAR condition, so a
// fresh lantern holds five burns; the last burn spends the lantern itself.
export const LANTERN_ITEM = "hooded-lantern";
export const LANTERN_BURN_MS = 30 * 60_000;
export const LANTERN_WEAR = 20;
// The longbrand (088): the rare torch — the hammerstone's pattern on fire.
// Garrison-made for the night watch: heartwood dipped and dipped again until
// the pitch sealed, it burns BRAND_BURN_MS — two and a half torches on one
// spark — and it is still an OPEN flame (fire-fear wakes, weather drowns it,
// litSource stays "torch"). Better at a torch's one job; nothing else.
// No fixed spawns (the hammerstone's law: no spot to farm): the world rolls
// on its own cadence and sometimes coughs one up into fire-keeping country —
// hearths, watch posts, the places the garrison kept its light. The seal
// keeps the damp out too: a strayed brand never sods (it's deliberately absent
// from STRAY_DECAY, so the stray law skips it). It doesn't stack against PACK_TORCH_CAP —
// the cap rations the common stick, and the world only ever holds one brand.
export const BRAND_ITEM = "longbrand";
export const BRAND_BURN_MS = 25 * 60_000;
export const BRAND_HAUNTS = [
  "the-cold-hearth", "smokehouse", "guardroom", "warden-post",
  "the-watch-turret", "the-wall-walk", "barracks", "the-buried-chapel",
  "scriptorium", "the-bell-cote",
];
export const BRAND_GROUND_CAP = 1; // at most one lying unfound — rare stays rare
export const BRAND_ROLL_MIN_MS = 3 * 3_600_000; // the world checks every 3–6h...
export const BRAND_ROLL_MAX_MS = 6 * 3_600_000;
export const BRAND_MINT_ODDS = 0.25;            // ...and 1 check in 4 mints — ~1 a day, on dice

// ---- gear traits (the 045 audit expansion): properties, not bigger numbers ----
// Every trait is a one-line hook into a system the simulation already runs.
// Stats live in D1 (045); WHAT a piece does lives here, the FEARS_FIRE pattern.
// REACH: a haft held at length blunts the ambush — a grudge-holder's entry
// first-strike loses its AMBUSH_MULT against a wielder set to receive.
// THE TRAIT LEDGER (098): gear abilities live in the DATA now — a `traits`
// column on item_templates ("wall,thorns:2"), parsed at world-load, read via
// world.trait()/hasTrait(). The old code Sets are gone; migration 098 carried
// their membership verbatim onto the rows. New gear = new rows, no code.
// The tags and their laws (tuning constants stay HERE, one per law):
//   reach     — strikes past the front line ('attack ... from behind')
//   pierce:N  — the point punches plate: ignores N of a mob's armor. Distinct
//               from the edge that opens flesh and the weight that caves bone
//               (rome, 2026-07-17); forged-warspike (092) pierces WITHOUT the
//               piercing class tag below — old, deliberate asymmetry.
// A blunt weapon (stun > 0) ignores this much armor — crushing weight caves plate
// the way a point slips it. Flat, categorical (every blunt weapon), unlike the
// per-weapon PIERCE map. The mace was history's answer to armor; so it is here.
// Restored 1 -> 2 (rome, 2026-07-19): the load law made blunts the HEAVIEST
// weapons (stun adds a point of weight), so 2 is earned now, not free — and it
// lets blunt be the anti-heavy RPS counter it's meant to be, which at 1 it
// couldn't (couldn't actually cave plate). The PICKS stay distinct: lighter, and
// their 2-3 pierce still tops out above a mace's flat 2.
export const BLUNT_ARMOR_IGNORE = 2;
// Punishing an overreach (rome, 2026-07-22): when a creature's OWN swing goes
// wide (the FUMBLE_CHANCE/dodge branch, "swings wide"/"overreaches"), it's
// briefly off-balance (Creature.staggerUntil) — the player's very next
// landed hit gets a bonus, keyed to the weapon's own damage-shape so every
// class has a real answer, not just blunt. One hit only, whichever weapon
// lands it — consumed the instant it's used. The window just needs to
// comfortably reach the player's NEXT swing (players go first each round —
// a miss this round is caught on the next one, never the same beat).
export const STAGGER_WINDOW_MS = 6000; // ~1.5 rounds at COMBAT_ROUND_MS
export const STAGGER_STUN_BONUS = 0.25; // blunt: straight add to the stun roll
// pierce/edge: extra armor-ignore for that one hit — same size as blunt's OWN
// permanent BLUNT_ARMOR_IGNORE. For edge this is new capability, not a bump:
// an edge weapon's direct hit otherwise NEVER ignores armor at all (bleed is
// its usual answer to armor, never the swing itself).
export const STAGGER_ARMOR_BONUS = 2;
// cleave: no armor-ignore analog fits — sweep's whole identity is "more
// targets," and one foe's own opening doesn't create more of them. A flat
// damage bump instead, same slot as honed's +1 but bigger since it's earned.
export const STAGGER_CLEAVE_DMG_BONUS = 2;
//   two-handed — wants both hands; no shield alongside it (enforced at equip)
//   padded    — a mob's stun rings you half as often (PADDED_STUN_MULT). Best
//               piece counts; the trait is a boolean, it never stacks.
export const PADDED_STUN_MULT = 0.5;
// Stun tuning lives in the DATA, not in code multipliers (rome, 2026-07-12,
// after the Emberknock stun-chain): migration 073 halved every weapon's stun
// stat at the source. One number per weapon, no special-case laws. Bosses
// were never stunnable (is_boss); the padded coif halves what reaches a head.
// The wound wards, split by what the fiction can honestly promise:
//   wardhide — thick hide pads the whole body: bleeds AND leg-rakes turned
//   mailward — riveted rings turn edges only: a cut skates, but a hyena can
//              still yank the leg out from under the mail.
// Both roll SEPARATELY from guarded stance, so hide under a guard stacks to a
// quarter (WARDHIDE_WOUND_ODDS is the shared roll).
export const WARDHIDE_WOUND_ODDS = 0.5;
// Per-hit chance a bleeder actually opens a wound — bleed is no longer guaranteed
// on every landed hit (that stacked far too hard, a pack of hyenas kept you
// permanently weeping). Tiered by threat: a scabby rat's filthy teeth rarely bite
// deep; the deep's pale kin and the hound's jaws often do. Rolled BEFORE the
// guarded/wardhide defenses, so those still cut it further. A bleeder with no
// entry here falls back to every-hit (openWound), so a future one is never
// silently declawed — but every current bleeder is listed.
export const BLEED_ODDS = new Map<string, number>([
  ["rat", 0.10],           // scabby rat — filthy teeth, a wound now and then
  ["grave-hyena", 0.15],
  ["dire-hyena", 0.175],
  ["albino-rat", 0.15],
  ["pale-stalker", 0.20],
  ["pale-crawler", 0.225], // the deep's worst biters
  ["three-hound", 0.30],   // the sentinel's jaws — the wound that ignores armor opens more often now (085)
  ["two-hound", 0.20],     // the runt's jaws — fewer, not gentler
  ["cutthroat", 0.30],     // the thin knife — "does not mind cutting you open on the way"
  // THE SURFACE, LISTED (2026-08-02). The comment above says every current
  // bleeder is listed, and it was true until this morning: I shipped twelve
  // bleeders on the road and in the wood and put NONE of them here, so every one
  // of them fell through to the every-hit fallback and opened a guaranteed wound
  // on every landed blow. Mig 140 then raised their damage from a mistaken 0.3
  // to a real 1-3, which turned a harmless bug into the hardest thing about the
  // surface. Tiered against the ladder above, not invented.
  ["masterless-dog", 0.12],      // a dog's teeth: dirty, not deep
  ["lead-dog", 0.15],            // older, bigger, and it has done this before
  ["grey-wolf", 0.18],           // wolves work the same wound over
  ["dire-wolf", 0.22],           // the same jaws, half again the size
  ["wild-boar", 0.20],           // tusks go in and come up
  ["old-boar", 0.25],            // tusks grown past any use for rooting
  ["the-follower", 0.20],        // level with the deep's pale kin, which is what it is
  ["something-ahead", 0.25],
  ["the-mire-walker", 0.20],
  ["wayman", 0.30],              // a knife, held low and easy — the cutthroat's rate, and the same reason
  ["the-keeper-of-the-holding", 0.25],
  ["the-woodward", 0.30],        // the hardest thing on the surface, level with the hound's jaws
]);
// HOBBLE: leg-goers can hamstring you on a hit — a per-hit chance, tiered by
// threat (only things that go low: hyenas at the legs, the hound, the deep's
// crawlers/stalkers). A hobbled player can still flee, but only after limping
// clear (HOBBLE_FLEE_MS); cured by rest. Sibling of BLEED_ODDS, applied in
// maybeHobble. One affliction instance, not a framework (see ROADMAP).
export const HOBBLE_ODDS = new Map<string, number>([
  ["grave-hyena", 0.05],
  ["pale-stalker", 0.06],
  ["dire-hyena", 0.08],
  ["pale-crawler", 0.08],
  ["three-hound", 0.10], // the sentinel drags you down by the leg
  ["two-hound", 0.08],   // the runt goes low too, with less weight behind it
]);
export const HOBBLE_FLEE_MS = 4000; // ~1 combat round of limping before you break away
// The VITALS LOTTERY — the Tarkov headshot (ROADMAP: lethality keystone). A rare,
// random killing hit that ignores hp AND gear; armor over the vitals only buys the
// per-hit odds DOWN toward the base rate, never to zero. Designed from cumulative
// per-run odds (a per-hit % is meaningless alone — 2-5%/hit ≈ 99% death per run):
// 1/3000 armored -> ~1/1500 naked ≈ 6%/12% of runs at ~200 hits. Threat-gated so
// trash NEVER rolls it — only the deep's real threats + the hound + bosses, which
// protects the first run (a rat can't lottery your kit away). PvP half waits on
// PvP existing (none built yet); VITALS_PVP is ready for that day. Rolled in
// vitalsLottery (zone.ts). Deliberately random — overrides the old "never random"
// line; the randomness IS the equalizer (see ROADMAP lethality entry).
export const VITALS_PVE = 1 / 3000;   // per-hit base (armored floor); naked = 2x via armor scaling
export const VITALS_PVP = 0.005;      // the day came (2026-07-11): 0.5% armored -> 1% naked, per landed blow
// ---- PvP: steel between wanderers ----
// The anti-grief is systemic or it is nothing: witnesses = the sound system,
// evidence = blood on the killer (below), weak fresh keys = the sybil wall,
// and no dice ever punish the aggressor.
export const MANCATCHER_PVP_HOBBLE = 0.25; // vs players the barbs HOBBLE, never hold — flee stays the victim's out
export const BLOOD_FRESH_MS = 2 * 3_600_000;  // man-blood, and it looks fresh
export const BLOOD_DRY_MS = 12 * 3_600_000;   // dried to brown; still not a beast's
export const BLOOD_FADE_MS = 36 * 3_600_000;  // when the skin finally forgets (the ledger of the hands)
export const VITALS_ARMOR_FULL = 11;  // total armor that counts as 'fully covered' (a max kit)
export const VITALS_THREATS = new Set<string>([
  "three-hound", "two-hound", "pale-stalker", "pale-crawler", "the-drowned", "drowned-hulk",
  "marrow-cantor", "warden-captain", "forgotten-king", "marrow-king", "drowned-god",
]);
// The PLAYER side of the vitals lottery. Bosses are the designed wall — never.
// Every other mob can fall to a lucky killing blow (its own armor buys the odds
// down, VITALS_PVE base). The three-hound is the exception between: it only falls
// this way to a PIERCING weapon — you drive the point through its throat — and
// even then rarely (VITALS_HOUND). Rewards bringing the right tool to the sentinel.
//   piercing  — the vitals CLASS (not the armor value): the three-hound falls
//               only to these (VITALS_HOUND), and the flee-voice reads it.
export const VITALS_HOUND = 1 / 5000; // the sentinel's tiny pierce-only vitals chance
//   quiet     — LISTENER wake odds halved while worn (felt says nothing to the bones)
export const QUIET_WAKE_MULT = 0.5;
//   slick     — a drowned grip takes hold half as often, and breaks easier
export const SLICK_SEIZE_MULT = 0.5;
export const SLICK_BREAK_BONUS = 0.25; // added to SEIZE_BREAK_ODDS
//   strapped  — everything lashed down: the cutpurse's fingers find no purchase
//   thorns:N  — a blocked blow costs the attacker N (the buckler's spike answers)
//   mancatcher — (065) the barbed snare-pole fills the shield hand with DENIAL,
//               not defense: a creature your catcher is on cannot flee (the
//               18%-hp bolt, the runner's dash, even fire-panic — the collar
//               holds them all). Zero block: you traded your guard for the
//               guarantee. PvP RULE, stamped now for later: against PLAYERS the
//               barbs must HOBBLE (HOBBLE_FLEE_MS limp), never hard-hold — flee
//               is the victim's only out in a full-loot game, and a hard hold
//               is a griefing tool.
//   riposte:N — (065) an off-hand blade that answers what it turns: a caught
//               blow opens a bleed of N on the attacker (BLEED_TICKS as usual).
//               thorns's cousin on the other axis: burst vs armor-ignoring
//               drip. HOLLOW attackers don't bleed, same as everywhere.

// ---- THE TRAIT LOTTERY (099): rolls for breadth, templates for legends ----
// A fresh piece of world-loot may enter the world carrying ONE rolled trait on
// top of its template's own — most roll nothing. This turns a small catalog
// into a whole loot table: one scavenger's coat template shows up plain, or
// felt-lined (quiet), or boiled (wardhide), each a real mechanical difference,
// not a reskin. The keeper's stock never rolls (bought gear is dependable), and
// the roll only ever ADDS a trait a piece could plausibly have — structural
// traits that DEFINE a piece (wall, reach, two-handed, pierce, mancatcher,
// riposte, thorns) are never in the pool. Only traits with a live system hook
// and a slot-honest fiction sit here; a new ability becomes rollable the day it
// joins its slot's list. Read via rolledMap ∪ the template (wearsTrait, 099).
export const TRAIT_ROLL_ODDS = 0.18; // odds a fresh gear drop carries a rolled trait at all
export const TRAIT_POOL: Record<string, string[]> = {
  feet:  ["quiet", "slick"],            // felt-lined tread, eel-greased sole
  // staunched and hooded joined the pool the day the wood learned to make them
  // (2026-08-03) — a moss-packed lining, a hood deep enough to light under.
  cloak: ["quiet", "slick", "strapped", "staunched", "hooded"],
  armor: ["padded", "wardhide", "strapped", "staunched"], // quilted, boiled, buckled, packed
  helm:  ["padded"],                    // an arming cap sewn in
  // Weapons (2026-07-21): six item-instance properties, none of them the
  // structural traits (reach/pierce/two-handed/mancatcher/riposte) that DEFINE
  // what a weapon is — those stay hand-authored, never in the pool. Four
  // classes, symmetric: one class-EXCLUSIVE trait apiece (sharpens whatever
  // that weapon already is) plus two that are class-OPEN (any weapon at all)
  // — 3 possible rolls per weapon, no matter which class it's cut from.
  // Checked in WEAPON_CLASS_TRAIT (below), enforced in zone.ts's rollTraits.
  //   keen     — EXCLUSIVE, edged (bleed > 0): +1 effective bleed.
  //   weighted — EXCLUSIVE, blunt (stun > 0): +1 on top of BLUNT_ARMOR_IGNORE.
  //   needling — EXCLUSIVE, pierce (pierce > 0): +1 pierce.
  //   cleaving — EXCLUSIVE, cleave (sweep > 1): one more foe per landed swing.
  //   balanced — OPEN, any weapon: a point lighter in the hand (load law
  //              only, dmg untouched).
  //   honed    — OPEN, any weapon: a flat +1 to the blow that lands.
  weapon: ["keen", "balanced", "honed", "weighted", "needling", "cleaving"],
};
// Which class a class-locked weapon trait may land on — absence here means
// "any weapon" (keen/balanced/honed). Checked in rollTraits so the roll never
// wastes itself on a weapon it can't do anything for.
export const WEAPON_CLASS_TRAIT: Record<string, (t: ItemTemplate) => boolean> = {
  keen: (t) => t.bleed > 0,
  weighted: (t) => t.stun > 0,
  needling: (t) => trait(t, "pierce") > 0,
  cleaving: (t) => t.sweep > 1,
};
// keen on a weapon with no bleed stat at all (blunt/pierce) doesn't guarantee a
// wound every swing — it's a bare chance, rolled once per landed hit, same
// shape as BLEED_ODDS above.
export const KEEN_BARE_BLEED_ODDS = 0.15;

// Player-inflicted bleed used to fire on 100% of landed hits, every edged
// weapon, no roll — the mirror-image mob-side (BLEED_ODDS) has always been a
// per-hit CHANCE, tiered by threat. That asymmetry let a weapon's bleed climb
// as a share of total damage the more armor ate its direct hit (bleed ignores
// armor entirely), and let one outlier (crawlers-hooks: dmg2/bleed3) bleed for
// MORE than its own swing on every single hit.
// Fix: derive the odds from the weapon's OWN numbers instead of one flat
// guess. Target — bleed should average out to roughly TARGET_BLEED_SHARE of
// what the weapon's direct hit does. Odds = share * dmg / bleed, capped at 1.
// A small bleed relative to the weapon's own dmg procs often (a dull common
// blade was never doing much else); a big bleed relative to dmg procs rarely
// (when it lands, it already hit hard on its own). No weapon can be both
// "always" and "hits harder than its own swing" — self-corrects per weapon,
// no per-item special-casing. keen's own +1 stacks on the RESULT (how deep
// the wound goes when it opens), never on the odds (how often it opens).
export const PLAYER_BLEED_TARGET_SHARE = 0.3;
export function playerBleedOdds(dmg: number, bleed: number): number {
  if (bleed <= 0) return 0;
  return Math.min(1, (PLAYER_BLEED_TARGET_SHARE * dmg) / bleed);
}
// The adjective a rolled trait wears in an item's name ("a muffled cloak"). One
// per tag — the piece advertises WHAT it rolled; the paperdoll spells the effect
// out once it's worn (wearsTrait feeds the sheet).
export const TRAIT_ADJ: Record<string, string> = {
  quiet: "muffled", slick: "oiled", padded: "quilted", wardhide: "boiled", strapped: "buckled",
  keen: "keen", balanced: "balanced", honed: "honed",
  weighted: "weighted", needling: "needling", cleaving: "wide-arced",
};
// What `look` says about a rolled trait — the reason the piece is worth more than
// its plain twin, in the game's voice, with the mechanic named in parens to
// match itemStat's tells. Only the lottery pool needs entries (099).
export const ROLLED_TELL: Record<string, string> = {
  quiet: "Worked soft — it makes no sound as you move (quiet).",
  slick: "Greased slick — a grasping hand slides right off it (slick).",
  padded: "Quilted through — it soaks up a ringing blow (wards stun).",
  wardhide: "Boiled hard — it turns a cut that would open you (wards wounds).",
  strapped: "Lashed down tight — no cutpurse lifts it off you (strapped).",
  keen: "Ground to a wicked edge — it bites deeper than its plain twin (extra bleed).",
  balanced: "Balanced true — it hangs lighter in the hand than its weight suggests (less load).",
  honed: "Honed hard, honed true — every blow lands a shade harder (+1 dmg).",
  weighted: "Head-heavy, deliberately so — it caves plate a shade deeper (extra armor-ignore).",
  needling: "Ground down to a needle's point — it finds the seam plate can't close (extra armor-ignore).",
  cleaving: "Wide in the arc — it catches one more than its plain twin (extra sweep).",
};

// ---- the verdigris-thing: the extraction monster (047) ----
// CORRODERS eat your KIT, not your blood: each landed blow blooms green on one
// random worn piece (armor slots + shield, never the weapon in your moving
// hand). Soft by design (rome: "make it soft") — a fight is a repair bill, not
// a wall. Sealed gear resists through the ordinary SEALED_WEAR_MULT, so the
// gate's mark finally matters mid-fight. The naked player shrugs.
export const CORRODERS = new Set(["verdigris-thing"]);
export const CORRODE_WEAR = 1.5; // condition per landed blow (vs ARMOR_WEAR 0.3 baseline; ~12 off one piece across a long fight)
// (Parry needs no set: it's the block column on a weapon-slot item, read by
// equippedBlock. Two epic examples: sword-breaker 0.10, king's-guard 0.15.)

// ---- the dungeon breathing: ambient atmosphere ----
// A quiet, rate-limited flavour line surfaces to an idle wanderer now and then,
// drawn from where they stand: the flooded deep sounds nothing like the gates.
// Add freely — this is meant to grow. Signature rooms override the region pool.
export const DEEP_ROOMS = new Set([
  "the-descent", "drowned-nave", "black-canal", "the-weir", "pocket-of-air",
  "sunken-gallery", "root-vault", "deep-ossuary", "weeping-cells", "silted-stair",
  "bone-processional", "black-threshold", "sunken-throne", "kings-hoard",
  // the +18 of migration 036 — the three deeper tiers count as deep too
  "drowned-barracks", "leech-pools", "tide-vault", "the-cistern",
  "blackreach", "the-lightless-march", "worm-cloister", "the-undertow", "the-sump",
  "carrion-gallery", "the-marrow-road", "the-gasping-dark", "sunless-well",
  "drowned-court", "kings-oratory", "bone-reliquary", "the-death-cell", "the-cold-hearth",
  "worm-bore", // the deep's second hideaway (048)
  // THE TIDEWAYS (069) — the wing the tide owns, hanging below the water
  // country. Deep by every rule: chest tiers, the exhale, the marrow-song.
  "the-tide-gate", "the-under-weir", "the-drowning-stair", "the-eel-run",
  "the-long-swallow", "the-salt-vault", "the-breathing-hall", "the-tide-throat",
  "the-silt-chapel", "the-still-cradle",
]);

// The Tideways proper (069): the tide's territory, and the flood order. The
// TIDE_LEVELS ranks run bottom-up — rank 0 drowns first and drains last. A
// normal tide crests at rank 1; a high tide (TIDE_HIGH_ODDS) takes the
// breathing-hall too — the camp you learn to trust exactly until you
// shouldn't. Rooms not ranked never flood: the approach stays a road.
export const TIDEWAYS_ROOMS = new Set([
  "the-tide-gate", "the-under-weir", "the-drowning-stair", "the-eel-run",
  "the-long-swallow", "the-salt-vault", "the-breathing-hall", "the-tide-throat",
  "the-silt-chapel", "the-still-cradle",
]);
export const TIDE_LEVELS: string[][] = [
  ["the-still-cradle"],
  ["the-tide-throat", "the-silt-chapel"],
  ["the-breathing-hall"],
];
export const TIDE_HIGH_ODDS = 0.25;
// The tide keeps its own clock, like the bell — tides do not roll dice.
// Roughly four a day, jittered enough that you read the drips, not a watch.
export const TIDE_EVERY_MIN_MS = 5 * 3_600_000;
export const TIDE_EVERY_MAX_MS = 7 * 3_600_000;
export const TIDE_FIRST_MIN_MS = 45 * 60_000; // a fresh world's first tide comes sooner
export const TIDE_FIRST_MAX_MS = 2 * 3_600_000;
export const TIDE_GRACE_MS = 15 * 60_000; // slept past = it rose and fell unobserved
export const TIDE_TELEGRAPH_MS = 3 * 60_000; // quickening drips; everything living climbs
export const TIDE_STEP_MS = 60_000;  // the water takes one level per step
export const TIDE_CREST_MS = 8 * 60_000; // and holds at the crest
export const TIDE_AFTERMATH_MS = 5 * 60_000; // silt, and everything dripping
export const TIDE_SILT_ODDS = 0.5; // per item: washes one level down when the water drains

// The corpse-key. The black door into the deep opens to a still-cold heart cut
// from a deep-dweller the sim surfaced — not a key on a shelf. While the door is
// SEALED, the deep coughs one of its mobile own up into the shallows on a slow
// clock; kill it (its heart drops, `surfaced`-flagged) and press the heart to the
// door before it spoils. Fresh heart opens it (and is consumed); a stale one is
// grey slime. No hoarding (it rots), no soft-lock (the sim keeps surfacing).
export const DEEP_HEART = "deep-heart";               // the perishable key item
export const DEEP_DOOR_KEY = "undercroft:down";       // "roomId:dir" of the sealed deep door (the stair out of the undercroft, past the hound)
// How long the black door stands open after a heart is pressed to it. It only
// bars the way DOWN — the-descent's way up is unkeyed, so a shut door never
// traps anyone below; it just stops the next visitor arriving free. While it
// stands open the deep mints no new hearts (surfacing pauses), so the window
// closing is what restarts the corpse-key economy.
export const DEEP_DOOR_OPEN_MS = 20 * 60_000;
// Food reads its age like the heart does — FLAVOR only (rome, 2026-07-17): a
// perishable ration goes fresh -> on the turn -> spoiled as it sits, but a
// spoiled-LOOKING one still fills you (the heart is the one thing that truly
// dies). Timed so it reads spoiled around the time floor-food would rot to
// scraps (ROT_MS, 4h).
export const FOOD_FRESH_SEC = 60 * 60;                // fresh for the first hour
export const FOOD_SPOIL_SEC = 150 * 60;               // reads spoiled after ~2.5h; the hour between is "on the turn"
export const FOOD_SPOIL_HEAL_MULT = 0.5;              // spoiled food is HONEST: it heals this fraction (never nothing — min 1; still edible in a pinch). "turning" is unpenalized — the warning tier. FOOD_KEEPS never spoils.
// Cured, dried, salted — or just water: these keep, and never read as spoiling.
// Preservation is the whole point of the smoker, the salt barrel, the hardtack
// tin. Everything else edible ages. Exclusion set, so a new fresh food spoils by default.
// dried-meat keeps too — it's DRIED, and it's now the smokehouse's answer for
// rat meat (see CURE_RECIPES): the humble keeping ration below the smoked-haunch.
// Makes garrison-foraged dried-meat non-spoiling as well — a minor buff, and a
// fix (dried meat had no business rotting).
export const FOOD_KEEPS = new Set(["smoked-haunch", "salt-fish", "hardtack", "well-water", "dried-meat"]);
// ---- the smokehouse: raw meat hung in the racks, cured to keeping ----
// The smoked-haunch's OWN description already claims these racks ("a haunch cured
// black and hard in the smokehouse racks"); nothing ever lit them. Now a delver
// can. In the smokehouse room, feed the cold racks a torch and hang raw meat:
// over CURE_MS it becomes its preserved form — a FOOD_KEEPS food that heals more
// and never spoils. It hangs on the floor of a SHARED room while it cures, raw
// and reeking (raw meat carries a lure), so a scavenger or another delver could
// lift it before you're back — the preservation is a wager, not a vending
// machine. Reuses the rot clock (a timed floor-item transform) running toward
// BETTER instead of foul: kind "cure" in the rot sweep looks the output up here.
// rome (2026-07-17): "should we have a path to making preserved food?" — this is it.
export const SMOKEHOUSE_ROOM = "smokehouse";
export const CURE_MS = 3 * 60_000; // 3 min — long enough to be a wait you leave and risk, short enough you circle back mid-delve
export const GATE_CURE_MS = 10 * 60_000; // the SAFE gate smokehouse: slower than the deep racks (their only edge is speed), but it can't be lifted and cures while you're away — you collect it black and keeping next time you're at the gate
export const CURE_RECIPES: Record<string, string> = {
  "hyena-haunch": "smoked-haunch", // a raw haunch → the very haunch its lore says these racks make (heal 9 → 12, keeping)
  "pale-flesh":   "smoked-haunch", // the deep's drowned meat, smoked to keeping (heal 8 → 12, keeping)
  "rat-meat":     "dried-meat",    // the humble loop: rats are everywhere, so their cure is the modest keeping ration, not the premium haunch (heal 5 → 8, keeping)
  // The angler's loop (119): the common catch salts down to keeping. The pale
  // eel (16) and the marrow-lamprey (20) are deliberately ABSENT — they heal
  // more than anything cured and they SPOIL, and that trade is the whole point
  // of a delicacy. Preserve them and there'd be no reason to eat anything else.
  "cave-fish":    "salt-fish",     // the humble catch → the strip the keeper sells (heal 11 → 14, keeping)
  // THE WOOD'S MEAT (2026-08-02). deer-haunch shipped this morning as the only
  // raw meat in the game that could not be cured — every other one has hung in
  // these racks since they were lit. It is a HAUNCH, so it smokes to the very
  // thing the smoked-haunch's own description claims these racks make.
  //
  // Heal 11 → 12 is a small step, and that is the point: what you buy at the
  // racks is KEEPING, not power. Venison is the surface's best fresh meat and it
  // rots like everything fresh; smoke it and it travels. It stays under the
  // delicacy line too (the pale eel at 16 and the marrow-lamprey at 20 are
  // deliberately absent from this table — they heal more than anything cured
  // AND they spoil, and that trade is what makes them delicacies), so nothing
  // about the top of the ladder moves.
  "deer-haunch":  "smoked-haunch",
};
// A plain torch turns up in the smokehouse now and then — the garrison kept
// their kindling by the fire. It rides the floor-renewal law (DICE, not a
// schedule; capped at one lying unfound), so it is NOT a refill spot: a delver
// come to cure MIGHT find fuel already waiting, might not, and can never farm
// it. Same shape as the hammerstone/longbrand mints. rome (2026-07-17): "a torch
// spawn in the smokehouse, but rng, not a refill spot."
export const SMOKE_TORCH_ROLL_MIN_MS = 2 * 3_600_000; // the world checks every 2–4h...
export const SMOKE_TORCH_ROLL_MAX_MS = 4 * 3_600_000;
export const SMOKE_TORCH_MINT_ODDS = 0.3;             // ...and only sometimes lays one — a find, not a supply
export const SMOKE_TORCH_GROUND_CAP = 1;              // never more than one lying unfound — nothing to stockpile
export const HEART_FRESH_SEC = 600;                   // a heart opens the door for 10 min after the cut, then it's slime
export const HEART_ROT_SEC = HEART_FRESH_SEC + 120;   // ...and 2 min after it spoils the slime seeps away — a spoiled heart doesn't litter the floor (rome, 2026-07-15)
export const SURFACE_INTERVAL_MS = 360_000;           // while sealed, the deep surfaces one dweller ~every 6 min
export const SURFACED_STALE_MS = 15 * 60_000;         // a surfaced dweller nobody kills slinks back down after this, freeing the next
export const SURFACERS = new Set([                    // the mobile deep-kin that can crawl up (drowned things are water-bound; the hound holds its post)
  "twice-dead", "thrice-dead", "pale-crawler", "pale-stalker",
]);
export const SURFACE_ROOMS = ["well", "oubliette", "catacomb"]; // dark inner holes it climbs out of — never the entry gates
// Partial on purpose: a band with no pool yet is silent rather than borrowed.
export const AMBIENCE: Partial<Record<Region, string[]>> = {
  gate: [
    "Cold air wells up out of the dark below, smelling of wet stone.",
    "Above, the wind finds a gap in the ruined tower and moans through it.",
    "Grit trickles down from the broken vault overhead, and stops.",
    "The keeper shifts behind his hatch, and is still again.",
    "Dust hangs in what little daylight reaches down through the breach, and will not settle.",
    "Old ash lifts off the cold hearth, turns once in the draft, and lies back down.",
  ],
  upper: [
    "Dust sifts down out of the dark of the vaulting.",
    "Far off, water finds stone, drop by patient drop.",
    "Something small moves in the wall, and thinks better of it.",
    "The dungeon settles around you with a sound like a held breath let go.",
    "A draft passes, carrying old smoke and older bone.",
    "For a moment the dark seems to lean closer. Then it doesn't.",
    "Somewhere, stone grinds on stone, and the silence closes over it.",
    "Dust lies thick on every ledge, undisturbed but where your own hands have been.",
    "A skin of grey dust slides off a sill and falls without a sound.",
    "The air tastes of dry rot and cold iron, and sits heavy in the chest.",
    "Grit shifts underfoot — old mortar, bone-meal, the powder of things that had shape once.",
    "A cobweb greyed to felt with dust stirs once, in a draft you can't feel.",
  ],
  deep: [
    "Black water laps at the edge of the dark, unhurried.",
    "Something turns over in the flood, far off, and goes still.",
    "A slow drip counts out the silence, somewhere overhead.",
    "The cold here is a wet hand laid flat against your back.",
    "Bubbles break the surface where nothing should be breathing.",
    "The water carries a sound you feel more than hear, and cannot place.",
    "A film of silt lifts off the bottom, hangs a while, and greys back down over everything.",
    "Scum rides the black water — dust that fell here before the flood, going nowhere.",
  ],
  // ---- THE SURFACE BANDS (2026-08-01) ----
  // The dungeon's three pools are all enclosure: dust, drip, held breath. These
  // are the opposite problem — open country, where the threat is distance and
  // what's in it. Weather outranks all of them (eventAmbient runs first), so
  // none of these mention rain or sky-state; they'd fight the storm for the
  // same beat and lose.

  // The road: exposure. Nothing here hides you, and everything on it is going
  // somewhere — which means everything on it can see you coming, too.
  road: [
    "The wind comes straight down the open road with nothing left to slow it.",
    "Ruts run ahead of you in the mud, filled with water, older than your errand.",
    "Somewhere off the verge a bird goes up out of the grass, hard and sudden, and is gone.",
    "The road unrolls to a point ahead and does not hurry to get there.",
    "Grass has come up through the old paving in the places nobody walks any more.",
    "A stone in the verge leans where it was set, its cut face worn past reading.",
    "Something has passed this way not long ago: the mud holds the shape and not the name.",
    "The wind drops, and for a moment you can hear how far away everything is.",
    "Crows work something small down the ditch, and pause to watch you by, and go back to it.",
    "The country opens on both sides of you, and offers nowhere at all to stand out of sight.",
  ],
  // The wood: enclosure again, but green and alive — the dungeon's dark keeps
  // still, and this one doesn't. The recurring note is the sightline: you can
  // never see far enough, and the wood knows where you are before you do.
  wood: [
    "The trees close the sky over you a branch at a time, and the light goes green and thin.",
    "Something moves off through the undergrowth, unhurried, keeping its distance.",
    "The birds nearby stop. Further off, they carry on.",
    "Leaf-mould gives underfoot with a sound like something being let go.",
    "A branch settles somewhere behind you, at about the height of a shoulder.",
    "The wood breathes out a smell of wet bark and rot and something sweeter under it.",
    "Every way you look, the trees stand at the same distance and give you nothing.",
    "A twig goes, off to your left. Nothing follows it.",
    "Old growth leans in overhead until the way ahead is a tunnel of leaves.",
    "Somewhere in the green a wood-pigeon starts up its two notes, and thinks better of the third.",
  ],
  // The mountain: scale and cold. Nothing here is interested in you — the
  // threat is the place itself, and the hint, kept rare and never named, that
  // something very large has been up here a long time.
  mountain: [
    "The air comes thin and cold off the stone and takes the warmth out of your hands.",
    "Loose scree shifts somewhere above you, runs a little way, and stops.",
    "The wind hunts along the rock face, finds a gap, and howls through it.",
    "Below you the country lies out flat and small and none of it is any help.",
    "Frost has got into the stone and split it, patiently, over a long time.",
    "Nothing grows at this height but a grey lichen, clinging where it can.",
    "The cold up here is dry and clean and entirely without mercy.",
    "A shadow crosses the slope ahead, and there is nothing overhead to have cast it.",
    "The rock is scored in long parallel grooves, too deep and too even for weather.",
    "Somewhere far above, stone grinds on stone, and the mountain resettles its weight.",
  ],
};
// The dust your OWN light wakes: carried into a naturally-dark room the dark has
// held a long time, a flame catches what the dark hid — motes turning in the
// beam. Only when YOU are the light (carriesLight + a born-dark room), and only
// sometimes, so it stays a small marvel and never wallpaper. rome, 2026-07-17.
export const MOTES: string[] = [
  "Your light wakes a slow drift of dust, turning in the beam where nothing has stirred it in a long time.",
  "Dust hangs motionless in your torchlight, mote on mote, as if the air here forgot how to move.",
  "The flame catches a haze rising off your own footfalls — the first to trouble this dust in years.",
  "Motes climb up through your light and out the top of it, back into a dark that closes without a seam.",
  "In the reach of your flame the air is thick with slow dust; past it, the dark keeps its counsel.",
];
export const MOTES_ODDS = 0.4; // when lit in a dark, voiceless room, this share of atmosphere beats are the dust in your light
export const ROOM_AMBIENCE: Record<string, string[]> = {
  // The wood's signature rooms, spread in first so a hand-written entry down
  // here would still win — nothing overlaps today (the wood had none of these
  // before 2026-08-06) and this keeps it that way if one ever does.
  ...WOOD_ROOM_AMBIENCE,
  // ---- the grounds: the first OUTDOOR rooms — wind and sky, not drips (058) ----
  "the-causeway": ["The wind comes down the old road with nothing left to slow it.", "Somewhere high on the walls, loose stone ticks in the wind."],
  "the-old-road": ["The thorn wall creaks against itself, keeping whatever is east of it.", "For a moment the wind carries a smell that is not the fortress. Then it is gone.", "The gibbet chain creaks on the hill behind, slow as breathing."],
  "the-burned-village": ["A charred beam settles with a soft crunch of old ash.", "The wind worries at a hanging shutter until it bangs, once."],
  "the-gatefall": ["Scree shifts somewhere in the rubble, and small feet with it.", "A stone lets go of the wall above and clatters down the fall."],
  "the-dry-moat": ["The dead grass on the lip hisses. From down here, the sky is a road you can't take.", "Something crosses the ditch behind you, quick, bank to bank."],
  "the-wall-breach": ["Grit sifts down through the broken wall, keeping its own slow count.", "The wind moans through the breach like the wall remembering the day it opened."],
  "the-thorn-court": ["The briar shifts where nothing is moving it.", "Above the arch, the carved face goes on weeping its dry tears."],
  "the-mass-grave": ["The soft ground gives a long, settling sigh.", "Flies rise off the pit in a body, then settle again."],
  "the-briar-field": ["The thorn hisses field-wide, one long breath.", "Off through the briar, something keeps pace and then stops when you stop."],
  "the-hanging-hill": ["The gibbet chain creaks its one slow note.", "From up here you can see weather coming a long way before it means anything."],
  "the-black-fen": ["The water between the tussocks shivers, ring after ring, from no wind at all.", "Marsh gas breaks the surface with a smell like the fortress exhaling."],
  "the-drowned-orchard": ["Dead branches knock together overhead like knuckles.", "The fox-scrape at the old tree's roots breathes its cold underground breath."],
  "the-sally-ditch": ["Water moves along the ditch, slow as a patrol.", "The wall above leans its old cold shadow over the ditch."],
  // ---- the warrens: the earth is alive around you (058) ----
  "the-rat-warren": ["The runs around you rustle — the warren going about its business.", "Somewhere too near, small teeth work at something with patience."],
  "the-hyena-den": ["The den's smell thickens, as if the pack is nearer than it was.", "A bone shifts in the meal-heap. Nothing else moves."],
  "the-undermine": ["A pit-prop groans, takes the weight again, and holds. This time.", "Earth trickles from the propped ceiling in a thin, unhurried stream."],
  "the-buried-chapel": ["The dark above the pews holds its stone silence like a held breath.", "Soil sifts quietly onto the altar, the earth still swallowing, still patient."],
  // ---- the overworks: wind country (058) ----
  "the-wall-walk": ["The wind changes its mind again, shoving at you from the other side.", "Far below, the grounds spread grey and moving in the wind."],
  "the-rotted-scaffold": ["A board somewhere behind you finishes a creak it started when you crossed it.", "The scaffold sways a slow inch and settles, deciding to hold."],
  "the-weepers-crown": ["Wind pours over the arch's crown, carrying the smell of thorn and rain.", "Below, the briar paths thread the court like veins."],
  smokehouse: ["The old smoke-racks tick overhead, hung with nothing now.", "A ghost of cured smoke still hangs in the cold air."],
  larder: ["The stores keep their long cold silence around you."],
  oubliette: ["A breath of colder air rises from the pit, and something in it that is not air."],
  shrine: ["The altar waits, patient as only dead stone can be."],
  "pocket-of-air": ["The air here is thin and breathable and does not smell of the water. You breathe while you can."],
  "sunken-throne": ["The flooded dark hums, low, as if the throne remembers being sat.", "The water around the throne is very, very still."],
  "kings-hoard": ["Gold gleams once in the dark, and is swallowed again."],
  // ---- the fen: the second way west (2026-08-03) ----
  // Water on both sides of every step. The register is deliberately unlike the
  // road's (wind and open ground) and unlike the wood's (leaves and something
  // keeping pace): here it is the sound of things MOVING IN water you cannot
  // see the bottom of, and the ground itself never being quite trustworthy.
  "the-ditch-end": ["The plank walk gives under you, takes the weight, and gives again.", "Somewhere behind, the ditch lets go of a bubble."],
  "the-fen-edge": ["Reed goes over in one long ripple, all the way to where you can't see.", "Your heel finds firm ground, then doesn't, then does."],
  "the-sinking-path": ["Stone shifts underfoot and settles an inch lower than it was.", "Water finds its way over the causeway in a thin sheet, and goes back."],
  "the-drowned-hurdles": ["The weave flexes under your boots, springy as a floor that isn't one.", "Down through the clear water, three more layers of hurdle, going away into the dark."],
  "the-tussock-ford": ["The tussock you're standing on rocks, and keeps rocking after you've stopped.", "Between the tussocks the water goes down and down and does not get any less clear."],
  "the-willow-landing": ["The mooring ring turns in its socket, unhurried, though nothing is turning it.", "Grey willow moves all together, and the wood beyond it doesn't move at all."],
  "the-fen-gut": ["The gut runs slow and black and warm, carrying the fortress's smell out and thinning it.", "Something goes down the channel under the surface, unhurried, and does not come up."],
  "the-peat-road": ["The ruts hold the sky in two long parallel lines, and something crosses one of them.", "Brushwood shifts under the road with a sound like a held breath."],
  "the-peat-cuts": ["Water in a cutting shivers from one end to the other, from no wind at all.", "The turf-banks give off a smell of old smoke that has never been lit."],
  "the-open-water": ["The lake goes flat and silver and you cannot tell how deep any of it is.", "A ring spreads out where nothing broke the surface."],
  "the-dead-alders": ["A dead alder ticks somewhere in the dark, drying out a century too late.", "Nothing moves in here, because there is no wind down here to move it. Something moves in here."],
  "the-rush-shore": ["The rush hisses along both sides of the boards, keeping pace at about knee height.", "A board lifts at one end as you leave it and settles back."],
  "the-eel-traps": ["A shut trap knocks against its stake, once, from the inside.", "Forty stakes, standing in a row, going out to where you can't see."],
  "the-waste-foot": ["The one thorn tree out on the waste leans the way the wind has always come from.", "Water lets go of your boots for the first time in a long while."],
  "the-grave-drain": ["The channel carries a sound down from the pit above — settling, or something like it.", "Stone drips on stone, patient, in the dark ahead of you."],
  "the-quaking-flat": ["The ground swells under you in a slow wave and keeps moving after you stop.", "Somewhere out on the raft, a leg-deep hole closes over with moss again."],
  "the-heron-stand": ["The herons turn, together, and watch, and do not go up.", "Bones shift under your boot — small ones, in their thousands."],
  "the-osier-landing": ["Cut willow stands in its flooded rows, gone wild and still in its lines.", "The water shallows to mud without ever once looking like it has."],
  // ---- the den ground: a place with nobody in it (2026-08-03) ----
  // The dens are near-empty by design (3 bodies in 60 rooms), so ambience is
  // doing most of the work of making them feel inhabited-and-not. Every line
  // here is the building or the ground doing something on its own — nothing
  // that implies a body, because there isn't one, and a rustle that turns out
  // to be nothing is worth more here than anywhere else in the world.
  "the-hurdle-gate": ["The hurdle knocks once in its posts, and settles.", "Behind you the wood makes its noise. Ahead, nothing does."],
  "the-drift-lane": ["The grass down the middle of the track leans all one way and comes back.", "Something small goes along the top of the bank, keeping pace, and then doesn't."],
  "the-cart-turn": ["The old cart frame ticks as the sun comes off it.", "Grit blows across the bare ground and finds nowhere to stop."],
  "the-old-assart": ["Wind moves the whole field at once, one long shudder from the wood's edge to the far bank.", "A stump under the grass turns your ankle. There are hundreds of them out here."],
  "the-cow-pasture": ["The rubbing-post creaks, though nothing is rubbing on it.", "Water in the drinking hollow shivers, ring after ring, and goes still."],
  "the-sunken-way": ["Earth crumbles from the bank at your shoulder in a thin dry trickle.", "Down here you can hear something walking on the field above. It stops when you do."],
  "the-well-green": ["Air comes up past the crooked slab, cold, smelling of stone and deep water.", "The rotted rope-end swings a little at the windlass."],
  "the-ridge-and-furrow": ["The furrows hold the wind in lines, so the grass moves in stripes.", "You come down into a furrow harder than you meant to. The field has been catching feet for centuries."],
  "the-street": ["A shutter somewhere along the row bangs, once, and is quiet.", "Every door in sight stays shut. That does not change.", "Thatch gives up a handful of straw off a roof and drops it in the street."],
  "the-street-cross": ["The broken cross throws its short shadow round a step as the light moves.", "Wind comes down the length of the street and goes past you and out the other end."],
  "the-smithy-yard": ["The cracked trough holds nothing and rings faintly anyway when the wind crosses it.", "Rain, or damp, brings the smell of old iron up out of the black ground."],
  "the-smithy": ["The empty hooks along the wall move, very slightly, together.", "The hood over the cold hearth breathes a little soot down onto the stones."],
  "the-reeves-house": ["The hook in the lintel turns a few degrees and stops.", "The shutter holds. Whatever is outside stays outside."],
  "the-reeves-loft": ["The thatch overhead shifts its weight and resettles.", "The stiff little coat on the last peg swings once in a draught you can't feel."],
  "the-north-house": ["Smoke that has been in this thatch for two hundred years still comes off it in the heat.", "The muck channel gurgles under the wall — something is running through it."],
  "the-bare-chapel": ["The stone roof holds out every sound the world is making. It is very quiet in here.", "Water stands in the font. Nobody put it there and it has not gone."],
  "the-chapel-green": ["The yews take the wind and give back a sound like water.", "The bare patch in the middle of the green stays bare. Nothing has ever grown back on it."],
  "the-burnt-croft": ["The ash tree in the hearth-place moves and the black walls stay where they are.", "Old charcoal cracks underfoot, still sharp after all this."],
  "the-dead-orchard": ["Bark comes off a dead trunk in a sheet and lands flat in the grass.", "A windfall drops on the living side with a soft wet knock.", "Wasps work over the rotting fruit, unhurried, in numbers."],
  "the-common-field": ["The whole field goes over yellow-brown as the wind crosses it, and comes back green.", "Something is out in the middle of the grass, standing still, and then it isn't."],
  "the-mill-dam": ["Water goes over the top of the bank in a wide flat whisper that never stops.", "Reeds knock against each other out in the pond."],
  "the-mill": ["The great gear ticks somewhere in the frame, taking up the damp.", "Meal-dust lifts off the stones in a shaft of light and turns over slowly."],
  "the-wheel-pit": ["The beck talks the whole time on the other side of the sluice, close enough to touch and shut away.", "Water drips off the rotted buckets in no rhythm at all."],
  // ---- the waste: self-built ground, and every line says nobody's ----
  "the-waste-edge": ["Rush hisses across the whole flat at once.", "Standing water sits in the low places, flat as glass, holding the sky."],
  "the-turf-cutting": ["Water settles in the bottom of a cut with a small sucking noise.", "The spade-edges of the old cuts are still sharp. Nothing has softened them."],
  "the-broom-scrub": ["A broom pod cracks open in the heat like something small breaking.", "The scrub shifts along one line, low down, and stops."],
  "the-marl-pit": ["Clay slumps off the pit wall and hits the water a long way below.", "The fallen cattle-rail moves in the wind down there, on the water."],
  "the-marl-water": ["The water goes away from your feet into a blue nothing has any business being.", "Up above, the circle of sky has a bird cross it, and nothing else."],
  "the-squatters-row": ["Six roofs, six different ways of making a roof, and all of them creak differently.", "Turf slumps off a wall in a wet handful, and the wall goes on standing."],
  "the-hurdle-yard": ["The stacked hurdles knock together down the whole row, one after another.", "The half-made hurdle on the trestle stays half-made."],
  "the-drying-green": ["The drying posts stand in their lines with nothing between them.", "The grass under the old lines is a different green, and stays that way."],
  "the-empty-toft": ["The hollowed doorstep holds a puddle. It is the only thing left of the doorway.", "Wind crosses the levelled ground and finds no wall to do anything with."],
  "the-black-hut": ["Soot comes off the roof in a soft black flake and lands on your sleeve.", "It is warm in here, out of the wind, the moment the door is behind you."],
  "the-shallow-well": ["The barrel-staves creak in the wet, holding.", "The water three feet down holds the sky, perfectly still, until something touches it."],
  "the-fever-graves": ["The rushes over the mounds are greener than everything around them, and taller.", "The ground here is tidy, and stays tidy, and nobody tidies it."],
  "the-bark-heap": ["The heap gives off a dry sharp smell, like tea, when the sun is on it.", "A curl of oak bark slides off the top and lands without a sound."],
  "the-peelers-camp": ["A lean-to gives a little more than it did and doesn't fall.", "The cooking pit holds cold ash and rainwater in layers."],
  "the-hearth-stones": ["Four cold rings of stone, well apart, keeping the arrangement they were left in.", "The stones are still red inside where the fire got into them."],
  "the-gorse-common": ["Gorse crackles in the heat all across the rise.", "Something goes through the tunnels under the gorse, low and fast, and is gone."],
  "the-warren-bank": ["The whole bank moves at once, and then holds still, and then moves again.", "Sand trickles out of a burrow mouth. Something is at home."],
  "the-warreners-lodge": ["The barred shutter takes a gust and holds it.", "Three sockets in the door frame for a bar that isn't there any more."],
  "the-lodge-loft": ["From the slits you can see the whole warren at once, and the whole warren cannot see you.", "The ladder rungs are worn hollow in the middle. Somebody went up and down them for years."],
  "the-pillow-mounds": ["The mounds lie in their comb across the grass, holding their shape.", "Something goes into a mound's channel and does not come out the other end."],
  "the-far-waste": ["The one thorn tree out there leans the way the wind has always come from.", "The rush goes on hissing south until the light stops."],
  // ---- the west road: the places on it worth stopping at (2026-08-01) ----
  // The Roadwarden's Post NEEDS its own pool. It is a gate, and regionOf calls
  // every gate "gate" wherever it stands, so without this it would draw the
  // fortress's lines — cold air welling up out of the dark below, at a stone
  // house in open country with nothing under it.
  "the-roadwarden-post": [
    "Behind the hatch, something is set down, and taken up again.",
    "The yard gate knocks against its post in the wind, not quite latched.",
    "Smoke leans off the chimney and flattens out along the road.",
  ],
  "the-crooked-gibbet": [
    "The cage turns a few degrees on its chain, and turns back.",
    "Iron creaks overhead — the one sound this thing has left to make.",
  ],
  "the-roadside-graves": [
    "The grass over the mounds grows greener than the grass around them.",
    "Something small goes over the flat stones and off into the rough.",
  ],
  "the-wayside-shelter": [
    "Wind passes the open side of the shelter and lets go of you for a moment.",
    "Water finds a way through the half-roof and ticks onto the flags, unhurried.",
  ],
  "the-long-straight": [
    "The road runs out ahead of you to a point, and nothing is on it.",
    "A long way off, something crosses the road and is gone before it resolves.",
  ],
  "the-dry-well": [
    "The rowan down the shaft stirs, though nothing up here is moving.",
    "You could drop a stone in and hear exactly how far it is to the bottom.",
  ],
  "the-flooded-quarry": [
    "The green water takes the light and gives nothing back.",
    "A slab lets go of the working face, somewhere under the surface, and settles.",
  ],
  "the-shallow-ford": [
    "The beck works over the paving with a sound like a held conversation.",
    "Something upstream drops into the water, and the ripple reaches you late.",
  ],
  "the-broken-axle": [
    "The good wheel turns a quarter, stops, and turns back.",
    "The wind gets into the cart's ribs and hums there.",
  ],
  "the-cutting": [
    "Your own footfalls come back off the rock walls a half-beat late.",
    "Cold air stands in the cutting the way water stands in a ditch.",
  ],
  "the-old-boundary": [
    "Wind runs the length of the old ditch, north to south, going somewhere.",
    "The hinge-pins in the jambs are worn bright, and nothing has hung on them in living memory.",
  ],
  "the-holloway": [
    "Roots hang out of the banks at head height, and one of them moves as you pass.",
    "The leaf-rot smell thickens ahead of you, and does not come from behind.",
  ],
  "the-gap-in-the-trees": [
    "The gap gives back nothing at all — not a shape, not a distance.",
    "Something in the wood shifts its weight, once, and the trees hold still around it.",
  ],
};
// Blind still isn't blank (rome, 2026-07-24, after the bell-cote): 'look' in
// a pitch-black outdoor room returned the SAME bare line everywhere, no
// matter how distinctive the place is lit. Unlike ROOM_AMBIENCE (a rare,
// rate-limited background line), this fires on every dark 'look' at an
// OUTDOOR room that has an entry — sense-only (touch, sound, smell), never
// sight, since you genuinely can't see. Rooms with nothing here just get the
// plain generic line, same as before.
export const DARK_TOUCH: Record<string, string> = {
  ...WOOD_DARK, // same arrangement as ROOM_AMBIENCE above

  // The dens at night: no lamp anywhere in sixty rooms, and the buildings are
  // the point — you find a place you could be inside by touch (2026-08-03).
  "the-street": "Walls stand close on both sides and every door in them is shut. You could try one. You'd be trying it blind.",
  "the-street-cross": "Your shin finds the bottom step of the cross. Three steps, dished in the middle, and the stump of it above.",
  "the-smithy-yard": "Clinker crunches underfoot and the ground gives off old iron. There is a doorway in the wall on your right — you can feel the cold coming out of it.",
  "the-well-green": "The well's stone ring is at your hip before you see anything of it, and the slab across it is crooked enough to get a hand under.",
  "the-hurdle-gate": "The hurdle knocks in its posts beside you. Behind it, the wood. Ahead, open ground and a lot of sky you can't see.",
  "the-sunken-way": "Earth walls close on both sides at shoulder height. You could walk this in the pitch dark and it would still take you where it goes.",
  "the-mill-dam": "Water goes over the bank in a wide flat sheet somewhere just below you. Step wrong and you're in it.",
  "the-marl-pit": "The ground stops. You feel it stop before you feel anything else — a lip, and then nothing, and water somewhere a long way down.",
  "the-waste-edge": "Rush and standing water in every direction, and the road's bank somewhere behind you, higher than the rest.",
  "the-squatters-row": "Six roof-lines against a sky barely lighter than they are. One of them is turf, and turf means a door low enough to feel for.",
  "the-warren-bank": "The bank is warm sand under your hand and full of holes, and things go through it all around you, none of them interested in you at all.",
  "the-gorse-common": "Gorse finds you before you find it, from every side at once, and the only way through is the tunnel you can't see.",
  "the-bell-cote": "The bell hangs unseen at your shoulder — cold under your hand if you reach for it, the wind worrying at the one note it isn't ringing.",
  "the-black-fen": "Something with too many legs picks its way across the water near your feet — felt more than heard.",
  "the-briar-field": "Thorn hisses against itself all around you, and the field seems to be moving somewhere just out of sight.",
  "the-broken-battlement": "Wind pours straight through gaps in the wall beside you — the drop is close, and you can't tell where it starts.",
  "the-burned-village": "A charred beam shifts and settles somewhere near — the wind still finds this place, even burned down to its sills.",
  "the-causeway": "Behind you the Door's black bulk blots out even the little the sky gives — the one shape the dark can't take from you.",
  "the-drowned-orchard": "Cold air breathes up out of the ground near the old tree's roots — the fox-scrape, open, still cold.",
  "the-dry-moat": "The banks rise close on either side — anything on the lip above could be looking down at you right now, and you'd never know it.",
  "the-gatefall": "The rubble squeaks and scurries around you, unseen — it never quite stops, day or night.",
  "the-hanging-hill": "Somewhere above, the gibbet's chain creaks on a wind you can't see move.",
  "the-leaning-spire": "The floor tilts under you, same as always — everything loose settled against the low wall long before you got here.",
  "the-mass-grave": "The ground gives soft underfoot, wrong in a way you feel more than see — and something on four legs is moving nearby, drawn by the same smell you are.",
  "the-old-road": "Somewhere ahead the toll-house keeps its lamp lit — a point of warmth you could feel your way toward.",
  "the-rotted-scaffold": "The boards under you creak and sigh with every shift of weight — they've held this long; that's all that can be said.",
  "the-sally-ditch": "Water stands cold around your ankles — whoever cut this ditch meant to move through it unseen, same as you're doing now.",
  "the-thorn-court": "Low paths thread the briar around you, cut by things that go on four legs — you can feel where the ground's worn smooth.",
  "the-wall-breach": "Loose stone shifts underfoot — a bad stair, climbing toward the wall above, if you dared it blind.",
  "the-wall-walk": "The wind up here never stops — it just changes its mind, first off the yard, then off the waste.",
  "the-watch-turret": "Wind cuts through the arrow-slits around you, thin and precise — whoever stood this post saw everything from here, once.",
  "the-weepers-crown": "Somewhere above your head the carved face keeps its silent watch — you could trace one stone tear with your fingers, if you reached.",
  // ---- the west road (2026-08-01) ----
  // The road is outdoors and moonless nights are total, so an unlit walk out
  // here is thirty rooms of pitch black — which is exactly when the surface
  // underfoot has to do the work the prose usually does. Read the road by
  // touch and you can still tell how far out you are.
  "the-cart-road": "Dressed stone underfoot, and a worn groove down the middle of it your boot keeps finding — the road is still doing its job, blind or not.",
  "the-broken-paving": "Every stone sits at its own angle. You go slowly, and your ankles do the seeing.",
  "the-first-milestone": "Your hand finds the pillar at the verge, and under your fingers the newer scratches — names, crowded over the old cut.",
  "the-elder-hedge": "Blackthorn rakes your sleeve on the north side. Whatever is beyond it stays beyond it.",
  "the-sunken-lane": "Banks close in at shoulder height, roots hanging out of them, and the road runs on between with nowhere else to go.",
  "the-crooked-gibbet": "Above you, iron turns on a chain and stops. It is empty. You cannot check that it is empty.",
  "the-wayside-shelter": "Three walls and half a roof — you find the bench by shin, and the hollow worn in it by sitting down.",
  "the-long-straight": "Level, straight, and open on both sides. Nothing to walk into, and nothing to get behind.",
  "the-shallow-ford": "The road walks you down into cold water, shin-deep over clean gravel, and up out of it on the far side, still paved.",
  "the-broken-axle": "Your hand finds a spoked wheel, waist-high and slowly turning, and the cart's ribs beyond it.",
  "the-cutting": "Rock walls on both sides, close enough to touch at once, and your own footfalls coming back a half-beat late.",
  "the-old-boundary": "Two stone jambs and the cold hinge-pins set in them, worn smooth. The gate they held is long gone.",
  "the-last-paving": "The stones give out under your boots — courses, then a scatter, then bare earth. Past here the road is only habit.",
  "the-rutted-track": "Two water-filled ruts with a spine of grass between. Walk the spine; everything else has learned to.",
  "the-green-lane": "Hedge on both sides, met overhead. You are in a tunnel, and it is not much wider than you are.",
  "the-holloway": "Roots for walls, leaves for a ceiling, and a smell of leaf-rot ahead of you that is not the lane's.",
  "the-gap-in-the-trees": "The track stops. Ahead your hands find trunks, and then a gap between them, and the air out of it is colder and older than the road's.",
};
// The dungeon breathes SLOWLY (rome, 2026-07-13). At 45s + 0.16/tick it spoke
// about once a minute, which against a four-line gate pool meant the whole pool
// cycled every four minutes and read like a stuck record. 150s puts the mean
// gap near 2.7 minutes — atmosphere, not chatter. (See lastAmbientLine: the
// same line never lands twice running.)
export const AMBIENT_COOLDOWN_MS = 150_000; // at most one breath of atmosphere this often, per wanderer
export const AMBIENT_ODDS = 0.16;          // ~per 2s tick, once off cooldown
export const RECONNECT_GRACE_MS = 5 * 60_000; // a re-weave within this of dropping is a reconnect, not a fresh arrival
export const SEAMLESS_RECONNECT_MS = 45_000; // a re-weave THIS fast is invisible: the world resyncs the HUD (status + chips) and says nothing — no greeting, no room reprint, no scroll churn. Matches LINKDEAD_MS: the body literally never left the world. Slower reconnects (up to RECONNECT_GRACE_MS) still get the gentle "take up the thread" welcome + a brief room.

// ---- THE GATEHOUSE (rome, 2026-07-13) ----
// The gate is the DOOR. The gatehouse is the sanctuary behind it, and until now
// it wasn't a place at all — it was a modal, a flag that switched you off. You
// were safe there because nobody could see you, which is a poor kind of safety
// and no kind of company.
//
// Now it is a room. FOUR DOORS, ONE FIRE: whichever gate you came in by, you
// step into the same gatehouse, because the keeper is one man and it is his
// house. With the numbers this world has, four lobbies would be four empty
// rooms; one is a tavern. Everything that steps out of the dungeon lands in it.
//
// In there the input line is a MOUTH, not a command line: known verbs still
// command, and anything else you type is simply said. It is the one room in
// NOMAD that never touches the wire — no D1 row, no Nostr event, nothing to
// relay. What's said behind the door stays behind the door.
//
// These verbs reach for the dungeon, and the dungeon is not in here.
// (carve is NOT barred: in the gatehouse it carves the wall chart — see
// gate.wallCarve — the one wall in the world worth writing on.)
export const GATEHOUSE_BARRED = new Set([
  "go", "attack", "throw", "get", "drop", "fish", "dive",
  "unlock", "listen", "shout", "light", "wash", "squink",
]);
// Verbs that take NO argument. In the gatehouse the input line is a mouth, so a
// no-arg command with words after it was never a command — "i am trying to quit"
// is speech, not 'inventory' (i); "out of my mind" is speech, not 'exit' (out).
// Bare, they still fire. This is what stops a sentence's first word hijacking it.
// TRULY no-arg verbs only: bare they command, but with words after they were a
// sentence ("who knows", "rest assured"). Verbs that legitimately take an
// argument — look <thing>, forge <thing>, publish <sheet|kind 1|item> — are NOT
// here: an explicit command must run in the gatehouse, not be eaten as chat
// (rome, 2026-07-15). Their bare forms still work; only the arg cases were broken.
export const GATEHOUSE_NOARG = new Set([
  "who", "inventory", "rest", "enter", "exit", "barter",
  "map", "study", "carve", "journal", "sheet", "help", "smoke",
]);
// The gatehouse breathes SLOWER than the dungeon (rome, 2026-07-13): a 3-minute
// floor, and with the roll on top the lines land about every 3-5 minutes. It is a
// room where people sit and talk — the walls should not keep interrupting them.
export const GATEHOUSE_AMBIENT_COOLDOWN_MS = 180_000; // never sooner than 3 minutes
export const GATEHOUSE_AMBIENT_ODDS = 0.03;           // per 2s tick, once off cooldown -> ~4 min mean

// THE MAP'S STRATA, AND WHO OWNS THEM (2026-08-02). This lived only inside the
// client script, which meant the SERVER could not reason about the map at all —
// and the server is the only thing that knows the whole world graph. It is here
// now, sent per-room on the frame, and the client no longer keeps its own copy.
//
// The cutaway is vertical. The road, the wood and the mountain are SURFACE:
// you reach them by walking west on the same ground, not by a stair, so
// severing them into their own strata drew them as islands floating above the
// world (rome, 2026-08-02).
// WHO HEARS THE KEEP. The world-wide announcements all speak fortress — "deep
// below", "through the stone", "far under the keep" — so they carry to the
// fortress's own bands and no further. A gate reads as "gate" only for the
// fortress's three doors; the road's and the wood's report their own band, which
// is what puts a gatehouse sitter with the ground they came in from.
export const FORTRESS_BANDS = new Set<string>(["gate", "upper", "deep"]);
// And the surface's own news, for the things that happen out here.
export const SURFACE_BANDS = new Set<string>(["gate", "road", "wood", "mountain", "den"]);

export const MAP_BAND_OF: Record<string, number> = {
  sky: 0, out: 1, gate: 1, road: 1, wood: 1, mountain: 1, den: 1, upper: 2, warrens: 3, deep: 4,
};

// ---- WHAT THE KEEPER TELLS YOU: each region's story, across the hatch ------
//
// rome, 2026-08-02: "YOU GO TO THE GATE/GATEHOUSE FOR SAFETY (IT'S A TAVERN)
// AND WHY NOT GET INFORMATION OF THE REGION FROM THERE?"
//
// He is right, and my first cut of this was exactly backwards: I stood four
// storytellers out in the deep, the road and the wood — the three places in the
// game where standing still for five minutes gets you killed — and then
// explicitly gave the gatehouse none, on the reasoning that safe lore is cheap
// lore. That reasoning is wrong twice over. A story nobody can afford to stop
// and hear is not a story, it is 44 lines of dead content. And a tavern is
// EXACTLY where you learn about the country outside: that is what the room has
// always been for, which is why it already has its own warm slow ambience and
// its own bench and its own man behind a hatch.
//
// SO THE TELLER IS THE KEEPER, the one who was already there. No new NPC, no
// new verb, nothing to type. He talks while he works — at the room, the way a
// barman does, not to you. The design law from the first cut survives intact
// and costs nothing here: you are overhearing a man, not opening a dialogue.
//
// WHICH STORY YOU GET IS WHICH DOOR YOU CAME IN BY. Keyed on the region of the
// gate room itself, so:
//   gate  -> the fortress (its three doors)   the garrison, and then the water
//   road  -> the west road (its two doors)    what used to pass, and what does
//   wood  -> the maze (its three doors)       the wood court, and the wood
// That is the whole reason to have gates spread across bands rather than piled
// in one: the door you run for decides what you find out. A wanderer who only
// ever banks at the Weeper's Arch never hears a word about the wood.
//
// THE PRICE IS TIME, AND THE GATEHOUSE IS WHERE YOU HAVE IT. A line lands about
// every 25 seconds you sit behind the door — which is what you are doing anyway
// while you bank, sort, repair and eat. A full telling is eleven lines, so it
// costs three or four visits to hear one out. Your place persists per key
// (players.keeper_told), so it resumes across sessions and devices, and past
// the last line he starts the story again from the top.
//
// The mountain gets its telling when the mountain gets its gate.
export const GATE_TELLINGS: Partial<Record<Region, string[]>> = {
  // THE FORTRESS. Two collapses in one telling, because they were one event:
  // the garrison thinned out, and the water came up, and the second is why the
  // first stopped mattering. He tells it as a man who has read the papers left
  // in the rooms below him — which is the honest way for a gate keeper to know
  // any of it, and quietly explains why the muster roll and the gauge-post turn
  // up in the deep as things you can carry out and barter.
  gate: [
    "The keeper works a rag around the inside of a cup and talks at the room. \"Place was a garrison. Eight hundred men on the roll, and a roll called every morning in the chapter house, out loud, to see who answered.\"",
    "\"There's a clerk's roll still down there, on two pegs. Names in one hand all the way down, marks against them for a third of it, and then the marks stop and the names carry on.\" He sets the cup down. \"Somebody kept writing them in after he'd given up marking them.\"",
    "\"They weren't killed. That's the thing everybody gets wrong.\" He starts on another cup. \"They were sent for. Elsewhere. Over about forty years, in ones and twos, and nobody was ever sent back.\"",
    "\"The last stretch of that roll is one company and it's got a strength of nine. Then it's got a strength of one. There's a name at the bottom in a shakier hand and it's the clerk's own, marked present.\"",
    "\"Meanwhile there's a warden down at the weir doing the same job with water. Reads the level off a post twice a day, writes it in a book, sends the book up. Two below the sill. One below. Level at the sill.\"",
    "\"He asks for the lower gates shut. He's told the lower gates are wanted open — there's still trade going through them, see, and trade outranks a man with a stick.\" He shrugs. \"The gates shut themselves in the end.\"",
    "\"Somewhere in there he runs out of post. Notches climbing all up one face of it. So he turns it over and starts again from the bottom of the other side, higher than the first lot finished.\" A pause. \"That's the whole of it, on one bit of oak.\"",
    "\"Last readings in that book are taken from under the water he's reading. Level at the gallery floor. Level at the vaulting. No reading — the post is below the reading.\" He puts the cup on the shelf. \"Man never once wrote down that it was over.\"",
    "\"So there's your fortress. Nobody stormed it. It was emptied out one man at a time from above and filled up one hand's width at a time from below, and the two halves of it never met.\"",
    "\"What's left is the roll and the post and whatever's walking about between them.\" He looks toward the dark. \"Both of those are worth something over this counter, if you're the sort that goes and gets them.\"",
    "\"And they're still at it down there. That's the part I'd not think about too hard, in your line of work.\" He picks up a fresh cup and the rag. \"Place was a garrison,\" he says. \"Eight hundred men on the roll.\"",
  ],

  // THE ROAD. Told as traffic, because the road's whole story is what went
  // along it. The turn is the night the fortress emptied east — which is the
  // same collapse the fortress telling gives you from the other end, and a
  // player who hears both gets the join for free.
  road: [
    "The keeper leans on the hatch and looks out at the road. \"There was a warden on this road once. Post's still standing out there with his name on it. Job was counting what went by and taking a half toll at the post and a half at the ford.\"",
    "\"Fourteen carts on a good day. Wool going down, salt coming up, a drove of something most weeks, and a wedding party now and again, which pays nothing and is a great deal of trouble.\"",
    "\"He kept it on a stick. Squared hazel, notch a cart. Three faces of it packed solid.\" He taps the counter. \"Fourth face is nearly bare, and the fourth face is the newest.\"",
    "\"It goes nine. Then six. Then two, and he writes down that the two were the same man twice.\" A short laugh with nothing in it. \"Then none, and there's no notch for none, so he just writes the word.\"",
    "\"The ford wanted stone. He asked for stone. Verges wanted cutting, he asked for cutters. Nobody came, and the ford took the far milestone, and he couldn't shift it back on his own.\"",
    "\"Then one night he counts eleven going east. In the dark. No toll asked of any of them.\" He straightens up. \"He put it in the book that that isn't traffic. That's the fortress emptying.\"",
    "\"After that it's none west and none east for a long stretch, and he keeps opening the book anyway, because that's the job.\"",
    "\"What's out there now isn't traffic either. Dogs on the long straight that answer to nobody. Men on the weed paving who aren't carrying anything and aren't going anywhere, which on a road means one thing only.\"",
    "\"There's a cart gone over near the ford with its axle broken, been there longer than I've been here, and whatever was in it is still in it. People have gone out for that. Some came back.\"",
    "\"And there's the two stones. Names cut in both of them by everyone who ever stopped.\" He looks at you for the first time, or near enough. \"Names on the near stone and not the far one are people who turned back. Or who turned nothing back.\"",
    "He settles onto his elbows again. \"There was a warden on this road once,\" he says. \"Post's still standing out there with his name on it.\"",
  ],

  // THE WOOD. The court record, secondhand — which is how a man behind a hatch
  // would have it. It ends on the woodward, because the practical thing a
  // wanderer needs to know about that wood is that its enforcement outlived its
  // court, and the enforcement is still walking.
  wood: [
    "The keeper jerks his chin at the trees. \"That wood had a court. Proper one. Sat under a named oak on the bounds twice a year and heard what people had done to it.\"",
    "\"Green wood taken without right, twopence. Same man twice, fourpence and a warning. Coppice cut in the sixth year that should have stood eight — offender unknown, so nobody paid.\" He shakes his head. \"Small stuff. It's all small stuff at the start.\"",
    "\"Pale broken on the north bounds in three places, deer gone out. Ordered: make the pale good before the fall.\" A beat. \"Next roll: ordered, make the pale good. Same words. That's when you know.\"",
    "\"Rides to be cleared and kept eight foot wide. Cleared at midsummer and grown in by the reading.\" He wipes the counter. \"You can't fine a wood for growing.\"",
    "\"Then they present the holding itself — for letting the moat fill and the hall go to ruin. And the holding doesn't attend, on account of being a ruin.\"",
    "\"Best one's the perambulation. Walking the bounds, that is. Six men set out at Michaelmas to do it and not one of them finished.\" He holds up two fingers. \"Two came out where they went in. Four came out somewhere else entirely.\"",
    "\"So the court orders the bounds walked notwithstanding, and orders that any man who can't say where he's standing be brought to the oak and set right.\" He lets that sit. \"There's no note of anybody ever being brought to the oak.\"",
    "\"Last entry on the last roll presents the wood. For taking the coppice, the rides, the pale, the holding, and the court.\" He almost smiles. \"The wood did not attend. The wood is fined nothing, being a wood.\"",
    "\"Now. A court like that has an officer. Woodward. Walks the bounds, knows every stand in it, takes the tools off anyone cutting without right.\" He stops wiping. \"Court's four hundred year gone. He isn't.\"",
    "\"He's still walking it, and he's still taking tools off people, and he does not stop to hear which right you think you've got. Big man, oiled leather, felling axe carried like it weighs nothing.\"",
    "\"Past the first few stands in there the wood stops telling you the truth about which way you're facing, and that's where he does his rounds.\" He goes back to the counter. \"That wood had a court,\" he says. \"Proper one.\"",
  ],
};

// ONE LINE PER VISIT. NOT A DRIP (rome, 2026-08-02: "this seems like spam").
//
// My first cut fed a line every 25 seconds you sat behind the door, which is
// indefensible twice over. It is spam on its face — eleven interruptions while
// you are trying to sort a lockbox. And it breaks the rule written eight lines
// above it in this same file: the gatehouse ambience is deliberately the SLOWEST
// clock in the game because it is a room where people sit and talk and the walls
// should not keep interrupting them. A man who interrupts you every 25 seconds
// is not a barman, he is a notification.
//
// So he says ONE thing per time you are behind the door, and then he is done
// with you until you come back. That is how it actually goes in a bar, it can
// never stack on top of anything you are doing, and it turns the telling into
// something that unfolds across a WHOLE CAREER rather than one long sit: eleven
// visits to hear a region out, and you have three regions to hear.
//
// The line lands somewhere in the first stretch of the visit rather than the
// instant the door shuts — he finishes what he was doing first — and a duck-in,
// bank, duck-out gets nothing at all, which is correct. He is not going to
// start a story at somebody who is already leaving.
export const KEEPER_DELAY_MIN_MS = 15_000;
export const KEEPER_DELAY_MAX_MS = 45_000;

// The gatehouse hears NOTHING of the dungeon — roomFeed and roomSound both stop
// at the door now — so this pool is the room's entire voice, and it carries all
// of the atmosphere on its own. It is warm, domestic, and slightly sad: the
// sound of a place that has watched a great many people go out and not come back.
export const GATEHOUSE_AMBIENCE = [
  "The keeper turns a page behind his hatch, and says nothing.",
  "The fire settles. Somebody's kit drips quietly onto the flags.",
  "The door holds. It has held a long time.",
  "Wind leans on the shutters, finds no way in, and gives up.",
  "The kettle ticks as it cools.",
  "Far off, on the other side of the door, something calls across the dark. In here it is only a sound.",
  "A coal cracks. The shadows lean, and settle.",
  "The bench is worn to a shine at one end, where men sit to work up their nerve.",
  "Someone has scratched a tally into the wall by the door. It stops.",
  "The hatch rattles once in its frame, as if the keeper thought better of something.",
  "Warmth gets into your hands, and they remember they were cold.",
  "The room smells of pitch, wet wool, and old iron.",
  "Rain finds the roof somewhere and gives it up drop by drop into a bucket already full.",
  "Out there the dark goes on doing whatever it does. It can wait.",
];
// The world stays real when your eyes close: a disconnect during a LIVE fight
// (you hold a target, or something holds you) leaves the body standing this
// long — auto-fighting, killable. Pulling the plug is never an escape; with
// nothing hunting you, the fade is instant and free, same as ever.
export const LINKDEAD_MS = 45_000;

// ---- THE ARENA FEED: third-person combat flavor (spectator-facing) ----
// A player's OWN screen reads in the second person ("You open its throat"); the
// colosseum needs the same blow retold for the crowd, in the third person. These
// pools feed only the arena stream — short, punchy, a caption not a scene.
//   {k} = the killer's name    {n} = the thing that died
//   {a} = the one who did it   {t} = the one it happened to
// Kill lines split by how a thing goes down (the hollow shatter, the drowned
// sink, everything else falls), mirroring the second-person killVerb in zone.ts.
export const FEED_KILL: Record<string, string[]> = {
  hollow: [
    "{k} shatters {n} in a clatter of loose bone.",
    "{k} caves {n} in, and the light goes out of it.",
    "{k} breaks {n} apart; the pieces go still.",
  ],
  drowner: [
    "{k} finishes {n}; it slides under and is gone.",
    "{k} puts {n} down, and the black water closes over it.",
    "{k} drags {n} under its own dead weight.",
  ],
  plain: [
    "{k} cuts {n} down.",
    "{k} puts {n} down for good.",
    "{k} drops {n} where it stands.",
    "{k} finishes {n}, and the fight goes out of it.",
  ],
};
// The vitals kill — a killing blow to the throat, heart, or skull. Marked BIG in
// the colosseum (the fx tag carries it), so the lines earn the extra weight.
export const FEED_VITAL: string[] = [
  "{k} opens {n}'s throat — it drops in a single spray of red.",
  "{k} drives the point clean through {n}; it folds and does not move.",
  "{k} finds the gap, and {n} is dead before it lands.",
  "{k} caves in {n}'s skull with one dead blow.",
  "{k} runs {n} through the heart — over in a breath.",
];
// Status procs, retold for the crowd — pointed either way (a wanderer's edge, or
// a beast's claws). {a} acts, {t} suffers; the line is capitalized on send.
// Pronoun-safe: the trailing clause never says "it"/"they" (the target can be a
// mob OR a wanderer, and either subject would misread) — it names {t} or drops out.
export const FEED_STUN: string[] = [
  "{a} rings {t} senseless — a beat lost.",
  "{a} lands like a falling stone; {t} staggers, ears ringing.",
];
export const FEED_BLEED: string[] = [
  "{a} opens a wound on {t} that won't clot on its own.",
  "{a} cuts {t} deep, and the blood starts to run.",
];
export const FEED_HOBBLE: string[] = [
  "{a} rakes the leg out from under {t} — no clean run now.",
  "{a} hamstrings {t} — a dragging leg from here on.",
];
// Wanderer-on-wanderer, retold for the crowd. The arena feed NAMES the victor
// (rome, 2026-07-16) — the opener already outs the aggressor, and a kill under
// the killer's own key is a self-published brag, not the world snitching. These
// use person pronouns (they/them), unlike the mob-facing FEED_KILL/FEED_VITAL.
//   {k} = the killer   {v} = the fallen
export const FEED_PVP_KILL: string[] = [
  "{k} cuts {v} down.",
  "{k} puts {v} down on the stones.",
  "{k} drops {v} where they stand.",
  "{k} finishes {v}, and the fight goes out of them.",
];
export const FEED_PVP_VITAL: string[] = [
  "{k} opens {v}'s throat — they drop in a spray of red.",
  "{k} drives the point clean through {v}; they fold and lie still.",
  "{k} finds the gap, and {v} is dead before they land.",
  "{k} caves in {v}'s skull with one dead blow.",
  "{k} runs {v} through the heart — over in a breath.",
];
// A heavy, telling blow mid-duel (a crit, an ambush landed, or one that cashed
// an opening) — so the crowd watches the fight turn, not just its end. Fed only
// in PvP (a duel is rare and worth the detail); {a} lands it, {t} takes it.
export const FEED_PVP_HIT: string[] = [
  "{a} catches {t} square — a heavy blow lands.",
  "{a} staves {t} while they're wide open.",
  "{a} lands a hard one on {t}, and {t} gives ground.",
];
// Caught at rest — guard down, wounds half-mended, the worst moment to be found.
// Damning for the crowd, and for whoever did it. Fed for BOTH a wanderer's ambush
// and a beast falling on a sleeper. {a} = the one who strikes, {t} = the resting.
export const FEED_REST_CAUGHT: string[] = [
  "{a} falls on {t} at rest — no warning, no mercy.",
  "{a} sets on {t} before they can rise from their rest.",
  "{a} catches {t} mending, guard down — and strikes.",
];

