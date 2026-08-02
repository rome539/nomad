-- TORCHES AT THE DOORS, STONES ON THE GROUND (rome, 2026-08-02: "you also
-- forgot torches at gates and plus i think rocks too but not at the gate").
--
-- Every fortress gate has a torch and a loose rock on its floor, and has since
-- the beginning: you arrive at a threshold with nothing, and the threshold gives
-- you a light and something to throw. The five doors that opened this morning
-- on the road and in the wood give you neither, so a wanderer hatching at the
-- Timber Stack starts in an unlit wood with empty hands.
--
-- TORCHES AT ALL FIVE. Non-negotiable in the wood especially — its own dark is
-- a real thing (DARK_ROOMS), and a door that puts you into it without a light
-- is a door that kills you for using it.
--
-- ROCKS, BUT NOT AT THE DOORS. rome's call, and he is right: the fortress gates
-- carry a rock because they are the START of everything, and the free throwable
-- being handed out at every one of eight doors would make it furniture rather
-- than a find. So the road and the wood get their stones scattered where stone
-- actually is, and never on a threshold. It stays worth picking up.
--
-- The rooms chose themselves. The road's flooded quarry is a hole people cut
-- stone out of. The wood's stone pile is a cleared field's worth of it, heaped
-- at the edge. The cutting is a road driven through rock; the lime kiln burned
-- it; the fallen wall and the buried wall were built of it.
--
-- NOT IN THE LYING CORES, on the same reasoning as the larder (mig 143): the
-- cores are somewhere you pass through, and nothing accumulates on that floor.

-- ---- a light at every door ------------------------------------------------
INSERT INTO ground_spawns (item_id, room_id) VALUES
  ('torch', 'the-first-milestone'),
  ('torch', 'the-roadwarden-post'),
  ('torch', 'the-timber-stack'),
  ('torch', 'the-withy-hut'),
  ('torch', 'the-gate-arch');

-- ---- stone where stone is ---------------------------------------------------
INSERT INTO ground_spawns (item_id, room_id) VALUES
  ('loose-rock', 'the-flooded-quarry'),   -- they cut it out of here
  ('loose-rock', 'the-cutting'),          -- the road driven straight through rock
  ('loose-rock', 'the-roadside-graves'),
  ('loose-rock', 'the-sunken-lane'),
  ('loose-rock', 'the-stone-pile'),       -- a field's worth, heaped at the wood's edge
  ('loose-rock', 'the-lime-kiln'),
  ('loose-rock', 'the-fallen-wall'),
  ('loose-rock', 'the-charcoal-ring'),
  ('loose-rock', 'the-thin-soil'),        -- more flint than soil, and it shows
  ('loose-rock', 'the-well-court');
