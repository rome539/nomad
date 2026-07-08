-- Combat audit fix #6 (rome, 2026-07-08): the top of the game had no tradeoff.
--
-- chitin-harness (4 armor), coral-crown (3), warden-sabatons (2), hyena-mantle
-- (2) were ALL weight-0: 11 armor, ~52% mitigation — AND the quick-feet dodge
-- (wornWeight()===0 adds to the foe's miss chance) AND clean flight. Strictly
-- superior to every other kit at everything, including running away. In an
-- extraction game, "can I disengage clean" vs "can I soak the fight" should be
-- THE endgame question — so the two biggest pieces now carry a point of weight.
--
-- The endgame forks: the 11-armor TANK (max mitigation, no footwork, flees
-- dirty) vs the ~8-armor GHOST (keeps the dodge and the clean flee — the
-- extraction build). Full encumbrance stays a Phase-3 lever; this is the
-- cheapest honest cut of it.

UPDATE item_templates SET weight = 1 WHERE id IN ('chitin-harness', 'coral-crown');
