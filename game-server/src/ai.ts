// Creature AI: how the dungeon's animals think between alarms — grudges and
// memory, waking to noise, hunting and wandering, scavenging and breeding, the
// boss's rage, and the migration that refills the world. Free functions over a
// ZoneDO (its tick and combat live in zone.ts and call in here).
import type { ZoneDO } from "./zone";
import { shelteredInDen } from "./den";
import type { Creature, Session } from "./zone-types";
import type { MobTemplate, World } from "./world";
import { hasTrait } from "./world";
import { randInt, chance, uuid, pick } from "./rng";
import { cap, isNight, isFullMoon } from "./zone-util";
import * as events from "./events";
import { underCover, MAP_QUARTERS } from "./detail";
import {
  FORGET_MS, FORGET_DEFAULT, GRUDGE_MAX, SCAVENGERS, DRINKERS, AGGRO_SCAVENGERS, SCAVENGER_BOLD_AT, SCAVENGER_CARRY_CAP, SCOOP_GRACE_MS, SCOOP_NOSE_MS, SCENT_FRESH_MS, SCENT_HEED_ODDS,
  HOARDERS, HOARD_CARRY_CAP, HOARD_KEEP, HOARD_DEN_MS, HOARD_TRAIL_MS, HOARD_SPOOK_MS,
  CUDDLE_ODDS, CUDDLE_COLD_MULT, MOURN_FRESH_MS, MOURN_VIGIL_MS, MURMUR_ODDS, MURMUR_COOLDOWN_MS,
  HOARD_COVET_RARITY, HOARD_COVET_ODDS, HOARD_COVET_MS, HOARD_COVET_LINES, RARITY_RANK,
  PACK_HOLDERS, PREY_BREAK_ODDS, PREY_WORRY_MULT, HOLD_LINES, BREAK_LINES,
  CANTOR_SING_ODDS, CANTOR_SONG_MS, CANTOR_SONG_LINES, CANTOR_HELD_LINES, CANTOR_END_LINES,
  DRILL_ODDS, DRILL_RANK, DRILL_SOLDIERS, DRILL_LINES, DRILL_RANK_LINES,
  ALARM_CALLERS, ALARM_HEEDS, ALARM_AVOID_MS, ALARM_DRAW_ODDS, PACK_CALLERS, PACK_CALL_ODDS,
  NAPPERS, NOCTURNAL, REST_LINES, FLEE_WIND_MIN, FLEE_WIND_MAX, FLEE_WIND_MS, NAP_ODDS, NAP_MIN_MS, NAP_MAX_MS, GORGE_NAP_ODDS, NAP_ODDS_DAY_OUT, NAP_ODDS_NIGHT_OUT, NAP_ODDS_MOON_OUT,
  MOON_PACK_HUNT_MULT, MOON_PACK_CALL_MULT, ALARM_MOON_ODDS,
  WATER_ROOMS, THIRST_MIN_MS, THIRST_MAX_MS,
  RAT_AVOID_MS, WHISTLE_AVOID_MS, DINNER_LAUGH_ODDS, LURKER_DRIFT_MS, LURKER_HUNT_RADIUS, LURKER_HUNT_DRIFT_MS, LURKER_CROWD, DARK_ROOMS, THIEVES,
  PREYS_ON, PACK_PREY, PREDATION_ODDS, STARVE_HUNTERS, ECO_LINES, ECO_SLOWEST, CARRION_ROOMS,
  SUMMIT_BOSS, SUMMIT_BOSSES, DRAKE_WINDUP_MS, DRAKE_BREATH_EVERY_MS, DRAKE_BREATH_MIN, DRAKE_BREATH_MAX,
  DRAKE_AIR_MS, DRAKE_AIR_EVERY_MS, DRAKE_AIR_AT, DRAKE_DIVE_MIN, DRAKE_DIVE_MAX, ARMOR_K,
  STANCE, WOUNDED_FRACTION, WOUNDED_DMG_MULT,
  SCAVENGER_HEAL, CORPSE_TRACES, DIRE_ROUSE_MS, HOLLOW, CORRODERS, LISTENERS, LURKERS, ROOTED, PROVISIONED, DROWNERS, VERMIN, FORAGE_ROOMS, FORAGE_HEAL, GRAZERS,
  RUNNERS, BROODERS, SENTINELS, AGGRESSIVE, ROAMING_DENS, SENTINEL_ROOMS, FEARS_FIRE, FIRE_ITEMS, FIRE_FLEE_CHANCE, SURFACERS, SURFACE_ROOMS, PATROLS, HUNGRY_AT, STARVING_AT, TERRITORY_RADIUS, CROWD_CAP, NOISE_HEED_ODDS,
  SHADOWS, SHADOW_PACE_ODDS, SHADOW_REACH, SHADOW_KEEP,
  RAVEN_SCOOPERS, RAVEN_NEST_ROOMS, RAVEN_NEST_CAP,
  MIGRATION_FACTOR, MIGRATION_MIN_FACTOR, BROOD_CAP, BROOD_INTERVAL_MS, HURT_STYLE, FLEE_TELL,
  QUIET_WANDER_MULT, QUIET_HEED_MULT, MIGRANTS, MIGRATE_BANDS, MIGRATE_QUARTERS, MIGRATE_ODDS, MIGRATE_KEEP, DRIFT_SETTLE_MIN, DRIFT_GIVES_UP,
  MOVE_SOUNDS, WANDER_MIN_MS, WANDER_MAX_MS, MOUTHS, QUIET_WAKE_MULT, NOISY_LOAD,
  DEEP_ROOMS, SURFACED_STALE_MS, OUTDOOR_ROOMS, WARRENS_ROOMS, ESCAPE_TMPL, FORTRESS_BANDS, SURFACE_BANDS,
  HUNT_RANGE, HUNT_RECHECK_MS,
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

  // THE DEN REMEMBERS (rome, 2026-07-17): a routed survivor carries its grudge
  // home. When a fleeing creature arrives among its own bloodline, the kin in
  // that room inherit every grudge it holds — BACKDATED to half their forget
  // window, so a told fear fades twice as fast as a felt one. No new
  // bookkeeping: the contagion rides the same {pk, at} decay that already
  // governs memory, and `remembers()` does the rest (an inheritor greets the
  // grudge-bearer on sight, exactly as if it had been hit itself). Farm one
  // den and the third rat already hates you — reputation with a bloodline,
  // emergent. An empty bolt-hole teaches no one; the fear needs kin to hear it.
export function shareGrudges(z: ZoneDO, fled: Creature, now: number): void {
    if (!fled.grudges.length) return;
    const line = z.variantBase.get(fled.templateId) ?? fled.templateId;
    let told = false;
    for (const kin of z.creatures.values()) {
      if (kin.id === fled.id || kin.roomId !== fled.roomId) continue;
      if ((z.variantBase.get(kin.templateId) ?? kin.templateId) !== line) continue;
      const kinTmpl = z.world!.mobTemplates.get(kin.templateId);
      const window = kinTmpl ? forgetMs(z, kinTmpl) : FORGET_DEFAULT;
      // (A boss's window is Infinity — it never forgets, so nothing to halve:
      // an inherited grudge lands full-fresh on it. Fitting for a king.)
      const inheritedAt = Number.isFinite(window) ? now - Math.floor(window / 2) : now;
      for (const g of fled.grudges) {
        const existing = kin.grudges.find((k) => k.pk === g.pk);
        // A memory it already holds fresher stays its own; a told one never
        // lands fresher than half-spent (and never fresher than the source).
        if (existing) { if (existing.at < Math.min(g.at, inheritedAt)) existing.at = Math.min(g.at, inheritedAt); continue; }
        kin.grudges.push({ pk: g.pk, at: Math.min(g.at, inheritedAt) });
        if (kin.grudges.length > GRUDGE_MAX) kin.grudges.shift();
        told = true;
      }
    }
    if (told) {
      const tmpl = z.world!.mobTemplates.get(fled.templateId)!;
      // Local color only — the den's whisper is not the relay's business.
      z.roomFeed(fled.roomId, `${cap(tmpl.name)} arrives at a panic, and the others take it in. Something passes between them.`, undefined, false);
    }
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
      if (DROWNERS.has(tmpl.id) || SENTINELS.has(tmpl.id) || ROOTED.has(tmpl.id)) continue; // holds its water / its post / its ground
      // Carrion-followers track the dead, not the din — UNLESS they hunt in a
      // pack. This line read a bare `SCAVENGERS.has` and it was written when
      // that set was hyenas; the wolves were added to it later for their
      // feeding, and silently inherited a hyena's indifference to a brawl
      // (rome, 2026-08-09: "when theres 2 wolves in a room and i start fighting
      // one, that second wolf doesnt join in the fight, they only join when
      // their one room away"). Exactly inverted: the noise-draw next door has
      // no such exemption, so the far wolf came and the one standing at your
      // elbow watched. PACK_CALLERS ∩ SCAVENGERS is precisely the two wolves —
      // the dogs aren't carrion, the hyenas don't call — so the hyena keeps its
      // rule and the wolf gets a wolf's.
      if (SCAVENGERS.has(tmpl.id) && !PACK_CALLERS.has(tmpl.id)) continue;
      // ...and nothing walks away from a kill it already has in its teeth. A
      // wolf with a deer down keeps the deer; the fight in the room is not its
      // business (creature-on-creature holds don't set `target`, so the guard
      // above never saw them).
      if (creature.holding) continue;
      if (BROODERS.has(tmpl.id)) continue;                          // the brood-mother spawns; her young do the fighting
      if (LISTENERS.has(tmpl.id)) continue;                         // the bone-sleeper stays dormant till you move
      // Nothing that bolts for a living joins a scrum. This was `tmpl.id ===
      // "fleet-rat"` (rome's standing rule: the scary rat watches, never
      // scrums) — RUNNERS is that same rule stated as a family, and it now also
      // covers the wood's roe deer, which were "throwing themselves into the
      // fight" and then immediately fleeing it (2026-08-02).
      if (bolts(z, tmpl.id, creature.roomId)) continue;
      // ...and in the QUIET a great deal more of them do: there is nothing else
      // to hear. The silence is not safety, it is a better microphone.
      if (!chance(NOISE_HEED_ODDS * (events.quieted(z, creature.roomId) ? QUIET_HEED_MULT : 1))) continue;
      for (const s of z.sessions.values()) {
        if (s.roomId === roomId && z.inCombat(s) && z.reachable(s)) {
          creature.target = s.pubkey;
          addGrudge(z, creature, s.pubkey);
          z.send(s, `${cap(tmpl.name)} throws itself into the fight!`);
          z.roomFeed(roomId, `${cap(tmpl.name)} joins the fight!`, s.pubkey, false); // local: mob reaction in a fight the player already broadcasts
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
    if (creature.heldBy) return "down and thrashing, with something's teeth in it";
    if (creature.holding) {
      const v = z.creatures.get(creature.holding);
      const vt = v && z.world!.mobTemplates.get(v.templateId);
      return vt ? `stood over ${vt.name}, killing it` : "killing something on the ground";
    }
    if (creature.asleep) {
      // THE HEAP. Things that den together sleep together — walk into the Wolf
      // Earth and it is not three wolves, it is one animal with several heads.
      // Read from the room rather than the template, so it is true wherever it
      // happens and nowhere it doesn't: two of a kind, asleep, same floor.
      const line = z.variantBase.get(creature.templateId) ?? creature.templateId;
      let alsoDown = 0;
      for (const c of z.creatures.values()) {
        if (c.id === creature.id || c.roomId !== creature.roomId || !c.asleep) continue;
        if ((z.variantBase.get(c.templateId) ?? c.templateId) === line) alsoDown++;
      }
      if (alsoDown > 0) {
        return alsoDown > 1
          ? "asleep in the heap, so tangled together you cannot tell where one stops"
          : "asleep back-to-back with the other, breathing in the same slow time";
      }
      // Its own way of lying up, where the animal has one — a crab does not
      // curl nose-to-tail and a bittern does not lie down at all.
      const own = REST_LINES[creature.templateId];
      if (own && !SCAVENGERS.has(creature.templateId)) return own;
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
    if (winded(creature, Date.now())) return "blown, sides going like a bellows, out of running";
    if (creature.stunned) return "reeling and dazed";
    if (creature.bleedTicks && creature.bleedTicks > 0) return "bleeding freely, dark spatter on the stone";
    if (creature.rouseAt && Date.now() < creature.rouseAt) return "winding up to spring, hackles high";
    if (creature.target === viewer) return "fixed on you";
    if (creature.target) {
      const mark = [...z.sessions.values()].find((s) => s.pubkey === creature.target && !z.outOfWorld(s));
      return mark ? `fixed on ${mark.name}` : "on the hunt";
    }
    // Nothing has it fixed on a fight — so read what it's actually DOING. The
    // legibility law covers peace too: a scavenger tearing a body, a hyena
    // making for water, a nose down after a scent it caught all read in the look
    // instead of the beast standing there like it's waiting for you.
    if (SCAVENGERS.has(creature.templateId)) {
      const list = z.traces.get(creature.roomId) ?? [];
      const spareKin = creature.templateId === "grave-hyena"; // won't eat its own dead — it keens
      const edible = list.filter((tr) => CORPSE_TRACES.has(tr.kind) && !(spareKin && tr.label === tmpl.name));
      if (edible.some((tr) => tr.kind === "remains")) return "hunched low over a corpse, tearing into it";
      if (edible.length) return "lapping the bloodied stone clean";
    }
    if (creature.wateringTo) return "padding toward water, tongue lolling";
    if (creature.curious && creature.curious !== creature.roomId) {
      return SCAVENGERS.has(creature.templateId)
        ? "casting after a scent, nose to the ground"
        : "moving toward something only it has heard";
    }
    // The food web made visible: a hungry predator eyes a weaker thing sharing
    // its room — the tell that lets a player USE predation (bait a scrap, slip past).
    if (creature.hunger >= HUNGRY_AT && !HOLLOW.has(tmpl.id)) {
      const preySet = preyHere(z, creature);
      if (preySet) {
        const prey = [...z.creatures.values()].find(
          (c) => c.id !== creature.id && c.roomId === creature.roomId && preySet.has(c.templateId),
        );
        if (prey) {
          const pt = z.world!.mobTemplates.get(prey.templateId)!;
          return `eyeing the ${pt.name.replace(/^(a|an|the) /i, "")} across the room`;
        }
      }
      // Nothing weaker in the room. Past STARVING_AT that hunger has nowhere to
      // go but you — the louder tell, the warning before it might spring (see
      // starvingHunts + the wind-up in the tick loop).
      if (creature.hunger >= STARVING_AT && starvingHunts(z, creature)) return "gaunt and ravenous, its eyes fixed on you";
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
    if (z.wearsTrait(session, "quiet")) odds *= QUIET_WAKE_MULT;
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
        // A loud kit names itself as the culprit — the load law's noise, made
        // legible where it bites (rome, 2026-07-19). A light tread keeps the old
        // impersonal line; only NOISY_LOAD and up blames the armor.
        z.send(session, z.loadOf(session) >= NOISY_LOAD
          ? `Your armor gives you away — ${ct.name} stirs and comes awake.`
          : `${cap(ct.name)} stirs at the sound of you and comes awake.`);
      }
      z.refreshRoomCtx(roomId);
    }
    for (const c of z.creatures.values()) {
      if (c.roomId !== roomId || c.target) continue;
      const lurker = LURKERS.has(c.templateId);
      if (!LISTENERS.has(c.templateId) && !lurker) continue;
      // A torch spoils the ambush: a lurker caught in your light can't drop from
      // the dark (it shows in the room instead, revealed — see describeRoom).
      // A torch burning on the FLOOR spoils it the same way — the glow is the
      // glow, whoever's hand it left. So is a full moon: light is light, and the
      // room description has ALWAYS shown an outdoor lurker on a lit night
      // (lurkerUnseen reads litFor, which reads isDark) — this is the strike
      // side finally agreeing with it, instead of a thing you can plainly see
      // dropping on you out of a dark that isn't there. Outdoors only, so the
      // deep's crawlers and stalkers are untouched: they have never seen a sky.
      // GLINTING (2026-08-20) is the same answer by daylight's other shape:
      // polished steel gives a waiting lurker nowhere to hide, like the flame.
      if (lurker && (carriesFire(session) || z.roomLit(roomId) || moonlit(z, roomId, now) || z.wearsTrait(session, "glinting"))) continue;
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
      z.roomFeed(roomId, `${cap(tmpl.name)} ${lurker ? "uncoils from the dark" : "lurches awake"}.`, session.pubkey, false); // local: mob reaction
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
      // SENTINELS (the deep's hound) don't use the generic asleep flag at all —
      // their sleep is a separate wake-clock (wakeUntil/sentinelAwake), and the
      // room's own "sprawls across the stair, asleep" line reads THAT. Without
      // this check a grudge-holding hound could ambush you the same beat the
      // room told you it was asleep — the flag this loop actually checked never
      // applied to it, so a standing grudge went straight through.
      if (SENTINELS.has(creature.templateId) ? !z.sentinelAwake(creature) : creature.asleep) continue;
      if (heldBySong(creature, now)) continue; // standing to the note; it will not come for you until it ends
      const holdsGrudge = remembers(z, creature, session.pubkey, now);
      const guards = hyenaGuardsMeal(z, creature);
      // A hostile guardian (AGGRESSIVE) needs no grudge — it bars its post to
      // everyone. It's never a hyena-meal-guard, so it falls straight through to
      // the target-and-strike below with a guardian's line, not a hyena wind-up.
      const hostile = AGGRESSIVE.has(creature.templateId);
      if (!holdsGrudge && !guards && !hostile) continue;
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
          z.roomFeed(session.roomId, `${cap(tmpl.name)} rises from its kill, hackles up.`, session.pubkey, false); // local: mob reaction
        }
        continue;
      }
      creature.target = session.pubkey;
      if (!session.target) session.target = creature.id;
      const onSight = hostile && !holdsGrudge; // a guardian barring the door, not an old score settled
      z.send(session, onSight
        ? `${cap(tmpl.name)} fixes on you the moment you cross into its post — and moves to bar the way.`
        : `${cap(tmpl.name)} remembers you — and comes for you.`);
      z.roomFeed(session.roomId, onSight
        ? `${cap(tmpl.name)} moves to bar ${session.name}'s way.`
        : `${cap(tmpl.name)} goes for ${session.name}.`, session.pubkey, false);
      // The first one to reach you gets the jump; the rest merely engage.
      if (ambush && !struck) {
        struck = true;
        await z.creatureFirstStrike(creature, tmpl, session);
        if (session.hp <= 0) return; // felled by the ambush — already moved to a gate
      }
    }
  }

// A THRESHOLD IS CROSSED, NOT OCCUPIED (2026-08-11).
//
// A hideaway and a gate are both rooms nothing will step into: creatureMoves
// drops them from the exit list unless there is no other way to turn. That is
// right for what it was written for — nothing follows you into a bolthole, and
// nothing camps a doorway — and it had a consequence nobody measured. A room
// nothing will step into is a WALL, and a wall on a through-line cuts the
// world in half.
//
// Measured against the live map, treating safe+gate rooms as walls: the world
// is not one place but TEN islands. The largest holds the fortress, the wood,
// the west road, the dens and the open ground; a second holds the Crossing;
// a third holds the east road. Nothing could ever migrate between them.
// The single worst cut was not even a gate — the Shelter Stone, the halfway
// house on the scarp climb, severed 210 rooms on its own, because the climb is
// the only way east. The Crossing House sealed the whole far strand (17), the
// Gate Arch the Lost Holding (8).
//
// THE FIX IS NOT TO LET THINGS IN. It is to let them ACROSS. A creature walking
// home that finds its way blocked steps THROUGH the threshold room and out the
// far side in the same beat: it is never resident there, so it cannot take a
// target there, cannot camp the doorway, and cannot follow anybody into a
// bolthole. It crosses, the way a doorway is meant to be crossed, and the room
// sees it pass.
//
// Deliberately narrow. Only a creature OUTSIDE its territory and walking home
// with no ordinary way to close the distance may do it — an idle thing inside
// its own range never transits, so gates and hideaways stay as empty as they
// have always been. A sentinel's post is never crossed.
//
// AND A DRIFT IS THE OTHER DIRECTION THROUGH THE SAME DOOR (2026-08-12). A
// walkabout that could not cross a threshold could never leave the island it
// started on — and the islands ARE the hideaways, so an animal would have been
// free to "migrate" only as far as the nearest crack in the wall. The rule is
// unchanged in every way that matters (never resident, never a target there,
// never a sentinel's post); only the test the far side has to pass is inverted:
// homeward wants a room CLOSER to the den, a drift wants one FURTHER from the
// ground it left. Hence `want`, and the two callers that supply it.
function thresholdStep(
  z: ZoneDO,
  creature: Creature,
  here: string,
  mark: string,
  open: { dir: string; to_room: string; key_item?: string | null }[],
  want: "closer" | "further" = "closer",
): { dir: string; to_room: string; through: string } | null {
  const world = z.world!;
  const blocked = (r: string) => world.safeRooms.has(r) || world.entryRooms.has(r);
  const far = z.roomDist(here, mark);
  if (!isFinite(far)) return null;
  for (const leg of open) {
    const mid = leg.to_room;
    if (!blocked(mid) || SENTINEL_ROOMS.has(mid)) continue;
    for (const out of world.exits.get(mid) ?? []) {
      if (out.key_item && !z.openDoors.has(`${mid}:${out.dir}`)) continue;
      const to = out.to_room;
      if (to === here || blocked(to) || SENTINEL_ROOMS.has(to)) continue;
      const d = z.roomDist(to, mark);
      if (want === "closer" ? d < far : d > far) return { dir: leg.dir, to_room: to, through: mid };
    }
  }
  return null;
}

// ---- THE HUNGRY RANGE: a hunter with an empty larder goes looking ----------
//
// A predator's territory is TERRITORY_RADIUS rooms of ground around its den,
// and until now that was an absolute: a wolf whose range held no deer stayed in
// that range and starved in it forever. Measured across the live map, that is
// not a hypothetical — it is most of the surface's broken webs. Three otters on
// the beck with no rat inside twenty rooms. Five bitterns in a reed maze whose
// eels are all out in the channels. Three wolves and one deer sealed in a
// two-room pocket behind a hideaway. Every one of them was doing exactly what
// the territory rule said and slowly reaching the end of the hunger clock.
//
// Migration used to make this worse rather than better — it named an address in
// another band and the animal took up residence there whether or not the ground
// could feed it. That is gone (the drift, at beginDrift below, settles an animal
// only where it can eat), so this rule now catches the OTHER case: ground that
// could feed it once and cannot any more, because the prey was hunted out, or
// wandered off, or a player cleared the room.
//
// So: HUNGER MOVES THE ANCHOR, not the rules. A hunter that is genuinely hungry
// and has nothing it eats inside its own range re-aims the ordinary territory
// walk at the nearest room that does hold its prey, and walks there one room a
// beat, by the same steps, past the same walls, crossing a threshold where it
// must. Nothing teleports and nothing is exempted; it is the walk it would take
// anyway, aimed somewhere else. The moment it eats (hunger resets on any kill,
// corpse or graze) the anchor snaps back to the den, so this is what an animal
// does at the end of a lean week — not a new permanent behaviour.
//
// HUNT_RANGE is the honest limit of "an animal knows where the food is." Past
// it, it does not: a creature with nothing inside that radius keeps its ground
// and goes hungry, which is the state the ecology is supposed to be able to
// reach. The recheck cadence keeps this off the hot path — the search is one
// capped BFS, at most once a minute, only for a hungry hunter, and the answer
// is held until it goes stale.
function huntGround(z: ZoneDO, creature: Creature, now: number): string | undefined {
  const prey = PREYS_ON.get(creature.templateId);
  if (!prey?.size || (creature.hunger ?? 0) < HUNGRY_AT) {
    creature.huntFor = undefined;
    return undefined;
  }
  // The cadence caches BOTH answers — the errand and the decision to stay home.
  // Caching only the errand would leave a hungry hunter standing next to its
  // dinner running the whole search every single beat.
  if ((creature.huntAt ?? 0) > now) return creature.huntFor;
  creature.huntAt = now + HUNT_RECHECK_MS;
  // Anything it eats already standing on its own ground: stay home and hunt it.
  const range = z.nearby(creature.home ?? creature.roomId, TERRITORY_RADIUS);
  for (const c of z.creatures.values()) {
    if (prey.has(c.templateId) && range.has(c.roomId)) {
      creature.huntFor = undefined;
      return undefined;
    }
  }
  // Nothing at home. The nearest room that holds a meal, out to the limit of
  // what an animal can be said to know about.
  const out = z.nearby(creature.roomId, HUNT_RANGE);
  let best: string | undefined, bestD = Infinity;
  for (const c of z.creatures.values()) {
    if (!prey.has(c.templateId)) continue;
    const d = out.get(c.roomId);
    if (d !== undefined && d < bestD) { bestD = d; best = c.roomId; }
  }
  creature.huntFor = best;
  return best;
}

  // Move one room: wandering or fleeing. Creatures can't open locked doors,
  // but walk through any door the players have left open. Wandering picks,
  // in order: a noise worth investigating, a room that smells of food, the
  // next stop on a patrol route, or wherever.
/** Blown: it has run its legs out and will not run again until it recovers. */
export function winded(creature: Creature, now: number): boolean {
  return (creature.windedUntil ?? 0) > now;
}

export async function creatureMoves(z: ZoneDO, creature: Creature, now: number, mode: "wander" | "flee", silent: boolean): Promise<void> {
    const world = z.world!;
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    let exits = (world.exits.get(creature.roomId) ?? []).filter(
      (e) => !e.key_item || z.openDoors.has(`${creature.roomId}:${e.dir}`),
    );
    // Every unlocked way out of this room, kept before the filters narrow it —
    // the threshold step needs to see the doors the walk is not allowed to use.
    const allWays = exits;
    // Set when the homeward walk is walled in and crosses a threshold room in
    // one beat (thresholdStep): the room it passes through, for the feed.
    let through: string | null = null;
    // Hideaways — a crack in the wall — let nothing in, not even the King. A
    // fled foe who folds into one is out of reach until they step back out.
    // A DEN WITH ITS BAR UP IS A HIDEAWAY SOMEBODY MADE (mig 162). Same rule,
    // different reason: the crack in the wall is safe because the world built it
    // that way, a den is safe because a nomad carried iron out here and hung a
    // door on it. An unbarred den is an ordinary room and things walk straight
    // in, which is the whole point of the upgrade.
    // (A den no longer makes its ROOM unenterable — it is a door off a public
    // site now, mig 172 — so only the world's own safe rooms steer a wanderer.
    // What a barred door does is put the person behind it out of reach, which is
    // enforced where creatures choose a target, not where they choose a step.)
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
    // MIGRATION. Before the territory pull is applied, the rare roll that moves
    // where "home" even is — so a creature that takes it spends this very step
    // walking the new way instead of the old. It is deliberately the smallest
    // die in the game (MIGRATE_ODDS): under one an hour across the whole
    // surface, so nobody ever watches it happen, and the thing you notice is
    // that there are wolves on the road this month and there were not before.
    if (mode === "wander" && creature.home && !tmpl.is_boss && !PATROLS[tmpl.id]
        && MIGRANTS.has(tmpl.id) && creature.drift === undefined && chance(MIGRATE_ODDS)) {
      beginDrift(z, creature, tmpl.id);
    }
    // WALKABOUT. An unmoored animal has no territory to be pulled back into: it
    // walks away from where it set out and keeps walking until it finds ground
    // that can keep it (driftArrives, after the step). Two rails only — it stays
    // on the surface bands, and it prefers a step that puts distance behind it,
    // so a drift travels instead of milling about in the same four rooms. Both
    // "never strand" like every other filter here.
    if (mode === "wander" && creature.drift !== undefined) {
      const onward = exits.filter((e) => MIGRATE_BANDS.has(z.regionOf(e.to_room)) && !DEEP_ROOMS.has(e.to_room));
      if (onward.length) exits = onward;
      else { // walked itself into a corner of the map it may not settle on: turn back
        creature.home = creature.driftFrom ?? creature.home;
        creature.drift = undefined;
        creature.driftFrom = undefined;
      }
    }
    if (mode === "wander" && creature.drift !== undefined && creature.driftFrom) {
      const behind = z.roomDist(creature.roomId, creature.driftFrom);
      const away = exits.filter((e) => z.roomDist(e.to_room, creature.driftFrom!) > behind);
      if (away.length) exits = away;
      else {
        // Every ordinary way on is a way back. The country ahead is behind a
        // threshold — the Shepherd's Bothy, the Shelter Stone, a gate — and
        // this is the one crossing that opens the rest of the map to a walking
        // animal. Without it a drift can never leave the island it began on.
        const t = thresholdStep(z, creature, creature.roomId, creature.driftFrom, allWays, "further");
        if (t) { exits = [{ dir: t.dir, to_room: t.to_room } as typeof exits[number]]; through = t.through; }
      }
    }
    // Territory: idle wandering keeps to the ground around the den. Beyond the
    // edge (fled, or freshly walked in from a dark mouth), every idle step is
    // a step home instead — this is what keeps the deep in the deep, and what
    // carries a migrant from the mouth to its range. Fleeing ignores the edge
    // (survival first; the next calm step starts the walk back). Patrollers
    // are exempt — their route is their territory. Never strands.
    if (mode === "wander" && creature.home && !tmpl.is_boss && !PATROLS[tmpl.id] && creature.drift === undefined) {
      // A HUNGRY THING LEAVES. Where the territory pull is anchored: normally
      // the den, but a hunter whose own ground has nothing left to eat walks to
      // where the food is instead (huntGround). Everything below is unchanged —
      // it just closes on a different room for as long as the hunger lasts.
      const anchor = huntGround(z, creature, now) ?? creature.home;
      // ONE capped walk out from the den answers both halves — am I inside my
      // range, and which of these exits are. This is the hottest distance query
      // in the game (every wandering creature, every beat); routing it through
      // full-map distances meant a distance map per den per beat, and with
      // hundreds of dens no cache can hold them. Radius+1 so the "which exit is
      // closer" comparison can still see one step past the edge.
      const near = z.nearby(anchor, TERRITORY_RADIUS + 1);
      const d = near.get(creature.roomId);
      if (d === undefined) {
        // Genuinely off the map's edge of its range — the long walk in from a
        // dark mouth, or back from a rout. Rare enough to pay for true
        // distances, and the only case that actually needs them.
        const far = z.roomDist(creature.roomId, anchor);
        const closer = exits.filter((e) => z.roomDist(e.to_room, anchor) < far);
        if (closer.length) exits = closer;
        // Walled in: every way that closes on home goes through a hideaway or a
        // gate. Cross it in one step rather than turn round forever.
        else {
          const t = thresholdStep(z, creature, creature.roomId, anchor, allWays);
          if (t) { exits = [{ dir: t.dir, to_room: t.to_room } as typeof exits[number]]; through = t.through; }
        }
      } else if (d > TERRITORY_RADIUS) {
        const closer = exits.filter((e) => (near.get(e.to_room) ?? Infinity) < d);
        if (closer.length) exits = closer;
        else {
          const t = thresholdStep(z, creature, creature.roomId, anchor, allWays);
          if (t) { exits = [{ dir: t.dir, to_room: t.to_room } as typeof exits[number]]; through = t.through; }
        }
      } else {
        const within = exits.filter((e) => (near.get(e.to_room) ?? Infinity) <= TERRITORY_RADIUS);
        if (within.length) exits = within;
      }
    }
    // A patroller's route IS its territory. It leaves the circuit sometimes — it
    // turns to a noise, or chases a wanderer down a stair — and once off-route
    // the patrol logic below can't find its next post adjacent and falls to
    // random steps. Nothing reeled it back, so the walls' watchman walked clean
    // down into the keep (rome, 2026-07-14: the last watchman in the Vaulted
    // Hall). Off its route, every idle step now closes on the nearest post —
    // the rounds always find the wall again. Never strands.
    if (mode === "wander" && PATROLS[tmpl.id]) {
      const route = PATROLS[tmpl.id];
      if (!route.includes(creature.roomId)) {
        let best = Infinity, near = route[0];
        for (const r of route) {
          const d = z.roomDist(creature.roomId, r);
          if (d < best) { best = d; near = r; }
        }
        const closer = exits.filter((e) => z.roomDist(e.to_room, near) < best);
        if (closer.length) exits = closer;
      }
    }
    // THE NOSE: fresh blood next door pulls an idle scavenger. A drip trail (a
    // wounded thing that walked through) or a kill's pool, younger than
    // SCENT_FRESH_MS, and the hyena drifts toward it instead of wandering blind
    // — odds-gated so it's a drift, not a magnet. Sets `curious`, and the
    // curious walk below does the moving: one sniff is one look, like a noise.
    if (mode === "wander" && !creature.curious && !creature.target && SCAVENGERS.has(creature.templateId)) {
      const bloody = exits.filter((e) => {
        const list = z.traces.get(e.to_room) ?? [];
        return list.some((t) => (t.kind === "drip" || t.kind === "blood") && now - t.at < SCENT_FRESH_MS);
      });
      if (bloody.length && chance(SCENT_HEED_ODDS)) {
        creature.curious = bloody[randInt(0, bloody.length - 1)].to_room;
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
    // A THING THAT IS GOING SOMEWHERE goes there. `curious` was never this — it
    // looks for an exit that IS the room it wants and clears after one look, so
    // it can only ever reach next door. This closes real distance, one room a
    // step, the way the watering run below already does, and it is what any arc
    // that puts a traveller on a road needs (the carrier's run, 2026-08-10).
    if (mode === "wander" && creature.walkingTo) {
      if (creature.walkingTo === creature.roomId) creature.walkingTo = undefined; // arrived
      else {
        const d = z.roomDist(creature.roomId, creature.walkingTo);
        const closer = exits.filter((e) => z.roomDist(e.to_room, creature.walkingTo!) < d);
        if (closer.length) exits = closer;
        else creature.walkingTo = undefined; // no way on from here — the journey ends where it stops
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
      // Indoors, or under a closed canopy. The canopy half is new (2026-08-08):
      // every wood room is OUTDOOR_ROOMS, so out here this filter matched
      // nothing at all and the wood's game stood in the rain because there was
      // nowhere the code would let it go. Now the deepwood and the sunken wood
      // count, and bad weather pushes the game into the thick stuff — where you
      // can also strike a light, and where the wolves already know to look.
      const covered = exits.filter((e) => !OUTDOOR_ROOMS.has(e.to_room) || underCover(e.to_room));
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
      // Same blind spot as the rain: out in the wood there was no warm ground to
      // send anything to. Canopy is not a wall, but it is the difference between
      // a frost and a hard frost, and it is what the wood has.
      const warm = exits.filter((e) => (!OUTDOOR_ROOMS.has(e.to_room) || underCover(e.to_room)) && !events.deepRoom(z, e.to_room));
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
      const grazer = GRAZERS.has(tmpl.id);
      // A hungry thief hunts a MARK first — empty-handed and restless, it edges
      // toward a room where someone's standing, a pocket to pick (rome,
      // 2026-07-18). Hands full (mid-steal), it just flees as ever.
      const mark = THIEVES.has(tmpl.id) && !creature.stole
        ? exits.find((e) => playerPresent(z, e.to_room))
        : undefined;
      // A grazer with no mark walks toward the LARDER — the muck-country the
      // dungeon regrows (warrens/carrion/gate) — so hunger leads it to food
      // instead of drifting blind and starving. Its place-fear (avoids) already
      // steered the exits, so it won't loop back into a room it just fled.
      const larder = !mark && grazer
        ? exits.find((e) => FORAGE_ROOMS.has(e.to_room) || world.entryRooms.has(e.to_room))
        : undefined;
      const smells = mark ?? larder ?? exits.find((e) =>
        (z.ground.get(e.to_room) ?? []).some((id) => world.itemTemplates.get(id)?.lure),
      );
      if (smells) exit = smells;
      creature.curious = null;
    } else if (SHADOWS.has(tmpl.id) && !creature.target) {
      // THE SHADOW KEEPS PACE (mig 191). The reed walker's whole description is
      // staying with you — "one cut over from yours, at your pace, on your
      // side". On an idle beat, an unengaged shadow that knows where a wanderer
      // is within SHADOW_REACH closes one step of that distance (odds-gated, so
      // it's a presence, not an inescapable tail) — but it stops at SHADOW_KEEP
      // rooms' clearance: it never crowds into the room with you, so it can
      // never block an exit or turn a corner into an ambush. It is the dread of
      // being followed, which is worse than being fought.
      const prey = [...z.sessions.values()].find(
        (s) => s.roomId !== creature.roomId && !z.outOfWorld(s)
          && z.roomDist(creature.roomId, s.roomId) <= SHADOW_REACH,
      );
      if (prey) {
        const d = z.roomDist(creature.roomId, prey.roomId);
        if (d > SHADOW_KEEP && chance(SHADOW_PACE_ODDS)) {
          const closer = exits.filter((e) => z.roomDist(e.to_room, prey.roomId) < d);
          if (closer.length) exit = closer[randInt(0, closer.length - 1)];
        }
      }
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
    // A wounded thing on the move drips where it walks — a fled survivor bleeds
    // a line straight to wherever it holes up, and anyone (or anything) can
    // read the stones and follow. Same law as the player's trail (verbs.cmdGo).
    if ((creature.bleedTicks ?? 0) > 0) {
      // It bleeds across BOTH stones: the room it just crossed on the way out
      // (the red line the flee line describes — where the hunter is standing)
      // AND the room it holes up in. The per-room drip cap dedupes a pacer.
      z.addTrace(from, { kind: "drip", at: now, label: tmpl.name });
      z.addTrace(creature.roomId, { kind: "drip", at: now, label: tmpl.name });
    }
    // A drifter counts the room it just walked into, and asks whether this is
    // the place. This is the only thing that ever ends a walkabout.
    if (mode === "wander") driftArrives(z, creature, now);
    creature.nextWanderAt = now + randInt(WANDER_MIN_MS, WANDER_MAX_MS);
    // THE QUIET (2026-08-06): nothing in the wood moves. Not frozen — a step it
    // would have taken in a minute it now takes in six, so the wood goes still
    // without a single creature being taken off the board.
    if (events.quieted(z, creature.roomId)) {
      creature.nextWanderAt = now + (creature.nextWanderAt - now) * QUIET_WANDER_MULT;
    }
    // Beyond its territory a creature travels with purpose — the walk in from
    // a dark mouth (or back from a rout) is minutes, not an afternoon.
    if (creature.home && !tmpl.is_boss && !z.withinRadius(creature.roomId, creature.home, TERRITORY_RADIUS)) {
      creature.nextWanderAt = now + randInt(8000, 25_000);
    }
    if (mode === "flee") {
      creature.target = null;
      for (const s of z.sessions.values()) {
        if (s.target === creature.id) s.target = null;
      }
      // The den remembers: a rout that ends among kin spreads the grudge.
      shareGrudges(z, creature, now);
      // AND THE RUNNING COSTS IT. The length of this rout was decided when it
      // started and is never announced — the chase is a bet on how much it has
      // left. Spend it and the animal is blown where it stands.
      creature.windAt ??= randInt(FLEE_WIND_MIN, FLEE_WIND_MAX);
      creature.fled = (creature.fled ?? 0) + 1;
      if (creature.fled >= creature.windAt) {
        creature.windedUntil = now + FLEE_WIND_MS;
        creature.fled = 0;
        creature.windAt = undefined;
        z.roomFeed(creature.roomId, `${cap(tmpl.name)} pulls up short, sides going, and turns to face the way it came. It has nothing left to run on.`, undefined, false);
        z.roomSound(creature.roomId, "Something stops running, somewhere {dir}.");
      }
    } else {
      // It walked instead of bolting, so the rout is over and it got clean
      // away — the next one starts from nothing. (The blown clock runs on by
      // itself; getting away does not give the breath back any sooner.)
      creature.fled = 0;
      creature.windAt = undefined;
    }
    // A summoned hyena that walks OFF the dinner floor may laugh again someday;
    // while it stood there, it never re-called (a call must not trigger a call).
    if (creature.calledTo && from === creature.calledTo) creature.calledTo = undefined;
    // Arriving where another of the watch already stands: the drill fires.
    drill(z, creature, now);
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
      } else if (ALARM_CALLERS.has(creature.templateId)) {
        creature.avoids = [
          ...(creature.avoids ?? []).filter((a) => a.until > now && a.roomId !== from),
          { roomId: from, until: now + ALARM_AVOID_MS },
        ];
        alarmBark(z, from, now, creature);
      }
    }
    if (!silent) {
      // The hollow don't bleed — they come apart in their own way. A runner
      // isn't wounded at all: it just darts, whole and gone.
      const hurt = HURT_STYLE[tmpl.id];
      const runner = bolts(z, tmpl.id, creature.roomId);
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
      // Creatures never relay their own movement — idle wander AND a flee from a
      // player both stay local now. The fight itself is on the player's own key;
      // the mob's footwork is room-only detail (rome, 2026-07-15).
      void fledFrom;
      z.roomFeed(from, outLine, undefined, false);
      const inLine = mode !== "flee" ? "creeps in."
        : runner ? "skitters in, already looking for the next way out."
        : hurt ? hurt.in_ : pick(fleeFam.in_);
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} ${inLine}`, undefined, false);
      z.roomSound(
        creature.roomId,
        mode === "flee"
          ? (runner ? "Something small scrabbles away {dir}, fast." : HOLLOW.has(tmpl.id) ? "Something clatters away {dir}, broken." : "Something crashes away {dir}, wounded.")
          : (MOVE_SOUNDS[tmpl.id] ?? "Something moves {dir}."),
        from,
      );
      z.refreshRoomCtx(from);
      z.refreshRoomCtx(creature.roomId);
      // IT CROSSED A THRESHOLD, and whoever is standing in that threshold sees
      // it go by and nothing more. This is the only thing that ever happens
      // inside a hideaway or a gate: it does not stop, it does not look at you,
      // and it is gone the same beat it arrived. (Anyone sheltering there keeps
      // every promise the room ever made — nothing can take a target in a room
      // it is never resident in.)
      if (through) {
        z.roomFeed(through, `${cap(tmpl.name)} comes through without stopping, crosses, and is gone.`, undefined, false);
        z.refreshRoomCtx(through);
      }
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
        if (s.roomId === creature.roomId && z.reachable(s) && !creature.target
            && remembers(z, creature, s.pubkey, now)) {
          creature.target = s.pubkey;
          z.send(s, `${cap(tmpl.name)} remembers you — and comes for you.`);
          // It gets the jump only if there is room to reach the player at all —
          // creatureFirstStrike owns that gate now (bodies engaged AND the
          // tick's blow budget), so this no longer spends a blow slot of its
          // own before the strike decides whether it lands.
          if (mode !== "flee") await z.creatureFirstStrike(creature, tmpl, s);
          break;
        }
      }
      // Came to investigate and found a fight: it joins. Noise has a price —
      // except for the bone-sleepers. A skeleton drawn by the din still walks
      // in, but it does NOT throw itself into the fight; it arrives dormant and
      // strikes only if you MOVE while it's there (wakeListeners) or it already
      // holds a grudge (handled just above). Creepier, and truer to what it is.
      // RUNNERS are exempt (rome's fleet-rat ruling, generalised 2026-08-02 when
      // a roe deer threw itself into a boar fight). A thing whose whole nature
      // is bolting does not join a brawl between bigger things. This was written
      // as a hardcoded `tmpl.id !== "fleet-rat"` back when the fleet-rat was the
      // only runner in the game; the sibling site in joinSameRoomFight was
      // generalised earlier today and this one was missed. Every other
      // investigator — the scabby rat very much included — still pays the price.
      if (investigating && !creature.target && !LISTENERS.has(tmpl.id)
          && !bolts(z, tmpl.id, creature.roomId)) {
        for (const s of z.sessions.values()) {
          if (s.roomId === creature.roomId && z.inCombat(s)) {
            creature.target = s.pubkey;
            addGrudge(z, creature, s.pubkey);
            z.send(s, `${cap(tmpl.name)} joins the fight, drawn by the noise!`);
            z.roomFeed(creature.roomId, `${cap(tmpl.name)} joins the fight!`, s.pubkey, false); // local: mob reaction
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
    if (idx !== -1) {
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
      return;
    }
    // Nothing lying to eat — but the dungeon feeds its own. A hungry rat or thief
    // in muck-country (warrens/carrion/gate thresholds) gnaws the ROOM itself:
    // no item, a nibble's heal. THIS is the food web's floor that keeps it alive
    // with no players around, and it rides catch-up (rome, 2026-07-18). Grazers
    // only — a carnivore keeps to corpses and prey. The HUNGRY_AT gate at the
    // call site is the rate limit: it grazes the beat it crosses hungry, resets,
    // and won't be back for it until the appetite returns.
    const grazer = GRAZERS.has(creature.templateId);
    // ...AND A SCAVENGER ON CARRION GROUND (mig 232/233). Same floor, one set
    // wider, and only on the three-and-now-more rooms that ARE carrion —
    // never a warren, never a gate threshold, never open ground.
    //
    // WHY IT HAD TO EXIST BEFORE THE MOUNTAIN'S FOURTH TIER COULD SHIP: above
    // the cloud line nothing grows, so the tier's whole thesis is that food is
    // DELIVERED — the fan under the face collects everything that comes off the
    // mountain, and what lives up there lives on it. Without this line that is
    // only a description. A scavenger's sole feeding route is a corpse lying in
    // its room, so thirty-odd of them on a tier with thirty prey would bank
    // hunger to the cap and sit there advertising it, which is the same bug this
    // world has now shipped three times (the crabs on the wrack, the west road's
    // strays, the outworks' rats). The bone ground is the answer the fiction was
    // already giving; this makes the code agree with it.
    const carrionEater = SCAVENGERS.has(creature.templateId) && CARRION_ROOMS.has(creature.roomId);
    if ((grazer && (FORAGE_ROOMS.has(creature.roomId) || world.entryRooms.has(creature.roomId))) || carrionEater) {
      const tmpl = world.mobTemplates.get(creature.templateId)!;
      creature.hunger = 0;
      creature.hp = Math.min(tmpl.max_hp, creature.hp + FORAGE_HEAL);
      if (!silent) {
        z.roomFeed(creature.roomId, carrionEater && !grazer
          ? `${cap(tmpl.name)} works over something old among the stones, and finds enough.`
          : THIEVES.has(creature.templateId)
          ? `${cap(tmpl.name)} crouches in a corner, gnawing at something it has scavenged.`
          : `${cap(tmpl.name)} noses through the muck, gnawing at fungus and scraps.`, undefined, false);
        z.refreshRoomCtx(creature.roomId);
      }
    }
  }

  // The food web reaching UP to the player: a predator starved past mere hunger,
  // with no easier prey in the room, treats the lone delver sharing it as meat.
  // The guardrails that make an unprovoked strike FAIR live here — a predator
  // (PREYS_ON), not a bloodless hollow, genuinely STARVING (not merely peckish),
  // and only when there's nothing weaker to run down first (predation eats that).
  // Already-hostile kinds (sentinels bar their post, drowners take the water,
  // the watchman its door) keep their own aggro and are excluded. The tick loop
  // rolls the odds and runs the telegraphed wind-up; this is just the predicate.
export function starvingHunts(z: ZoneDO, creature: Creature): boolean {
    if (!STARVE_HUNTERS.has(creature.templateId) || HOLLOW.has(creature.templateId)) return false;
    if (SENTINELS.has(creature.templateId) || DROWNERS.has(creature.templateId) || AGGRESSIVE.has(creature.templateId)) return false;
    if ((creature.hunger ?? 0) < STARVING_AT) return false;
    // A hunter that DOES keep a prey map (the surface pack) runs down the easier
    // animal first — it only comes for you when there's nothing weaker in the room.
    // The deep's pale hunters have no prey map, so this never spares you: you're it.
    const prey = PREYS_ON.get(creature.templateId);
    if (prey) {
      for (const c of z.creatures.values()) {
        if (c.id !== creature.id && c.roomId === creature.roomId && prey.has(c.templateId)) return false;
      }
    }
    return true;
  }

  // The food web reads WOUNDS too, not just its own belly: the same eligible
  // predators, independent of their own hunger — a fed hyena still knows a
  // stumbling, bleeding thing when it smells one. Every other guardrail is
  // identical to starvingHunts (same set, same hollow/sentinel/drowner/
  // aggressive exclusions, same "an easier animal in the room spares you"
  // rule) — this predicate only swaps the trigger from the CREATURE's hunger
  // to the VICTIM's own wounds (checked by the caller against WOUNDED_FRACTION,
  // the same "hurt" threshold that already softens a wounded player's own
  // blows and worsens their fumbles — one meaningful number, one more reason
  // to fear it).
export function woundedPreyHunts(z: ZoneDO, creature: Creature): boolean {
    if (!STARVE_HUNTERS.has(creature.templateId) || HOLLOW.has(creature.templateId)) return false;
    if (SENTINELS.has(creature.templateId) || DROWNERS.has(creature.templateId) || AGGRESSIVE.has(creature.templateId)) return false;
    const prey = PREYS_ON.get(creature.templateId);
    if (prey) {
      for (const c of z.creatures.values()) {
        if (c.id !== creature.id && c.roomId === creature.roomId && prey.has(c.templateId)) return false;
      }
    }
    return true;
  }

  // The food web: a predator sharing a room with prey it outranks may turn on it
  // — when it's hungry, or when there's a kill/bait to fight over. Emergent
  // culling (predators thin the herds the brood-mothers swell) and real tactics
  // (throw offal to start a scrap and slip past). Stays LOCAL, off the relay,
  // like idle wandering — it's world-life, not a fight a watcher is following.
  // Only idle creatures reach this (the tick guards on !target); a struck predator
  // (stunned/bleeding) has other problems. Returns true if it struck, so the tick
  // skips this creature's wander.
// What this creature may take IN THIS ROOM: its ordinary prey, plus anything
// PACK_PREY lets it take once enough of its own line is standing here. The pack
// is counted by LINE (variantBase), so a dire wolf counts toward the greys —
// see PACK_PREY for why that is the whole point of it.
function preyHere(z: ZoneDO, creature: Creature): Set<string> | null {
  const solo = PREYS_ON.get(creature.templateId);
  const pack = PACK_PREY.get(creature.templateId);
  if (!pack) return solo ?? null;
  const line = z.variantBase.get(creature.templateId) ?? creature.templateId;
  let strength = 0;
  for (const c of z.creatures.values()) {
    if (c.roomId !== creature.roomId) continue;
    if ((z.variantBase.get(c.templateId) ?? c.templateId) === line) strength++;
  }
  const set = new Set(solo ?? []);
  for (const [prey, need] of pack) if (strength >= need) set.add(prey);
  return set.size ? set : null;
}

export async function predation(z: ZoneDO, creature: Creature, now: number): Promise<boolean> {
    const prey = preyHere(z, creature);
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
    // Same physics as every other blow: the prey's own armor soaks some of the
    // bite (flat, floored at 1 — the player-swing model). Before 2026-08-20 a
    // bone-knight being torn at took the raw roll whole.
    victim.hp -= Math.max(1, randInt(tmpl.dmg_min, tmpl.dmg_max) - vt.armor);
    if (victim.hp <= 0) {
      preyFalls(z, victim, vt);
      creature.hunger = 0;
      creature.hp = Math.min(tmpl.max_hp, creature.hp + Math.max(2, Math.round(vt.max_hp / 6)));
      if (SCAVENGERS.has(creature.templateId)) creature.fed = (creature.fed ?? 0) + 1;
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} runs down ${vt.name} and tears into it.`, undefined, false);
      z.roomSound(creature.roomId, "A short, wet scuffle ends somewhere {dir}.");
      z.refreshRoomCtx(creature.roomId);
    } else {
      // IT LIVED — SO IT IS HELD. This used to bolt (a scrap, not a slaughter),
      // which is precisely why nothing bigger than a rat ever died out here.
      // The grip keeps them both in this room until it kills or it slips.
      creature.holding = victim.id;
      victim.heldBy = creature.id;
      victim.nextWanderAt = Math.max(victim.nextWanderAt, now + 60_000);
      creature.nextWanderAt = Math.max(creature.nextWanderAt, now + 60_000);
      z.roomFeed(creature.roomId,
        pick(HOLD_LINES).replace("{a}", cap(tmpl.name)).replace("{b}", vt.name), undefined, false);
      z.roomSound(creature.roomId, "Something is being killed {dir}, and taking its time about it.");
    }
    return true;
  }

/** Let go, whatever the reason — death, escape, or the pair being separated. */
export function releaseHold(z: ZoneDO, creature: Creature): void {
  if (creature.holding) {
    const v = z.creatures.get(creature.holding);
    if (v && v.heldBy === creature.id) v.heldBy = undefined;
    creature.holding = undefined;
  }
  if (creature.heldBy) {
    const p = z.creatures.get(creature.heldBy);
    if (p && p.holding === creature.id) p.holding = undefined;
    creature.heldBy = undefined;
  }
}

  // WORRYING IT. A predator with hold of something keeps killing it where it
  // stands, and the held thing keeps trying the grip. One room, no pursuit —
  // and a wanderer can walk in on the middle of it.
export async function worryPrey(z: ZoneDO, creature: Creature, now: number): Promise<boolean> {
    if (!creature.holding) return false;
    const victim = z.creatures.get(creature.holding);
    // Lost it: dead, gone, or something dragged one of them elsewhere.
    if (!victim || victim.roomId !== creature.roomId || creature.target) {
      releaseHold(z, creature);
      return false;
    }
    const world = z.world!;
    const tmpl = world.mobTemplates.get(creature.templateId)!;
    const vt = world.mobTemplates.get(victim.templateId)!;
    // It tries the grip first — the bite it is about to take is the one it
    // escapes, or doesn't.
    if (chance(PREY_BREAK_ODDS)) {
      releaseHold(z, creature);
      z.roomFeed(creature.roomId,
        pick(BREAK_LINES).replace("{a}", tmpl.name).replace("{b}", cap(vt.name)), undefined, false);
      await creatureMoves(z, victim, now, "flee", false);
      return true;
    }
    victim.hp -= Math.max(1, Math.round(randInt(tmpl.dmg_min, tmpl.dmg_max) * PREY_WORRY_MULT) - vt.armor);
    if (victim.hp > 0) return true;
    releaseHold(z, creature);
    preyFalls(z, victim, vt);
    creature.hunger = 0;
    creature.hp = Math.min(tmpl.max_hp, creature.hp + Math.max(2, Math.round(vt.max_hp / 6)));
    if (SCAVENGERS.has(creature.templateId)) creature.fed = (creature.fed ?? 0) + 1;
    z.roomFeed(creature.roomId, `${cap(tmpl.name)} finishes it, and stands over what is left.`, undefined, false);
    z.roomSound(creature.roomId, "A short, wet scuffle ends somewhere {dir}.");
    z.refreshRoomCtx(creature.roomId);
    return true;
  }

  // A creature killed by another creature, not a player: no kill credit, no
  // corpse-key, no revenant rise — just a body. Its spoils drop where it fell
  // (emergent loot to recover), a corpse trace feeds the scavengers, and
  // migration refills it like any other death.
function preyFalls(z: ZoneDO, victim: Creature, vt: MobTemplate): void {
    releaseHold(z, victim); // it may have had something by the throat itself
    for (const s of z.sessions.values()) {
      if (s.target === victim.id) s.target = null;
      if (s.seizedBy === victim.id) s.seizedBy = undefined;
    }
    const spoils = [...(victim.carries ?? [])];
    // A stolen journal spills INSTANCED so its pages survive this hand-off too
    // — a hyena that kills the cutpurse must not eat the book's identity.
    if (victim.stole && victim.stoleJournal) {
      z.dropInstance(victim.roomId, victim.stole, victim.stoleJournal);
    } else if (victim.stole) spoils.push(victim.stole);
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
    // Hunting weather, all three kinds: the rain's noise, the fog's blindness,
    // and the dark itself — an outdoor scavenger is bolder at night same as
    // under a storm (the world-clock, isNight; deep/warrens are already dark
    // regardless of the hour, so this only ever adds anything outdoors).
    // ...and the moon takes the third one back. isDark() is the honest read of
    // "is it actually dark here" — it already knows the full moon lights the
    // grounds — so on that one night in six the dark is not there to be bold in,
    // and the boldness goes with it. Rain and fog are their own weather and are
    // untouched: a storm under a full moon is still hunting weather.
    // The mountain is the exception the other way (2026-08-19): it is night up
    // there like everywhere else, and the dark it does not have was never what
    // made a scavenger bold — the hour is. So the band keeps its nights honest
    // and this reads the clock for it rather than the blackness it lacks.
    return events.raining(z, creature.roomId) || events.foggy(z, creature.roomId)
      || (OUTDOOR_ROOMS.has(creature.roomId) && z.isDark(creature.roomId))
      || (z.regionOf(creature.roomId) === "mountain" && isNight() && !isFullMoon());
  }

// IS THIS ROOM UNDER THE MOON RIGHT NOW — the single gate every full-moon
// behaviour reads (rome, 2026-08-10). Outdoors, at night, and genuinely lit:
// isDark() is false out here only when the moon is full, so this is the full
// moon stated as a question about a ROOM rather than about the calendar. That
// matters because the gloam blots out a sky (events.gloamed feeds isDark), and
// a room the dark is standing in gets none of this no matter what the moon is.
export function moonlit(z: ZoneDO, roomId: string, now = Date.now()): boolean {
  // ...AND IT HAS TO ASK THE CALENDAR NOW, not just the room (2026-08-19). The
  // "!isDark" trick was exact while the only lit outdoor night was a full moon.
  // The mountain broke that: it is exempt from the night dark entirely (a bare
  // hillside under open sky does not go blind), so every mountain room read as
  // moonlit EVERY night — which would have handed the hill wolves the full
  // moon's hunting and calling multipliers permanently. Ask the moon directly
  // and the room's own dark second; both must agree.
  return OUTDOOR_ROOMS.has(roomId) && isNight(now) && isFullMoon(now) && !z.isDark(roomId);
}

// The pack's share of the moon: on top of the night multiplier, never instead
// of it. Only the callers — the wolves and the dogs — get it. Everything else
// hunting outdoors keeps night's plain 1.6, because this is about a pack that
// can SEE its ground, not about predators in general.
export function moonHuntMult(z: ZoneDO, creature: Creature, now: number): number {
  return PACK_CALLERS.has(creature.templateId) && moonlit(z, creature.roomId, now) ? MOON_PACK_HUNT_MULT : 1;
}

// DOES THIS THING RUN, RIGHT NOW. RUNNERS is a permanent fact about a template
// — except in the rut, when the roe stop being deer that run and become deer
// that stand (events.rutting, 2026-08-06). One place to ask, so the flee prose,
// the fight-joining and the scrum rule all change together and cannot drift.
export function bolts(z: ZoneDO, templateId: string, roomId: string): boolean {
  if (!RUNNERS.has(templateId)) return false;
  if (templateId === "roe-deer" && events.rutting(z, roomId)) return false;
  return true;
}

// ---- MIGRATION IS A WALK (rome, 2026-08-12: build the drift) ---------------
//
// It used to be an ADDRESS. A rare die picked a band the animal could live on,
// then a room inside it, and that room became home; the creature then walked
// there over the following hours. The walk was always real — nothing ever
// teleported — but the destination was chosen by fiat, out of a menu, before a
// single step was taken. Everything that was wrong with migration was wrong in
// that one line, and it showed up as a grey wolf standing on the east road:
//
//   * A BAND IS ONE LABEL OVER SEVERAL WORLDS. Measured on the live map,
//     "road" is four disconnected pieces (80 + 71 + 7 + 3 rooms) and "wood" is
//     five, because a hideaway on a through-line is a wall to anything that
//     walks. "There is prey on the road" can be true about the west road while
//     the die drops the animal on the east one.
//   * ONE STRAY GRAZER OPENED THE GATE FOR EVERY HUNTER. Nothing a wolf eats is
//     seeded on the road at all — but a roe deer may graze any foraging band,
//     and the moment one wandered out there, every wolf in the wood was cleared
//     to "live on the road", all 161 rooms of it.
//
// So there is no menu now, and no address. A migrating animal simply UNMOORS:
// it drops the territory pull, walks — one room a beat, away from where it set
// out, through the ordinary exits, past the ordinary walls — and SETTLES ON THE
// FIRST GROUND THAT CAN FEED IT. Where it ends up is not chosen anywhere; it is
// wherever the walking took it. The ecology enforces itself, because a room
// that cannot feed the animal is a room it does not stop in, and no table has
// to be kept in step with where the prey actually stands.
//
// It costs something honest: a drifter is loose for a while and can be met
// anywhere it can walk. That is the point — it is a real animal crossing real
// country, and you can kill it on the way. The leash is what keeps it from
// being nonsense: surface bands only (nothing drifts into the deep or the
// keep), the Crossing's own quarter rule still applies, and an animal that has
// walked DRIFT_GIVES_UP rooms without finding anything turns round and goes
// back to the ground it came from.

// How many of this line are living on a given band right now.
function countOn(z: ZoneDO, templateId: string, band: string): number {
  let n = 0;
  for (const c of z.creatures.values()) {
    if (c.templateId === templateId && z.regionOf(c.roomId) === band) n++;
  }
  return n;
}

/** May this animal STOP here — is this ground it could actually live on? */
function settlesHere(z: ZoneDO, templateId: string, roomId: string): boolean {
  const band = z.regionOf(roomId);
  if (!MIGRATE_BANDS.has(band)) return false;
  // The Crossing keeps settlers off the water and the reed (MIGRATE_QUARTERS) —
  // the same rule the address roll had, asked of one room instead of a pool.
  const allow = MIGRATE_QUARTERS[band];
  if (allow && !allow.has(MAP_QUARTERS[roomId] ?? "")) return false;
  if (z.world!.safeRooms.has(roomId) || z.world!.entryRooms.has(roomId)) return false;
  // A grazer needs ground that grows something — THIS ROOM, not this band. The
  // band test was the same shortcut the migration rewrite above spent four
  // paragraphs killing everywhere else: "there is food on the road" asked of a
  // label instead of the floor the animal is standing on. It read identically
  // for road/wood/den/crossing (init folds every room of a forage band into
  // FORAGE_ROOMS, so band membership and room membership are the same fact
  // there), and it was wrong for the outworks, where only part of the ground
  // grows anything — a blanket band would have settled a goat on the Battery.
  if (GRAZERS.has(templateId) && !THIEVES.has(templateId)) return FORAGE_ROOMS.has(roomId);
  // A hunter needs something it hunts standing within its OWN range of here —
  // not "somewhere in the band", which is the lie the old gate told. This is
  // the same radius its territory will have the moment it settles, so the test
  // and the life it is about to live are the same measurement.
  const prey = PREYS_ON.get(templateId);
  if (prey?.size) {
    const range = z.nearby(roomId, TERRITORY_RADIUS);
    for (const c of z.creatures.values()) if (prey.has(c.templateId) && range.has(c.roomId)) return true;
    return false;
  }
  // People follow people, and any ground out here has a road on it somewhere.
  return true;
}

/** Cut the tether: this one is going walkabout. */
export function beginDrift(z: ZoneDO, creature: Creature, templateId: string): void {
  const here = z.regionOf(creature.home ?? creature.roomId);
  // Never strip a band bare. The wood can lose wolves; it cannot be emptied of
  // them, and no amount of dice may do what a migration file would not.
  if (countOn(z, templateId, here) <= MIGRATE_KEEP) return;
  creature.drift = 0;
  creature.driftFrom = creature.home ?? creature.roomId;
}

/**
 * One room of a drift, resolved AFTER the step is taken: count it, and decide
 * whether this is the place. Settling is what ends a drift — the animal takes
 * the room it is standing in as home and its ordinary territory closes around
 * it. DRIFT_SETTLE_MIN stops it "migrating" three rooms and stopping on its own
 * doorstep, which every wolf in the wood would otherwise do instantly, since
 * the wood is full of deer.
 */
function driftArrives(z: ZoneDO, creature: Creature, now: number): void {
  if (creature.drift === undefined) return;
  creature.drift++;
  if (creature.drift >= DRIFT_SETTLE_MIN && settlesHere(z, creature.templateId, creature.roomId)) {
    creature.home = creature.roomId;
    creature.drift = undefined;
    creature.driftFrom = undefined;
    creature.huntAt = undefined; // the larder question is worth asking again from here
    return;
  }
  if (creature.drift >= DRIFT_GIVES_UP) {
    // It walked a long way and found nothing it could keep. Animals do this and
    // then they go home; the territory pull below does the walking back.
    creature.home = creature.driftFrom ?? creature.home;
    creature.drift = undefined;
    creature.driftFrom = undefined;
  }
  void now;
}


export function playerPresent(z: ZoneDO, roomId: string): boolean {
    // Somebody behind a barred den door is IN the room and out of reach of
    // everything in it (mig 172) — a creature neither smells them, waits for
    // them, nor counts them as company.
    for (const s of z.sessions.values()) if (s.roomId === roomId && z.reachable(s)) return true;
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

  // A fire-fearing thing does not want to be near an open flame — but wanting
  // and doing are different, and this used to skip straight past the difference.
  // It broke on the FIRST round it could see a flame, every time, which turned a
  // torch into a no-fight button over most of the wood (rome, 2026-08-03: "the
  // woods mobs are running away too much... it should be a chance they run away
  // during the rounds"). Now the fear is rolled every round it stands there —
  // FIRE_FLEE_CHANCE, the same shape as the wounded-flee roll — so a wolf comes
  // in at you and the fire is the thing arguing with it, round after round,
  // until it wins. It usually wins. Not immediately.
  //
  // Live since torches landed (057); most of the wood since 2026-08-03 (the
  // deer, the wolves, the boars and the root-things — FEARS_FIRE, zone-data.ts).
  // Returns true only on the round it actually breaks, and says so then.
export function dreadsFire(z: ZoneDO, creature: Creature, victim: Session): boolean {
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    if (!FEARS_FIRE.has(tmpl.id)) return false;
    // The fear answers the FLAME, not the hand: a torch burning on the floor
    // holds the room the same as one held up.
    const inHand = carriesFire(victim);
    if (!inHand && !z.roomLit(creature.roomId)) return false;
    // A WIELDED BURNING BRAND is not an argument, it is the end of the
    // argument (2026-08-20): the fire is IN the hand that is swinging at it,
    // so the nerve fails outright — no roll, no rounds of holding. Everything
    // else is still the roll below.
    const weapon = z.equippedItem(victim, "weapon");
    const burningBrand = !!weapon && hasTrait(weapon.tmpl, "burning") && carriesFire(victim);
    // Nerve fails on a roll, not on sight. The rounds it holds are silent — a
    // line every four seconds for a thing that is still standing there would be
    // its own kind of noise.
    if (!burningBrand && !chance(FIRE_FLEE_CHANCE)) return false;
    // Name the fire that actually did it — a banked charcoal mound is not a
    // torch on the floor, and the line reads as a bug when it says otherwise.
    const flame = burningBrand ? "the burning brand" : inHand ? "your flame" : z.roomHasFirekeeper(creature.roomId) ? "the burner's fire" : "the burning torch";
    z.send(victim, `${cap(tmpl.name)} shrinks from ${flame} and breaks away.`);
    z.roomFeed(creature.roomId, `${cap(tmpl.name)} shrinks from the flame.`, victim.pubkey, false);
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
      // A drowned thing doesn't tear at a body — it takes it under, and the
      // water does the rest. Its own line, and its own quieter sound.
      const drowner = DROWNERS.has(creature.templateId);
      z.roomFeed(creature.roomId, ownDead
        ? pick([
            `${cap(tmpl.name)} drags the fallen ${eaten.label!.replace(/^(a|an|the)\s+/i, "")} close and feeds. The pack is nothing to it.`,
            `${cap(tmpl.name)} sets to its own dead without a pause — it does not care what it was.`,
          ])
        : drowner
        ? pick([
            `${cap(tmpl.name)} gathers the dead in and sinks with it. The water closes over them both.`,
            `${cap(tmpl.name)} draws the body down under the black water and does not come up for a while.`,
          ])
        : `${cap(tmpl.name)} tears into the dead, feeding.`, undefined, false);
      z.roomSound(creature.roomId, drowner ? "Water turns over heavily, {dir}, and settles." : "Wet, cracking sounds drift {dir}.");
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
      (s) => s.roomId === creature.roomId && z.reachable(s) && s.hp > 0,
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
    // Outdoors, the hour decides: the wood's game grazes by day and lies up
    // after dark, which is what the wolves' night surge is FOR. Indoors keeps
    // the old flat rate — the deep and the warrens do not have an hour.
    //
    // And the moon is a third hour. On a lit night it is light enough to feed,
    // so the game stays up and out in the open instead of bedding down — which
    // is the other half of the wolves' full moon: they hunt harder AND there is
    // something out there to hunt.
    // ...and a NOCTURNAL animal reads the same two rates the other way round: the
    // day column after dark, the night column in the daylight. One xor, no third
    // number to drift out of step with the other two.
    // The moon is untouched by this. A lit night keeps the game up and out, and
    // it keeps the night shift out too — a hunting otter has no reason to go to
    // bed because the moon came up.
    const nocturnal = NOCTURNAL.has(creature.templateId);
    const odds = OUTDOOR_ROOMS.has(creature.roomId)
      ? (moonlit(z, creature.roomId, now) ? NAP_ODDS_MOON_OUT
        : isNight(now) !== nocturnal ? NAP_ODDS_NIGHT_OUT : NAP_ODDS_DAY_OUT)
      : NAP_ODDS;
    if (!chance(odds)) return;
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
    if (!DRINKERS.has(creature.templateId) || creature.target || creature.asleep) return;
    if (creature.wateringTo) {
      if (creature.roomId === creature.wateringTo) {
        const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
        creature.wateringTo = undefined;
        creature.thirstAt = now + randInt(THIRST_MIN_MS, THIRST_MAX_MS);
        // A boar at water is not drinking politely, it is getting in.
        const wallows = creature.templateId === "wild-boar" || creature.templateId === "old-boar";
        z.roomFeed(creature.roomId, wallows
          ? `${cap(tmpl.name)} walks straight into the shallows and lies down in it, and the water goes brown around it.`
          : `${cap(tmpl.name)} lowers its muzzle to the water and drinks, long and unhurried.`, undefined, false);
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
      (r) => z.world!.rooms.has(r) && z.withinRadius(home, r, TERRITORY_RADIUS),
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

  // THE ALARM BARK. A roe deer that breaks from a PERSON barks once, and the
  // sound does two opposed things: the game hears a warning, and the hunters
  // hear an address. It is the only call in the game with two audiences, and
  // the second one is not on your side.
export function alarmBark(z: ZoneDO, roomId: string, now: number, caller: Creature): void {
    const tmpl = z.world!.mobTemplates.get(caller.templateId)!;
    z.roomFeed(roomId, `${cap(tmpl.name)} barks once — a flat, carrying cough of a sound, nothing like an animal in pain.`, undefined, false);
    z.roomSound(roomId, "A deer barks {dir}, once, and does not repeat it.");
    const exitsOf = (id: string) => (z.world!.exits.get(id) ?? []);
    for (const c of z.creatures.values()) {
      if (c.id === caller.id || c.target) continue;
      const adjacent = exitsOf(c.roomId).some((e) => !e.key_item && e.to_room === roomId);
      if (c.roomId !== roomId && !adjacent) continue;
      // THE GAME TAKES THE WARNING and keeps off that ground for a while —
      // which is what makes the bark worth having if you are a deer.
      if (ALARM_HEEDS.has(c.templateId)) {
        c.asleep = false;               // bedded game gets up: the whole value of the call
        c.sleepUntil = undefined;
        c.avoids = [
          ...(c.avoids ?? []).filter((a) => a.until > now && a.roomId !== roomId),
          { roomId, until: now + ALARM_AVOID_MS },
        ];
        c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 8000));
        continue;
      }
      // THE HUNTERS TAKE AN ADDRESS. Adjacent only, odds-gated, and never a
      // creature that was itself summoned — a call must not trigger a call.
      if (STARVE_HUNTERS.has(c.templateId) && adjacent && !c.calledTo && !c.asleep && chance(ALARM_DRAW_ODDS)) {
        c.calledTo = roomId;
        c.curious = roomId;
        c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(3000, 9000));
      }
    }
  }

  // THE DEER SEE YOU COMING. The bark has always been a thing you CAUSE: put a
  // deer to flight and it barks on the way out, which means the wood only ever
  // learns about you after you have already touched it. On a lit night that is
  // backwards — a roe deer's whole living is seeing first, and on open moonlit
  // ground it can see a room further than you can move quietly.
  //
  // So it calls before you get there. Both rooms have to be under the moon
  // (it is looking ACROSS open ground, not around a corner into a dark one),
  // and the bark itself is the one the game already has — the same two
  // audiences, the warning and the address, one of which is not on your side.
  // Its own avoids double as the cooldown: a caller that has barked here is
  // leaving here, and will not bark this ground again until it comes back.
export function alarmWatch(z: ZoneDO, creature: Creature, now: number): void {
    if (!ALARM_CALLERS.has(creature.templateId) || creature.target || creature.asleep) return;
    if (!moonlit(z, creature.roomId, now)) return;
    if ((creature.avoids ?? []).some((a) => a.until > now && a.roomId === creature.roomId)) return;
    // Someone in the room is the flee rule's business (RUNNERS never settle with
    // a person standing there); this is the room BEYOND, which nothing else has
    // ever reacted to.
    if (playerPresent(z, creature.roomId)) return;
    const seen = (z.world!.exits.get(creature.roomId) ?? [])
      .some((e) => !e.key_item && moonlit(z, e.to_room, now) && playerPresent(z, e.to_room));
    if (!seen || !chance(ALARM_MOON_ODDS)) return;
    creature.avoids = [
      ...(creature.avoids ?? []).filter((a) => a.until > now && a.roomId !== creature.roomId),
      { roomId: creature.roomId, until: now + ALARM_AVOID_MS },
    ];
    alarmBark(z, creature.roomId, now, creature);
  }

  // HE WANTS IT. A hoarder sharing a room with somebody carrying something rare
  // fixes on it and follows for a while. He never takes it — he is not a thief
  // and he is not hostile — he just comes along, which in a full-loot game is
  // its own kind of pressure. Reuses `curious` (the drift-toward machinery) so
  // he trails rather than teleports, and `calledTo` so nothing else calls him.
export function hoarderCovets(z: ZoneDO, creature: Creature, now: number): void {
    if (!HOARDERS.has(creature.templateId) || creature.target || creature.asleep) return;
    // Already following someone: keep on while the clock runs and they're near.
    if (creature.covetUntil && now < creature.covetUntil) {
      const mark = [...z.sessions.values()].find((s) => s.pubkey === creature.covets);
      if (mark && !z.outOfWorld(mark) && mark.roomId !== creature.roomId) {
        creature.curious = mark.roomId;
        creature.nextWanderAt = Math.min(creature.nextWanderAt, now + randInt(3000, 9000));
      }
      return;
    }
    creature.covetUntil = undefined;
    creature.covets = undefined;
    const here = [...z.sessions.values()].find(
      (s) => s.roomId === creature.roomId && z.reachable(s) && s.hp > 0
        && s.items.some((c) => (RARITY_RANK[z.world!.itemTemplates.get(c.itemId)?.rarity ?? "common"] ?? 0) >= HOARD_COVET_RARITY),
    );
    if (!here) return;
    if (!chance(HOARD_COVET_ODDS)) return;
    creature.covets = here.pubkey;
    creature.covetUntil = now + HOARD_COVET_MS;
    z.send(here, pick(HOARD_COVET_LINES), "amb");
  }

  // THE CANTOR'S SONG. Rolled on an idle cantor; holds every hollow thing in the
  // room and the rooms next door. Nothing else in the deep can stop a bone-knight
  // mid-stride, including you.
export function cantorSings(z: ZoneDO, creature: Creature, now: number): void {
    if (creature.templateId !== "marrow-cantor" || creature.asleep) return;
    if (creature.singUntil && now < creature.singUntil) return;   // mid-verse
    if (creature.singUntil && now >= creature.singUntil) {        // just finished
      creature.singUntil = undefined;
      z.roomFeed(creature.roomId, pick(CANTOR_END_LINES), undefined, false, "evt");
      return;
    }
    if (!chance(CANTOR_SING_ODDS)) return;
    creature.singUntil = now + CANTOR_SONG_MS;
    z.roomFeed(creature.roomId, pick(CANTOR_SONG_LINES), undefined, false, "evt");
    z.roomSound(creature.roomId, "One held note comes {dir}, and does not waver.");
    let held = 0;
    for (const c of z.creatures.values()) {
      if (c.id === creature.id || !HOLLOW.has(c.templateId)) continue;
      const near = c.roomId === creature.roomId
        || (z.world!.exits.get(c.roomId) ?? []).some((e) => e.to_room === creature.roomId);
      if (!near) continue;
      c.heldUntil = creature.singUntil;
      c.nextWanderAt = Math.max(c.nextWanderAt, creature.singUntil);
      held++;
    }
    if (held) z.roomFeed(creature.roomId, pick(CANTOR_HELD_LINES), undefined, false, "evt");
  }

/** Is this thing frozen to the cantor's note right now? */
export function heldBySong(creature: Creature, now: number): boolean {
  return !!creature.heldUntil && now < creature.heldUntil;
}

  // THE DRILL. Two hollow soldiers in a room together do what they were trained
  // to do, at each other, forever. Rolled when one ARRIVES somewhere the other
  // already is, so it reads as a meeting rather than a thing the room does.
  // Silent unless somebody is standing there to see it — the fortress does not
  // perform for an empty hall (it just goes on doing it).
export function drill(z: ZoneDO, creature: Creature, now: number): void {
    void now;
    if (!DRILL_SOLDIERS.has(creature.templateId) || creature.target) return;
    if (!playerPresent(z, creature.roomId)) return;
    const other = [...z.creatures.values()].find(
      (c) => c.id !== creature.id && c.roomId === creature.roomId && !c.target && !c.asleep
        && DRILL_SOLDIERS.has(c.templateId),
    );
    if (!other) return;
    if (!chance(DRILL_ODDS)) return;
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    const ot = z.world!.mobTemplates.get(other.templateId)!;
    // Rank is answered, not exchanged: the lesser one gives way.
    const iAmRank = DRILL_RANK.has(creature.templateId);
    const theyAreRank = DRILL_RANK.has(other.templateId);
    const line = iAmRank !== theyAreRank
      ? pick(DRILL_RANK_LINES)
          .replace("{a}", cap(theyAreRank ? tmpl.name : ot.name))
          .replace("{b}", theyAreRank ? ot.name : tmpl.name)
      : pick(DRILL_LINES).replace("{a}", cap(tmpl.name)).replace("{b}", ot.name);
    z.roomFeed(creature.roomId, line, undefined, false, "amb");
  }

/**
 * WHICH WAYS OUT THE PACK HAS TAKEN. Every wolf in the room BEYOND THE FIRST
 * puts itself in a gap: two wolves hold one exit, three hold two, and so on.
 * Capped at one short of the room's exits so a way out always exists.
 *
 * Assignment is stable, not random — exits sorted, wolves sorted by id — so the
 * same gaps stay held for the length of a fight instead of shuffling under you
 * every time you look. Only wolves ENGAGED with you count; a wolf asleep in the
 * corner is not blocking anything.
 */
export function heldExits(z: ZoneDO, session: Session): Map<string, string> {
  const out = new Map<string, string>();
  const { holders, exits, take } = packGaps(z, session);
  for (let i = 0; i < take; i++) {
    const tmpl = z.world!.mobTemplates.get(holders[i].templateId)!;
    out.set(exits[i], tmpl.name);
  }
  return out;
}

// The shared reckoning behind heldExits: WHICH wolves are in the gaps, in the
// same stable order, so the two questions ("what's shut" and "who shut it")
// can never disagree.
function packGaps(z: ZoneDO, session: Session): { holders: Creature[]; exits: string[]; take: number } {
  const holders: Creature[] = [];
  for (const c of z.creatures.values()) {
    if (c.roomId !== session.roomId || !PACK_HOLDERS.has(c.templateId)) continue;
    if (c.target !== session.pubkey || c.asleep || c.heldBy) continue;
    holders.push(c);
  }
  const exits = (z.world!.exits.get(session.roomId) ?? []).map((e) => e.dir).sort();
  // Fewer than two wolves is not a pack, and a dead end has nothing to take.
  const take = holders.length < 2 || exits.length < 2
    ? 0
    : Math.min(holders.length - 1, exits.length - 1);
  holders.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { holders, exits, take };
}

/**
 * IS THIS WOLF IN A GAP RATHER THAN IN THE FIGHT? A wolf that has taken a door
 * is not also biting you — the whole design sentence for the pack is "not more
 * teeth, fewer ways out" (zone-data PACK_HOLDERS), and the beat that announces
 * it says in as many words that it has stopped trying to bite you. Only the
 * announcement was ever wired: the holder went on swinging anyway, so the pack
 * scaled BOTH ways and the line the player read was a lie.
 *
 * The trade is now real, and it is the counterweight to the same-room join
 * above: two wolves used to mean one biting and one idle, and now mean one
 * biting and one door gone.
 */
export function holdsExit(z: ZoneDO, creature: Creature, session: Session): boolean {
  if (!PACK_HOLDERS.has(creature.templateId)) return false;
  const { holders, take } = packGaps(z, session);
  for (let i = 0; i < take; i++) if (holders[i].id === creature.id) return true;
  return false;
}

  // THE PACK CALL. A wolf with hold of somebody throws its head up and calls,
  // and one packmate next door comes. Rolled every round it is still fighting,
  // so the pack is the price of a slow kill (zone-data.ts PACK_CALL_ODDS).
export function packCall(z: ZoneDO, creature: Creature, now: number): void {
    if (!PACK_CALLERS.has(creature.templateId)) return;
    if (creature.calledTo === creature.roomId) return; // a call must never trigger a call
    // Under a full moon the pack gathers faster — the same call, thrown more
    // often, because it can see who is coming and from where.
    if (!chance(Math.min(1, PACK_CALL_ODDS * (moonlit(z, creature.roomId, now) ? MOON_PACK_CALL_MULT : 1)))) return;
    const line = z.variantBase.get(creature.templateId) ?? creature.templateId;
    const mate = [...z.creatures.values()].find(
      (c) => c.id !== creature.id && !c.target && !c.asleep && !c.calledTo
        && (z.variantBase.get(c.templateId) ?? c.templateId) === line
        && (z.world!.exits.get(c.roomId) ?? []).some((e) => !e.key_item && e.to_room === creature.roomId),
    );
    if (!mate) return;
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    z.roomFeed(creature.roomId, `${cap(tmpl.name)} throws its head up and calls — one long note, and it is not calling to you.`, undefined, false);
    z.roomSound(creature.roomId, "A long call goes up {dir}, and something answers it.");
    mate.calledTo = creature.roomId;
    mate.curious = creature.roomId;
    mate.nextWanderAt = Math.min(mate.nextWanderAt, now + randInt(3000, 9000));
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
    // A rat-hunter (a lurker that keeps a prey map) that's HUNGRY leaves its lurk
    // and ranges toward the rat-runs — wider, and far more often than the idle
    // 3h drift. Fed, it falls back to the slow territorial drift below.
    const prey = PREYS_ON.get(creature.templateId);
    const hunting = !!prey && (creature.hunger ?? 0) >= HUNGRY_AT;
    const interval = hunting ? LURKER_HUNT_DRIFT_MS : LURKER_DRIFT_MS;
    if (creature.repositionAt === undefined) {
      creature.repositionAt = now + randInt(Math.round(interval / 2), interval);
      return;
    }
    if (creature.repositionAt > now) return;
    creature.repositionAt = now + randInt(interval, interval * 2);
    const home = creature.home ?? creature.roomId;
    let best: string | null = null;
    if (hunting) {
      // Toward the nearest food in reach: a live rat it preys on, or a carcass to
      // scavenge. Failing either, hang toward the rat-runs and wait for one. Ranges
      // out to LURKER_HUNT_RADIUS from home; steps toward the closest such room.
      let bestDist = Infinity;
      const consider = (roomId: string) => {
        if (roomId === creature.roomId || !DARK_ROOMS.has(roomId)) return;
        if (!z.withinRadius(home, roomId, LURKER_HUNT_RADIUS)) return;
        if (lurkersIn(z, roomId, creature.id) >= LURKER_CROWD) return; // that stretch of dark is taken
        const d = z.roomDist(creature.roomId, roomId);
        if (d < bestDist) { bestDist = d; best = roomId; }
      };
      for (const c of z.creatures.values()) if (prey!.has(c.templateId)) consider(c.roomId); // meat on the hoof
      for (const [roomId, list] of z.traces) if (list.some((t) => CORPSE_TRACES.has(t.kind))) consider(roomId); // carrion
      if (!best) for (const roomId of WARRENS_ROOMS) consider(roomId); // nothing yet — drift toward where rats run
    } else {
      // FULL: the old aimless drift — shift the ambush to the freshest-trafficked
      // born-dark room in its own territory (your habitual corridor stops being safe).
      let bestAt = 0;
      for (const [roomId, list] of z.traces) {
        if (roomId === creature.roomId || !DARK_ROOMS.has(roomId)) continue;
        if (!z.withinRadius(home, roomId, TERRITORY_RADIUS)) continue;
        if (lurkersIn(z, roomId, creature.id) >= LURKER_CROWD) continue; // another one already lies in wait there
        for (const tr of list) {
          if (tr.kind === "passage" && tr.at > bestAt) { bestAt = tr.at; best = roomId; }
        }
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
      (s) => s.roomId === creature.roomId && s.resting && z.reachable(s) && s.hp > 0,
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
    const hoarder = HOARDERS.has(creature.templateId);
    if (!hoarder && !SCAVENGERS.has(creature.templateId)) return;
    // Standing in its own den with a full enough pocket, a hoarder sheds one
    // piece onto the pile before it goes looking for more. This runs BEFORE the
    // cap check: a hoarder at capacity is exactly the one that should be
    // unloading, and it's what keeps the lair silting up over days.
    if (hoarder) hoarderSheds(z, creature);
    if ((creature.carries?.length ?? 0) >= (hoarder ? HOARD_CARRY_CAP : SCAVENGER_CARRY_CAP)) return;
    if (playerPresent(z, creature.roomId)) {
      creature.eyeing = undefined; // caught in the act: it slinks back and waits
      creature.eyeingAt = undefined;
      return;
    }
    const floor = z.ground.get(creature.roomId);
    if (!floor?.length) return;
    const now = Date.now();
    // A hyena takes real gear only — it has no use for food (it eats that) or
    // the free rock. A hoarder takes ANYTHING but the rock: it isn't feeding
    // and it isn't equipping, it's keeping, and a trophy or a tin of scraps is
    // as good to it as a blade. (The rock stays exempt everywhere — it's the
    // free weapon the world always leaves lying around, and a thing that
    // pocketed those would quietly disarm the poorest players.)
    // Fresh-fallen pieces don't tempt either of them yet; stale ones are fair game.
    const idx = floor.findIndex((id) => {
      const t = z.world!.itemTemplates.get(id);
      if (!t || t.id === "loose-rock") return false;
      if (!hoarder && t.slot === "") return false;
      // A hoarder takes LITTER, not FURNITURE. Because it takes everything, it
      // would otherwise strip the world's renewable floors — the torch that
      // belongs in the undercroft, the food that regrows in a larder — and the
      // floor-renewal law would dutifully put them back for it to take again,
      // forever. What a room is configured to hold is that room's, not its.
      if (hoarder && z.world!.groundSpawns.some((g) => g.room_id === creature.roomId && g.item_id === id)) return false;
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
      z.roomSound(creature.roomId, hoarder
        ? "Something stops {dir}, and a load of hanging metal stops with it — one beat late."
        : "Something snuffles over dropped metal {dir}, unhurried.");
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
    if (g) z.roomFeed(creature.roomId, hoarder
      ? `${cap(tmpl.name)} stoops, takes up ${g.name}, and hangs it with the rest.`
      : `${cap(tmpl.name)} snatches up ${g.name} and drags it off into the dark.`, undefined, false);
    z.roomSound(creature.roomId, hoarder
      ? "Something is added to a great deal of something else {dir}, and the whole load resettles."
      : "Metal scrapes over stone {dir}, dragged away.");
    z.refreshRoomCtx(creature.roomId);
  }

  // THE RAVEN'S NEST. An idle corvid alone in a room with unguarded spoils
  // (gear dropped where somebody fell, and not the free rock or the room's own
  // regrowing stock) takes ONE piece and bears it to its nest — one of the
  // THREE fixed pools (RAVEN_NEST_ROOMS), chosen as the nearest to its own
  // ground. The piece lands in the pool the moment it is taken (the flight is
  // flavour; the pool is where it ends up), hidden off the floor, never on the
  // bird and never takeable by walking in. It never scoops while a player is
  // watching (a raven is a thief, not a mugger) and it never takes food off
  // the floor — that is what the dead are for. A pool holds up to
  // RAVEN_NEST_CAP pieces before the birds stop carrying to it. The only way
  // to get a piece out is to feed it (verbs.cmdFeed), which it does not always
  // honour — a raven does not let you root through its nest.
  // Which pool a corvid works: the nearest of the three to its own ground, so
  // the high-road ravens share one nest, the grave crows another, and nobody
  // flies across the whole world for a perch.
  export function ravenNestFor(z: ZoneDO, creature: Creature): string {
    let best = RAVEN_NEST_ROOMS[0], bestD = Number.POSITIVE_INFINITY;
    for (const r of RAVEN_NEST_ROOMS) {
      const d = z.roomDist(creature.home ?? creature.roomId, r);
      if (d < bestD) { bestD = d; best = r; }
    }
    return best;
  }

  export function ravenScoops(z: ZoneDO, creature: Creature): void {
    if (!RAVEN_SCOOPERS.has(creature.templateId)) return;
    const nest = ravenNestFor(z, creature);
    // AT A FULL NEST: no room to put anything, so it stops fetching.
    if ((z.nests.get(nest)?.length ?? 0) >= RAVEN_NEST_CAP) return;
    if (playerPresent(z, creature.roomId)) return; // a watched raven leaves the floor alone
    const floor = z.ground.get(creature.roomId);
    if (!floor?.length) return;
    const now = Date.now();
    const idx = floor.findIndex((id) => {
      const t = z.world!.itemTemplates.get(id);
      if (!t || t.id === "loose-rock") return false;
      if (t.slot === "" || t.edible) return false; // trophies and meals stay — the raven takes useful things
      if (z.world!.groundSpawns.some((g) => g.room_id === creature.roomId && g.item_id === id)) return false; // not the room's own stock
      const fell = z.groundFreshAt.get(`${id}@${creature.roomId}`);
      if (fell !== undefined) {
        if (now - fell < SCOOP_GRACE_MS) return false; // the kill site is hot
        z.groundFreshAt.delete(`${id}@${creature.roomId}`);
      }
      return true;
    });
    if (idx === -1) return;
    const targetId = floor[idx];
    floor.splice(idx, 1);
    z.ground.set(creature.roomId, floor);
    z.groundLore.delete(`${targetId}@${creature.roomId}`); // a taken engraving goes silent, like the hyena's
    // Straight into the pool: the piece is home the moment it is taken.
    const pool = z.nests.get(nest) ?? [];
    pool.push(targetId);
    z.nests.set(nest, pool);
    const g = z.world!.itemTemplates.get(targetId);
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    if (g) z.roomFeed(creature.roomId, `${cap(tmpl.name)} alights, snatches up ${g.name}, and bears it away toward its nest.`, undefined, false);
    z.roomSound(creature.roomId, "A wingbeat, {dir}, and something small being carried.");
    z.refreshRoomCtx(creature.roomId);
  }

  // The shed beat, in two flavors. Over the keep line it lets ONE piece go —
  // always the oldest thing it picked up, so its pile reads as strata and what
  // it still wears is what it took most recently.
  //
  //   AT THE DEN  — deliberate, and frequent enough that the lair silts up into
  //                 a tell: something big walks here, and it has been busy.
  //   ON THE ROAD — rare, and not a choice: a lashing gives and the piece falls
  //                 wherever it happened to be standing. This is what makes the
  //                 hoarder a CURRENT rather than a drain — it lifts loot out of
  //                 rooms that have it and leaves it in rooms that don't, so the
  //                 deep's litter keeps moving instead of pooling where it fell.
  //
  // Either way the piece lands like any other drop and obeys the stray law, so
  // neither the lair nor a corridor grows forever: the deep takes back what
  // nobody comes for.
export function hoarderSheds(z: ZoneDO, creature: Creature): void {
    if ((creature.carries?.length ?? 0) <= HOARD_KEEP) return;
    if (playerPresent(z, creature.roomId)) return; // it won't unload while watched
    const atDen = !!creature.home && creature.roomId === creature.home;
    const now = Date.now();
    // A wall-clock gate, NOT a per-beat roll: this function is called from both
    // the 2s live tick and the 30s slow clock, so odds would run 15x hot for
    // anyone standing inside the bubble. The threshold is read against wherever
    // it is right now, so walking home genuinely speeds its unloading and
    // walking out slows it, without either rate depending on who is watching.
    if (creature.lastShedAt === undefined) { creature.lastShedAt = now; return; } // fresh: start the clock, don't shed on arrival
    if (now - creature.lastShedAt < (atDen ? HOARD_DEN_MS : HOARD_TRAIL_MS)) return;
    creature.lastShedAt = now;
    const shed = creature.carries!.shift()!;
    z.ground.set(creature.roomId, [...(z.ground.get(creature.roomId) ?? []), shed]);
    z.stampFresh(creature.roomId, shed);
    z.armStrayDecay(creature.roomId);
    const g = z.world!.itemTemplates.get(shed);
    const tmpl = z.world!.mobTemplates.get(creature.templateId)!;
    if (g) {
      z.roomFeed(creature.roomId, atDen
        ? `${cap(tmpl.name)} works ${g.name} loose and lets it fall on the pile.`
        : `A lashing gives somewhere in the load, and ${g.name} drops from ${tmpl.name} into the dark.`,
        undefined, false);
    }
    z.roomSound(creature.roomId, atDen
      ? "Something is set down {dir}, onto a heap of other things."
      : "Something falls and rings on stone {dir}, and whatever dropped it walks on.");
    z.refreshRoomCtx(creature.roomId);
  }

  // THE HOARDER GOES THE OTHER WAY (rome, 2026-08-01: "when he hears noise he
  // runs away from it"). Everything else in the deep comes to LOOK at a noise —
  // creatureNoise makes the idle curious and walks them toward it. This one
  // wants no part of whatever is making that sound: it marks the room and
  // shuffles off, and keeps clear of it for HOARD_SPOOK_MS.
  //
  // Two useful things fall out of that for free. It never joins a fight it
  // could not win anyway (2-4 damage), so hunting it stays a decision rather
  // than an ambush. And because it flees noise, the loot it scatters drifts
  // AWAY from wherever the fighting is — you find its leavings in the quiet
  // parts of the deep, which is exactly where nobody was looking.
  //
  // Handles both the room it's standing in and the rooms next door: a thing
  // that fled the racket next door but stood in the racket itself would read as
  // deaf. Its den stays exempt from the shunning by the ordinary avoids law —
  // everything may always go home.
// WHAT RUNS FROM A NOISE, RATHER THAN TOWARD IT (was hoardersSpook; widened to
// the RUNNERS 2026-08-02 — rome: "why is a deer jumping in fights? they should
// be running away when they hear noise").
//
// The hoarder already had this exactly right and it was written for one
// creature. A deer and a hoarder want the same thing from a din two rooms away:
// to be somewhere else. So a runner now marks the source as a room to AVOID and
// moves off soon, instead of being one of the "good majority" whose ears prick
// up in creatureNoise.
export function spookFromNoise(z: ZoneDO, sourceRoomId: string, now: number): void {
    const world = z.world;
    if (!world) return;
    for (const c of z.creatures.values()) {
      if (!(HOARDERS.has(c.templateId) || RUNNERS.has(c.templateId)) || c.target) continue;
      const here = c.roomId === sourceRoomId;
      const adjacent = !here && (world.exits.get(c.roomId) ?? []).some(
        (e) => e.to_room === sourceRoomId && (!e.key_item || z.openDoors.has(`${c.roomId}:${e.dir}`)),
      );
      if (!here && !adjacent) continue;
      c.avoids = [
        ...(c.avoids ?? []).filter((a) => a.until > now && a.roomId !== sourceRoomId),
        { roomId: sourceRoomId, until: now + HOARD_SPOOK_MS },
      ];
      c.eyeing = undefined; // whatever it was nosing at, it isn't finishing that now
      c.eyeingAt = undefined;
      c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 6000));
    }
  }

  // The dead stay dead — but the dungeon refills. When a population is below
  // its cap, a migrant is already on its way; it arrives here.
// Where a creature of this line should wake. Normally its den — one of the
// rooms the spawn table gave it. For a ROAMING_DENS line the den is re-rolled
// across the whole band instead, so the road never has fixed addresses. Falls
// back to the given room if the band somehow yields nothing.
export function rollDen(z: ZoneDO, templateId: string, fallback: string): string {
  const world = z.world!;
  // THE SANCTUARY LAW, APPLIED AT THE DOOR (2026-08-20). A spawn row whose
  // home is a hideaway (is_safe) never gets its creature there — the world's
  // promise is that nothing lives in the boltholes, and the seeder used to
  // trust the table blindly. That let invisible rooted lurkers be seeded INTO
  // the fern pit and the under-roots (mig 250 moved the rows; this is the
  // fence so no future row can slip again). The creature wakes one room out,
  // on open ground in its own band, preferring a neighbour of the bolthole.
  if (world.safeRooms.has(fallback)) {
    const band = z.regionOf(fallback);
    const ok = (r: string) => world.rooms.has(r) && !world.safeRooms.has(r) && !world.entryRooms.has(r);
    const neighbours = (world.exits.get(fallback) ?? []).map((e) => e.to_room).filter(ok);
    const sameBand = neighbours.filter((r) => z.regionOf(r) === band);
    const pick = (sameBand.length ? sameBand : neighbours);
    if (pick.length) return pick[randInt(0, pick.length - 1)];
    const anywhere = [...world.rooms.keys()].filter((r) => ok(r) && z.regionOf(r) === band);
    if (anywhere.length) return anywhere[randInt(0, anywhere.length - 1)];
  }
  if (!ROAMING_DENS.has(templateId)) return fallback;
  const bands = new Set(
    world.mobSpawns.filter((s) => s.template_id === templateId).map((s) => z.regionOf(s.room_id)),
  );
  const pool = [...world.rooms.keys()].filter((r) =>
    bands.has(z.regionOf(r)) && !world.entryRooms.has(r) && !world.safeRooms.has(r));
  return pool.length ? pool[randInt(0, pool.length - 1)] : fallback;
}

export function scheduleArrivals(z: ZoneDO, now: number): void {
    const world = z.world!;
    const caps = new Map<string, number>();
    for (const spawn of world.mobSpawns) {
      caps.set(spawn.template_id, (caps.get(spawn.template_id) ?? 0) + 1);
    }
    // A variant counts against its bloodline's cap: a den holding a dire
    // hyena is a hyena den held, not a hyena short (or the world would refill
    // around every promotion and swell past its caps).
    // ...and the same counts kept BY BAND, which is what the food web actually
    // runs on: a wolf in the wood is not fed by a crab on the shore. Both are
    // built here, once, off data already in hand — no extra reads.
    const capsBand = new Map<string, Map<string, number>>();
    for (const spawn of world.mobSpawns) {
      const band = z.regionOf(spawn.room_id);
      let m = capsBand.get(spawn.template_id);
      if (!m) { m = new Map(); capsBand.set(spawn.template_id, m); }
      m.set(band, (m.get(band) ?? 0) + 1);
    }
    const aliveBand = new Map<string, Map<string, number>>();
    const alive = new Map<string, number>();
    for (const c of z.creatures.values()) {
      // A variant with its own den rows (the seeded brood-mother, the grounds'
      // fleet-rats) counts against ITS cap; only rolled promotions fold into
      // the base line. Folding everything made the designed mother invisible
      // to her own cap — the warren minted mothers forever.
      const line = caps.has(c.templateId) ? c.templateId : (z.variantBase.get(c.templateId) ?? c.templateId);
      alive.set(line, (alive.get(line) ?? 0) + 1);
      const band = z.regionOf(c.roomId);
      let m = aliveBand.get(line);
      if (!m) { m = new Map(); aliveBand.set(line, m); }
      m.set(band, (m.get(band) ?? 0) + 1);
    }
    for (const [templateId, cap_] of caps) {
      // How many dens of this line are standing empty. A pending arrival has not
      // landed yet, so its den is still one of them — it is the one with a clock
      // on it, and the others are what that clock is racing.
      const short = cap_ - (alive.get(templateId) ?? 0);
      if (short > 0) {
        const tmpl = world.mobTemplates.get(templateId)!;
        // Fodder refills faster the busier the zone; the boss keeps its clock.
        const factor = tmpl.is_boss
          ? MIGRATION_FACTOR
          : Math.max(MIGRATION_MIN_FACTOR, MIGRATION_FACTOR / Math.max(1, z.sessions.size));
        // ...and then the food web has its say: how long this den stays empty
        // depends on what is left to breed, or what is left to eat.
        //
        // EVERY EMPTY DEN RUNS ITS OWN CLOCK (rome, 2026-08-17: three days with
        // no deer in the wood). This map keeps ONE pending arrival per line, and
        // the wait was the wait for a SINGLE den — so thirty-five empty deer dens
        // refilled no faster than one did. A line cut to the bone was therefore
        // slowest to come back in the arithmetic AND queued single-file on top of
        // it: 300s * factor 10 * drag 3.92 is one deer every three hours and a
        // quarter, against a fed pack that takes each arrival as it walks in. The
        // wolves were doing exactly what they were built to do; the recovery side
        // was a trickle with a bottleneck in it.
        //
        // Each empty den pulls the wait DOWN, because they are filling at the
        // same time rather than in a queue. One pending arrival at a time still
        // holds: the queue is walked one fire at a time and re-measured after
        // each, so the shape of the recovery is in this divisor.
        //
        // THE DIVISOR IS THE ROOT OF THE SHORTFALL, NOT THE SHORTFALL (rome,
        // 2026-08-17, two hours after the first version went out and the wood was
        // already full of deer). Dividing by `short` outright treats thirty-five
        // empty dens as thirty-five independent clocks, which is arithmetically
        // the honest reading of "each den has its own timer" and is a faucet in
        // practice: a head every 5.6 minutes off the floor, the whole herd back
        // inside six hours. Nothing in a wood breeds like that, and worse, the two
        // sides of the web stopped being able to oscillate — deer filled in 6h and
        // the wolves needed 8.6h AFTER the deer were standing, so the system
        // slammed to prey-max and parked instead of swinging.
        //
        // The root keeps the principle — a gutted line still comes back faster
        // than a nearly-full one, which is the whole fix — and gives overhunting
        // the long tail the ecology has always claimed to have:
        //
        //     deer, cap 36:   first head 33 min · half back in 9h · full in 18h
        //     wolves, cap 19: first head 91 min · full in 24h
        //
        // A hunted-out wood is now most of a day of consequence rather than an
        // afternoon, and the wolves are close enough behind the deer that the loop
        // can actually turn over. Single-den lines and every boss are untouched:
        // `short` is 1 for them and so is its root.
        //
        // A PENDING TIMER IS RE-MEASURED, NEVER JUST LEFT (rome, 2026-08-17, an
        // hour after the change above went live and the wood still held one deer).
        // This map is PERSISTED, and the old guard skipped any line that already
        // had a timer — so a wait banked under the previous arithmetic survived
        // the deploy and the new arithmetic did not apply until it expired, which
        // for the deer was up to another three and a quarter hours. A shipped
        // change to the refill law that takes effect at some unknowable later
        // hour is not a shipped change.
        //
        // So the wait is recomputed against the world as it stands, and a timer
        // is pulled IN when the current reading is shorter. Only ever inward:
        // recomputing in both directions every beat would push the deadline
        // away as fast as it approached and nothing would ever arrive. That
        // makes this self-healing for the cases that matter — a retune, a long
        // offline stretch, a den emptied since the clock was set — and it can
        // only ever err toward the world refilling, never toward it stalling.
        const drag = ecologyDrag(z, templateId, caps, alive, capsBand, aliveBand);
        const wait = (tmpl.respawn_secs * 1000 * factor * drag) / Math.sqrt(short);
        const pending = z.arrivals.get(templateId);
        if (pending === undefined || pending > now + wait) z.arrivals.set(templateId, now + wait);
      }
    }
  }

/**
 * How much longer an empty den takes to fill, given the state of the food web.
 * 1 = no drag (a healthy line refilling normally); ECO_SLOWEST = the hardest
 * case. Never returns Infinity — a line can be driven down to a trickle but
 * never to nothing, which is the safety rail on a system that runs for days
 * unattended in the offline sim.
 */
function ecologyDrag(
  z: ZoneDO, templateId: string, caps: Map<string, number>, alive: Map<string, number>,
  capsBand: Map<string, Map<string, number>>, aliveBand: Map<string, Map<string, number>>,
): number {
  if (!ECO_LINES.has(templateId) || HOLLOW.has(templateId)) return 1;
  const share = (line: string): number => {
    const cap = caps.get(line) ?? 0;
    return cap > 0 ? Math.min(1, (alive.get(line) ?? 0) / cap) : 1;
  };
  // A PREDATOR refills on what there is to eat: the standing stock of
  // everything it hunts, as a share of what this world can hold. No prey, no
  // wolves — they come back behind the game, not ahead of it.
  //
  // ON THE GROUND IT IS ACTUALLY STANDING ON (rome, 2026-08-15: the world was
  // down to one deer and the wolves would not let up). The rule was right and
  // the arithmetic was global, which quietly cancelled it. A grey wolf hunts
  // roe-deer, otter, hyena, and — because MIGRANTS lets it drift to the shore
  // and the migration gate will not send an animal where nothing can feed it —
  // wrack-crab, devil-crab and oystercatcher. Legitimate food, every one.
  //
  // But all nineteen wolves live in the WOOD, and migration fires under once an
  // hour across the entire world, so in practice not one of them is ever on the
  // beach. The old sum credited every wolf everywhere with all 22 head of shore
  // animals regardless: with the deer wiped to one, the wood's wolves still read
  // 38 of 73 head standing and refilled at drag 2.44 — barely half the penalty
  // they had earned — while the deer sat at 3.92 and got taken faster than they
  // could breed. The crabs were feeding the wolves on paper and the wood paid
  // for it.
  //
  // So the basket is now drawn from the bands the LIVING predators occupy. A
  // wolf that really does drift to the Crossing counts crabs, correctly, from
  // the moment it stands there; the ones in the wood count deer, and when the
  // deer are gone they stop coming back. Migration is untouched.
  const prey = PREYS_ON.get(templateId);
  if (prey?.size) {
    // Where this line actually is. With none alive, fall back to the ground it
    // is seeded on — a wiped-out predator is judged on its home range, not on
    // an empty set (which would read as "nowhere", and feed it nothing).
    const here = new Set<string>(aliveBand.get(templateId)?.keys() ?? []);
    if (!here.size) for (const b of capsBand.get(templateId)?.keys() ?? []) here.add(b);
    let held = 0, room = 0;
    for (const line of prey) {
      const lineCaps = capsBand.get(line);
      if (!lineCaps) continue;
      const lineAlive = aliveBand.get(line);
      for (const band of here) {
        const cap = lineCaps.get(band) ?? 0;
        if (!cap) continue;
        room += cap;
        held += Math.min(cap, lineAlive?.get(band) ?? 0);
      }
    }
    if (room > 0) return 1 + (1 - held / room) * (ECO_SLOWEST - 1);
    // Its own ground holds nothing it eats: the slowest refill there is. Capped,
    // never stopped — the line still trickles back, which is the standing rail
    // that keeps the offline sim from emptying a band for good.
    if (here.size) return ECO_SLOWEST;
  }
  // PREY breeds from what survived. A line cut to the bone is slow to come
  // back; one barely touched refills at its own pace. This is what gives
  // overhunting a tail longer than the afternoon that caused it.
  return 1 + (1 - share(templateId)) * (ECO_SLOWEST - 1);
}

export function applyArrivals(z: ZoneDO, now: number, silent: boolean): void {
    const world = z.world!;
    // The ceiling, and what is standing under it — see the guard in the loop.
    // Built once and only when something is actually due, so a tick with no
    // arrival pays nothing for this.
    let capOf: Map<string, number> | null = null;
    let standing: Map<string, number> | null = null;
    const tallies = (): void => {
      if (capOf) return;
      capOf = new Map();
      for (const s of world.mobSpawns) capOf.set(s.template_id, (capOf.get(s.template_id) ?? 0) + 1);
      standing = new Map();
      for (const c of z.creatures.values()) {
        const line = capOf.has(c.templateId) ? c.templateId : (z.variantBase.get(c.templateId) ?? c.templateId);
        standing.set(line, (standing.get(line) ?? 0) + 1);
      }
    };
    for (const [templateId, at] of z.arrivals) {
      if (at > now) continue;
      z.arrivals.delete(templateId);
      const baseTmpl = world.mobTemplates.get(templateId);
      if (!baseTmpl) continue;
      // THE CEILING IS CHECKED WHERE THE BODY IS MADE (rome, 2026-08-17, eleven
      // "something heavy settles back onto ground it has always kept" in a row).
      // This is the only place in the game that mints a creature, and it trusted
      // the timer absolutely: due means spawn, whatever is already standing.
      // scheduleArrivals guards the SCHEDULING side and nothing guarded this one,
      // so any path that ever put a second timer on a line — a double schedule, a
      // stale timer persisted through a deploy, a re-entrant tick — minted a real
      // extra body, and for a cap-of-one boss that is a second Woodward and a
      // second announcement to the whole surface.
      //
      // Counted the same way scheduleArrivals counts, which is the point: a
      // variant with its own spawn rows is its own line, and a rolled promotion
      // folds into the base. Anything else would let a promoted body slip the cap
      // it was promoted out of. The load-time cull (creatureCull) has always
      // repaired an over-cap world on the next wake; this stops it happening.
      //
      // The two tallies are built ONCE per call, above the loop, and not per
      // arrival — this is the DO's tick thread, and a nested walk of every
      // creature against every spawn row is exactly the shape of thing that
      // stalls a single-threaded world.
      tallies();
      if ((standing!.get(templateId) ?? 0) >= (capOf!.get(templateId) ?? 0)) continue;
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
      let home = homes[randInt(0, Math.max(0, homes.length - 1))] ?? world.entryRoom;
      // A roaming line ignores its den rows entirely and takes fresh ground.
      home = rollDen(z, baseTmpl.id, home);
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
      if (!tmpl.is_boss && !BROODERS.has(tmpl.id) && !DROWNERS.has(tmpl.id) && !SENTINELS.has(tmpl.id) && !ROOTED.has(tmpl.id)) {
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
      standing!.set(templateId, (standing!.get(templateId) ?? 0) + 1); // this call's own tally stays true
      if (tmpl.is_boss) {
        // What lives behind the black door has reformed — and the door knows.
        for (const [rid, exits] of world.exits) {
          for (const e of exits) {
            if (e.to_room === roomId && e.key_item) z.openDoors.delete(`${rid}:${e.dir}`);
          }
        }
        // The black door is a fortress thing; the wood's keeper reforming under
        // the trees is not something the deep announces (see roomFeedBands).
        if (!silent) {
          const bands = SURFACE_BANDS.has(z.regionOf(roomId)) ? SURFACE_BANDS : FORTRESS_BANDS;
          z.roomFeedBands(bands, SURFACE_BANDS.has(z.regionOf(roomId))
            ? "Out west, something heavy settles back onto ground it has always kept."
            : "Deep below, iron grinds shut. Something remembers its shape.");
        }
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

  // ---------------------------------------------------------------------------
  // THE SUMMIT (mig 236/237). The three things the drake does that no row in a
  // table could express. Called once per creature beat from the tick, BEFORE the
  // ordinary round, and it returns true when it has spent the beat — a drawn
  // breath and a body in the air are both things that happen INSTEAD of a swing,
  // not as well as one.
  //
  // Everything here is arranged so the player is never hit by something they
  // were not told about first: the breath is announced a full beat and a half
  // ahead, in the room and to every person in it, and the room has one exit.
export async function drakeBeat(z: ZoneDO, creature: Creature, tmpl: MobTemplate, now: number): Promise<boolean> {
    // SUMMIT_BOSSES, not SUMMIT_BOSS: the pale drake (mig 247) is a second
    // individual on the same summit and it gets the arc, the breath and the air
    // or it is not a drake at all.
    if (!SUMMIT_BOSSES.has(creature.templateId)) return false;

    // ---- the breath lands ----
    if (creature.breathAt !== undefined && now >= creature.breathAt) {
      creature.breathAt = undefined;
      creature.nextBreathAt = now + DRAKE_BREATH_EVERY_MS;
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} lets it go, and the whole bowl of the summit goes white.`);
      z.roomSound(creature.roomId, "A sound like a sail taking wind, very large, {dir}.");
      for (const s of [...z.sessions.values()]) {
        if (s.roomId !== creature.roomId || s.hp <= 0 || !z.reachable(s)) continue;
        // ARMOR THINS IT AND NOTHING STOPS IT. Heat, not a curse — so the same
        // mitigation every blow gets (armor, the defender's stance, and the
        // drake's own wounded state — a near-dead animal breathes weak), and
        // then it is on you. Deliberately NOT gated on canLandBlow: the dogpile
        // cap exists so a crowd cannot be executed by a press of bodies, and
        // this is one event from one animal that does not care how many of you
        // there are. The telegraph is the fairness, not the cap.
        const raw = randInt(DRAKE_BREATH_MIN, DRAKE_BREATH_MAX);
        const hurtDrake = creature.hp < tmpl.max_hp * WOUNDED_FRACTION;
        const dmg = Math.max(1, Math.round(
          Math.round(raw * ARMOR_K / (z.equippedArmor(s) + ARMOR_K))
          * STANCE[s.stance].def * (hurtDrake ? WOUNDED_DMG_MULT : 1)));
        s.hp -= dmg;
        z.send(s, `The heat comes over you for ${dmg}. There was nowhere in this room to be. [${Math.max(0, s.hp)}/${s.maxHp} hp]`, "dmgin big");
        z.sendStatus(s);
        if (s.hp <= 0) await z.onPlayerDeath(s, tmpl);
      }
      z.refreshRoomCtx(creature.roomId);
      return true;
    }

    // ---- it is holding one ----
    // A drawn breath COSTS IT THE BEAT. That is the trade the wind-up is: for
    // one and a half beats it is not swinging at anybody, which is the window
    // you either spend running for the west door or spend hitting it for free.
    // Sits above the air deliberately — without it the fall-through would let
    // the animal launch mid-draw, and (worse) take an ordinary swing while the
    // room had been told it was busy drawing.
    if (creature.breathAt !== undefined) return true;

    // ---- the air ----
    // ORDER MATTERS HERE, and it is the one thing in this function that was
    // wrong first time: the breath used to be tested before the air, so a drawn
    // breath could start while the animal was already up, the hold-branch would
    // eat the beats, and the airborne window would expire unnoticed — three
    // beats off the ground delivering ONE dive instead of three. Traced on the
    // state machine before it ever ran live. The air is the more exclusive
    // state, so the air is asked first, and it does not breathe from up there.
    if (creature.airborneUntil !== undefined && now < creature.airborneUntil) {
      // It is up. It takes somebody on the way through and there is nothing to
      // swing at — see the melee refusal in zone.ts, and the throw that still
      // reaches it, which is the whole answer to this window.
      const here = [...z.sessions.values()].filter((s) => s.roomId === creature.roomId && s.hp > 0 && z.reachable(s));
      if (!here.length) return true; // everyone left or died under it — it is circling an empty bowl
      const mark = here[randInt(0, here.length - 1)];
      const raw = randInt(DRAKE_DIVE_MIN, DRAKE_DIVE_MAX);
      // Same pipeline as the breath: armor, stance, and the wounded drake.
      const hurtDrake = creature.hp < tmpl.max_hp * WOUNDED_FRACTION;
      const dmg = Math.max(1, Math.round(
        Math.round(raw * ARMOR_K / (z.equippedArmor(mark) + ARMOR_K))
        * STANCE[mark.stance].def * (hurtDrake ? WOUNDED_DMG_MULT : 1)));
      mark.hp -= dmg;
      z.send(mark, `It comes through low and you are on the ground before you hear it, for ${dmg}. [${Math.max(0, mark.hp)}/${mark.maxHp} hp]`, "dmgin big");
      z.sendStatus(mark);
      if (mark.hp <= 0) await z.onPlayerDeath(mark, tmpl);
      return true;
    }
    if (creature.airborneUntil !== undefined) {
      creature.airborneUntil = undefined;
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} comes down on the rock hard enough to feel through your boots, and turns round.`);
      z.refreshRoomCtx(creature.roomId);
      return true;
    }
    if (creature.hp <= tmpl.max_hp * DRAKE_AIR_AT && now >= (creature.nextAirAt ?? 0) && creature.target) {
      creature.airborneUntil = now + DRAKE_AIR_MS;
      creature.nextAirAt = now + DRAKE_AIR_EVERY_MS;
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} opens out and goes up, and takes the light with it. Nothing you are holding reaches it now.`);
      z.creatureNoise(creature.roomId);
      return true;
    }

    // ---- it draws ----
    if (creature.breathAt === undefined && (creature.phase ?? 0) >= 1
        && now >= (creature.nextBreathAt ?? 0) && creature.target) {
      creature.breathAt = now + DRAKE_WINDUP_MS;
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} plants its feet, and draws a breath that goes on far too long. (the way out is west)`);
      z.creatureNoise(creature.roomId);
      return true;
    }
    return false;
  }

  /** Is the summit's animal off the ground right now? Nothing swung reaches it. */
export function airborne(creature: Creature, now = Date.now()): boolean {
    return creature.airborneUntil !== undefined && now < creature.airborneUntil;
  }

  // The King does not mind that you came — until you make him stand.
export function bossPhase(z: ZoneDO, creature: Creature, tmpl: MobTemplate, foe: Session): void {
    const ratio = creature.hp / tmpl.max_hp;
    const newPhase = ratio <= 1 / 3 ? 2 : ratio <= 2 / 3 ? 1 : 0;
    if (newPhase <= (creature.phase ?? 0)) return;
    creature.phase = newPhase;
    // THE THEATRE BELOW IS THE KING'S, AND ONLY THE KING'S (found 2026-08-19,
    // building the summit). This function is called for EVERY is_boss — so the
    // woodward, out in his wood, has been announcing that he "rises from the
    // throne" and then calling a RAT out of "the dark beneath the throne", and
    // so have the keeper, the ferryman and the marrow king. The phase itself is
    // general and correct (it is what makes a boss hit harder as it goes down,
    // dmg + phase*3 in the round); the words and the summon were written for one
    // room in the fortress and never gated.
    //
    // Gated now. Anything without its own script climbs the phase silently,
    // which is the right default — a thing getting worse is already legible in
    // the damage — and the two that DO have a script say their own.
    if (SUMMIT_BOSSES.has(creature.templateId)) {
      if (newPhase === 1) {
        z.roomFeed(creature.roomId, `${cap(tmpl.name)} gets its feet under it properly for the first time, and the size of it changes.`);
        z.creatureNoise(creature.roomId);
      } else {
        z.roomFeed(creature.roomId, `${cap(tmpl.name)} is bleeding onto its own doorstep, and it has stopped being careful.`);
        z.roomSound(creature.roomId, "Something very large is being hurt {dir}, and is angry about it.");
        z.creatureNoise(creature.roomId);
      }
      return;
    }
    if (creature.templateId !== "forgotten-king") return; // phase climbs; the words stay in the throne room
    if (newPhase === 1) {
      z.roomFeed(creature.roomId, `${cap(tmpl.name)} rises from the throne. The dark rises with him.`);
      z.send(foe, `${cap(tmpl.name)} rises from the throne. The dark rises with him.`);
      z.roomSound(creature.roomId, "Stone scrapes {dir}; something vast has stood up.");
      z.creatureNoise(creature.roomId);
    } else {
      z.roomFeedBands(FORTRESS_BANDS, `A voice rolls through the stone: ${cap(tmpl.name)} calls — and the dark answers.`);
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
// Who is on the hunger clock at all — ONE predicate, because the three places
// that advance hunger (catchUp, slowEcology, the live tick) had already drifted
// apart: the CORRODERS exemption added 2026-07-26 only ever landed in
// slowEcology, so a verdigris-thing kept getting hungry on the other two paths.
//
//   HOLLOW    — nothing inside to feed.
//   CORRODERS — want your gear, not your blood; no food source at all.
//   DROWNERS  — sessile ambushers (they hold their water and never move), with
//               no prey map. Hunger reaches "restless" in 25 MINUTES, and the
//               only supplier a corpse system could give them is the carrion
//               mint: one body per ~10h across 43 deep rooms, so a given
//               drowned thing would eat about once every 18 days. That gap is
//               unclosable by tuning, and hunger does nothing for them anyway —
//               they're already excluded from starvingHunts ("drowners take the
//               water", they keep their own aggro). It only ever printed a
//               "restless with hunger" line that was a lie. (rome, 2026-07-31.)
//   HOARDERS  — it collects; it doesn't eat. Its whole drive is the floor, not
//               the corpse on it, and it has no feeding path of any kind — the
//               same trap the drowners were in. Keep it off the clock rather
//               than give it a mouth with nothing to put in it.
export function hungers(templateId: string): boolean {
  // A CREATURE THE SIM GIVES NO WAY TO EAT MUST NOT DISPLAY HUNGER (rome,
  // 2026-08-08, reading "A root-thing is here, restless with hunger"). The rule
  // was already here for the drowners and the rest; the wood's non-eaters were
  // simply never added, so seven of its thirteen banked hunger to the cap and
  // sat there advertising it. Note the callers all do `else hunger = 0`, so
  // adding a line here CLEARS what the old rules already banked — the live
  // world repairs itself on the next tick with no reseed.
  //
  // ROOTED is earth and root and does not eat (the root-thing already has
  // bleed 0 — nothing in it pumps). PROVISIONED are men with camps and larders.
  // Anything with a real feeding route — graze, corpse, prey, or you — is not
  // on this list and hungers exactly as it always did.
  return !HOLLOW.has(templateId) && !CORRODERS.has(templateId) && !DROWNERS.has(templateId)
    && !HOARDERS.has(templateId) && !ROOTED.has(templateId) && !PROVISIONED.has(templateId);
}

export function creaturesIn(z: ZoneDO, roomId: string): number {
    let n = 0;
    for (const c of z.creatures.values()) if (c.roomId === roomId) n++;
    return n;
  }

// Lurkers only — the crowd rule for an ambush (see LURKER_CROWD). Counting
// every creature would read a room full of RATS as crowded, which is the one
// place a hungry stalker most wants to be.
export function lurkersIn(z: ZoneDO, roomId: string, exceptId: string): number {
    let n = 0;
    for (const c of z.creatures.values()) {
      if (c.id !== exceptId && c.roomId === roomId && LURKERS.has(c.templateId)) n++;
    }
    return n;
  }
