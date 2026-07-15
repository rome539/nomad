// The gate-keeping subsystem, lifted out of the ZoneDO monolith: the bench
// trades (forge, and later salvage/repair), the keeper's hatch (barter), and
// the keeping (lockbox/vault/seal). These are free functions taking the ZoneDO
// instance as `z`; behavior is identical to when they were methods — only the
// seam moved. `import type` for ZoneDO keeps this a compile-time reference, so
// there's no runtime import cycle.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { provokeGrudges } from "./ai";
import { type ForgeRecipe, type CarriedItem, insertLoot, loadContainer, voidMint, removeItemRow, setEquipped, setItemCondition, setContainer, mintClaim, setMintEvent, setItemLoreId, deedsCreate, deedsOwner } from "./world";
import { isGameKeyConfigured, signLootEvent } from "./signing";
import { uuid, randInt, chance } from "./rng";
import * as events from "./events";
import { cap, shortName, nameMatches, roundTender, rollShopCondition, heartWord } from "./zone-util";
import { SCRAP_ID, PACK_CAP, PACK_FOOD_CAP, LOCKBOX_CAP, VAULT_CAP, RICH_TENDER, JOURNAL_ITEM, SALVAGE_YIELD, REPAIR_COST, LANTERN_ITEM, THROW_TOUGH, DEEP_HEART,
  FENCE_OUT_MIN_MS, FENCE_OUT_MAX_MS, FENCE_LAST_ONE_ODDS, FENCE_CHURN_MIN_MS, FENCE_CHURN_MAX_MS,
  GATEHOUSE_BARRED, GATEHOUSE_NOARG, GATEHOUSE_AMBIENCE, DEEP_ROOMS } from "./zone-data";
import { parse } from "./parser";
import { mapRegionOf } from "./lore";
import { dropCarried } from "./verbs";

export async function cmdForge(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const world = z.world!;
  const bar = z.benchGuard(session, "forge work");
  if (bar) return z.send(session, bar);
  if (!world.forgeRecipes.length) return z.send(session, "The brazier is cold and the recipe slate is blank.");
  z.enterStep(session, "forging"); // safe at the brazier until you step away
  if (!arg) {
    const lines = ["The bench's recipe book, chalked on slate:"];
    for (const r of [...world.forgeRecipes].sort((a, b) => a.scrap - b.scrap)) {
      const t = world.itemTemplates.get(r.itemId);
      if (!t) continue;
      const mat = r.material ? ` + ${r.materialQty} ${shortName(world.itemTemplates.get(r.material)?.name ?? r.material)}` : "";
      lines.push(`  ${t.name}${z.itemStat(t)} [${t.rarity}] — ${r.scrap} scrap iron${mat}`);
    }
    const scrap = z.countLooseIn(await z.gatePools(session), SCRAP_ID);
    lines.push(`(You have ${scrap} scrap iron between pack and keeping. 'forge <thing>' to work one. Salvage feeds the pile. 'look' steps you back into the world.)`);
    return z.send(session, lines.join("\n"));
  }
  const recipe = world.forgeRecipes.find((r) => {
    const t = world.itemTemplates.get(r.itemId);
    return t ? nameMatches(t.name, arg) : false;
  });
  if (!recipe) return z.send(session, "The bench doesn't know how to make that. ('forge' alone reads the slate.)");
  const { ok, note } = await forgeCore(z, session, recipe);
  z.send(session, note, ok ? "forge" : undefined);
  if (ok) z.sendCtx(session);
}

// Work one recipe: check pack room, scrap, and any material; consume and mint
// a fresh (unsealed) piece. Shared by the typed command and the forge modal.
// Returns the line to show and whether it actually came off the bench.
export async function forgeCore(
  z: ZoneDO,
  session: Session,
  recipe: ForgeRecipe,
): Promise<{ ok: boolean; note: string }> {
  const world = z.world!;
  const t = world.itemTemplates.get(recipe.itemId)!;
  if (!z.packRoom(session, recipe.itemId)) {
    return { ok: false, note: `Your pack is full (${PACK_CAP} slots). Make room before you forge.` };
  }
  // The bench reaches the pack AND the gate's keeping (lockbox + vault).
  const pools = await z.gatePools(session);
  const haveScrap = z.countLooseIn(pools, SCRAP_ID);
  if (haveScrap < recipe.scrap) {
    return { ok: false, note: `${cap(t.name)} wants ${recipe.scrap} scrap iron; you have ${haveScrap} between pack and keeping.` };
  }
  if (recipe.material) {
    const mt = world.itemTemplates.get(recipe.material);
    const haveMat = z.countLooseIn(pools, recipe.material);
    if (haveMat < recipe.materialQty) {
      return { ok: false, note: `${cap(t.name)} wants ${recipe.materialQty} of ${mt?.name ?? recipe.material} besides the scrap; you have ${haveMat}.` };
    }
  }
  await z.takeLooseAcross(session, SCRAP_ID, recipe.scrap);
  if (recipe.material) await z.takeLooseAcross(session, recipe.material, recipe.materialQty);
  const id = uuid();
  await insertLoot(z.env.DB, id, session.pubkey, t.id, null);
  session.items.push({ rowId: id, itemId: t.id, serial: null, equipped: false, condition: 100 });
  z.roomFeed(session.roomId, `${session.name} works the bench, hammer ringing off the gatehouse walls.`, session.pubkey);
  return {
    ok: true,
    note: `Scrap, the brazier's heat, and patience. ${cap(t.name)} comes off the bench, raw but true.${z.itemStat(t)} [${t.rarity}] (unclaimed — the gate can seal it)`,
  };
}

// ---- the forge as a modal: read the pack, show what the bench can make ----
// Same shape as the keeper's hatch — you step out of the world (untouchable),
// the brazier's yours, and each recipe shows its cost in gold when you can
// afford it, in blood when you can't. Crafting re-reads your pack each time.

export function forgeGuard(z: ZoneDO, session: Session): string | null {
  if (!z.world!.entryRooms.has(session.roomId)) return "The brazier and the bench live at the gates.";
  if (z.inCombat(session)) return "Not while something is trying to kill you.";
  if (!z.world!.forgeRecipes.length) return "The brazier is cold and the recipe slate is blank.";
  return null;
}

export async function handleForge(z: ZoneDO, session: Session, frame: any): Promise<void> {
  const world = z.world!;
  const action = frame?.action;
  if (action === "open") {
    const lateral = z.outOfWorld(session); // the brazier is a fixture of the room you're standing in
    if (session.away && !lateral) return; // one step-out at a time (mid-dungeon crouch)
    const bar = forgeGuard(z, session);
    if (bar) return z.send(session, bar);
    if (lateral) {
      z.enterStep(session, "forging"); // swap stance; the gate outside hears nothing new
      return sendForge(z, session);
    }
    session.away = true;
    session.forging = true;
    // Rest survives a trip to the forge — stepping out pauses the healing (the
    // tick gates on !away), and closing the modal resumes it.
    session.target = null;
    for (const c of z.creatures.values()) {
      if (c.target === session.pubkey) c.target = null;
    }
    z.roomFeed(session.roomId, `${session.name} steps to the bench and stirs the brazier to life.`, session.pubkey);
    z.refreshRoomCtx(session.roomId);
    return sendForge(z, session);
  }
  if (!session.forging) return;
  if (action === "close") return leaveForge(z, session);
  if (action === "craft") {
    const recipe = world.forgeRecipes.find((r) => r.itemId === frame.row);
    if (!recipe) return sendForge(z, session, "The bench doesn't know how to make that.");
    const { ok, note } = await forgeCore(z, session, recipe);
    return sendForge(z, session, note, ok ? "forge" : undefined);
  }
}

export async function leaveForge(z: ZoneDO, session: Session): Promise<void> {
  session.forging = false;
  try { session.ws.send(JSON.stringify({ v: 0, t: "forge", open: false })); } catch {}
  // The brazier is in the gatehouse: bank it and you're still by the fire.
  if (z.world!.entryRooms.has(session.roomId)) {
    session.stepText = true;
    z.send(session, describeGatehouse(z, session));
    z.sendCtx(session);
    return;
  }
  session.away = false;
  z.roomFeed(session.roomId, `${session.name} banks the brazier and steps back.`, session.pubkey);
  z.send(session, z.enterDescribe(session));
  z.sendCtx(session);
  z.refreshRoomCtx(session.roomId);
}

export async function sendForge(z: ZoneDO, session: Session, note?: string, sfx?: string): Promise<void> {
  const world = z.world!;
  // Affordability counts the pack AND the gate's keeping, so what the modal
  // shows matches what the bench will actually spend.
  const pools = await z.gatePools(session);
  const scrap = z.countLooseIn(pools, SCRAP_ID);
  const recipes = [...world.forgeRecipes]
    .sort((a, b) => a.scrap - b.scrap)
    .map((r) => {
      const t = world.itemTemplates.get(r.itemId);
      if (!t) return null;
      let material: { id: string; name: string; qty: number; have: number } | null = null;
      if (r.material) {
        const mt = world.itemTemplates.get(r.material);
        material = { id: r.material, name: shortName(mt?.name ?? r.material), qty: r.materialQty, have: z.countLooseIn(pools, r.material) };
      }
      const can = scrap >= r.scrap && (!material || material.have >= material.qty);
      return {
        id: r.itemId, name: t.name, rarity: t.rarity,
        stat: z.itemStat(t).replace(/^ \(|\)$/g, ""),
        scrap: r.scrap, material, can,
      };
    })
    .filter((r) => r !== null);
  const payload = { v: 0, t: "forge", open: true, note: note ?? "", sfx: sfx ?? "", scrap, recipes };
  try { session.ws.send(JSON.stringify(payload)); } catch {}
}

// ---- the keeper at the gate: stock, trade, and his particular tastes ----
// He deals in kind: 'buy' names the want, 'offer' lays goods on the counter
// until the trade value is met. No change given, nothing bought outright,
// nothing sealed touched. What he privately prizes, he never says.

export function fenceGuard(z: ZoneDO, session: Session): string | null {
  if (!z.world!.entryRooms.has(session.roomId)) return "The keeper keeps to the gates.";
  if (z.inCombat(session)) return "The keeper wants no part of your fight. The hatch stays shut.";
  return null;
}

// A bare shelf is a bare shelf: sold out until the keeper restocks it.
export function inStock(z: ZoneDO, itemId: string): boolean {
  return (z.fenceOut.get(itemId) ?? 0) <= Date.now();
}

// The market breathes (rome, 2026-07-11): shelves restock on their own clock,
// and every few hours an off-screen customer buys the keeper out of some one
// thing — the world has other wanderers, even when the wire is quiet.
let nextChurnAt = 0;
export function tickFence(z: ZoneDO, now: number): void {
  for (const [itemId, at] of z.fenceOut) {
    if (now >= at) z.fenceOut.delete(itemId); // the crate came in; the shelf fills
  }
  if (!nextChurnAt) {
    nextChurnAt = now + randInt(FENCE_CHURN_MIN_MS, FENCE_CHURN_MAX_MS);
    return;
  }
  if (now < nextChurnAt) return;
  nextChurnAt = now + randInt(FENCE_CHURN_MIN_MS, FENCE_CHURN_MAX_MS);
  const world = z.world!;
  const stocked = world.fenceStock.filter((s) => inStock(z, s.itemId));
  if (stocked.length <= 1) return; // never empty the whole hatch
  const gone = stocked[randInt(0, stocked.length - 1)];
  z.fenceOut.set(gone.itemId, now + randInt(FENCE_OUT_MIN_MS, FENCE_OUT_MAX_MS));
}

export function cmdBarter(z: ZoneDO, session: Session): void {
  const world = z.world!;
  const bar = fenceGuard(z, session);
  if (bar) return z.send(session, bar);
  if (!world.fenceStock.length) return z.send(session, "The hatch is shuttered, and stays that way.");
  z.enterStep(session, "trading"); // safe at the counter until you step away
  const lines = ["The keeper unshutters the hatch and lays out what he'll part with:"];
  const bare: string[] = [];
  for (const s of [...world.fenceStock].sort((a, b) => a.cost - b.cost)) {
    const t = world.itemTemplates.get(s.itemId);
    if (!t) continue;
    if (!inStock(z, s.itemId)) { bare.push(t.name); continue; }
    lines.push(`  ${t.name}${z.itemStat(t)} [${t.rarity}] — ${s.cost} in trade`);
  }
  if (bare.length) {
    lines.push(`Bare shelf-space where ${bare.join(", ")} would sit. "Come back later," he says, to nobody in particular.`);
  }
  lines.push("He deals in kind — bones, teeth, oddments. 'buy <thing>' starts a trade; 'offer <thing>' pays until he's square. He gives no change. ('look' steps you back into the world.)");
  return z.send(session, lines.join("\n"));
}

// Total tender a cart is asking for, honestly rounded.
export function cartCost(trade: { wants: { cost: number }[] }): number {
  return roundTender(trade.wants.reduce((sum, w) => sum + w.cost, 0));
}

// Name a want: opens the cart, or adds to it. The same thing can go on twice —
// 'buy linen dressing' twice buys two. Shared by the typed command and the modal.
export function startBuy(z: ZoneDO, session: Session, stock: { itemId: string; cost: number }): string {
  const t = z.world!.itemTemplates.get(stock.itemId)!;
  const cart = session.buying ?? { wants: [], paid: 0, escrow: [] };
  cart.wants.push({ itemId: stock.itemId, cost: stock.cost });
  session.buying = cart;
  const total = cartCost(cart);
  if (cart.wants.length === 1) {
    return `The keeper taps the counter: ${t.name} runs ${stock.cost} in trade. Offer what you carry — he'll say when he's square.`;
  }
  return `The keeper sets ${t.name} beside the rest — ${cart.wants.length} things now, ${total} in trade all told. Offer until he's square.`;
}

export function cmdBuy(z: ZoneDO, session: Session, arg: string): void {
  const world = z.world!;
  const bar = fenceGuard(z, session);
  if (bar) return z.send(session, bar);
  if (!arg) return z.send(session, "Buy what? 'barter' shows the keeper's stock.");
  const stock = world.fenceStock.find((s) => {
    const t = world.itemTemplates.get(s.itemId);
    return t ? nameMatches(t.name, arg) : false;
  });
  if (!stock) return z.send(session, "The keeper shrugs. He doesn't carry that.");
  if (!inStock(z, stock.itemId)) {
    return z.send(session, "The keeper spreads his hands — fresh out. The shelf behind him is bare where it would sit. Come back later.");
  }
  z.enterStep(session, "trading"); // safe at the counter until you step away
  z.send(session, startBuy(z, session, stock) + " ('offer nothing' walks away.)");
  z.sendCtx(session);
}

// Lay one thing on the counter — from the pack, the lockbox, or the vault
// (from: '' | 'lockbox' | 'vault'; nothing moves until he's square). All the
// keeper's judgement lives here; returns the line to show, however the offer
// arrived (typed or modal). He TAKES gate-sealed goods — and cracks the seal
// without ceremony when the trade closes (the mint is voided, honestly).
export async function offerCore(z: ZoneDO, session: Session, carried: CarriedItem, from: string): Promise<string> {
  const world = z.world!;
  const trade = session.buying!;
  const t = world.itemTemplates.get(carried.itemId)!;
  if ((t.barter ?? 0) <= 0) return `The keeper waves ${t.name} away. No use to him.`;
  trade.escrow.push({ row: carried.rowId, from });
  // The chalked want (events): the thing on the hatch counts double while
  // the chalk lasts — and his manner gives it away before any tally could.
  const wanted = events.wantMult(z, carried.itemId);
  const worth = t.barter * wanted;
  trade.paid = roundTender(trade.paid + worth);
  // His manner is the only appraisal anyone gets.
  let line: string;
  if (wanted > 1) {
    line = `The keeper's hand closes over ${t.name} almost before you set it down — the very thing the chalk asks for.`;
  } else if (worth >= RICH_TENDER) {
    line = `The keeper goes very still. Then ${t.name} is gone beneath the counter, and his manner warms considerably.`;
  } else if (worth >= 5) {
    line = `The keeper's eyebrows climb. He makes ${t.name} disappear.`;
  } else if (worth >= 2) {
    line = `The keeper weighs ${t.name} in his palm and nods.`;
  } else {
    line = `The keeper turns ${t.name} over and grunts.`;
  }
  const cost = cartCost(trade);
  if (trade.paid < cost) return `${line} (${trade.paid} of ${cost}.)`;
  // Square. Re-tally the counter honestly (something offered may have been
  // dropped or moved since), then the goods change hands for good.
  const boxes = new Map<string, CarriedItem[]>([["", session.items]]);
  for (const key of ["lockbox", "vault"] as const) {
    if (trade.escrow.some((e) => e.from === key)) {
      boxes.set(key, await loadContainer(z.env.DB, session.pubkey, key));
    }
  }
  const onCounter: { entry: { row: string; from: string }; item: CarriedItem }[] = [];
  for (const e of trade.escrow) {
    const item = (boxes.get(e.from) ?? []).find((c) => c.rowId === e.row);
    if (item) onCounter.push({ entry: e, item });
  }
  trade.escrow = onCounter.map((o) => o.entry);
  trade.paid = roundTender(onCounter.reduce(
    (sum, o) => sum + (world.itemTemplates.get(o.item.itemId)?.barter ?? 0) * events.wantMult(z, o.item.itemId), 0));
  if (trade.paid < cost) {
    return `${line} The keeper re-counts and shakes his head — the counter's short. (${trade.paid} of ${cost}.)`;
  }
  let cracked = false;
  for (const o of onCounter) {
    if (o.item.serial !== null) {
      await voidMint(z.env.DB, o.item.serial);
      cracked = true;
    }
    await removeItemRow(z.env.DB, o.item.rowId);
    if (o.entry.from === "") {
      const idx = session.items.findIndex((c) => c.rowId === o.item.rowId);
      if (idx !== -1) session.items.splice(idx, 1);
    }
  }
  // The counter clears; every want in the cart changes hands at once. A fresh
  // journal off the shelf gets its own blank book (id), so whatever this
  // wanderer writes in it is theirs to keep, lose, or bleed. The counter's
  // slots are free now, so the pack almost always has room; if it's somehow
  // still full, the piece lands at your feet at the gate rather than vanishing.
  // Paid-for goods come across the counter as NEW stock (rollShopCondition:
  // mostly pristine, at worst lightly worn, never battered — not the dungeon's
  // scavenged roll) and already bearing the gate's seal, minted on the spot —
  // you bought it, it's yours, the world can't peel it off your corpse. Only a
  // pack-full spill lands unsealed.
  const slid: string[] = [];
  const lastOnes: string[] = [];
  for (const w of trade.wants) {
    // Sometimes yours was the last one on the shelf — the market is finite,
    // and the next wanderer finds bare wood where this sat.
    if (inStock(z, w.itemId) && chance(FENCE_LAST_ONE_ODDS)) {
      z.fenceOut.set(w.itemId, Date.now() + randInt(FENCE_OUT_MIN_MS, FENCE_OUT_MAX_MS));
      const t = world.itemTemplates.get(w.itemId);
      if (t) lastOnes.push(t.name);
    }
    const bought = world.itemTemplates.get(w.itemId)!;
    const jid = bought.id === JOURNAL_ITEM ? "jrn-" + uuid() : undefined;
    const got = await z.grantItem(session, bought.id, { condition: rollShopCondition(bought.slot), journalId: jid });
    if (!got) {
      z.ground.set(session.roomId, [...(z.ground.get(session.roomId) ?? []), bought.id]);
      slid.push(`${bought.name}${z.itemStat(bought)} [${bought.rarity}] (pack full — at your feet, unsealed)`);
      continue;
    }
    // Gear comes sealed (you bought it, the world can't peel it off your corpse)
    // — but a fungible carries no title to seal (scrap iron, trophies, cigs). A
    // sealed scrap can't be spent at the forge or the vice, so leave it loose.
    if (z.stackable(got.itemId, got.serial, got.journalId)) {
      slid.push(`${bought.name}${z.itemStat(bought)} [${bought.rarity}]`);
      continue;
    }
    const serial = await sealOne(z, session, got);
    slid.push(`${bought.name}${z.itemStat(bought)} [${bought.rarity}] (sealed #${serial})`);
  }
  const change = trade.paid > cost ? " He gives no change." : "";
  const seals = cracked ? " He cracks the gate's seals without ceremony." : "";
  const goods = slid.length === 1
    ? `The keeper slides ${slid[0]} across the counter.`
    : `The keeper slides it all across the counter:\n  ${slid.join("\n  ")}`;
  session.buying = undefined;
  z.roomFeed(session.roomId, `${session.name} trades at the keeper's hatch.`, session.pubkey);
  const bare = lastOnes.length
    ? ` You took the last ${lastOnes.join(" and the last ")} he had; the shelf behind him stands bare.`
    : "";
  return `${line}${seals}\n${goods}${change} The keeper's wares carry the gate's mark already — sealed, and yours.${bare}`;
}

export async function cmdOffer(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const world = z.world!;
  const bar = fenceGuard(z, session);
  if (bar) return z.send(session, bar);
  const trade = session.buying;
  if (!trade) {
    return z.send(session, "You're not mid-trade. The keeper buys nothing outright — 'buy <thing>' first, then offer your goods against it.");
  }
  if (arg === "nothing" || arg === "stop" || arg === "cancel" || arg === "no") {
    session.buying = undefined;
    z.sendCtx(session);
    return z.send(session, "You wave the trade off. The keeper sweeps your goods back across the counter without a word.");
  }
  if (!arg) return z.send(session, `You've laid ${trade.paid} of ${cartCost(trade)} on the counter so far.`);
  // Search your keepings in order — pack, then lockbox, then vault — for the
  // first match not already on the counter, preferring an unsealed copy so the
  // trade never cracks a seal it doesn't need. Same reach as the modal's tabs.
  const pools: Array<["" | "lockbox" | "vault", CarriedItem[]]> = [
    ["", session.items],
    ["lockbox", await loadContainer(z.env.DB, session.pubkey, "lockbox")],
    ["vault", await loadContainer(z.env.DB, session.pubkey, "vault")],
  ];
  let carried: CarriedItem | null = null;
  let from: "" | "lockbox" | "vault" = "";
  let seenNamed = false;
  for (const [key, pool] of pools) {
    const matches = pool.filter((c) => {
      const t = world.itemTemplates.get(c.itemId);
      return !!t && nameMatches(t.name, arg);
    });
    if (matches.length) seenNamed = true;
    const free = matches.filter((c) => !trade.escrow.some((e) => e.row === c.rowId));
    if (free.length) {
      carried = free.find((c) => c.serial === null) ?? free[0];
      from = key;
      break;
    }
  }
  if (!carried) {
    return z.send(session, seenNamed ? "That's already on the counter." : "You carry nothing like that.");
  }
  z.send(session, await offerCore(z, session, carried, from));
  z.sendCtx(session);
}

// ---- the keeper's hatch as a modal: step out of the world and trade ----
// Same shape as the bench: opening it makes you `away` (untouchable, out of
// sight), and while it's open the gatehouse quiet closes your wounds too.

export async function handleTrade(z: ZoneDO, session: Session, frame: any): Promise<void> {
  const world = z.world!;
  const action = frame?.action;
  if (action === "open") {
    const lateral = z.outOfWorld(session); // the hatch is a fixture of the room you're standing in
    if (session.away && !lateral) return; // one step-out at a time (mid-dungeon crouch)
    const bar = fenceGuard(z, session);
    if (bar) return z.send(session, bar);
    if (!world.fenceStock.length) return z.send(session, "The hatch is shuttered, and stays that way.");
    if (lateral) {
      z.enterStep(session, "trading"); // swap stance; the gate outside hears nothing new
      return sendTrade(z, session);
    }
    session.away = true;
    session.trading = true;
    // Rest survives a trip to the hatch — healing pauses while stepped out, resumes on close.
    session.target = null;
    for (const c of z.creatures.values()) {
      if (c.target === session.pubkey) c.target = null;
    }
    z.roomFeed(session.roomId, `${session.name} steps up to the keeper's hatch.`, session.pubkey);
    z.refreshRoomCtx(session.roomId);
    return sendTrade(z, session);
  }
  if (!session.trading) return;
  if (action === "close") return leaveTrade(z, session);
  let note: string | undefined;
  if (action === "buy") {
    if (typeof frame.row === "string" && !inStock(z, frame.row)) {
      return sendTrade(z, session, "The keeper spreads his hands — fresh out of that. Come back later.");
    }
    const stock = world.fenceStock.find((s) => s.itemId === frame.row);
    note = stock ? startBuy(z, session, stock) : undefined;
  } else if (action === "offer") {
    if (!session.buying) {
      note = "Pick your want from the stock first.";
    } else {
      // The modal deals from any tab: pack, lockbox, or vault. Prefer an
      // unsealed copy — no point cracking a seal the trade doesn't need.
      const src = frame.src === "lockbox" || frame.src === "vault" ? frame.src : "";
      const pool = src === "" ? session.items : await loadContainer(z.env.DB, session.pubkey, src);
      const candidates = pool.filter(
        (c) => c.itemId === frame.row && !session.buying!.escrow.some((e) => e.row === c.rowId),
      );
      const carried = candidates.find((c) => c.serial === null) ?? candidates[0];
      note = carried ? await offerCore(z, session, carried, src) : "You've nothing more like that to offer.";
    }
  } else if (action === "unbuy") {
    // Take one thing back off the cart (by its position). If that empties the
    // cart, it's the same as waving the whole trade off.
    const cart = session.buying;
    const idx = Number(frame.row);
    if (cart && Number.isInteger(idx) && idx >= 0 && idx < cart.wants.length) {
      const [dropped] = cart.wants.splice(idx, 1);
      const dt = world.itemTemplates.get(dropped.itemId);
      if (!cart.wants.length) {
        session.buying = undefined;
        note = "You clear the counter. The keeper sweeps your goods back without a word.";
      } else {
        note = `You take ${dt?.name ?? "it"} back off the counter. (${cartCost(cart)} in trade now.)`;
      }
    }
  } else if (action === "cancel") {
    if (session.buying) {
      session.buying = undefined;
      note = "You wave the trade off. The keeper sweeps your goods back across the counter.";
    }
  } else return;
  return sendTrade(z, session, note);
}

export async function leaveTrade(z: ZoneDO, session: Session): Promise<void> {
  session.trading = false;
  session.buying = undefined; // an unfinished trade sweeps back with you
  try { session.ws.send(JSON.stringify({ v: 0, t: "trade", open: false })); } catch {}
  // The hatch IS the gatehouse wall — step back from it and you're still inside.
  if (z.world!.entryRooms.has(session.roomId)) {
    session.stepText = true;
    z.send(session, describeGatehouse(z, session));
    z.sendCtx(session);
    return;
  }
  session.away = false;
  z.roomFeed(session.roomId, `${session.name} steps back from the hatch.`, session.pubkey);
  z.send(session, z.enterDescribe(session));
  z.sendCtx(session);
  z.refreshRoomCtx(session.roomId);
}

export async function sendTrade(z: ZoneDO, session: Session, note?: string): Promise<void> {
  const world = z.world!;
  // Shelf sections so the stock reads like a shop, not a ledger: steel (it
  // hurts), kit (you wear it), physic (it mends), sundries (keys and papers).
  const kindOf = (t: { dmg: number; slot: string; edible: number; heal: number; staunch: number }): string =>
    t.dmg > 0 ? "steel"
      : t.slot !== "" ? "kit"
      : t.edible === 1 || t.heal > 0 || t.staunch > 0 ? "physic"
      : "sundries";
  const stock = [...world.fenceStock]
    .filter((s) => inStock(z, s.itemId)) // bare shelves don't show a buy button
    .sort((a, b) => a.cost - b.cost)
    .map((s) => {
      const t = world.itemTemplates.get(s.itemId);
      return t ? {
        id: s.itemId, name: t.name, rarity: t.rarity, cost: s.cost, kind: kindOf(t),
        stat: z.itemStat(t).replace(/^ \(|\)$/g, ""),
      } : null;
    })
    .filter((s) => s !== null);
  // Your side of the counter, one tab per keeping: pack, lockbox, vault.
  // What he'd take, collapsed by kind — never a value shown; his manner
  // when you offer is the only appraisal. Sealed goods trade too (he
  // cracks the seal when the deal closes), so the vault's wealth counts.
  const tally = (pool: CarriedItem[]) => {
    // Anchor each kind at its FIRST appearance in the pool (Map insertion order),
    // then count only the copies not yet on the counter. Escrowed copies still
    // register the kind's position, so laying one on the counter never reshuffles
    // the list — the row just decrements, and vanishes when its last copy is offered.
    const goods = new Map<string, { id: string; name: string; rarity: string; n: number }>();
    for (const c of pool) {
      const t = world.itemTemplates.get(c.itemId);
      if (!t || (t.barter ?? 0) <= 0) continue;
      let g = goods.get(t.id);
      if (!g) { g = { id: t.id, name: t.name, rarity: t.rarity, n: 0 }; goods.set(t.id, g); }
      if (!session.buying?.escrow.some((e) => e.row === c.rowId)) g.n += 1;
    }
    return [...goods.values()].filter((g) => g.n > 0);
  };
  const goods = {
    pack: tally(session.items),
    lockbox: tally(await loadContainer(z.env.DB, session.pubkey, "lockbox")),
    vault: tally(await loadContainer(z.env.DB, session.pubkey, "vault")),
  };
  // The cart: every want named, its running total, and what's paid so far.
  // `want` stays the payload key (the client reads it) but now carries a list.
  const buying = session.buying;
  const want = buying ? {
    items: buying.wants.map((w) => ({
      name: world.itemTemplates.get(w.itemId)?.name ?? w.itemId,
      rarity: world.itemTemplates.get(w.itemId)?.rarity ?? "common",
      cost: w.cost,
    })),
    cost: cartCost(buying),
    paid: buying.paid,
  } : null;
  const payload = {
    v: 0, t: "trade", open: true, note: note ?? "",
    stock, goods, want,
  };
  try { session.ws.send(JSON.stringify(payload)); } catch {}
}

// ---- the bench's vice: break gear to scrap (salvage), mend wear (repair) ----

// Break a piece of gear down in the bench vice. Shared by the typed command
// and the bench modal; returns the line to show either way.
export async function salvageCore(z: ZoneDO, session: Session, carried: CarriedItem): Promise<string> {
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  if (tmpl.id === "loose-rock" || tmpl.id === "hammerstone") return "It's a rock.";
  if (tmpl.slot === "") return `There's no salvage in ${tmpl.name}.`;
  // The vice cracks the seal itself now (rome: sealed gear gets every option an
  // unsealed piece has). The mint is voided honestly as the steel goes in — the
  // same release as a drop or a trade, just on the way to scrap.
  const wasSealed = carried.serial !== null;
  if (carried.serial !== null) {
    await voidMint(z.env.DB, carried.serial);
    carried.serial = null;
  }
  if (carried.equipped) {
    carried.equipped = false;
    await setEquipped(z.env.DB, carried.rowId, false);
  }
  const yieldN = SALVAGE_YIELD[tmpl.rarity] ?? 1;
  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  for (let i = 0; i < yieldN; i++) {
    const id = uuid();
    await insertLoot(z.env.DB, id, session.pubkey, SCRAP_ID, null);
    session.items.push({ rowId: id, itemId: SCRAP_ID, serial: null, equipped: false, condition: 100 });
  }
  return `You crank ${tmpl.name} into the vice and break it down.${wasSealed ? " The gate's seal cracks as it goes in." : ""} ${yieldN === 1 ? "A handful" : yieldN + " handfuls"} of scrap iron for the pile.`;
}

export async function cmdSalvage(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const bar = z.benchGuard(session, "bench work");
  if (bar) return z.send(session, bar);
  if (!arg) return z.send(session, "Salvage what? The vice takes gear and gives scrap iron.");
  const carried = z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  const line = await salvageCore(z, session, carried);
  z.send(session, line);
  z.roomFeed(session.roomId, `${session.name} works the bench vice, breaking steel.`, session.pubkey);
  z.sendCtx(session);
}

// Mend a worn piece with scrap iron. Shared with the bench modal.
export async function repairCore(z: ZoneDO, session: Session, carried: CarriedItem): Promise<string> {
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  // The lantern is the one slotless mend (rome, 2026-07-11): its wear isn't
  // dents, it's spent oil and burnt wick — the forge refills it. Everything
  // else slotless has nothing to mend. (A lantern burnt to NOTHING is gone —
  // the last burn takes it apart; you maintain it, or you lose it.)
  const lantern = carried.itemId === LANTERN_ITEM;
  // The stone is the anti-lantern: it wears like gear and NOTHING mends it
  // (rome, 2026-07-11) — every latch it beats open is spent for good.
  if (THROW_TOUGH.has(carried.itemId)) return "The vice has no answer for stone. What it's spent, it's spent.";
  if (tmpl.slot === "" && !lantern) return `There's nothing to mend in ${tmpl.name}.`;
  // Sealed gear wears now (slowly) — so it can be mended now too. The seal is
  // title, not condition: hammering the wear out doesn't touch the serial.
  if (carried.condition >= 100) return lantern
    ? "The well is full and the wick is fresh — this lantern wants nothing."
    : `${cap(tmpl.name)} is sound already.`;
  const cost = REPAIR_COST[tmpl.rarity] ?? 1;
  // The vice reaches the pack AND the gate's keeping (lockbox + vault), same as
  // the forge — and scrap counts whether or not a stray seal is on it.
  const have = z.countLooseIn(await z.gatePools(session), SCRAP_ID);
  if (have < cost) return `The mend wants ${cost} scrap iron; you have ${have} between pack and keeping.`;
  await z.takeLooseAcross(session, SCRAP_ID, cost);
  carried.condition = 100;
  await setItemCondition(z.env.DB, carried.rowId, 100);
  return lantern
    ? "You trim a fresh wick, fill the oil-well, and rub the horn pane clear. Five good burns in it again."
    : `You hammer the wear out of ${tmpl.name} and file it true. Sound again.`;
}

export async function cmdRepair(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const bar = z.benchGuard(session, "bench work");
  if (bar) return z.send(session, bar);
  if (!arg) return z.send(session, "Repair what?");
  const carried = z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  z.send(session, await repairCore(z, session, carried));
  z.sendCtx(session);
}

  // ---- extraction: the gate seals claims; the lockbox and vault keep them ----

  // The moment of relief: what you carried out, the dungeon marks as yours.
  // Sealed loot survives anything the dungeon does to you. (What another
  // wanderer does to you is not the dungeon's promise to keep.)
export async function cmdClaim(z: ZoneDO, session: Session, arg: string): Promise<void> {
    const world = z.world!;
    if (!world.entryRooms.has(session.roomId)) {
      return z.send(session, "The dungeon seals claims only at a gate — where you could still walk away.");
    }
    let toSeal: CarriedItem[];
    if (!arg || arg === "all" || arg === "everything") {
      // Seal all gear-and-valuables; trophies and the like carry no title.
      toSeal = session.items.filter((c) => c.serial === null && !z.stackable(c.itemId, c.serial, c.journalId));
      if (toSeal.length === 0) return z.send(session, "You carry nothing the gate can seal.");
    } else {
      const carried = z.findCarried(session, arg);
      if (!carried) return z.send(session, "You carry nothing like that.");
      if (carried.serial !== null) {
        return z.send(session, `The seal is already on it. (mint #${carried.serial})`);
      }
      if (z.stackable(carried.itemId, carried.serial, carried.journalId)) {
        return z.send(session, "Trophies and the like carry no title — the gate's lockbox keeps them, no seal needed.");
      }
      toSeal = [carried];
    }

    const lines: string[] = [];
    for (const carried of toSeal) {
      const tmpl = world.itemTemplates.get(carried.itemId)!;
      const serial = await sealOne(z, session, carried);
      lines.push(`The gate's cold iron takes the measure of ${tmpl.name} — sealed. (mint #${serial})`);
    }
    lines.push("Sealed is TITLE, not armor: carried, it dies with you. Only the gate\u2019s lockbox and vault keep what death cannot.");
    z.send(session, lines.join("\n"));
    z.roomFeed(session.roomId, `${session.name} presses a claim at the gate. Iron hums.`, session.pubkey);
    z.sendCtx(session);
  }

  // Seal one carried item in place: mint its serial, sign the loot cert if the
  // game key is configured, and freeze its condition. Shared by `claim` and the
  // gatehouse bench. Returns the mint serial.
export async function sealOne(z: ZoneDO, session: Session, carried: CarriedItem): Promise<number> {
    const world = z.world!;
    const tmpl = world.itemTemplates.get(carried.itemId)!;
    const serial = await mintClaim(z.env.DB, carried.rowId, carried.itemId, tmpl.rarity, session.pubkey);
    carried.serial = serial;
    // THE ENGRAVING (077): the first sealing cuts the gate's mark into the
    // steel, and a deeds-ledger opens against it. Serials are title and crack
    // at every transfer; the mark endures — so when a MARKED piece is sealed
    // again by a new hand, the chain of owners grows. Only gear takes a mark.
    if (z.isGear(carried.itemId)) {
      if (!carried.loreId) {
        carried.loreId = uuid();
        await setItemLoreId(z.env.DB, carried.rowId, carried.loreId);
        await deedsCreate(z.env.DB, carried.loreId, carried.itemId, session.pubkey);
      } else {
        await deedsOwner(z.env.DB, carried.loreId, session.pubkey);
      }
    }
    // Snapshot its condition at the moment of sealing. Sealing no longer freezes
    // wear whole — sealed gear still ages, just far slower (SEALED_WEAR_MULT) —
    // and can be mended at the bench like anything else.
    if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
    if (isGameKeyConfigured(z.env)) {
      const ev = signLootEvent(z.env, {
        pubkey: session.pubkey,
        lootId: carried.rowId,
        itemId: carried.itemId,
        name: tmpl.name,
        rarity: tmpl.rarity,
        zone: world.zone,
        serial,
      });
      await setMintEvent(z.env.DB, serial, ev.id);
    }
    return serial;
  }

  // ---- the gatehouse bench: sort your pack out of the world's reach ----
  // You step out of sight (untouchable — no one and nothing can reach you),
  // and your pack, lockbox, and vault lie open together. One modal, all the
  // keeping, no clicking things one at a time under threat of a knife.

export async function handleBench(z: ZoneDO, session: Session, frame: any): Promise<void> {
    const world = z.world!;
    const action = frame?.action;
    const atGate = world.entryRooms.has(session.roomId);
    if (action === "open") {
      // In the gatehouse the bench is RIGHT THERE — opening it is a lateral move,
      // never "already stepped out". Only a mid-dungeon crouch blocks a second one.
      if (session.away && !z.outOfWorld(session)) return;
      if (z.inCombat(session)) {
        return z.send(session, "Not while something is trying to kill you.");
      }
      // The lockbox opens anywhere (you duck aside to sort your run closet); the
      // vault and the seal are the gate's business, shown only when you're at one.
      if (z.outOfWorld(session)) z.enterStep(session, "sorting"); // lateral: swap stance, announce nothing
      else enterBench(z, session);
      return sendBench(z, session);
    }
    if (!session.away) return; // every other action needs the bench already open
    if (action === "close") return leaveBench(z, session);

    // A stack action arrives as ALL its rows in ONE frame. The client used to
    // fan a message per row, and those handlers interleaved at the D1 awaits
    // (loadContainer/setContainer aren't under the DO's storage input gate) — so
    // a mid-move sendBench could land a stale count on screen: rome's "weird
    // amount" drawing a stack out of the vault (2026-07-14). Now the whole pile
    // moves in THIS one handler, and we render ONCE at the end, from settled
    // state. (Legacy single-row `frame.row` still accepted, for safety.)
    const rows = Array.isArray(frame.rows)
      ? frame.rows.filter((r: unknown): r is string => typeof r === "string")
      : (typeof frame.row === "string" && frame.row ? [frame.row] : []);
    const KNOWN = new Set(["stash", "vault", "seal", "take", "equip", "remove", "burn", "drop", "salvage", "repair"]);
    if (!KNOWN.has(action) || !rows.length) return;
    const gateOnly = "That's the gatehouse's work — reach a gate for the vault and the seal.";
    const one = async (row: string): Promise<string | undefined> => {
      if (action === "stash") return benchStore(z, session, row, "lockbox");
      if (action === "vault") return atGate ? benchStore(z, session, row, "vault") : gateOnly;
      if (action === "seal") return atGate ? benchSeal(z, session, row) : gateOnly;
      if (action === "take") return benchTake(z, session, row);
      if (action === "equip") return benchEquip(z, session, row);
      if (action === "remove") return benchRemove(z, session, row);
      if (action === "burn") return benchBurn(z, session, row);
      if (action === "drop") return benchDrop(z, session, row);
      if (action === "salvage") return atGate ? benchSalvage(z, session, row) : gateOnly;
      return atGate ? benchRepair(z, session, row) : gateOnly; // "repair"
    };
    // The first thing to SAY wins the note (the pack-full stop, most often); the
    // successful moves are silent — the settled counts are the confirmation.
    let note: string | undefined;
    for (const row of rows) {
      const n = await one(row);
      if (n !== undefined && note === undefined) note = n;
    }
    return sendBench(z, session, note);
  }

  // Manage what you're wearing/wielding, right from the bench (always safe here,
  // so none of combat's armor/opening rules apply).
export async function benchEquip(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row);
    if (!carried) return "You aren't carrying that.";
    const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
    if (tmpl.slot === "") return `You can't wear or wield ${tmpl.name}.`;
    if (carried.equipped) return undefined;
    const current = z.equippedItem(session, tmpl.slot);
    if (current) {
      current.carried.equipped = false;
      await setEquipped(z.env.DB, current.carried.rowId, false);
    }
    carried.equipped = true;
    await setEquipped(z.env.DB, carried.rowId, true);
    return undefined;
  }

export async function benchRemove(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row);
    if (!carried) return "You aren't carrying that.";
    if (!carried.equipped) return undefined;
    carried.equipped = false;
    await setEquipped(z.env.DB, carried.rowId, false);
    return undefined;
  }

  // The vice and the hammer, from the modal. Pack items only (the box and the
  // vault hand things back to the pack first); the cores do the real checks.
export async function benchSalvage(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row);
    if (!carried) return "You aren't carrying that.";
    return salvageCore(z, session, carried);
  }

export async function benchRepair(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row);
    if (!carried) return "You aren't carrying that.";
    return repairCore(z, session, carried);
  }

  // Burn an unwanted thing — from pack, lockbox, or vault — gone for good. A
  // sealed thing's mint is voided as it burns (supply shrinks by one, honestly).
export async function benchBurn(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
    const inPack = session.items.find((c) => c.rowId === row);
    let carried = inPack;
    if (!carried) {
      for (const key of ["lockbox", "vault"] as const) {
        const held = await loadContainer(z.env.DB, session.pubkey, key);
        const found = held.find((c) => c.rowId === row);
        if (found) { carried = found; break; }
      }
    }
    if (!carried) return "There's nothing like that to burn.";
    const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
    await removeItemRow(z.env.DB, carried.rowId);
    if (carried.serial !== null) await voidMint(z.env.DB, carried.serial);
    if (inPack) session.items.splice(session.items.indexOf(inPack), 1);
    return `You burn ${tmpl.name}. Nothing of it is left.`;
  }

  // Set ONE exact item on the floor from the inventory. Targets the rowId, so it
  // is never the "dropped both" ambiguity of a name — only a pack item drops
  // (you'd take a boxed thing out first), and the shared dropCarried does the
  // rest (seal cracks, wear and lore ride the floor, the room hears it).
export async function benchDrop(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
    const carried = session.items.find((c) => c.rowId === row && !c.equipped);
    if (!carried) return "That isn't loose in your pack to drop.";
    const msg = await dropCarried(z, session, carried);
    await z.persist();
    return msg;
  }

export function enterBench(z: ZoneDO, session: Session): void {
    session.away = true;
    // Rest survives opening the bench/keeping (inventory) — healing pauses while
    // stepped out, resumes on close.
    session.target = null;
    if (z.world!.entryRooms.has(session.roomId)) {
      // At a gate you step clean out of the world: nothing holds you, nothing sees you.
      for (const c of z.creatures.values()) {
        if (c.target === session.pubkey) c.target = null;
      }
      z.roomFeed(session.roomId, `${session.name} steps into the gatehouse, out of sight.`, session.pubkey);
    } else {
      // In the dungeon the lockbox rides with you, but you don't leave with it —
      // you crouch to sort it in the open, still in the world and in reach.
      z.roomFeed(session.roomId, `${session.name} crouches to dig through a lockbox.`, session.pubkey);
    }
    z.refreshRoomCtx(session.roomId);
  }

export async function leaveBench(z: ZoneDO, session: Session): Promise<void> {
    // AT A GATE the bench stands INSIDE the gatehouse — so closing it puts your
    // head up in that room, among whoever else is by the fire. It does not throw
    // you out the door; only 'out' does that. (Mid-dungeon there is no room to
    // come up into: closing the lockbox is straightening up in the open, exactly
    // as before, and the world is right there waiting.)
    if (z.world!.entryRooms.has(session.roomId)) {
      session.sorting = false;
      session.stepText = true; // still inside, still in text — the tavern has you
      try { session.ws.send(JSON.stringify({ v: 0, t: "bench", open: false })); } catch {}
      z.send(session, describeGatehouse(z, session));
      z.sendCtx(session);
      return;
    }
    session.away = false;
    try { session.ws.send(JSON.stringify({ v: 0, t: "bench", open: false })); } catch {}
    z.roomFeed(session.roomId, `${session.name} steps back out, kit sorted.`, session.pubkey);
    await provokeGrudges(z, session, false); // gates hold nothing; no free hit for closing the bench
    // You crouched in the open and stood up again — you never LEFT the room, so
    // don't re-print it (it buries a conversation you were in the middle of).
    // A quiet line to close the modal's own thread; the room is where it was.
    z.send(session, "You straighten up, your kit sorted.");
    z.sendCtx(session);
    z.refreshRoomCtx(session.roomId);
  }

export async function benchStore(z: ZoneDO, session: Session, row: string, key: "lockbox" | "vault"): Promise<string | undefined> {
    const cfg = storeCfg(z, key);
    // The item may be in the pack, or in the OTHER store (moving straight from
    // the lockbox into the vault, no round-trip through the pack).
    let carried = session.items.find((c) => c.rowId === row);
    let fromContainer: "" | "lockbox" | "vault" = "";
    if (!carried) {
      for (const src of ["lockbox", "vault"] as const) {
        if (src === cfg.container) continue;
        const held = await loadContainer(z.env.DB, session.pubkey, src);
        const found = held.find((c) => c.rowId === row);
        if (found) { carried = found; fromContainer = src; break; }
      }
    }
    if (!carried) return "You aren't carrying that.";
    // The vault banks sealed wealth — and raw fungibles, which carry no title
    // to seal in the first place. It's unsealed GEAR the vault turns away.
    if (cfg.sealedOnly && carried.serial === null && !z.stackable(carried.itemId, carried.serial, carried.journalId)) return cfg.needSeal;
    const held = await loadContainer(z.env.DB, session.pubkey, cfg.container);
    if (!z.hasRoom(held, carried.itemId, cfg.cap, cfg.container as "lockbox" | "vault")) return cfg.full;
    if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
    if (fromContainer === "") { // came off the body
      carried.equipped = false;
      session.items.splice(session.items.indexOf(carried), 1);
    }
    await setContainer(z.env.DB, carried.rowId, cfg.container);
    return undefined;
  }

export async function benchTake(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
    const atGate = z.world!.entryRooms.has(session.roomId);
    for (const key of ["lockbox", "vault"] as const) {
      const held = await loadContainer(z.env.DB, session.pubkey, key);
      const entry = held.find((c) => c.rowId === row);
      if (entry) {
        if (key === "vault" && !atGate) return "The vault's door opens only at a gate.";
        if (z.foodCapped(session, entry.itemId)) return z.foodFullNote();
        if (!z.packRoom(session, entry.itemId)) return `Your pack is full (${PACK_CAP} slots).`;
        await setContainer(z.env.DB, entry.rowId, "");
        session.items.push(entry);
        return undefined;
      }
    }
    return "It isn't in the box or the vault.";
  }

export async function benchSeal(z: ZoneDO, session: Session, row: string): Promise<string | undefined> {
    // Seal what's on the body, or seal a piece resting in the lockbox in place —
    // the gate's iron reaches into the box. (Vault gear is already sealed.)
    let carried = session.items.find((c) => c.rowId === row);
    if (!carried) {
      const box = await loadContainer(z.env.DB, session.pubkey, "lockbox");
      carried = box.find((c) => c.rowId === row);
    }
    if (!carried) return "You aren't carrying that.";
    if (carried.serial !== null) return "The seal is already on it.";
    if (z.stackable(carried.itemId, carried.serial, carried.journalId)) {
      return "Trophies and the like carry no title — the gate's lockbox keeps them, no seal needed.";
    }
    await sealOne(z, session, carried);
    return undefined;
  }

export async function sendBench(z: ZoneDO, session: Session, note?: string): Promise<void> {
    const world = z.world!;
    const lockbox = await loadContainer(z.env.DB, session.pubkey, "lockbox");
    const vault = await loadContainer(z.env.DB, session.pubkey, "vault");
    const ser = (c: CarriedItem) => {
      const t = world.itemTemplates.get(c.itemId);
      const gear = z.isGear(c.itemId);
      return {
        row: c.rowId,
        name: t ? t.name : c.itemId,
        rarity: t?.rarity ?? "common",
        slot: t?.slot ?? "",
        sealed: c.serial !== null,
        serial: c.serial,
        stack: z.stackable(c.itemId, c.serial, c.journalId),
        trophy: z.isTrophy(c.itemId), // cut off a body — not food, not a key, not tender
        key: z.isKey(c.itemId),       // opens something: a cache's key, or the heart
        gear,
        // What the bench can actually mend: the stone wears like gear but
        // nothing refills it (rome) — no repair button to bait a refusal.
        fix: gear && !THROW_TOUGH.has(c.itemId),
        equipped: !!c.equipped,
        cond: gear ? c.condition : null,
        condWord: gear ? (z.conditionWord(c.condition) || "sound") : "",
        // The heart rots on the shelf like it rots in your hand — the vault is
        // cold storage for steel, not for meat. A banked heart reads as the
        // slime it is, instead of pretending to still be a key (rome, 2026-07-13).
        heart: c.itemId === DEEP_HEART ? heartWord(c.acquiredAt) : "",
        stat: z.itemStat(t).replace(/^ \(|\)$/g, ""),
      };
    };
    // Fungibles collapse to one entry with a count and the full list of rows —
    // the client shows "×N" and fans a stack action out over every row. The
    // grouped length IS the slot count (one per stack, one per loose item).
    const group = (items: CarriedItem[]) => {
      const out: any[] = [];
      const at = new Map<string, number>();
      for (const c of items) {
        if (z.stackable(c.itemId, c.serial, c.journalId) && at.has(c.itemId)) {
          const e = out[at.get(c.itemId)!]; e.n++; e.rows.push(c.rowId); continue;
        }
        const e = ser(c) as any; e.n = 1; e.rows = [c.rowId];
        if (z.stackable(c.itemId, c.serial, c.journalId)) at.set(c.itemId, out.length);
        out.push(e);
      }
      return out;
    };
    const payload = {
      v: 0, t: "bench", open: true, note: note ?? "",
      sheet: z.sheetFor(session), // the paperdoll: gear worn + the combat math it adds up to
      atGate: world.entryRooms.has(session.roomId), // vault + seal only shown at a gate
      pack: group(session.items),
      lockbox: group(lockbox),
      vault: group(vault),
      packCap: PACK_CAP, lockboxCap: LOCKBOX_CAP, vaultCap: VAULT_CAP,
      // Slot accounting is the SERVER's now, for every column: food rides free in
      // the pack, costs a slot each in the lockbox, and rides free in the vault —
      // none of which the client can get by counting rows. It just shows these.
      packUsed: z.slotsUsed(session.items, "pack"),
      lockboxUsed: z.slotsUsed(lockbox, "lockbox"),
      vaultUsed: z.slotsUsed(vault, "vault"),
      // The pack's food is a COUNT cap of its own, sitting apart from the slots.
      packFood: z.packFood(session), packFoodCap: PACK_FOOD_CAP,
    };
    try { session.ws.send(JSON.stringify(payload)); } catch {}
  }

  // Two tiers of keeping, one engine. The lockbox is the run closet (8 slots,
  // takes anything, sealed or raw); the vault is the bank (50 slots, sealed
  // gear plus raw fungibles — everything but unsealed gear). Both live at the
  // gate, both are beyond death's reach.
export function storeCfg(z: ZoneDO, key: "lockbox" | "vault") {
    if (key === "vault") {
      return {
        container: "vault", cap: VAULT_CAP, sealedOnly: true, kind: "vault", freeStacks: true,
        absent: "The vault's riveted door is set deep in the gatehouse. It is not here.",
        empty: "The vault stands open around nothing.",
        header: "The vault holds",
        full: `The vault is full. It holds ${VAULT_CAP} sealed things, and asks no more. (Trophies and the like cost it nothing.)`,
        needSeal: "The vault won't bank raw gear — seal it at the gate first, or drop it in your lockbox.",
        put: (n: string) => `You lay ${n} in the vault. The iron door swings shut over it.`,
        feed: "swings the vault door, and seals it again.",
        takeEmpty: "Draw what out? ('vault' alone shows what it holds.)",
        holdsNot: "The vault holds nothing like that.",
        take: (n: string) => `You draw ${n} from the vault. It rides with you now — and so do its risks.`,
      };
    }
    return {
      container: "lockbox", cap: LOCKBOX_CAP, sealedOnly: false, kind: "lockbox", freeStacks: false,
      absent: "Your lockbox is set into the gatehouse wall. It is not here.",
      empty: "Your lockbox is bolted shut around nothing.",
      header: "Your lockbox holds",
      full: `Your lockbox is full. It holds ${LOCKBOX_CAP} things and holds them well. (The vault takes more, if it's sealed.)`,
      needSeal: "",
      put: (n: string) => `You drop ${n} in the iron box, and it clicks shut. Whatever happens to you, this is beyond it.`,
      feed: "opens an iron lockbox, and closes it.",
      takeEmpty: "Take what out? ('stash' alone shows the box.)",
      holdsNot: "The box holds nothing like that.",
      take: (n: string) => `You take ${n} back from the box. It rides with you now — and so do its risks.`,
    };
  }

export async function cmdStore(z: ZoneDO, session: Session, arg: string, key: "lockbox" | "vault"): Promise<void> {
    const world = z.world!;
    const cfg = storeCfg(z, key);
    // The lockbox rides with you — reach it anywhere. The vault is the bank, bolted
    // into the gatehouse; you can only deposit there at a gate.
    if (key === "vault" && !world.entryRooms.has(session.roomId)) return z.send(session, cfg.absent);
    const held = await loadContainer(z.env.DB, session.pubkey, cfg.container);
    if (!arg) {
      if (held.length === 0) return z.send(session, cfg.empty);
      // Match the bench modal: fungibles collapse to one line with a count, and
      // the header counts SLOTS (what the cap is actually measured in), not rows.
      const lines = [`${cfg.header} (${z.slotsUsed(held, cfg.container as "lockbox" | "vault")}/${cfg.cap}):`];
      const counts = new Map<string, number>();
      for (const c of held) {
        if (z.stackable(c.itemId, c.serial, c.journalId)) counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + 1);
      }
      const stackLines: string[] = [];
      const trophyLines: string[] = [];
      const keyLines: string[] = [];
      for (const [id, n] of counts) {
        const t = world.itemTemplates.get(id);
        const line = `  ${t ? t.name : id}${n > 1 ? ` (x${n})` : ""}${z.itemStat(t)}`;
        (z.isKey(id) ? keyLines : z.isTrophy(id) ? trophyLines : stackLines).push(line);
      }
      const gearLines: string[] = [];
      for (const c of held) {
        if (z.stackable(c.itemId, c.serial, c.journalId)) continue; // stacked above
        const t = world.itemTemplates.get(c.itemId);
        // Sealed gear wears now (slower) — show the seal AND the wear together.
        const bits: string[] = [];
        if (c.serial !== null) bits.push(`sealed #${c.serial}`);
        if (t && t.slot !== "") bits.push(z.conditionWord(c.condition) || "sound");
        const tag = bits.length ? ` — ${bits.join(", ")}` : "";
        gearLines.push(`  ${t ? t.name : c.itemId}${z.itemStat(t)}${tag}`);
      }
      // In the vault the trophies settle to the BOTTOM (they cost it no slot);
      // everything else — sealed gear, food, keys, tender — reads first.
      if (cfg.freeStacks) {
        lines.push(...gearLines, ...stackLines);
        if (keyLines.length) lines.push("  — keys —", ...keyLines);
        if (trophyLines.length) lines.push("  — trophies —", ...trophyLines);
      } else {
        lines.push(...stackLines, ...keyLines, ...trophyLines, ...gearLines);
      }
      return z.send(session, lines.join("\n"));
    }
    // Bank/stash from the pack — or, for the vault, name a sealed thing resting
    // in the lockbox and send it straight in, no round-trip through the pack
    // (parity with the bench modal's lockbox → vault shortcut; gate-gated above).
    let carried = z.findCarried(session, arg);
    let fromContainer = false;
    if (!carried && key === "vault") {
      const box = await loadContainer(z.env.DB, session.pubkey, "lockbox");
      const found = box.find((c) => {
        const t = world.itemTemplates.get(c.itemId);
        return t ? nameMatches(t.name, arg) : false;
      });
      if (found) { carried = found; fromContainer = true; }
    }
    if (!carried) return z.send(session, "You carry nothing like that.");
    // Sealed wealth or raw fungibles bank in the vault; only unsealed gear is turned away.
    if (cfg.sealedOnly && carried.serial === null && !z.stackable(carried.itemId, carried.serial, carried.journalId)) return z.send(session, cfg.needSeal);
    if (!z.hasRoom(held, carried.itemId, cfg.cap, cfg.container as "lockbox" | "vault")) return z.send(session, cfg.full);
    const tmpl = world.itemTemplates.get(carried.itemId)!;
    // Flush its worn condition before it leaves the body, so the box/vault
    // holds the true value; setContainer clears the equipped flag.
    if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
    if (!fromContainer) { // came off the body/pack; a lockbox row just changes containers
      carried.equipped = false;
      session.items.splice(session.items.indexOf(carried), 1);
    }
    await setContainer(z.env.DB, carried.rowId, cfg.container);
    z.send(session, cfg.put(tmpl.name));
    z.roomFeed(session.roomId, `${session.name} ${cfg.feed}`, session.pubkey);
    z.sendCtx(session);
  }

export async function cmdRetrieve(z: ZoneDO, session: Session, arg: string, key: "lockbox" | "vault"): Promise<void> {
    const world = z.world!;
    const cfg = storeCfg(z, key);
    if (key === "vault" && !world.entryRooms.has(session.roomId)) return z.send(session, cfg.absent);
    const held = await loadContainer(z.env.DB, session.pubkey, cfg.container);
    if (held.length === 0) return z.send(session, cfg.empty);
    if (!arg) return z.send(session, cfg.takeEmpty);
    const entry = held.find((c) => {
      const t = world.itemTemplates.get(c.itemId);
      return t ? nameMatches(t.name, arg) : false;
    });
    if (!entry) return z.send(session, cfg.holdsNot);
    const tmpl = world.itemTemplates.get(entry.itemId)!;
    if (z.foodCapped(session, entry.itemId)) return z.send(session, z.foodFullNote());
    if (!z.packRoom(session, entry.itemId)) return z.send(session, `Your pack is full (${PACK_CAP} slots). Make room first.`);
    await setContainer(z.env.DB, entry.rowId, "");
    session.items.push(entry);
    z.send(session, cfg.take(tmpl.name));
    z.sendCtx(session);
  }
// ============================================================================
// THE GATEHOUSE — the sanctuary behind the door
// ============================================================================
// Four doors, one fire. Whichever gate you came in by, `in` puts you in the
// SAME room: the keeper is one man and it is his house. Everyone who steps out
// of the dungeon lands next to everyone else who did.
//
// In here you are out of the world (no creature paths in, no blade reaches you)
// but you are PRESENT — the room names who's in it, and the input line is a
// mouth. Known verbs still command; anything else you type is simply spoken.
//
// And it never touches the wire: gatehouse talk is broadcast over the live
// sockets and nowhere else. No D1 row, no Nostr event, no relay. What's said
// behind the door stays behind the door.

// Everyone standing in the gatehouse, whichever door they used.
export function gatehouseFolk(z: ZoneDO): Session[] {
  return [...z.sessions.values()].filter((s) => z.outOfWorld(s));
}

// The tavern's only channel. In memory, over the sockets, gone when it's said.
export function gatehouseFeed(z: ZoneDO, text: string, exceptPubkey?: string, cls?: string): void {
  for (const s of gatehouseFolk(z)) {
    if (s.pubkey === exceptPubkey) continue;
    z.send(s, text, cls);
  }
}

export function gatehouseSay(z: ZoneDO, session: Session, raw: string): void {
  const msg = raw.trim().slice(0, 240);
  if (!msg) return;
  const line = `${session.name} says, "${msg}"`;
  z.send(session, `You say, "${msg}"`, "say");
  gatehouseFeed(z, line, session.pubkey, "say");
  // The room hears it over the sockets, instantly. Nostr hears it FROM THE
  // SPEAKER: z.speechOut hands the line back to their own client, which signs
  // kind 24914 with their own key and publishes it. Same law as `say` out in
  // the dark — the gate's key never speaks for a wanderer.
  z.speechOut(session, line, "nomad-gatehouse");
}

export function describeGatehouse(z: ZoneDO, session: Session): string {
  const others = gatehouseFolk(z).filter((s) => s.pubkey !== session.pubkey);
  // Titled exactly as the status bar names it, so the client's knownRooms map
  // recognises it and paints it gold like any other room. It IS a room.
  const lines = [
    "The Gatehouse",
    "A low room behind the gate, warm and close. The keeper's hatch is shut in the far wall; a bench runs under it, and the brazier keeps its coals. The dungeon is on the other side of a very old door, and it stays there.",
  ];
  // The wall chart, plastered by the door: the players' own map, in whatever
  // state they've left it. The line grows with the wall.
  const marks = [...z.wallMarks].filter((r) => z.world!.rooms.has(r)).length;
  lines.push(marks === 0
    ? "By the door, a stretch of wall has been plastered smooth and scratched with an empty frame — a chart waiting for a first hand."
    : `By the door, a wall chart scratched by many hands maps ${marks} of the shallow halls. ('study' it; 'carve' to add what you've walked)`);
  if (others.length === 0) {
    lines.push("You have it to yourself. The fire ticks.");
  } else {
    const names = others.map((s) => s.name + (s.resting ? " (dozing)" : ""));
    lines.push(names.length === 1
      ? `${names[0]} is here.`
      : `Here: ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}.`);
  }
  lines.push("(Anything you type in here is spoken aloud. 'out' returns you to the world.)");
  return lines.join("\n");
}

// In through the door. Idempotent; gate-only.
export function enterGatehouse(z: ZoneDO, session: Session): void {
  if (!z.world!.entryRooms.has(session.roomId)) {
    return z.send(session, "There's no door here. The gatehouse waits at a gate.");
  }
  // THE DOOR IS NOT AN ESCAPE HATCH. Every other way out of the world refuses
  // mid-fight (benchGuard), and this must too. Nothing in the dungeon can reach a
  // gate room — so the only blade that can be out here is another wanderer's, and
  // without this a man losing a duel walks through the door and keeps everything
  // he's carrying. You cannot leave a fight by leaving the world.
  if (z.inCombat(session)) {
    return z.send(session, "The door won't take you — not with steel out. Finish it, or run.");
  }
  if (z.outOfWorld(session)) return z.send(session, describeGatehouse(z, session));
  z.enterStep(session, "gatehouse");
  z.sendStatus(session); // the HUD title becomes "The Gatehouse" the moment you're inside
  z.send(session, describeGatehouse(z, session));
  gatehouseFeed(z, `${session.name} pushes in out of the cold.`, session.pubkey, "who");
}

// The router: every frame typed by someone standing in the gatehouse. Known
// verbs command; the dungeon-facing ones are refused (the dungeon is outside);
// EVERYTHING ELSE IS SPEECH. That last line is the tavern.
export async function handleGatehouse(z: ZoneDO, session: Session, text: string): Promise<void> {
  const cmd = parse(text);
  // Not a verb we know? Then it wasn't meant as one. Say it.
  if (!cmd || "miss" in cmd) return gatehouseSay(z, session, text);
  const v = cmd.verb;
  if (v === "say") return gatehouseSay(z, session, cmd.arg);
  // A no-argument command carrying trailing words was a SENTENCE, not a command:
  // "i am trying to quit" is speech, not inventory; "who knows" is speech, not
  // the roster. Bare, they still command. This is the whole fix for a chat line's
  // first word (i / in / out / look / who / rest…) hijacking the message.
  if (GATEHOUSE_NOARG.has(v) && cmd.arg.trim() !== "") return gatehouseSay(z, session, text);
  if (v === "enter") return z.send(session, "You're already inside.");
  if (v === "look") return z.send(session, describeGatehouse(z, session));
  if (v === "who") { // who's by the fire, not who's in the dungeon
    const folk = gatehouseFolk(z);
    return z.send(session, folk.length === 1
      ? "You're the only one by the fire."
      : `By the fire: ${folk.map((s) => s.name).join(", ")}.`);
  }
  // The wall chart: in here, carving means the wall, and studying means the wall.
  // (Out in the dark, carve still scratches a room and study still reads corpses.)
  if (v === "carve") return wallCarve(z, session);
  if (v === "study") return wallStudy(z, session);
  if (GATEHOUSE_BARRED.has(v)) {
    return z.send(session, "Not from in here — the dungeon is on the other side of that door. ('out' to step back into it.)");
  }
  await z.dispatch(session, cmd); // bench, vault, forge, hatch, kit, keys, the lot
}

// A breath of the room, for people who sit a while. Same cadence rails as the
// dungeon's weather, and the same no-stutter law (never the same line twice
// running) — it just never says anything frightening. This is the ONLY thing you
// hear in here now: the dungeon's noise stops at the door, so the room's own
// quiet is all the atmosphere there is, and it has to carry the weight.
export function gatehouseAmbient(avoid?: string): string {
  const fresh = GATEHOUSE_AMBIENCE.filter((l) => l !== avoid);
  const pool = fresh.length ? fresh : GATEHOUSE_AMBIENCE;
  return pool[Math.floor(Math.random() * pool.length)];
}

// A quiet word, one to one — leaning in at the bar. Only they hear it; the room
// doesn't. Gatehouse only: out in the dark there is nowhere to lean.
//
// The wire copy is a REAL encrypted Nostr message. This is the one place the
// encryption question answers itself: a `tell` has exactly ONE recipient, so
// there's no shared-room-key problem — the speaker's client NIP-44s it to that
// npub and publishes an ephemeral kind 24915, p-tagged to them. Nobody else can
// read it. No relay keeps it. (The dungeon still routes the socket copy, so it
// sees the words in passing — if that must change, the client can encrypt before
// it sends and the server can forward a blob it can't read.)
export function cmdTell(z: ZoneDO, session: Session, arg: string): void {
  if (!z.outOfWorld(session)) {
    return z.send(session, "Not out here. A quiet word needs a wall at your back — that's what the gatehouse is for.");
  }
  const m = arg.trim().match(/^(\S+)\s+(.+)$/s);
  if (!m) return z.send(session, "Tell who what? ('tell <name> <words>')");
  const [, who, raw] = m;
  const msg = raw.trim().slice(0, 240);
  if (!msg) return z.send(session, "Tell them what?");
  const others = gatehouseFolk(z).filter((s) => s.pubkey !== session.pubkey);
  const target = others.find((s) => s.name.toLowerCase() === who.toLowerCase())
    ?? others.find((s) => s.name.toLowerCase().startsWith(who.toLowerCase()));
  if (!target) {
    return z.send(session, others.length
      ? `Nobody here by that name. By the fire: ${others.map((s) => s.name).join(", ")}.`
      : "There's nobody here to lean toward.");
  }
  z.send(session, `You lean in to ${target.name}: "${msg}"`, "tell");
  z.send(target, `${session.name} leans in, close, and says quietly: "${msg}"`, "tell");
  // Their key, their eyes only. The speaker's client seals it and puts it out.
  z.tellOut(session, target.pubkey, msg);
}

// ---- THE WALL CHART: the players' own map ----
// The wall starts as bare plaster. Every wanderer who walks the shallow halls
// and makes it back can 'carve' what they walked into it, and anyone can
// 'study' it and take the marks onto their own map. The dungeon gets charted,
// over weeks, by the people who died learning it — somebody's last run becomes
// the next arrival's first advantage.
//
// Two laws keep it honest and keep it from eating the map trade:
//   TESTIMONY, NOT INK — you can only set down rooms the server saw you stand
//   in this walk (session.visited). There is no freehand; the wall cannot lie.
//   THE SHALLOW RING ONLY — the gates and the halls just behind them. The deep
//   never goes on the wall, whatever anyone walked. That is the surveyor's
//   territory, forever; the keeper still eats.

// The gates and everything within two doors of them, minus the deep.
export function shallowRing(z: ZoneDO): Set<string> {
  const world = z.world!;
  const ring = new Set<string>(world.entryRooms);
  let frontier = [...world.entryRooms];
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = [];
    for (const r of frontier) {
      for (const e of world.exits.get(r) ?? []) {
        if (!ring.has(e.to_room)) { ring.add(e.to_room); next.push(e.to_room); }
      }
    }
    frontier = next;
  }
  for (const id of DEEP_ROOMS) ring.delete(id);
  return ring;
}

export async function wallCarve(z: ZoneDO, session: Session): Promise<void> {
  const ring = shallowRing(z);
  // Only what YOU walked THIS session — the wall takes testimony, not hearsay.
  // (A returning player re-walks before they can carve: what you set down is
  // what you remember from this walk, not a rumor of an old one.)
  const fresh = [...session.visited].filter((r) => ring.has(r) && !z.wallMarks.has(r));
  if (!fresh.length) {
    return z.send(session, z.wallMarks.size
      ? "You read your memory against the wall. Every hall you walked this time is already scratched there."
      : "Bare plaster, and nothing walked yet worth setting down. Walk the shallow halls, come back, and carve.");
  }
  for (const r of fresh) z.wallMarks.add(r);
  z.send(session, `You take up a nail and set down what you walked — ${fresh.length} hall${fresh.length === 1 ? "" : "s"} the wall didn't have. Whoever comes in from the cold can read them now.`);
  gatehouseFeed(z, `${session.name} scratches new halls into the wall chart.`, session.pubkey);
  await z.persist();
}

export function wallStudy(z: ZoneDO, session: Session): void {
  const world = z.world!;
  const ring = shallowRing(z);
  // Filter against BOTH the ring and the live world: a migration that re-hangs
  // a corridor may pull an old mark out of the ring, and it just quietly ages
  // off the chart rather than lying.
  const marked = [...z.wallMarks].filter((r) => ring.has(r) && world.rooms.has(r));
  if (!marked.length) {
    return z.send(session, "The wall chart is bare plaster — a frame scratched around nothing, waiting. Walk the shallow halls and 'carve' what you find.");
  }
  // The same frame a real map sends, built the same way — truth, no lies —
  // but holding only what's been carved. Exits are drawn only between marked
  // rooms: the wall never names a hall nobody set down.
  const shown = new Set(marked);
  const regions: Record<string, { key: string; label: string; rooms: any[] }> = {
    gate: { key: "gate", label: "The Gates", rooms: [] },
    out: { key: "out", label: "The Open Ground", rooms: [] },
    sky: { key: "sky", label: "The Overworks", rooms: [] },
    upper: { key: "upper", label: "The Halls", rooms: [] },
    warrens: { key: "warrens", label: "The Warrens", rooms: [] },
    deep: { key: "deep", label: "The Deep", rooms: [] },
  };
  for (const id of shown) {
    const room = world.rooms.get(id)!;
    const exits = (world.exits.get(id) ?? [])
      .filter((e) => shown.has(e.to_room))
      .map((e) => ({ dir: e.dir, to: e.to_room, toName: world.rooms.get(e.to_room)?.name ?? e.to_room }));
    regions[mapRegionOf(z, id)].rooms.push({ id, name: room.name, exits, here: id === session.roomId });
  }
  try {
    session.ws.send(JSON.stringify({
      v: 0, t: "map", detailed: 1, wall: 1, here: session.roomId,
      // Studied is kept: the marks light gold on your HUD, same law as a true map.
      reveal: marked.map((id) => world.rooms.get(id)!.name),
      regions: Object.values(regions).filter((r) => r.rooms.length),
    }));
  } catch {}
  z.send(session, `You study the wall chart — ${marked.length} hall${marked.length === 1 ? "" : "s"}, set down by whoever walked them. What you've read, you keep.`);
}
