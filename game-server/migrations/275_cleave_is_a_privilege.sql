-- CLEAVE IS A PRIVILEGE (2026-08-25).
--
-- Cleave (sweep > 1) was spread across the whole rarity curve: a common rusty
-- billhook and an uncommon pair of cleavers caught two foes a swing, the same
-- as an epic halberd. That made the wide-arc weapons read as ordinary, and it
-- put multi-target clearing in the hands of gear that should never have had it.
--
-- Cleave now scales with the colour of the piece, the same law bleed just got:
--   common/uncommon/rare -> sweep 1  (no cleave; one foe a swing)
--   epic (purple)        -> sweep 2  (two foes)
--   legendary            -> sweep 3  (three foes)
-- The lone epic that swept 3 comes down to 2 (a glaive is wide, but it is not
-- legendary); the two legendary sweepers rise to 3 (that is what legendary is
-- FOR). Everything below epic goes back to one foe a swing.
--
-- The "cleaving" trait (one more foe per swing) already gates itself on
-- sweep > 1, so this also pins that trait to epic-and-above for free.

UPDATE item_templates SET sweep = 1 WHERE id IN ('rusty-billhook', 'burners-billhook', 'paired-cleavers', 'boar-spear', 'rust-eaten-cleaver', 'woodwards-axe', 'two-headed-maul', 'bearwards-chain', 'reaping-blade', 'headtaker-axe');
UPDATE item_templates SET sweep = 2 WHERE id = 'reaver-glaive';
UPDATE item_templates SET sweep = 3 WHERE id IN ('the-hedge-bill', 'lash-flail');
