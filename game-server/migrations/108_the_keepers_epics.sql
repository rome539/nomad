-- 108 the keeper's epics (rome, 2026-07-23): the fence topped out at rare --
-- barter had nothing to build TOWARD, just parity with what already drops.
-- Three brand-new epic items (not reused from any mob/cache drop table) go
-- on the shelf, one for weapon/armor/shield -- the fence's own stock, never
-- found any other way. Priced steep (well above the post-107 rare ceiling
-- of 66-84) so it takes real selling to reach, matching the sink these
-- migrations are building toward. All fence stock stays barter=0 (one-way
-- buy, same as the rest of the shop).

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES
  ('hookbill-cleaver', 'a hookbill cleaver', 'A heavy cleaver with a hooked spur ground into its spine -- the edge opens the wound, the hook makes sure you feel it leave.', 'epic', 0, 0, 0, 6, 'weapon', 0, 1, 1, 2, 0, 0, 1, 0, 0, ''),
  ('lashed-warcoat', 'a lashed warcoat', 'A coat of overlapping plate cinched and double-lashed at every seam -- nothing short of the flesh beneath comes off with it.', 'epic', 0, 0, 0, 0, 'armor', 4, 1, 1, 3, 0, 0, 0, 0, 0, 'strapped'),
  ('barbed-round-shield', 'a barbed round shield', 'A round shield rimmed in iron spurs, angled to answer what it stops -- lean on it and something bites back, just not as hard as the Captain ever did.', 'epic', 0, 0, 0, 0, 'shield', 0, 1, 1, 2, 0, 0.28, 0, 0, 0, 'wall,riposte:1');

INSERT INTO fence_stock (item_id, cost) VALUES
  ('hookbill-cleaver', 150),
  ('lashed-warcoat', 140),
  ('barbed-round-shield', 160);
