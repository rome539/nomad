// WHAT THE CROSSING IS MADE OF (rome, 2026-11-12). The second living region, after the
// mountain (living-regions.md). Each room's kind of ground, read from its whole text, so
// an animal settles only where that animal belongs. A room can be two kinds. Every room
// of the crossing is listed; test-regressions fails on a new room that is not.
//   water     open water and the channels: over the boot at the least, always wet
//   tidal     ground the sea covers and gives back (the causeway, the shoals, the scars)
//   shore     shingle, strand and mud above the tide, the wrack and the hards
//   marsh     salt marsh, saltings, creeks, samphire and the eyots' firm ground
//   reed      the reed beds, the carr and the causeys through them
//   dune      the dunes, the marram, the buckthorn
//   field     turf and grass on dry ground: the fields, the greens, the graves
//   stonework the bridge, its piers and spans, the stages and the quay
//   road      the made roads and lanes
//   hamlet    the Salt hamlet's yards and streets
//   indoors   under a roof
//   cave      the sea cave
export const CROSSING_GROUND: Record<string, string[]> = {
  water: [
    "the-channel-brink", "the-chapel-channel", "the-cold-spring", "the-cutting-water", "the-deep-mark",
    "the-drowned-mooring", "the-drowned-withies", "the-eel-grass", "the-eel-lines", "the-fifth-channel",
    "the-first-channel", "the-fourth-channel", "the-green-water", "the-half-drowned-cart", "the-heron-tree",
    "the-mid-channel", "the-rope-run", "the-second-channel", "the-slack", "the-sunken-forest",
    "the-third-channel", "the-tide-race", "the-under-rope", "the-weed-raft",
  ],
  tidal: [
    "the-bell-buoy", "the-causeway-bend", "the-causeway-cross", "the-cockle-beds", "the-crab-pools",
    "the-drain-arch", "the-drowned-span", "the-far-ferry-steps", "the-far-milestone", "the-ferry-steps",
    "the-first-crossing-stone", "the-first-shoal", "the-gravel-flats", "the-gull-stand", "the-half-tide-post",
    "the-lantern-stump", "the-last-shoal", "the-limpet-rocks", "the-long-bank", "the-mid-causeway",
    "the-mid-ford", "the-midden", "the-mussel-bank", "the-mussel-scaup", "the-net-poles", "the-net-stakes",
    "the-oyster-scars", "the-perch", "the-quicksand-flat", "the-second-crossing-stone", "the-second-shoal",
    "the-shell-bank", "the-shellfish-scars", "the-sluice-stone", "the-sunken-stretch", "the-tern-scrape",
    "the-weed-flat", "the-weeded-milestone", "the-withy-bank", "the-wrack-line", "the-wreck-ribs",
  ],
  shore: [
    "the-anchor-stone", "the-boat-graves", "the-boat-noust", "the-boat-noust-east", "the-bridge-strand",
    "the-burn-flats", "the-capstan-round", "the-cockle-scars", "the-cockle-strand", "the-drying-frames",
    "the-far-hard", "the-far-noust", "the-far-strand", "the-far-tide-mark", "the-ferry-strand",
    "the-ferryman-stone", "the-fisher-huts", "the-ford-head", "the-ford-landing", "the-gull-flats", "the-hard",
    "the-high-water-mark", "the-marsh-strand", "the-mud-shore", "the-oar-store", "the-outfall",
    "the-shell-eyot", "the-shell-scar", "the-shingle-rise", "the-shingle-spit", "the-signal-mast",
    "the-storm-line", "the-storm-ridge", "the-strand-head", "the-strand-track", "the-stranded-hull",
    "the-tar-shed", "the-thrift-bank", "the-tide-mark", "the-warping-post", "the-wrack-bank", "the-wrack-line",
  ],
  marsh: [
    "the-black-eyot", "the-chapel-eyot", "the-cord-grass", "the-creek-crossing", "the-creek-mouth",
    "the-crooked-creek", "the-decoy-pipe", "the-drained-creek", "the-eel-staithe", "the-flashes",
    "the-fowlers-hide", "the-fowlers-track", "the-grey-marsh", "the-gutway", "the-hurdle-eyot",
    "the-hurdle-store", "the-marsh-end", "the-old-sea-bank", "the-otter-run", "the-quaking-turf",
    "the-redshank-ground", "the-salt-causey", "the-salt-marsh", "the-salt-pans", "the-salt-workings",
    "the-salting-edge", "the-saltings-gate", "the-saltmarsh-pools", "the-samphire-flat", "the-samphire-flats",
    "the-samphire-island", "the-samphire-turn", "the-sea-lavender", "the-sea-purslane", "the-sunken-hurdles",
    "the-wide-creek", "the-wildfowler",
  ],
  reed: [
    "the-brushwood-causey", "the-causey-end", "the-cut-reed", "the-cutters-eyot", "the-dead-end",
    "the-drain-cut", "the-eyot-track", "the-first-eyot", "the-hard-approach", "the-long-causey",
    "the-mud-causey", "the-old-boat", "the-plank-run", "the-reed-fork", "the-reed-gate", "the-reed-maze",
    "the-sallow-rows", "the-stake-line", "the-tern-causey", "the-wet-carr",
  ],
  dune: [
    "the-blowout", "the-dune-ridge", "the-dune-slack", "the-grey-dunes", "the-marram-sea", "the-sea-buckthorn",
    "the-white-dunes",
  ],
  field: [
    "the-chapel-hard", "the-decoy-wood", "the-dipping-well", "the-drove-road", "the-gorse-corner", "the-graves",
    "the-keepers-garden", "the-marsh-field", "the-net-green", "the-rope-walk", "the-salt-pound", "the-sea-dyke",
    "the-sea-furrows", "the-shepherds-stone", "the-strand-graves", "the-wind-orchard",
  ],
  stonework: [
    "the-beam-walk", "the-broken-arch", "the-drowned-span", "the-far-arch", "the-far-rope-stage", "the-ferry-boat",
    "the-first-pier", "the-fourth-pier", "the-gap", "the-landing-stage", "the-near-arch", "the-pier-foot",
    "the-plank-span", "the-quay-stub", "the-refuge", "the-rope-bridge", "the-rope-stage", "the-scaffold-stub",
    "the-second-pier", "the-starling", "the-third-pier", "the-tollhouse-shell",
  ],
  road: [
    "the-bridge-approach", "the-bridge-landing", "the-capstan-stone", "the-cart-ruts", "the-causeway-head",
    "the-causeway-rise", "the-far-parting", "the-ferry-lane", "the-ford-corner", "the-ford-road",
    "the-hard-lane", "the-hard-standing", "the-landing-arch", "the-marsh-hard", "the-marsh-road", "the-parting",
    "the-passengers-rest", "the-shingle-stair", "the-shore-descent", "the-shore-road", "the-strand-road",
    "the-toll-board", "the-toll-post", "the-well-yard",
  ],
  hamlet: [
    "the-bare-toft", "the-burnt-cot", "the-far-cot", "the-old-hearths", "the-pump-green", "the-row-foot",
    "the-row-head", "the-salt-cross", "the-salters-row", "the-saltmasters-yard", "the-smiths-yard", "the-yard-backs",
  ],
  indoors: [
    "the-boat-house", "the-bothy-of-the-crossing", "the-cart-shed", "the-crossing-house", "the-eel-hut",
    "the-far-house", "the-ferry-house", "the-hook-hut", "the-net-loft", "the-pan-house", "the-salt-chapel",
    "the-salt-store", "the-saltmasters-house", "the-sea-smithy", "the-smoke-house", "the-toll-cottage",
    "the-turf-hut",
  ],
  cave: [
    "the-blowhole", "the-drowned-chamber", "the-fallen-roof", "the-salt-pool", "the-sand-crawl", "the-sea-cave",
    "the-shingle-bank", "the-weed-gallery",
  ],
};

// The kinds of ground each crossing animal will settle on. The draw stays random inside them.
export const CROSSING_SETTLES: [string, string[]][] = [
  ["marsh-hound", ["marsh", "reed", "dune", "field", "shore", "hamlet"]],
  ["grey-seal", ["tidal", "water", "shore"]],
  ["great-gull", ["stonework", "shore", "tidal"]],
  ["oystercatcher", ["tidal", "shore", "marsh", "field"]],
  ["wrack-crab", ["tidal", "shore", "cave"]],
  ["ford-eel", ["water", "marsh"]],
  ["fen-viper", ["reed", "dune", "marsh"]],
  ["bittern", ["reed", "marsh"]],
  ["water-vole", ["reed", "marsh"]],
];
