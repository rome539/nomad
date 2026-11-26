// WHAT THE CAVE UNDER THE WOOD IS MADE OF (2026-11-24). The seventh living region
// (living-regions.md), built with its creatures (cave-plan.md, step three). Each room's
// kind of ground, read from its whole text when its picture ground was chosen
// (zone-data CAVE_RULES), so an animal settles only where that animal belongs. Every
// room is listed; test-regressions fails on a new cave room that is not.

// THE CAVE ("cave").
//   mouth     the six ways in, under the wood's light: nothing settles in them
//   roots     the root hangs and the slope where the wood's roots come through the roof
//   wet       the passages water runs through: the ditch's water, the weeping crawls, the wallow
//   rough     the passages, squeezes, turns and drops of the upper cave
//   gallery   the old water's galleries: sand and silt floors, the sounding rooms
//   bones     where the hunters' leavings lie: the burrow runs, the larder, the kill holes
//   dripstone the flowstone, the curtains, the rimstone and the crystal crawl
//   ledge     the shelves and lips over the Hollow, where a cat lies up
//   hollow    the Hollow itself and the rooms round its floor
//   river     the river and its deep pools, dark and lit
//   foxfire   the wet walls and pools the foxfire grows on
//   roost     the two bat roosts and their guano
//   silk      the spiders' galleries
//   workings  the diggers' road: the props, the pick-work, the carried stone
//   camp      the diggers' three camps and their stopping
//   dry       the dry stretches where nothing glows
//   stone     the dressed stone: the road, the halls, the brood's ground, the Ring of Nine
//   buried    the stone under the diggers' spoil or a fall of rock
//   drowned   the stone under standing water
//   under     the under-stone, behind the breathing stone: nothing settles in it
export const CAVE_GROUND: Record<string, string[]> = {
  mouth: [
    "the-ditch-sink", "the-root-fall", "the-heave", "the-break-pool", "the-spring-throat", "the-fern-hole",
  ],
  roots: [
    "the-root-hang", "the-root-curtain", "the-taproot", "the-root-chimney", "the-rubble-slope",
  ],
  wet: [
    "the-ditch-water", "the-silted-pipe", "the-wet-passage", "the-weeping-crawl", "the-bears-wallow",
    "the-slick", "the-wet-step", "the-sound-hole",
  ],
  rough: [
    "the-wind-crawl", "the-breakdown", "the-north-squeeze", "the-dripping-ledge", "the-cold-draught",
    "the-scored-wall", "the-blind-turn", "the-clay-slide", "the-hounds-bed", "the-rattling-way",
    "the-loose-stones", "the-bat-chimney", "the-narrow-neck", "the-drag-way", "the-bears-stair",
    "the-cold-breath", "the-whistling-hole", "the-bear-path", "the-scored-drop", "the-dark-turn",
    "the-narrows", "the-shaft-head", "the-hauled-way", "the-low-arch", "the-tight-bend",
  ],
  gallery: [
    "the-pawed-sand", "the-four-ways", "the-echo-gallery", "the-sounding-room", "the-shale-floor",
    "the-sand-floor", "the-west-gallery", "the-ox-bow", "the-old-water-line", "the-dry-sink", "the-sand-bank",
    "the-listening-floor",
  ],
  bones: [
    "the-rat-run", "the-rat-shelf", "the-gnawed-floor", "the-bone-spill", "the-gnaw-hole",
    "the-cougars-larder", "the-claw-floor", "the-kill-hole",
  ],
  dripstone: [
    "the-drip-stones", "the-rimstone", "the-calcite-crawl", "the-flowstone", "the-curtains",
  ],
  ledge: [
    "the-lip", "the-overhang", "the-thin-ledge", "the-cats-lie",
  ],
  hollow: [
    "the-scree-slope", "the-hollow", "the-fallen-slab", "the-under-ledge", "the-hollows-throat",
    "the-cold-well", "the-split-floor",
  ],
  river: [
    "the-sump-mouth", "the-black-water", "the-under-pool", "the-deep-pool", "the-rapids", "the-falls-foot",
    "the-river-turn", "the-low-roof", "the-silt-banks", "the-spring-foot", "the-cold-sand", "the-glow-reach",
    "the-starry-roof", "the-river-shingle", "the-river-bend", "the-diggers-bridge", "the-deep-run",
    "the-ford", "the-long-pool", "the-river-shelf", "the-narrowing", "the-falls-pool", "the-glow-tunnel",
    "the-wide-water", "the-still-reach", "the-rising-water", "the-under-spring", "the-salamander-pools",
  ],
  foxfire: [
    "the-foxfire-wall", "the-foxfire-cut", "the-weeping-wall", "the-seep-hall", "the-shaft-foot",
    "the-wet-ledge", "the-glow-crawl", "the-pale-pools", "the-foxfire-hall", "the-blue-passage",
    "the-lit-steps", "the-spring-gallery",
  ],
  roost: [
    "the-roost-water", "the-guano-slope", "the-north-roost", "the-bat-way", "the-roost-edge",
    "the-east-roost", "the-roost-floor", "the-guano-banks",
  ],
  silk: [
    "the-silk-hall", "the-wrapped-things", "the-hanging-silk", "the-spiders-gallery", "the-egg-sacs",
  ],
  workings: [
    "the-smoked-passage", "the-ladder-foot", "the-pick-work", "the-lamp-store", "the-tally-wall",
    "the-barrow-run", "the-propped-way", "the-sagging-props", "the-stone-store", "the-widened-squeeze",
    "the-water-butts", "the-carry-way", "the-mortar-trough", "the-pick-marks", "the-carried-stone",
    "the-diggers-stair", "the-bridge-end", "the-crushed-props", "the-cut-through", "the-broken-ladder",
    "the-wet-cut", "the-crossed-ways", "the-well-foot", "the-dry-stretch",
  ],
  camp: [
    "the-first-camp", "the-cold-camp", "the-sleeping-shelf", "the-first-stopping", "the-stopping",
    "the-deep-camp",
  ],
  dry: [
    "the-dark-stretch", "the-dry-gallery", "the-dead-glow", "the-well-passage", "the-black-crawl",
    "the-dry-pools", "the-glass-pool", "the-old-sink",
  ],
  stone: [
    "the-stair-foot", "the-first-flags", "the-straight-way", "the-cold-road", "the-cross-hall",
    "the-long-flags", "the-sunk-flags", "the-cleared-way", "the-south-road", "the-near-sink", "the-west-door",
    "the-north-steps", "the-cold-passage", "the-hum", "the-ante-room", "the-ring-door", "the-cold-pit",
    "the-pale-steps", "the-carved-rings", "the-quiet-way", "the-south-cell", "the-east-hall", "the-east-way",
    "the-cold-cell", "the-sheet-water", "the-east-road", "the-east-steps", "the-side-arch",
    "the-pillared-way", "the-pillar-hall", "the-south-hall", "the-bone-pillars", "the-pillared-east",
    "the-ring-of-nine", "the-west-hall", "the-brood-way", "the-brood-nests", "the-cracked-flags",
    "the-pale-walls", "the-sleepers-door", "the-back-way", "the-groove", "the-worn-hollow",
  ],
  buried: [
    "the-spoil-heaps", "the-last-heading", "the-rock-fall", "the-sink-foot", "the-buried-hall",
  ],
  drowned: [
    "the-black-water-hall", "the-drowned-flags",
  ],
  under: [
    "the-under-steps", "the-low-gallery-under", "the-shelved-room", "the-box-chamber", "the-worn-floor",
    "the-faces-down", "the-open-joint",
  ],
};

// The kinds of ground each of the cave's roaming animals will settle on. The draw stays
// random inside them. The cougars and the hounds keep to the upper cave, the salamanders
// to the water, the spiders to the silk and the roosts, the bats to the high roofs and the river, and the
// grubbets to where the hunters' leavings, the diggers' camps and the guano are.
export const CAVE_SETTLES: [string, string[]][] = [
  ["cave-cougar", ["ledge", "hollow", "bones", "rough", "dripstone", "gallery"]],
  ["mole-hound", ["gallery", "rough", "bones", "hollow", "roots"]],
  ["grubbet", ["bones", "camp", "roost", "buried", "workings"]],
  ["pale-salamander", ["river", "foxfire", "wet"]],
  ["cave-spider", ["silk", "roost", "dripstone", "ledge", "hollow", "foxfire"]], // its silk, and the roofs and wet walls (2026-11-24: six homes four apart)
  ["cave-bat", ["roost", "dripstone", "gallery", "ledge", "hollow", "river"]], // any high roof, and over the river where the midges are
  ["polecat", ["bones", "rough", "roots", "gallery"]], // the holes in the rock round the grubbets
  ["cave-crayfish", ["river"]],
  ["stone-mites", ["stone", "buried"]],             // the joints of the dressed stone
  ["digger", ["workings", "camp"]],                  // the dead at the work: their road and their camps (2026-11-25)
];
