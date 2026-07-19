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
  stunned?: boolean; // a heavy dead blow rang you; you skip your next swing, then it clears
  openedHeavy?: boolean; // you opened a fight with a BLUNT ambush — the heavy blow WAS your beat, so you skip the first round's swing (the foe answers before you swing again). Edged/pierce don't set this; their finesse keeps the opener + swing.
  woundedTold?: boolean; // told-once flag: you've been warned your swings went soft (under a third HP); clears when you're whole enough again
  bleedTicks?: number; // open wound: armor-ignoring ticks left before it clots (claws/teeth in the deep)
  bleedDmg?: number; // damage the current wound leaks each combat round
  resting: boolean;
  away: boolean; // out of the world, untouchable (bench modal, or the keeper's hatch)
  trading?: boolean; // which away it is: true = the keeper's hatch (modal or typed)
  forging?: boolean; // which away it is: true = the gatehouse forge (modal or typed)
  sorting?: boolean; // which away it is: true = a typed 'inventory' keeping-sort
  stepText?: boolean; // stepped out via a TYPED barter/forge/inventory (text, no modal)
  loudSelfAt?: number; // last time we told the mover their own load made noise (throttle; ephemeral, not persisted)
  ctxCombat: boolean; // the combat state the last chip set was drawn for (see syncCombatCtx)
  gateSmeltable?: boolean; // cached: enough scrap across pack+lockbox+vault to smelt a bar — gates the 'smelt' chip (refreshGateStock; sync chip builder can't load containers itself)
  gateCureName?: string;   // cached: chip-name of a curable raw meat somewhere across pack+lockbox+vault, so the 'cure' chip can be 'cure <meat>' (hangs on click); undefined = nothing raw to hang
  seizedBy?: string; // DROWNER creature id that has hold of you — can't flee till you break free
  litUntil?: number; // ms epoch a kindled light burns until; while now < this you carry light (sees dark rooms; a torch also wakes fire-fear). Reset on wake — a rekindle is cheap.
  litSource?: "torch" | "lantern"; // what burns: a torch is an open flame (fire-fear), a lantern a tame one (light only, and the lantern stays in the pack)
  torchWarned?: boolean; // fired the one-time "burning low" warning for the current light
  pvpTarget?: string | null; // pubkey of the wanderer this one has steel out against (transient — a deploy ends the exchange, never the grudge)
  linkdeadUntil?: number; // ms epoch a mid-fight disconnect holds the body in the world until; unset = normally connected (or normally gone)
  hobbled?: boolean; // a leg wound: you can still flee, but only after limping clear (a set delay), cured by rest
  limpingSince?: number; // ms epoch you started dragging your bad leg toward the exit; flee lands once HOBBLE_FLEE_MS passes
  buying?: { wants: { itemId: string; cost: number }[]; paid: number; escrow: { row: string; from: string }[] }; // open cart at the keeper's hatch: wants = every thing named (duplicates allowed), paid against their summed cost; escrow = rows laid on the counter and where they live ('' pack | lockbox | vault) — nothing moves until he's square, then it all changes hands at once
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
  lastAmbientLine?: string; // the last one said — never said twice running, however small the pool
  lastFishAt?: number; // ms of the last fishing cast (a short patience between casts)
  lastActiveAt: number; // ms of the last real frame (or connect) — the tick's idle sweep sleeps sockets silent past IDLE_TIMEOUT_MS. Rides the socket attachment as `la` so a hibernation rebuild doesn't read a parked socket as fresh.
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
  stoleJournal?: string; // the snatched thing's instance identity: when `stole` is a journal, its journalId rides here so the pages survive the theft (spills instanced; bare `stole` was eating books — rome, 2026-07-18)
  fed?: number; // grave-hyena: corpses eaten; enough and it turns bold
  rouseAt?: number; // dire-hyena guarding a meal: ms it commits to attacking — a wind-up you can flee or hit first
  wakeUntil?: number; // SENTINEL (the deep's hound): asleep until roused; awake (and barring the descent) while now < this
  surfaced?: boolean; // a deep-dweller the sim coughed up into the shallows; killing it drops the corpse-key (deep-heart)
  surfacedAt?: number; // ms epoch it surfaced; unkilled past SURFACED_STALE_MS it slinks back down (frees the next surfacing)
  nextBirthAt?: number; // brood-rat: ms epoch of its next birth
  stunned?: boolean; // a blunt blow rang it — skips its next action, then clears
  bleedTicks?: number; // ticks of open wound left (armor-ignoring); refreshed by fast hits
  bleedDmg?: number; // damage the current wound bleeds each tick
  hidden?: boolean; // LURKER: unseen in the room until it strikes
  rises?: number; // REVENANT: times it has already got back up (see RISE_LIMIT)
  home?: string; // its den: territory anchors here (backfilled for old saves)
  risen?: boolean; // corpse-wake: pulled up for the window only — drops where it stands when the window closes
  eyeing?: string; // scavenger: the floor gear it has declared intent on (the nose-first telegraph)
  eyeingAt?: number; // ms epoch the snatch lands, if nobody comes back to interrupt
  cuddling?: string; // rat-kind: pubkey of the resting wanderer it has curled up against (cleared the moment they rise)
  mournedAt?: number; // grave-hyena: the `at` of the kin-corpse it last keened over, so each body is mourned once
  murmuredAt?: number; // HOLLOW: last time it breathed a name into the dark (the cooldown anchor)
  asleep?: boolean; // warm blood only: dozing — skips its whole act loop; wakes to entry/noise rolls (the wakeListeners law), a blow, or its own clock
  sleepUntil?: number; // when the doze ends on its own
  thirstAt?: number; // hyenas: when the next watering run calls
  wateringTo?: string; // hyenas: the water room it's padding toward (wander steers by roomDist)
  avoids?: { roomId: string; until: number }[]; // place-fear: rooms this one steers around (a rat's bad memory, a thief's warning)
  calledTo?: string; // call-bus guard: it was SUMMONED here — it never calls from this room (a call must never trigger a call)
  repositionAt?: number; // lurkers: next time it re-reads the traffic and shifts its ambush
  hurtBy?: string[]; // BOSSES only: every pubkey whose blow drew blood — when the boss falls, all of them share the horror on their sheet (assist credit; the kill itself stays the killer's)
}

export interface Regrow {
  itemId: string;
  roomId: string;
  at: number;
}

// What a room remembers. `label` names the fallen (blood), `words` are a
// carving's text plus its author.
export interface Trace {
  // "blood" is a death's pooled stain; "drip" is the walking kind — a thing
  // (player or creature) that crossed this room with an open wound. The drip
  // is the huntable trail: scavengers drift toward it, and so can you.
  kind: "blood" | "drip" | "remains" | "scraps" | "rest" | "passage" | "carve";
  at: number;
  label?: string;
  words?: string;
}

// A room event mid-arc (events.ts): which phase the sky is in, and when it
// turns. phase "idle" means the next telegraph fires at `until`.
export interface EventState {
  phase: "idle" | "telegraph" | "active" | "aftermath";
  until: number; // ms epoch this phase ends
  data?: string; // event-specific payload (the keeper's want: which item he's asking after)
}

export interface RotEntry {
  itemId: string;
  roomId: string;
  at: number; // when it goes foul
  // "rot" (the default, undefined on legacy saves): food spoils, leaves scraps.
  // "crumble": a stray loose-rock lost to the rubble — no scraps, no scavenger
  // lure, just gone. Same timer machinery, different ending.
  // "sodden": a torch left on wet stone off its spawn floors — the damp takes
  // the pitch and it's rag and sludge. No scraps, no lure, gone like the rock.
  // "wilt": a growing PHYSIC (cut bloodwort, linen strips) hauled off its damp
  // spawn floor — it dries out / molders fast. No scraps, no lure, just spent.
  // "cure": the rot clock run BACKWARD — raw meat hung in the smokehouse racks,
  // which on this timer doesn't spoil but PRESERVES: the floor item is swapped
  // for its keeping form (CURE_RECIPES). The one timer that ends in something better.
  // "gatecure": the SAFE gate-smokehouse cure — same preserve timer, but `roomId`
  // holds the PUBKEY (not a room), it never resolves onto a floor (the sweep skips
  // it), and it's collected lazily when the owner is next at the gate. Slower than
  // the deep racks (GATE_CURE_MS), the price of it being unlift-able.
  kind?: "rot" | "crumble" | "sodden" | "wilt" | "cure" | "gatecure";
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
  doorCloseAt?: Record<string, number>; // "roomId:dir" -> ms epoch a timed door re-seals (the deep door: a heart buys a window, not a thoroughfare)
  fenceOut?: Record<string, number>;
  bloodOn?: Record<string, number[]>; // pubkey -> kill timestamps; the evidence walks around on the murderer // itemId -> ms the keeper restocks it (bare shelves — the market has other customers)
  nextStoneAt?: number; // ms the world next mints a hammerstone into a random haunt (no farmable spot)
  nextBrandAt?: number; // ms the world next rolls a longbrand into fire-keeping country (the rare torch, same law)
  nextSmokeTorchAt?: number; // ms the world next rolls a plain torch into the smokehouse (dice, capped at one — a find, not a refill)
  nextCarrionAt?: number; // ms the world next rolls a carcass into a random deep room (dice — feeds the pale hunters, one body at a time)
  traces: Record<string, Trace[]>;
  rot: RotEntry[];
  placedSpawns?: string[]; // "itemId@roomId" ground spawns already laid down once
  groundCond?: Record<string, number>; // "itemId@roomId" -> condition of gear on the floor, so wear survives drop/pickup
  groundTorch?: Record<string, number>; // roomId -> ms epoch a torch burning on the floor lasts until (a dropped/fallen flame lighting the room for all in it)
  groundLore?: Record<string, string>; // "itemId@roomId" -> lore_id of engraved gear on the floor, so the mark survives too (077)
  groundHeart?: Record<string, number>; // "itemId@roomId" -> a dropped heart's acquired_at, so the floor can't wash its rot off
  inGatehouse?: string[]; // pubkeys standing INSIDE — a dropped socket must not throw you out the door
  wallMarks?: string[]; // roomIds carved onto the gatehouse wall chart — the players' own map of the shallow ring
  cacheSpent?: Record<string, number>; // cacheId -> ms epoch it re-locks/refills
  cacheRoom?: Record<string, string>; // cacheId -> its CURRENT room (roaming chests relocate on refill; unset = place on first access)
  nextSurfaceAt?: number; // ms epoch the deep next surfaces a dweller (corpse-key minting; only while the deep door is sealed)
  events?: Record<string, EventState>; // room events mid-arc (rain and its kin) — the sky survives hibernation
  fishStock?: Record<string, { left: number; at: number }>; // per-water catch budget: what's left, and when a fished-out pool forgets (survives deploys — no free refill)
}
