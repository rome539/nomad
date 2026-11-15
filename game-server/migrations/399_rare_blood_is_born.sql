-- RARE BLOOD IS BORN, NOT PLACED (rome, 2026-11-14). The dire hyena and the scary rat
-- are the grave hyena's and the rat's rare blood (mob_variants, mig 025): each turns up
-- only when one is born to its line. But the open ground had a dire hyena row of its
-- own on the Hanging Hill (mig 058), and ten scary rat rows stood on the open ground
-- and in the keep (058, 194, 356), so they were always there and always came back.
-- The dire hyena's row goes. The scary rats' rows stay as scabby rat rows, so the
-- rats keep their numbers and a scary one is born among them now and then; their ids
-- stay, as spawn ids must. A dire hyena born to the grave hyenas still lives as the
-- loner it is.
DELETE FROM mob_spawns WHERE id = 'dire-hyena-g1';
UPDATE mob_spawns SET template_id = 'rat' WHERE template_id = 'fleet-rat';
