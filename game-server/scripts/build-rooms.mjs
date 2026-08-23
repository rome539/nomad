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
// A compass step on the paper (mig 166). Up/down are drawn as diagonals — a
// cutaway, so a stair reads as going somewhere rather than landing on its own
// landing. Same table the bake used, and it must stay the same table.
const DELTA = {
  north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0], up: [-1, -1], down: [1, 1],
};
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
// --why: name every square collision as the walk hits it, so a contradicting
// loop can be tracked to the door that causes it instead of guessed at.
const why = flags.has("--why");
// --rewrite: the region in these files is ALREADY in the world, and this run is
// correcting it in place rather than adding ground. Without it the builder is
// strictly additive and refuses to touch a room that exists — which is right,
// because silently redefining live rooms is how a world loses its history.
//
// It exists because the mountain shipped with its five tier-to-tier throats
// written as `east`, so a region whose entire premise is a climb was laid out
// running sideways across the chart (coordinates are DERIVED from the exit
// verbs — see DELTA). Fixing that means changing exits and re-walking the
// coordinates of rooms that are already live, and the alternative was hand-
// written room SQL, which this pipeline exists to prevent.
//
// What it emits instead of INSERTs, for rooms that already exist:
//   UPDATE rooms SET ... (prose and square, so a corrected file is the truth)
//   DELETE FROM exits WHERE room_id = ...  then re-INSERT that room's doors
// Attachment (!existing) rooms keep theirs, written INSERT OR REPLACE so a
// re-run is idempotent. Room IDs never change, so `walked`, `wall_marks` and
// anything else keyed on a room survives untouched.
const rewrite = flags.has("--rewrite");
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith("--") && !(outIdx >= 0 && i === outIdx + 1));

if (!files.length) {
  console.error("usage: node scripts/build-rooms.mjs <file.rooms ...> [--out migrations/NNN_name.sql] [--check] [--remote|--offline]");
  process.exit(2);
}

// ---- parse ---------------------------------------------------------------

const rooms = new Map(); // id -> { id, name, desc[], safe, entry, exits[], file, line }
const dups = [];         // second declarations of an id — resolved after parsing (see the header parser)
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
      cur = { id, name, desc: [], safe: false, entry: false, spawn: false, region: fileRegion, exits: [], file, line: n };
      // A REDECLARATION IS NOT AUTOMATICALLY A MISTAKE. A region authored one
      // tier per file names the previous tier's boundary room as !existing so
      // it can bolt the throat onto it — correct when the files are built in
      // order, one at a time, and the earlier tier is already live. Build the
      // whole region at once (which a rewrite must) and that same room is
      // declared twice: once for real, once as a stub.
      //
      // So the decision is deferred to the end of parsing, when the !existing
      // flag on the line BELOW this header has actually been read. Two real
      // declarations are still a duplicate and still an error.
      if (rooms.has(id)) { dups.push(cur); return; }
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
const liveCoords = new Map(); // room id -> its baked square on the paper (mig 166)
const liveBands = new Map();  // room id -> which stratum it is drawn in (mig 167's stair check)
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
    for (const r of q("SELECT id, is_entry, map_x, map_y FROM rooms;")) {
      liveRooms.add(r.id);
      if (r.is_entry) liveEntries.add(r.id);
      // Where the world already sits on the paper (mig 166) — the seed the new
      // ground is laid out from, so nothing already drawn ever moves.
      if (r.map_x !== null && r.map_x !== undefined) liveCoords.set(r.id, { x: r.map_x, y: r.map_y ?? 0 });
      // The band a room is drawn in, read off its own y once the bake exists —
      // strata are stacked and never overlap, so the row IS the stratum.
      if (r.map_y !== null && r.map_y !== undefined) liveBands.set(r.id, r.map_y);
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

// ---- resolve redeclarations ----------------------------------------------
// One of the two has to be an !existing stub — a file saying "this room is
// already out there, here is the door I am adding to it". Fold that door into
// the real declaration and drop the stub. Two real rooms with one id is still
// exactly the mistake it always was.
for (const d of dups) {
  const first = rooms.get(d.id);
  const stub = d.existing ? d : (first.existing ? first : null);
  const real = stub === d ? first : (stub === first ? d : null);
  if (!stub || !real || stub.existing === real.existing) {
    err(d.file, d.line, `duplicate room id "${d.id}" (first seen ${first.file}:${first.line})`);
    continue;
  }
  for (const e of stub.exits) {
    const clash = real.exits.find((x) => x.dir === e.dir);
    if (clash && clash.target !== e.target) {
      err(e.file, e.line, `"${d.id}" is declared !existing here with a ${e.dir} exit to "${e.target}", but it is authored at ${real.file}:${real.line} with ${e.dir} -> "${clash.target}"`);
      continue;
    }
    if (!clash) real.exits.push(e);
  }
  rooms.set(d.id, real); // the real room wins; the stub was only ever a doorway
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
      // On a rewrite the door is expected to be there already: it is this
      // region's own attachment, written INSERT OR REPLACE below.
      if (already && !rewrite) err(e.file, e.line, `"${r.id}" already has a ${e.dir} exit in the world — the PK is room_id+dir, this INSERT would fail`);
    }
  } else {
    if (liveRooms.has(r.id) && !rewrite) err(r.file, r.line, `room "${r.id}" already exists in the world`);
    if (rewrite && worldKnown && !liveRooms.has(r.id)) warnings.push(`--rewrite: "${r.id}" is not in the world yet; it will be inserted as new ground.`);
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
    // THE RETURN PATH: in these files, or already standing in the world.
    //
    // This used to consult the world ONLY when the target room was absent from
    // the files entirely — so an !existing attachment stub, which by definition
    // declares nothing but the new door being bolted onto it, always read as
    // having no way back. That is why the six mountain files could not be
    // checked together: 34 false one-ways, every one of them a real door that
    // was already in the DB from the tier built before it.
    //
    // The rule is about whose doors this run REPLACES. A room authored here as
    // new ground has its exits written from the file and nothing else, so only
    // the file counts. An attachment — or a room not in these files at all —
    // keeps what the world already gave it, so the world counts too.
    const back = OPPOSITE[e.dir];
    const other = rooms.get(e.target);
    const inFile = other ? other.exits.some((x) => x.target === r.id) : false;
    const authoredHere = other && !other.existing;
    const hasReturn = authoredHere
      ? inFile
      : inFile || (liveExits.get(e.target) ?? []).some((x) => x.to === r.id);
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

// ---- lay the new ground out on the paper ---------------------------------
//
// THE MAP IS DATA (mig 166). A room's square is a fact about the room, not
// something the server works out at load, so the pipeline has to author it —
// exactly the way it authors the room's name. New rooms are walked out from the
// EXISTING rooms they attach to, using their baked coordinates as the seed, so a
// new region lands against the world in the direction its own doors say and not
// one square anywhere else moves.
//
// Where the new ground contradicts itself (a loop whose compass steps don't
// close) the walk puts the loser on the nearest free square, same as the bake
// did. That is a defect in the ROOMS, and it is now visible, fixed, and fixable
// one door at a time instead of shifting under you every deploy.
const coords = new Map();
if (worldKnown) {
  // A rewrite must NOT seed the region's own rooms from their live squares, or
  // the walk finds them already placed and re-emits exactly the layout being
  // corrected. Everything outside these files still seeds normally, so the
  // region re-walks from the world it attaches to and nothing else moves.
  for (const [id, p] of liveCoords) {
    if (rewrite && rooms.has(id) && !rooms.get(id).existing) continue;
    coords.set(id, p);
  }
  const occupied = new Set([...coords.values()].map((p) => `${p.x},${p.y}`));
  // Who holds each square, so --why can name the room a loser collided with.
  const holder = new Map();
  for (const [id, p] of coords) holder.set(`${p.x},${p.y}`, id);
  const claim = (id, x, y) => {
    if (!occupied.has(`${x},${y}`)) { occupied.add(`${x},${y}`); holder.set(`${x},${y}`, id); coords.set(id, { x, y }); return true; }
    if (why) console.log(`  square (${x}, ${y}) wanted by "${id}" is held by "${holder.get(`${x},${y}`) ?? "?"}"`);
    for (let ring = 1; ring <= 200; ring++) {
      for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        if (!occupied.has(`${x + dx},${y + dy}`)) {
          occupied.add(`${x + dx},${y + dy}`);
          holder.set(`${x + dx},${y + dy}`, id);
          coords.set(id, { x: x + dx, y: y + dy });
          return false;
        }
      }
    }
    coords.set(id, { x, y });
    return false;
  };
  // Seed: every new room that touches ground already on the paper.
  const queue = [];
  let shoved = 0;
  for (const r of rooms.values()) {
    if (r.existing || coords.has(r.id)) continue;
    for (const e of r.exits) {
      const anchor = coords.get(e.target);
      const d = DELTA[e.dir];
      if (!anchor || !d) continue;
      // MINUS, not plus: `dir` points from the NEW room to the old one, so the
      // new room sits back the other way. (Got this backwards first time and the
      // probe landed three squares west of where its own door said.)
      if (!claim(r.id, anchor.x - d[0], anchor.y - d[1])) shoved++;
      queue.push(r.id);
      break;
    }
  }
  // ...and outward from those, through the new ground.
  for (let h = 0; h < queue.length; h++) {
    const p = coords.get(queue[h]);
    for (const e of (rooms.get(queue[h])?.exits ?? [])) {
      if (coords.has(e.target) || !rooms.has(e.target)) continue;
      const d = DELTA[e.dir];
      if (!d) continue;
      if (!claim(e.target, p.x + d[0], p.y + d[1])) shoved++;
      queue.push(e.target);
    }
  }
  // Anything the walk never reached (an island attached only through a room in
  // another region) goes clear to the right of everything, once.
  let edge = 0;
  for (const p of coords.values()) edge = Math.max(edge, p.x);
  for (const r of rooms.values()) {
    if (r.existing || coords.has(r.id)) continue;
    claim(r.id, edge += 3, 0);
  }
  if (why) for (const r of rooms.values()) {
    if (r.existing) continue;
    const p = coords.get(r.id);
    console.log(`  AT ${p ? `${p.x},${p.y}` : "?"}\t${r.id}`);
  }
  if (shoved) warnings.push(`${shoved} new room${shoved === 1 ? "" : "s"} could not sit where ${shoved === 1 ? "its" : "their"} own exits say — the ground contradicts itself there (a loop whose compass steps don't close). Drawn on the nearest free square; fix the doors if it matters.`);
}

// THE THROAT CHECK — how many rooms would somebody have to stand in to seal
// this ground off from every gate in the world? (rome, 2026-08-03, after the
// dens: is this even scalable for when more players arrive? and then, on the
// fix: how will we make this scalable?)
//
// This is the check that makes the answer scalable instead of a one-off repair.
// The den ground turned out to be sealable by FOUR rooms — and so was the whole
// west with it, 241 of 390 rooms and not one gate among them, because the road
// was authored as a single line and the wood funnels through its rides. Nobody
// wrote that; it accumulated, one region at a time, and it was invisible until
// somebody had a reason to walk it with full pockets.
//
// Every region added from here — the east road, the Crossing, the mountain —
// can do exactly the same thing, and will, unless something counts. So the
// pipeline counts it: a max-flow/min-cut with every room worth 1 (a room is a
// place one person can stand), sources = every gate and spawn, sink = the new
// ground. The answer is literally "how many people does it take to own this".
//
// It is a WARNING, not an error. A dead-end pocket hanging off one room is
// legitimate level design; 200 rooms behind one is a mistake. The threshold
// scales with what is behind it, because that is the thing that actually
// matters: sealing off a 6-room pocket costs the world nothing, sealing off a
// quarter of it costs everything.
function throatOf(adj, sources, target) {
  // Vertex capacities: split each room into in/out with capacity 1, except the
  // sources and the target ground (infinite — you cannot camp your objective).
  const INF = 1e9;
  const cap = new Map(), nbr = new Map();
  const key = (a, b) => `${a}\u0000${b}`;
  const add = (u, v, c) => {
    cap.set(key(u, v), (cap.get(key(u, v)) ?? 0) + c);
    if (!nbr.has(u)) nbr.set(u, new Set());
    if (!nbr.has(v)) nbr.set(v, new Set());
    nbr.get(u).add(v); nbr.get(v).add(u);
    if (!cap.has(key(v, u))) cap.set(key(v, u), 0);
  };
  const all = new Set([...adj.keys()]);
  for (const es of adj.values()) for (const to of es) all.add(to);
  for (const r of all) add(`${r}>in`, `${r}>out`, (sources.has(r) || target.has(r)) ? INF : 1);
  for (const [u, es] of adj) for (const to of es) add(`${u}>out`, `${to}>in`, INF);
  const S = "SRC>out", T = "SNK>in";
  for (const r of sources) add(S, `${r}>in`, INF);
  for (const r of target) add(`${r}>out`, T, INF);
  let flow = 0;
  for (;;) {
    const par = new Map([[S, null]]);
    const q = [S];
    for (let h = 0; h < q.length && !par.has(T); h++) {
      for (const v of nbr.get(q[h]) ?? []) {
        if (!par.has(v) && (cap.get(key(q[h], v)) ?? 0) > 0) { par.set(v, q[h]); q.push(v); }
      }
    }
    if (!par.has(T)) break;
    let f = INF;
    for (let v = T; par.get(v) !== null; v = par.get(v)) f = Math.min(f, cap.get(key(par.get(v), v)));
    for (let v = T; par.get(v) !== null; v = par.get(v)) {
      cap.set(key(par.get(v), v), cap.get(key(par.get(v), v)) - f);
      cap.set(key(v, par.get(v)), (cap.get(key(v, par.get(v))) ?? 0) + f);
    }
    flow += f;
  }
  // The cut itself, for the report: rooms whose in-side is reachable and
  // out-side isn't. Those are the squares somebody would stand in.
  const seen = new Set([S]); const q2 = [S];
  for (let h = 0; h < q2.length; h++) for (const v of nbr.get(q2[h]) ?? []) {
    if (!seen.has(v) && (cap.get(key(q2[h], v)) ?? 0) > 0) { seen.add(v); q2.push(v); }
  }
  const cut = [...all].filter((r) => seen.has(`${r}>in`) && !seen.has(`${r}>out`));
  // And what is sealed off behind it.
  const behind = new Set(target); const q3 = [...target];
  const cutSet = new Set(cut);
  for (let h = 0; h < q3.length; h++) for (const to of adj.get(q3[h]) ?? []) {
    if (!behind.has(to) && !cutSet.has(to)) { behind.add(to); q3.push(to); }
  }
  return { flow, cut, behind: behind.size };
}

if (worldKnown && !errors.length && rooms.size) {
  const adj = new Map();
  const push = (a, b) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); };
  for (const [room, es] of liveExits) for (const e of es) push(room, e.to);
  for (const r of rooms.values()) for (const e of r.exits) push(r.id, e.target);
  const sources = new Set([...liveEntries, ...[...rooms.values()].filter((r) => r.entry || r.spawn).map((r) => r.id)]);
  // The GROUND BEING ADDED — the genuinely new rooms only. An `!existing` entry
  // is an attachment point that already stands in the world (and is often right
  // next to a gate), so counting it as new ground gives every route a free ride
  // and the check reads as infinitely well-connected.
  const target = new Set([...rooms.values()].filter((r) => !r.existing).map((r) => r.id));
  for (const s of sources) target.delete(s);
  if (target.size && sources.size) {
    const { flow, cut, behind } = throatOf(adj, sources, target);
    // One route per ~40 rooms shut in behind it, floor of 2: a pocket may hang
    // off a single door, a province may not.
    const want = Math.max(2, Math.ceil(behind / 40));
    const line = `THROAT: it takes ${flow} room${flow === 1 ? "" : "s"} to seal this ground off from every gate (${cut.join(", ")}) — ${behind} rooms shut in behind them.`;
    if (flow < want) warnings.push(`${line} That wants at least ${want}. Give this ground another way in that doesn't share the others' route, or it belongs to whoever stands in ${flow === 1 ? "that room" : "those rooms"}.`);
    else console.log(`  ${line} (wants ${want}) ok`);
  }
}

// THE STAIRS MUST FALL STRAIGHT DOWN (mig 167). A cutaway is only honest if the
// way between two strata is drawn as a short thread, not a long diagonal across
// the sheet. This has now been broken twice — once by laying every band out from
// its own left edge, and once by me deleting the fix while replacing the layout
// with a bake — and nothing caught it either time, because nothing measured it.
// Now something does, on every build, whether or not this file touched a stair.
if (worldKnown && !errors.length && liveCoords.size) {
  // Strata are stacked with a gap between them, so the stripes fall out of the
  // sorted rows: any jump of more than 2 rows starts a new stratum.
  const rowsUsed = [...new Set(liveBands.values())].sort((a, b) => a - b);
  const stripe = new Map();
  let band = 0;
  for (let i = 0; i < rowsUsed.length; i++) {
    if (i && rowsUsed[i] - rowsUsed[i - 1] > 2) band++;
    stripe.set(rowsUsed[i], band);
  }
  const bandOfId = new Map();
  for (const [id, y] of liveBands) bandOfId.set(id, stripe.get(y));
  for (const r of rooms.values()) {
    const c = coords.get(r.id);
    if (!r.existing && c) bandOfId.set(r.id, stripe.get(c.y) ?? 1);
  }
  let drift = 0, stairs = 0, worst = 0, worstAt = "";
  const seen = new Set();
  const allExits = new Map(liveExits);
  for (const r of rooms.values()) allExits.set(r.id, (allExits.get(r.id) ?? []).concat(r.exits.map((e) => ({ dir: e.dir, to: e.target }))));
  for (const [from, es] of allExits) {
    for (const e of es) {
      const a = coords.get(from) ?? liveCoords.get(from);
      const b = coords.get(e.to) ?? liveCoords.get(e.to);
      const ba = bandOfId.get(from), bb = bandOfId.get(e.to);
      if (!a || !b || ba === undefined || bb === undefined || ba === bb) continue;
      const key = from < e.to ? `${from}|${e.to}` : `${e.to}|${from}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const d = Math.abs(a.x - b.x);
      drift += d; stairs++;
      if (d > worst) { worst = d; worstAt = `${from} <-> ${e.to}`; }
    }
  }
  if (stairs) {
    const avg = drift / stairs;
    const line = `STAIRS: ${stairs} ways between strata, average ${avg.toFixed(1)} squares of sideways drift (worst ${worst}, ${worstAt}).`;
    if (avg > 4) warnings.push(`${line} A stratum is hanging off to one side instead of under the one it descends from — re-bake the band offsets (see mig 167).`);
    else console.log(`  ${line} ok`);
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
  const live = rewrite && liveRooms.has(r.id) && !r.existing;
  if (r.existing) out.push(`-- ${r.id}: existing room, new doors only`);
  else if (live) {
    // Correcting ground that is already out there: the room keeps its id (and
    // so keeps every trace, mark and memory keyed on it) and takes the file's
    // prose and the re-walked square. Its old doors go first, or a dir that
    // moved would leave the stale one behind next to the new one.
    const at = coords.get(r.id);
    out.push(`UPDATE rooms SET name = ${q(r.name)}, description = ${q(r.desc)}, is_entry = ${r.entry ? 1 : 0}, is_safe = ${r.safe ? 1 : 0},`);
    out.push(`  region = ${q(r.region)}, is_spawn = ${r.spawn ? 1 : 0}, map_x = ${at ? at.x : "NULL"}, map_y = ${at ? at.y : "NULL"} WHERE id = ${q(r.id)};`);
    out.push(`DELETE FROM exits WHERE room_id = ${q(r.id)};`);
  } else {
    const at = coords.get(r.id);
    out.push(`INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, map_x, map_y) VALUES`);
    out.push(`  (${q(r.id)}, 'door', ${q(r.name)}, ${q(r.desc)}, ${r.entry ? 1 : 0}, ${r.safe ? 1 : 0}, ${q(r.region)}, ${r.spawn ? 1 : 0}, ${at ? at.x : "NULL"}, ${at ? at.y : "NULL"});`);
  }
  for (const e of r.exits) {
    // OR REPLACE on a rewrite only: an attachment room's door is already out
    // there, and a plain INSERT would collide on the room_id+dir primary key.
    const verb = rewrite ? "INSERT OR REPLACE INTO" : "INSERT INTO";
    out.push(`${verb} exits (room_id, dir, to_room, key_item) VALUES (${q(r.id)}, ${q(e.dir)}, ${q(e.target)}, ${e.key ? q(e.key) : "NULL"});`);
  }
  out.push("");
}
writeFileSync(outFile, out.join("\n"));
console.log(`wrote ${outFile}`);
