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
import {
  OUTDOOR_ROOMS, WARRENS_ROOMS, TRACE_LIFE_MS, FISHING_SURFACE, HOLLOW,
  ROLL_EVERY_MIN_MS, ROLL_EVERY_MAX_MS, ROLL_FIRST_MIN_MS, ROLL_FIRST_MAX_MS,
  ROLL_GRACE_MS, ROLL_MISSED_MIN_MS, ROLL_MISSED_MAX_MS,
  RAIN_TELEGRAPH_MS, RAIN_ACTIVE_MIN_MS, RAIN_ACTIVE_MAX_MS, RAIN_AFTERMATH_MS,
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
  TIDEWAYS_ROOMS, TIDE_LEVELS, TIDE_HIGH_ODDS,
  TIDE_EVERY_MIN_MS, TIDE_EVERY_MAX_MS, TIDE_FIRST_MIN_MS, TIDE_FIRST_MAX_MS, TIDE_GRACE_MS,
  TIDE_TELEGRAPH_MS, TIDE_STEP_MS, TIDE_CREST_MS, TIDE_AFTERMATH_MS, TIDE_SILT_ODDS,
  BROODERS, SENTINELS, DROWNERS, DEEP_ROOMS,
  GLOAM_TELEGRAPH_MS, GLOAM_STEP_MS, GLOAM_ACTIVE_MS, GLOAM_AFTERMATH_MS,
} from "./zone-data";

// An idle arc waits here until the roll (or the bell's hours) wakes it.
const NEVER = 9_000_000_000_000_000;

// The pool the roll draws from, weighted: weather stays the commonest sky,
// the loosed Gaunt the rarest. The bell is NOT here — it keeps its own hours.
const POOL: [string, number][] = [
  ["rain", 3], ["boil", 2], ["wake", 2], ["want", 2], ["lights", 2], ["crows", 2],
  ["exhale", 2], ["song", 2], ["fog", 2], ["cold", 2], ["gloam", 2], ["escape", 1],
  // ["breach", 1], — PARKED (rome, 2026-07-11: "park the breech"). The whole
  // arc (tickBreach, BREACH_PAIRS, the wall prose) stays built and idle;
  // restoring it is uncommenting this ticket.
];

// ---- queries (the hooks elsewhere read these) ----

export function phaseOf(z: ZoneDO, id: string): EventState["phase"] {
  return z.events.get(id)?.phase ?? "idle";
}

// Is the rain ON this room right now? (Active phase only — the toggles hang
// off this: torch-drowning, sound-masking, bold scavengers.)
export function raining(z: ZoneDO, roomId: string): boolean {
  return phaseOf(z, "rain") === "active" && OUTDOOR_ROOMS.has(roomId);
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
  feedWhere(z, (roomId) => OUTDOOR_ROOMS.has(roomId), line);
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
  await tickCrows(z, now);
  await tickExhale(z, now);
  await tickSong(z, now);
  await tickFog(z, now);
  await tickCold(z, now);
  await tickGloam(z, now);
  await tickBreach(z, now);
  await tickTide(z, now);
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
  // Only one thing at a time falls out of the sky: if any arc is still
  // mid-run (or the bell rings, or the tide is in), this roll passes — quiet
  // is a result too.
  if (POOL.some(([id]) => phaseOf(z, id) !== "idle") || phaseOf(z, "bell") !== "idle" || phaseOf(z, "tide") !== "idle") return;
  const total = POOL.reduce((sum, [, w]) => sum + w, 0);
  let n = randInt(1, total);
  let picked = POOL[0][0];
  for (const [id, w] of POOL) {
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
      feedOutdoors(z, "The light goes iron-grey. The air smells of rain coming.");
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
      st.until = now + randInt(RAIN_ACTIVE_MIN_MS, RAIN_ACTIVE_MAX_MS);
      feedOutdoors(z, "The sky opens. Rain comes down in earnest, loud on stone and thorn.");
      for (const s of z.sessions.values()) rainSoaksTorch(z, s);
      // Fresh water wakes the still pools: the surface waters forget every
      // angler at once (the storm bite is real, not just faster misses).
      for (const roomId of FISHING_SURFACE) z.fishStock.delete(roomId);
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + RAIN_AFTERMATH_MS;
      feedOutdoors(z, "The rain slackens, and stops. What blood and tracks the ground held have run off into the mud.");
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
// near the same times, never to the minute. Nobody rings it. One warning note
// hangs; then the ringing — ninety seconds where every listener in the keep
// hears EVERYTHING and the vermin bolt for the warrens (which makes a boil
// likelier in the way events are allowed to: bias, never a trigger). Then the
// worse part: the silence after, with the halls still listening.
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
      st.phase = "telegraph";
      st.until = now + BELL_TELEGRAPH_MS;
      feedWhere(z, inKeep, "Somewhere above, a single bell-note rolls through the halls — then silence.");
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + BELL_ACTIVE_MS;
      feedWhere(z, inKeep, "The bell begins to RING — over and over, iron on iron, and the keep is waking around you.");
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
      feedWhere(z, inKeep, "The bell stops. The silence after is worse — the halls are still listening.");
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
      z.addTrace(start, { kind: "scraps", at: now });
      break;
    }
    case "active": {
      // Ceiling reached with the tide still out: it drains where it stands.
      boilIdx = -1;
      st.phase = "aftermath";
      st.until = now + BOIL_AFTERMATH_MS;
      feedWhere(z, inWarrens, "The squeaking fades, down into the earth. The warrens breathe again.");
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
        break;
      }
      st.phase = "active";
      st.until = now + WAKE_ACTIVE_MS;
      feedWhere(z, inWarrens, "The dead are not staying down tonight.");
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
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + WANT_AFTERMATH_MS;
      feedWhere(z, inGate, "The keeper wipes the chalk from his hatch. Whatever he wanted it for, the moment has passed.");
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
      z.roomFeedAll("Far off, a long starving cry cuts short — and does not come again.", "evt");
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
      z.roomFeedAll("From somewhere far under the keep, a long, starving cry rolls up through the stone — and then the sound of something giving way.", "evt");
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
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + LIGHTS_ACTIVE_MS;
      nextFalseStepAt = now + randInt(LIGHTS_STEP_MIN_MS, LIGHTS_STEP_MAX_MS);
      feedWhere(z, inFen, "A light shows out over the water — steady, like a carried torch. It doesn't move like a man's.");
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + LIGHTS_AFTERMATH_MS;
      feedWhere(z, inFen, "The lights go out — all at once, like a breath blown out over a candle.");
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
      feedWhere(z, inCold, "The air goes glass-clear and bitter, sharpening by the breath.");
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
      feedWhere(z, inCold, "The cold settles in hard. Flames pinch small, and everything living goes to ground.");
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
      feedWhere(z, inCold, "The bitter edge goes out of the air, slowly, like something unclenching.");
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
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + EXHALE_ACTIVE_MS;
      feedWhere(z, inDeep, "The deep breathes OUT — a cold current takes the room, and the dark comes with it.");
      for (const s of z.sessions.values()) exhaleSnuffsTorch(z, s);
      break;
    }
    case "active": {
      st.phase = "aftermath";
      st.until = now + EXHALE_AFTERMATH_MS;
      feedWhere(z, inDeep, "The current dies away. Somewhere, one drip falls — then another. The deep has finished its breath.");
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
      break;
    }
    case "telegraph": {
      st.phase = "active";
      st.until = now + SONG_ACTIVE_MS;
      feedWhere(z, inDeep, "The song opens into the dark, and every hollow thing goes still at once — entranced, swaying where it stands.");
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
