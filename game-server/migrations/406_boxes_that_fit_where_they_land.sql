-- BOXES THAT FIT WHERE THEY LAND (2026-11-19). Every box but the door prizes moves
-- to a random room of its country at each refill, and most were written for the
-- room they started in: "a box under the floor" turned up in an open field. Those
-- that are part of their place now stay in it (STAYS_HOME_BOXES, zone-data.ts).
-- These roam, so their words fit any room: the eight whose home is a hideaway or
-- a gate (a box kept there would put its loot out of danger) get a loose box's
-- name and description, and the loose chests lose the one spot each was set in.

-- homes that are hideaways or gates: a loose box, named and told as one
UPDATE caches SET name = 'an iron strongbox', description = 'A banded iron strongbox, its lock crusted but sound. Something shifts inside when you breathe near it.' WHERE id = 'box-bone';
UPDATE caches SET name = 'a mortar-crusted box', description = 'A small box crusted all over with old mortar, as if it was bricked into a wall once and prised out again, and shut again after. A keyhole gleams in the dark.' WHERE id = 'box-crack';
UPDATE caches SET name = 'the burner''s kist', description = 'A low kist of scorched boards, the lid weighted with a stone. A charcoal burner lives out in the wood for weeks at a stretch and keeps his good things in it, and it smells of the smoke all the same.' WHERE id = 'box-burner';
UPDATE caches SET name = 'a meal-chest', description = 'A great four-square chest, lidded, lined with tin against the rats, still dry inside from the smell of it. The lock is a mill lock: heavy, because what a mill holds is other people''s grain and a miller who loses it does not stay a miller.' WHERE id = 'box-mill';
UPDATE caches SET name = 'a flat tin box', description = 'A flat tin box with a wire closure, painted once. Everybody who used it knew it and everybody put something back. The last person to open it did not.' WHERE id = 'box-shelter';
UPDATE caches SET name = 'a dark-wood kist', description = 'A low box of dark wood with a hasp on it, made somewhere else and carried up. Whoever carried it this far meant what was in it to matter.' WHERE id = 'shieling-kist';
UPDATE caches SET name = 'an iron-banded locker', description = 'A long box banded in iron, the banding gone to rust everywhere the wet got and bright everywhere it did not. It has been opened a great many times by somebody who knew exactly how far to lift the lid.' WHERE id = 'slabs-locker';
UPDATE caches SET name = 'a turf-coloured strongbox', description = 'A squat iron box, the lid gone the same colour as the turf it lay under for years. You would walk past it. Somebody did not want it found by anybody who was not looking.' WHERE id = 'stell-strongbox';

-- loose chests: the spot each was set in comes out
UPDATE caches SET description = 'A boat-builder''s locker, the lid tarred over so many times it has gone soft. The hasp is iron and the iron is the only part of it the salt has not beaten.' WHERE id = 'box-noust';
UPDATE caches SET description = 'An oak box banded in iron, never hidden, because nobody was going to open it. The lid carries the same mark the marking iron cuts, struck into the wood so hard it split the grain: this is the estate''s, and the estate said so once and never had to again.' WHERE id = 'box-bounds';
UPDATE caches SET description = 'A long low chest made to hold the tools of a trade, and made by somebody who had them. The joinery is better than anything round it.' WHERE id = 'box-farnoust';
UPDATE caches SET description = 'A plain chest with a plain lock, kept dry, holding whatever a man kept when he kept this ground.' WHERE id = 'box-lodge';
UPDATE caches SET description = 'A chest banded and locked, the lid pale where a hundred years of weather came through a broken roof and rotted the room it stood in.' WHERE id = 'box-solar';
UPDATE caches SET description = 'A chest grown a white crust an inch thick along every seam. Whatever is inside has been packed in salt for two hundred years, which is either the best or the worst thing that could have happened to it.' WHERE id = 'box-pans';
UPDATE caches SET description = 'A long box, banded, with a hasp and a small good lock: the sort of thing a man leaves a summer''s supplies in when he is going down the hill for a fortnight and means to come back up. Nobody came back up.' WHERE id = 'box-bothy';
UPDATE caches SET description = 'A strongbox the roots swallowed once, half-crushed and still shut. The wood grew around the lock as if it meant to keep it.' WHERE id = 'box-deep';
UPDATE caches SET description = 'A black iron coffer beaded with cold and older than the flood above it. What settled into it over the long ages is the best of everything that ever fell, and the deep has never once let it go easily.' WHERE id = 'box-abyss';
