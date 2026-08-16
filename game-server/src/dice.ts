// THE BONES — the gatehouse dice game (rome, 2026-08-12).
//
// A wager, played at the one table in the world where nothing can kill you. It
// is push-your-luck, which is the same grammar as everything else here: you go
// again, or you walk out with what you have, and the only question the game
// ever asks is how much is enough.
//
// ── THE GAME ─────────────────────────────────────────────────────────────────
//
//   • an opening cast of two bones, then one bone at a time
//   • over DICE_BUST and you are out, on the spot
//   • 'stand' takes your number and holds it
//   • the answering hand must BEAT you; a tie is a push and the stakes go back
//
// THE ORDER OF PLAY IS THE HOUSE EDGE, and it is the only edge there is. The
// one who called the game rolls FIRST, and a first roller who busts has lost
// before the other side touches a bone — the answering hand never has to risk
// anything against a wreck. That is what it costs to be the one who says "bones?"
// No loaded dice, no rake, no percentages: just the plain disadvantage of going
// first, which every player can see and nobody has to be told about.
//
// ── WHAT IS ON THE TABLE ─────────────────────────────────────────────────────
//
// Trophies, or nothing. Not gear (a bad night should not strip a wanderer of
// their armour), not food, not tender. A trophy is the right size for a wager:
// it is worth something at the hatch, it is proof of something you killed, and
// losing one costs you a hunt rather than a run.
//
// ── THE KEEPER'S BOWL ────────────────────────────────────────────────────────
//
// A house game has to pay in something, and the keeper has no trophy stock —
// he trades in goods. So he keeps a BOWL of what he has won: stake a trophy,
// and he matches it out of the bowl with the nearest thing in value. Win and
// you take both. Lose and yours goes in the bowl for the next player to try to
// win off him.
//
// The bowl is the whole economy of the house game and it balances itself: he
// cannot pay what he has not won, so an empty bowl means he will only play for
// nothing, and a fat bowl is a standing invitation. Nothing is minted and
// nothing is destroyed — every trophy in there was carried in by somebody.
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { randInt, chance } from "./rng";
import { nameMatches } from "./zone-util";
import { removeItemRow } from "./world";
import { gatehouseFeed, gatehouseFolk } from "./gate";
import { DICE_BUST, DICE_STAND, DICE_OPEN_BONES, DICE_BOWL_CAP, DICE_RULES, BENCH_OVERHEARD } from "./zone-data";

// A game in flight. Ephemeral ON PURPOSE: it lives in the DO's memory and dies
// with it, and nothing leaves anybody's pack until the last bone is down. A
// wake in the middle of a game loses the game and costs nobody a trophy, which
// is the right way round for a wager nobody can be forced into.
export interface DiceGame {
  id: string;
  a: string;                                  // who called it
  b: string | null;                           // who answered — null is the keeper
  pending: boolean;                           // called, not yet answered
  stake: Map<string, { rowId: string; itemId: string }>; // empty = played for nothing
  bowlStake: string | null;                   // what the keeper matched it with
  total: Map<string, number>;
  rolls: Map<string, number[]>;
  done: Set<string>;                          // stood or busted
  bust: Set<string>;
  turn: string;                               // whose bones they are right now
}

const bone = (): number => randInt(1, 6);

function nameOf(z: ZoneDO, pubkey: string | null): string {
  if (!pubkey) return "the keeper";
  return z.sessions.get(pubkey)?.name ?? "someone";
}

/** The game this wanderer is in, if any. */
export function gameOf(z: ZoneDO, pubkey: string): DiceGame | null {
  for (const g of z.diceGames.values()) {
    if (g.a === pubkey || g.b === pubkey) return g;
  }
  return null;
}

/** Called when someone leaves the fire, dies, or drops off the wire. */
export function endGamesFor(z: ZoneDO, pubkey: string): void {
  const g = gameOf(z, pubkey);
  if (!g) return;
  z.diceGames.delete(g.id);
  const other = g.a === pubkey ? g.b : g.a;
  if (other) {
    const s = z.sessions.get(other);
    if (s) z.send(s, `${nameOf(z, pubkey)} is gone from the table, and the game with them. Nothing changes hands.`, "evt");
  }
}

// ── the bowl ─────────────────────────────────────────────────────────────────

/** What the keeper would match a stake of this value with: the nearest thing in his bowl. */
function bowlMatch(z: ZoneDO, itemId: string): string | null {
  if (!z.keeperBowl.length) return null;
  const world = z.world!;
  const want = world.itemTemplates.get(itemId)?.barter ?? 0;
  let best: string | null = null, bestGap = Infinity;
  for (const id of z.keeperBowl) {
    const gap = Math.abs((world.itemTemplates.get(id)?.barter ?? 0) - want);
    if (gap < bestGap) { bestGap = gap; best = id; }
  }
  return best;
}

/** A trophy joins the bowl. Over the cap, the cheapest thing in it is passed on. */
function bowlTake(z: ZoneDO, itemId: string): void {
  const world = z.world!;
  z.keeperBowl.push(itemId);
  while (z.keeperBowl.length > DICE_BOWL_CAP) {
    let worst = 0;
    for (let i = 1; i < z.keeperBowl.length; i++) {
      const a = world.itemTemplates.get(z.keeperBowl[i])?.barter ?? 0;
      const b = world.itemTemplates.get(z.keeperBowl[worst])?.barter ?? 0;
      if (a < b) worst = i;
    }
    z.keeperBowl.splice(worst, 1); // he moves it on; the bowl is a table, not a vault
  }
}

// ── reading the table ────────────────────────────────────────────────────────

export function diceTable(z: ZoneDO, session: Session): string {
  const world = z.world!;
  const lines = [
    "A shallow wooden bowl and five old bones, worn smooth, on the end of the bench.",
    ...DICE_RULES,
  ];
  if (z.keeperBowl.length) {
    const counts = new Map<string, number>();
    for (const id of z.keeperBowl) counts.set(id, (counts.get(id) ?? 0) + 1);
    const bowl = [...counts].map(([id, n]) => {
      const t = world.itemTemplates.get(id);
      return `${t?.name ?? id}${n > 1 ? ` (x${n})` : ""}`;
    });
    lines.push(`In the keeper's bowl, won off people who sat where you're sitting: ${bowl.join(", ")}.`);
  } else {
    lines.push("The keeper's bowl is empty. He'll roll you for nothing, but he's nothing to put up.");
  }
  const folk = gatehouseFolk(z).filter((s) => s.pubkey !== session.pubkey);
  lines.push(folk.length
    ? `'dice' takes them up against the keeper for nothing; 'dice <trophy>' stakes one against his bowl; 'dice <name>' calls out anyone by the fire (add a trophy to make it worth something).`
    : `'dice' takes them up against the keeper for nothing; 'dice <trophy>' stakes one against his bowl.`);
  return lines.join("\n");
}

// ── starting one ─────────────────────────────────────────────────────────────

export async function cmdDice(z: ZoneDO, session: Session, arg: string): Promise<void> {
  if (!z.outOfWorld(session)) {
    return z.send(session, "The bones live on the gatehouse bench, and that is the only place anybody is fool enough to play.");
  }
  const want = arg.trim();
  // THE ANSWER TO A CALL COMES FIRST, BEFORE ANY STATUS LINE (rome, 2026-08-12:
  // called out at the bench and could not accept or decline).
  //
  // callOut registers the pending game under BOTH players, so the instant
  // somebody calls you out you HAVE a live game — and the "here is where your
  // game stands" guard used to sit at the top of this function and return on
  // it. Every 'dice accept' the called player typed hit that line and came
  // back with the same reminder to type 'dice accept'. acceptCall and
  // declineCall were unreachable code for the one person who needed them, and
  // the game could only ever end by somebody walking away from the bench.
  //
  // This is the SAME mistake as the entry bug two ships ago — a guard in front
  // of the routing, answering a word before reading it. The words that ANSWER
  // are matched first now; the status line is what you get for anything else.
  if (/^(accept|yes|aye|deal|on)$/i.test(want)) return acceptCall(z, session);
  if (/^(decline|no|nah|refuse)$/i.test(want)) return declineCall(z, session);
  // ...and the reading stays available mid-hand: a player who has forgotten
  // whether 21 is bust should not have to lose to find out.
  if (/^(table|bowl|bones|rules|read)$/i.test(want)) return z.send(session, diceTable(z, session));

  const live = gameOf(z, session.pubkey);
  if (live) return z.send(session, gameLine(z, live, session));
  // BARE 'dice' TAKES THE BONES UP. It read the table instead when this shipped,
  // which every line of copy in the game contradicted — the help, the table's own
  // last line and the chip all said bare 'dice' rolls the keeper — and the result
  // was a game with no findable way in (rome, 2026-08-12: he sat at the bench
  // typing and never got a hand). The verb starts the game; the TABLE is what
  // you look at, which is what 'look bones' has always been for.
  if (!want) return keeperGame(z, session, "");

  // (the table read and the two answers are matched at the top now — they must
  // run whether or not a game is already on the bench.)

  // A NAME BY THE FIRE BEATS A THING IN THE PACK. "dice rustpilgrim wolf pelt"
  // is a call with a stake; "dice wolf pelt" is the keeper's game.
  const folk = gatehouseFolk(z).filter((s) => s.pubkey !== session.pubkey);
  const words = want.split(/\s+/);
  for (let cut = words.length; cut >= 1; cut--) {
    const who = folk.find((s) => nameMatches(s.name, words.slice(0, cut).join(" ")));
    if (!who) continue;
    const rest = words.slice(cut).join(" ");
    return callOut(z, session, who, rest);
  }
  return keeperGame(z, session, want);
}

/** Stake check, shared by both games: it must be a trophy, loose, and on you. */
function stakeOf(z: ZoneDO, session: Session, arg: string): { rowId: string; itemId: string } | string {
  const carried = z.findCarried(session, arg);
  if (!carried) return "You carry nothing like that.";
  if (carried.serial !== null) return "The seal is on it. A sealed thing is title, and titles don't cross a gaming table.";
  if (!z.isTrophy(carried.itemId)) {
    return "The bones take trophies or they take nothing. Steel, food and papers stay out of it — nobody at this table wants to watch you lose your armour.";
  }
  return { rowId: carried.rowId, itemId: carried.itemId };
}

async function keeperGame(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const world = z.world!;
  const stake = new Map<string, { rowId: string; itemId: string }>();
  let bowlStake: string | null = null;
  if (arg && !/^(nothing|nowt|fun|free)$/i.test(arg)) {
    const s = stakeOf(z, session, arg);
    if (typeof s === "string") return z.send(session, s);
    bowlStake = bowlMatch(z, s.itemId);
    if (!bowlStake) {
      return z.send(session, "The keeper turns the bowl over and shows you the bottom of it. He'll roll you for nothing, but he's nothing to put up against that.");
    }
    stake.set(session.pubkey, s);
  }
  const game: DiceGame = {
    id: `d-${session.pubkey.slice(0, 8)}-${Date.now()}`,
    a: session.pubkey, b: null, pending: false,
    stake, bowlStake,
    total: new Map([[session.pubkey, 0]]),
    rolls: new Map([[session.pubkey, []]]),
    done: new Set(), bust: new Set(), turn: session.pubkey,
  };
  z.diceGames.set(game.id, game);
  const mine = world.itemTemplates.get(stake.get(session.pubkey)?.itemId ?? "")?.name;
  const theirs = world.itemTemplates.get(bowlStake ?? "")?.name;
  z.send(session, bowlStake
    ? `You set ${mine} down on the bench. The keeper looks at it, fishes ${theirs} out of the bowl, and sets it beside yours without a word. He pushes the bones over. You first.`
    : "The keeper pushes the bones across the bench with two fingers. Nothing on the table, then. You first.");
  gatehouseFeed(z, `${session.name} takes up the bones against the keeper${bowlStake ? ", and there's something on the bench" : ""}.`, session.pubkey, "evt");
  return openingCast(z, session, game);
}

async function callOut(z: ZoneDO, session: Session, who: Session, arg: string): Promise<void> {
  if (gameOf(z, who.pubkey)) return z.send(session, `${who.name} is already at the bones.`);
  const stake = new Map<string, { rowId: string; itemId: string }>();
  if (arg) {
    const s = stakeOf(z, session, arg);
    if (typeof s === "string") return z.send(session, s);
    stake.set(session.pubkey, s);
  }
  const game: DiceGame = {
    id: `d-${session.pubkey.slice(0, 8)}-${Date.now()}`,
    a: session.pubkey, b: who.pubkey, pending: true,
    stake, bowlStake: null,
    total: new Map([[session.pubkey, 0], [who.pubkey, 0]]),
    rolls: new Map([[session.pubkey, []], [who.pubkey, []]]),
    done: new Set(), bust: new Set(), turn: session.pubkey,
  };
  z.diceGames.set(game.id, game);
  const staked = z.world!.itemTemplates.get(stake.get(session.pubkey)?.itemId ?? "")?.name;
  z.send(session, staked
    ? `You put ${staked} on the bench and push the bones toward ${who.name}. Now you wait.`
    : `You push the bones toward ${who.name} — nothing on the table, just the roll. Now you wait.`);
  z.send(who, staked
    ? `${session.name} sets ${staked} on the bench and looks at you over it. To match it and play, 'dice accept' — and you'll need a trophy of your own. 'dice decline' and the bones go back in the bowl.`
    : `${session.name} pushes the bones toward you — nothing staked, just the game. 'dice accept', or 'dice decline'.`, "evt");
  gatehouseFeed(z, `${session.name} calls ${who.name} out over the bones.`, session.pubkey, "evt", undefined);
}

async function acceptCall(z: ZoneDO, session: Session): Promise<void> {
  const game = gameOf(z, session.pubkey);
  if (!game || !game.pending || game.b !== session.pubkey) return z.send(session, "Nobody's called you out.");
  const world = z.world!;
  const theirs = game.stake.get(game.a);
  if (theirs) {
    // A staked call has to be MATCHED, and matched in kind: a trophy for a
    // trophy. The nearest thing in your pack by value, so nobody has to name it.
    const mine = [...session.items]
      .filter((c) => c.serial === null && z.isTrophy(c.itemId))
      .sort((a, b) => {
        const want = world.itemTemplates.get(theirs.itemId)?.barter ?? 0;
        const ga = Math.abs((world.itemTemplates.get(a.itemId)?.barter ?? 0) - want);
        const gb = Math.abs((world.itemTemplates.get(b.itemId)?.barter ?? 0) - want);
        return ga - gb;
      })[0];
    if (!mine) {
      return z.send(session, "You've nothing to put up against it. 'dice decline' — there's no shame in an empty pack.");
    }
    game.stake.set(session.pubkey, { rowId: mine.rowId, itemId: mine.itemId });
    z.send(session, `You put ${world.itemTemplates.get(mine.itemId)?.name ?? "yours"} down beside theirs.`);
  }
  game.pending = false;
  const caller = z.sessions.get(game.a);
  if (!caller) { z.diceGames.delete(game.id); return z.send(session, "Whoever called you is gone from the fire."); }
  gatehouseFeed(z, `${session.name} takes ${caller.name}'s call. The bench goes quiet.`, undefined, "evt");
  z.send(caller, `${session.name} takes the call. Your bones first.`, "evt");
  return openingCast(z, caller, game);
}

async function declineCall(z: ZoneDO, session: Session): Promise<void> {
  const game = gameOf(z, session.pubkey);
  if (!game || !game.pending || game.b !== session.pubkey) return z.send(session, "Nobody's called you out.");
  z.diceGames.delete(game.id);
  const caller = z.sessions.get(game.a);
  z.send(session, "You put the bones back in the bowl.");
  if (caller) z.send(caller, `${session.name} puts the bones back in the bowl. Not tonight.`, "evt");
}

// ── playing it ───────────────────────────────────────────────────────────────

function gameLine(z: ZoneDO, game: DiceGame, session: Session): string {
  if (game.pending) {
    return game.b === session.pubkey
      ? "There's a call on the bench in front of you. 'dice accept' or 'dice decline'."
      : `You're waiting on ${nameOf(z, game.b)} to say yes or no.`;
  }
  const mine = game.total.get(session.pubkey) ?? 0;
  if (game.turn !== session.pubkey) return `You're standing at ${mine}. It's ${nameOf(z, game.turn)}'s bones.`;
  return `You're at ${mine}. 'roll' for another, 'stand' to hold it.`;
}

// A THROW IS FOR THE PEOPLE IN THE HAND, and only sometimes for the room.
//
// THE OPPONENT MUST ALWAYS HEAR IT. In a called-out game the other player has
// no other window on the hand at all \u2014 gatehouseFeed IS how they read your
// throws \u2014 so thinning that feed naively would have left them watching a
// game they could not see. They are excluded from the die roll by name.
function benchFeed(z: ZoneDO, game: DiceGame, actor: Session, text: string, cls: string): void {
  const other = game.a === actor.pubkey ? game.b : game.a;
  for (const s of gatehouseFolk(z)) {
    if (s.pubkey === actor.pubkey) continue;              // he read his own throw first-person
    if (s.pubkey === other || chance(BENCH_OVERHEARD)) z.send(s, text, cls);
  }
}

async function openingCast(z: ZoneDO, session: Session, game: DiceGame): Promise<void> {
  const cast: number[] = [];
  for (let i = 0; i < DICE_OPEN_BONES; i++) cast.push(bone());
  const sum = cast.reduce((n, d) => n + d, 0);
  game.total.set(session.pubkey, sum);
  game.rolls.set(session.pubkey, cast);
  z.send(session, `You cast: ${cast.join(", ")} — ${sum}. ('roll' for another, 'stand' to hold it. Over ${DICE_BUST} and you are out.)`, "evt");
  benchFeed(z, game, session, `${session.name} opens on ${sum}.`, "amb");
}

export async function cmdRoll(z: ZoneDO, session: Session): Promise<void> {
  const game = z.outOfWorld(session) ? gameOf(z, session.pubkey) : null;
  if (!game) return z.send(session, "You've no bones in your hand.");
  if (game.pending) return z.send(session, gameLine(z, game, session));
  if (game.turn !== session.pubkey) return z.send(session, `Not your bones — it's ${nameOf(z, game.turn)}'s throw.`);
  const d = bone();
  const total = (game.total.get(session.pubkey) ?? 0) + d;
  game.total.set(session.pubkey, total);
  game.rolls.get(session.pubkey)?.push(d);
  if (total > DICE_BUST) {
    game.bust.add(session.pubkey);
    game.done.add(session.pubkey);
    z.send(session, `You throw a ${d}. ${total} — over the line. You're out.`, "dmgin big");
    benchFeed(z, game, session, `${session.name} throws a ${d} and busts at ${total}.`, "evt");
    return advance(z, game);
  }
  z.send(session, `You throw a ${d}. ${total}.`, "evt");
  benchFeed(z, game, session, `${session.name} throws a ${d}: ${total}.`, "amb");
}

export async function cmdStand(z: ZoneDO, session: Session): Promise<void> {
  const game = z.outOfWorld(session) ? gameOf(z, session.pubkey) : null;
  if (!game) return z.send(session, "You've no bones in your hand.");
  if (game.pending) return z.send(session, gameLine(z, game, session));
  if (game.turn !== session.pubkey) return z.send(session, `Not your bones — it's ${nameOf(z, game.turn)}'s throw.`);
  const total = game.total.get(session.pubkey) ?? 0;
  if (!total) return z.send(session, "You haven't thrown yet.");
  game.done.add(session.pubkey);
  z.send(session, `You set the bones down at ${total}.`, "evt");
  benchFeed(z, game, session, `${session.name} stands at ${total}.`, "evt");
  return advance(z, game);
}

/** One hand is finished. Hand the bones on, or settle. */
async function advance(z: ZoneDO, game: DiceGame): Promise<void> {
  // The keeper's hand is not a turn — he plays it out on the spot, by a rule
  // everybody at the bench can watch him follow.
  if (game.b === null) return keeperHand(z, game);
  // Read the hand that just FINISHED before the turn moves — the number to beat
  // is theirs, and a busted hand is no number at all.
  const finished = game.turn;
  const other = finished === game.a ? game.b : game.a;
  if (game.done.has(other)) return settle(z, game);
  game.turn = other;
  const s = z.sessions.get(other);
  if (!s) return settle(z, game); // they walked; the hand that stayed takes it
  const beat = game.bust.has(finished) ? 0 : (game.total.get(finished) ?? 0);
  z.send(s, beat
    ? `Your bones. ${beat} to beat.`
    : `Your bones — and nothing to beat: they're already out. Any hand that stands takes it.`, "evt");
  return openingCast(z, s, game);
}

/**
 * THE KEEPER'S RULE, in the open: he rolls until he beats you or stands at
 * DICE_STAND. He never decides anything, which is the point — a house that
 * chooses is a house you can accuse.
 */
async function keeperHand(z: ZoneDO, game: DiceGame): Promise<void> {
  const you = z.sessions.get(game.a);
  if (!you) { z.diceGames.delete(game.id); return; }
  // You busted: he does not touch the bones. That is the cost of going first.
  if (game.bust.has(game.a)) return settle(z, game);
  const yours = game.total.get(game.a) ?? 0;
  const cast: number[] = [];
  for (let i = 0; i < DICE_OPEN_BONES; i++) cast.push(bone());
  let total = cast.reduce((n, d) => n + d, 0);
  const line = [`The keeper gathers the bones and casts: ${cast.join(", ")} — ${total}.`];
  while (total <= yours && total < DICE_STAND + 1 && total <= DICE_BUST) {
    const d = bone();
    total += d;
    line.push(`He throws a ${d}. ${total}.`);
    if (total > yours) break;              // he has what he needs
    if (total >= DICE_STAND) break;        // and he never pushes past his own rule
  }
  game.total.set("keeper", total);
  if (total > DICE_BUST) { game.bust.add("keeper"); line.push("Over the line. He sits back and says nothing."); }
  z.send(you, line.join("\n"), "evt");
  return settle(z, game);
}

// ── settling ─────────────────────────────────────────────────────────────────

function scoreOf(game: DiceGame, pubkey: string): number {
  return game.bust.has(pubkey) ? -1 : (game.total.get(pubkey) ?? 0);
}

async function settle(z: ZoneDO, game: DiceGame): Promise<void> {
  z.diceGames.delete(game.id);
  const world = z.world!;
  const aKey = game.a, bKey = game.b ?? "keeper";
  const aScore = scoreOf(game, aKey), bScore = scoreOf(game, bKey);
  const aSess = z.sessions.get(aKey);
  const bSess = game.b ? z.sessions.get(game.b) : null;
  const winner = aScore === bScore ? null : (aScore > bScore ? aKey : bKey);

  // ONE line, to the room. Both hands are sitting in the gatehouse by
  // definition — you cannot play from anywhere else — so gatehouseFeed already
  // reaches the players along with everyone watching. Telling them directly as
  // well printed every result twice.
  const tell = (text: string) => gatehouseFeed(z, text, undefined, "evt");
  const nameA = aSess?.name ?? "someone", nameB = bSess?.name ?? "the keeper";
  // A hand that never got picked up has no number, and printing "0" for it read
  // as though the keeper had thrown and scored nothing — when in fact busting
  // first means he never touches the bones at all. That is the whole house edge;
  // it should say so.
  const untouched = !game.total.has(bKey);
  const shownA = aScore < 0 ? "bust" : String(aScore);
  const shownB = untouched ? "never picks them up" : bScore < 0 ? "bust" : String(bScore);

  // NOTHING ON THE TABLE: the line is the whole prize.
  if (!game.stake.size) {
    tell(winner === null
      ? `${nameA} ${shownA}, ${nameB} ${shownB}. A push, and nothing in it either way.`
      : `${nameA} ${shownA}, ${nameB} ${shownB} — ${winner === aKey ? nameA : nameB} takes it, and takes nothing.`);
    return;
  }

  // A PUSH returns everything, untouched — no row has moved yet, so this is
  // simply saying so.
  if (winner === null) {
    tell(`${nameA} ${shownA}, ${nameB} ${shownB}. A push. Everything goes back the way it came.`);
    return;
  }

  // THE STAKES MOVE. Nothing has left anybody's pack until this moment, so a
  // stake that isn't there any more (dropped, traded, eaten by a thief mid-game)
  // simply voids the wager rather than conjuring a debt.
  const held = (pk: string): { rowId: string; itemId: string } | null => {
    const s = game.stake.get(pk);
    if (!s) return null;
    const sess = z.sessions.get(pk);
    return sess?.items.some((c) => c.rowId === s.rowId) ? s : null;
  };
  const aStake = held(aKey), bStake = game.b ? held(bKey) : null;
  if ((game.stake.has(aKey) && !aStake) || (game.b && game.stake.has(bKey) && !bStake)) {
    tell("Somebody's stake isn't on the bench any more. The wager comes off and nothing changes hands.");
    return;
  }

  const winSess = winner === aKey ? aSess : bSess;
  const loseStake = winner === aKey ? bStake : aStake;
  const loseSess = winner === aKey ? bSess : aSess;

  if (game.b === null) {
    // THE HOUSE GAME. Yours goes in the bowl, or his comes out of it.
    const yours = aStake!;
    const his = game.bowlStake!;
    if (winner === aKey) {
      const idx = z.keeperBowl.indexOf(his);
      if (idx >= 0) z.keeperBowl.splice(idx, 1);
      const got = aSess ? await z.grantItem(aSess, his) : null;
      const hisName = world.itemTemplates.get(his)?.name ?? "it";
      if (!got && aSess) {
        // Pack full: it goes on the gate's stones rather than nowhere. He is not
        // holding it for you.
        const floor = z.ground.get(aSess.roomId) ?? [];
        floor.push(his);
        z.ground.set(aSess.roomId, floor);
        z.stampFresh(aSess.roomId, his);
        z.refreshRoomCtx(aSess.roomId);
      }
      tell(`${nameA} ${shownA}, the keeper ${shownB}. ${nameA} takes ${hisName} out of the bowl.`);
    } else {
      if (aSess) {
        aSess.items.splice(aSess.items.findIndex((c) => c.rowId === yours.rowId), 1);
        await removeItemRow(z.env.DB, yours.rowId);
      }
      bowlTake(z, yours.itemId);
      const yourName = world.itemTemplates.get(yours.itemId)?.name ?? "it";
      tell(`${nameA} ${shownA}, the keeper ${shownB}. ${yourName} goes in the bowl, and the keeper goes back to his ledger.`);
    }
    if (aSess) z.sendCtx(aSess);
    await z.persist(); // the bowl is the world's, not the session's
    return;
  }

  // WANDERER AGAINST WANDERER: the loser's trophy crosses the bench.
  if (loseStake && loseSess && winSess) {
    loseSess.items.splice(loseSess.items.findIndex((c) => c.rowId === loseStake.rowId), 1);
    await removeItemRow(z.env.DB, loseStake.rowId);
    const got = await z.grantItem(winSess, loseStake.itemId);
    const what = world.itemTemplates.get(loseStake.itemId)?.name ?? "it";
    if (!got) {
      const floor = z.ground.get(winSess.roomId) ?? [];
      floor.push(loseStake.itemId);
      z.ground.set(winSess.roomId, floor);
      z.stampFresh(winSess.roomId, loseStake.itemId);
      z.refreshRoomCtx(winSess.roomId);
    }
    tell(`${nameA} ${shownA}, ${nameB} ${shownB}. ${winSess.name} takes ${what} off the bench.`);
    z.sendCtx(winSess);
    z.sendCtx(loseSess);
    return;
  }
  tell(`${nameA} ${shownA}, ${nameB} ${shownB}. ${winner === aKey ? nameA : nameB} takes it.`);
}
