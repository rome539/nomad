// A MODAL NOTE MUST NEVER SHOW THE RARITY MARKER RAW.
//
//   node scripts/test-rarity-notes.mjs
//
// The server wraps gear names as <U+0001>rarity<U+0001>name<U+0002> and the
// client turns that into a coloured span. The LOG did; the modals did not -
// every note was set with .textContent, so a player settling up at the keeper's
// hatch read three tofu boxes with the word "uncommon" dropped into the middle
// of the sentence:
//
//   The keeper slides [?]uncommon[?]a horseman's pick[?] (+2 dmg, bleeds 1...)
//
// That is the line telling you what you just bought, so it is the worst line in
// the game to get wrong.
//
// This lifts the client's OWN paintRarity and setNote and runs the reported
// string through them against a DOM stub, then reads back what would reach the
// screen. Asserting on the rendered text is the point: a check that the source
// says "setNote" would pass on a setNote that did the wrong thing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "public.ts");
const src = fs.readFileSync(SRC, "utf8");
const fn = (n) => {
  const i = src.indexOf("\nfunction " + n + "(");
  if (i < 0) throw new Error("no function " + n);
  let d = 0;
  for (let k = src.indexOf("{", i); k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(i + 1, k + 1);
  }
};

const mk = () => ({ _kids: [], _text: "", className: "",
  set textContent(v) { this._text = v; this._kids.length = 0; },
  get textContent() { return this._text; },
  appendChild(c) { this._kids.push(c); } });
const flat = (el) => el._kids.length ? el._kids.map(flat).join("") : el._text;

const ctx = {};
new Function("ctx", "document", "rarityClass",
  fn("paintRarity") + fn("setNote") + "ctx.paintRarity=paintRarity; ctx.setNote=setNote;")(
  ctx, { createElement: mk, createTextNode: (t) => { const e = mk(); e.textContent = t; return e; } },
  (r) => "r-" + r);

let fail = 0;
const t = (n, c, e) => { console.log((c ? "  ok   " : "  FAIL ") + n + (e ? "   " + e : "")); if (!c) fail++; };

const A = "\u0001", Z = "\u0002";
const reported = "The keeper slides " + A + "uncommon" + A + "a horseman's pick" + Z
  + " (+2 dmg, bleeds 1, pierces 2) [uncommon] (sealed #584) across the counter.";

const el = mk();
ctx.setNote(el, reported);
const out = flat(el);
t("no control character survives to the screen", !/[\u0001\u0002]/.test(out), JSON.stringify(out.slice(0, 56)));
t("the rarity word is not dumped into the prose", !/slides uncommon/.test(out), out.slice(0, 44));
t("the item name is still there", out.includes("a horseman's pick"));
t("the sentence still reads whole",
  out.startsWith("The keeper slides a horseman's pick") && out.endsWith("across the counter."), out.slice(0, 50) + " ...");
const span = el._kids.find((k) => k.className && k.className.indexOf("r-") === 0);
t("the name is wrapped in a rarity span", !!span && span.textContent === "a horseman's pick",
  span ? span.className + " -> " + span.textContent : "no span");

const plain = mk();
ctx.setNote(plain, "Sound. Nothing here wants the vice.");
t("a note with no marker is unharmed", flat(plain) === "Sound. Nothing here wants the vice.");
const empty = mk();
ctx.setNote(empty, "");
t("an empty note clears the line", flat(empty) === "");

const sinks = ["tnote", "fnote", "bnote", "bynote", "swnote"];
const bare = sinks.filter((n) => new RegExp(n + "\\.textContent\\s*=\\s*state\\.note").test(src));
t("no modal note is still set with bare textContent", bare.length === 0, bare.join(" ") || "all five use setNote");

console.log(fail ? "\n" + fail + " FAILED" : "\nall pass");
process.exit(fail ? 1 : 0);
