-- MORE LIES ABOUT (rome, 2026-10-28: nineteen rooms of the den's materials is
-- too few). A wider read of the world's rooms, each one's whole description,
-- for more of what 343 put down: wood split or staved and lying loose, and
-- bone, horn and shell in heaps where animals ate or the ground collects it.
-- Not the built bone (the ossuaries, the processional, the choir), not a single
-- skull on a slope, not bone gone to powder. And scrap iron where iron lies
-- loose, not where it is set in stone (gates, rings, the beam). Nothing new
-- for leather or linen: no other room has either lying about that is not
-- rotted, so leather stays mostly a thing cut off a kill and linen a thing
-- found in a box or cut from cloth.
-- Same dice regrow as 343, and scrap iron joins it (zone-data DICE_REGROW).
INSERT INTO ground_spawns (item_id, room_id, regrows) VALUES
  -- split wood
  ('split-wood', 'the-cooperage', 1),        -- staves stacked in racks
  ('split-wood', 'the-split-oak', 1),        -- split clean down its length, the halves sprung apart
  ('split-wood', 'the-sawyers-bench', 1),    -- a clearing of chips round a trestle of split oak
  ('split-wood', 'the-cart-shed', 1),        -- the wreck of one cart
  ('split-wood', 'the-storm-line', 1),       -- a ridge of weed and timber
  ('split-wood', 'the-wrack-line', 1),       -- weed, a shoe, bird bone, a stave
  -- bone and horn
  ('bone-offcuts', 'the-wrack-line', 1),
  ('bone-offcuts', 'the-shell-scar', 1),     -- shell, ash and burnt bone
  ('bone-offcuts', 'the-shell-eyot', 1),     -- an island made of shell
  ('bone-offcuts', 'the-heron-stand', 1),    -- the bones of everything they have eaten
  ('bone-offcuts', 'the-dry-moat', 1),       -- old bones poke from the silt
  ('bone-offcuts', 'the-hyena-den', 1),      -- meal-bones and hair
  ('bone-offcuts', 'the-rat-warren', 1),     -- the bones of small things, cracked for the marrow
  ('bone-offcuts', 'the-scavengers-shelf', 1),
  ('bone-offcuts', 'the-chute-foot', 1),     -- a slope of loose bone
  ('bone-offcuts', 'the-cold-pantry', 1),    -- bones sorted by size
  ('bone-offcuts', 'the-wolf-earth', 1),     -- bone, cracked lengthways for the marrow
  ('bone-offcuts', 'the-ridge-cave-pocket', 1), -- deer and boar, dragged in and gone over
  ('bone-offcuts', 'the-badger-banks', 1),   -- spoil heaps scattered with bones
  ('bone-offcuts', 'the-grey-lie', 1),       -- the bones there are fresh
  ('bone-offcuts', 'the-bone-ground', 1),    -- ribs, cannon bones, the long spiral of a horn
  ('bone-offcuts', 'the-third-terrace', 1),  -- bones by the hundred
  ('bone-offcuts', 'the-eyrie-foot', 1),     -- bones thick along the base
  ('bone-offcuts', 'the-shelf-walk', 1),     -- bones along the back wall
  ('bone-offcuts', 'the-terrace-foot', 1),   -- bones that came off the top
  ('bone-offcuts', 'the-under-shelf', 1),    -- a foot deep in bone chips
  ('bone-offcuts', 'the-till', 1),           -- bone sticking out of the face
  ('bone-offcuts', 'the-glacier-toe', 1),    -- a scatter of bone
  ('bone-offcuts', 'the-white-hollow', 1),   -- a drift of small bones and old feathers
  -- scrap iron
  ('scrap-iron', 'forge', 1),                -- the last thing hammered, never drawn from the fire
  ('scrap-iron', 'warden-post', 1),          -- a helmet gone to rust on the peg
  ('scrap-iron', 'the-smithy-yard', 1),      -- a century of hammer-scale, a heap of clinker
  ('scrap-iron', 'the-wedge-ground', 1),     -- iron wedges lie about in the grass, dozens
  ('scrap-iron', 'the-split-oak', 1),        -- the wedges still in it
  ('scrap-iron', 'the-deer-fence', 1),       -- wire gone to rust, lying in the leaves in loops
  ('scrap-iron', 'the-poachers-camp', 1),    -- a wire snare, rusted through
  ('scrap-iron', 'the-drowned-fence', 1),    -- wire still strung between the first four
  ('scrap-iron', 'the-drowned-kitchens', 1), -- a spit-rack rusted into one red lump
  ('scrap-iron', 'the-cooperage', 1);        -- hoops rusted into rings of red lace
