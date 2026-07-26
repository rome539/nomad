-- 119 the salt racks (rome, 2026-07-26): fish were the one food you couldn't
-- cook -- CURE_RECIPES covered three meats and nothing else, so every catch
-- was raw-eat-only and spoiled. salt-fish already existed as the obvious
-- preserved-fish form (FOOD_KEEPS, non-spoiling) but nothing in the game ever
-- made it: keeper-sold DEAD_STOCK only, a recipe output with no recipe.
--
-- cave-fish (common, heal 11) now cures to it (CURE_RECIPES, zone-data.ts).
-- pale-eel (16) and marrow-lamprey (20) stay raw-only on purpose -- the
-- delicacies are strong BECAUSE they spoil; preserving them would flatten
-- that trade entirely.
--
-- salt-fish heal 6 -> 14. Every other cure is an upgrade over its raw form
-- (rat-meat 5->8, hyena-haunch 9->12, pale-flesh 8->12); at 6 it was a
-- DOWNGRADE from the 11-heal fish going in, so nobody would ever have used
-- the recipe.
UPDATE item_templates SET heal = 14 WHERE id = 'salt-fish';

-- ...and the keeper's price follows, or he'd be selling the best food in the
-- shop for the least: at heal 14 / cost 3 it beat smoked-haunch (12 for 5) on
-- both axes at once. 6 puts it just above the haunch, in line with healing
-- just above it -- the same ladder, not a hole in it.
UPDATE fence_stock SET cost = 6 WHERE item_id = 'salt-fish';
