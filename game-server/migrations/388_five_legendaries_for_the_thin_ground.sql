-- 388: FIVE LEGENDARIES FOR THE THIN GROUND (2026-11-10). Eleven of the world's
-- twenty-two legendaries were the fortress's. The mountain, the biggest ground,
-- had two, both off the drakes; the crossing had two weapons and nothing to
-- wear; feet and shield had two apiece in the whole world. Five more: a weapon,
-- a helm and boots for the mountain off the animals that would leave them, body
-- armour for the crossing off the great crab, and a shield for the road.

INSERT INTO item_templates (id, name, description, rarity, dmg, slot, armor, speed, sweep, weight, block, bleed, barter, traits) VALUES
  ('the-long-tooth', 'the Long Tooth', 'One upper tooth of the cave lion, as long as your hand and wrist together, set in a grip of its own jawbone. It is curved, and the inside of the curve was never blunt. The animal killed with two of these and no hurry, and one is enough.', 'legendary', 5, 'weapon', 0, 1, 1, 1, 0, 3, 30, 'wicked'),
  ('the-bearded-cowl', 'the Bearded Cowl', 'A deep cowl sewn from the bone-dropper''s own neck and shoulder, the black bristle of the beard left on under the chin. The bird lived above the snow line and was never cold and never heard. Up over your head, neither are you.', 'legendary', 0, 'helm', 2, 1, 1, 0, 0, 0, 30, 'fleeced,quiet,hooded'),
  ('the-snow-road', 'the Snow Road', 'The four feet of the old glutton, taken whole and made into one pair of boots, pads down and claws left in. They are broader than any boot ought to be, and that is why the animal walked on top of snow that a wolf goes through. The hide is as thick as the rest of it was, and nothing has yet got through it.', 'legendary', 0, 'feet', 2, 1, 1, 1, 0, 0, 30, 'fleeced,wardhide,strapped'),
  ('the-great-shell', 'the Great Shell', 'One plate of the great crab''s back, cut to sit on a man and still crusted white from the pool. It is as thick as a door, and the spines along its edge were never filed off. Water has been on it for longer than the causeway has stood and has never got in.', 'legendary', 0, 'armor', 7, 1, 1, 11, 0, 0, 30, 'watertight,spiked:2'),
  ('the-turnpike', 'the Turnpike', 'One leaf of the old toll gate, cut down to an arm''s width, the spikes along its top rail left on. It was made to stop a cart and to make climbing it a mistake. It still does both, and it swings back harder than it was pushed.', 'legendary', 0, 'shield', 0, 1, 1, 4, 0.28, 0, 30, 'riposte:2,thorns:2');

INSERT INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('cave-lion', 'the-long-tooth', 0.08),
  ('the-bone-dropper', 'the-bearded-cowl', 0.12),
  ('the-old-glutton', 'the-snow-road', 0.3),
  ('the-great-crab', 'the-great-shell', 0.06),
  ('the-toll-clerk', 'the-turnpike', 0.03);
INSERT INTO cache_loot (cache_id, item_id, chance) VALUES ('box-toll', 'the-turnpike', 0.04);
