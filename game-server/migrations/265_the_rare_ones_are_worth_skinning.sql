-- THE RARE ONES ARE WORTH SKINNING (2026-08-21). A variant is the uncommon
-- animal of its kind, and most of them already drop a trophy of their own
-- rather than the base's. What several of them did NOT have is anywhere to take
-- it: the ordinary beast's hide made a piece at the bench, and the rare one's
-- made nothing at all, so finding the white one was worth barter and no more.
--
-- The rule, applied exactly: where a BASE creature's trophy already forges
-- something and its VARIANT's trophy forges nothing, the variant gets the
-- better version of the same piece. Three cases matched it, plus the rat —
-- which is a variant-to-variant case, because the mantle was never the plain
-- rat's to begin with.
--
--   albino-rat     3%  pale-pelt     rare   -> (the brood rat's sinew already
--                                              makes the plain rat mantle)
--   lead-wolf     10%  wolf-ruff     epic   -> hill-wolf-pelt makes the jerkin
--   the-old-glutton 5% glutton-skull rare   -> glutton-pelt makes the coat
--
-- DELIBERATELY LEFT: the bone knight's war-medal, which is the fourth match on
-- the rule and the one that should not follow it. A medal is a keepsake taken
-- off a dead man, not a material — the skeleton's finger-bones make six things
-- because bone is stock, and a decoration is not. It stays what it is.
--
-- These are FORGE-ONLY on purpose, as the mountain's line is. The channel is
-- the point: the rare animal is the lock, and the bench is where you take it.
-- No box hands you one, because then the animal would not matter.

INSERT OR REPLACE INTO item_templates
  (id, name, description, rarity, edible, heal, lure, dmg, slot, armor, speed, sweep, weight, stun, block, bleed, barter, staunch, traits) VALUES

-- THE ALBINO'S PELT. The plain mantle is sewn from brood-rat sinew and is a
-- quiet thing; this is the same garment made from the pale ones, which are
-- rarer, finer, and greasier than any rat has business being.
('white-rat-mantle', 'a white rat mantle',
 'A mantle sewn from the pelts of pale rats, a great many of them, matched for colour by somebody with more patience than sense. The fur is finer than it ought to be and it has never lost the grease it was born with — the whole thing goes over your shoulders without a whisper, and slides out of a grip like it was waiting to.', 'rare', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0.0, 0.0, 0, 14, 0, 'quiet,slick'),

-- THE LEAD WOLF'S RUFF. The thickest fur on the hill, off the one animal that
-- leads the others, and it goes up over your head.
('lead-wolf-ruff', 'a lead-wolf ruff',
 'The neck-ruff of a lead wolf, taken whole and set into a hood. It is the heaviest fur the hill grows and the animal wearing it was the one the others walked behind — up over your head it holds the cold off entirely, and it moves the way the wolf did, which is to say silently and without hurry.', 'rare', 0, 0, 0, 0, 'cloak', 2, 1, 1, 1, 0.0, 0.0, 0, 15, 0, 'fleeced,hooded'),

-- THE OLD GLUTTON'S SKULL. Its kin already gives the coat; the old one gives
-- the head, the way the dire wolf's skull gives a helm.
('glutton-skull-helm', 'a glutton-skull helm',
 'The skull of an old glutton, cleaned out, cut back and lined with the fur it came wrapped in. The bone is absurdly thick for the size of the animal — it spent its life dragging frozen meat out from under rock, and the head was the tool. Wearing it, you keep both the padding and the reputation.', 'rare', 0, 0, 0, 0, 'helm', 2, 1, 1, 1, 0.0, 0.0, 0, 16, 0, 'fleeced,padded');

-- The bench. Each takes fewer of the rare trophy than its plain sibling takes
-- of the common one — you will not be gathering these in numbers.
INSERT OR REPLACE INTO forge_recipes (item_id, scrap, material, material_qty) VALUES
  ('white-rat-mantle',   3, 'pale-pelt',     2),  -- the plain mantle: 3x rat-sinew + 2
  ('lead-wolf-ruff',     3, 'wolf-ruff',     1),  -- an epic trophy; one is enough
  ('glutton-skull-helm', 3, 'glutton-skull', 1);  -- one skull, one head
