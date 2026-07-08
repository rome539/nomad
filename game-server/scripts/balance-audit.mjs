// NOMAD combat balance audit — expected-value math using the exact code formulas.
// Player swing: dmg = round((randInt(2,5)+wdmg)*atk); crit 5% x2; minus mob armor, min 1.
// Fumble 5% per swing (whole arc). Speed = swings/round, sweep = targets/swing.
// Weapon bleed: 3 ticks of `bleed`, refreshed per hit -> ~bleed/round sustained.
// Mob swing: dmg = randInt(min,max); crit 5% x2; x ARMOR_K/(armor+K); x stanceDef; min 1.
// Miss 5% (+5% weight-0); block = shield.block; mob bleed ~bleed/round sustained (armor-ignoring).

const CRIT = 0.05, FUMBLE = 0.05, K = 10;

// --- player expected dmg per landed swing vs mob armor ---
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
// single target (+bleed sustained). PIERCE (045) ignores that much mob armor.
function playerDPR(w, mobArmor) {
  const a = Math.max(0, mobArmor - (w.pierce ?? 0));
  const first = playerSwingE(w.dmg, a);
  const extra = extraSwingE(w.dmg, a);
  return (1 - FUMBLE) * (first + (w.speed - 1) * extra) + (w.bleed ?? 0);
}

// --- mob expected dmg per round vs player loadout ---
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
  { id: "rusted-sword (c)",    dmg: 2, speed: 1, bleed: 0 },
  { id: "horsemans-pick (u)",  dmg: 2, speed: 1, bleed: 0, pierce: 2 },
  { id: "chipped-falchion (u)",dmg: 3, speed: 1, bleed: 0 },
  { id: "pitted-spear (u)",    dmg: 3, speed: 1, bleed: 0 },              // reach
  { id: "bone-shiv (u) x2",    dmg: 2, speed: 2, bleed: 1 },
  { id: "graveblade (u)",      dmg: 4, speed: 1, bleed: 0 },
  { id: "gaff-hook (u)",       dmg: 2, speed: 1, bleed: 1 },              // reach
  { id: "sword-breaker (r) x2",dmg: 2, speed: 2, bleed: 0 },              // parry .10
  { id: "crawlers-hooks (r) x2", dmg: 2, speed: 2, bleed: 3 },
  { id: "crow-beak-pick (r)",  dmg: 3, speed: 1, bleed: 0, pierce: 3 },
  { id: "notched-greatsword (r)", dmg: 5, speed: 1, bleed: 0 },
  { id: "fleshing-knife (r) x2",  dmg: 3, speed: 2, bleed: 2 },
  { id: "warden-maul (r)",     dmg: 4, speed: 1, bleed: 0 },
  { id: "war-pike (r)",        dmg: 5, speed: 1, bleed: 0 },              // reach, 2H
  { id: "headsman-sword (e)",  dmg: 6, speed: 1, bleed: 0 },
  { id: "flanged-mace (e)",    dmg: 5, speed: 1, bleed: 0 },
  { id: "kings-guard-blade (e)", dmg: 5, speed: 1, bleed: 0 },            // parry .15
  { id: "abyssal-harpoon (e)", dmg: 6, speed: 1, bleed: 0 },              // reach, 2H
  { id: "widow-maker (e) x3",  dmg: 4, speed: 3, bleed: 2 },
];

const mobs = [
  { id: "rat",            lvl: 1, hp: 11,  min: 2, max: 3,  armor: 0, bleed: 0 },
  { id: "skeleton",       lvl: 2, hp: 20,  min: 2, max: 4,  armor: 0, bleed: 0 },
  { id: "brood-rat",      lvl: 2, hp: 24,  min: 2, max: 4,  armor: 0, bleed: 0 },
  { id: "twice-dead",     lvl: 3, hp: 32,  min: 5, max: 8,  armor: 1, bleed: 0 },
  { id: "warden",         lvl: 3, hp: 35,  min: 3, max: 6,  armor: 2, bleed: 0 },
  { id: "grave-hyena",    lvl: 3, hp: 30,  min: 3, max: 5,  armor: 1, bleed: 2 },
  { id: "pale-crawler",   lvl: 3, hp: 30,  min: 6, max: 10, armor: 0, bleed: 3 },
  { id: "the-drowned",    lvl: 3, hp: 40,  min: 4, max: 7,  armor: 1, bleed: 0 },
  { id: "albino-rat",     lvl: 3, hp: 42,  min: 5, max: 8,  armor: 1, bleed: 2 },
  { id: "bone-knight",    lvl: 3, hp: 32,  min: 3, max: 5,  armor: 2, bleed: 0 },
  { id: "verdigris",      lvl: 3, hp: 30,  min: 2, max: 4,  armor: 1, bleed: 0 }, // real threat = CORRODE_WEAR 1.5/blow on worn kit
  { id: "marrow-cantor",  lvl: 4, hp: 38,  min: 4, max: 7,  armor: 2, bleed: 0 }, // LISTENER+HOLLOW: 8x weapon wear when you hit IT
  { id: "pale-stalker",   lvl: 4, hp: 32,  min: 5, max: 8,  armor: 0, bleed: 3 },
  { id: "dire-hyena",     lvl: 4, hp: 45,  min: 5, max: 8,  armor: 1, bleed: 2 },
  { id: "drowned-hulk",   lvl: 4, hp: 46,  min: 4, max: 7,  armor: 1, bleed: 0 },
  { id: "three-hound",    lvl: 4, hp: 68,  min: 7, max: 12, armor: 3, bleed: 3 },
  { id: "warden-captain", lvl: 5, hp: 52,  min: 4, max: 7,  armor: 4, bleed: 0 },
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
