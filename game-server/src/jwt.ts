// Minimal stateless HS256 JWT using WebCrypto (no external dep).
import { nowSec } from "./util";

const enc = new TextEncoder();

function b64urlFromBytes(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlFromString(str: string): string {
  return b64urlFromBytes(enc.encode(str));
}

function stringFromB64url(b64: string): string {
  const pad = b64.replace(/-/g, "+").replace(/_/g, "/");
  return atob(pad);
}

async function hmac(secret: string, msg: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  ttlSec: number,
): Promise<string> {
  const iat = nowSec();
  const body = { ...payload, iat, exp: iat + ttlSec };
  const header = b64urlFromString(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = b64urlFromString(JSON.stringify(body));
  const data = `${header}.${claims}`;
  const sig = b64urlFromBytes(await hmac(secret, data));
  return `${data}.${sig}`;
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<Record<string, any> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = b64urlFromBytes(await hmac(secret, data));
  if (!timingSafeEqual(expected, parts[2])) return null;
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(stringFromB64url(parts[1]));
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && payload.exp < nowSec()) return null;
  return payload;
}
