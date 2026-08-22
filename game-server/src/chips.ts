// The command chips: everything you could do right here, as ready-to-send
// commands (a UI helper like status, not protocol — the client renders them
// tappable). Out of the spine; zone.ts keeps one-line delegates so the many
// call sites (every command, every tick, gate.ts, ai.ts) stay unchanged.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import * as events from "./events";
import * as pvp from "./pvp";
import * as gate from "./gate";
import * as den from "./den";
import * as works from "./works";
import * as ai from "./ai";
import * as dice from "./dice";
import { chipName, nameMatches, shortName } from "./zone-util";
import { hasTrait } from "./world";
import {
  LURKERS, DIR_ORDER, TORCH_ITEM, LANTERN_ITEM,
  FISHING_ROOMS, TRADE_CHIP, BOUNTY_CHIP, FORGE_CHIP, BENCH_CHIP, DEN_CHIP, MAP_ITEMS, DROWNERS,
  SMOKEHOUSE_ROOMS, CURE_RECIPES, COOK_RECIPES, MILESTONES,
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

  // IN THE GATEHOUSE the world's chips are all wrong — there is nothing here to
  // attack, forage, fish or flee. The room offers what the room has: the fixtures
  // on its walls, and the door back out. Everything else you might want to do in
  // here you do by talking, and talking needs no chip.
  if (z.outOfWorld(session)) {
    // The room's fixtures in the order you'd walk to them — the door, the hatch,
    // the brazier — and your own kit last, because it's the one thing here that
    // isn't the room.
    const inside = ["out"];
    // THE BONES, only once they're in your hand. There is no chip that STARTS a
    // game (rome, 2026-08-12): the bones are something you find by looking at
    // the man who keeps them, the way everything else in this room is found —
    // the tray should not be handing out an invitation to gamble. But a game in
    // flight owns the room until it's settled, and these chips ARE the game, so
    // they stand while it lasts.
    const game = dice.gameOf(z, session.pubkey);
    if (game) {
      if (game.pending && game.b === session.pubkey) inside.push("dice accept", "dice decline");
      else if (!game.pending && game.turn === session.pubkey) inside.push("roll", "stand");
    }
    if (world.fenceStock.length) inside.push(TRADE_CHIP);
    // The bounty board: shown when the keeper has actually posted a trophy he's
    // paying for — a chip for an empty board teaches nothing.
    if (z.bounties.length) inside.push(BOUNTY_CHIP);
    // The forge is always here; SMELT only when you actually hold scrap enough to
    // melt a bar — counted across pack + lockbox + vault, cached by refreshGateStock
    // (the verb spends across all three, so the chip must see all three).
    if (world.forgeRecipes.length) { inside.push(FORGE_CHIP); if (session.gateSmeltable) inside.push("smelt"); }
    // The gate's own smoke-racks. If you've raw meat to hang (anywhere in your
    // keeping), the chip NAMES it — 'cure <meat>' hangs it on click, where bare
    // 'cure' would only read the racks. With nothing raw but joints already
    // curing, bare 'cure' takes down what's done.
    if (session.gateCureName) inside.push(`cure ${session.gateCureName}`);
    else if (z.rot.some((r) => r.kind === "gatecure" && r.roomId === session.pubkey)) inside.push("cure");
    // And the brazier, which is always burning in here: a raw catch anywhere in
    // your keeping gets a named chip that cooks it on click.
    if (session.gateCookName) inside.push(`cook ${session.gateCookName}`);
    // The wall chart: read it when it has anything on it; offer the nail when
    // you walked ANY room it doesn't have yet — the wall takes the whole world
    // now, not the ring around the doors.
    // YOUR chalk, not the wall's: the chips read your own chart, so 'study'
    // only offers when you have something of your own to read.
    const myWall = z.wallOf(session.pubkey);
    if (myWall.size) inside.push("study");
    if ([...z.walkedOf(session.pubkey)].some((r) => !myWall.has(r) && z.world!.rooms.has(r))) inside.push("carve");
    // The board, offered only when somebody has actually pinned something —
    // a chip for an empty board teaches nothing and costs a row.
    if (gate.boardCount(z)) inside.push("board");
    inside.push(BENCH_CHIP);
    // A typed trade left open still offers its tender chips — the deal is HERE
    // now, so the chips that close it have to be here too.
    if (session.buying && !session.trading) {
      const offered = new Set<string>();
      for (const c of session.items) {
        if (c.serial !== null || session.buying.escrow.some((e) => e.row === c.rowId)) continue;
        const t = world.itemTemplates.get(c.itemId);
        if (!t || (t.barter ?? 0) <= 0 || offered.has(t.id)) continue;
        offered.add(t.id);
        inside.push(`offer ${shortName(t.name)}`);
        if (offered.size >= 4) break;
      }
      inside.push("offer nothing");
    }
    session.ctxCombat = false;
    try {
      // gh: the client needs to know it's in the tavern, where a bare line is
      // speech and not a command — so it can stop echoing what you said.
      session.ws.send(JSON.stringify({ v: 0, t: "ctx", combat: false, suggest: inside, gh: true }));
    } catch {}
    return;
  }

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
    // GLINTING gear does the same by daylight (2026-08-20): the polish leaves
    // it nowhere to hide.
    if (LURKERS.has(creature.templateId) && creature.hidden && !creature.target
      && !z.carriesLight(session) && !z.wearsTrait(session, "glinting")) continue;
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
    // Same filter as the attack-chip loop above: the throw chip must never
    // name a lurker still lying in wait (it was the one place that could).
    const firstMob = [...z.creatures.values()].find((c) => c.roomId === session.roomId
      && !(LURKERS.has(c.templateId) && c.hidden && !c.target
        && !z.carriesLight(session) && !z.wearsTrait(session, "glinting")));
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
  // ...minus the ones the pack is standing in. A chip that refuses is a wasted
  // tap in the middle of a fight you are losing; the room text already names
  // the held gaps, so the chip row shows what is actually still open (ai.heldExits
  // never takes the last one, so this can never leave you with no exit chips).
  const shutWays = ai.heldExits(z, session);
  for (const e of exitsHere) if (!shutWays.has(e.dir)) suggest.push(`go ${e.dir}`);
  // Combat-legal at the cost of an opening: stoop for a fallen weapon, eat,
  // or swap your steel (armor on/off is refused mid-fight, so no armor chip).
  // A tide-drowned floor offers no get chips (cmdGet refuses them) — the
  // dive chip below is the way down to whatever's there.
  const drowned = events.tideFlooded(z, session.roomId);
  if (!drowned) {
    const curing = z.curingCount(session.roomId);
    const shownCure: Record<string, number> = {};
    for (const itemId of z.ground.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(itemId);
      if (!t) continue;
      shownCure[itemId] = (shownCure[itemId] ?? 0) + 1;
      if (shownCure[itemId] <= (curing[itemId] ?? 0)) continue; // hanging on the racks, curing — not loose loot, no 'get' chip (and no tempting you to cancel your own cure)
      suggest.push(`get ${shortName(t.name)}`);
    }
    for (const inst of z.groundInstances.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(inst.itemId);
      if (t) suggest.push(`get ${shortName(t.name)}`);
    }
  }
  // Journal in hand and a foe to watch: study it. NOT IN A FIGHT (2026-08-22) —
  // cmdStudy refuses outright now, so offering it here would be a button that
  // answers back. It used to be allowed-but-costly, which is what this chip was
  // written against.
  // A surveyor-map carries a journalId too (its ink rides the journal rail, 097),
  // so "a real journal" is journalId AND not a map — else a map offers `study`.
  if (creatureHere && !z.inCombat(session) && session.items.some((c) => c.journalId && !MAP_ITEMS.has(c.itemId))) {
    // Skip anything already written up (rome, 2026-07-26): studying twice adds
    // NOTHING. session.studied is the cache the sync builder can read;
    // unhydrated (undefined) falls through and offers it, as it always did.
    const firstMob = [...z.creatures.values()].find(
      (c) => c.roomId === session.roomId && !(LURKERS.has(c.templateId) && c.hidden && !c.target)
        && !session.studied?.has(c.templateId),
    );
    if (firstMob) suggest.push(`study ${chipName(world.mobTemplates.get(firstMob.templateId)!.name)}`);
  }
  const edible = session.items.find((c) => world.itemTemplates.get(c.itemId)?.edible);
  if (edible) suggest.push(`eat ${shortName(world.itemTemplates.get(edible.itemId)!.name)}`);
  // Standing in the smokehouse with raw meat and a torch to light the racks: the
  // chip that teaches the one station most players would never think to try.
  if (SMOKEHOUSE_ROOMS.has(session.roomId)) {
    const raw = session.items.find((c) => CURE_RECIPES[c.itemId] && c.serial === null);
    const fireLit = Date.now() < (z.groundTorch.get(session.roomId) ?? 0);
    if (raw && (fireLit || session.items.some((c) => c.itemId === TORCH_ITEM && c.serial === null))) {
      suggest.push(`cure ${shortName(world.itemTemplates.get(raw.itemId)!.name)}`);
    }
  }
  // A raw catch and a way to make fire: the same teaching chip as the racks,
  // for the station that has no room of its own. Only offered when the verb
  // would actually work — a fire already on the stone, the flame in your hand,
  // or a torch in the pack to spend on one.
  if (!fighting) {
    const raw = session.items.find((c) => COOK_RECIPES[c.itemId] && c.serial === null);
    const fire = Date.now() < (z.groundTorch.get(session.roomId) ?? 0)
      || session.litSource === "torch"
      || session.items.some((c) => c.itemId === TORCH_ITEM && c.serial === null);
    if (raw && fire) suggest.push(`cook ${shortName(world.itemTemplates.get(raw.itemId)!.name)}`);
  }
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
  // Only when the room is actually dark FOR YOU — no point urging a torch when
  // one already burns on the floor or in a companion's hand.
  if (!z.litFor(session)) {
    if (session.items.some((c) => c.itemId === TORCH_ITEM)) suggest.push("light torch");
    // The brand chip only when no plain torch — the chip must never be the
    // thing that spends the rare flame while common sticks sit in the pack.
    // Any burning weapon offers the chip, not just the longbrand (2026-08-20).
    else if (session.items.some((c) => hasTrait(world.itemTemplates.get(c.itemId), "burning"))) suggest.push("light brand");
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
    // OUT AT A GATE THERE IS EXACTLY ONE THING TO DO: go in (rome, 2026-07-13).
    // The hatch and the brazier are fixtures of the GATEHOUSE — they live in its
    // wall, on the other side of the door — so their chips belong in the room that
    // holds them, not out in the dark beside a loose rock. The gate offers the
    // door, and the door offers everything else.
    // ...unless the door is boarded over for works, in which case the one thing
    // to do here is not offerable and the chip row must not pretend otherwise
    // (works.ts). The gate ROOM is untouched — everything else it offers stays.
    if (world.entryRooms.has(session.roomId) && !session.away && !works.shutForWorks(z, session.roomId)) suggest.push("in");
    // A milestone offers exactly the two things a milestone is for. `read stone`
    // rather than bare `read` — the parser folds read into look, and a bare look
    // is the room. The carve chip goes quiet once your name is on this one.
    if (MILESTONES.has(session.roomId)) {
      suggest.push("read stone");
      if (!(z.stoneNames.get(session.roomId) ?? []).some((c) => c.name === session.name)) suggest.push("carve");
    }
    // A SITE says what you can do on it, right there in the chip row (migs
    // 162/172). Out on the ground: step through a door of yours, or raise one —
    // and raising one is offered to EVERYBODY, because the ground is never used
    // up. Behind a door: the shelf, the bar, and the way out.
    if (den.isHolding(z, session.roomId)) {
      const inside = den.insideOf(z, session.pubkey);
      const doors = den.doorsOpenTo(z, session.roomId, session.pubkey);
      // 'stow' is the DEN_CHIP: the client intercepts it and opens the keeping
      // modal with the shelf as a column, exactly as 'inventory' does (rome,
      // 2026-08-04). Typing 'stow <item>' still moves one thing by name — the
      // chip has never been the only way to do anything. Must match DEN_CHIP in
      // public.ts.
      if (inside) {
        // Behind your own door: the shelf, the bar, and the way back out.
        suggest.push("out", "den");
        if (inside.holder === session.pubkey && !inside.barred) suggest.push("bar");
        suggest.push(DEN_CHIP);
      } else {
        // Out on the site — and that is ALL it is (rome, 2026-08-07). The street
        // used to offer the shelf and the readout too, so the chip row outside
        // your house looked like the chip row inside it and going in bought you
        // nothing. The ground offers the door, and raising one; what is behind
        // the door is behind the door.
        if (doors.length) suggest.push("in");
        if (!den.myDen(z, session.pubkey)) suggest.push("settle");
      }
    }
    // Knowledge you carry: open a map or the journal (each pops its modal).
    if (session.items.some((c) => MAP_ITEMS.has(c.itemId))) suggest.push("map");
    // A map's journalId is its ink-rail, not a book — only a true journal (has a
    // journalId and isn't a map) offers the `journal` chip (097 overload fix).
    if (session.items.some((c) => c.journalId && !MAP_ITEMS.has(c.itemId))) suggest.push("journal");
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
  // WHICH DOOR 'in' AND 'out' MEAN HERE (rome, 2026-08-07). The client dresses
  // the bare verbs up as "into the gatehouse" / "out into the dark", which was
  // the whole truth when a gate was the only thing you could step inside. On den
  // ground they're a door in a house and the ground outside it, and the chip row
  // was telling a man standing in his own home to go to the tavern. A gate wins
  // the tie if a site ever sits on one.
  const door = den.isHolding(z, session.roomId) && !world.entryRooms.has(session.roomId) ? "den" : "";
  // WHICH WAY THE DOOR IS (rome, 2026-08-15). Sent always, shown by the client
  // only during the FIRST WALK — friendliness belongs in the interface and the
  // interface is where it can be taken away again. A wanderer who has finished
  // the guide reads the waystones like everybody else; the first hour is the one
  // that loses people, and it is the only one this props up.
  //
  // Cheap enough to send unconditionally: it is a lookup in a map built once at
  // world load, and the server has no business knowing whether a client has
  // dismissed its tutorial.
  const w = z.wayHome.get(session.roomId);
  const home = world.entryRooms.has(session.roomId) ? "here" : (w ? w.dir : "");
  try {
    session.ws.send(JSON.stringify({ v: 0, t: "ctx", suggest: unique, combat: fighting, door, home }));
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
