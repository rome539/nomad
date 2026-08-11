-- 204 the crow keeps its own feather (rome, 2026-08-11: the feather should drop
-- from the crow, and from the bird mobs generally).
--
-- THE CAIRN HAS BEEN THE ONLY SOURCE. The Boundary Cairn regrows a raven's
-- flight-feather and a toll token, and a player who noticed them could farm
-- the pair on a deterministic clock. The feather's real home is the bird — a
-- corvid dropping a flight-feather — and the scarp-raven already carries it
-- (mig 188, 0.50). The one bird without one is the other corvid, the gibbet
-- crow, which has been dropping a length of hempen cord instead.
--
-- THE FLOOR SIDE IS DICE NOW (code, shipped alongside this): wolf-pelt, toll-token and
-- raven-feather joined DICE_REGROW, so the cairn and the wolf-earth are
-- "sometimes there" instead of take-wait-take faucets.
--
-- THIS migration makes the crow a source of the feather, so the feather lives
-- on the birds and the cairn is just a place one occasionally falls. The cord
-- is not lost — it stays as the once-only find at the gibbet-field, which is
-- where a length of hanging rope actually belongs.

UPDATE mob_templates SET loot_item = 'raven-feather', loot_chance = 0.35
WHERE id = 'gibbet-crow';
