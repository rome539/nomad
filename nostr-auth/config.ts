// config.ts — runtime configuration for the copy-in nostr-auth module.
//
// The original app read Google credentials from Vite's `import.meta.env`. To keep
// this module bundler-agnostic (Vite, webpack, esbuild, Next, plain <script>), the
// consuming app instead INJECTS its config once at startup:
//
//   import { configureNostrAuth } from './nostr-auth/config';
//   configureNostrAuth({
//     googleClientId:     import.meta.env.VITE_GOOGLE_CLIENT_ID, // or process.env, or a literal
//     googlePickerApiKey: import.meta.env.VITE_GOOGLE_PICKER_API_KEY,
//     appName:            'My App',        // WebAuthn RP name + NIP-46 bunker app name
//   });
//
// Nothing here is a secret: the Google client ID and Picker API key are public,
// referrer-restricted browser credentials by design.

export interface NostrAuthConfig {
  /** Google OAuth client ID (public, referrer-restricted). Required for Google login. */
  googleClientId?: string;
  /** Google API key with the Picker API enabled. Required only for the Drive file picker. */
  googlePickerApiKey?: string;
  /**
   * Human-readable app name. Used as the WebAuthn Relying Party name (shown in the
   * OS passkey/Face ID prompt) and as the default NIP-46 bunker app name.
   */
  appName?: string;
  /**
   * Filename this app uses when it CREATES the Drive vault (visible My Drive file).
   * Cross-app import doesn't depend on this — a foreign vault is validated by
   * decryption, not by name — so each app can use its own.
   */
  driveVaultName?: string;
}

let _config: NostrAuthConfig = { appName: 'Nostr App', driveVaultName: 'nostr-account-vault.json' };

/** Set config once at app startup. Merges over any previous call. */
export function configureNostrAuth(config: NostrAuthConfig): void {
  _config = { ..._config, ...config };
}

/** Read the current config (used internally by the module). */
export function getNostrAuthConfig(): Readonly<NostrAuthConfig> {
  return _config;
}
