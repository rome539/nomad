// Login = prove control of an npub. Challenge -> sign -> session JWT.
import { verifyEvent, generateSecretKey, getPublicKey, nip19, type Event } from "nostr-tools";
import type { Env } from "./env";
import { json } from "./http";
import { signJwt, verifyJwt } from "./jwt";
import { nowSec, hexToBytes, bytesToHex } from "./util";
import { verifyGoogleIdToken, GOOGLE_CLIENT_ID } from "./google";
import { sealSecret, openSecret } from "./crypto";

const CHALLENGE_TTL = 300; // 5 min
const SESSION_TTL = 7 * 24 * 3600; // 7 days
const EVENT_SKEW = 600; // accept events within 10 min of now

// The login event's kind. NIP-98 style: an auth event is not a note, and a
// signature the user gave for something else must never be spendable here.
const AUTH_KIND = 27235;
// A websocket ticket: what actually rides in the ?ticket= query string. Long
// enough to survive a slow handshake, short enough that the URL it lands in —
// history, a proxy log, a screenshot — is worthless by the time anyone reads it.
const WS_TICKET_TTL = 90;

// POST /auth/challenge -> { challenge }
// The challenge is a short-lived signed token; the client signs a Nostr event
// whose content is exactly this string. It carries a random jti so redeeming it
// can be recorded — see handleVerify. Nothing is stored until it is spent.
export async function handleChallenge(env: Env): Promise<Response> {
  const challenge = await signJwt(
    { purpose: "challenge", jti: crypto.randomUUID() },
    env.JWT_SECRET,
    CHALLENGE_TTL,
  );
  return json({ challenge });
}

// POST /auth/ticket   Authorization: Bearer <session token>  -> { ticket }
// THE SESSION TOKEN STOPS RIDING IN THE URL. A browser WebSocket cannot set
// headers, so the credential has to go in the query string — but it does not
// have to be the seven-day one. This trades a session token (held in a JS
// variable, sent over TLS in a POST body's header) for a 90-second ticket that
// opens exactly one socket and is good for nothing else.
export async function handleTicket(req: Request, env: Env): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const payload = await verifyJwt(token, env.JWT_SECRET);
  const sub = typeof payload?.sub === "string" ? payload.sub : null;
  // Only a real session token buys a ticket: a challenge has no sub, and a
  // ticket must not be able to mint another ticket and live forever by relay.
  if (!sub || payload?.purpose !== undefined) return json({ error: "unauthorized" }, 401);
  const ticket = await signJwt({ sub, purpose: "ws" }, env.JWT_SECRET, WS_TICKET_TTL);
  return json({ ticket });
}

// POST /auth/verify  { event }  -> { token, pubkey }
export async function handleVerify(req: Request, env: Env): Promise<Response> {
  let body: { event?: Event };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const event = body.event;
  if (!event || typeof event.content !== "string") {
    return json({ error: "missing_event" }, 400);
  }

  // An auth event is kind 27235 and nothing else. Without this, ANY event the
  // user ever signed whose content happened to be a live challenge string would
  // do — and more to the point, a signer prompt that says "sign this note" must
  // never be able to produce a login.
  if (event.kind !== AUTH_KIND) {
    return json({ error: "wrong_kind" }, 401);
  }

  const chal = await verifyJwt(event.content, env.JWT_SECRET);
  if (!chal || chal.purpose !== "challenge") {
    return json({ error: "invalid_challenge" }, 401);
  }
  if (Math.abs(nowSec() - event.created_at) > EVENT_SKEW) {
    return json({ error: "stale_event" }, 401);
  }
  if (!verifyEvent(event)) {
    return json({ error: "bad_signature" }, 401);
  }

  // SPEND IT. The signature is valid, but a valid signature stays valid — the
  // same signed event replayed inside the challenge's five minutes used to mint
  // a fresh session every time. The jti's primary key makes redemption a
  // one-shot: the first INSERT wins, and any later one is a replay.
  //
  // A challenge minted before this shipped has no jti; those are refused rather
  // than waved through, which costs one retry at the door and nothing else.
  const jti = typeof chal.jti === "string" ? chal.jti : "";
  if (!jti) return json({ error: "invalid_challenge" }, 401);
  try {
    const spent = await env.DB.prepare(
      "INSERT OR IGNORE INTO auth_spent (jti, exp) VALUES (?, ?)",
    ).bind(jti, nowSec() + CHALLENGE_TTL).run();
    if (!spent.meta.changes) return json({ error: "challenge_spent" }, 401);
    // Sweep as we go: rows outlive their challenge by nothing, so the table
    // stays about the size of "logins in the last five minutes".
    await env.DB.prepare("DELETE FROM auth_spent WHERE exp < ?").bind(nowSec()).run();
  } catch (e) {
    // The table is the whole anti-replay guarantee. If it can't be written,
    // fail the login rather than quietly go back to being replayable.
    return json({ error: "auth_unavailable" }, 503);
  }

  const token = await signJwt({ sub: event.pubkey }, env.JWT_SECRET, SESSION_TTL);
  return json({ token, pubkey: event.pubkey });
}

// POST /auth/google  { credential, sk? }  -> { nsec, pubkey, linked }
// "Continue with Google" is custodial key backup: the dungeon keeps your
// wanderer's key sealed to your Google account, and hands it back on any
// device. A first-timer links the guest key they arrived with (sk); a
// returning wanderer gets their stored key regardless of what they send.
export async function handleGoogle(req: Request, env: Env): Promise<Response> {
  if (!env.KEY_ENC_SECRET) return json({ error: "google_not_configured" }, 503);

  let body: { credential?: string; sk?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (typeof body.credential !== "string") return json({ error: "missing_credential" }, 400);

  const who = await verifyGoogleIdToken(body.credential, GOOGLE_CLIENT_ID);
  if (!who) return json({ error: "invalid_google_token" }, 401);

  const row = await env.DB.prepare(
    "SELECT pubkey, enc_sk FROM google_accounts WHERE sub = ?",
  )
    .bind(who.sub)
    .first<{ pubkey: string; enc_sk: string }>();

  let skHex: string;
  let pubkey: string;
  let linked = false;

  if (row) {
    // Returning wanderer: their stored key wins over whatever the browser holds.
    skHex = await openSecret(env, row.enc_sk);
    pubkey = row.pubkey;
  } else {
    // First link: adopt the guest key they came in with, else mint a fresh one.
    const provided =
      typeof body.sk === "string" && /^[0-9a-f]{64}$/i.test(body.sk.trim())
        ? body.sk.trim().toLowerCase()
        : null;
    const skBytes = provided ? hexToBytes(provided) : generateSecretKey();
    skHex = provided ?? bytesToHex(skBytes);
    pubkey = getPublicKey(skBytes);
    const enc = await sealSecret(env, skHex);
    await env.DB.prepare(
      "INSERT INTO google_accounts (sub, pubkey, enc_sk, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(who.sub, pubkey, enc, nowSec())
      .run();
    linked = true;
  }

  const nsec = nip19.nsecEncode(hexToBytes(skHex));
  // email rides along for the panel's "kept under <account>" line only —
  // it is never stored server-side (the sub is the identity, not the email).
  return json({ nsec, pubkey, linked, email: who.email ?? null });
}

// Returns the authenticated pubkey, or null if the Bearer token is missing/invalid.
export async function requirePubkey(req: Request, env: Env): Promise<string | null> {
  const header = req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const payload = await verifyJwt(header.slice(7), env.JWT_SECRET);
  return typeof payload?.sub === "string" ? payload.sub : null;
}
