-- 117 the warden walks out (rome, 2026-07-24): rome wanted ONE warden
-- patrolling the surface, distinct from the interior circuit the other 4
-- share (PATROLS is keyed by template, so all instances of 'warden' walk
-- the same route -- a separate template is the only way to give one of
-- them a different beat). Clones 'warden' stat-for-stat (same hp/dmg/loot/
-- gear/keys) under 'warden-surface', then repoints one spawn (ward-4,
-- muster) at it. The grounds-loop route itself lives in code
-- (PATROLS["warden-surface"], zone-data.ts).

INSERT INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
SELECT 'warden-surface', name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun
FROM mob_templates WHERE id = 'warden';

INSERT INTO mob_keys (template_id, key_item, drop_chance)
SELECT 'warden-surface', key_item, drop_chance FROM mob_keys WHERE template_id = 'warden';

UPDATE mob_spawns SET template_id = 'warden-surface' WHERE id = 'ward-4';
