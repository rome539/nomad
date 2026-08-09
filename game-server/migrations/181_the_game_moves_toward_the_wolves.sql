-- THE GAME MOVES TOWARD THE WOLVES (rome, 2026-08-08: "lets move food towards
-- them").
--
-- THE BUG, and it is mine from mig 180. Measured across the whole wood: FIVE of
-- nineteen grey-wolf dens had no prey den within TERRITORY_RADIUS (3) — and
-- three of the five were the Wolf Earth I had just added.
--
--   the-pale-grass     0 deer  0 boar in range
--   the-stunted-oaks   0       0
--   the-wolf-earth x3  0       0
--
-- A wolf idles within three rooms of its den. With nothing to eat in that
-- circle it never feeds, so it sits permanently past STARVING_AT — which means
-- permanently hunting PLAYERS, at 1.6x after dark. I had built a den of three
-- wolves that could never eat anything except whoever walked in. That is a
-- coherent horror but it was an accident, not a decision.
--
-- I reasoned the sunken wood was right for a wolf den because it is COVER and
-- weather drives prey there. True, but shelter is where deer GO sometimes, not
-- where they live, and the ecology reads dens.
--
-- =========================================================================
-- MOVED, NOT ADDED. Every line below is a relocation: four deer dens and one
-- boar den change room and the caps do not move by one. The wood holds exactly
-- the 30 deer and 7 boar it held this morning — this is distribution, not
-- population, so nothing here touches the balance that was just measured.
--
-- The four deer dens chosen are the most OVER-served in the wood, counted by
-- how many wolf dens already reach them: the Fox Earths sits inside SIX wolf
-- territories, the Badger Ground, the Charcoal Hut and the Last Oaks inside
-- five each. Taking one deer from a circle of six wolves and giving it to a
-- circle of none is the whole of this migration.

-- ---- THE HEATH. One den does both wolves: the Flint Scatter is ONE room from
-- the Pale Grass AND one from the Stunted Oaks. The Heath Edge backs it up.
UPDATE mob_spawns SET room_id = 'the-flint-scatter'
  WHERE template_id = 'roe-deer' AND room_id = 'the-fox-earths';
UPDATE mob_spawns SET room_id = 'the-heath-edge'
  WHERE template_id = 'roe-deer' AND room_id = 'the-badger-ground';

-- ---- THE WOLF EARTH. Its only FREE neighbours are three rooms out, at the
-- very edge of the tether — but a room already holding a den can hold another,
-- and the two nearest both hold nothing but a root-thing, which is rooted,
-- hidden, and no competition for grazing. The Under-Eaves is one room from the
-- earth's mouth and the Fern Pit is two. Deer in the sunken wood is also just
-- TRUE: it is closed canopy, it is where the weather drives them, and it was
-- strange that the quarter had no game living in it at all.
UPDATE mob_spawns SET room_id = 'the-under-eaves'
  WHERE template_id = 'roe-deer' AND room_id = 'the-charcoal-hut';
-- NOT the Last Oaks, though it looked equally over-served on the count: it is
-- the ONLY prey den within reach of the Ant Hills wolf, and taking it simply
-- moved the starvation somewhere else (measured — the fix created a new empty
-- den before this line was changed). The South Ride is reached by five wolf
-- dens and is nobody's last meal.
UPDATE mob_spawns SET room_id = 'the-fern-pit'
  WHERE template_id = 'roe-deer' AND room_id = 'the-south-ride';

-- ---- AND THE BOAR GROUND HAS NO BOAR. It is three rooms from the Stunted Oaks
-- and it is called The Boar Ground. The Badger Ground keeps four wolf dens in
-- reach of it without this one, so the boar loses nothing by moving.
UPDATE mob_spawns SET room_id = 'the-boar-ground'
  WHERE template_id = 'wild-boar' AND room_id = 'the-badger-ground';
