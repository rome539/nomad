// At-rest encryption for custodial keys. A Google wanderer's Nostr secret is
// stored sealed with the server's KEY_ENC_SECRET (AES-256-GCM, random IV per
// record), so a database dump alone never yields a single playable key.
import type { Env } from "./env";
import { hexToBytes, bytesToHex } from "./util";

async function kek(env: Env): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    hexToBytes(env.KEY_ENC_SECRET),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// hex secret -> base64(iv ‖ ciphertext)
export async function sealSecret(env: Env, hexSecret: string): Promise<string> {
  const key = await kek(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, hexToBytes(hexSecret)),
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return b64(packed);
}

// base64(iv ‖ ciphertext) -> hex secret
export async function openSecret(env: Env, packed: string): Promise<string> {
  const key = await kek(env);
  const data = unb64(packed);
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
  return bytesToHex(pt);
}
