-- ALIASES (rome, 2026-11-03). A wanderer's own short words for what they type
-- often (aliases.ts): `alias kr = attack rat`. One word stands for one command;
-- they live on the player row so they follow the key to every browser.
-- JSON {word: command}; '' = none.
ALTER TABLE players ADD COLUMN aliases TEXT NOT NULL DEFAULT '';
