-- 248 you go round the house (rome, 2026-08-19).
--
-- He looked at a gate sitting in a one-wide walkway and said it was going to
-- kill migrating mobs. He was right, and it was very much worse than the one
-- walkway he was pointing at.
--
-- THE LAW HE WAS READING OFF, and it is one line: ai.ts 537,
--
--     const blocked = (r) => world.safeRooms.has(r) || world.entryRooms.has(r);
--
-- A CREATURE CANNOT ENTER A GATE OR A SANCTUARY. Ever, for any reason. So every
-- gate is a wall as far as the living world is concerned, and a gate with two
-- exits is a wall across a corridor.
--
-- WHAT THAT HAD ACTUALLY DONE. Walking the whole world's exit graph with the
-- blocked rooms removed gives EIGHT components where there should be one:
--
--     713  the main mass — road, wood, out, den, the fortress, the deep
--     393  THE EASTERN ISLAND — the crossing's east shore AND THE ENTIRE MOUNTAIN
--       7  the wood's hall range (chapel shell, solar, kitchen, icehouse...)
--       2  the well yard and the keeper's garden
--       2  the summit and the summit gate
--       1  the ash heap · 1 the stable range · 1 THE NETTLE GROUND
--
-- The 393 is the one that matters and the cut is a single room: THE CROSSING
-- HOUSE, a gate, the only join between the far parting and the strand road.
-- Not one creature has ever been able to walk between the mountain and the rest
-- of the world in either direction, since the day either shipped. Three hundred
-- and ninety-three rooms of sealed jar. It is also why MIGRATE_BANDS quietly
-- omitting "mountain" never showed up as a bug — there was nothing for it to
-- gate.
--
-- THE FIX IS TWO EXITS AND NO NEW ROOMS, and the room wrote it itself. The Well
-- Yard is "a cobbled yard BEHIND the crossing house... the only sweet water
-- within a mile of anywhere and EVERYTHING ON THIS SHORE KNOWS IT" — a line that
-- has been false since it was written, because nothing on that shore could
-- reach it. It hangs off the south wall of the house at (64,10) with the
-- Landing Arch at (63,10) and the Salt Pans at (65,10) either side of it and no
-- link to either.
--
-- So: a service lane round the back. You go round the house instead of through
-- it, which is how anybody has ever got past a building they had no business
-- inside. Both links are orthogonal, both rooms already exist, and it repairs
-- TWO of the eight pockets at once — the island rejoins the world, and the well
-- yard and the keeper's garden stop being a place with no way in.
--
-- WHAT IS DELIBERATELY LEFT SEALED: the summit and its gate, because an apex
-- that things wander into is not an apex; and the wood's hall range, the ash
-- heap and the stable range, which are pre-existing and nobody's spawn lives in
-- them. Checked: the ONLY creature in the world standing inside a sealed pocket
-- is the milker below, and the drake, which is meant to be.

INSERT OR IGNORE INTO exits (room_id, dir, to_room, key_item) VALUES
  ('the-well-yard',    'west', 'the-landing-arch', NULL),
  ('the-landing-arch', 'east', 'the-well-yard',    NULL),
  ('the-well-yard',    'east', 'the-salt-pans',    NULL),
  ('the-salt-pans',    'west', 'the-well-yard',    NULL);

-- ---- and the milker who could never leave -----------------------------------
-- THE NETTLE GROUND is the one-wide dead end rome was actually pointing at, and
-- it cannot be fixed the same way: its only two neighbours are the Shieling (a
-- gate) and the Hearth Stone (a sanctuary), it sits at (71,6) with empty grid
-- either side, and the four rooms there form a 2x2 block whose two BLOCKED
-- corners are diagonal to each other — which severs the other two, because a
-- link in this world can never be diagonal by construction.
--
-- Opening it would take a new room. It does not need one: a quiet pocket behind
-- the shieling that only a person can walk into is a perfectly good thing for
-- the foot to have. What it cannot have is a BODY in it, and mig 244 put one
-- there — a milker who can never move, whom nothing can ever reach, sitting
-- outside the ecology entirely.
--
-- She goes to the Peat Hags, one room east of the Hearth Stone, on open ground.
-- Cutting peat for a hut fire is the same summer's work by the same hands.
UPDATE mob_spawns SET room_id = 'the-peat-hags'
 WHERE room_id = 'the-nettle-ground' AND template_id = 'the-milker';
