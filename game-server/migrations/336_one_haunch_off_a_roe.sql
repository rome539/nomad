-- THE ROE GIVES ITS HIDE AND ITS MEAT, AND THE WHITE ROE ITS MEAT TOO
-- (rome, 2026-10-23).
--
-- Every other big grazer gives a trophy and, on a separate roll, its meat (mig
-- 267, through mob_keys). The roe deer had no trophy: its loot_item was the
-- haunch itself (since 134), so 267's meat row handed out a second haunch on
-- about one kill in three. The white roe was the reverse, a white hide and no
-- meat at all.
--
-- Now both are deer like the others. The roe's trophy is its own hide, smaller
-- than the hind's; its haunch rides the meat roll at the rate it always had. The
-- white roe keeps its hide and gives a haunch at the hind's rate.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
('roe-hide', 'a roe hide',
 'The skin off a roe deer, small enough to roll up under one arm. Summer-red on the back going to fawn underneath, the hair short and close, and thin everywhere; it would make a good pair of gloves and a poor coat.', 'common', 0, 0, 0, 0, '', 0, 1, 1, 1, 0.0, 0.0, 0, 4, 0, '');

UPDATE mob_templates SET loot_item = 'roe-hide', loot_chance = 0.5 WHERE id = 'roe-deer';
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('roe-deer',  'deer-haunch', 0.75),
  ('white-roe', 'deer-haunch', 0.50);
