// THE MOUNTAIN'S OWN COUNT (rome, 2026-11-06). The keeper's read on whether the
// living mountain is working: `beasts`, behind the same key as the census and
// kept out of it. What happened is tallied here as it happens and saved with the
// groups; everything else is read off the living world when asked.
import type { ZoneDO } from "./zone";
import type { Creature } from "./zone-types";
import { FOOD_FLIERS, SALT_HAMLET_ROOMS, SHIELING_HAMLET_ROOMS, roamsIn } from "./zone-data";

const DAY_MS = 24 * 3_600_000;
type Kills = Record<string, Record<string, number>>;
export interface Tally { since: number; moved?: number; flights: number; chases: number; caught: number; stolen: number; kills: Kills; crossingKills?: Kills; roadKills?: Kills; outKills?: Kills; upperKills?: Kills; deepKills?: Kills; woodKills?: Kills; caveKills?: Kills; denKills?: Kills }
type Event = "moved" | "flights" | "chases" | "caught" | "stolen";

const SHOWN = [
  "rat", "mountain-hare", "ptarmigan", "red-hind", "feral-goat", "hill-wolf", "hill-fox", "wildcat", "ermine", "snow-fox",
  "lynx", "glutton", "eagle-owl", "hill-eagle", "scarp-raven", "mountain-chough", "bone-breaker", "carrion-vulture",
];
// THE CROSSING'S SECTION (rome, 2026-11-12): the second living region, read the same way.
const CROSSING_SHOWN = [
  "rat", "water-vole", "wrack-crab", "devil-crab", "oystercatcher", "ford-eel", "bittern", "fen-viper", "great-gull", "grey-seal", "conger", "marsh-hound",
];
// THE ROAD'S SECTION (2026-11-13): the third living region, read the same way.
const ROAD_SHOWN = [
  "rat", "mountain-hare", "roe-deer", "feral-goat", "otter", "gill-adder", "grey-heron", "scarp-raven", "masterless-dog", "drove-dog", "the-baited-bear",
];
// THE FORTRESS'S SECTIONS (2026-11-14): the open ground, the keep and the warrens, the deep.
const OUT_SHOWN = ["rat", "feral-goat", "gibbet-crow", "grave-hyena", "dire-hyena"]; // the scary rat counts with the rat; the dire hyena is its own
const UPPER_SHOWN = ["rat", "grave-hyena", "skeleton", "warden"];
const DEEP_SHOWN = ["rat", "pale-crawler", "twice-dead", "marrow-cantor"];
// THE WOOD'S AND ASSART END'S SECTIONS (2026-11-17), read the same way. The brown bears keep
// their caves and are shown for what they hunt; Assart End's rats are the fever rat's and stay.
const WOOD_SHOWN = [
  "roe-deer", "wood-stag", "wild-boar", "hedgehog", "wood-sloth", "grey-wolf", "coyote", "tawny-owl", "scarp-raven", "brown-bear", "the-baited-bear", "the-hush", "capercaillie",
];
const DEN_SHOWN = ["rat", "roe-deer", "masterless-dog"];
// THE CAVE UNDER THE WOOD (mig 409, 2026-11-24): its roamers, and the gulpers, diggers and brood that keep their places.
const CAVE_SHOWN = ["cave-cougar", "mole-hound", "grubbet", "pale-salamander", "cave-spider", "cave-bat", "river-gulper", "digger", "stone-brood", "polecat", "cave-crayfish", "stone-mites", "stone-hog"];
const ALL_SHOWN = new Set([...SHOWN, ...CROSSING_SHOWN, ...ROAD_SHOWN, ...OUT_SHOWN, ...UPPER_SHOWN, ...DEEP_SHOWN, ...WOOD_SHOWN, ...DEN_SHOWN, ...CAVE_SHOWN]);
const lineOf = (z: ZoneDO, id: string): string => ALL_SHOWN.has(id) || roamsIn(id) ? id : (z.variantBase.get(id) ?? id);
const onMountain = (z: ZoneDO, c: Creature): boolean => z.regionOf(c.home ?? c.roomId) === "mountain";

function tally(z: ZoneDO, now: number): Tally {
  const state = z.groups;
  if (!state.tally || now - state.tally.since >= DAY_MS) {
    state.lastTally = state.tally;
    state.tally = { since: now, flights: 0, chases: 0, caught: 0, stolen: 0, kills: {} };
  }
  return state.tally;
}

export function note(z: ZoneDO, what: Event, now = Date.now()): void {
  const t = tally(z, now);
  t[what] = (t[what] ?? 0) + 1;
}

/** A living region's animal has died. `by` is what killed it: a creature's template, or "wanderers". */
export function noteKill(z: ZoneDO, victim: Creature, by: string, now = Date.now()): void {
  const line = lineOf(z, victim.templateId);
  const region = z.regionOf(victim.home ?? victim.roomId);
  const view = VIEWS.find((v) => v.region === region);
  if (view) {
    if (!view.shown.includes(line)) return;
    const t = tally(z, now);
    const row = ((t[view.kills] ??= {})[line] ??= {});
    const who = by === "wanderers" ? by : lineOf(z, by);
    row[who] = (row[who] ?? 0) + 1;
    return;
  }
  if (!(onMountain(z, victim) && SHOWN.includes(line))) return;
  const row = (tally(z, now).kills[line] ??= {});
  const who = by === "wanderers" ? by : lineOf(z, by);
  row[who] = (row[who] ?? 0) + 1;
}

const hoursAgo = (now: number, at: number): string => {
  const h = Math.round((now - at) / 3_600_000);
  return h < 1 ? "the last hour" : h === 1 ? "the last hour" : `the last ${h} hours`;
};

// ONE GROUND AT A TIME (rome, 2026-11-18): `beasts wood` prints only the wood's
// section, for every region; bare `beasts` prints them all as before.
export function lines(z: ZoneDO, now: number, only = ""): string[] {
  const q = only.toLowerCase().trim().replace(/^the\s+/, "");
  if (!q) return [...mountainLines(z, now), ...VIEWS.flatMap((v) => ["", ...regionLines(z, now, v)])];
  const hit = (words: string[]) => words.includes(q) || words.includes(q.replace(/s$/, ""));
  if (hit(MOUNTAIN_WORDS)) return mountainLines(z, now);
  const v = VIEWS.find((x) => hit(x.words));
  if (v) return regionLines(z, now, v);
  return [`No ground called "${only.trim()}". Try: mountain, ${VIEWS.map((x) => x.words[0]).join(", ")}.`];
}

const MOUNTAIN_WORDS = ["mountain"];
function mountainLines(z: ZoneDO, now: number): string[] {
  const world = z.world!;
  const name = (id: string) => (world.mobTemplates.get(id)?.name ?? id).replace(/^(an?|the) /i, "");
  const roomName = (id: string) => world.rooms.get(id)?.name ?? id;
  const out = ["THE MOUNTAIN", ""];

  const alive = new Map<string, number>();
  const wolves: Creature[] = [];
  const birdsIn = new Map<string, number>();
  let up = 0;
  for (const c of z.creatures.values()) {
    if (!onMountain(z, c)) continue;
    const line = lineOf(z, c.templateId);
    alive.set(line, (alive.get(line) ?? 0) + 1);
    if (line === "hill-wolf") wolves.push(c);
    if (c.aloft !== undefined && c.flightTo) up++;
    else if (FOOD_FLIERS.has(line)) birdsIn.set(c.roomId, (birdsIn.get(c.roomId) ?? 0) + 1);
  }

  const packs = new Map<string, number>();
  for (const c of wolves) if (c.group) packs.set(c.group, (packs.get(c.group) ?? 0) + 1);
  const alone = wolves.filter((c) => !c.group && c.lone).length;
  const unsorted = wolves.filter((c) => !c.group && !c.lone).length;
  const inHamlet = new Set(SHIELING_HAMLET_ROOMS);
  const hamlet = wolves.filter((c) => inHamlet.has(c.home ?? "") || inHamlet.has(c.roomId)).length;
  out.push(`Wolves: ${wolves.length} alive, ${alone} alone, ${hamlet} in the hamlet${unsorted ? `, ${unsorted} not sorted yet` : ""}`);
  for (const [id, n] of packs) out.push(`  pack of ${n} at ${roomName(z.groups.packs[id]?.home ?? "")}`);
  if (!packs.size) out.push("  no packs");

  out.push("", "Alive, against the limit:");
  const rows = new Map<string, number>();
  for (const s of world.mobSpawns) if (z.regionOf(s.room_id) === "mountain") rows.set(s.template_id, (rows.get(s.template_id) ?? 0) + 1);
  for (const line of SHOWN) out.push(`  ${name(line)}: ${alive.get(line) ?? 0} of ${rows.get(line) ?? 0}`);

  const busiest = [...birdsIn].sort((a, b) => b[1] - a[1])[0];
  out.push("", `Birds: ${up} in the air now, most in one room ${busiest ? `${busiest[1]} at ${roomName(busiest[0])}` : "none"}`);

  const t = tally(z, now);
  const told = (b: Tally) => `${b.moved ?? 0} homes given up, ${b.flights} flights, ${b.chases} chases, ${b.caught} small hunters caught, ${b.stolen} kills stolen`;
  out.push("", `In ${hoursAgo(now, t.since)}: ${told(t)}`);
  if (z.groups.lastTally) out.push(`The 24 hours before: ${told(z.groups.lastTally)}`);
  const killed = Object.entries(t.kills)
    .map(([line, by]) => ({ line, by, total: Object.values(by).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  if (killed.length) out.push("", "Killed in that time, and by what:");
  for (const { line, by, total } of killed) {
    const who = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k, n]) => `${k === "wanderers" ? k : name(k)} ${n}`).join(", ");
    out.push(`  ${name(line)} ${total}: ${who}`);
  }
  return out;
}

// What a living region's section shows: its packs, its herds, its lines against
// their limit, and what was killed and by what.
interface RegionView { title: string; words: string[]; region: string; shown: string[]; packs: { line: string; label: string; hamlet?: string[] }[]; herds: string[]; kills: "crossingKills" | "roadKills" | "outKills" | "upperKills" | "deepKills" | "woodKills" | "denKills" | "caveKills" }
const CROSSING_VIEW: RegionView = {
  title: "THE CROSSING", words: ["crossing"], region: "crossing", shown: CROSSING_SHOWN, kills: "crossingKills",
  packs: [{ line: "marsh-hound", label: "Marsh hounds", hamlet: SALT_HAMLET_ROOMS }],
  herds: ["grey-seal", "great-gull", "oystercatcher", "wrack-crab"],
};
const ROAD_VIEW: RegionView = {
  title: "THE ROAD", words: ["road"], region: "road", shown: ROAD_SHOWN, kills: "roadKills",
  packs: [{ line: "masterless-dog", label: "Masterless dogs" }, { line: "drove-dog", label: "Drove dogs" }],
  herds: ["feral-goat"],
};
const OUT_VIEW: RegionView = {
  title: "THE OPEN GROUND", words: ["open ground", "open", "ground", "out"], region: "out", shown: OUT_SHOWN, kills: "outKills",
  packs: [{ line: "grave-hyena", label: "Grave hyenas" }],
  herds: ["feral-goat"],
};
const UPPER_VIEW: RegionView = {
  title: "THE KEEP AND THE WARRENS", words: ["keep", "warren", "warrens", "upper"], region: "upper", shown: UPPER_SHOWN, kills: "upperKills",
  packs: [{ line: "grave-hyena", label: "Grave hyenas" }],
  herds: [],
};
const DEEP_VIEW: RegionView = {
  title: "THE DEEP", words: ["deep"], region: "deep", shown: DEEP_SHOWN, kills: "deepKills",
  packs: [],
  herds: [],
};
const WOOD_VIEW: RegionView = {
  title: "THE WOOD", words: ["wood", "forest"], region: "wood", shown: WOOD_SHOWN, kills: "woodKills",
  packs: [{ line: "grey-wolf", label: "Grey wolves" }],
  herds: ["wild-boar", "roe-deer"],
};
const DEN_VIEW: RegionView = {
  title: "ASSART END", words: ["assart end", "assart", "den"], region: "den", shown: DEN_SHOWN, kills: "denKills",
  packs: [{ line: "masterless-dog", label: "Masterless dogs" }],
  herds: ["roe-deer"],
};
const CAVE_VIEW: RegionView = {
  title: "THE CAVE", words: ["cave", "the cave"], region: "cave", shown: CAVE_SHOWN, kills: "caveKills",
  packs: [{ line: "mole-hound", label: "Mole hounds" }],
  herds: ["cave-bat", "stone-hog"],
};
const VIEWS = [CROSSING_VIEW, ROAD_VIEW, OUT_VIEW, UPPER_VIEW, DEEP_VIEW, WOOD_VIEW, DEN_VIEW, CAVE_VIEW];

function regionLines(z: ZoneDO, now: number, v: RegionView): string[] {
  const world = z.world!;
  const name = (id: string) => (world.mobTemplates.get(id)?.name ?? id).replace(/^(an?|the) /i, "");
  const roomName = (id: string) => world.rooms.get(id)?.name ?? id;
  const out = [v.title, ""];
  const here = (c: Creature): boolean => z.regionOf(c.home ?? c.roomId) === v.region;
  const alive = new Map<string, number>();
  for (const c of z.creatures.values()) {
    if (!here(c)) continue;
    const line = lineOf(z, c.templateId);
    alive.set(line, (alive.get(line) ?? 0) + 1);
  }
  for (const p of v.packs) {
    const dogs = [...z.creatures.values()].filter((c) => here(c) && lineOf(z, c.templateId) === p.line);
    const packs = new Map<string, number>();
    for (const c of dogs) if (c.group) packs.set(c.group, (packs.get(c.group) ?? 0) + 1);
    const alone = dogs.filter((c) => !c.group && c.lone).length;
    const unsorted = dogs.filter((c) => !c.group && !c.lone).length;
    const inHamlet = new Set(p.hamlet ?? []);
    const hamlet = p.hamlet ? `, ${dogs.filter((c) => inHamlet.has(c.home ?? "") || inHamlet.has(c.roomId)).length} in the hamlet` : "";
    out.push(`${p.label}: ${dogs.length} alive, ${alone} alone${hamlet}${unsorted ? `, ${unsorted} not sorted yet` : ""}`);
    for (const [id, n] of packs) out.push(`  pack of ${n} at ${roomName(z.groups.packs[id]?.home ?? "")}`);
    if (!packs.size) out.push("  no packs");
  }
  // the herds and flocks: how many, and how big
  for (const line of v.herds) {
    const sizes = new Map<string, number>();
    for (const c of z.creatures.values()) if (c.group && here(c) && lineOf(z, c.templateId) === line) sizes.set(c.group, (sizes.get(c.group) ?? 0) + 1);
    out.push(`  ${name(line)}: ${sizes.size ? [...sizes.values()].join(", ") : "none"} in company`);
  }
  out.push("", "Alive, against the limit:");
  const rows = new Map<string, number>();
  for (const s of world.mobSpawns) if (z.regionOf(s.room_id) === v.region) rows.set(s.template_id, (rows.get(s.template_id) ?? 0) + 1);
  for (const line of v.shown) out.push(`  ${name(line)}: ${alive.get(line) ?? 0} of ${rows.get(line) ?? 0}`);
  const killed = Object.entries(tally(z, now)[v.kills] ?? {})
    .map(([line, by]) => ({ line, by, total: Object.values(by).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  if (killed.length) out.push("", `Killed in ${hoursAgo(now, tally(z, now).since)}, and by what:`);
  for (const { line, by, total } of killed) {
    const who = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k, n]) => `${k === "wanderers" ? k : name(k)} ${n}`).join(", ");
    out.push(`  ${name(line)} ${total}: ${who}`);
  }
  return out;
}
