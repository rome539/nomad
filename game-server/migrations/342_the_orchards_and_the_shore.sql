-- THE ORCHARDS AND THE SHORE (rome, 2026-10-28: add apples, and whatever else
-- the world should have to eat). An audit of every consumable found rooms that
-- describe food nobody could pick up: the Orchard Gone Wild says "somebody's
-- apples, still coming, for nobody" and grew only pears, and the Crossing has a
-- Mussel Bank, three Cockle grounds, the Limpet Rocks and six rooms of samphire
-- and gave up none of it. Each thing goes only where a room's own text already
-- says it is, and it regrows there like the rest of the world's forage.
--
-- Raw shellfish is poor eating and goes on the fire (COOK_RECIPES, +5 like the
-- rest of the shore's catch). The apples carry lure like the pears: a deer or a
-- boar crossing an orchard stops for them. Hazelnuts keep; the fruit spoils.
INSERT INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('windfall-apples', 'windfall apples',
   'Small hard apples off a tree nobody has pruned in a lifetime, sharp, and wormy here and there. They lie in the grass where they fell, and every animal on this ground knows it.',
   'common', 1, 5, 2, 0, '', 0, 0, 0, 0.3, 0, 0, 0, 0, 0, ''),
  ('baked-apples', 'baked apples',
   'Apples left in the embers until the skins split and the insides go soft and sweet. Nothing else out here tastes like a kitchen.',
   'common', 1, 10, 2, 0, '', 0, 0, 0, 0.3, 0, 0, 0, 0, 0, ''),
  ('mussels', 'a fistful of mussels',
   'Blue-black mussels pulled off the stone, beards and all. Raw they are cold and salt and a little like eating the sea.',
   'common', 1, 4, 1, 0, '', 0, 0, 0, 0.3, 0, 0, 0, 1, 0, ''),
  ('steamed-mussels', 'a fistful of steamed mussels',
   'Mussels opened over the fire in their own water. Throw away the ones that stayed shut.',
   'common', 1, 9, 1, 0, '', 0, 0, 0, 0.2, 0, 0, 0, 0, 0, ''),
  ('cockles', 'a handful of cockles',
   'Ridged pale cockles raked out of the sand. Gritty, whatever you do with them.',
   'common', 1, 3, 1, 0, '', 0, 0, 0, 0.3, 0, 0, 0, 1, 0, ''),
  ('boiled-cockles', 'a handful of boiled cockles',
   'Cockles boiled open, still gritty, but warm, and there are a lot of them.',
   'common', 1, 8, 1, 0, '', 0, 0, 0, 0.2, 0, 0, 0, 0, 0, ''),
  ('limpets', 'a few limpets',
   'Limpets knocked off the rock with a stone, which is the only way they come. Raw, they are like chewing a boot.',
   'common', 1, 2, 0, 0, '', 0, 0, 0, 0.2, 0, 0, 0, 0, 0, ''),
  ('roast-limpets', 'a few roasted limpets',
   'Limpets roasted on their backs in the fire until they come out of the shell. Still chewy. Better.',
   'common', 1, 7, 0, 0, '', 0, 0, 0, 0.1, 0, 0, 0, 0, 0, ''),
  ('samphire', 'a handful of samphire',
   'Bright green and fleshy, snapped off at the mud. Salt as the sea it stands in, and crisp.',
   'common', 1, 3, 0, 0, '', 0, 0, 0, 0.1, 0, 0, 0, 0, 0, ''),
  ('blackberries', 'a handful of blackberries',
   'Blackberries off the bramble, paid for with your hands. The ripe ones come away at a touch; the rest are not worth the scratches.',
   'common', 1, 3, 1, 0, '', 0, 0, 0, 0.1, 0, 0, 0, 0, 0, ''),
  ('hazelnuts', 'a handful of hazelnuts',
   'Hazelnuts out of the husk, brown and hard. Crack them with a stone. They keep, which is the whole point of a nut.',
   'common', 1, 3, 0, 0, '', 0, 0, 0, 0.1, 0, 0, 0, 0, 0, '');

INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  -- the orchards: the three that say their trees still fruit, and the one that names apples
  ('windfall-apples', 'the-orchard-gone-wild', 1),
  ('windfall-apples', 'the-croft-backs', 1),
  ('windfall-apples', 'the-dead-orchard', 1),
  ('windfall-apples', 'the-orchard-rows', 1),
  -- the shore
  ('mussels', 'the-mussel-bank', 1),
  ('mussels', 'the-mussel-scaup', 1),
  ('mussels', 'the-shell-bank', 1),
  ('mussels', 'the-under-weir', 1),
  ('cockles', 'the-cockle-beds', 1),
  ('cockles', 'the-cockle-scars', 1),
  ('cockles', 'the-cockle-strand', 1),
  ('cockles', 'the-shell-bank', 1),
  ('limpets', 'the-limpet-rocks', 1),
  ('limpets', 'the-shellfish-scars', 1),
  ('samphire', 'the-samphire-flat', 1),
  ('samphire', 'the-samphire-flats', 1),
  ('samphire', 'the-samphire-turn', 1),
  ('samphire', 'the-salt-causey', 1),
  ('samphire', 'the-mud-shore', 1),
  -- the bramble
  ('blackberries', 'the-bramble-margin', 1),
  ('blackberries', 'the-bramble-tunnel', 1),
  ('blackberries', 'the-windthrow', 1),
  ('blackberries', 'the-brash-heaps', 1),
  ('blackberries', 'the-scrub-end', 1),
  -- the living hazel (the cut hurdles and rods bear nothing)
  ('hazelnuts', 'the-old-coppice', 1),
  ('hazelnuts', 'the-bent-hazels', 1),
  ('hazelnuts', 'the-hazel-ride', 1),
  ('hazelnuts', 'the-coppice-stools', 1);
