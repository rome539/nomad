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
  journalBumpKill,
  type World,
  type MobTemplate,
  type ItemTemplate,
  type CarriedItem,
  type Cache,
  trait,
  hasTrait,
  parseTraits,
} from "./world";
import { parse, HELP_TEXT, type Command } from "./parser";
import { randInt, chance, uuid, pick } from "./rng";
import { cap, dirPhrase, nameMatches, parseOrdinal, rollGearCondition, shortName, isNight, isFullMoon, nightHuntMult } from "./zone-util";
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
import {
  TICK_MS, TICK_SIM_FLUSH_MS, IDLE_TICK_MS, HOT_WINDOW_MS, IDLE_TIMEOUT_MS, COMBAT_ROUND_MS, PLAYER_DMG_MIN, PLAYER_DMG_MAX, CRIT_CHANCE, FUMBLE_CHANCE, 
  WEAPON_WEAR, ARMOR_WEAR, SEALED_WEAR_MULT, GEAR_WORN_AT, GEAR_FAILING_AT, ARMOR_K, RUST_PER_TICK, WOUNDED_FRACTION, WOUNDED_DMG_MULT,
  WOUNDED_FUMBLE_BONUS, WOUNDED_DROP_ODDS, AUTO_EAT_FRACTION, AMBUSH_MULT, THROW_DMG_MIN, THROW_DMG_MAX,
  THROW_COOLDOWN_MS, THROW_SHATTER, THROW_SHATTER_HOLLOW, THROW_TOUGH, WEAPON_WEAR_HOLLOW, DODGE_MAX, DODGE_ZERO_AT, POISE_PER_WEIGHT, POISE_CAP, BURDEN_FREE_IRON,
  STANCE, RECKLESS_MISS, SHIELD_DRAG_FREE, SHIELD_DRAG_PER_BLOCK, GUARDED_BLOCK_BONUS, GUARDED_WOUND_ODDS, STAGGER_BONUS, PACK_CAP, PACK_FOOD_CAP, PADDED_STUN_MULT, WARDHIDE_WOUND_ODDS, BLEED_ODDS,
  HOBBLE_ODDS, HOBBLE_FLEE_MS, VITALS_PVE, VITALS_ARMOR_FULL, VITALS_THREATS,
  VITALS_HOUND, VITALS_KILLS, VITALS_KICKER, VITALS_DARK,
  SLICK_SEIZE_MULT, SLICK_BREAK_BONUS, CORRODERS, CORRODE_WEAR,
  CACHE_EMPTY_ODDS, ROCK_SMASH_ODDS, HAMMERSTONE_SMASH_ODDS,
  HAMMERSTONE_HAUNTS, STONE_GROUND_CAP, STONE_ROLL_MIN_MS, STONE_ROLL_MAX_MS, STONE_MINT_ODDS, STONE_WEAR,
  BRAND_ITEM, BRAND_HAUNTS, BRAND_GROUND_CAP, BRAND_ROLL_MIN_MS, BRAND_ROLL_MAX_MS, BRAND_MINT_ODDS,
  GEAR_ROLL_MIN_MS, GEAR_ROLL_MAX_MS, GEAR_REGROW_ODDS, RELIABLE_GEAR, STRAY_DECAY,
  MAP_ITEMS, JOURNAL_ITEM, RATE_CAPACITY, RATE_REFILL_PER_SEC, REST_REGEN_PER_TICK, FIRE_REST_REGEN_PER_TICK, COLD_REST_SKIP, FLUSH_INTERVAL_MS, SIM_STEP_MS, CATCHUP_CAP_MS,
  FOOD_LOCKBOX_STACK, FLOOR_ITEMS_BRIEF,
  CREATURE_HEAL_PER_MIN, HUNGER_PER_MIN, HUNGER_MAX, HUNGRY_AT, WANDER_MIN_MS, WANDER_MAX_MS, 
  FLEE_BELOW, FLEE_CHANCE, COMBAT_NOISE_EVERY_MS, NOISE_HEED_ODDS, DOGPILE_CAP, CROWD_CAP, LINKDEAD_MS, RAIN_NOISE_MASK,
  ARMOR_SLOTS, BLEED_TICKS, BLEED_STACK_CAP, BLEED_KILL_ODDS, BANDAGE_FRACTION, TRACE_LIFE_MS, TRACE_CAP, CARVE_CAP, ROT_MS,
  HOLLOW, GRAVE_FLESH, THIEVES, RUNNERS, BROODERS, SENTINELS, AGGRESSIVE, HOUND_WAKE_MS, HOUND_HEADS,
  WAKE_NOISE, RARITY_RANK,
  SCAVENGERS, VERMIN, DIRE_ROUSE_MS, STARVE_HUNTS_ODDS, WOUNDED_PREY_ODDS, THIEF_ROB_ODDS, BOLD_DMG_MULT, DROWNERS, SEIZE_ODDS, SEIZE_BREAK_ODDS, SEIZE_DMG_MULT, SEIZE_DROWN_ODDS, SEIZE_DROWN_FRACTION, LURKERS, REVENANTS,
  REVIVE_FRAC, RISE_LIMIT, PLAYER_HIT, WEAPON_VERBS, PIERCE_TELL, PIERCE_TELL_FLESH, BLUNT_TELL, BLUNT_TELL_BONE, BLEED_TELL, BONE_DRY_TELL, CRIT_FLOURISH, CREATURE_HIT, CREATURE_VITALS, BITERS,
  BLUNT_ARMOR_IGNORE, STAGGER_WINDOW_MS, STAGGER_STUN_BONUS, STAGGER_ARMOR_BONUS, STAGGER_CLEAVE_DMG_BONUS, STAGGER_EDGE_TELL,
  DEEP_ROOMS, AMBIENCE, ROOM_AMBIENCE, MOTES, MOTES_ODDS, AMBIENT_COOLDOWN_MS, AMBIENT_ODDS, RECONNECT_GRACE_MS, SEAMLESS_RECONNECT_MS,
  GATEHOUSE_AMBIENT_COOLDOWN_MS, GATEHOUSE_AMBIENT_ODDS,
  DEEP_HEART, DEEP_DOOR_KEY, SURFACE_INTERVAL_MS, HEART_ROT_SEC, ALTAR_ROOMS,
  SIM_RADIUS, SLOW_ECOLOGY_MS, ESCAPE_TMPL,
  LB_GENRES, LB_BOSS_PTS, LB_PVP_PTS,
  TRAIT_POOL, TRAIT_ADJ, TRAIT_ROLL_ODDS, ROLLED_TELL, KEEN_BARE_BLEED_ODDS, WEAPON_CLASS_TRAIT, playerBleedOdds,
  DARK_ROOMS, OUTDOOR_ROOMS, CURE_RECIPES, SMOKEHOUSE_ROOM, FOOD_KEEPS, SCRAP_ID, SMELT_SCRAP_PER_IRON,
  SMOKE_TORCH_ROLL_MIN_MS, SMOKE_TORCH_ROLL_MAX_MS, SMOKE_TORCH_MINT_ODDS, SMOKE_TORCH_GROUND_CAP,
  CARRION_ROLL_MIN_MS, CARRION_ROLL_MAX_MS, CARRION_MINT_ODDS, CORPSE_TRACES,
  LANTERN_ITEM, TORCH_ITEM, PACK_TORCH_CAP, PACK_DRESSING_CAP,
  FEED_KILL, FEED_VITAL, FEED_STUN, FEED_BLEED, FEED_HOBBLE, FEED_PVP_KILL, FEED_PVP_VITAL, FEED_REST_CAUGHT
} from "./zone-data";

export class ZoneDO implements DurableObject {
  public world: World | null = null;
  public sessions = new Map<string, Session>(); // pubkey -> session
  // Open player-to-player trades (trade.ts) — dealId -> Deal. In-memory only,
  // same as `buying`: a DO wake never restores one, and it needs no D1 row of
  // its own (settlement is the only part that touches D1, and it's atomic).
  public deals = new Map<string, trade.Deal>();
  // player_items rowIds a settlement (trade.ts) currently has mid-flight to a
  // new owner — the DEATH cleanup below (clearCarriedInventory) must not
  // sweep these out from under the pending UPDATE. Set right before that
  // await, cleared right after, always in trade.ts's settleDeal.
  public tradeLocked = new Set<string>();
  private leftAt = new Map<string, number>(); // pubkey -> ms it last disconnected (a quick return is a reconnect, not an arrival)
  public creatures = new Map<string, Creature>();
  public ground = new Map<string, string[]>(); // roomId -> item template ids
  // Items on the floor that carry per-instance state a bare template id can't:
  // a dropped journal keeps the id its pages are keyed to, so whoever picks it
  // up inherits the logs. Everything else stays in the plain `ground` above.
  public groundInstances = new Map<string, GroundInstance[]>(); // public: chips.ts reads the floor for `get` chips
  public regrow: Regrow[] = [];
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
  public bloodOn = new Map<string, number[]>(); // pubkey -> pvp-kill times; the evidence walks around on the murderer (pvp.ts)
  // ms the world next mints a hammerstone into a random haunt (corpse-key
  // pattern — no farmable spot). 0 = schedule on first tick.
  private nextStoneAt = 0;
  private nextBrandAt = 0;
  private nextSmokeTorchAt = 0; // the world next rolls a plain torch into the smokehouse (dice, capped — a find, not a refill)
  private nextCarrionAt = 0; // the world next rolls a carcass into a random deep room (dice — feeds the pale hunters, one body at a time)
  public traces = new Map<string, Trace[]>();
  public rot: RotEntry[] = [];
  private placedSpawns = new Set<string>(); // ground spawns already laid once
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
  // map's territory, forever (gate.shallowRing).
  public wallMarks = new Set<string>();
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
  private savedAt = 0;
  private lastFlushAt = 0; // last time live sessions' hp/room were flushed to D1 (restart-durability)

  constructor(
    private state: DurableObjectState,
    public env: Env,
  ) {}

  // Four gates ring the Door; you wake at a random one, so no death sends you
  // back to a route you already know cold. Falls back to the canonical gate.
  private randomGate(): string {
    const world = this.world;
    if (!world) return "gate";
    const gates = Array.from(world.entryRooms);
    return gates[randInt(0, gates.length - 1)] ?? world.entryRoom;
  }

  // All-pairs room distances (BFS over exits, ~49 rooms — trivial), and the
  // variant→base bloodline map. Both built once at init; territory, the dark
  // mouths, and family-cap counting all lean on them.
  private roomDists = new Map<string, Map<string, number>>();
  public variantBase = new Map<string, string>();

  private buildWorldMaps(world: World): void {
    for (const src of world.rooms.keys()) {
      const dist = new Map<string, number>([[src, 0]]);
      const queue = [src];
      while (queue.length) {
        const at = queue.shift()!;
        const d = dist.get(at)!;
        for (const e of world.exits.get(at) ?? []) {
          if (dist.has(e.to_room)) continue;
          dist.set(e.to_room, d + 1);
          queue.push(e.to_room);
        }
      }
      this.roomDists.set(src, dist);
    }
    for (const v of world.mobVariants) this.variantBase.set(v.variantId, v.baseId);
  }

  public roomDist(a: string, b: string): number {
    return this.roomDists.get(a)?.get(b) ?? Number.POSITIVE_INFINITY;
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
  private liveRooms(): Set<string> | null {
    if (!Number.isFinite(SIM_RADIUS)) return null;
    const live = new Set<string>();
    for (const s of this.sessions.values()) {
      const dists = this.roomDists.get(s.roomId);
      if (!dists) { live.add(s.roomId); continue; }
      for (const [rid, d] of dists) if (d <= SIM_RADIUS) live.add(rid);
    }
    return live;
  }



  private async init(zone: string): Promise<World> {
    if (this.world) return this.world;
    const world = await loadWorld(this.env.DB, zone);
    this.world = world;
    this.buildWorldMaps(world);

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
      this.arrivals = new Map(Object.entries(saved.arrivals));
      this.openDoors = new Set(saved.openDoors);
      this.doorCloseAt = new Map(Object.entries(saved.doorCloseAt ?? {}));
      this.fenceOut = new Map(Object.entries(saved.fenceOut ?? {}));
      this.bloodOn = new Map(Object.entries(saved.bloodOn ?? {}));
      this.nextStoneAt = saved.nextStoneAt ?? 0;
      this.nextBrandAt = saved.nextBrandAt ?? 0;
      this.nextSmokeTorchAt = saved.nextSmokeTorchAt ?? 0;
      this.nextCarrionAt = saved.nextCarrionAt ?? 0;
      this.traces = new Map(Object.entries(saved.traces ?? {}));
      this.rot = saved.rot ?? [];
      this.placedSpawns = new Set(saved.placedSpawns ?? []);
      this.groundCond = new Map(Object.entries(saved.groundCond ?? {}));
      this.groundTorch = new Map(Object.entries(saved.groundTorch ?? {}));
      this.groundLore = new Map(Object.entries(saved.groundLore ?? {}));
      this.groundRolled = new Map(Object.entries(saved.groundRolled ?? {}));
      this.groundHeart = new Map(Object.entries(saved.groundHeart ?? {}));
      this.inGatehouse = new Set(saved.inGatehouse ?? []);
      this.wallMarks = new Set(saved.wallMarks ?? []);
      this.cacheSpent = new Map(Object.entries(saved.cacheSpent ?? {}));
      this.cacheRoom = new Map(Object.entries(saved.cacheRoom ?? {}));
      this.nextSurfaceAt = saved.nextSurfaceAt ?? 0;
      this.events = new Map(Object.entries(saved.events ?? {}));
      this.fishStock = new Map(Object.entries(saved.fishStock ?? {}));
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
          if (world.itemTemplates.get(g.item_id)?.edible && !FOOD_KEEPS.has(g.item_id)) {
            this.rot.push({ itemId: g.item_id, roomId: g.room_id, at: Date.now() + ROT_MS });
          }
        }
        this.placedSpawns.add(key);
        addedSpawn = true;
      }
      if (addedSpawn) await this.persist();
    } else {
      // First light: seed the world from D1 templates.
      const now = Date.now();
      this.creatures.clear();
      for (const spawn of world.mobSpawns) {
        const base = world.mobTemplates.get(spawn.template_id);
        if (!base) continue;
        // Even at first light, rare blood: a den is usually the ordinary
        // version, once in a while the mean cousin.
        const tmpl = ai.rollBloodline(this, base, spawn.room_id);
        this.creatures.set(spawn.id, {
          id: spawn.id,
          templateId: tmpl.id,
          roomId: spawn.room_id,
          hp: tmpl.max_hp,
          hunger: randInt(0, HUNGRY_AT - 10),
          grudges: [],
          nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
          target: null,
          carries: this.rollCarry(tmpl),
          hidden: LURKERS.has(tmpl.id) || undefined,
          home: spawn.room_id,
        });
      }
      this.ground.clear();
      for (const g of world.groundSpawns) {
        this.ground.set(g.room_id, [...(this.ground.get(g.room_id) ?? []), g.item_id]);
        this.placedSpawns.add(`${g.item_id}@${g.room_id}`);
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

    while (t < now) {
      const step = Math.min(SIM_STEP_MS, now - t);
      t += step;
      const mins = step / 60_000;

      for (const c of this.creatures.values()) {
        const tmpl = world.mobTemplates.get(c.templateId)!;
        c.target = null;
        c.hp = Math.min(tmpl.max_hp, c.hp + CREATURE_HEAL_PER_MIN * mins);
        if (!HOLLOW.has(c.templateId)) {
          c.hunger = Math.min(HUNGER_MAX, c.hunger + HUNGER_PER_MIN * mins);
          if (c.hunger >= HUNGRY_AT) ai.creatureEatsHere(this, c, true, t);
        }
        // Same "stays put" rule as the live tick: the drowned holds its water and
        // brooders keep their nest, so the offline sim can't drift them out of
        // their dens and pile three grapplers into one room while no one watches.
        if (c.nextWanderAt <= t && !tmpl.is_boss && c.hp >= tmpl.max_hp * FLEE_BELOW
            && !BROODERS.has(c.templateId) && !DROWNERS.has(c.templateId) && !SENTINELS.has(c.templateId) && !AGGRESSIVE.has(c.templateId)) {
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
    this.pruneTraces(now);
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
      if (!HOLLOW.has(c.templateId)) c.hunger = Math.min(HUNGER_MAX, c.hunger + HUNGER_PER_MIN * mins);
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
      const hunted = await ai.predation(this, c, now);
      if (!hunted && c.nextWanderAt <= now && !tmpl.is_boss && c.hp >= tmpl.max_hp * FLEE_BELOW
          && !BROODERS.has(c.templateId) && !DROWNERS.has(c.templateId) && !SENTINELS.has(c.templateId) && !AGGRESSIVE.has(c.templateId)) {
        await ai.creatureMoves(this, c, now, "wander", true);
      }
    }
  }

  public async persist(): Promise<void> {
    this.savedAt = Date.now();
    const state: SimState = {
      savedAt: this.savedAt,
      creatures: [...this.creatures.values()],
      ground: Object.fromEntries(this.ground),
      groundInstances: Object.fromEntries(this.groundInstances),
      regrow: this.regrow,
      arrivals: Object.fromEntries(this.arrivals),
      openDoors: [...this.openDoors],
      doorCloseAt: Object.fromEntries(this.doorCloseAt),
      fenceOut: Object.fromEntries(this.fenceOut),
      bloodOn: Object.fromEntries(this.bloodOn),
      nextStoneAt: this.nextStoneAt,
      nextBrandAt: this.nextBrandAt,
      nextSmokeTorchAt: this.nextSmokeTorchAt,
      nextCarrionAt: this.nextCarrionAt,
      traces: Object.fromEntries(this.traces),
      rot: this.rot,
      placedSpawns: [...this.placedSpawns],
      groundCond: Object.fromEntries(this.groundCond),
      groundTorch: Object.fromEntries(this.groundTorch),
      groundLore: Object.fromEntries(this.groundLore),
      groundRolled: Object.fromEntries(this.groundRolled),
      groundHeart: Object.fromEntries(this.groundHeart),
      inGatehouse: [...this.inGatehouse],
      wallMarks: [...this.wallMarks],
      cacheSpent: Object.fromEntries(this.cacheSpent),
      cacheRoom: Object.fromEntries(this.cacheRoom),
      nextSurfaceAt: this.nextSurfaceAt,
      events: Object.fromEntries(this.events),
      fishStock: Object.fromEntries(this.fishStock),
    };
    // Rows, not the blob (simstore.ts): only what changed since the last save
    // is written, in one transaction. The 128KiB one-value ceiling is gone.
    simstore.saveSim(this.state.storage, state, this.sim);
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
    this.arrivals.clear();
    this.openDoors.clear();
    this.doorCloseAt.clear();
    this.fenceOut.clear();
    this.bloodOn.clear();
    this.nextStoneAt = 0;
    this.nextBrandAt = 0;
    this.nextSmokeTorchAt = 0;
    this.nextCarrionAt = 0;
    this.traces.clear();
    this.rot = [];
    this.placedSpawns.clear();
    this.groundCond.clear();
    this.groundTorch.clear();
    this.groundLore.clear();
    this.groundRolled.clear();
    this.groundHeart.clear();
    this.wallMarks.clear(); // a fresh world has fresh plaster — old room ids mean nothing here
    this.cacheSpent.clear();
    this.cacheRoom.clear();
    this.nextSurfaceAt = 0;
    this.events.clear(); // a fresh world gets a fresh sky
    this.fishStock.clear();
    await this.init(zone); // "sim" is gone now → seeds the world fresh at first light
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
    const fresh = new URL(req.url).searchParams.get("fresh") === "1";

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
    const linkdead = (() => {
      const p = this.sessions.get(pubkey);
      return p && p.linkdeadUntil ? p : null;
    })();
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
    server.serializeAttachment({ pubkey, la: Date.now() });
    // Answer pings without waking the DO — keeps parked sockets warm for cheap.
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));

    const session = this.buildSession(server, row, items);
    // Step back into the still-standing body: everything the fight did to it
    // while the eyes were empty carries over. buildSession's D1 read would
    // otherwise revert hp/wounds to the last flush — a free heal for loggers.
    if (linkdead) {
      session.hp = linkdead.hp;
      session.roomId = linkdead.roomId;
      session.target = linkdead.target;
      session.stance = linkdead.stance;
      session.bleedTicks = linkdead.bleedTicks;
      session.bleedDmg = linkdead.bleedDmg;
      session.stunned = linkdead.stunned;
      session.hobbled = linkdead.hobbled;
      session.limpingSince = linkdead.limpingSince;
      session.litUntil = linkdead.litUntil;
      session.litSource = linkdead.litSource;
      session.torchWarned = linkdead.torchWarned;
      session.linkdeadUntil = undefined;
    }
    this.sessions.set(pubkey, session);
    this.lastCommandAt = Date.now(); // an arrival is activity — the world beats fast for fresh footsteps
    // buildSession never carries a dealId across — any deal this player was
    // in is already cancelled server-side (onLeave's cancelDealForSession ran
    // when the old socket dropped, though that closeFrame died with it,
    // unsent). The client doesn't know that: force its swap UI shut so a
    // reweave never leaves "wave it off" stuck talking to nothing.
    trade.forceCloseSwapUI(session);

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
            "You wake at a broken gate with keys in your pocket and no memory of the road.",
            "This dungeon is shared and it is alive: the other names are real people,",
            "and the creatures keep living whether or not anyone is watching.",
            "Wounds do not close on their own — rest, or eat.",
            "The suggestions under the input line are real commands — tap one, or type it.",
            `Pick what the dungeon calls you with: name <yourname>`,
            "And mind your keys ('keys' shows them): save the secret somewhere safe —",
            "it is the only way back to this wanderer from another door or device.",
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
      session.away = true;
      session.stepText = true;
      session.visited.add(session.roomId);
      // The rebuilt session has no open stance (sorting/trading/forging default
      // false), but the client may still be showing a modal it had open when the
      // socket dropped. Dismiss it so the view matches the restored state — else
      // a stale bench frame lingers over the gatehouse until the next click.
      try { session.ws.send(JSON.stringify({ v: 0, t: "bench", open: false })); } catch {}
      this.sendStatus(session);
      if (!seamless) this.send(session, gate.describeGatehouse(this, session));
      this.sendCtx(session);
      await this.persist();
      await this.ensureAlarm();
      return new Response(null, { status: 101, webSocket: client });
    }
    // Either way, mark the wake room known and show it: full on a real arrival,
    // brief on a re-weave (you never left). Status goes first so the client
    // knows the room's name in time to paint it gold.
    session.visited.add(session.roomId);
    this.sendStatus(session);
    if (!seamless) this.send(session, this.describeRoom(session, !reconnecting));
    this.sendCtx(session);
    await ai.provokeGrudges(this, session, false); // reconnect grace: no free first strike
    await this.persist();
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
  private async trySavePlayer(pubkey: string, roomId: string, hp: number): Promise<void> {
    try {
      await savePlayer(this.env.DB, pubkey, roomId, hp);
    } catch (e) {
      console.error(`savePlayer failed for ${pubkey}, will retry next flush:`, e);
    }
  }

  private async onLeave(session: Session): Promise<void> {
    if (this.sessions.get(session.pubkey) !== session) return; // displaced, already handled
    // Whichever branch below runs, this player isn't reading the wire anymore
    // — a deal they had open can't wait for them (the counterparty needs to
    // know now, not whenever they might reconnect).
    trade.cancelDealForSession(this, session);
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
      lastAmbientAt: Date.now(),
      lastActiveAt: Date.now(), // a fresh body is present; hydrateSessions overwrites this from the socket's `la` for a rebuilt one
    };
  }

  // The socket's attachment: the owner's key, stashed at accept-time, plus
  // `la` — the idle stamp (see Session.lastActiveAt).
  private wsAttachment(ws: WebSocket): { pubkey?: string; la?: number } | null {
    try {
      return ws.deserializeAttachment() as { pubkey?: string; la?: number } | null;
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
      // buildSession stamps lastActiveAt = now, which would read a long-parked
      // socket as JUST arrived and dodge the idle sweep across every eviction —
      // the true stamp rides the socket.
      const la = this.wsAttachment(ws)?.la;
      rebuilt.lastActiveAt = typeof la === "number" ? la : Date.now();
      this.sessions.set(pubkey, rebuilt);
      // A cold wake means the WHOLE DO reset — z.deals is gone, and this
      // fresh session carries no dealId — but the client's browser doesn't
      // know that and may still be showing a swap modal/popup with dead
      // buttons. Force it closed so a reweave never strands someone unable
      // to wave off a trade that no longer exists server-side.
      trade.forceCloseSwapUI(rebuilt);
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
    const isSwap = frame?.t === "swap";
    if (!isBench && !isTrade && !isForge && !isSwap && (frame?.t !== "cmd" || typeof frame.text !== "string")) return;

    // Token bucket per pubkey — castr's daily-cast pattern, compressed.
    const now = Date.now();
    // Presence: any real frame re-stamps the player and heats the world. The
    // stamp rides the socket too, so a hibernation rebuild keeps it.
    session.lastActiveAt = now;
    this.lastCommandAt = now;
    try { session.ws.serializeAttachment({ pubkey: session.pubkey, la: now }); } catch {}
    session.tokens = Math.min(
      RATE_CAPACITY,
      session.tokens + ((now - session.tokensAt) / 1000) * RATE_REFILL_PER_SEC,
    );
    session.tokensAt = now;
    if (session.tokens < 1) {
      if (!isBench && !isTrade && !isForge && !isSwap) this.send(session, "You're moving faster than the dungeon can watch. Slow down.");
      return;
    }
    session.tokens -= 1;

    // The gatehouse bench (storage modal) and the keeper's hatch (trade
    // modal): each its own little protocol.
    if (isBench) return gate.handleBench(this, session, frame);
    if (isTrade) return gate.handleTrade(this, session, frame);
    if (isForge) return gate.handleForge(this, session, frame);
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
    if (session.resting && (cmd.verb === "go" || cmd.verb === "attack" || cmd.verb === "throw" || cmd.verb === "get" || cmd.verb === "drop" || cmd.verb === "burn")) {
      session.resting = false;
      this.send(session, "You rise.");
      this.sendStatus(session); // the 'resting' pill must clear the instant you rise, not linger until the first combat round pushes the next status
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
      case "buy": return gate.cmdBuy(this, session, cmd.arg);
      case "offer": return gate.cmdOffer(this, session, cmd.arg);
      case "inventory": return verbs.cmdInventory(this, session);
      case "who": return verbs.cmdWho(this, session);
      case "census": return verbs.cmdCensus(this, session);
      case "name": return verbs.cmdName(this, session, cmd.arg);
      case "rest": return verbs.cmdRest(this, session);
      case "eat": return verbs.cmdEat(this, session, cmd.arg);
      case "bandage": return verbs.cmdBandage(this, session, cmd.arg);
      case "light": return light.cmdLight(this, session, cmd.arg);
      case "sheet": return verbs.cmdSheet(this, session);
      case "leaderboard": return verbs.cmdLeaderboard(this, session);
      case "carve": return verbs.cmdCarve(this, session, cmd.arg);
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
      case "enter": return gate.enterGatehouse(this, session);
      case "exit": return this.leaveGatehouse(session);
      case "tell": return gate.cmdTell(this, session, cmd.arg);
      case "deal": return trade.cmdDeal(this, session, cmd.arg);
      case "smoke": return verbs.cmdSmoke(this, session, cmd.arg);
      case "cure": return verbs.cmdCure(this, session, cmd.arg);
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
    return DARK_ROOMS.has(roomId) || events.gloamed(this, roomId) || (OUTDOOR_ROOMS.has(roomId) && isNight() && !isFullMoon());
  }

  // A torch burning on the FLOOR (dropped by a hand, or fallen from a dead one):
  // while it lasts it lights the room for EVERYONE standing in it — light on the
  // stone is shared, unlike the torch you carry — and it's an open flame like any
  // other (fire-fear breaks from it, a lurker can't spring in its glow). It burns
  // its remaining life down and guts out (tickLights), and the dark returns.
  public roomLit(roomId: string): boolean {
    const until = this.groundTorch.get(roomId);
    return !!until && Date.now() < until;
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

  private async cmdAttack(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Attack what?");
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
    // Initiative: strike something that hasn't marked you — no fight on, no
    // grudge held — and the first blow lands heavy, before it can answer.
    // A SLEEPER is unaware by definition (grudge or not: it's asleep) — the
    // one heavy blow is what sleep grants, and the blow ends the sleep. Never
    // a coup de grace: it wakes swinging (the sentinel rouse law, reused).
    const wasAsleep = !!creature.asleep;
    const unaware = wasAsleep || (!creature.target && !ai.remembers(this, creature, session.pubkey, Date.now()));
    creature.asleep = false;
    creature.sleepUntil = undefined;
    session.target = creature.id;
    creature.hidden = false; // a lurker you've struck is unseen no longer — reveal it (room, chip, study)
    if (SENTINELS.has(creature.templateId)) creature.wakeUntil = Date.now() + HOUND_WAKE_MS; // a blow rouses a sleeping guardian
    this.rousePack(session, creature); // hyenas: strike one and the pack turns on you
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
      dmg = Math.max(1, dmg - Math.max(0, tmpl.armor - this.armorIgnore(weapon)));
      creature.hp -= dmg;
      this.markHurt(creature, tmpl, session.pubkey);
      ai.addGrudge(this, creature, session.pubkey);
      this.actorFeed(session, session.roomId, wasAsleep
        ? `${session.name} falls on ${tmpl.name} in its sleep!`
        : `${session.name} falls on ${tmpl.name} without warning!`);
      this.combatNoise(session.roomId);
      if (weapon) await this.wear(session, weapon.carried, weapon.tmpl, HOLLOW.has(tmpl.id) ? WEAPON_WEAR_HOLLOW : WEAPON_WEAR);
      if (creature.hp <= 0) {
        this.send(session, wasAsleep
          ? `You fall on ${tmpl.name} in its sleep — one heavy blow, for ${dmg}. It never wakes.`
          : `You fall on ${tmpl.name} before it marks you — one heavy blow, for ${dmg}.`, "dmgout big");
        await this.onCreatureDeath(session, creature, tmpl);
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

    // One throw per round: the arm owes its follow-through. (Without this, a
    // recycled rock out-damages a graveblade — the machine-gun, not the sling.)
    const nowMs = Date.now();
    if (nowMs < session.nextThrowAt) {
      return this.send(session, "Your arm is still following through — a beat, then throw again.");
    }
    session.nextThrowAt = nowMs + THROW_COOLDOWN_MS;

    // A sleeper never sees it coming, grudge or no; the impact ends the sleep.
    const unaware = !!creature.asleep || (!creature.target && !ai.remembers(this, creature, session.pubkey, Date.now()));
    creature.asleep = false;
    creature.sleepUntil = undefined;
    creature.hidden = false; // hurling at a lurker outs it too — reveal it (room, chip, study)
    if (SENTINELS.has(creature.templateId)) creature.wakeUntil = Date.now() + HOUND_WAKE_MS; // a thrown stone rouses a sleeping guardian too
    this.rousePack(session, creature); // hyenas: a thrown blow turns the pack too
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
      this.send(session, `Your throw sails wide — ${itmpl.name} cracks against the stone. ${cap(tmpl.name)} turns on you.`);
      this.actorFeed(session, session.roomId, `${session.name} hurls ${itmpl.name} — and misses.`);
      this.combatNoise(session.roomId);
      this.refreshRoomCtx(session.roomId);
      await this.persist();
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
    dmg = Math.max(1, dmg - tmpl.armor);

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
    this.markHurt(creature, tmpl, session.pubkey);
    ai.addGrudge(this, creature, session.pubkey);
    session.target = creature.id;
    this.actorFeed(session, session.roomId, `${session.name} hurls ${itmpl.name} at ${tmpl.name}!`);
    this.combatNoise(session.roomId);
    const landing = shattered ? " It shatters on impact." : " It lands on the stones.";
    if (creature.hp > 0) {
      if (!creature.target) creature.target = session.pubkey;
      this.send(session, `You hurl ${itmpl.name} — it strikes ${tmpl.name} for ${dmg}${flourish} (${this.condition(creature)})${landing}`);
      // A blunt throw — a rock off the skull — can ring it senseless for a beat.
      // Same rule as a melee stun: not the boss, and no chaining a reeling thing.
      if (itmpl.stun > 0 && !tmpl.is_boss && !creature.stunned && chance(itmpl.stun)) {
        creature.stunned = true;
        this.send(session, `${cap(tmpl.name)} reels, stunned.`, "stun");
        this.roomFeed(session.roomId, `${cap(tmpl.name)} staggers where it stands.`, session.pubkey, false); // local: mob reaction
      }
      if (tmpl.is_boss) ai.bossPhase(this, creature, tmpl, session);
    } else {
      this.send(session, `You hurl ${itmpl.name} — it strikes ${tmpl.name} for ${dmg}${flourish}${landing}`);
      await this.onCreatureDeath(session, creature, tmpl);
    }
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }

  // A throw with no foe to hit: hurl something hard to make NOISE. It clatters
  // off the stone, lies where it falls (yours to take back), and the sound
  // carries — heard next door and drawing the idle curious your way. It can also
  // rouse a lurker lying in wait right here, so it's a lure that can bite back.
  private async throwForNoise(session: Session, carried: CarriedItem, itmpl: ItemTemplate): Promise<void> {
    if (itmpl.edible) {
      return this.send(session, `${cap(itmpl.name)} would land with a soft, wet thud — too quiet to draw anything. Throw something hard.`);
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
    this.send(session, `You hurl ${itmpl.name} into the dark. It cracks and clatters off the stone — the sound carries.`);
    this.roomFeed(session.roomId, `${session.name} sends ${itmpl.name} clattering across the room.`, session.pubkey, false);
    // The clatter: players next door hear it (WS-only, no relay flood), the idle
    // curious drift in to look, and any lurker here may drop on the noise.
    this.roomSound(session.roomId, "Something clatters {dir}.");
    this.creatureNoise(session.roomId);
    await ai.wakeListeners(this, session, session.roomId, WAKE_NOISE, "drops from the dark, roused by the clatter!", true);
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }




  // A locked cache: spend the right key to open it, take what it holds. The key
  // is consumed and the box springs empty, refilling on a slow clock. A key is
  // never wasted — a spent lock always gives up at least one thing.
  private async cmdUnlock(session: Session, arg: string): Promise<void> {
    const world = this.world!;
    const here = world.caches.filter((c) => this.cacheRoomId(c) === session.roomId);
    if (!here.length) return this.send(session, "There's nothing here to unlock.");
    const cache = (arg ? here.find((c) => nameMatches(c.name, arg)) : null) ?? here[0];
    const keyT = world.itemTemplates.get(cache.keyItem);
    if (!this.cacheLocked(cache)) {
      return this.send(session, `${cap(cache.name)} hangs open and empty. Give it time to be worth forcing again.`);
    }
    const key = session.items.find((c) => c.itemId === cache.keyItem);
    if (!key) {
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
      // Spend the key and start the refill clock.
      session.items.splice(session.items.indexOf(key), 1);
      await removeItemRow(this.env.DB, key.rowId);
      this.cacheSpent.set(cache.id, Date.now() + cache.refillSecs * 1000);
      this.placeCache(cache); // looted: it will refill somewhere new in its tier (hidden here until then)
      this.send(session, `You work ${keyT?.name ?? "the key"} into the lock. It gives with a groan, and ${cache.name} swings open.`, "unlock");
      this.roomFeed(session.roomId, `${session.name} forces ${cache.name} open.`, session.pubkey, false);
    }
    // Now and then the box is a lie: forced open on nothing. The key's already
    // spent and the refill clock's already running, so a dud costs you the same
    // as a haul — that's the sting. The reliquary is exempt: it takes a boss and
    // the black key to stand here, and a dud would be too bitter for that price.
    if (cache.keyItem !== "reliquary-key" && chance(CACHE_EMPTY_ODDS)) {
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
        this.send(session, `Inside: ${item.name}.${this.itemStat(item)} [${item.rarity}] ${this.lootSuffix(item)}`);
      } else {
        this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), item.id]);
        this.stampFresh(session.roomId, item.id);
        if (item.slot !== "") this.groundCond.set(`${item.id}@${session.roomId}`, rollGearCondition(item.slot, true));
        if (rolled) this.groundRolled.set(`${item.id}@${session.roomId}`, rolled);
        this.send(session, `Inside: ${item.name}.${this.itemStat(item)} [${item.rarity}] — but your pack is full, so it falls at your feet.`);
      }
    }
    this.refreshRoomCtx(session.roomId);
    this.sendCtx(session);
    await this.persist();
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
    if (!this.outOfWorld(session)) { session.gateSmeltable = false; session.gateCureName = undefined; return; }
    const pools = await this.gatePools(session);
    session.gateSmeltable = this.countLooseIn(pools, SCRAP_ID) >= SMELT_SCRAP_PER_IRON;
    // Name a curable raw (from ANY pool — the cure verb hangs it from pack,
    // lockbox or vault alike) so the chip can be 'cure <meat>' and actually hang
    // it on click, not bare 'cure' that only reads the racks. Undefined = nothing
    // to hang.
    const raw = pools.flat().find((c) => CURE_RECIPES[c.itemId] && c.serial === null);
    session.gateCureName = raw ? shortName(this.world!.itemTemplates.get(raw.itemId)!.name) : undefined;
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
  public enterStep(session: Session, mode: "trading" | "forging" | "sorting" | "gatehouse"): void {
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
      session.sorting = mode === "sorting";
      session.stepText = true;
      return;
    }
    session.away = true;
    session.stepText = true;
    session.trading = mode === "trading";
    session.forging = mode === "forging";
    session.sorting = mode === "sorting";
    // Rest survives a typed step-out (inventory/barter/forge) — healing pauses
    // while away, resumes when you 'look' back into the world.
    session.target = null;
    // At a gate you step clean out of sight; sorting mid-dungeon (lockbox only)
    // you crouch in the open, still in reach. (trading/forging are gate-only.)
    if (atGate) {
      this.inGatehouse.add(session.pubkey); // you are INSIDE now, and a dropped socket won't undo it
      for (const c of this.creatures.values()) {
        if (c.target === session.pubkey) c.target = null;
      }
    }
    const msg = mode === "trading"
      ? `${session.name} steps up to the keeper's hatch.`
      : mode === "forging"
        ? `${session.name} steps to the bench and stirs the brazier to life.`
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
    if (!this.outOfWorld(session)) return this.send(session, "You're already out in the world.");
    session.resting = false; // the door wakes you — nobody sleepwalks into the dungeon
    gate.gatehouseFeed(this, `${session.name} shoulders the door open and goes back out.`, session.pubkey, "who");
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
      && !session.trading && !session.forging && !session.sorting;
    const frame = session.trading ? "trade" : session.forging ? "forge" : "bench";
    session.away = false;
    this.inGatehouse.delete(session.pubkey); // out through the door — the only way out
    session.trading = false;
    session.forging = false;
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
    if (hasTrait(t, "quiet")) bits.push("quiet");
    if (hasTrait(t, "slick")) bits.push("slick");
    if (hasTrait(t, "strapped")) bits.push("strapped-down");
    const spike = trait(t, "thorns");
    if (spike) bits.push(`spiked ${spike}`);
    if (hasTrait(t, "riposte")) bits.push("a caught blow answers — bleeds the attacker");
    if (hasTrait(t, "mancatcher")) bits.push("what it holds cannot flee");
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
    return this.hasRoom(session.items, itemId, PACK_CAP, "pack");
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
  public openWound(victim: Session, tmpl: MobTemplate): void {
    if (!(tmpl.bleed > 0)) return; // undefined/NaN (unmigrated column) or 0: no wound — never leak NaN
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
    victim.bleedTicks = BLEED_TICKS;
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
    this.send(victim, `${cap(tmpl.name)} rakes your leg out from under you — it won't carry you clean now. (rest to mend it)`, "dmgin");
    this.sendStatus(victim); // light the 'hobbled' HUD pill the instant the leg goes — same fix as stun/rest
    this.actorFeed(victim, victim.roomId, this.feedProc(FEED_HOBBLE, tmpl.name, victim.name), "hobble");
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
  public regionOf(roomId: string): "gate" | "deep" | "upper" {
    return this.world!.entryRooms.has(roomId) ? "gate" : DEEP_ROOMS.has(roomId) ? "deep" : "upper";
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
      // minus the "days under this name" clause — then just #nomad.
      const text = verbs.ledgerLines(session, false).join("\n") + "\n\n#nomad";
      const dpk = gamePubkey(this.env);
      const atag = dpk ? `31573:${dpk}:${session.pubkey}` : "";
      try { session.ws.send(JSON.stringify({ v: 0, t: "npost", text, atag })); } catch {}
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
    // A cold start with a pending alarm rebuilds the world first.
    if (!this.world) await this.init("door");
    // The alarm can wake a hibernated DO whose sessions are gone but whose
    // sockets live on — rebuild them so the tick sees the connected players
    // (and doesn't mistake a full world for an empty one).
    await this.hydrateSessions();
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

    // Players swing first — the living get initiative. You FOCUS one foe and
    // turn to the next the moment it falls (or the moment something new is on
    // you) — never idle, but a swarm trades several-for-one against you: they
    // all hit back, you answer one at a time. Gear bends the rule: fast steel
    // swings more than once a round, and sweeping steel drags through a crowd.
    if (combatRound) for (const session of this.sessions.values()) {
      const foes: Creature[] = [];
      for (const c of this.creatures.values()) {
        if (c.roomId !== session.roomId) continue;
        if (c.id === session.target || c.target === session.pubkey) foes.push(c);
      }
      if (foes.length === 0) {
        if (session.target) session.target = null;
        // The daze wears off outside the fight too — fled or left standing
        // alone, the flag must not stick to the HUD until a refresh.
        if (session.stunned && !session.pvpTarget) { session.stunned = false; this.sendStatus(session); }
        session.openedHeavy = false; // a heavy-opener that never resolved (fled, or the foe fell to something else) must not eat a swing in the next fight
        continue;
      }
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
            if (chance(CRIT_CHANCE)) {
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
            const pierced = pierceVal > 0 && tmpl.armor > 0; // the point beat armor
            const crushed = bluntVal > 0 && pierceVal === 0 && tmpl.armor > 0; // the weight beat armor
            const opened = edgeVal > 0 && pierceVal === 0 && bluntVal === 0 && tmpl.armor > 0; // the stagger bonus, edge's one-off
            dmg = Math.max(1, dmg - Math.max(0, tmpl.armor - Math.max(pierceVal, bluntVal, edgeVal)));
            creature.hp -= dmg;
            this.markHurt(creature, tmpl, session.pubkey);
            // The vitals lottery, PLAYER side — a lucky killing blow on a landed
            // hit. Bosses are the designed wall (never). The three-hound falls this
            // way ONLY to a piercing weapon, and rarely (VITALS_HOUND). Everything
            // else: the base rate, the mob's own armor buying it down. Drops to 0 so
            // the kill runs the normal death path, with a weapon-aware killing line.
            let pvitals = false;
            if (creature.hp > 0 && !tmpl.is_boss) {
              pvitals = creature.templateId === "three-hound"
                // the sentinel only falls to a point driven through the throat
                ? hasTrait(weapon?.tmpl, "piercing") && chance(VITALS_HOUND)
                : HOLLOW.has(creature.templateId) && !GRAVE_FLESH.has(creature.templateId)
                // no throat to open, no heart to pierce — only a blunt blow that
                // shatters the skull ends a hollow thing outright. The wights are
                // the exception: dry flesh doesn't bleed, but it's still a BODY —
                // any weapon can find the killing spot on a corpse (GRAVE_FLESH).
                ? (weapon?.tmpl.stun ?? 0) > 0 && this.vitalsLottery(tmpl.armor, VITALS_PVE)
                : this.vitalsLottery(tmpl.armor, VITALS_PVE);
              if (pvitals) creature.hp = 0;
            }
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
              const freshBleed = !!(weapon && effBleed > 0 && !hollow && !creature.bleedTicks);
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
              if (weapon && weapon.tmpl.stun > 0 && !tmpl.is_boss && !creature.stunned && chance(weapon.tmpl.stun + (staggered ? STAGGER_STUN_BONUS : 0))) {
                creature.stunned = true;
                this.send(session, `${cap(tmpl.name)} reels, stunned.`, "stun");
                this.actorFeed(session, session.roomId, this.feedProc(FEED_STUN, session.name, tmpl.name), "stun");
              }
              // A fast, cutting edge opens a wound that keeps weeping — damage
              // over time that no armor turns. Fresh hits keep it open. But the
              // HOLLOW don't bleed (dry bone, old iron): the DoT finds no blood.
              if (weapon && effBleed > 0 && !hollow) {
                creature.bleedTicks = BLEED_TICKS;
                creature.bleedDmg = Math.max(creature.bleedDmg ?? 0, effBleed);
                if (freshBleed) this.actorFeed(session, session.roomId, this.feedProc(FEED_BLEED, session.name, tmpl.name), "bleed");
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
      if (!grip || grip.roomId !== s.roomId) { s.seizedBy = undefined; continue; }
      // SLICK hide slips a grip easier, too (the eel was never held).
      const breakOdds = SEIZE_BREAK_ODDS + (this.wearsTrait(s, "slick") ? SLICK_BREAK_BONUS : 0);
      if (chance(breakOdds)) { s.seizedBy = undefined; this.send(s, "You tear loose of its grip."); }
    }

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
    const live = (c: Creature) =>
      !liveRooms || liveRooms.has(c.roomId)
      || c.templateId === ESCAPE_TMPL
      || world.mobTemplates.get(c.templateId)!.is_boss;
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
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && !this.outOfWorld(s));
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
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && !this.outOfWorld(s));
        if (!prey) {
          creature.rouseAt = undefined; // no one to hunt — the hunger settles back
        } else if (creature.rouseAt === undefined) {
          if (chance(STARVE_HUNTS_ODDS * nightHuntMult(creature.roomId, now))) {
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
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && !this.outOfWorld(s) && s.hp < s.maxHp * WOUNDED_FRACTION);
        if (!prey) {
          creature.rouseAt = undefined; // healed up, left, or died — the interest settles
        } else if (creature.rouseAt === undefined) {
          if (chance(WOUNDED_PREY_ODDS * nightHuntMult(creature.roomId, now))) {
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
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && !this.outOfWorld(s));
        if (!prey) {
          creature.rouseAt = undefined; // no mark — the itch settles
        } else if (creature.rouseAt === undefined) {
          if (chance(THIEF_ROB_ODDS)) {
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
          const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && !this.outOfWorld(s));
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
        const prey = [...this.sessions.values()].find((s) => s.roomId === creature.roomId && !this.outOfWorld(s));
        if (prey) {
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `The water heaves — ${tmpl.name} turns toward you.`);
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} turns toward ${prey.name}.`, prey.pubkey, false);
        }
      }
      if (creature.target) {
        const victim = this.sessions.get(creature.target);
        if (!victim || this.outOfWorld(victim) || victim.roomId !== creature.roomId) {
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
        // A runner bolts the instant it has the initiative — every time, at any
        // health. You already swung this tick (the living go first), so your
        // blow lands as it breaks for the door; then it's gone and you give
        // chase. Brooders are the opposite: they never leave the nest.
        // A fire-fearing thing (the albino rat, for now) breaks and runs from a
        // flame-bearer whatever its health — see ai.dreadsFire. Dormant until
        // torches exist (carriesFire is false today).
        // Empty bone knows no fear: the hollow fight until they come apart.
        const wantsFlee = ai.dreadsFire(this, creature, victim)
          || RUNNERS.has(tmpl.id)
          || (!tmpl.is_boss && !HOLLOW.has(tmpl.id) && !BROODERS.has(tmpl.id) && !DROWNERS.has(tmpl.id) && !SENTINELS.has(tmpl.id) && creature.hp < tmpl.max_hp * FLEE_BELOW && chance(FLEE_CHANCE));
        if (wantsFlee && !tmpl.is_boss && !ai.scavengerBold(this, creature)) {
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
                `${cap(tmpl.name)} lunges past you and crashes against the stone.`,
                `${cap(tmpl.name)} swings wide and its blow finds only wall.`,
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
        if (victim.resting) {
          victim.resting = false;
          this.send(victim, "You are dragged from your rest.");
          this.actorFeed(victim, victim.roomId, this.feedProc(FEED_REST_CAUGHT, tmpl.name, victim.name), "fight");
        }
        if (victim.hp > 0) {
          this.send(victim, `${cap(tmpl.name)} ${this.creatureHit(tmpl.id)} for ${dmg}${flourish} [${victim.hp}/${victim.maxHp} hp]`, flourish === "." ? "dmgin" : "dmgin big");
          if (drowned) this.send(victim, `${cap(tmpl.name)} drags you under — black water fills your lungs for ${drowned}. (break free, or drown)`, "dmgin big");
          this.sendStatus(victim);
          this.combatNoise(victim.roomId);
          // A drowned thing that lands a blow can take hold — you're seized,
          // can't flee, and it drags harder until you wrench free or kill it.
          // SLICK hide (eel-skin) gives cold arms half as much to hold; worn MASS
          // (poise) plants you so it can't drag — strongest-wins, never stacked.
          const seizeMult = Math.min(this.wearsTrait(victim, "slick") ? SLICK_SEIZE_MULT : 1, 1 - this.poiseOf(victim));
          const seizeOdds = SEIZE_ODDS * seizeMult;
          if (DROWNERS.has(creature.templateId) && !victim.seizedBy && chance(seizeOdds)) {
            victim.seizedBy = creature.id;
            this.send(victim, `${cap(tmpl.name)} closes cold arms around you — you're held fast. (break free: keep fighting, or it drags you under)`, "seize");
          }
          // Claws and teeth open a wound the mail can't turn.
          this.openWound(victim, tmpl);
          // The leg-goers go low — a hit can hamstring you.
          this.maybeHobble(victim, tmpl);
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
            const foodFirst = creature.hunger >= HUNGRY_AT
              ? takeable.filter((c) => world.itemTemplates.get(c.itemId)?.edible).sort(byRarity)[0]
              : undefined;
            const loot = foodFirst ?? [...takeable].sort(byRarity)[0];
            if (loot) {
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
      session.hp = Math.max(1, session.hp - bd);
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

    // Lights burn down (light.ts): low-flame warnings, burnout, the dark
    // closing back over, and a lantern's last burn spending the lantern.
    await light.tickLights(this, now);

    // The sky turns (events.ts): rain telegraphs, falls, and leaves mud —
    // and its kin to come. The spine just winds the clock.
    await events.tickEvents(this, now);

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
      const fullMoon = nightNow && isFullMoon(now);
      for (const s of this.sessions.values()) {
        if (this.outOfWorld(s) || !OUTDOOR_ROOMS.has(s.roomId)) continue;
        this.send(s, fullMoon
          ? "A full moon rises over the grounds, huge and white — plain as day out here tonight."
          : nightNow
          ? "The light fails outside — full dark settles over the grounds."
          : "Dawn breaks over the grounds — the dark thins and lifts.", "evt");
      }
    }
    this.lastNightPhase = nightNow;

    // The keeper's shelves breathe: restocks come in, and every few hours an
    // off-screen customer buys him out of some one thing.
    gate.tickFence(this, now);

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
      this.roomFeedAll("Deep below, iron grinds slowly shut. The dark has taken back its door.");
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
        creature.hp = Math.max(1, creature.hp - bd);
        if (creature.bleedTicks <= 0) { creature.bleedTicks = 0; creature.bleedDmg = 0; }
        const watcher = [...this.sessions.values()].find(
          (s) => s.roomId === creature.roomId && (s.target === creature.id || creature.target === s.pubkey),
        );
        if (watcher) this.send(watcher, `${cap(tmpl.name)} bleeds — ${bd}. (${this.condition(creature)})`);
      }
      if (!HOLLOW.has(creature.templateId)) {
        creature.hunger = Math.min(HUNGER_MAX, creature.hunger + HUNGER_PER_MIN * tickMins);
      }
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
        // Vermin eat the dead only to survive: a hungry rat gnaws a corpse to sate
        // (no loot-hauling, no mourning, no gorging bold — that's SCAVENGERS only).
        else if (VERMIN.has(creature.templateId) && creature.hunger >= HUNGRY_AT) ai.scavengerFeeds(this, creature, false);
        // The pale hunters feed the same way to survive — a fresh kill in their
        // stretch of dark resets the hunger that would otherwise drive them off
        // their ambush and onto your torchlight. A LONG-quiet corridor (no death
        // near) is what starves one desperate enough to come anyway. (Feed only:
        // no gear-scooping, no going bold — they're hunters, not looters.)
        else if (LURKERS.has(creature.templateId) && creature.hunger >= HUNGRY_AT) ai.scavengerFeeds(this, creature, false);
        // A rat that finds you resting may decide you're warm furniture.
        ai.ratCuddles(this, creature, now);
        // The small lives: warm blood dozes off in the quiet...
        ai.naps(this, creature, now);
        // ...the hyenas pad to water on their own clocks...
        ai.waters(this, creature, now);
        // ...and the unseen things shift their ambushes to where the feet go.
        ai.lurkerDrifts(this, creature, now);
        // A brood-mother swells the nest while she's left alone.
        if (BROODERS.has(creature.templateId)) ai.broodBirths(this, creature, now);
        // The bone-country remembers its dead: a hollow thing, idle with a living
        // ear near, breathes a name off the room's bloodstain.
        if (HOLLOW.has(creature.templateId)) ai.deadRemembers(this, creature, now);
        if (creature.hunger >= HUNGRY_AT) ai.creatureEatsHere(this, creature, false);
        // The food web: a predator turns on weaker prey sharing its room. If it
        // strikes, that's its action this tick — it doesn't also wander.
        const hunted = await ai.predation(this, creature, now);
        if (!hunted && RUNNERS.has(creature.templateId) && ai.playerPresent(this, creature.roomId)) {
          // Never settles while there's someone to run from — it keeps moving,
          // room to room, and you only land a blow the tick you have it cornered.
          await ai.creatureMoves(this, creature, now, "wander", false);
        } else if (!hunted && !creature.rouseAt && creature.nextWanderAt <= now && !tmpl.is_boss && !BROODERS.has(creature.templateId) && !DROWNERS.has(creature.templateId) && !SENTINELS.has(creature.templateId) && !AGGRESSIVE.has(creature.templateId)) {
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
        if (!t || (t.slot !== "weapon" && t.slot !== "armor")) continue;
        await this.wear(session, c, t, RUST_PER_TICK * beatMul); // wall-clock rust, not per-beat — a slow idle beat mustn't spare steel
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
        if (!byFire && !warmed && events.coldBites(this, session.roomId) && chance(COLD_REST_SKIP)) continue;
        session.hp = Math.min(session.maxHp, session.hp + (byFire ? FIRE_REST_REGEN_PER_TICK : REST_REGEN_PER_TICK));
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
      if (this.outOfWorld(session)) continue;
      if (events.raining(this, session.roomId)) pvp.rainThinsBlood(this, session);
    }

    // Flush every live session's mutable state (hp, room) to D1 on a slow clock,
    // so a DO restart — a deploy or a Cloudflare eviction — is a reconnect blip,
    // not a revert. Combat/move/eat already write through; this catches the
    // in-memory-only heals (chiefly rest) that would otherwise vanish on the
    // next cold start and snap a rested player back to stale HP.
    if (now - this.lastFlushAt >= FLUSH_INTERVAL_MS) {
      this.lastFlushAt = now;
      for (const s of this.sessions.values()) {
        await this.trySavePlayer(s.pubkey, s.roomId, s.hp);
      }
    }

    // The dungeon breathes: an idle wanderer catches a line of atmosphere now
    // and then, drawn from where they stand. Never in a fight, never at the
    // bench, and never faster than the cooldown — quiet, not chatter.
    for (const session of this.sessions.values()) {
      // The gatehouse breathes too — its own quiet, warm pool. (Crouched over a
      // lockbox mid-dungeon you're still outside: the weather finds you there.)
      const inGatehouse = this.outOfWorld(session);
      if ((session.away && !inGatehouse) || this.inCombat(session)) continue;
      // The gatehouse keeps its own, slower clock: it's a room where people sit
      // and talk, and the walls shouldn't keep interrupting them.
      const cool = inGatehouse ? GATEHOUSE_AMBIENT_COOLDOWN_MS : AMBIENT_COOLDOWN_MS;
      const odds = inGatehouse ? GATEHOUSE_AMBIENT_ODDS : AMBIENT_ODDS;
      if (now - session.lastAmbientAt < cool) continue;
      if (!chance(odds)) continue;
      const line = inGatehouse
        ? gate.gatehouseAmbient(session.lastAmbientLine)
        : this.ambientLine(session.roomId, session.lastAmbientLine, this.carriesLight(session));
      if (!line) continue;
      session.lastAmbientAt = now;
      session.lastAmbientLine = line;
      this.send(session, line, "amb"); // tagged so the client's tutorial can hush the weather
    }

    this.applyRot(now, false);
    this.sweepSpoiledHearts(now, false);
    this.applyRegrow(now, false);
    ai.applyArrivals(this, now, false);
    ai.scheduleArrivals(this, now);
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
    if (now - this.lastTickFlushAt >= TICK_SIM_FLUSH_MS) {
      this.lastTickFlushAt = now;
      await this.persist();
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
    const region = this.world!.entryRooms.has(roomId) ? "gate" : DEEP_ROOMS.has(roomId) ? "deep" : "upper";
    return draw(AMBIENCE[region]);
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
      const alive = list.filter((t) => now - t.at < (TRACE_LIFE_MS[t.kind] ?? 0));
      if (alive.length === 0) this.traces.delete(roomId);
      else if (alive.length !== list.length) this.traces.set(roomId, alive);
    }
  }

  // Evidence, rendered fuzzily by age — the reader does the detective work.
  private traceLines(roomId: string, now: number): string[] {
    const list = this.traces.get(roomId);
    if (!list || list.length === 0) return [];
    const lines: string[] = [];
    const carvings = list.filter((t) => t.kind === "carve" && now - t.at < TRACE_LIFE_MS.carve);
    const rest = list
      .filter((t) => t.kind !== "carve" && now - t.at < (TRACE_LIFE_MS[t.kind] ?? 0))
      .sort((a, b) => b.at - a.at)
      .slice(0, 3);
    for (const t of rest) {
      const age = now - t.at;
      if (t.kind === "blood") {
        if (age < 10 * 60_000) lines.push("Fresh blood pools on the stones — something died here moments ago.");
        else if (age < 3_600_000) lines.push("Blood on the stones, still wet.");
        else lines.push("A drying bloodstain darkens the floor.");
      } else if (t.kind === "drip") {
        // The walking wound: something crossed this room bleeding. The trail
        // never says WHO — you follow it to find out.
        if (age < 10 * 60_000) lines.push("A trail of blood drops crosses the floor, bright and fresh — something wounded passed through, and not long ago.");
        else lines.push("A dotted line of blood, going dark, crosses the stones — something wounded passed this way.");
      } else if (t.kind === "remains") {
        if (age < 10 * 60_000) lines.push("Broken remains litter the stones, still settling.");
        else if (age < 3 * 3_600_000) lines.push("Broken remains lie scattered here.");
        else lines.push("Old remains, long picked over.");
      } else if (t.kind === "scraps") {
        if (age < 3_600_000) lines.push("Fresh gnawed scraps litter the floor.");
        else lines.push("Gnawed scraps rot quietly in a corner.");
      } else if (t.kind === "rest") {
        if (age < 3_600_000) lines.push("A patch of floor lies swept clear, sat in not long ago.");
        else lines.push("Someone rested here, a while back.");
      } else if (t.kind === "passage") {
        if (age < 10 * 60_000) lines.push("The dust is freshly disturbed — someone passed this way minutes ago.");
        else lines.push("Footprints disturb the dust here.");
      }
    }
    for (const t of carvings.sort((a, b) => a.at - b.at)) {
      const age = now - t.at;
      const wear = age < 3_600_000 ? ", the marks fresh" : age > 7 * 24 * 3_600_000 ? ", half-worn" : "";
      lines.push(`"${t.words}" is scratched into the stone${wear}.`);
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
        // The rot clock run backward: raw meat hung in the smokehouse racks has
        // cured through. The raw is gone from the floor; its keeping form takes
        // its place, hanging there for whoever's hand comes for it (yours, if you
        // beat the scavengers and the other delvers back to it).
        if (r.kind === "cure") {
          const out = CURE_RECIPES[r.itemId] ?? "smoked-haunch";
          here.push(out);
          this.stampFresh(r.roomId, out);
          if (!silent) {
            this.roomFeed(r.roomId, "On the smoke-racks, a haunch has cured through — gone black and hard, and keeping now.", undefined, false); // housekeeping — off the relay
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
      if (this.world!.groundSpawns.some((g) => g.item_id === itemId && g.room_id === roomId && g.regrows)) continue;
      const n = floor.filter((i) => i === itemId).length;
      if (!n) continue;
      const pending = this.rot.filter((r) => r.kind === d.kind && r.roomId === roomId && r.itemId === itemId).length;
      for (let i = pending; i < n; i++) {
        this.rot.push({ itemId, roomId, at: Date.now() + randInt(d.min, d.max), kind: d.kind });
      }
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
      // Never over-fill: if the room got one back some other way (a dropped or
      // thrown rock landed here), this regrow just resolves to nothing.
      const floor = this.ground.get(g.roomId) ?? [];
      if (floor.includes(g.itemId)) return false;
      const t = this.world!.itemTemplates.get(g.itemId);
      // The floor-renewal law: renewable GEAR is dice, not a schedule. Its
      // check came up — roll whether the world coughs one back. A miss leaves
      // the spot bare and re-arms the next roll; only consumables and the
      // starter rock restore on the clock.
      const gear = !!t && t.slot !== "" && !RELIABLE_GEAR.has(g.itemId);
      if (gear && !chance(GEAR_REGROW_ODDS)) {
        g.at = now + randInt(GEAR_ROLL_MIN_MS, GEAR_ROLL_MAX_MS);
        return true;
      }
      this.ground.set(g.roomId, [...floor, g.itemId]);
      if (!silent) {
        const rock = g.itemId === "loose-rock";
        const edible = !!t?.edible;
        // The altar line (and its chime) is for the few rooms that actually HAVE
        // an altar — a bloodwort sprig back on the chapel's stone reads as a
        // returned offering. Everywhere else this same "else" branch just means a
        // torch/bandage/bone turned up on the floor again, so say exactly that.
        const onAltar = !rock && !gear && !edible && ALTAR_ROOMS.has(g.roomId);
        this.roomFeed(g.roomId, rock
          ? "The rubble shifts — a loose rock lies within reach again."
          : gear
            ? `${cap(t?.name ?? "something")} turns up among the litter, where there was nothing before.`
            : edible
              ? `${cap(t?.name ?? "something")} lies here — the stores are not empty yet.`
              : onAltar
                ? `${cap(t?.name ?? "something")} lies on the altar, as if it had never left.`
                : `${cap(t?.name ?? "something")} lies here again, where there was nothing before.`,
          undefined, false); // regrow is housekeeping — off the relay
        this.roomSound(g.roomId, rock ? "Stone grinds on stone {dir}." : gear ? "Metal scrapes softly on stone {dir}." : onAltar ? "A faint chime sounds {dir}." : "Something settles {dir}.");
        this.refreshRoomCtx(g.roomId);
      }
      return false;
    });
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
      this.send(session, `Your swing goes wide — ${weapon.tmpl.name} spins from your grip and clatters across the stones!`
        + (weapon.carried.serial !== null ? " The seal cracks where it lands." : ""), "fumble");
      this.roomFeed(session.roomId, `${session.name}'s weapon clatters across the stones!`, session.pubkey, false);
      this.roomSound(session.roomId, "Metal clatters on stone, {dir}.");
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
    if (!creature.hurtBy) creature.hurtBy = [];
    if (!creature.hurtBy.includes(pubkey)) creature.hurtBy.push(pubkey);
  }

  private async onCreatureDeath(killer: Session, creature: Creature, tmpl: MobTemplate, killLine?: string, vital = false): Promise<void> {
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
    this.creatures.delete(creature.id);
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
    if (jrn?.journalId) await journalBumpKill(this.env.DB, jrn.journalId, tmpl.id);
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
      this.roomFeedAll(`A cry rolls through the stone: ${tmpl.name} has fallen.`);
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
    if (tmpl.loot_item && chance(tmpl.loot_chance)) {
      const item = this.world!.itemTemplates.get(tmpl.loot_item);
      if (item) {
        const rolled = this.rollTraits(item); // one roll, whichever way it lands (099)
        if (await this.grantItem(killer, item.id, { rolledTraits: rolled })) {
          this.send(killer, `${cap(item.name)} falls into your hands. [${item.rarity}] ${this.lootSuffix(item)}`);
        } else {
          this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), item.id]);
          this.stampFresh(creature.roomId, item.id);
          if (rolled) this.groundRolled.set(`${item.id}@${creature.roomId}`, rolled);
          this.send(killer, `${cap(this.floorName(item.id, creature.roomId))} falls from ${tmpl.name} — your pack is full, so it lies here. [${item.rarity}]`);
        }
        // Same rule as a pickup off the floor: junk stays in the room. Only a
        // rare+ find is worth the wire — nobody outside needs to hear that
        // someone pocketed a finger-bone.
        this.roomFeed(creature.roomId, `${killer.name} claims ${item.name}.`, killer.pubkey, false); // loot stays LOCAL: even a legendary claim is nobody's business (see verbs takes)
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
        this.send(killer, `${cap(kt.name)} falls from the dead ${tmpl.name.replace(/^an? /, "")}. [${kt.rarity}] (unclaimed)`);
      } else {
        this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), kt.id]);
        this.stampFresh(creature.roomId, kt.id);
        this.send(killer, `${cap(kt.name)} falls from the dead ${tmpl.name.replace(/^an? /, "")} — pack full, it lies here. [${kt.rarity}]`);
      }
      this.sendCtx(killer);
    }

    // What it visibly bore — its gear, or something it scavenged off the dead —
    // spills to the floor where it fell. No random roll: if you could see it on
    // the thing, killing it drops it. Pick it up (ground gear lands fresh, no
    // seal; the gate does the sealing).
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
          const shown = cap(this.floorName(id, creature.roomId));
          this.send(killer, `${shown} clatters free of the fallen — it lies here. [${g.rarity}]`);
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
    const cHurt = creature.hp < tmpl.max_hp * WOUNDED_FRACTION;
    let dmg = randInt(tmpl.dmg_min, tmpl.dmg_max) + (tmpl.is_boss ? (creature.phase ?? 0) * 3 : 0);
    if (ai.scavengerBold(this, creature)) dmg = Math.round(dmg * BOLD_DMG_MULT);
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
      this.openWound(victim, tmpl); // an ambush by something with claws cuts deep
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
    victim.litUntil = undefined; victim.litSource = undefined; victim.torchWarned = undefined;
    victim.buying = undefined; // death ends any open trade; the counter clears
    trade.cancelDealForSession(this, victim); // and any open deal with another wanderer
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
        ? `${victim.name} is slain by ${slayer}. Their pack scatters across the stones${hadSealed ? " — cracked seals glitter among the spill" : ""}.`
        : `${victim.name} is slain by ${slayer}.`,
    );
    if (slayerName) this.roomFeed(fell, `${slayerName} stands over the body.`, victim.pubkey, false);
    this.roomSound(fell, "A scream, cut short, {dir}.");
    this.creatureNoise(fell);
    this.addTrace(fell, { kind: "blood", at: Date.now(), label: victim.name });

    victim.roomId = this.randomGate();
    victim.hp = victim.maxHp;
    const fate =
      scattered.length > 0
        ? hadSealed
          ? "Everything you carried lies where you fell — the gate's seals cracked as they left your hands. Only the lockbox and vault keep."
          : "Everything you carried lies where you fell."
        : "You carried nothing worth scattering.";
    const end = slayerName ? pick([
      `${slayerName} kills you.\nDarkness. Then the gate, again.`,
      `${slayerName} puts you down on the stones.\nThe dark takes you — and gives you back at the gate.`,
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
    this.send(victim, `${end} ${fate}`, "death big");
    this.roomFeed(victim.roomId, `${victim.name} staggers back through the gate, pale.`, victim.pubkey, false);
    this.send(victim, this.describeRoom(victim));
    this.sendStatus(victim);
    this.refreshRoomCtx(fell);
    this.refreshRoomCtx(victim.roomId);
    await this.trySavePlayer(victim.pubkey, victim.roomId, victim.hp);
    await this.persist();
  }

  public inCombat(session: Session): boolean {
    if (session.target) return true;
    if (session.pvpTarget) return true;
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
    const current = await this.state.storage.getAlarm();
    // An overdue alarm is a dead alarm (dev reloads leave them wedged) —
    // setAlarm overwrites, so reschedule rather than trust it. A HOT world
    // waiting on a quiet-length alarm re-arms early: the fight can't wait.
    if (current === null || current < now || (hot && current > now + TICK_MS)) {
      await this.state.storage.setAlarm(now + (hot ? TICK_MS : IDLE_TICK_MS));
    }
  }

  // ---- rendering & lookup ----

  // The room, entered: full prose the first time you see it (and on `look`),
  // brief on every re-entry after — just the name, the ways out, and whatever
  // is actually THERE now. Marks the room known. The whole reason you don't
  // re-read the same paragraph every time you cross a room you've crossed all day.
  public enterDescribe(session: Session): string {
    const full = !session.visited.has(session.roomId);
    session.visited.add(session.roomId);
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
    // The lightless deep: without a flame you see nothing here — not the room,
    // not its exits, not what shares it with you. A torch resolves it all.
    if (this.isDark(room.id) && !this.carriesLight(session) && !this.roomLit(room.id)) {
      // The one generic line read identically whether you were in the deep's
      // permanent dark or an outdoor courtyard the night-clock just shrouded —
      // no telling the two apart (rome, 2026-07-22: "not really much telling
      // me it's night time"). Outdoor + night, with no OTHER reason it'd be
      // dark (a gloamed sky, or a room that's dark regardless of hour), gets
      // its own line — no cave, no water-drip, open sky instead.
      if (OUTDOOR_ROOMS.has(room.id) && isNight() && !DARK_ROOMS.has(room.id) && !events.gloamed(this, room.id)) {
        return "Night, pitch black outside.\nNo moon tonight — you can see nothing under open sky, only your own breath and the wind. A light would show it. (light a torch, or feel your way back the way you came)";
      }
      return "Pitch dark.\nYou can see nothing — no walls, no way on, only your own breath and, somewhere, the drip of water. A light would show it. (light a torch, or feel your way back the way you came)";
    }
    const lines = full ? [room.name, room.description] : [room.name];
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
      lines.push(isFullMoon()
        ? "A full moon rides high and white — the grounds lie almost as bright as day."
        : "Night's fully down out here — past your light, it's black.");
    }

    const exits = world.exits.get(room.id) ?? [];
    lines.push(exits.length ? `Exits: ${exits.map((e) => e.dir).join(", ")}.` : "There is no way out.");

    lines.push(...this.traceLines(room.id, Date.now()));

    // Every gate keeps a keeper: a fence at a shuttered hatch, dealing in kind.
    // (Static, so it's part of the full look only — you know he's there.)
    if (full && world.entryRooms.has(room.id) && world.fenceStock.length > 0) {
      lines.push("A keeper waits at a shuttered hatch in the gatehouse wall, dealing in kind.");
    }

    // A tide-drowned room keeps its floor to itself: whatever lies here lies
    // under black water, unseen until someone goes down after it (cmdDive).
    if (events.tideFlooded(this, room.id)) {
      lines.push("The floor is gone under the water; whatever lies here is down there with it.");
    } else {
      // A torch someone set (or dropped) on the stone, still burning — the room's
      // own light while it lasts.
      if (this.roomLit(room.id)) lines.push("A torch burns on the floor here, throwing the dark back off the walls.");
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
        const shown = cap(this.floorName(itemId, room.id));
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
        lines.push(`Loot lies scattered across the stones — ${loose.length} things in all. ('look' to pick them out.)`);
      }
      for (const cache of world.caches) {
        if (this.cacheRoomId(cache) !== room.id) continue;
        const locked = this.cacheLocked(cache);
        // A roaming chest, once looted, is hidden until it refills elsewhere — no
        // empty husk left behind to teleport. A fixed chest still shows its husk.
        if (!locked && this.cacheRoams(cache)) continue;
        lines.push(locked
          ? `${cap(cache.name)} sits here, locked.`
          : `${cap(cache.name)} sits here, sprung and empty.`);
      }
    }
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== room.id) continue;
      const t = world.mobTemplates.get(creature.templateId)!;
      // A lurker lying in wait is unseen — it isn't in the room at all, until it
      // strikes. UNLESS you carry a flame: torchlight finds it pressed into its
      // crevice before it can spring, and the ambush is spoiled (wakeListeners).
      const hiddenLurker = LURKERS.has(creature.templateId) && creature.hidden && !creature.target;
      if (hiddenLurker && !this.carriesLight(session) && !this.roomLit(room.id)) continue;
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
      lines.push(`${cap(t.name)} is here${fogged ? "" : this.bearsClause(creature)}${tell ? `, ${tell}` : ""}.${!fogged && creature.hp < t.max_hp ? ` (${this.condition(creature)})` : ""}`);
    }
    // Blood on a stranger's hands is a CLOSE read: the fog swallows it and the
    // rain runs it off them. The room glance only carries the mark in weather
    // that lets you see it — same law as the look (verbs.describePlayer).
    const canReadStains = !events.foggy(this, room.id) && !events.raining(this, room.id);
    for (const s of this.sessions.values()) {
      if (s.pubkey !== session.pubkey && s.roomId === room.id && !this.outOfWorld(s)) {
        lines.push(`${s.name} is here${s.resting ? ", resting" : ""}.${canReadStains ? pvp.bloodClause(this, s.pubkey) : ""}`);
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
  private creatureHit(templateId: string): string {
    const pool = DROWNERS.has(templateId) ? CREATURE_HIT.water
      : THIEVES.has(templateId) ? CREATURE_HIT.knife
      : BITERS.has(templateId) ? CREATURE_HIT.teeth
      : HOLLOW.has(templateId) ? CREATURE_HIT.bone
      : CREATURE_HIT.plain;
    return pick(pool);
  }

  // The vitals-lottery killing blow, in the same register as creatureHit — so the
  // headshot reads like the thing that landed it (jaws to the throat, iron to the
  // heart), not one generic line.
  private creatureVitals(templateId: string): string {
    const pool = DROWNERS.has(templateId) ? CREATURE_VITALS.water
      : THIEVES.has(templateId) ? CREATURE_VITALS.knife
      : BITERS.has(templateId) ? CREATURE_VITALS.teeth
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
  // whichever is greater. The single source for both damage paths.
  public armorIgnore(weapon: { tmpl: ItemTemplate } | null | undefined): number {
    if (!weapon) return 0;
    const pierce = trait(weapon.tmpl, "pierce") ?? 0;
    const blunt = weapon.tmpl.stun > 0 ? BLUNT_ARMOR_IGNORE : 0;
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
  // is what pulled box-bone/box-crack out of the safe rooms). The King's Hoard is
  // the one exception: the boss's treasure stays put. Finding a chest becomes
  // exploration + luck; the supply (chest COUNT) is unchanged, so scarcity holds.
  public cacheRoams(cache: Cache): boolean {
    return cache.keyItem !== "reliquary-key"; // the King's Hoard is fixed
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
  public bearsClause(creature: Creature): string {
    if (!creature.carries?.length) return "";
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
      && !this.carriesLight(session)
      && !this.roomLit(creature.roomId);
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
      total += Math.max(0, g.tmpl.weight - (this.itemRolled(g, "balanced") ? 1 : 0));
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
    const options = pool.filter((t) => !hasTrait(tmpl, t) && (WEAPON_CLASS_TRAIT[t]?.(tmpl) ?? true));
    return options.length ? pick(options) : "";
  }

  // An item's name as it reads on the shelf and the floor, with its rolled trait
  // worn as an adjective ("a muffled cloak"). The paperdoll spells out what the
  // trait DOES once the piece is worn; the name just advertises that it's there.
  public displayName(c: CarriedItem): string {
    const base = this.world!.itemTemplates.get(c.itemId)?.name ?? c.itemId;
    return this.rolledName(base, c.rolledMap);
  }

  // What `look` appends for a rolled piece — the flavor + mechanic of whatever it
  // rolled (099). itemStat reads the TEMPLATE, so it never sees an instance roll;
  // this fills that in. Empty for plain gear. Leading space, sentence per trait.
  public rolledTell(rolled?: Map<string, number>): string {
    if (!rolled?.size) return "";
    const tells: string[] = [];
    for (const tag of rolled.keys()) { const s = ROLLED_TELL[tag]; if (s) tells.push(s); }
    return tells.length ? " " + tells.join(" ") : "";
  }

  // The same, for a template id + a rolled string sitting on the floor (glance).
  public floorName(itemId: string, roomId: string): string {
    const base = this.world!.itemTemplates.get(itemId)?.name ?? itemId;
    const rolled = this.groundRolled.get(`${itemId}@${roomId}`);
    return rolled ? this.rolledName(base, parseTraits(rolled)) : base;
  }

  // Fold the first rolled tag's adjective into a name, after the article:
  // "a scavenger's coat" + quiet -> "a muffled scavenger's coat". The a/an
  // article re-agrees with the adjective now leading ("an oiled wrap", "a
  // quilted cap"); "the" and article-less names ("boots") are left alone.
  private rolledName(base: string, rolled?: Map<string, number>): string {
    if (!rolled?.size) return base;
    let adj = "";
    for (const tag of rolled.keys()) { adj = TRAIT_ADJ[tag] ?? ""; if (adj) break; }
    if (!adj) return base;
    const m = base.match(/^(an? |the )/i);
    if (!m) return `${adj} ${base}`;
    const rest = base.slice(m[0].length);
    const article = /^the /i.test(m[0]) ? m[0] : (/^[aeiou]/i.test(adj) ? "an " : "a ");
    return `${article}${adj} ${rest}`;
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
    if (this.wearsTrait(session, "mailward")) traits.push("wards bleeds (edges skate off the rings)");
    if (this.wearsTrait(session, "quiet")) traits.push("quiet (soft-footed)");
    if (this.wearsTrait(session, "slick")) traits.push("slick (hard to seize)");
    if (this.wearsTrait(session, "strapped")) traits.push("strapped (theft-proof)");
    if (this.wearsTrait(session, "thorns")) traits.push("thorns (blocks bite back)");
    if (t && hasTrait(t, "reach")) traits.push("reach (blunts the rush)");
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
    if (s && s.tmpl.block > 0 && !twoHanded && !this.carriesLight(session)) {
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
          room: this.outOfWorld(session) ? "The Gatehouse" : (room?.name ?? session.roomId),
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
  }

  // ---- sound: text renders it better than graphics render anything ----
  // A noisy event in one room is heard, degraded and directional, in every
  // room with an open exit toward it. Closed iron blocks sound. "{dir}" in
  // the template becomes "to the east" / "from below" for each listener.
  public roomSound(sourceRoomId: string, template: string, excludeRoomId?: string, cls?: string): void {
    const world = this.world;
    if (!world) return;
    // A downpour eats sound made under it — half of what happens in the rain
    // simply never carries. (Hunting weather.)
    if (events.raining(this, sourceRoomId) && chance(RAIN_NOISE_MASK)) return;
    const heard = new Set<string>();
    for (const [rid, exits] of world.exits) {
      if (rid === sourceRoomId || rid === excludeRoomId) continue;
      const toward = exits.find(
        (e) => e.to_room === sourceRoomId && (!e.key_item || this.openDoors.has(`${rid}:${e.dir}`)),
      );
      if (!toward) continue;
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
    for (const c of this.creatures.values()) {
      if (c.roomId !== roomId || !c.asleep || !chance(WAKE_NOISE)) continue;
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
  public creatureNoise(sourceRoomId: string): void {
    const world = this.world;
    if (!world) return;
    // A room already full of the curious doesn't pull in more — that's what
    // turned the central hub into a black hole that swallowed the whole zone.
    if (ai.creaturesIn(this, sourceRoomId) >= CROWD_CAP) return;
    // The rain masks creature-ward too: what the downpour swallows, nothing
    // comes to investigate.
    if (events.raining(this, sourceRoomId) && chance(RAIN_NOISE_MASK)) return;
    const now = Date.now();
    for (const c of this.creatures.values()) {
      if (c.target || c.roomId === sourceRoomId) continue;
      if (c.asleep) continue; // a sleeper doesn't hear the next room over (same-room noise has its own wake roll)
      const tmpl = world.mobTemplates.get(c.templateId)!;
      if (tmpl.is_boss) continue; // the King waits; the noise comes to him
      if (DROWNERS.has(c.templateId)) continue; // it holds its water; noise doesn't move it
      if (SENTINELS.has(c.templateId) || AGGRESSIVE.has(c.templateId)) continue; // a guardian holds its post; noise doesn't draw it off the door
      if (SCAVENGERS.has(c.templateId)) continue; // hyenas track the scent of the dead, not the din of the living
      // Not every ear pricks up. A good majority come to look; the rest keep
      // to their own business — so a fight draws a crowd, not the whole zone.
      if (!chance(NOISE_HEED_ODDS)) continue;
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
  public roomFeed(roomId: string, text: string, exceptPubkey?: string, toRelay = true, cls?: string, speaker?: { name: string; pk: string }): void {
    const base: Record<string, unknown> = { v: 0, kind: 24913, room: roomId, text };
    if (cls) base.cls = cls;
    // Speech carries its speaker so the client can key-colour the name; only the
    // local socket copy gets it — the relay text (below) never does.
    if (speaker) { base.who = speaker.name; base.sp = speaker.pk; }
    const frame = JSON.stringify(base);
    for (const s of this.sessions.values()) {
      if (s.roomId !== roomId || s.pubkey === exceptPubkey) continue;
      // Someone in the GATEHOUSE shares the gate's roomId but is not in the room:
      // they're behind the door. The gate's noise — a rat skittering below, a
      // wanderer blinking in, a bench being closed — doesn't carry through it.
      // (Their own room has its own feed; see gate.gatehouseFeed.)
      if (this.outOfWorld(s)) continue;
      try { s.ws.send(frame); } catch {}
    }
    // Players standing here always see it (a cheap in-memory send). The relay,
    // though, only carries what a distant watcher would care about — a fight, a
    // death, an arrival. Idle creature wandering stays LOCAL: it was flooding the
    // relays two ephemeral events per step (leave + enter) with rats pacing empty
    // rooms nobody watches. That noise never leaves the box now.
    if (toRelay) this.relayFeed("mudroom-" + roomId, text);
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
      const ev = signFeedEvent(this.env, roomTag, this.world.zone, text);
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

