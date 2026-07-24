-- 118 one less cutpurse (rome, 2026-07-24): cut one of cutpurse's 4 spawn
-- points. Dropped purse-2 (ossuary) -- cells (purse-1) already covers the
-- same interior territory, leaving cells + the-burned-village +
-- the-broken-battlement, still spread across interior and grounds.

DELETE FROM mob_spawns WHERE id = 'purse-2';
