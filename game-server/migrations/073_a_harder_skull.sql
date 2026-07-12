-- 073: a harder skull — stun odds halved at the source (rome, 2026-07-12,
-- after the Emberknock fight: a 35% flanged mace stunned five times in
-- fifteen rounds and the man never got to fight). The tuning lives here in
-- the data, one number per weapon — no code multipliers, no grace windows.
-- Applies everywhere a skull can ring: players, hounds, skeletons alike.
-- (Bosses were never stunnable; the padded coif still halves what lands.)
UPDATE item_templates SET stun = 0.08 WHERE id = 'loose-rock';         -- was 0.15
UPDATE item_templates SET stun = 0.06 WHERE id = 'splintered-cudgel';  -- was 0.12
UPDATE item_templates SET stun = 0.10 WHERE id = 'studded-maul';       -- was 0.20
UPDATE item_templates SET stun = 0.12 WHERE id = 'warden-maul';        -- was 0.25
UPDATE item_templates SET stun = 0.18 WHERE id = 'flanged-mace';       -- was 0.35
UPDATE item_templates SET stun = 0.20 WHERE id = 'marrow-scepter';     -- was 0.40
UPDATE item_templates SET stun = 0.12 WHERE id = 'hammerstone';        -- was 0.25
