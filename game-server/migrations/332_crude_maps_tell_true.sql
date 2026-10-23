-- THE CRUDE MAP STOPS LYING (rome, 2026-10-23). It shows real rooms now: a
-- share of the world drawn in by the copyist, and whatever its carrier walks
-- set down on top. The old description promised doors that were never there.
UPDATE item_templates
   SET description = 'A smeared scrap of a map, copied by someone who got some of the way down and left the rest blank. What is drawn on it is true. Carry it, and the ground you walk fills in.'
 WHERE id = 'crude-map';
