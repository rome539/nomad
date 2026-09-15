// EVERY ROOM IN A REGION WITH ITS OWN TERRAIN TABLE MUST RESOLVE TO A TERRAIN.
//
// CROSSING_RULES runs INSTEAD of the common table, not in front of it, so a
// crossing room it does not match gets terrain "" — and an empty terrain drops
// the client out of the layered scene path onto the old band wash. That is not
// a missing picture, it is the WRONG picture: three unlit rooms inside the tide
// cave painted a daylit storm beach, one of them while telling the player to
// their face that it was pitch dark.
//
// The table's own comment says it is complete. It was, for the 212 rooms the
// region had the day it was written; migration 279 cut the sea cave afterwards
// and three of its rooms carried no word the table knew. A comment cannot keep
// that promise. This test can.
//
// Rooms come from BOTH sources, because the cave lives in neither alone: the
// authored regions/*.rooms files, and any migration that inserts rooms directly.
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.join(HERE, "..");
const Z = fs.readFileSync(path.join(ROOT, "src/zone-data.ts"), "utf8");

// Lift the real table — never a retyped copy.
function liftRules(name) {
  const at = Z.search(new RegExp(name + "[^=]*="));
  const tp = Z.indexOf("][] =", at);
  let i = Z.indexOf("[", Z.indexOf("=", tp >= 0 && tp < at + 80 ? tp + 3 : at));
  let depth = 0, j = i, inStr = null, inCmt = null, inRe = false;
  for (; j < Z.length; j++) {
    const c = Z[j], d = Z[j + 1];
    if (inCmt) { if (c === "\n") inCmt = null; continue; }
    if (inStr) { if (c === "\\") j++; else if (c === inStr) inStr = null; continue; }
    if (inRe) { if (c === "\\") j++; else if (c === "/") inRe = false; continue; }
    if (c === "/" && d === "/") { inCmt = 1; j++; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === "/" && "[ ,".includes(Z[j - 1])) { inRe = true; continue; }
    if (c === "[") depth++; else if (c === "]") { depth--; if (!depth) { j++; break; } }
  }
  const o = {}; new Function("t", "t.v = " + Z.slice(i, j).replace(/\/\/[^\n]*/g, ""))(o);
  return o.v;
}
const RULES = liftRules("CROSSING_RULES");

// Every crossing room we can see statically, with its DESCRIPTION, because
// terrainOf reads the id first and then the prose - a test that checked only
// ids would fail on rooms the real function resolves perfectly well.
const rooms = new Map();   // id -> { desc, where, entry }
// A SQL row is ('id', zone, 'Name', 'Description', is_entry, ...). Scan it
// properly rather than with a regex: descriptions contain commas, brackets and
// escaped apostrophes.
function sqlFields(txt, from) {
  const out = []; let i = from, cur = "", inStr = false, depth = 0;
  for (; i < txt.length; i++) {
    const c = txt[i];
    if (inStr) {
      if (c === "'" && txt[i + 1] === "'") { cur += "'"; i++; continue; }
      if (c === "'") { inStr = false; continue; }
      cur += c; continue;
    }
    if (c === "'") { inStr = true; continue; }
    if (c === "(") { depth++; if (depth === 1) continue; }
    if (c === ")") { depth--; if (!depth) { out.push(cur.trim()); break; } }
    if (c === "," && depth === 1) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  return out;
}
const regionsDir = path.join(ROOT, "regions");
for (const f of fs.readdirSync(regionsDir).filter(f => f.startsWith("crossing") && f.endsWith(".rooms"))) {
  const lines = fs.readFileSync(path.join(regionsDir, f), "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+([a-z0-9-]+)\s*\|/);
    if (!m) continue;
    const body = (lines[i + 1] || "").trim();
    if (body === "!existing") continue;            // a stub for a room owned elsewhere
    rooms.set(m[1], { desc: body, where: f, entry: false });
  }
}
const migDir = path.join(ROOT, "migrations");
for (const f of fs.readdirSync(migDir).filter(f => f.endsWith(".sql")).sort()) {
  const txt = fs.readFileSync(path.join(migDir, f), "utf8");
  if (!txt.includes("INTO rooms")) continue;
  let at = 0;
  while ((at = txt.indexOf("('", at)) >= 0) {
    const fl = sqlFields(txt, at); at += 2;
    if (fl.length < 8 || !/^[a-z0-9-]+$/.test(fl[0]) || !fl.includes("crossing")) continue;
    rooms.set(fl[0], { desc: fl[3] || "", where: f, entry: fl[4] === "1" });
  }
}

function terrainOf(id, desc) {
  for (const [name, re] of RULES) if (re.test(id)) return name;
  if (desc) { const d = desc.toLowerCase(); for (const [name, re] of RULES) if (re.test(d)) return name; }
  return "";
}
// A GATE IS NOT A GROUND. Entry rooms never reach terrainOf at all - the status
// frame sends "gate:<id>" for them and GATE_PLATE answers - so they are out of
// this test's scope by construction, not by convenience.
const bare = [...rooms.entries()]
  .filter(([, r]) => !r.entry)
  .filter(([id, r]) => !terrainOf(id, r.desc));
console.log("crossing rooms found statically: " + rooms.size);
if (bare.length) {
  console.log("\nFAIL - these match no CROSSING_RULES entry, so they fall out of the");
  console.log("layered scene path and paint the old band wash instead:");
  for (const [id, r] of bare) console.log("  " + id.padEnd(26) + r.where);
  console.log("\nAdd each to the rule for the ground it actually is.");
  process.exit(1);
}
console.log("every one resolves to a terrain - none falls through to the wash");
