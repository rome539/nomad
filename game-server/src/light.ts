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
import { setEquipped, setItemCondition, removeItemRow } from "./world";
import {
  TORCH_ITEM, TORCH_BURN_MS, LANTERN_ITEM, LANTERN_BURN_MS, LANTERN_WEAR,
  TWO_HANDED, DARK_ROOMS,
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
  const lantern = session.items.find((c) => c.itemId === LANTERN_ITEM);
  const wantLantern = arg.includes("lantern") ? true : arg.includes("torch") ? false : !torch;
  const light = wantLantern ? lantern : torch;
  if (!light) {
    return z.send(session, wantLantern && torch ? "You carry no lantern — though you do have a torch." : "You have nothing to light.");
  }
  if (wantLantern && light.condition <= 0) {
    return z.send(session, "The wick is burnt to nothing and the pane is cracked through — this lantern is done.");
  }
  // Both hands on a two-handed weapon leave nowhere to hold a light; a shield
  // gets set aside for the flame.
  const weapon = z.equippedItem(session, "weapon");
  if (weapon && TWO_HANDED.has(weapon.tmpl.id)) {
    return z.send(session, `Both your hands are full of ${weapon.tmpl.name} — no free hand for a light. Lower it first.`);
  }
  const shield = z.equippedItem(session, "shield");
  if (shield && z.inCombat(session)) {
    return z.send(session, "You can't fumble your shield down and a light up while something wants your blood.");
  }
  if (shield) {
    shield.carried.equipped = false;
    await setEquipped(z.env.DB, shield.carried.rowId, false);
  }
  if (wantLantern) {
    // The oil is committed the moment the wick takes — the wear lands now, and
    // the burnout tick spends the lantern itself when the last of it is gone.
    light.condition -= LANTERN_WEAR;
    await setItemCondition(z.env.DB, light.rowId, light.condition);
    session.litUntil = Date.now() + LANTERN_BURN_MS;
    session.litSource = "lantern";
    session.torchWarned = false;
    z.send(session, `You slide the shutter and touch flame to the wick${shield ? `, ${shield.tmpl.name} set aside to carry it` : ""} — a low, steady light settles around you. Nothing flinches from it.`, "gain");
    z.roomFeed(session.roomId, `${session.name} raises a hooded lantern; a patient light spreads.`, session.pubkey);
  } else {
    session.items.splice(session.items.indexOf(light), 1);
    await removeItemRow(z.env.DB, light.rowId); // spent into the burning
    session.litUntil = Date.now() + TORCH_BURN_MS;
    session.litSource = "torch";
    session.torchWarned = false;
    z.send(session, `You touch a spark to the pitch and the torch catches${shield ? `, ${shield.tmpl.name} set aside to hold it` : ""} — a low, guttering light pushes the dark back.`, "gain");
    z.roomFeed(session.roomId, `${session.name} kindles a torch; the light throws long shadows.`, session.pubkey);
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
  const dark = DARK_ROOMS.has(session.roomId) && !z.outOfWorld(session) ? ", and the dark closes in" : "";
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
      const inDark = DARK_ROOMS.has(session.roomId) && !z.outOfWorld(session);
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
}
