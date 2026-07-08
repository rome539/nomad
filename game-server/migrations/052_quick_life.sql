-- "Quick life": five humble, renewable props that make the world feel lived-in,
-- each riding a system that already works — so this is pure data, no code. Like
-- the rusted pick, none of these are gear or treasure, so scarcity is untouched;
-- they're tools and forage the rooms keep, tied to a mechanic:
--   cold water / pale lichen  -> edible+heal      (small forage, in the wet places)
--   linen strips              -> staunch          (a weak field dressing that clots bleed)
--   offal                     -> lure             (bait: scavengers smell it and come eat it)
--   knucklebone               -> noise-throw      (hurl it with no target -> clatter wakes LISTENERS)
-- All regrow on the randomized 5-25 min window, one instance per room.
-- (rome, 2026-07-08.)
--
-- NOTE: item_templates + ground_spawns are World config, read at DO cold-start.
-- Wants a REDEPLOY (loads the new items + spawn entries) + /admin/reseed (places
-- them on the floors) — a warm world won't re-seed on its own.

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal) VALUES
('well-water',  'a draught of cold water', 'Cold water, drawn up iron-tasting and clouded with grit. It will not fill you, but a few swallows steady the legs.', 'common', 1, 4),
('cave-lichen', 'a fistful of pale lichen', 'Bloodless lichen peeled off the wet stone. It tastes of nothing and sits in the belly like nothing — but it sits.', 'common', 1, 3);

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure) VALUES
('offal', 'a fistful of offal', 'Cold offal going ripe, left where something ate. You could keep it down if you had to. Something with a nose will want it more — and come looking.', 'common', 1, 2, 3);

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, staunch) VALUES
('linen-strips', 'a handful of linen strips', 'Torn strips of old linen, greyed but dry. Bound tight over a cut they will hold it closed — not well, but held.', 'common', 5);

-- Non-edible and hard: thrown with no target it clatters and carries (throwForNoise).
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('knucklebone', 'a knucklebone', 'A knuckle off some long-dead thing, worn smooth from handling. Hurled into the dark it cracks and skitters off the stone, and whatever is listening turns to look.', 'common');

-- ---- where they lie, and regrow (a tool/forage the room keeps) ----
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('well-water',   'well',              1),
('well-water',   'sunless-well',      1),
('cave-lichen',  'sewer',             1),
('cave-lichen',  'catacomb',          1),
('linen-strips', 'barracks',          1),
('linen-strips', 'cells',             1),
('offal',        'larder',            1),
('offal',        'smokehouse',        1),
('offal',        'carrion-gallery',   1),
('knucklebone',  'ossuary',           1),
('knucklebone',  'bone-processional', 1);
