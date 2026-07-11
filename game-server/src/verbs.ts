// The player's verbs, out of the spine. zone.ts keeps dispatch, transport, and
// the tick/combat loop; everything a wanderer TYPES that isn't starting a fight
// lands here (attack/throw stay with the spine — they're where fights begin).
// Same shape as gate.ts: free functions taking the ZoneDO.
import type { ZoneDO } from "./zone";
import type { Session, Stance, GroundInstance } from "./zone-types";
import type { CarriedItem, ItemTemplate } from "./world";
import {
  setEquipped, setStance, removeItemRow, insertLoot, setItemJournalId,
  journalLoad, renamePlayer, itemAcquiredAt, savePlayer, voidMint, loadContainer,
} from "./world";
import { cap, nameMatches, rollGearCondition } from "./zone-util";
import { chance, randInt, uuid, pick } from "./rng";
import * as ai from "./ai";
import * as light from "./light";
import {
  PACK_CAP, LOCKBOX_CAP, VAULT_CAP, SEIZE_BREAK_ODDS, SLICK, SLICK_BREAK_BONUS,
  PARTING_BLOW_CHANCE, FISHING_ROOMS, FISH_ODDS, PALE_EEL_ODDS, FISH_COOLDOWN_MS,
  CARVE_MAX_LEN, TWO_HANDED, RARITY_RANK, HOBBLE_FLEE_MS, DEEP_HEART, HEART_FRESH_SEC, DEEP_ROOMS, SENTINELS, HOUND_WAKE_MS,
  ARMOR_K, STANCE, WAKE_ENTER, WAKE_EXIT, REGROW_MIN_MS, REGROW_MAX_MS, ROT_MS,
} from "./zone-data";

// The old word. Nothing happens — but the dungeon heard you ask.
export function cmdXyzzy(z: ZoneDO, session: Session): void {
  z.send(session, "You mouth the old word into the dark. Nothing happens. Something, somewhere, declines to be impressed.");
}

// Light one from the tin. No stat, no cure — a moment's calm that costs you:
// the smell rides the draft into the next room, and the dark leans in to look.
// (What the tin is really worth is never said here. That's for the finding.)
export function cmdSmoke(z: ZoneDO, session: Session): void {
  if (!session.items.some((c) => c.itemId === "dry-cigarettes")) {
    return z.send(session, "You pat yourself down for a smoke and come up with nothing but lint.");
  }
  z.send(session, "You knock one loose from the tin and light it. The first drag steadies your hands; for a breath, the dungeon is just a room you happen to be in.", "gain");
  z.roomFeed(session.roomId, `${session.name} lights a cigarette; the ember flares, then settles to a slow red eye.`, session.pubkey);
  z.roomSound(session.roomId, "A thread of tobacco smoke drifts in {dir}.");
  z.creatureNoise(session.roomId); // a lit ember and a smell — the dark notices
}

// Nobody knows what this does. That includes the dungeon.
export function cmdSquink(z: ZoneDO, session: Session): void {
  z.send(session, "You squink. Somewhere below, something squinks back.");
  z.roomFeed(session.roomId, `${session.name} squinks. It echoes longer than it should.`, session.pubkey);
  z.roomSound(session.roomId, "Something squinks, {dir}.");
  z.creatureNoise(session.roomId); // squinking is not free
}

// ---- verbs ----

export function cmdLook(z: ZoneDO, session: Session, arg: string): void {
  // A deliberate look always gives the full scene — and marks the room known,
  // so from here you get the brief view unless you ask again.
  if (!arg) { session.visited.add(session.roomId); return z.send(session, z.describeRoom(session, true)); }
  const world = z.world!;

  if (arg === "self" || arg === "me" || arg === "myself") return z.send(session, selfExamine(z, session));

  const creature = z.findCreatureIn(session.roomId, arg);
  if (creature) {
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    // The examine reads its live state in a full sentence (the room glance gets
    // the same tell as a terser clause) — a wound, a hunt, a hungry eye on a rival.
    const tell = ai.creatureTell(z, creature, session.pubkey);
    // The burdened one is identifiable on a close look: what it took, it shows.
    const bears = z.bearsClause(creature);
    return z.send(session, `${tmpl.description} (${z.condition(creature)})${tell ? ` It is ${tell}.` : ""}${bears ? ` It is ${bears.slice(2)}.` : ""}`);
  }
  // Items get a real inspection (rome, 2026-07-11): the prose, then what the
  // piece DOES (the same stat tags the bench shows), then how far gone it is.
  // Gear on the floor reads its stamped wear (groundCond); a trophy or a food
  // has no wear to speak of.
  const groundItem = findItemIn(z, z.ground.get(session.roomId) ?? [], arg);
  if (groundItem) {
    const t = world.itemTemplates.get(groundItem)!;
    const cond = z.isGear(groundItem) ? z.groundCond.get(`${groundItem}@${session.roomId}`) ?? 100 : undefined;
    return z.send(session, t.description + z.itemStat(t) + wearClause(z, cond));
  }
  const carried = z.findCarried(session, arg);
  if (carried) {
    const t = world.itemTemplates.get(carried.itemId)!;
    return z.send(
      session,
      t.description + z.itemStat(t) + wearClause(z, z.isGear(carried.itemId) ? carried.condition : undefined)
        + (carried.serial !== null ? ` The dungeon's seal is on it. (mint #${carried.serial})` : ""),
    );
  }
  const other = findPlayerIn(z, session.roomId, arg);
  if (other) return z.send(session, `${other.name}, a fellow wanderer. Keys in pocket, nowhere to be.`);
  z.send(session, "You see nothing like that here.");
}

// How far gone a piece is, spoken as prose (same buckets as the list tags —
// conditionWord keeps the two from drifting). Pristine says nothing: soundness
// is the default state of the world, wear is the news.
function wearClause(z: ZoneDO, cond: number | undefined): string {
  if (cond === undefined) return "";
  const word = z.conditionWord(cond);
  if (!word) return "";
  const line = word === "worn" ? "It shows its wear — sound, but used."
    : word === "battered" ? "It is battered; a mend is overdue."
    : word === "failing" ? "It is failing — closer to breaking than not."
    : "It is nearly broken; one hard blow from coming apart.";
  return " " + line;
}

// The braggart's ledger, read at home: the same tallies the 31573 sheet
// publishes (kills/deaths/kings/wanderers, and your age under this name),
// shown in-game instead of only to the relays. The world still doesn't
// snitch — this is YOUR ledger, in your own hand.
export function cmdSheet(z: ZoneDO, session: Session): void {
  const days = Math.max(0, Math.floor((Date.now() / 1000 - session.born) / 86_400));
  const age = days === 0 ? "born this very day" : days === 1 ? "one day under this name" : `${days} days under this name`;
  const lines = [
    `The dungeon keeps your ledger, ${session.name} — ${age}.`,
    `  Kills: ${session.kills}${session.kills === 0 ? " — the dark is still ahead of you" : ""}`,
    `  Kings and horrors put down: ${session.bossKills}`,
    `  Wanderers' blood on your hands: ${session.pvpKills}`,
    `  Deaths: ${session.deaths}${session.deaths === 0 ? " — so far" : ""}`,
    `('publish sheet' speaks this ledger to the relays; until then it is yours alone.)`,
  ];
  z.send(session, lines.join("\n"));
}

// Examine yourself: your afflictions in prose (the fx pills' longer form),
// plus a quick read of how hurt you are and what's in your hands — the
// legible-sim mirror turned on the player.
export function selfExamine(z: ZoneDO, session: Session): string {
  const f = session.hp / session.maxHp;
  const state = f >= 1 ? "whole and unhurt" : f > 0.66 ? "bruised but sound" : f > 0.33 ? "badly hurt" : "at the very edge of it";
  const parts: string[] = [`You take stock of yourself: ${state}. [${session.hp}/${session.maxHp} hp]`];
  if (session.bleedTicks && session.bleedTicks > 0) parts.push("Blood runs from a gash that hasn't clotted.");
  if (session.hobbled) parts.push("One leg is a bad wound — you'd limp if you had to run.");
  if (session.stunned) parts.push("Your head still rings; the next moment won't quite be yours.");
  if (session.seizedBy) parts.push("Something has hold of you and won't let go.");
  if (session.resting) parts.push("You're at rest, catching your breath.");
  const weapon = z.equippedItem(session, "weapon");
  const armor = z.equippedItem(session, "armor");
  parts.push(weapon ? `You hold ${weapon.tmpl.name}.` : "Your hands are empty.");
  if (armor) parts.push(`You wear ${armor.tmpl.name}.`);
  return parts.join(" ");
}

export async function cmdGo(z: ZoneDO, session: Session, dir: string): Promise<void> {
  if (!dir) return z.send(session, "Go where? (north, south, east, west, up, down)");
  const world = z.world!;
  const exit = (world.exits.get(session.roomId) ?? []).find((e) => e.dir === dir);
  if (!exit) return z.send(session, "There is no way " + dir + " from here.");

  // Held by a drowned thing: you can't just walk off. Trying is a struggle —
  // sometimes you tear loose and go, sometimes it drags you back.
  if (session.seizedBy) {
    const grip = z.creatures.get(session.seizedBy);
    if (!grip || grip.roomId !== session.roomId) {
      session.seizedBy = undefined;
    } else if (chance(SEIZE_BREAK_ODDS + (z.wearsTrait(session, SLICK) ? SLICK_BREAK_BONUS : 0))) {
      session.seizedBy = undefined;
      z.send(session, "You wrench free of its grip.");
    } else {
      return z.send(session, `${cap(world.mobTemplates.get(grip.templateId)!.name)} drags you back — you can't break away yet.`);
    }
  }

  // A wounded leg doesn't stop you fleeing — it makes you limp clear first. In
  // a fight, the first attempt starts you dragging toward the exit; you break
  // away only once HOBBLE_FLEE_MS has passed, exposed the whole time. Out of
  // combat you just walk (a limp, not a scramble). Deterministic, never a
  // dice-block. limpingSince gone stale (a prior fight) resets to a fresh drag.
  if (session.hobbled && z.inCombat(session)) {
    const now = Date.now();
    if (!session.limpingSince || now - session.limpingSince > HOBBLE_FLEE_MS * 2) {
      session.limpingSince = now;
      z.sendStatus(session);
      return z.send(session, "Your wounded leg won't answer — you start dragging yourself toward the way out. It takes a moment. (keep at it to break away)", "dmgin");
    }
    if (now - session.limpingSince < HOBBLE_FLEE_MS) {
      return z.send(session, `You're still hauling your bad leg toward the way ${dir} — not clear yet.`, "dmgin");
    }
    session.limpingSince = undefined; // enough — you wrench free and go (hobble stays till you rest)
    z.send(session, "You drag your wounded leg into motion and break away.");
  }

  const doorKey = `${session.roomId}:${dir}`;
  if (exit.key_item === DEEP_HEART && !z.openDoors.has(doorKey)) {
    // The corpse-key door: it takes a heart, and only a fresh one. No hoarded
    // key works here — you had to face the deep for this, and be quick with it.
    const heart = session.items.find((c) => c.itemId === DEEP_HEART);
    if (!heart) {
      return z.send(session, `A black iron door bars the way ${dir}, and cold pours up from under it. It has no keyhole. It wants something of the deep pressed to it — and still cold.`, "dmgin");
    }
    const at = await itemAcquiredAt(z.env.DB, heart.rowId);
    const fresh = at !== null && Math.floor(Date.now() / 1000) - at < HEART_FRESH_SEC;
    // Either way the heart leaves your hands — the door takes the offering, or
    // the slime is worthless and you're rid of it.
    session.items.splice(session.items.indexOf(heart), 1);
    await removeItemRow(z.env.DB, heart.rowId);
    if (!fresh) {
      return z.send(session, `You press the heart to the door — but the cold has gone out of it, and it's soft, grey, spoiled. The door does not stir. The slime sloughs from your hand and is gone.`, "dmgin");
    }
    // Once opened, open for everyone — until what lives beyond it returns.
    z.openDoors.add(doorKey);
    z.send(session, "You press the still-cold heart to the black door. For a moment nothing — then the door *takes* it, drinks the cold clean out of it, and grinds open. It stays open.", "unlock");
    z.roomFeed(session.roomId, `${session.name} presses something to the black door, and it grinds open.`, session.pubkey);
    z.roomSound(session.roomId, "Iron grinds against stone, {dir}.");
    z.creatureNoise(session.roomId);
  } else if (exit.key_item && exit.key_item !== DEEP_HEART && !z.openDoors.has(doorKey)) {
    if (!session.items.some((c) => c.itemId === exit.key_item)) {
      const key = world.itemTemplates.get(exit.key_item);
      return z.send(
        session,
        `A black iron door bars the way ${dir}. It wants ${key ? key.name : "a key"} you do not carry.`,
      );
    }
    // Once opened, open for everyone — until what lives beyond it returns.
    z.openDoors.add(doorKey);
    z.send(session, "The key turns of its own accord. The black door grinds open — and stays open.");
    z.roomFeed(session.roomId, "The black iron door grinds open.", session.pubkey);
    z.roomSound(session.roomId, "Iron grinds against stone, {dir}.");
    z.creatureNoise(session.roomId);
  }

  // A SENTINEL guards the way deeper. Asleep, you can step over it — and that
  // rouses it (you've opened the deep, and now it's up for whoever comes next).
  // Awake, it bars the descent outright: the only way down is to put it down.
  // Heading OUT toward the shallows is always free — it guards the descent, not
  // the exit.
  if (DEEP_ROOMS.has(exit.to_room)) {
    const guard = [...z.creatures.values()].find(
      (c) => c.roomId === session.roomId && SENTINELS.has(c.templateId),
    );
    if (guard) {
      const gt = world.mobTemplates.get(guard.templateId)!;
      if (z.sentinelAwake(guard)) {
        return z.send(session, `${cap(gt.name)} is awake and bars the stair, all three heads low and watching. There is no slipping past it now — put it down, or turn back.`, "dmgin");
      }
      guard.wakeUntil = Date.now() + HOUND_WAKE_MS; // step over it and it stirs
      z.send(session, `You pick your way over ${gt.name}, breath held. Behind you, three heads lift as one — the deep is open, and it is awake.`, "seize");
      z.roomFeed(session.roomId, `${cap(gt.name)} wakes with a low, tripled growl.`, session.pubkey);
      z.roomSound(session.roomId, "A low growl rolls up from {dir} — something big, and awake.");
    }
  }

  const wasFighting = z.inCombat(session);
  // Heavy mail turns blows, but it drags at the escape: leaving a fight in
  // weighted armor risks one parting strike on the way out. The quick flee
  // clean. (Armor still soaks it — that's what it's for.)
  if (wasFighting && z.wornWeight(session) > 0 && chance(PARTING_BLOW_CHANCE)) {
    const striker = [...z.creatures.values()].find(
      (c) => c.roomId === session.roomId && (c.target === session.pubkey || c.id === session.target),
    );
    if (striker) {
      const stmpl = world.mobTemplates.get(striker.templateId)!;
      let pdmg = randInt(stmpl.dmg_min, stmpl.dmg_max);
      pdmg = Math.max(1, Math.round(pdmg * ARMOR_K / (z.equippedArmor(session) + ARMOR_K))); // % mitigation, never immunity
      pdmg = Math.max(1, Math.round(pdmg * STANCE[session.stance].def));
      session.hp -= pdmg;
      z.send(session, `The mail drags at you — ${stmpl.name} lands a parting blow for ${pdmg}. [${Math.max(0, session.hp)}/${session.maxHp} hp]`);
      if (session.hp <= 0) {
        await z.onPlayerDeath(session, stmpl);
        return;
      }
    }
  }
  // Before you slip out, a dormant listener may hear you move for the door
  // and swing as you go — you still leave (if you live), but not always clean.
  if (await ai.wakeListeners(z, session, session.roomId, WAKE_EXIT, "hears you move — and swings as you slip past!")) {
    if (session.hp <= 0) return; // felled on the way out
  }
  session.target = null;
  session.staggered = false; // the opening closes behind you
  session.buying = undefined; // walk off mid-trade and the keeper sweeps it back
  for (const c of z.creatures.values()) {
    if (c.target === session.pubkey && c.roomId === session.roomId) c.target = null;
  }

  const from = session.roomId;
  session.roomId = exit.to_room;
  z.addTrace(session.roomId, { kind: "passage", at: Date.now() });
  z.roomFeed(from, `${session.name} ${wasFighting ? "flees" : "leaves"} ${dir}.`);
  z.roomFeed(session.roomId, `${session.name} arrives.`, session.pubkey);
  // Status first, so the client learns the room's name before the room text
  // prints — the name line paints gold even the very first time you see it.
  z.sendStatus(session);
  z.send(session, z.enterDescribe(session));
  z.refreshRoomCtx(from);
  z.refreshRoomCtx(session.roomId);
  await ai.provokeGrudges(z, session, true); // you walked in — a grudge-holder gets the jump
  // …and a dormant listener might just catch the sound of your arrival.
  await ai.wakeListeners(z, session, session.roomId, WAKE_ENTER, "twists toward the sound of you and lunges!");
  await savePlayer(z.env.DB, session.pubkey, session.roomId, session.hp);
  await z.persist();
}

export function cmdSay(z: ZoneDO, session: Session, msg: string): void {
  if (!msg) return z.send(session, "Say what?");
  z.send(session, `You say, "${msg}"`);
  z.roomFeed(session.roomId, `${session.name} says, "${msg}"`, session.pubkey);
}

export async function cmdGet(z: ZoneDO, session: Session, arg: string): Promise<void> {
  if (!arg) return z.send(session, "Get what?");
  // A journal on the floor is instanced — picking it up carries its pages
  // (and whoever's logs they were). Matched first, ahead of plain loot.
  const inst = takeGroundInstance(z, session.roomId, arg);
  if (inst) return getInstanced(z, session, inst);
  const here = z.ground.get(session.roomId) ?? [];
  const itemId = findItemIn(z, here, arg);
  if (!itemId) return z.send(session, "That isn't lying around here.");
  const tmpl = z.world!.itemTemplates.get(itemId)!;
  if (!z.packRoom(session, itemId)) {
    return z.send(session, `Your pack is full (${PACK_CAP} slots). Drop something, or bank it at a gate.`);
  }

  here.splice(here.indexOf(itemId), 1);
  const rowId = uuid();
  // Gear on the floor carries the wear it landed with (a dropped or fumbled
  // blade doesn't heal by touching the ground). Un-stamped gear is fresh to the
  // floor — spilled off the dead or seeded here — so it rolls scavenged. Non-gear → 100.
  const condKey = `${itemId}@${session.roomId}`;
  const condition = z.groundCond.has(condKey)
    ? z.groundCond.get(condKey)!
    : rollGearCondition(tmpl.slot, false);
  z.groundCond.delete(condKey);
  const carried: CarriedItem = { rowId, itemId, serial: null, equipped: false, condition };
  session.items.push(carried);
  // A regrowing spawn (the shrine's key, a gate's rock) keeps exactly ONE
  // instance in its room. Only re-seed if this pickup left the room without
  // one AND nothing's already regrowing here — otherwise throwing a rock and
  // fetching it back mid-fight would queue a fresh regrow every grab, and the
  // stones would breed. (`here` already had the taken item spliced out above.)
  if (z.world!.groundSpawns.some((g) => g.item_id === itemId && g.room_id === session.roomId && g.regrows)) {
    const stillHere = here.includes(itemId);
    const alreadyRegrowing = z.regrow.some((r) => r.itemId === itemId && r.roomId === session.roomId);
    if (!stillHere && !alreadyRegrowing) {
      z.regrow.push({ itemId, roomId: session.roomId, at: Date.now() + randInt(REGROW_MIN_MS, REGROW_MAX_MS) });
    }
  }
  await insertLoot(z.env.DB, rowId, session.pubkey, itemId, null, condition);
  // Friendly: your FIRST weapon/armor goes on automatically; switching later
  // is a deliberate `equip`. (Never overrides something you've already got on,
  // and never auto-crosses the two-handed rule — that pairing is deliberate.)
  const crossesHands =
    (tmpl.slot === "weapon" && TWO_HANDED.has(tmpl.id) && z.equippedItem(session, "shield") !== null) ||
    (tmpl.slot === "shield" && TWO_HANDED.has(z.equippedItem(session, "weapon")?.tmpl.id ?? ""));
  let readied = "";
  if (tmpl.slot !== "" && !z.equippedItem(session, tmpl.slot) && !crossesHands) {
    carried.equipped = true;
    await setEquipped(z.env.DB, rowId, true);
    readied = tmpl.slot === "weapon" ? " You take it in hand." : " You pull it on.";
  }
  // Stooping under a swing is an opening — snatching your fumbled blade
  // back (or recycling a thrown rock) is possible, never free.
  let stooped = "";
  if (z.inCombat(session)) {
    session.staggered = true;
    stooped = " You stoop for it under the swing — an opening.";
  }
  z.send(session, `You take ${tmpl.name}.` + readied + stooped);
  z.roomFeed(session.roomId, `${session.name} takes ${tmpl.name}.`, session.pubkey, (RARITY_RANK[tmpl.rarity] ?? 0) >= 2); // ordinary pickups local; rare+ still relays ("someone grabbed the legendary")
  z.refreshRoomCtx(session.roomId);
  await z.persist();
  await z.ensureAlarm();
}

export async function cmdDrop(z: ZoneDO, session: Session, arg: string): Promise<void> {
  if (!arg) return z.send(session, "Drop what?");
  const carried = z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  const itemId = carried.itemId;
  const tmpl = z.world!.itemTemplates.get(itemId)!;

  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  // Setting a sealed thing down is letting it go: the claim is released.
  if (carried.serial !== null) await voidMint(z.env.DB, carried.serial);
  // A journal keeps its pages when it hits the floor (they're keyed to the
  // book, not the row) — it lands instanced so the next hand inherits them.
  if (carried.journalId) {
    z.dropInstance(session.roomId, itemId, carried.journalId);
  } else {
    z.ground.set(session.roomId, [...(z.ground.get(session.roomId) ?? []), itemId]);
    if (tmpl.slot !== "") z.groundCond.set(`${itemId}@${session.roomId}`, carried.condition); // gear keeps its wear on the floor
    if (tmpl.edible) z.rot.push({ itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
  }
  z.send(
    session,
    carried.serial !== null
      ? `You set ${tmpl.name} down. The seal cracks as it leaves your hands — the claim is no longer yours.`
      : `You drop ${tmpl.name}.`,
  );
  z.roomFeed(session.roomId, `${session.name} drops ${tmpl.name}.`, session.pubkey);
  z.refreshRoomCtx(session.roomId);
  await z.persist();
  await z.ensureAlarm();
}

export async function cmdStance(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const alias: Record<string, Stance> = {
    reckless: "reckless", aggressive: "reckless", aggro: "reckless", offensive: "reckless", berserk: "reckless", wild: "reckless",
    steady: "steady", balanced: "steady", neutral: "steady", normal: "steady", even: "steady",
    guarded: "guarded", defensive: "guarded", defend: "guarded", cautious: "guarded", turtle: "guarded", guard: "guarded",
  };
  if (!arg) {
    return z.send(session, `You fight ${session.stance}. Change it — stance reckless | steady | guarded (trade offense for defense).`);
  }
  const s = alias[arg.toLowerCase().trim()];
  if (!s) return z.send(session, "Pick a stance: reckless, steady, or guarded.");
  if (s === session.stance) return z.send(session, `You already fight ${s}.`);
  session.stance = s;
  // Persisted to the player row (keyed by pubkey), so it follows you anywhere.
  await setStance(z.env.DB, session.pubkey, s);
  z.send(session, s === "reckless"
    ? "You drop your guard and swing to wound — you hit half again as hard, and take it half again as hard. A true gamble."
    : s === "guarded"
    ? "You close up behind your guard — far less gets through, claws that would open you are half-turned, and a raised shield catches more. But your blows lose their bite."
    : "You settle into an even, steady footing.");
  // The stance chips show the two you're NOT in — so the row has to redraw the
  // moment you switch, or the one you just tapped stays put and it reads as if
  // nothing took. (This was the whole "stances don't work" bug: they worked,
  // the buttons just never moved.)
  z.sendCtx(session);
}

export async function cmdEquip(z: ZoneDO, session: Session, arg: string): Promise<void> {
  if (!arg) return z.send(session, "Equip what?");
  const carried = z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  if (tmpl.slot === "") {
    return z.send(session, `You can't wear or wield ${tmpl.name}.`);
  }
  if (carried.equipped) {
    return z.send(session, `You already have ${tmpl.name} ${tmpl.slot === "weapon" ? "in hand" : "on"}.`);
  }
  // Combat narrows this: worn gear cannot be wrestled on or off mid-fight at
  // all — only the weapon in your hand swaps, and that leaves an opening.
  const fighting = z.inCombat(session);
  if (fighting && tmpl.slot !== "weapon") {
    return z.send(session, "You cannot change your gear while something wants your blood.");
  }
  // TWO_HANDED steel wants both hands: no shield alongside the pike, no
  // pike over a shield. Not enforced mid-fight juggling — just refused.
  if (tmpl.slot === "weapon" && TWO_HANDED.has(tmpl.id) && z.equippedItem(session, "shield")) {
    return z.send(session, `${cap(tmpl.name)} wants both hands — put up your shield first.`);
  }
  if (tmpl.slot === "shield") {
    const inHand = z.equippedItem(session, "weapon");
    if (inHand && TWO_HANDED.has(inHand.tmpl.id)) {
      return z.send(session, `Both your hands are full of ${inHand.tmpl.name}. Lower it first.`);
    }
  }
  // A shield or a two-handed weapon wants the hand your light is in — taking
  // it up snuffs the flame (light.ts). Light or guard, not both.
  if (z.carriesLight(session) && (tmpl.slot === "shield" || (tmpl.slot === "weapon" && TWO_HANDED.has(tmpl.id)))) {
    light.snuffForHand(z, session);
  }
  // One item per slot — set down whatever occupies it first.
  const current = z.equippedItem(session, tmpl.slot);
  if (current) {
    current.carried.equipped = false;
    await setEquipped(z.env.DB, current.carried.rowId, false);
  }
  carried.equipped = true;
  await setEquipped(z.env.DB, carried.rowId, true);
  if (fighting) session.staggered = true;
  z.send(session, (tmpl.slot === "weapon"
    ? `You take ${tmpl.name} in hand${current ? `, setting aside ${current.tmpl.name}` : ""}.`
    : `You pull on ${tmpl.name}${current ? `, shrugging off ${current.tmpl.name}` : ""}.`)
    + (fighting ? " Your eyes leave the fight for a heartbeat — an opening." : ""));
}

export async function cmdRemove(z: ZoneDO, session: Session, arg: string): Promise<void> {
  if (!arg) return z.send(session, "Remove what?");
  const carried = z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  if (!carried.equipped) return z.send(session, `You aren't using ${tmpl.name}.`);
  // Same combat rules as putting things on: armor stays where it is, and
  // lowering your blade mid-fight is an opening.
  const fighting = z.inCombat(session);
  if (fighting && tmpl.slot !== "weapon") {
    return z.send(session, "You cannot change your gear while something wants your blood.");
  }
  carried.equipped = false;
  await setEquipped(z.env.DB, carried.rowId, false);
  if (fighting) session.staggered = true;
  z.send(session, (tmpl.slot === "weapon" ? `You lower ${tmpl.name}.` : `You take off ${tmpl.name}.`)
    + (fighting ? " An opening." : ""));
}

export function itemLine(z: ZoneDO, c: CarriedItem): string {
  const t = z.world!.itemTemplates.get(c.itemId);
  let s = `  ${t ? t.name : c.itemId} [${t?.rarity ?? "?"}]${z.itemStat(t)}`;
  const tags: string[] = [];
  if (c.equipped) tags.push(t?.slot === "weapon" ? "wielded" : "worn");
  if (c.serial !== null) tags.push(`sealed #${c.serial}`);
  // Gear shows its wear whether sealed or not — sealed just wears slower, and
  // you need to see it to know when to mend it.
  if (t && t.slot !== "") tags.push(z.conditionWord(c.condition) || "sound");
  if (tags.length) s += ` — ${tags.join(", ")}`;
  return s;
}

// One keeping's contents as text, grouped like the modal: fungibles collapse
// to a count, gear/equipped/sealed list on their own line.
export function keepingLines(z: ZoneDO, items: CarriedItem[], header: string): string[] {
  const world = z.world!;
  const lines = [header];
  if (items.length === 0) { lines.push("  — empty —"); return lines; }
  const counts = new Map<string, number>();
  for (const c of items) {
    if (z.stackable(c.itemId, c.serial, c.journalId) && !c.equipped) {
      counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + 1);
    }
  }
  for (const [id, n] of counts) {
    const t = world.itemTemplates.get(id);
    lines.push(`  ${t ? t.name : id}${n > 1 ? ` (x${n})` : ""} [${t?.rarity ?? "?"}]${z.itemStat(t)}`);
  }
  for (const c of items) {
    if (z.stackable(c.itemId, c.serial, c.journalId) && !c.equipped) continue; // stacked above
    lines.push(itemLine(z, c));
  }
  return lines;
}

// Typed 'inventory'. At a gate it steps you out (like opening the keeping
// modal): safe, wounds closing, and all three keepings — pack, lockbox, deep
// keep — laid out, with 'stash'/'unstash'/'vault' to move things and 'look'
// to step back. In the dungeon it's a light glance (pack + the lockbox that
// rides with you), no stepping out. In a fight, your pack only.
export async function cmdInventory(z: ZoneDO, session: Session): Promise<void> {
  const world = z.world!;
  if (z.inCombat(session)) {
    return z.send(session, keepingLines(z, session.items, `You carry (${z.slotsUsed(session.items)}/${PACK_CAP}):`).join("\n"));
  }
  const atGate = world.entryRooms.has(session.roomId);
  const lockbox = await loadContainer(z.env.DB, session.pubkey, "lockbox");
  const out: string[] = [];
  out.push(...keepingLines(z, session.items, `You carry (${z.slotsUsed(session.items)}/${PACK_CAP}):`));
  out.push(...keepingLines(z, lockbox, `Lockbox (${z.slotsUsed(lockbox)}/${LOCKBOX_CAP}):`));
  if (atGate) {
    const vault = await loadContainer(z.env.DB, session.pubkey, "vault");
    out.push(...keepingLines(z, vault, `The deep keep (${z.slotsUsed(vault)}/${VAULT_CAP}):`));
    z.enterStep(session, "sorting"); // step out to sort, safe in the gatehouse
    out.push("('stash'/'unstash'/'vault' to move things; 'look' steps you back into the world.)");
  } else {
    out.push("(The deep keep waits at the gates. 'stash'/'unstash' move things to the lockbox that rides with you.)");
  }
  z.send(session, out.join("\n"));
}

export function cmdWho(z: ZoneDO, session: Session): void {
  const world = z.world!;
  const awake = [...z.sessions.values()].filter((s) => !s.away);
  const lines = [`Awake in the Door (${awake.length}):`];
  for (const s of awake) {
    lines.push(`  ${s.name} — ${world.rooms.get(s.roomId)?.name ?? s.roomId}`);
  }
  z.send(session, lines.join("\n"));
}

export async function cmdName(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const name = arg.trim();
  if (!name) return z.send(session, `Name yourself what? (name <yourname>)`);
  if (!/^[a-z0-9][a-z0-9_-]{1,15}$/i.test(name)) {
    return z.send(
      session,
      "Names are 2-16 characters: letters, numbers, - or _.",
    );
  }
  if (name.toLowerCase() === session.name.toLowerCase()) {
    return z.send(session, `You are already ${session.name}.`);
  }
  const ok = await renamePlayer(z.env.DB, session.pubkey, name);
  if (!ok) return z.send(session, `Someone in the dungeon already answers to ${name}.`);
  const old = session.name;
  session.name = name;
  session.named = true;
  z.send(session, `The dungeon will remember you as ${name}.`);
  z.roomFeed(session.roomId, `${old} is now known as ${name}.`, session.pubkey);
  z.sendStatus(session);
}

export function cmdRest(z: ZoneDO, session: Session): void {
  if (z.inCombat(session)) {
    return z.send(session, "Rest, now? Something here has other plans for you.");
  }
  // You can't close your eyes with something sharing the room, even if it
  // hasn't turned on you yet — a rat in the corner is a knife waiting to be
  // drawn. (A hidden lurker doesn't block it: you don't know it's there, and
  // resting into its jaws is exactly the risk it lives on.)
  const menace = [...z.creatures.values()].find(
    (c) => c.roomId === session.roomId && !c.hidden,
  );
  if (menace) {
    const mt = z.world!.mobTemplates.get(menace.templateId)!;
    return z.send(session, `Not with ${mt.name} in the room. You'd never close your eyes.`);
  }
  if (session.hp >= session.maxHp) return z.send(session, "You are unhurt.");
  if (session.resting) return z.send(session, "You are already resting.");
  session.resting = true;
  z.addTrace(session.roomId, { kind: "rest", at: Date.now() });
  z.send(session, pick([
    "You settle against the cold stone. Wounds close slowly here — any effort ends it.",
    "You lower yourself down and let your breathing slow. The ache eases, little by little — any effort ends it.",
    "You find a wall to put your back to and go still. Blood stops where it was running — any effort ends it.",
    "You sink down where you stand and let the dark hold you a while. The hurt recedes — any effort ends it.",
  ]));
  z.roomFeed(session.roomId, `${session.name} settles down to rest.`, session.pubkey, false); // resting: local only, nobody spectates a nap
}

// Fishing: only off the Pocket of Air's dry shelf, a line dropped into the
// black flood below. Rarely anything takes it — but a fish is good, fresh
// food, and the eel is a real meal. A short patience between casts.
export async function cmdFish(z: ZoneDO, session: Session): Promise<void> {
  const world = z.world!;
  if (z.inCombat(session)) return z.send(session, "Not with something trying to kill you.");
  if (!FISHING_ROOMS.has(session.roomId)) {
    return z.send(session, "There's no water here to fish. You'd need to drop a line where the flood pools deep.");
  }
  const now = Date.now();
  if (session.lastFishAt && now - session.lastFishAt < FISH_COOLDOWN_MS) {
    return z.send(session, "You've only just cast. Let the line settle.");
  }
  session.lastFishAt = now;
  if (!chance(FISH_ODDS)) {
    return z.send(session, pick([
      "You lower a line into the black water and wait. Nothing takes it.",
      "The water lies flat and still. Whatever's down there isn't hungry.",
      "A tug — then slack. Gone before you could haul it up.",
      "You wait, and wait, and the flood keeps its own.",
      "Something brushes the line and thinks better of it.",
    ]));
  }
  const fishId = chance(PALE_EEL_ODDS) ? "pale-eel" : "cave-fish";
  const fish = world.itemTemplates.get(fishId);
  if (!fish) return z.send(session, "Something takes the line — but it slips free before you can land it.");
  if (!(await z.grantItem(session, fish.id))) {
    return z.send(session, `Something takes the line — but your pack is full, and you have to let ${fish.name} go.`);
  }
  z.send(session, (fishId === "pale-eel"
    ? `The line goes taut and FIGHTS you — you haul up ${fish.name}, thrashing.`
    : `The line goes taut — you haul up ${fish.name}.`)
    + ` [${fish.rarity}] (unclaimed — good, fresh food)`, "gain");
  z.roomFeed(session.roomId, `${session.name} lands a catch from the flood.`, session.pubkey);
  z.sendCtx(session);
  await z.persist();
}

export function cmdCarve(z: ZoneDO, session: Session, arg: string): void {
  const words = arg.replace(/[\r\n\t]+/g, " ").replace(/"/g, "'").trim();
  if (!words) return z.send(session, "Carve what? (carve <words>)");
  if (words.length > CARVE_MAX_LEN) {
    return z.send(session, `The stone only takes ${CARVE_MAX_LEN} characters. Chisel it down.`);
  }
  z.addTrace(session.roomId, { kind: "carve", at: Date.now(), label: session.name, words });
  z.send(session, `You scratch it into the stone: "${words}"`, "study");
  z.roomFeed(session.roomId, `${session.name} scratches something into the wall.`, session.pubkey);
  z.roomSound(session.roomId, "A faint scratching, {dir}.");
  z.creatureNoise(session.roomId);
}

// Take one thing out of the pack and eat it: off the inventory, out of the
// DB, its seal (if any) voided, and the heal applied. Shared by the `eat`
// command and the auto-eat reflex, so both do it exactly the same way.
export async function consumeFood(z: ZoneDO, 
  session: Session,
  carried: CarriedItem,
): Promise<{ before: number; tmpl: ItemTemplate }> {
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  if (carried.serial !== null) await voidMint(z.env.DB, carried.serial);
  const before = session.hp;
  session.hp = Math.min(session.maxHp, session.hp + tmpl.heal);
  return { before, tmpl };
}

// The provisional food a player is carrying, weakest heal first — the order
// both manual `eat` (unhurt-safe default) and auto-eat draw from. Sealed
// rations are never touched by accident.
export function carriedFood(z: ZoneDO, session: Session): CarriedItem[] {
  const world = z.world!;
  return session.items
    .filter((c) => world.itemTemplates.get(c.itemId)?.edible)
    .sort((a, b) =>
      Number(a.serial !== null) - Number(b.serial !== null) ||
      (world.itemTemplates.get(a.itemId)!.heal - world.itemTemplates.get(b.itemId)!.heal));
}

export async function cmdEat(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const world = z.world!;
  // Provisional food first — nobody eats the sealed rations by accident.
  const edibles = carriedFood(z, session);
  if (edibles.length === 0) return z.send(session, "You carry nothing you could eat.");

  let carried: CarriedItem | null;
  if (!arg) {
    carried = edibles[0];
  } else {
    carried = z.findCarried(session, arg);
    if (!carried) return z.send(session, "You carry nothing like that.");
    if (!world.itemTemplates.get(carried.itemId)?.edible) {
      return z.send(session, `You gnaw at ${world.itemTemplates.get(carried.itemId)!.name}. It is not food.`);
    }
  }
  const { before, tmpl } = await consumeFood(z, session, carried);
  // Bolting food mid-fight is allowed — desperation is — but you drop your
  // guard to do it, and the next hit that lands makes you pay for the bite.
  const gulped = z.inCombat(session);
  if (gulped) session.staggered = true;
  z.send(
    session,
    (session.hp > before
      ? `You eat ${tmpl.name}. ${pick([
          "Warmth comes back to you.",
          "It sits like a coal in your belly, and some of the grey lifts.",
          "It is barely food, but your hands steady.",
          "Strength trickles back into your limbs.",
          "The gnawing eases, and you feel a little less like dying.",
        ])} [${session.hp}/${session.maxHp} hp]`
      : `You eat ${tmpl.name}.`)
    + (gulped ? " You bolt it down with one eye on your foe — an opening." : ""),
    "gain",
  );
  z.roomFeed(session.roomId, `${session.name} eats ${tmpl.name}.`, session.pubkey);
  z.sendStatus(session);
  z.sendCtx(session);
  await savePlayer(z.env.DB, session.pubkey, session.roomId, session.hp);
}

// ---- wounds & dressings (Phase 1: the deep gets teeth) ----

// The dressings a player carries, weakest first — the order both a manual
// `bandage` and the auto-bind reflex draw from. Sealed loot is never spent.
export function carriedBandages(z: ZoneDO, session: Session): CarriedItem[] {
  const world = z.world!;
  return session.items
    .filter((c) => (world.itemTemplates.get(c.itemId)?.staunch ?? 0) > 0 && c.serial === null)
    .sort((a, b) => world.itemTemplates.get(a.itemId)!.staunch - world.itemTemplates.get(b.itemId)!.staunch);
}

// Bind a wound: spend one dressing, clot the bleed, staunch some hp. Shared by
// the manual `bandage` and the auto-bind reflex so both do it identically.
export async function applyBandage(z: ZoneDO, session: Session, carried: CarriedItem, auto: boolean): Promise<void> {
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  const before = session.hp;
  session.bleedTicks = 0; session.bleedDmg = 0; // the wound is bound
  session.hp = Math.min(session.maxHp, session.hp + tmpl.staunch);
  z.send(session, (auto
    ? `Your hands move on their own — you bind the wound with ${tmpl.name}.`
    : `You bind your wounds with ${tmpl.name}.`)
    + (session.hp > before ? ` The bleeding stops. [${session.hp}/${session.maxHp} hp]` : " The bleeding stops."), "gain");
  z.roomFeed(session.roomId, `${session.name} binds a wound.`, session.pubkey, false);
  z.sendStatus(session);
  z.sendCtx(session);
  await savePlayer(z.env.DB, session.pubkey, session.roomId, session.hp);
}

export async function cmdBandage(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const dressings = carriedBandages(z, session);
  if (dressings.length === 0) return z.send(session, "You carry nothing to bind a wound with.");
  let carried: CarriedItem | null;
  if (!arg) carried = dressings[0];
  else {
    carried = z.findCarried(session, arg);
    if (!carried) return z.send(session, "You carry nothing like that.");
    if ((z.world!.itemTemplates.get(carried.itemId)?.staunch ?? 0) <= 0)
      return z.send(session, `${cap(z.world!.itemTemplates.get(carried.itemId)!.name)} won't dress a wound.`);
  }
  if (!session.bleedTicks && session.hp >= session.maxHp)
    return z.send(session, "You've no wound to bind, and full blood — no sense wasting a dressing.");
  await applyBandage(z, session, carried, false);
}

// ---- instanced floor items (journals carry their pages onto the stones) ----

// Find and lift a matching instanced item off the floor (removed from the
// ground the moment it's matched; the caller mints it into a pack).
export function takeGroundInstance(z: ZoneDO, roomId: string, arg: string): GroundInstance | null {
  const here = z.groundInstances.get(roomId);
  if (!here?.length) return null;
  const idx = here.findIndex((g) => {
    const t = z.world!.itemTemplates.get(g.itemId);
    return t && nameMatches(t.name, arg);
  });
  if (idx === -1) return null;
  const [inst] = here.splice(idx, 1);
  if (!here.length) z.groundInstances.delete(roomId); else z.groundInstances.set(roomId, here);
  return inst;
}

// Pick up an instanced journal: a fresh pack row stamped with the book's own
// id, so its pages (journal_logs, keyed to that id) find it again — the whole
// point of the thing being stealable.
export async function getInstanced(z: ZoneDO, session: Session, inst: GroundInstance): Promise<void> {
  const tmpl = z.world!.itemTemplates.get(inst.itemId)!;
  if (!z.packRoom(session, inst.itemId)) {
    z.dropInstance(session.roomId, inst.itemId, inst.journalId); // put it back down
    return z.send(session, `Your pack is full (${PACK_CAP} slots) — no room for ${tmpl.name}.`);
  }
  const rowId = uuid();
  const carried: CarriedItem = { rowId, itemId: inst.itemId, serial: null, equipped: false, condition: 100, journalId: inst.journalId };
  session.items.push(carried);
  await insertLoot(z.env.DB, rowId, session.pubkey, inst.itemId, null);
  await setItemJournalId(z.env.DB, rowId, inst.journalId);
  let stooped = "";
  if (z.inCombat(session)) { session.staggered = true; stooped = " You stoop for it under the swing — an opening."; }
  const pages = (await journalLoad(z.env.DB, inst.journalId)).length;
  z.send(session, `You take ${tmpl.name}.` + (pages ? ` Its pages are already ${pages > 8 ? "densely" : "half"} filled — someone else's hunting, now yours.` : "") + stooped);
  z.roomFeed(session.roomId, `${session.name} takes ${tmpl.name}.`, session.pubkey, (RARITY_RANK[tmpl.rarity] ?? 0) >= 2); // ordinary pickups local; rare+ still relays ("someone grabbed the legendary")
  z.refreshRoomCtx(session.roomId);
  await z.persist();
  await z.ensureAlarm();
}

export function findItemIn(z: ZoneDO, itemIds: string[], arg: string): string | null {
  for (const id of itemIds) {
    const t = z.world!.itemTemplates.get(id);
    if (t && nameMatches(t.name, arg)) return id;
  }
  return null;
}

export function findPlayerIn(z: ZoneDO, roomId: string, arg: string): Session | null {
  for (const s of z.sessions.values()) {
    if (s.roomId === roomId && s.name.toLowerCase().startsWith(arg)) return s;
  }
  return null;
}

// ---- messages out ----
