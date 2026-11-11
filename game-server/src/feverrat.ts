// THE FEVER RAT (rome, 2026-11-01). The fever's own body. It has no spawn row:
// it comes up out of the fever graves when the fever settles (events.ts,
// tickFever), there is never more than one, and it walks about the ground round
// its graves (zone-data bossStands). While it lives the fever does not lift, over the old
// village and the wood beside it; kill it and the wind comes round
// (events.feverLifts, from the death hook in zone.ts). Left alone for
// FEVER_RAT_HOLD_MS it goes back down into the graves and the fever ends.
// Its grave-cloth, worn, is the one thing that lets you mend under the fever.

import type { ZoneDO } from "./zone";
import type { Session, Creature } from "./zone-types";
import { chance, pick, randInt, uuid } from "./rng";
import {
  FEVER_RAT, FEVER_RAT_HOME, FEVER_CLOTH_TRAIT, WANDER_MIN_MS, WANDER_MAX_MS,
  FEVER_BANDS, FEVER_GRAVES, FEVER_RISES,
} from "./zone-data";

// One rat to each graves (2026-11-04): the one up out of these graves (or any
// room it can rise in), or with none named, any of them. A rat from before
// there were several is the old village's.
export function rat(z: ZoneDO, graves?: string): Creature | null {
  const at = graves === undefined ? null : new Set(FEVER_RISES(graves));
  for (const c of z.creatures.values()) {
    if (c.templateId !== FEVER_RAT || c.hp <= 0) continue;
    if (!at || at.has(c.home ?? FEVER_RAT_HOME)) return c;
  }
  return null;
}
// ...and which graves a rise belongs to.
function gravesOfRise(room: string): string {
  if (FEVER_GRAVES[room]) return room;
  return Object.keys(FEVER_GRAVES).find((g) => FEVER_RISES(g).includes(room)) ?? FEVER_RAT_HOME;
}

// Up out of the graves, if there is not one already: the old village's, or
// whichever of the three the fever came off (events.feverAt, 2026-11-04).
export function comes(z: ZoneDO, now: number, graves = FEVER_RAT_HOME): Creature | null {
  const tmpl = z.world!.mobTemplates.get(FEVER_RAT);
  if (!tmpl || !z.world!.rooms.has(graves) || rat(z, gravesOfRise(graves))) return null;
  const c: Creature = {
    id: uuid(), templateId: FEVER_RAT, roomId: graves, home: graves,
    hp: tmpl.max_hp, hunger: 0, grudges: [], target: null,
    nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
  };
  z.creatures.set(c.id, c);
  z.noteCreaturesChanged();
  z.roomFeed(graves, "The ground over one of the graves heaves, and breaks, and something the size of a hound drags itself up out of it.");
  z.refreshRoomCtx(graves);
  return c;
}

// Back down, unkilled: the fever has run its long course. Not in a fight.
export function goesBack(z: ZoneDO, graves = FEVER_RAT_HOME): boolean {
  const c = rat(z, graves);
  if (!c || c.target) return false;
  z.creatures.delete(c.id);
  z.noteCreaturesChanged();
  z.roomFeed(c.roomId, "The great rat turns, slow, and goes back down into the ground, and the earth falls in after it.");
  z.refreshRoomCtx(c.roomId);
  return true;
}

// THE KEEPER'S FADED LINES ABOUT THE RAT ARE GONE (rome, 2026-11-11): he spoke
// of the fever twice, in two looks, and the rat's set named the old village at
// every graves. He speaks of the fever in his own storied tellings (ARC_TELLINGS).

// The grave-cloth: whoever wears it mends as if there were no fever.
export function spared(z: ZoneDO, s: Session): boolean {
  return z.wearsTrait(s, FEVER_CLOTH_TRAIT);
}
