-- Two creatures that DO things, not just fight — the engine gives them their
-- behavior (see THIEVES / SCAVENGERS in zone.ts); this is only their flesh.
--
-- The cutpurse fights to GRAB: one hit and it's off your back with an unsealed
-- thing, running. Kill it and your loot spills where it falls; let it go and
-- it's gone. (Sealed loot is title the dungeon marked as yours — its fingers
-- slide off. Now the gate-seal guards against theft, not only death.)
--
-- The grave-hyena fights nothing at first — it eats the dungeon's dead, the
-- blood and remains a fight leaves lying, healing and growing bolder with every
-- corpse. Leave a battlefield uncleared and it fattens into something that
-- won't run and hits harder. A careless dungeon arms it.

INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop) VALUES
('cutpurse', 'a skittering cutpurse',
 'Half the size of a person and twice as quick, all knuckles and grabbing fingers. It does not especially want to kill you. It wants what you are carrying, and it wants to be somewhere else.',
 2, 14, 1, 2, 45, 0, NULL, 0, 0, NULL, 0),
('grave-hyena', 'a grave-hyena',
 'Lean and grinning, its coat matted with the grime of a hundred meals. It pays you little mind while there are dead to eat — and in the Door there are always dead. The more it feeds, the less it fears.',
 3, 30, 3, 5, 60, 0, 'bone-charm', 0.2, 1, NULL, 0);

-- Where they live (never a gate — the threshold rule bars that): cutpurses in
-- the crowded rooms where a body presses close (cells, ossuary), hyenas in the
-- rooms that reek of the dead (catacomb, kennels).
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('purse-1', 'cutpurse',    'cells'),
('purse-2', 'cutpurse',    'ossuary'),
('hyena-1', 'grave-hyena', 'catacomb'),
('hyena-2', 'grave-hyena', 'kennels');
