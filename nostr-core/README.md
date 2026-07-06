# nostr-core

Headless Nostr **transport** — read (query/subscribe) and publish. Copy this folder
into any app. Bundler-agnostic; only runtime dependency is `nostr-tools`.

This is the other half of the [`nostr-auth`](../nostr-auth) kit:

| Concern | Who owns it |
|---|---|
| **Signing** (secure key store, bunker, extension) | `nostr-auth` (`auth.signEvent`) |
| **Transport** (query, subscribe, publish) | `nostr-core` (this) |

Keeping them split means `nostr-core` has **zero coupling** — it never touches your
session or private keys. You sign with the auth kit, then hand the signed event here.

## Install

```bash
npm i nostr-tools
```

## Configure relays (optional)

Defaults to a set of reliable public relays. Override at startup:

```ts
import { configureRelays } from './nostr-core';

configureRelays({
  read:  ['wss://relay.damus.io', 'wss://nos.lol', 'wss://your.relay'],
  write: ['wss://your.relay'],   // omit → same as read
});
```

## Use

```ts
import * as NostrTools from 'nostr-tools';
import { createNostrAuth } from './nostr-auth';
import {
  fetchProfile, fetchContactList,
  queryEvents, subscribeEvents, publishEvent,
} from './nostr-core';

// Wire the two halves: core satisfies the auth kit's read deps.
const auth = createNostrAuth({
  NostrTools,
  nip19: NostrTools.nip19,
  fetchProfile,
  fetchFollows: async (pk) => [...(await fetchContactList(pk)).follows],
  onLoginSuccess: (u) => {/* ... */},
  onLogout:       () => {/* ... */},
});

// Read
const notes = await queryEvents({ kinds: [1], authors: [pubkey], limit: 20 });
const stop  = subscribeEvents({ kinds: [1], '#p': [pubkey] }, (ev) => console.log('new', ev));
// stop() to unsubscribe

// Write: sign with auth, publish with core
const signed = await auth.signEvent({ kind: 1, created_at: Math.floor(Date.now()/1000), tags: [], content: 'gm' });
const ok = await publishEvent(signed);   // true if ≥1 relay accepted
```

## API

| Export | Description |
|---|---|
| `queryEvents(filter, relays?)` | One-shot REQ across read relays, deduped by id. Resolves on EOSE/6s. |
| `subscribeEvents(filter, onEvent, relays?)` | Live subscription; returns an unsubscribe fn. |
| `publishEvent(signedEvent, relays?)` | Publish an **already-signed** event; `true` if ≥1 relay accepts. |
| `fetchProfile(pubkey)` | kind:0 metadata (parsed), `{}` if none. |
| `fetchContactList(pubkey)` | `{ tags, follows: Set }` from kind:3. |
| `configureRelays({read, write})` | Override the relay lists. |
| `loadNostrTools()` | Preload nostr-tools + SimplePool (called lazily otherwise). |

## Design notes

- **Reads** use one persistent WebSocket per relay, multiplexed by subscription id —
  not one socket per query. Safari throttles/kills 50+ concurrent sockets, which is
  easy to hit (e.g. a screen that fires 8 fetches × 6 relays on open).
- **Publishes** use a fresh per-publish socket for reliability (avoids a nostr-tools
  pool edge case where an in-flight event ref gets nulled).
- **`publishEvent` requires a signed event** (`id` + `sig`). It won't sign for you —
  that's the auth kit's job, on purpose (private keys never reach this module).
- **Verify signatures** on anything security-sensitive you read — relays don't
  re-verify on read. (`NostrTools.verifyEvent(ev)`.)
