/**
 * zap.ts — NIP-57 zaps + LNURL-pay.
 *
 * Flow: resolve the recipient's lightning address → (optionally) build & sign a
 * kind:9734 zap request → request a bolt11 invoice → pay via WebLN → NWC, or
 * return the invoice for a QR fallback.
 *
 * Signing is INJECTED (pass the auth kit's `auth.signEvent`) — this module never
 * touches your keys. If you don't pass a signer, it pays as a plain LNURL payment
 * (still works; the recipient just won't get a kind:9735 zap receipt).
 *
 * Only runtime dependency: nostr-tools is NOT required here (pure fetch + your
 * injected signer). Pairs with ./nwc for the actual payment.
 */

import { nwcPayInvoice, weblnPayInvoice, hasNWC, hasWebLN } from './nwc';

/** Recipient relays advertised in the zap request (where receipts get published). */
const ZAP_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.mostr.pub'];

export interface ZapResult {
  status:      'paid' | 'invoice' | 'error';
  invoice?:    string;   // bolt11, for QR fallback when no wallet paid
  verifyUrl?:  string;   // LNURL-pay verify endpoint for polling
  zapEventId?: string;   // signed kind:9734 id (to match the incoming receipt)
  error?:      string;
}

/** Sign a Nostr event draft → returns the signed event (id + sig). From the auth kit. */
export type SignEvent = (draft: any) => Promise<any>;

// ── LNURL helpers ────────────────────────────────────────────────────────────

/** user@domain → https://domain/.well-known/lnurlp/user */
export function lud16ToUrl(lud16: string): string | null {
  const [user, domain] = lud16.split('@');
  if (!user || !domain) return null;
  return `https://${domain}/.well-known/lnurlp/${user}`;
}

async function fetchLNURLPData(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error('LNURL fetch failed');
  return r.json();
}

async function fetchInvoice(callbackUrl: string, amountMsats: number, zapRequestJson: string | null): Promise<{ pr: string; verify?: string } | null> {
  const params = new URLSearchParams({ amount: String(amountMsats) });
  if (zapRequestJson) params.set('nostr', zapRequestJson);
  try {
    const r = await fetch(`${callbackUrl}?${params}`);
    const data = await r.json();
    if (!data.pr) return null;
    return { pr: data.pr, verify: data.verify || undefined };
  } catch { return null; }
}

/** Pay a bolt11 invoice via WebLN → NWC. Returns true if paid. */
export async function payInvoice(bolt11: string): Promise<boolean> {
  if (hasWebLN()) { try { if ((await weblnPayInvoice(bolt11)).preimage) return true; } catch {} }
  if (hasNWC())   { try { if ((await nwcPayInvoice(bolt11)).preimage) return true; } catch {} }
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ZapAddressOptions {
  /** Recipient lightning address (user@domain). */
  lud16: string;
  amountSats: number;
  comment?: string;
  /** Recipient's Nostr pubkey — required (with `sign`) to send as a real NIP-57 zap. */
  recipientPubkey?: string;
  /** Auth kit's signEvent — omit to pay as a plain LNURL payment (no zap receipt). */
  sign?: SignEvent;
  onStatus?: (msg: string) => void;
}

/**
 * Pay a lightning address. If `sign` + `recipientPubkey` are given, sends a proper
 * NIP-57 zap (so a kind:9735 receipt is published); otherwise a plain LNURL payment.
 */
export async function zapLightningAddress(opts: ZapAddressOptions): Promise<ZapResult> {
  const { lud16, amountSats, comment = '', recipientPubkey, sign, onStatus } = opts;
  const amountMsats = amountSats * 1000;
  const url = lud16ToUrl(lud16);
  if (!url) return { status: 'error', error: 'Invalid lightning address' };

  onStatus?.('Connecting…');
  let lnurlData: any;
  try { lnurlData = await fetchLNURLPData(url); }
  catch { return { status: 'error', error: 'Could not reach lightning server' }; }
  if (!lnurlData?.callback) return { status: 'error', error: 'Invalid LNURL response' };

  const minSendable = lnurlData.minSendable || 1000;
  const maxSendable = lnurlData.maxSendable || 100000000000;
  if (amountMsats < minSendable || amountMsats > maxSendable) {
    return { status: 'error', error: `Amount out of range (${Math.ceil(minSendable / 1000)}–${Math.floor(maxSendable / 1000)} sats)` };
  }

  // Build a signed NIP-57 zap request when possible so a kind:9735 receipt is emitted.
  let zapRequestJson: string | null = null;
  let zapEventId: string | undefined;
  const nostrPubkey: string | undefined = lnurlData.allowsNostr ? lnurlData.nostrPubkey : undefined;
  if (nostrPubkey && sign && recipientPubkey) {
    onStatus?.('Building zap request…');
    const zapReq = {
      kind: 9734,
      created_at: Math.floor(Date.now() / 1000),
      content: comment,
      tags: [
        ['p', recipientPubkey],
        ['amount', String(amountMsats)],
        ['lnurl', lnurlData.callback],
        ['relays', ...ZAP_RELAYS],
      ],
    };
    try { const signed = await sign(zapReq); zapRequestJson = JSON.stringify(signed); zapEventId = signed.id; }
    catch (e) { console.warn('[zap] 9734 signing failed — paying as plain LNURL, no receipt:', e); }
  }

  onStatus?.('Requesting invoice…');
  const inv = await fetchInvoice(lnurlData.callback, amountMsats, zapRequestJson);
  if (!inv) return { status: 'error', error: 'Failed to get invoice' };

  onStatus?.('Paying…');
  if (await payInvoice(inv.pr)) return { status: 'paid', zapEventId };

  // No wallet available/succeeded — hand back the invoice for a QR fallback.
  return { status: 'invoice', invoice: inv.pr, verifyUrl: inv.verify, zapEventId };
}

export interface ZapUserOptions {
  recipientPubkey: string;
  amountSats: number;
  comment?: string;
  /** Resolve the recipient's kind:0 profile — pass nostr-core's `fetchProfile`. */
  fetchProfile: (pubkey: string) => Promise<Record<string, any>>;
  /** Auth kit's signEvent — omit to pay as a plain LNURL payment. */
  sign?: SignEvent;
  onStatus?: (msg: string) => void;
}

/**
 * Zap a Nostr user by pubkey: resolves their lud16 from their profile, then zaps.
 * `fetchProfile` is injected (use nostr-core's) so this module stays transport-free.
 */
export async function zapUser(opts: ZapUserOptions): Promise<ZapResult> {
  const { recipientPubkey, amountSats, comment, fetchProfile, sign, onStatus } = opts;
  onStatus?.('Fetching profile…');
  const profile = await fetchProfile(recipientPubkey).catch(() => null);
  const lud16: string | undefined = profile?.lud16;
  if (!lud16) return { status: 'error', error: 'Recipient has no lightning address' };
  return zapLightningAddress({ lud16, amountSats, comment, recipientPubkey, sign, onStatus });
}
