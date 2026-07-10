// The world chart: two connected panels (the ring / the descent), rooms as
// boxes, compass passages as solid lines, stairs as dotted — drawn from the
// exit graph in the LOCAL D1, so the chart is the code. Regenerate after any
// migration that touches rooms/exits:
//   node _map.mjs                 (the surveyor's truth -> nomad-map.png)
//   node _map.mjs --crude [copy#] (one lying copy      -> nomad-map-crude.png)
// The crude mode runs the game's own lie-machine (CRUDE_DROP_ROOM 0.30 /
// CRUDE_BAD_EXIT 0.15, mulberry32-seeded per copy) so every copy number is a
// different, consistent liar. Renders via system Chrome's headless CLI
// (puppeteer-core hung against current Chrome; the CLI does not).
import fs from "fs";
import os from "os";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const DIR = dirname(fileURLToPath(import.meta.url));
const d1dir = join(DIR, "../../game-server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
const db = fs.existsSync(d1dir) ? fs.readdirSync(d1dir).filter(f => f.endsWith(".sqlite")).map(f => join(d1dir, f))[0] : null;
if (!db) { console.error("no local D1 found — run the game server once (wrangler dev) to seed it"); process.exit(1); }
const lastMig = fs.readdirSync(join(DIR, "../../game-server/migrations")).filter(f => f.endsWith(".sql")).sort().pop().slice(0, 3);
const q = (sql) => JSON.parse(execSync(`sqlite3 -json "${db}" "${sql}"`).toString() || "[]");
const exits = q("SELECT room_id, dir, to_room FROM exits;");
const roomrows = q("SELECT id, name FROM rooms;");
const SAFE = new Set(q("SELECT id FROM rooms WHERE is_safe = 1;").map(r => r.id));
const GATES = new Set(q("SELECT id FROM rooms WHERE is_entry = 1;").map(r => r.id));
const THRONE = new Set(q("SELECT s.room_id AS r FROM mob_spawns s JOIN mob_templates t ON t.id = s.template_id WHERE t.is_boss = 1;").map(r => r.r));
// mirrors DEEP_ROOMS in game-server/src/zone-data.ts (keep in step when the deep grows)
const DEEP = new Set(["the-descent","drowned-nave","black-canal","the-weir","pocket-of-air","sunken-gallery","root-vault","deep-ossuary","weeping-cells","silted-stair","bone-processional","black-threshold","sunken-throne","kings-hoard","drowned-barracks","leech-pools","tide-vault","the-cistern","blackreach","the-lightless-march","worm-cloister","the-undertow","the-sump","carrion-gallery","the-marrow-road","the-gasping-dark","sunless-well","drowned-court","kings-oratory","bone-reliquary","the-death-cell","the-cold-hearth","worm-bore"]);
const names = new Map(roomrows.map(r=>[r.id,r.name]));
const adj = new Map();
for (const e of exits) { if (!adj.has(e.room_id)) adj.set(e.room_id, []); adj.get(e.room_id).push(e); }
const TOTAL = roomrows.length;

// ---- --crude: forget rooms, lie about exits — the game's own smudge, seeded per copy ----
const CRUDE = process.argv.includes("--crude");
const copyNo = (CRUDE && process.argv[process.argv.indexOf("--crude") + 1]) || "3841";
if (CRUDE) {
  const hashSeed = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  let a0 = hashSeed(copyNo) >>> 0;
  const rnd = () => { a0 |= 0; a0 = (a0 + 0x6d2b79f5) | 0; let t = Math.imul(a0 ^ (a0 >>> 15), 1 | a0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const shown = new Set();
  for (const r of roomrows) if (GATES.has(r.id) || rnd() >= 0.30) shown.add(r.id); // CRUDE_DROP_ROOM
  for (let i = roomrows.length - 1; i >= 0; i--) if (!shown.has(roomrows[i].id)) roomrows.splice(i, 1);
  for (const id of [...adj.keys()]) {
    if (!shown.has(id)) { adj.delete(id); continue; }
    const kept = [];
    for (const e of adj.get(id)) {
      if (rnd() < 0.15) { // CRUDE_BAD_EXIT: half missing, half pointing at the wrong room
        if (rnd() < 0.5) continue;
        const others = [...shown].filter((r) => r !== id);
        kept.push({ ...e, to_room: others[Math.floor(rnd() * others.length)] ?? e.to_room });
        continue;
      }
      kept.push(e);
    }
    adj.set(id, kept);
  }
}

// panel A = the surface world (incl. gates + cellars); panel B = undercroft + the deep
const inB = (id) => DEEP.has(id) || id === "undercroft";
const panels = [
  { title: "THE SURFACE — GROUNDS, RING & OVERWORKS",
    sub: CRUDE ? "what the copyist remembered of the halls — some of it is right" : "the open grounds, the gates and halls, the warrens gnawed beneath, and the sky-road above",
    start: "hall", has: (id) => !inB(id) },
  { title: "THE DEEP — THE LONG DESCENT",
    sub: CRUDE ? "what the copyist remembered of the deep — trust it at your peril" : "past the Undercroft’s sealed door: the Drowned Reach, the Sunless Deep, and the King at the bottom",
    start: "undercroft", has: inB },
];

// flatten all six dirs onto the page: down draws downward, dotted
const D = { north:[0,-1], south:[0,1], east:[1,0], west:[-1,0], down:[0,1], up:[0,-1] };
const VERT = new Set(["up","down"]);

function layout(panel) {
  const ids = roomrows.map(r=>r.id).filter(panel.has);
  const inP = new Set(ids), claimed = new Set();
  // gather connected pieces, each laid out in its own coordinates first
  const comps = [];
  for (const seed of [panel.start, ...ids]) {
    if (!inP.has(seed) || claimed.has(seed)) continue;
    const tpos = new Map(), tcells = new Map();
    const place = (id, x, y) => { tpos.set(id, [x,y]); tcells.set(x+","+y, id); };
    place(seed, 0, 0); claimed.add(seed);
    const q = [seed];
    while (q.length) {
      const id = q.shift(); const [x,y] = tpos.get(id);
      for (const e of (adj.get(id)||[])) {
        if (!inP.has(e.to_room) || claimed.has(e.to_room)) continue;
        const d = D[e.dir];
        let wx = x+d[0], wy = y+d[1];
        if (tcells.has(wx+","+wy)) {
          // nudge: nearest free cell, preferring the same column, then closest
          let best = null;
          for (let r = 1; r <= 9 && !best; r++) {
            const cand = [];
            for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++) {
              if (Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
              if (!tcells.has((wx+dx)+","+(wy+dy))) cand.push([Math.abs(dx), Math.abs(dy), wx+dx, wy+dy]);
            }
            cand.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
            if (cand.length) best = [cand[0][2], cand[0][3]];
          }
          if (best) { wx = best[0]; wy = best[1]; }
        }
        place(e.to_room, wx, wy); claimed.add(e.to_room);
        q.push(e.to_room);
      }
    }
    let mnx=1e9, mny=1e9, mxx=-1e9, mxy=-1e9;
    for (const [x,y] of tpos.values()) { mnx=Math.min(mnx,x); mny=Math.min(mny,y); mxx=Math.max(mxx,x); mxy=Math.max(mxy,y); }
    comps.push({ tpos, mnx, mny, w: mxx-mnx+1, h: mxy-mny+1 });
  }
  // the main piece leads; the copyist's fragments shelve beneath it, tall first
  const pos = new Map();
  const put = (cp, ox, oy) => { for (const [id,[x,y]] of cp.tpos) pos.set(id, [x-cp.mnx+ox, y-cp.mny+oy]); };
  const main = comps.shift();
  let shelfY = 0;
  if (main) { put(main, 0, 0); shelfY = main.h + 1; }
  comps.sort((p,q)=>q.h-p.h||q.w-p.w);
  const WRAP = Math.max(main ? main.w : 0, 8);
  let nextX = 0, shelfH = 0;
  for (const cp of comps) {
    if (nextX > 0 && nextX + cp.w > WRAP) { nextX = 0; shelfY += shelfH + 1; shelfH = 0; }
    put(cp, nextX, shelfY);
    nextX += cp.w + 1;
    shelfH = Math.max(shelfH, cp.h);
  }
  return pos;
}

const BW=112, BH=28, GXX=26, GYY=30, CW=BW+GXX, CH=BH+GYY;
function panelHTML(panel) {
  const pos = layout(panel);
  let cols=0, rows=0;
  for (const [x,y] of pos.values()) { cols=Math.max(cols,x+1); rows=Math.max(rows,y+1); }
  const w = cols*CW-GXX, h = rows*CH-GYY;
  let lines = "", boxes = "";
  const seen = new Set();
  for (const [id,[x,y]] of pos) {
    const cx = x*CW+BW/2, cy = y*CH+BH/2;
    for (const e of (adj.get(id)||[])) {
      if (!pos.has(e.to_room)) {
        // the stair leaves this panel: a dotted stub marks the way through
        if (names.has(e.to_room)) {
          const d = D[e.dir];
          lines += `<line class="dot" x1="${cx}" y1="${cy}" x2="${cx + d[0]*(BW/2+18)}" y2="${cy + d[1]*(BH/2+20)}"/>`;
        }
        continue;
      }
      const pk = id < e.to_room ? id+"|"+e.to_room : e.to_room+"|"+id;
      if (seen.has(pk)) continue; seen.add(pk);
      const [tx,ty] = pos.get(e.to_room);
      const adjacent = Math.abs(tx-x)+Math.abs(ty-y) === 1;
      const dotted = VERT.has(e.dir) || !adjacent;
      lines += `<line x1="${cx}" y1="${cy}" x2="${tx*CW+BW/2}" y2="${ty*CH+BH/2}"${dotted?' class="dot"':''}/>`;
    }
  }
  for (const [id,[x,y]] of pos) {
    const cls = GATES.has(id) ? " gate" : THRONE.has(id) ? " throne" : SAFE.has(id) ? " safe" : DEEP.has(id)||id==="undercroft" ? " deep" : "";
    const pre = THRONE.has(id) ? "✦ " : SAFE.has(id) ? "◇ " : "";
    boxes += `<div class="cell${cls}" style="left:${x*CW}px;top:${y*CH}px">${pre}${names.get(id).replace(/^(The|A) /,"")}</div>`;
  }
  return `<div class="panel"><div class="ph"><div class="pt">${panel.title}</div><div class="ps">${panel.sub}</div></div>
  <svg class="rose" viewBox="0 0 44 44"><line x1="22" y1="6" x2="22" y2="38"/><line x1="6" y1="22" x2="38" y2="22"/><text x="22" y="5">N</text><text x="22" y="43.5">S</text><text x="41" y="23.5">E</text><text x="3" y="23.5">W</text></svg>
  <div class="grid" style="width:${w}px;height:${h}px"><svg width="${w}" height="${h}">${lines}</svg>${boxes}</div></div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--bg:#16120c;--panel:#1b160e;--cream:#ede3cc;--dim:#9a8b66;--gold:#d8a94e;--blood:#c96f5a;--bone:#c9bda3;--steel:#a4bec0;--border:#3a3020;--border2:#4a3c22;--line:#2c2418;}
body{background:var(--bg);margin:0;font-family:ui-monospace,Menlo,monospace;}
#poster{display:inline-block;background:var(--bg);padding:40px 56px 26px;}
#poster > .panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:26px 34px 30px;position:relative;}
.ph{text-align:center;margin-bottom:26px;}
.pt{color:${CRUDE ? "var(--blood)" : "var(--gold)"};font-family:Georgia,serif;font-size:21px;letter-spacing:0.22em;}
.ps{color:var(--dim);font-size:11.5px;margin-top:7px;font-family:Georgia,serif;font-style:italic;letter-spacing:0.04em;}
.rose{position:absolute;top:22px;left:24px;width:44px;height:44px;overflow:visible;}
.rose line{stroke:var(--dim);stroke-width:0.8;opacity:0.7;}
.rose text{fill:var(--dim);font-size:8px;text-anchor:middle;font-family:Georgia,serif;}
.grid{position:relative;margin:0 auto;}
.grid > svg{position:absolute;inset:0;}
.grid line{stroke:var(--border2);stroke-width:1.4;}
.grid line.dot{stroke:var(--dim);stroke-width:1.1;stroke-dasharray:2 5;opacity:0.85;}
.cell{position:absolute;width:${BW}px;height:${BH}px;line-height:${BH-2}px;text-align:center;overflow:hidden;white-space:nowrap;
  background:#241d13;border:1px solid var(--border2);border-radius:7px;color:var(--bone);font-size:9px;letter-spacing:0.02em;}
.cell.deep{background:#231419;}
.cell.gate{border-color:var(--gold);color:var(--gold);background:#2a2110;}
.cell.safe{border-color:var(--steel);color:var(--steel);}
.cell.throne{border-color:var(--blood);color:var(--blood);background:#2a1613;}
#dnote{text-align:center;color:var(--gold);font-size:11.5px;margin:18px 0;font-family:Georgia,serif;letter-spacing:0.06em;}
#legend{display:flex;gap:26px;justify-content:center;margin-top:22px;color:var(--dim);font-size:10px;}
#legend span::before{content:"";display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;vertical-align:-1px;border:1px solid var(--border2);background:#241d13;}
#legend .lg::before{border-color:var(--gold);background:#2a2110;}
#legend .ls::before{border-color:var(--steel);}
#legend .lt::before{border-color:var(--blood);background:#2a1613;}
#foot{text-align:center;color:var(--dim);font-size:10px;margin-top:12px;letter-spacing:0.05em;}
#foot .f2{opacity:0.6;margin-top:5px;}
</style></head><body><div id="poster">
${panelHTML(panels[0])}
<div id="dnote">▼ the black hatch — the Vaulted Hall drops to the Undercroft, and past it the descent is sealed: the deep keeps its own key ▼</div>
${panelHTML(panels[1])}
<div id="legend"><span class="lg">gate — enter · extract · bank</span><span>the halls</span><span class="ls">◇ hideaway — nothing hunts here</span><span class="lt">✦ the throne</span></div>
<div id="foot">${CRUDE
  ? `solid lines: passages the page swears by &nbsp;—&nbsp; dotted: stairs, and ways it cannot make honest &nbsp;—&nbsp; ${roomrows.length} of ${TOTAL} rooms made it onto this copy`
  : `solid lines: north · south · east · west &nbsp;—&nbsp; dotted: up / down &nbsp;—&nbsp; ${roomrows.length} rooms across the surface and the deep`}
<div class="f2">${CRUDE
  ? `crude copy №${copyNo} · copied from half a memory · the missing rooms are still down there`
  : `drawn from the exit graph, migrations 001 → ${lastMig} — the chart is the code · geography only (unpopulated)`}</div></div>
</div><script>const p=document.getElementById("poster");document.title=p.offsetWidth+"x"+p.offsetHeight;</script></body></html>`;
const htmlPath = join(os.tmpdir(), "nomad-chart.html");
fs.writeFileSync(htmlPath, html);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FLAGS = "--headless=new --disable-gpu --no-first-run --hide-scrollbars";
const dom = execSync(`"${CHROME}" ${FLAGS} --dump-dom "file://${htmlPath}" 2>/dev/null`).toString();
const m = dom.match(/<title>(\d+)x(\d+)<\/title>/);
if (!m) { console.error("measure pass failed — no <title>WxH</title> in dumped DOM"); process.exit(1); }
const out = join(os.homedir(), "Desktop", CRUDE ? "nomad-map-crude.png" : "nomad-map.png");
execSync(`"${CHROME}" ${FLAGS} --force-device-scale-factor=2 --window-size=${m[1]},${m[2]} --screenshot="${out}" "file://${htmlPath}" 2>/dev/null`);
console.log("chart written:", out);
