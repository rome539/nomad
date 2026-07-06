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
| 24913 | ephemeral  | room feed           | dungeon → world    |
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

The spectator layer: public events and sounds of one room. Anyone MAY
subscribe to a room like a hashtag and watch the dungeon live.

```json
{
  "kind": 24913,
  "content": "Rome is slain by the Forgotten King. Their pack scatters across the stones.",
  "tags": [["t", "mudroom-gate"], ["zone", "door"]]
}
```

The `t` tag is `mudroom-` + room id. A room feed line is degraded
information by design — it names what a bystander would see, not the
full mechanical truth.

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

Publication is the player's act (see Certificates, not broadcasts).
The tallies make opt-in leaderboards buildable by anyone: subscribe to
kind 31573 from the dungeon's key and sort. Every count is
dungeon-attested — unforgeable by players — and appears only for
wanderers who chose to proclaim. `pvp_kills` names no victim: the
world's own narration never identifies killers (deaths leave nameless
traces; the evidence is the blood on the killer's hands), so a player-
kill count surfaces only from the killer's own mouth.

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
owner. **Publishing is the player's decision**, later and optional.
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
- **Relay door, outbound (RECOMMENDED):** the dungeon publishes room
  feeds, and any player-released sheets and certificates, to its relay
  set, signed by the epoch key. Publish only when events occur: an
  idle dungeon is silent and costs nothing.
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

## Rationale

MUDs are the oldest multiplayer form and the best fit for Nostr's
primitives: identity is a keypair, history is signed events, and the
interesting state — who you are, what you carry, what happened — is
small enough to live as notes. Kind numbers sit in their semantically
correct ranges and avoid collision with registered kinds; `1573` was
chosen for `nditem` bazaar compatibility.
