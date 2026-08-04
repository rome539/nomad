// THE DENS — the places nomads live (rome, 2026-08-03: "ITS SUPPOSED TO BE A
// FUCKING PLACE WHERE NOMADS FUCKING LIVE").
//
// Its own module rather than more of zone.ts, per the standing rule: the spine
// is tick/combat + transport, and this is neither. Free functions taking the
// ZoneDO as `z`, same seam as gate.ts and trade.ts.
//
// WHAT A DEN IS, and every line of it is one of rome's own rulings:
//
//   A HOLDING WITH BUNKS, not a room with an owner. The claim gives you the
//   room; the room has capacity; you decide who else gets a key. So the scarce
//   thing is the DOOR, not the bed — six doors on this ground, thirty-six beds
//   behind them — and the way in for the thirty-seventh nomad is not to find an
//   empty room, it is to find somebody who will take them in.
//
//   IT OPENS EXPOSED. The gatehouse is safe because it is shared and neutral
//   and nobody's; a den is safe only because it is yours and only as far as you
//   have made it so. A fresh den is an ordinary room — things walk in. The bar
//   on the door is iron you carried out here, and it is the one thing that
//   changes that.
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
  DEN_RUST_PER_HOUR, DEN_RUST_FLOOR, SEALED_WEAR_MULT, GEAR_FAILING_AT, GEAR_WORN_AT } from "./zone-data";
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

export async function loadDens(z: ZoneDO): Promise<Map<string, Den>> {
  const dens = new Map<string, Den>();
  const rows = (await z.env.DB.prepare(
    "SELECT d.room_id, d.holder, d.claimed_at, d.tended_at, d.barred, COALESCE(p.name, '') AS holder_name FROM dens d LEFT JOIN players p ON p.pubkey = d.holder")
    .all<{ room_id: string; holder: string; claimed_at: number; tended_at: number; barred: number; holder_name: string }>()).results ?? [];
  for (const r of rows) {
    dens.set(r.room_id, {
      roomId: r.room_id, holder: r.holder, claimedAt: r.claimed_at,
      tendedAt: r.tended_at, barred: r.barred === 1, holderName: r.holder_name, keys: new Map(),
    });
  }
  const keys = (await z.env.DB.prepare("SELECT room_id, pubkey, granted_at FROM den_keys")
    .all<{ room_id: string; pubkey: string; granted_at: number }>()).results ?? [];
  for (const k of keys) dens.get(k.room_id)?.keys.set(k.pubkey, k.granted_at);
  return dens;
}

export function denAt(z: ZoneDO, roomId: string): Den | undefined {
  const den = z.dens.get(roomId);
  if (!den) return undefined;
  // Lazy lapse. Checked wherever a den is looked at rather than swept on the
  // tick, because the only person who cares whether an abandoned hold is still
  // standing is somebody standing in it — and they will be, asking.
  if (Date.now() - den.tendedAt > DEN_LAPSE_MS) { void lapse(z, den); return undefined; }
  return den;
}

export function isHolding(z: ZoneDO, roomId: string): boolean {
  return z.world!.rooms.get(roomId)?.is_holding === 1;
}

// Does a den's shut door keep the world out? Read by ai.ts alongside
// world.safeRooms — a barred den is a hideaway that somebody made.
export function denBarred(z: ZoneDO, roomId: string): boolean {
  return denAt(z, roomId)?.barred === true;
}

// A BARRED DOOR STOPS PEOPLE TOO (rome, 2026-08-03: "what about gankers?").
//
// I had the bar turning away creatures and letting any wanderer walk straight
// in, which is not a door — it is a fence for animals. A man with a knife is
// the thing you actually bar a door against, and the fiction was already
// explicit about it: the Warrener's Lodge has "a door with three sockets for a
// bar" because "a warrener slept out here with people who wanted his rabbits on
// every side of him".
//
// So the bar is the whole of a den's security and it is absolute while it
// holds: the holder and everyone they gave a bunk to walk in; nobody else does,
// ever, by any means. That is not a magic ward — it is a piece of oak in two
// sockets, and it cost iron carried out of the deep. This is the "earns its
// security entirely through upgrades, never by default" ruling doing its job:
// an UNBARRED den is wide open to anyone, which is what most dens will be.
export function barredAgainst(z: ZoneDO, roomId: string, pubkey: string): string | null {
  const den = denAt(z, roomId);
  if (!den || !den.barred || mayEnterKeeping(den, pubkey)) return null;
  return "The door is barred from the inside. It does not move, and whoever put the bar there is not going to lift it for you.";
}

export function mayEnterKeeping(den: Den, pubkey: string): boolean {
  return den.holder === pubkey || den.keys.has(pubkey);
}

// ---------------------------------------------------------------------------
// THE HOLD

export async function cmdSettle(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const roomId = session.roomId;
  if (arg === "down") arg = ""; // "settle down" is the same instinct
  if (!isHolding(z, roomId)) {
    return z.send(session, "You could sleep here. You could not LIVE here — there is no door to shut and nothing to shut it against. A holding wants a roof, a way to close it, and somewhere to lie down.");
  }
  if (z.inCombat(session)) return z.send(session, "Not with something in the room that wants you dead.");
  const room = z.world!.rooms.get(roomId)!;
  const held = denAt(z, roomId);
  if (held) {
    if (held.holder === session.pubkey) return z.send(session, `${room.name} is already yours. ('den' tells you how it stands.)`);
    if (held.keys.has(session.pubkey)) return z.send(session, `You have a bunk here, which is not the same as the door. ${holderName(z, held)} holds it.`);
    const days = Math.max(1, Math.round((DEN_LAPSE_MS - (Date.now() - held.tendedAt)) / 86_400_000));
    return z.send(session, `${holderName(z, held)} holds this place and has been back inside it recently enough that it is still theirs. If nobody comes home for another ${days} day${days === 1 ? "" : "s"}, the hold falls in.`);
  }
  // Yours. There is nothing to pay: taking a roof nobody is under is the
  // oldest arrangement there is, and the cost of this place is that you now
  // have to keep coming back to it.
  const now = Date.now();
  const den: Den = { roomId, holder: session.pubkey, claimedAt: now, tendedAt: now, barred: false, holderName: session.name, keys: new Map() };
  z.dens.set(roomId, den);
  await z.env.DB.prepare("INSERT OR REPLACE INTO dens (room_id, holder, claimed_at, tended_at, barred) VALUES (?, ?, ?, ?, 0)")
    .bind(roomId, session.pubkey, now, now).run();
  z.send(session, [
    `You take ${room.name}.`,
    "Nobody witnesses it and nothing marks it. What makes it yours is that you came back, and that you keep coming back — leave it standing empty long enough and the hold falls in and the door is open to whoever is here.",
    `The door does not shut yet. Fit a bar to it (${DEN_BAR_IRON} iron and ${DEN_BAR_SCRAP} scrap, then 'bar') and things stop walking in.`,
    `You can put ${DEN_BUNKS} other nomads under this roof — hand them a key face to face ('bunk <name>').`,
  ].join("\n"));
  z.roomFeed(roomId, `${session.name} settles ${room.name}.`, session.pubkey, false);
  z.sendCtx(session);
}

export async function cmdAbandon(z: ZoneDO, session: Session): Promise<void> {
  const den = denAt(z, session.roomId);
  if (!den || den.holder !== session.pubkey) return z.send(session, "This is not yours to give up.");
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
  z.dens.delete(den.roomId);
  await drop(z, den);
  const s = z.sessions.get(den.holder);
  if (s) z.send(s, `Word reaches you, in the way it does out here: the hold on ${z.world!.rooms.get(den.roomId)!.name} has fallen in. You stopped going back.`);
}

async function drop(z: ZoneDO, den: Den): Promise<void> {
  z.dens.delete(den.roomId);
  await z.env.DB.prepare("DELETE FROM dens WHERE room_id = ?").bind(den.roomId).run();
  await z.env.DB.prepare("DELETE FROM den_keys WHERE room_id = ?").bind(den.roomId).run();
}

// Called on every arrival. Standing in your own doorway IS the upkeep.
export function tend(z: ZoneDO, session: Session): void {
  const den = z.dens.get(session.roomId);
  if (!den || den.holder !== session.pubkey) return;
  const now = Date.now();
  if (now - den.tendedAt < 3_600_000) return; // an hour's granularity; no write per step
  den.tendedAt = now;
  void z.env.DB.prepare("UPDATE dens SET tended_at = ? WHERE room_id = ?").bind(now, den.roomId).run();
}

// ---------------------------------------------------------------------------
// THE BAR — the first and, today, the only upgrade. Deliberately an OBJECT with
// a cost in iron, not a level: a den earns its safety, it is never issued it.

export async function cmdBar(z: ZoneDO, session: Session): Promise<void> {
  const den = denAt(z, session.roomId);
  if (!den) return z.send(session, isHolding(z, session.roomId) ? "Nobody holds this place. Settle it first." : "There is no door here worth barring.");
  if (den.holder !== session.pubkey) return z.send(session, "The door is not yours to change.");
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
  await z.env.DB.prepare("UPDATE dens SET barred = 1 WHERE room_id = ?").bind(den.roomId).run();
  z.send(session, "You cut the sockets, hang the bar, and drop it once to hear it seat.\nNothing walks in here now. That is not the same as nothing knowing you are in here.");
  z.roomFeed(den.roomId, `${session.name} hangs a bar on the door.`, session.pubkey, false);
  z.sendCtx(session);
}

// ---------------------------------------------------------------------------
// THE BUNKS. A key is handed over FACE TO FACE — they have to be standing in
// the room. That is the whole social mechanic: taking someone in is something
// you did in a place, not a name you typed at a menu.

export async function cmdBunk(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const den = denAt(z, session.roomId);
  if (!den) return z.send(session, "You are not in a holding of yours.");
  if (den.holder !== session.pubkey) return z.send(session, `${holderName(z, den)} decides who sleeps here.`);
  if (!arg) return z.send(session, bunkList(z, den));
  const guest = [...z.sessions.values()].find((s) => s.roomId === session.roomId && s.pubkey !== session.pubkey && nameMatches(s.name, arg));
  if (!guest) return z.send(session, "Nobody here by that name. A key is handed over, not sent — they have to be standing in front of you.");
  if (den.keys.has(guest.pubkey)) return z.send(session, `${guest.name} already has a bunk here.`);
  if (den.keys.size >= DEN_BUNKS) return z.send(session, `Every bunk under this roof is spoken for (${DEN_BUNKS}). Turn somebody out first, if it comes to that.`);
  const now = Date.now();
  den.keys.set(guest.pubkey, now);
  await z.env.DB.prepare("INSERT OR REPLACE INTO den_keys (room_id, pubkey, granted_at) VALUES (?, ?, ?)")
    .bind(den.roomId, guest.pubkey, now).run();
  const room = z.world!.rooms.get(den.roomId)!;
  z.send(session, `You give ${guest.name} a bunk under this roof. ${DEN_BUNKS - den.keys.size} left.`);
  z.send(guest, `${session.name} gives you a bunk in ${room.name}. You can shelter here, and stow things here, and the bar will be lifted for you.`);
  z.roomFeed(den.roomId, `${session.name} takes ${guest.name} in.`, session.pubkey, false);
}

export async function cmdUnbunk(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const den = denAt(z, session.roomId) ?? [...z.dens.values()].find((d) => d.holder === session.pubkey);
  if (!den || den.holder !== session.pubkey) return z.send(session, "You hold nothing to turn anybody out of.");
  if (!arg) return z.send(session, bunkList(z, den));
  let target: string | undefined;
  for (const pk of den.keys.keys()) {
    const nm = z.sessions.get(pk)?.name ?? await nameOf(z, pk);
    if (nm && nameMatches(nm, arg)) { target = pk; break; }
  }
  if (!target) return z.send(session, "Nobody of that name has a bunk here.");
  den.keys.delete(target);
  await z.env.DB.prepare("DELETE FROM den_keys WHERE room_id = ? AND pubkey = ?").bind(den.roomId, target).run();
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
  const den = denAt(z, session.roomId);
  if (!den) return z.send(session, isHolding(z, session.roomId) ? "Nobody lives here yet. There is nowhere to put anything down that it would still be tomorrow." : "There is no shelf here, and nothing here to keep anything.");
  if (!mayEnterKeeping(den, session.pubkey)) return z.send(session, `This is ${holderName(z, den)}'s roof. You would be leaving your things in somebody else's house.`);
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
  // That left ONE way to lose it, and it was real: a lapsed den, settled by
  // somebody else, barred — and your gear sits behind a door that will never
  // open for you again. Which is not "safe storage", it is a trap with a
  // fourteen-day fuse. So: if you are shut out of a room you have goods in, you
  // collect them AT THE DOOR. You do not get in — no entry, no ambush, no
  // standing in a stranger's house — you just get your things back.
  let roomId = session.roomId;
  let held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(roomId)));
  let atDoor = false;
  if (held.length === 0) {
    for (const e of z.world!.exits.get(session.roomId) ?? []) {
      if (!barredAgainst(z, e.to_room, session.pubkey)) continue;
      const outside = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(e.to_room)));
      if (outside.length) { roomId = e.to_room; held = outside; atDoor = true; break; }
    }
  }
  if (held.length === 0) return z.send(session, "You have nothing of yours here.");
  if (atDoor && !arg) {
    z.send(session, `The door is shut to you, but your things are not inside it — they have been set out under the eaves of ${z.world!.rooms.get(roomId)!.name}, in a heap, in the wet. Nobody is required to be gracious about this.`);
  }
  if (!arg) return z.send(session, shelfList(z, denAt(z, roomId), held));
  const entry = held.find((c) => { const t = z.world!.itemTemplates.get(c.itemId); return t ? nameMatches(t.name, arg) : false; });
  if (!entry) return z.send(session, "Nothing of yours here by that name.");
  const tmpl = z.world!.itemTemplates.get(entry.itemId)!;
  if (z.foodCapped(session, entry.itemId)) return z.send(session, z.foodFullNote());
  if (z.torchCapped(session, entry.itemId)) return z.send(session, z.torchFullNote());
  if (z.dressingCapped(session, entry.itemId)) return z.send(session, z.dressingFullNote());
  if (!z.packRoom(session, entry.itemId)) return z.send(session, `Your pack is full (${PACK_CAP} slots). Make room first.`);
  await setContainer(z.env.DB, entry.rowId, "");
  session.items.push(entry);
  z.send(session, atDoor ? `You take ${tmpl.name} out of the heap by the door.` : `You take ${tmpl.name} back off the shelf.`);
  z.sendCtx(session);
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
  const here = denAt(z, session.roomId);
  const lines: string[] = [];
  if (here) {
    const room = z.world!.rooms.get(here.roomId)!;
    const mine = here.holder === session.pubkey;
    lines.push(`${room.name} — ${mine ? "yours" : `${holderName(z, here)}'s`}.`);
    lines.push(here.barred ? "The bar is on the door." : "The door does not shut. Anything out there can walk in.");
    if (mine) {
      lines.push(bunkList(z, here));
      const days = Math.max(0, Math.round((DEN_LAPSE_MS - (Date.now() - here.tendedAt)) / 86_400_000));
      lines.push(`Empty for another ${days} day${days === 1 ? "" : "s"} and the hold falls in.`);
    } else if (here.keys.has(session.pubkey)) {
      lines.push("You have a bunk here.");
    }
    const held = await rustShelf(z, await loadContainer(z.env.DB, session.pubkey, container(here.roomId)));
    if (held.length) lines.push(shelfList(z, here, held));
  } else if (isHolding(z, session.roomId)) {
    lines.push(`${z.world!.rooms.get(session.roomId)!.name} — a roof, a door, and nobody under it. ('settle' takes it.)`);
  }
  const own = [...z.dens.values()].filter((d) => d.holder === session.pubkey && d.roomId !== session.roomId);
  for (const d of own) {
    const days = Math.max(0, Math.round((DEN_LAPSE_MS - (Date.now() - d.tendedAt)) / 86_400_000));
    lines.push(`You also hold ${z.world!.rooms.get(d.roomId)!.name}${d.barred ? ", barred" : ", open"} — ${days} day${days === 1 ? "" : "s"} before it falls in.`);
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
    const held = denAt(z, room);
    const mine = held?.holder === session.pubkey;
    const where = z.world!.rooms.get(room)?.name ?? room;
    const shut = barredAgainst(z, room, session.pubkey) ? " — shut to you now; 'fetch' at the door gets them back" : "";
    lines.push(`${n} thing${n === 1 ? "" : "s"} of yours ${mine ? "on your shelf in" : "still in"} ${where}${shut}.`);
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
  const den = denAt(z, session.roomId);
  if (!den || !den.barred || !mayEnterKeeping(den, session.pubkey)) return "";
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
  if (!isHolding(z, roomId)) return "";
  const den = denAt(z, roomId);
  if (!den) return "Nobody lives here. The door is shut and nobody shut it.";
  if (den.holder === session.pubkey) return den.barred ? "Yours. The bar is across the door." : "Yours, and the door still does not shut.";
  const who = holderName(z, den);
  if (den.keys.has(session.pubkey)) return `${who} lives here, and you have a bunk under the roof.`;
  // A STRANGER LEARNS THAT IT IS LIVED IN, NEVER BY WHOM (rome, 2026-08-03:
  // "what about gankers?"). Naming the holder to anyone who walks in turned the
  // six doors into a directory: walk the den ground, read six names, and you
  // know exactly who to wait for and where they sleep. A house tells you
  // somebody is home. It does not introduce them.
  return den.barred
    ? "Somebody lives here, and the door is barred from the inside."
    : "Somebody lives here. Ashes not long cold, and things put away in an order that means something to somebody.";
}

function holderName(z: ZoneDO, den: Den): string {
  return z.sessions.get(den.holder)?.name || den.holderName || "somebody";
}

async function nameOf(z: ZoneDO, pubkey: string): Promise<string | null> {
  const row = await z.env.DB.prepare("SELECT name FROM players WHERE pubkey = ?").bind(pubkey).first<{ name: string }>();
  return row?.name ?? null;
}
