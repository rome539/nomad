-- THE BOLTHOLES ARE BOLTHOLES (2026-08-20).
--
-- Three spawn rows placed a creature's HOME inside a room the world promises
-- is a hideaway (rooms.is_safe = 1: "a hideaway no creature will follow you
-- into"). Two of them were invisible ambushers — root-things are ROOTED (they
-- never move) and LURKERS (seeded hidden:true) — so the fern pit and the
-- under-roots each held a permanent, unseen striker on ground the player fled
-- to for safety. The third was a rat whose wander-home kept it returning to
-- the cider-house bolthole.
--
-- The engine enforces the sanctuary law everywhere else (settlesHere, rollDen,
-- region wakes all filter safeRooms; creatures cannot enter, attack, or sweep
-- a sheltered wanderer). Only the spawn seeder trusted the table. The rows are
-- moved one step out, onto the open ground next door — same territory, no
-- sanctuary. The two roe-deer rows that also sit in safe rooms are deliberately
-- left alone: roe-deer is in ROAMING_DENS, so the seeder relocates those at
-- first light, and they were never in the bolthole to begin with.
--
-- The rat row was inserted WITHOUT an id (194_who_stayed_behind.sql), so the
-- UPDATE matches by template/room rather than id — it reaches the row however
-- the loader synthesized its key.

UPDATE mob_spawns SET room_id = 'the-cold-seep'   WHERE id = 'spawn-w91' AND template_id = 'root-thing';
UPDATE mob_spawns SET room_id = 'the-clay-shelf'  WHERE id = 'spawn-w102' AND template_id = 'root-thing';
UPDATE mob_spawns SET room_id = 'the-orchard-rows' WHERE template_id = 'rat' AND room_id = 'the-cider-house';
