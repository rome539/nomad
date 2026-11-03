// THE WORLD REMEMBERS (rome, 2026-11-02; mig 363).
//
// What happens out there is written down where it happened. Every wanderer's
// death, every boss put down, a den raised or given up or fallen in, a
// gatehouse boarded and opened again, the fever settling and lifting: one row
// each in D1's `chronicle`, filed under the region of the room it happened in.
//
// TWO WAYS TO LEARN IT, and they are not the same thing:
//
//   • THE RECORD. Each region keeps one, at a place that was already counting
//     something before any of this (RECORDS): the muster rolls, the woodward's
//     rods, the toll board, the cairn. A close look there reads the existing
//     prose and then the newest rows under it, exactly, names and all. The
//     record never forgets; it only shows the newest few. You have to walk to
//     it, and you only learn that region's news there.
//
//   • THE KEEPER. Behind every gate, he passes on the notable rows from
//     anywhere (a boss killed, a wanderer killed by a wanderer or by a boss),
//     and he forgets as they age: the name and the place at first, then
//     half a name, then no name at all, and then nothing.
//
// Cost: one small D1 write per event, a D1 read only when somebody looks at a
// record, and the keeper reads the notable rows from memory, loaded once when
// the world wakes (load) and added to as things happen. Nothing here goes into
// the world's saved state.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import type { MobTemplate } from "./world";
import { ROOM_FEATURES } from "./detail";
import { chance, pick } from "./rng";
import { cap } from "./zone-util";
import { RAT_KING, WHITE_ROE, FEVER_RAT } from "./zone-data";

export type Kind = "slain" | "killed" | "died" | "den-raised" | "den-left" | "den-fell" | "boarded" | "opened" | "fever" | "fever-lifted";
export interface Entry { at: number; region: string; room: string; kind: Kind; who: string; what: string; notable: boolean }

// One record to every region, keyed by the room's own region ('' is the
// fortress). `feature` is the ROOM_FEATURES key whose close look it rides
// under; `intro` is how the new writing looks on that particular thing.
// A region with no row here would keep no record: the regression test walks
// every region the map has and fails on one that is missing.
export const RECORDS: Record<string, { room: string; feature: string; intro: string }> = {
  "": { room: "the-roll-room", feature: "rolls|roll|pigeon-holes|holes|muster",
    intro: "One roll on the top shelf is new paper, its tape still white. Unrolled, in a clerk's hand you do not know:" },
  deep: { room: "the-lock-keepers-room", feature: "peg-board|pegboard|board|pegs|peg|tallies|tally",
    intro: "Past where the knotted pegs stop, new cords hang, and beside each one a line is scratched into the oak:" },
  wood: { room: "the-bounds-house", feature: "shelf|shelves|rods|hazel|bundles|tallies|tally",
    intro: "The newest bundle is not tied yet. The rods on top are fresh-cut, the notches still pale, in the same hand:" },
  road: { room: "the-first-milestone", feature: "milestone|stone|pillar|names|marks|scratches",
    intro: "Newest on the stone, scratched deeper than the names around them:" },
  out: { room: "the-old-road", feature: "gibbet|hill|chain|arm",
    intro: "Above the strokes, newer cuts in the post spell words:" },
  crossing: { room: "the-toll-board", feature: "toll board|board|figures|numbers",
    intro: "Under the doubled line the freehand goes on, a line to each:" },
  den: { room: "the-street-cross", feature: "cross|steps|stump|stone",
    intro: "The strokes on the bottom step have started again, and beside the newest of them, words:" },
  mountain: { room: "the-high-cairn", feature: "cairn|stones",
    intro: "Fresh stones sit on the old courses, flat ones, each scratched on its face:" },
};
const RECORD_ROOMS = new Map(Object.entries(RECORDS).map(([region, r]) => [r.room, { region, ...r }]));
export const RECORD_SHOWS = 5; // the newest this many; the rest are further down the bundle

// Creatures whose death is news though they are not bosses: each has its own
// hook beside this one in zone.ts.
export const NAMED_KILLS = new Set([RAT_KING, WHITE_ROE, FEVER_RAT]);

// How the keeper's memory goes. Exact while it is fresh, half a name for a few
// days, no name after that, and then he has stopped telling it.
export const KEEPER_FRESH_MS = 6 * 3600_000;
export const KEEPER_ROUGH_MS = 3 * 86_400_000;
export const KEEPER_FORGETS_MS = 14 * 86_400_000;
export const KEEPER_NEWS_ODDS = 0.5; // when he has news you haven't heard, how often it is the news he picks
const KEEPER_KEEPS = 200;           // notable rows held in memory, newest kept

const recentOf = new WeakMap<ZoneDO, Entry[]>();
const toldOf = new Map<string, Set<Entry>>(); // pubkey -> what the keeper has already told them
function recent(z: ZoneDO): Entry[] {
  let r = recentOf.get(z);
  if (!r) { r = []; recentOf.set(z, r); }
  return r;
}

// When the world wakes: the notable rows the keeper might still be telling.
export async function load(z: ZoneDO): Promise<void> {
  const since = Date.now() - KEEPER_FORGETS_MS;
  const rows = await z.env.DB.prepare("SELECT at, region, room_id, kind, who, what FROM chronicle WHERE notable = 1 AND at > ? ORDER BY at DESC LIMIT ?")
    .bind(since, KEEPER_KEEPS).all<{ at: number; region: string; room_id: string; kind: Kind; who: string; what: string }>()
    .catch(() => ({ results: [] as never[] }));
  recentOf.set(z, (rows.results ?? []).reverse().map((r) => ({ at: r.at, region: r.region, room: r.room_id, kind: r.kind, who: r.who, what: r.what, notable: true })));
}

function regionOfRoom(z: ZoneDO, roomId: string): string {
  return z.world?.rooms.get(roomId)?.region || "";
}

// Write it down. Never awaited by the callers (most are in the tick): the row
// goes to D1 in the background, and a failed write costs a line in a record,
// never a tick.
export function record(z: ZoneDO, roomId: string, kind: Kind, who: string, what: string, notable: boolean, now = Date.now()): Entry {
  const e: Entry = { at: now, region: regionOfRoom(z, roomId), room: roomId, kind, who, what, notable };
  if (notable) {
    const r = recent(z);
    r.push(e);
    if (r.length > KEEPER_KEEPS) r.splice(0, r.length - KEEPER_KEEPS);
  }
  try {
    z.env.DB.prepare("INSERT INTO chronicle (at, region, room_id, kind, who, what, notable) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(e.at, e.region, e.room, e.kind, e.who, e.what, notable ? 1 : 0).run().catch(() => {});
  } catch { /* no database to write to: the line is lost, the tick is not */ }
  return e;
}

// ---- the hooks ----

// A boss, or one of the named few, killed. Called beside ratking.fell and the
// rest, after a revenant's false fall has already returned.
export function slain(z: ZoneDO, killer: Session, tmpl: MobTemplate, roomId: string): void {
  if (!tmpl.is_boss && !NAMED_KILLS.has(tmpl.id)) return;
  record(z, roomId, "slain", killer.name, tmpl.name, true);
}

// Every wanderer's death. A wanderer's steel, or a boss, makes it news.
export function died(z: ZoneDO, victim: Session, tmpl: MobTemplate | null, slayerName?: string): void {
  if (slayerName) record(z, victim.roomId, "killed", victim.name, slayerName, true);
  else record(z, victim.roomId, "died", victim.name, tmpl?.name ?? "", !!tmpl?.is_boss);
}

export function denRaised(z: ZoneDO, who: string, roomId: string): void { record(z, roomId, "den-raised", who, "", false); }
export function denLeft(z: ZoneDO, who: string, roomId: string): void { record(z, roomId, "den-left", who, "", false); }
export function denFell(z: ZoneDO, who: string, roomId: string): void { record(z, roomId, "den-fell", who, "", false); }
export function boarded(z: ZoneDO, gate: string): void { record(z, gate, "boarded", "", "", false); }
export function opened(z: ZoneDO, gate: string): void { record(z, gate, "opened", "", "", false); }
export function fever(z: ZoneDO, roomId: string, lifted: boolean): void { record(z, roomId, lifted ? "fever-lifted" : "fever", "", "", false); }

// ---- the record ----

function place(z: ZoneDO, roomId: string): string {
  const name = z.world?.rooms.get(roomId)?.name ?? "somewhere";
  return name.replace(/^The /, "the ");
}

export function entryLine(z: ZoneDO, e: { kind: Kind; who: string; what: string; room: string }): string {
  const at = place(z, e.room);
  switch (e.kind) {
    case "slain": return `${cap(e.what)}, killed by ${e.who} at ${at}.`;
    case "killed": return `${e.who}, killed by ${e.what} at ${at}.`;
    case "died": return e.what ? `${e.who}, dead at ${at}, to ${e.what}.` : `${e.who}, dead at ${at}.`;
    case "den-raised": return `A den raised at ${at} by ${e.who}.`;
    case "den-left": return `${e.who}'s den at ${at}, given up.`;
    case "den-fell": return `${e.who}'s den at ${at}, fallen in.`;
    case "boarded": return `${cap(at)}, boarded for works.`;
    case "opened": return `${cap(at)}, open again.`;
    case "fever": return "The fever, settled on the old village.";
    case "fever-lifted": return "The fever, lifted.";
  }
}

// What a close look at a record room's own thing adds: the region's newest
// rows, newest first. `feature` is the text the close look just answered with,
// so only that one thing (the rods, not the table) carries the record.
export async function under(z: ZoneDO, roomId: string, feature: string): Promise<string> {
  const rec = RECORD_ROOMS.get(roomId);
  if (!rec || ROOM_FEATURES[roomId]?.[rec.feature] !== feature) return "";
  const rows = await z.env.DB.prepare("SELECT kind, who, what, room_id FROM chronicle WHERE region = ? ORDER BY at DESC, id DESC LIMIT ?")
    .bind(rec.region, RECORD_SHOWS).all<{ kind: Kind; who: string; what: string; room_id: string }>()
    .catch(() => ({ results: [] as never[] }));
  const lines = (rows.results ?? []).map((r) => entryLine(z, { kind: r.kind, who: r.who, what: r.what, room: r.room_id }));
  return lines.length ? ` ${rec.intro} ${lines.join(" ")}` : "";
}

// ---- the keeper ----

const REGION_AT: Record<string, string> = {
  "": "in the fortress", out: "out on the waste", den: "in the old village", deep: "down in the deep",
  road: "out on the road", crossing: "out at the crossing", wood: "out in the wood", mountain: "up on the mountain",
};
function rough(name: string): string {
  return name.length <= 4 ? name : name.slice(0, Math.ceil(name.length / 2)) + "-something";
}

export function keeperLine(e: Entry, now: number): string | null {
  const age = now - e.at;
  if (age >= KEEPER_FORGETS_MS) return null;
  const where = REGION_AT[e.region] ?? "out there";
  const fresh = age < KEEPER_FRESH_MS, old = age >= KEEPER_ROUGH_MS;
  switch (e.kind) {
    case "slain":
      return fresh ? `"${cap(e.what)} is dead," the keeper says. "${e.who} put it down, ${where}. Not long ago."`
        : old ? `"Somebody killed ${e.what} once, ${where}," the keeper says. "Nobody remembers who."`
        : `"Somebody put ${e.what} down a while back," the keeper says. "${rough(e.who)}, the name was. ${cap(where)}."`;
    case "killed":
      return fresh ? `"${e.who} is dead," the keeper says. "Not to anything with teeth. ${e.what} did it, ${where}."`
        : old ? `"Wanderers have killed wanderers ${where} before now," the keeper says, and leaves it there.`
        : `"A wanderer killed another one ${where}, a while back," the keeper says. "${rough(e.what)}, they say it was."`;
    case "died":
      if (!e.what) return null;
      return fresh ? `"${cap(e.what)} took ${e.who}," the keeper says. "${cap(where)}, not long since."`
        : old ? `"${cap(e.what)} has had people before," the keeper says. "It will have more."`
        : `"Somebody went to ${e.what} a while back," the keeper says. "${rough(e.who)}, or near enough."`;
    default:
      return null;
  }
}

// The keeper's one line this visit may be news. Returns true if he told some.
// News from anywhere: he hears it all, he only gets it wrong as it ages. Never
// the same row twice to the same wanderer, and never their own deed or death
// told back to them.
export function keeperNews(z: ZoneDO, session: Session, now: number): boolean {
  const all = recent(z);
  const told = toldOf.get(session.pubkey) ?? new Set<Entry>();
  for (const e of told) if (!all.includes(e)) told.delete(e); // forgotten rows leave the set with him
  const yours = (e: Entry) => e.who === session.name || e.what === session.name;
  const fresh = all.filter((e) => !told.has(e) && !yours(e) && now - e.at < KEEPER_FORGETS_MS && keeperLine(e, now));
  if (!fresh.length || !chance(KEEPER_NEWS_ODDS)) return false;
  const e = pick(fresh.slice(-3)); // the newest few: what is being talked about
  told.add(e);
  toldOf.set(session.pubkey, told);
  z.send(session, keeperLine(e, now)!, "lore");
  return true;
}
