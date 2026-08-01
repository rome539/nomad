// Entry for the client's nostr-tools bundle (served at /nostr.js).
//
// WHY THIS EXISTS (2026-08-01): the client used to import nostr-tools straight
// from https://esm.sh at runtime — including generateSecretKey, the function
// that mints every player's identity. That put the code which creates keys on a
// third party's server, fetched fresh on every page load, with no integrity
// check. A compromised or hostile CDN could have served a generateSecretKey
// that returns predictable keys and every wanderer minted afterwards would have
// been the attacker's, silently, with no symptom in-game and no way to detect
// it after the fact. That is not hypothetical: polyfill.io was a trusted JS CDN
// until the domain changed hands in 2024 and began serving malicious code to
// over 100,000 sites. A nostr key is the account — there is no password reset
// and no rollback, so the blast radius here is permanent.
//
// It was also a hard availability dependency: the esm.sh import was a STATIC
// top-level import, so an esm.sh outage meant nomadmud.com could not boot at
// all. Their bad day was our bad day.
//
// So we serve our own copy. Same library, same version, pinned in package.json
// and committed as a build artifact — it just comes from us now.
//
// Regenerate with:  npm run bundle:nostr   (same discipline as bundle:vault —
// this file does NOT rebuild itself on deploy, so a nostr-tools upgrade means
// re-running that script and committing the result.)
//
// Keep this list to exactly what the client uses; every export is bytes on the
// wire for every player. Today that is: key generation + signing (pure), the
// npub/nsec codec (nip19), sealed DMs (nip44), and the relay pool.
export { generateSecretKey, getPublicKey, finalizeEvent } from "nostr-tools/pure";
export * as nip19 from "nostr-tools/nip19";
export * as nip44 from "nostr-tools/nip44";
export { SimplePool } from "nostr-tools/pool";
