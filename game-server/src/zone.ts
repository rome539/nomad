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
  recordDeath,
  renamePlayer,
  savePlayer,
  setStance,
  loadInventory,
  loadContainer,
  setEquipped,
  setItemCondition,
  insertLoot,
  itemAcquiredAt,
  removeItemRow,
  clearCarriedInventory,
  voidMint,
  setItemJournalId,
  journalLoad,
  journalBumpKill,
  journalStudy,
  type World,
  type MobTemplate,
  type ItemTemplate,
  type CarriedItem,
  type Cache,
} from "./world";
import { parse, HELP_TEXT, type Command } from "./parser";
import { randInt, chance, uuid, pick } from "./rng";
import { hashSeed, mulberry32, cap, dirPhrase, shortName, nameMatches, rollGearCondition } from "./zone-util";
import type { Stance, Session, Creature, Regrow, Trace, RotEntry, GroundInstance, SimState } from "./zone-types";
import { isGameKeyConfigured, signLootEvent, signSheetEvent, signFeedEvent } from "./signing";
import { publishEvent, relayList } from "./relay";
import * as gate from "./gate";
import * as ai from "./ai";
import {
  TICK_MS, COMBAT_ROUND_MS, PLAYER_DMG_MIN, PLAYER_DMG_MAX, CRIT_CHANCE, FUMBLE_CHANCE, 
  WEAPON_WEAR, ARMOR_WEAR, SEALED_WEAR_MULT, ARMOR_K, RUST_PER_TICK, WOUNDED_FRACTION, WOUNDED_DMG_MULT,
  WOUNDED_FUMBLE_BONUS, WOUNDED_DROP_ODDS, AUTO_EAT_FRACTION, AMBUSH_MULT, THROW_DMG_MIN, THROW_DMG_MAX,
  THROW_COOLDOWN_MS, THROW_SHATTER, THROW_SHATTER_HOLLOW, WEAPON_WEAR_HOLLOW, DODGE_LIGHT, 
  PARTING_BLOW_CHANCE, STANCE, GUARDED_BLOCK_BONUS, GUARDED_WOUND_ODDS, STAGGER_BONUS, PACK_CAP, LOCKBOX_CAP, VAULT_CAP,
  REACH_ITEMS, PIERCE, TWO_HANDED, PADDED, PADDED_STUN_MULT, WARDHIDE, WARDHIDE_WOUND_ODDS, BLEED_ODDS,
  HOBBLE_ODDS, HOBBLE_FLEE_MS, VITALS_PVE, VITALS_ARMOR_FULL, VITALS_THREATS,
  PIERCING_WEAPONS, VITALS_HOUND, PLAYER_VITALS,
  SLICK, SLICK_SEIZE_MULT, SLICK_BREAK_BONUS, STRAPPED, THORNS, QUIET_ITEMS, CORRODERS, CORRODE_WEAR,
  CACHE_EMPTY_ODDS, BENCH_CHIP, TRADE_CHIP, FORGE_CHIP, DETAILED_MAP,
  MAP_ITEMS, JOURNAL_ITEM, FISHING_ROOMS, FISH_ODDS, PALE_EEL_ODDS, FISH_COOLDOWN_MS,
  CRUDE_DROP_ROOM, CRUDE_BAD_EXIT, DIR_ORDER,
  RATE_CAPACITY, RATE_REFILL_PER_SEC, REST_REGEN_PER_TICK, FLUSH_INTERVAL_MS, SIM_STEP_MS, CATCHUP_CAP_MS,
  CREATURE_HEAL_PER_MIN, HUNGER_PER_MIN, HUNGER_MAX, HUNGRY_AT, WANDER_MIN_MS, WANDER_MAX_MS, 
  FLEE_BELOW, FLEE_CHANCE, REGROW_MIN_MS, REGROW_MAX_MS, COMBAT_NOISE_EVERY_MS, NOISE_HEED_ODDS, DOGPILE_CAP, CROWD_CAP,
  ARMOR_SLOTS, BLEED_TICKS, BLEED_KILL_ODDS, BANDAGE_FRACTION, TRACE_LIFE_MS, TRACE_CAP, CARVE_CAP, CARVE_MAX_LEN, ROT_MS,
  PATROLS, HOLLOW, THIEVES, RUNNERS, BROODERS, SENTINELS, HOUND_WAKE_MS,
  LISTENERS, WAKE_ENTER, WAKE_EXIT, WAKE_NOISE, RARITY_RANK, 
  SCAVENGERS, AGGRO_SCAVENGERS, DIRE_ROUSE_MS, BOLD_DMG_MULT, DROWNERS, SEIZE_ODDS, SEIZE_BREAK_ODDS, SEIZE_DMG_MULT, SEIZE_DROWN_ODDS, SEIZE_DROWN_FRACTION, LURKERS, REVENANTS,
  REVIVE_FRAC, RISE_LIMIT, PLAYER_HIT, WEAPON_VERBS, PIERCE_TELL, BLUNT_TELL, BLEED_TELL, BONE_DRY_TELL, CRIT_FLOURISH, CREATURE_HIT, CREATURE_VITALS, BITERS,
  BLUNT_ARMOR_IGNORE,
  DEEP_ROOMS, AMBIENCE, ROOM_AMBIENCE, AMBIENT_COOLDOWN_MS, AMBIENT_ODDS, RECONNECT_GRACE_MS,
  DEEP_HEART, DEEP_DOOR_KEY, HEART_FRESH_SEC, SURFACE_INTERVAL_MS,
  DARK_ROOMS, TORCH_ITEM, TORCH_BURN_MS
} from "./zone-data";

export class ZoneDO implements DurableObject {
  public world: World | null = null;
  public sessions = new Map<string, Session>(); // pubkey -> session
  private leftAt = new Map<string, number>(); // pubkey -> ms it last disconnected (a quick return is a reconnect, not an arrival)
  public creatures = new Map<string, Creature>();
  public ground = new Map<string, string[]>(); // roomId -> item template ids
  // Items on the floor that carry per-instance state a bare template id can't:
  // a dropped journal keeps the id its pages are keyed to, so whoever picks it
  // up inherits the logs. Everything else stays in the plain `ground` above.
  private groundInstances = new Map<string, GroundInstance[]>();
  private regrow: Regrow[] = [];
  private lastCombatRound = 0; // ms of the last tick blows actually landed (see COMBAT_ROUND_MS)
  private blowsThisTick = new Map<string, number>(); // pubkey -> blows landed on them this tick (DOGPILE_CAP), across swings AND entry first-strikes
  public arrivals = new Map<string, number>();
  public openDoors = new Set<string>();
  public traces = new Map<string, Trace[]>();
  private rot: RotEntry[] = [];
  private placedSpawns = new Set<string>(); // ground spawns already laid once
  private groundCond = new Map<string, number>(); // "itemId@roomId" -> condition of gear on the floor, so wear survives a drop/pickup
  private cacheSpent = new Map<string, number>(); // cacheId -> ms it re-locks/refills
  private cacheRoom = new Map<string, string>(); // cacheId -> its CURRENT room; roaming chests relocate on refill
  private nextSurfaceAt = 0; // ms epoch the deep next coughs a dweller up (only while the deep door is sealed)
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



  private async init(zone: string): Promise<World> {
    if (this.world) return this.world;
    const world = await loadWorld(this.env.DB, zone);
    this.world = world;
    this.buildWorldMaps(world);

    const saved = await this.state.storage.get<SimState>("sim");
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
      this.traces = new Map(Object.entries(saved.traces ?? {}));
      this.rot = saved.rot ?? [];
      this.placedSpawns = new Set(saved.placedSpawns ?? []);
      this.groundCond = new Map(Object.entries(saved.groundCond ?? {}));
      this.cacheSpent = new Map(Object.entries(saved.cacheSpent ?? {}));
      this.cacheRoom = new Map(Object.entries(saved.cacheRoom ?? {}));
      this.nextSurfaceAt = saved.nextSurfaceAt ?? 0;
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
          if (world.itemTemplates.get(g.item_id)?.edible) {
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
        const tmpl = ai.rollBloodline(this, base);
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
        if (world.itemTemplates.get(g.item_id)?.edible) {
          this.rot.push({ itemId: g.item_id, roomId: g.room_id, at: now + ROT_MS });
        }
      }
      this.savedAt = now;
      await this.persist();
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
            && !BROODERS.has(c.templateId) && !DROWNERS.has(c.templateId) && !SENTINELS.has(c.templateId)) {
          // Silent catch-up runs with no one connected, so no ambush fires here.
          void ai.creatureMoves(this, c, t, "wander", true);
        }
      }
      this.applyRot(t, true);
      this.applyRegrow(t, true);
      ai.applyArrivals(this, t, true);
      ai.scheduleArrivals(this, t);
    }
    this.pruneTraces(now);
    this.savedAt = now;
  }

  private async persist(): Promise<void> {
    this.savedAt = Date.now();
    const state: SimState = {
      savedAt: this.savedAt,
      creatures: [...this.creatures.values()],
      ground: Object.fromEntries(this.ground),
      groundInstances: Object.fromEntries(this.groundInstances),
      regrow: this.regrow,
      arrivals: Object.fromEntries(this.arrivals),
      openDoors: [...this.openDoors],
      traces: Object.fromEntries(this.traces),
      rot: this.rot,
      placedSpawns: [...this.placedSpawns],
      groundCond: Object.fromEntries(this.groundCond),
      cacheSpent: Object.fromEntries(this.cacheSpent),
      cacheRoom: Object.fromEntries(this.cacheRoom),
      nextSurfaceAt: this.nextSurfaceAt,
    };
    await this.state.storage.put("sim", state);
  }

  // Blow away the whole world sim and rebuild it from first light. Drops the
  // saved "sim" blob and every in-memory shard of it, reloads the world book
  // from D1, and re-seeds creatures/ground fresh off the (migrated) spawn tables.
  // D1 is untouched — players, packs, lockboxes, vaults, sealed loot all survive.
  // The deep re-seals (openDoors cleared), so the corpse-key is needed again.
  private async reseed(zone: string): Promise<number> {
    await this.state.storage.delete("sim");
    this.world = null; // force loadWorld + the first-light branch on the re-init below
    this.creatures.clear();
    this.ground.clear();
    this.groundInstances.clear();
    this.regrow = [];
    this.arrivals.clear();
    this.openDoors.clear();
    this.traces.clear();
    this.rot = [];
    this.placedSpawns.clear();
    this.groundCond.clear();
    this.cacheSpent.clear();
    this.cacheRoom.clear();
    this.nextSurfaceAt = 0;
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
    for (const other of this.state.getWebSockets()) {
      if (this.wsPubkey(other) !== pubkey) continue;
      const prev = this.sessions.get(pubkey);
      if (prev) this.send(prev, "Your spirit is called elsewhere. (connected from another client)");
      try { other.close(1000, "reconnected"); } catch {}
    }
    this.sessions.delete(pubkey);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    // Hibernatable accept: the socket survives DO eviction and deploys. The
    // pubkey rides on the socket itself (serializeAttachment), so a woken DO can
    // rebuild the session from the parked socket alone.
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ pubkey });
    // Answer pings without waking the DO — keeps parked sockets warm for cheap.
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));

    const session = this.buildSession(server, row, items);
    this.sessions.set(pubkey, session);

    // A dropped connection that comes back within the grace window is a
    // re-weave, not an arrival: no fanfare, no re-reading the intro, and the
    // room comes back brief. A genuine return (or a first arrival) gets the
    // full welcome and the full room.
    const left = this.leftAt.get(pubkey);
    const reconnecting = !created && left !== undefined && Date.now() - left < RECONNECT_GRACE_MS;
    this.leftAt.delete(pubkey);

    if (reconnecting) {
      this.send(session, "— you take up the thread of the Door again —");
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
      this.roomFeed(session.roomId, `${session.name} blinks into being.`, pubkey);
    }
    // Either way, mark the wake room known and show it: full on a real arrival,
    // brief on a re-weave (you never left). Status goes first so the client
    // knows the room's name in time to paint it gold.
    session.visited.add(session.roomId);
    this.sendStatus(session);
    this.send(session, this.describeRoom(session, !reconnecting));
    this.sendCtx(session);
    await ai.provokeGrudges(this, session, false); // reconnect grace: no free first strike
    await this.persist();
    await this.ensureAlarm();

    return new Response(null, { status: 101, webSocket: client });
  }

  private async onLeave(session: Session): Promise<void> {
    if (this.sessions.get(session.pubkey) !== session) return; // displaced, already handled
    this.sessions.delete(session.pubkey);
    this.leftAt.set(session.pubkey, Date.now()); // so a quick return reads as a reconnect
    for (const c of this.creatures.values()) {
      if (c.target === session.pubkey) c.target = null;
    }
    this.roomFeed(session.roomId, `${session.name} fades from the world.`);
    await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
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
    };
  }

  // The owner's key, stashed on the socket at accept-time.
  private wsPubkey(ws: WebSocket): string | null {
    try {
      const a = ws.deserializeAttachment() as { pubkey?: string } | null;
      return a && typeof a.pubkey === "string" ? a.pubkey : null;
    } catch { return null; }
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
      this.sessions.set(pubkey, this.buildSession(ws, row, items));
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
    if (!isBench && !isTrade && !isForge && (frame?.t !== "cmd" || typeof frame.text !== "string")) return;

    // Token bucket per pubkey — castr's daily-cast pattern, compressed.
    const now = Date.now();
    session.tokens = Math.min(
      RATE_CAPACITY,
      session.tokens + ((now - session.tokensAt) / 1000) * RATE_REFILL_PER_SEC,
    );
    session.tokensAt = now;
    if (session.tokens < 1) {
      if (!isBench && !isTrade && !isForge) this.send(session, "You're moving faster than the dungeon can watch. Slow down.");
      return;
    }
    session.tokens -= 1;

    // The gatehouse bench (storage modal) and the keeper's hatch (trade
    // modal): each its own little protocol.
    if (isBench) return gate.handleBench(this, session, frame);
    if (isTrade) return gate.handleTrade(this, session, frame);
    if (isForge) return gate.handleForge(this, session, frame);

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
    if (session.resting && (cmd.verb === "go" || cmd.verb === "attack" || cmd.verb === "throw" || cmd.verb === "get" || cmd.verb === "drop")) {
      session.resting = false;
      this.send(session, "You rise.");
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
  ]);

  private async dispatch(session: Session, cmd: Command): Promise<void> {
    if (ZoneDO.NEEDS_CALM.has(cmd.verb) && this.inCombat(session)) {
      return this.send(session, "Not while something is trying to kill you.");
    }
    switch (cmd.verb) {
      case "help": return this.send(session, HELP_TEXT);
      case "look": return this.cmdLook(session, cmd.arg);
      case "go": return this.cmdGo(session, cmd.arg);
      case "say": return this.cmdSay(session, cmd.arg);
      case "attack": return this.cmdAttack(session, cmd.arg);
      case "throw": return this.cmdThrow(session, cmd.arg);
      case "stance": return this.cmdStance(session, cmd.arg);
      case "get": return this.cmdGet(session, cmd.arg);
      case "drop": return this.cmdDrop(session, cmd.arg);
      case "equip": return this.cmdEquip(session, cmd.arg);
      case "remove": return this.cmdRemove(session, cmd.arg);
      case "unlock": return this.cmdUnlock(session, cmd.arg);
      case "salvage": return gate.cmdSalvage(this, session, cmd.arg);
      case "forge": return gate.cmdForge(this, session, cmd.arg);
      case "repair": return gate.cmdRepair(this, session, cmd.arg);
      case "barter": return gate.cmdBarter(this, session);
      case "buy": return gate.cmdBuy(this, session, cmd.arg);
      case "offer": return gate.cmdOffer(this, session, cmd.arg);
      case "inventory": return this.cmdInventory(session);
      case "who": return this.cmdWho(session);
      case "name": return this.cmdName(session, cmd.arg);
      case "rest": return this.cmdRest(session);
      case "eat": return this.cmdEat(session, cmd.arg);
      case "bandage": return this.cmdBandage(session, cmd.arg);
      case "light": return this.cmdLight(session);
      case "carve": return this.cmdCarve(session, cmd.arg);
      case "claim": return gate.cmdClaim(this, session, cmd.arg);
      case "stash": return gate.cmdStore(this, session, cmd.arg, "lockbox");
      case "unstash": return gate.cmdRetrieve(this, session, cmd.arg, "lockbox");
      case "vault": return gate.cmdStore(this, session, cmd.arg, "vault");
      case "unvault": return gate.cmdRetrieve(this, session, cmd.arg, "vault");
      case "publish": return this.cmdPublish(session, cmd.arg);
      case "map": return this.cmdMap(session, cmd.arg);
      case "study": return this.cmdStudy(session, cmd.arg);
      case "journal": return this.cmdJournal(session);
      case "fish": return this.cmdFish(session);
      case "smoke": return this.cmdSmoke(session);
      case "squink": return this.cmdSquink(session);
      case "xyzzy": return this.cmdXyzzy(session);
    }
  }

  // The old word. Nothing happens — but the dungeon heard you ask.
  private cmdXyzzy(session: Session): void {
    this.send(session, "You mouth the old word into the dark. Nothing happens. Something, somewhere, declines to be impressed.");
  }

  // Light one from the tin. No stat, no cure — a moment's calm that costs you:
  // the smell rides the draft into the next room, and the dark leans in to look.
  // (What the tin is really worth is never said here. That's for the finding.)
  private cmdSmoke(session: Session): void {
    if (!session.items.some((c) => c.itemId === "dry-cigarettes")) {
      return this.send(session, "You pat yourself down for a smoke and come up with nothing but lint.");
    }
    this.send(session, "You knock one loose from the tin and light it. The first drag steadies your hands; for a breath, the dungeon is just a room you happen to be in.", "gain");
    this.roomFeed(session.roomId, `${session.name} lights a cigarette; the ember flares, then settles to a slow red eye.`, session.pubkey);
    this.roomSound(session.roomId, "A thread of tobacco smoke drifts in {dir}.");
    this.creatureNoise(session.roomId); // a lit ember and a smell — the dark notices
  }

  // Nobody knows what this does. That includes the dungeon.
  private cmdSquink(session: Session): void {
    this.send(session, "You squink. Somewhere below, something squinks back.");
    this.roomFeed(session.roomId, `${session.name} squinks. It echoes longer than it should.`, session.pubkey);
    this.roomSound(session.roomId, "Something squinks, {dir}.");
    this.creatureNoise(session.roomId); // squinking is not free
  }

  // ---- verbs ----

  private cmdLook(session: Session, arg: string): void {
    // A deliberate look always gives the full scene — and marks the room known,
    // so from here you get the brief view unless you ask again.
    if (!arg) { session.visited.add(session.roomId); return this.send(session, this.describeRoom(session, true)); }
    const world = this.world!;

    if (arg === "self" || arg === "me" || arg === "myself") return this.send(session, this.selfExamine(session));

    const creature = this.findCreatureIn(session.roomId, arg);
    if (creature) {
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      // The examine reads its live state in a full sentence (the room glance gets
      // the same tell as a terser clause) — a wound, a hunt, a hungry eye on a rival.
      const tell = ai.creatureTell(this, creature, session.pubkey);
      return this.send(session, `${tmpl.description} (${this.condition(creature)})${tell ? ` It is ${tell}.` : ""}`);
    }
    const groundItem = this.findItemIn(this.ground.get(session.roomId) ?? [], arg);
    if (groundItem) return this.send(session, world.itemTemplates.get(groundItem)!.description);
    const carried = this.findCarried(session, arg);
    if (carried) {
      const t = world.itemTemplates.get(carried.itemId)!;
      return this.send(
        session,
        t.description + (carried.serial !== null ? ` The dungeon's seal is on it. (mint #${carried.serial})` : ""),
      );
    }
    const other = this.findPlayerIn(session.roomId, arg);
    if (other) return this.send(session, `${other.name}, a fellow wanderer. Keys in pocket, nowhere to be.`);
    this.send(session, "You see nothing like that here.");
  }

  // Examine yourself: your afflictions in prose (the fx pills' longer form),
  // plus a quick read of how hurt you are and what's in your hands — the
  // legible-sim mirror turned on the player.
  private selfExamine(session: Session): string {
    const f = session.hp / session.maxHp;
    const state = f >= 1 ? "whole and unhurt" : f > 0.66 ? "bruised but sound" : f > 0.33 ? "badly hurt" : "at the very edge of it";
    const parts: string[] = [`You take stock of yourself: ${state}. [${session.hp}/${session.maxHp} hp]`];
    if (session.bleedTicks && session.bleedTicks > 0) parts.push("Blood runs from a gash that hasn't clotted.");
    if (session.hobbled) parts.push("One leg is a bad wound — you'd limp if you had to run.");
    if (session.stunned) parts.push("Your head still rings; the next moment won't quite be yours.");
    if (session.seizedBy) parts.push("Something has hold of you and won't let go.");
    if (session.resting) parts.push("You're at rest, catching your breath.");
    const weapon = this.equippedItem(session, "weapon");
    const armor = this.equippedItem(session, "armor");
    parts.push(weapon ? `You hold ${weapon.tmpl.name}.` : "Your hands are empty.");
    if (armor) parts.push(`You wear ${armor.tmpl.name}.`);
    return parts.join(" ");
  }

  // A lit torch throws light until it gutters (litUntil). Read everywhere the
  // dark matters: seeing a lightless room, and waking the fire-fear (ai.carriesFire
  // reads the same litUntil, so the two never disagree).
  private carriesLight(session: Session): boolean {
    return !!session.litUntil && Date.now() < session.litUntil;
  }

  // Kindle a torch: it burns for TORCH_BURN_MS, then gutters out. The torch is
  // spent into the flame at once (removed now), so burnout is just the clock
  // running down. One at a time — a fresh light won't waste another. An open
  // flame also wakes the fire-fear the world shipped dormant (carriesFire).
  private async cmdLight(session: Session): Promise<void> {
    if (this.carriesLight(session)) {
      return this.send(session, "Your torch already burns. Best not waste another until it's spent.");
    }
    const torch = session.items.find((c) => c.itemId === TORCH_ITEM);
    if (!torch) return this.send(session, "You have no torch to light.");
    // A torch burns in the off hand — the shield hand. Both hands on a two-handed
    // weapon leave nowhere to hold it; a shield gets set aside for the flame. The
    // choice the dark forces: light, or guard — not both.
    const weapon = this.equippedItem(session, "weapon");
    if (weapon && TWO_HANDED.has(weapon.tmpl.id)) {
      return this.send(session, `Both your hands are full of ${weapon.tmpl.name} — no free hand for a torch. Lower it first.`);
    }
    const shield = this.equippedItem(session, "shield");
    if (shield && this.inCombat(session)) {
      return this.send(session, "You can't fumble your shield down and a torch up while something wants your blood.");
    }
    if (shield) {
      shield.carried.equipped = false;
      await setEquipped(this.env.DB, shield.carried.rowId, false);
    }
    session.items.splice(session.items.indexOf(torch), 1);
    await removeItemRow(this.env.DB, torch.rowId); // spent into the burning
    session.litUntil = Date.now() + TORCH_BURN_MS;
    session.torchWarned = false;
    this.send(session, `You touch a spark to the pitch and the torch catches${shield ? `, ${shield.tmpl.name} set aside to hold it` : ""} — a low, guttering light pushes the dark back.`, "gain");
    this.roomFeed(session.roomId, `${session.name} kindles a torch; the light throws long shadows.`, session.pubkey);
    this.sendStatus(session);
    this.send(session, this.describeRoom(session, false)); // the dark may resolve, or the fire may scatter something
  }

  private async cmdGo(session: Session, dir: string): Promise<void> {
    if (!dir) return this.send(session, "Go where? (north, south, east, west, up, down)");
    const world = this.world!;
    const exit = (world.exits.get(session.roomId) ?? []).find((e) => e.dir === dir);
    if (!exit) return this.send(session, "There is no way " + dir + " from here.");

    // Held by a drowned thing: you can't just walk off. Trying is a struggle —
    // sometimes you tear loose and go, sometimes it drags you back.
    if (session.seizedBy) {
      const grip = this.creatures.get(session.seizedBy);
      if (!grip || grip.roomId !== session.roomId) {
        session.seizedBy = undefined;
      } else if (chance(SEIZE_BREAK_ODDS + (this.wearsTrait(session, SLICK) ? SLICK_BREAK_BONUS : 0))) {
        session.seizedBy = undefined;
        this.send(session, "You wrench free of its grip.");
      } else {
        return this.send(session, `${cap(world.mobTemplates.get(grip.templateId)!.name)} drags you back — you can't break away yet.`);
      }
    }

    // A wounded leg doesn't stop you fleeing — it makes you limp clear first. In
    // a fight, the first attempt starts you dragging toward the exit; you break
    // away only once HOBBLE_FLEE_MS has passed, exposed the whole time. Out of
    // combat you just walk (a limp, not a scramble). Deterministic, never a
    // dice-block. limpingSince gone stale (a prior fight) resets to a fresh drag.
    if (session.hobbled && this.inCombat(session)) {
      const now = Date.now();
      if (!session.limpingSince || now - session.limpingSince > HOBBLE_FLEE_MS * 2) {
        session.limpingSince = now;
        this.sendStatus(session);
        return this.send(session, "Your wounded leg won't answer — you start dragging yourself toward the way out. It takes a moment. (keep at it to break away)", "dmgin");
      }
      if (now - session.limpingSince < HOBBLE_FLEE_MS) {
        return this.send(session, `You're still hauling your bad leg toward the way ${dir} — not clear yet.`, "dmgin");
      }
      session.limpingSince = undefined; // enough — you wrench free and go (hobble stays till you rest)
      this.send(session, "You drag your wounded leg into motion and break away.");
    }

    const doorKey = `${session.roomId}:${dir}`;
    if (exit.key_item === DEEP_HEART && !this.openDoors.has(doorKey)) {
      // The corpse-key door: it takes a heart, and only a fresh one. No hoarded
      // key works here — you had to face the deep for this, and be quick with it.
      const heart = session.items.find((c) => c.itemId === DEEP_HEART);
      if (!heart) {
        return this.send(session, `A black iron door bars the way ${dir}, and cold pours up from under it. It has no keyhole. It wants something of the deep pressed to it — and still cold.`, "dmgin");
      }
      const at = await itemAcquiredAt(this.env.DB, heart.rowId);
      const fresh = at !== null && Math.floor(Date.now() / 1000) - at < HEART_FRESH_SEC;
      // Either way the heart leaves your hands — the door takes the offering, or
      // the slime is worthless and you're rid of it.
      session.items.splice(session.items.indexOf(heart), 1);
      await removeItemRow(this.env.DB, heart.rowId);
      if (!fresh) {
        return this.send(session, `You press the heart to the door — but the cold has gone out of it, and it's soft, grey, spoiled. The door does not stir. The slime sloughs from your hand and is gone.`, "dmgin");
      }
      // Once opened, open for everyone — until what lives beyond it returns.
      this.openDoors.add(doorKey);
      this.send(session, "You press the still-cold heart to the black door. For a moment nothing — then the door *takes* it, drinks the cold clean out of it, and grinds open. It stays open.", "unlock");
      this.roomFeed(session.roomId, `${session.name} presses something to the black door, and it grinds open.`, session.pubkey);
      this.roomSound(session.roomId, "Iron grinds against stone, {dir}.");
      this.creatureNoise(session.roomId);
    } else if (exit.key_item && exit.key_item !== DEEP_HEART && !this.openDoors.has(doorKey)) {
      if (!session.items.some((c) => c.itemId === exit.key_item)) {
        const key = world.itemTemplates.get(exit.key_item);
        return this.send(
          session,
          `A black iron door bars the way ${dir}. It wants ${key ? key.name : "a key"} you do not carry.`,
        );
      }
      // Once opened, open for everyone — until what lives beyond it returns.
      this.openDoors.add(doorKey);
      this.send(session, "The key turns of its own accord. The black door grinds open — and stays open.");
      this.roomFeed(session.roomId, "The black iron door grinds open.", session.pubkey);
      this.roomSound(session.roomId, "Iron grinds against stone, {dir}.");
      this.creatureNoise(session.roomId);
    }

    // A SENTINEL guards the way deeper. Asleep, you can step over it — and that
    // rouses it (you've opened the deep, and now it's up for whoever comes next).
    // Awake, it bars the descent outright: the only way down is to put it down.
    // Heading OUT toward the shallows is always free — it guards the descent, not
    // the exit.
    if (DEEP_ROOMS.has(exit.to_room)) {
      const guard = [...this.creatures.values()].find(
        (c) => c.roomId === session.roomId && SENTINELS.has(c.templateId),
      );
      if (guard) {
        const gt = world.mobTemplates.get(guard.templateId)!;
        if (this.sentinelAwake(guard)) {
          return this.send(session, `${cap(gt.name)} is awake and bars the stair, all three heads low and watching. There is no slipping past it now — put it down, or turn back.`, "dmgin");
        }
        guard.wakeUntil = Date.now() + HOUND_WAKE_MS; // step over it and it stirs
        this.send(session, `You pick your way over ${gt.name}, breath held. Behind you, three heads lift as one — the deep is open, and it is awake.`, "seize");
        this.roomFeed(session.roomId, `${cap(gt.name)} wakes with a low, tripled growl.`, session.pubkey);
        this.roomSound(session.roomId, "A low growl rolls up from {dir} — something big, and awake.");
      }
    }

    const wasFighting = this.inCombat(session);
    // Heavy mail turns blows, but it drags at the escape: leaving a fight in
    // weighted armor risks one parting strike on the way out. The quick flee
    // clean. (Armor still soaks it — that's what it's for.)
    if (wasFighting && this.wornWeight(session) > 0 && chance(PARTING_BLOW_CHANCE)) {
      const striker = [...this.creatures.values()].find(
        (c) => c.roomId === session.roomId && (c.target === session.pubkey || c.id === session.target),
      );
      if (striker) {
        const stmpl = world.mobTemplates.get(striker.templateId)!;
        let pdmg = randInt(stmpl.dmg_min, stmpl.dmg_max);
        pdmg = Math.max(1, Math.round(pdmg * ARMOR_K / (this.equippedArmor(session) + ARMOR_K))); // % mitigation, never immunity
        pdmg = Math.max(1, Math.round(pdmg * STANCE[session.stance].def));
        session.hp -= pdmg;
        this.send(session, `The mail drags at you — ${stmpl.name} lands a parting blow for ${pdmg}. [${Math.max(0, session.hp)}/${session.maxHp} hp]`);
        if (session.hp <= 0) {
          await this.onPlayerDeath(session, stmpl);
          return;
        }
      }
    }
    // Before you slip out, a dormant listener may hear you move for the door
    // and swing as you go — you still leave (if you live), but not always clean.
    if (await ai.wakeListeners(this, session, session.roomId, WAKE_EXIT, "hears you move — and swings as you slip past!")) {
      if (session.hp <= 0) return; // felled on the way out
    }
    session.target = null;
    session.staggered = false; // the opening closes behind you
    session.buying = undefined; // walk off mid-trade and the keeper sweeps it back
    for (const c of this.creatures.values()) {
      if (c.target === session.pubkey && c.roomId === session.roomId) c.target = null;
    }

    const from = session.roomId;
    session.roomId = exit.to_room;
    this.addTrace(session.roomId, { kind: "passage", at: Date.now() });
    this.roomFeed(from, `${session.name} ${wasFighting ? "flees" : "leaves"} ${dir}.`);
    this.roomFeed(session.roomId, `${session.name} arrives.`, session.pubkey);
    // Status first, so the client learns the room's name before the room text
    // prints — the name line paints gold even the very first time you see it.
    this.sendStatus(session);
    this.send(session, this.enterDescribe(session));
    this.refreshRoomCtx(from);
    this.refreshRoomCtx(session.roomId);
    await ai.provokeGrudges(this, session, true); // you walked in — a grudge-holder gets the jump
    // …and a dormant listener might just catch the sound of your arrival.
    await ai.wakeListeners(this, session, session.roomId, WAKE_ENTER, "twists toward the sound of you and lunges!");
    await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
    await this.persist();
  }

  private cmdSay(session: Session, msg: string): void {
    if (!msg) return this.send(session, "Say what?");
    this.send(session, `You say, "${msg}"`);
    this.roomFeed(session.roomId, `${session.name} says, "${msg}"`, session.pubkey);
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
      this.roomFeed(session.roomId, `${session.name} has the whole pack now.`, session.pubkey);
    }
  }

  private async cmdAttack(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Attack what?");
    const creature = this.findCreatureIn(session.roomId, arg);
    if (!creature) return this.send(session, "Nothing by that name is here to fight.");
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    // Initiative: strike something that hasn't marked you — no fight on, no
    // grudge held — and the first blow lands heavy, before it can answer.
    const unaware = !creature.target && !ai.remembers(this, creature, session.pubkey, Date.now());
    session.target = creature.id;
    creature.hidden = false; // a lurker you've struck is unseen no longer — reveal it (room, chip, study)
    if (SENTINELS.has(creature.templateId)) creature.wakeUntil = Date.now() + HOUND_WAKE_MS; // a blow rouses a sleeping guardian
    this.rousePack(session, creature); // hyenas: strike one and the pack turns on you
    if (unaware) {
      const weapon = this.equippedItem(session, "weapon");
      let dmg = Math.round(
        (randInt(PLAYER_DMG_MIN, PLAYER_DMG_MAX) + (weapon ? this.effDmg(weapon) : 0)) *
          STANCE[session.stance].atk * AMBUSH_MULT,
      );
      if (session.hp < session.maxHp * WOUNDED_FRACTION) dmg = Math.round(dmg * WOUNDED_DMG_MULT);
      // No crit on top: the surprise IS the crit. (Stacked, a pebble
      // one-shots skeletons; unstacked, an ambush is strong, not a cannon.)
      // A point slips plate, a blunt weapon caves it: both ignore that much armor.
      dmg = Math.max(1, dmg - Math.max(0, tmpl.armor - this.armorIgnore(weapon)));
      creature.hp -= dmg;
      ai.addGrudge(this, creature, session.pubkey);
      this.roomFeed(session.roomId, `${session.name} falls on ${tmpl.name} without warning!`, session.pubkey);
      this.combatNoise(session.roomId);
      if (weapon) await this.wear(session, weapon.carried, weapon.tmpl, HOLLOW.has(tmpl.id) ? WEAPON_WEAR_HOLLOW : WEAPON_WEAR);
      if (creature.hp <= 0) {
        this.send(session, `You fall on ${tmpl.name} before it marks you — one heavy blow, for ${dmg}.`, "dmgout big");
        await this.onCreatureDeath(session, creature, tmpl);
        await this.ensureAlarm();
        return;
      }
      creature.target = session.pubkey;
      this.send(session, `You fall on ${tmpl.name} before it marks you — the first blow lands heavy for ${dmg}. (${this.condition(creature)})`, "dmgout big");
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
    this.roomFeed(session.roomId, `${session.name} attacks ${tmpl.name}!`, session.pubkey);
    // A fight is loud, but the blind sentinels sleep through the din now — only
    // a lurker in the room strikes at the sound (WAKE_NOISE, fromNoise).
    await ai.wakeListeners(this, session, session.roomId, WAKE_NOISE, "clatters awake at the noise and turns on you!", true);
    await this.ensureAlarm();
  }

  private async cmdGet(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Get what?");
    // A journal on the floor is instanced — picking it up carries its pages
    // (and whoever's logs they were). Matched first, ahead of plain loot.
    const inst = this.takeGroundInstance(session.roomId, arg);
    if (inst) return this.getInstanced(session, inst);
    const here = this.ground.get(session.roomId) ?? [];
    const itemId = this.findItemIn(here, arg);
    if (!itemId) return this.send(session, "That isn't lying around here.");
    const tmpl = this.world!.itemTemplates.get(itemId)!;
    if (!this.packRoom(session, itemId)) {
      return this.send(session, `Your pack is full (${PACK_CAP} slots). Drop something, or bank it at a gate.`);
    }

    here.splice(here.indexOf(itemId), 1);
    const rowId = uuid();
    // Gear on the floor carries the wear it landed with (a dropped or fumbled
    // blade doesn't heal by touching the ground). Un-stamped gear is fresh to the
    // floor — spilled off the dead or seeded here — so it rolls scavenged. Non-gear → 100.
    const condKey = `${itemId}@${session.roomId}`;
    const condition = this.groundCond.has(condKey)
      ? this.groundCond.get(condKey)!
      : rollGearCondition(tmpl.slot, false);
    this.groundCond.delete(condKey);
    const carried: CarriedItem = { rowId, itemId, serial: null, equipped: false, condition };
    session.items.push(carried);
    // A regrowing spawn (the shrine's key, a gate's rock) keeps exactly ONE
    // instance in its room. Only re-seed if this pickup left the room without
    // one AND nothing's already regrowing here — otherwise throwing a rock and
    // fetching it back mid-fight would queue a fresh regrow every grab, and the
    // stones would breed. (`here` already had the taken item spliced out above.)
    if (this.world!.groundSpawns.some((g) => g.item_id === itemId && g.room_id === session.roomId && g.regrows)) {
      const stillHere = here.includes(itemId);
      const alreadyRegrowing = this.regrow.some((r) => r.itemId === itemId && r.roomId === session.roomId);
      if (!stillHere && !alreadyRegrowing) {
        this.regrow.push({ itemId, roomId: session.roomId, at: Date.now() + randInt(REGROW_MIN_MS, REGROW_MAX_MS) });
      }
    }
    await insertLoot(this.env.DB, rowId, session.pubkey, itemId, null, condition);
    // Friendly: your FIRST weapon/armor goes on automatically; switching later
    // is a deliberate `equip`. (Never overrides something you've already got on,
    // and never auto-crosses the two-handed rule — that pairing is deliberate.)
    const crossesHands =
      (tmpl.slot === "weapon" && TWO_HANDED.has(tmpl.id) && this.equippedItem(session, "shield") !== null) ||
      (tmpl.slot === "shield" && TWO_HANDED.has(this.equippedItem(session, "weapon")?.tmpl.id ?? ""));
    let readied = "";
    if (tmpl.slot !== "" && !this.equippedItem(session, tmpl.slot) && !crossesHands) {
      carried.equipped = true;
      await setEquipped(this.env.DB, rowId, true);
      readied = tmpl.slot === "weapon" ? " You take it in hand." : " You pull it on.";
    }
    // Stooping under a swing is an opening — snatching your fumbled blade
    // back (or recycling a thrown rock) is possible, never free.
    let stooped = "";
    if (this.inCombat(session)) {
      session.staggered = true;
      stooped = " You stoop for it under the swing — an opening.";
    }
    this.send(session, `You take ${tmpl.name}.` + readied + stooped);
    this.roomFeed(session.roomId, `${session.name} takes ${tmpl.name}.`, session.pubkey, (RARITY_RANK[tmpl.rarity] ?? 0) >= 2); // ordinary pickups local; rare+ still relays ("someone grabbed the legendary")
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }

  private async cmdDrop(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Drop what?");
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    const itemId = carried.itemId;
    const tmpl = this.world!.itemTemplates.get(itemId)!;

    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    // Setting a sealed thing down is letting it go: the claim is released.
    if (carried.serial !== null) await voidMint(this.env.DB, carried.serial);
    // A journal keeps its pages when it hits the floor (they're keyed to the
    // book, not the row) — it lands instanced so the next hand inherits them.
    if (carried.journalId) {
      this.dropInstance(session.roomId, itemId, carried.journalId);
    } else {
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), itemId]);
      if (tmpl.slot !== "") this.groundCond.set(`${itemId}@${session.roomId}`, carried.condition); // gear keeps its wear on the floor
      if (tmpl.edible) this.rot.push({ itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
    }
    this.send(
      session,
      carried.serial !== null
        ? `You set ${tmpl.name} down. The seal cracks as it leaves your hands — the claim is no longer yours.`
        : `You drop ${tmpl.name}.`,
    );
    this.roomFeed(session.roomId, `${session.name} drops ${tmpl.name}.`, session.pubkey);
    this.refreshRoomCtx(session.roomId);
    await this.persist();
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

    const unaware = !creature.target && !ai.remembers(this, creature, session.pubkey, Date.now());
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
      if (itmpl.edible) this.rot.push({ itemId: carried.itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
      if (!creature.target) creature.target = session.pubkey;
      ai.addGrudge(this, creature, session.pubkey);
      session.target = creature.id;
      this.send(session, `Your throw sails wide — ${itmpl.name} cracks against the stone. ${cap(tmpl.name)} turns on you.`);
      this.roomFeed(session.roomId, `${session.name} hurls ${itmpl.name} — and misses.`, session.pubkey);
      this.combatNoise(session.roomId);
      this.refreshRoomCtx(session.roomId);
      await this.persist();
      await this.ensureAlarm();
      return;
    }
    let dmg = randInt(THROW_DMG_MIN, THROW_DMG_MAX) + this.effStat(itmpl.dmg, carried.condition);
    dmg = Math.round(dmg * STANCE[session.stance].atk);
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
    const shattered = chance(HOLLOW.has(tmpl.id) ? THROW_SHATTER_HOLLOW : THROW_SHATTER);
    if (!shattered) {
      this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), carried.itemId]);
      if (itmpl.slot !== "") this.groundCond.set(`${carried.itemId}@${session.roomId}`, carried.condition); // a thrown blade keeps its wear where it lands
      if (itmpl.edible) this.rot.push({ itemId: carried.itemId, roomId: session.roomId, at: Date.now() + ROT_MS });
    }

    creature.hp -= dmg;
    ai.addGrudge(this, creature, session.pubkey);
    session.target = creature.id;
    this.roomFeed(session.roomId, `${session.name} hurls ${itmpl.name} at ${tmpl.name}!`, session.pubkey);
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
        this.roomFeed(session.roomId, `${cap(tmpl.name)} staggers where it stands.`, session.pubkey);
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
    this.send(session, `You hurl ${itmpl.name} into the dark. It cracks and clatters off the stone — the sound carries.`);
    this.roomFeed(session.roomId, `${session.name} sends ${itmpl.name} clattering across the room.`, session.pubkey);
    // The clatter: players next door hear it (WS-only, no relay flood), the idle
    // curious drift in to look, and any lurker here may drop on the noise.
    this.roomSound(session.roomId, "Something clatters {dir}.");
    this.creatureNoise(session.roomId);
    await ai.wakeListeners(this, session, session.roomId, WAKE_NOISE, "drops from the dark, roused by the clatter!", true);
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }

  private async cmdStance(session: Session, arg: string): Promise<void> {
    const alias: Record<string, Stance> = {
      reckless: "reckless", aggressive: "reckless", aggro: "reckless", offensive: "reckless", berserk: "reckless", wild: "reckless",
      steady: "steady", balanced: "steady", neutral: "steady", normal: "steady", even: "steady",
      guarded: "guarded", defensive: "guarded", defend: "guarded", cautious: "guarded", turtle: "guarded", guard: "guarded",
    };
    if (!arg) {
      return this.send(session, `You fight ${session.stance}. Change it — stance reckless | steady | guarded (trade offense for defense).`);
    }
    const s = alias[arg.toLowerCase().trim()];
    if (!s) return this.send(session, "Pick a stance: reckless, steady, or guarded.");
    if (s === session.stance) return this.send(session, `You already fight ${s}.`);
    session.stance = s;
    // Persisted to the player row (keyed by pubkey), so it follows you anywhere.
    await setStance(this.env.DB, session.pubkey, s);
    this.send(session, s === "reckless"
      ? "You drop your guard and swing to wound — you hit half again as hard, and take it half again as hard. A true gamble."
      : s === "guarded"
      ? "You close up behind your guard — far less gets through, claws that would open you are half-turned, and a raised shield catches more. But your blows lose their bite."
      : "You settle into an even, steady footing.");
    // The stance chips show the two you're NOT in — so the row has to redraw the
    // moment you switch, or the one you just tapped stays put and it reads as if
    // nothing took. (This was the whole "stances don't work" bug: they worked,
    // the buttons just never moved.)
    this.sendCtx(session);
  }

  private async cmdEquip(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Equip what?");
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    if (tmpl.slot === "") {
      return this.send(session, `You can't wear or wield ${tmpl.name}.`);
    }
    if (carried.equipped) {
      return this.send(session, `You already have ${tmpl.name} ${tmpl.slot === "weapon" ? "in hand" : "on"}.`);
    }
    // Combat narrows this: worn gear cannot be wrestled on or off mid-fight at
    // all — only the weapon in your hand swaps, and that leaves an opening.
    const fighting = this.inCombat(session);
    if (fighting && tmpl.slot !== "weapon") {
      return this.send(session, "You cannot change your gear while something wants your blood.");
    }
    // TWO_HANDED steel wants both hands: no shield alongside the pike, no
    // pike over a shield. Not enforced mid-fight juggling — just refused.
    if (tmpl.slot === "weapon" && TWO_HANDED.has(tmpl.id) && this.equippedItem(session, "shield")) {
      return this.send(session, `${cap(tmpl.name)} wants both hands — put up your shield first.`);
    }
    if (tmpl.slot === "shield") {
      const inHand = this.equippedItem(session, "weapon");
      if (inHand && TWO_HANDED.has(inHand.tmpl.id)) {
        return this.send(session, `Both your hands are full of ${inHand.tmpl.name}. Lower it first.`);
      }
    }
    // A shield or a two-handed weapon wants the hand your torch is in — taking it
    // up snuffs the flame. Light or guard, not both (the reverse of cmdLight).
    if (this.carriesLight(session) && (tmpl.slot === "shield" || (tmpl.slot === "weapon" && TWO_HANDED.has(tmpl.id)))) {
      session.litUntil = undefined;
      session.torchWarned = false;
      this.send(session, DARK_ROOMS.has(session.roomId) && !this.outOfWorld(session)
        ? "The torch gutters out — no hand left to hold it, and the dark closes in."
        : "The torch gutters out — no hand left to hold it.");
    }
    // One item per slot — set down whatever occupies it first.
    const current = this.equippedItem(session, tmpl.slot);
    if (current) {
      current.carried.equipped = false;
      await setEquipped(this.env.DB, current.carried.rowId, false);
    }
    carried.equipped = true;
    await setEquipped(this.env.DB, carried.rowId, true);
    if (fighting) session.staggered = true;
    this.send(session, (tmpl.slot === "weapon"
      ? `You take ${tmpl.name} in hand${current ? `, setting aside ${current.tmpl.name}` : ""}.`
      : `You pull on ${tmpl.name}${current ? `, shrugging off ${current.tmpl.name}` : ""}.`)
      + (fighting ? " Your eyes leave the fight for a heartbeat — an opening." : ""));
  }

  private async cmdRemove(session: Session, arg: string): Promise<void> {
    if (!arg) return this.send(session, "Remove what?");
    const carried = this.findCarried(session, arg);
    if (!carried) return this.send(session, "You carry nothing like that.");
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    if (!carried.equipped) return this.send(session, `You aren't using ${tmpl.name}.`);
    // Same combat rules as putting things on: armor stays where it is, and
    // lowering your blade mid-fight is an opening.
    const fighting = this.inCombat(session);
    if (fighting && tmpl.slot !== "weapon") {
      return this.send(session, "You cannot change your gear while something wants your blood.");
    }
    carried.equipped = false;
    await setEquipped(this.env.DB, carried.rowId, false);
    if (fighting) session.staggered = true;
    this.send(session, (tmpl.slot === "weapon" ? `You lower ${tmpl.name}.` : `You take off ${tmpl.name}.`)
      + (fighting ? " An opening." : ""));
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
    if (!key) return this.send(session, `${cap(cache.name)} is locked. You'd need ${keyT?.name ?? "the right key"}.`);
    // Spend the key and start the refill clock.
    session.items.splice(session.items.indexOf(key), 1);
    await removeItemRow(this.env.DB, key.rowId);
    this.cacheSpent.set(cache.id, Date.now() + cache.refillSecs * 1000);
    this.placeCache(cache); // looted: it will refill somewhere new in its tier (hidden here until then)
    this.send(session, `You work ${keyT?.name ?? "the key"} into the lock. It gives with a groan, and ${cache.name} swings open.`, "unlock");
    this.roomFeed(session.roomId, `${session.name} forces ${cache.name} open.`, session.pubkey);
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
      if (await this.grantItem(session, item.id, { kept: true })) {
        this.send(session, `Inside: ${item.name}.${this.itemStat(item)} [${item.rarity}] (unclaimed — the gate can seal it)`);
      } else {
        this.ground.set(session.roomId, [...(this.ground.get(session.roomId) ?? []), item.id]);
        if (item.slot !== "") this.groundCond.set(`${item.id}@${session.roomId}`, rollGearCondition(item.slot, true));
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
  public enterStep(session: Session, mode: "trading" | "forging" | "sorting"): void {
    if (session.away) return;
    const atGate = this.world!.entryRooms.has(session.roomId);
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
      for (const c of this.creatures.values()) {
        if (c.target === session.pubkey) c.target = null;
      }
    }
    const msg = mode === "trading"
      ? `${session.name} steps up to the keeper's hatch.`
      : mode === "forging"
        ? `${session.name} steps to the bench and stirs the brazier to life.`
        : atGate
          ? `${session.name} steps into the gatehouse to sort their kit.`
          : `${session.name} crouches to dig through a lockbox.`;
    this.roomFeed(session.roomId, msg, session.pubkey);
    this.refreshRoomCtx(session.roomId);
  }

  // Step a text-stance player back into the world (any command that isn't part
  // of the current stance, or a 'look'). Mirrors leaveTrade/leaveForge; the
  // close frame is a no-op with no modal open. An unfinished trade sweeps back.
  private async leaveStep(session: Session): Promise<void> {
    const wasTrading = !!session.trading;
    const frame = session.trading ? "trade" : session.forging ? "forge" : "bench";
    session.away = false;
    session.trading = false;
    session.forging = false;
    session.sorting = false;
    session.stepText = false;
    session.buying = undefined;
    try { session.ws.send(JSON.stringify({ v: 0, t: frame, open: false })); } catch {}
    this.roomFeed(session.roomId, `${session.name} steps back from the ${wasTrading ? "keeper's hatch" : "bench"}.`, session.pubkey);
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
    if (REACH_ITEMS.has(t.id)) bits.push("reach");
    const pierce = PIERCE.get(t.id);
    if (pierce) bits.push(`pierces ${pierce}`);
    if (TWO_HANDED.has(t.id)) bits.push("two-handed");
    if (PADDED.has(t.id)) bits.push("padded");
    if (WARDHIDE.has(t.id)) bits.push("wards wounds");
    if (QUIET_ITEMS.has(t.id)) bits.push("quiet");
    if (SLICK.has(t.id)) bits.push("slick");
    if (STRAPPED.has(t.id)) bits.push("strapped-down");
    const spike = THORNS.get(t.id);
    if (spike) bits.push(`spiked ${spike}`);
    return bits.length ? ` (${bits.join(", ")})` : "";
  }

  // Is this a plain carryable (food, trophy, key) that can safely stack, or gear
  // that must be listed on its own (its wear and slot differ per instance)?
  public isGear(itemId: string): boolean {
    const t = this.world!.itemTemplates.get(itemId);
    return !!t && t.slot !== "";
  }

  // A fungible pack item — trophies, food, scrap, keys, cigarettes. Many share
  // one slot. Gear (has a slot), sealed items (own serial), journals (own pages),
  // and maps (own reading) are each their own slot and never stack.
  public stackable(itemId: string, serial: number | null, journalId?: string): boolean {
    if (serial !== null || journalId) return false;
    if (MAP_ITEMS.has(itemId) || itemId === JOURNAL_ITEM) return false;
    return !this.isGear(itemId);
  }

  // How many slots a set of carried items fills: each non-stacking item is one,
  // and every distinct stacking KIND is one, however deep the pile. What you
  // WEAR rides on your body, not in the pack — equipped gear costs no slot, so
  // arming up never eats your carrying room (and stripping down never strands you).
  public slotsUsed(items: CarriedItem[]): number {
    const kinds = new Set<string>();
    let loose = 0;
    for (const c of items) {
      if (c.equipped) continue; // worn/wielded — on the body, not in the pack
      if (this.stackable(c.itemId, c.serial, c.journalId)) kinds.add(c.itemId);
      else loose++;
    }
    return loose + kinds.size;
  }

  // Room for one more of itemId in a given store (default the pack)? A stacking
  // kind you already hold always fits — it joins the pile; otherwise you need a
  // free slot under the cap.
  public hasRoom(items: CarriedItem[], itemId: string, cap: number): boolean {
    if (this.stackable(itemId, null) && items.some((c) => c.itemId === itemId && this.stackable(c.itemId, c.serial, c.journalId))) return true;
    return this.slotsUsed(items) < cap;
  }

  public packRoom(session: Session, itemId: string): boolean {
    return this.hasRoom(session.items, itemId, PACK_CAP);
  }

  // Mint one item into the pack, if there's room. Returns the row, or null when
  // the pack is full (the caller decides: refuse, or spill to the ground). The
  // single doorway for loot onto the body — cap enforcement lives here.
  public async grantItem(session: Session, itemId: string, opts?: { condition?: number; kept?: boolean; journalId?: string }): Promise<CarriedItem | null> {
    if (!this.packRoom(session, itemId)) return null;
    const rowId = uuid();
    // Gear arrives already used — pristine is rare. `kept` gear (a sealed coffer's)
    // is better preserved than what's stripped off the dead. Non-gear rolls 100.
    const slot = this.world!.itemTemplates.get(itemId)?.slot ?? "";
    const condition = opts?.condition ?? rollGearCondition(slot, opts?.kept ?? false);
    const carried: CarriedItem = { rowId, itemId, serial: null, equipped: false, condition, journalId: opts?.journalId };
    session.items.push(carried);
    await insertLoot(this.env.DB, rowId, session.pubkey, itemId, null, carried.condition);
    if (opts?.journalId) await setItemJournalId(this.env.DB, rowId, opts.journalId);
    return carried;
  }

  private itemLine(c: CarriedItem): string {
    const t = this.world!.itemTemplates.get(c.itemId);
    let s = `  ${t ? t.name : c.itemId} [${t?.rarity ?? "?"}]${this.itemStat(t)}`;
    const tags: string[] = [];
    if (c.equipped) tags.push(t?.slot === "weapon" ? "wielded" : "worn");
    if (c.serial !== null) tags.push(`sealed #${c.serial}`);
    // Gear shows its wear whether sealed or not — sealed just wears slower, and
    // you need to see it to know when to mend it.
    if (t && t.slot !== "") tags.push(this.conditionWord(c.condition) || "sound");
    if (tags.length) s += ` — ${tags.join(", ")}`;
    return s;
  }

  // One keeping's contents as text, grouped like the modal: fungibles collapse
  // to a count, gear/equipped/sealed list on their own line.
  private keepingLines(items: CarriedItem[], header: string): string[] {
    const world = this.world!;
    const lines = [header];
    if (items.length === 0) { lines.push("  — empty —"); return lines; }
    const counts = new Map<string, number>();
    for (const c of items) {
      if (this.stackable(c.itemId, c.serial, c.journalId) && !c.equipped) {
        counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + 1);
      }
    }
    for (const [id, n] of counts) {
      const t = world.itemTemplates.get(id);
      lines.push(`  ${t ? t.name : id}${n > 1 ? ` (x${n})` : ""} [${t?.rarity ?? "?"}]${this.itemStat(t)}`);
    }
    for (const c of items) {
      if (this.stackable(c.itemId, c.serial, c.journalId) && !c.equipped) continue; // stacked above
      lines.push(this.itemLine(c));
    }
    return lines;
  }

  // Typed 'inventory'. At a gate it steps you out (like opening the keeping
  // modal): safe, wounds closing, and all three keepings — pack, lockbox, deep
  // keep — laid out, with 'stash'/'unstash'/'vault' to move things and 'look'
  // to step back. In the dungeon it's a light glance (pack + the lockbox that
  // rides with you), no stepping out. In a fight, your pack only.
  private async cmdInventory(session: Session): Promise<void> {
    const world = this.world!;
    if (this.inCombat(session)) {
      return this.send(session, this.keepingLines(session.items, `You carry (${this.slotsUsed(session.items)}/${PACK_CAP}):`).join("\n"));
    }
    const atGate = world.entryRooms.has(session.roomId);
    const lockbox = await loadContainer(this.env.DB, session.pubkey, "lockbox");
    const out: string[] = [];
    out.push(...this.keepingLines(session.items, `You carry (${this.slotsUsed(session.items)}/${PACK_CAP}):`));
    out.push(...this.keepingLines(lockbox, `Lockbox (${this.slotsUsed(lockbox)}/${LOCKBOX_CAP}):`));
    if (atGate) {
      const vault = await loadContainer(this.env.DB, session.pubkey, "vault");
      out.push(...this.keepingLines(vault, `The deep keep (${this.slotsUsed(vault)}/${VAULT_CAP}):`));
      this.enterStep(session, "sorting"); // step out to sort, safe in the gatehouse
      out.push("('stash'/'unstash'/'vault' to move things; 'look' steps you back into the world.)");
    } else {
      out.push("(The deep keep waits at the gates. 'stash'/'unstash' move things to the lockbox that rides with you.)");
    }
    this.send(session, out.join("\n"));
  }

  private cmdWho(session: Session): void {
    const world = this.world!;
    const awake = [...this.sessions.values()].filter((s) => !s.away);
    const lines = [`Awake in the Door (${awake.length}):`];
    for (const s of awake) {
      lines.push(`  ${s.name} — ${world.rooms.get(s.roomId)?.name ?? s.roomId}`);
    }
    this.send(session, lines.join("\n"));
  }

  private async cmdName(session: Session, arg: string): Promise<void> {
    const name = arg.trim();
    if (!name) return this.send(session, `Name yourself what? (name <yourname>)`);
    if (!/^[a-z0-9][a-z0-9_-]{1,15}$/i.test(name)) {
      return this.send(
        session,
        "Names are 2-16 characters: letters, numbers, - or _.",
      );
    }
    if (name.toLowerCase() === session.name.toLowerCase()) {
      return this.send(session, `You are already ${session.name}.`);
    }
    const ok = await renamePlayer(this.env.DB, session.pubkey, name);
    if (!ok) return this.send(session, `Someone in the dungeon already answers to ${name}.`);
    const old = session.name;
    session.name = name;
    session.named = true;
    this.send(session, `The dungeon will remember you as ${name}.`);
    this.roomFeed(session.roomId, `${old} is now known as ${name}.`, session.pubkey);
    this.sendStatus(session);
  }

  private cmdRest(session: Session): void {
    if (this.inCombat(session)) {
      return this.send(session, "Rest, now? Something here has other plans for you.");
    }
    // You can't close your eyes with something sharing the room, even if it
    // hasn't turned on you yet — a rat in the corner is a knife waiting to be
    // drawn. (A hidden lurker doesn't block it: you don't know it's there, and
    // resting into its jaws is exactly the risk it lives on.)
    const menace = [...this.creatures.values()].find(
      (c) => c.roomId === session.roomId && !c.hidden,
    );
    if (menace) {
      const mt = this.world!.mobTemplates.get(menace.templateId)!;
      return this.send(session, `Not with ${mt.name} in the room. You'd never close your eyes.`);
    }
    if (session.hp >= session.maxHp) return this.send(session, "You are unhurt.");
    if (session.resting) return this.send(session, "You are already resting.");
    session.resting = true;
    this.addTrace(session.roomId, { kind: "rest", at: Date.now() });
    this.send(session, pick([
      "You settle against the cold stone. Wounds close slowly here — any effort ends it.",
      "You lower yourself down and let your breathing slow. The ache eases, little by little — any effort ends it.",
      "You find a wall to put your back to and go still. Blood stops where it was running — any effort ends it.",
      "You sink down where you stand and let the dark hold you a while. The hurt recedes — any effort ends it.",
    ]));
    this.roomFeed(session.roomId, `${session.name} settles down to rest.`, session.pubkey, false); // resting: local only, nobody spectates a nap
  }

  // Fishing: only off the Pocket of Air's dry shelf, a line dropped into the
  // black flood below. Rarely anything takes it — but a fish is good, fresh
  // food, and the eel is a real meal. A short patience between casts.
  private async cmdFish(session: Session): Promise<void> {
    const world = this.world!;
    if (this.inCombat(session)) return this.send(session, "Not with something trying to kill you.");
    if (!FISHING_ROOMS.has(session.roomId)) {
      return this.send(session, "There's no water here to fish. You'd need to drop a line where the flood pools deep.");
    }
    const now = Date.now();
    if (session.lastFishAt && now - session.lastFishAt < FISH_COOLDOWN_MS) {
      return this.send(session, "You've only just cast. Let the line settle.");
    }
    session.lastFishAt = now;
    if (!chance(FISH_ODDS)) {
      return this.send(session, pick([
        "You lower a line into the black water and wait. Nothing takes it.",
        "The water lies flat and still. Whatever's down there isn't hungry.",
        "A tug — then slack. Gone before you could haul it up.",
        "You wait, and wait, and the flood keeps its own.",
        "Something brushes the line and thinks better of it.",
      ]));
    }
    const fishId = chance(PALE_EEL_ODDS) ? "pale-eel" : "cave-fish";
    const fish = world.itemTemplates.get(fishId);
    if (!fish) return this.send(session, "Something takes the line — but it slips free before you can land it.");
    if (!(await this.grantItem(session, fish.id))) {
      return this.send(session, `Something takes the line — but your pack is full, and you have to let ${fish.name} go.`);
    }
    this.send(session, (fishId === "pale-eel"
      ? `The line goes taut and FIGHTS you — you haul up ${fish.name}, thrashing.`
      : `The line goes taut — you haul up ${fish.name}.`)
      + ` [${fish.rarity}] (unclaimed — good, fresh food)`, "gain");
    this.roomFeed(session.roomId, `${session.name} lands a catch from the flood.`, session.pubkey);
    this.sendCtx(session);
    await this.persist();
  }

  private cmdCarve(session: Session, arg: string): void {
    const words = arg.replace(/[\r\n\t]+/g, " ").replace(/"/g, "'").trim();
    if (!words) return this.send(session, "Carve what? (carve <words>)");
    if (words.length > CARVE_MAX_LEN) {
      return this.send(session, `The stone only takes ${CARVE_MAX_LEN} characters. Chisel it down.`);
    }
    this.addTrace(session.roomId, { kind: "carve", at: Date.now(), label: session.name, words });
    this.send(session, `You scratch it into the stone: "${words}"`, "study");
    this.roomFeed(session.roomId, `${session.name} scratches something into the wall.`, session.pubkey);
    this.roomSound(session.roomId, "A faint scratching, {dir}.");
    this.creatureNoise(session.roomId);
  }

  // Take one thing out of the pack and eat it: off the inventory, out of the
  // DB, its seal (if any) voided, and the heal applied. Shared by the `eat`
  // command and the auto-eat reflex, so both do it exactly the same way.
  private async consumeFood(
    session: Session,
    carried: CarriedItem,
  ): Promise<{ before: number; tmpl: ItemTemplate }> {
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    if (carried.serial !== null) await voidMint(this.env.DB, carried.serial);
    const before = session.hp;
    session.hp = Math.min(session.maxHp, session.hp + tmpl.heal);
    return { before, tmpl };
  }

  // The provisional food a player is carrying, weakest heal first — the order
  // both manual `eat` (unhurt-safe default) and auto-eat draw from. Sealed
  // rations are never touched by accident.
  private carriedFood(session: Session): CarriedItem[] {
    const world = this.world!;
    return session.items
      .filter((c) => world.itemTemplates.get(c.itemId)?.edible)
      .sort((a, b) =>
        Number(a.serial !== null) - Number(b.serial !== null) ||
        (world.itemTemplates.get(a.itemId)!.heal - world.itemTemplates.get(b.itemId)!.heal));
  }

  private async cmdEat(session: Session, arg: string): Promise<void> {
    const world = this.world!;
    // Provisional food first — nobody eats the sealed rations by accident.
    const edibles = this.carriedFood(session);
    if (edibles.length === 0) return this.send(session, "You carry nothing you could eat.");

    let carried: CarriedItem | null;
    if (!arg) {
      carried = edibles[0];
    } else {
      carried = this.findCarried(session, arg);
      if (!carried) return this.send(session, "You carry nothing like that.");
      if (!world.itemTemplates.get(carried.itemId)?.edible) {
        return this.send(session, `You gnaw at ${world.itemTemplates.get(carried.itemId)!.name}. It is not food.`);
      }
    }
    const { before, tmpl } = await this.consumeFood(session, carried);
    // Bolting food mid-fight is allowed — desperation is — but you drop your
    // guard to do it, and the next hit that lands makes you pay for the bite.
    const gulped = this.inCombat(session);
    if (gulped) session.staggered = true;
    this.send(
      session,
      (session.hp > before
        ? `You eat ${tmpl.name}. ${pick([
            "Warmth comes back to you.",
            "It sits like a coal in your belly, and some of the grey lifts.",
            "It is barely food, but your hands steady.",
            "Strength trickles back into your limbs.",
            "The gnawing eases, and you feel a little less like dying.",
          ])} [${session.hp}/${session.maxHp} hp]`
        : `You eat ${tmpl.name}.`)
      + (gulped ? " You bolt it down with one eye on your foe — an opening." : ""),
      "gain",
    );
    this.roomFeed(session.roomId, `${session.name} eats ${tmpl.name}.`, session.pubkey);
    this.sendStatus(session);
    this.sendCtx(session);
    await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
  }

  // ---- wounds & dressings (Phase 1: the deep gets teeth) ----

  // Claws and teeth open a wound the mail can't turn: armor-ignoring bleed that
  // ticks until it clots (BLEED_TICKS) or you bind it. A fresh cut resets the
  // clock and takes the worse dmg. Mirrors the mob-side wound, pointed at you.
  private openWound(victim: Session, tmpl: MobTemplate): void {
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
    // WARDHIDE is the gear answer, and it rolls separately — thick hide under
    // a guard stacks (0.5 × 0.5): the full turtle bleeds a quarter as often.
    if (this.wearsTrait(victim, WARDHIDE) && !chance(WARDHIDE_WOUND_ODDS)) {
      this.send(victim, `${cap(tmpl.name)} drags claws through the thick hide and finds less than it wanted — no wound opens.`, "block");
      return;
    }
    const fresh = !victim.bleedTicks;
    victim.bleedTicks = BLEED_TICKS;
    victim.bleedDmg = Math.max(victim.bleedDmg ?? 0, tmpl.bleed);
    if (fresh) this.send(victim, `${cap(tmpl.name)} tears you open — the wound won't stop on its own. (bind it, or bleed)`, "dmgin");
  }

  // Leg-goers can hamstring you on a hit: a per-hit chance (HOBBLE_ODDS, tiered
  // by threat) that leaves you limping — you can still flee, but only after
  // dragging clear (see cmdGo), and rest mends it. One affliction instance,
  // sibling of openWound; the HUD's "hobbled" tag reads it. No-op once hobbled.
  private maybeHobble(victim: Session, tmpl: MobTemplate): void {
    if (victim.hobbled) return;
    const odds = HOBBLE_ODDS.get(tmpl.id);
    if (odds === undefined || !chance(odds)) return;
    victim.hobbled = true;
    victim.limpingSince = undefined; // a fresh wound — the drag-clear clock starts on your next flee
    this.send(victim, `${cap(tmpl.name)} rakes your leg out from under you — it won't carry you clean now. (rest to mend it)`, "dmgin");
  }

  // The vitals lottery — the Tarkov headshot. A rare, RANDOM killing hit that
  // ignores hp and gear: on any landed hit it may find the throat/heart. Armor
  // over the vitals only buys the odds DOWN toward `base` (never to zero) — naked
  // doubles it, VITALS_ARMOR_FULL armor reaches the floor. Deliberately random:
  // the randomness is the equalizer that lets a fresh player kill a geared one.
  // Shared by PvE (VITALS_PVE) and, when PvP is built, PvP (VITALS_PVP).
  private vitalsLottery(armor: number, base: number): boolean {
    const mult = 2 - Math.min(1, Math.max(0, armor) / VITALS_ARMOR_FULL); // 2× naked → 1× fully covered
    return chance(base * mult);
  }

  // The dressings a player carries, weakest first — the order both a manual
  // `bandage` and the auto-bind reflex draw from. Sealed loot is never spent.
  private carriedBandages(session: Session): CarriedItem[] {
    const world = this.world!;
    return session.items
      .filter((c) => (world.itemTemplates.get(c.itemId)?.staunch ?? 0) > 0 && c.serial === null)
      .sort((a, b) => world.itemTemplates.get(a.itemId)!.staunch - world.itemTemplates.get(b.itemId)!.staunch);
  }

  // Bind a wound: spend one dressing, clot the bleed, staunch some hp. Shared by
  // the manual `bandage` and the auto-bind reflex so both do it identically.
  private async applyBandage(session: Session, carried: CarriedItem, auto: boolean): Promise<void> {
    const tmpl = this.world!.itemTemplates.get(carried.itemId)!;
    session.items.splice(session.items.indexOf(carried), 1);
    await removeItemRow(this.env.DB, carried.rowId);
    const before = session.hp;
    session.bleedTicks = 0; session.bleedDmg = 0; // the wound is bound
    session.hp = Math.min(session.maxHp, session.hp + tmpl.staunch);
    this.send(session, (auto
      ? `Your hands move on their own — you bind the wound with ${tmpl.name}.`
      : `You bind your wounds with ${tmpl.name}.`)
      + (session.hp > before ? ` The bleeding stops. [${session.hp}/${session.maxHp} hp]` : " The bleeding stops."), "gain");
    this.roomFeed(session.roomId, `${session.name} binds a wound.`, session.pubkey, false);
    this.sendStatus(session);
    this.sendCtx(session);
    await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
  }

  private async cmdBandage(session: Session, arg: string): Promise<void> {
    const dressings = this.carriedBandages(session);
    if (dressings.length === 0) return this.send(session, "You carry nothing to bind a wound with.");
    let carried: CarriedItem | null;
    if (!arg) carried = dressings[0];
    else {
      carried = this.findCarried(session, arg);
      if (!carried) return this.send(session, "You carry nothing like that.");
      if ((this.world!.itemTemplates.get(carried.itemId)?.staunch ?? 0) <= 0)
        return this.send(session, `${cap(this.world!.itemTemplates.get(carried.itemId)!.name)} won't dress a wound.`);
    }
    if (!session.bleedTicks && session.hp >= session.maxHp)
      return this.send(session, "You've no wound to bind, and full blood — no sense wasting a dressing.");
    await this.applyBandage(session, carried, false);
  }

  // ---- instanced floor items (journals carry their pages onto the stones) ----

  private dropInstance(roomId: string, itemId: string, journalId: string): void {
    const here = this.groundInstances.get(roomId) ?? [];
    here.push({ itemId, journalId });
    this.groundInstances.set(roomId, here);
  }

  // Find and lift a matching instanced item off the floor (removed from the
  // ground the moment it's matched; the caller mints it into a pack).
  private takeGroundInstance(roomId: string, arg: string): GroundInstance | null {
    const here = this.groundInstances.get(roomId);
    if (!here?.length) return null;
    const idx = here.findIndex((g) => {
      const t = this.world!.itemTemplates.get(g.itemId);
      return t && nameMatches(t.name, arg);
    });
    if (idx === -1) return null;
    const [inst] = here.splice(idx, 1);
    if (!here.length) this.groundInstances.delete(roomId); else this.groundInstances.set(roomId, here);
    return inst;
  }

  // Pick up an instanced journal: a fresh pack row stamped with the book's own
  // id, so its pages (journal_logs, keyed to that id) find it again — the whole
  // point of the thing being stealable.
  private async getInstanced(session: Session, inst: GroundInstance): Promise<void> {
    const tmpl = this.world!.itemTemplates.get(inst.itemId)!;
    if (!this.packRoom(session, inst.itemId)) {
      this.dropInstance(session.roomId, inst.itemId, inst.journalId); // put it back down
      return this.send(session, `Your pack is full (${PACK_CAP} slots) — no room for ${tmpl.name}.`);
    }
    const rowId = uuid();
    const carried: CarriedItem = { rowId, itemId: inst.itemId, serial: null, equipped: false, condition: 100, journalId: inst.journalId };
    session.items.push(carried);
    await insertLoot(this.env.DB, rowId, session.pubkey, inst.itemId, null);
    await setItemJournalId(this.env.DB, rowId, inst.journalId);
    let stooped = "";
    if (this.inCombat(session)) { session.staggered = true; stooped = " You stoop for it under the swing — an opening."; }
    const pages = (await journalLoad(this.env.DB, inst.journalId)).length;
    this.send(session, `You take ${tmpl.name}.` + (pages ? ` Its pages are already ${pages > 8 ? "densely" : "half"} filled — someone else's hunting, now yours.` : "") + stooped);
    this.roomFeed(session.roomId, `${session.name} takes ${tmpl.name}.`, session.pubkey, (RARITY_RANK[tmpl.rarity] ?? 0) >= 2); // ordinary pickups local; rare+ still relays ("someone grabbed the legendary")
    this.refreshRoomCtx(session.roomId);
    await this.persist();
    await this.ensureAlarm();
  }

  // ---- maps: open a chart you carry (the modal draws it) ----

  private cmdMap(session: Session, arg: string): void {
    const maps = session.items.filter((c) => MAP_ITEMS.has(c.itemId));
    if (!maps.length) {
      return this.send(session, "You carry no map. The keeper sells them — a true one dear, a crude one cheap.");
    }
    // Name one, or default to the best you hold (a true map over a crude one).
    let carried = arg ? maps.find((c) => nameMatches(this.world!.itemTemplates.get(c.itemId)!.name, arg)) : null;
    if (!carried) carried = maps.find((c) => c.itemId === DETAILED_MAP) ?? maps[0];
    const detailed = carried.itemId === DETAILED_MAP;
    this.sendMap(session, carried, detailed);
    this.send(session, detailed
      ? "You unroll the surveyor's map. Every hall is on it, set down true."
      : "You unfold the crude map. Some of these ways are right. Trust it at your peril.");
  }

  private regionOf(roomId: string): "gate" | "deep" | "upper" {
    return this.world!.entryRooms.has(roomId) ? "gate" : DEEP_ROOMS.has(roomId) ? "deep" : "upper";
  }

  // Build and send the map frame. A detailed map is the true graph and lights
  // its rooms 'known' on the HUD; a crude map is deterministically lied — some
  // rooms missing, some exits wrong — seeded off the book so it's consistently
  // (not randomly) wrong, and it reveals nothing it can be trusted on.
  private sendMap(session: Session, carried: CarriedItem, detailed: boolean): void {
    const world = this.world!;
    const rnd = detailed ? null : mulberry32(hashSeed(carried.rowId));
    const roomIds = [...world.rooms.keys()];
    // Which rooms make it onto a crude map: the gates and where you stand always
    // do; the rest are a coin-weighted omission.
    const shown = new Set<string>();
    for (const id of roomIds) {
      if (detailed || this.regionOf(id) === "gate" || id === session.roomId || rnd!() >= CRUDE_DROP_ROOM) {
        shown.add(id);
      }
    }
    const regions: Record<string, { key: string; label: string; rooms: any[] }> = {
      gate: { key: "gate", label: "The Gates", rooms: [] },
      upper: { key: "upper", label: "The Halls", rooms: [] },
      deep: { key: "deep", label: "The Deep", rooms: [] },
    };
    for (const id of shown) {
      const room = world.rooms.get(id)!;
      const realExits = world.exits.get(id) ?? [];
      const exits: { dir: string; to: string; toName: string }[] = [];
      for (const e of realExits) {
        if (!detailed) {
          if (rnd!() < CRUDE_BAD_EXIT) {
            // A lie: half the time the exit's simply missing, half the time it
            // points at the wrong room (one that's on this map).
            if (rnd!() < 0.5) continue;
            const others = [...shown].filter((r) => r !== id);
            const wrong = others[Math.floor(rnd!() * others.length)] ?? e.to_room;
            exits.push({ dir: e.dir, to: wrong, toName: world.rooms.get(wrong)?.name ?? "somewhere" });
            continue;
          }
        }
        exits.push({ dir: e.dir, to: e.to_room, toName: world.rooms.get(e.to_room)?.name ?? e.to_room });
      }
      regions[this.regionOf(id)].rooms.push({ id, name: room.name, exits, here: id === session.roomId });
    }
    try {
      session.ws.send(JSON.stringify({
        v: 0, t: "map", detailed: detailed ? 1 : 0, here: session.roomId,
        // A true map is knowledge you keep: its rooms light gold on the HUD. A
        // crude one reveals nothing it can be trusted on.
        reveal: detailed ? [...shown].map((id) => world.rooms.get(id)!.name) : [],
        regions: Object.values(regions).filter((r) => r.rooms.length),
      }));
    } catch {}
  }

  // ---- the journal: study + blood fill in the bestiary ----

  // A short read of what a creature IS, from the behaviour families it belongs
  // to — the observation half of an account, available once you've studied it.
  private creatureNature(id: string): string {
    if (THIEVES.has(id)) return "A cutpurse. It fights to rob, not to win — one grab and it bolts.";
    if (RUNNERS.has(id)) return "It never stands and fights; it bolts the instant it can. Catch it on the break.";
    if (BROODERS.has(id)) return "A brood-mother. Nest-bound, and while it lives the room keeps filling with young.";
    if (SENTINELS.has(id)) return "A sentinel. It guards one door and never leaves it — deaf to lures, it sleeps until the deep is opened, then wakes and bars the way. Getting past means going through.";
    if (DROWNERS.has(id)) return "A drowned thing. It holds its patch of water and seizes what wades in.";
    if (LURKERS.has(id)) return "It waits unseen and drops on the careless. Noise and movement draw it.";
    if (CORRODERS.has(id)) return "It does not want your blood. Its touch is rust — every blow blooms green on what you WEAR, and it will patiently eat you out of your kit. Fight it naked or fight it fast.";
    if (REVENANTS.has(id)) return "It does not stay down — put it to nothing and it rises again, weaker, to come once more.";
    if (AGGRO_SCAVENGERS.has(id)) return "A scavenger that guards its kills — walk in on one feeding and it turns on you.";
    if (SCAVENGERS.has(id)) return "A scavenger. It roams the dark eating the dead, and grows bold as it gorges.";
    if (PATROLS[id]) return "It walks an endless round of the halls and never breaks stride.";
    if (LISTENERS.has(id)) return "Hollow and blind, but it HEARS — a still, quiet wanderer it lets pass.";
    if (HOLLOW.has(id)) return "Hollow — nothing inside. It does not bleed, hunger, or tire.";
    return "A living thing of the dark, and hungry.";
  }

  private journalTier(kills: number, studied: boolean): number {
    if (studied && kills >= 3) return 3; // the full account
    if (kills >= 1) return 2;            // a rough read, from the killing
    if (studied) return 1;              // habits only, from watching
    return 0;
  }

  // A journal must be IN HAND to write in — its pages, not your memory, do the
  // remembering. It's safe to leave it in the lockbox between hunts; you just
  // can't log a thing while it's locked away. Returns where the nearest one is.
  private async whereIsJournal(session: Session): Promise<"hand" | "stored" | "none"> {
    if (session.items.some((c) => c.journalId || c.itemId === JOURNAL_ITEM)) return "hand";
    for (const key of ["lockbox", "vault"] as const) {
      const held = await loadContainer(this.env.DB, session.pubkey, key);
      if (held.some((c) => c.itemId === JOURNAL_ITEM)) return "stored";
    }
    return "none";
  }

  private async cmdStudy(session: Session, arg: string): Promise<void> {
    const journal = session.items.find((c) => c.journalId);
    if (!journal?.journalId) {
      const where = await this.whereIsJournal(session);
      return this.send(session, where === "stored"
        ? "Your journal's in the lockbox. You need it in hand to write in it — fetch it out first."
        : "You've nothing to write in. Buy a journal from the keeper first.");
    }
    if (!arg) return this.send(session, "Study what?");
    const creature = this.findCreatureIn(session.roomId, arg);
    // You can't study what you can't see — a hidden lurker isn't there yet.
    if (!creature || (creature.hidden && LURKERS.has(creature.templateId) && !creature.target)) {
      return this.send(session, "Nothing by that name is here to study.");
    }
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    await journalStudy(this.env.DB, journal.journalId, tmpl.id);
    // Standing still to watch a thing this close is a risk: if it's a fight, your
    // eyes leave it for a beat.
    let opening = "";
    if (this.inCombat(session)) { session.staggered = true; opening = " Your eyes leave the fight to do it — an opening."; }
    const rows = await journalLoad(this.env.DB, journal.journalId);
    const row = rows.find((r) => r.templateId === tmpl.id);
    const tier = this.journalTier(row?.kills ?? 0, true);
    this.send(session, `You watch ${tmpl.name} a while and set down what you see.` +
      (tier < 3 ? ` (Its full account wants ${3 - (row?.kills ?? 0)} more kill${3 - (row?.kills ?? 0) === 1 ? "" : "s"}.)` : " Its account is complete.") + opening, "study");
    this.roomFeed(session.roomId, `${session.name} watches ${tmpl.name}, taking notes.`, session.pubkey);
  }

  private async cmdJournal(session: Session): Promise<void> {
    const journal = session.items.find((c) => c.journalId);
    if (!journal?.journalId) {
      const where = await this.whereIsJournal(session);
      return this.send(session, where === "stored"
        ? "Your journal's in the lockbox. Fetch it out to read or write in it."
        : "You carry no journal. The keeper sells them, fairly priced.");
    }
    const rows = await journalLoad(this.env.DB, journal.journalId);
    const world = this.world!;
    const entries = rows
      .map((r) => {
        const tmpl = world.mobTemplates.get(r.templateId);
        if (!tmpl) return null;
        const tier = this.journalTier(r.kills, r.studied);
        const e: any = { id: tmpl.id, name: tmpl.name, tier, kills: r.kills, studied: r.studied ? 1 : 0 };
        if (tier >= 1) { e.nature = this.creatureNature(tmpl.id); e.note = tmpl.description; }
        if (tier >= 3) {
          e.level = tmpl.level;
          e.hp = tmpl.max_hp;
          e.dmg = `${tmpl.dmg_min}–${tmpl.dmg_max}`;
          e.armor = tmpl.armor;
          e.boss = tmpl.is_boss ? 1 : 0;
          const loot = tmpl.loot_item ? world.itemTemplates.get(tmpl.loot_item) : null;
          if (loot) e.loot = loot.name;
        }
        return e;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.tier - a.tier) || a.name.localeCompare(b.name));
    try {
      session.ws.send(JSON.stringify({ v: 0, t: "journal", entries }));
    } catch {}
    this.send(session, entries.length
      ? "You open the journal."
      : "You open the journal. Its pages are blank — study a thing, and kill a few, and it will fill.");
  }


  // Truly out of the world — untouchable, unseen, beyond reach — only at a gate
  // with a modal open. A wanderer sorting a lockbox mid-dungeon has a modal open
  // (`away`, so the bench actions work) but is still crouched in the room, in
  // reach of everything standing there. `away` means "a modal is up"; THIS means
  // "safe." Keep the two apart. (Same gate condition as `sheltered` healing.)
  public outOfWorld(s: Session): boolean {
    return s.away && this.world!.entryRooms.has(s.roomId);
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
    if (!isGameKeyConfigured(this.env)) {
      return this.send(session, "The dungeon has not yet found its voice. (no signing key configured)");
    }
    if (relayList(this.env).length === 0) {
      return this.send(session, "The dungeon's voice does not reach beyond these walls yet. (no relays configured)");
    }
    if (!arg) {
      return this.send(session, "Publish what? 'publish sheet' for who you are, 'publish <sealed item>' for what you own.");
    }
    const world = this.world!;
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

  async alarm(): Promise<void> {
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
        continue;
      }
      // Rung senseless last beat: your swing is gone. It clears now — one hit,
      // one lost round, same as when you stun a mob.
      if (session.stunned) {
        session.stunned = false;
        this.send(session, "Your head still rings — the moment to swing slips past you.", "stun");
        continue;
      }
      const atkMult = STANCE[session.stance].atk;
      const alive = (c: Creature) => this.creatures.has(c.id);
      let primary = foes.find((c) => c.id === session.target && alive(c)) ?? foes.find(alive);
      const speed = Math.max(1, this.equippedItem(session, "weapon")?.tmpl.speed ?? 1);

      for (let swing = 0; swing < speed && primary; swing++) {
        // Re-fetch each swing: a fumble can fling the blade mid-round, and a
        // blade can wear through mid-arc. The rest of the round is bare-handed.
        const weapon = this.equippedItem(session, "weapon");
        const sweepN = Math.max(1, weapon?.tmpl.sweep ?? 1);
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
            let dmg = Math.round((body + (weapon ? this.effDmg(weapon) : 0)) * atkMult);
            if (hurt) dmg = Math.round(dmg * WOUNDED_DMG_MULT);
            let flourish = ".";
            if (chance(CRIT_CHANCE)) {
              dmg *= 2;
              flourish = pick(CRIT_FLOURISH);
            }
            // Their hide or plate turns what it can; a blow always bites. A pick's
            // point slips plate, a blunt weapon caves it — both ignore that armor,
            // each with its own tell (pierce takes precedence if a weapon had both).
            const pierceVal = weapon ? PIERCE.get(weapon.tmpl.id) ?? 0 : 0;
            const bluntVal = weapon && weapon.tmpl.stun > 0 ? BLUNT_ARMOR_IGNORE : 0;
            const pierced = pierceVal > 0 && tmpl.armor > 0; // the point beat armor
            const crushed = bluntVal > 0 && pierceVal === 0 && tmpl.armor > 0; // the weight beat armor
            dmg = Math.max(1, dmg - Math.max(0, tmpl.armor - Math.max(pierceVal, bluntVal)));
            creature.hp -= dmg;
            // The vitals lottery, PLAYER side — a lucky killing blow on a landed
            // hit. Bosses are the designed wall (never). The three-hound falls this
            // way ONLY to a piercing weapon, and rarely (VITALS_HOUND). Everything
            // else: the base rate, the mob's own armor buying it down. Drops to 0 so
            // the kill runs the normal death path, with a weapon-aware killing line.
            let pvitals = false;
            if (creature.hp > 0 && !tmpl.is_boss) {
              pvitals = creature.templateId === "three-hound"
                // the sentinel only falls to a point driven through the throat
                ? PIERCING_WEAPONS.has(weapon?.tmpl.id ?? "") && chance(VITALS_HOUND)
                : HOLLOW.has(creature.templateId)
                // no throat to open, no heart to pierce — only a blunt blow that
                // shatters the skull ends a hollow thing outright
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
              const freshBleed = !!(weapon && weapon.tmpl.bleed > 0 && !hollow && !creature.bleedTicks);
              const bleedDry = !!(weapon && weapon.tmpl.bleed > 0 && hollow);
              const tail = flourish !== "." ? flourish
                : pierced ? ` — ${pick(PIERCE_TELL)}.`
                : crushed ? ` — ${pick(BLUNT_TELL)}.`
                : freshBleed ? ` — ${pick(BLEED_TELL)}.`
                : bleedDry && chance(0.3) ? ` — ${pick(BONE_DRY_TELL)}.`
                : ".";
              this.send(session, `${this.playerHit(weapon, tmpl.name)} for ${dmg}${tail} (${this.condition(creature)})`, flourish === "." ? "dmgout" : "dmgout big");
              // A blunt blow can ring it senseless — it loses its next swing.
              // The boss never reels, and a thing already reeling can't be
              // stun-chained deeper (one hit, one lost beat).
              if (weapon && weapon.tmpl.stun > 0 && !tmpl.is_boss && !creature.stunned && chance(weapon.tmpl.stun)) {
                creature.stunned = true;
                this.send(session, `${cap(tmpl.name)} reels, stunned.`, "stun");
              }
              // A fast, cutting edge opens a wound that keeps weeping — damage
              // over time that no armor turns. Fresh hits keep it open. But the
              // HOLLOW don't bleed (dry bone, old iron): the DoT finds no blood.
              if (weapon && weapon.tmpl.bleed > 0 && !hollow) {
                creature.bleedTicks = BLEED_TICKS;
                creature.bleedDmg = Math.max(creature.bleedDmg ?? 0, weapon.tmpl.bleed);
              }
              this.combatNoise(session.roomId);
              if (tmpl.is_boss) ai.bossPhase(this, creature, tmpl, session);
            } else {
              await this.onCreatureDeath(session, creature, tmpl,
                pvitals ? `${this.playerVitalsVerb(weapon, tmpl.name)} — a killing blow.` : undefined);
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

    // A seized player works free over time (and is freed the moment the thing
    // holding them is gone) — runs before the creatures swing, so the grip is a
    // tense beat, never a lock.
    if (combatRound) for (const s of this.sessions.values()) {
      if (!s.seizedBy) continue;
      const grip = this.creatures.get(s.seizedBy);
      if (!grip || grip.roomId !== s.roomId) { s.seizedBy = undefined; continue; }
      // SLICK hide slips a grip easier, too (the eel was never held).
      const breakOdds = SEIZE_BREAK_ODDS + (this.wearsTrait(s, SLICK) ? SLICK_BREAK_BONUS : 0);
      if (chance(breakOdds)) { s.seizedBy = undefined; this.send(s, "You tear loose of its grip."); }
    }

    // Creatures act: flee if badly hurt, otherwise fight back. Only so many can
    // reach one player in a tick (DOGPILE_CAP) — the rest press at the edges and
    // wait their turn, so a crowd is deadly but never an instant, unwinnable
    // grind. The blow budget is `canLandBlow` (shared with entry strikes this
    // tick); `heldBack` remembers whose victims felt the crush, for a line after.
    const heldBack = new Set<string>();
    if (combatRound) for (const creature of this.creatures.values()) {
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
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} rises from its kill, hackles up.`, prey.pubkey);
        } else if (now >= creature.rouseAt) {
          creature.rouseAt = undefined;
          creature.target = prey.pubkey;
          if (!prey.target) prey.target = creature.id;
          this.send(prey, `${cap(tmpl.name)} springs from its kill — it's on you.`);
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} springs at ${prey.name}.`, prey.pubkey);
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
            this.send(prey, `${cap(tmpl.name)} fixes all three heads on you.`, "dmgin");
            this.roomFeed(creature.roomId, `${cap(tmpl.name)} turns on ${prey.name}.`, prey.pubkey);
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
          this.roomFeed(creature.roomId, `${cap(tmpl.name)} turns toward ${prey.name}.`, prey.pubkey);
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
        const wantsFlee = ai.dreadsFire(this, creature, victim)
          || RUNNERS.has(tmpl.id)
          || (!tmpl.is_boss && !BROODERS.has(tmpl.id) && !DROWNERS.has(tmpl.id) && !SENTINELS.has(tmpl.id) && creature.hp < tmpl.max_hp * FLEE_BELOW && chance(FLEE_CHANCE));
        if (wantsFlee && !tmpl.is_boss && !ai.scavengerBold(this, creature)) {
          await ai.creatureMoves(this, creature, now, "flee", false);
          continue;
        }
        // The dogpile cap: if this player already has a full press on them this
        // tick, this one can't get a blow in — it snarls at the edge and waits.
        // (It keeps its target, so it steps up the moment a slot opens.)
        if (!this.canLandBlow(victim.pubkey)) { heldBack.add(victim.pubkey); continue; }
        // Quick feet: carrying no worn weight adds to the foe's miss chance.
        // And a wounded creature fights diminished — shakier, softer blows.
        const quick = this.wornWeight(victim) === 0;
        const cHurt = creature.hp < tmpl.max_hp * WOUNDED_FRACTION;
        if (chance(FUMBLE_CHANCE + (quick ? DODGE_LIGHT : 0) + (cHurt ? WOUNDED_FUMBLE_BONUS : 0))) {
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
          const spike = shield ? THORNS.get(shield.tmpl.id) : undefined;
          if (spike) {
            creature.hp -= spike;
            if (creature.hp <= 0) {
              await this.onCreatureDeath(victim, creature, tmpl);
            } else {
              this.send(victim, `${cap(tmpl.name)} drives itself onto the spike — ${spike} back.`, "dmgout");
            }
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
        }
        if (victim.hp > 0) {
          this.send(victim, `${cap(tmpl.name)} ${this.creatureHit(tmpl.id)} for ${dmg}${flourish} [${victim.hp}/${victim.maxHp} hp]`, flourish === "." ? "dmgin" : "dmgin big");
          if (drowned) this.send(victim, `${cap(tmpl.name)} drags you under — black water fills your lungs for ${drowned}. (break free, or drown)`, "dmgin big");
          this.sendStatus(victim);
          this.combatNoise(victim.roomId);
          // A drowned thing that lands a blow can take hold — you're seized,
          // can't flee, and it drags harder until you wrench free or kill it.
          // SLICK hide (the eel-skin) gives cold arms half as much to hold.
          const seizeOdds = this.wearsTrait(victim, SLICK) ? SEIZE_ODDS * SLICK_SEIZE_MULT : SEIZE_ODDS;
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
          // (the coif, the riveted lining) takes the ring out of half of them.
          const stunOdds = this.wearsTrait(victim, PADDED) ? tmpl.stun * PADDED_STUN_MULT : tmpl.stun;
          if (tmpl.stun > 0 && !victim.stunned && chance(stunOdds)) {
            victim.stunned = true;
            this.send(victim, `${cap(tmpl.name)} lands like a falling stone — your skull rings and the room tilts.`, "stun");
          }
          // Eating a blow thins the mail a hair (provisional gear only).
          if (worn) await this.wear(victim, worn.carried, worn.tmpl, ARMOR_WEAR);
          // The verdigris-thing's blows eat your KIT, not your blood (soft).
          if (CORRODERS.has(creature.templateId)) await this.corrodeTouch(victim, tmpl);
          // A cutpurse doesn't fight to win — it fights to grab. One good hit,
          // one unsealed thing off your back (it goes for the richest), and gone.
          // Sealed loot is TITLE the dungeon marked as yours; its fingers slide off.
          // STRAPPED (the baldric) lashes everything down — nothing to lift.
          if (THIEVES.has(creature.templateId) && !creature.stole && this.wearsTrait(victim, STRAPPED)) {
            this.send(victim, `${cap(tmpl.name)}'s fingers dance over your pack and find everything lashed down tight. It hisses.`);
          } else if (THIEVES.has(creature.templateId) && !creature.stole) {
            const loot = victim.items
              .filter((c) => c.serial === null && !c.equipped)
              .sort((a, b) => (RARITY_RANK[world.itemTemplates.get(b.itemId)?.rarity ?? "common"] ?? 0)
                - (RARITY_RANK[world.itemTemplates.get(a.itemId)?.rarity ?? "common"] ?? 0))[0];
            if (loot) {
              const it = world.itemTemplates.get(loot.itemId)!;
              victim.items.splice(victim.items.indexOf(loot), 1);
              await removeItemRow(this.env.DB, loot.rowId);
              creature.stole = loot.itemId;
              this.send(victim, `${cap(tmpl.name)} snatches ${it.name} and bolts! (kill it to get it back)`);
              this.roomFeed(victim.roomId, `${cap(tmpl.name)} tears something from ${victim.name} and flees!`, victim.pubkey);
              this.sendCtx(victim);
              await ai.creatureMoves(this, creature, now, "flee", false);
              continue;
            }
          }
        } else {
          if (vitals) {
            this.send(victim, `${cap(tmpl.name)} ${this.creatureVitals(tmpl.id)} — and the world goes white. (a killing blow)`, "dmgin big");
            this.roomFeed(victim.roomId, `${cap(tmpl.name)} drops ${victim.name} with one terrible strike.`, victim.pubkey);
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
      const dressing = this.carriedBandages(session)[0];
      if (dressing) await this.applyBandage(session, dressing, true);
    }

    // Auto-eat: the blows have landed for this tick — anyone still on their feet
    // but bled below the line grabs a bite from the pack without being told to,
    // if there's food to grab. A reflex, not a turn: it doesn't leave an opening.
    for (const session of this.sessions.values()) {
      if (session.hp <= 0 || session.hp >= session.maxHp * AUTO_EAT_FRACTION) continue;
      if (!this.inCombat(session)) continue;
      const food = this.carriedFood(session)[0];
      if (!food) continue;
      const { before, tmpl } = await this.consumeFood(session, food);
      this.send(session, session.hp > before
        ? `Your hand goes to the pack on its own — you tear into ${tmpl.name}. [${session.hp}/${session.maxHp} hp]`
        : `Your hand goes to the pack on its own — you tear into ${tmpl.name}.`, "gain");
      this.roomFeed(session.roomId, `${session.name} snatches a bite mid-fight.`, session.pubkey);
      this.sendStatus(session);
      this.sendCtx(session);
      await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
    }

    // Torches burn down. A warning when the flame runs low, then it gutters out —
    // and if you're standing in a lightless room, the dark closes over you again.
    for (const session of this.sessions.values()) {
      if (!session.litUntil) continue;
      const left = session.litUntil - now;
      if (left <= 0) {
        session.litUntil = undefined;
        session.torchWarned = false;
        const inDark = DARK_ROOMS.has(session.roomId) && !this.outOfWorld(session);
        this.send(session, inDark
          ? "Your torch gutters, flares, and dies — and the dark closes over you completely."
          : "Your torch gutters, flares, and dies. The last of it falls as ash.", "dmgin");
        this.sendStatus(session);
        if (inDark) this.send(session, this.describeRoom(session, false));
      } else if (left <= 90_000 && !session.torchWarned) {
        session.torchWarned = true;
        this.send(session, "Your torch burns low, the flame guttering — not long now.", "dmgin");
      }
    }

    // Bodies and appetites, at tick resolution.
    const tickMins = TICK_MS / 60_000;
    for (const creature of this.creatures.values()) {
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
        // A still-bleeding thing doesn't knit up; the wound has to clot first.
        if (!creature.bleedTicks) creature.hp = Math.min(tmpl.max_hp, creature.hp + CREATURE_HEAL_PER_MIN * tickMins);
        if (creature.hp >= tmpl.max_hp) creature.phase = 0; // whole again, seated again
        // A scavenger standing on the dead eats first of all — and drags off
        // any gear left lying where a body fell.
        if (SCAVENGERS.has(creature.templateId)) { ai.scavengerFeeds(this, creature, false); ai.scavengerScoops(this, creature); }
        // A brood-mother swells the nest while she's left alone.
        if (BROODERS.has(creature.templateId)) ai.broodBirths(this, creature, now);
        if (creature.hunger >= HUNGRY_AT) ai.creatureEatsHere(this, creature, false);
        // The food web: a predator turns on weaker prey sharing its room. If it
        // strikes, that's its action this tick — it doesn't also wander.
        const hunted = await ai.predation(this, creature, now);
        if (!hunted && RUNNERS.has(creature.templateId) && ai.playerPresent(this, creature.roomId)) {
          // Never settles while there's someone to run from — it keeps moving,
          // room to room, and you only land a blow the tick you have it cornered.
          await ai.creatureMoves(this, creature, now, "wander", false);
        } else if (!hunted && creature.nextWanderAt <= now && !tmpl.is_boss && !BROODERS.has(creature.templateId) && !DROWNERS.has(creature.templateId) && !SENTINELS.has(creature.templateId)) {
          await ai.creatureMoves(this, creature, now, "wander", false);
        }
      }
    }

    // The damp works on carried steel: provisional weapons and armor rust a
    // hair each tick (very slowly). Sealed gear is held out of the dungeon's
    // reach. Iterate a copy — a piece can rust through and splice itself out.
    for (const session of this.sessions.values()) {
      for (const c of [...session.items]) {
        if (c.serial !== null) continue; // sealed: frozen whole
        const t = world.itemTemplates.get(c.itemId);
        if (!t || (t.slot !== "weapon" && t.slot !== "armor")) continue;
        await this.wear(session, c, t, RUST_PER_TICK);
      }
    }

    // Players heal only on purpose: resting, or sheltered in a gatehouse
    // (bench or hatch open AT a gate — out of the world, mending). Ducking
    // aside mid-dungeon with the lockbox is hiding, not healing.
    for (const session of this.sessions.values()) {
      const sheltered = session.away && world.entryRooms.has(session.roomId);
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
        session.hp = Math.min(session.maxHp, session.hp + REST_REGEN_PER_TICK);
        this.sendStatus(session);
        if (session.hp >= session.maxHp) {
          // Fully healed: save it now so a restart can't revert a finished rest.
          await savePlayer(this.env.DB, session.pubkey, session.roomId, session.hp);
          if (session.resting) {
            session.resting = false;
            this.send(session, session.away ? "Your wounds have closed — you are whole." : "You feel whole again, and rise.");
          } else {
            this.send(session, "In the gatehouse quiet, your wounds close. You are whole.");
          }
        }
      }
    }

    // Flush every live session's mutable state (hp, room) to D1 on a slow clock,
    // so a DO restart — a deploy or a Cloudflare eviction — is a reconnect blip,
    // not a revert. Combat/move/eat already write through; this catches the
    // in-memory-only heals (chiefly rest) that would otherwise vanish on the
    // next cold start and snap a rested player back to stale HP.
    if (now - this.lastFlushAt >= FLUSH_INTERVAL_MS) {
      this.lastFlushAt = now;
      for (const s of this.sessions.values()) {
        await savePlayer(this.env.DB, s.pubkey, s.roomId, s.hp);
      }
    }

    // The dungeon breathes: an idle wanderer catches a line of atmosphere now
    // and then, drawn from where they stand. Never in a fight, never at the
    // bench, and never faster than the cooldown — quiet, not chatter.
    for (const session of this.sessions.values()) {
      if (session.away || this.inCombat(session)) continue;
      if (now - session.lastAmbientAt < AMBIENT_COOLDOWN_MS) continue;
      if (!chance(AMBIENT_ODDS)) continue;
      const line = this.ambientLine(session.roomId);
      if (!line) continue;
      session.lastAmbientAt = now;
      this.send(session, line);
    }

    this.applyRot(now, false);
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

    await this.persist();
    await this.ensureAlarm();
  }

  // One atmosphere line for where you stand: a signature room's own pool if it
  // has one, else the region it belongs to (the gates, the flooded deep, or the
  // ring between). Meant to grow — add lines to AMBIENCE / ROOM_AMBIENCE freely.
  private ambientLine(roomId: string): string | null {
    const own = ROOM_AMBIENCE[roomId];
    if (own?.length) return own[randInt(0, own.length - 1)];
    const region = this.world!.entryRooms.has(roomId) ? "gate" : DEEP_ROOMS.has(roomId) ? "deep" : "upper";
    const pool = AMBIENCE[region];
    return pool.length ? pool[randInt(0, pool.length - 1)] : null;
  }

  // ---- creature behavior (shared by live tick and catch-up) ----













  // ---- traces: the world's memory ----

  public addTrace(roomId: string, trace: Trace): void {
    let list = this.traces.get(roomId);
    if (!list) { list = []; this.traces.set(roomId, list); }
    if (trace.kind === "passage") {
      // One set of footprints per room; new passage refreshes it.
      const i = list.findIndex((t) => t.kind === "passage");
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
      if (r.at > now) return true;
      const here = this.ground.get(r.roomId) ?? [];
      const idx = here.indexOf(r.itemId);
      if (idx !== -1) {
        here.splice(idx, 1);
        this.addTrace(r.roomId, { kind: "scraps", at: r.at });
        if (!silent) {
          const t = this.world!.itemTemplates.get(r.itemId);
          this.roomFeed(r.roomId, `${cap(t?.name ?? "something")} has gone foul.`);
          this.refreshRoomCtx(r.roomId);
        }
      }
      return false;
    });
  }

  // The shrine keeps its promises.
  private applyRegrow(now: number, silent: boolean): void {
    this.regrow = this.regrow.filter((g) => {
      if (g.at > now) return true;
      // Never over-fill: if the room got one back some other way (a dropped or
      // thrown rock landed here), this regrow just resolves to nothing.
      const floor = this.ground.get(g.roomId) ?? [];
      if (floor.includes(g.itemId)) return false;
      this.ground.set(g.roomId, [...floor, g.itemId]);
      if (!silent) {
        const t = this.world!.itemTemplates.get(g.itemId);
        const rock = g.itemId === "loose-rock";
        const edible = !!t?.edible;
        this.roomFeed(g.roomId, rock
          ? "The rubble shifts — a loose rock lies within reach again."
          : edible
            ? `${cap(t?.name ?? "something")} lies here — the stores are not empty yet.`
            : `${cap(t?.name ?? "something")} lies on the altar, as if it had never left.`);
        this.roomSound(g.roomId, rock ? "Stone grinds on stone {dir}." : edible ? "Something settles {dir}." : "A faint chime sounds {dir}.");
        this.refreshRoomCtx(g.roomId);
      }
      return false;
    });
  }




  // A swing gone wide. A provisional weapon leaves your hand — it is on the
  // stones now, mid-fight, anyone's to take. A sealed weapon is held to your
  // grip by its mark; bare hands just stumble. Fumbling is loud either way.
  private async playerFumble(
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
      this.groundCond.set(`${weapon.carried.itemId}@${session.roomId}`, weapon.carried.condition); // a dropped blade keeps its wear when you snatch it back
      this.send(session, `Your swing goes wide — ${weapon.tmpl.name} spins from your grip and clatters across the stones!`
        + (weapon.carried.serial !== null ? " The seal cracks where it lands." : ""), "fumble");
      this.roomFeed(session.roomId, `${session.name}'s weapon clatters across the stones!`, session.pubkey);
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

  private async onCreatureDeath(killer: Session, creature: Creature, tmpl: MobTemplate, killLine?: string): Promise<void> {
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
      this.roomFeed(creature.roomId, `${cap(tmpl.name)} rises again.`, killer.pubkey);
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
    // If you're carrying a journal when it falls, the book keeps count — one
    // more of this kind, written to whichever journal is in your pack.
    const jrn = killer.items.find((c) => c.journalId);
    if (jrn?.journalId) await journalBumpKill(this.env.DB, jrn.journalId, tmpl.id);
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
    this.send(killer, killLine ?? killVerb, "kill big");
    this.roomFeed(creature.roomId, `${killer.name} kills ${tmpl.name}.`, killer.pubkey);
    this.roomSound(creature.roomId, "Something falls {dir}, and is still.");
    this.creatureNoise(creature.roomId);
    // A cutpurse that died with your loot spills it here — chase it, catch it,
    // and it's on the floor where it fell. (Ground items land fresh, no seal.)
    if (creature.stole) {
      const stolen = this.world!.itemTemplates.get(creature.stole);
      this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), creature.stole]);
      if (stolen) this.roomFeed(creature.roomId, `${cap(stolen.name)} spills from the dead ${tmpl.name.replace(/^an? /, "")}.`);
      creature.stole = undefined;
    }
    this.addTrace(creature.roomId, {
      kind: HOLLOW.has(tmpl.id) ? "remains" : "blood",
      at: Date.now(),
      label: tmpl.name,
    });
    this.refreshRoomCtx(creature.roomId);
    if (tmpl.is_boss) {
      this.roomFeedAll(`A cry rolls through the stone: ${tmpl.name} has fallen to ${killer.name}.`);
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
        if (await this.grantItem(killer, item.id)) {
          this.send(killer, `${cap(item.name)} falls into your hands. [${item.rarity}] (unclaimed — the gate can seal it)`);
        } else {
          this.ground.set(creature.roomId, [...(this.ground.get(creature.roomId) ?? []), item.id]);
          this.send(killer, `${cap(item.name)} falls from ${tmpl.name} — your pack is full, so it lies here. [${item.rarity}]`);
        }
        this.roomFeed(creature.roomId, `${killer.name} claims ${item.name}.`, killer.pubkey);
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
        if (g) {
          // Gear off the dead is battered — it fought in this, and lost. Stamp it
          // scavenged so its wear sticks when the killer stoops for it.
          if (g.slot !== "") this.groundCond.set(`${id}@${creature.roomId}`, rollGearCondition(g.slot, false));
          this.send(killer, `${cap(g.name)} clatters free of the fallen — it lies here. [${g.rarity}]`);
          this.roomFeed(creature.roomId, `${cap(g.name)} spills from the dead ${tmpl.name.replace(/^an? /, "")}.`, killer.pubkey);
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
    const atLength = weapon !== null && REACH_ITEMS.has(weapon.tmpl.id);
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

  private async onPlayerDeath(victim: Session, tmpl: MobTemplate | null): Promise<void> {
    const slayer = tmpl ? tmpl.name : "their own wounds"; // tmpl null = bled out, no hand on the blow
    for (const c of this.creatures.values()) {
      if (c.target === victim.pubkey) c.target = null;
    }
    victim.target = null;
    victim.resting = false;
    victim.staggered = false;
    victim.stunned = false;
    victim.hobbled = false; victim.limpingSince = undefined; // a new body walks whole
    victim.bleedTicks = 0; victim.bleedDmg = 0; // the gate returns you whole — no wound rides back
    victim.buying = undefined; // death ends any open trade; the counter clears
    victim.deaths += 1;
    await recordDeath(this.env.DB, victim.pubkey);

    // EVERYTHING carried scatters where you fall — sealed included. The seal
    // is title, not armor: it cracks as it leaves your hands (claim voided),
    // and the thing lies on the stones for anyone, or anything, to find.
    // Only the lockbox protects (rome's rule, 2026-07-05).
    const fell = victim.roomId;
    const scattered = victim.items;
    const hadSealed = scattered.some((c) => c.serial !== null);
    if (scattered.length > 0) {
      // Journals fall instanced (their pages ride the book to whoever loots it);
      // everything else spills as plain loot.
      this.ground.set(fell, [...(this.ground.get(fell) ?? []), ...scattered.filter((c) => !c.journalId).map((c) => c.itemId)]);
      for (const c of scattered) {
        if (c.journalId) { this.dropInstance(fell, c.itemId, c.journalId); continue; }
        if (this.world!.itemTemplates.get(c.itemId)?.edible) {
          this.rot.push({ itemId: c.itemId, roomId: fell, at: Date.now() + ROT_MS });
        }
        if (c.serial !== null) await voidMint(this.env.DB, c.serial);
      }
      await clearCarriedInventory(this.env.DB, victim.pubkey);
    }
    victim.items = [];
    this.roomFeed(
      fell,
      scattered.length > 0
        ? `${victim.name} is slain by ${slayer}. Their pack scatters across the stones${hadSealed ? " — cracked seals glitter among the spill" : ""}.`
        : `${victim.name} is slain by ${slayer}.`,
      victim.pubkey,
    );
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
    const end = tmpl ? pick([
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
    this.roomFeed(victim.roomId, `${victim.name} staggers back through the gate, pale.`, victim.pubkey);
    this.send(victim, this.describeRoom(victim));
    this.sendStatus(victim);
    this.refreshRoomCtx(fell);
    this.refreshRoomCtx(victim.roomId);
    await savePlayer(this.env.DB, victim.pubkey, victim.roomId, victim.hp);
    await this.persist();
  }

  public inCombat(session: Session): boolean {
    if (session.target) return true;
    for (const c of this.creatures.values()) {
      if (c.target === session.pubkey) return true;
    }
    return false;
  }

  private async ensureAlarm(): Promise<void> {
    // The tick runs while any socket is connected — hibernated or not; a parked
    // socket is still a player in the world. A truly empty world (no sockets) is
    // fast-forwarded by catchUp() when the next player arrives.
    if (this.state.getWebSockets().length === 0) return;
    const current = await this.state.storage.getAlarm();
    // An overdue alarm is a dead alarm (dev reloads leave them wedged) —
    // setAlarm overwrites, so reschedule rather than trust it.
    if (current === null || current < Date.now()) {
      await this.state.storage.setAlarm(Date.now() + TICK_MS);
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

  // full=false is the brief view: the static scene-setting (the prose, the
  // keeper who is always there) is dropped, leaving only what's live.
  private describeRoom(session: Session, full = true): string {
    const world = this.world!;
    const room = world.rooms.get(session.roomId)!;
    // The lightless deep: without a flame you see nothing here — not the room,
    // not its exits, not what shares it with you. A torch resolves it all.
    if (DARK_ROOMS.has(room.id) && !this.carriesLight(session)) {
      return "Pitch dark.\nYou can see nothing — no walls, no way on, only your own breath and, somewhere, the drip of water. A light would show it. (light a torch, or feel your way back the way you came)";
    }
    const lines = full ? [room.name, room.description] : [room.name];

    const exits = world.exits.get(room.id) ?? [];
    lines.push(exits.length ? `Exits: ${exits.map((e) => e.dir).join(", ")}.` : "There is no way out.");

    lines.push(...this.traceLines(room.id, Date.now()));

    // Every gate keeps a keeper: a fence at a shuttered hatch, dealing in kind.
    // (Static, so it's part of the full look only — you know he's there.)
    if (full && world.entryRooms.has(room.id) && world.fenceStock.length > 0) {
      lines.push("A keeper waits at a shuttered hatch in the gatehouse wall, dealing in kind.");
    }

    for (const itemId of this.ground.get(room.id) ?? []) {
      const t = world.itemTemplates.get(itemId);
      if (t) lines.push(`${cap(t.name)} lies here.`);
    }
    // A dropped journal lies here too — someone's abandoned or spilled hunting.
    for (const inst of this.groundInstances.get(room.id) ?? []) {
      const t = world.itemTemplates.get(inst.itemId);
      if (t) lines.push(`${cap(t.name)} lies here, its pages open to the dark.`);
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
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== room.id) continue;
      const t = world.mobTemplates.get(creature.templateId)!;
      // A lurker lying in wait is unseen — it isn't in the room at all, until it
      // strikes. UNLESS you carry a flame: torchlight finds it pressed into its
      // crevice before it can spring, and the ambush is spoiled (wakeListeners).
      const hiddenLurker = LURKERS.has(creature.templateId) && creature.hidden && !creature.target;
      if (hiddenLurker && !this.carriesLight(session)) continue;
      if (hiddenLurker) {
        lines.push(`${cap(t.name)} is here, caught in your torchlight before it could spring — pressed into a crevice, watching.${creature.hp < t.max_hp ? ` (${this.condition(creature)})` : ""}`);
        continue;
      }
      // A sentinel reads by its state: asleep and steppable, or awake and barring the stair.
      if (SENTINELS.has(creature.templateId)) {
        lines.push(this.sentinelAwake(creature)
          ? `${cap(t.name)} is awake, all three heads up and barring the way down.${creature.hp < t.max_hp ? ` (${this.condition(creature)})` : ""}`
          : `${cap(t.name)} sprawls across the stair, all three heads asleep. For now.`);
        continue;
      }
      const tell = ai.creatureTell(this, creature, session.pubkey);
      lines.push(`${cap(t.name)} is here${this.bearsClause(creature)}${tell ? `, ${tell}` : ""}.${creature.hp < t.max_hp ? ` (${this.condition(creature)})` : ""}`);
    }
    for (const s of this.sessions.values()) {
      if (s.pubkey !== session.pubkey && s.roomId === room.id && !this.outOfWorld(s)) {
        lines.push(`${s.name} is here${s.resting ? ", resting" : ""}.`);
      }
    }
    return lines.join("\n");
  }

  // A sentinel is awake (and barring the way down) while its wake-clock runs.
  public sentinelAwake(creature: Creature): boolean {
    return !!creature.wakeUntil && Date.now() < creature.wakeUntil;
  }

  private condition(creature: Creature): string {
    const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
    const f = creature.hp / tmpl.max_hp;
    if (f >= 1) return "unhurt";
    if (f > 0.66) return "scratched";
    if (f > 0.33) return "wounded";
    return "near death";
  }

  // "You hack at a scabby rat" — the verb varies by the weapon in your hand,
  // then the caller tacks on " for N" and the rest. A cutting edge cuts, a
  // maul cracks, a spear drives, a bare fist clouts, a plain blade just hits.
  private playerHit(weapon: { tmpl: ItemTemplate } | null | undefined, name: string): string {
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
  // How much armor a weapon's blow ignores: a pick's narrow point (PIERCE, per
  // weapon) or a blunt weapon's crushing weight (BLUNT_ARMOR_IGNORE, any stun>0),
  // whichever is greater. The single source for both damage paths.
  private armorIgnore(weapon: { tmpl: ItemTemplate } | null | undefined): number {
    if (!weapon) return 0;
    const pierce = PIERCE.get(weapon.tmpl.id) ?? 0;
    const blunt = weapon.tmpl.stun > 0 ? BLUNT_ARMOR_IGNORE : 0;
    return Math.max(pierce, blunt);
  }

  private playerVitalsVerb(weapon: { tmpl: ItemTemplate } | null | undefined, name: string): string {
    const t = weapon?.tmpl;
    const reg = !t ? "fist"
      : PIERCING_WEAPONS.has(t.id) ? "pierce"
      : t.bleed > 0 ? "edge"
      : t.stun > 0 ? "blunt"
      : t.sweep > 1 || t.speed > 1 ? "spear"
      : "plain";
    return "You " + pick(PLAYER_VITALS[reg]).replace(/\{n\}/g, name);
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
  private cacheLocked(cache: Cache): boolean {
    return Date.now() >= (this.cacheSpent.get(cache.id) ?? 0);
  }

  // Roaming chests (rome, 2026-07-10): a chest is no longer nailed to one room.
  // Its config room in the `caches` table now only fixes its TIER (gate/upper/
  // deep via regionOf); on each refill it relocates to a random room of that
  // tier — never a safe hideaway or a gate, so all chest loot carries risk (this
  // is what pulled box-bone/box-crack out of the safe rooms). The King's Hoard is
  // the one exception: the boss's treasure stays put. Finding a chest becomes
  // exploration + luck; the supply (chest COUNT) is unchanged, so scarcity holds.
  private cacheRoams(cache: Cache): boolean {
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
  private cacheRoomId(cache: Cache): string {
    let room = this.cacheRoom.get(cache.id);
    if (!room) { this.placeCache(cache); room = this.cacheRoom.get(cache.id)!; }
    return room;
  }


  // The room-line clause for what a creature visibly bears: "clad in warden's
  // plate", "wielding a graveblade", "dragging a bone shiv". No leading article.
  private bearsClause(creature: Creature): string {
    if (!creature.carries?.length) return "";
    const clauses: string[] = [];
    for (const id of creature.carries) {
      const t = this.world!.itemTemplates.get(id);
      if (!t) continue;
      const verb = t.slot === "weapon" ? "wielding" : t.slot === "" ? "dragging" : "clad in";
      clauses.push(`${verb} ${t.name}`);
    }
    return clauses.length ? `, ${clauses.join(" and ")}` : "";
  }

  private findCreatureIn(roomId: string, arg: string): Creature | null {
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== roomId) continue;
      const tmpl = this.world!.mobTemplates.get(creature.templateId)!;
      if (nameMatches(tmpl.name, arg)) return creature;
    }
    return null;
  }

  private findItemIn(itemIds: string[], arg: string): string | null {
    for (const id of itemIds) {
      const t = this.world!.itemTemplates.get(id);
      if (t && nameMatches(t.name, arg)) return id;
    }
    return null;
  }

  public findCarried(session: Session, arg: string): CarriedItem | null {
    for (const c of session.items) {
      const t = this.world!.itemTemplates.get(c.itemId);
      if (t && nameMatches(t.name, arg)) return c;
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
  private effDmg(g: { carried: CarriedItem; tmpl: ItemTemplate }): number {
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
  private equippedArmor(session: Session): number {
    let total = 0;
    for (const g of this.equippedAll(session)) {
      if (ARMOR_SLOTS.has(g.tmpl.slot) && g.tmpl.armor > 0) total += this.effStat(g.tmpl.armor, g.carried.condition);
    }
    return total;
  }

  // The burden you carry: the SUM of every equipped piece's weight — armor,
  // shield, AND the weapon in your hand. 0 total = quick on your feet (dodge,
  // clean flight); a heavy blade costs you your footwork same as heavy plate.
  private wornWeight(session: Session): number {
    let total = 0;
    for (const g of this.equippedAll(session)) total += g.tmpl.weight;
    return total;
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

  // Does any EQUIPPED piece carry this trait? (Gear traits — reach, padded,
  // quiet, slick, strapped — are worn, not carried: a spear in the pack blunts
  // nothing.) Traits are booleans by design; two padded pieces are just padded.
  private wearsTrait(session: Session, trait: Set<string>): boolean {
    for (const c of session.items) if (c.equipped && trait.has(c.itemId)) return true;
    return false;
  }

  // The shield on your arm gives its block chance (scaled by wear) — and a
  // parrying blade (a weapon with a block stat: sword-breaker, king's-guard)
  // adds its own catch on top. The turtle's weapon is part of the wall.
  private equippedBlock(session: Session): number {
    let block = 0;
    const s = this.equippedItem(session, "shield");
    if (s && s.tmpl.block > 0) {
      block += s.tmpl.block * Math.max(0, s.carried.condition) / 100;
      // Guarded means fighting BEHIND the shield — it catches a shade more.
      // (Stance only sweetens a shield you actually carry; bare guarded gets nothing.)
      if (session.stance === "guarded") block += GUARDED_BLOCK_BONUS;
    }
    const w = this.equippedItem(session, "weapon");
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
  private async wear(session: Session, carried: CarriedItem, tmpl: ItemTemplate, amount: number): Promise<void> {
    if (carried.serial !== null) amount *= SEALED_WEAR_MULT; // sealed: protected, not immortal — the mark slows the wear
    carried.condition -= amount;
    if (carried.condition > 0) return;
    const idx = session.items.indexOf(carried);
    if (idx >= 0) session.items.splice(idx, 1);
    await removeItemRow(this.env.DB, carried.rowId);
    this.send(session, `${cap(tmpl.name)} is worn through — it comes apart in your ${tmpl.slot === "weapon" ? "grip" : "hands"} and is gone.`);
    this.refreshRoomCtx(session.roomId);
  }

  private findPlayerIn(roomId: string, arg: string): Session | null {
    for (const s of this.sessions.values()) {
      if (s.roomId === roomId && s.name.toLowerCase().startsWith(arg)) return s;
    }
    return null;
  }

  // ---- messages out ----

  // A line to one wanderer. `cls` is an optional semantic tag (dmgin, dmgout,
  // kill, fumble, death, gain — with "big" for the loud ones) so the client
  // colors combat by MEANING, not by matching prose. This is what lets the
  // dialogue vary freely without the coloring ever falling out of step.
  public send(session: Session, text: string, cls?: string): void {
    try {
      session.ws.send(JSON.stringify(cls ? { v: 0, kind: 24912, text, cls } : { v: 0, kind: 24912, text }));
    } catch {}
  }

  private sendStatus(session: Session): void {
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
          room: room?.name ?? session.roomId,
          fx,
        }),
      );
    } catch {}
  }

  // UI helper (like status, not protocol): everything you could do right here,
  // as ready-to-send commands. The client renders these as tappable chips.
  public sendCtx(session: Session): void {
    const world = this.world;
    if (!world) return;
    const fighting = this.inCombat(session);
    session.ctxCombat = fighting;
    // When steel is out, the chips narrow to the fight — in EVERY room. No
    // resting, banking, chatting, or reading the walls while something swings
    // at you; only what the fight allows (see "Combat narrows the world").
    const suggest: string[] = [];

    // The living get initiative: attack chips first, for every foe in the room.
    // A lurker lying in wait is unseen — no chip gives it away, same as the room
    // description holds its tongue.
    let creatureHere = false;
    for (const creature of this.creatures.values()) {
      if (creature.roomId !== session.roomId) continue;
      // Torchlight reveals a waiting lurker — so it also gets its attack chip.
      if (LURKERS.has(creature.templateId) && creature.hidden && !creature.target && !this.carriesLight(session)) continue;
      creatureHere = true;
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      suggest.push(`attack ${shortName(tmpl.name)}`);
    }
    // A throwable in hand and something to throw it at: offer the opener.
    if (creatureHere) {
      const throwable = session.items.find(
        (c) => c.serial === null && (world.itemTemplates.get(c.itemId)?.dmg ?? 0) > 0,
      );
      const firstMob = [...this.creatures.values()].find((c) => c.roomId === session.roomId);
      if (throwable && firstMob) {
        const mobT = world.mobTemplates.get(firstMob.templateId)!;
        suggest.push(`throw ${shortName(world.itemTemplates.get(throwable.itemId)!.name)} at ${shortName(mobT.name)}`);
      }
    }
    // With a fight in the room (or already in one), offer the other stances.
    if (creatureHere || fighting) {
      for (const s of ["reckless", "steady", "guarded"] as const) {
        if (s !== session.stance) suggest.push(`stance ${s}`);
      }
    }
    // Exits: fleeing is a fight decision, so they stay live in combat too.
    // Canonical compass order (n·s·e·w·u·d), so directions never shuffle
    // between rooms — the client pins them to fixed slots on top of this.
    const exitsHere = [...(world.exits.get(session.roomId) ?? [])].sort(
      (a, b) => (DIR_ORDER[a.dir] ?? 9) - (DIR_ORDER[b.dir] ?? 9),
    );
    for (const e of exitsHere) suggest.push(`go ${e.dir}`);
    // Combat-legal at the cost of an opening: stoop for a fallen weapon, eat,
    // or swap your steel (armor on/off is refused mid-fight, so no armor chip).
    for (const itemId of this.ground.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(itemId);
      if (t) suggest.push(`get ${shortName(t.name)}`);
    }
    for (const inst of this.groundInstances.get(session.roomId) ?? []) {
      const t = world.itemTemplates.get(inst.itemId);
      if (t) suggest.push(`get ${shortName(t.name)}`);
    }
    // Journal in hand and a foe to watch: study it (mid-fight it's an opening).
    if (creatureHere && session.items.some((c) => c.journalId)) {
      const firstMob = [...this.creatures.values()].find(
        (c) => c.roomId === session.roomId && !(LURKERS.has(c.templateId) && c.hidden && !c.target),
      );
      if (firstMob) suggest.push(`study ${shortName(world.mobTemplates.get(firstMob.templateId)!.name)}`);
    }
    const edible = session.items.find((c) => world.itemTemplates.get(c.itemId)?.edible);
    if (edible) suggest.push(`eat ${shortName(world.itemTemplates.get(edible.itemId)!.name)}`);
    const gearless = session.items.find((c) => {
      if (c.equipped) return false;
      const t = world.itemTemplates.get(c.itemId);
      if (!t || !!this.equippedItem(session, t.slot)) return false;
      // mid-fight only a weapon may be readied; out of combat, any worn slot.
      return t.slot !== "" && (t.slot === "weapon" || !fighting);
    });
    if (gearless) suggest.push(`equip ${shortName(world.itemTemplates.get(gearless.itemId)!.name)}`);

    // A locked cache here that you hold the key to: one chip opens it.
    if (!fighting) {
      for (const cache of world.caches) {
        if (this.cacheRoomId(cache) !== session.roomId || !this.cacheLocked(cache)) continue;
        if (session.items.some((c) => c.itemId === cache.keyItem)) suggest.push(`unlock ${shortName(cache.name)}`);
      }
    }

    // The peacetime chips — the whole calm world — only when nothing's on you.
    if (!fighting) {
      suggest.unshift("look");
      // No rest chip with something visible in the room — cmdRest refuses it, so
      // the chip would only bait a dead tap.
      if (session.hp < session.maxHp && !session.resting && !creatureHere) suggest.push("rest");
      // The one fishing spot: a line off the Pocket of Air's shelf.
      if (FISHING_ROOMS.has(session.roomId)) suggest.push("fish");
      // The gate's trades: the keeper's hatch (the client opens the trade
      // modal), and the forge if you carry the makings. A typed trade left
      // open still offers the tender chips.
      if (world.entryRooms.has(session.roomId)) {
        if (world.fenceStock.length) suggest.push(TRADE_CHIP);
        // The forge chip opens the forge modal (a gate fixture, like the keeper).
        if (world.forgeRecipes.length) suggest.push(FORGE_CHIP);
        if (session.buying && !session.trading) {
          const offered = new Set<string>();
          for (const c of session.items) {
            if (c.serial !== null || session.buying.escrow.some((e) => e.row === c.rowId)) continue;
            const t = world.itemTemplates.get(c.itemId);
            if (!t || (t.barter ?? 0) <= 0 || offered.has(t.id)) continue;
            offered.add(t.id);
            suggest.push(`offer ${shortName(t.name)}`);
            if (offered.size >= 4) break;
          }
          suggest.push("offer nothing");
        }
      }
      // Knowledge you carry: open a map or the journal (each pops its modal).
      if (session.items.some((c) => MAP_ITEMS.has(c.itemId))) suggest.push("map");
      if (session.items.some((c) => c.journalId)) suggest.push("journal");
      // The 'inventory' chip is the one keeping-place: tapping it opens the
      // pack/lockbox(/vault) modal (the client intercepts BENCH_CHIP), always
      // up out of combat — step aside anywhere to sort, safe from any knife.
      // The vault + seal only work at a gate, so the modal shows them only
      // there. (Typing 'inventory' still prints the plain list — chip ≠ command.)
      suggest.push(BENCH_CHIP);
      suggest.push("say …", "help");
    }
    // Two rats in a room shouldn't mean two identical chips.
    const unique = [...new Set(suggest)];
    try {
      session.ws.send(JSON.stringify({ v: 0, t: "ctx", suggest: unique, combat: fighting }));
    } catch {}
  }

  // Room contents changed: refresh the chips of everyone standing there.
  public refreshRoomCtx(roomId: string): void {
    for (const s of this.sessions.values()) {
      if (s.roomId === roomId) this.sendCtx(s);
    }
  }

  // Combat begins and ends in many places (attack, ambush, a grudge walking
  // in, the last foe dying, fleeing). Rather than trust every one of them to
  // remember the chips, sweep: anyone whose combat state no longer matches
  // what their chips were drawn for gets a fresh set. Runs after every
  // command and every tick — the chip lock holds in ALL rooms.
  private syncCombatCtx(): void {
    for (const s of this.sessions.values()) {
      if (!s.away && this.inCombat(s) !== s.ctxCombat) this.sendCtx(s);
    }
  }

  // ---- sound: text renders it better than graphics render anything ----
  // A noisy event in one room is heard, degraded and directional, in every
  // room with an open exit toward it. Closed iron blocks sound. "{dir}" in
  // the template becomes "to the east" / "from below" for each listener.
  public roomSound(sourceRoomId: string, template: string, excludeRoomId?: string): void {
    const world = this.world;
    if (!world) return;
    const heard = new Set<string>();
    for (const [rid, exits] of world.exits) {
      if (rid === sourceRoomId || rid === excludeRoomId) continue;
      const toward = exits.find(
        (e) => e.to_room === sourceRoomId && (!e.key_item || this.openDoors.has(`${rid}:${e.dir}`)),
      );
      if (!toward) continue;
      const line = template.replace("{dir}", dirPhrase(toward.dir));
      const frame = JSON.stringify({ v: 0, kind: 24913, room: rid, text: line });
      for (const s of this.sessions.values()) {
        if (s.roomId !== rid || heard.has(s.pubkey)) continue;
        heard.add(s.pubkey);
        try { s.ws.send(frame); } catch {}
      }
    }
  }

  // A fight is continuous noise; ring out at most once per window per room.
  private combatNoiseAt = new Map<string, number>();
  private combatNoise(roomId: string): void {
    const now = Date.now();
    if ((this.combatNoiseAt.get(roomId) ?? 0) + COMBAT_NOISE_EVERY_MS > now) return;
    this.combatNoiseAt.set(roomId, now);
    this.roomSound(roomId, "The sounds of a fight echo {dir}.");
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
    const now = Date.now();
    for (const c of this.creatures.values()) {
      if (c.target || c.roomId === sourceRoomId) continue;
      const tmpl = world.mobTemplates.get(c.templateId)!;
      if (tmpl.is_boss) continue; // the King waits; the noise comes to him
      if (DROWNERS.has(c.templateId)) continue; // it holds its water; noise doesn't move it
      if (SENTINELS.has(c.templateId)) continue; // a guardian holds its post; noise doesn't draw it off the door
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
  public roomFeed(roomId: string, text: string, exceptPubkey?: string, toRelay = true): void {
    const frame = JSON.stringify({ v: 0, kind: 24913, room: roomId, text });
    for (const s of this.sessions.values()) {
      if (s.roomId !== roomId || s.pubkey === exceptPubkey) continue;
      try { s.ws.send(frame); } catch {}
    }
    // Players standing here always see it (a cheap in-memory send). The relay,
    // though, only carries what a distant watcher would care about — a fight, a
    // death, an arrival. Idle creature wandering stays LOCAL: it was flooding the
    // relays two ephemeral events per step (leave + enter) with rats pacing empty
    // rooms nobody watches. That noise never leaves the box now.
    if (toRelay) this.relayFeed("mudroom-" + roomId, text);
  }

  public roomFeedAll(text: string): void {
    const frame = JSON.stringify({ v: 0, kind: 24913, room: "*", text });
    for (const s of this.sessions.values()) {
      try { s.ws.send(frame); } catch {}
    }
    this.relayFeed("mudzone-" + (this.world?.zone ?? "door"), text);
  }

  // Outbound relay door: fire-and-forget, only when something happened —
  // an idle dungeon publishes nothing and costs nothing.
  private relayFeed(roomTag: string, text: string): void {
    if (!this.world || !isGameKeyConfigured(this.env) || relayList(this.env).length === 0) return;
    try {
      const ev = signFeedEvent(this.env, roomTag, this.world.zone, this.anonForRelay(text));
      this.state.waitUntil(publishEvent(this.env, ev));
    } catch {}
  }

  // The relay is a public feed anyone can subscribe to. A name on it lets a
  // stream-sniper follow one wanderer room to room — and the world doesn't
  // snitch. So every connected player's name is scrubbed to "a wanderer"
  // before it leaves the box. People standing IN the room still read real
  // names on their local socket; only the outbound relay is anonymized.
  private anonForRelay(text: string): string {
    let out = text;
    for (const s of this.sessions.values()) {
      if (!s.name) continue;
      const esc = s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(`\\b${esc}\\b`, "g"), "a wanderer");
    }
    // A name at the head of the line ("Irongate arrives") leaves a lowercase
    // "a wanderer" at the sentence start — lift the first letter back up.
    return out.length ? out[0].toUpperCase() + out.slice(1) : out;
  }
}

