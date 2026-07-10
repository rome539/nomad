-- Fire & light, first slice. A handful of deep rooms are named for their dark —
-- the Blackreach, the Lightless March, the Gasping Dark — and now they mean it:
-- without a light you enter blind, seeing nothing, no way to read the room or
-- its exits. A torch reveals them, burns for a while, then gutters out (the clock
-- the extraction loop wants) — and an open flame in hand finally wakes the
-- fire-fear that shipped dormant (the albino rat breaks from it). Pure content +
-- the light mechanic in code; the torch is a renewable surface forage so a fresh
-- wanderer can always grab one before the descent. Search-for-hidden-exits, a
-- flood hazard, and map-blackout are deferred follow-ons. (rome, 2026-07-10.)
--
-- NOTE: item_templates + ground_spawns are World config, read at DO cold-start.
-- Wants a REDEPLOY + /admin/reseed to place the torches on the floors.

-- A carried torch. Lit with `light`, it burns ~10 min then gutters out (spent).
-- Not gear, not treasure — a consumable tool, so scarcity is untouched.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity) VALUES
('torch', 'a pitch-soaked torch', 'A shaft of hard wood, its head bound in rag and black with old pitch. Unlit it is just a stick; touched to a spark it throws a low, guttering light — for a while. Long enough, if you do not linger.', 'common');

-- Torches lie at the thresholds — grab one before you go down into the dark.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
('torch', 'gate',        1),
('torch', 'sally-port',  1),
('torch', 'weeper-arch', 1),
('torch', 'hall',        1),
('torch', 'undercroft',  1);
