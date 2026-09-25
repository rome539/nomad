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
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;flex-wrap:wrap;gap:8px;"
    + "align-items:center;padding:8px 10px;background:rgba(11,9,6,.92);border-bottom:1px solid #3d3324;"
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
  var seen = {}, rows = [];
  Object.keys(ROOM_PLATE).forEach(function (r) { var s = alias[r] || r; if (!seen[s]) { seen[s] = 1; rows.push([s, r]); } });
  rows.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
  var gR = group("rooms"); rows.forEach(function (x) { opt(gR, "room:" + x[1], x[0]); });
  var gG = group("doors"); Object.keys(GATE_PLATE).sort().forEach(function (g) { opt(gG, "gate:" + g, g); });
  var gT = group("grounds"); Object.keys(TERRAIN_SCENES).sort().forEach(function (t) { opt(gT, "ground:" + t, t); });

  var hPrev = mk("button", stepCss, "\u2039");
  var hour = mk("select", btnCss);
  var hNext = mk("button", stepCss, "\u203a");
  ["day", "dawn", "dusk", "night", "moon", "blood", "eclipse", "fog", "rain", "snow", "after-rain"].forEach(function (h) {
    var o = document.createElement("option"); o.value = h; o.textContent = h; hour.appendChild(o); });

  var torchB = mk("button", btnCss, "torch: off"); var torch = 0;
  torchB.onclick = function () { torch = torch ? 0 : 1; torchB.textContent = "torch: " + (torch ? "on" : "off"); torchB.style.color = torch ? "#d8a94e" : "#c9bda3"; paint(); };

  var wPrev = mk("button", stepCss, "\u2039");
  var who = mk("select", btnCss);
  var wNext = mk("button", stepCss, "\u203a");
  Object.keys(MOB_ANIM).sort().forEach(function (id) { var o = document.createElement("option"); o.value = id; o.textContent = id; who.appendChild(o); });
  var addB = mk("button", btnCss, "+ add");
  var clrB = mk("button", btnCss, "clear");
  var shown = mk("span", "color:#9a8b66");
  mk("span", "margin-left:auto;color:#6f5c42", "\u2190\u2192 room  \u2191\u2193 hour  [ ] creature  T torch");
  var ids = [];
  addB.onclick = function () { ids.push(who.value); paint(); };
  clrB.onclick = function () { ids = []; paint(); };
  who.onchange = function () { ids = [who.value]; paint(); };

  // Remember the last pick so a reload - or flipping PROD/LOCAL - lands on the
  // same room with the same animals in it, which is what makes a comparison.
  var KEY = "gp-state";
  try { var st = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (st.g) gnd.value = st.g; if (st.h) hour.value = st.h; if (st.t) torch = 1; if (st.ids) ids = st.ids; } catch (e) {}
  if (!ids.length) ids = [who.value];
  if (torch) { torchB.textContent = "torch: on"; torchB.style.color = "#d8a94e"; }

  function paint() {
    var v = gnd.value, h = hour.value;
    if (v.indexOf("room:") === 0) {
      var r = v.slice(5);
      paintScene("upper", h, "", r, torch, 0, r);
    } else if (v.indexOf("gate:") === 0) {
      paintScene("mountain", h, v, "preview-gate", torch, 0, "");
    } else {
      paintScene("mountain", h, v.slice(7), "preview-ground", torch, 0, "");
    }
    fitPicture();
    updateMobs(ids.slice(), null, []);
    shown.textContent = ids.length ? "standing: " + ids.join(", ") : "nothing standing";
    try { localStorage.setItem(KEY, JSON.stringify({ g: gnd.value, h: hour.value, t: torch, ids: ids })); } catch (e) {}
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
