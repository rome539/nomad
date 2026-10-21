// Fatigue is stored in twentieths; walking adds tenths of combat's effort.
// Recovery uses elapsed milliseconds; changing modes never replays old time.
export type RecoveryMode = "combat" | "passive" | "rest" | "shelter" | "fire";
export interface Exhaustion { units: number; at: number; mode: RecoveryMode; walkingUntil?: number }
export const FATIGUE_CAP = 1000;
// CATCHING YOUR BREATH (rome, 2026-10-12): on your feet nothing comes back
// until you have stood still and out of a fight this long - after your last
// step, or after the fight ends. Sitting down to rest, the gatehouse and the
// fire skip it: rest is how you get your wind back. (Was 4 s, walking only.)
export const WALK_RECOVERY_DELAY_MS = 15_000;
// Units back per second (rome, 2026-10-11: slower, at about the pace health
// mends). From full: resting or sheltered 17/s - just under a minute - by the
// fire 25/s, forty seconds; on your feet 10/s, a hundred seconds, as it always
// was. Nothing comes back in a fight. Whole
// units per second are whole THOUSANDTHS per millisecond, and recover()
// quantizes at thousandths, so many short syncs land exactly where one long
// one does (test-combat checks it).
const RATE: Record<RecoveryMode, number> = { combat: 0, passive: 10, rest: 17, shelter: 17, fire: 25 };
export function readExhaustion(raw: string | undefined, now: number): Exhaustion {
  try {
    const e = JSON.parse(raw ?? "null");
    if (e && Number.isFinite(e.units) && Number.isFinite(e.at) && Object.hasOwn(RATE, e.mode)) {
      const state: Exhaustion = { units: Math.max(0, Math.min(FATIGUE_CAP, e.units)), at: e.at, mode: e.mode };
      if (Number.isFinite(e.walkingUntil) && e.walkingUntil > e.at)
        state.walkingUntil = Math.min(e.walkingUntil, e.at + WALK_RECOVERY_DELAY_MS);
      return state;
    }
  } catch {}
  return { units: 0, at: now, mode: "passive" };
}
export function recover(e: Exhaustion, now: number, nextMode: RecoveryMode = e.mode): void {
  const at = Math.max(e.at, now);
  // Quantize at thousandths so many short intervals cannot drift across a
  // damage step (see RATE).
  // Standing recovery waits out the breath; rest does not. Split elapsed time
  // at the deadline so idle ticks and reconnects cannot recover the waiting span.
  const from = e.mode === "passive" ? Math.max(e.at, Math.min(at, e.walkingUntil ?? e.at)) : e.at;
  e.units = Math.max(0, Math.round((e.units - (at - from) * RATE[e.mode] / 1000) * 1000) / 1000);
  // A fight just ended: the breath starts now.
  if (e.mode === "combat" && nextMode !== "combat") e.walkingUntil = at + WALK_RECOVERY_DELAY_MS;
  e.at = at;
  e.mode = nextMode;
  if ((e.walkingUntil ?? 0) <= at || nextMode === "rest" || nextMode === "shelter" || nextMode === "fire")
    delete e.walkingUntil;
}
// WHAT A SWING COSTS, once a round (rome, 2026-10-12): mostly the weight you
// carry into it, in kilograms. 16 + 0.4 a kilo: everyone is spent inside about
// four minutes of fighting, bare hands included; the heaviest kit there is
// (41 kg) in about two, plate and shield (34) in a little over two, a light
// epic kit (8) in three and a half.
export function swingCost(weight: number): number {
  return 16 + 0.4 * Math.max(0, weight);
}
export function exert(e: Exhaustion, weight: number): void {
  e.units = Math.min(FATIGUE_CAP, e.units + swingCost(weight));
}
export function walk(e: Exhaustion, weight: number, now: number): void {
  recover(e, now);
  e.units = Math.min(FATIGUE_CAP, Math.round((e.units + (20 + 1.1 * Math.max(0, weight)) / 10) * 100) / 100);
  e.walkingUntil = e.at + WALK_RECOVERY_DELAY_MS;
}
// THREE STEPS, NOT FIVE (rome, 2026-10-12): -3 a quarter of the way down, -6 at
// half, -9 for the last quarter. (Was -2 every 200 units, five steps to -10.)
export function playerPenalty(e?: Exhaustion): number { return 3 * Math.min(3, Math.floor((e?.units ?? 0) / 250)); }
export function playerDamage(damage: number, e?: Exhaustion): number { return Math.max(1, damage - playerPenalty(e)); }
export function recoveryRemaining(e: Exhaustion): number | null {
  if (!RATE[e.mode]) return null;
  const wait = e.units && e.mode === "passive" ? Math.max(0, (e.walkingUntil ?? e.at) - e.at) / 1000 : 0;
  return wait + e.units / RATE[e.mode];
}

// Explicit identities, including runners (whose existing wind clock is retained)
// and the dead/constructed things that do not acquire biological exhaustion.
// [attempts to full exhaustion, maximum raw damage loss, full recovery seconds,
//  effort after which heavy knockdown stops (0 for non-heavies)].
export const CREATURE_ENDURANCE: Record<string, readonly [number, number, number, number]> = {
  "a-fold-dog": [32, 3, 32, 0],
  "a-lymer": [32, 3, 32, 0],
  "albino-rat": [16, 2, 20, 0],
  "bittern": [0, 0, 0, 0],
  "black-backed-gull": [20, 3, 32, 0],
  "bone-breaker": [20, 3, 32, 0],
  "bone-knight": [0, 0, 0, 0],
  "brood-rat": [16, 2, 20, 0],
  "brooding-vulture": [20, 3, 36, 0],
  "bull-seal": [12, 3, 28, 0],
  "carrion-vulture": [20, 3, 32, 0],
  "cave-lion": [6, 4, 24, 3],
  "charcoal-burner": [0, 0, 0, 0],
  "conger": [24, 3, 40, 0],
  "cutpurse": [24, 3, 32, 0],
  "cutthroat": [24, 3, 32, 0],
  "devil-crab": [16, 2, 20, 0],
  "dire-hyena": [32, 3, 32, 0],
  "dire-wolf": [32, 3, 32, 0],
  "dog-otter": [0, 0, 0, 0],
  "drove-dog": [32, 3, 32, 0],
  "drowned-god": [0, 0, 0, 0],
  "drowned-hulk": [0, 0, 0, 0],
  "eagle-owl": [20, 3, 32, 0],
  "ermine": [12, 2, 24, 0],
  "eyrie-holder": [20, 3, 32, 0],
  "fen-viper": [12, 2, 24, 0],
  "feral-goat": [12, 3, 28, 0],
  "fleet-rat": [0, 0, 0, 0],
  "footpad": [24, 3, 32, 0],
  "ford-eel": [12, 2, 24, 0],
  "forgotten-king": [0, 0, 0, 0],
  "gibbet-crow": [0, 0, 0, 0],
  "gill-adder": [12, 2, 24, 0],
  "glutton": [10, 4, 32, 5],
  "grave-hyena": [32, 3, 32, 0],
  "great-gull": [20, 3, 32, 0],
  "great-vulture": [20, 3, 32, 0],
  "grey-heron": [0, 0, 0, 0],
  "grey-seal": [12, 3, 28, 0],
  "grey-wolf": [32, 3, 32, 0],
  "hill-eagle": [20, 3, 32, 0],
  "hill-fox": [12, 2, 24, 0],
  "hill-wolf": [32, 3, 32, 0],
  "last-watchman": [0, 0, 0, 0],
  "lead-dog": [32, 3, 32, 0],
  "lead-wolf": [32, 3, 32, 0],
  "lynx": [12, 2, 24, 0],
  "marrow-cantor": [0, 0, 0, 0],
  "marrow-king": [0, 0, 0, 0],
  "marsh-hound": [40, 2, 32, 0],
  "masterless-dog": [32, 3, 32, 0],
  "mountain-chough": [0, 0, 0, 0],
  "mountain-hare": [0, 0, 0, 0],
  "old-billy": [12, 3, 28, 0],
  "old-boar": [12, 3, 28, 0],
  "old-conger": [24, 3, 40, 0],
  "otter": [0, 0, 0, 0],
  "oystercatcher": [0, 0, 0, 0],
  "pale-crawler": [16, 3, 32, 0],
  "pale-stalker": [16, 3, 32, 0],
  "ptarmigan": [0, 0, 0, 0],
  "rag-and-bone": [16, 2, 40, 0],
  "rat": [16, 2, 20, 0],
  "red-hind": [0, 0, 0, 0],
  "red-stag": [12, 3, 28, 0],
  "wood-stag": [12, 3, 28, 0],
  "road-carrier": [32, 2, 32, 0],
  "roe-deer": [0, 0, 0, 0],
  "root-thing": [0, 0, 0, 0],
  "scarp-raven": [20, 3, 32, 0],
  "silver-eel": [12, 2, 24, 0],
  "skeleton": [0, 0, 0, 0],
  "snow-fox": [12, 2, 24, 0],
  "snow-hare": [0, 0, 0, 0],
  "something-ahead": [0, 0, 0, 0],
  "stone-adder": [12, 2, 24, 0],
  "strand-thief": [24, 3, 32, 0],
  "the-baited-bear": [8, 5, 40, 4],
  "brown-bear": [8, 5, 40, 4],
  "tawny-owl": [20, 3, 32, 0],
  "wood-sloth": [0, 0, 0, 0],
  "hedgehog": [0, 0, 0, 0],
  "the-bellfounder": [0, 0, 0, 0],
  "the-blue-fox": [12, 2, 24, 0],
  "the-bone-dropper": [20, 3, 32, 0],
  "the-bridge-mason": [0, 0, 0, 0],
  "the-butter-wife": [0, 0, 0, 0],
  "the-chain-breaker": [10, 6, 48, 5],
  "the-chainman": [0, 0, 0, 0],
  "the-dancer": [12, 2, 24, 0],
  "the-drake": [30, 4, 60, 0],
  "the-drove-master": [32, 3, 32, 0],
  "the-drover": [0, 0, 0, 0],
  "the-drowned": [0, 0, 0, 0],
  "the-drowned-ferryman": [0, 0, 0, 0],
  "the-eel-cutter": [0, 0, 0, 0],
  "the-follower": [0, 0, 0, 0],
  "the-fowler": [0, 0, 0, 0],
  "the-gaunt": [6, 4, 32, 3],
  "the-gravid-adder": [12, 2, 24, 0],
  "the-great-crab": [24, 4, 60, 0],
  "the-great-devil-crab": [30, 5, 72, 0],
  "the-herd": [0, 0, 0, 0],
  "the-keeper-of-the-holding": [0, 0, 0, 0],
  "the-last-dog": [32, 3, 32, 0],
  "the-long-warden": [0, 0, 0, 0],
  "the-milker": [0, 0, 0, 0],
  "the-miller": [0, 0, 0, 0],
  "the-mire-walker": [0, 0, 0, 0],
  "the-old-glutton": [12, 5, 40, 6],
  "the-old-grey": [40, 3, 40, 0], // an old wolf: longer in the wind than its pack, and it knows how to spend it
  "the-old-raven": [20, 3, 32, 0],
  "the-one-who-stayed": [0, 0, 0, 0],
  "the-pale-drake": [24, 4, 80, 0],
  "the-pilot": [0, 0, 0, 0],
  "the-raiding-fox": [12, 2, 24, 0],
  "the-reed-walker": [0, 0, 0, 0],
  "the-refuge-man": [0, 0, 0, 0],
  "the-salt-widow": [0, 0, 0, 0],
  "the-sapper": [0, 0, 0, 0],
  "the-scaffold-hand": [0, 0, 0, 0],
  "the-tide-warden": [0, 0, 0, 0],
  "the-toll-clerk": [0, 0, 0, 0],
  "the-tom": [12, 2, 24, 0],
  "the-woodward": [0, 0, 0, 0],
  "the-wrecker": [24, 3, 32, 0],
  "three-hound": [24, 4, 48, 0],
  "thrice-dead": [0, 0, 0, 0],
  "twice-dead": [0, 0, 0, 0],
  "two-hound": [32, 3, 40, 0],
  "verdigris-thing": [0, 0, 0, 0],
  "warden": [0, 0, 0, 0],
  "warden-captain": [0, 0, 0, 0],
  "warden-surface": [0, 0, 0, 0],
  "wayman": [24, 3, 32, 0],
  "white-roe": [0, 0, 0, 0],
  "wild-boar": [12, 3, 28, 0],
  "wildcat": [12, 2, 24, 0],
  "wrack-crab": [16, 2, 20, 0],
};
export interface CreatureEffort { effort: number; at: number; fighting: boolean; beat: number; penalty: number; before: number }
type Body = { templateId: string; exertion?: CreatureEffort };
export function recoverCreature(c: Body, now: number, fighting: boolean): void {
  const e = c.exertion, p = CREATURE_ENDURANCE[c.templateId];
  if (!e || !p?.[0]) return;
  if (!e.fighting && !fighting && e.effort === 0) return;
  const at = Math.max(now, e.at);
  if (!e.fighting) e.effort = Math.max(0, e.effort - (at - e.at) * p[0] / (p[2] * 1000));
  e.at = at;
  e.fighting = fighting;
}
// A miss/block still spends effort; extra hits in the same beat do not. The
// penalty belongs to the effort BEFORE this beat, just like player fatigue.
export function creatureAttempt(c: Body, now: number): void {
  const p = CREATURE_ENDURANCE[c.templateId];
  if (!p?.[0]) return;
  recoverCreature(c, now, true);
  const e = c.exertion ??= { effort: 0, at: now, fighting: true, beat: -1, penalty: 0, before: 0 };
  const beat = Math.floor(now / 4000);
  if (e.beat === beat) return;
  e.beat = beat;
  e.before = e.effort;
  e.penalty = Math.min(p[1], Math.floor((e.effort * p[1] + 1e-9) / p[0]));
  e.effort = Math.min(p[0], e.effort + 1);
}
export function creatureDamage(c: Body, damage: number): number { return Math.max(1, damage - (c.exertion?.penalty ?? 0)); }
export function heavyTired(c: Body): boolean {
  const threshold = CREATURE_ENDURANCE[c.templateId]?.[3];
  return !!threshold && (c.exertion?.before ?? 0) >= threshold;
}
