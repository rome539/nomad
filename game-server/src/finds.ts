// RARE AND EPIC FINDS (rome, 2026-11-13). The mountain lays a dozen rare
// pieces about its floor and the rest of the world laid almost none. Every
// region now keeps a few FINDS: an empty place for one rare or one epic piece,
// not a named item. When the dice put one out, WHICH piece it is gets drawn
// from the gear that region already gives up (its strongboxes, what its people
// and animals wear, what already lies on its ground), and WHERE is any room of
// that region that is not a gate or a safe room. Taken, the place stands empty
// until the dice fill it again with something else, somewhere else.
//
// A find is the world's own, like any wandered piece: it rides z.roamed, so the
// rust, the stray sweep and the scavengers leave it alone. z.finds marks which
// of those are finds, so a hand taking one does not arm a named regrow.

import type { ZoneDO } from "./zone";
import type { ItemTemplate, World } from "./world";
import { chance, randInt } from "./rng";
import {
  FIND_SLOTS, FIND_ROLL_MIN_MS, FIND_ROLL_MAX_MS, FIND_NEVER, FIND_CHEST_KEYS, FIND_ALSO,
  GEAR_REGROW_ODDS, RARE_REGROW_ODDS, EPIC_REGROW_ODDS,
} from "./zone-data";

type Rank = "rare" | "epic";
const RANKS: Rank[] = ["rare", "epic"];

/** How often a bare spot's check puts a piece back: the better the piece, the longer the odds. */
export function gearRegrowOdds(t: ItemTemplate | undefined): number {
  if (!t || t.slot === "") return GEAR_REGROW_ODDS; // the dice trophies and materials keep their odds
  return t.rarity === "epic" ? EPIC_REGROW_ODDS : t.rarity === "rare" ? RARE_REGROW_ODDS : GEAR_REGROW_ODDS;
}

const pools = new WeakMap<World, Map<string, string[]>>();
/** The rare (or epic) gear a region already gives up, which is what its finds draw from. */
export function pool(world: World, region: string, rank: Rank): string[] {
  let m = pools.get(world);
  if (!m) {
    m = new Map();
    const sets = new Map<string, Set<string>>();
    const add = (roomId: string, itemId: string | null | undefined) => {
      if (!itemId || FIND_NEVER.has(itemId)) return;
      const t = world.itemTemplates.get(itemId), room = world.rooms.get(roomId);
      if (!t || !room || t.slot === "" || (t.rarity !== "rare" && t.rarity !== "epic")) return;
      const k = `${room.region ?? ""}|${t.rarity}`;
      let s = sets.get(k);
      if (!s) sets.set(k, (s = new Set()));
      s.add(itemId);
    };
    for (const g of world.groundSpawns) add(g.room_id, g.item_id);
    for (const c of world.caches) if (FIND_CHEST_KEYS.has(c.keyItem)) for (const l of c.loot) add(c.roomId, l.itemId);
    for (const s of world.mobSpawns) {
      const t = world.mobTemplates.get(s.template_id);
      if (t && !t.is_boss) add(s.room_id, t.gear_item);
    }
    // the pieces a region's draw is given by name (FIND_ALSO)
    for (const [region, ids] of Object.entries(FIND_ALSO)) for (const id of ids) {
      const t = world.itemTemplates.get(id);
      if (!t || t.slot === "" || (t.rarity !== "rare" && t.rarity !== "epic")) continue;
      const k = `${region}|${t.rarity}`;
      let s = sets.get(k);
      if (!s) sets.set(k, (s = new Set()));
      s.add(id);
    }
    for (const [k, s] of sets) m.set(k, [...s].sort());
    pools.set(world, m);
  }
  return m.get(`${region}|${rank}`) ?? [];
}

/** Any room of the region that is not a door or a bolthole and does not hold this piece already. */
function home(z: ZoneDO, world: World, region: string, itemId: string): string | null {
  const open: string[] = [];
  for (const [id, room] of world.rooms) {
    if ((room.region ?? "") !== region) continue;
    if (world.entryRooms.has(id) || room.is_safe === 1) continue;
    if ((z.ground.get(id) ?? []).includes(itemId) || z.roamed.has(`${itemId}@${id}`)) continue;
    open.push(id);
  }
  return open.length ? open[randInt(0, open.length - 1)]! : null;
}

/** A hand took it: the place stands empty, and no named piece is owed back. */
export function taken(z: ZoneDO, key: string): boolean {
  return z.finds.delete(key);
}

export function tickFinds(z: ZoneDO, now: number): void {
  if (now < z.nextFindAt) return;
  z.nextFindAt = now + randInt(FIND_ROLL_MIN_MS, FIND_ROLL_MAX_MS);
  const world = z.world;
  if (!world) return;
  // What is still lying out. A find that left its floor some other way is
  // forgotten here, so the count can never stick above what is really there.
  const out = new Map<string, number>();
  for (const key of [...z.finds]) {
    const at = key.indexOf("@"), itemId = key.slice(0, at), roomId = key.slice(at + 1);
    const t = world.itemTemplates.get(itemId), room = world.rooms.get(roomId);
    if (!t || !room || !(z.ground.get(roomId) ?? []).includes(itemId)) { z.finds.delete(key); z.roamed.delete(key); continue; }
    const k = `${room.region ?? ""}|${t.rarity}`;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  for (const [region, slots] of Object.entries(FIND_SLOTS)) {
    for (const rank of RANKS) {
      const from = pool(world, region, rank);
      if (!from.length) continue;
      const odds = rank === "epic" ? EPIC_REGROW_ODDS : RARE_REGROW_ODDS;
      for (let empty = slots[rank] - (out.get(`${region}|${rank}`) ?? 0); empty > 0; empty--) {
        if (!chance(odds)) continue;
        const itemId = from[randInt(0, from.length - 1)]!;
        const roomId = home(z, world, region, itemId);
        if (!roomId) continue;
        const key = `${itemId}@${roomId}`;
        z.ground.set(roomId, [...(z.ground.get(roomId) ?? []), itemId]);
        z.roamed.add(key);
        z.finds.add(key);
        const rolled = z.rollTraits(world.itemTemplates.get(itemId));
        if (rolled) z.groundRolled.set(key, rolled); else z.groundRolled.delete(key);
        z.refreshRoomCtx(roomId);
      }
    }
  }
}
