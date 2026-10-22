-- 328 the keeper sells every material, and runs out (rome, 2026-10-22).
--
-- The shelf carried scrap and no other making, and the scrap never ran out:
-- iron was as free as anyone's trade goods. Now every material is on the
-- shelf - scrap, iron bars, split wood, leather, bone and horn, linen - and
-- each is a stock that sells down and comes back slowly (FENCE_MATS in
-- zone-data.ts says how many and how fast). The prices sit at twice the
-- barter like the scrap always has, and an iron bar at what five scrap would
-- smelt to.
INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('iron', 10),
  ('split-wood', 2),
  ('leather-offcuts', 2),
  ('bone-offcuts', 2),
  ('linen-strips', 1);
