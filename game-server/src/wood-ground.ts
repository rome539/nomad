// WHAT THE WOOD AND ASSART END ARE MADE OF (2026-11-17). The fifth and sixth living
// regions, after the mountain, the crossing, the road and the fortress (living-regions.md).
// Each room's kind of ground, read from its whole text, so an animal settles only where
// that animal belongs. A room can be two kinds. Every room of both is listed;
// test-regressions fails on a new room that is not. The wood names its grass, its lanes,
// its trees and its water as the road does ("green", "lane", "wood", "wet", "water"), so
// the roe deer's and the baited bear's road rules hold in the wood unchanged.

// THE WOOD ("wood").
//   road    the paving under the arch and the road's ruts: nothing settles on it
//   built   under a roof: the bounds house, the huts, the icehouse, the fish house. Nothing settles in it
//   cave    the bear caves, mouths and all: the brown bears' own (CAVE_DWELLERS); nothing else settles in them
//   under   the dark under the root-ceiling of the sunken wood. Nothing settles in it
//   green   grass: the glades, the lawns and the cut rides, the bailey's turf, the felling's open ground
//   heath   where the wood gives out: heather, sand, gorse and the thin scrub past the last trees
//   thicket undergrowth: bracken, bramble, thorn, coppice, holly brake, the windfalls and the brash
//   wet     carr, mire, reed, rush, osier and the alders standing in water
//   water   the pools, ponds, springs and the ditches that hold water
//   ruin    the holding's and the gatehouse's stone: walls, footings, the dovecote, the kiln
//   earth   the setts, earths, warrens and raw banks dug or fallen open
//   roost   the great, old and hollow trees, and the crows' and the herons' trees
//   wood    the standing wood: every stand, the holly and the yews, the birch, the burnt and the felled
export const WOOD_GROUND: Record<string, string[]> = {
  road: [
    "the-barbican-footings", "the-gate-arch", "the-paved-road", "the-road-ruts", "the-turning-bay",
    // the wood's new ways to the cave (2026-11-22)
    "the-back-road", "the-sunk-paving", "the-fallen-milestone", "the-road-bend", "the-holloway-head", "the-deep-holloway", "the-root-bridge", "the-rotted-cart", "the-washout",
  ],
  built: [
    "the-bounds-house", "the-charcoal-hut", "the-fish-house", "the-icehouse", "the-withy-hut",
  ],
  cave: [
    "the-boundary-cave", "the-boundary-cave-mouth", "the-boundary-cave-slope", "the-oak-cave",
    "the-oak-cave-crawl", "the-oak-cave-hall", "the-oak-cave-mouth", "the-oak-cave-neck", "the-pile-cave",
    "the-pile-cave-mouth", "the-ridge-cave", "the-ridge-cave-drop", "the-ridge-cave-fork",
    "the-ridge-cave-mouth", "the-ridge-cave-pocket", "the-ridge-cave-squeeze", "the-wall-cave",
    "the-wall-cave-mouth", "the-wall-cave-passage", "the-wall-cave-turn",
  ],
  under: [
    "the-black-loam", "the-buried-lane", "the-clay-shelf", "the-drip-line", "the-flint-floor", "the-last-light",
    "the-low-sump", "the-lower-ditch", "the-old-course", "the-still-pool", "the-tree-fall", "the-under-roots",
  ],
  green: [
    "the-axe-stumps", "the-basket-ground", "the-boundary-cross", "the-bundle-ground", "the-counterscarp",
    "the-deer-lawn", "the-empty-ride", "the-felling-edge", "the-first-clearing", "the-flood-meadow",
    "the-grass-island", "the-guard-footings", "the-hauling-ride", "the-hidden-spring", "the-killing-ground",
    "the-long-glade", "the-moat-bank", "the-moon-glade", "the-mounting-block", "the-north-marches",
    "the-north-ride", "the-oak-fall-gap", "the-orchard-gone-wild", "the-outer-bailey", "the-outer-ditch",
    "the-pale-grass", "the-pay-stone", "the-picked-bones", "the-rabbit-warren", "the-rampart-walk",
    "the-sawyers-bench", "the-stump-field", "the-sunken-lawn", "the-tilt-yard", "the-wedge-ground",
    "the-well-court", "the-west-ride", "the-white-ride", "the-windthrow",
    // the wood's new ways to the cave (2026-11-22)
    "the-cut-line", "the-tally-posts",
  ],
  heath: [
    "the-broken-ground", "the-dry-heath", "the-edge-of-it", "the-flint-scatter", "the-gorse-brake",
    "the-grey-scrub", "the-heath-edge", "the-outer-scrub", "the-pale-grass", "the-rabbit-warren",
    "the-sand-cut", "the-stunted-oaks", "the-thorn-waste", "the-wind-gap", "the-wind-shorn-edge",
  ],
  thicket: [
    "the-bent-hazels", "the-bracken-edge", "the-bracken-sea", "the-bramble-margin", "the-bramble-tunnel",
    "the-brash-heaps", "the-burnt-stand", "the-coppice-stools", "the-cut-osiers", "the-elder-brake",
    "the-fallen-crowns", "the-fern-floor", "the-fern-pit", "the-gorse-brake", "the-grey-stools",
    "the-grey-thicket", "the-hazel-ride", "the-holly-brake", "the-holly-dark", "the-holly-maze",
    "the-holly-wall", "the-nettle-glade", "the-old-coppice", "the-open-canopy", "the-outer-scrub",
    "the-sapling-crowd", "the-sloe-thicket", "the-tangle", "the-thin-birches", "the-thorn-thicket",
    "the-thorn-waste", "the-windfall", "the-windthrow",
  ],
  wet: [
    "the-alder-carr", "the-black-alder-stand", "the-black-alders", "the-black-mud", "the-bottom-of-it",
    "the-brown-water", "the-cold-seep", "the-drowned-hollow", "the-drowned-holly", "the-drowned-roots",
    "the-far-mire", "the-far-south-turning", "the-flooded-ride", "the-frog-chorus", "the-heronry",
    "the-leaning-alders", "the-low-mist", "the-mire-edge", "the-osier-beds", "the-osier-carr",
    "the-pollard-line", "the-quaking-ground", "the-reed-break", "the-rush-bed", "the-sedge-flat",
    "the-silted-pond", "the-skid-road", "the-sodden-ground", "the-south-ride", "the-spring-mire",
    "the-standing-water", "the-still-air", "the-sunk-fence", "the-wet-hollow", "the-wet-oaks", "the-wet-ride",
    "the-willow-break", "the-willow-margin", "the-willow-stools", "the-withy-holt",
    // the wood's new ways to the cave (2026-11-22)
    "the-sunk-moss", "the-wet-lane", "the-lanes-end",
  ],
  water: [
    "the-black-pool", "the-dark-pool", "the-drinking-pool", "the-eel-ditch", "the-fishponds",
    "the-hidden-spring", "the-holt-drain", "the-horse-pond", "the-moat-bank", "the-old-pond",
    "the-peeling-bank", "the-silted-pond", "the-soaking-pit", "the-spring-head", "the-stew-pond",
    "the-ward-ditch", "the-withy-drain",
  ],
  ruin: [
    "the-bailey-wall", "the-boundary-cross", "the-buried-wall", "the-chapel-shell", "the-dovecote",
    "the-fallen-wall", "the-guard-footings", "the-hall-floor", "the-kitchen-range", "the-lime-kiln",
    "the-mounting-block", "the-old-palisade", "the-solar", "the-stable-range", "the-well-court",
    "the-wolf-pits",
    // the wood's new ways to the cave (2026-11-22)
    "the-postern-gap",
  ],
  earth: [
    "the-badger-banks", "the-badger-ground", "the-deep-roots", "the-earth-fall", "the-fox-earths",
    "the-grey-lie", "the-rabbit-warren", "the-root-hollow", "the-sand-cut", "the-slip", "the-wolf-earth",
    // the wood's new ways to the cave (2026-11-22)
    "the-under-bank", "the-dark-behind",
  ],
  roost: [
    "the-ancient-ash", "the-boundary-oak", "the-cracked-oak", "the-crow-roost", "the-crows-oak",
    "the-dead-stand", "the-great-root", "the-heronry", "the-high-crowns", "the-high-holly",
    "the-hollow-beeches", "the-hollow-yew", "the-holly-tree", "the-hornets-oak", "the-hunters-stand",
    "the-last-oak", "the-last-oaks", "the-lightning-split", "the-old-pollards", "the-owl-oak",
    "the-pollard-line", "the-pollard-row", "the-standing-oaks", "the-stone-oak", "the-ward-oak",
    "the-woodpecker-stand", "the-wych-elms",
  ],
  wood: [
    "the-ancient-ash", "the-ant-hills", "the-ash-heap", "the-ash-stand", "the-badger-banks",
    "the-badger-ground", "the-bark-strip", "the-beech-mast", "the-birch-edge", "the-birdless-acre",
    "the-black-alder-stand", "the-black-oaks", "the-blind-corner", "the-boar-ground", "the-boundary-bank",
    "the-boundary-oak", "the-broken-avenue", "the-buckled-ground", "the-burners-flat", "the-burnt-stand",
    "the-charcoal-flat", "the-charcoal-ring", "the-clean-floor", "the-close-dark", "the-close-ground",
    "the-cold-hollow-oaks", "the-cord-stacks", "the-cracked-oak", "the-crooked-oaks", "the-crooked-stand",
    "the-crow-roost", "the-crows-oak", "the-dappled-way", "the-dark-pool", "the-dead-air", "the-dead-stand",
    "the-deep-litter", "the-deep-roots", "the-deer-browse", "the-deer-fence", "the-deer-path", "the-dry-gully",
    "the-dry-rise", "the-eaves", "the-fallen-giant", "the-far-birches", "the-far-hollow",
    "the-far-north-turning", "the-ferny-bank", "the-fungus-fall", "the-gnawed-stand", "the-great-root",
    "the-green-dark", "the-green-ridge", "the-grey-lie", "the-grey-mist", "the-grey-trunks", "the-ground-ivy",
    "the-heart-of-it", "the-hidden-spring", "the-high-crowns", "the-high-holly", "the-hollow-beeches",
    "the-holly-hedge", "the-holly-tree", "the-hornbeam-gloom", "the-hornbeam-row", "the-hornets-oak",
    "the-hunters-stand", "the-ivy-wall", "the-keepers-approach", "the-last-oak", "the-last-of-the-light",
    "the-leaf-drifts", "the-leaning-limes", "the-leaning-wood", "the-lichen-stones", "the-lichen-wood",
    "the-lightning-split", "the-lime-stand", "the-listening-stand", "the-long-fall", "the-lost-stand",
    "the-mast-fall", "the-moss-boulders", "the-moss-floor", "the-moss-hall", "the-moss-steps",
    "the-moss-tunnel", "the-mossed-wall", "the-murk", "the-north-marches", "the-north-turning", "the-oak-aisle",
    "the-oak-knees", "the-old-boundary-stone", "the-old-burn", "the-old-ditch", "the-old-pollards",
    "the-orchard-gone-wild", "the-owl-oak", "the-park-pale", "the-pine-dark", "the-poachers-camp",
    "the-pollard-row", "the-root-hollow", "the-rot-wood", "the-rotten-gate", "the-same-tree", "the-saw-pit",
    "the-sawdust-floor", "the-silent-beeches", "the-snapped-limbs", "the-soft-floor", "the-south-turning",
    "the-split-ash", "the-split-oak", "the-standing-oaks", "the-stone-oak", "the-stone-pile",
    "the-stunted-oaks", "the-sunk-way", "the-sunken-ditch", "the-sunken-wood", "the-sunless-floor",
    "the-swallowing", "the-thin-birches", "the-thin-light", "the-thin-soil", "the-timber-stack",
    "the-toadstool-ring", "the-turned-ground", "the-turning", "the-turning-leaves", "the-twisted-yews",
    "the-under-eaves", "the-ward-oak", "the-wet-oaks", "the-white-ground", "the-white-roots", "the-wild-cherry",
    "the-wolf-earth", "the-wolf-run", "the-woodpecker-stand", "the-wych-elms", "the-yew-shade", "the-yew-walk",
  ],
};

// ASSART END ("den"), the old village by the wood.
//   road    the clinker causeway across the wet: nothing settles on it
//   built   under a roof: the houses, the lofts, the mill, the smithy, the chapel, the lodge
//   hamlet  the street, its yards and crofts, and the common's working yards and the squatters' row
//   green   the fields, the pasture, the greens and the orchard
//   lane    the sunk and drift lanes and the mill lane
//   thicket the thorn hedges, the thorn corner, the scrub and the broom
//   heath   the gorse common and the warren's sandy rises
//   earth   the warren banks, dug through
//   wood    the orchard trees, the birch coming over the far furlong, the croft-backs' apple trees
//   wet     the rush waste, the turf cuttings, the withy rows
//   water   the mill dam, the marl pit and the well
//   graves  the fever graves. Nothing settles on them
export const DEN_GROUND: Record<string, string[]> = {
  road: [
    "the-kiln-track",
  ],
  built: [
    "the-bare-chapel", "the-black-hut", "the-lodge-loft", "the-mill", "the-north-house", "the-reeves-house",
    "the-reeves-loft", "the-smithy", "the-warreners-lodge", "the-wheel-pit",
  ],
  hamlet: [
    "the-bark-heap", "the-burnt-croft", "the-cart-turn", "the-chapel-green", "the-croft-backs",
    "the-hurdle-yard", "the-lane-head", "the-lodge-yard", "the-north-croft", "the-peelers-camp",
    "the-reeves-yard", "the-smithy-yard", "the-squatters-row", "the-street", "the-street-cross",
    "the-street-foot", "the-street-head", "the-well-green",
  ],
  green: [
    "the-chapel-green", "the-common-field", "the-cow-pasture", "the-dead-orchard", "the-drying-green",
    "the-empty-toft", "the-far-furlong", "the-headland-baulk", "the-hearth-stones", "the-hurdle-gate",
    "the-old-assart", "the-pillow-mounds", "the-ridge-and-furrow", "the-village-pound", "the-well-green",
  ],
  lane: [
    "the-drift-lane", "the-mill-lane", "the-sunken-way",
  ],
  thicket: [
    "the-broom-scrub", "the-far-furlong", "the-scrub-end", "the-thorn-corner", "the-thorn-hedge",
  ],
  heath: [
    "the-broom-scrub", "the-gorse-common", "the-pillow-mounds", "the-warren-bank",
  ],
  earth: [
    "the-pillow-mounds", "the-warren-bank",
  ],
  wood: [
    "the-croft-backs", "the-dead-orchard", "the-far-furlong",
  ],
  wet: [
    "the-far-waste", "the-mill-dam", "the-scrub-end", "the-turf-cutting", "the-waste-edge", "the-withy-rows",
  ],
  water: [
    "the-marl-pit", "the-marl-water", "the-mill-dam", "the-shallow-well",
  ],
  graves: [
    "the-fever-graves",
  ],
};

// The kinds of ground each of these animals will settle on. The draw stays random inside them.
// The roe deer, the masterless dogs and the baited bear live on the road too: their road
// rules (road-ground.ts) hold here, with the thicket and heath added to the roe's and the
// street to the dogs', kinds the road does not have, so the road is unchanged.
export const WOOD_SETTLES: [string, string[]][] = [
  ["wood-stag", ["wood", "green", "thicket"]],
  ["wild-boar", ["wood", "thicket", "wet"]],               // rooting and wallowing ground
  ["hedgehog", ["thicket", "wood", "green", "heath", "earth", "ruin"]],
  ["wood-sloth", ["wood", "roost"]],                       // up in the trees, and nowhere else
  ["grey-wolf", ["wood", "thicket", "earth", "green"]],
  ["tawny-owl", ["roost", "ruin"]],                        // a hollow tree, or the dovecote and the chapel walls
  ["the-follower", ["wood", "thicket", "heath", "wet", "water", "under"]], // the kinds its old fixed homes stood on
  ["the-hush", ["wood", "thicket", "heath"]],              // low and long, in the litter and the scrub (mig 405)
  ["capercaillie", ["wood", "heath", "green", "thicket"]], // the forest floor, where the bilberry grows (mig 405)
];
