-- THE RAT KING (rome, 2026-10-24). The first boss any wanderer meets: one
-- enormous old rat walking its rounds through the warrens. It has no spawn row.
-- It comes by a roll, about once a day while there is none, never more than one
-- (ratking.ts), and while it lives the warren rats are its. Level 3, armour 2,
-- and the great crab's 85 hp (rome).
--
-- Its crown carries a trait found on nothing else in the world: no rat comes
-- for the one who wears it. One kill in three gives it up.

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('rat-kings-crown', 'the rat king''s crown',
   'A crown nobody made: wire, bone and gnawed leather grown into a ring by years of being worn on one head, with a rat''s skull riding the front of it where a jewel would go. It is filthy and it does not come clean. Put it on and the rats in the walls go quiet, the way they went quiet for the one who wore it before you.',
   'rare', 0, 0, 0, 0, 'helm', 1, 1, 1, 1, 0, 0, 0, 9, 0, 'rat-crowned');

INSERT INTO mob_templates
  (id, name, description, level, max_hp, dmg_min, dmg_max, respawn_secs, is_boss,
   loot_item, loot_chance, armor, gear_item, gear_drop, bleed, stun)
VALUES (
  'rat-king',
  'the rat king',
  'A rat the size of a hound, and old: the fur gone grey and patchy over a body gone to fat and scar, one eye milked over white, the tail as thick as a wrist and dragging. Something is wound about its head, wire and bone and gnawed leather, sitting where a crown would sit. It does not hurry. Wherever it goes in the warrens the small rats go with it, a moving carpet around its feet, and it walks through the dark as if all of it were its own.',
  3, 85, 3, 6, 0, 1,
  'rat-kings-crown', 0.34,
  2,
  NULL, 0,
  1, 0
);
