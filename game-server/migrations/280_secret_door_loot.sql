-- SECRET DOOR LOOT (2026-08-25, restocked 2026-08-29). The three doors' prize
-- boxes (mig 279).
--
-- THE FIRST DRAFT STOCKED EACH POOL TO ITS DOOR'S THEME and never once checked
-- it against its door's PRICE. Measured against every other elite box in the
-- world, average barter per line:
--
--     box-abyss   13 lines  20.2   13/13 gear
--     reliquary   13 lines  19.2   12/13 gear
--     box-tide    15 lines  16.4   15/15 gear
--     box-deep    17 lines  14.2   15/17 gear
--     box-glade    9 lines  11.9    7/9  gear
--     box-cave     9 lines  11.3    3/9  gear
--     box-kept     6 lines   8.7    0/6  gear   <- the riddle door
--     box-bothy   11 lines   8.1         an unlocked hut on a hillside
--
-- The three hardest locks in the game paid worse than boxes you reach by
-- walking, and the riddle door — a talking iron door that asks you a question —
-- was the worst box in the world that is not an open bothy, with no gear in it
-- at all. Its floor line was a six-barter tally stick and half its pool was
-- bird feathers you can take off the mountain's own vultures. Answer the riddle,
-- receive a feather you could have picked up outside.
--
-- THE LAW THIS TIME, and it is one line: a prize box's floor is the thing you
-- would have been glad to walk out with. The floor is not a metaphor — the roll
-- grants the highest-chance line when nothing else hits, so whatever sits at
-- 0.30 is what these doors PAY, most of the time, forever.
--
-- Three rules under it:
--   1. Every line is gear or real barter goods. Nothing at 0 barter, nothing you
--      can farm loose off the ground the door is standing on.
--   2. Exactly ONE cheap line per box, and it buys flavour: it has to be the
--      room's own idea rather than clutter — the bounds tally, the owl's
--      feather, the tide tally. A pool of nothing but armour reads like a
--      vending machine. Valuables that are not gear (a seal pelt, a pearl) are
--      not what this rule is about; they carry their own worth.
--   3. Weight is a cost (the load law). A four-weight salt block for ten barter
--      is a losing trade and it is gone.
--
-- Most of what goes in was ALREADY IN THE WORLD AND UNREACHABLE: nineteen gear
-- items at ten barter or better had no source anywhere — not a box, not a mob,
-- not a ground spawn. The woodward's coat, the pedlar's coat, the glutton's
-- skull, the white-rat mantle, the lead wolf's ruff: written, costed, and
-- reachable by nobody. The doors are where they live now.

DELETE FROM cache_loot WHERE cache_id IN ('box-kept', 'box-glade', 'box-cave');

-- ---- THE RIDDLE DOOR: what you KNOW. The door's own line when you answer it is
-- that you have walked the world and the world has kept you, and the room behind
-- it is the Kept Room. So the pool is THE GEAR OF PEOPLE WHO WALKED AND COUNTED,
-- and the mountain's own animals on top of it. The pedlar's coat is the floor
-- and it is deliberate: it is a walking man's coat, it is `pocketed`, and a door
-- that rewards knowing the world should hand you more room to carry it in.
-- The woodward's coat is the top — oiled black leather he walked his bounds in
-- for however many years that was, which is the bounds tally's own story in
-- leather, and the only armour-4 in the three pools.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-kept', 'pedlars-coat', 0.30),
('box-kept', 'hill-wolf-jerkin', 0.25),
('box-kept', 'adder-skin-boots', 0.22),
('box-kept', 'lead-wolf-ruff', 0.20),
('box-kept', 'glutton-skull-helm', 0.18),
('box-kept', 'glutton-hide-coat', 0.15),
('box-kept', 'bounds-tally', 0.12),
('box-kept', 'lion-pelt-cloak', 0.10),
('box-kept', 'woodwards-coat', 0.06);

-- ---- THE MOON DOOR: when it IS. White hide and silence, which were already the
-- pool's two ideas and stay them. Out goes the moth-eaten mantle — a wool rag
-- worth two barter, one open in five, from a casket that only unlocks on a full
-- moon that is not a blood moon. Out goes the grave-pearl, which is a drowned
-- thing and has no business in a wood; it is in the cave pool where it belongs.
-- In comes the white-rat mantle, which is the glade's two ideas in one object —
-- pale fur that goes over your shoulders without a whisper and slides out of a
-- grip — and the antler-braced cap, because four of nine lines were boots.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-glade', 'white-hide-mantle', 0.30),
('box-glade', 'owl-feather', 0.25),
('box-glade', 'white-hide-boots', 0.22),
('box-glade', 'white-rat-mantle', 0.20),
('box-glade', 'white-hide-coat', 0.18),
('box-glade', 'shadow-treads', 0.14),
('box-glade', 'antler-braced-cap', 0.12),
('box-glade', 'shadow-step-boots', 0.08),
('box-glade', 'pale-tread', 0.05);

-- ---- THE TIDE DOOR: where the WATER is. This is the dearest of the three — a
-- tide lock, a dark walk, and an eighty-five-hp animal sitting on the lid — and
-- it was paying out a strip of salt-fish at zero barter, one open in five. That
-- is gone and so is the salt block. The floor is now the eel-skin cloak: same
-- barter as the tally it replaces, but you walk out wearing it.
-- The chitin harness is plated in the shed carapace of something vast and pale
-- from the deep, and it goes in a cave with a giant crab standing over the chest
-- because that is where it has been waiting to be. With the cutter's jerkin and
-- the abyssal coat it makes a ladder across all three load builds: light a2/w1,
-- medium a3/w2, heavy a4/w3. The cave gives you your pick.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-cave', 'eel-skin-cloak', 0.30),
('box-cave', 'tide-tally', 0.25),
('box-cave', 'seal-pelt', 0.22),
('box-cave', 'eel-hide-treads', 0.20),
('box-cave', 'cutters-jerkin', 0.16),
('box-cave', 'abyssal-scale-coat', 0.14),
('box-cave', 'grave-pearl', 0.12),
('box-cave', 'chitin-harness', 0.10),
('box-cave', 'drowned-pearl', 0.08);
