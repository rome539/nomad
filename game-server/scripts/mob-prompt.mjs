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
if (!id) { console.error("usage: node scripts/mob-prompt.mjs <creature-id> [pose|pose=wording …]"); process.exit(2); }

// A POSE MAY CARRY ITS OWN WORDING: `graze=Turning wrack over with one boot`.
// SAY below is deliberately species-neutral - "head down cropping the ground"
// is right for a hind and wrong for a man working a tideline, and the pose NAME
// is what the client looks up, so the two have to be able to differ. Split the
// wording off here; the name is what goes in the cut command.
const WORDING = {};
for (let i = 0; i < given.length; i++) {
  const eq = given[i].indexOf("=");
  if (eq > 0) { WORDING[given[i].slice(0, eq)] = given[i].slice(eq + 1); given[i] = given[i].slice(0, eq); }
}

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
// A CACHE, BECAUSE D1 IS A REMOTE AND THE DESCRIPTION IS THE ONE THING THAT
// MUST BE EXACT. Generating the whole crossing book is 31 creatures and up to
// 40 wrangler calls, and on 2026-09-12 that run came back with FIVE creatures
// silently carrying "[PASTE THE IN-GAME DESCRIPTION HERE]" — the remote had
// started throttling somewhere in the middle. Nothing failed loudly; the prompts
// looked fine at a glance and would have generated five creatures with no
// subject paragraph at all.
//
// So every successful read is kept, and a failed read falls back to the last
// good one rather than to a placeholder. A cached description can go stale if
// the prose is edited, which is why the fallback SAYS it is using the cache.
const CACHE = path.join(GAME, ".mob-desc-cache.json");
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch {}

let name = id, desc = "", region = "";
try {
  const out = execFileSync(path.join(GAME, "node_modules/.bin/wrangler"),
    ["d1", "execute", "nomad", "--remote", "--json", "--command",
     `SELECT t.name, t.description, (SELECT r.region FROM mob_spawns s JOIN rooms r ON r.id = s.room_id` +
     ` WHERE s.template_id = t.id LIMIT 1) AS region FROM mob_templates t WHERE t.id = '${id}';`],
    { cwd: GAME, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const r = JSON.parse(out.slice(out.indexOf("[")))[0].results[0];
  name = r.name; desc = r.description; region = r.region || "";
  cache[id] = { name, desc, region: region || (cache[id] || {}).region || "" };
  try { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); } catch {}
} catch {
  if (cache[id]) {
    name = cache[id].name; desc = cache[id].desc; region = cache[id].region || "";
    console.error("!! D1 did not answer — using the CACHED description for " + id + ". Check it is current.\n");
  } else {
    console.error("!! could not read the description from D1 and nothing is cached — paste it in by hand\n");
  }
}
// A rare form has no fixed spawns of its own - it arrives on a roll against its
// base - so it reads no region from the join above. Take its base's.
if (!region) {
  try {
    const out = execFileSync(path.join(GAME, "node_modules/.bin/wrangler"),
      ["d1", "execute", "nomad", "--remote", "--json", "--command",
       `SELECT r.region FROM mob_variants v JOIN mob_spawns s ON s.template_id = v.base_id` +
       ` JOIN rooms r ON r.id = s.room_id WHERE v.variant_id = '${id}' LIMIT 1;`],
      { cwd: GAME, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    region = JSON.parse(out.slice(out.indexOf("[")))[0].results[0]?.region || "";
    if (region && cache[id]) { cache[id].region = region; try { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); } catch {} }
  } catch { region = (cache[id] || {}).region || ""; }
}

// WHETHER THE THING IS ALIVE, WHICH THE DESCRIPTION DOES NOT SAY.
//
// The crossing's prose is deliberately oblique about it. "It walks the causeway
// from end to end with a notched stick in one hand" does not tell a generator
// that the tide warden drowned two centuries ago, so the generator draws a wet
// man in a coat, and the whole point of the region walks out of the picture.
// Ten of the crossing's creatures are dead and the prose says so about none of
// them; the fowler got drawn as a living poacher on exactly this mistake.
//
// So it is read from the WORLD rather than written here: HOLLOW is the game's
// own register of things with nothing inside, and GRAVE_FLESH separates a wet
// body from bare bone. A sheet can no longer disagree with the tables that
// decide whether the thing bleeds.
//
// AND IT IS NOT A ZOMBIE, which is the note this most needs. The horror is that
// the work did not stop, so the picture has to be of somebody WORKING - not
// lurching, not reaching, not interested in you at all. Gore would make it a
// monster and make it boring. Every "no" below is load-bearing.
const WHAT_IT_IS = !inSet("HOLLOW") ? "" : inSet("GRAVE_FLESH") ? `
THIS IS NOT A LIVING PERSON. This one drowned here and did not stop working. Draw a DEAD BODY that is still upright and still doing its job. The skin is bleached to a waxy blue-white and swollen with water, the hands worst of all; hair plastered flat; the eyes open and clouded over with no light in them; the clothing sodden black all the way through, salt-crusted, with weed caught in it. There is a WHOLE BODY here: not a skeleton, no bare bone, no exposed ribs, no open wounds, no gore, no rot, no missing flesh, no torn-away face. No glowing eyes, no aura, no mist, no supernatural effect of any kind. The wrongness is entirely in the colour of the skin and in the fact that the work has not stopped. It is not menacing the viewer and not looking at the viewer: it is finishing a shift that ended two hundred years ago, and the viewer is not part of it.

THE EYES ARE A MARKER COLOUR, NOT A DESIGN CHOICE. Draw the visible part of both eyes as flat solid opaque #00D0D0 CYAN, filling the whole eye opening edge to edge, with no highlight, no pupil, no iris detail and no dark line drawn across them. NOTHING ELSE anywhere on this sheet may be cyan or near cyan. This is not the colour the eyes end up: it is a key the pipeline replaces, exactly the way the magenta background is. Everything else about the eyes stays as you would draw them - the same shape, the same size, the same set in the face, looking the same way in each pose.
` : `
THIS IS NOT A LIVING PERSON. There is nothing inside it. Draw old dry remains held together and still moving: bone and hardened leather-dry tissue, no wet flesh and no blood anywhere. No aura, no mist, no supernatural effect of any kind.

THE EYES ARE A MARKER COLOUR, NOT A DESIGN CHOICE. Fill the whole of each eye socket with flat solid opaque #00D0D0 CYAN, edge to edge, no highlight and no detail inside it. NOTHING ELSE anywhere on this sheet may be cyan or near cyan. This is not the colour they end up: it is a key the pipeline replaces, exactly the way the magenta background is.
`;

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
  takeoff: "Leaving the ground, crouched and shoving off, wings not yet biting air",
  alert: "Has seen you and decided about it - the species' own threat or fixing posture, body committed",
  watch: "Stopped and looking, head up, weight settled, not yet moving",
  recover: "Pulling back after a blow, body returning to its guard",
  bask: "Settled still and flat in a warm spot, not asleep but not going anywhere",
  hit: "Struck and rocked by it, body recoiling away from the blow, no wound drawn",
  bite: "A closing bite with the jaws, head and neck committed",
  sweep: "A wide swinging blow across the body, full reach",
  "hold-ground": "Refusing to give the ground - square on, braced, not retreating",
  "snatch-escape": "Going away fast with something taken, clutched to the body",
};

console.log(`# ${id} — ${poses.length} poses, ${COLS}x${ROWS} sheet at ${W}x${H}
# after generating:
#   node scripts/cut-mob-sheet.mjs <sheet.png> ${id} ${poses.join(" ")}
#   node scripts/build-mob-strips.mjs ${id} --patch && node scripts/audit-mob-strips.mjs
${"-".repeat(72)}
Use case: stylized-concept. Asset: NOMAD ${region || "world"} mob animation sprite sheet.

The attached sheet is STYLE REFERENCE ONLY: match its handmade dark ink contours, etched crosshatching, dry muted mineral browns/greys, bone highlights, subdued colour, old dungeon-crawler bestiary remastered as crisp illustrated cutout art. Not photographic, not smooth painted/3D, not cartoon, not voxel. Species anatomy must remain authentic.

Subject: ${name}. Exact game description: ${desc || "[PASTE THE IN-GAME DESCRIPTION HERE]"}
${WHAT_IT_IS}
Create ${poses.length} full-body poses of this SAME individual in a strict ${COLS} COLUMNS by ${ROWS} ROWS sheet, landscape ${W}x${H}. Each equal cell 512x512. Pure opaque solid #FF00FF MAGENTA everywhere outside the creature. Generous blank gutters at all four edges of each cell. Every wing, tail, limb and carried item fully contained WITHIN its cell. Never cross row or column boundaries. Consistent eye-level three-quarter camera, facing slightly toward the viewer's right. Consistent physical body scale across poses; size ALL poses to fit the widest wingspan. Stable body proportions and markings. Feet aligned near the lower edge in ground poses; flight body centred.

Reading order left to right, top row then bottom row:
${poses.map((p, i) => `${i + 1}. ${WORDING[p] || SAY[p] || p.replace(/-/g, " ")}`).join("\n")}

No invented magic, no armour on animals, no fire, smoke, dust, trails, glows, scenery, cast shadows, text, grid lines, labels, borders, humans except when the specified subject is human. Do not make the animal a dragon hybrid.`);
