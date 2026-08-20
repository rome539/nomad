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
import * as den from "./den";
import { recordPvpKill, deedsBump, trait, hasTrait } from "./world";
import {
  STANCE, RECKLESS_MISS, PLAYER_DMG_MIN, PLAYER_DMG_MAX, CRIT_CHANCE, FUMBLE_CHANCE,
  WOUNDED_FRACTION, WOUNDED_DMG_MULT, WOUNDED_FUMBLE_BONUS, WOUNDED_DROP_ODDS,
  AMBUSH_MULT, VITALS_PVP, STAGGER_BONUS, BLEED_TICKS, BLEED_STACK_CAP,
  PADDED_STUN_MULT, ARMOR_WEAR, WEAPON_WEAR,
  MANCATCHER_PVP_HOBBLE, CRIT_FLOURISH, WARDHIDE_WOUND_ODDS,
  BLOOD_FRESH_MS, BLOOD_DRY_MS, BLOOD_FADE_MS,
  FEED_STUN, FEED_BLEED, FEED_HOBBLE, FEED_PVP_HIT, FEED_REST_CAUGHT,
  playerBleedOdds,
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
  // A BARRED DOOR STOPS PEOPLE (mig 172). Either side of it: you cannot reach
  // in, and you cannot reach out — the bar is a piece of oak, not a shooting
  // slit. Steel between two people inside the SAME den is another matter, and
  // it is exactly the betrayal bloodDrawn exists to punish.
  if (!den.reachable(z, session.pubkey, other.pubkey)) {
    return z.send(session, den.shelteredInDen(z, other.pubkey)
      ? `${other.name} is behind a barred door. It does not move for you.`
      : "You are behind your own bar. Lift it and step out if you want this.");
  }
  // Rung senseless: the same debt tickPvp pays below, owed by the VERB too.
  // Without this a stunned fighter could open on a wanderer by hand and keep
  // the ambush blow — the one swing the daze is supposed to cost them.
  if (session.stunned) {
    session.stunned = false;
    z.send(session, "Your head still rings — the moment to swing slips past you.", "stun");
    z.sendStatus(session);
    return;
  }
  const unaware = other.pvpTarget !== session.pubkey;
  session.pvpTarget = other.pubkey;
  if (!other.pvpTarget) other.pvpTarget = session.pubkey; // steel answers steel
  z.actorFeed(session, session.roomId,
    other.resting ? z.feedProc(FEED_REST_CAUGHT, session.name, other.name)
    : unaware ? `${session.name} falls on ${other.name} without warning!`
    : `${session.name} turns on ${other.name}!`, "fight", true, other.pubkey); // the target reads the blow in their own log — don't echo the third-person account back to them
  z.combatNoise(session.roomId);
  // STEEL UNDER SOMEBODY ELSE'S ROOF ENDS YOUR WELCOME IN IT, for good (mig
  // 171). Fires on the SWING, not the kill: the betrayal is drawing on your host
  // at all, and a failed murder must not be cheaper than a successful one.
  await den.bloodDrawn(z, session.roomId, session, other);
  await swingAt(z, session, other, { body: true, ambush: unaware });
  // A heavy blunt opener was the whole beat (2026-08-20): the same cost the
  // PvE opener pays (zone.ts sets openedHeavy for a stun weapon's ambush) —
  // tickPvp consumes the flag and skips the next round's swings, so a skull-
  // headed maul doesn't get the free ×1.5 AND the full round on top.
  const openerWeapon = z.equippedItem(session, "weapon");
  if (unaware && other.hp > 0 && openerWeapon && openerWeapon.tmpl.stun > 0) {
    session.openedHeavy = true;
  }
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
      || prey.roomId !== attacker.roomId || z.outOfWorld(prey) || z.outOfWorld(attacker)
      || !z.reachable(prey) || !z.reachable(attacker)) {
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
    // A heavy blunt opener was the whole beat (2026-08-20): the same debt the
    // PvE round pays — the ambush's ×1.5 was the swing, so this round's is
    // gone while the head is slow to rise.
    if (attacker.openedHeavy) {
      attacker.openedHeavy = false;
      z.send(attacker, "You put it all into that opening blow; the heavy head is slow to rise again.", "dmgout");
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
  // THE AMBUSH IS A GUARANTEED FIRST STRIKE (2026-08-20). COMBAT.md's ambush
  // rule — "one immediate strike at ×1.5, before the beat, before it can
  // answer. Crit applies; fumble does not" — is implemented that way on the
  // PvE opener (cmdAttack rolls none of these). The PvP opener used to run
  // the whole defensive chain first, so a "falls on X without warning!" blow
  // could whiff — or fumble the blade onto the stones. An ambush rolls none
  // of the four; the defender's REACH still strips the ×1.5 below, but the
  // blow itself lands.
  const ambush = !!opts.ambush;
  // Every attack is a gamble — a wild swing can fling your blade to the
  // stones, where your victim is as free to snatch it as anyone.
  if (!ambush && chance(FUMBLE_CHANCE + (hurt ? WOUNDED_FUMBLE_BONUS : 0))) {
    const dropsIt = hurt && weaponAtStart && chance(WOUNDED_DROP_ODDS);
    await z.playerFumble(attacker, dropsIt ? weaponAtStart : null);
    return;
  }
  // The reckless tax: a wild swing — all shoulder, no aim — carries you wide,
  // and leaves you open (staggered) for the answer. You keep your grip; it's a
  // whiff, not a fumble. The price that keeps the 1.5x stance an honest gamble.
  if (!ambush && attacker.stance === "reckless" && chance(RECKLESS_MISS)) {
    attacker.staggered = true;
    z.send(attacker, `You swing to wound — too hard, and it carries you wide. An opening.`, "fumble");
    z.send(defender, `${attacker.name} swings wild and reckless; the blow sails past you.`, "dodge");
    z.combatNoise(attacker.roomId);
    return;
  }
  // Quick feet: a light load slips a blow entirely, scaling down as the kit
  // gets heavier (dodgeBonus) — plate slips nothing.
  if (!ambush && chance(z.dodgeBonus(defender))) {
    z.send(attacker, `${defender.name} sways clear of your swing, light on their feet.`);
    z.send(defender, `${attacker.name} swings — you slip aside, nothing weighing you down.`, "dodge");
    z.combatNoise(attacker.roomId);
    return;
  }
  // A shield (or parrying blade) can catch the blow whole — and answer.
  if (!ambush && chance(z.equippedBlock(defender))) {
    const shield = z.equippedItem(defender, "shield");
    const parry = z.equippedItem(defender, "weapon");
    const catcher = shield ?? ((parry?.tmpl.block ?? 0) > 0 ? parry : null);
    const sh = catcher?.tmpl.name ?? "their shield";
    z.send(attacker, `${defender.name} catches your blow on ${sh}.`, "block");
    z.send(defender, `You take ${attacker.name}'s blow on ${sh}; it jars up your arm and holds.`, "block");
    if (catcher) await z.wear(defender, catcher.carried, catcher.tmpl, ARMOR_WEAR);
    const spike = shield ? trait(shield.tmpl, "thorns") : undefined;
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
    const rip = shield ? trait(shield.tmpl, "riposte") : undefined;
    if (rip && attacker.hp > 0) {
      const fresh = !attacker.bleedTicks;
      attacker.bleedTicks = z.bleedTicksFor(attacker); // staunched gear clots it sooner
      // The riposte STACKS on top of any weapon bleed (capped) — a separate wound.
      attacker.bleedDmg = Math.min(BLEED_STACK_CAP, (attacker.bleedDmg ?? 0) + rip);
      if (fresh) z.send(defender, `You answer over the turned blow — the point nicks deep, and ${attacker.name} starts to bleed.`, "dmgout");
    }
    z.combatNoise(attacker.roomId);
    return;
  }
  // The blow lands. Only the first swing of a round has your shoulder in it;
  // fast steel's follow-ups carry the edge alone — the PvE rule, unchanged.
  const weapon = z.equippedItem(attacker, "weapon");
  const body = opts.body ? randInt(PLAYER_DMG_MIN, PLAYER_DMG_MAX) : 0;
  let dmg = Math.round((body + (weapon ? z.effDmg(weapon) : 0)) * STANCE[attacker.stance].atk * z.wallDrag(attacker));
  if (hurt) { dmg = Math.round(dmg * WOUNDED_DMG_MULT); z.tellWounded(attacker); }
  let flourish = ".";
  // REACH blunts a PvP ambush the same way it blunts a monster's (zone.ts's
  // creatureFirstStrike): a haft held at length means the attacker arrives on
  // the point first, whoever they are — the fiction doesn't carve out an
  // exception for people. Reads the DEFENDER's own weapon, not the attacker's.
  const defWeapon = z.equippedItem(defender, "weapon");
  const atLength = opts.ambush && defWeapon !== null && hasTrait(defWeapon.tmpl, "reach");
  if (opts.ambush && !atLength) {
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
  // A wanderer's blow on a wanderer subtracts armor FLAT, floored at 1 — the
  // player-swing pipeline (COMBAT.md: "your blows subtract mob armor flat...
  // their blows are curved"). This ran the creature-hit curve before
  // (2026-08-20), so the same weapon/armor matchup played materially tankier
  // in PvP than in PvE (12 dmg vs 11 armor: flat → 1, curve → 6). The stance
  // share still applies after, exactly as it does to every landed blow.
  const effArmor = Math.max(0, z.equippedArmor(defender) - z.armorIgnore(weapon));
  dmg = Math.max(1, dmg - effArmor);
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
      : `${attacker.name} ${weapon ? `opens you with ${weapon.tmpl.name}` : "clouts you"} for ${dmg}${opts.ambush && !atLength ? " — you never saw it coming" : ""} — and the stones come up to meet you.`, vkill ? "dmgin big vital" : "dmgin big");
    // The killer reads their killing blow too — the SAME hit line as any
    // other swing, with the number, just ending in the body. Without this the
    // fatal swing collapsed to a bare "You put X down" with no damage shown,
    // and a foe at the edge seemed to die from nothing (rome, 2026-07-12).
    await pvpKill(z, attacker, defender,
      vkill
        ? z.vitalsHit(vkill, defender.name)
        : `${z.playerHit(weapon, defender.name)} for ${dmg} — and ${defender.name} goes down.`,
      !!vkill);
    if (weapon) await z.wear(attacker, weapon.carried, weapon.tmpl, WEAPON_WEAR);
    // A man-kill goes into the steel like any other — heavier, if anything.
    if (weapon?.carried.loreId) await deedsBump(z.env.DB, weapon.carried.loreId, "kills");
    return;
  }
  const realAmbush = opts.ambush && !atLength;
  const big = flourish !== "." || realAmbush || staggerHit;
  // Say WHY a number is big: the crit flourish the attacker already gets, plus
  // the opening this blow cashed in (staggerHit) — and the victim, who used to
  // see only a bare number, now reads the crit AND the opening too.
  const openAtk = staggerHit ? " — they were wide open" : "";
  const critVic = flourish !== "." ? " — it catches you square" : "";
  const openVic = staggerHit ? " — you were caught open" : "";
  z.send(attacker, `${z.playerHit(weapon, defender.name)} for ${dmg}${flourish === "." ? "" : flourish}${openAtk}. (${conditionOf(defender)})`, big ? "dmgout big" : "dmgout");
  z.send(defender, `${attacker.name} ${weapon ? `opens you with ${weapon.tmpl.name}` : "clouts you"} for ${dmg}${realAmbush ? " — you never saw it coming" : critVic}${openVic}. [${defender.hp}/${defender.maxHp} hp]`, big ? "dmgin big" : "dmgin");
  z.sendStatus(defender);
  z.combatNoise(attacker.roomId);
  // A duel is rare and worth watching turn: the crowd sees the heavy blows land
  // (a crit, the ambush, the opening cashed in), not just the opener and the end.
  if (big) z.actorFeed(attacker, attacker.roomId, z.feedProc(FEED_PVP_HIT, attacker.name, defender.name), "fight", true, defender.pubkey);
  // A blunt weapon can ring the skull — one lost beat, never chained; the
  // padded coif takes the ring out of half of them.
  if (weapon && weapon.tmpl.stun > 0 && !defender.stunned) {
    const odds = z.wearsTrait(defender, "padded") ? weapon.tmpl.stun * PADDED_STUN_MULT : weapon.tmpl.stun;
    if (chance(odds)) {
      defender.stunned = true;
      z.send(defender, `${attacker.name} lands like a falling stone — your skull rings and the room tilts.`, "stun");
      z.send(attacker, `${defender.name} reels, stunned.`, "stun");
      z.actorFeed(attacker, attacker.roomId, z.feedProc(FEED_STUN, attacker.name, defender.name), "stun", true, defender.pubkey);
      z.sendStatus(defender); // the earlier status push (pre-stun) missed the flag — light the pill now it's set
    }
  }
  // A cutting edge opens a wound that keeps weeping — unless hide thick
  // enough to turn it takes the cut (the ward covers the whole wound family).
  // Bleed is a per-hit CHANCE (playerBleedOdds, the same tune the PvE round
  // rolls): the PvP path was the one path that tune never reached (2026-08-20)
  // — every landed cut opened a wound here, roughly doubling the DoT.
  const effBleed = weapon && weapon.tmpl.bleed > 0
    ? chance(playerBleedOdds(weapon.tmpl.dmg, weapon.tmpl.bleed))
      ? weapon.tmpl.bleed + (z.itemRolled(weapon, "keen") ? 1 : 0)
      : 0
    : 0;
  if (effBleed > 0) {
    if (z.wearsTrait(defender, "wardhide") && !chance(WARDHIDE_WOUND_ODDS)) {
      z.send(defender, `${attacker.name}'s edge drags across the thick hide — it holds.`, "block");
    } else {
      const fresh = !defender.bleedTicks;
      defender.bleedTicks = z.bleedTicksFor(defender); // staunched gear clots it sooner
      defender.bleedDmg = Math.max(defender.bleedDmg ?? 0, effBleed);
      if (fresh) z.actorFeed(attacker, attacker.roomId, z.feedProc(FEED_BLEED, attacker.name, defender.name), "bleed", true, defender.pubkey);
    }
  }
  // The man-catcher's PvP rule, exactly as written the day it was forged:
  // against players the barbs HOBBLE — never hold. Flee stays the out.
  const offhand = z.equippedItem(attacker, "shield");
  if (offhand && hasTrait(offhand.tmpl, "mancatcher") && !defender.hobbled && chance(MANCATCHER_PVP_HOBBLE)) {
    defender.hobbled = true;
    defender.limpingSince = undefined;
    z.send(defender, `The barbs of ${offhand.tmpl.name} rake your leg out from under you — it won't carry you clean now. (rest to mend it)`, "dmgin");
    z.send(attacker, `The barbs catch ${defender.name}'s leg — they won't run clean now.`);
    z.sendStatus(defender); // light the defender's 'hobbled' pill on the set, not just on clear
    z.actorFeed(attacker, attacker.roomId, z.feedProc(FEED_HOBBLE, attacker.name, defender.name), "hobble", true, defender.pubkey);
  }
  if (worn) await z.wear(defender, worn.carried, worn.tmpl, ARMOR_WEAR);
  if (weapon) await z.wear(attacker, weapon.carried, weapon.tmpl, WEAPON_WEAR);
}

// The kill: tallied on the killer's ledger (self-publishable only — the
// world's narration never names killers to the relays), blood marked on
// their hands, and the victim through the one death path there has ever
// been. EVERYTHING drops, seals cracked.
export async function pvpKill(z: ZoneDO, killer: Session, victim: Session, killLine?: string, vital = false): Promise<void> {
  killer.pvpKills += 1;
  await recordPvpKill(z.env.DB, killer.pubkey);
  markBlood(z, killer);
  z.send(killer, killLine ?? `You put ${victim.name} down.`, vital ? "dmgout big vital" : "dmgout big");
  // The crowd's copy — the victor named, under the killer's OWN key (a brag, not
  // the world snitching), sized big on a vitals kill. onPlayerDeath holds its
  // tongue for a PvP death, so this is the one line the feed carries for the fall.
  z.actorFeed(killer, killer.roomId, z.feedPvpKill(killer.name, victim.name, vital), vital ? "vital" : "kill", true, victim.pubkey);
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
