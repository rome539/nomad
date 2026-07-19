-- 096 THE WEIGHT LAW (rome, 2026-07-19): weight tracks PROTECTION and HEFT, so
-- power costs load and a fully-armored kit is never free (the old data let you
-- reach armor 8 + a dmg-6 blade at weight 0 — the whole light/heavy axis was
-- dead at the light end). Formula-based off armor/dmg/stun so it stays
-- self-consistent and re-running is a no-op (idempotent).

-- Body armor is the real weight sink: weight = armor - 1 (armor 1 -> 0, 2 -> 1,
-- 3 -> 2, 4 -> 3, 5 -> 4). armor-1 is the featherweight option, NOT dead weight
-- (it used to tie armor-2 at weight 1, so nobody wore it — rome, 2026-07-19).
UPDATE item_templates SET weight = CASE
  WHEN armor <= 1 THEN 0
  WHEN armor = 2 THEN 1
  WHEN armor = 3 THEN 2
  WHEN armor = 4 THEN 3
  ELSE 4 END
WHERE slot = 'armor';

-- Helm: lighter than body, same shape. armor 1 -> 0, 2 -> 1, 3 -> 2.
UPDATE item_templates SET weight = CASE WHEN armor <= 1 THEN 0 WHEN armor = 2 THEN 1 ELSE 2 END
WHERE slot = 'helm';

-- Feet & cloak: light by nature, same shape. armor 1 -> 0, 2 -> 1.
UPDATE item_templates SET weight = CASE WHEN armor <= 1 THEN 0 ELSE 1 END
WHERE slot IN ('feet', 'cloak');

-- Weapons: heft by dmg tier, PLUS a point of crushing weight if it stuns (blunt).
-- dmg 1-2 -> 0, 3-4 -> 1, 5-6 -> 2; blunt adds 1 (a maul is the heaviest thing you swing).
UPDATE item_templates SET weight =
  (CASE WHEN dmg <= 2 THEN 0 WHEN dmg <= 4 THEN 1 ELSE 2 END)
  + (CASE WHEN stun > 0 THEN 1 ELSE 0 END)
WHERE slot = 'weapon';

-- Shields keep their class weight (buckler 0 / medium 1 / wall 2), already set
-- by the shield-hand migration (093) — the light skirmisher's buckler stays free.
