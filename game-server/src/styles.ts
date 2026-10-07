import * as exhaustion from "./exhaustion";
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
import { airborne, remembers } from "./ai";
import type { CarriedItem, ItemTemplate } from "./world";
import {
  SWARMS, SWARM_STEP, SWARM_MAX_OTHERS, STRIKERS, STRIKER_DODGE, STRIKER_DODGE_BARE,
  FLIERS, FLIER_KIND, FLIER_DIVE_ODDS, FLIER_DIVE_OPEN, MOBBER_WHEEL_ODDS, GROUND_LIFT_ODDS, GROUND_DROP_ODDS, HUNTER_CLIMB_ODDS, FLIER_DOWN_HITS, FLIER_GROUNDED_MS, PINCHERS, PIN_ODDS, PINNED_DMG_MULT,
  HOLLOW, GRAVE_FLESH, HOLLOW_EDGE_MULT, HOLLOW_BLUNT_MULT, LURKERS, LURKER_FADE_ODDS, LURKER_DROP_MULT,
  CUTTHROATS, FEINT_ODDS, FOLK, FOLK_GUARD_AT, FOLK_RECKLESS_AT, STANCE, COMBAT_ROUND_MS,
  WEAKEST_HUNTERS, WEAKEST_SWITCH_GAP, TURNING_BOARS, BOAR_TURN_AT, BLUFFERS, BLUFF_HOLD_MS, BLUFF_LEAVE_ODDS, BLUFF_REARM_MS,
  STALKERS, STALK_STILL_MS, STALK_GIVEUP_MS, STALK_RANGE,
  CHARGERS, CHARGE_MULT, CHARGE_REST_MS, BLOWN_MS, BLOWN_TAKEN_MULT,
  HEAVIES, HEAVY_KNOCK_ODDS,
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
    out.knock = !exhaustion.heavyTired(creature) && chance(HEAVY_KNOCK_ODDS * (victim.stance === "guarded" ? 0.5 : 1));
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
  // A wounded boar does not run: it turns, and the next blow is a charge.
  if (TURNING_BOARS.has(id) && !creature.turned && creature.hp < tmpl.max_hp * BOAR_TURN_AT) {
    creature.turned = true;
    creature.lastBlowAt = undefined; // standing again: CHARGERS makes the next one a charge
    z.roomFeed(creature.roomId, `${cap(tmpl.name)} is badly hurt, and it does not run. It turns, and drops its head.`, undefined, false);
  }
  // The bear's first rush is a warning. It is only ever a bluff at somebody who
  // has not hurt it and is not already on its books.
  if (bluffPending(z, creature, tmpl, victim.pubkey, now)) {
    creature.bluffedAt = now;
    creature.bluffing = victim.pubkey;
    creature.bluffUntil = now + BLUFF_HOLD_MS;
    creature.bluffHp = creature.hp;
    // It is not on you, so you are not swinging at it - unless you choose to.
    creature.target = null;
    if (victim.target === creature.id) victim.target = null;
    z.send(victim, `${cap(tmpl.name)} comes at you in a rush, and stops short, close enough to smell. It blows at you and slaps the ground. A warning.`, "dmgin");
    z.roomFeed(creature.roomId, `${cap(tmpl.name)} rushes ${victim.name} and stops short.`, victim.pubkey, false);
    z.refreshRoomCtx(creature.roomId);
    return true;
  }
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
  // A bird goes up for a reason and comes down for one (FLIER_KIND).
  const kind = FLIER_KIND[id];
  if (kind) {
    const wasHit = creature.turnHp !== undefined && creature.hp < creature.turnHp;
    creature.turnHp = creature.hp;
    // Knocked out of the air: it fights on the ground until it can fly again.
    if (creature.groundedUntil && now < creature.groundedUntil) return false;
    const open = victim.staggered || victim.hp < victim.maxHp / 3;
    const up = airborne(creature, now);
    let goUp: boolean;
    if (up) {
      goUp = kind === "mobber" ? false                                      // the pass comes round
        : kind === "ground" ? !chance(open ? FLIER_DIVE_OPEN : GROUND_DROP_ODDS)
        : !chance(open ? FLIER_DIVE_OPEN : FLIER_DIVE_ODDS);               // the stoop
    } else {
      goUp = kind === "mobber" ? wasHit && chance(MOBBER_WHEEL_ODDS)
        : kind === "ground" ? wasHit && (creature.hp < tmpl.max_hp / 2 || chance(GROUND_LIFT_ODDS))
        : creature.lastBlowAt !== undefined && chance(HUNTER_CLIMB_ODDS);   // a hunter climbs back after it strikes
    }
    if (!goUp) {
      if (up) {
        z.send(victim, kind === "mobber" ? `${cap(tmpl.name)} comes round again, low and fast, straight at you.`
          : kind === "ground" ? `${cap(tmpl.name)} drops back down and comes at you on foot.`
          : `${cap(tmpl.name)} folds its wings and drops at you.`, "dmgin");
        creature.airborneUntil = undefined;
        z.refreshRoomCtx(creature.roomId); // down out of the sky in the picture
      }
      return false;
    }
    if (!up) {
      z.send(victim, kind === "mobber" ? `${cap(tmpl.name)} wheels off on the wind, out of reach, and swings round for another pass.`
        : kind === "ground" ? `${cap(tmpl.name)} flaps up out of reach, scolding.`
        : `${cap(tmpl.name)} climbs out of reach and circles overhead.`);
      z.refreshRoomCtx(creature.roomId); // up overhead in the picture
    }
    creature.airborneUntil = now + COMBAT_ROUND_MS + 1000;
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
  if (HEAVIES.has(creature.templateId) && creature.target && exhaustion.heavyTired(creature)) {
    return "sides heaving, its blows gone heavy and slow";
  }
  const endurance = exhaustion.CREATURE_ENDURANCE[creature.templateId];
  if (endurance?.[0] && (creature.exertion?.effort ?? 0) >= endurance[0]) return "exhausted, its attacks losing force";
  if (FLIERS.has(creature.templateId) && creature.target && airborne(creature, now)) return "wheeling overhead, out of reach";
  if (creature.bluffing === viewer) return "up close and blowing at you, slapping the ground: a warning";
  if (creature.stalks === viewer) return "low and still in the cover, watching you";
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

// --- wolves, the bear, the cats -----------------------------------------------

// Before a creature's turn: a wolf looks over everyone in the room and goes for
// the weakest. Weakness is mostly blood, a little armour.
export function pickTarget(z: ZoneDO, creature: Creature, tmpl: MobTemplate): void {
  if (!WEAKEST_HUNTERS.has(creature.templateId) || !creature.target) return;
  const cur = z.sessions.get(creature.target);
  if (!cur || cur.roomId !== creature.roomId) return;
  const weak = (s: Session) => s.hp / s.maxHp + z.equippedArmor(s) / 40;
  let best = cur;
  for (const s of z.sessions.values()) {
    if (s === cur || s.roomId !== creature.roomId || s.hp <= 0 || !z.reachable(s) || z.outOfWorld(s)) continue;
    if (weak(s) < weak(best) - WEAKEST_SWITCH_GAP) best = s;
  }
  if (best === cur) return;
  creature.target = best.pubkey;
  if (!best.target) best.target = creature.id;
  z.send(best, `${cap(tmpl.name)} leaves ${cur.name} and comes for you instead. You are the one it wants.`, "dmgin");
  z.send(cur, `${cap(tmpl.name)} breaks off you and goes for ${best.name}.`);
}

// Its prey walked out of the room: a cat does not lose it, it follows.
export function lostPrey(z: ZoneDO, creature: Creature, victim: Session | undefined, now: number): void {
  if (!STALKERS.has(creature.templateId) || !victim || victim.hp <= 0 || z.outOfWorld(victim)) return;
  startStalk(creature, victim.pubkey, now);
}

// A cat that means to hunt somebody stalks them instead of winding up.
export function stalksInstead(creature: Creature, prey: Session, now: number): boolean {
  if (!STALKERS.has(creature.templateId)) return false;
  startStalk(creature, prey.pubkey, now);
  return true;
}

function startStalk(creature: Creature, pubkey: string, now: number): void {
  creature.stalks = pubkey;
  creature.stalkSince = now;
  creature.rouseAt = undefined;
}

// Every beat: the bears decide, and the cats follow and spring.
export async function tickHabits(z: ZoneDO, now: number): Promise<void> {
  for (const c of [...z.creatures.values()]) {
    if (c.bluffing) await resolveBluff(z, c, now);
    if (c.stalks) await stalk(z, c, now);
  }
}

async function resolveBluff(z: ZoneDO, c: Creature, now: number): Promise<void> {
  const s = z.sessions.get(c.bluffing!);
  const tmpl = z.world!.mobTemplates.get(c.templateId)!;
  // You hit it: that is a fight, and the fight already has it.
  if (c.hp < (c.bluffHp ?? c.hp) || c.target) { c.bluffing = undefined; return; }
  // You backed off: it is over.
  if (!s || s.roomId !== c.roomId || s.hp <= 0 || z.outOfWorld(s)) { c.bluffing = undefined; return; }
  if (now < (c.bluffUntil ?? 0)) return;
  c.bluffing = undefined;
  if (chance(BLUFF_LEAVE_ODDS)) {
    z.send(s, `${cap(tmpl.name)} holds a moment longer, blowing, then swings away and lets you be.`);
    z.roomFeed(c.roomId, `${cap(tmpl.name)} swings away from ${s.name} and lets them be.`, s.pubkey, false);
    c.nextWanderAt = now;
    return;
  }
  c.target = s.pubkey;
  if (!s.target) s.target = c.id;
  z.send(s, `${cap(tmpl.name)} stops warning you, and comes on.`, "dmgin");
  z.refreshRoomCtx(c.roomId);
}

async function stalk(z: ZoneDO, c: Creature, now: number): Promise<void> {
  const s = z.sessions.get(c.stalks!);
  const done = () => { c.stalks = undefined; c.stalkSince = undefined; c.walkingTo = undefined; };
  if (c.target || !s || s.hp <= 0 || z.outOfWorld(s) || !z.reachable(s) || now - (c.stalkSince ?? now) > STALK_GIVEUP_MS
      || z.roomDist(c.roomId, s.roomId) > STALK_RANGE) return done();
  if (c.roomId !== s.roomId) {
    c.walkingTo = s.roomId;
    c.nextWanderAt = Math.min(c.nextWanderAt, now); // a room behind, and keeping up
    return;
  }
  c.walkingTo = undefined;
  if (now - (s.movedAt ?? 0) < STALK_STILL_MS) return; // still on the move: it waits
  const tmpl = z.world!.mobTemplates.get(c.templateId)!;
  done();
  c.target = s.pubkey;
  if (!s.target) s.target = c.id;
  z.send(s, `${cap(tmpl.name)} is on you out of nowhere. It has been behind you for a while.`, "seize big");
  z.roomFeed(c.roomId, `${cap(tmpl.name)} comes out of cover onto ${s.name}.`, s.pubkey, false);
  await z.creatureFirstStrike(c, tmpl, s);
  z.refreshRoomCtx(c.roomId);
}

// A cat on your trail moves without a sound; one beside you, or a bear warning
// you off, does not wander away.
export function stalking(c: Creature): boolean {
  return STALKERS.has(c.templateId) && !!c.stalks;
}
export function holdsHere(z: ZoneDO, c: Creature): boolean {
  if (c.bluffing) return true;
  if (!c.stalks) return false;
  const s = z.sessions.get(c.stalks);
  return !!s && s.roomId === c.roomId;
}

// Has this bear still got its warning to give this wanderer? Your side swings
// first in the round, so the round skips a bear in this state (zone.ts) - without
// that you would hit it before it ever got to warn you. Typing `attack` lands its
// own blow and starts the fight.
export function bluffPending(z: ZoneDO, creature: Creature, tmpl: MobTemplate, pubkey: string, now: number): boolean {
  return BLUFFERS.has(creature.templateId) && !creature.bluffing && creature.hp >= tmpl.max_hp
    && !remembers(z, creature, pubkey, now)
    && (!creature.bluffedAt || now - creature.bluffedAt > BLUFF_REARM_MS);
}

// A throw landed on a bird. While it is up, the hits add up, and enough of them
// bring it down hard: dazed, and stuck on the ground for a while.
export function thrownAt(z: ZoneDO, creature: Creature, tmpl: MobTemplate, session: Session, now: number): void {
  if (!FLIERS.has(creature.templateId) || !airborne(creature, now)) return;
  creature.skyHits = (creature.skyHits ?? 0) + 1;
  if (creature.skyHits < FLIER_DOWN_HITS) {
    z.send(session, `${cap(tmpl.name)} lurches in the air, but stays up.`);
    return;
  }
  creature.skyHits = 0;
  creature.airborneUntil = undefined;
  creature.groundedUntil = now + FLIER_GROUNDED_MS;
  if (!tmpl.is_boss) creature.stunned = true;
  z.send(session, `That one knocks ${tmpl.name} out of the air. It comes down hard and flounders on the ground.`, "stun");
  z.roomFeed(creature.roomId, `${cap(tmpl.name)} is knocked out of the air and comes down hard.`, session.pubkey, false);
  z.refreshRoomCtx(creature.roomId);
}
