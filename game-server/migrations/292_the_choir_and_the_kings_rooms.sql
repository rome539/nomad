-- THE CHOIR AND THE KING'S ROOMS (the second half of rome's 2026-09-26 deep
-- rework; 290 cut the old line, 291 laid regions/the-deep-2.rooms).
--
-- THE THREE SEAMS. Each joins new ground to a room of the original deep whose
-- square on the paper is boxed in, so no compass step agrees with it. Written in
-- the .rooms file they would have seeded the Choir off the wrong square and
-- dragged it across the sheet; written here they are just doors.
--   the Silted Stair goes down into the Silt-Fall, the Choir's west end — the
--     silt on the stair was always coming from somewhere.
--   the Cantors' Door goes down to the Bone Processional. The Choir is what
--     opens on the court now; the dark floor no longer does.
--   the Cold Hearth's chimney drops to the Silt-Chapel, so the Tideways' long
--     wet way reaches the court too. Its SOUTH stays free: that is the side the
--     breach opens onto the death cell (BREACH_PAIRS).

INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('silted-stair', 'down', 'the-silt-fall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-silt-fall', 'up', 'silted-stair', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('bone-processional', 'up', 'the-cantors-door', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-cantors-door', 'down', 'bone-processional', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-cold-hearth', 'down', 'the-silt-chapel', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-silt-chapel', 'up', 'the-cold-hearth', NULL);

-- WHO LIVES THERE. Only the deep's own roster, placed by what each room is: the
-- drowned in the standing water, the twice-dead on the old garrison's and the
-- court's floors, the verdigris-things on the silt, and two more marrow-cantors
-- where the Choir actually sings. The King's Stair and the Waiting Hall stay
-- empty on purpose — nothing stands between the king and whoever comes down.
--
-- Three pale-crawler dens, each put where no other den sits inside the 3-room
-- territory radius, because overlapping bubbles are what stacked five of them
-- into one room before migration 120 thinned them.
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('deep2-drowned-chain-well',      'the-drowned',     'the-chain-well'),
  ('deep2-drowned-flooded-cloister','the-drowned',     'the-flooded-cloister'),
  ('deep2-drowned-sunk-bell',       'the-drowned',     'the-sunk-bell'),
  ('deep2-drowned-sluice-gear',     'the-drowned',     'the-sluice-gear'),
  ('deep2-drowned-choir-drain',     'the-drowned',     'the-choir-drain'),
  ('deep2-drowned-brine-cellar',    'the-drowned',     'the-brine-cellar'),
  ('deep2-twice-kitchens',          'twice-dead',      'the-drowned-kitchens'),
  ('deep2-twice-blind-gallery',     'twice-dead',      'the-blind-gallery'),
  ('deep2-twice-feeling-wall',      'twice-dead',      'the-feeling-wall'),
  ('deep2-twice-singing-gallery',   'twice-dead',      'the-singing-gallery'),
  ('deep2-twice-cantors-cells',     'twice-dead',      'the-cantors-cells'),
  ('deep2-twice-long-pews',         'twice-dead',      'the-long-pews'),
  ('deep2-twice-bone-font',         'twice-dead',      'the-bone-font'),
  ('deep2-twice-embalming-room',    'twice-dead',      'the-embalming-room'),
  ('deep2-twice-drain-run',         'twice-dead',      'the-drain-run'),
  ('deep2-verdigris-silt-bank',     'verdigris-thing', 'the-silt-bank'),
  ('deep2-verdigris-drag',          'verdigris-thing', 'the-drag'),
  ('deep2-verdigris-flood-mark',    'verdigris-thing', 'the-flood-mark'),
  ('deep2-verdigris-cable-walk',    'verdigris-thing', 'the-cable-walk'),
  ('deep2-crawler-cold-pantry',     'pale-crawler',    'the-cold-pantry'),
  ('deep2-crawler-wormcast-pit',    'pale-crawler',    'the-wormcast-pit'),
  ('deep2-crawler-silt-fall',       'pale-crawler',    'the-silt-fall'),
  ('deep2-cantor-choir-floor',      'marrow-cantor',   'the-choir-floor'),
  ('deep2-cantor-bone-organ',       'marrow-cantor',   'the-bone-organ');

-- What grows and lies about, from the deep's own forage list.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('pale-cap',    'the-flooded-cloister', 1),
  ('cave-nettle', 'the-silt-bank',        1),
  ('grave-moss',  'the-long-pews',        1),
  ('knucklebone', 'the-choir-floor',      1),
  ('offal',       'the-bone-sift',        1);
