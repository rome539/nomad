-- 402 EVERY LEGENDARY ITS OWN (rome, 2026-11-17). See legendaries.md at the repo
-- root and src/legendary.ts.
--
-- A legendary was a good item with a gold name: not one trait on any of them was
-- theirs alone. Each now carries one SIGNATURE tag (sig-*) that no other row has,
-- and each signature pushes a mechanic the game already has past where anything
-- else takes it. The soft bonus traits come off (quiet, slick, padded, wardhide,
-- strapped, staunched, fleeced, hooded, keen, wicked, weighted, balanced,
-- tempered, greased), because every legendary copy now rolls the lottery at least
-- once (zone.rollTraits) and that is how one copy differs from the next. What
-- the item IS stays: reach, two-handed, pierce, a wall, riposte, thorns, spikes,
-- the flail's trip, the shell's seal, the mail's rings, the mirror's polish.
--
-- Copies already in the world change with their template (the trait ledger reads
-- the row); a copy's own past roll is untouched.

UPDATE item_templates SET traits = 'sig-upright'                         WHERE id = 'last-watch';
UPDATE item_templates SET traits = 'mailward,sig-clotting'               WHERE id = 'hulks-iron';
UPDATE item_templates SET traits = 'sig-unshaken'                        WHERE id = 'the-tenor-bell';
UPDATE item_templates SET traits = 'glinting,sig-glancing'               WHERE id = 'mirror-plate';
UPDATE item_templates SET traits = 'watertight,spiked:2,sig-unparted'    WHERE id = 'the-great-shell';
UPDATE item_templates SET traits = 'watertight,sig-dry-pack'             WHERE id = 'still-water-shroud';
UPDATE item_templates SET traits = 'sig-chill-proof'                     WHERE id = 'long-hunger-shroud';
UPDATE item_templates SET traits = 'sig-hearth'                          WHERE id = 'pale-scale-mantle';
UPDATE item_templates SET traits = 'sig-unstalked'                       WHERE id = 'the-white-roe';
UPDATE item_templates SET traits = 'sig-silent'                          WHERE id = 'pale-tread';
UPDATE item_templates SET traits = 'sig-untiring'                        WHERE id = 'the-carriers-mile';
UPDATE item_templates SET traits = 'sig-trackless'                       WHERE id = 'the-snow-road';
UPDATE item_templates SET traits = 'sig-steady-hands'                    WHERE id = 'marrow-crown';
UPDATE item_templates SET traits = 'sig-unburdened'                      WHERE id = 'bounds-hood';
UPDATE item_templates SET traits = 'sig-bear-guard'                      WHERE id = 'the-last-bear';
UPDATE item_templates SET traits = 'sig-muffled'                         WHERE id = 'the-bearded-cowl';
UPDATE item_templates SET traits = 'wall,riposte:2,sig-watch-room'       WHERE id = 'captains-wall';
UPDATE item_templates SET traits = 'wall,thorns:1,sig-set-wall'          WHERE id = 'drake-scale-shield';
UPDATE item_templates SET traits = 'riposte:2,thorns:2,sig-two-abreast'  WHERE id = 'the-turnpike';
UPDATE item_templates SET traits = 'pierce:3,piercing,sig-attaint'       WHERE id = 'the-attainder';
UPDATE item_templates SET traits = 'reach,two-handed,pierce:3,piercing,sig-killing-point' WHERE id = 'houndsbane';
UPDATE item_templates SET traits = 'two-handed,sig-all-tools'            WHERE id = 'the-hedge-bill';
UPDATE item_templates SET traits = 'reach,two-handed,sig-sure-swing'     WHERE id = 'the-long-crossing';
UPDATE item_templates SET traits = 'two-handed,tripping,sig-leg-taker'   WHERE id = 'lash-flail';
UPDATE item_templates SET traits = 'two-handed,reach,sig-long-bleed'     WHERE id = 'the-harvest';
UPDATE item_templates SET traits = 'reach,sig-unwearing'                 WHERE id = 'the-filed-edge';
UPDATE item_templates SET traits = 'sig-sure-grip'                       WHERE id = 'the-long-tooth';

-- ---- the words follow the traits ---------------------------------------------
-- Text and picture always match: a description that promised a trait the item
-- no longer has (silent, ungrippable, padded, cold-proof) now says what it does.
UPDATE item_templates SET description = 'The Marrow-King''s own crown, bone fused to boiled hide. Whatever is done to you under it, your hands stay your own. What the shards were broken from.' WHERE id = 'marrow-crown';
UPDATE item_templates SET description = 'The Drowned God''s burial wrap, still wet after everything, and nothing that has ever been carried under it has known the damp.' WHERE id = 'still-water-shroud';
UPDATE item_templates SET description = 'The last watchman''s harness, buckled to the body and never surrendered. It holds up a man who won''t lie down, whatever lands on him.' WHERE id = 'last-watch';
UPDATE item_templates SET description = 'Skin off the Gaunt, tanned by famine and drawn tight. Whatever starved in it never felt the cold or the wet, and under it you will not either.' WHERE id = 'long-hunger-shroud';
UPDATE item_templates SET description = 'A drowned-hulk''s riveted plate, sitting close as a second skin. The rings skate the edge, and a cut under them closes almost as it opens.' WHERE id = 'hulks-iron';
UPDATE item_templates SET description = 'The pale stalker left no mark in the silt. These are why: soft soles that make no sound at all.' WHERE id = 'pale-tread';
UPDATE item_templates SET description = 'Heavy leather gone the colour of oak bark and stiff as board, cut deep enough to throw the whole face into shadow. It smells of tannin and woodsmoke, and it sits so close and so light that you move in it as if you wore nothing at all.' WHERE id = 'bounds-hood';
UPDATE item_templates SET description = 'A mantle of pale drake-scale, sewn scale over scale onto backing hide until it hangs like a fall of water and weighs almost nothing. It is warm to the touch in any weather, and wherever you lie down in it you lie down as if by a fire. It came off a thing that sleeps in weather that kills men, and it keeps its own counsel about how.' WHERE id = 'pale-scale-mantle';
UPDATE item_templates SET description = 'The entire hide of a white roe, taken off whole and never cut into anything: no seams, no panels, the shape of the animal still in it. It did not die of anybody. It got old in a place where nothing eats, and lay down, and this was left on the silver grass for whoever the door let in. It weighs almost nothing, and nothing in the wild looks twice at it.' WHERE id = 'the-white-roe';
UPDATE item_templates SET description = 'A deep cowl sewn from the bone-dropper''s own neck and shoulder, the black bristle of the beard left on under the chin. The bird lived above the snow line and was never heard. Whatever you do under it, the next room never hears it either.' WHERE id = 'the-bearded-cowl';
UPDATE item_templates SET description = 'The four feet of the old glutton, taken whole and made into one pair of boots, pads down and claws left in. They are broader than any boot ought to be, and that is why the animal walked on top of snow that a wolf goes through, and left nothing on it behind.' WHERE id = 'the-snow-road';

-- ---- two new, found anywhere ---------------------------------------------------
INSERT INTO item_templates (id, name, description, rarity, slot, armor, weight, barter, traits) VALUES
  ('the-cold-lining', 'the Cold Lining',
   'A heavy mantle lined the way an icehouse is packed: straw pressed flat and stitched in rows under waxed linen. It is cold to put on and stays cold. Whatever rides in the pack under it keeps as though it had been put down in a cellar. Somebody who carried meat for a living wore this out, had it relined, and wore that out too.',
   'legendary', 'cloak', 2, 2, 30, 'sig-cold-keep'),
  ('the-head-start', 'the Head Start',
   'Light boots cut low at the ankle, soled with thin hide by someone who knew how a foot pushes off the ground. The toes are worn through to the second layer and the heels are hardly marked. Whoever had these spent a life leaving places, and leaving them first.',
   'legendary', 'feet', 2, 1, 30, 'sig-head-start');

-- ---- the worldwide chest pool -------------------------------------------------
-- Five legendaries belong to no place: the two new ones, and three whose ability
-- has nothing to do with where they lay. They leave their fixed boxes and go
-- into every chest at 0.15% a refill each (36 chests, about one box legendary's
-- 5% in all), so no single chest can be camped for them. Not the hamlets' two
-- chests: the hamlets are where people live and hold no legendary (219).
DELETE FROM cache_loot WHERE item_id IN ('still-water-shroud', 'mirror-plate', 'pale-tread');
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance)
  SELECT c.id, i.id, 0.0015 FROM caches c
  CROSS JOIN (SELECT 'the-cold-lining' AS id UNION ALL SELECT 'the-head-start' UNION ALL SELECT 'still-water-shroud'
              UNION ALL SELECT 'mirror-plate' UNION ALL SELECT 'pale-tread') i
  WHERE c.room_id NOT IN (SELECT id FROM rooms WHERE region = 'den');
