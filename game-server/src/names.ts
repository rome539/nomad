// The dungeon names the nameless. Guests arrive with a wanderer's name, not
// a pubkey stub; anyone can overrule it with `name`, and real Nostr
// identities get their profile name adopted client-side.
import { randInt } from "./rng";

const FIRST = [
  "Ash", "Dusk", "Gray", "Pale", "Rust", "Moss", "Stone", "Ember",
  "Hollow", "Brine", "Fog", "Sable", "Thorn", "Cinder", "Murk", "Frost",
  "Loam", "Gloam", "Tallow", "Iron",
];
const SECOND = [
  "walker", "drifter", "stray", "pilgrim", "vagrant", "tread", "mantle",
  "whisper", "knock", "lantern", "candle", "shade", "step", "wick",
  "root", "crow", "wren", "fern", "brook", "gate",
];

export function randomName(): string {
  return FIRST[randInt(0, FIRST.length - 1)] + SECOND[randInt(0, SECOND.length - 1)];
}

// A name nobody currently answers to. Collisions get a trailing number.
export async function uniqueName(db: D1Database): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const name = randomName();
    const taken = await db
      .prepare("SELECT 1 AS x FROM players WHERE name = ? COLLATE NOCASE")
      .bind(name)
      .first();
    if (!taken) return name;
  }
  return randomName() + randInt(2, 999);
}
