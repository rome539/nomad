// One Durable Object per zone: the authoritative simulation — who's where,
// creature state, what lies on which floor.
//
// The world is a simulation, not a theme park. Creatures live: they wander,
// hunger, eat what smells good, flee when badly hurt, and hold grudges.
// The dead stay dead until something new migrates in. Wounds close only
// with rest or food. What you drop stays where you dropped it; what you
// carry scatters where you fall.
//
// Nothing ticks in an empty dungeon: the whole simulation (plus timestamp)
// persists in DO storage, and catchUp() fast-forwards what happened since
// the world was last observed. An idle dungeon costs nothing; a returning
// player finds a world that kept going without them.
//
// Wire shapes mirror the future protocol (NOMAD-PLAN.md) so step 4 is a
// transport swap, not a rewrite:
//   in  : { v:0, t:"cmd", text }              (becomes kind 24911)
//   out : { v:0, kind:24912, text }           personal view
//   out : { v:0, kind:24913, room, text }     public room feed
//   out : { v:0, t:"status", ... }            client UI helper, not protocol
//   out : { v:0, t:"ctx", suggest }           client UI helper, not protocol
import type { Env } from "./env";
import {
  loadWorld,
  getOrCreatePlayer,
  type PlayerRow,
  recordKill,
  recordBossAssist,
  recordLeaderboard,
  recordDeath,
  savePlayer,
  loadInventory,
  loadContainer,
  setEquipped,
  setItemCondition,
  insertLoot,
  removeItemRow,
  clearCarriedInventory,
  voidMint,
  deedsBump,
  setItemJournalId,
  journalBumpKill, journalTraitAdd, journalLoad,
  type World,
  type MobTemplate,
  type ItemTemplate,
  type CarriedItem,
  type Cache,
  type Region,
  trait,
  hasTrait,
  parseTraits,
  loadLeaderboard,
} from "./world";
import { parse, HELP_TEXT, type Command } from "./parser";
import { randInt, chance, uuid, pick } from "./rng";
import { cap, dirPhrase, nameMatches, parseOrdinal, rollGearCondition, shortName, isNight, isFullMoon, moonPhase, nightHuntMult, eclipsePhase, isBloodMoon } from "./zone-util";
import type { Stance, Session, Creature, Regrow, Trace, RotEntry, GroundInstance, SimState, EventState } from "./zone-types";
import { isGameKeyConfigured, signLootEvent, signSheetEvent, signFeedEvent, signScoreEvent, gamePubkey } from "./signing";
import { publishEvent, publishScore, relayList } from "./relay";
import * as gate from "./gate";
import * as ai from "./ai";
import * as simstore from "./simstore";
import * as light from "./light";
import * as lore from "./lore";
import * as chips from "./chips";
import * as events from "./events";
import * as verbs from "./verbs";
import * as pvp from "./pvp";
import * as trade from "./trade";
import * as den from "./den";
import * as dice from "./dice";
import * as works from "./works";
import type { WorksPlan } from "./works";
import { MAP_QUARTERS, QUARTER_AMBIENCE, QUARTER_DARK, DOOR_ARC_LINES, DOOR_BOARD_TOP, SIGNPOSTS, WAYSTONES, waystoneLine, wayFar } from "./detail";
import {
  TICK_MS, TICK_SIM_FLUSH_MS, TICK_SLOW_LOG_MS, IDLE_TICK_MS, HOT_WINDOW_MS, IDLE_TIMEOUT_MS, COMBAT_ROUND_MS, PLAYER_DMG_MIN, PLAYER_DMG_MAX, CRIT_CHANCE, FUMBLE_CHANCE, 
  GROUND_ROOTED,
  WEAPON_WEAR, ARMOR_WEAR, SEALED_WEAR_MULT, GEAR_WORN_AT, GEAR_FAILING_AT, ARMOR_K, RUST_PER_TICK, FLOOR_RUST_PER_HOUR, FLOOR_RUST_STEP_MS, materialDamp, MATERIAL_STONE, MATERIAL_BONE, MATERIAL_WOOD, MATERIAL_HIDE, MATERIAL_CLOTH, WOUNDED_FRACTION, WOUNDED_DMG_MULT,
  WOUNDED_FUMBLE_BONUS, WOUNDED_DROP_ODDS, AUTO_EAT_FRACTION, AMBUSH_MULT, THROW_DMG_MIN, THROW_DMG_MAX,
  THROW_COOLDOWN_MS, THROW_SHATTER, THROW_SHATTER_HOLLOW, THROW_TOUGH, WEAPON_WEAR_HOLLOW, DODGE_MAX, DODGE_ZERO_AT, POISE_PER_WEIGHT, POISE_CAP, BURDEN_FREE_IRON,
  STANCE, RECKLESS_MISS, SHIELD_DRAG_FREE, SHIELD_DRAG_PER_BLOCK, GUARDED_BLOCK_BONUS, GUARDED_WOUND_ODDS, STAGGER_BONUS, PACK_CAP, PACK_FOOD_CAP, PADDED_STUN_MULT, WARDHIDE_WOUND_ODDS, BLEED_ODDS,
  TRIP_ODDS, TRIP_HOLD_MS, POCKETED_BONUS,
  HOBBLE_ODDS, HOBBLE_FLEE_MS, VITALS_PVE, VITALS_ARMOR_FULL, VITALS_THREATS,
  VITALS_HOUND, VITALS_KILLS, VITALS_KICKER, VITALS_DARK,
  SLICK_SEIZE_MULT, SLICK_BREAK_BONUS, CORRODERS, CORRODE_WEAR,
  CACHE_EMPTY_ODDS, ROCK_SMASH_ODDS, HAMMERSTONE_SMASH_ODDS,
  HAMMERSTONE_HAUNTS, STONE_GROUND_CAP, STONE_ROLL_MIN_MS, STONE_ROLL_MAX_MS, STONE_MINT_ODDS, STONE_WEAR,
  BRAND_ITEM, BRAND_HAUNTS, BRAND_GROUND_CAP, BRAND_ROLL_MIN_MS, BRAND_ROLL_MAX_MS, BRAND_MINT_ODDS,
  GEAR_ROLL_MIN_MS, GEAR_ROLL_MAX_MS, GEAR_REGROW_ODDS, RELIABLE_GEAR, DICE_REGROW, STRAY_DECAY,
  MAP_ITEMS, JOURNAL_ITEM, RATE_CAPACITY, RATE_REFILL_PER_SEC, REST_REGEN_PER_TICK, FIRE_REST_REGEN_PER_TICK, COLD_REST_SKIP, WIND_HEED_MULT, WIND_CHILL_REST_SKIP, FEVER_MEND_MULT, MOB_BLOODTHIRSTY_FLEE_MULT, MOB_BUTTERFINGERS_MULT, MOB_WEAKGRIP_MULT, MOB_SKITTISH_FLEE_MULT, MOB_MARKED_FLEE_MULT, MOB_KEEPS_DROP_MULT, MOB_SHADOW_DMG_MULT, MOB_PATIENT_MULT, MOB_UNDERTOW_MULT, RUT_NOISE_MASK, FLUSH_INTERVAL_MS, SIM_STEP_MS, CATCHUP_CAP_MS,
  FOOD_LOCKBOX_STACK, FLOOR_ITEMS_BRIEF,
  CREATURE_HEAL_PER_MIN, HUNGER_PER_MIN, HUNGER_MAX, HUNGRY_AT, WANDER_MIN_MS, WANDER_MAX_MS, 
  FLEE_BELOW, FLEE_CHANCE, COMBAT_NOISE_EVERY_MS, NOISE_HEED_ODDS, DOGPILE_CAP, CROWD_CAP, LINKDEAD_MS, RAIN_NOISE_MASK,
  ARMOR_SLOTS, BLEED_TICKS, BLEED_STACK_CAP, BLEED_KILL_ODDS, BANDAGE_FRACTION, TRACE_LIFE_MS, TRACE_CAP, CARVE_CAP, ROT_MS,
  HOLLOW, GRAVE_FLESH, THIEVES, RUNNERS, BROODERS, SENTINELS, AGGRESSIVE, HOUND_WAKE_MS, HOUND_HEADS,
  BLOOD_MOON_EYES_ROOM, BLOOD_MOON_EYES_DARK,
  SNOW_TRACE_LIFE_MULT, SNOW_NOISE_MULT,
  MOON_DOOR_KEY, TIDE_DOOR_KEY, RIDDLE_DOOR_KEY, MOON_DOOR_OPEN, MOON_DOOR_SHUT, TIDE_DOOR_OPEN, TIDE_DOOR_SHUT, TIDE_DOOR_SILT, DOOR_PRIZE_BOXES,
  BELL_DOOR_KEY, BELL_DOOR_SHUT, BELL_DOOR_TREMBLE, BELL_DOOR_OPEN,
  TIDE_SILT_COURSES, TIDE_PRY_MS, TIDE_DIGGING_TOOLS, tideSiltLine, TIDE_PRY_WET, TIDE_PRY_SETTLE, TIDE_PRY_TOOL_HINT, TIDE_PRY_MAKING, TIDE_PRY_OPEN,
  HABIT_ODDS, HABIT_COOLDOWN_MS, HABITS, HABIT_NIGHT, HABIT_FIRE, HABIT_DEEP, HABIT_GRAVES, QUIRK_ODDS, QUIRK_COOLDOWN_MS, TREASURE_QUIRKS,
  WAKE_NOISE, RARITY_RANK,
  HOARDERS, HOARD_CARRY_CAP, HOARD_KEEP,
  SCAVENGERS, VERMIN, DIRE_ROUSE_MS, STARVE_HUNTS_ODDS, WOUNDED_PREY_ODDS, THIEF_ROB_ODDS, MOON_THIEF_MULT, THIEF_LIFT_ODDS, THIEF_LIFT_DEFAULT, BOLD_DMG_MULT, DROWNERS, SEIZE_ODDS, SEIZE_BREAK_ODDS, SEIZE_DMG_MULT, SEIZE_DROWN_ODDS, SEIZE_DROWN_FRACTION, LURKERS, ROOTED, FIREKEEPERS, PACK_CALLERS, MOON_HOWL_ODDS, MOON_NIGHTS, WATCH_CALLS, CANTOR_CUT_LINES, REVENANTS,
  CHAINMAN_TMPL, CHAINMAN_ROLL_MIN_MS, CHAINMAN_ROLL_MAX_MS, CHAINMAN_ODDS, CHAINMAN_STAY_MIN_MS, CHAINMAN_STAY_MAX_MS, CHAINMAN_LEAVES,
  BAD_TRAIT_POOL, BAD_TRAIT_SHARE, SECOND_TRAIT_ODDS, TEMPERED_WEAR_MULT, BRITTLE_WEAR_MULT, GREASED_RUST_MULT, PITTED_RUST_MULT, FLEECED_COLD_MULT, SODDEN_COLD_MULT,
  REVIVE_FRAC, RISE_LIMIT, PLAYER_HIT, WEAPON_VERBS, PIERCE_TELL, PIERCE_TELL_FLESH, BLUNT_TELL, BLUNT_TELL_BONE, BLEED_TELL, BONE_DRY_TELL, CRIT_FLOURISH, CREATURE_HIT, CREATURE_VITALS, BITERS, BEAKS, COILS, SMALL_BITE, MOB_HIT, MOB_VITALS,
  BLUNT_ARMOR_IGNORE, STAGGER_WINDOW_MS, STAGGER_STUN_BONUS, STAGGER_ARMOR_BONUS, STAGGER_CLEAVE_DMG_BONUS, STAGGER_EDGE_TELL,
  REGION_LABELS, NIGHT_LIT,
  DEEP_ROOMS, WARRENS_ROOMS, AMBIENCE, ROOM_AMBIENCE, MOTES, MOTES_ODDS, AMBIENT_COOLDOWN_MS, AMBIENT_ODDS, RECONNECT_GRACE_MS, SEAMLESS_RECONNECT_MS,
  GATEHOUSE_AMBIENT_COOLDOWN_MS, GATEHOUSE_AMBIENT_ODDS, KEEPER_DELAY_MIN_MS, KEEPER_DELAY_MAX_MS,
  DEEP_HEART, DEEP_DOOR_KEY, SURFACE_INTERVAL_MS, HEART_ROT_SEC, ALTAR_ROOMS,
  SIM_RADIUS, SLOW_ECOLOGY_MS, ESCAPE_TMPL,
  LB_GENRES, LB_BOSS_PTS, LB_PVP_PTS,
  TRAIT_POOL, TRAIT_ROLL_ODDS, KEEN_BARE_BLEED_ODDS, WEAPON_CLASS_TRAIT, TRAIT_MATERIAL, materialOf, traitAdj, traitTell, playerBleedOdds,
  POSES, GUARD_SPOIL_ODDS, GUARD_SPOIL,
  SPAWN_QUARTERS, DARK_ROOMS, OUTDOOR_ROOMS, OUTDOOR_REGIONS, INDOOR_ROOMS, FORAGE_ROOMS, FORAGE_REGIONS, FORTRESS_BANDS, SURFACE_BANDS, MOUNTAIN_HEARD_BANDS, DARK_TOUCH, PATROLS, SPAWN_REGIONS, CURE_RECIPES, COOK_RECIPES, SMOKEHOUSE_ROOM, FOOD_KEEPS, SCRAP_ID, SMELT_SCRAP_PER_IRON,
  SMOKE_TORCH_ROLL_MIN_MS, SMOKE_TORCH_ROLL_MAX_MS, SMOKE_TORCH_MINT_ODDS, SMOKE_TORCH_GROUND_CAP,
  CARRION_ROLL_MIN_MS, CARRION_ROLL_MAX_MS, CARRION_MINT_ODDS, CORPSE_TRACES,
  LANTERN_ITEM, TORCH_ITEM, PACK_TORCH_CAP, PACK_DRESSING_CAP,
  FEED_KILL, FEED_VITAL, FEED_STUN, FEED_BLEED, FEED_HOBBLE, FEED_PVP_KILL, FEED_PVP_VITAL, FEED_REST_CAUGHT,
  MARKERS, MARK_MS, MARK_HEED_MULT, MARK_CALL_ODDS, SWEEPERS,
  FERRY_DRAG_ROOM, FERRY_DRAG_ODDS, FERRY_DRAG_MAX, CROWS, CROW_ROUSE_RADIUS, CROW_CALL_ODDS, RAVEN_NEST_ROOMS, RAVEN_SCOOPERS,
  groundWord, carveMedium, REST_TRACE, throwLand, metalFall,
} from "./zone-data";

export class ZoneDO implements DurableObject {
  public world: World | null = null;
  public sessions = new Map<string, Session>(); // pubkey -> session
  // WHO LIVES WHERE (mig 162). Room id -> the hold on it. Loaded whole at world
  // load and written through to D1 on every change — six rows today, a few
  // hundred at the arc's full size, and every read of it is a room lookup.
  public dens = new Map<string, den.Den>();
  // Who has spilled blood under which roof, and is barred from it for good
  // (mig 171). Outlives the hold that was standing at the time, so it is kept
  // apart from `dens` and never cleared by a lapse or an abandon.
  public denBlood = new Map<string, Set<string>>();
  // Who has stepped through a den's door: pubkey -> the HOLDER of the den they
  // are inside (the room is their session's room). The street outside stays
  // public; a BARRED door is what actually puts you out of the world's reach
  // (mig 172). Persisted, so a dropped socket does not put you out in the open.
  public inDen = new Map<string, string>();
  // Per-room throttle on the rut's roaring, so a ride with three stags in it
  // does not shout three times a beat. Ephemeral — a restart just starts quiet.
  public rutRoarAt = new Map<string, number>();
  // The last time the keeper acknowledged the door. One room, one gesture at a
  // time — ephemeral, so a restart just means the next arrival gets his eye.
  public keeperNodAt = 0;
  // Open player-to-player trades (trade.ts) — dealId -> Deal. In-memory only,
  // same as `buying`: a DO wake never restores one, and it needs no D1 row of
  // its own (settlement is the only part that touches D1, and it's atomic).
  public deals = new Map<string, trade.Deal>();
  // player_items rowIds a settlement (trade.ts) currently has mid-flight to a
  // new owner — the DEATH cleanup below (clearCarriedInventory) must not
  // sweep these out from under the pending UPDATE. Set right before that
  // await, cleared right after, always in trade.ts's settleDeal.
  public tradeLocked = new Set<string>();
  // cacheId -> ms an unlock on it is mid-flight (cmdUnlock's double-frame
  // guard, 2026-08-20): two fast `unlock` frames could otherwise both roll
  // the box's loot — one key AND a rock spent, two payouts from one chest.
  // Timestamps rather than a bare set so a frame killed mid-flight by a
  // thrown error can never leave the latch blocked forever.
  private cacheOpening = new Map<string, number>();
  private leftAt = new Map<string, number>(); // pubkey -> ms it last disconnected (a quick return is a reconnect, not an arrival)
  // The alarm's own memory (ensureAlarm, 2026-08-22): what this DO last armed,
  // so a per-message getAlarm read is skipped while it is still pending. Both
  // zero after a wake — the first call falls through to the storage read once.
  private alarmArmedAt = 0;
  private alarmArmedHot = false;
  public creatures = new Map<string, Creature>();
  public ground = new Map<string, string[]>(); // roomId -> item template ids
  // Items on the floor that carry per-instance state a bare template id can't:
  // a dropped journal keeps the id its pages are keyed to, so whoever picks it
  // up inherits the logs. Everything else stays in the plain `ground` above.
  public groundInstances = new Map<string, GroundInstance[]>(); // public: chips.ts reads the floor for `get` chips
  public regrow: Regrow[] = [];
  // WHERE THE WANDERING ROCKS ARE RIGHT NOW. The fortress's non-gate rocks have
  // no fixed home any more (rome, 2026-08-09: the fortress rocks all sat at the
  // gates, and should turn up at random instead) — each one turns up somewhere else in the ruin every
  // time it renews, so its whereabouts is live state rather than a spawn row.
  // WHERE A WANDERED THING IS LYING RIGHT NOW, as "itemId@roomId". It has no
  // spawn row where it lies, so without this the stray-decay sweep would take it
  // for litter somebody dropped and crumble it away — the world would hand you a
  // torch and then rot its own copy. Was `roamRocks`, a bare room list, when the
  // rock was the only thing in the game that moved.
  public roamedGround: string[] = [];
  private lastCombatRound = 0; // ms of the last tick blows actually landed (see COMBAT_ROUND_MS)
  private blowsThisTick = new Map<string, number>(); // pubkey -> blows landed on them this tick (DOGPILE_CAP), across swings AND entry first-strikes
  public arrivals = new Map<string, number>();
  public openDoors = new Set<string>();
  public doorCloseAt = new Map<string, number>(); // "roomId:dir" -> ms epoch the iron remembers its shape (the deep door's timer)
  // "itemId@roomId" -> ms it hit the floor. Fresh-fallen gear is safe from
  // scavengers a while (ai.scavengerScoops reads this): the kill site is hot,
  // and whoever dropped it is likely coming back. Transient by design — a
  // deploy forgetting a 90s grace costs nothing.
  public groundFreshAt = new Map<string, number>();
  // itemId -> ms the keeper restocks it. A bare shelf is a bare shelf for
  // everyone (gate.ts owns the churn); survives hibernation.
  public fenceOut = new Map<string, number>();
  // The keeper's bounty board: [trophyId, foodId, count?] currently posted.
  // Rotates like the fence; survives hibernation (gate.ts owns the churn).
  public bounties: [string, string, number?][] = [];
  public nextBountyChurnAt = 0;
  // The hatch's shelf-rotation clock (gate.tickFence). Lived at module scope
  // until 2026-08-20, which reset it on every isolate/eviction — the shelf
  // could sit unrotated forever. Persisted with the rest of the sim meta now.
  public nextFenceChurnAt = 0;
  // THE BONES (dice.ts). Games in flight are EPHEMERAL — nothing leaves a pack
  // until the last bone is down, so a wake mid-game costs nobody a trophy. The
  // keeper's bowl is not: it is the house's winnings and it belongs to the world.
  public diceGames = new Map<string, dice.DiceGame>();
  public keeperBowl: string[] = [];
  // Who has already collected on which posting. A bounty is one meal PER
  // WANDERER, not one meal in the world — the posting stays up for everybody
  // else until the board churns, and the churn wipes this clean.
  public bountyTaken = new Map<string, Set<string>>();
  public bloodOn = new Map<string, number[]>(); // pubkey -> pvp-kill times; the evidence walks around on the murderer (pvp.ts)
  // ms the world next mints a hammerstone into a random haunt (corpse-key
  // pattern — no farmable spot). 0 = schedule on first tick.
  private nextStoneAt = 0;
  private nextBrandAt = 0;
  private nextSmokeTorchAt = 0; // the world next rolls a plain torch into the smokehouse (dice, capped — a find, not a refill)
  private nextCarrionAt = 0; // the world next rolls a carcass into a random deep room (dice — feeds the pale hunters, one body at a time)
  // THE GATEHOUSE CLOSES FOR WORKS (works.ts). `works` is gate roomId -> ms its
  // door reopens; the gate ROOM stays open and walkable throughout. The plan is
  // measured off the live map at init and deliberately NOT persisted — a map
  // that grew must be re-read, never remembered.
  public works = new Map<string, number>();
  public nextWorksAt = 0;
  private nextChainmanAt = 0; // the world next rolls whether the chainman turns up (0 = schedule on first tick)
  public worksPlan: WorksPlan | null = null;
  public traces = new Map<string, Trace[]>();
  public rot: RotEntry[] = [];
  private placedSpawns = new Set<string>(); // ground spawns already laid once
  private seededDens = new Set<string>(); // mob_spawn ids already populated once — new dens fill on the load that adds them, not on the migration clock
  public groundCond = new Map<string, number>(); // "itemId@roomId" -> condition of gear on the floor, so wear survives a drop/pickup
  public groundTorch = new Map<string, number>(); // roomId -> ms epoch a torch dropped/fallen onto the floor keeps burning until; while now < it the room is lit for EVERYONE in it, and it's an open flame (fire-fear flees, lurkers can't spring). Burns its remaining life down, then guts out.
  public groundLore = new Map<string, string>(); // "itemId@roomId" -> the engraving on floor gear, so the mark survives the stones (077)
  public groundRolled = new Map<string, string>(); // "itemId@roomId" -> what this copy rolled (099), so a lottery trait survives a drop/pickup like the engraving does
  public groundHeart = new Map<string, number>(); // "itemId@roomId" -> a dropped heart's cut-time: the stones don't make it fresh again
  // Who is INSIDE. A session is rebuilt from nothing on every connect, so without
  // this a dropped socket threw you out the gatehouse door and into the dungeon —
  // the one place the room is supposed to protect you from. You left the world by
  // walking through a door; only walking back through it puts you outside again.
  public inGatehouse = new Set<string>();
  // The wall chart: the players' own map of the shallow ring, carved one walk at
  // a time. Server-verified testimony, never freehand — a room goes on the wall
  // only when someone who actually stood in it sets it down (see gate.wallCarve),
  // so the wall cannot lie. It also cannot reach the deep: that stays the paid
  // map's territory, forever. That fence is gone (2026-08-11): the wall takes
  // any room somebody walked and came back from — gate.wallGround.
  // ONE WALL, MANY HANDS, AND NOBODY READS ANOTHER'S (rome, 2026-08-11: tie it
  // to the npub so everyone draws their own instead of getting it free).
  // Keyed by pubkey: your chalk, your chart. The plaster is communal furniture;
  // what is written on it is not.
  public wallMarks = new Map<string, Set<string>>();
  public snowUntil = 0; // ms the mountain's snow lasts to — the season, persisted like the walk
  public riddleWrong = new Map<string, number>(); // the riddle door's patience, keyed "room:dir|pubkey" — PER WANDERER, so one person's wrong guesses never hand the hint to everybody (not persisted; the door forgets when the world sleeps)
  // THE TIDE DOOR'S SILL. The door's own state, witnessed by everyone: courses
  // of silt left, the beat between pries (per wanderer, so a crew digs faster
  // than a lone hand — the door is one door, but the work is the work), and
  // who has already been told a pick digs two courses where hands dig one.
  // Not persisted: a sleeping world wakes with the sea's latest burial.
  public tideSilt = TIDE_SILT_COURSES;
  public tidePryAt = new Map<string, number>();
  public tideToolHint = new Set<string>();
  // RINGING (the depth audit, 2026-08-29): the bells share one cooldown, the
  // world's ear settling between rings. Not persisted — silence is the
  // default a sleeping world wakes to.
  public ringAt = 0;
  public walked = new Map<string, Set<string>>();   // rooms each player has crossed — the wall's evidence (walkedOf)
  private wallLoaded = new Set<string>();          // pubkeys whose marks have been read up out of D1 this wake
  // The gatehouse board, oldest first. The only place a player's words outlive
  // the session they were said in (zone-data BOARD_*).
  public board: { name: string; words: string; at: number }[] = [];
  // The road's own record, and a different thing from the wall: the wall holds
  // HALLS, this holds PEOPLE. Milestone roomId -> names cut into it, oldest
  // first (see MILESTONES; lore.milestoneCarve writes it).
  public stoneNames = new Map<string, { name: string; at: number }[]>();
  private cacheSpent = new Map<string, number>(); // cacheId -> ms it re-locks/refills
  private sim = simstore.newCache(); // what the sim rows last held, so persist() only writes the dirt (simstore.ts)
  private lastTickFlushAt = 0; // ms of the last TICK-driven sim flush; the tick batches its writes to TICK_SIM_FLUSH_MS (command saves stay immediate)
  private lastTickAt = 0; // ms of the previous tick — per-tick appetite/heal increments scale by the REAL gap (the beat runs slow when idle), not the nominal TICK_MS
  private lastNightPhase: boolean | undefined; // the day/night world-clock's phase as of the last tick — undefined until first observed, so a cold wake never fires a false transition line
  private lastCommandAt = 0; // ms of the last player frame or connect — the world beats at TICK_MS while it's fresh (HOT_WINDOW_MS), stretches to IDLE_TICK_MS when quiet (see worldIsHot)
  private cacheRoom = new Map<string, string>(); // cacheId -> its CURRENT room; roaming chests relocate on refill
  private nextSurfaceAt = 0; // ms epoch the deep next coughs a dweller up (only while the deep door is sealed)
  public events = new Map<string, EventState>(); // room events mid-arc (events.ts owns the arcs; the spine just keeps the clock)
  public fishStock = new Map<string, { left: number; at: number }>(); // per-water catch budget (verbs.cmdFish spends it; rain refreshes the surface)
  public nests = new Map<string, string[]>(); // corvid nests: nest roomId -> gear the raven carried home (ABSTRACT, off the floor — the only way in is feeding the bird)
  private savedAt = 0;
  private lastFlushAt = 0; // last time live sessions' hp/room were flushed to D1 (restart-durability)

  constructor(
    private state: DurableObjectState,
    public env: Env,
  ) {}

  // You wake at a random SPAWN, so no death sends you back to a route you
  // already know cold. Spawns are not the same thing as gates any more (mig
  // 126): a gatehouse far out on a road is somewhere to bank, not somewhere the
  // world hands you a fresh wanderer. Falls back to the canonical gate.
  private randomGate(): string {
    const world = this.world;
    if (!world) return "gate";
    // Two kinds of spawn now. A marked ROOM (the fortress's thresholds) is one
    // slot. A whole spawn REGION is also one slot, and resolves to a random room
    // anywhere in it — the road hatches you out on the road, not on its
    // doorstep (rome, 2026-08-02). Counting a region as ONE slot rather than one
    // per room is what stops the road's thirty rooms from swamping the four
    // fortress gates.
    const slots: string[] = [...world.spawnRooms, ...[...SPAWN_REGIONS].map((r) => `@${r}`)];
    const pick = slots[randInt(0, slots.length - 1)] ?? world.entryRoom;
    if (!pick.startsWith("@")) return pick;
    const band = pick.slice(1);
    // Never in a hideaway, and never at a gate (regionOf calls a gate "gate", so
    // gates fall out of the band automatically).
    // ...and inside a band, only the quarters a fresh wanderer can survive
    // waking in (SPAWN_QUARTERS): the crossing's two shores rather than its
    // tideway, the mountain's foot rather than its bone fan. Bands with no
    // entry there open whole, which is what the road has always done.
    const allow = SPAWN_QUARTERS[band];
    const pool = [...world.rooms.keys()].filter((r) => this.regionOf(r) === band
      && !world.safeRooms.has(r)
      && (!allow || allow.has(MAP_QUARTERS[r] ?? "")));
    return pool[randInt(0, pool.length - 1)] ?? world.entryRoom;
  }

  // All-pairs room distances (BFS over exits, ~49 rooms — trivial), and the
  // variant→base bloodline map. Both built once at init; territory, the dark
  // mouths, and family-cap counting all lean on them.
  private roomDists = new Map<string, Map<string, number>>();
  public variantBase = new Map<string, string>();
  // The canonical map grid, laid out once from the whole world graph so two
  // disconnected islands on somebody's chart still sit where they really are
  // relative to each other (lore.worldGrid). Static world, so never invalidated.
  public mapGrid: import("./lore").WorldGrid | null = null;

  // THE DISTANCE CACHE (2026-08-01). This used to precompute ALL-PAIRS shortest
  // paths at init — a BFS from every room, every distance kept forever. At 110
  // rooms that's 12k entries and 0.4 MB, invisible. It is O(N²), and the world
  // is about to grow: measured on this exact exit density, 1,110 rooms costs
  // 60.8 MB and a 319 ms cold-start build. A Durable Object gets 128 MB TOTAL,
  // so nearly half the budget would have gone to a lookup table before a single
  // creature, session or item existed — and an OOM here kills the whole zone
  // with everyone in it.
  //
  // Now nothing is precomputed. Distance maps are built on demand and kept in
  // an LRU, because the ROOMS THAT GET ASKED ABOUT are a tiny, repeating set:
  // dens, watering holes, the dark mouths. A handful of hot anchors serve
  // essentially every query, and the cost stops scaling with map size.
  //
  // Kept deliberately behind the SAME roomDist(a, b) signature: all 16 call
  // sites are untouched and get identical answers. A capped-radius version was
  // considered and REJECTED — five of those sites ask short questions ("within
  // TERRITORY_RADIUS?"), but three need true distance across the whole map: a
  // migrant walking home from a far mouth, a hyena pathing to water, and the
  // mouth-choosing itself. Capping those would have quietly broken migration
  // and watering — invisible in review, obvious after a week of play.
  private static readonly DIST_CACHE_MAX = 64; // × N entries; 64 × 1,110 ≈ 3.5 MB
  private exitsSymmetric = true;

  /** From any room: one step toward the nearest door, and how far that door is.
   *  Rebuilt with the world, so a migration can never strand a stale arm. */
  public wayHome: Map<string, lore.WayHome> = new Map();

  private buildWorldMaps(world: World): void {
    this.wayHome = lore.buildWayHome(world);
    this.roomDists.clear();
    // The reverse-lookup trick below (answering roomDist(a,b) from a cached map
    // built at b) is only valid while every exit has a matching return exit.
    // All 258 exits are two-way today, but a one-way drop you can't climb back
    // up would silently make distances asymmetric and mis-route every creature
    // that walks home. Detect it once here and fall back to strict forward
    // lookups instead of quietly returning wrong numbers.
    this.exitsSymmetric = true;
    outer: for (const [from, exits] of world.exits) {
      for (const e of exits) {
        const back = world.exits.get(e.to_room);
        if (!back || !back.some((r) => r.to_room === from)) { this.exitsSymmetric = false; break outer; }
      }
    }
    for (const v of world.mobVariants) this.variantBase.set(v.variantId, v.baseId);
  }

  // Every room within maxDepth steps, and no further. For the "is this near?"
  // questions — the sim bubble, crowding — where walking the whole map to throw
  // away all but a dozen rooms is pure waste.
  public nearby(src: string, maxDepth: number): Map<string, number> {
    const world = this.world!;
    const dist = new Map<string, number>([[src, 0]]);
    const queue = [src];
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head];
      const d = dist.get(at)!;
      if (d >= maxDepth) continue; // frontier reached; don't expand past it
      for (const e of world.exits.get(at) ?? []) {
        if (dist.has(e.to_room)) continue;
        dist.set(e.to_room, d + 1);
        queue.push(e.to_room);
      }
    }
    return dist;
  }

  // Full distances from one room, built once and kept while it stays hot.
  private distsFrom(src: string): Map<string, number> {
    const hit = this.roomDists.get(src);
    if (hit) { this.roomDists.delete(src); this.roomDists.set(src, hit); return hit; } // touch: Map keeps insertion order, so re-inserting makes this the newest
    const world = this.world!;
    const dist = new Map<string, number>([[src, 0]]);
    const queue = [src];
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head];
      const d = dist.get(at)!;
      for (const e of world.exits.get(at) ?? []) {
        if (dist.has(e.to_room)) continue;
        dist.set(e.to_room, d + 1);
        queue.push(e.to_room);
      }
    }
    this.roomDists.set(src, dist);
    if (this.roomDists.size > ZoneDO.DIST_CACHE_MAX) {
      const coldest = this.roomDists.keys().next().value; // oldest insertion = least recently used
      if (coldest !== undefined) this.roomDists.delete(coldest);
    }
    return dist;
  }

  // "Is b within max steps of a?" — the shape of most distance questions here,
  // and the ONLY shape of the hottest one (every wandering creature checking its
  // territory, every beat). Answering these through full-map distances is what
  // made the cache thrash: hundreds of dens, each wanting its own map, none of
  // them reused. A capped walk touches ~30 rooms and needs no cache at all.
  public withinRadius(a: string, b: string, max: number): boolean {
    if (a === b) return true;
    return this.nearby(a, max).has(b);
  }

  public roomDist(a: string, b: string): number {
    const from = this.roomDists.get(a);
    if (from) return from.get(b) ?? Number.POSITIVE_INFINITY;
    if (this.exitsSymmetric) {
      const to = this.roomDists.get(b);
      if (to) return to.get(a) ?? Number.POSITIVE_INFINITY; // dist is symmetric while every exit has a return
    }
    // Neither cached. Build from the TARGET when we're allowed to: the call
    // sites vary the source and hold the target still ("every exit from here —
    // which gets me closer to the den?"), so caching on b turns a per-exit
    // rebuild into one build and N hits. Asymmetric worlds must build from a.
    return this.exitsSymmetric
      ? (this.distsFrom(b).get(a) ?? Number.POSITIVE_INFINITY)
      : (this.distsFrom(a).get(b) ?? Number.POSITIVE_INFINITY);
  }

  // THE BUBBLE: the set of rooms within SIM_RADIUS of anyone's boots — the only
  // rooms where the full per-beat simulation runs. Every session projects one
  // (gatehouse-sitters keep the gate's surroundings warm for the moment they
  // step out; a linkdead body is still a body, and what's chewing it must keep
  // chewing). Rebuilt each tick from the precomputed all-pairs distances, so
  // it's a handful of map reads. Returns null when SIM_RADIUS is Infinity —
  // the old whole-world tick, and the rollback switch.
  // ms of the last slow-world advance (not persisted: a restart skips one slow beat, harmless)
  private lastEcologyAt = 0;
  // ms of the last floor-rust charge. Not persisted either, and it doesn't need
  // to be: catchUp seeds it from savedAt and walks it to now, so the gap a
  // restart leaves is charged there rather than lost.
  private lastFloorRustAt = 0;
  private liveRooms(): Set<string> | null {
    if (!Number.isFinite(SIM_RADIUS)) return null;
    const live = new Set<string>();
    for (const s of this.sessions.values()) {
      if (!this.world?.rooms.has(s.roomId)) { live.add(s.roomId); continue; }
      // A bounded walk, not a scan of every distance from here: this runs every
      // tick for every session, and the old form read the whole map (all 1,110
      // rooms at the target size) just to keep the dozen within SIM_RADIUS.
      for (const rid of this.nearby(s.roomId, SIM_RADIUS).keys()) live.add(rid);
    }
    return live;
  }



  private async init(zone: string): Promise<World> {
    if (this.world) return this.world;
    const world = await loadWorld(this.env.DB, zone);
    this.world = world;
    this.dens = await den.loadDens(this);
    this.denBlood = await den.loadDenBlood(this);
    this.buildWorldMaps(world);
    // LURKERS THAT PREDATE THEIR OWN LAW. `hidden` is stamped at CREATION, so a
    // creature that joined LURKERS in a migration stays visible for the rest of
    // its life — and a ROOTED one never wanders off or gets replaced, so the
    // root-things already standing in the wood would have stayed plainly in the
    // room forever (rome, 2026-08-08: "A root-thing is here, restless with
    // hunger" — it should not have been there to read). One sweep at load
    // brings the standing population under the current law. Never touches one
    // mid-fight: a lurker that has struck is unseen no longer, and re-hiding it
    // in front of the person it is biting would be a ghost, not an ambush.
    for (const c of this.creatures.values()) {
      if (LURKERS.has(c.templateId) && !c.target && c.hidden === undefined) c.hidden = true;
    }

    // MEASURE THE MAP FOR THE WORKS. One BFS per gate over the graph as it is
    // right now, so which door is worth shutting is re-derived every load and a
    // map that grew is never judged on yesterday's distances (works.ts).
    this.worksPlan = works.planWorks(world);
    // WHAT COUNTS AS OUTDOORS, assembled rather than hardcoded (2026-08-01).
    // Rain, fog, cold, crows, the night dark and the night hunt multiplier all
    // ask OUTDOOR_ROOMS, which was a static set of the fortress's 20 grounds and
    // overworks ids. A road that never gets rained on and never gets dark isn't
    // a road. New bands declare themselves outdoors as a REGION (see
    // OUTDOOR_REGIONS) and their rooms are folded in here, once, at world load.
    // It stays a Set of ids on purpose — one caller iterates it to walk every
    // outdoor room, so a predicate wouldn't do. Idempotent: a re-init re-adds
    // the same ids. A room that is outdoors DESPITE its band (or indoors within
    // one) is a per-room exception and still belongs in the static sets.
    for (const room of world.rooms.values()) {
      // ...minus the rooms inside those bands that have a ROOF (INDOOR_ROOMS).
      // The dens are the first outdoor band that is partly buildings, and rain
      // falling on someone sitting in a mill with the door shut is simply wrong.
      // Same fix reaches back and covers the wood's two huts, which have been
      // rained on since it shipped.
      if (OUTDOOR_REGIONS.has(room.region) && !INDOOR_ROOMS.has(room.id)) OUTDOOR_ROOMS.add(room.id);
      // Same fold for the larder: a band that declares itself forage ground
      // (FORAGE_REGIONS) feeds the things that graze it. Without this the wood
      // was two hundred rooms of trees that a deer could starve in.
      if (FORAGE_REGIONS.has(room.region)) FORAGE_ROOMS.add(room.id);
    }
    // THE MATERIAL AUDIT. Gear decays by what it is made of now, and an id that
    // is misspelt in one of the MATERIAL_* sets fails silently in the worst
    // direction: the piece is simply absent from every set and defaults to
    // steel, so a bone crown quietly starts rusting like plate and nothing
    // anywhere says why. One pass at load, naming the ghosts.
    for (const set of [MATERIAL_STONE, MATERIAL_BONE, MATERIAL_WOOD, MATERIAL_HIDE, MATERIAL_CLOTH]) {
      for (const id of set) {
        const t = world.itemTemplates.get(id);
        if (!t || t.slot === "") console.log("MATERIAL: '" + id + "' is listed but is not a piece of gear");
      }
    }

    // The sim sleeps in rows now (simstore.ts — out of the one-blob 128KiB
    // ceiling). Rows first; a world with none falls back to the legacy blob
    // once, hydrates from it unchanged, and is written to rows at the end of
    // init (the blob deleted only after, so a crash between keeps the backup).
    simstore.ensureTable(this.state.storage);
    let saved = simstore.loadSim(this.state.storage, this.sim);
    let legacyBlob = false;
    if (!saved) {
      saved = (await this.state.storage.get<SimState>("sim")) ?? null;
      legacyBlob = !!saved;
    }
    if (saved) {
      // Coerce grudges from the old string[] shape (pubkey only) to the
      // timestamped form, starting the forget-clock now for any legacy memory.
      const loadNow = Date.now();
      this.creatures = new Map(saved.creatures.map((c) => [c.id, {
        ...c,
        target: null,
        grudges: ((c as any).grudges ?? []).map((g: any) =>
          typeof g === "string" ? { pk: g, at: loadNow } : g),
      }]));
      this.ground = new Map(Object.entries(saved.ground));
      this.groundInstances = new Map(Object.entries(saved.groundInstances ?? {}));
      this.regrow = saved.regrow;
      // The old save carried a bare room list, and every entry in it was a rock
      // by definition — that is the only thing that could wander. Key them and
      // the live world keeps every stone it has already moved.
      this.roamedGround = (saved.roamedGround as string[] | undefined)
        ?? ((saved.roamRocks as string[] | undefined) ?? []).map((r) => `loose-rock@${r}`);
      this.arrivals = new Map(Object.entries(saved.arrivals));
      this.openDoors = new Set(saved.openDoors);
      this.doorCloseAt = new Map(Object.entries(saved.doorCloseAt ?? {}));
      this.fenceOut = new Map(Object.entries(saved.fenceOut ?? {}));
      this.bounties = saved.bounties ?? [];
      this.nextBountyChurnAt = saved.nextBountyChurnAt ?? 0;
      this.nextFenceChurnAt = saved.nextFenceChurnAt ?? 0;
      this.keeperBowl = saved.keeperBowl ?? [];
      this.bountyTaken = new Map(Object.entries(saved.bountyTaken ?? {}).map(([k, v]) => [k, new Set(v)]));
      this.bloodOn = new Map(Object.entries(saved.bloodOn ?? {}));
      this.nextStoneAt = saved.nextStoneAt ?? 0;
      this.nextBrandAt = saved.nextBrandAt ?? 0;
      this.nextSmokeTorchAt = saved.nextSmokeTorchAt ?? 0;
      this.nextCarrionAt = saved.nextCarrionAt ?? 0;
      this.works = new Map(Object.entries(saved.works ?? {}));
      this.nextWorksAt = saved.nextWorksAt ?? 0;
      this.nextChainmanAt = saved.nextChainmanAt ?? 0;
      this.traces = new Map(Object.entries(saved.traces ?? {}));
      this.rot = saved.rot ?? [];
      this.placedSpawns = new Set(saved.placedSpawns ?? []);
      // A world saved before this existed has no list — treat every den it
      // already knows about as seeded, or the backfill below would re-fill
      // dens whose creature is legitimately dead and on the respawn clock.
      this.seededDens = new Set(saved.seededDens ?? (saved.creatures ?? []).map((c: any) => c.id));
      this.groundCond = new Map(Object.entries(saved.groundCond ?? {}));
      this.groundTorch = new Map(Object.entries(saved.groundTorch ?? {}));
      this.groundLore = new Map(Object.entries(saved.groundLore ?? {}));
      this.groundRolled = new Map(Object.entries(saved.groundRolled ?? {}));
      this.groundHeart = new Map(Object.entries(saved.groundHeart ?? {}));
      this.inGatehouse = new Set(saved.inGatehouse ?? []);
      this.inDen = new Map(saved.inDen ?? []);
      // Two shapes: the old communal ARRAY, and the per-pubkey record that
      // replaced it. A legacy array has no author recorded anywhere — there is
      // no way to say whose walking it was — and handing it to everybody is
      // exactly the free ride this change ends, so it is dropped. The rooms are
      // still out there; they get re-walked in a day.
      const savedWall = saved.wallMarks as unknown;
      this.wallMarks = new Map(
        savedWall && !Array.isArray(savedWall)
          ? Object.entries(savedWall as Record<string, string[]>).map(([pk, rooms]) => [pk, new Set(rooms)] as const)
          : [],      );
      this.walked = new Map(
        Object.entries(saved.walked ?? {}).map(([pk, rooms]) => [pk, new Set(rooms)] as const),
      );
      this.snowUntil = (saved.snowUntil as number) ?? 0;
      this.board = saved.board ?? [];
      this.stoneNames = new Map(Object.entries(saved.stoneNames ?? {}));
      this.cacheSpent = new Map(Object.entries(saved.cacheSpent ?? {}));
      this.cacheRoom = new Map(Object.entries(saved.cacheRoom ?? {}));
      this.nextSurfaceAt = saved.nextSurfaceAt ?? 0;
      this.events = new Map(Object.entries(saved.events ?? {}));
      this.fishStock = new Map(Object.entries(saved.fishStock ?? {}));
      this.nests = new Map(Object.entries(saved.nests ?? {}));
      this.savedAt = saved.savedAt;
      // Territory backfill: pre-territory saves carry no den. Tie each creature
      // to its bloodline's NEAREST den — which repatriates any deep-dweller
      // that drifted upstairs (it now walks home). Den-less stock (an evicted
      // variant, a nest pup) homes where it stands and lives out its days there.
      for (const c of this.creatures.values()) {
        if (c.home) continue;
        const line = this.variantBase.get(c.templateId) ?? c.templateId;
        let best: string | undefined;
        let bestD = Number.POSITIVE_INFINITY;
        for (const s of world.mobSpawns) {
          if (s.template_id !== c.templateId && s.template_id !== line) continue;
          const d = this.roomDist(c.roomId, s.room_id);
          if (d < bestD) { bestD = d; best = s.room_id; }
        }
        c.home = best ?? c.roomId;
        // Coerce the old one-rise boolean into the new rise counter.
        if ((c as any).risen && c.rises == null) { c.rises = 1; delete (c as any).risen; }
      }
      // Trim any bloodline the saved state overstocks (retired dens' creatures,
      // brood pups from an evicted nest) back to what the spawn table allows.
      const culled = ai.reconcilePopulation(this, world);
      // Content added since this world's first light (e.g. new gear in a
      // migration) gets laid down once: any ground spawn we've never placed and
      // that isn't already on its floor. Keeps a live world from needing a reset.
      let addedSpawn = culled > 0;
      for (const g of world.groundSpawns) {
        const key = `${g.item_id}@${g.room_id}`;
        if (this.placedSpawns.has(key)) continue;
        const floor = this.ground.get(g.room_id) ?? [];
        if (!floor.includes(g.item_id)) {
          this.ground.set(g.room_id, [...floor, g.item_id]);
          const newT = world.itemTemplates.get(g.item_id);
          // ...and gear arriving from a migration rolls on its way down, so a
          // shipment of new floor gear is not a shipment of plain gear.
          if (newT && newT.slot !== "") {
            const rolled = this.rollTraits(newT);
            if (rolled) this.groundRolled.set(`${g.item_id}@${g.room_id}`, rolled);
          }
          if (newT?.edible && !FOOD_KEEPS.has(g.item_id)) {
            this.rot.push({ itemId: g.item_id, roomId: g.room_id, at: Date.now() + ROT_MS });
          }
        }
        this.placedSpawns.add(key);
        addedSpawn = true;
      }
      // NEW DENS GET FILLED ONCE (2026-08-02). The line above does exactly this
      // for ground spawns — "content added since this world's first light gets
      // laid down once" — and nothing did it for MOB dens, so a migration that
      // adds a region left every den in it empty and waited on the migration
      // clock to trickle them in. That clock is per-TEMPLATE and holds one
      // pending arrival at a time (ai.scheduleArrivals), at respawn_secs ×
      // MIGRATION_FACTOR: the wood's 30 roe-deer dens would have filled at one
      // deer per ~50 minutes. A region shipped on Tuesday would still be
      // half-empty on Thursday. Found by walking the wood and finding nothing
      // in it (rome, 2026-08-02: "okay how do we look?").
      //
      // So: any den this world has never seeded gets its creature now, at full
      // health, at home. Tracked by SPAWN ID, so it happens exactly once per
      // den for the life of the world — a den whose creature is later killed
      // goes back to the ordinary migration clock, which is the behaviour we
      // want everywhere except the moment new content lands.
      const freshDens = world.mobSpawns.filter((s) => !this.seededDens.has(s.id) && !this.creatures.has(s.id));
      for (const spawn of freshDens) {
        const base = world.mobTemplates.get(spawn.template_id);
        if (!base) continue;
        // A roaming line takes fresh ground even on its first placement.
        const den = ai.rollDen(this, spawn.template_id, spawn.room_id);
        const tmpl = ai.rollBloodline(this, base, den);
        const traits = ai.rollMobTraits(tmpl);
        this.creatures.set(spawn.id, {
          id: spawn.id,
          templateId: tmpl.id,
          roomId: den,
          hp: Math.max(1, Math.round(tmpl.max_hp * ai.mobHpMult(traits))),
          hunger: randInt(0, HUNGRY_AT - 10),
          grudges: [],
          nextWanderAt: Date.now() + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
          target: null,
          carries: this.rollCarry(tmpl),
          hidden: LURKERS.has(tmpl.id) || undefined,
          home: den,
          traits: traits.length ? traits : undefined,
        });
      }
      for (const s of world.mobSpawns) this.seededDens.add(s.id);
      // THE TRAIT BACKFILL LIVED HERE AND IS GONE ON PURPOSE (2026-08-25).
      //
      // The mob trait lottery rolls at SPAWN, so every animal already standing
      // when it shipped could never carry a mark. A one-pass backfill over the
      // living fixed that, guarded by a saved flag so it could only run once.
      //
      // It ran, and the world came back over-marked: about 79 marked against
      // the ~51 that 1-in-12 allows across 617 creatures — half again too many,
      // which is not variance at that count. The likeliest reading is that the
      // pass ran on more than one world load before its flag stuck, and each
      // pass rolls again over whoever is still unmarked.
      //
      // A ONE-SHOT MIGRATION SHOULD NOT LIVE IN THE HOT PATH WAITING TO BE
      // TRUSTED. Its work is done — the marks are out there — so the code is
      // deleted rather than re-guarded, because deletion is the only guarantee
      // that does not depend on the flag having saved. The marks stay where
      // they are; taking one back off a living animal would be worse than
      // leaving the world a few over, and the excess washes out on its own as
      // creatures die and are replaced at the ordinary odds.
      //
      // Anything like this again belongs in a migration, run once, by hand.
      if (addedSpawn || freshDens.length) await this.persist();
    } else {
      // First light: seed the world from D1 templates.
      const now = Date.now();
      this.creatures.clear();
      for (const spawn of world.mobSpawns) {
        const base = world.mobTemplates.get(spawn.template_id);
        if (!base) continue;
        // Even at first light, rare blood: a den is usually the ordinary
        // version, once in a while the mean cousin.
        const den = ai.rollDen(this, spawn.template_id, spawn.room_id);
        const tmpl = ai.rollBloodline(this, base, den);
        const traits = ai.rollMobTraits(tmpl);
        this.creatures.set(spawn.id, {
          id: spawn.id,
          templateId: tmpl.id,
          roomId: den,
          hp: Math.max(1, Math.round(tmpl.max_hp * ai.mobHpMult(traits))),
          hunger: randInt(0, HUNGRY_AT - 10),
          grudges: [],
          nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
          target: null,
          carries: this.rollCarry(tmpl),
          hidden: LURKERS.has(tmpl.id) || undefined,
          home: den,
          traits: traits.length ? traits : undefined,
        });
      }
      this.ground.clear();
      for (const g of world.groundSpawns) {
        this.ground.set(g.room_id, [...(this.ground.get(g.room_id) ?? []), g.item_id]);
        this.placedSpawns.add(`${g.item_id}@${g.room_id}`);
        // Floor gear rolls its lottery at first light, same as a renewal does
        // (see applyRegrow): the world's own gear is world-loot too.
        const seedT = world.itemTemplates.get(g.item_id);
        if (seedT && seedT.slot !== "") {
          const rolled = this.rollTraits(seedT);
          if (rolled) this.groundRolled.set(`${g.item_id}@${g.room_id}`, rolled);
        }
        // The larder starts its clock at first light.
        if (world.itemTemplates.get(g.item_id)?.edible && !FOOD_KEEPS.has(g.item_id)) {
          this.rot.push({ itemId: g.item_id, roomId: g.room_id, at: now + ROT_MS });
        }
      }
      this.savedAt = now;
      await this.persist();
    }
    // A pre-rows world: it hydrated off the legacy blob above — write the rows
    // now (the empty cache makes every key dirty, so this is the full world),
    // THEN drop the blob. A crash between the two leaves both, and the next
    // wake prefers the rows.
    if (legacyBlob) {
      await this.persist();
      await this.state.storage.delete("sim");
    }
    return world;
  }

  // While nobody watched, time still passed: fast-forward the world from
  // savedAt to now in coarse steps. No players were here, so no combat —
  // creatures healed, got hungry, wandered, ate what was lying around,
  // and the dungeon slowly refilled.
  private catchUp(): void {
    const world = this.world;
    if (!world) return;
    const now = Date.now();
    let t = Math.max(this.savedAt, now - CATCHUP_CAP_MS);
    // Floor rust is charged ONCE for the whole gap, after the loop, not stepped
    // through it. The law is linear in elapsed time so the arithmetic is
    // identical either way — but a sweep walks every floor in the world, and
    // running it per 60s step would mean up to 20,000 full sweeps on a wake from
    // a long sleep, on the one thread the whole zone shares. This is the clock it
    // charges from.
    this.lastFloorRustAt = t;

    while (t < now) {
      const step = Math.min(SIM_STEP_MS, now - t);
      t += step;
      const mins = step / 60_000;

      for (const c of this.creatures.values()) {
        const tmpl = world.mobTemplates.get(c.templateId)!;
        c.target = null;
        c.hp = Math.min(tmpl.max_hp, c.hp + CREATURE_HEAL_PER_MIN * mins);
        // THE FLAT RATE ON PURPOSE, and this is the one hunger site that does
        // NOT read ai.hungerRate. The other two are real-time ticks, so "is it
        // cold right now" is a true statement about the minutes they are
        // charging for. This one replays hours that already happened, and the
        // weather it would ask about is TODAY'S — billing a whole night of
        // catch-up at the cold rate because there happens to be a cold on when
        // somebody logs in is not a simulation, it is a coincidence with a
        // multiplier. The sim does not keep a weather history, so the honest
        // rate for unobserved time is the sheltered one.
        if (ai.hungers(c.templateId)) {
          c.hunger = Math.min(HUNGER_MAX, c.hunger + HUNGER_PER_MIN * mins);
          if (c.hunger >= HUNGRY_AT) ai.creatureEatsHere(this, c, true, t);
        } else c.hunger = 0; // clears whatever the old rules already banked, so a live drowner isn't stuck "restless" forever
        // Same "stays put" rule as the live tick: the drowned holds its water and
        // brooders keep their nest, so the offline sim can't drift them out of
        // their dens and pile three grapplers into one room while no one watches.
        // A BOSS WITH A ROUTE WALKS IT (2026-08-02). Bosses stand where they
        // live — the king in his hoard, the hound on its threshold — because a
        // wandering boss would drift off the thing it guards. But the woodward
        // guards a MAZE, and a maze's keeper standing still is a room, not a
        // maze. So: is_boss still means "does not idly wander", and a boss that
        // has a PATROLS route is exempt, because its route IS where it lives.
        // No existing boss has a route, so nothing else changes.
        if (c.nextWanderAt <= t && (!tmpl.is_boss || PATROLS[tmpl.id]) && c.hp >= tmpl.max_hp * FLEE_BELOW
            && !BROODERS.has(c.templateId) && !DROWNERS.has(c.templateId) && !SENTINELS.has(c.templateId) && (!AGGRESSIVE.has(c.templateId) || ai.walksAnyway(c)) && !ROOTED.has(c.templateId)) {
          // Silent catch-up runs with no one connected, so no ambush fires here.
          void ai.creatureMoves(this, c, t, "wander", true);
        }
      }
      this.applyRot(t, true);
      this.sweepSpoiledHearts(t, true);
      this.applyRegrow(t, true);
      ai.applyArrivals(this, t, true);
      ai.scheduleArrivals(this, t);
    }
    this.rustFloors(now, true); // the gap's whole weather on the floors, in one pass
    this.pruneTraces(now);
    this.noteCreaturesChanged(); // the whole world just moved, offline
    this.savedAt = now;
    // The catch-up just advanced EVERYONE to now — the slow clock restarts from
    // here, or it would replay the same gap onto the frozen world.
    this.lastEcologyAt = now;
  }

  // THE SLOW CLOCK: everything outside the bubbles, advanced by real elapsed
  // time on a coarse beat. Same quiet-life arithmetic as catchUp — heal, hunger,
  // grudges fading, eating, a due wander step — plus the population beats the
  // live loop runs (brood births, predation, survival feeding), so the far
  // world genuinely breeds, culls and starves while nobody watches; only the
  // choreography coarsens, never the outcomes. Every send here is silent or
  // lands in rooms that by definition hold no one: frozen rooms sit beyond
  // SIM_RADIUS, and sound carries one room — the ring in between is empty.
  private async slowEcology(now: number, elapsedMs: number, liveRooms: Set<string>): Promise<void> {
    const world = this.world!;
    const mins = elapsedMs / 60_000;
    for (const c of this.creatures.values()) {
      if (liveRooms.has(c.roomId)) continue;
      const tmpl = world.mobTemplates.get(c.templateId)!;
      if (tmpl.is_boss || c.templateId === ESCAPE_TMPL) continue; // always-live: the fast beat owns them
      c.target = null; // nobody out here to fight — mirror of catchUp's rule
      if (c.asleep) {
        if (now < (c.sleepUntil ?? 0)) continue; // dead to the world, out here too
        c.asleep = false;
        c.sleepUntil = undefined;
      }
      if (!c.bleedTicks) c.hp = Math.min(tmpl.max_hp, c.hp + CREATURE_HEAL_PER_MIN * mins);
      if (c.hp >= tmpl.max_hp) c.phase = 0;
      // Who eats at all lives in ai.hungers now — one predicate for all three
      // hunger sites, because this exemption used to be written out by hand
      // here and nowhere else.
      if (ai.hungers(c.templateId)) c.hunger = Math.min(HUNGER_MAX, c.hunger + ai.hungerRate(this, c) * mins);
      else c.hunger = 0;
      if (c.grudges.length) {
        const ms = ai.forgetMs(this, tmpl);
        c.grudges = c.grudges.filter((g) => now - g.at < ms);
      }
      if (c.hunger >= HUNGRY_AT) {
        if (SCAVENGERS.has(c.templateId) || VERMIN.has(c.templateId) || LURKERS.has(c.templateId)) {
          ai.scavengerFeeds(this, c, true);
        }
        ai.creatureEatsHere(this, c, true, now);
      }
      if (BROODERS.has(c.templateId)) ai.broodBirths(this, c, now);
      // The hoarder works the FAR world too, and mostly there: the scoop refuses
      // to run with a player in the room, so a thing that only collected inside
      // the bubble would never collect at all. This is the beat that actually
      // fills it — the deep quietly tidying itself into one walking pile while
      // you're three corridors away. (Not in catchUp: that runs on simulated
      // time and the scoop's grace/telegraph windows read the real clock, so a
      // frozen world would yield one pickup for the whole gap either way.)
      if (HOARDERS.has(c.templateId)) ai.scavengerScoops(this, c);
      const hunted = (await ai.worryPrey(this, c, now)) || await ai.predation(this, c, now);
      if (!hunted && c.nextWanderAt <= now && (!tmpl.is_boss || PATROLS[tmpl.id]) && c.hp >= tmpl.max_hp * FLEE_BELOW
          && !BROODERS.has(c.templateId) && !DROWNERS.has(c.templateId) && !SENTINELS.has(c.templateId) && (!AGGRESSIVE.has(c.templateId) || ai.walksAnyway(c)) && !ROOTED.has(c.templateId)) {
        await ai.creatureMoves(this, c, now, "wander", true);
      }
    }
  }

  // THE DIRTY FLAG (2026-08-22). persist() is a synchronous full-world
  // serialize + SQLite write on the shared thread; it used to run on 34 call
  // sites, including every `go`, drop and death. Now the hot paths only mark
  // the sim dirty, and the tick's own flush (TICK_SIM_FLUSH_MS, honoring this
  // flag) is the one writer — the same 6-second bound the ambient churn has
  // always accepted. The rare high-stakes sites (cache opens, init, the board)
  // still persist immediately, and onLeave keeps its own write.
  private simDirty = false;
  public markSimDirty(): void { this.simDirty = true; }

  public async persist(): Promise<void> {
    this.simDirty = false; // whatever was dirty is being written now
    this.savedAt = Date.now();
    const state: SimState = {
      savedAt: this.savedAt,
      creatures: [...this.creatures.values()],
      ground: Object.fromEntries(this.ground),
      groundInstances: Object.fromEntries(this.groundInstances),
      regrow: this.regrow,
      roamedGround: this.roamedGround,
      arrivals: Object.fromEntries(this.arrivals),
      openDoors: [...this.openDoors],
      doorCloseAt: Object.fromEntries(this.doorCloseAt),
      fenceOut: Object.fromEntries(this.fenceOut),
      bounties: this.bounties,
      nextBountyChurnAt: this.nextBountyChurnAt,
      nextFenceChurnAt: this.nextFenceChurnAt,
      keeperBowl: this.keeperBowl,
      bountyTaken: Object.fromEntries(
        [...this.bountyTaken].filter(([, took]) => took.size).map(([pk, took]) => [pk, [...took]]),
      ),
      bloodOn: Object.fromEntries(this.bloodOn),
      nextStoneAt: this.nextStoneAt,
      nextBrandAt: this.nextBrandAt,
      nextSmokeTorchAt: this.nextSmokeTorchAt,
      nextCarrionAt: this.nextCarrionAt,
      works: Object.fromEntries(this.works),
      nextWorksAt: this.nextWorksAt,
      nextChainmanAt: this.nextChainmanAt,
      traces: Object.fromEntries(this.traces),
      rot: this.rot,
      placedSpawns: [...this.placedSpawns],
      seededDens: [...this.seededDens],
      groundCond: Object.fromEntries(this.groundCond),
      groundTorch: Object.fromEntries(this.groundTorch),
      groundLore: Object.fromEntries(this.groundLore),
      groundRolled: Object.fromEntries(this.groundRolled),
      groundHeart: Object.fromEntries(this.groundHeart),
      inGatehouse: [...this.inGatehouse],
      inDen: [...this.inDen],
      // Empty hands are not saved. wallOf() creates a set the moment anyone so
      // much as LOOKS at the plaster, and persisting those would put a row in
      // the world's state for every passer-by who never picked up a nail.
      wallMarks: Object.fromEntries(
        [...this.wallMarks].filter(([, rooms]) => rooms.size).map(([pk, rooms]) => [pk, [...rooms]]),
      ),
      // Same law as the chalk above: an empty walk is not worth a row.
      walked: Object.fromEntries(
        [...this.walked].filter(([, rooms]) => rooms.size).map(([pk, rooms]) => [pk, [...rooms]]),
      ),
      board: this.board,
      stoneNames: Object.fromEntries(this.stoneNames),
      cacheSpent: Object.fromEntries(this.cacheSpent),
      cacheRoom: Object.fromEntries(this.cacheRoom),
      nextSurfaceAt: this.nextSurfaceAt,
      events: Object.fromEntries(this.events),
      fishStock: Object.fromEntries(this.fishStock),
      snowUntil: this.snowUntil,
      nests: Object.fromEntries(this.nests),
    };
    // Rows, not the blob (simstore.ts): only what changed since the last save
    // is written, in one transaction. The 128KiB one-value ceiling is gone.
    //
    // ...and creatures are written PER BAND. simstore owns the storage shape
    // and knows nothing about rooms, so the band lookup is handed to it from
    // here — the same bandOf the feed uses, so a creature is filed under the
    // ground a player standing next to it would say they were on. A wolf
    // crossing out of the wood dirties the wood and the road, and leaves the
    // deep, the warrens and the fortress untouched on disk.
    // ...EXCEPT THE MOUNTAIN, WHICH SHARDS BY TIER. A band is the right grain
    // for every ground built so far — the biggest is the Crossing at 97 bodies,
    // comfortably inside the 64KB-per-shard warn simstore prints, which at
    // ~330 bytes a creature lands near 200. The mountain is planned at ~300 in
    // one band, so it would arrive already over the line, and the answer is the
    // one simstore has named in its own header since the rows shipped: a finer
    // shard, not a new mechanism. Five tiers puts it back around 60 a blob.
    //
    // Done NOW, before the ground exists, because the alternative is doing it
    // to a live world that is already too big — and it costs nothing until the
    // first mountain room lands: no other band has a mountain tier, so every
    // existing shard key is byte-for-byte what it was.
    simstore.saveSim(this.state.storage, state, this.sim, (c) => {
      const band = this.bandOf(c.roomId);
      return band === "mountain" ? band + ":" + (MAP_QUARTERS[c.roomId] ?? "0") : band;
    });
  }

  // Blow away the whole world sim and rebuild it from first light. Drops the
  // saved "sim" blob and every in-memory shard of it, reloads the world book
  // from D1, and re-seeds creatures/ground fresh off the (migrated) spawn tables.
  // D1 is untouched — players, packs, lockboxes, vaults, sealed loot all survive.
  // The deep re-seals (openDoors cleared), so the corpse-key is needed again.
  private async reseed(zone: string): Promise<number> {
    simstore.clearSim(this.state.storage, this.sim); // the rows go the way the blob went
    await this.state.storage.delete("sim");
    this.world = null; // force loadWorld + the first-light branch on the re-init below
    this.creatures.clear();
    this.ground.clear();
    this.groundInstances.clear();
    this.regrow = [];
    this.roamedGround = [];
    this.arrivals.clear();
    this.openDoors.clear();
    this.doorCloseAt.clear();
    this.fenceOut.clear();
    this.bounties = [];
    this.nextBountyChurnAt = 0;
    this.nextFenceChurnAt = 0;
    this.bountyTaken.clear();
    this.keeperBowl = [];
    this.diceGames.clear();
    this.bloodOn.clear();
    this.nextStoneAt = 0;
    this.nextBrandAt = 0;
    this.nextSmokeTorchAt = 0;
    this.nextCarrionAt = 0;
    this.works.clear();
    this.nextWorksAt = 0;
    this.nextChainmanAt = 0;
    this.traces.clear();
    this.rot = [];
    this.placedSpawns.clear();
    this.seededDens.clear();
    this.groundCond.clear();
    this.groundTorch.clear();
    this.groundLore.clear();
    this.groundRolled.clear();
    this.groundHeart.clear();
    // THE WALL IS NOT THE WORLD'S (2026-08-12). Both of these were cleared
    // here, so a reseed — a thing meant to touch mobs and floor litter and
    // nothing a player owns — took every chart in the game with it. A player's
    // walking is theirs. Dead room ids filter out on read, so a re-cut world
    // needs no help from a bulldozer.
    //
    // THE BOARD AND THE STONES AREN'T EITHER (2026-08-20). The same principle
    // reaches them: posts are people's words, the milestone registers are
    // people's names — and a reseed (the one admin lever for a wedged world)
    // used to take all of both in a single request. A busy board emptied, and
    // nobody had torn a thing. They survive the reseed now, like the wall.

    this.cacheSpent.clear();
    this.cacheRoom.clear();
    this.nextSurfaceAt = 0;
    this.events.clear(); // a fresh world gets a fresh sky
    this.fishStock.clear();
    await this.init(zone); // "sim" is gone now → seeds the world fresh at first light
    // The world changed under everyone's feet. Each connected wanderer's log
    // still shows the pre-reseed room (old mobs, old floor litter), and a
    // reseed must never be the thing that walks somebody out of the gatehouse
    // or leaves them staring at a room that no longer exists. Re-describe
    // where they stand and re-assert their chips and inside-ness.
    // The same test the reconnect uses, and NOT outOfWorld(): that also reads
    // true for `away` at a gate, which is the lockbox crouch — a thing done
    // standing in the gate room, never through the door (the crouch's own note
    // in gate.ts: opening your pack is not a step in). Asking the loose
    // question would hand the gatehouse's interior to somebody kneeling
    // outside it.
    for (const s of this.sessions.values()) {
      const inside = this.inGatehouse.has(s.pubkey) && this.world!.entryRooms.has(s.roomId);
      this.sendStatus(s);
      if (inside) this.send(s, gate.describeGatehouse(this, s));
      else this.send(s, this.describeRoom(s, false));
      this.sendCtx(s);
    }
    return this.creatures.size;
  }

  // ---- transport: the direct door ----

  async fetch(req: Request): Promise<Response> {
    // Admin: wipe the world SIM (creatures, ground, arrivals, world state) and
    // re-seed fresh from the spawn tables. Does NOT touch D1 — every player's
    // character, inventory, vault and sealed loot survive. Gated by ADMIN_TOKEN
    // in index.ts. For clearing a piled-up or wedged world without nuking anyone.
    if (req.headers.get("x-admin") === "reseed") {
      const n = await this.reseed(req.headers.get("x-zone") ?? "door");
      return new Response(JSON.stringify({ reseeded: true, creatures: n }), { headers: { "content-type": "application/json" } });
    }
    // THE DOOR'S OWN NEWS (2026-08-07). What the threshold prints under the
    // keys, and what the reckoning modal shows. It lives on the DO because only
    // the DO knows who is awake and which arc is running; the boards come off
    // D1 live. Everything in here is ALREADY PUBLIC — the boards are opt-in,
    // boss falls and arcs ride the zone feed, and `who` prints the count
    // in-game — so this leaks nothing that isn't on a relay already.
    if (req.headers.get("x-world") === "1") {
      // THE WORLD HAS TO BE LOADED FIRST, and this is the one path that can
      // arrive before anybody has ever connected — a stranger on the threshold
      // hits it with no session behind them. Without this, lbOpts() finds no
      // itemTemplates, hands the trophy board an empty id list, and the board
      // reads zero for everyone: caught locally with a wanderer holding 61
      // trophies and an empty board (2026-08-07). The legend board hid it,
      // because legend is pure player columns and needs no world at all.
      await this.init(req.headers.get("x-zone") ?? "door");
      return new Response(JSON.stringify(await this.worldSnapshot()), {
        headers: { "content-type": "application/json" },
      });
    }
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pubkey = req.headers.get("x-pubkey");
    if (!pubkey) return new Response("unauthorized", { status: 401 });
    const zone = req.headers.get("x-zone") ?? "door";
    // A FULL PAGE RELOAD wiped the client's scroll — so it needs the room text
    // resent even when this looks (to us) like a fast reweave. A websocket reweave
    // keeps its scroll and passes no flag; a fresh page passes fresh=1. Without
    // this, a refresh inside the 45s seamless window lands you on a blank pane —
    // the HUD says where you are, but nothing paints it (rome, 2026-07-17: the
    // gatehouse came back empty on refresh).
    const qs = new URL(req.url).searchParams;
    const fresh = qs.get("fresh") === "1";
    // WHICH PAGE IS DIALLING, AND WHICH OF ITS DIALS THIS IS. `pid` is minted
    // once per page load, `att` counts that page's dials. Together they let the
    // one-body-per-soul close below tell a genuinely new window from this
    // window's own abandoned handshake. Absent on an older cached client, in
    // which case the guard simply doesn't fire and displacement behaves as it
    // always did.
    const pid = qs.get("pid");
    const attRaw = Number(qs.get("att"));
    const att = Number.isFinite(attRaw) ? attRaw : null;

    // A ZOMBIE HANDSHAKE MUST NOT EVICT THE LIVE WIRE (2026-08-28). The client
    // gives up on a handshake that stalls past CONNECT_STALL_MS, nulls its
    // handlers, closes its end and dials again — but closing a socket that never
    // opened cannot recall an upgrade already on its way here. That request can
    // still land, seconds after the replacement wire is up and painting, and the
    // one-body-per-soul close below would read it as "another client" and shut
    // the socket the wanderer is actually looking at. Their page then prints
    // that their spirit is called to another window and goes still — and since
    // nothing on that page ever cleared the flag, it refused to dial again until
    // a reload. One window, locked out of the world by its own abandoned dial.
    //
    // The page says who it is and which of its dials this is, so an arrival can
    // be ordered against what is already here. SAME page, and not a later dial
    // than the one already holding the socket, means this request lost a race
    // with itself: it is the stale one, and it is refused rather than served.
    // A DIFFERENT page is a genuine second window and still takes the body, so
    // opening this wanderer on a phone works exactly as before — no clock is
    // compared across devices, only a counter within one page.
    //
    // Answered before init/catchUp/D1, because a dead dial should cost nothing.
    if (pid && att !== null) {
      for (const other of this.state.getWebSockets()) {
        if (this.wsPubkey(other) !== pubkey) continue;
        const a = this.wsAttachment(other);
        if (a?.pid !== pid || typeof a.att !== "number") continue;
        if (att <= a.att) return new Response("stale connection", { status: 409 });
      }
    }

    await this.init(zone);
    // The first observer in a while collapses the elapsed time. "Observed" now
    // means a live socket, hibernated or not (getWebSockets) — while any socket
    // is parked the alarm keeps ticking the world, so it was never truly dark.
    if (this.state.getWebSockets().length === 0) this.catchUp();

    const { row, created } = await getOrCreatePlayer(this.env.DB, pubkey, this.randomGate());
    const items = await loadInventory(this.env.DB, pubkey);

    // One body per soul: a second connection displaces the first. With
    // hibernation the old socket may be parked (in getWebSockets), not only in
    // this.sessions — close any socket already bearing this key.
    // A linkdead body still standing in a fight: the return steps back INTO it
    // — its chewed-down hp, its room, its foes — not into the stale D1 copy.
    //
    // THE DISPLACED BODY IS THE SAME BODY (2026-08-20). The old socket's close
    // event lands AFTER this.sessions already points at the new session, so
    // onLeave's "displaced, already handled" guard skips it — and its cleanup
    // used to never run: open deals stayed live for the counterparty, dice
    // games stayed on the bench, and the new session was built from the stale
    // D1 row — a free heal and a free escape from any fight, the exact thing
    // LINKDEAD exists to prevent. So the cleanup runs HERE, and the old body's
    // live state is carried into the new session below the same way a linkdead
    // return carries it.
    const displaced = this.sessions.get(pubkey) ?? null;
    if (displaced) {
      trade.cancelDealForSession(this, displaced);
      dice.endGamesFor(this, displaced.pubkey);
    }
    for (const other of this.state.getWebSockets()) {
      if (this.wsPubkey(other) !== pubkey) continue;
      const prev = this.sessions.get(pubkey);
      if (prev && !prev.linkdeadUntil) this.send(prev, "Your spirit is called elsewhere. (connected from another client)");
      try { other.close(1000, "reconnected"); } catch {}
    }
    this.sessions.delete(pubkey);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    // Hibernatable accept: the socket survives DO eviction and deploys. The
    // pubkey rides on the socket itself (serializeAttachment), so a woken DO can
    // rebuild the session from the parked socket alone.
    this.state.acceptWebSocket(server);
    // la = lastActiveAt, the idle-sweep stamp: it rides the attachment so a
    // hibernation rebuild (hydrateSessions) doesn't read a parked socket as fresh.
    // pid/att ride the socket too, so the staleness guard above still works after
    // a hibernation wake, when the only thing left of a connection is its socket.
    server.serializeAttachment({ pubkey, la: Date.now(), pid, att });
    // Answer pings without waking the DO — keeps parked sockets warm for cheap.
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));

    const session = this.buildSession(server, row, items);
    // Read this wanderer's chart up out of D1 before anything can ask for it
    // (mig 210). Cached for the wake, so a rebuild costs nothing.
    await this.loadWall(session.pubkey);
    // Step back into the still-standing body: everything the fight did to it
    // while the eyes were empty carries over. buildSession's D1 read would
    // otherwise revert hp/wounds to the last flush — a free heal for loggers.
    // Same for a displaced body (a second tab opened mid-fight): the wanderer
    // is still standing exactly where the old session left them.
    if (displaced) {
      session.hp = displaced.hp;
      session.roomId = displaced.roomId;
      session.target = displaced.target;
      session.stance = displaced.stance;
      session.bleedTicks = displaced.bleedTicks;
      session.bleedDmg = displaced.bleedDmg;
      session.stunned = displaced.stunned;
      session.hobbled = displaced.hobbled;
      session.limpingSince = displaced.limpingSince;
      session.litUntil = displaced.litUntil;
      session.litSource = displaced.litSource;
      session.torchWarned = displaced.torchWarned;
      session.linkdeadUntil = undefined;
    }
    this.sessions.set(pubkey, session);
    await lore.refreshStudied(this, session); // the sync chip builder can't read D1; prime the studied-cache so no redundant `study` chip shows before the first journal open
    this.lastCommandAt = Date.now(); // an arrival is activity — the world beats fast for fresh footsteps
    // buildSession never carries a dealId across — any deal this player was
    // in is already cancelled server-side (the displacement cleanup above ran
    // cancelDealForSession on the displaced body, though its closeFrame died
    // with it, unsent). The client doesn't know that: force its swap UI shut
    // so a reweave never leaves "wave it off" stuck talking to nothing.
    trade.forceCloseSwapUI(session);
    gate.forceCloseGateUI(session); // and the four gatehouse panels, for the same reason

    // A dropped connection that comes back within the grace window is a
    // re-weave, not an arrival: no fanfare, no re-reading the intro, and the
    // room comes back brief. A genuine return (or a first arrival) gets the
    // full welcome and the full room.
    const left = this.leftAt.get(pubkey);
    const reconnecting = !created && left !== undefined && Date.now() - left < RECONNECT_GRACE_MS;
    // A very fast reweave (a wifi hop, a tunnel) is made INVISIBLE: the HUD is
    // resynced (status + ctx, below) but nothing is written to the scroll — no
    // greeting, no room reprint. You never notice you dropped. Slower returns
    // still get the welcome. The client suppresses its own "frays" line to match.
    const seamless = !fresh && reconnecting && left !== undefined && Date.now() - left < SEAMLESS_RECONNECT_MS;
    this.leftAt.delete(pubkey);

    if (reconnecting) {
      if (!seamless) this.send(session, "— you take up the thread of the Door again —");
    } else {
      this.send(session, `NOMAD — the Door. You are ${session.name}.`);
      if (created) {
        this.send(
          session,
          [
            // WHEREVER THEY LANDED. This used to open "you wake at a broken
            // gate", which randomGate makes false two times in five: the
            // Waystation is a spawn and not a gate, and the road slot resolves
            // to a random road room that is never a gate on purpose (rome,
            // 2026-08-02 — the road hatches you out ON the road). The keys are
            // the part that is true wherever you woke, so the line keeps those.
            "You wake with keys in your pocket and no memory of the road.",
            "This dungeon is shared and it is alive: the other names are real people,",
            "and the creatures keep living whether or not anyone is watching.",
            "Wounds do not close on their own — rest, or eat.",
            "",
            // THE GATES, SAID AT THE START. The first walk did not name one
            // until its fifth lesson, and even then only as somewhere to claim
            // and stash — never as a door you step THROUGH, never that nothing
            // follows you in. Written so it holds for a wanderer who woke a
            // day's walk from the nearest one.
            "Ten gates stand in the world, and they are doors: 'in' steps through one.",
            "Behind every gate is the same warm room — nothing in the dungeon follows",
            "you in, you mend there, and the keeper's hatch, the bench and the brazier",
            "are all in it. Your goods answer to your key, not to the door: bank at",
            "one, collect at any.",
            "If no gate is in sight, the way to the nearest is on the room bar while",
            "this walk lasts, and the milestones carry it after that.",
            "",
            "Leaving is free: log off anywhere and come back exactly as you left.",
            "DYING is what costs you — everything you carry drops where you fall.",
            "What is still yours tomorrow is what you left in the lockbox or the vault.",
            "",
            "The suggestions under the input line are real commands — tap one, or type it.",
            `Pick what the dungeon calls you with: name <yourname>`,
            "And mind your keys ('keys' shows them): save the secret somewhere safe —",
            "it is the only way back to this wanderer from another door or device.",
            // ...and the one place the rest of it is written down. Only the
            // RETURNING branch below said this, so the player who most needed
            // to know 'help' exists was the only one never told.
            "'help' has the rest of it.",
          ].join("\n"),
        );
      } else {
        this.send(session, "Type 'help' if you're lost.");
      }
      this.actorFeed(session, session.roomId, `${session.name} blinks into being.`, "who");
    }
    // YOU WERE INSIDE. A fresh Session is built with away = false, so a frayed
    // socket used to fling you out of the gatehouse and into the dungeon — out of
    // the one room whose whole job is that nothing can do that to you. The door
    // holds across a reconnect: only walking out puts you outside.
    if (this.inGatehouse.has(pubkey) && this.world!.entryRooms.has(session.roomId)) {
      // A DOOR BOARDED WHILE YOU WERE GONE DOES NOT PUT YOU OUT. inGatehouse is
      // the durable truth precisely so a frayed socket cannot fling you out of
      // the one safe room, and the works are a one-way door, not an eviction
      // (works.tickWorks) — so you come back exactly where you were, and the
      // boards are only news about the way out. Barring the reweave here would
      // do by accident the very thing rome ruled out on purpose: turn a dropped
      // connection into the works throwing you into the open.
      if (works.shutForWorks(this, session.roomId)) {
        this.send(session, "You come back to the sound of sawing, and boards going up over the door from the outside. Nobody has moved you — but that door is shut for good now, until the works are done.", "evt");
      }
      session.away = true;
      session.stepText = true;
      this.markWalked(session);
      // The rebuilt session has no open stance (sorting/trading/forging default
      // false), but the client may still be showing a modal it had open when the
      // socket dropped. Dismiss it so the view matches the restored state — else
      // a stale bench frame lingers over the gatehouse until the next click.
      try { session.ws.send(JSON.stringify({ v: 0, t: "bench", open: false })); } catch {}
      this.sendStatus(session);
      if (!seamless) this.send(session, gate.describeGatehouse(this, session));
      this.sendCtx(session);
      this.markSimDirty();
      await this.ensureAlarm();
      return new Response(null, { status: 101, webSocket: client });
    }
    // Either way, mark the wake room known and show it: full on a real arrival,
    // brief on a re-weave (you never left). Status goes first so the client
    // knows the room's name in time to paint it gold.
    this.markWalked(session);
    this.sendStatus(session);
    if (!seamless) this.send(session, this.describeRoom(session, !reconnecting));
    this.sendCtx(session);
    await ai.provokeGrudges(this, session, false); // reconnect grace: no free first strike
    this.markSimDirty();
    await this.ensureAlarm();

    return new Response(null, { status: 101, webSocket: client });
  }

  // A wrapped savePlayer: D1 briefly overloads under real concurrent load
  // ("D1_ERROR: D1 DB is overloaded. Requests queued for too long.") — a real
  // Cloudflare-side thing, not something code alone prevents. The danger was
  // never the failed write itself (this row gets saved again on the next
  // flush/event); it was that tick() is one long sequential function, and an
  // uncaught throw ANYWHERE in it aborts everything still queued after it —
  // one player's save hiccup was silently killing that whole tick's work for
  // every OTHER connected player and creature too (rome, 2026-07-22/23,
  // traced live via Workers Logs: "tick threw Error: D1_ERROR..." at
  // savePlayer). Swallow and log; the state is provisional in memory either
  // way and the next successful save catches it up.
  // Pubkeys whose last save did not land. A lost save used to be invisible and
  // self-correcting-in-theory ("retry next flush") — but that only holds while
  // the session lives. Lose the DEATH save and the next rebuild reads a stale
  // D1 row: the player is standing at a gate in memory while D1 still says the
  // deep, and hydrateSessions believes D1 (rome, 2026-07-30 — died in the
  // Drowned Court, respawned at the Sally Port, and was put back in the Cold
  // Hearth, the dead-end one room from his corpse, at full hp: exactly the
  // room of his last good flush). The tick drains this, so a failure can never
  // outlive the beat that caused it.
  private dirtySaves = new Set<string>();

  private async trySavePlayer(pubkey: string, roomId: string, hp: number): Promise<void> {
    // D1 overload is transient (it's a queue, not an outage), so a couple of
    // immediate retries close most of the window on their own.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await savePlayer(this.env.DB, pubkey, roomId, hp);
        this.dirtySaves.delete(pubkey);
        return;
      } catch (e) {
        if (attempt === 2) {
          this.dirtySaves.add(pubkey); // the tick keeps trying with LIVE state
          console.error(`savePlayer failed for ${pubkey} after 3 tries, queued dirty:`, e);
        }
      }
    }
  }

  // Retry whatever didn't land, from the session's CURRENT state — never a
  // stale snapshot, so this can only ever move D1 toward the truth.
  private async drainDirtySaves(): Promise<void> {
    if (!this.dirtySaves.size) return;
    for (const pubkey of [...this.dirtySaves]) {
      const s = this.sessions.get(pubkey);
      if (!s) { this.dirtySaves.delete(pubkey); continue; } // gone; onLeave's own save is the last word
      await this.trySavePlayer(pubkey, s.roomId, s.hp);
    }
  }

  private async onLeave(session: Session): Promise<void> {
    if (this.sessions.get(session.pubkey) !== session) return; // displaced, already handled
    // Whichever branch below runs, this player isn't reading the wire anymore
    // — a deal they had open can't wait for them (the counterparty needs to
    // know now, not whenever they might reconnect).
    trade.cancelDealForSession(this, session);
    dice.endGamesFor(this, session.pubkey); // and any bones in the air (dice.ts)
    // The world stays real when your eyes close (rome, 2026-07-10): a LIVE
    // fight holds the body here for LINKDEAD_MS — standing, auto-fighting,
    // killable — so pulling the plug is never an escape. With nothing hunting
    // you, the fade below is instant and free, same as ever. The tick lets the
    // body go when the fight ends or the window closes.
    const fightLive = !!session.target
      || [...this.creatures.values()].some((c) => c.target === session.pubkey);
    if (fightLive && !session.linkdeadUntil) {
      session.linkdeadUntil = Date.now() + LINKDEAD_MS;
      this.leftAt.set(session.pubkey, Date.now()); // a return inside the window re-weaves
      // Their own beat, their own key (actorFeed) — though the client that would
      // sign it is the one that just frayed, so in practice the relay rarely
      // hears this. Good: a broadcast "body standing, nobody home" is a loot
      // beacon. The room's witnesses get their fair shot; the network doesn't.
      this.actorFeed(session, session.roomId, `${session.name} goes slack — eyes empty, body still standing.`, "who");
      await this.trySavePlayer(session.pubkey, session.roomId, session.hp);
      // Gear condition too — a fray mid-fight is exactly when armor is taking
      // wear, and this branch used to leave it unflushed ("the flush keeps
      // chasing"). If the DO ever cold-wakes before a later flush caught up,
      // that wear was lost outright: condition rewound to its last-saved
      // value, and the next hit re-crossed the SAME "about to fail" threshold
      // as if for the first time — the same warning firing over and over
      // across repeated frays (rome, 2026-07-22, reported live).
      for (const c of session.items) {
        if (c.serial === null && this.isGear(c.itemId)) {
          await setItemCondition(this.env.DB, c.rowId, c.condition);
        }
      }
      return;
    }
    // Their own beat, their own key (actorFeed) — and, as with the linkdead line
    // above, the signer is the client that's leaving, so the relay usually never
    // hears it. Deliberate: a named logout broadcast tells the network exactly
    // when you stopped watching your own body. The room sees it; that's enough.
    this.actorFeed(session, session.roomId, `${session.name} fades from the world.`, "who");
    session.linkdeadUntil = undefined;
    this.sessions.delete(session.pubkey);
    this.leftAt.set(session.pubkey, Date.now()); // so a quick return reads as a reconnect
    for (const c of this.creatures.values()) {
      if (c.target === session.pubkey) c.target = null;
    }
    this.noteCreaturesChanged(); // targetedBy must not still hold a name that left
    await this.trySavePlayer(session.pubkey, session.roomId, session.hp);
    // Flush the worn-down condition of any provisional gear (rust ticks live in
    // memory; D1 catches up here). Sealed gear is frozen, no need.
    for (const c of session.items) {
      if (c.serial === null && this.isGear(c.itemId)) {
        await setItemCondition(this.env.DB, c.rowId, c.condition);
      }
    }
    await this.persist();
  }

  // ---- hibernation: sockets that outlive the DO ----
  // The DO can be evicted (a deploy, or Cloudflare reclaiming memory) while its
  // WebSockets stay parked. On wake, this.sessions is empty but the sockets live
  // on, each carrying its owner's pubkey — so a session is rebuilt from durable
  // state (D1 + the sim), and a player never sees a disconnect.

  // Build a Session from a player row, their D1 inventory, and a live socket.
  // Shared by a fresh connect and a post-wake rehydrate: everything here is
  // either loaded from D1 or a safe transient default. A wake resets combat /
  // rest / modal state, but NEVER hp, room, gear, stance, or tallies.
  private buildSession(ws: WebSocket, row: PlayerRow, items: CarriedItem[]): Session {
    const world = this.world!;
    const roomId = world.rooms.has(row.room_id) ? row.room_id : this.randomGate();
    return {
      ws,
      pubkey: row.pubkey,
      name: row.name,
      named: row.named === 1,
      roomId,
      hp: Math.max(1, row.hp),
      maxHp: row.max_hp,
      target: null,
      stance: (["reckless", "steady", "guarded"].includes(row.stance) ? row.stance : "steady") as Stance,
      items,
      staggered: false,
      resting: false,
      away: false,
      ctxCombat: false,
      born: row.created_at,
      kills: row.kills ?? 0,
      deaths: row.deaths ?? 0,
      bossKills: row.boss_kills ?? 0,
      pvpKills: row.pvp_kills ?? 0,
      tokens: RATE_CAPACITY,
      tokensAt: Date.now(),
      nextThrowAt: 0,
      visited: new Set<string>(),
      keeperTold: lore.keeperTold(row.keeper_told),
      lastAmbientAt: Date.now(),
      habitAt: Date.now(), // the body does not perform the moment you arrive — the cooldown starts with you
      quirkAt: Date.now(),
      lastActiveAt: Date.now(), // a fresh body is present; hydrateSessions overwrites this from the socket's `la` for a rebuilt one
    };
  }

  // The socket's attachment: the owner's key, stashed at accept-time, plus
  // `la` — the idle stamp (see Session.lastActiveAt).
  private wsAttachment(ws: WebSocket): { pubkey?: string; la?: number; pid?: string | null; att?: number | null } | null {
    try {
      return ws.deserializeAttachment() as { pubkey?: string; la?: number; pid?: string | null; att?: number | null } | null;
    } catch { return null; }
  }

  private wsPubkey(ws: WebSocket): string | null {
    const a = this.wsAttachment(ws);
    return a && typeof a.pubkey === "string" ? a.pubkey : null;
  }

  // Rebuild any session missing from memory for a still-connected socket. A
  // no-op while the DO is warm (sessions already present); does its D1 reads
  // only once per socket per cold wake.
  private async hydrateSessions(): Promise<void> {
    const sockets = this.state.getWebSockets();
    if (sockets.length === 0) return;
    for (const ws of sockets) {
      const pubkey = this.wsPubkey(ws);
      if (!pubkey || this.sessions.has(pubkey)) continue;
      if (!this.world) await this.init("door");
      const { row } = await getOrCreatePlayer(this.env.DB, pubkey, this.randomGate());
      const items = await loadInventory(this.env.DB, pubkey);
      const rebuilt = this.buildSession(ws, row, items);
      await this.loadWall(rebuilt.pubkey); // a hibernation rebuild must not read an empty wall
      // buildSession stamps lastActiveAt = now, which would read a long-parked
      // socket as JUST arrived and dodge the idle sweep across every eviction —
      // the true stamp rides the socket.
      const la = this.wsAttachment(ws)?.la;
      rebuilt.lastActiveAt = typeof la === "number" ? la : Date.now();
      this.sessions.set(pubkey, rebuilt);
      await lore.refreshStudied(this, rebuilt); // same as a fresh connect: a wake rebuild starts with an empty cache
      // A cold wake means the WHOLE DO reset — z.deals is gone, and this
      // fresh session carries no dealId — but the client's browser doesn't
      // know that and may still be showing a swap modal/popup with dead
      // buttons. Force it closed so a reweave never strands someone unable
      // to wave off a trade that no longer exists server-side.
      trade.forceCloseSwapUI(rebuilt);
      gate.forceCloseGateUI(rebuilt); // ...and the bench, the hatch, the forge and the board with it
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let session: Session | undefined;
    try {
      await this.hydrateSessions();
      const pubkey = this.wsPubkey(ws);
      if (!pubkey) return;
      session = this.sessions.get(pubkey);
      if (!session) return;
      session.ws = ws; // a woken socket is a fresh object — keep the session on it
      await this.onMessage(session, typeof message === "string" ? message : "");
      // A command can open a fight while a quiet-length alarm is still
      // pending — pull the beat in (ensureAlarm re-arms early when hot).
      await this.ensureAlarm();
    } catch (e) {
      // A thrown command used to vanish here (a bare `catch {}`) — leaving the
      // player able to see the world's ambient lines but unable to ACT, a silent
      // soft-lock with nothing recorded. Now: log the pubkey + the exact input +
      // the stack (visible in `wrangler tail`) so the next occurrence names its
      // own cause, and tell the player it stumbled so they know to retry rather
      // than stare. One bad command no longer eats the whole session.
      const raw = typeof message === "string" ? message.slice(0, 300) : "";
      console.error("onMessage threw", this.wsPubkey(ws), raw, (e as Error)?.stack ?? String(e));
      if (session) {
        try { this.send(session, "The dungeon stumbles — that didn't take. Try again, or type 'look'."); } catch {}
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const pubkey = this.wsPubkey(ws);
    if (pubkey) {
      const session = this.sessions.get(pubkey);
      if (session && session.ws === ws) {
        await this.onLeave(session).catch(() => {});
      } else {
        // Parked socket closed before it was ever rehydrated: its state was
        // already flushed durably, so just note the departure for reconnect grace.
        this.leftAt.set(pubkey, Date.now());
        if (this.leftAt.size > 200) {
          for (const k of [...this.leftAt.keys()].slice(0, 100)) this.leftAt.delete(k);
        }
      }
    }
    try { ws.close(); } catch {}
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const pubkey = this.wsPubkey(ws);
    if (!pubkey) return;
    const session = this.sessions.get(pubkey);
    if (session && session.ws === ws) await this.onLeave(session).catch(() => {});
  }

  // ---- messages in ----

  private async onMessage(session: Session, raw: string): Promise<void> {
    let frame: any;
    try {
      frame = JSON.parse(raw);
    } catch {
      return;
    }
    const isBench = frame?.t === "bench";
    const isTrade = frame?.t === "trade";
    const isForge = frame?.t === "forge";
    const isBounty = frame?.t === "bounty";
    const isSwap = frame?.t === "swap";
    if (!isBench && !isTrade && !isForge && !isBounty && !isSwap && (frame?.t !== "cmd" || typeof frame.text !== "string")) return;

    // Token bucket per pubkey — castr's daily-cast pattern, compressed.
    const now = Date.now();
    // Presence: any real frame re-stamps the player and heats the world. The
    // stamp rides the socket too, so a hibernation rebuild keeps it.
    session.lastActiveAt = now;
    this.lastCommandAt = now;
    // Re-stamping the idle clock must CARRY the dial's identity, not drop it:
    // rewriting the attachment with pubkey+la alone would strip pid/att off the
    // socket on the wanderer's very first command, and the staleness guard would
    // be blind again a second after it was armed.
    try {
      const a = this.wsAttachment(session.ws);
      session.ws.serializeAttachment({ pubkey: session.pubkey, la: now, pid: a?.pid ?? null, att: a?.att ?? null });
    } catch {}
    session.tokens = Math.min(
      RATE_CAPACITY,
      session.tokens + ((now - session.tokensAt) / 1000) * RATE_REFILL_PER_SEC,
    );
    session.tokensAt = now;
    if (session.tokens < 1) {
      if (!isBench && !isTrade && !isForge && !isBounty && !isSwap) this.send(session, "You're moving faster than the dungeon can watch. Slow down.");
      return;
    }
    session.tokens -= 1;

    // The gatehouse bench (storage modal) and the keeper's hatch (trade
    // modal): each its own little protocol.
    if (isBench) return gate.handleBench(this, session, frame);
    if (isTrade) return gate.handleTrade(this, session, frame);
    if (isForge) return gate.handleForge(this, session, frame);
    if (isBounty) return gate.handleBounty(this, session, frame);
    // The wanderer-to-wanderer deal (trade.ts): unlike the three above, this
    // one never sets `away` — it works whether you're in the gatehouse or
    // standing in the dark, so it's routed here rather than behind the
    // outOfWorld() gate below.
    if (isSwap) return trade.handleSwap(this, session, frame);

    // IN THE GATEHOUSE (away, at a gate): the sanctuary is a ROOM now, not a
    // switch. The dungeon can't reach you and you can still be heard — known
    // verbs command, the dungeon-facing ones are refused, and anything else you
    // type is spoken to everyone by the fire. Off the wire entirely. Only 'out'
    // (or closing the modal you're in) puts you back in the world.
    if (this.outOfWorld(session)) {
      await gate.handleGatehouse(this, session, frame.text);
      this.syncCombatCtx();
      return;
    }

    // Stepped out of the world with a TYPED barter/forge/inventory: a safe
    // stance at the counter/brazier/keeping. That stance's own work keeps you
    // out and untouchable; ANY other act walks you back into the world first,
    // then runs — so a command-player is never exposed mid-fiddle, and needs no
    // special "leave" verb ('look' is the natural way back).
    if (session.away && session.stepText) {
      const stepCmd = parse(frame.text);
      if (!stepCmd || "miss" in stepCmd) {
        return this.send(session, session.trading
          ? "The keeper waits across the counter. 'buy'/'offer' to deal, or 'look' to step back into the world."
          : session.forging
            ? "The brazier's hot. 'forge <thing>' to work one, or 'look' to step back into the world."
            : "Your kit's laid out. 'stash'/'unstash'/'vault' to sort, or 'look' to step back into the world.");
      }
      // Each stance keeps its own work safe; anything else (a 'look', a step, a
      // swing) walks you back into the world first. 'say' is quiet enough to
      // stay in any stance; a foreign keeping-command (e.g. 'forge' at the hatch)
      // cleanly switches stances by leaving this one, then entering that one.
      const v = stepCmd.verb;
      const stay = session.trading
        ? (v === "barter" || v === "buy" || v === "offer" || v === "say")
        : session.forging
          ? (v === "forge" || v === "say")
          : session.bountying
            ? (v === "bounty" || v === "say")
            : (v === "inventory" || v === "stash" || v === "unstash" || v === "vault" || v === "unvault" || v === "say");
      if (!stay) await this.leaveStep(session); // anything else rejoins the world first
      await this.dispatch(session, stepCmd);
      this.syncCombatCtx();
      return;
    }

    // Stepped out via a modal (chip path)? The typed world is on hold — use the
    // modal, or close it.
    if (session.away) {
      return this.send(session, session.trading
        ? "You're at the keeper's hatch. Close the trade to step back into the world."
        : session.forging
          ? "You're at the forge. Close it to step back into the world."
          : session.bountying
            ? "You're at the bounty board. Close it to step back into the world."
            : this.world!.entryRooms.has(session.roomId)
              ? "You're sorting your kit at the gatehouse. Close the bench to step back into the world."
              : "You're crouched over your lockbox. Close it to get your head up and act.");
    }

    const text: string = frame.text;
    const cmd = parse(text);
    if (!cmd) return;
    if ("miss" in cmd) {
      this.send(
        session,
        cmd.suggestion
          ? `The dungeon doesn't understand. Did you mean '${cmd.suggestion}'? ('help' lists everything.)`
          : `The dungeon doesn't understand that. Type 'help' for what it does.`,
      );
      return;
    }
    // Effort ends rest; watching and talking do not.
    const effort = cmd.verb === "go" || cmd.verb === "attack" || cmd.verb === "throw" || cmd.verb === "get" || cmd.verb === "drop" || cmd.verb === "burn";
    if (session.resting && effort) {
      session.resting = false;
      this.send(session, "You rise.");
      this.sendStatus(session); // the 'resting' pill must clear the instant you rise, not linger until the first combat round pushes the next status
    }
    // A POSTURE DROPS TO THE SAME LAW (rome, 2026-08-30). A hand held out toward
    // a door cannot survive its owner walking through it, and a man crouched
    // over the ground is not crouched once he is swinging. Silent, unlike the
    // rest: rising from a crouch is not news, and the room already sees what you
    // did instead. A gesture is not spoken over, so it needs no line of its own.
    if (session.pose && (effort || cmd.verb === "rest")) {
      session.pose = undefined;
      session.poseAt = undefined;
      session.poseRef = undefined;
      this.sendStatus(session);
    }
    await this.dispatch(session, cmd);
    this.syncCombatCtx();
  }

  // Ceremony needs calm. While something wants your blood, the careful acts —
  // chiseling stone, the gate's sealing rite, the lockbox, speaking to the
  // relays, choosing a name — are beyond you. (Also the future anti-PvP-cheat:
  // you can't insta-seal your pack the moment someone jumps you.)
  private static readonly NEEDS_CALM = new Set<Command["verb"]>([
    "carve", "claim", "stash", "unstash", "vault", "unvault", "publish", "name", "unlock",
    "listen", "dive", // an ear to the wall or a head under water: not with steel out
  ]);

  public async dispatch(session: Session, cmd: Command): Promise<void> {
    if (ZoneDO.NEEDS_CALM.has(cmd.verb) && this.inCombat(session)) {
      return this.send(session, "Not while something is trying to kill you.");
    }
    switch (cmd.verb) {
      case "help": return this.send(session, HELP_TEXT);
      case "look": return verbs.cmdLook(this, session, cmd.arg);
      case "go": return verbs.cmdGo(this, session, cmd.arg);
      case "say": return verbs.cmdSay(this, session, cmd.arg);
      case "shout": return verbs.cmdShout(this, session, cmd.arg);
      case "ring": return verbs.cmdRing(this, session, cmd.arg);
      case "attack": return this.cmdAttack(session, cmd.arg);
      case "throw": return this.cmdThrow(session, cmd.arg);
      case "stance": return verbs.cmdStance(this, session, cmd.arg);
      case "get": return verbs.cmdGet(this, session, cmd.arg);
      case "drop": return verbs.cmdDrop(this, session, cmd.arg);
      case "burn": return verbs.cmdBurn(this, session, cmd.arg);
      case "equip": return verbs.cmdEquip(this, session, cmd.arg);
      case "remove": return verbs.cmdRemove(this, session, cmd.arg);
      case "unlock": return this.cmdUnlock(session, cmd.arg);
      case "salvage": return gate.cmdSalvage(this, session, cmd.arg);
      case "forge": return gate.cmdForge(this, session, cmd.arg);
      case "smelt": return gate.cmdSmelt(this, session, cmd.arg);
      case "repair": return gate.cmdRepair(this, session, cmd.arg);
      case "barter": return gate.cmdBarter(this, session);
      case "bounty": return gate.cmdBounty(this, session, cmd.arg);
      case "dice": return dice.cmdDice(this, session, cmd.arg);
      case "roll": return dice.cmdRoll(this, session);
      case "stand": return dice.cmdStand(this, session);
      case "buy": return gate.cmdBuy(this, session, cmd.arg);
      case "offer": return gate.cmdOffer(this, session, cmd.arg);
      case "inventory": return verbs.cmdInventory(this, session);
      case "who": return verbs.cmdWho(this, session);
      case "census": return verbs.cmdCensus(this, session);
      case "name": return verbs.cmdName(this, session, cmd.arg);
      case "rest": return verbs.cmdRest(this, session);
      case "guard": case "lean": case "crouch": return verbs.cmdPose(this, session, cmd.verb);
      case "point": return verbs.cmdPoint(this, session, cmd.arg);
      case "beckon": return verbs.cmdBeckon(this, session, cmd.arg);
      case "whistle": return verbs.cmdWhistle(this, session);
      case "wave": case "nod": case "brow": return verbs.cmdCourtesy(this, session, cmd.verb, cmd.arg);
      case "dance": return verbs.cmdDance(this, session, cmd.arg);
      case "keen": return verbs.cmdKeen(this, session, cmd.arg);
      case "sing": return verbs.cmdSing(this, session, cmd.arg);
      case "eat": return verbs.cmdEat(this, session, cmd.arg);
      case "feed": return verbs.cmdFeed(this, session, cmd.arg);
      case "bandage": return verbs.cmdBandage(this, session, cmd.arg);
      case "light": return light.cmdLight(this, session, cmd.arg);
      case "sheet": return verbs.cmdSheet(this, session);
      case "leaderboard": return verbs.cmdLeaderboard(this, session);
      case "carve": return verbs.cmdCarve(this, session, cmd.arg);
      // The board hangs in the gatehouse and nowhere else. Out here these three
      // point at the door rather than failing silently — a player who learned
      // 'post' inside will try it outside exactly once.
      case "board": case "post": case "tear":
        return this.send(session, this.world!.entryRooms.has(session.roomId)
          ? "The board is inside, by the keeper's hatch. ('in' through the door.)"
          : "Nothing to pin anything to out here. The board hangs in the gatehouse, at any gate.");
      case "claim": return gate.cmdClaim(this, session, cmd.arg);
      case "stash": return gate.cmdStore(this, session, cmd.arg, "lockbox");
      case "unstash": return gate.cmdRetrieve(this, session, cmd.arg, "lockbox");
      case "vault": return gate.cmdStore(this, session, cmd.arg, "vault");
      case "unvault": return gate.cmdRetrieve(this, session, cmd.arg, "vault");
      case "publish": return this.cmdPublish(session, cmd.arg);
      case "map": return lore.cmdMap(this, session, cmd.arg);
      case "study": return lore.cmdStudy(this, session, cmd.arg);
      case "journal": return lore.cmdJournal(this, session);
      case "fish": return verbs.cmdFish(this, session);
      case "listen": return verbs.cmdListen(this, session, cmd.arg);
      case "dive": return verbs.cmdDive(this, session, cmd.arg);
      case "wash": return verbs.cmdWash(this, session);
      // 'in' and 'out' mean the nearest door. On a den site that is somebody's
      // own door off a public street (mig 172); everywhere else it is the gate's,
      // as it always was. den.cmdEnterDen returns false when no door here opens
      // to you, so the gatehouse keeps every case it ever had.
      case "enter":
        if (await den.cmdEnterDen(this, session, cmd.arg)) return;
        return gate.enterGatehouse(this, session);
      case "exit":
        if (den.cmdLeaveDen(this, session)) return;
        return this.leaveGatehouse(session);
      case "tell": return gate.cmdTell(this, session, cmd.arg);
      case "deal": return trade.cmdDeal(this, session, cmd.arg);
      // THE DENS (mig 162) — living somewhere, which is its own module.
      case "settle": return den.cmdSettle(this, session, cmd.arg);
      case "abandon": return den.cmdAbandon(this, session);
      case "bar": return den.cmdBar(this, session);
      case "bunk": return den.cmdBunk(this, session, cmd.arg);
      case "unbunk": return den.cmdUnbunk(this, session, cmd.arg);
      case "den": return den.cmdDen(this, session);
      case "stow": return den.cmdStow(this, session, cmd.arg);
      case "fetch": return den.cmdFetch(this, session, cmd.arg);
      case "smoke": return verbs.cmdSmoke(this, session, cmd.arg);
      case "cure": return verbs.cmdCure(this, session, cmd.arg);
      case "cook": return verbs.cmdCook(this, session, cmd.arg);
      case "squink": return verbs.cmdSquink(this, session);
      case "xyzzy": return verbs.cmdXyzzy(this, session);
    }
  }







  // Fire and light live in light.ts; this is the one read the spine keeps hot
  // (ai.carriesFire reads the same litUntil, so the two never disagree).
  public carriesLight(session: Session): boolean {
    return light.carriesLight(session);
  }

  // Is this room dark RIGHT NOW? The one choke-point every blind rule reads:
  // the born-dark rooms (DARK_ROOMS) plus wherever the gloam is standing —
  // so the dark that walks obeys every law the dark that stays already has.
  public isDark(roomId: string): boolean {
    // ...and a handful of places out there are still burning after dark
    // (NIGHT_LIT — three lamps the world keeps lit and the light around every
    // gatehouse door). A gloamed sky still puts them out: the gloam is a thing
    // that takes the light, and a lamp is exactly what it comes for.
    if (DARK_ROOMS.has(roomId) || events.gloamed(this, roomId)) return true;
    // THE ECLIPSE (2026-08-25). Totality takes the day itself, so the dark at
    // noon owns the mountain too — the band's night-blindness exemption below
    // was written for the ordinary clock, not for the sun being eaten. Like
    // the gloam, this comes for every lamp and every open slope.
    if (OUTDOOR_ROOMS.has(roomId) && eclipsePhase() === "active") return true;
    // THE MOUNTAIN DOES NOT GO BLIND AT NIGHT (rome, 2026-08-19). Every other
    // outdoor band in this world is under something — a canopy, a valley side,
    // a wall, weather off the sea — and "dark" there means you genuinely cannot
    // see your hand. A bare hillside has none of that: it is rock and snow with
    // the whole sky over it and nothing between, and snow throws back what light
    // there is. Applying the cave's blackness to open ground four thousand feet
    // up was the surface rule reaching ground it was never written for.
    //
    // The band keeps everything else the clock gives it — nightfall still turns,
    // the nocturnal lines still wake, the moon still rides its phases and gets
    // its lines — it simply does not take your eyes. A GLOAM still does (checked
    // above): that is a thing that comes and takes the light, and it is supposed
    // to work anywhere it can reach.
    if (this.regionOf(roomId) === "mountain") return false;
    if (!OUTDOOR_ROOMS.has(roomId) || !isNight() || isFullMoon()) return false;
    if (NIGHT_LIT.has(roomId)) return false;
    // A HOUSE WITH SOMEBODY IN IT HAS A FIRE IN IT. The only hearths still lit on
    // this ground are the ones wanderers moved into, so the settlement lights up
    // as it fills and goes dark again when the last holder lapses — the one
    // light on the surface that answers to the players rather than to the world.
    for (const d of this.dens.values()) if (d.roomId === roomId) return false;
    return true;
  }

  // A torch burning on the FLOOR (dropped by a hand, or fallen from a dead one):
  // while it lasts it lights the room for EVERYONE standing in it — light on the
  // stone is shared, unlike the torch you carry — and it's an open flame like any
  // other (fire-fear breaks from it, a lurker can't spring in its glow). It burns
  // its remaining life down and guts out (tickLights), and the dark returns.
  public roomLit(roomId: string): boolean {
    const until = this.groundTorch.get(roomId);
    if (!!until && Date.now() < until) return true;
    // A FIREKEEPER'S CLAMP burns while he does. Not a torch on the floor with a
    // clock on it — a banked mound that has been alight for days and will be
    // alight tomorrow. Kill him and the wood takes its dark back.
    return this.roomHasFirekeeper(roomId);
  }

  /** Is somebody's fire burning here? (A living firekeeper, tending it.) */
  public roomHasFirekeeper(roomId: string): boolean {
    for (const c of this.creatures.values()) {
      // THE CLAMP IS AT HIS HOME, NOT UNDER HIS FEET (rome, 2026-08-08, asking
      // whether the burner's fire lights a dark room). It does — but the first
      // cut read `c.roomId === roomId`, which made the fire follow the man
      // around the wood. A clamp is a turfed earth mound banked over days. It
      // does not walk. So it burns at the den he keeps, whether he is standing
      // in it or off fetching wood a room away, and it goes out when he does.
      //
      // Which is the better mechanic anyway: the fire is a PLACE. Six of them,
      // at rooms you can learn and come back to, in a region that is otherwise
      // pitch dark half of every cycle. Kill him and the wood takes one back.
      if (FIREKEEPERS.has(c.templateId) && (c.home ?? c.roomId) === roomId) return true;
    }
    return false;
  }

  // CAN THIS PERSON SEE, RIGHT HERE, RIGHT NOW (rome, 2026-08-03, standing in
  // the pitch dark next to another wanderer who had just kindled a torch:
  // "when another player has a torch, they should be able to light the room for
  // everyone in it"). He is right, and light in a shared room was only ever
  // half-wired: your OWN flame counted, and a torch set down on the FLOOR
  // counted for everyone, but a torch in another wanderer's hand lit nothing
  // for anybody but them. Two people could stand in the same dark, one of them
  // holding fire, and the other saw "you can see nothing under open sky".
  //
  // Three ways a room is lit for you, and they all end here now: your own hand,
  // the floor, or somebody else's hand. A lantern counts the same as a torch —
  // this is about SIGHT. (Fire is a different question with a different answer:
  // carriesFire/roomLit still decide what a beast will not walk up to, and the
  // hooded lantern is not fire for that purpose.)
  //
  // Someone standing INSIDE a gatehouse is out of the world and lights nothing
  // out in it, same as they can't be hit from out there.
  public litFor(session: Session): boolean {
    if (!this.isDark(session.roomId)) return true;
    if (this.carriesLight(session)) return true;
    if (this.roomLit(session.roomId)) return true;
    return this.roomHasBearer(session.roomId, session);
  }

  // Is anyone else standing here with a light in hand? Split out because the
  // room-description path needs to name it ("someone's torch throws your shadow
  // up the wall") as well as test it.
  public roomHasBearer(roomId: string, except?: Session): boolean {
    for (const s of this.sessions.values()) {
      if (s === except || s.roomId !== roomId || this.outOfWorld(s)) continue;
      if (this.carriesLight(s)) return true;
    }
    return false;
  }



  // Pack animals: strike one hyena and the rest of the pack in the room turns on
  // you as one. (The dire already hunts on sight, so this mostly gives the
  // grave-hyenas their teeth — the lesson is never fight just one.)
  private rousePack(session: Session, struck: Creature): void {
    if (!SCAVENGERS.has(struck.templateId)) return;
    let roused = 0;
    for (const other of this.creatures.values()) {
      if (other.id === struck.id || other.roomId !== session.roomId) continue;
      if (!SCAVENGERS.has(other.templateId) || other.target) continue;
      other.target = session.pubkey;
      ai.addGrudge(this, other, session.pubkey);
      roused++;
    }
    if (roused > 0) {
      this.send(session, "The pack turns on you as one — hackles up, all teeth.", "dmgin");
      this.roomFeed(session.roomId, `${session.name} has the whole pack now.`, session.pubkey, false);
    }
  }

  // THE MURDER. Strike a crow and the sky takes a side: every idle corvid
  // within CROW_ROUSE_RADIUS rooms hears it and turns on the same face, closing
  // one step at a time on the normal curious-walk. Same room = immediate (they
  // turn like the hyena pack); next room = the call draws them in (they come
  // looking). The struck bird's kin all hate the same hand, so a murder is one
  // thing with many wings — kill fast, or answer the whole sky.
  private rouseCrows(session: Session, struck: Creature): void {
    if (!CROWS.has(struck.templateId)) return;
    let roused = 0;
    for (const other of this.creatures.values()) {
      if (other.id === struck.id || !CROWS.has(other.templateId)) continue;
      if (other.target || other.asleep) continue;
      const d = this.roomDist(other.roomId, session.roomId);
      if (d === Number.POSITIVE_INFINITY || d > CROW_ROUSE_RADIUS) continue;
      // Same room: it turns on you at once. Nearby: the call draws it — odds
      // gated so a lone crow is dealable and a murder is not.
      if (d === 0 || chance(CROW_CALL_ODDS)) {
        other.target = session.pubkey;
        other.asleep = false;
        other.sleepUntil = undefined;
        ai.addGrudge(this, other, session.pubkey);
        roused++;
      }
    }
    if (roused > 0) {
      this.send(session, "A murder of crows turns on you as one — every wing in earshot is coming.", "dmgin");
      this.roomFeed(session.roomId, `${session.name} strikes a crow — and the whole murder takes it up.`, session.pubkey, false);
      this.roomSound(session.roomId, "Caws, from every direction, closing {dir}.");
    }
  }

  private async cmdAttack(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Attack what?");
    const barred = this.behindTheDoor(session);
    if (barred) return this.send(session, barred);
    const found = this.findCreatureIn(session.roomId, arg);
    // You cannot swing at what hasn't shown itself: an unseen lurker is not a
    // target, and naming it must not confirm it's there.
    const creature = found && this.lurkerUnseen(found, session) ? null : found;
    if (!creature) {
      // No beast by that name — but a wanderer's name reaches for steel too.
      const other = verbs.findPlayerIn(this, session.roomId, arg);
      if (other) return pvp.attackPlayer(this, session, other);
      return this.send(session, "Nothing by that name is here to fight.");
    }
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    // ...and it must refuse HERE too. The round's guard (tickCombat) only covers
    // the automatic beat; without this, typing `attack` at the summit's animal
    // while it is in the air swings anyway, and the ambush-opener path would
    // even pay the heavy first blow for it. Same hole the stun rule had.
    if (ai.airborne(creature)) {
      // A REACH WEAPON still finds it: a polearm's length, not a swing's arc.
      // Everything else swings at empty air (the round's guard does the same).
      if (!hasTrait(this.equippedItem(session, "weapon")?.tmpl, "reach")) {
        return this.send(session, `${cap(tmpl.name)} is somewhere above you. There is nothing there to hit.`, "dmgin");
      }
    }
    // Rung senseless: the swing is gone, whether the tick asked for it or YOU
    // did. The combat round (tickCombat) and the steel exchange (tickPvp) both
    // pay this debt, and the two VERBS never did — so a stunned player could
    // type `attack` and swing anyway, and if the thing hadn't marked them yet
    // they collected the AMBUSH_MULT opening blow for it. The stun was real the
    // whole time; it just cost nothing to anyone who kept typing.
    // Spent AFTER the target resolves, so a fumbled name doesn't eat the debt,
    // and BEFORE initiative, so the free heavy blow is what you lose.
    if (session.stunned) {
      session.stunned = false;
      this.send(session, "Your head still rings — the moment to swing slips past you.", "stun");
      this.sendStatus(session);
      return;
    }
    // Initiative: strike something that hasn't marked you — no fight on, no
    // grudge held — and the first blow lands heavy, before it can answer.
    // A SLEEPER is unaware by definition (grudge or not: it's asleep) — the
    // one heavy blow is what sleep grants, and the blow ends the sleep. Never
    // a coup de grace: it wakes swinging (the sentinel rouse law, reused).
    const wasAsleep = !!creature.asleep;
    // A WARY creature is never caught off guard (mob trait lottery).
    const unaware = !creature.traits?.includes("wary") && (wasAsleep || (!creature.target && !ai.remembers(this, creature, session.pubkey, Date.now())));
    creature.asleep = false;
    creature.sleepUntil = undefined;
    session.target = creature.id;
    creature.hidden = false; // a lurker you've struck is unseen no longer — reveal it (room, chip, study)
    if (SENTINELS.has(creature.templateId)) creature.wakeUntil = Date.now() + HOUND_WAKE_MS; // a blow rouses a sleeping guardian
    this.rousePack(session, creature); // hyenas: strike one and the pack turns on you
    this.rouseCrows(session, creature); // crows: strike one and the murder rises
    if (unaware) {
      const weapon = this.equippedItem(session, "weapon");
      let dmg = Math.round(
        (randInt(PLAYER_DMG_MIN, PLAYER_DMG_MAX) + (weapon ? this.effDmg(weapon) : 0)) *
          STANCE[session.stance].atk * this.wallDrag(session) * AMBUSH_MULT,
      );
      if (session.hp < session.maxHp * WOUNDED_FRACTION) { dmg = Math.round(dmg * WOUNDED_DMG_MULT); this.tellWounded(session); }
      // No crit on top: the surprise IS the crit. (Stacked, a pebble
      // one-shots skeletons; unstacked, an ambush is strong, not a cannon.)
      // A point slips plate, a blunt weapon caves it: both ignore that much armor.
      dmg = Math.max(1, dmg - Math.max(0, ai.mobArmor(tmpl, creature) - this.armorIgnore(weapon)));
      creature.hp -= dmg;
      // ...and the opener can find the throat like any other landed blow. The
      // vitals line REPLACES the "one heavy blow" report rather than following
      // it: "it never wakes" and "you open its throat" are two accounts of the
      // same second, and only one of them is what happened.
      const avitals = this.playerVitals(creature, tmpl, weapon);
      if (avitals) creature.hp = 0;
      this.markHurt(creature, tmpl, session.pubkey);
      ai.addGrudge(this, creature, session.pubkey);
      this.actorFeed(session, session.roomId, wasAsleep
        ? `${session.name} falls on ${tmpl.name} in its sleep!`
        : `${session.name} falls on ${tmpl.name} without warning!`);
      this.combatNoise(session.roomId);
      if (weapon) await this.wear(session, weapon.carried, weapon.tmpl, HOLLOW.has(tmpl.id) ? WEAPON_WEAR_HOLLOW : WEAPON_WEAR);
      if (creature.hp <= 0) {
        if (!avitals) this.send(session, wasAsleep
          ? `You fall on ${tmpl.name} in its sleep — one heavy blow, for ${dmg}. It never wakes.`
          : `You fall on ${tmpl.name} before it marks you — one heavy blow, for ${dmg}.`, "dmgout big");
        await this.onCreatureDeath(session, creature, tmpl,
          avitals ? this.playerVitalsVerb(weapon, tmpl.name) : undefined, avitals);
        await this.ensureAlarm();
        return;
      }
      creature.target = session.pubkey;
      this.send(session, wasAsleep
        ? `You fall on ${tmpl.name} in its sleep — the blow lands heavy for ${dmg}, and it comes awake SWINGING. (${this.condition(creature)})`
        : `You fall on ${tmpl.name} before it marks you — the first blow lands heavy for ${dmg}. (${this.condition(creature)})`, "dmgout big");
      // A BLUNT opener spends your whole beat: the heavy head takes its time coming
      // back up, so the foe answers before you swing again. A finesse weapon (edged
      // or piercing) recovers quick and keeps its opener-plus-swing (rome, 2026-07-17).
      if ((weapon?.tmpl.stun ?? 0) > 0) session.openedHeavy = true;
      if (tmpl.is_boss) ai.bossPhase(this, creature, tmpl, session);
      await this.ensureAlarm();
      return;
    }
    if (!creature.target) creature.target = session.pubkey;
    ai.addGrudge(this, creature, session.pubkey);
    this.send(session, pick([
      `You square up against ${tmpl.name}.`,
      `You set your feet and turn on ${tmpl.name}.`,
      `You close on ${tmpl.name}, blood up.`,
      `You round on ${tmpl.name} and ready yourself.`,
    ]));
    this.actorFeed(session, session.roomId, `${session.name} attacks ${tmpl.name}!`);
    // A fight is loud, but the blind sentinels sleep through the din now — only
    // a lurker in the room strikes at the sound (WAKE_NOISE, fromNoise).
    await ai.wakeListeners(this, session, session.roomId, WAKE_NOISE, "clatters awake at the noise and turns on you!", true);
    await this.ensureAlarm();
  }



  // A thrown thing: its own bite plus the arm behind it — resolved on the spot,
  // not on the tick. Then it lies where the fight is, anyone's to take back.
  private async cmdThrow(session: Session, arg: string): Promise<void> {
    const barred = this.behindTheDoor(session);
    if (barred) return this.send(session, barred);
    if (!arg) return this.send(session, "Throw what? (throw <item> at <creature>)");
    const world = this.world!;
    let itemArg = arg;
    let targetArg = "";
    const atIdx = arg.indexOf(" at ");
    if (atIdx >= 0) {
      itemArg = arg.slice(0, atIdx).trim();
      targetArg = arg.slice(atIdx + 4).trim();
    }
    const carried = this.findCarried(session, itemArg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    if (carried.serial !== null) {
      return this.send(session, "You will not cast away what the gate has sealed. Drop it first, if you must.");
    }
    const itmpl = world.itemTemplates.get(carried.itemId)!;
    let creature = targetArg
      ? this.findCreatureIn(session.roomId, targetArg)
      : session.target
        ? this.creatures.get(session.target) ?? null
        : null;
    // Same law as the blade: you can't hurl a stone at a thing you haven't seen.
    if (creature && this.lurkerUnseen(creature, session)) creature = null;
    if (creature && creature.roomId !== session.roomId) creature = null;
    // Named a foe that isn't here: that's a miss of the tongue, not the arm.
    if (!creature && targetArg) return this.send(session, "Nothing by that name is here.");
    // No foe to hit: this is a NOISE-throw. Hurl something hard into the room to
    // clatter and draw what's listening nearby (a distraction, a lure, a way to
    // pull one thing off a pack). Soft things just thud and carry nothing.
    if (!creature) return this.throwForNoise(session, carried, itmpl);
    const tmpl = world.mobTemplates.get(creature.templateId)!;

    // Rung senseless: the arm owes the same debt the blade does. Placed BELOW
    // the noise-throw, deliberately — the daze costs you the AIMED throw, not
    // the ability to fling something into a corner and listen. You can still be
    // clever while your head rings; you just can't hit anything with it.
    if (session.stunned) {
      session.stunned = false;
      this.send(session, "Your head still rings — your arm won't find the line.", "stun");
      this.sendStatus(session);
      return;
    }

    // One throw per round: the arm owes its follow-through. (Without this, a
    // recycled rock out-damages a graveblade — the machine-gun, not the sling.)
    const nowMs = Date.now();
    if (nowMs < session.nextThrowAt) {
      return this.send(session, "Your arm is still following through — a beat, then throw again.");
    }
    session.nextThrowAt = nowMs + THROW_COOLDOWN_MS;

    // A sleeper never sees it coming, grudge or no; the impact ends the sleep.
    const unaware = !creature.traits?.includes("wary") && (!!creature.asleep || (!creature.target && !ai.remembers(this, creature, session.pubkey, Date.now())));
    creature.asleep = false;
    creature.sleepUntil = undefined;
    creature.hidden = false; // hurling at a lurker outs it too — reveal it (room, chip, study)
    if (SENTINELS.has(creature.templateId)) creature.wakeUntil = Date.now() + HOUND_WAKE_MS; // a thrown stone rouses a sleeping guardian too
    this.rousePack(session, creature); // hyenas: a thrown blow turns the pack too
    this.rouseCrows(session, creature); // crows: a thrown stone rouses the murder too
    // Every attack is a gamble — thrown ones too. A wild throw still leaves
    // your hand (and still wakes what it nearly hit).
    if (chance(FUMBLE_CHANCE + (session.hp < session.maxHp * WOUNDED_FRACTION ? WOUNDED_FUMBLE_BONUS : 0))) {
      session.items.splice(session.items.indexOf(carried), 1);
      await removeItemRow(this.env.DB, carried.rowId);
      if (carried.serial !== null) await voidMint(this.env.DB, carried.serial);
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), carried.itemId]);
      this.stampFresh(session.roomId, carried.itemId);
      if (itmpl.edible && !FOOD_KEEPS.has(carried.itemId)) this.rot.push({ itemId: carried.itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
      if (!creature.target) creature.target = session.pubkey;
      ai.addGrudge(this, creature, session.pubkey);
      session.target = creature.id;
      this.send(session, `Your throw sails wide — ${throwLand(this.regionOf(session.roomId), this.gearName(itmpl.id))}. ${cap(tmpl.name)} turns on you.`);
      this.actorFeed(session, session.roomId, `${session.name} hurls ${this.gearName(itmpl.id)} — and misses.`);
      this.combatNoise(session.roomId);
      this.refreshRoomCtx(session.roomId);
      this.markSimDirty();
      await this.ensureAlarm();
      return;
    }
    let dmg = randInt(THROW_DMG_MIN, THROW_DMG_MAX) + this.effStat(itmpl.dmg, carried.condition);
    dmg = Math.round(dmg * STANCE[session.stance].atk * this.wallDrag(session));
    if (session.hp < session.maxHp * WOUNDED_FRACTION) dmg = Math.round(dmg * WOUNDED_DMG_MULT);
    // Surprise IS the crit: an ambush throw never double-dips a crit roll.
    let flourish = unaware ? " — it never saw it coming!" : ".";
    if (unaware) dmg = Math.round(dmg * AMBUSH_MULT);
    else if (chance(CRIT_CHANCE)) {
      dmg *= 2;
      flourish = " — a savage throw!";
    }
    dmg = Math.max(1, dmg - ai.mobArmor(tmpl, creature));

    // It leaves your hands for good. Whether it survives the landing is the
    // stone's business: impact can shatter it — near-certain against bone
    // and old iron (the hollow) — and gone is gone.
    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    const shattered = THROW_TOUGH.has(carried.itemId)
      ? false // the hammerstone survives every landing — dense past its size
      : chance(HOLLOW.has(tmpl.id) ? THROW_SHATTER_HOLLOW : THROW_SHATTER);
    if (!shattered) {
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), carried.itemId]);
      this.stampFresh(session.roomId, carried.itemId);
      if (this.isGear(carried.itemId)) this.groundCond.set(`${carried.itemId}@${session.roomId}`, carried.condition); // a thrown blade (or stone) keeps its wear where it lands
      if (carried.loreId) this.groundLore.set(`${carried.itemId}@${session.roomId}`, carried.loreId); // and the engraving rides the landing
      if (carried.rolledTraits) this.groundRolled.set(`${carried.itemId}@${session.roomId}`, carried.rolledTraits); // and whatever it rolled (099)
      if (itmpl.edible && !FOOD_KEEPS.has(carried.itemId)) this.rot.push({ itemId: carried.itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
      // A thrown consumable lies off its spawn floor now — the stray law applies
      // the same as a drop (this landing was the gap that let thrown copies
      // litter forever while dropped ones spoiled).
      this.armStrayDecay(session.roomId);
    }

    creature.hp -= dmg;
    // A thrown point can find the heart too. Gated on the THROWN item, not on
    // whatever is still in your hand — see playerVitals.
    const tvitals = this.playerVitals(creature, tmpl, { tmpl: itmpl });
    if (tvitals) creature.hp = 0;
    this.markHurt(creature, tmpl, session.pubkey);
    ai.addGrudge(this, creature, session.pubkey);
    session.target = creature.id;
    this.actorFeed(session, session.roomId, `${session.name} hurls ${this.gearName(itmpl.id)} at ${tmpl.name}!`);
    this.combatNoise(session.roomId);
    const landing = shattered ? " It shatters on impact." : ` It lands on ${groundWord(this.regionOf(session.roomId), session.roomId)}.`;
    if (creature.hp > 0) {
      if (!creature.target) creature.target = session.pubkey;
      this.send(session, `You hurl ${this.gearName(itmpl.id)} — it strikes ${tmpl.name} for ${dmg}${flourish} (${this.condition(creature)})${landing}`);
      // A blunt throw — a rock off the skull — can ring it senseless for a beat.
      // Same rule as a melee stun: not the boss, and no chaining a reeling thing.
      if (itmpl.stun > 0 && !tmpl.is_boss && !creature.stunned && chance(itmpl.stun)) {
        creature.stunned = true;
        this.send(session, `${cap(tmpl.name)} reels, stunned.`, "stun");
        this.roomFeed(session.roomId, `${cap(tmpl.name)} staggers where it stands.`, session.pubkey, false); // local: mob reaction
      }
      if (tmpl.is_boss) ai.bossPhase(this, creature, tmpl, session);
    } else {
      // Where the thing you threw ended up is still news, so the landing is
      // reported either way — but on a vitals hit the killing line comes from
      // the throw, not from the damage roll.
      if (tvitals) this.send(session, `You hurl ${this.gearName(itmpl.id)} at ${tmpl.name}.${landing}`);
      else this.send(session, `You hurl ${this.gearName(itmpl.id)} — it strikes ${tmpl.name} for ${dmg}${flourish}${landing}`);
      await this.onCreatureDeath(session, creature, tmpl,
        tvitals ? this.playerVitalsVerb({ tmpl: itmpl }, tmpl.name) : undefined, tvitals);
    }
    this.refreshRoomCtx(session.roomId);
    this.markSimDirty();
    await this.ensureAlarm();
  }

  // A throw with no foe to hit: hurl something hard to make NOISE. It clatters
  // off the stone, lies where it falls (yours to take back), and the sound
  // carries — heard next door and drawing the idle curious your way. It can also
  // rouse a lurker lying in wait right here, so it's a lure that can bite back.
  private async throwForNoise(session: Session, carried: CarriedItem, itmpl: ItemTemplate): Promise<void> {
    if (itmpl.edible) {
      return this.send(session, `${this.gearName(itmpl.id, cap(itmpl.name))} would land with a soft, wet thud — too quiet to draw anything. Throw something hard.`);
    }
    const nowMs = Date.now();
    if (nowMs < session.nextThrowAt) {
      return this.send(session, "Your arm is still following through — a beat, then throw again.");
    }
    session.nextThrowAt = nowMs + THROW_COOLDOWN_MS;
    // It leaves your hand and lies where it falls — no target, so no shatter roll.
    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), carried.itemId]);
    this.stampFresh(session.roomId, carried.itemId);
    if (this.isGear(carried.itemId)) this.groundCond.set(`${carried.itemId}@${session.roomId}`, carried.condition); // wear rides the landing
    if (carried.loreId) this.groundLore.set(`${carried.itemId}@${session.roomId}`, carried.loreId); // the engraving too
    if (carried.rolledTraits) this.groundRolled.set(`${carried.itemId}@${session.roomId}`, carried.rolledTraits); // its roll too (099)
    // The noise-throw's landing obeys the stray law too — a lure you retrieve
    // in minutes never notices; only the abandoned copy spoils.
    this.armStrayDecay(session.roomId);
    this.send(session, `You hurl ${this.gearName(itmpl.id)} — ${throwLand(this.regionOf(session.roomId), "it")} — the sound carries.`);
    this.roomFeed(session.roomId, `${session.name} sends ${this.gearName(itmpl.id)} clattering across the room.`, session.pubkey, false);
    // The clatter: players next door hear it (WS-only, no relay flood), the idle
    // curious drift in to look, and any lurker here may drop on the noise.
    this.roomSound(session.roomId, "Something clatters {dir}.");
    this.creatureNoise(session.roomId);
    await ai.wakeListeners(this, session, session.roomId, WAKE_NOISE, "drops from the dark, roused by the clatter!", true);
    this.refreshRoomCtx(session.roomId);
    this.markSimDirty();
    await this.ensureAlarm();
  }




  // A locked cache: spend the right key to open it, take what it holds. The key
  // is consumed and the box springs empty, refilling on a slow clock. A key is
  // The bell door's answer to anyone trying to force it, in both its states.
  private bellDoorRefusal(session: Session): void {
    this.send(session, events.bellOpen(this)
      ? "The hatch overhead stands open already — the bell's note is in the iron of it. Go up."
      : "The hatch overhead will not move. It has no lock to force and no latch to turn, and it does not answer to any hand.", "dmgin");
  }

  // never wasted — a spent lock always gives up at least one thing.
  private async cmdUnlock(session: Session, arg: string): Promise<void> {
    const world = this.world!;
    // THE TIDE DOOR'S SILL (2026-08-28). 'pry'/'unlock'/'open' at the deep
    // mark works the tide door — the one lock in the world with no lock on it.
    // Naming the door always means the door; a bare pry means the door when
    // the room has no chest in it (a roaming chest that lands here keeps the
    // bare verb for itself).
    const doorHere = world.exits.get(session.roomId)?.some((e) => e.key_item === TIDE_DOOR_KEY);
    if (doorHere && arg && /^(tide )?door$|^sill$/.test(arg)) {
      return this.cmdTideDoorPry(session);
    }
    // THE BELL DOOR has no lock to force — 'open door' in the cote gets the
    // door's own refusal, teaching the bell's law instead of a shrug about
    // nothing to unlock. It takes the BELL's words: the pattern here was the
    // tide door's, copied, which meant "open bell door" — the phrasing the
    // room's own text teaches — fell through to "there's nothing here to
    // unlock", while "open sill" and "open tide door" answered in a belfry.
    const bellHere = world.exits.get(session.roomId)?.some((e) => e.key_item === BELL_DOOR_KEY);
    if (bellHere && arg && /^(bell |black )?door$|^hatch$|^trap ?door$/.test(arg)) {
      return this.bellDoorRefusal(session);
    }
    // THE WETHER'S BELL (the depth audit, 2026-08-29). Its clapper is bound up
    // in wire — "somebody stopped it ringing on purpose" — and the glassed
    // stone's own text always promised an edge sharp enough to open a hand.
    // Unbinding is the two near-orphans paying each other off: the stone is
    // spent, the bell gets its voice back.
    // THE WORDS A PLAYER ACTUALLY TYPES (2026-08-30). This matched /^wether/ and
    // nothing else, so `cut the wire`, `unlock bell` and `cut clapper` — every
    // phrasing the hint itself suggests — fell through to "there's nothing here
    // to unlock". It now answers to the bell, the wire and the clapper, and it
    // is gated on HOLDING one rather than erroring: somebody without a wether's
    // bell typing `unlock bell` in a room with a chest in it should get the
    // chest, not a lecture about a bell they have never seen.
    const wether = session.items.find((c) => c.itemId === "wether-bell");
    if (wether && arg && /wether|wire|clapper|^(the )?bell$/.test(arg)) {
      const glass = session.items.find((c) => c.itemId === "glassed-stone");
      if (!glass) {
        return this.send(session, "The clapper is bound up in wire — somebody stopped it ringing on purpose, and it makes no sound. The wire would take a glass edge. (with a glassed stone in hand: cut the wire)", "dmgin");
      }
      // The cut spends the stone, so the bell must have somewhere to land
      // BEFORE the wire parts — a full pack would eat the stone and drop
      // nothing for it.
      if (!this.packRoom(session, "wether-bell-free")) {
        return this.send(session, "Your pack is full. Make room before you cut the wire — the stone is spent either way.", "dmgin");
      }
      await removeItemRow(this.env.DB, glass.rowId);
      session.items.splice(session.items.indexOf(glass), 1);
      await removeItemRow(this.env.DB, wether.rowId);
      session.items.splice(session.items.indexOf(wether), 1);
      await this.grantItem(session, "wether-bell-free", { kept: true });
      this.send(session, "You work the glass edge under the wire and it parts with a dry sound, like a stitch giving. The clapper swings free. The bell answers the first shake of it — flat and plain, a sheep-bell's note, and glad of it.", "unlock");
      this.roomFeed(session.roomId, `${session.name} cuts something free with a shard of glass, and a small bell rings for the first time in a long while.`, session.pubkey, false);
      return;
    }
    // THE POUR (the depth audit, 2026-08-29). The bellfounder has been waiting
    // two centuries for a pour that never came — "there is no pour," and the
    // waiting has kept the pit warm. While he lives, the mould will take
    // bell-metal and give the cast. Bias, never a trigger — the pour was
    // always optional.
    //
    // KILLING HIM SHUTS THE POUR FOR AS LONG AS HE IS DOWN, and no longer: his
    // respawn is 1500s. The drafted line here said the pour was over forever
    // and so did the refusal the player read, which was simply not true —
    // twenty-five minutes later he is back at the mould. A room that lies to
    // you about a consequence is worse than one that has none.
    // A BARE `pour` IS THE POUR (2026-08-30). The refusal says "a lump of it, and
    // the pour", so `pour` on its own is the obvious thing to type and it was the
    // one phrasing that missed. It only claims the bare verb when the room has no
    // chest in it — the same courtesy the tide door gets, so a roaming strongbox
    // that lands in the pit keeps `unlock` for itself.
    if (session.roomId === "the-bell-pit"
      && (arg ? /mould|mold|pour|cast|metal|^(the )?pit$/.test(arg)
              : !world.caches.some((c) => this.cacheRoomId(c) === session.roomId))) {
      const founder = [...this.creatures.values()].find((c) => c.templateId === "the-bellfounder");
      if (!founder) {
        return this.send(session, "The casting pit is going cold. The founder is not here to tap the mould, and nothing runs without him — whatever is waiting in it goes on waiting until somebody stands over it again.", "dmgin");
      }
      if (founder.roomId !== session.roomId) {
        return this.send(session, "The pit is warm, but the founder is not here to tap the mould. The pour waits for him.", "dmgin");
      }
      const metal = session.items.find((c) => c.itemId === "bell-metal");
      if (!metal) {
        return this.send(session, "The mould is still waiting, and the pit is warm because the founder has never let it go cold. It wants bell-metal — a lump of it, and the pour.", "dmgin");
      }
      // The pour spends the metal, so the cast must have somewhere to land
      // BEFORE the run — a full pack would drink the metal and drop nothing
      // for it.
      if (!this.packRoom(session, "cast-clapper")) {
        return this.send(session, "Your pack is full. Make room before the pour — the metal goes into the mould either way.", "dmgin");
      }
      await removeItemRow(this.env.DB, metal.rowId);
      session.items.splice(session.items.indexOf(metal), 1);
      await this.grantItem(session, "cast-clapper", { kept: true });
      this.send(session, "You lay the bell-metal in the pour. The founder watches it run, taps the side of the mould, and listens — and this time the note comes back true. Two centuries late, the cast is finally in.", "unlock");
      this.roomFeed(session.roomId, `${session.name} pours the bell-pit, and the founder stands over the mould listening to a note that is finally right.`, session.pubkey, false);
      return;
    }
    const here = world.caches.filter((c) => this.cacheRoomId(c) === session.roomId);
    if (!here.length) {
      // A bare verb goes to the door only when the room has no chest to claim
      // it — the same courtesy the tide door gets, and for the same reason: a
      // roaming chest that lands in the cote keeps the bare verb for itself.
      if (doorHere && !arg) return this.cmdTideDoorPry(session);
      if (bellHere && !arg) return this.bellDoorRefusal(session);
      return this.send(session, "There's nothing here to unlock.");
    }
    // TWO CHESTS CAN SHARE A ROOM (rome, 2026-08-13: he found a strongbox and a
    // meal-chest in the same hollow). That is the roaming law working — each
    // chest picks its refill room independently, so now and then two land
    // together — but this line took whichever sat first in the table, locked or
    // not, keyed or not. Standing over a sprung strongbox and a locked
    // meal-chest, a bare 'unlock' answered "hangs open and empty" and the second
    // chest could not be reached at all. So the verb picks the one it can
    // actually do something with: a chest you hold the key to first, then any
    // still-locked chest, then whatever is left to give the honest refusal
    // about. The same ranking runs inside a name match, so 'unlock strongbox'
    // with a spent one and a full one beside it reaches for the full one.
    const rank = (c: Cache) =>
      (this.cacheLocked(c) ? 2 : 0) + (session.items.some((i) => i.itemId === c.keyItem) ? 1 : 0);
    const best = (pool: Cache[]) =>
      pool.reduce((a, b) => (rank(b) > rank(a) ? b : a), pool[0]);
    const named = arg ? here.filter((c) => nameMatches(c.name, arg)) : [];
    const cache = named.length ? best(named) : best(here);
    const keyT = world.itemTemplates.get(cache.keyItem);
    if (!this.cacheLocked(cache)) {
      return this.send(session, `${cap(cache.name)} hangs open and empty. Give it time to be worth forcing again.`);
    }
    // ONE OPENING AT A TIME (2026-08-20). Two fast `unlock` frames could both
    // roll the same box's loot — a key AND a rock spent, two payouts from one
    // chest. A mid-flight marker (timestamped, so a frame killed by a throw
    // can't block the latch forever) turns the second frame away at the door.
    const working = this.cacheOpening.get(cache.id);
    if (working !== undefined && Date.now() - working < 30_000) {
      return this.send(session, "That latch is already being worked — hold on.");
    }
    const key = session.items.find((c) => c.itemId === cache.keyItem);
    // AN UNKEYED PRIZE BOX opens to the hand: the door was the lock (see
    // DOOR_PRIZE_BOXES), so there is nothing here to force and nothing to
    // spend. The refill clock starts BEFORE the grant awaits below, exactly
    // like the keyed path — a racing second frame reads cacheLocked() false
    // and turns away instead of re-opening the same box.
    if (cache.keyItem === "") {
      this.cacheSpent.set(cache.id, Date.now() + cache.refillSecs * 1000);
      this.placeCache(cache);
      this.send(session, `There is no lock on ${cache.name}. You lift the lid, and it gives like a thing that has been waiting.`, "unlock");
      this.roomFeed(session.roomId, `${session.name} opens ${cache.name}.`, session.pubkey, false);
    } else if (!key) {
      // No key — then the old way: a rock against the latch (rome, 2026-07-11).
      // Any strongbox latch gives to stone — notched-key shallow or warden-key
      // deep (086 split the keys, not the latches); only the reliquary's iron
      // takes a king's key, not geology. The plain rock is spent by the trying,
      // opened or not; the hammerstone survives every landing, latches included.
      // The rock you SWING is the rock in your hand: prefer the equipped stone
      // within each tier, so the one that shatters is the one you were wielding —
      // not some spare deeper in the pack while your weapon sails through untouched
      // (rome, 2026-07-17: "it said it crumbled but I still have it in my hand").
      // Hammerstone still beats a loose rock (the better tool answers first).
      const stone = session.items.find((c) => c.itemId === "hammerstone" && c.equipped)
        ?? session.items.find((c) => c.itemId === "hammerstone")
        ?? session.items.find((c) => c.itemId === "loose-rock" && c.equipped)
        ?? session.items.find((c) => c.itemId === "loose-rock");
      if (!stone || cache.keyItem === "reliquary-key") {
        return this.send(session, `${cap(cache.name)} is locked. You'd need ${keyT?.name ?? "the right key"}${cache.keyItem !== "reliquary-key" ? " — or a rock, and no respect for latches" : ""}.`);
      }
      const hammer = stone.itemId === "hammerstone";
      // Claim the latch synchronously, before any await — the double-frame
      // guard above keys on this marker. A failed smash below does not keep
      // it: the box stays locked and honestly retryable, so the marker just
      // ages out.
      this.cacheOpening.set(cache.id, Date.now());
      if (!hammer) {
        session.items.splice(session.items.indexOf(stone), 1);
        await removeItemRow(this.env.DB, stone.rowId);
      }
      // Hammering iron is a dinner bell: everything in earshot hears it.
      this.roomSound(session.roomId, "Stone rings on iron {dir}, again and again.");
      this.creatureNoise(session.roomId);
      const opened = chance(hammer ? HAMMERSTONE_SMASH_ODDS : ROCK_SMASH_ODDS);
      // Every latch takes its toll on the stone (rome: like the lantern, and
      // nothing mends it) — win or lose, the blow costs. Spent, it cracks
      // through and is gone.
      let stoneSpent = false;
      if (hammer) {
        stone.condition -= STONE_WEAR;
        if (stone.condition <= 0) {
          stoneSpent = true;
          session.items.splice(session.items.indexOf(stone), 1);
          await removeItemRow(this.env.DB, stone.rowId);
        } else {
          await setItemCondition(this.env.DB, stone.rowId, stone.condition);
        }
      }
      if (!opened) {
        this.send(session, hammer
          ? "You bring the hammerstone down on the latch. It RINGS — the whole floor hears it — but the latch holds."
          : "You bring the rock down on the latch. The rock comes apart in your hands; the latch holds.", "dmgin");
        if (stoneSpent) this.send(session, "And the hammerstone cracks through, dead down its middle. It falls away in halves — spent.", "dmgin");
        this.sendCtx(session);
        return;
      }
      this.send(session, hammer
        ? `You bring the hammerstone down on the latch, twice, and the second blow tears it off whole. ${cap(cache.name)} swings open.`
        : `You bring the rock down and both give at once — the rock in pieces, the latch in half. ${cap(cache.name)} swings open.`, "unlock");
      if (stoneSpent) this.send(session, "The hammerstone gave its last argument to that latch — it cracks through and falls away in halves.", "dmgin");
      this.roomFeed(session.roomId, `${session.name} smashes ${cache.name} open.`, session.pubkey, false);
      this.cacheSpent.set(cache.id, Date.now() + cache.refillSecs * 1000);
      this.placeCache(cache); // looted: it will refill somewhere new in its tier (hidden here until then)
    } else {
      // Spend the key and start the refill clock. The clock starts BEFORE the
      // D1 await (the double-frame guard, 2026-08-20): a racing second frame
      // reads cacheLocked() on entry and turns away instead of re-opening the
      // same box.
      this.cacheSpent.set(cache.id, Date.now() + cache.refillSecs * 1000);
      session.items.splice(session.items.indexOf(key), 1);
      await removeItemRow(this.env.DB, key.rowId);
      this.placeCache(cache); // looted: it will refill somewhere new in its tier (hidden here until then)
      this.send(session, `You work ${keyT?.name ?? "the key"} into the lock. It gives with a groan, and ${cache.name} swings open.`, "unlock");
      this.roomFeed(session.roomId, `${session.name} forces ${cache.name} open.`, session.pubkey, false);
    }
    // Now and then the box is a lie: forced open on nothing. The key's already
    // spent and the refill clock's already running, so a dud costs you the same
    // as a haul — that's the sting. The prize boxes are exempt: each one's
    // price was paid at its DOOR (a boss and the black key; a riddle; a full
    // moon; the tide), and a dud would be too bitter on top of that.
    if (!DOOR_PRIZE_BOXES.has(cache.id) && chance(CACHE_EMPTY_ODDS)) {
      this.send(session, pick([
        "Inside: nothing. Picked clean long before you, or never worth the forcing. The key's spent all the same.",
        "The lid comes up on bare iron and cold air. Empty. Someone was here first, or nothing ever was.",
        "Nothing. Cobwebs, grit, and a lock you'll have to feed another key to try again.",
        "Empty — whatever it held is long gone. You forced it for the smell of old dust.",
      ]));
      this.sendCtx(session);
      await this.persist();
      return;
    }
    // Roll the pool; a key always yields something, so if nothing hits, one is
    // granted anyway (the richest chance).
    const won = cache.loot.filter((e) => chance(e.chance));
    if (won.length === 0 && cache.loot.length) {
      won.push([...cache.loot].sort((a, b) => b.chance - a.chance)[0]);
    }
    for (const entry of won) {
      const item = world.itemTemplates.get(entry.itemId);
      if (!item) continue;
      // Into the pack if it fits; if you're full, it spills to the floor rather
      // than vanish — pick it up when you've made room. Coffer gear is `kept` —
      // stored and preserved, so it comes out better than corpse-stripped gear.
      const rolled = this.rollTraits(item); // one roll, used whichever way it lands (099)
      if (await this.grantItem(session, item.id, { kept: true, rolledTraits: rolled })) {
        this.send(session, `Inside: ${this.gearName(item.id)}.${this.itemStat(item)}${this.rarityTag(item)} ${this.lootSuffix(item)}`);
      } else {
        this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), item.id]);
        this.stampFresh(session.roomId, item.id);
        if (item.slot !== "") this.groundCond.set(`${item.id}@${session.roomId}`, rollGearCondition(item.slot, true));
        if (rolled) this.groundRolled.set(`${item.id}@${session.roomId}`, rolled);
        this.send(session, `Inside: ${this.gearName(item.id)}.${this.itemStat(item)}${this.rarityTag(item)} — but your pack is full, so it falls at your feet.`);
      }
    }
    this.refreshRoomCtx(session.roomId);
    this.sendCtx(session);
    await this.persist();
  }

  // THE TIDE DOOR'S SILL (2026-08-28). Pry it clear while the water is out.
  // The sea buries the sill every tide; the door takes a beat between courses;
  // a pick takes two courses where bare hands take one; and the water's turn
  // is the clock you are racing. No failure state but time — the bite is the
  // tide, never the door.
  private async cmdTideDoorPry(session: Session): Promise<void> {
    const world = this.world!;
    const dir = world.exits.get(session.roomId)?.find((e) => e.key_item === TIDE_DOOR_KEY)?.dir ?? "south";
    if (events.seaLevel(this) > 0) {
      // A FLOOR, never an assignment. The tide's own hook (events, the water
      // coming over the sill) owns the burial and ADDS to it now, so setting the
      // count here would hand a wanderer a way to shave a long-neglected sill
      // back down to a fresh one by prying at high water — undoing everybody
      // else's neglect with a wasted verb. This only guarantees the water has
      // buried it at all; it can never lower what the sea has laid down.
      this.tideSilt = Math.max(this.tideSilt, TIDE_SILT_COURSES);
      return this.send(session, TIDE_PRY_WET, "dmgin");
    }
    if (this.tideSilt <= 0) {
      return this.send(session, `The sill is clear and the door stands open. The way ${dir} is dry — go ${dir}.`, "study");
    }
    const at = this.tidePryAt.get(session.pubkey);
    const now = Date.now();
    if (at !== undefined && now < at) {
      return this.send(session, TIDE_PRY_SETTLE, "dmgin");
    }
    this.tidePryAt.set(session.pubkey, now + TIDE_PRY_MS);
    // The tool you DIG with: the one in your hand first, then anything in the
    // pack — a pick is a pick whether it is swung or carried.
    const tool = session.items.find((c) => c.equipped && TIDE_DIGGING_TOOLS.has(c.itemId))
      ?? session.items.find((c) => TIDE_DIGGING_TOOLS.has(c.itemId));
    const toolT = tool ? world.itemTemplates.get(tool.itemId) : undefined;
    const courses = tool ? 2 : 1;
    this.tideSilt = Math.max(0, this.tideSilt - courses);
    const worked = tool
      ? `You lean into the sill with ${toolT?.name ?? "your pick"} and take two courses of silt out.`
      : "You work the sill with your hands and take a course of silt out.";
    const making = this.events.get("sea")?.phase === "telegraph" ? TIDE_PRY_MAKING : "";
    if (this.tideSilt <= 0) {
      this.send(session, `${worked} ${TIDE_PRY_OPEN.replace("{dir}", dir)}`, "unlock");
      this.roomFeed(session.roomId, `${session.name} works the last of the silt from the tide door, and it grinds open.`, session.pubkey, false);
      this.roomSound(session.roomId, "Iron grinds up out of the silt, {dir}.");
      this.creatureNoise(session.roomId);
    } else {
      let hint = "";
      if (!tool && !this.tideToolHint.has(session.pubkey)) {
        this.tideToolHint.add(session.pubkey);
        hint = TIDE_PRY_TOOL_HINT;
      }
      this.send(session, `${worked} ${tideSiltLine(this.tideSilt)}.${hint}${making}`, "dmgin");
    }
    this.refreshRoomCtx(session.roomId);
  }

  // ---- the bench's other trades: salvage, forge, repair (gate only) ----

  // How many unsealed copies of an item ride in the pack (tender and materials;
  // a sealed copy is title, and the bench and the keeper both leave it alone).
  public countLoose(session: Session, itemId: string): number {
    return session.items.filter((c) => c.itemId === itemId && c.serial === null).length;
  }

  // Consume n unsealed copies out of the pack (rows deleted for good).
  public async takeLoose(session: Session, itemId: string, n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      const idx = session.items.findIndex((c) => c.itemId === itemId && c.serial === null);
      if (idx === -1) return;
      const [row] = session.items.splice(idx, 1);
      await removeItemRow(this.env.DB, row.rowId);
    }
  }

  // The gate's keeping is within reach at the bench: what you carry PLUS what's
  // in the lockbox and vault. Count unsealed copies across preloaded pools (the
  // caller loads the containers once and reuses them).
  public countLooseIn(pools: CarriedItem[][], itemId: string): number {
    // A fungible material (scrap iron, a trophy) carries no title — count every
    // copy, seal or not. A stray seal on a fungible (an old barter bug) must not
    // hide it from the forge or the vice. Non-fungibles still count unsealed.
    const fungible = this.stackable(itemId, null);
    let n = 0;
    for (const pool of pools) {
      for (const c of pool) if (c.itemId === itemId && (fungible || c.serial === null)) n++;
    }
    return n;
  }

  // Consume n copies from the pack first, then the lockbox, then the vault — the
  // deep keep spent last. Fungibles spend seal-agnostically (a sealed one's mint
  // is voided as it's used up, keeping supply honest). Pack rows leave
  // session.items; container rows are deleted. (Single-threaded DO: consistent.)
  public async takeLooseAcross(session: Session, itemId: string, n: number): Promise<void> {
    const fungible = this.stackable(itemId, null);
    const match = (c: CarriedItem) => c.itemId === itemId && (fungible || c.serial === null);
    let left = n;
    while (left > 0) {
      const idx = session.items.findIndex(match);
      if (idx === -1) break;
      const [row] = session.items.splice(idx, 1);
      if (row.serial !== null) await voidMint(this.env.DB, row.serial);
      await removeItemRow(this.env.DB, row.rowId);
      left--;
    }
    for (const key of ["lockbox", "vault"] as const) {
      if (left <= 0) break;
      const held = await loadContainer(this.env.DB, session.pubkey, key);
      for (const c of held) {
        if (left <= 0) break;
        if (match(c)) {
          if (c.serial !== null) await voidMint(this.env.DB, c.serial);
          await removeItemRow(this.env.DB, c.rowId);
          left--;
        }
      }
    }
  }

  // The three keepings within reach at a gate, loaded once (pack is live in
  // memory; lockbox and vault come from D1). Shared by forge affordability and
  // consumption so what the modal shows and what the bench spends never drift.
  public async gatePools(session: Session): Promise<CarriedItem[][]> {
    return [
      session.items,
      await loadContainer(this.env.DB, session.pubkey, "lockbox"),
      await loadContainer(this.env.DB, session.pubkey, "vault"),
    ];
  }

  // Snapshot whether the smelt/cure chips have anything to act on, counted the
  // way the verbs actually spend — ACROSS pack + lockbox + vault (smelt melts
  // scrap from any of them; cure hangs raw meat from any of them). The chip
  // builder (sendCtx) is sync and runs hot, so it can't load the containers
  // itself; this async refresh writes two booleans it reads. Called at every
  // gate seam that can change the stock (entry + after each gatehouse command),
  // and since nothing but the player's own hand touches their keeping, the cache
  // stays true between those seams.
  public async refreshGateStock(session: Session): Promise<void> {
    if (!this.outOfWorld(session)) { session.gateSmeltable = false; session.gateCureName = undefined; session.gateCookName = undefined; return; }
    const pools = await this.gatePools(session);
    session.gateSmeltable = this.countLooseIn(pools, SCRAP_ID) >= SMELT_SCRAP_PER_IRON;
    // Name a curable raw (from ANY pool — the cure verb hangs it from pack,
    // lockbox or vault alike) so the chip can be 'cure <meat>' and actually hang
    // it on click, not bare 'cure' that only reads the racks. Undefined = nothing
    // to hang.
    const raw = pools.flat().find((c) => CURE_RECIPES[c.itemId] && c.serial === null);
    session.gateCureName = raw ? shortName(this.world!.itemTemplates.get(raw.itemId)!.name) : undefined;
    // ...and the same for the brazier, which cooks a catch instead of keeping it.
    const catch_ = pools.flat().find((c) => COOK_RECIPES[c.itemId] && c.serial === null);
    session.gateCookName = catch_ ? shortName(this.world!.itemTemplates.get(catch_.itemId)!.name) : undefined;
  }

  // Refresh the gate-stock cache, then push chips — the one call a gate flow makes
  // when it wants the smelt/cure chips to reflect what the player now holds.
  public async sendGateCtx(session: Session): Promise<void> {
    await this.refreshGateStock(session);
    this.sendCtx(session);
  }

  public benchGuard(session: Session, work: string): string | null {
    if (!this.world!.entryRooms.has(session.roomId)) {
      return `That's ${work} — the vice and the brazier live at the gates.`;
    }
    if (this.inCombat(session)) return "Not while something is trying to kill you.";
    return null;
  }

  // Typed barter/forge steps you out of the world just like opening the modal —
  // untouchable at the counter/brazier — but keeps you in text. Idempotent, so
  // a run of typed sub-commands (buy, offer, forge) doesn't re-announce it.
  public enterStep(session: Session, mode: "trading" | "forging" | "bountying" | "sorting" | "gatehouse"): void {
    const atGate = this.world!.entryRooms.has(session.roomId);
    if (session.away) {
      // Already out of the world. At a gate that means STANDING IN THE GATEHOUSE
      // — and the hatch, the brazier and the bench are all fixtures of this room,
      // so stepping to one is a LATERAL move, not a second step-out. Swap the
      // stance flags, sweep any unfinished trade, announce nothing to the gate
      // outside (they heard the door shut). Mid-dungeon (crouched over the
      // lockbox) the old law holds: one stance at a time.
      if (!atGate) return;
      session.buying = mode === "trading" ? session.buying : undefined; // an unfinished trade sweeps back unless you stay at the counter
      session.trading = mode === "trading";
      session.forging = mode === "forging";
      session.bountying = mode === "bountying";
      session.sorting = mode === "sorting";
      session.stepText = true;
      return;
    }
    session.away = true;
    session.stepText = true;
    session.trading = mode === "trading";
    session.forging = mode === "forging";
    session.bountying = mode === "bountying";
    session.sorting = mode === "sorting";
    // Rest survives a typed step-out (inventory/barter/forge) — healing pauses
    // while away, resumes when you 'look' back into the world.
    session.target = null;
    // At a gate you step clean out of sight; sorting mid-dungeon (lockbox only)
    // you crouch in the open, still in reach. (trading/forging are gate-only.)
    if (atGate) {
      this.inGatehouse.add(session.pubkey); // you are INSIDE now, and a dropped socket won't undo it
      // The keeper gets round to one line of the region's story this visit, and
      // one only — armed here, spent when he uses it (lore.keeperTells). Not at
      // the instant the door shuts: he finishes what he was doing first, and a
      // duck-in-and-out gets nothing, which is correct.
      session.keeperDueAt = Date.now() + randInt(KEEPER_DELAY_MIN_MS, KEEPER_DELAY_MAX_MS);
      for (const c of this.creatures.values()) {
        if (c.target === session.pubkey) c.target = null;
      }
    }
    const msg = mode === "trading"
      ? `${session.name} steps up to the keeper's hatch.`
      : mode === "forging"
        ? `${session.name} steps to the bench and stirs the brazier to life.`
        : mode === "bountying"
          ? `${session.name} steps up to the bounty board and studies what the keeper is paying for.`
          : mode === "gatehouse"
            ? `${session.name} pulls the gatehouse door shut behind them.`
            : atGate
            ? `${session.name} steps into the gatehouse to sort their kit.`
            : `${session.name} crouches to dig through a lockbox.`;
    this.roomFeed(session.roomId, msg, session.pubkey, false);
    this.refreshRoomCtx(session.roomId);
  }

  // Out through the door: back into the dungeon, where it can all reach you
  // again. The room by the fire hears you go.
  public async leaveGatehouse(session: Session): Promise<void> {
    // outOfWorld, not bare `away`: if the flags drifted (inGatehouse=true /
    // away=false) you must still be able to walk out — leaveStep clears BOTH.
    // But bare `away` alone still counts here too (rome, 2026-07-26): the
    // inventory CHIP crouches you over your lockbox mid-dungeon (enterBench,
    // away=true, never inGatehouse, never at a gate) — outOfWorld is false
    // there by design, so 'out' hit this guard and said "you're already out"
    // without closing anything. leaveStep already knows how to close whatever
    // frame is actually open; just let it.
    const wasOutOfWorld = this.outOfWorld(session);
    if (!wasOutOfWorld && !session.away) return this.send(session, "You're already out in the world.");
    session.resting = false; // the door wakes you — nobody sleepwalks into the dungeon
    session.pose = undefined; session.poseAt = undefined; session.poseRef = undefined; // and no posture survives the threshold
    dice.endGamesFor(this, session.pubkey); // you cannot walk out of the room and keep playing in it
    // The door-shutting line is the GATEHOUSE'S own — a lockbox crouch mid-dungeon
    // never went through any door, and leaveStep already sends the right local
    // "steps back from the bench" line for that case.
    if (wasOutOfWorld) gate.gatehouseFeed(this, `${session.name} shoulders the door open and goes back out.`, session.pubkey, "who");
    await this.leaveStep(session);
    // leaveStep clears `away`, so the HUD title must be re-sent or the top bar
    // stays reading "The Gatehouse" while the log shows the gate room. Status
    // FIRST (it carries the room name the client paints gold), then the room.
    this.sendStatus(session);
    this.send(session, this.describeRoom(session, false));
    this.sendCtx(session);
  }

  // Step a text-stance player back into the world (any command that isn't part
  // of the current stance, or a 'look'). Mirrors leaveTrade/leaveForge; the
  // close frame is a no-op with no modal open. An unfinished trade sweeps back.
  private async leaveStep(session: Session): Promise<void> {
    const wasTrading = !!session.trading;
    // Not at a counter, not at a brazier, not over a box — then you were simply
    // INSIDE, and what the gate sees is a door opening.
    const fromGatehouse = this.outOfWorld(session)
      && !session.trading && !session.forging && !session.sorting && !session.bountying;
    const frame = session.trading ? "trade" : session.forging ? "forge" : session.bountying ? "bounty" : "bench";
    session.away = false;
    this.inGatehouse.delete(session.pubkey); // out through the door — the only way out
    session.keeperDueAt = 0; // whatever he had left to say keeps until you're back
    session.trading = false;
    session.forging = false;
    session.bountying = false;
    session.sorting = false;
    session.stepText = false;
    session.buying = undefined;
    try { session.ws.send(JSON.stringify({ v: 0, t: frame, open: false })); } catch {}
    this.roomFeed(session.roomId, fromGatehouse
      ? `${session.name} comes out of the gatehouse, pulling the door to behind them.`
      : `${session.name} steps back from the ${wasTrading ? "keeper's hatch" : "bench"}.`, session.pubkey, false);
    this.refreshRoomCtx(session.roomId);
  }

  // Gear stat tag for the inventory line, e.g. " (+4 dmg)", " (+1 dmg, x2 swings)",
  // " (+2 dmg, sweeps 3)", " (2 armor, heavy)".
  // JUST THE READINGS, for the bench's sheet. itemStat mixes numbers and bare
  // trait tags into one parenthetical ("+2 dmg, bleeds 1, reach"), which is
  // right for a one-line floor glance and wrong for a sheet that lists the
  // traits properly underneath with what each of them does. Same numbers, same
  // order, no tags: the sheet would otherwise say "reach" twice and explain it
  // once. itemStat is untouched; every other caller reads exactly as before.
  public itemNumbers(t: ItemTemplate | undefined): string {
    if (!t) return "";
    const bits: string[] = [];
    if (t.dmg > 0) bits.push(`+${t.dmg} dmg`);
    if (t.speed > 1) bits.push(`x${t.speed} swings`);
    if (t.sweep > 1) bits.push(`sweeps ${t.sweep}`);
    if (t.bleed > 0) bits.push(`bleeds ${t.bleed}`);
    if (t.stun > 0) bits.push(`${Math.round(t.stun * 100)}% stun`);
    if (t.block > 0) bits.push(`${Math.round(t.block * 100)}% block`);
    if (t.armor > 0) bits.push(`${t.armor} armor`);
    if (t.weight > 0) bits.push("heavy");
    // The shield's drag is a NUMBER, not a tag, so it belongs here — and it is
    // the cost half of the block figure directly above it.
    if (t.slot === "shield" && t.block > SHIELD_DRAG_FREE) {
      bits.push(`\u2212${Math.round((t.block - SHIELD_DRAG_FREE) * SHIELD_DRAG_PER_BLOCK * 100)}% to your swing`);
    }
    return bits.join(", ");
  }

  public itemStat(t: ItemTemplate | undefined): string {
    if (!t) return "";
    const bits: string[] = [];
    if (t.dmg > 0) bits.push(`+${t.dmg} dmg`);
    if (t.speed > 1) bits.push(`x${t.speed} swings`);
    if (t.sweep > 1) bits.push(`sweeps ${t.sweep}`);
    if (t.bleed > 0) bits.push(`bleeds ${t.bleed}`);
    if (t.stun > 0) bits.push(`${Math.round(t.stun * 100)}% stun`);
    if (t.block > 0) bits.push(`${Math.round(t.block * 100)}% block`);
    if (t.armor > 0) bits.push(`${t.armor} armor, ${t.weight > 0 ? "heavy" : "light"}`);
    else if (t.weight > 0) bits.push("heavy"); // weighted weapon/shield: costs your footwork
    // Gear traits (045): a one-word tag so the piece teaches its own trick.
    if (hasTrait(t, "reach")) bits.push("reach");
    const pierce = trait(t, "pierce");
    if (pierce) bits.push(`pierces ${pierce}`);
    if (hasTrait(t, "two-handed")) bits.push("two-handed");
    // A shield drags your swing in proportion to its guard (wallDrag): show the
    // real cost on anything past the free buckler floor, and keep "a wall" for the
    // biggest ones' identity.
    if (t.slot === "shield" && t.block > SHIELD_DRAG_FREE) {
      const drag = Math.round((t.block - SHIELD_DRAG_FREE) * SHIELD_DRAG_PER_BLOCK * 100);
      bits.push(`${hasTrait(t, "wall") ? "a wall — " : ""}−${drag}% to your swing`);
    }
    if (hasTrait(t, "padded")) bits.push("wards stun");
    if (hasTrait(t, "wardhide")) bits.push("wards wounds");
    if (hasTrait(t, "mailward")) bits.push("wards bleeds");
    if (hasTrait(t, "staunched")) bits.push("staunched");
    if (hasTrait(t, "hooded")) bits.push("hooded");
    if (hasTrait(t, "quiet")) bits.push("quiet");
    if (hasTrait(t, "slick")) bits.push("slick");
    if (hasTrait(t, "strapped")) bits.push("strapped-down");
    const spike = trait(t, "thorns");
    if (spike) bits.push(`spiked ${spike}`);
    if (hasTrait(t, "riposte")) bits.push("riposte");
    if (hasTrait(t, "mancatcher")) bits.push("mancatcher");
    if (t.id === LANTERN_ITEM) bits.push("long steady light — a tame flame, nothing fears it");
    return bits.length ? ` (${bits.join(", ")})` : "";
  }

  // Is this a plain carryable (food, trophy, key) that can safely stack, or gear
  // that must be listed on its own (its wear and slot differ per instance)?
  // The lantern is slotless (it lights like a torch, it doesn't equip) but it
  // IS gear: its condition meters the burns left, so each one lists alone.
  // The hammerstone is the same shape: its condition meters the latches left
  // in it (STONE_WEAR per smash) — and unlike the lantern, NOTHING refills it.
  public isGear(itemId: string): boolean {
    if (itemId === LANTERN_ITEM || THROW_TOUGH.has(itemId)) return true;
    const t = this.world!.itemTemplates.get(itemId);
    return !!t && t.slot !== "";
  }

  // A fungible pack item — trophies, food, scrap, keys, cigarettes. Many share
  // one slot. Gear (has a slot), sealed items (own serial), journals (own pages),
  // and maps (own reading) are each their own slot and never stack.
  // The pickup tag must not promise what the gate refuses (cmdClaim turns
  // trophies away — no title on fungibles), so a stackable's tag talks trade.
  // The rarity bracket on a loot line, and ONLY where the word means what the
  // player will read into it (rome, 2026-08-21, on an eyrie talon announcing
  // itself as epic). Every template carries a rarity, but it does two different
  // jobs: on gear it grades the PIECE, and on a fungible it is the value ladder
  // the keeper pays against (talon epic/10, summit scale legendary/40, goat horn
  // common/5). Printing it on a trophy borrows gear's word for a thing you
  // cannot wear, and hands over the keeper's own price ladder on the floor of a
  // dungeon — the gate is where a thing's worth is supposed to be learned.
  //
  // The keeper's counter keeps its brackets (gate.ts): that IS the institution,
  // and everything on it is gear.
  private rarityTag(item: ItemTemplate): string {
    return this.isGear(item.id) ? ` [${item.rarity}]` : "";
  }

  private lootSuffix(item: ItemTemplate): string {
    if (!this.stackable(item.id, null)) return "(unclaimed — the gate can seal it)";
    return item.edible ? "(unclaimed — good, fresh food)" : "(no title to seal — the keeper trades in these, or the lockbox keeps them)";
  }

  public stackable(itemId: string, serial: number | null, journalId?: string): boolean {
    if (serial !== null || journalId) return false;
    if (MAP_ITEMS.has(itemId) || itemId === JOURNAL_ITEM) return false;
    return !this.isGear(itemId);
  }

  // A TROPHY is a thing cut off a body: some creature's loot_item, and not food.
  // Not a key, not a map, not a ration, not scrap, not a tin of cigarettes —
  // those are tools and tender. The world's own drop table defines the set, so
  // it stays true as the bestiary changes.
  private trophyIds: Set<string> | null = null;
  // Everything the threshold needs, in one object. Facts only — the door's own
  // wording lives in public.ts with the rest of the client copy, except the arc
  // phrase, which is world prose and belongs with world prose (detail.ts).
  public async worldSnapshot(): Promise<{
    awake: number;
    boards: { legend: { name: string; score: number }[]; trophies: { name: string; score: number }[] };
    fell: { name: string; ago: number } | null;
    arc: string | null;
  }> {
    const opts = this.lbOpts();
    const [legend, trophies] = await Promise.all([
      loadLeaderboard(this.env.DB, "legend", DOOR_BOARD_TOP, opts).catch(() => []),
      loadLeaderboard(this.env.DB, "trophies", DOOR_BOARD_TOP, opts).catch(() => []),
    ]);
    // The npub never leaves: the door needs a name and a number, and nothing
    // about the boards should hand a scraper a key-to-name directory.
    const strip = (rows: { name: string; score: number }[]) => rows.map((e) => ({ name: e.name, score: e.score }));
    // Whichever arc is actually running. Only arcs with a door line are named —
    // a bell tolling under the keep means nothing to somebody who has never
    // been inside, and the door is written for people who have not.
    let arc: string | null = null;
    for (const [id, st] of this.events) {
      if (st.phase !== "active") continue;
      const line = DOOR_ARC_LINES[id];
      if (line) { arc = line; break; }
    }
    return {
      awake: this.sessions.size,
      boards: { legend: strip(legend), trophies: strip(trophies) },
      fell: this.lastBossFall ? { name: this.lastBossFall.name, ago: Date.now() - this.lastBossFall.at } : null,
      arc,
    };
  }

  // The last boss to go down, for the door. In memory on purpose: it is worth a
  // line while the world is warm, and a cold DO simply has nothing to say about
  // it rather than carrying a stale one — "the woodward fell" is only news if it
  // is news.
  public lastBossFall: { name: string; at: number } | null = null;

  // What the boards need to compute a score in SQL: the two weights, and the
  // set of item ids that count as trophies. One place, so the in-game board,
  // `publish score` and the door outside all reckon the same way.
  public lbOpts(): { bossPts: number; pvpPts: number; trophyIds: string[] } {
    const ids: string[] = [];
    if (this.world) for (const id of this.world.itemTemplates.keys()) if (this.isTrophy(id)) ids.push(id);
    return { bossPts: LB_BOSS_PTS, pvpPts: LB_PVP_PTS, trophyIds: ids };
  }

  public isTrophy(itemId: string): boolean {
    if (!this.trophyIds) {
      this.trophyIds = new Set<string>();
      for (const m of this.world!.mobTemplates.values()) {
        const t = m.loot_item ? this.world!.itemTemplates.get(m.loot_item) : undefined;
        if (t && !t.edible && !this.isGear(t.id)) this.trophyIds.add(t.id);
      }
    }
    return this.trophyIds.has(itemId) && !this.isKey(itemId);
  }

  // A KEY opens something: any cache's key_item, plus the still-cold heart (the
  // deep door's perishable key). The world's own locks define the set.
  private keyIds: Set<string> | null = null;
  public isKey(itemId: string): boolean {
    if (!this.keyIds) {
      this.keyIds = new Set<string>([DEEP_HEART]);
      for (const c of this.world!.caches) {
        if (c.keyItem) this.keyIds.add(c.keyItem);
      }
    }
    return this.keyIds.has(itemId);
  }

  // How many slots a set of carried items fills, by STORE — each store charges
  // differently and the `store` arg says which. Common to all: what you WEAR
  // rides on your body, so equipped gear costs no slot (arming up never eats your
  // carrying room, stripping down never strands you). Then:
  //   pack   — non-food stacks one slot per KIND; FOOD is free (a count cap of
  //            its own governs it, PACK_FOOD_CAP); loose gear one each.
  //   lockbox— non-food stacks one slot per KIND; FOOD is one slot EACH (no
  //            fungible stacking), so the small box holds at most its cap in
  //            rations; loose gear one each.
  //   vault  — the bank is deep: it charges NOTHING for fungibles (trophies,
  //            food, scrap, keys, cigs, any kind, any depth). Its 50 slots are
  //            for SEALED GEAR alone (rome, 2026-07-13 / food rule 2026-07-14).
  public slotsUsed(items: CarriedItem[], store: "pack" | "lockbox" | "vault" = "pack"): number {
    const kinds = new Set<string>();
    const foodByKind = new Map<string, number>(); // lockbox rations: counted per kind to stack 8-deep
    let loose = 0;
    for (const c of items) {
      if (c.equipped) continue; // worn/wielded — on the body, not in the pack
      if (this.world!.itemTemplates.get(c.itemId)?.edible) {
        // Food's slot cost is the store's business: FREE in the pack (a COUNT cap
        // governs it there) and FREE in the vault. In the lockbox rations now
        // STACK by kind (rome, 2026-07-20): a kind rides one slot up to
        // FOOD_LOCKBOX_STACK deep, then spills to a second slot — so several
        // stacks of food can share the box, not one slot per ration.
        if (store === "lockbox") foodByKind.set(c.itemId, (foodByKind.get(c.itemId) ?? 0) + 1);
        continue;
      }
      if (this.stackable(c.itemId, c.serial, c.journalId)) {
        if (store !== "vault") kinds.add(c.itemId); // one slot per KIND; free in the deep keep
      } else loose++; // loose gear, maps, journals — and sealed gear in the vault
    }
    let foodSlots = 0;
    for (const n of foodByKind.values()) foodSlots += Math.ceil(n / FOOD_LOCKBOX_STACK); // 8 to a stack, then a new slot
    return loose + kinds.size + foodSlots;
  }

  // Room for one more of itemId in a given store (default the pack)? A stacking
  // kind you already hold always fits — it joins the pile; otherwise you need a
  // free slot under the cap. Where stacks are free (the vault), any fungible
  // always fits.
  public hasRoom(items: CarriedItem[], itemId: string, cap: number, store: "pack" | "lockbox" | "vault" = "pack"): boolean {
    if (this.world!.itemTemplates.get(itemId)?.edible) {
      // Food takes no slot in the pack or the vault, so there's always room for
      // it there (the pack's own COUNT cap is enforced in packRoom). In the
      // lockbox a ration joins its kind's open stack if that stack isn't full
      // (FOOD_LOCKBOX_STACK deep); only a fresh stack needs a free slot.
      if (store === "pack" || store === "vault") return true;
      const have = items.filter((c) => !c.equipped && c.itemId === itemId).length;
      if (have % FOOD_LOCKBOX_STACK !== 0) return true; // room in the current stack
      return this.slotsUsed(items, store) < cap;
    }
    if (this.stackable(itemId, null)) {
      if (store === "vault") return true;
      if (items.some((c) => c.itemId === itemId && this.stackable(c.itemId, c.serial, c.journalId))) return true;
    }
    return this.slotsUsed(items, store) < cap;
  }

  public packRoom(session: Session, itemId: string): boolean {
    // Food is capped in the pack by COUNT, on top of the slot cap: it free-stacks
    // (a kind is one slot however deep), so without this a run could carry endless
    // rations = bottomless healing. The ceiling makes healing a supply decision.
    if (this.foodCapped(session, itemId)) return false;
    // Torches share food's problem: one slot however deep, plus a regrowing floor
    // spawn feeding it. Same cure — a hard count ceiling on spare torches.
    if (this.torchCapped(session, itemId)) return false;
    // Dressings share food's problem: one slot however deep. Same count ceiling,
    // so a stack of bandages can't make bleeds a non-issue.
    if (this.dressingCapped(session, itemId)) return false;
    return this.hasRoom(session.items, itemId, this.packCap(session), "pack");
  }

  // How many rations ride in the pack right now (all edibles; food is never worn).
  public packFood(session: Session): number {
    let n = 0;
    for (const c of session.items) if (this.world!.itemTemplates.get(c.itemId)?.edible) n++;
    return n;
  }

  // Would taking one more of itemId break the food ceiling? (Only edibles count;
  // everything else answers false and rides the ordinary slot rules.)
  public foodCapped(session: Session, itemId: string): boolean {
    return !!this.world!.itemTemplates.get(itemId)?.edible && this.packFood(session) >= PACK_FOOD_CAP;
  }

  // The one line every food-entry point speaks when the ceiling stops it.
  public foodFullNote(): string {
    return `You're carrying all the food you can (${PACK_FOOD_CAP}). Eat something, or bank the rest at a gate.`;
  }

  // How many spare torches ride in the pack right now (a lit torch is spent out
  // of the pack the moment it catches, so only unlit reserves count).
  public packTorches(session: Session): number {
    let n = 0;
    for (const c of session.items) if (c.itemId === TORCH_ITEM) n++;
    return n;
  }

  // Would taking one more torch break the light ceiling? (Only torches count;
  // everything else answers false and rides the ordinary slot rules.)
  public torchCapped(session: Session, itemId: string): boolean {
    return itemId === TORCH_ITEM && this.packTorches(session) >= PACK_TORCH_CAP;
  }

  // The one line every torch-entry point speaks when the ceiling stops it.
  public torchFullNote(): string {
    return `You're carrying all the torches you can (${PACK_TORCH_CAP}). Light one, or bank the rest at a gate.`;
  }

  // How many dressings ride in the pack right now — anything that binds a wound
  // (staunch > 0) that ISN'T also food. A dressing that doubles as a ration
  // (grave-moss) rides the FOOD cap instead, so it's excluded here — one thing,
  // one ceiling.
  public packDressings(session: Session): number {
    let n = 0;
    for (const c of session.items) {
      const t = this.world!.itemTemplates.get(c.itemId);
      if (t && (t.staunch ?? 0) > 0 && !t.edible) n++;
    }
    return n;
  }

  // Would taking one more of itemId break the dressing ceiling? (Only non-food
  // dressings count; everything else answers false and rides the ordinary rules.)
  public dressingCapped(session: Session, itemId: string): boolean {
    const t = this.world!.itemTemplates.get(itemId);
    return !!t && (t.staunch ?? 0) > 0 && !t.edible && this.packDressings(session) >= PACK_DRESSING_CAP;
  }

  // The one line every dressing-entry point speaks when the ceiling stops it.
  public dressingFullNote(): string {
    return `You're carrying all the dressings you can (${PACK_DRESSING_CAP}). Bind a wound, or bank the rest at a gate.`;
  }

  // Mint one item into the pack, if there's room. Returns the row, or null when
  // the pack is full (the caller decides: refuse, or spill to the ground). The
  // single doorway for loot onto the body — cap enforcement lives here.
  public async grantItem(session: Session, itemId: string, opts?: { condition?: number; kept?: boolean; journalId?: string; rolledTraits?: string }): Promise<CarriedItem | null> {
    if (!this.packRoom(session, itemId)) return null;
    const rowId = uuid();
    // Gear arrives already used — pristine is rare. `kept` gear (a sealed coffer's)
    // is better preserved than what's stripped off the dead. Non-gear rolls 100.
    const slot = this.world!.itemTemplates.get(itemId)?.slot ?? "";
    const condition = opts?.condition ?? rollGearCondition(slot, opts?.kept ?? false);
    // The lottery trait comes from the caller (a fresh mint rolls; a pickup off
    // the floor hands its stored roll back). grantItem never rolls on its own —
    // that keeps quest/gift grants and keeper stock plain unless told otherwise.
    const rolledTraits = opts?.rolledTraits ?? "";
    const carried: CarriedItem = { rowId, itemId, serial: null, equipped: false, condition, journalId: opts?.journalId, acquiredAt: Math.floor(Date.now() / 1000), rolledTraits: rolledTraits || undefined, rolledMap: parseTraits(rolledTraits) };
    session.items.push(carried);
    await insertLoot(this.env.DB, rowId, session.pubkey, itemId, null, carried.condition, carried.acquiredAt, rolledTraits);
    if (opts?.journalId) await setItemJournalId(this.env.DB, rowId, opts.journalId);
    return carried;
  }












  // Claws and teeth open a wound the mail can't turn: armor-ignoring bleed that
  // ticks until it clots (BLEED_TICKS) or you bind it. A fresh cut resets the
  // clock and takes the worse dmg. Mirrors the mob-side wound, pointed at you.
  public openWound(victim: Session, tmpl: MobTemplate, creature?: Creature): void {
    // PLAGUE-BEARER carries filth in its mouth, and this is the whole of what
    // that means: the bite always opens, and it opens even on a thing whose
    // teeth are not otherwise worth a wound. Both halves are needed — a rat's
    // bleed is small or nothing, so skipping the odds roll alone would have
    // been a trait that did nothing on the very animal it was written for, and
    // floored at 1 it is a real wound off a creature nobody respects. That is
    // the point of putting it on vermin: the cheapest body in the world becomes
    // the one you have to stop and dress for.
    const plague = !!creature?.traits?.includes("plague-bearer");
    if (!plague && !(tmpl.bleed > 0)) return; // undefined/NaN (unmigrated column) or 0: no wound — never leak NaN
    if (plague) tmpl = { ...tmpl, bleed: Math.max(tmpl.bleed || 0, 1) };
    // Bleed is a per-hit CHANCE, not a certainty (BLEED_ODDS, tiered by threat):
    // roll it first, and on a miss it's just an ordinary bite — no message, since
    // most hits don't open a wound. A bleeder with no entry falls back to every
    // hit, so a future one is never silently declawed.
    const bleedOdds = BLEED_ODDS.get(tmpl.id);
    if (bleedOdds !== undefined && !chance(bleedOdds)) return;
    // Guarded is the skill answer to claws: behind your guard, a cut that
    // would open you only finds flesh half the time (GUARDED_WOUND_ODDS).
    if (victim.stance === "guarded" && !chance(GUARDED_WOUND_ODDS)) {
      this.send(victim, `${cap(tmpl.name)} rakes for you, but your guard turns the worst of it — no wound opens.`, "block");
      return;
    }
    // The wound wards are the gear answer, and they roll separately — hide (or
    // mail) under a guard stacks (0.5 × 0.5): the full turtle bleeds a quarter
    // as often. Mail turns edges too: that's what the rings are FOR.
    if (this.wearsTrait(victim, "wardhide") && !chance(WARDHIDE_WOUND_ODDS)) {
      this.send(victim, `${cap(tmpl.name)} drags claws through the thick hide and finds less than it wanted — no wound opens.`, "block");
      return;
    }
    if (this.wearsTrait(victim, "mailward") && !chance(WARDHIDE_WOUND_ODDS)) {
      this.send(victim, `${cap(tmpl.name)} rakes across the rings and the edge skates — no wound opens.`, "block");
      return;
    }
    const fresh = !victim.bleedTicks;
    victim.bleedTicks = this.bleedTicksFor(victim);
    victim.bleedDmg = Math.max(victim.bleedDmg ?? 0, tmpl.bleed);
    if (fresh) {
      this.send(victim, `${cap(tmpl.name)} tears you open — the wound won't stop on its own. (bind it, or bleed)`, "dmgin");
      this.actorFeed(victim, victim.roomId, this.feedProc(FEED_BLEED, tmpl.name, victim.name), "bleed");
    }
  }

  // Leg-goers can hamstring you on a hit: a per-hit chance (HOBBLE_ODDS, tiered
  // by threat) that leaves you limping — you can still flee, but only after
  // dragging clear (see cmdGo), and rest mends it. One affliction instance,
  // sibling of openWound; the HUD's "hobbled" tag reads it. No-op once hobbled.
  private maybeHobble(victim: Session, tmpl: MobTemplate): void {
    if (victim.hobbled) return;
    const odds = HOBBLE_ODDS.get(tmpl.id);
    if (odds === undefined || !chance(odds)) return;
    // The ward covers the whole wound family (rome, 2026-07-10): hide thick
    // enough to turn a bleed turns the leg-rake too. Its own roll, same odds
    // as the bleed ward, so the two afflictions read as one defense.
    if (this.wearsTrait(victim, "wardhide") && !chance(WARDHIDE_WOUND_ODDS)) {
      this.send(victim, `${cap(tmpl.name)} rakes for your leg — the thick hide takes it, and your stride holds.`, "block");
      return;
    }
    // Worn MASS plants you: a leg-rake can't sweep out from under a load. Poise
    // as its own save (light builds lean on WARDHIDE above instead).
    if (chance(this.poiseOf(victim))) {
      this.send(victim, `${cap(tmpl.name)} rakes for your leg — but you're too planted under the weight to be swept, and your stride holds.`, "block");
      return;
    }
    victim.hobbled = true;
    victim.limpingSince = undefined; // a fresh wound — the drag-clear clock starts on your next flee
    // The quicksand holds by WEIGHT, not by tooth: the ground has your leg to
    // the knee and does not mean to let it go. Same affliction, its own tell.
    if (tmpl.id === "the-quicksand") {
      this.send(victim, `The ground has your leg — it grips you to the knee and you have to haul clear of it. (rest to dry off, or run for it)`, "dmgin");
      this.sendStatus(victim); // light the 'hobbled' HUD pill the instant the leg goes — same fix as stun/rest
      this.actorFeed(victim, victim.roomId, this.feedProc(FEED_HOBBLE, tmpl.name, victim.name), "hobble");
      return;
    }
    this.send(victim, `${cap(tmpl.name)} rakes your leg out from under you — it won't carry you clean now. (rest to mend it)`, "dmgin");
    this.sendStatus(victim); // light the 'hobbled' HUD pill the instant the leg goes — same fix as stun/rest
    this.actorFeed(victim, victim.roomId, this.feedProc(FEED_HOBBLE, tmpl.name, victim.name), "hobble");
  }

  // THE TOLL CLERK BRANDS YOU. The road remembers your face for MARK_MS: while
  // the mark holds, creatureNoise heeds you twice as hard (MARK_HEED_MULT on
  // the per-ear heed-roll) and a hungry ear may come straight to look
  // (MARK_CALL_ODDS, the same curious-draw a noise pulls). Renewed on each
  // landed blow, so the longer you fight the institution, the more the country
  // knows you. Scrubbed by resting at a gate (the threshold is the one place
  // the road forgets).
  public markBrand(victim: Session, tmpl: MobTemplate): void {
    const now = Date.now();
    const fresh = !(victim.markedUntil && victim.markedUntil > now);
    victim.markedUntil = now + MARK_MS;
    if (!fresh) return; // already branded — a renewal is silent, like a fresh wound
    this.send(victim, `${cap(tmpl.name)} strikes you — and where its hand touched, you feel the weight of being looked at. The road knows your face now. (it fades, but the gate will scrub it)`, "dmgin");
    this.sendStatus(victim);
  }

  // THE SWEEPER'S SECOND ARC. A mallet swinging for the stone at the end of a
  // bridge does not stop at the first body it finds: a landed primary blow also
  // drags through every OTHER wanderer standing in the room, at half weight and
  // with no afflictions beyond the raw hit (no new stun/bleed/hobble/mark —
  // the arc is a side-effect, not a fresh attack). Rolled per extra body so a
  // crowded bridge is where you bleed. A body already at 0 hp is skipped; the
  // arc can never be the killing blow (it folds into the normal death path
  // below the same as any hit).
  public async sweepArc(roomId: string, attacker: Creature, tmpl: MobTemplate, exceptPubkey?: string): Promise<void> {
    if (!SWEEPERS.has(tmpl.id)) return;
    for (const other of this.sessions.values()) {
      if (other.hp <= 0 || other.roomId !== roomId || !this.reachable(other)) continue;
      if (other.pubkey === exceptPubkey) continue; // the primary already took the full blow — the arc is the BACK half, for everyone else
      // THE ARC OBEYS THE PRESS. One swing reaching several bodies is still
      // blows landing on people, and the dogpile budget is what stops a crowd
      // being an execution (canLandBlow — the same gate the ordinary round and
      // every opening blow go through). Without this the mason lands its
      // primary AND an uncapped hit on everyone else, every round, which is the
      // exact hole creatureFirstStrike was closed against this morning. Held
      // back, the arc simply misses that body this beat.
      if (!this.canLandBlow(other.pubkey)) continue;
      const arc = Math.max(1, Math.round(randInt(tmpl.dmg_min, tmpl.dmg_max) / 2));
      const arcWorn = Math.max(1, Math.round(arc * ARMOR_K / (this.equippedArmor(other) + ARMOR_K)));
      const arcDef = Math.max(1, Math.round(arcWorn * STANCE[other.stance].def));
      other.hp -= arcDef;
      this.send(other, `${cap(tmpl.name)} swings on through — the arc of the blow catches you for ${arcDef}. [${Math.max(0, other.hp)}/${other.maxHp} hp]`, "dmgin");
      this.sendStatus(other);
      if (other.hp <= 0) {
        // Awaited (2026-08-20), like every other death path: a detached death
        // could reject unhandled on a D1 hiccup, and the tick used to keep
        // mutating a mid-death session between the arc and the respawn.
        await this.onPlayerDeath(other, tmpl);
      }
    }
  }

  // The vitals lottery — the Tarkov headshot. A rare, RANDOM killing hit that
  // ignores hp and gear: on any landed hit it may find the throat/heart. Armor
  // over the vitals only buys the odds DOWN toward `base` (never to zero) — naked
  // doubles it, VITALS_ARMOR_FULL armor reaches the floor. Deliberately random:
  // the randomness is the equalizer that lets a fresh player kill a geared one.
  // Shared by PvE (VITALS_PVE) and, when PvP is built, PvP (VITALS_PVP).
  public vitalsLottery(armor: number, base: number): boolean {
    const mult = 2 - Math.min(1, Math.max(0, armor) / VITALS_ARMOR_FULL); // 2× naked → 1× fully covered
    return chance(base * mult);
  }

  // THE PLAYER SIDE OF THE LOTTERY, asked once for every way a player lands a
  // blow (rome, 2026-08-17). This used to be written out inline in the combat
  // round and NOWHERE else, so two of the three attacks in the game could not
  // find a throat: the ambush opener and the thrown weapon rolled nothing.
  // Both read backwards — falling on a sleeping animal is the one moment you
  // would expect to cut a throat, and a point through the heart is what a
  // thrown spear IS — and neither was a decision: the opener's comment rules
  // out the CRIT ("the surprise is the crit") and never mentions vitals at all.
  //
  // The three exclusions below are the real ones and they are unchanged. A
  // boss is the designed wall. The three-hound falls only to a point driven
  // through its throat, and rarely. A HOLLOW thing has no throat to open and
  // no heart to pierce, so only a blunt weapon that shatters the skull ends it
  // outright — except the wights, whose dry flesh is still a BODY (GRAVE_FLESH).
  //
  // `weapon` is whatever did the hitting: the equipped weapon in melee, and the
  // THROWN item on a throw — which is the honest read, and gives the rule teeth
  // in both directions. A hurled rock is blunt and can shatter a skeleton's
  // skull; a hurled knife is not and cannot.
  public playerVitals(creature: Creature, tmpl: MobTemplate, weapon: { tmpl: ItemTemplate } | null | undefined): boolean {
    if (creature.hp <= 0 || tmpl.is_boss) return false;
    if (creature.templateId === "three-hound") return hasTrait(weapon?.tmpl, "piercing") && chance(VITALS_HOUND);
    if (HOLLOW.has(creature.templateId) && !GRAVE_FLESH.has(creature.templateId)) {
      return (weapon?.tmpl.stun ?? 0) > 0 && this.vitalsLottery(ai.mobArmor(tmpl, creature), VITALS_PVE);
    }
    return this.vitalsLottery(ai.mobArmor(tmpl, creature), VITALS_PVE);
  }




  public dropInstance(roomId: string, itemId: string, journalId: string): void {
    const here = this.groundInstances.get(roomId) ?? [];
    here.push({ itemId, journalId });
    this.groundInstances.set(roomId, here);
  }

  // Mark a floor item freshly fallen (player-relevant drops only — seeded
  // world stock is fair game for the scavengers from the start).
  public stampFresh(roomId: string, itemId: string): void {
    this.groundFreshAt.set(`${itemId}@${roomId}`, Date.now());
  }

  // Speak this wanderer's standing to the Gamestr leaderboards (kind 30762, signed
  // by the DUNGEON's key so it shows as VERIFIED). ONLY on the player's say-so —
  // `publish score`, the same opt-in law as the sheet ("the world doesn't snitch";
  // nothing about a wanderer reaches a public directory unless they ask). Two
  // boards: `trophies` = the barter value of every trophy they hold (pack + the
  // gate's lockbox + vault), `legend` = lifetime combat prestige. Addressable —
  // one current score per (player, board) — so a re-publish just overwrites.
  public async publishScores(session: Session): Promise<void> {
    if (!isGameKeyConfigured(this.env) || !this.world) return;
    const trophyValue = (items: CarriedItem[]): number =>
      items.reduce((sum, c) => sum + (this.isTrophy(c.itemId) ? (this.world!.itemTemplates.get(c.itemId)?.barter ?? 0) : 0), 0);
    const lockbox = await loadContainer(this.env.DB, session.pubkey, "lockbox");
    const vault = await loadContainer(this.env.DB, session.pubkey, "vault");
    const trophies = Math.round(trophyValue(session.items) + trophyValue(lockbox) + trophyValue(vault));
    const legend = session.bossKills * LB_BOSS_PTS + session.pvpKills * LB_PVP_PTS + session.kills;
    if (trophies <= 0 && legend <= 0) {
      return this.send(session, "You've nothing to put on the boards yet — no trophies, no kills to your name. Go earn a place.");
    }
    // Snapshot to D1 first — this is the opt-in the in-game `leaderboard` reads;
    // the Gamestr broadcast below is the same numbers, sent beyond the walls.
    await recordLeaderboard(this.env.DB, session.pubkey, legend, trophies);
    const emit = (board: string, score: number, content: string): void => {
      const ev = signScoreEvent(this.env, { player: session.pubkey, board, score, content, genres: LB_GENRES });
      this.state.waitUntil(publishScore(this.env, ev));
    };
    emit("trophies", trophies, `${session.name} — ${trophies} in trophies, all told.`);
    emit("legend", legend, `${session.name}: ${session.bossKills} bosses down, ${session.pvpKills} felled in blood, ${session.kills} slain in all.`);
    this.send(session, `The dungeon speaks your standing to the boards: ${trophies} in trophies, a legend of ${legend}. (the leaderboard hears you)`);
  }



  // Maps + the journal live in lore.ts; the region read stays here (chest
  // tiers and ambience lean on it too).
  // A gate reads as a gate wherever it stands — the waystation sits out in the
  // open ground, but you bank there, so its band is "gate" and the map draws it
  // gold. Under that, a room's OWN declared region wins (mig 126); rooms that
  // declare nothing — the original 110 — fall back to the derivation this
  // function was born as.
  public regionOf(roomId: string): Region {
    if (this.world!.entryRooms.has(roomId)) return "gate";
    const own = this.world!.rooms.get(roomId)?.region;
    if (own) return own as Region;
    return DEEP_ROOMS.has(roomId) ? "deep" : "upper";
  }

  // Truly out of the world — untouchable, unseen, beyond reach — only at a gate
  // with a modal open. A wanderer sorting a lockbox mid-dungeon has a modal open
  // (`away`, so the bench actions work) but is still crouched in the room, in
  // reach of everything standing there. `away` means "a modal is up"; THIS means
  // "safe." Keep the two apart. (Same gate condition as `sheltered` healing.)
  public outOfWorld(s: Session): boolean {
    // inGatehouse is the DURABLE "behind the door" truth — persisted, and the one
    // the reconnect trusts. `away` can drift FALSE under it: a seamless reweave
    // rebuilds the session away=false, and if the restore misses you end up
    // inGatehouse=true / away=false — which leaked the whole dungeon's roomSound
    // into the gatehouse and made 'in'/'out' lose track of you (rome, 2026-07-19,
    // twice). Trust inGatehouse FIRST so that drift can never un-insulate you;
    // `away && at-a-gate` still covers the pack-crouch at a gate (never inGatehouse).
    return this.inGatehouse.has(s.pubkey) || (s.away && this.world!.entryRooms.has(s.roomId));
  }

  // BEHIND A BARRED DOOR (mig 172). Not the same as outOfWorld — you are still
  // in the room, you can still be shouted at, and the chip row is the den's, not
  // the gatehouse's. What it means is that nothing out on the ground can put a
  // hand on you: creatures do not see you, steel cannot find you, and you are not
  // listed among the people standing there. An UNBARRED door gives none of this,
  // which is the whole of the den's founding rule.
  public shelteredInDen(pubkey: string): boolean {
    return den.shelteredInDen(this, pubkey);
  }

  /**
   * ...AND THE DOOR WORKS BOTH WAYS. The rule above was written entirely from
   * the outside in — nothing on the ground can put a hand on you — and never
   * said the obvious other half, so it was not enforced: from behind a barred
   * door you could still swing at, throw at and pick up things out in the
   * street, while the street could not answer. A free shot through a wall.
   *
   * Found alongside the deer (rome, 2026-08-10): the same missing law let the
   * ground's business into his house and his hands out of it.
   *
   * SIGHT IS NOT REACH. Looking and studying still work — a house has windows
   * (den.windowLine), and watching something out of one is the whole charm of
   * it. What you cannot do is touch.
   */
  public behindTheDoor(session: Session): string | null {
    if (!this.shelteredInDen(session.pubkey)) return null;
    return "Not from in here — the bar is across your door, and your arms are the wrong side of it. ('out' puts you back on the ground.)";
  }

  // Can the world reach this wanderer at all, right now?
  public reachable(s: Session): boolean {
    return !this.outOfWorld(s) && !this.shelteredInDen(s.pubkey);
  }

  // The dogpile cap, shared across every blow-landing path in a tick: swings in
  // the fight AND creatures that storm in and get the jump. Returns true and
  // claims a slot if this player still has room to be hit this tick; false when
  // they're already fully pressed (the attacker keeps its target and waits).
  public canLandBlow(pubkey: string): boolean {
    const n = this.blowsThisTick.get(pubkey) ?? 0;
    if (n >= DOGPILE_CAP) return false;
    this.blowsThisTick.set(pubkey, n + 1);
    return true;
  }

  // HOW MANY ALREADY HAVE THEIR TEETH IN YOU. The blow budget above counts
  // BLOWS IN A TICK, which is not the same question as HOW MANY ARE ON YOU —
  // and the difference is a hole you can be killed through (rome, 2026-08-11).
  // The budget is cleared every tick (2s) while a combat round is 4s, so on the
  // in-between tick it is empty; three things can be locked on you, none of
  // them having swung yet this tick, and a fourth walks in and opens with a
  // free ambush blow at AMBUSH_MULT weight. Then a fifth. Every arrival buys
  // its own opening hit no matter how thick the press already is.
  //
  // So the press is counted by BODIES as well: a creature arriving on a player
  // who already has DOGPILE_CAP things engaged marks them and takes its place,
  // and swings when a slot opens — the same queue the regular round uses.
  public engagedOn(pubkey: string, roomId: string, except?: string): number {
    let n = 0;
    for (const c of this.creatures.values()) {
      if (c.roomId !== roomId || c.id === except) continue;
      if (c.target === pubkey) n++;
    }
    return n;
  }

  // Nothing is ever published unless the player asks (NIP.md: certificates,
  // not broadcasts). The dungeon signs; the wanderer decides who sees.
  private async cmdPublish(session: Session, arg: string): Promise<void> {
    const a = arg.trim().toLowerCase();
    // 'publish kind 1' (aka 'note'/'post'): a readable brag under the WANDERER'S
    // OWN key — kind 1, permanent, the one published thing that lands in a normal
    // Nostr timeline in front of their followers. Their client signs and posts it
    // to their OWN relays (like speech), so it needs neither the dungeon's key nor
    // the dungeon's relays — it runs before both guards. It carries an `a`-tag to
    // the dungeon-signed 31573 so a reader can verify the numbers against the
    // dungeon's signature. Deliberately its own act: publishing your sheet does
    // NOT post to your feed (rome, 2026-07-15) — this, and only this, does.
    if (a === "kind 1" || a === "kind1" || a === "note" || a === "post") {
      // The published brag IS the in-game ledger, verbatim (verbs.ledgerLines),
      // minus the "days under this name" clause — then just #nomad. When the
      // card lands, the picture already carries the numbers, so the note keeps
      // ONLY the name line (rome, 2026-08-07): printing the tally twice under
      // its own portrait read like a bug. `text` stays the full ledger for the
      // case the picture never happens; `alt` puts the numbers back on the
      // image itself, for readers and clients that don't render pictures.
      const led = verbs.ledgerLines(session, false);
      const text = led.join("\n") + "\n\n#nomad";
      const short = led[0] + "\n\n#nomad";
      const alt = led.slice(1).map((l) => l.trim()).join(" · ");
      const dpk = gamePubkey(this.env);
      const atag = dpk ? `31573:${dpk}:${session.pubkey}` : "";
      // THE CARD'S NUMBERS, STRUCTURED (2026-08-07). The brag draws itself onto
      // an image client-side, and a card wants FIELDS to lay out — not a block
      // of prose to unpick with regexes. The text above is unchanged and still
      // carries the post on its own if the image never happens.
      const days = Math.max(0, Math.floor((Date.now() / 1000 - session.born) / 86_400));
      const card = {
        name: session.name,
        kills: session.kills,
        bosses: session.bossKills,
        pvp: session.pvpKills,
        deaths: session.deaths,
        days,
      };
      try { session.ws.send(JSON.stringify({ v: 0, t: "npost", text, short, alt, atag, card })); } catch {}
      return this.send(session, `You speak your own name beyond the walls — ${session.name}, in your own hand, to your own feed. ('publish sheet' backs it with the dungeon's signature.)`);
    }
    if (!isGameKeyConfigured(this.env)) {
      return this.send(session, "The dungeon has not yet found its voice. (no signing key configured)");
    }
    if (relayList(this.env).length === 0) {
      return this.send(session, "The dungeon's voice does not reach beyond these walls yet. (no relays configured)");
    }
    if (!arg) {
      return this.send(session, "Publish what? 'publish sheet' speaks who you are, 'publish score' posts your standing to the leaderboards, 'publish kind 1' posts your wanderer to your own feed, 'publish <sealed item>' proclaims what you own.");
    }
    const world = this.world!;
    if (a === "score" || a === "scores" || a === "leaderboard" || a === "rank") {
      return this.publishScores(session);
    }
    if (arg === "sheet" || arg === "me" || arg === "self") {
      const ev = signSheetEvent(this.env, {
        pubkey: session.pubkey,
        name: session.name,
        hp: session.hp,
        maxHp: session.maxHp,
        zone: world.zone,
        born: session.born,
        kills: session.kills,
        deaths: session.deaths,
        bossKills: session.bossKills,
        pvpKills: session.pvpKills,
      });
      this.state.waitUntil(publishEvent(this.env, ev));
      return this.send(
        session,
        `The dungeon speaks your name beyond the walls: ${session.name}, as you stand. (event ${ev.id.slice(0, 16)}…)`,
      );
    }
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    if (carried.serial === null) {
      return this.send(session, "The dungeon only proclaims what it has sealed. Claim it at the gate first.");
    }
    const tmpl = world.itemTemplates.get(carried.itemId)!;
    const ev = signLootEvent(this.env, {
      pubkey: session.pubkey,
      lootId: carried.rowId,
      itemId: carried.itemId,
      name: tmpl.name,
      rarity: tmpl.rarity,
      zone: world.zone,
      serial: carried.serial,
    });
    this.state.waitUntil(publishEvent(this.env, ev));
    this.send(
      session,
      `The dungeon proclaims your claim on ${tmpl.name}, mint #${carried.serial}. (event ${ev.id.slice(0, 16)}…)`,
    );
  }

  // ---- the tick (only while someone is watching) ----

  // The alarm is the world's heartbeat — and it was UNARMORED: any throw
  // anywhere in the tick (a rare world-state bug, or a transient D1/storage
  // error, which prod throws now and then no matter how correct the code is)
  // became an uncaught exception, and an uncaught exception ABORTS the DO —
  // dropping every connected socket at once. That was rome's "the connection
  // frays at the most random of times": one bad tick taking the whole room's
  // wire down, self-healing seconds later, nothing visible anywhere. Now the
  // tick is wrapped: a throw is logged with its stack (wrangler tail / CF
  // observability will name the next one), the players stay connected, and the
  // next beat is always scheduled.
  async alarm(): Promise<void> {
    try {
      await this.tick();
    } catch (e) {
      console.error("tick threw", (e as Error)?.stack ?? String(e));
    } finally {
      // The tick's own tail persists + reschedules; this is the backstop for
      // the tick that never reached its tail. ensureAlarm is idempotent.
      try { await this.ensureAlarm(); } catch {}
    }
  }

  private async tick(): Promise<void> {
    // THE BEAT TIMES ITSELF (2026-08-15). A freeze that shows up only in
    // production, only sometimes, and never in CPU is not a thing reasoning
    // from the outside has been able to name: the object sat 22-36 seconds on
    // a beat while spending 3-75ms of processor, which says "waiting" and not
    // waiting on WHAT. Three theories died against that gap. So the beat
    // carries a stopwatch and, when it runs long, prints where the time went.
    // A Date.now() per phase on a beat that already does far more, and it
    // prints NOTHING on a healthy world — only past TICK_SLOW_LOG_MS.
    const t0 = Date.now();
    const marks: string[] = [];
    let lastMark = t0;
    const mark = (name: string) => {
      const at = Date.now();
      marks.push(name + "=" + (at - lastMark));
      lastMark = at;
    };
    // A cold start with a pending alarm rebuilds the world first.
    if (!this.world) { await this.init("door"); mark("init"); }
    // The alarm can wake a hibernated DO whose sessions are gone but whose
    // sockets live on — rebuild them so the tick sees the connected players
    // (and doesn't mistake a full world for an empty one).
    await this.hydrateSessions();
    mark("hydrate");
    const world = this.world!;
    const now = Date.now();

    // Blows land on the combat heartbeat, not every tick — so a fight reads at
    // a human pace. Off-beat ticks still run everything else (regen, movement,
    // aggro drift, atmosphere); only the exchange of swings waits for the beat.
    const combatRound = now - this.lastCombatRound >= COMBAT_ROUND_MS;
    if (combatRound) this.lastCombatRound = now;
    // Fresh dogpile budget each tick: no player takes more than DOGPILE_CAP blows
    // in one tick, whether from swings in the fight or creatures storming the room.
    this.blowsThisTick.clear();
    this.noteCreaturesChanged(); // the room index rebuilds once per beat

    // Players swing first — the living get initiative. You FOCUS one foe and
    // turn to the next the moment it falls (or the moment something new is on
    // you) — never idle, but a swarm trades several-for-one against you: they
    // all hit back, you answer one at a time. Gear bends the rule: fast steel
    // swings more than once a round, and sweeping steel drags through a crowd.
    if (combatRound) for (const session of this.sessions.values()) {
      // A wanderer behind a BARRED door swings at nothing (2026-08-20): the bar
      // is the whole of the den's security, and it works both ways — nothing
      // reaches in, and nothing reaches out (the same law behindTheDoor
      // enforces for typed attacks). Any fight ends at the threshold.
      if (this.shelteredInDen(session.pubkey)) {
        if (session.target) session.target = null;
        if (session.pvpTarget) session.pvpTarget = null;
        continue;
      }
      const foes: Creature[] = [];
      for (const c of this.creaturesInRoom(session.roomId)) {
        if (c.id === session.target || c.target === session.pubkey) foes.push(c);
      }
      if (foes.length === 0) {
        if (session.target) session.target = null;
        // The daze wears off outside the fight too — fled or left standing
        // alone, the flag must not stick to the HUD until a refresh.
        if (session.stunned && !session.pvpTarget) { session.stunned = false; this.sendStatus(session); }
        // a heavy-opener that never resolved (fled, or the foe fell to
        // something else) must not eat a swing in the next fight — but a PvP
        // exchange is still a fight: tickPvp owns the flag there (2026-08-20).
        if (!session.pvpTarget) session.openedHeavy = false;
        continue;
      }
      // THE GAP CLOSING IS AN EVENT. Announced the beat it happens rather than
      // left for you to find by walking into it — the whole value of the pack
      // taking the doors is that you can watch it happen and decide early.
      const heldNow = ai.heldExits(this, session).size;
      if (heldNow > (session.wolvesHeld ?? 0)) {
        this.send(session, heldNow === 1
          ? "One of the wolves breaks off, trots wide, and plants itself in a gap. It has stopped trying to bite you."
          : `Another one peels away and takes a second way out. ${heldNow} of the doors are theirs now.`, "dmgin");
      }
      session.wolvesHeld = heldNow;

      // Rung senseless last beat: your swing is gone. It clears now — one hit,
      // one lost round, same as when you stun a mob.
      if (session.stunned) {
        session.stunned = false;
        this.send(session, "Your head still rings — the moment to swing slips past you.", "stun");
        this.sendStatus(session); // clear the pill as the lost swing is paid, not a beat later
        continue;
      }
      // A heavy blunt opener was your whole beat: the head is slow to rise, so the
      // foe answers before you come round again (edged/pierce never set this).
      if (session.openedHeavy) {
        session.openedHeavy = false;
        this.send(session, "You put it all into that opening blow; the heavy head is slow to rise again.", "dmgout");
        continue;
      }
      // NOTHING SWUNG REACHES SOMETHING THAT IS NOT ON THE GROUND (mig 237) —
      // EXCEPT A REACH WEAPON, which still finds it: a polearm's length, not a
      // swing's arc. The summit's animal goes up in its last third and the fight
      // stops being a fight for three beats; the out is the THROW, which still
      // reaches it (cmdThrow), and it is the one place in this game where
      // carrying something to throw is not a luxury.
      const airborneFoes = foes.filter((c) => ai.airborne(c, now));
      const hasReach = hasTrait(this.equippedItem(session, "weapon")?.tmpl, "reach");
      if (airborneFoes.length && foes.every((c) => ai.airborne(c, now)) && !hasReach) {
        if (!session.toldAirborne) {
          session.toldAirborne = true;
          this.send(session, "It is somewhere above you and you are swinging at air. Throw something, or get out.", "dmgin");
        }
        continue;
      }
      session.toldAirborne = false;
      const atkMult = STANCE[session.stance].atk * this.wallDrag(session);
      const alive = (c: Creature) => this.creatures.has(c.id);
      let primary = foes.find((c) => c.id === session.target && alive(c)) ?? foes.find(alive);
      const speed = Math.max(1, this.equippedItem(session, "weapon")?.tmpl.speed ?? 1);

      for (let swing = 0; swing < speed && primary; swing++) {
        // Re-fetch each swing: a fumble can fling the blade mid-round, and a
        // blade can wear through mid-arc. The rest of the round is bare-handed.
        const weapon = this.equippedItem(session, "weapon");
        // cleaving (099-weapon): one more foe caught per landed swing, on top
        // of the template's own sweep.
        const sweepN = Math.max(1, (weapon?.tmpl.sweep ?? 1) + (weapon && this.itemRolled(weapon, "cleaving") ? 1 : 0));
        const targets = [primary, ...foes.filter((c) => c !== primary && alive(c)).slice(0, sweepN - 1)];

        // Wounds are felt: below a third of your blood, your hands shake
        // (more fumbles) and your blows soften.
        const hurt = session.hp < session.maxHp * WOUNDED_FRACTION;
        if (chance(FUMBLE_CHANCE + (hurt ? WOUNDED_FUMBLE_BONUS : 0))) {
          // The whole arc goes wide either way — but the blade only flies from
          // your grip when your blood's low, your hands are shaking, AND the luck
          // runs against you (WOUNDED_DROP_ODDS). Hale you just whiff; hurt you
          // usually just whiff too, and only rarely actually lose the sword. You
          // never drop it at full strength, and not on most shaky swings either.
          const dropsIt = hurt && weapon && chance(WOUNDED_DROP_ODDS);
          await this.playerFumble(session, dropsIt ? weapon : null);
        } else if (session.stance === "reckless" && chance(RECKLESS_MISS)) {
          // The reckless tax: a wild swing carries you wide. Keep your grip
          // (never a drop), but you've left yourself open — playerFumble(null)
          // whiffs and staggers you.
          await this.playerFumble(session, null);
        } else {
          for (const creature of targets) {
            if (!alive(creature)) continue;
            const tmpl = world.mobTemplates.get(creature.templateId)!;
            if (!creature.target) creature.target = session.pubkey;
            ai.addGrudge(this, creature, session.pubkey);
            // Only the first cut has your shoulder behind it — follow-up swings
            // from fast steel carry the blade's edge alone (no body roll), so
            // speed multiplies the blade, never your whole arm. Slow heavy
            // steel lands fewer, bigger blows; both are real choices.
            const body = swing === 0 ? randInt(PLAYER_DMG_MIN, PLAYER_DMG_MAX) : 0;
            const honed = weapon && this.itemRolled(weapon, "honed") ? 1 : 0;
            // The stagger-punish window (STAGGER_WINDOW_MS, set above on the
            // creature's own overreach): one landed hit only, consumed the
            // instant it's read here, whichever bonus below fits this
            // weapon's class. isEdge/isPierce/isCleave read the WEAPON'S
            // base class, same tests WEAPON_CLASS_TRAIT uses for the roll.
            const staggered = creature.staggerUntil !== undefined && now < creature.staggerUntil;
            if (staggered) creature.staggerUntil = undefined;
            const isEdge = !!weapon && weapon.tmpl.bleed > 0;
            const isPierce = !!weapon && (trait(weapon.tmpl, "pierce") ?? 0) > 0;
            const isCleave = !!weapon && weapon.tmpl.sweep > 1;
            const staggerDmg = staggered && isCleave ? STAGGER_CLEAVE_DMG_BONUS : 0;
            let dmg = Math.round((body + (weapon ? this.effDmg(weapon) + honed + staggerDmg : 0)) * atkMult);
            if (hurt) { dmg = Math.round(dmg * WOUNDED_DMG_MULT); this.tellWounded(session); }
            let flourish = ".";
            const crit = chance(CRIT_CHANCE);
            if (crit) {
              dmg *= 2;
              flourish = pick(CRIT_FLOURISH);
            }
            // Their hide or plate turns what it can; a blow always bites. A pick's
            // point slips plate, a blunt weapon caves it — both ignore that armor,
            // each with its own tell (pierce takes precedence if a weapon had both).
            // needling/weighted (099-weapon): +1 armor-ignore each, on top of
            // the template's own pierce value / the flat blunt constant.
            const pierceVal = weapon ? (trait(weapon.tmpl, "pierce") ?? 0) + (this.itemRolled(weapon, "needling") ? 1 : 0) + (staggered && isPierce ? STAGGER_ARMOR_BONUS : 0) : 0;
            const bluntVal = weapon && weapon.tmpl.stun > 0 ? BLUNT_ARMOR_IGNORE + (this.itemRolled(weapon, "weighted") ? 1 : 0) : 0;
            // edge has no PERMANENT armor-ignore at all (bleed is its usual
            // answer to armor, never the direct hit) — this is the one
            // moment it gets one, same size as blunt's own baseline.
            const edgeVal = staggered && isEdge ? STAGGER_ARMOR_BONUS : 0;
            const mobArm = ai.mobArmor(tmpl, creature);
            const pierced = pierceVal > 0 && mobArm > 0; // the point beat armor
            const crushed = bluntVal > 0 && pierceVal === 0 && mobArm > 0; // the weight beat armor
            const opened = edgeVal > 0 && pierceVal === 0 && bluntVal === 0 && mobArm > 0; // the stagger bonus, edge's one-off
            dmg = Math.max(1, dmg - Math.max(0, mobArm - Math.max(pierceVal, bluntVal, edgeVal)));
            creature.hp -= dmg;
            this.markHurt(creature, tmpl, session.pubkey);
            // A landed blow on a crow is a stone in the pond: the murder rises.
            this.rouseCrows(session, creature);
            // The vitals lottery, PLAYER side (playerVitals holds the rules, and
            // the opener and the throw ask it too). Drops to 0 so the kill runs
            // the normal death path with a weapon-aware killing line.
            const pvitals = this.playerVitals(creature, tmpl, weapon);
            if (pvitals) creature.hp = 0;
            if (creature.hp > 0) {
              // The telling reports what fired THIS beat: a crit shout trumps,
              // else the point through the plate, else a fresh wound that won't
              // clot — or, on a bloodless HOLLOW thing, the edge finding nothing
              // to open (sometimes, so it teaches without nagging). A landed stun
              // keeps its own line below, for the thud.
              const hollow = HOLLOW.has(tmpl.id);
              // keen (099-weapon): +1 effective bleed on an already-edged blade —
              // the lottery only ever rolls it there (WEAPON_CLASS_TRAIT), but the
              // bare-chance branch below stays live for a hand-authored exception.
              const keen = weapon ? this.itemRolled(weapon, "keen") : false;
              // Bleed is a per-hit CHANCE now (playerBleedOdds), derived from the
              // weapon's own dmg/bleed ratio — was unconditional before this tune.
              const effBleed = weapon
                ? weapon.tmpl.bleed > 0
                  ? chance(playerBleedOdds(weapon.tmpl.dmg, weapon.tmpl.bleed)) ? weapon.tmpl.bleed + (keen ? 1 : 0) : 0
                : keen && chance(KEEN_BARE_BLEED_ODDS) ? 1 : 0
                : 0;
              // WICKED (2026-08-20): a crit on a wicked edge opens the wound
              // wide — no roll between the luck and the blood. Folds into the
              // same wound below, so it never stacks past the blade's own bleed.
              const wickedWound = !!(weapon && crit && this.itemRolled(weapon, "wicked") && !hollow)
                ? (weapon!.tmpl.bleed > 0 ? weapon!.tmpl.bleed : 1)
                : 0;
              const wound = Math.max(effBleed, wickedWound);
              const freshBleed = !!(weapon && wound > 0 && !hollow && !creature.bleedTicks);
              const bleedDry = !!(weapon && effBleed > 0 && hollow);
              // The wights (GRAVE_FLESH) split the voices: a point still slips
              // between ribs (a corpse has them), but a blunt blow cracks dry —
              // and their bleed immunity speaks through BONE_DRY_TELL like bone.
              const tail = flourish !== "." ? flourish
                : pierced ? ` — ${pick(hollow && !GRAVE_FLESH.has(tmpl.id) ? PIERCE_TELL : PIERCE_TELL_FLESH)}.`
                : crushed ? ` — ${pick(hollow ? BLUNT_TELL_BONE : BLUNT_TELL)}.`
                : opened ? ` — ${pick(STAGGER_EDGE_TELL)}.`
                : freshBleed ? ` — ${pick(BLEED_TELL)}.`
                : bleedDry && chance(0.3) ? ` — ${pick(BONE_DRY_TELL)}.`
                : ".";
              this.send(session, `${this.playerHit(weapon, tmpl.name)} for ${dmg}${tail} (${this.condition(creature)})`, flourish === "." ? "dmgout" : "dmgout big");
              // A blunt blow can ring it senseless — it loses its next swing.
              // The boss never reels, and a thing already reeling can't be
              // stun-chained deeper (one hit, one lost beat). Still off-balance
              // from its own overreach (staggered) makes that harder to shake.
              // SET-FAST takes the blunt answer away. A maul is the standing
              // reply to armoured bone — it ignores the plate and it rattles
              // what is inside it — and this one is seated too solidly in its
              // own frame to rattle. It still takes the damage; it just never
              // loses the beat.
              if (weapon && weapon.tmpl.stun > 0 && !tmpl.is_boss && !creature.traits?.includes("set-fast") && !creature.stunned && chance(weapon.tmpl.stun + (staggered ? STAGGER_STUN_BONUS : 0))) {
                creature.stunned = true;
                this.send(session, `${cap(tmpl.name)} reels, stunned.`, "stun");
                this.actorFeed(session, session.roomId, this.feedProc(FEED_STUN, session.name, tmpl.name), "stun");
              }
              // A fast, cutting edge opens a wound that keeps weeping — damage
              // over time that no armor turns. Fresh hits keep it open. But the
              // HOLLOW don't bleed (dry bone, old iron): the DoT finds no blood.
              if (weapon && effBleed > 0 && !hollow) {
                creature.bleedTicks = BLEED_TICKS;
                creature.bleedDmg = Math.max(creature.bleedDmg ?? 0, wound);
                if (freshBleed) this.actorFeed(session, session.roomId, this.feedProc(FEED_BLEED, session.name, tmpl.name), "bleed");
              }
              // TRIPPING (2026-08-20): a chain or lash takes the legs — the
              // snare rides windedUntil, the chase's own latch, so the thing
              // cannot flee for TRIP_HOLD_MS whatever roll it wins.
              if (weapon && (trait(weapon.tmpl, "tripping") ?? 0) > 0 && !creature.windedUntil && chance(TRIP_ODDS)) {
                creature.windedUntil = Date.now() + TRIP_HOLD_MS;
                this.send(session, `${cap(tmpl.name)} is caught around the legs — it thrashes, but it is not running anywhere.`, "stun");
              }
              this.combatNoise(session.roomId);
              if (tmpl.is_boss) ai.bossPhase(this, creature, tmpl, session);
            } else {
              await this.onCreatureDeath(session, creature, tmpl,
                pvitals ? `${this.playerVitalsVerb(weapon, tmpl.name)}` : undefined, pvitals);
            }
            // Every landed strike grinds the blade (a sweep grinds it per
            // foe) — and bone or old iron grinds it far faster than flesh.
            if (weapon) {
              await this.wear(session, weapon.carried, weapon.tmpl, HOLLOW.has(tmpl.id) ? WEAPON_WEAR_HOLLOW : WEAPON_WEAR);
              if (!this.equippedItem(session, "weapon")) break; // wore through mid-arc
            }
          }
        }
        // Auto-advance: the moment your foe falls, you turn on the next.
        if (!alive(primary)) primary = foes.find(alive);
        session.target = primary ? primary.id : null;
      }
      if (session.target && !this.creatures.has(session.target)) {
        const left = foes.find(alive);
        session.target = left ? left.id : null;
      }
    }

    mark("swings");

    // Wanderers with steel out against each other exchange blows on the same
    // round clock (pvp.ts) — after they've answered the beasts, before the
    // beasts answer them.
    if (combatRound) await pvp.tickPvp(this);

    // A seized player works free over time (and is freed the moment the thing
    // holding them is gone) — runs before the creatures swing, so the grip is a
    // tense beat, never a lock.
    if (combatRound) for (const s of this.sessions.values()) {
      if (!s.seizedBy) continue;
      const grip = this.creatures.get(s.seizedBy);
      // The ferryman's grip rides the ROPE, not the room: he hauls you toward
      // the mid-channel and holds you on the line across the rooms between —
      // the grip only dies when he does, or you wrench free.
      const onRope = !!grip && grip.templateId === "the-drowned-ferryman";
      if (!grip || (!onRope && grip.roomId !== s.roomId)) { s.seizedBy = undefined; s.draggedRooms = 0; continue; }
      // SLICK hide slips a grip easier, too (the eel was never held).
      // WEAK-GRIPPED is undertow's mirror: that one multiplies the odds it takes
      // hold, this one multiplies the odds you tear out of it. Wired at BOTH
      // break sites — this one and the typed break in verbs — because a grip you
      // could shrug off only when you thought to type at it would be a property
      // of the interface rather than of the animal.
      const breakOdds = SEIZE_BREAK_ODDS * (grip.traits?.includes("weak-gripped") ? MOB_WEAKGRIP_MULT : 1)
        + (this.wearsTrait(s, "slick") ? SLICK_BREAK_BONUS : 0);
      if (chance(breakOdds)) {
        s.seizedBy = undefined;
        s.draggedRooms = 0;
        this.send(s, "You tear loose of its grip.");
        continue;
      }
      // THE FERRYMAN TAKES YOU ACROSS. He holds the grip — and this beat he
      // wins it — so he hauls you one room down the rope toward the mid-channel
      // (his home), up to FERRY_DRAG_MAX rooms per grip. Relocation, not
      // damage: the fight moves, and the deep channel is where he is strongest.
      // He himself never leaves the mid-channel — he is the rope, not a thing
      // that walks — so the grip persists across rooms (you are both ON the
      // rope) and the boss keeps his post. Never strands: he only ever moves
      // you ALONG the rope toward home, so the way back is the way you came.
      if (grip.templateId === "the-drowned-ferryman"
          && (s.draggedRooms ?? 0) < FERRY_DRAG_MAX && chance(FERRY_DRAG_ODDS)) {
        const home = grip.home ?? FERRY_DRAG_ROOM;
        const exits = (this.world!.exits.get(s.roomId) ?? [])
          .filter((e) => !e.key_item || this.openDoors.has(`${s.roomId}:${e.dir}`));
        // Only ALONG the rope toward home, and never onto a gate — the drag is
        // a fair fight, not a way to strand you at a threshold.
        const closer = exits.filter((e) =>
          !this.world!.entryRooms.has(e.to_room)
          && this.roomDist(e.to_room, home) < this.roomDist(s.roomId, home),
        );
        if (closer.length) {
          const dest = closer[randInt(0, closer.length - 1)].to_room;
          const gtmpl = this.world!.mobTemplates.get(grip.templateId)!;
          s.draggedRooms = (s.draggedRooms ?? 0) + 1;
          this.roomFeed(s.roomId, `${cap(gtmpl.name)} hauls on the rope — ${s.name} is dragged out of the room.`, s.pubkey, false);
          this.send(s, `${cap(gtmpl.name)} hauls on the rope with both white hands — you are dragged ${(s.draggedRooms ?? 0) >= FERRY_DRAG_MAX ? "one more room" : "closer to the deep channel"}. (break free, or it keeps taking you across)`, "seize");
          this.sendStatus(s);
          s.roomId = dest;
          this.actorFeed(s, s.roomId, `${s.name} arrives, dragged.`, "who", false);
          // A DRAGGED MAN STILL HAS EYES. enterDescribe is the arrival print AND
          // the only thing that writes session.visited — skip it and you are
          // hauled into the dark with no room name, no exits and no idea where
          // the fight now is, and the room never counts as walked (so it can
          // never go on the wall chart or a surveyor's copy, though you were
          // physically in it). Being moved against your will is not the same as
          // being blindfolded.
          this.sendStatus(s);
          this.send(s, this.enterDescribe(s));
          this.combatNoise(s.roomId);
          // The grip stays with him (the rope connects you); he does not.
          this.refreshRoomCtx(s.roomId);
          this.refreshRoomCtx(grip.roomId);
        }
      }
    }

    mark("seize");

    // Creatures act: flee if badly hurt, otherwise fight back. Only so many can
    // reach one player in a tick (DOGPILE_CAP) — the rest press at the edges and
    // wait their turn, so a crowd is deadly but never an instant, unwinnable
    // grind. The blow budget is `canLandBlow` (shared with entry strikes this
    // tick); `heldBack` remembers whose victims felt the crush, for a line after.
    // THE BUBBLE: one live-set per tick. A creature outside it (and outside the
    // always-live few) skips the whole beat — no behavior, no writes — and lives
    // on the slow clock instead. The boss and the loosed Gaunt never freeze:
    // their dramas are map-scale, and they must keep unfolding unwatched.
    const liveRooms = this.liveRooms();
    // ...WITH ONE THING THAT IS NEITHER FROZEN NOR HERE. A creature off the map
    // (aloft — ai.drakePassage) skips the ordinary round entirely: it is not in
    // the room it names, so it must not sleep in it, hunt in it, perform a habit
    // line into it, or be bled by a wound in it. Its whole beat is the passage,
    // which the spine runs separately. This gate gets it because BOTH per-
    // creature loops read it, which is the only reason it belongs here rather
    // than at seven call sites.
    const live = (c: Creature) =>
      c.aloft === undefined
      && (!liveRooms || liveRooms.has(c.roomId)
        || c.templateId === ESCAPE_TMPL
        || world.mobTemplates.get(c.templateId)!.is_boss);
    const heldBack = new Set<string>();
    if (combatRound) for (const creature of this.creatures.values()) {
      if (!live(creature)) {
        // A wind-up that lost its prey to a death-warp (the one way a player
        // leaves a room without crossing the ring) must not hang loaded — the
        // spring resets when the room goes cold, same as when the room empties.
        if (creature.rouseAt !== undefined) creature.rouseAt = undefined;
        continue;
      }
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      // Rung senseless by a blunt blow: it loses this whole action, then clears.
      if (creature.stunned) {
        creature.stunned = false;
        const watcher = [...this.sessions.values()].find(
          (s) => s.roomId === creature.roomId && (s.target === creature.id || creature.target === s.pubkey),
        );
        if (watcher) this.send(watcher, `${cap(tmpl.name)} shakes off the daze.`);
        continue;
      }
      // A dire-hyena guarding a meal turns on anyone standing in the room with
      // it — whether they walked in, the meal came to them, or it went bold. No
      // grudge required; proximity to its kill is enough. But it doesn't spring
      // in a blink: it lifts its head, hackles up, and takes DIRE_ROUSE_MS to
      // commit — a wind-up you can back out of the room to escape, or preempt by
      // striking first (which puts it in a normal fight and cancels the tell).
      if (!creature.target && ai.hyenaGuardsMeal(this, creature)) {
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && this.reachable(s));
        if (!prey) {
          creature.rouseAt = undefined; // the room emptied — it drops back to its meal
        } else if (creature.rouseAt === undefined) {
          creature.rouseAt = now + DIRE_ROUSE_MS; // first sight: begin the wind-up, no strike yet
          this.send(prey, `${cap(tmpl.name)} lifts its bloodied muzzle and fixes on you, hackles rising — it hasn't sprung yet. (get out, or hit first)`);
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} rises from its kill, hackles up.`, prey.pubkey, false); // local: mob reaction
        } else if (now >= creature.rouseAt) {
          creature.rouseAt = undefined;
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `${cap(tmpl.name)} springs from its kill — it's on you.`);
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} springs at ${prey.name}.`, prey.pubkey, false);
        }
      }
      // The food web reaches UP: a predator starved past mere hunger, with no
      // easier prey in the room, turns on the lone delver sharing it — you're the
      // nearest meat. Like the meal-guard it WINDS UP (DIRE_ROUSE_MS) rather than
      // springing blind — the 'gaunt and ravenous, eyes fixed on you' tell was
      // the warning, this is the coil, and you can still back out a door or strike
      // first. A low per-tick roll BEGINS it (the threshold + no-prey gate already
      // make it rare); once wound up it commits. Not for meal-guarders — those own
      // the block above. See ai.starvingHunts for the guardrails.
      if (!creature.target && !ai.hyenaGuardsMeal(this, creature) && ai.starvingHunts(this, creature)) {
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && this.reachable(s));
        if (!prey) {
          creature.rouseAt = undefined; // no one to hunt — the hunger settles back
        } else if (creature.rouseAt === undefined) {
          if (chance(STARVE_HUNTS_ODDS * nightHuntMult(creature.templateId, creature.roomId, now) * ai.moonHuntMult(this, creature, now))) {
            creature.rouseAt = now + DIRE_ROUSE_MS;
            // A LURKER should have been foiled by your light — a lit room or a
            // torch in hand spoils its ambush (ai.wakeListeners). Naming that the
            // hunger OVERRIDES the light is the whole point of the deep's danger.
            const lurker = LURKERS.has(creature.templateId);
            if (lurker) creature.hidden = false; // it uncoils to wind up — unseen no longer
            this.send(prey, lurker
              ? `${cap(tmpl.name)} uncoils from the dark despite your light — starved past caring, it fixes on you. It hasn't sprung yet. (get out, or hit first)`
              : `${cap(tmpl.name)}, gaunt and starving, fixes on you — not a guard's warning but a predator's hunger. It hasn't sprung yet. (get out, or hit first)`);
            this.roomFeed(creature.roomId, `${cap(tmpl.name)}, starving, sizes up ${prey.name}.`, prey.pubkey, false);
          }
        } else if (now >= creature.rouseAt) {
          creature.rouseAt = undefined;
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `${cap(tmpl.name)} lunges — hunger drives it straight onto you.`, "dmgin");
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} runs at ${prey.name}, starving.`, prey.pubkey, false);
        }
      }
      // The food web reads WOUNDS too, independent of the predator's OWN
      // hunger: a badly hurt wanderer (< WOUNDED_FRACTION hp — the same "hurt"
      // threshold that already softens their own blows) reads as easier meat
      // than whatever else is around, even to a predator that isn't starving.
      // Excludes anything the block above already claimed (a genuinely
      // starving predator's own hunger is reason enough — this is the
      // separate case of a fed one smelling blood on someone stumbling).
      if (!creature.target && !ai.hyenaGuardsMeal(this, creature) && !ai.starvingHunts(this, creature) && ai.woundedPreyHunts(this, creature)) {
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && this.reachable(s) && s.hp < s.maxHp * WOUNDED_FRACTION);
        if (!prey) {
          creature.rouseAt = undefined; // healed up, left, or died — the interest settles
        } else if (creature.rouseAt === undefined) {
          if (chance(WOUNDED_PREY_ODDS * nightHuntMult(creature.templateId, creature.roomId, now) * ai.moonHuntMult(this, creature, now))) {
            creature.rouseAt = now + DIRE_ROUSE_MS;
            const lurker = LURKERS.has(creature.templateId);
            if (lurker) creature.hidden = false;
            this.send(prey, lurker
              ? `${cap(tmpl.name)} uncoils from the dark, drawn by the blood on you — it hasn't sprung yet. (get out, or hit first)`
              : `${cap(tmpl.name)} goes still, then fixes on you — it's caught the blood on you, and you're the easier meal here. It hasn't sprung yet. (get out, or hit first)`);
            this.roomFeed(creature.roomId, `${cap(tmpl.name)} goes still, sizing up ${prey.name}'s wounds.`, prey.pubkey, false);
          }
        } else if (now >= creature.rouseAt) {
          creature.rouseAt = undefined;
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `${cap(tmpl.name)} lunges for the wound already open in you.`, "dmgin");
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} runs at ${prey.name}, straight for the hurt.`, prey.pubkey, false);
        }
      }
      // A hungry thief doesn't wait to be wronged: restless with an empty belly,
      // it sidles up to anyone sharing its room and goes for the pack (rome,
      // 2026-07-18: "more aggressive while hungry"). Hands already full (mid-steal)
      // or asleep, it doesn't. Like the other unprovoked strikes it WINDS UP — a
      // beat to back out a door or hit first — and it's a ROB, not a kill: it
      // grabs a meal (steal-food-first in the combat block) and bolts. Its own
      // whistle-fear (avoids) keeps it from working the same mark over and over.
      if (!creature.target && !creature.stole && !creature.asleep
          && THIEVES.has(creature.templateId) && creature.hunger >= HUNGRY_AT) {
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && this.reachable(s));
        if (!prey) {
          creature.rouseAt = undefined; // no mark — the itch settles
        } else if (creature.rouseAt === undefined) {
          // A footpad's whole trade is not being seen. On a lit night he mostly
          // does not work the open road at all — the same roll, cut hard, so a
          // full moon is a thing worth planning a journey around rather than a
          // flavor line at nightfall (rome, 2026-08-10).
          if (chance(THIEF_ROB_ODDS * (ai.moonlit(this, creature.roomId, now) ? MOON_THIEF_MULT : 1))) {
            creature.rouseAt = now + DIRE_ROUSE_MS;
            this.send(prey, `${cap(tmpl.name)} eyes your pack, hungry, and edges closer — it hasn't sprung yet. (get out, or hit first)`);
            this.roomFeed(creature.roomId, `${cap(tmpl.name)} sidles toward ${prey.name}, eyeing the pack.`, prey.pubkey, false);
          }
        } else if (now >= creature.rouseAt) {
          creature.rouseAt = undefined;
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `${cap(tmpl.name)} darts in — going for your pack.`, "dmgin");
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} darts at ${prey.name}.`, prey.pubkey, false);
        }
      }
      // A SENTINEL sleeps at its post until roused (someone slips past, or a blow
      // lands). Asleep it does nothing — you can tiptoe by. Awake it takes anyone
      // in the room, like a drowned thing, and holds the door until it's put down
      // or its wake-clock runs out and it drops back to sleep.
      if (SENTINELS.has(creature.templateId)) {
        if (!this.sentinelAwake(creature)) {
          creature.target = null; // dead to the world while it sleeps
          continue;
        }
        if (!creature.target) {
          const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && this.reachable(s));
          if (prey) {
            creature.target = prey.pubkey;
            if (!prey.target) prey.target = creature.id;
            this.send(prey, `${cap(tmpl.name)} fixes ${HOUND_HEADS.get(creature.templateId) ?? "all three heads"} on you.`, "dmgin");
            this.roomFeed(creature.roomId, `${cap(tmpl.name)} turns on ${prey.name}.`, prey.pubkey, false);
          }
        }
      }
      // A drowned thing takes anyone who wades into its water — no grudge needed.
      if (!creature.target && DROWNERS.has(creature.templateId)) {
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && this.reachable(s));
        if (prey) {
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `The water heaves — ${tmpl.name} turns toward you.`);
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} turns toward ${prey.name}.`, prey.pubkey, false);
        }
      }
      if (creature.target) {
        const victim = this.sessions.get(creature.target);
        // The ferryman holds his prey ON THE ROPE across rooms — the drag's
        // whole point is that the fight follows the line, so his target doesn't
        // lapse when the haul moves them apart.
        const onRope = creature.templateId === "the-drowned-ferryman"
          && !!victim && victim.seizedBy === creature.id;
        // A wanderer behind a BARRED den door is out of reach even from here —
        // the bar is the whole of the den's security (den.ts) — so the fight
        // lapses like any other lost prey. The ferryman's rope-hold is the one
        // reach that outlives a room change, so only it skips the room check.
        if (!victim || !this.reachable(victim) || (victim.roomId !== creature.roomId && !onRope)) {
          creature.target = null;
          creature.rouseAt = undefined; // lost its prey — a dire-hyena winds up fresh next time
          continue;
        }
        // Keep a valid primary target for the UI: an attacker draws your focus
        // if you had none. (You already swing at every foe on you in the players'
        // phase — this is just bookkeeping, so it's silent.)
        if (!victim.target || !this.creatures.has(victim.target)) {
          victim.target = creature.id;
        }
        // It has hold of somebody — so it calls. Rolled every round it is still
        // in the fight, which is what makes a slow kill expensive: the pack is
        // the price of taking too long (ai.packCall).
        ai.packCall(this, creature, now);
        // THE SUMMIT'S ANIMAL acts before it swings, and sometimes instead of
        // swinging: a drawn breath, a body in the air, and the landing are each
        // a whole beat (ai.drakeBeat). Everything else in this loop is the
        // ordinary round and it does not apply while one of those is running.
        if (await ai.drakeBeat(this, creature, tmpl, now)) continue;
        // ...unless the cantor has it. A held thing does not swing: the song
        // outranks the fight, which is exactly what makes the cantor a lever.
        if (ai.heldBySong(creature, now)) continue;
        // A runner bolts the instant it has the initiative — every time, at any
        // health. You already swung this tick (the living go first), so your
        // blow lands as it breaks for the door; then it's gone and you give
        // chase. Brooders are the opposite: they never leave the nest.
        // A fire-fearing thing ROLLS to break from a flame-bearer each round it
        // stands there, at any health (ai.dreadsFire, FIRE_FLEE_CHANCE) — a
        // chance, not a certainty, since 2026-08-03: it used to bolt on sight,
        // which made a torch a no-fight button over most of the wood. Now the
        // fire argues with it round after round and usually wins by the third.
        // A lantern never triggers it at all (the shutter tames the flame).
        // Note what still holds them: the MANCATCHER below catches a fire-flinch
        // like any other bolt, so a torch and a barbed collar together mean the
        // wood can't run from you either.
        // Empty bone knows no fear: the hollow fight until they come apart.
        // A HOARDER doesn't run either, and that's a fairness rule as much as a
        // flavor one: it is a 100 hp grind, and a version of it that broke for
        // the dark at low health would carry the entire prize out of a fight you
        // had already spent your weapon's edge on. It is laden and slow. It
        // stands.
        // A MANEATER does not run — from fire, from wounds, from anything. A
        // BLOODTHIRSTY one runs only when it is truly nearly dead. (mob trait
        // lottery)
        const fleeAt = tmpl.max_hp * FLEE_BELOW * (creature.traits?.includes("bloodthirsty") ? MOB_BLOODTHIRSTY_FLEE_MULT
          : creature.traits?.includes("skittish") ? MOB_SKITTISH_FLEE_MULT
          : creature.traits?.includes("marked") ? MOB_MARKED_FLEE_MULT : 1);
        const wantsFlee = !creature.traits?.includes("maneater") && !creature.traits?.includes("hind-mother") && (
          ai.dreadsFire(this, creature, victim)
          || RUNNERS.has(tmpl.id)
          || (!tmpl.is_boss && !HOLLOW.has(tmpl.id) && !BROODERS.has(tmpl.id) && !DROWNERS.has(tmpl.id) && !SENTINELS.has(tmpl.id) && !HOARDERS.has(tmpl.id) && creature.hp < fleeAt && chance(FLEE_CHANCE)));
        // A BLOWN ANIMAL CANNOT RUN, whatever it wants. It has spent the rout
        // it had in it (ai.creatureMoves), so the roll it just won is worth
        // nothing and it fights where it stands — which is the whole point of
        // chasing one down rather than following it forever.
        if (wantsFlee && !tmpl.is_boss && !ai.scavengerBold(this, creature) && !ai.winded(creature, now)) {
          // MANCATCHER: the barbed collar in your shield hand holds what tries to
          // run — the bolt it just rolled becomes a wrench against the pole, and
          // the fight goes on. (PvP rule when that day comes: against PLAYERS the
          // barbs hobble — route through hobbled + HOBBLE_FLEE_MS — never a hard
          // hold. Flee is the victim's only out; see zone-data's MANCATCHER note.)
          const offhand = this.equippedItem(victim, "shield");
          if (offhand && hasTrait(offhand.tmpl, "mancatcher")) {
            this.send(victim, pick([
              `${cap(tmpl.name)} wrenches for the dark — the barbs of ${offhand.tmpl.name} hold it fast.`,
              `${cap(tmpl.name)} throws itself away from you and comes up short, caught in the collar.`,
              `${cap(tmpl.name)} strains against the pole, feet scrabbling — it is not going anywhere.`,
            ]), "block");
          } else {
            await ai.creatureMoves(this, creature, now, "flee", false);
            continue;
          }
        }
        // A wolf standing in a doorway is not also at your throat. It keeps its
        // target (so it holds the gap for as long as the fight lasts, and steps
        // back in the moment a packmate falls and the count drops) — it simply
        // doesn't swing. This is the pack's whole trade, and until now only the
        // announcement of it was true (ai.holdsExit).
        if (ai.holdsExit(this, creature, victim)) continue;
        // The dogpile cap: if this player already has a full press on them this
        // tick, this one can't get a blow in — it snarls at the edge and waits.
        // (It keeps its target, so it steps up the moment a slot opens.)
        if (!this.canLandBlow(victim.pubkey)) { heldBack.add(victim.pubkey); continue; }
        // Quick feet: a light load adds to the foe's miss chance, scaling down
        // as the kit gets heavier (dodgeBonus) — real evasion in cloth, nothing
        // in plate. And a wounded creature fights diminished — softer blows.
        const dodge = this.dodgeBonus(victim);
        const quick = this.loadOf(victim) < 2; // light enough to read as nimble
        const cHurt = creature.hp < tmpl.max_hp * WOUNDED_FRACTION;
        if (chance(FUMBLE_CHANCE + dodge + (cHurt ? WOUNDED_FUMBLE_BONUS : 0))) {
          if (!quick) {
            // It overreached, not just missed — genuinely off-balance, not
            // just beaten by your footwork (the `quick` branch is YOU being
            // nimble, not IT erring). Your very next landed hit punishes it.
            creature.staggerUntil = now + STAGGER_WINDOW_MS;
          }
          this.send(victim, quick
            ? pick([
                `${cap(tmpl.name)} lunges — you slip aside, nothing weighing you down.`,
                `${cap(tmpl.name)} comes at you and you sway clear of it, light on your feet.`,
                `${cap(tmpl.name)} strikes where you were — you're already gone.`,
              ])
            : pick([
                `${cap(tmpl.name)} lunges past you and crashes on, nothing to stop it.`,
                `${cap(tmpl.name)} swings wide and its blow finds only air.`,
                `${cap(tmpl.name)} overreaches, and the stroke goes past you.`,
              ]), "dodge");
          this.combatNoise(victim.roomId);
          continue;
        }
        // A shield can catch the blow whole — and unlike footwork, it holds up
        // even under a full load of plate (block is the heavy build's evasion).
        // A parrying blade (block on a weapon) counts toward the same catch.
        if (chance(this.equippedBlock(victim))) {
          const shield = this.equippedItem(victim, "shield");
          const parry = this.equippedItem(victim, "weapon");
          const catcher = shield ?? ((parry?.tmpl.block ?? 0) > 0 ? parry : null);
          const sh = catcher?.tmpl.name ?? "your shield";
          this.send(victim, pick([
            `You catch it on ${sh}.`,
            `You take the blow on ${sh}; it jars up your arm and holds.`,
            `${sh} turns the stroke aside.`,
            `You get ${sh} up in time — the blow rings off it.`,
          ]), "block");
          if (catcher) await this.wear(victim, catcher.carried, catcher.tmpl, ARMOR_WEAR);
          // The buckler's spike answers: what it catches, it costs (THORNS).
          const spike = shield ? trait(shield.tmpl, "thorns") : undefined;
          if (spike) {
            creature.hp -= spike;
            this.markHurt(creature, tmpl, victim.pubkey);
            if (creature.hp <= 0) {
              await this.onCreatureDeath(victim, creature, tmpl);
            } else {
              this.send(victim, `${cap(tmpl.name)} drives itself onto the spike — ${spike} back.`, "dmgout");
            }
          }
          // The parrying blade answers down the line of the turn: a caught blow
          // opens a bleed on the attacker (PARRY_RIPOSTE). Announced only when
          // the wound is fresh — refreshes are silent, like the weapon bleeds.
          // Dry bone doesn't bleed: the HOLLOW shrug the riposte off.
          const rip = shield ? trait(shield.tmpl, "riposte") : undefined;
          if (rip && !HOLLOW.has(tmpl.id) && creature.hp > 0) {
            const fresh = !creature.bleedTicks;
            creature.bleedTicks = BLEED_TICKS;
            // The riposte is its OWN wound — it STACKS on top of the weapon's
            // bleed (capped), rather than the weaker one being lost to a max().
            creature.bleedDmg = Math.min(BLEED_STACK_CAP, (creature.bleedDmg ?? 0) + rip);
            if (fresh) this.send(victim, `You answer over the turned blow — the point nicks deep, and ${tmpl.name} starts to bleed.`, "dmgout");
          }
          this.combatNoise(victim.roomId);
          continue;
        }
        let dmg = randInt(tmpl.dmg_min, tmpl.dmg_max) + (tmpl.is_boss ? (creature.phase ?? 0) * 3 : 0);
        // A snag-toothed hunter's bite lands soft (mob trait lottery); a blood
        // moon puts teeth in the dead (the hollow hit half again as hard).
        dmg = Math.round(dmg * ai.mobDmgMult(creature.traits) * ai.bloodMoonHollowMult(creature.templateId));
        // shadow-born hits harder under the shadow; patient's first blow — before
        // you've marked it — lands heavy.
        if (creature.traits?.includes("shadow-born") && events.shadowing(this, creature.roomId)) dmg = Math.round(dmg * MOB_SHADOW_DMG_MULT);
        // PATIENT SPENDS ITSELF ON ONE BLOW. The test used to be only "you are
        // not targeting it", which is not "the first blow" — it stays true for
        // the whole fight in the two cases that matter: a dogpile where your
        // target is something else, and any fight you are running from rather
        // than swinging back in. A patient lurker you never turn on was landing
        // half again as hard every round, forever. It gets the one heavy opener
        // the trait is written for, and then it is an ordinary animal.
        if (creature.traits?.includes("patient") && !creature.patientSpent && victim.target !== creature.id) {
          dmg = Math.round(dmg * MOB_PATIENT_MULT);
          creature.patientSpent = true;
        }
        if (ai.scavengerBold(this, creature)) dmg = Math.round(dmg * BOLD_DMG_MULT);
        // A drowned thing that already has hold of you drags harder.
        if (victim.seizedBy === creature.id) dmg = Math.round(dmg * SEIZE_DMG_MULT);
        if (cHurt) dmg = Math.max(1, Math.round(dmg * WOUNDED_DMG_MULT));
        let flourish = ".";
        if (chance(CRIT_CHANCE)) {
          dmg *= 2;
          flourish = pick(CRIT_FLOURISH);
        }
        if (victim.staggered) {
          dmg += STAGGER_BONUS;
          victim.staggered = false;
          flourish = ", catching you off balance" + (flourish === "." ? "." : flourish);
        }
        // Worn armor thins the blow — but never closes it; a hit always bites.
        // Then your stance: guarded soaks more, reckless leaves you open.
        const worn = this.equippedItem(victim, "armor");
        dmg = Math.max(1, Math.round(dmg * ARMOR_K / (this.equippedArmor(victim) + ARMOR_K))); // % mitigation, never immunity
        dmg = Math.max(1, Math.round(dmg * STANCE[victim.stance].def));
        victim.hp -= dmg;
        // The vitals lottery — the Tarkov headshot. A real threat (not shallow
        // trash) may find the gap on any landed hit: instant, ignoring what hp
        // you had left; armor over the vitals only bought the odds down. Drops to
        // 0 so the killing blow runs through the same death path below.
        let vitals = false;
        if (victim.hp > 0 && VITALS_THREATS.has(creature.templateId)
            && this.vitalsLottery(this.equippedArmor(victim), VITALS_PVE)) {
          victim.hp = 0;
          vitals = true;
        }
        // While a drowned thing has you under, it can drag you deeper — a lungful
        // of black water no armor turns, a share of your very life, and it can be
        // the end of you. The only answer is to break the grip. (Folds into the
        // hp check below, so a fatal pull runs death like any killing blow.)
        let drowned = 0;
        if (victim.seizedBy === creature.id && DROWNERS.has(creature.templateId) && chance(SEIZE_DROWN_ODDS)) {
          drowned = Math.max(1, Math.round(victim.maxHp * SEIZE_DROWN_FRACTION));
          victim.hp -= drowned;
        }
        victim.pose = undefined; victim.poseAt = undefined; victim.poseRef = undefined; // teeth end a posture, as they end a rest
        if (victim.resting) {
          victim.resting = false;
          this.send(victim, "You are dragged from your rest.");
          this.actorFeed(victim, victim.roomId, this.feedProc(FEED_REST_CAUGHT, tmpl.name, victim.name), "fight");
        }
        if (victim.hp > 0) {
          this.send(victim, `${cap(tmpl.name)} ${this.creatureHit(tmpl.id)} for ${dmg}${flourish} [${victim.hp}/${victim.maxHp} hp]`, flourish === "." ? "dmgin" : "dmgin big");
          if (drowned) this.send(victim, `${cap(tmpl.name)} drags you under — black water fills your lungs for ${drowned}. (break free, or drown)`, "dmgin big");
          // light-snuffing: a landed blow puts your flame out (mob trait lottery).
          if (creature.traits?.includes("light-snuffing") && victim.litSource === "torch" && this.carriesLight(victim)) {
            victim.litUntil = undefined; victim.litSource = undefined; victim.litRow = undefined; victim.torchWarned = false;
            this.send(victim, "It reaches through the light and closes on it — your torch goes out without a sound.", "dmgin");
            this.sendStatus(victim);
          }
          this.sendStatus(victim);
          // THE BODY BITES BACK (2026-08-20): spiked armor (spiked:N) returns a
          // point of pain to whatever lands a blow on it — the pavise's thorns,
          // worn all over. Flat, unmitigated, and it can finish the thing.
          const spikes = this.wornTrait(victim, "spiked");
          if (spikes > 0 && creature.hp > 0) {
            creature.hp -= spikes;
            if (creature.hp <= 0) {
              await this.onCreatureDeath(victim, creature, tmpl, `${cap(tmpl.name)} drives home on ${victim.name} — and the spikes take it through.`);
              continue;
            }
            this.send(victim, `The spikes of your armor bite back — ${cap(tmpl.name)} takes ${spikes}.`, "dmgout");
          }
          this.combatNoise(victim.roomId);
          // The mallet's arc doesn't stop at the first body: everyone else in the
          // room catches the sweep's back-half at half weight (see sweepArc).
          await this.sweepArc(victim.roomId, creature, tmpl, victim.pubkey);
          // A drowned thing that lands a blow can take hold — you're seized,
          // can't flee, and it drags harder until you wrench free or kill it.
          // SLICK hide (eel-skin) gives cold arms half as much to hold; worn MASS
          // (poise) plants you so it can't drag — strongest-wins, never stacked.
          const seizeMult = Math.min(this.wearsTrait(victim, "slick") ? SLICK_SEIZE_MULT : 1, 1 - this.poiseOf(victim));
          const seizeOdds = SEIZE_ODDS * seizeMult * (creature.traits?.includes("undertow") ? MOB_UNDERTOW_MULT : 1);
          // LAND-BOUND cannot take hold out of the water, and the reason this is
          // worth a trait rather than a footnote is WHERE it fires. In its own
          // flood a drowner is in its element and nothing about it is lesser.
          // But the drowned SURFACE into the dungeon — they drag themselves up
          // out of a black crack in the floor, onto dry stone — and that is the
          // moment this one is shown up: it comes up, it swings, and the arms
          // close on nothing. It is also the one drowner flaw a player can use
          // on purpose, by backing onto dry ground.
          const inWater = events.tideFlooded(this, victim.roomId) || events.seaUnder(this, victim.roomId) || events.spated(this, victim.roomId);
          const landBound = creature.traits?.includes("land-bound") && !inWater;
          if (DROWNERS.has(creature.templateId) && !landBound && !victim.seizedBy && chance(seizeOdds)) {
            victim.seizedBy = creature.id;
            this.send(victim, `${cap(tmpl.name)} closes cold arms around you — you're held fast. (break free: keep fighting, or it drags you under)`, "seize");
          }
          // Claws and teeth open a wound the mail can't turn.
          this.openWound(victim, tmpl, creature);
          // The leg-goers go low — a hit can hamstring you.
          this.maybeHobble(victim, tmpl);
          // The toll clerk brands you. A landed blow is the road's tax: while the
          // mark holds, earshot heeds you twice as hard and hungry ears come to
          // look — the institution remembering your face costs you the quiet.
          if (MARKERS.has(creature.templateId)) this.markBrand(victim, tmpl);
          // A heavy dead blow can ring YOUR skull — you lose your next swing.
          // One hit, one lost beat; you can't be stun-chained deeper. PADDING
          // (cushion) takes the ring out of a share; worn MASS (poise) shrugs the
          // stagger — strongest-wins, so heavy resists by mass and a LIGHT build
          // buys the same by slotting a padded piece (no double-dip).
          const stunMult = Math.min(this.wearsTrait(victim, "padded") ? PADDED_STUN_MULT : 1, 1 - this.poiseOf(victim));
          const stunOdds = tmpl.stun * stunMult;
          if (tmpl.stun > 0 && !victim.stunned && chance(stunOdds)) {
            victim.stunned = true;
            this.send(victim, `${cap(tmpl.name)} lands like a falling stone — your skull rings and the room tilts.`, "stun");
            this.actorFeed(victim, victim.roomId, this.feedProc(FEED_STUN, tmpl.name, victim.name), "stun");
            this.sendStatus(victim); // light the stun pill the instant it lands — the flag was set but never pushed (rome, 2026-07-17)
          }
          // Eating a blow thins the mail a hair (provisional gear only).
          if (worn) await this.wear(victim, worn.carried, worn.tmpl, ARMOR_WEAR);
          // The verdigris-thing's blows eat your KIT, not your blood (soft).
          if (CORRODERS.has(creature.templateId)) await this.corrodeTouch(victim, tmpl);
          // A cutpurse doesn't fight to win — it fights to grab. One good hit,
          // one unsealed thing off your back (it goes for the richest), and gone.
          // Sealed loot is TITLE the dungeon marked as yours; its fingers slide off.
          // STRAPPED (the baldric) lashes everything down — nothing to lift.
          if (THIEVES.has(creature.templateId) && !creature.stole && this.wearsTrait(victim, "strapped")) {
            this.send(victim, `${cap(tmpl.name)}'s fingers dance over your pack and find everything lashed down tight. It hisses.`);
          } else if (THIEVES.has(creature.templateId) && !creature.stole) {
            const takeable = victim.items.filter((c) => c.serial === null && !c.equipped);
            const byRarity = (a: typeof takeable[number], b: typeof takeable[number]) =>
              (RARITY_RANK[world.itemTemplates.get(b.itemId)?.rarity ?? "common"] ?? 0)
              - (RARITY_RANK[world.itemTemplates.get(a.itemId)?.rarity ?? "common"] ?? 0);
            // A hungry thief grabs a MEAL before the shiny thing — food off your
            // pack first when its belly's talking (rome, 2026-07-18). Well-fed,
            // it goes for the richest as ever. (Richest food if you carry several.)
            // CHOOSY ignores its own belly. A hungry thief taking your bread is
            // the merciful version of this fight — the food is cheap and it is
            // eaten on the run, so nothing you cared about left with it. This one
            // walks past the meal it needs and lifts the best thing you own,
            // which is the outcome you actually mind, and it means hunger stops
            // being a thing you can hope for.
            const foodFirst = creature.hunger >= HUNGRY_AT && !creature.traits?.includes("choosy")
              ? takeable.filter((c) => world.itemTemplates.get(c.itemId)?.edible).sort(byRarity)[0]
              : undefined;
            const loot = foodFirst ?? [...takeable].sort(byRarity)[0];
            // ...and the hand still has to find the buckle. A landed blow used to
            // be a guaranteed lift, which made a thief a tax instead of a fight.
            // The miss is loud on purpose: you get a round to decide whether to
            // back out, and it keeps trying every hit, so standing there still
            // costs you (zone-data THIEF_LIFT_ODDS).
            // BUTTER-FINGERED is light-fingered's exact mirror: that one skips
            // this roll entirely, this one halves it. It keeps trying and keeps
            // fumbling, and every fumble is a round you get to decide in.
            const liftOdds = (THIEF_LIFT_ODDS.get(creature.templateId) ?? THIEF_LIFT_DEFAULT)
              * (creature.traits?.includes("butter-fingered") ? MOB_BUTTERFINGERS_MULT : 1);
            if (loot && !creature.traits?.includes("light-fingered") && !chance(liftOdds)) {
              this.send(victim, `${cap(tmpl.name)}'s hand goes over your pack and comes away with nothing. It will try again.`);
              this.roomFeed(victim.roomId, `${cap(tmpl.name)} makes a grab at ${victim.name}'s pack and misses it.`, victim.pubkey, false);
            } else if (loot) {
              const it = world.itemTemplates.get(loot.itemId)!;
              victim.items.splice(victim.items.indexOf(loot), 1);
              await removeItemRow(this.env.DB, loot.rowId);
              if (it.edible && creature.hunger >= HUNGRY_AT) {
                // A hungry thief that grabs FOOD doesn't fence it — it crams it
                // down on the run. THAT is how a cutpurse feeds (rome, 2026-07-18:
                // "we have to feed them"): the meal sates it (hunger clears, a
                // little heal) and is GONE — no "kill it to get it back". Gear it
                // still pockets to drop on death; only food it eats.
                creature.hunger = 0;
                creature.hp = Math.min(tmpl.max_hp, creature.hp + Math.max(it.heal, 3));
                this.send(victim, `${cap(tmpl.name)} snatches ${it.name} and crams it down as it bolts — gone.`);
                this.roomFeed(victim.roomId, `${cap(tmpl.name)} tears a meal from ${victim.name} and flees, gulping it down.`, victim.pubkey, false);
              } else {
                creature.stole = loot.itemId;
                // A stolen journal keeps its pages: the row dies here, so its
                // instance identity must ride the thief or the book comes back blank.
                creature.stoleJournal = loot.journalId;
                this.send(victim, `${cap(tmpl.name)} snatches ${it.name} and bolts! (kill it to get it back)`);
                this.roomFeed(victim.roomId, `${cap(tmpl.name)} tears something from ${victim.name} and flees!`, victim.pubkey, false);
              }
              this.sendCtx(victim);
              await ai.creatureMoves(this, creature, now, "flee", false);
              continue;
            }
          }
        } else {
          if (vitals) {
            this.send(victim, `${cap(tmpl.name)} ${this.creatureVitals(tmpl.id)} — ${pick(VITALS_DARK)}`, "dmgin big vital");
            this.roomFeed(victim.roomId, `${cap(tmpl.name)} drops ${victim.name} with one terrible strike.`, victim.pubkey, false);
          }
          await this.onPlayerDeath(victim, tmpl);
        }
      }
    }
    mark("creatures");

    // Surrounded but shielded by the crush: a single line so the player reads
    // why not everything lands, without spamming it every tick.
    for (const pk of heldBack) {
      const v = this.sessions.get(pk);
      if (v && v.hp > 0 && chance(0.25)) this.send(v, "The press around you is too thick — only so many can reach you at once.");
    }

    // Wounds weep between blows: armor-ignoring bleed, ticking down until it
    // clots. A cut that would drop you SOMETIMES kills outright (BLEED_KILL_ODDS);
    // otherwise you cling on at 1 hp — one beat to bind it or run, but the next
    // tick rolls again. Gear turns a blow, never a wound.
    if (combatRound) for (const session of this.sessions.values()) {
      if (!session.bleedTicks || session.bleedTicks <= 0) continue;
      if (this.outOfWorld(session)) { session.bleedTicks = 0; session.bleedDmg = 0; continue; } // safe at the gate; you bind it there
      session.bleedTicks -= 1;
      const bd = session.bleedDmg ?? 1;
      if (session.hp - bd <= 0 && chance(BLEED_KILL_ODDS)) {
        this.send(session, "The wound won't close. The dark comes up fast.", "death big");
        await this.onPlayerDeath(session, null);
        continue;
      }
      // Rounded, always. Every bleed value in the game is an integer, so this
      // costs nothing — but a fractional one (mig 140: I wrote seven of them as
      // odds by mistake) put 49.400000000000006 on a player's screen, because
      // 0.3 has no exact binary form and three ticks of it drift. A hit point
      // total is the most-read number in the game and it must never show that.
      session.hp = Math.max(1, Math.round((session.hp - bd) * 100) / 100);
      if (session.bleedTicks <= 0) { session.bleedTicks = 0; session.bleedDmg = 0; }
      this.send(session, `Your wound bleeds — ${bd}.${session.bleedTicks ? "" : " It clots."} [${session.hp}/${session.maxHp} hp]`, "dmgin");
      this.sendStatus(session);
    }

    // Auto-bandage: a bleeding wanderer who drops to half binds a wound on
    // reflex — if they carry a dressing. Clots the bleed, staunches a little.
    // Out of dressings in the deep and the leaking just keeps on.
    for (const session of this.sessions.values()) {
      if (session.hp <= 0 || !session.bleedTicks) continue;
      if (session.hp >= session.maxHp * BANDAGE_FRACTION) continue;
      const dressing = verbs.carriedBandages(this, session)[0];
      if (dressing) await verbs.applyBandage(this, session, dressing, true);
    }

    // Auto-eat: the blows have landed for this tick — anyone still on their feet
    // but bled below the line grabs a bite from the pack without being told to,
    // if there's food to grab. A reflex, not a turn: it doesn't leave an opening.
    for (const session of this.sessions.values()) {
      if (session.hp <= 0 || session.hp >= session.maxHp * AUTO_EAT_FRACTION) continue;
      if (!this.inCombat(session)) continue;
      const food = verbs.carriedFoodAuto(this, session)[0];
      if (!food) continue;
      const { before, tmpl } = await verbs.consumeFood(this, session, food);
      this.send(session, session.hp > before
        ? `Your hand goes to the pack on its own — you tear into ${tmpl.name}. [${session.hp}/${session.maxHp} hp]`
        : `Your hand goes to the pack on its own — you tear into ${tmpl.name}.`, "gain");
      this.roomFeed(session.roomId, `${session.name} snatches a bite mid-fight.`, session.pubkey, false);
      this.sendStatus(session);
      this.sendCtx(session);
      await this.trySavePlayer(session.pubkey, session.roomId, session.hp);
    }

    // A linkdead body lets go when its fight ends or the window closes — only
    // then does the normal fade run (creature targets cleared, state flushed).
    for (const session of [...this.sessions.values()]) {
      if (!session.linkdeadUntil) continue;
      const fightLive = !!session.target
        || [...this.creatures.values()].some((c) => c.target === session.pubkey);
      if (!fightLive || now >= session.linkdeadUntil) {
        session.linkdeadUntil = undefined;
        await this.onLeave(session);
      }
    }

    mark("recovery");

    // Lights burn down (light.ts): low-flame warnings, burnout, the dark
    // closing back over, and a lantern's last burn spending the lantern.
    await light.tickLights(this, now);
    mark("lights");

    // The sky turns (events.ts): rain telegraphs, falls, and leaves mud —
    // and its kin to come. The spine just winds the clock.
    await events.tickEvents(this, now);
    mark("events");

    // The day/night world-clock flips: tell whoever's standing outside to
    // see it (same courtesy the weather events already extend on their own
    // onset/lift). Silent for anyone indoors — the deep/warrens/keep don't
    // care what hour it is, and isDark()/scavengerBold() already read the
    // clock directly without needing this announcement at all.
    const nightNow = isNight(now);
    if (this.lastNightPhase !== undefined && this.lastNightPhase !== nightNow) {
      // A full-moon nightfall gets its own line — isDark() already skips the
      // outdoor-night check on these nights, so the grounds genuinely stay
      // lit; the announcement has to say so, not just that dark "settles".
      // THE SKY NAMES ITS MOON (rome, 2026-08-10). Nightfall used to have two
      // states, full or not, when the moon has always ridden a six-night modulo
      // underneath — so five different nights all read "full dark settles" and
      // the full moon arrived out of nowhere every sixth. Now the line says
      // which night of the month this is, and the waxing half counts you down
      // to the one night the grounds stay lit (zone-data MOON_NIGHTS).
      const line = nightNow
        ? MOON_NIGHTS[moonPhase(now)] ?? MOON_NIGHTS[3]
        : "Dawn breaks over the grounds — the dark thins and lifts.";
      for (const s of this.sessions.values()) {
        if (this.outOfWorld(s) || !OUTDOOR_ROOMS.has(s.roomId)) continue;
        this.send(s, line, "evt");
      }
      // ...and the watchers get it too. The per-session sends above are gated on
      // standing OUTDOORS under the actual sky, which no broadcast can express —
      // but a spectator is watching the world, not standing in a room of it, so
      // the sky's own news belongs in the feed (rome: "its still showing in the
      // spectator feed right?").
      this.relayFeed("mudzone-" + (this.world?.zone ?? "door"), line);
    }
    // ...and on a full moon the wood answers it. Only at moonrise, only from
    // things with a voice, and it changes nothing at all.
    if (this.lastNightPhase !== undefined && this.lastNightPhase !== nightNow && nightNow && isFullMoon(now)) {
      const sang = new Set<string>();
      for (const c of this.creatures.values()) {
        if (!PACK_CALLERS.has(c.templateId) || c.asleep || c.target) continue;
        if (sang.has(c.roomId) || !chance(MOON_HOWL_ODDS)) continue;
        sang.add(c.roomId);
        this.roomFeed(c.roomId, "It puts its head back and howls at the white of it — long, and not at anything.", undefined, false, "evt");
        this.roomSound(c.roomId, "A howl goes up {dir}, and hangs.");
      }
      if (sang.size) {
        this.roomFeedBands(SURFACE_BANDS, sang.size > 2
          ? "The howling starts somewhere west and is answered, and answered again, until the whole wood is at it."
          : "Somewhere out under the moon, something howls, and is answered.", "evt");
      }
    }
    // THE LAST WATCHMAN CALLS THE HOUR. He has walked the high circuit since
    // before anything here died, and at nightfall he reports the watch — to a
    // fortress with nobody left in it to be reassured. Only while he lives, and
    // only to the fortress: the wood has its own voice for the dark (the howl
    // above), and this one is a man's, and worse for it.
    if (this.lastNightPhase !== undefined && this.lastNightPhase !== nightNow && nightNow) {
      const watch = [...this.creatures.values()].find((c) => c.templateId === "last-watchman" && !c.target);
      if (watch) this.roomFeedBands(FORTRESS_BANDS, pick(WATCH_CALLS), "evt");
    }
    this.lastNightPhase = nightNow;

    // The keeper's shelves breathe: restocks come in, and every few hours an
    // off-screen customer buys him out of some one thing.
    gate.tickFence(this, now);
    // The bounty board churns on the same clock — trophies off the board, a
    // fresh set pinned up.
    gate.tickBounty(this, now);

    // A gatehouse shuts for works now and then, and opens again when they're
    // done. The gate ROOM is never touched — only what's behind the door.
    works.tickWorks(this, now);

    // ---- THE CHAINMAN COMES, AND THE CHAINMAN GOES ----
    // A world-roll rather than a den, because he can turn up ANYWHERE. Same
    // shape as the hammerstone: check every few hours, and mostly nothing.
    if (!this.nextChainmanAt) {
      this.nextChainmanAt = now + randInt(CHAINMAN_ROLL_MIN_MS, CHAINMAN_ROLL_MAX_MS);
    } else if (now >= this.nextChainmanAt) {
      this.nextChainmanAt = now + randInt(CHAINMAN_ROLL_MIN_MS, CHAINMAN_ROLL_MAX_MS);
      const already = [...this.creatures.values()].some((c) => c.templateId === CHAINMAN_TMPL);
      const tmpl = world.mobTemplates.get(CHAINMAN_TMPL);
      if (!already && tmpl && chance(CHAINMAN_ODDS)) {
        // Anywhere at all — every room in the world is a candidate. He is
        // measuring the place; he does not care which part of it he is in.
        const ids = [...world.rooms.keys()];
        const roomId = ids[randInt(0, ids.length - 1)];
        const c: Creature = {
          id: uuid(),
          templateId: CHAINMAN_TMPL,
          roomId,
          hp: tmpl.max_hp,
          hunger: 0,
          grudges: [],
          nextWanderAt: now + randInt(20_000, 60_000),
          target: null,
          carries: this.rollCarry(tmpl),
          home: roomId,
          // THE THING NOTHING ELSE HAS: a time he is done here.
          leavesAt: now + randInt(CHAINMAN_STAY_MIN_MS, CHAINMAN_STAY_MAX_MS),
        };
        this.creatures.set(c.id, c);
        this.noteCreaturesChanged();
        this.refreshRoomCtx(roomId);
      }
    }
    // ...and anything with somewhere else to be, goes. Not killed, not
    // despawned in front of you if it can be helped: it walks off, and the line
    // only prints for whoever was standing there to watch it happen.
    for (const c of [...this.creatures.values()]) {
      if (!c.leavesAt || now < c.leavesAt || c.target) continue;
      const seen = [...this.sessions.values()].some((s) => s.roomId === c.roomId && !this.outOfWorld(s));
      if (seen) this.roomFeed(c.roomId, pick(CHAINMAN_LEAVES), undefined, false, "amb");
      this.creatures.delete(c.id);
      this.noteCreaturesChanged();
      this.refreshRoomCtx(c.roomId);
    }

    // The hammerstone is DICE now (the floor-renewal law): the world checks
    // itself every few hours and only sometimes coughs one up, into a random
    // haunt — graves, scree, mine-throats, the tide's midden. No spot to farm,
    // no clock to farm either; the cadence × odds keeps rome's ~twice-a-day
    // tune. Capped: misses and empty weeks don't pile stones up.
    if (now >= this.nextStoneAt) {
      this.nextStoneAt = now + randInt(STONE_ROLL_MIN_MS, STONE_ROLL_MAX_MS);
      if (chance(STONE_MINT_ODDS)) {
        let loose = 0;
        for (const roomId of HAMMERSTONE_HAUNTS) {
          loose += (this.ground.get(roomId) ?? []).filter((id) => id === "hammerstone").length;
        }
        if (loose < STONE_GROUND_CAP) {
          const haunts = HAMMERSTONE_HAUNTS.filter((r) => world.rooms.has(r));
          if (haunts.length) {
            const roomId = haunts[randInt(0, haunts.length - 1)];
            this.ground.set(roomId, [...(this.ground.get(roomId) ?? []), "hammerstone"]);
            this.refreshRoomCtx(roomId);
          }
        }
      }
    }

    // The longbrand rolls on the same law — the rare torch turning up in
    // fire-keeping country (hearths, watch posts, the garrison's light-rooms).
    // Same dice-not-schedule shape as the stone; capped at one unfound.
    if (now >= this.nextBrandAt) {
      this.nextBrandAt = now + randInt(BRAND_ROLL_MIN_MS, BRAND_ROLL_MAX_MS);
      if (chance(BRAND_MINT_ODDS)) {
        let loose = 0;
        for (const roomId of BRAND_HAUNTS) {
          loose += (this.ground.get(roomId) ?? []).filter((id) => id === BRAND_ITEM).length;
        }
        if (loose < BRAND_GROUND_CAP) {
          const haunts = BRAND_HAUNTS.filter((r) => world.rooms.has(r));
          if (haunts.length) {
            const roomId = haunts[randInt(0, haunts.length - 1)];
            this.ground.set(roomId, [...(this.ground.get(roomId) ?? []), BRAND_ITEM]);
            this.refreshRoomCtx(roomId);
          }
        }
      }
    }

    // A plain torch rolls into the smokehouse on the same dice-not-schedule law —
    // kindling left by the old fire, for whoever comes to cure. Capped at one
    // lying unfound: a lucky find that saves you a torch, never a refill you can
    // lean on or farm (rome, 2026-07-17).
    if (now >= this.nextSmokeTorchAt) {
      this.nextSmokeTorchAt = now + randInt(SMOKE_TORCH_ROLL_MIN_MS, SMOKE_TORCH_ROLL_MAX_MS);
      if (chance(SMOKE_TORCH_MINT_ODDS) && world.rooms.has(SMOKEHOUSE_ROOM)) {
        const loose = (this.ground.get(SMOKEHOUSE_ROOM) ?? []).filter((id) => id === TORCH_ITEM).length;
        if (loose < SMOKE_TORCH_GROUND_CAP) {
          this.ground.set(SMOKEHOUSE_ROOM, [...(this.ground.get(SMOKEHOUSE_ROOM) ?? []), TORCH_ITEM]);
          this.refreshRoomCtx(SMOKEHOUSE_ROOM);
        }
      }
    }

    // The deep eats its own: a strayed rat dies in the dark and rots where it
    // fell, and the pale hunters scavenge it (their feed cycle). Same dice-not-
    // schedule law — one carcass every several hours, into a deep room that
    // doesn't already hold a body, so it never piles up into a larder. A carcass
    // is a corpse trace (what scavengerFeeds eats); it reads in the room and ages
    // out like any death. This is what keeps a crawler's hunger a GRADIENT rather
    // than a permanent starve — a quiet enough stretch still finds nothing.
    if (now >= this.nextCarrionAt) {
      this.nextCarrionAt = now + randInt(CARRION_ROLL_MIN_MS, CARRION_ROLL_MAX_MS);
      if (chance(CARRION_MINT_ODDS)) {
        const rooms = [...DEEP_ROOMS].filter((r) =>
          world.rooms.has(r) && !(this.traces.get(r) ?? []).some((t) => CORPSE_TRACES.has(t.kind)),
        );
        if (rooms.length) {
          const room = rooms[randInt(0, rooms.length - 1)];
          this.addTrace(room, { kind: "blood", at: now, label: "a strayed rat" });
          this.refreshRoomCtx(room);
        }
      }
    }

    // The black door remembers its shape: a heart buys a WINDOW, not a
    // thoroughfare. It only ever bars the way down (the-descent's way up is
    // unkeyed — nobody is sealed in); shutting restarts the corpse-key mint.
    for (const [key, at] of this.doorCloseAt) {
      if (now < at) continue;
      this.doorCloseAt.delete(key);
      if (!this.openDoors.delete(key)) continue;
      this.roomFeedBands(FORTRESS_BANDS, "Deep below, iron grinds slowly shut. The dark has taken back its door.");
    }

    // Bodies and appetites advance by WALL-CLOCK elapsed, not the nominal
    // TICK_MS — because the beat now stretches to IDLE_TICK_MS when the world
    // is quiet, and a fixed 2s-per-tick increment would starve and heal the
    // world ~7.5x too slow on the slow beat (the hunger ecology mutes itself the
    // moment nobody's fighting). Real elapsed keeps the rates true at any beat
    // speed. First tick of a fresh DO (lastTickAt 0) uses the nominal step, and
    // an abnormal gap (a cold wake with parked sockets, before catchUp's own
    // fast-forward) is capped so it can't dump one giant appetite jump.
    const sinceTick = this.lastTickAt ? now - this.lastTickAt : TICK_MS;
    this.lastTickAt = now;
    const stepMs = Math.min(sinceTick, IDLE_TICK_MS * 2); // capped real elapsed — see note above
    const tickMins = stepMs / 60_000;
    const beatMul = stepMs / TICK_MS; // 1 at the fast beat, ~7.5 at the idle beat: scales the other fixed per-2s-tick rates (rust) to wall-clock
    for (const creature of this.creatures.values()) {
      // Outside the bubble the beat doesn't reach: appetite, healing, feeding
      // and wandering all advance on the slow clock (slowEcology) instead, by
      // real elapsed time — so freezing here never starves or fattens anything,
      // it only coarsens WHEN the same arithmetic runs. (A bleed pauses frozen —
      // combat's own refugee, it resumes with the room. Rare, and kinder than
      // letting an unwatched wound tick a creature down to a corpse nobody cut.)
      if (!live(creature)) continue;
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      // A fresh wound weeps: armor-ignoring damage each tick until it clots. It
      // wears a thing down but never lands the kill — your own strike does that.
      if (combatRound && creature.bleedTicks && creature.bleedTicks > 0) {
        creature.bleedTicks -= 1;
        const bd = creature.bleedDmg ?? 1;
        creature.hp = Math.max(1, Math.round((creature.hp - bd) * 100) / 100); // same rounding law as the player's wound

        if (creature.bleedTicks <= 0) { creature.bleedTicks = 0; creature.bleedDmg = 0; }
        const watcher = [...this.sessions.values()].find(
          (s) => s.roomId === creature.roomId && (s.target === creature.id || creature.target === s.pubkey),
        );
        if (watcher) this.send(watcher, `${cap(tmpl.name)} bleeds — ${bd}. (${this.condition(creature)})`);
      }
      if (ai.hungers(creature.templateId)) {
        creature.hunger = Math.min(HUNGER_MAX, creature.hunger + ai.hungerRate(this, creature) * tickMins);
      } else creature.hunger = 0;
      // Time wears grudges away, each kind at its own pace (the boss never lets go).
      if (creature.grudges.length && !tmpl.is_boss) {
        const ms = ai.forgetMs(this, tmpl);
        creature.grudges = creature.grudges.filter((g) => now - g.at < ms);
      }
      if (!creature.target) {
        // Asleep: dead to the world — no feeding, no hunting, no wandering.
        // It wakes to its own clock here; a footfall (wakeListeners), a noise
        // (combatNoise), or a blow wakes it early.
        if (creature.asleep) {
          if (now >= (creature.sleepUntil ?? 0)) {
            creature.asleep = false;
            creature.sleepUntil = undefined;
            creature.nextWanderAt = Math.min(creature.nextWanderAt, now + randInt(4000, 15_000));
          } else continue;
        }
        // A still-bleeding thing doesn't knit up; the wound has to clot first.
        if (!creature.bleedTicks) creature.hp = Math.min(tmpl.max_hp, creature.hp + CREATURE_HEAL_PER_MIN * tickMins);
        if (creature.hp >= tmpl.max_hp) creature.phase = 0; // whole again, seated again
        // A scavenger standing on the dead eats first of all — and drags off
        // any gear left lying where a body fell.
        if (SCAVENGERS.has(creature.templateId)) { ai.scavengerFeeds(this, creature, false); ai.scavengerScoops(this, creature); ai.mourns(this, creature, now); }
        // The hoarder does the scoop and nothing else in this block: no feeding
        // (it has no appetite — see hungers), no mourning. Just the floor.
        else if (HOARDERS.has(creature.templateId)) ai.scavengerScoops(this, creature);
        // Vermin eat the dead only to survive: a hungry rat gnaws a corpse to sate
        // (no loot-hauling, no mourning, no gorging bold — that's SCAVENGERS only).
        else if (VERMIN.has(creature.templateId) && creature.hunger >= HUNGRY_AT) ai.scavengerFeeds(this, creature, false);
        // The pale hunters feed the same way to survive — a fresh kill in their
        // stretch of dark resets the hunger that would otherwise drive them off
        // their ambush and onto your torchlight. A LONG-quiet corridor (no death
        // near) is what starves one desperate enough to come anyway. (Feed only:
        // no gear-scooping, no going bold — they're hunters, not looters.)
        // STAYS IN THE CHAIN. The `else` is the guard: nothing may take two
        // feeds in one tick, and today nothing is in two of these sets — but
        // the exclusivity is enforced HERE, not by the sets remembering to stay
        // apart. Break the chain and the day a lurker joins VERMIN it silently
        // heals twice a beat.
        else if (LURKERS.has(creature.templateId) && creature.hunger >= HUNGRY_AT) ai.scavengerFeeds(this, creature, false);
        // A corvid works the sack on TOP of whatever it just ate — carrying is
        // not feeding, so this is deliberately its own statement and not part
        // of the chain above. Gated at the call site like its neighbours (the
        // function self-guards too, but it was the one call in this loop that
        // ran for every creature in the world, every tick).
        if (RAVEN_SCOOPERS.has(creature.templateId)) ai.ravenScoops(this, creature);
        // (The drowned used to feed here too, added 2026-07-26 — removed
        // 2026-07-31 when they came off the hunger clock entirely: sessile, no
        // prey map, and a carrion supply ~200x too slow to ever satisfy them.
        // See ai.hungers. The branch was gated on being hungry, so keeping it
        // would have been code that could never fire.)
        // A rat that finds you resting may decide you're warm furniture.
        ai.ratCuddles(this, creature, now);
        // The small lives: warm blood dozes off in the quiet...
        ai.naps(this, creature, now);
        // ...the deer bark at a person crossing open ground under a full moon...
        ai.alarmWatch(this, creature, now);
        // ...the hyenas pad to water on their own clocks...
        ai.waters(this, creature, now);
        // ...and the unseen things shift their ambushes to where the feet go.
        ai.lurkerDrifts(this, creature, now);
        // The cantor opens its jaw and the dead stop where they stand.
        ai.cantorSings(this, creature, now);
        // The crossing's dead go through the last motion of the job they died at.
        ai.deadAtWork(this, creature, now);
        // The lammergeier rings the mountain's anvil for its marrow.
        ai.boneDrop(this, creature, now);
        // The summer people keep a flock that is not there.
        ai.ghostFlock(this, creature, now);
        // The chainman counts the chain.
        ai.chainmanCount(this, creature, now);
        // The summer people dance the last night's circle, on some nights.
        ai.summerDance(this, creature, now);
        // ...and everything else performs the one habit it has, when watched.
        ai.mobHabit(this, creature, now);
        // ...and the rag-and-bone man decides he likes the look of your pack.
        ai.hoarderCovets(this, creature, now);
        // A brood-mother swells the nest while she's left alone.
        if (BROODERS.has(creature.templateId)) ai.broodBirths(this, creature, now);
        // The bone-country remembers its dead: a hollow thing, idle with a living
        // ear near, breathes a name off the room's bloodstain.
        if (HOLLOW.has(creature.templateId)) ai.deadRemembers(this, creature, now);
        if (creature.hunger >= HUNGRY_AT) ai.creatureEatsHere(this, creature, false);
        // The food web: a predator turns on weaker prey sharing its room. If it
        // strikes, that's its action this tick — it doesn't also wander.
        // A grip already taken outranks looking for a fresh one — it worries
        // what it has until that kills or slips (ai.worryPrey).
        const hunted = (await ai.worryPrey(this, creature, now)) || await ai.predation(this, creature, now);
        if (!hunted && RUNNERS.has(creature.templateId) && ai.playerPresent(this, creature.roomId)
            && !ai.allCrouched(this, creature.roomId)) {
          // Never settles while there's someone to run from — it keeps moving,
          // room to room, and you only land a blow the tick you have it cornered.
          //
          // ...UNLESS EVERY PERSON IN THE ROOM IS ON THEIR HEELS (rome,
          // 2026-08-31). This one condition is the whole of stalking: a shape
          // down in the heather is not a man walking in, and the animal stops
          // running from it. Stand up, or swing and miss, and the posture drops
          // (dispatch's effort rule) and this line takes it away again.
          await ai.creatureMoves(this, creature, now, "wander", false);
        } else if (!hunted && RUNNERS.has(creature.templateId) && ai.allCrouched(this, creature.roomId)) {
          // Only when the crouch is what held it — `hunted` also lands here, and
          // a deer that just ate something is not being calmed by anybody.
          ai.crouchHolds(this, creature); // it holds, and now and then it says so
        } else if (!hunted && !creature.rouseAt && creature.nextWanderAt <= now && !tmpl.is_boss && !BROODERS.has(creature.templateId) && !DROWNERS.has(creature.templateId) && !SENTINELS.has(creature.templateId) && (!AGGRESSIVE.has(creature.templateId) || ai.walksAnyway(creature)) && !ROOTED.has(creature.templateId)) {
          // Mid-wind-up (rouseAt) it holds its ground — a thing that's telegraphed
          // a lunge doesn't stroll off before it commits (keeps the thief's rob,
          // the meal-guard's spring, and the starve-lunge from fizzling out).
          await ai.creatureMoves(this, creature, now, "wander", false);
        }
      }
    }

    // The far world's heartbeat: past the bubbles, time advances in slow whole
    // strides instead of beats. (First beat after a restart just stamps the
    // clock — the gap before it isn't this world's to replay.)
    if (liveRooms && now - this.lastEcologyAt >= SLOW_ECOLOGY_MS) {
      const elapsed = this.lastEcologyAt ? Math.min(now - this.lastEcologyAt, CATCHUP_CAP_MS) : 0;
      this.lastEcologyAt = now;
      if (elapsed > 0) await this.slowEcology(now, elapsed, liveRooms);
    }

    // The damp works on carried steel: provisional weapons and armor rust a
    // hair each tick (very slowly). Sealed gear is held out of the dungeon's
    // reach. Iterate a copy — a piece can rust through and splice itself out.
    for (const session of this.sessions.values()) {
      for (const c of [...session.items]) {
        if (c.serial !== null) continue; // sealed: frozen whole
        const t = world.itemTemplates.get(c.itemId);
        if (!t || t.slot === "") continue; // food, keys, trophies and cigarettes keep their own clocks
        // WHAT IT IS MADE OF, not what slot it goes in (see MATERIAL_* in
        // zone-data). Stone comes out at zero and leaves the loop entirely —
        // a headstone shield is the one thing in the world the damp cannot
        // touch, and multiplying zero every tick forever is just a slower way
        // of saying so.
        const stuff = materialDamp(t.id);
        if (stuff === 0) continue;
        // Oiled kit barely notices the damp; pitted kit is where the next rust
        // starts. Neither is immunity — greased steel still goes, slowly.
        // Same fold-in as wear(): the template counts too, not only the roll.
        const oiled = (tag: string) => hasTrait(t, tag) || (c.rolledMap?.get(tag) ?? 0) > 0;
        const damp = oiled("greased") ? GREASED_RUST_MULT
          : oiled("pitted") ? PITTED_RUST_MULT : 1;
        await this.wear(session, c, t, RUST_PER_TICK * beatMul * damp * stuff); // wall-clock rust, not per-beat — a slow idle beat mustn't spare steel
      }
    }

    // Players heal only on purpose: resting, or sheltered in a gatehouse
    // (bench or hatch open AT a gate — out of the world, mending). Ducking
    // aside mid-dungeon with the lockbox is hiding, not healing.
    for (const session of this.sessions.values()) {
      // Whole enough again: re-arm the wounded-swing tell so a later wounding
      // warns afresh (however you healed — rest, food, a bandage).
      if (session.woundedTold && session.hp >= session.maxHp * WOUNDED_FRACTION) session.woundedTold = false;
      const sheltered = this.outOfWorld(session); // gatehouse/gate-crouch mends; trusts inGatehouse so a flag-drift still heals
      // Rest heals wherever you're still IN REACH — including the inventory modal
      // in the dungeon, where you're crouched in the open and can be hit (just
      // like reading a map or journal). Only a gate truly takes you out of the
      // world, and there the gatehouse mends you whether you meant to rest or not.
      // Off your feet and safe, the leg gets bound and braced — the hobble mends
      // (independent of hp, so a full-health limp still clears).
      if ((session.resting || sheltered) && !this.inCombat(session) && session.hobbled) {
        session.hobbled = false;
        session.limpingSince = undefined;
        this.send(session, "Off your feet at last, you bind and brace the wounded leg. It will carry you again.");
        this.sendStatus(session);
      }
      if ((session.resting || sheltered) && !this.inCombat(session) && session.hp < session.maxHp) {
        // Resting out in a cold snap barely holds: half the ticks close
        // nothing. (Gate shelter is warm ground — coldBites never reads there.)
        // Unless a rat has curled up against you: a small warm weight is REAL
        // warmth, and the cold's penalty waives while it sleeps there.
        const warmed = [...this.creatures.values()].some(
          (c) => c.cuddling === session.pubkey && c.roomId === session.roomId,
        );
        // The fire's rest: dozing INSIDE the gatehouse mends at double time —
        // warm, safe, deliberate. Standing shelter and the dungeon's cold-stone
        // rest both keep the slow rate. (And the cold never reaches the fire.)
        const byFire = session.resting && this.outOfWorld(session);
        // A fleeced lining keeps the cold off your rest; a sodden one holds it
        // against you. Best worn piece decides — the traits never stack. And
        // the RAIN is the same thief for everyone (5c): real rain holds the
        // cold against you like a sodden coat, and the wind and the dry
        // weather after it is the drying.
        const coldMult = this.wearsTrait(session, "fleeced") ? FLEECED_COLD_MULT
          : (this.wearsTrait(session, "sodden") || events.raining(this, session.roomId)) ? SODDEN_COLD_MULT : 1;
        // Wind rides the cold: a rest that was already chancy is chancier.
        const inWind = events.windy(this, session.roomId);
        const restSkip = inWind ? WIND_CHILL_REST_SKIP : COLD_REST_SKIP;
        if (!byFire && !warmed && events.coldBites(this, session.roomId) && chance(restSkip * coldMult)) {
          // A silent tax is a lie: tell them, once in a while, why the rest is
          // closing nothing. (Throttled — not a line every skipped tick.)
          //
          // And NAME THE RIGHT THIEF. In wind the odds being paid are
          // WIND_CHILL_REST_SKIP (0.75), not COLD_REST_SKIP (0.5) — three rests
          // in four instead of one in two — so blaming the cold alone told a
          // man in a gale that the weaker of the two things on him was the one
          // doing it.
          const nowMs = Date.now();
          if (nowMs - (session.coldToldAt ?? 0) > 20_000) {
            session.coldToldAt = nowMs;
            this.send(session, inWind ? pick([
              "The wind finds every seam and takes the rest with it — the wound stays open.",
              "You cannot rest in this: the wind strips off whatever warmth the sitting earns you.",
              "The cold gets in on the wind, and this rest closes nothing.",
            ]) : pick([
              "The cold steals this rest from you — the wound stays open.",
              "The cold has its teeth in you: this rest closes nothing.",
              "You rest, and the cold eats what the rest would have mended.",
            ]), "amb");
          }
          continue;
        }
        // THE FEVER (2026-08-06). On bad ground sleep will not take: an hour
        // off your feet is worth a fraction of an hour. It is not a cure you
        // can buy or a fight you can win — the answer is to leave, which is the
        // whole point of putting it on the ground people LIVE on. The gate's
        // fire is unreachable by it (the fever is the den band's own).
        const feverMult = events.fevered(this, session.roomId) ? FEVER_MEND_MULT : 1;
        session.hp = Math.min(session.maxHp, session.hp + (byFire ? FIRE_REST_REGEN_PER_TICK : REST_REGEN_PER_TICK) * feverMult);
        this.sendStatus(session);
        if (session.hp >= session.maxHp) {
          // Fully healed: save it now so a restart can't revert a finished rest.
          await this.trySavePlayer(session.pubkey, session.roomId, session.hp);
          if (session.resting) {
            session.resting = false;
            this.send(session, byFire
              ? "You come out of the doze slow and easy, the fire low beside you. You are whole."
              : session.away ? "Your wounds have closed — you are whole." : "You feel whole again, and rise.");
          } else {
            this.send(session, "In the gatehouse quiet, your wounds close. You are whole.");
          }
        }
      }
    }

    // Standing in the open rain runs a killing off your hands, a layer each
    // tick — slower than a deliberate wash at the water, but it finds you
    // wherever the sky is open (rome: blood washes in the rain). Runs whether
    // or not you're fighting; the sky doesn't wait for a lull.
    for (const session of this.sessions.values()) {
      // A hand held out at something that has walked off is worse than no
      // posture at all — the room would go on telling people you were pointing
      // at a hind that left. Checked on the world's beat, dropped on its own,
      // and checked at the fire too: somebody you had a hand toward may have
      // stepped back out through the door.
      if (session.pose === "point" && !verbs.pointStillThere(this, session)) {
        verbs.dropPoint(this, session, (line) => this.outOfWorld(session)
          ? gate.gatehouseFeed(this, line, session.pubkey)
          : this.roomFeed(session.roomId, line, session.pubkey, false));
      }
      if (this.outOfWorld(session)) continue;
      if (events.raining(this, session.roomId)) pvp.rainThinsBlood(this, session);
    }

    // Flush every live session's mutable state (hp, room) to D1 on a slow clock,
    // so a DO restart — a deploy or a Cloudflare eviction — is a reconnect blip,
    // not a revert. Combat/move/eat already write through; this catches the
    // in-memory-only heals (chiefly rest) that would otherwise vanish on the
    // next cold start and snap a rested player back to stale HP.
    // CONCURRENT, not sequential (2026-08-22): the old loop awaited one D1
    // round-trip per player, so a full zone paid 10-20 stacked awaits in one
    // beat. The writes are per-player and independent; the beat now waits for
    // the slowest, not the sum.
    if (now - this.lastFlushAt >= FLUSH_INTERVAL_MS) {
      this.lastFlushAt = now;
      await Promise.all([...this.sessions.values()].map((s) => this.trySavePlayer(s.pubkey, s.roomId, s.hp)));
    }
    // Every beat, not just every flush: a lost save must not survive long
    // enough for a hibernation wake to rebuild the player from the stale row.
    await this.drainDirtySaves();
    mark("saves");

    // The dungeon breathes: an idle wanderer catches a line of atmosphere now
    // and then, drawn from where they stand. Never in a fight, never at the
    // bench, and never faster than the cooldown — quiet, not chatter.
    for (const session of this.sessions.values()) {
      // The gatehouse breathes too — its own quiet, warm pool. (Crouched over a
      // lockbox mid-dungeon you're still outside: the weather finds you there.)
      const inGatehouse = this.outOfWorld(session);
      if ((session.away && !inGatehouse) || this.inCombat(session)) continue;
      // Behind the door, the keeper talking outranks the room's own quiet: he
      // is the one thing in here actually saying something, and a line of the
      // region's story and the fire settling must never land on the same
      // breath. Which story is which door you came in by (lore.keeperTells).
      if (inGatehouse && lore.keeperTells(this, session, now)) continue;
      // THE WANDERER'S OWN HABITS, and the treasures'. These are SIBLINGS of the
      // room's breath, never passengers on it — the two used to sit under the
      // ambient send, which meant a habit could only ever fire on a beat the
      // room had already spoken, arriving welded to the back of a weather line
      // in the same voice. That is the exact thing the keeper's guard above
      // exists to prevent, and it also quietly divided the rate by thirty-three:
      // 0.03 was not 3% of a beat, it was 3% of the ambience's 2.7 minutes, so
      // a body performed its tells once every ninety minutes and the quirks
      // never fired at all. Up here the dials mean what they say, and a habit
      // takes the beat instead of sharing it — the room keeps its peace when
      // your body is the one talking.
      if (!inGatehouse && now - session.habitAt >= HABIT_COOLDOWN_MS && chance(HABIT_ODDS)) {
        const habit = this.drawHabit(session);
        if (habit) {
          session.habitAt = now;
          session.habitLine = habit.line;
          this.send(session, habit.line, "amb");
          if (habit.room) this.roomFeed(session.roomId, habit.room.replace("{name}", session.name), session.pubkey, false);
          continue;
        }
      }
      if (!inGatehouse && now - session.quirkAt >= QUIRK_COOLDOWN_MS && chance(QUIRK_ODDS)) {
        const quirk = this.drawQuirk(session);
        if (quirk) {
          session.quirkAt = now;
          this.send(session, quirk, "amb");
          continue;
        }
      }
      // The gatehouse keeps its own, slower clock: it's a room where people sit
      // and talk, and the walls shouldn't keep interrupting them.
      const cool = inGatehouse ? GATEHOUSE_AMBIENT_COOLDOWN_MS : AMBIENT_COOLDOWN_MS;
      const odds = inGatehouse ? GATEHOUSE_AMBIENT_ODDS : AMBIENT_ODDS;
      if (now - session.lastAmbientAt < cool) continue;
      if (!chance(odds)) continue;
      const line = inGatehouse
        ? gate.gatehouseAmbient(this, session.lastAmbientLine, session.roomId)
        : this.ambientLine(session.roomId, session.lastAmbientLine, this.carriesLight(session));
      if (!line) continue;
      session.lastAmbientAt = now;
      session.lastAmbientLine = line;
      this.send(session, line, "amb"); // tagged so the client's tutorial can hush the weather
    }

    this.applyRot(now, false);
    this.rustFloors(now, false); // and the slower drain, on gear, which nothing else touches
    this.sweepSpoiledHearts(now, false);
    // Every armStrayDecay caller is an EVENT (a drop, a throw, a spill), so a
    // pile that predates its timers would sit there forever with nothing to
    // arm it — exactly the undercroft's 11 torches, which accumulated while
    // spawn floors were wholly exempt. Sweeping the floors the world is
    // already holding costs a filter over the few rooms that have any items,
    // and guarantees a historical pile drains without waiting on a passer-by.
    for (const roomId of this.ground.keys()) this.armStrayDecay(roomId);
    this.applyRegrow(now, false);
    ai.applyArrivals(this, now, false);
    ai.scheduleArrivals(this, now);
    // THE PASSAGE: the summit's animal leaves its mountain on the shadow and
    // hunts the world. Once a tick and world-level, not per creature — it is
    // one animal doing one thing to every band at once (ai.drakePassage).
    ai.drakePassage(this, now);
    // While the deep door is SEALED, the deep coughs one of its own up into the
    // shallows on a slow clock — the world minting the corpse-key. Once someone's
    // heart opens the door (or the King's death re-seals it), the clock just idles.
    if (!this.openDoors.has(DEEP_DOOR_KEY)) {
      if (this.nextSurfaceAt === 0) this.nextSurfaceAt = now + SURFACE_INTERVAL_MS; // start the clock the first sealed tick
      else if (now >= this.nextSurfaceAt) {
        ai.surfaceDeepKin(this, now);
        this.nextSurfaceAt = now + SURFACE_INTERVAL_MS + randInt(0, SURFACE_INTERVAL_MS / 2); // jittered, so it's never on a countable beat
      }
    } else {
      this.nextSurfaceAt = 0; // door's open — reset so a fresh seal starts a fresh clock
    }
    this.pruneTraces(now);
    this.syncCombatCtx();

    // Batch the tick's disk flush: the sim ticked (creatures acted this beat),
    // but writing the delta every 2s is what runs up rows_written. Flush the
    // ambient churn at most every TICK_SIM_FLUSH_MS; whatever changed since the
    // last flush lands in one write (the delta captures it all). Player-driven
    // saves already persisted immediately from their own handlers, so this only
    // delays ambient world state — bounded by the interval, re-simmable on crash.
    // The simDirty flag (2026-08-22) pulls the flush forward when a command
    // marked the sim: the hot paths no longer serialize per keystroke, and the
    // whole world still lands within one TICK_SIM_FLUSH_MS of the last change.
    if (this.simDirty || now - this.lastTickFlushAt >= TICK_SIM_FLUSH_MS) {
      this.lastTickFlushAt = now;
      await this.persist();
      mark("persist");
    }
    // Put parked souls to sleep: a socket silent past IDLE_TIMEOUT_MS isn't a
    // player, it's a meter running — its connection alone keeps the alarm
    // chain billing rows. The close runs the normal leave path (webSocketClose
    // -> onLeave), so a body mid-fight still stands linkdead: sleep is never
    // an escape hatch. Bodies already linkdead are the tick's own affair.
    for (const session of [...this.sessions.values()]) {
      if (session.linkdeadUntil) continue;
      if (now - session.lastActiveAt < IDLE_TIMEOUT_MS) continue;
      this.send(session, "You drift where you stand, and the Door sets you gently down. (idle — reconnect anytime)");
      try { session.ws.close(1000, "idle"); } catch {}
    }
    await this.ensureAlarm();
    mark("alarm");
    const spent = Date.now() - t0;
    if (spent >= TICK_SLOW_LOG_MS) console.log("SLOWTICK " + spent + "ms " + marks.join(" "));
  }

  // One atmosphere line for where you stand: a signature room's own pool if it
  // has one, else the region it belongs to (the gates, the flooded deep, or the
  // ring between). Meant to grow — add lines to AMBIENCE / ROOM_AMBIENCE freely.
  private ambientLine(roomId: string, avoid?: string, lit?: boolean): string | null {
    // Never the same breath twice running. Every pool holds at least two lines,
    // so dropping the last one always leaves something to say; the fallback is
    // there only so a one-line pool could never fall silent forever.
    const draw = (pool: string[]): string | null => {
      if (!pool.length) return null;
      const fresh = pool.filter((l) => l !== avoid);
      const from = fresh.length ? fresh : pool;
      return from[randInt(0, from.length - 1)];
    };
    // A sky doing something outranks the standing pools (rain drums, mud pulls).
    const sky = events.eventAmbient(this, roomId);
    if (sky) return sky === avoid ? null : sky; // weather repeating itself just holds its tongue a beat
    const own = ROOM_AMBIENCE[roomId];
    if (own?.length) return draw(own);
    // No voice of its own — the band speaks. But if YOU carried light into a
    // room the dark has kept, sometimes it's the dust your flame just woke,
    // instead (never in a room that already has its own atmosphere to lose).
    if (lit && this.isDark(roomId) && chance(MOTES_ODDS)) {
      const m = draw(MOTES);
      if (m && m !== avoid) return m;
    }
    // A REGION SPEAKS AS ITS QUARTER, NOT AS ITSELF (2026-08-06, generalised
    // 2026-08-10). Was keyed on WOOD_QUARTERS, so the layer the wood was given
    // could never reach the east road or the Crossing however many quarters
    // they declared. MAP_QUARTERS is the table that holds all of them, and a
    // region with no pool for its quarter falls straight through to its band
    // exactly as before — so this costs nothing anywhere it is not wanted.
    //
    // The original argument, which applies harder to the Crossing than it ever
    // did to the wood: 170 rooms
    // shared one ten-line regional pool — a line per seventeen rooms — so the
    // biggest region in the game was also the one that repeated itself fastest
    // and told you least about where you were standing. A quarter (detail.ts)
    // is a real place inside the wood with its own voice; it sits between the
    // room's own pool and the band's, so a signature room still wins and the
    // wood at large stops sounding like one undifferentiated green mass.
    const quarter = MAP_QUARTERS[roomId];
    if (quarter) {
      const q = draw(QUARTER_AMBIENCE[quarter] ?? []);
      if (q) return q;
    }
    // A region with no pool of its own simply has nothing to say — better a
    // quiet band than the dungeon's drips leaking into a wood. Add lines to
    // AMBIENCE and it starts breathing.
    return draw(AMBIENCE[this.regionOf(roomId)] ?? []);
  }

  // THE WANDERER'S OWN HABITS (2026-08-29). The body's tells, drawn from
  // where the wanderer stands — the same conditional pools the mob habits
  // use, pointed at the player. Avoids repeating the last line, so the same
  // tell never lands twice in a row.
  private drawHabit(session: Session): { line: string; room?: string } | null {
    const pool: { line: string; room?: string }[] = [...HABITS];
    if (isNight()) pool.push(...HABIT_NIGHT);
    if (this.roomHasFirekeeper(session.roomId) || this.roomLit(session.roomId)) pool.push(...HABIT_FIRE);
    if (DEEP_ROOMS.has(session.roomId)) pool.push(...HABIT_DEEP);
    if (WARRENS_ROOMS.has(session.roomId)) pool.push(...HABIT_GRAVES);
    const avoid = session.habitLine;
    const fresh = pool.filter((h) => h.line !== avoid);
    return pick(fresh.length ? fresh : pool);
  }

  // Where a treasure's quirk may perform — the item's own nature meeting the
  // world that made it. Every one of these is a place the item's text already
  // claims; the code only lets it happen.
  private quirkWhere(session: Session, where: string): boolean {
    const room = session.roomId;
    switch (where) {
      case "bell": return events.bellOpen(this);
      case "water": return this.regionOf(room) === "crossing";
      case "keep": return events.keepRoom(this, room);
      case "snow": return events.snowed(this, room);
      case "warrens": return WARRENS_ROOMS.has(room);
      case "mountain-night": return this.regionOf(room) === "mountain" && isNight();
      case "crossing": return this.regionOf(room) === "crossing";
      default: return false;
    }
  }

  private drawQuirk(session: Session): string | null {
    const candidates: string[] = [];
    for (const q of TREASURE_QUIRKS) {
      const held = session.items.some((c) => c.itemId === q.item && (!q.worn || c.equipped));
      if (held && this.quirkWhere(session, q.where)) candidates.push(...q.lines);
    }
    return candidates.length ? pick(candidates) : null;
  }

  // ---- creature behavior (shared by live tick and catch-up) ----













  // ---- traces: the world's memory ----

  public addTrace(roomId: string, trace: Trace): void {
    let list = this.traces.get(roomId);
    if (!list) { list = []; this.traces.set(roomId, list); }
    // Mud remembers: a print pressed into rain-wet ground reads fresh far
    // longer (the future-dated stamp rides the aging traces already do).
    trace = { ...trace, at: trace.at + events.mudDeepens(this, roomId, trace.kind) };
    if (trace.kind === "passage") {
      // One set of footprints per room; new passage refreshes it.
      const i = list.findIndex((t) => t.kind === "passage");
      if (i !== -1) list.splice(i, 1);
    }
    if (trace.kind === "drip") {
      // One trail per room, refreshed — a bleeder pacing a room doesn't stack
      // twelve trails and shove the older story out of the cap.
      const i = list.findIndex((t) => t.kind === "drip");
      if (i !== -1) list.splice(i, 1);
    }
    if (trace.kind === "carve") {
      const carvings = list.filter((t) => t.kind === "carve");
      if (carvings.length >= CARVE_CAP) {
        // The wall is full; the oldest words wear away.
        const oldest = carvings.reduce((a, b) => (a.at < b.at ? a : b));
        list.splice(list.indexOf(oldest), 1);
      }
    }
    list.push(trace);
    while (list.length > TRACE_CAP) {
      const i = list.findIndex((t) => t.kind !== "carve");
      if (i === -1) break;
      list.splice(i, 1);
    }
  }

  private pruneTraces(now: number): void {
    for (const [roomId, list] of this.traces) {
      // FRESH SNOW COVERS THE RECORD (5d): the mountain under snow lets its
      // prints go twice as fast — the season hides what walked it.
      const snowedHere = this.snowUntil > now && this.world!.rooms.get(roomId)?.region === "mountain";
      const lifeMult = snowedHere ? SNOW_TRACE_LIFE_MULT : 1;
      const alive = list.filter((t) => now - t.at < (TRACE_LIFE_MS[t.kind] ?? 0) * lifeMult);
      if (alive.length === 0) this.traces.delete(roomId);
      else if (alive.length !== list.length) this.traces.set(roomId, alive);
    }
  }

  // Evidence, rendered fuzzily by age — the reader does the detective work.
  private traceLines(roomId: string, now: number): string[] {
    const list = this.traces.get(roomId);
    if (!list || list.length === 0) return [];
    const lines: string[] = [];
    // Evidence reads the ground it lies on (flavor audit): a pool of blood in
    // the wood is not "on the stones", and a carving is not always in a wall.
    const region = this.regionOf(roomId);
    const ground = groundWord(region, roomId);
    const carvings = list.filter((t) => t.kind === "carve" && now - t.at < TRACE_LIFE_MS.carve);
    const rest = list
      .filter((t) => t.kind !== "carve" && now - t.at < (TRACE_LIFE_MS[t.kind] ?? 0))
      .sort((a, b) => b.at - a.at)
      .slice(0, 3);
    for (const t of rest) {
      const age = now - t.at;
      if (t.kind === "blood") {
        if (age < 10 * 60_000) lines.push(`Fresh blood pools on ${ground} — something died here moments ago.`);
        else if (age < 3_600_000) lines.push(`Blood on ${ground}, still wet.`);
        else lines.push(`A drying bloodstain darkens ${ground}.`);
      } else if (t.kind === "drip") {
        // The walking wound: something crossed this room bleeding. The trail
        // never says WHO — you follow it to find out.
        if (age < 10 * 60_000) lines.push(`A trail of blood drops crosses ${ground}, bright and fresh — something wounded passed through, and not long ago.`);
        else lines.push(`A dotted line of blood, going dark, crosses ${ground} — something wounded passed this way.`);
      } else if (t.kind === "remains") {
        if (age < 10 * 60_000) lines.push(`Broken remains litter ${ground}, still settling.`);
        else if (age < 3 * 3_600_000) lines.push("Broken remains lie scattered here.");
        else lines.push("Old remains, long picked over.");
      } else if (t.kind === "scraps") {
        if (age < 3_600_000) lines.push(`Fresh gnawed scraps litter ${ground}.`);
        else lines.push("Gnawed scraps rot quietly where they fell.");
      } else if (t.kind === "rest") {
        if (age < 3_600_000) lines.push(pick(REST_TRACE[region] ?? REST_TRACE.upper!));
        else lines.push("Someone rested here, a while back.");
      } else if (t.kind === "passage") {
        // Dust holds a print in the dungeon; out under the sky the ground does.
        const track = region === "upper" || region === "deep" || region === "gate" ? "the dust" : "the ground";
        // cap(track), not "The " + track: the phrase carries its own article
        // (every entry in this family does), so the literal produced "The the
        // ground is freshly disturbed" in every outdoor band. Caught on the
        // mountain, live, an hour after it shipped.
        if (age < 10 * 60_000) lines.push(`${cap(track)} is freshly disturbed — someone passed this way minutes ago.`);
        else lines.push(`Footprints disturb ${track} here.`);
      }
    }
    for (const t of carvings.sort((a, b) => a.at - b.at)) {
      const age = now - t.at;
      const wear = age < 3_600_000 ? ", the marks fresh" : age > 7 * 24 * 3_600_000 ? ", half-worn" : "";
      lines.push(`"${t.words}" is scratched into ${carveMedium(region, roomId)}${wear}.`);
    }
    return lines;
  }

  // Food left on the floor goes foul on its own clock.
  private applyRot(now: number, silent: boolean): void {
    this.rot = this.rot.filter((r) => {
      // Gate-smokehouse cures live in `rot` for the free persistence but never
      // touch a floor — they're collected lazily at the gate (cureAtGate). Keep
      // them regardless of maturity; the owner's visit is what resolves them.
      if (r.kind === "gatecure") return true;
      if (r.at > now) return true;
      const here = this.ground.get(r.roomId) ?? [];
      const idx = here.indexOf(r.itemId);
      if (idx !== -1) {
        here.splice(idx, 1);
        // A stamp with no item is a ghost (2026-08-22): groundFreshAt only ever
        // let go through scavenger scoops, so anything that ROTTED off the floor
        // left its freshness stamp behind for the life of the world, and every
        // scoop since has been skipping over a corpse. The rot is the item's
        // true exit — its stamp goes with it.
        this.groundFreshAt.delete(`${r.itemId}@${r.roomId}`);
        // The rot clock run backward: raw meat hung in the smokehouse racks has
        // cured through. The raw is gone from the floor; its keeping form takes
        // its place, hanging there for whoever's hand comes for it (yours, if you
        // beat the scavengers and the other delvers back to it).
        if (r.kind === "cure") {
          const out = CURE_RECIPES[r.itemId] ?? "smoked-haunch";
          here.push(out);
          this.stampFresh(r.roomId, out);
          if (!silent) {
            this.roomFeed(r.roomId, `On the smoke-racks, ${this.world!.itemTemplates.get(out)?.name ?? "a haunch"} has cured through — gone black and hard, and keeping now.`, undefined, false); // housekeeping — off the relay; names what actually cured (fish cure here too since 119)
            this.refreshRoomCtx(r.roomId);
          }
          return false;
        }
        // A crumbling rock leaves nothing — no scraps trace (that lures
        // scavengers), no "gone foul" (it didn't rot, it's just rubble again).
        // A sodden torch goes the same quiet way: the damp took the pitch.
        if (r.kind === "crumble" || r.kind === "sodden" || r.kind === "wilt") {
          if (!silent) {
            this.roomFeed(r.roomId,
              r.kind === "sodden" ? "A torch left on the wet stone has drunk the damp — rag and black sludge now, no light left in it."
              : r.kind === "wilt" ? (r.itemId === "linen-strips"
                  ? "Linen strips left on the floor have gone grey and sour with mildew — no use to anyone now."
                  : "Cut bloodwort, left where it fell, has wilted to brown slime.")
              : "A loose rock, kicked among the rubble, is lost in it.", undefined, false); // housekeeping — off the relay
            this.refreshRoomCtx(r.roomId);
          }
        } else {
          this.addTrace(r.roomId, { kind: "scraps", at: r.at });
          if (!silent) {
            const t = this.world!.itemTemplates.get(r.itemId);
            this.roomFeed(r.roomId, `${cap(t?.name ?? "something")} has gone foul.`, undefined, false); // housekeeping stays off the relay
            this.refreshRoomCtx(r.roomId);
          }
        }
      }
      return false;
    });
  }

  // The one stray-decay sweep for EVERY growing consumable (rome, 2026-07-17,
  // generalizing the rock/torch laws): call it wherever a renewable thing can
  // pile onto a floor the world didn't grow it on — a drop, a throw, a body's
  // spill, a thief's spill. For each consumable in STRAY_DECAY it skips the
  // floors where that thing is the world's OWN regrowing spawn (the reliable
  // supply is left alone) and, anywhere else, arms enough spoil-timers to
  // eventually take EVERY stray copy lying here off the floor (never more timers
  // than copies, so none are wasted). This is the drain that stops the reliable
  // rock/torch/physic from only ever accumulating. Cheap; a no-op unless a stray
  // is actually present. Add a growing consumable to STRAY_DECAY and it's covered.
  public armStrayDecay(roomId: string): void {
    const floor = this.ground.get(roomId);
    if (!floor || !floor.length) return;
    for (const itemId of Object.keys(STRAY_DECAY)) {
      const d = STRAY_DECAY[itemId];
      // The world's OWN copies are exempt — but only that many. This used to
      // skip the room entirely, which made a spawn floor immortal: the
      // undercroft grows a torch, so every torch ever dropped there could
      // never rot, and the pile only grew (rome, 2026-07-30: 11 on one floor).
      // Protect one copy per regrowing spawn row and let every stray above
      // that spoil like it would anywhere else.
      // A wandering rock is the world's own copy too, even though no row says so
      // — without this the ruin would hand you a rock and then crumble it back
      // into the rubble as if a player had left it lying.
      const kept = this.world!.groundSpawns.filter((g) => g.item_id === itemId && g.room_id === roomId && g.regrows).length
        + (this.roamedGround.includes(`${itemId}@${roomId}`) ? 1 : 0);
      const n = floor.filter((i) => i === itemId).length - kept;
      if (n <= 0) continue;
      const pending = this.rot.filter((r) => r.kind === d.kind && r.roomId === roomId && r.itemId === itemId).length;
      for (let i = pending; i < n; i++) {
        this.rot.push({ itemId, roomId, at: Date.now() + randInt(d.min, d.max), kind: d.kind });
      }
    }
  }

  // THE GROUND TAKES IT (rome, 2026-08-27, on a gate floor sixteen pieces deep:
  // gear should be degrading out of the floor). Loose gear loses condition on
  // the wall clock wherever it lies, and at zero it is gone. This is the drain
  // the world never had: STRAY_DECAY covers four growing consumables, so a
  // dropped blade was immortal and a gate floor could only ever grow.
  //
  // Charged off ELAPSED TIME, never per-call, which is what lets the two callers
  // differ: the live tick sweeps at most once a minute, and catchUp charges a
  // whole offline gap in a single pass. The law is linear in time, so both land
  // on the same number. FLOOR_RUST_PER_HOUR is the whole dial.
  private rustFloors(now: number, silent: boolean): void {
    if (!this.lastFloorRustAt) { this.lastFloorRustAt = now; return; } // first call just starts the clock; the gap before it isn't ours to charge
    const elapsed = Math.min(now - this.lastFloorRustAt, CATCHUP_CAP_MS);
    if (elapsed < FLOOR_RUST_STEP_MS) return; // a floor sweep is cheap, but not 30 times a minute
    this.lastFloorRustAt = now;
    const amount = (elapsed / 3_600_000) * FLOOR_RUST_PER_HOUR;
    if (amount <= 0) return;
    // THE WORLD'S OWN STOCK IS EXEMPT — every ground_spawns copy, not just
    // the regrowing ones, which is a harder line than armStrayDecay draws and has
    // to be. A renewal is only ever armed by a PICKUP (verbs.cmdTake), so seeded
    // gear that rusted away instead of being taken would never come back: the
    // regrowing pieces would strip themselves out of the floor-renewal law one
    // room at a time, and the one-shot placements would delete authored loot out
    // of rooms no player has walked into yet. Only what a hand or a corpse added
    // rusts.
    const kept = new Map<string, number>();
    for (const g of this.world!.groundSpawns) {
      const k = `${g.item_id}@${g.room_id}`;
      kept.set(k, (kept.get(k) ?? 0) + 1);
    }
    // A WANDERED PIECE IS THE WORLD'S OWN, at an address with no row for it —
    // the same exemption armStrayDecay makes, and it has to be made twice
    // because the two sweeps count their keepers separately. Without it, roaming
    // walked all 144 floor-gear pieces straight out of the spawn table's
    // protection and the rust would have drained them out of the world one at a
    // time, permanently: nothing re-arms a regrow except a player's hand.
    for (const r of this.roamedGround) kept.set(r, (kept.get(r) ?? 0) + 1);
    for (const [roomId, floor] of [...this.ground]) {
      if (!floor.length) continue;
      // SLOT GEAR ONLY — the things whose condition genuinely means wear. This
      // deliberately does not use isGear(), which is a wider net: the lantern and
      // the hammerstone answer yes to it and must not come through here, because
      // their condition is a fuel gauge and a latch counter respectively, not
      // weathering. Draining those would put out a lamp and quietly un-latch a
      // stone the world promises survives anything (THROW_TOUGH, "no repairs for
      // this rock"). Both are capped, dice-placed supplies that look after
      // themselves; they do not need this drain and they read wrong under it.
      const counts = new Map<string, number>();
      for (const id of floor) {
        if (!this.world!.itemTemplates.get(id)?.slot) continue;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      let changed = false;
      for (const [itemId, n] of counts) {
        const strays = n - (kept.get(`${itemId}@${roomId}`) ?? 0);
        if (strays <= 0) continue;
        const t = this.world!.itemTemplates.get(itemId);
        if (!t) continue;
        const key = `${itemId}@${roomId}`;
        // Un-stamped gear rolls the scavenged condition a pickup would have given
        // it anyway (verbs.cmdTake), so a piece starts rusting from where it
        // actually stands rather than from a free 100.
        const before = this.groundCond.get(key) ?? rollGearCondition(t.slot, false);
        // THREE DECIMALS, not the shelf's one. rustShelf can round hard because it
        // charges a whole stay in a single subtraction; this charges a minute at a
        // time, and a minute is 0.067 — which rounds to 0.1 and bills half again
        // what the dial says. That also made the two callers disagree, the live
        // tick running at 6/hour while catchUp's one-pass gap ran at the honest 4.
        const after = Math.round((before - amount) * 1000) / 1000;
        if (after > 0) { this.groundCond.set(key, after); continue; }
        // Gone: ONE copy leaves the stones. A floor keeps one condition per item
        // id and not one per copy, so whatever is still lying here starts its own
        // life rather than inheriting a corpse's zero — a pile drains a piece at
        // a time, which is also how it should read to somebody standing in it.
        const idx = floor.indexOf(itemId);
        if (idx !== -1) { floor.splice(idx, 1); changed = true; }
        if (strays > 1) this.groundCond.set(key, rollGearCondition(t.slot, false));
        else {
          // The last stray is out. Its stamps go with it — a stamp with no item
          // is a ghost, the same one applyRot's freshness fix exists to stop.
          // Any seeded copy still here re-rolls on pickup, as an un-stamped
          // world piece always has.
          this.groundCond.delete(key);
          this.groundFreshAt.delete(key);
          this.groundRolled.delete(key);
          this.groundLore.delete(key);
        }
        if (!silent) {
          this.roomFeed(roomId, `${cap(t.name)}, left lying on ${groundWord(this.regionOf(roomId), roomId)}, has gone to ruin — the ground takes what nobody comes back for.`, undefined, false); // housekeeping stays off the relay, like every other decay
        }
      }
      if (!changed) continue;
      if (!floor.length) this.ground.delete(roomId);
      if (!silent) this.refreshRoomCtx(roomId);
    }
  }

  // A heart left on the stones keeps its cut-hour (groundHeart), so it spoils on
  // the same clock it would in a hand — and a while past spoiling, the slime
  // seeps away rather than littering the floor forever (rome, 2026-07-15). Runs
  // off groundHeart itself, so it also clears any spoiled heart already lying
  // around when this ships — no drop-hook needed.
  private sweepSpoiledHearts(now: number, silent: boolean): void {
    const nowSec = now / 1000;
    for (const [key, cutAt] of [...this.groundHeart]) {
      if (nowSec - cutAt < HEART_ROT_SEC) continue;
      const at = key.indexOf("@");
      const itemId = key.slice(0, at), roomId = key.slice(at + 1);
      const floor = this.ground.get(roomId);
      const idx = floor ? floor.indexOf(itemId) : -1;
      if (idx !== -1) {
        floor!.splice(idx, 1);
        if (!silent) {
          this.roomFeed(roomId, "The spoiled heart sinks into a smear of slime, and is gone.", undefined, false); // housekeeping — off the relay
          this.refreshRoomCtx(roomId);
        }
      }
      this.groundHeart.delete(key);
      this.groundCond.delete(key);
      this.groundLore.delete(key);
      this.groundRolled.delete(key);
    }
  }

  // The shrine keeps its promises.
  private applyRegrow(now: number, silent: boolean): void {
    this.regrow = this.regrow.filter((g) => {
      if (g.at > now) return true;
      // THE RUBBLE SHIFTS. A wandering fortress rock does not come back where it
      // was taken from — the ruin coughs one up somewhere else entirely, and
      // that room becomes its home until somebody takes it again. Resolved here,
      // at the moment of renewal, rather than when it was picked up: the world
      // decides where the stone is when the stone appears, and a room only holds
      // one, so the four of them drift apart rather than piling up.
      const wanders = this.groundWanders(g.itemId);
      // Never over-fill: if the room got one back some other way (a dropped or
      // thrown rock landed here), this regrow just resolves to nothing. A
      // wanderer's destination is not known yet, so its own check is below.
      if (!wanders && (this.ground.get(g.roomId) ?? []).includes(g.itemId)) return false;
      const t = this.world!.itemTemplates.get(g.itemId);
      // The floor-renewal law: renewable GEAR is dice, not a schedule. Its
      // check came up — roll whether the world coughs one back. A miss leaves
      // the spot bare and re-arms the next roll; only consumables and the
      // starter rock restore on the clock.
      const gear = !!t && (t.slot !== "" || DICE_REGROW.has(g.itemId)) && !RELIABLE_GEAR.has(g.itemId);
      if (gear && !chance(GEAR_REGROW_ODDS)) {
        g.at = now + randInt(GEAR_ROLL_MIN_MS, GEAR_ROLL_MAX_MS);
        return true;
      }
      // AFTER the die, never before: pickGroundHome walks every room in the
      // world, the die throws away four rolls in five, and picking first meant
      // paying for a full scan on every miss — a few hundred wasted walks an
      // hour once the whole floor roams. The world only needs to decide where
      // the thing is at the moment it actually puts one there.
      const home = (wanders ? this.pickGroundHome(g.itemId, g.roomId) : null) ?? g.roomId;
      const floor = this.ground.get(home) ?? [];
      if (floor.includes(g.itemId)) return false;
      this.ground.set(home, [...floor, g.itemId]);
      // THE FLOOR ROLLS TOO (rome, 2026-08-13, saying he had never seen a rolled
      // trait — he had not, and this is most of why). The lottery only ever ran
      // on chest loot, a mob's gear drop and the raven's nest. Ninety-eight
      // pieces of gear live in ground_spawns and NONE of them had ever rolled
      // anything, at seed or at renewal — which is the gear a player actually
      // walks past, and every piece the world puts out to arm new wanderers.
      // A renewed piece is a fresh piece, so it gets a fresh roll.
      if (t && t.slot !== "") {
        const rolled = this.rollTraits(t);
        const key = `${g.itemId}@${home}`;
        if (rolled) this.groundRolled.set(key, rolled); else this.groundRolled.delete(key);
      }
      // It has a new address. Remembered so the stray-decay sweep knows this one
      // is the world's own (it has no spawn row where it now lies, and without
      // this it would crumble away as litter), and so the next pickup there can
      // arm a fresh wander instead of ending the stone's life.
      if (wanders) {
        const key = `${g.itemId}@`;
        this.roamedGround = this.roamedGround.filter((r) => r !== `${key}${g.roomId}` && r !== `${key}${home}`);
        this.roamedGround.push(`${key}${home}`);
      }
      if (!silent) {
        const rock = g.itemId === "loose-rock";
        const edible = !!t?.edible;
        // The altar line (and its chime) is for the few rooms that actually HAVE
        // an altar — a bloodwort sprig back on the chapel's stone reads as a
        // returned offering. Everywhere else this same "else" branch just means a
        // torch/bandage/bone turned up on the floor again, so say exactly that.
        const onAltar = !rock && !gear && !edible && ALTAR_ROOMS.has(home);
        this.roomFeed(home, rock
          ? "The rubble shifts — a loose rock lies within reach again."
          : gear
            ? `${cap(this.rarityName(g.itemId, t?.rarity ?? "common"))} turns up among the litter, where there was nothing before.`
            : edible
              ? `${cap(t?.name ?? "something")} lies here — the stores are not empty yet.`
              : onAltar
                ? `${cap(t?.name ?? "something")} lies on the altar, as if it had never left.`
                : `${cap(t?.name ?? "something")} lies here again, where there was nothing before.`,
          undefined, false); // regrow is housekeeping — off the relay
        this.roomSound(home, rock ? "Stone grinds on stone {dir}." : gear ? "Metal scrapes softly on stone {dir}." : onAltar ? "A faint chime sounds {dir}." : "Something settles {dir}.");
        this.refreshRoomCtx(home);
      }
      return false;
    });
  }




  /**
   * IS THIS ROCK ONE OF THE WANDERING ONES? Every rock in the fortress is
   * (rome, 2026-08-09: no rock at the gates, and none of them fixed). No door
   * hands you a weapon on your way out — you walk into the ruin with what you
   * brought, and the first stone is a thing you find.
   *
   * Rocks out on the road, in the wood and at the dens are untouched: this is
   * the ruin's rubble, not the world's stones.
   */
  // DOES THE NEXT ONE TURN UP SOMEWHERE ELSE (rome, 2026-09-01). This was
  // `rockWanders` and it answered for exactly one item. The question is not
  // about rocks: it is whether the thing GREW there. What has roots in that
  // floor comes back to that floor. What somebody made or carried in has no
  // reason to reappear in the same room, and every reason not to — a floor you
  // can memorise is a list of addresses, not a world.
  private groundWanders(itemId: string): boolean {
    return !GROUND_ROOTED.has(itemId);
  }

  /**
   * WHERE THE NEXT ONE TURNS UP. Anywhere in its own band that isn't a door,
   * isn't one of the boltholes people hide in, and hasn't got one already — so
   * the copies spread rather than stacking, and no room is ever worth returning
   * to for one. Returns null if the band is somehow full, in which case the
   * caller renews it where it lay.
   */
  private pickGroundHome(itemId: string, from: string): string | null {
    const world = this.world!;
    // Its own BAND, which is what keeps this honest: a fortress torch turns up
    // somewhere else in the fortress, not on a beach. This is the chests' rule —
    // never a gate, never a bolthole, so everything on the floor carries risk —
    // plus one of its own: never a room that already holds one, so the copies
    // spread instead of stacking and no room is worth returning to for it.
    const band = world.rooms.get(from)?.region ?? "";
    const pool: string[] = [];
    for (const [id, room] of world.rooms) {
      if ((room.region ?? "") !== band) continue;
      if (world.entryRooms.has(id) || room.is_safe === 1) continue;
      if ((this.ground.get(id) ?? []).includes(itemId)) continue;
      if (this.roamedGround.includes(`${itemId}@${id}`)) continue;
      pool.push(id);
    }
    return pool.length ? pool[randInt(0, pool.length - 1)] : null;
  }

  // A swing gone wide. A provisional weapon leaves your hand — it is on the
  // stones now, mid-fight, anyone's to take. A sealed weapon is held to your
  // grip by its mark; bare hands just stumble. Fumbling is loud either way.
  // One-time tell the moment your swings go soft — crossing under a third of
  // your HP drops your damage to WOUNDED_DMG_MULT, and nothing used to say so.
  // Fires once per wounding; the tick clears the flag when you're whole enough
  // again, so a later wounding warns you afresh. (rome, 2026-07-12.)
  public tellWounded(session: Session): void {
    if (session.woundedTold) return;
    session.woundedTold = true;
    this.send(session, "The wound drags at your arms — there's less behind your blows now.", "dmgin");
  }

  public async playerFumble(
    session: Session,
    weapon: { carried: CarriedItem; tmpl: ItemTemplate } | null,
  ): Promise<void> {
    if (weapon) {
      // Any wielded weapon can leave your hand — the seal is title, not a
      // grip. A sealed one cracks its claim as it hits the stones.
      session.items.splice(session.items.indexOf(weapon.carried), 1);
      await removeItemRow(this.env.DB, weapon.carried.rowId);
      if (weapon.carried.serial !== null) await voidMint(this.env.DB, weapon.carried.serial);
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), weapon.carried.itemId]);
      this.stampFresh(session.roomId, weapon.carried.itemId);
      this.groundCond.set(`${weapon.carried.itemId}@${session.roomId}`, weapon.carried.condition); // a dropped blade keeps its wear when you snatch it back
      if (weapon.carried.loreId) this.groundLore.set(`${weapon.carried.itemId}@${session.roomId}`, weapon.carried.loreId); // and its mark
      if (weapon.carried.rolledTraits) this.groundRolled.set(`${weapon.carried.itemId}@${session.roomId}`, weapon.carried.rolledTraits); // and its roll (099)
      // TWO CLAUSES, NOT ONE. throwLand's lines carry their own subject ("{w}
      // cracks against the stone"), so appending one after "and" produced "the
      // axe spins from your grip and IT cracks against the stone". Cut at the
      // full stop instead, and compute the landing ONCE so the room and the
      // fumbler are told about the same event in the same words.
      const land = cap(throwLand(this.regionOf(session.roomId), "it"));
      this.send(session, `Your swing goes wide — ${weapon.tmpl.name} spins from your grip. ${land}.`
        + (weapon.carried.serial !== null ? " The seal cracks where it lands." : ""), "fumble");
      this.roomFeed(session.roomId, `${session.name}'s weapon spins from their grip. ${land}.`, session.pubkey, false);
      this.roomSound(session.roomId, metalFall(this.regionOf(session.roomId)));
      this.creatureNoise(session.roomId);
      this.refreshRoomCtx(session.roomId);
    } else {
      session.staggered = true;
      this.send(session, pick([
        "You overreach and stumble — an opening.",
        "Your blow goes wild and you lurch off balance — an opening.",
        "You swing at nothing and your footing slips — an opening.",
        "You misjudge it and stagger past — an opening.",
      ]), "fumble");
    }
  }

  // BOSS BLOOD: note every hand that wounds a king (bosses only, so the sim
  // blob never fattens on rat brawls). When it falls, everyone on the list
  // shares the horror on their sheet — see the assist pass in onCreatureDeath.
  public markHurt(creature: Creature, tmpl: MobTemplate, pubkey: string): void {
    if (!tmpl.is_boss) return;
    // ...and the hill hears the first one land. Every path that wounds a boss
    // already comes through here — the swing, the opener, the throw — so this is
    // the one place a fight with one can be said to have STARTED.
    ai.bossRouse(this, creature, tmpl);
    if (!creature.hurtBy) creature.hurtBy = [];
    if (!creature.hurtBy.includes(pubkey)) creature.hurtBy.push(pubkey);
  }

  private async onCreatureDeath(killer: Session, creature: Creature, tmpl: MobTemplate, killLine?: string, vital = false): Promise<void> {
    // KILL THE SINGER MID-SONG AND THE SONG DOES NOT END — it stops, and the
    // things standing to it are never told. They hold the pose they were in,
    // facing a silence, until something else moves them. (The held clock is
    // left exactly where it was on purpose: it runs out on its own eventually,
    // the way everything down here does, without anyone deciding it should.)
    ai.releaseHold(this, creature); // whatever had it, or what it had, lets go
    if (creature.templateId === "marrow-cantor" && creature.singUntil && Date.now() < creature.singUntil) {
      creature.singUntil = undefined;
      this.roomFeed(creature.roomId, pick(CANTOR_CUT_LINES), undefined, false, "evt");
    }
    // A revenant doesn't die the first time: it rises weakened and comes again,
    // up to its limit (most rise once; the cairn-wight twice). Only the final
    // fall is real — so bail out of death entirely while it still has a rise.
    if (REVENANTS.has(creature.templateId) && (creature.rises ?? 0) < (RISE_LIMIT[creature.templateId] ?? 1)) {
      creature.rises = (creature.rises ?? 0) + 1;
      creature.hp = Math.max(1, Math.round(tmpl.max_hp * REVIVE_FRAC));
      creature.stunned = false; creature.bleedTicks = 0;
      this.send(killer, pick([
        `${cap(tmpl.name)} falls still — and then, unhurried, it stands back up.`,
        `${cap(tmpl.name)} drops — and gathers itself, and rises again.`,
        `You put ${tmpl.name} down. It does not stay down.`,
        `${cap(tmpl.name)} collapses, shudders, and hauls itself upright once more.`,
      ]));
      this.actorFeed(killer, creature.roomId, `${cap(tmpl.name)} rises again.`);
      this.combatNoise(creature.roomId);
      return;
    }
    // (`splits-on-death` stood here and was cut — a trait may change a creature,
    // it may not create one. See the note above reconcilePopulation in ai.ts.)
    this.creatures.delete(creature.id);
    this.noteCreaturesChanged(); // a throw can kill between beats
    for (const s of this.sessions.values()) {
      if (s.target === creature.id) s.target = null;
      if (s.seizedBy === creature.id) s.seizedBy = undefined; // its grip dies with it
    }
    killer.kills += 1;
    if (tmpl.is_boss) killer.bossKills += 1;
    await recordKill(this.env.DB, killer.pubkey, !!tmpl.is_boss);
    // BOSS ASSISTS: a king goes down under many hands — everyone whose blow drew
    // its blood (markHurt) shares the horror on their sheet, not just the one who
    // landed the last cut. The KILL stays the killer's (kills +1 above is theirs
    // alone); the assist writes boss_kills only. Credited to live sessions — if
    // you fought and fell, your respawned self still collects.
    if (tmpl.is_boss) {
      for (const pk of creature.hurtBy ?? []) {
        if (pk === killer.pubkey) continue;
        const ally = [...this.sessions.values()].find((s) => s.pubkey === pk);
        if (!ally) continue;
        ally.bossKills += 1;
        await recordBossAssist(this.env.DB, pk);
        this.send(ally, `${cap(tmpl.name)} is down — and your blood helped buy it. Another king put down, written to your name.`, "kill big");
      }
    }
    // If you're carrying a journal when it falls, the book keeps count — one
    // more of this kind, written to whichever journal is in your pack. A map
    // shares the journalId rail (097) but is NOT a book: skip it, or kills would
    // be misfiled to a map instead of your bestiary.
    const jrn = killer.items.find((c) => c.journalId && !MAP_ITEMS.has(c.itemId));
    if (jrn?.journalId) {
      await journalBumpKill(this.env.DB, jrn.journalId, tmpl.id);
      // Blood reveals the marks — but only once the creature's FULL ACCOUNT is
      // written (study + enough kills). You cannot name a mark on a thing you do
      // not yet know (mob trait lottery).
      if (creature.traits?.length) {
        const rows = await journalLoad(this.env.DB, jrn.journalId);
        const row = rows.find((r) => r.templateId === tmpl.id);
        if (row && row.studied && row.kills >= lore.killsForAccount(tmpl.level)) {
          for (const t of creature.traits) await journalTraitAdd(this.env.DB, jrn.journalId, t);
        }
      }
    }
    // An engraved weapon keeps its own count: the kill goes into the steel.
    const kw = this.equippedItem(killer, "weapon");
    if (kw?.carried.loreId) await deedsBump(this.env.DB, kw.carried.loreId, "kills");
    // How a thing goes down depends on what it was: the hollow come apart, the
    // living fall and bleed, the deep things sink. The boss earns its own weight.
    const killVerb = tmpl.is_boss
      ? pick([`You put ${tmpl.name} down. The stone itself seems to let out a breath.`,
              `${cap(tmpl.name)} falls — and does not rise. It is over.`,
              `You end ${tmpl.name}. The weight of the deep shifts, somewhere far below.`])
      : HOLLOW.has(tmpl.id)
      ? pick([`${cap(tmpl.name)} comes apart in a clatter of loose bone.`,
              `You shatter ${tmpl.name}; the pieces go still.`,
              `${cap(tmpl.name)} folds, and is only bones again.`,
              `The light goes out of ${tmpl.name} and it drops in a heap.`])
      : DROWNERS.has(tmpl.id)
      ? pick([`${cap(tmpl.name)} sinks, and the black water closes over it.`,
              `You finish ${tmpl.name}; it slides under and is gone.`,
              `${cap(tmpl.name)} goes limp and the flood takes it down.`])
      : pick([`You kill ${tmpl.name}.`,
              `${cap(tmpl.name)} drops and does not move.`,
              `You put ${tmpl.name} down for good.`,
              `${cap(tmpl.name)} falls, and the fight goes out of it.`,
              `You finish ${tmpl.name}.`]);
    this.send(killer, killLine ?? killVerb, vital ? "kill big vital" : "kill big");
    // The crowd's copy: the same fall retold in the third person, and marked big
    // (fx "vital") when a throat/heart/skull ended it — the colosseum sizes it.
    this.actorFeed(killer, creature.roomId, this.feedKill(killer.name, tmpl, vital), vital ? "vital" : "kill");
    this.roomSound(creature.roomId, "Something falls {dir}, and is still.");
    this.creatureNoise(creature.roomId);
    // A cutpurse that died with your loot spills it here — chase it, catch it,
    // and it's on the floor where it fell. (Ground items land fresh, no seal.)
    if (creature.stole) {
      const stolen = this.world!.itemTemplates.get(creature.stole);
      if (creature.stoleJournal) {
        // A stolen journal lands INSTANCED — its pages ride the book to whoever
        // loots it (same door a death-drop uses; a plain spill was a blank book).
        this.dropInstance(creature.roomId, creature.stole, creature.stoleJournal);
      } else {
        this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), creature.stole]);
        this.stampFresh(creature.roomId, creature.stole);
      }
      if (stolen) this.roomFeed(creature.roomId, `${cap(stolen.name)} spills from the dead ${tmpl.name.replace(/^an? /, "")}.`, undefined, false); // local: loot on the ground is a shopping-list beacon
      // The thief's spill obeys the stray law like any other landing.
      this.armStrayDecay(creature.roomId);
      creature.stole = undefined;
      creature.stoleJournal = undefined;
    }
    this.addTrace(creature.roomId, {
      kind: HOLLOW.has(tmpl.id) ? "remains" : "blood",
      at: Date.now(),
      label: tmpl.name,
    });
    this.refreshRoomCtx(creature.roomId);
    if (tmpl.is_boss) {
      // The world announces the FALL, never the faller-of — the world key does
      // not speak a wanderer's name. The killer keeps their credit on the arena
      // feed, under their own key (the actorFeed kill line above).
      // WHERE IT FELL DECIDES WHO HEARS, AND IN WHAT WORDS. "A cry rolls through
      // the stone" is a line about a buried keep; the woodward dies under open
      // sky forty rooms west of any stone at all.
      // The door outside wants to know (worldSnapshot): a boss going down is
      // the best news the threshold ever has to print.
      this.lastBossFall = { name: tmpl.name, at: Date.now() };
      // THE MOUNTAIN IS ITS OWN COUNTRY, AND IT IS NOT WOODED (rome, 2026-08-21).
      // "mountain" is a SURFACE band, so the drake was dying under trees that do
      // not grow within fifty rooms of it, and the news was going to all fourteen
      // doors — including three at the bottom of a fortress on the far side of
      // the world. It falls on the hill that kept it, in the hill's own words,
      // to the hill (MOUNTAIN_HEARD_BANDS, the same reach as its roar).
      const band = this.regionOf(creature.roomId);
      if (band === "mountain") {
        this.roomFeedBands(MOUNTAIN_HEARD_BANDS, `High up, something stops — a sound the mountain has always made ends, and the quiet that comes after it is a different quiet: ${tmpl.name} has fallen.`);
      } else if (SURFACE_BANDS.has(band)) {
        this.roomFeedBands(SURFACE_BANDS, `Somewhere out under the trees, a cry goes up and is not answered: ${tmpl.name} has fallen.`);
      } else {
        this.roomFeedBands(FORTRESS_BANDS, `A cry rolls through the stone: ${tmpl.name} has fallen.`);
      }
    }
    ai.scheduleArrivals(this, Date.now());

    // A thing the deep surfaced carries a still-cold heart — the corpse-key. Cut
    // it on the kill, always. It's stamped fresh (acquired_at) and rots in minutes,
    // so the run to the black door is the game; dawdle and it's grey slime.
    if (creature.surfaced) {
      const heart = await this.grantItem(killer, DEEP_HEART);
      if (heart) this.send(killer, `You cut the still-cold heart from ${tmpl.name}. It steams in the cold air. [the deep door will take it — while it's fresh]`, "gain big");
      else this.send(killer, `A still-cold heart could be cut from ${tmpl.name} — but your pack is full, and it will not keep on the floor.`);
    }

    // Drops are provisional: the dungeon signs nothing here. The seal waits
    // at the gate — that walk is the game.
    // A keeps-its-bones hollow gives up less of itself (mob trait lottery).
    if (tmpl.loot_item && (creature.traits?.includes("the-kept") || chance(tmpl.loot_chance * (creature.traits?.includes("keeps-its-bones") ? MOB_KEEPS_DROP_MULT : 1)))) {
      const item = this.world!.itemTemplates.get(tmpl.loot_item);
      if (item) {
        const rolled = this.rollTraits(item); // one roll, whichever way it lands (099)
        if (await this.grantItem(killer, item.id, { rolledTraits: rolled })) {
          // The name wears its rarity colour, like every other place gear is
          // named (rome, 2026-08-14: the hood dropped and was not coloured).
          // These four loot lines were the last ones still printing a raw name:
          // the kill drop, the room feed beside it, and both chest lines.
          this.send(killer, `${this.gearName(item.id, cap(item.name))} falls into your hands.${this.rarityTag(item)} ${this.lootSuffix(item)}`);
        } else {
          this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), item.id]);
          this.stampFresh(creature.roomId, item.id);
          if (rolled) this.groundRolled.set(`${item.id}@${creature.roomId}`, rolled);
          this.send(killer, `${cap(this.floorLootName(item.id, creature.roomId))} falls from ${tmpl.name} — your pack is full, so it lies here.${this.rarityTag(item)}`);
        }
        // Same rule as a pickup off the floor: junk stays in the room. Only a
        // rare+ find is worth the wire — nobody outside needs to hear that
        // someone pocketed a finger-bone.
        this.roomFeed(creature.roomId, `${killer.name} claims ${this.gearName(item.id)}.`, killer.pubkey, false); // loot stays LOCAL: even a legendary claim is nobody's business (see verbs takes)
        this.sendCtx(killer);
      }
    }

    // A rare key off the dead — the elites and the King carry the keys to the
    // locked caches. Straight to hand; spend it on a strongbox.
    for (const mk of this.world!.mobKeys) {
      if (mk.templateId !== tmpl.id || !chance(mk.chance)) continue;
      const kt = this.world!.itemTemplates.get(mk.keyItem);
      if (!kt) continue;
      if (await this.grantItem(killer, kt.id)) {
        this.send(killer, `${cap(kt.name)} falls from the dead ${tmpl.name.replace(/^an? /, "")}.${this.rarityTag(kt)} (unclaimed)`);
      } else {
        this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), kt.id]);
        this.stampFresh(creature.roomId, kt.id);
        this.send(killer, `${cap(kt.name)} falls from the dead ${tmpl.name.replace(/^an? /, "")} — pack full, it lies here.${this.rarityTag(kt)}`);
      }
      this.sendCtx(killer);
    }

    // What it visibly bore — its gear, or something it scavenged off the dead —
    // spills to the floor where it fell. No random roll: if you could see it on
    // the thing, killing it drops it. Pick it up (ground gear lands fresh, no
    // seal; the gate does the sealing). (A corvid never carries — its takings
    // go straight into the nest pool, so a killed raven is worth nothing but
    // its own worn gear, which spills like any other's below.)
    if (creature.carries?.length) {
      const floor = this.ground.get(creature.roomId) ?? [];
      for (const id of creature.carries) {
        const g = this.world!.itemTemplates.get(id);
        floor.push(id);
        this.stampFresh(creature.roomId, id);
        if (g) {
          // Gear off the dead is battered — it fought in this, and lost. Stamp it
          // scavenged so its wear sticks when the killer stoops for it.
          if (g.slot !== "") this.groundCond.set(`${id}@${creature.roomId}`, rollGearCondition(g.slot, false));
          // A fresh piece off the dead is world-loot: it may have rolled a trait
          // (099). Set it before the message so the name reads what it rolled.
          const rolled = this.rollTraits(g);
          if (rolled) this.groundRolled.set(`${id}@${creature.roomId}`, rolled);
          const shown = cap(this.floorLootName(id, creature.roomId));
          this.send(killer, `${shown} clatters free of the fallen — it lies here.${this.rarityTag(g)}`);
          this.roomFeed(creature.roomId, `${shown} spills from the dead ${tmpl.name.replace(/^an? /, "")}.`, killer.pubkey, false); // local: loot on the ground is a shopping-list beacon
        }
      }
      this.ground.set(creature.roomId, floor);
      creature.carries = undefined;
      this.refreshRoomCtx(creature.roomId);
    }
  }

  // The mirror of a player's ambush: something that remembers you doesn't wait
  // its turn. The instant you're in reach it's on you — one heavy blow at
  // AMBUSH_MULT, before the round begins, before you can set your feet. No miss,
  // no crit; the surprise IS the punch. Armor and stance still turn what they
  // can, and a wounded attacker still hits softer.
  public async creatureFirstStrike(creature: Creature, tmpl: MobTemplate, victim: Session, quiet = false): Promise<void> {
    // THE PRESS IS FULL. One gate for every path that lands an opening blow —
    // a grudge-holder storming in, a lurker dropping out of the dark, a
    // listener's reflex, the loosed Gaunt — because the free ambush hit was
    // the one blow in the game that never asked whether there was room to
    // throw it (see engagedOn). Bodies first, then the tick's blow budget;
    // the || short-circuits so a refusal never spends a slot.
    //
    // It keeps its target. It is in the fight, it is at your shoulder, and it
    // swings the moment one of the three in front of it goes down or misses
    // its own beat. What it does not get is a free opener through a crowd it
    // cannot physically reach you through.
    // A BACK TO THE WALL (rome, 2026-08-31). This is the one gate every opening
    // blow passes through — the grudge-holder storming in, the lurker out of the
    // dark, the listener's reflex, the loosed Gaunt — so the posture is answered
    // HERE and only here, and cannot be double-rolled by a caller.
    //
    // What it buys is the twitchy outcome: the thing arrives, it commits, and
    // the fight starts even, from the front. That is the worst trade an ambusher
    // can make, and standing with your eyes on the way in earns it on a coin.
    // HALVED, not denied, because an open flame already spoils a drop outright
    // and a posture must never be strictly better than carrying fire.
    //
    // It cannot protect a man who is walking: `go` drops the posture before
    // dispatch runs, so the entry and exit ambushes are untouched. It answers
    // what comes to YOU while you stand there — which is exactly what a guard is.
    if (victim.pose === "guard" && chance(GUARD_SPOIL_ODDS)) {
      this.send(victim, pick(GUARD_SPOIL));
      this.roomFeed(victim.roomId, `${cap(tmpl.name)} comes at ${victim.name} and finds them already turned.`, victim.pubkey, false);
      return;
    }
    if (this.engagedOn(victim.pubkey, victim.roomId, creature.id) >= DOGPILE_CAP || !this.canLandBlow(victim.pubkey)) {
      if (!quiet) {
        this.send(victim, `${cap(tmpl.name)} shoulders in — and cannot get at you through the press. It waits at your shoulder.`, "dmgin");
      }
      return;
    }
    const cHurt = creature.hp < tmpl.max_hp * WOUNDED_FRACTION;
    let dmg = randInt(tmpl.dmg_min, tmpl.dmg_max) + (tmpl.is_boss ? (creature.phase ?? 0) * 3 : 0);
    if (ai.scavengerBold(this, creature)) dmg = Math.round(dmg * BOLD_DMG_MULT);
    if (ai.bloodMoonHollowMult(creature.templateId) > 1) dmg = Math.round(dmg * ai.bloodMoonHollowMult(creature.templateId));
    // REACH blunts the rush: a haft held at length means the thing arrives on
    // the point first — the blow still lands, but without the ambush's weight.
    const weapon = this.equippedItem(victim, "weapon");
    const atLength = weapon !== null && hasTrait(weapon.tmpl, "reach");
    if (!atLength) dmg = Math.round(dmg * AMBUSH_MULT);
    if (cHurt) dmg = Math.max(1, Math.round(dmg * WOUNDED_DMG_MULT));
    const worn = this.equippedItem(victim, "armor");
    dmg = Math.max(1, Math.round(dmg * ARMOR_K / (this.equippedArmor(victim) + ARMOR_K))); // % mitigation, never immunity
    dmg = Math.max(1, Math.round(dmg * STANCE[victim.stance].def));
    victim.hp -= dmg;
    victim.pose = undefined; victim.poseAt = undefined; victim.poseRef = undefined; // a blow ends a posture; nobody keeps a hand out through this
    if (victim.resting) {
      victim.resting = false;
      this.send(victim, "You are torn from your rest.");
    }
    if (!quiet) this.combatNoise(victim.roomId); // a listener's reflex smack makes no din that draws the room
    if (victim.hp > 0) {
      this.send(victim, atLength
        ? `${cap(tmpl.name)} rushes you — but it meets ${weapon!.tmpl.name} held at length, and the worst of the charge dies on the point. A first blow for ${dmg}. [${victim.hp}/${victim.maxHp} hp]`
        : `${cap(tmpl.name)} is on you before you're set — a first blow for ${dmg}. [${victim.hp}/${victim.maxHp} hp]`, "dmgin big");
      this.sendStatus(victim);
      this.openWound(victim, tmpl, creature); // an ambush by something with claws cuts deep
      this.maybeHobble(victim, tmpl); // and it can take the leg out from under you
      if (worn) await this.wear(victim, worn.carried, worn.tmpl, ARMOR_WEAR);
      if (CORRODERS.has(creature.templateId)) await this.corrodeTouch(victim, tmpl); // rust doesn't wait its turn either
    } else {
      await this.onPlayerDeath(victim, tmpl);
    }
  }

  // ONE fall per death. Two triggers can co-fire in a single beat — a bleed tick
  // and a fresh room's ambush as you step across a threshold — and the inner
  // handler used to run twice: the pack is only emptied AFTER the scatter's D1
  // awaits (which don't hold the DO's input gate), so the second call still saw a
  // full pack and scattered the set onto a SECOND floor. Picking both spills up
  // minted real duplicate rows (rome, 2026-07-20: a sealed set duped, death text
  // in BOTH rooms). The guard drops any co-fired second call; `finally` clears it
  // so a death that throws mid-way can't leave you permanently unkillable.
  public async onPlayerDeath(victim: Session, tmpl: MobTemplate | null, slayerName?: string): Promise<void> {
    if (victim.dying) return;
    victim.dying = true;
    try {
      await this.onPlayerDeathInner(victim, tmpl, slayerName);
    } finally {
      victim.dying = false;
    }
  }

  private async onPlayerDeathInner(victim: Session, tmpl: MobTemplate | null, slayerName?: string): Promise<void> {
    const slayer = slayerName ?? (tmpl ? tmpl.name : "their own wounds"); // tmpl null = bled out (or a wanderer's steel), no beast on the blow
    for (const c of this.creatures.values()) {
      if (c.target === victim.pubkey) c.target = null;
    }
    victim.target = null;
    // Steel goes down with the body — every exchange pointed here ends.
    victim.pvpTarget = null;
    for (const s of this.sessions.values()) {
      if (s.pvpTarget === victim.pubkey) s.pvpTarget = null;
    }
    victim.resting = false;
    victim.pose = undefined;
    victim.poseAt = undefined;
    victim.poseRef = undefined;
    victim.staggered = false;
    victim.stunned = false;
    victim.hobbled = false; victim.limpingSince = undefined; // a new body walks whole
    victim.woundedTold = false; // a whole body swings full-weight — re-arm the tell
    victim.bleedTicks = 0; victim.bleedDmg = 0; // the gate returns you whole — no wound rides back
    // A TORCH burning in a dead hand falls to the stone and keeps burning where
    // the body dropped (grounded below, once `fell` is known) — the gate gives
    // back breath, not fire, so the flame stays behind with everything else you
    // were carrying. A lantern's light just goes out (it isn't shared this way).
    const fallenFlame = (victim.litSource === "torch" && victim.litUntil && Date.now() < victim.litUntil) ? victim.litUntil : 0;
    victim.litUntil = undefined; victim.litSource = undefined; victim.litRow = undefined; victim.torchWarned = undefined;
    victim.buying = undefined; // death ends any open trade; the counter clears
    trade.cancelDealForSession(this, victim); // and any open deal with another wanderer
    dice.endGamesFor(this, victim.pubkey); // a dead hand plays no bones — nothing staked changes hands
    victim.deaths += 1;
    await recordDeath(this.env.DB, victim.pubkey);

    // EVERYTHING carried scatters where you fall — sealed included. The seal
    // is title, not armor: it cracks as it leaves your hands (claim voided),
    // and the thing lies on the stones for anyone, or anything, to find.
    // Only the lockbox protects (rome's rule, 2026-07-05).
    const fell = victim.roomId;
    // The torch that was in your hand lands on the stone and burns on, lighting
    // the room over your body until it guts out (keep the longest flame if one's
    // already there).
    if (fallenFlame) {
      this.groundTorch.set(fell, Math.max(this.groundTorch.get(fell) ?? 0, fallenFlame));
      this.roomFeed(fell, "A torch falls from a dead hand and burns on where it lands, throwing long shadows.", victim.pubkey, false);
    }
    // THE DYING HAND (gate.deathStash): the chart and the book go into the
    // lockbox on the way down, if the box has a slot for them. Runs BEFORE the
    // spill is taken, so what it saves is never in `scattered` — everything
    // else still falls exactly as it did.
    const kept = await gate.deathStash(this, victim);
    if (kept.length) {
      this.roomFeed(
        fell,
        `${victim.name} gets a hand to their lockbox on the way down, and shoves something into it.`,
        victim.pubkey,
        false,
      );
    }
    const scattered = victim.items;
    const hadSealed = scattered.some((c) => c.serial !== null);
    if (scattered.length > 0) {
      // Journals fall instanced (their pages ride the book to whoever loots it);
      // everything else spills as plain loot.
      this.ground.set(fell, [...(this.ground.get(fell) ?? []), ...scattered.filter((c) => !c.journalId).map((c) => c.itemId)]);
      for (const c of scattered) if (!c.journalId) this.stampFresh(fell, c.itemId);
      for (const c of scattered) {
        if (c.journalId) { this.dropInstance(fell, c.itemId, c.journalId); continue; }
        if (this.world!.itemTemplates.get(c.itemId)?.edible && !FOOD_KEEPS.has(c.itemId)) {
          this.rot.push({ itemId: c.itemId, roomId: fell, at: Date.now() + ROT_MS });
        }
        if (c.serial !== null) await voidMint(this.env.DB, c.serial);
        if (this.isGear(c.itemId)) this.groundCond.set(`${c.itemId}@${fell}`, c.condition); // the spill keeps its wear
        if (c.rolledTraits) this.groundRolled.set(`${c.itemId}@${fell}`, c.rolledTraits); // and whatever it rolled — the looter inherits the roll (099)
        // The scar: an engraved piece writes its owner's death into the ledger,
        // and the mark rides the stones for whoever takes it up next. Your gear
        // loses you — and carries you.
        if (c.loreId) {
          await deedsBump(this.env.DB, c.loreId, "deaths");
          this.groundLore.set(`${c.itemId}@${fell}`, c.loreId);
        }
        // A heart that falls with you keeps the hour it was cut. Whoever pries
        // it off your body inherits what's LEFT of it, not a fresh one — steal a
        // heart off a corpse and you're already running out of time.
        if (c.itemId === DEEP_HEART && c.acquiredAt !== undefined) {
          this.groundHeart.set(`${c.itemId}@${fell}`, c.acquiredAt);
        }
      }
      this.armStrayDecay(fell); // rock, torch, physic — anything renewable spilled where you fell spoils, unless this is its spawn floor
      await clearCarriedInventory(this.env.DB, victim.pubkey, this.tradeLocked.size ? [...this.tradeLocked] : undefined);
    }
    victim.items = [];
    // Dying puts you out of whatever door you were behind (mig 172). You wake at
    // a gate; nothing of yours is left inside — a shelf was never carried — and
    // the flag must not survive you, or a corpse would respawn "indoors" in a
    // room it is no longer standing in.
    den.leaveDen(this, victim.pubkey);
    // The relay hears that someone died — never who did it. The killer's name
    // is spoken only into the room itself (witnesses are eyes, not feeds);
    // everywhere else the evidence is the blood on their hands (pvp.bloodClause).
    // For a PvP kill the KILLER publishes the credited line (pvpKill → feedPvpKill),
    // so the victim's own death line stays off the feed — no bland doubled "is
    // slain." An environmental/creature death still narrates itself here, naming
    // the beast that did it (a creature is not a wanderer — no anti-snitch owed).
    if (!slayerName) this.actorFeed(
      victim,
      fell,
      scattered.length > 0
        ? `${victim.name} is slain by ${slayer}. Their pack scatters across ${groundWord(this.regionOf(fell), fell)}${hadSealed ? " — cracked seals glitter among the spill" : ""}.`
        : `${victim.name} is slain by ${slayer}.`,
    );
    if (slayerName) this.roomFeed(fell, `${slayerName} stands over the body.`, victim.pubkey, false);
    this.roomSound(fell, "A scream, cut short, {dir}.");
    this.creatureNoise(fell);
    this.addTrace(fell, { kind: "blood", at: Date.now(), label: victim.name });

    // A small chance the dark gives you back at your own door instead of a gate
    // (den.wakeAtDen sets the room and puts you behind it). Rolled AFTER
    // leaveDen above, so the flag it sets is the one that survives.
    const home = den.wakeAtDen(this, victim);
    if (!home) victim.roomId = this.randomGate();
    victim.hp = victim.maxHp;
    const fate =
      scattered.length > 0
        ? hadSealed
          ? "Everything you carried lies where you fell — the gate's seals cracked as they left your hands. Only the lockbox and vault keep."
          : "Everything you carried lies where you fell."
        : kept.length ? "Nothing else was left to scatter." : "You carried nothing worth scattering.";
    // What the dying hand got into the box, named — so it is never a thing the
    // player has to go and check for.
    const keptClause = kept.length
      ? `\nYour hand found the lockbox before the dark did: ${kept.length > 1 ? `${kept[0]} and ${kept[1]}` : kept[0]} — still yours.`
      : "";
    // Woken at home, the gate is never mentioned — you didn't come through one.
    // The killing clause is kept; only where you surface changes, and the bar
    // (or the empty sockets) is the first thing you'd know about the room.
    const end = home ? [
      slayerName ? `${slayerName} kills you.`
        : tmpl ? `${cap(tmpl.name)} kills you.`
        : "The bleeding doesn't stop.",
      pick([
        "Darkness. Then your own roof over you, and no memory of the walk.",
        "The dark takes you — and gives you back at your own door.",
        "Some while later: your own floor under your back, and the smell of home.",
      ]) + (home.barred ? " The bar is in its sockets." : " There is no bar in the sockets, and the doorway is a doorway."),
    ].join("\n") : slayerName ? pick([
      `${slayerName} kills you.\nDarkness. Then the gate, again.`,
      `${slayerName} puts you down on ${groundWord(this.regionOf(fell), fell)}.\nThe dark takes you — and gives you back at the gate.`,
      `The last thing you see is ${slayerName}, already stooping for your pack.\nThen cold air, and the gate, and breath again.`,
    ]) : tmpl ? pick([
      `${cap(tmpl.name)} kills you.\nDarkness. Then the gate, again.`,
      `${cap(tmpl.name)} puts you down.\nThe dark takes you — and gives you back at the gate.`,
      `${cap(tmpl.name)} is the last thing you see.\nThen cold air, and the gate, and breath again.`,
      `You fall to ${tmpl.name}.\nSome while later — the gate, and you standing in it, whole and emptied.`,
    ]) : pick([
      `The bleeding doesn't stop.\nDarkness. Then the gate, again.`,
      `You fold, the wound still weeping.\nThe dark takes you — and gives you back at the gate.`,
      `The stones go red beneath you, then grey.\nThen cold air, and the gate, and breath again.`,
    ]);
    this.send(victim, `${end} ${fate}${keptClause}`, "death big");
    // Nobody watches you arrive when you wake behind your own door — the street
    // outside sees a shut door, the same as it did a moment ago.
    if (!home) this.roomFeed(victim.roomId, `${victim.name} staggers back through the gate, pale.`, victim.pubkey, false);
    this.send(victim, this.describeRoom(victim));
    this.sendStatus(victim);
    this.refreshRoomCtx(fell);
    this.refreshRoomCtx(victim.roomId);
    await this.trySavePlayer(victim.pubkey, victim.roomId, victim.hp);
    this.markSimDirty();
  }

  public inCombat(session: Session): boolean {
    if (session.target) return true;
    if (session.pvpTarget) return true;
    // A LIVE SCAN, ON PURPOSE (2026-08-23). This was briefly served off a
    // cached target index, but a creature ACQUIRING a target changes no room,
    // so the cache could not see it and "am I in combat" ran up to a beat
    // behind the world — and that is a rule the game reads, not a hint. The
    // scan is ~300 map steps on a keystroke; what the lag work went after was
    // 4-6 FULL scans per creature per combat round, and that is gone either
    // way. Exactness wins here.
    for (const c of this.creatures.values()) {
      if (c.target === session.pubkey) return true;
    }
    for (const s of this.sessions.values()) {
      if (s.pvpTarget === session.pubkey && s.roomId === session.roomId) return true;
    }
    return false;
  }

  // Live, or holding its breath? The tick's speed rides on this (ensureAlarm).
  // Live means: a fight anywhere — either direction, steel drawn on another
  // wanderer, or a drowner's grip; someone RESTING (heals land per beat — a
  // slow beat makes rest crawl); an event arc mid-motion; or any frame inside
  // HOT_WINDOW_MS, because fresh footsteps deserve a quick world. Creature
  // clocks are timestamps and the sim fast-forwards, so a quiet world loses
  // nothing by beating slow.
  private worldIsHot(now: number): boolean {
    if (now - this.lastCommandAt < HOT_WINDOW_MS) return true;
    // An event mid-ARC keeps the beat quick (its per-tick effects want 2s
    // resolution while a player might be standing in the weather). But most of
    // the ~16 tracked events sit PARKED in `idle` (until = NEVER) — the roll
    // runs one arc at a time, every few hours — and idle events must NOT hold
    // the world hot, or the beat never slows and the whole saving is lost.
    for (const ev of this.events.values()) {
      if (ev.phase !== "idle") return true;
    }
    for (const s of this.sessions.values()) {
      if (s.target || s.pvpTarget || s.seizedBy || s.resting) return true;
    }
    for (const c of this.creatures.values()) {
      if (c.target) return true;
    }
    return false;
  }

  public async ensureAlarm(): Promise<void> {
    // The tick runs while any socket is connected — hibernated or not; a parked
    // socket is still a player in the world. A truly empty world (no sockets) is
    // fast-forwarded by catchUp() when the next player arrives.
    if (this.state.getWebSockets().length === 0) return;
    // Two speeds (see IDLE_TICK_MS): every setAlarm is a billed row written,
    // so the 2s beat is for fights and fresh footsteps, not for a dungeon
    // holding its breath.
    const now = Date.now();
    const hot = this.worldIsHot(now);
    // THE ALARM'S OWN MEMORY (2026-08-22). ensureAlarm runs after EVERY
    // message (webSocketMessage) and every tick, and getAlarm was one storage
    // round-trip per keystroke on the shared thread. The only writer of the
    // alarm is this function, so the DO can remember what it last armed: while
    // that alarm is still pending and the world's heat hasn't changed, the
    // storage read is skipped entirely. A hibernated DO wakes with no memory
    // (both fields 0/false) and falls through to the read exactly once.
    if (this.alarmArmedAt > now && this.alarmArmedHot === hot) return;
    const current = await this.state.storage.getAlarm();
    // An overdue alarm is a dead alarm (dev reloads leave them wedged) —
    // setAlarm overwrites, so reschedule rather than trust it. A HOT world
    // waiting on a quiet-length alarm re-arms early: the fight can't wait.
    if (current === null || current < now || (hot && current > now + TICK_MS)) {
      const at = now + (hot ? TICK_MS : IDLE_TICK_MS);
      await this.state.storage.setAlarm(at);
      this.alarmArmedAt = at;
      this.alarmArmedHot = hot;
    } else if (current !== null) {
      // Not re-arming — but remember what IS pending, so a quiet spell after
      // a hot one (or a hot one after a quiet one) doesn't re-read every
      // message: the pending alarm is still this function's own doing.
      this.alarmArmedAt = current;
      this.alarmArmedHot = current <= now + TICK_MS;
    }
  }

  // ---- rendering & lookup ----

  // THE SOUND INDEX (2026-08-22). Reverse adjacency: roomId -> every room with
  // an exit INTO it. roomSound used to scan all of world.exits per noise event;
  // this is built once on first sound, and the breach arc — the only thing that
  // mutates exits after load — clears it through noteExitsChanged.
  private soundAdj: Map<string, string[]> | null = null;
  public noteExitsChanged(): void { this.soundAdj = null; }
  private adjacentTo(roomId: string): string[] {
    if (!this.soundAdj) {
      const adj = new Map<string, string[]>();
      for (const [rid, exits] of this.world!.exits) {
        for (const e of exits) {
          const list = adj.get(e.to_room) ?? [];
          list.push(rid);
          adj.set(e.to_room, list);
        }
      }
      this.soundAdj = adj;
    }
    return this.soundAdj.get(roomId) ?? [];
  }
  public roomsAdjacentTo(roomId: string): string[] { return this.adjacentTo(roomId); }

  // THE ROOM INDEX (2026-08-22). The combat and ctx paths used to scan ALL
  // creatures per room-scoped question — 4-6 full scans per live creature per
  // combat round. This caches creatures by room, rebuilt lazily on demand.
  //
  // INVALIDATION IS THE WHOLE CORRECTNESS STORY. A beat is not the unit: the
  // world moves DURING a tick (wander, flee, migration, the dark stepping) and
  // bodies are born and eaten mid-tick, and the index is then read straight
  // off the message path — chips, packGaps, creaturesIn — for the whole 2-15s
  // to the next beat. So every mutation of a creature's ROOM, and every add or
  // delete, calls noteCreaturesChanged: creatureMoves, the lurker's step,
  // surfaceDeepKin, the culls, predation's kill, brood/summon/arrival births,
  // the event spawns and sweeps, the chainman, catchUp, and a throw's kill
  // between beats. Rebuilds are still far cheaper than what they replace —
  // a handful of mutations a beat against 4-6 scans per creature per round.
  // ADD A CALL WITH ANY NEW MUTATOR, or it will serve a room that has moved on.
  private byRoomValid = false;
  private byRoomMap = new Map<string, Creature[]>();
  public noteCreaturesChanged(): void { this.byRoomValid = false; }
  public creaturesInRoom(roomId: string): Creature[] {
    if (!this.byRoomValid) {
      const m = new Map<string, Creature[]>();
      for (const c of this.creatures.values()) {
        // OFF THE MAP (ai.drakePassage): the summit's animal, out over the world
        // and in no room at all. Skipping it HERE is the whole implementation of
        // being gone — the room description, the chips, targeting, the crowd
        // counts and the ecology all read this index, so the bowl is empty to
        // every one of them at once. Its roomId still says the summit, because
        // that is where it comes back to.
        if (c.aloft !== undefined) continue;
        const list = m.get(c.roomId) ?? [];
        list.push(c);
        m.set(c.roomId, list);
      }
      this.byRoomMap = m;
      this.byRoomValid = true;
    }
    return this.byRoomMap.get(roomId) ?? [];
  }

  // The room, entered: full prose the first time you see it (and on `look`),
  // brief on every re-entry after — just the name, the ways out, and whatever
  // is actually THERE now. Marks the room known. The whole reason you don't
  // re-read the same paragraph every time you cross a room you've crossed all day.
  // A wanderer's own chalk on the wall. Created on first carve; empty for
  // anyone who has never picked up a nail.
  public wallOf(pubkey: string): Set<string> {
    let mine = this.wallMarks.get(pubkey);
    if (!mine) { mine = new Set(); this.wallMarks.set(pubkey, mine); }
    return mine;
  }

  // THE WALL LIVES IN D1 NOW (mig 210). The map above is a read cache so every
  // sync caller is unchanged; this fills it from the truth, once per session.
  // Marks are APPEND-ONLY down there — one row per hall, nothing deletes one —
  // so the worst a failed write can do is cost a re-carve, where a bad blob
  // used to cost the whole chart.
  public async loadWall(pubkey: string): Promise<void> {
    if (this.wallLoaded.has(pubkey)) return;
    this.wallLoaded.add(pubkey);
    try {
      const rows = await this.env.DB.prepare("SELECT room_id FROM wall_marks WHERE pubkey = ?")
        .bind(pubkey).all<{ room_id: string }>();
      const mine = this.wallOf(pubkey);
      // What D1 already holds, kept apart from what the cache holds, because the
      // difference between those two sets is the only thing worth writing.
      const known = new Set<string>();
      for (const r of rows.results ?? []) { known.add(r.room_id); mine.add(r.room_id); }
      // THE CARRY-ACROSS IS A DIFFERENCE, NOT A REWRITE (2026-08-14). Marks that
      // were still only in the sim blob have to be moved down here on the first
      // read after mig 210 — but this wrote back the WHOLE set, including the
      // rows it had just read out of D1, and it did it on every load forever.
      //
      // The cost was not the SQL. INSERT OR IGNORE made all of it a silent
      // no-op, 0.03ms apiece, which is exactly why it hid: nothing was slow and
      // nothing was wrong in the data. The cost was that loadWall sits on the
      // CONNECT PATH and on the hibernation rebuild, the ZoneDO is
      // single-threaded, and each call parked it on a batch of one statement per
      // hall a player had ever walked — a 246-statement transaction, awaited,
      // with the tick and every other player's commands queued behind it. It
      // fired about once a minute across a day: 251,109 writes, ninety per cent
      // of every query the game made, all of them changing nothing.
      //
      // In steady state this now writes nothing at all, because a wall loaded
      // out of D1 has nothing D1 has not seen.
      const carry = [...mine].filter((r) => !known.has(r));
      if (carry.length) await this.saveWall(pubkey, carry);
    } catch { this.wallLoaded.delete(pubkey); } // a failed read must not cache "empty"
  }

  /** Write marks down. INSERT OR IGNORE: carving the same hall twice is free. */
  public async saveWall(pubkey: string, rooms: string[]): Promise<void> {
    if (!rooms.length) return;
    const now = Date.now();
    const stmt = this.env.DB.prepare("INSERT OR IGNORE INTO wall_marks (pubkey, room_id, at) VALUES (?, ?, ?)");
    await this.env.DB.batch(rooms.map((r) => stmt.bind(pubkey, r, now)));
  }

  // WHAT YOU HAVE WALKED, AND STILL REMEMBER (rome, 2026-08-12: hundreds of
  // halls walked, and the wall would take TWO).
  //
  // `carve` sets down what the server saw you stand in — testimony, not
  // hearsay, and that law is right. It read session.visited, which is built
  // fresh in buildSession... and buildSession runs on every reconnect AND on
  // every DO rebuild. A Durable Object hibernating is not an event a player
  // can see, consent to, or avoid; it happens because nobody has spoken for a
  // few minutes. So a walk of three hundred rooms was silently cut back to
  // whatever you had crossed since the last time the server happened to go to
  // sleep, and you carried two halls to the wall having earned three hundred.
  //
  // The walk is a fact about the PLAYER, so it is kept where the other facts
  // about a player are kept — beside their chalk, in the world's own state,
  // riding the same save. session.visited stays exactly as it was and still
  // governs the prose (full scene once, brief after), because that one really
  // is per-connection: a reconnect earning you the long description of the
  // room you woke in is not a bug.
  //
  // NOTHING CLEARS IT. A first pass had death spend the record — and that was
  // an invention: the old session.visited survived dying perfectly well (the
  // session is not rebuilt by a death), so "you lose your walk when you fall"
  // would have been a NEW penalty smuggled in under a bug fix, and a worse
  // version of the very complaint this fixes. The record is every room the
  // server has seen you stand in, and it keeps until the world itself is
  // reseeded. Carving is idempotent — rooms already on your wall are filtered
  // out — so it can only ever be re-read, never double-spent.
  public walkedOf(pubkey: string): Set<string> {
    let mine = this.walked.get(pubkey);
    if (!mine) { mine = new Set(); this.walked.set(pubkey, mine); }
    return mine;
  }

  /** One room, marked known: the session's prose memory AND the walk record. */
  public markWalked(session: Session): void {
    session.visited.add(session.roomId);
    this.walkedOf(session.pubkey).add(session.roomId);
  }

  public enterDescribe(session: Session): string {
    const full = !session.visited.has(session.roomId);
    this.markWalked(session);
    return this.describeRoom(session, full);
  }

  // How many floor copies of each itemId in a room are CURING (hanging in the
  // smokehouse racks), not loose loot. Cure entries only ever exist in the
  // smokehouse, so this is empty everywhere else. Used to render a curing haunch
  // as "hangs in the racks" and to withhold its 'get' chip — a hung haunch read
  // as a dropped one and tempted you into cancelling your own cure (rome, 2026-07-17).
  public curingCount(roomId: string): Record<string, number> {
    const m: Record<string, number> = {};
    for (const r of this.rot) if (r.kind === "cure" && r.roomId === roomId) m[r.itemId] = (m[r.itemId] ?? 0) + 1;
    return m;
  }

  // full=false is the brief view: the static scene-setting (the prose, the
  // keeper who is always there) is dropped, leaving only what's live.
  // itemized=true lists every loose item on the floor (a deliberate `look`);
  // walking in leaves it false, so a littered floor condenses to a count
  // instead of a wall of "X lies here" lines (rome, 2026-07-20).
  public describeRoom(session: Session, full = true, itemized = false): string {
    const world = this.world!;
    const room = world.rooms.get(session.roomId)!;
    // Catch-up: the world only announces a phase change ONCE, live, to
    // whoever's in an outdoor room at that exact tick. Walk in after rain's
    // already started and you'd never be told at all — the violet line here
    // plays for you the first time YOUR view of the room crosses into a
    // phase you haven't been shown yet, dark or lit either way. Never repeats
    // a phase already announced to this session; resets naturally once the
    // phase moves past telegraph/active (idle, aftermath).
    if (OUTDOOR_ROOMS.has(room.id)) {
      const phase = events.phaseOf(this, "rain");
      if (phase !== session.rainPhaseSeen) {
        const line = events.rainAnnounceLine(phase);
        if (line) this.send(session, line, "evt");
        session.rainPhaseSeen = phase;
      }
    }
    // The lightless deep: without a flame you see nothing here — not the room,
    // not its exits, not what shares it with you. Any flame resolves it all:
    // yours, one on the floor, or one in a companion's hand (litFor).
    if (!this.litFor(session)) {
      // The one generic line read identically whether you were in the deep's
      // permanent dark or an outdoor courtyard the night-clock just shrouded —
      // no telling the two apart (rome, 2026-07-22: "not really much telling
      // me it's night time"). Outdoor + night, with no OTHER reason it'd be
      // dark (a gloamed sky, or a room that's dark regardless of hour), gets
      // its own line — no cave, no water-drip, open sky instead.
      if (OUTDOOR_ROOMS.has(room.id) && isNight() && !DARK_ROOMS.has(room.id) && !events.gloamed(this, room.id)) {
        // Blind, you still hear it: rain doesn't need light to reach you, so the
        // one weather line the dark can't take away (rome, 2026-07-24 — a fight
        // that started dry and ended with "the rain slackens, and stops," never
        // once telling him it had started).
        const wet = events.raining(this, room.id) ? " Rain hisses down out of the black, cold on your skin." : "";
        // Blind isn't blank: a distinctive room still has touch, sound, smell
        // to give even with nothing to see (DARK_TOUCH, zone-data.ts). Failing
        // its own line, the wood answers as its QUARTER (detail.ts) — 170 rooms
        // used to give one identical generic line in the dark, so the region you
        // get lost in was also the one where being blind told you nothing at all
        // about which part of it you were blind in.
        const own = DARK_TOUCH[room.id] ?? QUARTER_DARK[MAP_QUARTERS[room.id] ?? ""];
        const touch = own ? ` ${own}` : "";
        return `Night, pitch black outside.\nNo moon tonight — you can see nothing under open sky, only your own breath and the wind.${wet}${touch} A light would show it. (light a torch, or feel your way back the way you came)`;
      }
      // On a blood moon the hollow things are lit from inside — the one light
      // the dark cannot take, and the one thing you can still see in it.
      const redEyesInDark = isBloodMoon() && [...this.creatures.values()]
        .some((c) => c.roomId === room.id && HOLLOW.has(c.templateId))
        ? BLOOD_MOON_EYES_DARK : "";
      return `Pitch dark.\nYou can see nothing — no walls, no way on, only your own breath and, somewhere, the drip of water.${redEyesInDark} A light would show it. (light a torch, or feel your way back the way you came)`;
    }
    const title = den.roomTitle(this, session, room.name);
    const lines = full ? [title, room.description] : [title];
    // WHO LIVES HERE (mig 162). A holding says how it stands as part of the room
    // rather than as something you have to ask for — an empty roof advertises
    // itself, an occupied one names its holder, and a barred door is visible
    // from the doorway. This is the whole discovery mechanic for the dens.
    if (full) {
      const dl = den.denRoomLine(this, room.id, session);
      if (dl) lines.push(dl);
      // And from inside your own barred house, what is waiting outside it.
      const wl = den.windowLine(this, session);
      if (wl) lines.push(wl);
    }
    // THE FINGERPOST, where there is one (detail.SIGNPOSTS). The room says the
    // post is there; reading the arms is a `look`, because a sign you have to
    // walk up to is a sign, and one that recites itself at you is a menu. This
    // sits past the pitch-dark return above on purpose — nobody reads a
    // signpost in the black, and the dark is the one thing that beats it.
    const sign = full ? SIGNPOSTS[room.id] : undefined;
    if (sign) lines.push(`${sign.post} (look at the sign)`);
    // THE WAYSTONES (rome, 2026-08-15). The fingerpost above says where the
    // ROADS go; this says where the DOOR is, which is the thing a person who is
    // lost actually needs and the one question the world could never answer.
    // Same doctrine, same institution: whoever cut the milestones and set the
    // toll stones marked the way to their own gates, because a road nobody can
    // navigate collects nothing.
    //
    // The direction is COMPUTED (lore.buildWayHome), never written down, so it
    // cannot rot when the world grows — and it names the nearest door from THIS
    // stone, which is not always the one you came in by.
    if (full && WAYSTONES.has(room.id)) {
      const w = this.wayHome.get(room.id);
      if (w) lines.push(`${waystoneLine(room.id)} The arm cut into it points ${w.dir}: ${wayFar(w.dist)}.`);
    }
    // The sky's phase, spoken where the sky can reach you: coming rain, rain,
    // or the mud it left. Legibility rule — you always know what weather
    // you're standing in.
    const sky = events.skyClause(this, room.id);
    if (sky) lines.push(sky.trim());
    // The night-clock itself gets a line too, same legibility rule as
    // weather — this only runs past the pitch-dark return above, so it's
    // either a torch holding the dark at bay or a full moon lighting the
    // grounds outright; either way, say which (rome, 2026-07-22).
    if (OUTDOOR_ROOMS.has(room.id) && isNight()) {
      lines.push(isBloodMoon()
        ? "A red moon rides over the grounds — the light it gives is the colour of old blood, and nothing under it is quite asleep."
        : isFullMoon()
        ? "A full moon rides high and white — the grounds lie almost as bright as day."
        // Whose light it is matters here: this line runs for anyone the room is
        // lit FOR, and telling a man he can see past "your light" when the
        // flame is in his companion's fist is the same small lie as the rest of
        // this (rome, 2026-08-03).
        // AND IT SAYS WHICH ROOM THIS IS (rome, 2026-08-21). "Out here" assumed
        // you knew you were under sky, which on a mountain you do not: a notch
        // in a crest, a slot, a gully and a walled bowl all read as enclosed,
        // and the roofed rooms three paces away are enclosed. The line names
        // the open sky, so the one signal that separates the two kinds of room
        // is in the sentence that only ever fires in one of them.
        : this.carriesLight(session) || this.roomLit(room.id)
          ? "Night's fully down and the sky over you is open and black — past your light, so is everything else."
          : "Night's fully down and the sky over you is open and black — past the light you're standing in, so is everything else.");
    }

    const exits = world.exits.get(room.id) ?? [];
    // THE SECRET DOORS NAME THEMSELVES (2026-08-25). A door whose state the
    // room can see must be seen before you walk into it — the moon door says
    // whether it stands open, the tide door whether the water holds it or the
    // silt buries it (and how deep), and the riddle door whether the iron
    // remembers its shape yet.
    for (const e of exits) {
      if (e.key_item === MOON_DOOR_KEY) {
        const openNow = isNight() && isFullMoon() && !isBloodMoon();
        lines.push((openNow ? MOON_DOOR_OPEN : MOON_DOOR_SHUT).replace("{dir}", e.dir));
      } else if (e.key_item === TIDE_DOOR_KEY) {
        // Three states, all visible: the sea over the sill, the silt holding
        // it (with the count — legibility first), or the door standing open.
        const level = events.seaLevel(this);
        lines.push(level === 0 && this.tideSilt <= 0
          ? TIDE_DOOR_OPEN.replace("{dir}", e.dir)
          : level > 0
          ? TIDE_DOOR_SHUT.replace("{dir}", e.dir)
          : TIDE_DOOR_SILT.replace("{dir}", e.dir).replace("{silt}", tideSiltLine(this.tideSilt)));
      } else if (e.key_item === RIDDLE_DOOR_KEY) {
        // The line was written when the door was a compass step and said "in the
        // wall to the {dir}". The door is in a mountain now and the way through
        // is DOWN, and "the wall to the down" is not a sentence. A door is in a
        // wall when the direction is a wall and in the ground when it is not.
        const where = e.dir === "down" ? "lies flat in the ground at the foot of the wall"
          : e.dir === "up" ? "is set into the rock overhead"
          : `stands in the wall to the ${e.dir}`;
        lines.push(this.openDoors.has(`${room.id}:${e.dir}`)
          ? " The black door stands open, for now. The iron will remember its shape."
          : ` A black door ${where}, and it is shut.`);
      } else if (e.key_item === BELL_DOOR_KEY) {
        // The bell door keeps no state: the bell is the state. Three faces —
        // shut (the watch keeps the hours), trembling (the note is coming),
        // open (the ringing, and the quiet after while the note leaves).
        const p = this.events.get("bell")?.phase;
        lines.push(p === "active" || p === "aftermath" ? BELL_DOOR_OPEN
          : p === "telegraph" ? BELL_DOOR_TREMBLE
          : BELL_DOOR_SHUT);
      }
    }
    // THE PACK'S GAPS ARE MARKED. A refusal you only discover by walking into it
    // is a trap; a line that shows you which ways are shut is a DECISION. You
    // can see the shape of what they have done to the room before you commit.
    const heldWays = ai.heldExits(this, session);
    lines.push(exits.length
      ? `Exits: ${exits.map((e) => heldWays.has(e.dir) ? `${e.dir} (held)` : e.dir).join(", ")}.`
      : "There is no way out.");
    if (heldWays.size) {
      lines.push(heldWays.size === 1
        ? "One of them has put itself in a gap and stopped moving. They are closing the ways out."
        : `They have taken ${heldWays.size} of the ways out and are working on the rest.`);
    }

    lines.push(...this.traceLines(room.id, Date.now()));

    // THE WORKS (works.ts). Boards over the door, and the keeper is not behind
    // it — this REPLACES his line rather than sitting beside it, or the room
    // would advertise a hatch nobody can reach. It rides the plain look, not
    // just the full one: whether the bank is open is the single most important
    // fact about a gate room, and you must not have to walk into the door to
    // learn it.
    if (world.entryRooms.has(room.id) && works.shutForWorks(this, room.id)) {
      lines.push(works.worksBlurb());
    } else if (full && world.entryRooms.has(room.id) && world.fenceStock.length > 0) {
      // Every gate keeps a keeper: a fence at a shuttered hatch, dealing in kind.
      // (Static, so it's part of the full look only — you know he's there.)
      lines.push("A keeper waits at a shuttered hatch in the gatehouse wall, dealing in kind.");
    }

    // A tide-drowned room keeps its floor to itself: whatever lies here lies
    // under black water, unseen until someone goes down after it (cmdDive).
    if (events.tideFlooded(this, room.id)) {
      lines.push("The floor is gone under the water; whatever lies here is down there with it.");
    } else {
      // A torch someone set (or dropped) on the stone, still burning — the room's
      // own light while it lasts.
      if (this.roomHasFirekeeper(room.id)) lines.push("A charcoal clamp stands smouldering under its turf, a low red seam breathing at the foot of it — banked days ago, and warm the whole way round.");
      else if (this.roomLit(room.id)) lines.push("A torch burns on the floor here, throwing the dark back off the walls.");
      // Or the light is in somebody's hand. Say whose work you're seeing by —
      // in the dark it is the difference between the room being lit and you
      // wondering why you can suddenly see (rome, 2026-08-03).
      else if (this.isDark(room.id) && !this.carriesLight(session) && this.roomHasBearer(room.id, session)) {
        lines.push("Somebody else's light holds the dark off this room.");
      }
      const curing = this.curingCount(room.id);
      const shownCure: Record<string, number> = {};
      // Loose loot is COLLECTED, not spilled line-by-line: on entry a big pile
      // condenses to a count; a deliberate `look` (itemized) lists it in full.
      // Curing racks show either way — they're your process, not scatter.
      const loose: string[] = [];
      for (const itemId of this.ground.get(room.id) ?? []) {
        const t = world.itemTemplates.get(itemId);
        if (!t) continue;
        shownCure[itemId] = (shownCure[itemId] ?? 0) + 1;
        // The first N copies (N = curing timers) hang in the racks; the rest are loose.
        // A lottery piece reads its rolled adjective on the stone (099) — the
        // find is visible before you stoop, which is the whole thrill.
        const shown = cap(this.floorLootName(itemId, room.id));
        if (shownCure[itemId] <= (curing[itemId] ?? 0)) lines.push(`${shown} hangs in the smoke-racks, curing.`);
        else loose.push(`${shown} lies here.`);
      }
      // A dropped journal (or an unrolled map) lies here too — someone's spilled
      // hunting. A map isn't a book: it doesn't read "pages open to the dark".
      for (const inst of this.groundInstances.get(room.id) ?? []) {
        const t = world.itemTemplates.get(inst.itemId);
        if (!t) continue;
        loose.push(MAP_ITEMS.has(inst.itemId)
          ? `${cap(t.name)} lies here, unrolled and going soft in the damp.`
          : `${cap(t.name)} lies here, its pages open to the dark.`);
      }
      // The wall of loot becomes a glance you can act on: a count and a nudge to
      // look. Below the threshold it just reads out — a couple of things is no wall.
      if (itemized || loose.length <= FLOOR_ITEMS_BRIEF) {
        for (const l of loose) lines.push(l);
      } else if (loose.length) {
        lines.push(`Loot lies scattered across ${groundWord(this.regionOf(room.id), room.id)} — ${loose.length} things in all. ('look' to pick them out.)`);
      }
      // A CORVID NEST, and what is in it. Only the THREE fixed pools (RAVEN_NEST_ROOMS)
      // can hold a nest — every corvid in the world carries to the nearest of
      // them, so the high road, the grave ground and the far rise each have
      // their own shared pile. The hoard lives here — hidden, off the floor,
      // unreachable by hand (it is a nest, not a spill). The room only says a
      // nest IS here, and that it is kept or bare: the way in is feeding the
      // raven that works this pool, which parts with a piece sometimes and
      // never a certainty. The tell is the whole discovery mechanic — you learn
      // a raven is worth feeding by standing where its nest is.
      // A BARE NEST IS STILL A NEST, and it has to say so — learning that a
      // raven is worth feeding is the whole discovery, and a pool that goes
      // silent whenever it happens to be empty teaches nobody anything. Kept
      // or bare, the room names it; only the second half changes.
      if (RAVEN_NEST_ROOMS.includes(room.id)) {
        lines.push(this.nests.get(room.id)?.length
          ? "High above, wedged where the light hardly reaches, a raven's nest is tucked in — and something in it glints. (feed the raven here, and it may fetch you a piece)"
          : "High above, wedged where the light hardly reaches, a raven's nest is tucked in — sticks and wire and nothing else in it today. (the birds keep what they find here)");
      }
      for (const cache of world.caches) {
        if (this.cacheRoomId(cache) !== room.id) continue;
        const locked = this.cacheLocked(cache);
        // A roaming chest, once looted, is hidden until it refills elsewhere — no
        // empty husk left behind to teleport. A fixed chest still shows its husk.
        if (!locked && this.cacheRoams(cache)) continue;
        lines.push(locked
          ? (cache.keyItem === ""
            ? `${cap(cache.name)} sits here, waiting to be opened.`
            : `${cap(cache.name)} sits here, locked.`)
          : `${cap(cache.name)} sits here, sprung and empty.`);
      }
    }
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== room.id) continue;
      // OFF THE MAP is not "hidden": the summit's animal is out over the world
      // and the ring is genuinely empty (ai.drakePassage). It keeps the summit
      // as its roomId because that is where it lands, so this scan — which reads
      // the creature table rather than the room index — has to say so itself.
      // The empty bowl IS the prize; printing the animal into it would hand back
      // the whole passage.
      if (creature.aloft !== undefined) continue;
      const t = world.mobTemplates.get(creature.templateId)!;
      // A lurker lying in wait is unseen — it isn't in the room at all, until it
      // strikes. UNLESS you carry a flame: torchlight finds it pressed into its
      // crevice before it can spring, and the ambush is spoiled (wakeListeners).
      const hiddenLurker = LURKERS.has(creature.templateId) && creature.hidden && !creature.target;
      if (hiddenLurker && !this.litFor(session)) continue;
      if (hiddenLurker) {
        lines.push(`${cap(t.name)} is here, caught in ${this.carriesLight(session) ? "your torchlight" : "the torchlight"} before it could spring — pressed into a crevice, watching.${creature.hp < t.max_hp ? ` (${this.condition(creature)})` : ""}`);
        continue;
      }
      // A sentinel reads by its state: asleep and steppable, or awake and barring the stair.
      if (SENTINELS.has(creature.templateId)) {
        const heads = HOUND_HEADS.get(creature.templateId) ?? "all three heads";
        lines.push(this.sentinelAwake(creature)
          ? `${cap(t.name)} is awake, ${heads} up and barring the way down.${creature.hp < t.max_hp ? ` (${this.condition(creature)})` : ""}`
          : `${cap(t.name)} sprawls across the stair, ${heads} asleep. For now.`);
        continue;
      }
      const tell = ai.creatureTell(this, creature, session.pubkey);
      // In fog the tell already says "you cannot read it" — so the glance must
      // not then hand over its exact wounds and its haul in the same breath.
      const fogged = events.foggy(this, room.id);
      const redEyes = isBloodMoon() && HOLLOW.has(creature.templateId) ? BLOOD_MOON_EYES_ROOM : "";
      lines.push(`${cap(t.name)} is here${fogged ? "" : this.bearsClause(creature)}${tell ? `, ${tell}` : ""}${fogged ? "" : redEyes}.${!fogged && creature.hp < t.max_hp ? ` (${this.condition(creature)})` : ""}`);
    }
    // Blood on a stranger's hands is a CLOSE read: the fog swallows it and the
    // rain runs it off them. The room glance only carries the mark in weather
    // that lets you see it — same law as the look (verbs.describePlayer).
    const canReadStains = !events.foggy(this, room.id) && !events.raining(this, room.id);
    for (const s of this.sessions.values()) {
      // Somebody behind a barred door is not standing on the ground with you
      // (mig 172) — you cannot see them, name them, or put steel in them. The
      // doors themselves are counted by denRoomLine, without names.
      if (s.pubkey !== session.pubkey && s.roomId === room.id && this.reachable(s)) {
        // THE ONE BIT A PERSON USED TO CARRY (rome, 2026-08-30). "X is here,
        // resting." was the whole of it, against a creature line that hangs six
        // things off a beast. A posture is read the same way a bearing is: it is
        // here because whoever struck it is still in it, and it says what they
        // are doing without saying a word.
        const pose = s.pose ? POSES[s.pose] : undefined;
        const poseClause = pose ? `, ${pose.read.replace("{what}", s.poseAt ?? "something")}` : s.resting ? ", resting" : "";
        lines.push(`${s.name} is here${poseClause}.${canReadStains ? pvp.bloodClause(this, s.pubkey) : ""}`);
      }
    }
    return lines.join("\n");
  }

  // A sentinel is awake (and barring the way down) while its wake-clock runs.
  public sentinelAwake(creature: Creature): boolean {
    return !!creature.wakeUntil && Date.now() < creature.wakeUntil;
  }

  public condition(creature: Creature): string {
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    const f = creature.hp / tmpl.max_hp;
    // Bone doesn't scratch or bleed toward death — it chips, cracks, and comes
    // apart. The HOLLOW read their damage in their own material.
    if (HOLLOW.has(tmpl.id)) {
      if (f >= 1) return "whole";
      if (f > 0.66) return "chipped";
      if (f > 0.33) return "cracked";
      return "coming apart";
    }
    if (f >= 1) return "unhurt";
    if (f > 0.66) return "scratched";
    if (f > 0.33) return "wounded";
    return "near death";
  }

  // "You hack at a scabby rat" — the verb varies by the weapon in your hand,
  // then the caller tacks on " for N" and the rest. A cutting edge cuts, a
  // maul cracks, a spear drives, a bare fist clouts, a plain blade just hits.
  public playerHit(weapon: { tmpl: ItemTemplate } | null | undefined, name: string): string {
    const t = weapon?.tmpl;
    // The weapon's own voice first (by id); fall back to the family register
    // (edge/blunt/spear/fist/plain) for anything without a bespoke pool.
    const pool = t && WEAPON_VERBS[t.id]
      ? WEAPON_VERBS[t.id]
      : PLAYER_HIT[!t
        ? "fist"
        : t.bleed > 0 ? "edge"
        : t.stun > 0 ? "blunt"
        : t.sweep > 1 || t.speed > 1 ? "spear"
        : "plain"];
    return "You " + pick(pool).replace(/\{n\}/g, name);
  }

  // "A scabby rat sinks its teeth into you" — the register follows the kind of
  // thing swinging: teeth for the living beasts, cold weight for the drowned,
  // a thin knife for the cutpurses, dead bone for the hollow, a plain blow else.
  // A named boss outranks every register — the six of them are hand-written.
  // Inside BITERS the pool splits by anatomy: a beak stabs, a coiled thing
  // fastens and rolls, small vermin nip, and everything left keeps its jaws.
  private creatureHit(templateId: string): string {
    const boss = MOB_HIT[templateId];
    if (boss) return pick(boss);
    // COILS before DROWNERS, and only here: the congers sit in DROWNERS for the
    // seize-and-drown MECHANIC, but every other member of that Set is a drowned
    // dead man and the water voice was written for them. A conger is a live
    // animal with its teeth raked backward — it should speak in its own register
    // and still drown you by the same rule.
    const pool = COILS.has(templateId) ? CREATURE_HIT.coils
      : DROWNERS.has(templateId) ? CREATURE_HIT.water
      : THIEVES.has(templateId) ? CREATURE_HIT.knife
      : BITERS.has(templateId)
        ? (BEAKS.has(templateId) ? CREATURE_HIT.beak
          : COILS.has(templateId) ? CREATURE_HIT.coils
          : SMALL_BITE.has(templateId) ? CREATURE_HIT.vermin
          : CREATURE_HIT.teeth)
      : HOLLOW.has(templateId) ? CREATURE_HIT.bone
      : CREATURE_HIT.plain;
    return pick(pool);
  }

  // The vitals-lottery killing blow, in the same register as creatureHit — so the
  // headshot reads like the thing that landed it (jaws to the throat, iron to the
  // heart), not one generic line.
  private creatureVitals(templateId: string): string {
    const boss = MOB_VITALS[templateId];
    if (boss) return pick(boss);
    const pool = COILS.has(templateId) ? CREATURE_VITALS.coils // see creatureHit
      : DROWNERS.has(templateId) ? CREATURE_VITALS.water
      : THIEVES.has(templateId) ? CREATURE_VITALS.knife
      : BITERS.has(templateId)
        ? (BEAKS.has(templateId) ? CREATURE_VITALS.beak
          : COILS.has(templateId) ? CREATURE_VITALS.coils
          : SMALL_BITE.has(templateId) ? CREATURE_VITALS.vermin
          : CREATURE_VITALS.teeth)
      : HOLLOW.has(templateId) ? CREATURE_VITALS.bone
      : CREATURE_VITALS.plain;
    return pick(pool);
  }

  // The vitals-lottery killing blow, PLAYER side — the weapon type finds the vital
  // it's made for (pierce → the throat/skull driven through, edge → the throat
  // opened, blunt → the skull, thrust → the heart). Pierce is checked before the
  // stat registers so a pick reads as a point, not a "plain" blow.
  // How much armor a weapon's blow ignores: a pick's narrow point (per
  // weapon) or a blunt weapon's crushing weight (BLUNT_ARMOR_IGNORE, any stun>0),
  // whichever is greater. The single source for both damage paths. The rolled
  // needling/weighted traits (099) add their +1 each here too, so the ambush
  // opener and the PvP round read them the same way the PvE round's inline
  // math always has.
  public armorIgnore(weapon: { tmpl: ItemTemplate; carried?: CarriedItem } | null | undefined): number {
    if (!weapon) return 0;
    const pierce = (trait(weapon.tmpl, "pierce") ?? 0) + (weapon.carried && this.itemRolled(weapon as { tmpl: ItemTemplate; carried: CarriedItem }, "needling") ? 1 : 0);
    const blunt = weapon.tmpl.stun > 0
      ? BLUNT_ARMOR_IGNORE + (weapon.carried && this.itemRolled(weapon as { tmpl: ItemTemplate; carried: CarriedItem }, "weighted") ? 1 : 0)
      : 0;
    return Math.max(pierce, blunt);
  }

  // Pick ONE killing wound for this weapon — the pair (killer's account and the
  // victim's) travels together, so the two never contradict each other about
  // where the blow landed. Every caller of a vitals kill picks here, once.
  public pickVitals(weapon: { tmpl: ItemTemplate } | null | undefined): { hit: string; taken: string } {
    const t = weapon?.tmpl;
    const reg = !t ? "fist"
      : hasTrait(t, "piercing") ? "pierce"
      : t.bleed > 0 ? "edge"
      : t.stun > 0 ? "blunt"
      : t.sweep > 1 || t.speed > 1 ? "spear"
      : "plain";
    return pick(VITALS_KILLS[reg]);
  }

  // The killer's line for a picked wound: "You <hit>" + a varied finality.
  public vitalsHit(kill: { hit: string }, name: string): string {
    return "You " + kill.hit.replace(/\{n\}/g, name) + pick(VITALS_KICKER);
  }

  // PvE convenience: the mob has no client, so only the killer's side is read.
  public playerVitalsVerb(weapon: { tmpl: ItemTemplate } | null | undefined, name: string): string {
    return this.vitalsHit(this.pickVitals(weapon), name);
  }

  // Carried loot lives ON the holder. An elite spawns bearing its gear (or not)
  // by a roll — so the prize is visible before the fight, and killing an armed
  // one always spills it. Fodder and pups bear nothing.
  public rollCarry(tmpl: MobTemplate): string[] | undefined {
    if (tmpl.gear_item && chance(tmpl.gear_drop)) return [tmpl.gear_item];
    return undefined;
  }


  // Locked & full (openable) until the moment it's looted, then sprung and
  // empty until its refill clock runs out.
  public cacheLocked(cache: Cache): boolean {
    return Date.now() >= (this.cacheSpent.get(cache.id) ?? 0);
  }

  // Roaming chests (rome, 2026-07-10): a chest is no longer nailed to one room.
  // Its config room in the `caches` table now only fixes its TIER (gate/upper/
  // deep via regionOf); on each refill it relocates to a random room of that
  // tier — never a safe hideaway or a gate, so all chest loot carries risk (this
  // is what pulled box-bone/box-crack out of the safe rooms). The King's Hoard
  // is the one exception: the boss's treasure stays put. The secret doors'
  // prize boxes are the same exception, for a sharper reason — the DOOR is the
  // lock, and a box that roamed away would leave the door guarding nothing.
  // Finding a chest becomes exploration + luck; the supply (chest COUNT) is
  // unchanged, so scarcity holds.
  public cacheRoams(cache: Cache): boolean {
    return !DOOR_PRIZE_BOXES.has(cache.id);
  }

  // Rooms a chest may roam to: its own tier, minus every gate and hideaway.
  private cacheEligibleRooms(cache: Cache): string[] {
    const world = this.world!;
    const tier = this.regionOf(cache.roomId);
    const out: string[] = [];
    for (const r of world.rooms.values()) {
      if (world.safeRooms.has(r.id) || world.entryRooms.has(r.id)) continue;
      if (this.regionOf(r.id) === tier) out.push(r.id);
    }
    return out;
  }

  // Drop the chest into a fresh eligible room (or hold at its config room if a
  // fixed chest, or if — impossibly — its tier has no risky rooms).
  private placeCache(cache: Cache): void {
    if (!this.cacheRoams(cache)) { this.cacheRoom.set(cache.id, cache.roomId); return; }
    const pool = this.cacheEligibleRooms(cache);
    this.cacheRoom.set(cache.id, pool.length ? pool[randInt(0, pool.length - 1)] : cache.roomId);
  }

  // Where the chest is right now — placed on first ask (so a warm world scatters
  // its chests the moment this ships, no reseed).
  public cacheRoomId(cache: Cache): string {
    let room = this.cacheRoom.get(cache.id);
    if (!room) { this.placeCache(cache); room = this.cacheRoom.get(cache.id)!; }
    return room;
  }


  // The room-line clause for what a creature visibly bears: "clad in warden's
  // plate", "wielding a graveblade", "dragging a bone shiv". No leading article.
  // The close read of a hoarder: every piece it has taken, counted, so you can
  // price the fight before you start it. Empty string for anything that isn't a
  // hoarder (or a hoarder that hasn't found anything yet), so the caller falls
  // back to the ordinary bears clause.
  public hoardManifest(creature: Creature): string {
    if (!HOARDERS.has(creature.templateId) || !creature.carries?.length) return "";
    const names = creature.carries
      .map((id) => this.world!.itemTemplates.get(id)?.name)
      .filter((n): n is string => !!n);
    if (!names.length) return "";
    return ` Hung on it, lashed and knotted and swinging: ${names.join(", ")}.`
      + ` (${names.length} ${names.length === 1 ? "piece" : "pieces"} — all of it falls where it falls.)`;
  }

  public bearsClause(creature: Creature): string {
    if (!creature.carries?.length) return "";
    // A hoarder can be wearing eight things, and eight "and"s would bury the
    // room line. It gets a WEIGHT instead of a manifest — you can see it's laden
    // and roughly how badly, and the two most recent pieces (the top of the
    // pile) are the ones that read. `look` at it for the full inventory.
    if (HOARDERS.has(creature.templateId)) {
      const n = creature.carries.length;
      const top = creature.carries.slice(-2).map((id) => this.world!.itemTemplates.get(id)?.name).filter(Boolean);
      const heft = n >= HOARD_CARRY_CAP ? "hung to the point of staggering with"
        : n >= HOARD_KEEP ? "hung about with"
        : "carrying";
      if (!top.length) return "";
      const rest = n - top.length;
      return `, ${heft} ${top.join(" and ")}${rest > 0 ? ` and ${rest} more dead men's things` : ""}`;
    }
    const clauses: string[] = [];
    for (const id of creature.carries) {
      const t = this.world!.itemTemplates.get(id);
      if (!t) continue;
      // A beast drags everything in its jaws; only something with hands wields or wears.
      const verb = SCAVENGERS.has(creature.templateId) ? "dragging"
        : t.slot === "weapon" ? "wielding" : t.slot === "" ? "dragging" : "clad in";
      clauses.push(`${verb} ${t.name}`);
    }
    return clauses.length ? `, ${clauses.join(" and ")}` : "";
  }

  public findCreatureIn(roomId: string, arg: string): Creature | null {
    // "attack second hyena" / "look hyena 2": duplicates count in the same
    // order the room glance lists them, so what you read is what you address.
    const { nth, rest } = parseOrdinal(arg);
    let seen = 0;
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== roomId) continue;
      // ...AND SO IS A THING THAT IS OFF THE MAP. This scan reads the creature
      // table directly rather than the room index, so it does not get the aloft
      // filter for free (ai.drakePassage) — and the summit's animal keeps the
      // summit as its roomId the whole time it is out over the world, because
      // that is where it comes home to. Without this line you could stand in an
      // empty bowl and open a fight with something a hundred miles west of you.
      // Exactly the lurker's rule below, for the opposite reason.
      if (creature.aloft !== undefined) continue;
      const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
      if (nameMatches(tmpl.name, rest) && ++seen === nth) return creature;
    }
    return null;
  }

  // A lurker lying in wait ISN'T THERE until it springs — the room glance says
  // so, and every lookup that addresses a creature by name has to agree, or the
  // ambush is a fiction. Naming it (look/attack/throw) used to find it and hand
  // back its description, so a player who knew the roster could sweep every room
  // and never be jumped again — the whole archetype, defeated by typing a word
  // (rome, 2026-07-12). Torchlight is the honest counter: carry a flame and the
  // room shows it pressed into its crevice, so it becomes addressable.
  public lurkerUnseen(creature: Creature, session: Session): boolean {
    return LURKERS.has(creature.templateId)
      && !!creature.hidden
      && !creature.target
      && !this.litFor(session);
  }


  public findCarried(session: Session, arg: string): CarriedItem | null {
    for (const c of session.items) {
      // Match the name as SHOWN — a rolled piece reads "a muffled coat", so
      // "muffled" must target it, and a rolled copy must be distinguishable from
      // a plain one by its adjective (099). displayName == template name when
      // nothing rolled, so this is identical for all existing gear.
      if (this.world!.itemTemplates.get(c.itemId) && nameMatches(this.displayName(c), arg)) return c;
    }
    return null;
  }

  // The sharpest thing in the pack does the biting — no wield verb needed.
  // The item worn/wielded in a given slot, or null. At most one per slot.
  public equippedItem(session: Session, slot: string): { carried: CarriedItem; tmpl: ItemTemplate } | null {
    for (const c of session.items) {
      if (!c.equipped) continue;
      const t = this.world!.itemTemplates.get(c.itemId);
      if (t && t.slot === slot) return { carried: c, tmpl: t };
    }
    return null;
  }

  // A stat scaled by how worn the gear is: a dull blade bites softer, thinned
  // mail turns less. Rounds up, so a piece keeps a sliver of use until it breaks.
  private effStat(base: number, condition: number): number {
    if (base <= 0) return 0;
    return Math.max(0, Math.ceil(base * Math.max(0, condition) / 100));
  }
  public effDmg(g: { carried: CarriedItem; tmpl: ItemTemplate }): number {
    return this.effStat(g.tmpl.dmg, g.carried.condition);
  }

  // Every equipped piece, so armor and weight can sum across the whole kit.
  private *equippedAll(session: Session): Generator<{ carried: CarriedItem; tmpl: ItemTemplate }> {
    for (const c of session.items) {
      if (!c.equipped) continue;
      const t = this.world!.itemTemplates.get(c.itemId);
      if (t) yield { carried: c, tmpl: t };
    }
  }

  // Total damage the worn kit turns away from each hit that lands — the SUM of
  // every armor-bearing slot (body, helm, feet, cloak), each scaled by its wear.
  public equippedArmor(session: Session): number {
    let total = 0;
    for (const g of this.equippedAll(session)) {
      if (ARMOR_SLOTS.has(g.tmpl.slot) && g.tmpl.armor > 0) total += this.effStat(g.tmpl.armor, g.carried.condition);
    }
    return total;
  }

  // The burden you carry: the SUM of every equipped piece's weight — armor,
  // shield, AND the weapon in your hand. 0 total = quick on your feet (dodge,
  // clean flight); a heavy blade costs you your footwork same as heavy plate.
  public wornWeight(session: Session): number {
    let total = 0;
    // A balanced weapon shaves a point off its own weight — the load law only,
    // damage untouched (099-weapon).
    for (const g of this.equippedAll(session)) {
      // A balanced piece shaves a point off its own weight; an ill-hung one adds
      // one. This single line is the whole load law, so both reach dodge, the
      // movement-noise roll, the parting cut and entry stealth at once.
      const swing = (this.itemRolled(g, "balanced") ? 1 : 0) - (this.itemRolled(g, "cumbersome") ? 1 : 0);
      total += Math.max(0, g.tmpl.weight - swing);
    }
    return total;
  }

  // Just the ARMOR the body wears (helm/body/cloak/feet) — NOT the weapon and
  // shield in your hands. wornWeight lumps all of it for the load math; this
  // splits out real armor so the noise flavor can tell "plate rings" from "the
  // rock and shield in your hands knock" — the sound has to match what's heavy.
  public wornArmorWeight(session: Session): number {
    let total = 0;
    for (const g of this.equippedAll(session)) if (ARMOR_SLOTS.has(g.tmpl.slot)) total += g.tmpl.weight;
    return total;
  }

  // Fighting from behind a shield drags every blow you deal, in PROPORTION to how
  // much it guards: a buckler's-worth of block is free, everything above it costs
  // offense on a smooth slope (SHIELD_DRAG_FREE / SHIELD_DRAG_PER_BLOCK). Off the
  // shield's own block — the guarded stance pays its own offense through STANCE.
  public wallDrag(session: Session): number {
    const block = this.equippedItem(session, "shield")?.tmpl.block ?? 0;
    return 1 - Math.max(0, block - SHIELD_DRAG_FREE) * SHIELD_DRAG_PER_BLOCK;
  }

  // The pack's iron: loose (unworn) gear pieces the pack hauls. Trophies, food
  // and cigs stack silent forever; weapons/armor/shields are the iron.
  private looseIron(session: Session): number {
    let iron = 0;
    for (const c of session.items) {
      if (c.equipped) continue;
      const t = this.world!.itemTemplates.get(c.itemId);
      if (t && t.slot !== "") iron++;
    }
    return iron;
  }
  // Past BURDEN_FREE_IRON loose pieces you're burdened — the mule's tax.
  public burdened(session: Session): boolean {
    return this.looseIron(session) > BURDEN_FREE_IRON;
  }
  // THE LOAD LAW, one number (rome, 2026-07-19): worn armor/weapon/shield weight
  // + loose pack-iron past its free allowance. Dodge, noise, and the parting-cut
  // all read this — light is quick/quiet/free-to-leave, heavy is none of those.
  public loadOf(session: Session): number {
    return this.wornWeight(session) + Math.max(0, this.looseIron(session) - BURDEN_FREE_IRON);
  }
  // Poise rides WORN mass alone (a loaded pack doesn't help you keep your feet):
  // the fraction (0..POISE_CAP) a control effect is reduced by. Combined with the
  // resist traits STRONGEST-WINS (see the CC sites), never stacked.
  public poiseOf(session: Session): number {
    return Math.min(POISE_CAP, this.wornWeight(session) * POISE_PER_WEIGHT);
  }
  // The quick-foot dodge added to a foe's miss chance: real evasion when light,
  // scaling to nothing as the load climbs to DODGE_ZERO_AT.
  public dodgeBonus(session: Session): number {
    return Math.max(0, DODGE_MAX * (1 - this.loadOf(session) / DODGE_ZERO_AT));
  }

  // The verdigris-thing's touch is rust: a landed blow blooms green on ONE
  // random worn piece — armor slots and shield, never the weapon in your moving
  // hand. Soft and steady (CORRODE_WEAR), aimed at your equity, not your blood;
  // the seal's slower wear applies inside wear(), so sealed kit resists.
  // Nothing worn = nothing to eat; the naked player shrugs.
  private async corrodeTouch(victim: Session, tmpl: MobTemplate): Promise<void> {
    const pieces = [...this.equippedAll(victim)].filter((g) => g.tmpl.slot !== "" && g.tmpl.slot !== "weapon");
    if (pieces.length === 0) return;
    const g = pick(pieces);
    await this.wear(victim, g.carried, g.tmpl, CORRODE_WEAR);
    // Not every touch gets a line (it'd drown the fight); enough to teach.
    if (this.equippedItem(victim, g.tmpl.slot) && chance(0.35)) {
      this.send(victim, `Green bloom spreads where ${tmpl.name} touched — ${g.tmpl.name} pits and flakes.`, "dmgin");
    }
  }

  // Does THIS carried instance carry the tag — its template's OR its own roll
  // (099)? Unlike wearsTrait (whole-kit, boolean-only fold), keen/balanced/honed
  // are properties of the specific weapon in hand, not the whole body, so they
  // read off one item, not every equipped slot.
  public itemRolled(g: { carried: CarriedItem; tmpl: ItemTemplate } | null, tag: string): boolean {
    if (!g) return false;
    return hasTrait(g.tmpl, tag) || (g.carried.rolledMap?.get(tag) ?? 0) > 0;
  }

  // Does any EQUIPPED piece carry this trait? (Gear traits — reach, padded,
  // quiet, slick, strapped — are worn, not carried: a spear in the pack blunts
  // nothing.) Traits are booleans by design; two padded pieces are just padded.
  // Does anything equipped carry this trait tag? (The trait ledger, 098: tags
  // live on the item row — "padded", "quiet", "slick" — not in code sets.)
  // STAUNCHED (2026-08-03, the wood's answer to its own worst habit): moss-packed
  // linings and boiled hide don't stop a wound opening — wardhide and mailward
  // already do that — they stop it running. One tick less, every wound, from any
  // source. It is the FIRST thing in the game that touches bleed damage after
  // the fact: armour cannot, because a bleed is subtracted raw (see mig 151),
  // which is exactly why the two surface bosses hurt so much more than their
  // damage column said. A floor of one tick — nothing makes a cut free.
  public bleedTicksFor(session: Session): number {
    return Math.max(1, BLEED_TICKS - (this.wearsTrait(session, "staunched") ? 1 : 0));
  }

  public wearsTrait(session: Session, tag: string): boolean {
    for (const c of session.items) {
      if (!c.equipped) continue;
      // A worn piece carries the tag if its TEMPLATE has it (098) OR THIS copy
      // rolled it (099) — the two layers read as one, so a felt-lined boot is as
      // quiet as one the smith made quiet. This is the single fold-in point:
      // every mechanical trait consumed off worn gear routes through here.
      if (hasTrait(this.world!.itemTemplates.get(c.itemId), tag)) return true;
      if ((c.rolledMap?.get(tag) ?? 0) > 0) return true;
    }
    return false;
  }

  // The COUNTED form of wearsTrait: the highest value of `tag` across equipped
  // pieces (template + rolled). 0 = absent. For traits whose number is the
  // point — thorns' cousin spiked:1, spiked:2 (2026-08-20).
  public wornTrait(session: Session, tag: string): number {
    let best = 0;
    for (const c of session.items) {
      if (!c.equipped) continue;
      best = Math.max(best, trait(this.world!.itemTemplates.get(c.itemId), tag), c.rolledMap?.get(tag) ?? 0);
    }
    return best;
  }

  // The pack's ceiling for THIS wanderer: PACK_CAP, plus what any worn
  // POCKETED piece lends (POCKETED_BONUS per tag — pocketed:1). The cap lives
  // in one place so every check, message and modal reads the same number
  // (2026-08-20).
  public packCap(session: Session): number {
    return PACK_CAP + POCKETED_BONUS * Math.max(0, this.wornTrait(session, "pocketed"));
  }

  // THE TRAIT LOTTERY (099). A fresh piece of world-loot may enter carrying one
  // rolled trait from its slot's pool — most roll nothing, and the roll never
  // duplicates what the template already grants (no double-quiet, no god-roll).
  // Returns a comma list (one tag, or ""). Keeper stock and already-owned gear
  // never call this — only fresh mints do.
  public rollTraits(tmpl: ItemTemplate | undefined): string {
    if (!tmpl || tmpl.slot === "") return "";
    const pool = TRAIT_POOL[tmpl.slot];
    if (!pool || !chance(TRAIT_ROLL_ODDS)) return "";
    // Class-locked weapon traits (weighted/needling/cleaving) only enter the
    // draw for a weapon of their own class — no wasted rolls on a mace that
    // can never use needling.
    // ...and the same guard on the OTHER axis a trait can be wasted on: what
    // the piece is made of. A river cobble cannot be oiled against rust and a
    // headstone cannot pit, so neither draw is offered there (TRAIT_MATERIAL).
    const stuff = materialOf(tmpl.id);
    const fits = (t: string) => !hasTrait(tmpl, t)
      && (WEAPON_CLASS_TRAIT[t]?.(tmpl) ?? true)
      && (TRAIT_MATERIAL[t]?.(stuff) ?? true);
    const options = pool.filter(fits);
    if (!options.length) return "";
    // THE DRAW IS OPEN (rome, 2026-08-13). Virtue is not the default and a flaw
    // is not a rider on one: every trait a piece rolls is drawn independently
    // from the good pool or the bad one, so all five shapes are reachable — one
    // good, one bad, two good, two bad, or one of each. A piece can simply be
    // badly made, the way things in the world are, and that is what makes
    // finding a good one worth anything.
    const bad = (BAD_TRAIT_POOL[tmpl.slot] ?? []).filter((t) => !hasTrait(tmpl, t));
    const goodLeft = [...options];
    const badLeft = [...bad];
    const out: string[] = [];
    const rolls = chance(SECOND_TRAIT_ODDS) ? 2 : 1;
    for (let i = 0; i < rolls; i++) {
      // Weighted, not a coin-flip: BAD_TRAIT_SHARE of draws come off the flaw
      // pool. Either pool falling empty hands the draw to the other rather than
      // wasting it, so a slot with no flaws defined still rolls normally.
      const useBad = badLeft.length > 0 && (goodLeft.length === 0 || chance(BAD_TRAIT_SHARE));
      const from = useBad ? badLeft : goodLeft;
      if (!from.length) break;
      out.push(from.splice(randInt(0, from.length - 1), 1)[0]);
    }
    return out.join(",");
  }

  // An item's name as it reads on the shelf and the floor, with its rolled trait
  // worn as an adjective ("a muffled cloak"). The paperdoll spells out what the
  // trait DOES once the piece is worn; the name just advertises that it's there.
  public displayName(c: CarriedItem): string {
    const base = this.world!.itemTemplates.get(c.itemId)?.name ?? c.itemId;
    return this.rolledName(c.itemId, base, c.rolledMap);
  }

  // What `look` appends for a rolled piece — the flavor + mechanic of whatever it
  // rolled (099). itemStat reads the TEMPLATE, so it never sees an instance roll;
  // this fills that in. Empty for plain gear. Leading space, sentence per trait.
  // The itemId is not decoration: the same trait says a different true thing
  // depending on what the piece is made of, and traitTell picks (zone-data).
  public rolledTell(itemId: string, rolled?: Map<string, number>): string {
    if (!rolled?.size) return "";
    const tells: string[] = [];
    for (const tag of rolled.keys()) { const s = traitTell(tag, itemId); if (s) tells.push(s); }
    return tells.length ? " " + tells.join(" ") : "";
  }

  // The same, for a template id + a rolled string sitting on the floor (glance).
  public floorName(itemId: string, roomId: string): string {
    const base = this.world!.itemTemplates.get(itemId)?.name ?? itemId;
    const rolled = this.groundRolled.get(`${itemId}@${roomId}`);
    return rolled ? this.rolledName(itemId, base, parseTraits(rolled)) : base;
  }

  // Fold the first rolled tag's adjective into a name, after the article:
  // "a scavenger's coat" + quiet -> "a muffled scavenger's coat". The a/an
  // article re-agrees with the adjective now leading ("an oiled wrap", "a
  // quilted cap"); "the" and article-less names ("boots") are left alone.
  private rolledName(itemId: string, base: string, rolled?: Map<string, number>): string {
    if (!rolled?.size) return base;
    // ...UNLESS THE NAME ALREADY SAYS IT. A smith who names a thing the pitted
    // spear and then rolls it pitted gets "a pitted pitted spear", and there
    // were six of these reachable — four of them (boiled boiled-leather,
    // packed moss-packed, quilted quilted coif, pitted pitted spear) sitting in
    // the game long before the damp went material-aware. A piece that draws
    // twice falls through to its other adjective; a piece with nothing else to
    // say wears its plain name, which is the honest outcome — the roll still
    // happened and `look` still tells you about it.
    let adj = "";
    for (const tag of rolled.keys()) {
      const a = traitAdj(tag, itemId);
      if (a && !new RegExp("\\b" + a + "\\b", "i").test(base)) { adj = a; break; }
    }
    if (!adj) return base;
    const m = base.match(/^(an? |the )/i);
    if (!m) return `${adj} ${base}`;
    const rest = base.slice(m[0].length);
    const article = /^the /i.test(m[0]) ? m[0] : (/^[aeiou]/i.test(adj) ? "an " : "a ");
    return `${article}${adj} ${rest}`;
  }

  // A RARITY-COLOURED NAME for the wire. Plain text can't carry colour, so the
  // server wraps the item name in a tiny marker the client parses: 
  //   \u0001epic\u0001A black sword\u0002   -> the name is coloured epic.
  // The client strips it before it ever reaches textContent, so it is as safe
  // as the rest of the prose (no markup ever becomes HTML). The marker is
  // dropped wherever the client doesn't know it (a foreign renderer just sees
  // the bare name — the first char is a control char it will ignore or the
  // name is still readable between the controls). Gear and weapons carry their
  // rarity; food, keys, trophies and the free rock read plain.
  public rarityName(itemId: string, rarity: string): string {
    const t = this.world!.itemTemplates.get(itemId);
    if (!t || t.slot === "" || t.id === "loose-rock") return t?.name ?? itemId;
    return `\u0001${rarity || "common"}\u0001${cap(t.name)}\u0002`;
  }

  // ...AND THE MARKER'S ERASER, which lives here beside the two writers on
  // purpose: whoever changes the marker's shape has to walk past the one thing
  // that undoes it.
  //
  // The claim in the note above — that a foreign renderer "just sees the bare
  // name" — is FALSE and was found false in the arena (rome, 2026-08-15): the
  // Colosseum drew three .notdef boxes through the middle of every gear name,
  // because a browser renders U+0001 and U+0002 as tofu rather than skipping
  // them. Anything crossing out of this server to a reader we do not control
  // gets stripped, and both publish paths now do it at the boundary rather than
  // trusting every caller upstream to remember.
  private static plain(s: string): string {
    return s.indexOf("\u0001") === -1 ? s
      : s.replace(/\u0001[a-z]+\u0001([^\u0002]*)\u0002/g, "$1");
  }

  // THE ONE WAY TO NAME A PIECE OF GEAR IN PROSE. Wrap any already-built name
  // string in its rarity marker — for the many lines that have a name in hand
  // (a displayName with its rolled adjective, a template name, a floor read)
  // and want it coloured wherever it happens to sit in the sentence. The
  // client's painter scans, so the name does NOT have to lead the line.
  // Non-gear passes straight through: food, keys, trophies, journals, maps and
  // the free rock are never coloured, which is the whole signal — a colour on
  // the floor means a piece worth stooping for.
  public gearName(itemId: string, shown?: string): string {
    const t = this.world!.itemTemplates.get(itemId);
    const base = shown ?? t?.name ?? itemId;
    if (!t || t.slot === "" || t.id === "loose-rock") return base;
    return `\u0001${t.rarity || "common"}\u0001${base}\u0002`;
  }

  // The floor read: "A rusted sword lies here." with the item's name rarity-
  // coloured. Rolled adjectives fold in first (099), so a lottery piece reads
  // its rolled adjective AND its rarity in the same breath. The name inside
  // the marker is already capped (the marker's control char is cap-stable, so
  // a caller may safely cap the whole string and the name keeps its case).
  public floorLootName(itemId: string, roomId: string): string {
    const t = this.world!.itemTemplates.get(itemId);
    const base = t?.name ?? itemId;
    const rolled = this.groundRolled.get(`${itemId}@${roomId}`);
    const shown = rolled ? this.rolledName(itemId, base, parseTraits(rolled)) : base;
    if (!t || t.slot === "" || t.id === "loose-rock") return shown;
    return `\u0001${t.rarity || "common"}\u0001${cap(shown)}\u0002`;
  }

  // The wanderer, taken in at a glance: everything the combat math derives from
  // what you wear and hold, served as one structure for the bench modal's
  // paperdoll (rome's Achaea-style visualizer). Numbers here mirror the real
  // formulas — mitigation is the curved ARMOR_K share, block includes parry and
  // the guarded-behind-a-shield bonus, damage reads through condition.
  public sheetFor(session: Session): object {
    const slots = ["weapon", "shield", "helm", "armor", "cloak", "feet"].map((slot) => {
      const g = this.equippedItem(session, slot);
      return {
        slot,
        name: g?.tmpl.name ?? null,
        // Every slot on the figure is gear by definition, so the doll can
        // colour every name it shows — it just needs the tier to do it with.
        rarity: g?.tmpl.rarity ?? "",
        cond: g ? (this.conditionWord(g.carried.condition) || "sound") : "",
      };
    });
    const weapon = this.equippedItem(session, "weapon");
    const t = weapon?.tmpl;
    const style = !t ? "bare hands"
      : hasTrait(t, "piercing") ? "piercing"
      : t.bleed > 0 ? "edged"
      : t.stun > 0 ? "blunt"
      : t.sweep > 1 || t.speed > 1 ? "polearm"
      : "plain steel";
    const armor = this.equippedArmor(session);
    const traits: string[] = [];
    if (this.wearsTrait(session, "padded")) traits.push("wards stun (odds halved)");
    if (this.wearsTrait(session, "wardhide")) traits.push("wards wounds (bleeds and leg-rakes turned)");
    if (this.wearsTrait(session, "staunched")) traits.push("staunched (a wound clots a tick sooner)");
    if (this.wearsTrait(session, "hooded")) traits.push("hooded (a flame catches in the rain)");
    if (this.wearsTrait(session, "mailward")) traits.push("wards bleeds (edges skate off the rings)");
    if (this.wearsTrait(session, "quiet")) traits.push("quiet (soft-footed)");
    if (this.wearsTrait(session, "slick")) traits.push("slick (hard to seize)");
    if (this.wearsTrait(session, "strapped")) traits.push("strapped (theft-proof)");
    if (this.wearsTrait(session, "thorns")) traits.push("thorns (blocks bite back)");
    if (t && hasTrait(t, "reach")) traits.push("reach (blunts the rush; still finds what's off the ground)");
    return {
      hp: session.hp, maxHp: session.maxHp, stance: session.stance,
      slots,
      atk: {
        name: t?.name ?? "your bare hands",
        style,
        dmg: t ? this.effStat(t.dmg, weapon!.carried.condition) : 1,
        swings: Math.max(1, t?.speed ?? 1),
        sweep: Math.max(1, t?.sweep ?? 1),
        bleed: t?.bleed ?? 0,
        stun: t?.stun ?? 0,
        ignore: this.armorIgnore(weapon),
        twoHanded: !!t && hasTrait(t, "two-handed"),
      },
      def: {
        armor,
        mitigate: Math.round((100 * armor) / (armor + ARMOR_K)),
        block: Math.round(100 * this.equippedBlock(session)),
        weight: this.wornWeight(session),
      },
      traits,
      lit: this.carriesLight(session),
      // The braggart's ledger rides the doll too — the figure knows its history.
      tally: { kills: session.kills, deaths: session.deaths, boss: session.bossKills, pvp: session.pvpKills, born: session.born },
    };
  }

  // The wound a fleeing thing runs with remembers the weapon that beat it
  // (ai's FLEE_TELL): the sheet's six styles collapsed to four flee voices.
  public fleeStyleOf(pubkey: string): string {
    const foe = [...this.sessions.values()].find((s) => s.pubkey === pubkey && !this.outOfWorld(s));
    const t = foe ? this.equippedItem(foe, "weapon")?.tmpl : null;
    if (!t) return "plain";
    return hasTrait(t, "piercing") ? "pierce" : t.stun > 0 ? "blunt" : "edge";
  }

  // The shield on your arm gives its block chance (scaled by wear) — and a
  // parrying blade (a weapon with a block stat: sword-breaker, king's-guard)
  // adds its own catch on top. The turtle's weapon is part of the wall.
  public equippedBlock(session: Session): number {
    let block = 0;
    const w = this.equippedItem(session, "weapon");
    const s = this.equippedItem(session, "shield");
    // Both hands are full of a two-handed weapon — there's no arm free for a
    // shield, whatever the row says. Belt-and-suspenders: equip already
    // refuses this combination going forward, but combat itself should never
    // trust `equipped=1` alone for something the fiction can't support (rome,
    // 2026-07-22 — a leftover from before the equip guard existed still had
    // one live and was genuinely blocking, not just showing wrong).
    const twoHanded = !!w && hasTrait(w.tmpl, "two-handed");
    // A hand full of fire holds no shield up: a burning torch or lantern takes
    // the shield hand, so the shield gives no block while a light burns (it
    // STAYS on your arm the whole time — never unequipped, never a loose thing
    // to drop; 'equip shield' lowers the flame and brings the guard back).
    // A burning BRAND is the exception (2026-08-20): the flame lives in the
    // WEAPON hand, the shield hand is free, and the guard stands while it burns.
    const handFlame = this.carriesLight(session) && session.litSource !== "brand";
    if (s && s.tmpl.block > 0 && !twoHanded && !handFlame) {
      block += s.tmpl.block * Math.max(0, s.carried.condition) / 100;
      // Guarded means fighting BEHIND the shield — it catches a shade more.
      // (Stance only sweetens a shield you actually carry; bare guarded gets nothing.)
      if (session.stance === "guarded") block += GUARDED_BLOCK_BONUS;
    }
    if (w && w.tmpl.block > 0) block += w.tmpl.block * Math.max(0, w.carried.condition) / 100;
    return block;
  }

  // A one-word read on how worn a piece is, for the inventory line.
  public conditionWord(cond: number): string {
    if (cond >= 85) return "";        // pristine — no tag
    if (cond >= 60) return "worn";
    if (cond >= 35) return "battered";
    if (cond >= 15) return "failing";
    return "nearly broken";
  }

  // Grind a piece down. Sealed gear wears SLOWER, not never (SEALED_WEAR_MULT —
  // the mark holds the dungeon off, it doesn't stop time), and it can be mended
  // at the bench like anything else. At 0 a piece is gone — worn through, mid-life.
  public async wear(session: Session, carried: CarriedItem, tmpl: ItemTemplate, amount: number): Promise<void> {
    if (carried.serial !== null) amount *= SEALED_WEAR_MULT; // sealed: protected, not immortal — the mark slows the wear
    // Tempered steel takes punishment; a brittle piece is already going. Every
    // wear path in the game funnels through here — strikes landed, blows turned,
    // the idle damp, the corroder's touch, a latch smashed with a stone — so the
    // pair needs no other site.
    // Template OR rolled, never just rolled: hasTrait reads what the smith made
    // it, rolledMap reads what THIS copy turned out to be, and the trait ledger
    // says the two layers are one. (Caught 2026-08-14 while authoring a
    // legendary that is tempered on its template — as written, it would have
    // worn like anything else.)
    const temper = (tag: string) => hasTrait(tmpl, tag) || (carried.rolledMap?.get(tag) ?? 0) > 0;
    if (temper("tempered")) amount *= TEMPERED_WEAR_MULT;
    else if (temper("brittle")) amount *= BRITTLE_WEAR_MULT;
    const before = carried.condition;
    carried.condition -= amount;
    if (carried.condition > 0) {
      // The heads-up, so wear is never a silent surprise-break. One-shot crossings
      // (the decrement passes each mark once); urgent checked first so a single big
      // bite — a corrode, a stone-smash — that leaps both marks speaks the louder line.
      const weap = tmpl.slot === "weapon";
      if (before > GEAR_FAILING_AT && carried.condition <= GEAR_FAILING_AT) {
        this.send(session, `${cap(tmpl.name)} is about to fail — ${weap ? "one more hard blow could finish it" : "it's barely holding together"}. (repair at a gate, or find another)`, "wear");
      } else if (before > GEAR_WORN_AT && carried.condition <= GEAR_WORN_AT) {
        this.send(session, `${cap(tmpl.name)} is ${weap ? "notched and loose in your grip" : "battered and thinning"} — it's taken hard wear. (repair at a gate to hammer it out)`, "wear");
      }
      return;
    }
    const idx = session.items.indexOf(carried);
    if (idx >= 0) session.items.splice(idx, 1);
    await removeItemRow(this.env.DB, carried.rowId);
    this.send(session, `${cap(tmpl.name)} is worn through — it comes apart in your ${tmpl.slot === "weapon" ? "grip" : "hands"} and is gone.`, "wear");
    this.sendStatus(session); // the pill goes with the piece, not on the next beat
    this.refreshRoomCtx(session.roomId);
  }


  // A line to one wanderer. `cls` is an optional semantic tag (dmgin, dmgout,
  // kill, fumble, death, gain — with "big" for the loud ones) so the client
  // colors combat by MEANING, not by matching prose. This is what lets the
  // dialogue vary freely without the coloring ever falling out of step.
  public send(session: Session, text: string, cls?: string, speaker?: { name: string; pk: string }): void {
    try {
      const frame: Record<string, unknown> = { v: 0, kind: 24912, text };
      if (cls) frame.cls = cls;
      // A speech line can name its speaker: the client paints that name in the
      // speaker's own key-colour (bitchat-style), so voices read apart.
      if (speaker) { frame.who = speaker.name; frame.sp = speaker.pk; }
      session.ws.send(JSON.stringify(frame));
    } catch {}
  }

  public sendStatus(session: Session): void {
    const room = this.world?.rooms.get(session.roomId);
    // Active effects, most urgent first — the HUD shows these as glanceable tags
    // so a wound is never an invisible debuff (the affliction layer reads here).
    const fx: string[] = [];
    if (session.seizedBy) fx.push("seized");
    if (session.stunned) fx.push("stunned");
    if (session.hobbled) fx.push("hobbled");
    if (session.bleedTicks && session.bleedTicks > 0) fx.push("bleeding");
    if (session.resting) fx.push("resting");
    if (session.pose) fx.push(session.pose === "point" ? "pointing" : session.pose);
    // A flame in the shield hand is a real debuff and it was the only invisible
    // one left: the shield stays equipped (so it can't be lost loose in the
    // pack), equippedBlock quietly returns 0, and every surface but the sheet's
    // block figure went on saying you were guarded. Now it says so on the bar.
    if (this.carriesLight(session) && light.guardingShield(this, session)) fx.push("guard-down");
    // KIT THAT WILL NOT LAST (rome, 2026-08-22). Wear's only signals were two
    // one-shot lines in combat scroll — a tell as the bar crossed 35, another as
    // it crossed 12 — and from that second one a weapon has ~48 landed blows
    // left in it (WEAPON_WEAR 0.25): two or three fights of nothing being said.
    // Corpse-stripped gear rolls in at 32-78 besides, so a looted piece can
    // START below 35 and never print the first tell at all.
    //
    // ONE PILL, not one per slot. The #fx row is budgeted at three and says a
    // fourth runs off the edge, and this must never crowd out bleeding or
    // seized — those kill you faster. So it reads the worst piece you have on
    // and says only that something is going; the bench's figure names WHICH,
    // in the wound colour, which is the surface you go to when this catches
    // your eye.
    let worst = 101;
    for (const c of session.items) {
      if (!c.equipped) continue;
      const t = this.world!.itemTemplates.get(c.itemId);
      if (!t || t.slot === "") continue;
      worst = Math.min(worst, c.condition);
    }
    if (worst <= GEAR_FAILING_AT) fx.push("kit-failing");
    else if (worst <= GEAR_WORN_AT) fx.push("kit-worn");
    try {
      session.ws.send(
        JSON.stringify({
          v: 0,
          t: "status",
          name: session.name,
          named: session.named ? 1 : 0,
          hp: session.hp,
          max_hp: session.maxHp,
          // Inside, the HUD must say INSIDE. You are not at the Weeper's Arch —
          // you are behind its door, and the bar saying otherwise was the visible
          // face of a deeper lie: the world still had you standing in the gate room.
          room: this.outOfWorld(session) ? "The Gatehouse" : den.roomTitle(this, session, room?.name ?? session.roomId),
          // AND WHAT COUNTRY THAT ROOM IS IN (rome, 2026-08-12). The bar named
          // the room and nothing else, so "The Weeper's Arch" told you where you
          // were standing and never which of the world's bands you were standing
          // in. Behind a door it still answers: the gatehouse belongs to the gate
          // it is built into, so the bar reads the ground outside rather than
          // going blank the moment you step in out of the cold.
          region: REGION_LABELS[lore.mapRegionOf(this, session.roomId)] ?? "",
          fx,
        }),
      );
    } catch {}
  }

  // The chip builders live in chips.ts; these delegates keep the many call
  // sites (every command, every tick, gate.ts, ai.ts) unchanged.
  public sendCtx(session: Session): void {
    chips.sendCtx(this, session);
  }

  public refreshRoomCtx(roomId: string): void {
    chips.refreshRoomCtx(this, roomId);
  }

  private syncCombatCtx(): void {
    chips.syncCombatCtx(this);
    trade.sweepCombatDeals(this); // a deal is not a shield — steel out ends it
    trade.sweepStrandedDeals(this); // and a handshake doesn't reach between rooms
  }

  // ---- sound: text renders it better than graphics render anything ----
  // A noisy event in one room is heard, degraded and directional, in every
  // room with an open exit toward it. Closed iron blocks sound. "{dir}" in
  // the template becomes "to the east" / "from below" for each listener.
  // `loud` = this sound IS the din, so the din must not swallow it. The rut's
  // roaring is the only thing that sets it: masking a stag's bellow behind the
  // noise of stags bellowing would be circular, and worse, it would mute the
  // creatureNoise pull that makes the wolves a consequence instead of a script.
  public roomSound(sourceRoomId: string, template: string, excludeRoomId?: string, cls?: string, loud = false): void {
    const world = this.world;
    if (!world) return;
    // A downpour eats sound made under it — half of what happens in the rain
    // simply never carries. (Hunting weather.)
    if (events.raining(this, sourceRoomId) && chance(RAIN_NOISE_MASK)) return;
    // THE RUT MASKS TOO, for the opposite reason: not because the sky is loud
    // but because the WOOD is, and none of it is yours. The one window where a
    // heavy pack costs you nothing to carry — bought at the price of every
    // predator in the wood already walking toward the same noise.
    if (!loud && events.rutting(this, sourceRoomId) && chance(RUT_NOISE_MASK)) return;
    const heard = new Set<string>();
    const firstHop = new Set<string>(); // rooms that carried the sound — the wind's second hop
    // ADJACENCY, NOT THE WHOLE WORLD (2026-08-22). Sound used to scan every
    // room in world.exits (~500-1,100 rows) per noise event, and noise events
    // fire per combat blow. The reverse index maps a room to the rooms with an
    // exit INTO it — built once, cleared by the breach arc (the one thing that
    // changes exits after load, via noteExitsChanged). Keyed doors still mute
    // below, exactly as before.
    for (const rid of this.adjacentTo(sourceRoomId)) {
      if (rid === sourceRoomId || rid === excludeRoomId) continue;
      const toward = (world.exits.get(rid) ?? []).find(
        (e) => e.to_room === sourceRoomId && (!e.key_item || this.openDoors.has(`${rid}:${e.dir}`)),
      );
      if (!toward) continue;
      firstHop.add(rid);
      const line = template.replace("{dir}", dirPhrase(toward.dir));
      // A shout heard through a wall is still a HUMAN — it carries the speech
      // color next door too, so it never reads as one more thing scraping in
      // the dark. (Everything else that carries — claws, water, bone — has no
      // class and stays the world's grey.)
      const frame = JSON.stringify(cls ? { v: 0, kind: 24913, room: rid, text: line, cls } : { v: 0, kind: 24913, room: rid, text: line });
      for (const s of this.sessions.values()) {
        if (s.roomId !== rid || heard.has(s.pubkey)) continue;
        // Behind the door, you hear the gatehouse and nothing else. I'd left this
        // carrying, thinking distant claws through the wall were good atmosphere —
        // they aren't, they're a lie: the room promises "the dungeon is on the
        // other side of a very old door, and it stays there," and then let the
        // dungeon keep talking. (Their own room has its own quiet; see
        // gate.gatehouseAmbient.)
        if (this.outOfWorld(s)) continue;
        heard.add(s.pubkey);
        try { s.ws.send(frame); } catch {}
      }
    }
    // Wind carries sound a room further on the open ground (exposure): a sprint
    // is heard two rooms out, and the direction reads from the middle room.
    if (events.windy(this, sourceRoomId) && OUTDOOR_ROOMS.has(sourceRoomId)) {
      for (const mid of firstHop) {
        for (const rid of this.adjacentTo(mid)) {
          if (rid === mid || rid === sourceRoomId || rid === excludeRoomId || firstHop.has(rid)) continue;
          const toward = (world.exits.get(rid) ?? []).find(
            (e) => e.to_room === mid && (!e.key_item || this.openDoors.has(`${rid}:${e.dir}`)),
          );
          if (!toward) continue;
          const line = template.replace("{dir}", dirPhrase(toward.dir));
          const frame = JSON.stringify(cls ? { v: 0, kind: 24913, room: rid, text: line, cls } : { v: 0, kind: 24913, room: rid, text: line });
          for (const s of this.sessions.values()) {
            if (s.roomId !== rid || heard.has(s.pubkey)) continue;
            if (this.outOfWorld(s)) continue;
            heard.add(s.pubkey);
            try { s.ws.send(frame); } catch {}
          }
        }
      }
    }
  }

  // A fight is continuous noise; ring out at most once per window per room.
  private combatNoiseAt = new Map<string, number>();
  public combatNoise(roomId: string): void {
    const now = Date.now();
    if ((this.combatNoiseAt.get(roomId) ?? 0) + COMBAT_NOISE_EVERY_MS > now) return;
    this.combatNoiseAt.set(roomId, now);
    this.roomSound(roomId, "The sounds of a fight echo {dir}.");
    // A fight in the room is almost unmissable — sleepers here roll the noise
    // odds and mostly come awake (the same WAKE_NOISE law the bones obey).
    for (const c of this.creaturesInRoom(roomId)) {
      if (!c.asleep || !chance(WAKE_NOISE)) continue;
      c.asleep = false;
      c.sleepUntil = undefined;
      c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 8000));
    }
    // Creatures ALREADY in the room pile onto the fight, same as the ones the
    // noise draws in from next door (rome, 2026-07-13) — same exemptions, rolled
    // once per ring so the room joins in a stagger, not all at once.
    ai.joinSameRoomFight(this, roomId);
    this.creatureNoise(roomId);
  }

  // Creatures have ears too. Player-made noise makes everything idle in
  // earshot curious — it comes to look, soon. Creature-made sounds never
  // attract (no feedback loops); quiet players attract nothing.
  public creatureNoise(sourceRoomId: string, loud = false): void {
    const world = this.world;
    if (!world) return;
    // The rain masks creature-ward too: what the downpour swallows, nothing
    // comes to investigate.
    if (events.raining(this, sourceRoomId) && chance(RAIN_NOISE_MASK)) return;
    if (!loud && events.rutting(this, sourceRoomId) && chance(RUT_NOISE_MASK)) return; // ...and so does the roaring
    const now = Date.now();
    // What runs FROM noise — the hoarder, and every RUNNER — is handled before
    // the crowd guard below: that guard exists to stop a busy room pulling in
    // yet more bodies, and applying it here would mute the very creatures that
    // want to LEAVE — deafened by a crowd, in the exact moment a crowd is the
    // thing worth fleeing.
    ai.spookFromNoise(this, sourceRoomId, now);
    // A room already full of the curious doesn't pull in more — that's what
    // turned the central hub into a black hole that swallowed the whole zone.
    if (ai.creaturesIn(this, sourceRoomId) >= CROWD_CAP) return;
    for (const c of this.creatures.values()) {
      if (c.target || c.roomId === sourceRoomId) continue;
      if (c.asleep) continue; // a sleeper doesn't hear the next room over (same-room noise has its own wake roll)
      const tmpl = world.mobTemplates.get(c.templateId)!;
      if (tmpl.is_boss) continue; // the King waits; the noise comes to him
      if (DROWNERS.has(c.templateId)) continue; // it holds its water; noise doesn't move it
      if (SENTINELS.has(c.templateId) || AGGRESSIVE.has(c.templateId)) continue; // a guardian holds its post; noise doesn't draw it off the door
      if (ROOTED.has(c.templateId)) continue; // it IS the ground here; a noise elsewhere is nothing to it
      if (SCAVENGERS.has(c.templateId)) continue; // hyenas track the scent of the dead, not the din of the living
      if (HOARDERS.has(c.templateId)) continue; // it already ran the other way (spookFromNoise, above) — never also draw it in
      // A RUNNER is not one of the "good majority" whose ears prick up. Its whole
      // nature is bolting, and a deer that walks toward a fight is not a deer
      // (rome, 2026-08-02). spookFromNoise has already sent it the other way.
      if (RUNNERS.has(c.templateId)) continue;
      // Not every ear pricks up. A good majority come to look; the rest keep
      // to their own business — so a fight draws a crowd, not the whole zone.
      // A MARKED wanderer (the toll clerk's brand) is the exception: the road
      // knows that face, so every ear in earshot heeds twice as hard, and each
      // rolls its own chance to be pulled straight over (MARK_CALL_ODDS) — the
      // brand working like a noise it can smell rather than hear.
      const marked = [...this.sessions.values()].some(
        (s) => s.roomId === sourceRoomId && (s.markedUntil ?? 0) > now,
      );
      // Wind carries the noise (exposure): the open ground's curious come
      // looking that much harder.
      const windHeed = events.windy(this, sourceRoomId) && OUTDOOR_ROOMS.has(sourceRoomId) ? WIND_HEED_MULT : 1;
      const heed = Math.min(1, (marked ? Math.min(1, NOISE_HEED_ODDS * MARK_HEED_MULT) : NOISE_HEED_ODDS) * windHeed);
      if (!chance(heed) && !(marked && chance(MARK_CALL_ODDS))) continue;
      const exits = world.exits.get(c.roomId) ?? [];
      const toward = exits.find(
        (e) => e.to_room === sourceRoomId && (!e.key_item || this.openDoors.has(`${c.roomId}:${e.dir}`)),
      );
      if (!toward) continue;
      c.curious = sourceRoomId;
      c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(3000, 8000));
    }
  }

  // The spectator feed, kind 24913: to everyone standing in the room, and —
  // when the relay door is open — to anyone anywhere watching t=mudroom-<id>.
  //
  // THE ARENA LAW (rome, 2026-07-15): the public feed is moves, fights, kills,
  // deaths — and those ride out under the ACTOR's own key (actorFeed), 15s
  // behind. The world key relays only impersonal world lines; it never speaks
  // a player's name. Any line that names a wanderer and isn't one of those four
  // beats passes toRelay=false and stays in the room — banking, trading,
  // claims, loot, respawns, a body gone slack: witnesses see it, the network
  // doesn't. If you add a line naming a player, route it or ground it.
  // `except2` is the second person a line must skip: a gesture aimed at someone
  // tells them in the second person ("...toward you") and the room in the third,
  // and without it the target got both (rome, 2026-08-30). Optional and last, so
  // every existing caller is untouched.
  public roomFeed(roomId: string, text: string, exceptPubkey?: string, toRelay = true, cls?: string, speaker?: { name: string; pk: string }, except2?: string): void {
    const base: Record<string, unknown> = { v: 0, kind: 24913, room: roomId, text };
    if (cls) base.cls = cls;
    // Speech carries its speaker so the client can key-colour the name; only the
    // local socket copy gets it — the relay text (below) never does.
    if (speaker) { base.who = speaker.name; base.sp = speaker.pk; }
    const frame = JSON.stringify(base);
    for (const s of this.sessions.values()) {
      if (s.roomId !== roomId || s.pubkey === exceptPubkey || (except2 && s.pubkey === except2)) continue;
      // Someone in the GATEHOUSE shares the gate's roomId but is not in the room:
      // they're behind the door. The gate's noise — a rat skittering below, a
      // wanderer blinking in, a bench being closed — doesn't carry through it.
      // (Their own room has its own feed; see gate.gatehouseFeed.)
      if (this.outOfWorld(s)) continue;
      // AND THE SAME IS TRUE OF A BARRED HOUSE DOOR (rome, 2026-08-10, reporting
      // a deer in his den). He was sitting behind his own bar, which the
      // room had just told him nothing outside could reach through, and the
      // street's roe deer walked across his feed as though it were in the room
      // with him. The gatehouse has skipped its own door's noise since the day
      // it was built; the den — much newer — never got the rule.
      //
      // Only what happens on the OTHER side of the door is cut. A creature has
      // no pubkey and is always out on the ground, so its noise never carries
      // in; a bunkmate sharing the same barred room is on your side of it and
      // still speaks to you normally.
      if (this.shelteredInDen(s.pubkey) && !den.sameSide(this, speaker?.pk ?? exceptPubkey, s.pubkey)) continue;
      try { s.ws.send(frame); } catch {}
    }
    // Players standing here always see it (a cheap in-memory send). The relay,
    // though, only carries what a distant watcher would care about — a fight, a
    // death, an arrival. Idle creature wandering stays LOCAL: it was flooding the
    // relays two ephemeral events per step (leave + enter) with rats pacing empty
    // rooms nobody watches. That noise never leaves the box now.
    if (toRelay) this.relayFeed("mudroom-" + roomId, text);
  }

  // A WORLD-WIDE LINE THAT IS NOT ACTUALLY WORLD-WIDE (rome, 2026-08-02: "I'm
  // hearing the deep close but the gatehouse I'm in is from the Timber Stack").
  //
  // Every roomFeedAll in the game speaks fortress — "deep below", "through the
  // stone", "far under the keep" — because the fortress WAS the world when they
  // were written. They now reach two hundred rooms of open road and wood, and
  // every gatehouse whichever door it belongs to. A man sitting behind a hut in
  // the wood should not hear the black door grind shut forty rooms away.
  //
  // So a line can name the bands it carries to. A gatehouse sitter keeps their
  // GATE as roomId while they are behind the door (outOfWorld leaves it alone),
  // so this puts them with the band they actually came in from, which is the
  // whole point. The relay copy still goes out whole — the arena watches the
  // world, not one band of it.
  /**
   * WHICH BAND'S NEWS A ROOM HEARS. Not regionOf, and the difference is the
   * whole point: regionOf checks entryRooms FIRST and collapses every gate to
   * "gate", which was right while all three doors were in the fortress. Since
   * the gates spread, the wood's Timber Stack and Withy Hut and Gate Arch and
   * the road's First Milestone have all been sitting in the FORTRESS's band —
   * so the last watchman calling the hour off a battlement ten rooms and a
   * whole region away was heard by anyone standing at a gatehouse in the wood
   * (rome, 2026-08-10).
   *
   * lore.mapRegionOf was written to fix exactly this for the MAP, and this is
   * the same fix for the FEED, by the same rule: a room that carries its own
   * region is in that region, gate or not. Only the original 110, which carry
   * no region column at all, still collapse to "gate" — and those three doors
   * genuinely are the fortress.
   */
  public bandOf(roomId: string): string {
    const own = this.world!.rooms.get(roomId)?.region;
    if (own) return own;
    if (this.world!.entryRooms.has(roomId)) return "gate";
    return DEEP_ROOMS.has(roomId) ? "deep" : "upper";
  }

  /**
   * A line for a whole band or several.
   *
   * SOUND STOPS AT THE DOOR; WORD DOES NOT (2026-08-21, on a report of the
   * fortress bell being heard from inside a gatehouse). roomFeed has skipped
   * anyone behind a door since the day the gatehouse was built — the gate's own
   * noise does not carry through it — and this, the arc feed, never checked at
   * all. So a wanderer sitting in the one room in the world whose entire job is
   * being shut away from it heard every bell, every tide, every breath out of
   * the deep, exactly as if the door were open.
   *
   * A blanket guard would have been wrong, though, and that is why this took a
   * flag instead of a fix: the works announcements are the most gatehouse-
   * relevant lines in the game, and the keeper's chalk is chalked ON that room's
   * own hatch. The distinction the writing already draws is the one that works —
   * half these lines open with the literal word "Word". So:
   *
   *   carries = false (default)  SOUND, or a thing seen. The bell, the tide, the
   *                              deep's breath, lights over the fen. A closed
   *                              door cuts it.
   *   carries = true             WORD — news that travels because people carry
   *                              it. It reaches you inside, because somebody in
   *                              there with you is the one telling you.
   *
   * The relay copy is never gated: a watcher is watching the world, not sitting
   * in a room of it.
   */
  // A BAND LINE IS HEARD EVERYWHERE IN THE BAND, GATEHOUSES INCLUDED (rome,
  // 2026-08-31). This channel exists to say a thing to a whole region at once —
  // the bell over the fortress, the beck up along the east road, the cloud
  // coming down the hill, the tide turning on the crossing. Every one of those
  // is heard a map away by definition, and every one of them was being withheld
  // from the one room in the band with a roof and a fire and people sitting in
  // it waiting to hear exactly that.
  //
  // `carries` was written the other way round — default deaf, with a flag for
  // the rare line that got through — and in the whole game exactly ONE caller
  // ever set it. That default was right for roomFeed, which is a room's own
  // local noise and genuinely stops at the door (a rat below, a bench closing),
  // and wrong for this one, which is regional news. The flag stays, inverted,
  // for anything that truly must not reach through: pass false for it.
  public roomFeedBands(bands: Set<string>, text: string, cls?: string, carries = true): void {
    const frame = JSON.stringify(cls ? { v: 0, kind: 24913, room: "*", text, cls } : { v: 0, kind: 24913, room: "*", text });
    for (const s of this.sessions.values()) {
      if (!bands.has(this.bandOf(s.roomId))) continue;
      // BEHIND THE DOOR, not merely stepped-out: outOfWorld() is also true for
      // the lockbox crouch at a gate (gate.ts sets `away` for it and says so —
      // opening your pack is not a step inside), and a wanderer kneeling over a
      // box in the open air should hear the bell like anyone else standing there.
      const behindTheDoor = this.inGatehouse.has(s.pubkey) && this.world!.entryRooms.has(s.roomId);
      if (!carries && behindTheDoor) continue; // sound does not reach through it
      try { s.ws.send(frame); } catch {}
    }
    this.relayFeed("mudzone-" + (this.world?.zone ?? "door"), text);
  }

  /**
   * A line for the WATCHERS only — no socket sends, just the relay copy.
   *
   * The sky's arcs (rain, fog, cold, crows) reach everyone standing outdoors,
   * which is a condition no band can express: "outdoors" cuts across every
   * region there is. So they went out per-room and stopped there, and a
   * spectator never once saw it rain. That was already inconsistent with
   * itself — the moon's nightfall lines DO reach the feed — and a watcher is
   * watching the world rather than standing in a room of it, so the weather is
   * exactly the kind of thing they should have (rome, 2026-08-10).
   */
  public feedWatchers(text: string): void {
    this.relayFeed("mudzone-" + (this.world?.zone ?? "door"), text);
  }

  public roomFeedAll(text: string, cls?: string): void {
    const frame = JSON.stringify(cls ? { v: 0, kind: 24913, room: "*", text, cls } : { v: 0, kind: 24913, room: "*", text });
    for (const s of this.sessions.values()) {
      try { s.ws.send(frame); } catch {}
    }
    this.relayFeed("mudzone-" + (this.world?.zone ?? "door"), text);
  }

  // A line that is one wanderer's OWN deed — a step taken, a swing thrown, a kill
  // earned, their own death. The room hears it live over the socket (minus the
  // actor, who already read their first-person view). But the RELAY copy is not
  // signed by the dungeon: it is handed back to the actor's own client (frame
  // "fpub"), which signs kind 24913 under THEIR key, tags it for the arena feed,
  // and puts it on the relays after a short hold. So the gladiator feed authors
  // itself, spread across every player's connection — no single npub firehoses
  // the relays (rome, 2026-07-15). If the actor's client is gone, the beat simply
  // doesn't reach the relay: the room already heard it, and the books in D1 — not
  // this feed — are the truth of who did what.
  // toRelay=false keeps a deed LOCAL — the room still sees it live, but the actor's
  // client is NOT handed the fpub, so it never rides the wire to the colosseum. Used
  // for the redundant "arrives" (the "leaves <dir>" line already tells the move, with
  // a direction) — halves movement traffic without dimming in-room awareness.
  // alsoSkip drops a SECOND person from the in-room echo (never the relay): a PvP
  // narration line ("X catches Y square") is a spectator's third-person account —
  // both fighters already read the blow in their own first/second-person combat, so
  // echoing it back to the DEFENDER just doubles their log. Bystanders still see it.
  public actorFeed(actor: Session, roomId: string, text: string, cls?: string, toRelay = true, alsoSkip?: string): void {
    const frame = JSON.stringify(cls ? { v: 0, kind: 24913, room: roomId, text, cls } : { v: 0, kind: 24913, room: roomId, text });
    for (const s of this.sessions.values()) {
      if (s.roomId !== roomId || s.pubkey === actor.pubkey || s.pubkey === alsoSkip) continue;
      if (this.outOfWorld(s)) continue;
      try { s.ws.send(frame); } catch {}
    }
    if (toRelay) try { actor.ws.send(JSON.stringify({ v: 0, t: "fpub", room: roomId, text, fx: cls })); } catch {}
  }

  // The arena feed's third-person voice — a kill or a status proc retold for the
  // crowd, capitalized to open a line. feedKill picks by HOW the thing goes down
  // (hollow shatter / drowned sink / plain fall), or a vitals line when it earned
  // one. feedProc points a status pool either way: {a} does it, {t} takes it.
  public feedKill(killer: string, tmpl: MobTemplate, vital: boolean): string {
    if (vital) return cap(pick(FEED_VITAL).replaceAll("{k}", killer).replaceAll("{n}", tmpl.name));
    const kind = HOLLOW.has(tmpl.id) ? "hollow" : DROWNERS.has(tmpl.id) ? "drowner" : "plain";
    return cap(pick(FEED_KILL[kind]).replaceAll("{k}", killer).replaceAll("{n}", tmpl.name));
  }
  public feedProc(pool: string[], actor: string, target: string): string {
    return cap(pick(pool).replaceAll("{a}", actor).replaceAll("{t}", target)); // replaceAll: a pool line may name {t} twice
  }
  // Wanderer-on-wanderer kill, retold for the crowd (person pronouns). Named:
  // the arena feed credits the victor (rome, 2026-07-16). {k} kills, {v} falls.
  public feedPvpKill(killer: string, victim: string, vital: boolean): string {
    return cap(pick(vital ? FEED_PVP_VITAL : FEED_PVP_KILL).replaceAll("{k}", killer).replaceAll("{v}", victim));
  }

  // Outbound relay door: fire-and-forget, only when something happened —
  // an idle dungeon publishes nothing and costs nothing.
  // The dungeon's own key still signs the WORLD's lines — ambient beats, boss
  // falls, creature deaths, the linkdead body going slack. These are rare and
  // impersonal, so one npub carrying them never looks like a firehose. A
  // wanderer's OWN deeds go out under the wanderer's key instead (actorFeed).
  private relayFeed(roomTag: string, text: string): void {
    if (!this.world || !isGameKeyConfigured(this.env) || relayList(this.env).length === 0) return;
    try {
      // PLAIN TEXT LEAVES THIS BUILDING. The rarity marker is an agreement
      // between this server and its own client and NOTHING else; a relay copy
      // is read by renderers that never made that agreement (see plainNames).
      const ev = signFeedEvent(this.env, roomTag, this.world.zone, ZoneDO.plain(text));
      this.state.waitUntil(publishEvent(this.env, ev));
    } catch {}
  }

  // THE GATE'S KEY DOES NOT SPEAK FOR PLAYERS (rome, 2026-07-13).
  //
  // The dungeon's key signs what the DUNGEON says — drops, deaths, arrivals, the
  // room feed. It has no business signing a person's words. So no line a wanderer
  // speaks — in the tavern or in the dark — is published by this server at all.
  // We hand it back to the speaker's own client (frame "gpub"); THAT signs it with
  // THAT player's key, obfuscates it, and puts it on the relays itself. Kind 24914,
  // ephemeral: no relay keeps a word of it.
  //
  // The trade is worth naming plainly: the WORDS are now hidden (base64) where
  // they used to ride out in the clear, but the AUTHOR is now named (their npub
  // signs it) where the old feed said only "A wanderer". Speech stops being
  // anonymous and starts being private. That is the swap rome chose.
  public speechOut(session: Session, line: string, tag: "nomad-say" | "nomad-shout" | "nomad-gatehouse"): void {
    try {
      session.ws.send(JSON.stringify({ v: 0, t: "gpub", text: line, tag }));
    } catch {}
  }

  // A quiet word gets more than obfuscation: it gets a CIPHER. One recipient
  // means NIP-44 works cleanly (no room key, no "who was here when"), so the
  // speaker's client seals it to that npub and publishes an ephemeral kind 24915,
  // p-tagged. Only they can open it; no relay keeps it.
  public tellOut(session: Session, toPubkey: string, msg: string): void {
    try {
      session.ws.send(JSON.stringify({ v: 0, t: "tpub", to: toPubkey, text: msg }));
    } catch {}
  }

  // (The relay feed once scrubbed every player name to "a wanderer" to foil a
  // stream-sniper. That wall came down on 2026-07-15: names now ride out in the
  // clear so the world can be watched from outside — a wanderer's own deeds under
  // their own key (actorFeed), the world's lines under the dungeon's. The trade
  // is deliberate; see the arena-broadcast notes in actorFeed and public.ts.)
}

