-- 403 A NAME AND A PASSWORD (rome, 2026-11-18). See src/keysave.ts.
--
-- A key the game made for a newcomer lives only in their browser; clearing it
-- lost the wanderer. This keeps a LOCKED copy, filed by the wanderer's key and
-- found through its name, so a rename carries it along. The browser locks the
-- key with the password before sending it: we hold the locked copy and a hash
-- of a check value, never the key and never the password.
CREATE TABLE IF NOT EXISTS key_saves (
  pubkey     TEXT PRIMARY KEY,       -- the wanderer it brings back
  salt       TEXT NOT NULL,          -- base64, random per save
  iter       INTEGER NOT NULL,       -- PBKDF2 rounds
  iv         TEXT NOT NULL,          -- base64 AES-GCM nonce
  ct         TEXT NOT NULL,          -- base64 locked key
  check_hash TEXT NOT NULL,          -- sha256 of the password check
  tries      INTEGER NOT NULL DEFAULT 0, -- wrong passwords in the current hour
  tries_at   INTEGER NOT NULL DEFAULT 0, -- when that hour began (unix seconds)
  saved_at   INTEGER NOT NULL
);
