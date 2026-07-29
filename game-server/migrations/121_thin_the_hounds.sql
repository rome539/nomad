-- 121 thin the hounds (rome, 2026-07-29): every hound drop halved, across all
-- three channels -- the template's trophy + worn gear, and the mob_keys
-- secondary rolls.
--
--   three-hound  hound-fang        55%   -> 27.5%
--                sentinels-mantle  22.5% -> 11.25%
--                dry-cigarettes    20%   -> 10%
--                houndsbane        8%    -> 4%
--   two-hound    hound-fang        70%   -> 35%
--                hand-rolled-smokes 0.5% -> 1%  (see below -- UP, not halved)
--
-- The cigarette rates are deliberately included: 104 set three-hound to 20%
-- as its own premium above the 0.5% baseline, and rome confirmed on being
-- shown the conflict that this pass supersedes it.
--
-- Not touched: two-hound still drops fangs MORE often than three-hound
-- (35% vs 27.5%) even after the cut -- the ratio was already backwards before
-- this and halving both preserves it. Flagged to rome, left alone until named.

UPDATE mob_templates SET loot_chance = loot_chance / 2, gear_drop = gear_drop / 2
WHERE id IN ('three-hound', 'two-hound');

UPDATE mob_keys SET drop_chance = drop_chance / 2
WHERE template_id IN ('three-hound', 'two-hound');

-- The one that goes UP (rome, 2026-07-29): halving the runt's smokes landed it
-- at 0.25%, BELOW the 0.5% baseline every ordinary mob rolls -- a named variant
-- you have to get a 10% bloodline roll to even meet would have been the
-- stingiest cigarette source in the game. Set to 1% outright: still a rounding
-- error next to three-hound's 10%, but worth the kill. Runs after the halve
-- above, so it's an absolute value, not a further cut.
UPDATE mob_keys SET drop_chance = 0.01
WHERE template_id = 'two-hound' AND key_item = 'hand-rolled-smokes';
