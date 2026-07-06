-- The other side of the blade: creatures live under the same gear physics as
-- players. Their armor is real (it eats your damage the way yours eats theirs),
-- and what a creature visibly carries, it drops when it falls — you loot what
-- it held, not what a table imagined.
--   armor     — flat damage the creature's hide/plate turns per hit
--   gear_item — the thing it wields/wears, pried loose on death…
--   gear_drop — …this often (otherwise it's ruined in the fall). Dropped gear
--               arrives WORN (low condition) — it kept a post for a century.
ALTER TABLE mob_templates ADD COLUMN armor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mob_templates ADD COLUMN gear_item TEXT;
ALTER TABLE mob_templates ADD COLUMN gear_drop REAL NOT NULL DEFAULT 0;

-- The descriptions have promised this for a while. Now the sim delivers:
-- "The sword is still sharp." — the skeleton actually swings one, and drops it.
UPDATE mob_templates SET gear_item = 'rusted-sword', gear_drop = 0.35 WHERE id = 'skeleton';
-- "Armor with an absence inside" — the warden IS plate, and plate turns blades.
UPDATE mob_templates SET armor = 3, gear_item = 'warden-plate', gear_drop = 0.25 WHERE id = 'warden';
-- A crown and a patience: what the dark does not turn, the regalia does.
UPDATE mob_templates SET armor = 2 WHERE id = 'forgotten-king';

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight) VALUES
('warden-plate', 'warden''s plate',
 'Grey plate with an absence where a man should be. It turned blows for a hundred years; whether it keeps doing so for you is not its concern.', 'rare', 0, 0, 0, 0, 'armor', 3, 1, 1, 1);
