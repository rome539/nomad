-- 307 what the vice gives back (rome, 2026-10-19).
--
-- The bench vice broke every piece of gear down into scrap iron, whatever it
-- was made of, and every mend was paid in scrap. A wolfskin cloak came apart
-- into nails and a coral crown was patched with them. The vice now gives back
-- what a thing is made of, and a mend spends the same stuff (salvageYield /
-- repairCost in zone-data.ts, keyed on materialOf):
--
--     steel -> scrap iron (as before)      cloth -> linen strips (already here)
--     hide  -> leather offcuts (new)       bone  -> bone offcuts (new)
--     wood  -> split wood (new)            stone -> nothing
--
-- Pieces of another stuff with real iron in them (IRON_FITTINGS: nails,
-- rivets, strapping, a shod foot) give a handful of scrap on top, and want one
-- on top to mend.
--
-- These three are the new stuff. Common, stackable (not gear), weightless like
-- scrap, and worth a little at the hatch like scrap.

INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('leather-offcuts', 'a handful of leather offcuts', 'Strips and patches of tanned hide, cut out of something that will not be worn again. Too small for anything on their own; the bench stitches them into something that will.', 'common'),
('bone-offcuts', 'a handful of bone and horn', 'Split horn, cracked tusk, flakes of shell and plate. Hard, light, and no use to anyone until the bench sets them into something else.', 'common'),
('split-wood', 'a bundle of split wood', 'Staves, slats and the good length of a broken haft, split clean along the grain. The bench pins it into whatever has worn through.', 'common');

UPDATE item_templates SET barter = 1 WHERE id IN ('leather-offcuts', 'bone-offcuts', 'split-wood');
