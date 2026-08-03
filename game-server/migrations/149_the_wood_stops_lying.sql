-- THE WOOD STOPS LYING (rome, 2026-08-03: "i think we need to change the lying
-- woods into just a regular maze").
--
-- The wood shipped as a hybrid: an honest outer band around eight CORES where
-- every room had all four compass exits, every one of them was one-way, and no
-- exit paired with its opposite. Walk north and then south and you were not
-- back where you started. That was the whole mechanism of being lost in there.
--
-- It is gone. All 82 core rooms are re-cut as ORDINARY MAZES and every exit in
-- the wood now answers with its opposite.
--
-- =========================================================================
-- HOW THEY WERE CUT.
--
-- Each core's rooms are laid on a small grid (3x2 for the centre, 3x3 for the
-- ring-of-8 cores, 4x3 for the twelves) and a randomised depth-first spanning
-- tree is carved through it: every carved corridor is written twice, once each
-- way. A spanning tree is a PERFECT maze — exactly one true path between any
-- two rooms, and branches that end. Of a few thousand candidate carves the one
-- kept scored highest on dead ends plus distance between the doors.
--
-- What that does to the feel of the place, honestly stated:
--   * core rooms had 4 exits each and now average 2. A maze is mostly walls.
--   * the wood has 21 DEAD ENDS where it had none. Nothing in it ended before.
--   * the longest true path inside a core is 4 rooms (the centre) to 10 (the
--     sunken wood and the deep below it).
--   * you can always retrace. Turning round works. It works everywhere now.
--
-- =========================================================================
-- THE SPILLS ARE CUT, AND WHY.
--
-- Eleven exits used to throw you out of a core onto the honest band at a room
-- you had not gone in by (the Turned Ground east onto the Ash Stand, the Heart
-- of It south onto the Charcoal Flat, and nine more). Every one of them landed
-- on a band room whose facing side is ALREADY a door to somewhere else — the
-- band is a full lattice — so not one of them can be made two-way where it
-- stands. Re-hosting them on the nearest band room with a free face was tried
-- and thrown out: it put a core's south door four rooms away in the far north
-- of the wood, which is the old disorientation wearing a different hat.
--
-- So they are cut. Each maze is entered and left by its own doors: the
-- threshold it hangs behind, and the places where its floor gives way. Two
-- other exits went with them — a west door between cores D and E (the far
-- north and the far south pockets never touched on the ground) and a second,
-- redundant door between core H and the Boar Ground.
--
-- Verified before writing: every exit in all 171 wood rooms has its return, no
-- room holds two exits by the same compass point, and from all 171 you can
-- still walk out to the Gap in the Trees. Nothing is stranded, above or below.
--
-- WHAT IS UNTOUCHED: every room id, name and description; all 115 spawns and
-- their depth ladder; the woodward and the keeper; the thresholds; the four
-- falls into the sunken wood and the climbs out onto the far side (all of them
-- two-way now, so the deep can be climbed back the way you fell). The far side
-- keeps its shape: its only doors are still those climbs, so it is still a
-- place you arrive at from underneath rather than walk to.
--
-- The woodward's round is re-walked in zone-data.ts to follow the new ground.

-- Every exit in or out of the maze goes, then the whole thing is written back.
-- Idempotent: re-running this restores exactly this shape.
DELETE FROM exits WHERE room_id IN ('the-close-dark', 'the-turned-ground', 'the-same-tree', 'the-listening-stand', 'the-hollow-beeches', 'the-heart-of-it', 'the-crooked-stand', 'the-white-ground', 'the-leaning-wood', 'the-mast-fall', 'the-grey-thicket', 'the-birdless-acre', 'the-turning-leaves', 'the-far-hollow', 'the-black-alders', 'the-sodden-ground', 'the-reed-break', 'the-still-air', 'the-moss-floor', 'the-drowned-roots', 'the-low-mist', 'the-blind-corner', 'the-bracken-sea', 'the-pine-dark', 'the-windfall', 'the-empty-ride', 'the-lichen-wood', 'the-thin-birches', 'the-old-burn', 'the-ant-hills', 'the-holly-maze', 'the-dry-gully', 'the-open-canopy', 'the-deer-lawn', 'the-willow-break', 'the-flooded-ride', 'the-black-pool', 'the-sedge-flat', 'the-leaning-alders', 'the-quaking-ground', 'the-eel-ditch', 'the-silted-pond', 'the-rush-bed', 'the-frog-chorus', 'the-sunk-fence', 'the-brown-water', 'the-sunken-wood', 'the-under-eaves', 'the-fern-pit', 'the-cold-seep', 'the-buried-wall', 'the-earth-fall', 'the-white-roots', 'the-slip', 'the-lost-stand', 'the-green-dark', 'the-bottom-of-it', 'the-old-ditch', 'the-lower-ditch', 'the-flint-floor', 'the-black-loam', 'the-drip-line', 'the-old-course', 'the-low-sump', 'the-tree-fall', 'the-clay-shelf', 'the-still-pool', 'the-buried-lane', 'the-last-light', 'the-under-roots', 'the-thorn-waste', 'the-grey-scrub', 'the-broken-ground', 'the-gorse-brake', 'the-sand-cut', 'the-heath-edge', 'the-stunted-oaks', 'the-rabbit-warren', 'the-dry-heath', 'the-pale-grass', 'the-flint-scatter', 'the-wind-gap');
DELETE FROM exits WHERE to_room IN ('the-close-dark', 'the-turned-ground', 'the-same-tree', 'the-listening-stand', 'the-hollow-beeches', 'the-heart-of-it', 'the-crooked-stand', 'the-white-ground', 'the-leaning-wood', 'the-mast-fall', 'the-grey-thicket', 'the-birdless-acre', 'the-turning-leaves', 'the-far-hollow', 'the-black-alders', 'the-sodden-ground', 'the-reed-break', 'the-still-air', 'the-moss-floor', 'the-drowned-roots', 'the-low-mist', 'the-blind-corner', 'the-bracken-sea', 'the-pine-dark', 'the-windfall', 'the-empty-ride', 'the-lichen-wood', 'the-thin-birches', 'the-old-burn', 'the-ant-hills', 'the-holly-maze', 'the-dry-gully', 'the-open-canopy', 'the-deer-lawn', 'the-willow-break', 'the-flooded-ride', 'the-black-pool', 'the-sedge-flat', 'the-leaning-alders', 'the-quaking-ground', 'the-eel-ditch', 'the-silted-pond', 'the-rush-bed', 'the-frog-chorus', 'the-sunk-fence', 'the-brown-water', 'the-sunken-wood', 'the-under-eaves', 'the-fern-pit', 'the-cold-seep', 'the-buried-wall', 'the-earth-fall', 'the-white-roots', 'the-slip', 'the-lost-stand', 'the-green-dark', 'the-bottom-of-it', 'the-old-ditch', 'the-lower-ditch', 'the-flint-floor', 'the-black-loam', 'the-drip-line', 'the-old-course', 'the-low-sump', 'the-tree-fall', 'the-clay-shelf', 'the-still-pool', 'the-buried-lane', 'the-last-light', 'the-under-roots', 'the-thorn-waste', 'the-grey-scrub', 'the-broken-ground', 'the-gorse-brake', 'the-sand-cut', 'the-heath-edge', 'the-stunted-oaks', 'the-rabbit-warren', 'the-dry-heath', 'the-pale-grass', 'the-flint-scatter', 'the-wind-gap');

-- The mazes themselves.
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-close-dark', 'west', 'the-same-tree', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-close-dark', 'east', 'the-turning', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-close-dark', 'down', 'the-sunken-wood', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turned-ground', 'south', 'the-same-tree', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turned-ground', 'north', 'the-listening-stand', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turned-ground', 'east', 'the-close-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-same-tree', 'north', 'the-turned-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-same-tree', 'east', 'the-close-dark', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-listening-stand', 'south', 'the-turned-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-listening-stand', 'north', 'the-heart-of-it', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-listening-stand', 'east', 'the-hollow-beeches', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-hollow-beeches', 'west', 'the-listening-stand', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-hollow-beeches', 'east', 'the-swallowing', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-heart-of-it', 'south', 'the-listening-stand', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-crooked-stand', 'west', 'the-leaning-wood', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-crooked-stand', 'north', 'the-birdless-acre', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-crooked-stand', 'east', 'the-north-turning', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-white-ground', 'east', 'the-leaning-wood', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-leaning-wood', 'west', 'the-white-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-leaning-wood', 'east', 'the-crooked-stand', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-leaning-wood', 'down', 'the-earth-fall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-mast-fall', 'north', 'the-turning-leaves', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-grey-thicket', 'east', 'the-birdless-acre', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-grey-thicket', 'north', 'the-far-hollow', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-birdless-acre', 'south', 'the-crooked-stand', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-birdless-acre', 'west', 'the-grey-thicket', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turning-leaves', 'east', 'the-far-hollow', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turning-leaves', 'south', 'the-mast-fall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-far-hollow', 'south', 'the-grey-thicket', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-far-hollow', 'west', 'the-turning-leaves', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-far-hollow', 'down', 'the-old-ditch', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-black-alders', 'north', 'the-drowned-roots', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-black-alders', 'east', 'the-south-turning', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sodden-ground', 'east', 'the-reed-break', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-reed-break', 'west', 'the-sodden-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-reed-break', 'north', 'the-moss-floor', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-still-air', 'north', 'the-low-mist', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-still-air', 'down', 'the-slip', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-moss-floor', 'south', 'the-reed-break', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-moss-floor', 'north', 'the-blind-corner', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-moss-floor', 'east', 'the-drowned-roots', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-drowned-roots', 'west', 'the-moss-floor', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-drowned-roots', 'south', 'the-black-alders', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-low-mist', 'east', 'the-blind-corner', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-low-mist', 'south', 'the-still-air', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-blind-corner', 'south', 'the-moss-floor', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-blind-corner', 'west', 'the-low-mist', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bracken-sea', 'north', 'the-ant-hills', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bracken-sea', 'west', 'the-empty-ride', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bracken-sea', 'east', 'the-far-north-turning', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-pine-dark', 'north', 'the-lichen-wood', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-pine-dark', 'west', 'the-far-birches', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-windfall', 'east', 'the-empty-ride', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-empty-ride', 'east', 'the-bracken-sea', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-empty-ride', 'west', 'the-windfall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-lichen-wood', 'south', 'the-pine-dark', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-lichen-wood', 'east', 'the-thin-birches', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-thin-birches', 'west', 'the-lichen-wood', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-thin-birches', 'north', 'the-dry-gully', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-old-burn', 'north', 'the-open-canopy', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-old-burn', 'east', 'the-ant-hills', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-ant-hills', 'west', 'the-old-burn', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-ant-hills', 'north', 'the-deer-lawn', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-ant-hills', 'south', 'the-bracken-sea', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-holly-maze', 'east', 'the-dry-gully', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-dry-gully', 'south', 'the-thin-birches', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-dry-gully', 'east', 'the-open-canopy', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-dry-gully', 'west', 'the-holly-maze', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-open-canopy', 'west', 'the-dry-gully', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-open-canopy', 'south', 'the-old-burn', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-deer-lawn', 'south', 'the-ant-hills', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-willow-break', 'north', 'the-silted-pond', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-willow-break', 'west', 'the-sedge-flat', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-willow-break', 'east', 'the-far-south-turning', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-flooded-ride', 'north', 'the-leaning-alders', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-flooded-ride', 'west', 'the-far-mire', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-black-pool', 'east', 'the-sedge-flat', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sedge-flat', 'east', 'the-willow-break', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sedge-flat', 'west', 'the-black-pool', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sedge-flat', 'north', 'the-eel-ditch', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-leaning-alders', 'south', 'the-flooded-ride', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-leaning-alders', 'east', 'the-quaking-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-quaking-ground', 'west', 'the-leaning-alders', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-quaking-ground', 'north', 'the-frog-chorus', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-eel-ditch', 'south', 'the-sedge-flat', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-silted-pond', 'north', 'the-brown-water', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-silted-pond', 'south', 'the-willow-break', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-rush-bed', 'east', 'the-frog-chorus', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-frog-chorus', 'south', 'the-quaking-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-frog-chorus', 'east', 'the-sunk-fence', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-frog-chorus', 'west', 'the-rush-bed', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sunk-fence', 'west', 'the-frog-chorus', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sunk-fence', 'east', 'the-brown-water', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-brown-water', 'west', 'the-sunk-fence', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-brown-water', 'south', 'the-silted-pond', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sunken-wood', 'north', 'the-buried-wall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sunken-wood', 'up', 'the-close-dark', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sunken-wood', 'down', 'the-lower-ditch', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-under-eaves', 'east', 'the-fern-pit', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-fern-pit', 'north', 'the-white-roots', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-fern-pit', 'west', 'the-under-eaves', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-fern-pit', 'east', 'the-cold-seep', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-fern-pit', 'up', 'the-charcoal-flat', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-cold-seep', 'west', 'the-fern-pit', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-cold-seep', 'north', 'the-slip', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-cold-seep', 'up', 'the-long-glade', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-buried-wall', 'south', 'the-sunken-wood', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-buried-wall', 'east', 'the-earth-fall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-buried-wall', 'down', 'the-flint-floor', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-earth-fall', 'west', 'the-buried-wall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-earth-fall', 'east', 'the-white-roots', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-earth-fall', 'up', 'the-leaning-wood', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-white-roots', 'west', 'the-earth-fall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-white-roots', 'south', 'the-fern-pit', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-white-roots', 'up', 'the-standing-water', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-slip', 'south', 'the-cold-seep', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-slip', 'north', 'the-old-ditch', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-slip', 'up', 'the-still-air', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-lost-stand', 'east', 'the-green-dark', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-lost-stand', 'up', 'the-mire-edge', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-green-dark', 'east', 'the-bottom-of-it', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-green-dark', 'west', 'the-lost-stand', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-green-dark', 'down', 'the-still-pool', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bottom-of-it', 'east', 'the-old-ditch', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bottom-of-it', 'west', 'the-green-dark', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-bottom-of-it', 'up', 'the-far-mire', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-old-ditch', 'south', 'the-slip', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-old-ditch', 'west', 'the-bottom-of-it', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-old-ditch', 'up', 'the-far-hollow', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-lower-ditch', 'north', 'the-old-course', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-lower-ditch', 'up', 'the-sunken-wood', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-flint-floor', 'east', 'the-black-loam', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-flint-floor', 'north', 'the-low-sump', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-flint-floor', 'up', 'the-buried-wall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-black-loam', 'east', 'the-drip-line', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-black-loam', 'west', 'the-flint-floor', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-drip-line', 'north', 'the-clay-shelf', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-drip-line', 'west', 'the-black-loam', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-old-course', 'south', 'the-lower-ditch', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-old-course', 'north', 'the-still-pool', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-old-course', 'up', 'the-yew-walk', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-low-sump', 'south', 'the-flint-floor', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-tree-fall', 'north', 'the-last-light', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-tree-fall', 'east', 'the-clay-shelf', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-clay-shelf', 'west', 'the-tree-fall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-clay-shelf', 'south', 'the-drip-line', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-clay-shelf', 'north', 'the-under-roots', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-still-pool', 'south', 'the-old-course', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-still-pool', 'east', 'the-buried-lane', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-still-pool', 'up', 'the-green-dark', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-buried-lane', 'west', 'the-still-pool', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-buried-lane', 'east', 'the-last-light', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-last-light', 'west', 'the-buried-lane', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-last-light', 'south', 'the-tree-fall', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-last-light', 'up', 'the-broken-avenue', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-under-roots', 'south', 'the-clay-shelf', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-thorn-waste', 'west', 'the-gorse-brake', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-thorn-waste', 'north', 'the-rabbit-warren', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-thorn-waste', 'east', 'the-boar-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-grey-scrub', 'north', 'the-sand-cut', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-broken-ground', 'east', 'the-gorse-brake', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-gorse-brake', 'north', 'the-stunted-oaks', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-gorse-brake', 'east', 'the-thorn-waste', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-gorse-brake', 'west', 'the-broken-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sand-cut', 'south', 'the-grey-scrub', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-sand-cut', 'east', 'the-heath-edge', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-heath-edge', 'west', 'the-sand-cut', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-heath-edge', 'north', 'the-pale-grass', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-stunted-oaks', 'north', 'the-flint-scatter', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-stunted-oaks', 'south', 'the-gorse-brake', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-rabbit-warren', 'south', 'the-thorn-waste', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-rabbit-warren', 'north', 'the-wind-gap', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-dry-heath', 'east', 'the-pale-grass', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-pale-grass', 'south', 'the-heath-edge', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-pale-grass', 'west', 'the-dry-heath', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-pale-grass', 'east', 'the-flint-scatter', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-flint-scatter', 'west', 'the-pale-grass', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-flint-scatter', 'south', 'the-stunted-oaks', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-wind-gap', 'south', 'the-rabbit-warren', NULL);

-- The doors: the honest side of every way into the wood's cores.
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-charcoal-flat', 'down', 'the-fern-pit', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-turning', 'west', 'the-close-dark', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-close-ground', 'west', 'the-turned-ground', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-swallowing', 'west', 'the-hollow-beeches', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-mire-edge', 'down', 'the-lost-stand', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-north-turning', 'west', 'the-crooked-stand', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-south-turning', 'west', 'the-black-alders', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-far-north-turning', 'west', 'the-bracken-sea', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-far-south-turning', 'west', 'the-willow-break', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-far-birches', 'east', 'the-pine-dark', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-long-glade', 'down', 'the-cold-seep', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-standing-water', 'down', 'the-white-roots', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-yew-walk', 'down', 'the-old-course', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-boar-ground', 'west', 'the-thorn-waste', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-far-mire', 'down', 'the-bottom-of-it', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-far-mire', 'east', 'the-flooded-ride', NULL);
INSERT INTO exits (room_id, dir, to_room, key_item) VALUES ('the-broken-avenue', 'down', 'the-last-light', NULL);
