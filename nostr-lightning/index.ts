// nostr-lightning — headless Lightning payments: NIP-47 (NWC) + WebLN + NIP-57 zaps.
//
// Copy-in. Signing is injected from the nostr-auth kit (private keys never reach
// this module). Composes with nostr-core's fetchProfile for zap-by-pubkey.
//
//   import { setNWCUri, zapUser } from './nostr-lightning';
//   import { fetchProfile } from './nostr-core';
//
//   await setNWCUri('nostr+walletconnect://...');       // connect a wallet once
//   const res = await zapUser({
//     recipientPubkey, amountSats: 100, comment: 'nice catch!',
//     fetchProfile, sign: auth.signEvent,
//   });
//   if (res.status === 'invoice') showQr(res.invoice);   // no wallet → QR fallback
//
// See README.md.

export {
  initNWC,
  clearNWCCache,
  getNWCUri,
  setNWCUri,
  hasNWC,
  hasWebLN,
  nwcPayInvoice,
  weblnPayInvoice,
} from './nwc';
export type { NWCPayResult } from './nwc';

export {
  lud16ToUrl,
  payInvoice,
  zapLightningAddress,
  zapUser,
} from './zap';
export type { ZapResult, ZapAddressOptions, ZapUserOptions, SignEvent } from './zap';
