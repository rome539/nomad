// A CRUDE MAP LEFT LYING GOES TO PULP (rome, 2026-11-13). The crude map is no
// longer given out (mig 395), but the copies already in the world could only
// ever circulate: a map is not worn gear, so the floor rust never touched it,
// and every death put it back on a floor. Now a crude copy left on the ground
// soaks through inside the hour and is gone, the way linen and bloodwort wilt.
// One in a pack, a lockbox or a vault is never touched.
//
// The room already says it: "unrolled and going soft in the damp."
//
// A copy lying plain on a floor (the old boat's, laid before 395) is turned
// into an instanced one first, so every copy keeps its own clock on itself.

import type { ZoneDO } from "./zone";
import { randInt } from "./rng";
import { CRUDE_MAP, MAP_PULP_MIN_MS, MAP_PULP_MAX_MS, MAP_PULP_SWEEP_MS, FOOD_KEEPS, DEEP_HEART, ROT_MS } from "./zone-data";

const lastSweep = new WeakMap<ZoneDO, number>();

export function tickMapRot(z: ZoneDO, now: number, silent = false): void {
  if (now - (lastSweep.get(z) ?? 0) < MAP_PULP_SWEEP_MS) return;
  // THE FIRST SWEEP OF A WAKE arms the stray clocks on every floor. They are
  // armed when a thing is put down, so whatever was already lying when a
  // kind joined STRAY_DECAY (the dressings, 2026-11-13) would keep for ever.
  // armStrayDecay counts its own pending timers, so this never doubles one.
  if (!lastSweep.has(z)) for (const roomId of [...z.ground.keys()]) z.armStrayDecay(roomId);
  lastSweep.set(z, now);
  armFoodRot(z, now);
  // plain copies become instances, so the clock lives on the copy
  for (const [roomId, floor] of [...z.ground]) {
    if (!floor.includes(CRUDE_MAP)) continue;
    const kept = floor.filter((id) => id !== CRUDE_MAP);
    for (let n = floor.length - kept.length; n > 0; n--) z.dropInstance(roomId, CRUDE_MAP);
    if (kept.length) z.ground.set(roomId, kept); else z.ground.delete(roomId);
  }
  for (const [roomId, here] of [...z.groundInstances]) {
    let gone = 0;
    const left = here.filter((inst) => {
      if (inst.itemId !== CRUDE_MAP) return true;
      if (!inst.rotAt) { inst.rotAt = now + randInt(MAP_PULP_MIN_MS, MAP_PULP_MAX_MS); return true; }
      if (now < inst.rotAt) return true;
      gone++;
      return false;
    });
    if (!gone) continue;
    if (left.length) z.groundInstances.set(roomId, left); else z.groundInstances.delete(roomId);
    if (!silent) {
      z.roomFeed(roomId, gone === 1
        ? "A crude map left lying in the wet has gone to pulp, the ink run out of it. Nothing on it to read now."
        : "The crude maps left lying in the wet have gone to pulp, the ink run out of them.", undefined, false); // housekeeping, off the relay
      z.refreshRoomCtx(roomId);
    }
  }
}

// FOOD ON A FLOOR ALWAYS ROTS (2026-11-13). The 4-hour clock (ROT_MS) was
// armed at each place food is put down, and five of them never armed it: a
// kill drop with a full pack, a creature's spoils killed by another creature,
// a dead cutpurse's stolen food, a chest's food spilling from a full pack, and
// food bought at the gate with a full pack. That food lay there for ever. Now
// the sweep gives every perishable on a floor a clock if it has none, so any
// way of putting food down is covered. Every pending entry for that item in
// that room counts (a cure on the racks included), so nothing is doubled and
// meat curing on the racks is left to cure.
export function armFoodRot(z: ZoneDO, now: number): void {
  const tmpl = z.world?.itemTemplates;
  if (!tmpl) return;
  const pending = new Map<string, number>();
  for (const r of z.rot) {
    if (r.kind === "gatecure" || r.kind === "dencure") continue;
    const k = `${r.itemId}@${r.roomId}`;
    pending.set(k, (pending.get(k) ?? 0) + 1);
  }
  for (const [roomId, floor] of z.ground) {
    const lying = new Map<string, number>();
    for (const id of floor) {
      if (id === DEEP_HEART || FOOD_KEEPS.has(id) || !tmpl.get(id)?.edible) continue;
      lying.set(id, (lying.get(id) ?? 0) + 1);
    }
    for (const [id, n] of lying) {
      for (let missing = n - (pending.get(`${id}@${roomId}`) ?? 0); missing > 0; missing--) {
        z.rot.push({ itemId: id, roomId, at: now + ROT_MS });
      }
    }
  }
}
