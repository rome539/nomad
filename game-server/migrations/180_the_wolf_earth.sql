-- THE WOLF EARTH (rome, 2026-08-08: "we can have a small cave for wolves").
--
-- The wood's wolves had a food web, a night surge, a pack call and no address.
-- They denned nowhere: territory held them loosely near wherever they happened
-- to spawn, and the ROAMING_DENS flag meant even that drifted. A pack with no
-- earth is a pack that is only ever met by accident.
--
-- WHERE. The sunken wood, west off the Under-Eaves at (-27,5) — a cell that was
-- empty, with the Old Pond north and the Buried Wall west of it. Two things
-- make this the right corner rather than a free square:
--
--   1. The sunken quarter is COVER (detail.ts underCover) — closed canopy, the
--      ground weather drives everything toward. Prey shelters there in rain now,
--      which means the wolves' door opens onto the room their food runs to. That
--      is not a coincidence to explain away; that is why an animal dens there.
--   2. The holding quarter, one range north, has THE WOLF PITS — traps dug for
--      wolves by people who are all long dead. The pits are still there and so,
--      it turns out, are the wolves. The estate lost that argument.
--
-- The room is DARK (zone-data DARK_ROOMS) — it is a hole in the earth under a
-- root plate. You go in with a light or you go in blind, and either way you are
-- going in to where they sleep.
INSERT INTO rooms (id, zone, name, description, is_entry, is_safe, region, is_spawn, map_x, map_y) VALUES
  ('the-wolf-earth', 'door', 'The Wolf Earth',
   'A beech came down here long enough ago that the root plate has become a wall, and the hollow it tore out of the ground has been widened since by something that meant to live in it. The way in is a low mouth under the roots, worn smooth along the bottom edge. Inside it is dry, and warmer than it has any right to be, and the floor is trodden flat and littered — bone, mostly, cracked lengthways for the marrow, and the grey drift of hair that comes off an animal that sleeps in one place. It smells overwhelmingly of dog.',
   0, 0, 'wood', 0, -27, 5);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wolf-earth', 'east', 'the-under-eaves', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-under-eaves', 'west', 'the-wolf-earth', NULL);

-- =========================================================================
-- WHO IS HOME. Three dens of grey wolf in one room — the only place in the
-- world where the pack is a pack before it is called. The variant roll stands
-- (8% dire wolf per den, mob_variants), so the earth is where a dire wolf is
-- most likely to be waiting, without anything being special-cased to put one
-- there. Nothing is added to the world's wolf population: these are dens, and
-- reconcilePopulation counts them like any other.
--
-- Deliberately NOT a boss room and NOT a treasury. It is a place where animals
-- live. The danger is that there are three of them, in the dark, at home.
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-wolf', 'the-wolf-earth');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-wolf', 'the-wolf-earth');
INSERT INTO mob_spawns (template_id, room_id) VALUES ('grey-wolf', 'the-wolf-earth');

-- =========================================================================
-- WHAT IS ON THE FLOOR. What a den floor actually has: bone nobody wants, and
-- the leavings of things that were dragged in and eaten. The knucklebone and
-- the finger-bone are worth nothing and are there to be TRUE — the floor is
-- described as littered with bone, so the floor has bone on it.
--
-- The wolf pelt is the one thing worth the walk, and it is not loot lying about
-- so much as evidence: a pack sleeping on the skin of one of its own. It
-- regrows, like every other renewable spot, on the gear dice.
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('knucklebone',  'the-wolf-earth', 1),
  ('finger-bone',  'the-wolf-earth', 1),
  ('deer-haunch',  'the-wolf-earth', 1),
  ('wolf-pelt',    'the-wolf-earth', 1);
