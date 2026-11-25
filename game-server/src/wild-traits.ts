// THE EIGHT FROM THE CAVE (2026-11-25). Drawn up for the cave under the wood, and
// they fit things everywhere, so every family they suit can roll them (MOB_TRAITS,
// zone-data; who in a family may roll which is TRAIT_FITS in ai.ts). What each one
// does lives here or, where the rule it bends already has a home, beside that
// rule with a line pointing back here:
//   long-eared     hears your footsteps and a fight three rooms off, and comes (here)
//   flame-drawn    comes to a carried light from two rooms off (here)
//   dark-striker   its first blow lands heavier on anyone without a light (here)
//   lamp-breaker   a landed blow can put out a torch or shut a lantern (here)
//   light-shy      starts no fight with anyone carrying a light (lightShy, read by ai and zone)
//   stone-skinned  a point of armour (ai.mobArmor)
//   stone-deaf     no sound wakes it or brings it (ai.wakeListeners, zone's noise, cave's ears)
//   roost-bound    never goes out with the roost (cave.flightTurn)
import type { ZoneDO } from "./zone";
import type { Creature, Session } from "./zone-types";
import type { MobTemplate } from "./world";
import type { Blow } from "./styles";
import { chance } from "./rng";
import { cap } from "./zone-util";
import { sendTo, takeLight } from "./cave";
import {
  HEARS_FAR, FOOTFALL_HEED_ODDS, DARK_FIRST_MULT, LONG_EAR_ROOMS, FLAME_DRAW_ROOMS, FLAME_DRAW_ODDS, LAMP_BREAK_ODDS,
} from "./zone-data";

// A blow this long after its last one is the first of a new fight (as cave.ts).
const FIGHT_GAP_MS = 60_000;

const has = (c: Creature, t: string): boolean => !!c.traits?.includes(t);

/** Free to leave what it is doing and walk to `roomId`. */
function free(c: Creature, roomId: string): boolean {
  return c.hp > 0 && !c.target && !c.asleep && !c.holding && !c.dragTo && !c.flying
    && c.aloft === undefined && c.roomId !== roomId && c.walkingTo !== roomId;
}

/** You took a step: what has the ears for it, or the eyes for your light, comes. */
export function footfall(z: ZoneDO, session: Session, stealthMult: number, now = Date.now()): void {
  if (session.away || z.outOfWorld(session)) return;
  const lit = z.carriesLight(session);
  for (const c of z.creatures.values()) {
    if (!c.traits) continue;
    // A mole hound's ears are cave.footfall's: a long-eared one hears a room further there.
    const ears = has(c, "long-eared") && !HEARS_FAR.has(c.templateId);
    const drawn = lit && has(c, "flame-drawn");
    if ((!ears && !drawn) || !free(c, session.roomId)) continue;
    const d = z.roomDist(c.roomId, session.roomId);
    if (ears && d <= LONG_EAR_ROOMS && chance(FOOTFALL_HEED_ODDS * stealthMult)) sendTo(c, session.roomId, now);
    else if (drawn && d <= FLAME_DRAW_ROOMS && chance(FLAME_DRAW_ODDS)) sendTo(c, session.roomId, now);
  }
}

/** A fight: a long-eared thing three rooms off hears it and comes. */
export function fightHeard(z: ZoneDO, roomId: string, now = Date.now()): void {
  for (const c of z.creatures.values()) {
    if (!has(c, "long-eared") || HEARS_FAR.has(c.templateId) || !free(c, roomId)) continue;
    if (z.roomDist(c.roomId, roomId) <= LONG_EAR_ROOMS) sendTo(c, roomId, now);
  }
}

/** The blow it is about to land (into `out`). */
export function blow(z: ZoneDO, creature: Creature, tmpl: MobTemplate, victim: Session, now: number, out: Blow): void {
  if (has(creature, "dark-striker") && !z.litFor(victim)
    && (!creature.lastBlowAt || now - creature.lastBlowAt > FIGHT_GAP_MS)) {
    out.mult *= DARK_FIRST_MULT;
    out.line ??= `${cap(tmpl.name)} is on you out of the dark before you know where it is.`;
  }
}

/** After a blow of its has landed on a living victim. */
export function landed(z: ZoneDO, creature: Creature, tmpl: MobTemplate, victim: Session): void {
  if (has(creature, "lamp-breaker") && chance(LAMP_BREAK_ODDS)) takeLight(z, victim, tmpl, true);
}

/** A light-shy thing will not start a fight with anyone carrying a light. */
export function lightShy(z: ZoneDO, creature: Creature, s: Session): boolean {
  return has(creature, "light-shy") && z.carriesLight(s);
}
