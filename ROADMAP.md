# NOMAD Roadmap

*The build order, 2026-07-03. Principle inherited from the simulation
pivot: build systems that create stories, not scripted content. The
interface is friendly; the world is not. Population-dependent systems
(PvP, economy, factions) are deliberately last — they emerge from
players, and you can't scaffold players.*

**Done so far (phase 0):** the engine (Workers + zone DO + D1, Nostr-key
login, server-authoritative rolls + loot signing hooks), the Door (8
rooms, 3 creature types + boss, key/black-door, shrine), the simulation
(living creatures with hunger/flee/grudges, migration not respawn,
rest/eat healing, death scatters your pack, catch-up fast-forward in DO
storage), and the friendly terminal (context chips, forgiving parser,
welcome, `name`).

---

## Phase 1 — Don't lose your soul ✅ floor shipped 2026-07-03

The one normie cliff that destroys everything else: the character key
lives only in localStorage. Clear browser data, lose your character.

Shipped (all client-side; the server never sees a secret):
- Guest-first stays: keys minted silently, play instantly.
- `keys` / `keys reveal` — npub + nsec in the game's voice, with the
  "save this, it is the only way back" warning. `keys` chip always shown.
- `login <nsec|hex>` — become that wanderer on any device (echo is
  masked in the log; one-slot `logout` undo returns the prior keys).
- `login extension` — NIP-07 (Alby/nos2x) signs the challenge instead;
  `logout` sets the borrowed keys down.

Ceiling (needs a real client build step — the page is currently an
inline string, so `nostr-auth/`'s heavy methods can't be imported):
- Passkey/Face ID and encrypted Google Drive vault (`nostr-auth/` is
  wired-ready), NIP-46 bunker login.

*Definition of done (met for the floor): a player can move browsers
without losing their character, without ever hearing the word "Nostr."*

## Phase 2 — Sound ✅ shipped 2026-07-04

Text renders sound better than graphics render anything, and the engine
is one hop from it: propagate degraded `roomFeed` events one room along
the exits graph.

- Combat rings through walls: "Steel rings somewhere to the west."
- Deaths, doors, the shrine, arrivals: each gets a distant form.
- Direction from the exit that carried it; no perfect information.
- The King's fall is already zone-wide; more events get graded radius.

*Definition of done: standing in the hall, you can hear a fight you
cannot see, and walk toward it.*

## Phase 3 — Traces (the world's memory) ✅ shipped 2026-07-04

Catch-up simulation currently runs silently — all that offline living
is invisible. Traces make the simulation legible, and they are the
information economy AND player-created history in one mechanism.

- Rooms keep a decaying event log: kills, deaths, eating, passage.
- `look` renders it fuzzily by age: "The blood here is fresh." →
  "Old blood stains the stones."
- Catch-up deposits traces instead of simulating silently.
- `carve <words>` — one new verb, and the wall remembers ("Rome fell
  here"). Dungeon-signed, timestamped: verifiable history. This is the
  Nostr-native feature no other game can copy.
- Food rots (ties the meat economy to a clock; corpses too, later).

*Definition of done: returning after a day away, you can read what
happened while you were gone — without being told.*

## Phase 4 — Extraction ✅ shipped 2026-07-04 (rome's rule)

**The rule: the dungeon's signature protects you from the dungeon —
not from people.**

*Revised 2026-07-05 (rome): the seal protects from nothing — it is TITLE,
not armor. Death scatters everything carried, sealed included (the seal
cracks, the mint voids). Only the lockbox keeps. One law for world deaths
and, later, player kills; extraction means the walk to the box, every time.*

- Loot inside is *provisional*: it scatters where you fall, corpse run
  to recover (unchanged — the stories stay).
- Carry it out through the Broken Gate and the dungeon signs your
  claim. This is phase 6's certificate mint made into a place and a
  moment. Sign at the gate only; free in v1 (a toll is a later economy
  hook); voluntarily dropping a signed item voids the claim.
- **Signed loot survives any world-death** (creatures, starvation):
  "What the dungeon signed, the dungeon returns."
- **A player-kill drops everything, signed included.** It wasn't the
  dungeon that took it, so the dungeon owes you nothing. Whoever
  carries it out gets the superseding signature — serials transfer,
  the blinded mint counter stays honest. (Bites in phase 7; no PvP
  yet.)
- Rejected on the way here: random partial-drop retention (safety must
  be a decision, not a roll) and aggressor-punished combat luck (the
  world never moralizes).

- **The lockbox (rome's addition):** iron boxes in the gatehouse wall
  (`stash`/`unstash`, sealed items only, 8 slots). Vaulted loot is
  beyond everything — even, in phase 7, a murderer. Murder takes what
  you brought, never what you banked. Three rungs, each a decision:
  provisional → sealed → vaulted.

Shipped: mint ledger in D1 (serials; blinded counter ready), `claim`
at the gate, sealed-aware death scatter, the lockbox, weapons
(`dmg` — bare hands 2-5, the best carried blade adds its bite; fresh
keys are weak by construction), deeper = better (rusted sword in the
armory, graveblade behind the warden), and **fat-tailed combat** —
symmetric 5% crits and fumbles for every combatant, fumbles as
simulation events: a provisional weapon leaves your hand for the
floor, a sealed one is held to your grip by its mark, bare hands
stumble into an opening. PvE drama now, anti-grief groundwork for 7.

- The gate becomes a place (the moment of relief, the signing).
- Deeper = better loot so "go deeper or get out" is a real question.

*Definition of done: standing over the boss's drop at 8 hp, the walk
back to the gate is the most exciting part of the game.*

## Phase 5 — PvE that hunts ✅ shipped 2026-07-04

Builds directly on sound (phase 2) — no pack AI needed, just ears.

- Creatures investigate noise: a fight draws every rat in earshot.
- That IS pack behavior: three rats converging because you were loud.
- Warden walks a patrol route (it's described as walking its rounds).
- King behavior: phases at hp thresholds, calls the dark to him.
- Stealth for free: resting/quiet players make no sound.

*Definition of done: fighting loud in the wrong place gets you swarmed,
and players learn to listen before they swing.*

## Phase 6 — Ship it ⟵ NEARLY CLOSED 2026-07-04 (announcement left)

The world goes public. No new gameplay, all logistics.
Decisions (rome, 2026-07-04): no domain yet — launched on workers.dev
(Cloudflare FREE plan; the SQLite-backed DO needs no paid tier); repo
public at github.com/rome539/nomad (MIT); relay set nos.lol /
relay.primal.net / nostr.mom / relay.mostr.pub (bridges to the
fediverse) — damus (going down) and nostr.band (dead) excluded; relay
door is OUTBOUND-ONLY in v1 (inbound stays on the direct door — no
always-awake DO); root nsec on paper, epoch key in Cloudflare; the
kind-0 face is the parting-gate seal, self-hosted at /icon.png.

- ✅ Minted 2026-07-04: root `e8653abd…` (cold, paper), epoch 1
  `9fb90107…` = `npub1n7uszpe…`. kind-0 profile + 31574 attestation
  published and verified stored on the relay set. Compromise is
  drilled, not just designed: mint-dungeon.mjs rotates epochs under
  the same root, the attestation carries the whole trust-set history
  (closed [since,until) windows — old certs survive rotation), and
  RUNBOOK.md is the 3am fire drill. Certificates answer to the mint
  ledger, not only the signature (breach serials get voided,
  publicly).
- ✅ Live: https://nomadmud.com (2026-07-04; Namecheap reg, Cloudflare
  DNS; workers.dev stays as side door) — real D1 seeded,
  prune cron armed, /mints public. Bonus shipped: "Continue with
  Google" (custodial backup/restore of the wanderer's key, sealed
  AES-256-GCM server-side; browser-tested link + restore; Drive-vault
  self-custody deferred — needs Google review).
- ✅ Git remote `nomad`, pushed public with root README + MIT LICENSE.
- ✅ Sheets (31573) + loot signed end-to-end; relay door live (24913
  room feeds verified on-relay); NIP.md at repo root.
- ✅ **The braggart's ledger (rome, 2026-07-04):** sheets carry
  dungeon-attested tallies — kills / deaths / boss_kills / pvp_kills /
  born — published only by the player's own `publish sheet`. Opt-in
  leaderboards buildable by anyone from relay subscriptions alone.
  pvp_kills counts from phase 7; "the world doesn't snitch" binds the
  world's narration, never the player's own mouth.
- ✅ **Minting is certificates, not broadcasts (rome's call, 2026-07-03):**
  the oracle signs loot claims privately (event-shaped, stored in D1,
  serial-numbered) — nothing auto-publishes. Publishing is the player's
  act, later and optional. For rares only: a blinded mint counter
  (serial + timestamp, no owner) keeps supply publicly auditable while
  ownership stays private. Root key delegates to hot epoch signing keys
  so "signs forever" never means "one leak ends the world."
- ⟵ REMAINING: Itch/Nostr announcement — pitch line: **"The dungeon doesn't wait
  for players. Players enter the simulation."** The trailer already
  exists (`promo/nomad-promo.html` — self-playing CRT cut with
  synthesized sound; `promo/capture/` renders it to mp4 headlessly).
  Its end card says "THE DOOR OPENS SOON" — swap in the real URL/npub
  at deploy and re-render.
- ✅ **The dungeon forgets the forgettable:** every authenticated pubkey
  becomes a permanent player row, so drive-by visitors and bots would
  accumulate as dead wanderers forever. Cleanup rule (daily cron,
  04:17): guests who never chose a name, carry nothing, hold no live
  claim, and haven't been seen in 30 days fade from the ledger. Named
  players and anyone holding items are never pruned.

*Definition of done: a stranger with a phone can wander the Door and
lose something that mattered.*

## Phase 7 — Population systems (gated on actual players)

Do NOT build these before there are people; they emerge from density:

- **PvP** — cooperate / ignore / rob / kill when paths cross. Needs an
  economy worth robbing and enough players that murder has witnesses.
  Under the phase 4 rule a player-kill drops everything, signed
  included — murder is the only way to truly lose what's yours, which
  is what makes the rest of this list matter.
  **Anti-grief stack (decided 2026-07-04 — all sim-native, no
  aggressor-punishing dice):**
  1. *Witnesses* — combat sound already carries through walls.
  2. *Blood on the killer, not names on the wall* — the world doesn't
     snitch. Death traces stay victim-only; the evidence walks around
     on the murderer: "He is bloody from a fight — it looks fresh."
     Man-blood reads different from creature blood (bright, clings),
     ages through buckets like any trace, stacks for repeat killers
     ("caked in blood, old under new"). Finding out who did it means
     meeting them and looking close.
  3. *The bloodstain* — the same mark, rendered as scent: creatures
     aggro known killers on sight, the warden's patrol becomes a
     manhunt, the shrine refuses them.
  4. *Fat-tailed combat* (ships in phase 4) — every attack is a
     gamble, even for a veteran; fumble and your blade is on the
     floor for the taking.
  5. *Fresh keys are weak* — power comes only from carried gear,
     never granted to new spawns. Throwaway identity = throwaway
     threat. This is the sybil resistance; hold it forever.
- **Economy** — scarcity already exists; trade verbs when there are
  traders. Zaps enter here (`nostr-lightning/` is on the shelf).
- **Factions** — earned names, not menus: bandit is what you did.
- **Reputation** — grudges already prove the primitive; extend from
  creatures to the world (guards, towns) when towns exist.
- **Events** — migrations already are small events; big ones (flood,
  caravan, eclipse) once there's an audience to surprise.

## Icebox — liked, not building yet (rome, 2026-07-06)

Three directions rome likes and wants held for later. Design only; no
code until he says go.

- **Communication layer** — the thing that turns a dungeon into a
  social world. `say`/`tell`/`shout` (shout carries between rooms —
  combat sound already proves the primitive), channels (ooc/gossip),
  emotes/socials. The two most on-brand: async **notes / dead-drops**
  (leave a written scrap in a room for whoever comes next) and a shout
  that travels. Low-tech, high-flavor.
- **Consumables / toxins / traps** — NOT magic. Tone is gritty
  survival, not high fantasy, so no spellbooks/mana. But bleed/stun
  already exist as status effects, so the on-brand version is
  drinkable/throwable/plantable: poisons, tinctures, and set traps
  that carry the same status-effect engine.
- **Light & search (world-sim depth)** — a dark floor you can't map
  without a lantern is pure extraction tension. `search` for hidden
  exits, the `light` property gating what you can see/map, torch
  burnout. Fits the simulation direction; pairs with the maps/journal
  knowledge-as-loot line. (Day/night + torch burnout already noted
  under Seasoning — this is the fuller version.)

Two more, extraction-specific (rome, 2026-07-06) — the genre NOMAD
actually is, so these rank above the MUD-flavor three when we build:

- **The dangerous walk back** — the defining extraction feeling: loot
  is worthless until you're *out*, and the deeper you went, the longer
  the run home. Today sealing at a gate is safe and instant. Make
  **depth = commitment**: the good loot lives far from any gate, and
  the walk back with a full pack is the real gauntlet. Mostly
  content/geometry, not new systems — highest leverage of the set.
- **Task / bounty runs** — objectives that *force* insertion:
  retrieve a specific thing, reach a deep room, hunt a marked wanderer
  (Hunt: Showdown's bounty). Gives the loop direction beyond "get
  rich," and the marked-wanderer bounty rides on the existing
  blood-on-killer / manhunt primitives.
- **The seal as a vulnerable moment** — make claiming at the gate a
  **channeled hold**: a few ticks where you're exposed, your sound
  carries, and someone can interrupt you. Turns the gate from a safe
  button into a tense beat. Pairs with the walk-back and contested
  gates above.
- **Campers make noise** (rome, 2026-07-06) — the anti-camp for the
  above: a wanderer who stays still too long starts giving themselves
  away with sound (shifting, breathing, gear creak), so gate-campers
  can't lurk silently forever. Rides on the existing sound-carries
  primitive — stillness leaks, movement doesn't.

### Easter eggs (rome, 2026-07-06)

Built now (cheap, no new systems): **`xyzzy`** (the old Colossal Cave
word — the dungeon declines to be impressed) and **`smoke`** (light one
from the tin: a beat of calm, but the smell rides into the next room
and the dark leans in — never names what the tin is worth). Both
undocumented, like `squink`.

Parked for later, in rough order of fit:
- **Zap-triggered whispers** — `nostr-lightning/` on the shelf; zap a
  shrine 21 / 2100 / 21000 sats and something answers. Real value in,
  a wink out. Only NOMAD can do this.
- **Root-npub recognition** — if rome's own npub ever walks the Door,
  the dungeon knows its maker. Private, unfakeable.
- **A too-deep room** at the literal bottom, reached by an undocumented
  exit — a maker's message / one strange item.
- **Time-based winks** — genesis block (Jan 3), whitepaper day (Oct 31),
  or a NOMAD anniversary: one creature/line/trace changes for 24h.
- **Silent achievements** — a no-death deep extraction, a kill far above
  weight, all-maps-found: a private line, never a badge on a wall.

Rule: an egg must never break the sim or cheapen the cigarette secret,
and the moment it's in a help file it stops being an egg.

## Seasoning (slot anywhere, low cost)

- Day/night: nocturnal creatures, darker descriptions after dusk.
- Torch burnout when light matters (needs the `light` property).
- More rooms/creatures for the Door — but content sprawl stays the
  enemy; systems first.

---

*Sequencing logic: 1 protects players' identity before anything else
matters, 2 is the cheapest system with the biggest story yield, 3 makes
the simulation visible, 4 adds the tension loop (loot rule decided
2026-07-04), 5 deepens threat using 2, 6 opens the doors, 7 waits for
people to walk through them.*
