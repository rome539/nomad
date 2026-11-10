-- A WALKED MAP GOES ON THE BOARD (2026-11-09).
--
-- rome: a surveyor's map walked until its ink covers every room should score
-- on the legend board, as a full journal account does, and for more than an
-- account. Once per wanderer, however many maps they fill (LB_CHART_PTS), and
-- kept when the world grows past it. Only the step that inks the last room
-- earns it: a full map picked up off somebody else never counts for you.

ALTER TABLE players ADD COLUMN charted INTEGER NOT NULL DEFAULT 0;
