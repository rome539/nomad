# RUNBOOK — when the dungeon's keys go wrong

Two keys, two very different fires. Know which one you're in.

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
