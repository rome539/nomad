-- 241 the ones who did not come down (rome, 2026-08-19).
--
-- THE PROBLEM. The mountain shipped with 22 creature lines and NOT ONE of them
-- carrying gear, and eleven things on its floor, none of which has a slot. That
-- was deliberate — the region's ruling is that the mountain is not for people,
-- so nothing up there has hands or pockets — and it was fine while the mountain
-- was a place you walked to already kitted. Then mig 240 made its foot a wake
-- point, and a fresh wanderer could open their eyes bare-handed on ground that
-- carries wildcats at 28hp/4-7 on its gentlest tier.
--
-- Measured against every other band, the gap was not subtle:
--
--     road 30 pieces on the floor · wood 13 · crossing 9 · den 7 · fortress 7
--     out 4 · MOUNTAIN 0
--
-- THE RULING HE GAVE: some gear, and the trophy run stays. So this does NOT put
-- people on the mountain and does not give one animal a pocket. What it puts up
-- there is what the mountain has taken off the people who tried it — kit lying
-- where its owner stopped, which is a thing the region has been describing since
-- tier one without ever once dropping.
--
-- TWO CURVES, and they are the whole design:
--
--   QUANTITY THINS WITH ALTITUDE — 13 at the foot, 10 in the middle, 9 at the
--   cloud line, 6 on the high ground, 4 on the territory, 0 at the summit.
--   Fewer people ever got that far, so there is less of them to find. And the
--   FOOT is deliberately at the road's own density (one piece per 5.6 rooms),
--   because mig 240 made it a place somebody opens their eyes with nothing.
--
--   QUALITY RISES AS IT THINS — a walked-up pair of boots and a leather cap at
--   the bottom; a white-hide mantle and white-hide boots at the snow line, where
--   the only people who got that high were the ones equipped to; and one epic
--   glaive on the ridge, on a man who very nearly made it and is still lying
--   where the wind put him.
--
-- FORTY-TWO PIECES over 398 rooms, one per 9.5. The first cut of this migration
-- was sixteen, and rome called it thin — correctly, and my defence of it was
-- built on a bad measurement: I had counted only weapons, armour and shields and
-- left out cloaks, boots and helms, which is most of what is actually on a
-- floor. Counted properly the world reads
--
--     den 1 per 5.5 · road 1 per 5.6 · out 1 per 7.0 · wood 1 per 8.6
--     fortress 1 per 9.7 · crossing 1 per 14.5
--
-- ...and sixteen would have made the biggest region in the game, and a wake
-- point, nearly twice as bare as the barest ground in it. At 9.5 it now sits
-- between the wood and the fortress overall, while the TIERS still run
-- 5.6 / 7.9 / 9.4 / 13.3 / 20.0 from the foot to the ridge — so the curve he
-- liked is intact and only the scale moved.
--
-- regrows = 1 on every row, which is NOT "it comes back" (mig 213): taking a
-- piece schedules a check on the slow gear cadence and the world ROLLS whether
-- another turns up. That law was shipped to stop a floor being an infinite
-- armoury and it governs all sixteen. Nothing is placed in a gate or a
-- sanctuary — checked against every id before writing.
--
-- WHAT IS DELIBERATELY NOT HERE: no cigarettes. The hard currency comes off two
-- human lines in the whole world and the mountain has neither, which keeps the
-- region's trade honest — you carry trophies down to sell, you do not find money
-- lying on a hillside.

INSERT OR IGNORE INTO ground_spawns (item_id, room_id, regrows) VALUES
  -- THE FOOT. What people wear to walk uphill, on the people who only walked
  -- uphill. Common and uncommon, and all of it the kind of thing you would set
  -- out in rather than the kind you would choose for this.
  ('worn-boots',            'the-boulder-choke', 1),
  ('tattered-cloak',        'the-scree-toe',     1),
  ('leather-cap',           'the-thorn-scrub',   1),
  ('padded-jerkin',         'the-peat-hags',     1),
  ('splintered-cudgel',     'the-shattered-rib', 1),
  ('lopped-stave',          'the-black-runnel',  1),

  -- ...and the rest of what the foot has taken. This tier is a WAKE POINT now,
  -- so it carries road-density gear: somebody opens their eyes here with nothing.
  ('rag-vest',                'the-milking-fold',    1),
  ('cracked-leather-shoes',   'the-plunge-pool',     1),
  ('quilted-coif',            'the-beck-fork',       1),
  ('battered-buckler',        'the-boulder-field',   1),
  ('rusty-billhook',          'the-lichen-boulders', 1),
  ('moth-eaten-mantle',       'the-high-fold',       1),
  ('rusted-sword',            'the-bealach',         1),

  -- THE MIDDLE. Better, because the ones who got here had already learned
  -- something at the foot.
  ('hide-cloak',            'the-black-scree',   1),
  ('hobnailed-boots',       'the-hanging-step',  1),
  ('thick-hide-jack',       'the-old-snow',      1),
  ('pitted-spear',          'the-sun-gully',     1),

  -- 
  ('lashed-plank-shield',     'the-bare-plateau',    1),
  ('moss-lined-boots',        'the-rake',            1),
  ('rusted-sallet',           'the-wedge',           1),
  ('chipped-falchion',        'the-pass-head',       1),
  ('drovers-frock',           'the-snow-edge',       1),
  ('ironshod-boots',          'the-hidden-burn',     1),

  -- THE CLOUD LINE. A wolfskin and a hard blade: the kit of somebody who
  -- expected the cold and did not expect the company.
  ('wolfskin-cloak',        'the-bad-step',      1),
  ('boiled-cuirass',         'the-fall-line',     1),
  ('headtaker-axe',          'the-scoop',         1),

  -- 
  ('iron-bound-shield',       'the-shelf-head',      1),
  ('riveted-coif',            'the-crown-step',      1),
  ('graveblade',              'the-last-shelf',      1),
  ('mail-hauberk',            'the-cold-crest',      1),
  ('hide-wound-boots',        'the-hot-ledge',       1),
  ('cork-lined-jack',         'the-till',            1),

  -- THE HIGH GROUND. White hide, at the snow line, on the two people who got
  -- this far — which is the tier telling you what it takes to be here.
  ('white-hide-mantle',     'the-splinter-field',1),
  ('white-hide-boots',      'the-crevasse-lip',  1),

  -- 
  ('riveted-cuirass',         'the-first-notch',     1),
  ('plated-greaves',          'the-gully-top',       1),
  ('warden-greathelm',        'the-upper-brim',      1),
  ('tusk-sewn-brigandine',    'the-lean',            1),

  -- THE TERRITORY. One man, on the ridge, between the towers, with the best
  -- weapon anybody has ever carried up this mountain still in his hands. He got
  -- further than all of them and it made no difference at all.
  ('reaver-glaive',          'the-tower-gap',     1),

  -- 
  ('riveted-warplate',        'the-red-tail',        1),
  ('padded-greathelm',        'the-white-heap',      1),
  ('bog-pearl-targe',         'the-under-step',      1);
