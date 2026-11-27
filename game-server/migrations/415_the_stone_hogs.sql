-- 415 the stone-hogs (2026-11-26). The broods on the bottom floor had the mites to
-- eat and what died near them, and a mite barely feeds a thing the length of a big
-- dog. The stone-hog is the meal: a blind, hairless pig as big as a sheep, pale as
-- the flags, that roots along the joints of the dressed stone for the grey crust
-- growing there in the stone's light. It feeds itself (it grazes the stone ground,
-- OWN_FORAGE_GROUNDS), lives in herds of two to four (CAVE_GROUPS), runs from a
-- fight's noise and charges only when it is cornered.
--
-- 24hp 2-4: under the brood (40, 4-8), which takes it, over the grubbet (12), which
-- it is not. It leaves a haunch of pale pork, which smokes like any haunch.
--
-- Eight of it, in three herds on the floor's stone: the long flags, the pillar hall
-- and the east hall.

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, bleed, barter, traits) VALUES
  ('stone-hog-haunch', 'a stone-hog haunch', 'The hind leg of a stone-hog, skinned. The meat is pale all the way through, almost white, and cold to the touch long after the animal was. There is a great deal of it.', 'common', 1, 9, 1, 0, '', 0, 1, 1, 1, 0, 0, '');

INSERT OR REPLACE INTO mob_templates (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss, loot_item, loot_chance, armor, gear_item, gear_drop, stun, bleed) VALUES
  ('stone-hog', 'a stone-hog',
   'A blind, hairless pig as big as a sheep, pale as the flags it stands on, with a snout like a spade and small eyes sealed shut under skin. It works along the joints of the floor with its snout, grunting, scraping up the grey crust that grows there, and lifts its head at every sound.',
   2, 24, 2, 4, 600, 0, 'stone-hog-haunch', 0.6, 0, '', 0, 0, 0);

INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-stone-hog@the-long-flags#0', 'stone-hog', 'the-long-flags'),
  ('spawn-stone-hog@the-long-flags#1', 'stone-hog', 'the-long-flags'),
  ('spawn-stone-hog@the-long-flags#2', 'stone-hog', 'the-long-flags'),
  ('spawn-stone-hog@the-pillar-hall#0', 'stone-hog', 'the-pillar-hall'),
  ('spawn-stone-hog@the-pillar-hall#1', 'stone-hog', 'the-pillar-hall'),
  ('spawn-stone-hog@the-pillar-hall#2', 'stone-hog', 'the-pillar-hall'),
  ('spawn-stone-hog@the-east-hall#0', 'stone-hog', 'the-east-hall'),
  ('spawn-stone-hog@the-east-hall#1', 'stone-hog', 'the-east-hall');
