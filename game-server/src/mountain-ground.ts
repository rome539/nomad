// WHAT THE MOUNTAIN IS MADE OF (rome, 2026-11-06). Each room's kind of ground, read from
// its own text, so an animal settles only where that animal belongs. A room can be two
// kinds: a grass ledge is both green and crag. Every room a mountain animal could call
// home must be listed; test-regressions fails on a new room that is not.
export const MOUNTAIN_GROUND: Record<string, string[]> = {
  shore: [
    "the-boulder-beach", "the-burn-mouth", "the-cobble-bank"
  ],
  green: [
    "the-wind-flat", "the-lower-beck", "the-thorn-scrub", "the-alder-thicket", "the-nettle-ground",
    "the-rush-hollow", "the-goat-track", "the-last-pasture", "the-plunge-pool", "the-sphagnum-flat",
    "the-hanging-turf", "the-peat-hags", "the-cotton-grass", "the-bracken-slope", "the-fallen-birch",
    "the-quaking-moss", "the-slant", "the-wether-ledge", "the-peat-pool", "the-drowned-fence",
    "the-beck-fork", "the-sunk-boulders", "the-shoulder-walk", "the-shoulder-drop", "the-scree-toe",
    "the-stone-river", "the-spring-eye", "the-flood-gravel", "the-mire-foot", "the-lichen-boulders",
    "the-black-runnel", "the-wind-notch", "the-corrie-rim", "the-corrie-lip", "the-south-shoulder",
    "the-sun-shoulder", "the-corrie-mouth", "the-corrie-floor", "the-heather-shelf",
    "the-deer-lawn-high", "the-dry-corrie", "the-hidden-burn", "the-wallow", "the-thin-turf",
    "the-terrace", "the-lower-band", "the-broken-terrace", "the-third-band", "the-heather-step",
    "the-shelf-head", "the-upper-heather", "the-long-shelf", "the-last-green", "the-drove-cut",
    "the-spring-green", "the-hanging-floor", "the-terrace-strips", "the-in-field", "the-moss-flush",
    "the-north-bank", "the-south-bank", "the-scoop-of-grass", "the-thorn-garth", "the-fleece-green",
    "the-rowan-rows", "the-cloud-foot", "the-hill-graves", "the-cold-hearths", "the-thorn-nook",
    "the-first-rise", "the-turf-wall", "the-hearth-stone", "the-stell", "the-track-head",
    "the-red-moss", "the-hill-spring", "the-shiel-foot"
  ],
  stone: [
    "the-clapper", "the-beck-narrows", "the-water-slide", "the-boulder-field", "the-gravel-race",
    "the-pass-head", "the-erratic", "the-hollow-under", "the-dry-course", "the-north-scree",
    "the-moraine-bank", "the-scree-toe", "the-stone-river", "the-flood-gravel", "the-cairn-line",
    "the-fan", "the-loose-slope", "the-sorted-ground", "the-lichen-boulders", "the-lower-force",
    "the-force-pool", "the-wind-lane", "the-wind-scour", "the-north-corrie", "the-bealach",
    "the-rock-glacier", "the-shifting-ground", "the-glacier-mouth", "the-blown-ground",
    "the-stone-stripes", "the-cold-hollow", "the-gully-head", "the-boulder-choke", "the-crag-shadow",
    "the-gully-foot", "the-bare-plateau", "the-frost-shatter", "the-black-scree", "the-flat-top",
    "the-high-cairn", "the-plateau-edge", "the-lochan", "the-lochan-shore", "the-cold-shadow",
    "the-water-lip", "the-cut", "the-gravel-shelf", "the-broken-ground-high", "the-sink",
    "the-hot-scree", "the-sun-gully", "the-dry-gorge", "the-resurgence", "the-upper-force",
    "the-wind-scoop", "the-spur-head", "the-hanging-scree", "the-mid-shelf", "the-tarn-edge",
    "the-cold-plateau", "the-high-tarn", "the-frost-pavement", "the-valley-mouth", "the-outwash",
    "the-stone-run", "the-stripe-field", "the-moraine-loop", "the-upper-lochan", "the-braided-flats",
    "the-high-spring", "the-far-shore-high", "the-till", "the-fan-head", "the-dry-shelf",
    "the-shelf-tail", "the-scree-end", "the-valley-shoulder", "the-valley-head",
    "the-step-in-the-floor", "the-hanging-floor", "the-catch-slope", "the-boulder-nose",
    "the-splinter-field", "the-lower-fan", "the-scoured-flat", "the-melt-run", "the-grey-run",
    "the-red-tail", "the-red-edge", "the-red-scree", "the-rust-slope", "the-oxide-flat",
    "the-iron-band", "the-stained-run", "the-ochre-shelf", "the-red-gully", "the-burnt-ground",
    "the-high-red", "the-scree-head", "the-cold-shoulder", "the-stone-desert", "the-swept-ground",
    "the-pavement", "the-cold-plain", "the-approach", "the-wind-cut", "the-last-ground",
    "the-cold-terrace", "the-lee-side", "the-first-rise", "the-wind-flat", "the-standing-cloud",
    "the-grey-nothing", "the-rising-ground", "the-cloud-base", "the-inversion", "the-brocken",
    "the-glacier-toe"
  ],
  snow: [
    "the-snow-gully", "the-cold-hollow", "the-old-snow", "the-old-drift", "the-melt-runnel",
    "the-upper-drift", "the-snow-edge", "the-moat", "the-snow-bed", "the-grey-ice", "the-firn",
    "the-cold-ramp", "the-white-hollow", "the-late-field", "the-lee-drift", "the-drift-edge",
    "the-upper-brim", "the-snow-brim", "the-high-neve", "the-bergschrund", "the-frost-face",
    "the-white-slope", "the-wind-slab", "the-ice-shelf", "the-blue-wall", "the-neve", "the-snow-dome",
    "the-rime", "the-crevasse-field", "the-ice-fall", "the-white-out", "the-hard-pack", "the-cornice",
    "the-drift-foot", "the-second-notch", "the-broken-crust", "the-sun-cup", "the-blue-shadow",
    "the-runnel", "the-glacier-bend", "the-third-notch", "the-serac-field", "the-ice-blocks",
    "the-crevasse-lip", "the-snow-hollow", "the-melt-lip", "the-snow-tongue", "the-tongue-foot",
    "the-white-tower", "the-blue-ice", "the-slot", "the-glacier-toe", "the-moulin", "the-ice-plain",
    "the-drift-hollow", "the-glacier-head", "the-ridge-drop", "the-cold-plateau"
  ],
  hamlet: [
    "the-shieling", "the-milking-fold", "the-high-fold", "the-shiel-foot", "the-fold-pound",
    "the-shiel-street", "the-forge-yard", "the-shiel-backs", "the-hill-cross", "the-herds-yard",
    "the-burnt-shiel", "the-chapel-shelf", "the-shiel-head", "the-high-croft", "the-lost-toft",
    "the-hearth-stone", "the-turf-wall", "the-stell"
  ],
  indoors: [
    "the-hill-smithy", "the-herds-house", "the-high-house", "the-hill-chapel", "the-peat-hut"
  ],
  bones: [
    "the-bone-ground", "the-fall-fan", "the-rib-cage", "the-dry-bones", "the-last-fan", "the-scatter",
    "the-crack-heap", "the-third-terrace", "the-picked-ground", "the-white-heap", "the-gorge-ground",
    "the-under-terrace"
  ],
  crag: [
    "the-shelter-crag", "the-raven-stone", "the-shattered-rib", "the-brink", "the-wedge", "the-slabs",
    "the-wet-slabs", "the-fallen-block", "the-first-crag", "the-cleft", "the-cold-face", "the-notch",
    "the-rowan", "the-back-wall", "the-warm-slabs", "the-hanging-step", "the-basking-stone",
    "the-pothole", "the-chimney-foot", "the-ledge-walk", "the-hot-ledge", "the-crown-step",
    "the-shattered-crown", "the-chimney", "the-second-band", "the-sun-traverse", "the-north-rib",
    "the-airy-step", "the-slab-nose", "the-dry-ledge", "the-spur-walk", "the-rib-foot", "the-rake-top",
    "the-under-rib", "the-rake", "the-band-end", "the-boulder-gate", "the-water-notch", "the-rib-gap",
    "the-first-buttress", "the-second-rib", "the-scoop", "the-fall-line", "the-shelf-break",
    "the-first-tower", "the-arete-foot", "the-sun-buttress", "the-arete-walk", "the-notch-of-air",
    "the-drop-either-side", "the-shelf-end", "the-warm-gully", "the-spur-end", "the-bad-step",
    "the-second-tower", "the-blade", "the-horns", "the-arete-end", "the-south-rib", "the-sun-notch",
    "the-terrace-end", "the-first-notch", "the-crest-step", "the-last-shelf", "the-shelf-drop",
    "the-north-drop", "the-knife", "the-cold-crest", "the-clear-window", "the-cloud-shelf",
    "the-gendarme", "the-wind-tooth", "the-ridge-walk", "the-last-tooth", "the-lean", "the-under-step",
    "the-ridge-end", "the-shelf-walk", "the-north-step", "the-low-traverse", "the-shelf-under",
    "the-warm-under", "the-north-crest", "the-shoulder-end", "the-under-shelf", "the-south-shelf",
    "the-gully-top", "the-crest-walk", "the-cushion-ledge", "the-first-step", "the-glazed-slab",
    "the-ramp-head", "the-warm-flags", "the-summit-foot", "the-warm-gutter", "the-crest-gap",
    "the-north-lip", "the-shoulder-stone", "the-run-stone", "the-black-glass", "the-heat-shimmer",
    "the-heat-under", "the-lower-warm", "the-way-up", "the-lower-flags", "the-crown-edge",
    "the-cold-side", "the-tower-foot", "the-scald", "the-basking-flags", "the-sun-trap", "the-vent",
    "the-step-up", "the-south-step", "the-last-crest", "the-shadow-step", "the-black-tower",
    "the-crack-line", "the-warm-scree", "the-under-warmth", "the-terrace-foot", "the-south-gully",
    "the-high-notch", "the-tower-gap", "the-adder-shelf", "the-thin-crack", "the-dry-heat",
    "the-quiet-ground", "the-scorched-step", "the-guano-face", "the-eyrie-foot", "the-first-terrace",
    "the-drag-mark", "the-tallow-stone", "the-bare-place", "the-swept-terrace", "the-high-perch",
    "the-white-wall", "the-eyrie-ledge", "the-second-terrace", "the-grease-flat", "the-threshold",
    "the-ash-ground", "the-wind-post", "the-updraught", "the-nest-shelf", "the-last-shelter",
    "the-hot-flags", "the-lookout", "the-eyrie-head", "the-last-terrace", "the-summit-gate"
  ],
};

export const GROUND_OF = new Map<string, string[]>();
for (const kind in MOUNTAIN_GROUND) {
  for (const room of MOUNTAIN_GROUND[kind]) GROUND_OF.set(room, [...(GROUND_OF.get(room) ?? []), kind]);
}
// The kinds of ground each animal will settle on. The draw stays random inside them.
export const SETTLES_ON = new Map<string, string[]>([
  ["red-hind", ["green"]],
  ["mountain-hare", ["green", "stone"]],
  ["feral-goat", ["crag", "green"]],
  ["ptarmigan", ["stone", "snow"]],
  ["snow-fox", ["snow", "stone"]],
  ["hill-wolf", ["green", "stone", "hamlet"]],
  ["hill-fox", ["green", "stone", "hamlet"]],
  ["wildcat", ["crag", "green", "hamlet", "indoors"]],
  ["ermine", ["stone", "green", "hamlet", "indoors"]],
  ["lynx", ["crag", "stone", "green"]],
  ["glutton", ["stone", "snow", "bones"]],
  ["eagle-owl", ["crag", "hamlet"]],
  ["scarp-raven", ["crag"]],
  ["mountain-chough", ["crag"]],
  ["hill-eagle", ["crag"]],
  ["bone-breaker", ["crag", "bones"]],
  ["carrion-vulture", ["crag", "bones"]],
  ["stone-adder", ["stone", "crag", "hamlet"]],
]);

/** Whether this line would settle in this room. A room with no entry refuses nobody. */
export function settlesOn(line: string, room: string): boolean {
  const ground = GROUND_OF.get(room), kinds = SETTLES_ON.get(line);
  return !ground || !kinds || ground.some((k) => kinds.includes(k));
}
