// Room events — the world's weather. The law, for every event this file will
// ever hold: TELEGRAPH -> ACTIVE -> AFTERMATH, nothing hits a player the world
// didn't announce; an active event is a bundle of toggles on rules that
// already exist; creatures are citizens of the weather (moved through verbs
// they already have) and are, as often as possible, the telegraph themselves.
// Events may BIAS each other, never trigger each other.
//
// THE CLOCKS (rome's law, 2026-07-11 — the game is a simulation): two tracks.
// The BELL is scheduled: a keep rings its bell at its own hours, twice a day,
// and a player can learn them. Everything else is ROLLED: one die every few
// hours picks ONE event from the pool — four to six a day, never a schedule.
// An arc that isn't mid-run parks at NEVER; only the roll starts one.
import type { ZoneDO } from "./zone";
import type { Session, EventState } from "./zone-types";
import { pick, randInt, uuid, chance } from "./rng";
import * as den from "./den";
import {
  OUTDOOR_ROOMS, WARRENS_ROOMS, TRACE_LIFE_MS, FISHING_SURFACE, HOLLOW,
  ROLL_EVERY_MIN_MS, ROLL_EVERY_MAX_MS, ROLL_FIRST_MIN_MS, ROLL_FIRST_MAX_MS,
  ROLL_GRACE_MS, ROLL_MISSED_MIN_MS, ROLL_MISSED_MAX_MS,
  RAIN_TELEGRAPH_MS, RAIN_AFTERMATH_MS, RAIN_SETTLED_ODDS, RAIN_SETTLED_AFTERMATH_MULT,
  RAIN_SHOWER_MIN_MS, RAIN_SHOWER_MAX_MS, RAIN_SETTLED_MIN_MS, RAIN_SETTLED_MAX_MS,
  BELL_HOURS_UTC, BELL_JITTER_MS, BELL_GRACE_MS,
  BELL_TELEGRAPH_MS, BELL_ACTIVE_MS, BELL_AFTERMATH_MS, BELL_AFTERMATH_WAKE_MULT,
  BOIL_TELEGRAPH_MS, BOIL_STEP_MS, BOIL_AFTERMATH_MS, BOIL_BITE,
  WAKE_TELEGRAPH_MS, WAKE_ACTIVE_MS, WAKE_AFTERMATH_MS, WAKE_FRESH_MS, WAKE_CAP,
  WANT_TABLE, WANT_MULT, WANT_TELEGRAPH_MS, WANT_ACTIVE_MS, WANT_AFTERMATH_MS,
  ESCAPE_TMPL, ESCAPE_TELEGRAPH_MS, ESCAPE_ACTIVE_MS, ESCAPE_AFTERMATH_MS,
  ESCAPE_STRIDE_MIN_MS, ESCAPE_STRIDE_MAX_MS, ESCAPE_ROUSE_MS,
  LIGHTS_ROOMS, LIGHTS_TELEGRAPH_MS, LIGHTS_ACTIVE_MS, LIGHTS_AFTERMATH_MS,
  LIGHTS_STEP_MIN_MS, LIGHTS_STEP_MAX_MS,
  CROWS_TELEGRAPH_MS, CROWS_ACTIVE_MS, CROWS_AFTERMATH_MS, CROWS_THROTTLE_MS,
  EXHALE_TELEGRAPH_MS, EXHALE_ACTIVE_MS, EXHALE_AFTERMATH_MS,
  SONG_TELEGRAPH_MS, SONG_ACTIVE_MS, SONG_AFTERMATH_MS, SONG_AFTER_WAKE_MULT,
  FOG_TELEGRAPH_MS, FOG_ACTIVE_MIN_MS, FOG_ACTIVE_MAX_MS, FOG_AFTERMATH_MS, FOG_WAKE_MULT,
  COLD_TELEGRAPH_MS, COLD_ACTIVE_MIN_MS, COLD_ACTIVE_MAX_MS, COLD_AFTERMATH_MS, COLD_TORCH_MULT,
  BREACH_PAIRS, BREACH_TELEGRAPH_MS, BREACH_ACTIVE_MS, BREACH_AFTERMATH_MS,
  SEA_ROOMS, SEA_INSTRUMENTS, SEA_CREST_NORMAL, SEA_CREST_SPRING, SEA_HEARD_BANDS, SEA_BITE, SEA_STATES,
  SEA_TELEGRAPH_MS, SEA_MAKE_MS, SEA_STAND_MIN_MS, SEA_STAND_MAX_MS, SEA_EBB_MS,
  TIDEWAYS_ROOMS, TIDE_LEVELS, TIDE_HIGH_ODDS,
  TIDE_EVERY_MIN_MS, TIDE_EVERY_MAX_MS, TIDE_FIRST_MIN_MS, TIDE_FIRST_MAX_MS, TIDE_GRACE_MS,
  TIDE_TELEGRAPH_MS, TIDE_STEP_MS, TIDE_CREST_MS, TIDE_AFTERMATH_MS, TIDE_SILT_ODDS,
  BROODERS, SENTINELS, DROWNERS, DEEP_ROOMS,
  GLOAM_TELEGRAPH_MS, GLOAM_STEP_MS, GLOAM_ACTIVE_MS, GLOAM_AFTERMATH_MS,
  SPATE_ROOMS, SPATE_COURSE, SPATE_INDEX, SPATE_BITE, SPATE_SWEEP_ODDS, SPATE_CARRY_ODDS,
  CARRIER_TELEGRAPH_MS, CARRIER_ACTIVE_MIN_MS, CARRIER_ACTIVE_MAX_MS, CARRIER_AFTERMATH_MS,
  CARRIER_FROM, CARRIER_TO, CARRIER_STRIDE, CARRIER_ESCORT, CARRIER_ESCORT_ROOMS, CARRIER_SATCHEL,
  SPATE_SWEEP_MIN, SPATE_SWEEP_MAX, SPATE_TELEGRAPH_MS, SPATE_ACTIVE_MIN_MS, SPATE_ACTIVE_MAX_MS, SPATE_AFTERMATH_MS,
  FORTRESS_BANDS, SURFACE_BANDS, DEEP_HEARD_BANDS, KEEP_HEARD_BANDS, FEN_HEARD_BANDS, WANT_HEARD_BANDS, GLOAM_HEARD_BANDS,
  RUT_TELEGRAPH_MS, RUT_ACTIVE_MIN_MS, RUT_ACTIVE_MAX_MS, RUT_AFTERMATH_MS,
  RUT_DEER, RUT_WOLVES, RUT_WOLF_DELAY_MS, RUT_ROAR_EVERY_MS, RUT_ROAR_ODDS,
  WALK_TELEGRAPH_MS, WALK_ACTIVE_MIN_MS, WALK_ACTIVE_MAX_MS, WALK_AFTERMATH_MS,
  WALK_STRIDE_MIN_MS, WALK_STRIDE_MAX_MS, WOODWARD_TMPL,
  QUIET_TELEGRAPH_MS, QUIET_ACTIVE_MIN_MS, QUIET_ACTIVE_MAX_MS, QUIET_AFTERMATH_MS,
  PACK_TELEGRAPH_MS, PACK_ACTIVE_MIN_MS, PACK_ACTIVE_MAX_MS, PACK_AFTERMATH_MS,
  PACK_DOGS, PACK_WOLVES, PACK_HYENAS, PACK_HEAD_ODDS, PACK_HEADS_BAD,
  PACK_HEAD, PACK_DOG, PACK_WOLF, PACK_HYENA,
  FEVER_TELEGRAPH_MS, FEVER_ACTIVE_MIN_MS, FEVER_ACTIVE_MAX_MS, FEVER_AFTERMATH_MS,
} from "./zone-data";

// An idle arc waits here until the roll (or the bell's hours) wakes it.
const NEVER = 9_000_000_000_000_000;

// The pool the roll draws from, weighted: weather stays the commonest sky,
// the loosed Gaunt the rarest. The bell is NOT here — it keeps its own hours.
// ONE ARC AT A TIME PER BAND, NOT PER WORLD (rome, 2026-08-06). The old rule
// was global: any arc mid-run anywhere blocked every other arc everywhere. That
// was right when the world WAS a fortress. It is now five bands over 408 rooms,
// and rain in the wood has nothing whatever to do with the boil in the warrens —
// a player can only ever stand in one of them. Gating globally meant the sky was
// empty almost everywhere, almost always, and adding five arcs would have made
// each one RARER.
//
// So each arc declares the ground it falls on, and the roll draws only from
// arcs whose ground is free. Same die, same cadence, same weights; the world
// simply stops pretending the wood and the deep share a sky. The weather arcs
// (rain, fog, cold, crows) claim "*" — they fall on everything outdoors, which
// includes the wood, the road and the dens, so they still lock those out and
// each other. The bell and the tide keep their own locks, as before.
const ANY = "*";
const POOL: [string, number, string][] = [
  // the sky, on everything out of doors at once
  ["rain", 3, ANY], ["fog", 2, ANY], ["cold", 2, ANY], ["crows", 2, ANY],
  // the fortress's own
  ["boil", 2, "warrens"], ["wake", 2, "warrens"],
  ["exhale", 2, "deep"], ["song", 2, "deep"],
  ["gloam", 2, "upper"], ["want", 2, "gate"],
  ["lights", 2, "road"], ["escape", 1, "deep"], ["spate", 2, "road"], ["carrier", 2, "road"],
  // THE CROSSING — 203 rooms whose whole design is a water that moves.
  ["sea", 3, "crossing"],
  // THE WOOD (mig-less, 2026-08-06) — 170 rooms that had no weather of their own
  ["rut", 2, "wood"], ["walk", 1, "wood"], ["quiet", 2, "wood"],
  // THE DEN GROUND — 60 rooms, likewise
  ["pack", 2, "den"], ["fever", 2, "den"],
  // ["breach", 1, "upper"], — PARKED (rome, 2026-07-11: "park the breech"). The
  // whole arc (tickBreach, BREACH_PAIRS, the wall prose) stays built and idle;
  // restoring it is uncommenting this ticket.
];

// Which grounds are busy right now, so the roll can skip them. An arc on ANY
// blocks every band and is blocked by every band, because that is what weather
// falling on the whole open sky actually means.
function bandsBusy(z: ZoneDO): { any: boolean; bands: Set<string> } {
  const bands = new Set<string>();
  let any = false;
  for (const [id, , band] of POOL) {
    if (phaseOf(z, id) === "idle") continue;
    if (band === ANY) any = true; else bands.add(band);
  }
  return { any, bands };
}

// ---- queries (the hooks elsewhere read these) ----

export function phaseOf(z: ZoneDO, id: string): EventState["phase"] {
  return z.events.get(id)?.phase ?? "idle";
}

// Is the rain ON this room right now? (Active phase only — the toggles hang
// off this: torch-drowning, sound-masking, bold scavengers.)
export function raining(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "rain") === "active" && OUTDOOR_ROOMS.has(roomId);
}

// The violet announcement line for a rain phase — same text tickRain
// broadcasts live, exported so describeRoom can play catch-up for anyone who
// missed it (rome, 2026-07-24: walked into rain that started before they
// arrived, never got told). Aftermath excluded on purpose: by the time
// you're there to see it, announcing "the sky opens" would be a lie.
export function rainAnnounceLine(phase: EventState["phase"]): string | undefined {
  if (phase === "telegraph") return "The light goes iron-grey. The air smells of rain coming.";
  if (phase === "active") return "The sky opens. Rain comes down in earnest, loud on stone and thorn.";
  return undefined;
}

// The sky is turning or already open — the window where the open ground's
// beasts head for cover (telegraph included: they feel it before you do).
export function rainDrives(z: ZoneDO, roomId: string): boolean {
  const p = phaseOf(z, "rain");
  return (p === "telegraph" || p === "active") && OUTDOOR_ROOMS.has(roomId);
}

// Mud underfoot: the aftermath, when a fresh print cuts deeper and stays.
export function muddy(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "rain") === "aftermath" && OUTDOOR_ROOMS.has(roomId);
}

// The keep's interior: where the bell is law. "Upper" region, under a roof,
// not den-country — the warrens don't hear it, and the deep never does.
export function keepRoom(z: ZoneDO, roomId: string): boolean {
  return z.regionOf(roomId) === "upper" && !OUTDOOR_ROOMS.has(roomId) && !WARRENS_ROOMS.has(roomId);
}

// Is the gloam ON this room right now? The one room it holds is TRUE dark —
// z.isDark ORs this in with DARK_ROOMS, so every blind rule (look, chips,
// torch prose, lurker law) applies without knowing the dark can walk.
// The room rides EventState.data: a deploy mid-drift doesn't blink it out.
/** Is the beck up over this room right now? The one read every spate rule uses. */
export function spated(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "spate") === "active" && SPATE_ROOMS.has(roomId);
}

/** ...and is it draining? The aftermath is walkable, and worth walking. */
export function silted(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "spate") === "aftermath" && SPATE_ROOMS.has(roomId);
}

export function gloamed(z: ZoneDO, roomId: string): boolean {
  const st = z.events.get("gloam");
  return !!st && st.phase === "active" && st.data === roomId;
}

// Where the gloam may stand or step: the keep's interior halls, never a gate
// room (no fresh key wakes blind), never under the sky, never a hideaway —
// the sanctuary promise ("the dungeon can't reach you") covers the dark too.
function gloamCan(z: ZoneDO, roomId: string): boolean {
  return keepRoom(z, roomId) && !z.world!.entryRooms.has(roomId) && !z.world!.safeRooms.has(roomId);
}

// While the bell rings the keep hears EVERYTHING (a bell outshouts felt
// soles); for a while after, the halls stay unsettled. ai.wakeListeners
// multiplies its odds by this.
export function bellWakeMult(z: ZoneDO, roomId: string): number {
  if (!keepRoom(z, roomId)) return 1;
  const p = phaseOf(z, "bell");
  return p === "active" ? 100 : p === "aftermath" ? BELL_AFTERMATH_WAKE_MULT : 1;
}

// The ringing drives the keep's vermin down into the earth — rat-kind bolts
// for the warrens while it lasts (ai wander bias, same shape as rainDrives).
export function bellDrivesRats(z: ZoneDO, creature: { roomId: string; templateId: string }): boolean {
  return phaseOf(z, "bell") === "active" && keepRoom(z, creature.roomId)
    && creature.templateId.includes("rat") && !BROODERS.has(creature.templateId);
}

// Where the rat-tide is RIGHT NOW (null when no boil runs). The tide itself is
// module-local — a deploy dissolves it and the warrens shrug.
let boilPath: string[] = [];
let boilIdx = -1;
let boilStepAt = 0;
export function boilRoom(z: ZoneDO): string | null {
  return phaseOf(z, "boil") === "active" && boilIdx >= 0 ? boilPath[boilIdx] ?? null : null;
}

// The keeper's want: while the chalk is on the hatch, the named good counts
// double in trade (gate.offerCore reads this at both tallies).
export function wantMult(z: ZoneDO, itemId: string): number {
  const st = z.events.get("want");
  return st?.phase === "active" && st.data === itemId ? WANT_MULT : 1;
}

// Below-ground country: where the exhale blows and the marrow-song carries.
export function deepRoom(z: ZoneDO, roomId: string): boolean {
  return z.regionOf(roomId) === "deep";
}

// Is the deep breathing out on this room? While it does, no open flame lives
// here (torches gutter and won't catch; the shuttered lantern holds).
export function exhaling(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "exhale") === "active" && deepRoom(z, roomId);
}

// A torch carried into (or caught by) the exhale: the current takes it. Same
// shape as rainSoaksTorch — the lantern is the answer both times.
export function exhaleSnuffsTorch(z: ZoneDO, session: Session): void {
  if (!exhaling(z, session.roomId)) return;
  if (session.litSource !== "torch" || !z.carriesLight(session)) return;
  session.litUntil = undefined;
  session.litSource = undefined;
  session.torchWarned = false;
  z.send(session, "The cold current leans on the flame, and takes it — the torch dies without a sound.", "dmgin");
  z.sendStatus(session);
}

// The marrow-song's hold on a hollow listener: entranced bones wake to
// NOTHING while it plays (walk right past them), and to everything for a
// while after. ai.wakeListeners multiplies per-creature odds by this.
export function songWakeMult(z: ZoneDO, creature: { roomId: string; templateId: string }): number {
  if (!deepRoom(z, creature.roomId) || !HOLLOW.has(creature.templateId)) return 1;
  const p = phaseOf(z, "song");
  return p === "active" ? 0 : p === "aftermath" ? SONG_AFTER_WAKE_MULT : 1;
}

// Is the fog on this room? (Outdoors only — it pools on the open ground.)
export function foggy(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "fog") === "active" && OUTDOOR_ROOMS.has(roomId);
}

// The fog swallows half of what would spot you (ai.wakeListeners) — and the
// other direction is fogTell: you can't read the shapes either.
export function fogWakeMult(z: ZoneDO, roomId: string): number {
  return foggy(z, roomId) ? FOG_WAKE_MULT : 1;
}

// The other half of "spot odds down both ways": in fog every creature reads
// as the same grey shape — creatureTell returns this instead of its state.
export function fogTell(z: ZoneDO, roomId: string): string | null {
  return foggy(z, roomId) ? "a grey shape in the fog — you cannot read it" : null;
}

// Is the cold on this room? It grips everything the walls don't hold warm:
// the open ground and the deep. (The keep's halls and the warrens' earth
// stay livable — cover is the answer, and the map already says where.)
export function coldBites(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "cold") === "active" && (OUTDOOR_ROOMS.has(roomId) || deepRoom(z, roomId));
}

// The cold's window (telegraph included): the living head for cover — their
// retreat IS the telegraph. The HOLLOW don't feel it; that's the free tell:
// whatever's still walking out there was never alive.
export function coldDrives(z: ZoneDO, creature: { roomId: string; templateId: string }): boolean {
  const p = phaseOf(z, "cold");
  return (p === "telegraph" || p === "active") && !HOLLOW.has(creature.templateId)
    && (OUTDOOR_ROOMS.has(creature.roomId) || deepRoom(z, creature.roomId));
}

// A torch lit while the cold bites burns half as long (light.cmdLight reads
// this); torches already burning lose half their remainder on the first beat.
// ---- the new ground's queries (the hooks elsewhere read these) ----

// THE RUT is on this room: the wood, and only while it runs.
export function rutting(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "rut") === "active" && z.world!.rooms.get(roomId)?.region === "wood";
}

// THE QUIET. Nothing wanders, and everything hears further — both ways.
export function quieted(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "quiet") === "active" && z.world!.rooms.get(roomId)?.region === "wood";
}

// THE FEVER is on this ground: the dens, and only while it runs.
export function fevered(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "fever") === "active" && z.world!.rooms.get(roomId)?.region === "den";
}

export function coldTorchMult(z: ZoneDO, roomId: string): number {
  return coldBites(z, roomId) ? COLD_TORCH_MULT : 1;
}

// ---- the tide's water table ----
// How deep a room sits in the flood order: rank 0 drowns first, -1 never
// drowns (the approach stays a road). The water stands at tideRank while the
// tide is in; a room is flooded when its rank is at or below the water.
let tideRank = -1;
let tideStepAt = 0;
export function floodRank(roomId: string): number {
  for (let i = 0; i < TIDE_LEVELS.length; i++) {
    if (TIDE_LEVELS[i].includes(roomId)) return i;
  }
  return -1;
}

export function tideFlooded(z: ZoneDO, roomId: string): boolean {
  if (phaseOf(z, "tide") !== "active" || tideRank < 0) return false;
  const r = floodRank(roomId);
  return r >= 0 && r <= tideRank;
}

// The window where everything living climbs (telegraph included — their
// flight up past you IS the warning). Drowners don't climb; it's their hour.
export function tideDrives(z: ZoneDO, creature: { roomId: string; templateId: string }): boolean {
  const p = phaseOf(z, "tide");
  return (p === "telegraph" || p === "active")
    && TIDEWAYS_ROOMS.has(creature.roomId) && !DROWNERS.has(creature.templateId);
}

// Wading into the tide with an open flame: the water takes it. Same shape as
// the rain and the exhale — the lantern survives a wade (shuttered, held high).
export function tideSoaksTorch(z: ZoneDO, session: Session): void {
  if (!tideFlooded(z, session.roomId)) return;
  if (session.litSource !== "torch" || !z.carriesLight(session)) return;
  session.litUntil = undefined;
  session.litSource = undefined;
  session.torchWarned = false;
  z.send(session, "The black water climbs past your waist and takes the torch with a slap.", "dmgin");
  z.sendStatus(session);
}

// Which wall is (or is about to be) down — null when no breach runs.
export function breachPairOf(z: ZoneDO): { a: string; aDir: string; b: string; bDir: string } | null {
  const st = z.events.get("breach");
  if (!st || st.phase === "idle" || st.data === undefined) return null;
  return BREACH_PAIRS[Number(st.data)] ?? null;
}

// The event clause for a room description — legibility first: standing in it,
// you always know what the world is doing around you.
export function skyClause(z: ZoneDO, roomId: string): string {
  if (roomId === boilRoom(z)) return " The floor is a river of rats, pouring through.";
  if (SPATE_ROOMS.has(roomId)) {
    switch (phaseOf(z, "spate")) {
      case "telegraph": return " The beck has gone brown and it is loud — much louder than it was — and it is climbing the bank while you watch.";
      case "active": return " The beck is OVER this ground, brown and fast and carrying wood, and it is pushing at your legs.";
      case "aftermath": return " The water has dropped and left everything under a skin of silt, printed all over with what the flood brought down.";
      default: break;
    }
  }
  const bp = breachPairOf(z);
  if (bp && (roomId === bp.a || roomId === bp.b)) {
    switch (phaseOf(z, "breach")) {
      case "telegraph": return " The wall here is groaning — a long grinding complaint, dust sifting from the joints.";
      case "active": return " A ragged breach stands open in the wall, dust still hanging in it.";
      case "aftermath": return " Fresh rubble chokes a raw scar in the wall, where for a while there was a way through.";
      default: break;
    }
  }
  if (keepRoom(z, roomId)) {
    const gst = z.events.get("gloam");
    if (gst && gst.data === roomId) {
      if (gst.phase === "active") return " The dark owns this room — a black no window argues with, and it moves like it means to stay.";
      if (gst.phase === "telegraph") return " The light here has gone thin and brown, like water with something in it.";
    }
    switch (phaseOf(z, "bell")) {
      case "telegraph": return " The echo of a bell-note hangs in the halls.";
      case "active": return " The bell is ringing, iron on iron; the keep is awake.";
      case "aftermath": return " The bell has stopped. The halls are listening.";
      default: return "";
    }
  }
  if (WARRENS_ROOMS.has(roomId)) {
    switch (phaseOf(z, "wake")) {
      case "telegraph": return " The hollow things have gone still, listening to something under the floor.";
      case "active": return " The dead are not staying down tonight.";
      default: return "";
    }
  }
  if (z.world!.entryRooms.has(roomId) && phaseOf(z, "want") === "active") {
    const t = z.world!.itemTemplates.get(z.events.get("want")?.data ?? "");
    if (t) return ` Chalked on the keeper's hatch: wanted tonight — ${t.name}, double in trade.`;
  }
  // THE SEA. Three tiers of information, and which one you get is a fact about
  // where you are standing rather than a difficulty setting:
  //   IN THE WATER      — you are in it, and the room says so first.
  //   AT AN INSTRUMENT  — the tide marks, the marked post, the half-tide post,
  //                       the two Partings. These give the EXACT reading, which
  //                       is the entire reason the institution put them there.
  //   ANYWHERE ELSE     — you can see the water and no more than that.
  if (SEA_ROOMS.has(roomId) || SEA_INSTRUMENTS.has(roomId)) {
    if (seaUnder(z, roomId)) {
      return " The sea is over this. The road is somewhere under your feet and you are taking it on trust.";
    }
    if (SEA_INSTRUMENTS.has(roomId)) {
      const covered = seaWillCover(z, roomId) ? " Before this tide turns, the water will be over where you are standing." : "";
      return ` The mark reads ${seaReading(z)}${covered}`;
    }
    if (seaWillCover(z, roomId)) return " Dry, for now. The weed on the stones here is not old weed.";
  }
  if (TIDEWAYS_ROOMS.has(roomId)) {
    switch (phaseOf(z, "tide")) {
      case "telegraph": return " The drips have quickened to a patter, and the water below sounds hungry.";
      case "active": return tideFlooded(z, roomId)
        ? " Black water owns this room — waist-high, cold, and moving."
        : " The tide is in: somewhere below you, rooms are drowned.";
      case "aftermath": return " Silt lies in ropes across the stone, still draining away.";
      default: break; // no tide: the wing reads like any deep room
    }
  }
  if (deepRoom(z, roomId)) {
    switch (phaseOf(z, "exhale")) {
      case "telegraph": return " The drips have stopped. Every flame leans, pulled toward the dark below.";
      case "active": return " The deep is breathing out — a cold current no open flame survives.";
      case "aftermath": return " The air has settled; somewhere, the drips are coming back.";
    }
    switch (phaseOf(z, "song")) {
      case "telegraph": return " A single held note hums up through the stone.";
      case "active": return " The bone-song fills the dark. Every hollow thing stands entranced, swaying.";
      case "aftermath": return " The song has died. The bones are remembering themselves.";
    }
    switch (phaseOf(z, "cold")) {
      case "telegraph": return " The damp is sharpening into real cold.";
      case "active": return " The cold down here has teeth. Only the dead would linger.";
      case "aftermath": return " The bitter edge is going out of the air.";
      default: return "";
    }
  }
  // THE WOOD AND THE DEN GROUND. Both bands are outdoor, so without this they
  // fall clean through the sky chain below and come out with nothing — which
  // left five arcs (the rut, the walk, the quiet, the pack, the fever) legible
  // only to whoever was standing there when the line went out. Their ambient
  // pools cover the ACTIVE phase and land at the pool's own leisure; nothing at
  // all covered the telegraph. The den ground makes that worst: the roll rarely
  // fires with anybody standing in it, so the warning usually lands on nobody.
  //
  // NO PRECEDENCE PROBLEM WITH THE SKY, which is why these sit above it rather
  // than below: an ANY arc locks every band and every band locks ANY (see
  // bandsBusy), so the rain and the rut can never both be running, and two arcs
  // of one band never overlap either. Every switch here therefore BREAKS when
  // idle rather than returning — a wood with no wood arc on it still has to be
  // told it is raining, and closing early here would silently take the weather
  // off two hundred and thirty rooms.
  //
  // Aftermath is deliberately absent from all five. Unlike the rain's mud, none
  // of them leave anything the world reads: their hooks at the top of this file
  // key on "active" alone and aftermath is only the cooldown before the arc can
  // roll again, so a clause there would describe a state that is not.
  const region = z.world!.rooms.get(roomId)?.region;
  if (region === "wood") {
    switch (phaseOf(z, "rut")) {
      case "telegraph": return " Somewhere off through the trees a stag is roaring, and being answered.";
      case "active": return " The wood is full of deer, and the stags are giving no ground.";
      default: break;
    }
    switch (phaseOf(z, "walk")) {
      case "telegraph": return " Birds are up off every ride at once, and something big is moving out from the middle of the wood.";
      case "active": return " Whatever the maze keeps in the middle of it is not in the middle of it. It is walking.";
      default: break;
    }
    switch (phaseOf(z, "quiet")) {
      case "telegraph": return " The birds have stopped — all of them, together — and the silence has an edge on it.";
      case "active": return " Nothing moves in the whole wood. Your own gear sounds louder than you would like.";
      default: break;
    }
  }
  if (region === "den") {
    switch (phaseOf(z, "pack")) {
      case "telegraph": return " Dogs out on the Waste, a long way off and getting closer, and a lot of them.";
      case "active": return " There are dogs in among the houses, working the ground in a body.";
      default: break;
    }
    // The one of the five with teeth in it: rest, food and dressings are all
    // cut to FEVER_MEND_MULT on this ground and every one of them says nothing
    // about why. Without this line a bad bandage reads as a bug.
    switch (phaseOf(z, "fever")) {
      case "telegraph": return " The wind is off the graves, warm and wrong, and this ground smells faintly of the pit.";
      case "active": return " The fever sits over the whole ground. Sleep will not take here, and nothing you eat or bind does you any good.";
      default: break;
    }
  }
  if (!OUTDOOR_ROOMS.has(roomId)) return "";
  switch (phaseOf(z, "rain")) {
    case "telegraph": return " The light has gone iron-grey, and the air smells of coming rain.";
    case "active": return " Rain hammers the open ground.";
    case "aftermath": return " The ground is churned to mud, still dripping.";
  }
  switch (phaseOf(z, "fog")) {
    case "telegraph": return " A milky haze is creeping up from the low ground.";
    case "active": return " Fog stands thick on the open ground. Everything past arm's reach is a rumor.";
    case "aftermath": return " The fog is thinning to rags.";
  }
  switch (phaseOf(z, "cold")) {
    case "telegraph": return " The air is going glass-clear and bitter.";
    case "active": return " The cold has settled in hard. Nothing living wants to be out in it.";
    case "aftermath": return " The worst of the cold is lifting.";
  }
  if (LIGHTS_ROOMS.has(roomId)) {
    switch (phaseOf(z, "lights")) {
      case "telegraph": return " The dark out over the water has gone attentive.";
      case "active": return " Pale lights stand out over the water, where nothing should be walking.";
      default: break;
    }
  }
  switch (phaseOf(z, "crows")) {
    case "telegraph": return " Crows are settling on every high thing, in numbers.";
    case "active": return " Crows crowd the sky here, watching everything that moves.";
    default: return "";
  }
}

// Ambience while the sky is doing something (zone's ambientLine reads this
// first for outdoor rooms; null falls through to the normal pools).
const RAIN_AMBIENT = [
  "Rain runs off everything that still has an edge.",
  "The downpour flattens the briars and drums on old stone.",
  "Somewhere near, water has found a new way through a wall.",
  "The rain comes harder for a breath, then settles back to its work.",
];
const MUD_AMBIENT = [
  "The mud pulls at every step.",
  "Water still drips from the thorn and the broken stone.",
];
const LIGHTS_AMBIENT = [
  "A light shows out over the water — steady, like a carried torch. It doesn't move like a man's.",
  "The light out on the water gutters, and reappears somewhere it shouldn't be.",
  "Two pale lights now, keeping pace with each other out in the dark.",
  "The light stands still out there, as if whoever carries it is watching you back.",
];
// ---- the new ground's ambience ----
const RUT_AMBIENT = [
  "A stag roars somewhere off through the trees, and something answers it much closer.",
  "Two of them are going at it in a thicket nearby — antler on antler, a sound like dry wood breaking.",
  "A roe crosses the ride ahead at a walk, and does not hurry, and does not look at you.",
  "The wood smells of them: musk and trampled bracken and something sharper under it.",
];
const RUT_WOLF_AMBIENT = [
  "Something is moving parallel to you, keeping the thicket between, matching your pace.",
  "The roaring stops for a moment, all of it at once, and then starts again further off.",
];
const WALK_AMBIENT = [
  "Every bird in this part of the wood goes up at once, and none of them come back down.",
  "A tree comes down somewhere behind you. Nothing was cutting it.",
  "The ride ahead is empty, and the ride behind is empty, and you are certain that a moment ago one of them was not.",
];
const QUIET_AMBIENT = [
  "Nothing. Not a bird, not a branch, not water. Your own breathing sounds borrowed.",
  "Your gear speaks every time you shift your weight, and there is nothing to cover it.",
  "The silence has a shape to it, and the shape is listening.",
];
const PACK_AMBIENT = [
  "Dogs somewhere among the houses — three or four of them, working out from a doorway.",
  "Something goes through the nettles at the run, low and fast, and does not come out the other side.",
  "A chorus starts up two streets over, and cuts off all together.",
];
const FEVER_AMBIENT = [
  "The air off the graves is warm and sweetish and sits at the back of your throat.",
  "Flies, in numbers, on a day with no cause for them.",
  "You are sweating, and the wind is cold, and those two things are not agreeing.",
];
const CROWS_AMBIENT = [
  "A crow turns its head, following you.",
  "Wings resettle on the stone above, unhurried.",
  "One crow calls, once, and the rest go quiet.",
];
const EXHALE_AMBIENT = [
  "The cold current moves through the room like something walking slowly past.",
  "The dark leans in. Nothing drips.",
  "Somewhere near, a draught finds a gap in the stone and moans through it, low.",
];
const SONG_AMBIENT = [
  "The held note swells for a moment, and the dust on the stone shivers with it.",
  "The bone-song turns over on itself — the same note, from more throats.",
  "Under the song, faintly: the click of teeth keeping time.",
];
const FOG_AMBIENT = [
  "Something crosses somewhere ahead — a smudge in the white, gone before it has a shape.",
  "The fog eddies, as if something passed just out of reach.",
  "Sound comes through the fog wrong — near things far, far things near.",
];
const COLD_AMBIENT = [
  "Your breath hangs in the air, and takes its time leaving.",
  "The cold works its way in at every seam.",
  "Frost is creeping white along the stone's north faces.",
];
const TIDE_FLOOD_AMBIENT = [
  "The water shoulders past you, patient and cold.",
  "Something moves through the flood without hurrying, somewhere out of the light.",
  "The current tugs at everything you carry, testing the knots.",
];
const TIDE_WING_AMBIENT = [
  "Water works through the stone below, hollow and enormous.",
  "The drips have all gone quiet — drowned under one long, low sound of water.",
];
export function eventAmbient(z: ZoneDO, roomId: string): string | null {
  if (TIDEWAYS_ROOMS.has(roomId) && phaseOf(z, "tide") === "active") {
    return tideFlooded(z, roomId) ? pick(TIDE_FLOOD_AMBIENT) : pick(TIDE_WING_AMBIENT);
  }
  if (deepRoom(z, roomId)) {
    if (phaseOf(z, "exhale") === "active") return pick(EXHALE_AMBIENT);
    if (phaseOf(z, "song") === "active") return pick(SONG_AMBIENT);
    if (phaseOf(z, "cold") === "active") return pick(COLD_AMBIENT);
    return null;
  }
  // THE NEW GROUND'S OWN WEATHER, ahead of the sky's — an arc that belongs to
  // exactly this band should speak before the general outdoor weather does,
  // or the wood would report fog while the woodward walked through it.
  const region = z.world!.rooms.get(roomId)?.region;
  if (region === "wood") {
    if (phaseOf(z, "walk") === "active") return pick(WALK_AMBIENT);
    if (phaseOf(z, "quiet") === "active") return pick(QUIET_AMBIENT);
    if (phaseOf(z, "rut") === "active") {
      return rutWolvesOut(z, Date.now()) && chance(0.3) ? pick(RUT_WOLF_AMBIENT) : pick(RUT_AMBIENT);
    }
  } else if (region === "den") {
    if (phaseOf(z, "pack") === "active") return pick(PACK_AMBIENT);
    if (phaseOf(z, "fever") === "active") return pick(FEVER_AMBIENT);
  }
  if (!OUTDOOR_ROOMS.has(roomId)) return null;
  const p = phaseOf(z, "rain");
  if (p === "active") return pick(RAIN_AMBIENT);
  if (p === "aftermath") return pick(MUD_AMBIENT);
  if (phaseOf(z, "fog") === "active") return pick(FOG_AMBIENT);
  if (phaseOf(z, "cold") === "active") return pick(COLD_AMBIENT);
  if (LIGHTS_ROOMS.has(roomId) && phaseOf(z, "lights") === "active") return pick(LIGHTS_AMBIENT);
  if (phaseOf(z, "crows") === "active") return pick(CROWS_AMBIENT);
  return null;
}

// An open flame under open rain: the torch drowns. Called on the downpour's
// first beat (sweep) and again whenever someone carries one out into it.
// The hooded lantern is the point of the trade — it does not care.
export function rainSoaksTorch(z: ZoneDO, session: Session): void {
  if (!raining(z, session.roomId)) return;
  if (session.litSource !== "torch" || !z.carriesLight(session)) return;
  session.litUntil = undefined;
  session.litSource = undefined;
  session.torchWarned = false;
  z.send(session, "The rain finds the flame and takes it — the torch dies with a hiss.", "dmgin");
  z.sendStatus(session);
}

// The crows call out whoever crosses the open ground: every player under the
// sky hears where you moved (verbs.cmdGo hooks this on arrival). Throttled so
// a sprint reads as one cry, not a siren.
const crowSeen = new Map<string, number>();
export function crowsMark(z: ZoneDO, session: Session): void {
  if (phaseOf(z, "crows") !== "active" || !OUTDOOR_ROOMS.has(session.roomId)) return;
  const now = Date.now();
  if (now < (crowSeen.get(session.pubkey) ?? 0)) return;
  crowSeen.set(session.pubkey, now + CROWS_THROTTLE_MS);
  const room = z.world!.rooms.get(session.roomId);
  if (!room) return;
  z.send(session, "Overhead, the crows lift and wheel, crying it out — you are marked.");
  for (const s of z.sessions.values()) {
    if (s === session || !OUTDOOR_ROOMS.has(s.roomId) || z.outOfWorld(s)) continue;
    z.send(s, `The crows lift and wheel over ${room.name}.`);
  }
}

// ---- the arcs ----

function feedOutdoors(z: ZoneDO, line: string): void {
  feedSky(z, (roomId) => OUTDOOR_ROOMS.has(roomId), line);
}

// THE SKY SPEAKS TO THE WATCHERS TOO. Weather can't be a band — "outdoors" cuts
// across every region there is — so it goes out per-room like any local news,
// and then once more to the feed, because a spectator is watching the world
// rather than standing in a room of it. Use this for the sky's arcs and nothing
// else: a line that is only true of one corridor has no business in the feed.
function feedSky(z: ZoneDO, inRoom: (roomId: string) => boolean, line: string): void {
  feedWhere(z, inRoom, line);
  z.feedWatchers(line);
}

// A line to everyone standing in rooms the event can reach. Every line through
// here is the WORLD speaking — the "evt" tag colors it apart from creatures
// and scenery (the omen voice, rome 2026-07-13).
function feedWhere(z: ZoneDO, inRoom: (roomId: string) => boolean, line: string): void {
  const seen = new Set<string>();
  for (const s of z.sessions.values()) {
    if (seen.has(s.roomId) || !inRoom(s.roomId)) continue;
    seen.add(s.roomId);
    z.roomFeed(s.roomId, line, undefined, false, "evt"); // events are local news
  }
}

export async function tickEvents(z: ZoneDO, now: number): Promise<void> {
  tickRoll(z, now);
  await tickRain(z, now);
  await tickBell(z, now);
  await tickBoil(z, now);
  await tickWake(z, now);
  await tickWant(z, now);
  await tickEscape(z, now);
  await tickLights(z, now);
  await tickSpate(z, now);
  await tickCarrier(z, now);
  await tickCrows(z, now);
  await tickExhale(z, now);
  await tickSong(z, now);
  await tickFog(z, now);
  await tickCold(z, now);
  await tickGloam(z, now);
  await tickBreach(z, now);
  await tickTide(z, now);
  await tickSea(z, now);
  await tickRut(z, now);
  await tickWalk(z, now);
  await tickQuiet(z, now);
  await tickPack(z, now);
  await tickFever(z, now);
  rutWolves(z, now);
  rutRoars(z, now);
}

// THE ROARING, as a thing the world can hear. Every room holding a rutting
// stag speaks, at most every RUT_ROAR_EVERY_MS: it carries to the neighbours
// like any other sound (roomSound) and it PULLS what hunts (creatureNoise), so
// the wolves converging on the deer is a consequence and not a script.
const ROAR_LINES = [
  "A stag roars {dir} — a long, cracked bellow with nothing of the deer in it.",
  "Something bellows {dir}, and is answered further off.",
  "Antlers go together {dir}, hard, like dry wood breaking.",
];
function rutRoars(z: ZoneDO, now: number): void {
  const st = z.events.get("rut");
  if (!st || st.phase !== "active") return;
  const seen = new Set<string>();
  for (const id of held(st)) {
    const c = z.creatures.get(id);
    if (!c || (c.templateId !== "roe-deer" && c.templateId !== "white-roe")) continue;
    if (seen.has(c.roomId)) continue; // one voice a room, however many stand in it
    seen.add(c.roomId);
    if ((z.rutRoarAt.get(c.roomId) ?? 0) + RUT_ROAR_EVERY_MS > now) continue;
    z.rutRoarAt.set(c.roomId, now);
    if (!chance(RUT_ROAR_ODDS)) continue;
    // `loud`: the roar is the din, so the din does not get to swallow it.
    z.roomSound(c.roomId, pick(ROAR_LINES), undefined, undefined, true);
    // It calls, and things come. The same pull a fight makes, from an animal
    // that is advertising itself on purpose — which is what a rut IS.
    z.creatureNoise(c.roomId, true);
  }
}

// ---- the new ground's arcs: three for the wood, two for the dens ----

// Which rooms a band actually owns, minus the places nothing is ever born in.
function bandRooms(z: ZoneDO, band: string): string[] {
  return [...z.world!.rooms.keys()].filter(
    (r) => z.world!.rooms.get(r)!.region === band && !z.world!.safeRooms.has(r) && !z.world!.entryRooms.has(r),
  );
}

// Put a creature on the ground, the way the escaped Gaunt is put on it.
function hatch(z: ZoneDO, templateId: string, roomId: string, now: number, stride: [number, number]): string | null {
  const tmpl = z.world!.mobTemplates.get(templateId);
  if (!tmpl) return null;
  const id = uuid();
  z.creatures.set(id, {
    id, templateId, roomId, hp: tmpl.max_hp, hunger: randInt(20, 60),
    grudges: [], nextWanderAt: now + randInt(stride[0], stride[1]), target: null,
  });
  z.refreshRoomCtx(roomId);
  return id;
}

// Take back everything an arc put down that is still standing. A creature a
// player KILLED is simply not here to clear — the world keeps that.
function recall(z: ZoneDO, ids: string[]): void {
  for (const id of ids) {
    const c = z.creatures.get(id);
    if (!c) continue;
    z.creatures.delete(id);
    for (const s of z.sessions.values()) {
      if (s.target === id) s.target = null;
      if (s.seizedBy === id) s.seizedBy = undefined;
    }
    z.refreshRoomCtx(c.roomId);
  }
}

// The ids an arc is holding, parked in its own state so a hibernation or a
// deploy cannot orphan a wolf on the ground forever.
function held(st: EventState): string[] {
  if (!st.data) return [];
  // The rut parks its wolf-due time after a pipe; everything before it is ids.
  const bar = st.data.indexOf("|");
  return (bar < 0 ? st.data : st.data.slice(0, bar)).split(",").filter(Boolean);
}
function hold(st: EventState, ids: (string | null)[]): void {
  st.data = ids.filter(Boolean).join(",");
}

// ---- THE RUT (wood) ----
// Game everywhere, stags that will not run, and the wolves in behind the noise.
async function tickRut(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("rut");
  if (!st) { st = { phase: "idle", until: NEVER }; z.events.set("rut", st); }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + RUT_TELEGRAPH_MS;
      z.roomFeedBands(new Set(["wood"]), "Somewhere off through the trees a stag roars — a sound with nothing of the deer about it — and is answered, and answered again.", "evt");
      break;
    }
    case "telegraph": {
      const rooms = bandRooms(z, "wood");
      const ids: (string | null)[] = [];
      for (let i = 0; i < RUT_DEER && rooms.length; i++) {
        ids.push(hatch(z, chance(0.15) ? "white-roe" : "roe-deer", pick(rooms), now, [20_000, 60_000]));
      }
      hold(st, ids);
      st.phase = "active";
      st.until = now + randInt(RUT_ACTIVE_MIN_MS, RUT_ACTIVE_MAX_MS);
      // The wolves are LATE on purpose. The window opens as a hunting window and
      // turns into something else while you are still in it — that gap is the
      // entire shape of this arc, and it is why the deer arrive alone.
      st.data = (st.data ?? "") + "|" + (now + RUT_WOLF_DELAY_MS);
      z.roomFeedBands(new Set(["wood"]), "The wood is full of them. Roe break across the rides in twos and threes, and the stags do not give way.", "evt");
      break;
    }
    case "active": {
      recall(z, held(st));
      st.data = undefined;
      st.phase = "aftermath";
      st.until = now + RUT_AFTERMATH_MS;
      z.roomFeedBands(new Set(["wood"]), "The roaring thins out and stops. What is left in the wood is what lives here.", "evt");
      break;
    }
    case "aftermath": { st.phase = "idle"; st.until = NEVER; break; }
  }
}

// The rut parks the wolves' due time after a pipe: "id,id,id|<when>". Once it
// is past, they are on the ground and the wood knows it.
function rutWolvesDue(st: EventState | undefined): number | null {
  const bar = st?.data?.indexOf("|") ?? -1;
  if (!st?.data || bar < 0) return null;
  const at = Number(st.data.slice(bar + 1));
  return Number.isFinite(at) ? at : null;
}
function rutWolvesOut(z: ZoneDO, now: number): boolean {
  const st = z.events.get("rut");
  if (!st || st.phase !== "active") return false;
  const due = rutWolvesDue(st);
  return due === null || now >= due; // no pipe left = they have already come in
}

// The wolves' late arrival, checked every tick while the rut runs.
function rutWolves(z: ZoneDO, now: number): void {
  const st = z.events.get("rut");
  if (!st || st.phase !== "active") return;
  const due = rutWolvesDue(st);
  if (due === null || now < due) return; // not yet, or already in
  const rooms = bandRooms(z, "wood");
  const ids = st.data!.slice(0, st.data!.indexOf("|")).split(",").filter(Boolean);
  for (let i = 0; i < RUT_WOLVES && rooms.length; i++) {
    const id = hatch(z, "grey-wolf", pick(rooms), now, [15_000, 45_000]);
    if (id) ids.push(id);
  }
  st.data = ids.join(",");
  z.roomFeedBands(new Set(["wood"]), "The roaring has been going on long enough now that other things have heard it. Somewhere west, a wolf answers a stag.", "evt");
}

// ---- THE CARRIER'S RUN (the east road) ----
// The first arc in this world that is an OPPORTUNITY rather than a hazard —
// see zone-data CARRIER_SATCHEL for why that matters. A man with a full bag
// walks the paving, the word has already gone out to everybody, and the danger
// is the road filling up behind him.
async function tickCarrier(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("carrier");
  if (!st) { st = { phase: "idle", until: NEVER }; z.events.set("carrier", st); }

  // HE KEEPS WALKING. `curious` is the world's existing drift-toward-a-room
  // machinery (the same wire the pack call and the hoarder's trail use), and it
  // clears when he arrives — so while the window is open we simply keep pointing
  // him east and keep his stride brisk. If something has him by the throat he
  // stops walking, which is the whole of the fight: he is not going to run.
  if (st.phase === "active" && st.data) {
    const carrier = z.creatures.get(st.data.split(",")[0]);
    if (carrier && !carrier.target && carrier.roomId !== CARRIER_TO) {
      carrier.walkingTo = CARRIER_TO;
      carrier.nextWanderAt = Math.min(carrier.nextWanderAt, now + randInt(CARRIER_STRIDE[0], CARRIER_STRIDE[1]));
    }
    // ARRIVING ENDS THE RUN. He walks it in about a third of the window, and a
    // carrier who has got where he was going and then stands there for another
    // quarter of an hour is not a moving target, he is a bag on a post. The
    // window is a ceiling on how long he is out, not a duration he must serve.
    if (carrier && carrier.roomId === CARRIER_TO && !carrier.target) st.until = now;
  }

  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + CARRIER_TELEGRAPH_MS;
      z.roomFeedBands(SEA_HEARD_BANDS, "Word runs the length of the roads before the man does: there is a carrier on the east paving tonight, and the bag is full.", "evt");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + randInt(CARRIER_ACTIVE_MIN_MS, CARRIER_ACTIVE_MAX_MS);
      const ids: string[] = [];
      const carrier = hatch(z, "road-carrier", CARRIER_FROM, now, CARRIER_STRIDE);
      if (!carrier) { st.phase = "idle"; st.until = NEVER; break; }
      ids.push(carrier);
      // The bag goes ON him, not in a drop table: visible before you commit.
      const c = z.creatures.get(carrier);
      if (c) { c.carries = [...CARRIER_SATCHEL]; c.walkingTo = CARRIER_TO; }
      // ...and the word reached the road's own people first.
      const posts = [...CARRIER_ESCORT_ROOMS];
      for (let i = 0; i < CARRIER_ESCORT && posts.length; i++) {
        const at = posts.splice(randInt(0, posts.length - 1), 1)[0];
        const w = hatch(z, "wayman", at, now, [20_000, 60_000]);
        if (w) ids.push(w);
      }
      st.data = ids.join(",");
      feedWhere(z, (roomId) => roomId === CARRIER_FROM, "A carrier comes through the thorn gap at a walking pace, satchel buckled, both hands free, and does not stop to talk.");
      z.roomFeedBands(SEA_HEARD_BANDS, "He is on the road. So, by now, is everybody who heard.", "evt");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + CARRIER_AFTERMATH_MS;
      const ids = (st.data ?? "").split(",").filter(Boolean);
      const carrier = z.creatures.get(ids[0]);
      // Recall takes back only what is still standing — a thing a player killed
      // is not here to clear, and the world keeps that.
      recall(z, ids);
      st.data = undefined;
      z.roomFeedBands(SEA_HEARD_BANDS, carrier
        ? "The carrier got through. Whatever was in the bag went east with him, and the road is a road again."
        : "Word comes back down the east road: the carrier did not get through, and somebody is better off tonight.", "evt");
      break;
    }
    case "aftermath": { st.phase = "idle"; st.until = NEVER; break; }
  }
}

// ---- THE SPATE (the east road) ----
// The beck rises and takes the low way. See zone-data SPATE_COURSE for the full
// reasoning; the short version is that the east road was built as three
// independent routes, and this is the thing that makes that a decision you make
// rather than a fact about the map you never notice.
async function tickSpate(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("spate");
  if (!st) { st = { phase: "idle", until: NEVER }; z.events.set("spate", st); }

  // THE WATER WORKS EVERY BEAT IT IS UP, not only on the phase changes. Cold and
  // force, and then it takes you: one room DOWNSTREAM (a lower index on the
  // course), and only ever to a room the beck actually connects to. It cannot
  // pen anybody in — every flooded room keeps its own dry exits, and the sweep
  // only moves you along a way you could have walked yourself.
  if (st.phase === "active") {
    for (const s of [...z.sessions.values()]) {
      if (!SPATE_ROOMS.has(s.roomId) || z.outOfWorld(s) || s.hp <= 0) continue;
      s.hp -= SPATE_BITE;
      if (s.hp <= 0) {
        z.send(s, "The beck takes your feet, and then the rest of you, and the last of it is stone and cold and no air at all.", "death big");
        await z.onPlayerDeath(s, null);
        continue;
      }
      // WHERE THE WATER PUTS YOU. Downstream is a lower index on the course.
      // A room with a DRY exit (the mill, the flats, the crossings) gives you a
      // real choice: climb out sideways, or be taken. A room without one — and
      // the gill is a cleft with water in the bottom and no floor either side —
      // gives you none, so there the water always takes you. That is the whole
      // reason this cannot pen anyone in: the places with no way out are exactly
      // the places it carries you OUT of.
      const here = SPATE_INDEX.get(s.roomId) ?? 0;
      const exitsOf = (id: string) => (z.world!.exits.get(id) ?? []).filter((e) => !e.key_item);
      const hasDryExit = exitsOf(s.roomId).some((e) => !SPATE_ROOMS.has(e.to_room));
      const stepDown = (id: string) => {
        const at = SPATE_INDEX.get(id) ?? 0;
        return exitsOf(id)
          .filter((e) => (SPATE_INDEX.get(e.to_room) ?? 99) < at)
          .sort((a, b) => (SPATE_INDEX.get(a.to_room) ?? 0) - (SPATE_INDEX.get(b.to_room) ?? 0))[0];
      };
      const first = stepDown(s.roomId);
      if (first && (!hasDryExit || chance(SPATE_SWEEP_ODDS))) {
        // It is fast. A sweep is several rooms, not one — otherwise a flush out
        // of the top of the gill would be twenty beats of standing in a river,
        // and twenty beats of anything is a death rather than an event.
        const from = s.roomId;
        let step = first;
        let moved = 0;
        const take = randInt(SPATE_SWEEP_MIN, SPATE_SWEEP_MAX);
        while (step && moved < take) {
          s.roomId = step.to_room;
          moved++;
          step = stepDown(s.roomId);
        }
        const where = z.world!.rooms.get(s.roomId)?.name ?? "somewhere lower";
        z.send(s, `The water takes your feet and you go with it — ${first.dir} and down, fast, over stone, until it lets you go at ${where}. [${s.hp}/${s.maxHp} hp]`, "dmgin");
        z.roomFeed(from, `${s.name} is taken off their feet and swept ${first.dir}.`, s.pubkey, false);
        z.roomFeed(s.roomId, `${s.name} comes down the beck and fetches up here, streaming.`, s.pubkey, false);
        z.send(s, z.describeRoom(s));
        z.sendCtx(s);
      } else {
        z.send(s, `The beck drives against your legs, cold enough to take the breath, and does not let up. [${s.hp}/${s.maxHp} hp]`, "dmgin");
      }
      z.sendStatus(s);
    }
  }

  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + SPATE_TELEGRAPH_MS;
      feedWhere(z, (roomId) => SPATE_ROOMS.has(roomId), "The beck goes brown between one look and the next, and the noise of it climbs. Somewhere up the gill it has already rained.");
      z.roomFeedBands(SEA_HEARD_BANDS, "Word comes off the east road: the beck is up and rising, and the low way will not be a way for much longer.", "evt");
      // Everything living on the water knows before you do, and starts climbing.
      for (const c of z.creatures.values()) {
        if (SPATE_ROOMS.has(c.roomId) && !DROWNERS.has(c.templateId)) {
          c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 10_000));
        }
      }
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + randInt(SPATE_ACTIVE_MIN_MS, SPATE_ACTIVE_MAX_MS);
      feedWhere(z, (roomId) => SPATE_ROOMS.has(roomId), "The beck comes up over the bank all at once, and the low way stops being ground.");
      z.roomFeedBands(SEA_HEARD_BANDS, "The beck is over its banks the whole length of the east road. Whatever is down there is in it now.", "evt");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + SPATE_AFTERMATH_MS;
      // ...AND WHAT IT CARRIED SETTLES LOW. The same law the tide already obeys,
      // pointed along a valley instead of down a stair: the floor of every
      // flooded room walks one step downstream. Anything lost up the gill
      // collects in the flats and the millpond, which is the nearest thing this
      // world has to a lost-property office and is emphatically not organised.
      for (let i = SPATE_COURSE.length - 1; i >= 1; i--) {
        const roomId = SPATE_COURSE[i];
        const floor = z.ground.get(roomId);
        if (!floor?.length) continue;
        const kept: string[] = [];
        const below = SPATE_COURSE[i - 1];
        for (const id of floor) {
          if (chance(SPATE_CARRY_ODDS)) {
            z.ground.set(below, [...(z.ground.get(below) ?? []), id]);
            z.stampFresh(below, id);
          } else kept.push(id);
        }
        if (kept.length) z.ground.set(roomId, kept); else z.ground.delete(roomId);
        z.refreshRoomCtx(roomId);
        z.refreshRoomCtx(below);
        z.addTrace(roomId, { kind: "scraps", at: now }); // silt, and what came down in it
      }
      feedWhere(z, (roomId) => SPATE_ROOMS.has(roomId), "The water drops as fast as it came up, and leaves the whole course under silt, printed all over with what it brought down.");
      z.roomFeedBands(SEA_HEARD_BANDS, "The beck drops back into its bed along the east road. Whatever it took, it has put down somewhere lower.", "evt");
      break;
    }
    case "aftermath": { st.phase = "idle"; st.until = NEVER; break; }
  }
}

// ---- THE WOODWARD WALKS (wood) ----
async function tickWalk(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("walk");
  if (!st) { st = { phase: "idle", until: NEVER }; z.events.set("walk", st); }
  // While he walks, he strides. A patrol's pace is slow; this is not a patrol.
  if (st.phase === "active") {
    for (const c of z.creatures.values()) {
      if (c.templateId !== WOODWARD_TMPL) continue;
      if (c.nextWanderAt > now + WALK_STRIDE_MAX_MS) {
        c.nextWanderAt = now + randInt(WALK_STRIDE_MIN_MS, WALK_STRIDE_MAX_MS);
      }
    }
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      // No woodward standing, no walk. He is not conjured for this.
      if (![...z.creatures.values()].some((c) => c.templateId === WOODWARD_TMPL)) { st.until = NEVER; break; }
      st.phase = "telegraph";
      st.until = now + WALK_TELEGRAPH_MS;
      z.roomFeedBands(new Set(["wood"]), "The wood goes wrong all at once — birds up off every ride, and something big moving out from the middle of it that has not moved in a long while.", "evt");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + randInt(WALK_ACTIVE_MIN_MS, WALK_ACTIVE_MAX_MS);
      z.roomFeedBands(new Set(["wood"]), "He is not where he was. Whatever the maze was keeping in its middle is walking it end to end.", "evt");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + WALK_AFTERMATH_MS;
      z.roomFeedBands(new Set(["wood"]), "The wood settles, one ride at a time. Something has gone back to the middle of it.", "evt");
      break;
    }
    case "aftermath": { st.phase = "idle"; st.until = NEVER; break; }
  }
}

// ---- THE QUIET (wood) ----
async function tickQuiet(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("quiet");
  if (!st) { st = { phase: "idle", until: NEVER }; z.events.set("quiet", st); }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + QUIET_TELEGRAPH_MS;
      z.roomFeedBands(new Set(["wood"]), "The birds stop. Not one at a time — all of them, together, and the silence they leave has an edge on it.", "evt");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + randInt(QUIET_ACTIVE_MIN_MS, QUIET_ACTIVE_MAX_MS);
      z.roomFeedBands(new Set(["wood"]), "Nothing moves in the whole wood. You can hear your own gear from further away than you would like.", "evt");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + QUIET_AFTERMATH_MS;
      z.roomFeedBands(new Set(["wood"]), "A wood pigeon goes off somewhere, clattering, and the wood remembers how to make noise.", "evt");
      break;
    }
    case "aftermath": { st.phase = "idle"; st.until = NEVER; break; }
  }
}

// ---- THE PACK COMES IN (dens) ----
// It has a HEAD. Kill it and the pack breaks and the arc ends early: an event
// with a move in it, and the one place in the world where clearing a room
// changes the weather.
async function tickPack(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("pack");
  if (!st) { st = { phase: "idle", until: NEVER }; z.events.set("pack", st); }
  if (st.phase === "active") {
    const ids = held(st);
    const headId = ids[0];
    if (headId && !z.creatures.get(headId)) {
      // Somebody put the head down. The rest go.
      recall(z, ids.slice(1));
      st.data = undefined;
      st.phase = "aftermath";
      st.until = now + PACK_AFTERMATH_MS;
      z.roomFeedBands(new Set(["den"]), "The pack comes apart the moment the big one goes down — dogs breaking for the Waste in every direction, and nothing left on the ground but what you did to it.", "evt");
      return;
    }
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + PACK_TELEGRAPH_MS;
      z.roomFeedBands(new Set(["den"]), "Dogs, out on the Waste, a long way off and getting closer — a lot of them, and none of them hunting anything they have found yet.", "evt");
      break;
    }
    case "telegraph": {
      const rooms = bandRooms(z, "den");
      if (!rooms.length) { st.phase = "idle"; st.until = NEVER; break; }
      // The head first: its id is the one held at the front, because everything
      // this arc does afterwards is measured against whether it is still alive.
      const headTmpl = chance(PACK_HEAD_ODDS) ? pick(PACK_HEADS_BAD) : PACK_HEAD;
      const ids: (string | null)[] = [hatch(z, headTmpl, pick(rooms), now, [25_000, 60_000])];
      for (let i = 0; i < PACK_DOGS; i++) ids.push(hatch(z, PACK_DOG, pick(rooms), now, [20_000, 50_000]));
      for (let i = 0; i < PACK_WOLVES; i++) ids.push(hatch(z, PACK_WOLF, pick(rooms), now, [20_000, 50_000]));
      for (let i = 0; i < PACK_HYENAS; i++) ids.push(hatch(z, PACK_HYENA, pick(rooms), now, [30_000, 70_000]));
      hold(st, ids);
      st.phase = "active";
      st.until = now + randInt(PACK_ACTIVE_MIN_MS, PACK_ACTIVE_MAX_MS);
      const headName = z.world!.mobTemplates.get(headTmpl)?.name ?? "something at the head of them";
      z.roomFeedBands(new Set(["den"]), `They are in among the houses. ${headName[0].toUpperCase()}${headName.slice(1)} is at the head of it, and the rest read off it.`, "evt");
      // If you LIVE here you are owed the specific: you would know the sound.
      for (const s of z.sessions.values()) {
        if (z.regionOf(s.roomId) === "den") continue; // they can hear it themselves
        const mine = den.myDen(z, s.pubkey);
        if (mine && z.world!.rooms.get(mine.roomId)?.region === "den") {
          z.send(s, `Word travels the way it does out here: there are dogs in the houses at ${z.world!.rooms.get(mine.roomId)!.name}, and ${headName} at the head of them. Your door is out there.`, "evt");
        }
      }
      break;
    }
    case "active": {
      recall(z, held(st));
      st.data = undefined;
      st.phase = "aftermath";
      st.until = now + PACK_AFTERMATH_MS;
      z.roomFeedBands(new Set(["den"]), "Whatever the dogs came for, they have stopped looking for it here. They go off west in a loose string and the ground is quiet again.", "evt");
      break;
    }
    case "aftermath": { st.phase = "idle"; st.until = NEVER; break; }
  }
}

// ---- THE FEVER (dens) ----
async function tickFever(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("fever");
  if (!st) { st = { phase: "idle", until: NEVER }; z.events.set("fever", st); }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + FEVER_TELEGRAPH_MS;
      z.roomFeedBands(new Set(["den"]), "The wind turns and comes off the graves, and it is warm, and it is wrong. Everything on this ground smells faintly of the pit.", "evt");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + randInt(FEVER_ACTIVE_MIN_MS, FEVER_ACTIVE_MAX_MS);
      z.roomFeedBands(new Set(["den"]), "It settles over the whole ground. Sleep will not take, food does you no good, and a dressing may as well be a rag. There is nothing here to fight and nothing to mend.", "evt");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + FEVER_AFTERMATH_MS;
      z.roomFeedBands(new Set(["den"]), "The wind comes round again off the fen, cold and clean, and the ground lets go of it.", "evt");
      break;
    }
    case "aftermath": { st.phase = "idle"; st.until = NEVER; break; }
  }
}

// ---- the roll (the world's dice) ----
// One clock, one die: every few hours it picks ONE arc from the pool and
// starts it. The tick only runs with an audience, so a roll slept long past
// simply happened unobserved — the next lands mid-cycle, never login-o'clock.
function tickRoll(z: ZoneDO, now: number): void {
  let st = z.events.get("roll");
  if (!st) {
    st = { phase: "idle", until: now + randInt(ROLL_FIRST_MIN_MS, ROLL_FIRST_MAX_MS) };
    z.events.set("roll", st);
    // Older saves gave each arc its own clock; park any idle ones — the roll
    // owns the sky now. (The bell re-anchors to its hours the same way.)
    for (const [id] of POOL) {
      const ev = z.events.get(id);
      if (ev && ev.phase === "idle") ev.until = NEVER;
    }
    const bell = z.events.get("bell");
    if (bell && bell.phase === "idle") z.events.delete("bell");
  }
  if (now < st.until) return;
  if (now - st.until > ROLL_GRACE_MS) {
    st.until = now + randInt(ROLL_MISSED_MIN_MS, ROLL_MISSED_MAX_MS);
    return;
  }
  st.until = now + randInt(ROLL_EVERY_MIN_MS, ROLL_EVERY_MAX_MS);
  // One thing at a time PER GROUND. The bell and the tide still stop the world
  // — they are the two arcs that are events in the whole keep's life rather than
  // weather on one band. Everything else only has to find its own ground free,
  // and if nothing's ground is free this roll passes: quiet is a result too.
  if (phaseOf(z, "bell") !== "idle" || phaseOf(z, "tide") !== "idle") return;
  const busy = bandsBusy(z);
  const open = POOL.filter(([, , band]) => band === ANY ? (!busy.any && !busy.bands.size) : (!busy.any && !busy.bands.has(band)));
  if (!open.length) return;
  const total = open.reduce((sum, [, w]) => sum + w, 0);
  let n = randInt(1, total);
  let picked = open[0][0];
  for (const [id, w] of open) {
    n -= w;
    if (n <= 0) { picked = id; break; }
  }
  const ev = z.events.get(picked) ?? { phase: "idle" as const, until: 0 };
  ev.phase = "idle";
  ev.until = now; // its ticker fires the telegraph this very tick
  z.events.set(picked, ev);
}

async function tickRain(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("rain");
  if (!st) {
    st = { phase: "idle", until: NEVER }; // the roll brings the weather
    z.events.set("rain", st);
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + RAIN_TELEGRAPH_MS;
      // WHICH KIND, decided now rather than when it breaks — so the two minutes
      // of warning are worth something. A shower you shelter out; settled rain
      // you plan around. The sky tells you which, and you get to act on it.
      const settled = chance(RAIN_SETTLED_ODDS);
      st.data = settled ? "settled" : "shower";
      feedOutdoors(z, settled
        ? "The whole sky goes one flat colour, edge to edge, and the light dies with it. This is not a shower coming."
        : "The light goes iron-grey. The air smells of rain coming.");
      // The beasts feel it first: everything under the open sky stirs now —
      // their run for cover IS the telegraph (see rainDrives in ai.ts).
      for (const c of z.creatures.values()) {
        if (OUTDOOR_ROOMS.has(c.roomId)) {
          c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 12_000));
        }
      }
      break;
    }
    case "telegraph": {
      st.phase = "active";
      const settled = st.data === "settled";
      st.until = now + (settled
        ? randInt(RAIN_SETTLED_MIN_MS, RAIN_SETTLED_MAX_MS)
        : randInt(RAIN_SHOWER_MIN_MS, RAIN_SHOWER_MAX_MS));
      feedOutdoors(z, settled
        ? "The rain arrives all at once and does not ease — a steady, vertical, settled downpour with no end in the look of it."
        : "The sky opens. Rain comes down in earnest, loud on stone and thorn.");
      for (const s of z.sessions.values()) rainSoaksTorch(z, s);
      // Fresh water wakes the still pools: the surface waters forget every
      // angler at once (the storm bite is real, not just faster misses).
      for (const roomId of FISHING_SURFACE) z.fishStock.delete(roomId);
      break;
    }
    case "active": {
      const settled = st.data === "settled";
      st.phase = "aftermath";
      // A long soaking leaves the ground wrong for longer — the mud outlasts
      // the weather that made it, and by more when there was more of it.
      st.until = now + Math.round(RAIN_AFTERMATH_MS * (settled ? RAIN_SETTLED_AFTERMATH_MULT : 1));
      st.data = undefined; // the kind belonged to that storm; the next one rolls its own
      feedOutdoors(z, settled
        ? "The rain thins at last, and stops, and the quiet after it is enormous. Everything underfoot has turned to mud, and it will be mud for a long while."
        : "The rain slackens, and stops. What blood and tracks the ground held have run off into the mud.");
      // The wash: the open ground forgets — blood, remains, camps, passage —
      // all but what was cut into stone. (The murderer's weather, one day.)
      for (const roomId of OUTDOOR_ROOMS) {
        const held = z.traces.get(roomId);
        if (!held?.length) continue;
        const kept = held.filter((t) => t.kind === "carve");
        if (kept.length) z.traces.set(roomId, kept); else z.traces.delete(roomId);
      }
      // And the ground drinks: outdoor forage comes back sooner.
      for (const r of z.regrow) {
        if (OUTDOOR_ROOMS.has(r.roomId) && r.at > now) {
          r.at = now + Math.floor((r.at - now) / 2);
        }
      }
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER; // the mud dries; the next sky is the roll's business
      break;
    }
  }
}

// Mud remembers (the aftermath's gift): a print pressed into wet ground reads
// fresh far longer. Called by addTrace — the future-dated stamp is the cheap
// way to say "this one cuts deeper" with the aging the traces already do.
export function mudDeepens(z: ZoneDO, roomId: string, kind: string): number {
  return muddy(z, roomId) && (kind === "passage" || kind === "rest") ? (TRACE_LIFE_MS[kind] ?? 0) : 0;
}

// ---- the bell (keep, SCHEDULED) ----
// Something in the bell-cote rings at the keep's own hours — twice a day,
// near the same times, never to the minute. One warning note hangs; then the
// ringing — ninety seconds where every listener in the keep hears EVERYTHING
// and the vermin bolt for the warrens (which makes a boil likelier in the way
// events are allowed to: bias, never a trigger). Then the worse part: the
// silence after, with the halls still listening.
// THE WATCHMAN RINGS IT (rome, 2026-07-24): nextBellAt still picks roughly
// when, but idle no longer fires on the clock alone — it waits for the last
// watchman's patrol to actually reach the-watch-turret, directly under the
// cote, before it tolls. He loops back to the turret every lap of his route
// (a matter of minutes, not hours), so this is a short wait, not a stall —
// and if he's mid-respawn, it waits for that too. The bell-cote itself STAYS
// off his patrol (PATROLS["last-watchman"], zone-data.ts) — he rings it from
// below, the cote stays the one perch the watch never checks.
function nextBellAt(now: number): number {
  const day = Math.floor(now / 86_400_000) * 86_400_000;
  let best = NEVER;
  for (const d of [0, 1]) {
    for (const h of BELL_HOURS_UTC) {
      const t = day + d * 86_400_000 + h * 3_600_000 + randInt(-BELL_JITTER_MS, BELL_JITTER_MS);
      if (t > now + 60_000 && t < best) best = t;
    }
  }
  return best;
}

async function tickBell(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("bell");
  if (!st) {
    st = { phase: "idle", until: nextBellAt(now) };
    z.events.set("bell", st);
  }
  if (now < st.until) return;
  const inKeep = (roomId: string) => keepRoom(z, roomId);
  switch (st.phase) {
    case "idle": {
      // Slept past the hour (the tick needs an audience): it rang unobserved.
      if (now - st.until > BELL_GRACE_MS) {
        st.until = nextBellAt(now);
        break;
      }
      // Due, but he isn't at his post yet (mid-route, or mid-respawn) — wait
      // for him. Doesn't burn the grace window; it just checks again next tick.
      const watchman = [...z.creatures.values()].find((c) => c.templateId === "last-watchman");
      if (!watchman || watchman.roomId !== "the-watch-turret") return;
      st.phase = "telegraph";
      st.until = now + BELL_TELEGRAPH_MS;
      // Standing at the source gets its own line — "somewhere above" is a lie
      // if you're the one under the bell (rome, 2026-07-24).
      feedWhere(z, (roomId) => inKeep(roomId) && roomId !== "the-bell-cote", "Somewhere above, a single bell-note rolls through the halls — then silence.");
      // A fortress bell is heard from the road, and through the floor. It is the
      // one SCHEDULED thing in this world — a player can learn its hours — and
      // until now you could only know that by standing inside the keep for it.
      z.roomFeedBands(KEEP_HEARD_BANDS, "One bell-note comes off the fortress and rolls out over everything, and then nothing.", "evt");
      z.roomFeed("the-bell-cote", "The bell shudders under your hand before it even sounds — one note, so close it isn't sound anymore, just impact.", undefined, false, "evt");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + BELL_ACTIVE_MS;
      feedWhere(z, (roomId) => inKeep(roomId) && roomId !== "the-bell-cote", "The bell begins to RING — over and over, iron on iron, and the keep is waking around you.");
      z.roomFeedBands(KEEP_HEARD_BANDS, "The fortress bell is RINGING — on and on, iron on iron, and whatever is inside those walls is waking to it.", "evt");
      z.roomFeed("the-bell-cote", "The bell is RINGING inches from you — iron on iron, filling your skull, drowning every other sense you have.", undefined, false, "evt");
      // Everything under the keep's roof stirs at once; the rats are already
      // running for the earth (see bellDrivesRats).
      for (const c of z.creatures.values()) {
        if (keepRoom(z, c.roomId)) {
          c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 10_000));
        }
      }
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + BELL_AFTERMATH_MS;
      feedWhere(z, (roomId) => inKeep(roomId) && roomId !== "the-bell-cote", "The bell stops. The silence after is worse — the halls are still listening.");
      z.roomFeedBands(KEEP_HEARD_BANDS, "The bell stops. The fortress goes back to being quiet, which is worse.", "evt");
      z.roomFeed("the-bell-cote", "The bell goes still under your palm — the ringing's out of the air, but not out of your bones yet.", undefined, false, "evt");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = nextBellAt(now);
      break;
    }
  }
}

// ---- the boil (warrens) ----
// A den overflows: the squeaking swells, then a tide of rats pours room to
// room down one corridor — a moving hazard you stand aside from (it bites
// what it flows around; flee, climb, or bleed). Creatures scatter ahead of
// it; brood-mothers and sentinels hold their posts and let it break around
// them. It gnaws its path clean and is gone.
async function tickBoil(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("boil");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("boil", st);
  }
  const inWarrens = (roomId: string) => WARRENS_ROOMS.has(roomId);
  // The tide moves on its own clock while active — steps happen mid-phase.
  if (st.phase === "active" && now >= boilStepAt && boilIdx >= 0) {
    const leaving = boilPath[boilIdx];
    boilIdx += 1;
    if (boilIdx >= boilPath.length) {
      // The tide spends itself: straight to aftermath.
      boilIdx = -1;
      st.phase = "aftermath";
      st.until = now + BOIL_AFTERMATH_MS;
      feedWhere(z, inWarrens, "The squeaking fades, down into the earth. The warrens breathe again.");
      z.roomFeedBands(FORTRESS_BANDS, "The scratching under the floors thins out and goes back down. The warrens have taken their own back.", "evt");
      return;
    }
    const entering = boilPath[boilIdx];
    boilStepAt = now + BOIL_STEP_MS;
    z.roomFeed(leaving, "The rat-tide pours on and is gone, the last of them dragging their tails through the filth.", undefined, false, "evt");
    z.roomFeed(entering, "A tide of rats bursts through — a river of teeth and tails, wall to wall.", undefined, false, "evt");
    z.addTrace(entering, { kind: "scraps", at: now }); // a gnawed path
    // Everything standing there scatters ahead of it (the posted stay posted).
    // The tide of teeth wakes anything dozing in its path.
    for (const c of [...z.creatures.values()]) {
      if (c.roomId !== entering || BROODERS.has(c.templateId) || SENTINELS.has(c.templateId)) continue;
      const tmpl = z.world!.mobTemplates.get(c.templateId)!;
      if (tmpl.is_boss) continue;
      c.asleep = false;
      c.sleepUntil = undefined;
      c.nextWanderAt = now; // it moves the moment the tick lets it
    }
  }
  // The tide gnaws what stands in it: a point of blood per beat, and the
  // room text says why (see skyClause). Flee or climb clear.
  const tideRoom = boilRoom(z);
  if (tideRoom) {
    for (const s of z.sessions.values()) {
      if (s.roomId !== tideRoom || z.outOfWorld(s) || s.hp <= 0) continue;
      s.hp -= BOIL_BITE;
      if (s.hp <= 0) {
        z.send(s, "The tide takes your feet from under you, and then it simply keeps going, over you.", "death big");
        await z.onPlayerDeath(s, z.world!.mobTemplates.get("rat") ?? null);
        continue;
      }
      z.send(s, `The river of rats breaks around your legs, biting as it goes. [${s.hp}/${s.maxHp} hp]`, "dmgin");
      z.sendStatus(s);
    }
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + BOIL_TELEGRAPH_MS;
      feedWhere(z, inWarrens, "A thin squeaking swells somewhere in the warrens — hundreds of small voices, coming closer.");
      // ...and the rest of the fortress hears it come up through the floors.
      z.roomFeedBands(FORTRESS_BANDS, "Under the floors of the keep something is moving in numbers — a thin scratching that comes up through the stone and does not stop.", "evt");
      break;
    }
    case "telegraph": {
      // Lay the tide's path: from a random den-country room, a walk through
      // the warrens only (rats don't open doors), as far as it reaches. Never
      // a hideaway — the tide breaks around a sanctuary like everything else.
      const world = z.world!;
      const starts = [...WARRENS_ROOMS].filter((r) => world.rooms.has(r) && !world.safeRooms.has(r));
      const start = starts[randInt(0, starts.length - 1)];
      const path = [start];
      const seen = new Set(path);
      let at = start;
      while (path.length < 7) {
        const steps = (world.exits.get(at) ?? []).filter(
          (e) => !e.key_item && WARRENS_ROOMS.has(e.to_room) && !world.safeRooms.has(e.to_room) && !seen.has(e.to_room),
        );
        if (!steps.length) break;
        at = steps[randInt(0, steps.length - 1)].to_room;
        seen.add(at);
        path.push(at);
      }
      if (path.length < 2) {
        // Nowhere to flow this time; the dens settle back down.
        st.phase = "idle";
        st.until = NEVER;
        break;
      }
      boilPath = path;
      boilIdx = 0;
      boilStepAt = now + BOIL_STEP_MS;
      st.phase = "active";
      st.until = now + BOIL_STEP_MS * (path.length + 2); // a hard ceiling; the tide usually spends itself first
      z.roomFeed(start, "The den mouths open at once and the rats POUR OUT — a tide of them, taking the corridor.", undefined, false, "evt");
      z.roomFeedBands(FORTRESS_BANDS, "The warrens are emptying themselves. Whatever is down there is coming up in a body, and the whole keep can hear it run.", "evt");
      z.addTrace(start, { kind: "scraps", at: now });
      break;
    }
    case "active": {
      // Ceiling reached with the tide still out: it drains where it stands.
      boilIdx = -1;
      st.phase = "aftermath";
      st.until = now + BOIL_AFTERMATH_MS;
      feedWhere(z, inWarrens, "The squeaking fades, down into the earth. The warrens breathe again.");
      z.roomFeedBands(FORTRESS_BANDS, "The scratching under the floors thins out and goes back down. The warrens have taken their own back.", "evt");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}

// ---- corpse-wake (warrens) ----
// "The dead don't stay down tonight." Fresh death-litter is the beacon: where
// something fell lately, the warrens' own buried dead pull themselves up
// through the floor — the ground closing over the blood that called them (the
// beacon-trace is consumed; one corpse sends for company once). Whatever rose
// and still stands when the window shuts drops where it is, bones again.
// Camp your killing floor and your kills answer. No fresh dead, no wake.
async function tickWake(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("wake");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("wake", st);
  }
  if (now < st.until) return;
  const inWarrens = (roomId: string) => WARRENS_ROOMS.has(roomId);
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + WAKE_TELEGRAPH_MS;
      feedWhere(z, inWarrens, "Every hollow thing in the warrens stops at once — heads cocked, listening to something under the floor.");
      z.roomFeedBands(FORTRESS_BANDS, "The floor of the warrens is being opened from underneath, and what is coming up through it was buried a long time before anything else here died.", "evt");
      // The stillness IS the telegraph: the hollow hold where they stand.
      for (const c of z.creatures.values()) {
        if (WARRENS_ROOMS.has(c.roomId) && HOLLOW.has(c.templateId)) {
          c.nextWanderAt = Math.max(c.nextWanderAt, now + WAKE_TELEGRAPH_MS + 30_000);
        }
      }
      break;
    }
    case "telegraph": {
      // Rise where fresh death lies. The trace that called is consumed.
      const tmpl = z.world!.mobTemplates.get("twice-dead");
      let risen = 0;
      if (tmpl) {
        for (const roomId of WARRENS_ROOMS) {
          if (risen >= WAKE_CAP) break;
          // A death INSIDE a hideaway (a bleed-out behind the latch) never
          // raises anything there — nothing stands up where nothing can enter.
          if (z.world!.safeRooms.has(roomId)) continue;
          const held = z.traces.get(roomId);
          if (!held) continue;
          const idx = held.findIndex((t) => (t.kind === "blood" || t.kind === "remains") && now - t.at < WAKE_FRESH_MS);
          if (idx === -1) continue;
          const beacon = held[idx];
          held.splice(idx, 1); // the ground closes over what called it up
          if (!held.length) z.traces.delete(roomId);
          const id = uuid();
          z.creatures.set(id, {
            id,
            templateId: "twice-dead",
            roomId,
            hp: tmpl.max_hp,
            hunger: 0,
            grudges: [],
            nextWanderAt: now + randInt(15_000, 40_000),
            target: null,
            risen: true,
          });
          z.roomFeed(roomId, beacon.label
            ? `Where ${beacon.label} fell, the floor gives — and something older pulls itself up through it, dry and wrong.`
            : "The floor gives, and something long-buried pulls itself up through it, dry and wrong.", undefined, false, "evt");
          z.roomSound(roomId, "Stone shifts {dir}, and something drags itself over it.");
          z.refreshRoomCtx(roomId);
          risen++;
        }
      }
      if (!risen) {
        // Nothing fresh-dead down here: the listening passes.
        st.phase = "idle";
        st.until = NEVER;
        feedWhere(z, inWarrens, "Whatever was listening under the floor loses interest. The hollow ones move again.");
      z.roomFeedBands(FORTRESS_BANDS, "Whatever was under the warrens loses interest, and the keep's dead go back to their own business.", "evt");
        break;
      }
      st.phase = "active";
      st.until = now + WAKE_ACTIVE_MS;
      feedWhere(z, inWarrens, "The dead are not staying down tonight.");
      z.roomFeedBands(FORTRESS_BANDS, "Something under the warrens has the attention of the dead. Every hollow thing in the keep has stopped where it stands and is listening down.", "evt");
      break;
    }
    case "active": {
      // The window shuts: whatever rose and still stands drops where it is.
      for (const c of [...z.creatures.values()]) {
        if (!c.risen) continue;
        z.creatures.delete(c.id);
        for (const s of z.sessions.values()) {
          if (s.target === c.id) s.target = null;
          if (s.seizedBy === c.id) s.seizedBy = undefined;
        }
        z.roomFeed(c.roomId, "The risen thing stops mid-stride and drops — loose bones again, all at once.", undefined, false, "evt");
        z.addTrace(c.roomId, { kind: "remains", at: now });
        z.refreshRoomCtx(c.roomId);
      }
      st.phase = "aftermath";
      st.until = now + WAKE_AFTERMATH_MS;
      feedWhere(z, inWarrens, "The warrens settle. The dead lie still again — those that still can.");
      z.roomFeedBands(FORTRESS_BANDS, "Whatever was under the warrens loses interest, and the keep's dead go back to their own business.", "evt");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}

// ---- the keeper's want (gate) ----
// Chalk on the hatch: one named good counts double in trade for the
// window. No hazard at all — the only weather that gives you somewhere to GO,
// and it points every wanderer at the same corner of the map at once.
async function tickWant(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("want");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("want", st);
  }
  if (now < st.until) return;
  const inGate = (roomId: string) => z.world!.entryRooms.has(roomId);
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + WANT_TELEGRAPH_MS;
      st.data = pick(WANT_TABLE);
      const t = z.world!.itemTemplates.get(st.data);
      feedWhere(z, inGate, `Word passes along the road: the keeper is asking after ${t?.name ?? "something"} tonight, and paying like he means it.`);
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + WANT_ACTIVE_MS;
      const t = z.world!.itemTemplates.get(st.data ?? "");
      feedWhere(z, inGate, `Chalk scrapes on wood: the keeper marks his want on the hatch — ${t?.name ?? "something"}, double in trade, while the chalk lasts.`);
      // ...and word travels OUT, to the ground where the thing is actually found.
      z.roomFeedBands(WANT_HEARD_BANDS, `Word comes up from the gate: the keeper is asking after ${t?.name ?? "something"} tonight, double in trade, and paying like he means it.`, "evt");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + WANT_AFTERMATH_MS;
      feedWhere(z, inGate, "The keeper wipes the chalk from his hatch. Whatever he wanted it for, the moment has passed.");
      z.roomFeedBands(WANT_HEARD_BANDS, "Word comes up from the gate: the keeper has wiped his chalk. Whatever he wanted it for, he has stopped wanting it.", "evt");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      st.data = undefined;
      break;
    }
  }
}

// ---- the escaped thing ----
// The Gaunt gets loose from under the keep: one named, starved, LOOTABLE
// wanderer walking the world for the window. The whole zone hears it get out;
// after that the telegraph is everything else — rooms emptying ahead of it,
// its long breathing through the walls (MOVE_SOUNDS). It shares no room
// peaceably: it fixes on you, winds up, and springs — the wind-up is the
// warning (get out, or hit first). Put it down for its pelt; leave it and it
// answers some call and pours back into the dark.
function findGaunt(z: ZoneDO) {
  for (const c of z.creatures.values()) {
    if (c.templateId === ESCAPE_TMPL) return c;
  }
  return null;
}

async function tickEscape(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("escape");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("escape", st);
  }
  // While it walks: it strides (no grazing cadence), and a shared room turns
  // into the rouse-and-spring — telegraphed, escapable, then committed.
  if (st.phase === "active") {
    const gaunt = findGaunt(z);
    if (!gaunt) {
      // Someone put it down. The world can exhale.
      st.phase = "aftermath";
      st.until = now + ESCAPE_AFTERMATH_MS;
      z.roomFeedBands(FORTRESS_BANDS, "Far off, a long starving cry cuts short — and does not come again.", "evt");
    } else {
      if (gaunt.nextWanderAt > now + ESCAPE_STRIDE_MAX_MS) {
        gaunt.nextWanderAt = now + randInt(ESCAPE_STRIDE_MIN_MS, ESCAPE_STRIDE_MAX_MS);
      }
      if (!gaunt.target) {
        const prey = [...z.sessions.values()].filter(
          (s) => s.roomId === gaunt.roomId && !z.outOfWorld(s) && s.hp > 0,
        );
        if (!prey.length) {
          gaunt.rouseAt = undefined;
        } else if (gaunt.rouseAt === undefined) {
          gaunt.rouseAt = now + ESCAPE_ROUSE_MS;
          for (const s of prey) {
            z.send(s, "The gaunt thing goes very still, and fixes on you — it has not sprung yet. (get out, or hit first)");
          }
        } else if (now >= gaunt.rouseAt) {
          const s = prey[randInt(0, prey.length - 1)];
          const tmpl = z.world!.mobTemplates.get(ESCAPE_TMPL)!;
          gaunt.rouseAt = undefined;
          gaunt.target = s.pubkey;
          if (!s.target) s.target = gaunt.id;
          await z.creatureFirstStrike(gaunt, tmpl, s);
        }
      }
    }
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      // The template rides migration 068; a world without it can't loose it.
      if (!z.world!.mobTemplates.has(ESCAPE_TMPL)) {
        st.until = NEVER;
        break;
      }
      st.phase = "telegraph";
      st.until = now + ESCAPE_TELEGRAPH_MS;
      z.roomFeedBands(FORTRESS_BANDS, "From somewhere far under the keep, a long, starving cry rolls up through the stone — and then the sound of something giving way.", "evt");
      break;
    }
    case "telegraph": {
      const tmpl = z.world!.mobTemplates.get(ESCAPE_TMPL)!;
      // Never born inside a hideaway (the deep holds two; the fallback set one).
      const deep = [...z.world!.rooms.keys()].filter((r) => z.regionOf(r) === "deep" && !z.world!.safeRooms.has(r));
      const start = deep.length ? deep[randInt(0, deep.length - 1)] : pick([...WARRENS_ROOMS].filter((r) => !z.world!.safeRooms.has(r)));
      const id = uuid();
      z.creatures.set(id, {
        id,
        templateId: ESCAPE_TMPL,
        roomId: start,
        hp: tmpl.max_hp,
        hunger: 100, // starved is what it IS
        grudges: [],
        nextWanderAt: now + randInt(ESCAPE_STRIDE_MIN_MS, ESCAPE_STRIDE_MAX_MS),
        target: null,
      });
      z.roomFeed(start, "Something comes up out of the dark — tall past reason, starved down to cords, moving like it owns every room it enters.", undefined, false, "evt");
      z.refreshRoomCtx(start);
      st.phase = "active";
      st.until = now + ESCAPE_ACTIVE_MS;
      break;
    }
    case "active": {
      // The window closes with it still walking: it answers some call home.
      const gaunt = findGaunt(z);
      if (gaunt) {
        z.creatures.delete(gaunt.id);
        for (const s of z.sessions.values()) {
          if (s.target === gaunt.id) s.target = null;
          if (s.seizedBy === gaunt.id) s.seizedBy = undefined;
        }
        z.roomFeed(gaunt.roomId, "The gaunt thing lifts its head as if called — then turns, and pours itself back down into the dark.", undefined, false, "evt");
        z.refreshRoomCtx(gaunt.roomId);
      }
      st.phase = "aftermath";
      st.until = now + ESCAPE_AFTERMATH_MS;
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}

// ---- marsh lights (the wet ground) ----
// Pale lights out over the water that read exactly like a carried torch, and
// careful footsteps next door that read exactly like a player keeping to the
// water's edge. Nothing attacks; nothing is there. The event is doubt.
let nextFalseStepAt = 0;
async function tickLights(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("lights");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("lights", st);
  }
  // The false walker: while the lights are out, the fen's edges hear slow,
  // careful footsteps that nobody is taking (roomSound — the same channel a
  // real neighbor leaks through, which is the whole lie).
  if (st.phase === "active" && now >= nextFalseStepAt) {
    nextFalseStepAt = now + randInt(LIGHTS_STEP_MIN_MS, LIGHTS_STEP_MAX_MS);
    const rooms = [...LIGHTS_ROOMS].filter((r) => z.world!.rooms.has(r));
    if (rooms.length) {
      z.roomSound(rooms[randInt(0, rooms.length - 1)], "Slow, careful footsteps {dir}, keeping to the water's edge.");
    }
  }
  if (now < st.until) return;
  const inFen = (roomId: string) => LIGHTS_ROOMS.has(roomId);
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + LIGHTS_TELEGRAPH_MS;
      feedWhere(z, inFen, "The air over the water goes greasy and still, and the dark out there gets... attentive.");
      z.roomFeedBands(FEN_HEARD_BANDS, "The air over the fen has gone greasy and still. Anybody who works that water knows what usually comes next.", "evt");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + LIGHTS_ACTIVE_MS;
      nextFalseStepAt = now + randInt(LIGHTS_STEP_MIN_MS, LIGHTS_STEP_MAX_MS);
      feedWhere(z, inFen, "A light shows out over the water — steady, like a carried torch. It doesn't move like a man's.");
      z.roomFeedBands(FEN_HEARD_BANDS, "There are lights out over the fen tonight — steady, carried, and moving like nothing that has legs.", "evt");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + LIGHTS_AFTERMATH_MS;
      feedWhere(z, inFen, "The lights go out — all at once, like a breath blown out over a candle.");
      z.roomFeedBands(FEN_HEARD_BANDS, "The fen's lights go out together, and the water out there is only water again.", "evt");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}

// ---- fog (outdoors) ----
// The anti-rain: rain is loud and washes the ground clean; fog is silent and
// keeps every print. Spot odds fall BOTH ways — the world half-misses you
// (fogWakeMult in ai.wakeListeners) and you can't read the shapes either
// (fogTell blanks every creature's tell). Scavengers hunt in it
// (ai.scavengerBold). The stalker's weather.
async function tickFog(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("fog");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("fog", st);
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + FOG_TELEGRAPH_MS;
      feedOutdoors(z, "A milky haze creeps up from the low ground, and the far walls lose their edges.");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + randInt(FOG_ACTIVE_MIN_MS, FOG_ACTIVE_MAX_MS);
      feedOutdoors(z, "The fog closes in. Everything past arm's reach is a rumor now.");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + FOG_AFTERMATH_MS;
      feedOutdoors(z, "The fog thins to rags, and the open ground comes back — along with everything that was moving through it.");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}

// ---- cold snap (outdoors + deep) ----
// Clear and bitter, everywhere the walls don't hold warmth. Torches burn
// half as long (lit ones lose half their remainder on the first beat; the
// lantern's oil doesn't care), rest barely holds (zone's heal tick), and the
// living den up — their retreat is the telegraph. The HOLLOW keep walking:
// nothing in them feels it, and that's the free tell. A quiet, safe-LOOKING
// window that taxes your supplies.
async function tickCold(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("cold");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("cold", st);
  }
  if (now < st.until) return;
  const inCold = (roomId: string) => OUTDOOR_ROOMS.has(roomId) || deepRoom(z, roomId);
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + COLD_TELEGRAPH_MS;
      feedSky(z, inCold, "The air goes glass-clear and bitter, sharpening by the breath.");
      // The living feel it first and head for cover (coldDrives in ai.ts);
      // the hollow don't so much as pause.
      for (const c of z.creatures.values()) {
        if (inCold(c.roomId) && !HOLLOW.has(c.templateId)) {
          c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 12_000));
        }
      }
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + randInt(COLD_ACTIVE_MIN_MS, COLD_ACTIVE_MAX_MS);
      feedSky(z, inCold, "The cold settles in hard. Flames pinch small, and everything living goes to ground.");
      // The first bite eats the flame: a burning torch out in it loses half
      // of whatever it had left. (The lantern's oil doesn't care.)
      for (const s of z.sessions.values()) {
        if (coldBites(z, s.roomId) && s.litSource === "torch" && s.litUntil && s.litUntil > now) {
          s.litUntil = now + Math.floor((s.litUntil - now) * COLD_TORCH_MULT);
        }
      }
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + COLD_AFTERMATH_MS;
      feedSky(z, inCold, "The bitter edge goes out of the air, slowly, like something unclenching.");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}

// ---- the breach ----
// The map itself is the event: stone groans in two rooms that share a wall in
// the fiction, then the wall GIVES — an exit exists that isn't supposed to,
// both ways, for the window — then the rubble settles and it's gone. No map
// or journal shows it; the only people who know are the ones who heard the
// stone come down. Exits are just data, so creatures pour through it too.
function breachExitOpen(z: ZoneDO, roomId: string, dir: string, toRoom: string): void {
  const exits = z.world!.exits.get(roomId) ?? [];
  if (exits.some((e) => e.dir === dir)) return; // already open (or the world is stranger than we thought)
  exits.push({ room_id: roomId, dir, to_room: toRoom, key_item: null });
  z.world!.exits.set(roomId, exits);
}

function breachExitClose(z: ZoneDO, roomId: string, dir: string, toRoom: string): void {
  const exits = z.world!.exits.get(roomId);
  if (!exits) return;
  z.world!.exits.set(roomId, exits.filter((e) => !(e.dir === dir && e.to_room === toRoom)));
}

// ---- the gloam (the keep) ----
// The dark itself gets up and walks the halls: one interior room at a time is
// TRUE dark (z.isDark ORs it in with DARK_ROOMS), taken and left on the
// gloam's own clock. A carried flame still holds it off — this is a moving
// dark room, not the exhale. The living flee the room it takes; the HOLLOW
// keep walking inside it, because bones don't need eyes — hearing that
// measured tread continue in the black IS the event. Its room rides
// EventState.data, so a deploy mid-drift doesn't blink the dark out; only
// the step clock is module-local (a lost beat, nothing more).
let gloamStepAt = 0;

// The dark descends on a room: the lines, the blind warning, and the scatter
// of everything living that can leave. Shared by the first fall and each step.
function gloamTakes(z: ZoneDO, room: string, now: number, first: boolean): void {
  z.roomFeed(room, first
    ? "The light goes out of the room all at once — not snuffed, TAKEN. The dark that stands in its place is total."
    : "The light dies. The dark comes down over the room like water closing, and it is total.", undefined, false, "evt");
  for (const s of z.sessions.values()) {
    if (s.roomId === room && !z.outOfWorld(s) && !z.carriesLight(s)) {
      z.send(s, "The dark takes the room with you in it. Your own hands are gone. (a carried flame would hold it off)", "dmgin");
    }
  }
  // The living clear out ahead of it; the hollow do not care. The dark
  // arriving wakes a sleeper — nothing dozes through the light being taken.
  for (const c of [...z.creatures.values()]) {
    if (c.roomId !== room || HOLLOW.has(c.templateId) || BROODERS.has(c.templateId) || SENTINELS.has(c.templateId)) continue;
    if (z.world!.mobTemplates.get(c.templateId)!.is_boss) continue;
    c.asleep = false;
    c.sleepUntil = undefined;
    c.nextWanderAt = now;
  }
  z.refreshRoomCtx(room);
}

function endGloam(z: ZoneDO, st: EventState, now: number, room: string | null): void {
  st.phase = "aftermath";
  st.until = now + GLOAM_AFTERMATH_MS;
  st.data = undefined;
  if (room) {
    z.roomFeed(room, "The dark thins, pales, and is only shadow again. The room does not feel finished with.", undefined, false, "evt");
    z.refreshRoomCtx(room);
  }
}

async function tickGloam(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("gloam");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("gloam", st);
  }
  // Mid-phase: the drift. It slides to an adjacent hall on its own clock.
  if (st.phase === "active" && now >= gloamStepAt) {
    if (!st.data) { endGloam(z, st, now, null); return; } // healed: active with no room (shouldn't happen — data persists)
    const leaving = st.data;
    const steps = (z.world!.exits.get(leaving) ?? []).filter(
      (e) => !e.key_item && gloamCan(z, e.to_room),
    );
    if (!steps.length) {
      // Cornered in a dead end: it spends itself where it stands.
      endGloam(z, st, now, leaving);
      return;
    }
    const entering = steps[randInt(0, steps.length - 1)].to_room;
    st.data = entering;
    gloamStepAt = now + GLOAM_STEP_MS;
    z.roomFeed(leaving, "The dark lifts off this room like a held breath let go — the light comes back thin and grey.", undefined, false, "evt");
      z.roomFeedBands(GLOAM_HEARD_BANDS, "The dark that was sitting in the halls lets go. Somewhere a room has its light back, thin and grey.", "evt");
    z.refreshRoomCtx(leaving);
    gloamTakes(z, entering, now, false);
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      // Pick where the light fails first.
      const starts = [...z.world!.rooms.keys()].filter((r) => gloamCan(z, r));
      if (!starts.length) { st.until = NEVER; return; }
      st.data = starts[randInt(0, starts.length - 1)];
      st.phase = "telegraph";
      st.until = now + GLOAM_TELEGRAPH_MS;
      z.roomFeed(st.data, "The light in this room is going wrong — thin and brown, like water with something in it.", undefined, false, "evt");
      z.roomFeedBands(GLOAM_HEARD_BANDS, "Somewhere in the halls the light has gone out of a room — not snuffed, taken — and it has not come back on.", "evt");
      z.roomSound(st.data, "From {dir}, small quick feet — everything little is leaving a room at once.");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + GLOAM_ACTIVE_MS;
      gloamStepAt = now + GLOAM_STEP_MS;
      gloamTakes(z, st.data!, now, true);
      break;
    }
    case "active": {
      // The ceiling: the walk ends wherever it stands.
      endGloam(z, st, now, st.data ?? null);
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      st.data = undefined;
      break;
    }
  }
}

async function tickBreach(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("breach");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("breach", st);
  }
  // The transient exits live in the in-memory world book, which a deploy or
  // reload rebuilds from D1 — so while the breach is open, re-assert them
  // every tick (idempotent). The wall stays down until the arc says otherwise.
  const pair = breachPairOf(z);
  if (st.phase === "active" && pair) {
    breachExitOpen(z, pair.a, pair.aDir, pair.b);
    breachExitOpen(z, pair.b, pair.bDir, pair.a);
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      // Pick a wall whose rooms both exist in this world build.
      const world = z.world!;
      const legal = BREACH_PAIRS.map((p, i) => ({ p, i }))
        .filter(({ p }) => world.rooms.has(p.a) && world.rooms.has(p.b));
      if (!legal.length) {
        st.until = NEVER;
        break;
      }
      const { p, i } = legal[randInt(0, legal.length - 1)];
      st.data = String(i);
      st.phase = "telegraph";
      st.until = now + BREACH_TELEGRAPH_MS;
      for (const roomId of [p.a, p.b]) {
        z.roomFeed(roomId, "The wall lets out a long, grinding groan. Dust sifts from the joints in the stone.", undefined, false, "evt");
        z.roomSound(roomId, "Stone grinds against stone {dir}, complaining.");
      }
      break;
    }
    case "telegraph": {
      const p = breachPairOf(z);
      if (!p) { st.phase = "idle"; st.until = NEVER; break; }
      st.phase = "active";
      st.until = now + BREACH_ACTIVE_MS;
      breachExitOpen(z, p.a, p.aDir, p.b);
      breachExitOpen(z, p.b, p.bDir, p.a);
      for (const [roomId, dir] of [[p.a, p.aDir], [p.b, p.bDir]] as const) {
        z.roomFeed(roomId, `The wall GIVES — stone comes down in a roar, and when the dust thins a ragged passage stands open ${dir}, where no passage was.`, undefined, false, "evt");
        z.roomSound(roomId, "Somewhere {dir}, a wall comes down in a long roar of stone.");
        z.refreshRoomCtx(roomId);
      }
      break;
    }
    case "active": {
      const p = breachPairOf(z);
      if (p) {
        breachExitClose(z, p.a, p.aDir, p.b);
        breachExitClose(z, p.b, p.bDir, p.a);
        for (const roomId of [p.a, p.b]) {
          z.roomFeed(roomId, "With a grinding sigh the rubble shifts, settles, and chokes the gap shut. The wall has decided to be a wall again.", undefined, false, "evt");
          z.refreshRoomCtx(roomId);
        }
      }
      st.phase = "aftermath";
      st.until = now + BREACH_AFTERMATH_MS;
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      st.data = undefined;
      break;
    }
  }
}

// ---- the exhale (deep) ----
// The deep breathes out: a cold current rolls through every below-ground
// room, and no open flame lives in it — carried torches die on the first
// beat, and none will catch until the air settles (light.cmdLight refuses;
// the hooded lantern's shuttered bead holds — its second argument, after the
// storm). No new teeth on purpose: a lightless deep is ambush weather the
// LURKERS already know how to use, and the pitch-dark rooms simply win.
async function tickExhale(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("exhale");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("exhale", st);
  }
  if (now < st.until) return;
  const inDeep = (roomId: string) => deepRoom(z, roomId);
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + EXHALE_TELEGRAPH_MS;
      feedWhere(z, inDeep, "The drips stop, all at once. A cold breath is rising from somewhere below, and every flame leans away from it.");
      z.roomFeedBands(DEEP_HEARD_BANDS, "Far below, the drip of the deep stops all at once. Something down there is drawing breath.", "evt");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + EXHALE_ACTIVE_MS;
      feedWhere(z, inDeep, "The deep breathes OUT — a cold current takes the room, and the dark comes with it.");
      z.roomFeedBands(DEEP_HEARD_BANDS, "A cold current comes up out of the deep and moves through the whole fortress, and every flame in it leans away.", "evt");
      for (const s of z.sessions.values()) exhaleSnuffsTorch(z, s);
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + EXHALE_AFTERMATH_MS;
      feedWhere(z, inDeep, "The current dies away. Somewhere, one drip falls — then another. The deep has finished its breath.");
      z.roomFeedBands(DEEP_HEARD_BANDS, "The current dies. Far down, the water starts falling again — the deep has finished its breath.", "evt");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}

// ---- the marrow-song (deep) ----
// A bone-voice hums one note, held past any breath, and every hollow thing
// below stands entranced — feet still, wake odds ZERO (songWakeMult): walk
// right past the bone-country's whole garrison. The loot corridor nobody
// trusts, because the flesh-things (drowners, crawlers) are agitated by the
// song instead — and because the bones wake up twitchy when it dies.
async function tickSong(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("song");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("song", st);
  }
  if (now < st.until) return;
  const inDeep = (roomId: string) => deepRoom(z, roomId);
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + SONG_TELEGRAPH_MS;
      feedWhere(z, inDeep, "Somewhere below, a bone-voice starts to hum — one note, held long past any breath.");
      z.roomFeedBands(DEEP_HEARD_BANDS, "A note comes up through the floor from somewhere very deep — one voice, held far past any breath a living thing has.", "evt");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + SONG_ACTIVE_MS;
      feedWhere(z, inDeep, "The song opens into the dark, and every hollow thing goes still at once — entranced, swaying where it stands.");
      z.roomFeedBands(DEEP_HEARD_BANDS, "The song is in the stone now. Everything hollow that can hear it has stopped moving and is swaying where it stands.", "evt");
      for (const c of z.creatures.values()) {
        if (!deepRoom(z, c.roomId)) continue;
        if (HOLLOW.has(c.templateId)) {
          c.nextWanderAt = Math.max(c.nextWanderAt, now + SONG_ACTIVE_MS); // rooted while it plays
        } else {
          c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 12_000)); // the flesh can't stand it
        }
      }
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + SONG_AFTERMATH_MS;
      feedWhere(z, inDeep, "The song thins, and dies. The bones remember themselves — and they remember badly.");
      z.roomFeedBands(DEEP_HEARD_BANDS, "The song thins out and stops, and the deep's dead remember themselves — badly.", "evt");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}

// ---- the tide (the Tideways — the crown) ----
// Four times a day, the wing below the water country drowns from the bottom
// up. Telegraph: the drips quicken and everything living climbs — their
// flight up past you IS the warning. Rising: the water takes one level per
// step (cradle first), snuffing torches and scattering what can't swim; a
// high tide (1 in 4) reaches even the breathing-hall. It holds at the crest,
// then lets go all at once — and what it carried washes down toward the low
// rooms, which is why the cradle's floor is a midden. Tides keep their own
// clock, like the bell: the moon does not roll dice.
function tideWingFeed(z: ZoneDO, line: string): void {
  feedWhere(z, (roomId) => TIDEWAYS_ROOMS.has(roomId) || roomId === "the-undertow" || roomId === "the-weir", line);
}

async function floodLevel(z: ZoneDO, rank: number, now: number): Promise<void> {
  for (const roomId of TIDE_LEVELS[rank] ?? []) {
    z.roomFeed(roomId, "The water comes UP — black and fast, over your knees, your waist, and still rising.", undefined, false, "evt");
    z.roomSound(roomId, "A great rush of water somewhere {dir}.");
    // What can't swim runs ahead of it (the posted and the drowned stay).
    for (const c of [...z.creatures.values()]) {
      if (c.roomId !== roomId || DROWNERS.has(c.templateId) || BROODERS.has(c.templateId) || SENTINELS.has(c.templateId)) continue;
      if (z.world!.mobTemplates.get(c.templateId)?.is_boss) continue;
      c.nextWanderAt = now;
    }
    for (const s of z.sessions.values()) {
      if (s.roomId === roomId) tideSoaksTorch(z, s);
    }
    z.refreshRoomCtx(roomId);
  }
}

// ---- THE SEA ---------------------------------------------------------------
//
// A CLOCK, not an event (see SEA_ROOMS in zone-data). It is always at one of
// four states and it never stops, so unlike every other arc in the world there
// is no "idle" that means nothing is happening — idle here means SLACK LOW,
// which is a state you plan a crossing around.
//
// The EventState phases carry it: idle = slack low, telegraph = the flood
// rising, active = high water holding, aftermath = the ebb falling. Level and
// crest live in `data` as "level:crest" so a deploy mid-tide comes back to the
// same water rather than dropping the sea on somebody's head.
// THE SEA IS THE SAME WATER AS THE TIDEWAYS (rome, 2026-08-11: the first cut
// "changes too fast" — and it did, because I gave it a clock of its own when
// the world already had exactly the right one).
//
// The deep's tide and the Crossing's sea are ONE TIDE, and they always were:
// the Tideways is a wing hanging below the water country and it floods because
// the sea outside floods. So there is no second clock. The sea reads the tide
// event and nothing else, which buys three things at once:
//
//   CADENCE   — one tide every 5-7 hours instead of a 30-minute metronome. The
//               causeway is a road you cross, and twice a day it stops being
//               one. That is what a causeway IS; the old cycle made it a
//               traffic light.
//   WARNING   — the deep's 3-minute telegraph is now the sea's. The water turns
//               and makes before it covers anything.
//   THE SPRING— TIDE_HIGH_ODDS is 0.25 and my invented SEA_SPRING_ODDS was
//               0.25. They were the same number describing the same night. A
//               high tide that takes the Breathing Hall below is now, on the
//               surface, the spring that takes the half-tide post and the weed
//               flat. One roll, two regions, and a player who learns the deep's
//               water has learned the Crossing's for free.
//
// A TIDE IS TWO THINGS, AND I ONLY BUILT ONE (rome, 2026-08-11: "what about
// every other event like RAIN"). The moon sets the hour and the WEATHER sets
// the height, and anybody who has stood on a coast knows the second one is the
// half that actually gets people killed. The first cut read the tide event and
// stopped there, which is how the causeway ended up open 95% of the time: an
// astronomical tide alone is a small, regular, forgettable thing.
//
// So the sea reads BOTH arcs the world already runs, and neither of them is
// new:
//   THE ASTRONOMICAL PART — the tide event (below). Sets the hour: one every
//                           5-7 hours, with its own 3-minute telegraph.
//   THE SURGE             — SETTLED RAIN. Not a shower; the 1-in-4 sky that
//                           "goes one flat colour, edge to edge" and stands for
//                           twenty to forty minutes. That weather pushes the
//                           water up a whole level, and it is the reason a
//                           crossing is dangerous on a bad afternoon at an hour
//                           that would be perfectly safe on a good one.
//
// The surge is also the DURATION the tide alone could not give. Settled rain
// runs 20-40 minutes against the tide's 15, from an existing arc with an
// existing telegraph, instead of another constant of mine arguing with the
// world's clock.
//
// And it stacks: rain on a spring tide is the worst water this country has.
// Rain at slack low is still a level, which is enough to shut the ford and the
// causeway's low ground — so "it has been raining all afternoon" becomes a
// reason to take the bridge, with no tide involved at all.
function seaSurge(z: ZoneDO): number {
  const r = z.events.get("rain");
  // The kind is cleared when the rain breaks (tickRain drops st.data going into
  // aftermath), so the surge is the standing-rain window and nothing after it.
  return r?.phase === "active" && r.data === "settled" ? 1 : 0;
}

// Sea level maps off the deep's rank: the surface stands one level higher than
// the wing below it, so a normal tide crests at half flood and the deep's high
// tide is the surface's spring — plus whatever the sky is adding.
function seaAstro(z: ZoneDO): number {
  const st = z.events.get("tide");
  if (!st) return 0;
  const deepCrest = st.data !== undefined ? Number(st.data) : 1;
  const crest = Math.min(SEA_CREST_SPRING, deepCrest + 1);
  switch (st.phase) {
    case "telegraph": return 1;                                   // it turns, and makes
    case "active": return Math.max(1, Math.min(crest, tideRank + 1));
    case "aftermath": return 1;                                   // and takes off again
    default: return 0;                                            // slack low
  }
}

// THE WATER IS THREE THINGS ADDED TOGETHER, and every one of them is an arc
// this world already runs:
//   THE SEA ARC   — the Crossing's own weather, a POOL entry on its own band
//                   exactly like the wood's rut. Rises to half flood and STANDS
//                   there for fourteen to twenty-six minutes, which is what a
//                   sea does and what a flooding cave never could.
//   THE TIDE      — the deep's, +1 while it is in. One water: the night the
//                   Tideways drown is a bad night to be on the causeway.
//   SETTLED RAIN  — the sky's, +1 while it stands. Not a shower.
// Alone, each is survivable and legible. Two together is the spring, and three
// is the worst water in the country — and all three arrive on clocks a player
// can already read from anywhere in the world.
export function seaLevel(z: ZoneDO): number {
  const st = z.events.get("sea");
  const arc = st?.phase === "active"
    ? (st.data === "S" ? SEA_CREST_NORMAL : Math.min(SEA_CREST_NORMAL, Number(st.data ?? "1") || 1))
    : st?.phase === "aftermath" ? 1
    : 0;
  const tide = seaAstro(z) > 0 ? 1 : 0;
  return Math.min(SEA_CREST_SPRING, arc + tide + seaSurge(z));
}

/** The height this water is making for, so a mark can warn about ground that is
 *  dry now and will not be. The sea arc always makes for half flood; whatever
 *  else is running on top of it is already in the sum. */
function seaCrest(z: ZoneDO): number {
  const st = z.events.get("sea");
  const arc = st && st.phase !== "idle" ? SEA_CREST_NORMAL : 0;
  const tide = seaAstro(z) > 0 ? 1 : 0;
  return Math.min(SEA_CREST_SPRING, Math.max(arc + tide + seaSurge(z), seaLevel(z)));
}

/** Is this room under water at the moment? */
export function seaUnder(z: ZoneDO, roomId: string): boolean {
  const rank = SEA_ROOMS.get(roomId);
  return rank !== undefined && seaLevel(z) >= rank;
}

/** Will it be, before this tide turns? The tide marks read this. */
export function seaWillCover(z: ZoneDO, roomId: string): boolean {
  const rank = SEA_ROOMS.get(roomId);
  return rank !== undefined && seaCrest(z) >= rank;
}

/** What the posts say. The region's only instrument, and it never lies. */
export function seaReading(z: ZoneDO): string {
  const st = z.events.get("tide");
  const name = SEA_STATES[seaLevel(z)] ?? "slack low";
  const going = st?.phase === "telegraph" ? " and making"
    : st?.phase === "aftermath" ? " and taking off"
    : st?.phase === "active" ? " and standing"
    : "";
  const spring = seaCrest(z) >= SEA_CREST_SPRING && st?.phase !== "idle" ? " It is a spring tide." : "";
  // The post cannot read the sky, but a person standing at it can, and the
  // water being a level higher than the hour accounts for is the single most
  // useful thing this region ever tells anybody.
  const surge = seaSurge(z) ? " The rain is standing on it and it is higher than the hour says." : "";
  return `${name}${going}.${spring}${surge}`;
}

/** Everything alive that cannot breathe water leaves a room the sea is taking. */
function seaDrives(z: ZoneDO, now: number, roomId: string): void {
  for (const c of z.creatures.values()) {
    if (c.roomId !== roomId || DROWNERS.has(c.templateId)) continue;
    if (BROODERS.has(c.templateId) || SENTINELS.has(c.templateId)) continue;
    if (z.world!.mobTemplates.get(c.templateId)?.is_boss) continue;
    c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(1000, 8000));
  }
}

// The last level the surface was SHOWN at, so the room feeds fire once on each
// change rather than every beat. Module-local like tideRank, and rebuilt from
// the tide's own state after a deploy — the water is wherever the tide says.
let seaShown = -1;

async function tickSea(z: ZoneDO, now: number): Promise<void> {
  // No Crossing in this world build, no sea. (The region ships in mig 190.)
  if (!z.world!.rooms.has("the-refuge")) return;
  let st = z.events.get("sea");
  if (!st) { st = { phase: "idle", until: NEVER }; z.events.set("sea", st); }  // NEVER: the roll owns the sky

  if (now >= st.until) {
    switch (st.phase) {
      case "idle":
        st.phase = "telegraph";
        st.until = now + SEA_TELEGRAPH_MS;
        st.data = "0";
        z.roomFeedBands(SEA_HEARD_BANDS, "Out on the crossing the water turns. It stops going out, stands a moment, and starts to make.", "evt");
        break;
      case "telegraph":
        st.phase = "active";
        st.data = "1";
        st.until = now + SEA_MAKE_MS;
        break;
      case "active": {
        // `data` carries the rise: "1", "2", then "S" for the stand at the top.
        // EventState has four phases and a sea needs five states, so the stand
        // lives inside `active` rather than borrowing a phase that means
        // something else everywhere in this file.
        const at = st.data ?? "1";
        if (at === "S") { st.phase = "aftermath"; st.until = now + SEA_EBB_MS; break; }
        const rank = Number(at) || 1;
        if (rank < SEA_CREST_NORMAL) {
          st.data = String(rank + 1);
          st.until = now + SEA_MAKE_MS;
        } else {
          st.data = "S";
          st.until = now + randInt(SEA_STAND_MIN_MS, SEA_STAND_MAX_MS);
        }
        break;
      }
      case "aftermath":
        st.phase = "idle";
        st.until = NEVER;
        st.data = undefined;
        z.roomFeedBands(SEA_HEARD_BANDS, "Slack low on the crossing. The causeway is a road again.", "evt");
        break;
    }
  }
  const level = seaLevel(z);

  // THE WATER WORKS EVERY BEAT IT IS UP, exactly as the spate does. Cold and
  // depth rather than current — the sea does not sweep you anywhere, it simply
  // takes the road away and keeps taking it. Every flooded room keeps all its
  // exits, so this can never pen anybody in: wade on, wade back, or make the
  // refuge, and all three are always available.
  if (level > 0) {
    for (const s of [...z.sessions.values()]) {
      if (z.outOfWorld(s) || s.hp <= 0 || !seaUnder(z, s.roomId)) continue;
      s.hp -= SEA_BITE;
      if (s.hp <= 0) {
        z.send(s, "The water closes over the road and then over you, and it is very cold, and there is a great deal of it.", "death big");
        await z.onPlayerDeath(s, null);
        continue;
      }
      tideSoaksTorch(z, s);
      z.send(s, pick([
        `The water is over the road here and pushing, steady and cold, and you cannot see your own feet. [${s.hp}/${s.maxHp} hp]`,
        `Sea to the thigh, and moving, and the stone under it is exactly as wide as it was and no help at all. [${s.hp}/${s.maxHp} hp]`,
        `Cold gets in under everything and stays there. The road is somewhere below this. [${s.hp}/${s.maxHp} hp]`,
      ]), "dmgin");
      z.sendStatus(s);
    }
  }

  if (level === seaShown) return;
  const was = seaShown;
  seaShown = level;
  if (was < 0) return;  // first tick after a load: adopt the water, announce nothing

  for (const [roomId, rank] of SEA_ROOMS) {
    if (!z.world!.rooms.has(roomId)) continue;
    const wasUnder = was >= rank, nowUnder = level >= rank;
    if (wasUnder === nowUnder) continue;
    if (nowUnder) {
      z.roomFeed(roomId, "The water comes over — not fast, not a wave, just the road going away under it.", undefined, false, "evt");
      z.roomSound(roomId, "Water goes over stone {dir}, and keeps going.");
      seaDrives(z, now, roomId);
      for (const s of z.sessions.values()) if (s.roomId === roomId) tideSoaksTorch(z, s);
    } else {
      z.roomFeed(roomId, "The water goes off the stone and leaves it running and black and walkable again.", undefined, false, "evt");
    }
    z.refreshRoomCtx(roomId);
  }

  if (level > was) {
    z.roomFeedBands(SEA_HEARD_BANDS, level === 1
      ? "Out on the crossing the water turns and starts to make. The low ground is going first."
      : level >= SEA_CREST_SPRING
      ? "The crossing is at high water and it is a spring — the half-tide post is under, and so is the weed flat."
      : "Half flood on the crossing. The causeway is under from the middle out, and the ford is gone.", "evt");
  } else if (level === 0) {
    z.roomFeedBands(SEA_HEARD_BANDS, "Slack low on the crossing. The causeway is a road again.", "evt");
  } else {
    z.roomFeedBands(SEA_HEARD_BANDS, "The crossing turns. The water stops standing and starts to go.", "evt");
  }
}

async function tickTide(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("tide");
  if (!st) {
    st = { phase: "idle", until: now + randInt(TIDE_FIRST_MIN_MS, TIDE_FIRST_MAX_MS) };
    z.events.set("tide", st);
  }
  // A deploy mid-tide dissolves the water table (module-local): rebuild it at
  // the crest — the state says the tide is in, so the tide is in.
  const crest = st.data !== undefined ? Number(st.data) : 1;
  if (st.phase === "active" && tideRank < 0) {
    tideRank = crest;
    tideStepAt = 0;
  }
  // The rise: one level per step, until the crest.
  if (st.phase === "active" && tideRank < crest && now >= tideStepAt) {
    tideRank += 1;
    tideStepAt = now + TIDE_STEP_MS;
    await floodLevel(z, tideRank, now);
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      // The wing has to exist in this world build (069 shipped) to drown.
      if (!z.world!.rooms.has("the-still-cradle")) {
        st.until = now + TIDE_EVERY_MAX_MS;
        break;
      }
      // Slept past the hour: it rose and fell unobserved.
      if (now - st.until > TIDE_GRACE_MS) {
        st.until = now + randInt(TIDE_EVERY_MIN_MS, TIDE_EVERY_MAX_MS);
        break;
      }
      st.phase = "telegraph";
      st.until = now + TIDE_TELEGRAPH_MS;
      st.data = String(chance(TIDE_HIGH_ODDS) ? TIDE_LEVELS.length - 1 : Math.max(0, TIDE_LEVELS.length - 2));
      tideWingFeed(z, "The drips quicken, everywhere at once — a patter, then a drumming. Below, something vast is inhaling.");
      // The wing gets the water; the rest of the fortress gets the news of it.
      // An arc that drowns a whole region and is inaudible one floor up was the
      // starkest hole in the world's voice (rome, 2026-08-10).
      z.roomFeedBands(DEEP_HEARD_BANDS, "Far below the keep the dripping quickens into a drumming. Something vast down there is drawing water in.", "evt");
      // Everything living starts climbing (tideDrives biases their walk up).
      for (const c of z.creatures.values()) {
        if (TIDEWAYS_ROOMS.has(c.roomId) && !DROWNERS.has(c.templateId)) {
          c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 10_000));
        }
      }
      break;
    }
    case "telegraph": {
      st.phase = "active";
      const crestRank = Number(st.data ?? "1");
      tideRank = 0;
      tideStepAt = now + TIDE_STEP_MS;
      st.until = now + TIDE_STEP_MS * (crestRank + 1) + TIDE_CREST_MS;
      tideWingFeed(z, "The tide comes in. Below you, stone starts to drown.");
      z.roomFeedBands(DEEP_HEARD_BANDS, "The tide is in. A whole wing of the deep is going under, and the water is still climbing.", "evt");
      await floodLevel(z, 0, now);
      // The drowners' hour: everything of theirs in the deep ranges wide.
      for (const c of z.creatures.values()) {
        if (DROWNERS.has(c.templateId) && DEEP_ROOMS.has(c.roomId)) {
          c.nextWanderAt = Math.min(c.nextWanderAt, now + randInt(2000, 10_000));
        }
      }
      break;
    }
    case "active": {
      // The water lets go all at once — and what it carried settles low.
      const crestRank = Math.max(0, tideRank);
      for (let rank = crestRank; rank >= 1; rank--) {
        for (const roomId of TIDE_LEVELS[rank] ?? []) {
          const floor = z.ground.get(roomId);
          if (!floor?.length) continue;
          const kept: string[] = [];
          const below = TIDE_LEVELS[rank - 1];
          for (const id of floor) {
            if (chance(TIDE_SILT_ODDS) && below?.length) {
              const to = below[randInt(0, below.length - 1)];
              z.ground.set(to, [...(z.ground.get(to) ?? []), id]);
            } else {
              kept.push(id);
            }
          }
          if (kept.length) z.ground.set(roomId, kept); else z.ground.delete(roomId);
          z.refreshRoomCtx(roomId);
        }
      }
      for (const roomId of TIDE_LEVELS[0]) z.refreshRoomCtx(roomId);
      tideRank = -1;
      // Fresh water, fresh appetites: the wing's pools forget every angler.
      z.fishStock.delete("the-eel-run");
      z.fishStock.delete("the-breathing-hall");
      st.phase = "aftermath";
      st.until = now + TIDE_AFTERMATH_MS;
      tideWingFeed(z, "The water lets go all at once, sucking down through the stone. What it carried, it leaves — low.");
      z.roomFeedBands(DEEP_HEARD_BANDS, "The water lets go, all at once, and drains back down out of the deep.", "evt");
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = now + randInt(TIDE_EVERY_MIN_MS, TIDE_EVERY_MAX_MS);
      st.data = undefined;
      break;
    }
  }
}

// ---- the crows (outdoors) ----
// Carrion birds settle on every high thing and call out whatever crosses the
// open ground: every player under the sky hears where the others move
// (crowsMark, hooked from cmdGo). Anti-stealth, fully diegetic.
async function tickCrows(z: ZoneDO, now: number): Promise<void> {
  let st = z.events.get("crows");
  if (!st) {
    st = { phase: "idle", until: NEVER };
    z.events.set("crows", st);
  }
  if (now < st.until) return;
  switch (st.phase) {
    case "idle": {
      st.phase = "telegraph";
      st.until = now + CROWS_TELEGRAPH_MS;
      feedOutdoors(z, "Crows come in over the walls — dozens of them, wheeling, dropping onto every high thing to watch.");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + CROWS_ACTIVE_MS;
      feedOutdoors(z, "The crows settle, and go quiet. Nothing crosses the open ground unremarked now.");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + CROWS_AFTERMATH_MS;
      feedOutdoors(z, "As one, the crows rise — a black sheet of wings — scatter, and are gone beyond the walls.");
      crowSeen.clear();
      break;
    }
    case "aftermath": {
      st.phase = "idle";
      st.until = NEVER;
      break;
    }
  }
}
