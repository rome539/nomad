-- 203 the crossing grows its load (rome, 2026-08-11: the region shipped at
-- 0.37 dens/room against a plan that called for ~0.59, and the audit found the
-- empty rooms are exactly the ones the player walks).
--
-- THE LAW THIS OBEYS IS MIG 191'S OWN. "A road you meet nothing on for six
-- rooms and then meet one thing on is a road" — that ruling is what keeps the
-- CAUSEWAY sparse, and it stands. But it never applied to the things that are
-- NOT the road:
--
--   THE BRIDGE IS GULLS. The piers already carry one gull each; the spans
--   between them carry none, and a gull colony does not respect a ruling about
--   roads. More gulls on the arch stubs and the planks is more of the same
--   bird, not a new threat. The congers live in the water under it — the gap
--   and the rope-bridge are pier-foots with nothing in them yet.
--
--   THE CAUSEWAY'S WEED IS CRABS. Mig 191 carved the exception itself: "the
--   crabs are the exception — they are weed, and weed is continuous." The
--   causeway's empty edge-rooms (the sunken stretch, the weed flat, the cross
--   on the verge) are exactly that weed. Placing crabs there fills the corridor
--   without putting a single new thing ON the road.
--
--   THE CHANNEL HAS SEALS. The deep channel's shoreward brink is empty water
--   where the ferry does not run; a seal hauled out there is the one animal
--   this whole region is about.
--
-- EVERYTHING BELOW IS AN EXISTING MOB IN AN EMPTY ROOM. No new templates, no
-- new items, no new mechanics — just dens the region's own roster was missing.
-- Named workers (the mason, the refuge-man, the scaffold-hand, the pilot) are
-- NOT duplicated: they are "the" man, not a colony.

-- ---- THE BRIDGE: the birds own it, and the spans were empty ----
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-great-gull@the-near-arch', 'great-gull', 'the-near-arch');       -- the arch stub over the first span
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-great-gull@the-plank-span', 'great-gull', 'the-plank-span');      -- the planks between piers
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-great-gull@the-far-arch', 'great-gull', 'the-far-arch');        -- the far arch stub
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-great-gull@the-bridge-landing', 'great-gull', 'the-bridge-landing');  -- where the bridge comes ashore
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-conger@the-gap', 'conger', 'the-gap');                 -- the missing span, water below
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-conger@the-beam-walk', 'conger', 'the-beam-walk');           -- the beam over the water
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-conger@the-rope-bridge', 'conger', 'the-rope-bridge');         -- the rope crossing
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-wrack-crab@the-bridge-strand', 'wrack-crab', 'the-bridge-strand');   -- the strand under the span

-- ---- THE CAUSEWAY: only the weed (the ruling's own exception) ----
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-wrack-crab@the-sunken-stretch', 'wrack-crab', 'the-sunken-stretch');  -- the flooded causeway edge
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-wrack-crab@the-weed-flat', 'wrack-crab', 'the-weed-flat');       -- the flat of weed off the rise
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-wrack-crab@the-causeway-cross', 'wrack-crab', 'the-causeway-cross');  -- the verge where the cross stands

-- ---- THE FERRY: the shoreward brink the boat does not serve ----
INSERT INTO mob_spawns (id, template_id, room_id) VALUES ('spawn-grey-seal@the-channel-brink', 'grey-seal', 'the-channel-brink');    -- the deep channel's edge
