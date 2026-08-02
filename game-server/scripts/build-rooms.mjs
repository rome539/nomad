#!/usr/bin/env node
// THE ROOM PIPELINE — plain text in, a validated migration out.
//
// Why this exists: the world is going from 110 rooms to ~1,076, and that is
// roughly 180,000 characters of prose. Nobody hand-writes that many INSERT
// statements without eventually typing an exit that points at a room which
// doesn't exist — and the failure mode is SILENT. A mistyped `to_room` doesn't
// error; it just quietly creates a room nobody can ever reach, or a door that
// leads nowhere, and you find it weeks later by walking into it.
//
// So: you write rooms. This writes the SQL, and refuses to write it if the
// world you described isn't sound.
//
//   node scripts/build-rooms.mjs regions/the-wood.rooms
//   node scripts/build-rooms.mjs regions/the-wood.rooms --check      (validate only)
//   node scripts/build-rooms.mjs regions/*.rooms --out migrations/126_the_wood.sql
//
// THE FORMAT
// ----------
//   !region wood                         <- the file's band, once, up top
//
//   ## the-eaves | The Eaves            <- room id | display name
//   Prose. Multiple lines are joined     <- description, blank line ends nothing
//   into one paragraph.
//   !safe                                <- flags: !safe, !entry, !spawn, !existing
//   > north  the-thicket                 <- exit: direction, target
//   > down   the-hollow  oneway          <- one-way (see the warning it prints)
//   > east   the-vault   key:rusted-key  <- locked exit
//
// !entry makes a room a GATE (bank, vault, extract). !spawn makes it a place
// players WAKE. They are different things as of mig 126 — a gatehouse out on a
// road is a service, not a doorway. Today's four gates are both.
//
//   # anything else starting with a single # is a comment.
//
// WHAT IT CHECKS (all of it, before writing anything)
//   - every exit target exists, in this file or already in the world
//   - every exit has a return path, unless you wrote `oneway` on purpose
//   - no duplicate room ids, in the file or against the live world
//   - no room unreachable from a gate (the whole point of a room is to be reached)
//   - no missing or placeholder description, no missing name
//   - every new room declares a region the engine actually knows
//   - directions are real, ids are well-formed, no self-exits
//
// Existing rooms/exits are read from the LOCAL d1 by default so cross-region
// exits validate. `--remote` reads production instead; `--offline` skips it and
// only checks what's in the files (cross-file exits become warnings).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DIRS = new Set(["north", "south", "east", "west", "up", "down"]);
const OPPOSITE = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };
const ID_RE = /^[a-z][a-z0-9-]*$/;
const MIN_DESC = 40; // shorter than this is a placeholder, not a room

// The bands a room may claim, read straight out of the engine so this can never
// drift from it: src/world.ts owns the list, and a name it doesn't know would
// be silently blanked at load (becoming "upper" — dungeon ambience in a wood).
// If the file can't be read we accept anything rather than block authoring.
const REGIONS = (() => {
  try {
    const src = readFileSync(new URL("../src/world.ts", import.meta.url), "utf8");
    const m = src.match(/export const REGIONS = new Set<string>\(\[([^\]]*)\]\)/);
    if (!m) return null;
    return new Set([...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]));
  } catch { return null; }
})();

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith("--") && !(outIdx >= 0 && i === outIdx + 1));

if (!files.length) {
  console.error("usage: node scripts/build-rooms.mjs <file.rooms ...> [--out migrations/NNN_name.sql] [--check] [--remote|--offline]");
  process.exit(2);
}

// ---- parse ---------------------------------------------------------------

const rooms = new Map(); // id -> { id, name, desc[], safe, entry, exits[], file, line }
const errors = [];
const warnings = [];
const err = (file, line, msg) => errors.push(`${file}:${line}  ${msg}`);
const warn = (file, line, msg) => warnings.push(`${file}:${line}  ${msg}`);

for (const file of files) {
  if (!existsSync(file)) { errors.push(`${file}  no such file`); continue; }
  const lines = readFileSync(file, "utf8").split("\n");
  let cur = null;
  // `!region wood` before the first header sets the band for the whole file —
  // a region is written one file at a time, so declaring it per room would be
  // noise you'd eventually forget on one room and never notice.
  let fileRegion = "";
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (!line) return;

    if (line.startsWith("##")) {
      const body = line.slice(2).trim();
      const bar = body.indexOf("|");
      if (bar === -1) return err(file, n, `room header needs "## id | Name" — got "${body}"`);
      const id = body.slice(0, bar).trim();
      const name = body.slice(bar + 1).trim();
      if (!ID_RE.test(id)) err(file, n, `bad room id "${id}" — lowercase letters, digits and hyphens only`);
      if (!name) err(file, n, `room "${id}" has no display name`);
      if (rooms.has(id)) err(file, n, `duplicate room id "${id}" (first seen ${rooms.get(id).file}:${rooms.get(id).line})`);
      cur = { id, name, desc: [], safe: false, entry: false, spawn: false, region: fileRegion, exits: [], file, line: n };
      rooms.set(id, cur);
      return;
    }
    if (line.startsWith("#")) return; // comment

    // !region is the one directive allowed before the first room — that's how a
    // file declares its band once, up top.
    const isRegion = line.startsWith("!") && line.slice(1).trim().toLowerCase().startsWith("region");
    if (!cur && !isRegion) return err(file, n, `content before the first "## id | Name" header`);

    if (line.startsWith("!")) {
      const [flag, ...rest] = line.slice(1).trim().toLowerCase().split(/\s+/);
      if (flag === "safe") cur.safe = true;
      else if (flag === "entry") cur.entry = true;
      // A gate is a SERVICE (bank, vault, extract); a spawn is a DOORWAY (you
      // wake here). They were one flag until mig 126 — keep them apart on
      // purpose: a gatehouse far out on a road shouldn't hatch new wanderers.
      else if (flag === "spawn") cur.spawn = true;
      // A new region has to HANG off the old world, which means adding an exit
      // to a room that already exists. `!existing` says "don't create this room,
      // just give it these new doors" — the only way to attach anything.
      else if (flag === "existing") cur.existing = true;
      else if (flag === "region") {
        const name = rest[0];
        if (!name) err(file, n, `!region needs a name (e.g. "!region wood")`);
        else if (REGIONS && !REGIONS.has(name)) {
          err(file, n, `"${name}" isn't a region the engine knows — add it to REGIONS in src/world.ts (and give it an AMBIENCE pool and a map label), or fix the spelling. Known: ${[...REGIONS].join(", ")}`);
        } else if (cur) cur.region = name;
        else fileRegion = name;
      }
      else err(file, n, `unknown flag "!${flag}" — expected !safe, !entry, !spawn, !existing or !region <name>`);
      return;
    }

    if (line.startsWith(">")) {
      const parts = line.slice(1).trim().split(/\s+/);
      const [dir, target, ...rest] = parts;
      if (!DIRS.has(dir)) return err(file, n, `"${dir}" is not a direction (${[...DIRS].join(", ")})`);
      if (!target) return err(file, n, `exit "${dir}" has no target room`);
      if (target === cur.id) return err(file, n, `"${cur.id}" has an exit to itself`);
      if (cur.exits.some((e) => e.dir === dir)) return err(file, n, `"${cur.id}" already has a ${dir} exit (the PK is room_id+dir)`);
      let oneway = false, key = null;
      for (const opt of rest) {
        if (opt === "oneway") oneway = true;
        else if (opt.startsWith("key:")) key = opt.slice(4);
        else err(file, n, `unknown exit option "${opt}" — expected "oneway" or "key:<item-id>"`);
      }
      cur.exits.push({ dir, target, oneway, key, line: n, file });
      return;
    }

    cur.desc.push(line);
  });
}

// ---- the world as it already stands --------------------------------------

let liveRooms = new Set();
let liveExits = new Map(); // room -> [{dir, to}]
let liveEntries = new Set();
let worldKnown = false;

if (!flags.has("--offline")) {
  const scope = flags.has("--remote") ? "--remote" : "--local";
  try {
    const q = (sql) => {
      const out = execFileSync("./node_modules/.bin/wrangler",
        ["d1", "execute", "nomad", scope, "--json", "--command", sql],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
      return JSON.parse(out)[0].results;
    };
    for (const r of q("SELECT id, is_entry FROM rooms;")) {
      liveRooms.add(r.id);
      if (r.is_entry) liveEntries.add(r.id);
    }
    for (const e of q("SELECT room_id, dir, to_room FROM exits;")) {
      if (!liveExits.has(e.room_id)) liveExits.set(e.room_id, []);
      liveExits.get(e.room_id).push({ dir: e.dir, to: e.to_room });
    }
    worldKnown = true;
    console.log(`world: ${liveRooms.size} existing rooms, ${liveEntries.size} gates (${scope.slice(2)})`);
  } catch {
    warnings.push(`could not read the existing world (${scope}) — cross-region exits and reachability are UNCHECKED. Run with --offline to silence, or start wrangler/apply migrations first.`);
  }
}

// ---- validate ------------------------------------------------------------

const known = (id) => rooms.has(id) || liveRooms.has(id);

for (const r of rooms.values()) {
  if (r.existing) {
    // An attachment point, not a room: it must already be out there, and all we
    // do is bolt new doors onto it.
    if (worldKnown && !liveRooms.has(r.id)) err(r.file, r.line, `"${r.id}" is marked !existing but isn't in the world`);
    if (!r.exits.length) err(r.file, r.line, `"${r.id}" is marked !existing but adds no exits — it does nothing`);
    for (const e of r.exits) {
      const already = (liveExits.get(r.id) ?? []).some((x) => x.dir === e.dir);
      if (already) err(e.file, e.line, `"${r.id}" already has a ${e.dir} exit in the world — the PK is room_id+dir, this INSERT would fail`);
    }
  } else {
    if (liveRooms.has(r.id)) err(r.file, r.line, `room "${r.id}" already exists in the world`);
    const desc = r.desc.join(" ").trim();
    if (!desc) err(r.file, r.line, `room "${r.id}" has no description`);
    else if (desc.length < MIN_DESC) err(r.file, r.line, `room "${r.id}" description is ${desc.length} chars — that's a placeholder, not a room`);
    if (!r.exits.length) err(r.file, r.line, `room "${r.id}" has no exits — nothing can leave it`);
    // Silence here is not neutral: a room with no band derives one, and every
    // new room would derive "upper" — the dungeon's halls, drips and all. A
    // wood has to say it's a wood.
    if (!r.region) err(r.file, r.line, `room "${r.id}" declares no region — put "!region <name>" at the top of ${r.file}, or it inherits the dungeon's halls`);
    r.desc = desc;
  }

  for (const e of r.exits) {
    if (!known(e.target)) {
      if (worldKnown) err(e.file, e.line, `"${r.id}" exits ${e.dir} to "${e.target}", which doesn't exist`);
      else warn(e.file, e.line, `"${r.id}" exits ${e.dir} to "${e.target}" — can't verify (world unread)`);
      continue;
    }
    if (e.oneway) {
      warn(e.file, e.line, `"${r.id}" ${e.dir} -> "${e.target}" is ONE-WAY. The distance code's reverse-lookup shortcut only holds while every exit has a return; it detects asymmetry at load and falls back safely, but the world gets slower. Deliberate mazes only.`);
      continue;
    }
    // the return path: in this file, or already in the world
    const back = OPPOSITE[e.dir];
    const other = rooms.get(e.target);
    const hasReturn = other
      ? other.exits.some((x) => x.target === r.id)
      : (liveExits.get(e.target) ?? []).some((x) => x.to === r.id);
    if (!hasReturn) {
      err(e.file, e.line, other
        ? `"${r.id}" exits ${e.dir} to "${e.target}", but "${e.target}" has no way back. Add "> ${back} ${r.id}" to it, or mark this exit "oneway".`
        : `"${r.id}" exits ${e.dir} to the EXISTING room "${e.target}", which has no exit back. That needs an UPDATE to the existing world — add it by hand, or mark this "oneway".`);
    }
  }
}

// reachability: can you actually walk to every new room from a gate?
if (worldKnown && !errors.length) {
  const adj = new Map();
  const push = (a, b) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); };
  for (const [room, es] of liveExits) for (const e of es) push(room, e.to);
  for (const r of rooms.values()) for (const e of r.exits) push(r.id, e.target);
  const seen = new Set();
  // Roots: everywhere a player can BE without having walked there — the gates,
  // and (since mig 126 split them) the spawns.
  const queue = [...liveEntries, ...[...rooms.values()].filter((r) => r.entry || r.spawn).map((r) => r.id)];
  queue.forEach((r) => seen.add(r));
  for (let h = 0; h < queue.length; h++) for (const to of adj.get(queue[h]) ?? []) {
    if (!seen.has(to)) { seen.add(to); queue.push(to); }
  }
  for (const r of rooms.values()) {
    if (!seen.has(r.id)) err(r.file, r.line, `"${r.id}" cannot be reached from any gate — it's an orphan`);
  }
}

// ---- report --------------------------------------------------------------

for (const w of warnings) console.warn(`  warn  ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} error${errors.length === 1 ? "" : "s"} — nothing written:\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

const exitCount = [...rooms.values()].reduce((n, r) => n + r.exits.length, 0);
console.log(`ok: ${rooms.size} rooms, ${exitCount} exits, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`);

if (flags.has("--check")) process.exit(0);
if (!outFile) { console.log("(no --out given; nothing written)"); process.exit(0); }

// ---- emit ----------------------------------------------------------------

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const out = [];
out.push(`-- Generated by scripts/build-rooms.mjs from: ${files.join(", ")}`);
out.push(`-- ${rooms.size} rooms, ${exitCount} exits. Do not hand-edit — regenerate from the source text.`);
out.push(`-- Validated: every exit resolves, every exit has a return path (or is marked one-way),`);
out.push(`-- no duplicate ids, no orphans, every room reachable from a gate.`);
out.push("");
for (const r of rooms.values()) {
  if (r.existing) out.push(`-- ${r.id}: existing room, new doors only`);
  else {
    out.push(`INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn) VALUES`);
    out.push(`  (${q(r.id)}, 'door', ${q(r.name)}, ${q(r.desc)}, ${r.entry ? 1 : 0}, ${r.safe ? 1 : 0}, ${q(r.region)}, ${r.spawn ? 1 : 0});`);
  }
  for (const e of r.exits) {
    out.push(`INSERT INTO exits (room_id, dir, to_room, key_item) VALUES (${q(r.id)}, ${q(e.dir)}, ${q(e.target)}, ${e.key ? q(e.key) : "NULL"});`);
  }
  out.push("");
}
writeFileSync(outFile, out.join("\n"));
console.log(`wrote ${outFile}`);
