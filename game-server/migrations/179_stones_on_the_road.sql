-- STONES ON THE ROAD (rome, 2026-08-08: "make sure we have a good supply of
-- rocks on the road").
--
-- WHY IT MATTERS, MEASURED. A fresh wanderer is 60 HP, 2-5 damage, armour 0.
-- Simulated 40,000 fights per matchup against the road's roster:
--
--                     bare hands          with a loose rock
--   footpad             100%  /  4.7 in a row    100%  /  6.4
--   masterless dog      100%  /  1.7             100%  /  2.4
--   the carrier          58%  /  0.6            99.7%  /  1.4
--   lead dog             39%  /  0.4              82%  /  0.8
--   mire-walker           8%  /  0.1              84%  /  0.9
--
-- The rock is +1 damage on paper. What it actually is: its `stun` is above
-- zero, which makes it BLUNT, and blunt ignores 2 armour. The carrier and the
-- mire-walker both carry armour 1, so a rock does not reduce their armour, it
-- ERASES it. Bare-handed the carrier is a coin flip; with a stone in your fist
-- it is a formality. That is the steepest cliff in the early game and it is
-- bought off the ground for nothing — so the ground had better have stones on
-- it. Nothing here touches a single stat; it changes only how findable the
-- thing is.
--
-- =========================================================================
-- FIRST, A BUG. zone-data.ts has said since the floor-renewal law landed:
--
--   export const RELIABLE_GEAR = new Set(["loose-rock"]); // the starter tool:
--                                        exempt, always comes back
--
-- It does not always come back. A pickup only queues a regrow when the spawn
-- ROW says so (verbs.ts: `groundSpawns.some(g => ... && g.regrows)`), and ten
-- of the world's rock spots were written with regrows = 0 — four on the road
-- and every single one in the wood. Those are one-shot: taken once, gone from
-- that room forever. The exemption in the code and the data disagreed, and the
-- data was winning.
--
-- Fixed for every rock rather than only the road's four. This is one bug, not
-- a balance pass: the wood's six are broken in exactly the same way and for
-- exactly the same reason, and leaving them would mean the starter tool still
-- does not obey its own documented law. No other item is touched.
UPDATE ground_spawns SET regrows = 1 WHERE item_id = 'loose-rock';

-- =========================================================================
-- SECOND, COVERAGE. The road had 9 rock spots across 68 rooms — 13%. And no
-- road room is a fixed spawn point: SPAWN_REGIONS carries the whole band, so a
-- fresh key wakes ANYWHERE on it. Coverage has to be broad rather than placed,
-- or where you happen to open your eyes decides whether the first dog you meet
-- is a nuisance or the end of the run.
--
-- Fourteen more, taking it to 23 of 68 — roughly one room in three, so you are
-- never more than a step or two from a stone. Every one of these is a room
-- that would HAVE loose stone lying in it: paving that has come up, stone-built
-- things gone to ruin, boundary and mile markers, walled folds, a smithy, a
-- well. No stones dropped in peat, water, or open heath, which have none.
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('loose-rock', 'the-broken-paving',   1),  -- paving come up: the stone is the room
  ('loose-rock', 'the-last-paving',     1),
  ('loose-rock', 'the-weed-paving',     1),
  ('loose-rock', 'the-holloway',        1),  -- a lane cut down into the ground, shedding stone from both banks
  ('loose-rock', 'the-old-boundary',    1),  -- boundary stones, and some of them down
  ('loose-rock', 'the-second-milestone',1),  -- a marker is a worked stone that other stones came with
  ('loose-rock', 'the-third-milestone', 1),
  ('loose-rock', 'the-pinfold',         1),  -- a stone-walled pound for strays; walls fall
  ('loose-rock', 'the-sheep-fold',      1),
  ('loose-rock', 'the-smithy-ruin',     1),  -- a ruin is rubble with a name
  ('loose-rock', 'the-burnt-farmstead', 1),
  ('loose-rock', 'the-dry-well',        1),  -- well-lining, and nothing below to keep it
  ('loose-rock', 'the-grave-drain',     1),  -- a stone-lined drain
  ('loose-rock', 'the-mustering-yard',  1);  -- a yard is cobbled, and cobbles come loose
