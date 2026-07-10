-- The pale crawler is the farmable key to the descent, not a mugging: at 6-10
-- it out-hit its own elite variant (the stalker, 5-8) and the warden-captain.
-- Two points off restores the bloodline's order — the stalker is the mean one.
UPDATE mob_templates SET dmg_min = 4, dmg_max = 8 WHERE id = 'pale-crawler';
