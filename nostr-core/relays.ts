// relays.ts — relay lists for the copy-in nostr-core module.
//
// Override at startup if you want your own relay set:
//   import { configureRelays } from './nostr-core';
//   configureRelays({ read: [...], write: [...] });
//
// `read`  — queried for events (profiles, feeds, subscriptions)
// `write` — published to (an event is "sent" if ≥1 relay accepts it)
// If `write` is omitted it defaults to `read`.

export interface RelayConfig {
  read?: string[];
  write?: string[];
}

// Sensible public defaults — reliable, widely-synced relays. No app-specific relay.
const DEFAULT_READ = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://offchain.pub',
  'wss://nostr.mom',
];

let _read: string[] = [...DEFAULT_READ];
let _write: string[] = [...DEFAULT_READ];

export function configureRelays(cfg: RelayConfig): void {
  if (cfg.read)  _read  = [...cfg.read];
  if (cfg.write) _write = [...cfg.write];
  else if (cfg.read) _write = [...cfg.read];
}

export function readRelays(): string[] { return _read; }
export function writeRelays(): string[] { return _write; }
