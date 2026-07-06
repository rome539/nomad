-- "Continue with Google": custodial key backup. The dungeon keeps a Google
-- wanderer's Nostr secret sealed (AES-GCM, see crypto.ts) and hands it back on
-- login, so a normie never has to understand a key to keep a character.
CREATE TABLE IF NOT EXISTS google_accounts (
  sub        TEXT PRIMARY KEY,   -- stable Google user id (never the email)
  pubkey     TEXT NOT NULL,      -- the wanderer's npub, in hex
  enc_sk     TEXT NOT NULL,      -- base64(iv ‖ AES-GCM ciphertext) of the secret
  created_at INTEGER NOT NULL
);
