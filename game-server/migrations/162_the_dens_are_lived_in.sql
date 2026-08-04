-- THE DENS ARE LIVED IN (rome, 2026-08-03: "ITS SUPPOSED TO BE A FUCKING PLACE
-- WHERE NOMADS FUCKING LIVE").
--
-- He is right and mig 160/161 built the floor without the thing that stands on
-- it. Sixty rooms of quiet ground with a larder in it is scenery. This is the
-- den SYSTEM, built to his own rulings from the arc (2026-08-01) and the dens →
-- towns design (2026-07-22), which between them already settled every important
-- question:
--
--   "A den is a HOLDING WITH BUNKS, not a room with an owner. One-room-one-nomad
--    caps housing forever and locks out the 61st permanently. A claim gives you
--    the room; the room has capacity; the holder decides who else gets a key.
--    ...which is what keeps dens scarce as PROPERTY. It also makes nomads depend
--    on each other: you're not looking for an empty room, you're looking for
--    someone who'll take you in."
--
--   "The gatehouse is a small vault — a moving inn, safe because it's shared and
--    neutral and NOBODY'S. The den is the opposite: safe only because it's YOURS
--    and only as far as you've made it so. A den opens genuinely exposed and
--    earns its security entirely through upgrades, never by default."
--
--   "The design bar is 'does having a den make leaving it feel MORE dangerous',
--    not just 'is this cool'."
--
-- So: six doors on this ground, not sixty. A den opens UNSAFE — creatures walk
-- into it exactly like any other room — and the bar on the door is a thing you
-- carry iron out here to fit. A hold LAPSES if the holder stops coming. And
-- nothing about it is a meter: the state is a door, a bar, a list of names, and
-- the date somebody last stood in the room.

-- ---------------------------------------------------------------------------
-- WHICH ROOMS ARE DOORS. A flag on the room, next to is_safe / is_entry /
-- is_spawn, because that is what those columns are for — a property of the
-- place, read once at world load.
ALTER TABLE rooms ADD COLUMN is_holding INTEGER NOT NULL DEFAULT 0;

-- SIX, and every one of them has a roof, a way to shut it, and somewhere to lie
-- down. That is the whole test. The Bare Chapel is deliberately NOT on this list
-- — it is the ground's one communal bolthole and it stays nobody's, which is the
-- gatehouse's law applied out here.
--
--   the-reeves-house    the best house on the street: hearth with a lintel, a
--                       shuttered window that shuts, and a loft over it reached
--                       by a ladder that can be pulled up after you.
--   the-north-house     one room, a byre through the gap, and two hundred years
--                       of smoke in the thatch keeping the rain out.
--   the-smithy          roof, hearth with a hood, and an anvil block still
--                       bolted to the floor.
--   the-mill            tall, narrow, the beck under one end, and a door.
--   the-black-hut       turf two feet thick, no window, bone dry, warm the
--                       moment you are out of the wind.
--   the-warreners-lodge built solid on purpose by a man who slept out alone with
--                       something everybody wanted: thick walls, a barred
--                       shutter, three sockets in the frame for a bar.
UPDATE rooms SET is_holding = 1 WHERE id IN (
  'the-reeves-house', 'the-north-house', 'the-smithy',
  'the-mill', 'the-black-hut', 'the-warreners-lodge'
);

-- ---------------------------------------------------------------------------
-- THE HOLD. One row per claimed den. `tended_at` is the last time the holder
-- personally stood in the room — the lapse clock, and the only clock in the
-- system. There is no upkeep to pay and no bar to fill: you either come home or
-- you stop being from here.
CREATE TABLE IF NOT EXISTS dens (
  room_id    TEXT PRIMARY KEY,
  holder     TEXT NOT NULL,       -- pubkey
  claimed_at INTEGER NOT NULL,
  tended_at  INTEGER NOT NULL,
  barred     INTEGER NOT NULL DEFAULT 0  -- the first upgrade: a bar fitted to the door
);

-- THE BUNKS. Who else may sleep, stow and shelter here. The holder is not in
-- this table — the hold itself is their bed — so a den with DEN_BUNKS rows in
-- here is full and the holder makes the seventh body.
CREATE TABLE IF NOT EXISTS den_keys (
  room_id    TEXT NOT NULL,
  pubkey     TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, pubkey)
);

CREATE INDEX IF NOT EXISTS idx_den_keys_pubkey ON den_keys (pubkey);

-- ---------------------------------------------------------------------------
-- WHAT IS DELIBERATELY NOT HERE
--
--   NO STORAGE TABLE. What you stow in a den is a player_items row with
--   container = 'den:<room_id>' — the same column the lockbox and the vault
--   already ride on. That means the den inherits the whole clock for free:
--   food ages in it, gear wears in it, nothing is frozen the way the vault
--   freezes things. Which is the point — the den is where your things sit in
--   the world, not out of it.
--
--   NO TOWN LAYER. Three dens clustered unlocks a shared front gate, a fire
--   that stays lit, a trader who only shows where people live. That is the next
--   thing and it needs dens to exist first.
--
--   NO PLAYER RAIDING. Property raiding by other players is a much heavier
--   anti-grief problem than the PvP-kill stack was built for, and rome ruled
--   raids MONSTER-driven. What a den has to fear is what is already out there
--   getting hungry, which is why the bar matters and why it costs iron.
