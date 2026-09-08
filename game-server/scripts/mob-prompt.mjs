// WRITE THE GENERATION PROMPT for one creature, ready to paste.
//
//   node scripts/mob-prompt.mjs hill-wolf
//   node scripts/mob-prompt.mjs hill-wolf idle move-a move-b attack rest death feed call
//
// With no poses given it proposes a set from what the world actually makes that
// creature do — a scavenger gets `feed`, a grazer gets `graze`, a pack caller
// gets `call` — and from what its strip is already missing. Override by listing
// poses yourself.
//
// The exact in-game description is pulled live from D1, because that prose is
// the subject paragraph and paraphrasing it is how a creature stops looking like
// itself. Attach an approved sheet as the style reference when you paste this.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");
const [id, ...given] = process.argv.slice(2);
if (!id) { console.error("usage: node scripts/mob-prompt.mjs <creature-id> [pose …]"); process.exit(2); }

// --- what the world makes this one do -------------------------------------
const zd = fs.readFileSync(path.join(GAME, "src/zone-data.ts"), "utf8");
const inSet = (n) => {
  const i = zd.search(new RegExp("^export const " + n + " = new Set", "m"));
  if (i < 0) return false;
  return zd.slice(i, zd.indexOf("]);", i)).includes(`"${id}"`);
};
const src = fs.readFileSync(path.join(GAME, "src/public.ts"), "utf8");
let blk = src.slice(src.indexOf("var MOB_ANIM = {")); blk = blk.slice(0, blk.indexOf("\n};"));
const row = blk.match(new RegExp(`^\\s{2}"${id}":\\s*\\{ n: \\d+, aspect: [\\d.]+, f: (\\{[^}]*\\})`, "m"));
const had = row ? Object.keys(JSON.parse(row[1])) : [];
const flyer = had.includes("up");

// --- the pose set --------------------------------------------------------
let poses = given.length ? given : (() => {
  const p = flyer ? ["idle", "up", "down", "glide", "landing"] : ["idle", "move-a", "move-b"];
  p.push("attack");
  if (inSet("NAPPERS")) p.push("rest");
  p.push("death");
  if (inSet("SCAVENGERS")) p.push("feed");
  if (inSet("GRAZERS") && !p.includes("feed")) p.push("graze");
  if (inSet("PACK_CALLERS")) p.push("call");
  if (inSet("DRINKERS") && p.length < 8) p.push("drink");
  if (inSet("RUNNERS") && p.length < 8) p.push("flee");
  // keep whatever species pose it already had, if there is room
  for (const h of had) if (p.length < 8 && !p.includes(h) && !["hit"].includes(h)) p.push(h);
  return p.slice(0, 8);
})();

const COLS = { 4: 2, 6: 3, 8: 4, 9: 3, 12: 4 }[poses.length];
if (!COLS) { console.error(poses.length + " poses — the cutter takes 4, 6, 8, 9 or 12"); process.exit(2); }
const ROWS = Math.ceil(poses.length / COLS);
const W = COLS * 512, H = ROWS * 512;

// --- the creature's own words --------------------------------------------
let name = id, desc = "";
try {
  const out = execFileSync(path.join(GAME, "node_modules/.bin/wrangler"),
    ["d1", "execute", "nomad", "--remote", "--json", "--command",
     `SELECT name, description FROM mob_templates WHERE id = '${id}';`],
    { cwd: GAME, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const r = JSON.parse(out.slice(out.indexOf("[")))[0].results[0];
  name = r.name; desc = r.description;
} catch { console.error("!! could not read the description from D1 — paste it in by hand\n"); }

// what each pose is, said the way the sheet needs it said
const SAY = {
  idle: "Natural resting alert stance",
  "move-a": "Locomotion contact pose A, natural species-specific gait",
  "move-b": "Locomotion passing pose B, opposite leg phase, same direction and body size",
  attack: "Natural physical attack for the species, full body in frame",
  rest: "Sleeping or lying up, low on the ground, eyes closed",
  death: "Dead, lying limp on its side, no gore and no effects",
  feed: "Feeding from a carcass on the ground, head down at the body",
  graze: "Head down cropping the ground, feeding",
  drink: "Head lowered to water, drinking",
  call: "Head up and mouth open, calling to the others at a distance",
  flee: "Running flat out directly away, full extension",
  up: "Wings at the top of the beat, in flight",
  down: "Wings at the bottom of the beat, in flight",
  glide: "Wings held straight and level, gliding",
  landing: "Landing, wings up and braking, feet reaching forward",
};

console.log(`# ${id} — ${poses.length} poses, ${COLS}x${ROWS} sheet at ${W}x${H}
# after generating:
#   node scripts/cut-mob-sheet.mjs <sheet.png> ${id} ${poses.join(" ")}
#   node scripts/build-mob-strips.mjs ${id} --patch && node scripts/audit-mob-strips.mjs
${"-".repeat(72)}
Use case: stylized-concept. Asset: NOMAD mountain mob animation sprite sheet.

The attached sheet is STYLE REFERENCE ONLY: match its handmade dark ink contours, etched crosshatching, dry muted mineral browns/greys, bone highlights, subdued colour, old dungeon-crawler bestiary remastered as crisp illustrated cutout art. Not photographic, not smooth painted/3D, not cartoon, not voxel. Species anatomy must remain authentic.

Subject: ${name}. Exact game description: ${desc || "[PASTE THE IN-GAME DESCRIPTION HERE]"}

Create ${poses.length} full-body poses of this SAME individual in a strict ${COLS} COLUMNS by ${ROWS} ROWS sheet, landscape ${W}x${H}. Each equal cell 512x512. Pure opaque solid #FF00FF MAGENTA everywhere outside the creature. Generous blank gutters at all four edges of each cell. Every wing, tail, limb and carried item fully contained WITHIN its cell. Never cross row or column boundaries. Consistent eye-level three-quarter camera, facing slightly toward the viewer's right. Consistent physical body scale across poses; size ALL poses to fit the widest wingspan. Stable body proportions and markings. Feet aligned near the lower edge in ground poses; flight body centred.

Reading order left to right, top row then bottom row:
${poses.map((p, i) => `${i + 1}. ${SAY[p] || p.replace(/-/g, " ")}`).join("\n")}

No invented magic, no armour on animals, no fire, smoke, dust, trails, glows, scenery, cast shadows, text, grid lines, labels, borders, humans except when the specified subject is human. Do not make the animal a dragon hybrid.`);
