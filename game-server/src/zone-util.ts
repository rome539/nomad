// Pure, stateless helpers lifted out of the ZoneDO monolith: text shaping, a
// deterministic PRNG for the crude map's consistent lie, and tender rounding.
// Nothing here touches game state — safe to import anywhere.
import { chance, randInt } from "./rng";
import { HEART_FRESH_SEC, FOOD_FRESH_SEC, FOOD_SPOIL_SEC, COOKED_FOODS, COOKED_SPOIL_MULT, DAY_CYCLE_MS, MOON_FULL_EVERY, NIGHT_HUNT_MULT, OUTDOOR_ROOMS, NAPPERS, NOCTURNAL, ECLIPSE_EVERY, ECLIPSE_TELEGRAPH_MS, ECLIPSE_TOTAL_MS, ECLIPSE_AFTER_MS, BLOOD_MOON_EVERY, LID_SLOT_MS, LID_OPEN_SHARE, LID_MAX_SHUT } from "./zone-data";

// The day/night world-clock (zone-data.ts DAY_CYCLE_MS): first half of the
// cycle is day, second half is night. Pure modulo — no persisted state.
export function isNight(now = Date.now()): boolean {
  return (now % DAY_CYCLE_MS) >= DAY_CYCLE_MS / 2;
}
// The moon rides a slower modulo on top: which day/night cycle we're in,
// mod MOON_FULL_EVERY. Only meaningful during a night (isDark() is the only
// caller, and it's already gated on isNight() there) — a "full moon" at noon
// is not a thing this asks about.
export function isFullMoon(now = Date.now()): boolean {
  return moonPhase(now) === 0;
}
// WHICH NIGHT OF THE MOON'S MONTH THIS IS: 0 is full, and it counts up from
// there — waning, dark, waxing — back round to full again. isFullMoon has
// always been this same modulo asked as a yes/no question; the sky has six
// answers and only ever gave two (rome, 2026-08-10).
//
// Only phase 0 changes anything mechanically (isDark skips the outdoor-night
// check on a full moon, so the grounds genuinely stay lit). The rest is a thing
// to read: a wanderer who looks up on a waxing night knows how many nights
// until the grounds are walkable after dark, and until the wood starts howling.
export function moonPhase(now = Date.now()): number {
  return Math.floor(now / DAY_CYCLE_MS) % MOON_FULL_EVERY;
}
// IS THE LID OPEN RIGHT NOW (rome, 2026-08-31: it is only fair that sometimes
// the sky is just cloudy, with no arc running at all). The low country is under
// permanent overcast — that is its conceit — so being able to read the moon on
// any night the weather happened to be quiet was the sky owing the player an
// answer it does not owe anybody.
//
// DETERMINISTIC, AND THIS IS THE WHOLE OF THE DESIGN. A coin flipped per look
// is not weather, it is a slot machine: a player types `look moon` four times
// and the lid opens. So the sky is a function of the clock, exactly like the
// moon's own month and the eclipse — one state per window, the same answer to
// everybody standing under it, and no amount of asking changes it. Wait, or
// come back, or learn the sky. That is what a sky is.
//
// Pure modulo, nothing persisted, nothing rolled: same shape as moonPhase above.
export function lidOpen(now = Date.now()): boolean {
  const slot = Math.floor(now / LID_SLOT_MS);
  if (lidRaw(slot)) return true;
  // AND IT CANNOT STAY SHUT FOREVER. Measured on the raw hash, the longest run
  // of closed windows was twenty-one of them — nearly sixteen hours, which at a
  // four-hour day is four consecutive nights, out of a moon-month that is only
  // six nights long. A player could lose most of a month to one bad streak and
  // never know why. So a run that has gone on this long breaks: after
  // LID_MAX_SHUT closed windows the next one is open, whatever the hash says.
  // Still a function of the clock, still the same answer for everybody, still
  // nothing to farm — it is a ceiling on the weather, not a die.
  for (let i = 1; i <= LID_MAX_SHUT; i++) if (lidRaw(slot - i)) return false;
  return true;
}
// The raw window, before the streak ceiling. A cheap avalanche so consecutive
// windows do not run in a visible pattern — the sky must not be a stripe you can
// read off the hour.
function lidRaw(slot: number): boolean {
  let h = Math.imul(slot ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000 < LID_OPEN_SHARE;
}
// THE ECLIPSE (2026-08-25). Astronomical: the eclipse-day is every
// ECLIPSE_EVERY-th day-cycle, and the shadow crosses at midday. Pure modulo —
// nothing persisted, nothing rolled, and the sky is readable: a wanderer who
// knows the calendar could plan around it, and almost nobody does. Totality is
// the day failing; the mountain goes dark under the eaten sun like everything
// else (isDark reads this).
export type SkyPhase = "idle" | "telegraph" | "active" | "aftermath";
export function eclipsePhase(now = Date.now()): SkyPhase {
  const cycle = Math.floor(now / DAY_CYCLE_MS);
  if (cycle % ECLIPSE_EVERY !== 0) return "idle";
  const t = now - cycle * DAY_CYCLE_MS;      // 0..DAY_CYCLE_MS; the day half comes first
  if (t >= DAY_CYCLE_MS / 2) return "idle";  // the eclipse belongs to the day
  const center = DAY_CYCLE_MS / 4;           // midday
  const half = ECLIPSE_TOTAL_MS / 2;
  if (t < center - half - ECLIPSE_TELEGRAPH_MS) return "idle";
  if (t < center - half) return "telegraph";
  if (t < center + half) return "active";
  if (t < center + half + ECLIPSE_AFTER_MS) return "aftermath";
  return "idle";
}
// THE BLOOD MOON: one full moon in BLOOD_MOON_EVERY rises red. The whole
// night half of that day-cycle is the blood night — the grounds stay lit the
// way a full moon lights them, and the dead remember harder in the red light.
// IT IS A NIGHT, AND THE GATE BELONGS HERE rather than at each call site. The
// moon's month turns on the day-cycle, so without this the red moon is "up" for
// the DAYLIGHT half too — and the sky lines are all night-gated, so the two
// halves of the feature disagreed: for two hours of every blood cycle the
// hollow hit harder, woke hostile, murmured more and read with red eyes under a
// midday sun that said nothing about it. Gated here, every reader gets the same
// answer (ai's teeth and eyes, zone's damage and room line, events' prose).
export function isBloodMoon(now = Date.now()): boolean {
  return isNight(now)
    && moonPhase(now) === 0
    && (Math.floor(now / (DAY_CYCLE_MS * MOON_FULL_EVERY)) % BLOOD_MOON_EVERY === 0);
}
// Predators hunt harder after dark, outdoors only — day/night has no opinion
// on indoor rooms, so neither does this. 1 = no change, the common case.
// AN ANIMAL HUNTS HARDEST IN ITS OWN HOURS (rome, 2026-08-12, asking whether
// the hour should change how they behave and not just when they sleep).
//
// The night surge was the sky's, not the animal's: 1.6x on every outdoor
// creature after dark, whatever it was. That was fine while the only things
// keeping hours were the wood's game and their hunters, and it stopped being
// fine the moment a shore full of birds got a clock — a gull roosting on one leg
// does not become a more dangerous animal at three in the morning, and under the
// old rule the few night hours it spent awake were its most aggressive.
//
// So the surge belongs to the NIGHT SHIFT: an animal with a clock gets it only
// if the clock says night is when it works. An animal with no clock at all — the
// wolves, the dogs, the working dead, the people — is untouched and behaves
// exactly as it did, which keeps the wood's "night is the hours the predators
// own" intact, because none of its predators were ever nappers.
export function nightHuntMult(templateId: string, roomId: string, now = Date.now()): number {
  if (!OUTDOOR_ROOMS.has(roomId) || !isNight(now)) return 1;
  if (NAPPERS.has(templateId)) return NOCTURNAL.has(templateId) ? NIGHT_HUNT_MULT : 1;
  return NIGHT_HUNT_MULT;
}

// The deep-heart is the one thing you carry that DIES in your hands. It opens
// the black door for HEART_FRESH_SEC after the cut, then it's slime — and until
// now it said nothing about which it was, so a spent heart and a live key looked
// identical (rome, 2026-07-13: "make it rot"). It speaks its own decay instead:
// a short word for the pack and the vault shelf, a full line for `look`.
// `at` is the row's acquired_at (unix seconds); undefined = we can't tell.
export type HeartState = "cold" | "cooling" | "spoiled";
export function heartState(at: number | undefined, now = Math.floor(Date.now() / 1000)): HeartState {
  if (at === undefined) return "cold";
  const age = now - at;
  if (age >= HEART_FRESH_SEC) return "spoiled";
  if (age >= HEART_FRESH_SEC / 2) return "cooling";
  return "cold";
}
// The shelf-word: what it reads as in the pack list and the vault.
export function heartWord(at: number | undefined, now?: number): string {
  const s = heartState(at, now);
  return s === "spoiled" ? "spoiled" : s === "cooling" ? "going warm" : "still cold";
}
// The long look: what the thing is actually doing in your hand.
export function heartProse(at: number | undefined, now?: number): string {
  const s = heartState(at, now);
  return s === "spoiled"
    ? "It has gone to slime — slack and warm and stinking, and it will open nothing now."
    : s === "cooling"
      ? "The cold is going out of it. It is softening at the edges; whatever it opens, it will not open for much longer."
      : "It is still cold, and it shifts when you shift your grip. It is still a key.";
}

// Perishable food ages the same way — FLAVOR only. Unlike the heart it never
// stops working: a spoiled-looking ration still fills you. The caller decides
// WHICH food ages (edible and not in FOOD_KEEPS); these just turn an age into
// words. `at` is acquired_at (unix seconds).
export type FoodState = "fresh" | "turning" | "spoiled";
// itemId is optional and only ever LENGTHENS the clock: a cooked form runs on
// COOKED_SPOIL_MULT times the raw windows. Omitting it reads the raw clock,
// which is the right default for anything that isn't off a fire.
export function foodState(at: number | undefined, itemId?: string, now = Math.floor(Date.now() / 1000)): FoodState {
  if (at === undefined) return "fresh";
  const age = now - at;
  const m = itemId !== undefined && COOKED_FOODS.has(itemId) ? COOKED_SPOIL_MULT : 1;
  if (age >= FOOD_SPOIL_SEC * m) return "spoiled";
  if (age >= FOOD_FRESH_SEC * m) return "turning";
  return "fresh";
}
// The shelf-word: fresh food shows NOTHING (no "— fresh" noise on every ration);
// only aging food flags itself, so the tag reads as a warning, not decoration.
//
// AND IT SAYS WHAT IT MEANS (rome, 2026-08-13: the eel reads spoiled and he can
// still eat it). The mechanic was never in doubt — spoiled food heals half and
// never nothing, deliberately, because starving with a rank ration in the pack
// should be a choice and not a rule. But the one word in the pack list said
// "spoiled", which every player reads as RUINED, and the sentence explaining
// otherwise only appears if you stop and look at the thing. So the tag carries
// its own consequence now: rotten, and still food, which is the whole mechanic
// in four words. "on the turn" stays as it was — that tier costs nothing yet,
// and it is the warning that you are about to lose half.
export function foodWord(at: number | undefined, itemId?: string, now?: number): string {
  const s = foodState(at, itemId, now);
  return s === "spoiled" ? "rotten, still food" : s === "turning" ? "on the turn" : "";
}
// The long look: what the ration is like now.
export function foodProse(at: number | undefined, itemId?: string, now?: number): string {
  const s = foodState(at, itemId, now);
  return s === "spoiled"
    ? "It has gone off — slick and grey, a sour reek to it. It is still food and it will still fill you, but only about half as far as it would have. Your stomach will have to agree."
    : s === "turning"
      ? "It is past its best: soft now, an edge of rot creeping into the smell. It is still worth its full keep, but not for much longer — eat it soon."
      : "It is fresh, near enough.";
}

// A crude map lies the SAME way every time you open it (or it reads as noise,
// not a map). The lie is seeded off the book's row id, so a given scrap is
// consistently wrong — and a second crude map is wrong differently. Deterministic
// PRNG (mulberry32) + a cheap string hash feed it; never the CSPRNG.
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Barter values can be fractional (a rat-tail is worth 0.1), so a counter total
// is summed in floats — round to a clean tenth so ten tails read as 1, not
// 0.999…, and the "square" check never sticks a hair short.
export const roundTender = (n: number) => Math.round(n * 10) / 10;

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dirPhrase(dir: string): string {
  if (dir === "up") return "from above";
  if (dir === "down") return "from below";
  return "to the " + dir;
}

// "a scabby rat" -> "rat", "the Forgotten King" -> "king": the word a player
// would naturally type, and one nameMatches() is guaranteed to accept.
export function shortName(name: string): string {
  const words = name.toLowerCase().split(/\s+/).filter((w) => w !== "a" && w !== "an" && w !== "the");
  return words[words.length - 1] ?? name.toLowerCase();
}

// "second hyena", "2 hyena", "2.hyena", "hyena 2" — which of several same-named
// things you mean, counted in the order the room lists them. Plain "hyena" is
// the first.
const ORDINAL_WORDS = ["first", "second", "third", "fourth", "fifth", "sixth"];
export function parseOrdinal(arg: string): { nth: number; rest: string } {
  let m = arg.match(/^(\d+)(?:st|nd|rd|th)?[. ]\s*(.+)$/);
  if (m) return { nth: parseInt(m[1], 10), rest: m[2] };
  const words = arg.split(/\s+/);
  const wi = ORDINAL_WORDS.indexOf(words[0]);
  if (wi >= 0 && words.length > 1) return { nth: wi + 1, rest: words.slice(1).join(" ") };
  m = arg.match(/^(.+?)\s+(\d+)$/);
  if (m) return { nth: parseInt(m[2], 10), rest: m[1] };
  return { nth: 1, rest: arg };
}

// A chip addresses a specific thing, so it carries the whole name — the
// variant IS the warning ("attack albino rat", never just "attack rat").
export function chipName(name: string): string {
  return name.replace(/^(a|an|the)\s+/i, "").toLowerCase();
}

// "attack rat" should hit "a scabby rat"; articles don't count.
export function nameMatches(name: string, arg: string): boolean {
  // Hyphens read as spaces on both sides. The room prints "the three-headed
  // hound", but a player types "three headed hound" — and a compound name must
  // not hide behind its punctuation: "three-headed" as one glued token could
  // never prefix-match the word "headed", so the beast had no look (rome,
  // 2026-07-14).
  const n = name.toLowerCase().replace(/-/g, " ");
  const a = arg.replace(/-/g, " ");
  if (n.includes(a)) return true;
  const words = n.split(/\s+/).filter((w) => w !== "a" && w !== "an" && w !== "the");
  const argWords = a.split(/\s+/);
  return argWords.every((aw) => words.some((w) => w.startsWith(aw)));
}

// Gear enters the world already used — a PRISTINE piece is a rare find, not the
// default. Where it comes from tells you its likely state: gear stripped off the
// dead (`kept=false`) is battered, fought-in; gear from a sealed coffer or hoard
// (`kept=true`) was stored and kept, so it comes out better — but still, only
// rarely, whole. Non-gear (slot "") has no condition and comes back 100.
export function rollGearCondition(slot: string, kept: boolean): number {
  if (slot === "") return 100; // food, trophies, keys — condition is meaningless
  if (chance(kept ? 0.18 : 0.06)) return randInt(90, 100); // the rare near-pristine piece
  return kept ? randInt(58, 90) : randInt(32, 78);         // most gear is worn; hoarded keeps better
}

// The keeper sells NEW stock, not scavenged loot: mostly pristine, and at worst
// lightly shelf-worn — never battered. A floor (70) the dungeon's own gear never
// promises, because you PAID for this. Non-gear (slot "") comes back 100.
export function rollShopCondition(slot: string): number {
  if (slot === "") return 100;
  return chance(0.65) ? 100 : randInt(70, 95); // most perfect; the rest "worn" at worst
}

// ---- THE MARKINGS (rome, 2026-08-13: a crab could say a different colour or
// pattern) -------------------------------------------------------------------
// One line of individual description per creature, so two wrack crabs in the
// same weed are not the same crab twice. Only animals that genuinely vary get a
// list — never the hollow (old bone is old bone), never a boss (a boss looks
// exactly like itself), and never a creature whose colour IS its name: the
// albino rat, the white roe and the silver eel are already the answer to this
// question and a second one would argue with them.
//
// DERIVED, NOT STORED, and that is the whole trick. Hashing the creature's own
// instance id into the list means the marking is stable for that animal's whole
// life — the same crab you looked at an hour ago, across restarts and across a
// DO rebuild — while costing b:creatures exactly zero extra bytes. The blob is
// the scaling ceiling in this game; a per-creature field would have been the
// wrong way to buy this.
export function morphOf(creatureId: string, templateId: string, table: Record<string, string[]>): string {
  const list = table[templateId];
  if (!list || !list.length) return "";
  let h = 2166136261;
  for (let i = 0; i < creatureId.length; i++) { h ^= creatureId.charCodeAt(i); h = Math.imul(h, 16777619); }
  return list[Math.abs(h) % list.length];
}
