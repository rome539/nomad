-- 395 the crude map goes (rome, 2026-11-13).
--
-- Every wanderer now keeps the way they came since the last gatehouse (the
-- `trail` verb), map or no map, so the cheap half-drawn copy has no job left
-- that the trail and the surveyor's map do not do between them. The keeper
-- stops selling it, the six who carried one stop dropping it, and the one in
-- the old boat is not laid again.
--
-- The item itself stays: a copy somebody already holds still opens and still
-- takes ink until it is lost. Nothing is taken out of a pack.

DELETE FROM fence_stock   WHERE item_id  = 'crude-map';
DELETE FROM mob_keys      WHERE key_item = 'crude-map';
DELETE FROM ground_spawns WHERE item_id  = 'crude-map';
