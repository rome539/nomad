// WAYS OF FIGHTING (rome, 2026-10-05). The spine's creature round asks this file
// how hard the blow it is about to land should be, and whether it knocks you
// down; the player's round asks how much a blow lands on a creature that has
// spent itself. Every answer comes from the state of the fight - how long since
// it last struck, how many blows it has thrown, who is leading the pack - never
// from counting rounds. The sets and dials are in zone-data (CHARGERS, HEAVIES,
// PACKS).
import type { ZoneDO } from "./zone";
import type { Creature, Session } from "./zone-types";
import type { MobTemplate } from "./world";
import { hasTrait } from "./world";
import { chance } from "./rng";
import { cap } from "./zone-util";
import { airborne } from "./ai";
import type { CarriedItem, ItemTemplate } from "./world";
import {
  SWARMS, SWARM_STEP, SWARM_MAX_OTHERS, STRIKERS, STRIKER_DODGE, STRIKER_DODGE_BARE,
  FLIERS, FLIER_DIVE_ODDS, FLIER_DIVE_OPEN, PINCHERS, PIN_ODDS, PINNED_DMG_MULT,
  HOLLOW, GRAVE_FLESH, HOLLOW_EDGE_MULT, HOLLOW_BLUNT_MULT, LURKERS, LURKER_FADE_ODDS, LURKER_DROP_MULT,
  CUTTHROATS, FEINT_ODDS, FOLK, FOLK_GUARD_AT, FOLK_RECKLESS_AT, STANCE, COMBAT_ROUND_MS,
  CHARGERS, CHARGE_MULT, CHARGE_REST_MS, BLOWN_MS, BLOWN_TAKEN_MULT,
  HEAVIES, HEAVY_KNOCK_ODDS, HEAVY_TIRED_AT, HEAVY_TIRE_STEP, HEAVY_TIRED_FLOOR, HEAVY_REST_MS,
  PACKS, PACK_LEADS, PACK_FLANK_MULT, PACK_LEADERLESS_MS,
} from "./zone-data";

export interface Blow { mult: number; line?: string; flourish?: string; knock: boolean; pin: boolean; feint: boolean }

// The creature is about to land a blow on `victim`. Call once per landed blow.
export function creatureBlow(z: ZoneDO, creature: Creature, tmpl: MobTemplate, victim: Session, now: number): Blow {
  const id = creature.templateId;
  const out: Blow = { mult: 1, knock: false, pin: false, feint: false };
  const standing = !creature.lastBlowAt || now - creature.lastBlowAt > CHARGE_REST_MS;

  if (CHARGERS.has(id) && standing) {
    creature.blownUntil = now + BLOWN_MS;
    const weapon = z.equippedItem(victim, "weapon");
    if (weapon && hasTrait(weapon.tmpl, "reach")) {
      out.line = `${cap(tmpl.name)} comes at you head-down, and you set ${weapon.tmpl.name} against it. The point takes the worst of the charge.`;
    } else {
      out.mult *= CHARGE_MULT;
      out.line = `${cap(tmpl.name)} drops its head and comes at you at full tilt.`;
    }
  }

  if (HEAVIES.has(id)) {
    if (!creature.lastBlowAt || now - creature.lastBlowAt > HEAVY_REST_MS) creature.fatigue = 0;
    const tired = creature.fatigue ?? 0;
    out.mult *= Math.max(HEAVY_TIRED_FLOOR, 1 - tired * HEAVY_TIRE_STEP);
    out.knock = tired < HEAVY_TIRED_AT && chance(HEAVY_KNOCK_ODDS * (victim.stance === "guarded" ? 0.5 : 1));
    creature.fatigue = tired + 1;
    if (creature.fatigue === HEAVY_TIRED_AT) {
      z.roomFeed(creature.roomId, `${cap(tmpl.name)}'s sides are heaving now. Its blows have gone heavy and slow.`, undefined, false);
    }
  }

  if (PACKS[id] && victim.target !== creature.id && flanking(z, creature, victim, now)) {
    out.mult *= PACK_FLANK_MULT;
    out.flourish = ", coming in from the side.";
  }

  if (SWARMS.has(id)) {
    swarmThins(z, creature.roomId, victim.pubkey);
    const others = swarmOn(z, creature.roomId, victim.pubkey) - 1;
    out.mult *= 1 + Math.min(SWARM_MAX_OTHERS, Math.max(0, others)) * SWARM_STEP;
  }

  // A bite commits it: for a round it is where your blade is.
  if (STRIKERS.has(id)) creature.openUntil = now + COMBAT_ROUND_MS + 1000;

  if (creature.dropping) {
    creature.dropping = false;
    out.mult *= LURKER_DROP_MULT;
    out.line = `${cap(tmpl.name)} comes back out of the dark at you.`;
  }

  if (PINCHERS.has(id) && !victim.seizedBy && chance(PIN_ODDS)) out.pin = true;
  if (CUTTHROATS.has(id) && !victim.staggered && chance(FEINT_ODDS)) out.feint = true;

  if (FOLK.has(id)) out.mult *= STANCE[folkStance(z, creature, tmpl)].atk;

  creature.lastBlowAt = now;
  return out;
}

// Before a creature's turn in the round. True = it does not attack this round.
export function beforeAttack(z: ZoneDO, creature: Creature, tmpl: MobTemplate, victim: Session, now: number): boolean {
  creature.dropping = false;
  const id = creature.templateId;
  // A lurker in the dark it came out of goes back into it, and comes again.
  if (LURKERS.has(id)) {
    if (creature.hidden) {
      creature.hidden = false;
      creature.dropping = true;
      z.refreshRoomCtx(creature.roomId); // back in the picture
      return false;
    }
    if (!z.litFor(victim) && chance(LURKER_FADE_ODDS)) {
      creature.hidden = true;
      z.send(victim, `${cap(tmpl.name)} is not in front of you any more. Somewhere in the dark, it waits.`, "dmgin");
      z.refreshRoomCtx(creature.roomId); // gone from the picture
      return true;
    }
  }
  // A flier comes down when it sees an opening, and otherwise stays up.
  if (FLIERS.has(id)) {
    const open = victim.staggered || victim.hp < victim.maxHp / 3;
    const up = airborne(creature, now);
    if (chance(open ? FLIER_DIVE_OPEN : FLIER_DIVE_ODDS)) {
      if (up) z.send(victim, `${cap(tmpl.name)} folds its wings and drops at you.`, "dmgin");
      creature.airborneUntil = undefined;
      if (up) z.refreshRoomCtx(creature.roomId); // down out of the sky in the picture
      return false;
    }
    if (!up) z.send(victim, `${cap(tmpl.name)} lifts off out of reach and wheels overhead.`);
    creature.airborneUntil = now + COMBAT_ROUND_MS + 1000;
    if (!up) z.refreshRoomCtx(creature.roomId); // up overhead in the picture
    return true;
  }
  return false;
}

// A swing the player is about to land on a creature: does it miss outright, and
// how much of it lands?
export function playerSwing(z: ZoneDO, session: Session, creature: Creature, tmpl: MobTemplate,
  weapon: { carried: CarriedItem; tmpl: ItemTemplate } | null, now: number): { miss?: string; mult: number } {
  const id = creature.templateId;
  if (LURKERS.has(id) && creature.hidden) return { miss: "You swing at the dark where it was, and hit nothing.", mult: 1 };
  if (FLIERS.has(id) && airborne(creature, now) && !(weapon && hasTrait(weapon.tmpl, "reach"))) {
    return { miss: `${cap(tmpl.name)} is overhead, out of reach of anything you swing.`, mult: 1 };
  }
  if (STRIKERS.has(id) && !(creature.openUntil && now < creature.openUntil)) {
    const speed = weapon?.tmpl.speed ?? 0;
    const odds = !weapon ? STRIKER_DODGE_BARE : STRIKER_DODGE[Math.min(STRIKER_DODGE.length, Math.max(1, speed)) - 1]!;
    if (chance(odds)) return { miss: `${cap(tmpl.name)} is not there when the blow lands.`, mult: 1 };
  }
  let mult = 1;
  if (creature.blownUntil && now < creature.blownUntil) mult *= BLOWN_TAKEN_MULT;
  if (HOLLOW.has(id) && !GRAVE_FLESH.has(id) && weapon) {
    if (weapon.tmpl.stun > 0) mult *= HOLLOW_BLUNT_MULT;
    else if (weapon.tmpl.bleed > 0 && !hasTrait(weapon.tmpl, "pierce")) mult *= HOLLOW_EDGE_MULT;
  }
  if (FOLK.has(id)) {
    const st = folkStance(z, creature, tmpl);
    // weight goes through a guard
    if (!(st === "guarded" && weapon && weapon.tmpl.stun > 0)) mult *= STANCE[st].def;
  }
  const grip = session.seizedBy ? z.creatures.get(session.seizedBy) : undefined;
  if (grip && PINCHERS.has(grip.templateId)) mult *= PINNED_DMG_MULT;
  return { mult };
}

// The room hears it when a swarm thins: tracked per victim, told on the drop.
const swarmCount = new WeakMap<ZoneDO, Map<string, number>>();
export function swarmThins(z: ZoneDO, roomId: string, pubkey: string): void {
  let m = swarmCount.get(z);
  if (!m) { m = new Map(); swarmCount.set(z, m); }
  const key = `${roomId}:${pubkey}`;
  const n = swarmOn(z, roomId, pubkey);
  const was = m.get(key) ?? 0;
  if (n > 0 && n < was) z.roomFeed(roomId, "The rest of them are less sure now.", undefined, false);
  if (n) m.set(key, n); else m.delete(key);
}

function swarmOn(z: ZoneDO, roomId: string, pubkey: string): number {
  return z.creaturesInRoom(roomId).filter((c) => SWARMS.has(c.templateId) && c.target === pubkey && c.hp > 0).length;
}

// A person changes how they fight as the fight goes against them, and says so.
function folkStance(z: ZoneDO, creature: Creature, tmpl: MobTemplate): "steady" | "guarded" | "reckless" {
  const share = creature.hp / tmpl.max_hp;
  const now: Creature["folkStance"] = share < FOLK_RECKLESS_AT ? "reckless" : share < FOLK_GUARD_AT ? "guarded" : undefined;
  if (now !== creature.folkStance) {
    creature.folkStance = now;
    if (now) z.roomFeed(creature.roomId, now === "guarded"
      ? `${cap(tmpl.name)} gives ground a step and gets their guard up.`
      : `${cap(tmpl.name)} has nothing left to lose, and comes on wild.`, undefined, false);
  }
  return now ?? "steady";
}

// The free blow a creature gets rushing you as it comes in (zone.ts, the entry
// ambush). For a charger that rush was the charge.
export function entryStrike(creature: Creature, now: number): void {
  if (CHARGERS.has(creature.templateId)) creature.blownUntil = now + BLOWN_MS;
  creature.lastBlowAt = now;
}


// The look reads the state, so the player can see what to do about it.
export function tell(z: ZoneDO, creature: Creature, viewer: string): string | null {
  const now = Date.now();
  if (creature.blownUntil && now < creature.blownUntil) return "spent from the charge, head low and wide open";
  if (HEAVIES.has(creature.templateId) && creature.target && (creature.fatigue ?? 0) >= HEAVY_TIRED_AT
      && creature.lastBlowAt && now - creature.lastBlowAt <= HEAVY_REST_MS) {
    return "sides heaving, its blows gone heavy and slow";
  }
  if (FLIERS.has(creature.templateId) && creature.target && airborne(creature, now)) return "wheeling overhead, out of reach";
  if (FOLK.has(creature.templateId) && creature.target && creature.folkStance) {
    return creature.folkStance === "guarded" ? "giving ground behind a careful guard" : "coming on wild, past caring";
  }
  // The look picks the lead out as soon as the pack is fighting, not only once
  // one of them has come in from the side.
  if (PACKS[creature.templateId] && creature.target) leader(z, creature.roomId, PACKS[creature.templateId]!, now);
  if (creature.leads && creature.target && PACKS[creature.templateId]) {
    return creature.target === viewer ? "fixed on you, and the others take their lead from it" : "leading the others in";
  }
  return null;
}

// --- the pack ---------------------------------------------------------------

// Rooms whose pack has lost its lead, and until when. Held in memory: a restart
// lets them sort themselves out early, which is no loss.
const leaderless = new WeakMap<ZoneDO, Map<string, number>>();
// The lead each room's pack had at the last look, and when it was last seen
// leading. This is how a lead that died (any way at all) or ran is noticed - it
// is simply not there. Only within the same fight: a lead not seen for a minute
// belongs to a fight that is over, and a new pack in the same room starts clean.
const leads = new WeakMap<ZoneDO, Map<string, { id: string; at: number }>>();
const LEAD_FIGHT_MS = 60_000;

function packIn(z: ZoneDO, roomId: string, pack: string): Creature[] {
  return z.creaturesInRoom(roomId).filter((c) => PACKS[c.templateId] === pack && c.target && c.hp > 0);
}

function flanking(z: ZoneDO, creature: Creature, victim: Session, now: number): boolean {
  const pack = PACKS[creature.templateId]!;
  const on = packIn(z, creature.roomId, pack).filter((c) => c.target === victim.pubkey);
  if (on.length < 2) return false;
  return !!leader(z, creature.roomId, pack, now);
}

function leader(z: ZoneDO, roomId: string, pack: string, now: number): Creature | null {
  let gone = leaderless.get(z);
  if (!gone) { gone = new Map(); leaderless.set(z, gone); }
  let had = leads.get(z);
  if (!had) { had = new Map(); leads.set(z, had); }
  const key = `${roomId}:${pack}`;
  const fighting = packIn(z, roomId, pack);
  const current = fighting.find((c) => c.leads);
  if (current) { had.set(key, { id: current.id, at: now }); return current; }
  // The lead it had is not standing here any more: dead, or off. Say so once.
  const was = had.get(key);
  if (was && now - was.at > LEAD_FIGHT_MS) had.delete(key);
  const prior = was && now - was.at <= LEAD_FIGHT_MS ? was.id : undefined;
  if (prior) {
    had.delete(key);
    gone.set(key, now + PACK_LEADERLESS_MS);
    const dead = !z.creatures.has(prior);
    z.roomFeed(roomId, dead
      ? "With the lead one down, the rest of them lose their shape. They come at you one at a time now."
      : "With the lead one gone, the rest of them lose their shape.", undefined, false);
    return null;
  }
  if ((gone.get(key) ?? 0) > now) return null;
  if (fighting.length < 2) return null;
  const pick = fighting.find((c) => PACK_LEADS.has(c.templateId))
    ?? [...fighting].sort((a, b) => maxHp(z, b) - maxHp(z, a) || (a.id < b.id ? -1 : 1))[0]!;
  pick.leads = true;
  had.set(key, { id: pick.id, at: now });
  return pick;
}

function maxHp(z: ZoneDO, c: Creature): number {
  return z.world!.mobTemplates.get(c.templateId)?.max_hp ?? 0;
}
