// THE DEAD GET UP (rome, 2026-10-24). A revenant used to stand back up in the
// same beat it fell, so the fall was never a fall: the player watched it drop
// and rise in one line. Now the first fall is a death in every way anyone can
// see: the same kill line, the fight over, the body on the floor. Then, a
// little later (RISE_MIN_MS..RISE_MAX_MS), it gets up and comes for whoever
// is standing over it, the one who put it down first of all.
//
// Nothing about the false fall is real: no kill on the sheet, no loot, no page
// in the journal, until the last fall. Whatever happens to the body meanwhile
// (a scavenger at it, a wanderer reading it) does not keep it down.
//
// The fallen are held here, off the creature map, so nothing can target, see
// or hurt them while they lie there. A zone restart in the window loses one;
// the spawn rows bring it back like any other dead thing.

import type { ZoneDO } from "./zone";
import type { Session, Creature, Trace } from "./zone-types";
import type { MobTemplate } from "./world";
import * as ai from "./ai";
import { randInt, pick } from "./rng";
import { cap } from "./zone-util";
import { HOLLOW, REVIVE_FRAC, RISE_MIN_MS, RISE_MAX_MS } from "./zone-data";

type Fallen = { c: Creature; roomId: string; at: number; body: Trace; by: string };
const fallen = new WeakMap<ZoneDO, Fallen[]>();
const list = (z: ZoneDO): Fallen[] => {
  let l = fallen.get(z);
  if (!l) { l = []; fallen.set(z, l); }
  return l;
};

// The false fall: read exactly as a real one, and take it off the board.
export function fall(z: ZoneDO, killer: Session, c: Creature, tmpl: MobTemplate, line: string, vital: boolean, now = Date.now()): void {
  c.rises = (c.rises ?? 0) + 1;
  z.send(killer, line, vital ? "kill big vital" : "kill big");
  z.actorFeed(killer, c.roomId, z.feedKill(killer.name, tmpl, vital), vital ? "vital" : "kill");
  z.roomSound(c.roomId, "Something falls {dir}, and is still.");
  z.creatureNoise(c.roomId);
  const body: Trace = { kind: HOLLOW.has(tmpl.id) ? "remains" : "blood", at: now, label: tmpl.name, id: tmpl.id };
  z.addTrace(c.roomId, body);
  z.fxDied(c.roomId, c.templateId);
  z.creatures.delete(c.id);
  z.noteCreaturesChanged();
  for (const s of z.sessions.values()) {
    if (s.target === c.id) s.target = null;
    if (s.seizedBy === c.id) s.seizedBy = undefined;
  }
  c.target = null;
  c.stunned = false;
  c.bleedTicks = 0;
  z.refreshRoomCtx(c.roomId);
  list(z).push({ c, roomId: c.roomId, at: now + randInt(RISE_MIN_MS, RISE_MAX_MS), body, by: killer.pubkey });
}

export function tick(z: ZoneDO, now: number): void {
  const l = fallen.get(z);
  if (!l?.length) return;
  const due = l.filter((f) => f.at <= now);
  if (!due.length) return;
  fallen.set(z, l.filter((f) => f.at > now));
  for (const f of due) rise(z, f, now);
}

function rise(z: ZoneDO, f: Fallen, now: number): void {
  const tmpl = z.world?.mobTemplates.get(f.c.templateId);
  if (!tmpl) return;
  const c = f.c;
  c.roomId = f.roomId;
  c.hp = Math.max(1, Math.round(tmpl.max_hp * REVIVE_FRAC));
  c.nextWanderAt = now + randInt(4000, 15_000);
  // The body was it. Whatever is left of it gets up.
  const here = z.traces.get(f.roomId);
  if (here) {
    const i = here.indexOf(f.body);
    if (i >= 0) here.splice(i, 1);
    if (!here.length) z.traces.delete(f.roomId);
  }
  z.creatures.set(c.id, c);
  z.noteCreaturesChanged();
  ai.addGrudge(z, c, f.by); // it remembers who put it down
  const standing = [...z.sessions.values()].filter((s) => s.roomId === f.roomId && !z.outOfWorld(s));
  const mark = standing.find((s) => s.pubkey === f.by) ?? standing[0];
  const name = tmpl.name.replace(/^(a|an|the) /i, "");
  z.roomFeed(f.roomId, pick([
    `The dead ${name} stirs. Then, unhurried, it gets up.`,
    `Something on the floor moves. The ${name} you put down is getting up again.`,
    `The ${name} was not done. It drags itself upright, slower than before, and turns.`,
  ]), undefined, false);
  z.roomSound(f.roomId, "Something {dir} that had gone still gets up again.", undefined, undefined, false, { mob: c.templateId, act: "move" });
  z.fxPose(f.roomId, c.templateId, "rise");
  if (mark) {
    c.target = mark.pubkey;
    if (!mark.target) mark.target = c.id;
    z.send(mark, `${cap(tmpl.name)} is up again, and it is coming for you.`, "dmgin");
  }
  z.refreshRoomCtx(f.roomId);
}

export function resetForTest(z: ZoneDO): void { fallen.set(z, []); }
