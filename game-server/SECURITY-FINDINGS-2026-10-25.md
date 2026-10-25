# Security findings and remediation — October 25, 2026

Reviewed HEAD `5bdce10` together with the existing uncommitted gameplay changes.
Those changes are preserved. This follow-up addresses the three finding groups
from the local audit. It does not change provider permissions or recovery records.

## 1. Rejected WebSocket messages caused shared player-state writes

**Severity: medium. Confirmed locally.** A guest with a valid socket could send
malformed or rate-limited input. Although command dispatch rejected it, the outer
message handler still synchronized and checkpointed every connected player.
Six rejected messages with 20 synthetic sessions produced 120 durable writes.
Queue depth limits bounded concurrent work but did not stop sequential abuse.

**Fix:** the command admission callback runs only after structural/secret checks
and token consumption. World-wide synchronization, checkpoints and alarm checks
are conditional on admission. Rejected requests no longer restamp presence.
Admitted commands still checkpoint in a `finally` block, including partial failures.
Existing cold-session hydration remains necessary before per-player admission.

**Regression:** `scripts/test-security-admission.mjs` verifies zero checkpoint
writes for malformed and exhausted-token traffic against warm sessions, and
continued durability for admitted commands and handler exceptions.

## 2. Public polling caused unbounded game-object requests

**Severity: medium. Confirmed local Worker call path.** Every `/build` request
contacted all zones; `/world.json` queried the zone before returning its cache
header. Neither used application rate limiting. Twelve unauthenticated requests
to each endpoint caused twelve zone requests without invoking the limiter.
External production WAF/cache settings were not established by this reproduction.

**Fix:** `/build` tells the zones its build at most once every 30 seconds per
Worker instance, instead of on every request. (A first version stopped the ping
entirely; review found that broke the deploy notice, because the ping is how a
running world learns a new build is live and restarts onto it, and players
already connected would get no reweave line until someone reconnected.) Public
reads (`/build`, `/world.json`, `/mints`, `/sheet`) use a separate HMAC counter
namespace within the existing rate-limit binding: 180 requests per minute per
edge-observed address. Public traffic cannot consume the authentication budget.
Missing or failed limiter configuration fails closed. The world snapshot uses
Cloudflare's Cache API for 45 seconds, with a canonical zone/build key so extra
query parameters cannot defeat caching. Failed upstream responses preserve their
status and are not cached. This cache is per edge location, not a global lock.

**Regression:** admission tests verify blocked requests do not reach storage,
separate public/auth counters, one zone call for twelve repeated build polls, one zone
call for repeated canonical snapshot requests, and no caching of upstream errors.

## 3. Vulnerable development and capture tools

**Severity: high advisory ratings; live-game exploit not demonstrated.** The
registry audit flagged four game-server development dependency entries and three
capture-tool entries, including inherited severity. These are not seven distinct
vulnerabilities. Affected families included Sharp/librsvg, Undici, and Zod.

**Fix:** update Wrangler to 4.152.0, its matching Miniflare to 5.20261019.2-beta,
Cloudflare types to 5.20261019.1, and capture Puppeteer to 25.16.0. Regenerate both
lockfiles; do not force an incompatible Miniflare downgrade. Miniflare still pins
an affected Undici, so a scoped npm override selects the patched compatible
Undici 7.30.1. Capture manifests remain in the repository's existing ignored
`promo/capture` directory; their local versions and lockfile were updated without
exposing the rest of that private working directory.

Advisories: [Sharp/librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w),
[Undici](https://github.com/advisories/GHSA-3wwx-pv8p-q78v),
[Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

## Verification and deployment

Completed locally on the patched workspace:

- Security regression and new admission/resource-cost tests passed. The original
  six-frame/20-session reproduction now produces zero checkpoint writes.
- Real Worker/D1/Chrome security tests passed with all 339 migrations, including
  login/replay protection, encrypted tells, socket displacement, browser identity
  transitions, public-read throttling and an independent authentication budget.
- Inventory lifecycle, loadouts, reconnect, catch-up, invite and gameplay
  regressions passed. The Clave browser test passed when run with browser launch
  permission; its initial sandboxed launch failed before executing browser tests.
- Typecheck, served-script validation, privacy scanning and diff checks passed.
- Both dependency audits report zero known vulnerabilities after the updates.
- The patched Wrangler deployment dry run succeeded.

No commit, push or production deployment was performed. Existing unrelated
working-tree edits are preserved. These findings are remediated in the local
workspace; production remains unchanged until this work is released.

Provider settings, historical recovery-record retirement, and additional real
provider/device combinations remain outside this code fix. The audit environment
received HTTP 403 from the public homepage, so current production verification
was not established by the October audit.
