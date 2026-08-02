-- ONE FOLLOWER TO A CORE (rome, 2026-08-02) — twenty down to eight.
--
-- THE PROBLEM WAS VOLUME, NOT THE MOB. The follower's whole effect is its move
-- sound — "a step to the north that matches yours, and stops when you stop" —
-- which is heard from every adjacent room. Twenty of them across 58 core rooms
-- meant that line arriving several times a minute, from three directions at
-- once, while you stood still. A sound that constant stops reading as something
-- following you and starts reading as weather. The first walk-through of the
-- cores logged four of them in six turns, one of which fired twice from the
-- same direction before the player had moved at all.
--
-- EIGHT, PLACED ONE PER CORE. That is not just a smaller number, it is a
-- better distribution: the old twenty were bunched — five in core A, five in C,
-- five in D, three in H, two in B — and cores E, F and G had NONE. The
-- deepest ground in the wood (core G, below the sunken wood) was the only
-- perfectly safe place in the maze, which is exactly backwards.
--
-- So: one to a core, all eight cores, and the density in the part of the wood
-- that lies to you goes from one follower per 2.9 rooms to one per 7.25. You
-- hear it, then you go a while without hearing it, then you hear it again. That
-- gap is the mechanic. It cannot work when the sound never stops.
--
-- The rooms chosen are ordinary ring rooms, not spills — a follower sitting on
-- the room a core dumps you into would be a guaranteed meeting rather than a
-- chance one, and the point of the thing is that you are never sure.
--
-- The live world reconciles itself: cutting the spawn rows lowers the
-- population cap for the line, and reconcilePopulation culls the surplus on the
-- next load, furthest-from-a-den first (zone.ts, first-light branch).

DELETE FROM mob_spawns WHERE template_id = 'the-follower';

INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-follow-a', 'the-follower', 'the-same-tree'),       -- core A
  ('spawn-follow-b', 'the-follower', 'the-birdless-acre'),   -- core B, north
  ('spawn-follow-c', 'the-follower', 'the-still-air'),       -- core C, south
  ('spawn-follow-d', 'the-follower', 'the-holly-maze'),      -- core D, far north
  ('spawn-follow-e', 'the-follower', 'the-black-pool'),      -- core E, far south
  ('spawn-follow-f', 'the-follower', 'the-green-dark'),      -- core F, sunken
  ('spawn-follow-g', 'the-follower', 'the-last-light'),      -- core G, deepest
  ('spawn-follow-h', 'the-follower', 'the-thorn-waste');     -- core H, dry scrub
