-- 219 three bands get a top (rome, 2026-08-14: shouldn't we have a lot more
-- legendaries).
--
-- THE COUNT WAS DEFENSIBLE; THE DISTRIBUTION WAS NOT. Thirteen golds against
-- thirty purples is a sane apex, and nine per cent of all gear being legendary
-- is already generous. But after 218 sent the nine strays home, the map read:
--
--     deep + keep   7
--     wood          3   — all three out of ONE chest (box-bounds)
--     crossing      1
--     road          0   — 170 rooms
--     den           0   — 60 rooms
--     out           0   — 42 rooms
--
-- Two hundred and seventy-two rooms of surface with no top-tier prize standing
-- on them anywhere. And by slot it was just as lopsided — four ways to find a
-- legendary weapon, one way to find legendary boots or a legendary shield.
--
-- Two items, each closing a band hole and a slot hole with the same row:
--
--     the-carriers-mile   road   feet     balanced, tempered
--     the-tenor-bell      out    armor    padded, tempered
--
-- Gold goes 13 -> 15; the slots even out to weapon 4 / helm 3 / armor 3 /
-- cloak 2 / feet 2 / shield 1.
--
-- THE DENS GET NOTHING, AND THAT IS THE RULING (rome, 2026-08-14). A third
-- piece was written for them — a barred house door, hidden under the reeve's
-- floor — and it is cut, because the dens are not loot ground: they are where
-- the NOMADS LIVE. That band is player housing, and hanging the best thing in
-- the world inside somebody's home turns a place people keep into a place
-- people farm. The band map stays uneven there on purpose. The emptiness of
-- the dens is what the dens are FOR.
--
-- BOTH TRAIT PAIRS ARE NEW. That was the trap the Last Bear nearly fell into:
-- the obvious pick would have given the boots quiet+slick, which is the Pale
-- Tread exactly. A legendary that is another item with a different description
-- is not a legendary, so each takes a pairing nothing else in the game has.

INSERT OR IGNORE INTO item_templates
  (id, name, description, rarity, dmg, stun, bleed, weight, speed, sweep, armor, block, slot, barter, traits) VALUES

  -- THE ROAD. Its whole identity is being walked, and the man who walked it was
  -- the carrier: town to town with a pack, every week, for as long as there were
  -- towns. BALANCED is the point — it is the load-law trait, and boots that make
  -- the miles ride easier is the most literal thing it could ever be bolted to.
  -- TEMPERED because these have been resoled so many times there is nothing
  -- original left in them and they are still going.
  ('the-carriers-mile', 'the Carrier''s Mile',
   'Hobnailed, re-soled so many times that nothing of the original boot survives except the shape somebody''s feet wore into it. The nails are set in three different patterns by three different hands and none of them is recent. There is a way these sit under a load that you notice within about a hundred paces and cannot stop noticing after that — the weight comes down through the heel and goes into the road instead of into you. He walked between towns until there were no towns. The boots did not care either way.',
   'legendary', 0, 0, 0, 1, 1, 1, 2, 0, 'feet', 30, 'balanced,tempered'),

  -- THE RING, where the siege sat: the sapper, the bellfounder, the mass grave.
  -- A bellfounder casts bells, and when a war comes the bells are the largest
  -- bronze anybody has. He melted the tenor — the deepest bell in the ring, the
  -- one a village knows by ear — and cast this instead. PADDED and TEMPERED:
  -- bronze that thick soaks a ringing blow, and bell metal was mixed to survive
  -- being struck every day for four hundred years.
  ('the-tenor-bell', 'the Tenor Bell',
   'A breastplate cast rather than forged, and cast in bell bronze — the colour is wrong for armour, a dull gold going green in the seams, and the thickness is wrong too, far heavier through the chest than any smith would have left it. Around the lower edge, upside down and running backwards, is most of an inscription: a founder''s name, a year, and the first half of a line about calling the living. He would have known the tenor by ear from a mile off. He put it in the crucible anyway, which tells you exactly how the siege was going by then.',
   'legendary', 0, 0, 0, 3, 1, 1, 4, 0, 'armor', 30, 'padded,tempered');

-- ---- who has them ----------------------------------------------------------
-- The road and the ring hang theirs on the man they belong to. Both displace an
-- existing drop and both displaced pieces were checked first: the hobnailed
-- boots also come off the long warden, the tide warden, the toll chamber AND
-- the floor, and the burner's hatchet is in the charcoal hut and on the floor.
-- Rates sit under those mobs' old gear rates, the same law 218 used.
UPDATE mob_templates SET gear_item = 'the-carriers-mile', gear_drop = 0.06 WHERE id = 'road-carrier';
UPDATE mob_templates SET gear_item = 'the-tenor-bell',    gear_drop = 0.06 WHERE id = 'the-bellfounder';
