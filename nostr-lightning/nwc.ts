/**
 * nwc.ts — NIP-47 Nostr Wallet Connect + WebLN.
 *
 * Sends pay_invoice to a connected wallet over Nostr relays (NIP-44 v2 primary,
 * NIP-04 fallback, negotiated via the wallet's kind:13194 info event). Uses the
 * NWC connection's OWN secret (from the URI) — never your login key.
 *
 * Storage: the NWC URI can be persisted to localStorage. Optionally pass a 32-byte
 * private key to encrypt it at rest (AES-GCM via HKDF) — useful for nsec logins
 * where the page holds the key. Omit it to store plain (extension/bunker logins).
 *
 * Only runtime dependency: nostr-tools (lazy).
 */

const STORAGE_KEY   = 'nwc_uri';       // plain
const ENCRYPTED_KEY = 'nwc_uri_enc';   // AES-GCM encrypted

let _cachedUri = '';

// ── AES-GCM helpers ───────────────────────────────────────────────────────────

async function deriveAesKey(privkey: Uint8Array): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey('raw', privkey.buffer as ArrayBuffer, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode('nostr-nwc-v1'), info: new TextEncoder().encode('nwc-storage') },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function encryptUri(uri: string, privkey: Uint8Array): Promise<string> {
  const key = await deriveAesKey(privkey);
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(uri) as unknown as ArrayBuffer);
  return JSON.stringify({ iv: bytesToHex(iv), ct: bytesToHex(new Uint8Array(ct)) });
}

async function decryptUri(stored: string, privkey: Uint8Array): Promise<string> {
  const { iv: ivHex, ct: ctHex } = JSON.parse(stored);
  const key   = await deriveAesKey(privkey);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hexToBytes(ivHex).slice() }, key, hexToBytes(ctHex).slice().buffer);
  return new TextDecoder().decode(plain);
}

// ── NWC URI parser ────────────────────────────────────────────────────────────

interface NWCParsed { walletPubkey: string; relays: string[]; secret: string }

function parseNWCUri(uri: string): NWCParsed | null {
  try {
    const normalized = uri.replace('nostr+walletconnect://', 'https://').replace('nostrwalletconnect://', 'https://');
    const u = new URL(normalized);
    const walletPubkey = u.hostname;
    const secret = u.searchParams.get('secret');
    const relays = u.searchParams.getAll('relay').filter(Boolean);
    if (!walletPubkey || !secret || relays.length === 0) return null;
    return { walletPubkey, relays, secret };
  } catch { return null; }
}

// ── NIP-04 / NIP-44 helpers ────────────────────────────────────────────────────

async function nip04Encrypt(sk: string, pk: string, pt: string): Promise<string> {
  const { nip04 } = await import('nostr-tools'); return nip04.encrypt(sk, pk, pt);
}
async function nip04Decrypt(sk: string, pk: string, ct: string): Promise<string> {
  const { nip04 } = await import('nostr-tools'); return nip04.decrypt(sk, pk, ct);
}
async function nip44Encrypt(sk: string, pk: string, pt: string): Promise<string> {
  const { nip44 } = await import('nostr-tools');
  return nip44.v2.encrypt(pt, nip44.v2.utils.getConversationKey(hexToBytes(sk), pk));
}
async function nip44Decrypt(sk: string, pk: string, ct: string): Promise<string> {
  const { nip44 } = await import('nostr-tools');
  return nip44.v2.decrypt(ct, nip44.v2.utils.getConversationKey(hexToBytes(sk), pk));
}
async function privkeyToPubkey(sk: string): Promise<string> {
  const { getPublicKey } = await import('nostr-tools'); return getPublicKey(hexToBytes(sk));
}

// ── Storage — public API ────────────────────────────────────────────────────────

/**
 * Load the persisted NWC URI into the in-memory cache. Call once at startup.
 * Pass the 32-byte private key to decrypt an encrypted store; omit for plain.
 */
export async function initNWC(privkey?: Uint8Array): Promise<void> {
  if (privkey) {
    const encrypted = localStorage.getItem(ENCRYPTED_KEY);
    if (encrypted) {
      try { _cachedUri = await decryptUri(encrypted, privkey); return; }
      catch { _cachedUri = ''; }
    }
    const plain = localStorage.getItem(STORAGE_KEY);
    if (plain && parseNWCUri(plain)) {
      _cachedUri = plain;
      try { localStorage.setItem(ENCRYPTED_KEY, await encryptUri(plain, privkey)); localStorage.removeItem(STORAGE_KEY); } catch { /* keep plain */ }
    }
  } else {
    _cachedUri = localStorage.getItem(STORAGE_KEY) || '';
  }
}

/** Clear the in-memory cache (e.g. on logout). */
export function clearNWCCache(): void { _cachedUri = ''; }

/** Synchronous read of the cached URI — call initNWC() first. */
export function getNWCUri(): string { return _cachedUri; }

/** Save a NWC URI. Encrypts if a private key is given; else stores plain. Empty clears it. */
export async function setNWCUri(uri: string, privkey?: Uint8Array): Promise<boolean> {
  if (!uri) {
    _cachedUri = '';
    localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(ENCRYPTED_KEY);
    return true;
  }
  if (!parseNWCUri(uri)) return false;
  _cachedUri = uri;
  if (privkey) {
    try { localStorage.setItem(ENCRYPTED_KEY, await encryptUri(uri, privkey)); localStorage.removeItem(STORAGE_KEY); return true; }
    catch { /* fall through */ }
  }
  localStorage.setItem(STORAGE_KEY, uri);
  return true;
}

export function hasNWC(): boolean { return !!_cachedUri && !!parseNWCUri(_cachedUri); }
export function hasWebLN(): boolean { return typeof (window as any).webln !== 'undefined'; }

// ── Encryption negotiation (kind:13194 info event) ──────────────────────────────

type EncryptionScheme = 'nip44' | 'nip04';

// A FAILED LOOKUP IS NOT AN ANSWER OF "USE THE WEAKER ONE".
//
// Every path out of this used to resolve 'nip04': the timeout, the socket
// error, the close, and the parse failure alike. So anything that could stop
// the info event arriving — a slow relay, a dropped connection, or someone
// simply not forwarding kind 13194 — silently downgraded the payment request
// from nip44 to the deprecated nip04. A downgrade you can cause by dropping
// packets is a downgrade attack, and the payload here is a payment.
//
// Only a real answer decides now. EOSE is a real answer: the relay looked, the
// wallet has published no info event, and a wallet that old is legitimately
// nip04. A timeout or a broken socket is not an answer, and returns null so
// the caller can refuse rather than encrypt a payment with the weaker scheme
// to a wallet whose capabilities it never learned.
async function fetchEncryptionScheme(walletPubkey: string, relayUrl: string, timeoutMs = 5000): Promise<EncryptionScheme | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (scheme: EncryptionScheme | null) => { if (done) return; done = true; clearTimeout(timer); try { ws.close(); } catch {} resolve(scheme); };
    const timer = setTimeout(() => finish(null), timeoutMs); // no answer, not "nip04"
    let ws: WebSocket;
    try { ws = new WebSocket(relayUrl); } catch { finish(null); return; }
    const subId = 'nwc_info_' + Math.random().toString(36).slice(2, 8);
    ws.onopen = () => ws.send(JSON.stringify(['REQ', subId, { kinds: [13194], authors: [walletPubkey], limit: 1 }]));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        // The relay answered and had nothing: a wallet with no info event is a
        // pre-nip44 wallet. That is a fact about the wallet, not a network fault.
        if (msg[0] === 'EOSE') { finish('nip04'); return; }
        if (msg[0] !== 'EVENT' || msg[2]?.kind !== 13194) return;
        finish((msg[2].content || '').includes('nip44') ? 'nip44' : 'nip04');
      } catch {}
    };
    ws.onerror = () => finish(null);
    ws.onclose = () => finish(null);
  });
}

// ── Pay ─────────────────────────────────────────────────────────────────────────

export interface NWCPayResult { preimage?: string; error?: string }

/** Pay a bolt11 invoice through the connected NWC wallet. */
export async function nwcPayInvoice(invoice: string): Promise<NWCPayResult> {
  const parsed = parseNWCUri(getNWCUri());
  if (!parsed) return { error: 'No wallet connected' };
  const { walletPubkey, relays, secret } = parsed;
  const relayUrl = relays[0];

  try {
    const clientPubkey = await privkeyToPubkey(secret);
    const secretBytes  = hexToBytes(secret);
    const scheme = await fetchEncryptionScheme(walletPubkey, relayUrl);
    // Never guess. Without a real answer we do not know whether this wallet
    // speaks nip44, and guessing wrong downwards is the attack.
    if (scheme === null) return { error: 'Could not reach the wallet relay to agree on encryption' };

    const requestPayload = JSON.stringify({ method: 'pay_invoice', params: { invoice } });
    let encrypted: string;
    const encryptionTag: string[] = [];
    if (scheme === 'nip44') { encrypted = await nip44Encrypt(secret, walletPubkey, requestPayload); encryptionTag.push('encryption', 'nip44_v2'); }
    else { encrypted = await nip04Encrypt(secret, walletPubkey, requestPayload); }

    const reqEvent: any = {
      kind: 23194, pubkey: clientPubkey, created_at: Math.floor(Date.now() / 1000),
      tags: [['p', walletPubkey], ...(encryptionTag.length ? [encryptionTag] : [])],
      content: encrypted,
    };
    const { finalizeEvent } = await import('nostr-tools');
    const signed = finalizeEvent(reqEvent, secretBytes);

    return await new Promise<NWCPayResult>((resolve) => {
      const ws = new WebSocket(relayUrl);
      let done = false;
      const finish = (result: NWCPayResult) => { if (done) return; done = true; clearTimeout(timer); try { ws.close(); } catch {} resolve(result); };
      const timer = setTimeout(() => finish({ error: 'Wallet timeout' }), 30000);
      ws.onopen = () => {
        ws.send(JSON.stringify(['EVENT', signed]));
        const subId = 'nwc_' + Math.random().toString(36).slice(2, 8);
        ws.send(JSON.stringify(['REQ', subId, { kinds: [23195], authors: [walletPubkey], '#p': [clientPubkey], since: Math.floor(Date.now() / 1000) - 5 }]));
      };
      ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg[0] !== 'EVENT' || msg[2]?.kind !== 23195) return;
          const ev = msg[2];
          const encTag = ev.tags?.find((t: string[]) => t[0] === 'encryption');
          const useNip44 = encTag?.[1]?.startsWith('nip44') || scheme === 'nip44';
          let decrypted: string;
          try { decrypted = useNip44 ? await nip44Decrypt(secret, walletPubkey, ev.content) : await nip04Decrypt(secret, walletPubkey, ev.content); }
          catch { decrypted = useNip44 ? await nip04Decrypt(secret, walletPubkey, ev.content) : await nip44Decrypt(secret, walletPubkey, ev.content); }
          const response = JSON.parse(decrypted);
          if (response.error) finish({ error: response.error.message || 'Payment failed' });
          else if (response.result && typeof response.result.preimage === 'string') finish({ preimage: response.result.preimage });
          // No result at all is not a success (2026-08-20): the old line
          // resolved { preimage: undefined }, which callers read as paid.
          else finish({ error: 'The wallet answered without a payment result' });
        } catch {}
      };
      ws.onerror = () => finish({ error: 'Relay connection failed' });
    });
  } catch (err: any) {
    return { error: err?.message || 'Unknown error' };
  }
}

/** Pay a bolt11 invoice through a WebLN provider (window.webln). */
export async function weblnPayInvoice(invoice: string): Promise<NWCPayResult> {
  try {
    const webln = (window as any).webln;
    if (!webln) return { error: 'No WebLN' };
    await webln.enable();
    const result = await webln.sendPayment(invoice);
    return { preimage: result.preimage };
  } catch (err: any) {
    return { error: err?.message || 'Payment cancelled' };
  }
}
