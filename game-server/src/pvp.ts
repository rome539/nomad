// PvP — steel between wanderers. The law was written long before this file:
// witnesses are the sound system, evidence is blood on the killer (never a
// name on a wall), fresh keys are weak, and no dice ever punish the
// aggressor. A player kill runs the same death path as any death — and that
// path already scatters EVERYTHING, seals cracked (rome's rule, 2026-07-05):
// murder is the only way to truly lose what's yours, and it was always going
// to be. This file only teaches the combat spine that some prey swings back
// with a mind behind it. Same dice, same stances, same fat-tailed gambles —
// a fumbled blade lands on the stones for ANYONE'S hand, the murderer's
// victim included.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { chance, randInt, pick } from "./rng";
import { recordPvpKill } from "./world";
import {
  STANCE, RECKLESS_MISS, ARMOR_K, PLAYER_DMG_MIN, PLAYER_DMG_MAX, CRIT_CHANCE, FUMBLE_CHANCE,
  WOUNDED_FRACTION, WOUNDED_DMG_MULT, WOUNDED_FUMBLE_BONUS, WOUNDED_DROP_ODDS,
  AMBUSH_MULT, VITALS_PVP, DODGE_LIGHT, STAGGER_BONUS, BLEED_TICKS,
  PADDED, PADDED_STUN_MULT, ARMOR_WEAR, WEAPON_WEAR, THORNS, PARRY_RIPOSTE,
  MANCATCHER, MANCATCHER_PVP_HOBBLE, CRIT_FLOURISH, WARDHIDE, WARDHIDE_WOUND_ODDS,
  BLOOD_FRESH_MS, BLOOD_DRY_MS, BLOOD_FADE_MS,
} from "./zone-data";

// How hurt the other one looks — the same buckets as selfExamine, because
// you never see a stranger's numbers, only how they carry themselves.
function conditionOf(s: Session): string {
  const f = s.hp / s.maxHp;
  if (f >= 1) return "unhurt";
  if (f > 0.66) return "bruised but standing";
  if (f > 0.33) return "badly hurt";
  return "at the very edge of it";
}

// attack <wanderer> — the entry. No duel request, no consent screen:
// crossing paths armed IS the social contract. The ambush rule knows no
// species: the first blow against someone who hasn't marked you lands heavy.
export async function attackPlayer(z: ZoneDO, session: Session, other: Session): Promise<void> {
  if (other.pubkey === session.pubkey) {
    return z.send(session, "The dungeon will get to you without your help.");
  }
  if (z.outOfWorld(other)) {
    return z.send(session, `${other.name} has stepped out of the world — nothing can reach them at the gate's bench.`);
  }
  const unaware = other.pvpTarget !== session.pubkey;
  session.pvpTarget = other.pubkey;
  if (!other.pvpTarget) other.pvpTarget = session.pubkey; // steel answers steel
  z.roomFeed(session.roomId, unaware
    ? `${session.name} falls on ${other.name} without warning!`
    : `${session.name} turns on ${other.name}!`, session.pubkey);
  z.combatNoise(session.roomId);
  await swingAt(z, session, other, { body: true, ambush: unaware });
  z.refreshRoomCtx(session.roomId);
  await z.persist();
  await z.ensureAlarm();
}

// The exchange, every combat round: whoever still holds steel out swings.
// The one who struck first got the free heavy blow at engagement; from here
// the round order is join order — nobody's dice are privileged. Walking out
// of the room ends the exchange (the chase is a walk; see verbs.cmdGo).
export async function tickPvp(z: ZoneDO): Promise<void> {
  for (const attacker of [...z.sessions.values()]) {
    if (!attacker.pvpTarget) continue;
    const prey = z.sessions.get(attacker.pvpTarget);
    if (!prey || prey.hp <= 0 || attacker.hp <= 0
      || prey.roomId !== attacker.roomId || z.outOfWorld(prey) || z.outOfWorld(attacker)) {
      attacker.pvpTarget = null;
      continue;
    }
    // Rung senseless: the swing is gone. (A fighter in a mixed melee may have
    // already paid the stun to the creature phase — one debt, not two.)
    if (attacker.stunned) {
      attacker.stunned = false;
      z.send(attacker, "Your head still rings — the moment to swing slips past you.", "stun");
      z.sendStatus(attacker);
      continue;
    }
    const speed = Math.max(1, z.equippedItem(attacker, "weapon")?.tmpl.speed ?? 1);
    for (let s = 0; s < speed; s++) {
      if (!attacker.pvpTarget || prey.hp <= 0) break;
      if (!z.canLandBlow(prey.pubkey)) break; // the dogpile cap counts knives with minds behind them too
      await swingAt(z, attacker, prey, { body: s === 0 });
    }
  }
}

// One swing of one wanderer at another — the whole PvE gamble, retold:
// fumble (and maybe lose the blade to the floor), the light-footed dodge,
// the shield catch with its spike and riposte, then the blow through armor
// mitigation and stance, the vitals lottery, stun, bleed, and the barbs.
async function swingAt(
  z: ZoneDO,
  attacker: Session,
  defender: Session,
  opts: { body?: boolean; ambush?: boolean },
): Promise<void> {
  const hurt = attacker.hp < attacker.maxHp * WOUNDED_FRACTION;
  const weaponAtStart = z.equippedItem(attacker, "weapon");
  // Every attack is a gamble — a wild swing can fling your blade to the
  // stones, where your victim is as free to snatch it as anyone.
  if (chance(FUMBLE_CHANCE + (hurt ? WOUNDED_FUMBLE_BONUS : 0))) {
    const dropsIt = hurt && weaponAtStart && chance(WOUNDED_DROP_ODDS);
    await z.playerFumble(attacker, dropsIt ? weaponAtStart : null);
    return;
  }
  // The reckless tax: a wild swing — all shoulder, no aim — carries you wide,
  // and leaves you open (staggered) for the answer. You keep your grip; it's a
  // whiff, not a fumble. The price that keeps the 1.5x stance an honest gamble.
  if (attacker.stance === "reckless" && chance(RECKLESS_MISS)) {
    attacker.staggered = true;
    z.send(attacker, `You swing to wound — too hard, and it carries you wide. An opening.`, "fumble");
    z.send(defender, `${attacker.name} swings wild and reckless; the blow sails past you.`, "dodge");
    z.combatNoise(attacker.roomId);
    return;
  }
  // Quick feet: carrying no worn weight slips a blow entirely — unless the
  // pack's loose iron drags at you. Too much to slip anything.
  if (z.wornWeight(defender) === 0 && !z.burdened(defender) && chance(DODGE_LIGHT)) {
    z.send(attacker, `${defender.name} sways clear of your swing, light on their feet.`);
    z.send(defender, `${attacker.name} swings — you slip aside, nothing weighing you down.`, "dodge");
    z.combatNoise(attacker.roomId);
    return;
  }
  // A shield (or parrying blade) can catch the blow whole — and answer.
  if (chance(z.equippedBlock(defender))) {
    const shield = z.equippedItem(defender, "shield");
    const parry = z.equippedItem(defender, "weapon");
    const catcher = shield ?? ((parry?.tmpl.block ?? 0) > 0 ? parry : null);
    const sh = catcher?.tmpl.name ?? "their shield";
    z.send(attacker, `${defender.name} catches your blow on ${sh}.`, "block");
    z.send(defender, `You take ${attacker.name}'s blow on ${sh}; it jars up your arm and holds.`, "block");
    if (catcher) await z.wear(defender, catcher.carried, catcher.tmpl, ARMOR_WEAR);
    const spike = shield ? THORNS.get(shield.tmpl.id) : undefined;
    if (spike) {
      attacker.hp -= spike;
      if (attacker.hp <= 0) {
        z.send(attacker, `Your own swing carries you onto the spike — it goes in under the ribs, and the strength runs out of you.`, "dmgin big");
        z.send(defender, `${attacker.name} drives themselves onto the spike — and doesn't come off it.`, "dmgout big");
        await pvpKill(z, defender, attacker);
        return;
      }
      z.send(attacker, `You drive yourself onto the spike — ${spike} back. [${attacker.hp}/${attacker.maxHp} hp]`, "dmgin");
      z.sendStatus(attacker);
    }
    // The parrying blade answers down the line of the turn — and unlike the
    // hollow, a wanderer has blood to lose.
    const rip = shield ? PARRY_RIPOSTE.get(shield.tmpl.id) : undefined;
    if (rip && attacker.hp > 0) {
      const fresh = !attacker.bleedTicks;
      attacker.bleedTicks = BLEED_TICKS;
      attacker.bleedDmg = Math.max(attacker.bleedDmg ?? 0, rip);
      if (fresh) z.send(defender, `You answer over the turned blow — the point nicks deep, and ${attacker.name} starts to bleed.`, "dmgout");
    }
    z.combatNoise(attacker.roomId);
    return;
  }
  // The blow lands. Only the first swing of a round has your shoulder in it;
  // fast steel's follow-ups carry the edge alone — the PvE rule, unchanged.
  const weapon = z.equippedItem(attacker, "weapon");
  const body = opts.body ? randInt(PLAYER_DMG_MIN, PLAYER_DMG_MAX) : 0;
  let dmg = Math.round((body + (weapon ? z.effDmg(weapon) : 0)) * STANCE[attacker.stance].atk);
  if (hurt) { dmg = Math.round(dmg * WOUNDED_DMG_MULT); z.tellWounded(attacker); }
  let flourish = ".";
  if (opts.ambush) {
    dmg = Math.round(dmg * AMBUSH_MULT); // the surprise IS the crit — never both
  } else if (chance(CRIT_CHANCE)) {
    dmg *= 2;
    flourish = pick(CRIT_FLOURISH);
  }
  let staggerHit = false;
  if (defender.staggered) {
    dmg += STAGGER_BONUS;
    defender.staggered = false;
    staggerHit = true; // this blow cashed in an opening — say so on the line
  }
  // Worn armor thins the blow but never closes it; a point or a dead weight
  // ignores some of it; then the defender's stance takes its share.
  const effArmor = Math.max(0, z.equippedArmor(defender) - z.armorIgnore(weapon));
  dmg = Math.max(1, Math.round(dmg * ARMOR_K / (effArmor + ARMOR_K)));
  dmg = Math.max(1, Math.round(dmg * STANCE[defender.stance].def));
  defender.hp -= dmg;
  // The vitals lottery, wanderer against wanderer: VITALS_PVP, armor over
  // the vitals buying the odds down. Instant — the Tarkov headshot.
  // One wound, picked once: the killer's account and the victim's come from the
  // same entry, so they can never contradict each other about where it landed.
  let vkill: { hit: string; taken: string } | null = null;
  if (defender.hp > 0 && z.vitalsLottery(z.equippedArmor(defender), VITALS_PVP)) {
    defender.hp = 0;
    vkill = z.pickVitals(weapon);
  }
  if (defender.resting) {
    defender.resting = false;
    z.send(defender, "You are dragged from your rest.");
  }
  const worn = z.equippedItem(defender, "armor");
  if (defender.hp <= 0) {
    // The loser reads their own death: the throat-shot names itself (a vitals
    // kill at half health otherwise looks like a bug), and an ordinary killing
    // blow prints like any other hit — just with the floor at the end of it.
    z.send(defender, vkill
      ? `${attacker.name}'s ${weapon ? weapon.tmpl.name.replace(/^(a|an|the)\s+/i, "") : "fist"} finds the mark. ${vkill.taken}`
      : `${attacker.name} ${weapon ? `opens you with ${weapon.tmpl.name}` : "clouts you"} for ${dmg}${opts.ambush ? " — you never saw it coming" : ""} — and the stones come up to meet you.`, "dmgin big");
    // The killer reads their killing blow too — the SAME hit line as any
    // other swing, with the number, just ending in the body. Without this the
    // fatal swing collapsed to a bare "You put X down" with no damage shown,
    // and a foe at the edge seemed to die from nothing (rome, 2026-07-12).
    await pvpKill(z, attacker, defender,
      vkill
        ? z.vitalsHit(vkill, defender.name)
        : `${z.playerHit(weapon, defender.name)} for ${dmg} — and ${defender.name} goes down.`);
    if (weapon) await z.wear(attacker, weapon.carried, weapon.tmpl, WEAPON_WEAR);
    return;
  }
  const big = flourish !== "." || opts.ambush || staggerHit;
  // Say WHY a number is big: the crit flourish the attacker already gets, plus
  // the opening this blow cashed in (staggerHit) — and the victim, who used to
  // see only a bare number, now reads the crit AND the opening too.
  const openAtk = staggerHit ? " — they were wide open" : "";
  const critVic = flourish !== "." ? " — it catches you square" : "";
  const openVic = staggerHit ? " — you were caught open" : "";
  z.send(attacker, `${z.playerHit(weapon, defender.name)} for ${dmg}${flourish === "." ? "" : flourish}${openAtk}. (${conditionOf(defender)})`, big ? "dmgout big" : "dmgout");
  z.send(defender, `${attacker.name} ${weapon ? `opens you with ${weapon.tmpl.name}` : "clouts you"} for ${dmg}${opts.ambush ? " — you never saw it coming" : critVic}${openVic}. [${defender.hp}/${defender.maxHp} hp]`, big ? "dmgin big" : "dmgin");
  z.sendStatus(defender);
  z.combatNoise(attacker.roomId);
  // A blunt weapon can ring the skull — one lost beat, never chained; the
  // padded coif takes the ring out of half of them.
  if (weapon && weapon.tmpl.stun > 0 && !defender.stunned) {
    const odds = z.wearsTrait(defender, PADDED) ? weapon.tmpl.stun * PADDED_STUN_MULT : weapon.tmpl.stun;
    if (chance(odds)) {
      defender.stunned = true;
      z.send(defender, `${attacker.name} lands like a falling stone — your skull rings and the room tilts.`, "stun");
      z.send(attacker, `${defender.name} reels, stunned.`, "stun");
    }
  }
  // A cutting edge opens a wound that keeps weeping — unless hide thick
  // enough to turn it takes the cut (the ward covers the whole wound family).
  if (weapon && weapon.tmpl.bleed > 0) {
    if (z.wearsTrait(defender, WARDHIDE) && !chance(WARDHIDE_WOUND_ODDS)) {
      z.send(defender, `${attacker.name}'s edge drags across the thick hide — it holds.`, "block");
    } else {
      defender.bleedTicks = BLEED_TICKS;
      defender.bleedDmg = Math.max(defender.bleedDmg ?? 0, weapon.tmpl.bleed);
    }
  }
  // The man-catcher's PvP rule, exactly as written the day it was forged:
  // against players the barbs HOBBLE — never hold. Flee stays the out.
  const offhand = z.equippedItem(attacker, "shield");
  if (offhand && MANCATCHER.has(offhand.tmpl.id) && !defender.hobbled && chance(MANCATCHER_PVP_HOBBLE)) {
    defender.hobbled = true;
    defender.limpingSince = undefined;
    z.send(defender, `The barbs of ${offhand.tmpl.name} rake your leg out from under you — it won't carry you clean now. (rest to mend it)`, "dmgin");
    z.send(attacker, `The barbs catch ${defender.name}'s leg — they won't run clean now.`);
  }
  if (worn) await z.wear(defender, worn.carried, worn.tmpl, ARMOR_WEAR);
  if (weapon) await z.wear(attacker, weapon.carried, weapon.tmpl, WEAPON_WEAR);
}

// The kill: tallied on the killer's ledger (self-publishable only — the
// world's narration never names killers to the relays), blood marked on
// their hands, and the victim through the one death path there has ever
// been. EVERYTHING drops, seals cracked.
export async function pvpKill(z: ZoneDO, killer: Session, victim: Session, killLine?: string): Promise<void> {
  killer.pvpKills += 1;
  await recordPvpKill(z.env.DB, killer.pubkey);
  markBlood(z, killer);
  z.send(killer, killLine ?? `You put ${victim.name} down.`, "dmgout big");
  await z.onPlayerDeath(victim, null, killer.name);
}

// ---- blood on the killer, not names on the wall ----
// The world doesn't snitch: death traces stay victim-only, and the evidence
// walks around on the murderer. Man-blood reads different from a beast's,
// ages through buckets, and stacks for repeat killers. Finding out who did
// it means meeting them and looking close — this clause is only ever shown
// to someone standing in the same room.
export function markBlood(z: ZoneDO, killer: Session): void {
  const marks = z.bloodOn.get(killer.pubkey) ?? [];
  marks.push(Date.now());
  z.bloodOn.set(killer.pubkey, marks.slice(-12));
}

export function bloodClause(z: ZoneDO, pubkey: string): string {
  const now = Date.now();
  const kept = (z.bloodOn.get(pubkey) ?? []).filter((t) => now - t < BLOOD_FADE_MS);
  if (kept.length === 0) {
    if (z.bloodOn.has(pubkey)) z.bloodOn.delete(pubkey);
    return "";
  }
  z.bloodOn.set(pubkey, kept);
  const age = now - Math.max(...kept);
  const layered = kept.length > 1 ? ", layered over older stains" : "";
  if (age < BLOOD_FRESH_MS) return ` There is blood on them that is not a beast's — fresh${layered}.`;
  if (age < BLOOD_DRY_MS) return ` Dried blood darkens their hands${layered} — and it is not a beast's.`;
  return ` Old man-blood is worked into their knuckles${layered}.`;
}

// The mark rides the living — but it can be scrubbed. Blood fades on its own
// (the buckets above); water is how a killer hurries it. Any still water, or
// the open rain, will take it (rome, 2026-07-12). Two ways: a deliberate WASH
// at the water gets ALL of it at once; standing in the rain runs it off a
// layer at a time — the accumulated stains first, the freshest kill clinging
// last. Neither is secret: a witness sees the scrubbing.
export function isBloodied(z: ZoneDO, pubkey: string): boolean {
  const now = Date.now();
  return (z.bloodOn.get(pubkey) ?? []).some((t) => now - t < BLOOD_FADE_MS);
}

export function washBlood(z: ZoneDO, pubkey: string): boolean {
  const had = isBloodied(z, pubkey);
  z.bloodOn.delete(pubkey);
  return had;
}

// One tick's worth of rain: strip the oldest stain. Emptied, the sky has run
// you clean — and that's the one moment the killer is told (you never see your
// own blood otherwise; only the room does).
export function rainThinsBlood(z: ZoneDO, session: Session): void {
  const marks = z.bloodOn.get(session.pubkey);
  if (!marks || marks.length === 0) return;
  marks.shift();
  if (marks.length === 0) {
    z.bloodOn.delete(session.pubkey);
    z.send(session, "The rain runs red off your hands, then runs clear. The last of it is gone.", "study");
  } else {
    z.bloodOn.set(session.pubkey, marks);
  }
}
