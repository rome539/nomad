// One Durable Object per zone: the authoritative simulation — who's where,
// creature state, what lies on which floor.
//
// The world is a simulation, not a theme park. Creatures live: they wander,
// hunger, eat what smells good, flee when badly hurt, and hold grudges.
// The dead stay dead until something new migrates in. Wounds close only
// with rest or food. What you drop stays where you dropped it; what you
// carry scatters where you fall.
//
// Nothing ticks in an empty dungeon: the whole simulation (plus timestamp)
// persists in DO storage, and catchUp() fast-forwards what happened since
// the world was last observed. An idle dungeon costs nothing; a returning
// player finds a world that kept going without them.
//
// Wire shapes mirror the future protocol (NOMAD-PLAN.md) so step 4 is a
// transport swap, not a rewrite:
//   in  : { v:0, t:"cmd", text }              (becomes kind 24911)
//   out : { v:0, kind:24912, text }           personal view
//   out : { v:0, kind:24913, room, text }     public room feed
//   out : { v:0, t:"status", ... }            client UI helper, not protocol
//   out : { v:0, t:"ctx", suggest }           client UI helper, not protocol
import type { Env } from "./env";
import {
  loadWorld,
  getOrCreatePlayer,
  recordKill,
  recordDeath,
  renamePlayer,
  savePlayer,
  setStance,
  loadInventory,
  loadContainer,
  setContainer,
  setEquipped,
  setItemCondition,
  insertLoot,
  removeItemRow,
  clearCarriedInventory,
  mintClaim,
  setMintEvent,
  voidMint,
  setItemJournalId,
  journalLoad,
  journalBumpKill,
  journalStudy,
  type World,
  type MobTemplate,
  type ItemTemplate,
  type CarriedItem,
  type Cache,
} from "./world";
import { parse, HELP_TEXT, type Command } from "./parser";
import { randInt, chance, uuid, pick } from "./rng";
import { isGameKeyConfigured, signLootEvent, signSheetEvent, signFeedEvent } from "./signing";
import { publishEvent, relayList } from "./relay";

const TICK_MS = 2000;
// The world ticks every TICK_MS, but blows land on a slower heartbeat so a
// fight is readable: you get this long between exchanges to read the room and
// decide — change stance, choke down food, or run — before steel meets steel
// again. Everything else (regen, movement, atmosphere) stays at the tick.
const COMBAT_ROUND_MS = 4000;
// Bare hands. Steel is carried, never granted — a fresh key is a weak key,
// and that weakness is the sybil resistance (a throwaway identity is a
// throwaway threat). The best weapon in the pack adds its dmg.
const PLAYER_DMG_MIN = 2;
const PLAYER_DMG_MAX = 5;
// Fat tails, the same for every living thing that swings — the world never
// moralizes, but every attack is a gamble.
const CRIT_CHANCE = 0.05;
const FUMBLE_CHANCE = 0.05;
// Gear condition (0-100) decays VERY slowly — wear is a background pressure, a
// battered blade is a veteran's, not a fragile toy. Only PROVISIONAL gear
// decays; the gate's seal freezes it whole.
const WEAPON_WEAR = 0.25; // per strike landed (~400 swings to wear out fresh)
const ARMOR_WEAR = 0.3;   // per hit turned away (~330 blows)
const RUST_PER_TICK = 0.001; // per 2s tick while carried in the damp (~55h to rust away)

// Wounds are felt, not just counted — on BOTH sides of the blade. Below a
// third of your blood, your blows soften and your hands shake; same for them.
const WOUNDED_FRACTION = 1 / 3;
const WOUNDED_DMG_MULT = 0.75;
const WOUNDED_FUMBLE_BONUS = 0.05;
// Auto-eat: when a fight drops you below this and you're carrying provisions,
// a hand goes to the pack on its own — one reflexive bite so a distracted
// wanderer doesn't bleed out mid-swing. Fires below the WOUNDED line (it's a
// last resort, not a feeding trough) and, being a reflex, never staggers you.
const AUTO_EAT_FRACTION = 0.25;
// Initiative: the first blow against something that hasn't marked you yet
// lands heavy. (Getting jumped already costs you — this is the other edge.)
const AMBUSH_MULT = 1.5;
// A thrown thing: its own bite plus the arm behind it, and then it's on the
// floor — theirs to stand on, yours to fetch back.
const THROW_DMG_MIN = 1; // the arm adds less than a full swing
const THROW_DMG_MAX = 3;
const THROW_COOLDOWN_MS = 2000; // one throw per round — no rock machine-guns
const THROW_SHATTER = 0.15; // a thrown thing may not survive the landing
const THROW_SHATTER_HOLLOW = 0.4; // stone on bone or old iron, near coin-flip
// Bone and old iron eat an edge: landed strikes on the HOLLOW grind a weapon
// eight times faster than flesh does (rome's rule — wear as a counter, not
// just smaller numbers). ~50 strikes on skeletons wears a fresh blade out.
const WEAPON_WEAR_HOLLOW = 2.0;

// Mobility: unburdened (worn weight 0, or nothing worn) means foes miss you
// more, and you slip out of a fight clean. Heavy mail turns blows better but
// a parting strike may catch you as you flee.
const DODGE_LIGHT = 0.05; // added to the foe's miss chance when you're quick
const PARTING_BLOW_CHANCE = 0.4; // heavy armor: odds the fight bills you on the way out

// Fighting stance: trade offense for defense. `atk` scales the damage you deal,
// `def` scales the damage you take (after armor). Reckless is a glass edge;
// guarded is a turtle; steady is even. A moment-to-moment choice (`stance`).
type Stance = "reckless" | "steady" | "guarded";
const STANCE: Record<Stance, { atk: number; def: number }> = {
  reckless: { atk: 1.5, def: 1.3 }, // hit half again as hard — and get hit harder
  steady: { atk: 1.0, def: 1.0 },
  guarded: { atk: 0.6, def: 0.6 }, // soak far less, but your blows lose their bite
};
const STAGGER_BONUS = 2; // an opening costs you
// Carry space is measured in SLOTS. Fungibles (trophies, food, scrap, keys,
// cigarettes) stack: a whole pile of rat-tails is one slot. Gear, sealed items,
// journals, and maps are each their own slot. So the pack limits distinct kit
// you haul, not how many trophies you hoard.
const PACK_CAP = 20;
const LOCKBOX_CAP = 8; // the run closet — small, takes anything, sealed or raw
const VAULT_CAP = 50; // the bank — deep, generous, sealed wealth only
// Not every forced box pays out. Now and then the lock gives on nothing —
// picked clean before you got there, or never worth the key. Uncommon enough
// that a haul still feels earned, common enough to sting when a key buys air.
// (The reliquary is spared it — see cmdUnlock: a boss-and-black-key box that
// duds is cruelty, not mischief.)
const CACHE_EMPTY_ODDS = 0.15;
// A sentinel chip: the client intercepts it and opens the bench modal instead
// of sending it as a command (see renderChips).
const BENCH_CHIP = "open the lockbox";
// Same trick for the keeper's hatch: the client opens the trade modal instead
// of sending it as text. (Typed 'barter'/'buy'/'offer' still work bare.)
const TRADE_CHIP = "barter with the keeper";
// The bench's other trades (gate only): the vice breaks gear into scrap iron,
// scrap mends wear, and the recipe book (forge_recipes) turns scrap back into
// steel. Yields and mend costs scale with rarity; epics are found, never made.
const SCRAP_ID = "scrap-iron";
// Knowledge as loot (see migration 029). Read by id, like the scrap above.
const DETAILED_MAP = "surveyor-map";
const CRUDE_MAP = "crude-map";
const MAP_ITEMS = new Set([DETAILED_MAP, CRUDE_MAP]);
const JOURNAL_ITEM = "hunters-journal";
// Fishing: only off the dry shelf of the Pocket of Air, dropping a line into
// the flood below (where the water — and what swims in it — can't reach you).
// A cast rarely lands anything; the catch is mostly the blind cave-fish, now
// and then the rarer, richer pale eel. Patience, not a button to mash.
const FISHING_ROOMS = new Set(["pocket-of-air"]);
const FISH_ODDS = 0.18;         // a cast catches SOMETHING less than one time in five
const PALE_EEL_ODDS = 0.2;      // of those catches, a fifth are the rare eel
const FISH_COOLDOWN_MS = 6000;  // each cast is a deliberate wait
// A crude map lies the SAME way every time you open it (or it reads as noise,
// not a map). The lie is seeded off the book's row id, so a given scrap is
// consistently wrong — and a second crude map is wrong differently. Deterministic
// PRNG (mulberry32) + a cheap string hash feed it; never the CSPRNG.
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// How much a crude map lies: how much of the map it omits, and how many of the
// exits it does show are wrong (dropped or pointing at the wrong room).
const CRUDE_DROP_ROOM = 0.30;  // ~30% of rooms simply aren't on it
const CRUDE_BAD_EXIT = 0.15;   // ~15% of shown exits are a lie
const SALVAGE_YIELD: Record<string, number> = { common: 1, uncommon: 2, rare: 4, epic: 8 };
const REPAIR_COST: Record<string, number> = { common: 1, uncommon: 1, rare: 2, epic: 3 };
// The gate keeper deals in kind: barter value ≥ this and his manner changes.
// What clears the bar is never written down anywhere a player can read.
const RICH_TENDER = 15;
// Barter values can be fractional (a rat-tail is worth 0.1), so a counter total
// is summed in floats — round to a clean tenth so ten tails read as 1, not
// 0.999…, and the "square" check never sticks a hair short.
const roundTender = (n: number) => Math.round(n * 10) / 10;
// Canonical compass order for direction chips, so they never shuffle room to room.
const DIR_ORDER: Record<string, number> = { north: 0, south: 1, east: 2, west: 3, up: 4, down: 5 };
const RATE_CAPACITY = 6; // command tokens
const RATE_REFILL_PER_SEC = 2;

// Body: wounds close only deliberately — resting, or the shelter of a
// gatehouse (bench or hatch open at a gate: out of the world, mending).
// Death wakes you whole: the price of dying is everything you carried,
// not a hobbled morning.
const REST_REGEN_PER_TICK = 1;

// Simulation clocks.
const SIM_STEP_MS = 60_000; // catch-up granularity
const CATCHUP_CAP_MS = 14 * 24 * 3_600_000;
const CREATURE_HEAL_PER_MIN = 1;
const HUNGER_PER_MIN = 2; // 0..100
const HUNGER_MAX = 100;
const HUNGRY_AT = 50;
const WANDER_MIN_MS = 45_000;
const WANDER_MAX_MS = 150_000;
const FLEE_BELOW = 0.25;
const FLEE_CHANCE = 0.5; // per tick once below the threshold
const MIGRATION_FACTOR = 20; // respawn_secs * this = how long an EMPTY/solo zone takes to refill
// A busy dungeon refills faster: more wanderers, more blood and disturbance,
// more drawn up from the dark. The effective factor is divided by the number
// of players in the zone (solo = unchanged), down to a floor so even a crowd
// keeps some scarcity. Bosses are exempt — the King reforms on its own clock.
const MIGRATION_MIN_FACTOR = 5;
const REGROW_MS = 10 * 60_000; // the shrine replaces its gifts
const GRUDGE_MAX = 5;
// How long a creature holds a grudge before it forgets — each kind at its own
// pace. Killing the creature settles it outright (it's gone, and a migrant
// replacement never knew you); this is the slower mercy of time for one you
// couldn't put down. The Forgotten King never forgets (is_boss → Infinity).
const FORGET_MS: Record<string, number> = {
  rat: 30 * 60_000,            // vermin: a short, scrabbling temper
  "fleet-rat": 30 * 60_000,    // it's already running; a grudge means little
  "brood-rat": 24 * 3_600_000, // a mother remembers what came for her nest
  cutpurse: 20 * 60_000,       // it got what it wanted; no reason to hold a grudge
  skeleton: 24 * 3_600_000,    // habit and repetition — about a day
  "grave-hyena": 12 * 3_600_000, // remembers a bad meal half a day
  "dire-hyena": 24 * 3_600_000,  // the mean one holds it a full day
  warden: 7 * 24 * 3_600_000,  // a hollow warden holds it a week
};
const FORGET_DEFAULT = 24 * 3_600_000;
const COMBAT_NOISE_EVERY_MS = 8000; // a running fight rings out this often
const NOISE_HEED_ODDS = 0.7; // a good majority of mobs check out a noise; the rest don't bother
const DOGPILE_CAP = 3; // most creatures that can land a blow on one player in a tick; the rest press at the edges
const CROWD_CAP = 5; // a room this full stops drawing more (no wandering in, no answering a fight) — no black holes
// Worn slots that contribute ARMOR (they all sum). The shield is a worn slot
// too but pays in BLOCK, not soak; the weapon is worn for WEIGHT only.
const ARMOR_SLOTS = new Set(["armor", "helm", "feet", "cloak"]);
const BLEED_TICKS = 3; // how many ticks a fresh cut weeps before it clots

// Traces: the world's memory, decaying at each kind's own pace.
const TRACE_LIFE_MS: Record<string, number> = {
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
const TRACE_CAP = 12; // per room; oldest non-carving forgotten first
const CARVE_CAP = 5; // wall space is finite
const CARVE_MAX_LEN = 40;
const ROT_MS = 12 * 3_600_000; // food on the floor keeps this long

// What a creature on the move sounds like from one room away. Every dweller
// gets its own voice through the walls — the deep ones especially, so the dark
// below is never just "something moves."
const MOVE_SOUNDS: Record<string, string> = {
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
const TERRITORY_RADIUS = 3;
// The dark mouths: where migrants physically enter the world — a well shaft,
// a forgotten hole, cracks the dungeon never sealed. A refill surfaces at the
// mouth nearest its den and walks in; nothing materializes in a watched room.
// (The sessile — brood-mothers, the drowned — simply are where they live.)
const MOUTHS = ["well", "oubliette", "kennels", "catacomb", "the-weir", "root-vault"];

// The warden walks its rounds — it always has ("armor... still walking its
// rounds"). Knocked off the route (fled, investigated), it drifts back. It
// beats the full INNER RING that circles the hall — never the gates (the
// threshold rule bars that) and never resting on any one wanderer's path in.
// Each step is to an adjacent room, so the rounds actually close.
const PATROLS: Record<string, string[]> = {
  warden: ["barracks", "cells", "cistern", "ossuary", "catacomb", "kennels", "armory", "gallery"],
  "warden-captain": ["barracks", "cells", "cistern", "ossuary", "catacomb", "kennels", "armory", "gallery"],
};

// Creatures with nothing inside. They do not bleed (broken remains, not blood),
// do not hunger, and no smell of food moves them. The rat is the only thing
// down here that's honestly alive.
const HOLLOW = new Set(["skeleton", "bone-knight", "warden", "warden-captain", "forgotten-king", "drowned-god", "marrow-king"]);

// Behavior families — creatures that DO a thing, not just fight:
// THIEVES snatch an unsealed item on a hit and run; kill them to get it back.
const THIEVES = new Set(["cutpurse", "cutthroat"]);
// RUNNERS never stand and fight — they bolt the instant they can, so the only
// way to kill one is to catch it: hit it as it breaks for the door.
const RUNNERS = new Set(["fleet-rat"]);
// BROODERS are nest-bound: they don't wander, don't flee, and while they live
// they keep birthing scabby rats into their room. Kill the mother or the room
// stays an infestation. A living source, not a stat block.
const BROODERS = new Set(["brood-rat"]);
const BROOD_CAP = 2; // most rats a mother keeps in her nest room
const BROOD_INTERVAL_MS = 90_000; // ~90s between births
// LISTENERS are dormant to sight — empty sockets, nothing behind them — but
// they HEAR. A still, quiet wanderer they walk right past; move (in or out) or
// make a din and they may lurch awake and swing. (A grudge still wakes them
// outright; this is only for the ones that don't yet know you.)
const LISTENERS = new Set(["skeleton", "bone-knight"]);
const WAKE_ENTER = 0.3;  // sometimes it catches the sound of you coming in
const WAKE_EXIT = 0.65;  // your move for the door is the loudest thing you do
const WAKE_NOISE = 0.8;  // a fight in the room is almost unmissable
const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
// SCAVENGERS roam the dungeon eating its dead (blood/remains litter), healing
// and — past BOLD — losing their nerve entirely: they stop fleeing and hit harder.
const SCAVENGERS = new Set(["grave-hyena", "dire-hyena"]);
// The mean subtype GUARDS its meal: walk into a room where it's on a corpse
// (or where it's already gorged bold) and it turns on you unprovoked. It also
// hits harder and holds a grudge longer — a far worse thing to disturb.
const AGGRO_SCAVENGERS = new Set(["dire-hyena"]);
const CORPSE_TRACES = new Set(["blood", "remains"]);
const SCAVENGER_HEAL = 6; // hp restored per corpse fed on
const SCAVENGER_BOLD_AT = 3; // corpses eaten before it turns bold
const BOLD_DMG_MULT = 1.35; // a gorged scavenger swings harder

// ---- the deep-dwellers (built SOFT; every trick has an answer) ----
// DROWNERS grapple: a landed blow can SEIZE you — held fast (can't flee) and hit
// harder — until you wrench free or put the thing down. They never chase or flee;
// they hold their patch of water. Wade in on your own terms, or not at all.
const DROWNERS = new Set(["the-drowned", "drowned-hulk", "drowned-god"]);
const SEIZE_ODDS = 0.2;        // soft: a blow only sometimes takes hold
const SEIZE_BREAK_ODDS = 0.5;  // soft: about half the time you wrench loose each beat
const SEIZE_DMG_MULT = 1.25;   // it hits a little harder while it has you
// LURKERS wait UNSEEN — not in the room description at all — until they drop on
// you. Blind, they wake to noise and to the careless walking in (they ride the
// same wake odds as LISTENERS, WAKE_ENTER/WAKE_NOISE); stay quiet and still and
// one may let you pass. Once it strikes it reveals itself, and it's just a fight.
const LURKERS = new Set(["pale-crawler", "pale-stalker"]);
// REVENANTS don't stay down: put one to 0 and it RISES ONCE, at part health, and
// comes again. The second death is the real one. A longer fight, not a lost one.
const REVENANTS = new Set(["twice-dead", "thrice-dead", "marrow-king"]);
const REVIVE_FRAC = 0.4;       // soft: it comes back weakened
// How many times a revenant gets back up before the fall is real. Default 1
// (twice-dead, marrow-king); the cairn-wight rises twice.
const RISE_LIMIT: Record<string, number> = { "thrice-dead": 2 };
// How the hollow come apart when they run. The living just bleed.
const HURT_STYLE: Record<string, { out: string; in_: string }> = {
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
const PLAYER_HIT: Record<"edge" | "blunt" | "spear" | "fist" | "plain", string[]> = {
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
// Kept small and sharp — one of these caps a critical hit, player or creature.
const CRIT_FLOURISH = [
  " — a savage blow!", " — and it tells!", " — clean through!", " — a brutal stroke!",
  " — everything behind it!", " — and something gives!",
];
// How each kind of thing lands a blow ON you. Keyed by behaviour family, so a
// new creature inherits its kin's register the moment it joins a Set.
const CREATURE_HIT = {
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
const BITERS = new Set([
  "rat", "fleet-rat", "brood-rat", "grave-hyena", "dire-hyena", "pale-crawler", "pale-stalker",
]);

// ---- the dungeon breathing: ambient atmosphere ----
// A quiet, rate-limited flavour line surfaces to an idle wanderer now and then,
// drawn from where they stand: the flooded deep sounds nothing like the gates.
// Add freely — this is meant to grow. Signature rooms override the region pool.
const DEEP_ROOMS = new Set([
  "the-descent", "drowned-nave", "black-canal", "the-weir", "pocket-of-air",
  "sunken-gallery", "root-vault", "deep-ossuary", "weeping-cells", "silted-stair",
  "bone-processional", "black-threshold", "sunken-throne", "kings-hoard",
]);
const AMBIENCE: Record<"gate" | "deep" | "upper", string[]> = {
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
const ROOM_AMBIENCE: Record<string, string[]> = {
  smokehouse: ["The old smoke-racks tick overhead, hung with nothing now.", "A ghost of cured smoke still hangs in the cold air."],
  larder: ["The stores keep their long cold silence around you."],
  oubliette: ["A breath of colder air rises from the pit, and something in it that is not air."],
  shrine: ["The altar waits, patient as only dead stone can be."],
  "pocket-of-air": ["The air here is thin and breathable and does not smell of the water. You breathe while you can."],
  "sunken-throne": ["The flooded dark hums, low, as if the throne remembers being sat.", "The water around the throne is very, very still."],
  "kings-hoard": ["Gold gleams once in the dark, and is swallowed again."],
};
const AMBIENT_COOLDOWN_MS = 45_000; // at most one breath of atmosphere this often, per wanderer
const AMBIENT_ODDS = 0.16;          // ~per 2s tick, once off cooldown
const RECONNECT_GRACE_MS = 5 * 60_000; // a re-weave within this of dropping is a reconnect, not a fresh arrival

interface Session {
  ws: WebSocket;
  pubkey: string;
  name: string;
  named: boolean; // chose their name (or client adopted their profile name)
  roomId: string;
  hp: number;
  maxHp: number;
  target: string | null; // creature id — the foe you initiated on
  stance: Stance; // how you fight: reckless / steady / guarded (persisted to D1)
  items: CarriedItem[]; // pack cache; D1 is truth. serial != null = gate-sealed
  staggered: boolean; // fumbled an opening; the next hit that lands costs more
  resting: boolean;
  away: boolean; // out of the world, untouchable (bench modal, or the keeper's hatch)
  trading?: boolean; // which away it is: true = the keeper's hatch (trade modal)
  ctxCombat: boolean; // the combat state the last chip set was drawn for (see syncCombatCtx)
  seizedBy?: string; // DROWNER creature id that has hold of you — can't flee till you break free
  buying?: { itemId: string; cost: number; paid: number; escrow: { row: string; from: string }[] }; // open trade at the keeper's hatch; escrow = rows laid on the counter and where they live ('' pack | lockbox | vault) — nothing moves until he's square
  born: number; // created_at, unix seconds — wanderer age on the sheet
  kills: number; // tallies cached from D1; recordKill/recordDeath keep the truth
  deaths: number;
  bossKills: number;
  pvpKills: number;
  tokens: number;
  tokensAt: number; // ms of last refill
  nextThrowAt: number; // ms — one throw per round; the arm needs its follow-through
  visited: Set<string>; // rooms seen THIS session — a room you know shows brief, not the full prose again
  lastAmbientAt: number; // ms of the last atmosphere line (rate-limits the dungeon's breathing)
  lastFishAt?: number; // ms of the last fishing cast (a short patience between casts)
}

// A creature is an animal, not a spawner: it has a body, an appetite,
// A grudge: whose blood it remembers, and when — so time can wear it away.
interface Grudge {
  pk: string; // pubkey it holds the grudge against
  at: number; // ms epoch it was last provoked (renewed each fresh offense)
}

// and a memory. When it dies it is gone; migration refills the world.
interface Creature {
  id: string; // instance id (seed spawn id, or uuid for migrants)
  templateId: string;
  roomId: string;
  hp: number;
  hunger: number; // 0..100; above HUNGRY_AT it starts hunting for food
  grudges: Grudge[]; // who hurt it, and when — memory that fades with time
  nextWanderAt: number; // ms epoch
  target: string | null; // pubkey it is fighting
  curious?: string | null; // roomId it heard something from — going to look
  patrolIdx?: number; // position along a patrol route, if it keeps one
  phase?: number; // boss rage tier (0/1/2), climbs at hp thresholds
  stole?: string; // cutpurse: the item id it grabbed and ran with (dropped on death)
  carries?: string[]; // gear it visibly bears (worn/wielded at spawn, or scavenged) — spills on death
  fed?: number; // grave-hyena: corpses eaten; enough and it turns bold
  nextBirthAt?: number; // brood-rat: ms epoch of its next birth
  stunned?: boolean; // a blunt blow rang it — skips its next action, then clears
  bleedTicks?: number; // ticks of open wound left (armor-ignoring); refreshed by fast hits
  bleedDmg?: number; // damage the current wound bleeds each tick
  hidden?: boolean; // LURKER: unseen in the room until it strikes
  rises?: number; // REVENANT: times it has already got back up (see RISE_LIMIT)
  home?: string; // its den: territory anchors here (backfilled for old saves)
}

interface Regrow {
  itemId: string;
  roomId: string;
  at: number;
}

// What a room remembers. `label` names the fallen (blood), `words` are a
// carving's text plus its author.
interface Trace {
  kind: "blood" | "remains" | "scraps" | "rest" | "passage" | "carve";
  at: number;
  label?: string;
  words?: string;
}

interface RotEntry {
  itemId: string;
  roomId: string;
  at: number; // when it goes foul
}

// A carryable on the floor that can't be reduced to a bare template id — it
// holds instance state that must survive the drop. Today: journals (journalId).
interface GroundInstance {
  itemId: string;
  journalId: string;
}

// Everything the world needs to keep existing while nobody watches.
interface SimState {
  savedAt: number;
  creatures: Creature[];
  ground: Record<string, string[]>;
  groundInstances?: Record<string, GroundInstance[]>; // instanced items on the floor (journals: they carry their pages)
  regrow: Regrow[];
  arrivals: Record<string, number>; // templateId -> ms when a migrant arrives
  openDoors: string[]; // "roomId:dir" unlocked for everyone, until the boss returns
  traces: Record<string, Trace[]>;
  rot: RotEntry[];
  placedSpawns?: string[]; // "itemId@roomId" ground spawns already laid down once
  cacheSpent?: Record<string, number>; // cacheId -> ms epoch it re-locks/refills
}

export class ZoneDO implements DurableObject {
  private world: World | null = null;
  private sessions = new Map<string, Session>(); // pubkey -> session
  private leftAt = new Map<string, number>(); // pubkey -> ms it last disconnected (a quick return is a reconnect, not an arrival)
  private creatures = new Map<string, Creature>();
  private ground = new Map<string, string[]>(); // roomId -> item template ids
  // Items on the floor that carry per-instance state a bare template id can't:
  // a dropped journal keeps the id its pages are keyed to, so whoever picks it
  // up inherits the logs. Everything else stays in the plain `ground` above.
  private groundInstances = new Map<string, GroundInstance[]>();
  private regrow: Regrow[] = [];
  private lastCombatRound = 0; // ms of the last tick blows actually landed (see COMBAT_ROUND_MS)
  private blowsThisTick = new Map<string, number>(); // pubkey -> blows landed on them this tick (DOGPILE_CAP), across swings AND entry first-strikes
  private arrivals = new Map<string, number>();
  private openDoors = new Set<string>();
  private traces = new Map<string, Trace[]>();
  private rot: RotEntry[] = [];
  private placedSpawns = new Set<string>(); // ground spawns already laid once
  private cacheSpent = new Map<string, number>(); // cacheId -> ms it re-locks/refills
  private savedAt = 0;

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}

  // Four gates ring the Door; you wake at a random one, so no death sends you
  // back to a route you already know cold. Falls back to the canonical gate.
  private randomGate(): string {
    const world = this.world;
    if (!world) return "gate";
    const gates = Array.from(world.entryRooms);
    return gates[randInt(0, gates.length - 1)] ?? world.entryRoom;
  }

  // All-pairs room distances (BFS over exits, ~49 rooms — trivial), and the
  // variant→base bloodline map. Both built once at init; territory, the dark
  // mouths, and family-cap counting all lean on them.
  private roomDists = new Map<string, Map<string, number>>();
  private variantBase = new Map<string, string>();

  private buildWorldMaps(world: World): void {
    for (const src of world.rooms.keys()) {
      const dist = new Map<string, number>([[src, 0]]);
      const queue = [src];
      while (queue.length) {
        const at = queue.shift()!;
        const d = dist.get(at)!;
        for (const e of world.exits.get(at) ?? []) {
          if (dist.has(e.to_room)) continue;
          dist.set(e.to_room, d + 1);
          queue.push(e.to_room);
        }
      }
      this.roomDists.set(src, dist);
    }
    for (const v of world.mobVariants) this.variantBase.set(v.variantId, v.baseId);
  }

  private roomDist(a: string, b: string): number {
    return this.roomDists.get(a)?.get(b) ?? Number.POSITIVE_INFINITY;
  }

  // Roll a spawn's bloodline: usually the ordinary version, rarely the mean
  // cousin. Shared by first-light seeding and migration refills.
  private rollBloodline(tmpl: MobTemplate): MobTemplate {
    const world = this.world!;
    for (const v of world.mobVariants) {
      if (v.baseId !== tmpl.id || !chance(v.chance)) continue;
      const vt = world.mobTemplates.get(v.variantId);
      if (vt) return vt;
    }
    return tmpl;
  }

  // Never carry more of a bloodline than its dens allow. A deploy that retires
  // spawn rows (as the variant dens were) leaves their creatures alive in the
  // saved state — and a brood-mother that lost her nest keeps birthing into it.
  // This trims each overstocked bloodline back to its base cap on load, shedding
  // the STRAYS first: whatever stands off any den, farthest out (an evicted
  // fixture, a nest pup), and a variant before the plain stock. Den-standing
  // population is untouched, so a healthy world no-ops. Returns the cull count.
  private reconcilePopulation(world: World): number {
    const caps = new Map<string, number>();
    const dens = new Map<string, string[]>(); // bloodline base -> its den rooms
    for (const s of world.mobSpawns) {
      caps.set(s.template_id, (caps.get(s.template_id) ?? 0) + 1);
      const list = dens.get(s.template_id) ?? [];
      list.push(s.room_id);
      dens.set(s.template_id, list);
    }
    const byLine = new Map<string, Creature[]>();
    for (const c of this.creatures.values()) {
      const line = this.variantBase.get(c.templateId) ?? c.templateId;
      const list = byLine.get(line) ?? [];
      list.push(c);
      byLine.set(line, list);
    }
    let culled = 0;
    for (const [line, list] of byLine) {
      const cap = caps.get(line) ?? 0;
      if (list.length <= cap) continue;
      const homes = dens.get(line) ?? [];
      const distToDen = (c: Creature) => homes.length
        ? Math.min(...homes.map((h) => this.roomDist(c.roomId, h)))
        : Number.POSITIVE_INFINITY;
      // Most-removable first: farthest from a den, then variants before base.
      const doomed = [...list].sort((a, b) => {
        const da = distToDen(a), db = distToDen(b);
        if (da !== db) return db - da;
        const va = this.variantBase.has(a.templateId) ? 0 : 1;
        const vb = this.variantBase.has(b.templateId) ? 0 : 1;
        return va - vb;
      }).slice(0, list.length - cap);
      for (const c of doomed) { this.creatures.delete(c.id); culled++; }
    }
    return culled;
  }

  private async init(zone: string): Promise<World> {
    if (this.world) return this.world;
    const world = await loadWorld(this.env.DB, zone);
    this.world = world;
    this.buildWorldMaps(world);

    const saved = await this.state.storage.get<SimState>("sim");
    if (saved) {
      // Coerce grudges from the old string[] shape (pubkey only) to the
      // timestamped form, starting the forget-clock now for any legacy memory.
      const loadNow = Date.now();
      this.creatures = new Map(saved.creatures.map((c) => [c.id, {
        ...c,
        target: null,
        grudges: ((c as any).grudges ?? []).map((g: any) =>
          typeof g === "string" ? { pk: g, at: loadNow } : g),
      }]));
      this.ground = new Map(Object.entries(saved.ground));
      this.groundInstances = new Map(Object.entries(saved.groundInstances ?? {}));
      this.regrow = saved.regrow;
      this.arrivals = new Map(Object.entries(saved.arrivals));
      this.openDoors = new Set(saved.openDoors);
      this.traces = new Map(Object.entries(saved.traces ?? {}));
      this.rot = saved.rot ?? [];
      this.placedSpawns = new Set(saved.placedSpawns ?? []);
      this.cacheSpent = new Map(Object.entries(saved.cacheSpent ?? {}));
      this.savedAt = saved.savedAt;
      // Territory backfill: pre-territory saves carry no den. Tie each creature
      // to its bloodline's NEAREST den — which repatriates any deep-dweller
      // that drifted upstairs (it now walks home). Den-less stock (an evicted
      // variant, a nest pup) homes where it stands and lives out its days there.
      for (const c of this.creatures.values()) {
        if (c.home) continue;
        const line = this.variantBase.get(c.templateId) ?? c.templateId;
        let best: string | undefined;
        let bestD = Number.POSITIVE_INFINITY;
        for (const s of world.mobSpawns) {
          if (s.template_id !== c.templateId && s.template_id !== line) continue;
          const d = this.roomDist(c.roomId, s.room_id);
          if (d < bestD) { bestD = d; best = s.room_id; }
        }
        c.home = best ?? c.roomId;
        // Coerce the old one-rise boolean into the new rise counter.
        if ((c as any).risen && c.rises == null) { c.rises = 1; delete (c as any).risen; }
      }
      // Trim any bloodline the saved state overstocks (retired dens' creatures,
      // brood pups from an evicted nest) back to what the spawn table allows.
      const culled = this.reconcilePopulation(world);
      // Content added since this world's first light (e.g. new gear in a
      // migration) gets laid down once: any ground spawn we've never placed and
      // that isn't already on its floor. Keeps a live world from needing a reset.
      let addedSpawn = culled > 0;
      for (const g of world.groundSpawns) {
        const key = `${g.item_id}@${g.room_id}`;
        if (this.placedSpawns.has(key)) continue;
        const floor = this.ground.get(g.room_id) ?? [];
        if (!floor.includes(g.item_id)) {
          this.ground.set(g.room_id, [...floor, g.item_id]);
          if (world.itemTemplates.get(g.item_id)?.edible) {
            this.rot.push({ itemId: g.item_id, roomId: g.room_id, at: Date.now() + ROT_MS });
          }
        }
        this.placedSpawns.add(key);
        addedSpawn = true;
      }
      if (addedSpawn) await this.persist();
    } else {
      // First light: seed the world from D1 templates.
      const now = Date.now();
      this.creatures.clear();
      for (const spawn of world.mobSpawns) {
        const base = world.mobTemplates.get(spawn.template_id);
        if (!base) continue;
        // Even at first light, rare blood: a den is usually the ordinary
        // version, once in a while the mean cousin.
        const tmpl = this.rollBloodline(base);
        this.creatures.set(spawn.id, {
          id: spawn.id,
          templateId: tmpl.id,
          roomId: spawn.room_id,
          hp: tmpl.max_hp,
          hunger: randInt(0, HUNGRY_AT - 10),
          grudges: [],
          nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
          target: null,
          carries: this.rollCarry(tmpl),
          hidden: LURKERS.has(tmpl.id) || undefined,
          home: spawn.room_id,
        });
      }
      this.ground.clear();
      for (const g of world.groundSpawns) {
        this.ground.set(g.room_id, [...(this.ground.get(g.room_id) ?? []), g.item_id]);
        this.placedSpawns.add(`${g.item_id}@${g.room_id}`);
        // The larder starts its clock at first light.
        if (world.itemTemplates.get(g.item_id)?.edible) {
          this.rot.push({ itemId: g.item_id, roomId: g.room_id, at: now + ROT_MS });
        }
      }
      this.savedAt = now;
      await this.persist();
    }
    return world;
  }

  // While nobody watched, time still passed: fast-forward the world from
  // savedAt to now in coarse steps. No players were here, so no combat —
  // creatures healed, got hungry, wandered, ate what was lying around,
  // and the dungeon slowly refilled.
  private catchUp(): void {
    const world = this.world;
    if (!world) return;
    const now = Date.now();
    let t = Math.max(this.savedAt, now - CATCHUP_CAP_MS);

    while (t < now) {
      const step = Math.min(SIM_STEP_MS, now - t);
      t += step;
      const mins = step / 60_000;

      for (const c of this.creatures.values()) {
        const tmpl = world.mobTemplates.get(c.templateId)!;
        c.target = null;
        c.hp = Math.min(tmpl.max_hp, c.hp + CREATURE_HEAL_PER_MIN * mins);
        if (!HOLLOW.has(c.templateId)) {
          c.hunger = Math.min(HUNGER_MAX, c.hunger + HUNGER_PER_MIN * mins);
          if (c.hunger >= HUNGRY_AT) this.creatureEatsHere(c, true, t);
        }
        if (c.nextWanderAt <= t && !tmpl.is_boss && c.hp >= tmpl.max_hp * FLEE_BELOW) {
          // Silent catch-up runs with no one connected, so no ambush fires here.
          void this.creatureMoves(c, t, "wander", true);
        }
      }
      this.applyRot(t, true);
      this.applyRegrow(t, true);
      this.applyArrivals(t, true);
      this.scheduleArrivals(t);
    }
    this.pruneTraces(now);
    this.savedAt = now;
  }

  private async persist(): Promise<void> {
    this.savedAt = Date.now();
    const state: SimState = {
      savedAt: this.savedAt,
      creatures: [...this.creatures.values()],
      ground: Object.fromEntries(this.ground),
      groundInstances: Object.fromEntries(this.groundInstances),
      regrow: this.regrow,
      arrivals: Object.fromEntries(this.arrivals),
      openDoors: [...this.openDoors],
      traces: Object.fromEntries(this.traces),
      rot: this.rot,
      placedSpawns: [...this.placedSpawns],
      cacheSpent: Object.fromEntries(this.cacheSpent),
    };
    await this.state.storage.put("sim", state);
  }

  // ---- transport: the direct door ----

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pubkey = req.headers.get("x-pubkey");
    if (!pubkey) return new Response("unauthorized", { status: 401 });
    const zone = req.headers.get("x-zone") ?? "door";

    const world = await this.init(zone);
    // The first observer in a while collapses the elapsed time.
    if (this.sessions.size === 0) this.catchUp();

    const { row, created } = await getOrCreatePlayer(this.env.DB, pubkey, this.randomGate());
    const items = await loadInventory(this.env.DB, pubkey);

    // One body per soul: a second connection displaces the first.
    const old = this.sessions.get(pubkey);
    if (old) {
      this.send(old, "Your spirit is called elsewhere. (connected from another client)");
      try { old.ws.close(1000, "reconnected"); } catch {}
      this.sessions.delete(pubkey);
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.accept();

    const roomId = world.rooms.has(row.room_id) ? row.room_id : this.randomGate();
    const session: Session = {
      ws: server,
      pubkey,
      name: row.name,
      named: row.named === 1,
      roomId,
      hp: Math.max(1, row.hp),
      maxHp: row.max_hp,
      target: null,
      stance: (["reckless", "steady", "guarded"].includes(row.stance) ? row.stance : "steady") as Stance,
      items,
      staggered: false,
      resting: false,
      away: false,
      ctxCombat: false,
      born: row.created_at,
      kills: row.kills ?? 0,
      deaths: row.deaths ?? 0,
      bossKills: row.boss_kills ?? 0,
      pvpKills: row.pvp_kills ?? 0,
      tokens: RATE_CAPACITY,
      tokensAt: Date.now(),
      nextThrowAt: 0,
      visited: new Set<string>(),
      lastAmbientAt: Date.now(),
    };
    this.sessions.set(pubkey, session);

    server.addEventListener("message", (ev) => {
      this.onMessage(session, typeof ev.data === "string" ? ev.data : "").catch(() => {});
    });
    const bye = () => { this.onLeave(session).catch(() => {}); };
    server.addEventListener("close", bye);
    server.addEventListener("error", bye);

    // A dropped connection that comes back within the grace window is a
    // re-weave, not an arrival: no fanfare, no re-reading the intro, and the
    // room comes back brief. A genuine return (or a first arrival) gets the
    // full welcome and the full room.
    const left = this.leftAt.get(pubkey);
    const reconnecting = !created && left !== undefined && Date.now() - left < RECONNECT_GRACE_MS;
    this.leftAt.delete(pubkey);

    if (reconnecting) {
      this.send(session, "— you take up the thread of the Door again —");
    } else {
      this.send(session, `NOMAD — the Door. You are ${session.name}.`);
      if (created) {
        this.send(
          session,
          [
            "You wake at a broken gate with keys in your pocket and no memory of the road.",
            "This dungeon is shared and it is alive: the other names are real people,",
            "and the creatures keep living whether or not anyone is watching.",
            "Wounds do not close on their own — rest, or eat.",
            "The suggestions under the input line are real commands — tap one, or type it.",
            `Pick what the dungeon calls you with: name <yourname>`,
            "And mind your keys ('keys' shows them): save the secret somewhere safe —",
            "it is the only way back to this wanderer from another door or device.",
          ].join("\n"),
        );
      } else {
        this.send(session, "Type 'help' if you're lost.");
      }
      this.roomFeed(session.roomId, `${session.name} blinks into being.`, pubkey);
    }
    // Either way, mark the wake room known and show it: full on a real arrival,
    // brief on a re-weave (you never left). Status goes first so the client
    // knows the room's name in time to paint it gold.
    session.visited.add(session.roomId);
    this.sendStatus(session);
    this.send(session, this.describeRoom(session, !reconnecting));
    this.sendCtx(session);
    await this.provokeGrudges(session, false); // reconnect grace: no free first strike
    await this.persist();
    await this.ensureAlarm();

    return new Response(null, { status: 101, webSocket: client });
  }

  private async onLeave(session: Session): Promise<void> {
    if (this.sessions.get(session.pubkey) !== session) return; // displaced, already handled
    this.sessions.delete(session.pubkey);
    this.leftAt.set(session.pubkey, Date.now()); // so a quick return reads as a reconnect
    for (const c of this.creatures.values()) {
      if (c.target === session.pubkey) c.target = null;
    }
    this.roomFeed(session.roomId, `${session.name} fades from the world.`);
    await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
    // Flush the worn-down condition of any provisional gear (rust ticks live in
    // memory; D1 catches up here). Sealed gear is frozen, no need.
    for (const c of session.items) {
      if (c.serial === null && this.isGear(c.itemId)) {
        await setItemCondition(this.env.DB, c.rowId, c.condition);
      }
    }
    await this.persist();
  }

  // ---- messages in ----

  private async onMessage(session: Session, raw: string): Promise<void> {
    let frame: any;
    try {
      frame = JSON.parse(raw);
    } catch {
      return;
    }
    const isBench = frame?.t === "bench";
    const isTrade = frame?.t === "trade";
    if (!isBench && !isTrade && (frame?.t !== "cmd" || typeof frame.text !== "string")) return;

    // Token bucket per pubkey — castr's daily-cast pattern, compressed.
    const now = Date.now();
    session.tokens = Math.min(
      RATE_CAPACITY,
      session.tokens + ((now - session.tokensAt) / 1000) * RATE_REFILL_PER_SEC,
    );
    session.tokensAt = now;
    if (session.tokens < 1) {
      if (!isBench && !isTrade) this.send(session, "You're moving faster than the dungeon can watch. Slow down.");
      return;
    }
    session.tokens -= 1;

    // The gatehouse bench (storage modal) and the keeper's hatch (trade
    // modal): each its own little protocol.
    if (isBench) return this.handleBench(session, frame);
    if (isTrade) return this.handleTrade(session, frame);

    // Stepped out of the world? The typed world is on hold.
    if (session.away) {
      return this.send(session, session.trading
        ? "You're at the keeper's hatch. Close the trade to step back into the world."
        : this.world!.entryRooms.has(session.roomId)
          ? "You're sorting your kit at the gatehouse. Close the bench to step back into the world."
          : "You're crouched over your lockbox. Close it to get your head up and act.");
    }

    const text: string = frame.text;
    const cmd = parse(text);
    if (!cmd) return;
    if ("miss" in cmd) {
      this.send(
        session,
        cmd.suggestion
          ? `The dungeon doesn't understand. Did you mean '${cmd.suggestion}'? ('help' lists everything.)`
          : `The dungeon doesn't understand that. Type 'help' for what it does.`,
      );
      return;
    }
    // Effort ends rest; watching and talking do not.
    if (session.resting && (cmd.verb === "go" || cmd.verb === "attack" || cmd.verb === "throw" || cmd.verb === "get" || cmd.verb === "drop")) {
      session.resting = false;
      this.send(session, "You rise.");
    }
    await this.dispatch(session, cmd);
    this.syncCombatCtx();
  }

  // Ceremony needs calm. While something wants your blood, the careful acts —
  // chiseling stone, the gate's sealing rite, the lockbox, speaking to the
  // relays, choosing a name — are beyond you. (Also the future anti-PvP-cheat:
  // you can't insta-seal your pack the moment someone jumps you.)
  private static readonly NEEDS_CALM = new Set<Command["verb"]>([
    "carve", "claim", "stash", "unstash", "vault", "unvault", "publish", "name", "unlock",
  ]);

  private async dispatch(session: Session, cmd: Command): Promise<void> {
    if (ZoneDO.NEEDS_CALM.has(cmd.verb) && this.inCombat(session)) {
      return this.send(session, "Not while something is trying to kill you.");
    }
    switch (cmd.verb) {
      case "help": return this.send(session, HELP_TEXT);
      case "look": return this.cmdLook(session, cmd.arg);
      case "go": return this.cmdGo(session, cmd.arg);
      case "say": return this.cmdSay(session, cmd.arg);
      case "attack": return this.cmdAttack(session, cmd.arg);
      case "throw": return this.cmdThrow(session, cmd.arg);
      case "stance": return this.cmdStance(session, cmd.arg);
      case "get": return this.cmdGet(session, cmd.arg);
      case "drop": return this.cmdDrop(session, cmd.arg);
      case "equip": return this.cmdEquip(session, cmd.arg);
      case "remove": return this.cmdRemove(session, cmd.arg);
      case "unlock": return this.cmdUnlock(session, cmd.arg);
      case "salvage": return this.cmdSalvage(session, cmd.arg);
      case "forge": return this.cmdForge(session, cmd.arg);
      case "repair": return this.cmdRepair(session, cmd.arg);
      case "barter": return this.cmdBarter(session);
      case "buy": return this.cmdBuy(session, cmd.arg);
      case "offer": return this.cmdOffer(session, cmd.arg);
      case "inventory": return this.cmdInventory(session);
      case "who": return this.cmdWho(session);
      case "name": return this.cmdName(session, cmd.arg);
      case "rest": return this.cmdRest(session);
      case "eat": return this.cmdEat(session, cmd.arg);
      case "carve": return this.cmdCarve(session, cmd.arg);
      case "claim": return this.cmdClaim(session, cmd.arg);
      case "stash": return this.cmdStore(session, cmd.arg, "lockbox");
      case "unstash": return this.cmdRetrieve(session, cmd.arg, "lockbox");
      case "vault": return this.cmdStore(session, cmd.arg, "vault");
      case "unvault": return this.cmdRetrieve(session, cmd.arg, "vault");
      case "publish": return this.cmdPublish(session, cmd.arg);
      case "map": return this.cmdMap(session, cmd.arg);
      case "study": return this.cmdStudy(session, cmd.arg);
      case "journal": return this.cmdJournal(session);
      case "fish": return this.cmdFish(session);
      case "smoke": return this.cmdSmoke(session);
      case "squink": return this.cmdSquink(session);
      case "xyzzy": return this.cmdXyzzy(session);
    }
  }

  // The old word. Nothing happens — but the dungeon heard you ask.
  private cmdXyzzy(session: Session): void {
    this.send(session, "You mouth the old word into the dark. Nothing happens. Something, somewhere, declines to be impressed.");
  }

  // Light one from the tin. No stat, no cure — a moment's calm that costs you:
  // the smell rides the draft into the next room, and the dark leans in to look.
  // (What the tin is really worth is never said here. That's for the finding.)
  private cmdSmoke(session: Session): void {
    if (!session.items.some((c) => c.itemId === "dry-cigarettes")) {
      return this.send(session, "You pat yourself down for a smoke and come up with nothing but lint.");
    }
    this.send(session, "You knock one loose from the tin and light it. The first drag steadies your hands; for a breath, the dungeon is just a room you happen to be in.", "gain");
    this.roomFeed(session.roomId, `${session.name} lights a cigarette; the ember flares, then settles to a slow red eye.`, session.pubkey);
    this.roomSound(session.roomId, "A thread of tobacco smoke drifts in {dir}.");
    this.creatureNoise(session.roomId); // a lit ember and a smell — the dark notices
  }

  // Nobody knows what this does. That includes the dungeon.
  private cmdSquink(session: Session): void {
    this.send(session, "You squink. Somewhere below, something squinks back.");
    this.roomFeed(session.roomId, `${session.name} squinks. It echoes longer than it should.`, session.pubkey);
    this.roomSound(session.roomId, "Something squinks, {dir}.");
    this.creatureNoise(session.roomId); // squinking is not free
  }

  // ---- verbs ----

  private cmdLook(session: Session, arg: string): void {
    // A deliberate look always gives the full scene — and marks the room known,
    // so from here you get the brief view unless you ask again.
    if (!arg) { session.visited.add(session.roomId); return this.send(session, this.describeRoom(session, true)); }
    const world = this.world!;

    const creature = this.findCreatureIn(session.roomId, arg);
    if (creature) {
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      const hungry = creature.hunger >= HUNGRY_AT && !HOLLOW.has(tmpl.id) ? " It looks hungry." : "";
      return this.send(session, `${tmpl.description} (${this.condition(creature)})${hungry}`);
    }
    const groundItem = this.findItemIn(this.ground.get(session.roomId) ?? [], arg);
    if (groundItem) return this.send(session, world.itemTemplates.get(groundItem)!.description);
    const carried = this.findCarried(session, arg);
    if (carried) {
      const t = world.itemTemplates.get(carried.itemId)!;
      return this.send(
        session,
        t.description + (carried.serial !== null ? ` The dungeon's seal is on it. (mint #${carried.serial})` : ""),
      );
    }
    const other = this.findPlayerIn(session.roomId, arg);
    if (other) return this.send(session, `${other.name}, a fellow wanderer. Keys in pocket, nowhere to be.`);
    this.send(session, "You see nothing like that here.");
  }

  private async cmdGo(session: Session, dir: string): Promise<void> {
    if (!dir) return this.send(session, "Go where? (north, south, east, west, up, down)");
    const world = this.world!;
    const exit = (world.exits.get(session.roomId) ?? []).find((e) => e.dir === dir);
    if (!exit) return this.send(session, "There is no way " + dir + " from here.");

    // Held by a drowned thing: you can't just walk off. Trying is a struggle —
    // sometimes you tear loose and go, sometimes it drags you back.
    if (session.seizedBy) {
      const grip = this.creatures.get(session.seizedBy);
      if (!grip || grip.roomId !== session.roomId) {
        session.seizedBy = undefined;
      } else if (chance(SEIZE_BREAK_ODDS)) {
        session.seizedBy = undefined;
        this.send(session, "You wrench free of its grip.");
      } else {
        return this.send(session, `${cap(world.mobTemplates.get(grip.templateId)!.name)} drags you back — you can't break away yet.`);
      }
    }

    const doorKey = `${session.roomId}:${dir}`;
    if (exit.key_item && !this.openDoors.has(doorKey)) {
      if (!session.items.some((c) => c.itemId === exit.key_item)) {
        const key = world.itemTemplates.get(exit.key_item);
        return this.send(
          session,
          `A black iron door bars the way ${dir}. It wants ${key ? key.name : "a key"} you do not carry.`,
        );
      }
      // Once opened, open for everyone — until what lives beyond it returns.
      this.openDoors.add(doorKey);
      this.send(session, "The key turns of its own accord. The black door grinds open — and stays open.");
      this.roomFeed(session.roomId, "The black iron door grinds open.", session.pubkey);
      this.roomSound(session.roomId, "Iron grinds against stone, {dir}.");
      this.creatureNoise(session.roomId);
    }

    const wasFighting = this.inCombat(session);
    // Heavy mail turns blows, but it drags at the escape: leaving a fight in
    // weighted armor risks one parting strike on the way out. The quick flee
    // clean. (Armor still soaks it — that's what it's for.)
    if (wasFighting && this.wornWeight(session) > 0 && chance(PARTING_BLOW_CHANCE)) {
      const striker = [...this.creatures.values()].find(
        (c) => c.roomId === session.roomId && (c.target === session.pubkey || c.id === session.target),
      );
      if (striker) {
        const stmpl = world.mobTemplates.get(striker.templateId)!;
        let pdmg = randInt(stmpl.dmg_min, stmpl.dmg_max);
        pdmg = Math.max(1, pdmg - this.equippedArmor(session));
        pdmg = Math.max(1, Math.round(pdmg * STANCE[session.stance].def));
        session.hp -= pdmg;
        this.send(session, `The mail drags at you — ${stmpl.name} lands a parting blow for ${pdmg}. [${Math.max(0, session.hp)}/${session.maxHp} hp]`);
        if (session.hp <= 0) {
          await this.onPlayerDeath(session, stmpl);
          return;
        }
      }
    }
    // Before you slip out, a dormant listener may hear you move for the door
    // and swing as you go — you still leave (if you live), but not always clean.
    if (await this.wakeListeners(session, session.roomId, WAKE_EXIT, "hears you move — and swings as you slip past!")) {
      if (session.hp <= 0) return; // felled on the way out
    }
    session.target = null;
    session.staggered = false; // the opening closes behind you
    session.buying = undefined; // walk off mid-trade and the keeper sweeps it back
    for (const c of this.creatures.values()) {
      if (c.target === session.pubkey && c.roomId === session.roomId) c.target = null;
    }

    const from = session.roomId;
    session.roomId = exit.to_room;
    this.addTrace(session.roomId, { kind: "passage", at: Date.now() });
    this.roomFeed(from, `${session.name} ${wasFighting ? "flees" : "leaves"} ${dir}.`);
    this.roomFeed(session.roomId, `${session.name} arrives.`, session.pubkey);
    // Status first, so the client learns the room's name before the room text
    // prints — the name line paints gold even the very first time you see it.
    this.sendStatus(session);
    this.send(session, this.enterDescribe(session));
    this.refreshRoomCtx(from);
    this.refreshRoomCtx(session.roomId);
    await this.provokeGrudges(session, true); // you walked in — a grudge-holder gets the jump
    // …and a dormant listener might just catch the sound of your arrival.
    await this.wakeListeners(session, session.roomId, WAKE_ENTER, "twists toward the sound of you and lunges!");
    await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
    await this.persist();
  }

  private cmdSay(session: Session, msg: string): void {
    if (!msg) return this.send(session, "Say what?");
    this.send(session, `You say, "${msg}"`);
    this.roomFeed(session.roomId, `${session.name} says, "${msg}"`, session.pubkey);
  }

  private async cmdAttack(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Attack what?");
    const creature = this.findCreatureIn(session.roomId, arg);
    if (!creature) return this.send(session, "Nothing by that name is here to fight.");
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    // Initiative: strike something that hasn't marked you — no fight on, no
    // grudge held — and the first blow lands heavy, before it can answer.
    const unaware = !creature.target && !this.remembers(creature, session.pubkey, Date.now());
    session.target = creature.id;
    if (unaware) {
      const weapon = this.equippedItem(session, "weapon");
      let dmg = Math.round(
        (randInt(PLAYER_DMG_MIN, PLAYER_DMG_MAX) + (weapon ? this.effDmg(weapon) : 0)) *
          STANCE[session.stance].atk * AMBUSH_MULT,
      );
      if (session.hp < session.maxHp * WOUNDED_FRACTION) dmg = Math.round(dmg * WOUNDED_DMG_MULT);
      // No crit on top: the surprise IS the crit. (Stacked, a pebble
      // one-shots skeletons; unstacked, an ambush is strong, not a cannon.)
      dmg = Math.max(1, dmg - tmpl.armor);
      creature.hp -= dmg;
      this.addGrudge(creature, session.pubkey);
      this.roomFeed(session.roomId, `${session.name} falls on ${tmpl.name} without warning!`, session.pubkey);
      this.combatNoise(session.roomId);
      if (weapon) await this.wear(session, weapon.carried, weapon.tmpl, HOLLOW.has(tmpl.id) ? WEAPON_WEAR_HOLLOW : WEAPON_WEAR);
      if (creature.hp <= 0) {
        this.send(session, `You fall on ${tmpl.name} before it marks you — one heavy blow, for ${dmg}.`, "dmgout big");
        await this.onCreatureDeath(session, creature, tmpl);
        await this.ensureAlarm();
        return;
      }
      creature.target = session.pubkey;
      this.send(session, `You fall on ${tmpl.name} before it marks you — the first blow lands heavy for ${dmg}. (${this.condition(creature)})`, "dmgout big");
      if (tmpl.is_boss) this.bossPhase(creature, tmpl, session);
      await this.ensureAlarm();
      return;
    }
    if (!creature.target) creature.target = session.pubkey;
    this.addGrudge(creature, session.pubkey);
    this.send(session, pick([
      `You square up against ${tmpl.name}.`,
      `You set your feet and turn on ${tmpl.name}.`,
      `You close on ${tmpl.name}, blood up.`,
      `You round on ${tmpl.name} and ready yourself.`,
    ]));
    this.roomFeed(session.roomId, `${session.name} attacks ${tmpl.name}!`, session.pubkey);
    // A fight is loud: a dormant listener in the room may wake to the din.
    await this.wakeListeners(session, session.roomId, WAKE_NOISE, "clatters awake at the noise and turns on you!");
    await this.ensureAlarm();
  }

  private async cmdGet(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Get what?");
    // A journal on the floor is instanced — picking it up carries its pages
    // (and whoever's logs they were). Matched first, ahead of plain loot.
    const inst = this.takeGroundInstance(session.roomId, arg);
    if (inst) return this.getInstanced(session, inst);
    const here = this.ground.get(session.roomId) ?? [];
    const itemId = this.findItemIn(here, arg);
    if (!itemId) return this.send(session, "That isn't lying around here.");
    const tmpl = this.world!.itemTemplates.get(itemId)!;
    if (!this.packRoom(session, itemId)) {
      return this.send(session, `Your pack is full (${PACK_CAP} slots). Drop something, or bank it at a gate.`);
    }

    here.splice(here.indexOf(itemId), 1);
    const rowId = uuid();
    const carried: CarriedItem = { rowId, itemId, serial: null, equipped: false, condition: 100 };
    session.items.push(carried);
    // A regrowing spawn (the shrine's key, a gate's rock) keeps exactly ONE
    // instance in its room. Only re-seed if this pickup left the room without
    // one AND nothing's already regrowing here — otherwise throwing a rock and
    // fetching it back mid-fight would queue a fresh regrow every grab, and the
    // stones would breed. (`here` already had the taken item spliced out above.)
    if (this.world!.groundSpawns.some((g) => g.item_id === itemId && g.room_id === session.roomId && g.regrows)) {
      const stillHere = here.includes(itemId);
      const alreadyRegrowing = this.regrow.some((r) => r.itemId === itemId && r.roomId === session.roomId);
      if (!stillHere && !alreadyRegrowing) {
        this.regrow.push({ itemId, roomId: session.roomId, at: Date.now() + REGROW_MS });
      }
    }
    await insertLoot(this.env.DB, rowId, session.pubkey, itemId, null);
    // Friendly: your FIRST weapon/armor goes on automatically; switching later
    // is a deliberate `equip`. (Never overrides something you've already got on.)
    let readied = "";
    if (tmpl.slot !== "" && !this.equippedItem(session, tmpl.slot)) {
      carried.equipped = true;
      await setEquipped(this.env.DB, rowId, true);
      readied = tmpl.slot === "weapon" ? " You take it in hand." : " You pull it on.";
    }
    // Stooping under a swing is an opening — snatching your fumbled blade
    // back (or recycling a thrown rock) is possible, never free.
    let stooped = "";
    if (this.inCombat(session)) {
      session.staggered = true;
      stooped = " You stoop for it under the swing — an opening.";
    }
    this.send(session, `You take ${tmpl.name}.` + readied + stooped);
    this.roomFeed(session.roomId, `${session.name} takes ${tmpl.name}.`, session.pubkey);
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }

  private async cmdDrop(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Drop what?");
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    const itemId = carried.itemId;
    const tmpl = this.world!.itemTemplates.get(itemId)!;

    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    // Setting a sealed thing down is letting it go: the claim is released.
    if (carried.serial !== null) await voidMint(this.env.DB, carried.serial);
    // A journal keeps its pages when it hits the floor (they're keyed to the
    // book, not the row) — it lands instanced so the next hand inherits them.
    if (carried.journalId) {
      this.dropInstance(session.roomId, itemId, carried.journalId);
    } else {
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), itemId]);
      if (tmpl.edible) this.rot.push({ itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
    }
    this.send(
      session,
      carried.serial !== null
        ? `You set ${tmpl.name} down. The seal cracks as it leaves your hands — the claim is no longer yours.`
        : `You drop ${tmpl.name}.`,
    );
    this.roomFeed(session.roomId, `${session.name} drops ${tmpl.name}.`, session.pubkey);
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }

  // A thrown thing: its own bite plus the arm behind it — resolved on the spot,
  // not on the tick. Then it lies where the fight is, anyone's to take back.
  private async cmdThrow(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Throw what? (throw <item> at <creature>)");
    const world = this.world!;
    let itemArg = arg;
    let targetArg = "";
    const atIdx = arg.indexOf(" at ");
    if (atIdx >= 0) {
      itemArg = arg.slice(0, atIdx).trim();
      targetArg = arg.slice(atIdx + 4).trim();
    }
    const carried = this.findCarried(session, itemArg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    if (carried.serial !== null) {
      return this.send(session, "You will not cast away what the gate has sealed. Drop it first, if you must.");
    }
    const itmpl = world.itemTemplates.get(carried.itemId)!;
    let creature = targetArg
      ? this.findCreatureIn(session.roomId, targetArg)
      : session.target
        ? this.creatures.get(session.target) ?? null
        : null;
    if (creature && creature.roomId !== session.roomId) creature = null;
    if (!creature) return this.send(session, targetArg ? "Nothing by that name is here." : "Throw it at what?");
    const tmpl = world.mobTemplates.get(creature.templateId)!;

    // One throw per round: the arm owes its follow-through. (Without this, a
    // recycled rock out-damages a graveblade — the machine-gun, not the sling.)
    const nowMs = Date.now();
    if (nowMs < session.nextThrowAt) {
      return this.send(session, "Your arm is still following through — a beat, then throw again.");
    }
    session.nextThrowAt = nowMs + THROW_COOLDOWN_MS;

    const unaware = !creature.target && !this.remembers(creature, session.pubkey, Date.now());
    // Every attack is a gamble — thrown ones too. A wild throw still leaves
    // your hand (and still wakes what it nearly hit).
    if (chance(FUMBLE_CHANCE + (session.hp < session.maxHp * WOUNDED_FRACTION ? WOUNDED_FUMBLE_BONUS : 0))) {
      session.items.splice(session.items.indexOf(carried), 1);
      await removeItemRow(this.env.DB, carried.rowId);
      if (carried.serial !== null) await voidMint(this.env.DB, carried.serial);
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), carried.itemId]);
      if (itmpl.edible) this.rot.push({ itemId: carried.itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
      if (!creature.target) creature.target = session.pubkey;
      this.addGrudge(creature, session.pubkey);
      session.target = creature.id;
      this.send(session, `Your throw sails wide — ${itmpl.name} cracks against the stone. ${cap(tmpl.name)} turns on you.`);
      this.roomFeed(session.roomId, `${session.name} hurls ${itmpl.name} — and misses.`, session.pubkey);
      this.combatNoise(session.roomId);
      this.refreshRoomCtx(session.roomId);
      await this.persist();
      await this.ensureAlarm();
      return;
    }
    let dmg = randInt(THROW_DMG_MIN, THROW_DMG_MAX) + this.effStat(itmpl.dmg, carried.condition);
    dmg = Math.round(dmg * STANCE[session.stance].atk);
    if (session.hp < session.maxHp * WOUNDED_FRACTION) dmg = Math.round(dmg * WOUNDED_DMG_MULT);
    // Surprise IS the crit: an ambush throw never double-dips a crit roll.
    let flourish = unaware ? " — it never saw it coming!" : ".";
    if (unaware) dmg = Math.round(dmg * AMBUSH_MULT);
    else if (chance(CRIT_CHANCE)) {
      dmg *= 2;
      flourish = " — a savage throw!";
    }
    dmg = Math.max(1, dmg - tmpl.armor);

    // It leaves your hands for good. Whether it survives the landing is the
    // stone's business: impact can shatter it — near-certain against bone
    // and old iron (the hollow) — and gone is gone.
    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    const shattered = chance(HOLLOW.has(tmpl.id) ? THROW_SHATTER_HOLLOW : THROW_SHATTER);
    if (!shattered) {
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), carried.itemId]);
      if (itmpl.edible) this.rot.push({ itemId: carried.itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
    }

    creature.hp -= dmg;
    this.addGrudge(creature, session.pubkey);
    session.target = creature.id;
    this.roomFeed(session.roomId, `${session.name} hurls ${itmpl.name} at ${tmpl.name}!`, session.pubkey);
    this.combatNoise(session.roomId);
    const landing = shattered ? " It shatters on impact." : " It lands on the stones.";
    if (creature.hp > 0) {
      if (!creature.target) creature.target = session.pubkey;
      this.send(session, `You hurl ${itmpl.name} — it strikes ${tmpl.name} for ${dmg}${flourish} (${this.condition(creature)})${landing}`);
      if (tmpl.is_boss) this.bossPhase(creature, tmpl, session);
    } else {
      this.send(session, `You hurl ${itmpl.name} — it strikes ${tmpl.name} for ${dmg}${flourish}${landing}`);
      await this.onCreatureDeath(session, creature, tmpl);
    }
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }

  private async cmdStance(session: Session, arg: string): Promise<void> {
    const alias: Record<string, Stance> = {
      reckless: "reckless", aggressive: "reckless", aggro: "reckless", offensive: "reckless", berserk: "reckless", wild: "reckless",
      steady: "steady", balanced: "steady", neutral: "steady", normal: "steady", even: "steady",
      guarded: "guarded", defensive: "guarded", defend: "guarded", cautious: "guarded", turtle: "guarded", guard: "guarded",
    };
    if (!arg) {
      return this.send(session, `You fight ${session.stance}. Change it — stance reckless | steady | guarded (trade offense for defense).`);
    }
    const s = alias[arg.toLowerCase().trim()];
    if (!s) return this.send(session, "Pick a stance: reckless, steady, or guarded.");
    if (s === session.stance) return this.send(session, `You already fight ${s}.`);
    session.stance = s;
    // Persisted to the player row (keyed by pubkey), so it follows you anywhere.
    await setStance(this.env.DB, session.pubkey, s);
    this.send(session, s === "reckless"
      ? "You drop your guard and swing to wound — you hit half again as hard, and take it harder in return."
      : s === "guarded"
      ? "You close up behind your guard — far less gets through, but your blows lose their bite."
      : "You settle into an even, steady footing.");
    // The stance chips show the two you're NOT in — so the row has to redraw the
    // moment you switch, or the one you just tapped stays put and it reads as if
    // nothing took. (This was the whole "stances don't work" bug: they worked,
    // the buttons just never moved.)
    this.sendCtx(session);
  }

  private async cmdEquip(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Equip what?");
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    if (tmpl.slot === "") {
      return this.send(session, `You can't wear or wield ${tmpl.name}.`);
    }
    if (carried.equipped) {
      return this.send(session, `You already have ${tmpl.name} ${tmpl.slot === "weapon" ? "in hand" : "on"}.`);
    }
    // Combat narrows this: worn gear cannot be wrestled on or off mid-fight at
    // all — only the weapon in your hand swaps, and that leaves an opening.
    const fighting = this.inCombat(session);
    if (fighting && tmpl.slot !== "weapon") {
      return this.send(session, "You cannot change your gear while something wants your blood.");
    }
    // One item per slot — set down whatever occupies it first.
    const current = this.equippedItem(session, tmpl.slot);
    if (current) {
      current.carried.equipped = false;
      await setEquipped(this.env.DB, current.carried.rowId, false);
    }
    carried.equipped = true;
    await setEquipped(this.env.DB, carried.rowId, true);
    if (fighting) session.staggered = true;
    this.send(session, (tmpl.slot === "weapon"
      ? `You take ${tmpl.name} in hand${current ? `, setting aside ${current.tmpl.name}` : ""}.`
      : `You pull on ${tmpl.name}${current ? `, shrugging off ${current.tmpl.name}` : ""}.`)
      + (fighting ? " Your eyes leave the fight for a heartbeat — an opening." : ""));
  }

  private async cmdRemove(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Remove what?");
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    if (!carried.equipped) return this.send(session, `You aren't using ${tmpl.name}.`);
    // Same combat rules as putting things on: armor stays where it is, and
    // lowering your blade mid-fight is an opening.
    const fighting = this.inCombat(session);
    if (fighting && tmpl.slot !== "weapon") {
      return this.send(session, "You cannot change your gear while something wants your blood.");
    }
    carried.equipped = false;
    await setEquipped(this.env.DB, carried.rowId, false);
    if (fighting) session.staggered = true;
    this.send(session, (tmpl.slot === "weapon" ? `You lower ${tmpl.name}.` : `You take off ${tmpl.name}.`)
      + (fighting ? " An opening." : ""));
  }

  // A locked cache: spend the right key to open it, take what it holds. The key
  // is consumed and the box springs empty, refilling on a slow clock. A key is
  // never wasted — a spent lock always gives up at least one thing.
  private async cmdUnlock(session: Session, arg: string): Promise<void> {
    const world = this.world!;
    const here = world.caches.filter((c) => c.roomId === session.roomId);
    if (!here.length) return this.send(session, "There's nothing here to unlock.");
    const cache = (arg ? here.find((c) => nameMatches(c.name, arg)) : null) ?? here[0];
    const keyT = world.itemTemplates.get(cache.keyItem);
    if (!this.cacheLocked(cache)) {
      return this.send(session, `${cap(cache.name)} hangs open and empty. Give it time to be worth forcing again.`);
    }
    const key = session.items.find((c) => c.itemId === cache.keyItem);
    if (!key) return this.send(session, `${cap(cache.name)} is locked. You'd need ${keyT?.name ?? "the right key"}.`);
    // Spend the key and start the refill clock.
    session.items.splice(session.items.indexOf(key), 1);
    await removeItemRow(this.env.DB, key.rowId);
    this.cacheSpent.set(cache.id, Date.now() + cache.refillSecs * 1000);
    this.send(session, `You work ${keyT?.name ?? "the key"} into the lock. It gives with a groan, and ${cache.name} swings open.`, "unlock");
    this.roomFeed(session.roomId, `${session.name} forces ${cache.name} open.`, session.pubkey);
    // Now and then the box is a lie: forced open on nothing. The key's already
    // spent and the refill clock's already running, so a dud costs you the same
    // as a haul — that's the sting. The reliquary is exempt: it takes a boss and
    // the black key to stand here, and a dud would be too bitter for that price.
    if (cache.keyItem !== "reliquary-key" && chance(CACHE_EMPTY_ODDS)) {
      this.send(session, pick([
        "Inside: nothing. Picked clean long before you, or never worth the forcing. The key's spent all the same.",
        "The lid comes up on bare iron and cold air. Empty. Someone was here first, or nothing ever was.",
        "Nothing. Cobwebs, grit, and a lock you'll have to feed another key to try again.",
        "Empty — whatever it held is long gone. You forced it for the smell of old dust.",
      ]));
      this.sendCtx(session);
      await this.persist();
      return;
    }
    // Roll the pool; a key always yields something, so if nothing hits, one is
    // granted anyway (the richest chance).
    const won = cache.loot.filter((e) => chance(e.chance));
    if (won.length === 0 && cache.loot.length) {
      won.push([...cache.loot].sort((a, b) => b.chance - a.chance)[0]);
    }
    for (const entry of won) {
      const item = world.itemTemplates.get(entry.itemId);
      if (!item) continue;
      // Into the pack if it fits; if you're full, it spills to the floor rather
      // than vanish — pick it up when you've made room.
      if (await this.grantItem(session, item.id)) {
        this.send(session, `Inside: ${item.name}.${this.itemStat(item)} [${item.rarity}] (unclaimed — the gate can seal it)`);
      } else {
        this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), item.id]);
        this.send(session, `Inside: ${item.name}.${this.itemStat(item)} [${item.rarity}] — but your pack is full, so it falls at your feet.`);
      }
    }
    this.refreshRoomCtx(session.roomId);
    this.sendCtx(session);
    await this.persist();
  }

  // ---- the bench's other trades: salvage, forge, repair (gate only) ----

  // How many unsealed copies of an item ride in the pack (tender and materials;
  // a sealed copy is title, and the bench and the keeper both leave it alone).
  private countLoose(session: Session, itemId: string): number {
    return session.items.filter((c) => c.itemId === itemId && c.serial === null).length;
  }

  // Consume n unsealed copies out of the pack (rows deleted for good).
  private async takeLoose(session: Session, itemId: string, n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      const idx = session.items.findIndex((c) => c.itemId === itemId && c.serial === null);
      if (idx === -1) return;
      const [row] = session.items.splice(idx, 1);
      await removeItemRow(this.env.DB, row.rowId);
    }
  }

  private benchGuard(session: Session, work: string): string | null {
    if (!this.world!.entryRooms.has(session.roomId)) {
      return `That's ${work} — the vice and the brazier live at the gates.`;
    }
    if (this.inCombat(session)) return "Not while something is trying to kill you.";
    return null;
  }

  // Break a piece of gear down in the bench vice. Shared by the typed command
  // and the bench modal; returns the line to show either way.
  private async salvageCore(session: Session, carried: CarriedItem): Promise<string> {
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    if (tmpl.slot === "") return `There's no salvage in ${tmpl.name}.`;
    if (tmpl.id === "loose-rock") return "It's a rock.";
    if (carried.serial !== null) return "The gate's seal is on it — the vice won't take gate-marked goods.";
    if (carried.equipped) {
      carried.equipped = false;
      await setEquipped(this.env.DB, carried.rowId, false);
    }
    const yieldN = SALVAGE_YIELD[tmpl.rarity] ?? 1;
    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    for (let i = 0; i < yieldN; i++) {
      const id = uuid();
      await insertLoot(this.env.DB, id, session.pubkey, SCRAP_ID, null);
      session.items.push({ rowId: id, itemId: SCRAP_ID, serial: null, equipped: false, condition: 100 });
    }
    return `You crank ${tmpl.name} into the vice and break it down. ${yieldN === 1 ? "A handful" : yieldN + " handfuls"} of scrap iron for the pile.`;
  }

  private async cmdSalvage(session: Session, arg: string): Promise<void> {
    const bar = this.benchGuard(session, "bench work");
    if (bar) return this.send(session, bar);
    if (!arg) return this.send(session, "Salvage what? The vice takes gear and gives scrap iron.");
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    const line = await this.salvageCore(session, carried);
    this.send(session, line);
    this.roomFeed(session.roomId, `${session.name} works the bench vice, breaking steel.`, session.pubkey);
    this.sendCtx(session);
  }

  // Mend a worn piece with scrap iron. Shared with the bench modal.
  private async repairCore(session: Session, carried: CarriedItem): Promise<string> {
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    if (tmpl.slot === "") return `There's nothing to mend in ${tmpl.name}.`;
    if (carried.serial !== null) return "The seal holds it as it is — frozen, wear and all.";
    if (carried.condition >= 100) return `${cap(tmpl.name)} is sound already.`;
    const cost = REPAIR_COST[tmpl.rarity] ?? 1;
    const have = this.countLoose(session, SCRAP_ID);
    if (have < cost) return `The mend wants ${cost} scrap iron; you carry ${have}.`;
    await this.takeLoose(session, SCRAP_ID, cost);
    carried.condition = 100;
    await setItemCondition(this.env.DB, carried.rowId, 100);
    return `You hammer the wear out of ${tmpl.name} and file it true. Sound again.`;
  }

  private async cmdRepair(session: Session, arg: string): Promise<void> {
    const bar = this.benchGuard(session, "bench work");
    if (bar) return this.send(session, bar);
    if (!arg) return this.send(session, "Repair what?");
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    this.send(session, await this.repairCore(session, carried));
    this.sendCtx(session);
  }

  private async cmdForge(session: Session, arg: string): Promise<void> {
    const world = this.world!;
    const bar = this.benchGuard(session, "forge work");
    if (bar) return this.send(session, bar);
    if (!world.forgeRecipes.length) return this.send(session, "The brazier is cold and the recipe slate is blank.");
    if (!arg) {
      const lines = ["The bench's recipe book, chalked on slate:"];
      for (const r of [...world.forgeRecipes].sort((a, b) => a.scrap - b.scrap)) {
        const t = world.itemTemplates.get(r.itemId);
        if (!t) continue;
        const mat = r.material ? ` + ${r.materialQty} ${shortName(world.itemTemplates.get(r.material)?.name ?? r.material)}` : "";
        lines.push(`  ${t.name}${this.itemStat(t)} [${t.rarity}] — ${r.scrap} scrap iron${mat}`);
      }
      lines.push(`(You carry ${this.countLoose(session, SCRAP_ID)} scrap iron. 'forge <thing>' to work one. Salvage feeds the pile.)`);
      return this.send(session, lines.join("\n"));
    }
    const recipe = world.forgeRecipes.find((r) => {
      const t = world.itemTemplates.get(r.itemId);
      return t ? nameMatches(t.name, arg) : false;
    });
    if (!recipe) return this.send(session, "The bench doesn't know how to make that. ('forge' alone reads the slate.)");
    const t = world.itemTemplates.get(recipe.itemId)!;
    if (!this.packRoom(session, recipe.itemId)) {
      return this.send(session, `Your pack is full (${PACK_CAP} slots). Make room before you forge.`);
    }
    const haveScrap = this.countLoose(session, SCRAP_ID);
    if (haveScrap < recipe.scrap) {
      return this.send(session, `${cap(t.name)} wants ${recipe.scrap} scrap iron; you carry ${haveScrap}.`);
    }
    if (recipe.material) {
      const mt = world.itemTemplates.get(recipe.material);
      const haveMat = this.countLoose(session, recipe.material);
      if (haveMat < recipe.materialQty) {
        return this.send(session, `${cap(t.name)} wants ${recipe.materialQty} of ${mt?.name ?? recipe.material} besides the scrap; you carry ${haveMat}.`);
      }
    }
    await this.takeLoose(session, SCRAP_ID, recipe.scrap);
    if (recipe.material) await this.takeLoose(session, recipe.material, recipe.materialQty);
    const id = uuid();
    await insertLoot(this.env.DB, id, session.pubkey, t.id, null);
    session.items.push({ rowId: id, itemId: t.id, serial: null, equipped: false, condition: 100 });
    this.send(session, `Scrap, the brazier's heat, and patience. ${cap(t.name)} comes off the bench, raw but true.${this.itemStat(t)} [${t.rarity}] (unclaimed — the gate can seal it)`, "forge");
    this.roomFeed(session.roomId, `${session.name} works the bench, hammer ringing off the gatehouse walls.`, session.pubkey);
    this.sendCtx(session);
  }

  // ---- the keeper at the gate: stock, trade, and his particular tastes ----
  // He deals in kind: 'buy' names the want, 'offer' lays goods on the counter
  // until the trade value is met. No change given, nothing bought outright,
  // nothing sealed touched. What he privately prizes, he never says.

  private fenceGuard(session: Session): string | null {
    if (!this.world!.entryRooms.has(session.roomId)) return "The keeper keeps to the gates.";
    if (this.inCombat(session)) return "The keeper wants no part of your fight. The hatch stays shut.";
    return null;
  }

  private cmdBarter(session: Session): void {
    const world = this.world!;
    const bar = this.fenceGuard(session);
    if (bar) return this.send(session, bar);
    if (!world.fenceStock.length) return this.send(session, "The hatch is shuttered, and stays that way.");
    const lines = ["The keeper unshutters the hatch and lays out what he'll part with:"];
    for (const s of [...world.fenceStock].sort((a, b) => a.cost - b.cost)) {
      const t = world.itemTemplates.get(s.itemId);
      if (!t) continue;
      lines.push(`  ${t.name}${this.itemStat(t)} [${t.rarity}] — ${s.cost} in trade`);
    }
    lines.push("He deals in kind — bones, teeth, oddments. 'buy <thing>' starts a trade; 'offer <thing>' pays until he's square. He gives no change.");
    return this.send(session, lines.join("\n"));
  }

  // Name the want: opens the trade. Shared by the typed command and the modal.
  private startBuy(session: Session, stock: { itemId: string; cost: number }): string {
    const t = this.world!.itemTemplates.get(stock.itemId)!;
    session.buying = { itemId: stock.itemId, cost: stock.cost, paid: 0, escrow: [] };
    return `The keeper taps the counter: ${t.name} runs ${stock.cost} in trade. Offer what you carry — he'll say when he's square.`;
  }

  private cmdBuy(session: Session, arg: string): void {
    const world = this.world!;
    const bar = this.fenceGuard(session);
    if (bar) return this.send(session, bar);
    if (!arg) return this.send(session, "Buy what? 'barter' shows the keeper's stock.");
    const stock = world.fenceStock.find((s) => {
      const t = world.itemTemplates.get(s.itemId);
      return t ? nameMatches(t.name, arg) : false;
    });
    if (!stock) return this.send(session, "The keeper shrugs. He doesn't carry that.");
    this.send(session, this.startBuy(session, stock) + " ('offer nothing' walks away.)");
    this.sendCtx(session);
  }

  // Lay one thing on the counter — from the pack, the lockbox, or the vault
  // (from: '' | 'lockbox' | 'vault'; nothing moves until he's square). All the
  // keeper's judgement lives here; returns the line to show, however the offer
  // arrived (typed or modal). He TAKES gate-sealed goods — and cracks the seal
  // without ceremony when the trade closes (the mint is voided, honestly).
  private async offerCore(session: Session, carried: CarriedItem, from: string): Promise<string> {
    const world = this.world!;
    const trade = session.buying!;
    const t = world.itemTemplates.get(carried.itemId)!;
    if ((t.barter ?? 0) <= 0) return `The keeper waves ${t.name} away. No use to him.`;
    trade.escrow.push({ row: carried.rowId, from });
    trade.paid = roundTender(trade.paid + t.barter);
    // His manner is the only appraisal anyone gets.
    let line: string;
    if (t.barter >= RICH_TENDER) {
      line = `The keeper goes very still. Then ${t.name} is gone beneath the counter, and his manner warms considerably.`;
    } else if (t.barter >= 5) {
      line = `The keeper's eyebrows climb. He makes ${t.name} disappear.`;
    } else if (t.barter >= 2) {
      line = `The keeper weighs ${t.name} in his palm and nods.`;
    } else {
      line = `The keeper turns ${t.name} over and grunts.`;
    }
    if (trade.paid < trade.cost) return `${line} (${trade.paid} of ${trade.cost}.)`;
    // Square. Re-tally the counter honestly (something offered may have been
    // dropped or moved since), then the goods change hands for good.
    const boxes = new Map<string, CarriedItem[]>([["", session.items]]);
    for (const key of ["lockbox", "vault"] as const) {
      if (trade.escrow.some((e) => e.from === key)) {
        boxes.set(key, await loadContainer(this.env.DB, session.pubkey, key));
      }
    }
    const onCounter: { entry: { row: string; from: string }; item: CarriedItem }[] = [];
    for (const e of trade.escrow) {
      const item = (boxes.get(e.from) ?? []).find((c) => c.rowId === e.row);
      if (item) onCounter.push({ entry: e, item });
    }
    trade.escrow = onCounter.map((o) => o.entry);
    trade.paid = roundTender(onCounter.reduce((sum, o) => sum + (world.itemTemplates.get(o.item.itemId)?.barter ?? 0), 0));
    if (trade.paid < trade.cost) {
      return `${line} The keeper re-counts and shakes his head — the counter's short. (${trade.paid} of ${trade.cost}.)`;
    }
    let cracked = false;
    for (const o of onCounter) {
      if (o.item.serial !== null) {
        await voidMint(this.env.DB, o.item.serial);
        cracked = true;
      }
      await removeItemRow(this.env.DB, o.item.rowId);
      if (o.entry.from === "") {
        const idx = session.items.findIndex((c) => c.rowId === o.item.rowId);
        if (idx !== -1) session.items.splice(idx, 1);
      }
    }
    const bought = world.itemTemplates.get(trade.itemId)!;
    // A fresh journal off the keeper's shelf gets a blank book — its own id, so
    // whatever this wanderer writes in it is theirs to keep, lose, or bleed.
    const jid = bought.id === JOURNAL_ITEM ? "jrn-" + uuid() : undefined;
    // The trade's paid: the goods are gone off the counter (slots freed), so
    // there's almost always room. If the pack is somehow still full, it lands at
    // your feet at the gate rather than vanishing.
    const got = await this.grantItem(session, bought.id, { journalId: jid });
    if (!got) this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), bought.id]);
    const change = trade.paid > trade.cost ? " He gives no change." : "";
    const seals = cracked ? " He cracks the gate's seals without ceremony." : "";
    const where = got ? "across the counter" : "across the counter — your pack is full, so it sits at your feet";
    session.buying = undefined;
    this.roomFeed(session.roomId, `${session.name} trades at the keeper's hatch.`, session.pubkey);
    return `${line}${seals}\nThe keeper slides ${bought.name} ${where}.${change}${this.itemStat(bought)} [${bought.rarity}] (unclaimed — the gate can seal it)`;
  }

  private async cmdOffer(session: Session, arg: string): Promise<void> {
    const world = this.world!;
    const bar = this.fenceGuard(session);
    if (bar) return this.send(session, bar);
    const trade = session.buying;
    if (!trade) {
      return this.send(session, "You're not mid-trade. The keeper buys nothing outright — 'buy <thing>' first, then offer your goods against it.");
    }
    if (arg === "nothing" || arg === "stop" || arg === "cancel" || arg === "no") {
      session.buying = undefined;
      this.sendCtx(session);
      return this.send(session, "You wave the trade off. The keeper sweeps your goods back across the counter without a word.");
    }
    if (!arg) return this.send(session, `You've laid ${trade.paid} of ${trade.cost} on the counter so far.`);
    // First pack match not already on the counter. (Typed offers deal from the
    // pack; the modal's tabs reach the lockbox and the vault.)
    let carried: CarriedItem | null = null;
    let onCounter = false;
    for (const c of session.items) {
      const t = world.itemTemplates.get(c.itemId);
      if (!t || !nameMatches(t.name, arg)) continue;
      if (trade.escrow.some((e) => e.row === c.rowId)) { onCounter = true; continue; }
      carried = c;
      break;
    }
    if (!carried) {
      return this.send(session, onCounter ? "That's already on the counter." : "You carry nothing like that.");
    }
    this.send(session, await this.offerCore(session, carried, ""));
    this.sendCtx(session);
  }

  // ---- the keeper's hatch as a modal: step out of the world and trade ----
  // Same shape as the bench: opening it makes you `away` (untouchable, out of
  // sight), and while it's open the gatehouse quiet closes your wounds too.

  private async handleTrade(session: Session, frame: any): Promise<void> {
    const world = this.world!;
    const action = frame?.action;
    if (action === "open") {
      if (session.away) return; // one step-out at a time
      const bar = this.fenceGuard(session);
      if (bar) return this.send(session, bar);
      if (!world.fenceStock.length) return this.send(session, "The hatch is shuttered, and stays that way.");
      session.away = true;
      session.trading = true;
      session.resting = false;
      session.target = null;
      for (const c of this.creatures.values()) {
        if (c.target === session.pubkey) c.target = null;
      }
      this.roomFeed(session.roomId, `${session.name} steps up to the keeper's hatch.`, session.pubkey);
      this.refreshRoomCtx(session.roomId);
      return this.sendTrade(session);
    }
    if (!session.trading) return;
    if (action === "close") return this.leaveTrade(session);
    let note: string | undefined;
    if (action === "buy") {
      const stock = world.fenceStock.find((s) => s.itemId === frame.row);
      note = stock ? this.startBuy(session, stock) : undefined;
    } else if (action === "offer") {
      if (!session.buying) {
        note = "Pick your want from the stock first.";
      } else {
        // The modal deals from any tab: pack, lockbox, or vault. Prefer an
        // unsealed copy — no point cracking a seal the trade doesn't need.
        const src = frame.src === "lockbox" || frame.src === "vault" ? frame.src : "";
        const pool = src === "" ? session.items : await loadContainer(this.env.DB, session.pubkey, src);
        const candidates = pool.filter(
          (c) => c.itemId === frame.row && !session.buying!.escrow.some((e) => e.row === c.rowId),
        );
        const carried = candidates.find((c) => c.serial === null) ?? candidates[0];
        note = carried ? await this.offerCore(session, carried, src) : "You've nothing more like that to offer.";
      }
    } else if (action === "cancel") {
      if (session.buying) {
        session.buying = undefined;
        note = "You wave the trade off. The keeper sweeps your goods back across the counter.";
      }
    } else return;
    return this.sendTrade(session, note);
  }

  private async leaveTrade(session: Session): Promise<void> {
    session.away = false;
    session.trading = false;
    session.buying = undefined; // an unfinished trade sweeps back with you
    try { session.ws.send(JSON.stringify({ v: 0, t: "trade", open: false })); } catch {}
    this.roomFeed(session.roomId, `${session.name} steps back from the hatch.`, session.pubkey);
    this.send(session, this.enterDescribe(session));
    this.sendCtx(session);
    this.refreshRoomCtx(session.roomId);
  }

  private async sendTrade(session: Session, note?: string): Promise<void> {
    const world = this.world!;
    const stock = [...world.fenceStock]
      .sort((a, b) => a.cost - b.cost)
      .map((s) => {
        const t = world.itemTemplates.get(s.itemId);
        return t ? {
          id: s.itemId, name: t.name, rarity: t.rarity, cost: s.cost,
          stat: this.itemStat(t).replace(/^ \(|\)$/g, ""),
        } : null;
      })
      .filter((s) => s !== null);
    // Your side of the counter, one tab per keeping: pack, lockbox, vault.
    // What he'd take, collapsed by kind — never a value shown; his manner
    // when you offer is the only appraisal. Sealed goods trade too (he
    // cracks the seal when the deal closes), so the vault's wealth counts.
    const tally = (pool: CarriedItem[]) => {
      const goods = new Map<string, { id: string; name: string; rarity: string; n: number }>();
      for (const c of pool) {
        if (session.buying?.escrow.some((e) => e.row === c.rowId)) continue;
        const t = world.itemTemplates.get(c.itemId);
        if (!t || (t.barter ?? 0) <= 0) continue;
        const g = goods.get(t.id);
        if (g) g.n += 1;
        else goods.set(t.id, { id: t.id, name: t.name, rarity: t.rarity, n: 1 });
      }
      return [...goods.values()];
    };
    const goods = {
      pack: tally(session.items),
      lockbox: tally(await loadContainer(this.env.DB, session.pubkey, "lockbox")),
      vault: tally(await loadContainer(this.env.DB, session.pubkey, "vault")),
    };
    const buying = session.buying;
    const want = buying ? {
      name: world.itemTemplates.get(buying.itemId)?.name ?? buying.itemId,
      cost: buying.cost,
      paid: buying.paid,
    } : null;
    const payload = {
      v: 0, t: "trade", open: true, note: note ?? "",
      stock, goods, want,
    };
    try { session.ws.send(JSON.stringify(payload)); } catch {}
  }

  // Gear stat tag for the inventory line, e.g. " (+4 dmg)", " (+1 dmg, x2 swings)",
  // " (+2 dmg, sweeps 3)", " (2 armor, heavy)".
  private itemStat(t: ItemTemplate | undefined): string {
    if (!t) return "";
    const bits: string[] = [];
    if (t.dmg > 0) bits.push(`+${t.dmg} dmg`);
    if (t.speed > 1) bits.push(`x${t.speed} swings`);
    if (t.sweep > 1) bits.push(`sweeps ${t.sweep}`);
    if (t.bleed > 0) bits.push(`bleeds ${t.bleed}`);
    if (t.stun > 0) bits.push(`${Math.round(t.stun * 100)}% stun`);
    if (t.block > 0) bits.push(`${Math.round(t.block * 100)}% block`);
    if (t.armor > 0) bits.push(`${t.armor} armor, ${t.weight > 0 ? "heavy" : "light"}`);
    else if (t.weight > 0) bits.push("heavy"); // weighted weapon/shield: costs your footwork
    return bits.length ? ` (${bits.join(", ")})` : "";
  }

  // Is this a plain carryable (food, trophy, key) that can safely stack, or gear
  // that must be listed on its own (its wear and slot differ per instance)?
  private isGear(itemId: string): boolean {
    const t = this.world!.itemTemplates.get(itemId);
    return !!t && t.slot !== "";
  }

  // A fungible pack item — trophies, food, scrap, keys, cigarettes. Many share
  // one slot. Gear (has a slot), sealed items (own serial), journals (own pages),
  // and maps (own reading) are each their own slot and never stack.
  private stackable(itemId: string, serial: number | null, journalId?: string): boolean {
    if (serial !== null || journalId) return false;
    if (MAP_ITEMS.has(itemId) || itemId === JOURNAL_ITEM) return false;
    return !this.isGear(itemId);
  }

  // How many slots a set of carried items fills: each non-stacking item is one,
  // and every distinct stacking KIND is one, however deep the pile.
  private slotsUsed(items: CarriedItem[]): number {
    const kinds = new Set<string>();
    let loose = 0;
    for (const c of items) {
      if (this.stackable(c.itemId, c.serial, c.journalId)) kinds.add(c.itemId);
      else loose++;
    }
    return loose + kinds.size;
  }

  // Room for one more of itemId in a given store (default the pack)? A stacking
  // kind you already hold always fits — it joins the pile; otherwise you need a
  // free slot under the cap.
  private hasRoom(items: CarriedItem[], itemId: string, cap: number): boolean {
    if (this.stackable(itemId, null) && items.some((c) => c.itemId === itemId && this.stackable(c.itemId, c.serial, c.journalId))) return true;
    return this.slotsUsed(items) < cap;
  }

  private packRoom(session: Session, itemId: string): boolean {
    return this.hasRoom(session.items, itemId, PACK_CAP);
  }

  // Mint one item into the pack, if there's room. Returns the row, or null when
  // the pack is full (the caller decides: refuse, or spill to the ground). The
  // single doorway for loot onto the body — cap enforcement lives here.
  private async grantItem(session: Session, itemId: string, opts?: { condition?: number; journalId?: string }): Promise<CarriedItem | null> {
    if (!this.packRoom(session, itemId)) return null;
    const rowId = uuid();
    const carried: CarriedItem = { rowId, itemId, serial: null, equipped: false, condition: opts?.condition ?? 100, journalId: opts?.journalId };
    session.items.push(carried);
    await insertLoot(this.env.DB, rowId, session.pubkey, itemId, null, carried.condition);
    if (opts?.journalId) await setItemJournalId(this.env.DB, rowId, opts.journalId);
    return carried;
  }

  private itemLine(c: CarriedItem): string {
    const t = this.world!.itemTemplates.get(c.itemId);
    let s = `  ${t ? t.name : c.itemId} [${t?.rarity ?? "?"}]${this.itemStat(t)}`;
    const tags: string[] = [];
    if (c.equipped) tags.push(t?.slot === "weapon" ? "wielded" : "worn");
    if (c.serial !== null) tags.push(`sealed #${c.serial}`); // frozen whole
    else if (t && t.slot !== "") tags.push(this.conditionWord(c.condition) || "sound");
    if (tags.length) s += ` — ${tags.join(", ")}`;
    return s;
  }

  private cmdInventory(session: Session): void {
    if (session.items.length === 0) return this.send(session, "You carry nothing but your keys.");
    const world = this.world!;
    const lines = ["You carry:"];
    // Plain, un-equipped, provisional carryables stack; gear, equipped, and
    // sealed things are individuals (each wears, or is numbered, on its own).
    const counts = new Map<string, number>();
    for (const c of session.items) {
      if (this.stackable(c.itemId, c.serial, c.journalId) && !c.equipped) {
        counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + 1);
      }
    }
    for (const [id, n] of counts) {
      const t = world.itemTemplates.get(id);
      lines.push(`  ${t ? t.name : id}${n > 1 ? ` (x${n})` : ""} [${t?.rarity ?? "?"}]${this.itemStat(t)}`);
    }
    for (const c of session.items) {
      if (this.stackable(c.itemId, c.serial, c.journalId) && !c.equipped) continue; // stacked above
      lines.push(this.itemLine(c));
    }
    lines.push(`(Pack: ${this.slotsUsed(session.items)}/${PACK_CAP} slots.)`);
    this.send(session, lines.join("\n"));
  }

  private cmdWho(session: Session): void {
    const world = this.world!;
    const awake = [...this.sessions.values()].filter((s) => !s.away);
    const lines = [`Awake in the Door (${awake.length}):`];
    for (const s of awake) {
      lines.push(`  ${s.name} — ${world.rooms.get(s.roomId)?.name ?? s.roomId}`);
    }
    this.send(session, lines.join("\n"));
  }

  private async cmdName(session: Session, arg: string): Promise<void> {
    const name = arg.trim();
    if (!name) return this.send(session, `Name yourself what? (name <yourname>)`);
    if (!/^[a-z0-9][a-z0-9_-]{1,15}$/i.test(name)) {
      return this.send(
        session,
        "Names are 2-16 characters: letters, numbers, - or _.",
      );
    }
    if (name.toLowerCase() === session.name.toLowerCase()) {
      return this.send(session, `You are already ${session.name}.`);
    }
    const ok = await renamePlayer(this.env.DB, session.pubkey, name);
    if (!ok) return this.send(session, `Someone in the dungeon already answers to ${name}.`);
    const old = session.name;
    session.name = name;
    session.named = true;
    this.send(session, `The dungeon will remember you as ${name}.`);
    this.roomFeed(session.roomId, `${old} is now known as ${name}.`, session.pubkey);
    this.sendStatus(session);
  }

  private cmdRest(session: Session): void {
    if (this.inCombat(session)) {
      return this.send(session, "Rest, now? Something here has other plans for you.");
    }
    // You can't close your eyes with something sharing the room, even if it
    // hasn't turned on you yet — a rat in the corner is a knife waiting to be
    // drawn. (A hidden lurker doesn't block it: you don't know it's there, and
    // resting into its jaws is exactly the risk it lives on.)
    const menace = [...this.creatures.values()].find(
      (c) => c.roomId === session.roomId && !c.hidden,
    );
    if (menace) {
      const mt = this.world!.mobTemplates.get(menace.templateId)!;
      return this.send(session, `Not with ${mt.name} in the room. You'd never close your eyes.`);
    }
    if (session.hp >= session.maxHp) return this.send(session, "You are unhurt.");
    if (session.resting) return this.send(session, "You are already resting.");
    session.resting = true;
    this.addTrace(session.roomId, { kind: "rest", at: Date.now() });
    this.send(session, pick([
      "You settle against the cold stone. Wounds close slowly here — any effort ends it.",
      "You lower yourself down and let your breathing slow. The ache eases, little by little — any effort ends it.",
      "You find a wall to put your back to and go still. Blood stops where it was running — any effort ends it.",
      "You sink down where you stand and let the dark hold you a while. The hurt recedes — any effort ends it.",
    ]));
    this.roomFeed(session.roomId, `${session.name} settles down to rest.`, session.pubkey);
  }

  // Fishing: only off the Pocket of Air's dry shelf, a line dropped into the
  // black flood below. Rarely anything takes it — but a fish is good, fresh
  // food, and the eel is a real meal. A short patience between casts.
  private async cmdFish(session: Session): Promise<void> {
    const world = this.world!;
    if (this.inCombat(session)) return this.send(session, "Not with something trying to kill you.");
    if (!FISHING_ROOMS.has(session.roomId)) {
      return this.send(session, "There's no water here to fish. You'd need to drop a line where the flood pools deep.");
    }
    const now = Date.now();
    if (session.lastFishAt && now - session.lastFishAt < FISH_COOLDOWN_MS) {
      return this.send(session, "You've only just cast. Let the line settle.");
    }
    session.lastFishAt = now;
    if (!chance(FISH_ODDS)) {
      return this.send(session, pick([
        "You lower a line into the black water and wait. Nothing takes it.",
        "The water lies flat and still. Whatever's down there isn't hungry.",
        "A tug — then slack. Gone before you could haul it up.",
        "You wait, and wait, and the flood keeps its own.",
        "Something brushes the line and thinks better of it.",
      ]));
    }
    const fishId = chance(PALE_EEL_ODDS) ? "pale-eel" : "cave-fish";
    const fish = world.itemTemplates.get(fishId);
    if (!fish) return this.send(session, "Something takes the line — but it slips free before you can land it.");
    if (!(await this.grantItem(session, fish.id))) {
      return this.send(session, `Something takes the line — but your pack is full, and you have to let ${fish.name} go.`);
    }
    this.send(session, (fishId === "pale-eel"
      ? `The line goes taut and FIGHTS you — you haul up ${fish.name}, thrashing.`
      : `The line goes taut — you haul up ${fish.name}.`)
      + ` [${fish.rarity}] (unclaimed — good, fresh food)`, "gain");
    this.roomFeed(session.roomId, `${session.name} lands a catch from the flood.`, session.pubkey);
    this.sendCtx(session);
    await this.persist();
  }

  private cmdCarve(session: Session, arg: string): void {
    const words = arg.replace(/[\r\n\t]+/g, " ").replace(/"/g, "'").trim();
    if (!words) return this.send(session, "Carve what? (carve <words>)");
    if (words.length > CARVE_MAX_LEN) {
      return this.send(session, `The stone only takes ${CARVE_MAX_LEN} characters. Chisel it down.`);
    }
    this.addTrace(session.roomId, { kind: "carve", at: Date.now(), label: session.name, words });
    this.send(session, `You scratch it into the stone: "${words}"`, "study");
    this.roomFeed(session.roomId, `${session.name} scratches something into the wall.`, session.pubkey);
    this.roomSound(session.roomId, "A faint scratching, {dir}.");
    this.creatureNoise(session.roomId);
  }

  // Take one thing out of the pack and eat it: off the inventory, out of the
  // DB, its seal (if any) voided, and the heal applied. Shared by the `eat`
  // command and the auto-eat reflex, so both do it exactly the same way.
  private async consumeFood(
    session: Session,
    carried: CarriedItem,
  ): Promise<{ before: number; tmpl: ItemTemplate }> {
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    if (carried.serial !== null) await voidMint(this.env.DB, carried.serial);
    const before = session.hp;
    session.hp = Math.min(session.maxHp, session.hp + tmpl.heal);
    return { before, tmpl };
  }

  // The provisional food a player is carrying, weakest heal first — the order
  // both manual `eat` (unhurt-safe default) and auto-eat draw from. Sealed
  // rations are never touched by accident.
  private carriedFood(session: Session): CarriedItem[] {
    const world = this.world!;
    return session.items
      .filter((c) => world.itemTemplates.get(c.itemId)?.edible)
      .sort((a, b) =>
        Number(a.serial !== null) - Number(b.serial !== null) ||
        (world.itemTemplates.get(a.itemId)!.heal - world.itemTemplates.get(b.itemId)!.heal));
  }

  private async cmdEat(session: Session, arg: string): Promise<void> {
    const world = this.world!;
    // Provisional food first — nobody eats the sealed rations by accident.
    const edibles = this.carriedFood(session);
    if (edibles.length === 0) return this.send(session, "You carry nothing you could eat.");

    let carried: CarriedItem | null;
    if (!arg) {
      carried = edibles[0];
    } else {
      carried = this.findCarried(session, arg);
      if (!carried) return this.send(session, "You carry nothing like that.");
      if (!world.itemTemplates.get(carried.itemId)?.edible) {
        return this.send(session, `You gnaw at ${world.itemTemplates.get(carried.itemId)!.name}. It is not food.`);
      }
    }
    const { before, tmpl } = await this.consumeFood(session, carried);
    // Bolting food mid-fight is allowed — desperation is — but you drop your
    // guard to do it, and the next hit that lands makes you pay for the bite.
    const gulped = this.inCombat(session);
    if (gulped) session.staggered = true;
    this.send(
      session,
      (session.hp > before
        ? `You eat ${tmpl.name}. ${pick([
            "Warmth comes back to you.",
            "It sits like a coal in your belly, and some of the grey lifts.",
            "It is barely food, but your hands steady.",
            "Strength trickles back into your limbs.",
            "The gnawing eases, and you feel a little less like dying.",
          ])} [${session.hp}/${session.maxHp} hp]`
        : `You eat ${tmpl.name}.`)
      + (gulped ? " You bolt it down with one eye on your foe — an opening." : ""),
      "gain",
    );
    this.roomFeed(session.roomId, `${session.name} eats ${tmpl.name}.`, session.pubkey);
    this.sendStatus(session);
    this.sendCtx(session);
    await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
  }

  // ---- instanced floor items (journals carry their pages onto the stones) ----

  private dropInstance(roomId: string, itemId: string, journalId: string): void {
    const here = this.groundInstances.get(roomId) ?? [];
    here.push({ itemId, journalId });
    this.groundInstances.set(roomId, here);
  }

  // Find and lift a matching instanced item off the floor (removed from the
  // ground the moment it's matched; the caller mints it into a pack).
  private takeGroundInstance(roomId: string, arg: string): GroundInstance | null {
    const here = this.groundInstances.get(roomId);
    if (!here?.length) return null;
    const idx = here.findIndex((g) => {
      const t = this.world!.itemTemplates.get(g.itemId);
      return t && nameMatches(t.name, arg);
    });
    if (idx === -1) return null;
    const [inst] = here.splice(idx, 1);
    if (!here.length) this.groundInstances.delete(roomId); else this.groundInstances.set(roomId, here);
    return inst;
  }

  // Pick up an instanced journal: a fresh pack row stamped with the book's own
  // id, so its pages (journal_logs, keyed to that id) find it again — the whole
  // point of the thing being stealable.
  private async getInstanced(session: Session, inst: GroundInstance): Promise<void> {
    const tmpl = this.world!.itemTemplates.get(inst.itemId)!;
    if (!this.packRoom(session, inst.itemId)) {
      this.dropInstance(session.roomId, inst.itemId, inst.journalId); // put it back down
      return this.send(session, `Your pack is full (${PACK_CAP} slots) — no room for ${tmpl.name}.`);
    }
    const rowId = uuid();
    const carried: CarriedItem = { rowId, itemId: inst.itemId, serial: null, equipped: false, condition: 100, journalId: inst.journalId };
    session.items.push(carried);
    await insertLoot(this.env.DB, rowId, session.pubkey, inst.itemId, null);
    await setItemJournalId(this.env.DB, rowId, inst.journalId);
    let stooped = "";
    if (this.inCombat(session)) { session.staggered = true; stooped = " You stoop for it under the swing — an opening."; }
    const pages = (await journalLoad(this.env.DB, inst.journalId)).length;
    this.send(session, `You take ${tmpl.name}.` + (pages ? ` Its pages are already ${pages > 8 ? "densely" : "half"} filled — someone else's hunting, now yours.` : "") + stooped);
    this.roomFeed(session.roomId, `${session.name} takes ${tmpl.name}.`, session.pubkey);
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }

  // ---- maps: open a chart you carry (the modal draws it) ----

  private cmdMap(session: Session, arg: string): void {
    const maps = session.items.filter((c) => MAP_ITEMS.has(c.itemId));
    if (!maps.length) {
      return this.send(session, "You carry no map. The keeper sells them — a true one dear, a crude one cheap.");
    }
    // Name one, or default to the best you hold (a true map over a crude one).
    let carried = arg ? maps.find((c) => nameMatches(this.world!.itemTemplates.get(c.itemId)!.name, arg)) : null;
    if (!carried) carried = maps.find((c) => c.itemId === DETAILED_MAP) ?? maps[0];
    const detailed = carried.itemId === DETAILED_MAP;
    this.sendMap(session, carried, detailed);
    this.send(session, detailed
      ? "You unroll the surveyor's map. Every hall is on it, set down true."
      : "You unfold the crude map. Some of these ways are right. Trust it at your peril.");
  }

  private regionOf(roomId: string): "gate" | "deep" | "upper" {
    return this.world!.entryRooms.has(roomId) ? "gate" : DEEP_ROOMS.has(roomId) ? "deep" : "upper";
  }

  // Build and send the map frame. A detailed map is the true graph and lights
  // its rooms 'known' on the HUD; a crude map is deterministically lied — some
  // rooms missing, some exits wrong — seeded off the book so it's consistently
  // (not randomly) wrong, and it reveals nothing it can be trusted on.
  private sendMap(session: Session, carried: CarriedItem, detailed: boolean): void {
    const world = this.world!;
    const rnd = detailed ? null : mulberry32(hashSeed(carried.rowId));
    const roomIds = [...world.rooms.keys()];
    // Which rooms make it onto a crude map: the gates and where you stand always
    // do; the rest are a coin-weighted omission.
    const shown = new Set<string>();
    for (const id of roomIds) {
      if (detailed || this.regionOf(id) === "gate" || id === session.roomId || rnd!() >= CRUDE_DROP_ROOM) {
        shown.add(id);
      }
    }
    const regions: Record<string, { label: string; rooms: any[] }> = {
      gate: { label: "The Gates", rooms: [] },
      upper: { label: "The Halls", rooms: [] },
      deep: { label: "The Deep", rooms: [] },
    };
    for (const id of shown) {
      const room = world.rooms.get(id)!;
      const realExits = world.exits.get(id) ?? [];
      const exits: { dir: string; to: string; toName: string }[] = [];
      for (const e of realExits) {
        if (!detailed) {
          if (rnd!() < CRUDE_BAD_EXIT) {
            // A lie: half the time the exit's simply missing, half the time it
            // points at the wrong room (one that's on this map).
            if (rnd!() < 0.5) continue;
            const others = [...shown].filter((r) => r !== id);
            const wrong = others[Math.floor(rnd!() * others.length)] ?? e.to_room;
            exits.push({ dir: e.dir, to: wrong, toName: world.rooms.get(wrong)?.name ?? "somewhere" });
            continue;
          }
        }
        exits.push({ dir: e.dir, to: e.to_room, toName: world.rooms.get(e.to_room)?.name ?? e.to_room });
      }
      regions[this.regionOf(id)].rooms.push({ id, name: room.name, exits, here: id === session.roomId });
    }
    try {
      session.ws.send(JSON.stringify({
        v: 0, t: "map", detailed: detailed ? 1 : 0, here: session.roomId,
        // A true map is knowledge you keep: its rooms light gold on the HUD. A
        // crude one reveals nothing it can be trusted on.
        reveal: detailed ? [...shown].map((id) => world.rooms.get(id)!.name) : [],
        regions: Object.values(regions).filter((r) => r.rooms.length),
      }));
    } catch {}
  }

  // ---- the journal: study + blood fill in the bestiary ----

  // A short read of what a creature IS, from the behaviour families it belongs
  // to — the observation half of an account, available once you've studied it.
  private creatureNature(id: string): string {
    if (THIEVES.has(id)) return "A cutpurse. It fights to rob, not to win — one grab and it bolts.";
    if (RUNNERS.has(id)) return "It never stands and fights; it bolts the instant it can. Catch it on the break.";
    if (BROODERS.has(id)) return "A brood-mother. Nest-bound, and while it lives the room keeps filling with young.";
    if (DROWNERS.has(id)) return "A drowned thing. It holds its patch of water and seizes what wades in.";
    if (LURKERS.has(id)) return "It waits unseen and drops on the careless. Noise and movement draw it.";
    if (REVENANTS.has(id)) return "It does not stay down — put it to nothing and it rises again, weaker, to come once more.";
    if (AGGRO_SCAVENGERS.has(id)) return "A scavenger that guards its kills — walk in on one feeding and it turns on you.";
    if (SCAVENGERS.has(id)) return "A scavenger. It roams the dark eating the dead, and grows bold as it gorges.";
    if (PATROLS[id]) return "It walks an endless round of the halls and never breaks stride.";
    if (LISTENERS.has(id)) return "Hollow and blind, but it HEARS — a still, quiet wanderer it lets pass.";
    if (HOLLOW.has(id)) return "Hollow — nothing inside. It does not bleed, hunger, or tire.";
    return "A living thing of the dark, and hungry.";
  }

  private journalTier(kills: number, studied: boolean): number {
    if (studied && kills >= 3) return 3; // the full account
    if (kills >= 1) return 2;            // a rough read, from the killing
    if (studied) return 1;              // habits only, from watching
    return 0;
  }

  // A journal must be IN HAND to write in — its pages, not your memory, do the
  // remembering. It's safe to leave it in the lockbox between hunts; you just
  // can't log a thing while it's locked away. Returns where the nearest one is.
  private async whereIsJournal(session: Session): Promise<"hand" | "stored" | "none"> {
    if (session.items.some((c) => c.journalId || c.itemId === JOURNAL_ITEM)) return "hand";
    for (const key of ["lockbox", "vault"] as const) {
      const held = await loadContainer(this.env.DB, session.pubkey, key);
      if (held.some((c) => c.itemId === JOURNAL_ITEM)) return "stored";
    }
    return "none";
  }

  private async cmdStudy(session: Session, arg: string): Promise<void> {
    const journal = session.items.find((c) => c.journalId);
    if (!journal?.journalId) {
      const where = await this.whereIsJournal(session);
      return this.send(session, where === "stored"
        ? "Your journal's in the lockbox. You need it in hand to write in it — fetch it out first."
        : "You've nothing to write in. Buy a journal from the keeper first.");
    }
    if (!arg) return this.send(session, "Study what?");
    const creature = this.findCreatureIn(session.roomId, arg);
    // You can't study what you can't see — a hidden lurker isn't there yet.
    if (!creature || (creature.hidden && LURKERS.has(creature.templateId) && !creature.target)) {
      return this.send(session, "Nothing by that name is here to study.");
    }
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    await journalStudy(this.env.DB, journal.journalId, tmpl.id);
    // Standing still to watch a thing this close is a risk: if it's a fight, your
    // eyes leave it for a beat.
    let opening = "";
    if (this.inCombat(session)) { session.staggered = true; opening = " Your eyes leave the fight to do it — an opening."; }
    const rows = await journalLoad(this.env.DB, journal.journalId);
    const row = rows.find((r) => r.templateId === tmpl.id);
    const tier = this.journalTier(row?.kills ?? 0, true);
    this.send(session, `You watch ${tmpl.name} a while and set down what you see.` +
      (tier < 3 ? ` (Its full account wants ${3 - (row?.kills ?? 0)} more kill${3 - (row?.kills ?? 0) === 1 ? "" : "s"}.)` : " Its account is complete.") + opening, "study");
    this.roomFeed(session.roomId, `${session.name} watches ${tmpl.name}, taking notes.`, session.pubkey);
  }

  private async cmdJournal(session: Session): Promise<void> {
    const journal = session.items.find((c) => c.journalId);
    if (!journal?.journalId) {
      const where = await this.whereIsJournal(session);
      return this.send(session, where === "stored"
        ? "Your journal's in the lockbox. Fetch it out to read or write in it."
        : "You carry no journal. The keeper sells them, fairly priced.");
    }
    const rows = await journalLoad(this.env.DB, journal.journalId);
    const world = this.world!;
    const entries = rows
      .map((r) => {
        const tmpl = world.mobTemplates.get(r.templateId);
        if (!tmpl) return null;
        const tier = this.journalTier(r.kills, r.studied);
        const e: any = { id: tmpl.id, name: tmpl.name, tier, kills: r.kills, studied: r.studied ? 1 : 0 };
        if (tier >= 1) { e.nature = this.creatureNature(tmpl.id); e.note = tmpl.description; }
        if (tier >= 3) {
          e.level = tmpl.level;
          e.hp = tmpl.max_hp;
          e.dmg = `${tmpl.dmg_min}–${tmpl.dmg_max}`;
          e.armor = tmpl.armor;
          e.boss = tmpl.is_boss ? 1 : 0;
          const loot = tmpl.loot_item ? world.itemTemplates.get(tmpl.loot_item) : null;
          if (loot) e.loot = loot.name;
        }
        return e;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.tier - a.tier) || a.name.localeCompare(b.name));
    try {
      session.ws.send(JSON.stringify({ v: 0, t: "journal", entries }));
    } catch {}
    this.send(session, entries.length
      ? "You open the journal."
      : "You open the journal. Its pages are blank — study a thing, and kill a few, and it will fill.");
  }

  // ---- extraction: the gate seals claims; the lockbox and vault keep them ----

  // The moment of relief: what you carried out, the dungeon marks as yours.
  // Sealed loot survives anything the dungeon does to you. (What another
  // wanderer does to you is not the dungeon's promise to keep.)
  private async cmdClaim(session: Session, arg: string): Promise<void> {
    const world = this.world!;
    if (!world.entryRooms.has(session.roomId)) {
      return this.send(session, "The dungeon seals claims only at a gate — where you could still walk away.");
    }
    let toSeal: CarriedItem[];
    if (!arg || arg === "all" || arg === "everything") {
      // Seal all gear-and-valuables; trophies and the like carry no title.
      toSeal = session.items.filter((c) => c.serial === null && !this.stackable(c.itemId, c.serial, c.journalId));
      if (toSeal.length === 0) return this.send(session, "You carry nothing the gate can seal.");
    } else {
      const carried = this.findCarried(session, arg);
      if (!carried) return this.send(session, "You carry nothing like that.");
      if (carried.serial !== null) {
        return this.send(session, `The seal is already on it. (mint #${carried.serial})`);
      }
      if (this.stackable(carried.itemId, carried.serial, carried.journalId)) {
        return this.send(session, "Trophies and the like carry no title — the gate's lockbox keeps them, no seal needed.");
      }
      toSeal = [carried];
    }

    const lines: string[] = [];
    for (const carried of toSeal) {
      const tmpl = world.itemTemplates.get(carried.itemId)!;
      const serial = await this.sealOne(session, carried);
      lines.push(`The gate's cold iron takes the measure of ${tmpl.name} — sealed. (mint #${serial})`);
    }
    lines.push("Sealed is TITLE, not armor: carried, it dies with you. Only the gate\u2019s lockbox and vault keep what death cannot.");
    this.send(session, lines.join("\n"));
    this.roomFeed(session.roomId, `${session.name} presses a claim at the gate. Iron hums.`, session.pubkey);
    this.sendCtx(session);
  }

  // Seal one carried item in place: mint its serial, sign the loot cert if the
  // game key is configured, and freeze its condition. Shared by `claim` and the
  // gatehouse bench. Returns the mint serial.
  private async sealOne(session: Session, carried: CarriedItem): Promise<number> {
    const world = this.world!;
    const tmpl = world.itemTemplates.get(carried.itemId)!;
    const serial = await mintClaim(this.env.DB, carried.rowId, carried.itemId, tmpl.rarity, session.pubkey);
    carried.serial = serial;
    // Freeze its condition at the moment of sealing — from here it never wears.
    if (this.isGear(carried.itemId)) await setItemCondition(this.env.DB, carried.rowId, carried.condition);
    if (isGameKeyConfigured(this.env)) {
      const ev = signLootEvent(this.env, {
        pubkey: session.pubkey,
        lootId: carried.rowId,
        itemId: carried.itemId,
        name: tmpl.name,
        rarity: tmpl.rarity,
        zone: world.zone,
        serial,
      });
      await setMintEvent(this.env.DB, serial, ev.id);
    }
    return serial;
  }

  // ---- the gatehouse bench: sort your pack out of the world's reach ----
  // You step out of sight (untouchable — no one and nothing can reach you),
  // and your pack, lockbox, and vault lie open together. One modal, all the
  // keeping, no clicking things one at a time under threat of a knife.

  private async handleBench(session: Session, frame: any): Promise<void> {
    const world = this.world!;
    const action = frame?.action;
    const atGate = world.entryRooms.has(session.roomId);
    if (action === "open") {
      if (this.inCombat(session)) {
        return this.send(session, "Not while something is trying to kill you.");
      }
      // The lockbox opens anywhere (you duck aside to sort your run closet); the
      // vault and the seal are the gate's business, shown only when you're at one.
      this.enterBench(session);
      return this.sendBench(session);
    }
    if (!session.away) return; // every other action needs the bench already open
    if (action === "close") return this.leaveBench(session);

    const row = typeof frame.row === "string" ? frame.row : "";
    const gateOnly = "That's the gatehouse's work — reach a gate for the vault and the seal.";
    let note: string | undefined;
    if (action === "stash") note = await this.benchStore(session, row, "lockbox");
    else if (action === "vault") note = atGate ? await this.benchStore(session, row, "vault") : gateOnly;
    else if (action === "seal") note = atGate ? await this.benchSeal(session, row) : gateOnly;
    else if (action === "take") note = await this.benchTake(session, row);
    else if (action === "equip") note = await this.benchEquip(session, row);
    else if (action === "remove") note = await this.benchRemove(session, row);
    else if (action === "burn") note = await this.benchBurn(session, row);
    else if (action === "salvage") note = atGate ? await this.benchSalvage(session, row) : gateOnly;
    else if (action === "repair") note = atGate ? await this.benchRepair(session, row) : gateOnly;
    else return;
    return this.sendBench(session, note);
  }

  // Manage what you're wearing/wielding, right from the bench (always safe here,
  // so none of combat's armor/opening rules apply).
  private async benchEquip(session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row);
    if (!carried) return "You aren't carrying that.";
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    if (tmpl.slot === "") return `You can't wear or wield ${tmpl.name}.`;
    if (carried.equipped) return undefined;
    const current = this.equippedItem(session, tmpl.slot);
    if (current) {
      current.carried.equipped = false;
      await setEquipped(this.env.DB, current.carried.rowId, false);
    }
    carried.equipped = true;
    await setEquipped(this.env.DB, carried.rowId, true);
    return undefined;
  }

  private async benchRemove(session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row);
    if (!carried) return "You aren't carrying that.";
    if (!carried.equipped) return undefined;
    carried.equipped = false;
    await setEquipped(this.env.DB, carried.rowId, false);
    return undefined;
  }

  // The vice and the hammer, from the modal. Pack items only (the box and the
  // vault hand things back to the pack first); the cores do the real checks.
  private async benchSalvage(session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row);
    if (!carried) return "You aren't carrying that.";
    return this.salvageCore(session, carried);
  }

  private async benchRepair(session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row);
    if (!carried) return "You aren't carrying that.";
    return this.repairCore(session, carried);
  }

  // Burn an unwanted thing — from pack, lockbox, or vault — gone for good. A
  // sealed thing's mint is voided as it burns (supply shrinks by one, honestly).
  private async benchBurn(session: Session, row: string): Promise<string | undefined> {
    const inPack = session.items.find((c) => c.rowId === row);
    let carried = inPack;
    if (!carried) {
      for (const key of ["lockbox", "vault"] as const) {
        const held = await loadContainer(this.env.DB, session.pubkey, key);
        const found = held.find((c) => c.rowId === row);
        if (found) { carried = found; break; }
      }
    }
    if (!carried) return "There's nothing like that to burn.";
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    await removeItemRow(this.env.DB, carried.rowId);
    if (carried.serial !== null) await voidMint(this.env.DB, carried.serial);
    if (inPack) session.items.splice(session.items.indexOf(inPack), 1);
    return `You burn ${tmpl.name}. Nothing of it is left.`;
  }

  // Truly out of the world — untouchable, unseen, beyond reach — only at a gate
  // with a modal open. A wanderer sorting a lockbox mid-dungeon has a modal open
  // (`away`, so the bench actions work) but is still crouched in the room, in
  // reach of everything standing there. `away` means "a modal is up"; THIS means
  // "safe." Keep the two apart. (Same gate condition as `sheltered` healing.)
  private outOfWorld(s: Session): boolean {
    return s.away && this.world!.entryRooms.has(s.roomId);
  }

  // The dogpile cap, shared across every blow-landing path in a tick: swings in
  // the fight AND creatures that storm in and get the jump. Returns true and
  // claims a slot if this player still has room to be hit this tick; false when
  // they're already fully pressed (the attacker keeps its target and waits).
  private canLandBlow(pubkey: string): boolean {
    const n = this.blowsThisTick.get(pubkey) ?? 0;
    if (n >= DOGPILE_CAP) return false;
    this.blowsThisTick.set(pubkey, n + 1);
    return true;
  }

  private enterBench(session: Session): void {
    session.away = true;
    session.resting = false;
    session.target = null;
    if (this.world!.entryRooms.has(session.roomId)) {
      // At a gate you step clean out of the world: nothing holds you, nothing sees you.
      for (const c of this.creatures.values()) {
        if (c.target === session.pubkey) c.target = null;
      }
      this.roomFeed(session.roomId, `${session.name} steps into the gatehouse, out of sight.`, session.pubkey);
    } else {
      // In the dungeon the lockbox rides with you, but you don't leave with it —
      // you crouch to sort it in the open, still in the world and in reach.
      this.roomFeed(session.roomId, `${session.name} crouches to dig through a lockbox.`, session.pubkey);
    }
    this.refreshRoomCtx(session.roomId);
  }

  private async leaveBench(session: Session): Promise<void> {
    session.away = false;
    try { session.ws.send(JSON.stringify({ v: 0, t: "bench", open: false })); } catch {}
    this.roomFeed(session.roomId, `${session.name} steps back out, kit sorted.`, session.pubkey);
    await this.provokeGrudges(session, false); // gates hold nothing; no free hit for closing the bench
    this.send(session, this.enterDescribe(session));
    this.sendCtx(session);
    this.refreshRoomCtx(session.roomId);
  }

  private async benchStore(session: Session, row: string, key: "lockbox" | "vault"): Promise<string | undefined> {
    const cfg = this.storeCfg(key);
    // The item may be in the pack, or in the OTHER store (moving straight from
    // the lockbox into the vault, no round-trip through the pack).
    let carried = session.items.find((c) => c.rowId === row);
    let fromContainer: "" | "lockbox" | "vault" = "";
    if (!carried) {
      for (const src of ["lockbox", "vault"] as const) {
        if (src === cfg.container) continue;
        const held = await loadContainer(this.env.DB, session.pubkey, src);
        const found = held.find((c) => c.rowId === row);
        if (found) { carried = found; fromContainer = src; break; }
      }
    }
    if (!carried) return "You aren't carrying that.";
    // The vault banks sealed wealth — and raw fungibles, which carry no title
    // to seal in the first place. It's unsealed GEAR the vault turns away.
    if (cfg.sealedOnly && carried.serial === null && !this.stackable(carried.itemId, carried.serial, carried.journalId)) return cfg.needSeal;
    const held = await loadContainer(this.env.DB, session.pubkey, cfg.container);
    if (!this.hasRoom(held, carried.itemId, cfg.cap)) return cfg.full;
    if (this.isGear(carried.itemId)) await setItemCondition(this.env.DB, carried.rowId, carried.condition);
    if (fromContainer === "") { // came off the body
      carried.equipped = false;
      session.items.splice(session.items.indexOf(carried), 1);
    }
    await setContainer(this.env.DB, carried.rowId, cfg.container);
    return undefined;
  }

  private async benchTake(session: Session, row: string): Promise<string | undefined> {
    const atGate = this.world!.entryRooms.has(session.roomId);
    for (const key of ["lockbox", "vault"] as const) {
      const held = await loadContainer(this.env.DB, session.pubkey, key);
      const entry = held.find((c) => c.rowId === row);
      if (entry) {
        if (key === "vault" && !atGate) return "The vault's door opens only at a gate.";
        if (!this.packRoom(session, entry.itemId)) return `Your pack is full (${PACK_CAP} slots).`;
        await setContainer(this.env.DB, entry.rowId, "");
        session.items.push(entry);
        return undefined;
      }
    }
    return "It isn't in the box or the vault.";
  }

  private async benchSeal(session: Session, row: string): Promise<string | undefined> {
    // Seal what's on the body, or seal a piece resting in the lockbox in place —
    // the gate's iron reaches into the box. (Vault gear is already sealed.)
    let carried = session.items.find((c) => c.rowId === row);
    if (!carried) {
      const box = await loadContainer(this.env.DB, session.pubkey, "lockbox");
      carried = box.find((c) => c.rowId === row);
    }
    if (!carried) return "You aren't carrying that.";
    if (carried.serial !== null) return "The seal is already on it.";
    if (this.stackable(carried.itemId, carried.serial, carried.journalId)) {
      return "Trophies and the like carry no title — the gate's lockbox keeps them, no seal needed.";
    }
    await this.sealOne(session, carried);
    return undefined;
  }

  private async sendBench(session: Session, note?: string): Promise<void> {
    const world = this.world!;
    const lockbox = await loadContainer(this.env.DB, session.pubkey, "lockbox");
    const vault = await loadContainer(this.env.DB, session.pubkey, "vault");
    const ser = (c: CarriedItem) => {
      const t = world.itemTemplates.get(c.itemId);
      const gear = this.isGear(c.itemId);
      return {
        row: c.rowId,
        name: t ? t.name : c.itemId,
        rarity: t?.rarity ?? "common",
        slot: t?.slot ?? "",
        sealed: c.serial !== null,
        serial: c.serial,
        stack: this.stackable(c.itemId, c.serial, c.journalId),
        gear,
        equipped: !!c.equipped,
        cond: gear ? c.condition : null,
        condWord: gear ? (this.conditionWord(c.condition) || "sound") : "",
        stat: this.itemStat(t).replace(/^ \(|\)$/g, ""),
      };
    };
    // Fungibles collapse to one entry with a count and the full list of rows —
    // the client shows "×N" and fans a stack action out over every row. The
    // grouped length IS the slot count (one per stack, one per loose item).
    const group = (items: CarriedItem[]) => {
      const out: any[] = [];
      const at = new Map<string, number>();
      for (const c of items) {
        if (this.stackable(c.itemId, c.serial, c.journalId) && at.has(c.itemId)) {
          const e = out[at.get(c.itemId)!]; e.n++; e.rows.push(c.rowId); continue;
        }
        const e = ser(c) as any; e.n = 1; e.rows = [c.rowId];
        if (this.stackable(c.itemId, c.serial, c.journalId)) at.set(c.itemId, out.length);
        out.push(e);
      }
      return out;
    };
    const payload = {
      v: 0, t: "bench", open: true, note: note ?? "",
      atGate: world.entryRooms.has(session.roomId), // vault + seal only shown at a gate
      pack: group(session.items),
      lockbox: group(lockbox),
      vault: group(vault),
      packCap: PACK_CAP, lockboxCap: LOCKBOX_CAP, vaultCap: VAULT_CAP,
    };
    try { session.ws.send(JSON.stringify(payload)); } catch {}
  }

  // Two tiers of keeping, one engine. The lockbox is the run closet (8 slots,
  // takes anything, sealed or raw); the vault is the bank (50 slots, sealed
  // gear plus raw fungibles — everything but unsealed gear). Both live at the
  // gate, both are beyond death's reach.
  private storeCfg(key: "lockbox" | "vault") {
    if (key === "vault") {
      return {
        container: "vault", cap: VAULT_CAP, sealedOnly: true, kind: "vault",
        absent: "The vault's riveted door is set deep in the gatehouse. It is not here.",
        empty: "The vault stands open around nothing.",
        header: "The vault holds",
        full: `The vault is full. It holds ${VAULT_CAP} things, and asks no more.`,
        needSeal: "The vault won't bank raw gear — seal it at the gate first, or drop it in your lockbox.",
        put: (n: string) => `You lay ${n} in the vault. The iron door swings shut over it.`,
        feed: "swings the vault door, and seals it again.",
        takeEmpty: "Draw what out? ('vault' alone shows what it holds.)",
        holdsNot: "The vault holds nothing like that.",
        take: (n: string) => `You draw ${n} from the vault. It rides with you now — and so do its risks.`,
      };
    }
    return {
      container: "lockbox", cap: LOCKBOX_CAP, sealedOnly: false, kind: "lockbox",
      absent: "Your lockbox is set into the gatehouse wall. It is not here.",
      empty: "Your lockbox is bolted shut around nothing.",
      header: "Your lockbox holds",
      full: `Your lockbox is full. It holds ${LOCKBOX_CAP} things and holds them well. (The vault takes more, if it's sealed.)`,
      needSeal: "",
      put: (n: string) => `You drop ${n} in the iron box, and it clicks shut. Whatever happens to you, this is beyond it.`,
      feed: "opens an iron lockbox, and closes it.",
      takeEmpty: "Take what out? ('stash' alone shows the box.)",
      holdsNot: "The box holds nothing like that.",
      take: (n: string) => `You take ${n} back from the box. It rides with you now — and so do its risks.`,
    };
  }

  private async cmdStore(session: Session, arg: string, key: "lockbox" | "vault"): Promise<void> {
    const world = this.world!;
    const cfg = this.storeCfg(key);
    // The lockbox rides with you — reach it anywhere. The vault is the bank, bolted
    // into the gatehouse; you can only deposit there at a gate.
    if (key === "vault" && !world.entryRooms.has(session.roomId)) return this.send(session, cfg.absent);
    const held = await loadContainer(this.env.DB, session.pubkey, cfg.container);
    if (!arg) {
      if (held.length === 0) return this.send(session, cfg.empty);
      // Match the bench modal: fungibles collapse to one line with a count, and
      // the header counts SLOTS (what the cap is actually measured in), not rows.
      const lines = [`${cfg.header} (${this.slotsUsed(held)}/${cfg.cap}):`];
      const counts = new Map<string, number>();
      for (const c of held) {
        if (this.stackable(c.itemId, c.serial, c.journalId)) counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + 1);
      }
      for (const [id, n] of counts) {
        const t = world.itemTemplates.get(id);
        lines.push(`  ${t ? t.name : id}${n > 1 ? ` (x${n})` : ""}${this.itemStat(t)}`);
      }
      for (const c of held) {
        if (this.stackable(c.itemId, c.serial, c.journalId)) continue; // stacked above
        const t = world.itemTemplates.get(c.itemId);
        const tag = c.serial !== null
          ? ` — sealed #${c.serial}`
          : (t && t.slot !== "" ? ` — ${this.conditionWord(c.condition) || "sound"}` : "");
        lines.push(`  ${t ? t.name : c.itemId}${this.itemStat(t)}${tag}`);
      }
      return this.send(session, lines.join("\n"));
    }
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    // Sealed wealth or raw fungibles bank in the vault; only unsealed gear is turned away.
    if (cfg.sealedOnly && carried.serial === null && !this.stackable(carried.itemId, carried.serial, carried.journalId)) return this.send(session, cfg.needSeal);
    if (!this.hasRoom(held, carried.itemId, cfg.cap)) return this.send(session, cfg.full);
    const tmpl = world.itemTemplates.get(carried.itemId)!;
    // Flush its worn condition before it leaves the body, so the box/vault
    // holds the true value; setContainer clears the equipped flag.
    if (this.isGear(carried.itemId)) await setItemCondition(this.env.DB, carried.rowId, carried.condition);
    carried.equipped = false;
    session.items.splice(session.items.indexOf(carried), 1);
    await setContainer(this.env.DB, carried.rowId, cfg.container);
    this.send(session, cfg.put(tmpl.name));
    this.roomFeed(session.roomId, `${session.name} ${cfg.feed}`, session.pubkey);
    this.sendCtx(session);
  }

  private async cmdRetrieve(session: Session, arg: string, key: "lockbox" | "vault"): Promise<void> {
    const world = this.world!;
    const cfg = this.storeCfg(key);
    if (key === "vault" && !world.entryRooms.has(session.roomId)) return this.send(session, cfg.absent);
    const held = await loadContainer(this.env.DB, session.pubkey, cfg.container);
    if (held.length === 0) return this.send(session, cfg.empty);
    if (!arg) return this.send(session, cfg.takeEmpty);
    const entry = held.find((c) => {
      const t = world.itemTemplates.get(c.itemId);
      return t ? nameMatches(t.name, arg) : false;
    });
    if (!entry) return this.send(session, cfg.holdsNot);
    const tmpl = world.itemTemplates.get(entry.itemId)!;
    if (!this.packRoom(session, entry.itemId)) return this.send(session, `Your pack is full (${PACK_CAP} slots). Make room first.`);
    await setContainer(this.env.DB, entry.rowId, "");
    session.items.push(entry);
    this.send(session, cfg.take(tmpl.name));
    this.sendCtx(session);
  }

  // Nothing is ever published unless the player asks (NIP.md: certificates,
  // not broadcasts). The dungeon signs; the wanderer decides who sees.
  private async cmdPublish(session: Session, arg: string): Promise<void> {
    if (!isGameKeyConfigured(this.env)) {
      return this.send(session, "The dungeon has not yet found its voice. (no signing key configured)");
    }
    if (relayList(this.env).length === 0) {
      return this.send(session, "The dungeon's voice does not reach beyond these walls yet. (no relays configured)");
    }
    if (!arg) {
      return this.send(session, "Publish what? 'publish sheet' for who you are, 'publish <sealed item>' for what you own.");
    }
    const world = this.world!;
    if (arg === "sheet" || arg === "me" || arg === "self") {
      const ev = signSheetEvent(this.env, {
        pubkey: session.pubkey,
        name: session.name,
        hp: session.hp,
        maxHp: session.maxHp,
        zone: world.zone,
        born: session.born,
        kills: session.kills,
        deaths: session.deaths,
        bossKills: session.bossKills,
        pvpKills: session.pvpKills,
      });
      this.state.waitUntil(publishEvent(this.env, ev));
      return this.send(
        session,
        `The dungeon speaks your name beyond the walls: ${session.name}, as you stand. (event ${ev.id.slice(0, 16)}…)`,
      );
    }
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    if (carried.serial === null) {
      return this.send(session, "The dungeon only proclaims what it has sealed. Claim it at the gate first.");
    }
    const tmpl = world.itemTemplates.get(carried.itemId)!;
    const ev = signLootEvent(this.env, {
      pubkey: session.pubkey,
      lootId: carried.rowId,
      itemId: carried.itemId,
      name: tmpl.name,
      rarity: tmpl.rarity,
      zone: world.zone,
      serial: carried.serial,
    });
    this.state.waitUntil(publishEvent(this.env, ev));
    this.send(
      session,
      `The dungeon proclaims your claim on ${tmpl.name}, mint #${carried.serial}. (event ${ev.id.slice(0, 16)}…)`,
    );
  }

  // ---- the tick (only while someone is watching) ----

  async alarm(): Promise<void> {
    // A cold start with a pending alarm rebuilds the world first.
    if (!this.world) await this.init("door");
    const world = this.world!;
    const now = Date.now();

    // Blows land on the combat heartbeat, not every tick — so a fight reads at
    // a human pace. Off-beat ticks still run everything else (regen, movement,
    // aggro drift, atmosphere); only the exchange of swings waits for the beat.
    const combatRound = now - this.lastCombatRound >= COMBAT_ROUND_MS;
    if (combatRound) this.lastCombatRound = now;
    // Fresh dogpile budget each tick: no player takes more than DOGPILE_CAP blows
    // in one tick, whether from swings in the fight or creatures storming the room.
    this.blowsThisTick.clear();

    // Players swing first — the living get initiative. You FOCUS one foe and
    // turn to the next the moment it falls (or the moment something new is on
    // you) — never idle, but a swarm trades several-for-one against you: they
    // all hit back, you answer one at a time. Gear bends the rule: fast steel
    // swings more than once a round, and sweeping steel drags through a crowd.
    if (combatRound) for (const session of this.sessions.values()) {
      const foes: Creature[] = [];
      for (const c of this.creatures.values()) {
        if (c.roomId !== session.roomId) continue;
        if (c.id === session.target || c.target === session.pubkey) foes.push(c);
      }
      if (foes.length === 0) {
        if (session.target) session.target = null;
        continue;
      }
      const atkMult = STANCE[session.stance].atk;
      const alive = (c: Creature) => this.creatures.has(c.id);
      let primary = foes.find((c) => c.id === session.target && alive(c)) ?? foes.find(alive);
      const speed = Math.max(1, this.equippedItem(session, "weapon")?.tmpl.speed ?? 1);

      for (let swing = 0; swing < speed && primary; swing++) {
        // Re-fetch each swing: a fumble can fling the blade mid-round, and a
        // blade can wear through mid-arc. The rest of the round is bare-handed.
        const weapon = this.equippedItem(session, "weapon");
        const sweepN = Math.max(1, weapon?.tmpl.sweep ?? 1);
        const targets = [primary, ...foes.filter((c) => c !== primary && alive(c)).slice(0, sweepN - 1)];

        // Wounds are felt: below a third of your blood, your hands shake
        // (more fumbles) and your blows soften.
        const hurt = session.hp < session.maxHp * WOUNDED_FRACTION;
        if (chance(FUMBLE_CHANCE + (hurt ? WOUNDED_FUMBLE_BONUS : 0))) {
          await this.playerFumble(session, weapon); // the whole arc goes wide
        } else {
          for (const creature of targets) {
            if (!alive(creature)) continue;
            const tmpl = world.mobTemplates.get(creature.templateId)!;
            if (!creature.target) creature.target = session.pubkey;
            this.addGrudge(creature, session.pubkey);
            let dmg = Math.round((randInt(PLAYER_DMG_MIN, PLAYER_DMG_MAX) + (weapon ? this.effDmg(weapon) : 0)) * atkMult);
            if (hurt) dmg = Math.round(dmg * WOUNDED_DMG_MULT);
            let flourish = ".";
            if (chance(CRIT_CHANCE)) {
              dmg *= 2;
              flourish = pick(CRIT_FLOURISH);
            }
            // Their hide or plate turns what it can; a blow always bites.
            dmg = Math.max(1, dmg - tmpl.armor);
            creature.hp -= dmg;
            if (creature.hp > 0) {
              this.send(session, `${this.playerHit(weapon, tmpl.name)} for ${dmg}${flourish} (${this.condition(creature)})`, flourish === "." ? "dmgout" : "dmgout big");
              // A blunt blow can ring it senseless — it loses its next swing.
              // The boss never reels, and a thing already reeling can't be
              // stun-chained deeper (one hit, one lost beat).
              if (weapon && weapon.tmpl.stun > 0 && !tmpl.is_boss && !creature.stunned && chance(weapon.tmpl.stun)) {
                creature.stunned = true;
                this.send(session, `${cap(tmpl.name)} reels, stunned.`, "stun");
              }
              // A fast, cutting edge opens a wound that keeps weeping — damage
              // over time that no armor turns. Fresh hits keep it open.
              if (weapon && weapon.tmpl.bleed > 0) {
                creature.bleedTicks = BLEED_TICKS;
                creature.bleedDmg = Math.max(creature.bleedDmg ?? 0, weapon.tmpl.bleed);
              }
              this.combatNoise(session.roomId);
              if (tmpl.is_boss) this.bossPhase(creature, tmpl, session);
            } else {
              await this.onCreatureDeath(session, creature, tmpl);
            }
            // Every landed strike grinds the blade (a sweep grinds it per
            // foe) — and bone or old iron grinds it far faster than flesh.
            if (weapon) {
              await this.wear(session, weapon.carried, weapon.tmpl, HOLLOW.has(tmpl.id) ? WEAPON_WEAR_HOLLOW : WEAPON_WEAR);
              if (!this.equippedItem(session, "weapon")) break; // wore through mid-arc
            }
          }
        }
        // Auto-advance: the moment your foe falls, you turn on the next.
        if (!alive(primary)) primary = foes.find(alive);
        session.target = primary ? primary.id : null;
      }
      if (session.target && !this.creatures.has(session.target)) {
        const left = foes.find(alive);
        session.target = left ? left.id : null;
      }
    }

    // A seized player works free over time (and is freed the moment the thing
    // holding them is gone) — runs before the creatures swing, so the grip is a
    // tense beat, never a lock.
    if (combatRound) for (const s of this.sessions.values()) {
      if (!s.seizedBy) continue;
      const grip = this.creatures.get(s.seizedBy);
      if (!grip || grip.roomId !== s.roomId) { s.seizedBy = undefined; continue; }
      if (chance(SEIZE_BREAK_ODDS)) { s.seizedBy = undefined; this.send(s, "You tear loose of its grip."); }
    }

    // Creatures act: flee if badly hurt, otherwise fight back. Only so many can
    // reach one player in a tick (DOGPILE_CAP) — the rest press at the edges and
    // wait their turn, so a crowd is deadly but never an instant, unwinnable
    // grind. The blow budget is `canLandBlow` (shared with entry strikes this
    // tick); `heldBack` remembers whose victims felt the crush, for a line after.
    const heldBack = new Set<string>();
    if (combatRound) for (const creature of this.creatures.values()) {
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      // Rung senseless by a blunt blow: it loses this whole action, then clears.
      if (creature.stunned) {
        creature.stunned = false;
        const watcher = [...this.sessions.values()].find(
          (s) => s.roomId === creature.roomId && (s.target === creature.id || creature.target === s.pubkey),
        );
        if (watcher) this.send(watcher, `${cap(tmpl.name)} shakes off the daze.`);
        continue;
      }
      // A dire-hyena guarding a meal turns on anyone standing in the room with
      // it — whether they walked in or the meal came to them (it went bold, or
      // a corpse fell here). No grudge required; proximity to its kill is enough.
      if (!creature.target && this.hyenaGuardsMeal(creature)) {
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && !this.outOfWorld(s));
        if (prey) {
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `${cap(tmpl.name)} lifts its bloodied muzzle and fixes on you.`);
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} turns from its kill to ${prey.name}.`, prey.pubkey);
        }
      }
      // A drowned thing takes anyone who wades into its water — no grudge needed.
      if (!creature.target && DROWNERS.has(creature.templateId)) {
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && !this.outOfWorld(s));
        if (prey) {
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `The water heaves — ${tmpl.name} turns toward you.`);
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} turns toward ${prey.name}.`, prey.pubkey);
        }
      }
      if (creature.target) {
        const victim = this.sessions.get(creature.target);
        if (!victim || this.outOfWorld(victim) || victim.roomId !== creature.roomId) {
          creature.target = null;
          continue;
        }
        // Keep a valid primary target for the UI: an attacker draws your focus
        // if you had none. (You already swing at every foe on you in the players'
        // phase — this is just bookkeeping, so it's silent.)
        if (!victim.target || !this.creatures.has(victim.target)) {
          victim.target = creature.id;
        }
        // A runner bolts the instant it has the initiative — every time, at any
        // health. You already swung this tick (the living go first), so your
        // blow lands as it breaks for the door; then it's gone and you give
        // chase. Brooders are the opposite: they never leave the nest.
        const wantsFlee = RUNNERS.has(tmpl.id)
          || (!tmpl.is_boss && !BROODERS.has(tmpl.id) && !DROWNERS.has(tmpl.id) && creature.hp < tmpl.max_hp * FLEE_BELOW && chance(FLEE_CHANCE));
        if (wantsFlee && !tmpl.is_boss && !this.scavengerBold(creature)) {
          await this.creatureMoves(creature, now, "flee", false);
          continue;
        }
        // The dogpile cap: if this player already has a full press on them this
        // tick, this one can't get a blow in — it snarls at the edge and waits.
        // (It keeps its target, so it steps up the moment a slot opens.)
        if (!this.canLandBlow(victim.pubkey)) { heldBack.add(victim.pubkey); continue; }
        // Quick feet: carrying no worn weight adds to the foe's miss chance.
        // And a wounded creature fights diminished — shakier, softer blows.
        const quick = this.wornWeight(victim) === 0;
        const cHurt = creature.hp < tmpl.max_hp * WOUNDED_FRACTION;
        if (chance(FUMBLE_CHANCE + (quick ? DODGE_LIGHT : 0) + (cHurt ? WOUNDED_FUMBLE_BONUS : 0))) {
          this.send(victim, quick
            ? pick([
                `${cap(tmpl.name)} lunges — you slip aside, nothing weighing you down.`,
                `${cap(tmpl.name)} comes at you and you sway clear of it, light on your feet.`,
                `${cap(tmpl.name)} strikes where you were — you're already gone.`,
              ])
            : pick([
                `${cap(tmpl.name)} lunges past you and crashes against the stone.`,
                `${cap(tmpl.name)} swings wide and its blow finds only wall.`,
                `${cap(tmpl.name)} overreaches, and the stroke goes past you.`,
              ]), "dodge");
          this.combatNoise(victim.roomId);
          continue;
        }
        // A shield can catch the blow whole — and unlike footwork, it holds up
        // even under a full load of plate (block is the heavy build's evasion).
        if (chance(this.equippedBlock(victim))) {
          const shield = this.equippedItem(victim, "shield");
          const sh = shield?.tmpl.name ?? "your shield";
          this.send(victim, pick([
            `You catch it on ${sh}.`,
            `You take the blow on ${sh}; it jars up your arm and holds.`,
            `${sh} turns the stroke aside.`,
            `You get ${sh} up in time — the blow rings off it.`,
          ]), "block");
          if (shield) await this.wear(victim, shield.carried, shield.tmpl, ARMOR_WEAR);
          this.combatNoise(victim.roomId);
          continue;
        }
        let dmg = randInt(tmpl.dmg_min, tmpl.dmg_max) + (tmpl.is_boss ? (creature.phase ?? 0) * 3 : 0);
        if (this.scavengerBold(creature)) dmg = Math.round(dmg * BOLD_DMG_MULT);
        // A drowned thing that already has hold of you drags harder.
        if (victim.seizedBy === creature.id) dmg = Math.round(dmg * SEIZE_DMG_MULT);
        if (cHurt) dmg = Math.max(1, Math.round(dmg * WOUNDED_DMG_MULT));
        let flourish = ".";
        if (chance(CRIT_CHANCE)) {
          dmg *= 2;
          flourish = pick(CRIT_FLOURISH);
        }
        if (victim.staggered) {
          dmg += STAGGER_BONUS;
          victim.staggered = false;
          flourish = ", catching you off balance" + (flourish === "." ? "." : flourish);
        }
        // Worn armor thins the blow — but never closes it; a hit always bites.
        // Then your stance: guarded soaks more, reckless leaves you open.
        const worn = this.equippedItem(victim, "armor");
        dmg = Math.max(1, dmg - this.equippedArmor(victim));
        dmg = Math.max(1, Math.round(dmg * STANCE[victim.stance].def));
        victim.hp -= dmg;
        if (victim.resting) {
          victim.resting = false;
          this.send(victim, "You are dragged from your rest.");
        }
        if (victim.hp > 0) {
          this.send(victim, `${cap(tmpl.name)} ${this.creatureHit(tmpl.id)} for ${dmg}${flourish} [${victim.hp}/${victim.maxHp} hp]`, flourish === "." ? "dmgin" : "dmgin big");
          this.sendStatus(victim);
          this.combatNoise(victim.roomId);
          // A drowned thing that lands a blow can take hold — you're seized,
          // can't flee, and it drags harder until you wrench free or kill it.
          if (DROWNERS.has(creature.templateId) && !victim.seizedBy && chance(SEIZE_ODDS)) {
            victim.seizedBy = creature.id;
            this.send(victim, `${cap(tmpl.name)} closes cold arms around you — you're held fast. (break free: keep fighting, or it drags you under)`, "seize");
          }
          // Eating a blow thins the mail a hair (provisional gear only).
          if (worn) await this.wear(victim, worn.carried, worn.tmpl, ARMOR_WEAR);
          // A cutpurse doesn't fight to win — it fights to grab. One good hit,
          // one unsealed thing off your back (it goes for the richest), and gone.
          // Sealed loot is TITLE the dungeon marked as yours; its fingers slide off.
          if (THIEVES.has(creature.templateId) && !creature.stole) {
            const loot = victim.items
              .filter((c) => c.serial === null && !c.equipped)
              .sort((a, b) => (RARITY_RANK[world.itemTemplates.get(b.itemId)?.rarity ?? "common"] ?? 0)
                - (RARITY_RANK[world.itemTemplates.get(a.itemId)?.rarity ?? "common"] ?? 0))[0];
            if (loot) {
              const it = world.itemTemplates.get(loot.itemId)!;
              victim.items.splice(victim.items.indexOf(loot), 1);
              await removeItemRow(this.env.DB, loot.rowId);
              creature.stole = loot.itemId;
              this.send(victim, `${cap(tmpl.name)} snatches ${it.name} and bolts! (kill it to get it back)`);
              this.roomFeed(victim.roomId, `${cap(tmpl.name)} tears something from ${victim.name} and flees!`, victim.pubkey);
              this.sendCtx(victim);
              await this.creatureMoves(creature, now, "flee", false);
              continue;
            }
          }
        } else {
          await this.onPlayerDeath(victim, tmpl);
        }
      }
    }
    // Surrounded but shielded by the crush: a single line so the player reads
    // why not everything lands, without spamming it every tick.
    for (const pk of heldBack) {
      const v = this.sessions.get(pk);
      if (v && v.hp > 0 && chance(0.25)) this.send(v, "The press around you is too thick — only so many can reach you at once.");
    }

    // Auto-eat: the blows have landed for this tick — anyone still on their feet
    // but bled below the line grabs a bite from the pack without being told to,
    // if there's food to grab. A reflex, not a turn: it doesn't leave an opening.
    for (const session of this.sessions.values()) {
      if (session.hp <= 0 || session.hp >= session.maxHp * AUTO_EAT_FRACTION) continue;
      if (!this.inCombat(session)) continue;
      const food = this.carriedFood(session)[0];
      if (!food) continue;
      const { before, tmpl } = await this.consumeFood(session, food);
      this.send(session, session.hp > before
        ? `Your hand goes to the pack on its own — you tear into ${tmpl.name}. [${session.hp}/${session.maxHp} hp]`
        : `Your hand goes to the pack on its own — you tear into ${tmpl.name}.`, "gain");
      this.roomFeed(session.roomId, `${session.name} snatches a bite mid-fight.`, session.pubkey);
      this.sendStatus(session);
      this.sendCtx(session);
      await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
    }

    // Bodies and appetites, at tick resolution.
    const tickMins = TICK_MS / 60_000;
    for (const creature of this.creatures.values()) {
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      // A fresh wound weeps: armor-ignoring damage each tick until it clots. It
      // wears a thing down but never lands the kill — your own strike does that.
      if (combatRound && creature.bleedTicks && creature.bleedTicks > 0) {
        creature.bleedTicks -= 1;
        const bd = creature.bleedDmg ?? 1;
        creature.hp = Math.max(1, creature.hp - bd);
        if (creature.bleedTicks <= 0) { creature.bleedTicks = 0; creature.bleedDmg = 0; }
        const watcher = [...this.sessions.values()].find(
          (s) => s.roomId === creature.roomId && (s.target === creature.id || creature.target === s.pubkey),
        );
        if (watcher) this.send(watcher, `${cap(tmpl.name)} bleeds — ${bd}. (${this.condition(creature)})`);
      }
      if (!HOLLOW.has(creature.templateId)) {
        creature.hunger = Math.min(HUNGER_MAX, creature.hunger + HUNGER_PER_MIN * tickMins);
      }
      // Time wears grudges away, each kind at its own pace (the boss never lets go).
      if (creature.grudges.length && !tmpl.is_boss) {
        const ms = this.forgetMs(tmpl);
        creature.grudges = creature.grudges.filter((g) => now - g.at < ms);
      }
      if (!creature.target) {
        // A still-bleeding thing doesn't knit up; the wound has to clot first.
        if (!creature.bleedTicks) creature.hp = Math.min(tmpl.max_hp, creature.hp + CREATURE_HEAL_PER_MIN * tickMins);
        if (creature.hp >= tmpl.max_hp) creature.phase = 0; // whole again, seated again
        // A scavenger standing on the dead eats first of all — and drags off
        // any gear left lying where a body fell.
        if (SCAVENGERS.has(creature.templateId)) { this.scavengerFeeds(creature, false); this.scavengerScoops(creature); }
        // A brood-mother swells the nest while she's left alone.
        if (BROODERS.has(creature.templateId)) this.broodBirths(creature, now);
        if (creature.hunger >= HUNGRY_AT) this.creatureEatsHere(creature, false);
        if (RUNNERS.has(creature.templateId) && this.playerPresent(creature.roomId)) {
          // Never settles while there's someone to run from — it keeps moving,
          // room to room, and you only land a blow the tick you have it cornered.
          await this.creatureMoves(creature, now, "wander", false);
        } else if (creature.nextWanderAt <= now && !tmpl.is_boss && !BROODERS.has(creature.templateId) && !DROWNERS.has(creature.templateId)) {
          await this.creatureMoves(creature, now, "wander", false);
        }
      }
    }

    // The damp works on carried steel: provisional weapons and armor rust a
    // hair each tick (very slowly). Sealed gear is held out of the dungeon's
    // reach. Iterate a copy — a piece can rust through and splice itself out.
    for (const session of this.sessions.values()) {
      for (const c of [...session.items]) {
        if (c.serial !== null) continue; // sealed: frozen whole
        const t = world.itemTemplates.get(c.itemId);
        if (!t || (t.slot !== "weapon" && t.slot !== "armor")) continue;
        await this.wear(session, c, t, RUST_PER_TICK);
      }
    }

    // Players heal only on purpose: resting, or sheltered in a gatehouse
    // (bench or hatch open AT a gate — out of the world, mending). Ducking
    // aside mid-dungeon with the lockbox is hiding, not healing.
    for (const session of this.sessions.values()) {
      const sheltered = session.away && world.entryRooms.has(session.roomId);
      if ((session.resting || sheltered) && !this.inCombat(session) && session.hp < session.maxHp) {
        session.hp = Math.min(session.maxHp, session.hp + REST_REGEN_PER_TICK);
        this.sendStatus(session);
        if (session.hp >= session.maxHp) {
          if (session.resting) {
            session.resting = false;
            this.send(session, "You feel whole again, and rise.");
          } else {
            this.send(session, "In the gatehouse quiet, your wounds close. You are whole.");
          }
        }
      }
    }

    // The dungeon breathes: an idle wanderer catches a line of atmosphere now
    // and then, drawn from where they stand. Never in a fight, never at the
    // bench, and never faster than the cooldown — quiet, not chatter.
    for (const session of this.sessions.values()) {
      if (session.away || this.inCombat(session)) continue;
      if (now - session.lastAmbientAt < AMBIENT_COOLDOWN_MS) continue;
      if (!chance(AMBIENT_ODDS)) continue;
      const line = this.ambientLine(session.roomId);
      if (!line) continue;
      session.lastAmbientAt = now;
      this.send(session, line);
    }

    this.applyRot(now, false);
    this.applyRegrow(now, false);
    this.applyArrivals(now, false);
    this.scheduleArrivals(now);
    this.pruneTraces(now);
    this.syncCombatCtx();

    await this.persist();
    await this.ensureAlarm();
  }

  // One atmosphere line for where you stand: a signature room's own pool if it
  // has one, else the region it belongs to (the gates, the flooded deep, or the
  // ring between). Meant to grow — add lines to AMBIENCE / ROOM_AMBIENCE freely.
  private ambientLine(roomId: string): string | null {
    const own = ROOM_AMBIENCE[roomId];
    if (own?.length) return own[randInt(0, own.length - 1)];
    const region = this.world!.entryRooms.has(roomId) ? "gate" : DEEP_ROOMS.has(roomId) ? "deep" : "upper";
    const pool = AMBIENCE[region];
    return pool.length ? pool[randInt(0, pool.length - 1)] : null;
  }

  // ---- creature behavior (shared by live tick and catch-up) ----

  // How long this creature holds a grudge. The boss never forgets.
  private forgetMs(tmpl: MobTemplate): number {
    return tmpl.is_boss ? Infinity : (FORGET_MS[tmpl.id] ?? FORGET_DEFAULT);
  }

  // Does it still remember (and still hate) this pubkey? Expired grudges don't
  // count even if they haven't been pruned from the array yet.
  private remembers(creature: Creature, pubkey: string, now: number): boolean {
    const ms = this.forgetMs(this.world!.mobTemplates.get(creature.templateId)!);
    return creature.grudges.some((g) => g.pk === pubkey && now - g.at < ms);
  }

  private addGrudge(creature: Creature, pubkey: string): void {
    const now = Date.now();
    const existing = creature.grudges.find((g) => g.pk === pubkey);
    if (existing) { existing.at = now; return; } // fresh blood renews the memory
    creature.grudges.push({ pk: pubkey, at: now });
    if (creature.grudges.length > GRUDGE_MAX) creature.grudges.shift();
  }

  // Sound wakes the blind sentinels. A dormant listener (a skeleton) in the
  // room may catch your movement or your noise and lurch into a swing — one
  // first strike, like being jumped. Grudge-holders are skipped (they wake on
  // their own); a still, silent wanderer rolls nothing and is walked right past.
  // Returns true if one woke (so a caller mid-exit can check for a killing blow).
  private async wakeListeners(session: Session, roomId: string, odds: number, tell: string): Promise<boolean> {
    if (session.away) return false;
    const now = Date.now();
    for (const c of this.creatures.values()) {
      if (c.roomId !== roomId || c.target) continue;
      const lurker = LURKERS.has(c.templateId);
      if (!LISTENERS.has(c.templateId) && !lurker) continue;
      if (this.remembers(c, session.pubkey, now)) continue;
      if (!chance(odds)) continue;
      const tmpl = this.world!.mobTemplates.get(c.templateId)!;
      c.target = session.pubkey;
      c.hidden = false; // a lurker that strikes is unseen no longer
      if (!session.target) session.target = c.id;
      this.send(session, lurker ? `${cap(tmpl.name)} drops out of the dark and is on you!` : `${cap(tmpl.name)} ${tell}`);
      this.roomFeed(roomId, `${cap(tmpl.name)} ${lurker ? "uncoils from the dark" : "lurches awake"}.`, session.pubkey);
      await this.creatureFirstStrike(c, tmpl, session);
      return true;
    }
    return false;
  }

  // A player walks in (or connects): anything here that remembers them attacks.
  // `ambush` = the player just stepped into this room (their choice, their
  // exposure), so a grudge-holder gets the first strike. On a reconnect
  // (blinking back into being) it's false — no free hit for the reconnection.
  private async provokeGrudges(session: Session, ambush: boolean): Promise<void> {
    if (this.outOfWorld(session)) return; // out of the world at a gate — nothing can mark you
    const now = Date.now();
    let struck = false;
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== session.roomId || creature.target) continue;
      const remembers = this.remembers(creature, session.pubkey, now);
      const guards = this.hyenaGuardsMeal(creature);
      if (!remembers && !guards) continue;
      const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
      creature.target = session.pubkey;
      if (!session.target) session.target = creature.id;
      this.send(session, remembers
        ? `${cap(tmpl.name)} remembers you — and comes for you.`
        : `${cap(tmpl.name)} snarls over its kill — you came too close, and now you're prey.`);
      this.roomFeed(session.roomId, `${cap(tmpl.name)} goes for ${session.name}.`, session.pubkey);
      // The first one to reach you gets the jump; the rest merely engage.
      if (ambush && !struck) {
        struck = true;
        await this.creatureFirstStrike(creature, tmpl, session);
        if (session.hp <= 0) return; // felled by the ambush — already moved to a gate
      }
    }
  }

  // Move one room: wandering or fleeing. Creatures can't open locked doors,
  // but walk through any door the players have left open. Wandering picks,
  // in order: a noise worth investigating, a room that smells of food, the
  // next stop on a patrol route, or wherever.
  private async creatureMoves(creature: Creature, now: number, mode: "wander" | "flee", silent: boolean): Promise<void> {
    const world = this.world!;
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    let exits = (world.exits.get(creature.roomId) ?? []).filter(
      (e) => !e.key_item || this.openDoors.has(`${creature.roomId}:${e.dir}`),
    );
    // Hideaways — a crack in the wall — let nothing in, not even the King. A
    // fled foe who folds into one is out of reach until they step back out.
    if (world.safeRooms.size) {
      const open = exits.filter((e) => !world.safeRooms.has(e.to_room));
      if (open.length) exits = open; // never strand (creatures are never inside one)
    }
    // Every gate is the dungeon's threshold — cold air and the way out. No
    // ordinary creature holds a doorway, so a respawn is never spawn-camped
    // where it appears. (The boss may go anywhere; it fears nothing.)
    if (!tmpl.is_boss) {
      const inner = exits.filter((e) => !world.entryRooms.has(e.to_room));
      if (inner.length) exits = inner; // never strand a creature with no exits
    }
    // Territory: idle wandering keeps to the ground around the den. Beyond the
    // edge (fled, or freshly walked in from a dark mouth), every idle step is
    // a step home instead — this is what keeps the deep in the deep, and what
    // carries a migrant from the mouth to its range. Fleeing ignores the edge
    // (survival first; the next calm step starts the walk back). Patrollers
    // are exempt — their route is their territory. Never strands.
    if (mode === "wander" && creature.home && !tmpl.is_boss && !PATROLS[tmpl.id]) {
      const d = this.roomDist(creature.roomId, creature.home);
      if (d > TERRITORY_RADIUS) {
        const closer = exits.filter((e) => this.roomDist(e.to_room, creature.home!) < d);
        if (closer.length) exits = closer;
      } else {
        const within = exits.filter((e) => this.roomDist(e.to_room, creature.home!) <= TERRITORY_RADIUS);
        if (within.length) exits = within;
      }
    }
    // Idle drift avoids an already-packed room, so wandering doesn't stack the
    // whole zone into one hub. (Answering a noise or fleeing still goes where it
    // must; and we never strand a creature with no other way to turn.)
    if (mode === "wander" && !creature.curious) {
      const uncrowded = exits.filter((e) => this.creaturesIn(e.to_room) < CROWD_CAP);
      if (uncrowded.length) exits = uncrowded;
    }
    if (exits.length === 0) return;

    let exit = exits[randInt(0, exits.length - 1)];
    let investigating = false;
    if (mode === "flee") {
      creature.curious = null;
    } else if (creature.curious && creature.curious !== creature.roomId) {
      const toward = exits.find((e) => e.to_room === creature.curious);
      if (toward) { exit = toward; investigating = true; }
      creature.curious = null; // one look is all it owes the noise
    } else if (SCAVENGERS.has(tmpl.id)) {
      // Follows the scent of the dead: toward a room that holds corpse-litter.
      const scent = exits.find((e) =>
        (this.traces.get(e.to_room) ?? []).some((tr) => CORPSE_TRACES.has(tr.kind)),
      );
      if (scent) exit = scent;
      creature.curious = null;
    } else if (creature.hunger >= HUNGRY_AT && !HOLLOW.has(tmpl.id)) {
      const smells = exits.find((e) =>
        (this.ground.get(e.to_room) ?? []).some((id) => world.itemTemplates.get(id)?.lure),
      );
      if (smells) exit = smells;
      creature.curious = null;
    } else {
      creature.curious = null;
      const route = PATROLS[tmpl.id];
      if (route) {
        let idx = creature.patrolIdx ?? 0;
        if (route[idx % route.length] === creature.roomId) idx++;
        const targetRoom = route[idx % route.length];
        const toward = exits.find((e) => e.to_room === targetRoom);
        if (toward) { exit = toward; creature.patrolIdx = idx + 1; }
        // off-route: random steps until the rounds find it again
      }
    }

    const from = creature.roomId;
    creature.roomId = exit.to_room;
    creature.nextWanderAt = now + randInt(WANDER_MIN_MS, WANDER_MAX_MS);
    // Beyond its territory a creature travels with purpose — the walk in from
    // a dark mouth (or back from a rout) is minutes, not an afternoon.
    if (creature.home && !tmpl.is_boss && this.roomDist(creature.roomId, creature.home) > TERRITORY_RADIUS) {
      creature.nextWanderAt = now + randInt(8000, 25_000);
    }
    if (mode === "flee") {
      creature.target = null;
      for (const s of this.sessions.values()) {
        if (s.target === creature.id) s.target = null;
      }
    }
    if (!silent) {
      // The hollow don't bleed — they come apart in their own way. A runner
      // isn't wounded at all: it just darts, whole and gone.
      const hurt = HURT_STYLE[tmpl.id];
      const runner = RUNNERS.has(tmpl.id);
      const outLine = mode !== "flee"
        ? `${cap(tmpl.name)} ${tmpl.is_boss ? "moves" : "slips away"} ${exit.dir}.`
        : runner ? `${cap(tmpl.name)} darts ${exit.dir} and is gone.`
        : hurt ? `${cap(tmpl.name)} ${hurt.out.replace("{dir}", exit.dir)}`
        : `${cap(tmpl.name)} flees ${exit.dir}, bleeding.`;
      this.roomFeed(from, outLine);
      const inLine = mode !== "flee" ? "creeps in."
        : runner ? "skitters in, already looking for the next way out."
        : hurt ? hurt.in_ : "bursts in, bleeding.";
      this.roomFeed(creature.roomId, `${cap(tmpl.name)} ${inLine}`);
      this.roomSound(
        creature.roomId,
        mode === "flee"
          ? (runner ? "Something small scrabbles away {dir}, fast." : HOLLOW.has(tmpl.id) ? "Something clatters away {dir}, broken." : "Something crashes away {dir}, wounded.")
          : (MOVE_SOUNDS[tmpl.id] ?? "Something moves {dir}."),
        from,
      );
      this.refreshRoomCtx(from);
      this.refreshRoomCtx(creature.roomId);
      // Walking into a room full of people it hates — or, for a dire-hyena,
      // dragging a fresh kill in among them — it marks the first, and (unless
      // it's fleeing) gets the jump on them, same as when you walk in.
      for (const s of this.sessions.values()) {
        if (s.roomId === creature.roomId && !this.outOfWorld(s) && !creature.target
            && (this.remembers(creature, s.pubkey, now) || this.hyenaGuardsMeal(creature))) {
          creature.target = s.pubkey;
          this.send(s, this.remembers(creature, s.pubkey, now)
            ? `${cap(tmpl.name)} remembers you — and comes for you.`
            : `${cap(tmpl.name)} snarls over its kill — you're too close, and now you're prey.`);
          // It gets the jump only if the player isn't already fully dogpiled this
          // tick; otherwise it just marks them and swings in on the next round.
          if (mode !== "flee" && this.canLandBlow(s.pubkey)) await this.creatureFirstStrike(creature, tmpl, s);
          break;
        }
      }
      // Came to investigate and found a fight: it joins. Noise has a price.
      if (investigating && !creature.target) {
        for (const s of this.sessions.values()) {
          if (s.roomId === creature.roomId && this.inCombat(s)) {
            creature.target = s.pubkey;
            this.addGrudge(creature, s.pubkey);
            this.send(s, `${cap(tmpl.name)} joins the fight, drawn by the noise!`);
            this.roomFeed(creature.roomId, `${cap(tmpl.name)} joins the fight!`, s.pubkey);
            break;
          }
        }
      }
    }
  }

  // Hungry creature eats the most fragrant thing on the floor.
  private creatureEatsHere(creature: Creature, silent: boolean, at = Date.now()): void {
    if (HOLLOW.has(creature.templateId)) return; // nothing inside to feed
    const world = this.world!;
    const here = this.ground.get(creature.roomId) ?? [];
    const idx = here.findIndex((id) => world.itemTemplates.get(id)?.lure);
    if (idx === -1) return;
    const item = world.itemTemplates.get(here[idx])!;
    here.splice(idx, 1);
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    creature.hunger = 0;
    creature.hp = Math.min(tmpl.max_hp, creature.hp + Math.max(item.heal, 3));
    this.addTrace(creature.roomId, { kind: "scraps", at });
    if (!silent) {
      this.roomFeed(creature.roomId, `${cap(tmpl.name)} tears into ${item.name}.`);
      this.roomSound(creature.roomId, "Wet tearing sounds drift {dir}.");
      this.refreshRoomCtx(creature.roomId);
    }
  }

  // A scavenger that has eaten enough of the dead loses its nerve: it stops
  // fleeing and swings harder. The dungeon's own corpses arm it.
  private scavengerBold(creature: Creature): boolean {
    return SCAVENGERS.has(creature.templateId) && (creature.fed ?? 0) >= SCAVENGER_BOLD_AT;
  }

  private playerPresent(roomId: string): boolean {
    for (const s of this.sessions.values()) if (s.roomId === roomId && !this.outOfWorld(s)) return true;
    return false;
  }

  // A brood-mother births a scabby rat into her room on a slow clock, up to a
  // cap — a living spawn source. She only breeds while unbothered (no target),
  // so engaging her IS the way to stem the tide; leave her and the room fills.
  private broodBirths(mother: Creature, now: number): void {
    if (!mother.nextBirthAt) { mother.nextBirthAt = now + BROOD_INTERVAL_MS; return; }
    if (now < mother.nextBirthAt) return;
    mother.nextBirthAt = now + BROOD_INTERVAL_MS;
    const ratTmpl = this.world!.mobTemplates.get("rat");
    if (!ratTmpl) return;
    let count = 0;
    for (const c of this.creatures.values()) {
      if (c.roomId === mother.roomId && c.templateId === "rat") count++;
    }
    if (count >= BROOD_CAP) return;
    const pupId = uuid();
    this.creatures.set(pupId, {
      id: pupId,
      templateId: "rat",
      roomId: mother.roomId,
      hp: ratTmpl.max_hp,
      hunger: randInt(0, HUNGRY_AT - 10),
      grudges: [],
      nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
      target: null,
      home: mother.roomId, // born to the nest; its ground is its mother's
    });
    const mtmpl = this.world!.mobTemplates.get(mother.templateId)!;
    this.roomFeed(mother.roomId, `${cap(mtmpl.name)} shudders, and a fresh pup squirms free.`);
    this.roomSound(mother.roomId, "A wet, squealing sound {dir}.");
    this.refreshRoomCtx(mother.roomId);
  }

  // The mean subtype is guarding a meal when it's standing on a corpse, or it's
  // already gorged bold. While guarding, it turns on anyone who walks in on it —
  // no grudge needed. Disturb its dinner and you are the next course.
  private hyenaGuardsMeal(creature: Creature): boolean {
    if (!AGGRO_SCAVENGERS.has(creature.templateId)) return false;
    if (this.scavengerBold(creature)) return true;
    const list = this.traces.get(creature.roomId);
    return !!list && list.some((tr) => CORPSE_TRACES.has(tr.kind));
  }

  // Eat one corpse (blood/remains litter) in the room: heal, sate, and grow
  // bolder. Leaving the dead lying is what fattens a hyena into a real threat.
  private scavengerFeeds(creature: Creature, silent: boolean): void {
    const list = this.traces.get(creature.roomId);
    if (!list) return;
    const idx = list.findIndex((tr) => CORPSE_TRACES.has(tr.kind));
    if (idx === -1) return;
    list.splice(idx, 1);
    if (list.length === 0) this.traces.delete(creature.roomId);
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    creature.hunger = 0;
    creature.hp = Math.min(tmpl.max_hp, creature.hp + SCAVENGER_HEAL);
    const before = creature.fed ?? 0;
    creature.fed = before + 1;
    if (!silent) {
      this.roomFeed(creature.roomId, `${cap(tmpl.name)} tears into the dead, feeding.`);
      this.roomSound(creature.roomId, "Wet, cracking sounds drift {dir}.");
      if (before < SCAVENGER_BOLD_AT && creature.fed >= SCAVENGER_BOLD_AT) {
        this.roomFeed(creature.roomId, `${cap(tmpl.name)} lifts its head, gorged and unafraid.`);
      }
      this.refreshRoomCtx(creature.roomId);
    }
  }

  // ---- traces: the world's memory ----

  private addTrace(roomId: string, trace: Trace): void {
    let list = this.traces.get(roomId);
    if (!list) { list = []; this.traces.set(roomId, list); }
    if (trace.kind === "passage") {
      // One set of footprints per room; new passage refreshes it.
      const i = list.findIndex((t) => t.kind === "passage");
      if (i !== -1) list.splice(i, 1);
    }
    if (trace.kind === "carve") {
      const carvings = list.filter((t) => t.kind === "carve");
      if (carvings.length >= CARVE_CAP) {
        // The wall is full; the oldest words wear away.
        const oldest = carvings.reduce((a, b) => (a.at < b.at ? a : b));
        list.splice(list.indexOf(oldest), 1);
      }
    }
    list.push(trace);
    while (list.length > TRACE_CAP) {
      const i = list.findIndex((t) => t.kind !== "carve");
      if (i === -1) break;
      list.splice(i, 1);
    }
  }

  private pruneTraces(now: number): void {
    for (const [roomId, list] of this.traces) {
      const alive = list.filter((t) => now - t.at < (TRACE_LIFE_MS[t.kind] ?? 0));
      if (alive.length === 0) this.traces.delete(roomId);
      else if (alive.length !== list.length) this.traces.set(roomId, alive);
    }
  }

  // Evidence, rendered fuzzily by age — the reader does the detective work.
  private traceLines(roomId: string, now: number): string[] {
    const list = this.traces.get(roomId);
    if (!list || list.length === 0) return [];
    const lines: string[] = [];
    const carvings = list.filter((t) => t.kind === "carve" && now - t.at < TRACE_LIFE_MS.carve);
    const rest = list
      .filter((t) => t.kind !== "carve" && now - t.at < (TRACE_LIFE_MS[t.kind] ?? 0))
      .sort((a, b) => b.at - a.at)
      .slice(0, 3);
    for (const t of rest) {
      const age = now - t.at;
      if (t.kind === "blood") {
        if (age < 10 * 60_000) lines.push("Fresh blood pools on the stones — something died here moments ago.");
        else if (age < 3_600_000) lines.push("Blood on the stones, still wet.");
        else lines.push("A drying bloodstain darkens the floor.");
      } else if (t.kind === "remains") {
        if (age < 10 * 60_000) lines.push("Broken remains litter the stones, still settling.");
        else if (age < 3 * 3_600_000) lines.push("Broken remains lie scattered here.");
        else lines.push("Old remains, long picked over.");
      } else if (t.kind === "scraps") {
        if (age < 3_600_000) lines.push("Fresh gnawed scraps litter the floor.");
        else lines.push("Gnawed scraps rot quietly in a corner.");
      } else if (t.kind === "rest") {
        if (age < 3_600_000) lines.push("A patch of floor lies swept clear, sat in not long ago.");
        else lines.push("Someone rested here, a while back.");
      } else if (t.kind === "passage") {
        if (age < 10 * 60_000) lines.push("The dust is freshly disturbed — someone passed this way minutes ago.");
        else lines.push("Footprints disturb the dust here.");
      }
    }
    for (const t of carvings.sort((a, b) => a.at - b.at)) {
      const age = now - t.at;
      const wear = age < 3_600_000 ? ", the marks fresh" : age > 7 * 24 * 3_600_000 ? ", half-worn" : "";
      lines.push(`"${t.words}" is scratched into the stone${wear}.`);
    }
    return lines;
  }

  // Food left on the floor goes foul on its own clock.
  private applyRot(now: number, silent: boolean): void {
    this.rot = this.rot.filter((r) => {
      if (r.at > now) return true;
      const here = this.ground.get(r.roomId) ?? [];
      const idx = here.indexOf(r.itemId);
      if (idx !== -1) {
        here.splice(idx, 1);
        this.addTrace(r.roomId, { kind: "scraps", at: r.at });
        if (!silent) {
          const t = this.world!.itemTemplates.get(r.itemId);
          this.roomFeed(r.roomId, `${cap(t?.name ?? "something")} has gone foul.`);
          this.refreshRoomCtx(r.roomId);
        }
      }
      return false;
    });
  }

  // The shrine keeps its promises.
  private applyRegrow(now: number, silent: boolean): void {
    this.regrow = this.regrow.filter((g) => {
      if (g.at > now) return true;
      // Never over-fill: if the room got one back some other way (a dropped or
      // thrown rock landed here), this regrow just resolves to nothing.
      const floor = this.ground.get(g.roomId) ?? [];
      if (floor.includes(g.itemId)) return false;
      this.ground.set(g.roomId, [...floor, g.itemId]);
      if (!silent) {
        const t = this.world!.itemTemplates.get(g.itemId);
        const rock = g.itemId === "loose-rock";
        const edible = !!t?.edible;
        this.roomFeed(g.roomId, rock
          ? "The rubble shifts — a loose rock lies within reach again."
          : edible
            ? `${cap(t?.name ?? "something")} lies here — the stores are not empty yet.`
            : `${cap(t?.name ?? "something")} lies on the altar, as if it had never left.`);
        this.roomSound(g.roomId, rock ? "Stone grinds on stone {dir}." : edible ? "Something settles {dir}." : "A faint chime sounds {dir}.");
        this.refreshRoomCtx(g.roomId);
      }
      return false;
    });
  }

  // The dead stay dead — but the dungeon refills. When a population is below
  // its cap, a migrant is already on its way; it arrives here.
  private scheduleArrivals(now: number): void {
    const world = this.world!;
    const caps = new Map<string, number>();
    for (const spawn of world.mobSpawns) {
      caps.set(spawn.template_id, (caps.get(spawn.template_id) ?? 0) + 1);
    }
    // A variant counts against its bloodline's cap: a den holding a dire
    // hyena is a hyena den held, not a hyena short (or the world would refill
    // around every promotion and swell past its caps).
    const alive = new Map<string, number>();
    for (const c of this.creatures.values()) {
      const line = this.variantBase.get(c.templateId) ?? c.templateId;
      alive.set(line, (alive.get(line) ?? 0) + 1);
    }
    for (const [templateId, cap_] of caps) {
      const short = cap_ - (alive.get(templateId) ?? 0) - (this.arrivals.has(templateId) ? 1 : 0);
      if (short > 0 && !this.arrivals.has(templateId)) {
        const tmpl = world.mobTemplates.get(templateId)!;
        // Fodder refills faster the busier the zone; the boss keeps its clock.
        const factor = tmpl.is_boss
          ? MIGRATION_FACTOR
          : Math.max(MIGRATION_MIN_FACTOR, MIGRATION_FACTOR / Math.max(1, this.sessions.size));
        this.arrivals.set(templateId, now + tmpl.respawn_secs * 1000 * factor);
      }
    }
  }

  private applyArrivals(now: number, silent: boolean): void {
    const world = this.world!;
    for (const [templateId, at] of this.arrivals) {
      if (at > now) continue;
      this.arrivals.delete(templateId);
      const baseTmpl = world.mobTemplates.get(templateId);
      if (!baseTmpl) continue;
      // Rare blood: what refills the ground is usually the ordinary version,
      // once in a while the mean cousin. (Spawn rows belong to the base.)
      const tmpl = this.rollBloodline(baseTmpl);
      // Migrants respect the threshold too: nothing ordinary arrives AT a
      // gate (same rule as wandering), or a rat could materialize on top
      // of a respawn. Boss homes are wherever they are.
      let homes = world.mobSpawns.filter((s) => s.template_id === templateId).map((s) => s.room_id);
      if (!tmpl.is_boss) {
        const inner = homes.filter((r) => !world.entryRooms.has(r));
        if (inner.length) homes = inner;
      }
      // One mother to a room: a nest with two fountains is a meat grinder. Steer
      // a respawning brood-mother to a home that hasn't already got one (fall
      // back to her homes if every nest is taken).
      if (BROODERS.has(tmpl.id)) {
        const taken = new Set<string>();
        for (const c of this.creatures.values()) {
          if (c.templateId === tmpl.id) taken.add(c.roomId);
        }
        const open = homes.filter((r) => !taken.has(r));
        if (open.length) homes = open;
      }
      const home = homes[randInt(0, Math.max(0, homes.length - 1))] ?? world.entryRoom;
      // Migration is a walk, not a materialization: a walker surfaces at the
      // dark mouth nearest its den and makes its way in (territory homing does
      // the walking). The sessile — mothers, the drowned — and the boss simply
      // are where they live.
      let roomId = home;
      if (!tmpl.is_boss && !BROODERS.has(tmpl.id) && !DROWNERS.has(tmpl.id)) {
        let bestD = Number.POSITIVE_INFINITY;
        for (const m of MOUTHS) {
          if (!world.rooms.has(m)) continue;
          const d = this.roomDist(m, home);
          if (d < bestD) { bestD = d; roomId = m; }
        }
      }
      const creature: Creature = {
        id: uuid(),
        templateId: tmpl.id,
        roomId,
        hp: tmpl.max_hp,
        hunger: randInt(HUNGRY_AT - 20, HUNGRY_AT + 20), // travel works up an appetite
        grudges: [],
        // A fresh migrant starts its walk in promptly; the settled keep their idle clock.
        nextWanderAt: now + (roomId === home ? randInt(WANDER_MIN_MS, WANDER_MAX_MS) : randInt(4000, 15_000)),
        target: null,
        carries: this.rollCarry(tmpl),
        hidden: LURKERS.has(tmpl.id) || undefined,
        home,
      };
      this.creatures.set(creature.id, creature);
      if (tmpl.is_boss) {
        // What lives behind the black door has reformed — and the door knows.
        for (const [rid, exits] of world.exits) {
          for (const e of exits) {
            if (e.to_room === roomId && e.key_item) this.openDoors.delete(`${rid}:${e.dir}`);
          }
        }
        if (!silent) this.roomFeedAll("Deep below, iron grinds shut. Something remembers its shape.");
      } else if (!silent) {
        this.roomFeed(roomId, `${cap(tmpl.name)} creeps out of the dark.`);
        this.roomSound(roomId, "Something stirs {dir}.");
        this.refreshRoomCtx(roomId);
      }
    }
  }

  // The King does not mind that you came — until you make him stand.
  private bossPhase(creature: Creature, tmpl: MobTemplate, foe: Session): void {
    const ratio = creature.hp / tmpl.max_hp;
    const newPhase = ratio <= 1 / 3 ? 2 : ratio <= 2 / 3 ? 1 : 0;
    if (newPhase <= (creature.phase ?? 0)) return;
    creature.phase = newPhase;
    if (newPhase === 1) {
      this.roomFeed(creature.roomId, `${cap(tmpl.name)} rises from the throne. The dark rises with him.`);
      this.send(foe, `${cap(tmpl.name)} rises from the throne. The dark rises with him.`);
      this.roomSound(creature.roomId, "Stone scrapes {dir}; something vast has stood up.");
      this.creatureNoise(creature.roomId);
    } else {
      this.roomFeedAll(`A voice rolls through the stone: ${cap(tmpl.name)} calls — and the dark answers.`);
      const summoned: Creature = {
        id: uuid(),
        templateId: "rat",
        roomId: creature.roomId,
        hp: this.world!.mobTemplates.get("rat")?.max_hp ?? 8,
        hunger: HUNGRY_AT,
        grudges: [{ pk: foe.pubkey, at: Date.now() }],
        nextWanderAt: Date.now() + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
        target: foe.pubkey,
        home: creature.roomId, // called out of the throne's dark; it stays near it
      };
      this.creatures.set(summoned.id, summoned);
      this.roomFeed(creature.roomId, "Something scabby pours out of the dark beneath the throne.");
      this.send(foe, "Something scabby pours out of the dark beneath the throne — and comes for you.");
      this.refreshRoomCtx(creature.roomId);
      this.creatureNoise(creature.roomId);
    }
  }

  // A swing gone wide. A provisional weapon leaves your hand — it is on the
  // stones now, mid-fight, anyone's to take. A sealed weapon is held to your
  // grip by its mark; bare hands just stumble. Fumbling is loud either way.
  private async playerFumble(
    session: Session,
    weapon: { carried: CarriedItem; tmpl: ItemTemplate } | null,
  ): Promise<void> {
    if (weapon) {
      // Any wielded weapon can leave your hand — the seal is title, not a
      // grip. A sealed one cracks its claim as it hits the stones.
      session.items.splice(session.items.indexOf(weapon.carried), 1);
      await removeItemRow(this.env.DB, weapon.carried.rowId);
      if (weapon.carried.serial !== null) await voidMint(this.env.DB, weapon.carried.serial);
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), weapon.carried.itemId]);
      this.send(session, `Your swing goes wide — ${weapon.tmpl.name} spins from your grip and clatters across the stones!`
        + (weapon.carried.serial !== null ? " The seal cracks where it lands." : ""), "fumble");
      this.roomFeed(session.roomId, `${session.name}'s weapon clatters across the stones!`, session.pubkey);
      this.roomSound(session.roomId, "Metal clatters on stone, {dir}.");
      this.creatureNoise(session.roomId);
      this.refreshRoomCtx(session.roomId);
    } else {
      session.staggered = true;
      this.send(session, pick([
        "You overreach and stumble — an opening.",
        "Your blow goes wild and you lurch off balance — an opening.",
        "You swing at nothing and your footing slips — an opening.",
        "You misjudge it and stagger past — an opening.",
      ]), "fumble");
    }
  }

  private async onCreatureDeath(killer: Session, creature: Creature, tmpl: MobTemplate): Promise<void> {
    // A revenant doesn't die the first time: it rises weakened and comes again,
    // up to its limit (most rise once; the cairn-wight twice). Only the final
    // fall is real — so bail out of death entirely while it still has a rise.
    if (REVENANTS.has(creature.templateId) && (creature.rises ?? 0) < (RISE_LIMIT[creature.templateId] ?? 1)) {
      creature.rises = (creature.rises ?? 0) + 1;
      creature.hp = Math.max(1, Math.round(tmpl.max_hp * REVIVE_FRAC));
      creature.stunned = false; creature.bleedTicks = 0;
      this.send(killer, pick([
        `${cap(tmpl.name)} falls still — and then, unhurried, it stands back up.`,
        `${cap(tmpl.name)} drops — and gathers itself, and rises again.`,
        `You put ${tmpl.name} down. It does not stay down.`,
        `${cap(tmpl.name)} collapses, shudders, and hauls itself upright once more.`,
      ]));
      this.roomFeed(creature.roomId, `${cap(tmpl.name)} rises again.`, killer.pubkey);
      this.combatNoise(creature.roomId);
      return;
    }
    this.creatures.delete(creature.id);
    for (const s of this.sessions.values()) {
      if (s.target === creature.id) s.target = null;
      if (s.seizedBy === creature.id) s.seizedBy = undefined; // its grip dies with it
    }
    killer.kills += 1;
    if (tmpl.is_boss) killer.bossKills += 1;
    await recordKill(this.env.DB, killer.pubkey, !!tmpl.is_boss);
    // If you're carrying a journal when it falls, the book keeps count — one
    // more of this kind, written to whichever journal is in your pack.
    const jrn = killer.items.find((c) => c.journalId);
    if (jrn?.journalId) await journalBumpKill(this.env.DB, jrn.journalId, tmpl.id);
    // How a thing goes down depends on what it was: the hollow come apart, the
    // living fall and bleed, the deep things sink. The boss earns its own weight.
    const killVerb = tmpl.is_boss
      ? pick([`You put ${tmpl.name} down. The stone itself seems to let out a breath.`,
              `${cap(tmpl.name)} falls — and does not rise. It is over.`,
              `You end ${tmpl.name}. The weight of the deep shifts, somewhere far below.`])
      : HOLLOW.has(tmpl.id)
      ? pick([`${cap(tmpl.name)} comes apart in a clatter of loose bone.`,
              `You shatter ${tmpl.name}; the pieces go still.`,
              `${cap(tmpl.name)} folds, and is only bones again.`,
              `The light goes out of ${tmpl.name} and it drops in a heap.`])
      : DROWNERS.has(tmpl.id)
      ? pick([`${cap(tmpl.name)} sinks, and the black water closes over it.`,
              `You finish ${tmpl.name}; it slides under and is gone.`,
              `${cap(tmpl.name)} goes limp and the flood takes it down.`])
      : pick([`You kill ${tmpl.name}.`,
              `${cap(tmpl.name)} drops and does not move.`,
              `You put ${tmpl.name} down for good.`,
              `${cap(tmpl.name)} falls, and the fight goes out of it.`,
              `You finish ${tmpl.name}.`]);
    this.send(killer, killVerb, "kill big");
    this.roomFeed(creature.roomId, `${killer.name} kills ${tmpl.name}.`, killer.pubkey);
    this.roomSound(creature.roomId, "Something falls {dir}, and is still.");
    this.creatureNoise(creature.roomId);
    // A cutpurse that died with your loot spills it here — chase it, catch it,
    // and it's on the floor where it fell. (Ground items land fresh, no seal.)
    if (creature.stole) {
      const stolen = this.world!.itemTemplates.get(creature.stole);
      this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), creature.stole]);
      if (stolen) this.roomFeed(creature.roomId, `${cap(stolen.name)} spills from the dead ${tmpl.name.replace(/^an? /, "")}.`);
      creature.stole = undefined;
    }
    this.addTrace(creature.roomId, {
      kind: HOLLOW.has(tmpl.id) ? "remains" : "blood",
      at: Date.now(),
      label: tmpl.name,
    });
    this.refreshRoomCtx(creature.roomId);
    if (tmpl.is_boss) {
      this.roomFeedAll(`A cry rolls through the stone: ${tmpl.name} has fallen to ${killer.name}.`);
    }
    this.scheduleArrivals(Date.now());

    // Drops are provisional: the dungeon signs nothing here. The seal waits
    // at the gate — that walk is the game.
    if (tmpl.loot_item && chance(tmpl.loot_chance)) {
      const item = this.world!.itemTemplates.get(tmpl.loot_item);
      if (item) {
        if (await this.grantItem(killer, item.id)) {
          this.send(killer, `${cap(item.name)} falls into your hands. [${item.rarity}] (unclaimed — the gate can seal it)`);
        } else {
          this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), item.id]);
          this.send(killer, `${cap(item.name)} falls from ${tmpl.name} — your pack is full, so it lies here. [${item.rarity}]`);
        }
        this.roomFeed(creature.roomId, `${killer.name} claims ${item.name}.`, killer.pubkey);
        this.sendCtx(killer);
      }
    }

    // A rare key off the dead — the elites and the King carry the keys to the
    // locked caches. Straight to hand; spend it on a strongbox.
    for (const mk of this.world!.mobKeys) {
      if (mk.templateId !== tmpl.id || !chance(mk.chance)) continue;
      const kt = this.world!.itemTemplates.get(mk.keyItem);
      if (!kt) continue;
      if (await this.grantItem(killer, kt.id)) {
        this.send(killer, `${cap(kt.name)} falls from the dead ${tmpl.name.replace(/^an? /, "")}. [${kt.rarity}] (unclaimed)`);
      } else {
        this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), kt.id]);
        this.send(killer, `${cap(kt.name)} falls from the dead ${tmpl.name.replace(/^an? /, "")} — pack full, it lies here. [${kt.rarity}]`);
      }
      this.sendCtx(killer);
    }

    // What it visibly bore — its gear, or something it scavenged off the dead —
    // spills to the floor where it fell. No random roll: if you could see it on
    // the thing, killing it drops it. Pick it up (ground gear lands fresh, no
    // seal; the gate does the sealing).
    if (creature.carries?.length) {
      const floor = this.ground.get(creature.roomId) ?? [];
      for (const id of creature.carries) {
        const g = this.world!.itemTemplates.get(id);
        floor.push(id);
        if (g) {
          this.send(killer, `${cap(g.name)} clatters free of the fallen — it lies here. [${g.rarity}]`);
          this.roomFeed(creature.roomId, `${cap(g.name)} spills from the dead ${tmpl.name.replace(/^an? /, "")}.`, killer.pubkey);
        }
      }
      this.ground.set(creature.roomId, floor);
      creature.carries = undefined;
      this.refreshRoomCtx(creature.roomId);
    }
  }

  // The mirror of a player's ambush: something that remembers you doesn't wait
  // its turn. The instant you're in reach it's on you — one heavy blow at
  // AMBUSH_MULT, before the round begins, before you can set your feet. No miss,
  // no crit; the surprise IS the punch. Armor and stance still turn what they
  // can, and a wounded attacker still hits softer.
  private async creatureFirstStrike(creature: Creature, tmpl: MobTemplate, victim: Session): Promise<void> {
    const cHurt = creature.hp < tmpl.max_hp * WOUNDED_FRACTION;
    let dmg = randInt(tmpl.dmg_min, tmpl.dmg_max) + (tmpl.is_boss ? (creature.phase ?? 0) * 3 : 0);
    if (this.scavengerBold(creature)) dmg = Math.round(dmg * BOLD_DMG_MULT);
    dmg = Math.round(dmg * AMBUSH_MULT);
    if (cHurt) dmg = Math.max(1, Math.round(dmg * WOUNDED_DMG_MULT));
    const worn = this.equippedItem(victim, "armor");
    dmg = Math.max(1, dmg - this.equippedArmor(victim));
    dmg = Math.max(1, Math.round(dmg * STANCE[victim.stance].def));
    victim.hp -= dmg;
    if (victim.resting) {
      victim.resting = false;
      this.send(victim, "You are torn from your rest.");
    }
    this.combatNoise(victim.roomId);
    if (victim.hp > 0) {
      this.send(victim, `${cap(tmpl.name)} is on you before you're set — a first blow for ${dmg}. [${victim.hp}/${victim.maxHp} hp]`, "dmgin big");
      this.sendStatus(victim);
      if (worn) await this.wear(victim, worn.carried, worn.tmpl, ARMOR_WEAR);
    } else {
      await this.onPlayerDeath(victim, tmpl);
    }
  }

  private async onPlayerDeath(victim: Session, tmpl: MobTemplate): Promise<void> {
    const world = this.world!;
    for (const c of this.creatures.values()) {
      if (c.target === victim.pubkey) c.target = null;
    }
    victim.target = null;
    victim.resting = false;
    victim.staggered = false;
    victim.buying = undefined; // death ends any open trade; the counter clears
    victim.deaths += 1;
    await recordDeath(this.env.DB, victim.pubkey);

    // EVERYTHING carried scatters where you fall — sealed included. The seal
    // is title, not armor: it cracks as it leaves your hands (claim voided),
    // and the thing lies on the stones for anyone, or anything, to find.
    // Only the lockbox protects (rome's rule, 2026-07-05).
    const fell = victim.roomId;
    const scattered = victim.items;
    const hadSealed = scattered.some((c) => c.serial !== null);
    if (scattered.length > 0) {
      // Journals fall instanced (their pages ride the book to whoever loots it);
      // everything else spills as plain loot.
      this.ground.set(fell, [...(this.ground.get(fell) ?? []), ...scattered.filter((c) => !c.journalId).map((c) => c.itemId)]);
      for (const c of scattered) {
        if (c.journalId) { this.dropInstance(fell, c.itemId, c.journalId); continue; }
        if (this.world!.itemTemplates.get(c.itemId)?.edible) {
          this.rot.push({ itemId: c.itemId, roomId: fell, at: Date.now() + ROT_MS });
        }
        if (c.serial !== null) await voidMint(this.env.DB, c.serial);
      }
      await clearCarriedInventory(this.env.DB, victim.pubkey);
    }
    victim.items = [];
    this.roomFeed(
      fell,
      scattered.length > 0
        ? `${victim.name} is slain by ${tmpl.name}. Their pack scatters across the stones${hadSealed ? " — cracked seals glitter among the spill" : ""}.`
        : `${victim.name} is slain by ${tmpl.name}.`,
      victim.pubkey,
    );
    this.roomSound(fell, "A scream, cut short, {dir}.");
    this.creatureNoise(fell);
    this.addTrace(fell, { kind: "blood", at: Date.now(), label: victim.name });

    victim.roomId = this.randomGate();
    victim.hp = victim.maxHp;
    const fate =
      scattered.length > 0
        ? hadSealed
          ? "Everything you carried lies where you fell — the gate's seals cracked as they left your hands. Only the lockbox and vault keep."
          : "Everything you carried lies where you fell."
        : "You carried nothing worth scattering.";
    const end = pick([
      `${cap(tmpl.name)} kills you.\nDarkness. Then the gate, again.`,
      `${cap(tmpl.name)} puts you down.\nThe dark takes you — and gives you back at the gate.`,
      `${cap(tmpl.name)} is the last thing you see.\nThen cold air, and the gate, and breath again.`,
      `You fall to ${tmpl.name}.\nSome while later — the gate, and you standing in it, whole and emptied.`,
    ]);
    this.send(victim, `${end} ${fate}`, "death big");
    this.roomFeed(victim.roomId, `${victim.name} staggers back through the gate, pale.`, victim.pubkey);
    this.send(victim, this.describeRoom(victim));
    this.sendStatus(victim);
    this.refreshRoomCtx(fell);
    this.refreshRoomCtx(victim.roomId);
    await savePlayer(this.env.DB, victim.pubkey, victim.roomId, victim.hp);
    await this.persist();
  }

  private inCombat(session: Session): boolean {
    if (session.target) return true;
    for (const c of this.creatures.values()) {
      if (c.target === session.pubkey) return true;
    }
    return false;
  }

  private async ensureAlarm(): Promise<void> {
    // The tick runs only while someone is here to see it; an empty world
    // is fast-forwarded by catchUp() when the next player arrives.
    if (this.sessions.size === 0) return;
    const current = await this.state.storage.getAlarm();
    // An overdue alarm is a dead alarm (dev reloads leave them wedged) —
    // setAlarm overwrites, so reschedule rather than trust it.
    if (current === null || current < Date.now()) {
      await this.state.storage.setAlarm(Date.now() + TICK_MS);
    }
  }

  // ---- rendering & lookup ----

  // The room, entered: full prose the first time you see it (and on `look`),
  // brief on every re-entry after — just the name, the ways out, and whatever
  // is actually THERE now. Marks the room known. The whole reason you don't
  // re-read the same paragraph every time you cross a room you've crossed all day.
  private enterDescribe(session: Session): string {
    const full = !session.visited.has(session.roomId);
    session.visited.add(session.roomId);
    return this.describeRoom(session, full);
  }

  // full=false is the brief view: the static scene-setting (the prose, the
  // keeper who is always there) is dropped, leaving only what's live.
  private describeRoom(session: Session, full = true): string {
    const world = this.world!;
    const room = world.rooms.get(session.roomId)!;
    const lines = full ? [room.name, room.description] : [room.name];

    const exits = world.exits.get(room.id) ?? [];
    lines.push(exits.length ? `Exits: ${exits.map((e) => e.dir).join(", ")}.` : "There is no way out.");

    lines.push(...this.traceLines(room.id, Date.now()));

    // Every gate keeps a keeper: a fence at a shuttered hatch, dealing in kind.
    // (Static, so it's part of the full look only — you know he's there.)
    if (full && world.entryRooms.has(room.id) && world.fenceStock.length > 0) {
      lines.push("A keeper waits at a shuttered hatch in the gatehouse wall, dealing in kind.");
    }

    for (const itemId of this.ground.get(room.id) ?? []) {
      const t = world.itemTemplates.get(itemId);
      if (t) lines.push(`${cap(t.name)} lies here.`);
    }
    // A dropped journal lies here too — someone's abandoned or spilled hunting.
    for (const inst of this.groundInstances.get(room.id) ?? []) {
      const t = world.itemTemplates.get(inst.itemId);
      if (t) lines.push(`${cap(t.name)} lies here, its pages open to the dark.`);
    }
    for (const cache of world.caches) {
      if (cache.roomId !== room.id) continue;
      lines.push(this.cacheLocked(cache)
        ? `${cap(cache.name)} sits here, locked.`
        : `${cap(cache.name)} sits here, sprung and empty.`);
    }
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== room.id) continue;
      // A lurker lying in wait is unseen — it isn't in the room until it strikes.
      if (LURKERS.has(creature.templateId) && creature.hidden && !creature.target) continue;
      const t = world.mobTemplates.get(creature.templateId)!;
      lines.push(`${cap(t.name)} is here${this.bearsClause(creature)}.${creature.hp < t.max_hp ? ` (${this.condition(creature)})` : ""}`);
    }
    for (const s of this.sessions.values()) {
      if (s.pubkey !== session.pubkey && s.roomId === room.id && !this.outOfWorld(s)) {
        lines.push(`${s.name} is here${s.resting ? ", resting" : ""}.`);
      }
    }
    return lines.join("\n");
  }

  private condition(creature: Creature): string {
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    const f = creature.hp / tmpl.max_hp;
    if (f >= 1) return "unhurt";
    if (f > 0.66) return "scratched";
    if (f > 0.33) return "wounded";
    return "near death";
  }

  // "You hack at a scabby rat" — the verb varies by the weapon in your hand,
  // then the caller tacks on " for N" and the rest. A cutting edge cuts, a
  // maul cracks, a spear drives, a bare fist clouts, a plain blade just hits.
  private playerHit(weapon: { tmpl: ItemTemplate } | null | undefined, name: string): string {
    const t = weapon?.tmpl;
    const family: keyof typeof PLAYER_HIT = !t
      ? "fist"
      : t.bleed > 0 ? "edge"
      : t.stun > 0 ? "blunt"
      : t.sweep > 1 || t.speed > 1 ? "spear"
      : "plain";
    return "You " + pick(PLAYER_HIT[family]).replace(/\{n\}/g, name);
  }

  // "A scabby rat sinks its teeth into you" — the register follows the kind of
  // thing swinging: teeth for the living beasts, cold weight for the drowned,
  // a thin knife for the cutpurses, dead bone for the hollow, a plain blow else.
  private creatureHit(templateId: string): string {
    const pool = DROWNERS.has(templateId) ? CREATURE_HIT.water
      : THIEVES.has(templateId) ? CREATURE_HIT.knife
      : BITERS.has(templateId) ? CREATURE_HIT.teeth
      : HOLLOW.has(templateId) ? CREATURE_HIT.bone
      : CREATURE_HIT.plain;
    return pick(pool);
  }

  // Carried loot lives ON the holder. An elite spawns bearing its gear (or not)
  // by a roll — so the prize is visible before the fight, and killing an armed
  // one always spills it. Fodder and pups bear nothing.
  private rollCarry(tmpl: MobTemplate): string[] | undefined {
    if (tmpl.gear_item && chance(tmpl.gear_drop)) return [tmpl.gear_item];
    return undefined;
  }

  // How many creatures stand in a room right now (for crowd/convergence caps).
  private creaturesIn(roomId: string): number {
    let n = 0;
    for (const c of this.creatures.values()) if (c.roomId === roomId) n++;
    return n;
  }

  // Locked & full (openable) until the moment it's looted, then sprung and
  // empty until its refill clock runs out.
  private cacheLocked(cache: Cache): boolean {
    return Date.now() >= (this.cacheSpent.get(cache.id) ?? 0);
  }

  // A scavenger alone in a room drags off gear left on the floor (a body's
  // spoils) and carries it — recover it by running the thing down and killing
  // it. It won't snatch loot from a player's feet: only an empty room is fair
  // game, so your own fresh kill is safe while you're standing over it.
  private scavengerScoops(creature: Creature): void {
    if (!SCAVENGERS.has(creature.templateId)) return;
    if (this.playerPresent(creature.roomId)) return;
    const floor = this.ground.get(creature.roomId);
    if (!floor?.length) return;
    // Real gear only — it has no use for food (it eats that) or the free rock.
    const idx = floor.findIndex((id) => {
      const t = this.world!.itemTemplates.get(id);
      return !!t && t.slot !== "" && t.id !== "loose-rock";
    });
    if (idx === -1) return;
    const [id] = floor.splice(idx, 1);
    this.ground.set(creature.roomId, floor);
    (creature.carries ??= []).push(id);
    const g = this.world!.itemTemplates.get(id);
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    if (g) this.roomFeed(creature.roomId, `${cap(tmpl.name)} snatches up ${g.name} and drags it off into the dark.`);
    this.refreshRoomCtx(creature.roomId);
  }

  // The room-line clause for what a creature visibly bears: "clad in warden's
  // plate", "wielding a graveblade", "dragging a bone shiv". No leading article.
  private bearsClause(creature: Creature): string {
    if (!creature.carries?.length) return "";
    const clauses: string[] = [];
    for (const id of creature.carries) {
      const t = this.world!.itemTemplates.get(id);
      if (!t) continue;
      const verb = t.slot === "weapon" ? "wielding" : t.slot === "" ? "dragging" : "clad in";
      clauses.push(`${verb} ${t.name}`);
    }
    return clauses.length ? `, ${clauses.join(" and ")}` : "";
  }

  private findCreatureIn(roomId: string, arg: string): Creature | null {
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== roomId) continue;
      const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
      if (nameMatches(tmpl.name, arg)) return creature;
    }
    return null;
  }

  private findItemIn(itemIds: string[], arg: string): string | null {
    for (const id of itemIds) {
      const t = this.world!.itemTemplates.get(id);
      if (t && nameMatches(t.name, arg)) return id;
    }
    return null;
  }

  private findCarried(session: Session, arg: string): CarriedItem | null {
    for (const c of session.items) {
      const t = this.world!.itemTemplates.get(c.itemId);
      if (t && nameMatches(t.name, arg)) return c;
    }
    return null;
  }

  // The sharpest thing in the pack does the biting — no wield verb needed.
  // The item worn/wielded in a given slot, or null. At most one per slot.
  private equippedItem(session: Session, slot: string): { carried: CarriedItem; tmpl: ItemTemplate } | null {
    for (const c of session.items) {
      if (!c.equipped) continue;
      const t = this.world!.itemTemplates.get(c.itemId);
      if (t && t.slot === slot) return { carried: c, tmpl: t };
    }
    return null;
  }

  // A stat scaled by how worn the gear is: a dull blade bites softer, thinned
  // mail turns less. Rounds up, so a piece keeps a sliver of use until it breaks.
  private effStat(base: number, condition: number): number {
    if (base <= 0) return 0;
    return Math.max(0, Math.ceil(base * Math.max(0, condition) / 100));
  }
  private effDmg(g: { carried: CarriedItem; tmpl: ItemTemplate }): number {
    return this.effStat(g.tmpl.dmg, g.carried.condition);
  }

  // Every equipped piece, so armor and weight can sum across the whole kit.
  private *equippedAll(session: Session): Generator<{ carried: CarriedItem; tmpl: ItemTemplate }> {
    for (const c of session.items) {
      if (!c.equipped) continue;
      const t = this.world!.itemTemplates.get(c.itemId);
      if (t) yield { carried: c, tmpl: t };
    }
  }

  // Total damage the worn kit turns away from each hit that lands — the SUM of
  // every armor-bearing slot (body, helm, feet, cloak), each scaled by its wear.
  private equippedArmor(session: Session): number {
    let total = 0;
    for (const g of this.equippedAll(session)) {
      if (ARMOR_SLOTS.has(g.tmpl.slot) && g.tmpl.armor > 0) total += this.effStat(g.tmpl.armor, g.carried.condition);
    }
    return total;
  }

  // The burden you carry: the SUM of every equipped piece's weight — armor,
  // shield, AND the weapon in your hand. 0 total = quick on your feet (dodge,
  // clean flight); a heavy blade costs you your footwork same as heavy plate.
  private wornWeight(session: Session): number {
    let total = 0;
    for (const g of this.equippedAll(session)) total += g.tmpl.weight;
    return total;
  }

  // The best shield on your arm gives its block chance (scaled by wear).
  private equippedBlock(session: Session): number {
    const s = this.equippedItem(session, "shield");
    if (!s || s.tmpl.block <= 0) return 0;
    return s.tmpl.block * Math.max(0, s.carried.condition) / 100;
  }

  // A one-word read on how worn a piece is, for the inventory line.
  private conditionWord(cond: number): string {
    if (cond >= 85) return "";        // pristine — no tag
    if (cond >= 60) return "worn";
    if (cond >= 35) return "battered";
    if (cond >= 15) return "failing";
    return "nearly broken";
  }

  // Grind a piece down. Sealed gear is frozen (the seal holds the dungeon off);
  // provisional gear wears, and at 0 it's gone — worn through, mid-life.
  private async wear(session: Session, carried: CarriedItem, tmpl: ItemTemplate, amount: number): Promise<void> {
    if (carried.serial !== null) return; // sealed: neither use nor damp touches it
    carried.condition -= amount;
    if (carried.condition > 0) return;
    const idx = session.items.indexOf(carried);
    if (idx >= 0) session.items.splice(idx, 1);
    await removeItemRow(this.env.DB, carried.rowId);
    this.send(session, `${cap(tmpl.name)} is worn through — it comes apart in your ${tmpl.slot === "weapon" ? "grip" : "hands"} and is gone.`);
    this.refreshRoomCtx(session.roomId);
  }

  private findPlayerIn(roomId: string, arg: string): Session | null {
    for (const s of this.sessions.values()) {
      if (s.roomId === roomId && s.name.toLowerCase().startsWith(arg)) return s;
    }
    return null;
  }

  // ---- messages out ----

  // A line to one wanderer. `cls` is an optional semantic tag (dmgin, dmgout,
  // kill, fumble, death, gain — with "big" for the loud ones) so the client
  // colors combat by MEANING, not by matching prose. This is what lets the
  // dialogue vary freely without the coloring ever falling out of step.
  private send(session: Session, text: string, cls?: string): void {
    try {
      session.ws.send(JSON.stringify(cls ? { v: 0, kind: 24912, text, cls } : { v: 0, kind: 24912, text }));
    } catch {}
  }

  private sendStatus(session: Session): void {
    const room = this.world?.rooms.get(session.roomId);
    try {
      session.ws.send(
        JSON.stringify({
          v: 0,
          t: "status",
          name: session.name,
          named: session.named ? 1 : 0,
          hp: session.hp,
          max_hp: session.maxHp,
          room: room?.name ?? session.roomId,
        }),
      );
    } catch {}
  }

  // UI helper (like status, not protocol): everything you could do right here,
  // as ready-to-send commands. The client renders these as tappable chips.
  private sendCtx(session: Session): void {
    const world = this.world;
    if (!world) return;
    const fighting = this.inCombat(session);
    session.ctxCombat = fighting;
    // When steel is out, the chips narrow to the fight — in EVERY room. No
    // resting, banking, chatting, or reading the walls while something swings
    // at you; only what the fight allows (see "Combat narrows the world").
    const suggest: string[] = [];

    // The living get initiative: attack chips first, for every foe in the room.
    // A lurker lying in wait is unseen — no chip gives it away, same as the room
    // description holds its tongue.
    let creatureHere = false;
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== session.roomId) continue;
      if (LURKERS.has(creature.templateId) && creature.hidden && !creature.target) continue;
      creatureHere = true;
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      suggest.push(`attack ${shortName(tmpl.name)}`);
    }
    // A throwable in hand and something to throw it at: offer the opener.
    if (creatureHere) {
      const throwable = session.items.find(
        (c) => c.serial === null && (world.itemTemplates.get(c.itemId)?.dmg ?? 0) > 0,
      );
      const firstMob = [...this.creatures.values()].find((c) => c.roomId === session.roomId);
      if (throwable && firstMob) {
        const mobT = world.mobTemplates.get(firstMob.templateId)!;
        suggest.push(`throw ${shortName(world.itemTemplates.get(throwable.itemId)!.name)} at ${shortName(mobT.name)}`);
      }
    }
    // With a fight in the room (or already in one), offer the other stances.
    if (creatureHere || fighting) {
      for (const s of ["reckless", "steady", "guarded"] as const) {
        if (s !== session.stance) suggest.push(`stance ${s}`);
      }
    }
    // Exits: fleeing is a fight decision, so they stay live in combat too.
    // Canonical compass order (n·s·e·w·u·d), so directions never shuffle
    // between rooms — the client pins them to fixed slots on top of this.
    const exitsHere = [...(world.exits.get(session.roomId) ?? [])].sort(
      (a, b) => (DIR_ORDER[a.dir] ?? 9) - (DIR_ORDER[b.dir] ?? 9),
    );
    for (const e of exitsHere) suggest.push(`go ${e.dir}`);
    // Combat-legal at the cost of an opening: stoop for a fallen weapon, eat,
    // or swap your steel (armor on/off is refused mid-fight, so no armor chip).
    for (const itemId of this.ground.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(itemId);
      if (t) suggest.push(`get ${shortName(t.name)}`);
    }
    for (const inst of this.groundInstances.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(inst.itemId);
      if (t) suggest.push(`get ${shortName(t.name)}`);
    }
    // Journal in hand and a foe to watch: study it (mid-fight it's an opening).
    if (creatureHere && session.items.some((c) => c.journalId)) {
      const firstMob = [...this.creatures.values()].find(
        (c) => c.roomId === session.roomId && !(LURKERS.has(c.templateId) && c.hidden && !c.target),
      );
      if (firstMob) suggest.push(`study ${shortName(world.mobTemplates.get(firstMob.templateId)!.name)}`);
    }
    const edible = session.items.find((c) => world.itemTemplates.get(c.itemId)?.edible);
    if (edible) suggest.push(`eat ${shortName(world.itemTemplates.get(edible.itemId)!.name)}`);
    const gearless = session.items.find((c) => {
      if (c.equipped) return false;
      const t = world.itemTemplates.get(c.itemId);
      if (!t || !!this.equippedItem(session, t.slot)) return false;
      // mid-fight only a weapon may be readied; out of combat, any worn slot.
      return t.slot !== "" && (t.slot === "weapon" || !fighting);
    });
    if (gearless) suggest.push(`equip ${shortName(world.itemTemplates.get(gearless.itemId)!.name)}`);

    // A locked cache here that you hold the key to: one chip opens it.
    if (!fighting) {
      for (const cache of world.caches) {
        if (cache.roomId !== session.roomId || !this.cacheLocked(cache)) continue;
        if (session.items.some((c) => c.itemId === cache.keyItem)) suggest.push(`unlock ${shortName(cache.name)}`);
      }
    }

    // The peacetime chips — the whole calm world — only when nothing's on you.
    if (!fighting) {
      suggest.unshift("look");
      // No rest chip with something visible in the room — cmdRest refuses it, so
      // the chip would only bait a dead tap.
      if (session.hp < session.maxHp && !session.resting && !creatureHere) suggest.push("rest");
      // The one fishing spot: a line off the Pocket of Air's shelf.
      if (FISHING_ROOMS.has(session.roomId)) suggest.push("fish");
      // The gate's trades: the keeper's hatch (the client opens the trade
      // modal), and the forge if you carry the makings. A typed trade left
      // open still offers the tender chips.
      if (world.entryRooms.has(session.roomId)) {
        if (world.fenceStock.length) suggest.push(TRADE_CHIP);
        if (session.items.some((c) => c.itemId === SCRAP_ID && c.serial === null)) suggest.push("forge");
        if (session.buying && !session.trading) {
          const offered = new Set<string>();
          for (const c of session.items) {
            if (c.serial !== null || session.buying.escrow.some((e) => e.row === c.rowId)) continue;
            const t = world.itemTemplates.get(c.itemId);
            if (!t || (t.barter ?? 0) <= 0 || offered.has(t.id)) continue;
            offered.add(t.id);
            suggest.push(`offer ${shortName(t.name)}`);
            if (offered.size >= 4) break;
          }
          suggest.push("offer nothing");
        }
      }
      // The lockbox chip is always up (out of combat): step aside anywhere to
      // sort your run closet, safe from any knife. The vault + seal only work
      // at a gate — the modal shows them only there.
      suggest.push(BENCH_CHIP);
      // Knowledge you carry: open a map or the journal (each pops its modal).
      if (session.items.some((c) => MAP_ITEMS.has(c.itemId))) suggest.push("map");
      if (session.items.some((c) => c.journalId)) suggest.push("journal");
      if (session.items.length > 0) suggest.push("inventory");
      suggest.push("say …", "help");
    }
    // Two rats in a room shouldn't mean two identical chips.
    const unique = [...new Set(suggest)];
    try {
      session.ws.send(JSON.stringify({ v: 0, t: "ctx", suggest: unique, combat: fighting }));
    } catch {}
  }

  // Room contents changed: refresh the chips of everyone standing there.
  private refreshRoomCtx(roomId: string): void {
    for (const s of this.sessions.values()) {
      if (s.roomId === roomId) this.sendCtx(s);
    }
  }

  // Combat begins and ends in many places (attack, ambush, a grudge walking
  // in, the last foe dying, fleeing). Rather than trust every one of them to
  // remember the chips, sweep: anyone whose combat state no longer matches
  // what their chips were drawn for gets a fresh set. Runs after every
  // command and every tick — the chip lock holds in ALL rooms.
  private syncCombatCtx(): void {
    for (const s of this.sessions.values()) {
      if (!s.away && this.inCombat(s) !== s.ctxCombat) this.sendCtx(s);
    }
  }

  // ---- sound: text renders it better than graphics render anything ----
  // A noisy event in one room is heard, degraded and directional, in every
  // room with an open exit toward it. Closed iron blocks sound. "{dir}" in
  // the template becomes "to the east" / "from below" for each listener.
  private roomSound(sourceRoomId: string, template: string, excludeRoomId?: string): void {
    const world = this.world;
    if (!world) return;
    const heard = new Set<string>();
    for (const [rid, exits] of world.exits) {
      if (rid === sourceRoomId || rid === excludeRoomId) continue;
      const toward = exits.find(
        (e) => e.to_room === sourceRoomId && (!e.key_item || this.openDoors.has(`${rid}:${e.dir}`)),
      );
      if (!toward) continue;
      const line = template.replace("{dir}", dirPhrase(toward.dir));
      const frame = JSON.stringify({ v: 0, kind: 24913, room: rid, text: line });
      for (const s of this.sessions.values()) {
        if (s.roomId !== rid || heard.has(s.pubkey)) continue;
        heard.add(s.pubkey);
        try { s.ws.send(frame); } catch {}
      }
    }
  }

  // A fight is continuous noise; ring out at most once per window per room.
  private combatNoiseAt = new Map<string, number>();
  private combatNoise(roomId: string): void {
    const now = Date.now();
    if ((this.combatNoiseAt.get(roomId) ?? 0) + COMBAT_NOISE_EVERY_MS > now) return;
    this.combatNoiseAt.set(roomId, now);
    this.roomSound(roomId, "The sounds of a fight echo {dir}.");
    this.creatureNoise(roomId);
  }

  // Creatures have ears too. Player-made noise makes everything idle in
  // earshot curious — it comes to look, soon. Creature-made sounds never
  // attract (no feedback loops); quiet players attract nothing.
  private creatureNoise(sourceRoomId: string): void {
    const world = this.world;
    if (!world) return;
    // A room already full of the curious doesn't pull in more — that's what
    // turned the central hub into a black hole that swallowed the whole zone.
    if (this.creaturesIn(sourceRoomId) >= CROWD_CAP) return;
    const now = Date.now();
    for (const c of this.creatures.values()) {
      if (c.target || c.roomId === sourceRoomId) continue;
      const tmpl = world.mobTemplates.get(c.templateId)!;
      if (tmpl.is_boss) continue; // the King waits; the noise comes to him
      if (DROWNERS.has(c.templateId)) continue; // it holds its water; noise doesn't move it
      // Not every ear pricks up. A good majority come to look; the rest keep
      // to their own business — so a fight draws a crowd, not the whole zone.
      if (!chance(NOISE_HEED_ODDS)) continue;
      const exits = world.exits.get(c.roomId) ?? [];
      const toward = exits.find(
        (e) => e.to_room === sourceRoomId && (!e.key_item || this.openDoors.has(`${c.roomId}:${e.dir}`)),
      );
      if (!toward) continue;
      c.curious = sourceRoomId;
      c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(3000, 8000));
    }
  }

  // The spectator feed, kind 24913: to everyone standing in the room, and —
  // when the relay door is open — to anyone anywhere watching t=mudroom-<id>.
  private roomFeed(roomId: string, text: string, exceptPubkey?: string): void {
    const frame = JSON.stringify({ v: 0, kind: 24913, room: roomId, text });
    for (const s of this.sessions.values()) {
      if (s.roomId !== roomId || s.pubkey === exceptPubkey) continue;
      try { s.ws.send(frame); } catch {}
    }
    this.relayFeed("mudroom-" + roomId, text);
  }

  private roomFeedAll(text: string): void {
    const frame = JSON.stringify({ v: 0, kind: 24913, room: "*", text });
    for (const s of this.sessions.values()) {
      try { s.ws.send(frame); } catch {}
    }
    this.relayFeed("mudzone-" + (this.world?.zone ?? "door"), text);
  }

  // Outbound relay door: fire-and-forget, only when something happened —
  // an idle dungeon publishes nothing and costs nothing.
  private relayFeed(roomTag: string, text: string): void {
    if (!this.world || !isGameKeyConfigured(this.env) || relayList(this.env).length === 0) return;
    try {
      const ev = signFeedEvent(this.env, roomTag, this.world.zone, text);
      this.state.waitUntil(publishEvent(this.env, ev));
    } catch {}
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dirPhrase(dir: string): string {
  if (dir === "up") return "from above";
  if (dir === "down") return "from below";
  return "to the " + dir;
}

// "a scabby rat" -> "rat", "the Forgotten King" -> "king": the word a player
// would naturally type, and one nameMatches() is guaranteed to accept.
function shortName(name: string): string {
  const words = name.toLowerCase().split(/\s+/).filter((w) => w !== "a" && w !== "an" && w !== "the");
  return words[words.length - 1] ?? name.toLowerCase();
}

// "attack rat" should hit "a scabby rat"; articles don't count.
function nameMatches(name: string, arg: string): boolean {
  const n = name.toLowerCase();
  if (n.includes(arg)) return true;
  const words = n.split(/\s+/).filter((w) => w !== "a" && w !== "an" && w !== "the");
  const argWords = arg.split(/\s+/);
  return argWords.every((aw) => words.some((w) => w.startsWith(aw)));
}
