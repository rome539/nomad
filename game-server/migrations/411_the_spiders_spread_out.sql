-- 411: THE SPIDERS SPREAD OUT (2026-11-24). The cave spider holds land, and its six
-- rows all sat in the silk and the roosts of the middle cave, where only three homes
-- lie four rooms apart. Three keep the silk; three go up to the upper cave's
-- dripstone and overhang and down to the foxfire wall, and its ground widens to
-- match (cave-ground.ts CAVE_SETTLES), which gives ten. Ids kept (mig 309); the ones
-- standing go with their rows (zone-data DEN_MOVES).
UPDATE mob_spawns SET room_id = 'the-curtains' WHERE id = 'spawn-cave-spider@the-hanging-silk'; -- from the-hanging-silk
UPDATE mob_spawns SET room_id = 'the-overhang' WHERE id = 'spawn-cave-spider@the-spiders-gallery'; -- from the-spiders-gallery
UPDATE mob_spawns SET room_id = 'the-foxfire-wall' WHERE id = 'spawn-cave-spider@the-roost-edge'; -- from the-roost-edge
