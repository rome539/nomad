-- The fowler and the reed walker hit softer, and wait unseen. rome asked for
-- less damage (two off the fowler, three off the reed walker), and for both to become lurkers (zone-data LURKERS):
-- the fowler lies flat in his hide until you are on top of him, the reed walker
-- is in the cut before you see it. Damage only here; health, armor and bleed
-- are unchanged. The lurker's opening drop (LURKER_DROP_MULT) applies to them
-- now like every other lurker.
UPDATE mob_templates SET dmg_min = 5, dmg_max = 10 WHERE id = 'the-fowler';      -- 7-12
UPDATE mob_templates SET dmg_min = 4, dmg_max = 9 WHERE id = 'the-reed-walker';   -- 7-12
