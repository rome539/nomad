-- THE BOULDER GATE IS NO HIDEAWAY (2026-11-08). It was marked a hideaway, where
-- nothing follows you in and nothing lives; the keeper ruled it ordinary mountain
-- ground. The room source (regions/mountain-2.rooms) drops its !safe flag to match,
-- so a rebuild of the rooms keeps it this way.
UPDATE rooms SET is_safe = 0 WHERE id = 'the-boulder-gate';
