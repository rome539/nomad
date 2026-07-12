-- 074: the shield wall lowers — rome (2026-07-12): a 45% wall (55% guarded,
-- ~70% with a parry blade) was too much shield; cap the ladder at 30%.
-- Rescaled in the data, same shape, no code multipliers. The spiked buckler
-- keeps its identity (thorns, not wall); the pavise sits just under the
-- gravestone because its answer is the 2-point spike, not the block.
-- Guarded (+0.10 behind a shield) and the weapon-hand parries are untouched:
-- the deliberate all-in turtle now peaks ~40% guarded, not 55%.
UPDATE item_templates SET block = 0.10 WHERE id = 'battered-buckler';     -- was 0.15
UPDATE item_templates SET block = 0.10 WHERE id = 'spiked-buckler';       -- was 0.15
UPDATE item_templates SET block = 0.15 WHERE id = 'iron-bound-shield';    -- was 0.25
UPDATE item_templates SET block = 0.20 WHERE id = 'knights-kite-shield';  -- was 0.30
UPDATE item_templates SET block = 0.25 WHERE id = 'warden-tower-shield';  -- was 0.35
UPDATE item_templates SET block = 0.28 WHERE id = 'crown-guard-pavise';   -- was 0.40
UPDATE item_templates SET block = 0.30 WHERE id = 'gravestone-shield';    -- was 0.45
