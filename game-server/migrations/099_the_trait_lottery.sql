-- 099 THE TRAIT LOTTERY (rome, 2026-07-20): the per-instance layer under the
-- trait ledger (098). Template traits define what a piece IS; a rolled trait is
-- what THIS copy happened to enter the world carrying. Most drops roll nothing,
-- a fresh gear drop rolls at most one trait from its slot's pool (feet/cloak/
-- armor/helm), and the keeper's stock never rolls. "Rolls for breadth,
-- templates for legends" — one small catalog becomes a whole loot table, and
-- every ability we add later becomes rollable across every piece in its slot.
--
-- Stored per row, like condition and journal_id: it rides drop / death / theft
-- on the same floor rail the engraving does (groundRolled mirrors groundLore).
-- Blank for everything already in the world; new loot fills it at mint.
-- Run once (the ALTER fails loudly if repeated).

ALTER TABLE player_items ADD COLUMN rolled_traits TEXT NOT NULL DEFAULT '';
