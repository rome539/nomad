-- 110 the floor under everything (rome, 2026-07-23): 109 set common gear_drop
-- to a flat 10% but never checked what sat below that line in the tiers
-- ABOVE common -- nine mobs across uncommon/rare/epic were still rarer than
-- a skeleton's rusted sword: warden-captain's own flanged mace (epic) at 6%,
-- three rares at 1.5-5% (twice-dead, pale-crawler, warden, bone-knight,
-- thrice-dead), three uncommons at 3-6% (drowned-hulk, cutthroat,
-- the-drowned). Every one of them floored to 10% -- matches common, still
-- below the higher-authored values in their own tier (dire-hyena 15%,
-- three-hound 22.5%, forgotten-king 15%, etc), just no longer beneath it.

UPDATE mob_templates SET gear_drop = 0.10
WHERE id IN ('warden-captain', 'twice-dead', 'pale-crawler', 'warden', 'bone-knight', 'thrice-dead', 'drowned-hulk', 'cutthroat', 'the-drowned')
  AND gear_item IS NOT NULL AND gear_item != ''
  AND gear_drop < 0.10;
