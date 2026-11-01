-- CARVING (rome, 2026-11-01). A loose rock, worked with the right tool, comes out
-- as a small stone carving: a random one, with no worth to anybody, made to be
-- set down somewhere in the world. How finely it is cut is the tool's rarity.
-- Set down, it stays where it was put; in your own den it lasts, and anywhere
-- else it weathers away. The carving's own record is this table, keyed by the
-- id its pack row carries in lore_id, so the cut and the carver's name go with
-- it through the pack, the floor, a trade and a death.
CREATE TABLE IF NOT EXISTS carvings (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,                 -- hare, crow, ... (zone-data CARVINGS)
  quality    INTEGER NOT NULL,              -- 0 crude .. 4 masterful (CARVE_QUALITY)
  carver     TEXT NOT NULL,                 -- the name cut into the base
  carver_pk  TEXT NOT NULL,
  carved_at  INTEGER NOT NULL,
  room_id    TEXT NOT NULL DEFAULT '',      -- '' while it is carried
  inside     TEXT NOT NULL DEFAULT '',      -- the holder of the den it stands inside, '' out on the ground
  lasting    INTEGER NOT NULL DEFAULT 0,    -- 1: set down inside its carver's own den, and never weathers
  placed_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_carvings_room ON carvings (room_id);

-- THE CHISELS. Tools, not weapons: carried, they let you carve; held, they do
-- nothing a fist would not. The rarity is the cut.
INSERT INTO item_templates (id, name, description, rarity, weight, barter) VALUES
  ('rusted-chisel', 'a rusted chisel', 'A mason''s chisel gone brown right down to the edge. It still takes stone off, a little at a time, and no two strokes come out alike.', 'common', 0, 2),
  ('masons-chisel', 'a mason''s chisel', 'Plain iron, the striking end spread flat from years under the mallet. Somebody kept it sharp right up until they stopped.', 'uncommon', 0, 4),
  ('lettering-chisel', 'a lettering chisel', 'Narrow and true, the edge blued from the forge. Made for cutting letters, not for dressing walls, and it goes where you put it.', 'rare', 0, 7),
  ('keep-masons-chisel', 'the keep-mason''s chisel', 'The grip is wrapped in leather gone hard as horn and worn to the shape of one hand. The edge still sits dead square after all this time.', 'epic', 0, 11),
  ('the-unnamer', 'the Unnamer', 'A short chisel, very old, with an edge the exact width of the cuts on the chapter house''s blank name-stones. Whatever it was made for, the last work it did was taking names off.', 'legendary', 0, 16);

-- THE CARVINGS. Worth nothing (barter 0): the keeper will not have them.
INSERT INTO item_templates (id, name, description, rarity, weight, barter) VALUES
  ('carving-hare',   'a stone hare',   'A hare no bigger than your fist, cut out of a lump of rock, the ears laid back along the stone.', 'common', 1, 0),
  ('carving-crow',   'a stone crow',   'A crow cut out of a lump of rock, hunched, the beak turned down into its own breast.', 'common', 1, 0),
  ('carving-rat',    'a stone rat',    'A rat cut out of a lump of rock, low to the ground, the tail laid round its feet.', 'common', 1, 0),
  ('carving-deer',   'a stone deer',   'A deer cut out of a lump of rock, legs folded under it, the head up and listening.', 'common', 1, 0),
  ('carving-hyena',  'a stone hyena',  'A hyena cut out of a lump of rock, the shoulders high and the hindquarters low, the mouth a little open.', 'common', 1, 0),
  ('carving-goat',   'a stone goat',   'A goat cut out of a lump of rock, the horns swept back, standing square on a ledge of its own.', 'common', 1, 0),
  ('carving-owl',    'a stone owl',    'An owl cut out of a lump of rock, all round shoulders and two deep eyes.', 'common', 1, 0),
  ('carving-hound',  'a stone hound',  'A hound cut out of a lump of rock, lying with its head on its paws.', 'common', 1, 0),
  ('carving-hand',   'a stone hand',   'A hand cut out of a lump of rock, open, palm up, the fingers a little curled.', 'common', 1, 0),
  ('carving-face',   'a stone face',   'A face cut into a lump of rock, the eyes shut, the mouth a straight line.', 'common', 1, 0),
  ('carving-crown',  'a stone crown',  'A crown cut out of a lump of rock, a plain band with five points, small enough to sit on two fingers.', 'common', 1, 0),
  ('carving-figure', 'a stone figure', 'A little standing figure cut out of a lump of rock, arms at its sides, no face to speak of.', 'common', 1, 0),
  ('carving-tower',  'a stone tower',  'A tower cut out of a lump of rock, square, with a row of teeth along the top.', 'common', 1, 0),
  ('carving-drake',  'a stone drake',  'A drake cut out of a lump of rock, the wings folded down its back and the long neck turned to look behind it.', 'common', 1, 0);

-- WHERE THE CHISELS ARE FOUND: in the chests and boxes, at the chances gear of
-- the same rarity is found at. The rusted ones in the working folk's boxes; the
-- mason's where the garrison and the toll kept their tools; the lettering chisel
-- where things were written up; the keep-mason's in the armory's issue and the
-- bricked-up niche; and the Unnamer in the Forgotten King's own reliquary,
-- because the first name taken off down there was his.
INSERT INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-sutlers',     'rusted-chisel', 0.34),
  ('carts-strongbox', 'rusted-chisel', 0.34),
  ('box-ruin',        'rusted-chisel', 0.34),
  ('box-bothy',       'rusted-chisel', 0.3),
  ('reeves-floor',    'rusted-chisel', 0.3),
  ('box-burner',      'rusted-chisel', 0.3),
  ('box-armory',      'masons-chisel', 0.2),
  ('box-sutlers',     'masons-chisel', 0.18),
  ('box-toll',        'masons-chisel', 0.2),
  ('box-relay',       'masons-chisel', 0.2),
  ('box-chapel',      'lettering-chisel', 0.15),
  ('box-relic',       'lettering-chisel', 0.12),
  ('box-solar',       'lettering-chisel', 0.15),
  ('box-armory',      'keep-masons-chisel', 0.1),
  ('box-crack',       'keep-masons-chisel', 0.12),
  ('reliquary',       'the-unnamer', 0.04);
