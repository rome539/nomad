-- The armory grows (rome, 2026-07-12/13): the game was short on armor PIECES.
-- Weapons run 7-9 per rarity tier; every armor slot ran a third of that, and
-- the top collapsed to single forced picks -- one rare helm, one epic boot,
-- the anti-stun build topping out at a COMMON coif. Fourteen pieces bring
-- helm/feet/cloak/shield to ~10 each, and every warded build (padded, quiet,
-- slick, mail, hide) gets the ladder rungs it was missing. Each ward is
-- LEGIBLE: the fiction says what it turns.
--
-- Acquisition rides the standing laws: warded pieces come off the beast that
-- teaches the ward (mail off the bone-knight, silence off the stalker),
-- epics-off-elites ~a tenth, the deep's shroud lives in caches only. The
-- commons sit on the fence and lie about the grounds. The guardroom's kit --
-- the dead watch's helm and mantle on their pegs -- and every other floor
-- piece here rides the FLOOR-RENEWAL LAW: gear regrow is dice (a slow roll,
-- sometimes bare), never a faucet. No reseed needed: live worlds self-lay
-- new ground spawns on wake.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch)
VALUES
  -- helms: 6 -> 10
  ('riveted-coif', 'a riveted coif',
   'A hood of fine riveted rings that falls to the shoulders. An edge finds nothing here to part -- a cut skates off the mail and away.',
   'uncommon', 0, 0, 0, 0, 'helm', 1, 1, 1, 1, 0, 0, 0, 0, 0),
  ('padded-greathelm', 'a padded greathelm',
   'A warden greathelm lined thick with horsehair and rag. What would ring a bare skull like a bell arrives through the padding as a dull, survivable thud.',
   'rare', 0, 0, 0, 0, 'helm', 2, 1, 1, 1, 0, 0, 0, 0, 0),
  ('shroud-hood', 'a shroud-hood',
   'A deep hood of grave-cloth, soft as ash. It swallows the small sounds of your passing -- breath, footfall, the whisper of cloth on stone.',
   'rare', 0, 0, 0, 0, 'helm', 1, 1, 1, 0, 0, 0, 0, 0, 0),
  ('bone-barred-visor', 'a bone-barred visor',
   'A visor of yellowed bone bars over boiled hide, strapped tight. Claws that would open a face drag across the bars and find nothing soft to hold.',
   'epic', 0, 0, 0, 0, 'helm', 3, 1, 1, 1, 0, 0, 0, 0, 0),
  ('watchmans-kettle-helm', 'a watchman''s kettle-helm',
   'A broad-brimmed kettle-helm of honest iron, the kind that hung on the guardroom pegs when the watch went down and did not come back up.',
   'uncommon', 0, 0, 0, 0, 'helm', 2, 1, 1, 1, 0, 0, 0, 0, 0),
  -- feet: 6 -> 10
  ('cracked-leather-shoes', 'a pair of cracked-leather shoes',
   'Shoes of dry, cracked leather, walked half to death by whoever owned the feet before yours.',
   'common', 0, 0, 0, 0, 'feet', 1, 1, 1, 0, 0, 0, 0, 0, 0),
  ('hobnailed-boots', 'a pair of hobnailed boots',
   'Miners'' boots studded with iron nails, made for wet stone and long shifts in the dark. Heavy, and honest about it.',
   'uncommon', 0, 0, 0, 0, 'feet', 1, 1, 1, 1, 0, 0, 0, 0, 0),
  ('eel-hide-treads', 'eel-hide treads',
   'Boots skinned from the black eels of the deep waters, still faintly slick to the touch. What takes hold of you finds its grip sliding.',
   'rare', 0, 0, 0, 0, 'feet', 1, 1, 1, 0, 0, 0, 0, 0, 0),
  ('shadow-step-boots', 'shadow-step boots',
   'Boots of pale, supple hide that make no sound at all -- not on stone, not on bone, not in the shallow black water. The stalkers wore them first. Or grew them.',
   'epic', 0, 0, 0, 0, 'feet', 2, 1, 1, 0, 0, 0, 0, 0, 0),
  -- cloaks: 7 -> 10
  ('moth-eaten-mantle', 'a moth-eaten mantle',
   'A wool mantle gone to holes and hunger. It hangs on you like the previous century.',
   'common', 0, 0, 0, 0, 'cloak', 1, 1, 1, 0, 0, 0, 0, 0, 0),
  ('chain-lined-mantle', 'a chain-lined mantle',
   'A captain''s mantle of oiled wool lined with fine riveted rings. The blade that slips your guard meets the chain beneath and skates -- the cut that should have opened you, turned.',
   'epic', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0, 0, 0, 0, 0),
  ('drowned-divers-shroud', 'a drowned-diver''s shroud',
   'A diver''s shroud of waterlogged weave that never quite dries. It clings close and silent, and the water minds its own -- you move through the flood like something that belongs to it.',
   'epic', 0, 0, 0, 0, 'cloak', 1, 1, 1, 0, 0, 0, 0, 0, 0),
  ('wardens-watch-mantle', 'a warden''s watch-mantle',
   'A warden''s mantle of oiled wool and riveted leather, cut for long cold hours at a post. It still smells of brazier smoke and iron.',
   'uncommon', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0, 0, 0, 0, 0),
  -- shields: 9 -> 10
  ('lashed-plank-shield', 'a lashed-plank shield',
   'Door-planks lashed to a frame with rope and desperation. It will catch a blow or two. It will not catch many.',
   'common', 0, 0, 0, 0, 'shield', 0, 1, 1, 1, 0, 0.08, 0, 0, 0);

-- The beast teaches the ward it drops (the spawn is the gate; epics-off-elites
-- ~a tenth, the alt-boss ~a quarter like the other throne signatures).
INSERT OR REPLACE INTO mob_keys (template_id, key_item, drop_chance) VALUES
  ('bone-knight',    'riveted-coif',       0.15),
  ('warden-captain', 'padded-greathelm',   0.12),
  ('warden-captain', 'chain-lined-mantle', 0.08),
  ('cutpurse',       'shroud-hood',        0.05),
  ('marrow-king',    'bone-barred-visor',  0.25),
  ('pale-stalker',   'shadow-step-boots',  0.10),
  ('the-drowned',    'eel-hide-treads',    0.06),
  ('drowned-hulk',   'eel-hide-treads',    0.15);

-- The deep's shroud lives where the deep keeps its things: caches only.
INSERT OR REPLACE INTO cache_loot (cache_id, item_id, chance) VALUES
  ('box-deep',  'drowned-divers-shroud', 0.12),
  ('box-tide',  'drowned-divers-shroud', 0.12),
  ('reliquary', 'drowned-divers-shroud', 0.25);

-- The keeper stocks the junk tier (priced against worn-boots 3 / buckler 4).
INSERT OR REPLACE INTO fence_stock (item_id, cost) VALUES
  ('cracked-leather-shoes', 2),
  ('moth-eaten-mantle',     2),
  ('lashed-plank-shield',   3);

-- Floor finds -- all gear, so all DICE under the floor-renewal law: taken,
-- each spot re-checks itself on the slow roll and is often just bare.
INSERT OR REPLACE INTO ground_spawns (item_id, room_id, regrows) VALUES
  ('watchmans-kettle-helm', 'guardroom',          1),
  ('wardens-watch-mantle',  'guardroom',          1),
  ('hobnailed-boots',       'the-undermine',      1),
  ('cracked-leather-shoes', 'the-burned-village', 1),
  ('moth-eaten-mantle',     'the-hanging-hill',   1),
  ('lashed-plank-shield',   'the-gatefall',       1);
