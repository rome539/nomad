-- 078: the copyist's rate goes up.
-- A crude map was 3 — cheap enough to be a throwaway. At 8 it's a real
-- purchase you weigh against a hunter's journal, and the roll of the hand
-- that drew it (see lore.ts crudeHand) makes each copy a small gamble:
-- you paid for A map; which map you got is between you and the copyist.
UPDATE fence_stock SET cost = 8 WHERE item_id = 'crude-map';
