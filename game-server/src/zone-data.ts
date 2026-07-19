// Tuning constants, creature-behavior sets, and the flavor/bestiary text tables
// for the dungeon — lifted out of the ZoneDO monolith. Pure data; no state, no
// logic. Values and names are unchanged from when they lived in zone.ts.
import type { Stance } from "./zone-types";


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
export const SHIELD_WALL = new Set(["warden-tower-shield", "crown-guard-pavise", "gravestone-shield", "smiths-aegis"]); // smiths-aegis (093): the forge's masterwork wall
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
export const LOCKBOX_CAP = 8; // the run closet — small, takes anything, sealed or raw
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
export const FISHING_SURFACE = new Set(["the-black-fen", "the-drowned-orchard"]);
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
export const HUNGER_PER_MIN = 2; // 0..100
export const HUNGER_MAX = 100;
export const HUNGRY_AT = 50;
export const STARVING_AT = 85; // past mere hunger: the end of the rope, where a predator with no easier meal eyes a lone delver as meat
export const WANDER_MIN_MS = 45_000;
export const WANDER_MAX_MS = 150_000;
export const FLEE_BELOW = 0.18; // flesh runs only when nearly done (was 0.25 — everything bolted early)
export const FLEE_CHANCE = 0.2; // per round once below the threshold (was 0.5)
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
export const STONE_ROLL_MIN_MS = 2 * 3_600_000; // the world checks every 2–4h...
export const STONE_ROLL_MAX_MS = 4 * 3_600_000;
export const STONE_MINT_ODDS = 0.25;             // ...and 1 check in 4 mints — ~twice a day, on dice
// The keeper's shelves are a market, not a vending machine (rome, 2026-07-11):
// things sell out. Sometimes YOU take the last one; sometimes an off-screen
// wanderer beat you to it (the churn — the world has other customers). A bare
// shelf restocks on its own within the window.
export const FENCE_OUT_MIN_MS = 30 * 60_000;
export const FENCE_OUT_MAX_MS = 90 * 60_000;
export const FENCE_LAST_ONE_ODDS = 0.2; // per item bought: that was his last
export const FENCE_CHURN_MIN_MS = 2 * 3_600_000; // between off-screen customers
export const FENCE_CHURN_MAX_MS = 4 * 3_600_000;
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
};

// Territory: every creature remembers its den and keeps to the ground around
// it. Idle wandering never crosses the edge; a creature that finds itself
// beyond it (fled, or freshly walked in from a dark mouth) spends every idle
// step walking home. This is what keeps the deep in the deep — and the rats
// out of rooms three corridors from their nest. Patrollers (PATROLS) are
// exempt: their route is their territory. The boss goes where it pleases.
export const TERRITORY_RADIUS = 3;
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
};

// Creatures with nothing inside. They do not bleed (broken remains, not blood),
// do not hunger, and no smell of food moves them. The rat is the only thing
// down here that's honestly alive.
export const HOLLOW = new Set(["skeleton", "bone-knight", "warden", "warden-captain", "forgotten-king", "drowned-god", "marrow-king", "marrow-cantor",
  "twice-dead", "thrice-dead", "last-watchman"]); // the wights joined 066: dry grave-flesh — nothing pumps, nothing spills, and nothing in them knows how to run; the watchman (076) kept his post past all of it
// GRAVE_FLESH: hollow, but a BODY — dried corpse, not bare bone or old iron
// (rome, 2026-07-11: "sounds like a zombie"). A wight has a skull to split, a
// spine to sever, ribs over what used to matter — so the vitals lottery stays
// open to EVERY weapon on these two, not the bone-set's blunt-only gate.
export const GRAVE_FLESH = new Set(["twice-dead", "thrice-dead", "last-watchman"]); // the watchman is a dried MAN in kit, not bare bone — every weapon finds him

// Behavior families — creatures that DO a thing, not just fight:
// THIEVES snatch an unsealed item on a hit and run; kill them to get it back.
export const THIEVES = new Set(["cutpurse", "cutthroat"]);
// RUNNERS never stand and fight — they bolt the instant they can, so the only
// way to kill one is to catch it: hit it as it breaks for the door.
export const RUNNERS = new Set(["fleet-rat"]);
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
export const WAKE_EXIT = 0.65;  // your move for the door is the loudest thing you do
export const WAKE_NOISE = 0.8;  // a fight in the room is almost unmissable
export const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
// SCAVENGERS roam the dungeon eating its dead (blood/remains litter), healing
// and — past BOLD — losing their nerve entirely: they stop fleeing and hit harder.
export const SCAVENGERS = new Set(["grave-hyena", "dire-hyena"]);
// VERMIN eat the dead too — but only to SURVIVE, none of the hyena's package.
// Rats had no food at all (not predators, not scavengers), so they sat pinned at
// max hunger, forever "restless with hunger" (rome, 2026-07-17: "what are rats
// eating? i always see them starving"). Now a hungry rat gnaws a corpse in its
// room to sate and heal a little — but it does NOT haul off loot, mourn its kin,
// or gorge itself bold into a threat (all of that stays gated on SCAVENGERS).
// The bone rooms clean their own dead; the rat just doesn't starve in them.
export const VERMIN = new Set(["rat", "fleet-rat", "brood-rat"]);
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
export const WATER_ROOMS = new Set(["the-sally-ditch", "the-black-fen", "the-drowned-orchard", "well", "the-dry-moat"]);
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
  ["dire-hyena", new Set(["rat", "fleet-rat", "grave-hyena"])],                // the mean cousin drives off the plain one
  ["grave-hyena", new Set(["rat", "fleet-rat"])],                              // hyenas eat rats
  ["albino-rat", new Set(["rat", "fleet-rat"])],                              // apex vermin bullies its own kind
  // The pale hunters are the DEEP's rat-catchers: hungry, they leave their lurk
  // and range toward the rat-runs (lurkerDrifts), run one down (predation), and
  // go quiet again. A stretch of dark with no rats left is what starves one onto
  // your torchlight (starvingHunts).
  ["pale-crawler", new Set(["rat", "fleet-rat", "brood-rat"])],
  ["pale-stalker", new Set(["rat", "fleet-rat", "brood-rat"])],
]);
export const PREDATION_ODDS = 0.35; // chance/tick an eligible predator strikes a roommate
// Who turns on a PLAYER when starved past all patience (STARVING_AT). Kept apart
// from PREYS_ON on purpose: hunting a lone delver for meat isn't the same list as
// "eats which weaker mob." The surface hunters carry a prey map too, so they run
// down an easier animal first (starvingHunts defers to it); the deep's pale
// hunters have NO prey down there — near-equals, everything else bloodless — so
// for them starvation has nowhere to go but your torchlight. (three-hound is a
// SENTINEL and takes the room on its own terms — it stays out.)
export const STARVE_HUNTERS = new Set(["dire-hyena", "grave-hyena", "albino-rat", "pale-crawler", "pale-stalker"]);
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
export const LURKER_HUNT_DRIFT_MS = 40 * 60_000;   // ~40 min between hunting moves (vs the 3h idle drift)
export const STARVE_HUNTS_ODDS = 0.2; // chance/tick a STARVING predator with no easier prey begins its wind-up on a player sharing the room (low: the threshold + no-prey gate already make it rare)
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
export const LURKERS = new Set(["pale-crawler", "pale-stalker"]);
// REVENANTS don't stay down: put one to 0 and it RISES ONCE, at part health, and
// comes again. The second death is the real one. A longer fight, not a lost one.
export const REVENANTS = new Set(["twice-dead", "thrice-dead", "marrow-king"]);
export const REVIVE_FRAC = 0.4;       // soft: it comes back weakened
// How many times a revenant gets back up before the fall is real. Default 1
// (twice-dead, marrow-king); the cairn-wight rises twice.
export const RISE_LIMIT: Record<string, number> = { "thrice-dead": 2 };
// How the hollow come apart when they run. The living just bleed.
export const HURT_STYLE: Record<string, { out: string; in_: string }> = {
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
export const AGGRESSIVE = new Set(["last-watchman"]);

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
export const FEARS_FIRE = new Set(["albino-rat"]);
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
export const FORAGE_ROOMS = new Set([...WARRENS_ROOMS, ...CARRION_ROOMS]);
export const FORAGE_HEAL = 3; // a scavenged nibble — less than a corpse (SCAVENGER_HEAL 6) or a dropped meal
// The open sky: every room where weather can reach you (the grounds ring +
// the overworks rooftops). The room-events engine (events.ts) reads this for
// rain; anything indoor — keep, warrens, deep — is cover.
export const OUTDOOR_ROOMS = new Set([...GROUNDS_ROOMS, ...OVERWORKS_ROOMS]);
// THE WORLD'S CLOCKS (the simulation's law, rome 2026-07-11): two tracks.
// The BELL is scheduled — a keep rings its bell at its own hours, twice a day,
// and a player can learn them. Everything else is ROLLED: one die, every few
// hours, picks ONE event from the whole pool — four to six a day, never a
// schedule, so the world surprises. An arc that isn't mid-run parks at
// "never"; only the roll (or the bell's hours) starts one.
export const ROLL_EVERY_MIN_MS = 3 * 3_600_000; // between rolls: 3-6h -> 4-6 events/day
export const ROLL_EVERY_MAX_MS = 6 * 3_600_000;
export const ROLL_FIRST_MIN_MS = 20 * 60_000; // a fresh world proves its sky within the hour
export const ROLL_FIRST_MAX_MS = 60 * 60_000;
export const ROLL_GRACE_MS = 10 * 60_000; // a roll slept past by more than this happened unobserved
export const ROLL_MISSED_MIN_MS = 15 * 60_000; // ...and the next one lands mid-cycle, not instantly-on-login
export const ROLL_MISSED_MAX_MS = 3 * 3_600_000;
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
export const REACH_ITEMS = new Set(["quarterstaff", "pitted-spear", "war-pike", "abyssal-harpoon", "gaff-hook"]);
// PIERCE: the point punches plate — ignores this many points of a mob's armor.
// The picks, and now the thrusting shafts (spear/pike/harpoon) — piercing is a
// real class, the anti-armor answer, distinct from the edge that opens flesh and
// the weight that caves bone (rome, 2026-07-17).
export const PIERCE = new Map<string, number>([
  ["rusted-pick", 2], ["horsemans-pick", 2], ["crow-beak-pick", 3],
  ["pitted-spear", 1], ["war-pike", 2], ["abyssal-harpoon", 2],
  ["forged-warspike", 2], // the forge's pierce answer (092) — punches plate like the war-pike
]);
// A blunt weapon (stun > 0) ignores this much armor — crushing weight caves plate
// the way a point slips it. Flat, categorical (every blunt weapon), unlike the
// per-weapon PIERCE map. The mace was history's answer to armor; so it is here.
// Restored 1 -> 2 (rome, 2026-07-19): the load law made blunts the HEAVIEST
// weapons (stun adds a point of weight), so 2 is earned now, not free — and it
// lets blunt be the anti-heavy RPS counter it's meant to be, which at 1 it
// couldn't (couldn't actually cave plate). The PICKS stay distinct: lighter, and
// their 2-3 pierce still tops out above a mace's flat 2.
export const BLUNT_ARMOR_IGNORE = 2;
// TWO_HANDED: wants both hands; no shield alongside it (enforced at equip).
export const TWO_HANDED = new Set(["war-pike", "abyssal-harpoon"]);
// PADDED: a mob's stun rings you half as often. Best piece counts — padding
// under padding is just padding (the trait is a boolean, it never stacks).
// Wards stun: padding halves stun odds. The padded-jerkin finally earns its
// name, and the deadplate's grave-quiet mass shrugs the ringing off (its
// answer to the lighter chitin — every epic body is a different bet).
export const PADDED = new Set(["quilted-coif", "riveted-cuirass", "padded-jerkin", "deadplate-harness", "padded-greathelm"]);
export const PADDED_STUN_MULT = 0.5;
// Stun tuning lives in the DATA, not in code multipliers (rome, 2026-07-12,
// after the Emberknock stun-chain): migration 073 halved every weapon's stun
// stat at the source. One number per weapon, no special-case laws. Bosses
// were never stunnable (is_boss); the padded coif halves what reaches a head.
// The wound wards, split by what the fiction can honestly promise:
// WARDHIDE (thick hide) pads the whole body — bleeds AND leg-rakes turned.
// MAILWARD (riveted rings) turns edges only — a cut skates, but a hyena can
// still yank the leg out from under the mail. Both roll SEPARATELY from
// guarded stance, so hide under a guard stacks to a quarter.
export const WARDHIDE = new Set(["thick-hide-jack", "sentinels-mantle", "bone-barred-visor"]);
export const MAILWARD = new Set(["mail-hauberk", "riveted-coif", "chain-lined-mantle"]);
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
export const PIERCING_WEAPONS = new Set([
  "rusted-pick", "horsemans-pick", "crow-beak-pick", // picks: PIERCE-mapped points
  "pitted-spear", "war-pike", "abyssal-harpoon",     // the point-spears that thrust through
]);
export const VITALS_HOUND = 1 / 5000; // the sentinel's tiny pierce-only vitals chance
// QUIET: LISTENER wake odds halved while worn (felt says nothing to the bones).
export const QUIET_ITEMS = new Set(["felt-soled-boots", "grave-shroud", "pale-hide-hood", "shade-wrapped-greaves", "shroud-hood", "shadow-step-boots", "drowned-divers-shroud"]);
export const QUIET_WAKE_MULT = 0.5;
// SLICK: a drowned grip takes hold half as often, and breaks easier.
export const SLICK = new Set(["eel-skin-cloak", "kelp-woven-mail", "abyssal-scale-coat", "eel-hide-treads"]);
export const SLICK_SEIZE_MULT = 0.5;
export const SLICK_BREAK_BONUS = 0.25; // added to SEIZE_BREAK_ODDS
// STRAPPED: everything lashed down — the cutpurse's fingers find no purchase.
export const STRAPPED = new Set(["strapped-baldric"]);
// THORNS: a blocked blow costs the attacker (the buckler's spike answers).
export const THORNS = new Map<string, number>([["spiked-buckler", 1], ["crown-guard-pavise", 2],
  ["bristling-targe", 2], ["smiths-aegis", 2]]); // forge off-hands (093): the targe and the wall-class aegis bite back
// MANCATCHER (065): the barbed snare-pole fills the shield hand with DENIAL, not
// defense — a creature your catcher is on cannot flee (the 18%-hp bolt, the
// runner's dash, even fire-panic: the collar holds them all). Zero block: you
// traded your guard for the guarantee. PvP RULE, stamped now for later: against
// PLAYERS the barbs must HOBBLE (HOBBLE_FLEE_MS limp), never hard-hold — flee is
// the victim's only out in a full-loot game, and a hard hold is a griefing tool.
export const MANCATCHER = new Set(["man-catcher"]);
// PARRY_RIPOSTE (065): an off-hand blade that answers what it turns — a caught
// blow opens a bleed on the attacker (value = bleedDmg, BLEED_TICKS as usual).
// THORNS's cousin on the other axis: burst vs armor-ignoring drip. HOLLOW
// attackers don't bleed, same as everywhere.
export const PARRY_RIPOSTE = new Map<string, number>([["parrying-dagger", 2], ["forged-main-gauche", 3]]); // the forge's counter off-hand (093)

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
export const AMBIENCE: Record<"gate" | "deep" | "upper", string[]> = {
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

