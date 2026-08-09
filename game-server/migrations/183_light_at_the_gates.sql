-- LIGHT AT THE GATES (rome, 2026-08-09: "i noticed they arent any torches in
-- the gates for players in the world").
--
-- =========================================================================
-- THE REAL ONE: THE KEEPER HAS NEVER SOLD A TORCH.
--
-- gate.ts's `fenceStaple` has said since it was written that a torch is one of
-- the basics the keeper ALWAYS keeps — food, water, dressings, torches, scrap —
-- and it means it: a staple never rotates off the shelf. But `fenceStaple` only
-- decides whether a thing can be taken AWAY from the offering. It cannot put
-- one there. The torch was never in fence_stock at all, so a rule that has
-- protected the keeper's torch supply for months has been protecting a torch
-- that was never on the shelf in the first place.
--
-- The only light the keeper has ever actually sold is a hooded lantern at 14 —
-- five or six trophies for your first candle — while everything else about the
-- dark assumes a torch is the ordinary answer and the lantern is the good one.
--
-- 2 barter: the price of hardtack and a bit of scrap iron, the cheapest things
-- he carries. It should cost something, and it should never be the reason you
-- didn't go.
INSERT INTO fence_stock (item_id, cost) VALUES ('torch', 2);

-- =========================================================================
-- AND THE ROAD GATES GET THEIR TORCH BACK.
--
-- Not all of them were dark. The three OLD gates — the Broken Gate, the
-- Weeper's Arch, the Collapsed Sally Port — have had a renewing torch on the
-- floor all along, and so have nine other rooms besides. The four gatehouses
-- the ROAD grew later were each given exactly one torch, once, as a one-shot
-- spawn: picked up on the first day anyone walked through, and bare ever since.
-- That is why the gates read as unlit — it depends entirely on which gate you
-- came in by, and rome has been on the road.
--
-- This is not a new hole in the economy, it is the newer gates catching up with
-- the older ones. A torch has no slot, so it renews on the clock rather than by
-- the gear dice (the floor-renewal law governs GEAR); the twelve that already
-- renew have always worked this way.
UPDATE ground_spawns SET regrows = 1
  WHERE item_id = 'torch'
    AND room_id IN ('the-first-milestone', 'the-timber-stack', 'the-withy-hut', 'the-gate-arch');
