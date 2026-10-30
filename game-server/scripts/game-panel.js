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
  var PLACE = {"the-smithy":"The Dens","the-bare-chapel":"The Dens","the-mill":"The Dens","the-wheel-pit":"The Dens","the-reeves-house":"The Dens","the-reeves-loft":"The Dens","the-north-house":"The Dens","the-black-hut":"The Dens","the-warreners-lodge":"The Dens","the-lodge-loft":"The Dens","a-dry-burrow":"The Fortress","armory":"The Fortress","barracks":"The Fortress","black-canal":"The Fortress","black-threshold":"The Fortress","blackreach":"The Fortress","bone-nook":"The Fortress","bone-processional":"The Fortress","bone-reliquary":"The Fortress","carrion-gallery":"The Fortress","catacomb":"The Fortress","cells":"The Fortress","chapel":"The Fortress","chapter-house":"The Fortress","cistern":"The Fortress","crypt-steps":"The Fortress","debtors-pit":"The Fortress","deep-ossuary":"The Fortress","drowned-barracks":"The Fortress","drowned-court":"The Fortress","drowned-nave":"The Fortress","forge":"The Fortress","gallery":"The Fortress","gate":"The Fortress","guardroom":"The Fortress","hall":"The Fortress","hollow-crack":"The Fortress","kennels":"The Fortress","kings-hoard":"The Fortress","kings-oratory":"The Fortress","larder":"The Fortress","leech-pools":"The Fortress","library":"The Fortress","muster":"The Fortress","ossuary":"The Fortress","oubliette":"The Fortress","pocket-of-air":"The Fortress","refectory":"The Fortress","root-vault":"The Fortress","sally-port":"The Fortress","scriptorium":"The Fortress","scullery":"The Fortress","sewer":"The Fortress","shrine":"The Fortress","silted-stair":"The Fortress","smokehouse":"The Fortress","stair":"The Fortress","sunken-gallery":"The Fortress","sunken-throne":"The Fortress","sunless-well":"The Fortress","the-back-wall":"The Mountain","the-bell-cote":"The Fortress","the-birdless-acre":"The Wood","the-black-fen":"The Fortress","the-blind-gallery":"The Deep","the-bone-font":"The Deep","the-bone-ground":"The Mountain","the-bone-midden":"The Fortress","the-bone-organ":"The Deep","the-bone-sift":"The Deep","the-bone-vestry":"The Deep","the-bored-passage":"The Deep","the-bounds-house":"The Wood","the-breathing-hall":"The Fortress","the-briar-field":"The Fortress","the-brine-cellar":"The Deep","the-broken-battlement":"The Fortress","the-buried-chapel":"The Fortress","the-burned-village":"The Fortress","the-cable-walk":"The Deep","the-cantors-cells":"The Deep","the-cantors-door":"The Deep","the-causeway":"The Fortress","the-dead-cart-track":"The Fortress","the-camp-tail":"The Fortress","the-toft-ends":"The Fortress","the-windfall-bank":"The Fortress","the-siege-bank":"The Fortress","the-spoil-heap":"The Fortress","the-battery":"The Fortress","the-shot-pile":"The Fortress","the-forge-pit":"The Fortress","the-camp-ground":"The Fortress","the-suttlers-row":"The Fortress","the-horse-lines":"The Fortress","the-marshals-lodging":"The Fortress","the-sap-head":"The Fortress","the-mine-mouth":"The Fortress","the-village-street":"The Fortress","the-pound":"The Fortress","the-tithe-barn":"The Fortress","the-well-head":"The Fortress","the-church-shell":"The Fortress","the-churchyard":"The Fortress","the-bell-pit":"The Fortress","the-green":"The Fortress","the-village-smithy":"The Fortress","the-fish-stew":"The Fortress","the-orchard-rows":"The Fortress","the-cider-house":"The Fortress","the-gibbet-field":"The Fortress","the-crossroads-grave":"The Fortress","the-mine-gallery":"The Fortress","the-camouflet":"The Fortress","the-culver-house":"The Fortress","the-charnel":"The Fortress","the-chain-well":"The Deep","the-charnel-chute":"The Deep","the-choir-drain":"The Deep","the-choir-floor":"The Deep","the-choir-stair":"The Deep","the-chute-foot":"The Deep","the-cistern":"The Fortress","the-cold-hearth":"The Fortress","the-cold-pantry":"The Deep","the-cooperage":"The Deep","the-crawl-of-teeth":"The Fortress","the-crawlway":"The Deep","the-crossing-house":"The Crossing","the-death-cell":"The Fortress","the-deep-mark":"The Crossing","the-descent":"The Fortress","the-drag":"The Deep","the-drain-run":"The Deep","the-dripping-gallery":"The Fortress","the-drowned-kitchens":"The Deep","the-drowned-orchard":"The Fortress","the-drowning-stair":"The Fortress","the-dry-bones":"The Mountain","the-dry-moat":"The Fortress","the-earth-throat":"The Fortress","the-eel-run":"The Fortress","the-embalming-room":"The Deep","the-feeling-wall":"The Deep","the-ferry-house":"The Crossing","the-first-milestone":"The Road","the-flood-mark":"The Deep","the-flooded-cloister":"The Deep","the-gasping-dark":"The Fortress","the-gate-arch":"The Wood","the-gatefall":"The Fortress","the-gnaw-hollow":"The Fortress","the-gnawed-arch":"The Deep","the-gods-pool":"The Deep","the-hall-floor":"The Wood","the-hanging-hill":"The Fortress","the-heart-of-it":"The Wood","the-held-note":"The Deep","the-hyena-den":"The Fortress","the-issue-room":"The Fortress","the-kept-room":"The Mountain","the-kings-stair":"The Deep","the-last-shelter":"The Mountain","the-leaning-spire":"The Fortress","the-lectern-room":"The Deep","the-lightless-march":"The Fortress","the-lock-keepers-room":"The Deep","the-long-pews":"The Deep","the-long-swallow":"The Fortress","the-lung-vent":"The Deep","the-marrow-road":"The Fortress","the-marrow-seat":"The Deep","the-mass-grave":"The Fortress","the-moon-glade":"The Wood","the-ochre-shelf":"The Mountain","the-old-road":"The Fortress","the-oxide-flat":"The Mountain","the-rat-warren":"The Fortress","the-relay-house":"The Road","the-rib-cage":"The Mountain","the-root-gnawed-run":"The Fortress","the-root-shaft":"The Deep","the-rotted-scaffold":"The Fortress","the-sally-ditch":"The Fortress","the-salt-pool":"The Crossing","the-salt-vault":"The Fortress","the-scavengers-shelf":"The Deep","the-scraped-hall":"The Deep","the-sewer-slip":"The Fortress","the-shelter-crag":"The Mountain","the-shieling":"The Mountain","the-silt-bank":"The Deep","the-silt-chapel":"The Fortress","the-silt-fall":"The Deep","the-singing-gallery":"The Deep","the-slabs":"The Mountain","the-sluice-gear":"The Deep","the-sluice-walk":"The Deep","the-stell":"The Mountain","the-still-cradle":"The Fortress","the-summit":"The Mountain","the-summit-gate":"The Mountain","the-sump":"The Fortress","the-sunk-bell":"The Deep","the-thorn-court":"The Fortress","the-tide-gate":"The Fortress","the-tide-throat":"The Fortress","the-timber-stack":"The Wood","the-under-weir":"The Fortress","the-undermine":"The Fortress","the-undertow":"The Fortress","the-waiting-hall":"The Deep","the-wall-breach":"The Fortress","the-wall-walk":"The Fortress","the-watch-turret":"The Fortress","the-weepers-crown":"The Fortress","the-weir":"The Fortress","the-withy-hut":"The Wood","the-wolf-earth":"The Wood","the-wormcast-pit":"The Deep","tide-vault":"The Fortress","undercroft":"The Fortress","warden-post":"The Fortress","weeper-arch":"The Mountain","weeper-hall":"The Fortress","weeping-cells":"The Fortress","well":"The Fortress","worm-bore":"The Fortress","worm-cloister":"The Fortress"};
  var GROUND_PLACE = {
    "The Mountain": "snow glacier cairn ridge gully scree boulder slab glass fold alder corrie-rim corrie-floor mountainside crag towers beck vent",
    "The Crossing": "causeway ford ferry ferry-hard staithe bridge marsh marsh-samphire marsh-carr marsh-dyke shell reed eyot shore-road works sea-cave",
    "The Road": "the-kept-road the-frost-heaved-paving the-cart-ruts road-oaks road-hedges road-moor road-gill",
    "The Wood": "wood wood-felling wood-osier wood-bailey wood-burnt wood-holly wood-birch glade wet sunken heath holding under-roots cave-mouth cave-passage cave",
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
  ["day", "dawn", "dusk", "night", "moon", "blood", "eclipse", "fog", "rain", "snow", "after-rain", "wet-dawn", "wet-dusk", "wet-night"].forEach(function (h) {
    var o = document.createElement("option"); o.value = h; o.textContent = h; hour.appendChild(o); });
  // THE TIME OF DAY UNDER THE WEATHER. The server sends fog, rain and snow at
  // any hour, with the night flag and the low light (dawn, dusk) beside them, so
  // the weather has to be seen at each. "as the sky" is the hour the sky names.
  var tod = mk("select", btnCss);
  [["", "time: as the sky"], ["day", "time: day"], ["dawn", "time: dawn"], ["dusk", "time: dusk"], ["night", "time: night"]].forEach(function (x) {
    var o = document.createElement("option"); o.value = x[0]; o.textContent = x[1]; tod.appendChild(o); });
  var askTod = new URLSearchParams(location.search).get("time");
  if (askTod) tod.value = askTod;
  // THE HOLLOW'S EYES as the server would send them (chips.ts): the grudge and
  // the deep's breath. The blood moon and the eclipse come from the sky above.
  var eyeSel = mk("select", btnCss);
  [["", "eyes: as the sky has them"], ["ember", "eyes: ember (a grudge)"], ["frost", "eyes: frost (the deep breathes)"]].forEach(function (x) {
    var o = document.createElement("option"); o.value = x[0]; o.textContent = x[1]; eyeSel.appendChild(o); });
  eyeSel.onchange = function () { lastEyes = eyeSel.value ? [eyeSel.value, eyeSel.value, eyeSel.value, eyeSel.value] : null; };

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

  // A ROOM'S LOOK, through the log's own print(), so how a look reads can be
  // judged here (rome, 2026-10-28: the Camp Ground, a kill, crows and a hyena).
  var lookB = mk("button", btnCss, "sample look");
  lookB.onclick = function () {
    knownRooms["The Camp Ground"] = 1;
    print(["The Camp Ground",
      "Rows of shallow rectangular hollows in the turf, each the size of a hut, in ranks with streets between them, going on further than you would like to count. Nothing above ground survives. The shape of a town that stood here for a season is cut into the grass and will be there for a thousand years.",
      "Exits: south, north, west, east.",
      "The ground is freshly disturbed \u2014 someone passed this way minutes ago.",
      "Two kills here, eaten where they fell: one fresh, with hair and the packed earth torn up, and one older, just tufts of hair and a dark patch.",
      "Far off to the south, crows are wheeling low over something, and more are coming in.",
      "A pitch-soaked torch lies here.",
      "A grave-hyena is here, lapping the bloodied stone clean."].join("\n"));
    print("Tiny claws scrabble away to the south, fast.", "amb");
  };
  window.__sampleLook = lookB.onclick;

  // THE GATEHOUSE'S FEASTS go by the real date, so without this you would wait
  // months to see three of them. "by date" is what a player gets today.
  var feast = mk("select", btnCss);
  [["", "feast: by date"], ["none", "feast: none"], ["midsummer", "midsummer"], ["harvest", "harvest"], ["halloween", "halloween"], ["yule", "yule"]].forEach(function (x) {
    var o = document.createElement("option"); o.value = x[0]; o.textContent = x[1]; feast.appendChild(o); });
  feast.onchange = function () { paint(); };

  var wPrev = mk("button", stepCss, "\u2039");
  var who = mk("select", btnCss);
  var wNext = mk("button", stepCss, "\u203a");
  // Shown and sorted without a leading "the-", so the-chainman files under c.
  var bare = function (id) { return id.replace(/^the-/, ""); };
  Object.keys(MOB_ANIM).sort(function (a, b) { return bare(a) < bare(b) ? -1 : bare(a) > bare(b) ? 1 : 0; })
    .forEach(function (id) { var o = document.createElement("option"); o.value = id; o.textContent = bare(id); who.appendChild(o); });
  var addB = mk("button", btnCss, "+ add");
  var clrB = mk("button", btnCss, "clear");
  // THE BEAT THE SERVER WOULD SEND. The salute, the rise, the grip are events
  // now - nothing plays them on a clock - so with no server here this is the
  // only way to see one. Each press sends the next event pose any creature on
  // screen is drawn with, the same way the wire does.
  var actB = mk("button", btnCss, "event pose");
  var actN = 0;
  actB.onclick = function () {
    revive();
    var todo = [];
    ids.forEach(function (id) { var fr = (MOB_ANIM[id] || {}).f || {};
      EVENT_POSES.forEach(function (p) { if (fr[p] !== undefined) todo.push([id, p]); }); });
    if (!todo.length) { actB.textContent = "event pose: none drawn"; return; }
    var x = todo[actN++ % todo.length];
    actB.textContent = "event pose: " + x[1];
    mobBeat(null, null, null, null, null, [x[0]], x[1]);
  };
  // EVERY FRAME, ON DEMAND (rome, 2026-10-13). With no server there is no
  // fight, so nothing here ever swung or fell. A plays the attack the wire would
  // send, X the death, and F freezes the row and steps every creature on it
  // through its strip one frame at a time, naming the frame. Any other key lets
  // it move again.
  var frameAt = -1;
  var frameB = mk("button", btnCss, "frames");
  // ...and a way out of it: shown only while a frame is held, it lets the row move again
  var frameOff = mk("button", btnCss + ";display:none", "frames off");
  function liveAgain() { if (frameAt >= 0) { frameAt = -1; stillness = false; frameB.textContent = "frames"; frameOff.style.display = "none"; lastMobs = "x"; paint(); } }
  frameOff.onclick = liveAgain;
  // THE DEAD GET UP AGAIN. In the game a corpse stays down; here the next
  // thing asked of the row - attack, death again, a pose, a call, the frames -
  // stands everyone back up first, the same as clearing and adding them.
  function revive() {
    var down = anims.some(function (a) { return a.phase === "death"; }) || (mobsEl && mobsEl.querySelector(".mob.dead"));
    if (!down) return;
    // ...and at once: a death holds the row still for its fall, which would
    // swallow the rebuild until the fall was over.
    mobHold = 0; mobPending = null;
    var keep = ids.slice(); ids = []; paint(); ids = keep; paint();
  }
  function stepFrame() {
    if (frameAt < 0) revive();
    var els = mobsEl ? mobsEl.querySelectorAll(".mob:not(.dead)") : [];
    if (!els.length) return;
    // ...and the timer stops with it, or its next tick paints over the frame
    stillness = true; runAnims(); frameAt++;
    var label = "";
    for (var i = 0; i < els.length; i++) {
      var id = els[i].dataset.id, spec = MOB_ANIM[id];
      if (!spec) continue;
      var k = frameAt % spec.n;
      els[i].style.backgroundPositionX = (spec.n > 1 ? k * 100 / (spec.n - 1) : 0) + "%";
      els[i].style.setProperty("--bpx", (spec.n > 1 ? k * 100 / (spec.n - 1) : 0) + "%");
      if (!label) for (var p in spec.f) if (spec.f[p] === k) { label = p + " (" + (k + 1) + "/" + spec.n + ")"; break; }
    }
    frameB.textContent = "frame: " + (label || frameAt);
    frameOff.style.display = "";
  }
  frameB.onclick = stepFrame;
  // THE WALK, ON DEMAND (rome, 2026-10-16: to judge which strips' walking frames
  // need redrawing). G holds every creature on the row in its walk, the same
  // walk a player sees, and puts its two gait frames side by side, large, in a
  // card at the top right. It stays on while [ ] step through the roster, so
  // the whole list can be walked one after another. A flier shows its wingbeat
  // pair; a creature drawn with neither says so.
  var walkOn = false, walkTimer = null, walkCard = null;
  var walkB = mk("button", btnCss, "walk: off");
  function gaitOf(id) {
    var f = (MOB_ANIM[id] || {}).f || {};
    if (f["move-a"] !== undefined && f["move-b"] !== undefined) return ["move-a", "move-b"];
    if (f.up !== undefined && f.down !== undefined) return ["up", "down"];
    return null;
  }
  function walkCardPaint() {
    if (!walkCard) {
      walkCard = document.createElement("div");
      walkCard.style.cssText = "position:fixed;top:56px;right:12px;z-index:99998;padding:10px;background:rgba(11,9,6,.92);"
        + "border:1px solid #3d3324;border-radius:2px;font:12px ui-monospace,Menlo,monospace;color:#c9bda3;display:flex;flex-direction:column;gap:6px";
      document.body.appendChild(walkCard);
    }
    walkCard.replaceChildren();
    var id = who.value, spec = MOB_ANIM[id], gait = gaitOf(id);
    var head = document.createElement("div"); head.style.color = "#d8a94e";
    head.textContent = id + (gait ? "" : " - no walking frames drawn");
    walkCard.appendChild(head);
    if (!spec || !gait) return;
    var row = document.createElement("div"); row.style.cssText = "display:flex;gap:10px";
    gait.forEach(function (name) {
      var k = spec.f[name], H = 220;
      var col = document.createElement("div"); col.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px";
      var cell = document.createElement("div");
      cell.style.cssText = "height:" + H + "px;width:" + Math.round(H * spec.aspect) + "px;background-color:#24201a;background-repeat:no-repeat;"
        + "background-image:url(/mob/" + id + ".webp?v=" + MOB_V + ");background-size:" + (spec.n * 100) + "% 100%;"
        + "background-position:" + (spec.n > 1 ? k * 100 / (spec.n - 1) : 0) + "% 0";
      var lab = document.createElement("div"); lab.textContent = name + "  (cell " + (k + 1) + " of " + spec.n + ")";
      col.appendChild(cell); col.appendChild(lab); row.appendChild(col);
    });
    walkCard.appendChild(row);
  }
  function walkHold() {
    anims.forEach(function (a) {
      a.asleep = false;
      if (a.phase !== "travel" || a.t > TRAVEL_MS / 1000 - 0.2) { a.phase = "travel"; a.t = 0; }
    });
  }
  function walkToggle() {
    walkOn = !walkOn;
    walkB.textContent = "walk: " + (walkOn ? "on" : "off");
    clearInterval(walkTimer); walkTimer = null;
    if (walkOn) { revive(); walkHold(); walkTimer = setInterval(walkHold, 100); walkCardPaint(); }
    else if (walkCard) { walkCard.remove(); walkCard = null; }
  }
  walkB.onclick = walkToggle;
  var atkB = mk("button", btnCss, "attack");
  atkB.onclick = function () { liveAgain(); revive(); mobBeat(ids.slice(), null, null); mobCalls(null, ids.slice()); };
  var dieB = mk("button", btnCss, "death");
  dieB.onclick = function () { liveAgain(); revive(); mobBeat(null, null, ids.slice()); mobCalls(ids.slice()); };
  // THE SOUND: one button (or S) steps off, half, full, as the game's setting
  // does. At full, whatever room and sky are on screen play what a player
  // standing there hears - the preview server runs the world's own sound
  // rules against the room table (/amb) every time either changes.
  var sndB = mk("button", btnCss, "sound: off");
  function sndLabel() { sndB.textContent = "sound: " + ["off", "half", "full"][soundLevel]; }
  // ...and the same answer says whether this place has a ROOF, which the game's
  // status frame would have told the picture: a roofed room draws no rain.
  var ambSeen = {};
  var BAND_OF = { "The Mountain": "mountain", "The Crossing": "crossing", "The Road": "road", "The Wood": "wood", "The Dens": "den" };
  function soundHere() {
    var key = gnd.value + "|" + hour.value, first = !ambSeen[key];
    var band = BAND_OF[groundAt[gnd.value.slice(7)]] || "";
    fetch("/amb?sel=" + encodeURIComponent(gnd.value) + "&sky=" + encodeURIComponent(hour.value) + "&band=" + band)
      .then(function (r) { return r.json(); }).then(function (a) {
        ambSeen[key] = a;
        if (soundOn) scapeSet(a);
        if (first && a.covered) paint();
      }).catch(function () {});
  }
  sndB.onclick = function () {
    if (window.__RealAudio) window.AudioContext = window.__RealAudio; // the preview starts silent; this is the one way in
    // ...but the preview never walks through the door, so the door's music
    // would start on the next click. Shut it and keep it shut.
    document.removeEventListener("pointerdown", thrMusicStart, true);
    document.removeEventListener("keydown", thrMusicStart, true);
    thrMusicStop();
    setSound((soundLevel + 1) % 3); sndLabel(); soundHere();
  };
  // Creature sound is off in the game until it is signed off; here it is on.
  CREATURE_SOUND = true;
  // THE NEXT ROOM, BY HAND. With no server there is no next room, so N plays
  // what the wire would send about the creature picked: it going by, its call,
  // it feeding, a fight, it bolting - each from a different side.
  var boltN = 0;
  var HEARD = [["move", "east"], ["call", "west"], ["feed", "north"], ["fight", "southeast"], ["flee", "northwest"]], heardN = 0;
  var heardL = mk("span", "color:#9a8b66");
  function heardNext() {
    var x = HEARD[heardN++ % HEARD.length];
    heardSound({ act: x[0], dir: x[1], mob: who.value });
    heardL.textContent = "next room: " + who.value + " " + x[0] + " from the " + x[1];
  }
  // THE WORLD'S NEWS, BY HAND: W plays each far sound in turn - the bell, the
  // roar, the cry when something great falls.
  var FAR_NAMES = Object.keys(FAR), farN = 0;
  function farNext() { var n = FAR_NAMES[farN++ % FAR_NAMES.length]; farSound(n); heardL.textContent = "far off: " + n; }
  function fallNow() { var n = sndFor("A cry rolls through the stone: the Drowned God has fallen.", "feed"); if (n) playSounds([n]); farSound("fall"); heardL.textContent = inGatehouseNow ? "a great thing has fallen - not heard in the gatehouse" : "a great thing has fallen"; }
  function idleNow() { var id = mobIdle(); heardL.textContent = id ? "idle: " + id : "idle: nothing here makes one"; }
  // The preview starts silent whatever was remembered from last time: a page
  // that says "on" with no sound behind it turns OFF on the first S.
  soundLevel = 0; soundOn = false; renderSnd();
  sndLabel();
  // For the probe: silence the cave bed so a layer can be measured alone.
  window.__sndBedOff = function () { stopAmb(); };
  window.__scapeNow = function () { return scapeAmb; };
  // For the probe: speak one creature call, or the plain hit to measure it against.
  window.__voice = function (id, m) { mobVoice(id, m); };
  window.__calls = function () { return anims.filter(function (a) { return a.phase === "attack" || a.phase === "death"; }).map(function (a) { return a.id + ":" + a.phase + ":" + a.t.toFixed(2); }); };
  // For the probe: record every creature call - who, which call, how long it
  // waits, and where it pans - as it is made.
  window.__voxSpy = function () { var real = mobVoice; window.__voxLog = [];
    mobVoice = function (id, m, el, w) { window.__voxLog.push([id, m, +(w || 0).toFixed(2), +mobPan(id, el).toFixed(2)]); real(id, m, el, w); }; };
  window.__heard = function (f) { heardSound(f); };
  window.__idle = function () { return mobIdle(); };
  window.__cameIn = function (ids, rid, doing) { updateMobs(ids, doing, [], 0, []); mobsCameIn(ids, rid, doing); };
  window.__hit = function () { SND.hit(actx.currentTime + 0.01); };
  window.__bench = function (state) { renderBench(state); }; // the kit modal, opened with a made-up state
  window.__fxCast = function () { return fxMobs(sceneEl.getBoundingClientRect()).map(function (m) { return m.rect.map(function (v) { return +v.toFixed(3); }); }); };
  window.__sndLR = function () {
    if (!actx || !amaster) return null;
    if (!amaster.__lr) {
      var sp = actx.createChannelSplitter(2), l = actx.createAnalyser(), r = actx.createAnalyser();
      l.fftSize = r.fftSize = 2048; amaster.connect(sp); sp.connect(l, 0); sp.connect(r, 1); amaster.__lr = [l, r];
    }
    return amaster.__lr.map(function (an) {
      var d = new Float32Array(2048); an.getFloatTimeDomainData(d);
      var s = 0; for (var i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length);
    });
  };
  // A meter for the probe: how loud the whole mix is right now, 0..1.
  window.__sndLevel = function () {
    if (!actx || !amaster) return -1;
    if (!amaster.__an) { amaster.__an = actx.createAnalyser(); amaster.__an.fftSize = 2048; amaster.connect(amaster.__an); }
    var d = new Float32Array(2048); amaster.__an.getFloatTimeDomainData(d);
    var sum = 0; for (var i = 0; i < d.length; i++) sum += d[i] * d[i];
    return Math.sqrt(sum / d.length);
  };
  // THE NOMAD - another player - takes its state from the server, and there is
  // no server here, so this picks it. Choosing it puts a nomad in the room; the
  // torch button above also puts a lit torch in its hand. A gesture plays once
  // each time it is chosen.
  var nomadSel = mk("select", btnCss);
  ["nomad: idle", "rest", "crouch", "guard", "point", "fight", "wave", "nod", "beckon", "keen", "dance", "dead"].forEach(function (v) {
    var o = document.createElement("option"); o.value = v.indexOf("nomad:") === 0 ? "" : v; o.textContent = v; nomadSel.appendChild(o); });
  var nomadAt = 0, NOMAD_ONCE = { wave: 1, nod: 1, beckon: 1, keen: 1, dance: 1 };
  nomadSel.onchange = function () { nomadAt = Date.now(); if (ids.indexOf("nomad") < 0) ids.push("nomad"); paint(); };
  function nomadState() {
    var v = nomadSel.value, st = NOMAD_ONCE[v] ? "e-" + v + ":" + nomadAt : v;
    return st + (torch ? "+torch" : "");
  }
  var shown = mk("span", "color:#9a8b66");
  mk("span", "margin-left:auto;color:#6f5c42", "\u2190\u2192 room  \u2191\u2193 hour  [ ] creature  T torch  P event pose  A attack  X death  V call  N next room  I idle  W world  K king falls  R sky version  F frames  G walk  B floor bag  C chest  L lightning  S sound");
  var ids = [];
  // B steps through the floor bags: nothing, then the first count of each.
  // ?bag=1..4 opens on that bag.
  // C steps through the chests; ?chest=1..4 opens on one.
  var CHEST_STEPS = ["", "chest-shut", "chest-open", "box-shut", "box-open"];
  var chest = Math.max(0, Math.min(4, Number(new URLSearchParams(location.search).get("chest")) || 0));
  var LOOSE_STEPS = [0, 1, 3, 6, 10], loose = Math.max(0, Math.min(4, Number(new URLSearchParams(location.search).get("bag")) || 0));
  addB.onclick = function () { ids.push(who.value); paint(); setTimeout(function () { var all = mobsEl.querySelectorAll('.mob[data-id="' + who.value + '"]'); mobArrive([who.value], all[all.length - 1]); }, 60); };
  clrB.onclick = function () { ids = []; paint(); };
  who.onchange = function () { ids = [who.value]; paint(); arrive(); if (walkOn) walkCardPaint(); };
  // A creature that is put in the room speaks as it comes in - the call it
  // will make in the game when it walks into yours. After the paint, so the
  // voice comes from where it stands.
  function arrive() { revive(); setTimeout(function () { mobArrive(ids); }, 60); }

  // Remember the last pick so a reload - or flipping PROD/LOCAL - lands on the
  // same room with the same animals in it, which is what makes a comparison.
  var KEY = "gp-state";
  try { var st = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (st.f) feast.value = st.f; if (st.g) gnd.value = st.g; if (st.h) hour.value = st.h; if (st.t) torch = 1; if (st.ids) ids = st.ids; } catch (e) {}
  // ?mob=<id> opens with that creature standing alone.
  var askMob = new URLSearchParams(location.search).get("mob");
  if (askMob && MOB_ANIM[askMob]) { who.value = askMob; ids = [askMob]; }
  if (!ids.length) ids = [who.value];
  if (torch) { torchB.textContent = "torch: on"; torchB.style.color = "#d8a94e"; }

  var skyRollN = 0;
  function paint() {
    var v = gnd.value, h = hour.value;
    soundHere();
    // THE RED NIGHT IS A FLAG, NOT A SKY. The server sends it beside the sky on
    // every frame, and it is what lights the hollow's eyes - so choosing the
    // blood sky here has to raise it too, and every other hour has to lower it.
    var red = h === "blood" ? 1 : 0;
    // A RAINBOW is the server's to send; ?bow=1 on the address stands one up
    if (typeof lastBow !== "undefined") lastBow = /[?&]bow=1/.test(location.search) ? 1 : 0;
    lastEcl = h === "eclipse" ? 1 : 0;   // the server's flag: true under a roof too
    if (typeof FEAST_FORCE !== "undefined") FEAST_FORCE = feast.value;
    // UNDER A ROOF, the sky the game would send: none at all ("in") for a
    // sealed room, and only the hour - never the weather - for the road's
    // roofed rooms, which see out but are not rained on (zone.ts artSkyFor).
    var seen = ambSeen[v + "|" + h], covered = seen && seen.covered ? true : undefined;
    // ...and the night flag the server sends beside the sky, for every kind of
    // place: the night hours carry it, and ?night=1 raises it under any weather
    // (rain after dark). Rooms and gates were painted without it, so a sealed
    // room with a window read noon at every hour (2026-10-23).
    var nightFlag = /[?&]night=1/.test(location.search) || h === "night" || h === "moon" || h === "blood" || h === "wet-night" ? 1 : 0;
    var low = h === "dawn" || h === "wet-dawn" ? 1 : h === "dusk" || h === "wet-dusk" ? 2 : 0;
    if (tod.value) { nightFlag = tod.value === "night" ? 1 : 0; low = tod.value === "dawn" ? 1 : tod.value === "dusk" ? 2 : 0; }
    // ...and since 2026-10-26 a roof anywhere in open country is sent the sky
    // as it is outside, weather and all (zone.ts artSkyFor); only the sunless
    // places still get "in".
    var OPEN = { out: 1, road: 1, wood: 1, mountain: 1, den: 1, crossing: 1 };
    var roofSky = !covered ? h : OPEN[seen.band] ? h : "in";
    if (v.indexOf("room:") === 0) {
      var r = v.slice(5);
      paintScene("upper", roofSky, "", r, torch, skyRollN, r, 0, red, covered, nightFlag, low);
    } else if (v.indexOf("gate:") === 0) {
      paintScene("mountain", roofSky, v, "preview-gate", torch, skyRollN, "", 0, red, covered, nightFlag, low);
    } else {
      // THE GROUND'S OWN REGION, as the game sends it - this said "mountain" for
      // every ground, so the beach got the mountain's birds (2026-10-20)
      paintScene(BAND_OF[groundAt[v.slice(7)]] || "mountain", h, v.slice(7), "preview-ground", torch, skyRollN, "", 0, red, undefined, nightFlag, low);
    }
    fitPicture();
    var dead = nomadSel.value === "dead" && ids.indexOf("nomad") >= 0;
    // ...and never in the gatehouse: other players are drawn in the world only,
    // the same as the game, where the gatehouse frame carries no figures at all.
    var inside = gnd.value === "ground:gatehouse";
    // ...and the sound knows it, as it would from the server in the game - so a
    // king falling (K) is heard out in the world and not by the fire.
    inGatehouseNow = inside;
    if (inside) dead = false;
    var showIds = (dead || inside) ? ids.filter(function (x) { return x !== "nomad"; }) : ids.slice();
    updateMobs(showIds, showIds.map(function (x) { return x === "nomad" ? nomadState() : ""; }), dead ? ["nomad"] : [], LOOSE_STEPS[loose], CHEST_STEPS[chest] ? [CHEST_STEPS[chest]] : []);
    shown.textContent = ids.length ? "standing: " + ids.join(", ") : "nothing standing";
    try { localStorage.setItem(KEY, JSON.stringify({ g: gnd.value, h: hour.value, t: torch, ids: ids, f: feast.value })); } catch (e) {}
  }
  gnd.onchange = paint; hour.onchange = paint; tod.onchange = paint;

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
  wPrev.onclick = function () { step(who, -1); ids = [who.value]; paint(); arrive(); if (walkOn) walkCardPaint(); };
  wNext.onclick = function () { step(who, 1); ids = [who.value]; paint(); arrive(); if (walkOn) walkCardPaint(); };

  // CAPTURE PHASE, so the client's own command line - which has focus, and
  // uses the arrows for its history - never sees these keys. Nothing is typed
  // into it here; there is no server to send a command to.
  window.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key, hit = true;
    if (k !== "f" && k !== "F") liveAgain();
    if (k === "ArrowRight") { step(gnd, 1); paint(); }
    else if (k === "ArrowLeft") { step(gnd, -1); paint(); }
    else if (k === "ArrowDown") { step(hour, 1); paint(); }
    else if (k === "ArrowUp") { step(hour, -1); paint(); }
    else if (k === "]") { step(who, 1); ids = [who.value]; paint(); arrive(); if (walkOn) walkCardPaint(); }
    else if (k === "[") { step(who, -1); ids = [who.value]; paint(); arrive(); if (walkOn) walkCardPaint(); }
    else if (k === "g" || k === "G") { walkToggle(); }
    else if (k === "v" || k === "V") { arrive(); }
    else if (k === "n" || k === "N") { heardNext(); }
    else if (k === "i" || k === "I") { idleNow(); }
    else if (k === "w" || k === "W") { farNext(); }
    // R: the next version of this hour's sky. The game turns its sky over on
    // the server's roll; with no server here every hour sat on one version.
    else if (k === "r" || k === "R") { skyRollN++; paint(); heardL.textContent = "sky roll " + skyRollN + " - keep pressing R to see every version"; }
    else if (k === "k" || k === "K") { fallNow(); }
    else if (k === "t" || k === "T") { torchB.onclick(); }
    else if (k === "p" || k === "P") { actB.onclick(); }
    else if (k === "a" || k === "A") { atkB.onclick(); }
    else if (k === "x" || k === "X") { dieB.onclick(); }
    else if (k === "f" || k === "F") { stepFrame(); }
    else if (k === "b" || k === "B") { loose = (loose + 1) % LOOSE_STEPS.length; paint(); }
    else if (k === "c" || k === "C") { chest = (chest + 1) % CHEST_STEPS.length; paint(); }
    // Under a roof (or by the gatehouse fire) the bolt is thunder through the walls only.
    // L steps through how far the bolt is: your own room, your ground, the next
    // ground over, and a storm too far off to see (the storm has a place).
    else if (k === "l" || k === "L") {
      var seenL = ambSeen[gnd.value + "|" + hour.value], roofL = gnd.value === "ground:gatehouse" || !!(seenL && seenL.covered), nL = boltN++ % 4;
      if (nL === 3) thunderFar(); else lightningBolt(false, roofL, roofL && nL === 0 ? 1 : nL);
      heardL.textContent = "lightning: " + ["in this room", "on this ground", "the next ground over", "far off - only thunder"][nL] + (roofL && nL < 3 ? ", under a roof" : "");
    }
    else if (k === "s" || k === "S") { sndB.onclick(); }
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
