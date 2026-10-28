-- WHAT LIES ABOUT (rome, 2026-10-28). The audit of everything on the world's
-- floors found the den's three materials (split wood, leather offcuts, bone and
-- horn) only on the keeper's shelf, no loose rock anywhere on the Crossing's
-- 239 rooms of shingle, four on the whole mountain, and no torch above the
-- road. Each thing goes only where a room's own text says it is lying there.
--
-- The materials regrow on the dice clock (zone-data DICE_REGROW): sometimes
-- there, never a faucet, so the keeper's shelf is still where you go to be
-- sure. They also come off kills now (LEATHER_DROPS, BONE_DROPS). Rocks and
-- torches regrow like every other rock and torch.
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  -- split wood: where the text has it cut, stacked or smashed
  ('split-wood', 'the-faggot-stack', 1),
  ('split-wood', 'the-tar-shed', 1),
  ('split-wood', 'the-brash-heaps', 1),
  ('split-wood', 'the-oak-hollow', 1),
  ('split-wood', 'chapel', 1),
  -- leather offcuts: hide pegged, stretched, gnawed or thrown out
  ('leather-offcuts', 'the-gnaw-hollow', 1),
  ('leather-offcuts', 'the-bone-midden', 1),
  ('leather-offcuts', 'the-drying-green', 1),
  ('leather-offcuts', 'the-stell', 1),
  ('leather-offcuts', 'the-scatter', 1),
  -- bone and horn: the heaps, the middens, the cracked and the picked
  ('bone-offcuts', 'kennels', 1),
  ('bone-offcuts', 'bone-nook', 1),
  ('bone-offcuts', 'carrion-gallery', 1),
  ('bone-offcuts', 'the-bone-sift', 1),
  ('bone-offcuts', 'the-bone-midden', 1),
  ('bone-offcuts', 'the-picked-bones', 1),
  ('bone-offcuts', 'the-charnel', 1),
  ('bone-offcuts', 'the-midden', 1),
  ('bone-offcuts', 'the-crack-heap', 1),
  ('bone-offcuts', 'the-lower-fan', 1),
  -- loose rock: the Crossing's shingle and cobble
  ('loose-rock', 'the-strand-head', 1),
  ('loose-rock', 'the-ford-head', 1),
  ('loose-rock', 'the-shingle-rise', 1),
  ('loose-rock', 'the-storm-line', 1),
  ('loose-rock', 'the-shingle-spit', 1),
  ('loose-rock', 'the-far-strand', 1),
  ('loose-rock', 'the-shingle-bank', 1),
  ('loose-rock', 'the-storm-ridge', 1),
  ('loose-rock', 'the-cobble-bank', 1),
  ('loose-rock', 'the-burn-flats', 1),
  -- ...and the mountain's scree and rubble
  ('loose-rock', 'the-loose-slope', 1),
  ('loose-rock', 'the-black-scree', 1),
  ('loose-rock', 'the-hot-scree', 1),
  ('loose-rock', 'the-north-scree', 1),
  ('loose-rock', 'the-frost-shatter', 1),
  ('loose-rock', 'the-moraine-bank', 1),
  ('loose-rock', 'the-catch-slope', 1),
  ('loose-rock', 'the-rust-slope', 1),
  ('loose-rock', 'the-red-gully', 1),
  ('loose-rock', 'the-south-gully', 1),
  ('loose-rock', 'the-shelf-tail', 1),
  -- torches: the mountain's places where somebody stayed and kept a fire
  ('torch', 'the-shieling', 1),
  ('torch', 'the-stell', 1),
  ('torch', 'the-hollow-under', 1);
