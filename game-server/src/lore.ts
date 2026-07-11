// Knowledge-as-loot, out of the spine: the copyist's maps and the hunter's
// journal (study + blood fill the bestiary). zone.ts keeps the instanced-floor
// plumbing (journals dropping/lifting rides the get/drop/death paths); this
// file owns what the knowledge SAYS and how it reaches the client.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import type { CarriedItem } from "./world";
import { journalLoad, journalStudy, loadContainer } from "./world";
import { hashSeed, mulberry32, nameMatches } from "./zone-util";
import {
  MAP_ITEMS, DETAILED_MAP, CRUDE_DROP_ROOM, CRUDE_BAD_EXIT,
  GROUNDS_ROOMS, OVERWORKS_ROOMS, WARRENS_ROOMS, JOURNAL_ITEM,
  THIEVES, RUNNERS, BROODERS, SENTINELS, DROWNERS, LURKERS, CORRODERS,
  REVENANTS, AGGRO_SCAVENGERS, SCAVENGERS, PATROLS, LISTENERS, HOLLOW,
} from "./zone-data";

// ---- maps: open a chart you carry (the modal draws it) ----

export function cmdMap(z: ZoneDO, session: Session, arg: string): void {
  const maps = session.items.filter((c) => MAP_ITEMS.has(c.itemId));
  if (!maps.length) {
    return z.send(session, "You carry no map. The keeper sells them — a true one dear, a crude one cheap.");
  }
  // Name one, or default to the best you hold (a true map over a crude one).
  let carried = arg ? maps.find((c) => nameMatches(z.world!.itemTemplates.get(c.itemId)!.name, arg)) : null;
  if (!carried) carried = maps.find((c) => c.itemId === DETAILED_MAP) ?? maps[0];
  const detailed = carried.itemId === DETAILED_MAP;
  sendMap(z, session, carried, detailed);
  z.send(session, detailed
    ? "You unroll the surveyor's map. Every hall is on it, set down true."
    : "You unfold the crude map. Some of these ways are right. Trust it at your peril.");
}

// Build and send the map frame. A detailed map is the true graph and lights
// its rooms 'known' on the HUD; a crude map is deterministically lied — some
// rooms missing, some exits wrong — seeded off the book so it's consistently
// (not randomly) wrong, and it reveals nothing it can be trusted on.
function sendMap(z: ZoneDO, session: Session, carried: CarriedItem, detailed: boolean): void {
  const world = z.world!;
  const rnd = detailed ? null : mulberry32(hashSeed(carried.rowId));
  const roomIds = [...world.rooms.keys()];
  // Which rooms make it onto a crude map: the gates and where you stand always
  // do; the rest are a coin-weighted omission.
  const shown = new Set<string>();
  for (const id of roomIds) {
    if (detailed || z.regionOf(id) === "gate" || id === session.roomId || rnd!() >= CRUDE_DROP_ROOM) {
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
  };
  // Display grouping only — the sim's regionOf (chest tiers etc.) still reads
  // these blocks as "upper". The map just names where you're standing honestly.
  const mapRegionOf = (id: string): string =>
    // A gate reads as a gate wherever it stands — the waystation sits in the
    // open ground but its tile is gold, or the map would hide the bank.
    z.regionOf(id) === "gate" ? "gate"
      : GROUNDS_ROOMS.has(id) ? "out" : OVERWORKS_ROOMS.has(id) ? "sky" : WARRENS_ROOMS.has(id) ? "warrens" : z.regionOf(id);
  for (const id of shown) {
    const room = world.rooms.get(id)!;
    const realExits = world.exits.get(id) ?? [];
    const exits: { dir: string; to: string; toName: string }[] = [];
    for (const e of realExits) {
      if (!detailed) {
        if (rnd!() < CRUDE_BAD_EXIT) {
          // A lie: half the time the exit's simply missing, half the time it
          // points at the wrong room (one that's on this map).
          if (rnd!() < 0.5) continue;
          const others = [...shown].filter((r) => r !== id);
          const wrong = others[Math.floor(rnd!() * others.length)] ?? e.to_room;
          exits.push({ dir: e.dir, to: wrong, toName: world.rooms.get(wrong)?.name ?? "somewhere" });
          continue;
        }
      }
      exits.push({ dir: e.dir, to: e.to_room, toName: world.rooms.get(e.to_room)?.name ?? e.to_room });
    }
    regions[mapRegionOf(id)].rooms.push({ id, name: room.name, exits, here: id === session.roomId });
  }
  try {
    session.ws.send(JSON.stringify({
      v: 0, t: "map", detailed: detailed ? 1 : 0, here: session.roomId,
      // A true map is knowledge you keep: its rooms light gold on the HUD. A
      // crude one reveals nothing it can be trusted on.
      reveal: detailed ? [...shown].map((id) => world.rooms.get(id)!.name) : [],
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
  if (DROWNERS.has(id)) return "A drowned thing. It holds its patch of water and seizes what wades in.";
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

function journalTier(kills: number, studied: boolean): number {
  if (studied && kills >= 3) return 3; // the full account
  if (kills >= 1) return 2;            // a rough read, from the killing
  if (studied) return 1;              // habits only, from watching
  return 0;
}

// A journal must be IN HAND to write in — its pages, not your memory, do the
// remembering. It's safe to leave it in the lockbox between hunts; you just
// can't log a thing while it's locked away. Returns where the nearest one is.
async function whereIsJournal(z: ZoneDO, session: Session): Promise<"hand" | "stored" | "none"> {
  if (session.items.some((c) => c.journalId || c.itemId === JOURNAL_ITEM)) return "hand";
  for (const key of ["lockbox", "vault"] as const) {
    const held = await loadContainer(z.env.DB, session.pubkey, key);
    if (held.some((c) => c.itemId === JOURNAL_ITEM)) return "stored";
  }
  return "none";
}

export async function cmdStudy(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const journal = session.items.find((c) => c.journalId);
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
  // Standing still to watch a thing this close is a risk: if it's a fight, your
  // eyes leave it for a beat.
  let opening = "";
  if (z.inCombat(session)) { session.staggered = true; opening = " Your eyes leave the fight to do it — an opening."; }
  const rows = await journalLoad(z.env.DB, journal.journalId);
  const row = rows.find((r) => r.templateId === tmpl.id);
  const tier = journalTier(row?.kills ?? 0, true);
  z.send(session, `You watch ${tmpl.name} a while and set down what you see.` +
    (tier < 3 ? ` (Its full account wants ${3 - (row?.kills ?? 0)} more kill${3 - (row?.kills ?? 0) === 1 ? "" : "s"}.)` : " Its account is complete.") + opening, "study");
  z.roomFeed(session.roomId, `${session.name} watches ${tmpl.name}, taking notes.`, session.pubkey);
}

export async function cmdJournal(z: ZoneDO, session: Session): Promise<void> {
  const journal = session.items.find((c) => c.journalId);
  if (!journal?.journalId) {
    const where = await whereIsJournal(z, session);
    return z.send(session, where === "stored"
      ? "Your journal's in the lockbox. Fetch it out to read or write in it."
      : "You carry no journal. The keeper sells them, fairly priced.");
  }
  const rows = await journalLoad(z.env.DB, journal.journalId);
  const world = z.world!;
  const entries = rows
    .map((r) => {
      const tmpl = world.mobTemplates.get(r.templateId);
      if (!tmpl) return null;
      const tier = journalTier(r.kills, r.studied);
      const e: any = { id: tmpl.id, name: tmpl.name, tier, kills: r.kills, studied: r.studied ? 1 : 0 };
      if (tier >= 1) { e.nature = creatureNature(tmpl.id); e.note = tmpl.description; }
      if (tier >= 3) {
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
  z.send(session, entries.length
    ? "You open the journal."
    : "You open the journal. Its pages are blank — study a thing, and kill a few, and it will fill.");
}
