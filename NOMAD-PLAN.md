# NOMAD — Nostr Open Multi-user Adventure Dungeon

*The castr → MUD pivot, 2026-07-03. castr's FarmVille-style fishing game
stalled on its one unshippable dependency: 61 consistent 2D illustrations. A
MUD has zero art dependency and plays to every strength already in this repo.
The fishing loop goes; almost everything else stays.*

**The idea:** a standalone multi-user dungeon where **Nostr is the wire
protocol**, not just the login. Commands are Nostr events. Room output is
Nostr events. Your character and loot are events signed by the dungeon's key.
Any Nostr client that can render text and publish events can, in principle,
play — and anyone can build a client or (eventually) host their own dungeon
speaking the same protocol.

**The name is the pitch:** your character is *nomadic* — keys in pocket, it
follows you to any client, any device, and eventually any dungeon that speaks
the protocol. (And M-U-D sits inside N-O-M-A-D, which is the kind of luck you
don't argue with.)

---

## What survives from castr

| Module | Fate |
|---|---|
| `nostr-auth/` | as-is — npub login, challenge/verify, Drive/passkey backup |
| `nostr-core/` | as-is — relay pool |
| `nostr-lightning/` | v2 — zaps in the dungeon (tip players, pay the ferryman) |
| `nostr-i18n/` | later |
| `game-server` auth (`auth.ts`, `jwt.ts`) | as-is |
| `signing.ts` (game-key signs outcomes, kind 1573) | **the core pattern** — generalizes from catches to loot/character sheets |
| `rng.ts` | as-is — server-side rolls |
| `quests.ts`, streaks, `shop.ts` | shapes reused for dungeon quests/dailies |
| D1 + migrations setup | as-is — world graph + player records live here |
| `cast.ts`, `catalog.ts`, `collection.ts` (fishing loop) | replaced by the world engine |
| `ART_PROMPTS.md`, FarmVille direction | dropped. Text is the art. |

## Protocol sketch (the future NIP)

Version-tag everything `["v","0"]` — this WILL change.

| Kind | Range | Direction | Content |
|---|---|---|---|
| `24911` command | ephemeral | player → dungeon | NIP-44 to dungeon pubkey: `"go north"`, `"attack rat"`, `"say hello"`. Tag `["p", dungeon]`. Encrypted so commands don't leak intent (`take idol`) to bystanders. |
| `24912` personal view | ephemeral | dungeon → player | NIP-44 to player: room description, your HP, combat lines — what *you* see. Tag `["p", player]`. |
| `24913` room event | ephemeral | dungeon → world | plaintext, public: "rome descends the stairs.", boss deaths. Tag `["t","mudroom-<roomId>"]`. This is the spectator feed — Nostr is good at feeds. |
| `31573` character sheet | addressable | dungeon-signed | `d=<player pubkey>`; content NIP-44 self-* encrypted to the player (HP/inventory private), existence public. Newest-wins = the save file. |
| `1573`-family loot | regular | dungeon-signed | same shape as castr catches / district nditems: dungeon key attests "player X earned item Y". Keep the shape nditem-compatible → District bazaar interop later without merging the games. |

Ephemeral kinds (20xxx) mean relays don't store the play-by-play — only
sheets and loot persist. Clean wire, small relay.

## Engine architecture

- **Cloudflare Workers + Durable Objects** (castr's stack, one addition):
  one DO per zone = the authoritative room state, mob state, who's where.
  DO alarms drive the tick (combat rounds, respawns, mob wander).
- **D1**: static world (rooms, exits, mob/item tables via migrations) +
  durable player records. DO holds hot state, D1 is truth at rest.
- **Transport, two doors, same protocol:**
  1. **Relay door** (the pure one): engine DO holds a WS client connection to
     the game relay, subscribes `{kinds:[24911], "#p":[dungeonPubkey]}`,
     publishes 24912/24913 back. Any nostr client can knock.
  2. **Direct door** (dev + latency): client WS straight to the DO carrying
     the *same signed events*. Protocol stays Nostr; transport is a shortcut.
     Build this first, add the relay door once the engine works.
- **Anti-cheat**: identical to castr — the server rolls, the server signs.
  Commands rate-limited per pubkey (token bucket; castr's daily-cast pattern).
- **Command parser**: verb + object, ~10 verbs at v1. No NLP, no LLM. MUD
  tradition is exact-match with abbreviations (`n` = `go north`).

### Which relay? (OPEN — rome's call)

The district relay is deliberately scoped narrow (bazaar + mnemonics) — do
NOT widen it by default. Options: (a) dedicated tiny relay for the MUD
(khatru again, or a Worker-native relay so everything lives on Cloudflare),
(b) widen nostr.thedistrict.online to accept the MUD kinds, (c) direct door
only for v1 and defer the choice. Leaning (c) then (a).

## v1 scope — "five rooms and a rat"

- One zone: **the Door** (~8 rooms: gate, hall, two branches, a locked
  door, a shrine, a boss chamber).
- Verbs: `look`, `go`, `say`, `attack`, `get`, `drop`, `inventory`, `who`,
  `name`, `rest`, `eat`, `help`. That's it.
- Combat: tick-based auto-attack once engaged, flee by moving.
- 3 creature types + 1 boss. Boss drops the one legendary (dungeon-signed).
- Multiplayer from day one: see others enter/leave/fight (that's the 24913
  feed), `say` in-room. It's a MUD, not a roguelike.
- Client: one HTML page — terminal log + input line. Monospace, the District's
  cream-on-dark palette. No graphics. (The promo kit look guarantees it still
  photographs well for itch/Nostr.)
- Interface is friendly; the world is not (see below). Tappable context
  chips (server-sent `ctx` frames) show everything doable right here;
  the parser forgives typos, articles, and natural aliases; first-timers
  get a welcome that explains the rules of being alive.

## The simulation (rome's call, 2026-07-03)

Gameplay direction changed after the engine first ran: **NOMAD is a
simulation, not a theme park.** Friendliness lives in the interface,
never in the world. Supersedes the earlier "v1 is friendly" bullets.

- **Living creatures, not spawners.** Creatures wander the zone, get
  hungry, eat what smells good off the floor, flee when near death, and
  hold grudges (attack on sight, remembered across sessions). The dead
  stay dead; the world refills slowly by *migration* (population below
  its cap summons a replacement after `respawn_secs × 20`).
- **Body & consequences.** No ambient regen: wounds close only through
  `rest` (interruptible, any effort ends it) or `eat`. Death scatters
  your whole pack on the floor where you fell — corpse run to get it
  back, if nothing takes it first. You wake at the gate at 10 hp.
- **The world runs while nobody watches.** The DO tick runs only while
  players are connected; the whole sim state (+ timestamp) persists in DO
  storage and `catchUp()` fast-forwards elapsed time (capped 14 days) on
  the next arrival. An empty dungeon costs nothing and is still alive.
- **Systemic objects, kept tiny for v1:** `edible`/`heal`/`lure` item
  properties (meat heals players, lures hungry creatures), the black
  door stays open once unlocked — until the boss reforms and it grinds
  shut — and only the shrine regrows what is taken from it (it says so
  in its room description). Torches/light and barrable doors: later.

**Cut from v1** (the MUD trap is content sprawl): classes, skills, XP curves,
PvP, trading, crafting, multiple zones, NPC dialogue trees, quests, zaps,
i18n. Every one of these builds on signed events later.

## Sequence

*(Steps 1-3 below are done; forward planning now lives in `ROADMAP.md`.)*

1. Commit castr as-is (repo has ZERO commits — preserve the fishing game
   before surgery, branch or tag it).
2. World schema in D1 + zone DO + tick loop + parser, direct-door WS,
   plaintext (no events yet) — playable alone in 8 rooms.
3. Multiplayer: room presence + 24913 feed shape internally.
4. Sign everything: real event shapes end-to-end, sheets + loot minted.
5. Relay door + protocol doc cleanup → the draft NIP.
6. Then content, and only then: page + devlog. Rename the repo folder
   `castr` → `nomad` when the code pivot starts ("castr" was the fishing
   pun); grab the npub for NOMAD's dungeon key early — the game signs with
   it forever.
