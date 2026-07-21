// Wanderer-to-wanderer trade, lifted out of the ZoneDO monolith the same way
// as gate.ts/pvp.ts: free functions taking the ZoneDO instance as `z`. Unlike
// every gate modal (barter/stash/vault/forge), this one works ANYWHERE two
// wanderers share a room OR the gatehouse — so it never sets `away`. A deal
// is not a shield: nothing here makes either side untouchable, and drawing
// steel on either end cancels it (sweepCombatDeals). No currency — item for
// item only — and nothing here ever reaches a relay; it's a room-local
// handshake, same law as the gatehouse's own talk.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { type CarriedItem, deedsOwner, loadContainer, transferItems } from "./world";
import { uuid } from "./rng";
import { PACK_CAP } from "./zone-data";
import { gatehouseFolk, gatehouseFeed } from "./gate";
import { findPlayerIn } from "./verbs";

export interface DealItem {
  rowId: string;
  itemId: string;
}

export interface Deal {
  id: string;
  aPk: string; // the one who asked
  bPk: string; // the one who was asked — only they can accept/decline
  accepted: boolean; // the ask, answered — false = a request notice only, no modal yet
  roomId: string; // where it opened — an in-world deal must stay put to settle
  gatehouse: boolean; // opened in the gatehouse: the vault joins the offer pool
  offerA: DealItem[];
  offerB: DealItem[];
  confirmA: boolean;
  confirmB: boolean;
  settling?: boolean; // re-entrancy guard around the DB write (STANDING LESSON, c336ef9: never let two triggers cross an env.DB await on the same state)
}

function otherOf(deal: Deal, pubkey: string): string {
  return deal.aPk === pubkey ? deal.bPk : deal.aPk;
}

// Trade whatever's off your body — sealed goods and a journal's pages
// included, just not gear you're currently wearing. A seal isn't cracked by
// a willing trade the way death cracks it: the title just changes hands
// (transferItems never touches the mint row, same as the deed doesn't when a
// sealing hand changes, world.ts's deedsOwner). A journal's logs/ink are
// keyed to its journalId, not a pubkey, so they simply ride along. Worn gear
// stays off the table — rome's call: nobody should be able to trade away
// what's on their back mid-deal.
function tradeable(c: CarriedItem): boolean {
  return !c.equipped;
}

// What a wanderer can actually lay on the table: the pack anywhere, the
// lockbox anywhere too (it's yours wherever you are, just not physically
// open), and the vault ONLY where the deal was struck in the gatehouse — the
// vault is the deep keep, reachable at a gate alone. Pack rows are the only
// ones cached on the session; lockbox/vault are read fresh every time, same
// as gate.ts's own trade cart does.
async function tradePools(
  z: ZoneDO, session: Session, gatehouse: boolean,
): Promise<{ item: CarriedItem; pool: "" | "lockbox" | "vault" }[]> {
  const out: { item: CarriedItem; pool: "" | "lockbox" | "vault" }[] = [];
  for (const c of session.items) if (tradeable(c)) out.push({ item: c, pool: "" });
  for (const c of await loadContainer(z.env.DB, session.pubkey, "lockbox")) {
    if (tradeable(c)) out.push({ item: c, pool: "lockbox" });
  }
  if (gatehouse) {
    for (const c of await loadContainer(z.env.DB, session.pubkey, "vault")) {
      if (tradeable(c)) out.push({ item: c, pool: "vault" });
    }
  }
  return out;
}

// deal <name> — ASK to trade with whoever's named, wherever you both stand.
// Neither side sees the swap modal yet: the other party gets a request they
// have to answer first (a top-right prompt, not the modal itself).
export function cmdDeal(z: ZoneDO, session: Session, arg: string): void {
  if (!arg) return z.send(session, "Deal with who? ('deal <name>')");
  if (z.inCombat(session)) return z.send(session, "Not while something is trying to kill you.");
  if (session.dealId) return z.send(session, "You're already elbow-deep in a deal — close it first.");
  const inHouse = z.outOfWorld(session);
  const other = inHouse
    ? gatehouseFolk(z).find((s) => s.pubkey !== session.pubkey && s.name.toLowerCase().startsWith(arg))
    : findPlayerIn(z, session.roomId, arg);
  if (!other) return z.send(session, "Nobody here by that name.");
  if (other.pubkey === session.pubkey) return z.send(session, "Deal with yourself? The dungeon isn't that lonely yet.");
  if (other.dealId) return z.send(session, `${other.name} is already deep in a deal with someone else.`);
  if (z.inCombat(other)) return z.send(session, `${other.name} has their hands full right now.`);
  // Mid another modal (sorting their pack, at the forge) — not sanctuary, but
  // not free to deal either: pushing a swap modal on top would collide with
  // whatever they've already got open.
  if (other.away && !inHouse) return z.send(session, `${other.name} is head-down in something else right now.`);

  const deal: Deal = {
    id: uuid(),
    aPk: session.pubkey, bPk: other.pubkey,
    accepted: false,
    roomId: session.roomId,
    gatehouse: inHouse,
    offerA: [], offerB: [],
    confirmA: false, confirmB: false,
  };
  z.deals.set(deal.id, deal);
  session.dealId = deal.id;
  other.dealId = deal.id;
  sendRequest(z, session, "outgoing", other.name);
  sendRequest(z, other, "incoming", session.name);
}

// The one who was asked answers. Only now does either side see the modal —
// and only now is it worth telling the room a deal's actually underway.
async function acceptDeal(z: ZoneDO, deal: Deal, session: Session): Promise<void> {
  if (session.pubkey !== deal.bPk) return; // only the asked can accept
  const a = z.sessions.get(deal.aPk);
  if (!a) return; // they left while it sat unanswered
  deal.accepted = true;
  const line = `${a.name} and ${session.name} strike up a deal.`;
  if (deal.gatehouse) gatehouseFeed(z, line);
  else z.roomFeed(deal.roomId, line, undefined, false);
  await sendDeal(z, a, deal);
  await sendDeal(z, session, deal);
}

function declineDeal(z: ZoneDO, deal: Deal, session: Session): void {
  if (session.pubkey !== deal.bPk) return; // only the asked can decline
  cancelDeal(z, deal, `${session.name} isn't dealing right now.`, session.pubkey);
}

// The client's side of the swap protocol: {v:0, t:"swap", action, row?}.
export async function handleSwap(z: ZoneDO, session: Session, frame: any): Promise<void> {
  const deal = session.dealId ? z.deals.get(session.dealId) : undefined;
  if (!deal) return;
  const action = frame?.action;
  if (!deal.accepted) {
    if (action === "accept") return acceptDeal(z, deal, session);
    if (action === "decline") return declineDeal(z, deal, session);
    // "cancel" here is the REQUESTER (aPk) withdrawing while it sits
    // unanswered — the outgoing popup's only button. Unlike decline, it's
    // not bPk-restricted: the same plain cancelDeal the accepted-modal path
    // uses below. No exceptPubkey — the clicker's own popup only closes once
    // this closeFrame comes back; there's no optimistic client-side close.
    if (action === "cancel") return cancelDeal(z, deal, "The deal falls through.");
    return;
  }
  if (action === "cancel") return cancelDeal(z, deal, "The deal falls through.");
  // Checked here too, not just on the tick sweep (sweepCombatDeals): a swap
  // frame skips the normal dispatch path (zone.ts routes it before
  // syncCombatCtx would run), so an ambush landing between two clicks must
  // not leave a window where a confirmed deal could still settle.
  if (z.inCombat(session)) return cancelDeal(z, deal, "Steel's out — the deal's off.");
  const mine = deal.aPk === session.pubkey;
  const other = z.sessions.get(otherOf(deal, session.pubkey));
  if (action === "offer") {
    const row = typeof frame.row === "string" ? frame.row : "";
    const pool = frame.pool === "lockbox" || frame.pool === "vault" ? frame.pool : "";
    const already = mine ? deal.offerA : deal.offerB;
    const pools = await tradePools(z, session, deal.gatehouse);
    const hit = pools.find((p) => p.item.itemId === row && p.pool === pool && !already.some((o) => o.rowId === p.item.rowId));
    if (!hit) { await sendDeal(z, session, deal, "You've nothing more like that to lay down."); return; }
    already.push({ rowId: hit.item.rowId, itemId: hit.item.itemId });
    deal.confirmA = false; deal.confirmB = false; // any change un-shakes both hands
  } else if (action === "unoffer") {
    const row = typeof frame.row === "string" ? frame.row : "";
    const list = mine ? deal.offerA : deal.offerB;
    const idx = list.findIndex((o) => o.itemId === row);
    if (idx !== -1) list.splice(idx, 1);
    deal.confirmA = false; deal.confirmB = false;
  } else if (action === "confirm") {
    if (mine) deal.confirmA = true; else deal.confirmB = true;
    if (deal.confirmA && deal.confirmB) return settleDeal(z, deal);
  } else if (action === "unconfirm") {
    if (mine) deal.confirmA = false; else deal.confirmB = false;
  } else return;
  await sendDeal(z, session, deal);
  if (other) await sendDeal(z, other, deal);
}

// The ask itself, before either side sees the modal: a small top-right
// prompt, not a full screen. "incoming" gets accept/decline; "outgoing" gets
// a cancel while they wait.
function sendRequest(z: ZoneDO, session: Session, role: "incoming" | "outgoing", partner: string): void {
  try {
    session.ws.send(JSON.stringify({ v: 0, t: "swap", open: true, pending: true, role, partner }));
  } catch {}
}

// One viewer's window onto a shared deal — their own offer/confirm labeled
// "your", the other side's labeled "their", and their own eligible goods
// (pack + lockbox always, + vault when this deal is in the gatehouse) so the
// modal can offer them without a round trip.
export async function sendDeal(z: ZoneDO, session: Session, deal: Deal, note?: string): Promise<void> {
  const world = z.world!;
  const mine = deal.aPk === session.pubkey;
  const yourOffer = mine ? deal.offerA : deal.offerB;
  const theirOffer = mine ? deal.offerB : deal.offerA;
  const other = z.sessions.get(otherOf(deal, session.pubkey));
  const nameOf = (o: DealItem) => world.itemTemplates.get(o.itemId)?.name ?? o.itemId;
  const goods = new Map<string, { itemId: string; name: string; rarity: string; pool: "" | "lockbox" | "vault"; n: number }>();
  for (const { item: c, pool } of await tradePools(z, session, deal.gatehouse)) {
    if (yourOffer.some((o) => o.rowId === c.rowId)) continue;
    const t = world.itemTemplates.get(c.itemId);
    if (!t) continue;
    const key = pool + ":" + t.id;
    const g = goods.get(key) ?? { itemId: t.id, name: t.name, rarity: t.rarity, pool, n: 0 };
    g.n += 1;
    goods.set(key, g);
  }
  try {
    session.ws.send(JSON.stringify({
      v: 0, t: "swap", open: true, pending: false,
      partner: other?.name ?? "someone who just stepped away",
      yourOffer: yourOffer.map((o) => ({ itemId: o.itemId, name: nameOf(o) })),
      theirOffer: theirOffer.map((o) => ({ itemId: o.itemId, name: nameOf(o) })),
      yourConfirm: mine ? deal.confirmA : deal.confirmB,
      theirConfirm: mine ? deal.confirmB : deal.confirmA,
      pack: [...goods.values()],
      note: note ?? "",
    }));
  } catch {}
}

function closeFrame(session: Session): void {
  try { session.ws.send(JSON.stringify({ v: 0, t: "swap", open: false })); } catch {}
}

// Hook for zone.ts's hydrateSessions: a COLD wake rebuilds this session from
// scratch (buildSession never sets dealId, and the whole z.deals map is gone
// with the rest of the evicted DO) — but the client's browser has no way to
// know that, and would otherwise sit forever on a swap modal/popup whose
// buttons now silently no-op (session.dealId is undefined, handleSwap just
// returns). Force it closed so "wave it off" always has something to close.
export function forceCloseSwapUI(session: Session): void {
  closeFrame(session);
}

// Wave the whole thing off — either side cancelling, or a hard stop
// (disconnect, death, steel drawn). Tells whoever's still around; never
// touches whichever session already triggered the cancel itself.
function cancelDeal(z: ZoneDO, deal: Deal, note: string, exceptPubkey?: string): void {
  z.deals.delete(deal.id);
  const a = z.sessions.get(deal.aPk);
  const b = z.sessions.get(deal.bPk);
  if (a && a.dealId === deal.id) a.dealId = undefined;
  if (b && b.dealId === deal.id) b.dealId = undefined;
  if (a && a.pubkey !== exceptPubkey) { closeFrame(a); z.send(a, note); }
  if (b && b.pubkey !== exceptPubkey) { closeFrame(b); z.send(b, note); }
}

// Hook for onLeave/onPlayerDeathInner: this session is gone (or dead) —
// whatever deal they were in collapses for both sides.
export function cancelDealForSession(z: ZoneDO, session: Session): void {
  const id = session.dealId;
  session.dealId = undefined;
  if (!id) return;
  const deal = z.deals.get(id);
  if (!deal) return;
  cancelDeal(z, deal, "The deal falls through — they stepped away.", session.pubkey);
}

// Hook for zone.ts's per-tick/per-command chip sweep: a deal is not a
// shield — the instant either side is in a fight, the deal is off, win or
// lose. (The fight itself was never blocked by having a deal open; this
// just stops the modal from lingering stale once one starts.)
export function sweepCombatDeals(z: ZoneDO): void {
  for (const s of z.sessions.values()) {
    if (s.dealId && z.inCombat(s)) cancelDealForSession(z, s);
  }
}

// Both hands shook: move everything at once, or not at all.
async function settleDeal(z: ZoneDO, deal: Deal): Promise<void> {
  if (deal.settling) return;
  const a = z.sessions.get(deal.aPk);
  const b = z.sessions.get(deal.bPk);
  if (!a || !b) return cancelDeal(z, deal, "The deal falls through — they stepped away.");
  // handleSwap already refuses the CALLER mid-combat, but the confirm that
  // tips both flags true can be the far side's — recheck both here, not just
  // whoever's frame happened to trigger this.
  if (z.inCombat(a) || z.inCombat(b)) return cancelDeal(z, deal, "Steel's out — the deal's off.");

  const together = deal.gatehouse
    ? (z.outOfWorld(a) && z.outOfWorld(b))
    : (!z.outOfWorld(a) && !z.outOfWorld(b) && a.roomId === deal.roomId && b.roomId === deal.roomId);
  if (!together) {
    deal.confirmA = false; deal.confirmB = false;
    await sendDeal(z, a, deal, "The deal falls apart — you're no longer within arm's reach.");
    await sendDeal(z, b, deal, "The deal falls apart — you're no longer within arm's reach.");
    return;
  }

  // Re-tally against what's ACTUALLY still carried, across every pool this
  // deal draws from (something offered may have been dropped, worn, stashed
  // elsewhere, or salvaged since) — same recount discipline gate.ts's
  // offerCore uses before it lets the keeper's counter clear.
  const resolve = async (
    session: Session, offer: DealItem[],
  ): Promise<{ item: CarriedItem; pool: "" | "lockbox" | "vault" }[] | null> => {
    const pools = await tradePools(z, session, deal.gatehouse);
    const rows: { item: CarriedItem; pool: "" | "lockbox" | "vault" }[] = [];
    for (const o of offer) {
      const hit = pools.find((p) => p.item.rowId === o.rowId && p.item.itemId === o.itemId);
      if (!hit) return null;
      rows.push(hit);
    }
    return rows;
  };
  const aHits = await resolve(a, deal.offerA);
  const bHits = await resolve(b, deal.offerB);
  // Whatever's incoming always lands in the RECIPIENT's pack (you don't get
  // someone else's lockbox or vault) — so the pack has to have room for it.
  // Simulated against a scratch copy, same slot math packRoom already trusts.
  const fits = (recipient: Session, incoming: CarriedItem[]): boolean => {
    const scratch = [...recipient.items];
    for (const c of incoming) {
      if (!z.hasRoom(scratch, c.itemId, PACK_CAP, "pack")) return false;
      scratch.push(c);
    }
    return true;
  };
  const roomOk = aHits && bHits
    && fits(b, aHits.map((h) => h.item))
    && fits(a, bHits.map((h) => h.item));
  if (!aHits || !bHits || !roomOk) {
    deal.confirmA = false; deal.confirmB = false;
    if (aHits) deal.offerA = aHits.map((h) => ({ rowId: h.item.rowId, itemId: h.item.itemId }));
    if (bHits) deal.offerB = bHits.map((h) => ({ rowId: h.item.rowId, itemId: h.item.itemId }));
    const note = !aHits || !bHits
      ? "Something on the table changed — recheck the goods and shake again."
      : "There's no room for this trade in one of your packs — trim it down and shake again.";
    await sendDeal(z, a, deal, note);
    await sendDeal(z, b, deal, note);
    return;
  }

  const aRows = aHits.map((h) => h.item);
  const bRows = bHits.map((h) => h.item);

  // Commit in memory FIRST, synchronously, before any await — so a death or
  // disconnect racing this settlement can't ALSO see these rows sitting in
  // session.items and double-process them (the exact class of bug c336ef9
  // fixed: never let a D1 await be the only thing standing between two
  // triggers and the same state). Only pack rows live in memory at all —
  // lockbox/vault are read fresh every time, nothing to splice there.
  deal.settling = true;
  for (const h of aHits) if (h.pool === "") { const i = a.items.indexOf(h.item); if (i !== -1) a.items.splice(i, 1); }
  for (const h of bHits) if (h.pool === "") { const i = b.items.indexOf(h.item); if (i !== -1) b.items.splice(i, 1); }
  a.dealId = undefined; b.dealId = undefined;
  z.deals.delete(deal.id);

  // Locked for the DURATION of the D1 round trip below (unlocked in the
  // finally no matter how it resolves) — a death landing for either party in
  // this exact window must not let clearCarriedInventory's blanket delete
  // sweep these PACK rows out from under the pending UPDATE (they're already
  // gone from session.items, so nothing else would protect them). Lockbox/
  // vault rows were never in death's blast radius (container != '' is
  // outside clearCarriedInventory's own WHERE clause) — nothing to lock there.
  const packRowIds = [...aHits, ...bHits].filter((h) => h.pool === "").map((h) => h.item.rowId);
  for (const id of packRowIds) z.tradeLocked.add(id);
  try {
    await transferItems(z.env.DB, [
      ...aRows.map((c) => ({ rowId: c.rowId, toPubkey: b.pubkey })),
      ...bRows.map((c) => ({ rowId: c.rowId, toPubkey: a.pubkey })),
    ]);
    for (const c of aRows) if (c.loreId) await deedsOwner(z.env.DB, c.loreId, b.pubkey);
    for (const c of bRows) if (c.loreId) await deedsOwner(z.env.DB, c.loreId, a.pubkey);
  } finally {
    for (const id of packRowIds) z.tradeLocked.delete(id);
  }

  // Deliver into memory only if each session is still the live one for that
  // pubkey — if they reconnected or fell away mid-settle, D1 already carries
  // the truth (items is a cache; a fresh session rebuilds from D1 anyway).
  // Everything lands in the PACK regardless of where it came from
  // (transferItems already reset container to '' in the same write).
  const world = z.world!;
  const nameOf = (c: CarriedItem) => world.itemTemplates.get(c.itemId)?.name ?? c.itemId;
  if (z.sessions.get(a.pubkey) === a) {
    a.items.push(...bRows);
    closeFrame(a);
    z.send(a, bRows.length || aRows.length
      ? `Deal struck with ${b.name}.${bRows.length ? ` You take ${bRows.map(nameOf).join(", ")}.` : ""}${aRows.length ? ` You hand over ${aRows.map(nameOf).join(", ")}.` : ""}`
      : "Deal struck — though neither of you put anything on the table.", "gain");
    z.sendCtx(a);
  }
  if (z.sessions.get(b.pubkey) === b) {
    b.items.push(...aRows);
    closeFrame(b);
    z.send(b, aRows.length || bRows.length
      ? `Deal struck with ${a.name}.${aRows.length ? ` You take ${aRows.map(nameOf).join(", ")}.` : ""}${bRows.length ? ` You hand over ${bRows.map(nameOf).join(", ")}.` : ""}`
      : "Deal struck — though neither of you put anything on the table.", "gain");
    z.sendCtx(b);
  }
  const line = `${a.name} and ${b.name} shake on a deal.`;
  if (deal.gatehouse) gatehouseFeed(z, line);
  else z.roomFeed(deal.roomId, line, undefined, false);
}
