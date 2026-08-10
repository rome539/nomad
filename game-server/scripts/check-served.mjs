// PARSE-CHECK THE SERVED CLIENT SCRIPT.
//
// public.ts holds the whole page inside a TS template literal, so every escape
// in it is evaluated ONCE on its way to the browser: a `\n` written in the
// source arrives as a real newline. A checker that does not model that will
// happily pass a string literal with a raw newline inside it — which is a
// SyntaxError that takes the entire client down, and which is exactly what
// slipped through on 2026-08-09.
//
// So: evaluate the template the way the runtime does, then parse the result.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// An explicit path is for testing the checker itself; default is the real page.
const target = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`) : new URL("../src/public.ts", import.meta.url);
const src = readFileSync(target, "utf8");
const start = src.indexOf("export const PAGE = `");
if (start < 0) { console.error("check-served: no PAGE template found"); process.exit(2); }
const rest = src.slice(start + "export const PAGE = `".length);
const end = rest.indexOf("</html>`;") >= 0 ? rest.indexOf("</html>`;") + "</html>".length : -1;
if (end < 0) { console.error("check-served: PAGE template is unterminated"); process.exit(2); }
const raw = rest.slice(0, end);

// A template literal has no interpolation in this page, so evaluating it is
// exactly this: turn each escape into the character it stands for.
const ESC = { n: "\n", t: "\t", r: "\r", "0": "\0", "`": "`", $: "$", "\\": "\\", "'": "'", '"': '"' };
let page = "";
for (let i = 0; i < raw.length; i++) {
  const ch = raw[i];
  if (ch !== "\\") { page += ch; continue; }
  const nxt = raw[++i];
  if (nxt === "u" && raw[i + 1] === "{") {
    const close = raw.indexOf("}", i);
    page += String.fromCodePoint(parseInt(raw.slice(i + 2, close), 16));
    i = close;
  } else if (nxt === "u") {
    page += String.fromCharCode(parseInt(raw.slice(i + 1, i + 5), 16));
    i += 4;
  } else if (nxt === "x") {
    page += String.fromCharCode(parseInt(raw.slice(i + 1, i + 3), 16));
    i += 2;
  } else {
    page += ESC[nxt] !== undefined ? ESC[nxt] : nxt;
  }
}

// A BACKTICK INSIDE THE PAGE ENDS THE PAGE. public.ts holds the whole client in
// one template literal, so a stray backtick — most often somebody quoting a CSS
// property or a verb in a comment — closes it early and the file collapses into
// a pile of syntax errors a long way from the actual mistake. tsc does catch it,
// but it reports "',' expected" at a line that looks fine. Name it here instead.
const stray = raw.match(/`/g);
if (stray) {
  const line = raw.slice(0, raw.indexOf("`")).split("\n").length;
  console.error(`check-served: a stray backtick inside the PAGE template (around line ${line + 1} of public.ts).`);
  console.error("Use ' or \" in comments and strings inside the page — a backtick ends it.");
  process.exit(1);
}

const open = page.indexOf('<script type="module">');
const shut = page.lastIndexOf("</script>");
if (open < 0 || shut < 0) { console.error("check-served: no module script in the page"); process.exit(2); }
const js = page.slice(open + '<script type="module">'.length, shut);

const tmp = new URL("../.served-check.mjs", import.meta.url);
writeFileSync(tmp, js);
try {
  execFileSync(process.execPath, ["--check", tmp.pathname], { stdio: "pipe" });
  console.log(`served script OK (${js.length} bytes)`);
} catch (e) {
  console.error("SERVED SCRIPT IS BROKEN — the page would not run:\n");
  console.error(String(e.stderr ?? e));
  process.exit(1);
}
