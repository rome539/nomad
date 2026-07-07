-- Populate to themes (lean pass). Named atmosphere rooms were ghost towns because
-- their seed count WAS their population cap — a "Muster Yard" with no one mustering,
-- a "Broken Chapel" that spawned nothing, ever. Seed the STANDOUT rooms to what they
-- are; minor rooms stay bare for now (a dungeon isn't wall-to-wall). Base templates
-- only; the bloodline system still upgrades a warden to a captain or a grave-hyena
-- to a dire now and then. Gates, hideaways, the forge and the shrine stay empty on
-- purpose (no camping the way out; no ambush in a haven).

-- The garrison wakes: a real watch on the Warden's Post (1 -> 2), a manned guardroom,
-- and a warden drilling the dead in the Muster Yard.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('ward-3', 'warden',   'warden-post'),
  ('ward-4', 'warden',   'muster'),
  ('skel-5', 'skeleton', 'muster'),
  ('ward-5', 'warden',   'guardroom');

-- The Broken Chapel: something pale has made a nest of the sanctuary. A LURKER
-- this high up is a nasty surprise — the deep reaching up into a holy place.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('crawler-5', 'pale-crawler', 'chapel');

-- The kitchen wing draws scavengers. The Hound Kennels become a small pack (the
-- lone rat is off the menu); a grave-hyena works the Rotting Larder.
DELETE FROM mob_spawns WHERE id = 'rat-6'; -- the kennel rat: hounds den here, not vermin
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('hyena-3', 'grave-hyena', 'kennels'),
  ('hyena-4', 'grave-hyena', 'larder');
