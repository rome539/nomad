// EVERY ASSET URL CARRIES THE STAMP FOR ITS OWN KIND OF PICTURE.
//
//   node scripts/test-asset-stamps.mjs
//
// The art is served "immutable, max-age=1 year", so a file replaced in place is
// invisible to anybody who has seen it until its URL changes. A ?v= stamp is
// what changes it. That much was always true; what was wrong was having ONE
// stamp for all of it.
//
// Measured on the 2026-09-14 ship: 22 mob strips changed, the single ART_V was
// bumped, and every browser re-fetched 111MB — 251 room plates and 9 skies that
// had not changed at all. A plate is ~400KB and several seconds on an ordinary
// line, so every room entered after an art deploy paid again for a picture it
// already had, and it read as the whole world being slightly slow.
//
// So there are four stamps, and this asserts two things a future edit can break
// without any visible symptom:
//   1. no asset URL is built WITHOUT a stamp  (silently uncacheable-bustable:
//      replace that file one day and nobody ever sees the new one)
//   2. no asset URL carries the WRONG stamp   (bump mobs, re-download plates)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "public.ts");
const src = fs.readFileSync(SRC, "utf8");
let fail = 0;
const t = (n, c, e) => { console.log((c ? "  ok   " : "  FAIL ") + n + (e ? "   " + e : "")); if (!c) fail++; };

// which stamp each asset directory must use
const OWNS = { "mob": "MOB_V", "room-bg": "BG_V", "room-fx": "FX_V", "sky": "SKY_V", "card-bg": "CARD_V", "door-bg": "CARD_V" };

for (const v of new Set(Object.values(OWNS)))
  t(v + " is declared", new RegExp("var " + v + "\\s*=\\s*\"\\d+\"").test(src));

// every literal asset path in the file, and the stamp on the same line
const lines = src.split("\n");
const wrong = [], bare = [];
lines.forEach((l, i) => {
  if (/^\s*\/\//.test(l)) return;                       // comments may name anything
  const dir = (l.match(/["(]\/(mob|room-bg|room-fx|sky|card-bg|door-bg)\//) || [])[1];
  if (!dir) return;
  // A path being STORED is not a path being fetched: scene and sky are built
  // here and stamped where they are handed to the browser, and scenePainted is
  // bookkeeping that never reaches the network. Only a URL going straight into
  // src or backgroundImage has to carry its stamp on this line.
  if (/^\s*(scene|sky|scenePainted)\s*=/.test(l)) return;
  if (!/\?v=/.test(l)) { bare.push((i + 1) + ": /" + dir + "/"); return; }
  const used = (l.match(/\?v=" \+ (\w+)/) || [])[1];
  if (used !== OWNS[dir]) wrong.push((i + 1) + ": /" + dir + "/ uses " + used + ", wants " + OWNS[dir]);
});
t("no asset URL is built without a version stamp", bare.length === 0, bare.join("; ") || "all stamped");
t("no asset URL carries another kind's stamp", wrong.length === 0, wrong.join("; ") || "all correct");

// the indirect ones: `scene` and `sky` are variables holding a path
const indirect = lines.filter((l) => !/^\s*\/\//.test(l) && /\+ "\?v=" \+ \w+|"\?v=" \+ \w+/.test(l) && !/["(]\/(mob|room-bg|room-fx|sky|card-bg|door-bg)\//.test(l));
t("the variable-path URLs (scene, sky) are stamped too", indirect.length >= 2,
  indirect.length + " found: " + indirect.map((l) => (l.match(/\?v=" \+ (\w+)/) || [])[1]).join(" "));

// and nothing still reaches for the old single stamp
const oldUse = lines.filter((l) => !/^\s*\/\//.test(l) && /ART_V/.test(l));
t("nothing still uses the old single stamp", oldUse.length === 0, oldUse.join("; ") || "ART_V is gone from the code");

console.log(fail ? "\n" + fail + " FAILED" : "\nall pass");
process.exit(fail ? 1 : 0);
