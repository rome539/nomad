// The gate-keeping subsystem, lifted out of the ZoneDO monolith: the bench
// trades (forge, and later salvage/repair), the keeper's hatch (barter), and
// the keeping (lockbox/vault/seal). These are free functions taking the ZoneDO
// instance as `z`; behavior is identical to when they were methods — only the
// seam moved. `import type` for ZoneDO keeps this a compile-time reference, so
// there's no runtime import cycle.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { provokeGrudges } from "./ai";
import { type ForgeRecipe, type CarriedItem, insertLoot, loadContainer, voidMint, removeItemRow, setEquipped, setItemCondition, setContainer, mintClaim, setMintEvent, setItemLoreId, deedsCreate, deedsOwner, hasTrait, mapInkLoad, journalLoad } from "./world";
import { isGameKeyConfigured, signLootEvent } from "./signing";
import { uuid, randInt, chance, pick } from "./rng";
import * as events from "./events";
import * as works from "./works";
import { cap, shortName, nameMatches, roundTender, rollShopCondition, heartWord, foodWord } from "./zone-util";
import { SCRAP_ID, IRON_ID, SMELT_SCRAP_PER_IRON, NO_SALVAGE, PACK_CAP, PACK_FOOD_CAP, LOCKBOX_CAP, VAULT_CAP, RICH_TENDER, JOURNAL_ITEM, SALVAGE_YIELD, REPAIR_COST, LANTERN_ITEM, THROW_TOUGH, DEEP_HEART,
  FENCE_OUT_MIN_MS, FENCE_OUT_MAX_MS, FENCE_LAST_ONE_ODDS, FENCE_CHURN_MIN_MS, FENCE_CHURN_MAX_MS, FENCE_ABSENT_FRACTION, TORCH_ITEM,
  BOUNTY_TABLE, BOUNTY_BOARD_SIZE, BOUNTY_CHURN_MIN_MS, BOUNTY_CHURN_MAX_MS, DICE_RULES,
  MAP_ITEMS, FULL_MAP, DETAILED_MAP,
  GATEHOUSE_BARRED, GATEHOUSE_NOARG, GATEHOUSE_AMBIENCE, DEEP_ROOMS, BOX_WORD, FOOD_KEEPS , MAP_BAND_OF, DEN_CAP,
  BOARD_MAX_LEN, BOARD_LIFE_MS, BOARD_CAP,
  KEEPER_NODS, KEEPER_NODS_BUSY, KEEPER_NOD_ODDS, KEEPER_NOD_EVERY_MS } from "./zone-data";
import * as den from "./den";
import { parse } from "./parser";
import { mapRegionOf, worldGrid } from "./lore";
import { MAP_QUARTERS } from "./detail";
import { dropCarried, describePlayer, lookKeepingItem, selfExamine } from "./verbs";

export async function cmdForge(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const world = z.world!;
  const bar = z.benchGuard(session, "forge work");
  if (bar) return z.send(session, bar);
  const shut = worksBar(z, session);
  if (shut) return z.send(session, shut, "evt");
  if (!world.forgeRecipes.length) return z.send(session, "The brazier is cold and the recipe slate is blank.");
  const walkedIn = !z.outOfWorld(session);
  throughTheDoor(z, session); // the brazier is inside — the door comes first
  z.enterStep(session, "forging"); // then a lateral step to the bench
  if (walkedIn) z.send(session, "You push in out of the cold and stir the brazier to life.");
  if (!arg) {
    const lines = ["The bench's recipe book, chalked on slate:"];
    for (const r of [...world.forgeRecipes].sort((a, b) => a.scrap - b.scrap)) {
      const t = world.itemTemplates.get(r.itemId);
      if (!t) continue;
      const mat = r.material ? ` + ${r.materialQty} ${shortName(world.itemTemplates.get(r.material)?.name ?? r.material)}` : "";
      lines.push(`  ${z.gearName(t.id)}${z.itemStat(t)} [${t.rarity}] — ${r.scrap} iron${mat}`);
    }
    const pools = await z.gatePools(session);
    const iron = z.countLooseIn(pools, IRON_ID);
    const scrap = z.countLooseIn(pools, SCRAP_ID);
    lines.push(`(You have ${iron} iron and ${scrap} scrap between pack and keeping. 'forge <thing>' works one; 'smelt' casts ${SMELT_SCRAP_PER_IRON} scrap into 1 iron. Salvage feeds the scrap pile. 'out' steps you back into the world.)`);
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
  // The bench reaches the pack AND the gate's keeping (lockbox + vault). Recipes
  // are cut in IRON now (recipe.scrap holds the iron cost — the column kept its
  // old name); scrap is for the smelter and the mending vice.
  const pools = await z.gatePools(session);
  const haveIron = z.countLooseIn(pools, IRON_ID);
  if (haveIron < recipe.scrap) {
    return { ok: false, note: `${cap(t.name)} wants ${recipe.scrap} iron; you have ${haveIron} between pack and keeping. (Smelt scrap into iron: '${SMELT_SCRAP_PER_IRON} scrap = 1 iron'.)` };
  }
  if (recipe.material) {
    const mt = world.itemTemplates.get(recipe.material);
    const haveMat = z.countLooseIn(pools, recipe.material);
    if (haveMat < recipe.materialQty) {
      return { ok: false, note: `${cap(t.name)} wants ${recipe.materialQty} of ${mt?.name ?? recipe.material} besides the iron; you have ${haveMat}.` };
    }
  }
  await z.takeLooseAcross(session, IRON_ID, recipe.scrap);
  if (recipe.material) await z.takeLooseAcross(session, recipe.material, recipe.materialQty);
  const id = uuid();
  await insertLoot(z.env.DB, id, session.pubkey, t.id, null);
  session.items.push({ rowId: id, itemId: t.id, serial: null, equipped: false, condition: 100 });
  gatehouseFeed(z, `${session.name} works the bench, hammer ringing off the gatehouse walls.`, session.pubkey); // gatehouse work stays in the gatehouse — the world outside the door doesn't hear the hammer
  return {
    ok: true,
    note: `Iron, the brazier's heat, and patience. ${z.gearName(t.id, cap(t.name))} comes off the bench, raw but true.${z.itemStat(t)} [${t.rarity}] (unclaimed — the gate can seal it)`,
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
    const lateral = z.outOfWorld(session); // the brazier is a fixture of the gatehouse
    if (session.away && !lateral) return; // one step-out at a time (mid-dungeon crouch)
    const bar = forgeGuard(z, session);
    if (bar) return z.send(session, bar);
    const shut = worksBar(z, session);
    if (shut) return z.send(session, shut, "evt");
    // The front door rule: from the gate room this walks you INSIDE first (a
    // real, announced entry), then steps to the brazier. From inside, a lateral.
    throughTheDoor(z, session);
    z.enterStep(session, "forging");
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
  // The brazier is a fixture of the gatehouse: bank it and you're still by the
  // fire. NEVER re-narrate the room you never left — a quiet line, same as closing
  // the bench (rome, 2026-07-15; the pack/hatch/brazier are modals, not doors).
  if (z.world!.entryRooms.has(session.roomId)) {
    session.stepText = true;
    z.send(session, "You bank the brazier and turn from the bench.");
    await z.sendGateCtx(session); // forging changed your iron/scrap — refresh the smelt chip
    return;
  }
  session.away = false;
  z.roomFeed(session.roomId, `${session.name} banks the brazier and steps back.`, session.pubkey, false);
  z.send(session, z.enterDescribe(session));
  z.sendCtx(session);
  z.refreshRoomCtx(session.roomId);
}

export async function sendForge(z: ZoneDO, session: Session, note?: string, sfx?: string): Promise<void> {
  const world = z.world!;
  // Affordability counts the pack AND the gate's keeping, so what the modal
  // shows matches what the bench will actually spend.
  const pools = await z.gatePools(session);
  // Recipes are priced in IRON now; the modal's affordability currency is iron.
  // (Payload key stays `scrap` — the client reads it — but it carries the iron
  // count; the client labels it "iron".) The raw scrap count rides alongside.
  const scrap = z.countLooseIn(pools, IRON_ID);
  const scrapRaw = z.countLooseIn(pools, SCRAP_ID);
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
  const payload = { v: 0, t: "forge", open: true, note: note ?? "", sfx: sfx ?? "", scrap, scrapRaw, recipes };
  try { session.ws.send(JSON.stringify(payload)); } catch {}
}

// A rebuilt session has NO modal state. buildSession never carries trading,
// forging, bountying or a bench step across — so after a cold wake (the tab sat
// in the background, the DO was evicted, the parked socket woke to a new
// ZoneDO) the server has forgotten a modal the browser is still showing, and
// every button in it is dead: handleTrade, handleForge and handleBounty all
// open with a guard that silently drops the frame when the flag is false, close
// included. The wanderer is looking at a panel nothing can shut.
//
// So the rebuild tells the client what it now believes: all of them closed.
// trade.forceCloseSwapUI does exactly this for the wanderer-to-wanderer deal
// and has since the deal shipped; this is the same courtesy for the four
// gatehouse panels. Cheap, idempotent, and harmless when nothing is open.
export function forceCloseGateUI(session: Session): void {
  for (const t of ["bench", "trade", "forge", "bounty"]) {
    try { session.ws.send(JSON.stringify({ v: 0, t, open: false })); } catch {}
  }
}

// ---- the keeper's bounty board ----
// A different kind of dealing. Barter is a value ledger — anything with barter
// for anything he stocks. A bounty is the keeper pointing at ONE trophy and
// offering a meal for it: not a better price than the shelves (see BOUNTY_TABLE
// on why it can't be), but food he doesn't stock, from a counter that never
// sells out. The board rotates like the fence; claim by trading the trophy in.

// What this wanderer has already collected off the CURRENT board. Created on
// demand, wiped whole at every churn — a posting is one meal per person, and
// the board a delver strips is only stripped for them.
export function bountyTookOf(z: ZoneDO, pubkey: string): Set<string> {
  let took = z.bountyTaken.get(pubkey);
  if (!took) { took = new Set(); z.bountyTaken.set(pubkey, took); }
  return took;
}

export function bountyGuard(z: ZoneDO, session: Session): string | null {
  if (!z.world!.entryRooms.has(session.roomId)) return "The keeper keeps his bounties at the gates.";
  if (z.inCombat(session)) return "Not while something is trying to kill you.";
  if (!z.bounties.length) return "The board is bare. The keeper hasn't posted anything just now.";
  return null;
}

// Take the trophy, pay the meal (a pair of meals on the top two rungs — no one
// food is big enough for a wolf-skull). Shared by the modal and the typed path
// so the two can't drift on what a bounty costs or pays. Returns the prose.
async function payBounty(z: ZoneDO, session: Session, bounty: [string, string, number?], carried: CarriedItem): Promise<string> {
  const world = z.world!;
  const [trophyId, foodId, count] = bounty;
  const meals = count ?? 1;
  const trophy = world.itemTemplates.get(trophyId);
  const food = world.itemTemplates.get(foodId);
  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  bountyTookOf(z, session.pubkey).add(trophyId); // paid to YOU; it stays on the board for everyone else
  let spilled = 0;
  for (let i = 0; i < meals; i++) {
    if (await z.grantItem(session, foodId)) continue;
    // Pack full (or the food's count-cap hit): the meal goes on the stones at
    // your feet rather than vanishing — the bounty is still paid, you just have
    // to stoop for it. Same spill law as the hatch's buy when the pack's full.
    const floor = z.ground.get(session.roomId) ?? [];
    floor.push(foodId);
    z.ground.set(session.roomId, floor);
    z.stampFresh(session.roomId, foodId);
    spilled++;
  }
  if (spilled) z.refreshRoomCtx(session.roomId);
  const paid = meals > 1 ? `${food?.name ?? "a meal"} — two of them` : (food?.name ?? "a meal");
  if (!spilled) return `The keeper takes ${trophy?.name ?? "it"} with both hands and lays ${paid} on the counter. Bounty paid.`;
  if (spilled === meals) return `The keeper takes ${trophy?.name ?? "it"} — but your pack is full, and ${paid} falls at your feet. Bounty paid.`;
  return `The keeper takes ${trophy?.name ?? "it"} and lays ${paid} out — more than your pack will hold, and the rest of it goes on the stones at your feet. Bounty paid.`;
}

export async function handleBounty(z: ZoneDO, session: Session, frame: any): Promise<void> {
  const action = frame?.action;
  if (action === "open") {
    const lateral = z.outOfWorld(session); // the board is a fixture of the gatehouse
    if (session.away && !lateral) return; // one step-out at a time
    const bar = bountyGuard(z, session);
    if (bar) return z.send(session, bar);
    const shut = worksBar(z, session);
    if (shut) return z.send(session, shut, "evt");
    throughTheDoor(z, session);
    z.enterStep(session, "bountying");
    return sendBounty(z, session);
  }
  if (!session.bountying) return;
  if (action === "close") return leaveBounty(z, session);
  if (action === "claim") {
    const trophyId = String(frame.row ?? "");
    const bounty = z.bounties.find(([t]) => t === trophyId);
    if (!bounty) return sendBounty(z, session, "The keeper shakes his head. That bounty has been pulled from the board.");
    const trophy = z.world!.itemTemplates.get(bounty[0]);
    if (bountyTookOf(z, session.pubkey).has(bounty[0])) {
      return sendBounty(z, session, `He's already paid you for that one. The posting stands for whoever brings him the next ${trophy?.name ?? "one"}.`);
    }
    const carried = session.items.find((c) => c.itemId === bounty[0] && c.serial === null);
    if (!carried) return sendBounty(z, session, `You've nothing like that to trade — the keeper wants ${trophy?.name ?? "it"}, and it isn't on you.`);
    return sendBounty(z, session, await payBounty(z, session, bounty, carried));
  }
  return sendBounty(z, session);
}

export async function leaveBounty(z: ZoneDO, session: Session): Promise<void> {
  session.bountying = false;
  try { session.ws.send(JSON.stringify({ v: 0, t: "bounty", open: false })); } catch {}
  if (z.world!.entryRooms.has(session.roomId)) {
    session.stepText = true;
    z.send(session, "You turn from the bounty board and step back to the hatch.");
    await z.sendGateCtx(session);
    return;
  }
  session.away = false;
  z.roomFeed(session.roomId, `${session.name} turns from the bounty board and steps back.`, session.pubkey, false);
  z.send(session, z.enterDescribe(session));
  z.sendCtx(session);
  z.refreshRoomCtx(session.roomId);
}

export async function sendBounty(z: ZoneDO, session: Session, note?: string): Promise<void> {
  const world = z.world!;
  const took = bountyTookOf(z, session.pubkey);
  const board = z.bounties.map(([trophyId, foodId, count]) => {
    const t = world.itemTemplates.get(trophyId);
    const f = world.itemTemplates.get(foodId);
    if (!t || !f) return null;
    // Whether the wanderer actually carries the trophy (the claim needs it in
    // the pack — sealed title never crosses the counter), and whether the
    // keeper has already settled this posting with them.
    const have = session.items.some((c) => c.itemId === trophyId && c.serial === null);
    const meals = count ?? 1;
    return { id: trophyId, name: t.name, rarity: t.rarity, food: f.name, heal: f.heal * meals, meals, have, took: took.has(trophyId) };
  }).filter((b) => b !== null);
  const payload = { v: 0, t: "bounty", open: true, note: note ?? "", board };
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

// Whether the keeper is carrying a thing right now. An absent item isn't a
// "bare shelf" any more (rome, 2026-07-20) — it's simply not on offer until it
// cycles back.
export function inStock(z: ZoneDO, itemId: string): boolean {
  return (z.fenceOut.get(itemId) ?? 0) <= Date.now();
}

// The basics the keeper ALWAYS keeps: food, water, dressings, torches, scrap.
// Everything else — gear and oddments — rotates in and out.
export function fenceStaple(z: ZoneDO, itemId: string): boolean {
  const t = z.world!.itemTemplates.get(itemId);
  return !!t && (!!t.edible || t.staunch > 0 || itemId === TORCH_ITEM || itemId === SCRAP_ID);
}

// The shelf ROTATES (rome, 2026-07-20): the keeper doesn't stock his whole
// catalog at once — about a third of his gear/oddments simply aren't carried
// right now, and they cycle back over an hour or three. Each churn tops the
// absent count back up to the target as items return, so the offering keeps
// changing. Staples never rotate. (Supersedes the old "one customer buys him
// out every few hours" — that left him carrying nearly everything, always.)
let nextChurnAt = 0;
export function tickFence(z: ZoneDO, now: number): void {
  for (const [itemId, at] of z.fenceOut) {
    if (now >= at) z.fenceOut.delete(itemId); // it cycled back in; on offer again
  }
  if (!nextChurnAt) {
    nextChurnAt = now + randInt(FENCE_CHURN_MIN_MS, FENCE_CHURN_MAX_MS);
    return;
  }
  if (now < nextChurnAt) return;
  nextChurnAt = now + randInt(FENCE_CHURN_MIN_MS, FENCE_CHURN_MAX_MS);
  const rotating = z.world!.fenceStock.filter((s) => !fenceStaple(z, s.itemId));
  const target = Math.round(rotating.length * FENCE_ABSENT_FRACTION);
  const available = rotating.filter((s) => inStock(z, s.itemId));
  const need = target - (rotating.length - available.length); // how many more to pull off the shelf
  for (let i = 0; i < need && available.length; i++) {
    const [gone] = available.splice(randInt(0, available.length - 1), 1);
    z.fenceOut.set(gone.itemId, now + randInt(FENCE_OUT_MIN_MS, FENCE_OUT_MAX_MS)); // gone "for some time", then back
  }
}

// THE BOUNTY BOARD ROTATES like the fence: BOUNTY_BOARD_SIZE trophies are on
// offer at once, drawn fresh from the table each churn, paid in food at ~2x the
// trophy's barter. Unlike the fence, the board is PERSISTED (bounties +
// nextBountyChurnAt ride the sim state), so a restart shows the same bounties
// — a hunter who saw a wolf-skull up last night can chase it after a deploy.
export function tickBounty(z: ZoneDO, now: number): void {
  // A board with nothing on it teaches nothing, so the FIRST tick of a fresh
  // world posts immediately rather than scheduling and walking away — otherwise
  // the gate opens bare and stays bare for up to an hour and a half.
  if (now < z.nextBountyChurnAt) return;
  z.nextBountyChurnAt = now + randInt(BOUNTY_CHURN_MIN_MS, BOUNTY_CHURN_MAX_MS);
  const pool = [...BOUNTY_TABLE];
  const board: [string, string, number?][] = [];
  for (let i = 0; i < BOUNTY_BOARD_SIZE && pool.length; i++) {
    board.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
  }
  // Fresh postings, fresh slate: what everyone collected off the old board dies
  // with it, so the same trophy can pay again next time it comes up.
  z.bountyTaken.clear();
  // The board is shared across every gate — one keeper, one set of bounties.
  // If it actually changed, the gatehouse hears the board go up.
  const changed = JSON.stringify(board) !== JSON.stringify(z.bounties);
  z.bounties = board;
  if (changed) {
    for (const [trophyId, foodId] of board) {
      const t = z.world!.itemTemplates.get(trophyId);
      if (t) gatehouseFeed(z, `The keeper pins a new bounty to the board: ${t.name} — paid in a good meal.`, undefined, "evt");
    }
  }
}

// THE FRONT DOOR RULE (rome, 2026-07-17): the hatch, the brazier and the bench
// are fixtures INSIDE the gatehouse — typing (or tapping) one from the gate
// room must not conjure a private step-out at the arch. This walks you through
// the door first: a real entry — announced on both sides, HUD flipped — and
// then the counter is a lateral step from the fire. No-op if you're already in.
// Combat is refused upstream (fence/bench/forge guards + the door's own rule).
/**
 * THE WORKS GUARD. One check, at the one chokepoint — the hatch, the bench, the
 * forge, the vault and the plain `in` all reach the gatehouse through
 * throughTheDoor, so a shut door shuts all of them at once and none of them can
 * be conjured from the gate room while the boards are up. Returns the refusal
 * to send, or null when the door opens as normal.
 */
export function worksBar(z: ZoneDO, session: Session): string | null {
  if (z.outOfWorld(session)) return null; // already inside — the works can't reach in and evict you twice
  return works.shutForWorks(z, session.roomId) ? works.worksRefusal() : null;
}

export function throughTheDoor(z: ZoneDO, session: Session): void {
  if (z.outOfWorld(session)) return;
  if (works.shutForWorks(z, session.roomId)) return z.send(session, works.worksRefusal(), "evt");
  z.enterStep(session, "gatehouse"); // away + inGatehouse; the gate hears the door shut
  z.sendStatus(session); // the HUD reads "The Gatehouse" the moment you're in
  gatehouseFeed(z, `${session.name} pushes in out of the cold.`, session.pubkey, "who");
  keeperNods(z, session);
}

export function cmdBarter(z: ZoneDO, session: Session): void {
  const world = z.world!;
  const bar = fenceGuard(z, session);
  if (bar) return z.send(session, bar);
  const shut = worksBar(z, session);
  if (shut) return z.send(session, shut, "evt");
  if (!world.fenceStock.length) return z.send(session, "The hatch is shuttered, and stays that way.");
  const walkedIn = !z.outOfWorld(session);
  throughTheDoor(z, session); // the hatch is inside — the door comes first
  z.enterStep(session, "trading"); // then a lateral step up to the counter
  if (walkedIn) z.send(session, "You push in out of the cold and step up to the keeper's hatch.");
  const lines = ["The keeper unshutters the hatch and lays out what he'll part with:"];
  const absent: string[] = [];
  for (const s of [...world.fenceStock].sort((a, b) => a.cost - b.cost)) {
    const t = world.itemTemplates.get(s.itemId);
    if (!t) continue;
    // What he isn't carrying is still named, without a price — you can't buy it,
    // but you can know it exists and come back for it.
    if (!inStock(z, s.itemId)) { absent.push(t.name); continue; }
    lines.push(`  ${z.gearName(t.id)}${z.itemStat(t)} [${t.rarity}] — ${s.cost} in trade`);
  }
  if (absent.length) {
    lines.push(`Not carrying today: ${absent.join(", ")}. "They come and go," he says. "Check back."`);
  }
  lines.push("He deals in kind — bones, teeth, oddments. 'buy <thing>' starts a trade; 'offer <thing>' pays until he's square. He gives no change. ('out' steps you back into the world.)");
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
    return z.send(session, "The keeper shakes his head. \"Not carrying that just now. Check back — it comes and goes.\"");
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
// HOW MANY GO ACROSS THE COUNTER IN ONE GESTURE (rome, 2026-08-02: "offer rat
// tails should offer up 10 at a time (to equal 1) if you have at least 10").
//
// Anything worth less than a whole unit of tender is handed over in a FISTFUL,
// not one at a time. A rat tail is 0.1, so ten of them are 1 — and paying for a
// 6-barter knife a tail at a time is sixty commands, which is not a trade, it is
// data entry. Derived from the price rather than listed, so the rule holds for
// whatever cheap thing gets written next; the rat tail is the only sub-unit good
// in the game today.
export function bundleSize(t: { barter?: number } | undefined): number {
  const b = t?.barter ?? 0;
  if (b <= 0 || b >= 1) return 1;
  return Math.max(1, Math.round(1 / b));
}

// Lay a fistful on the counter. Stops early the moment the counter goes square —
// you never overpay because your hand was full — and reports once, with the
// running tally from the last one across, rather than ten near-identical lines.
export async function offerFistful(
  z: ZoneDO, session: Session, picks: CarriedItem[], from: "" | "lockbox" | "vault",
): Promise<string> {
  const world = z.world!;
  const t = world.itemTemplates.get(picks[0].itemId);
  const want = Math.min(bundleSize(t), picks.length);
  let line = "";
  let laid = 0;
  for (let i = 0; i < want; i++) {
    if (i > 0 && !session.buying) break; // the trade closed on the last one
    line = await offerCore(z, session, picks[i], from);
    laid++;
    if (line.startsWith("The keeper waves") || line.startsWith("You'd have to")) break; // refused; don't shovel
  }
  if (laid <= 1) return line;
  return `You count out ${laid} onto the counter, a fistful of ${t?.name ?? "them"}. ${line}`;
}

// The bounty board, typed: 'bounty' alone reads the board; 'bounty claim <trophy>'
// trades the trophy in for the meal (or 'claim <trophy>' while standing at it).
export async function cmdBounty(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const bar = bountyGuard(z, session);
  if (bar) return z.send(session, bar);
  const shut = worksBar(z, session);
  if (shut) return z.send(session, shut, "evt");
  const walkedIn = !z.outOfWorld(session);
  throughTheDoor(z, session); // the board is inside — the door comes first
  z.enterStep(session, "bountying");
  if (walkedIn) z.send(session, "You push in out of the cold and step up to the keeper's bounty board.");
  const world = z.world!;
  const claim = /^(claim|give|trade|pay)\s+(.+)/i.exec(arg.trim());
  if (claim) {
    const bounty = z.bounties.find(([t]) => {
      const tt = world.itemTemplates.get(t);
      return tt ? nameMatches(tt.name, claim[2]) : false;
    });
    if (!bounty) return z.send(session, "That isn't on the board. 'bounty' shows what the keeper is paying for.");
    const trophy = world.itemTemplates.get(bounty[0])!;
    if (bountyTookOf(z, session.pubkey).has(bounty[0])) {
      return z.send(session, `He's already paid you for that one. The posting stands for whoever brings him the next ${trophy.name}.`);
    }
    const carried = session.items.find((c) => c.itemId === bounty[0] && c.serial === null);
    if (!carried) return z.send(session, `The keeper wants ${trophy.name} — you haven't got one loose in your pack.`);
    // Typed stays typed: the text path prints its line and leaves you standing
    // at the board in text. Pushing sendBounty here would fling the modal open
    // over a wanderer who never asked for it.
    return z.send(session, await payBounty(z, session, bounty, carried));
  }
  if (!z.bounties.length) return z.send(session, "The board is bare. The keeper hasn't posted anything just now.");
  const took = bountyTookOf(z, session.pubkey);
  const lines = ["The keeper's bounty board:", ...z.bounties.map(([trophyId, foodId, count]) => {
    const t = world.itemTemplates.get(trophyId);
    const f = world.itemTemplates.get(foodId);
    if (!t || !f) return "";
    const meals = count ?? 1;
    const pay = meals > 1 ? `${f.name} ×${meals}` : f.name;
    const note = took.has(trophyId)
      ? " — paid"
      : session.items.some((c) => c.itemId === trophyId && c.serial === null) ? " — you have one" : "";
    return `  ${t.name} \u2192 ${pay} (mends ${f.heal * meals})${note}`;
  }), "Bring the trophy to the hatch and it's yours to eat. 'bounty claim <trophy>' pays it in. ('out' steps you back into the world.)"];
  return z.send(session, lines.join("\n"));
}

export async function offerCore(z: ZoneDO, session: Session, carried: CarriedItem, from: string): Promise<string> {
  const world = z.world!;
  const trade = session.buying!;
  const t = world.itemTemplates.get(carried.itemId)!;
  if ((t.barter ?? 0) <= 0) return `The keeper waves ${t.name} away. No use to him.`;
  // You can't sell what you're standing in. Both the modal and the typed offer
  // land here, so this one guard covers both — and the goods tally hides worn
  // pieces besides, so the modal never offers the button in the first place.
  // Same law as benchDrop ("that isn't loose in your pack"): take it off, then
  // deal. Stash and salvage silently unequip, but those keep the piece or its
  // metal — this hands it across a counter and it is GONE.
  if (carried.equipped) return `You'd have to take ${t.name} off first. The keeper deals in goods, not the clothes on your back.`;
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
    if (inStock(z, w.itemId) && !fenceStaple(z, w.itemId) && chance(FENCE_LAST_ONE_ODDS)) {
      z.fenceOut.set(w.itemId, Date.now() + randInt(FENCE_OUT_MIN_MS, FENCE_OUT_MAX_MS));
      const t = world.itemTemplates.get(w.itemId);
      if (t) lastOnes.push(t.name);
    }
    const bought = world.itemTemplates.get(w.itemId)!;
    // A WORD OF THE BOXES is not goods — the keeper sells what he's heard.
    // He names the room where a roaming strongbox sits RIGHT NOW (a locked one
    // when any is; a sprung one is still a mark worth walking toward — iron
    // rests, and the box refills where it hides). Spoken, not slid: nothing
    // enters the pack, so a full pack never spills a rumor on the floor.
    if (bought.id === BOX_WORD) {
      const roamers = world.caches.filter((c) => z.cacheRoams(c));
      const lockedOnes = roamers.filter((c) => z.cacheLocked(c));
      const mark = lockedOnes.length ? pick(lockedOnes) : pick(roamers);
      const rn = world.rooms.get(z.cacheRoomId(mark))?.name ?? "a room he won't name twice";
      const set = z.cacheLocked(mark);
      z.send(session, `The keeper leans to the hatch, voice dropped low: "${cap(mark.name)} sits in ${rn}${set ? ", lock still set" : " — sprung and bare just now, but iron rests, and it fills where it hides"}. You didn't hear it here."`, "study");
      slid.push("a word of the boxes — spoken, and not sold twice");
      continue;
    }
    const jid = bought.id === JOURNAL_ITEM ? "jrn-" + uuid() : undefined;
    const got = await z.grantItem(session, bought.id, { condition: rollShopCondition(bought.slot), journalId: jid });
    if (!got) {
      // A journal spills INSTANCED even at the counter — the id minted above
      // rides the book to the floor, or it comes back up a blank no hand can open.
      if (jid) z.dropInstance(session.roomId, bought.id, jid);
      else z.ground.set(session.roomId, [...(z.ground.get(session.roomId) ?? []), bought.id]);
      slid.push(`${z.gearName(bought.id)}${z.itemStat(bought)} [${bought.rarity}] (pack full — at your feet, unsealed)`);
      continue;
    }
    // Gear comes sealed (you bought it, the world can't peel it off your corpse)
    // — but a fungible carries no title to seal (scrap iron, trophies, cigs). A
    // sealed scrap can't be spent at the forge or the vice, so leave it loose.
    if (z.stackable(got.itemId, got.serial, got.journalId)) {
      slid.push(`${z.gearName(bought.id)}${z.itemStat(bought)} [${bought.rarity}]`);
      continue;
    }
    const serial = await sealOne(z, session, got);
    slid.push(`${z.gearName(bought.id)}${z.itemStat(bought)} [${bought.rarity}] (sealed #${serial})`);
  }
  const change = trade.paid > cost ? " He gives no change." : "";
  const seals = cracked ? " He cracks the gate's seals without ceremony." : "";
  const goods = slid.length === 1
    ? `The keeper slides ${slid[0]} across the counter.`
    : `The keeper slides it all across the counter:\n  ${slid.join("\n  ")}`;
  session.buying = undefined;
  // No per-purchase broadcast: an active shopper was flooding the whole gatehouse
  // with "X trades at the keeper's hatch." on every settle (rome, 2026-07-18).
  // Trading is a quiet act now, like sorting the bench — presence is the room's
  // own "X is here," and the one-time step-up line when they first walk in.
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
  let batch: CarriedItem[] = [];
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
      // Prefer a piece you're NOT wearing, then an unsealed one: 'offer maul'
      // with one on your hip and a spare in the pack sells the spare, rather
      // than bouncing off the equipped guard in offerCore.
      const loose = free.filter((c) => !c.equipped);
      const pick = loose.length ? loose : free;
      // Unsealed first, then the rest — so a fistful cracks no seal it needn't.
      batch = [...pick.filter((c) => c.serial === null), ...pick.filter((c) => c.serial !== null)];
      carried = batch[0];
      from = key;
      break;
    }
  }
  if (!carried) {
    return z.send(session, seenNamed ? "That's already on the counter." : "You carry nothing like that.");
  }
  z.send(session, await offerFistful(z, session, batch, from));
  z.sendCtx(session);
}

// ---- the keeper's hatch as a modal: step out of the world and trade ----
// Same shape as the bench: opening it makes you `away` (untouchable, out of
// sight), and while it's open the gatehouse quiet closes your wounds too.

export async function handleTrade(z: ZoneDO, session: Session, frame: any): Promise<void> {
  const world = z.world!;
  const action = frame?.action;
  if (action === "open") {
    const lateral = z.outOfWorld(session); // the hatch is a fixture of the gatehouse
    if (session.away && !lateral) return; // one step-out at a time (mid-dungeon crouch)
    const bar = fenceGuard(z, session);
    if (bar) return z.send(session, bar);
    const shut = worksBar(z, session);
    if (shut) return z.send(session, shut, "evt");
    if (!world.fenceStock.length) return z.send(session, "The hatch is shuttered, and stays that way.");
    // The front door rule: from the gate room this walks you INSIDE first (a
    // real, announced entry), then steps to the hatch — the modal never again
    // conjures a private step-out at the arch. From inside it's just a lateral.
    throughTheDoor(z, session);
    z.enterStep(session, "trading");
    return sendTrade(z, session);
  }
  if (!session.trading) return;
  if (action === "close") return leaveTrade(z, session);
  let note: string | undefined;
  if (action === "buy") {
    if (typeof frame.row === "string" && !inStock(z, frame.row)) {
      return sendTrade(z, session, "The keeper shakes his head — he isn't carrying that just now. It comes and goes; check back.");
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
      // Same preference as the typed path: the spare before the worn one.
      const looseC = candidates.filter((c) => !c.equipped);
      const pickC = looseC.length ? looseC : candidates;
      // Same fistful law as the typed path — the button should not need ten
      // clicks to spend a pocket of rat tails.
      const ordered = [...pickC.filter((c) => c.serial === null), ...pickC.filter((c) => c.serial !== null)];
      note = ordered.length ? await offerFistful(z, session, ordered, src) : "You've nothing more like that to offer.";
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
  // Don't re-narrate the room you never left; a quiet line, same as the bench.
  if (z.world!.entryRooms.has(session.roomId)) {
    session.stepText = true;
    z.send(session, "You step back from the keeper's hatch.");
    await z.sendGateCtx(session); // a trade may have spent tender — refresh the chips
    return;
  }
  session.away = false;
  z.roomFeed(session.roomId, `${session.name} steps back from the hatch.`, session.pubkey, false);
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
        id: s.itemId, name: t.name, rarity: t.rarity, slot: t.slot, cost: s.cost, kind: kindOf(t),
        stat: z.itemStat(t).replace(/^ \(|\)$/g, ""),
      } : null;
    })
    .filter((s) => s !== null);
  // WHAT HE ISN'T CARRYING (rome, 2026-08-07). A third of the rotating catalog
  // is off the shelf at any moment, and dropping it silently meant an absent
  // thing and a thing that never existed looked identical — the shop read
  // smaller than it is and nothing told you to come back. Named and dimmed, with
  // no price and no button: it's a shelf you can't buy from, not a bare shelf.
  const gone = [...world.fenceStock]
    .filter((s) => !inStock(z, s.itemId))
    .sort((a, b) => a.cost - b.cost)
    .map((s) => {
      const t = world.itemTemplates.get(s.itemId);
      return t ? { id: s.itemId, name: t.name, rarity: t.rarity, slot: t.slot, kind: kindOf(t) } : null;
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
    const goods = new Map<string, { id: string; name: string; rarity: string; slot: string; kind: string; n: number }>();
    for (const c of pool) {
      const t = world.itemTemplates.get(c.itemId);
      if (!t || (t.barter ?? 0) <= 0) continue;
      if (c.equipped) continue; // what you're wearing isn't stock (rome, 2026-07-30) — take it off first, same law as 'drop'
      let g = goods.get(t.id);
      if (!g) { g = { id: t.id, name: t.name, rarity: t.rarity, slot: t.slot, kind: kindOf(t), n: 0 }; goods.set(t.id, g); }
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
    stock, gone, goods, want,
  };
  try { session.ws.send(JSON.stringify(payload)); } catch {}
}

// ---- the bench's vice: break gear to scrap (salvage), mend wear (repair) ----

// Break a piece of gear down in the bench vice. Shared by the typed command
// and the bench modal; returns the line to show either way.
export async function salvageCore(z: ZoneDO, session: Session, carried: CarriedItem): Promise<string> {
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  if (tmpl.id === "loose-rock" || tmpl.id === "hammerstone") return "It's a rock.";
  // The renewable rusted pick gives no scrap — the vice would be a bottomless
  // iron faucet otherwise (take → salvage → wait → repeat). More rust than metal.
  if (NO_SALVAGE.has(tmpl.id)) return `The vice can make nothing of ${tmpl.name} — it's more rust than metal, not worth the pulling.`;
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
  gatehouseFeed(z, `${session.name} works the bench vice, breaking steel.`, session.pubkey); // gatehouse work stays in the gatehouse
  z.sendCtx(session);
}

// Smelt scrap into iron: SMELT_SCRAP_PER_IRON scrap -> 1 iron bar. 'smelt' casts
// one; 'smelt N' casts N; 'smelt all' casts as many as the scrap allows. The
// brazier reaches the pack AND the gate's keeping, same as forge/salvage.
export async function cmdSmelt(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const bar = z.benchGuard(session, "smelting");
  if (bar) return z.send(session, bar);
  const shut = worksBar(z, session);
  if (shut) return z.send(session, shut, "evt");
  const walkedIn = !z.outOfWorld(session);
  throughTheDoor(z, session); // the brazier is inside — the door comes first
  z.enterStep(session, "forging");
  if (walkedIn) z.send(session, "You push in out of the cold and stir the brazier to life.");
  if (!z.packRoom(session, IRON_ID)) {
    return z.send(session, `Your pack is full (${PACK_CAP} slots). Make room before you smelt.`);
  }
  const scrap = z.countLooseIn(await z.gatePools(session), SCRAP_ID);
  const maxBars = Math.floor(scrap / SMELT_SCRAP_PER_IRON);
  if (maxBars < 1) {
    return z.send(session, `Smelting a bar of iron takes ${SMELT_SCRAP_PER_IRON} scrap; you have ${scrap} between pack and keeping.`);
  }
  let bars = 1;
  if (arg) {
    const want = arg.trim().toLowerCase() === "all" ? maxBars : parseInt(arg, 10);
    if (Number.isFinite(want) && want >= 1) bars = Math.min(want, maxBars);
  }
  await z.takeLooseAcross(session, SCRAP_ID, bars * SMELT_SCRAP_PER_IRON);
  for (let i = 0; i < bars; i++) {
    const id = uuid();
    await insertLoot(z.env.DB, id, session.pubkey, IRON_ID, null);
    session.items.push({ rowId: id, itemId: IRON_ID, serial: null, equipped: false, condition: 100 });
  }
  gatehouseFeed(z, `${session.name} works the bellows, smelting scrap down to iron.`, session.pubkey);
  z.send(session, `You rake the scrap into the brazier and work the bellows white-hot. ${bars === 1 ? "A bar" : bars + " bars"} of iron, cast and cooling — ${bars * SMELT_SCRAP_PER_IRON} scrap spent.`, "forge");
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
      lines.push(`The gate's cold iron takes the measure of ${z.gearName(tmpl.id)} — sealed. (mint #${serial})`);
    }
    lines.push("Sealed is TITLE, not armor: carried, it dies with you. Only the gate\u2019s lockbox and vault keep what death cannot.");
    z.send(session, lines.join("\n"));
    // Sealing behind the door is the gatehouse's business; at the open gate, the room's.
    if (z.outOfWorld(session)) gatehouseFeed(z, `${session.name} presses a claim at the gate. Iron hums.`, session.pubkey);
    else z.roomFeed(session.roomId, `${session.name} presses a claim at the gate. Iron hums.`, session.pubkey, false);
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
      // Block a second step-out only when you're crouched OUTSIDE the gatehouse
      // (a dungeon or a gate crouch). Standing inside the gatehouse the bench is
      // a fixture in reach, so opening it there is a lateral, always allowed.
      if (session.away && !z.inGatehouse.has(session.pubkey)) return;
      if (z.inCombat(session)) {
        return z.send(session, "Not while something is trying to kill you.");
      }
      // Opening your pack is a CROUCH, not a door: you sort in place and stand
      // back up right where you were — at a gate OR in the dungeon. It is NOT a
      // step into the gatehouse (rome, 2026-07-17: the inventory chip was walking
      // you in). Your pack is your own kit, not the keeper's counter — barter and
      // the forge still take you through the door, but the bench doesn't. The
      // vault and seal still show and work at a gate: the modal reads that off
      // your room, not off your being inside. The one exception: if you're
      // ALREADY in the gatehouse (walked in, or stepped over from the hatch), the
      // bench is a lateral there and closing keeps you by the fire.
      if (z.inGatehouse.has(session.pubkey)) {
        z.enterStep(session, "sorting"); // lateral to the fixture, still by the fire
      } else {
        enterBench(z, session); // a crouch in place — gate or dungeon, never the door
      }
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
    const KNOWN = new Set(["stash", "vault", "seal", "take", "equip", "remove", "burn", "drop", "salvage", "repair", "stow", "fetch"]);
    if (!KNOWN.has(action) || !rows.length) return;
    const gateOnly = "That's the gatehouse's work — reach a gate for the vault and the seal.";
    const one = async (row: string): Promise<string | undefined> => {
      if (action === "stash") return benchStore(z, session, row, "lockbox");
      if (action === "vault") return atGate ? benchStore(z, session, row, "vault") : gateOnly;
      if (action === "seal") return atGate ? benchSeal(z, session, row) : gateOnly;
      if (action === "take") return benchTake(z, session, row);
      // The den's shelf, from the same box. den.ts owns the law; this only routes.
      if (action === "stow") return den.benchStow(z, session, row);
      if (action === "fetch") return den.benchFetch(z, session, row);
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
    // TWO_HANDED steel wants both hands — the same refusal cmdEquip gives,
    // missing here until now (rome, 2026-07-22: the modal let a two-handed
    // weapon and a shield both read "equipped" at once — real inconsistent
    // state, not just a display bug, since block/load-law would both fire).
    if (tmpl.slot === "weapon" && hasTrait(tmpl, "two-handed") && z.equippedItem(session, "shield")) {
      return `${tmpl.name[0].toUpperCase()}${tmpl.name.slice(1)} wants both hands — put up your shield first.`;
    }
    if (tmpl.slot === "shield") {
      const inHand = z.equippedItem(session, "weapon");
      if (inHand && hasTrait(inHand.tmpl, "two-handed")) {
        return `Both your hands are full of ${inHand.tmpl.name}. Lower it first.`;
      }
    }
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
      // And the den's shelf, now that it is a column of this modal — otherwise
      // the burn button sitting on every shelf row would refuse every time.
      if (!carried) {
        const shelf = await den.shelfHere(z, session);
        carried = shelf?.held.find((c) => c.rowId === row);
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
    // A crouch in place — at a gate OR in the dungeon (rome, 2026-07-17: opening
    // your pack is NOT a step into the gatehouse; only barter/forge take the
    // door). You duck aside to sort what you carry, still in the world and in
    // reach, and stand back up right where you were. The lockbox rides with you;
    // the vault/seal still work at a gate off your room. Rest survives the crouch
    // — healing pauses while stepped out, resumes on close.
    session.away = true;
    session.target = null;
    z.roomFeed(session.roomId, `${session.name} crouches to dig through a lockbox.`, session.pubkey, false);
    z.refreshRoomCtx(session.roomId);
  }

export async function leaveBench(z: ZoneDO, session: Session): Promise<void> {
    // Closing the pack NEVER re-narrates the room you're standing in — the same
    // quiet line whether you're by the fire or out in the world (rome, 2026-07-15).
    // And it returns you exactly where you opened it: the pack is a modal, not a
    // door. Only 'in'/'out' moves you between the world and the gatehouse.
    session.sorting = false;
    try { session.ws.send(JSON.stringify({ v: 0, t: "bench", open: false })); } catch {}
    // "Am I behind the door?" is the DURABLE inGatehouse set, not a per-session
    // flag. A fray while the bench is open inside the gatehouse rebuilds the
    // session (benchInHouse lost), the reconnect restores `away` off inGatehouse,
    // and then closing the stale bench used to fall to the world branch below —
    // dropping `away` while inGatehouse stayed true: you'd hear the dungeon and
    // 'out' would swear you were already out (rome, 2026-07-19). inGatehouse
    // survives the fray (persisted, and the reconnect trusts it), so read that.
    if (z.inGatehouse.has(session.pubkey)) {
      // You opened it from INSIDE the gatehouse — you never left the fire. Stay
      // by it (still in text, the tavern still has you); just straighten up.
      session.stepText = true;
      z.send(session, "You straighten up, your kit sorted.");
      await z.sendGateCtx(session); // scrapping/burning at the bench may have moved your stock — refresh the chips
      return;
    }
    // You opened it out in the WORLD — at a gate, or crouched in the dungeon.
    // Straighten up right where you stand and rejoin the world; opening your pack
    // was never a step into the gatehouse.
    session.away = false;
    session.stepText = false;
    z.roomFeed(session.roomId, `${session.name} steps back, kit sorted.`, session.pubkey, false);
    await provokeGrudges(z, session, false); // the dungeon holds nothing here; no free hit for closing the bench
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
        if (z.torchCapped(session, entry.itemId)) return z.torchFullNote();
        if (z.dressingCapped(session, entry.itemId)) return z.dressingFullNote();
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

// Body-slot reading order — a worn set reads head-to-foot, and stowed gear of
// the same slot clusters instead of scattering.
const SLOT_RANK: Record<string, number> = { weapon: 0, shield: 1, helm: 2, armor: 3, cloak: 4, feet: 5 };

// One deterministic order for every bench column, so a stack always lands in the
// same place and the eye can find it (rome, 2026-07-18: "items are just out of
// order ... easy to lose track"). Kind first — worn gear, stowed gear,
// dressings, food, keys, tender, trophies — then gear by body-slot, then name,
// then seal serial so identical sealed pieces stay stable. The client's own
// section filters (ON YOU / IN THE PACK, BANKED / KEYS / FOOD / TROPHIES) ride
// on top of this and preserve it, so each section comes out sorted.
const kitRank = (e: any): number =>
  e.gear ? (e.equipped ? 0 : 1)
  : e.dressing ? 2 : e.food ? 3 : e.key ? 4 : e.trophy ? 6 : 5;
const sortKit = (arr: any[]): any[] => arr.sort((a, b) =>
  kitRank(a) - kitRank(b)
  || (a.slotRank ?? 9) - (b.slotRank ?? 9)
  || String(a.name).localeCompare(String(b.name))
  || (a.serial ?? 0) - (b.serial ?? 0));

export async function sendBench(z: ZoneDO, session: Session, note?: string): Promise<void> {
    const world = z.world!;
    const lockbox = await loadContainer(z.env.DB, session.pubkey, "lockbox");
    const vault = await loadContainer(z.env.DB, session.pubkey, "vault");
    const ser = (c: CarriedItem) => {
      const t = world.itemTemplates.get(c.itemId);
      const gear = z.isGear(c.itemId);
      return {
        row: c.rowId,
        name: z.displayName(c), // carries its rolled adjective, if any (099)
        rarity: t?.rarity ?? "common",
        slot: t?.slot ?? "",
        sealed: c.serial !== null,
        serial: c.serial,
        stack: z.stackable(c.itemId, c.serial, c.journalId),
        trophy: z.isTrophy(c.itemId), // cut off a body — not food, not a key, not tender
        key: z.isKey(c.itemId),       // opens something: a cache's key, or the heart
        food: !!t?.edible,            // something you can eat — its own vault shelf, apart from the banked wealth
        dressing: (t?.staunch ?? 0) > 0 && !t?.edible, // binds a wound — sorts with the healing kit
        slotRank: SLOT_RANK[t?.slot ?? ""] ?? 9,       // body-slot order for gear, so worn kit reads head-to-foot
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
        fresh: (t?.edible && !FOOD_KEEPS.has(c.itemId)) ? foodWord(c.acquiredAt, c.itemId) : "", // perishable food's age, "" while fresh (flavor)
        stat: z.itemStat(t).replace(/^ \(|\)$/g, ""),
        // What this COPY rolled (099). The name folds only the FIRST tag in, as
        // an adjective — which asks a player to notice a word that was not there
        // before, and hides a second tag entirely. The modal names them plainly.
        traits: [...(c.rolledMap?.keys() ?? [])],
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
    // THE DEN'S SHELF IS A COLUMN OF THIS MODAL when you are standing under a
    // roof you may keep things in (den.ts). Nothing else about the modal changes
    // — same box, same buttons — and it is gone the moment you step outside.
    const shelf = await den.shelfHere(z, session);
    const shelfRest = shelf ? z.slotsUsed(shelf.held.filter((c) => !z.isGear(c.itemId)), "lockbox") : 0;
    const payload = {
      v: 0, t: "bench", open: true, note: note ?? "",
      sheet: z.sheetFor(session), // the paperdoll: gear worn + the combat math it adds up to
      atGate: world.entryRooms.has(session.roomId), // vault + seal only shown at a gate
      // The shelf's own accounting is unlike every other column's, because its
      // law is unlike theirs: gear on it is UNLIMITED and everything else is
      // capped, so it reports two numbers rather than one out of a ceiling.
      den: shelf ? 1 : 0,
      denName: shelf ? z.world!.rooms.get(shelf.den.roomId)!.name : "",
      shelf: shelf ? sortKit(group(shelf.held)) : [],
      shelfGear: shelf ? shelf.held.filter((c) => z.isGear(c.itemId)).length : 0,
      shelfRest, denCap: DEN_CAP,
      pack: sortKit(group(session.items)),
      lockbox: sortKit(group(lockbox)),
      vault: sortKit(group(vault)),
      packCap: PACK_CAP, lockboxCap: LOCKBOX_CAP, vaultCap: VAULT_CAP,
      // Slot accounting is the SERVER's now, for every column: food rides free in
      // the pack, stacks 8-to-a-slot in the lockbox, and rides free in the vault —
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
    // Banking at a gate happens behind the door (gatehouse); a mid-dungeon lockbox
    // crouch happens in the open. The witnesses follow: gatehouse folk, or the room.
    if (z.outOfWorld(session)) gatehouseFeed(z, `${session.name} ${cfg.feed}`, session.pubkey);
    else z.roomFeed(session.roomId, `${session.name} ${cfg.feed}`, session.pubkey, false);
    z.sendCtx(session);
  }

// ---- the dying hand ----
// Death drops everything carried, sealed included; that law does not move. What
// moves is ONE reflex before the dark: a wanderer going down shoves their chart
// and their book into the lockbox, and the box keeps what the stones would have
// taken.
//
// WHY THESE TWO AND NOTHING ELSE. Gear is replaceable, and losing it is the
// whole wager of a run — a sword costs a sword. A surveyor's map and a hunter's
// journal aren't loot, they're a RECORD, written a room and a kill at a time
// across many delves, and there is no counter anywhere that sells the hours
// back. Losing a half-inked chart costs you every descent that inked it.
//
// It is not free and it is not a promise:
//   - the lockbox must have a free slot. A full box saves nothing, and that is
//     the wanderer's own housekeeping, not the dungeon going soft.
//   - ONE chart and ONE book, the fullest of each. The reflex is for the record
//     you have been keeping, not a mule-load of spare copies ferried through
//     death.
//   - the room WATCHES it happen, so a killer standing over the body knows why
//     the chart isn't in the spill. The mercy is visible, not a silent theft
//     from whoever won the fight.
//
// "Fullest" is measured in the work that went into it, not in trade value.
async function chartWork(z: ZoneDO, victim: Session, c: CarriedItem): Promise<number> {
  // A finished chart holds no ink at all — it is complete by definition (mig
  // 182), so it outranks any partial copy.
  if (c.itemId === FULL_MAP) return Number.MAX_SAFE_INTEGER;
  if (!c.journalId) return 0; // a blank copy nobody has walked with yet
  const cached = victim.mapInk?.get(c.journalId);
  const inked = cached ? cached.size : (await mapInkLoad(z.env.DB, c.journalId)).length;
  // Ink is the measure; the surveyor's hand only breaks a tie against a crude
  // copy, which draws the same rooms and lies about some of them.
  return inked * 10 + (c.itemId === DETAILED_MAP ? 1 : 0);
}

async function bookWork(z: ZoneDO, c: CarriedItem): Promise<number> {
  if (!c.journalId) return 0;
  const rows = await journalLoad(z.env.DB, c.journalId);
  // Species recorded is the real measure of a book; kills logged breaks ties
  // between two books that have met the same number of things.
  return rows.length * 1000 + rows.reduce((n, r) => n + r.kills, 0);
}

export async function deathStash(z: ZoneDO, victim: Session): Promise<string[]> {
  const world = z.world!;
  const charts = victim.items.filter((c) => MAP_ITEMS.has(c.itemId));
  // The book rail is the journalId minus the maps that share it (097) — same
  // test the kill-logger uses, so a new kind of book is covered the day it exists.
  const books = victim.items.filter((c) => c.journalId && !MAP_ITEMS.has(c.itemId));
  if (!charts.length && !books.length) return [];

  let chart: CarriedItem | null = null, chartBest = -1;
  for (const c of charts) {
    const w = await chartWork(z, victim, c);
    if (w > chartBest) { chartBest = w; chart = c; }
  }
  let book: CarriedItem | null = null, bookBest = -1;
  for (const c of books) {
    const w = await bookWork(z, c);
    if (w > bookBest) { bookBest = w; book = c; }
  }

  const held = await loadContainer(z.env.DB, victim.pubkey, "lockbox");
  const saved: string[] = [];
  // The chart goes in first when only one slot is left. A book fills wherever
  // you fight; a chart only fills where you WALK, and walking somewhere new is
  // the slower half of this world to redo.
  for (const c of [chart, book]) {
    if (!c) continue;
    // Both are loose, single-slot things — if the first won't fit, neither will
    // the second, and the stones get them the way they always did.
    if (!z.hasRoom(held, c.itemId, LOCKBOX_CAP, "lockbox")) break;
    victim.items.splice(victim.items.indexOf(c), 1);
    c.equipped = false;
    await setContainer(z.env.DB, c.rowId, "lockbox"); // container != '' — the death sweep no longer deletes the row
    held.push(c);
    saved.push(world.itemTemplates.get(c.itemId)?.name ?? c.itemId);
  }
  return saved;
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
    if (z.torchCapped(session, entry.itemId)) return z.send(session, z.torchFullNote());
    if (z.dressingCapped(session, entry.itemId)) return z.send(session, z.dressingFullNote());
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
// THE KEEPER LOOKS UP (zone-data.KEEPER_NODS). Called on a real entry through
// the door, never on a lateral step to the hatch or the bench — he notices the
// DOOR, not you moving about a room he already knows you are in.
//
// It is deliberately a room line and not a line to the arrival: he does not
// greet anybody, and the person who just walked in reads it the same way as
// everyone already sitting there. That is the difference between a barman and
// a doorman, and it is the whole of what rome asked for when he said "soft".
export function keeperNods(z: ZoneDO, arrival: Session): void {
  const now = Date.now();
  if (now - z.keeperNodAt < KEEPER_NOD_EVERY_MS) return; // one room, one gesture at a time
  if (!chance(KEEPER_NOD_ODDS)) return;                  // and mostly, nothing
  z.keeperNodAt = now;
  // Anyone else already behind the door? Then the room is what he is minding,
  // and the door only gets the corner of his eye.
  const others = gatehouseFolk(z).filter((s) => s.pubkey !== arrival.pubkey).length;
  const line = pick(others > 0 ? KEEPER_NODS_BUSY : KEEPER_NODS);
  // "amb" is right here and wrong for his STORY: a gesture is scenery and may be
  // hushed for a new player under the tutorial, where losing the opening line of
  // a region's telling would be a real loss (see lore.keeperTells).
  for (const s of gatehouseFolk(z)) z.send(s, line, "amb");
}

export function gatehouseFolk(z: ZoneDO): Session[] {
  return [...z.sessions.values()].filter((s) => z.outOfWorld(s));
}

// The tavern's only channel. In memory, over the sockets, gone when it's said.
export function gatehouseFeed(z: ZoneDO, text: string, exceptPubkey?: string, cls?: string, speaker?: { name: string; pk: string }): void {
  for (const s of gatehouseFolk(z)) {
    if (s.pubkey === exceptPubkey) continue;
    z.send(s, text, cls, speaker);
  }
}

export function gatehouseSay(z: ZoneDO, session: Session, raw: string): void {
  const msg = raw.trim().slice(0, 240);
  if (!msg) return;
  const line = `${session.name} says: ${msg}`;
  z.send(session, `You say: ${msg}`, "say");
  gatehouseFeed(z, line, session.pubkey, "say", { name: session.name, pk: session.pubkey });
  // The room hears it over the sockets, instantly — and that's the whole of
  // it now (rome, 2026-07-21), same drop as `say` out in the dark: no "gpub"
  // frame back to the speaker's client, nothing reaches a relay in any form.
}

// ---- THE BOARD ----
//
// Notices weather off after a week. Pruned on every read and every write rather
// than on a clock: the board is only ever looked at from in here, so there is
// nothing to sweep in the background and nothing to get out of step.
function boardLive(z: ZoneDO): { name: string; words: string; at: number }[] {
  const cut = Date.now() - BOARD_LIFE_MS;
  if (z.board.some((n) => n.at <= cut)) z.board = z.board.filter((n) => n.at > cut);
  return z.board;
}

// How old a notice is, in the only precision that matters. A warning's age is
// most of its worth — "the woodward's moved west" is worth acting on today and
// worth nothing next week — so every line wears its age where you can't miss it.
function boardAge(at: number): string {
  const mins = Math.floor((Date.now() - at) / 60_000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} minutes back`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "an hour back" : `${hours} hours back`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "a day back" : `${days} days back`;
}

// How many notices are actually readable right now — the chip builder is
// synchronous and must not be the thing that prunes, so it only counts.
export function boardCount(z: ZoneDO): number {
  const cut = Date.now() - BOARD_LIFE_MS;
  return z.board.reduce((n, x) => n + (x.at > cut ? 1 : 0), 0);
}

export function boardRead(z: ZoneDO, session: Session): void {
  const live = boardLive(z);
  if (!live.length) {
    return z.send(session, "A square of cork and boards by the hatch, studded all over with old pin-holes and holding nothing at all. Whatever was on it has been taken down or rotted off. ('post <words>' to pin one up)", "study");
  }
  const lines = [`Pinned to the board by the hatch, the newest at the top:`];
  const newestFirst = [...live].reverse();
  newestFirst.forEach((n, i) => {
    lines.push(`  ${i + 1}. "${n.words}"`);
    lines.push(`     — ${n.name}, ${boardAge(n.at)}`);
  });
  lines.push(`(${live.length} of ${BOARD_CAP}. 'post <words>' pins one; 'tear <number>' takes one down. Nothing here is checked by anybody.)`);
  z.send(session, lines.join("\n"), "study");
}

export async function boardPost(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const words = arg.replace(/[\r\n\t]+/g, " ").replace(/"/g, "'").trim();
  if (!words) return z.send(session, `Post what? ('post <words>', up to ${BOARD_MAX_LEN} characters)`);
  if (words.length > BOARD_MAX_LEN) {
    return z.send(session, `${words.length} characters, and the scrap of paper takes ${BOARD_MAX_LEN}. Say it shorter.`);
  }
  const live = boardLive(z);
  live.push({ name: session.name, words, at: Date.now() });
  // The board is finite. A new notice crowds the oldest off the bottom — which
  // is the only pressure on it besides the week, and it means a busy board
  // forgets faster than a quiet one, exactly like a real one does.
  const crowded = live.length > BOARD_CAP ? live.splice(0, live.length - BOARD_CAP) : [];
  z.board = live;
  z.send(session, `You pin it up where it will be read: "${words}"`
    + (crowded.length ? ` The oldest notice comes down to make the room — ${crowded[0].name}'s, and nobody will miss it.` : ""), "study");
  gatehouseFeed(z, `${session.name} pins something to the board.`, session.pubkey);
  await z.persist();
}

export async function boardTear(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const live = boardLive(z);
  if (!live.length) return z.send(session, "There is nothing on the board to take down.");
  const n = parseInt(arg.trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > live.length) {
    return z.send(session, `Tear which? They are numbered on the board — 'tear 1' through 'tear ${live.length}'.`);
  }
  // Numbered as READ: newest first. The list underneath is oldest-first.
  const gone = live[live.length - n];
  z.board = live.filter((x) => x !== gone);
  // ANYONE takes down ANYTHING. No ownership test on purpose — see zone-data
  // BOARD_*: the decay and this are the whole moderation story, and a wall you
  // need permission to clean is not the room's wall, it is somebody's.
  const mine = gone.name === session.name;
  z.send(session, mine
    ? `You take your own notice back down and put it in the fire: "${gone.words}"`
    : `You pull it off the board, pin and all: "${gone.words}" — ${gone.name}'s. It goes in the brazier.`, "study");
  gatehouseFeed(z, `${session.name} tears something off the board and drops it in the fire.`, session.pubkey);
  await z.persist();
}

/**
 * THE FIXTURES OF THE GATEHOUSE. Everything describeGatehouse names, and the
 * handful of words a player reaches for when they mean the room itself.
 *
 * Returns null for anything that isn't here, which is what sends the line back
 * to being speech — the mouth is still the default, this only stops the room's
 * OWN furniture being shouted at the fire.
 */
function gatehouseFixture(z: ZoneDO, session: Session, target: string): string | null {
  const t = target.toLowerCase().replace(/^(the|at|a)\s+/, "").trim();
  const is = (...words: string[]) => words.includes(t);

  // The wall chart. 'carve' and 'study' answer here too: the room's own line
  // names those two words, so they are what a player types when they mean the
  // wall — and being told to say them out loud instead is a small insult.
  if (is("wall", "chart", "wall chart", "plaster", "frame", "carve", "study", "marks", "scratches")) {
    const marks = [...z.wallOf(session.pubkey)].filter((r) => z.world!.rooms.has(r)).length;
    return marks === 0
      ? "A stretch of the wall by the door, plastered smooth and scored with an empty frame — corners, a scale, and nothing inside them. Other hands have been at it: chalk over chalk, none of it yours, none of it legible to you. Your own corner is bare. ('carve' what you've walked)"
      : `Plaster gone grey with handling, layered over with other people's chalk — and inside it, in your own hand, ${marks} halls. You can read yours and only yours; the rest is somebody else's walking, and it may as well be weather. ('study' to read your chart; 'carve' to add what you've walked)`;
  }
  // THE MAN, not his shutter. `look keeper` answered with the hatch's own
  // description — a slab of banded oak — which is not what anybody means when
  // they look at the person they have been trading with for weeks.
  if (is("keeper", "barman", "him", "man", "landlord")) {
    // AND THE MAN IS HOW YOU FIND THE GAME (rome, 2026-08-12). The bones used to
    // announce themselves with a chip in the tray, which is the wrong way round
    // for this room: everything else in the gatehouse is discovered by looking at
    // it, and a game of dice is something you notice a barman keeps, not a button
    // the world hands you. So he carries it, and the bowl's own state does the
    // teaching — an empty bowl says plainly that he has nothing to put up.
    // AND HE TELLS YOU HOW IT IS PLAYED. Naming the game without the rules is
    // what the chip's removal left behind: you learned a game existed and then
    // had to guess at it, or type 'dice' and be dealt into a hand you did not
    // understand. He is the only place a first-timer will look, so the rules
    // live here, read from the one table that also feeds the bowl and the
    // opening cast (DICE_RULES).
    const bowl = z.keeperBowl.length
      ? `Under his elbow there is a shallow bowl with five old bones in it, and ${z.keeperBowl.length === 1 ? "a trophy" : `${z.keeperBowl.length} trophies`} underneath them that he did not walk out and kill. He will roll you for them if you ask.`
      : "Under his elbow there is a shallow bowl with five old bones in it and nothing else. He will roll you for nothing if you ask, though he has nothing to put up against a stake just now.";
    return "You cannot see much of him and you never have: the hatch is at chest height and shut, and what shows is a pair of forearms, a rag going round the inside of a cup, and the top of a head bent over work that does not need doing. "
      + "He knows the sound of the door. He has never once asked your name, and he has never once got your order wrong.\n"
      + bowl + "\n"
      + DICE_RULES.map((l) => "  " + l).join("\n") + "\n"
      + "  'dice' takes them up against him for nothing; 'dice <trophy>' stakes one against his bowl.";
  }
  if (is("hatch", "shutter", "keepers hatch", "keeper's hatch", "counter")) {
    return "A shutter of banded oak set into the far wall at chest height, closed. There is a worn place on the sill where hands have rested, and a deeper one where things have been slid across. Whoever is behind it does not open it to be looked at. ('barter' opens it)";
  }
  if (is("board", "notices", "notice", "cork", "notice board", "posts")) {
    const live = boardLive(z);
    return live.length === 0
      ? "A square of cork and old boards hung beside the hatch, studded all over with pin-holes and holding nothing. ('post <words>' to pin one up)"
      : `A square of cork and old boards beside the hatch, ${live.length === 1 ? "holding a single notice" : `shingled with ${live.length} notices`}, pinned over each other at every angle. ('board' to read them)`;
  }
  if (is("bench", "seat")) {
    return "A long bench under the hatch, worn to a shine down the middle and gouged all along the front edge — a hundred people's boots, and a hundred people's knives, waiting for the same shutter to open.";
  }
  // The bones. 'dice' answers here for the same reason 'carve' does: the bowl is
  // named in the room, so it has to answer to being looked at.
  if (is("bones", "dice", "bowl", "gaming bowl", "wooden bowl")) {
    const bowl = z.keeperBowl.length;
    return "A shallow wooden bowl on the end of the bench with five old bones in it, yellowed and worn round at the corners, each one pipped by hand and none of them quite matching. "
      + (bowl === 0
        ? "There is nothing else in the bowl. Whatever the keeper had, somebody has already won it off him."
        : `Underneath them, ${bowl === 1 ? "one trophy" : `${bowl} trophies`}, cut off things that are dead and lost by people who sat where you are sitting.`)
      + " ('dice' to take them up)";
  }
  if (is("brazier", "coals", "fire", "flame", "embers", "hearth")) {
    return "An iron basket on three legs, standing in a dish of its own ash. The coals are low and orange and somebody keeps them that way — there is a scuttle beside it that never seems to empty. It is the only heat on this side of the door.";
  }
  if (is("door", "old door", "very old door", "dungeon", "gate")) {
    return "Oak that has gone almost black, banded and studded, hung in a frame far older than the boards. It is shut, and it is not locked — it does not need to be. Everything on the other side of it is the reason you came in here. ('out' opens it)";
  }
  if (is("room", "here", "around", "gatehouse", "inside", "place")) {
    return describeGatehouse(z, session);
  }
  return null;
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
  const marks = [...z.wallOf(session.pubkey)].filter((r) => z.world!.rooms.has(r)).length;
  lines.push(marks === 0
    ? "By the door, a stretch of wall plastered smooth and scratched over with other people's chalk — none of it in a hand you can read. Your own corner is bare. ('carve' what you've walked)"
    : `By the door, the wall chart — and ${marks} halls of it are yours. ('study' it; 'carve' to add what you've walked)`);
  // The board, beside the hatch. Only spoken of when it has something on it: an
  // empty board is furniture, and the room already has enough of that.
  const notices = boardLive(z).length;
  if (notices > 0) {
    lines.push(notices === 1
      ? "One notice hangs on the board beside the hatch, pinned at a corner. ('board' to read it)"
      : `The board beside the hatch carries ${notices} notices, pinned over one another. ('board' to read them)`);
  }
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
export async function enterGatehouse(z: ZoneDO, session: Session): Promise<void> {
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
  // THE WORKS. Boarded over, and it stays boarded until they're done — checked
  // BEFORE the idempotent re-show below, but after it, in the sense that a
  // player already inside is never thrown out by their own 'in' (worksBar reads
  // outOfWorld and stands down).
  const boarded = worksBar(z, session);
  if (boarded) return z.send(session, boarded, "evt");
  // Already behind the door — 'in' is idempotent, just re-show it. Re-assert
  // `away` here too, so if the flag had drifted false under inGatehouse this
  // heals it (outOfWorld already trusts inGatehouse; this re-syncs the rest).
  if (z.outOfWorld(session)) { session.away = true; z.send(session, describeGatehouse(z, session)); return z.sendGateCtx(session); }
  z.enterStep(session, "gatehouse");
  z.sendStatus(session); // the HUD title becomes "The Gatehouse" the moment you're inside
  z.send(session, describeGatehouse(z, session));
  gatehouseFeed(z, `${session.name} pushes in out of the cold.`, session.pubkey, "who");
  keeperNods(z, session);
  await z.sendGateCtx(session); // seed the smelt/cure chip availability on entry
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
  // first word (i / in / out / who / rest…) hijacking the message.
  // Judge that on the RAW text, not the parsed arg: the parser strips filler
  // words ("this", "that", "the"), so "smoke this" would otherwise arrive as a
  // bare `smoke` and light one when the player plainly meant to SAY "smoke this".
  // If ANY word follows the verb as typed, it's speech.
  const rawTail = text.trim().split(/\s+/).slice(1).join(" ");
  if (GATEHOUSE_NOARG.has(v) && rawTail !== "") return gatehouseSay(z, session, text);
  if (v === "enter") return z.send(session, "You're already inside.");
  if (v === "look") {
    const target = cmd.arg.trim();
    // Bare 'look' takes in the room. With a name, look at whoever's by the fire:
    // the gate roomId is shared, but gatehouse folk are OUT of the world, so the
    // dungeon's own player-lookup skips them — the fire keeps its own roll-call.
    if (!target) return z.send(session, describeGatehouse(z, session));
    // Yourself, same as out in the dark. It was the world's look that answered
    // this and the world's look never runs in here.
    if (/^(self|me|myself)$/i.test(target)) return z.send(session, selfExamine(z, session), "study");
    const who = gatehouseFolk(z).find((s) => s.pubkey !== session.pubkey && nameMatches(s.name, target));
    if (who) return z.send(session, describePlayer(z, session, who), "study");
    // A PERSON BEATS A THING IN YOUR POCKET. Your own kit is read before the
    // room's fixtures on purpose (a bar of forge iron in the vault should answer
    // `look forge` before the brazier does) — but that rule put an item called a
    // keeper's wrap in front of the keeper himself, and no wanderer typing
    // `look keeper` in a room with a man in it means their laundry.
    // Nobody keeps a person in their lockbox, so the man is looked up first;
    // every other fixture keeps the old order.
    if (/^(the\s+)?(keeper|barman|landlord)$/i.test(target.trim())) {
      const man = gatehouseFixture(z, session, target);
      if (man) return z.send(session, man, "study");
    }
    // Then your own things: at a gate the pack, lockbox and vault are all at your
    // elbow, so 'look flanged mace' reads it wherever you keep it.
    const item = await lookKeepingItem(z, session, target);
    if (item) return z.send(session, item, "study");
    // THE ROOM'S OWN THINGS. The gatehouse describes a hatch, a bench, a
    // brazier, a very old door and a wall chart, and until now not one of them
    // could be looked at: every `look keeper` and `look door` fell through to
    // the mouth and got said out loud instead (rome, 2026-08-09). A room that
    // names a thing has to answer for it.
    //
    // Read AFTER your own kit on purpose, so a name you own always wins — a bar
    // of forge iron in the vault answers `look forge` before the brazier does.
    const fixture = gatehouseFixture(z, session, target);
    if (fixture) return z.send(session, fixture, "study");
    // "look at his hair" — extra words that name nobody and nothing here weren't
    // a command. Say them.
    return gatehouseSay(z, session, text);
  }
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
  // The board: the one thing said in here that outlives the saying. `post` and
  // `tear` take arguments so they must stay OUT of GATEHOUSE_NOARG (an explicit
  // command has to run, not be eaten as chat); bare `board` is IN it, so "board
  // up that door" is a sentence and not a read.
  if (v === "board") return boardRead(z, session);
  if (v === "post") return boardPost(z, session, cmd.arg);
  if (v === "tear") return boardTear(z, session, cmd.arg);
  // THE FIRE'S REST: 'rest' in here is its own kind — a deliberate doze by the
  // fire, truly safe, and wounds close at double time (FIRE_REST_REGEN_PER_TICK;
  // the dungeon's cold-stone rest keeps the slow rate and the open eye). Never
  // routed to cmdRest: that one reads the gate ROOM for menaces — a rat out by
  // the arch must not stop a nap that's behind a very old door.
  if (v === "rest") {
    if (session.resting) return z.send(session, "You're already settled in by the fire. Let it do its work.");
    session.resting = true;
    const hurt = session.hp < session.maxHp;
    z.send(session, hurt ? pick([
      "You drag a bench closer to the fire and let the warmth take the weight off. Wounds close quicker here than cold stone ever let them.",
      "You settle in by the coals, boots stretched to the heat, and let yourself actually sleep. The mending comes easy by a fire.",
      "You fold your coat for a pillow and doze by the brazier. Warmth does what the dark never would — the hurt unknots fast.",
    ]) : pick([
      "Nothing to mend, but the fire doesn't care. You settle in beside it and doze anyway.",
      "You stretch out by the coals, whole and warm, and let the fire tick you to sleep.",
      "You put your feet to the brazier and drift. In here, sleep costs nothing.",
    ]), "gain");
    gatehouseFeed(z, `${session.name} settles in by the fire to doze.`, session.pubkey);
    return;
  }
  if (GATEHOUSE_BARRED.has(v)) {
    return z.send(session, "Not from in here — the dungeon is on the other side of that door. ('out' to step back into it.)");
  }
  await z.dispatch(session, cmd); // bench, vault, forge, hatch, kit, keys, the lot
  // Any of those may have changed the scrap/meat you hold (smelt, cure, salvage,
  // bank) — refresh the smelt/cure chip availability and re-push chips so they
  // never linger offering a deed you can no longer do.
  if (z.outOfWorld(session)) await z.sendGateCtx(session);
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
  z.send(session, `You lean in to ${target.name}: ${msg}`, "tell");
  z.send(target, `${session.name} leans in, close, and says quietly: ${msg}`, "tell", { name: session.name, pk: session.pubkey });
  // Their key, their eyes only. The speaker's client seals it and puts it out.
  z.tellOut(session, target.pubkey, msg);
}

// ---- THE WALL CHART: the players' own map ----
// The wall starts as bare plaster. Every wanderer who walks out and makes it
// back can 'carve' what they walked into it, and anyone can
// 'study' it and take the marks onto their own map. The dungeon gets charted,
// over weeks, by the people who died learning it — somebody's last run becomes
// the next arrival's first advantage.
//
// ONE law keeps it honest:
//   TESTIMONY, NOT INK — you can only set down rooms the server saw you stand
//   in this walk (session.visited). There is no freehand; the wall cannot lie.
//
// THE SECOND LAW IS GONE (rome, 2026-08-11: the wall should be fully markable,
// not just the gates). It used to read THE SHALLOW RING ONLY — the gates and
// the two doors behind them — on the reasoning that the deep was the
// surveyor's territory forever and the keeper had to keep eating.
//
// That was written when the world was the fortress and a ring two doors deep
// was a real fraction of it. It is now 744 rooms across six bands, and the
// ring covers a few dozen of them: the wall had stopped being a chart and
// become a doormat, and no amount of carving could ever change that. A
// communal map that cannot record the road, the wood, the Crossing or the
// deep is not a map anybody would walk to a gatehouse to read.
//
// What protects the keeper's trade is not a fence around the wall — it is what
// the wall COSTS. Every mark on it is somebody's walk, made in person, and
// survived: nobody carves the deep who has not come back out of the deep. A
// surveyor's map is bought in one transaction; this one is paid for in weeks,
// by everyone, and it is only ever as good as the people still walking.
export function wallGround(z: ZoneDO): Set<string> {
  return new Set(z.world!.rooms.keys());
}

export async function wallCarve(z: ZoneDO, session: Session): Promise<void> {
  const ring = wallGround(z);
  // Only what YOU walked THIS session — the wall takes testimony, not hearsay.
  // (A returning player re-walks before they can carve: what you set down is
  // what you remember from this walk, not a rumor of an old one.)
  const mine = z.wallOf(session.pubkey);
  const fresh = [...z.walkedOf(session.pubkey)].filter((r) => ring.has(r) && !mine.has(r));
  if (!fresh.length) {
    return z.send(session, mine.size
      ? "You read your memory against your own corner of the wall. Every hall you walked this time is already scratched there, in your hand."
      : "Bare plaster, and nothing walked yet worth setting down. Walk, come back alive, and carve what you found.");
  }
  for (const r of fresh) mine.add(r);
  // STRAIGHT TO D1, BEFORE ANYTHING ELSE CAN GO WRONG (mig 210). The marks used
  // to live only in the world's sim blob, which is why they have been lost
  // twice. One row per hall, append-only, in the database that holds the rest
  // of what a player owns — and a reseed does not touch it.
  await z.saveWall(session.pubkey, fresh);
  z.send(session, `You take up a nail and set down what you walked — ${fresh.length} hall${fresh.length === 1 ? "" : "s"} your chart did not have. It is yours: nobody else reads this hand, and you will not read theirs.`);
  gatehouseFeed(z, `${session.name} scratches at the wall chart, adding to their own hand.`, session.pubkey);
  await z.persist();
}

export function wallStudy(z: ZoneDO, session: Session): void {
  const world = z.world!;
  const ring = wallGround(z);
  // Filter against BOTH the ring and the live world: a migration that re-hangs
  // a corridor may pull an old mark out of the ring, and it just quietly ages
  // off the chart rather than lying.
  const marked = [...z.wallOf(session.pubkey)].filter((r) => ring.has(r) && world.rooms.has(r));
  if (!marked.length) {
    return z.send(session, "You find your own corner of the plaster, and it is bare — a frame scratched around nothing, waiting on you. Walk out, come back, and 'carve' what you found.");
  }
  // The same frame a real map sends, built the same way — truth, no lies —
  // but holding only what's been carved. Exits are drawn only between marked
  // rooms: the wall never names a hall nobody set down.
  const shown = new Set(marked);
  // THE WALL KNOWS THE NEW BANDS TOO (rome, 2026-08-02: "you broke the study
  // and carve features of the map inside the gatehouse").
  //
  // This table was the fortress's six keys and — unlike the surveyor's map,
  // which has always had a `?? regions.upper` fallback — an unguarded index, so
  // an unknown band threw and `study` came back "the dungeon stumbles."
  // Road and wood rooms have been carveable since the doors spread, and one of
  // them on the chart was enough to break the whole wall. Both halves are fixed
  // here — the missing bands, and the guard that means a band nobody has
  // written yet can never throw again. That guard matters more than ever now
  // that the wall takes the whole world (wallGround): every band can reach it.
  const regions: Record<string, { key: string; label: string; rooms: any[] }> = {
    gate: { key: "gate", label: "The Gates", rooms: [] },
    out: { key: "out", label: "The Open Ground", rooms: [] },
    sky: { key: "sky", label: "The Overworks", rooms: [] },
    upper: { key: "upper", label: "The Halls", rooms: [] },
    warrens: { key: "warrens", label: "The Warrens", rooms: [] },
    deep: { key: "deep", label: "The Deep", rooms: [] },
    road: { key: "road", label: "The Roads", rooms: [] },
    wood: { key: "wood", label: "The Wood", rooms: [] },
    den: { key: "den", label: "The Dens", rooms: [] },
    mountain: { key: "mountain", label: "The Mountain", rooms: [] },
    // The wall chart needs the Crossing for the same reason the surveyor's map
    // does — and here it matters twice over, because the ferry house IS a gate,
    // so the shallow ring around it is nothing BUT crossing rooms.
    crossing: { key: "crossing", label: "The Crossing", rooms: [] },
  };
  for (const id of shown) {
    const room = world.rooms.get(id)!;
    const exits = (world.exits.get(id) ?? [])
      .filter((e) => shown.has(e.to_room))
      .map((e) => ({ dir: e.dir, to: e.to_room, toName: world.rooms.get(e.to_room)?.name ?? e.to_room }));
    // The wall chart is the WORST case for island-packing — the shallow ring
    // around eight gates in three bands is eight neighbourhoods that never
    // touch — so it wants the canonical grid most of all.
    const at = worldGrid(z).at.get(id);
    (regions[mapRegionOf(z, id)] ?? regions.upper).rooms.push({
      id, name: room.name, exits, here: id === session.roomId,
      gate: world.entryRooms.has(id) ? 1 : 0, // a door draws as a door on the wall too
      safe: world.safeRooms.has(id) && !world.entryRooms.has(id) ? 1 : 0, // ...and a bolthole as a bolthole
      band: MAP_BAND_OF[mapRegionOf(z, id)] ?? 1,
      q: MAP_QUARTERS[id], // the room's quarter — see the same field in lore.sendMap
      // (was WOOD_QUARTERS, which is a subset: the wall never captioned the east
      // road's four, the Crossing's seven or the open ground's four.)
      x: at?.x, y: at?.y,
    });
  }
  try {
    session.ws.send(JSON.stringify({
      v: 0, t: "map", detailed: 1, wall: 1, here: session.roomId,
      // Studied is kept: the marks light gold on your HUD, same law as a true map.
      reveal: marked.map((id) => world.rooms.get(id)!.name),
      bands: worldGrid(z).bands,
      regions: Object.values(regions).filter((r) => r.rooms.length),
    }));
  } catch {}
  z.send(session, `You study the wall chart — ${marked.length} hall${marked.length === 1 ? "" : "s"}, set down by whoever walked them. What you've read, you keep.`);
}
