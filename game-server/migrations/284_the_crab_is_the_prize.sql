-- THE CRAB IS THE PRIZE AFTER ALL (2026-08-29). Mig 281 said in its own header
-- that the crab is not the prize, the chest behind it is. Measured against the
-- rest of the world, that was wrong twice over.
--
-- EXCLUSIVITY RAN BACKWARDS. Counting every other source in the game — other
-- boxes, mob loot, mob carry, ground spawns — for all forty-two lines in the
-- four door pools:
--
--     box-kept   (riddle)   8 of  9 exclusive   <- the door you can open ANY TIME
--     box-glade  (moon)     1 of  9
--     box-armory (bell)     1 of 15
--     box-cave   (tide)     0 of  9 exclusive   <- door, dark, tide, and a boss
--
-- The dearest door in the game had nothing behind it you could not get
-- somewhere else, and five of its nine lines came off level 3-4 animals on the
-- same coast. A wanderer who beat the tide lock, walked eight black rooms and
-- killed an eighty-five-hp boss could come out holding a seal pelt they could
-- have taken off a grey seal on the beach.
--
-- AND THE BOSS HAD NOTHING OF ITS OWN. The great crab's drop was crab-claw, the
-- same trophy the little wrack crabs give. The one real boss in this feature had
-- no signature item and stood on the one box with no exclusive line, and those
-- are the same fact: nothing in that cave was MADE OF the thing in that cave.
--
-- So the fix is the animal. Four new pieces off a shell the size of a cart, and
-- they land exactly where the pool was empty — it had no helm, no shield and no
-- weapon in it at all, only cloak, feet, three coats and three trinkets.
--
-- THE STATS ARE THE EPIC LINE, not a new tier: helm a3/w2, shield block 0.30/w2,
-- weapon dmg 5/w2, all at 19 barter, which is where every other epic in this
-- world sits. The claw is a CRUSHER and not a cutter, because the animal's own
-- description is a claw worn smooth from a lifetime of doing the same thing to
-- the same kind of shell — so it carries stun like the mace line and no bleed.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits)
VALUES
  ('crab-shell-casque', 'a crab-shell casque',
   'The front plate of the great crab''s carapace, cut away whole and lined out with hide. It is thicker than it has any business being and it is crusted white with the same salt as the cave walls, barnacle-scarred, and it goes over your head like something that was already the right shape. It smells of the pool it came out of and it always will.',
   'epic', 0, 0, 0, 0, 'helm', 3, 1, 1, 2, 0.0, 0.0, 0, 19, 0, ''),

  ('shell-plate', 'a barnacled shell-plate',
   'A slab off the crab''s back, strapped to a forearm frame — a hand''s breadth of shell that spent a lifetime under the sea keeping the animal alive and is not much troubled by taking over the job. The barnacles are still on the face of it and were left there on purpose. Whatever comes off it comes off it torn.',
   'epic', 0, 0, 0, 0, 'shield', 0, 1, 1, 2, 0.0, 0.3, 0, 19, 0, 'wall,thorns:1'),

  ('shell-cracker', 'a shell-cracker',
   'The great crab''s heavy claw, the one that was twice the other, hafted through the joint and bound. The edge of it is worn perfectly smooth — this animal spent its whole life doing one thing to one kind of shell and got very good at it. It does not cut. It closes, and the thing inside stops working.',
   'epic', 0, 0, 0, 5, 'weapon', 0, 1, 1, 2, 0.18, 0.0, 0, 19, 0, ''),

  -- THE COUSIN'S OWN, and the only legendary in the cave. The great devil crab's
  -- description already carries this: both its claws are the big one, and a pale
  -- filed line runs the whole edge of them like a blade somebody kept. So the
  -- item was written before the item existed — it is that edge, taken off.
  -- Legendary is LATERAL in this world, not stronger: same damage as the epic
  -- claw, traded out of stun and into bleed and reach. A different fight, not a
  -- better one.
  ('the-filed-edge', 'the Filed Edge',
   'A claw off the great devil crab, and the pale line down the edge of it is not wear. Something filed this, over and over, for a very long time, and the animal wearing it let that happen or did it itself. It is the deep bruised red of the shell it came off, it is honed the whole length, and it opens what it touches without appearing to have moved.',
   'legendary', 0, 0, 0, 5, 'weapon', 0, 1, 1, 2, 0.0, 0.0, 3, 30, 0, 'reach,keen');

-- ---- THE BOSS BEARS ITS OWN. gear_item is CARRIED loot: the crab spawns
-- visibly holding it or not, by a roll, so the prize is readable before you
-- commit to the fight — which in a black room on a tide clock is the whole
-- decision. The claw is what you take off the animal; the shell pieces are what
-- the cave gives you out of the chest.
UPDATE mob_templates SET gear_item = 'shell-cracker',  gear_drop = 0.25 WHERE id = 'the-great-crab';
UPDATE mob_templates SET gear_item = 'the-filed-edge', gear_drop = 0.30 WHERE id = 'the-great-devil-crab';

-- ---- AND THE POOL. Out go the two lines a grey seal and a mire-walker could
-- have given you: the seal pelt (two easy mobs) and the grave-pearl (FIVE mobs
-- at level 3-4, plus a box — the most available thing in any of the four
-- pools). In go the three shell pieces and the filed edge. Eleven lines, four of
-- them exclusive to this cave, and for the first time the cave can put something
-- on your head, on your arm and in your hand.
DELETE FROM cache_loot WHERE cache_id = 'box-cave';
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
('box-cave', 'eel-skin-cloak', 0.30),
('box-cave', 'tide-tally', 0.25),
('box-cave', 'crab-shell-casque', 0.22),
('box-cave', 'eel-hide-treads', 0.20),
('box-cave', 'shell-plate', 0.18),
('box-cave', 'cutters-jerkin', 0.16),
('box-cave', 'shell-cracker', 0.14),
('box-cave', 'abyssal-scale-coat', 0.12),
('box-cave', 'chitin-harness', 0.10),
('box-cave', 'drowned-pearl', 0.08),
('box-cave', 'the-filed-edge', 0.05);
