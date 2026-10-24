// THE BODY STIFFENS (rome, 2026-10-23). A vital shot is luck, not a lost fight,
// and a lucky blow that dropped everything you carried on the floor for any
// passer-by or scavenger was the one part of the vitals lottery that read as
// unfair. So when a CREATURE finds your vitals, the body goes stiff where it
// fell, hands locked round the kit, and holds it for BODY_HOLD_MS. Only you can
// work it loose ('fetch' standing there). Nobody else can take from it and
// nothing drags it off, because none of it is on the floor. When the time is
// up the hands let go and it all spills, the ordinary death, seals cracking.
//
// Every other death (wounds, bleeding out, another wanderer's steel) scatters
// exactly as it always did.
//
// The kit stays in the database the whole time, as rows in a `body:<room>`
// keeping, so a deploy or a restart cannot lose it: the index below is only a
// cache, rebuilt from those rows on the first sweep after the zone wakes.

import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { type CarriedItem, hasTrait, loadContainer, setContainer, setEquipped } from "./world";
import { BODY_HOLD_MS, BODY_SWEEP_MS } from "./zone-data";

export const BODY_PREFIX = "body:";
const keepingOf = (roomId: string): string => BODY_PREFIX + roomId;

type Body = { pubkey: string; name: string; at: number };
// One index per zone (a second zone must never see the first one's dead).
type Index = { bodies: Map<string, Body[]>; loaded: boolean; lastSweep: number };
const indexes = new WeakMap<ZoneDO, Index>();
function ix(z: ZoneDO): Index {
  let i = indexes.get(z);
  if (!i) { i = { bodies: new Map(), loaded: false, lastSweep: 0 }; indexes.set(z, i); }
  return i;
}

function note(z: ZoneDO, roomId: string, b: Body): void {
  const { bodies } = ix(z);
  const list = bodies.get(roomId) ?? [];
  const had = list.find((x) => x.pubkey === b.pubkey);
  if (had) had.at = Math.min(had.at, b.at);
  else list.push(b);
  bodies.set(roomId, list);
}
function forget(z: ZoneDO, roomId: string, pubkey: string): void {
  const { bodies } = ix(z);
  const list = (bodies.get(roomId) ?? []).filter((x) => x.pubkey !== pubkey);
  if (list.length) bodies.set(roomId, list);
  else bodies.delete(roomId);
}

async function load(z: ZoneDO): Promise<void> {
  const res = await z.env.DB.prepare(
    "SELECT i.pubkey, i.container, MIN(i.container_at) AS at, p.name FROM player_items i LEFT JOIN players p ON p.pubkey = i.pubkey WHERE i.container LIKE 'body:%' GROUP BY i.pubkey, i.container",
  ).all<{ pubkey: string; container: string; at: number | null; name: string | null }>();
  const i = ix(z);
  i.bodies.clear();
  for (const r of res.results ?? []) {
    note(z, r.container.slice(BODY_PREFIX.length), { pubkey: r.pubkey, name: r.name ?? "Someone", at: r.at ?? Date.now() });
  }
  i.loaded = true;
}

// D1 takes at most 100 bound values a statement, and a pack of loose iron and
// wood is a row a piece, so a heavy pack is well past that. A few spare for the
// other binds.
const BATCH = 90;
export function batches<T>(xs: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += BATCH) out.push(xs.slice(i, i + BATCH));
  return out;
}

// The vital death: everything still in hand goes onto the body.
export async function stiffen(z: ZoneDO, victim: Session, rows: CarriedItem[], roomId: string): Promise<void> {
  if (!rows.length) return;
  const now = Date.now();
  // The equipped flag stays on the rows: what you wore, the body still wears,
  // and 'fetch' puts it back on you rather than into a pack it would not fit.
  for (const ids of batches(rows.map((c) => c.rowId))) {
    await z.env.DB.prepare(
      `UPDATE player_items SET container = ?, container_at = ? WHERE pubkey = ? AND container = '' AND id IN (${ids.map(() => "?").join(",")})`,
    ).bind(keepingOf(roomId), now, victim.pubkey, ...ids).run();
  }
  note(z, roomId, { pubkey: victim.pubkey, name: victim.name, at: now });
}

export function hasBody(z: ZoneDO, roomId: string, pubkey: string): boolean {
  return (ix(z).bodies.get(roomId) ?? []).some((b) => b.pubkey === pubkey);
}

// What a room says about the bodies in it.
export function roomLines(z: ZoneDO, roomId: string, viewer: string, now = Date.now()): string[] {
  return (ix(z).bodies.get(roomId) ?? []).map((b) => {
    if (b.pubkey !== viewer) return `${b.name}'s body lies here, gone stiff, the hands locked round everything it carried.`;
    const mins = Math.max(1, Math.ceil((b.at + BODY_HOLD_MS - now) / 60_000));
    return `Your own body lies here, stiff, the hands still locked round your kit. ('fetch' to work it loose; it lets go in ${mins} minute${mins === 1 ? "" : "s"}.)`;
  });
}

// 'fetch' over your own body: take back everything the pack has room for.
// Returns false when there is no body of yours here, so 'fetch' goes on to the
// shelves and the stores as before.
export async function reclaim(z: ZoneDO, session: Session): Promise<boolean> {
  if (!ix(z).loaded) await load(z); // a zone just woken has not swept yet
  if (!hasBody(z, session.roomId, session.pubkey)) return false;
  const keeping = keepingOf(session.roomId);
  const held = await loadContainer(z.env.DB, session.pubkey, keeping);
  if (!held.length) { forget(z, session.roomId, session.pubkey); return false; }
  const worn = new Set(((await z.env.DB.prepare("SELECT id FROM player_items WHERE pubkey = ? AND container = ? AND equipped = 1")
    .bind(session.pubkey, keeping).all<{ id: string }>()).results ?? []).map((r) => r.id));
  // WHAT YOU WORE GOES BACK ON FIRST, by the pickup's own rule: an empty slot,
  // and never a two-handed weapon across a shield. Worn gear takes no pack
  // slot, so a full kit over a full pack all comes back; and a pocketed coat
  // back on widens the pack before the rest is counted.
  const wearable = (c: CarriedItem): boolean => {
    const t = z.world!.itemTemplates.get(c.itemId);
    if (!t?.slot || !worn.has(c.rowId) || z.equippedItem(session, t.slot)) return false;
    return !((t.slot === "weapon" && hasTrait(t, "two-handed") && z.equippedItem(session, "shield") !== null)
      || (t.slot === "shield" && hasTrait(z.equippedItem(session, "weapon")?.tmpl, "two-handed")));
  };
  let took = 0;
  const back: CarriedItem[] = [];
  for (const c of held) {
    if (!wearable(c)) continue;
    await setContainer(z.env.DB, c.rowId, "");
    await setEquipped(z.env.DB, c.rowId, true);
    c.equipped = true;
    session.items.push(c);
    back.push(c);
    took++;
  }
  for (const c of held) {
    if (back.includes(c)) continue;
    if (z.foodCapped(session, c.itemId) || z.torchCapped(session, c.itemId) || z.dressingCapped(session, c.itemId) || !z.packRoom(session, c.itemId)) continue;
    await setContainer(z.env.DB, c.rowId, "");
    session.items.push(c);
    took++;
  }
  const left = held.length - took;
  if (!left) forget(z, session.roomId, session.pubkey);
  z.send(session, took === 0
    ? "You kneel over your own body, but there is no room on you for any of it. Make room first."
    : `You kneel over your own body and work the stiff fingers open, one at a time. ${took} thing${took === 1 ? "" : "s"} back in your hands${left ? `; ${left} more you have no room for, and the body keeps hold of them.` : ", and the body lets go of the last of it."}`);
  z.sendCtx(session);
  return true;
}

// The clock: anything a body has held past BODY_HOLD_MS spills as an ordinary
// death would leave it. Throttled; called from the tick.
export async function sweep(z: ZoneDO, now: number): Promise<void> {
  const i = ix(z);
  if (now - i.lastSweep < BODY_SWEEP_MS) return;
  i.lastSweep = now;
  if (!i.loaded) await load(z);
  const cut = now - BODY_HOLD_MS;
  for (const [roomId, list] of [...i.bodies]) {
    for (const b of [...list]) {
      if (b.at > cut) continue;
      const held = await loadContainer(z.env.DB, b.pubkey, keepingOf(roomId));
      const due = held.filter((c) => (c.containerAt ?? 0) <= cut);
      if (due.length) {
        await z.spillCarried(roomId, due);
        for (const ids of batches(due.map((c) => c.rowId))) {
          await z.env.DB.prepare(`DELETE FROM player_items WHERE pubkey = ? AND id IN (${ids.map(() => "?").join(",")})`).bind(b.pubkey, ...ids).run();
        }
        z.roomFeed(roomId, `${b.name}'s body goes slack at last, and everything it was holding spills across the ground.`, undefined, false);
        const owner = [...z.sessions.values()].find((s) => s.pubkey === b.pubkey);
        if (owner) z.send(owner, `Far off, in ${z.world!.rooms.get(roomId)?.name ?? "the place you fell"}, your body lets go of what it was holding. It lies on the ground there now, for anyone.`);
      }
      const rest = held.filter((c) => (c.containerAt ?? 0) > cut);
      if (rest.length) b.at = Math.min(...rest.map((c) => c.containerAt ?? now));
      else forget(z, roomId, b.pubkey);
    }
  }
}

// Test seam: start from an empty, loaded index.
export function resetForTest(z: ZoneDO): void { indexes.set(z, { bodies: new Map(), loaded: true, lastSweep: 0 }); }
