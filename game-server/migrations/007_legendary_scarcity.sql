-- The Signet of the Door was a certainty; a legendary shouldn't be. The
-- Forgotten King still rules the undercroft on the same slow clock (~3h20 to
-- reform), but now yields its seal only about one kill in five — so the Signet
-- becomes a chase, not a wage. (Rarity via the drop, not the boss: beating the
-- King stays worth attempting even on the empty rolls.)
UPDATE mob_templates SET loot_chance = 0.2 WHERE id = 'forgotten-king';
