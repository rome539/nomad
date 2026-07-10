-- Herbs: a small foraging layer, the last slice of the living-world island. Same
-- discipline as "quick life" (052) — pure DATA on the edible/staunch mechanics
-- that already ship, none of it gear or treasure, so scarcity is untouched. The
-- economy is PLACEMENT: bloodwort grows up top where the bleeders (rats/hyenas)
-- are, so it answers the bleed you take on the surface; the two deep herbs give
-- the dark a NON-GEAR reason to be entered and foraged. Renewable but gated by
-- WHERE. The dry/prepare state machine stays deferred — these are used raw.
-- (rome, 2026-07-10.)
--
--   bloodwort   -> staunch          a surface styptic; packed on a cut it clots
--   cave-nettle -> edible + heal     a deep forage, chewed for a modest mend
--   grave-moss  -> edible + staunch+heal   the deep's dual mercy: feeds AND clots
--
-- All regrow on the randomized 5-25 min window, one instance per room.
--
-- NOTE: item_templates + ground_spawns are World config, read at DO cold-start.
-- Wants a REDEPLOY (loads the new items + spawn entries) + /admin/reseed (places
-- them on the floors) — a warm world won't re-seed on its own.

-- Surface styptic: crushed onto a wound it draws the bleeding closed (staunch,
-- a touch stronger than linen-strips' 5, since you have to find it).
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, staunch) VALUES
('bloodwort', 'a sprig of bloodwort', 'A red-veined weed that takes root in the damp of ruined places. Crushed and packed over a cut, the pulp draws the bleeding closed — the old soldiers swore by it.', 'common', 6);

-- Deep forage: chewed, a modest mend. Nothing you would carry home, everything
-- you want halfway down with a wound and no bandages left.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal) VALUES
('cave-nettle', 'a handful of cave-nettle', 'A stinging nettle gone pale and limp in the lightless damp, its sting boiled dumb by the wet. Chewed down, bitter and green, it dulls the ache and puts a little back.', 'common', 1, 5);

-- The deep's dual mercy: it both feeds a little AND clots a wound. Grey moss off
-- the old bones, bitter as ash — the best forage in the dark.
INSERT OR REPLACE INTO item_templates (id, name, description, rarity, edible, heal, staunch) VALUES
('grave-moss', 'a clump of grave-moss', 'Grey moss grown thick on old bone, cold and bitter as ash. Swallowed it settles the stomach; pressed to a cut it holds the blood back. The deep gives little, and this is much.', 'common', 1, 4, 4);

-- ---- where they grow, and regrow (forage the rooms keep) ----
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
-- bloodwort: surface ruins where the bleeders roam
('bloodwort',   'muster',             1),
('bloodwort',   'chapel',             1),
('bloodwort',   'debtors-pit',        1),
('bloodwort',   'oubliette',          1),
-- cave-nettle: the deep's wet places
('cave-nettle', 'leech-pools',        1),
('cave-nettle', 'the-sump',           1),
('cave-nettle', 'black-canal',        1),
-- grave-moss: the deep's bone rooms
('grave-moss',  'deep-ossuary',       1),
('grave-moss',  'bone-processional',  1),
('grave-moss',  'the-marrow-road',    1);
