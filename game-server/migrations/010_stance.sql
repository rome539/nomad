-- Fighting stance is a play-style, so it sticks to the character, not the
-- browser: it lives on the player row, keyed by pubkey, next to hp and name.
-- Because that row is keyed to your key, your stance follows you to any browser
-- or your phone — wherever the vault restores you — for free.
ALTER TABLE players ADD COLUMN stance TEXT NOT NULL DEFAULT 'steady';
