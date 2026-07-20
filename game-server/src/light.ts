// Fire and light, out of the spine (zone.ts stays tick/combat + transport).
// A torch is spent into the flame at once and burns TORCH_BURN_MS — an OPEN
// flame, so the fire-fear wakes to it (ai.carriesFire reads the same litUntil).
// A hooded lantern stays in the pack while it burns (LANTERN_BURN_MS, three
// torches' worth), pays LANTERN_WEAR condition per lighting (five burns, the
// last burn spends the lantern itself), and its shuttered flame is TAME — the
// fire-fear sleeps through it. Either way the light lives in the shield hand:
// light, or guard — not both.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import * as events from "./events";
import { setItemCondition, removeItemRow, hasTrait } from "./world";
import {
  TORCH_ITEM, TORCH_BURN_MS, LANTERN_ITEM, LANTERN_BURN_MS, LANTERN_WEAR,
  BRAND_ITEM, BRAND_BURN_MS,
} from "./zone-data";

// A kindled light throws light until it gutters (litUntil). Read everywhere the
// dark matters: seeing a lightless room, and waking the fire-fear.
export function carriesLight(session: Session): boolean {
  return !!session.litUntil && Date.now() < session.litUntil;
}

// Kindle a light. No arg lights the torch first, the lantern if you carry no
// torch; "light lantern" / "light torch" choose. One at a time either way.
export async function cmdLight(z: ZoneDO, session: Session, arg = ""): Promise<void> {
  if (carriesLight(session)) {
    return z.send(session, session.litSource === "lantern"
      ? "Your lantern already burns steady. Let it do its work."
      : "Your torch already burns. Best not waste another until it's spent.");
  }
  const torch = session.items.find((c) => c.itemId === TORCH_ITEM);
  const brand = session.items.find((c) => c.itemId === BRAND_ITEM);
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
    if (wantBrand && arg.includes("brand") && torch) return z.send(session, "You carry no longbrand — though a plain torch would answer.");
    return z.send(session, "You have nothing to light.");
  }
  if (wantLantern && light.condition <= 0) {
    return z.send(session, "The wick is burnt to nothing and the pane is cracked through — this lantern is done.");
  }
  // Under open rain a torch won't catch — the storm is the lantern's argument
  // (its shuttered flame doesn't care; see events.ts).
  if (!wantLantern && events.raining(z, session.roomId)) {
    return z.send(session, "The rain would drown a torch before it caught. A hooded lantern wouldn't care.");
  }
  // While the deep exhales, the current pulls an open flame apart before it
  // catches — the exhale is the lantern's other argument.
  if (!wantLantern && events.exhaling(z, session.roomId)) {
    return z.send(session, "The air itself pulls the flame apart before it can catch. A hooded lantern wouldn't care.");
  }
  // Standing in the tide: the pitch drinks water before it drinks fire.
  if (!wantLantern && events.tideFlooded(z, session.roomId)) {
    return z.send(session, "You are standing in the tide. The pitch would drink water before it ever drank fire. A hooded lantern, held high, wouldn't care.");
  }
  // Both hands on a two-handed weapon leave nowhere to hold a light; a shield
  // gets set aside for the flame.
  const weapon = z.equippedItem(session, "weapon");
  if (weapon && hasTrait(weapon.tmpl, "two-handed")) {
    return z.send(session, `Both your hands are full of ${weapon.tmpl.name} — no free hand for a light. Lower it first.`);
  }
  // A lit light fills the shield hand: your shield STAYS on your arm (it is
  // never unequipped, so it can never become a loose pack item to lose), but it
  // gives no guard while the flame burns — equippedBlock reads carriesLight and
  // zeroes the block. Raise the shield again ('equip shield') to lower the flame
  // and trade the light back for the guard. (Old behaviour set equipped=false
  // and dropped the shield into the pack; that loose shield was getting lost.)
  const shield = z.equippedItem(session, "shield");
  if (shield && z.inCombat(session)) {
    return z.send(session, "You can't drop your guard for a light while something wants your blood.");
  }
  if (wantLantern) {
    // The oil is committed the moment the wick takes — the wear lands now, and
    // the burnout tick spends the lantern itself when the last of it is gone.
    light.condition -= LANTERN_WEAR;
    await setItemCondition(z.env.DB, light.rowId, light.condition);
    session.litUntil = Date.now() + LANTERN_BURN_MS;
    session.litSource = "lantern";
    session.torchWarned = false;
    z.send(session, `You ${shield ? `swing ${shield.tmpl.name} onto your back, then ` : ""}slide the shutter and touch flame to the wick — a low, steady light settles around you. Nothing flinches from it.${shield ? " (No guard while the light burns — 'equip shield' brings it back.)" : ""}`, "gain");
    z.roomFeed(session.roomId, `${session.name} raises a hooded lantern; a patient light spreads.`, session.pubkey, false);
  } else {
    session.items.splice(session.items.indexOf(light), 1);
    await removeItemRow(z.env.DB, light.rowId); // spent into the burning
    // A torch lit in a cold snap fights for its life the whole way down.
    // The longbrand is the same open flame with more to burn — 2.5 torches
    // on one spark; everything downstream still reads litSource "torch".
    const isBrand = light.itemId === BRAND_ITEM;
    const coldMult = events.coldTorchMult(z, session.roomId);
    session.litUntil = Date.now() + Math.floor((isBrand ? BRAND_BURN_MS : TORCH_BURN_MS) * coldMult);
    session.litSource = "torch";
    session.torchWarned = false;
    z.send(session, isBrand
      ? `You ${shield ? `swing ${shield.tmpl.name} onto your back, then ` : ""}touch a spark to the seal and the longbrand takes it slow — a fat, even flame that means to stay${coldMult < 1 ? ", though the cold pinches even this one" : ""}.${shield ? " (No guard while the flame burns — 'equip shield' brings it back.)" : ""}`
      : `You ${shield ? `swing ${shield.tmpl.name} onto your back, then ` : ""}touch a spark to the pitch and the torch catches — a low, guttering light pushes the dark back${coldMult < 1 ? ", pinched small by the cold" : ""}.${shield ? " (No guard while the flame burns — 'equip shield' brings it back.)" : ""}`, "gain");
    z.roomFeed(session.roomId, isBrand
      ? `${session.name} kindles a longbrand; its light is steadier than any torch has a right to be.`
      : `${session.name} kindles a torch; the light throws long shadows.`, session.pubkey, false);
  }
  z.sendStatus(session);
  z.send(session, z.describeRoom(session, false)); // the dark may resolve, or the fire may scatter something
}

// A shield or a two-handed weapon takes the hand the light is in — equipping
// one snuffs the flame (the reverse of cmdLight). A snuffed lantern goes back
// in the pack unlit; the burn it was on is spent (the wear landed at lighting —
// oil doesn't pour back into the wick).
export function snuffForHand(z: ZoneDO, session: Session): void {
  const wasLantern = session.litSource === "lantern";
  session.litUntil = undefined;
  session.litSource = undefined;
  session.torchWarned = false;
  const dark = z.isDark(session.roomId) && !z.outOfWorld(session) ? ", and the dark closes in" : "";
  z.send(session, wasLantern
    ? `You shutter the lantern and sling it — no hand left to carry it${dark}.`
    : `The torch gutters out — no hand left to hold it${dark}.`);
}

// The tick's upkeep: lights burn down. A warning when the flame runs low, then
// it dies — and if you're standing in a lightless room, the dark closes over
// you again. A burning lantern must also still be IN THE PACK (dropped, sold,
// stolen — the flame doesn't follow you); and a lantern's last burn spends it.
export async function tickLights(z: ZoneDO, now: number): Promise<void> {
  for (const session of z.sessions.values()) {
    if (!session.litUntil) continue;
    const lantern = session.litSource === "lantern";
    const held = lantern ? session.items.find((c) => c.itemId === LANTERN_ITEM) : undefined;
    if (lantern && !held) {
      session.litUntil = undefined;
      session.litSource = undefined;
      session.torchWarned = false;
      z.send(session, "The lantern is out of your hands — its light goes with it.", "dmgin");
      z.sendStatus(session);
      continue;
    }
    const left = session.litUntil - now;
    if (left <= 0) {
      session.litUntil = undefined;
      session.litSource = undefined;
      session.torchWarned = false;
      const inDark = z.isDark(session.roomId) && !z.outOfWorld(session);
      if (lantern) {
        z.send(session, inDark
          ? "The lantern's flame shrinks to a bead and drowns in its own oil — and the dark closes over you completely."
          : "The lantern's flame shrinks to a bead and drowns. The pane goes dark.", "dmgin");
        if (held && held.condition <= 0) {
          session.items.splice(session.items.indexOf(held), 1);
          await removeItemRow(z.env.DB, held.rowId);
          z.send(session, "That was the last of it: the wick is ash, and the cracked tin comes apart in your hands.");
        }
      } else {
        z.send(session, inDark
          ? "Your torch gutters, flares, and dies — and the dark closes over you completely."
          : "Your torch gutters, flares, and dies. The last of it falls as ash.", "dmgin");
      }
      z.sendStatus(session);
      if (inDark) z.send(session, z.describeRoom(session, false));
    } else if (left <= 90_000 && !session.torchWarned) {
      session.torchWarned = true;
      z.send(session, lantern
        ? "The lantern's light thins — the oil of this burn is nearly spent."
        : "Your torch burns low, the flame guttering — not long now.", "dmgin");
    }
  }
  // Torches burning on the FLOOR (dropped, or fallen from a dead hand) gutter out
  // too. When one dies the room loses its shared light — tell anyone standing
  // there, and if the room is born-dark, the dark closes back over them. The
  // weathers that drown a carried flame drown a grounded one the same: the tide
  // takes it, the rain takes it, the exhale pulls it apart.
  for (const [roomId, until] of z.groundTorch) {
    const drowned = events.tideFlooded(z, roomId) || events.raining(z, roomId) || events.exhaling(z, roomId);
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
