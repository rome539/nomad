-- THE SHELF RUSTS (rome, 2026-08-03: "make gear rust but never destory when
-- stored int he ren").
--
-- FIRST, A CORRECTION I OWE THE RECORD. I said stored gear ages. It does not.
-- The rust tick (zone.ts) walks `session.items` — what you are CARRYING — so
-- anything in a container has been sitting in a freezer, and the den's whole
-- stated trade against the vault ("the vault stops time; the house does not")
-- was a line of prose with nothing behind it. This makes it true.
--
-- WHY A COLUMN AND NOT A TICK. Rusting stored gear on the world tick would mean
-- walking every stowed row of every player, online or not, every two seconds,
-- and writing them back — thousands of rows a beat at the scale this is being
-- built for, to move a number nobody is looking at. So the shelf rusts LAZILY:
-- each row remembers when it was put down, and the rust for the whole interval
-- is worked out and applied at the moment somebody looks. Identical result, no
-- clock, and it is correct across a deploy, a hibernation, or a month away.
--
-- The column is general (it is the lockbox's and vault's too, and costs them
-- nothing) because it answers a general question: how long has this been where
-- it is.
ALTER TABLE player_items ADD COLUMN container_at INTEGER;

-- Anything already in a container starts its clock now rather than at whatever
-- it was acquired, so nothing takes a retroactive fortnight of rust the first
-- time this runs. Prod holds no den rows at all yet — this is for lockboxes and
-- vaults, which must not so much as flicker.
UPDATE player_items SET container_at = (strftime('%s','now') * 1000)
WHERE container_at IS NULL AND container != '';

-- NEVER DESTROYED. The rust floors at DEN_RUST_FLOOR (zone-data.ts) — below the
-- "about to fail" mark, so a long-abandoned piece comes off the shelf visibly
-- wrecked and speaks it plainly, and above zero, ALWAYS. The ordinary wear path
-- (zone.ts wear()) deletes a piece at 0; the shelf never calls it and cannot
-- reach it. What you put down is what you pick up, in worse condition and never
-- in fewer pieces.
--
-- And it stays MENDABLE: a floored piece is a bench job, not a loss. That is
-- the whole shape of the feature — a den costs you upkeep on what you hoard,
-- it does not confiscate it.
