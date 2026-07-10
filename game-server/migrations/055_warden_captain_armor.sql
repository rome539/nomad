-- The warden-captain sat at armor 4 — the highest of any non-boss, a full point
-- over the retuned hound (2) and two over the warden (2). On a level-5 patroller
-- that flat 4 hard-floored too much: even blunt (ignores 2) met effective 2, and
-- ordinary edges chipped 1-3 a swing against 52 hp. Down to 3: still the toughest
-- skin on the surface ring, pierce/blunt still the right answer, but the fight
-- stops being a grind. (rome, 2026-07-09.)
--
-- NOTE: mob_templates is World config, read at DO cold-start — no reseed (armor
-- is read from the template each hit, so it updates the live captain at once),
-- but REDEPLOY the worker so the warm Durable Object reloads the World.

UPDATE mob_templates SET armor = 3 WHERE id = 'warden-captain';
