// THE DENS — the places nomads live (rome, 2026-08-03: "ITS SUPPOSED TO BE A
// FUCKING PLACE WHERE NOMADS FUCKING LIVE").
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
import { type CarriedItem, loadContainer, setContainer, setItemCondition, removeItemRow } from "./world";
import { SCRAP_ID, IRON_ID, PACK_CAP, DEN_BUNKS, DEN_CAP, DEN_LAPSE_MS, DEN_BAR_IRON, DEN_BAR_SCRAP,
  DEN_RAISE_IRON, DEN_RAISE_SCRAP,
  DEN_RUST_PER_HOUR, DEN_RUST_FLOOR, DEN_WAKE_CHANCE, SEALED_WEAR_MULT, GEAR_FAILING_AT, GEAR_WORN_AT } from "./zone-data";
import { nameMatches, shortName } from "./zone-util";

export interface Den {
  roomId: string;
  holder: string;      // pubkey
  claimedAt: number;
  tendedAt: number;    // last time the HOLDER stood in it — the lapse clock
  barred: boolean;
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
    "SELECT d.room_id, d.holder, d.claimed_at, d.tended_at, d.barred, COALESCE(p.name, '') AS holder_name FROM dens d LEFT JOIN players p ON p.pubkey = d.holder")
    .all<{ room_id: string; holder: string; claimed_at: number; tended_at: number; barred: number; holder_name: string }>()).results ?? [];
  for (const r of rows) {
    dens.set(r.holder, {
      roomId: r.room_id, holder: r.holder, claimedAt: r.claimed_at,
      tendedAt: r.tended_at, barred: r.barred === 1, holderName: r.holder_name, keys: new Map(),
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
export function densAt(z: ZoneDO, roomId: string): Den[] {
  const out: Den[] = [];
  for (const d of z.dens.values()) {
    if (d.roomId !== roomId) continue;
    if (lapsed(d)) { void lapse(z, d); continue; }
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
  if (lapsed(d)) { void lapse(z, d); return undefined; }
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

export function isHolding(z: ZoneDO, roomId: string): boolean {
  return z.world!.rooms.get(roomId)?.is_holding === 1;
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
async function spend(z: ZoneDO, session: Session, itemId: string, n: number): Promise<void> {
  for (const c of session.items.filter((c) => c.itemId === itemId && c.serial === null).slice(0, n)) {
    session.items.splice(session.items.indexOf(c), 1);
    await removeItemRow(z.env.DB, c.rowId);
  }
}

export async function cmdSettle(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const roomId = session.roomId;
  if (arg === "down") arg = ""; // "settle down" is the same instinct
  if (!isHolding(z, roomId)) {
    return z.send(session, "You could sleep here. You could not LIVE here — there is no door to shut and nothing to shut it against. A holding wants a roof, a way to close it, and somewhere to lie down.");
  }
  if (z.inCombat(session)) return z.send(session, "Not with something in the room that wants you dead.");
  // AND YOU CANNOT WAIT OUT A KILLING BY RAISING YOUR OWN DOOR ON THE SPOT.
  // Without this the whole rule has an obvious way round it: murder your host,
  // then build next to the room you were shut out of (migs 171/172).
  if (spilledOnThisGround(z, roomId, session.pubkey)) {
    return z.send(session, "You spilled blood on this ground. Whatever has come and gone since, it is not going to be your home.");
  }
  // A MAN LIVES IN ONE PLACE (rome, 2026-08-04: "why the fuck can i settle
  // multiple dens???").
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
  const iron = countOf(session, IRON_ID), scrap = countOf(session, SCRAP_ID);
  if (iron < DEN_RAISE_IRON || scrap < DEN_RAISE_SCRAP) {
    return z.send(session, [
      "There is room on this ground for another door, and nothing standing in your way. What you have not got is the building.",
      `A den wants ${DEN_RAISE_IRON} iron and ${DEN_RAISE_SCRAP} scrap carried out here — a frame, hinges, nails, and the tools to hang them. You have ${iron} iron and ${scrap} scrap.`,
    ].join("\n"));
  }
  await spend(z, session, IRON_ID, DEN_RAISE_IRON);
  await spend(z, session, SCRAP_ID, DEN_RAISE_SCRAP);
  const now = Date.now();
  const den: Den = { roomId, holder: session.pubkey, claimedAt: now, tendedAt: now, barred: false, holderName: session.name, keys: new Map() };
  z.dens.set(session.pubkey, den);
  await z.env.DB.prepare("INSERT OR REPLACE INTO dens (room_id, holder, claimed_at, tended_at, barred) VALUES (?, ?, ?, ?, 0)")
    .bind(roomId, session.pubkey, now, now).run();
  const neighbours = densAt(z, roomId).length - 1;
  z.send(session, [
    `You raise a den at ${room.name}. A frame, a floor you did not have to dig, and a door that is yours.`,
    neighbours > 0
      ? `You are not the only one living on this ground — ${neighbours} other door${neighbours === 1 ? "" : "s"} here, and none of them are your business.`
      : "Nobody witnesses it and nothing marks it. What makes it yours is that you came back, and that you keep coming back — leave an unbarred frame standing empty long enough and it falls in. A bar on the door ends that, and it stands until you give it up.",
    `The door does not shut yet. Fit a bar to it (${DEN_BAR_IRON} iron and ${DEN_BAR_SCRAP} scrap, then 'bar') and nothing walks in after you.`,
    `Step through it with 'in', and back out to the ground with 'out'. You can put ${DEN_BUNKS} other nomads under this roof — hand them a key face to face ('bunk <name>').`,
  ].join("\n"));
  z.roomFeed(roomId, `${session.name} raises a den here — a frame going up, and a door hung on it.`, session.pubkey, false);
  z.sendCtx(session);
}

// ---- the door: in off the ground, out onto it ------------------------------
//
// The site room is public and stays public. This is the door off it, and it is
// the gatehouse's own shape reused: the street is where the world can reach you,
// and behind the door is whatever you have made of it.

export function cmdEnterDen(z: ZoneDO, session: Session, arg: string): boolean {
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
  if (den.holder === session.pubkey) tend(z, session);
  z.send(session, [
    den.holder === session.pubkey
      ? `You step in and pull the door to behind you.${den.barred ? " The bar drops into its sockets." : " There is no bar in the sockets, and the doorway is a doorway."}`
      : `You let yourself into ${holderName(z, den)}'s.${den.barred ? " The bar drops behind you." : " Nothing is shut behind you."}`,
    den.barred
      ? "Nothing out there can reach you in here."
      : "Anything on the ground outside can walk straight in after you. A bar would end that.",
  ].join("\n"));
  z.roomFeed(session.roomId, `${session.name} steps through a door and it closes.`, session.pubkey, false);
  z.sendStatus(session); // the bar has to say you're inside the moment you are
  z.sendCtx(session);
  return true;
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
  const kept = await loadContainer(z.env.DB, session.pubkey, container(den.roomId));
  if (kept.length > 0) return z.send(session, `There are still ${kept.length} of your things on the shelf here. Clear them out first — walking away does not carry them for you.`);
  await drop(z, den);
  z.send(session, `You let ${z.world!.rooms.get(den.roomId)!.name} go. The door stands open behind you.`);
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
  if (!isHolding(z, session.roomId)) return;         // den ground only
  if (myDenAt(z, session.roomId, session.pubkey)) return;  // your own door: the room says it
  if (insideOf(z, session.pubkey)) return;           // you are indoors; this is the street's line
  const held = await loadContainer(z.env.DB, session.pubkey, container(session.roomId));
  if (!held.length) return;
  z.send(session, `${held.length} thing${held.length === 1 ? "" : "s"} of yours ${held.length === 1 ? "is" : "are"} still on a shelf here, from when this was yours. ('fetch')`, "gain");
}

export function tend(z: ZoneDO, session: Session): void {
  const den = z.dens.get(session.pubkey);
  if (!den || den.roomId !== session.roomId) return;
  const now = Date.now();
  if (now - den.tendedAt < 3_600_000) return; // an hour's granularity; no write per step
  den.tendedAt = now;
  void z.env.DB.prepare("UPDATE dens SET tended_at = ? WHERE room_id = ? AND holder = ?").bind(now, den.roomId, den.holder).run();
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
export async function rustShelf(z: ZoneDO, held: CarriedItem[]): Promise<CarriedItem[]> {
  const now = Date.now();
  for (const c of held) {
    if (!z.isGear(c.itemId)) continue;          // cloth, food, rock and trophies keep their own clocks
    const since = c.containerAt ?? now;
    const hours = (now - since) / 3_600_000;
    if (hours <= 0) continue;
    let amount = hours * DEN_RUST_PER_HOUR;
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
  const den = keepingDen(z, session);
  if (!den) {
    return z.send(session, throughTheDoorNote(z, session)
      ?? (isHolding(z, session.roomId)
        ? await noDoorNote(z, session)
        : "There is no shelf here, and nothing here to keep anything."));
  }
  const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(den.roomId)));
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
  if (!z.isGear(carried.itemId) && z.slotsUsed(held.filter((c) => !z.isGear(c.itemId)), "lockbox") >= DEN_CAP) {
    return z.send(session, `Your shelf here holds ${DEN_CAP} of that sort of thing and no more. Gear is another matter — hang as much of it as you like.`);
  }
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
  carried.equipped = false;
  session.items.splice(session.items.indexOf(carried), 1);
  await setContainer(z.env.DB, carried.rowId, container(den.roomId));
  z.send(session, `You put ${tmpl.name} down here. It will still be here. It will not be any newer.`);
  z.roomFeed(den.roomId, `${session.name} puts something down and leaves it.`, session.pubkey, false);
  z.sendCtx(session);
}

export async function cmdFetch(z: ZoneDO, session: Session, arg: string): Promise<void> {
  // YOUR THINGS NEVER BECOME UNREACHABLE (rome, 2026-08-03: "make sure when im
  // storing gear in the den, it wont fucking disappear on me").
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
  const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(roomId)));
  if (held.length === 0) return z.send(session, "You have nothing of yours here.");
  if (!arg) return z.send(session, shelfList(z, keepingDen(z, session), held));
  const entry = held.find((c) => { const t = z.world!.itemTemplates.get(c.itemId); return t ? nameMatches(t.name, arg) : false; });
  if (!entry) return z.send(session, "Nothing of yours here by that name.");
  const tmpl = z.world!.itemTemplates.get(entry.itemId)!;
  if (z.foodCapped(session, entry.itemId)) return z.send(session, z.foodFullNote());
  if (z.torchCapped(session, entry.itemId)) return z.send(session, z.torchFullNote());
  if (z.dressingCapped(session, entry.itemId)) return z.send(session, z.dressingFullNote());
  if (!z.packRoom(session, entry.itemId)) return z.send(session, `Your pack is full (${PACK_CAP} slots). Make room first.`);
  await setContainer(z.env.DB, entry.rowId, "");
  session.items.push(entry);
  z.send(session, `You take ${tmpl.name} back off the shelf.`);
  z.sendCtx(session);
}

// ---------------------------------------------------------------------------
// THE SHELF AS A MODAL (rome, 2026-08-04: "why the fuck did you make the
// fucking stow command chip not a fucking modal (keep the command you write
// text, but the chip opens a fucking model like the gatehouse)").
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
  return { den, held: await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(den.roomId))) };
}

// Pack -> shelf, one row, from the modal. Same law as cmdStow: gear is
// unlimited, everything else is capped, and a piece's wear is written down
// before it goes on the shelf so the lazy rust has an honest starting point.
export async function benchStow(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
  const den = keepingDen(z, session);
  if (!den) return "There is no shelf of yours here.";
  const carried = session.items.find((c) => c.rowId === row);
  if (!carried) return "You aren't carrying that.";
  const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(den.roomId)));
  if (!z.isGear(carried.itemId) && z.slotsUsed(held.filter((c) => !z.isGear(c.itemId)), "lockbox") >= DEN_CAP) {
    return `Your shelf here holds ${DEN_CAP} of that sort of thing and no more. Gear is another matter — hang as much of it as you like.`;
  }
  if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
  carried.equipped = false;
  session.items.splice(session.items.indexOf(carried), 1);
  await setContainer(z.env.DB, carried.rowId, container(den.roomId));
  return undefined;
}

// Shelf -> pack, one row. Every pack ceiling the typed 'fetch' respects is
// respected here too — a modal must never be a way around a cap.
export async function benchFetch(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
  const den = keepingDen(z, session);
  if (!den) return "There is no shelf of yours here.";
  const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(den.roomId)));
  const entry = held.find((c) => c.rowId === row);
  if (!entry) return "Nothing of yours here by that name.";
  if (z.foodCapped(session, entry.itemId)) return z.foodFullNote();
  if (z.torchCapped(session, entry.itemId)) return z.torchFullNote();
  if (z.dressingCapped(session, entry.itemId)) return z.dressingFullNote();
  if (!z.packRoom(session, entry.itemId)) return `Your pack is full (${PACK_CAP} slots). Make room first.`;
  await setContainer(z.env.DB, entry.rowId, "");
  session.items.push(entry);
  return undefined;
}

function shelfList(z: ZoneDO, den: Den | undefined, held: CarriedItem[]): string {
  if (held.length === 0) return "Your corner of this place is bare.";
  const gear = held.filter((c) => z.isGear(c.itemId)).length;
  const rest = z.slotsUsed(held.filter((c) => !z.isGear(c.itemId)), "lockbox");
  const lines = [`In your corner of this place (${gear} piece${gear === 1 ? "" : "s"} of gear, no limit; ${rest}/${DEN_CAP} of everything else):`];
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
    const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(here.roomId)));
    if (held.length) lines.push(shelfList(z, here, held));
  } else if (doorHere(z, session)) {
    // A door of yours on this ground, and you outside it. The street is told
    // where the house is, never what is in it.
    const d = doorHere(z, session)!;
    lines.push(d.holder === session.pubkey
      ? `${z.world!.rooms.get(session.roomId)!.name} — your door is here, shut. ('in' opens it.)`
      : `${holderName(z, d)}'s door is here, and you have a bunk behind it. ('in' opens it.)`);
  } else if (isHolding(z, session.roomId)) {
    lines.push(`${z.world!.rooms.get(session.roomId)!.name} — a roof, a door, and nobody under it. ('settle' takes it.)`);
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
    lines.push("You live nowhere. Six roofs on the den ground will take a holder, and every one of them is a room you have to walk to and stand in.");
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
  if (!isHolding(z, roomId)) {
    if (z.regionOf(roomId) !== "den") return "";
    const near: string[] = [];
    for (const e of z.world!.exits.get(roomId) ?? []) {
      if (!isHolding(z, e.to_room)) continue;
      const name = z.world!.rooms.get(e.to_room)?.name ?? "a house";
      const n = densAt(z, e.to_room).length;
      near.push(`${name} (${e.dir})${n ? `, ${n} living in it` : ", nobody in it"}`);
    }
    return near.length ? `Ground worth building on stands off this one: ${near.join("; ")}.` : "";
  }
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
  if (!all.length) {
    bits.push("Nobody has built anything here. The ground is good and the walls are somebody else's problem from a long time ago.");
  } else {
    bits.push(others > 0
      ? `${others} den${others === 1 ? "" : "s"} stand${others === 1 ? "s" : ""} here that ${others === 1 ? "is" : "are"} not yours — doors shut, and none of them your business.`
      : "Nothing else standing here but yours.");
  }
  if (mine) bits.push(mine.barred ? "Yours is the one with the bar across it. ('in')" : "Yours is the one whose door still does not shut. ('in', and 'bar' when you have the iron)");
  else if (bunk) bits.push(`You have a bunk under ${holderName(z, bunk)}'s roof here. ('in')`);
  else bits.push(`There is room for another. ('settle' — it wants ${DEN_RAISE_IRON} iron and ${DEN_RAISE_SCRAP} scrap)`);
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
