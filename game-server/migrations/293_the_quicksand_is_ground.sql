-- 293: THE QUICKSAND IS GROUND, NOT A CREATURE (2026-09-30).
--
-- It shipped in 191 as a mob: forty hit points, an armour score, a level, a
-- journal page, two dens. All of which a piece of ground does not have. rome
-- ruled it out of the roster and kept it in the world, so the Quicksand Flat
-- itself now takes your leg (events.quicksandTakes, QUICKSAND_ROOMS in
-- zone-data): hobbled and held a round, nothing to fight. The Tide Race loses
-- it - that room is moving water, not sand.
--
-- Rows go in dependency order. With no spawn rows left, the live world culls
-- the two standing quicksands on its next load (ai.reconcilePopulation: a line
-- with no dens has a cap of nought).

DELETE FROM mob_spawns   WHERE template_id = 'the-quicksand';
DELETE FROM mob_variants WHERE base_id = 'the-quicksand' OR variant_id = 'the-quicksand';
DELETE FROM mob_keys     WHERE template_id = 'the-quicksand';
DELETE FROM journal_logs WHERE template_id = 'the-quicksand';
DELETE FROM mob_templates WHERE id = 'the-quicksand';
