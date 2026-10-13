-- 300: HEAVY ARMOUR EARNS ITS WEIGHT (rome, 2026-10-12).
--
-- Once every piece carried its real weight (mig 299), body armour stopped
-- making sense: in every tier the heaviest piece gave at most one more armour
-- than a leather jack, for three to five times the weight. A mail hauberk was
-- armour 2 at 10 kg, the same as a 2 kg jerkin. Light pieces keep their armour;
-- heavier ones now gain by weight: +1 at 6 kg, +2 at 9, +3 at 12, +4 at 15 and
-- up. A full epic heavy kit goes from armour 12 to 16 (55% of each blow turned
-- to 62%), and takes about a fifth less from the big hitters than a light kit.
--
-- The epic shields follow weight the same way: the light targe guards less,
-- the headstone more.
UPDATE item_templates SET armor = 3 WHERE id IN ('kelp-woven-mail');
UPDATE item_templates SET armor = 4 WHERE id IN ('glutton-hide-coat', 'mail-hauberk', 'riveted-cuirass', 'warden-plate');
UPDATE item_templates SET armor = 5 WHERE id IN ('tarred-cuirass', 'tusk-sewn-brigandine');
UPDATE item_templates SET armor = 6 WHERE id IN ('lashed-warcoat', 'winter-cuirass');
UPDATE item_templates SET armor = 7 WHERE id IN ('barbed-warplate', 'cargo-plate', 'deadplate-harness', 'hulks-iron', 'last-watch', 'riveted-warplate');
UPDATE item_templates SET armor = 8 WHERE id IN ('mirror-plate', 'the-tenor-bell');
UPDATE item_templates SET armor = 9 WHERE id IN ('smiths-greatplate');
UPDATE item_templates SET block = 0.22 WHERE id = 'white-hide-targe';
UPDATE item_templates SET block = 0.25 WHERE id = 'barbed-round-shield';
UPDATE item_templates SET block = 0.28 WHERE id = 'shell-plate';
UPDATE item_templates SET block = 0.30 WHERE id = 'crown-guard-pavise';
UPDATE item_templates SET block = 0.30 WHERE id = 'smiths-aegis';
UPDATE item_templates SET block = 0.32 WHERE id = 'gravestone-shield';
