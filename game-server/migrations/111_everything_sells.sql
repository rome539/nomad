-- 111 everything sells (rome, 2026-07-23): 106 only touched the 18 gear
-- items that already happened to have a nonzero barter -- it never gave
-- the REST of the game's gear any sell value at all. Coverage before this:
-- common 0/17, uncommon 5/32, rare 1/25, epic 3/27, legendary 9/9. The
-- "sell your surplus to afford the fence" loop 106/107 built only worked
-- for a handful of named drops -- everything else, including all of
-- common, was dead weight with nowhere to go. Every gear item with
-- barter=0 now gets its tier's rate (matching 106's own scale); common
-- never had a rate at all, so it gets a real baseline of 2.

UPDATE item_templates SET barter = 2  WHERE slot != '' AND rarity = 'common'    AND barter = 0;
UPDATE item_templates SET barter = 6  WHERE slot != '' AND rarity = 'uncommon'  AND barter = 0;
UPDATE item_templates SET barter = 9  WHERE slot != '' AND rarity = 'rare'      AND barter = 0;
UPDATE item_templates SET barter = 19 WHERE slot != '' AND rarity = 'epic'      AND barter = 0;
