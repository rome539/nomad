// THE FEVER RAT (rome, 2026-11-01). The fever's own body. It has no spawn row:
// it comes up out of the fever graves when the fever settles (events.ts,
// tickFever), there is never more than one, and it does not wander (a boss
// keeps its place). While it lives the fever does not lift, over the old
// village and the wood beside it; kill it and the wind comes round
// (events.feverLifts, from the death hook in zone.ts). Left alone for
// FEVER_RAT_HOLD_MS it goes back down into the graves and the fever ends.
// Its grave-cloth, worn, is the one thing that lets you mend under the fever.

import type { ZoneDO } from "./zone";
import type { Session, Creature } from "./zone-types";
import { chance, pick, randInt, uuid } from "./rng";
import {
  FEVER_RAT, FEVER_RAT_HOME, FEVER_CLOTH_TRAIT, WANDER_MIN_MS, WANDER_MAX_MS,
  FEVER_RAT_KEEPER_PER_MIN, FEVER_RAT_KEEPER_GAP_MS, FEVER_RAT_KEEPER_LINES,
} from "./zone-data";

export function rat(z: ZoneDO): Creature | null {
  for (const c of z.creatures.values()) if (c.templateId === FEVER_RAT && c.hp > 0) return c;
  return null;
}

// Up out of the graves, if there is not one already.
export function comes(z: ZoneDO, now: number): Creature | null {
  const tmpl = z.world!.mobTemplates.get(FEVER_RAT);
  if (!tmpl || !z.world!.rooms.has(FEVER_RAT_HOME) || rat(z)) return null;
  const c: Creature = {
    id: uuid(), templateId: FEVER_RAT, roomId: FEVER_RAT_HOME, home: FEVER_RAT_HOME,
    hp: tmpl.max_hp, hunger: 0, grudges: [], target: null,
    nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
  };
  z.creatures.set(c.id, c);
  z.noteCreaturesChanged();
  z.roomFeed(FEVER_RAT_HOME, "The ground over one of the graves heaves, and breaks, and something the size of a hound drags itself up out of it.");
  z.refreshRoomCtx(FEVER_RAT_HOME);
  return c;
}

// Back down, unkilled: the fever has run its long course. Not in a fight.
export function goesBack(z: ZoneDO): boolean {
  const c = rat(z);
  if (!c || c.target) return false;
  z.creatures.delete(c.id);
  z.noteCreaturesChanged();
  z.roomFeed(c.roomId, "The great rat turns, slow, and goes back down into the broken grave, and the earth falls in after it.");
  z.refreshRoomCtx(c.roomId);
  return true;
}

// THE KEEPER SPEAKS OF IT (2026-11-02), once a minute's chance while it is up,
// to whoever sits by his fire, as he does of the king and the roe.
let lastKeeper = 0;
const keeperSaid = new Map<string, number>(); // pubkey -> when he last spoke of it to them
export function keeper(z: ZoneDO, now: number): void {
  if (now - lastKeeper < 60_000) return;
  lastKeeper = now;
  if (!rat(z)) return;
  for (const s of z.sessions.values()) {
    if (!z.inGatehouse.has(s.pubkey)) continue;
    if (now - (keeperSaid.get(s.pubkey) ?? 0) < FEVER_RAT_KEEPER_GAP_MS || !chance(FEVER_RAT_KEEPER_PER_MIN)) continue;
    keeperSaid.set(s.pubkey, now);
    z.send(s, pick(FEVER_RAT_KEEPER_LINES), "amb");
  }
}

// The grave-cloth: whoever wears it mends as if there were no fever.
export function spared(z: ZoneDO, s: Session): boolean {
  return z.wearsTrait(s, FEVER_CLOTH_TRAIT);
}
