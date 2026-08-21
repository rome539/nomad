-- THE ROAD TAKES ITS SHARE (2026-08-20). The depth drop's epics and
-- legendaries landed in the wardens-key deep boxes by an over-strict rule
-- ("epics only in wardens-key boxes") — but wardens-key boxes only exist
-- in the fortress, so the top of the ladder got clamped there while the
-- open country kept only commons and rares. The world's own practice is
-- looser and better: keepers-wrap (epic) has always sat in the strongbox
-- box-solar at 0.08.
--
-- This spreads the top end out, addition-only — the deep boxes keep what
-- they had, and the road, the bounds, the cart, the coast, the ruin, the
-- toll and the mountain each take their share at the world's own low odds.

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('carts-strongbox', 'cargo-plate',     0.06), -- the broken axle: cargo with the cart
  ('box-bounds',      'barbed-warplate', 0.08), -- the bounds chest: the law's own barbs
  ('box-noust',       'tarred-cuirass',  0.10), -- the tar-black locker: the tarred thing
  ('cairn-cache',     'mirror-plate',    0.05), -- a mirror in the mountain cairn
  ('box-ruin',        'grave-glaive',    0.06), -- dug up where it had no business being dug
  ('box-toll',        'polehammer',      0.08), -- the tollkeepers stop charges
  ('reeves-floor',    'greatblade',      0.08); -- under the reeve's floor
