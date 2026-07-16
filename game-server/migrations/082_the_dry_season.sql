-- THE DRY SEASON — the everyday cig trickle dries up (rome, 2026-07-15).
-- Cigs are the hard currency. The RARE jackpots — a deep boss dying with a
-- stash, the albino cig-rat, the reliquary — ARE the economy, and they stay
-- exactly as they were: you earn cigs by hitting something rare. What was "way
-- too much" is the COMMON FLOOD: cutpurses, wardens, rats and common boxes
-- dribbling cigs at 2-8% across the dozens of kills a session. That trickle
-- drops to 0.5% — a cig off a wandering mob becomes a genuine surprise, not a
-- wage. Jackpots UNTOUCHED (forgotten-king/drowned-god/marrow-king 60%,
-- albino-rat 50%, three-hound 25%, reliquary 50%, box-deep 15%).
-- Never documented in-game; players learn the tin is money by its scarcity.
--
-- Rates are cached in the world at init (world.ts) — stat migration:
-- apply + REDEPLOY (re-inits the DO, reads fresh rates). No reseed.

-- Common mobs — the everyday trickle → 0.5%. Boxes are LEFT ALONE: they're
-- rare enough to find that they were never part of the flood.
UPDATE mob_keys SET drop_chance = 0.005
  WHERE key_item = 'dry-cigarettes'
    AND template_id IN (
      'two-hound','cutthroat','last-watchman','cutpurse','warden-captain',
      'warden','dire-hyena','drowned-hulk','the-drowned','bone-knight',
      'pale-stalker','thrice-dead','brood-rat','fleet-rat'
    );
