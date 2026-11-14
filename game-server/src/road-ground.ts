// WHAT THE ROAD IS MADE OF (2026-11-13). The third living region, after the mountain
// and the crossing (living-regions.md). Each room's kind of ground, read from its whole
// text, so an animal settles only where that animal belongs. A room can be two kinds.
// Every room of the road is listed; test-regressions fails on a new room that is not.
// The goat and the raven live on the mountain too, so the road names its grass and its
// rock as the mountain does ("green", "crag") and their settling rules hold on both.
//   road    the paving and the made track: nothing settles on it
//   lane    the hedged, sunken and green lanes, the thorn and gorse tunnels, the paths
//   green   grass, heath, heather, common, the drove's grazing, the folds and stances
//   crag    the scarp and its faces, the cuttings, the quarry, scree, the gill walls
//   water   the beck, its fords, pools and races, the ponds and the drains that run
//   wet     fen, reed, rush, peat, carr and the levels: ground that is mostly water
//   wood    trees: the hanging woods, the alders, the avenues, the wood's own edge
//   built   under a roof: huts, sheds, the mill, the posts. Nothing settles in it
//   graves  the roadside graves and the pit's ground. Nothing settles on it
export const ROAD_GROUND: Record<string, string[]> = {
  road: [
    "the-ash-verge", "the-broken-axle", "the-broken-cross", "the-broken-culvert", "the-broken-paving",
    "the-cart-road", "the-cattle-grid", "the-chalk-cut", "the-crooked-gibbet", "the-crooked-mile", "the-culvert",
    "the-cut-bank", "the-cutting", "the-drovers-turn", "the-drowned-ford", "the-drowned-milestone", "the-dry-well",
    "the-east-paving", "the-eighth-milestone", "the-elder-hedge", "the-elm-avenue", "the-fallen-avenue",
    "the-fallen-elm", "the-far-shore-stone", "the-fifth-milestone", "the-first-hairpin", "the-first-milestone",
    "the-hawthorn-narrows", "the-hollow-elm", "the-hollow-way", "the-last-paving", "the-long-rise",
    "the-long-straight", "the-mustering-yard", "the-old-boundary", "the-open-heath", "the-open-stretch",
    "the-paving-end", "the-quarry-turn", "the-rain-shadow", "the-relay-house", "the-road-kiln", "the-saddle-gap",
    "the-scarp-foot", "the-second-hairpin", "the-second-milestone", "the-seventh-milestone", "the-shallow-ford",
    "the-sixth-milestone", "the-smithy-ruin", "the-sunken-lane", "the-third-hairpin", "the-third-milestone",
    "the-thorn-gap", "the-toll-stone", "the-tollkeepers-ruin", "the-track", "the-verge-shrine", "the-weed-paving",
    "the-weighbridge", "the-wind-row",
  ],
  lane: [
    "the-bank-and-ditch", "the-beck-lane", "the-beck-stair", "the-blackthorn-lane", "the-coffin-stone",
    "the-deep-lane", "the-drove-green", "the-drove-mouth", "the-drovers-spring", "the-faggot-stack",
    "the-fuel-road", "the-gorse-break", "the-gorse-tunnel", "the-green-lane", "the-grid-drop", "the-grid-lane",
    "the-haul-road", "the-hawthorn-narrows", "the-hedge-gap", "the-high-gorse", "the-high-lane", "the-hollow-lane",
    "the-hollow-oak", "the-holloway", "the-holly-bank", "the-holly-scarp", "the-lych-way", "the-peat-road",
    "the-peat-track", "the-rutted-track", "the-sheep-creep", "the-sledge-track", "the-spoil-banks",
    "the-steep-pitch", "the-sunken-drove", "the-thorn-lane", "the-wood-gate",
  ],
  green: [
    "the-bank-and-ditch", "the-bent-thorn", "the-bothy-spring", "the-boundary-cairn", "the-boundary-dyke",
    "the-bracken-hillside", "the-broken-fold", "the-brow-path", "the-burnt-brake", "the-burnt-farmstead",
    "the-cairn-shoulder", "the-cattle-stance", "the-common-boundary", "the-cross-field", "the-dewpond",
    "the-drove-green", "the-drove-head", "the-drove-pound", "the-drovers-cairn", "the-drovers-stance",
    "the-fallen-crag", "the-fallen-dyke", "the-first-fold", "the-first-oaks", "the-first-sight",
    "the-flood-mead", "the-grave-verge", "the-hanging-fold", "the-hare-ground", "the-heather-bench",
    "the-high-common", "the-high-gorse", "the-high-lane", "the-high-verge", "the-hill-gate", "the-hut-yard",
    "the-lapwing-flat", "the-lapwing-ground", "the-marker-stone", "the-marl-hole", "the-moor-gate",
    "the-open-heath", "the-peat-track", "the-pinfold", "the-rain-shadow", "the-rush-levels", "the-saddle-gap",
    "the-scarp-top", "the-scree-turn", "the-sheep-fold", "the-sheep-scrape", "the-sheep-trod", "the-sheepwalk",
    "the-shepherds-ruin", "the-spoil-banks", "the-spring-bank", "the-spring-line", "the-stony-rise",
    "the-thorn-drop", "the-tinkers-camp", "the-top-wall", "the-tops", "the-turf-stack-ruin", "the-under-scarp",
    "the-wall-end", "the-waste-foot", "the-watershed", "the-west-brow", "the-wether-fold", "the-wether-slope",
    "the-wind-scoured-ridge", "the-wood-bank",
  ],
  crag: [
    "the-beck-gully", "the-beck-mouth", "the-beggars-hollow", "the-chalk-cut", "the-crag-foot", "the-cut-bank",
    "the-cutting", "the-cutting-ledge", "the-fall-shelter", "the-fallen-crag", "the-first-hairpin",
    "the-flooded-quarry", "the-force", "the-gill-foot", "the-gill-narrows", "the-gill-pot", "the-gully-steps",
    "the-holly-scarp", "the-quarry-turn", "the-raven-rock", "the-rope-post", "the-rowan-gill", "the-scarp-foot",
    "the-scarp-spring", "the-scarp-top", "the-scree-run", "the-scree-turn", "the-second-hairpin",
    "the-shelter-stone", "the-third-hairpin", "the-thorn-drop", "the-under-scarp",
  ],
  water: [
    "the-alder-gill", "the-beck-ford", "the-beck-head", "the-beck-lane", "the-beck-mouth", "the-bittern-pool",
    "the-bothy-spring", "the-cattle-drink", "the-culvert", "the-dam-walk", "the-dewpond", "the-drain-mouth",
    "the-drovers-spring", "the-drowned-ford", "the-drowned-mill", "the-eel-traps", "the-fen-gut",
    "the-flood-mead", "the-flooded-quarry", "the-force", "the-gill-foot", "the-gill-narrows", "the-gill-pot",
    "the-gully-mouth", "the-gully-steps", "the-hanging-wood", "the-hatchpool", "the-heron-stand",
    "the-marl-hole", "the-mill-leat", "the-millpond", "the-old-drain", "the-open-water", "the-osier-island",
    "the-osier-landing", "the-otter-holt", "the-plank-bridge", "the-plank-crossing", "the-rowan-gill",
    "the-scarp-spring", "the-shallow-ford", "the-shepherds-ford", "the-stepping-stones", "the-tail-race",
    "the-trap-line",
  ],
  wet: [
    "the-bittern-pool", "the-cattle-causey", "the-causey-foot", "the-dead-alders", "the-ditch-end",
    "the-drowned-hurdles", "the-drowned-milestone", "the-fen-edge", "the-fen-gut", "the-gully-mouth",
    "the-high-shelf", "the-lapwing-flat", "the-lapwing-ground", "the-marsh-sill", "the-moss-path",
    "the-old-drain", "the-osier-landing", "the-peat-cuts", "the-peat-cuttings", "the-peat-road",
    "the-postern-carr", "the-postern-ditch", "the-quaking-flat", "the-reed-edge", "the-reed-path",
    "the-rush-ground", "the-rush-levels", "the-rush-shore", "the-seep-edge", "the-sinking-path",
    "the-spring-line", "the-spring-line-oaks", "the-sunken-alders", "the-turf-road", "the-turf-stack-ruin",
    "the-turf-stacks", "the-tussock-ford", "the-waste-foot", "the-wet-furlong", "the-wet-margin",
    "the-willow-holt-edge", "the-willow-landing", "the-withy-beds",
  ],
  wood: [
    "the-alder-gill", "the-dead-alders", "the-elm-avenue", "the-fallen-avenue", "the-first-oaks",
    "the-gap-in-the-trees", "the-hanger", "the-hanging-wood", "the-hollow-oak", "the-lych-way",
    "the-postern-carr", "the-seep-edge", "the-spring-line-oaks", "the-sunken-alders", "the-wet-margin",
    "the-willow-landing", "the-withy-beds", "the-wood-bank", "the-wood-gate",
  ],
  built: [
    "the-carters-rest", "the-drowned-mill", "the-herds-hut", "the-mill-loft", "the-oak-hollow", "the-peat-house",
    "the-roadwarden-post", "the-shepherds-bothy", "the-wayside-shelter", "the-well-house", "the-winding-house",
  ],
  graves: [
    "the-grave-drain", "the-grave-verge", "the-roadside-graves",
  ],
};

// The kinds of ground each road animal will settle on. The draw stays random inside them.
// The goat and the raven are not here: their mountain rules ("crag", "green") hold on the road.
export const ROAD_SETTLES: [string, string[]][] = [
  ["roe-deer", ["green", "lane", "wood"]],
  ["masterless-dog", ["green", "lane"]],
  ["drove-dog", ["green", "lane"]],
  ["otter", ["water"]],
  ["grey-heron", ["water", "wet"]],
  ["gill-adder", ["wet", "lane", "crag"]],
  ["the-baited-bear", ["green", "lane", "wood", "water", "wet"]], // it eats anything and grazes too, so any of it
];
