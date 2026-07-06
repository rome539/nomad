// nostr-auth — headless, framework-agnostic Nostr login for copy-in reuse.
//
// Public API barrel. Configure once at startup, then use the pieces you need:
//
//   import { configureNostrAuth, createNostrAuth } from './nostr-auth';
//
// See README.md for full setup (deps, CSP/COOP headers, Google console config).

// ── Config (call this first) ──────────────────────────────────────────────────
export { configureNostrAuth, getNostrAuthConfig } from './config';
export type { NostrAuthConfig } from './config';

// ── Core login methods: NIP-07 extension, nsec, NIP-46 bunker + security ───────
// createNostrAuth(deps) → { loginWithExtension, loginWithNsec, loginWithBunkerQR,
//   loginWithBunkerURL, signEvent, logout, getCurrentUser, isLoggedIn,
//   getLoginMethod, hasBunkerSupport }
// Also: createSecureKeyStore, createInactivityMonitor, and profile/spam helpers.
export {
  createNostrAuth,
  createSecureKeyStore,
  createInactivityMonitor,
  escapeHtml,
  sanitizeUrl,
  capLength,
  sanitizeDisplayName,
  sanitizeBio,
  sanitizeNip05,
  detectSpam,
  detectNSFW,
  detectDeletedAccount,
} from './security-kit';

// ── Google "Continue with Google" (encrypted Drive backup) ─────────────────────
export {
  isGoogleConfigured,
  preloadGoogleAuth,
  requestGoogleAuth,
  requestGoogleDriveFileAuth,
} from './googleAuth';
export type { GoogleAuthResult } from './googleAuth';

export { isPickerConfigured, pickDriveFile } from './googlePicker';

// ── Encrypted key vault on Drive (read/write the single visible file) ──────────
export {
  getVaultId,
  setVaultId,
  clearVaultId,
  readVaultById,
  findVault,
  writeVault,
  readLegacyAppData,
} from './driveBackup';

// ── Backup crypto (NIP-44 v2 + PIN/passkey wrapping of the nsec) ───────────────
export {
  createBackup,
  createBackupWithPin,
  unlockWithPin,
  unlockDekWithPin,
  unlockDekWithPasskey,
  wrapDekWithPasskey,
  withPasskeyWrap,
  rewrapPin,
  decryptNsecFromDek,
  hasPasskeyWrap,
  getPasskeyWrapMeta,
} from './backupCrypto';
export type { EncryptedBackup, PasskeyWrap } from './backupCrypto';

// ── Passkey / Face ID recovery (WebAuthn) ──────────────────────────────────────
export {
  getPrimaryPasskeyId,
  setPrimaryPasskeyId,
  getStoredPasskeys,
  clearStoredPasskey,
  clearAllPasskeys,
  isPasskeySupported,
  saveWithPasskey,
  linkExistingPasskey,
  createRecoveryPasskey,
  getRecoveryPasskeyPrf,
  loginWithPasskey,
} from './passkeyStore';
export type { StoredPasskey, RecoveryPasskey } from './passkeyStore';
