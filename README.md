# NOMAD

**Nostr Open Multi-user Adventure Dungeon** — a living text dungeon that
keeps its identity, its loot, and its voice on Nostr. Your key is your
character. The dungeon signs what you carry out with a key of its own, and
narrates its dead and its arrivals to the relays as they happen.

**Play now:** https://nomadmud.com — no signup. A key is minted into your
pocket the moment you arrive; bring your own npub if you have one.

**The dungeon itself is on Nostr:**
`npub1n7uszpehfs385qfpe636cvmxvwqyh32qprd4uawfr2kunguh926q9ya2fq`
It speaks the beats a distant watcher would care about — a fight, a death,
an arrival — to the relays as they happen. Subscribe to kind `24913` from
that key and watch the world move. (It's an *ephemeral* kind: relays don't
store it and ordinary clients won't render it, so it's a live spectator
layer you subscribe to, not a timeline you scroll. Idle wandering stays
home — that was flooding the relays. Names are scrubbed on the way out:
the world doesn't snitch.)

## What makes it different

- **Your key is your character.** Anyone with an npub already has a
  wanderer waiting at the gate. No account to make, none to lose.
- **It's a simulation, not a lobby.** Creatures sleep, hunger, migrate,
  remember grudges, and hunt each other in rooms nobody is standing in.
  Wounds don't close on their own. Walk away and the world moves on
  without you — it fast-forwards what it owed you while you were gone.
- **Loot is a certificate, not a database row.** The dungeon signs what
  you extract (kind `1573`, serial-numbered). Anyone can verify it against
  the dungeon's key — even if this server vanishes. But the seal is title,
  not armour: everything you die holding scatters where you fall, sealed
  or not. Only what you banked at a gate outlives you.
- **Other wanderers are the sharpest thing down there.** PvP is live and
  it isn't gentle: kill someone and you take everything they were
  carrying. Get killed and you wake at a gate with nothing. The only
  defence is banking what you can't afford to lose.
- **Nothing about you is published unless you say so.** `publish sheet`
  and `publish <item>` are the player's act. Supply stays auditable
  through a blinded mint counter (`/mints` — serial, time, rarity, never
  the owner).
- **The world doesn't snitch.** Deaths leave nameless traces; killers
  just look bloody when you meet them. Reputation is evidence, not a
  scoreboard.

## The protocol

[NIP.md](NIP.md) is the draft spec: six event kinds (24911–13 play
traffic, 31573 character sheets, 1573 loot certificates, 31574 epoch
attestations), the certificates-not-broadcasts rule, and a root→epoch key
hierarchy so "the dungeon signs forever" never means "one leak ends the
world" ([game-server/RUNBOOK.md](game-server/RUNBOOK.md) is the fire
drill).

Anyone can build against the public surface today — leaderboards from
published sheets, a room-feed "weather channel," mint-supply watchers —
no API key, no permission. Subscribe and go.

## Run your own

```sh
cd game-server
npm install
cp .dev.vars.example .dev.vars   # set JWT_SECRET
npm run db:init                  # schema + seed 'the Door' (local D1)
npm run dev                      # http://localhost:8787
```

[game-server/README.md](game-server/README.md) covers the architecture
(Cloudflare Worker + one Durable Object per zone + D1). It deploys on the
Cloudflare free plan. (The workers.dev address stays open as a side door:
https://nomad-server.rome47.workers.dev.)

## Repository

| Path | What |
|---|---|
| `game-server/` | the dungeon: engine, world, auth, signing, migrations |
| `NIP.md` | draft spec — Multi-User Dungeons over Nostr |
| `COMBAT.md` | how the dungeon fights — every rule and number in one place |
| `ROADMAP.md` | where this is going, and every decision that shaped it |
| `promo/` | the trailer (self-playing CRT cut) + headless mp4 capture rig |
| `nostr-auth/` | proven NIP-46 bunker client, from nostr-district |

MIT licensed. The door has been open a hundred years. Come down.
