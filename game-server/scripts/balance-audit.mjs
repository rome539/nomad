// NOMAD combat balance audit — expected-value math using the exact code formulas.
// Player swing: dmg = round((randInt(2,5)+wdmg)*atk); crit 5% x2; minus mob armor, min 1.
// Fumble 5% per swing (whole arc). Speed = swings/round, sweep = targets/swing.
// Weapon bleed: 3 ticks of `bleed`, refreshed per hit -> ~bleed/round sustained.
// Mob swing: dmg = randInt(min,max); crit 5% x2; x ARMOR_K/(armor+K); x stanceDef; min 1.
// Miss 5% (+5% weight-0); block = shield.block; mob bleed ~bleed/round sustained (armor-ignoring).
// Stats re-verified against local D1 2026-07-12 (drift fixed: three-hound a3->a2,
// warden-captain a4->a3, pale-crawler 6-10/b3 -> 4-8/b2, rat bleeds 1). Blunt
// armor-ignore (stun>0 -> ignores 2, zone.armorIgnore) now modeled; it was not.
// NOT modeled: stun's lost rounds, THORNS/PARRY_RIPOSTE counters, wards
// (PADDED/WARDHIDE), wear, REACH's ambush-strip, dogpile — margins here are
// the clean-room floor, live fights are swingier.

const CRIT = 0.05, FUMBLE = 0.05, K = 10;
const DODGE_LIGHT = 0.05, AMBUSH_MULT = 1.5, VITALS_PVP = 0.005, VITALS_ARMOR_FULL = 11;
const PLAYER_HP = 60;

const ignoreOf = (w) => Math.max(w.pierce ?? 0, (w.stun ?? 0) > 0 ? 2 : 0);

// --- player expected dmg per landed swing vs mob armor (flat subtraction) ---
function playerSwingE(wdmg, mobArmor, atk = 1.0) {
  let e = 0;
  for (let b = 2; b <= 5; b++) {
    const base = Math.round((b + wdmg) * atk);
    const normal = Math.max(1, base - mobArmor);
    const crit = Math.max(1, base * 2 - mobArmor);
    e += (0.25) * ((1 - CRIT) * normal + CRIT * crit);
  }
  return e;
}
// Extra swings past the first deal weapon dmg ONLY — no 2-5 body roll ("only
// the first cut has your shoulder behind it", audit fix #1, 2026-07-08).
function extraSwingE(wdmg, mobArmor, atk = 1.0) {
  const base = Math.round(wdmg * atk);
  const normal = Math.max(1, base - mobArmor);
  const crit = Math.max(1, base * 2 - mobArmor);
  return (1 - CRIT) * normal + CRIT * crit;
}
// damage per round: first swing full, follow-ups edge-only, each lands (1-FUMBLE),
// single target (+bleed sustained). Armor-ignore = max(PIERCE, blunt 2).
function playerDPR(w, mobArmor) {
  const a = Math.max(0, mobArmor - ignoreOf(w));
  const first = playerSwingE(w.dmg, a);
  const extra = extraSwingE(w.dmg, a);
  return (1 - FUMBLE) * (first + (w.speed - 1) * extra) + (w.bleed ?? 0);
}

// --- mob expected dmg per round vs player loadout (curved mitigation) ---
function mobDPR(mob, p) {
  let e = 0;
  for (let d = mob.min; d <= mob.max; d++) {
    const n = 1 / (mob.max - mob.min + 1);
    const mit = (x) => Math.max(1, Math.round(Math.max(1, Math.round(x * K / (p.armor + K))) * p.def));
    e += n * ((1 - CRIT) * mit(d) + CRIT * mit(d * 2));
  }
  const miss = FUMBLE + (p.weight0 ? 0.05 : 0);
  const land = (1 - miss) * (1 - (p.block ?? 0));
  // bleed sustains while hits keep landing; guarded half-turns fresh wounds
  return land * e + (mob.bleed ?? 0) * land * (p.woundMult ?? 1);
}

const weapons = [
  { id: "bare hands",          dmg: 0, speed: 1, bleed: 0 },
  { id: "quarterstaff (c)",    dmg: 1, speed: 1, bleed: 0 },              // reach
  { id: "sharpened-rib (c) x2",dmg: 1, speed: 2, bleed: 1 },
  { id: "rusted-sword (c)",    dmg: 2, speed: 1, bleed: 0 },
  { id: "horsemans-pick (u)",  dmg: 2, speed: 1, bleed: 0, pierce: 2 },
  { id: "chipped-falchion (u)",dmg: 3, speed: 1, bleed: 0 },
  { id: "studded-maul (u)",    dmg: 3, speed: 1, bleed: 0, stun: 0.2 },
  { id: "pitted-spear (u)",    dmg: 3, speed: 1, bleed: 0 },              // reach
  { id: "bone-shiv (u) x2",    dmg: 2, speed: 2, bleed: 1 },
  { id: "graveblade (u)",      dmg: 4, speed: 1, bleed: 0 },
  { id: "gaff-hook (u)",       dmg: 2, speed: 1, bleed: 1 },              // reach
  { id: "sword-breaker (r) x2",dmg: 2, speed: 2, bleed: 0 },              // parry .10
  { id: "crawlers-hooks (r) x2", dmg: 2, speed: 2, bleed: 3 },
  { id: "crow-beak-pick (r)",  dmg: 3, speed: 1, bleed: 0, pierce: 3 },
  { id: "headtaker-axe (r)",   dmg: 3, speed: 1, bleed: 0 },
  { id: "notched-greatsword (r)", dmg: 5, speed: 1, bleed: 0 },
  { id: "fleshing-knife (r) x2",  dmg: 3, speed: 2, bleed: 2 },
  { id: "warden-maul (r)",     dmg: 4, speed: 1, bleed: 0, stun: 0.25 },
  { id: "war-pike (r)",        dmg: 5, speed: 1, bleed: 0 },              // reach, 2H
  { id: "reaver-glaive (e)",   dmg: 4, speed: 1, bleed: 0 },
  { id: "marrow-scepter (e)",  dmg: 4, speed: 1, bleed: 0, stun: 0.4 },
  { id: "headsman-sword (e)",  dmg: 6, speed: 1, bleed: 0 },
  { id: "flanged-mace (e)",    dmg: 5, speed: 1, bleed: 0, stun: 0.35 },
  { id: "kings-guard-blade (e)", dmg: 5, speed: 1, bleed: 0 },            // parry .15
  { id: "abyssal-harpoon (e)", dmg: 6, speed: 1, bleed: 0 },              // reach, 2H
  { id: "widow-maker (e) x3",  dmg: 4, speed: 3, bleed: 2 },
];

// Fleet-rat and cutpurse are omitted: they flee/steal, they don't duel.
const mobs = [
  { id: "rat",            lvl: 1, hp: 11,  min: 2, max: 3,  armor: 0, bleed: 1 },
  { id: "skeleton",       lvl: 2, hp: 20,  min: 2, max: 4,  armor: 0, bleed: 0 },
  { id: "cutthroat",      lvl: 2, hp: 22,  min: 3, max: 5,  armor: 0, bleed: 0 },
  { id: "brood-rat",      lvl: 2, hp: 24,  min: 2, max: 4,  armor: 0, bleed: 0 },
  { id: "thrice-dead",    lvl: 2, hp: 26,  min: 3, max: 5,  armor: 1, bleed: 0 },
  { id: "twice-dead",     lvl: 3, hp: 32,  min: 5, max: 8,  armor: 1, bleed: 0 },
  { id: "warden",         lvl: 3, hp: 35,  min: 3, max: 6,  armor: 2, bleed: 0 },
  { id: "grave-hyena",    lvl: 3, hp: 30,  min: 3, max: 5,  armor: 1, bleed: 2 },
  { id: "pale-crawler",   lvl: 3, hp: 30,  min: 4, max: 8,  armor: 0, bleed: 2 },
  { id: "the-drowned",    lvl: 3, hp: 40,  min: 4, max: 7,  armor: 1, bleed: 0 },
  { id: "albino-rat",     lvl: 3, hp: 42,  min: 5, max: 8,  armor: 1, bleed: 2 },
  { id: "bone-knight",    lvl: 3, hp: 32,  min: 3, max: 5,  armor: 2, bleed: 0 },
  { id: "verdigris",      lvl: 3, hp: 30,  min: 2, max: 4,  armor: 1, bleed: 0 }, // real threat = CORRODE_WEAR 1.5/blow on worn kit
  { id: "marrow-cantor",  lvl: 4, hp: 38,  min: 4, max: 7,  armor: 2, bleed: 0 }, // LISTENER+HOLLOW: 8x weapon wear when you hit IT
  { id: "pale-stalker",   lvl: 4, hp: 32,  min: 5, max: 8,  armor: 0, bleed: 3 },
  { id: "dire-hyena",     lvl: 4, hp: 45,  min: 5, max: 8,  armor: 1, bleed: 2 },
  { id: "two-hound",      lvl: 4, hp: 44,  min: 5, max: 9,  armor: 1, bleed: 2 },
  { id: "drowned-hulk",   lvl: 4, hp: 46,  min: 4, max: 7,  armor: 1, bleed: 0 },
  { id: "three-hound",    lvl: 4, hp: 68,  min: 7, max: 12, armor: 2, bleed: 3 },
  { id: "the-gaunt",      lvl: 5, hp: 72,  min: 6, max: 10, armor: 2, bleed: 2 }, // event horror; fix-then-spring; always drops its pelt
  { id: "warden-captain", lvl: 5, hp: 52,  min: 4, max: 7,  armor: 3, bleed: 0 },
  { id: "forgotten-king", lvl: 5, hp: 120, min: 5, max: 9,  armor: 2, bleed: 0 },
  { id: "marrow-king",    lvl: 6, hp: 105, min: 5, max: 9,  armor: 2, bleed: 0 },
  { id: "drowned-god",    lvl: 6, hp: 110, min: 6, max: 10, armor: 1, bleed: 0 },
];

const loadouts = [
  { id: "naked",                 armor: 0,  def: 1.0, weight0: true,  block: 0 },
  { id: "common kit (4a, w0)",   armor: 4,  def: 1.0, weight0: true,  block: 0 },
  { id: "uncommon kit (7a)+shld",armor: 7,  def: 1.0, weight0: false, block: 0.25 },
  { id: "rare kit (9a)+shld",    armor: 9,  def: 1.0, weight0: false, block: 0.35 },
  // 044: chitin+coral-crown carry weight now — 11a is the tank build (no dodge).
  { id: "epic TANK (11a)+shld",  armor: 11, def: 1.0, weight0: false, block: 0.45 },
  // guarded: +0.10 block behind a shield (GUARDED_BLOCK_BONUS) + wounds half-turned
  { id: "epic GUARDED",          armor: 11, def: 0.6, weight0: false, block: 0.55, woundMult: 0.5 },
];

// ---- Table 1: player DPR by weapon vs mob armor tiers ----
console.log("=== PLAYER dmg/round (4s) by weapon vs mob armor ===");
console.log("weapon".padEnd(26), ["a0","a1","a2","a3","a4"].map(s=>s.padStart(6)).join(""));
for (const w of weapons) {
  const row = [0,1,2,3,4].map(a => playerDPR(w, a).toFixed(1).padStart(6)).join("");
  console.log(w.id.padEnd(26) + row);
}

// ---- Table 2: rounds-to-kill each mob per weapon ----
console.log("\n=== ROUNDS to kill mob (4s each) ===");
const wsel = weapons.filter(w => ["bare hands","rusted-sword (c)","chipped-falchion (u)","graveblade (u)","notched-greatsword (r)","fleshing-knife (r) x2","headsman-sword (e)","widow-maker (e) x3"].includes(w.id));
console.log("mob".padEnd(16) + wsel.map(w => w.id.split(" ")[0].slice(0,9).padStart(10)).join(""));
for (const m of mobs) {
  const row = wsel.map(w => Math.ceil(m.hp / playerDPR(w, m.armor)).toString().padStart(10)).join("");
  console.log((m.id + " " + m.hp).padEnd(16) + row);
}

// ---- Table 3: mob DPR vs loadouts + rounds to kill 60hp player ----
console.log("\n=== MOB dmg/round vs loadout (rounds to drop 60hp) ===");
console.log("mob".padEnd(16) + loadouts.map(l => l.id.split(" ")[0].slice(0,9).padStart(11)).join(""));
for (const m of mobs) {
  const row = loadouts.map(l => {
    const d = mobDPR(m, l);
    return `${d.toFixed(1)}(${Math.ceil(60 / d)})`.padStart(11);
  }).join("");
  console.log(m.id.padEnd(16) + row);
}

// ---- Table 4: the duel ledger — can a mid-kit player beat each mob 1v1? ----
console.log("\n=== 1v1 MARGIN: uncommon player (falchion, 7a+shld) vs each mob ===");
const pw = weapons.find(w => w.id.includes("falchion"));
const pl = loadouts[2];
for (const m of mobs) {
  const rtk = Math.ceil(m.hp / playerDPR(pw, m.armor));
  const rtd = Math.ceil(60 / mobDPR(m, pl));
  const verdict = rtd > rtk * 1.5 ? "easy" : rtd > rtk ? "win, bloody" : rtd === rtk ? "coin flip" : "LOSES";
  console.log(m.id.padEnd(16) + `kill in ${String(rtk).padStart(3)}r  die in ${String(rtd).padStart(3)}r  -> ${verdict}`);
}

// ============================ PVP ============================
// pvp.swingAt, retold in expected value: fumble 5%; the light-footed dodge
// (worn weight 0 AND not burdened, +5% slip); block whole (shield + parry
// blade, +.10 guarded); then body(2-5, first swing only)+weapon, x stance,
// crit 5% x2 (ambush replaces crit, never both), curved armor mitigation
// with armor-ignore, x defender stance, min 1. Vitals lottery per landed
// blow: VITALS_PVP x (2 - armor/11) — the fresh-key equalizer, reported as
// %/round. Bleed sustains like PvE. NOT modeled: stun's lost rounds,
// THORNS/riposte counters, the man-catcher's hobble, wear, stagger.

function pvpLandedE(w, defArmor, body, atk = 1.0, def = 1.0) {
  const effA = Math.max(0, defArmor - ignoreOf(w));
  const mit = (x) => Math.max(1, Math.round(Math.max(1, Math.round(x * K / (effA + K))) * def));
  if (!body) {
    const base = Math.round(w.dmg * atk);
    return (1 - CRIT) * mit(base) + CRIT * mit(base * 2);
  }
  let e = 0;
  for (let b = 2; b <= 5; b++) {
    const base = Math.round((b + w.dmg) * atk);
    e += 0.25 * ((1 - CRIT) * mit(base) + CRIT * mit(base * 2));
  }
  return e;
}

function pvpDPR(att, def) {
  const quick = def.weight0 && !def.burdened;
  const land = (1 - FUMBLE) * (1 - (quick ? DODGE_LIGHT : 0)) * (1 - (def.block ?? 0));
  const first = pvpLandedE(att.w, def.armor, true);
  const extra = pvpLandedE(att.w, def.armor, false);
  const dpr = land * (first + (att.w.speed - 1) * extra) + (att.w.bleed ?? 0) * land;
  const perBlow = VITALS_PVP * (2 - Math.min(1, def.armor / VITALS_ARMOR_FULL));
  const vitalsRound = 1 - Math.pow(1 - perBlow, land * att.w.speed);
  return { dpr, vitalsRound };
}

// The opener: an unaware target eats a full first swing x AMBUSH_MULT (the
// surprise IS the crit). REACH weapons strip it from the ATTACKER'S victim —
// but marked (r)each here only; the model gives every build its opener.
function ambushE(att, def) {
  const effA = Math.max(0, def.armor - ignoreOf(att.w));
  const mit = (x) => Math.max(1, Math.round(x * K / (effA + K)));
  let e = 0;
  for (let b = 2; b <= 5; b++) e += 0.25 * mit(Math.round(Math.round((b + att.w.dmg)) * AMBUSH_MULT));
  return e;
}

const wOf = (id) => weapons.find((w) => w.id.startsWith(id));
const builds = [
  { id: "fresh key (bare, naked)",      w: wOf("bare hands"),         armor: 0,  weight0: true,  block: 0 },
  { id: "naked knife (shiv x2)",        w: wOf("bone-shiv"),          armor: 0,  weight0: true,  block: 0 },
  { id: "murder kit (widow-maker x3)",  w: wOf("widow-maker"),        armor: 0,  weight0: true,  block: 0 },
  { id: "burdened mule (naked, 4+ iron)", w: wOf("bare hands"),       armor: 0,  weight0: true,  block: 0, burdened: true },
  { id: "duelist (falchion, 7a+shld)",  w: wOf("chipped-falchion"),   armor: 7,  weight0: false, block: 0.25 },
  { id: "pick-man (h-pick, 7a+shld)",   w: wOf("horsemans-pick"),     armor: 7,  weight0: false, block: 0.25 },
  { id: "bruiser (greatsword, 9a+shld)",w: wOf("notched-greatsword"), armor: 9,  weight0: false, block: 0.35 },
  { id: "tank (flanged mace, 11a+shld)",w: wOf("flanged-mace"),       armor: 11, weight0: false, block: 0.45 },
];

// ---- Table 5: PvP dmg/round matrix (rounds to kill 60hp) ----
console.log("\n=== PVP dmg/round: attacker (rows) vs defender (cols), rounds to kill 60hp in () ===");
const short = (id) => id.split(" ")[0].slice(0, 9);
console.log("attacker \\ defender".padEnd(24) + builds.map((b) => short(b.id).padStart(10)).join(""));
for (const a of builds) {
  const row = builds.map((d) => {
    const { dpr } = pvpDPR(a, d);
    return `${dpr.toFixed(1)}(${Math.ceil(PLAYER_HP / dpr)})`.padStart(10);
  }).join("");
  console.log(a.id.padEnd(24) + row);
}
console.log("vitals %/round vs".padEnd(24) + builds.map((d) => {
  const { vitalsRound } = pvpDPR(builds[2], d); // the fast blade rolls the most lottery tickets
  return `${(vitalsRound * 100).toFixed(1)}%`.padStart(10);
}).join("") + "   (murder-kit attacker; scale ~w/ swings landed)");

// ---- Table 6: the murder ledger — chosen matchups, ambusher swings first ----
console.log("\n=== PVP DUELS (attacker ambushes: opener + swings first; then both trade) ===");
const duel = (aId, dId) => {
  const a = builds.find((b) => b.id.startsWith(aId));
  const d = builds.find((b) => b.id.startsWith(dId));
  const open = ambushE(a, d);
  const fwd = pvpDPR(a, d).dpr, back = pvpDPR(d, a).dpr;
  // attacker's clock starts one opener ahead; defender answers from the next round
  const rKill = Math.ceil((PLAYER_HP - open) / fwd) + 1;
  const rDie = Math.ceil(PLAYER_HP / back) + 1; // defender loses round 1 to surprise
  const verdict = rDie > rKill * 1.5 ? "murder" : rDie > rKill ? "wins, bloody" : rDie === rKill ? "coin flip" : "AMBUSH FAILS";
  console.log(`${short(a.id)} -> ${short(d.id)}`.padEnd(26) + `opener ~${open.toFixed(0)}  kills in ${String(rKill).padStart(2)}r  dies in ${String(rDie).padStart(2)}r  -> ${verdict}`);
};
duel("murder kit", "fresh key");
duel("murder kit", "burdened mule");
duel("murder kit", "duelist");
duel("murder kit", "tank");
duel("naked knife", "fresh key");
duel("naked knife", "burdened mule");
duel("fresh key", "murder kit");
duel("fresh key", "burdened mule");
duel("duelist", "murder kit");
duel("duelist", "bruiser");
duel("pick-man", "tank");
duel("bruiser", "duelist");
duel("bruiser", "tank");
duel("tank", "duelist");
duel("tank", "murder kit");
