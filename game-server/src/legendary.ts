// EVERY LEGENDARY HAS ONE THING NOTHING ELSE HAS (rome, 2026-11-17). See
// legendaries.md at the repo root for the whole plan and what was turned down.
//
// A legendary used to be a good item with a gold name: every trait on one was
// also on ordinary gear. Now each carries one SIGNATURE, a tag on its own
// template row that no other row in the game carries, and each signature
// pushes a mechanic the game already has further than any other item can.
// The soft bonus traits (quiet, padded, keen and the rest) came off them in
// mig 402, and every legendary copy rolls the lottery at least once instead
// (zone.rollTraits), so two copies of one legendary can differ. What the item
// IS stays: reach, two-handed, a wall, a pierce, the flail's trip.
//
// The tags live in item_templates.traits like every other trait (the trait
// ledger, 098), so wearsTrait/itemRolled read them with no special path. This
// file holds only what the tags mean in words and the few helpers more than
// one site needs; each mechanic is a line at its own site, marked SIGNATURE.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import type { CarriedItem } from "./world";

export const SIG = {
  upright: "sig-upright",           // last-watch: poise at POISE_CAP
  clotting: "sig-clotting",         // hulks-iron: your bleeds stop after one tick
  unshaken: "sig-unshaken",         // the-tenor-bell: never caught off balance
  glancing: "sig-glancing",         // mirror-plate: no critical hits on you
  unparted: "sig-unparted",         // the-great-shell: no parting blow
  dryPack: "sig-dry-pack",          // still-water-shroud: nothing carried rusts
  chillProof: "sig-chill-proof",    // long-hunger-shroud: never catch the chill
  hearth: "sig-hearth",             // pale-scale-mantle: rest heals at the fire's rate
  unstalked: "sig-unstalked",       // the-white-roe: no wolf test, no cat stalk
  coldKeep: "sig-cold-keep",        // the-cold-lining: pack food spoils at half speed
  silent: "sig-silent",             // pale-tread: walking makes no noise
  untiring: "sig-untiring",         // the-carriers-mile: walking tires half as much
  trackless: "sig-trackless",       // the-snow-road: no footprints
  headStart: "sig-head-start",      // the-head-start: chasers come through twice as late
  steadyHands: "sig-steady-hands",  // marrow-crown: badly hurt never makes you clumsy
  unburdened: "sig-unburdened",     // bounds-hood: dodge as if unloaded
  bearGuard: "sig-bear-guard",      // the-last-bear: guarded keeps 0.8 of your damage
  muffled: "sig-muffled",           // the-bearded-cowl: your fights draw nothing from next door
  watchRoom: "sig-watch-room",      // captains-wall: your guard covers the room
  setWall: "sig-set-wall",          // drake-scale-shield: double guarded block
  twoAbreast: "sig-two-abreast",    // the-turnpike: only two blows a round on you
  attaint: "sig-attaint",           // the-attainder: ambush x2
  killingPoint: "sig-killing-point",// houndsbane: crits twice as often
  allTools: "sig-all-tools",        // the-hedge-bill: every house tool, the work in one go
  sureSwing: "sig-sure-swing",      // the-long-crossing: reckless never misses
  legTaker: "sig-leg-taker",        // lash-flail: every landed blow trips
  longBleed: "sig-long-bleed",      // the-harvest: its cuts bleed five ticks
  unwearing: "sig-unwearing",       // the-filed-edge: never wears
  sureGrip: "sig-sure-grip",        // the-long-tooth: never fumbles
  unfound: "sig-unfound",           // sleepers-flag: no creature finds your vitals (mig 410)
  heldBreath: "sig-held-breath",    // swallowed-boots: a drowner never drags you under (mig 410)
} as const;

// The numbers the signatures move to. Each names the ordinary constant it beats.
export const SIG_BLEED_TICKS = 1;          // hulks-iron, against BLEED_TICKS 3
export const SIG_GUARDED_ATK = 0.8;        // the-last-bear, against STANCE.guarded.atk 0.6
export const SIG_DOGPILE = 2;              // the-turnpike, against DOGPILE_CAP 3
export const SIG_AMBUSH_MULT = 2;          // the-attainder, against AMBUSH_MULT 1.5
export const SIG_CRIT_CHANCE = 0.10;       // houndsbane, against CRIT_CHANCE 0.05
export const SIG_HARVEST_BLEED_TICKS = 5;  // the-harvest, against BLEED_TICKS 3
export const SIG_WALK_MULT = 0.5;          // the-carriers-mile: walking's tiredness cost
export const SIG_CHASE_LAG_MULT = 2;       // the-head-start: a chaser's lag behind you
export const SIG_FOOD_AGE_MULT = 0.5;      // the-cold-lining: as the den larder
export const SIG_FOOD_SAVE_MS = 60_000;    // the-cold-lining: how often the slowed clock is written

// What `look` and the gate's gear sheet say. The sentence is the item talking;
// the bracket is the mechanic, as the rolled traits do it (ROLLED_TELL).
export const SIG_TELL: Record<string, string> = {
  [SIG.upright]: "It holds you upright the way a post holds a gate; whatever lands, you are still standing in it (resists stuns and grabs, at its fullest).",
  [SIG.clotting]: "Iron that close to the skin keeps the blood in you; a cut under it closes almost as it opens (bleeds stop after one beat).",
  [SIG.unshaken]: "A bell that heavy does not swing; when you slip, it does not go with you (never caught off balance).",
  [SIG.glancing]: "A blow finds nothing to bite on; the polish turns it before it lands true (no critical hits on you).",
  [SIG.unparted]: "You can turn your back in it; nothing gets a last blow in as you go (no parting blow).",
  [SIG.dryPack]: "Nothing under it has ever known damp; the pack beneath stays as dry as the day it was packed (nothing you carry rusts).",
  [SIG.chillProof]: "The cold and the wet never get into your chest under it (you never catch the chill).",
  [SIG.hearth]: "It holds a warmth of its own; wherever you rest in it you rest as if by a fire (fire-rate healing).",
  [SIG.unstalked]: "The wild takes you for something it has already seen and let pass (no wolf tests you, no cat springs).",
  [SIG.coldKeep]: "Food under it keeps as if it were in a cellar (food spoils at half speed).",
  [SIG.silent]: "Not a sound, not a stone turned (walking is silent).",
  [SIG.untiring]: "The weight comes down through the heel and goes into the road, not into you (walking tires you half as much).",
  [SIG.trackless]: "Wherever these go, the ground forgets them (you leave no tracks).",
  [SIG.headStart]: "Whatever follows you through a door comes through late (chasers fall twice as far behind).",
  [SIG.steadyHands]: "Hurt as you are, your hands stay your own (no clumsiness when badly hurt).",
  [SIG.unburdened]: "It moves you as if you carried nothing (dodge as if unloaded).",
  [SIG.bearGuard]: "Behind your guard you still hit like a bear (guarded keeps most of your damage).",
  [SIG.muffled]: "Whatever you fight in it, the next room never hears (your fights draw nothing in).",
  [SIG.watchRoom]: "Stand guard behind it and the whole room is under your watch (your guard covers everyone with you).",
  [SIG.setWall]: "Set it and wait, and very little gets past (guarded blocks twice as much).",
  [SIG.twoAbreast]: "No more than two get past the bar at a time (only two can strike you a round).",
  [SIG.attaint]: "What never saw you coming never sees anything again (ambush ×2).",
  [SIG.killingPoint]: "It finds the place that ends it, twice as often as luck should (critical hits double).",
  [SIG.allTools]: "Axe, hammer, pick and knife in one; there is no work on a house it cannot do (every building tool, half the time).",
  [SIG.sureSwing]: "All the weight of the swing goes where you send it (reckless never misses).",
  [SIG.legTaker]: "The chain goes round the legs every time it lands (every hit trips).",
  [SIG.longBleed]: "What it opens stays open (its cuts bleed longer).",
  [SIG.unwearing]: "Filed so many times there is nothing left to wear (never wears).",
  [SIG.sureGrip]: "It never turns in the hand (never fumbles).",
  [SIG.unfound]: "Held over you it covers every place a blow could end it (no creature finds your vitals).",
  [SIG.heldBreath]: "Whoever wore them went down into the black water and walked back up out of it (a drowner never drags you under).",
};
// The gear sheet's short "does" column (gate.ts, beside TRAIT_DOES): the bracket alone.
export const SIG_DOES: Record<string, string> = Object.fromEntries(
  Object.entries(SIG_TELL).map(([k, v]) => [k, v.slice(v.lastIndexOf("(") + 1, -2)]),
);
// The gear sheet names a trait by its tag; a signature's tag is code, so it shows this.
export const SIG_NAME = "its own";

// A ROLL A SIGNATURE MAKES POINTLESS is never drawn for that item (rollTraits),
// as a trait its material cannot carry is never drawn: every roll does something.
export const SIG_DEAD_ROLLS: Record<string, string[]> = {
  [SIG.unwearing]: ["tempered", "brittle"],   // only wear moves them
  [SIG.dryPack]: ["greased", "pitted"],       // only rust moves them
  [SIG.clotting]: ["staunched"],              // already clots at the floor
  // Not the chill-proof shroud's sodden: sodden also costs rest in the cold
  // (COLD_REST_SKIP), which the shroud does not touch, so it still bites there.
};

/** The one signature a template carries, if any. */
export function sigOf(traits: string | null | undefined): string | undefined {
  for (const t of (traits ?? "").split(",")) if (t.startsWith("sig-")) return t.trim();
  return undefined;
}

/** Captain's Wall: someone in this room stands guard holding it. */
export function roomWatched(z: ZoneDO, roomId: string): boolean {
  for (const s of z.sessions.values()) {
    if (s.roomId === roomId && s.pose === "guard" && !z.outOfWorld(s) && s.hp > 0 && z.wearsTrait(s, SIG.watchRoom)) return true;
  }
  return false;
}

/** The Bearded Cowl: someone fighting in this room wears it, so the fight's noise goes nowhere. */
export function fightMuffled(z: ZoneDO, roomId: string): boolean {
  for (const s of z.sessions.values()) {
    if (s.roomId === roomId && z.inCombat(s) && z.wearsTrait(s, SIG.muffled)) return true;
  }
  return false;
}

// THE COLD LINING. The pack's food runs on a clock read from acquired_at (zone-
// util foodState), so slowing it is the larder's trick (den.rustShelf): hand
// back part of the time that passed by moving the stamp forward. Done in memory
// every beat, written once a minute so a deploy loses at most that minute.
const coldAt = new Map<string, number>();   // pubkey -> ms the clock was last handed back
const coldSaved = new Map<string, number>(); // pubkey -> ms it was last written
export async function tickColdLining(z: ZoneDO, now: number, perishes: (itemId: string) => boolean): Promise<void> {
  for (const s of z.sessions.values()) {
    if (!z.wearsTrait(s, SIG.coldKeep)) { coldAt.delete(s.pubkey); continue; }
    const last = coldAt.get(s.pubkey);
    coldAt.set(s.pubkey, now);
    if (last === undefined) continue;
    const back = (now - last) / 1000 * (1 - SIG_FOOD_AGE_MULT);
    const food: CarriedItem[] = s.items.filter((c) => c.acquiredAt !== undefined && perishes(c.itemId));
    if (!food.length) continue;
    for (const c of food) c.acquiredAt! += back;
    if (now - (coldSaved.get(s.pubkey) ?? 0) < SIG_FOOD_SAVE_MS) continue;
    coldSaved.set(s.pubkey, now);
    for (const c of food) {
      await z.env.DB.prepare("UPDATE player_items SET acquired_at = ? WHERE id = ?").bind(Math.floor(c.acquiredAt!), c.rowId).run();
    }
  }
}

/** Is this session the one wearing the given signature? Shorthand for the sites. */
export const wears = (z: ZoneDO, s: Session | undefined, tag: string): boolean => !!s && z.wearsTrait(s, tag);
