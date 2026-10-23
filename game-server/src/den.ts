// THE DENS — the places nomads live (rome, 2026-08-03: a den is supposed to be
// a place nomads LIVE in).
//
// Its own module rather than more of zone.ts, per the standing rule: the spine
// is tick/combat + transport, and this is neither. Free functions taking the
// ZoneDO as `z`, same seam as gate.ts and trade.ts.
//
// WHAT A DEN IS, and every line of it is one of rome's own rulings:
//
//   A ROOM IS A SITE, NOT A SLOT (rome, 2026-08-04, mig 172, and it replaced my
//   answer with a better one). Settling does not consume the room. Any number of
//   nomads build on the same holding, each with their own door, bar, shelf and
//   bunks, so six rooms serve six hundred people and the seventh player is never
//   locked out of housing by the six who got there first. What is scarce is not
//   my hand-placed doors — it is the timber and iron carried out there, a brake
//   that grows with the world instead of against it.
//
//   THE GROUND IS PUBLIC, THE DOOR IS YOURS. The site room is an ordinary
//   dangerous room and always will be: anybody can stand on it, learn who lives
//   there, and wait. Step through your own door with 'in'.
//
//   IT OPENS EXPOSED. The gatehouse is safe because it is shared and neutral
//   and nobody's; a den is safe only because it is yours and only as far as you
//   have made it so. An unbarred door shelters you from NOTHING — things walk
//   in. The bar is iron you carried out here, and it is the one thing that
//   changes that. It bars the DOOR, never the room: one nomad with a piece of
//   iron must never be able to shut a public street.
//
//   IT LAPSES. There is no rent, no upkeep bar, no meter. There is the date you
//   last stood in your own doorway, and if that gets old enough the hold falls
//   in and the door is open to whoever is standing there. Simulation-native:
//   real state that changed because something real happened (you stopped coming
//   home), never a number that drains.
//
//   NOTHING IS FROZEN IN IT. Stowed things are player_items rows on
//   container='den:<room>' — the same column the lockbox and vault ride — so a
//   den inherits the world's clock for free. Food ages on your shelf. Gear
//   wears. The vault stops time; the den does not. That is the difference
//   between a bank and a home.
//
// THE BAR TO CLEAR (rome): "does having a den make leaving it feel MORE
// dangerous." A den holds what you did not dare carry, it is a fixed point an
// enemy can learn, and the walk home is a walk you now have a reason to survive.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { type CarriedItem, loadContainer, setContainer, setItemCondition, setItemAcquiredAt, removeItemRow, insertLoot, itemAcquiredAt, savePlayer } from "./world";
import * as events from "./events";
import { uuid } from "./rng";
import { SCRAP_ID, IRON_ID, PACK_CAP, DEN_BUNKS, DEN_CAP, DEN_LAPSE_MS, DEN_BAR_IRON, DEN_BAR_SCRAP,
  DEN_RAISE_IRON, DEN_RAISE_SCRAP, DEN_RAISE_WOOD, DEN_RAISE_LEATHER, DEN_MIN_GATE_STEPS,
  DEN_BUILDS, DEN_RACK_CAP, DEN_HIDES_RUST_MULT, DEN_LARDER_AGE_MULT, DEN_RATTLE_EVERY_MS,
  LEATHER_ID, WOOD_ID, OUTDOOR_ROOMS, SEA_ROOMS, STUFF_WORD,
  COLD_STORE_ROOMS, COLD_CONTAINER, OSSUARY_ROOM, OSSUARY_CONTAINER,
  DEN_RUST_PER_HOUR, DEN_RUST_FLOOR, DEN_WAKE_CHANCE, SEALED_WEAR_MULT, GEAR_FAILING_AT, GEAR_WORN_AT,
  DEN_BUTT_CAP, DEN_BUTT_RAIN_MS, DEN_FIRE_MS, DEN_STAKES_WOUND, DEN_PELT_LEATHER,
  CURE_RECIPES, COOK_RECIPES, FOOD_KEEPS, GATE_CURE_MS,
  DEN_BUILD_WORK, DEN_BUILD_BEAT_MS, DEN_TOOL_WORD, type DenTool,
  DEN_CELLAR_AGE_MULT, DEN_CELLAR_ROOM, DEN_SNARE_EVERY_MS, DEN_SNARE_ODDS, DEN_SNARE_CATCH } from "./zone-data";
import { nameMatches, shortName, isNight, foodState, cap } from "./zone-util";
import { MOUNTAIN_QUARTER_ROOMS, WOOD_QUARTERS } from "./detail";

export interface Den {
  roomId: string;
  holder: string;      // pubkey
  claimedAt: number;
  tendedAt: number;    // last time the HOLDER stood in it — the lapse clock
  barred: boolean;
  // What else has been built in it (mig 308, DEN_BUILDS): each a thing put up
  // once, read where it bites.
  hearth: boolean;
  hides: boolean;
  rattle: boolean;
  rack: boolean;
  larder: boolean;
  // ...and the second six (mig 327).
  smoke: boolean;
  butt: boolean;
  whet: boolean;
  frame: boolean;
  stakes: boolean;
  slit: boolean;
  cellar: boolean;     // the second level (mig 329)
  bolthole: string;    // the room the bolt-hole comes up in, "" for none
  snares: boolean;
  snareAt: number;     // when the snares were last looked at
  water: number;       // draughts in the butt, as last counted
  waterAt: number;     // when it was last counted (the rain is reckoned from here)
  holderName: string;  // cached off the players row so an offline holder is still a NAME on the door, not a hex stub
  keys: Map<string, number>; // pubkey -> granted_at (the bunks; the holder is not in here)
}

// ---------------------------------------------------------------------------
// STATE. Held in the DO alongside the world, written through to D1 on change.
// Six rows today and a few hundred at the arc's full size, so it loads whole.

// KEYED BY HOLDER, NOT BY ROOM (mig 172). A room is a site and holds as many
// dens as there are people who raised one on it; a PLAYER holds at most one, so
// the holder's key is the natural one and "where do I live" is a single lookup
// rather than a scan.
export async function loadDens(z: ZoneDO): Promise<Map<string, Den>> {
  const dens = new Map<string, Den>();
  const rows = (await z.env.DB.prepare(
    "SELECT d.room_id, d.holder, d.claimed_at, d.tended_at, d.barred, d.hearth, d.hides, d.rattle, d.rack, d.larder, d.smoke, d.butt, d.whet, d.frame, d.stakes, d.slit, d.butt_water, d.butt_at, d.cellar, d.bolthole, d.snares, d.snare_at, COALESCE(p.name, '') AS holder_name FROM dens d LEFT JOIN players p ON p.pubkey = d.holder")
    .all<{ room_id: string; holder: string; claimed_at: number; tended_at: number; barred: number; hearth: number; hides: number; rattle: number; rack: number; larder: number; smoke: number; butt: number; whet: number; frame: number; stakes: number; slit: number; butt_water: number; butt_at: number; cellar: number; bolthole: string; snares: number; snare_at: number; holder_name: string }>()).results ?? [];
  for (const r of rows) {
    dens.set(r.holder, {
      roomId: r.room_id, holder: r.holder, claimedAt: r.claimed_at,
      tendedAt: r.tended_at, barred: r.barred === 1,
      hearth: r.hearth === 1, hides: r.hides === 1, rattle: r.rattle === 1, rack: r.rack === 1, larder: r.larder === 1,
      smoke: r.smoke === 1, butt: r.butt === 1, whet: r.whet === 1, frame: r.frame === 1, stakes: r.stakes === 1, slit: r.slit === 1,
      water: r.butt_water, waterAt: r.butt_at,
      cellar: r.cellar === 1, bolthole: r.bolthole ?? "", snares: r.snares === 1, snareAt: r.snare_at,
      holderName: r.holder_name, keys: new Map(),
    });
  }
  const keys = (await z.env.DB.prepare("SELECT room_id, holder, pubkey, granted_at FROM den_keys")
    .all<{ room_id: string; holder: string; pubkey: string; granted_at: number }>()).results ?? [];
  for (const k of keys) {
    const d = dens.get(k.holder);
    if (d && d.roomId === k.room_id) d.keys.set(k.pubkey, k.granted_at);
  }
  return dens;
}

// BLOOD UNDER THE ROOF (migs 171/172). Kept APART from the dens because it
// outlives them, and keyed room|holder because a room now has many roofs — a
// killing shuts you out of the door you spilled it under, not out of the street.
export async function loadDenBlood(z: ZoneDO): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const rows = (await z.env.DB.prepare("SELECT room_id, holder, pubkey FROM den_blood")
    .all<{ room_id: string; holder: string; pubkey: string }>()).results ?? [];
  for (const r of rows) {
    const k = bloodKey(r.room_id, r.holder);
    (out.get(k) ?? out.set(k, new Set()).get(k)!).add(r.pubkey);
  }
  return out;
}

function bloodKey(roomId: string, holder: string): string { return `${roomId}|${holder}`; }

// ---- the site: who lives on this ground -----------------------------------

// Every den standing in a room, lapsed ones swept out. This is the street.
// The lapse DELETE rides the fire-and-forget rail (this stays sync for its
// many sync callers): the in-memory drop below is immediate, only the D1 rows
// lag, and a lapsed row re-lapses on reload — but the promise carries a catch
// so a D1 hiccup can never be an unhandled rejection (2026-08-20).
export function densAt(z: ZoneDO, roomId: string): Den[] {
  const out: Den[] = [];
  for (const d of z.dens.values()) {
    if (d.roomId !== roomId) continue;
    if (lapsed(d)) { void lapse(z, d).catch(() => {}); continue; }
    out.push(d);
  }
  return out;
}

// ONLY AN UNBARRED HOLD FALLS IN (rome, 2026-08-07).
//
// The fourteen days were written when a room was a SLOT — six doors on the den
// ground was the whole housing supply, and the clock was there so a dead account
// couldn't squat one forever. Mig 172 made a room a SITE instead: any number of
// nomads build on the same ground, nobody is ever locked out by whoever got
// there first, and what rations housing is the iron and scrap carried out there.
// The scarcity the clock defended stopped existing, and the clock outlived it —
// so it was left punishing the one thing it was never aimed at, a player taking
// a fortnight off.
//
// So the bar decides this too. A door you paid iron to shut stays shut, for as
// long as it takes you to come back. A frame you never finished falls in. That
// makes the bar the difference between camping somewhere and living there, which
// is the same job it already does for safety, and it costs nothing to anyone
// else — the ground under a standing hold was never scarce.
function lapsed(d: Den): boolean {
  return !d.barred && Date.now() - d.tendedAt > DEN_LAPSE_MS;
}

// The one den a player holds, anywhere in the world, or nothing.
export function myDen(z: ZoneDO, pubkey: string): Den | undefined {
  const d = z.dens.get(pubkey);
  if (!d) return undefined;
  if (lapsed(d)) { void lapse(z, d).catch(() => {}); return undefined; } // same fire-and-forget rail as densAt
  return d;
}

// Your own den in THIS room, if you live here.
export function myDenAt(z: ZoneDO, roomId: string, pubkey: string): Den | undefined {
  const d = myDen(z, pubkey);
  return d && d.roomId === roomId ? d : undefined;
}

// The den in this room whose holder goes by this name — how you address somebody
// else's door on a street of them.
export function denByName(z: ZoneDO, roomId: string, name: string): Den | undefined {
  return densAt(z, roomId).find((d) => nameMatches(holderName(z, d), name));
}

// Every den in this room you are allowed through the door of: your own, plus
// any you have been given a bunk in.
export function doorsOpenTo(z: ZoneDO, roomId: string, pubkey: string): Den[] {
  return densAt(z, roomId).filter((d) => mayEnterKeeping(d, pubkey));
}

// ---- being INSIDE one ------------------------------------------------------
//
// The street is public ground and dangerous; a den is a door off it. `inDen`
// maps a pubkey to the HOLDER of the den they have stepped into — the room is
// their session's room, so the pair is the whole address.
//
// AND THE BAR IS STILL THE WHOLE OF THE SECURITY. Standing inside an UNBARRED
// den shelters you from nothing at all: you are behind a doorway with no door in
// it, and everything in the room can reach you, which is exactly what the den's
// founding rule says ("it opens with NOTHING shut — things walk in"). Fit the
// bar and you are out of reach of every creature and every wanderer who does not
// hold a key. That rule did not change when the room stopped being one house; it
// just stopped being the room's and became the door's.
export function insideOf(z: ZoneDO, pubkey: string): Den | undefined {
  const holder = z.inDen.get(pubkey);
  if (!holder) return undefined;
  const d = z.dens.get(holder);
  if (!d) { z.inDen.delete(pubkey); return undefined; }
  return d;
}

export function shelteredInDen(z: ZoneDO, pubkey: string): boolean {
  return insideOf(z, pubkey)?.barred === true;
}

// Can this one reach that one? Only from the same side of the same door.
export function reachable(z: ZoneDO, attacker: string, target: string): boolean {
  const a = z.inDen.get(attacker), t = z.inDen.get(target);
  if (a === t) return true;                  // same den, or both out in the street
  return !shelteredInDen(z, target) && !shelteredInDen(z, attacker);
}

/**
 * ARE THESE TWO ON THE SAME SIDE OF THE SAME DOOR? A creature (or anything else
 * with no pubkey) is always out on the ground, so it never shares a side with
 * anyone indoors. Used by the room's feed: what happens in the street is not
 * something you watch from inside a barred house.
 */
export function sameSide(z: ZoneDO, a: string | undefined, b: string): boolean {
  return z.inDen.get(a ?? "") === z.inDen.get(b);
}

export function leaveDen(z: ZoneDO, pubkey: string): void { z.inDen.delete(pubkey); }

// WAKING AT YOUR OWN DOOR (rome, 2026-08-07). The dark usually gives you back at
// a gate. A small share of the time — DEN_WAKE_CHANCE — it gives you back home,
// behind your own door, the way the road is one of the places the world can
// hatch you. Only your OWN den: a bunk in somebody else's house is a bed you
// were lent, not somewhere you belong.
//
// It does NOT tend the hold. The lapse clock asks one question — do you still
// live here — and dying is not an answer to it. Otherwise a den could be kept
// standing forever by a player who never once chose to walk home.
//
// You wake INSIDE, and the bar decides what that's worth: barred, you woke
// somewhere nothing can reach you; unbarred, you woke in a doorway with no door
// in it, which is exactly what an unbarred den has always been.
export function wakeAtDen(z: ZoneDO, session: Session): Den | undefined {
  const home = myDen(z, session.pubkey);
  if (!home) return undefined;
  if (Math.random() >= DEN_WAKE_CHANCE) return undefined;
  session.roomId = home.roomId;
  z.inDen.set(session.pubkey, home.holder);
  return home;
}

export function spilledHere(z: ZoneDO, roomId: string, holder: string, pubkey: string): boolean {
  return z.denBlood.get(bloodKey(roomId, holder))?.has(pubkey) === true;
}

// Have you spilled blood under ANY roof on this ground? Read by settle: you
// cannot raise your own door on a spot you murdered somebody on.
function spilledOnThisGround(z: ZoneDO, roomId: string, pubkey: string): boolean {
  for (const [k, who] of z.denBlood) {
    if (k.slice(0, k.indexOf("|")) === roomId && who.has(pubkey)) return true;
  }
  return false;
}

// Called the instant one player swings at another (pvp.attackPlayer). Steel
// drawn under a roof you do not hold ends your welcome in it — permanently, and
// the holder hears about it wherever they are.
export async function bloodDrawn(z: ZoneDO, roomId: string, killer: Session, victim: Session): Promise<void> {
  // UNDER WHICH ROOF. On a street of doors this is the den the two of them are
  // standing in — out on the ground itself there is no roof and no rule, which
  // is right: the street is public, and murder in the open is the world's
  // ordinary business.
  const den = insideOf(z, killer.pubkey);
  if (!den || den.roomId !== roomId) return;
  // A man may fight in his own house. What he loses is the person he gave the
  // bunk to, and whatever they tell the rest of the world.
  if (den.holder === killer.pubkey) return;
  if (spilledHere(z, roomId, den.holder, killer.pubkey)) return; // already marked; don't re-tell
  const room = z.world!.rooms.get(roomId)!;
  const had = den.keys.delete(killer.pubkey);
  const bk = bloodKey(roomId, den.holder);
  (z.denBlood.get(bk) ?? z.denBlood.set(bk, new Set()).get(bk)!).add(killer.pubkey);
  await z.env.DB.prepare("INSERT OR REPLACE INTO den_blood (room_id, holder, pubkey, victim, at) VALUES (?, ?, ?, ?, ?)")
    .bind(roomId, den.holder, killer.pubkey, victim.pubkey, Date.now()).run();
  if (had) await z.env.DB.prepare("DELETE FROM den_keys WHERE room_id = ? AND holder = ? AND pubkey = ?").bind(roomId, den.holder, killer.pubkey).run();
  z.inDen.delete(killer.pubkey); // put out of the door you just bled in
  z.send(killer, had
    ? `You have drawn steel under this roof, and it is not your roof. Your bunk in ${room.name} is gone — and it will not be given back to you by anyone, ever. You can still take your own things off the shelf at the door.`
    : `You have drawn steel under somebody's roof. ${room.name} is shut to you now, and no holder of it will ever be able to let you in.`);
  // The holder is owed the account, wherever they are standing.
  const h = z.sessions.get(den.holder);
  if (h && h.pubkey !== victim.pubkey) {
    z.send(h, `Word reaches you: ${killer.name} drew steel on ${victim.name} under your roof at ${room.name}. Their key is gone, and the door will not open for them again.`);
  }
}

// What the map should make of this room, for THIS player: 2 = the ground your
// own den stands on, 1 = ground you hold a bunk on, 0 = everything else. Other
// people's houses are never marked — the map must not become the directory of
// who sleeps where that the room prose refuses to be.
export function homeMark(z: ZoneDO, roomId: string, pubkey: string): number {
  if (myDenAt(z, roomId, pubkey)) return 2;
  return densAt(z, roomId).some((d) => d.keys.has(pubkey)) ? 1 : 0;
}

// A DEN SITE: anywhere a den stands, anywhere one could go up, and the old
// holdings (which take no new dens, but still have dens and shelves on them).
// Kept under its old name because every caller asks the same question it
// always did — is this ground a place people live?
export function isHolding(z: ZoneDO, roomId: string): boolean {
  return z.world!.rooms.get(roomId)?.is_holding === 1 || densAt(z, roomId).length > 0 || canBuildHere(z, roomId);
}

// WALKING STEPS FROM THE NEAREST GATE, over the live exit graph, worked out
// once per world and kept with it. Every gate is a vault, so this is the
// distance a nomad has to carry what a den holds to bank it.
const gateSteps = new WeakMap<object, Map<string, number>>();
export function stepsFromGate(z: ZoneDO, roomId: string): number {
  const w = z.world!;
  let m = gateSteps.get(w);
  if (!m) {
    m = new Map();
    const q = [...w.entryRooms];
    for (const g of q) m.set(g, 0);
    for (let i = 0; i < q.length; i++) {
      for (const e of w.exits.get(q[i]!) ?? []) {
        if (m.has(e.to_room)) continue;
        m.set(e.to_room, m.get(q[i]!)! + 1);
        q.push(e.to_room);
      }
    }
    gateSteps.set(w, m);
  }
  return m.get(roomId) ?? Infinity;
}

// WHERE A DEN CAN GO UP (rome, 2026-10-19), and if not, why not. Open ground
// under the sky, out of the gates' reach (DEN_MIN_GATE_STEPS). Not a gate, not
// a hideaway no creature will enter (a den has to be exposed to mean anything),
// not the sea, and not under somebody else's roof.
// THE DRAKE'S GROUND (rome, 2026-10-19). The summit and the whole of its
// territory (mig 234's tier five: the warm rock, the terraces, the eyrie, the
// nine swept rooms under the summit) are the far end of the mountain and so
// the farthest ground from any gate there is, which put them all on the den
// map. Nothing on the mountain will stand on that ground, and nobody builds a
// house in the drake's own country either.
const DRAKE_GROUND = new Set([...(MOUNTAIN_QUARTER_ROOMS.summit ?? []), ...(MOUNTAIN_QUARTER_ROOMS.territory ?? [])]);

// THE WOODWARD'S GROUND (rome, 2026-10-19). With the west fringe in, his seven
// rooms are the deepest in the wood, past every den on the way, and so they
// came up as den ground themselves. He keeps that ground; nobody builds in it.
const isWoodwardGround = (roomId: string) => WOOD_QUARTERS[roomId] === "heart";

export function groundBar(z: ZoneDO, roomId: string): "" | "gate" | "safe" | "sea" | "roofed" | "near" | "drake" | "woodward" {
  const w = z.world!;
  if (w.entryRooms.has(roomId)) return "gate";
  if (DRAKE_GROUND.has(roomId)) return "drake";
  if (isWoodwardGround(roomId)) return "woodward";
  if (w.safeRooms.has(roomId)) return "safe";
  if (SEA_ROOMS.has(roomId)) return "sea";
  if (!OUTDOOR_ROOMS.has(roomId)) return "roofed";
  if (stepsFromGate(z, roomId) < DEN_MIN_GATE_STEPS) return "near";
  return "";
}
export function canBuildHere(z: ZoneDO, roomId: string): boolean {
  return groundBar(z, roomId) === "";
}

// What the shelf holds of everything that is not gear: more with a second rack.
export function denCap(den: Den | undefined): number {
  return (den?.rack ? DEN_RACK_CAP : DEN_CAP) + (den?.cellar ? DEN_CELLAR_ROOM : 0);
}

// A BARRED DOOR STOPS PEOPLE TOO (rome, 2026-08-03: "what about gankers?"), and
// SINCE THE ROOM BECAME A SITE IT STOPS THEM AT THE DOOR, NOT AT THE ROOM (mig
// 172). It used to bar the whole room, which was the only thing it could mean
// while a room was one house — and it meant one nomad with a bar could shut a
// public street. Now the street is always open and the DOOR is what holds: the
// holder and everyone they bunked walk in; nobody else does, ever, by any means.
//
// It is not a magic ward, it is a piece of oak in two sockets that cost iron
// carried out of the deep. An UNBARRED den shelters you from nothing at all,
// which is what most dens will be, and is the founding rule of the whole feature.
export function mayEnterKeeping(den: Den, pubkey: string): boolean {
  return den.holder === pubkey || den.keys.has(pubkey);
}

// ---------------------------------------------------------------------------
// THE HOLD

// What a building costs, paid out of the pack. Same shape as the bar's price,
// which is the one this feature already had.
function countOf(session: Session, itemId: string): number {
  return session.items.filter((c) => c.itemId === itemId && c.serial === null).length;
}
// "20 split wood, 10 leather, 4 iron and 10 scrap".
function priceText(price: { id: string; n: number }[]): string {
  const parts = price.map((p) => `${p.n} ${STUFF_WORD[p.id] ?? (p.id === IRON_ID ? "iron" : p.id)}`);
  return parts.length === 1 ? parts[0]! : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}
async function spend(z: ZoneDO, session: Session, itemId: string, n: number): Promise<void> {
  for (const c of session.items.filter((c) => c.itemId === itemId && c.serial === null).slice(0, n)) {
    session.items.splice(session.items.indexOf(c), 1);
    await removeItemRow(z.env.DB, c.rowId);
  }
}

export async function cmdSettle(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const roomId = session.roomId;
  if (arg === "down") arg = ""; // "settle down" is the same instinct
  const bar = groundBar(z, roomId);
  if (bar) {
    return z.send(session, ({
      gate: "Not at the gates. Everybody in the world comes through here, and the keeper's roof is the only one this ground needs.",
      safe: "You could hide here. You could not LIVE here — nothing comes in, so nothing you built would ever be tested, and a den has to stand in the world to be one.",
      sea: "There is no ground here to build on. There is barely ground here to stand on.",
      roofed: "This is under somebody else's roof, old as it is. A den goes up on open ground, under the sky, where you can raise a frame of your own.",
      drake: "Not here. Every animal on this mountain has decided not to stand on this ground, and they know something you would be a fool to argue with. Build lower.",
      woodward: "Not here. The floor is cleared and the deadfall moved, and none of it by you. This ground is kept, and not for anyone to build on.",
      near: "Too near the gates. This ground is walked by everybody coming and going, and whatever you kept here would be one short carry from a vault. Build further out, where nobody passes by accident.",
    } as Record<string, string>)[bar]!);
  }
  if (z.inCombat(session)) return z.send(session, "Not with something in the room that wants you dead.");
  // AND YOU CANNOT WAIT OUT A KILLING BY RAISING YOUR OWN DOOR ON THE SPOT.
  // Without this the whole rule has an obvious way round it: murder your host,
  // then build next to the room you were shut out of (migs 171/172).
  if (spilledOnThisGround(z, roomId, session.pubkey)) {
    return z.send(session, "You spilled blood on this ground. Whatever has come and gone since, it is not going to be your home.");
  }
  // A MAN LIVES IN ONE PLACE (rome, 2026-08-04, asking why he could settle
  // multiple dens at once).
  //
  // Nothing stopped you taking all six, and that is not a small hole — it is the
  // whole scarcity of the feature. Six doors on this ground is the entire supply,
  // and the design says the way in for the thirty-seventh nomad is to find
  // somebody who will take him in, not an empty room. One player holding the lot
  // makes that a lie, hands one man every shelf in the world, and turns the
  // fourteen-day lapse into a chore rather than a risk.
  //
  // So: one hold, and the answer to wanting a different one is to give up the one
  // you have. Which costs you nothing but the walk — your things do not live in
  // the HOLD, they live in the ROOM, keyed to your name, and abandoning a house
  // leaves every one of them exactly where you put it, still yours to fetch.
  const mine = myDen(z, session.pubkey);
  if (mine) {
    if (mine.roomId === roomId) return z.send(session, "You already live here. ('den' tells you how it stands.)");
    const name = z.world!.rooms.get(mine.roomId)?.name ?? "somewhere";
    return z.send(session, `You already hold a den at ${name}. A man lives in one place — go back and 'abandon' it if you would rather live here, and nothing on your shelf there moves an inch when you do.`);
  }
  const room = z.world!.rooms.get(roomId)!;
  // AND HERE IS THE WHOLE CHANGE (mig 172). Nothing about somebody else living
  // here stops you. The room is GROUND; what you are about to do is put a
  // building on it. It costs what a building costs, and that cost — not my six
  // hand-placed doors — is the only thing rationing homes from now on.
  const price = [
    { id: WOOD_ID, n: DEN_RAISE_WOOD }, { id: LEATHER_ID, n: DEN_RAISE_LEATHER },
    { id: IRON_ID, n: DEN_RAISE_IRON }, { id: SCRAP_ID, n: DEN_RAISE_SCRAP },
  ];
  if (price.some((p) => countOf(session, p.id) < p.n)) {
    return z.send(session, [
      "The ground here will take a den, and nothing is standing in your way. What you have not got is the building.",
      `A den wants ${priceText(price)} carried out here — split wood for the frame, leather for the roof, iron and nails to hang a door. You have ${price.map((p) => `${countOf(session, p.id)} ${STUFF_WORD[p.id] ?? p.id}`).join(", ")}.`,
    ].join("\n"));
  }
  for (const p of price) await spend(z, session, p.id, p.n);
  const now = Date.now();
  const den: Den = {
    roomId, holder: session.pubkey, claimedAt: now, tendedAt: now, barred: false,
    hearth: false, hides: false, rattle: false, rack: false, larder: false,
    smoke: false, butt: false, whet: false, frame: false, stakes: false, slit: false, water: 0, waterAt: now,
    cellar: false, bolthole: "", snares: false, snareAt: now,
    holderName: session.name, keys: new Map(),
  };
  z.dens.set(session.pubkey, den);
  await z.env.DB.prepare("INSERT OR REPLACE INTO dens (room_id, holder, claimed_at, tended_at, barred) VALUES (?, ?, ?, ?, 0)")
    .bind(roomId, session.pubkey, now, now).run();
  const neighbours = densAt(z, roomId).length - 1;
  z.send(session, [
    `You raise a den at ${room.name}. A frame of split wood, a hide roof lashed down over it, and a door on iron hinges that is yours.`,
    neighbours > 0
      ? `You are not the only one living on this ground — ${neighbours} other door${neighbours === 1 ? "" : "s"} here, and none of them are your business.`
      : "Nobody witnesses it and nothing marks it. What makes it yours is that you came back, and that you keep coming back — leave an unbarred frame standing empty long enough and it falls in. A bar on the door ends that, and it stands until you give it up.",
    `The door does not shut yet. Fit a bar to it (${DEN_BAR_IRON} iron and ${DEN_BAR_SCRAP} scrap, then 'bar') and nothing walks in after you.`,
    `Step through it with 'in', and back out to the ground with 'out'. You can put ${DEN_BUNKS} other nomads under this roof — hand them a key face to face ('bunk <name>'). Inside, 'build' lists what else a den can have.`,
  ].join("\n"));
  z.roomFeed(roomId, `${session.name} raises a den here — a frame going up, and a door hung on it.`, session.pubkey, false);
  z.sendCtx(session);
}

// ---- the door: in off the ground, out onto it ------------------------------
//
// The site room is public and stays public. This is the door off it, and it is
// the gatehouse's own shape reused: the street is where the world can reach you,
// and behind the door is whatever you have made of it.

export async function cmdEnterDen(z: ZoneDO, session: Session, arg: string): Promise<boolean> {
  const open = doorsOpenTo(z, session.roomId, session.pubkey);
  if (!open.length) return false; // not a door of yours: let 'in' mean whatever else it means here
  if (z.inCombat(session)) { z.send(session, "Not with something at your back."); return true; }
  // On a street of doors, name whose you mean; with one open to you, it is that one.
  let den = open.length === 1 ? open[0] : (arg ? denByName(z, session.roomId, arg) : undefined);
  if (den && !mayEnterKeeping(den, session.pubkey)) den = undefined;
  if (!den) {
    z.send(session, `More than one door here opens to you: ${open.map((d) => holderName(z, d)).join(", ")}. Say whose ('in <name>').`);
    return true;
  }
  z.inDen.set(session.pubkey, den.holder);
  if (den.holder === session.pubkey) await tend(z, session);
  z.send(session, [
    den.holder === session.pubkey
      ? `You step in and pull the door to behind you.${den.barred ? " The bar drops into its sockets." : " There is no bar in the sockets, and the doorway is a doorway."}`
      : `You let yourself into ${holderName(z, den)}'s.${den.barred ? " The bar drops behind you." : " Nothing is shut behind you."}`,
    den.barred
      ? "Nothing out there can reach you in here."
      : "Anything on the ground outside can walk straight in after you. A bar would end that.",
  ].join("\n"));
  z.roomFeed(session.roomId, `${session.name} steps through a door and it closes.`, session.pubkey, false);
  if (den.holder === session.pubkey) await checkSnares(z, session, den);
  z.sendStatus(session); // the bar has to say you're inside the moment you are
  z.sendCtx(session);
  return true;
}

// THE SNARE LINE (mig 329). Read when the holder comes home: one try for every
// night that has passed since they last looked (DEN_SNARE_EVERY_MS, three at
// most), each catching DEN_SNARE_ODDS of the time. What is caught goes on the
// shelf, where it waits - and ages - like anything else put there.
async function checkSnares(z: ZoneDO, session: Session, d: Den): Promise<void> {
  if (!d.snares) return;
  const now = Date.now();
  const tries = Math.min(3, Math.floor((now - d.snareAt) / DEN_SNARE_EVERY_MS));
  if (tries <= 0) return;
  d.snareAt += tries * DEN_SNARE_EVERY_MS;
  const caught: string[] = [];
  for (let i = 0; i < tries; i++) {
    if (Math.random() >= DEN_SNARE_ODDS) continue;
    const id = DEN_SNARE_CATCH[Math.floor(Math.random() * DEN_SNARE_CATCH.length)]!;
    const rowId = uuid();
    await insertLoot(z.env.DB, rowId, session.pubkey, id, null);
    await setContainer(z.env.DB, rowId, container(d.roomId));
    caught.push(z.world!.itemTemplates.get(id)?.name ?? id);
  }
  await z.env.DB.prepare("UPDATE dens SET snare_at = ? WHERE room_id = ? AND holder = ?").bind(d.snareAt, d.roomId, d.holder).run();
  z.send(session, caught.length
    ? `On the way in you walk the snare line. It held ${caught.join(" and ")}, and that goes on the shelf.`
    : "On the way in you walk the snare line. Nothing in it, and one of them sprung and empty.", caught.length ? "gain" : undefined);
}

// THE BOLT-HOLE (mig 329). Out through the tunnel and up in the next room over,
// and nobody at your own door sees you go. Not with something on you: a
// tunnel is a crawl, and you cannot crawl away from a fight.
export async function cmdBolt(z: ZoneDO, session: Session): Promise<void> {
  const d = insideOf(z, session.pubkey);
  if (!d || d.roomId !== session.roomId || d.holder !== session.pubkey || !d.bolthole) {
    return z.send(session, "There is no way out of here but the door.");
  }
  if (z.inCombat(session)) return z.send(session, "Not with something on you. A tunnel is a crawl.");
  if (!z.world!.rooms.has(d.bolthole)) return z.send(session, "The bolt-hole has fallen in somewhere along its length.");
  const from = session.roomId;
  z.inDen.delete(session.pubkey);
  session.roomId = d.bolthole;
  session.movedAt = Date.now();
  z.send(session, "You get down into the bolt-hole and crawl the length of it in the dark, and come up through the turf somewhere else.");
  z.actorFeed(session, session.roomId, `${session.name} comes up out of the ground.`, "who", false);
  z.sendStatus(session);
  z.send(session, z.enterDescribe(session));
  z.refreshRoomCtx(from);
  z.refreshRoomCtx(session.roomId);
  await savePlayer(z.env.DB, session.pubkey, session.roomId, session.hp);
  z.markSimDirty();
}

export function cmdLeaveDen(z: ZoneDO, session: Session): boolean {
  const den = insideOf(z, session.pubkey);
  if (!den) return false;
  z.inDen.delete(session.pubkey);
  z.send(session, "You put your shoulder to the door and step back out onto the ground.");
  z.roomFeed(session.roomId, `${session.name} comes out of a doorway.`, session.pubkey, false);
  z.sendStatus(session); // and drop the den off the bar the moment you're out
  z.sendCtx(session);
  return true;
}

export async function cmdAbandon(z: ZoneDO, session: Session): Promise<void> {
  const den = myDenAt(z, session.roomId, session.pubkey);
  if (!den) return z.send(session, "You have nothing here to give up.");
  // MOVING HOUSE (rome, 2026-10-19). This used to refuse while the shelf held
  // anything, which made moving a den one impossible carry: the old door had to
  // come down before the new one could go up, and nothing could come down while
  // the shelf was full. The shelf outlives the door (it always has: the rows are
  // keyed to you and the room), so giving the door up leaves everything where
  // it is, still yours, fetched back from the ground in as many trips as it takes.
  const kept = await loadContainer(z.env.DB, session.pubkey, container(den.roomId));
  await drop(z, den);
  z.send(session, `You let ${z.world!.rooms.get(den.roomId)!.name} go. The door stands open behind you.${kept.length ? ` Your ${kept.length} thing${kept.length === 1 ? "" : "s"} on the shelf stay${kept.length === 1 ? "s" : ""} where ${kept.length === 1 ? "it is" : "they are"}, still yours — 'fetch' from this ground takes ${kept.length === 1 ? "it" : "them"} back.` : ""}`);
  z.roomFeed(den.roomId, `${session.name} gives up the hold here.`, session.pubkey, false);
  z.sendCtx(session);
}

// The hold falls in: the bar comes off with it, every key is void, and anything
// left on the shelf stays exactly where it is — the rows keep their container,
// so whoever takes the place next finds somebody else's things in it and cannot
// touch them. The previous holder can still walk in and clear their own out.
// That is on purpose. A house somebody stopped coming back to should have their
// belongings still in it.
async function lapse(z: ZoneDO, den: Den): Promise<void> {
  await drop(z, den);
  const s = z.sessions.get(den.holder);
  if (s) z.send(s, `Word reaches you, in the way it does out here: the hold on ${z.world!.rooms.get(den.roomId)!.name} has fallen in. You stopped going back.`);
}

async function drop(z: ZoneDO, den: Den): Promise<void> {
  z.dens.delete(den.holder);
  // Anybody standing inside it is standing in a building that no longer exists.
  for (const [pk, holder] of z.inDen) if (holder === den.holder) z.inDen.delete(pk);
  await z.env.DB.prepare("DELETE FROM dens WHERE room_id = ? AND holder = ?").bind(den.roomId, den.holder).run();
  await z.env.DB.prepare("DELETE FROM den_keys WHERE room_id = ? AND holder = ?").bind(den.roomId, den.holder).run();
}

// Called on every arrival. Standing in your own doorway IS the upkeep.
/**
 * WALKING BACK ONTO GROUND WHERE YOU LEFT THINGS. Told once per arrival, and
 * only where no door of yours stands — because if one does, the shelf is inside
 * it and the room already says so.
 *
 * The case this exists for (rome, 2026-08-10): he settled the North House,
 * moved to the Reeve's, and three of his things stayed on the North House's
 * shelf. The row is keyed to his pubkey and the ROOM, so they were never in any
 * danger — but he stood in the room and it said nothing, and the one verb he
 * tried sent him off to 'settle' a house he did not want. Gear you believe is
 * gone is as bad as gear that is gone.
 */
export async function shelfCall(z: ZoneDO, session: Session): Promise<void> {
  // Den ground only — and only ground a den stands on or the old holdings: the
  // open ground that COULD take one is a hundred-odd rooms, and asking D1 on
  // every step across it to find nothing is not worth it. ('den' still lists
  // every shelf you have anywhere.)
  if (!(z.world!.rooms.get(session.roomId)?.is_holding === 1 || densAt(z, session.roomId).length)) return;
  if (myDenAt(z, session.roomId, session.pubkey)) return;  // your own door: the room says it
  if (insideOf(z, session.pubkey)) return;           // you are indoors; this is the street's line
  const held = await loadContainer(z.env.DB, session.pubkey, container(session.roomId));
  if (!held.length) return;
  z.send(session, `${held.length} thing${held.length === 1 ? "" : "s"} of yours ${held.length === 1 ? "is" : "are"} still on a shelf here, from when this was yours. ('fetch')`, "gain");
}

export async function tend(z: ZoneDO, session: Session): Promise<void> {
  const den = z.dens.get(session.pubkey);
  if (!den || den.roomId !== session.roomId) return;
  const now = Date.now();
  if (now - den.tendedAt < 3_600_000) return; // an hour's granularity; no write per step
  den.tendedAt = now;
  await z.env.DB.prepare("UPDATE dens SET tended_at = ? WHERE room_id = ? AND holder = ?").bind(now, den.roomId, den.holder).run();
}

// ---------------------------------------------------------------------------
// THE BAR — the first and, today, the only upgrade. Deliberately an OBJECT with
// a cost in iron, not a level: a den earns its safety, it is never issued it.

export async function cmdBar(z: ZoneDO, session: Session): Promise<void> {
  const den = myDenAt(z, session.roomId, session.pubkey);
  if (!den) return z.send(session, isHolding(z, session.roomId) ? "You have no door of your own on this ground. Raise one first ('settle')." : "There is no door here worth barring.");
  if (den.barred) return z.send(session, "The bar is already fitted. It drops into its sockets with a sound you will get to like.");
  const iron = session.items.filter((c) => c.itemId === IRON_ID);
  const scrap = session.items.filter((c) => c.itemId === SCRAP_ID);
  if (iron.length < DEN_BAR_IRON || scrap.length < DEN_BAR_SCRAP) {
    return z.send(session, `A bar and its sockets want ${DEN_BAR_IRON} iron and ${DEN_BAR_SCRAP} scrap. You have ${iron.length} and ${scrap.length}.`);
  }
  for (const c of [...iron.slice(0, DEN_BAR_IRON), ...scrap.slice(0, DEN_BAR_SCRAP)]) {
    session.items.splice(session.items.indexOf(c), 1);
    await removeItemRow(z.env.DB, c.rowId);
  }
  den.barred = true;
  await z.env.DB.prepare("UPDATE dens SET barred = 1 WHERE room_id = ? AND holder = ?").bind(den.roomId, den.holder).run();
  z.send(session, "You cut the sockets, hang the bar, and drop it once to hear it seat.\nNothing walks in here now. That is not the same as nothing knowing you are in here.\nAnd the hold stops counting: a barred door stands however long you are gone.");
  z.roomFeed(den.roomId, `${session.name} hangs a bar on the door.`, session.pubkey, false);
  z.sendCtx(session);
}

// ---------------------------------------------------------------------------
// EVERYTHING ELSE A DEN CAN HAVE (rome, 2026-10-19). The bar's own shape: an
// object, built once, from your own door, paid out of the pack on the spot.
// 'build' alone is the list — what stands, and what the rest would cost.

// THE RIGHT TOOL, in your hand or anywhere in the pack, as the pick at the tide
// door is. Read off what the weapon is, not a list: an axe, a hatchet, a
// cleaver or a billhook for timber; anything that stuns, or a pick, hammer,
// mallet or maul, for stone and iron; any edge that cuts for the fine work.
// Is this thing up in the den? Every build is a flag except the bolt-hole,
// which is the room it comes up in; "barred" is the bar, needed under the
// bolt-hole.
export function isBuilt(d: Den, key: string): boolean {
  if (key === "bolthole") return d.bolthole !== "";
  return (d as unknown as Record<string, unknown>)[key] === true;
}
function needsName(key: string): string {
  return key === "barred" ? "the bar on the door" : DEN_BUILDS[key]?.name.replace(/^a /, "the ") ?? key;
}
const DIR_WORDS: Record<string, string> = { north: "north", south: "south", east: "east", west: "west", up: "up", down: "down", n: "north", s: "south", e: "east", w: "west", u: "up", d: "down" };

// Half-done work, by holder. In memory: a restart loses the beats, never the
// materials (those leave the pack only when the work is finished).
const buildJobs = new Map<string, { key: string; want: string; done: number; at: number }>();
export function buildingNow(pubkey: string): string | undefined { return buildJobs.get(pubkey)?.key; }

export function denTool(z: ZoneDO, session: Session, kind: DenTool): CarriedItem | undefined {
  const fits = (c: CarriedItem): boolean => {
    const t = z.world!.itemTemplates.get(c.itemId);
    if (!t || t.slot !== "weapon") return false;
    if (kind === "wood") return /axe|hatchet|cleaver|billhook|hedge-bill/.test(t.id);
    if (kind === "heavy") return t.stun > 0 || /pick|hammer|mallet|maul/.test(t.id);
    if (kind === "dig") return /pick/.test(t.id);
    return t.bleed > 0;
  };
  return session.items.find((c) => c.equipped && fits(c)) ?? session.items.find(fits);
}

export async function cmdBuild(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const den = insideOf(z, session.pubkey);
  if (!den || den.roomId !== session.roomId) {
    return z.send(session, myDenAt(z, session.roomId, session.pubkey)
      ? "That is work for inside. ('in' opens your door.)"
      : "There is nothing of yours here to build on. A den comes first ('settle').");
  }
  if (den.holder !== session.pubkey) return z.send(session, `This is ${holderName(z, den)}'s den. What goes up in it is theirs to decide.`);
  // 'build' alone KEEPS AT the half-done work (rome, 2026-10-23: the busy line
  // said "then 'build' again" and 'build' gave the list). Only with nothing
  // under way is it the list.
  const want = arg.trim().toLowerCase() || (buildJobs.get(session.pubkey)?.want ?? "");
  if (want === "bar" || want === "a bar") return cmdBar(z, session);
  if (!want) {
    // WHAT IS LEFT, NOT WHAT IS DONE (rome, 2026-10-23): what already stands
    // is one line at the top, and the list is only what you could still put up.
    const up = [...(den.barred ? ["a bar on the door"] : []), ...Object.entries(DEN_BUILDS).filter(([key]) => isBuilt(den, key)).map(([, b]) => b.name)];
    const lines = up.length ? [`Up already: ${up.join(", ")}.`] : [];
    const left: string[] = [];
    if (!den.barred) left.push(`  a bar on the door — ${DEN_BAR_IRON} iron and ${DEN_BAR_SCRAP} scrap ('bar')`);
    for (const [key, b] of Object.entries(DEN_BUILDS)) {
      if (isBuilt(den, key)) continue;
      left.push(`  ${b.name} — ${priceText(b.cost)}${b.needs ? `, once ${needsName(b.needs)} is in` : ""}${b.require ? `; it cannot be done without ${DEN_TOOL_WORD[b.require]}` : b.tool ? `, quicker with ${DEN_TOOL_WORD[b.tool]}` : ""} ('build ${key}'): ${b.does}.`);
    }
    if (left.length) lines.push("What your den could still have:", ...left);
    else lines.push("Everything a den can have is up in this one.");
    return z.send(session, lines.join("\n"));
  }
  const key = Object.keys(DEN_BUILDS).find((k) => k === want || want.startsWith(k.slice(0, 4)) || nameMatches(DEN_BUILDS[k]!.name, want));
  // The bolt-hole is dug toward something: 'build bolthole north'.
  const boltDir = key === "bolthole" ? Object.entries(DIR_WORDS).find(([w]) => new RegExp(`\\b${w}$`).test(want))?.[1] : undefined;
  if (!key) return z.send(session, "You do not know how to build that here. ('build' alone lists what a den can have.)");
  const b = DEN_BUILDS[key]!;
  if (isBuilt(den, key)) return z.send(session, `There is already ${b.name} here.`);
  if (b.needs && !isBuilt(den, b.needs)) {
    return z.send(session, `${cap(b.name)} wants ${needsName(b.needs)} in first.`);
  }
  // THE SECOND LEVEL WANTS ITS TOOL (mig 329): not quicker with it, impossible without.
  if (b.require && !denTool(z, session, b.require)) {
    return z.send(session, `${cap(b.name)} is no work for bare hands. You would need ${DEN_TOOL_WORD[b.require]}.`);
  }
  if (key === "bolthole") {
    const exits = z.world!.exits.get(den.roomId) ?? [];
    if (!boltDir) return z.send(session, `Dig it which way? The ground here goes ${exits.map((e) => e.dir).join(", ")}. ('build bolthole <direction>')`);
    if (!exits.some((e) => e.dir === boltDir)) return z.send(session, `There is no ground ${boltDir} of here to come up in. It goes ${exits.map((e) => e.dir).join(", ")}.`);
  }
  if (z.inCombat(session)) return z.send(session, "Not with something in the room that wants you dead.");
  if (b.cost.some((p) => countOf(session, p.id) < p.n)) {
    return z.send(session, `${b.name.charAt(0).toUpperCase() + b.name.slice(1)} wants ${priceText(b.cost)} out of your pack. You have ${b.cost.map((p) => `${countOf(session, p.id)} ${STUFF_WORD[p.id] ?? (p.id === IRON_ID ? "iron" : p.id)}`).join(", ")}.`);
  }
  // THE WORK (DEN_BUILD_WORK). A beat of it per 'build', the right tool doing
  // two; the materials stay in the pack until the last beat lands, so walking
  // off half-done costs nothing but the time.
  const now = Date.now();
  const job = buildJobs.get(session.pubkey);
  const doing = job && job.key === key ? job : { key, want, done: 0, at: 0 };
  if (now < doing.at) return z.send(session, "Your hands are still busy with the last of it. A moment, then 'build' again.", "dmgin");
  const tool = b.tool ? denTool(z, session, b.tool) : undefined;
  doing.done += tool ? 2 : 1;
  doing.at = now + DEN_BUILD_BEAT_MS;
  if (doing.done < DEN_BUILD_WORK) {
    buildJobs.set(session.pubkey, doing);
    const toolName = tool ? z.world!.itemTemplates.get(tool.itemId)?.name ?? "your tool" : "";
    const left = DEN_BUILD_WORK - doing.done;
    z.send(session, (tool
      ? `You set to ${b.name} with ${toolName}, and it goes quickly.`
      : `You set to ${b.name} with your bare hands, and it is slow going.${b.tool ? ` (${DEN_TOOL_WORD[b.tool]} would make short work of it.)` : ""}`)
      + ` ${left <= (tool ? 2 : 1) ? "One more go and it is done." : "There is a good deal of it left."} ('build ${key}' to keep at it.)`);
    z.roomSound(den.roomId, "Somebody is working at something {dir}, steadily.");
    return;
  }
  buildJobs.delete(session.pubkey);
  for (const p of b.cost) await spend(z, session, p.id, p.n);
  if (key === "bolthole") {
    den.bolthole = (z.world!.exits.get(den.roomId) ?? []).find((e) => e.dir === boltDir)!.to_room;
    await z.env.DB.prepare("UPDATE dens SET bolthole = ? WHERE room_id = ? AND holder = ?").bind(den.bolthole, den.roomId, den.holder).run();
  } else {
    (den as unknown as Record<string, boolean>)[key] = true;
    if (key === "snares") den.snareAt = Date.now();
    // The column name is the key itself, from a fixed table, never the player's words.
    await z.env.DB.prepare(`UPDATE dens SET ${key} = 1${key === "snares" ? ", snare_at = ?" : ""} WHERE room_id = ? AND holder = ?`)
      .bind(...(key === "snares" ? [den.snareAt] : []), den.roomId, den.holder).run();
  }
  z.send(session, b.built, "gain");
  z.roomFeed(den.roomId, `Somebody is working behind one of the doors here — the sound of it carries.`, session.pubkey, false);
  z.sendCtx(session);
}

// THE HEARTH. Lying down by it burns a bundle of split wood out of the pack
// (cmdRest calls this); while that rest lasts it mends like the gatehouse fire
// and the cold has no hold on it. No wood, no fire: an ordinary rest.
export function lightHearth(z: ZoneDO, session: Session): string {
  session.hearthLit = undefined;
  const den = insideOf(z, session.pubkey);
  if (!den || den.roomId !== session.roomId || !den.hearth) return "";
  const wood = session.items.find((c) => c.itemId === WOOD_ID && c.serial === null);
  if (!wood) return "The hearth is cold, and you have no wood on you to put in it.";
  session.items.splice(session.items.indexOf(wood), 1);
  void removeItemRow(z.env.DB, wood.rowId).catch(() => { /* the fire is lit either way; a lost delete is one stray bundle */ });
  session.hearthLit = den.roomId;
  denFire.set(den.holder, Date.now() + DEN_FIRE_MS);
  return "You feed a bundle of split wood to the hearth and lie down beside it. The warmth comes up off the stones.";
}
export function hearthWarm(z: ZoneDO, session: Session): boolean {
  if (!session.resting || !session.hearthLit) return false;
  const den = insideOf(z, session.pubkey);
  return !!den && den.hearth && den.roomId === session.hearthLit && den.roomId === session.roomId;
}

// THE RATTLE. Something has come onto the ground outside a door with bone
// strung across it: whoever is behind that door hears it, and a sleeper wakes.
// Cheap on the hot path — most rooms have no den at all.
export function rattle(z: ZoneDO, roomId: string, exceptPubkey?: string): void {
  if (!z.inDen.size) return;
  const now = Date.now();
  for (const s of z.sessions.values()) {
    if (s.roomId !== roomId || s.pubkey === exceptPubkey) continue;
    const den = insideOf(z, s.pubkey);
    if (!den || !den.rattle || den.roomId !== roomId) continue;
    if (now - (s.rattleAt ?? 0) < DEN_RATTLE_EVERY_MS) continue;
    s.rattleAt = now;
    const woke = s.resting;
    if (woke) { s.resting = false; z.sendStatus(s); }
    z.send(s, woke
      ? "The bone on the door clatters and you are awake before you know why. Something has come onto the ground outside."
      : "The bone on the door clatters. Something has come onto the ground outside.", "evt");
  }
}

// ---------------------------------------------------------------------------
// THE BUNKS. A key is handed over FACE TO FACE — they have to be standing in
// the room. That is the whole social mechanic: taking someone in is something
// you did in a place, not a name you typed at a menu.

export async function cmdBunk(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const den = myDenAt(z, session.roomId, session.pubkey);
  if (!den) return z.send(session, "You are not standing at a door of yours.");
  if (!arg) return z.send(session, bunkList(z, den));
  const guest = [...z.sessions.values()].find((s) => s.roomId === session.roomId && s.pubkey !== session.pubkey && nameMatches(s.name, arg));
  if (!guest) return z.send(session, "Nobody here by that name. A key is handed over, not sent — they have to be standing in front of you.");
  if (den.keys.has(guest.pubkey)) return z.send(session, `${guest.name} already has a bunk here.`);
  // The room remembers, past the hold that was standing when it happened — so a
  // killer cannot be re-keyed by a forgetful holder, by a friend who takes the
  // house on purpose, or by whoever settles it after a lapse. Without this the
  // rule is a rule you wait out (mig 171).
  if (spilledHere(z, den.roomId, den.holder, guest.pubkey)) {
    return z.send(session, `${guest.name} has spilled blood under this roof. Whatever was agreed since, the door does not open for them, and you cannot make it.`);
  }
  if (den.keys.size >= DEN_BUNKS) return z.send(session, `Every bunk under this roof is spoken for (${DEN_BUNKS}). Turn somebody out first, if it comes to that.`);
  const now = Date.now();
  den.keys.set(guest.pubkey, now);
  await z.env.DB.prepare("INSERT OR REPLACE INTO den_keys (room_id, holder, pubkey, granted_at) VALUES (?, ?, ?, ?)")
    .bind(den.roomId, den.holder, guest.pubkey, now).run();
  const room = z.world!.rooms.get(den.roomId)!;
  z.send(session, `You give ${guest.name} a bunk under this roof. ${DEN_BUNKS - den.keys.size} left.`);
  z.send(guest, `${session.name} gives you a bunk in ${room.name}. You can shelter here, and stow things here, and the bar will be lifted for you.`);
  z.roomFeed(den.roomId, `${session.name} takes ${guest.name} in.`, session.pubkey, false);
}

export async function cmdUnbunk(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const den = myDen(z, session.pubkey);
  if (!den) return z.send(session, "You hold nothing to turn anybody out of.");
  if (!arg) return z.send(session, bunkList(z, den));
  let target: string | undefined;
  for (const pk of den.keys.keys()) {
    const nm = z.sessions.get(pk)?.name ?? await nameOf(z, pk);
    if (nm && nameMatches(nm, arg)) { target = pk; break; }
  }
  if (!target) return z.send(session, "Nobody of that name has a bunk here.");
  den.keys.delete(target);
  await z.env.DB.prepare("DELETE FROM den_keys WHERE room_id = ? AND holder = ? AND pubkey = ?").bind(den.roomId, den.holder, target).run();
  z.inDen.delete(target); // if they were inside it, they are outside it now
  const room = z.world!.rooms.get(den.roomId)!;
  z.send(session, `You take the key back. Their bunk is somebody else's now.`);
  const s = z.sessions.get(target);
  if (s) z.send(s, `Your bunk in ${room.name} is gone. ${session.name} took the key back.`);
  // Their things do NOT get thrown into the road. They keep their container and
  // sit there until the owner walks in and takes them, which they can still do
  // even with the bar up — you can always get your own things out of somewhere
  // you used to live.
}

function bunkList(z: ZoneDO, den: Den): string {
  const room = z.world!.rooms.get(den.roomId)!;
  if (den.keys.size === 0) return `${room.name}: ${DEN_BUNKS} bunks, all of them empty. ('bunk <name>' to take somebody in — they have to be standing here.)`;
  const names = [...den.keys.keys()].map((pk) => z.sessions.get(pk)?.name ?? shortName(pk));
  return `${room.name}: ${den.keys.size}/${DEN_BUNKS} bunks spoken for — ${names.join(", ")}.`;
}

// ---------------------------------------------------------------------------
// THE SHELF. container = 'den:<room_id>'. The same column, and none of the
// vault's protections: this is not banking, it is putting your things down
// somewhere with a roof.

export function container(roomId: string): string { return `den:${roomId}`; }

// THE SHELF RUSTS, AND NEVER EATS ANYTHING (rome, 2026-08-03: "make gear rust
// but never destory when stored int he ren").
//
// Worked out LAZILY, at the moment somebody looks, from the stamp the row got
// when it was put down (container_at, mig 165). Ticking every stowed row of
// every player every two seconds would be thousands of writes a beat to move a
// number nobody is watching; this gives the identical answer with no clock, and
// it is right across a deploy, a hibernation gap, or a month away.
//
// THE ONE HARD RULE: it floors. This never calls z.wear(), which deletes a
// piece at zero — it does the arithmetic itself and stops at DEN_RUST_FLOOR.
// What you put down is what you pick up: in worse condition, never in fewer
// pieces, and always still mendable at a bench.
export async function rustShelf(z: ZoneDO, held: CarriedItem[], den?: Den): Promise<CarriedItem[]> {
  const now = Date.now();
  for (const c of held) {
    // THE LARDER (DEN_BUILDS): food keeps its own clock, at half speed in a
    // larder. Same lazy arithmetic as the rust: half the time it sat here is
    // handed back to it by moving its cut-time forward, and the shelf stamp
    // moves with it so the same hours are never given twice.
    if (den?.larder && z.world!.itemTemplates.get(c.itemId)?.edible && c.acquiredAt !== undefined) {
      const since = c.containerAt ?? now;
      const back = Math.floor((now - since) / 1000 * (1 - (den.cellar ? DEN_CELLAR_AGE_MULT : DEN_LARDER_AGE_MULT)));
      if (back > 0) {
        c.acquiredAt += back;
        c.containerAt = now;
        await z.env.DB.prepare("UPDATE player_items SET acquired_at = ?, container_at = ? WHERE id = ?")
          .bind(c.acquiredAt, now, c.rowId).run();
      }
      continue;
    }
    if (!z.isGear(c.itemId)) continue;          // cloth, food, rock and trophies keep their own clocks
    const since = c.containerAt ?? now;
    const hours = (now - since) / 3_600_000;
    if (hours <= 0) continue;
    let amount = hours * DEN_RUST_PER_HOUR;
    if (den?.hides) amount *= DEN_HIDES_RUST_MULT; // oiled hides over the shelf: the damp finds its way under, slowly
    if (c.serial !== null) amount *= SEALED_WEAR_MULT; // the gate's mark slows the damp; it does not stop it
    const before = c.condition;
    const after = Math.max(DEN_RUST_FLOOR, Math.round((before - amount) * 10) / 10);
    if (after >= before) continue;
    c.condition = after;
    await z.env.DB.prepare("UPDATE player_items SET condition = ?, container_at = ? WHERE id = ?")
      .bind(after, now, c.rowId).run();
  }
  return held;
}

// EVERY PLACE YOU HAVE THINGS. The one query that makes the guarantee below
// checkable: your goods are rows keyed to YOUR pubkey, so nothing anybody else
// does — lapsing, settling, barring, evicting — can reach them.
export async function shelvesOf(z: ZoneDO, pubkey: string): Promise<Map<string, number>> {
  const rows = (await z.env.DB.prepare(
    "SELECT container, COUNT(*) AS n FROM player_items WHERE pubkey = ? AND container LIKE 'den:%' GROUP BY container")
    .bind(pubkey).all<{ container: string; n: number }>()).results ?? [];
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.container.slice(4), r.n);
  return out;
}

export async function cmdStow(z: ZoneDO, session: Session, arg: string): Promise<void> {
  // THE COLD STORES (2026-09-01): the icehouse, the shieling's larder, the
  // cold hollow — the mountain's cold is ONE institution with three doors.
  // Food stowed at any of them waits in the same cold and comes out as young
  // as the day it went in: the shrine's law, told for food.
  if (COLD_STORE_ROOMS.has(session.roomId)) {
    const held = await loadContainer(z.env.DB, session.pubkey, COLD_CONTAINER);
    if (!arg) return z.send(session, held.length
      ? `The cold keeps: ${held.map((c) => z.world!.itemTemplates.get(c.itemId)?.name ?? c.itemId).join(", ")}.`
      : "The cold is empty here. It is very good at keeping, and it has nothing to keep.");
    const carried = z.findCarried(session, arg);
    if (!carried) return z.send(session, "You carry nothing like that.");
    if (!z.isGear(carried.itemId) && z.slotsUsed(held.filter((c) => !z.isGear(c.itemId)), "lockbox") >= DEN_CAP) {
      return z.send(session, `The cold keeps ${DEN_CAP} of that sort of thing for you and no more.`);
    }
    const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
    const idx = session.items.indexOf(carried);
    if (idx === -1) return z.send(session, "That's already left your pack.");
    session.items.splice(idx, 1);
    carried.equipped = false;
    await setContainer(z.env.DB, carried.rowId, COLD_CONTAINER);
    z.send(session, `You set ${tmpl.name} into the cold. It will keep here — the cold does not age anything.`);
    z.roomFeed(session.roomId, `${session.name} sets something into the cold.`, session.pubkey, false);
    return;
  }
  // THE OSSUARY (2026-09-01): the dead keep their own — a shelf at the dead's
  // address in the deep. Gear is unlimited here, exactly as the den's shelf,
  // and nothing in it is preserved: the dead do not keep food fresh, they keep
  // it. Deep loot stops needing a gate run to be banked, which is what the
  // dead are for.
  if (session.roomId === OSSUARY_ROOM) {
    const held = await loadContainer(z.env.DB, session.pubkey, OSSUARY_CONTAINER);
    if (!arg) return z.send(session, held.length
      ? `The dead keep: ${held.map((c) => z.world!.itemTemplates.get(c.itemId)?.name ?? c.itemId).join(", ")}.`
      : "The dead are keeping nothing for you here.");
    const carried = z.findCarried(session, arg);
    if (!carried) return z.send(session, "You carry nothing like that.");
    if (!z.isGear(carried.itemId) && z.slotsUsed(held.filter((c) => !z.isGear(c.itemId)), "lockbox") >= DEN_CAP) {
      return z.send(session, `The dead keep ${DEN_CAP} of that sort of thing for you and no more.`);
    }
    const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
    const idx = session.items.indexOf(carried);
    if (idx === -1) return z.send(session, "That's already left your pack.");
    session.items.splice(idx, 1);
    carried.equipped = false;
    if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
    await setContainer(z.env.DB, carried.rowId, OSSUARY_CONTAINER);
    z.send(session, `You lay ${tmpl.name} among the dead. They keep their own — and they give nothing back one breath younger than it went in.`);
    z.roomFeed(session.roomId, `${session.name} lays something among the dead.`, session.pubkey, false);
    return;
  }
  const den = keepingDen(z, session);
  if (!den) {
    return z.send(session, throughTheDoorNote(z, session)
      ?? (isHolding(z, session.roomId)
        ? await noDoorNote(z, session)
        : "There is no shelf here, and nothing here to keep anything."));
  }
  const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(den.roomId)), den);
  if (!arg) return z.send(session, shelfList(z, den, held));
  const carried = z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  // GEAR IS UNLIMITED HERE (rome, 2026-08-03: "the den should be ulimited
  // storage for gear"). This is the den's whole economic reason to exist and it
  // sets it against the vault cleanly rather than duplicating it:
  //
  //   THE VAULT   small (a hard cap), sealed against time, and reachable at any
  //               of eight gates. Convenience, bought with scarcity.
  //   THE DEN     endless for gear, and fifty rooms out. Nothing in it is sealed
  //               against anything — food ages, iron wears — and the hold itself
  //               lapses if you stop coming. Capacity, bought with the walk.
  //
  // The cap stays on everything that ISN'T gear, because an endless larder is a
  // different feature (and a food/rock faucet); a wall of armour is the point.
  if (!z.isGear(carried.itemId) && z.slotsUsed(held.filter((c) => !z.isGear(c.itemId)), "lockbox") >= denCap(den)) {
    return z.send(session, `Your shelf here holds ${denCap(den)} of that sort of thing and no more. Gear is another matter — hang as much of it as you like.${den.rack ? "" : " (A second rack would take more: 'build'.)"}`);
  }
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  // Guarded splice (2026-08-20): the condition write above awaited D1, so a
  // racing double frame could both resolve the same row and the loser's
  // splice(-1,1) would eat an unrelated pack item.
  const idx = session.items.indexOf(carried);
  if (idx === -1) return z.send(session, "That's already left your pack.");
  session.items.splice(idx, 1);
  carried.equipped = false;
  if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
  await setContainer(z.env.DB, carried.rowId, container(den.roomId));
  z.send(session, `You put ${tmpl.name} down here. It will still be here. It will not be any newer.`);
  z.roomFeed(den.roomId, `${session.name} puts something down and leaves it.`, session.pubkey, false);
  z.sendCtx(session);
}

export async function cmdFetch(z: ZoneDO, session: Session, arg: string): Promise<void> {
  // THE COLD STORES (2026-09-01): fetching out of the cold. What comes out
  // comes out as young as it went in — the cold kept it, and the spoiling
  // clock starts again only when it is in your hand. The shrine's law for
  // food, and the reason the institution has three doors.
  if (COLD_STORE_ROOMS.has(session.roomId)) {
    const held = await loadContainer(z.env.DB, session.pubkey, COLD_CONTAINER);
    if (!arg) return z.send(session, held.length
      ? `The cold keeps: ${held.map((c) => z.world!.itemTemplates.get(c.itemId)?.name ?? c.itemId).join(", ")}.`
      : "The cold is empty here. It is very good at keeping, and it has nothing to keep.");
    const entry = held.find((c) => {
      const t = z.world!.itemTemplates.get(c.itemId);
      return t ? nameMatches(t.name, arg) : false;
    });
    if (!entry) return z.send(session, "Nothing of yours in the cold by that name.");
    const tmpl = z.world!.itemTemplates.get(entry.itemId)!;
    if (z.foodCapped(session, entry.itemId)) return z.send(session, z.foodFullNote());
    if (!z.packRoom(session, entry.itemId)) return z.send(session, `Your pack is full (${z.packCap(session)} slots). Make room first.`);
    await setContainer(z.env.DB, entry.rowId, "");
    // The cold's whole promise: what comes out is as young as it went in. The
    // spoiling clock restarts from this breath, for anything that ages.
    if (tmpl.edible && entry.acquiredAt !== undefined) {
      entry.acquiredAt = Math.floor(Date.now() / 1000);
      await setItemAcquiredAt(z.env.DB, entry.rowId, entry.acquiredAt);
    }
    session.items.push(entry);
    z.send(session, `You take ${tmpl.name} from the cold — cold as the day you put it in.`);
    z.roomFeed(session.roomId, `${session.name} takes something out of the cold.`, session.pubkey, false);
    return;
  }
  // THE OSSUARY (2026-09-01): taking back what the dead were keeping. They give
  // it up without a word — and not one breath younger than it went in.
  if (session.roomId === OSSUARY_ROOM) {
    const held = await loadContainer(z.env.DB, session.pubkey, OSSUARY_CONTAINER);
    if (!arg) return z.send(session, held.length
      ? `The dead keep: ${held.map((c) => z.world!.itemTemplates.get(c.itemId)?.name ?? c.itemId).join(", ")}.`
      : "The dead are keeping nothing for you here.");
    const entry = held.find((c) => {
      const t = z.world!.itemTemplates.get(c.itemId);
      return t ? nameMatches(t.name, arg) : false;
    });
    if (!entry) return z.send(session, "Nothing of yours among the dead by that name.");
    if (z.foodCapped(session, entry.itemId)) return z.send(session, z.foodFullNote());
    if (!z.packRoom(session, entry.itemId)) return z.send(session, `Your pack is full (${z.packCap(session)} slots). Make room first.`);
    await setContainer(z.env.DB, entry.rowId, "");
    session.items.push(entry);
    z.send(session, `You take ${z.world!.itemTemplates.get(entry.itemId)?.name ?? "it"} back from the dead. They give it up without a word.`);
    z.roomFeed(session.roomId, `${session.name} takes something back from the dead.`, session.pubkey, false);
    return;
  }
  // YOUR THINGS NEVER BECOME UNREACHABLE (rome, 2026-08-03: gear stored in the
  // den must never disappear on him).
  //
  // The row is keyed to YOUR pubkey and to the ROOM, never to the hold, so
  // nothing anybody does to the hold can touch it: a den that lapses, is
  // settled by a stranger, is barred against you, or takes your bunk away
  // leaves every one of your things exactly where you put it, and untouchable
  // by them. Death cannot reach it either — the scatter deletes `container=''`
  // and yours is `den:<room>`.
  //
  // AND SINCE THE ROOM BECAME A SITE, THERE IS NO SHUT DOOR TO GET ROUND (mig
  // 172). The old hazard was a lapsed hold re-settled and barred by a stranger,
  // with your gear behind it — so 'fetch' used to hunt the neighbouring rooms for
  // a door you were shut out of and hand your things over the threshold. The
  // street is public now: whoever holds whichever door on this ground, you stand
  // on the ground and your own shelf is in reach. The collect-at-the-door path is
  // gone because the case it existed for cannot happen any more.
  //
  // WHICH IS NOW THE ONLY REASON THE STREET CAN REACH A SHELF AT ALL (rome,
  // 2026-08-07). If a door of yours stands here, your things are behind it and
  // you go in like anybody else. The ground-level reach survives for exactly the
  // case it was written for: a shelf in a room where no door opens to you any
  // more, which is the one way things could otherwise be lost for good.
  if (!keepingDen(z, session)) {
    const note = throughTheDoorNote(z, session);
    if (note) return z.send(session, note);
  }
  const roomId = session.roomId;
  const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(roomId)), keepingDen(z, session));
  if (held.length === 0) return z.send(session, "You have nothing of yours here.");
  if (!arg) return z.send(session, shelfList(z, keepingDen(z, session), held));
  const entry = held.find((c) => { const t = z.world!.itemTemplates.get(c.itemId); return t ? nameMatches(t.name, arg) : false; });
  if (!entry) return z.send(session, "Nothing of yours here by that name.");
  const tmpl = z.world!.itemTemplates.get(entry.itemId)!;
  if (z.foodCapped(session, entry.itemId)) return z.send(session, z.foodFullNote());
  if (z.torchCapped(session, entry.itemId)) return z.send(session, z.torchFullNote());
  if (z.dressingCapped(session, entry.itemId)) return z.send(session, z.dressingFullNote());
  if (!z.packRoom(session, entry.itemId)) return z.send(session, `Your pack is full (${z.packCap(session)} slots). Make room first.`);
  await setContainer(z.env.DB, entry.rowId, "");
  session.items.push(entry);
  z.send(session, `You take ${tmpl.name} back off the shelf.`);
  z.sendCtx(session);
}

// ---------------------------------------------------------------------------
// THE SHELF AS A MODAL (rome, 2026-08-04: the stow chip should open a modal like
// the gatehouse does — keep the typed command as text, but the chip opens a
// panel).
//
// He is right and the inconsistency was mine: every other keeping-place in the
// game — pack, lockbox, vault — is a column in ONE modal you tap open, and the
// den's shelf was the only one that made you type a name at a time to see or
// move anything. The den is the biggest store in the world (gear is unlimited
// on it); it was the one with the worst hands.
//
// So the shelf is not a new modal. It is a FOURTH COLUMN of the keeping modal,
// shown when you are standing under a roof you may keep things in, and it
// disappears the moment you step outside. Same box, same buttons, same rules —
// which is the point: you already know how to use it. The typed commands are
// untouched ('stow <item>', 'fetch <item>', 'den'), because the chip has never
// been the only way to do anything.

export async function shelfHere(z: ZoneDO, session: Session): Promise<{ den: Den; held: CarriedItem[] } | null> {
  const den = keepingDen(z, session);
  if (!den) return null;
  return { den, held: await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(den.roomId)), den) };
}

// Pack -> shelf, one row, from the modal. Same law as cmdStow: gear is
// unlimited, everything else is capped, and a piece's wear is written down
// before it goes on the shelf so the lazy rust has an honest starting point.
export async function benchStow(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
  const den = keepingDen(z, session);
  if (!den) return "There is no shelf of yours here.";
  const carried = session.items.find((c) => c.rowId === row);
  if (!carried) return "You aren't carrying that.";
  const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(den.roomId)), den);
  if (!z.isGear(carried.itemId) && z.slotsUsed(held.filter((c) => !z.isGear(c.itemId)), "lockbox") >= denCap(den)) {
    return `Your shelf here holds ${denCap(den)} of that sort of thing and no more. Gear is another matter — hang as much of it as you like.`;
  }
  // Guarded splice (2026-08-20): the shelf read and the condition write above
  // awaited D1, so a racing double frame could both resolve the same row and
  // the loser's splice(-1,1) would eat an unrelated pack item.
  const idx = session.items.indexOf(carried);
  if (idx === -1) return "You aren't carrying that.";
  session.items.splice(idx, 1);
  carried.equipped = false;
  if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
  await setContainer(z.env.DB, carried.rowId, container(den.roomId));
  return undefined;
}

// Shelf -> pack, one row. Every pack ceiling the typed 'fetch' respects is
// respected here too — a modal must never be a way around a cap.
export async function benchFetch(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
  const den = keepingDen(z, session);
  if (!den) return "There is no shelf of yours here.";
  const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(den.roomId)), den);
  const entry = held.find((c) => c.rowId === row);
  if (!entry) return "Nothing of yours here by that name.";
  if (z.foodCapped(session, entry.itemId)) return z.foodFullNote();
  if (z.torchCapped(session, entry.itemId)) return z.torchFullNote();
  if (z.dressingCapped(session, entry.itemId)) return z.dressingFullNote();
  if (!z.packRoom(session, entry.itemId)) return `Your pack is full (${z.packCap(session)} slots). Make room first.`;
  await setContainer(z.env.DB, entry.rowId, "");
  session.items.push(entry);
  return undefined;
}

function shelfList(z: ZoneDO, den: Den | undefined, held: CarriedItem[]): string {
  if (held.length === 0) return "Your corner of this place is bare.";
  const gear = held.filter((c) => z.isGear(c.itemId)).length;
  const rest = z.slotsUsed(held.filter((c) => !z.isGear(c.itemId)), "lockbox");
  const lines = [`In your corner of this place (${gear} piece${gear === 1 ? "" : "s"} of gear, no limit; ${rest}/${denCap(den)} of everything else):`];
  const counts = new Map<string, number>();
  for (const c of held) if (z.stackable(c.itemId, c.serial, c.journalId)) counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + 1);
  for (const [id, n] of counts) {
    const t = z.world!.itemTemplates.get(id);
    lines.push(`  ${t ? t.name : id}${n > 1 ? ` (x${n})` : ""}${z.itemStat(t)}`);
  }
  for (const c of held) {
    if (z.stackable(c.itemId, c.serial, c.journalId)) continue;
    const t = z.world!.itemTemplates.get(c.itemId);
    const bits: string[] = [];
    if (c.serial !== null) bits.push(`sealed #${c.serial}`);
    if (t && t.slot !== "") bits.push(z.conditionWord(c.condition) || "sound");
    lines.push(`  ${t ? t.name : c.itemId}${z.itemStat(t)}${bits.length ? ` — ${bits.join(", ")}` : ""}`);
  }
  if (den) {
    const worst = held.filter((c) => z.isGear(c.itemId)).reduce((n, c) => Math.min(n, c.condition), 100);
    lines.push(worst <= DEN_RUST_FLOOR
      ? "The damp has had its full go at the worst of that and can do no more to it — it is as far gone as this shelf can take a thing, and a bench will still bring it back."
      : worst <= GEAR_FAILING_AT ? "Rust is well into that. A bench would have it back."
      : worst <= GEAR_WORN_AT ? "The damp is getting at that. It always does, in here."
      : "Nothing here is sealed against time — food ages on this shelf and iron rusts, though iron left here never rusts away to nothing.");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// HOW IT STANDS

export async function cmdDen(z: ZoneDO, session: Session): Promise<void> {
  const here = keepingDen(z, session);
  const lines: string[] = [];
  if (here) {
    const room = z.world!.rooms.get(here.roomId)!;
    const mine = here.holder === session.pubkey;
    lines.push(`${room.name} — ${mine ? "yours" : `${holderName(z, here)}'s`}.`);
    lines.push(here.barred ? "The bar is on the door." : "The door does not shut. Anything out there can walk in.");
    if (mine) {
      const built = Object.entries(DEN_BUILDS).filter(([k]) => here[k as keyof Den] === true).map(([, b]) => b.name);
      lines.push(built.length ? `Built in it: ${built.join(", ")}.${built.length < Object.keys(DEN_BUILDS).length ? " ('build' for the rest)" : ""}` : "Nothing built in it yet but the walls. ('build' lists what it could have.)");
      lines.push(bunkList(z, here));
      if (here.barred) {
        lines.push("The bar holds the hold. It stands empty as long as it has to — you will find it here.");
      } else {
        const days = Math.max(0, Math.round((DEN_LAPSE_MS - (Date.now() - here.tendedAt)) / 86_400_000));
        lines.push(`Nothing shuts this door, so nothing keeps it: empty another ${days} day${days === 1 ? "" : "s"} and the hold falls in. A bar ends that.`);
      }
    } else if (here.keys.has(session.pubkey)) {
      lines.push("You have a bunk here.");
    }
    const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(here.roomId)), here);
    if (held.length) lines.push(shelfList(z, here, held));
  } else if (doorHere(z, session)) {
    // A door of yours on this ground, and you outside it. The street is told
    // where the house is, never what is in it.
    const d = doorHere(z, session)!;
    lines.push(d.holder === session.pubkey
      ? `${z.world!.rooms.get(session.roomId)!.name} — your door is here, shut. ('in' opens it.)`
      : `${holderName(z, d)}'s door is here, and you have a bunk behind it. ('in' opens it.)`);
  } else if (canBuildHere(z, session.roomId) && !myDen(z, session.pubkey)) {
    lines.push(`${z.world!.rooms.get(session.roomId)!.name} — open ground, far enough out to live on. ('settle' raises a den here.)`);
  }
  const own = [...z.dens.values()].filter((d) => d.holder === session.pubkey && d.roomId !== session.roomId);
  for (const d of own) {
    const where = z.world!.rooms.get(d.roomId)!.name;
    if (d.barred) {
      lines.push(`You also hold ${where}, barred — it stands until you give it up.`);
    } else {
      const days = Math.max(0, Math.round((DEN_LAPSE_MS - (Date.now() - d.tendedAt)) / 86_400_000));
      lines.push(`You also hold ${where}, open — ${days} day${days === 1 ? "" : "s"} before it falls in, unless you bar it.`);
    }
  }
  const bunks = [...z.dens.values()].filter((d) => d.keys.has(session.pubkey));
  for (const d of bunks) lines.push(`You have a bunk in ${z.world!.rooms.get(d.roomId)!.name}, under ${holderName(z, d)}.`);
  // AND AN ACCOUNT OF EVERY SHELF YOU HAVE THINGS ON, whether you still live
  // there or not — including houses that lapsed out from under you and houses
  // somebody else has taken since. You should never have to remember where you
  // left something to be sure it is still yours.
  const shelves = await shelvesOf(z, session.pubkey);
  for (const [room, n] of shelves) {
    if (room === here?.roomId) continue;
    const mine = myDen(z, session.pubkey)?.roomId === room;
    const where = z.world!.rooms.get(room)?.name ?? room;
    // AND SAY HOW TO GET IT BACK. This line has always been an accurate
    // inventory and a useless one (rome, 2026-08-10): it told him three things
    // of his were in a house he no longer held, and named no way to reach them.
    // A shelf in a house that is not yours is reached by standing on that ground
    // and saying 'fetch' — no door required, which is the whole reason the
    // ground-level reach exists — and nothing in the game said so.
    const how = mine ? "" : " — stand there and 'fetch' to take them back";
    lines.push(`${n} thing${n === 1 ? "" : "s"} of yours ${mine ? "on your shelf in" : "still in"} ${where}${how}.`);
  }
  if (lines.length === 0) {
    lines.push("You live nowhere. A den goes up on open ground well out from the gates — far enough that nobody passes it by accident. Pick your ground, stand on it, and 'settle'.");
  }
  z.send(session, lines.join("\n"));
}

// A HOUSE HAS WINDOWS (rome, 2026-08-03: "what about gankers?"). The obvious
// attack on a den is not the den — it is the doorway. Your house is a fixed
// point on the map, so anyone who wants you dead only has to stand outside it
// and wait, and you walk out into a knife carrying everything you just came
// home with.
//
// The answer is not a rule that punishes the waiting; it is that A HOUSE CAN BE
// LOOKED OUT OF. Standing in your own den with the bar down, you see who is in
// the rooms around it before you open anything. The Warrener's Lodge loft was
// written for exactly this before the system existed — "sitting in the dark,
// seeing everything, and being seen by nothing" — and it is now true of every
// holding. It does not save you. It means being camped is a thing you KNOW
// rather than a thing you discover, which turns a gank into a siege, and a
// siege is a situation with moves in it: wait them out, leave by the loft, or
// come out swinging on your own terms.
export function windowLine(z: ZoneDO, session: Session): string {
  const den = insideOf(z, session.pubkey);
  if (!den || !den.barred) return "";
  const seen: string[] = [];
  for (const e of z.world!.exits.get(session.roomId) ?? []) {
    const who = [...z.sessions.values()].filter((s) => s.roomId === e.to_room && s.pubkey !== session.pubkey && s.hp > 0);
    if (who.length) seen.push(`${who.map((s) => s.name).join(" and ")} — ${e.dir}`);
  }
  if (!seen.length) return "";
  return `Through the shutter: ${seen.join("; ")}.`;
}

// The line the room itself carries, appended to a holding's description so the
// state of the place is something you SEE rather than something you query.
export function denRoomLine(z: ZoneDO, roomId: string, session: Session): string {
  // YOU CAN SEE A HOUSE FROM THE STREET. Sixty rooms of den ground: walking onto
  // it told you nothing, so unless you happened to step through the right doorway
  // you never learned the sites existed. A hamlet is not a maze — you stand in
  // the yard and you can see which buildings have ground worth building on.
  // NO SIGNPOST NEXT DOOR ANY MORE (rome, 2026-10-19). This used to point at
  // the holdings from the rooms beside them, which was the only way to learn
  // where the ten sites were. Now a den stands wherever somebody chose to put
  // it, and a line naming the house next door would be a map of where people
  // sleep for anybody who wanted to wait outside one.
  if (!isHolding(z, roomId)) return "";
  // A STREET OF DOORS (mig 172). The room is a site: it says how many people have
  // raised something here, whether YOU have, and that there is always room for
  // another — because there is. It never names a stranger. Putting the holders'
  // names in the room description would turn the den ground into a directory of
  // who sleeps where, which is exactly what a ganker wants and exactly what the
  // one-house version of this line already refused to give him.
  // Behind a door, the room reads as the inside of it — you are not on the
  // street and should not be told what the street looks like.
  const in_ = insideOf(z, session.pubkey);
  if (in_ && in_.roomId === roomId) {
    const own = in_.holder === session.pubkey;
    return [
      own ? "You are inside your own den." : `You are inside ${holderName(z, in_)}'s den.`,
      in_.barred
        ? "The bar is across the door. Nothing out there can reach you."
        : "The door is not barred. Anything on the ground outside can walk straight in.",
      "('out' puts you back on the ground.)",
    ].join(" ");
  }
  const all = densAt(z, roomId);
  const mine = myDenAt(z, roomId, session.pubkey);
  const bunk = all.find((d) => d.keys.has(session.pubkey));
  const others = all.length - (mine ? 1 : 0);
  const bits: string[] = [];
  // Open ground with nothing on it is just open ground: the room says nothing,
  // and the 'settle' chip is what tells you it would take a den.
  if (!all.length) return "";
  bits.push(others > 0
    ? `${others} den${others === 1 ? "" : "s"} stand${others === 1 ? "s" : ""} here that ${others === 1 ? "is" : "are"} not yours — doors shut, and none of them your business.`
    : "Nothing else standing here but yours.");
  if (mine) bits.push(mine.barred ? "Yours is the one with the bar across it. ('in')" : "Yours is the one whose door still does not shut. ('in', and 'bar' when you have the iron)");
  else if (bunk) bits.push(`You have a bunk under ${holderName(z, bunk)}'s roof here. ('in')`);
  else if (canBuildHere(z, roomId)) bits.push("There is room for another. ('settle')");
  // A LIT HEARTH SHOWS (DEN_BUILDS): somebody resting by their fire after dark
  // puts light round the edge of a door, and the ground outside can see it.
  if (isNight() && [...z.sessions.values()].some((s) => s.roomId === roomId && s.hearthLit === roomId && hearthWarm(z, s))) {
    bits.push("Firelight shows round the edge of a door here.");
  }
  return bits.join(" ");
}

// The den a player is keeping things in RIGHT NOW: the one they stepped into,
// else their own on this ground, else the single door open to them here. On a
// street with several open to you, standing outside all of them, your own wins —
// and if you have none of your own, you must be inside a friend's to use it.
// THE SHELF IS INSIDE THE HOUSE (rome, 2026-08-07: "remove the den propties of
// in the room i choose, make it so you enter"). This used to fall through from
// "inside it" to "your den in this room" to "the one door here that opens to
// you", which meant the shelf, the readout and the keeping modal all worked
// while you stood on the open street — so the site room WAS the den, and
// stepping through your own door bought you nothing but the bar. A house you
// can use without going in isn't a house. Inside, or nothing.
export function keepingDen(z: ZoneDO, session: Session): Den | undefined {
  const inside = insideOf(z, session.pubkey);
  return inside && inside.roomId === session.roomId ? inside : undefined;
}

// THE NAME SAYS WHICH SIDE OF THE DOOR YOU ARE ON (rome, 2026-08-07). The room
// title and the HUD both read the bare room name, so being inside a house looked
// exactly like standing in the street outside it — the same failure the shelf
// had. The gatehouse already does this ("The Gatehouse", not the gate room's
// name); a den is the same shape and gets the same honesty.
// WHAT THE INSIDE LOOKS LIKE (rome, 2026-10-22: 'look' in his den gave him
// the lane outside). Behind the door the room is the house, not the ground it
// stands on: the frame every den has, then each thing built in it, in the
// order it would catch your eye. The same room the picture shows - timber
// walls, the shelf, the bed, the mat on the floor.
export function interiorDescription(z: ZoneDO, session: Session): string {
  const d = insideOf(z, session.pubkey);
  if (!d || d.roomId !== session.roomId) return "";
  const own = d.holder === session.pubkey;
  const bits = [own
    ? "Four walls of split timber and a roof over them, put up with your own hands. A shelf runs along the back wall, a frame bed with hides on it stands against the side, and a rush mat covers the earth floor."
    : "Four walls of split timber and a roof over them, somebody else's work. A shelf along the back wall, a frame bed with hides on it, a rush mat on the earth floor."];
  if (d.hearth) bits.push("In the corner, a ring of stones with an iron grate in it, and a smoke-hole cut in the roof above.");
  if (d.rack) bits.push("A second rack of split wood is pinned up beside the shelf.");
  if (d.hides) bits.push("Oiled hides hang down over the shelf against the damp.");
  if (d.larder) bits.push("One corner is boxed in with split wood and lined with leather: the larder.");
  if (d.rattle) bits.push("A cord of bone and horn is strung across the inside of the door.");
  if (d.smoke) bits.push("A rack of split wood hangs over the hearth, black with smoke.");
  if (d.butt) bits.push(d.water > 0 ? `A water butt stands under the roof edge by the door, ${d.water >= DEN_BUTT_CAP ? "full" : "with water in it"}.` : "A water butt stands under the roof edge by the door, dry.");
  if (d.whet) bits.push("A whetstone sits in its frame by the wall, with an iron crank.");
  if (d.frame) bits.push("A stretching frame leans against the wall.");
  if (d.stakes) bits.push("Outside, the stakes you drove are in the ground where only you know them.");
  if (d.slit) bits.push("A narrow slit cut through the wall beside the door, with a leather flap over it.");
  if (d.cellar) bits.push("A hatch in the larder floor opens on the root cellar, cold and still.");
  if (d.bolthole) bits.push("Beside the wall a dark hole goes down and away under it: the bolt-hole.");
  if (d.snares) bits.push("Your snare line runs past the stakes outside.");
  return bits.join(" ");
}

export function roomTitle(z: ZoneDO, session: Session, name: string): string {
  const inside = insideOf(z, session.pubkey);
  if (!inside || inside.roomId !== session.roomId) return name;
  return inside.holder === session.pubkey
    ? `${name} > den`
    : `${name} > ${holderName(z, inside)}'s den`;
}

// A door on this ground that would open to you — used only to say "go in" in
// the right words. Never to reach past it.
export function doorHere(z: ZoneDO, session: Session): Den | undefined {
  return doorsOpenTo(z, session.roomId, session.pubkey)[0];
}

// What to say to somebody reaching for their things from the street.
/**
 * NO DOOR OF YOURS HERE — AND WHAT THAT LEAVES OUT. The refusal used to send you
 * off to 'settle' or to beg a bunk, which is the right advice for somebody
 * standing on empty ground and the wrong advice for somebody standing over
 * their own belongings (rome, 2026-08-10: he moved from the North House to the
 * Reeve's, and the three things he had left behind read as gone — his own
 * summary told him they were there, and every verb he tried refused).
 *
 * A shelf outlives the hold: the row is keyed to your pubkey and the ROOM, so
 * nothing that happens to the house touches it, and the ground-level reach
 * exists precisely so a room where no door opens to you still gives your things
 * back. That was true the whole time. Nothing said it.
 */
async function noDoorNote(z: ZoneDO, session: Session): Promise<string> {
  const held = await loadContainer(z.env.DB, session.pubkey, container(session.roomId));
  if (held.length) {
    return `There is no door of yours on this ground — but ${held.length} thing${held.length === 1 ? " of yours is" : "s of yours are"} still on the shelf here, and a shelf is yours whoever holds the roof. ('fetch' takes ${held.length === 1 ? "it" : "them"} back.)`;
  }
  return "There is no door of yours on this ground. Raise one ('settle'), or get somebody to give you a bunk under theirs.";
}

export function throughTheDoorNote(z: ZoneDO, session: Session): string | undefined {
  const d = doorHere(z, session);
  if (!d) return undefined;
  return d.holder === session.pubkey
    ? "Your shelf is inside, behind your own door. ('in' opens it.)"
    : `That is inside ${holderName(z, d)}'s, and you are standing in the street. ('in' opens it.)`;
}

function holderName(z: ZoneDO, den: Den): string {
  return z.sessions.get(den.holder)?.name || den.holderName || "somebody";
}

async function nameOf(z: ZoneDO, pubkey: string): Promise<string | null> {
  const row = await z.env.DB.prepare("SELECT name FROM players WHERE pubkey = ?").bind(pubkey).first<{ name: string }>();
  return row?.name ?? null;
}


// ---------------------------------------------------------------------------
// THE SECOND SIX (rome, 2026-10-22, mig 327). What a den does with them. Each
// one works only for the holder, standing inside their own door: a den is a
// house, not a public works, and a bunk is a bed, not a share in the tools.

function ownInside(z: ZoneDO, session: Session): Den | undefined {
  const d = insideOf(z, session.pubkey);
  return d && d.roomId === session.roomId && d.holder === session.pubkey ? d : undefined;
}
export function hasWork(z: ZoneDO, session: Session, key: "smoke" | "butt" | "whet" | "frame" | "hearth"): boolean {
  return !!ownInside(z, session)?.[key];
}

// THE DEN'S FIRE. A bundle of split wood in the hearth burns DEN_FIRE_MS, and
// cooking and the smoke rack both work off it while it lasts. Lying down by
// the hearth lights it too. Held in memory: a fire does not outlast the world
// waking up again, and nothing is lost if it goes out early - the next bundle
// lights it.
const denFire = new Map<string, number>();
function fireLit(d: Den): boolean { return (denFire.get(d.holder) ?? 0) > Date.now(); }
async function kindle(z: ZoneDO, session: Session, d: Den): Promise<string | null> {
  if (fireLit(d)) return "";
  const wood = session.items.find((c) => c.itemId === WOOD_ID && c.serial === null);
  if (!wood) return null;
  session.items.splice(session.items.indexOf(wood), 1);
  await removeItemRow(z.env.DB, wood.rowId);
  denFire.set(d.holder, Date.now() + DEN_FIRE_MS);
  return "You put a bundle of split wood in the hearth and get it going. ";
}

// THE SMOKE RACK. Your own racks behind your own door: the gate's safe cure,
// out here. It rides the rot clock the same way (kind "dencure", roomId = your
// pubkey) and is taken down only by a 'cure' in this den. Returns false when
// this is not the place, so the ordinary racks answer instead.
export async function denCure(z: ZoneDO, session: Session, arg: string): Promise<boolean> {
  const d = ownInside(z, session);
  if (!d?.smoke) return false;
  const world = z.world!;
  const now = Date.now();
  let collected = 0;
  for (const r of z.rot.filter((r) => r.kind === "dencure" && r.roomId === session.pubkey && r.at <= now)) {
    const out = CURE_RECIPES[r.itemId] ?? "smoked-haunch";
    if (!z.packRoom(session, out)) continue;
    const id = uuid();
    await insertLoot(z.env.DB, id, session.pubkey, out, null);
    session.items.push({ rowId: id, itemId: out, serial: null, equipped: false, condition: 100 });
    z.rot.splice(z.rot.indexOf(r), 1);
    collected++;
  }
  const got = collected ? `You take ${collected === 1 ? "a cured piece" : collected + " cured pieces"} down off the rack, black and keeping. ` : "";
  if (arg) {
    const named = (c: CarriedItem) => nameMatches(world.itemTemplates.get(c.itemId)!.name, arg);
    const carried = session.items.find((c) => CURE_RECIPES[c.itemId] && c.serial === null && named(c)) ?? session.items.find(named);
    if (!carried) { z.send(session, got + "You carry nothing like that.", got ? "gain" : undefined); return true; }
    if (!CURE_RECIPES[carried.itemId]) { z.send(session, got + `${cap(world.itemTemplates.get(carried.itemId)!.name)} won't cure. The rack is for raw meat and fresh-caught fish.`, got ? "gain" : undefined); return true; }
    if (carried.serial !== null) { z.send(session, got + "That one's sealed for extraction. Break the seal before you'd hang it in the smoke."); return true; }
    const lit = await kindle(z, session, d);
    if (lit === null) { z.send(session, got + "The hearth is cold, and the rack cures nothing without smoke. You have no split wood on you to light it."); return true; }
    const idx = session.items.indexOf(carried);
    if (idx === -1) { z.send(session, "That's already left your pack."); return true; }
    session.items.splice(idx, 1);
    await removeItemRow(z.env.DB, carried.rowId);
    z.rot.push({ itemId: carried.itemId, roomId: session.pubkey, at: now + GATE_CURE_MS, kind: "dencure" });
    const mins = Math.round(GATE_CURE_MS / 60_000);
    z.send(session, got + lit + `You hang ${world.itemTemplates.get(carried.itemId)!.name} on the rack over the hearth. Give it about ${mins} minutes; it cures while you are gone, and nobody else will take it down. ('cure' reads the rack.)`, "gain");
    z.sendCtx(session);
    z.markSimDirty();
    return true;
  }
  const still = z.rot.filter((r) => r.kind === "dencure" && r.roomId === session.pubkey && r.at > now);
  const stuck = z.rot.filter((r) => r.kind === "dencure" && r.roomId === session.pubkey && r.at <= now);
  let hanging = "";
  if (still.length) {
    const mins = Math.max(1, Math.ceil((Math.min(...still.map((r) => r.at)) - now) / 60_000));
    hanging = ` ${still.length === 1 ? "A piece hangs" : still.length + " pieces hang"} in the smoke, about ${mins} minute${mins === 1 ? "" : "s"} yet.`;
  }
  if (stuck.length) hanging += ` ${stuck.length === 1 ? "A cured piece waits" : stuck.length + " cured pieces wait"} on the rack, but your pack is full.`;
  const raw = session.items.some((c) => CURE_RECIPES[c.itemId] && c.serial === null);
  z.send(session, (got + "The rack hangs over the hearth. Hang raw meat or a fresh catch on it ('cure haunch', 'cure fish'); the hearth wants a bundle of split wood if it is cold." + (raw ? "" : " (You've nothing raw to hang.)") + hanging).trim(), collected ? "gain" : undefined);
  if (collected) { z.sendCtx(session); z.markSimDirty(); }
  return true;
}

// COOKING AT HOME. The hearth is a fire like any other: a catch goes on it and
// comes off at once. Returns false when there is no hearth of yours here.
export async function denCook(z: ZoneDO, session: Session, arg: string): Promise<boolean> {
  const d = ownInside(z, session);
  if (!d?.hearth) return false;
  const world = z.world!;
  const cookable = session.items.filter((c) => COOK_RECIPES[c.itemId] && c.serial === null);
  if (!arg) {
    z.send(session, (fireLit(d) ? "The hearth is burning. " : "The hearth is cold; cooking will put a bundle of split wood in it. ")
      + (cookable.length ? `You carry ${cookable.map((c) => world.itemTemplates.get(c.itemId)!.name).join(", ")}. ('cook <catch>')` : "You carry nothing a fire would improve."), "evt");
    return true;
  }
  const named = (c: CarriedItem) => nameMatches(world.itemTemplates.get(c.itemId)!.name, arg);
  const carried = cookable.find(named) ?? session.items.find(named);
  if (!carried) { z.send(session, "You carry nothing like that."); return true; }
  const outId = COOK_RECIPES[carried.itemId];
  const rawT = world.itemTemplates.get(carried.itemId)!;
  if (!outId) {
    z.send(session, FOOD_KEEPS.has(carried.itemId)
      ? `${cap(rawT.name)} has been through a fire already, or a barrel. Cooking it twice takes it the wrong way.`
      : `${cap(rawT.name)} is not for the fire. This is for what comes out of water: a fish, an eel, a crab, an egg. Raw meat is the smoke rack's business.`);
    return true;
  }
  if (carried.serial !== null) { z.send(session, "That one's sealed for extraction. Break the seal before you'd put it on a fire."); return true; }
  const age = await itemAcquiredAt(z.env.DB, carried.rowId);
  if (foodState(age ?? undefined, carried.itemId) === "spoiled") { z.send(session, `${cap(rawT.name)} has gone. The fire will not take the rot back out.`); return true; }
  const lit = await kindle(z, session, d);
  if (lit === null) { z.send(session, "The hearth is cold, and you have no split wood on you to light it."); return true; }
  const idx = session.items.indexOf(carried);
  if (idx === -1) { z.send(session, "That's already left your pack."); return true; }
  session.items.splice(idx, 1);
  await removeItemRow(z.env.DB, carried.rowId);
  const rowId = uuid();
  await insertLoot(z.env.DB, rowId, session.pubkey, outId, null);
  session.items.push({ rowId, itemId: outId, serial: null, equipped: false, condition: 100 });
  z.send(session, lit + `You set ${rawT.name} over the hearth and turn it once. It comes off as ${world.itemTemplates.get(outId)!.name}. (It will not keep. That is what the rack is for.)`, "gain");
  z.sendStatus(session);
  z.sendCtx(session);
  z.markSimDirty();
  return true;
}

// THE WATER BUTT. Rain off the roof fills it a draught at a time
// (DEN_BUTT_RAIN_MS of rain each), whether anybody is home or not; 'draw'
// takes one out as water to carry. Read every tick, written only on a change.
export function fillButts(z: ZoneDO, now: number): void {
  for (const d of z.dens.values()) {
    if (!d.butt) continue;
    if (d.water >= DEN_BUTT_CAP || !events.raining(z, d.roomId)) { d.waterAt = now; continue; }
    if (now - d.waterAt < DEN_BUTT_RAIN_MS) continue;
    d.water += 1;
    d.waterAt = now;
    void z.env.DB.prepare("UPDATE dens SET butt_water = ?, butt_at = ? WHERE room_id = ? AND holder = ?")
      .bind(d.water, now, d.roomId, d.holder).run().catch(() => {});
  }
}
export async function cmdDraw(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const d = ownInside(z, session);
  if (!d?.butt) return z.send(session, "There is nothing here to draw from.");
  if (arg && !/water|butt|drink|draught/i.test(arg)) return z.send(session, "The butt holds water, and nothing else.");
  if (d.water <= 0) return z.send(session, "The butt is dry. It wants rain.");
  if (!z.packRoom(session, "well-water")) return z.send(session, "You have no room to carry it.");
  const rowId = uuid();
  await insertLoot(z.env.DB, rowId, session.pubkey, "well-water", null);
  session.items.push({ rowId, itemId: "well-water", serial: null, equipped: false, condition: 100 });
  d.water -= 1;
  await z.env.DB.prepare("UPDATE dens SET butt_water = ?, butt_at = ? WHERE room_id = ? AND holder = ?")
    .bind(d.water, d.waterAt, d.roomId, d.holder).run();
  z.send(session, `You draw off a draught of rainwater. ${d.water === 0 ? "That was the last of it." : `The butt holds ${d.water} more.`}`, "gain");
  z.sendCtx(session);
}

// THE STRETCHING FRAME. A pelt or a hide off your kills comes off the frame as
// leather offcuts, more for a better pelt (DEN_PELT_LEATHER by rarity), which
// is what the den itself is built and mended with.
function isPelt(z: ZoneDO, itemId: string): boolean {
  return /(^|-)(pelt|hide|skin)$/.test(itemId) && !z.isGear(itemId);
}
export async function cmdStretch(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const d = ownInside(z, session);
  if (!d?.frame) return z.send(session, "You have no frame here to stretch anything on.");
  if (z.inCombat(session)) return z.send(session, "Not with something in the room that wants you dead.");
  const world = z.world!;
  const pelts = session.items.filter((c) => isPelt(z, c.itemId));
  if (!arg) return z.send(session, pelts.length
    ? `The frame leans against the wall. You carry ${pelts.map((c) => world.itemTemplates.get(c.itemId)!.name).join(", ")}. ('stretch <pelt>')`
    : "The frame leans against the wall, empty. A pelt or a hide off a kill goes on it.");
  const carried = pelts.find((c) => nameMatches(world.itemTemplates.get(c.itemId)!.name, arg)) ?? z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  const t = world.itemTemplates.get(carried.itemId)!;
  if (!isPelt(z, carried.itemId)) return z.send(session, `${cap(t.name)} is not a pelt. The frame takes a skin off a kill.`);
  if (carried.serial !== null) return z.send(session, "That one's sealed. Break the seal before you'd put a knife to it.");
  // A pelt comes off the frame under a blade, and not otherwise.
  const blade = denTool(z, session, "fine");
  if (!blade) return z.send(session, `You would need a knife or a blade to take ${t.name} down to leather.`);
  const n = DEN_PELT_LEATHER[t.rarity] ?? 2;
  const idx = session.items.indexOf(carried);
  if (idx === -1) return z.send(session, "That's already left your pack.");
  session.items.splice(idx, 1);
  await removeItemRow(z.env.DB, carried.rowId);
  let kept = 0;
  for (let i = 0; i < n; i++) {
    if (!z.packRoom(session, LEATHER_ID)) break;
    const rowId = uuid();
    await insertLoot(z.env.DB, rowId, session.pubkey, LEATHER_ID, null);
    session.items.push({ rowId, itemId: LEATHER_ID, serial: null, equipped: false, condition: 100 });
    kept++;
  }
  z.send(session, `You peg ${t.name} out on the frame and take it down with ${z.world!.itemTemplates.get(blade.itemId)?.name ?? "your blade"}. It comes off as ${kept} piece${kept === 1 ? "" : "s"} of leather.` + (kept < n ? " The rest you have no room to carry, and it goes in the fire." : ""), "gain");
  z.sendCtx(session);
}

// THE STAKES. Once a night, the first thing to come onto the ground of a den
// that has them runs onto them: a quarter of what it can take, never the last
// of it. The holder and everyone bunked there know where they are.
const stakedAt = new Map<string, number>();
export function stakesBite(z: ZoneDO, roomId: string, who: { pubkey?: string; name: string; hp: number; maxHp: number }, silent = false): number {
  if (!isNight()) return 0;
  const now = Date.now();
  for (const d of z.dens.values()) {
    if (d.roomId !== roomId || !d.stakes) continue;
    if (who.pubkey && (who.pubkey === d.holder || d.keys.has(who.pubkey))) continue;
    if (now - (stakedAt.get(d.holder) ?? 0) < 12 * 3_600_000) continue;
    stakedAt.set(d.holder, now);
    const wound = Math.min(Math.max(0, who.hp - 1), Math.max(1, Math.round(who.maxHp * DEN_STAKES_WOUND)));
    if (!silent) {
      z.roomFeed(roomId, `${cap(who.name)} comes onto the ground in the dark and runs onto a stake.`, who.pubkey, false);
      for (const s of z.sessions.values()) {
        if (s.roomId === roomId && insideOf(z, s.pubkey) === d) z.send(s, "Outside, something runs onto the stakes, and the sound of it comes through the wall.", "evt");
      }
    }
    return wound;
  }
  return 0;
}

// THE SLIT. From inside, what is standing on the ground outside.
export function slitLine(z: ZoneDO, session: Session): string {
  const d = insideOf(z, session.pubkey);
  if (!d || d.roomId !== session.roomId || !d.slit) return "";
  const world = z.world!;
  const seen: string[] = [];
  for (const c of z.creaturesInRoom(d.roomId)) {
    if (c.hidden || c.aloft !== undefined) continue;
    seen.push(world.mobTemplates.get(c.templateId)?.name ?? "something");
  }
  for (const s of z.sessions.values()) {
    if (s === session || s.roomId !== d.roomId || s.hp <= 0 || z.outOfWorld(s) || insideOf(z, s.pubkey)) continue;
    seen.push(s.name);
  }
  return seen.length ? `Through the slit: ${seen.join(", ")}, on the ground outside.` : "Through the slit, the ground outside is empty.";
}
