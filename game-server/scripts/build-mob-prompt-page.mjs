// Build the copy-button page for a set of creature prompts, straight from
// mob-prompt.mjs so the page and the pipeline cannot say different things.
//
//   node scripts/build-mob-prompt-page.mjs <out.html> <id> [id …]
//
// The page is the prompts and nothing else: a card per creature with its cut
// line and a copy button. Notes about why a prompt says what it says belong in
// the generator's comments, not in front of the person trying to paste one.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The page is built more than once now and the title was welded to the first
// batch it ever ran on, which made every later page lie about what it held.
const argv = process.argv.slice(2);
let TITLE = "Creature Prompts";
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--title") { TITLE = argv[i + 1] || TITLE; argv.splice(i, 2); i--; }
}
const [out, ...ids] = argv;
if (!out || !ids.length) {
  console.error("usage: node scripts/build-mob-prompt-page.mjs [--title <name>] <out.html> <id> [id …]");
  process.exit(2);
}
const esc = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const cards = ids.map((id) => {
  const raw = execFileSync("node", [path.join(HERE, "mob-prompt.mjs"), id], { encoding: "utf8" });
  const cut = (raw.match(/cut-mob-sheet\.mjs <sheet\.png> (.+)/) || [])[1] || "";
  const body = raw.slice(raw.indexOf("Use case:")).trimEnd();
  const name = ((body.match(/Subject: ([^.]+)\./) || [])[1] || id)
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const grid = (raw.match(/(\d+) poses, (\d+x\d+) sheet at (\d+x\d+)/) || []);
  return { id, name, cut, prompt: body, poses: +grid[1] || 0, sheet: grid[2] + " · " + grid[3] };
});

const page = `<title>${esc(TITLE)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
  :root{--ground:#15161c;--surface:#1d1f27;--raise:#252833;--ink:#e9e5dc;--dim:#9a9484;--faint:#6a6558;--rule:#32353f;--tide:#c07a42}
  :root[data-theme="light"]{--ground:#f2f0ea;--surface:#fff;--raise:#e8e5dd;--ink:#1d1f27;--dim:#5e5a50;--faint:#8a8578;--rule:#d6d2c8;--tide:#9a5a24}
  *{box-sizing:border-box}
  body{background:var(--ground);color:var(--ink);font:400 15px/1.6 "IBM Plex Sans",system-ui,sans-serif;margin:0;padding:0 20px 64px}
  .wrap{max-width:1060px;margin:0 auto}
  header{padding:36px 0 20px;border-bottom:1px solid var(--rule);margin-bottom:24px}
  h1{font-size:28px;font-weight:600;margin:0 0 5px;letter-spacing:-.015em}
  .sub{color:var(--dim);margin:0;font-size:14px}
  .grid{display:grid;gap:12px}
  .card{background:var(--surface);border:1px solid var(--rule);border-left:3px solid var(--tide);border-radius:4px;overflow:hidden}
  .bar{display:flex;align-items:center;gap:12px;padding:13px 18px;flex-wrap:wrap}
  .nm{font-weight:600;font-size:16px;flex:none}
  .meta{font:400 12px "IBM Plex Mono",monospace;color:var(--faint);flex:1;min-width:120px}
  button{font:500 13px "IBM Plex Sans",sans-serif;color:var(--ground);background:var(--ink);border:0;border-radius:3px;padding:7px 15px;cursor:pointer;flex:none}
  button:hover{opacity:.85}
  button:focus-visible{outline:2px solid var(--tide);outline-offset:2px}
  button.ok{background:var(--tide)}
  button.ghost{background:transparent;color:var(--dim);border:1px solid var(--rule)}
  .cut{font:400 11px "IBM Plex Mono",monospace;color:var(--faint);padding:0 18px 12px;overflow-x:auto;white-space:nowrap}
  pre{margin:0;padding:18px;border-top:1px solid var(--rule);font:400 12px/1.6 "IBM Plex Mono",ui-monospace,monospace;white-space:pre-wrap;word-wrap:break-word;max-height:440px;overflow-y:auto}
</style>
<div class="wrap">
<header><h1>${esc(TITLE)}</h1>
<p class="sub">${cards.length} sheets. Copy, generate, then run the cut line on the card.</p></header>
<div class="grid" id="g"></div>
</div>
<script>
var C = ${JSON.stringify(cards)};
var g = document.getElementById("g");
C.forEach(function(c){
  var el = document.createElement("div");
  el.className = "card";
  el.innerHTML = '<div class="bar"><span class="nm"></span><span class="meta"></span>'
    + '<button class="copy">Copy</button><button class="ghost tog">Show</button></div>'
    + '<div class="cut"></div><pre hidden></pre>';
  el.querySelector(".nm").textContent = c.name;
  el.querySelector(".meta").textContent = c.poses + " poses · " + c.sheet;
  el.querySelector(".cut").textContent = "cut-mob-sheet.mjs <sheet.png> " + c.cut;
  var pre = el.querySelector("pre");
  pre.textContent = c.prompt;
  el.querySelector(".tog").addEventListener("click", function(e){
    pre.hidden = !pre.hidden; e.target.textContent = pre.hidden ? "Show" : "Hide";
  });
  el.querySelector(".copy").addEventListener("click", function(e){
    var b = e.target, done = function(){
      b.textContent = "Copied"; b.classList.add("ok");
      setTimeout(function(){ b.textContent = "Copy"; b.classList.remove("ok"); }, 1300);
    };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(c.prompt).then(done, function(){ fb(c.prompt, done); });
    else fb(c.prompt, done);
  });
  g.appendChild(el);
});
function fb(t, done){
  var ta = document.createElement("textarea");
  ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch(e) {}
  document.body.removeChild(ta);
}
</script>
`;
fs.writeFileSync(out, page);
console.log("wrote " + out + " — " + cards.length + " prompts");
