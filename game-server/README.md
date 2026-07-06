# nomad-server

The dungeon authority for **NOMAD** — a multi-user dungeon where Nostr is the
wire protocol, not just the login. The spec is [../NIP.md](../NIP.md); the
roadmap and every decision that shaped it live in
[../ROADMAP.md](../ROADMAP.md); when a key leaks, [RUNBOOK.md](RUNBOOK.md).

## Architecture

- **Cloudflare Worker** — HTTP routes: npub login (challenge/verify → JWT),
  "Continue with Google" custodial backup (`/auth/google`), the terminal
  client page at `/`, the `/ws` direct door, the blinded mint counter at
  `/mints`, and the dungeon's own avatar at `/icon.png`.
- **Zone Durable Object** (`ZoneDO`) — one per zone. Authoritative hot state:
  who's in which room, creature HP/hunger/grudges, ground items. DO alarms
  drive the 2s tick (combat rounds, wandering, migration); an empty zone
  sleeps, and the first observer collapses the elapsed time (catch-up sim).
- **D1** — truth at rest: static world tables (rooms, exits, mobs, items,
  seeded by migrations), durable player records with their tallies
  (kills/deaths/boss/pvp), the mint ledger, and sealed Google-custody keys
  (AES-256-GCM, `crypto.ts`).
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

```sh
npm install
cp .dev.vars.example .dev.vars   # set JWT_SECRET
npm run db:init                  # schema + seed 'the Door' (local D1)
npm run dev                      # http://localhost:8787
```

Open http://localhost:8787 in two tabs to haunt yourself. Or from a terminal:

```sh
npm run play                     # interactive
node scripts/play.mjs "look" "n" "attack rat" 8 "inventory"   # scripted
```

## Verbs

`look` `go` (`n s e w u d`) `say` (`'`) `attack` (`k`) `get` `drop`
`inventory` (`i`) `rest` `eat` `carve` `name` `who` `help` — and the
extraction ladder: `claim` seals what you carry at the gate, `stash` /
`unstash` work the lockbox, `publish sheet|<item>` speaks a claim to the
relays. Nothing is ever published unless you ask.

What you carry is provisional until the gate seals it: unsealed loot
scatters where you die; what the dungeon sealed, the dungeon returns.
