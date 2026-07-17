// Pure, stateless helpers lifted out of the ZoneDO monolith: text shaping, a
// deterministic PRNG for the crude map's consistent lie, and tender rounding.
// Nothing here touches game state — safe to import anywhere.
import { chance, randInt } from "./rng";
import { HEART_FRESH_SEC, FOOD_FRESH_SEC, FOOD_SPOIL_SEC } from "./zone-data";

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
export function foodState(at: number | undefined, now = Math.floor(Date.now() / 1000)): FoodState {
  if (at === undefined) return "fresh";
  const age = now - at;
  if (age >= FOOD_SPOIL_SEC) return "spoiled";
  if (age >= FOOD_FRESH_SEC) return "turning";
  return "fresh";
}
// The shelf-word: fresh food shows NOTHING (no "— fresh" noise on every ration);
// only aging food flags itself, so the tag reads as a warning, not decoration.
export function foodWord(at: number | undefined, now?: number): string {
  const s = foodState(at, now);
  return s === "spoiled" ? "spoiled" : s === "turning" ? "on the turn" : "";
}
// The long look: what the ration is like now.
export function foodProse(at: number | undefined, now?: number): string {
  const s = foodState(at, now);
  return s === "spoiled"
    ? "It has gone off — slick and grey, a sour reek to it. It will still fill you, if your stomach will have it."
    : s === "turning"
      ? "It is past its best: soft now, an edge of rot creeping into the smell. Eat it soon."
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
