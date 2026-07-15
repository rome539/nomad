# NOMAD

**Nostr Open Multi-user Adventure Dungeon** — a living text dungeon that
keeps its identity, its loot, and its voice on Nostr. Your key is your
character. The dungeon signs what you carry out with a key of its own, and
every fight, death, and arrival goes out to the relays as it happens.

**Play now:** https://nomadmud.com — no signup. A key is minted into your
pocket the moment you arrive; bring your own npub if you have one.

**The world is watchable from outside.** Every wanderer's deeds — where they
go, who they fight, what they kill, how they fall — ride out to the relays as
they happen, each one signed by that wanderer's *own* key and stamped
`nomad-arena`. Subscribe to that one tag and the whole roster moves in front of
you: a live gladiator feed you can follow one fighter at a time or all at once.
It's an *ephemeral* kind (`24913`) — relays don't keep it, ordinary clients
won't render it — a spectator layer, not a timeline you scroll. The dungeon
keeps a key of its own for the world's own voice (a boss falling, the dark
rising): `npub1n7uszpehfs385qfpe636cvmxvwqyh32qprd4uawfr2kunguh926q9ya2fq`.

Names ride out in the clear — you can't watch a fight whose fighters have none.
But the feed trails 15 seconds behind the living room, so it's a reel, not a
targeting radar; and a wanderer's words, their banking, and their loot never
touch it. The show is deeds, not everything.

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
- **Your deeds are public; your words and your kit are not.** The world is a
  spectacle now — your movements, fights, kills and death broadcast as they
  happen (under your own key, 15 seconds behind). But what you *say* stays
  yours (obfuscated in the open, sealed end-to-end for a private word), and
  what you carry, bank, and loot never leaves the room. Your portable record
  is still opt-in (`publish sheet`, `publish <item>`), and supply stays
  auditable through a blinded mint counter (`/mints` — serial, time, rarity,
  never the owner).
- **The world still won't name a killer.** A death goes out to the feed — but
  never who dealt it. Killers just look bloody when you meet them; the evidence
  walks around on their hands, not on a relay. Your *count* of kills anyone can
  verify, dungeon-signed, from `/sheet`; your *victims* nobody can.

## The protocol

[NIP.md](NIP.md) is the draft spec: six event kinds (24911–13 play
traffic, 31573 character sheets, 1573 loot certificates, 31574 epoch
attestations), the certificates-not-broadcasts rule, and a root→epoch key
hierarchy so "the dungeon signs forever" never means "one leak ends the
world" ([game-server/RUNBOOK.md](game-server/RUNBOOK.md) is the fire
drill).

Anyone can build against the public surface today — a live arena viewer off
the `nomad-arena` feed, dungeon-signed leaderboards from `/sheet`, mint-supply
watchers — no API key, no permission. Subscribe and go.

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
