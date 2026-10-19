-- The high birds hit softer. A bird that fights from the air spends most of a
-- fight out of reach and chooses when to come down, so it cannot also hit like
-- a wolf or a lynx when it lands. rome asked for the higher-tier fliers only
-- (the ones that were hitting 5 to 13); the small birds already hit lightly
-- and stay as they are, as do the vultures, which fight on the ground.
-- Damage only: bleed, health, armor and the flying itself are unchanged.
UPDATE mob_templates SET dmg_min = 4, dmg_max = 7 WHERE id = 'black-backed-gull'; -- 6-11
UPDATE mob_templates SET dmg_min = 4, dmg_max = 7 WHERE id = 'hill-eagle';        -- 6-11
UPDATE mob_templates SET dmg_min = 4, dmg_max = 6 WHERE id = 'bone-breaker';      -- 5-9
UPDATE mob_templates SET dmg_min = 5, dmg_max = 7 WHERE id = 'the-bone-dropper';  -- 7-11
UPDATE mob_templates SET dmg_min = 5, dmg_max = 7 WHERE id = 'eagle-owl';         -- 7-11
UPDATE mob_templates SET dmg_min = 5, dmg_max = 8 WHERE id = 'eyrie-holder';      -- 8-13
