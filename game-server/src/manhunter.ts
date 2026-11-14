// THE MAN-HUNTER (2026-11-14). A mark on one animal, apart from its kind and
// from the mob trait lottery: this one hunts people. It comes two ways. One in
// MAN_HUNTER_BIRTH_ODDS is born to it, and nobody knows until it kills. An
// animal that kills a nomad has learned it, and the region's record and the
// keeper tell of it. Only the hunters that would already turn on a person when
// starving can carry it (STARVE_HUNTERS, never a small hunter). It keeps the
// mark until it dies.
//   - it comes for a nomad once hungry (HUNGRY_AT), not only starving
//   - an easier animal in the room no longer spares you
//   - hungry and idle, it walks toward the nearest nomad in its own region,
//     within MAN_HUNTER_SCENT_ROOMS, and its packmates with it come too
//   - when it runs at a nomad, its packmates in the room run with it
import type { ZoneDO } from "./zone";
import type { Creature, Session } from "./zone-types";
import {
  STARVE_HUNTERS, SMALL_HUNTERS, HOLLOW, SENTINELS, DROWNERS, AGGRESSIVE, HUNGRY_AT,
  MAN_HUNTER_BIRTH_ODDS, MAN_HUNTER_SCENT_ROOMS, MAN_HUNTER_CHECK_MS,
} from "./zone-data";
import * as chronicle from "./chronicle";

/** Can this kind of animal carry the mark at all. */
export function canManHunt(templateId: string): boolean {
  return STARVE_HUNTERS.has(templateId) && !SMALL_HUNTERS.has(templateId) && !HOLLOW.has(templateId)
    && !SENTINELS.has(templateId) && !DROWNERS.has(templateId) && !AGGRESSIVE.has(templateId);
}

/** The birth roll: the time it was marked, or undefined. `roll` is the dice (Math.random by default). */
export function bornManHunter(templateId: string, now: number, roll = Math.random()): number | undefined {
  return canManHunt(templateId) && roll < MAN_HUNTER_BIRTH_ODDS ? now : undefined;
}

/** A nomad is dead. If an animal that can carry the mark was on them, it has learned. */
export function learned(z: ZoneDO, victim: Session, killerTemplateId: string | undefined, now = Date.now()): Creature | undefined {
  if (!killerTemplateId || !canManHunt(killerTemplateId)) return undefined;
  let killer: Creature | undefined;
  for (const c of z.creatures.values()) {
    if (c.hp > 0 && c.roomId === victim.roomId && c.target === victim.pubkey && c.templateId === killerTemplateId) { killer = c; break; }
  }
  if (!killer || killer.manHunter) return killer;
  killer.manHunter = now;
  const name = z.world?.mobTemplates.get(killer.templateId)?.name ?? killer.templateId;
  chronicle.manHunter(z, victim.roomId, victim.name, name, now);
  return killer;
}

/** The hunger at which it comes for a nomad. */
export function manHuntsAt(c: Creature, usual: number): number {
  return c.manHunter ? Math.min(usual, HUNGRY_AT) : usual;
}

/** It has run at `prey`: its packmates in the room run with it. */
export function packFollows(z: ZoneDO, lead: Creature, prey: Session): void {
  if (!lead.manHunter || !lead.group) return;
  for (const c of z.creatures.values()) {
    if (c.id === lead.id || c.group !== lead.group || c.roomId !== lead.roomId || c.hp <= 0) continue;
    if (c.target || c.asleep || c.heldBy || c.holding) continue;
    c.target = prey.pubkey;
    c.rouseAt = undefined;
  }
}

// Hungry and with nothing to do, it goes looking. Checked on its own clock, not every beat.
const lastCheck = new WeakMap<ZoneDO, number>();
export function seek(z: ZoneDO, now: number): void {
  if ((lastCheck.get(z) ?? 0) > now) return;
  lastCheck.set(z, now + MAN_HUNTER_CHECK_MS);
  const nomads = [...z.sessions.values()].filter((s) => s.hp > 0 && z.reachable(s) && !z.outOfWorld(s));
  // last check's walks end; whoever is still hungry and in reach is set walking again below
  for (const c of z.creatures.values()) {
    if (c.manHunting) { c.manHunting = undefined; c.walkingTo = undefined; }
  }
  for (const c of z.creatures.values()) {
    if (!c.manHunter) continue;
    const idle = c.hp > 0 && !c.target && !c.asleep && !c.heldBy && !c.holding && c.aloft === undefined && c.hunger >= HUNGRY_AT;
    let goal: Session | undefined;
    if (idle) {
      const ground = z.regionOf(c.home ?? c.roomId);
      let best = MAN_HUNTER_SCENT_ROOMS + 1;
      for (const s of nomads) {
        if (z.regionOf(s.roomId) !== ground) continue;
        const d = z.roomDist(c.roomId, s.roomId);
        if (d < best) { best = d; goal = s; }
      }
    }
    if (!goal) continue;
    for (const m of [c, ...packIn(z, c)]) {
      m.manHunting = goal.pubkey;
      if (m.roomId === goal.roomId) { m.walkingTo = undefined; continue; }
      m.walkingTo = goal.roomId;
      m.nextWanderAt = Math.min(m.nextWanderAt, now); // it goes now, not on its idle clock
    }
  }
}

function packIn(z: ZoneDO, lead: Creature): Creature[] {
  if (!lead.group) return [];
  return [...z.creatures.values()].filter((c) => c.id !== lead.id && c.group === lead.group && c.roomId === lead.roomId
    && c.hp > 0 && !c.target && !c.asleep && !c.heldBy && !c.holding);
}
