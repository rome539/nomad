// nostr-core — headless Nostr transport (read + publish). Copy-in module.
//
// Pairs with the nostr-auth kit: auth owns SIGNING, core owns TRANSPORT.
//   import { createNostrAuth } from '../nostr-auth';
//   import { fetchProfile, fetchContactList, publishEvent } from '../nostr-core';
//
//   const auth = createNostrAuth({
//     NostrTools, nip19: NostrTools.nip19,
//     fetchProfile,
//     fetchFollows: async (pk) => [...(await fetchContactList(pk)).follows],
//     onLoginSuccess, onLogout,
//   });
//   const signed = await auth.signEvent(draft);
//   await publishEvent(signed);
//
// See README.md.

export { configureRelays, readRelays, writeRelays } from './relays';
export type { RelayConfig } from './relays';

export {
  loadNostrTools,
  queryEvents,
  subscribeEvents,
  publishEvent,
  fetchProfile,
  fetchContactList,
} from './core';
