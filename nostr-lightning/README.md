# nostr-lightning

Headless Lightning payments for Nostr apps — copy this folder in. Three things:

- **NIP-47 (NWC)** — pay via a connected Nostr Wallet Connect wallet
- **WebLN** — pay via a browser wallet (`window.webln`)
- **NIP-57 zaps** — zap a Nostr user (signed kind:9734 → invoice → pay → receipt)

Signing is **injected** from the [`nostr-auth`](../nostr-auth) kit — this module never
touches your keys. Profile lookup is injected from [`nostr-core`](../nostr-core).
Only runtime dependency: `nostr-tools` (used by the NWC encryption path).

## What was stripped

The source app wired zaps to an in-game wallet (Spark), multiplayer presence pings,
and toast UI. All removed — this is the portable NIP-47/57 core only.

## Install

```bash
npm i nostr-tools
```

## Connect a wallet (NWC)

```ts
import { setNWCUri, initNWC, hasNWC } from './nostr-lightning';

await setNWCUri('nostr+walletconnect://<walletpubkey>?relay=wss://...&secret=<hex>');
// On later loads, restore the cached URI:
await initNWC();                 // plain storage
await initNWC(myPrivkeyBytes);   // OR: decrypt an at-rest-encrypted URI (nsec logins)
hasNWC(); // → true
```

`setNWCUri(uri, privkey?)` — pass a 32-byte key to AES-encrypt the URI in
localStorage; omit for plain storage. The NWC *connection* uses its own secret from
the URI, never your login key.

## Zap a user

```ts
import { zapUser } from './nostr-lightning';
import { fetchProfile } from './nostr-core';

const res = await zapUser({
  recipientPubkey,
  amountSats: 210,
  comment: 'great pond!',
  fetchProfile,            // from nostr-core — resolves their lud16
  sign: auth.signEvent,    // from nostr-auth — makes it a real NIP-57 zap
  onStatus: (m) => setLabel(m),
});

switch (res.status) {
  case 'paid':    /* done — receipt will land as kind:9735 */ break;
  case 'invoice': showQrCode(res.invoice!); break;   // no wallet → QR fallback
  case 'error':   toast(res.error!); break;
}
```

Omit `sign` to pay as a plain LNURL payment (still pays; no zap receipt published).

## Pay a lightning address or raw invoice

```ts
import { zapLightningAddress, payInvoice } from './nostr-lightning';

await zapLightningAddress({ lud16: 'alice@getalby.com', amountSats: 100, sign: auth.signEvent, recipientPubkey });
await payInvoice('lnbc1...');   // WebLN → NWC, returns boolean
```

## API

| Export | Description |
|---|---|
| `setNWCUri(uri, privkey?)` / `initNWC(privkey?)` / `getNWCUri` / `clearNWCCache` | Manage the NWC connection |
| `hasNWC()` / `hasWebLN()` | Wallet availability |
| `nwcPayInvoice(bolt11)` / `weblnPayInvoice(bolt11)` | Low-level single-rail pay |
| `payInvoice(bolt11)` | Pay via WebLN → NWC (returns boolean) |
| `zapUser({...})` | Zap by pubkey (resolves lud16 via injected `fetchProfile`) |
| `zapLightningAddress({...})` | Zap/pay a lud16 directly |
| `lud16ToUrl(lud16)` | `user@domain` → LNURL-pay URL |

## Notes

- `zapUser` needs the recipient to have `lud16` in their kind:0 profile.
- To confirm a zap landed, subscribe (via nostr-core) to `kind:9735` receipts tagged
  with your `zapEventId` — receipt-watching is app-specific and left to you.
- `payInvoice` returns `false` if no wallet is connected — handle the QR fallback
  from `zapUser`'s `{ status: 'invoice' }`.
