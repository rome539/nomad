// WHAT YOU WOULD HEAR STANDING HERE (rome, 2026-10-13). The page makes every
// sound itself, out of oscillators and filtered noise; all it needs from the
// world is a few plain facts about the place, and this is where they are
// decided. It rides the status frame as `amb`, and the tick pushes a fresh
// frame whenever it changes under someone standing still - the same way the
// sky does - so the rain is heard arriving, not on the next command.
//
// Nothing here is news. Every field is something the room's prose or the
// weather lines already say out loud; the sound only says it again.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import {
  OUTDOOR_ROOMS, SCREE_ROOMS, SPATE_ROOMS, ROAD_FORDS, FEN_ROOMS, SEA_ROOMS,
  GROUNDS_ROOMS, OVERWORKS_ROOMS, WARRENS_ROOMS, DEEP_ROOMS, INDOOR_ROOMS, OUTDOOR_REGIONS,
} from "./zone-data";
import * as events from "./events";
import * as lore from "./lore";

// THE PLACES THAT CREAK: built of timber, and saying so. Picked from the room
// ids and the prose (hulls, piers, lofts, huts, gibbets, scaffolds). A stand
// in the wood is only listed when it is a built one; the wood's living trees
// creak through the wind rule below instead. Add a room here and it creaks.
export const CREAK_ROOMS = new Set<string>([
  "the-rotted-scaffold", "the-bell-cote", "the-undermine",
  "the-crooked-gibbet", "the-hanging-hill", "the-gibbet-field",
  "the-tithe-barn",
  "the-charcoal-hut", "the-withy-hut", "the-hunters-stand", "the-fish-house",
  "the-reeves-loft", "the-lodge-loft", "the-mill", "the-black-hut",
  "the-plank-bridge", "the-carters-rest", "the-mill-loft", "the-drowned-mill",
  "the-plank-crossing", "the-herds-hut", "the-winding-house", "the-ditch-end",
  "the-rush-shore",
  "the-ferry-house", "the-ferry-boat", "the-wreck-ribs", "the-boat-graves",
  "the-boat-house", "the-first-pier", "the-second-pier", "the-third-pier",
  "the-fourth-pier", "the-pier-foot", "the-plank-span", "the-plank-run",
  "the-rope-bridge", "the-scaffold-stub", "the-gap", "the-signal-mast",
  "the-oar-store", "the-hurdle-store", "the-hook-hut", "the-eel-hut",
  "the-net-loft", "the-cart-shed", "the-tar-shed", "the-salt-store",
  "the-drying-frames", "the-starling", "the-creek-crossing",
]);

// WATER AND FIRE, ROOM BY ROOM, from what each room's own description says.
// Every id below was read, not matched: a dry stream bed, a "river of blocks",
// a wind that "streams" and a cold hearth full of nettles are all left out.
// A rule by band was tried first and was wrong both ways - every room of the
// deep dripped (a dry burrow, the king's hoard) and thirty-three rooms with a
// beck in them were silent.
//
// Running water you can hear. The spate, ford and fen sets are added to this.
export const RUN_ROOMS = new Set<string>([
  // the road's beck, mill and gill
  "the-shallow-ford", "the-plank-bridge", "the-broken-culvert", "the-drowned-ford", "the-postern-ditch",
  "the-drain-mouth", "the-culvert", "the-beck-mouth", "the-trap-line", "the-mill-leat", "the-drowned-mill",
  "the-tail-race", "the-osier-island", "the-hatchpool", "the-plank-crossing", "the-gill-pot", "the-rowan-gill",
  "the-shepherds-ford", "the-beck-head", "the-beck-lane", "the-otter-holt", "the-flood-mead", "the-spring-line",
  "the-beck-stair", "the-well-house",
  // the dens' mill
  "the-mill-dam", "the-mill", "the-wheel-pit",
  // the mountain's burns
  "the-lower-beck", "the-alder-thicket", "the-clapper", "the-beck-narrows", "the-water-slide", "the-gravel-race",
  "the-fallen-birch", "the-force-pool", "the-glacier-mouth", "the-hidden-burn", "the-cut", "the-pothole", "the-sink",
  "the-water-notch", "the-valley-mouth", "the-far-shore-high", "the-valley-head", "the-braided-flats", "the-till",
  "the-step-in-the-floor", "the-blue-wall", "the-lower-fan", "the-moulin", "the-beck-fork", "the-water-lip",
  "the-melt-runnel", "the-melt-run",
  // the deep's moving water
  "the-eel-run",
]);
// ...and water that is ALWAYS loud: falls, races, an open sluice.
export const FALLS_ROOMS = new Set<string>([
  "the-force", "the-lower-force", "the-upper-force", "the-dam-walk", "the-hanging-wood", "the-gill-narrows",
  "the-gill-foot", "the-stepping-stones", "the-resurgence", "the-weir",
]);
// The sea, beyond the crossing (where every open room is on the tide already).
export const SHORE_ROOMS = new Set<string>(["the-burn-mouth", "the-cobble-bank"]);
// Water in the dark: dripping, standing, sweating out of the walls.
export const DRIP_ROOMS = new Set<string>([
  "sewer", "weeper-hall", "scullery", "well",
  "the-descent", "drowned-nave", "black-canal", "sunken-gallery", "weeping-cells", "sunken-throne",
  "drowned-barracks", "leech-pools", "tide-vault", "the-cistern", "drowned-court", "the-tide-gate",
  "the-under-weir", "the-breathing-hall", "the-tide-throat", "the-silt-chapel", "the-still-cradle",
  "the-sluice-walk", "the-chain-well", "the-flooded-cloister", "the-sunk-bell", "the-silt-bank",
  "the-drowned-kitchens", "the-cold-pantry", "the-lock-keepers-room", "the-sluice-gear", "the-flood-mark",
  "the-choir-drain", "the-drain-run", "the-kings-stair", "the-waiting-hall", "the-gods-pool",
  "the-dripping-gallery", "the-sewer-slip", "pocket-of-air", "the-long-swallow", "the-sump",
  // the crossing's sea cave: the tide is in there, but what you hear inside
  // is it dripping off the roof (rome, 2026-10-13)
  "the-sea-cave", "the-sand-crawl", "the-drowned-chamber", "the-weed-gallery", "the-blowhole",
  "the-fallen-roof", "the-salt-pool",
]);
// UNDER STONE, with or without water: the hollow tone of a room with a great
// deal of rock around it. The deep, the warrens and the keep's own halls have
// it by band; these are the rooms elsewhere that are cut into the ground.
export const HOLLOW_ROOMS = new Set<string>(["the-kept-room", "the-mine-gallery", "the-camouflet", "the-last-shelter"]);
// A fire actually burning. Twenty-five rooms have a hearth; this is the one
// whose prose says it is lit. The gatehouse's own hearth is `inside`.
export const FIRE_ROOMS = new Set<string>(["the-shieling"]);

export interface Soundscape {
  rain: number;    // 0 none, 1 a shower, 2 settled rain
  roof: number;    // 1 = the rain is on a roof over you, not on you
  shut: number;    // 1 = walls around you: the wind is heard through them
  wind: number;    // 0 still air .. 3 a gale
  creak: number;   // 1 = timber around you that talks
  fire: number;    // 1 = a hearth in the room
  water: string;   // "" | "surf" | "run" | "drip"
  loud: number;    // 1 = that water is up (the sea over the road, the ford in spate)
  ground: string;  // what a footstep lands in: "" | "mud" | "snow" | "scree" | "wet"
  hollow: number;  // 1 = under stone: the low tone of a buried room
}

// THE PLACE AND ITS WEATHER, as plain facts. Split from the world on purpose:
// the local preview (scripts/serve-preview.mjs) runs this same function off
// the room table, so what plays there is what a player standing in that room
// hears, not a copy of the rules.
export interface Place {
  roomId: string;
  band: string;    // the map region (lore.mapRegionOf)
  open: boolean;   // under the sky (OUTDOOR_ROOMS)
  inside: boolean; // behind the gatehouse door
}
export interface Weather {
  rain: number;    // 0 none, 1 a shower, 2 settled - the world's, before any roof
  windUp: boolean; // the wind event is blowing
  snow: boolean;   // snow lies here
  mud: boolean;    // the ground is mud after rain
  seaUp: boolean;  // the sea is over this room
  runUp: boolean;  // this ford, beck or fen is in spate
}

export function soundscapeOf(p: Place, w: Weather): Soundscape {
  const { roomId, band, open, inside } = p;
  const sunless = band === "deep" || band === "warrens";
  // no rain is heard through solid rock: the deep, the warrens, and a room cut
  // into the hill (an open hole like the Last Shelter still hears it)
  const rain = sunless || (!open && HOLLOW_ROOMS.has(roomId)) ? 0 : w.rain;
  let wind = 0;
  if (open) {
    wind = band === "mountain" || band === "sky" ? 2 : 1;
    if (w.windUp) wind = 3;
    else if (rain || w.snow) wind = Math.min(3, wind + 1);
  } else if (!sunless && w.windUp) {
    wind = 1; // a gale outside is still heard through the walls
  }
  const seaUp = !inside && w.seaUp;
  const runUp = !inside && w.runUp;
  const falls = FALLS_ROOMS.has(roomId);
  const water = inside ? ""
    : DRIP_ROOMS.has(roomId) ? "drip"
    : SEA_ROOMS.has(roomId) || SHORE_ROOMS.has(roomId) || (open && band === "crossing") ? "surf"
    : falls || RUN_ROOMS.has(roomId) || SPATE_ROOMS.has(roomId) || ROAD_FORDS.has(roomId) || FEN_ROOMS.has(roomId) ? "run"
    : "";
  return {
    rain,
    roof: rain && !open ? 1 : 0,
    shut: open ? 0 : 1,
    wind,
    creak: inside || CREAK_ROOMS.has(roomId) || (open && band === "wood" && wind >= 2) ? 1 : 0,
    fire: inside || FIRE_ROOMS.has(roomId) ? 1 : 0,
    water,
    loud: seaUp || runUp || (falls && !inside) ? 1 : 0,
    ground: inside ? ""
      : seaUp || runUp ? "wet"
      : w.snow ? "snow"
      : SCREE_ROOMS.has(roomId) ? "scree"
      : w.mud || (rain && open) ? "mud"
      : "",
    hollow: !inside && (HOLLOW_ROOMS.has(roomId) || (!open && (sunless || band === "upper"))) ? 1 : 0,
  };
}

// A PLACE FROM A BARE ROOM ROW, for tools with no world running (the preview).
// It repeats two readings the world makes at load: lore.mapRegionOf for the
// band, and the OUTDOOR_ROOMS fold in zone.ts init() for the sky. If either of
// those changes, change this with it.
export function placeOfRow(row: { id: string; region?: string | null; is_entry?: number | null }): Place {
  const id = row.id, region = row.region || "", entry = row.is_entry === 1;
  const band = region || (entry ? "gate"
    : GROUNDS_ROOMS.has(id) ? "out" : OVERWORKS_ROOMS.has(id) ? "sky" : WARRENS_ROOMS.has(id) ? "warrens"
    : DEEP_ROOMS.has(id) ? "deep" : "upper");
  const open = entry || (!INDOOR_ROOMS.has(id) && (OUTDOOR_REGIONS.has(region) || GROUNDS_ROOMS.has(id) || OVERWORKS_ROOMS.has(id)));
  return { roomId: id, band, open, inside: false };
}

export function soundscapeFor(z: ZoneDO, s: Session): Soundscape {
  const roomId = s.roomId;
  const inside = z.outOfWorld(s);
  const rainState = z.events.get("rain");
  return soundscapeOf(
    { roomId, band: lore.mapRegionOf(z, roomId), open: !inside && OUTDOOR_ROOMS.has(roomId), inside },
    {
      rain: rainState?.phase !== "active" ? 0 : rainState.data === "settled" ? 2 : 1,
      windUp: events.phaseOf(z, "wind") === "active",
      snow: events.snowed(z, roomId),
      mud: events.muddy(z, roomId),
      seaUp: events.seaUnder(z, roomId),
      runUp: events.fordUp(z, roomId) || events.spated(z, roomId) || events.fenUp(z, roomId),
    });
}

// One short string per soundscape, so the tick can tell a change with a compare.
export function soundKey(a: Soundscape): string {
  return `${a.rain}${a.roof}${a.shut}${a.wind}${a.creak}${a.fire}${a.water}${a.loud}${a.ground}${a.hollow}`;
}
