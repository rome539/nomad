// The dungeon signs every legitimate drop with its own Nostr key.
// That signature is what makes loot verifiable and un-forgeable — the same
// authority pattern castr used for catches, generalized. The event shape stays
// nditem-compatible (kind 1573 family) for District bazaar interop later.
import { finalizeEvent, getPublicKey, type Event } from "nostr-tools";
import type { Env } from "./env";
import { hexToBytes, nowSec } from "./util";

const LOOT_KIND = 1573;
const SHEET_KIND = 31573;
const FEED_KIND = 24913;
const SCORE_KIND = 30762; // Gamestr leaderboard score (addressable/replaceable)
// The Gamestr game identifier — the `game` tag and the prefix of every score's
// addressable `d`. Lowercase-hyphenated, as their directory expects.
export const GAME_ID = "nomad";
// The tavern is kind 24914 — EPHEMERAL (20000-29999), so no relay stores a word
// of it. It is deliberately NOT signed here: the gate's key signs what the
// DUNGEON says (drops, deaths, the room feed), never what a wanderer says. Each
// player's client signs their own speech with their own key and puts it on the
// relays itself. See the "gpub" frame in gate.ts / public.ts.

// True only when a real dungeon key is configured. Until launch the key is
// deliberately left unset, so loot is recorded but unsigned — plug in
// GAME_SK_HEX and signing turns on automatically, no code change.
export function isGameKeyConfigured(env: Env): boolean {
  const k = env.GAME_SK_HEX?.trim();
  return !!k && /^[0-9a-f]{64}$/i.test(k) && !/^0{64}$/.test(k);
}

// The dungeon's own public key (the epoch npub, in hex). Used to build the
// addressable coordinate of a wanderer's 31573 sheet so a player's kind-1 brag
// can carry a verifiable pointer back to it. Empty when no key is configured.
export function gamePubkey(env: Env): string {
  if (!isGameKeyConfigured(env)) return "";
  return getPublicKey(hexToBytes(env.GAME_SK_HEX));
}

export interface LootSignParams {
  pubkey: string; // the player who earned it
  lootId: string; // unique id of this drop instance
  itemId: string;
  name: string;
  rarity: string;
  zone: string;
  serial?: number; // mint ledger serial — present when the gate seals a claim
}

export function signLootEvent(env: Env, p: LootSignParams): Event {
  const sk = hexToBytes(env.GAME_SK_HEX);
  const tags = [
    ["p", p.pubkey],
    ["d", p.lootId],
    ["item", p.itemId],
    ["rarity", p.rarity],
    ["zone", p.zone],
    ["t", "nomad-loot"],
    ["v", "0"],
  ];
  if (p.serial !== undefined) tags.push(["serial", String(p.serial)]);
  return finalizeEvent(
    {
      kind: LOOT_KIND,
      created_at: nowSec(),
      tags,
      content: JSON.stringify({
        item: p.itemId,
        name: p.name,
        rarity: p.rarity,
        zone: p.zone,
      }),
    },
    sk,
  );
}

export interface ScoreSignParams {
  player: string; // the wanderer's own pubkey (hex) — the SUBJECT of the score
  board: string; // which leaderboard: "carrying" | "legend"
  score: number;
  content: string;
  genres?: string[]; // Gamestr genre `t` tags
}

// A Gamestr score (kind 30762), signed by the DUNGEON's own key so it shows as
// VERIFIED — the wanderer is named in the `p` tag but never signs their own
// number (the world attests it; a self-signed brag would inflate). Addressable:
// one current score per (player, board), replaced in place as it changes.
export function signScoreEvent(env: Env, p: ScoreSignParams): Event {
  const sk = hexToBytes(env.GAME_SK_HEX);
  // ONE Gamestr game per board (`nomad-legend`, `nomad-trophies`). Gamestr groups
  // leaderboards by the `game` tag and does NOT surface the level/board on a card,
  // so a single `game` with two boards renders as two indistinguishable entries.
  // A distinct game-id per board is the only lever that keeps them apart (each
  // must be registered on Gamestr for its display name to show; until then both
  // read "Unknown Game"). The in-game `leaderboard` is the controlled surface.
  const game = `${GAME_ID}-${p.board}`;
  const tags: string[][] = [
    ["d", `${game}:${p.player}:${p.board}`],
    ["game", game],
    ["score", String(Math.max(0, Math.round(p.score)))],
    ["p", p.player],
    ["state", "active"],
    ["mode", "multiplayer"],
    ["level", p.board],
    ["board", p.board],
    ["v", "0"],
  ];
  for (const g of p.genres ?? []) tags.push(["t", g]);
  return finalizeEvent(
    { kind: SCORE_KIND, created_at: nowSec(), tags, content: p.content },
    sk,
  );
}

// The character as a portable, verifiable Nostr object (kind 31573,
// d = the wanderer's pubkey). Signed on demand; published only when the
// player says so.
export function signSheetEvent(
  env: Env,
  p: {
    pubkey: string;
    name: string;
    hp: number;
    maxHp: number;
    zone: string;
    born: number;
    kills: number;
    deaths: number;
    bossKills: number;
    pvpKills: number;
  },
): Event {
  const sk = hexToBytes(env.GAME_SK_HEX);
  return finalizeEvent(
    {
      kind: SHEET_KIND,
      created_at: nowSec(),
      tags: [
        ["d", p.pubkey],
        ["p", p.pubkey],
        ["zone", p.zone],
        ["t", "nomad-sheet"],
        ["v", "0"],
      ],
      // The braggart's ledger: dungeon-attested tallies, published only on
      // the player's say-so. pvp_kills names no victim — the count is the
      // killer's own mouth, never the world's.
      content: JSON.stringify({
        name: p.name,
        hp: p.hp,
        max_hp: p.maxHp,
        zone: p.zone,
        born: p.born,
        kills: p.kills,
        deaths: p.deaths,
        boss_kills: p.bossKills,
        pvp_kills: p.pvpKills,
      }),
    },
    sk,
  );
}

// The dungeon's own face: kind-0 profile metadata, signed by the epoch key.
// This is the npub that authors everything the dungeon says — loot, feeds,
// sheets — so its profile lives under the same key. The root key stays a cold
// notary (the 31574 attestation), never the social identity.
export interface ProfileParams {
  name: string;
  about: string;
  picture: string;
  website: string;
}

export function signProfileEvent(env: Env, p: ProfileParams): Event {
  const sk = hexToBytes(env.GAME_SK_HEX);
  return finalizeEvent(
    {
      kind: 0,
      created_at: nowSec(),
      tags: [],
      content: JSON.stringify({
        name: p.name,
        about: p.about,
        picture: p.picture,
        website: p.website,
      }),
    },
    sk,
  );
}

// One public line of one room — the spectator layer (kind 24913, ephemeral).
export function signFeedEvent(env: Env, roomTag: string, zone: string, text: string): Event {
  const sk = hexToBytes(env.GAME_SK_HEX);
  return finalizeEvent(
    {
      kind: FEED_KIND,
      created_at: nowSec(),
      tags: [
        ["t", roomTag],
        ["zone", zone],
        ["v", "0"],
      ],
      content: text,
    },
    sk,
  );
}
