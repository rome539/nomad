-- THE COOK (rome, 2026-10-30). The fortress fed a garrison, and the kitchens
-- were written that way long before anyone worked them: pots floating in the
-- Drowned Scullery, a refectory laid for a meal that "was served" and never
-- eaten, hooks in the larder, troughs in the Drowned Kitchens that "something
-- has been keeping clear", and pantry bones "sorted by size". This is the
-- somebody. One of the dead at work, like the sapper and the bellfounder: he
-- does not come for you on sight, only for whoever gets in his way.
--
-- Two of him. The halls cook walks the kitchen line from the scullery to the
-- smokehouse and back (PATROLS_BY_HOME, zone-data.ts); the deep cook keeps the
-- Drowned Kitchens and the Cold Pantry (PATROLS). Both with ids (mig 309),
-- seeded on the next load.
--
-- He sits on the sapper's line of the ladder: a named worker, not a guard.
-- What he carries is the larder's own salt-fish, and the cleaver he works with
-- is the same rust-eaten one that lies in the cistern.

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES
  ('the-cook', 'the cook',
   'A dried man in what was an apron, the strings still knotted twice round a waist with nothing left in it, working at a meal for a garrison two hundred years in the ground. He scrubs out what is already clean, carries what is already cold, and lays out what nobody will eat, with a cleaver through his belt and no hurry in him at all. The garrison is late. He is not.',
   3, 34, 4, 7, 1200, 0, 'salt-fish', 0.4, 1, 'rust-eaten-cleaver', 0.12, 0, 0);

INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('the-cook', 'hand-rolled-smokes', 0.020);

INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('cook-halls', 'the-cook', 'scullery');
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('cook-deep', 'the-cook', 'the-drowned-kitchens');
