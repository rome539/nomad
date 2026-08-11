-- 202 the crossing finds its fight (rome, 2026-08-11: three mobs on the
-- Crossing are tuned a tier above the world's own ladder, and the audit says
-- so with the same formulas the balance script uses).
--
-- THE LAW THIS OBEYS (ROADMAP, standing): data, not code, tunes — when a
-- number is too strong, drop it at its source, never invent a code
-- multiplier. And difficulty and reward climb TOGETHER. Each of these three
-- broke that second rule in its own direction.
--
--   THE QUICKSAND (armor 6). The highest armor in the whole game, above the
--   ferryman boss himself (4), on a level-4 mob. It is a patch of ground —
--   "there is nothing to hit" — but that is a description, not a license to
--   be the tankiest thing in the world. At 40hp it turned a mid player's
--   kill into a 28-round slog, nearly as long as the region's boss. L4 mobs
--   run armor 1-3 (the long-warden sits at 3); it joins the ceiling of its
--   own tier. The stun stays — dragging you down is what a quicksand is.
--
--   THE CONGER (dmg 6-11, bleed 4). The only L4 in the game a mid player
--   loses to outright, and the bleed is why: 4 a beat, armor-ignoring, over
--   the whole length of a 46hp fight. The right comparison is its OWN tier.
--   The long warden is the L4 line — 5-9, armor 3, stun 2 — and the conger
--   sits beside it at 6-10, armor 2, bleed 2: it bites harder than the
--   warden and wears less, which is what a fish in the water should be, and
--   it keeps a bleed the warden has not got. (The two-hound's 5-9/bleed-2 is
--   a LEVEL 3 profile and is not the mirror to copy; tuning a 46hp L4 down
--   onto it would have put the conger a whole tier under itself.)
--
--   THE REED-WALKER (bleed 3). An armor-ignoring bleed of 3 is what tips it
--   from "win, bloody" to "LOSES" for a mid player (10r kill, 9r die). A
--   hard maze predator that drops nothing but grave-moss should read as a
--   thing to outrun, not a wall. Bleed softens; the 0-barter creep-identity
--   stays untouched.
--
-- THE BOSS AND THE ELITES ARE LEFT ALONE. The drowned ferryman must beat
-- everyone below epic — that is what a ceiling is. The bridge-mason and the
-- refuge-man barely losing to mid is exactly where a named L5 elite belongs.

UPDATE mob_templates SET armor = 3 WHERE id = 'the-quicksand';     -- 6 -> 3  (its tier's ceiling; the world's highest armor stops being a L4 patch of ground)

UPDATE mob_templates SET dmg_min = 6, dmg_max = 10, bleed = 2 WHERE id = 'conger'; -- 6-11/b4 -> 6-10/b2 (its own tier's line: harder-biting and softer than the long warden, and it keeps a bleed)

UPDATE mob_templates SET bleed = 2 WHERE id = 'the-reed-walker';   -- 3 -> 2  (hard to outrun, not a wall; still drops nothing but grave-moss)
