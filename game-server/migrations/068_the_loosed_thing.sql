-- 068: the loosed thing. The Gaunt — the escaped-thing room event's wanderer
-- (events.ts spawns it; it never seeds as a standing spawn, so respawn_secs is
-- ceremony). Dangerous past a warden-captain, soloable by a geared hand; its
-- rake opens a wound. Always drops its pelt — the prize that makes hunting it
-- a choice instead of a dare.
INSERT OR REPLACE INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES
  ('the-gaunt', 'the Gaunt',
   'Tall past reason and starved down to cords, grey skin pulled paper-tight over too many joints. It came up from somewhere the light has never been, and it is hungry in a way nothing fed can ever be.',
   6, 72, 6, 10, 86400, 0, 'gaunt-pelt', 1.0, 2, NULL, 0, 0, 2);

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('gaunt-pelt', 'the Gaunt''s pelt',
   'A hide of grey, paper-thin skin that never takes warmth, stripped from something that should not have been walking. The keeper will want this badly, and will not say why.',
   'rare', 0, 0, 0, 0, '', 0, 1, 1, 2, 0, 0, 0, 20, 0);
