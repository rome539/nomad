// Pure, stateless helpers lifted out of the ZoneDO monolith: text shaping, a
// deterministic PRNG for the crude map's consistent lie, and tender rounding.
// Nothing here touches game state — safe to import anywhere.

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

// "attack rat" should hit "a scabby rat"; articles don't count.
export function nameMatches(name: string, arg: string): boolean {
  const n = name.toLowerCase();
  if (n.includes(arg)) return true;
  const words = n.split(/\s+/).filter((w) => w !== "a" && w !== "an" && w !== "the");
  const argWords = arg.split(/\s+/);
  return argWords.every((aw) => words.some((w) => w.startsWith(aw)));
}
