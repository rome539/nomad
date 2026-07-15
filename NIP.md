# NIP-XX — Multi-User Dungeons over Nostr

`draft` `optional`

*Reference implementation: NOMAD ("Nostr Open Multi-user Adventure
Dungeon"), this repository. Status: draft; kind numbers are provisional
until this document is submitted upstream.*

## Abstract

This NIP defines how a real-time, server-authoritative multi-user text
world (a **dungeon**) speaks Nostr: ephemeral kinds for moment-to-moment
play, an addressable kind for character sheets, a regular kind for item
certificates, and a key hierarchy that lets a dungeon sign forever
without keeping its root key hot.

Players are ordinary Nostr keypairs. The dungeon is a Nostr identity
too: everything it asserts — what you saw, who fell, what you own — is
a signed event, verifiable by anyone, portable to any client.

## Concepts

- **Dungeon** — a service holding a keypair, running a simulated world.
  Authoritative: it rolls the dice, so clients cannot forge outcomes.
- **Wanderer** — a player; any Nostr keypair, including throwaways.
- **Zone / room** — the world is zones; a zone is rooms. Room ids are
  short strings unique within a zone (e.g. `gate`).
- **The direct door / the relay door** — a dungeon MUST speak this
  protocol over some transport. NOMAD uses a direct WebSocket (frames
  are the event shapes below, unsigned in transit, authenticated at the
  door) and relays for public output. Inbound play via relay is
  OPTIONAL (see Transports).

## Kinds

| kind  | range      | name                | direction          |
|-------|------------|---------------------|--------------------|
| 24911 | ephemeral  | command             | wanderer → dungeon |
| 24912 | ephemeral  | personal view       | dungeon → wanderer |
| 24913 | ephemeral  | room feed           | wanderer / dungeon → world |
| 31573 | addressable| character sheet     | dungeon-signed     |
| 1573  | regular    | loot certificate    | dungeon-signed     |
| 31574 | addressable| epoch attestation   | root-signed        |
| 36767 | addressable| client theme        | adopted; read-only |

Ephemeral kinds (20000–29999) are relayed but not stored — right for
keystrokes and battle noise. The durable kinds are the ones worth
keeping: who you are, what you own, who signs.

### 24911 — command

Signed by the wanderer. `content` is the raw command line, exactly as a
player would type it.

```json
{
  "kind": 24911,
  "content": "go north",
  "tags": [["p", "<dungeon epoch pubkey>"], ["zone", "door"]]
}
```

The dungeon MUST treat commands as untrusted input and MUST ignore
commands from identities it has not authenticated (direct door) or
whose signatures fail (relay door).

### 24912 — personal view

What one wanderer's eyes see. Signed by the dungeon's epoch key,
p-tagged to the recipient.

```json
{
  "kind": 24912,
  "content": "The Broken Gate\nIron gates hang off their hinges...",
  "tags": [["p", "<wanderer pubkey>"], ["zone", "door"]]
}
```

### 24913 — room feed

The spectator layer: the public events and sounds of a world, watchable
live. Every feed line carries a `mudroom-<room id>` tag (where it
happened); a wanderer's own deeds carry, in addition, a fixed
`nomad-arena` tag — a single handle for the whole roster. So a watcher
MAY follow one room, one fighter (by author, or `#p`), or the entire
world at once.

Signing is split by who acted:

- **A wanderer's own deeds** — moving, fighting, killing, dying — are
  signed by **that wanderer's key**, not the dungeon's. The dungeon
  composes the line (it remains authoritative — authorship is not
  authority) and hands it to the actor's client, which signs and
  publishes it. The feed thus authors itself across every player's own
  connection, so no single key firehoses the relays. A wanderer MAY
  decline to publish; the line is then seen only by those present.
- **The world's own voice** — a boss falling, ambient dread, a
  creature's death — is signed by the **dungeon's epoch key**, and names
  no wanderer.

```json
{
  "kind": 24913,
  "content": "Ashdrifter is slain. Their pack scatters across the stones.",
  "tags": [["t", "nomad-arena"], ["t", "mudroom-gate"], ["v", "0"]]
}
```

The example above is signed by the slain wanderer's OWN key. (A
multi-zone dungeon SHOULD add a `["zone", ...]` tag; NOMAD ships one
zone and omits it.)

Names appear in the clear: a spectacle whose actors are anonymous is not
one. To keep a public feed from doubling as a real-time tracker for
intercepting players, a dungeon SHOULD hold each wanderer-deed line on a
short delay before publishing (NOMAD: 15 seconds) — the feed is a reel,
not a radar. A dungeon SHOULD keep private-by-nature lines — a
wanderer's banking, trades, and loot pickups — off the relay entirely,
carried only to those in the room.

A room feed line is degraded information by design: it names what a
bystander would see, not the full mechanical truth, and it never names a
killer (see 31573).

### 31573 — character sheet

Addressable, `d` = the wanderer's pubkey, signed by the dungeon: the
character as a portable, verifiable object.

```json
{
  "kind": 31573,
  "content": "{\"name\":\"Ashdrifter\",\"hp\":31,\"max_hp\":40,\"zone\":\"door\",
    \"born\":1783170000,\"kills\":214,\"deaths\":3,\"boss_kills\":1,\"pvp_kills\":0}",
  "tags": [["d", "<wanderer pubkey>"], ["p", "<wanderer pubkey>"], ["zone", "door"]]
}
```

Every count is dungeon-attested — unforgeable by players. A wanderer MAY
publish their own sheet to relays (see Certificates, not broadcasts),
which makes portable, opt-in leaderboards buildable by anyone: subscribe
to kind 31573 from the dungeon's key and sort. A dungeon MAY ALSO serve
a freshly-signed sheet for any wanderer on request, over the direct door
(NOMAD: `GET /sheet?pk=<hex>`), so a watcher can check a boast against
the world's own signature without waiting for the player to proclaim.
This is a query answered, not a broadcast pushed — see Certificates, not
broadcasts.

`pvp_kills` is a bare count and names no victim: the world's own
narration never records who fell to whom (deaths leave nameless traces;
the evidence is the blood on the killer's hands). The number is
verifiable; the victims are not, by anyone, ever.

### 1573 — loot certificate

A regular (permanent) event: the dungeon's signature over one item
instance. Shape is `nditem`-family compatible.

```json
{
  "kind": 1573,
  "content": "{\"item\":\"graveblade\",\"name\":\"a graveblade\",\"rarity\":\"uncommon\",\"zone\":\"door\"}",
  "tags": [
    ["p", "<owner pubkey>"],
    ["d", "<loot instance id>"],
    ["item", "graveblade"],
    ["rarity", "uncommon"],
    ["zone", "door"],
    ["serial", "14"],
    ["t", "nomad-loot"],
    ["v", "0"]
  ]
}
```

`serial` is the dungeon's mint number for that item class — the supply
is auditable even though ownership is private.

### 36767 — client theme

Not ours: 36767 is the theming kind already in the wild (Ditto's), with a
public catalog on its relays. NOMAD **adopts** it as a consumer — the client
browses the world's published themes and can wear one; it never publishes.
Colors ride `c` tags by role; the client derives its full palette from the
three roles, with WCAG contrast enforced before anything touches a screen.

```json
{
  "kind": 36767,
  "tags": [
    ["d", "<theme id>"],
    ["title", "Midnight Garden"],
    ["c", "#0a0d14", "background"],
    ["c", "#ccd9e8", "text"],
    ["c", "#7fb4e0", "primary"]
  ]
}
```

Only strict hex ever reaches a style; malformed or partial events (any of
the three roles missing) are skipped whole.

## Certificates, not broadcasts

A dungeon MUST NOT auto-publish sheets or certificates. Minting is a
private act: the dungeon signs, stores, and hands the event to its
owner. **Publishing to relays is the player's decision**, later and
optional. A dungeon MAY, however, answer a direct request for a
wanderer's current sheet (see 31573): serving a signed object to whoever
asks is a query, not a broadcast, and keeps standings verifiable without
a player having to proclaim. The line it MUST NOT cross is pushing a
sheet or certificate to relays unbidden.

For rare items a dungeon SHOULD expose a blinded mint counter (serial +
timestamp + rarity, no owner) so supply claims are publicly checkable
while holders stay unknown.

## The dungeon's keys

A dungeon signs forever, so "one leak ends the world" must not be true.

- The **root key** is the dungeon's identity. It stays cold. It signs
  exactly one kind of thing: epoch attestations.
- **Epoch keys** are hot operational keys that sign everything else
  (views, feeds, sheets, certificates).
- The root publishes a **31574 epoch attestation** (`d` = `"epoch"`):

```json
{
  "kind": 31574,
  "content": "{\"epoch\":1,\"pubkey\":\"<epoch pubkey>\",\"since\":1783170000}",
  "tags": [["d", "epoch"], ["p", "<epoch pubkey>"]]
}
```

Because 31574 is addressable, a new attestation **replaces** the old on
relays — so from epoch 2 onward the content MUST carry the full trust
set, each retired epoch closed with an `until`:

```json
{
  "kind": 31574,
  "content": "{\"epoch\":2,\"pubkey\":\"<epoch-2 pubkey>\",\"since\":1790000000,
    \"history\":[{\"epoch\":1,\"pubkey\":\"<epoch-1 pubkey>\",
    \"since\":1783170000,\"until\":1790000000}]}",
  "tags": [["d", "epoch"], ["p", "<epoch-2 pubkey>"]]
}
```

Verification rule: a dungeon-signed event is valid iff its signer is
the root, the current epoch key, or a historical epoch key whose
`[since, until)` window contains the event's `created_at`. One
attestation is the whole trust set; rotation and revocation are the
same operation — replace it.

A thief holding a stolen epoch key can backdate `created_at` into its
own window, which is why **certificates answer to the ledger, not only
to the signature**: a loot certificate is real iff its serial is live
in the dungeon's mint ledger. Certificates minted during a breach are
voided there (serials are never reused), and the blinded counter makes
the voiding itself public. Signatures prove voice; the ledger proves
standing.

## Transports

- **Direct door (REQUIRED):** a WebSocket (or similar) where the
  wanderer authenticates once — NOMAD uses a challenge signed as a
  kind-27235 HTTP-auth event — and then exchanges the event shapes
  above as frames. Signatures MAY be omitted inside an authenticated
  direct session.
- **Relay door, outbound (RECOMMENDED):** the dungeon publishes the
  world's own feed lines (24913), and any player-released sheets and
  certificates, to its relay set, signed by the epoch key. A wanderer's
  OWN deeds it does not sign: it hands each line to the actor's client,
  which publishes it under the wanderer's key (see 24913). Publish only
  when events occur: an idle dungeon is silent and costs nothing.
- **Relay door, inbound (OPTIONAL):** a dungeon MAY subscribe for
  24911 commands p-tagged to its epoch key and answer with 24912 over
  relays. This requires the dungeon to hold standing subscriptions —
  implementations that sleep when empty (as NOMAD does) will prefer
  outbound-only.

## Security model

The dungeon is authoritative: outcomes exist because it signed them,
not because a client claimed them. Players cannot forge loot, stats,
or history; anyone can verify any published artifact against the root
attestation chain with no access to the dungeon's servers. What the
dungeon cannot do invisibly is inflate supply — serials make the mint
countable.

The room feed (24913) is the deliberate exception, and consumers MUST
treat it as such. A wanderer's own deeds are signed by the wanderer, so
a player CAN publish a self-signed feed line for a deed that never
happened. That is acceptable because the feed is a live *show*, not a
record: a watcher MUST NOT treat a self-signed 24913 line as
authoritative. The authoritative record is the dungeon-signed sheet
(31573), certificate (1573), and mint ledger — a leaderboard verifies
there (e.g. `GET /sheet`), never by tallying the feed. Talk is talk; the
dungeon's signature is the scoreboard.

## Rationale

MUDs are the oldest multiplayer form and the best fit for Nostr's
primitives: identity is a keypair, history is signed events, and the
interesting state — who you are, what you carry, what happened — is
small enough to live as notes. Kind numbers sit in their semantically
correct ranges and avoid collision with registered kinds; `1573` was
chosen for `nditem` bazaar compatibility.
