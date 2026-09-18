# Security remediation — 2026-09-18

The initial nine findings, three follow-up findings, and authentication admission
limits have code fixes and validation. The tested workspace was deployed to
production on 2026-09-18 with user authorization. Existing unrelated workspace
changes were preserved and the existing animation tests passed before release.

| Finding | Remediation |
| --- | --- |
| Concurrent inventory withdrawal | Conditional owner/container update; only its winner receives the item. Zone commands, reconnects, and alarms serialize across database waits. |
| Trade offer race | Lock and snapshot offers before awaiting; transfer all rows in one SQL statement with expected-owner checks. Failed writes preserve inventory and clear confirmation/settlement locks. |
| Unbounded client work | Bound frame bytes, command length, batch rows, trade items, and queued socket work before processing. Charge batch operations against the rate limit. |
| Reusable socket credentials | Single-use, short-lived tickets with atomic redemption; remove session-token URL fallback. Tighten JWT and authentication-body validation. |
| Vulnerable development dependencies | Update Worker, bundler, WebSocket, and capture tooling and lockfiles. Both npm audits report zero known vulnerabilities. |
| Login secret disclosure | Normalize login case/whitespace before history, display, or transport. Reject apparent secrets in ordinary commands and server chat; omit raw commands from error logs. |
| Weak new vault PINs | Require a 14–256-character passphrase and reject numeric/common weak choices for new or replacement wraps. Preserve old vault recovery and offer an upgrade after weak-PIN unlock. |
| Unauthenticated remote-signer controls | Verify relay signatures and recipient filters; ignore pre-pair approval URLs/errors until secret binding. Match response IDs before handling approval URLs. |
| Plaintext private messages | Resolve the recipient without message text, encrypt and sign in the browser, then forward ciphertext. Verify signatures and one-use delivery requests. Refuse legacy plaintext tells. |
| Stale identity responses | Ignore login, ticket, signer, and profile responses belonging to a superseded identity. Explicit reconnect immediately detaches the old socket. Pending signer choices cannot persist their session after cancellation. |
| Unintended vault overwrite | Creation never falls back to a remembered, unopened file ID. Picker cancellation stops the flow. Replacement binds the original key/identity through asynchronous crypto; successful writes update the selected file explicitly. |
| Executable QR dependency from public CDN | Pin and bundle the QR renderer and serve it from the Worker, removing the runtime CDN import from the key-holding page. |
| Unthrottled HTTP authentication | Apply the required rate-limit binding before challenge signing, signature verification, ticket redemption, or socket upgrades. Counter keys HMAC the edge-supplied address; exhausted budgets return 429, unavailable configuration returns 503. |

## Validation

- `npm run test:security`: synthetic identities, real cryptography, exact served
  browser functions/bundle, in-memory SQLite, and simulated transport boundaries.
  Includes concurrent replay, tampering, historical vault recovery, private-message
  decryption, inventory/trade races, settlement failure, event ordering, stale
  authentication responses, cancelled identity selection, and vault write safety.
- `npm run typecheck` and `npm run check:served` pass.
- Wrangler deployment dry run passed before the authorized production release.
- Server and capture dependency audits each report zero vulnerabilities.
- Updated Puppeteer launches an isolated local Chrome profile and captures a
  screenshot through CDP successfully.
- The committed QR bundle renders a 220×220 PNG in isolated Chrome with HTTP
  requests blocked. Actual Worker route tests reject forged admin/socket headers,
  replayed tickets, and the removed session-token URL path.

## Rollout and remaining limits

Use Node 22.13 or later. The existing `auth_spent` table from migration 176 is
required; no new migration is introduced. Refresh browser clients after deployment.
Custom clients must obtain a ticket from `/auth/ticket`; private messaging requires
the updated protocol and NIP-44 support on both clients.

Existing weak vault wraps remain weak until the owner accepts the passphrase
upgrade. A length/common-password check cannot guarantee passphrase entropy.
Already disclosed secrets and already duplicated items are not repaired by this
patch. No production credentials, inventories, or stored backups were inspected
or altered.

Private-message metadata remains visible. These changes do not protect browser
keys against malicious code served by the site or a compromised device/signer.
Live Google, hardware-passkey, and third-party signer integration was not tested;
their cryptographic/protocol boundaries were exercised locally. Serializing zone
work prioritizes consistency and can increase latency under slow database calls.
This is remediation of the observed findings, not a guarantee that the application
has no other vulnerabilities.

The follow-up source review covered the Worker/admin routing boundary, dynamic
SQL construction, browser HTML sinks, Drive file selection, passkey key derivation,
and asynchronous identity transitions. No additional admin authorization bypass
or direct HTML injection was established in those inspected paths. Google sign-in
and Picker still execute Google's scripts by design. Historical `google_accounts`
rows from retired server custody were not inspected or deleted; their disposition
requires a separate migration plan so the only recovery copy is not destroyed.

## Privacy follow-up

The current repository files, 376 public assets (including ignored art), and
commit/remote metadata were scanned for the local personal identifier and home
path; no matches were found there. Image metadata inspection found no GPS or
author fields among the inspected public PNG/JPEG/WebP metadata. This does not
establish anonymity against external account/domain correlations or inspect all
historical file contents.

Two ignored local audit reports and a temporary Worker source map contained
machine paths. The reports were redacted and the map paths made relative; these
were local artifacts, not evidence of public exposure. Source-map upload is now
explicitly disabled, generated maps are ignored by Git, and `npm run deploy`
runs a privacy gate first. The gate rejects identifying file content and public
source maps without echoing private values. Future locally generated maps still
need the optional artifact-directory check before sharing.

No remote publication, production inspection, Git history rewrite, credential
rotation, or deployment was performed during this follow-up.

## Runtime and read-only configuration follow-up

Subsequent verification exercised the actual workerd runtime with isolated local
D1, SQLite Durable Objects, synthetic identities, and outbound networking disabled.
The base schema and all 289 migrations apply. Signed HTTP login, concurrent replay
rejection, real socket upgrades, header isolation, encrypted tells, reconnects, and
frame-size rejection are covered by `test:security:runtime`.
The actual limiter binding also rejects a synthetic authentication burst. The
optional browser pass runs the served page in an isolated Chrome profile with
external requests/sockets blocked; its extension signer uses synthetic keys.
That pass succeeded for page boot, guest login, extension signing, logout, and
uppercase/tab-separated key import, with no imported key in socket frames or
rendered history.

The earlier setup command stopped at migration 53. Its replacement initializes a
fresh local database through all tracked migrations and refuses to replay over an
existing player database. Both behaviors were tested in a disposable checkout.
The obsolete remote bootstrap command was removed.

Read-only production checks subsequently confirmed the required secret **names**
and the `auth_spent` table with its `jti` primary key. The historical custody table
is nonempty and its encryption-key binding remains present. Only schema metadata
and a count were queried: no player rows, ciphertext, secret values, or account
identifiers were retrieved into the audit report. No remote data was modified.

The new `AUTH_RATE_LIMITER` binding was deployed together with this code. The configured
180/minute budget is shared per client address; the HMAC key avoids storing literal
addresses in the counter. Missing bindings fail closed. Cloudflare's limiter is
approximate and local to each edge location, not a global DDoS guarantee
([provider documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)).
Automatic request invocation logs are disabled in the deployed configuration so
WebSocket ticket URLs are not retained there; application diagnostics stay enabled.

The historical custody record and encryption key must remain intact until the
owner has a separately verified recovery path. Live Google consent, real signer
approval, and physical passkey prompts remain untested. Provider IAM policy and
secret entropy were not established by checking secret names.

## Authorized production release

Production version `91075019-61de-4131-9e64-d5db96eabd92`, page build `hhfmlb`,
was deployed on 2026-09-18. The previous version
`e51c72be-331b-4083-90a5-56c69508e4d2` was recorded as a rollback target.
No database migration, credential rotation, or legacy custody deletion was
performed for this release.

Post-deployment checks passed on the live service:

- Both production domains serve the expected page build and security headers.
- Served Nostr, vault, and QR bundles exactly match the tested local artifacts.
- The source map and retired Google custody route return 404; an unauthenticated
  administrative request returns 401.
- A synthetic signed login succeeds, replaying the login is rejected, and a
  single-use ticket establishes a real WebSocket connection with a status frame.
  Reusing that ticket is rejected with 401.

The smoke test used one disposable unnamed identity and closed its connection;
it sent no gameplay or chat commands. No production load test was run. Real
Google consent, external signer approval, physical passkey prompts, and legacy
custody retirement remain deferred. Passing these checks does not establish that
the system has no remaining vulnerabilities.
