// A PATROL THAT WALKS TOGETHER (2026-11-13). The road's skeleton patrols (zone-data
// SQUADS): a bone-knight captain walks the round, and the skeletons that share his
// home keep with him. They step when he steps, out of the room he leaves, and one
// that has fallen behind (a fight, a chase) walks back to him. With no captain
// standing they walk the round on their own, and fall in behind the next one.
import type { ZoneDO } from "./zone";
import type { Creature } from "./zone-types";
import { SQUADS } from "./zone-data";

const BY_HOME = new Map(SQUADS.map((q) => [q.home, q]));

/** The captain this creature answers to: itself if it leads, or undefined when it is in no squad or none stands. */
export function captainOf(z: ZoneDO, c: Creature): Creature | undefined {
  const q = c.home ? BY_HOME.get(c.home) : undefined;
  if (!q) return undefined;
  let lead: Creature | undefined;
  for (const o of z.creatures.values()) {
    if (o.home !== q.home || o.templateId !== q.captain || o.hp <= 0) continue;
    if (!lead || o.id < lead.id) lead = o; // two bone-knights (a skeleton born of the rare blood): the first leads
  }
  return lead;
}

/** Its captain, when it is one of the squad and not the captain itself. */
export function ledBy(z: ZoneDO, c: Creature): Creature | undefined {
  const lead = captainOf(z, c);
  return lead && lead.id !== c.id ? lead : undefined;
}

/** A skeleton standing with its captain does not wander off on its own: he carries it. */
export function staysWithCaptain(z: ZoneDO, c: Creature): boolean {
  const lead = ledBy(z, c);
  return !!lead && lead.roomId === c.roomId && !c.target;
}

/** The way toward its captain, when it has fallen behind him. */
export function towardCaptain<E extends { to_room: string }>(z: ZoneDO, c: Creature, exits: E[]): E | undefined {
  const lead = ledBy(z, c);
  if (!lead || lead.roomId === c.roomId) return undefined;
  const d = z.roomDist(c.roomId, lead.roomId);
  return exits.find((e) => z.roomDist(e.to_room, lead.roomId) < d);
}

/** The captain has stepped from `from` to `to`: the skeletons that were with him come too. */
export async function fallIn(
  z: ZoneDO, captain: Creature, from: string, to: string,
  step: (c: Creature) => Promise<unknown>,
): Promise<void> {
  if (from === to || captainOf(z, captain)?.id !== captain.id) return;
  for (const c of [...z.creatures.values()]) {
    if (c.id === captain.id || c.home !== captain.home || c.roomId !== from || c.hp <= 0) continue;
    if (c.target || c.heldBy || c.holding || c.stunned || c.asleep) continue;
    c.curious = to;
    await step(c);
  }
}
