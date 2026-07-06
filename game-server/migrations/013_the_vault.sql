-- Two tiers of keeping (rome's design, 2026-07-05):
--   The LOCKBOX (8 slots)  — the run closet. Takes ANYTHING, sealed or raw:
--     stagger out with rare loot and park it, no ceremony. Quick.
--   The VAULT (40 slots)   — the bank, deeper in the gatehouse. Sealed only:
--     the gate notarizes, the vault banks. Wealth, not stuff.
-- Both gate-only, calm-only, beyond death's reach. Carried is carried.
ALTER TABLE player_items ADD COLUMN container TEXT NOT NULL DEFAULT '';
UPDATE player_items SET container = 'lockbox' WHERE vaulted = 1;
-- (the old `vaulted` boolean is retired in place; `container` is the truth)

UPDATE rooms SET description = description ||
 ' Behind them, an older door of riveted iron: the vault, where sealed wealth sleeps.'
WHERE id = 'gate';
