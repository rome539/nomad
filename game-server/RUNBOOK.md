# RUNBOOK — when the dungeon's keys go wrong

Two keys, two very different fires. Know which one you're in.

## Retiring historical Google custody

The current Google flow uses a browser-encrypted Drive vault. The old
`google_accounts` table and `KEY_ENC_SECRET` belong to the retired custody flow;
they do not enable the current login. The old `/auth/google` endpoint must stay
disabled during cleanup.

1. Check only the legacy row count and key-binding presence first. Do not put
   account identifiers, ciphertext, or plaintext keys into reports or logs.
2. Keep the old row and encryption key until its owner has demonstrated control
   of the same Nostr identity and verified an independent, decryptable backup.
   Merely creating a new character or a new vault does not prove migration.
3. If that row is the only recovery copy, design a separate authenticated
   recovery procedure before deletion. Do not restore the old public custody
   endpoint as a shortcut.
4. After the owner explicitly approves retirement of the verified migrated
   record, remove only that record. Check the remaining count again.
5. Remove the legacy encryption-key binding only when no records depend on it.
   Document the outcome without including the identity or secret material.

This checklist authorizes no deletion by itself. The security audit preserved
the existing records and key binding.

## The epoch key leaked (GAME_SK_HEX) — recoverable, ~15 minutes

Symptoms: signed events you didn't make — loot certs, feed lines, profile
edits — authored by the current epoch npub.

1. **Shut the mouth.** `npx wrangler secret put GAME_SK_HEX` with any junk
   value (or delete it). Signing stops instantly; the game keeps running —
   walking, fighting, chat all work, only sealing/publishing pause.
2. **Mint the successor.** Offline, with the paper root:
   `ROOT_NSEC=nsec1... node scripts/mint-dungeon.mjs 2 '<current attestation content JSON>'`
   (Fetch the current content from any relay: kind 31574, author = root,
   `d=epoch`. Epoch 3 next time, and so on.)
3. **Arm the new hand.** `wrangler secret put GAME_SK_HEX` with the new
   epoch hex.
4. **Publish the new attestation** (it replaces the old on relays — it
   carries the closed `[since, until)` window for the burned epoch, so
   everything legitimately signed before the breach verifies forever).
5. **Re-publish the kind-0 profile** — the dungeon's face must follow its
   new voice: `curl -X POST .../admin/publish-profile -H "x-admin-token: …"`.
6. **Void the breach.** Any mint serials created in the breach window:
   `UPDATE mints SET voided_at = unixepoch() WHERE minted_at >= <breach start> AND minted_at < <rotation>`
   The blinded counter makes the voiding public; serials are never reused.
7. Tell people. The attestation is the proof; the announcement is the
   courtesy.

## The root key is lost — annoying, not fatal

Nothing breaks today: the epoch key keeps signing, everything verifies.
What you've lost is the *ability to rotate*. If the epoch key later leaks,
you'd have to found a new dynasty (new root, new attestation chain) and
ask clients to trust it — ND-style trust-set append, socially messy but
survivable. Prevention is cheaper: the root nsec lives on paper, twice,
in two places.

## The root key leaked — the fire with no extinguisher

Whoever holds the root can attest their own epochs and speak as the
dungeon's authority. There is no on-protocol recovery — that's the deal
that makes root signatures final. Response: publicly announce the new
root from every channel you control (the old epoch key, the repo, the
site), and clients pin the new root. This is why the root never touches
a computer that syncs.

## The database went wrong: getting it back

Two stores, two different answers.

- **Player data** (characters, items, mints, dens, journals) is the D1 database
  `nomad`. Cloudflare keeps every moment of its last 30 days and can put the
  whole database back to any of them. This is the one that matters.
- **The living world** (creatures, what lies on the ground, weather) is inside
  the world object. It is not restored; it is re-seeded from the spawn tables
  (`POST /admin/reseed`), and no character is touched by that.

### Applying migrations

    node scripts/migrate.mjs --remote --status    # what would run
    node scripts/migrate.mjs --remote             # run it

It applies what has not run yet, in order, and writes each file down in the
database's `schema_migrations` table as it lands. It stops on a skipped file,
on two files sharing a number, and at the first file that fails. Before it
changes production it prints a **restore point** (a bookmark and the time).
Keep that line until the ship is confirmed good.

The first time only, production has no record yet:

    node scripts/migrate.mjs --remote --baseline <last migration already applied>

### A bad migration, or bad data

1. **Stop the bleeding first.** If the new code is what is writing bad rows,
   roll the Worker back (`npx wrangler rollback`) before touching the database,
   or the restored database is damaged again at once.
2. **Find the moment.** Use the restore point the migration tool printed, or
   ask for the bookmark of a time just before the damage:
   `npx wrangler d1 time-travel info nomad --timestamp=2026-11-10T14:30:00Z`
3. **Restore.** `npx wrangler d1 time-travel restore nomad --bookmark=<bookmark>`
   (or `--timestamp=`). It prints the bookmark it replaced; keep it, because
   restoring to that one undoes the restore.
4. **Restart the world** so it reads the restored rows: `npm run deploy`.
   Players reconnect on their own.
5. **Take the restored migrations back off the record** if the restore went
   behind them. The record is a table in the same database, so it went back
   too: `node scripts/migrate.mjs --remote --status` shows the truth.
6. Tell people what they lost. A restore takes EVERYTHING back to that moment:
   every item found, sealed or traded since is gone, for every player. Restore
   to the latest moment that is clean, not a round hour.

A restore cannot reach past 30 days, and it is all or nothing: there is no
restoring one table or one player. For one player's rows, restore nothing;
read the old values out of an export (below) and write them back by hand.

### A copy that Cloudflare does not hold

Time travel lives in the same account as the database. For a copy that
survives losing the account:

    npx wrangler d1 export nomad --remote --output="$HOME/nomad-backups/nomad-$(date +%F).sql"

Keep it OUT of this repository and out of any synced folder: it holds every
player's public key, name and inventory. The database may pause for the few
seconds the export takes.

