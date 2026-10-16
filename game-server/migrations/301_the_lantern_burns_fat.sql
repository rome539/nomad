-- 301: THE LANTERN BURNS FAT (rome, 2026-10-16).
--
-- The hooded lantern was its own fuel: its condition was the oil, five burns,
-- and the fifth took it apart. Now it has a well that holds three lumps of fat,
-- burns it down only while lit, and keeps what it had not burned when it is
-- shuttered. Lighting it wears the tin and the pane; worn to nothing it will
-- not light until the bench mends it with forge iron, and it is never gone.
--
-- `fuel` is how much is in a lantern's well, in milliseconds of burning (one
-- lump is 1800000). Every other row leaves it at 0.
ALTER TABLE player_items ADD COLUMN fuel INTEGER NOT NULL DEFAULT 0;

-- The fuel. The pale crawler, the seals and the boars give it up (zone-data
-- FAT_DROPS), on top of what they already drop.
INSERT OR IGNORE INTO item_templates (id, name, description, rarity, barter) VALUES
  ('fat', 'a lump of fat',
   'Greasy, pale, and cut loose from something that will not be needing it. It smells of what it came off. In the bottom of a lantern''s well it burns low and steady for the best part of half an hour.',
   'common', 0);

UPDATE item_templates SET description =
  'A dented tin lantern with a horn pane, a sliding shutter, and a well in its base for fat. The flame inside sits low and patient — it frightens nothing, and it burns for as long as you can feed it.'
  WHERE id = 'hooded-lantern';

-- The lanterns already out there: what was left of their oil goes into the
-- well (a fifth of a full one was one burn, up to a full well of three), and
-- the tin starts sound, because its old condition was the oil.
UPDATE player_items
  SET fuel = MIN(5400000, (condition / 20) * 1800000), condition = 100
  WHERE item_id = 'hooded-lantern';
