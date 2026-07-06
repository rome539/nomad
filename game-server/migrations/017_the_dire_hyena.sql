-- The grave-hyena's mean cousin. Same scavenging instinct, but it GUARDS what
-- it eats: walk into a room where it's on a corpse (or where it's already eaten
-- itself gorged and bold) and it turns on you unprovoked — no grudge needed
-- (see AGGRO_SCAVENGERS in zone.ts). Bigger, harder-hitting, longer-grudged.
-- Disturb its dinner and you're the next course.

INSERT OR REPLACE INTO mob_templates
(id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop) VALUES
('dire-hyena', 'a dire hyena',
 'Bigger than its kin and worse-tempered, scarred across a blunt heavy skull. It does not share, and it does not startle. Where it feeds becomes its ground, and it will make ground of anything that comes near while it does.',
 4, 45, 5, 8, 75, 0, 'bone-charm', 0.3, 1, NULL, 0);

-- Dens in the rooms that stink of meat: the refectory set for a meal it never
-- had, and the ossuary's wall of the dead. (Never a gate — the threshold rule.)
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
('dire-1', 'dire-hyena', 'refectory'),
('dire-2', 'dire-hyena', 'ossuary');
