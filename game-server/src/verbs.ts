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
  setItemLoreId, deedsBump,
} from "./world";
import { cap, dirPhrase, nameMatches, rollGearCondition, heartWord, heartProse, foodWord, foodProse, foodState } from "./zone-util";
import { chance, randInt, uuid, pick } from "./rng";
import * as ai from "./ai";
import * as light from "./light";
import * as events from "./events";
import * as pvp from "./pvp";
import * as lore from "./lore";
import {
  PACK_CAP, LOCKBOX_CAP, VAULT_CAP, SEIZE_BREAK_ODDS, SLICK, SLICK_BREAK_BONUS,
  PARTING_BLOW_CHANCE, FISHING_ROOMS, FISHING_SURFACE, FISH_ODDS, PALE_EEL_ODDS, FISH_COOLDOWN_MS,
  RAIN_BITE_MULT, LAMPREY_ODDS, EEL_SURFACE_ODDS, JUNK_SNAG_ODDS, FISH_POOL_CATCHES, FISH_POOL_REST_MS,
  CARVE_MAX_LEN, TWO_HANDED, HOBBLE_FLEE_MS, DEEP_HEART, HEART_FRESH_SEC, DEEP_DOOR_OPEN_MS, DEEP_DOOR_KEY, DEEP_ROOMS, SENTINELS, HOUND_WAKE_MS, HOUND_HEADS, TREASURY_DOORS, TORCH_ITEM,
  ARMOR_K, STANCE, WAKE_ENTER, WAKE_EXIT, PLAYER_DMG_MIN, PLAYER_DMG_MAX, REGROW_MIN_MS, REGROW_MAX_MS, ROT_MS,
  DEAD_STOCK, CARRION_ROOMS, STOCK_REGROW_MIN_MS, STOCK_REGROW_MAX_MS, GEAR_ROLL_MIN_MS, GEAR_ROLL_MAX_MS, RELIABLE_GEAR,
  DROWNERS, HOLLOW, THIEVES, LURKERS, STILL_SOUNDS, DIR_ORDER, LIGHTS_ROOMS, CLATTER_ODDS, KIT_TELLS, SHIELD_WALL, REFLECTION_LIE_ODDS, CIGARETTES, FOOD_KEEPS, FOOD_SPOIL_HEAL_MULT,
  SMOKEHOUSE_ROOM, CURE_MS, GATE_CURE_MS, CURE_RECIPES, TORCH_BURN_MS,
} from "./zone-data";
import { gatehouseFeed, throughTheDoor } from "./gate";

// The old word. Nothing happens — but the dungeon heard you ask.
export function cmdXyzzy(z: ZoneDO, session: Session): void {
  z.send(session, "You mouth the old word into the dark. Nothing happens. Something, somewhere, declines to be impressed.");
}

// Light one from the tin. No stat, no cure — a moment's calm that costs you:
// the smell rides the draft into the next room, and the dark leans in to look.
// (What the tin is really worth is never said here. That's for the finding.)
export function cmdSmoke(z: ZoneDO, session: Session, arg = ""): void {
  // "smoke <meat>" is the natural way to reach for the racks — in the smokehouse,
  // smoking a raw haunch means CURING it, not lighting a cigarette. Delegate.
  if (arg && session.roomId === SMOKEHOUSE_ROOM) {
    const c = z.findCarried(session, arg);
    if (c && CURE_RECIPES[c.itemId]) { void cmdCure(z, session, arg); return; }
  }
  if (!session.items.some((c) => CIGARETTES.has(c.itemId))) {
    return z.send(session, "You pat yourself down for a smoke and come up with nothing but lint.");
  }
  z.send(session, "You work one loose and light it. The first drag steadies your hands; for a breath, the dungeon is just a room you happen to be in.", "gain");
  const line = `${session.name} lights a cigarette; the ember flares, then settles to a slow red eye.`;
  // Behind the door the ember is just company: the gatehouse hears it, but the
  // wire and the dark do not — the smell can't drift through the door, and no
  // creature is coming for you in the sanctuary. Out in the world it's a deed
  // AND a tell: the room sees it, the arena feed carries it, the dark leans in.
  if (z.outOfWorld(session)) {
    gatehouseFeed(z, line, session.pubkey);
    return;
  }
  z.actorFeed(session, session.roomId, line);
  z.roomSound(session.roomId, "A thread of tobacco smoke drifts in {dir}.");
  z.creatureNoise(session.roomId); // a lit ember and a smell — the dark notices
}

// The smokehouse racks. Feed the cold fire a torch and hang raw meat: it cures
// on the rot clock run backward (CURE_MS) into its keeping form — heals more,
// never spoils. It hangs on a SHARED floor while it works, raw and reeking, so
// the wager is real: come back before a scavenger or another delver lifts it.
// rome (2026-07-17): "a path to making preserved food." This is the path.
// The SAFE gate smokehouse: hang raw meat on your OWN racks (instanced behind the
// door — nothing can lift it), no torch (the gate keeps its hearth), and it cures
// over GATE_CURE_MS even while you're away. Slower than the deep racks — their only
// edge is speed. Collected LAZILY: any joint whose timer has run drops into your
// pack the moment you read the racks back at the gate. Gate-cures ride in z.rot
// (kind "gatecure", roomId = your pubkey) for free persistence; the floor sweep
// skips them, so they wait for your hand however long you're gone.
async function cureAtGate(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const world = z.world!;
  const now = Date.now();
  // First, take down anything that cured through while you were away (as pack allows).
  let collected = 0;
  for (const r of z.rot.filter((r) => r.kind === "gatecure" && r.roomId === session.pubkey && r.at <= now)) {
    const out = CURE_RECIPES[r.itemId] ?? "smoked-haunch";
    if (!z.packRoom(session, out)) continue; // no room — leave it hanging, safe, for when you make space
    const id = uuid();
    await insertLoot(z.env.DB, id, session.pubkey, out, null);
    session.items.push({ rowId: id, itemId: out, serial: null, equipped: false, condition: 100 });
    z.rot.splice(z.rot.indexOf(r), 1);
    collected++;
  }
  const got = collected ? `You take ${collected === 1 ? "a cured haunch" : collected + " cured joints"} down off the gate-racks — gone black and hard, and keeping now. ` : "";

  // Everything at a gate is at your elbow — pack, lockbox, and vault alike — so
  // hang raw meat from any of them (parity with smelt, which spends scrap across
  // all three). Prefer a CURABLE match over a same-named raw that never could.
  const pools = await z.gatePools(session);
  const flat = pools.flat();
  const named = (c: CarriedItem) => nameMatches(world.itemTemplates.get(c.itemId)!.name, arg);
  if (arg) {
    const curable = flat.find((c) => CURE_RECIPES[c.itemId] && c.serial === null && named(c));
    const carried = curable ?? flat.find(named);
    if (!carried) return z.send(session, got + "You carry nothing like that.", got ? "gain" : undefined);
    const outId = CURE_RECIPES[carried.itemId];
    if (!outId) return z.send(session, got + `${cap(world.itemTemplates.get(carried.itemId)!.name)} won't cure. The racks are for raw meat — a haunch, a slab of flesh.`, got ? "gain" : undefined);
    if (carried.serial !== null) return z.send(session, got + "That one's sealed for extraction. Break the seal before you'd hang it in the smoke.", got ? "gain" : undefined);
    const rawName = world.itemTemplates.get(carried.itemId)!.name;
    // Remove the row wherever it lived — a pack row leaves session.items too; a
    // lockbox/vault row is only in D1, so removeItemRow alone clears it.
    const packIdx = session.items.indexOf(carried);
    if (packIdx !== -1) session.items.splice(packIdx, 1);
    await removeItemRow(z.env.DB, carried.rowId);
    z.rot.push({ itemId: carried.itemId, roomId: session.pubkey, at: now + GATE_CURE_MS, kind: "gatecure" });
    const mins = Math.round(GATE_CURE_MS / 60_000);
    z.send(session, got + `You hang ${rawName} on the gate's own smoke-racks, safe behind the door. Give it about ${mins} minutes — it cures while you're gone, and nothing in here or out there can lift it. Come back and take it down keeping. ('cure' reads the racks.)`, "gain");
    gatehouseFeed(z, `${session.name} hangs meat on the gate smoke-racks.`, session.pubkey);
    z.sendCtx(session);
    await z.persist();
    return;
  }

  // No-arg: read the racks.
  const still = z.rot.filter((r) => r.kind === "gatecure" && r.roomId === session.pubkey && r.at > now);
  // Cured-through but not taken down — the only reason after the collect loop is a
  // full pack. Name it so a ready haunch never silently vanishes from the readout.
  const readyStuck = z.rot.filter((r) => r.kind === "gatecure" && r.roomId === session.pubkey && r.at <= now);
  const haveRaw = flat.some((c) => CURE_RECIPES[c.itemId] && c.serial === null);
  let hanging = "";
  if (still.length) {
    const left = Math.min(...still.map((r) => r.at)) - now;
    const mins = Math.max(1, Math.ceil(left / 60_000));
    hanging = ` ${still.length === 1 ? "A haunch hangs" : still.length + " joints hang"} on the racks, curing — ${left <= 20_000 ? "all but done" : "about " + mins + " minute" + (mins === 1 ? "" : "s") + " yet"}.`;
  }
  if (readyStuck.length) hanging += ` ${readyStuck.length === 1 ? "A cured haunch waits" : readyStuck.length + " cured joints wait"} on the racks, but your pack is full — make room and 'cure' takes them down.`;
  const base = "The gate keeps its own smoke-racks in the warm behind the door. Feed them raw meat — 'cure haunch' — and it cures safe while you're away, slower than the deep racks but nothing can ever lift it."
    + (haveRaw ? "" : " (You've nothing raw to hang.)");
  z.send(session, (got + base + hanging).trim(), collected ? "gain" : undefined);
  if (collected) { z.sendCtx(session); await z.persist(); }
}

export async function cmdCure(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const world = z.world!;
  if (z.outOfWorld(session)) return cureAtGate(z, session, arg); // behind the gate door: the SAFE racks
  if (session.roomId !== SMOKEHOUSE_ROOM) {
    return z.send(session, "There are no smoke-racks here. The old smokehouse lies deep, below the larder — or cure it safe at any gate ('cure' behind the door).");
  }
  // The racks share ONE fire (groundTorch — the same lit-floor flame that lights
  // the whole room). A torch lights it, and while it burns you can load the racks
  // with as many joints as you like, no fresh torch each time. It only guts out
  // after TORCH_BURN_MS.
  const lit = Date.now() < (z.groundTorch.get(SMOKEHOUSE_ROOM) ?? 0);
  if (!arg) {
    const haveRaw = session.items.some((c) => CURE_RECIPES[c.itemId] && c.serial === null);
    const haveTorch = session.items.some((c) => c.itemId === TORCH_ITEM && c.serial === null);
    // What's already hanging, and how long it has yet — so a hung haunch isn't an
    // act of faith with no clock (rome, 2026-07-17: "it doesnt let someone know
    // it will be done in 3 mins"). Reads the live cure-timers off the rot clock.
    const curing = z.rot.filter((r) => r.kind === "cure" && r.roomId === SMOKEHOUSE_ROOM);
    let hanging = "";
    if (curing.length) {
      const left = Math.min(...curing.map((r) => r.at)) - Date.now();
      const mins = Math.max(1, Math.ceil(left / 60_000));
      hanging = ` ${curing.length === 1 ? "A haunch hangs" : curing.length + " joints hang"} in the smoke, curing — ${left <= 20_000 ? "all but done now" : "about " + mins + " minute" + (mins === 1 ? "" : "s") + " yet"}. Leave them hanging; lift one early and it's raw still.`;
    }
    return z.send(session, (lit
      ? "The smoke-racks are burning, smoke crawling up the black brick. Hang what raw meat you've got — 'cure haunch' — and load them while the fire holds; each joint keeps on its own once it's cured through."
        + (haveRaw ? "" : " (Though you've nothing raw to hang.)")
      : "The smoke-racks hang cold in the black brick, waiting. Feed them a torch and hang raw meat — 'cure haunch' — and the old grease-fire wakes; once it's lit you can load the racks with all you carry. It cures where it hangs, so mind that something hungry doesn't come for it first."
        + (haveRaw && haveTorch ? "" : haveRaw ? " (You've meat to hang, but no torch to wake the fire.)" : haveTorch ? " (You've a torch, but nothing raw to cure.)" : ""))
      + hanging);
  }
  // Prefer a CURABLE match: "cure haunch" should find the hyena haunch that CAN
  // smoke, not the rat-meat ALSO named "a haunch of rat meat" that never could
  // (the same name collision that bit the rock — resolve to what the verb is for).
  const curable = session.items.find((c) => CURE_RECIPES[c.itemId] && c.serial === null && nameMatches(world.itemTemplates.get(c.itemId)!.name, arg));
  const carried = curable ?? z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  const out = CURE_RECIPES[carried.itemId];
  if (!out) return z.send(session, `${cap(world.itemTemplates.get(carried.itemId)!.name)} won't cure. The racks are for raw meat — a haunch, a slab of flesh.`);
  if (carried.serial !== null) return z.send(session, "That one's sealed for extraction. Break the seal before you'd hang it in the smoke.");

  // No live fire? Spend one torch to wake the racks — that lights the room too, and
  // buys the whole TORCH_BURN_MS window to hang the rest of your kills for free.
  if (!lit) {
    const torch = session.items.find((c) => c.itemId === TORCH_ITEM && c.serial === null);
    if (!torch) return z.send(session, "The racks are dead cold, and cold racks cure nothing. You'd need a torch to wake the old grease-fire.");
    session.items.splice(session.items.indexOf(torch), 1);
    await removeItemRow(z.env.DB, torch.rowId);
    z.groundTorch.set(SMOKEHOUSE_ROOM, Date.now() + TORCH_BURN_MS);
  }

  // The raw meat leaves the pack onto the floor with its own cure-timer (rot kind
  // "cure"); the rot sweep swaps each for its keeping form as it comes through.
  const rawName = world.itemTemplates.get(carried.itemId)!.name;
  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  z.ground.set(SMOKEHOUSE_ROOM, [...(z.ground.get(SMOKEHOUSE_ROOM) ?? []), carried.itemId]);
  z.stampFresh(SMOKEHOUSE_ROOM, carried.itemId);
  z.rot.push({ itemId: carried.itemId, roomId: SMOKEHOUSE_ROOM, at: Date.now() + CURE_MS, kind: "cure" });

  z.send(session, (lit
    ? `You hang ${rawName} among what's already smoking. The racks take it without complaint; the fire has room yet.`
    : `You feed the racks a torch. Old grease catches with a reek, smoke crawls up the black brick, and the whole room glows with it. You hang ${rawName} in the smoke and leave it to the fire.`)
    + " Give it a few minutes and it comes down black and keeping — leave it hanging, for a haunch lifted early is raw still. ('cure' reads the racks.)", "gain");
  z.roomFeed(SMOKEHOUSE_ROOM, lit
    ? `${session.name} hangs ${rawName} in the burning smoke-racks.`
    : `${session.name} wakes the smoke-racks with a torch and hangs ${rawName} to cure.`, session.pubkey, false);
  z.sendStatus(session);
  z.sendCtx(session);
  await z.persist();
  await z.ensureAlarm();
}

// Nobody knows what this does. That includes the dungeon.
export function cmdSquink(z: ZoneDO, session: Session): void {
  z.send(session, "You squink. Somewhere below, something squinks back.");
  z.roomFeed(session.roomId, `${session.name} squinks. It echoes longer than it should.`, session.pubkey, false);
  z.roomSound(session.roomId, "Something squinks, {dir}.");
  z.creatureNoise(session.roomId); // squinking is not free
}

// ---- looking at another wanderer: the sizing-up ----
// The one read that decides rob / avoid / run, so it shows what a body honestly
// shows: the steel in their hands, the kit on their back and how hard it's been
// used, and whether their pack rides heavy (rome, 2026-07-12).
// Deliberately NOT shown, by standing law: any kill tally (blood on the killer,
// never names on the wall — bloodClause IS the reputation system), and what's
// IN the pack. You cannot see inside a man's bag; the burden tell says HEAVY,
// and robbing him is how you learn the rest.
// A stranger's gear is NAMED but never GRADED: you can see the mace, not that
// it's at 41%. The whole kit gets one prose impression instead (kitTell below).
function gearWord(_z: ZoneDO, g: { carried: CarriedItem; tmpl: ItemTemplate }): string {
  return g.tmpl.name;
}

// The impression: the average state of everything they wear and wield, in one
// descriptive sentence. Never a number, never a per-piece tag.
function kitTell(pieces: { carried: CarriedItem }[]): string {
  if (pieces.length === 0) return "";
  const avg = pieces.reduce((s, p) => s + p.carried.condition, 0) / pieces.length;
  const band = KIT_TELLS.find((b) => avg >= b.at) ?? KIT_TELLS[KIT_TELLS.length - 1];
  return pick(band.lines);
}

function andList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function describePlayer(z: ZoneDO, session: Session, other: Session): string {
  // What the sky and the dark let you SEE of a stranger. The room already tells
  // you what weather you're standing in (skyClause); this is what that weather
  // COSTS you. Without it, the sim contradicted itself: the room said "you can
  // see nothing, not what shares it with you," and a look still read a man's
  // whole loadout off him in pitch black (rome, 2026-07-12).
  const roomId = session.roomId;

  // No light in the lightless deep: you get nothing — and cmdLook never even
  // looks a player up while blind (naming one must not confirm they're there).
  // This branch is defense-in-depth for any future caller, and it does NOT
  // echo the name back for the same reason.
  if (z.isDark(roomId) && !z.carriesLight(session)) {
    return "You can make out no one in this dark — shapes and breath and nothing you would swear to. (a light would show the room)";
  }
  // The fog blanks a man exactly as it blanks a beast (fogTell): you can see
  // that someone is standing there, and not one thing about them.
  if (events.foggy(z, roomId)) {
    return `${other.name} is a grey shape in the fog — near enough to name, too deep in it to read. That they are there is all of it.`;
  }
  // Rain: the big silhouette survives a downpour — steel, armor, a stuffed pack,
  // a burning brand. The FINE read does not. You cannot judge the wear on a
  // man's kit through hammering rain, and you cannot read the stains on his
  // hands. Rain is the murderer's weather: it hides his approach, hides his
  // guilt, and washes it off him besides (see rainThinsBlood).
  const inRain = events.raining(z, roomId);

  const cond = other.hp >= other.maxHp ? "unhurt"
    : other.hp > other.maxHp * 0.66 ? "bruised but standing"
    : other.hp > other.maxHp * 0.33 ? "badly hurt"
    : "at the very edge of it";
  const out = [`${other.name}, a fellow wanderer (${cond}).`];

  // The hands first: steel is what decides whether this is a threat or a mark.
  const w = z.equippedItem(other, "weapon");
  const sh = z.equippedItem(other, "shield");
  if (w && sh) out.push(`${cap(gearWord(z, w))} hangs in their fist, ${gearWord(z, sh)} strapped to the arm.`);
  else if (w) out.push(`${cap(gearWord(z, w))} hangs in their fist.`);
  else if (sh) out.push(`They hold ${gearWord(z, sh)}, and nothing to swing with.`);
  else out.push("Their hands are empty.");

  // The back: what would turn a blade.
  const wornGear = ["armor", "helm", "feet", "cloak"]
    .map((s) => z.equippedItem(other, s))
    .filter((g): g is { carried: CarriedItem; tmpl: ItemTemplate } => !!g);
  out.push(wornGear.length
    ? `They wear ${andList(wornGear.map((g) => gearWord(z, g)))}.`
    : "They wear nothing that would turn a blade.");

  // How hard all of it has been used — an impression across the whole kit, so
  // no single piece hands you its breaking point. Washed out by the rain.
  if (!inRain) {
    const tell = kitTell([...(w ? [w] : []), ...(sh ? [sh] : []), ...wornGear]);
    if (tell) out.push(tell);
  }

  // A flame in the hand: they have made their peace with being seen.
  if (z.carriesLight(other)) {
    out.push(other.litSource === "lantern"
      ? "A hooded lantern swings at their side, its bead of light steady."
      : "A torch burns in their hand, and their shadow swings on the wall behind them.");
  }

  // The loot tell — and, in the same breath, the weakness. A man over the
  // burden line is worth robbing AND cannot slip a blow or break away clean.
  if (z.burdened(other)) {
    out.push("Their pack rides heavy and stuffed — loose iron they aren't wearing, and it won't ride quiet.");
  }

  // Blood on the hands is a close read, and the downpour takes it — you cannot
  // read a man's stains through hammering rain (and it's washing them off him
  // as you look). The one weather that hides a murderer from a witness.
  if (inRain) {
    out.push("The rain runs off them in sheets; you could read nothing finer on them than the steel.");
    return out.join(" ");
  }
  return out.join(" ") + pvp.bloodClause(z, other.pubkey);
}

// ---- verbs ----

// The still-water look: your own face, worse for wear — and rarely, a face that
// doesn't obey. Pure dread, no mechanic, no state. The lie is rare on purpose.
function reflection(): string {
  if (!chance(REFLECTION_LIE_ODDS)) {
    return pick([
      "You lean over the still water. Your own face swims up out of the dark to meet you — hollow-eyed, worse for the wear, but yours.",
      "The water holds still enough to throw your face back: gaunt, grimed, a stranger you know. Yours.",
      "You look down into the water. There you are, dim and wavering — tired, and older than you left.",
    ]);
  }
  // The Narcissus lie: the water shows you a face lovelier than the one you
  // own, unmarked and unhurried, and it does not want you to leave. In a place
  // like this, a pool that holds your gaze is the deadliest thing in the room.
  return pick([
    "You lean over the still water — and the face that rises is yours, but kinder: unscarred, unhurried, lovely in a way you have never been. You find you have leaned closer. It takes something to straighten up.",
    "Your reflection swims up out of the dark, and it is beautiful. Too beautiful, too still. For a long moment you forget the black at your back and the ache in your legs, and only the water seems worth looking at.",
    "The water gives you back a better self — clear-eyed, calm, waiting for you with a patience you don't deserve. Stay, the stillness seems to say, in a voice that is almost your own.",
    "You look down and cannot easily look away. The face down there is yours and not yours, and it wants you to keep looking. You make yourself step back, and the wanting comes with you a little way.",
    "For a moment the pool is the whole world, and the lovely tired face in it is the only company worth keeping. You could stay here. The thought rises off the water, not out of you.",
  ]);
}

// The one thing a close look adds about a PERISHABLE: how far gone it is. The
// heart truly dies (heartProse); food only reads spoiled (foodProse, flavor —
// it still fills you). Cured/dried/salted food (FOOD_KEEPS) says nothing. Leads
// with a space so it appends cleanly, "" when there's nothing to add.
function agedProse(itemId: string, edible: boolean, at: number | undefined): string {
  if (itemId === DEEP_HEART) return " " + heartProse(at);
  if (edible && !FOOD_KEEPS.has(itemId)) return " " + foodProse(at);
  return "";
}

export async function cmdLook(z: ZoneDO, session: Session, arg: string): Promise<void> {
  // A deliberate look always gives the full scene — and marks the room known,
  // so from here you get the brief view unless you ask again.
  if (!arg) { session.visited.add(session.roomId); return z.send(session, z.describeRoom(session, true)); }
  const world = z.world!;

  if (arg === "self" || arg === "me" || arg === "myself") return z.send(session, selfExamine(z, session));

  // The lightless deep takes the WHOLE room from you — the glance already says
  // "you can see nothing, not what shares it with you." A named look has to obey
  // the same law, or you could read a beast's wounds and a blade's wear in pitch
  // black (rome, 2026-07-12). Your OWN pack still answers: you know your kit by
  // touch, so carried gear and the lockbox stay readable below.
  const blind = z.isDark(session.roomId) && !z.carriesLight(session);

  // Still water throws your face back — and once in a rare while, something that
  // isn't quite your face. Only where the water actually stands still (a fishing
  // pool), never the tide's moving flood, and never in the dark that gives you
  // nothing to look into. (rome's "your reflection lies".)
  if (!blind && FISHING_ROOMS.has(session.roomId)
      && /^(the )?(water|pool|reflection|surface)$/i.test(arg.trim())) {
    return z.send(session, reflection());
  }

  const spotted = blind ? null : z.findCreatureIn(session.roomId, arg);
  // An unseen lurker is not in the room yet — naming it must not find it.
  const creature = spotted && z.lurkerUnseen(spotted, session) ? null : spotted;
  if (creature) {
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    // The fog takes the close read the same way it takes it off a wanderer: you
    // can see WHAT it is, and nothing of how it fares or what it carries. (It
    // used to print the full description and exact condition, then finish with
    // "you cannot read it" — the sentence argued with itself.)
    if (events.foggy(z, session.roomId)) {
      return z.send(session, `${tmpl.description} It is a grey shape in the fog — you can read nothing off it: not its wounds, not what it carries.`);
    }
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
  // A drowned floor keeps its contents from a dry-eyed look (dive reads it by
  // touch) — and so does the dark.
  const groundItem = blind || events.tideFlooded(z, session.roomId)
    ? null
    : findItemIn(z, z.ground.get(session.roomId) ?? [], arg);
  if (groundItem) {
    const t = world.itemTemplates.get(groundItem)!;
    const cond = z.isGear(groundItem) ? z.groundCond.get(`${groundItem}@${session.roomId}`) ?? 100 : undefined;
    // A marked piece on the stones tells you whose it was — the "whose was
    // this, and what killed them" read (077). The murdered man's sword talks.
    const floorLore = z.groundLore.get(`${groundItem}@${session.roomId}`);
    const floorLedger = floorLore ? await lore.gearLedger(z, floorLore) : "";
    const floorHeart = groundItem === DEEP_HEART
      ? " " + heartProse(z.groundHeart.get(`${groundItem}@${session.roomId}`))
      : "";
    return z.send(session, t.description + z.itemStat(t) + wearClause(z, cond) + floorLedger + floorHeart);
  }
  const carried = z.findCarried(session, arg);
  if (carried) {
    const t = world.itemTemplates.get(carried.itemId)!;
    return z.send(
      session,
      t.description + z.itemStat(t) + wearClause(z, z.isGear(carried.itemId) ? carried.condition : undefined)
        + (carried.serial !== null ? ` The dungeon's seal is on it. (mint #${carried.serial})` : "")
        + (carried.loreId ? await lore.gearLedger(z, carried.loreId) : "")
        + agedProse(carried.itemId, !!t.edible, carried.acquiredAt),
    );
  }
  // In the pitch dark you cannot roll-call the room: naming a wanderer must not
  // confirm they're there (the glance already refuses to list them; listen is
  // the honest tool for a dark room). So the player lookup is skipped blind,
  // and a probe falls through to the same neutral "Pitch dark" as everything else.
  const other = blind ? null : findPlayerIn(z, session.roomId, arg);
  if (other) return z.send(session, describePlayer(z, session, other), "study");
  // Not in hand, not on the floor — maybe in the lockbox (rome, 2026-07-11:
  // look reaches into your own keeping too). Not mid-fight: nobody unlatches
  // a box with something trying to kill them.
  if (!z.inCombat(session)) {
    const boxed = await loadContainer(z.env.DB, session.pubkey, "lockbox");
    const inBox = boxed.find((c) => {
      const t = world.itemTemplates.get(c.itemId);
      return !!t && nameMatches(t.name, arg);
    });
    if (inBox) {
      const t = world.itemTemplates.get(inBox.itemId)!;
      return z.send(
        session,
        `You crouch and work the lockbox's latch. ${t.description}${z.itemStat(t)}${wearClause(z, z.isGear(inBox.itemId) ? inBox.condition : undefined)}`
          + (inBox.serial !== null ? ` The dungeon's seal is on it. (mint #${inBox.serial})` : "")
          + (inBox.loreId ? await lore.gearLedger(z, inBox.loreId) : "")
          + agedProse(inBox.itemId, !!t.edible, inBox.acquiredAt)
          + " Back it goes, and the latch clicks home.",
      );
    }
  }
  // In the dark, "nothing like that here" would be a lie dressed as an answer —
  // you didn't fail to find it, you failed to SEE. Say which.
  z.send(session, blind
    ? "Pitch dark. You can make out nothing of it — only what your hands already hold. (a light would show it)"
    : "You see nothing like that here.");
}

// Inspect one of your OWN things by name: the pack first, then the lockbox and
// vault (both within reach at a gate). Returns the full read — prose, what it
// does, how worn, its seal and its ledger — or null if you hold no such thing.
// Read-only: nothing is taken out. This is what makes 'look flanged mace' answer
// in the gatehouse, where every keeping is at your elbow (rome, 2026-07-15).
export async function lookKeepingItem(z: ZoneDO, session: Session, arg: string): Promise<string | null> {
  const world = z.world!;
  const carried = z.findCarried(session, arg);
  if (carried) {
    const t = world.itemTemplates.get(carried.itemId)!;
    return t.description + z.itemStat(t) + wearClause(z, z.isGear(carried.itemId) ? carried.condition : undefined)
      + (carried.serial !== null ? ` The dungeon's seal is on it. (mint #${carried.serial})` : "")
      + (carried.loreId ? await lore.gearLedger(z, carried.loreId) : "")
      + agedProse(carried.itemId, !!t.edible, carried.acquiredAt);
  }
  for (const key of ["lockbox", "vault"] as const) {
    const held = await loadContainer(z.env.DB, session.pubkey, key);
    const it = held.find((c) => { const t = world.itemTemplates.get(c.itemId); return !!t && nameMatches(t.name, arg); });
    if (!it) continue;
    const t = world.itemTemplates.get(it.itemId)!;
    const latch = key === "lockbox" ? "You work the lockbox's latch." : "You swing the vault's door open.";
    return `${latch} ${t.description}${z.itemStat(t)}${wearClause(z, z.isGear(it.itemId) ? it.condition : undefined)}`
      + (it.serial !== null ? ` The dungeon's seal is on it. (mint #${it.serial})` : "")
      + (it.loreId ? await lore.gearLedger(z, it.loreId) : "")
      + agedProse(it.itemId, !!t.edible, it.acquiredAt)
      + " Then back it goes.";
  }
  return null;
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
// The ledger itself, shared by the in-game 'sheet' readout and the published
// kind-1 brag so the two can never drift in format. `withAge` keeps the "N days
// under this name" clause: the readout wants it, the note drops it (rome,
// 2026-07-15 — the published brag is the exact in-game layout minus the age).
export function ledgerLines(session: Session, withAge: boolean): string[] {
  const days = Math.max(0, Math.floor((Date.now() / 1000 - session.born) / 86_400));
  const age = days === 0 ? "born this very day" : days === 1 ? "one day under this name" : `${days} days under this name`;
  return [
    `The dungeon keeps your ledger, ${session.name}${withAge ? ` — ${age}` : ""}.`,
    `  Kills: ${session.kills}${session.kills === 0 ? " — the dark is still ahead of you" : ""}`,
    `  Kings and horrors put down: ${session.bossKills}`,
    `  Wanderers' blood on your hands: ${session.pvpKills}`,
    `  Deaths: ${session.deaths}${session.deaths === 0 ? " — so far" : ""}`,
  ];
}

export function cmdSheet(z: ZoneDO, session: Session): void {
  const lines = ledgerLines(session, true);
  lines.push(`('publish sheet' speaks this ledger to the relays under the dungeon's hand; 'publish kind 1' posts it to your OWN feed, in your own name, for your followers to see. Until then it is yours alone.)`);
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
    // Once opened, open for everyone — but a heart buys a WINDOW, not a
    // thoroughfare: the iron remembers its shape (the zone tick re-seals it).
    // Only the way DOWN is barred; the-descent's way up is unkeyed, so the
    // door shutting never seals anyone below.
    z.openDoors.add(doorKey);
    z.doorCloseAt.set(doorKey, Date.now() + DEEP_DOOR_OPEN_MS);
    z.send(session, "You press the still-cold heart to the black door. For a moment nothing — then the door *takes* it, drinks the cold clean out of it, and grinds open. The iron will remember its shape before long — but it only ever bars the way down.", "unlock");
    z.roomFeed(session.roomId, `${session.name} presses something to the black door, and it grinds open.`, session.pubkey, false);
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
  // And awake, NO crossing of its room is free — see the toll below.
  const guard = [...z.creatures.values()].find(
    (c) => c.roomId === session.roomId && SENTINELS.has(c.templateId),
  );
  const guardWasAwake = !!guard && z.sentinelAwake(guard); // read BEFORE the tiptoe wakes it — the first slip past stays free
  if (guard && DEEP_ROOMS.has(exit.to_room)) {
    const gt = world.mobTemplates.get(guard.templateId)!;
    const heads = HOUND_HEADS.get(guard.templateId) ?? "all three heads";
    if (guardWasAwake) {
      return z.send(session, `${cap(gt.name)} is awake and bars the stair, ${heads} low and watching. There is no slipping past it now — put it down, or turn back.`, "dmgin");
    }
    guard.wakeUntil = Date.now() + HOUND_WAKE_MS; // step over it and it stirs
    z.send(session, `You pick your way over ${gt.name}, breath held. Behind you, ${heads} lift as one — the deep is open, and it is awake.`, "seize");
    z.roomFeed(session.roomId, `${cap(gt.name)} wakes with a low, tripled growl.`, session.pubkey, false); // local: mob reaction
    z.roomSound(session.roomId, "A low growl rolls up from {dir} — something big, and awake.");
  }

  // A TREASURY DOOR: the room beyond is some boss's hoard, and the way in stays
  // shut while its keeper lives in THIS room — the exit carries no key because
  // the keeper IS the lock. No sleeping tiptoe here (a king on his throne is not
  // a hound on a stair): the way down opens over his body, or not at all.
  const keeperId = TREASURY_DOORS.get(exit.to_room);
  if (keeperId) {
    const keeper = [...z.creatures.values()].find((c) => c.roomId === session.roomId && c.templateId === keeperId);
    if (keeper) {
      const kt = world.mobTemplates.get(keeper.templateId)!;
      return z.send(session, `${cap(kt.name)} stirs on the throne, and the dark between you and the way ${dir} is suddenly full of him. What he took to the grave, he keeps. The way opens over his body, or not at all.`, "dmgin");
    }
  }

  // The gate toll: an awake sentinel holds the door, and nothing walks its room
  // without feeling teeth on the way out — whichever way out. One mitigated
  // bite per crossing (jaws that bleed roll their bleed too). The sleeping
  // tiptoe above stays the one free pass, and it costs the waking; the generic
  // parting blow below excludes the sentinel so one crossing never pays the
  // same jaws twice.
  if (guard && guardWasAwake) {
    const gt = world.mobTemplates.get(guard.templateId)!;
    let bite = randInt(gt.dmg_min, gt.dmg_max);
    bite = Math.max(1, Math.round(bite * ARMOR_K / (z.equippedArmor(session) + ARMOR_K)));
    bite = Math.max(1, Math.round(bite * STANCE[session.stance].def));
    session.hp -= bite;
    z.send(session, `${cap(gt.name)} holds its post — and one head snaps out as you pass, jaws closing for ${bite}. [${Math.max(0, session.hp)}/${session.maxHp} hp]`, "dmgin");
    z.roomFeed(session.roomId, `${cap(gt.name)} snaps at ${session.name} as they pass.`, session.pubkey, false);
    if (session.hp <= 0) {
      await z.onPlayerDeath(session, gt);
      return;
    }
    z.openWound(session, gt);
  }

  const wasFighting = z.inCombat(session);
  // Heavy mail turns blows, but it drags at the escape: leaving a fight in
  // weighted armor risks one parting strike on the way out. The quick flee
  // clean. (Armor still soaks it — that's what it's for.) A pack full of
  // loose iron drags the same — stripping down buys nothing while you're
  // still hauling the armory. `drop` it, or pay the toll.
  const laden = z.wornWeight(session) > 0 || z.burdened(session);
  const dragLine = z.wornWeight(session) > 0 ? "The mail drags at you" : "The pack's iron drags at you";
  if (wasFighting && laden && chance(PARTING_BLOW_CHANCE)) {
    const striker = [...z.creatures.values()].find(
      (c) => c.roomId === session.roomId && (c.target === session.pubkey || c.id === session.target)
        && !(guardWasAwake && c.id === guard!.id), // the sentinel already took its toll above
    );
    if (striker) {
      const stmpl = world.mobTemplates.get(striker.templateId)!;
      let pdmg = randInt(stmpl.dmg_min, stmpl.dmg_max);
      pdmg = Math.max(1, Math.round(pdmg * ARMOR_K / (z.equippedArmor(session) + ARMOR_K))); // % mitigation, never immunity
      pdmg = Math.max(1, Math.round(pdmg * STANCE[session.stance].def));
      session.hp -= pdmg;
      z.send(session, `${dragLine} — ${stmpl.name} lands a parting blow for ${pdmg}. [${Math.max(0, session.hp)}/${session.maxHp} hp]`);
      if (session.hp <= 0) {
        await z.onPlayerDeath(session, stmpl);
        return;
      }
    }
  }
  // A wanderer breaking from another wanderer pays the same mail-tax: if your
  // load drags, the hunter gets one parting cut (the quick flee clean). Then
  // the exchange ends both ways — the chase is a walk, and re-engaging in the
  // next room is a fresh deliberate act, ambush rules and all.
  const hunter = [...z.sessions.values()].find(
    (s) => s.pvpTarget === session.pubkey && s.roomId === session.roomId && s.hp > 0,
  );
  if (hunter && laden && chance(PARTING_BLOW_CHANCE)) {
    const hw = z.equippedItem(hunter, "weapon");
    let pdmg = randInt(PLAYER_DMG_MIN, PLAYER_DMG_MAX) + (hw ? z.effDmg(hw) : 0);
    pdmg = Math.max(1, Math.round(pdmg * ARMOR_K / (z.equippedArmor(session) + ARMOR_K)));
    pdmg = Math.max(1, Math.round(pdmg * STANCE[session.stance].def));
    session.hp -= pdmg;
    z.send(session, `${dragLine} — ${hunter.name} lands a parting cut for ${pdmg}. [${Math.max(0, session.hp)}/${session.maxHp} hp]`, "dmgin");
    z.send(hunter, `You open ${session.name} as they break away — ${pdmg}.`, "dmgout");
    if (session.hp <= 0) {
      await pvp.pvpKill(z, hunter, session);
      return;
    }
  }
  session.pvpTarget = null;
  for (const s of z.sessions.values()) {
    if (s.pvpTarget === session.pubkey && s.roomId === session.roomId) {
      s.pvpTarget = null;
      z.send(s, `${session.name} breaks away.`);
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
  // An open wound walks with you: every room you cross while bleeding takes a
  // drip trail — huntable (a scavenger's nose drifts to it), and readable by
  // anyone who looks. Run wounded and the dungeon can follow you home.
  if ((session.bleedTicks ?? 0) > 0) {
    // Both stones bleed: the room you crossed leaving AND the one you enter, so
    // a pursuer standing where you were wounded reads the trail and follows.
    z.addTrace(from, { kind: "drip", at: Date.now(), label: session.name });
    z.addTrace(session.roomId, { kind: "drip", at: Date.now(), label: session.name });
  }
  // Past the black door, going DOWN: every engraved piece carried writes a
  // descent into its ledger. The walk into the deep is a deed the steel keeps.
  if (`${from}:${dir}` === DEEP_DOOR_KEY) {
    for (const c of session.items) {
      if (c.loreId) await deedsBump(z.env.DB, c.loreId, "descents");
    }
  }
  z.actorFeed(session, from, `${session.name} ${wasFighting ? "flees" : "leaves"} ${dir}.`, "who");
  z.actorFeed(session, session.roomId, `${session.name} arrives.`, "who", false); // local only — "leaves <dir>" already carries the move to the feed
  // Status first, so the client learns the room's name before the room text
  // prints — the name line paints gold even the very first time you see it.
  z.sendStatus(session);
  z.send(session, z.enterDescribe(session));
  // Carrying an open flame out under the downpour: the rain takes it.
  events.rainSoaksTorch(z, session);
  // Carrying one down into the deep's exhale: the cold current takes it.
  events.exhaleSnuffsTorch(z, session);
  // Wading into the tide with one: the water takes it.
  events.tideSoaksTorch(z, session);
  // And while the crows hold the sky, every open-ground move is called out.
  events.crowsMark(z, session);
  // A pack past its quiet load can't move silent: loose iron knocks and
  // shifts, and sometimes the next rooms hear it — and so does everything
  // with ears where you land. The fat run is the loud run; the gate is quiet.
  if (z.burdened(session) && chance(CLATTER_ODDS)) {
    z.roomSound(session.roomId, "The knock and shift of loose iron, {dir} — someone moving under a heavy load.");
    z.creatureNoise(session.roomId);
  }
  z.refreshRoomCtx(from);
  z.refreshRoomCtx(session.roomId);
  await ai.provokeGrudges(z, session, true); // you walked in — a grudge-holder gets the jump
  // …and a dormant listener might just catch the sound of your arrival.
  await ai.wakeListeners(z, session, session.roomId, WAKE_ENTER, "twists toward the sound of you and lunges!");
  await savePlayer(z.env.DB, session.pubkey, session.roomId, session.hp);
  await z.persist();
}

// A wanderer's own words, in the world. The room hears them over the sockets —
// but the WIRE copy is no longer the gate's to sign (rome, 2026-07-13). Until
// now `say` rode the 24913 room feed out to the public relays in plain text,
// gate-signed: the room a player thinks is private (two of you alone in the
// dark) was the one that broadcast. Now the dungeon publishes NOTHING of it
// (toRelay = false), and instead hands the line back to the speaker's own client,
// which signs it with the speaker's own key and puts it out obfuscated.
export function cmdSay(z: ZoneDO, session: Session, msg: string): void {
  if (!msg) return z.send(session, "Say what?");
  z.send(session, `You say: ${msg}`, "say");
  z.roomFeed(session.roomId, `${session.name} says: ${msg}`, session.pubkey, false, "say", { name: session.name, pk: session.pubkey });
  z.speechOut(session, `${session.name} says: ${msg}`, "nomad-say");
}

// Shout: your words thrown hard enough to cross walls. The trade IS the verb —
// every neighboring room hears the words (a warning, a bluff, bait), and the
// dinner bell rings where you stand: everything with ears comes to see who
// owns the voice. The one long-range signal the world carries, priced in
// exactly the coin the world prices everything: noise.
export function cmdShout(z: ZoneDO, session: Session, msg: string): void {
  if (!msg) return z.send(session, "Shout what?");
  z.send(session, `You fill your lungs and shout: ${msg}`, "say");
  // Loud in the WORLD, silent on the gate's key — same law as `say`. A shout
  // carries through stone (roomSound, sockets only, never published) and rings
  // the dinner bell; what it does NOT do is hand the dungeon a plaintext copy of
  // a person's words to sign and broadcast. The speaker's own key carries it out.
  z.roomFeed(session.roomId, `${session.name} shouts: ${msg}`, session.pubkey, false, "say", { name: session.name, pk: session.pubkey });
  z.roomSound(session.roomId, `A voice, raw and carrying, {dir}: ${msg}`, undefined, "say");
  z.speechOut(session, `${session.name} shouts: ${msg}`, "nomad-shout");
  z.creatureNoise(session.roomId); // a shout is a dinner bell with a name on it
}

export async function cmdGet(z: ZoneDO, session: Session, arg: string, fromDive = false): Promise<void> {
  if (!arg) return z.send(session, "Get what?");
  // A tide-drowned floor gives nothing to a standing reach — you go under
  // for it (cmdDive comes through here with the flag) or you wait it out.
  if (!fromDive && events.tideFlooded(z, session.roomId)) {
    return z.send(session, "The floor is under black water. Whatever lies there, you'd have to dive for it.");
  }
  // A journal on the floor is instanced — picking it up carries its pages
  // (and whoever's logs they were). Matched first, ahead of plain loot.
  const inst = takeGroundInstance(z, session.roomId, arg);
  if (inst) return getInstanced(z, session, inst);
  const here = z.ground.get(session.roomId) ?? [];
  const itemId = findItemIn(z, here, arg);
  // The torch burning on the FLOOR isn't a pack item — it's a set-down flame
  // (cmdDrop's counterpart, or a dead hand's). Taking it up puts what's LEFT of
  // its burn back in your hand and the room goes back to needing it. Matched
  // only when no unlit torch actually lies here (that one is ordinary loot).
  if (!itemId && z.roomLit(session.roomId) && /\b(torch|brand|light|flame|fire)\b/i.test(arg)) {
    if (z.carriesLight(session)) return z.send(session, "Your hand already holds a light — leave this one burning where it is.");
    const inHand = z.equippedItem(session, "weapon");
    if (inHand && TWO_HANDED.has(inHand.tmpl.id)) {
      return z.send(session, `Both your hands are full of ${inHand.tmpl.name} — no free hand for the flame. Lower it first.`);
    }
    session.litUntil = z.groundTorch.get(session.roomId)!;
    session.litSource = "torch";
    session.torchWarned = false;
    z.groundTorch.delete(session.roomId);
    z.send(session, "You take the burning torch up off the stone — its light is yours again.", "gain");
    z.roomFeed(session.roomId, `${session.name} takes up the burning torch.`, session.pubkey, false);
    z.sendStatus(session);
    z.refreshRoomCtx(session.roomId);
    await z.persist();
    return;
  }
  if (!itemId) return z.send(session, "That isn't lying around here.");
  const tmpl = z.world!.itemTemplates.get(itemId)!;
  if (z.foodCapped(session, itemId)) return z.send(session, z.foodFullNote());
  if (z.torchCapped(session, itemId)) return z.send(session, z.torchFullNote());
  if (z.dressingCapped(session, itemId)) return z.send(session, z.dressingFullNote());
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
  // An engraved piece keeps its mark through the pickup — the ledger changes
  // hands with the steel (a NEW owner only enters the chain when they SEAL it).
  const loreId = z.groundLore.get(condKey);
  z.groundLore.delete(condKey);
  // A heart off the floor is as old as the cut that made it — the stones give
  // back exactly what was set down, still rotting. Anything else is born now.
  const heartAt = itemId === DEEP_HEART ? z.groundHeart.get(condKey) : undefined;
  z.groundHeart.delete(condKey);
  const acquiredAt = heartAt ?? Math.floor(Date.now() / 1000);
  const carried: CarriedItem = { rowId, itemId, serial: null, equipped: false, condition, loreId, acquiredAt };
  const wasBurdened = z.burdened(session); // read before the pack takes it — the crossing gets a line
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
      // Living forage grows back fast; dead stock (cured provisions nobody is
      // curing) trickles in on the slow clock — except carrion in carrion
      // country, which the dying keep stocked. GEAR is dice (the floor-renewal
      // law): its entry schedules a CHECK on the slow gear cadence, and
      // applyRegrow rolls whether the world actually coughs one back — only
      // the starter rock keeps the reliable clock. (The hammerstone never
      // comes through here: the world rolls for it itself — zone tick.)
      const cured = DEAD_STOCK.has(itemId) && !CARRION_ROOMS.has(session.roomId);
      const dice = tmpl.slot !== "" && !RELIABLE_GEAR.has(itemId);
      z.regrow.push({
        itemId,
        roomId: session.roomId,
        at: Date.now() + (dice
          ? randInt(GEAR_ROLL_MIN_MS, GEAR_ROLL_MAX_MS)
          : cured
            ? randInt(STOCK_REGROW_MIN_MS, STOCK_REGROW_MAX_MS)
            : randInt(REGROW_MIN_MS, REGROW_MAX_MS)),
      });
    }
  }
  await insertLoot(z.env.DB, rowId, session.pubkey, itemId, null, condition, acquiredAt);
  if (loreId) await setItemLoreId(z.env.DB, rowId, loreId);
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
  // The burden line, announced the moment you cross it: the world telegraphs.
  const nowLoud = !wasBurdened && z.burdened(session)
    ? " The pack takes it with a clank — too much loose iron now to slip a blow, and it won't ride quiet."
    : "";
  z.send(session, `You take ${tmpl.name}.` + readied + stooped + nowLoud);
  z.roomFeed(session.roomId, `${session.name} takes ${tmpl.name}.`, session.pubkey, false); // loot stays LOCAL: a broadcast pickup is a ganker's shopping list (rome, 2026-07-15)
  z.refreshRoomCtx(session.roomId);
  await z.persist();
  await z.ensureAlarm();
}

export async function cmdDrop(z: ZoneDO, session: Session, arg: string): Promise<void> {
  if (!arg) return z.send(session, "Drop what?");
  // A LIT torch is no longer a pack item — it was spent into the flame when you
  // kindled it, and now it's the light you carry. "drop torch" sets that flame
  // on the stone, where it keeps burning and lights the room for EVERYONE in it
  // until it guts out. (A lantern isn't shared this way; its light just goes out
  // when it leaves your hand — drop the lantern ITEM as normal.)
  if (light.carriesLight(session) && session.litSource === "torch" && /\b(torch|brand|light|flame|fire)\b/i.test(arg)) {
    z.groundTorch.set(session.roomId, Math.max(z.groundTorch.get(session.roomId) ?? 0, session.litUntil!));
    session.litUntil = undefined; session.litSource = undefined; session.torchWarned = false;
    z.send(session, "You set the burning torch down on the stone; it keeps guttering there, throwing its light across the room.", "gain");
    z.roomFeed(session.roomId, `${session.name} sets a burning torch down on the floor.`, session.pubkey, false);
    z.sendStatus(session);
    z.send(session, z.describeRoom(session, false));
    await z.persist();
    return;
  }
  const carried = z.findCarried(session, arg);
  if (!carried) return z.send(session, "You carry nothing like that.");
  // ONE at a time. findCarried returns a single row, but say so plainly: with
  // two of a kind in the pack, 'drop studded maul' sheds ONE and leaves the
  // other. (The inventory's per-row drop button is the unambiguous way.)
  const msg = await dropCarried(z, session, carried);
  const left = session.items.filter((c) => c.itemId === carried.itemId && !c.equipped).length;
  const tn = z.world!.itemTemplates.get(carried.itemId)!.name;
  const tail = left > 0 ? ` (You still carry ${left === 1 ? "one more" : left + " more"} ${tn.replace(/^(a|an|the)\s+/i, "")}.)` : "";
  z.send(session, msg + tail);
  await z.persist();
  await z.ensureAlarm();
}

// Set one carried item on the floor. The shared core behind both 'drop <name>'
// and the inventory's per-row drop button — the button targets an exact rowId,
// so it is never ambiguous the way a name can be when you hold two of a kind.
// Returns the player-facing line; the caller places it (the log, or the modal
// note), and owns the persist/alarm flush.
export async function dropCarried(z: ZoneDO, session: Session, carried: CarriedItem): Promise<string> {
  const itemId = carried.itemId;
  const tmpl = z.world!.itemTemplates.get(itemId)!;

  const wasBurdened = z.burdened(session); // the shed gets its answer line below
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
    z.stampFresh(session.roomId, itemId);
    if (z.isGear(itemId)) z.groundCond.set(`${itemId}@${session.roomId}`, carried.condition); // gear (and the stone) keeps its wear on the floor
    if (carried.loreId) z.groundLore.set(`${itemId}@${session.roomId}`, carried.loreId); // the engraving stays in the steel, wherever it lies
    // A heart keeps its hour on the stones. Setting it down does not make it
    // fresh again — the rot follows it to the floor and back into any hand.
    if (itemId === DEEP_HEART && carried.acquiredAt !== undefined) {
      z.groundHeart.set(`${itemId}@${session.roomId}`, carried.acquiredAt);
    }
    if (tmpl.edible && !FOOD_KEEPS.has(itemId)) z.rot.push({ itemId, roomId: session.roomId, at: Date.now() + ROT_MS }); // cured/dried/salted food keeps forever — on the floor as in the hand (rome, 2026-07-17)
    z.armStrayDecay(session.roomId); // a growing consumable set down off its spawn floor spoils fast — rock crumbles, torch soddens, physic wilts
  }
  // Shedding under the burden line is the valve working: say so, so the
  // mid-chase drop reads as the escape it is.
  const quietAgain = wasBurdened && !z.burdened(session) ? " The pack rides light and quiet again." : "";
  z.roomFeed(session.roomId, `${session.name} drops ${tmpl.name}.`, session.pubkey, false); // loot stays LOCAL (see takes)
  z.refreshRoomCtx(session.roomId);
  // persist/alarm are the caller's — cmdDrop flushes after its "one more" line,
  // the bench-drop flushes after re-sending the modal.
  return (carried.serial !== null
    ? `You set ${tmpl.name} down. The seal cracks as it leaves your hands — the claim is no longer yours.`
    : `You drop ${tmpl.name}.`) + quietAgain;
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
    // The shield's already on your arm, but a burning light keeps your guard
    // DOWN (equippedBlock zeroes the block while carriesLight). So 'equip shield'
    // with a torch lit isn't a no-op — it's the way BACK: lower the flame and
    // raise the shield, trading the light for the guard.
    if (tmpl.slot === "shield" && z.carriesLight(session)) {
      const wasLantern = session.litSource === "lantern";
      session.litUntil = undefined;
      session.litSource = undefined;
      session.torchWarned = false;
      z.sendStatus(session);
      const dark = z.isDark(session.roomId) && !z.outOfWorld(session) ? ", and the dark closes back in" : "";
      z.send(session, `You ${wasLantern ? "shutter the lantern" : "lower the torch"} and swing ${tmpl.name} off your back — your guard returns${dark}.`);
      z.send(session, z.describeRoom(session, false)); // the dark may close over the room again
      return;
    }
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
  // Raising a wall-class shield tells you its price up front: you'll fight
  // around the thing you carry (SHIELD_WALL_DRAG on every blow you deal).
  const wallNote = tmpl.slot === "shield" && SHIELD_WALL.has(tmpl.id)
    ? " It is a wall, and you will fight around it — your blows lose a little of their weight while it's up."
    : "";
  z.send(session, (tmpl.slot === "weapon"
    ? `You take ${tmpl.name} in hand${current ? `, setting aside ${current.tmpl.name}` : ""}.`
    : `You pull on ${tmpl.name}${current ? `, shrugging off ${current.tmpl.name}` : ""}.`)
    + wallNote
    + (fighting ? " Your eyes leave the fight for a heartbeat — an opening." : ""));
  z.sendCtx(session); // your loadout changed — refresh the chips (the equip chip was going stale)
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
  z.sendCtx(session); // loadout changed — refresh the chips
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
  // The heart is the one carried thing that DIES. It says so on the shelf, so a
  // spent one never masquerades as a key. Perishable food ages too — but only
  // flags itself once it's past fresh (foodWord returns "" while fresh), so the
  // list isn't cluttered with "— fresh" on every ration.
  if (c.itemId === DEEP_HEART) tags.push(heartWord(c.acquiredAt));
  else if (t?.edible && !FOOD_KEEPS.has(c.itemId)) { const w = foodWord(c.acquiredAt); if (w) tags.push(w); }
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
  // The standing read on the burden law — the pack tells you when it's loud.
  const loud = z.burdened(session)
    ? ["The loose iron rides heavy and loud — you won't slip a blow under this load, and moving carries."]
    : [];
  if (z.inCombat(session)) {
    return z.send(session, [...keepingLines(z, session.items, `You carry (${z.slotsUsed(session.items)}/${PACK_CAP}):`), ...loud].join("\n"));
  }
  const atGate = world.entryRooms.has(session.roomId);
  const lockbox = await loadContainer(z.env.DB, session.pubkey, "lockbox");
  const out: string[] = [];
  out.push(...keepingLines(z, session.items, `You carry (${z.slotsUsed(session.items)}/${PACK_CAP}):`));
  out.push(...loud);
  out.push(...keepingLines(z, lockbox, `Lockbox (${z.slotsUsed(lockbox, "lockbox")}/${LOCKBOX_CAP}):`));
  if (atGate) {
    const vault = await loadContainer(z.env.DB, session.pubkey, "vault");
    out.push(...keepingLines(z, vault, `The deep keep (${z.slotsUsed(vault, "vault")}/${VAULT_CAP} sealed):`)); // fungibles ride free in the vault
    // The front door rule: the keeping is laid out INSIDE the gatehouse — from
    // the gate room this walks you through the door first (announced, HUD
    // flipped), never a private step-out at the arch (rome, 2026-07-17).
    const walkedIn = !z.outOfWorld(session);
    throughTheDoor(z, session);
    z.enterStep(session, "sorting"); // lateral to the bench
    if (walkedIn) out.unshift("You push in out of the cold and lay your kit out on the bench.");
    out.push("('stash'/'unstash'/'vault' to move things; 'out' steps you back into the world.)");
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
  z.roomFeed(session.roomId, `${old} is now known as ${name}.`, session.pubkey, false);
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
  if (session.resting) return z.send(session, "You are already resting.");
  if (events.tideFlooded(z, session.roomId)) {
    return z.send(session, "Rest, here? The water is at your waist and still moving. Climb first.");
  }
  session.resting = true;
  z.addTrace(session.roomId, { kind: "rest", at: Date.now() });
  // Whole men sit down too (rome, 2026-07-13): rest is a posture, not a
  // medicine. Unhurt it heals nothing, but it still unbinds a limp, still
  // leaves a camp trace, still makes you warm furniture for a rat — and it
  // still drops you the instant you move. The chip just stops nagging.
  const hurt = session.hp < session.maxHp;
  z.send(session, hurt ? pick([
    "You settle against the cold stone. Wounds close slowly here — any effort ends it.",
    "You lower yourself down and let your breathing slow. The ache eases, little by little — any effort ends it.",
    "You find a wall to put your back to and go still. Blood stops where it was running — any effort ends it.",
    "You sink down where you stand and let the dark hold you a while. The hurt recedes — any effort ends it.",
    "You crouch in the lee of a fallen block, knees to your chest, and let the shaking pass. It mends, barely — any effort ends it.",
    "You sit with your weapon across your knees and your eyes half-open. The body patches what it can — any effort ends it.",
    "You press your back into a corner where nothing can come at it, and breathe until the edges dull — any effort ends it.",
  ]) : pick([
    "You settle against the cold stone with nothing left to mend, and simply sit — any effort ends it.",
    "You put your back to a wall and go still. Nothing hurts. You listen instead — any effort ends it.",
    "You sink down where you stand, whole, and let the dark keep you company a while — any effort ends it.",
    "You lower yourself down and let your breathing slow. There is nothing to close; you rest anyway — any effort ends it.",
    "You sit on a fallen block and count the drips somewhere off in the dark. Whole, and in no hurry — any effort ends it.",
    "You hunker down, unhurt, and give your legs the rest your nerves won't take — any effort ends it.",
  ]));
  z.roomFeed(session.roomId, `${session.name} settles down to rest.`, session.pubkey, false); // resting: local only, nobody spectates a nap
}

// Fishing: only off the Pocket of Air's dry shelf, a line dropped into the
// black flood below. Rarely anything takes it — but a fish is good, fresh
// food, and the eel is a real meal. A short patience between casts.
// A catch (or a snag) spends from the water's budget; the last one starts the
// pool's rest clock — it forgets you slowly.
function spendPool(z: ZoneDO, roomId: string, pool: { left: number; at: number }): void {
  pool.left -= 1;
  if (pool.left <= 0) pool.at = Date.now() + FISH_POOL_REST_MS;
  z.fishStock.set(roomId, pool);
}

// Drop a line where the water pools. Depth decides the table: surface water
// (the fen, the orchard) is mostly cave-fish and wakes under RAIN; the deep
// flood gives up eels and, rarely, the marrow-lamprey. A miss can still snag
// scrap off the bottom — the flood keeps a little iron for the patient.
export async function cmdFish(z: ZoneDO, session: Session): Promise<void> {
  const world = z.world!;
  if (z.inCombat(session)) return z.send(session, "Not with something trying to kill you.");
  if (!FISHING_ROOMS.has(session.roomId)) {
    return z.send(session, "There's no water here to fish. You'd need to drop a line where the flood pools deep — or where the fen lies still.");
  }
  const now = Date.now();
  if (session.lastFishAt && now - session.lastFishAt < FISH_COOLDOWN_MS) {
    return z.send(session, "You've only just cast. Let the line settle.");
  }
  session.lastFishAt = now;
  // Pools fish out: each water holds a few catches, then goes quiet while it
  // forgets you. (This is what keeps the fen from being a money pump.)
  let pool = z.fishStock.get(session.roomId);
  if (!pool || (pool.left <= 0 && now >= pool.at)) {
    pool = { left: FISH_POOL_CATCHES, at: 0 };
    z.fishStock.set(session.roomId, pool);
  }
  if (pool.left <= 0) {
    return z.send(session, pick([
      "Nothing is biting here anymore. The water needs to forget you.",
      "You've pulled what this water will give for now.",
    ]));
  }
  const surface = FISHING_SURFACE.has(session.roomId);
  const biting = surface && events.raining(z, session.roomId);
  if (!chance(Math.min(0.9, FISH_ODDS * (biting ? RAIN_BITE_MULT : 1)))) {
    // The bottom keeps old iron; sometimes the hook finds that instead.
    if (chance(JUNK_SNAG_ODDS) && (await z.grantItem(session, "scrap-iron"))) {
      spendPool(z, session.roomId, pool);
      z.send(session, pick([
        "The line snags dead weight — you haul up a fist of scrap iron, dripping.",
        "Something heavy and lifeless: old iron off the bottom, good for the forge.",
      ]), "gain");
      z.sendCtx(session);
      await z.persist();
      return;
    }
    return z.send(session, pick(biting ? [
      "The rain pocks the water and something rolls near the line — not this cast.",
      "A hard tug in the downpour — then gone. They're moving down there.",
    ] : surface ? [
      "The fen lies flat under its own scum. Nothing takes the line.",
      "A ripple crosses the still water, going somewhere else.",
      "You wait. The fen keeps its own counsel.",
    ] : [
      "You lower a line into the black water and wait. Nothing takes it.",
      "The water lies flat and still. Whatever's down there isn't hungry.",
      "A tug — then slack. Gone before you could haul it up.",
      "You wait, and wait, and the flood keeps its own.",
      "Something brushes the line and thinks better of it.",
    ]));
  }
  // Depth writes the table: the lamprey never rises to surface water.
  const fishId = surface
    ? (chance(EEL_SURFACE_ODDS) ? "pale-eel" : "cave-fish")
    : chance(LAMPREY_ODDS) ? "marrow-lamprey"
    : chance(PALE_EEL_ODDS) ? "pale-eel" : "cave-fish";
  const fish = world.itemTemplates.get(fishId);
  if (!fish) return z.send(session, "Something takes the line — but it slips free before you can land it.");
  if (!(await z.grantItem(session, fish.id))) {
    return z.send(session, z.foodCapped(session, fish.id)
      ? `Something takes the line — but you're carrying all the food you can, and you let ${fish.name} slip back under.`
      : `Something takes the line — but your pack is full, and you have to let ${fish.name} go.`);
  }
  spendPool(z, session.roomId, pool);
  z.send(session, (fishId === "marrow-lamprey"
    ? `The line dives and holds — you fight it up hand over hand: ${fish.name}, coiling like a question.`
    : fishId === "pale-eel"
    ? `The line goes taut and FIGHTS you — you haul up ${fish.name}, thrashing.`
    : `The line goes taut — you haul up ${fish.name}.`)
    + ` [${fish.rarity}] (unclaimed — good, fresh food)`, "gain");
  z.roomFeed(session.roomId, `${session.name} lands a catch from the ${surface ? "still water" : "flood"}.`, session.pubkey, false);
  z.sendCtx(session);
  await z.persist();
}

// ---- listen: an ear pressed to the dark ----
// roomSound PUSHES what happens next door; listen is the pull — take the
// neighboring rooms by their standing sounds. One line per open way, loudest
// thing first: a fight, then whatever stands there (STILL_SOUNDS voice or its
// family's register), then a person keeping still, then the water itself.
// Closed iron blocks it, same rule as roomSound. Hidden lurkers make no sound
// — silence is what an ambush sounds like, and the fen's lights lie through
// this channel too. Listening is the one scouting act that costs nothing:
// no noise, no trace, nothing knows you did it.
const LISTEN_DIRS: Record<string, string> = {
  n: "north", north: "north", s: "south", south: "south", e: "east", east: "east",
  w: "west", west: "west", u: "up", up: "up", d: "down", down: "down",
};

function heardIn(z: ZoneDO, roomId: string): string {
  const world = z.world!;
  // A fight drowns everything else in the room.
  const fighting =
    [...z.creatures.values()].some((c) => c.roomId === roomId && c.target) ||
    [...z.sessions.values()].some((s) => s.roomId === roomId && !z.outOfWorld(s) && z.inCombat(s));
  if (fighting) return "the sounds of a fight — blows landing, and breathing that breaks";
  // The loudest standing thing: a bespoke voice if it has one, else its
  // family's register. More than one audible and the ear can tell.
  const audible = [...z.creatures.values()].filter(
    (c) => c.roomId === roomId && !(LURKERS.has(c.templateId) && c.hidden),
  );
  const parts: string[] = [];
  if (audible.length > 0) {
    const c = audible.find((a) => STILL_SOUNDS[a.templateId]) ?? audible[0];
    // A sleeper reads as sleep to a pressed ear — the window is audible too.
    const voice = c.asleep ? "slow, even animal breathing — something fast asleep"
      : STILL_SOUNDS[c.templateId]
      ?? (DROWNERS.has(c.templateId) ? "water moving, slow, around something standing in it"
        : HOLLOW.has(c.templateId) ? "the dry click and resettle of old bone"
        : THIEVES.has(c.templateId) ? "a boot placed carefully, then stillness"
        : "slow animal breathing, and claws shifting on stone");
    parts.push(voice + (audible.length > 1 ? " — and it is not alone" : ""));
  }
  // People never hide under the beasts: stillness leaks sound (shifting,
  // breath, gear creak), so a gate-camper is always there for a pressed ear
  // to find. rome's anti-camping law, made a read.
  const folk = [...z.sessions.values()].filter((s) => s.roomId === roomId && !z.outOfWorld(s));
  if (folk.length > 0) {
    // A full pack betrays its owner even standing still — loose iron can't
    // hold its breath. The other half of the burden law: the fat run is loud.
    const heavy = folk.some((s) => z.burdened(s));
    parts.push(folk.length > 1
      ? "more than one set of human lungs, all keeping still" + (heavy ? " — and the soft clink of loose iron among them" : "")
      : folk[0].resting
        ? "slow, even breathing — sleep, or something near it"
        : heavy
          ? "metal shifting under cloth — someone keeping still under a heavy load"
          : "the small sounds of someone keeping still: cloth, a held breath");
  }
  if (parts.length > 0) return parts.join("; and ");
  if (events.tideFlooded(z, roomId)) return "deep water, moving slow and heavy";
  // Marsh-light weather keeps its lie even under a pressed ear.
  if (LIGHTS_ROOMS.has(roomId) && events.phaseOf(z, "lights") === "active") {
    return "careful footsteps, keeping to the water's edge";
  }
  return "nothing — stone, and a far-off drip";
}

export function cmdListen(z: ZoneDO, session: Session, arg: string): void {
  const world = z.world!;
  // Rain flattens everything. Hunting weather works both ways.
  if (events.raining(z, session.roomId)) {
    return z.send(session, "You cup an ear, but the rain hammers everything flat. You'd hear nothing softer than a scream.");
  }
  const want = arg ? LISTEN_DIRS[arg] : undefined;
  if (arg && !want) return z.send(session, "Listen which way? North, south, east, west, up, or down — or just listen.");
  const exits = [...(world.exits.get(session.roomId) ?? [])].sort(
    (a, b) => (DIR_ORDER[a.dir] ?? 9) - (DIR_ORDER[b.dir] ?? 9),
  );
  const picked = want ? exits.filter((e) => e.dir === want) : exits;
  if (picked.length === 0) {
    return z.send(session, want
      ? "No way opens that way — just your ear against cold stone."
      : "Stone all around. Nothing comes through.");
  }
  const lines = ["You go still and give the dark your ear."];
  for (const e of picked) {
    const sealed = e.key_item && !z.openDoors.has(`${session.roomId}:${e.dir}`);
    lines.push(`${cap(dirPhrase(e.dir))}: ${sealed ? "cold iron, and nothing through it" : heardIn(z, e.to_room)}.`);
  }
  z.send(session, lines.join("\n"), "study");
}

// ---- dive: the tide's other half ----
// The flood hides the floor (describeRoom holds its tongue, cmdGet refuses);
// dive is how you get it back. Bare 'dive' gropes the drowned floor and names
// what the hands find — touch, not sight, so the dark asks for no light.
// 'dive <thing>' brings one up through the same pack/wear rules as any get.
// The price is the splash: it rings the same dinner bell as any noise, in
// the drowners' own hour.
export async function cmdDive(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const world = z.world!;
  if (!events.tideFlooded(z, session.roomId)) {
    return z.send(session, "There's no drowned floor here to go under. The tide decides that.");
  }
  // Their element, their hour: going under with a drowned thing standing in
  // the same water is not a dive, it's a surrender.
  const drowner = [...z.creatures.values()].find(
    (c) => c.roomId === session.roomId && DROWNERS.has(c.templateId) && !c.hidden,
  );
  if (drowner) {
    const mt = world.mobTemplates.get(drowner.templateId)!;
    return z.send(session, `Not with ${mt.name} standing in this water. It is better under there than you will ever be.`);
  }
  // 'dive north' and kin: the water is down, not that way.
  if (arg && LISTEN_DIRS[arg]) arg = "";
  // The splash carries; everything with ears knows where you went under.
  z.roomFeed(session.roomId, `${session.name} fills their lungs and goes under the black water.`, session.pubkey, false);
  z.roomSound(session.roomId, "A splash {dir}, then the slow churn of something working underwater.");
  z.creatureNoise(session.roomId);
  if (!arg) {
    const found: string[] = [];
    for (const itemId of z.ground.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(itemId);
      if (t) found.push(t.name);
    }
    for (const inst of z.groundInstances.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(inst.itemId);
      if (t) found.push(t.name);
    }
    for (const cache of world.caches) {
      if (z.cacheRoomId(cache) === session.roomId && z.cacheLocked(cache)) {
        found.push(`the iron corner of ${cache.name}`);
      }
    }
    if (found.length === 0) {
      return z.send(session, "You go under into cold and black. Your hands sweep the drowned floor: silt, stone, nothing else. You come up gasping.");
    }
    return z.send(session, `You go under into cold and black, and your hands read the floor: ${found.join(", ")}. You come up gasping. (dive <thing> to bring one up)`);
  }
  // Named a thing: check by touch before committing the story to it.
  const onFloor = !!findItemIn(z, z.ground.get(session.roomId) ?? [], arg)
    || (z.groundInstances.get(session.roomId) ?? []).some((i) => {
      const t = world.itemTemplates.get(i.itemId);
      return !!t && nameMatches(t.name, arg);
    });
  if (!onFloor) {
    return z.send(session, "You go under and sweep the drowned floor — your hands close on nothing like that. You come up gasping.");
  }
  z.send(session, "You go under after it, hands out in the black.");
  return cmdGet(z, session, arg, true);
}

// ---- wash: scrub a killing off your hands ----
// The blood-on-the-killer mark fades on its own, but water hurries it. Any
// standing water (the fishing waters, a tide-drowned floor) or the open rain
// will do — a deliberate scrub takes all of it. It is not a private act: a
// witness sees you kneeling at the water working at your hands, and knows
// exactly what that means. (rome, 2026-07-12.)
export function cmdWash(z: ZoneDO, session: Session): void {
  const inRain = events.raining(z, session.roomId);
  const atWater = FISHING_ROOMS.has(session.roomId) || events.tideFlooded(z, session.roomId);
  if (!inRain && !atWater) {
    return z.send(session, "There's no water here to wash in — no pool, no rain, nothing to run your hands under.");
  }
  const where = atWater ? "You kneel at the water" : "You hold your hands up to the rain";
  if (!pvp.isBloodied(z, session.pubkey)) {
    return z.send(session, `${where} and rinse your hands. They were already your own — nothing to answer for.`);
  }
  pvp.washBlood(z, session.pubkey);
  z.send(session, `${where} and scrub until the last of the man-blood lifts and clouds away. Your hands are clean, and yours again.`, "study");
  z.roomFeed(session.roomId, atWater
    ? `${session.name} kneels at the water, scrubbing hard at their hands.`
    : `${session.name} stands with their hands up to the rain, scrubbing at them.`, session.pubkey, false); // LOCAL: washing man-blood is a killer covering tracks — never a broadcast tell
}

export function cmdCarve(z: ZoneDO, session: Session, arg: string): void {
  const words = arg.replace(/[\r\n\t]+/g, " ").replace(/"/g, "'").trim();
  if (!words) return z.send(session, "Carve what? (carve <words>)");
  if (words.length > CARVE_MAX_LEN) {
    return z.send(session, `The stone only takes ${CARVE_MAX_LEN} characters. Chisel it down.`);
  }
  z.addTrace(session.roomId, { kind: "carve", at: Date.now(), label: session.name, words });
  z.send(session, `You scratch it into the stone: "${words}"`, "study");
  z.roomFeed(session.roomId, `${session.name} scratches something into the wall.`, session.pubkey, false);
  z.roomSound(session.roomId, "A faint scratching, {dir}.");
  z.creatureNoise(session.roomId);
}

// Take one thing out of the pack and eat it: off the inventory, out of the
// DB, its seal (if any) voided, and the heal applied. Shared by the `eat`
// command and the auto-eat reflex, so both do it exactly the same way.
export async function consumeFood(z: ZoneDO,
  session: Session,
  carried: CarriedItem,
): Promise<{ before: number; tmpl: ItemTemplate; spoiled: boolean }> {
  const tmpl = z.world!.itemTemplates.get(carried.itemId)!;
  session.items.splice(session.items.indexOf(carried), 1);
  await removeItemRow(z.env.DB, carried.rowId);
  if (carried.serial !== null) await voidMint(z.env.DB, carried.serial);
  const before = session.hp;
  // Spoiled food is HONEST now: a turned ration gives back less (never nothing —
  // min 1, so it's still desperation food). Cured/keeping food never spoils, so
  // it's exempt (same FOOD_KEEPS gate as the freshness prose).
  const spoiled = !FOOD_KEEPS.has(carried.itemId) && foodState(carried.acquiredAt) === "spoiled";
  const heal = spoiled ? Math.max(1, Math.round(tmpl.heal * FOOD_SPOIL_HEAL_MULT)) : tmpl.heal;
  session.hp = Math.min(session.maxHp, session.hp + heal);
  return { before, tmpl, spoiled };
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
  const { before, tmpl, spoiled } = await consumeFood(z, session, carried);
  // Bolting food mid-fight is allowed — desperation is — but you drop your
  // guard to do it, and the next hit that lands makes you pay for the bite.
  const gulped = z.inCombat(session);
  if (gulped) session.staggered = true;
  z.send(
    session,
    (session.hp > before
      ? (spoiled
          // The label is honest now: spoiled food heals HALF, and the prose says so.
          ? `You force down ${tmpl.name}, turned and rank. ${pick([
              "It barely helps — half of it is rot.",
              "Your stomach turns, but a little strength comes back.",
              "Foul going down, and it gives back little for it.",
            ])} [${session.hp}/${session.maxHp} hp]`
          : `You eat ${tmpl.name}. ${pick([
              "Warmth comes back to you.",
              "It sits like a coal in your belly, and some of the grey lifts.",
              "It is barely food, but your hands steady.",
              "Strength trickles back into your limbs.",
              "The gnawing eases, and you feel a little less like dying.",
            ])} [${session.hp}/${session.maxHp} hp]`)
      : `You eat ${tmpl.name}.`)
    + (gulped ? " You bolt it down with one eye on your foe — an opening." : ""),
    "gain",
  );
  z.roomFeed(session.roomId, `${session.name} eats ${tmpl.name}.`, session.pubkey, false);
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
  z.roomFeed(session.roomId, `${session.name} takes ${tmpl.name}.`, session.pubkey, false); // loot stays LOCAL: a broadcast pickup is a ganker's shopping list (rome, 2026-07-15)
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

// Someone stepped out of the world (the gate's bench, the keeper's hatch) is
// not in the room to be found: the room glance already omits them and attack
// already refuses them, so look must not describe them either (rome, 2026-07-12).
export function findPlayerIn(z: ZoneDO, roomId: string, arg: string): Session | null {
  for (const s of z.sessions.values()) {
    if (s.roomId === roomId && !z.outOfWorld(s) && s.name.toLowerCase().startsWith(arg)) return s;
  }
  return null;
}

// ---- messages out ----
