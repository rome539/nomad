# nomad-server

The dungeon authority for **NOMAD** — a multi-user dungeon where Nostr is the
wire protocol, not just the login. The spec is [../NIP.md](../NIP.md); the
roadmap and every decision that shaped it live in
[../ROADMAP.md](../ROADMAP.md); when a key leaks, [RUNBOOK.md](RUNBOOK.md).

## Architecture

- **Cloudflare Worker** — HTTP routes: npub login (challenge/verify → JWT →
  single-use WebSocket ticket), the terminal
  client page at `/`, the `/ws` direct door, the blinded mint counter at
  `/mints`, and the dungeon's own avatar at `/icon.png`.
- **Zone Durable Object** (`ZoneDO`) — one per zone. Authoritative hot state:
  who's in which room, creature HP/hunger/grudges, ground items. DO alarms
  drive the 2s tick (combat rounds, wandering, migration); an empty zone
  sleeps, and the first observer collapses the elapsed time (catch-up sim).
- **D1** — truth at rest: static world tables (rooms, exits, mobs, items,
  seeded by migrations), durable player records with their tallies
  (kills/deaths/boss/pvp), the mint ledger, and spent authentication challenges/tickets.
- **Drive vault** — Google authorizes access to the user's encrypted Drive file.
  Encryption and passkey recovery happen in the browser. The retired custodial
  `/auth/google` route is not available. New vaults require a long passphrase;
  existing PIN-protected backups remain readable and can be upgraded.
- **Signing** — the dungeon's **epoch key** (`GAME_SK_HEX`) attests loot
  certificates (kind 1573, serial-numbered at the gate), character sheets
  (31573), room feeds (24913), and the kind-0 profile. The cold **root key**
  signs only 31574 epoch attestations — mint and rotate with
  `scripts/mint-dungeon.mjs`, run offline. Unset `GAME_SK_HEX` = everything
  plays but nothing signs; plug the key in and signing turns on, no code
  change.
- **Relay door, outbound only** (`relay.ts`) — room feeds and player-released
  certificates go out to the `RELAYS` set as events occur; the dungeon never
  holds standing subscriptions. Unset `RELAYS` = the door stays shut (dev).
- **The dungeon forgets the forgettable** — a daily cron prunes wanderers who
  never chose a name, carry nothing, hold no live claim, and haven't been
  seen in 30 days.

## Run it

Use Node.js 22.13 or newer (Node 24 LTS is supported). The current Wrangler
and capture tooling no longer support Node 18.

```sh
npm install
cp .dev.vars.example .dev.vars   # set JWT_SECRET
npm run db:init                  # fresh local D1: schema + every tracked migration
npm run dev                      # http://localhost:8787
```

Open http://localhost:8787 in two tabs to haunt yourself. Or from a terminal:

```sh
npm run play                     # interactive
node scripts/play.mjs "look" "n" "attack rat" 8 "inventory"   # scripted
```

`db:init` refuses an existing player database rather than replaying seed/data
migrations over saved state. The obsolete remote bootstrap command was removed;
production migration history must be reviewed before any migration is applied.

## Security checks and deployment compatibility

```sh
npm run bundle:nostr
npm run bundle:vault
npm run bundle:qrcode
npm run typecheck
npm run check:served
npm run test:security
npm run test:security:runtime
npm run check:privacy
npm audit
```

The security tests use synthetic keys, real in-memory SQLite, and mocked
transport boundaries; they do not contact production, Google, or relays.
They cover login leakage, replay, vault recovery, encrypted private messages,
inventory races, atomic exchange, input limits, and Durable Object event ordering.

The runtime suite additionally requires Python 3 and permission to listen on
localhost. It builds the real Worker, starts workerd with temporary D1 and SQLite
Durable Objects, applies the full migration set, and tests actual socket upgrades,
private-message delivery, reconnects, and authentication throttling. It uses
synthetic secrets, disables outbound requests, and removes its temporary state.
With capture dependencies installed, `npm run test:security:runtime -- --browser`
also launches isolated Chrome and exercises the served UI with synthetic guest
keys and a simulated NIP-07 extension. Set `CHROME_BIN` outside macOS's default
Chrome location. External browser requests and relay sockets are blocked.

`AUTH_RATE_LIMITER` must be deployed with the Worker configuration. It limits
combined authentication/socket admission to 180 requests per minute per client
address, represented by an HMAC counter key. Missing/unavailable bindings refuse
authentication with 503; exhausted counters return 429 with `Retry-After: 60`.
Shared network addresses share the budget. Cloudflare's counters operate per
location and are approximate, so this is not a strict global request quota or
complete DDoS protection ([binding semantics](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)).
Automatic invocation logs are disabled to avoid retaining ticket-bearing URLs;
application error diagnostics remain enabled.

`npm run deploy` first runs the local privacy gate. It checks repository files,
ignored public assets, and commit/remote metadata for the current machine's home
path or identifying account name, without printing matched values. Public source
maps and private configuration files are refused. An optional
`npm run check:privacy -- --artifact-dir <directory>` checks exported build files.
Wrangler source-map uploads are explicitly disabled; locally generated maps may
still contain machine paths and must pass the check before being shared.

WebSocket clients must exchange their Bearer session token at `/auth/ticket`
and connect with `?ticket=...`. Tickets are consumed once through the existing
`auth_spent` table (migration 176); no additional database migration is needed.
The old `?token=` URL is refused. Browser clients should refresh after deployment.

Private tells use recipient lookup followed by a signed kind-24915 ciphertext.
The browser encrypts before sending; the server forwards ciphertext and never
receives the private words. Clients advertise support with `tell=1` on the
WebSocket URL; both participants need an updated client with NIP-44 support.
Legacy plaintext tell commands are refused. Sender/recipient identity and
message timing remain visible to the server and relay; this does not promise
metadata hiding or protection from malicious code served by the website.

Zone entry points serialize their state changes across D1 waits. Pending client
work is bounded, frames are capped at 8 KiB, commands at 512 characters, bench
actions at 20 rows, and trades at 16 total items. Larger bench selections act on
the first 20 and tell the player to repeat for the remainder.

## Verbs

`look` `go` (`n s e w u d`) `say` (`'`) `attack` (`k`) `get` `drop`
`inventory` (`i`) `rest` `eat` `carve` `name` `who` `help` — and the
extraction ladder: `claim` seals what you carry at the gate, `stash` /
`unstash` work the lockbox, `publish sheet|<item>` speaks a claim to the
relays. Nothing is ever published unless you ask.

What you carry is provisional until the gate seals it: unsealed loot
scatters where you die; what the dungeon sealed, the dungeon returns.
