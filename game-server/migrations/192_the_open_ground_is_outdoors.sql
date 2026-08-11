-- 192 the open ground is outdoors (rome, 2026-08-10). A bug fix, and an old one.
--
-- The thirteen rooms of the ring under the fortress walls have carried NO region
-- since the world shipped. regionOf() falls back to "upper" for an unregioned
-- room that is not in DEEP_ROOMS, so the burned village, the hanging hill, the
-- drowned orchard and the rest have spent their entire existence classified as
-- THE HALLS -- the fortress interior.
--
-- What that actually did, standing outdoors under open sky:
--   * AMBIENCE.upper spoke for them. The open ground has been saying "Dust
--     sifts down out of the dark of the vaulting" and "The dungeon settles
--     around you" to every player who ever walked out of the gate. There is an
--     AMBIENCE.out entry in the map's label table and there has never been a
--     pool behind it, because nothing could ever reach one.
--   * "out" is in MIGRATE_BANDS and always has been, and it could never receive
--     anybody -- the destination pool filters on regionOf() === band, and no
--     room in the world has ever answered "out". The intent was written down at
--     the start and has never once run.
--   * Band feeds aimed at SURFACE_BANDS skipped the ground entirely, so the
--     ring outside the walls did not hear the surface's own weather and events.
--
-- The rooms were already in OUTDOOR_ROOMS by hand (GROUNDS_ROOMS seeds it), so
-- rain and night and cold have always reached them. This is the classification
-- catching up with the fiction, not a change to what the ground IS.
UPDATE rooms SET region = 'out' WHERE id IN (
  'the-causeway', 'the-old-road', 'the-burned-village', 'the-gatefall',
  'the-dry-moat', 'the-wall-breach', 'the-thorn-court', 'the-mass-grave',
  'the-briar-field', 'the-hanging-hill', 'the-black-fen', 'the-drowned-orchard',
  'the-sally-ditch'
);
