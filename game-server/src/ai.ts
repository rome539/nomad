// Creature AI: how the dungeon's animals think between alarms — grudges and
// memory, waking to noise, hunting and wandering, scavenging and breeding, the
// boss's rage, and the migration that refills the world. Free functions over a
// ZoneDO (its tick and combat live in zone.ts and call in here).
import type { ZoneDO } from "./zone";
import type { Creature, Session } from "./zone-types";
import type { MobTemplate, World } from "./world";
import { randInt, chance, uuid } from "./rng";
import { cap } from "./zone-util";
import {
  FORGET_MS, FORGET_DEFAULT, GRUDGE_MAX, SCAVENGERS, AGGRO_SCAVENGERS, SCAVENGER_BOLD_AT,
  SCAVENGER_HEAL, CORPSE_TRACES, DIRE_ROUSE_MS, HOLLOW, LISTENERS, LURKERS, DROWNERS,
  RUNNERS, BROODERS, SENTINELS, FEARS_FIRE, FIRE_ITEMS, SURFACERS, SURFACE_ROOMS, PATROLS, HUNGRY_AT, TERRITORY_RADIUS, CROWD_CAP,
  MIGRATION_FACTOR, MIGRATION_MIN_FACTOR, BROOD_CAP, BROOD_INTERVAL_MS, HURT_STYLE,
  MOVE_SOUNDS, WANDER_MIN_MS, WANDER_MAX_MS, MOUTHS, QUIET_ITEMS, QUIET_WAKE_MULT,
} from "./zone-data";

  // Roll a spawn's bloodline: usually the ordinary version, rarely the mean
  // cousin. Shared by first-light seeding and migration refills.
export function rollBloodline(z: ZoneDO, tmpl: MobTemplate): MobTemplate {
    const world = z.world!;
    for (const v of world.mobVariants) {
      if (v.baseId !== tmpl.id || !chance(v.chance)) continue;
      const vt = world.mobTemplates.get(v.variantId);
      if (vt) return vt;
    }
    return tmpl;
  }

  // Never carry more of a bloodline than its dens allow. A deploy that retires
  // spawn rows (as the variant dens were) leaves their creatures alive in the
  // saved state — and a brood-mother that lost her nest keeps birthing into it.
  // This trims each overstocked bloodline back to its base cap on load, shedding
  // the STRAYS first: whatever stands off any den, farthest out (an evicted
  // fixture, a nest pup), and a variant before the plain stock. Den-standing
  // population is untouched, so a healthy world no-ops. Returns the cull count.
export function reconcilePopulation(z: ZoneDO, world: World): number {
    const caps = new Map<string, number>();
    const dens = new Map<string, string[]>(); // bloodline base -> its den rooms
    for (const s of world.mobSpawns) {
      caps.set(s.template_id, (caps.get(s.template_id) ?? 0) + 1);
      const list = dens.get(s.template_id) ?? [];
      list.push(s.room_id);
      dens.set(s.template_id, list);
    }
    const byLine = new Map<string, Creature[]>();
    for (const c of z.creatures.values()) {
      const line = z.variantBase.get(c.templateId) ?? c.templateId;
      const list = byLine.get(line) ?? [];
      list.push(c);
      byLine.set(line, list);
    }
    let culled = 0;
    for (const [line, list] of byLine) {
      const cap = caps.get(line) ?? 0;
      if (list.length <= cap) continue;
      const homes = dens.get(line) ?? [];
      const distToDen = (c: Creature) => homes.length
        ? Math.min(...homes.map((h) => z.roomDist(c.roomId, h)))
        : Number.POSITIVE_INFINITY;
      // Most-removable first: farthest from a den, then variants before base.
      const doomed = [...list].sort((a, b) => {
        const da = distToDen(a), db = distToDen(b);
        if (da !== db) return db - da;
        const va = z.variantBase.has(a.templateId) ? 0 : 1;
        const vb = z.variantBase.has(b.templateId) ? 0 : 1;
        return va - vb;
      }).slice(0, list.length - cap);
      for (const c of doomed) { z.creatures.delete(c.id); culled++; }
    }
    return culled;
  }

  // How long this creature holds a grudge. The boss never forgets.
export function forgetMs(z: ZoneDO, tmpl: MobTemplate): number {
    return tmpl.is_boss ? Infinity : (FORGET_MS[tmpl.id] ?? FORGET_DEFAULT);
  }

  // Does it still remember (and still hate) this pubkey? Expired grudges don't
  // count even if they haven't been pruned from the array yet.
export function remembers(z: ZoneDO, creature: Creature, pubkey: string, now: number): boolean {
    const ms = forgetMs(z, z.world!.mobTemplates.get(creature.templateId)!);
    return creature.grudges.some((g) => g.pk === pubkey && now - g.at < ms);
  }

export function addGrudge(z: ZoneDO, creature: Creature, pubkey: string): void {
    const now = Date.now();
    const existing = creature.grudges.find((g) => g.pk === pubkey);
    if (existing) { existing.at = now; return; } // fresh blood renews the memory
    creature.grudges.push({ pk: pubkey, at: now });
    if (creature.grudges.length > GRUDGE_MAX) creature.grudges.shift();
  }

  // Sound wakes the blind sentinels. A dormant listener (a skeleton) in the
  // room may catch your movement or your noise and lurch into a swing — one
  // first strike, like being jumped. Grudge-holders are skipped (they wake on
  // their own); a still, silent wanderer rolls nothing and is walked right past.
  // Returns true if one woke (so a caller mid-exit can check for a killing blow).
export async function wakeListeners(z: ZoneDO, session: Session, roomId: string, odds: number, tell: string, fromNoise = false): Promise<boolean> {
    if (session.away) return false;
    // QUIET gear (felt soles, the grave-shroud) halves what the bones hear —
    // your footfall, your slip past, your reach for the door. Worn, not carried.
    if (session.items.some((c) => c.equipped && QUIET_ITEMS.has(c.itemId))) odds *= QUIET_WAKE_MULT;
    const now = Date.now();
    for (const c of z.creatures.values()) {
      if (c.roomId !== roomId || c.target) continue;
      const lurker = LURKERS.has(c.templateId);
      if (!LISTENERS.has(c.templateId) && !lurker) continue;
      // The din of a fight no longer rouses the bone-sleepers — they wake to
      // movement (in or past) and to a grudge, not to noise alone. Blind lurkers
      // still strike at sound; that's the whole of what they are.
      if (fromNoise && !lurker) continue;
      if (remembers(z, c, session.pubkey, now)) continue;
      if (!chance(odds)) continue;
      const tmpl = z.world!.mobTemplates.get(c.templateId)!;
      c.target = session.pubkey;
      c.hidden = false; // a lurker that strikes is unseen no longer
      if (!session.target) session.target = c.id;
      z.send(session, lurker ? `${cap(tmpl.name)} drops out of the dark and is on you!` : `${cap(tmpl.name)} ${tell}`);
      z.roomFeed(roomId, `${cap(tmpl.name)} ${lurker ? "uncoils from the dark" : "lurches awake"}.`, session.pubkey);
      await z.creatureFirstStrike(c, tmpl, session);
      return true;
    }
    return false;
  }

  // A player walks in (or connects): anything here that remembers them attacks.
  // `ambush` = the player just stepped into this room (their choice, their
  // exposure), so a grudge-holder gets the first strike. On a reconnect
  // (blinking back into being) it's false — no free hit for the reconnection.
export async function provokeGrudges(z: ZoneDO, session: Session, ambush: boolean): Promise<void> {
    if (z.outOfWorld(session)) return; // out of the world at a gate — nothing can mark you
    const now = Date.now();
    let struck = false;
    for (const creature of z.creatures.values()) {
      if (creature.roomId !== session.roomId || creature.target) continue;
      const holdsGrudge = remembers(z, creature, session.pubkey, now);
      const guards = hyenaGuardsMeal(z, creature);
      if (!holdsGrudge && !guards) continue;
      const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
      // A dire-hyena guarding its kill no longer jumps you the instant you walk
      // in — it winds up (DIRE_ROUSE_MS; the act loop commits it), and the tell
      // fires now so the warning is immediate. Only a real grudge strikes on
      // sight. (A hyena that both remembers you AND guards falls through to the
      // grudge path below and comes straight for you.)
      if (guards && !holdsGrudge) {
        if (creature.rouseAt === undefined) {
          creature.rouseAt = now + DIRE_ROUSE_MS;
          z.send(session, `${cap(tmpl.name)} rises over its kill, hackles up and fixed on you — it hasn't sprung yet. (get out, or hit first)`);
          z.roomFeed(session.roomId, `${cap(tmpl.name)} rises from its kill, hackles up.`, session.pubkey);
        }
        continue;
      }
      creature.target = session.pubkey;
      if (!session.target) session.target = creature.id;
      z.send(session, `${cap(tmpl.name)} remembers you — and comes for you.`);
      z.roomFeed(session.roomId, `${cap(tmpl.name)} goes for ${session.name}.`, session.pubkey);
      // The first one to reach you gets the jump; the rest merely engage.
      if (ambush && !struck) {
        struck = true;
        await z.creatureFirstStrike(creature, tmpl, session);
        if (session.hp <= 0) return; // felled by the ambush — already moved to a gate
      }
    }
  }

  // Move one room: wandering or fleeing. Creatures can't open locked doors,
  // but walk through any door the players have left open. Wandering picks,
  // in order: a noise worth investigating, a room that smells of food, the
  // next stop on a patrol route, or wherever.
export async function creatureMoves(z: ZoneDO, creature: Creature, now: number, mode: "wander" | "flee", silent: boolean): Promise<void> {
    const world = z.world!;
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    let exits = (world.exits.get(creature.roomId) ?? []).filter(
      (e) => !e.key_item || z.openDoors.has(`${creature.roomId}:${e.dir}`),
    );
    // Hideaways — a crack in the wall — let nothing in, not even the King. A
    // fled foe who folds into one is out of reach until they step back out.
    if (world.safeRooms.size) {
      const open = exits.filter((e) => !world.safeRooms.has(e.to_room));
      if (open.length) exits = open; // never strand (creatures are never inside one)
    }
    // Every gate is the dungeon's threshold — cold air and the way out. No
    // ordinary creature holds a doorway, so a respawn is never spawn-camped
    // where it appears. (The boss may go anywhere; it fears nothing.)
    if (!tmpl.is_boss) {
      const inner = exits.filter((e) => !world.entryRooms.has(e.to_room));
      if (inner.length) exits = inner; // never strand a creature with no exits
    }
    // Territory: idle wandering keeps to the ground around the den. Beyond the
    // edge (fled, or freshly walked in from a dark mouth), every idle step is
    // a step home instead — this is what keeps the deep in the deep, and what
    // carries a migrant from the mouth to its range. Fleeing ignores the edge
    // (survival first; the next calm step starts the walk back). Patrollers
    // are exempt — their route is their territory. Never strands.
    if (mode === "wander" && creature.home && !tmpl.is_boss && !PATROLS[tmpl.id]) {
      const d = z.roomDist(creature.roomId, creature.home);
      if (d > TERRITORY_RADIUS) {
        const closer = exits.filter((e) => z.roomDist(e.to_room, creature.home!) < d);
        if (closer.length) exits = closer;
      } else {
        const within = exits.filter((e) => z.roomDist(e.to_room, creature.home!) <= TERRITORY_RADIUS);
        if (within.length) exits = within;
      }
    }
    // Idle drift avoids an already-packed room, so wandering doesn't stack the
    // whole zone into one hub. (Answering a noise or fleeing still goes where it
    // must; and we never strand a creature with no other way to turn.)
    if (mode === "wander" && !creature.curious) {
      const uncrowded = exits.filter((e) => creaturesIn(z, e.to_room) < CROWD_CAP);
      if (uncrowded.length) exits = uncrowded;
    }
    if (exits.length === 0) return;

    let exit = exits[randInt(0, exits.length - 1)];
    let investigating = false;
    if (mode === "flee") {
      creature.curious = null;
    } else if (creature.curious && creature.curious !== creature.roomId) {
      const toward = exits.find((e) => e.to_room === creature.curious);
      if (toward) { exit = toward; investigating = true; }
      creature.curious = null; // one look is all it owes the noise
    } else if (SCAVENGERS.has(tmpl.id)) {
      // Follows the scent of the dead: toward a room that holds corpse-litter.
      const scent = exits.find((e) =>
        (z.traces.get(e.to_room) ?? []).some((tr) => CORPSE_TRACES.has(tr.kind)),
      );
      if (scent) exit = scent;
      creature.curious = null;
    } else if (creature.hunger >= HUNGRY_AT && !HOLLOW.has(tmpl.id)) {
      const smells = exits.find((e) =>
        (z.ground.get(e.to_room) ?? []).some((id) => world.itemTemplates.get(id)?.lure),
      );
      if (smells) exit = smells;
      creature.curious = null;
    } else {
      creature.curious = null;
      const route = PATROLS[tmpl.id];
      if (route) {
        let idx = creature.patrolIdx ?? 0;
        if (route[idx % route.length] === creature.roomId) idx++;
        const targetRoom = route[idx % route.length];
        const toward = exits.find((e) => e.to_room === targetRoom);
        if (toward) { exit = toward; creature.patrolIdx = idx + 1; }
        // off-route: random steps until the rounds find it again
      }
    }

    const from = creature.roomId;
    creature.roomId = exit.to_room;
    creature.nextWanderAt = now + randInt(WANDER_MIN_MS, WANDER_MAX_MS);
    // Beyond its territory a creature travels with purpose — the walk in from
    // a dark mouth (or back from a rout) is minutes, not an afternoon.
    if (creature.home && !tmpl.is_boss && z.roomDist(creature.roomId, creature.home) > TERRITORY_RADIUS) {
      creature.nextWanderAt = now + randInt(8000, 25_000);
    }
    if (mode === "flee") {
      creature.target = null;
      for (const s of z.sessions.values()) {
        if (s.target === creature.id) s.target = null;
      }
    }
    if (!silent) {
      // The hollow don't bleed — they come apart in their own way. A runner
      // isn't wounded at all: it just darts, whole and gone.
      const hurt = HURT_STYLE[tmpl.id];
      const runner = RUNNERS.has(tmpl.id);
      const outLine = mode !== "flee"
        ? `${cap(tmpl.name)} ${tmpl.is_boss ? "moves" : "slips away"} ${exit.dir}.`
        : runner ? `${cap(tmpl.name)} darts ${exit.dir} and is gone.`
        : hurt ? `${cap(tmpl.name)} ${hurt.out.replace("{dir}", exit.dir)}`
        : `${cap(tmpl.name)} flees ${exit.dir}, bleeding.`;
      // Idle wandering stays LOCAL (off the relay) — that was the flood. A
      // creature FLEEING is a beat in a fight a watcher's following, so that one
      // still reaches the relay.
      const toRelay = mode === "flee";
      z.roomFeed(from, outLine, undefined, toRelay);
      const inLine = mode !== "flee" ? "creeps in."
        : runner ? "skitters in, already looking for the next way out."
        : hurt ? hurt.in_ : "bursts in, bleeding.";
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} ${inLine}`, undefined, toRelay);
      z.roomSound(
        creature.roomId,
        mode === "flee"
          ? (runner ? "Something small scrabbles away {dir}, fast." : HOLLOW.has(tmpl.id) ? "Something clatters away {dir}, broken." : "Something crashes away {dir}, wounded.")
          : (MOVE_SOUNDS[tmpl.id] ?? "Something moves {dir}."),
        from,
      );
      z.refreshRoomCtx(from);
      z.refreshRoomCtx(creature.roomId);
      // Walking into a room full of people it hates — it marks the first and
      // (unless it's fleeing) gets the jump on them, same as when you walk in.
      // A dire-hyena dragging its kill in among them does NOT jump: it winds up
      // instead (the act loop's rouse handles it next tick), so a grudge is the
      // only thing that strikes on arrival here.
      for (const s of z.sessions.values()) {
        if (s.roomId === creature.roomId && !z.outOfWorld(s) && !creature.target
            && remembers(z, creature, s.pubkey, now)) {
          creature.target = s.pubkey;
          z.send(s, `${cap(tmpl.name)} remembers you — and comes for you.`);
          // It gets the jump only if the player isn't already fully dogpiled this
          // tick; otherwise it just marks them and swings in on the next round.
          if (mode !== "flee" && z.canLandBlow(s.pubkey)) await z.creatureFirstStrike(creature, tmpl, s);
          break;
        }
      }
      // Came to investigate and found a fight: it joins. Noise has a price —
      // except for the bone-sleepers. A skeleton drawn by the din still walks
      // in, but it does NOT throw itself into the fight; it arrives dormant and
      // strikes only if you MOVE while it's there (wakeListeners) or it already
      // holds a grudge (handled just above). Creepier, and truer to what it is.
      if (investigating && !creature.target && !LISTENERS.has(tmpl.id)) {
        for (const s of z.sessions.values()) {
          if (s.roomId === creature.roomId && z.inCombat(s)) {
            creature.target = s.pubkey;
            addGrudge(z, creature, s.pubkey);
            z.send(s, `${cap(tmpl.name)} joins the fight, drawn by the noise!`);
            z.roomFeed(creature.roomId, `${cap(tmpl.name)} joins the fight!`, s.pubkey);
            break;
          }
        }
      }
    }
  }

  // Hungry creature eats the most fragrant thing on the floor.
export function creatureEatsHere(z: ZoneDO, creature: Creature, silent: boolean, at = Date.now()): void {
    if (HOLLOW.has(creature.templateId)) return; // nothing inside to feed
    const world = z.world!;
    const here = z.ground.get(creature.roomId) ?? [];
    const idx = here.findIndex((id) => world.itemTemplates.get(id)?.lure);
    if (idx === -1) return;
    const item = world.itemTemplates.get(here[idx])!;
    here.splice(idx, 1);
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    creature.hunger = 0;
    creature.hp = Math.min(tmpl.max_hp, creature.hp + Math.max(item.heal, 3));
    z.addTrace(creature.roomId, { kind: "scraps", at });
    if (!silent) {
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} tears into ${item.name}.`);
      z.roomSound(creature.roomId, "Wet tearing sounds drift {dir}.");
      z.refreshRoomCtx(creature.roomId);
    }
  }

  // A scavenger that has eaten enough of the dead loses its nerve: it stops
  // fleeing and swings harder. The dungeon's own corpses arm it.
export function scavengerBold(z: ZoneDO, creature: Creature): boolean {
    return SCAVENGERS.has(creature.templateId) && (creature.fed ?? 0) >= SCAVENGER_BOLD_AT;
  }

export function playerPresent(z: ZoneDO, roomId: string): boolean {
    for (const s of z.sessions.values()) if (s.roomId === roomId && !z.outOfWorld(s)) return true;
    return false;
  }

  // Does this wanderer bear an open flame in hand? The single wire-up point for
  // FEARS_FIRE. Pre-written for the Light & search phase: no lit-fire item exists
  // yet, so FIRE_ITEMS is empty and this is always false — the moment a torch or
  // burning-brand lands, add its id to FIRE_ITEMS (zone-data) and every
  // fire-fearing creature starts bolting from anyone carrying it. Held or worn
  // both count; a flame is a flame whether it's in your fist or hung at your hip.
export function carriesFire(session: Session): boolean {
    return session.items.some((c) => FIRE_ITEMS.has(c.itemId));
  }

  // A fire-fearing thing (the albino rat, for now) will not stand against an open
  // flame: cornered by a fire-bearer it recoils, and the combat tick turns that
  // into a flat flee whatever its health. Dormant until torches exist (carriesFire
  // is false today). Returns true when it's recoiling, having said so.
export function dreadsFire(z: ZoneDO, creature: Creature, victim: Session): boolean {
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    if (!FEARS_FIRE.has(tmpl.id) || !carriesFire(victim)) return false;
    z.send(victim, `${cap(tmpl.name)} shrinks from your flame and breaks away.`);
    z.roomFeed(creature.roomId, `${cap(tmpl.name)} shrinks from the flame.`, victim.pubkey);
    return true;
  }

  // A brood-mother births a scabby rat into her room on a slow clock, up to a
  // cap — a living spawn source. She only breeds while unbothered (no target),
  // so engaging her IS the way to stem the tide; leave her and the room fills.
export function broodBirths(z: ZoneDO, mother: Creature, now: number): void {
    if (!mother.nextBirthAt) { mother.nextBirthAt = now + BROOD_INTERVAL_MS; return; }
    if (now < mother.nextBirthAt) return;
    mother.nextBirthAt = now + BROOD_INTERVAL_MS;
    const ratTmpl = z.world!.mobTemplates.get("rat");
    if (!ratTmpl) return;
    let count = 0;
    for (const c of z.creatures.values()) {
      if (c.roomId === mother.roomId && c.templateId === "rat") count++;
    }
    if (count >= BROOD_CAP) return;
    const pupId = uuid();
    z.creatures.set(pupId, {
      id: pupId,
      templateId: "rat",
      roomId: mother.roomId,
      hp: ratTmpl.max_hp,
      hunger: randInt(0, HUNGRY_AT - 10),
      grudges: [],
      nextWanderAt: now + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
      target: null,
      home: mother.roomId, // born to the nest; its ground is its mother's
    });
    const mtmpl = z.world!.mobTemplates.get(mother.templateId)!;
    z.roomFeed(mother.roomId, `${cap(mtmpl.name)} shudders, and a fresh pup squirms free.`);
    z.roomSound(mother.roomId, "A wet, squealing sound {dir}.");
    z.refreshRoomCtx(mother.roomId);
  }

  // The mean subtype is guarding a meal when it's standing on a corpse, or it's
  // already gorged bold. While guarding, it turns on anyone who walks in on it —
  // no grudge needed. Disturb its dinner and you are the next course.
export function hyenaGuardsMeal(z: ZoneDO, creature: Creature): boolean {
    if (!AGGRO_SCAVENGERS.has(creature.templateId)) return false;
    if (scavengerBold(z, creature)) return true;
    const list = z.traces.get(creature.roomId);
    return !!list && list.some((tr) => CORPSE_TRACES.has(tr.kind));
  }

  // Eat one corpse (blood/remains litter) in the room: heal, sate, and grow
  // bolder. Leaving the dead lying is what fattens a hyena into a real threat.
export function scavengerFeeds(z: ZoneDO, creature: Creature, silent: boolean): void {
    const list = z.traces.get(creature.roomId);
    if (!list) return;
    const idx = list.findIndex((tr) => CORPSE_TRACES.has(tr.kind));
    if (idx === -1) return;
    list.splice(idx, 1);
    if (list.length === 0) z.traces.delete(creature.roomId);
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    creature.hunger = 0;
    creature.hp = Math.min(tmpl.max_hp, creature.hp + SCAVENGER_HEAL);
    const before = creature.fed ?? 0;
    creature.fed = before + 1;
    if (!silent) {
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} tears into the dead, feeding.`);
      z.roomSound(creature.roomId, "Wet, cracking sounds drift {dir}.");
      if (before < SCAVENGER_BOLD_AT && creature.fed >= SCAVENGER_BOLD_AT) {
        z.roomFeed(creature.roomId, `${cap(tmpl.name)} lifts its head, gorged and unafraid.`);
      }
      z.refreshRoomCtx(creature.roomId);
    }
  }

  // A scavenger alone in a room drags off gear left on the floor (a body's
  // spoils) and carries it — recover it by running the thing down and killing
  // it. It won't snatch loot from a player's feet: only an empty room is fair
  // game, so your own fresh kill is safe while you're standing over it.
export function scavengerScoops(z: ZoneDO, creature: Creature): void {
    if (!SCAVENGERS.has(creature.templateId)) return;
    if (playerPresent(z, creature.roomId)) return;
    const floor = z.ground.get(creature.roomId);
    if (!floor?.length) return;
    // Real gear only — it has no use for food (it eats that) or the free rock.
    const idx = floor.findIndex((id) => {
      const t = z.world!.itemTemplates.get(id);
      return !!t && t.slot !== "" && t.id !== "loose-rock";
    });
    if (idx === -1) return;
    const [id] = floor.splice(idx, 1);
    z.ground.set(creature.roomId, floor);
    (creature.carries ??= []).push(id);
    const g = z.world!.itemTemplates.get(id);
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    if (g) z.roomFeed(creature.roomId, `${cap(tmpl.name)} snatches up ${g.name} and drags it off into the dark.`);
    z.refreshRoomCtx(creature.roomId);
  }

  // The dead stay dead — but the dungeon refills. When a population is below
  // its cap, a migrant is already on its way; it arrives here.
export function scheduleArrivals(z: ZoneDO, now: number): void {
    const world = z.world!;
    const caps = new Map<string, number>();
    for (const spawn of world.mobSpawns) {
      caps.set(spawn.template_id, (caps.get(spawn.template_id) ?? 0) + 1);
    }
    // A variant counts against its bloodline's cap: a den holding a dire
    // hyena is a hyena den held, not a hyena short (or the world would refill
    // around every promotion and swell past its caps).
    const alive = new Map<string, number>();
    for (const c of z.creatures.values()) {
      const line = z.variantBase.get(c.templateId) ?? c.templateId;
      alive.set(line, (alive.get(line) ?? 0) + 1);
    }
    for (const [templateId, cap_] of caps) {
      const short = cap_ - (alive.get(templateId) ?? 0) - (z.arrivals.has(templateId) ? 1 : 0);
      if (short > 0 && !z.arrivals.has(templateId)) {
        const tmpl = world.mobTemplates.get(templateId)!;
        // Fodder refills faster the busier the zone; the boss keeps its clock.
        const factor = tmpl.is_boss
          ? MIGRATION_FACTOR
          : Math.max(MIGRATION_MIN_FACTOR, MIGRATION_FACTOR / Math.max(1, z.sessions.size));
        z.arrivals.set(templateId, now + tmpl.respawn_secs * 1000 * factor);
      }
    }
  }

export function applyArrivals(z: ZoneDO, now: number, silent: boolean): void {
    const world = z.world!;
    for (const [templateId, at] of z.arrivals) {
      if (at > now) continue;
      z.arrivals.delete(templateId);
      const baseTmpl = world.mobTemplates.get(templateId);
      if (!baseTmpl) continue;
      // Rare blood: what refills the ground is usually the ordinary version,
      // once in a while the mean cousin. (Spawn rows belong to the base.)
      const tmpl = rollBloodline(z, baseTmpl);
      // Migrants respect the threshold too: nothing ordinary arrives AT a
      // gate (same rule as wandering), or a rat could materialize on top
      // of a respawn. Boss homes are wherever they are.
      let homes = world.mobSpawns.filter((s) => s.template_id === templateId).map((s) => s.room_id);
      if (!tmpl.is_boss) {
        const inner = homes.filter((r) => !world.entryRooms.has(r));
        if (inner.length) homes = inner;
      }
      // One mother to a room: a nest with two fountains is a meat grinder. Steer
      // a respawning brood-mother to a home that hasn't already got one (fall
      // back to her homes if every nest is taken).
      if (BROODERS.has(tmpl.id)) {
        const taken = new Set<string>();
        for (const c of z.creatures.values()) {
          if (c.templateId === tmpl.id) taken.add(c.roomId);
        }
        const open = homes.filter((r) => !taken.has(r));
        if (open.length) homes = open;
      }
      const home = homes[randInt(0, Math.max(0, homes.length - 1))] ?? world.entryRoom;
      // Migration is a walk, not a materialization: a walker surfaces at the
      // dark mouth nearest its den and makes its way in (territory homing does
      // the walking). The sessile — mothers, the drowned — and the boss simply
      // are where they live.
      let roomId = home;
      if (!tmpl.is_boss && !BROODERS.has(tmpl.id) && !DROWNERS.has(tmpl.id) && !SENTINELS.has(tmpl.id)) {
        let bestD = Number.POSITIVE_INFINITY;
        for (const m of MOUTHS) {
          if (!world.rooms.has(m)) continue;
          const d = z.roomDist(m, home);
          if (d < bestD) { bestD = d; roomId = m; }
        }
      }
      const creature: Creature = {
        id: uuid(),
        templateId: tmpl.id,
        roomId,
        hp: tmpl.max_hp,
        hunger: randInt(HUNGRY_AT - 20, HUNGRY_AT + 20), // travel works up an appetite
        grudges: [],
        // A fresh migrant starts its walk in promptly; the settled keep their idle clock.
        nextWanderAt: now + (roomId === home ? randInt(WANDER_MIN_MS, WANDER_MAX_MS) : randInt(4000, 15_000)),
        target: null,
        carries: z.rollCarry(tmpl),
        hidden: LURKERS.has(tmpl.id) || undefined,
        home,
      };
      z.creatures.set(creature.id, creature);
      if (tmpl.is_boss) {
        // What lives behind the black door has reformed — and the door knows.
        for (const [rid, exits] of world.exits) {
          for (const e of exits) {
            if (e.to_room === roomId && e.key_item) z.openDoors.delete(`${rid}:${e.dir}`);
          }
        }
        if (!silent) z.roomFeedAll("Deep below, iron grinds shut. Something remembers its shape.");
      } else if (!silent) {
        z.roomFeed(roomId, `${cap(tmpl.name)} creeps out of the dark.`);
        z.roomSound(roomId, "Something stirs {dir}.");
        z.refreshRoomCtx(roomId);
      }
    }
  }

  // The deep coughs one of its own up through the cracks. Called on a slow clock
  // while the deep door is SEALED (the tick gates it): the world mints the
  // corpse-key by surfacing a mobile deep-dweller into the shallows, where a
  // player can kill it and cut its still-cold heart. One at a time — if something's
  // already up, we wait. If no mobile deep-kin is alive right now, we simply try
  // again next interval (arrivals keep the deep stocked, so it's never a soft-lock).
export function surfaceDeepKin(z: ZoneDO, now: number): boolean {
    const world = z.world!;
    for (const c of z.creatures.values()) if (c.surfaced) return false; // one horror up at a time
    const candidates = [...z.creatures.values()].filter((c) => SURFACERS.has(c.templateId));
    if (candidates.length === 0) return false;
    const rooms = SURFACE_ROOMS.filter((r) => world.rooms.has(r));
    if (rooms.length === 0) return false;
    const c = candidates[randInt(0, candidates.length - 1)];
    const dest = rooms[randInt(0, rooms.length - 1)];
    const tmpl = world.mobTemplates.get(c.templateId)!;
    c.roomId = dest;
    c.surfaced = true;
    c.hidden = false;   // it's up in the open, filth-streaked and desperate — no lurking
    c.target = null;
    c.nextWanderAt = now + randInt(WANDER_MIN_MS, WANDER_MAX_MS);
    z.roomFeed(dest, `${cap(tmpl.name)} drags itself up out of a black crack in the floor, streaming filth — something that belongs to the deep, thrown up into the light. Cut the heart from it while it's cold.`);
    z.roomSound(dest, "Something scrabbles up out of the dark {dir}, wet and wrong.");
    z.refreshRoomCtx(dest);
    return true;
  }

  // The King does not mind that you came — until you make him stand.
export function bossPhase(z: ZoneDO, creature: Creature, tmpl: MobTemplate, foe: Session): void {
    const ratio = creature.hp / tmpl.max_hp;
    const newPhase = ratio <= 1 / 3 ? 2 : ratio <= 2 / 3 ? 1 : 0;
    if (newPhase <= (creature.phase ?? 0)) return;
    creature.phase = newPhase;
    if (newPhase === 1) {
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} rises from the throne. The dark rises with him.`);
      z.send(foe, `${cap(tmpl.name)} rises from the throne. The dark rises with him.`);
      z.roomSound(creature.roomId, "Stone scrapes {dir}; something vast has stood up.");
      z.creatureNoise(creature.roomId);
    } else {
      z.roomFeedAll(`A voice rolls through the stone: ${cap(tmpl.name)} calls — and the dark answers.`);
      const summoned: Creature = {
        id: uuid(),
        templateId: "rat",
        roomId: creature.roomId,
        hp: z.world!.mobTemplates.get("rat")?.max_hp ?? 8,
        hunger: HUNGRY_AT,
        grudges: [{ pk: foe.pubkey, at: Date.now() }],
        nextWanderAt: Date.now() + randInt(WANDER_MIN_MS, WANDER_MAX_MS),
        target: foe.pubkey,
        home: creature.roomId, // called out of the throne's dark; it stays near it
      };
      z.creatures.set(summoned.id, summoned);
      z.roomFeed(creature.roomId, "Something scabby pours out of the dark beneath the throne.");
      z.send(foe, "Something scabby pours out of the dark beneath the throne — and comes for you.");
      z.refreshRoomCtx(creature.roomId);
      z.creatureNoise(creature.roomId);
    }
  }

  // How many creatures stand in a room right now (for crowd/convergence caps).
export function creaturesIn(z: ZoneDO, roomId: string): number {
    let n = 0;
    for (const c of z.creatures.values()) if (c.roomId === roomId) n++;
    return n;
  }
