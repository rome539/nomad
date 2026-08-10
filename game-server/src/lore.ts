// Knowledge-as-loot, out of the spine: the copyist's maps and the hunter's
// journal (study + blood fill the bestiary). zone.ts keeps the instanced-floor
// plumbing (journals dropping/lifting rides the get/drop/death paths); this
// file owns what the knowledge SAYS and how it reaches the client.
import type { ZoneDO } from "./zone";
import type { Region } from "./world";
import type { Session } from "./zone-types";
import type { CarriedItem, JournalRow } from "./world";
import { journalLoad, journalStudy, loadContainer, deedsLoad, setItemJournalId, mapInkLoad, mapInkAdd, setKeeperTold } from "./world";
import { hashSeed, mulberry32, nameMatches } from "./zone-util";
import { uuid } from "./rng";
import * as den from "./den";
import { WOOD_QUARTERS, MAP_QUARTERS, MOB_LORE } from "./detail";
import {
  MAP_ITEMS, DETAILED_MAP, FULL_MAP, CRUDE_DROP_MIN, CRUDE_DROP_MAX, CRUDE_BAD_MIN, CRUDE_BAD_MAX,
  GROUNDS_ROOMS, OVERWORKS_ROOMS, WARRENS_ROOMS, JOURNAL_ITEM,
  THIEVES, RUNNERS, BROODERS, SENTINELS, DROWNERS, LURKERS, ROOTED, FIREKEEPERS, CORRODERS,
  REVENANTS, AGGRO_SCAVENGERS, SCAVENGERS, PATROLS, LISTENERS, HOLLOW,
  MILESTONES, MILESTONE_CAP, MILESTONE_SHOW, MAP_BAND_OF,
  GATE_TELLINGS,
} from "./zone-data";

// ---- the milestones: the road's register of who walked it ----
//
// Distinct from both of its neighbours in the codebase, deliberately. The
// gatehouse wall (gate.wallCarve) records HALLS — shared map knowledge, and it
// only takes rooms you personally walked this session. `carve <words>`
// (verbs.cmdCarve) records ANYTHING, anywhere, and weathers off inside a day.
// A milestone records PEOPLE, permanently, and only your own name: you cannot
// write someone else onto the road, and you cannot write yourself onto a stone
// you are not standing at.

export async function milestoneCarve(z: ZoneDO, session: Session): Promise<void> {
  const stone = MILESTONES.get(session.roomId);
  if (!stone) return;
  const cut = z.stoneNames.get(session.roomId) ?? [];
  if (cut.some((c) => c.name === session.name)) {
    return z.send(session, `Your name is already on ${stone.stone}, in your own hand. Once is what it's for.`, "study");
  }
  cut.push({ name: session.name, at: Date.now() });
  // The stone is finite. New names crowd the oldest off the bottom, which is
  // the only weathering this register has — everything else about it is
  // permanent, and a name that falls off was cut a very long time ago.
  const weathered = cut.length > MILESTONE_CAP ? cut.splice(0, cut.length - MILESTONE_CAP) : [];
  z.stoneNames.set(session.roomId, cut);
  z.send(session, `You work your name into ${stone.stone} under the others: ${session.name}.` +
    (weathered.length ? ` The oldest name on it goes under your chisel to make the room — ${weathered[0].name}, whoever that was.` : ""), "study");
  z.roomFeed(session.roomId, `${session.name} cuts a name into the stone, slowly.`, session.pubkey, false);
  z.roomSound(session.roomId, "Steel worrying at stone, {dir} — slow, patient, going on a while.");
  z.creatureNoise(session.roomId); // it takes a long time and it carries: a road is a bad place to make noise
  await z.persist();
}

export function milestoneRead(z: ZoneDO, session: Session): void {
  const stone = MILESTONES.get(session.roomId)!;
  const cut = z.stoneNames.get(session.roomId) ?? [];
  if (!cut.length) {
    return z.send(session, `The old cut has weathered past reading, and below it the stone is bare. Nobody has set their name down here. (carve)`, "study");
  }
  // The whole point of there being TWO stones: a name on both is somebody who
  // went on. Nothing tracks that — the comparison IS the record.
  const far = new Set((z.stoneNames.get(stone.other) ?? []).map((c) => c.name));
  const newestFirst = [...cut].reverse();
  const lines = newestFirst.slice(0, MILESTONE_SHOW)
    .map((c) => `  ${c.name}${far.has(c.name) ? ` — ${stone.also}` : ""}`);
  const rest = newestFirst.length - lines.length;
  const both = newestFirst.filter((c) => far.has(c.name)).length;
  z.send(session, `Names, crowded into the lee of ${stone.stone}, the newest cut over the oldest:\n${lines.join("\n")}` +
    (rest > 0 ? `\n  …and ${rest} more, cut deeper and read harder.` : "") +
    `\n${both} of the ${newestFirst.length} are on both stones.`, "study");
}

// ---- maps: open a chart you carry (the modal draws it) ----

// THE SURVEYOR'S BLANK (rome, 2026-07-19): a surveyor's map charts what its
// CARRIER walks — the ink lives with the COPY, riding the same instanced
// identity as the hunter's journal (journalId), so drop/steal/death carry the
// charted work with the paper. A dead surveyor's filled map is loot; a fresh
// copy is blank but the gates; and a grown world stays dark until walked.
// Called from every room-change (and on unroll): mint the copy's identity if
// it never got one, warm the ink cache, and set down the room underfoot.
export async function inkRooms(z: ZoneDO, session: Session): Promise<void> {
  for (const carried of session.items) {
    if (carried.itemId !== DETAILED_MAP) continue;
    if (!carried.journalId) {
      // A copy that never got a name (bought, found, or owned from before the
      // blank) starts its ink here.
      carried.journalId = "map-" + uuid();
      await setItemJournalId(z.env.DB, carried.rowId, carried.journalId);
    }
    session.mapInk ??= new Map();
    let ink = session.mapInk.get(carried.journalId);
    if (!ink) {
      ink = new Set(await mapInkLoad(z.env.DB, carried.journalId));
      session.mapInk.set(carried.journalId, ink);
    }
    if (!ink.has(session.roomId)) {
      ink.add(session.roomId);
      await mapInkAdd(z.env.DB, carried.journalId, session.roomId);
    }
  }
}

export async function cmdMap(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const maps = session.items.filter((c) => MAP_ITEMS.has(c.itemId));
  if (!maps.length) {
    return z.send(session, "You carry no map. The keeper sells them — a true one dear, a crude one cheap.");
  }
  // Name one, or default to the best you hold (a true map over a crude one).
  let carried = arg ? maps.find((c) => nameMatches(z.world!.itemTemplates.get(c.itemId)!.name, arg)) : null;
  // The finished chart outranks everything — there is nothing a surveyor's
  // blank can tell you that it does not already say.
  if (!carried) carried = maps.find((c) => c.itemId === FULL_MAP)
    ?? maps.find((c) => c.itemId === DETAILED_MAP) ?? maps[0];
  const whole = carried.itemId === FULL_MAP;
  const detailed = whole || carried.itemId === DETAILED_MAP;
  // A chart records nothing: it was finished before you were born, and walking
  // around holding it does not teach it anything.
  if (detailed && !whole) await inkRooms(z, session);
  sendMap(z, session, carried, detailed);
  if (whole) {
    return z.send(session, "You unfold the finished chart. All of it, at once — every hall and ride and stair, in one hand. Somebody walked this whole place with a chain and wrote down what they found, and then, apparently, stopped.");
  }
  if (detailed) {
    const inked = session.mapInk?.get(carried.journalId!)?.size ?? 1;
    return z.send(session, inked <= 1
      ? "You unroll the surveyor's blank — empty but for the ground underfoot. It charts what its carrier walks, set down true."
      : `You unroll the surveyor's map. ${inked} halls are set down true, walked in by the hands that carried it.`);
  }
  // The unfold reads the hand that drew this copy — the one honest thing a
  // crude map tells you is how far to trust the rest of it.
  const hand = crudeHand(carried.rowId);
  z.send(session, hand >= 0.75
    ? "You unfold the crude map. The hand that drew it was careful — most of these ways should hold."
    : hand < 0.3
      ? "You unfold the crude map. The hand that drew it was drunk, hurried, or lying. Scrawl and guesswork."
      : "You unfold the crude map. Some of these ways are right. Trust it at your peril.");
}

// The hand that drew a given copy: rolled once off the copy's row id, so it's
// RNG at the moment the copy comes into your life and fixed forever after —
// this scrap was always this good, or this bad. Salted so it never correlates
// with the lie-pattern stream seeded off the bare row id.
function crudeHand(rowId: string): number {
  return mulberry32(hashSeed(rowId + ":hand"))();
}

// ---- THE CANONICAL WORLD GRID ---------------------------------------------
//
// rome, 2026-08-02: "when I map the gatehouses for the different regions it's
// all just clusters in the center and it's not real with how it looks on a map."
//
// He is right, and the clusters are REAL, which is the bug. The wall chart only
// ever holds what has been carved, and the surveyor's map only what has been
// walked, so both routinely hold several disconnected islands — the shallow ring
// around eight gates in three bands is eight separate neighbourhoods that do not
// touch. The client laid each island out on its own little grid and then PACKED
// the islands into rows to fill the band. That is correct for a crude map, which
// is a shattered pack of lies by design. It is wrong for a true one, where the
// islands are real places with real positions relative to each other.
//
// The client cannot fix this: it only ever receives the rooms you know, so it
// has no idea how far apart two islands are. The SERVER has the whole graph. So
// the world gets ONE canonical grid, laid out from the true map, and every true
// frame ships the coordinates of the rooms you are allowed to see. Nothing leaks
// — an unwalked room sends no name, no exit and no coordinate; there is simply a
// gap in the paper where you have not been, which is exactly what a real
// surveyor's sheet looks like.
//
// Computed once per world and cached: the map is static, and this is a few
// hundred cheap steps.
export interface WorldGrid {
  at: Map<string, { x: number; y: number }>;      // absolute, band offset already baked in
  bands: { region: string; x: number; y: number }[]; // where each REGION's caption hangs, fixed forever
}

export function worldGrid(z: ZoneDO): WorldGrid {
  if (z.mapGrid) return z.mapGrid;
  const world = z.world!;
  // THE MAP IS LAID OUT FLAT, AND THIS JUST READS IT (rome, 2026-08-03: "HAVE
  // THE FUCKING MAP LAID OUT FUCKING FLAT AND THEN JUST FILL IN THE FUCKING
  // ROOMS WHEN YOU FUCKING EXPLORE IT").
  //
  // What used to be here: two hundred lines that walked the whole graph at load,
  // dropped every room onto a shared plane, and resolved the collisions — by
  // shoving rooms aside, then by shoving whole regions aside, then by evicting
  // the few rooms in the way. Every version failed identically, because they all
  // shared one assumption: that a room's place is something to WORK OUT. It
  // isn't. A collision anywhere moves a room, a moved room drags everything
  // placed through it, and the answer changes every time the world grows — so a
  // square you learned last week is somewhere else this week. That is the
  // opposite of a map.
  //
  // A room's place on the paper is a FACT about the room, like its name. It
  // lives in the row (map_x / map_y, mig 166), baked once. Nothing is derived,
  // nothing collides, nothing moves, and adding a region cannot disturb a single
  // room that was already drawn. The client fills in what you have walked.
  const at = new Map<string, { x: number; y: number }>();
  for (const room of world.rooms.values()) {
    if (room.map_x === null || room.map_x === undefined) continue;
    at.set(room.id, { x: room.map_x, y: room.map_y ?? 0 });
  }
  // EVERY REGION IS NAMED, NOT EVERY STRATUM (rome, 2026-08-06: "make it so on
  // the map all regions are labled (like it is with overworks, warrens, etc)").
  //
  // The captions used to be one per BAND, which meant the five strata got names
  // and the surface — 311 of 408 rooms — got exactly one: "THE SURFACE",
  // covering the keep's own ground, a 68-room road, a 170-room wood and the den
  // hamlet all at once. The underground was better labelled than the half of the
  // world people actually walk.
  //
  // So a caption belongs to a REGION now. Each hangs at the top-left of its own
  // rooms, which needs no spine and no measuring: the regions are separate
  // places on the sheet, so their own corners are the honest anchors. The one
  // exception is `gate` — the fortress's three doors stand ON its open ground
  // and would print a second caption inside the first. They need no label; a
  // gate is already the loudest tile on the paper.
  //
  // AND A CORNER IS NOT ALWAYS THE REGION'S OWN GROUND (rome, 2026-08-07: "the
  // west road is inside of the dens"). The anchor was the BOUNDING BOX's corner,
  // which is only honest when regions are rectangles that don't interleave. They
  // aren't: the road's westmost room sits three rows below the den block's top,
  // so min_x from the road and min_y from the road met at a point standing in
  // the middle of the hamlet, and "THE WEST ROAD" printed across the dens.
  // Anchors are chosen off REAL ROOMS now, and only where the caption has room
  // to be read — see anchorFor.
  const pts = new Map<string, { x: number; y: number }[]>();
  const owner = new Map<string, string>(); // "x,y" -> the region drawn on that cell
  for (const [id, p] of at) {
    let region = mapRegionOf(z, id);
    if (region === "gate") region = "out"; // a door is drawn on the ground it stands on
    // AND THE WOOD IS CAPTIONED BY QUARTER (2026-08-06). One name over 170 rooms
    // — 42% of the world — while the fortress's 110 carried five. The quarters
    // (detail.ts) are caption-only: mapRegionOf still says "wood", so the colour,
    // the gate telling, the spawn tables and every rule keyed on region are
    // untouched. Nothing here moves a square either; a room's place is baked in
    // its row and this only decides what gets written above it.
    const quarter = MAP_QUARTERS[id];
    if (quarter) region = quarter;
    (pts.get(region) ?? pts.set(region, []).get(region)!).push(p);
    owner.set(`${p.x},${p.y}`, region);
  }
  // A caption is 11px type in a 108px cell, so the longest of them ("THE OLD
  // ENCLOSURE") runs about a cell and a half — it touches the cell it starts in
  // and the one after it, and nothing further.
  const CAPTION_CELLS = 2;
  // Hang the name over a room the region actually owns, in the first place along
  // its top edge where the line has clear paper to sit on. Strict first (empty
  // cells), then over the region's own rooms if that's all there is, and only
  // then the old bounding-box corner — a caption somewhere imperfect still beats
  // no caption at all.
  const anchorFor = (region: string, list: { x: number; y: number }[]) => {
    const cands = [...list].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const ownOk of [false, true]) {
      for (const c of cands) {
        let clear = true;
        for (let dx = 0; dx < CAPTION_CELLS && clear; dx++) {
          const o = owner.get(`${c.x + dx},${c.y - 1}`);
          if (o !== undefined && !(ownOk && o === region)) clear = false;
        }
        if (clear) return { x: c.x - 0.35, y: c.y - 1.05 };
      }
    }
    return {
      x: Math.min(...list.map((p) => p.x)) - 0.35,
      y: Math.min(...list.map((p) => p.y)) - 1.05,
    };
  };
  const bands = [...pts.entries()]
    .sort((a, b) => Math.min(...a[1].map((p) => p.y)) - Math.min(...b[1].map((p) => p.y)))
    .map(([region, list]) => ({ region, ...anchorFor(region, list) }));
  z.mapGrid = { at, bands };
  return z.mapGrid;
}

// Display grouping only — the sim's regionOf (chest tiers etc.) still reads
// these blocks as "upper". The map just names where you're standing honestly.
// (Shared with the gatehouse wall chart, which draws the same frame.)
export function mapRegionOf(z: ZoneDO, id: string): string {
  // A GATE IS DRAWN ON THE GROUND IT STANDS ON, and coloured as a gate by the
  // `gate` flag the frame carries (rome, 2026-08-02: "the gates are broken and
  // showing up in the middle of the fortress").
  //
  // regionOf checks entryRooms FIRST and collapses every gate to "gate", which
  // was right while all three doors were in the fortress. Since they spread,
  // it put the wood's Timber Stack and the road's First Milestone in the
  // FORTRESS's stratum — a wood room drawn among the fortress's own ground,
  // disconnected from everything, floating. So: a room that carries its own
  // region is drawn in that region, gate or not.
  const own = z.world!.rooms.get(id)?.region;
  if (own) return own; // road / wood / mountain — their gates included
  // The original 110 carry no region column and keep the derived reading, where
  // "gate" is still the right stratum: those three doors ARE the fortress.
  return z.regionOf(id) === "gate" ? "gate"
    : GROUNDS_ROOMS.has(id) ? "out" : OVERWORKS_ROOMS.has(id) ? "sky" : WARRENS_ROOMS.has(id) ? "warrens" : z.regionOf(id);
}

// Build and send the map frame. A detailed map is the true graph and lights
// its rooms 'known' on the HUD; a crude map is deterministically lied — some
// rooms missing, some exits wrong — seeded off the book so it's consistently
// (not randomly) wrong, and it reveals nothing it can be trusted on.
function sendMap(z: ZoneDO, session: Session, carried: CarriedItem, detailed: boolean): void {
  const world = z.world!;
  // A FINISHED CHART IS ALREADY EVERYWHERE. It carries no ink of its own — the
  // rooms are not something it learns, they are what it IS — so it draws the
  // whole grid and keeps drawing it as the world grows (mig 182). Everything
  // below this line is the machinery for a map that has to be earned; a chart
  // that was earned by somebody else, a long time ago, skips all of it.
  const complete = carried.itemId === FULL_MAP;
  const rnd = detailed ? null : mulberry32(hashSeed(carried.rowId));
  // A bad hand slides both lie rates toward their worst rail; a careful one
  // toward the best. The hand is per-copy and permanent (see crudeHand).
  const hand = detailed ? 1 : crudeHand(carried.rowId);
  const dropRoom = CRUDE_DROP_MIN + (1 - hand) * (CRUDE_DROP_MAX - CRUDE_DROP_MIN);
  const badExit = CRUDE_BAD_MIN + (1 - hand) * (CRUDE_BAD_MAX - CRUDE_BAD_MIN);
  const roomIds = [...world.rooms.keys()];
  // Which rooms make it onto the paper. A SURVEYOR'S copy holds exactly its own
  // ink — the halls its carriers walked while holding it — plus the gates
  // (communal signposts; the map must never hide the bank) and the ground
  // underfoot. A CRUDE map shows the gates, where you stand, and a coin-weighted
  // scatter of everything else, right or not.
  const ink = complete
    ? new Set<string>(roomIds)   // all of it, and it stays all of it
    : detailed ? (session.mapInk?.get(carried.journalId ?? "") ?? new Set<string>()) : null;
  const shown = new Set<string>();
  for (const id of roomIds) {
    if (detailed) {
      // A DOOR YOU HAVE NEVER WALKED TO IS NOT ON YOUR PAPER (rome, 2026-08-02).
      // This used to pre-ink every gate as a communal signpost — "the map must
      // never hide the bank" — which was harmless while all three doors were in
      // the fortress you start in. With eight of them spread across three bands
      // it hands a fresh wanderer the wood's three doors and the road's two
      // before he has taken a step outside, which is both a lie about what the
      // copy has charted and the whole of the exploration given away on a blank
      // sheet. A surveyor's map holds EXACTLY what its carriers walked.
      if (ink!.has(id) || id === session.roomId) shown.add(id);
    } else if (z.regionOf(id) === "gate" || id === session.roomId || rnd!() >= dropRoom) {
      shown.add(id);
    }
  }
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
  };
  for (const id of shown) {
    const room = world.rooms.get(id)!;
    const realExits = world.exits.get(id) ?? [];
    const exits: { dir: string; to: string; toName: string }[] = [];
    for (const e of realExits) {
      if (!detailed) {
        if (rnd!() < badExit) {
          // A lie: half the time the exit's simply missing, half the time it
          // points at the wrong room (one that's on this map).
          if (rnd!() < 0.5) continue;
          const others = [...shown].filter((r) => r !== id);
          const wrong = others[Math.floor(rnd!() * others.length)] ?? e.to_room;
          exits.push({ dir: e.dir, to: wrong, toName: world.rooms.get(wrong)?.name ?? "somewhere" });
          continue;
        }
      }
      // A surveyor's copy draws only passages between halls it holds — a door
      // into somewhere unwalked isn't on the paper yet, and mustn't leak the
      // far room's name. (The room's own prose still names its exits; the map
      // records where you've BEEN.)
      if (detailed && !shown.has(e.to_room)) continue;
      exits.push({ dir: e.dir, to: e.to_room, toName: world.rooms.get(e.to_room)?.name ?? e.to_room });
    }
    // A band with no frame of its own falls in with the halls rather than
    // throwing the whole map away over one unlabelled room.
    // A TRUE map carries its canonical position (worldGrid) so islands sit where
    // they really are; a CRUDE map deliberately does not — it is a shattered
    // pack of lies and the client's own packing is the right look for it.
    const at = detailed ? worldGrid(z).at.get(id) : undefined;
    (regions[mapRegionOf(z, id)] ?? regions.upper).rooms.push({
      id, name: room.name, exits, here: id === session.roomId,
      gate: world.entryRooms.has(id) ? 1 : 0,
      // A HIDEAWAY IS THE OTHER KIND OF SAFETY, and the map was silent about it
      // (rome, 2026-08-06). A gate is where you BANK; a bolthole is where you
      // stop being followed. Both are worth steering for and only one of them
      // was drawn. Sent per-room, so it can only ever appear on ground your copy
      // has actually charted.
      safe: world.safeRooms.has(id) && !world.entryRooms.has(id) ? 1 : 0,
      // YOUR ROOF IS FINDABLE ON THE PAPER (rome, 2026-08-04: "on the map your
      // den should be easily noticed"). A den is a fixed point you have to be
      // able to steer for from anywhere — that is most of what makes the walk
      // home a thing you plan — and it was drawn as one more plate among four
      // hundred. It gets a gate's weight now, in gold, with a roof on it.
      // Somebody ELSE's house is never marked: the map would become the
      // directory of who sleeps where that the room prose refuses to be.
      home: den.homeMark(z, id, session.pubkey),
      band: MAP_BAND_OF[mapRegionOf(z, id)] ?? 1,
      // Which quarter of the wood this square belongs to, so the client can hold
      // a quarter's caption back until you have walked some of it — same law the
      // region captions already keep: a name floating over ground your copy has
      // never charted would be telling you a place exists.
      q: MAP_QUARTERS[id],
      x: at?.x, y: at?.y,
    });
  }
  try {
    session.ws.send(JSON.stringify({
      v: 0, t: "map", detailed: detailed ? 1 : 0, here: session.roomId,
      // A true map is knowledge you keep: its rooms light gold on the HUD. A
      // crude one reveals nothing it can be trusted on.
      reveal: detailed ? [...shown].map((id) => world.rooms.get(id)!.name) : [],
      bands: worldGrid(z).bands,
      regions: Object.values(regions).filter((r) => r.rooms.length),
    }));
  } catch {}
}

// ---- the journal: study + blood fill in the bestiary ----

// A short read of what a creature IS, from the behaviour families it belongs
// to — the observation half of an account, available once you've studied it.
function creatureNature(id: string): string {
  if (THIEVES.has(id)) return "A cutpurse. It fights to rob, not to win — one grab and it bolts.";
  if (RUNNERS.has(id)) return "It never stands and fights; it bolts the instant it can. Catch it on the break.";
  if (BROODERS.has(id)) return "A brood-mother. Nest-bound, and while it lives the room keeps filling with young.";
  if (SENTINELS.has(id)) return "A sentinel. It guards one door and never leaves it — deaf to lures, it sleeps until the deep is opened, then wakes and bars the way. Getting past means going through.";
  // Not "a drowned thing" any more — the mire-walker is one of these and is no
  // such thing. What the family actually IS: it holds water and takes hold.
  if (DROWNERS.has(id)) return "It holds its patch of water and never leaves it. It will not come to you — but wade in, and it takes hold.";
  // Before LURKERS: a rooted lurker is not drawn by anything, because it cannot
  // go anywhere. Same unseen waiting, opposite reason.
  if (FIREKEEPERS.has(id)) return "A collier, and the mound beside him is his work — turf over a slow burn, days in the making. It will not come at you. The fire it keeps holds off everything in this wood that fears one, and it will take a flame in weather that would drown a torch.";
  if (ROOTED.has(id)) return "It does not move, ever — it is part of the ground until it is not, and you will not see it until it is. It cannot follow, and it cannot be lured. It burns.";
  if (LURKERS.has(id)) return "It waits unseen and drops on the careless. Noise and movement draw it.";
  if (CORRODERS.has(id)) return "It does not want your blood. Its touch is rust — every blow blooms green on what you WEAR, and it will patiently eat you out of your kit. Fight it naked or fight it fast.";
  if (REVENANTS.has(id)) return "It does not stay down — put it to nothing and it rises again, weaker, to come once more.";
  if (AGGRO_SCAVENGERS.has(id)) return "A scavenger that guards its kills — walk in on one feeding and it turns on you.";
  if (SCAVENGERS.has(id)) return "A scavenger. It roams the dark eating the dead, and grows bold as it gorges.";
  if (PATROLS[id]) return "It walks an endless round of the halls and never breaks stride.";
  if (LISTENERS.has(id)) return "Hollow and blind, but it HEARS — a still, quiet wanderer it lets pass.";
  if (HOLLOW.has(id)) return "Hollow — nothing inside. It does not bleed, hunger, or tire.";
  return "A living thing of the dark, and hungry.";
}

// WHAT A FULL ACCOUNT COSTS, and it is not a flat number any more (rome,
// 2026-08-06: "make lvl 6 3 and then scale up from there").
//
// Every creature in the game used to want the same three kills, which charged
// the LEAST for the things hardest to meet. A scabby rat and the Gaunt cost the
// same page — and the Gaunt respawns once a day, so its account was a three-day
// project while the rat's filled off the first one you tripped over. Killing a
// thing designed not to be farmed three times is not difficulty, it is waiting.
//
// So the price runs the other way, on the creature's own level, which is the
// design's existing statement of how heavy a thing is:
//
//   level 6 (and the bosses) .. 3    the Gaunt, the Woodward, the drowned god
//   level 5 ................... 4
//   level 4 ................... 5
//   level 3 ................... 6    the bulk of the world
//   level 2 ................... 7
//   level 1 ................... 8    the small stuff you kill by the dozen
//
// A rat's page becomes a record that you really did hunt them. A boss's page is
// the trophy of having got there at all.
export function killsForAccount(level: number): number {
  return 9 - Math.max(1, Math.min(6, level || 1));
}

function journalTier(kills: number, studied: boolean, level: number): number {
  if (studied && kills >= killsForAccount(level)) return 3; // the full account
  if (kills >= 1) return 2;            // a rough read, from the killing
  if (studied) return 1;              // habits only, from watching
  return 0;
}

// A journal must be IN HAND to write in — its pages, not your memory, do the
// remembering. It's safe to leave it in the lockbox between hunts; you just
// can't log a thing while it's locked away. Returns where the nearest one is.
async function whereIsJournal(z: ZoneDO, session: Session): Promise<"hand" | "stored" | "none"> {
  // A surveyor-map carries a journalId (its ink-rail, 097) but is not a book —
  // a real journal is a journalId that isn't a map, or the base journal item.
  if (session.items.some((c) => (c.journalId && !MAP_ITEMS.has(c.itemId)) || c.itemId === JOURNAL_ITEM)) return "hand";
  for (const key of ["lockbox", "vault"] as const) {
    const held = await loadContainer(z.env.DB, session.pubkey, key);
    if (held.some((c) => c.itemId === JOURNAL_ITEM)) return "stored";
  }
  return "none";
}

// Every journal IN HAND, ids guaranteed: a book that lost its name somewhere
// (a hyena's haul, an old full-pack spill at the counter) gets a fresh one on
// first open — without it the row is invisible to both read and write.
async function carriedJournals(z: ZoneDO, session: Session): Promise<CarriedItem[]> {
  // Maps share the journalId rail (097) but are not books — exclude them, or
  // `study`/journal-read would operate on a map.
  const books = session.items.filter((c) => (c.journalId && !MAP_ITEMS.has(c.itemId)) || c.itemId === JOURNAL_ITEM);
  for (const b of books) {
    if (!b.journalId) {
      b.journalId = "jrn-" + uuid();
      await setItemJournalId(z.env.DB, b.rowId, b.journalId);
    }
  }
  return books;
}

// Re-read which creatures are already studied across every carried journal into
// session.studied. The chip builder (chips.ts) is SYNCHRONOUS — sendCtx runs on
// every combat round — so it cannot ask D1 whether a `study` chip would be
// redundant; it reads this cache instead. Same shape as session.mapInk: a
// per-session cache over a journal table. Refreshed on connect/wake, on study,
// and on a journal read.
// NEVER throws: it runs on the connect/wake path, and a D1 hiccup (the
// overload that used to abort whole ticks) must not cost anyone a login over a
// chip hint. On failure the cache stays unhydrated and the chip just shows.
export async function refreshStudied(z: ZoneDO, session: Session): Promise<void> {
  try {
    const ids = (await carriedJournals(z, session)).map((b) => b.journalId!);
    const seen = new Set<string>();
    for (const id of ids) {
      for (const r of await journalLoad(z.env.DB, id)) {
        if (r.studied) seen.add(r.templateId);
      }
    }
    session.studied = seen;
  } catch (e) {
    console.error("refreshStudied threw", (e as Error)?.stack ?? String(e));
  }
}

export async function cmdStudy(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const journal = (await carriedJournals(z, session))[0];
  if (!journal?.journalId) {
    const where = await whereIsJournal(z, session);
    return z.send(session, where === "stored"
      ? "Your journal's in the lockbox. You need it in hand to write in it — fetch it out first."
      : "You've nothing to write in. Buy a journal from the keeper first.");
  }
  if (!arg) return z.send(session, "Study what?");
  const creature = z.findCreatureIn(session.roomId, arg);
  // You can't study what you can't see — a hidden lurker isn't there yet.
  if (!creature || (creature.hidden && LURKERS.has(creature.templateId) && !creature.target)) {
    return z.send(session, "Nothing by that name is here to study.");
  }
  const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
  await journalStudy(z.env.DB, journal.journalId, tmpl.id);
  (session.studied ??= new Set<string>()).add(tmpl.id); // the chip for this one goes quiet from here on
  // Standing still to watch a thing this close is a risk: if it's a fight, your
  // eyes leave it for a beat.
  let opening = "";
  if (z.inCombat(session)) { session.staggered = true; opening = " Your eyes leave the fight to do it — an opening."; }
  const rows = await journalLoad(z.env.DB, journal.journalId);
  const row = rows.find((r) => r.templateId === tmpl.id);
  const tier = journalTier(row?.kills ?? 0, true, tmpl.level);
  const want = killsForAccount(tmpl.level) - (row?.kills ?? 0);
  z.send(session, `You watch ${tmpl.name} a while and set down what you see.` +
    (tier < 3 ? ` (Its full account wants ${want} more kill${want === 1 ? "" : "s"}.)` : " Its account is complete.") + opening, "study");
  z.roomFeed(session.roomId, `${session.name} watches ${tmpl.name}, taking notes.`, session.pubkey, false);
  z.sendCtx(session); // drop the now-redundant `study` chip without waiting for the next refresh
}

export async function cmdJournal(z: ZoneDO, session: Session): Promise<void> {
  const ids = (await carriedJournals(z, session)).map((b) => b.journalId!);
  // At a gate the lockbox and vault are within reach (the gatehouse is where you
  // sit and READ), so pull the pages straight out of storage if it's not in the
  // pack. Writing still wants it in hand — see cmdStudy; this is a read only.
  if (!ids.length && z.world!.entryRooms.has(session.roomId)) {
    for (const key of ["lockbox", "vault"] as const) {
      const held = await loadContainer(z.env.DB, session.pubkey, key);
      const stored = held.find((c) => c.itemId === JOURNAL_ITEM && c.journalId);
      if (stored?.journalId) { ids.push(stored.journalId); break; }
    }
  }
  if (!ids.length) {
    const where = await whereIsJournal(z, session);
    return z.send(session, where === "stored"
      ? "Your journal's in the lockbox. Fetch it out to read or write in it."
      : "You carry no journal. The keeper sells them, fairly priced.");
  }
  // Every book you hold opens at once — the best account of a creature wins,
  // whichever cover it's written in (someone else's hunting, now yours).
  const byMob = new Map<string, JournalRow>();
  const studied = new Set<string>();
  for (const id of ids) {
    for (const r of await journalLoad(z.env.DB, id)) {
      if (r.studied) studied.add(r.templateId); // free refresh of the chip cache — the rows are already in hand
      const cur = byMob.get(r.templateId);
      const lvl = z.world!.mobTemplates.get(r.templateId)?.level ?? 1;
      const tier = journalTier(r.kills, r.studied, lvl);
      if (!cur || tier > journalTier(cur.kills, cur.studied, lvl)
        || (tier === journalTier(cur.kills, cur.studied, lvl) && r.kills > cur.kills)) {
        byMob.set(r.templateId, r);
      }
    }
  }
  const rows = [...byMob.values()];
  session.studied = studied;
  const world = z.world!;
  const entries = rows
    .map((r) => {
      const tmpl = world.mobTemplates.get(r.templateId);
      if (!tmpl) return null;
      const tier = journalTier(r.kills, r.studied, tmpl.level);
      const e: any = { id: tmpl.id, name: tmpl.name, tier, kills: r.kills, studied: r.studied ? 1 : 0, want: killsForAccount(tmpl.level) };
      if (tier >= 1) { e.nature = creatureNature(tmpl.id); e.note = tmpl.description; }
      if (tier >= 3) {
        // WHAT THE FULL ACCOUNT IS ACTUALLY FOR (2026-08-06). Tier 3 is the most
        // expensive text in the game — study, then three kills on a boss and
        // eight on a rat — and until now it paid out in NUMBERS plus the same
        // creatureNature() sentence tier 1 already gave you, shared between 47
        // templates and 14 behaviour families. So the page you worked for said
        // exactly what every other scavenger's page said.
        //
        // MOB_LORE (detail.ts) is the third thing and the only one of the three
        // that is knowledge: where the creature came from, what it wants, and
        // what the world did to make it. It is the one place the history is
        // allowed to be stated plainly, because you wrote it yourself, in your
        // own book, after learning the animal properly.
        e.lore = MOB_LORE[tmpl.id];
        e.level = tmpl.level;
        e.hp = tmpl.max_hp;
        e.dmg = `${tmpl.dmg_min}–${tmpl.dmg_max}`;
        e.armor = tmpl.armor;
        e.boss = tmpl.is_boss ? 1 : 0;
        const loot = tmpl.loot_item ? world.itemTemplates.get(tmpl.loot_item) : null;
        if (loot) e.loot = loot.name;
      }
      return e;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (b.tier - a.tier) || a.name.localeCompare(b.name));
  try {
    session.ws.send(JSON.stringify({ v: 0, t: "journal", entries }));
  } catch {}
  const many = ids.length > 1;
  z.send(session, entries.length
    ? `You open the journal${many ? "s" : ""}.`
    : `You open the journal${many ? "s" : ""}. ${many ? "Their" : "Its"} pages are blank — study a thing, and kill a few, and ${many ? "they" : "it"} will fill.`);
}

// ---- the engraving: what the steel remembers (077) ----
// The ledger line for a marked piece, read off gear_deeds. Counts framed as
// prose, never a stat block — the dungeon attests it, so it can't be faked,
// farmed, or inflated. A fresh mark reads short; a storied one reads like a
// warning. ("This notched greatsword has 214 kills, went past the black door
// twice, and its last three owners died holding it.")
export async function gearLedger(z: ZoneDO, loreId: string): Promise<string> {
  const d = await deedsLoad(z.env.DB, loreId);
  if (!d) return "";
  const bits: string[] = [];
  if (d.kills > 0) bits.push(`${d.kills} kill${d.kills === 1 ? "" : "s"}`);
  if (d.descents > 0) bits.push(d.descents === 1 ? "one descent past the black door" : `${d.descents} descents past the black door`);
  bits.push(d.owners === 1 ? "one owner" : `${d.owners} owners`);
  if (d.deaths > 0) bits.push(d.deaths === 1 ? "one of them died holding it" : `${d.deaths} died holding it`);
  return ` The gate's mark is cut into it — the ledger reads: ${bits.join("; ")}.`;
}

// ---- what the keeper tells you: the region's story, across the hatch -------
//
// The stories live in zone-data.GATE_TELLINGS, keyed by the REGION OF THE GATE
// ROOM — so the door you ran for decides what you find out. See that block for
// why this is the gatehouse's job and not a set of NPCs standing out in the
// dark, which is where I put it the first time and was wrong.

// Your place in each telling, off the player row: "gate:4,wood:9". Unparseable
// junk decays to "not started", which is the only safe way to fail: a corrupt
// cell costs somebody the top of a story, never a 500.
export function keeperTold(packed: string | null | undefined): Map<string, number> {
  const told = new Map<string, number>();
  for (const part of (packed ?? "").split(",")) {
    const at = part.lastIndexOf(":");
    if (at <= 0) continue;
    const band = part.slice(0, at);
    const n = Number(part.slice(at + 1));
    if (GATE_TELLINGS[band as Region] && Number.isFinite(n) && n >= 0) told.set(band, Math.floor(n));
  }
  return told;
}

function packKeeperTold(told: Map<string, number>): string {
  return [...told].map(([band, n]) => `${band}:${n}`).join(",");
}

// One line of the local story for somebody sitting behind the door. Returns true
// if the keeper spoke, which the caller uses to hold the gatehouse's own
// atmosphere back for that beat — a man talking and the fire settling should
// never arrive on the same breath.
//
// Caller guarantees they are in the gatehouse. session.roomId is still the GATE
// they came in by while they are behind the door (outOfWorld leaves it alone),
// which is exactly the key we want.
export function keeperTells(z: ZoneDO, session: Session, now: number): boolean {
  // Exactly one line per stay behind the door: armed when you come in, spent the
  // moment he uses it. See KEEPER_DELAY_MIN_MS for why this is not a drip.
  if (!session.keeperDueAt || now < session.keeperDueAt) return false;
  const band = z.regionOf(session.roomId);
  const lines = GATE_TELLINGS[band as Region];
  if (!lines?.length) return false; // a band with no telling written yet keeps its own quiet
  const heard = session.keeperTold.get(band) ?? 0;
  // Past the last line he begins again from the top. Not a fallback for running
  // out of content — it is the truest thing about him. He has told this to every
  // wanderer who ever sat here and he will tell it to the next one.
  session.keeperDueAt = 0;
  session.keeperTold.set(band, heard + 1);
  // NOT the "amb" class, even though this rides the ambience beat: the client
  // DROPS every "amb" line while the tutorial guide is up (public.ts), and the
  // index advances server-side either way — a new player at the bench would lose
  // the opening of a story and never know. "study" is the knowledge channel (the
  // milestone register reads on it), is never hushed, and is the honest label.
  z.send(session, lines[heard % lines.length], "study");
  // Written as it is heard: one small update per VISIT, which is as cold as a
  // write gets.
  void setKeeperTold(z.env.DB, session.pubkey, packKeeperTold(session.keeperTold))
    .catch(() => { /* a lost place in a story is not worth a thrown tick */ });
  return true;
}