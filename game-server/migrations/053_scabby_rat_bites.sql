-- The scabby rat can now open a wound — but only rarely. Its teeth are filthy,
-- not deep, so most bites are just blunt tooth-and-claw; the occasional unlucky
-- nick catches a vein. Bleed VALUE is 1 (the smallest wound, 1/tick), and the
-- CHANCE lives in code (zone-data.ts BLEED_ODDS = 0.20 for 'rat') — a
-- gate that only applies to listed weak biters, so the dedicated bleeders
-- (hyenas, albino rat, the pale kin) still wound on every hit. (rome, 2026-07-08.)
--
-- NOTE: mob_templates is World config, read at DO cold-start. Wants a REDEPLOY
-- (the code carries the 0.05 gate; the DB carries bleed=1). No reseed needed —
-- bleed is read from the template each hit, so it updates every rat at once.

UPDATE mob_templates SET bleed = 1 WHERE id = 'rat';
