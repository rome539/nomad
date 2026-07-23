-- 105 the map trim (rome, 2026-07-23): crude-map was dropping too much
-- "across the board" -- not one outlier mob (like the cig cliff, 104), but
-- four separate common enemies (cutthroat, cutpurse, warden, skeleton) all
-- independently rolling for it, on top of a guaranteed cheap fence buy. Halved
-- every mob_keys rate; the fence's guaranteed 8-barter buy stays untouched.

UPDATE mob_keys SET drop_chance = drop_chance / 2 WHERE key_item = 'crude-map';
