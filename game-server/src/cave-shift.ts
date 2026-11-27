// THE CAVE MOVES (2026-11-26). Three things change which ways are open under the wood:
//
//   THE FALLS. Bad roof in the diggers' props and the upper cave's broken ground
//   comes down now and then and chokes a passage to the roof, two at the most at
//   once. A digger on his round who comes to one digs it out; one the diggers
//   never reach settles open again in time.
//   THE WATER. While it rains on the wood above, the water rises in the cave's wet
//   ways and its river and pool rooms, a level at a time, and drains after. The
//   five low passages fill to the roof at the top and cannot be entered; the rest
//   stand a hand, then a knee deep.
//   THE STONE. The dressed stone of the bottom floor shifts on its own clock: a few
//   of its doorways close and a few that were closed open again, always.
//
// NOTHING IS EVER SHUT IN OR SHUT OUT. A passage falls, a slab closes or a room
// fills only if the two sides still reach each other some other way, and a room
// full of water stops you going in, never coming out. A surveyor's map keeps the
// cave as it was surveyed.
//
// The closed ways live in the in-memory world book, which a deploy rebuilds from
// D1, so every tick re-asserts them (as the breach does); the state rides the
// saved events ("cave-ways").
import type { ZoneDO } from "./zone";
import type { Creature } from "./zone-types";
import { chance, pick, randInt } from "./rng";
import { cap } from "./zone-util";
import { wxPhase } from "./events";
import { creatureMoves } from "./ai";
import { HOLLOW, SENTINELS, ROOTED } from "./zone-data";

type Way = [string, string]; // two rooms that share a passage, both ways

// ---- THE FALLS ---------------------------------------------------------------
export const FALL_WAYS: Way[] = [
  // the diggers' props (on their round, so a digger comes to them)
  ["the-barrow-run", "the-propped-way"], ["the-propped-way", "the-sagging-props"],
  ["the-sagging-props", "the-stone-store"], ["the-cut-through", "the-crushed-props"],
  ["the-crushed-props", "the-dry-gallery"],
  // the upper cave's broken ground, where the words have the roof down already
  ["the-breakdown", "the-north-squeeze"], ["the-breakdown", "the-pawed-sand"],
  ["the-scree-slope", "the-lip"], ["the-fallen-slab", "the-thin-ledge"],
];
export const FALLS_MAX = 2;                                   // never more than this down at once
export const FALL_EVERY_MIN_MS = 40 * 60_000, FALL_EVERY_MAX_MS = 120 * 60_000;
export const FALL_SETTLE_MS = 90 * 60_000;                    // one no digger reaches settles open
export const DIG_OUT_MIN_MS = 2 * 60_000, DIG_OUT_MAX_MS = 5 * 60_000;
const DIGGERS = new Set(["digger", "the-overman"]);

// ---- THE WATER ---------------------------------------------------------------
// The five low ways: full to the roof at the top, and shut.
export const FLOOD_SHUT_ROOMS = new Set(["the-weeping-crawl", "the-silted-pipe", "the-low-roof", "the-under-spring", "the-rising-water"]);
// The rest stand a hand deep, then a knee, and no deeper.
export const FLOOD_RISE_ROOMS = new Set([
  "the-ditch-water", "the-wet-passage", "the-glow-tunnel",
  // the glow river
  "the-falls-pool", "the-ford", "the-glow-reach", "the-narrowing", "the-river-bend", "the-river-shelf", "the-river-shingle", "the-starry-roof",
  // the glow lake
  "the-long-pool", "the-salamander-pools", "the-still-reach", "the-wide-water",
  // the galleries
  "the-dry-sink", "the-listening-floor", "the-old-water-line", "the-ox-bow", "the-pawed-sand", "the-sand-bank", "the-sand-floor", "the-shale-floor", "the-west-gallery",
  // the foxfire props
  "the-foxfire-cut", "the-foxfire-wall",
  // the dripstone
  "the-calcite-crawl", "the-curtains", "the-drip-stones", "the-flowstone", "the-rimstone",
  // the bone floors
  "the-bone-spill", "the-claw-floor", "the-cougars-larder", "the-gnaw-hole", "the-gnawed-floor", "the-kill-hole", "the-rat-run", "the-rat-shelf",
  // the black pools
  "the-deep-pool", "the-sump-mouth", "the-under-pool",
]);
export const WATER_TOP = 3;
export const WATER_RISE_MS = 10 * 60_000;   // a level every ten minutes while it rains
export const WATER_DRAIN_MS = 45 * 60_000;  // and one every three quarters of an hour after
const RAIN_OVER = "the-ferny-bank";           // the wood straight over the cave: its weather is the cave's rain
const BREATHES_WATER = new Set(["cave-crayfish", "the-blue-crayfish", "river-gulper", "the-great-gulper", "pale-salamander", "the-old-white"]);

// ---- THE STONE ---------------------------------------------------------------
export const STONE_ROOMS = new Set([
  "the-ante-room", "the-back-way", "the-black-water-hall", "the-bone-pillars", "the-brood-nests", "the-brood-way", "the-buried-hall",
  "the-carved-rings", "the-cleared-way", "the-cold-cell", "the-cold-passage", "the-cold-pit", "the-cold-road", "the-cracked-flags",
  "the-cross-hall", "the-drowned-flags", "the-east-hall", "the-east-road", "the-east-steps", "the-east-way", "the-first-flags",
  "the-groove", "the-hum", "the-last-heading", "the-long-flags", "the-near-sink", "the-north-steps", "the-pale-steps", "the-pale-walls",
  "the-pillar-hall", "the-pillared-east", "the-pillared-way", "the-quiet-way", "the-ring-door", "the-ring-of-nine", "the-rock-fall",
  "the-sheet-water", "the-side-arch", "the-sink-foot", "the-sleepers-door", "the-south-cell", "the-south-hall", "the-south-road",
  "the-spoil-heaps", "the-stair-foot", "the-straight-way", "the-sunk-flags", "the-west-door", "the-west-hall", "the-worn-hollow",
]);
export const STONE_SHUT_MAX = 6;                              // doorways closed at once
export const STONE_MOVES = 2;                                 // closed and opened at each shift
export const STONE_EVERY_MIN_MS = 10 * 60_000, STONE_EVERY_MAX_MS = 20 * 60_000;

// ---- STATE -------------------------------------------------------------------
interface Fall { a: string; b: string; at: number; digBy?: string; digDone?: number }
interface Ways { falls: Fall[]; nextFallAt: number; level: number; levelAt: number; shut: string[]; stone: Way[]; nextStoneAt: number }

function state(z: ZoneDO, now: number): Ways {
  let st = z.events.get("cave-ways");
  // "idle" on purpose: an event in any other phase holds the world hot (zone.ts), and this one never ends
  if (!st) { st = { phase: "idle", until: Number.MAX_SAFE_INTEGER }; z.events.set("cave-ways", st); }
  st.phase = "idle";
  let w: Ways | undefined;
  try { w = st.data ? JSON.parse(st.data) as Ways : undefined; } catch { w = undefined; }
  return w ?? { falls: [], nextFallAt: now + randInt(FALL_EVERY_MIN_MS, FALL_EVERY_MAX_MS), level: 0, levelAt: now, shut: [], stone: [], nextStoneAt: now + randInt(STONE_EVERY_MIN_MS, STONE_EVERY_MAX_MS) };
}
function save(z: ZoneDO, w: Ways): void {
  const st = z.events.get("cave-ways")!;
  st.data = JSON.stringify(w);
}

// ---- THE EXITS ---------------------------------------------------------------
type ExitRow = { room_id: string; dir: string; to_room: string; key_item: string | null };
const taken = new Map<string, ExitRow>(); // a closed way's row, kept to put back: "from>to"

function wayRows(z: ZoneDO, a: string, b: string): ExitRow[] {
  return (z.world!.exits.get(a) ?? []).filter((e) => e.to_room === b) as ExitRow[];
}
/** Shut a passage both ways (idempotent). */
function closeWay(z: ZoneDO, a: string, b: string): boolean {
  let changed = false;
  for (const [x, y] of [[a, b], [b, a]]) {
    const list = z.world!.exits.get(x) ?? [];
    const keep = list.filter((e) => {
      if (e.to_room !== y) return true;
      taken.set(x + ">" + y, e as ExitRow);
      return false;
    });
    if (keep.length !== list.length) { z.world!.exits.set(x, keep); changed = true; }
  }
  if (changed) z.noteExitsChanged();
  return changed;
}
/** Open a passage both ways again, as it was. */
function openWay(z: ZoneDO, a: string, b: string): void {
  let changed = false;
  for (const [x, y] of [[a, b], [b, a]]) {
    const row = taken.get(x + ">" + y);
    const list = z.world!.exits.get(x) ?? [];
    if (row && !list.some((e) => e.to_room === y)) { list.push(row); z.world!.exits.set(x, list); changed = true; }
    taken.delete(x + ">" + y);
  }
  if (changed) z.noteExitsChanged();
}
function dirOf(z: ZoneDO, from: string, to: string): string | undefined {
  return (z.world!.exits.get(from) ?? []).find((e) => e.to_room === to)?.dir ?? taken.get(from + ">" + to)?.dir;
}

/** Can `a` still reach `b` without the passage between them and without the rooms in `banned`? */
function reaches(z: ZoneDO, a: string, b: string, banned: Set<string>, without?: Way): boolean {
  const seen = new Set([a]), q = [a];
  for (const at of q) {
    for (const e of z.world!.exits.get(at) ?? []) {
      if (e.key_item && !z.openDoors.has(`${at}:${e.dir}`)) continue;
      const to = e.to_room;
      if (without && ((at === without[0] && to === without[1]) || (at === without[1] && to === without[0]))) continue;
      if (to === b) return true;
      if (seen.has(to) || banned.has(to)) continue;
      seen.add(to); q.push(to);
    }
  }
  return false;
}
/** Shutting this passage leaves both sides joined another way. */
function mayClose(z: ZoneDO, a: string, b: string, w: Ways): boolean {
  if (!wayRows(z, a, b).length || !wayRows(z, b, a).length) return false;
  if (wayRows(z, a, b).some((e) => e.key_item)) return false;
  return reaches(z, a, b, new Set(w.shut), [a, b]);
}
/** Filling this room to the roof leaves every room beside it joined without it. */
function mayFill(z: ZoneDO, room: string, w: Ways): boolean {
  const banned = new Set([...w.shut, room]);
  // the rooms beside it that are open: one already full is nobody's way anywhere
  const next = (z.world!.exits.get(room) ?? []).map((e) => e.to_room).filter((r) => !banned.has(r));
  for (let i = 1; i < next.length; i++) if (!reaches(z, next[0], next[i], banned)) return false;
  return true;
}

// ---- TELLING IT ----------------------------------------------------------------
/** Where a way lies, said from the room: "to the north", "overhead", "underfoot". */
function side(dir: string | undefined): string {
  return !dir ? "nearby" : dir === "up" ? "overhead" : dir === "down" ? "underfoot" : "to the " + dir;
}
function tell(z: ZoneDO, room: string, line: string): void {
  z.roomFeed(room, line, undefined, false, "evt sfx-stoneshift");
}

// ---- THE TICK ----------------------------------------------------------------
export async function tick(z: ZoneDO, now: number): Promise<void> {
  if (!z.world || !z.world.rooms.has("the-breakdown")) return; // a world without the cave
  const w = state(z, now);
  // what a deploy put back, taken away again
  for (const f of w.falls) closeWay(z, f.a, f.b);
  for (const [a, b] of w.stone) closeWay(z, a, b);
  const fell = falls(z, w, now);
  water(z, w, now);
  stone(z, w, now);
  save(z, w);
  if (fell) await scatter(z, fell, now);
}

/** WHAT LIVES THERE RUNS FROM IT (2026-11-26): every living thing in the two rooms a
 *  fall came down between wakes and bolts the other way. The dead do not care. */
async function scatter(z: ZoneDO, rooms: string[], now: number): Promise<void> {
  for (const c of [...z.creatures.values()]) {
    if (!rooms.includes(c.roomId) || c.target || c.holding) continue;
    if (HOLLOW.has(c.templateId) || SENTINELS.has(c.templateId) || ROOTED.has(c.templateId)) continue;
    c.asleep = false; c.sleepUntil = undefined;
    await creatureMoves(z, c, now, "flee", false);
  }
}

function falls(z: ZoneDO, w: Ways, now: number): string[] | undefined {
  // A digger beside a fall digs it out; one no digger reaches settles open.
  for (const f of [...w.falls]) {
    if (f.digBy && f.digDone && now >= f.digDone) { clearFall(z, w, f, "dug"); continue; }
    if (!f.digBy) {
      const d = [...z.creatures.values()].find((c) => DIGGERS.has(c.templateId) && !c.target && (c.roomId === f.a || c.roomId === f.b));
      if (d) {
        f.digBy = d.id; f.digDone = now + randInt(DIG_OUT_MIN_MS, DIG_OUT_MAX_MS);
        d.nextWanderAt = Math.max(d.nextWanderAt, f.digDone);
        const name = cap(z.world!.mobTemplates.get(d.templateId)?.name ?? "a digger");
        z.roomFeed(d.roomId, `${name} sets his pick to the fallen rock and starts to clear it, a stone at a time.`, undefined, false);
      }
    } else {
      const d = z.creatures.get(f.digBy);
      if (!d || d.target || (d.roomId !== f.a && d.roomId !== f.b)) { f.digBy = undefined; f.digDone = undefined; }
    }
    if (now - f.at >= FALL_SETTLE_MS && !f.digBy) clearFall(z, w, f, "settled");
  }
  if (now < w.nextFallAt) return undefined;
  w.nextFallAt = now + randInt(FALL_EVERY_MIN_MS, FALL_EVERY_MAX_MS);
  if (w.falls.length >= FALLS_MAX) return undefined;
  const open = FALL_WAYS.filter(([a, b]) => !w.falls.some((f) => (f.a === a && f.b === b)) && mayClose(z, a, b, w));
  if (!open.length) return undefined;
  const [a, b] = pick(open);
  const dirA = dirOf(z, a, b), dirB = dirOf(z, b, a);
  closeWay(z, a, b);
  w.falls.push({ a, b, at: now });
  for (const [room, dir] of [[a, dirA], [b, dirB]] as const) {
    tell(z, room, `With a crack like a beam going, the roof ${side(dir)} comes down, and rock pours into the way until it is choked to the roof.`);
    z.roomSound(room, "Rock comes down {dir}, a long roar of it, and then the grit trickling after.", undefined, undefined, true, { act: "rubble" });
  }
  return [a, b];
}
function clearFall(z: ZoneDO, w: Ways, f: Fall, how: "dug" | "settled"): void {
  openWay(z, f.a, f.b);
  w.falls = w.falls.filter((x) => x !== f);
  for (const room of [f.a, f.b]) {
    const dir = dirOf(z, room, room === f.a ? f.b : f.a);
    tell(z, room, how === "dug"
      ? `The last of the fallen rock is dragged aside, and the way ${dir ?? "through"} is open again.`
      : `The fallen rock ${side(dir)} shifts and settles with a long grinding, and a way opens over the top of it.`);
  }
}

function water(z: ZoneDO, w: Ways, now: number): void {
  const raining = wxPhase(z, "rain", RAIN_OVER) === "active";
  const was = w.level;
  if (raining && w.level < WATER_TOP && now - w.levelAt >= WATER_RISE_MS) { w.level++; w.levelAt = now; }
  else if (!raining && w.level > 0 && now - w.levelAt >= WATER_DRAIN_MS) { w.level--; w.levelAt = now; }
  else if (raining && w.level === WATER_TOP) w.levelAt = now; // the top holds while it rains
  // The low ways fill to the roof at the top, each one only if the cave still joins round it.
  const shut = w.level >= WATER_TOP ? [...FLOOD_SHUT_ROOMS].filter((r) => z.world!.rooms.has(r)) : [];
  const keep: string[] = [];
  for (const r of shut) {
    if (w.shut.includes(r) || mayFill(z, r, { ...w, shut: keep })) keep.push(r);
  }
  const filled = keep.filter((r) => !w.shut.includes(r));
  const drained = w.shut.filter((r) => !keep.includes(r));
  w.shut = keep;
  for (const r of filled) {
    tell(z, r, "The water comes up the last of the way to the roof. There is air only where you came in; the way out is the way you came.");
    for (const c of z.creatures.values()) if (c.roomId === r && !BREATHES_WATER.has(c.templateId)) c.nextWanderAt = Math.min(c.nextWanderAt, now);
  }
  for (const r of drained) tell(z, r, "The water drops away from the roof, and there is air over it again.");
  if (w.level !== was) {
    const line = w.level > was ? "The water is rising. It comes in from the walls and the floor, brown with the wood's rain." : "The water is going down, slowly, leaving a line of silt on the rock where it stood.";
    for (const r of [...FLOOD_RISE_ROOMS, ...FLOOD_SHUT_ROOMS]) if (!filled.includes(r)) tell(z, r, line);
  }
}

function stone(z: ZoneDO, w: Ways, now: number): void {
  if (now < w.nextStoneAt) return;
  w.nextStoneAt = now + randInt(STONE_EVERY_MIN_MS, STONE_EVERY_MAX_MS);
  // what was closed longest opens first
  const opening = w.stone.slice(0, w.stone.length >= STONE_SHUT_MAX ? STONE_MOVES : Math.max(0, w.stone.length - (STONE_SHUT_MAX - STONE_MOVES)));
  for (const [a, b] of opening) {
    openWay(z, a, b);
    for (const room of [a, b]) {
      const dir = dirOf(z, room, room === a ? b : a);
      tell(z, room, `Stone grinds on stone, and the slab across the doorway ${side(dir)} draws back into the wall. The way is open.`);
    }
  }
  w.stone = w.stone.slice(opening.length);
  const ways: Way[] = [];
  for (const a of STONE_ROOMS) for (const e of z.world!.exits.get(a) ?? []) {
    if (STONE_ROOMS.has(e.to_room) && a < e.to_room && !e.key_item) ways.push([a, e.to_room]);
  }
  for (let n = 0; n < STONE_MOVES && w.stone.length < STONE_SHUT_MAX; n++) {
    const free = ways.filter(([a, b]) => !w.stone.some(([x, y]) => x === a && y === b) && !opening.some(([x, y]) => x === a && y === b) && mayClose(z, a, b, w));
    if (!free.length) break;
    const [a, b] = pick(free);
    const dirA = dirOf(z, a, b), dirB = dirOf(z, b, a);
    closeWay(z, a, b);
    w.stone.push([a, b]);
    for (const [room, dir] of [[a, dirA], [b, dirB]] as const) {
      tell(z, room, `Stone grinds on stone, and a slab slides out of the wall across the doorway ${side(dir)} and stops, flush. The way is shut.`);
    }
  }
  for (const room of STONE_ROOMS) if (chance(0.3)) z.roomSound(room, "Somewhere {dir} stone moves on stone, long and heavy, and stops.", undefined, undefined, false, { act: "stoneshift" });
}

// ---- WHAT THE REST OF THE GAME ASKS --------------------------------------------

let parsedFor = "", parsed: Ways | null = null;
/** The saved state, read once per change (asked on every creature step). */
function read(z: ZoneDO): Ways | null {
  const data = z.events.get("cave-ways")?.data;
  if (!data) return null;
  if (data !== parsedFor) { parsedFor = data; try { parsed = JSON.parse(data) as Ways; } catch { parsed = null; } }
  return parsed;
}

/** How deep the risen water stands in a room (0-3), for the picture and the words. */
export function waterIn(z: ZoneDO, roomId: string): number {
  if (!FLOOD_SHUT_ROOMS.has(roomId) && !FLOOD_RISE_ROOMS.has(roomId)) return 0;
  const level = read(z)?.level ?? 0;
  return FLOOD_SHUT_ROOMS.has(roomId) ? level : Math.min(level, 2);
}

/** A room full to the roof: nobody goes in (they may always come out). */
export function floodShut(z: ZoneDO, roomId: string): boolean {
  if (!FLOOD_SHUT_ROOMS.has(roomId)) return false;
  return read(z)?.shut?.includes(roomId) ?? false;
}

/** May a creature step into this room? (Not into one full of water, unless it breathes it.) */
export function creatureMayEnter(z: ZoneDO, c: Creature, roomId: string): boolean {
  return BREATHES_WATER.has(c.templateId) || !floodShut(z, roomId);
}

/** The lines a look adds: a choked way, a closed slab, standing water. */
export function lookLines(z: ZoneDO, roomId: string): string[] {
  const w = read(z);
  if (!w) return [];
  const out: string[] = [];
  for (const f of w.falls ?? []) {
    const other = f.a === roomId ? f.b : f.b === roomId ? f.a : null;
    if (!other) continue;
    const dir = dirOf(z, roomId, other);
    out.push(`The way ${dir ?? "through"} is choked to the roof with fallen rock.`);
  }
  for (const [a, b] of w.stone ?? []) {
    const other = a === roomId ? b : b === roomId ? a : null;
    if (!other) continue;
    const dir = dirOf(z, roomId, other);
    out.push(`A slab of the dressed stone stands across the doorway ${side(dir)}, flush with the wall.`);
  }
  const level = waterIn(z, roomId);
  if (floodShut(z, roomId)) out.push("The water is up to the roof all but a hand's breadth. The only air is where you came in.");
  else if (level >= 2) out.push("The wood's rain has come down into the cave, and the water stands over the floor here above the knee.");
  else if (level === 1) out.push("The wood's rain has come down into the cave, and the water stands over the floor here a hand deep.");
  return out;
}

/** The line a person gets walking into a room full of water. */
export function shutLine(dir: string): string {
  return `The way ${dir} is under water. It is up to the roof there, and there is no air over it. It will go down when the rain stops.`;
}
