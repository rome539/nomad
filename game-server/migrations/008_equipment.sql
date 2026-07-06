-- Equipment: a carried thing you can put ON. Two slots — weapon and armor —
-- so gear is a real offense/defense choice, not an invisible auto-pick. A
-- weapon adds its bite (already true); armor now subtracts from every hit that
-- lands (floored at 1 in the engine, so it's a wall you thin, never a wall you
-- close). `slot` is '' for anything you merely carry; a charm slot can be added
-- later by widening this column, no rebuild.
ALTER TABLE item_templates ADD COLUMN slot  TEXT    NOT NULL DEFAULT '';
ALTER TABLE item_templates ADD COLUMN armor INTEGER NOT NULL DEFAULT 0;
-- Which pack instance a player is wearing/wielding (per-instance, like sealing).
ALTER TABLE player_items ADD COLUMN equipped INTEGER NOT NULL DEFAULT 0;

-- Every weapon is a weapon-slot item. (rusted-sword, graveblade, and anything
-- deeper that carries a dmg.)
UPDATE item_templates SET slot = 'weapon' WHERE dmg > 0;

-- Armor for the Door. The west wing becomes a real kit run: the armory holds
-- a light starter piece beside the rusted sword; the barracks holds the heavier
-- shirt beside the graveblade, behind the skeleton and the warden.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor) VALUES
('padded-jerkin', 'a padded jerkin',
 'Boiled leather and old padding, cut for someone broader. It will turn a glancing blow, and little more.', 'common', 0, 0, 0, 0, 'armor', 1),
('mail-hauberk', 'a mail hauberk',
 'A shirt of iron rings, heavy and cold, pulled off a shelf-grave. It has kept worse than you alive for a while.', 'uncommon', 0, 0, 0, 0, 'armor', 2);

INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('padded-jerkin', 'armory', 0),
('mail-hauberk', 'barracks', 0);
