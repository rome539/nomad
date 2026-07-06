-- Gear comes alive: a per-instance condition (0-100). Use grinds it down (a
-- blade dulls, mail thins as it eats blows) and the dungeon's wet stone rusts
-- it while you carry it. At 0 it's worn through and gone. The gate's seal holds
-- the damp and the grind off — a sealed thing is frozen whole, forever (rome's
-- rule: the dungeon's signature protects you from the dungeon). Provisional gear
-- is transient; carry it out and seal it, or watch it rust away.
ALTER TABLE player_items ADD COLUMN condition INTEGER NOT NULL DEFAULT 100;
