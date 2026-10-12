// THE GREAT RING (mig 297; rome, 2026-10-12). A keyholder's ring opens any lock
// on RING_OPENS and loses a key to each one. How many are left is never shown:
// every lock it opens might be its last (RING_LAST_KEY_ODDS), which is a little
// under three locks on average. The exact key is always tried first, so a ring
// is never spent where a plain key would do.
import type { Session, Creature } from "./zone-types";
import type { ZoneDO } from "./zone";
import { chance } from "./rng";
import type { CarriedItem } from "./world";
import { RING_KEY, RING_OPENS } from "./zone-data";

/** What a wanderer would open this lock with: its own key, else a ring. */
export function keyFor(session: Session, keyItem: string): CarriedItem | undefined {
  return session.items.find((c) => c.itemId === keyItem)
    ?? (RING_OPENS.has(keyItem) ? session.items.find((c) => c.itemId === RING_KEY) : undefined);
}

/**
 * DOES THIS ONE CARRY A RING? (rome, 2026-10-12: you should hear it.) Decided
 * once, the first time it matters, from the same drop chance the ring always
 * had - and kept, so the keys you heard on the road are the keys that fall.
 */
export function carriesRing(z: ZoneDO, creature: Creature): boolean {
  if (creature.ringRolled) return !!creature.ring;
  creature.ringRolled = true;
  const odds = z.world?.mobKeys.find((k) => k.templateId === creature.templateId && k.keyItem === RING_KEY)?.chance ?? 0;
  creature.ring = odds > 0 && chance(odds);
  return creature.ring;
}
