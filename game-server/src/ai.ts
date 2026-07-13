// Creature AI: how the dungeon's animals think between alarms — grudges and
// memory, waking to noise, hunting and wandering, scavenging and breeding, the
// boss's rage, and the migration that refills the world. Free functions over a
// ZoneDO (its tick and combat live in zone.ts and call in here).
import type { ZoneDO } from "./zone";
import type { Creature, Session } from "./zone-types";
import type { MobTemplate, World } from "./world";
import { randInt, chance, uuid, pick } from "./rng";
import { cap } from "./zone-util";
import * as events from "./events";
import {
  FORGET_MS, FORGET_DEFAULT, GRUDGE_MAX, SCAVENGERS, AGGRO_SCAVENGERS, SCAVENGER_BOLD_AT, SCAVENGER_CARRY_CAP, SCOOP_GRACE_MS, SCOOP_NOSE_MS,
  CUDDLE_ODDS, CUDDLE_COLD_MULT, MOURN_FRESH_MS, MOURN_VIGIL_MS, MURMUR_ODDS, MURMUR_COOLDOWN_MS,
  NAPPERS, NAP_ODDS, NAP_MIN_MS, NAP_MAX_MS, GORGE_NAP_ODDS,
  WATER_ROOMS, THIRST_MIN_MS, THIRST_MAX_MS,
  RAT_AVOID_MS, WHISTLE_AVOID_MS, DINNER_LAUGH_ODDS, LURKER_DRIFT_MS, DARK_ROOMS, THIEVES,
  PREYS_ON, PREDATION_ODDS,
  SCAVENGER_HEAL, CORPSE_TRACES, DIRE_ROUSE_MS, HOLLOW, LISTENERS, LURKERS, DROWNERS,
  RUNNERS, BROODERS, SENTINELS, SENTINEL_ROOMS, FEARS_FIRE, FIRE_ITEMS, SURFACERS, SURFACE_ROOMS, PATROLS, HUNGRY_AT, TERRITORY_RADIUS, CROWD_CAP, NOISE_HEED_ODDS,
  MIGRATION_FACTOR, MIGRATION_MIN_FACTOR, BROOD_CAP, BROOD_INTERVAL_MS, HURT_STYLE, FLEE_TELL,
  MOVE_SOUNDS, WANDER_MIN_MS, WANDER_MAX_MS, MOUTHS, QUIET_ITEMS, QUIET_WAKE_MULT,
  DEEP_ROOMS, SURFACED_STALE_MS, OUTDOOR_ROOMS, WARRENS_ROOMS, ESCAPE_TMPL,
} from "./zone-data";

  // Roll a spawn's bloodline: usually the ordinary version, rarely the mean
  // cousin. Shared by first-light seeding and migration refills.
export function rollBloodline(z: ZoneDO, tmpl: MobTemplate, room?: string): MobTemplate {
    const world = z.world!;
    for (const v of world.mobVariants) {
      if (v.baseId !== tmpl.id || !chance(v.chance)) continue;
      // A nester is immortal and sessile, so every extra mother is forever.
      // Her law (rome, 2026-07-10): mothers may spread across the dungeon, but
      // only into a den of her line, and never two to a room — a promotion
      // needs a known destination that's a vacant nest.
      if (BROODERS.has(v.variantId)) {
        if (!room) continue;
        const denRooms = new Set(
          world.mobSpawns.filter((s) => s.template_id === tmpl.id || s.template_id === v.variantId).map((s) => s.room_id),
        );
        if (!denRooms.has(room)) continue;
        let occupied = false;
        for (const c of z.creatures.values()) {
          if (c.templateId === v.variantId && c.roomId === room) { occupied = true; break; }
        }
        if (occupied) continue;
      }
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
      // Same own-row rule as scheduleArrivals: a variant with its own dens is
      // its own line here, so a warren that piled up seeded mothers sheds them
      // on the next load instead of hiding them inside the rat count.
      const line = caps.has(c.templateId) ? c.templateId : (z.variantBase.get(c.templateId) ?? c.templateId);
      const list = byLine.get(line) ?? [];
      list.push(c);
      byLine.set(line, list);
    }
    let culled = 0;
    for (const [line, list] of byLine) {
      // Mothers keep their own law (rome, 2026-07-10): one to a room, dens of
      // her line only. Anything stacked or off-den sheds; the spread ones stay.
      if (BROODERS.has(line)) {
        const base = z.variantBase.get(line) ?? line;
        const denRooms = new Set(
          world.mobSpawns.filter((s) => s.template_id === line || s.template_id === base).map((s) => s.room_id),
        );
        const seated = new Set<string>();
        for (const c of list) {
          if (!denRooms.has(c.roomId) || seated.has(c.roomId)) { z.creatures.delete(c.id); culled++; }
          else seated.add(c.roomId);
        }
        continue;
      }
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

// A fight breaking out in a room pulls in the creatures ALREADY standing in it,
// not just the ones drawn from next door by the noise (rome, 2026-07-13). No
// "arrives" beat — they were here; they just turn on you. Same exemptions as
// the noise-draw so behaviour stays one law: the scary rat (fleet-rat) watches
// and never scrums, the bone-sleepers (LISTENERS) stay dormant till you MOVE,
// the brood-mother spawns rather than brawls, and the posted / water-holding /
// carrion kinds keep to their own business. Fired from combatNoise, so it rolls
// NOISE_HEED_ODDS once per ring — the room piles on in a stagger, not at once.
export function joinSameRoomFight(z: ZoneDO, roomId: string): void {
    for (const creature of z.creatures.values()) {
      if (creature.roomId !== roomId || creature.target || creature.asleep || creature.hidden) continue;
      const tmpl = z.world!.mobTemplates.get(creature.templateId);
      if (!tmpl) continue;
      if (tmpl.is_boss) continue;                                   // the king waits; he doesn't scrum
      if (DROWNERS.has(tmpl.id) || SENTINELS.has(tmpl.id)) continue; // holds its water / its post
      if (SCAVENGERS.has(tmpl.id)) continue;                        // tracks the dead, not the din
      if (BROODERS.has(tmpl.id)) continue;                          // the brood-mother spawns; her young do the fighting
      if (LISTENERS.has(tmpl.id)) continue;                         // the bone-sleeper stays dormant till you move
      if (tmpl.id === "fleet-rat") continue;                        // the scary rat watches, never scrums (rome's standing rule)
      if (!chance(NOISE_HEED_ODDS)) continue;                       // not every one piles on at once
      for (const s of z.sessions.values()) {
        if (s.roomId === roomId && z.inCombat(s) && !z.outOfWorld(s)) {
          creature.target = s.pubkey;
          addGrudge(z, creature, s.pubkey);
          z.send(s, `${cap(tmpl.name)} throws itself into the fight!`);
          z.roomFeed(roomId, `${cap(tmpl.name)} joins the fight!`, s.pubkey);
          break;
        }
      }
    }
  }

  // The legible deep sim (Qud's lesson): a creature's live state reads in the
  // prose, so a wound, a hunt, or a hungry eye on a rival is visible in the
  // room — not a hidden number you only learn from a combat line. Returns the
  // single most-telling clause (phrased to read after "is" OR after a comma),
  // or "" when there's nothing worth saying. `viewer` is the looking player's
  // pubkey, so "fixed on you" only fires for the one being hunted.
export function creatureTell(z: ZoneDO, creature: Creature, viewer: string): string {
    // In fog, every state is the same state: unreadable. The other half of
    // "spot odds down both ways" — the world half-misses you, and you can't
    // read the shapes either.
    const fogged = events.fogTell(z, creature.roomId);
    if (fogged) return fogged;
    if (creature.cuddling) {
      return creature.cuddling === viewer
        ? "curled against you, fast asleep — a small warm weight"
        : "curled up against someone, fast asleep";
    }
    // The sleeper reads plainly (legibility law): what you do with the window
    // is your call — walk past soft, or spend the one heavy blow it grants.
    if (creature.asleep) {
      return SCAVENGERS.has(creature.templateId)
        ? "stretched out asleep beside the stripped bones of its meal, flank rising slow"
        : creature.templateId === "cutpurse"
          ? "dozing in a corner, one eye not quite shut"
          : "curled nose-to-tail, fast asleep";
    }
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    // The key-bearer reads first: a deep-thing in the shallows is an OPPORTUNITY,
    // not an unfair spawn — its heart opens the descent while it's fresh.
    if (creature.surfaced) return "still streaked with the deep's black water — its cold heart is a key, while it beats";
    if (creature.stunned) return "reeling and dazed";
    if (creature.bleedTicks && creature.bleedTicks > 0) return "bleeding freely, dark spatter on the stone";
    if (creature.rouseAt && Date.now() < creature.rouseAt) return "winding up to spring, hackles high";
    if (creature.target === viewer) return "fixed on you";
    if (creature.target) {
      const mark = [...z.sessions.values()].find((s) => s.pubkey === creature.target && !z.outOfWorld(s));
      return mark ? `fixed on ${mark.name}` : "on the hunt";
    }
    // The food web made visible: a hungry predator eyes a weaker thing sharing
    // its room — the tell that lets a player USE predation (bait a scrap, slip past).
    if (creature.hunger >= HUNGRY_AT && !HOLLOW.has(tmpl.id)) {
      const preySet = PREYS_ON.get(creature.templateId);
      if (preySet) {
        const prey = [...z.creatures.values()].find(
          (c) => c.id !== creature.id && c.roomId === creature.roomId && preySet.has(c.templateId),
        );
        if (prey) {
          const pt = z.world!.mobTemplates.get(prey.templateId)!;
          return `eyeing the ${pt.name.replace(/^(a|an|the) /i, "")} across the room`;
        }
      }
      return "restless with hunger";
    }
    if (scavengerBold(z, creature)) return "bold and unafraid, fat on the dead";
    return "";
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
    // The bell outshouts felt soles: while it rings the keep hears everything,
    // and for a while after, the halls stay unsettled (events.bellWakeMult).
    odds = Math.min(1, odds * events.bellWakeMult(z, roomId));
    // The fog swallows half of what would spot you (the stalker's weather).
    odds *= events.fogWakeMult(z, roomId);
    const now = Date.now();
    // The same footfall that wakes the bone-sleepers disturbs the warm ones:
    // a dozing rat or hyena rolls the same odds (quiet soles work on fur as
    // well as bone). A woken grudge-holder remembers you the moment its eyes
    // open; anything else just wakes, and deals with you the normal way.
    for (const c of z.creatures.values()) {
      if (c.roomId !== roomId || !c.asleep) continue;
      if (!chance(Math.min(1, odds))) continue;
      c.asleep = false;
      c.sleepUntil = undefined;
      const ct = z.world!.mobTemplates.get(c.templateId)!;
      if (remembers(z, c, session.pubkey, now)) {
        c.target = session.pubkey;
        if (!session.target) session.target = c.id;
        z.send(session, `${cap(ct.name)} starts awake — and it remembers you.`, "dmgin");
      } else {
        z.send(session, `${cap(ct.name)} stirs at the sound of you and comes awake.`);
      }
      z.refreshRoomCtx(roomId);
    }
    for (const c of z.creatures.values()) {
      if (c.roomId !== roomId || c.target) continue;
      const lurker = LURKERS.has(c.templateId);
      if (!LISTENERS.has(c.templateId) && !lurker) continue;
      // A torch spoils the ambush: a lurker caught in your light can't drop from
      // the dark (it shows in the room instead, revealed — see describeRoom).
      if (lurker && carriesFire(session)) continue;
      // The din of a fight no longer rouses the bone-sleepers — they wake to
      // movement (in or past) and to a grudge, not to noise alone. Blind lurkers
      // still strike at sound; that's the whole of what they are.
      if (fromNoise && !lurker) continue;
      if (remembers(z, c, session.pubkey, now)) continue;
      // The marrow-song: an entranced bone wakes to NOTHING while it plays,
      // and to everything for a while after (per-creature — only the deep's
      // hollow hear it).
      if (!chance(Math.min(1, odds * events.songWakeMult(z, c)))) continue;
      const tmpl = z.world!.mobTemplates.get(c.templateId)!;
      c.hidden = false; // a lurker that strikes is unseen no longer
      // The ambush announcement is the most dangerous line in any log — it
      // bleeds red (and trembles) instead of reading like scenery.
      z.send(session, lurker ? `${cap(tmpl.name)} drops out of the dark and is on you!` : `${cap(tmpl.name)} ${tell}`, lurker ? "seize big" : undefined);
      z.roomFeed(roomId, `${cap(tmpl.name)} ${lurker ? "uncoils from the dark" : "lurches awake"}.`, session.pubkey);
      // A LURKER commits to the kill — it locks on and the fight is joined. A
      // blind LISTENER (a skeleton) only lashes out at the sound and then settles
      // back into its stillness: one annoying blow, no rounds, and no din to draw
      // the room. Swing back and YOU start the fight — that noise is what wakes
      // the others. So the listener's reflex strikes quiet and takes no target.
      if (lurker) {
        c.target = session.pubkey;
        if (!session.target) session.target = c.id;
      }
      await z.creatureFirstStrike(c, tmpl, session, !lurker);
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
      // A sleeping grudge-holder sleeps through your entry — unless the
      // entry-noise roll (wakeListeners) wakes it, and THEN it remembers you.
      if (creature.asleep) continue;
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
    // A sentinel's post (the hound's undercroft) belongs to it alone — nothing
    // ordinary wanders across, and not even a boss shares the guarded doorway.
    // The sentinel never wanders out (it can't target its own room), so this
    // only ever turns others away. Never strands.
    if (SENTINEL_ROOMS.size) {
      const notHeld = exits.filter((e) => !SENTINEL_ROOMS.has(e.to_room));
      if (notHeld.length) exits = notHeld;
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
    // Place-fear: a room this one has bad news about (a squeal, a whistle, its
    // own escape) gets steered around while the memory lasts. Home is exempt —
    // everything may always go home — and fear never strands (all-feared =
    // fear ignored). The memory dies with the creature; migrants arrive naive.
    if (mode === "wander" && creature.avoids?.length) {
      creature.avoids = creature.avoids.filter((a) => a.until > now);
      if (!creature.avoids.length) creature.avoids = undefined;
      else {
        const feared = new Set(creature.avoids.map((a) => a.roomId));
        const safe = exits.filter((e) => !feared.has(e.to_room) || e.to_room === creature.home);
        if (safe.length) exits = safe;
      }
    }
    // A watering run walks with purpose: each step closes on the hole.
    if (mode === "wander" && creature.wateringTo) {
      const d = z.roomDist(creature.roomId, creature.wateringTo);
      const closer = exits.filter((e) => z.roomDist(e.to_room, creature.wateringTo!) < d);
      if (closer.length) exits = closer;
      else creature.wateringTo = undefined; // no way to close on it — the habit passes
    }
    // Rain sends the open ground's beasts under cover — and their run for the
    // tree-line IS the storm's telegraph: watch the grounds empty and you know
    // what's coming before the first drop. (Scavengers stay out in it; the
    // downpour is their hunting weather — see scavengerBold.)
    if (mode === "wander" && events.rainDrives(z, creature.roomId) && !SCAVENGERS.has(tmpl.id)) {
      const covered = exits.filter((e) => !OUTDOOR_ROOMS.has(e.to_room));
      if (covered.length) exits = covered;
    }
    // The bell drives the keep's vermin down into the earth: while it rings,
    // rat-kind runs for den-country — and their flight IS the alarm spreading.
    if (mode === "wander" && events.bellDrivesRats(z, creature)) {
      const downward = exits.filter((e) => WARRENS_ROOMS.has(e.to_room) || MOUTHS.includes(e.to_room));
      if (downward.length) exits = downward;
    }
    // The cold sends the LIVING to warm ground (keep walls, warrens earth) —
    // and what's still out walking in it was never alive: the free tell.
    if (mode === "wander" && events.coldDrives(z, creature)) {
      const warm = exits.filter((e) => !OUTDOOR_ROOMS.has(e.to_room) && !events.deepRoom(z, e.to_room));
      if (warm.length) exits = warm;
    }
    // The tide sends everything living in the Tideways CLIMBING — up toward
    // ground the water can't reach. Their flight past you is the warning.
    if (mode === "wander" && events.tideDrives(z, creature)) {
      const here = events.floodRank(creature.roomId);
      const drier = exits.filter((e) => {
        const there = events.floodRank(e.to_room);
        return there === -1 || (here !== -1 && there > here);
      });
      if (drier.length) exits = drier;
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
    // What beat it colors how it runs — read before the flee clears the target.
    const fledFrom = mode === "flee" ? creature.target : null;
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
    // A summoned hyena that walks OFF the dinner floor may laugh again someday;
    // while it stood there, it never re-called (a call must not trigger a call).
    if (creature.calledTo && from === creature.calledTo) creature.calledTo = undefined;
    // A watering run keeps a brisk pace — minutes to the hole, not an afternoon.
    if (creature.wateringTo) creature.nextWanderAt = now + randInt(8000, 25_000);
    // The calls: breaking from a PLAYER, prey squeals the warren away and a
    // thief whistles the network wary — and both remember the room themselves.
    // The dead tell no one (kill it before it runs and nothing learns).
    if (fledFrom) {
      if (creature.templateId.includes("rat") && !BROODERS.has(creature.templateId)) {
        creature.avoids = [
          ...(creature.avoids ?? []).filter((a) => a.until > now && a.roomId !== from),
          { roomId: from, until: now + RAT_AVOID_MS },
        ];
        ratSqueal(z, from, now, creature);
      } else if (THIEVES.has(creature.templateId)) {
        creature.avoids = [
          ...(creature.avoids ?? []).filter((a) => a.until > now && a.roomId !== from),
          { roomId: from, until: now + WHISTLE_AVOID_MS },
        ];
        thiefWhistle(z, from, now, creature);
      }
    }
    if (!silent) {
      // The hollow don't bleed — they come apart in their own way. A runner
      // isn't wounded at all: it just darts, whole and gone.
      const hurt = HURT_STYLE[tmpl.id];
      const runner = RUNNERS.has(tmpl.id);
      const fleeFam = FLEE_TELL[fledFrom ? z.fleeStyleOf(fledFrom) : "plain"] ?? FLEE_TELL.plain;
      const outLine = mode !== "flee"
        ? `${cap(tmpl.name)} ${tmpl.is_boss ? "moves" : "slips away"} ${exit.dir}.`
        : runner ? `${cap(tmpl.name)} darts ${exit.dir} and is gone.`
        : hurt ? `${cap(tmpl.name)} ${hurt.out.replace("{dir}", exit.dir)}`
        : `${cap(tmpl.name)} ${pick(fleeFam.out).replace("{dir}", exit.dir)}`;
      // Idle wandering stays LOCAL (off the relay) — that was the flood. A
      // creature FLEEING is a beat in a fight a watcher's following, so that one
      // still reaches the relay.
      // Only a flee FROM A PLAYER is a beat a relay-watcher could be following;
      // a rat breaking from a hyena is the ecosystem's business (rome's trim,
      // 2026-07-10 — creature-only churn stays off the wire, like idle wander).
      const toRelay = mode === "flee" && !!fledFrom;
      z.roomFeed(from, outLine, undefined, toRelay);
      const inLine = mode !== "flee" ? "creeps in."
        : runner ? "skitters in, already looking for the next way out."
        : hurt ? hurt.in_ : pick(fleeFam.in_);
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
      // The loosed Gaunt empties every room it enters: what can run, runs —
      // and those emptying rooms ARE its telegraph, spreading a step ahead of
      // it. (The posted and the brood stand; they are nobody's prey.)
      if (creature.templateId === ESCAPE_TMPL) {
        for (const c of z.creatures.values()) {
          if (c.roomId !== creature.roomId || c.id === creature.id) continue;
          if (BROODERS.has(c.templateId) || SENTINELS.has(c.templateId)) continue;
          if (world.mobTemplates.get(c.templateId)?.is_boss) continue;
          c.asleep = false; // the Gaunt's arrival wakes anything dozing in its path
          c.sleepUntil = undefined;
          c.nextWanderAt = now;
        }
      }
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
      // The scary rat (fleet-rat, "a scary rat") is exempt too (rome's ruling):
      // it comes to LOOK — a scavenger's curiosity — but it doesn't throw itself
      // into a brawl between bigger things. It arrives, watches, and keeps its
      // own counsel. Every other investigator — the scabby rat ("rat") very
      // much included — still pays the price and joins in.
      if (investigating && !creature.target && !LISTENERS.has(tmpl.id)
          && tmpl.id !== "fleet-rat") {
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
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} tears into ${item.name}.`, undefined, false);
      z.roomSound(creature.roomId, "Wet tearing sounds drift {dir}.");
      z.refreshRoomCtx(creature.roomId);
    }
  }

  // The food web: a predator sharing a room with prey it outranks may turn on it
  // — when it's hungry, or when there's a kill/bait to fight over. Emergent
  // culling (predators thin the herds the brood-mothers swell) and real tactics
  // (throw offal to start a scrap and slip past). Stays LOCAL, off the relay,
  // like idle wandering — it's world-life, not a fight a watcher is following.
  // Only idle creatures reach this (the tick guards on !target); a struck predator
  // (stunned/bleeding) has other problems. Returns true if it struck, so the tick
  // skips this creature's wander.
export async function predation(z: ZoneDO, creature: Creature, now: number): Promise<boolean> {
    const prey = PREYS_ON.get(creature.templateId);
    if (!prey || creature.stunned || creature.bleedTicks) return false;
    const world = z.world!;
    const hungry = creature.hunger >= HUNGRY_AT;
    const traces = z.traces.get(creature.roomId);
    const corpseHere = !!traces && traces.some((tr) => CORPSE_TRACES.has(tr.kind));
    const floor = z.ground.get(creature.roomId);
    const baitHere = !!floor && floor.some((id) => world.itemTemplates.get(id)?.lure);
    if (!hungry && !corpseHere && !baitHere) return false;
    if (!chance(PREDATION_ODDS)) return false;
    // A target in the room; prefer one not already busy with a player (the easy meal).
    let victim: Creature | null = null;
    for (const c of z.creatures.values()) {
      if (c.id === creature.id || c.roomId !== creature.roomId || !prey.has(c.templateId)) continue;
      victim = c;
      if (!c.target) break;
    }
    if (!victim) return false;
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    const vt = world.mobTemplates.get(victim.templateId)!;
    victim.asleep = false; // teeth wake anything
    victim.sleepUntil = undefined;
    victim.hp -= randInt(tmpl.dmg_min, tmpl.dmg_max);
    if (victim.hp <= 0) {
      preyFalls(z, victim, vt);
      creature.hunger = 0;
      creature.hp = Math.min(tmpl.max_hp, creature.hp + Math.max(2, Math.round(vt.max_hp / 6)));
      if (SCAVENGERS.has(creature.templateId)) creature.fed = (creature.fed ?? 0) + 1;
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} runs down ${vt.name} and tears into it.`, undefined, false);
      z.roomSound(creature.roomId, "A short, wet scuffle ends somewhere {dir}.");
      z.refreshRoomCtx(creature.roomId);
    } else {
      // It lived — it bolts. A scrap, not a slaughter.
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} lunges at ${vt.name}, which breaks and runs.`, undefined, false);
      await creatureMoves(z, victim, now, "flee", false);
    }
    return true;
  }

  // A creature killed by another creature, not a player: no kill credit, no
  // corpse-key, no revenant rise — just a body. Its spoils drop where it fell
  // (emergent loot to recover), a corpse trace feeds the scavengers, and
  // migration refills it like any other death.
function preyFalls(z: ZoneDO, victim: Creature, vt: MobTemplate): void {
    for (const s of z.sessions.values()) {
      if (s.target === victim.id) s.target = null;
      if (s.seizedBy === victim.id) s.seizedBy = undefined;
    }
    const spoils = [...(victim.carries ?? [])];
    if (victim.stole) spoils.push(victim.stole);
    if (spoils.length) {
      z.ground.set(victim.roomId, [...(z.ground.get(victim.roomId) ?? []), ...spoils]);
      for (const id of spoils) z.stampFresh(victim.roomId, id); // a fresh kill site stays hot a while
    }
    z.addTrace(victim.roomId, { kind: HOLLOW.has(victim.templateId) ? "remains" : "blood", at: Date.now(), label: vt.name });
    z.creatures.delete(victim.id);
    scheduleArrivals(z, Date.now());
  }

  // A scavenger that has eaten enough of the dead loses its nerve: it stops
  // fleeing and swings harder. The dungeon's own corpses arm it. And rain is
  // hunting weather: under a downpour every outdoor scavenger turns bold —
  // the hyenas love the storm (rome's living-world layer, 067).
export function scavengerBold(z: ZoneDO, creature: Creature): boolean {
    if (!SCAVENGERS.has(creature.templateId)) return false;
    if ((creature.fed ?? 0) >= SCAVENGER_BOLD_AT) return true;
    // Hunting weather, both kinds: the rain's noise and the fog's blindness.
    return events.raining(z, creature.roomId) || events.foggy(z, creature.roomId);
  }

export function playerPresent(z: ZoneDO, roomId: string): boolean {
    for (const s of z.sessions.values()) if (s.roomId === roomId && !z.outOfWorld(s)) return true;
    return false;
  }

  // Does this wanderer bear an open flame in hand? The single wire-up point for
  // FEARS_FIRE, now LIVE (057): a lit torch is fire while it burns (litUntil), so
  // a fire-fearing creature bolts from anyone carrying one. A hooded LANTERN is
  // light but not fire — the shutter and the horn pane tame it (065), so the
  // fear sleeps through it: that's the torch's edge over the longer burn.
  // FIRE_ITEMS is the separate hook for a hypothetical ever-burning brand.
export function carriesFire(session: Session): boolean {
    if (session.litUntil && Date.now() < session.litUntil && session.litSource !== "lantern") return true;
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

  // A brood-mother births a scabby rat on a slow clock, up to a cap on her
  // LIVING BROOD — a living spawn source. She only breeds while unbothered (no
  // target), so engaging her IS the way to stem the tide; leave her and the
  // nest grows. The cap counts her whole brood by nest (pups are stamped
  // home = her room), NOT just who's standing in the room — otherwise pups
  // wandering out (they're not nest-bound; only the mother is) frees the counter
  // and she breeds without limit, quietly infesting her whole territory.
export function broodBirths(z: ZoneDO, mother: Creature, now: number): void {
    if (!mother.nextBirthAt) { mother.nextBirthAt = now + BROOD_INTERVAL_MS; return; }
    if (now < mother.nextBirthAt) return;
    mother.nextBirthAt = now + BROOD_INTERVAL_MS;
    const ratTmpl = z.world!.mobTemplates.get("rat");
    if (!ratTmpl) return;
    let count = 0;
    for (const c of z.creatures.values()) {
      if (c.templateId === "rat" && c.home === mother.roomId) count++;
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
    z.roomFeed(mother.roomId, `${cap(mtmpl.name)} shudders, and a fresh pup squirms free.`, undefined, false);
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
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    // The grave-hyena will not eat its own kind — it keens over them instead
    // (see mourns). It will still strip any other corpse to the bone.
    const spareKin = creature.templateId === "grave-hyena";
    const idx = list.findIndex((tr) => CORPSE_TRACES.has(tr.kind) && !(spareKin && tr.label === tmpl.name));
    if (idx === -1) return;
    const eaten = list[idx];
    list.splice(idx, 1);
    if (list.length === 0) z.traces.delete(creature.roomId);
    creature.hunger = 0;
    creature.hp = Math.min(tmpl.max_hp, creature.hp + SCAVENGER_HEAL);
    const before = creature.fed ?? 0;
    creature.fed = before + 1;
    if (!silent) {
      // The dire-hyena feeding on a fallen hyena — its own included — is a colder
      // thing than gnawing a rat. Name it when it happens.
      const hyenaKin = new Set([...SCAVENGERS].map((id) => z.world!.mobTemplates.get(id)?.name));
      const ownDead = creature.templateId === "dire-hyena" && !!eaten.label && hyenaKin.has(eaten.label);
      z.roomFeed(creature.roomId, ownDead
        ? pick([
            `${cap(tmpl.name)} drags the fallen ${eaten.label!.replace(/^(a|an|the)\s+/i, "")} close and feeds. The pack is nothing to it.`,
            `${cap(tmpl.name)} sets to its own dead without a pause — it does not care what it was.`,
          ])
        : `${cap(tmpl.name)} tears into the dead, feeding.`, undefined, false);
      z.roomSound(creature.roomId, "Wet, cracking sounds drift {dir}.");
      if (before < SCAVENGER_BOLD_AT && creature.fed >= SCAVENGER_BOLD_AT) {
        z.roomFeed(creature.roomId, `${cap(tmpl.name)} lifts its head, gorged and unafraid.`, undefined, false);
      }
      const now = Date.now();
      // The dinner-bell: a feeding grave-hyena sometimes laughs ONE adjacent
      // packmate in. The dire is a loner and calls no one; a hyena that was
      // itself called here never re-calls (a call must not trigger a call).
      // You hear it through the wall — a warning, and a bait you can set.
      if (creature.templateId === "grave-hyena" && creature.calledTo !== creature.roomId && chance(DINNER_LAUGH_ODDS)) {
        const packmate = [...z.creatures.values()].find(
          (c) => c.id !== creature.id && c.templateId === "grave-hyena"
            && !c.target && !c.asleep && !c.calledTo
            && (z.world!.exits.get(c.roomId) ?? []).some((e) => !e.key_item && e.to_room === creature.roomId),
        );
        if (packmate) {
          z.roomFeed(creature.roomId, `${cap(tmpl.name)} throws back its head over the meal and laughs — short, carrying, summoning.`, undefined, false);
          z.roomSound(creature.roomId, "A hyena's laugh rolls {dir} — short, and answered by footfalls.");
          packmate.calledTo = creature.roomId;
          packmate.curious = creature.roomId;
          packmate.nextWanderAt = Math.min(packmate.nextWanderAt, now + randInt(3000, 8000));
        }
      }
      // A full belly pulls it down onto the bones — but never with a stranger
      // standing over it. You only ever FIND a hyena sleeping on its kill.
      if (!playerPresent(z, creature.roomId) && chance(GORGE_NAP_ODDS)) fallAsleep(z, creature, now);
      z.refreshRoomCtx(creature.roomId);
    }
  }

  // The grave-hyena's grief: it finds one of its own kind dead, throws its head
  // back, and LAUGHS — a high, broken keening with no mirth in it — and holds
  // over the body a while before it drifts off. It never eats its own (that skip
  // lives in scavengerFeeds); the dire-hyena, which does, gets no such moment.
  // Pure flavor — no grudge, no mechanic — just the sound of a thing that mourns
  // like it's mocking. Each body is keened once.
export function mourns(z: ZoneDO, creature: Creature, now: number): void {
    if (creature.templateId !== "grave-hyena" || creature.target) return;
    const list = z.traces.get(creature.roomId);
    if (!list) return;
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    const kin = list.find(
      (tr) => CORPSE_TRACES.has(tr.kind) && tr.label === tmpl.name && now - tr.at < MOURN_FRESH_MS,
    );
    if (!kin || creature.mournedAt === kin.at) return;
    creature.mournedAt = kin.at;
    creature.nextWanderAt = Math.max(creature.nextWanderAt, now + MOURN_VIGIL_MS); // holds its vigil
    const dead = tmpl.name.replace(/^(a|an|the)\s+/i, "");
    z.roomFeed(creature.roomId, pick([
      `${cap(tmpl.name)} noses at the dead ${dead}, throws its head back, and laughs — a high, broken sound with no mirth anywhere in it.`,
      `${cap(tmpl.name)} circles the fallen ${dead} and keens, that awful laugh climbing and cracking apart.`,
      `${cap(tmpl.name)} stands over its own dead and laughs, low and wet, like something coming loose.`,
    ]), undefined, false);
    z.roomSound(creature.roomId, "A high, broken laughing carries {dir}, and stops all at once.");
    z.refreshRoomCtx(creature.roomId);
  }

  // The dead remember their own. A hollow thing, idle in a room where a wanderer
  // truly fell, works its jaw and breathes the name off the bloodstain. A player
  // death stamps a blood trace labelled with the fallen's name (zone's death
  // handler); a creature death labels with its TEMPLATE name — so a blood label
  // that matches no creature is a person who died here. If nobody has, the dead
  // reach for a name of their own, too worn to catch. And on the rare, terrible
  // occasion the name it breathes is the listener's OWN — you died in this room
  // once — it says it to your face. Pure flavor: no grudge, no mechanic. It only
  // speaks when something living is there to hear, and only in the quiet (no
  // target) — a wight mid-lunge does not reminisce. One name, then a long hush.
export function deadRemembers(z: ZoneDO, creature: Creature, now: number): void {
    if (!HOLLOW.has(creature.templateId) || creature.target) return;
    if (creature.murmuredAt && now - creature.murmuredAt < MURMUR_COOLDOWN_MS) return;
    const ears = [...z.sessions.values()].filter(
      (s) => s.roomId === creature.roomId && !z.outOfWorld(s) && s.hp > 0,
    );
    if (ears.length === 0 || !chance(MURMUR_ODDS)) return;
    const world = z.world!;
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    const beast = tmpl.name.replace(/^(a|an|the)\s+/i, "");
    // A blood trace whose label names no creature is a fallen wanderer.
    const creatureNames = new Set([...world.mobTemplates.values()].map((t) => t.name));
    const fallen = (z.traces.get(creature.roomId) ?? []).filter(
      (tr) => tr.kind === "blood" && !!tr.label && !creatureNames.has(tr.label),
    );
    creature.murmuredAt = now;
    if (fallen.length > 0) {
      const name = pick(fallen).label!;
      const you = ears.find((s) => s.name === name);
      if (you) {
        // The gut-punch: it breathes the name of your own last death, to your face.
        z.send(you, pick([
          `${cap(tmpl.name)} turns its blind skull toward you, works its jaw, and breathes a name into the dark — YOUR name. Something died in this room once, wearing it.`,
          `The ${beast} shapes a word, dry and soft, the way the dead name the dead — and the name it says is yours. You died here once.`,
        ]), "seize");
        for (const s of ears) if (s !== you) z.send(s, `${cap(tmpl.name)} breathes a name into the dark — ${name} — and ${you.name} goes very still.`);
      } else {
        z.roomFeed(creature.roomId, pick([
          `${cap(tmpl.name)} works its jaw and breathes a name into the dark — ${name} — soft, the way you'd call for someone who isn't coming.`,
          `The ${beast} shapes a word, dry as old paper: ${name}. Someone fell in this room wearing it.`,
        ]), undefined, false);
      }
    } else {
      // No one has died here of late — it reaches for a name of its own.
      z.roomFeed(creature.roomId, pick([
        `${cap(tmpl.name)} works its jaw around a name too worn to catch — its own, once, perhaps.`,
        `The ${beast} breathes a name into the dark. No one by it is here to answer, and it does not seem to expect one.`,
      ]), undefined, false);
    }
    z.roomSound(creature.roomId, "A dry voice shapes a word {dir}, and lets it go.");
  }

  // ---- the small lives (rome, 2026-07-13): sleep, thirst, and fear ----

  // Warm blood dozes. Rats curl up anywhere quiet; the cutpurse catnaps only
  // in his own crack; hyenas drop off on a full belly (scavengerFeeds rolls
  // that one). Nothing falls asleep with a stranger standing over it — you
  // only ever WALK IN on a sleeper. Waking is wakeListeners' law; a blow
  // wakes instantly (the striker's hit rides the existing unaware/ambush
  // multiplier — one heavy blow, never a coup de grace). The dead never
  // sleep: watch what still moves in the quiet hours and you know what it is.
export function naps(z: ZoneDO, creature: Creature, now: number): void {
    if (!NAPPERS.has(creature.templateId) || creature.asleep || creature.target || creature.cuddling) return;
    if (creature.templateId === "cutpurse" && creature.roomId !== creature.home) return;
    if (playerPresent(z, creature.roomId)) return;
    if (!chance(NAP_ODDS)) return;
    fallAsleep(z, creature, now);
  }

export function fallAsleep(z: ZoneDO, creature: Creature, now: number): void {
    creature.asleep = true;
    creature.sleepUntil = now + randInt(NAP_MIN_MS, NAP_MAX_MS);
    creature.nextWanderAt = Math.max(creature.nextWanderAt, creature.sleepUntil);
  }

  // Only the hyenas drink — a destination habit, never a meter. On its clock
  // a hyena pads to the nearest water INSIDE its tether (a den with no water
  // in reach simply doesn't have the habit — the territory-leak law), drinks,
  // and heads home. One drinker at a hole at a time, and rain IS water.
  // Players who learn the rhythm own the ambush; so do the hyenas.
export function waters(z: ZoneDO, creature: Creature, now: number): void {
    if (!SCAVENGERS.has(creature.templateId) || creature.target || creature.asleep) return;
    if (creature.wateringTo) {
      if (creature.roomId === creature.wateringTo) {
        const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
        creature.wateringTo = undefined;
        creature.thirstAt = now + randInt(THIRST_MIN_MS, THIRST_MAX_MS);
        z.roomFeed(creature.roomId, `${cap(tmpl.name)} lowers its muzzle to the water and drinks, long and unhurried.`, undefined, false);
      }
      return;
    }
    if (creature.thirstAt === undefined) {
      // First light: stagger the habit so the pack never queues at the hole.
      creature.thirstAt = now + randInt(0, THIRST_MAX_MS);
      return;
    }
    if (creature.thirstAt > now) return;
    if (events.raining(z, creature.roomId)) {
      creature.thirstAt = now + randInt(THIRST_MIN_MS, THIRST_MAX_MS);
      return;
    }
    const home = creature.home ?? creature.roomId;
    const dest = [...WATER_ROOMS].find(
      (r) => z.world!.rooms.has(r) && z.roomDist(home, r) <= TERRITORY_RADIUS,
    );
    if (!dest) {
      creature.thirstAt = now + randInt(THIRST_MIN_MS, THIRST_MAX_MS);
      return;
    }
    // One at the hole: if a packmate is drinking or already padding over, wait.
    const busy = [...z.creatures.values()].some(
      (c) => c.id !== creature.id && SCAVENGERS.has(c.templateId)
        && (c.wateringTo === dest || (c.roomId === dest && !c.target)),
    );
    if (busy) {
      creature.thirstAt = now + 15 * 60_000;
      return;
    }
    creature.wateringTo = dest;
    creature.nextWanderAt = Math.min(creature.nextWanderAt, now + randInt(3000, 10_000));
  }

  // Prey calls AWAY: a rat that breaks from a fight squeals, and rat-kind in
  // the rooms around fear-marks the place and moves off. The warren flows
  // away from a hunter like a real warren. The alarm wakes sleepers — but a
  // call never triggers another call, so the scatter is silent.
export function ratSqueal(z: ZoneDO, roomId: string, now: number, squealer: Creature): void {
    z.roomSound(roomId, "A shrill squeal cuts off {dir}, and small feet scatter.");
    for (const c of z.creatures.values()) {
      if (c.id === squealer.id || !c.templateId.includes("rat") || BROODERS.has(c.templateId) || c.target) continue;
      const near = c.roomId === roomId
        || (z.world!.exits.get(c.roomId) ?? []).some((e) => e.to_room === roomId);
      if (!near) continue;
      c.asleep = false;
      c.sleepUntil = undefined;
      c.avoids = [
        ...(c.avoids ?? []).filter((a) => a.until > now && a.roomId !== roomId),
        { roomId, until: now + RAT_AVOID_MS },
      ];
      c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 8000));
    }
  }

  // Thieves warn: a cutpurse that gets AWAY whistles, and the others shun the
  // room he fled for a while. The dead tell no one — kill him clean and the
  // network learns nothing (and your shroud-hood odds stay honest).
export function thiefWhistle(z: ZoneDO, roomId: string, now: number, runner: Creature): void {
    z.roomSound(roomId, "A sharp two-note whistle, quick and low, {dir}.");
    for (const c of z.creatures.values()) {
      if (c.id === runner.id || !THIEVES.has(c.templateId)) continue;
      c.avoids = [
        ...(c.avoids ?? []).filter((a) => a.until > now && a.roomId !== roomId),
        { roomId, until: now + WHISTLE_AVOID_MS },
      ];
    }
  }

  // The lurkers read the traffic: every few hours an UNSEEN one shifts its
  // ambush to the born-dark room in its territory with the freshest
  // footprints. Your habitual corridor stops being safe because you use it —
  // vary the route. It never moves under an eye (either end), it stays
  // hidden, and torchlight still reveals it the same as ever.
export function lurkerDrifts(z: ZoneDO, creature: Creature, now: number): void {
    if (!LURKERS.has(creature.templateId) || creature.target || !creature.hidden) return;
    if (creature.repositionAt === undefined) {
      creature.repositionAt = now + randInt(Math.round(LURKER_DRIFT_MS / 2), LURKER_DRIFT_MS);
      return;
    }
    if (creature.repositionAt > now) return;
    creature.repositionAt = now + randInt(LURKER_DRIFT_MS, LURKER_DRIFT_MS * 2);
    const home = creature.home ?? creature.roomId;
    let best: string | null = null;
    let bestAt = 0;
    for (const [roomId, list] of z.traces) {
      if (roomId === creature.roomId || !DARK_ROOMS.has(roomId)) continue;
      if (z.roomDist(home, roomId) > TERRITORY_RADIUS) continue;
      for (const tr of list) {
        if (tr.kind === "passage" && tr.at > bestAt) { bestAt = tr.at; best = roomId; }
      }
    }
    if (!best) return;
    if (playerPresent(z, creature.roomId) || playerPresent(z, best)) return;
    creature.roomId = best; // silent — it IS the dark, moving
  }

  // The soft beat: a rat that finds you resting may decide you are furniture —
  // warm furniture — and curl up against you. It stays as long as you stay
  // down (its wander clock held), and springs off affronted the moment you
  // rise. A rat with a grudge never cuddles; grudges attack on arrival like
  // always, and this only reaches idle, targetless rats. In a cold snap the
  // odds triple — everything warm looks like a bed — and the warm weight
  // against your ribs waives the cold's rest penalty (zone's heal tick).
export function ratCuddles(z: ZoneDO, creature: Creature, now: number): void {
    if (!creature.templateId.includes("rat") || BROODERS.has(creature.templateId)) return;
    // Already settled: hold on as long as the bed holds still.
    if (creature.cuddling) {
      const bed = [...z.sessions.values()].find((s) => s.pubkey === creature.cuddling);
      if (bed && bed.resting && bed.roomId === creature.roomId && !creature.target) {
        creature.nextWanderAt = Math.max(creature.nextWanderAt, now + 30_000); // asleep; going nowhere
        return;
      }
      creature.cuddling = undefined;
      if (bed && bed.roomId === creature.roomId) {
        const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
        z.send(bed, pick([
          `${cap(tmpl.name)} startles awake, gives you a look of profound betrayal, and flows off into the dark.`,
          `${cap(tmpl.name)} springs off you and retreats to a corner, affronted.`,
          `${cap(tmpl.name)} tumbles from your lap, shakes itself, and pretends this never happened.`,
        ]));
        creature.nextWanderAt = now + randInt(4000, 12_000);
        z.refreshRoomCtx(creature.roomId);
      }
      return;
    }
    if (creature.target) return;
    const rester = [...z.sessions.values()].find(
      (s) => s.roomId === creature.roomId && s.resting && !z.outOfWorld(s) && s.hp > 0,
    );
    if (!rester) return;
    if (remembers(z, creature, rester.pubkey, now)) return; // a grudge is not a bed
    const odds = CUDDLE_ODDS * (events.coldBites(z, creature.roomId) ? CUDDLE_COLD_MULT : 1);
    if (!chance(odds)) return;
    creature.cuddling = rester.pubkey;
    creature.nextWanderAt = now + 60_000;
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    z.send(rester, pick([
      `${cap(tmpl.name)} noses at your boot, thinks it over, and curls up against your side — a small, warm weight.`,
      `${cap(tmpl.name)} circles twice, tucks its tail over its nose, and settles into the crook of your arm as if it has always slept there.`,
      `Small claws on stone, closer — then ${tmpl.name} presses itself against your ribs and goes still, warm as a coal.`,
    ]));
    z.roomFeed(creature.roomId, `${cap(tmpl.name)} lies curled against ${rester.name}, fast asleep.`, rester.pubkey, false);
    z.refreshRoomCtx(creature.roomId);
  }

  // A scavenger alone in a room drags off gear left on the floor (a body's
  // spoils) and carries it — recover it by running the thing down and killing
  // it. It won't snatch loot from a player's feet: only an empty room is fair
  // game, so your own fresh kill is safe while you're standing over it.
  // And the theft is paced (rome, 2026-07-11): fresh-fallen gear stays safe
  // for the grace — the kill site is hot, someone's likely coming back — and
  // even then the thief noses at its prize a beat before the snatch, with the
  // snuffling leaking through the walls. Step back in and it abandons the try.
export function scavengerScoops(z: ZoneDO, creature: Creature): void {
    if (!SCAVENGERS.has(creature.templateId)) return;
    if ((creature.carries?.length ?? 0) >= SCAVENGER_CARRY_CAP) return;
    if (playerPresent(z, creature.roomId)) {
      creature.eyeing = undefined; // caught in the act: it slinks back and waits
      creature.eyeingAt = undefined;
      return;
    }
    const floor = z.ground.get(creature.roomId);
    if (!floor?.length) return;
    const now = Date.now();
    // Real gear only — it has no use for food (it eats that) or the free rock.
    // Fresh-fallen pieces don't tempt it yet; the stale ones are fair game.
    const idx = floor.findIndex((id) => {
      const t = z.world!.itemTemplates.get(id);
      if (!t || t.slot === "" || t.id === "loose-rock") return false;
      const fell = z.groundFreshAt.get(`${id}@${creature.roomId}`);
      if (fell !== undefined) {
        if (now - fell < SCOOP_GRACE_MS) return false;
        z.groundFreshAt.delete(`${id}@${creature.roomId}`); // grace spent; forget the stamp
      }
      return true;
    });
    if (idx === -1) {
      creature.eyeing = undefined;
      creature.eyeingAt = undefined;
      return;
    }
    const targetId = floor[idx];
    // The nose-first beat: it declares intent, and the sound carries — a
    // chaser one room over has this long to come back and interrupt.
    if (creature.eyeing !== targetId || creature.eyeingAt === undefined) {
      creature.eyeing = targetId;
      creature.eyeingAt = now + SCOOP_NOSE_MS;
      z.roomSound(creature.roomId, "Something snuffles over dropped metal {dir}, unhurried.");
      return;
    }
    if (now < creature.eyeingAt) return;
    creature.eyeing = undefined;
    creature.eyeingAt = undefined;
    floor.splice(idx, 1);
    z.ground.set(creature.roomId, floor);
    // The beast doesn't read: a dragged-off engraving is LOST (its ledger ends
    // in a hyena's jaws — a fate the steel records by simply going silent).
    // The key must go with it, or a later plain drop would wear a dead man's mark.
    z.groundLore.delete(`${targetId}@${creature.roomId}`);
    (creature.carries ??= []).push(targetId);
    const g = z.world!.itemTemplates.get(targetId);
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    if (g) z.roomFeed(creature.roomId, `${cap(tmpl.name)} snatches up ${g.name} and drags it off into the dark.`, undefined, false);
    z.roomSound(creature.roomId, "Metal scrapes over stone {dir}, dragged away.");
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
      // A variant with its own den rows (the seeded brood-mother, the grounds'
      // fleet-rats) counts against ITS cap; only rolled promotions fold into
      // the base line. Folding everything made the designed mother invisible
      // to her own cap — the warren minted mothers forever.
      const line = caps.has(c.templateId) ? c.templateId : (z.variantBase.get(c.templateId) ?? c.templateId);
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
      // Migrants respect the threshold too: nothing ordinary arrives AT a
      // gate (same rule as wandering), or a rat could materialize on top
      // of a respawn. Boss homes are wherever they are.
      let homes = world.mobSpawns.filter((s) => s.template_id === templateId).map((s) => s.room_id);
      if (!baseTmpl.is_boss) {
        const inner = homes.filter((r) => !world.entryRooms.has(r));
        if (inner.length) homes = inner;
      }
      // One mother to a room: a nest with two fountains is a meat grinder. Steer
      // a respawning designed mother to a nest that hasn't already got one (fall
      // back to her homes if every nest is taken).
      if (BROODERS.has(baseTmpl.id)) {
        const taken = new Set<string>();
        for (const c of z.creatures.values()) {
          if (c.templateId === baseTmpl.id) taken.add(c.roomId);
        }
        const open = homes.filter((r) => !taken.has(r));
        if (open.length) homes = open;
      }
      const home = homes[randInt(0, Math.max(0, homes.length - 1))] ?? world.entryRoom;
      // Rare blood, rolled with the den known: what refills the ground is
      // usually the ordinary version, once in a while the mean cousin — and a
      // brood promotion only lands on a vacant nest of her line.
      const tmpl = rollBloodline(z, baseTmpl, home);
      // Migration is a walk, not a materialization: a walker surfaces at the
      // dark mouth nearest its den and makes its way in (territory homing does
      // the walking). The sessile — mothers, the drowned — and the boss simply
      // are where they live. A DEEP den only ever refills through a DEEP mouth:
      // roomDist ignores the sealed descent, so a surface mouth could read
      // "nearest" to a deep home — and the migrant would strand above the
      // locked door forever, milling around the hall wing (rome's wight flood,
      // 2026-07-10). The deep is below the mouths; its things crawl up from
      // further down, never in through the front door.
      let roomId = home;
      if (!tmpl.is_boss && !BROODERS.has(tmpl.id) && !DROWNERS.has(tmpl.id) && !SENTINELS.has(tmpl.id)) {
        const deepHome = DEEP_ROOMS.has(home);
        let bestD = Number.POSITIVE_INFINITY;
        for (const m of MOUTHS) {
          if (!world.rooms.has(m) || DEEP_ROOMS.has(m) !== deepHome) continue;
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
        z.roomFeed(roomId, `${cap(tmpl.name)} creeps out of the dark.`, undefined, false);
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
    // One horror up at a time — but an unkilled one can't hold the door forever.
    // It can't walk home (the descent is sealed against it too), so a surfaced
    // dweller nobody harvests slinks back down the way it came after a while,
    // heart and all, freeing the next surfacing. No more soft-locked key, no
    // more deep-kin squatting the shallows.
    for (const c of z.creatures.values()) {
      if (!c.surfaced) continue;
      if (now - (c.surfacedAt ?? now) < SURFACED_STALE_MS) return false;
      const t = world.mobTemplates.get(c.templateId)!;
      z.roomFeed(c.roomId, `${cap(t.name)} finds its crack in the floor and drags itself back down into the dark, taking its cold heart with it.`, undefined, false);
      c.roomId = c.home && world.rooms.has(c.home) ? c.home : c.roomId;
      c.surfaced = false;
      c.surfacedAt = undefined;
      c.target = null;
      return false; // the deep takes a beat before it coughs up the next
    }
    const candidates = [...z.creatures.values()].filter((c) => SURFACERS.has(c.templateId) && !c.surfaced);
    if (candidates.length === 0) return false;
    const rooms = SURFACE_ROOMS.filter((r) => world.rooms.has(r));
    if (rooms.length === 0) return false;
    const c = candidates[randInt(0, candidates.length - 1)];
    const dest = rooms[randInt(0, rooms.length - 1)];
    const tmpl = world.mobTemplates.get(c.templateId)!;
    c.roomId = dest;
    c.surfaced = true;
    c.surfacedAt = now;
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
