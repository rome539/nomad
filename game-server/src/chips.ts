// The command chips: everything you could do right here, as ready-to-send
// commands (a UI helper like status, not protocol — the client renders them
// tappable). Out of the spine; zone.ts keeps one-line delegates so the many
// call sites (every command, every tick, gate.ts, ai.ts) stay unchanged.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import * as events from "./events";
import * as pvp from "./pvp";
import { chipName, nameMatches, shortName } from "./zone-util";
import {
  LURKERS, DIR_ORDER, DARK_ROOMS, TORCH_ITEM, LANTERN_ITEM,
  FISHING_ROOMS, TRADE_CHIP, FORGE_CHIP, BENCH_CHIP, MAP_ITEMS, DROWNERS,
} from "./zone-data";

// When steel is out, the chips narrow to the fight — in EVERY room. No
// resting, banking, chatting, or reading the walls while something swings
// at you; only what the fight allows (see "Combat narrows the world").
export function sendCtx(z: ZoneDO, session: Session): void {
  const world = z.world;
  if (!world) return;
  const fighting = z.inCombat(session);
  session.ctxCombat = fighting;
  const suggest: string[] = [];

  // The living get initiative: attack chips first, for every foe in the room.
  // A lurker lying in wait is unseen — no chip gives it away, same as the room
  // description holds its tongue.
  let creatureHere = false;
  // Duplicates get numbered ("attack rat 2") with the SAME matcher and order
  // findCreatureIn uses, so the chip and the blade always agree — an albino
  // rat counts as a "rat" too, and the plain-rat chips number around it.
  const chipNamesSeen: string[] = [];
  for (const creature of z.creatures.values()) {
    if (creature.roomId !== session.roomId) continue;
    // Torchlight reveals a waiting lurker — so it also gets its attack chip.
    if (LURKERS.has(creature.templateId) && creature.hidden && !creature.target && !z.carriesLight(session)) continue;
    creatureHere = true;
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    const label = chipName(tmpl.name);
    chipNamesSeen.push(tmpl.name);
    const n = chipNamesSeen.filter((nm) => nameMatches(nm, label)).length;
    suggest.push(`attack ${label}${n > 1 ? ` ${n}` : ""}`);
  }
  // A throwable in hand and something to throw it at: offer the opener.
  if (creatureHere) {
    const throwable = session.items.find(
      (c) => c.serial === null && (world.itemTemplates.get(c.itemId)?.dmg ?? 0) > 0,
    );
    const firstMob = [...z.creatures.values()].find((c) => c.roomId === session.roomId);
    if (throwable && firstMob) {
      const mobT = world.mobTemplates.get(firstMob.templateId)!;
      suggest.push(`throw ${shortName(world.itemTemplates.get(throwable.itemId)!.name)} at ${chipName(mobT.name)}`);
    }
  }
  // With a fight in the room (or already in one), offer the other stances.
  if (creatureHere || fighting) {
    for (const s of ["reckless", "steady", "guarded"] as const) {
      if (s !== session.stance) suggest.push(`stance ${s}`);
    }
  }
  // Exits: fleeing is a fight decision, so they stay live in combat too.
  // Canonical compass order (n·s·e·w·u·d), so directions never shuffle
  // between rooms — the client pins them to fixed slots on top of this.
  const exitsHere = [...(world.exits.get(session.roomId) ?? [])].sort(
    (a, b) => (DIR_ORDER[a.dir] ?? 9) - (DIR_ORDER[b.dir] ?? 9),
  );
  for (const e of exitsHere) suggest.push(`go ${e.dir}`);
  // Combat-legal at the cost of an opening: stoop for a fallen weapon, eat,
  // or swap your steel (armor on/off is refused mid-fight, so no armor chip).
  // A tide-drowned floor offers no get chips (cmdGet refuses them) — the
  // dive chip below is the way down to whatever's there.
  const drowned = events.tideFlooded(z, session.roomId);
  if (!drowned) {
    for (const itemId of z.ground.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(itemId);
      if (t) suggest.push(`get ${shortName(t.name)}`);
    }
    for (const inst of z.groundInstances.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(inst.itemId);
      if (t) suggest.push(`get ${shortName(t.name)}`);
    }
  }
  // Journal in hand and a foe to watch: study it (mid-fight it's an opening).
  if (creatureHere && session.items.some((c) => c.journalId)) {
    const firstMob = [...z.creatures.values()].find(
      (c) => c.roomId === session.roomId && !(LURKERS.has(c.templateId) && c.hidden && !c.target),
    );
    if (firstMob) suggest.push(`study ${chipName(world.mobTemplates.get(firstMob.templateId)!.name)}`);
  }
  const edible = session.items.find((c) => world.itemTemplates.get(c.itemId)?.edible);
  if (edible) suggest.push(`eat ${shortName(world.itemTemplates.get(edible.itemId)!.name)}`);
  const gearless = session.items.find((c) => {
    if (c.equipped) return false;
    const t = world.itemTemplates.get(c.itemId);
    if (!t || !!z.equippedItem(session, t.slot)) return false;
    // mid-fight only a weapon may be readied; out of combat, any worn slot.
    return t.slot !== "" && (t.slot === "weapon" || !fighting);
  });
  if (gearless) suggest.push(`equip ${shortName(world.itemTemplates.get(gearless.itemId)!.name)}`);
  // Standing blind in the lightless deep with a light in the pack: the chip
  // that saves you. Both offered if you carry both — they're different tools.
  if (DARK_ROOMS.has(session.roomId) && !z.carriesLight(session)) {
    if (session.items.some((c) => c.itemId === TORCH_ITEM)) suggest.push("light torch");
    if (session.items.some((c) => c.itemId === LANTERN_ITEM && c.condition > 0)) suggest.push("light lantern");
  }

  // A locked cache here that you hold the key to: one chip opens it.
  if (!fighting) {
    for (const cache of world.caches) {
      if (z.cacheRoomId(cache) !== session.roomId || !z.cacheLocked(cache)) continue;
      if (session.items.some((c) => c.itemId === cache.keyItem)) suggest.push(`unlock ${shortName(cache.name)}`);
    }
  }

  // The peacetime chips — the whole calm world — only when nothing's on you.
  if (!fighting) {
    suggest.unshift("look");
    // No rest chip with something visible in the room — cmdRest refuses it, so
    // the chip would only bait a dead tap.
    if (session.hp < session.maxHp && !session.resting && !creatureHere) suggest.push("rest");
    // The one fishing spot: a line off the Pocket of Air's shelf.
    if (FISHING_ROOMS.has(session.roomId)) suggest.push("fish");
    // Blood on your hands and water to lose it in: the chip to scrub it off.
    // Only shown when you're actually marked — it's the quiet affordance a
    // killer looks for, and it never lies to a clean pair of hands.
    if ((FISHING_ROOMS.has(session.roomId) || drowned || events.raining(z, session.roomId))
      && pvp.isBloodied(z, session.pubkey)) suggest.push("wash");
    // Standing in the flood: the way down to the drowned floor. cmdDive
    // refuses with a drowner in the water, so the chip holds back too (the
    // drowner is plainly visible — hiding the chip gives nothing away).
    if (drowned && ![...z.creatures.values()].some(
      (c) => c.roomId === session.roomId && DROWNERS.has(c.templateId) && !c.hidden,
    )) suggest.push("dive");
    // The gate's trades: the keeper's hatch (the client opens the trade
    // modal), and the forge if you carry the makings. A typed trade left
    // open still offers the tender chips.
    if (world.entryRooms.has(session.roomId)) {
      if (world.fenceStock.length) suggest.push(TRADE_CHIP);
      // The forge chip opens the forge modal (a gate fixture, like the keeper).
      if (world.forgeRecipes.length) suggest.push(FORGE_CHIP);
      if (session.buying && !session.trading) {
        const offered = new Set<string>();
        for (const c of session.items) {
          if (c.serial !== null || session.buying.escrow.some((e) => e.row === c.rowId)) continue;
          const t = world.itemTemplates.get(c.itemId);
          if (!t || (t.barter ?? 0) <= 0 || offered.has(t.id)) continue;
          offered.add(t.id);
          suggest.push(`offer ${shortName(t.name)}`);
          if (offered.size >= 4) break;
        }
        suggest.push("offer nothing");
      }
    }
    // Knowledge you carry: open a map or the journal (each pops its modal).
    if (session.items.some((c) => MAP_ITEMS.has(c.itemId))) suggest.push("map");
    if (session.items.some((c) => c.journalId)) suggest.push("journal");
    // The 'inventory' chip is the one keeping-place: tapping it opens the
    // pack/lockbox(/vault) modal (the client intercepts BENCH_CHIP), always
    // up out of combat — step aside anywhere to sort, safe from any knife.
    // The vault + seal only work at a gate, so the modal shows them only
    // there. (Typing 'inventory' still prints the plain list — chip ≠ command.)
    suggest.push(BENCH_CHIP);
    // No help chip: the tutorial teaches typed 'help', and a chip row that
    // ends in meta-buttons reads like a toolbar, not a dungeon (rome, 2026-07-11).
    suggest.push("say …");
  }
  // Two rats in a room shouldn't mean two identical chips.
  const unique = [...new Set(suggest)];
  try {
    session.ws.send(JSON.stringify({ v: 0, t: "ctx", suggest: unique, combat: fighting }));
  } catch {}
}

// Room contents changed: refresh the chips of everyone standing there.
export function refreshRoomCtx(z: ZoneDO, roomId: string): void {
  for (const s of z.sessions.values()) {
    if (s.roomId === roomId) sendCtx(z, s);
  }
}

// Combat begins and ends in many places (attack, ambush, a grudge walking
// in, the last foe dying, fleeing). Rather than trust every one of them to
// remember the chips, sweep: anyone whose combat state no longer matches
// what their chips were drawn for gets a fresh set. Runs after every
// command and every tick — the chip lock holds in ALL rooms.
export function syncCombatCtx(z: ZoneDO): void {
  for (const s of z.sessions.values()) {
    if (!s.away && z.inCombat(s) !== s.ctxCombat) sendCtx(z, s);
  }
}
