// Fire and light, out of the spine (zone.ts stays tick/combat + transport).
// A torch is spent into the flame at once and burns TORCH_BURN_MS — an OPEN
// flame, so the fire-fear wakes to it (ai.carriesFire reads the same litUntil).
// A hooded lantern stays in the pack while it burns the fat in its well (one
// lump, LANTERN_FAT_MS, a torch three times over; three lumps to a full well),
// pays LANTERN_WEAR in tin and pane per lighting, is shuttered with what is
// left still in it, and its flame is TAME — the fire-fear sleeps through it. Either way the light lives in the shield hand:
// light, or guard — not both.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import * as events from "./events";
import { underCover } from "./detail";
import { setItemCondition, setItemFuel, removeItemRow, hasTrait } from "./world";
import type { CarriedItem } from "./world";
import {
  TORCH_ITEM, TORCH_BURN_MS, LANTERN_ITEM, LANTERN_FAT_MS, LANTERN_WELL_MS, LANTERN_WEAR, FAT_ITEM, BEACON_ROOM,
  brandBurnMs,
} from "./zone-data";

// ---- THE LANTERN'S WELL (rome, 2026-10-16; zone-data LANTERN_*) ----
// Lighting it moves the fat out of the well and into the flame (litUntil);
// shuttering it puts whatever is left back. So a lantern that leaves your hands
// alight - dropped, traded, stashed - takes only what was really still in it,
// and fat is never counted twice.
// A lantern on the floor keeps its fat beside its wear, under this key.
export function fuelKey(roomId: string): string {
  return `${LANTERN_ITEM}#fuel@${roomId}`;
}
// The lantern that is burning in your hand right now, if one is.
function litLantern(session: Session): CarriedItem | undefined {
  if (session.litSource !== "lantern" || !session.litUntil) return undefined;
  return session.items.find((c) => c.rowId === session.litRow) ?? session.items.find((c) => c.itemId === LANTERN_ITEM);
}
// How much is in this lantern's well, burning or not, in ms.
// The burning one is known by its row, so this holds even for a lantern that
// has just left the pack (the drop asks after it once it is already out).
export function wellOf(session: Session, c: CarriedItem): number {
  const burning = session.litSource === "lantern" && !!session.litUntil
    && (session.litRow ? session.litRow === c.rowId : c === litLantern(session));
  if (burning) return Math.max(0, session.litUntil! - Date.now());
  return c.fuel ?? 0;
}
// THE SHUTTER COMES DOWN: what the flame had not burned goes back into the well.
// Call it before clearing a lantern's light; it leaves the clearing to you.
export function saveWell(z: ZoneDO, session: Session): void {
  const c = litLantern(session);
  if (!c) return;
  c.fuel = Math.max(0, session.litUntil! - Date.now());
  setItemFuel(z.env.DB, c.rowId, c.fuel).catch(() => {});
}
// The well, said as a lantern-carrier would say it.
export function wellWords(ms: number): string {
  const lumps = ms / LANTERN_FAT_MS;
  return ms <= 0 ? "The well is dry."
    : lumps >= 2.75 ? "The well is full of fat."
    : lumps >= 1.75 ? "The well is two parts full."
    : lumps >= 0.75 ? "There is a lump's worth of fat in the well."
    : "There is a scrape of fat left in the bottom of the well.";
}

// A kindled light throws light until it gutters (litUntil). Read everywhere the
// dark matters: seeing a lightless room, and waking the fire-fear.
export function carriesLight(session: Session): boolean {
  return !!session.litUntil && Date.now() < session.litUntil;
}

// THE ONE GATE INTO A LIT HAND (rome, 2026-08-03: the light-a-torch path and the
// take-one-off-the-floor path were two different pieces of code, and only one of
// them had the rules). `light` refused to let you drop your guard mid-fight and
// told you what the flame cost; `get torch` set litUntil directly and checked
// nothing but your weapon hand, so you could pick a burning torch up in the
// middle of a fight and zero your own block in silence. Both doors come through
// here now. Returns the refusal, or null if your hand is free to take a light.
export function blockedFromLight(z: ZoneDO, session: Session): string | null {
  const weapon = z.equippedItem(session, "weapon");
  if (weapon && hasTrait(weapon.tmpl, "two-handed")) {
    return `Both your hands are full of ${weapon.tmpl.name} — no free hand for a light. Lower it first.`;
  }
  if (guardingShield(z, session) && z.inCombat(session)) {
    return "You can't drop your guard for a light while something wants your blood.";
  }
  return null;
}

// The shield that a flame costs you — one that is actually on your arm and
// actually blocks. A buckler with no block stat loses you nothing, so it should
// never be mentioned.
export function guardingShield(z: ZoneDO, session: Session) {
  const s = z.equippedItem(session, "shield");
  return s && s.tmpl.block > 0 ? s : null;
}

// What the flame costs, said the same way whichever door you came through.
//
// It also stopped claiming something untrue. The old line said you swung the
// shield ONTO YOUR BACK — but the shield is never unequipped (that was
// deliberate: a loose shield in the pack was getting lost), so your inventory
// went on calling it worn and the sheet went on showing 0% block, and all three
// surfaces disagreed. What is true is that it stays strapped and the hand that
// works it is full of fire.
export function guardNote(z: ZoneDO, session: Session, flame = "the light"): string {
  const shield = guardingShield(z, session);
  return shield
    ? ` (${shield.tmpl.name} stays on your arm, but the hand that works it is holding ${flame} — no guard until you 'equip shield'.)`
    : "";
}

// And the other way: a flame that ends gives the guard back, so say so. Silence
// here was the same bug from the far side — the block came back on the tick that
// killed the light and nothing told you.
export function guardBack(z: ZoneDO, session: Session): string {
  return guardingShield(z, session) ? " Your shield hand is free again." : "";
}

// Kindle a light. No arg lights the torch first, the lantern if you carry no
// torch; "light lantern" / "light torch" choose. One at a time either way.
export async function cmdLight(z: ZoneDO, session: Session, arg = ""): Promise<void> {
  // THE ROAD'S LAMP (2026-09-01). The stump's own text is an open wound: "a
  // light stood here to say where the road was after dark. Nothing says where
  // the road is after dark now." `light` the stump spends one of your torches
  // into the old socket, and the road has its light back for as long as it
  // burns — shared light, like any floor flame, and gone when it gutters.
  // THE PERCH (2026-09-04). The stump's sibling out on the water. Two things the
  // room already said do all the work: the spit is only walkable at low water,
  // and the cage is packed with two centuries of nest, which is the kindling.
  if (session.roomId === BEACON_ROOM && /^(the )?(beacon|perch|cage|tripod|fire)$/.test(arg.trim().toLowerCase())) {
    if (z.roomLit(session.roomId)) {
      return z.send(session, "The cage is already burning, and the whole crossing can see it.");
    }
    // The tide is the gate: the same rise that opens the wreck dives takes the
    // shingle spit away, and you are not swimming out to a fire you cannot light.
    if (events.seaUnder(z, session.roomId)) {
      return z.send(session, "The spit is under. The beacon stands off in open water with the tide round its legs, and there is no walking out to it until the sea goes back down.");
    }
    const torch = session.items.find((c) => c.itemId === TORCH_ITEM);
    if (!torch) {
      return z.send(session, "The cage is packed to the bars with old nest, dry as paper and waiting. It would take a flame — a torch, one of yours, and you would not need a second.");
    }
    session.items.splice(session.items.indexOf(torch), 1);
    await removeItemRow(z.env.DB, torch.rowId);
    z.groundTorch.set(session.roomId, Date.now() + TORCH_BURN_MS);
    z.send(session, "You go out along the spit and put the torch into the cage, and the nest takes all at once — two centuries of dry sticks going up in one breath. The tar catches after it. Behind you the whole channel comes up orange, and for the first time in living memory the crossing has a light on it.", "gain");
    z.roomFeed(session.roomId, `${session.name} fires the beacon, and the cage goes up in one breath.`, session.pubkey, false);
    // A beacon is FOR being seen. This is the one light a player lights for
    // other people — the whole band gets it, whether they asked or not.
    z.roomFeedBands(new Set([z.bandOf(session.roomId)]), "Far out on the water, the old beacon is burning — somebody is out on the causeway, and the whole channel knows it.", "evt");
    z.refreshRoomCtx(session.roomId);
    return;
  }
  if (session.roomId === "the-lantern-stump" && /^(the )?(lantern[- ]?stump|stump|lamp|socket|standard)$/.test(arg.trim().toLowerCase())) {
    if (z.roomLit(session.roomId)) {
      return z.send(session, "The old socket is already burning. The road has its light, for now.");
    }
    const torch = session.items.find((c) => c.itemId === TORCH_ITEM);
    if (!torch) {
      return z.send(session, "The socket is empty and waiting — the lead is still run in for a flame. It would take a torch, one of yours, spent into the stone.");
    }
    session.items.splice(session.items.indexOf(torch), 1);
    await removeItemRow(z.env.DB, torch.rowId);
    z.groundTorch.set(session.roomId, Date.now() + TORCH_BURN_MS);
    z.send(session, "You work the torch down into the socket where the standard broke, and the old lead takes the flame. The road has its light back — for as long as the torch burns.", "gain");
    z.roomFeed(session.roomId, `${session.name} sets a torch in the lantern stump, and the road's lamp is alight again.`, session.pubkey, false);
    z.refreshRoomCtx(session.roomId);
    return;
  }
  if (carriesLight(session)) {
    return z.send(session, session.litSource === "lantern"
      ? "Your lantern already burns steady. Let it do its work."
      : "Your torch already burns. Best not waste another until it's spent.");
  }
  const torch = session.items.find((c) => c.itemId === TORCH_ITEM);
  // ANY WEAPON THAT BURNS IS A BRAND (2026-08-20). Keyed on the trait, not on
  // the longbrand's id — which is why the pitch-pine brand could be forged,
  // bought and carried but never lit, its one trait switched off. If you carry
  // two, a word of the name picks between them ("light pine"); otherwise the
  // first to hand answers.
  const isBurning = (id: string) => hasTrait(z.world!.itemTemplates.get(id), "burning");
  const brands = session.items.filter((c) => isBurning(c.itemId));
  const named = arg
    ? brands.find((c) => {
        const n = z.world!.itemTemplates.get(c.itemId)?.name.toLowerCase() ?? "";
        return arg.toLowerCase().split(/\s+/).some((w) => w.length > 2 && w !== "brand" && n.includes(w));
      })
    : undefined;
  const brand = named ?? brands[0];
  const lantern = session.items.find((c) => c.itemId === LANTERN_ITEM);
  const wantLantern = arg.includes("lantern") ? true
    : (arg.includes("torch") || arg.includes("brand")) ? false
    : !torch && !brand;
  // The plain stick burns first unless the brand is asked for by name —
  // nobody spends the rare flame by accident.
  const wantBrand = !wantLantern && (arg.includes("brand") || !torch);
  const light = wantLantern ? lantern : wantBrand ? brand : torch;
  if (!light) {
    if (wantLantern && (torch || brand)) return z.send(session, "You carry no lantern — though you do have a torch.");
    if (wantBrand && arg.includes("brand") && torch) return z.send(session, "You carry nothing that burns like that — though a plain torch would answer.");
    return z.send(session, "You have nothing to light.");
  }
  if (wantLantern && light.condition <= 0) {
    return z.send(session, "The pane is cracked through and the tin has sprung at the seams — it will not hold a flame until it has been mended.");
  }
  if (wantLantern && wellOf(session, light) <= 0) {
    return z.send(session, "You open the shutter on a dry well. There is nothing in it to burn.");
  }
  // Under open rain a torch won't catch — the storm is the lantern's argument
  // (its shuttered flame doesn't care; see events.ts). UNLESS you are wearing
  // something you can hunch over it: HOODED gear (2026-08-03) is the wood's
  // weather answer, and the wood is the one region that is outdoors end to end.
  // It does not make you dry. It buys you the one lit match.
  // A CLAMP IS ALREADY ALIGHT. Standing at a firekeeper's mound you are not
  // striking a spark in the wet — you are taking fire off a bed of it that has
  // been burning for days under its own turf. It is the wood's one answer to a
  // region that is outdoors end to end (zone-data.ts FIREKEEPERS).
  const atClamp = z.roomHasFirekeeper(session.roomId);
  // ...and so does a closed canopy. Standing in the deepwood or the sunken wood
  // the rain is a sound somewhere above you, not something landing on your
  // hands (detail.ts underCover). Knowing which parts of the wood those are is
  // worth something in a downpour.
  const sheltered = atClamp || underCover(session.roomId);
  if (!wantLantern && events.raining(z, session.roomId) && !z.wearsTrait(session, "hooded") && !sheltered) {
    return z.send(session, "The rain would drown a torch before it caught. A hooded lantern wouldn't care.");
  }
  // The wind takes a spark before the pitch ever catches. Same shape as the
  // rain above and for the same reason: it was possible to stand in a gale,
  // light a bare torch, and watch the wind gutter it a few beats later
  // (tickWind) — the refusal is the honest version, and it spends nothing.
  if (!wantLantern && events.windy(z, session.roomId) && !z.wearsTrait(session, "hooded") && !sheltered) {
    return z.send(session, "The wind takes the spark before the pitch can catch. A hooded lantern wouldn't care.");
  }
  const hoodedFlame = !wantLantern && events.raining(z, session.roomId) && !sheltered;
  // While the deep exhales, the current pulls an open flame apart before it
  // catches — the exhale is the lantern's other argument.
  if (!wantLantern && events.exhaling(z, session.roomId)) {
    return z.send(session, "The air itself pulls the flame apart before it can catch. A hooded lantern wouldn't care.");
  }
  // Standing in the tide: the pitch drinks water before it drinks fire.
  // The sea is the same water (2026-08-20): a torch lit mid-flood would be
  // taken the next beat, so the refusal says so now instead of spending it.
  if (!wantLantern && events.tideFlooded(z, session.roomId)) {
    return z.send(session, "You are standing in the tide. The pitch would drink water before it ever drank fire. A hooded lantern, held high, wouldn't care.");
  }
  if (!wantLantern && events.seaUnder(z, session.roomId)) {
    return z.send(session, "You are standing in the sea. The pitch would drink water before it ever drank fire. A hooded lantern, held high, wouldn't care.");
  }
  // Both hands full, or a guard you can't drop with something on you: the same
  // gate the floor-torch path goes through (blockedFromLight, above).
  //
  // A lit light fills the shield hand: your shield STAYS on your arm (it is
  // never unequipped, so it can never become a loose pack item to lose), but it
  // gives no guard while the flame burns — equippedBlock reads carriesLight and
  // zeroes the block. Raise the shield again ('equip shield') to lower the flame
  // and trade the light back for the guard. (Old behaviour set equipped=false
  // and dropped the shield into the pack; that loose shield was getting lost.)
  //
  // THE LONGBRAND IS A WEAPON NOW (2026-08-20): its flame lives in the WEAPON
  // hand, so it costs no shield guard — and it must be WIELDED to catch, not
  // struck inside a pack.
  const isBrand = isBurning(light.itemId);
  if (isBrand) {
    if (!light.equipped) {
      const bn = z.world!.itemTemplates.get(light.itemId)?.name ?? "the brand";
      return z.send(session, `You'll want ${bn} in your hand before you put a spark to it — 'equip ${light.itemId}', then 'light brand'.`);
    }
  } else {
    const refusal = blockedFromLight(z, session);
    if (refusal) return z.send(session, refusal);
  }
  if (wantLantern) {
    // The wear lands as the wick takes; the fat leaves the well for the flame,
    // and whatever the flame has not burned goes back when it is shuttered.
    light.condition = Math.max(0, light.condition - LANTERN_WEAR);
    await setItemCondition(z.env.DB, light.rowId, light.condition);
    session.litUntil = Date.now() + (light.fuel ?? 0);
    session.litSource = "lantern";
    session.litRow = light.rowId; // THIS lantern burns, not whichever one is first in the pack
    session.torchWarned = false;
    light.fuel = 0;
    await setItemFuel(z.env.DB, light.rowId, 0);
    z.send(session, `You slide the shutter and touch flame to the wick — a low, steady light settles around you. Nothing flinches from it.${guardNote(z, session, "the lantern")}`, "gain sfx-ignite");
    z.roomFeed(session.roomId, `${session.name} raises a hooded lantern; a patient light spreads.`, session.pubkey, false);
  } else if (isBrand) {
    // The brand stays in your hand, burning — a weapon that is also a fire.
    // The burnout tick spends the brand itself when the pitch is gone.
    const coldMult = events.coldTorchMult(z, session.roomId);
    session.litUntil = Date.now() + Math.floor(brandBurnMs(light.itemId) * coldMult);
    session.litSource = "brand";
    session.litRow = light.rowId; // THIS brand burns, not whichever one is first in the pack
    session.torchWarned = false;
    z.send(session, `You touch a spark to the seal and ${z.world!.itemTemplates.get(light.itemId)?.name ?? "the brand"} takes it slow — a fat, even flame that means to stay${coldMult < 1 ? ", though the cold pinches even this one" : ""}. The fire is in your hand, and whatever cannot face it will run.`, "gain sfx-ignite");
    z.roomFeed(session.roomId, `${session.name} kindles ${z.world!.itemTemplates.get(light.itemId)?.name ?? "a brand"}; its light is steadier than any torch has a right to be.`, session.pubkey, false);
  } else {
    session.items.splice(session.items.indexOf(light), 1);
    await removeItemRow(z.env.DB, light.rowId); // spent into the burning
    // A torch lit in a cold snap fights for its life the whole way down.
    const coldMult = events.coldTorchMult(z, session.roomId);
    session.litUntil = Date.now() + Math.floor(TORCH_BURN_MS * coldMult);
    session.litSource = "torch";
    session.torchWarned = false;
    if (hoodedFlame) z.send(session, "You turn your back to the rain and hunch the hood over your hands — the wet stays off just long enough.");
    z.send(session, `You touch a spark to the pitch and the torch catches — a low, guttering light pushes the dark back${coldMult < 1 ? ", pinched small by the cold" : ""}.${guardNote(z, session, "the flame")}`, "gain sfx-ignite");
    z.roomFeed(session.roomId, `${session.name} kindles a torch; the light throws long shadows.`, session.pubkey, false);
  }
  z.sendStatus(session);
  z.send(session, z.describeRoom(session, false)); // the dark may resolve, or the fire may scatter something
}

// A shield or a two-handed weapon takes the hand the light is in — equipping
// one snuffs the flame (the reverse of cmdLight). A snuffed lantern goes back
// in the pack unlit, with whatever fat it had not burned still in its well. A burning BRAND is untouched by all of
// this (2026-08-20): the flame lives in the weapon hand, and swapping steel
// just leaves it burning in the pack until it burns down.
export function snuffForHand(z: ZoneDO, session: Session): void {
  if (session.litSource === "brand") return;
  const wasLantern = session.litSource === "lantern";
  saveWell(z, session); // the shutter keeps what it had not burned
  session.litUntil = undefined;
  session.litSource = undefined; session.litRow = undefined;
  session.torchWarned = false;
  const dark = !z.outOfWorld(session) && !z.litFor(session) ? ", and the dark closes in" : "";
  z.send(session, wasLantern
    ? `You shutter the lantern and sling it — no hand left to carry it${dark}.`
    : `The torch gutters out — no hand left to hold it${dark}.`);
}

// FILL THE WELL: one lump of fat from the pack, when there is room for a whole
// one. It can be done with the flame burning - the fat goes straight to it.
export async function cmdFill(z: ZoneDO, session: Session, arg = ""): Promise<void> {
  if (arg && !/lantern|lamp|well/i.test(arg)) return z.send(session, "There is nothing to fill that with.");
  const lit = litLantern(session);
  const lantern = lit ?? session.items.find((c) => c.itemId === LANTERN_ITEM);
  if (!lantern) return z.send(session, "You carry no lantern.");
  if (z.inCombat(session)) return z.send(session, "Not with something trying to kill you.");
  const fat = session.items.find((c) => c.itemId === FAT_ITEM);
  if (!fat) return z.send(session, `You have no fat to put in it. ${wellWords(wellOf(session, lantern))}`);
  if (wellOf(session, lantern) + LANTERN_FAT_MS > LANTERN_WELL_MS) return z.send(session, `There is no room in the well for another lump. ${wellWords(wellOf(session, lantern))}`);
  session.items.splice(session.items.indexOf(fat), 1);
  await removeItemRow(z.env.DB, fat.rowId);
  if (lantern === lit) {
    session.litUntil! += LANTERN_FAT_MS;
    session.torchWarned = false;
  } else {
    lantern.fuel = (lantern.fuel ?? 0) + LANTERN_FAT_MS;
    await setItemFuel(z.env.DB, lantern.rowId, lantern.fuel);
  }
  z.send(session, `You work a lump of fat down into the lantern's well and wipe your fingers on your leg. ${wellWords(wellOf(session, lantern))}`, "gain");
  z.sendStatus(session);
}

// SHUTTER IT: a lantern goes dark and keeps what it had not burned. A torch
// is ground out against the stone, and that is the end of that torch. A brand
// burns until it is done.
export async function cmdDouse(z: ZoneDO, session: Session): Promise<void> {
  if (!carriesLight(session)) return z.send(session, "You have no light burning.");
  if (session.litSource === "brand") return z.send(session, "The pitch is in it to the core. It will burn until it is done.");
  const wasLantern = session.litSource === "lantern";
  const left = wasLantern ? litLantern(session) : undefined;
  saveWell(z, session);
  session.litUntil = undefined;
  session.litSource = undefined; session.litRow = undefined;
  session.torchWarned = false;
  const dark = !z.outOfWorld(session) && !z.litFor(session);
  z.send(session, (wasLantern
    ? `You slide the shutter closed and the light is gone${dark ? " — the dark closes in" : ""}. ${wellWords(left ? left.fuel ?? 0 : 0)}`
    : `You grind the torch out against the stone${dark ? ", and the dark closes in" : ""}. What is left of it is no good to anyone.`) + guardBack(z, session));
  z.roomFeed(session.roomId, wasLantern ? `${session.name} shutters a lantern.` : `${session.name} grinds out a torch.`, session.pubkey, false);
  z.sendStatus(session);
  if (dark) z.send(session, z.describeRoom(session, false));
}

// The tick's upkeep: lights burn down. A warning when the flame runs low, then
// it dies — and if you're standing in a lightless room, the dark closes over
// you again. A burning lantern must also still be IN THE PACK (dropped, sold,
// stolen — the flame doesn't follow you). A lantern burns its well dry and goes
// out; the lantern itself is never spent by it.
export async function tickLights(z: ZoneDO, now: number): Promise<void> {
  for (const session of z.sessions.values()) {
    if (!session.litUntil) continue;
    const lantern = session.litSource === "lantern";
    const brand = session.litSource === "brand";
    const held = lantern ? litLantern(session) : undefined;
    // The row that was actually lit — a pack can hold two brands now, and the
    // burnout must spend the one in the fire, not the first one it trips over.
    const heldBrand = brand
      ? session.items.find((c) => c.rowId === session.litRow)
      : undefined;
    if (lantern && !held) {
      session.litUntil = undefined;
      session.litSource = undefined; session.litRow = undefined;
      session.torchWarned = false;
      z.send(session, `The lantern is out of your hands — its light goes with it.${guardBack(z, session)}`, "dmgin");
      z.sendStatus(session);
      continue;
    }
    // A lit brand that leaves your hands (dropped, traded, burned at the bench)
    // takes the flame with it — the pitch can't burn in a hand it isn't in.
    if (brand && !heldBrand) {
      session.litUntil = undefined;
      session.litSource = undefined; session.litRow = undefined;
      session.torchWarned = false;
      z.send(session, `The brand is out of your hands — its light goes with it.${guardBack(z, session)}`, "dmgin");
      z.sendStatus(session);
      continue;
    }
    const left = session.litUntil - now;
    if (left <= 0) {
      session.litUntil = undefined;
      session.litSource = undefined; session.litRow = undefined;
      session.torchWarned = false;
      const inDark = !z.outOfWorld(session) && !z.litFor(session); // somebody else's flame still counts
      if (lantern) {
        z.send(session, (inDark
          ? "The lantern's flame shrinks to a bead as the last of the fat goes, and drowns — and the dark closes over you completely."
          : "The lantern's flame shrinks to a bead as the last of the fat goes, and drowns. The pane goes dark.") + guardBack(z, session), "dmgin");
        if (held) { held.fuel = 0; await setItemFuel(z.env.DB, held.rowId, 0); }
      } else if (brand) {
        // A brand burns down to the fist and is gone — the weapon and
        // the flame were the same thing, and the pitch has had its argument.
        z.send(session, (inDark
          ? "The brand burns down past the guard and into the fist — you drop the last of it, and the dark closes over you completely."
          : "The brand burns down past the guard and into the fist. The last of it goes into the dark.") + guardBack(z, session), "dmgin");
        if (heldBrand) {
          session.items.splice(session.items.indexOf(heldBrand), 1);
          await removeItemRow(z.env.DB, heldBrand.rowId);
        }
      } else {
        z.send(session, (inDark
          ? "Your torch gutters, flares, and dies — and the dark closes over you completely."
          : "Your torch gutters, flares, and dies. The last of it falls as ash.") + guardBack(z, session), "dmgin");
      }
      z.sendStatus(session);
      if (inDark) z.send(session, z.describeRoom(session, false));
    } else if (left <= 90_000 && !session.torchWarned) {
      session.torchWarned = true;
      z.send(session, lantern
        ? "The lantern's light thins — the fat in the well is nearly gone."
        : brand
        ? "The brand's flame is eating down toward the hand — not long now."
        : "Your torch burns low, the flame guttering — not long now.", "dmgin");
    }
  }
  // Torches burning on the FLOOR (dropped, or fallen from a dead hand) gutter out
  // too. When one dies the room loses its shared light — tell anyone standing
  // there, and if the room is born-dark, the dark closes back over them. The
  // weathers that drown a carried flame drown a grounded one the same: the tide
  // takes it, the rain takes it, the exhale pulls it apart — and the sea is the
  // same water as the tide (2026-08-20).
  for (const [roomId, until] of z.groundTorch) {
    const drowned = events.tideFlooded(z, roomId) || events.seaUnder(z, roomId) || events.raining(z, roomId) || events.exhaling(z, roomId);
    if (now < until && !drowned) continue;
    z.groundTorch.delete(roomId);
    const dark = z.isDark(roomId);
    for (const s of z.sessions.values()) {
      if (s.roomId !== roomId || z.outOfWorld(s)) continue;
      const blind = dark && !z.carriesLight(s);
      z.send(s, (drowned
        ? "The torch burning on the floor dies with a hiss — the wet takes it."
        : "The torch on the floor gutters out and dies.")
        + (blind ? " The dark closes back over the room." : ""), "dmgin");
      if (blind) z.send(s, z.describeRoom(s, false));
    }
    z.refreshRoomCtx(roomId);
  }
}
