-- 302: THE STAGS OF THE WOOD (rome, 2026-10-16).
--
-- The wood's rut has stags roaring and holding their ground through it, and
-- there were none: thirty roe and not one stag, and a roe buck does not roar.
-- The red stag is the mountain's, and rare there - a twelfth of the hinds grow
-- into one (mig 227/247) - so the wood gets its own: the same animal by every
-- number and by its picture and its voice, with its own words, standing in the
-- open rides and glades where a stag actually stands.
INSERT OR IGNORE INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
SELECT 'wood-stag', 'a wood stag',
  'He stands at the edge of the ride with the trees behind him, antlers wider than the gap he came out of and a neck gone thick and maned with the season. The roe go round him. He has heard you coming for a long while, and he has not moved, because none of this is his to give up.',
  level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed
FROM mob_templates WHERE id = 'red-stag';

-- The haunch comes off him as it comes off the mountain's (mig 267).
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('wood-stag', 'deer-haunch', 0.50);

-- Four, one to a stretch of open ground, spread across the wood.
INSERT OR IGNORE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-wstag-1', 'wood-stag', 'the-long-glade'),
  ('spawn-wstag-2', 'wood-stag', 'the-north-ride'),
  ('spawn-wstag-3', 'wood-stag', 'the-west-ride'),
  ('spawn-wstag-4', 'wood-stag', 'the-first-clearing');
