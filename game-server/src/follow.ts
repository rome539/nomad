// FOLLOW (rome, 2026-11-03). `follow luna`, and when Luna takes an exit you take
// the same one right behind her. It is a real step: cmdGo runs for you exactly
// as if you had typed the direction, so it costs the same load, makes the same
// noise and meets the same refusals. Nothing about the world is made easier;
// the only thing saved is the typing.
//
// No leave is asked. You can fall in behind a stranger; they are told once that
// you have, and a look at you shows it while you stand together.
//
// IT ENDS TWO WAYS AND ONLY TWO: you say `follow` with no name, or you go into a
// room on your own. Anything else leaves you standing and still following — in
// a fight (walking off would be fleeing, and nobody flees by accident), resting,
// behind a door at the counter, or when they go where you can't (a door shut to
// you, their den, an animal path you have never seen used). When they come back
// past you and move on, you fall in again.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { nameMatches } from "./zone-util";
import { cmdGo } from "./verbs";

export function cmdFollow(z: ZoneDO, session: Session, arg: string): void {
  const name = arg.trim();
  if (!name) {
    const leader = session.following ? z.sessions.get(session.following) : undefined;
    if (!session.following) return z.send(session, "follow <name>: fall in behind someone here.");
    session.following = undefined;
    return z.send(session, leader ? `You stop following ${leader.name}.` : "You stop following.");
  }
  const mark = [...z.sessions.values()].find(
    (s) => s.roomId === session.roomId && s.pubkey !== session.pubkey && z.reachable(s) && nameMatches(s.name, name),
  );
  if (!mark) return z.send(session, "No one by that name is here.");
  if (session.following === mark.pubkey) return z.send(session, `You are already following ${mark.name}.`);
  session.following = mark.pubkey;
  z.send(session, `You fall in behind ${mark.name}.`);
  z.send(mark, `${session.name} falls in behind you.`, "who");
}

// Going into a room on your own ends it. Called at the moment your own step
// lands (cmdGo), never for a step taken behind someone.
export function walkedAlone(z: ZoneDO, session: Session): void {
  if (!session.following) return;
  const leader = z.sessions.get(session.following);
  session.following = undefined;
  z.send(session, leader ? `You stop following ${leader.name}.` : "You stop following.");
}

// Who can take the step behind a leader right now. The rest stay put, still
// following.
export function canStep(z: ZoneDO, s: Session): boolean {
  return !z.outOfWorld(s) && !s.away && !s.resting && !z.inCombat(s) && s.hp > 0;
}

// The leader has just gone `dir` out of `from`: everyone following them who was
// standing there comes after, in turn (each of them may have followers too).
export async function after(z: ZoneDO, leader: Session, from: string, dir: string): Promise<void> {
  for (const s of [...z.sessions.values()]) {
    if (s.following !== leader.pubkey || s.pubkey === leader.pubkey || s.roomId !== from) continue;
    if (!canStep(z, s)) continue;
    // A step is effort, and a posture does not survive it — the same silent drop
    // the command line does before a typed step (zone.ts).
    if (s.pose) { s.pose = undefined; s.poseAt = undefined; s.poseRef = undefined; z.sendStatus(s); }
    z.send(s, `You follow ${leader.name} ${dir}.`);
    await cmdGo(z, s, dir, true);
  }
}

// The clause a look at a follower carries, while the one they follow stands there too.
export function followRead(z: ZoneDO, s: Session): string {
  const leader = s.following ? z.sessions.get(s.following) : undefined;
  return leader && leader.roomId === s.roomId ? `They keep close behind ${leader.name}.` : "";
}
