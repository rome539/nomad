-- 209 the animals that never ate (rome, 2026-08-12, after a hungry wolf on the
-- road: check every mob, are they actually hunting anything).
--
-- They were not. Migration 208 fixed the drove dogs by measuring ONE food web;
-- this is the same measurement run over ALL of them, against the live graph
-- pulled out of prod — 744 rooms, 1,712 exits, 338 spawns — walked the way a
-- CREATURE walks it: hideaways, gates and the sentinel's post removed as rooms
-- (creatureMoves refuses to step into any of them), locked doors removed as
-- exits. Predation is a same-room event, so the only number that means anything
-- is how far a hunter stands from something it eats on THAT graph.
--
--     line          n   nearest prey          verdict
--     otter         3   NOTHING REACHABLE     never ate, could never eat
--     bittern       5   12-28 rooms           never ate
--     masterless-dog 7  no feeding route AT   not a grazer, not a scavenger,
--                       ALL                   no prey map: nothing, ever
--     great gull   11   median 6, four 7-9    thin
--     grey seal     6   one at 7              one outlier
--     conger        8   one at 7              one outlier
--     carrier,          no route              a permanent hunger tell on
--     sapper,                                 three men with no mouth
--     bellfounder   4
--     drove dog     5   median 2              208 holding
--     wolf/hyena/
--     crawler/hound 47  median 1-3            working
--
-- WHY IT HAPPENED, in three different ways:
--
--   1. THE BAND HAS THE PREY AND THE ROOM DOES NOT. The otter's list is the rat
--      and the rat lives under the keep; the bittern's list is the eel and the
--      eels are all out in the channels while the bitterns are in the reed. Both
--      edges are correct on paper. Neither has ever fired.
--   2. NOTHING ON THE LIST AT ALL. Seven stray dogs on the west road with no
--      diet written for them in any table. They banked to the cap of the hunger
--      clock and sat there advertising it — the same bug the wood had in August
--      and the crossing had before that, found this time by walking the whole
--      roster against its feeding routes instead of waiting to read it in a room.
--   3. THE GROUND ITSELF IS EMPTY. The heath and the gorse country name two
--      rabbit warrens (the Warren Bank, the Pillow Mounds) and hold no living
--      thing but the dogs and the footpads. A band with predators and no game.
--
-- The code half of this ships alongside: a hunter whose own range has nothing
-- left in it now walks to the nearest ground that does (ai.huntGround), and a
-- migrant settles near what it eats instead of anywhere in the band at random,
-- which is what put a hungry wolf in front of rome in the first place. This file
-- is the other half — the stock those rules need to find.
--
-- Placement fitted to the webs that already work, not picked by eye. The wood
-- is the reference (wolf to deer: median 2, worst 5, 1 hunter to 1.6 prey), and
-- every group below was measured against the live graph before and after:
--
--     line             before            after
--     otter            unreachable       median 1, worst 2
--     bittern          median 21, w 28   median 1, worst 3
--     great gull       median 6,  w 9    median 1, worst 2
--     grey seal        median 4,  w 7    median 3, worst 4
--     conger           median 3,  w 7    median 3, worst 3
--     masterless dog   NO FOOD EXISTS    median 2, worst 5
--
-- Deliberately not tighter. Food one room from every animal means nothing ever
-- reaches STARVING_AT, and starvingHunts — a hungry predator turning on a
-- wanderer — stops happening at all. The clock is supposed to bite sometimes.

-- THE BECK KEEPS RATS. The otter's own line says it: it eats fish, and a rat
-- that comes to water is a fish with legs. The mill is the obvious one (a mill
-- is grain, and grain is rats) and the cattle drink is trodden mud and spilled
-- feed. Four rows against three otters, split between the two holts — the gill
-- above, the mill water below.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-rat@the-scree-run',      'rat', 'the-scree-run'),      -- 1 room off the Otter Holt
  ('spawn-rat@the-dam-walk',       'rat', 'the-dam-walk'),       -- between the Tail-Race and the Osier Island
  ('spawn-rat@the-cattle-drink',   'rat', 'the-cattle-drink'),
  ('spawn-rat@the-drowned-mill',   'rat', 'the-drowned-mill');   -- and the miller has company

-- EELS IN THE REED. The eel cutter works his line out here and the hook hut is
-- named for the hooks — the fiction always had eels in the dykes; the spawn
-- table only ever had them in the open channels. One row for each bittern
-- cluster, plus the First Channel, which is the ford's own water and puts the
-- stranded seal on the Gravel Flats within reach of a meal.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-ford-eel@the-cut-reed',       'ford-eel', 'the-cut-reed'),
  ('spawn-ford-eel@the-hook-hut',       'ford-eel', 'the-hook-hut'),
  ('spawn-ford-eel@the-first-eyot',     'ford-eel', 'the-first-eyot'),     -- the Reed Gate's own
  ('spawn-ford-eel@the-creek-crossing', 'ford-eel', 'the-creek-crossing'), -- the Salt Marsh's
  ('spawn-ford-eel@the-first-channel',  'ford-eel', 'the-first-channel');

-- CRABS ON THE STONEWORK. Five gulls sat out along the piers over open water
-- with nothing alive under them. A starling is the timber apron built into the
-- water around a pier foot — weed, barnacle and crab, all of it — and an arch
-- foot is the same thing in stone. The Gap is open water in the middle of the
-- bridge and feeds the far conger too. The Shingle Rise is for the one gull on
-- the far strand, which is its own island out there with a single crab on it.
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-wrack-crab@the-starling',     'wrack-crab', 'the-starling'),
  ('spawn-wrack-crab@the-near-arch',    'wrack-crab', 'the-near-arch'),
  ('spawn-wrack-crab@the-gap',          'wrack-crab', 'the-gap'),
  ('spawn-wrack-crab@the-shingle-rise', 'wrack-crab', 'the-shingle-rise');

-- GAME ON THE HEATH. The strays' new prey map (roe deer solo, goat with the
-- pack) is worth nothing while the nearest deer is ten to twenty-three rooms
-- east in the wood. Deer lie up in gorse and browse a heath edge, and the two
-- warrens the road already names are exactly the ground for it. Five rows puts
-- the pack at median 2 and worst 5 — the wood's own numbers.
--
-- (The RIGHT animal for a pillow mound is a hare, and there is no hare in the
-- game. A rabbit line of its own — small, fast, the thing every road predator
-- can take alone — is the better fix for this country and is a build, not a
-- spawn row. Noted, not done.)
INSERT INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-roe-deer@the-warren-bank',     'roe-deer', 'the-warren-bank'),
  ('spawn-roe-deer@the-pillow-mounds',   'roe-deer', 'the-pillow-mounds'),
  ('spawn-roe-deer@the-thorn-lane',      'roe-deer', 'the-thorn-lane'),
  ('spawn-roe-deer@the-high-verge',      'roe-deer', 'the-high-verge'),
  ('spawn-roe-deer@the-burnt-farmstead', 'roe-deer', 'the-burnt-farmstead');

-- TWO DEAD ROWS. The Timber Stack is a GATE, and applyArrivals filters gates
-- out of a line's homes — so these two have never once received a respawn while
-- still counting against the wolf's and the roe's caps. A slot that can only be
-- filled at first light is not a den. One room south onto ordinary ground.
UPDATE mob_spawns SET room_id = 'the-thin-soil' WHERE id IN ('spawn-w50', 'spawn-w21');
