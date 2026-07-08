// The gate-keeping subsystem, lifted out of the ZoneDO monolith: the bench
// trades (forge, and later salvage/repair), the keeper's hatch (barter), and
// the keeping (lockbox/vault/seal). These are free functions taking the ZoneDO
// instance as `z`; behavior is identical to when they were methods — only the
// seam moved. `import type` for ZoneDO keeps this a compile-time reference, so
// there's no runtime import cycle.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { provokeGrudges } from "./ai";
import { type ForgeRecipe, type CarriedItem, insertLoot, loadContainer, voidMint, removeItemRow, setEquipped, setItemCondition, setContainer, mintClaim, setMintEvent } from "./world";
import { isGameKeyConfigured, signLootEvent } from "./signing";
import { uuid } from "./rng";
import { cap, shortName, nameMatches, roundTender } from "./zone-util";
import { SCRAP_ID, PACK_CAP, LOCKBOX_CAP, VAULT_CAP, RICH_TENDER, JOURNAL_ITEM, SALVAGE_YIELD, REPAIR_COST } from "./zone-data";

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
    if (session.away) return; // one step-out at a time
    const bar = forgeGuard(z, session);
    if (bar) return z.send(session, bar);
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
  session.away = false;
  session.forging = false;
  try { session.ws.send(JSON.stringify({ v: 0, t: "forge", open: false })); } catch {}
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

export function cmdBarter(z: ZoneDO, session: Session): void {
  const world = z.world!;
  const bar = fenceGuard(z, session);
  if (bar) return z.send(session, bar);
  if (!world.fenceStock.length) return z.send(session, "The hatch is shuttered, and stays that way.");
  z.enterStep(session, "trading"); // safe at the counter until you step away
  const lines = ["The keeper unshutters the hatch and lays out what he'll part with:"];
  for (const s of [...world.fenceStock].sort((a, b) => a.cost - b.cost)) {
    const t = world.itemTemplates.get(s.itemId);
    if (!t) continue;
    lines.push(`  ${t.name}${z.itemStat(t)} [${t.rarity}] — ${s.cost} in trade`);
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
  trade.paid = roundTender(trade.paid + t.barter);
  // His manner is the only appraisal anyone gets.
  let line: string;
  if (t.barter >= RICH_TENDER) {
    line = `The keeper goes very still. Then ${t.name} is gone beneath the counter, and his manner warms considerably.`;
  } else if (t.barter >= 5) {
    line = `The keeper's eyebrows climb. He makes ${t.name} disappear.`;
  } else if (t.barter >= 2) {
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
  trade.paid = roundTender(onCounter.reduce((sum, o) => sum + (world.itemTemplates.get(o.item.itemId)?.barter ?? 0), 0));
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
  // Paid-for goods come across the counter already bearing the gate's seal
  // (kept-tier condition, minted on the spot) — you bought it, it's yours, the
  // world can't peel it off your corpse. Only a pack-full spill lands unsealed.
  const slid: string[] = [];
  for (const w of trade.wants) {
    const bought = world.itemTemplates.get(w.itemId)!;
    const jid = bought.id === JOURNAL_ITEM ? "jrn-" + uuid() : undefined;
    const got = await z.grantItem(session, bought.id, { kept: true, journalId: jid });
    if (!got) {
      z.ground.set(session.roomId, [...(z.ground.get(session.roomId) ?? []), bought.id]);
      slid.push(`${bought.name}${z.itemStat(bought)} [${bought.rarity}] (pack full — at your feet, unsealed)`);
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
  return `${line}${seals}\n${goods}${change} The keeper's wares carry the gate's mark already — sealed, and yours.`;
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
    if (session.away) return; // one step-out at a time
    const bar = fenceGuard(z, session);
    if (bar) return z.send(session, bar);
    if (!world.fenceStock.length) return z.send(session, "The hatch is shuttered, and stays that way.");
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
  session.away = false;
  session.trading = false;
  session.buying = undefined; // an unfinished trade sweeps back with you
  try { session.ws.send(JSON.stringify({ v: 0, t: "trade", open: false })); } catch {}
  z.roomFeed(session.roomId, `${session.name} steps back from the hatch.`, session.pubkey);
  z.send(session, z.enterDescribe(session));
  z.sendCtx(session);
  z.refreshRoomCtx(session.roomId);
}

export async function sendTrade(z: ZoneDO, session: Session, note?: string): Promise<void> {
  const world = z.world!;
  const stock = [...world.fenceStock]
    .sort((a, b) => a.cost - b.cost)
    .map((s) => {
      const t = world.itemTemplates.get(s.itemId);
      return t ? {
        id: s.itemId, name: t.name, rarity: t.rarity, cost: s.cost,
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
  if (tmpl.slot === "") return `There's no salvage in ${tmpl.name}.`;
  if (tmpl.id === "loose-rock") return "It's a rock.";
  if (carried.serial !== null) return "The gate's seal is on it — the vice won't take gate-marked goods.";
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
  return `You crank ${tmpl.name} into the vice and break it down. ${yieldN === 1 ? "A handful" : yieldN + " handfuls"} of scrap iron for the pile.`;
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
  if (tmpl.slot === "") return `There's nothing to mend in ${tmpl.name}.`;
  // Sealed gear wears now (slowly) — so it can be mended now too. The seal is
  // title, not condition: hammering the wear out doesn't touch the serial.
  if (carried.condition >= 100) return `${cap(tmpl.name)} is sound already.`;
  const cost = REPAIR_COST[tmpl.rarity] ?? 1;
  const have = z.countLoose(session, SCRAP_ID);
  if (have < cost) return `The mend wants ${cost} scrap iron; you carry ${have}.`;
  await z.takeLoose(session, SCRAP_ID, cost);
  carried.condition = 100;
  await setItemCondition(z.env.DB, carried.rowId, 100);
  return `You hammer the wear out of ${tmpl.name} and file it true. Sound again.`;
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
      if (session.away) return; // already stepped out (a modal, or a typed barter/forge)
      if (z.inCombat(session)) {
        return z.send(session, "Not while something is trying to kill you.");
      }
      // The lockbox opens anywhere (you duck aside to sort your run closet); the
      // vault and the seal are the gate's business, shown only when you're at one.
      enterBench(z, session);
      return sendBench(z, session);
    }
    if (!session.away) return; // every other action needs the bench already open
    if (action === "close") return leaveBench(z, session);

    const row = typeof frame.row === "string" ? frame.row : "";
    const gateOnly = "That's the gatehouse's work — reach a gate for the vault and the seal.";
    let note: string | undefined;
    if (action === "stash") note = await benchStore(z, session, row, "lockbox");
    else if (action === "vault") note = atGate ? await benchStore(z, session, row, "vault") : gateOnly;
    else if (action === "seal") note = atGate ? await benchSeal(z, session, row) : gateOnly;
    else if (action === "take") note = await benchTake(z, session, row);
    else if (action === "equip") note = await benchEquip(z, session, row);
    else if (action === "remove") note = await benchRemove(z, session, row);
    else if (action === "burn") note = await benchBurn(z, session, row);
    else if (action === "salvage") note = atGate ? await benchSalvage(z, session, row) : gateOnly;
    else if (action === "repair") note = atGate ? await benchRepair(z, session, row) : gateOnly;
    else return;
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
    session.away = false;
    try { session.ws.send(JSON.stringify({ v: 0, t: "bench", open: false })); } catch {}
    z.roomFeed(session.roomId, `${session.name} steps back out, kit sorted.`, session.pubkey);
    await provokeGrudges(z, session, false); // gates hold nothing; no free hit for closing the bench
    z.send(session, z.enterDescribe(session));
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
    if (!z.hasRoom(held, carried.itemId, cfg.cap)) return cfg.full;
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
        gear,
        equipped: !!c.equipped,
        cond: gear ? c.condition : null,
        condWord: gear ? (z.conditionWord(c.condition) || "sound") : "",
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
      atGate: world.entryRooms.has(session.roomId), // vault + seal only shown at a gate
      pack: group(session.items),
      lockbox: group(lockbox),
      vault: group(vault),
      packCap: PACK_CAP, lockboxCap: LOCKBOX_CAP, vaultCap: VAULT_CAP,
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
        container: "vault", cap: VAULT_CAP, sealedOnly: true, kind: "vault",
        absent: "The vault's riveted door is set deep in the gatehouse. It is not here.",
        empty: "The vault stands open around nothing.",
        header: "The vault holds",
        full: `The vault is full. It holds ${VAULT_CAP} things, and asks no more.`,
        needSeal: "The vault won't bank raw gear — seal it at the gate first, or drop it in your lockbox.",
        put: (n: string) => `You lay ${n} in the vault. The iron door swings shut over it.`,
        feed: "swings the vault door, and seals it again.",
        takeEmpty: "Draw what out? ('vault' alone shows what it holds.)",
        holdsNot: "The vault holds nothing like that.",
        take: (n: string) => `You draw ${n} from the vault. It rides with you now — and so do its risks.`,
      };
    }
    return {
      container: "lockbox", cap: LOCKBOX_CAP, sealedOnly: false, kind: "lockbox",
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
      const lines = [`${cfg.header} (${z.slotsUsed(held)}/${cfg.cap}):`];
      const counts = new Map<string, number>();
      for (const c of held) {
        if (z.stackable(c.itemId, c.serial, c.journalId)) counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + 1);
      }
      for (const [id, n] of counts) {
        const t = world.itemTemplates.get(id);
        lines.push(`  ${t ? t.name : id}${n > 1 ? ` (x${n})` : ""}${z.itemStat(t)}`);
      }
      for (const c of held) {
        if (z.stackable(c.itemId, c.serial, c.journalId)) continue; // stacked above
        const t = world.itemTemplates.get(c.itemId);
        // Sealed gear wears now (slower) — show the seal AND the wear together.
        const bits: string[] = [];
        if (c.serial !== null) bits.push(`sealed #${c.serial}`);
        if (t && t.slot !== "") bits.push(z.conditionWord(c.condition) || "sound");
        const tag = bits.length ? ` — ${bits.join(", ")}` : "";
        lines.push(`  ${t ? t.name : c.itemId}${z.itemStat(t)}${tag}`);
      }
      return z.send(session, lines.join("\n"));
    }
    const carried = z.findCarried(session, arg);
    if (!carried) return z.send(session, "You carry nothing like that.");
    // Sealed wealth or raw fungibles bank in the vault; only unsealed gear is turned away.
    if (cfg.sealedOnly && carried.serial === null && !z.stackable(carried.itemId, carried.serial, carried.journalId)) return z.send(session, cfg.needSeal);
    if (!z.hasRoom(held, carried.itemId, cfg.cap)) return z.send(session, cfg.full);
    const tmpl = world.itemTemplates.get(carried.itemId)!;
    // Flush its worn condition before it leaves the body, so the box/vault
    // holds the true value; setContainer clears the equipped flag.
    if (z.isGear(carried.itemId)) await setItemCondition(z.env.DB, carried.rowId, carried.condition);
    carried.equipped = false;
    session.items.splice(session.items.indexOf(carried), 1);
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
    if (!z.packRoom(session, entry.itemId)) return z.send(session, `Your pack is full (${PACK_CAP} slots). Make room first.`);
    await setContainer(z.env.DB, entry.rowId, "");
    session.items.push(entry);
    z.send(session, cfg.take(tmpl.name));
    z.sendCtx(session);
  }