-- 104 the cig cliff (rome, 2026-07-23): mob_keys cigarette drops had a real
-- cliff nobody had touched since their original migrations (024, 026, 035,
-- 038) -- 14 mobs sit at the intended 0.5% baseline (set by 033's nerf
-- pass), while 5 mobs never got that pass at all: the three bosses at 60%,
-- albino-rat at 50%, three-hound at 25%. Cigs are the rare hard-currency
-- fast lane -- 50-120x the baseline rate undercut that on exactly these
-- five. Brought down, not to baseline (a boss kill and three-hound earn a
-- real premium), but off the cliff: bosses/albino-rat to 30%, three-hound
-- to 20%.

UPDATE mob_keys SET drop_chance = 0.30 WHERE template_id IN ('forgotten-king', 'drowned-god', 'marrow-king', 'albino-rat') AND key_item = 'dry-cigarettes';
UPDATE mob_keys SET drop_chance = 0.20 WHERE template_id = 'three-hound' AND key_item = 'dry-cigarettes';

-- The cache side has the same cliff: reliquary (kings-hoard, the King's own
-- room) sat at 50%, 3-6x every other cache -- and it stacks with the King's
-- own kill-drop (now 30% above) in the SAME room, no travel between them.
-- Matched to the boss kill-drop number, not left as its own outlier.
UPDATE cache_loot SET chance = 0.30 WHERE cache_id = 'reliquary' AND item_id = 'dry-cigarettes';
