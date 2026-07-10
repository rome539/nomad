// Pure, stateless helpers lifted out of the ZoneDO monolith: text shaping, a
// deterministic PRNG for the crude map's consistent lie, and tender rounding.
// Nothing here touches game state — safe to import anywhere.
import { chance, randInt } from "./rng";

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
  const n = name.toLowerCase();
  if (n.includes(arg)) return true;
  const words = n.split(/\s+/).filter((w) => w !== "a" && w !== "an" && w !== "the");
  const argWords = arg.split(/\s+/);
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
