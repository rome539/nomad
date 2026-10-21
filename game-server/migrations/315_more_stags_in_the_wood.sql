-- 315: MORE STAGS IN THE WOOD (rome, 2026-10-20). Four was too few for a wood
-- with thirty roe and nineteen wolves: the rut barely had two stags to roar at
-- each other, and three wolves to a stag left the packs almost nothing of him.
-- Ten puts about one red deer to three roe, and one stag to every thirty-odd
-- rooms. The six new ones stand on open ground the first four left bare - the
-- east, the middle, the south and the far west - none beside an existing one.
-- Ids on every row, so no live creature's spawn id shifts (see mig 309).
INSERT OR IGNORE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-wstag-5',  'wood-stag', 'the-north-ride'),
  ('spawn-wstag-6',  'wood-stag', 'the-flood-meadow'),
  ('spawn-wstag-7',  'wood-stag', 'the-deer-lawn'),
  ('spawn-wstag-8',  'wood-stag', 'the-moon-glade'),
  ('spawn-wstag-9',  'wood-stag', 'the-hazel-ride'),
  ('spawn-wstag-10', 'wood-stag', 'the-dry-heath');
