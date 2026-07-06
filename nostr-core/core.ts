// core.ts — Nostr transport: read (query/subscribe) + publish (already-signed).
//
// Pairs with the nostr-auth kit: the auth kit OWNS signing (secure key store /
// bunker / extension); this module owns TRANSPORT. Flow:
//   const signed = await auth.signEvent(draft);   // from nostr-auth
//   await publishEvent(signed);                    // from here
//
// Reads use a single persistent WebSocket per relay, multiplexed by subscription
// id — one socket per relay instead of one per query (Safari kills 50+ sockets).
//
// Only runtime dependency: nostr-tools (lazy-loaded for the SimplePool profile get).

import { readRelays, writeRelays } from './relays';

let NostrTools: any = null;
let pool: any = null;

/** Lazy-load nostr-tools + a SimplePool (used by fetchProfile/fetchContactList). */
export async function loadNostrTools(): Promise<void> {
  if (NostrTools) return;
  NostrTools = await import('nostr-tools');
  const { SimplePool } = await import('nostr-tools/pool');
  pool = new SimplePool();
}

// ── Shared raw-WebSocket relay pool ───────────────────────────────────────────
// One persistent socket per relay, reused across every query/subscription and
// multiplexed by subscription id.
interface PooledRelay {
  url: string;
  ws: WebSocket | null;
  ready: boolean;
  subs: Map<string, { handler: (d: any[]) => void; req: string }>;
}
const _relayPool = new Map<string, PooledRelay>();

function ensureRelay(r: PooledRelay): void {
  if (r.ws && (r.ws.readyState === WebSocket.OPEN || r.ws.readyState === WebSocket.CONNECTING)) return;
  let ws: WebSocket;
  try { ws = new WebSocket(r.url); } catch { r.ws = null; r.ready = false; return; }
  r.ws = ws; r.ready = false;
  ws.onopen = () => { r.ready = true; for (const s of r.subs.values()) { try { ws.send(s.req); } catch {} } };
  ws.onmessage = (ev) => {
    try { const d = JSON.parse((ev as MessageEvent).data); const s = r.subs.get(d[1]); if (s) s.handler(d); } catch {}
  };
  ws.onclose = () => { r.ready = false; r.ws = null; };
  ws.onerror = () => {};
}

function getRelay(url: string): PooledRelay {
  let r = _relayPool.get(url);
  if (!r) { r = { url, ws: null, ready: false, subs: new Map() }; _relayPool.set(url, r); }
  ensureRelay(r);
  return r;
}

function addSub(r: PooledRelay, subId: string, req: string, handler: (d: any[]) => void): void {
  r.subs.set(subId, { handler, req });
  if (r.ws && r.ready && r.ws.readyState === WebSocket.OPEN) { try { r.ws.send(req); } catch {} }
  else ensureRelay(r);
}

function removeSub(r: PooledRelay, subId: string): void {
  if (!r.subs.delete(subId)) return;
  if (r.ws && r.ready && r.ws.readyState === WebSocket.OPEN) { try { r.ws.send(JSON.stringify(['CLOSE', subId])); } catch {} }
}

/**
 * Query events from relays via raw WebSocket REQ. Collects from each relay until
 * EOSE or a 6s timeout, then dedupes by id. Defaults to the configured read relays.
 */
export async function queryEvents(filter: any, relayUrls?: string[]): Promise<any[]> {
  const relays = relayUrls ?? readRelays();
  const subId = 'q' + Math.random().toString(36).slice(2, 10);

  const queryRelay = (url: string): Promise<any[]> =>
    new Promise((resolve) => {
      const r = getRelay(url);
      const collected: any[] = [];
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); removeSub(r, subId); resolve(collected); };
      const timer = setTimeout(finish, 6000);
      addSub(r, subId, JSON.stringify(['REQ', subId, filter]), (d) => {
        if (d[0] === 'EVENT' && d[1] === subId) collected.push(d[2]);
        else if (d[0] === 'EOSE' && d[1] === subId) finish();
      });
    });

  const results = await Promise.all(relays.map(queryRelay));
  const byId = new Map<string, any>();
  for (const list of results) for (const ev of list) if (!byId.has(ev.id)) byId.set(ev.id, ev);
  return [...byId.values()];
}

/**
 * Live subscription via the pooled sockets — stays open and fires onEvent for each
 * event (including new ones after EOSE). Returns an unsubscribe function.
 */
export function subscribeEvents(filter: any, onEvent: (ev: any) => void, relayUrls?: string[]): () => void {
  const relays = relayUrls ?? readRelays();
  const subId = 's' + Math.random().toString(36).slice(2, 10);
  const seen = new Set<string>();

  for (const url of relays) {
    const r = getRelay(url);
    addSub(r, subId, JSON.stringify(['REQ', subId, filter]), (d) => {
      if (d[0] === 'EVENT' && d[1] === subId && !seen.has(d[2].id)) { seen.add(d[2].id); onEvent(d[2]); }
    });
  }

  return () => {
    for (const url of relays) { const r = _relayPool.get(url); if (r) removeSub(r, subId); }
  };
}

/**
 * Publish an ALREADY-SIGNED event (sign it with the auth kit first). Uses raw
 * per-publish WebSockets for reliability. Returns true if ≥1 relay accepts it.
 * Defaults to the configured write relays.
 */
export async function publishEvent(event: any, relayUrls?: string[]): Promise<boolean> {
  if (!event?.id || !event?.sig) { console.warn('[nostr-core] publishEvent needs a signed event (id + sig)'); return false; }
  const relays = relayUrls ?? writeRelays();

  const publishToRelay = (url: string): Promise<{ url: string; ok: boolean; msg: string }> =>
    new Promise((resolve) => {
      try {
        const ws = new WebSocket(url);
        let done = false;
        const finish = (ok: boolean, msg: string) => {
          if (done) return;
          done = true;
          try { ws.close(); } catch (_) {}
          resolve({ url, ok, msg });
        };
        const timer = setTimeout(() => finish(false, 'no response (timeout)'), 6000);
        ws.onopen = () => ws.send(JSON.stringify(['EVENT', event]));
        ws.onmessage = (msg) => {
          try {
            const d = JSON.parse(msg.data);
            if (Array.isArray(d) && d[0] === 'OK' && d[1] === event.id) {
              clearTimeout(timer);
              finish(d[2] === true, typeof d[3] === 'string' ? d[3] : '');
            }
          } catch (_) {}
        };
        ws.onerror = () => finish(false, 'connection error');
        ws.onclose = () => finish(false, 'closed');
      } catch (_) { resolve({ url, ok: false, msg: 'failed to open' }); }
    });

  const results = await Promise.all(relays.map(publishToRelay));
  return results.filter(r => r.ok).length > 0;
}

// ── Read helpers (satisfy the auth kit's fetchProfile / fetchFollows deps) ──────

/** Fetch a user's kind:0 profile metadata (parsed). Returns {} if none/unreadable. */
export async function fetchProfile(pubkey: string): Promise<any> {
  if (!pool) await loadNostrTools();
  try {
    const event = await pool.get(readRelays(), { kinds: [0], authors: [pubkey] });
    if (event) return JSON.parse(event.content);
  } catch (e) {
    console.warn('[nostr-core] fetchProfile failed:', e);
  }
  return {};
}

/**
 * Fetch a user's kind:3 contact list. Returns the raw tags (relay hints preserved)
 * and the set of followed hex pubkeys. Use `[...follows]` for the auth kit's
 * fetchFollows dep.
 */
export async function fetchContactList(pubkey: string): Promise<{ tags: string[][]; follows: Set<string> }> {
  if (!pool) await loadNostrTools();
  try {
    const event = await pool.get(readRelays(), { kinds: [3], authors: [pubkey] });
    if (!event) return { tags: [], follows: new Set() };
    const follows = new Set<string>(
      event.tags.filter((t: string[]) => t[0] === 'p').map((t: string[]) => t[1])
    );
    return { tags: event.tags, follows };
  } catch (_) {
    return { tags: [], follows: new Set() };
  }
}
