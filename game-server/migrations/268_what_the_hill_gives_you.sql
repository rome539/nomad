-- 268 what the hill gives you (rome, 2026-08-22): consumables on the mountain.
--
-- THE HOLE. Dressings — the only thing that stops a wound — grow in exactly
-- three places in the world: the fortress, the dens and the open ground. Not one
-- on the road, in the wood, at the crossing OR on the mountain. And the mountain
-- carries the bleediest roster in the game (twenty-five bleeders, mig-tiered
-- this week), five tiers from the nearest gate. You could open a wound at the
-- cloud line with nothing on the whole hill to bind it.
--
-- Food was nearly as thin: two floor items over 398 rooms, and no forage.
--
-- WHERE THEY GO. All at the FOOT, and that is the design rather than a shortcut:
-- the mountain's own prose says nothing grows above the snow, so the hill's
-- larder is its bottom tier and everything above it is what you carried and what
-- you killed. Going up is the commitment; coming down is the resupply.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES

-- THE DRESSING. Sphagnum, which is what people packed wounds with for as long
-- as there have been wounds and bogs in the same country. Sits between the
-- linen strips (5) and the bloodwort (6): better than a torn shirt, short of a
-- proper herb, and it is lying in every wet hollow at the foot for nothing.
('bog-moss', 'a plug of bog-moss',
 'A double handful of the pale moss that grows where the ground stays wet, wrung out and pressed into a plug. It holds many times its own weight in water and it is faintly, usefully sour — packed into a wound it drinks the blood and keeps the rot off, and everyone who has ever lived near a bog has known this without being told.', 'common', 0, 0, 0, 0, '', 0, 1, 1, 0, 0.0, 0.0, 0, 1, 5, ''),

-- THE OTHER DRESSING, and the region's own: the flock is gone and its wool is
-- still on every wall it ever squeezed past. Weaker than the moss (3) because
-- it is grease and dirt, and it is EVERYWHERE the summer people were.
('hank-of-fleece', 'a hank of fleece',
 'Wool pulled off a wall where a sheep squeezed through, matted and full of grease and weathered grey on the outside. There is a great deal of it caught along every stone the flock ever passed. Wadded against a cut it holds, and the grease in it does not let go easily — which is the whole reason a shepherd never carried a bandage.', 'common', 0, 0, 0, 0, '', 0, 1, 1, 0, 0.0, 0.0, 0, 1, 3, ''),

-- THE FORAGE. Crowberries: black, watery and everywhere on high moor, and
-- nobody has ever been glad to eat them. Level with sloes, which is right.
('crowberries', 'a handful of crowberries',
 'Small black berries off a creeping heath that covers acres of the lower slope, picked in a handful along with a certain amount of leaf and grit. They are watery and faintly bitter and there is nothing to them at all, and in enough quantity they are still food. The birds strip whole hillsides of these.', 'common', 1, 3, 0, 0, '', 0, 1, 1, 0, 0.0, 0.0, 0, 0, 0, ''),

-- THE WATER. The hill's answer to the well: cold, clean, and it costs nothing
-- but the walk to where it comes out of the rock.
('melt-water', 'a draught of melt-water',
 'Water straight off the snowfield, taken where it runs clear of the ice — so cold it aches through your teeth and tastes of nothing whatsoever, which after a day of blood and old meat is its own kind of mercy.', 'common', 1, 4, 0, 0, '', 0, 1, 1, 0, 0.0, 0.0, 0, 0, 0, '');

-- ---- where they lie --------------------------------------------------------
-- All regrowing (regrows=1) — these are ground that GROWS things, and the
-- floor-renewal law (RNG, ~3h45m a spot) governs the rate.
--
--   bog-moss    the wet hollows at the foot: rushes, nettles, cotton grass
--   fleece      the fold walls and the grazing — where the flock rubbed past
--   crowberries the heath: the bracken slope and the pasture
--   melt-water  the spring, the tarn, the melt run — the same water the animals
--               walk to (WATER_ROOMS), which is the point: you drink where they do
INSERT OR REPLACE INTO ground_spawns (room_id, item_id, regrows) VALUES
  ('the-rush-hollow',   'bog-moss',    1),
  ('the-nettle-ground', 'bog-moss',    1),
  ('the-cotton-grass',  'bog-moss',    1),

  ('the-turf-wall',     'hank-of-fleece', 1),
  ('the-milking-fold',  'hank-of-fleece', 1),
  ('the-wether-ledge',  'hank-of-fleece', 1),
  ('the-high-fold',     'hank-of-fleece', 1),

  ('the-bracken-slope', 'crowberries', 1),
  ('the-last-pasture',  'crowberries', 1),
  ('the-goat-track',    'crowberries', 1),

  ('the-high-spring',   'melt-water',  1),
  ('the-melt-run',      'melt-water',  1),
  ('the-high-tarn',     'melt-water',  1);
