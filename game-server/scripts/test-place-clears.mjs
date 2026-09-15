// A SINGULAR ROOM MUST NOT FOLLOW YOU OUT OF IT.
//
// The client paints ROOM_PLATE from `lastPlace`, and clears it only when the
// status frame actually CARRIES a place field:
//
//     if (place !== undefined) lastPlace = place || "";
//
// JSON.stringify drops an undefined value entirely, so a server that sends
// `place: undefined` on ordinary ground sends no key at all and the clear never
// runs — the last plate you stood on is painted over every room after it. That
// shipped, and the Deep Mark is where it became visible: walk south into the
// sea cave and the depth post came with you.
//
// This test fails if `place` ever goes back to being absent for an art-key
// holder standing on ordinary ground.
import fs from "node:fs";
const Z = fs.readFileSync(new URL("../src/zone.ts", import.meta.url), "utf8");
const P = fs.readFileSync(new URL("../src/public.ts", import.meta.url), "utf8");
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) fail++; };

// Comments are stripped first: a rule stated in prose must never satisfy a test
// that is checking for it in code. (This has bitten twice.)
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const zc = strip(Z);
const m = zc.match(/place:\s*([^,]*(?:\n[^,]*)*?),\s*\n\s*sea:/);
ok(!!m, "the status frame still has a place field ahead of sea");
const expr = (m ? m[1] : "").replace(/\s+/g, " ").trim();
console.log("        " + expr);

ok(/ART_KEYS\.has\(session\.pubkey\)/.test(expr),
   "it is still gated on the art keys");
ok(/ART_ROOMS\.has\(session\.roomId\)\s*\?\s*session\.roomId/.test(expr),
   "an art room still reports its own id");
// The whole point: the non-art-room arm must be a real value, not undefined.
const elseArm = expr.split("ART_ROOMS.has(session.roomId) ?")[1] || "";
const other = (elseArm.split(":")[1] || "").trim();
ok(other === '""' || other === "''",
   'ordinary ground sends an EMPTY STRING, not undefined  (got: ' + (other || "nothing") + ")");

// ...and the client side of the contract, so the two cannot drift apart.
const pc = strip(P);
ok(/if\s*\(\s*place\s*!==\s*undefined\s*\)\s*lastPlace\s*=/.test(pc),
   "the client still clears lastPlace only on a present field");

console.log(fail ? "\n" + fail + " FAILED" : "\nplace clears — a singular room stays where it is");
process.exit(fail ? 1 : 0);
