// THE WAY YOU CAME (rome, 2026-11-13). Every wanderer keeps the rooms they have
// stood in since they last left a gatehouse, map or no map. `trail` opens it in
// the map window: the walked rooms and the passages between them, nothing
// ahead, no creatures, no goods. It is memory, not paper, so it cannot be
// dropped, stolen or sold, and a stolen surveyor's map never leaves you blind.
// Going into a gatehouse wipes it, and so does dying; the next walk starts it
// again from the door.
//
// Kept in the world's state like the walk record (z.walked), for the same
// reason: a session is rebuilt on every reconnect.

import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { sendTrailMap } from "./lore";

function of(z: ZoneDO, pubkey: string): Set<string> {
  let mine = z.trail.get(pubkey);
  if (!mine) z.trail.set(pubkey, (mine = new Set()));
  return mine;
}

/** The room underfoot goes on the trail. */
export function note(z: ZoneDO, session: Session): void {
  of(z, session.pubkey).add(session.roomId);
}

/** Through the gatehouse door, or dead: the way you came is gone. */
export function wipe(z: ZoneDO, pubkey: string): void {
  z.trail.delete(pubkey);
}

/** How many rooms are on it, the one underfoot included. */
export function size(z: ZoneDO, session: Session): number {
  const mine = z.trail.get(session.pubkey);
  return mine ? mine.size + (mine.has(session.roomId) ? 0 : 1) : 1;
}

export function cmdTrail(z: ZoneDO, session: Session): void {
  const rooms = new Set(z.trail.get(session.pubkey) ?? []);
  rooms.add(session.roomId);
  sendTrailMap(z, session, rooms);
  z.send(session, rooms.size <= 1
    ? "You go back over the way you came, and there is none yet: only the ground you stand on."
    : `You go back over the way you came. ${rooms.size} rooms, since you last left a gatehouse.`);
}
