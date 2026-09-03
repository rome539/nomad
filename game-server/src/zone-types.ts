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
  dying?: boolean; // a fall is being processed — re-entrancy guard so two triggers in one beat (a bleed tick + a threshold ambush) can't BOTH scatter the pack and dupe the set
  openedHeavy?: boolean; // you opened a fight with a BLUNT ambush — the heavy blow WAS your beat, so you skip the first round's swing (the foe answers before you swing again). Edged/pierce don't set this; their finesse keeps the opener + swing.
  woundedTold?: boolean; // told-once flag: you've been warned your swings went soft (under a third HP); clears when you're whole enough again
  bleedTicks?: number; // open wound: armor-ignoring ticks left before it clots (claws/teeth in the deep)
  bleedDmg?: number; // damage the current wound leaks each combat round
  resting: boolean;
  // THE POSTURE THE ROOM KEEPS (rome, 2026-08-30). Not a line that scrolls past
  // whoever happened to be looking — state, read off you by anyone who walks in
  // afterwards, exactly the way a creature's bearing is. Dropped by effort, the
  // same triggers that end a rest. `poseAt` is what a POINTING hand is out
  // toward, in the player's own word, resolved against the world first.
  pose?: "guard" | "lean" | "crouch" | "point";
  poseAt?: string;
  // WHAT THE HAND IS ACTUALLY ON, as opposed to the word for it. `poseAt` is
  // prose — the player's own word, echoed back — and prose cannot be checked
  // against the room. This is the referent: "c:<creature id>", "p:<pubkey>" or
  // "g:<item template>". Absent means the thing cannot leave (a direction, or a
  // fixture the room is made of), so there is nothing to check.
  poseRef?: string;
  away: boolean; // out of the world, untouchable (bench modal, or the keeper's hatch)
  trading?: boolean; // which away it is: true = the keeper's hatch (modal or typed)
  forging?: boolean; // which away it is: true = the gatehouse forge (modal or typed)
  bountying?: boolean; // which away it is: true = the keeper's bounty board (modal or typed)
  sorting?: boolean; // which away it is: true = a typed 'inventory' keeping-sort
  stepText?: boolean; // stepped out via a TYPED barter/forge/inventory (text, no modal)
  habitAt: number;      // last time the body performed one of its own tells; a Session field and not a DO map, like lastAmbientAt, so it dies with the wanderer instead of outliving every session that ever connected
  habitLine?: string;   // the last tell it performed, so the same one never lands twice running
  quirkAt: number;      // and the same clock for a carried treasure acting out its past
  loudSelfAt?: number; // last time we told the mover their own load made noise (throttle; ephemeral, not persisted)
  coldToldAt?: number; // last time we told a rester the cold was eating their rest (throttle; ephemeral, not persisted)
  ctxCombat: boolean; // the combat state the last chip set was drawn for (see syncCombatCtx)
  gateSmeltable?: boolean; // cached: enough scrap across pack+lockbox+vault to smelt a bar — gates the 'smelt' chip (refreshGateStock; sync chip builder can't load containers itself)
  gateCureName?: string;   // cached: chip-name of a curable raw meat somewhere across pack+lockbox+vault, so the 'cure' chip can be 'cure <meat>' (hangs on click); undefined = nothing raw to hang
  gateCookName?: string;   // ...and the same for the brazier: chip-name of a raw catch that would cook (COOK_RECIPES)
  seizedBy?: string; // DROWNER creature id that has hold of you — can't flee till you break free
  draggedRooms?: number; // FERRYMAN: how many rooms he has already hauled you along the rope this grip — a hard cap on the drag (a fair window, not a one-way ticket)
  litUntil?: number; // ms epoch a kindled light burns until; while now < this you carry light (sees dark rooms; a torch also wakes fire-fear). Reset on wake — a rekindle is cheap.
  litSource?: "torch" | "lantern" | "brand"; // what burns: a torch is an open flame (fire-fear), a lantern a tame one (light only, and the lantern stays in the pack), a brand an open flame in the WEAPON hand (2026-08-20)
  litRow?: string; // WHICH row is alight, when litSource is "brand" (2026-08-20): more than one burning weapon can ride in a pack now, so the burnout must spend the one actually lit and not the first brand it finds
  torchWarned?: boolean; // fired the one-time "burning low" warning for the current light
  pvpTarget?: string | null; // pubkey of the wanderer this one has steel out against (transient — a deploy ends the exchange, never the grudge)
  linkdeadUntil?: number; // ms epoch a mid-fight disconnect holds the body in the world until; unset = normally connected (or normally gone)
  hobbled?: boolean; // a leg wound: you can still flee, but only after limping clear (a set delay), cured by rest
  limpingSince?: number; // ms epoch you started dragging your bad leg toward the exit; flee lands once HOBBLE_FLEE_MS passes
  markedUntil?: number; // MARKERS (the toll clerk): the road knows your face — earshot heeds you harder while this holds; scrubbed at a gate
  buying?: { wants: { itemId: string; cost: number }[]; paid: number; escrow: { row: string; from: string }[]; settling?: boolean }; // open cart at the keeper's hatch: wants = every thing named (duplicates allowed), paid against their summed cost; escrow = rows laid on the counter and where they live ('' pack | lockbox | vault) — nothing moves until he's square, then it all changes hands at once. settling = a settlement is mid-flight (the double-settle guard, 2026-08-20)
  dealId?: string; // pending player-to-player trade (trade.ts) — points into ZoneDO's `deals` map. Ephemeral: a DO wake never restores it (same as `buying`), and either side leaving, dying, or drawing steel cancels it for both
  born: number; // created_at, unix seconds — wanderer age on the sheet
  kills: number; // tallies cached from D1; recordKill/recordDeath keep the truth
  deaths: number;
  bossKills: number;
  pvpKills: number;
  tokens: number;
  tokensAt: number; // ms of last refill
  nextThrowAt: number; // ms — one throw per round; the arm needs its follow-through
  visited: Set<string>; // rooms seen THIS session — a room you know shows brief, not the full prose again
  mapInk?: Map<string, Set<string>>; // per carried surveyor's copy (its journalId): rooms inked onto it — cache over map_ink, loaded on first touch
  studied?: Set<string>; // templateIds already studied across every carried journal — cache over journal_logs so the SYNC chip builder can hide a redundant `study` (sendCtx runs every combat round; it can't read D1). undefined = not hydrated yet, and the chip shows, same as before the cache existed
  lastAmbientAt: number; // ms of the last atmosphere line (rate-limits the dungeon's breathing)
  lastAmbientLine?: string; // the last one said — never said twice running, however small the pool
  keeperTold: Map<string, number>; // template id -> how many lines of that keeper's story you have heard (persisted, players.keeper_told)
  keeperDueAt?: number; // ms the keeper gets round to saying his one line this visit; 0/unset = already said it, or you aren't behind a door
  lastFishAt?: number; // ms of the last fishing cast (a short patience between casts)
  lastActiveAt: number; // ms of the last real frame (or connect) — the tick's idle sweep sleeps sockets silent past IDLE_TIMEOUT_MS. Rides the socket attachment as `la` so a hibernation rebuild doesn't read a parked socket as fresh.
  wolvesHeld?: number; // how many exits the pack had taken last beat — so the CLOSING is announced, not just discovered
  toldAirborne?: boolean; // THE SUMMIT: you have already been told it is off the ground — said once, not every beat
  rainPhaseSeen?: string; // last rain phase this session was shown the violet line for — describeRoom plays catch-up on a phase it hasn't announced to THIS player yet (walked in after it started), never repeats one already shown
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
  traits?: string[]; // mob trait lottery: rolled at spawn (e.g. "runt") — behavior + look-line, not drops
  patientSpent?: boolean; // `patient` has landed its one heavy blow; the rest are ordinary (see MOB_PATIENT_MULT)
  stoleJournal?: string; // the snatched thing's instance identity: when `stole` is a journal, its journalId rides here so the pages survive the theft (spills instanced; bare `stole` was eating books — rome, 2026-07-18)
  fed?: number; // grave-hyena: corpses eaten; enough and it turns bold
  fedAt?: number; // corvid: last time a wanderer fed it — a full bird won't be fed again for a while (RAVEN_BARTER_WAIT_MS)
  rouseAt?: number; // dire-hyena guarding a meal: ms it commits to attacking — a wind-up you can flee or hit first
  wakeUntil?: number; // SENTINEL (the deep's hound): asleep until roused; awake (and barring the descent) while now < this
  surfaced?: boolean; // a deep-dweller the sim coughed up into the shallows; killing it drops the corpse-key (deep-heart)
  surfacedAt?: number; // ms epoch it surfaced; unkilled past SURFACED_STALE_MS it slinks back down (frees the next surfacing)
  nextBirthAt?: number; // brood-rat: ms epoch of its next birth
  stunned?: boolean; // a blunt blow rang it — skips its next action, then clears
  staggerUntil?: number; // ms epoch: its OWN swing went wide and left it off-balance — the player's next landed hit before this expires gets a class-keyed bonus (STAGGER_* consts), then this clears — one hit only
  bleedTicks?: number; // ticks of open wound left (armor-ignoring); refreshed by fast hits
  bleedDmg?: number; // damage the current wound bleeds each tick
  hidden?: boolean; // LURKER: unseen in the room until it strikes
  rises?: number; // REVENANT: times it has already got back up (see RISE_LIMIT)
  home?: string; // its den: territory anchors here (backfilled for old saves)
  risen?: boolean; // corpse-wake: pulled up for the window only — drops where it stands when the window closes
  lastShedAt?: number; // HOARDER: ms epoch it last let a piece fall. Wall-clock, because the scoop runs on two beats (2s live tick / 30s slow clock) and a per-beat roll would shed 15x faster whenever a player stood within SIM_RADIUS
  eyeing?: string; // scavenger: the floor gear it has declared intent on (the nose-first telegraph)
  eyeingAt?: number; // ms epoch the snatch lands, if nobody comes back to interrupt
  cuddling?: string; // rat-kind: pubkey of the resting wanderer it has curled up against (cleared the moment they rise)
  mournedAt?: number; // grave-hyena: the `at` of the kin-corpse it last keened over, so each body is mourned once
  murmuredAt?: number; // HOLLOW: last time it breathed a name into the dark (the cooldown anchor)
  gorged?: boolean; // this sleep began on a corpse it had just eaten — the only state that earns the bones line
  asleep?: boolean; // warm blood only: dozing — skips its whole act loop; wakes to entry/noise rolls (the wakeListeners law), a blow, or its own clock
  sleepUntil?: number; // when the doze ends on its own
  thirstAt?: number; // hyenas: when the next watering run calls
  wateringTo?: string; // hyenas: the water room it's padding toward (wander steers by roomDist)
  walkingTo?: string;  // this thing is GOING somewhere far off: every wander step closes the distance (roomDist), and it stops when it arrives. The watering run's wire, generalised — a hyena walks to water, a carrier walks a road, and whatever the Crossing puts on the water will walk it too.
  avoids?: { roomId: string; until: number }[]; // place-fear: rooms this one steers around (a rat's bad memory, a thief's warning)
  calledTo?: string; // call-bus guard: it was SUMMONED here — it never calls from this room (a call must never trigger a call)
  leavesAt?: number; // TRANSIENT creatures have somewhere else to be: the ms they walk off the map for good (the chainman)
  fled?: number;        // rooms run in the CURRENT rout — reset when it gets clean away
  windAt?: number;      // how many it had in it this time (FLEE_WIND_MIN..MAX, rolled when the rout starts)
  windedUntil?: number; // ms until it has its breath back; until then it will not run, whatever it is
  huntFor?: string;     // the room it is walking to because its own ground has nothing left to eat (ai.huntGround)
  huntAt?: number;      // ms until that errand is worth recomputing (HUNT_RECHECK_MS)
  drift?: number;       // rooms walked on a WALKABOUT — set = unmoored, no territory (ai.beginDrift)
  driftFrom?: string;   // the ground it set out from: what it walks away from, and what it returns to if it finds nothing
  holding?: string;  // creature id this predator has by the throat (a kill in progress, one room, no pursuit)
  heldBy?: string;   // ...and the other end of that grip
  covets?: string;      // rag-and-bone: pubkey of the wanderer whose kit he has fixed on
  covetUntil?: number;  // ...and when he loses interest
  singUntil?: number; // ms the marrow-cantor's note runs to; the hollow in earshot hold until it stops
  danceUntil?: number; // ms the summer dance runs to; the household on the summer ground holds the circle until it ends
  heldUntil?: number; // ms a hollow thing stands frozen to that note (cleared early only by the singer dying — then it just... stays)
  repositionAt?: number; // lurkers: next time it re-reads the traffic and shifts its ambush
  breathAt?: number;      // THE SUMMIT: ms the drawn breath lands. Set = the room has been told and the clock is running (ai.drakeBeat)
  nextBreathAt?: number;  // ...and the soonest it may draw another
  airborneUntil?: number; // THE SUMMIT: ms it is off the ground. Nothing swung can reach it while this holds; a thrown weapon still can
  nextAirAt?: number;     // ...and the soonest it may go up again
  // THE PASSAGE (ai.drakePassage). The air ABOVE is a fight; this is the air
  // ACROSS — the summit's animal off its mountain entirely, hunting the world.
  aloft?: number;      // ms it comes back down. While this is set the creature is OFF THE MAP: creaturesInRoom skips it, so no room holds it and nothing can reach it
  flightPlan?: string[]; // the bands it crosses, out and home again (the route is a line because the world is one)
  flightIdx?: number;    // how far along that line it is
  flightAt?: number;     // ms of its next leg
  prey?: string;         // what it took, riding home in its jaws (the display name, for the lines and the trace)
  nextHuntAt?: number;   // ...and the soonest it will set out again, hungry or not: an animal that just crossed a world rests before it does it twice (DRAKE_HUNT_WAIT_MS)
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
  roamRocks?: string[]; // LEGACY, read once on load and folded into roamedGround: rooms holding a wandering fortress rock, from when the rock was the only thing that moved
  roamedGround?: string[]; // "itemId@roomId" for every wandered floor thing — it has no spawn row where it lies, so this is what stops the decay sweep taking it for litter
  altarHearts?: string[]; // pubkeys whose still-cold heart the shrine is keeping — one promise per wanderer, cold until they come for it
  gibbetCut?: boolean; // the hanged man is down and stays down — see ZoneDO.gibbetCut for why this is persisted and not per-wake
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
  seededDens?: string[]; // mob_spawn ids already populated once — so a migration's new dens fill on load instead of trickling in on the migration clock
  groundCond?: Record<string, number>; // "itemId@roomId" -> condition of gear on the floor, so wear survives drop/pickup
  groundTorch?: Record<string, number>; // roomId -> ms epoch a torch burning on the floor lasts until (a dropped/fallen flame lighting the room for all in it)
  groundLore?: Record<string, string>; // "itemId@roomId" -> lore_id of engraved gear on the floor, so the mark survives too (077)
  groundRolled?: Record<string, string>; // "itemId@roomId" -> rolled_traits of lottery gear on the floor, so the roll survives a drop/pickup (099)
  groundHeart?: Record<string, number>; // "itemId@roomId" -> a dropped heart's acquired_at, so the floor can't wash its rot off
  inGatehouse?: string[]; // pubkeys standing INSIDE — a dropped socket must not throw you out the door
  inDen?: [string, string][]; // pubkey -> the holder whose den they stepped into (mig 172); a dropped socket must not put you out on the street
  walked?: Record<string, string[]>;    // rooms each player has been SEEN to stand in — what 'carve' may set down. Kept in the world's state, not on the session: buildSession runs on every reconnect and every DO rebuild, and a hibernating DO is not an event a player can see or avoid.
  wallMarks?: Record<string, string[]>; // gatehouse wall chart, PER PUBKEY: your own chalk, your own chart. (Was a shared string[]; a legacy array is dropped on load — it has no author recorded, so it cannot be attributed to anyone.)
  board?: { name: string; words: string; at: number }[]; // the gatehouse board, oldest first — the one thing said here that outlives the saying
  stoneNames?: Record<string, { name: string; at: number }[]>; // milestone roomId -> the register cut into it, oldest first (the road's record of who walked it)
  cacheSpent?: Record<string, number>; // cacheId -> ms epoch it re-locks/refills
  cacheRoom?: Record<string, string>; // cacheId -> its CURRENT room (roaming chests relocate on refill; unset = place on first access)
  nextSurfaceAt?: number; // ms epoch the deep next surfaces a dweller (corpse-key minting; only while the deep door is sealed)
  events?: Record<string, EventState>; // room events mid-arc (rain and its kin) — the sky survives hibernation
  fishStock?: Record<string, { left: number; at: number }>; // per-water catch budget: what's left, and when a fished-out pool forgets (survives deploys — no free refill)
  nextChainmanAt?: number; // ms the world next rolls whether the chainman turns up somewhere
  works?: Record<string, number>; // gate roomId -> ms epoch its door reopens (the gatehouse shut for works; the gate ROOM is untouched)
  nextWorksAt?: number; // ms epoch the world next considers shutting a gatehouse
  snowUntil?: number; // ms the mountain's snow lasts to (the season outlasts the cold that made it; 0 = no snow)
  nests?: Record<string, string[]>; // corvid nests: nest roomId -> gear the raven carried home (ABSTRACT — off the floor, visible only through feeding/raiding the nest itself)
  bounties?: [string, string, number?][]; // the keeper's bounty board: [trophyId, foodId, count?] currently posted (rotates like the fence)
  nextBountyChurnAt?: number; // ms the board next rolls a fresh set of trophies
  nextFenceChurnAt?: number; // ms the hatch's shelf next churns (persisted since 2026-08-20 — a module-level clock reset on every eviction, so a busy market's rotation could be deferred forever)
  keeperBowl?: string[]; // the bones: trophies the keeper has won off people at the gatehouse bench, and what he can put up against a stake (dice.ts)
  bountyTaken?: Record<string, string[]>; // pubkey -> trophyIds that wanderer has already claimed off the CURRENT board (cleared on churn; a posting is one meal per person, not one meal in the world)
}
