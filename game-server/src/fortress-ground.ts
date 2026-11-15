// THE FORTRESS AND ITS OPEN GROUND (2026-11-14). The fourth living regions, after the
// mountain, the crossing and the road (living-regions.md). Each room's kind of ground,
// read from its whole text, so an animal settles only where that animal belongs. A
// room can be two kinds. Every room of these regions is listed; test-regressions fails
// on a new room that is not. The open ground names its grass "green" as the mountain
// and the road do, so the goat's rule holds here unchanged.

// THE OPEN GROUND ("out"), round the walls: the burned village, the siege lines, the pits.
//   road    the causeway, the old road, the street and the tracks: nothing settles on it
//   green   grass: the green, the orchard rows, the camp's turf, the fields, the churchyard
//   thorn   the briar, the dead hedges, the trench ends the thorn has taken
//   earth   bare and trodden earth: the siege works, the dug and gnawed ground, the dens
//   graves  the pits, the mass graves, the bone heaps, the gibbet ground
//   rubble  the fallen stone under the walls
//   wet     the fen, the ponds, the drowned orchard, the wet ditches
//   built   under a roof: the charnel, the culver house, the lodging. Nothing settles in it
//   mine    the galleries under the chalk. Nothing settles in it
export const OUT_GROUND: Record<string, string[]> = {
  road: [
    "the-back-lane", "the-causeway", "the-dead-cart-track", "the-old-road", "the-village-street", "weeper-arch",
  ],
  green: [
    "the-camp-graves", "the-camp-ground", "the-camp-midden", "the-camp-tail", "the-church-shell",
    "the-churchyard", "the-crofts", "the-deserters-ditch", "the-dry-moat", "the-field-bank", "the-forage-cut",
    "the-gibbet-field", "the-goose-green", "the-green", "the-horse-lines", "the-orchard-rows",
    "the-picket-ground", "the-plague-tents", "the-siege-bank", "the-tithe-barn", "the-waste-fields",
  ],
  thorn: [
    "the-briar-field", "the-dead-hedge", "the-field-gate", "the-second-trench", "the-thorn-court",
    "the-trench-end", "the-waste-fields", "the-windfall-bank",
  ],
  earth: [
    "the-ash-drifts", "the-battery", "the-bell-pit", "the-burned-village", "the-camp-midden", "the-cart-tip",
    "the-den-mouths", "the-dug-earth", "the-forge-pit", "the-gnawed-ground", "the-laughing-ground",
    "the-old-plough", "the-pound", "the-sap-head", "the-shot-pile", "the-spoil-heap", "the-stray-pound",
    "the-suttlers-row", "the-tipping-edge", "the-toft-ends", "the-trench-end", "the-wash-foot", "the-well-head",
    "the-windfall-bank",
  ],
  graves: [
    "the-bone-fan", "the-bone-heaps", "the-burning-ground", "the-camp-graves", "the-cart-tip", "the-churchyard",
    "the-crossroads-grave", "the-dead-hedge", "the-gibbet-field", "the-hanging-hill", "the-horse-pits",
    "the-last-pit", "the-lime-pits", "the-mass-grave", "the-plague-tents", "the-plague-trench",
    "the-second-trench", "the-skull-mound", "the-sorting-ground", "the-tipping-edge", "the-wash-gully",
  ],
  rubble: [
    "the-gatefall", "the-wall-breach",
  ],
  wet: [
    "the-back-pond", "the-black-fen", "the-deserters-ditch", "the-drowned-orchard", "the-fish-stew",
    "the-sally-ditch", "the-wash-foot",
  ],
  built: [
    "the-charnel", "the-cider-house", "the-culver-house", "the-marshals-lodging", "the-village-smithy",
  ],
  mine: [
    "the-camouflet", "the-mine-gallery", "the-mine-mouth",
  ],
};

// THE KEEP AND THE WARRENS ("upper").
//   halls    the keep's rooms and passages
//   walls    the walls and towers, in the open air
//   warrens  the runs, the burrows and the old mine: the rat king's ground
//   water    standing water: the scullery, the sewer, the sump, the wet runs
//   gate / hideaway  the gates and the boltholes. Nothing settles in them
export const UPPER_GROUND: Record<string, string[]> = {
  halls: [
    "armory", "barracks", "catacomb", "cells", "chapel", "chapter-house", "cistern", "crypt-steps",
    "debtors-pit", "forge", "gallery", "guardroom", "hall", "kennels", "larder", "library", "muster", "ossuary",
    "oubliette", "refectory", "scriptorium", "shrine", "smokehouse", "stair", "the-arming-passage",
    "the-five-ways", "the-fletchery", "the-harness-room", "the-issue-room", "the-long-store", "the-pay-table",
    "the-quartermasters-room", "the-roll-room", "the-sergeants-room", "the-watch-passage", "undercroft",
    "warden-post", "weeper-hall", "well",
  ],
  walls: [
    "the-broken-battlement", "the-leaning-spire", "the-rotted-scaffold", "the-wall-walk", "the-watch-turret",
    "the-weepers-crown",
  ],
  warrens: [
    "the-blind-heading", "the-bone-midden", "the-buried-chapel", "the-crawl-of-teeth", "the-dripping-gallery",
    "the-earth-throat", "the-fallen-props", "the-gnaw-hollow", "the-hoard-hole", "the-hyena-den",
    "the-litter-chamber", "the-old-adit", "the-rat-warren", "the-root-gnawed-run", "the-root-hall",
    "the-scrape", "the-sewer-slip", "the-side-run", "the-undermine", "the-warren-sump", "the-wet-run",
  ],
  water: [
    "scullery", "sewer", "the-dripping-gallery", "the-sewer-slip", "the-warren-sump", "the-wet-run",
  ],
  gate: [
    "gate", "sally-port",
  ],
  hideaway: [
    "a-dry-burrow", "bone-nook", "hollow-crack", "the-bell-cote",
  ],
};

// THE DEEP ("deep"), both slabs: everything under the hatch.
//   dark     dry stone and silt with no light in it
//   water    the flooded halls, the channels, the pools
//   hideaway the boltholes. Nothing settles in them
export const DEEP_GROUND: Record<string, string[]> = {
  dark: [
    "black-threshold", "blackreach", "bone-processional", "bone-reliquary", "carrion-gallery", "deep-ossuary",
    "kings-hoard", "kings-oratory", "root-vault", "silted-stair", "sunless-well", "the-blind-gallery",
    "the-bone-font", "the-bone-organ", "the-bone-sift", "the-bone-vestry", "the-bored-passage",
    "the-breathing-hall", "the-cable-walk", "the-cantors-cells", "the-cantors-door", "the-charnel-chute",
    "the-choir-drain", "the-choir-floor", "the-choir-stair", "the-chute-foot", "the-cold-hearth",
    "the-cold-pantry", "the-cooperage", "the-crawlway", "the-death-cell", "the-descent", "the-drag",
    "the-drain-run", "the-drowning-stair", "the-embalming-room", "the-feeling-wall", "the-flood-mark",
    "the-gasping-dark", "the-gnawed-arch", "the-held-note", "the-kings-stair", "the-lectern-room",
    "the-lightless-march", "the-lock-keepers-room", "the-long-pews", "the-long-swallow", "the-lung-vent",
    "the-marrow-road", "the-marrow-seat", "the-root-shaft", "the-salt-vault", "the-scavengers-shelf",
    "the-scraped-hall", "the-silt-bank", "the-silt-fall", "the-singing-gallery", "the-sluice-gear", "the-sump",
    "the-undertow", "the-wormcast-pit", "worm-cloister",
  ],
  water: [
    "black-canal", "drowned-barracks", "drowned-court", "drowned-nave", "leech-pools", "sunken-gallery",
    "sunken-throne", "the-brine-cellar", "the-chain-well", "the-cistern", "the-drowned-kitchens", "the-eel-run",
    "the-flooded-cloister", "the-gods-pool", "the-silt-bank", "the-silt-chapel", "the-sluice-walk",
    "the-still-cradle", "the-sunk-bell", "the-tide-gate", "the-tide-throat", "the-under-weir",
    "the-waiting-hall", "the-weir", "tide-vault", "weeping-cells",
  ],
  hideaway: [
    "pocket-of-air", "worm-bore",
  ],
};

// The kinds of ground each of these animals will settle on. The draw stays random inside them.
// The goat's own rule ("crag", "green") holds here, as on the road.
export const FORTRESS_SETTLES: [string, string[]][] = [
  ["grave-hyena", ["graves", "earth", "thorn", "warrens"]], // the pits and the camp graves, and the hyena den in the warrens
  ["dire-hyena", ["graves", "earth", "thorn"]],
  ["gibbet-crow", ["graves", "thorn"]],                     // the iron over the graves, and the dead thorn
  ["rat", ["green", "thorn", "earth", "graves", "wet", "rubble", "halls", "water", "dark"]],
  ["fleet-rat", ["green", "thorn", "earth", "graves", "wet", "rubble", "halls", "water", "dark"]],
  ["pale-crawler", ["dark", "water"]],                      // the deep's own dark, wet or dry
  ["skeleton", ["halls", "walls"]],                         // the keep's dead garrison, anywhere it kept
  ["warden", ["halls", "walls"]],
  ["twice-dead", ["dark", "water"]],                        // the deep's dead at work, dry or drowned
  ["marrow-cantor", ["dark"]],                              // the King's choir, in the dark round his court
];
