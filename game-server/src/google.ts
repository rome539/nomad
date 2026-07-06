// "Continue with Google" verification. The browser gets a signed ID token from
// Google Identity Services and posts it here; we verify it end-to-end against
// Google's public keys before trusting a single claim in it. No client secret,
// no redirect dance — the token itself is the proof.

// Public identifier for the nomad-web OAuth client. Not a secret; it ships in
// the page too. This is the audience every valid token must name.
export const GOOGLE_CLIENT_ID =
  "952684003308-iqkr2d22nmdn0tih6luenbhurlu8l1h0.apps.googleusercontent.com";

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

interface Jwk extends JsonWebKey {
  kid: string;
}

// Google rotates signing keys; cache the set briefly within the isolate.
let certCache: { keys: Jwk[]; until: number } | null = null;

async function googleCerts(): Promise<Jwk[]> {
  const now = Date.now();
  if (certCache && certCache.until > now) return certCache.keys;
  const res = await fetch(CERTS_URL);
  const body = (await res.json()) as { keys: Jwk[] };
  // Respect Cache-Control max-age when present, else 1h.
  const cc = res.headers.get("cache-control") ?? "";
  const m = cc.match(/max-age=(\d+)/);
  const ttl = m ? parseInt(m[1], 10) * 1000 : 3600_000;
  certCache = { keys: body.keys, until: now + Math.min(ttl, 6 * 3600_000) };
  return body.keys;
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToString(s: string): string {
  return new TextDecoder().decode(b64urlToBytes(s));
}

export interface GoogleIdentity {
  sub: string; // stable, unique Google user id
  email?: string;
}

// Returns the verified identity, or null if anything is off: bad signature,
// wrong audience, wrong issuer, or expired.
export async function verifyGoogleIdToken(
  token: string,
  clientId: string,
): Promise<GoogleIdentity | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header: { alg?: string; kid?: string };
  let payload: { aud?: string; iss?: string; exp?: number; sub?: string; email?: string };
  try {
    header = JSON.parse(b64urlToString(parts[0]));
    payload = JSON.parse(b64urlToString(parts[1]));
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;

  const jwk = (await googleCerts()).find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signed = new TextEncoder().encode(parts[0] + "." + parts[1]);
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(parts[2]),
    signed,
  );
  if (!ok) return null;

  if (payload.aud !== clientId) return null;
  if (!payload.iss || !ISSUERS.has(payload.iss)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  if (!payload.sub) return null;

  return { sub: String(payload.sub), email: payload.email };
}
