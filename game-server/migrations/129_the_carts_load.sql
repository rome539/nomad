-- THE CART'S LOAD (rome approved 2026-08-01) — the West Road's wrecked-cart POI.
--
-- WHY A CACHE AND NOT ground_spawns. Regrowing ground spawns were the root
-- cause of un-scarce gear (fixed by the RNG floor-renewal law, f60ef32) and
-- putting a renewing pile of loot on the floor of a road room would walk that
-- back. A cache has a refill clock, an empty state, and a lock — machinery
-- that already exists and is already tuned.
--
-- WHY IT IS LOCKED, in fiction: the cart went over a long time ago and anything
-- loose was carried off within a week. What is left is the box that was strapped
-- under the boards, which is exactly why the cart is still worth stopping at.
-- It takes a strongbox-key or a rock — and a rock means ringing stone on iron,
-- repeatedly, in the open, on a road, which is the trade this POI is really
-- offering.
--
-- WHAT IS IN IT: cargo, not kit. The road is the first stretch out and its
-- payoff should be SUPPLIES FOR GOING FURTHER — the gear comes from the wood
-- and the mountain. Hence hardtack and dressings and metal stock, and one pair
-- of dead man's boots.
--
-- The cigarettes are the exception and they are deliberate. A merchant's cart
-- is precisely where they would be, and this seeds the hard currency somewhere
-- other than the deep without a word of explanation anywhere in the game. Kept
-- at 0.06 so it stays a thing that happens to you, not a route.
--
-- Six hours to refill: worth checking again on a second trip out, never a farm.

INSERT INTO caches (id, room_id, name, description, key_item, refill_secs)
VALUES (
  'carts-strongbox',
  'the-broken-axle',
  'a strapped strongbox',
  'Bolted through the cart''s floor and strapped over the top of that, which is why it is still here when nothing else is. The wood has gone grey and soft around the ironwork, but the ironwork has not gone anywhere, and the latch is still shut.',
  'strongbox-key',
  21600
);

INSERT INTO cache_loot (cache_id, item_id, chance) VALUES
  ('carts-strongbox', 'hardtack',       0.5),
  ('carts-strongbox', 'scrap-iron',     0.4),
  ('carts-strongbox', 'linen-strips',   0.35),
  ('carts-strongbox', 'iron',           0.25),
  ('carts-strongbox', 'worn-boots',     0.1),
  ('carts-strongbox', 'dry-cigarettes', 0.06);
