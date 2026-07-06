-- Fishing. The Pocket of Air is a dry shelf above the flood — the one place
-- the water can't follow you. Now you can drop a line off it into the black
-- water below and, rarely, haul something up worth eating. The catch is scarce
-- (see FISH_ODDS in zone.ts); the fish themselves are good, fresh food.
--
-- Pure data but for the fishing verb: these are ordinary edibles the catch
-- roll grants. The keeper will take a fish off your hands, too, for a pittance.

INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, lure, barter) VALUES
('cave-fish',
 'a blind cave-fish',
 'A pale, eyeless fish the length of your hand, hauled dripping from the flooded dark. It never needed eyes down here. Cold and bland — and better than most of what passes for food this deep.',
 'common', 1, 11, 1, 1),
('pale-eel',
 'a pale eel',
 'A long eel the colour of a drowned man, thick as your wrist and still coiling when it clears the water. It fights the line, and it is a real meal — if you can put out of mind what it has surely been eating.',
 'uncommon', 1, 16, 1, 2);
