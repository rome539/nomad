// THE GAME'S OWN RENDERER, DRIVEN BY HAND. Injected INSIDE the client's module
// script by serve-preview.mjs (/game), because a module's functions are not on
// window - this is the only place paintScene and updateMobs can be called from.
//
// Nothing here draws anything. It picks a room, an hour, a torch and some
// creatures, and hands them to the same paintScene / updateMobs the game calls
// when the server sends a status frame. So what shows is what a player sees:
// the client's own CSS, scene fitting, mob scale, row layout and tints.
(function () {
  var SRC = window.__GAME_SRC || "local";
  // What a real session does once it is in: the threshold is the login gate,
  // and art is behind ART_KEYS on the server - here we grant it by hand.
  try { var th = document.getElementById("threshold"); if (th) th.remove(); } catch (e) {}
  grantArt(); setView("image"); setLogBig(false);

  var bar = document.createElement("div");
  bar.id = "gp";
  // AT THE BOTTOM, over the log and the command line - neither does anything
  // here, with no server behind the page. Pinned to the top it sat over the top
  // eleventh of every picture and hid it.
  bar.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:99999;display:flex;flex-wrap:wrap;gap:8px;"
    + "align-items:center;padding:8px 10px;background:rgba(11,9,6,.92);border-top:1px solid #3d3324;"
    + "font:12px ui-monospace,Menlo,monospace;color:#c9bda3";
  document.body.appendChild(bar);
  var mk = function (tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt) e.textContent = txt; bar.appendChild(e); return e; };
  var btnCss = "background:#1e1912;color:#c9bda3;border:1px solid #3d3324;border-radius:2px;padding:4px 8px;font:inherit;cursor:pointer";

  var tag = mk("a", "color:" + (SRC === "prod" ? "#8faa6b" : "#d8a94e") + ";font-weight:bold;text-decoration:none;border:1px solid currentColor;padding:3px 7px;border-radius:2px",
    SRC === "prod" ? "PROD - nomadmud.com" : "LOCAL - your working tree");
  tag.href = "/game?src=" + (SRC === "prod" ? "local" : "prod");
  tag.title = "switch to " + (SRC === "prod" ? "your local source" : "what is live on nomadmud.com");

  // GROUND: one line per PICTURE for room plates (PLATE_OF shares them), then
  // the doors, then the kinds of ground.
  var stepCss = btnCss + ";padding:4px 7px";
  var gPrev = mk("button", stepCss, "\u2039");
  var gnd = mk("select", btnCss);
  var gNext = mk("button", stepCss, "\u203a");
  var group = function (label) { var g = document.createElement("optgroup"); g.label = label; gnd.appendChild(g); return g; };
  var opt = function (g, v, t) { var o = document.createElement("option"); o.value = v; o.textContent = t; g.appendChild(o); };
  var alias = (typeof PLATE_OF === "object" && PLATE_OF) || {};
  // GROUPED BY WHERE THE PICTURE IS (rome, 2026-09-29), not by what kind of
  // table named it: every region's grounds, doors and rooms together. The room
  // and door regions are read off the world's rooms table and written here,
  // because the client has no region for a room it is not standing in; a new
  // plate missing from it lands under "Other" until this list is refreshed.
  var PLACE = {"the-smithy":"The Dens","the-bare-chapel":"The Dens","the-mill":"The Dens","the-wheel-pit":"The Dens","the-reeves-house":"The Dens","the-reeves-loft":"The Dens","the-north-house":"The Dens","the-black-hut":"The Dens","the-warreners-lodge":"The Dens","the-lodge-loft":"The Dens","a-dry-burrow":"The Fortress","armory":"The Fortress","barracks":"The Fortress","black-canal":"The Fortress","black-threshold":"The Fortress","blackreach":"The Fortress","bone-nook":"The Fortress","bone-processional":"The Fortress","bone-reliquary":"The Fortress","carrion-gallery":"The Fortress","catacomb":"The Fortress","cells":"The Fortress","chapel":"The Fortress","chapter-house":"The Fortress","cistern":"The Fortress","crypt-steps":"The Fortress","debtors-pit":"The Fortress","deep-ossuary":"The Fortress","drowned-barracks":"The Fortress","drowned-court":"The Fortress","drowned-nave":"The Fortress","forge":"The Fortress","gallery":"The Fortress","gate":"The Fortress","guardroom":"The Fortress","hall":"The Fortress","hollow-crack":"The Fortress","kennels":"The Fortress","kings-hoard":"The Fortress","kings-oratory":"The Fortress","larder":"The Fortress","leech-pools":"The Fortress","library":"The Fortress","muster":"The Fortress","ossuary":"The Fortress","oubliette":"The Fortress","pocket-of-air":"The Fortress","refectory":"The Fortress","root-vault":"The Fortress","sally-port":"The Fortress","scriptorium":"The Fortress","scullery":"The Fortress","sewer":"The Fortress","shrine":"The Fortress","silted-stair":"The Fortress","smokehouse":"The Fortress","stair":"The Fortress","sunken-gallery":"The Fortress","sunken-throne":"The Fortress","sunless-well":"The Fortress","the-back-wall":"The Mountain","the-bell-cote":"The Fortress","the-birdless-acre":"The Wood","the-black-fen":"The Fortress","the-blind-gallery":"The Deep","the-bone-font":"The Deep","the-bone-ground":"The Mountain","the-bone-midden":"The Fortress","the-bone-organ":"The Deep","the-bone-sift":"The Deep","the-bone-vestry":"The Deep","the-bored-passage":"The Deep","the-bounds-house":"The Wood","the-breathing-hall":"The Fortress","the-briar-field":"The Fortress","the-brine-cellar":"The Deep","the-broken-battlement":"The Fortress","the-buried-chapel":"The Fortress","the-burned-village":"The Fortress","the-cable-walk":"The Deep","the-cantors-cells":"The Deep","the-cantors-door":"The Deep","the-causeway":"The Fortress","the-siege-bank":"The Fortress","the-spoil-heap":"The Fortress","the-battery":"The Fortress","the-shot-pile":"The Fortress","the-forge-pit":"The Fortress","the-camp-ground":"The Fortress","the-suttlers-row":"The Fortress","the-horse-lines":"The Fortress","the-marshals-lodging":"The Fortress","the-sap-head":"The Fortress","the-mine-mouth":"The Fortress","the-village-street":"The Fortress","the-pound":"The Fortress","the-tithe-barn":"The Fortress","the-well-head":"The Fortress","the-church-shell":"The Fortress","the-churchyard":"The Fortress","the-bell-pit":"The Fortress","the-green":"The Fortress","the-village-smithy":"The Fortress","the-fish-stew":"The Fortress","the-orchard-rows":"The Fortress","the-cider-house":"The Fortress","the-gibbet-field":"The Fortress","the-crossroads-grave":"The Fortress","the-mine-gallery":"The Fortress","the-camouflet":"The Fortress","the-culver-house":"The Fortress","the-charnel":"The Fortress","the-chain-well":"The Deep","the-charnel-chute":"The Deep","the-choir-drain":"The Deep","the-choir-floor":"The Deep","the-choir-stair":"The Deep","the-chute-foot":"The Deep","the-cistern":"The Fortress","the-cold-hearth":"The Fortress","the-cold-pantry":"The Deep","the-cooperage":"The Deep","the-crawl-of-teeth":"The Fortress","the-crawlway":"The Deep","the-crossing-house":"The Crossing","the-death-cell":"The Fortress","the-deep-mark":"The Crossing","the-descent":"The Fortress","the-drag":"The Deep","the-drain-run":"The Deep","the-dripping-gallery":"The Fortress","the-drowned-kitchens":"The Deep","the-drowned-orchard":"The Fortress","the-drowning-stair":"The Fortress","the-dry-bones":"The Mountain","the-dry-moat":"The Fortress","the-earth-throat":"The Fortress","the-eel-run":"The Fortress","the-embalming-room":"The Deep","the-feeling-wall":"The Deep","the-ferry-house":"The Crossing","the-first-milestone":"The Road","the-flood-mark":"The Deep","the-flooded-cloister":"The Deep","the-gasping-dark":"The Fortress","the-gate-arch":"The Wood","the-gatefall":"The Fortress","the-gnaw-hollow":"The Fortress","the-gnawed-arch":"The Deep","the-gods-pool":"The Deep","the-hall-floor":"The Wood","the-hanging-hill":"The Fortress","the-heart-of-it":"The Wood","the-held-note":"The Deep","the-hyena-den":"The Fortress","the-issue-room":"The Fortress","the-kept-room":"The Mountain","the-kings-stair":"The Deep","the-last-shelter":"The Mountain","the-leaning-spire":"The Fortress","the-lectern-room":"The Deep","the-lightless-march":"The Fortress","the-lock-keepers-room":"The Deep","the-long-pews":"The Deep","the-long-swallow":"The Fortress","the-lung-vent":"The Deep","the-marrow-road":"The Fortress","the-marrow-seat":"The Deep","the-mass-grave":"The Fortress","the-moon-glade":"The Wood","the-ochre-shelf":"The Mountain","the-old-road":"The Fortress","the-oxide-flat":"The Mountain","the-rat-warren":"The Fortress","the-relay-house":"The Road","the-rib-cage":"The Mountain","the-root-gnawed-run":"The Fortress","the-root-shaft":"The Deep","the-rotted-scaffold":"The Fortress","the-sally-ditch":"The Fortress","the-salt-pool":"The Crossing","the-salt-vault":"The Fortress","the-scavengers-shelf":"The Deep","the-scraped-hall":"The Deep","the-sewer-slip":"The Fortress","the-shelter-crag":"The Mountain","the-shieling":"The Mountain","the-silt-bank":"The Deep","the-silt-chapel":"The Fortress","the-silt-fall":"The Deep","the-singing-gallery":"The Deep","the-slabs":"The Mountain","the-sluice-gear":"The Deep","the-sluice-walk":"The Deep","the-stell":"The Mountain","the-still-cradle":"The Fortress","the-summit":"The Mountain","the-summit-gate":"The Mountain","the-sump":"The Fortress","the-sunk-bell":"The Deep","the-thorn-court":"The Fortress","the-tide-gate":"The Fortress","the-tide-throat":"The Fortress","the-timber-stack":"The Wood","the-under-weir":"The Fortress","the-undermine":"The Fortress","the-undertow":"The Fortress","the-waiting-hall":"The Deep","the-wall-breach":"The Fortress","the-wall-walk":"The Fortress","the-watch-turret":"The Fortress","the-weepers-crown":"The Fortress","the-weir":"The Fortress","the-withy-hut":"The Wood","the-wolf-earth":"The Wood","the-wormcast-pit":"The Deep","tide-vault":"The Fortress","undercroft":"The Fortress","warden-post":"The Fortress","weeper-arch":"The Mountain","weeper-hall":"The Fortress","weeping-cells":"The Fortress","well":"The Fortress","worm-bore":"The Fortress","worm-cloister":"The Fortress"};
  var GROUND_PLACE = {
    "The Mountain": "snow cairn gully scree boulder slab glass fold alder corrie-rim corrie-floor mountainside crag beck vent",
    "The Crossing": "causeway ford ferry staithe bridge marsh shell reed eyot shore-road works sea-cave",
    "The Road": "the-kept-road the-frost-heaved-paving the-cart-ruts",
    "The Wood": "wood glade wet sunken heath holding under-roots",
    "The Dens": "the-dens fields common"
  };
  var groundAt = {};
  Object.keys(GROUND_PLACE).forEach(function (l) { GROUND_PLACE[l].split(" ").forEach(function (t) { groundAt[t] = l; }); });
  var ORDER = ["The Gatehouse", "The Fortress", "The Deep", "The Mountain", "The Crossing", "The Road", "The Wood", "The Dens", "Other"];
  var byLoc = {};
  var put = function (loc, v, t) { (byLoc[loc] = byLoc[loc] || []).push([v, t]); };
  var seen = {}, rows = [];
  Object.keys(ROOM_PLATE).forEach(function (r) { var s = alias[r] || r; if (!seen[s]) { seen[s] = 1; rows.push([s, r]); } });
  rows.forEach(function (x) { put(PLACE[x[1]] || "Other", "room:" + x[1], x[0]); });
  Object.keys(GATE_PLATE).forEach(function (g) { put(PLACE[g] || "Other", "gate:" + g, "door \u00b7 " + g); });
  Object.keys(TERRAIN_SCENES).forEach(function (t) { put(groundAt[t] || "Other", "ground:" + t, "ground \u00b7 " + t); });
  // The gatehouse is a single baked plate, so it is not in TERRAIN_SCENES; it is
  // named here by hand so its feasts can be looked at.
  put("The Gatehouse", "ground:gatehouse", "gatehouse");
  // grounds first, then doors, then rooms, each alphabetical
  var rank = function (v) { return v.indexOf("ground:") === 0 ? 0 : v.indexOf("gate:") === 0 ? 1 : 2; };
  ORDER.forEach(function (l) {
    var list = byLoc[l]; if (!list) return;
    list.sort(function (a, b) { return rank(a[0]) - rank(b[0]) || (a[1] < b[1] ? -1 : 1); });
    var g = group(l); list.forEach(function (x) { opt(g, x[0], x[1]); });
  });

  var hPrev = mk("button", stepCss, "\u2039");
  var hour = mk("select", btnCss);
  var hNext = mk("button", stepCss, "\u203a");
  ["day", "dawn", "dusk", "night", "moon", "blood", "eclipse", "fog", "rain", "snow", "after-rain"].forEach(function (h) {
    var o = document.createElement("option"); o.value = h; o.textContent = h; hour.appendChild(o); });

  // THE SKY AT 20x. At the game's pace a screen of sky takes four minutes to go
  // by, which is right for playing and useless for checking a seam; this runs
  // the same drift twenty times over so the join comes past in seconds.
  var skyB = mk("button", btnCss, "20x: off"), skyBase = SKY_DRIFT;
  skyB.onclick = function () {
    var fast = SKY_DRIFT === skyBase;
    SKY_DRIFT = fast ? skyBase * 20 : skyBase;
    skyB.textContent = "20x: " + (fast ? "on" : "off"); skyB.style.color = fast ? "#d8a94e" : "#c9bda3";
  };

  var torchB = mk("button", btnCss, "torch: off"); var torch = 0;
  torchB.onclick = function () { torch = torch ? 0 : 1; torchB.textContent = "torch: " + (torch ? "on" : "off"); torchB.style.color = torch ? "#d8a94e" : "#c9bda3"; paint(); };

  // THE GATEHOUSE'S FEASTS go by the real date, so without this you would wait
  // months to see three of them. "by date" is what a player gets today.
  var feast = mk("select", btnCss);
  [["", "feast: by date"], ["none", "feast: none"], ["midsummer", "midsummer"], ["harvest", "harvest"], ["halloween", "halloween"], ["yule", "yule"]].forEach(function (x) {
    var o = document.createElement("option"); o.value = x[0]; o.textContent = x[1]; feast.appendChild(o); });
  feast.onchange = function () { paint(); };

  var wPrev = mk("button", stepCss, "\u2039");
  var who = mk("select", btnCss);
  var wNext = mk("button", stepCss, "\u203a");
  Object.keys(MOB_ANIM).sort().forEach(function (id) { var o = document.createElement("option"); o.value = id; o.textContent = id; who.appendChild(o); });
  var addB = mk("button", btnCss, "+ add");
  var clrB = mk("button", btnCss, "clear");
  // THE BEAT THE SERVER WOULD SEND. The salute, the rise, the grip are events
  // now - nothing plays them on a clock - so with no server here this is the
  // only way to see one. Each press sends the next event pose any creature on
  // screen is drawn with, the same way the wire does.
  var actB = mk("button", btnCss, "event pose");
  var actN = 0;
  actB.onclick = function () {
    var todo = [];
    ids.forEach(function (id) { var fr = (MOB_ANIM[id] || {}).f || {};
      EVENT_POSES.forEach(function (p) { if (fr[p] !== undefined) todo.push([id, p]); }); });
    if (!todo.length) { actB.textContent = "event pose: none drawn"; return; }
    var x = todo[actN++ % todo.length];
    actB.textContent = "event pose: " + x[1];
    mobBeat(null, null, null, null, null, [x[0]], x[1]);
  };
  var shown = mk("span", "color:#9a8b66");
  mk("span", "margin-left:auto;color:#6f5c42", "\u2190\u2192 room  \u2191\u2193 hour  [ ] creature  T torch  P event pose");
  var ids = [];
  addB.onclick = function () { ids.push(who.value); paint(); };
  clrB.onclick = function () { ids = []; paint(); };
  who.onchange = function () { ids = [who.value]; paint(); };

  // Remember the last pick so a reload - or flipping PROD/LOCAL - lands on the
  // same room with the same animals in it, which is what makes a comparison.
  var KEY = "gp-state";
  try { var st = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (st.f) feast.value = st.f; if (st.g) gnd.value = st.g; if (st.h) hour.value = st.h; if (st.t) torch = 1; if (st.ids) ids = st.ids; } catch (e) {}
  if (!ids.length) ids = [who.value];
  if (torch) { torchB.textContent = "torch: on"; torchB.style.color = "#d8a94e"; }

  function paint() {
    var v = gnd.value, h = hour.value;
    // THE RED NIGHT IS A FLAG, NOT A SKY. The server sends it beside the sky on
    // every frame, and it is what lights the hollow's eyes - so choosing the
    // blood sky here has to raise it too, and every other hour has to lower it.
    var red = h === "blood" ? 1 : 0;
    if (typeof FEAST_FORCE !== "undefined") FEAST_FORCE = feast.value;
    if (v.indexOf("room:") === 0) {
      var r = v.slice(5);
      paintScene("upper", h, "", r, torch, 0, r, 0, red);
    } else if (v.indexOf("gate:") === 0) {
      paintScene("mountain", h, v, "preview-gate", torch, 0, "", 0, red);
    } else {
      paintScene("mountain", h, v.slice(7), "preview-ground", torch, 0, "", 0, red);
    }
    fitPicture();
    updateMobs(ids.slice(), null, []);
    shown.textContent = ids.length ? "standing: " + ids.join(", ") : "nothing standing";
    try { localStorage.setItem(KEY, JSON.stringify({ g: gnd.value, h: hour.value, t: torch, ids: ids, f: feast.value })); } catch (e) {}
  }
  gnd.onchange = paint; hour.onchange = paint;

  // STEP THROUGH, WRAPPING AT THE ENDS. A select is the slowest way to look at
  // forty plates in a row; this is the fast one.
  function step(sel, d) {
    var n = sel.options.length; if (!n) return;
    sel.selectedIndex = (sel.selectedIndex + d + n) % n;
  }
  gPrev.onclick = function () { step(gnd, -1); paint(); };
  gNext.onclick = function () { step(gnd, 1); paint(); };
  hPrev.onclick = function () { step(hour, -1); paint(); };
  hNext.onclick = function () { step(hour, 1); paint(); };
  wPrev.onclick = function () { step(who, -1); ids = [who.value]; paint(); };
  wNext.onclick = function () { step(who, 1); ids = [who.value]; paint(); };

  // CAPTURE PHASE, so the client's own command line - which has focus, and
  // uses the arrows for its history - never sees these keys. Nothing is typed
  // into it here; there is no server to send a command to.
  window.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key, hit = true;
    if (k === "ArrowRight") { step(gnd, 1); paint(); }
    else if (k === "ArrowLeft") { step(gnd, -1); paint(); }
    else if (k === "ArrowDown") { step(hour, 1); paint(); }
    else if (k === "ArrowUp") { step(hour, -1); paint(); }
    else if (k === "]") { step(who, 1); ids = [who.value]; paint(); }
    else if (k === "[") { step(who, -1); ids = [who.value]; paint(); }
    else if (k === "t" || k === "T") { torchB.onclick(); }
    else if (k === "p" || k === "P") { actB.onclick(); }
    else hit = false;
    if (hit) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  window.addEventListener("resize", function () { fitPicture(); });
  paint();

  // WARM EVERY ROOM PLATE, ONE AT A TIME, AFTER THE FIRST PAINT. The client only
  // swaps a picture in once it has loaded, so the first visit to each plate was a
  // pause; stepping through forty of them was forty pauses. Each file is asked
  // for with the same ?v= the client uses, so this fills the very cache entry
  // the next paint will hit. Sequential, so the room on screen is never queued
  // behind thirty others.
  var warm = [];
  rows.forEach(function (x) {
    ROOM_PLATE[x[1]].split(" ").forEach(function (c) { warm.push("/room-bg/" + x[0] + "-" + c + ".webp?v=" + BG_V); });
  });
  (function next() {
    var u = warm.shift(); if (!u) return;
    var im = new Image(); im.onload = im.onerror = function () { setTimeout(next, 0); }; im.src = u;
  })();
})();
