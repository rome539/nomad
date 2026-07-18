// The sim's bed, out of the one-blob ceiling (rome, 2026-07-17).
//
// The whole live world used to sleep in ONE storage value ("sim"), and
// Cloudflare caps a single value at 128 KiB — measured 21% full at the
// then-current world, and the hard reason the world could never grow past a
// few hundred monsters. ZoneDO was declared SQLite-backed at v1, so the fix
// is rows in the object's own SQLite: one row per creature, one row per room
// with anything on its floor, one row per small singleton. No row will ever
// see a ceiling; the world's size stops being a storage question.
//
// Shape discipline: this file converts SimState <-> rows and NOTHING else.
// zone.ts builds the exact same SimState it always built and hydrates from
// the exact same SimState shape — only where it sleeps changed. Legacy
// migration: the first wake that finds no rows falls back to the old blob,
// hydrates, writes rows, and deletes the blob (in that order, so a crash
// between leaves the blob as backup and the next wake prefers the rows).
//
// Write economics (CF free plan bills SQLite rows written): a naive diff
// would rewrite every creature every tick (hunger creeps each beat). So:
//   • Creature dirt is judged on a STABLE serialization that ignores the
//     churn fields (hunger, wander/thirst/sleep clocks) — a creature row
//     writes when something that MATTERS moved (room, hp, wounds, target
//     kin, carried loot), and the churn rides along whenever it does.
//   • m:savedAt and m:arrivals change every beat by nature; they're
//     throttled to one write a minute. savedAt staleness ≤60s only means
//     catch-up re-sims ≤one 60s step — the sim's own granularity.
//   • A full flush every 5 minutes writes everything anyway, so nothing
//     stays stale past that whatever the diff thinks.
// Steady state lands at a handful of tiny rows per tick — cheaper than the
// 27KB blob it replaces.
import type { SimState, Creature, Trace, GroundInstance } from "./zone-types";

const THROTTLE_MS = 60_000; // m:savedAt / m:arrivals at most once a minute
const FULL_FLUSH_MS = 5 * 60_000; // everything lands at least this often

// The churn fields: real state, but drifting every beat — excluded from the
// dirt judgement, carried along in every actual write, and never stale past
// the full flush. (Restart staleness is repaired by catchUp anyway: hunger
// and wander clocks re-advance from savedAt.)
const VOLATILE = new Set(["hunger", "nextWanderAt", "thirstAt", "sleepUntil", "repositionAt", "murmuredAt"]);

// The singletons, one row each. Every field of SimState that isn't creatures
// or per-room floor state must be listed here — shard() writes exactly these.
// COMPLETENESS IS COMPILE-CHECKED: the guards below refuse to build if a
// SimState field is neither in PER_ROW handling nor this list — so "we added
// a sim field and the store silently forgets it on restart" is a tsc error,
// not a haunting.
type PerRowField = "creatures" | "ground" | "groundInstances" | "groundCond"
  | "groundLore" | "groundHeart" | "groundTorch" | "traces";
type MetaField = Exclude<keyof SimState, PerRowField>;
const META_FIELDS = [
  "savedAt", "regrow", "arrivals", "openDoors", "doorCloseAt", "fenceOut",
  "bloodOn", "nextStoneAt", "nextBrandAt", "nextSmokeTorchAt", "nextCarrionAt", "rot", "placedSpawns", "inGatehouse", "wallMarks",
  "cacheSpent", "cacheRoom", "nextSurfaceAt", "events", "fishStock",
] as const satisfies readonly MetaField[];
// Errors when a MetaField is missing from META_FIELDS (the type collapses to
// the missing names instead of `true`, and `true` no longer assigns).
type MissingMeta = Exclude<MetaField, (typeof META_FIELDS)[number]>;
const _metaComplete: MissingMeta extends never ? true : MissingMeta = true;
void _metaComplete;

export interface SimCache {
  vals: Map<string, string>; // key -> last-written serialization (stable form for c: keys)
  throttleAt: Map<string, number>; // throttled meta key -> ms of last write
  lastFullFlushAt: number;
}

export function newCache(): SimCache {
  return { vals: new Map(), throttleAt: new Map(), lastFullFlushAt: 0 };
}

export function ensureTable(storage: DurableObjectStorage): void {
  storage.sql.exec("CREATE TABLE IF NOT EXISTS sim_kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
}

// A creature's dirt-judgement serialization: the same JSON minus the churn.
function stableCreature(c: Creature): string {
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c)) {
    if (!VOLATILE.has(k) && v !== undefined) copy[k] = v;
  }
  return JSON.stringify(copy);
}

// One room's floor, bundled: items, instanced journals, wear/lore/heart-age
// (their "itemId@roomId" keys split per room), the burning ground torch, and
// the room's traces. Absent when the room holds nothing at all.
interface RoomBundle {
  g?: string[]; // plain ground items
  i?: GroundInstance[]; // instanced (journals)
  c?: Record<string, number>; // itemId -> condition
  l?: Record<string, string>; // itemId -> loreId
  h?: Record<string, number>; // itemId -> heart cut-time
  t?: number; // a torch burning on the floor, until (ms)
  tr?: Trace[]; // traces
}

// Split an "itemId@roomId" keyed record out into per-room item maps.
function byRoom(rec: Record<string, unknown> | undefined): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  for (const [key, v] of Object.entries(rec ?? {})) {
    const at = key.lastIndexOf("@");
    if (at < 0) continue;
    const itemId = key.slice(0, at);
    const roomId = key.slice(at + 1);
    let m = out.get(roomId);
    if (!m) { m = {}; out.set(roomId, m); }
    m[itemId] = v;
  }
  return out;
}

// SimState -> the full key/value picture (what the rows SHOULD be).
function shard(state: SimState): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of state.creatures) out.set(`c:${c.id}`, JSON.stringify(c));

  const conds = byRoom(state.groundCond);
  const lores = byRoom(state.groundLore);
  const hearts = byRoom(state.groundHeart);
  const rooms = new Set<string>([
    ...Object.keys(state.ground),
    ...Object.keys(state.groundInstances ?? {}),
    ...Object.keys(state.groundTorch ?? {}),
    ...Object.keys(state.traces ?? {}),
    ...conds.keys(), ...lores.keys(), ...hearts.keys(),
  ]);
  for (const roomId of rooms) {
    const b: RoomBundle = {};
    const g = state.ground[roomId];
    if (g && g.length) b.g = g;
    const i = (state.groundInstances ?? {})[roomId];
    if (i && i.length) b.i = i;
    const c = conds.get(roomId);
    if (c && Object.keys(c).length) b.c = c as Record<string, number>;
    const l = lores.get(roomId);
    if (l && Object.keys(l).length) b.l = l as Record<string, string>;
    const h = hearts.get(roomId);
    if (h && Object.keys(h).length) b.h = h as Record<string, number>;
    const t = (state.groundTorch ?? {})[roomId];
    if (t) b.t = t;
    const tr = (state.traces ?? {})[roomId];
    if (tr && tr.length) b.tr = tr;
    if (Object.keys(b).length) out.set(`r:${roomId}`, JSON.stringify(b));
  }

  for (const f of META_FIELDS) {
    out.set(`m:${f}`, JSON.stringify((state as unknown as Record<string, unknown>)[f] ?? null));
  }
  return out;
}

// Rows -> the exact SimState shape zone.ts has always hydrated from.
function unshard(rows: Map<string, string>): SimState {
  const state: Record<string, unknown> = {
    creatures: [] as Creature[],
    ground: {} as Record<string, string[]>,
    groundInstances: {} as Record<string, GroundInstance[]>,
    groundCond: {} as Record<string, number>,
    groundLore: {} as Record<string, string>,
    groundHeart: {} as Record<string, number>,
    groundTorch: {} as Record<string, number>,
    traces: {} as Record<string, Trace[]>,
    regrow: [],
    arrivals: {},
    openDoors: [],
    savedAt: 0,
  };
  for (const [k, v] of rows) {
    if (k.startsWith("c:")) {
      (state.creatures as Creature[]).push(JSON.parse(v) as Creature);
    } else if (k.startsWith("r:")) {
      const roomId = k.slice(2);
      const b = JSON.parse(v) as RoomBundle;
      if (b.g) (state.ground as Record<string, string[]>)[roomId] = b.g;
      if (b.i) (state.groundInstances as Record<string, GroundInstance[]>)[roomId] = b.i;
      for (const [itemId, cond] of Object.entries(b.c ?? {})) (state.groundCond as Record<string, number>)[`${itemId}@${roomId}`] = cond;
      for (const [itemId, lore] of Object.entries(b.l ?? {})) (state.groundLore as Record<string, string>)[`${itemId}@${roomId}`] = lore;
      for (const [itemId, at] of Object.entries(b.h ?? {})) (state.groundHeart as Record<string, number>)[`${itemId}@${roomId}`] = at;
      if (b.t) (state.groundTorch as Record<string, number>)[roomId] = b.t;
      if (b.tr) (state.traces as Record<string, Trace[]>)[roomId] = b.tr;
    } else if (k.startsWith("m:")) {
      const parsed = JSON.parse(v);
      if (parsed !== null) state[k.slice(2)] = parsed;
    }
  }
  return state as unknown as SimState;
}

// Read the whole sim out of the rows. Null when no rows exist (a first light,
// or a pre-rows world whose blob the caller should try next). Seeds the cache
// so the first save after a load only writes what actually changed.
export function loadSim(storage: DurableObjectStorage, cache: SimCache): SimState | null {
  const rows = new Map<string, string>();
  for (const row of storage.sql.exec<{ k: string; v: string }>("SELECT k, v FROM sim_kv")) {
    rows.set(row.k, row.v);
  }
  if (rows.size === 0) return null;
  const state = unshard(rows);
  cache.vals.clear();
  cache.throttleAt.clear();
  const now = Date.now();
  for (const [k, v] of rows) {
    // c: keys are judged on the stable form — recompute it from what was read.
    cache.vals.set(k, k.startsWith("c:") ? stableCreature(JSON.parse(v) as Creature) : v);
    if (k === "m:savedAt" || k === "m:arrivals") cache.throttleAt.set(k, now);
  }
  cache.lastFullFlushAt = now;
  return state;
}

// Write the sim: upsert what changed, delete what's gone, leave the rest be.
// One transaction, so a crash mid-save never leaves half a world.
export function saveSim(storage: DurableObjectStorage, state: SimState, cache: SimCache): void {
  const now = Date.now();
  const fullFlush = now - cache.lastFullFlushAt >= FULL_FLUSH_MS;
  if (fullFlush) cache.lastFullFlushAt = now;

  const want = shard(state);
  const puts: [string, string][] = [];
  const cacheAs: [string, string][] = []; // what the cache should hold for each put — applied ONLY after the disk commits
  const dels: string[] = [];

  // The dirt judgement, per key kind. NOTE the cache is not touched in this
  // loop: if the transaction below throws, the cache must keep believing the
  // OLD rows are on disk (they are), so the next save retries the same dirt.
  // Updating it early was a real bug — a failed write would have gone silently
  // unwritten until the next full flush.
  const creatureById = new Map(state.creatures.map((c) => [`c:${c.id}`, c]));
  for (const [k, v] of want) {
    if (k.startsWith("c:")) {
      const stable = stableCreature(creatureById.get(k)!);
      if (fullFlush || cache.vals.get(k) !== stable) {
        puts.push([k, v]);
        cacheAs.push([k, stable]);
      }
      continue;
    }
    if ((k === "m:savedAt" || k === "m:arrivals") && !fullFlush) {
      // Beat-churn singletons: at most one write a minute.
      if (now - (cache.throttleAt.get(k) ?? 0) < THROTTLE_MS && cache.vals.has(k)) continue;
    }
    if (fullFlush || cache.vals.get(k) !== v) {
      puts.push([k, v]);
      cacheAs.push([k, v]);
    }
  }
  for (const k of cache.vals.keys()) {
    if (!want.has(k)) dels.push(k);
  }

  if (!puts.length && !dels.length) return;
  storage.transactionSync(() => {
    for (const [k, v] of puts) {
      storage.sql.exec("INSERT INTO sim_kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, v);
    }
    for (const k of dels) {
      storage.sql.exec("DELETE FROM sim_kv WHERE k = ?", k);
    }
  });
  // The disk took it — NOW the cache may believe it.
  for (const [k, v] of cacheAs) {
    cache.vals.set(k, v);
    if (k === "m:savedAt" || k === "m:arrivals") cache.throttleAt.set(k, now);
  }
  for (const k of dels) { cache.vals.delete(k); cache.throttleAt.delete(k); }
}

// Blow the rows away (reseed's half of the job — the caller drops the legacy
// blob key alongside).
export function clearSim(storage: DurableObjectStorage, cache: SimCache): void {
  storage.sql.exec("DELETE FROM sim_kv");
  cache.vals.clear();
  cache.throttleAt.clear();
  cache.lastFullFlushAt = 0;
}
