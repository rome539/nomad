// A NAME AND A PASSWORD BRING A WANDERER BACK (rome, 2026-11-18).
//
// A newcomer's key is made by the game and lives only in the browser, so a
// cleared history lost the wanderer for good. This keeps a LOCKED copy of that
// key, filed under the wanderer, and hands it back for the right password.
//
// WE NEVER HOLD A KEY. The browser derives 512 bits from the password
// (PBKDF2-SHA256, a random salt, KEYSAVE_ITER rounds): the first half locks the
// key with AES-GCM before it is sent, the second half is the "check". We keep
// the locked copy and a hash of the check. The check only proves the password
// was right, it cannot unlock anything, and the locked copy is only handed out
// to someone who sends the right check, so a stranger who knows a name cannot
// take the copy away and guess at it. Wrong tries are capped per wanderer.
//
// FILED BY KEY, FOUND BY NAME. A row is keyed by the wanderer's pubkey and
// looked up through players.name, so a rename moves the save with no extra
// step and the old name stops opening it. Names are unique (renamePlayer).
//
// ONLY THE GAME'S OWN KEYS. A pasted nsec, an extension or a signer is never
// offered this (public.ts keySaveAllowed); the server cannot tell a key's
// history, so that rule lives in the client, and a saved row only ever opens
// for the key that saved it.
import type { Env } from "./env";
import { json, readJsonBounded } from "./http";
import { requirePubkey } from "./auth";
import { verifyEvent, type Event } from "nostr-tools";
import { nowSec } from "./util";

export const KEYSAVE_ITER = 600_000;      // as the Drive vault (nostr-auth backupCrypto)
export const KEYSAVE_TRIES = 5;           // wrong passwords a wanderer's save takes...
export const KEYSAVE_TRIES_WINDOW = 3600; // ...in this many seconds
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

async function body(req: Request): Promise<Record<string, unknown> | null> {
  try { const b = await readJsonBounded(req, 4096); return b && typeof b === "object" ? b : null; } catch { return null; }
}

async function sha256Hex(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Bind each mutation to the authenticated key, exact URL and encrypted payload.
// auth_spent's primary key makes each signed request usable once across Workers.
async function authorizeMutation(req: Request, env: Env, pubkey: string, proof: unknown, payload: object): Promise<boolean> {
  const event = proof as Event | undefined;
  const now = nowSec();
  if (!event || event.pubkey !== pubkey || event.kind !== 27235 || event.content !== ""
      || !Number.isSafeInteger(event.created_at) || Math.abs(now - event.created_at) > 60
      || !Array.isArray(event.tags) || event.tags.length !== 4) return false;
  const digest = await sha256Hex(JSON.stringify(payload));
  const [url, method, hash, nonce] = event.tags;
  if (url?.[0] !== "u" || url[1] !== req.url || method?.[0] !== "method" || method[1] !== "POST"
      || hash?.[0] !== "payload" || hash[1] !== digest || nonce?.[0] !== "nonce"
      || typeof nonce[1] !== "string" || !/^[a-f0-9-]{36}$/.test(nonce[1])) return false;
  try { if (!verifyEvent(event)) return false; } catch { return false; }
  const spent = await env.DB.prepare("INSERT OR IGNORE INTO auth_spent (jti, exp) VALUES (?, ?)")
    .bind("keysave:" + event.id, event.created_at + 61).run();
  return spent.meta.changes === 1;
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const nameOf = (b: Record<string, unknown> | null): string =>
  typeof b?.name === "string" ? b.name.trim().slice(0, 64) : "";

async function saveForName(env: Env, name: string) {
  if (!name) return null;
  return await env.DB.prepare(
    `SELECT k.minted, k.pubkey, k.salt, k.iter, k.iv, k.ct, k.check_hash, k.tries, k.tries_at
       FROM players p JOIN key_saves k ON k.pubkey = p.pubkey
      WHERE p.name = ? COLLATE NOCASE LIMIT 1`,
  ).bind(name).first<{ minted: number; pubkey: string; salt: string; iter: number; iv: string; ct: string; check_hash: string; tries: number; tries_at: number }>();
}

// POST /keysave/salt { name } -> { salt, iter }
// The salt is not a secret; it is what the browser needs to turn the password
// into the check. A name with no save gets a made-up salt that is always the
// same for that name, so this cannot be used to learn who has saved.
export async function handleKeySaveSalt(req: Request, env: Env): Promise<Response> {
  const name = nameOf(await body(req));
  if (!name) return json({ error: "bad_request" }, 400);
  const row = await saveForName(env, name);
  if (row) return json({ salt: row.salt, iter: row.iter });
  const fake = (await sha256Hex("keysave-fake-salt:" + env.JWT_SECRET + ":" + name.toLowerCase())).slice(0, 32);
  const salt = btoa(String.fromCharCode(...fake.match(/../g)!.map((h) => parseInt(h, 16))));
  return json({ salt, iter: KEYSAVE_ITER });
}

// POST /keysave/open { name, check } -> { pubkey, iv, ct }
export async function handleKeySaveOpen(req: Request, env: Env): Promise<Response> {
  const b = await body(req);
  const name = nameOf(b);
  const check = typeof b?.check === "string" ? b.check : "";
  if (!name || !/^[0-9a-f]{64}$/.test(check)) return json({ error: "bad_request" }, 400);
  const row = await saveForName(env, name);
  if (!row) return json({ error: "no" }, 401);
  const now = nowSec();
  const inWindow = now - row.tries_at < KEYSAVE_TRIES_WINDOW;
  const tries = inWindow ? row.tries : 0;
  if (tries >= KEYSAVE_TRIES) return json({ error: "too_many" }, 429);
  if (!sameHex(await sha256Hex(check), row.check_hash)) {
    await env.DB.prepare("UPDATE key_saves SET tries = ?, tries_at = ? WHERE pubkey = ?")
      .bind(tries + 1, inWindow ? row.tries_at : now, row.pubkey).run();
    return json({ error: "no" }, 401);
  }
  await env.DB.prepare("UPDATE key_saves SET tries = 0, tries_at = 0 WHERE pubkey = ?").bind(row.pubkey).run();
  return json({ pubkey: row.pubkey, iv: row.iv, ct: row.ct, minted: row.minted === 1 });
}

// POST /keysave  Authorization: Bearer <session>  { salt, iter, iv, ct, check } -> { name }
// The proof also covers first saves, so the upsert cannot bypass replacement checks.
export async function handleKeySave(req: Request, env: Env): Promise<Response> {
  const pubkey = await requirePubkey(req, env);
  if (!pubkey) return json({ error: "unauthorized" }, 401);
  const b = await body(req);
  const str = (k: string, max: number) => (typeof b?.[k] === "string" && (b[k] as string).length <= max && B64.test(b[k] as string) ? b[k] as string : "");
  const salt = str("salt", 64), iv = str("iv", 32), ct = str("ct", 128);
  const check = typeof b?.check === "string" && /^[0-9a-f]{64}$/.test(b.check) ? b.check : "";
  if (!salt || !iv || !ct || !check || b?.iter !== KEYSAVE_ITER) return json({ error: "bad_request" }, 400);
  if (!await authorizeMutation(req, env, pubkey, b.proof, { salt, iter: KEYSAVE_ITER, iv, ct, check })) {
    return json({ error: "invalid_proof" }, 401);
  }
  const player = await env.DB.prepare("SELECT name FROM players WHERE pubkey = ?").bind(pubkey).first<{ name: string }>();
  if (!player) return json({ error: "no_wanderer" }, 404);
  await env.DB.prepare(
    `INSERT INTO key_saves (pubkey, salt, iter, iv, ct, check_hash, tries, tries_at, saved_at, minted)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 1)
     ON CONFLICT(pubkey) DO UPDATE SET salt = excluded.salt, iter = excluded.iter, iv = excluded.iv,
       ct = excluded.ct, check_hash = excluded.check_hash, tries = 0, tries_at = 0, saved_at = excluded.saved_at, minted = excluded.minted`,
  ).bind(pubkey, salt, KEYSAVE_ITER, iv, ct, await sha256Hex(check), nowSec()).run();
  return json({ name: player.name });
}

// POST /keysave/status  Authorization: Bearer <session> -> { saved, name }
export async function handleKeySaveStatus(req: Request, env: Env): Promise<Response> {
  const pubkey = await requirePubkey(req, env);
  if (!pubkey) return json({ error: "unauthorized" }, 401);
  const row = await env.DB.prepare(
    "SELECT p.name AS name, k.pubkey AS saved FROM players p LEFT JOIN key_saves k ON k.pubkey = p.pubkey WHERE p.pubkey = ?",
  ).bind(pubkey).first<{ name: string; saved: string | null }>();
  return json({ saved: !!row?.saved, name: row?.name ?? "" });
}

// POST /keysave/remove  Authorization: Bearer <session> -> { ok }
export async function handleKeySaveRemove(req: Request, env: Env): Promise<Response> {
  const pubkey = await requirePubkey(req, env);
  if (!pubkey) return json({ error: "unauthorized" }, 401);
  const b = await body(req);
  if (!await authorizeMutation(req, env, pubkey, b?.proof, {})) return json({ error: "invalid_proof" }, 401);
  await env.DB.prepare("DELETE FROM key_saves WHERE pubkey = ?").bind(pubkey).run();
  return json({ ok: true });
}

// POST /keysave/name { name } -> { ok, free }
// THE DOOR ASKS A NEW WANDERER'S NAME (public.ts doorName) before it has stepped
// in, so it is told at once that a name is taken, as an old MUD tells you. A
// name is public anywhere in the world already; this says only whether one is
// in use, never whether it has a save (that is /keysave/salt's whole care).
export async function handleKeySaveName(req: Request, env: Env): Promise<Response> {
  const name = nameOf(await body(req));
  if (!/^[a-z0-9][a-z0-9_-]{1,15}$/i.test(name)) return json({ ok: false, free: false });
  const row = await env.DB.prepare("SELECT 1 AS x FROM players WHERE name = ? COLLATE NOCASE LIMIT 1").bind(name).first();
  return json({ ok: true, free: !row });
}

export const KEYSAVE_ROUTES: Record<string, (req: Request, env: Env) => Promise<Response>> = {
  "/keysave": handleKeySave,
  "/keysave/name": handleKeySaveName,
  "/keysave/salt": handleKeySaveSalt,
  "/keysave/open": handleKeySaveOpen,
  "/keysave/status": handleKeySaveStatus,
  "/keysave/remove": handleKeySaveRemove,
};

// THE FIRST THING PUT AWAY. The first time a wanderer banks anything in a
// session the client is told, and a wanderer with no way back yet is reminded
// once (public.ts keySaveNudge). Once per session here; the client remembers
// for good.
const keptTold = new WeakSet<object>();
export function noteKept(session: { ws: { send(s: string): void } }): void {
  if (keptTold.has(session)) return;
  keptTold.add(session);
  try { session.ws.send(JSON.stringify({ v: 0, t: "kept" })); } catch {}
}
