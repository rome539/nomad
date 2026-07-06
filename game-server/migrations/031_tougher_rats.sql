-- Rats were too soft — with the new 60-HP wanderers they barely registered.
-- The scabby rat gets a little more meat and a little more bite; a nest of
-- brood-rats should be a real problem, not a nuisance. Still level-1 fodder,
-- just fodder that can draw blood in numbers.

UPDATE mob_templates SET max_hp = 11, dmg_min = 2, dmg_max = 3 WHERE id = 'rat';
UPDATE mob_templates SET max_hp =  8, dmg_min = 1, dmg_max = 2 WHERE id = 'fleet-rat';
UPDATE mob_templates SET max_hp = 24, dmg_min = 2, dmg_max = 4 WHERE id = 'brood-rat';
