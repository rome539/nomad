-- The notched iron key (strongbox-key) dropped off NINE mob types — too many
-- faucets for a key that opens ANY of the six strongboxes. Keys were coming
-- faster than the chests refill, so a found key felt disposable. Halve every
-- source, so a key is worth carrying and the strongboxes stay a small event.
-- (rome, 2026-07-08.)
--
-- Before -> after: warden-captain .12->.06, warden .10->.05, dire-hyena .08->.04,
-- cutthroat .08->.04, cutpurse .06->.03, drowned-hulk .06->.03, the-drowned
-- .05->.025, twice-dead .04->.02, pale-crawler .04->.02.
--
-- Also: the reliquary-key ("the black key") off a plain warden was 3% — a bit
-- generous for the king's key on a common surface mob. Down to 1%: a rare mercy
-- for anyone who can't yet reach the throne, without undercutting the kings
-- (still 60% each). Absolute set, not relative — safe to re-run.
--
-- NOTE: mob_keys is World config, read into memory at DO cold-start (not SIM
-- state) — no reseed needed, but the worker must be REDEPLOYED so the warm
-- Durable Object reloads the World with the new rates.

UPDATE mob_keys SET drop_chance = drop_chance / 2.0 WHERE key_item = 'strongbox-key';
UPDATE mob_keys SET drop_chance = 0.01 WHERE template_id = 'warden' AND key_item = 'reliquary-key';
