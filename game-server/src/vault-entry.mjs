// Entry for the Drive-vault client bundle (served at /vault.js, lazy-loaded).
// Re-exports exactly the slice of ../../nostr-auth the game needs: Google
// token popup, the Picker (cross-app vault import), Drive vault read/write,
// and the PIN wrap crypto. Regenerate with:  npm run bundle:vault
export { configureNostrAuth } from "../../nostr-auth/config";
export { requestGoogleAuth, preloadGoogleAuth } from "../../nostr-auth/googleAuth";
export { isPickerConfigured, pickDriveFile } from "../../nostr-auth/googlePicker";
export {
  findVault,
  readVaultById,
  readLegacyAppData,
  writeVault,
  getVaultId,
  setVaultId,
  clearVaultId,
} from "../../nostr-auth/driveBackup";
export { createBackupWithPin, unlockWithPin } from "../../nostr-auth/backupCrypto";
// Passkey recovery: a second wrap on the vault's DEK so a forgotten PIN can be
// recovered with Face ID / Touch ID (WebAuthn PRF). PIN stays the primary door;
// the passkey is enrolled per-domain, so it lives on nomadmud.com only.
export {
  createBackup,
  unlockDekWithPin,
  decryptNsecFromDek,
  wrapDekWithPasskey,
  withPasskeyWrap,
  unlockDekWithPasskey,
  hasPasskeyWrap,
  getPasskeyWrapMeta,
  rewrapPin,
} from "../../nostr-auth/backupCrypto";
export {
  isPasskeySupported,
  createRecoveryPasskey,
  getRecoveryPasskeyPrf,
} from "../../nostr-auth/passkeyStore";
