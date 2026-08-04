-- A ROOM IS A SITE, NOT A SLOT (rome, 2026-08-04: "HOW ABOUT WHEN SOMONE
-- FUCKING SETTLES IT DOESNT CONSUME THE FUCKING ROOM SLOT, BUT THEY STILL HAVE
-- TO BUILD THEIR FUCKING DEN").
--
-- THE PROBLEM THIS ANSWERS, and it was fatal. Six holdings, one hold per player,
-- meant SIX PEOPLE could ever have a home. The seventh could not, whatever they
-- did, however long they played. That is not scarcity — scarcity is contested
-- and earnable — it is a wall, and every region added afterwards would have
-- needed doors hand-placed into it by me, forever, or get none. My own answers
-- to it were worse: a distance law with a number I invented, or more authored
-- doors. rome's is better than both and it is one line: settling a room does not
-- consume it.
--
-- SO THE ROOM IS GROUND, AND THE DEN IS SOMETHING YOU RAISE ON IT. Any number of
-- nomads settle the same holding; each builds their own, each holds their own
-- door, their own bar, their own shelf, their own bunks. Six rooms serve six
-- hundred people. The scarce thing stops being MY six doors and becomes the
-- timber and iron you carried out there, which is a brake that scales with the
-- world instead of against it, and needs nothing authored ever again.
--
-- WHAT CHANGES IN THE SCHEMA: everything about a den was keyed to its ROOM,
-- because a room had exactly one. Now it is keyed to the ROOM AND THE HOLDER.
-- SQLite cannot restate a primary key, so each table is rebuilt and copied.
-- Every existing row survives untouched — the six holds, their bunks, and every
-- shelf (player_items is not touched at all: a shelf was always keyed to the
-- player and the room, which is still exactly right, and stays reachable).

-- THE HOLDS. Was PRIMARY KEY (room_id). Now (room_id, holder).
CREATE TABLE IF NOT EXISTS dens_site (
  room_id    TEXT NOT NULL,
  holder     TEXT NOT NULL,       -- pubkey
  claimed_at INTEGER NOT NULL,
  tended_at  INTEGER NOT NULL,
  barred     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, holder)
);
INSERT OR REPLACE INTO dens_site (room_id, holder, claimed_at, tended_at, barred)
  SELECT room_id, holder, claimed_at, tended_at, barred FROM dens;
DROP TABLE dens;
ALTER TABLE dens_site RENAME TO dens;
-- One hold per player is now enforced by the code, not the schema — a UNIQUE on
-- holder would make the rule unchangeable from here, and it is a design dial.
CREATE INDEX IF NOT EXISTS idx_dens_holder ON dens (holder);

-- THE BUNKS. A key was to a ROOM; it is to a DEN, and one room may hold many.
CREATE TABLE IF NOT EXISTS den_keys_site (
  room_id    TEXT NOT NULL,
  holder     TEXT NOT NULL,       -- whose den the key opens
  pubkey     TEXT NOT NULL,       -- who holds the key
  granted_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, holder, pubkey)
);
-- Every existing key belonged to the one den that stood in its room.
INSERT OR REPLACE INTO den_keys_site (room_id, holder, pubkey, granted_at)
  SELECT k.room_id, d.holder, k.pubkey, k.granted_at
    FROM den_keys k JOIN dens d ON d.room_id = k.room_id;
DROP TABLE den_keys;
ALTER TABLE den_keys_site RENAME TO den_keys;
CREATE INDEX IF NOT EXISTS idx_den_keys_pubkey ON den_keys (pubkey);

-- BLOOD UNDER THE ROOF (mig 171) is per-ROOF, and a room now has many roofs.
-- The killing shuts you out of the DEN you spilled it in, not out of every house
-- on the street — the street is public ground and always was. It still outlives
-- the hold: settle, lapse, abandon, a new holder, none of it washes the room's
-- memory of you, and you can never raise your own den on the spot either.
CREATE TABLE IF NOT EXISTS den_blood_site (
  room_id TEXT NOT NULL,
  holder  TEXT NOT NULL,        -- whose roof it was
  pubkey  TEXT NOT NULL,        -- who drew steel under it
  victim  TEXT NOT NULL,
  at      INTEGER NOT NULL,
  PRIMARY KEY (room_id, holder, pubkey)
);
INSERT OR REPLACE INTO den_blood_site (room_id, holder, pubkey, victim, at)
  SELECT b.room_id, COALESCE(d.holder, ''), b.pubkey, b.victim, b.at
    FROM den_blood b LEFT JOIN dens d ON d.room_id = b.room_id;
DROP TABLE den_blood;
ALTER TABLE den_blood_site RENAME TO den_blood;
CREATE INDEX IF NOT EXISTS idx_den_blood_room ON den_blood (room_id);

-- NOT DONE, deliberately:
--
--   NO NEW ROOMS, NO NEW HOLDINGS, NO DISTANCE LAW. The six sites are the six
--   sites. What changed is that they stopped being six SEATS. If the ground ever
--   wants more streets that is a world question, not a housing one, and the
--   housing no longer depends on the answer.
--
--   player_items IS UNTOUCHED. A shelf row is keyed to the player and the room
--   ('den:<room>'), which was always the right key and is now the only one that
--   could survive this change without a rewrite: your things are YOURS in that
--   room, whoever holds whichever door. Nothing moves, nothing is lost, and the
--   collect-at-the-door path still finds every row it ever could.
