-- THE WOOD HAS SOMETHING TO EAT (rome, 2026-08-02: "the mobs have nothing to
-- eat") — the surface gets a larder.
--
-- Every one of the game's 65 ground spawns is in the fortress. The two hundred
-- rooms shipped this morning have not one edible thing on the floor, which
-- breaks the food web at the bottom and leaves the player with nothing to
-- forage on a two-hundred-room walk either. The code half of the fix makes the
-- road and the wood FORAGE ground (FORAGE_REGIONS), so a grazer can eat the
-- room itself; this is the other half — things that are actually lying there.
--
-- WHAT GOES IN A WOOD, and nothing that does not: mast and windfall under the
-- trees, fungus on the dead timber, watercress at the wet edges, sloes in the
-- thorn. The road gets less and meaner, because a road is a place people have
-- already been over: hedge fruit, and whatever fell off a cart.
--
-- TWO OF THEM CARRY LURE, which is the bait mechanic — a creature crosses a
-- room with something fragrant on the floor and stops to eat it, and you can
-- throw one down to start a scrap and slip past. Windfall pears draw a boar the
-- way offal draws a hyena; that is what windfall is FOR.
--
-- Deliberately NOT in the lying cores. Dense dark timber grows nothing you can
-- eat, the animals have a reason to keep to the honest band, and the maze stays
-- a place you pass through rather than live in.

INSERT INTO item_templates (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  ('beech-mast', 'a fall of beech mast',
   'Small three-cornered nuts lying thick in the leaf litter, most of them empty husks and enough of them not. Pigs were driven miles for this once, and the right to do it was written down and argued over.',
   'common', 1, 3, 1, 0, '', 0, 0, 0, 0.2, 0, 0, 0, 0, 0),
  ('windfall-pears', 'windfall pears',
   'Small hard pears gone soft on one side, dropped from something planted deliberately a long time ago and never picked since. The smell of them carries further than you would think.',
   'common', 1, 5, 3, 0, '', 0, 0, 0, 0.3, 0, 0, 0, 0, 0),
  ('hoof-fungus', 'a hoof fungus',
   'A hard grey bracket the shape of a horse''s hoof, growing out of dead standing timber. Tough as leather and about as appetising, and it has kept people alive.',
   'common', 1, 4, 0, 0, '', 0, 0, 0, 0.3, 0, 0, 0, 2, 0),
  ('watercress', 'a handful of watercress',
   'Dark green and peppery, growing thick where the water runs clear and shallow. It is the one thing out here that tastes deliberate.',
   'common', 1, 4, 0, 0, '', 0, 0, 0, 0.1, 0, 0, 0, 0, 0),
  ('sloes', 'a handful of sloes',
   'Small blue-black fruit off the blackthorn, so sharp they dry your mouth out. Edible in the sense that they are not poison.',
   'common', 1, 2, 0, 0, '', 0, 0, 0, 0.1, 0, 0, 0, 0, 0);

-- THE WOOD'S HONEST BAND. Spread across the rows and rides, never in a core.
INSERT INTO ground_spawns (item_id, room_id) VALUES
  ('beech-mast', 'the-old-coppice'),
  ('beech-mast', 'the-last-oaks'),
  ('beech-mast', 'the-boundary-oak'),
  ('beech-mast', 'the-hornbeam-row'),
  ('beech-mast', 'the-far-birches'),
  ('hoof-fungus', 'the-burnt-stand'),
  ('hoof-fungus', 'the-fallen-wall'),
  ('hoof-fungus', 'the-timber-stack'),
  ('hoof-fungus', 'the-drowned-holly'),
  ('watercress', 'the-spring-head'),
  ('watercress', 'the-alder-carr'),
  ('watercress', 'the-flood-meadow'),
  ('watercress', 'the-old-pond'),
  ('sloes', 'the-bramble-margin'),
  ('sloes', 'the-holly-brake'),
  ('sloes', 'the-outer-scrub'),
  ('sloes', 'the-thin-soil'),
  ('windfall-pears', 'the-orchard-gone-wild'),
  ('windfall-pears', 'the-yew-walk'),
  ('windfall-pears', 'the-first-clearing');

-- THE ROAD: less, and meaner. What a hedge gives, and what fell off a cart.
INSERT INTO ground_spawns (item_id, room_id) VALUES
  ('sloes', 'the-elder-hedge'),
  ('sloes', 'the-old-boundary'),
  ('beech-mast', 'the-wayside-shelter'),
  ('watercress', 'the-dry-well');
