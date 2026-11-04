-- THE RECORD KEEPS WHAT IT SHOWS (rome, 2026-11-03: trim it). Each region's
-- record reads only its newest five lines, so a row past those is kept only
-- while the keeper might still tell it (notable, under fourteen days old).
-- The game trims as it writes from now on (chronicle.trim); this clears what
-- piled up before.
DELETE FROM chronicle WHERE id IN (
  SELECT id FROM (
    SELECT id, notable, at, ROW_NUMBER() OVER (PARTITION BY region ORDER BY at DESC, id DESC) AS rn FROM chronicle
  ) WHERE rn > 5 AND (notable = 0 OR at < CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 14 * 86400000)
);
