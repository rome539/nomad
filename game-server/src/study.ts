// STUDY BY BEHAVIOUR (rome, 2026-10-24). A study used to be one look, once, at
// whatever the thing happened to be doing, and that was the whole observation
// half of an account. Now the book wants the animal's LIFE: seen going about
// its business, asleep, feeding, hungry, and dead (the body on the floor,
// turned over and read, and used up by the reading). Each one it is seen doing
// writes its own line on the page, and a full account wants every one the
// animal actually has, plus its kills.
//
// WHAT IT HAS is the sim's own sets, never a hand list: a skeleton never
// sleeps or eats, so its page wants two behaviours (about, dead); the rat king
// eats and does not sleep. A behaviour is REQUIRED only where the animal has a
// sure way into it. Anything it is caught doing beyond that (a lurker dozing
// on a full belly) is still written down, and simply is not asked for.
//
// AND NOBODY IS LOCKED OUT BY THE FLOOR (rome, 2026-10-24). A thing that lives
// off the ground eats the moment it gets hungry, so its hungry window is a
// search and its meal is an instant. Two answers: every meal now takes
// EAT_SHOW_MS (the animal stays over it, and reads as eating), and for a floor
// eater, seeing it feed writes the hungry line too, because it only ever eats
// hungry. Hungry is asked for on its own only of the hunters, who stay hungry
// until something dies.

import type { ZoneDO } from "./zone";
import type { Creature, Trace } from "./zone-types";
import type { MobTemplate } from "./world";
import * as ai from "./ai";
import { nameMatches } from "./zone-util";
import {
  MOVE_SOUNDS, STILL_SOUNDS, TRACK_PRINTS,
  NAPPERS, NOCTURNAL, SENTINELS, SCAVENGERS, VERMIN, GRAZERS, PREYS_ON, PACK_PREY, STARVE_HUNTERS,
  THIEVES, LURKERS, HOLLOW, GRAVE_FLESH, BIG_VITALS, OUTDOOR_ROOMS, HUNGRY_AT, CORPSE_TRACES,
} from "./zone-data";

export type Behaviour = "about" | "asleep" | "feeding" | "hungry" | "dead";
export const BEHAVIOURS: Behaviour[] = ["about", "asleep", "feeding", "hungry", "dead"];

// How each behaviour reads in a sentence: "you watch the wolf sleeping".
export const DOING: Record<Behaviour, string> = {
  about: "going about its business", asleep: "sleeping", feeding: "eating", hungry: "hungry", dead: "dead",
};
// And in the list of what the page still wants: "Still to see it asleep".
const STILL: Record<Behaviour, string> = {
  about: "about its business", asleep: "asleep", feeding: "eating", hungry: "hungry", dead: "dead",
};

const eatsAtAll = (id: string): boolean =>
  ai.hungers(id) && (PREYS_ON.has(id) || PACK_PREY.has(id) || GRAZERS.has(id) || SCAVENGERS.has(id)
    || VERMIN.has(id) || THIEVES.has(id) || LURKERS.has(id) || STARVE_HUNTERS.has(id));
const hunts = (id: string): boolean => PREYS_ON.has(id) || PACK_PREY.has(id) || STARVE_HUNTERS.has(id);

// What a full account of this kind asks to have seen.
export function required(templateId: string): Behaviour[] {
  const out: Behaviour[] = ["about"];
  if (NAPPERS.has(templateId) || SENTINELS.has(templateId) || SCAVENGERS.has(templateId)) out.push("asleep");
  if (eatsAtAll(templateId)) {
    out.push("feeding");
    if (hunts(templateId)) out.push("hungry");
  }
  out.push("dead");
  return out;
}

// What the living animal is doing this moment, as the book would put it.
export function behaviourNow(z: ZoneDO, c: Creature, now = Date.now()): Behaviour {
  if (c.cuddling || (SENTINELS.has(c.templateId) ? !z.sentinelAwake(c) : c.asleep)) return "asleep";
  if (c.holding || (c.eatingUntil ?? 0) > now) return "feeding";
  if (ai.hungers(c.templateId) && c.hunger >= HUNGRY_AT) return "hungry";
  return "about";
}

// What one look writes: the behaviour, and for a floor eater caught feeding,
// the hunger it only ever feeds from.
export function writes(templateId: string, b: Behaviour): Behaviour[] {
  if (b === "feeding" && ai.hungers(templateId) && !hunts(templateId)) return ["feeding", "hungry"];
  return [b];
}

export function parseSeen(packed: string | null | undefined): Set<Behaviour> {
  const out = new Set<Behaviour>();
  for (const p of (packed ?? "").split(",")) if ((BEHAVIOURS as string[]).includes(p)) out.add(p as Behaviour);
  return out;
}
export function packSeen(seen: Set<Behaviour>): string {
  return BEHAVIOURS.filter((b) => seen.has(b)).join(",");
}

export function missing(templateId: string, seen: Set<Behaviour>): Behaviour[] {
  return required(templateId).filter((b) => !seen.has(b));
}

// "Still to see it asleep and dead."
export function stillLine(templateId: string, seen: Set<Behaviour>): string {
  const left = missing(templateId, seen).map((b) => STILL[b]);
  if (!left.length) return "";
  const list = left.length === 1 ? left[0] : `${left.slice(0, -1).join(", ")} and ${left[left.length - 1]}`;
  return `still to see it ${list}`;
}

// ---- the dead: a body on the floor that knows what it was ----

// Which creature a body on the floor was. A body of a nomad is not a study.
export function corpseKind(z: ZoneDO, tr: Trace): string | null {
  if (!CORPSE_TRACES.has(tr.kind) || tr.id === "nomad") return null;
  const id = tr.id ?? tr.prey;
  if (id && z.world!.mobTemplates.has(id)) return id;
  if (!tr.label) return null;
  for (const t of z.world!.mobTemplates.values()) if (t.name === tr.label) return t.id;
  return null;
}

// The body here that answers to `arg` (any body, for a bare "corpse"/"body").
export function findCorpse(z: ZoneDO, roomId: string, arg: string): { tr: Trace; tmpl: MobTemplate } | null {
  const list = z.traces.get(roomId) ?? [];
  for (let i = list.length - 1; i >= 0; i--) {
    const id = corpseKind(z, list[i]);
    if (!id) continue;
    const tmpl = z.world!.mobTemplates.get(id)!;
    if (!arg || nameMatches(tmpl.name, arg)) return { tr: list[i], tmpl };
  }
  return null;
}

// The study uses the body up: turned over, opened and read, there is nothing
// left on the floor worth a scavenger's time, or a picture.
export function useUp(z: ZoneDO, roomId: string, tr: Trace): void {
  const list = z.traces.get(roomId);
  if (!list) return;
  const i = list.indexOf(tr);
  if (i >= 0) list.splice(i, 1);
  if (!list.length) z.traces.delete(roomId);
  z.refreshRoomCtx(roomId);
}

// "study dead wolf", "study wolf corpse", "study body": the dead are asked for
// by name, so a living wolf in the room is never mistaken for the body.
const DEAD_WORDS = /\b(dead|corpse|body|remains|carcass|bones)\b/gi;
export function asksForDead(arg: string): { dead: boolean; rest: string } {
  const dead = DEAD_WORDS.test(arg);
  DEAD_WORDS.lastIndex = 0;
  return { dead, rest: arg.replace(DEAD_WORDS, " ").replace(/\b(the|a|an|of)\b/gi, " ").replace(/\s+/g, " ").trim() };
}

// ---- what each behaviour writes on the page: facts, never odds ----

const bare = (name: string): string => name.replace(/^(a|an|the) /i, "");
export function listOf(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function sleepLine(z: ZoneDO, id: string): string {
  if (SENTINELS.has(id)) return "It sleeps at its post, and goes on sleeping until the deep is opened. A careless step past it can wake it.";
  if (!NAPPERS.has(id)) return "It sleeps only on a full belly, down beside what it ate.";
  const outdoors = z.world!.mobSpawns.some((s) => s.template_id === id && OUTDOOR_ROOMS.has(s.room_id));
  const when = !outdoors ? "It dozes where it stops, now and then, and never with anyone standing over it."
    : NOCTURNAL.has(id) ? "It lies up by day and works the dark."
    : "It beds down after dark, and less on a lit night.";
  return `${when} A footfall can wake it; soft soles less often.`;
}

function feedLine(z: ZoneDO, id: string): string {
  const names = (ids: Iterable<string>) => [...ids].map((p) => z.world!.mobTemplates.get(p)?.name).filter(Boolean).map((n) => bare(n!));
  const bits: string[] = [];
  const prey = names(PREYS_ON.get(id) ?? []);
  if (prey.length) bits.push(`It hunts ${listOf(prey.slice(0, 4))}${prey.length > 4 ? ", and more besides" : ""}.`);
  const pack = names(PACK_PREY.get(id)?.keys() ?? []).filter((n) => !prey.includes(n));
  if (pack.length) bits.push(`With enough of its own kind about it takes ${listOf(pack.slice(0, 3))} too.`);
  if (GRAZERS.has(id)) bits.push("It lives off the ground it walks, and eats food left lying on the floor.");
  if (SCAVENGERS.has(id)) bits.push("It eats the dead, and a few bodies in it grow it bold.");
  else if (VERMIN.has(id)) bits.push("It gnaws at the dead when it is hungry enough.");
  if (THIEVES.has(id) && !GRAZERS.has(id)) bits.push("It will snatch food off a wanderer and eat it running.");
  if (!bits.length) bits.push("It eats what it can find, and what it can catch.");
  return bits.join(" ");
}

function hungerLine(id: string): string {
  if (THIEVES.has(id)) return "Hungry, it goes robbing, and food is what it grabs first.";
  if (STARVE_HUNTERS.has(id)) return "Hungry, it eyes anything smaller in the room; starving, with nothing smaller about, it will come for you.";
  if (hunts(id)) return "Hungry, it eyes anything smaller in the room, and goes after it.";
  if (SCAVENGERS.has(id)) return "Hungry, it follows the smell of blood.";
  return "Hungry, it goes searching the ground, and takes whatever is lying there.";
}

function deadLine(z: ZoneDO, tmpl: MobTemplate): string {
  const world = z.world!;
  const gives = [tmpl.loot_item, ...world.mobKeys.filter((k) => k.templateId === tmpl.id).map((k) => k.keyItem)]
    .map((i) => (i ? world.itemTemplates.get(i)?.name : undefined)).filter(Boolean) as string[];
  const hide = HOLLOW.has(tmpl.id) && !GRAVE_FLESH.has(tmpl.id)
    ? ["Nothing in it but dry bone.", "Bone, and a little hard gristle.", "Bone, thick and close-knit.", "Bone like old iron."][Math.min(3, tmpl.armor)]
    : ["The skin is soft; anything bites into it.", "The hide is tough, and takes the edge off a light blow.", "The hide is thick; a light weapon barely marks it.", "It is armoured like a door; only weight gets through."][Math.min(3, tmpl.armor)];
  const big = BIG_VITALS[tmpl.id];
  const gap = big ? { point: "A point driven in the right place can end it in one blow.", edge: "A heavy edge in the right place can end it in one blow.", blunt: "A blunt blow to the skull can end it in one." }[big.by]
    : tmpl.is_boss ? "Nothing ends it in one blow. It has to be worn down."
    : tmpl.id === "three-hound" ? "Only a point through the throat ends it in one blow, and seldom."
    : HOLLOW.has(tmpl.id) && !GRAVE_FLESH.has(tmpl.id) ? "No throat to open and no heart to find. Only a blunt blow that shatters the skull ends it in one."
    : "Any weapon can find the gap in it, with luck.";
  return `${gives.length ? `Its body gives ${listOf(gives)}. ` : "Its body gives nothing worth carrying. "}${hide} ${gap}`;
}

// The page's line for one behaviour that has been seen (about is the
// description and nature the page has always carried, so it has no line here).
export function line(z: ZoneDO, tmpl: MobTemplate, b: Behaviour): string {
  if (b === "asleep") return sleepLine(z, tmpl.id);
  if (b === "feeding") return feedLine(z, tmpl.id);
  if (b === "hungry") return hungerLine(tmpl.id);
  if (b === "dead") return deadLine(z, tmpl);
  return "";
}

// ---- what it sounds like, and what it leaves (read once it has been watched) ----

// Its own line, or its base's for a rare blood that has none of its own.
function own<T>(z: ZoneDO, table: Record<string, T>, id: string): T | undefined {
  return table[id] ?? table[z.variantBase.get(id) ?? ""];
}

// "Claws skitter. Standing still: a dry rasping." The {dir} the world fills
// in at the time is not the book's business.
export function soundLine(z: ZoneDO, id: string): string {
  const move = own(z, MOVE_SOUNDS, id)?.replace(/\s*\{dir\}/g, "").replace(/\s+([,.])/g, "$1");
  const still = own(z, STILL_SOUNDS, id);
  const bits: string[] = [];
  if (move) bits.push(move.charAt(0).toUpperCase() + move.slice(1));
  if (still) bits.push(`Standing still: ${still}.`);
  return bits.join(" ");
}

export function trackLine(z: ZoneDO, id: string): string {
  const t = own(z, TRACK_PRINTS, id);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) + "." : "";
}
