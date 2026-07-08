// Embed the two world-chart PNGs (drawn by promo/capture/_map.mjs) into
// src/mapimg.ts, so the Worker serves them itself — the same trick assets.ts
// uses for the share card. Run this after regenerating the charts:
//   (cd promo/capture && node _map.mjs && node _map.mjs --crude)
//   node game-server/scripts/embed-maps.mjs        (reads ~/Desktop by default)
//   node game-server/scripts/embed-maps.mjs <dir>  (or from a dir you name)
// The charts live on the Desktop by design (they double as promo posters); we
// read from os.homedir() at runtime so no machine path is ever committed.
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const DIR = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] || join(os.homedir(), "Desktop");
const survey = join(src, "nomad-map.png");
const crude = join(src, "nomad-map-crude.png");
for (const p of [survey, crude]) {
  if (!fs.existsSync(p)) { console.error("missing:", p, "\n  regenerate with promo/capture/_map.mjs first"); process.exit(1); }
}
const b64 = (p) => fs.readFileSync(p).toString("base64");
// One unbroken string literal per blob — NOT `+`-concatenated: a few-thousand-term
// concat expression is pathological for tsc (it hung the type-checker).

const out = `// The two world charts shown in the in-game map modal, drawn by
// promo/capture/_map.mjs from the exit graph and embedded here so the Worker
// serves them itself — no third-party host, same trick as assets.ts.
// REGENERATE (do NOT hand-edit): after any migration that moves rooms/exits,
//   (cd promo/capture && node _map.mjs && node _map.mjs --crude)
//   node game-server/scripts/embed-maps.mjs

function bytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// The surveyor's map: the true chart.
const SURVEY_B64 = "${b64(survey)}";

// The crude map: one copyist's lying copy (№3841).
const CRUDE_B64 = "${b64(crude)}";

export function surveyMapBytes(): Uint8Array { return bytes(SURVEY_B64); }
export function crudeMapBytes(): Uint8Array { return bytes(CRUDE_B64); }
`;
fs.writeFileSync(join(DIR, "../src/mapimg.ts"), out);
console.log("wrote src/mapimg.ts —", (fs.statSync(survey).size / 1024 | 0) + "KB survey +", (fs.statSync(crude).size / 1024 | 0) + "KB crude");
