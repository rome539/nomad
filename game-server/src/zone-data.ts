// Tuning constants, creature-behavior sets, and the flavor/bestiary text tables
// for the dungeon — lifted out of the ZoneDO monolith. Pure data; no state, no
// logic. Values and names are unchanged from when they lived in zone.ts.
import type { Stance } from "./zone-types";


export const TICK_MS = 2000;
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
export const THROW_COOLDOWN_MS = 2000; // one throw per round — no rock machine-guns
export const THROW_SHATTER = 0.15; // a thrown thing may not survive the landing
export const THROW_SHATTER_HOLLOW = 0.4; // stone on bone or old iron, near coin-flip
// Bone and old iron eat an edge faster than flesh: landed strikes on the HOLLOW
// grind a weapon ~2.4× the normal rate (rome's rule — wear as a counter, not
// just smaller numbers). ~165 strikes on skeletons wears a fresh blade out —
// a real bone-tax at the loot floor, not a weapon-shredder (was 8× / ~50, too
// fast: a single deep dive through the Demesne could ruin a blade).
export const WEAPON_WEAR_HOLLOW = 0.6;

// Mobility: unburdened (worn weight 0, or nothing worn) means foes miss you
// more, and you slip out of a fight clean. Heavy mail turns blows better but
// a parting strike may catch you as you flee.
export const DODGE_LIGHT = 0.05; // added to the foe's miss chance when you're quick
export const PARTING_BLOW_CHANCE = 0.4; // heavy armor: odds the fight bills you on the way out

// Fighting stance: trade offense for defense. `atk` scales the damage you deal,
// `def` scales the damage you take (after armor). Reckless is a glass edge;
// guarded is a turtle; steady is even. A moment-to-moment choice (`stance`).
export const STANCE: Record<Stance, { atk: number; def: number }> = {
  reckless: { atk: 1.5, def: 1.5 }, // a true gamble: hit half again as hard — and take it half again as hard
  steady: { atk: 1.0, def: 1.0 },
  guarded: { atk: 0.6, def: 0.6 }, // soak far less, but your blows lose their bite
};
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
export const LOCKBOX_CAP = 8; // the run closet — small, takes anything, sealed or raw
export const VAULT_CAP = 50; // the bank — deep, generous, sealed wealth only
// Not every forced box pays out. Now and then the lock gives on nothing —
// picked clean before you got there, or never worth the key. Uncommon enough
// that a haul still feels earned, common enough to sting when a key buys air.
// (The reliquary is spared it — see cmdUnlock: a boss-and-black-key box that
// duds is cruelty, not mischief.)
export const CACHE_EMPTY_ODDS = 0.15;
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
// Knowledge as loot (see migration 029). Read by id, like the scrap above.
export const DETAILED_MAP = "surveyor-map";
export const CRUDE_MAP = "crude-map";
export const MAP_ITEMS = new Set([DETAILED_MAP, CRUDE_MAP]);
export const JOURNAL_ITEM = "hunters-journal";
// Fishing: only off the dry shelf of the Pocket of Air, dropping a line into
// the flood below (where the water — and what swims in it — can't reach you).
// A cast rarely lands anything; the catch is mostly the blind cave-fish, now
// and then the rarer, richer pale eel. Patience, not a button to mash.
export const FISHING_ROOMS = new Set(["pocket-of-air"]);
export const FISH_ODDS = 0.18;         // a cast catches SOMETHING less than one time in five
export const PALE_EEL_ODDS = 0.2;      // of those catches, a fifth are the rare eel
export const FISH_COOLDOWN_MS = 6000;  // each cast is a deliberate wait
// How much a crude map lies: how much of the map it omits, and how many of the
// exits it does show are wrong (dropped or pointing at the wrong room).
export const CRUDE_DROP_ROOM = 0.30;  // ~30% of rooms simply aren't on it
export const CRUDE_BAD_EXIT = 0.15;   // ~15% of shown exits are a lie
export const SALVAGE_YIELD: Record<string, number> = { common: 1, uncommon: 2, rare: 4, epic: 8 };
export const REPAIR_COST: Record<string, number> = { common: 1, uncommon: 1, rare: 2, epic: 3 };
// The gate keeper deals in kind: barter value ≥ this and his manner changes.
// What clears the bar is never written down anywhere a player can read.
export const RICH_TENDER = 15;
// Canonical compass order for direction chips, so they never shuffle room to room.
export const DIR_ORDER: Record<string, number> = { north: 0, south: 1, east: 2, west: 3, up: 4, down: 5 };
export const RATE_CAPACITY = 6; // command tokens
export const RATE_REFILL_PER_SEC = 2;

// Body: wounds close only deliberately — resting, or the shelter of a
// gatehouse (bench or hatch open at a gate: out of the world, mending).
// Death wakes you whole: the price of dying is everything you carried,
// not a hobbled morning.
export const REST_REGEN_PER_TICK = 1;

// Simulation clocks.
export const SIM_STEP_MS = 60_000; // catch-up granularity
export const CATCHUP_CAP_MS = 14 * 24 * 3_600_000;
export const CREATURE_HEAL_PER_MIN = 1;
export const HUNGER_PER_MIN = 2; // 0..100
export const HUNGER_MAX = 100;
export const HUNGRY_AT = 50;
export const WANDER_MIN_MS = 45_000;
export const WANDER_MAX_MS = 150_000;
export const FLEE_BELOW = 0.25;
export const FLEE_CHANCE = 0.5; // per tick once below the threshold
export const MIGRATION_FACTOR = 10; // respawn_secs * this = how long an EMPTY/solo zone takes to refill (was 20; halved so leaner rooms don't feel dead)
// A busy dungeon refills faster: more wanderers, more blood and disturbance,
// more drawn up from the dark. The effective factor is divided by the number
// of players in the zone (solo = unchanged), down to a floor so even a crowd
// keeps some scarcity. Bosses are exempt — the King reforms on its own clock.
export const MIGRATION_MIN_FACTOR = 5;
export const REGROW_MS = 10 * 60_000; // the shrine replaces its gifts
export const GRUDGE_MAX = 5;
// How long a creature holds a grudge before it forgets — each kind at its own
// pace. Killing the creature settles it outright (it's gone, and a migrant
// replacement never knew you); this is the slower mercy of time for one you
// couldn't put down. The Forgotten King never forgets (is_boss → Infinity).
export const FORGET_MS: Record<string, number> = {
  rat: 30 * 60_000,            // vermin: a short, scrabbling temper
  "fleet-rat": 30 * 60_000,    // it's already running; a grudge means little
  "brood-rat": 24 * 3_600_000, // a mother remembers what came for her nest
  cutpurse: 20 * 60_000,       // it got what it wanted; no reason to hold a grudge
  skeleton: 24 * 3_600_000,    // habit and repetition — about a day
  "grave-hyena": 12 * 3_600_000, // remembers a bad meal half a day
  "dire-hyena": 24 * 3_600_000,  // the mean one holds it a full day
  warden: 7 * 24 * 3_600_000,  // a hollow warden holds it a week
};
export const FORGET_DEFAULT = 24 * 3_600_000;
export const COMBAT_NOISE_EVERY_MS = 8000; // a running fight rings out this often
export const NOISE_HEED_ODDS = 0.7; // a good majority of mobs check out a noise; the rest don't bother
export const DOGPILE_CAP = 3; // most creatures that can land a blow on one player in a tick; the rest press at the edges
export const CROWD_CAP = 5; // a room this full stops drawing more (no wandering in, no answering a fight) — no black holes
// Worn slots that contribute ARMOR (they all sum). The shield is a worn slot
// too but pays in BLOCK, not soak; the weapon is worn for WEIGHT only.
export const ARMOR_SLOTS = new Set(["armor", "helm", "feet", "cloak"]);
export const BLEED_TICKS = 3; // how many ticks a fresh cut weeps before it clots
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
export const ROT_MS = 12 * 3_600_000; // food on the floor keeps this long

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
  "the-drowned": "Water shifts {dir}, thick and slow, around something wading.",
  "drowned-hulk": "A great mass moves through water {dir}, and the flood slaps the walls.",
  "pale-crawler": "Something long drags itself over wet stone {dir}.",
  "pale-stalker": "A wet, boneless sound slides {dir}, and stops.",
  "twice-dead": "Old bones shift {dir}, unhurried, as if they have all the time there is.",
  "thrice-dead": "Something dead resettles itself {dir}, patient and wrong.",
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
export const MOUTHS = ["well", "oubliette", "kennels", "catacomb", "the-weir", "root-vault"];

// The warden walks its rounds — it always has ("armor... still walking its
// rounds"). Knocked off the route (fled, investigated), it drifts back. It
// beats the full INNER RING that circles the hall — never the gates (the
// threshold rule bars that) and never resting on any one wanderer's path in.
// Each step is to an adjacent room, so the rounds actually close.
export const PATROLS: Record<string, string[]> = {
  warden: ["barracks", "cells", "cistern", "ossuary", "catacomb", "kennels", "armory", "gallery"],
  "warden-captain": ["barracks", "cells", "cistern", "ossuary", "catacomb", "kennels", "armory", "gallery"],
};

// Creatures with nothing inside. They do not bleed (broken remains, not blood),
// do not hunger, and no smell of food moves them. The rat is the only thing
// down here that's honestly alive.
export const HOLLOW = new Set(["skeleton", "bone-knight", "warden", "warden-captain", "forgotten-king", "drowned-god", "marrow-king", "marrow-cantor"]);

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
export const BROOD_CAP = 2; // most rats a mother keeps in her nest room
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
// The mean subtype GUARDS its meal: walk into a room where it's on a corpse
// (or where it's already gorged bold) and it turns on you unprovoked. It also
// hits harder and holds a grudge longer — a far worse thing to disturb.
export const AGGRO_SCAVENGERS = new Set(["dire-hyena"]);
// It doesn't spring the instant you're in reach — it lifts its head, hackles up,
// and takes a beat to commit. That wind-up is your window to back out or hit first.
export const DIRE_ROUSE_MS = 5000;
export const CORPSE_TRACES = new Set(["blood", "remains"]);
export const SCAVENGER_HEAL = 6; // hp restored per corpse fed on
export const SCAVENGER_BOLD_AT = 3; // corpses eaten before it turns bold
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
export const PIERCE_TELL = [
  "the point finds the gap in its plate", "the narrow point punches through",
  "it slips past the armor", "plate can't turn a point like that", "the point bites past the guard",
];
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
// Which register a creature swings in. Order matters — first match wins.
export const BITERS = new Set([
  "rat", "fleet-rat", "brood-rat", "albino-rat", "grave-hyena", "dire-hyena", "pale-crawler", "pale-stalker",
  "three-hound", // three sets of teeth at the throat of the deep
]);

// SENTINELS hold their post. A guardian chained to one room: it never wanders
// (live tick or offline sim), and noise doesn't lure it off station. The
// three-headed hound holds the throat of the deep.
export const SENTINELS = new Set(["three-hound"]);
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
// Items that count as an open flame in hand. EMPTY until torches exist — add the
// lit-torch / burning-brand id here (or switch carriesFire to a `light` item
// property) when the Light & search phase ships, and FEARS_FIRE comes alive.
export const FIRE_ITEMS = new Set<string>([]);

// ---- gear traits (the 045 audit expansion): properties, not bigger numbers ----
// Every trait is a one-line hook into a system the simulation already runs.
// Stats live in D1 (045); WHAT a piece does lives here, the FEARS_FIRE pattern.
// REACH: a haft held at length blunts the ambush — a grudge-holder's entry
// first-strike loses its AMBUSH_MULT against a wielder set to receive.
export const REACH_ITEMS = new Set(["quarterstaff", "pitted-spear", "war-pike", "abyssal-harpoon", "gaff-hook"]);
// PIERCE: the pick punches plate — ignores this many points of a mob's armor.
export const PIERCE = new Map<string, number>([["horsemans-pick", 2], ["crow-beak-pick", 3]]);
// TWO_HANDED: wants both hands; no shield alongside it (enforced at equip).
export const TWO_HANDED = new Set(["war-pike", "abyssal-harpoon"]);
// PADDED: a mob's stun rings you half as often. Best piece counts — padding
// under padding is just padding (the trait is a boolean, it never stacks).
export const PADDED = new Set(["quilted-coif", "riveted-cuirass"]);
export const PADDED_STUN_MULT = 0.5;
// WARDHIDE: claw-wounds (armor-ignoring bleed) open half as often. Rolls
// SEPARATELY from guarded stance — hide under a guard stacks to a quarter.
export const WARDHIDE = new Set(["thick-hide-jack", "sentinels-mantle"]);
export const WARDHIDE_WOUND_ODDS = 0.5;
// QUIET: LISTENER wake odds halved while worn (felt says nothing to the bones).
export const QUIET_ITEMS = new Set(["felt-soled-boots", "grave-shroud", "pale-hide-hood", "shade-wrapped-greaves"]);
export const QUIET_WAKE_MULT = 0.5;
// SLICK: a drowned grip takes hold half as often, and breaks easier.
export const SLICK = new Set(["eel-skin-cloak", "kelp-woven-mail", "abyssal-scale-coat"]);
export const SLICK_SEIZE_MULT = 0.5;
export const SLICK_BREAK_BONUS = 0.25; // added to SEIZE_BREAK_ODDS
// STRAPPED: everything lashed down — the cutpurse's fingers find no purchase.
export const STRAPPED = new Set(["strapped-baldric"]);
// THORNS: a blocked blow costs the attacker (the buckler's spike answers).
export const THORNS = new Map<string, number>([["spiked-buckler", 1], ["crown-guard-pavise", 2]]);

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
]);

// The corpse-key. The black door into the deep opens to a still-cold heart cut
// from a deep-dweller the sim surfaced — not a key on a shelf. While the door is
// SEALED, the deep coughs one of its mobile own up into the shallows on a slow
// clock; kill it (its heart drops, `surfaced`-flagged) and press the heart to the
// door before it spoils. Fresh heart opens it (and is consumed); a stale one is
// grey slime. No hoarding (it rots), no soft-lock (the sim keeps surfacing).
export const DEEP_HEART = "deep-heart";               // the perishable key item
export const DEEP_DOOR_KEY = "undercroft:down";       // "roomId:dir" of the sealed deep door (the stair out of the undercroft, past the hound)
export const HEART_FRESH_SEC = 600;                   // a heart opens the door for 10 min after the cut, then it's slime
export const SURFACE_INTERVAL_MS = 360_000;           // while sealed, the deep surfaces one dweller ~every 6 min
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
  ],
  upper: [
    "Dust sifts down out of the dark of the vaulting.",
    "Far off, water finds stone, drop by patient drop.",
    "Something small moves in the wall, and thinks better of it.",
    "The dungeon settles around you with a sound like a held breath let go.",
    "A draft passes, carrying old smoke and older bone.",
    "For a moment the dark seems to lean closer. Then it doesn't.",
    "Somewhere, stone grinds on stone, and the silence closes over it.",
  ],
  deep: [
    "Black water laps at the edge of the dark, unhurried.",
    "Something turns over in the flood, far off, and goes still.",
    "A slow drip counts out the silence, somewhere overhead.",
    "The cold here is a wet hand laid flat against your back.",
    "Bubbles break the surface where nothing should be breathing.",
    "The water carries a sound you feel more than hear, and cannot place.",
  ],
};
export const ROOM_AMBIENCE: Record<string, string[]> = {
  smokehouse: ["The old smoke-racks tick overhead, hung with nothing now.", "A ghost of cured smoke still hangs in the cold air."],
  larder: ["The stores keep their long cold silence around you."],
  oubliette: ["A breath of colder air rises from the pit, and something in it that is not air."],
  shrine: ["The altar waits, patient as only dead stone can be."],
  "pocket-of-air": ["The air here is thin and breathable and does not smell of the water. You breathe while you can."],
  "sunken-throne": ["The flooded dark hums, low, as if the throne remembers being sat.", "The water around the throne is very, very still."],
  "kings-hoard": ["Gold gleams once in the dark, and is swallowed again."],
};
export const AMBIENT_COOLDOWN_MS = 45_000; // at most one breath of atmosphere this often, per wanderer
export const AMBIENT_ODDS = 0.16;          // ~per 2s tick, once off cooldown
export const RECONNECT_GRACE_MS = 5 * 60_000; // a re-weave within this of dropping is a reconnect, not a fresh arrival

