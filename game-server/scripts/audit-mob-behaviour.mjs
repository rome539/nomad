#!/usr/bin/env node
// WHAT EACH CREATURE IS MADE TO DO, AND WHETHER IT WAS DRAWN DOING IT.
//
// Every pose list before 2026-09-17 was chosen by hand, and the hand checked
// one behaviour set out of six. This reads all of them and prints the gap.
// Run it before speccing a sheet, not after.
import fs from "fs";
import path from "path";
const GAME = path.resolve(new URL(".", import.meta.url).pathname, "..");

// The fourth column is the preference list the frame is selected THROUGH, or
// null when the frame fires on an event of its own.
//
// THAT COLUMN IS THE WHOLE POINT. A slot is filled ONCE, with the FIRST name in
// its list the creature owns (public.ts, the anims.push block). CALM_POSES leads
// with "rest" — so a napper that also grazes can never select `graze`, because
// `rest` is picked first and the loop stops. Drawing that cell is a wasted cell,
// and the first version of this audit reported it as MISSING and would have sent
// eleven birds back to be redrawn for frames the driver could not have shown.
//
// An event frame is never shadowed: it is asked for by name, not searched for.
//
// EVERY WAY AN ANIMAL EATS NOW REACHES THE PICTURE (2026-09-18). Before that day
// `fxFed` was emitted from one place, inside `scavengerFeeds`, so the vulture was
// the only creature in the game whose eating was ever drawn. Grazing cleared
// hunger, healed the animal and printed a line in the room; a hunter ran prey
// down and tore into it; neither told the sprite, so both fed in text while
// standing idle on screen. The fix was two calls, not a redrawn sheet — and the
// frames that had been specced around the gap were being deleted as "wasted"
// right up until somebody asked whether the animals eat at all. They do.
//
// So the eating rows below are all EVENTS: scavengers and, once hungry, vermin
// and lurkers through `scavengerFeeds`; anything in PREYS_ON on a kill; grazers
// on forage ground. STARVE_HUNTERS is deliberately NOT a row — it decides when a
// thing goes hunting, not what happens when it catches something, and PREYS_ON
// is the set that actually reaches the kill.
const WANTS = [
  ["SCAVENGERS",     "feed",         "the fed event",                            null],
  ["VERMIN",         "feed",         "the fed event, once hungry",               null],
  ["LURKERS",        "feed",         "the fed event, once hungry",               null],
  ["PREYS_ON",       "feed",         "the fed event, on a kill it runs down",    null],
  ["GRAZERS",        "graze",        "the fed event, grazing forage ground",     null],
  ["THIEVES",        "snatch-escape","travel branch, first 55% of the crossing", null],
  ["NAPPERS",        "rest",         "SLEEP_POSES head + CALM_POSES head",       "CALM"],
  ["ALARM_CALLERS",  "alert-alarm",  "WATCH_POSES slot 3",                       "WATCH"],
];

// Read the real lists out of public.ts rather than restating them here, so this
// cannot drift from the driver the way a copied constant would.
const LISTS = {};
{
  const s = fs.readFileSync(path.join(GAME, "src/public.ts"), "utf8");
  for (const [key, name] of [["CALM", "CALM_POSES"], ["WATCH", "WATCH_POSES"]]) {
    const i = s.indexOf("var " + name + " = [");
    const body = s.slice(i, s.indexOf("];", i));
    // strip the long comments interleaved through both lists
    LISTS[key] = [...body.replace(/\/\/[^\n]*/g, "").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  }
}
// What actually gets picked for this creature out of that list.
const winner = (key, drawn) => (LISTS[key] || []).find((p) => drawn.includes(p));
// A wanted frame is only unreachable if the current winner sits EARLIER in the
// list than it does. Asking merely "is something else picked" gets this exactly
// backwards at the tail of a list: WATCH_POSES ends with "idle", which every
// creature owns, so that test called every alarm call unreachable when in fact
// an alarm call outranks idle and would be selected the moment it is drawn.
const shadows = (key, won, frame) => {
  const l = LISTS[key] || [];
  const a = l.indexOf(won), b = l.indexOf(frame);
  return a >= 0 && b >= 0 && a < b;
};

const zd = fs.readFileSync(path.join(GAME, "src/zone-data.ts"), "utf8");
const members = (n) => {
  const i = zd.search(new RegExp("^export const " + n + "\\b", "m"));
  if (i < 0) return new Set();
  // PREYS_ON is a Map of predator -> its prey, not a flat Set. Reading every
  // quoted word out of it would make every PREY look like a predator.
  if (n === "PREYS_ON") {
    const body = zd.slice(i, zd.indexOf("\n]);", i));
    return new Set([...body.matchAll(/\[\s*"([a-z0-9-]+)"\s*,\s*new Set/g)].map((m) => m[1]));
  }
  const body = zd.slice(i, zd.indexOf("]);", i));
  return new Set([...body.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
};
const SETS = Object.fromEntries(WANTS.map(([n]) => [n, members(n)]));

const src = fs.readFileSync(path.join(GAME, "src/public.ts"), "utf8");
// EAT_POSES, read from the driver. One eat frame is resolved per creature, so a
// creature that owns EITHER name can answer the fed event and every eating row
// is satisfied by it. Asking a crab for `feed` AND `graze` would be asking for a
// cell the driver has no second slot for.
const EAT = (() => {
  const t = src.indexOf("var EAT_POSES = [");
  return [...src.slice(t, src.indexOf("];", t)).matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
})();
const eats = (poses) => poses.some((p) => EAT.includes(p));
let blk = src.slice(src.indexOf("var MOB_ANIM = {"));
blk = blk.slice(0, blk.indexOf("\n};"));
const DRAWN = {};
for (const m of blk.matchAll(/^\s{2}"([a-z0-9-]+)":\s*\{ n: \d+, aspect: [\d.]+, f: (\{[^}]*\})/gm))
  DRAWN[m[1]] = Object.keys(JSON.parse(m[2]));

const only = process.argv.slice(2);
const rows = [];
const tally = Object.fromEntries(WANTS.map(([n]) => [n, [0, 0]]));

for (const id of Object.keys(DRAWN).sort()) {
  if (only.length && !only.includes(id)) continue;
  const wants = [];
  for (const [set, frame, note, list] of WANTS) {
    if (!SETS[set].has(id)) continue;
    // An eating row is answered by EITHER eat frame, because the driver resolves
    // one per creature and the fed event uses that one. A vermin grazer drawn
    // with `graze` is not missing `feed`; it is drawn eating.
    const has = EAT.includes(frame) ? eats(DRAWN[id]) : DRAWN[id].includes(frame);
    // Would the driver ever reach this name? Only matters when it is searched
    // for through a list and something earlier in that list is already drawn.
    const won = list && !has ? winner(list, DRAWN[id]) : null;
    const shadowed = !!won && shadows(list, won, frame);
    if (!shadowed) { tally[set][1]++; if (has) tally[set][0]++; }
    wants.push({ set, frame, has, note, shadowed, won });
  }
  if (wants.length) rows.push({ id, wants });
}

const gaps = rows.filter((r) => r.wants.some((w) => !w.has && !w.shadowed));
for (const r of gaps) {
  console.log(r.id.padEnd(24) + "[" + DRAWN[r.id].join(" ") + "]");
  for (const w of r.wants) {
    const state = w.has ? "have   " : w.shadowed ? "n/a    " : "MISSING";
    const why = w.shadowed ? "unreachable - \"" + w.won + "\" is picked first" : w.note;
    console.log("    " + state + " " + w.frame.padEnd(14) + w.set.padEnd(16) + why);
  }
}
const shadow = rows.reduce((n, r) => n + r.wants.filter((w) => w.shadowed).length, 0);
console.log("\n" + gaps.length + " of " + rows.length + " creatures are short a frame their behaviour asks for");
console.log(shadow + " more would be unreachable if drawn, and are not counted\n");
for (const [set, frame, note] of WANTS)
  console.log("  " + set.padEnd(16) + frame.padEnd(14) + String(tally[set][0]) + "/" + tally[set][1] + "   " + note);
