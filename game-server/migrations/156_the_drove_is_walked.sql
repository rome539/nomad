-- THE DROVE IS WALKED (the population half of mig 155's ten rooms).
--
-- Rooms with nothing in them are filler, and the road's own standard is the
-- measure: 7 spawns across 30 rooms, 0.23 to the room. Ten new rooms earn three,
-- placed on what the prose already says rather than sprinkled:
--
--   the spoil banks   — "Rabbits have been at the banks. Something bigger has
--                        been at the rabbits." That is a dog and it was already
--                        written into the room.
--   the gorse tunnel  — loud to walk through, no seeing out of it. The best
--                        ambush on either road, so something waits in it.
--   the sheep-fold    — "Somebody swept it, not so very long ago." Somebody is
--                        still using it, and it is out of the wind and out of
--                        sight, which is what a footpad wants from a night.
--
-- No new templates. The drove is the road, not a new region, and the road's
-- roster is masterless dogs and footpads (with their lead-dog and wayman bloods
-- rolling underneath at 1-in-10, so the fork has its own chance of a bad one).

INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-drove-1', 'masterless-dog', 'the-spoil-banks'),
  ('spawn-drove-2', 'masterless-dog', 'the-gorse-tunnel'),
  ('spawn-drove-3', 'footpad',        'the-sheep-fold');

-- What lies about. The same shape as the paving's: stone where stone is, forage
-- where the prose puts something growing. The stance has a spring-fed trough,
-- so watercress; the thorn lane and the banks are sloe and thorn country.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('loose-rock',  'the-spoil-banks',     1),
  ('loose-rock',  'the-broken-cross',    1),
  ('watercress',  'the-drovers-stance',  1),
  ('sloes',       'the-thorn-lane',      1),
  ('beech-mast',  'the-sunken-drove',    1);

-- THE CARRIER STAYS ON THE PAVING (PATROLS, zone-data.ts). His route is the
-- 25-room spine out and back, and it is not extended here on purpose: a courier
-- with a route walks the maintained road, not the drove that the beasts used
-- after the bridge went. The fork is the way AROUND him as much as around the
-- ford — which is worth something to anyone who would rather not be met.
