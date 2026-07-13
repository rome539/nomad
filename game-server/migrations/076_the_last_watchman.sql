-- The last watchman (rome, 2026-07-13): the tower gets its resident. The
-- overworks — wall-walk, turret, spire, scaffold, the weeper's crown — held
-- nothing but wind and two scared rats. Now the watch is still up there.
-- One sentry, dried to leather inside his kit, walking the high circuit at
-- a sentry's pace four hundred years after the last relief failed to come.
--
-- He completes the guard-kit fiction: the guardroom pegs below hold the
-- kettle-helm and the watch-mantle — but NO BOOTS, because the boots stayed
-- with the man. The watchman's boots exist nowhere else in the world: you
-- take them off him or you don't get them. He also carries spare kit
-- (mob_keys) and a watchman's ration; HOLLOW + GRAVE_FLESH in code, so every
-- weapon works on him but nothing bleeds, he never flees, and — being hollow
-- — he breathes the names of the fallen off old bloodstains (deadRemembers).
-- His patrol is wired in zone-data PATROLS: an out-and-back that never
-- leaves the walls. The bell-cote hangs ABOVE his route — the one perch the
-- watch never checks.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('watchmans-boots', 'a pair of watchman''s boots',
   'Tall watch-boots, hobnailed and iron-strapped, resoled a hundred times against the wall-walk''s stones. The guardroom pegs kept the helm and the mantle. The boots stayed with the man.',
   'uncommon', 0, 0, 0, 0, 'feet', 2, 1, 1, 1, 0, 0, 0, 0, 0);

INSERT OR REPLACE INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed)
VALUES
  ('last-watchman', 'the last watchman',
   'A watchman still at his post, dried to leather inside his kit. The helm looks down a road no one travels; the mantle has gone the grey of the wall it walks; the boots have been resoled with whatever the scaffold gave up. Somewhere under all of it is a man who was never relieved.',
   3, 36, 3, 6, 120, 0, 'war-medal', 0.5, 2, 'watchmans-boots', 0.35, 0, 0);

INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('watchman-1', 'last-watchman', 'the-watch-turret');

-- His pockets: spare kit off the man himself, the ration he never ate, and
-- a watchman's smoke.
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('last-watchman', 'watchmans-kettle-helm', 0.15),
  ('last-watchman', 'wardens-watch-mantle',  0.15),
  ('last-watchman', 'hardtack',              0.30),
  ('last-watchman', 'dry-cigarettes',        0.04);
