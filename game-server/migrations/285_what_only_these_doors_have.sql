-- WHAT ONLY THESE DOORS HAVE (2026-08-29). Mig 284 fixed the sea cave. The
-- other two were the same fault and it had simply not been counted yet.
--
--     box-kept   (riddle)   8 of  9 exclusive
--     box-cave   (tide)     4 of 11   <- fixed by 284
--     box-glade  (moon)     1 of  9
--     box-armory (bell)     1 of 15   <- the HARDEST door in the game
--
-- THE ISSUE ROOM WAS A SECOND COPY OF THE RELIQUARY. Twelve of its fifteen
-- lines were shared with the reliquary, box-abyss and box-relic — boxes you
-- reach by walking the deep, no bell required. A door open twenty-three minutes
-- a day was handing out the deep's own pool with extra steps.
--
-- THE SMITH'S SET FIXES IT AND COSTS NOTHING TO WRITE. Three pieces — a
-- greatplate, a greatblade and a tower shield — were sitting in the item table
-- with NO source anywhere in the world. Only the greatplate had been placed.
-- The other two go in beside it, and the set is airtight where it lands: the
-- forge is two floors under this room (armory > down > forge), the smith's ruin
-- says in its own text that no corpse in the deep was ever buried wearing its
-- like, it is only ever MADE, and the whole conceit of the Issue Room is arms
-- that were made and never issued. Three exclusives, one identity, no invention.
--
-- Out go two of the reliquary duplicates to make room: the deadplate harness
-- (the greatplate covers heavy armour, and better) and the crown-guard pavise
-- (the aegis covers the shield, and better). Both were in two other boxes each.

INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-armory', 'smiths-ruin', 0.15),
('box-armory', 'smiths-aegis', 0.09);
DELETE FROM cache_loot WHERE cache_id = 'box-armory' AND item_id IN ('deadplate-harness', 'crown-guard-pavise');

-- ---- THE MOON GLADE. One exclusive line in nine, and its crown — the Pale
-- Tread — is also in box-abyss, so the rarest thing behind a door that opens
-- two hours in twenty-four could be had from a chest in the deep instead.
--
-- THE GLADE'S OWN LAW WRITES ITS LOOT, and the room said it first: nothing here
-- has ever been eaten. So everything the glade gives is GIVEN, not taken. A roe
-- buck casts his antlers every year and walks away from them; a beast that dies
-- of age in a place nothing hunts leaves its whole hide behind. That is the one
-- thing this glade can offer that no hunting ground anywhere else can, and it is
-- why these three cannot exist in another box: every other white-hide item in
-- the game came off something somebody killed.
--
-- It also fills the two slots the pool had nothing in — it was four pairs of
-- boots, two cloaks, a coat, a cap and a feather, with no shield in it at all.
-- The antler-braced cap goes out for the cast-antler crown: one antler helm is
-- enough, and this one is the glade's rather than the icehouse's.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('cast-antler-crown', 'a cast-antler crown',
   'Roe antlers, small and hard and pearled at the base, bound in a ring onto a cap of white hide. A buck casts them every year and walks off without them, and these were picked up off silver grass rather than cut off a head — which you can tell, because the burrs are clean and there is no bone taken with them. Nothing died for this.',
   'epic', 0, 0, 0, 0, 'helm', 3, 1, 1, 2, 0.0, 0.0, 0, 19, 0, 'wardhide'),

  ('white-hide-targe', 'a white-hide targe',
   'A light round shield, withy-framed and faced with white roe-hide stretched wet and dried hard. It is quieter than board or iron — it takes a blow with a dull sound instead of a bright one, which matters more than anybody expects the first time it matters. The pale of it goes grey at the rim where hands have been.',
   'epic', 0, 0, 0, 0, 'shield', 0, 1, 1, 2, 0.0, 0.28, 0, 19, 0, 'wall'),

  -- THE GLADE'S CROWN, and it can only have come from here. A white roe is one
  -- deer in fifty and hunters left them alone on principle; this one was not
  -- left alone on principle, it was simply never found, because it lived and
  -- died inside the one acre in the wood where nothing hunts. Legendary is
  -- lateral in this world: armour two, same as every other good cloak. What it
  -- has instead is both of the glade's ideas at once, pale and silent.
  ('the-white-roe', 'the White Roe',
   'The entire hide of a white roe, taken off whole and never cut into anything — no seams, no panels, the shape of the animal still in it. It did not die of anybody. It got old in a place where nothing eats, and lay down, and this was left on the silver grass for whoever the door let in. It weighs almost nothing and it makes no sound at all when you move.',
   'legendary', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0.0, 0.0, 0, 30, 0, 'wardhide,quiet');

DELETE FROM cache_loot WHERE cache_id = 'box-glade';
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-glade', 'white-hide-mantle', 0.30),
('box-glade', 'owl-feather', 0.25),
('box-glade', 'cast-antler-crown', 0.22),
('box-glade', 'white-rat-mantle', 0.20),
('box-glade', 'white-hide-coat', 0.18),
('box-glade', 'white-hide-boots', 0.16),
('box-glade', 'shadow-treads', 0.14),
('box-glade', 'white-hide-targe', 0.12),
('box-glade', 'shadow-step-boots', 0.08),
('box-glade', 'pale-tread', 0.05),
('box-glade', 'the-white-roe', 0.04);
