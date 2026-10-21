-- THE BEARSKIN MANTLE (2026-10-21). The bear pelt was barter and nothing else:
-- nothing at the forge took it. Now it makes a mantle, the way the white hide
-- makes its own: one pelt and the hide work (forgeCost turns the 3 into
-- leather). Rare, like the pelt. Both bears that drop it (the brown bear and
-- the baited bear) feed the same recipe.
--
-- Wardhide, because a bear's hide is the thickest thing in the wood and a cut
-- or a rake has to get through it first; fleeced, because the winter coat is
-- left on. Heavier than the other mantles: it is a whole bear.

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('bearskin-mantle', 'a bearskin mantle',
   'A brown bear''s hide cured with the winter coat left on, cut to hang from the shoulders to the backs of the knees and pinned at the throat with a bone. It is thick enough to turn a blade that is not trying very hard, and heavy enough that you feel every step of the day in it.',
   'rare', 0, 0, 0, 0, 'cloak', 2, 1, 1, 4, 0, 0, 0, 15, 0, 'wardhide,fleeced');

INSERT INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('bearskin-mantle', 3, 'bear-pelt', 1);
