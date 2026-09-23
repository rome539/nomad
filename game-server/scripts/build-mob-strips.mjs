// BUILD THE CREATURE STRIPS.
//
// A creature's animation is ONE horizontal strip: n frames side by side in a
// single .webp, which the client shows through a window exactly one frame wide
// (background-size: n*100% 100%, stepping background-position-x). The client
// reads MOB_ANIM to know how many frames there are, the shape of one, and which
// index each named pose sits at.
//
// This script takes a folder of pose PNGs per creature and packs them into that
// strip, then prints the MOB_ANIM rows to paste (or --write to patch them in).
//
//   node scripts/build-mob-strips.mjs                  # DRY RUN - writes nothing
//   node scripts/build-mob-strips.mjs --write          # build the strips
//   node scripts/build-mob-strips.mjs --patch          # ...and edit MOB_ANIM too
//   node scripts/build-mob-strips.mjs the-drake        # one creature, named
//
// WHY IT IS BUILT THE WAY IT IS - every step below is a bug that cost a session:
//
//  * ONE COORDINATE FRAME. All of a creature's poses are cropped by the SAME
//    rect (the union of their ink), so the creature does not jump between
//    frames. Cropping each pose to its own bbox looks fine one frame at a time
//    and swims horribly in motion.
//  * BOTTOM-ALIGNED PADDING FIRST. Some sheets differ in canvas size within one
//    creature (the drake's ground poses are 768x512 and its flight poses
//    768x640). Pad them up to a common canvas, bottom-aligned, or extract throws
//    "bad extract area" and the feet drift.
//  * ONE HEIGHT FOR THE WHOLE STRIP. Every frame is the same box. The client
//    states the element's width from MOB_SPRITE * aspect and sets flex: 0 0 auto
//    - if anything resizes that box, every frame is stretched.
//  * sharp CACHES BY PATH. Re-reading a file this script just overwrote returns
//    the OLD metadata. sharp.cache(false) below; do not remove it.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

sharp.cache(false);   // see the note above - this is not optional

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");
const REPO = path.resolve(GAME, "..");
const OUT  = path.join(GAME, "public/mob");
const CLIENT = path.join(GAME, "src/public.ts");

// WHERE THE POSE ART LIVES. Each entry is a folder holding <pose>.png files.
// The workbench is gitignored (see .gitignore) - it is generated art kept out
// of the repo, so a fresh clone has this script but not its input.
const SOURCES = [
  { dir: path.join(REPO, "output/mountain-mobs"), perCreature: true },
  { dir: path.join(REPO, "output/drake-moves"),   id: "the-drake" },
];
// ART THAT DID NOT COME FROM THE STUDIES FOLDER. These creatures ship strips
// built from separately drawn sheets; the studies hold an older, different-
// looking version of the same animal. A blanket rebuild would silently replace
// the shipped art with the old art - it did exactly that once. Name them here
// and pass the id explicitly to rebuild one on purpose.
const FOREIGN = new Set(["gill-adder", "stone-adder", "the-gravid-adder"]);
// Sheets, not poses: the full multi-pose images the cutouts were taken from.
// POSE NAMES THAT SHARE ANOTHER POSE'S DRAWING, in order of preference. Applied
// only where the creature has no drawing of its own for the name.
//
// "down" POINTS AT THE GLIDE, NOT AT THE UP. It pointed at "up" first, which was
// the obvious reading of "the up and the down can be one frame" and was wrong in
// the one way that matters: the driver flies a bird by alternating those two
// names, so with both on one index the wings did not move. rome, watching birds
// glide across a room like paper cutouts: they do not flap.
//
// They do not need a second drawing. A bird's sheet already carries two different
// wing positions - "up" is the downstroke, wings swept down and forward, and
// "glide" is the wings held level - and alternating THOSE reads as a wingbeat.
// So the beat is up-glide-up-glide, the arc still has its glide and its landing,
// and the cell that was freed still pays for the meal.
const ALIAS = { "down": ["glide", "up"] };
// Creatures that are one creature under two template ids — see the copy in the
// write step. Keyed by the id that is DRAWN, listing the ids that take its art.
const SAME_ART = { "warden": ["warden-surface"] };

const NOT_A_POSE = new Set(["sheet-order", "source", "combat-source", "flight-source",
                            "ground-source", "approved-ground-source"]);
// Frame order when a creature is new. An existing creature keeps the order it
// already had and appends whatever is newly drawn, so a rebuild never reshuffles
// a strip out from under a client that has it cached.
const CANON = ["idle", "alert", "watch", "listen", "inspect-upright",
  "rest", "bask", "hold-warm-ground", "hold-ground", "stand-ground", "keep-the-line",
  "graze", "feed", "work-pull", "steal-cache", "carry-bone", "carry-stolen-item",
  "move-a", "move-b", "advance", "twisting-leap", "call-uphill", "alarm-call",
  "alert-alarm", "defend-nest", "attack", "bite", "sweep", "inhale", "breath",
  "dive", "takeoff", "up", "glide", "down", "landing", "recover", "hit", "death"];
const MAX_H = 460;   // tallest frame we ship; the drake sets this

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
// WRITING IS OPT-IN. A bare run says what it WOULD build and touches nothing:
// this script overwrites shipped art, and a "dry run" that quietly replaced 43
// strips is not a dry run. --write builds the strips; --patch also edits
// MOB_ANIM in public.ts.
const patch = process.argv.includes("--patch");
const write = patch || process.argv.includes("--write");

// ---- what the client currently believes ----------------------------------
const client = fs.readFileSync(CLIENT, "utf8");
let blk = client.slice(client.indexOf("var MOB_ANIM = {"));
blk = blk.slice(0, blk.indexOf("\n};"));
const existing = {};
for (const m of blk.matchAll(/^\s*"([a-z0-9-]+)":\s*\{ n: \d+, aspect: [\d.]+, f: (\{[^}]*\}) \}/gm)) {
  const f = JSON.parse(m[2]), order = [];
  // FIRST NAME WINS EACH SLOT. Two names may share a frame (see ALIAS), and the
  // alias is written last, so assigning blindly let `down` take the slot `up`
  // was drawn into. `down` has no file of its own, so on the next build `up`
  // failed the "was it in the old order" test and got appended at the end - the
  // strip reshuffled itself every time it was rebuilt, for no reason at all.
  for (const [name, i] of Object.entries(f)) if (order[i] === undefined) order[i] = name;
  existing[m[1]] = order;
}

// ---- find every creature with pose art ------------------------------------
const found = new Map();
for (const s of SOURCES) {
  if (!fs.existsSync(s.dir)) continue;
  if (s.perCreature) {
    for (const d of fs.readdirSync(s.dir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith(".")) continue;
      const p = path.join(s.dir, d.name);
      if (fs.readdirSync(p).some((f) => f.endsWith(".png"))) found.set(d.name, p);
    }
  } else found.set(s.id, s.dir);
}

async function inkBox(buf) {
  const im = sharp(buf);
  const { width, height } = await im.metadata();
  const a = await im.ensureAlpha().extractChannel(3).raw().toBuffer();
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (a[y * width + x] > 12) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error("a pose is entirely transparent");
  return { x0, y0, x1, y1, width, height };
}

const rows = [];
for (const [id, dir] of [...found].sort()) {
  if (only.length ? !only.includes(id) : FOREIGN.has(id)) continue;
  // ...AND NOT THE EYE OVERLAYS. The cutter writes "<pose>.eyes.png" beside each
  // pose for a creature drawn with the blood-moon eye marker. They live in the
  // same folder and end in .png, so without this line they read as six more
  // poses called "idle.eyes", "attack.eyes" and so on — packed into the strip,
  // doubling its width, and handed to the client as frames it would occasionally
  // show. They are a SECOND LAYER of the same six, not six more.
  const drawn = fs.readdirSync(dir).filter((f) => f.endsWith(".png") && !f.endsWith(".eyes.png"))
    .map((f) => f.slice(0, -4)).filter((f) => !NOT_A_POSE.has(f));
  if (!drawn.length) continue;

  // THE SHEET'S OWN ORDER WINS when the cutter left one, because that sheet is
  // the most recent statement of how this creature is laid out. Falling through
  // to "the order it already had" is what shuffled a redrawn creature's gait to
  // the end of its strip: the poses it kept held their old slots and only the new
  // ones moved, so the eight cells came back in an order matching neither the
  // sheet nor anything else.
  //
  // Safe to prefer: nothing reads a frame by position, and any art change bumps
  // MOB_V anyway, so the cached-client argument the old rule protected does not
  // apply to a creature that was just re-cut.
  // AND IT WINS EVEN WHEN THE FOLDER HOLDS MORE THAN THE SHEET DID. This used to
  // demand that the sheet account for EVERY file present, and that equality is
  // what let one leftover file undo the whole rule: a re-cut writes its eight
  // cells over the old ones and does not remove frames the new layout dropped,
  // so five creatures came back with a stale pose or two still sitting in the
  // folder, the count failed to match, and the sheet's order was discarded in
  // favour of the layout it had just replaced. The gait ended up at the far end
  // of the strip - exactly the reshuffle rome keeps catching, and mine, not the
  // tool's. The sheet is authoritative for the poses it names; anything else in
  // the folder follows it and is called out below.
  let sheetOrder = null, extra = [];
  try {
    const so = JSON.parse(fs.readFileSync(path.join(dir, "sheet-order.json"), "utf8"));
    if (Array.isArray(so.poses) && so.poses.every((p) => drawn.includes(p))) {
      sheetOrder = so.poses;
      extra = drawn.filter((p) => !so.poses.includes(p));
    }
  } catch {}
  // Said out loud, because a leftover is usually a frame the redraw dropped and
  // it still lands in the strip. A creature cut from two sheets (the drake) is
  // the legitimate case.
  if (extra.length) console.log("  " + id + ": " + extra.length + " pose(s) not on the sheet - "
    + extra.join(" ") + " - kept after it; delete them if the redraw dropped them");
  // the order it already had, then anything new in canonical order, then the rest
  const order = [];
  for (const p of sheetOrder ?? existing[id] ?? []) if (drawn.includes(p)) order.push(p);
  for (const p of CANON) if (drawn.includes(p) && !order.includes(p)) order.push(p);
  for (const p of drawn.sort()) if (!order.includes(p)) order.push(p);

  const files = order.map((p) => path.join(dir, p + ".png"));
  const raw = await Promise.all(files.map((f) => sharp(f).toBuffer()));
  const meta = await Promise.all(raw.map((b) => sharp(b).metadata()));

  // pad every pose up to one canvas, bottom-aligned, before anything else
  const cw = Math.max(...meta.map((m) => m.width)), ch = Math.max(...meta.map((m) => m.height));
  const norm = [];
  for (let i = 0; i < raw.length; i++) {
    if (meta[i].width === cw && meta[i].height === ch) { norm.push(raw[i]); continue; }
    norm.push(await sharp({ create: { width: cw, height: ch, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
      .composite([{ input: raw[i], left: Math.round((cw - meta[i].width) / 2), top: ch - meta[i].height }])
      .png().toBuffer());
  }

  // ...AND THEN PUT THE FEET ON ONE LINE, which the block above only did when a
  // creature's cells were different SIZES. That was the only case the mountain
  // ever produced — the drake, whose flight cells are taller than its ground
  // ones — so the padding was written for it and the rest of the roster simply
  // never needed it. Every hill sheet came back with the animal already sitting
  // on the bottom edge of its cell, because the prompt asks for exactly that,
  // and the generator happened to obey.
  //
  // THE COAST SHEETS DO NOT OBEY. Their cells are all a uniform 512x512, so the
  // test above passes them straight through untouched, and the union crop then
  // faithfully preserves whatever height the animal was drawn at in each cell.
  // Measured across move-a and move-b: a marsh hound's ink bottom moves 19% of
  // the frame, a devil crab's 19%, the great crab's 24%. Left and right barely
  // move at all. So the legs are doing the right thing and the whole animal is
  // BOUNCING, a fifth of its own height, twice a second. Every hill creature
  // measures 0.0 there, which is how sure you can be this is the fault.
  //
  // GROUND CREATURES ONLY. A bird's up/glide frames are drawn airborne on
  // purpose and the client adds its own lift on top; dragging them down to the
  // walking baseline would nail a gliding gull to the beach. A creature with no
  // flight pose has every pose on the ground, death and sleep included, so one
  // baseline is simply true of it. The shift is always downward and never past
  // the lowest pose's own feet, so nothing can leave the canvas.
  //
  // This is a no-op on art that already complied — which is all 43 of the hill's
  // — so it costs a rebuild nothing and cannot move anything that looks right.
  const eyeShift = new Array(norm.length).fill(0);
  if (!order.includes("up")) {
    const pre = await Promise.all(norm.map(inkBox));
    const floor = Math.max(...pre.map((b) => b.y1));
    for (let i = 0; i < norm.length; i++) {
      const dy = floor - pre[i].y1;
      eyeShift[i] = dy > 0 ? dy : 0;
      if (dy <= 0) continue;
      norm[i] = await sharp({ create: { width: cw, height: ch, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
        .composite([{ input: norm[i], left: 0, top: dy }]).png().toBuffer();
    }
  }

  // ONE crop rect for all of them
  const boxes = await Promise.all(norm.map(inkBox));
  const X0 = Math.min(...boxes.map((b) => b.x0)), X1 = Math.max(...boxes.map((b) => b.x1));
  const Y0 = Math.min(...boxes.map((b) => b.y0)), Y1 = Math.max(...boxes.map((b) => b.y1));
  const w0 = X1 - X0 + 1, h0 = Y1 - Y0 + 1;
  const sc = Math.min(1, MAX_H / h0);
  const iw = Math.round(w0 * sc), ih = Math.round(h0 * sc);
  // A GUTTER, OR THE NEXT POSE LEAKS IN. The crop rect above is the tightest box
  // holding every pose, so by construction some pose touches each edge — and the
  // client shows a frame by percentage background-position, which rounds to
  // subpixels. Ink at the boundary means the neighbouring frame's wingtip
  // appears at the edge of the window. A few transparent pixels all round costs
  // nothing and makes that impossible.
  const gut = Math.max(4, Math.round(iw * 0.012));
  const fw = iw + gut * 2, fh = ih + gut * 2;

  const frames = [];
  for (const b of norm) {
    const cut = await sharp(b).extract({ left: X0, top: Y0, width: w0, height: h0 })
      .resize(iw, ih).png().toBuffer();
    frames.push(await sharp({ create: { width: fw, height: fh, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
      .composite([{ input: cut, left: gut, top: gut }]).png().toBuffer());
  }

  // ---- AND THE EYES, ON EXACTLY THE SAME RECT --------------------------------
  // A hollow creature ships a second strip holding nothing but its eyes in red,
  // laid over the base on a blood-moon night. It is built HERE, inside the same
  // loop, for one reason: it has to use the same X0/Y0/w0/h0, the same scale and
  // the same gutter as the base. Built separately it would compute its own crop
  // from its own ink - two red dots - and land them nowhere near the face.
  //
  // A pose with no eyes visible gets a BLANK frame, not a missing one. The refuge
  // man's idle is his back turned with both hands flat on the wall, and the salt
  // widow dies face down; neither has a face in that frame. Skipping them would
  // shorten the strip and every frame after it would be off by one.
  const eyeFiles = order.map((pose) => path.join(dir, pose + ".eyes.png"));
  const anyEyes = eyeFiles.some((f) => fs.existsSync(f));
  const eyeFrames = [];
  if (anyEyes) {
    const blank = { create: { width: fw, height: fh, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } };
    for (let i = 0; i < order.length; i++) {
      if (!fs.existsSync(eyeFiles[i])) { eyeFrames.push(await sharp(blank).png().toBuffer()); continue; }
      let e = await sharp(eyeFiles[i]).toBuffer();
      const em = await sharp(e).metadata();
      // the same bottom-align shift the base got, so the eyes ride with the head
      if (em.width !== cw || em.height !== ch)
        e = await sharp({ create: { width: cw, height: ch, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
              .composite([{ input: e, left: Math.round((cw - em.width) / 2), top: ch - em.height }]).png().toBuffer();
      if (eyeShift[i]) e = await sharp({ create: { width: cw, height: ch, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
              .composite([{ input: e, left: 0, top: eyeShift[i] }]).png().toBuffer();
      const cut = await sharp(e).extract({ left: X0, top: Y0, width: w0, height: h0 }).resize(iw, ih).png().toBuffer();
      eyeFrames.push(await sharp(blank).composite([{ input: cut, left: gut, top: gut }]).png().toBuffer());
    }
  }

  if (write) {
    fs.mkdirSync(OUT, { recursive: true });
    if (anyEyes) await sharp({ create: { width: fw * eyeFrames.length, height: fh, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
      .composite(eyeFrames.map((b, i) => ({ input: b, left: i * fw, top: 0 })))
      .webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, id + ".eyes.webp"));
    await sharp({ create: { width: fw * frames.length, height: fh, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
      .composite(frames.map((b, i) => ({ input: b, left: i * fw, top: 0 })))
      .webp({ quality: 92, alphaQuality: 100 })   // q92 + full alpha: ~6x smaller than png, no alpha flips
      .toFile(path.join(OUT, id + ".webp"));
    // TWO TEMPLATES, ONE CREATURE. Not a variant — a variant is a different
    // animal and every pair in the game carries two strips on purpose. This is
    // the same animal entered twice because it had to be somewhere else: a
    // warden was moved out of the keep, and a spawn row cannot cross a band, so
    // the surface got its own template id. Same name, same description, same
    // level, hp, damage, armour, gear and loot, down the line.
    //
    // So it takes the same picture. Drawing it twice would be asking for two
    // sheets of one creature and hoping they matched. The copy happens here
    // rather than by hand because the hand forgets: cut the warden, and the
    // thing walking the surface changes with it in the same command.
    for (const twin of SAME_ART[id] || []) {
      fs.copyFileSync(path.join(OUT, id + ".webp"), path.join(OUT, twin + ".webp"));
      const e = path.join(OUT, id + ".eyes.webp");
      if (fs.existsSync(e)) fs.copyFileSync(e, path.join(OUT, twin + ".eyes.webp"));
      console.log("     + " + twin + " shares this strip — the same creature, entered twice");
    }
  }

  const f = {}; order.forEach((p, i) => f[p] = i);
  // TWO NAMES, ONE DRAWING. A pose map is names to frame INDICES, and nothing
  // stops two names sharing an index — so a pose that is drawn once can answer
  // to both. The wingbeat is the case it was added for: a bird's sheet spends
  // four of its eight cells on flight and had no cell left for the meal, and
  // rome's answer was that the up and down of a beat can be the same picture.
  // One cell comes back, no drawn frame is lost, and the strip does not grow.
  //
  // Only ever an alias for a pose the creature does NOT have its own drawing of.
  // A bird drawn with a real down-beat keeps it.
  for (const [name, prefs] of Object.entries(ALIAS)) {
    if (f[name] !== undefined) continue;
    for (const same of prefs) if (f[same] !== undefined) { f[name] = f[same]; break; }
  }
  rows.push({ id, n: order.length, aspect: +(fw / fh).toFixed(3), f, order });
  console.log(id.padEnd(20) + String(order.length).padStart(2) + " frames  " + order.join(" "));
}

if (!rows.length) { console.log("nothing to build"); process.exit(0); }

// A shared strip needs a shared MAP. The file copy alone would leave the twin
// reading its own stale row - same picture, different frame indices - which
// paints the wrong cell out of a correct strip and is worse than no art.
//
// BEFORE the column width is measured, not after: the twin's id is longer than
// the one it copies ("warden" -> "warden-surface"), so adding it later made the
// padding negative and String.repeat threw on the one row this exists for.
for (const r of [...rows]) for (const twin of SAME_ART[r.id] || []) rows.push({ ...r, id: twin });

const pad = Math.max(...rows.map((r) => r.id.length)) + 3;
const line = (r) => `  "${r.id}":` + " ".repeat(Math.max(1, pad - r.id.length))
  + `{ n: ${r.n}, aspect: ${r.aspect}, f: ${JSON.stringify(r.f)} },`;

if (patch) {
  let s = fs.readFileSync(CLIENT, "utf8");
  for (const r of rows) {
    const re = new RegExp(`^(\\s*"${r.id}":\\s*)\\{ n: \\d+, aspect: [\\d.]+, f: \\{[^}]*\\} \\},$`, "m");
    if (re.test(s)) s = s.replace(re, `$1{ n: ${r.n}, aspect: ${r.aspect}, f: ${JSON.stringify(r.f)} },`);
    else s = s.replace("var MOB_ANIM = {\n", "var MOB_ANIM = {\n" + line(r) + "\n");
  }
  fs.writeFileSync(CLIENT, s);
  console.log(`\npatched MOB_ANIM in public.ts (${rows.length} rows)`);
  console.log("NOW: bump MOB_V in public.ts - these filenames already existed and their content changed.");
} else {
  console.log(write
    ? "\nstrips written. MOB_ANIM rows (--patch to write these in too):\n"
    : "\nNOTHING WAS WRITTEN - this was a dry run. --write to build the strips.\n"
      + "MOB_ANIM rows these would produce:\n");
  for (const r of rows) console.log(line(r));
}
