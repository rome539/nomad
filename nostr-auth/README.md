# nostr-auth

Headless, framework-agnostic Nostr login — copy this folder into any app.

Extracted from Nostr District. **Logic only, no UI** — you wire it to your own
buttons/screens. Bundler-agnostic (Vite, webpack, esbuild, Next, plain `<script type=module>`):
all app-specific config is *injected* at runtime, not read from `import.meta.env`.

## Login methods included

| Method | Function | Notes |
|---|---|---|
| NIP-07 extension | `loginWithExtension()` | Alby, nos2x, etc. |
| Private key (nsec) | `loginWithNsec(nsec)` | Stored in an XSS-resistant key store; 15-min inactivity auto-logout |
| NIP-46 bunker | `loginWithBunkerQR()` / `loginWithBunkerURL()` | Remote signer via `nostrconnect://` |
| Continue with Google | `requestGoogleAuth()` + vault helpers | Encrypted key backup in the user's Drive |
| Passkey / Face ID | `saveWithPasskey()` / `loginWithPasskey()` | WebAuthn recovery |

Guest login is **not** included (it was a one-liner: `NostrTools.generateSecretKey()`).

## Install

```bash
npm i nostr-tools
```

`nostr-tools` is the only runtime dependency (lazy-imported for NIP-44 v2 + nip19).
The core kit can also pull NIP-46 from a CDN — see below.

## 1. Configure once at startup

```ts
import { configureNostrAuth } from './nostr-auth';

configureNostrAuth({
  appName:            'My App',                        // WebAuthn prompt + bunker name
  googleClientId:     'xxxx.apps.googleusercontent.com', // only if using Google
  googlePickerApiKey: 'AIza...',                        // only if using the Drive picker
  driveVaultName:     'my-app-vault.json',              // filename this app writes
});
```

Source the values however your bundler prefers (`import.meta.env.VITE_*`,
`process.env.*`, or literals). They're **not secrets** — the Google client ID and
Picker key are public, referrer-restricted browser credentials.

## 2. Core login (extension / nsec / bunker)

`createNostrAuth(deps)` is dependency-injected — you supply `nostr-tools`, your relay
fetchers, and success/logout callbacks:

```ts
import * as NostrTools from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import { SimplePool } from 'nostr-tools/pool';
import { createNostrAuth } from './nostr-auth';

const auth = createNostrAuth({
  NostrTools,
  nip19: NostrTools.nip19,
  fetchProfile: async (pubkey) => { /* your kind:0 query → profile object */ },
  fetchFollows: async (pubkey) => { /* your kind:3 query → string[] of pubkeys */ },
  onLoginSuccess: ({ pubkey, npub, profile, loginMethod, follows }) => { /* update UI */ },
  onLogout:       () => { /* reset UI */ },
  // Optional — omit to disable bunker (hasBunkerSupport() will report false):
  BunkerSigner, parseBunkerInput, BunkerSimplePool: SimplePool,
});

await auth.loginWithExtension();
await auth.loginWithNsec('nsec1...');
await auth.loginWithBunkerQR({ appName: 'My App', onAuthUrl: (url) => {/* show QR/link */} });

const signed = await auth.signEvent({ kind: 1, created_at: 0, tags: [], content: 'gm' });
auth.logout();
```

> The kit's bottom section (in `security-kit.js`) shows a CDN variant that
> `import()`s `nostr-tools/nip46` from esm.sh if you'd rather not bundle it.

## 3. Continue with Google (encrypted Drive backup)

Flow: get a Drive-scoped token → encrypt the nsec → write one vault file to the
user's Drive. On another device/app: read the vault → decrypt → log in with the nsec.

```ts
import {
  requestGoogleAuth, findVault, writeVault,
  createBackupWithPin, unlockWithPin,
} from './nostr-auth';

// Save
const { accessToken } = await requestGoogleAuth();
const backup = await createBackupWithPin(nsec, userPin);
await writeVault(accessToken, backup);

// Restore
const { accessToken: t } = await requestGoogleAuth();
const found = await findVault(t);
if (found) {
  const nsec = await unlockWithPin(found.backup, userPin);
  await auth.loginWithNsec(nsec);
}
```

Passkey/Face ID wrapping (so the user unlocks the vault with biometrics instead of a
PIN) is available via `saveWithPasskey` / `loginWithPasskey` / `wrapDekWithPasskey`.

### Google Cloud setup (one time)
- Create an **OAuth 2.0 Client ID** (Web) → use as `googleClientId`.
- Scopes used: `drive.appdata` + `drive.file` — Google never learns the user's name/email.
- For the file picker: enable the **Picker API**, make an **API key**, restrict it to the
  Picker API + your referrer → use as `googlePickerApiKey`.
- Add your origin to the OAuth **Authorized JavaScript origins**.

### Required response headers
Google's popup token flow needs the opener link kept alive:

```
Cross-Origin-Opener-Policy: same-origin-allow-popups
```

(NOT `same-origin` — that nulls `window.opener` and the token never comes back.)
Note this turns off cross-origin isolation, so no `SharedArrayBuffer`.

Your CSP must also allow the Google scripts:
`script-src https://accounts.google.com https://apis.google.com` and
`connect-src https://www.googleapis.com https://oauth2.googleapis.com`.

## Files

```
config.ts        injected runtime config (call configureNostrAuth first)
index.ts         public API barrel — import everything from here
security-kit.js  core: extension/nsec/bunker + secure key store + sanitizers  (+ .d.ts)
googleAuth.ts    Google OAuth token (GIS popup)
googlePicker.ts  Drive file picker (cross-app vault import)
driveBackup.ts   read/write the encrypted vault file on Drive (plain REST)
backupCrypto.ts  NIP-44 v2 + PIN/passkey wrapping of the nsec
passkeyStore.ts  WebAuthn passkey save/recover (Face ID / Touch ID)
```

## Security notes

- **nsec never has a getter.** `createSecureKeyStore` holds the key in a closure and only
  exposes `signEvent` — XSS can't read it back out.
- **Inactivity auto-logout** (15 min) starts on nsec login.
- **Verify signatures** on anything you read from relays — relays don't re-verify on read.
- The vault is decrypted client-side only; Google (or any Drive host) sees ciphertext.
