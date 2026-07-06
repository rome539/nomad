-- The simulation pivot: items get systemic properties, food enters the
-- world, and only the shrine regrows what is taken from it.

ALTER TABLE item_templates ADD COLUMN edible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE item_templates ADD COLUMN heal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE item_templates ADD COLUMN lure INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ground_spawns ADD COLUMN regrows INTEGER NOT NULL DEFAULT 0;

-- Food: heals the eater, and hungry creatures smell it lying on the ground.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure) VALUES
('dried-meat', 'a strip of dried meat',
 'Leathery and salted, from a barracks store that outlived the barracks. Still good. Things with noses think so too.', 'common', 1, 8, 1),
('rat-meat', 'a haunch of rat meat',
 'Fresh, at least. Meat is meat, down here — and the smell carries.', 'common', 1, 5, 1);

-- Rats are the dungeon's renewable food source now.
UPDATE mob_templates SET loot_item = 'rat-meat', loot_chance = 0.7 WHERE id = 'rat';

-- A finite larder: eaten meat is gone until a rat replaces it.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('dried-meat', 'barracks', 0),
('dried-meat', 'armory', 0);

-- "Things left here tend to still be here — the shrine keeps them."
-- The one place in the dungeon that regrows its gifts.
UPDATE ground_spawns SET regrows = 1 WHERE room_id = 'shrine';
