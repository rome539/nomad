// Standing letters: issued only on request, honored only at a soul's first arrival.
import { rand } from "./rng";
import type { ZoneDO } from "./zone";
import type { Session } from "./zone-types";
import { equipCarried, insertLoot, loadInventory, loadContainer, setItemInviteCode } from "./world";

export const CODE = /^[A-Za-z0-9]{10}$/;
export const KIT = ["sharpened-rib", "leather-cap", "rag-vest", "tattered-cloak", "worn-boots", "battered-buckler"];
export const UPGRADE_CHANCE = 0.10;
// Explicit same-slot steps keep a lucky arrival modest as the catalog grows.
export const KIT_UPGRADES: Readonly<Record<string, string>> = {
  "sharpened-rib": "bone-shiv",
  "leather-cap": "watchmans-kettle-helm",
  "rag-vest": "scavenger-coat",
  "tattered-cloak": "hide-cloak",
  "worn-boots": "watchmans-boots",
  "battered-buckler": "iron-bound-shield",
};
export function rollKit(random: () => number = rand): string[] {
  return KIT.map(item => {
    const lucky = random() < UPGRADE_CHANCE;
    return lucky ? KIT_UPGRADES[item] || item : item;
  });
}
const SUPPLIES = ["hardtack", "hardtack", "well-water", "linen-strips", "torch"];
// What a letter carries for a wanderer who is already on the road: food, once.
const RATIONS = ["hardtack", "hardtack", "well-water"];
const DEFAULT = "There is room beside the fire. Take the road down. I will look for you.";
type Invite = { code: string; inviter: string; message: string };

export function cleanMessage(text: string): string {
  return Array.from(text.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim()).slice(0, 140).join("");
}
function randomCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  while (code.length < 10) {
    // Rejection sampling avoids favoring the first eight letters.
    for (const n of crypto.getRandomValues(new Uint8Array(16))) {
      if (n < 248) code += alphabet[n % 62];
      if (code.length === 10) break;
    }
  }
  return code;
}

export async function command(z: ZoneDO, session: Session, arg: string): Promise<void> {
  const post = arg.toLowerCase() === "post";
  const message = cleanMessage(post ? "" : arg);
  let invite = await z.env.DB.prepare("SELECT code, inviter, message FROM invites WHERE inviter = ?").bind(session.pubkey).first<Invite>();
  while (!invite) {
    await z.env.DB.prepare("INSERT OR IGNORE INTO invites (code, inviter, message, created_at) VALUES (?, ?, ?, ?)")
      .bind(randomCode(), session.pubkey, message, Math.floor(Date.now() / 1000)).run();
    invite = await z.env.DB.prepare("SELECT code, inviter, message FROM invites WHERE inviter = ?").bind(session.pubkey).first<Invite>();
  }
  if (!post && message) {
    await z.env.DB.prepare("UPDATE invites SET message = ? WHERE inviter = ?").bind(message, session.pubkey).run();
    invite.message = message;
  }
  const link = "https://nomadmud.com/?invite=" + invite.code;
  z.send(session, "A letter for the road.\n" + link + "\nPost it to Nostr: invite post");
  try { session.ws.send(JSON.stringify({ v: 0, t: "invite", code: invite.code, message: invite.message || DEFAULT, post })); } catch {}
}

export async function claim(z: ZoneDO, pubkey: string, code: string): Promise<boolean> {
  if (!CODE.test(code)) return false;
  const invite = await z.env.DB.prepare("SELECT code, inviter, message FROM invites WHERE code = ?").bind(code).first<Invite>();
  if (!invite || invite.inviter === pubkey) return false;
  const now = Math.floor(Date.now() / 1000);
  // Reserve the daily gift in the same statement as the unique claim: two
  // concurrent arrivals cannot both observe the last free place.
  const result = await z.env.DB.prepare(`INSERT OR IGNORE INTO invite_claims (newcomer, code, inviter, gifted, claimed_at)
    SELECT ?, ?, ?, CASE WHEN (SELECT COUNT(*) FROM invite_claims WHERE inviter = ? AND gifted = 1 AND claimed_at > ?) < 2 THEN 1 ELSE 0 END, ?`)
    .bind(pubkey, code, invite.inviter, invite.inviter, now - 86400, now).run();
  if (!result.meta.changes) return false;
  const row = await z.env.DB.prepare("SELECT gifted FROM invite_claims WHERE newcomer = ?").bind(pubkey).first<{ gifted: number }>();
  if (row?.gifted) {
    const kit = rollKit();
    for (const item of [...kit, ...SUPPLIES]) await insertLoot(z.env.DB, crypto.randomUUID(), pubkey, item, null, 100, now, "");
    const items = await loadInventory(z.env.DB, pubkey);
    for (const item of items) if (kit.includes(item.itemId)) await equipCarried(z.env.DB, item);
  }
  const letter = crypto.randomUUID();
  await insertLoot(z.env.DB, letter, pubkey, "invite-letter", null, 100, now, "");
  await setItemInviteCode(z.env.DB, letter, code);
  const sender = z.sessions.get(invite.inviter);
  if (sender && !sender.linkdeadUntil) {
    const newcomer = await z.env.DB.prepare("SELECT name FROM players WHERE pubkey = ?").bind(pubkey).first<{ name: string }>();
    if (newcomer) z.send(sender, newcomer.name + (row?.gifted
      ? " has arrived with your letter still folded in their hand, and the bundle you sent went with it."
      : " has arrived with your letter still folded in their hand. Nothing else went with it; you have sent all you can spare today."));
  }
  return true;
}

// A LETTER THAT FINDS SOMEONE ALREADY ON THE ROAD (rome, 2026-10-22). The kit
// is for a first arrival only, but a wanderer who follows a link must not be
// met with silence: they are told the letter was meant for someone new, and a
// little food comes with it. ONCE PER CHARACTER, EVER — the claim row is keyed
// on the pubkey like a newcomer's, so a second link (or the same one again)
// finds the row and says nothing. Your own letter gives you nothing. Rations
// sit outside the two-a-day kit cap (gifted stays 0): they are worth almost
// nothing and a character must already exist to collect them.
export async function returning(z: ZoneDO, session: Session, code: string): Promise<void> {
  if (!CODE.test(code)) return;
  const invite = await z.env.DB.prepare("SELECT code, inviter, message FROM invites WHERE code = ?").bind(code).first<Invite>();
  if (!invite) return;
  const now = Math.floor(Date.now() / 1000);
  const result = await z.env.DB.prepare("INSERT OR IGNORE INTO invite_claims (newcomer, code, inviter, gifted, claimed_at) VALUES (?, ?, ?, 0, ?)")
    .bind(session.pubkey, code, invite.inviter, now).run();
  if (!result.meta.changes) return;
  if (invite.inviter === session.pubkey) {
    z.send(session, "The letter is in your own hand. It is for someone else to carry here.");
    return;
  }
  // The letter itself comes too, so it can be read like a newcomer's.
  if (z.packRoom(session, "invite-letter")) {
    const rowId = crypto.randomUUID();
    await insertLoot(z.env.DB, rowId, session.pubkey, "invite-letter", null, 100, now, "");
    await setItemInviteCode(z.env.DB, rowId, code);
    session.items.push({ rowId, itemId: "invite-letter", serial: null, equipped: false, condition: 100, inviteCode: code, acquiredAt: now });
  }
  const given: string[] = [];
  for (const id of RATIONS) if (await z.grantItem(session, id)) given.push(id);
  const sender = await z.env.DB.prepare("SELECT name FROM players WHERE pubkey = ?").bind(invite.inviter).first<{ name: string }>();
  const from = sender?.name || "a wanderer";
  const name = (id: string) => z.world?.itemTemplates.get(id)?.name ?? id;
  const counts = new Map<string, number>();
  for (const id of given) counts.set(id, (counts.get(id) ?? 0) + 1);
  const food = [...counts].map(([id, n]) => (n > 1 ? n + " x " : "") + name(id)).join(", ");
  z.send(session, "A letter from " + from + " finds you, though it was meant for someone new to the road. ('look letter' reads it.)"
    + (food ? " A little food was folded in with it: " + food + "." : " There was food folded in with it, but your pack has no room."), "gain");
  const other = z.sessions.get(invite.inviter);
  if (other && !other.linkdeadUntil) z.send(other, session.name + ", already on the road, has read your letter.");
}

// What a new soul wakes to, said plainly: the letter always, and the bundle
// when one came with it. Read off the pack itself, which on a first arrival
// holds nothing but what the letter brought.
export function arrivalLine(z: ZoneDO, items: { itemId: string; equipped: boolean }[]): string {
  const name = (id: string) => z.world?.itemTemplates.get(id)?.name ?? id;
  // Worn pieces are gear and wear their tier, the same marker as any loot line.
  const worn = items.filter((i) => i.equipped).map((i) => z.gearName(i.itemId));
  const counts = new Map<string, number>();
  for (const i of items) if (!i.equipped && i.itemId !== "invite-letter") counts.set(i.itemId, (counts.get(i.itemId) ?? 0) + 1);
  if (!worn.length && !counts.size) return "You wake with a letter tucked among your things. Nothing else came with it.";
  const kept = [...counts].map(([id, n]) => (n > 1 ? n + " x " : "") + name(id));
  return "You wake with a letter tucked among your things, and someone has dressed you for the road."
    + (worn.length ? "\nYou are wearing " + worn.join(", ") + "." : "")
    + (kept.length ? "\nIn your pack: " + kept.join(", ") + "." : "");
}

export async function read(z: ZoneDO, session: Session, arg: string): Promise<boolean> {
  if (!arg) return false;
  let item = z.findCarried(session, arg);
  if (!item && z.outOfWorld(session)) {
    for (const container of ["lockbox", "vault"]) {
      const items = await loadContainer(z.env.DB, session.pubkey, container);
      item = z.findCarried({ ...session, items }, arg);
      if (item) break;
    }
  }
  if (item?.itemId !== "invite-letter") return false;
  const letter = await z.env.DB.prepare("SELECT i.message, p.name FROM invites i LEFT JOIN players p ON p.pubkey = i.inviter WHERE i.code = ?")
    .bind(item.inviteCode || "").first<{ message: string; name: string | null }>();
  const name = letter?.name || "a wanderer";
  z.send(session, letter ? (letter.message || name + " has sent for you. There is room beside the fire.") + "\n— " + name : "The folds have worn the writing away.");
  return true;
}
