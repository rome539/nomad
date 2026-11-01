-- THE GATEHOUSE IS ONE ROOM (rome, 2026-11-01). It sits behind every gate, and
-- whoever comes in at any of them sits by the same fire, but carvings set down
-- in it were filed under the gate their carver came in by, so they showed only
-- to those who came in at that same gate. They are filed under the gatehouse
-- itself now (carving.ts spotOf), and the ones already standing there move with
-- the rule.
UPDATE carvings SET room_id = 'gatehouse' WHERE inside = 'gatehouse' AND room_id != '';
