-- Existing backups remain recoverable. Only backups from the explicit mint path carry this flag.
ALTER TABLE key_saves ADD COLUMN minted INTEGER NOT NULL DEFAULT 0;
