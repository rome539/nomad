-- 391: THE SALT WIDOW GOES OUT TO THE WORKINGS (rome, 2026-11-12). Both her homes
-- stood two and three steps from the Crossing House, and now that the crossing's
-- dead walk their ground she came out onto the strand road beside the gate. She
-- moves out onto the marsh, to the old salt workings and the pools round them,
-- 27 and 32 steps from any gate. Ids kept (mig 309); the ones standing walk out
-- with their homes (zone-data DEN_MOVES).
UPDATE mob_spawns SET room_id = 'the-salt-workings' WHERE id = 'spawn-the-salt-widow@the-pan-house#343'; -- from the-pan-house
UPDATE mob_spawns SET room_id = 'the-saltmarsh-pools' WHERE id = 'spawn-the-salt-widow@the-salt-pans#344'; -- from the-salt-pans
