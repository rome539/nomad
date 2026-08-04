-- WHAT THE DENS HOLD (the population half of mig 160's sixty rooms).
--
-- THE HARD NUMBER FIRST. The arc's table gives the den ground a density of
-- 0.05 — the lowest in the world by a factor of three, against the road's 0.23
-- and the wood's 0.70 — and that is the single most important thing about the
-- region. It is NOT an oversight to be corrected later. Sixty rooms with three
-- bodies in them is what makes the wood's hundred and ninety-five mean anything,
-- and it is what makes the dens read as somewhere you could stop walking.
--
-- Three bodies, then, and each one placed for a reason:
--
--   the-common-field   — ROE DEER. The field's own description already says it:
--                        "deer come out onto it in the evening because nothing
--                        here objects." Nothing here does object. That is the
--                        whole sentence about this place.
--   the-gorse-common   — MASTERLESS DOG. A warren with a few thousand rabbits
--                        in it and a dog gone wild on the common above it is
--                        not a monster placement, it is arithmetic. The road's
--                        own roster, one room off the road.
--   the-street-foot    — FOOTPAD. Somebody else had the same idea about this
--                        place and got here first, and the room already carries
--                        the evidence: "a fire was lit against the gable end
--                        and put out badly, and the scorch is still black."
--
-- No new templates. The dens are the road's and the wood's edge, not a new
-- roster, and the point of the region is what ISN'T in it. Both the dog and the
-- footpad are in ROAMING_DENS (2026-08-02), so neither of them keeps a fixed
-- address — you will not learn where the footpad is, you will learn that the
-- dens have one.
INSERT OR REPLACE INTO mob_spawns (id, template_id, room_id) VALUES
  ('spawn-den-1', 'roe-deer',       'the-common-field'),
  ('spawn-den-2', 'masterless-dog', 'the-gorse-common'),
  ('spawn-den-3', 'footpad',        'the-street-foot');

-- WHAT LIES ABOUT. The dens are the richest FORAGE ground on the surface and
-- almost the emptiest of things that eat — fields gone back to grass, an
-- orchard still dropping windfalls, a common that everybody grazed. That is the
-- shape of a place people left, and it is also the reason a person could live
-- here: the region's payoff is UPKEEP, not gear. Nothing rare, nothing forged,
-- nothing on the armour ladder. Food, water, fuel, rock and scrap.
--
-- Two exceptions to the regrow law, both deliberate: the smithy's scrap does
-- NOT regrow (a smithy that refills forever is a scrap faucet, and the road's
-- Smithy Ruin already holds the one renewing scrap pile in the world — mig
-- 159), and the reeve's loft holds one set of dead man's boots, once.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  -- the Field End
  ('sloes',      'the-thorn-hedge',     1),
  ('sloes',      'the-far-furlong',     1),
  ('beech-mast', 'the-dead-orchard',    1),
  ('watercress', 'the-mill-dam',        1),
  ('loose-rock', 'the-village-pound',   1),
  ('loose-rock', 'the-burnt-croft',     1),
  ('torch',      'the-bare-chapel',     1),
  ('scrap-iron', 'the-smithy',          0),
  ('worn-boots', 'the-reeves-loft',     0),
  -- the Waste
  ('sloes',      'the-thorn-corner',    1),
  ('sloes',      'the-broom-scrub',     1),
  ('watercress', 'the-shallow-well',    1),
  ('loose-rock', 'the-marl-pit',        1),
  ('loose-rock', 'the-kiln-track',      1),
  ('torch',      'the-black-hut',       1),
  ('linen-strips','the-drying-green',   0);

-- THE REEVE'S BOX. One cache in sixty rooms, and it is not treasure — it is a
-- household's savings, which in a hamlet this size means iron, cloth, food kept
-- dry, and the small hard currency (mig 129's law: a merchant's cart is exactly
-- where cigarettes would be; so is the one house on the street with a floor
-- worth lifting a board in).
--
-- It is LOCKED, and the notched iron key opens it, same as every other box in
-- the world: caches.key_item is NOT NULL and always has been, which is the
-- schema saying what a cache IS — a thing somebody shut on purpose. I wrote
-- this first as an unlocked floor cavity and the schema was right and I was
-- wrong. The fiction lands better anyway: a reeve was the man made answerable
-- for everyone else's work and everyone else's dues, so a box with a lock on it
-- under his own floor is exactly the object his job produces.
--
-- Refill is SIX HOURS, same as the cart's strongbox. The dens are the safest
-- ground in the far country and the one renewing thing in them should not be
-- fast.
INSERT OR REPLACE INTO caches (id, room_id, name, description, key_item, refill_secs)
VALUES (
  'reeves-floor',
  'the-reeves-house',
  'a box under the floor',
  'One board by the hearth sits a finger proud of the others and always has — you can see it from the doorway once you know. Under it the joist has been cut away to make a space the length of a forearm, lined with a flat stone against the damp, and in the space there is a small iron-bound box with a lock on it. Whoever left this house left in an order that did not include this.',
  'strongbox-key',
  21600
);

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('reeves-floor', 'hardtack',       0.45),
  ('reeves-floor', 'linen-strips',   0.4),
  ('reeves-floor', 'iron',           0.3),
  ('reeves-floor', 'scrap-iron',     0.3),
  ('reeves-floor', 'grave-moss',     0.15),
  ('reeves-floor', 'dry-cigarettes', 0.06);

-- NOT DONE, and on purpose:
--
--   NO GATE. The dens hold no bank and no extraction. A gatehouse here would
--   make this the best place in the world to stand rather than a place worth
--   walking to, and the arc's own ruling is that the den ground comes first and
--   the den SYSTEM comes after the space has been walked. What is here is
--   ground: hearths, roofs, bunk space, a barred shutter, a loft with a ladder
--   you can pull up after you. All of it obviously meant for something. None of
--   it claimable yet.
--
--   NO SPAWN REGION. SPAWN_REGIONS holds the road alone, and it should: a road
--   is where you meet things that were already going somewhere, so waking on
--   one reads as having walked there. Waking in an empty hamlet you have never
--   seen does not.
--
--   ONE SAFE ROOM, the Bare Chapel — the only stone roof for a very long way,
--   with a door thick enough to mean it. That is the wayside shelter's law
--   (a long walk becomes "push on hurt or hole up") applied to the far end of
--   the same walk. The Warrener's Lodge and the Black Hut are deliberately NOT
--   safe: they are shelter you can be found in, which is a different offer.
