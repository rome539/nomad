-- 069: THE TIDEWAYS. Ten rooms hanging below the water country — the wing the
-- tide owns (rome passed the paper map 2026-07-11). Two mouths: under the
-- undertow and under the weir, so it loops. Floods bottom-up: the still-cradle
-- drowns first, the breathing-hall last (and usually not at all). The best
-- loot sits exactly where the water starts — depth-greed and the tide-clock
-- are the same bet. The tide event itself lives in events.ts; these are its
-- bones. Needs a reseed (new rooms + spawns).

INSERT OR REPLACE INTO rooms (id, zone, name, description, is_entry, is_safe) VALUES
  ('the-tide-gate', 'door', 'The Tide-Gate',
   'A throat of stone under the undertow, its walls banded with high-water lines like the rings of a tree. The air is wet rope and old salt. Somewhere below, water is waiting its turn.', 0, 0),
  ('the-under-weir', 'door', 'Under the Weir',
   'The weir''s bones, seen from beneath: sluice-slots choked with mussel-crust, a ladder of weep-holes going down into the dark. Everything here has been underwater a thousand times and means to be again.', 0, 0),
  ('the-drowning-stair', 'door', 'The Drowning Stair',
   'Steps cut too steep by men in a hurry, worn soap-smooth since. A rusted ring is set into every fifth step — for the rope, or for the last hand that did not reach it.', 0, 0),
  ('the-eel-run', 'door', 'The Eel-Run',
   'A channel of black water runs the length of the room, quick and greasy. Things move in it against the current. The stone shelf beside it is scattered with fish bones picked perfectly clean.', 0, 0),
  ('the-long-swallow', 'door', 'The Long Swallow',
   'A corridor that narrows as it goes, ribbed like a gullet. The walls sweat. Your light finds the far end only when the far end wants it to.', 0, 0),
  ('the-salt-vault', 'door', 'The Salt-Vault',
   'Shelves cut into the living rock, rimed white. The garrison stored against siege down here — below the water line, where nothing burns and nothing thieves. Most of it has spoiled. Not all of it.', 0, 0),
  ('the-breathing-hall', 'door', 'The Breathing-Hall',
   'A vaulted chamber above the waterline, where the air moves in slow pulses — in, and out — as if the whole wing were a lung. Dry ledges, still air. It feels safe here. The high-water mark on the wall is a hand above your head.', 0, 0),
  ('the-tide-throat', 'door', 'The Tide-Throat',
   'The stone here is polished — not carved, worn, by water with somewhere to be. Standing in this room is standing in a pipe. The drips count down the walls like a clock.', 0, 0),
  ('the-silt-chapel', 'door', 'The Silt-Chapel',
   'An altar to something with too many mouths, buried to the knees in grey silt. Offerings still lie where the water last arranged them — the tide tends this shrine, and takes what it is owed.', 0, 0),
  ('the-still-cradle', 'door', 'The Still Cradle',
   'The bottom. A round chamber of black water and blacker quiet, where what the tide carries comes finally to rest. The floor is a midden of the drowned world''s leavings. The water remembers everyone who stayed too long.', 0, 0);

-- The two mouths, and the wing's own passages (every edge both ways).
INSERT OR REPLACE INTO exits (room_id, dir, to_room, key_item) VALUES
  ('the-undertow', 'down', 'the-tide-gate', NULL),
  ('the-tide-gate', 'up', 'the-undertow', NULL),
  ('the-weir', 'down', 'the-under-weir', NULL),
  ('the-under-weir', 'up', 'the-weir', NULL),
  ('the-tide-gate', 'south', 'the-drowning-stair', NULL),
  ('the-drowning-stair', 'north', 'the-tide-gate', NULL),
  ('the-under-weir', 'south', 'the-eel-run', NULL),
  ('the-eel-run', 'north', 'the-under-weir', NULL),
  ('the-drowning-stair', 'east', 'the-eel-run', NULL),
  ('the-eel-run', 'west', 'the-drowning-stair', NULL),
  ('the-drowning-stair', 'down', 'the-long-swallow', NULL),
  ('the-long-swallow', 'up', 'the-drowning-stair', NULL),
  ('the-eel-run', 'down', 'the-salt-vault', NULL),
  ('the-salt-vault', 'up', 'the-eel-run', NULL),
  ('the-long-swallow', 'east', 'the-salt-vault', NULL),
  ('the-salt-vault', 'west', 'the-long-swallow', NULL),
  ('the-long-swallow', 'down', 'the-breathing-hall', NULL),
  ('the-breathing-hall', 'up', 'the-long-swallow', NULL),
  ('the-breathing-hall', 'down', 'the-tide-throat', NULL),
  ('the-tide-throat', 'up', 'the-breathing-hall', NULL),
  ('the-tide-throat', 'west', 'the-silt-chapel', NULL),
  ('the-silt-chapel', 'east', 'the-tide-throat', NULL),
  ('the-tide-throat', 'down', 'the-still-cradle', NULL),
  ('the-still-cradle', 'up', 'the-tide-throat', NULL);

-- Who lives down here: the drowned range the wing, a crawler works the
-- eel-channel, and a hulk stands over the cradle's midden.
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('tideways-drowned-gate', 'the-drowned', 'the-tide-gate'),
  ('tideways-drowned-swallow', 'the-drowned', 'the-long-swallow'),
  ('tideways-drowned-throat', 'the-drowned', 'the-tide-throat'),
  ('tideways-crawler-run', 'pale-crawler', 'the-eel-run'),
  ('tideways-hulk-cradle', 'drowned-hulk', 'the-still-cradle');

-- The siege-stores and the shrine's offerings. The vault's provisions regrow
-- on the dead-stock clock (2-4h); the offerings are one-time finds per world.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('salt-fish', 'the-salt-vault', 1),
  ('smoked-haunch', 'the-salt-vault', 1),
  ('bone-charm', 'the-silt-chapel', 0),
  ('knucklebone-rosary', 'the-silt-chapel', 0),
  ('war-medal', 'the-still-cradle', 0),
  ('fistful-teeth', 'the-still-cradle', 0);
