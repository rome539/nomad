-- The stair's guardian is a prize, not a farm: killing the three-hound buys
-- the descent a real window. Fastest return 30 minutes (busy server, factor
-- floor 5); a solo hour when the halls are quiet (factor 10).
UPDATE mob_templates SET respawn_secs = 360 WHERE id = 'three-hound';
