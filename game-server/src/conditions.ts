// WHAT IS GOING ON IN A REGION (rome, 2026-10-25: the world should be different
// every time you step onto the ground). A region carries at most one condition
// at a time, and it is EARNED, never rolled: every CONDITION_STEP_MS each
// region reads its own herds and its own recent killing, and a condition
// starts when the ground calls for it and ends when the ground has changed.
// That is the line between this and events.ts, which is the weather — rolled,
// telegraphed, and over on its own clock.
//
//   BOOM     a prey herd that has stood full for CONDITION_BOOM_AFTER_MS. Its
//            animals stop keeping to cover (they are out at every hour), and
//            the region's predators drift in faster after them.
//   MURRAIN  a boom of a line that sickens (CONDITION_MURRAIN_LINES — the hares
//            and the rats) that has gone on CONDITION_MURRAIN_AFTER_MS. They
//            go thin and weak, and some die where nobody is looking, which
//            puts bodies on the ground for everything that eats the dead. Ends
//            when the herd has fallen below CONDITION_MURRAIN_ENDS of its limit.
//            (Not the rat king's sickness: that is a cough among people in the
//            fortress, cough.ts. This is the animals', out on the surface.)
//   HUNTED   players have been killing hard here: CONDITION_HUNTED_AT kills,
//            fading by half every CONDITION_KILL_HALF_MS. Ends below
//            CONDITION_HUNTED_CLEARS.
//   THICK    the hunters outnumber what feeds them (2026-10-26): hunters to
//            prey standing at CONDITION_THICK_AT times the region's own mix
//            (counting only THICK_HUNTERS, the ones that run a ground down),
//            for CONDITION_THICK_AFTER_MS. The prey keep to cover, as on hunted
//            ground (herds.wary). Ends below CONDITION_THICK_CLEARS times it.
//
// TOLD ONLY BY THE GROUND (rome: leave the keeper quiet for this one). A region
// in a condition says so in its passing lines, in the room you are standing
// in, and in what is actually there — more of a thing, thinner ones, bodies.
// No banner, no list, no keeper line. (A tally in the gatehouse said it for a
// day, 2026-10-26; rome took it out - the census was meant for him. His census
// reads it, censusLines below.)
import type { ZoneDO } from "./zone";
import type { Creature } from "./zone-types";
import { chance, randInt } from "./rng";
import { isHerd } from "./herds";
import {
  PREYS_ON, OUTDOOR_REGIONS,
  CONDITION_STEP_MS, CONDITION_BOOM_AFTER_MS, CONDITION_BOOM_ENDS, CONDITION_MURRAIN_LINES,
  CONDITION_MURRAIN_AFTER_MS, CONDITION_MURRAIN_ENDS, CONDITION_MURRAIN_HP, CONDITION_MURRAIN_DEATH_PER_H,
  CONDITION_HUNTED_AT, CONDITION_HUNTED_CLEARS, CONDITION_KILL_HALF_MS, CONDITION_AMBIENT_ODDS,
  CONDITION_BOOM_DRAW, CONDITION_BOOM_MAX_MS, CONDITION_REST_MS, CONDITION_BOOM_JITTER_MS, CONDITION_BOOM_MIN_HERD,
  CONDITION_THICK_AT, CONDITION_THICK_CLEARS, CONDITION_THICK_MIN, CONDITION_THICK_AFTER_MS, THICK_HUNTERS, REGION_LABELS,
} from "./zone-data";

export type Condition = { kind: "boom" | "murrain" | "hunted" | "thick"; line?: string; since: number };

const AT = "_at";

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

/** The condition standing on this region, if any. */
export function of(z: ZoneDO, region: string): Condition | undefined {
  return z.conditions.get(region);
}

/** A player's kill, counted against the region it happened in. */
export function noteKill(z: ZoneDO, region: string, now: number): void {
  decayTo(z, now);
  z.condTrack.set(`kills:${region}`, (z.condTrack.get(`kills:${region}`) ?? 0) + 1);
}

/** Recent killing in a region, as a count that halves every CONDITION_KILL_HALF_MS. */
export function killsIn(z: ZoneDO, region: string, now: number): number {
  decayTo(z, now);
  return z.condTrack.get(`kills:${region}`) ?? 0;
}

function decayTo(z: ZoneDO, now: number): void {
  const last = z.condTrack.get("_decay") ?? now;
  z.condTrack.set("_decay", now);
  if (now <= last) return;
  const k = Math.pow(0.5, (now - last) / CONDITION_KILL_HALF_MS);
  for (const [key, v] of z.condTrack) {
    if (!key.startsWith("kills:")) continue;
    const left = v * k;
    if (left < 0.05) z.condTrack.delete(key); else z.condTrack.set(key, left);
  }
}

/** Whether this animal's own line is booming where it lives. */
export function booming(z: ZoneDO, c: Creature): boolean {
  const cond = z.conditions.get(z.regionOf(c.home ?? c.roomId));
  if (cond?.kind !== "boom" || !cond.line) return false;
  return c.templateId === cond.line || z.variantBase.get(c.templateId) === cond.line;
}

/** Whether a line is sick where it lives: the sick do not breed (herds.ts). */
export function sickIn(z: ZoneDO, line: string, region: string): boolean {
  const cond = z.conditions.get(region);
  return cond?.kind === "murrain" && cond.line === line;
}

/** How much faster a predator drifts into a region, for the prey booming there. */
export function drawFor(z: ZoneDO, line: string, region: string): number {
  const cond = z.conditions.get(region);
  if (cond?.kind !== "boom" || !cond.line) return 1;
  return PREYS_ON.get(line)?.has(cond.line) ? CONDITION_BOOM_DRAW : 1;
}

/** Read every region and start, end or carry its condition. Live tick and catch-up. */
export function tick(z: ZoneDO, now: number, silent: boolean): void {
  const world = z.world;
  if (!world) return;
  const last = z.condTrack.get(AT);
  if (last !== undefined && now - last < CONDITION_STEP_MS) return;
  z.condTrack.set(AT, now);
  const hours = last === undefined ? 0 : (now - last) / 3_600_000;

  // What each region carries of each prey line, and what is standing — by home,
  // the way the herds count.
  const caps = new Map<string, number>();
  for (const s of world.mobSpawns) {
    const key = `${s.template_id}@${z.regionOf(s.room_id)}`;
    caps.set(key, (caps.get(key) ?? 0) + 1);
  }
  const rowed = new Set(world.mobSpawns.map((s) => s.template_id));
  const lineOf = (id: string): string => rowed.has(id) ? id : (z.variantBase.get(id) ?? id);
  const standing = new Map<string, Creature[]>();
  for (const c of z.creatures.values()) {
    const key = `${lineOf(c.templateId)}@${z.regionOf(c.home ?? c.roomId)}`;
    const list = standing.get(key) ?? [];
    list.push(c);
    standing.set(key, list);
  }
  // A herd that has stood full since when — only what something else eats can
  // boom (a boom is food walking about). Each one's clock starts somewhere in
  // the next CONDITION_BOOM_JITTER_MS, so herds that all filled at once (a
  // fresh world, a quiet week) do not all boom in the same hour.
  const prey = new Set<string>();
  for (const eats of PREYS_ON.values()) for (const p of eats) prey.add(p);
  for (const [key, k] of caps) {
    const [line] = key.split("@");
    if (!isHerd(world, line) || PREYS_ON.has(line) || !prey.has(line) || k < CONDITION_BOOM_MIN_HERD) continue;
    const n = standing.get(key)?.length ?? 0;
    const fk = `full:${key}`;
    if (n >= k) { if (!z.condTrack.has(fk)) z.condTrack.set(fk, now + randInt(0, CONDITION_BOOM_JITTER_MS)); } else z.condTrack.delete(fk);
  }

  // Hunters and prey on each region, standing and by its rows: how thick the
  // hunters are on it, against its own mix.
  const balance = new Map<string, { hunters: number; prey: number; huntRows: number; preyRows: number; most?: string; mostN: number }>();
  const bal = (region: string) => {
    let b = balance.get(region);
    if (!b) { b = { hunters: 0, prey: 0, huntRows: 0, preyRows: 0, mostN: 0 }; balance.set(region, b); }
    return b;
  };
  for (const [key, k] of caps) {
    const [line, region] = key.split("@");
    const n = standing.get(key)?.length ?? 0;
    const b = bal(region);
    if (PREYS_ON.get(line)?.size) {
      if (!THICK_HUNTERS.has(line)) continue; // only what runs a ground's prey down can make it thick
      b.huntRows += k; b.hunters += n;
      if (n > b.mostN) { b.mostN = n; b.most = line; }
    } else if (prey.has(line)) { b.preyRows += k; b.prey += n; }
  }
  const thickness = (region: string): number => {
    const b = balance.get(region);
    if (!b || !b.huntRows || !b.preyRows || b.hunters < CONDITION_THICK_MIN) return 0;
    return (b.hunters / Math.max(1, b.prey)) / (b.huntRows / b.preyRows);
  };

  const regions = new Set<string>([...caps.keys()].map((k) => k.split("@")[1]));
  for (const region of regions) {
    if (!OUTDOOR_REGIONS.has(region)) continue; // the halls and the deep keep their own ways
    const cond = z.conditions.get(region);
    const kills = killsIn(z, region, now);
    const thick = thickness(region);
    z.condTrack.set(`ratio:${region}`, thick); // the reading itself, for the keeper's census
    const tk = `thick:${region}`;
    if (thick >= CONDITION_THICK_AT) { if (!z.condTrack.has(tk)) z.condTrack.set(tk, now); } else z.condTrack.delete(tk);
    // HUNTED outranks the rest: whatever the ground was doing, it is being killed now.
    if (cond?.kind !== "hunted" && kills >= CONDITION_HUNTED_AT) {
      z.conditions.set(region, { kind: "hunted", since: now });
      continue;
    }
    if (cond?.kind === "hunted") {
      if (kills < CONDITION_HUNTED_CLEARS) end(z, region, now);
      continue;
    }
    if (cond?.kind === "thick") {
      if (thick < CONDITION_THICK_CLEARS) end(z, region, now);
      continue;
    }
    // THICK starts whatever else was on but hunting, and without the rest after
    // it: a murrain that has emptied the ground of hares leaves the foxes that
    // ate them standing on it, and that is the next thing the ground is doing.
    const thickSince = z.condTrack.get(tk);
    if (thickSince !== undefined && now - thickSince >= CONDITION_THICK_AFTER_MS) {
      z.conditions.set(region, { kind: "thick", line: balance.get(region)?.most, since: now });
      continue;
    }
    if (cond?.kind === "murrain" && cond.line) {
      const key = `${cond.line}@${region}`;
      const herd = standing.get(key) ?? [];
      const k = caps.get(key) ?? 0;
      if (herd.length < k * CONDITION_MURRAIN_ENDS) { end(z, region, now); continue; }
      sicken(z, herd, hours, now, silent);
      continue;
    }
    if (cond?.kind === "boom" && cond.line) {
      const key = `${cond.line}@${region}`;
      const n = standing.get(key)?.length ?? 0;
      const k = caps.get(key) ?? 0;
      if (n < k * CONDITION_BOOM_ENDS || now - cond.since >= CONDITION_BOOM_MAX_MS) { end(z, region, now); continue; }
      // A boom of a line that sickens, gone on long enough, turns.
      if (CONDITION_MURRAIN_LINES.has(cond.line) && now - cond.since >= CONDITION_MURRAIN_AFTER_MS) {
        z.conditions.set(region, { kind: "murrain", line: cond.line, since: now });
      }
      continue;
    }
    // Nothing on, and the ground has rested since the last thing that was: the
    // longest-full prey herd here, if it has been full long enough, booms. A
    // full herd is ordinary on ground nobody hunts, so the bar is long and the
    // rest after is longer, or every quiet region would always be booming.
    if ((z.condTrack.get(`rest:${region}`) ?? 0) > now) continue;
    let best: string | undefined, bestSince = Infinity;
    for (const [key] of caps) {
      const [line, r] = key.split("@");
      if (r !== region) continue;
      const since = z.condTrack.get(`full:${key}`);
      if (since !== undefined && since < bestSince) { bestSince = since; best = line; }
    }
    if (best && now - bestSince >= CONDITION_BOOM_AFTER_MS) {
      z.conditions.set(region, { kind: "boom", line: best, since: now });
    }
  }
}

// A condition over: the region rests a while before the next can start, and
// every herd's full-since clock begins again from here.
function end(z: ZoneDO, region: string, now: number): void {
  z.conditions.delete(region);
  z.condTrack.set(`rest:${region}`, now + CONDITION_REST_MS);
  for (const key of [...z.condTrack.keys()]) if (key.startsWith("full:") && key.endsWith(`@${region}`)) z.condTrack.delete(key);
}

// The murrain at work: every one of them goes thin, and some die where nobody
// is standing, which leaves the body on the ground like any other death.
function sicken(z: ZoneDO, herd: Creature[], hours: number, now: number, silent: boolean): void {
  const world = z.world!;
  const watched = new Set<string>();
  for (const s of z.sessions.values()) watched.add(s.roomId);
  for (const c of herd) {
    const t = world.mobTemplates.get(c.templateId);
    if (!t) continue;
    const most = Math.max(1, Math.round(t.max_hp * CONDITION_MURRAIN_HP));
    if (c.hp > most) c.hp = most;
  }
  const dies = herd.filter((c) => !c.target && !watched.has(c.roomId));
  let owed = dies.length * CONDITION_MURRAIN_DEATH_PER_H * hours;
  while (owed > 0 && dies.length) {
    if (owed < 1 && !chance(owed)) break;
    owed -= 1;
    const [c] = dies.splice(randInt(0, dies.length - 1), 1);
    const t = world.mobTemplates.get(c.templateId);
    z.addTrace(c.roomId, { kind: "blood", at: now, label: t?.name ?? "something", prey: c.templateId, sick: true });
    z.creatures.delete(c.id);
    z.noteCreaturesChanged();
    void silent; // nobody saw it go: that is the point
  }
}

/** One passing line for a room in a region with something going on, or null. */
export function ambient(z: ZoneDO, roomId: string): string | null {
  const cond = z.conditions.get(z.regionOf(roomId));
  if (!cond || !chance(CONDITION_AMBIENT_ODDS)) return null;
  const name = cond.line ? z.world!.mobTemplates.get(cond.line)?.name ?? "" : "";
  const pool = cond.kind === "thick" ? [
    `Fresh sign of ${name} on every path, and nothing else's. Whatever they eat here has learned to keep out of sight.`,
    `You find what ${name} left of something, picked clean, and the tracks of more than one going off from it.`,
    "Nothing small moves here. Every bush is quiet, and the quiet has teeth in it.",
  ] : cond.kind === "hunted" ? [
    "Old blood on the ground here, and newer blood over it. Nothing stands still for long.",
    "Every track here is going away from where you are standing, and none of them is fresh.",
    "It is very quiet. The ground has been killed over, and everything still on it knows.",
  ] : cond.kind === "boom" ? [
    `${cap(name)} goes off from almost under your feet, and another past it, and another. The ground is thick with them.`,
    `There is sign of ${name} everywhere you look: droppings, trodden ways, cropped ground. More of them than the land wants.`,
    `${cap(name)} stands in the open and watches you come, and does not trouble to move off. There are too many of them to be careful.`,
  ] : [
    `${cap(name)} lies in the open with no mark on it, thin as a rake. It did not die of anything with teeth.`,
    `Something is wrong with the ${name.replace(/^an? /, "")} here. The one you can see is thin and slow, and does not run.`,
    `There is a smell of sickness on this ground, and the crows have been at something that died of it.`,
  ];
  return pool[randInt(0, pool.length - 1)];
}

// THE REGIONS IN THE KEEPER'S CENSUS (rome, 2026-10-26: for me and my census,
// not for players). Each surface ground's condition and how long it has stood,
// and the two numbers that start one before it starts: recent kills against
// the hunted line, and the hunters' share against the region's own mix. Read
// by verbs.cmdCensus, behind the one key. Players are told only by the ground.
export function censusLines(z: ZoneDO, now: number): string[] {
  const world = z.world!;
  const bare = (id?: string) => (id ? world.mobTemplates.get(id)?.name ?? id : "?").replace(/^(an?|the) /i, "");
  const ago = (t: number) => { const m = Math.round((now - t) / 60_000); return m < 90 ? `${m}m` : `${(m / 60).toFixed(1)}h`; };
  const caps = new Map<string, number>(), alive = new Map<string, number>();
  const rowed = new Set(world.mobSpawns.map((s) => s.template_id));
  for (const s of world.mobSpawns) {
    const key = `${s.template_id}@${z.regionOf(s.room_id)}`;
    caps.set(key, (caps.get(key) ?? 0) + 1);
  }
  for (const c of z.creatures.values()) {
    const line = rowed.has(c.templateId) ? c.templateId : (z.variantBase.get(c.templateId) ?? c.templateId);
    const key = `${line}@${z.regionOf(c.home ?? c.roomId)}`;
    alive.set(key, (alive.get(key) ?? 0) + 1);
  }
  const grounds = Object.keys(REGION_LABELS).filter((r) => OUTDOOR_REGIONS.has(r) && [...caps.keys()].some((k) => k.endsWith(`@${r}`)));
  const lines = [`Region conditions (hunted at ${CONDITION_HUNTED_AT} kills, clears under ${CONDITION_HUNTED_CLEARS}; thick at ${CONDITION_THICK_AT}x its mix for ${CONDITION_THICK_AFTER_MS / 3_600_000}h, clears under ${CONDITION_THICK_CLEARS}x):`];
  for (const r of grounds) {
    const cond = z.conditions.get(r);
    const what = !cond ? "none"
      : `${cond.kind}${cond.line ? ` (${bare(cond.line)})` : ""} for ${ago(cond.since)}`;
    const rest = z.condTrack.get(`rest:${r}`);
    const thickSince = z.condTrack.get(`thick:${r}`);
    const ratio = z.condTrack.get(`ratio:${r}`) ?? 0;
    const scarce = [...caps.entries()]
      .filter(([key, k]) => key.endsWith(`@${r}`) && k >= 2 && (alive.get(key) ?? 0) < k / 4)
      .map(([key]) => bare(key.split("@")[0]));
    lines.push(`  ${REGION_LABELS[r]} — ${what}; kills ${killsIn(z, r, now).toFixed(1)}; hunters ${ratio.toFixed(1)}x${thickSince !== undefined && cond?.kind !== "thick" ? ` (over the line ${ago(thickSince)})` : ""}`
      + (!cond && rest !== undefined && rest > now ? `; resting ${Math.round((rest - now) / 3_600_000)}h more` : "")
      + (scarce.length ? `; scarce: ${[...new Set(scarce)].join(", ")}` : ""));
  }
  return lines;
}
