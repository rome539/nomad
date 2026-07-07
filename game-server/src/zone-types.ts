// The ZoneDO's in-memory state shapes: a connected wanderer, the creatures that
// hunt them, and everything the world persists between alarms. Pure type
// declarations — no logic, no state.
import type { CarriedItem } from "./world";

export type Stance = "reckless" | "steady" | "guarded";

export interface Session {
  ws: WebSocket;
  pubkey: string;
  name: string;
  named: boolean; // chose their name (or client adopted their profile name)
  roomId: string;
  hp: number;
  maxHp: number;
  target: string | null; // creature id — the foe you initiated on
  stance: Stance; // how you fight: reckless / steady / guarded (persisted to D1)
  items: CarriedItem[]; // pack cache; D1 is truth. serial != null = gate-sealed
  staggered: boolean; // fumbled an opening; the next hit that lands costs more
  resting: boolean;
  away: boolean; // out of the world, untouchable (bench modal, or the keeper's hatch)
  trading?: boolean; // which away it is: true = the keeper's hatch (modal or typed)
  forging?: boolean; // which away it is: true = the gatehouse forge (modal or typed)
  sorting?: boolean; // which away it is: true = a typed 'inventory' keeping-sort
  stepText?: boolean; // stepped out via a TYPED barter/forge/inventory (text, no modal)
  ctxCombat: boolean; // the combat state the last chip set was drawn for (see syncCombatCtx)
  seizedBy?: string; // DROWNER creature id that has hold of you — can't flee till you break free
  buying?: { itemId: string; cost: number; paid: number; escrow: { row: string; from: string }[] }; // open trade at the keeper's hatch; escrow = rows laid on the counter and where they live ('' pack | lockbox | vault) — nothing moves until he's square
  born: number; // created_at, unix seconds — wanderer age on the sheet
  kills: number; // tallies cached from D1; recordKill/recordDeath keep the truth
  deaths: number;
  bossKills: number;
  pvpKills: number;
  tokens: number;
  tokensAt: number; // ms of last refill
  nextThrowAt: number; // ms — one throw per round; the arm needs its follow-through
  visited: Set<string>; // rooms seen THIS session — a room you know shows brief, not the full prose again
  lastAmbientAt: number; // ms of the last atmosphere line (rate-limits the dungeon's breathing)
  lastFishAt?: number; // ms of the last fishing cast (a short patience between casts)
}

// A grudge: whose blood it remembers, and when — so time can wear it away.
export interface Grudge {
  pk: string; // pubkey it holds the grudge against
  at: number; // ms epoch it was last provoked (renewed each fresh offense)
}

// A creature is an animal, not a spawner: it has a body, an appetite, and a
// memory. When it dies it is gone; migration refills the world.
export interface Creature {
  id: string; // instance id (seed spawn id, or uuid for migrants)
  templateId: string;
  roomId: string;
  hp: number;
  hunger: number; // 0..100; above HUNGRY_AT it starts hunting for food
  grudges: Grudge[]; // who hurt it, and when — memory that fades with time
  nextWanderAt: number; // ms epoch
  target: string | null; // pubkey it is fighting
  curious?: string | null; // roomId it heard something from — going to look
  patrolIdx?: number; // position along a patrol route, if it keeps one
  phase?: number; // boss rage tier (0/1/2), climbs at hp thresholds
  stole?: string; // cutpurse: the item id it grabbed and ran with (dropped on death)
  carries?: string[]; // gear it visibly bears (worn/wielded at spawn, or scavenged) — spills on death
  fed?: number; // grave-hyena: corpses eaten; enough and it turns bold
  nextBirthAt?: number; // brood-rat: ms epoch of its next birth
  stunned?: boolean; // a blunt blow rang it — skips its next action, then clears
  bleedTicks?: number; // ticks of open wound left (armor-ignoring); refreshed by fast hits
  bleedDmg?: number; // damage the current wound bleeds each tick
  hidden?: boolean; // LURKER: unseen in the room until it strikes
  rises?: number; // REVENANT: times it has already got back up (see RISE_LIMIT)
  home?: string; // its den: territory anchors here (backfilled for old saves)
}

export interface Regrow {
  itemId: string;
  roomId: string;
  at: number;
}

// What a room remembers. `label` names the fallen (blood), `words` are a
// carving's text plus its author.
export interface Trace {
  kind: "blood" | "remains" | "scraps" | "rest" | "passage" | "carve";
  at: number;
  label?: string;
  words?: string;
}

export interface RotEntry {
  itemId: string;
  roomId: string;
  at: number; // when it goes foul
}

// A carryable on the floor that can't be reduced to a bare template id — it
// holds instance state that must survive the drop. Today: journals (journalId).
export interface GroundInstance {
  itemId: string;
  journalId: string;
}

// Everything the world needs to keep existing while nobody watches.
export interface SimState {
  savedAt: number;
  creatures: Creature[];
  ground: Record<string, string[]>;
  groundInstances?: Record<string, GroundInstance[]>; // instanced items on the floor (journals: they carry their pages)
  regrow: Regrow[];
  arrivals: Record<string, number>; // templateId -> ms when a migrant arrives
  openDoors: string[]; // "roomId:dir" unlocked for everyone, until the boss returns
  traces: Record<string, Trace[]>;
  rot: RotEntry[];
  placedSpawns?: string[]; // "itemId@roomId" ground spawns already laid down once
  cacheSpent?: Record<string, number>; // cacheId -> ms epoch it re-locks/refills
}
