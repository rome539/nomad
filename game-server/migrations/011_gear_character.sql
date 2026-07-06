-- Gear gets character: three properties that make weapons and armor play
-- differently, not just bigger.
--   speed  — swings per round (fast steel strikes twice, lighter each)
--   sweep  — foes caught per swing (a cleaver drags through a crowd)
--   weight — armor's mobility cost: weight 0 keeps you quick (foes miss more,
--            you flee clean); heavier turns more but slows the escape
ALTER TABLE item_templates ADD COLUMN speed  INTEGER NOT NULL DEFAULT 1;
ALTER TABLE item_templates ADD COLUMN sweep  INTEGER NOT NULL DEFAULT 1;
ALTER TABLE item_templates ADD COLUMN weight INTEGER NOT NULL DEFAULT 0;

-- The mail turns more than the jerkin, and you feel every ring of it.
UPDATE item_templates SET weight = 1 WHERE id = 'mail-hauberk';

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight) VALUES
-- The people's weapon: anyone can stoop, pick one up, and the dungeon is
-- officially killable. Even the King, if the stone is lucky.
('loose-rock', 'a loose rock',
 'Wet stone, honest weight. The dungeon is made of these; it will not miss one.', 'common', 0, 0, 0, 1, 'weapon', 0, 1, 1, 0),
('bone-shiv', 'a bone shiv',
 'A sleeper''s shin split to a point. Almost nothing in the hand — but it asks twice while a sword asks once.', 'uncommon', 0, 0, 0, 1, 'weapon', 0, 2, 1, 0),
('rust-eaten-cleaver', 'a rust-eaten cleaver',
 'More rust than edge and broad as a shield. One heave drags it through everything in front of you.', 'uncommon', 0, 0, 0, 2, 'weapon', 0, 1, 3, 0);

-- Rubble is endless (the rocks regrow); the named steel is not.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('loose-rock', 'gate', 1),
('loose-rock', 'stair', 1),
('bone-shiv', 'shrine', 0),
('rust-eaten-cleaver', 'cistern', 0);
