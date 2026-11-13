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
import { CRUDE_MAP, MAP_PULP_MIN_MS, MAP_PULP_MAX_MS, MAP_PULP_SWEEP_MS } from "./zone-data";

const lastSweep = new WeakMap<ZoneDO, number>();

export function tickMapRot(z: ZoneDO, now: number, silent = false): void {
  if (now - (lastSweep.get(z) ?? 0) < MAP_PULP_SWEEP_MS) return;
  // THE FIRST SWEEP OF A WAKE arms the stray clocks on every floor. They are
  // armed when a thing is put down, so whatever was already lying when a
  // kind joined STRAY_DECAY (the dressings, 2026-11-13) would keep for ever.
  // armStrayDecay counts its own pending timers, so this never doubles one.
  if (!lastSweep.has(z)) for (const roomId of [...z.ground.keys()]) z.armStrayDecay(roomId);
  lastSweep.set(z, now);
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
