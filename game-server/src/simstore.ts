// The sim's bed: a handful of category blobs (rome, 2026-07-18).
//
// THIRD SHAPE. First the whole world slept in ONE storage value ("sim") —
// killed by the storage.put 128KiB single-value cap. Then one row per
// creature / per floor-room / per meta singleton (the SQL-rows ship,
// e1537f7) — which broke the OTHER ceiling: Cloudflare bills rows_written
// by ROW COUNT, not bytes, so a living world writing a handful of changed
// rows every flush blew the daily allowance. The blob was cheap on the
// billed metric; the rows were scalable. This is the middle path that is
// both: THREE blobs in the same sim_kv table —
//   b:creatures — every creature, one JSON array (sorted by id)
//   b:ground    — every room's floor state, one JSON object (sorted rooms)
//   b:meta      — every SimState singleton, one JSON object
// A save re-serializes each category and writes ONLY the dirty blobs: a
// beat of creature churn is 1 row written, not one per mob. Steady state
// lands at ~1-2 rows a flush + a size that no longer matters (each blob
// sits ~2-25KB; sql.exec rows take far more than storage.put's 128KiB ever
// did, we warn loudly at 64KB, and the designed escape — splitting
// b:creatures by zone — lands long before any wall).
//
// Shape discipline: this file converts SimState <-> storage and NOTHING
// else. zone.ts builds the exact same SimState it always built and hydrates
// from the exact same shape — only where it sleeps changed. MIGRATION IS
// IN PLACE, NO RESEED: loadSim prefers the b:* blobs; finding only the old
// per-row keys (c:/r:/m:) it hydrates from those, and the FIRST save writes
// the three blobs and deletes every stale per-row key in the same
// transaction — so the conversion commits whole or not at all, and a crash
// before it leaves the old rows loadable. (The ancient one-blob "sim" value
// is still upstream of us: zone.ts falls back to it when loadSim returns
// null, and the first save converts that world the same way.)
//
// Write economics (rows_written is the billed metric): a naive diff would
// rewrite b:creatures every tick (hunger creeps each beat) and b:meta every
// save (savedAt moves by definition). So:
//   • Creature dirt is judged on a STABLE serialization that ignores the
//     churn fields (hunger, wander/thirst/sleep clocks) — the blob writes
//     when something that MATTERS moved (room, hp, wounds, target kin,
//     carried loot), and every creature's churn rides along whenever it
//     does.
//   • Meta dirt likewise ignores savedAt and arrivals (they move every
//     beat by nature); those ride along on any real meta change, and a
//     60s throttle writes them anyway so savedAt staleness stays ≤~1min —
//     catch-up re-sims from savedAt at the sim's own granularity.
//   • A full flush every 20 minutes writes all three anyway, so nothing
//     stays stale past that whatever the diff thinks.
import type { SimState, Creature, Trace, GroundInstance } from "./zone-types";

const META_THROTTLE_MS = 60_000; // savedAt/arrivals churn lands at most once a minute (riding sooner on any real meta change)
const FULL_FLUSH_MS = 20 * 60_000; // all three blobs land at least this often — the safety net under the diff

// The creature churn fields: real state, but drifting every beat — excluded
// from the dirt judgement, carried along in every actual write, and never
// stale past the full flush. (Restart staleness is repaired by catchUp
// anyway: hunger and wander clocks re-advance from savedAt.)
const VOLATILE = new Set(["hunger", "nextWanderAt", "thirstAt", "sleepUntil", "repositionAt", "murmuredAt"]);
// The meta churn fields: same idea at the singleton level. savedAt moves
// every save by definition; arrivals shifts every beat.
const CHURN_META = new Set(["savedAt", "arrivals"]);

// The blob keys. Everything else found in sim_kv is a stale row from an
// older shape, swept on the first save.
// b:creatures was ONE row holding every creature in the world, which meant one
// wolf changing rooms in the wood rewrote the fortress, the deep and the
// warrens along with it. That was correct while the world was 110 rooms and it
// stopped being correct at 512: measured, a creature carrying a grudge, a home
// and a thirst clock serialises to ~330 bytes, so the 64KB warn below lands
// near 270 creatures and the world already stands at ~224 — with the Crossing
// (~100 mobs) and the mountain (~300) still to come.
//
// THE SPLIT, which this file has been promising in its own header since the
// rows ship: one blob PER SHARD, keyed b:creatures:<shard>. The caller decides
// what a shard is (zone.ts hands over its band) — this file still knows nothing
// about rooms or regions, which is the shape discipline it has always kept.
//
// What it actually buys, stated honestly: the bytes WRITTEN drop to the churn
// rather than the world, and each blob stays small. The stable form of every
// shard is still computed each save to judge dirt, so that half of the cost
// stays linear in population — but the second serialisation (the real blob)
// and the disk write now scale with what MOVED. At steady state that is one
// region, not eight.
const B_CREATURES = "b:creatures";           // the pre-split single blob: read once at the crossover, then swept
const B_CREATURES_PREFIX = "b:creatures:";   // ...and this is what replaces it
const B_GROUND = "b:ground";
const B_META = "b:meta";
const isCreatureShard = (k: string) => k.startsWith(B_CREATURES_PREFIX);
// A row this store owns and must never sweep as a stray.
const isOurs = (k: string) => k === B_GROUND || k === B_META || isCreatureShard(k)
  || (ROLLBACK_SHADOW && k === B_CREATURES); // the shadow is ours while it stands, and must never be swept
// Where a creature with no shard goes. Only reachable if a caller passes no
// sharder at all (tests, or a future caller that does not care) — the world
// then behaves exactly as it did before the split, in one blob.
const SHARD_FALLBACK = "world";
// THE ROLLBACK SHADOW, and why this is not optional.
//
// Tested, not assumed: deploy the split, let it convert, then redeploy the
// PREVIOUS build against the converted storage and the old code finds b:ground
// and b:meta, decides the world is fine, reads b:creatures — which the
// crossover deleted — and hydrates ZERO creatures. Worse, `placedSpawns` in
// meta still lists every seeded mob, so the seeder will not put them back, and
// worse again, the old code's first save sweeps the shards as strays. One
// rollback and the world is permanently empty short of a reseed, which is the
// one thing that must never be needed while people are playing.
//
// So the split keeps the OLD key alive as a shadow, refreshed on the full
// flush only. That costs one extra write every FULL_FLUSH_MS — the flush was
// already rewriting every shard at that moment anyway, so it is the same bytes
// one more time, and nothing at all in steady state. A rollback then comes back
// to a world at most one flush stale (positions and wounds), which is a blip
// instead of an extinction.
//
// REMOVE THIS in a later ship, once the split has run long enough that rolling
// back past it is not a thing anyone would do. Until then it is the difference
// between a reversible deploy and a one-way door.
const ROLLBACK_SHADOW = true;

// Every field of SimState that isn't creatures or per-room floor state must
// be listed here — the meta blob holds exactly these. COMPLETENESS IS
// COMPILE-CHECKED: the guards below refuse to build if a SimState field is
// neither ground/creature-handled nor in this list — so "we added a sim
// field and the store silently forgets it on restart" is a tsc error, not a
// haunting.
type PerBlobField = "creatures" | "ground" | "groundInstances" | "groundCond"
  | "groundLore" | "groundRolled" | "groundHeart" | "groundTorch" | "traces";
type MetaField = Exclude<keyof SimState, PerBlobField>;
const META_FIELDS = [
  "savedAt", "regrow", "roamRocks", "arrivals", "openDoors", "doorCloseAt", "fenceOut",
  "bloodOn", "nextStoneAt", "nextBrandAt", "nextSmokeTorchAt", "nextCarrionAt", "rot", "placedSpawns", "seededDens", "inGatehouse", "inDen", "walked", "wallMarks", "board", "stoneNames",
  "cacheSpent", "cacheRoom", "nextSurfaceAt", "events", "fishStock", "works", "nextWorksAt", "nextChainmanAt",
  "nests", "bounties", "nextBountyChurnAt", "nextFenceChurnAt", "bountyTaken", "keeperBowl",
] as const satisfies readonly MetaField[];
// Errors when a MetaField is missing from META_FIELDS (the type collapses to
// the missing names instead of `true`, and `true` no longer assigns).
type MissingMeta = Exclude<MetaField, (typeof META_FIELDS)[number]>;
const _metaComplete: MissingMeta extends never ? true : MissingMeta = true;
void _metaComplete;

export interface SimCache {
  vals: Map<string, string>; // blob key -> last-written serialization (STABLE form for b:creatures / b:meta) — plus stale legacy keys pending the first-save sweep, held with "" (never compared, only deleted)
  metaWroteAt: number; // ms b:meta last landed — the savedAt/arrivals churn throttle
  lastFullFlushAt: number;
}

export function newCache(): SimCache {
  return { vals: new Map(), metaWroteAt: 0, lastFullFlushAt: 0 };
}

export function ensureTable(storage: DurableObjectStorage): void {
  storage.sql.exec("CREATE TABLE IF NOT EXISTS sim_kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
}

// ---- serialization: SimState -> the three blobs ----
// Everything is written in a canonical order (creatures sorted by id, rooms
// and their item maps sorted by key, meta in META_FIELDS order) so the same
// world always serializes to the same string — the dirt judgement is a plain
// string compare, and a mere Map-insertion-order shuffle never buys a write.

function sortedRecord<T>(entries: [string, T][]): Record<string, T> {
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries);
}

// A creature minus the churn — the dirt-judgement form.
function stableCreatureCopy(c: Creature): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c)) {
    if (!VOLATILE.has(k) && v !== undefined) copy[k] = v;
  }
  return copy;
}

function byId(a: Creature, b: Creature): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function creaturesBlob(creatures: Creature[]): string {
  return JSON.stringify([...creatures].sort(byId));
}

function stableCreatures(creatures: Creature[]): string {
  return JSON.stringify([...creatures].sort(byId).map(stableCreatureCopy));
}

/** Bucket the population by shard. Deterministic: the same world always
 *  produces the same buckets, and each bucket serialises in id order, so the
 *  dirt judgement stays a plain string compare per shard. */
function shardCreatures(creatures: Creature[], shardOf?: (c: Creature) => string): Map<string, Creature[]> {
  const out = new Map<string, Creature[]>();
  for (const c of creatures) {
    const key = (shardOf ? shardOf(c) : SHARD_FALLBACK) || SHARD_FALLBACK;
    let list = out.get(key);
    if (!list) { list = []; out.set(key, list); }
    list.push(c);
  }
  return out;
}

// One room's floor, bundled: items, instanced journals, wear/lore/heart-age
// (their "itemId@roomId" keys split per room), the burning ground torch, and
// the room's traces. Absent when the room holds nothing at all.
interface RoomBundle {
  g?: string[]; // plain ground items
  i?: GroundInstance[]; // instanced (journals)
  c?: Record<string, number>; // itemId -> condition
  l?: Record<string, string>; // itemId -> loreId
  r?: Record<string, string>; // itemId -> rolled_traits (099)
  h?: Record<string, number>; // itemId -> heart cut-time
  t?: number; // a torch burning on the floor, until (ms)
  tr?: Trace[]; // traces
}

// Split an "itemId@roomId" keyed record out into per-room item maps.
function byRoom<T>(rec: Record<string, T> | undefined): Map<string, [string, T][]> {
  const out = new Map<string, [string, T][]>();
  for (const [key, v] of Object.entries(rec ?? {})) {
    const at = key.lastIndexOf("@");
    if (at < 0) continue;
    const itemId = key.slice(0, at);
    const roomId = key.slice(at + 1);
    let m = out.get(roomId);
    if (!m) { m = []; out.set(roomId, m); }
    m.push([itemId, v]);
  }
  return out;
}

function groundBlob(state: SimState): string {
  const conds = byRoom(state.groundCond);
  const lores = byRoom(state.groundLore);
  const rolls = byRoom(state.groundRolled);
  const hearts = byRoom(state.groundHeart);
  const rooms = [...new Set<string>([
    ...Object.keys(state.ground),
    ...Object.keys(state.groundInstances ?? {}),
    ...Object.keys(state.groundTorch ?? {}),
    ...Object.keys(state.traces ?? {}),
    ...conds.keys(), ...lores.keys(), ...rolls.keys(), ...hearts.keys(),
  ])].sort();
  const out: Record<string, RoomBundle> = {};
  for (const roomId of rooms) {
    const b: RoomBundle = {};
    const g = state.ground[roomId];
    if (g && g.length) b.g = g;
    const i = (state.groundInstances ?? {})[roomId];
    if (i && i.length) b.i = i;
    const c = conds.get(roomId);
    if (c && c.length) b.c = sortedRecord(c);
    const l = lores.get(roomId);
    if (l && l.length) b.l = sortedRecord(l);
    const r = rolls.get(roomId);
    if (r && r.length) b.r = sortedRecord(r);
    const h = hearts.get(roomId);
    if (h && h.length) b.h = sortedRecord(h);
    const t = (state.groundTorch ?? {})[roomId];
    if (t) b.t = t;
    const tr = (state.traces ?? {})[roomId];
    if (tr && tr.length) b.tr = tr;
    if (Object.keys(b).length) out[roomId] = b;
  }
  return JSON.stringify(out);
}

function metaBlob(state: SimState): string {
  const out: Record<string, unknown> = {};
  for (const f of META_FIELDS) {
    out[f] = (state as unknown as Record<string, unknown>)[f] ?? null;
  }
  return JSON.stringify(out);
}

function stableMeta(state: SimState): string {
  const out: Record<string, unknown> = {};
  for (const f of META_FIELDS) {
    if (!CHURN_META.has(f)) out[f] = (state as unknown as Record<string, unknown>)[f] ?? null;
  }
  return JSON.stringify(out);
}

// ---- hydration: rows -> the exact SimState shape zone.ts always hydrated from ----

function emptyState(): Record<string, unknown> {
  return {
    creatures: [] as Creature[],
    ground: {} as Record<string, string[]>,
    groundInstances: {} as Record<string, GroundInstance[]>,
    groundCond: {} as Record<string, number>,
    groundLore: {} as Record<string, string>,
    groundRolled: {} as Record<string, string>,
    groundHeart: {} as Record<string, number>,
    groundTorch: {} as Record<string, number>,
    traces: {} as Record<string, Trace[]>,
    regrow: [],
    arrivals: {},
    openDoors: [],
    savedAt: 0,
  };
}

// Expand one room's bundle into the flat state maps.
function expandBundle(state: Record<string, unknown>, roomId: string, b: RoomBundle): void {
  if (b.g) (state.ground as Record<string, string[]>)[roomId] = b.g;
  if (b.i) (state.groundInstances as Record<string, GroundInstance[]>)[roomId] = b.i;
  for (const [itemId, cond] of Object.entries(b.c ?? {})) (state.groundCond as Record<string, number>)[`${itemId}@${roomId}`] = cond;
  for (const [itemId, lore] of Object.entries(b.l ?? {})) (state.groundLore as Record<string, string>)[`${itemId}@${roomId}`] = lore;
  for (const [itemId, roll] of Object.entries(b.r ?? {})) (state.groundRolled as Record<string, string>)[`${itemId}@${roomId}`] = roll;
  for (const [itemId, at] of Object.entries(b.h ?? {})) (state.groundHeart as Record<string, number>)[`${itemId}@${roomId}`] = at;
  if (b.t) (state.groundTorch as Record<string, number>)[roomId] = b.t;
  if (b.tr) (state.traces as Record<string, Trace[]>)[roomId] = b.tr;
}

function unshardBlobs(rows: Map<string, string>): SimState {
  const state = emptyState();
  // Every shard, plus the pre-split single blob if this world has not crossed
  // over yet. Reading both is what makes the crossover a non-event: a world
  // mid-migration (which cannot exist — one transaction — but be thorough)
  // still hydrates whole.
  // SHARDS WIN. The pre-split b:creatures survives as a rollback shadow, so
  // both shapes are on disk at once and reading both would hydrate every
  // creature TWICE. The shards are the live copy; the single blob is only ever
  // read by a world that has not crossed over yet.
  const creatures = state.creatures as Creature[];
  let sharded = false;
  for (const [k, v] of rows) {
    if (!isCreatureShard(k)) continue;
    creatures.push(...(JSON.parse(v) as Creature[]));
    sharded = true;
  }
  const single = rows.get(B_CREATURES);
  if (!sharded && single) creatures.push(...(JSON.parse(single) as Creature[]));
  const g = rows.get(B_GROUND);
  if (g) {
    for (const [roomId, b] of Object.entries(JSON.parse(g) as Record<string, RoomBundle>)) {
      expandBundle(state, roomId, b);
    }
  }
  const m = rows.get(B_META);
  if (m) {
    const parsed = JSON.parse(m) as Record<string, unknown>;
    for (const f of META_FIELDS) {
      if (parsed[f] !== null && parsed[f] !== undefined) state[f] = parsed[f];
    }
  }
  return state as unknown as SimState;
}

// The old per-row shape (c:<id> / r:<roomId> / m:<field>), read once at the
// crossover and never written again.
function unshardLegacy(rows: Map<string, string>): SimState {
  const state = emptyState();
  for (const [k, v] of rows) {
    if (k.startsWith("c:")) {
      (state.creatures as Creature[]).push(JSON.parse(v) as Creature);
    } else if (k.startsWith("r:")) {
      expandBundle(state, k.slice(2), JSON.parse(v) as RoomBundle);
    } else if (k.startsWith("m:")) {
      const parsed = JSON.parse(v);
      if (parsed !== null) state[k.slice(2)] = parsed;
    }
  }
  return state as unknown as SimState;
}

// Read the whole sim out of storage. Null when nothing exists (a first
// light, or a pre-rows world whose one-blob "sim" the caller should try
// next). Seeds the cache so the first save after a load only writes what
// actually changed — except after a LEGACY load, where the blob keys are
// left unseeded on purpose: the first save then writes all three blobs and
// sweeps every stale per-row key, one transaction, and the migration is done.
export function loadSim(storage: DurableObjectStorage, cache: SimCache): SimState | null {
  const rows = new Map<string, string>();
  for (const row of storage.sql.exec<{ k: string; v: string }>("SELECT k, v FROM sim_kv")) {
    rows.set(row.k, row.v);
  }
  if (rows.size === 0) return null;
  cache.vals.clear();
  const now = Date.now();
  const hasBlobs = rows.has(B_CREATURES) || rows.has(B_GROUND) || rows.has(B_META)
    || [...rows.keys()].some(isCreatureShard);
  let state: SimState;
  if (hasBlobs) {
    state = unshardBlobs(rows);
    // Seed the blob keys with the STABLE forms recomputed from the loaded
    // state (zone.ts hydrates these same objects by reference, so the next
    // save's serialization matches unless something really moved).
    // Seed each shard from its OWN row, which is exact and needs no knowledge
    // of what a shard means: the save recomputes the same buckets from the same
    // world and compares the same strings. The pre-split b:creatures is
    // deliberately NOT seeded — it is left to the stray sweep below, so the
    // first save after the crossover writes the shards and deletes it in one
    // transaction, and a crash before that leaves the old blob still loadable.
    for (const [k, v] of rows) {
      if (isCreatureShard(k)) cache.vals.set(k, stableCreatures(JSON.parse(v) as Creature[]));
    }
    cache.vals.set(B_GROUND, groundBlob(state));
    cache.vals.set(B_META, stableMeta(state));
    cache.metaWroteAt = now;
    // Anything else in the table is a stray from an older shape (a crashed
    // half-migration can't exist — same transaction — but be thorough):
    // hold it for the delete sweep.
    for (const k of rows.keys()) {
      if (!isOurs(k)) cache.vals.set(k, "");
    }
  } else {
    // LEGACY per-row world. Hydrate from it; seed the cache with ONLY the
    // legacy keys (values never compared — they exist to be swept). The blob
    // keys stay unseeded, so the first save finds all three "dirty", writes
    // them, and deletes every legacy row in the same transaction. Crash
    // before that save: these rows are still here, still loadable.
    state = unshardLegacy(rows);
    for (const k of rows.keys()) cache.vals.set(k, "");
    cache.metaWroteAt = 0;
  }
  cache.lastFullFlushAt = now;
  return state;
}

// Write the sim: the dirty blobs, and any pending stale-key sweep, in one
// transaction — a crash mid-save never leaves half a world.
export function saveSim(storage: DurableObjectStorage, state: SimState, cache: SimCache, shardOf?: (c: Creature) => string): void {
  const now = Date.now();
  const fullFlush = now - cache.lastFullFlushAt >= FULL_FLUSH_MS;
  if (fullFlush) cache.lastFullFlushAt = now;

  const puts: [string, string][] = [];
  const cacheAs: [string, string][] = []; // what the cache should believe per put — applied ONLY after the disk commits

  // The dirt judgement, per blob. NOTE the cache is not touched here: if the
  // transaction below throws, the cache must keep believing the OLD blobs
  // are on disk (they are), so the next save retries the same dirt.
  // CREATURES, PER SHARD. Only the shards whose population actually changed
  // are serialised for real and written; the rest are judged and dropped. A
  // creature crossing a border correctly dirties BOTH shards, because both
  // buckets come out different.
  const shards = shardCreatures(state.creatures, shardOf);
  // The shadow: the whole population under the old key, on full-flush beats
  // only. Never cached for dirt (it is not a source of truth and must not
  // suppress anything) — it is written when the flush says so and otherwise
  // costs nothing.
  if (ROLLBACK_SHADOW && fullFlush) puts.push([B_CREATURES, creaturesBlob(state.creatures)]);
  for (const [shard, list] of shards) {
    const key = B_CREATURES_PREFIX + shard;
    const stable = stableCreatures(list);
    if (fullFlush || cache.vals.get(key) !== stable) {
      puts.push([key, creaturesBlob(list)]);
      cacheAs.push([key, stable]);
    }
  }
  const g = groundBlob(state);
  if (fullFlush || cache.vals.get(B_GROUND) !== g) {
    puts.push([B_GROUND, g]);
    cacheAs.push([B_GROUND, g]);
  }
  // Meta: a real (non-churn) change writes now; otherwise the churn throttle
  // lets savedAt/arrivals land once a minute. Either way the write carries
  // the whole blob, churn included — savedAt on disk is never staler than
  // the throttle.
  const mStable = stableMeta(state);
  let wroteMeta = false;
  if (fullFlush || cache.vals.get(B_META) !== mStable || now - cache.metaWroteAt >= META_THROTTLE_MS) {
    puts.push([B_META, metaBlob(state)]);
    cacheAs.push([B_META, mStable]);
    wroteMeta = true;
  }

  // Anything cached that isn't one of the three blobs is a stale row from an
  // older shape (the per-row keys after a legacy load) — sweep it with the
  // write, same transaction.
  // Strays: the per-row keys after a legacy load, the pre-split b:creatures
  // after a crossover, and any shard that has EMPTIED. That last one matters —
  // a region whose creatures all died or walked out would otherwise leave its
  // last population on disk forever, and the next load would hydrate ghosts.
  const dels: string[] = [];
  const live = new Set([...shards.keys()].map((s) => B_CREATURES_PREFIX + s));
  for (const k of cache.vals.keys()) {
    if (!isOurs(k)) dels.push(k);
    else if (isCreatureShard(k) && !live.has(k)) dels.push(k);
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
  for (const [k, v] of cacheAs) cache.vals.set(k, v);
  if (wroteMeta) cache.metaWroteAt = now;
  for (const k of dels) cache.vals.delete(k);

  // The early-warning wire: blobs sit ~2-25KB today. Long before any
  // platform ceiling matters, this line in the tail says "split b:creatures
  // by zone now" — the designed escape, and it aligns with the multi-zone
  // shard direction anyway.
  for (const [k, v] of puts) {
    // Post-split this fires per SHARD, so it now says "this one region has
    // grown too big to be one blob" — which is a real and much later problem
    // than the one it used to warn about, and the answer to it is a finer
    // shard (a wood by quarter, a mountain by tier), not a new mechanism.
    if (v.length > 64 * 1024) console.warn(`simstore: ${k} at ${Math.round(v.length / 1024)}KB — shard this one finer`);
  }
}

// Blow it all away (reseed's half of the job — the caller drops the ancient
// one-blob "sim" key alongside).
export function clearSim(storage: DurableObjectStorage, cache: SimCache): void {
  storage.sql.exec("DELETE FROM sim_kv");
  cache.vals.clear();
  cache.metaWroteAt = 0;
  cache.lastFullFlushAt = 0;
}
